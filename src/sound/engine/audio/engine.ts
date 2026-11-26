/**
 * Wellness Waves — Live audio engine
 *
 * One AudioContext, one master chain, and at most one active Composer (plus a
 * fading-out predecessor during crossfades). Scheduling runs on the audio
 * clock with a look-ahead loop; the UI only changes parameters.
 */

import type {
AudioBusType,
AudioDiagnostics,
AudioMode,
MixerBusState,
ShapeParams,
SoundDNA,
SoundscapeRecipe,
} from '../types/index';
import { Composer, PART_LABELS, type PartId } from './ambient/composer';
import { DEFAULT_BUS_GAINS, MUSIC_BUSES, type MasterChain, type MixBusId, createMasterChain } from './ambient/master';
import { type SoundWorld, worldForRecipe } from './ambient/worlds';
import { ARC_FOR_INTENT } from './ambient/arcs';
import { FrequencyLayer, type FrequencyLayerStatus, musicCompensation } from './frequency/layer';
import type { RenderPlan } from '../domain/programs/types';
import type { Technique } from '../domain/wellness/techniques';
import { type BreathState, WellnessLayer } from './wellness/layer';
import { Smoother } from './ambient/instruments';
import { MediaOutput, startClock } from './background';
import { Logger } from '../lib/logger';

const LOOKAHEAD_SECONDS = 4;
/** While the page is hidden, timers are throttled: schedule much further ahead. */
const HIDDEN_LOOKAHEAD_SECONDS = 30;
const TICK_MS = 200;

const BUS_LABELS: Record<MixBusId, string> = {
  harmony: 'Harmony (pad, bass, shimmer)',
  motif: 'Motif (keys, pulse, bells)',
  texture: 'Texture',
  environment: 'Environment (ocean, rain, wind)',
  modulation: 'Modulation (binaural)',
  reverb: 'Space (hall & echoes)',
  frequency: 'Frequency layer (opt-in)',
};

export type ProgramState = 'off' | 'active' | 'bypassed' | 'paused' | 'unavailable';

export interface ProgramStatus {
  state: ProgramState;
  plan: RenderPlan | null;
  enabled: boolean;
  intensity: number;
  step: FrequencyLayerStatus | null;
  /** Output channels the browser reports; binaural needs 2. */
  outputChannels: number;
  reason?: string;
}

export interface WellnessStatus {
  technique: Technique | null;
  /** True while audio is actually running with the technique. */
  active: boolean;
  breath: BreathState | null;
  /** Current pulse rate (Hz) for pulse techniques. */
  pulseHz: number;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private ctx: AudioContext | null = null;
  private chain: MasterChain | null = null;
  private volumeGain: GainNode | null = null;

  private composer: Composer | null = null;
  private stopClock: (() => void) | null = null;
  private output: MediaOutput | null = null;
  /** True while the listener (or the lock screen) paused; false while we should be sounding. */
  private userPaused = false;
  private stateListeners = new Set<(playing: boolean) => void>();
  private currentRecipe: SoundscapeRecipe | null = null;
  private currentMode: AudioMode = 'ambient';
  private currentDna: SoundDNA | null = null;
  private currentVolume = 0.7;
  private currentShape: ShapeParams = { energy: 0.5, texture: 0.2, space: 0.5 };
  /** Studio override of the authored world for the current recipe (null = authored). */
  private worldOverride: SoundWorld | null = null;
  private sessionCounter = 0;

  private busGains: Record<MixBusId, number> = { ...DEFAULT_BUS_GAINS };
  private busMutes: Partial<Record<MixBusId, boolean>> = {};
  private isTonalOnly = false;
  private isNoiseMuted = false;
  private partMutes: Partial<Record<PartId, boolean>> = {};
  private levelSmoothed = 0;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  /** Opt-in frequency program. Only ever created by an explicit listener action. */
  private program: { layer: FrequencyLayer; plan: RenderPlan; intensity: number; enabled: boolean } | null = null;
  private programReason: string | undefined;
  private wellness: WellnessLayer | null = null;
  private technique: Technique | null = null;
  private dry: Smoother | null = null;

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) AudioEngine.instance = new AudioEngine();
    return AudioEngine.instance;
  }

  /** Creates/resumes the AudioContext. Must be called from a user gesture the first time. */
  async init(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: 'playback' });
      this.chain = createMasterChain(this.ctx, true);
      this.volumeGain = this.ctx.createGain();
      this.volumeGain.gain.setValueAtTime(this.volumeCurve(this.currentVolume), this.ctx.currentTime);
      this.chain.output.connect(this.volumeGain);
      this.dry = new Smoother(this.chain.musicDry.gain, 1, this.ctx.currentTime);
      this.wellness = null;
      // Through a media element when possible, so playback survives the background.
      this.output = new MediaOutput(this.ctx, this.volumeGain);
      this.output.onExternalChange((playing) => this.handleExternal(playing));
      const ctxRef = this.ctx;
      ctxRef.onstatechange = () => {
        // iOS "interrupted" (a call, Siri) or an unexpected suspend: come back when allowed.
        if (ctxRef.state !== 'running' && !this.userPaused && this.composer) void ctxRef.resume().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => this.tick());
      this.applyBusGains(0.01);
      Logger.info('AudioEngine initialized', { sampleRate: this.ctx.sampleRate });
    }
    this.output?.play();
    this.userPaused = false;
    if (this.ctx.state !== 'running') await this.resume();
    return this.ctx;
  }

  private volumeCurve(v: number): number {
    return Math.pow(Math.max(0, Math.min(1, v)), 1.5);
  }

  // =========================================================================
  // Playback
  // =========================================================================

  /**
   * Starts (or crossfades to) a recipe. `opts.world` replaces the authored
   * SoundWorld for this play and any mode change after it (Studio editing);
   * `opts.crossfade` overrides the 4 s crossfade from a running piece.
   */
  async playRecipe(
    recipe: SoundscapeRecipe,
    dna: SoundDNA,
    mode: AudioMode = 'ambient',
    seed?: string,
    opts: { world?: SoundWorld; crossfade?: number } = {}
  ): Promise<void> {
    const ctx = await this.init();
    if (!this.chain) return;
    this.worldOverride = opts.world ? structuredClone(opts.world) : null;
    this.currentRecipe = recipe;
    this.currentDna = { ...dna };
    this.currentMode = mode;
    this.sessionCounter++;
    const resolvedSeed = seed ?? `${recipe.id}@${recipe.version}#${recipe.seed ?? 's'}-${Date.now().toString(36)}`;

    const crossfading = !!this.composer;
    const xfade = opts.crossfade ?? 4;
    this.retireComposer(crossfading ? xfade : 0.3);

    const composer = new Composer(ctx, this.worldOverride ?? worldForRecipe(recipe), this.chain.composerBuses, {
      seed: resolvedSeed,
      dna,
      shape: this.currentShape,
      mode,
      startAt: ctx.currentTime + 0.05,
      fadeIn: crossfading ? xfade : 2.5,
      arc: ARC_FOR_INTENT[recipe.intent],
    });
    (Object.keys(this.partMutes) as PartId[]).forEach((p) => composer.setPartMute(p, !!this.partMutes[p]));
    this.composer = composer;
    composer.scheduleUntil(ctx.currentTime + LOOKAHEAD_SECONDS);
    // A running program follows the music: same step, carrier re-tuned to the new tonic.
    if (this.program) {
      const { plan, intensity, enabled } = this.program;
      const step = this.program.layer.status().stepIndex;
      this.retireProgram(2);
      this.spawnProgram(plan, intensity, enabled, step);
    }
    this.startLoop();
    Logger.info('Playing', { recipe: recipe.id, mode, seed: resolvedSeed });
  }

  private lookahead(): number {
    return document.hidden ? HIDDEN_LOOKAHEAD_SECONDS : LOOKAHEAD_SECONDS;
  }

  private tick(): void {
    if (!this.ctx || !this.composer) return;
    if (this.ctx.state !== 'running') return;
    const until = this.ctx.currentTime + this.lookahead();
    this.composer.scheduleUntil(until);
    this.program?.layer.scheduleUntil(until);
    this.wellness?.scheduleUntil(until);
  }

  private startLoop(): void {
    if (this.stopClock) return;
    this.stopClock = startClock(TICK_MS, () => this.tick());
  }

  private stopLoop(): void {
    if (this.stopClock) {
      this.stopClock();
      this.stopClock = null;
    }
  }

  private retireComposer(fade: number): void {
    const old = this.composer;
    if (!old || !this.ctx) return;
    this.composer = null;
    const end = old.stop(fade);
    const ms = Math.max(0, (end - this.ctx.currentTime) * 1000) + 600;
    window.setTimeout(() => old.dispose(), ms);
  }

  /** Fades out and stops the current soundscape. */
  stopActiveLayers(fadeDuration = 1.0): void {
    this.retireComposer(fadeDuration);
    this.retireProgram(fadeDuration);
    this.program = null;
    this.retireWellness(fadeDuration);
    this.technique = null;
    this.applyBusGains(0.3);
    this.stopLoop();
    // Nothing is playing: release the lock-screen player once the fade is done.
    this.userPaused = true;
    if (this.sleepAt !== null) {
      // A timer ended (or playback stopped): restore the volume for the next play.
      this.sleepAt = null;
      window.setTimeout(() => this.setVolume(this.currentVolume, 0.05), fadeDuration * 1000 + 100);
    }
    window.setTimeout(() => {
      if (!this.composer) this.output?.pause();
    }, fadeDuration * 1000 + 300);
  }

  // =========================================================================
  // Wellness techniques (work on the music itself)
  // =========================================================================

  private retireWellness(fade: number): void {
    const old = this.wellness;
    this.wellness = null;
    if (!this.ctx) return;
    this.dry?.set(1, this.ctx.currentTime, fade);
    if (!old) return;
    const end = old.stop(fade);
    window.setTimeout(() => old.dispose(), Math.max(0, (end - this.ctx.currentTime) * 1000) + 600);
  }

  /**
   * Runs a technique alongside the playing music. A 'sequence' technique plays
   * the given catalog plan on the frequency bus instead.
   */
  startTechnique(technique: Technique, sequencePlan?: RenderPlan | null): boolean {
    if (!this.ctx || !this.chain || !this.composer) return false;
    const fade = 3;
    if (technique.kind === 'sequence') {
      this.retireWellness(fade);
      if (!sequencePlan || !this.startProgram(sequencePlan, 0.55)) return false;
    } else {
      if (this.program) this.stopProgram();
      this.retireWellness(fade);
      const at = this.ctx.currentTime + 0.05;
      this.wellness = new WellnessLayer(this.ctx, { send: this.chain.musicSum, dest: this.chain.post }, technique, at, fade);
      this.wellness.scheduleUntil(this.ctx.currentTime + LOOKAHEAD_SECONDS);
      this.dry?.set(0, at, fade);
    }
    this.technique = technique;
    Logger.info('Technique started', { technique: technique.id });
    return true;
  }

  stopTechnique(): void {
    this.retireWellness(2);
    if (this.program) this.stopProgram();
    this.technique = null;
  }

  getWellnessStatus(): WellnessStatus {
    const running = this.ctx?.state === 'running' && !!this.composer;
    return {
      technique: this.technique,
      active: running && !!this.technique,
      breath: running ? this.wellness?.breathAt() ?? null : null,
      pulseHz: this.wellness?.pulseHz() ?? 0,
    };
  }

  // =========================================================================
  // Frequency programs (opt-in frequency layer)
  // =========================================================================

  private spawnProgram(plan: RenderPlan, intensity: number, enabled: boolean, startStep = 0): void {
    if (!this.ctx || !this.chain) return;
    const world = this.getCurrentWorld();
    const layer = new FrequencyLayer(this.ctx, this.chain.buses.frequency, plan, {
      tonicPc: world?.key.tonicPc ?? 0,
      intensity,
      startAt: this.ctx.currentTime + 0.05,
      startStep,
      fadeIn: 3,
    });
    layer.scheduleUntil(this.ctx.currentTime + LOOKAHEAD_SECONDS);
    this.program = { layer, plan, intensity, enabled };
  }

  private retireProgram(fade: number): void {
    const old = this.program?.layer;
    if (!old || !this.ctx) return;
    const end = old.stop(fade);
    window.setTimeout(() => old.dispose(), Math.max(0, (end - this.ctx!.currentTime) * 1000) + 600);
  }

  /**
   * Starts a program on the frequency bus. Requires music to be playing; the
   * caller must have obtained the listener's explicit opt-in.
   */
  startProgram(plan: RenderPlan, intensity = 0.35): boolean {
    this.programReason = undefined;
    if (!plan.renderable) {
      this.programReason = 'None of this program’s values can be rendered with the chosen method.';
      return false;
    }
    if (!this.ctx || !this.composer) {
      this.programReason = 'Start a release first; the program plays alongside the music.';
      return false;
    }
    if (plan.options.strategy === 'binaural' && this.getOutputChannels() < 2) {
      this.programReason = 'This output is mono, so a binaural difference cannot be heard. Choose Pulse instead.';
      return false;
    }
    this.retireProgram(2);
    this.spawnProgram(plan, intensity, true);
    this.applyBusGains(1.5);
    Logger.info('Program started', { programId: plan.programId, arm: plan.arm, strategy: plan.options.strategy });
    return true;
  }

  /** A/B: hears the program or bypasses it without touching the music, seed or clock. */
  setProgramEnabled(enabled: boolean): void {
    if (!this.program) return;
    this.program.enabled = enabled;
    this.applyBusGains(0.8);
  }

  setProgramIntensity(intensity: number): void {
    if (!this.program) return;
    this.program.intensity = Math.max(0, Math.min(1, intensity));
    this.program.layer.setIntensity(this.program.intensity);
    this.applyBusGains(0.4);
  }

  stopProgram(): void {
    this.retireProgram(1.5);
    this.program = null;
    this.applyBusGains(1.5);
  }

  getOutputChannels(): number {
    return this.ctx?.destination.maxChannelCount ?? 2;
  }

  getProgramStatus(): ProgramStatus {
    const outputChannels = this.getOutputChannels();
    if (!this.program) {
      return { state: this.programReason ? 'unavailable' : 'off', plan: null, enabled: false, intensity: 0, step: null, outputChannels, reason: this.programReason };
    }
    const { plan, enabled, intensity, layer } = this.program;
    const running = this.ctx?.state === 'running' && !!this.composer;
    const routed = enabled && this.effectiveBusGain('frequency') > 0;
    const state: ProgramState = !running ? 'paused' : routed ? 'active' : 'bypassed';
    return { state, plan, enabled, intensity, step: layer.status(), outputChannels };
  }

  /** Lock screen, headphones unplugged, another app took the audio: follow it. */
  private handleExternal(playing: boolean): void {
    if (!this.composer) return;
    if (!playing && !this.userPaused) {
      this.userPaused = true;
      void this.ctx?.suspend();
      this.stateListeners.forEach((l) => l(false));
    } else if (playing && this.userPaused) {
      this.userPaused = false;
      void this.resume();
      this.stateListeners.forEach((l) => l(true));
    }
  }

  /** Notified when playback is paused or resumed from outside the app. */
  onExternalPlayState(listener: (playing: boolean) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** True when audio goes through the media element (keeps playing in the background). */
  get playsInBackground(): boolean {
    return !!this.output?.backgroundCapable;
  }

  async pause(): Promise<void> {
    this.userPaused = true;
    if (this.ctx && this.ctx.state === 'running') {
      // Short fade so pausing never clicks, then freeze the audio clock.
      const v = this.volumeGain!.gain;
      const now = this.ctx.currentTime;
      v.cancelScheduledValues(now);
      v.setValueAtTime(v.value, now);
      v.linearRampToValueAtTime(0, now + 0.25);
      await new Promise((r) => setTimeout(r, 280));
      await this.ctx.suspend();
    }
    this.output?.pause();
  }

  async resume(): Promise<void> {
    this.userPaused = false;
    // Synchronously, so it still counts as part of the tap that asked for it.
    this.output?.play();
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      await this.ctx.resume();
      const v = this.volumeGain!.gain;
      const now = this.ctx.currentTime;
      v.cancelScheduledValues(now);
      v.setValueAtTime(0, now);
      v.linearRampToValueAtTime(this.volumeCurve(this.currentVolume), now + 0.6);
      this.scheduleSleepFade(now + 0.6);
    }
  }

  emergencyStop(): void {
    if (this.ctx && this.volumeGain) {
      const now = this.ctx.currentTime;
      this.volumeGain.gain.cancelScheduledValues(now);
      this.volumeGain.gain.setValueAtTime(0, now);
      this.volumeGain.gain.linearRampToValueAtTime(this.volumeCurve(this.currentVolume), now + 2);
    }
    this.stopActiveLayers(0.05);
    Logger.warn('Emergency stop triggered');
  }

  setVolume(volume: number, fadeSeconds = 0.08): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.volumeGain && this.ctx.state === 'running') {
      const g = this.volumeGain.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(this.volumeCurve(this.currentVolume), now + Math.max(0.02, fadeSeconds));
      this.scheduleSleepFade(now + Math.max(0.02, fadeSeconds));
    }
  }

  // =========================================================================
  // Sleep timer — on the audio clock, so it fades even with the screen off
  // =========================================================================

  private sleepAt: number | null = null;
  private static readonly SLEEP_FADE = 300;

  /** Fades out over the last five minutes before `seconds` of listening from now; 0 cancels. */
  setSleepTimer(seconds: number): void {
    if (!this.ctx || !this.volumeGain) return;
    this.sleepAt = seconds > 0 ? this.ctx.currentTime + seconds : null;
    this.setVolume(this.currentVolume, 0.3);
  }

  /** Seconds of listening left on the sleep timer (pauses while paused), or null. */
  getSleepRemaining(): number | null {
    if (!this.ctx || this.sleepAt === null) return null;
    return Math.max(0, this.sleepAt - this.ctx.currentTime);
  }

  private scheduleSleepFade(from: number): void {
    if (!this.volumeGain || this.sleepAt === null) return;
    const g = this.volumeGain.gain;
    const full = this.volumeCurve(this.currentVolume);
    const fadeStart = this.sleepAt - AudioEngine.SLEEP_FADE;
    if (fadeStart > from) {
      g.setValueAtTime(full, fadeStart);
    } else {
      // Already inside the fade: start from where the fade would be now.
      const left = Math.max(0, this.sleepAt - from) / AudioEngine.SLEEP_FADE;
      g.linearRampToValueAtTime(full * left, from + 0.05);
    }
    g.linearRampToValueAtTime(0, Math.max(from + 0.1, this.sleepAt));
  }

  getVolume(): number {
    return this.currentVolume;
  }

  // =========================================================================
  // Shaping
  // =========================================================================

  /** Energy → intensity & brightness, Texture → environment level, Space → hall & echoes. */
  applyShapeParams(params: ShapeParams): void {
    this.currentShape = { ...params };
    this.composer?.setShape(this.currentShape);
  }

  getShapeParams(): ShapeParams {
    return { ...this.currentShape };
  }

  updateDna(dna: SoundDNA): void {
    this.currentDna = { ...dna };
    this.composer?.setDna(dna);
  }

  async setMode(mode: AudioMode): Promise<void> {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    if (this.currentRecipe && this.currentDna && this.composer) {
      await this.playRecipe(this.currentRecipe, this.currentDna, mode, undefined, {
        world: this.worldOverride ?? undefined,
      });
    }
  }

  /** The world the current piece is playing: the Studio override, else the authored one. */
  getCurrentWorld(): SoundWorld | null {
    if (!this.currentRecipe) return null;
    return this.worldOverride ?? worldForRecipe(this.currentRecipe);
  }

  // =========================================================================
  // Mixer
  // =========================================================================

  private effectiveBusGain(id: MixBusId): number {
    if (this.busMutes[id]) return 0;
    if (id === 'frequency') {
      // Off means off: no program, bypassed, or the tonal-only gate → no signal at all.
      if (!this.program || !this.program.enabled || this.isTonalOnly) return 0;
      return this.busGains.frequency;
    }
    const isNoise = id === 'texture' || id === 'environment';
    if (this.isTonalOnly && (isNoise || id === 'modulation')) return 0;
    if (this.isNoiseMuted && isNoise) return 0;
    // Equal-loudness A/B: trim the music by the energy the program adds, so
    // "on" is not preferred merely for being louder.
    const comp = this.program?.enabled && !this.isTonalOnly && MUSIC_BUSES.includes(id) ? musicCompensation(this.program.intensity) : 1;
    return this.busGains[id] * comp;
  }

  private applyBusGains(seconds = 0.15): void {
    if (!this.ctx || !this.chain) return;
    const now = this.ctx.currentTime;
    (Object.keys(this.chain.buses) as MixBusId[]).forEach((id) => {
      const g = this.chain!.buses[id].gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(this.effectiveBusGain(id), now + seconds);
    });
  }

  /** Tonal-only: silences every noise/texture/modulation bus so only pitched music remains. */
  setTonalOnly(enabled: boolean): void {
    this.isTonalOnly = enabled;
    this.applyBusGains();
  }

  getIsTonalOnly(): boolean {
    return this.isTonalOnly;
  }

  toggleNoiseMute(): boolean {
    this.isNoiseMuted = !this.isNoiseMuted;
    this.applyBusGains();
    return this.isNoiseMuted;
  }

  getIsNoiseMuted(): boolean {
    return this.isNoiseMuted;
  }

  private toMixBus(id: AudioBusType): MixBusId | 'master' | null {
    switch (id) {
      case 'tonal':
        return 'harmony';
      case 'noise':
        return 'environment';
      case 'master':
        return 'master';
      default:
        return id as MixBusId;
    }
  }

  private meterDb(id: MixBusId | 'master'): number {
    const a = this.chain?.meters[id];
    if (!a) return -100;
    if (!this.levelBuf || this.levelBuf.length !== a.fftSize) this.levelBuf = new Float32Array(a.fftSize);
    const buf = this.levelBuf;
    a.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    return peak > 0 ? Math.max(-100, Math.round(20 * Math.log10(peak) * 10) / 10) : -100;
  }

  getBusStates(): MixerBusState[] {
    const ids: MixBusId[] = ['harmony', 'motif', 'environment', 'modulation', 'reverb', 'frequency'];
    const states: MixerBusState[] = ids.map((id) => ({
      id,
      name: BUS_LABELS[id],
      gain: this.busGains[id],
      isMuted: this.effectiveBusGain(id) === 0,
      isSolo: false,
      peakDb: this.meterDb(id),
    }));
    states.push({
      id: 'master',
      name: 'Master output',
      gain: this.currentVolume,
      isMuted: false,
      isSolo: false,
      peakDb: this.meterDb('master'),
    });
    return states;
  }

  setBusMute(busId: AudioBusType, mute: boolean): void {
    const id = this.toMixBus(busId);
    if (!id || id === 'master') return;
    this.busMutes[id] = mute;
    this.applyBusGains();
  }

  setBusGain(busId: AudioBusType, gain: number): void {
    const id = this.toMixBus(busId);
    if (!id) return;
    if (id === 'master') {
      this.setVolume(gain);
      return;
    }
    this.busGains[id] = Math.max(0, Math.min(1.5, gain));
    this.applyBusGains(0.08);
  }

  // =========================================================================
  // Parts (Studio "layers")
  // =========================================================================

  getActiveLayersList(): Array<{
    id: string;
    name: string;
    sourceType: string;
    bus: string;
    isMuted: boolean;
    isSolo: boolean;
    baseGain: number;
  }> {
    if (!this.composer) return [];
    return (Object.keys(PART_LABELS) as PartId[])
      .filter((p) => p !== 'binaural' || this.currentMode === 'binaural')
      .map((p) => ({
        id: p,
        name: PART_LABELS[p].name,
        sourceType: p,
        bus: PART_LABELS[p].bus,
        isMuted: !!this.partMutes[p],
        isSolo: false,
        baseGain: 1,
      }));
  }

  setLayerMute(layerId: string, mute: boolean): void {
    this.partMutes[layerId as PartId] = mute;
    this.composer?.setPartMute(layerId as PartId, mute);
  }

  /** Parts are balanced by the composer; per-part gain is expressed as mute only. */
  setLayerGain(layerId: string, gain: number): void {
    this.setLayerMute(layerId, gain <= 0.001);
  }

  // =========================================================================
  // Diagnostics & visuals
  // =========================================================================

  getDiagnostics(): AudioDiagnostics {
    if (!this.ctx || !this.chain) {
      return {
        contextState: 'uninitialized',
        sampleRate: 0,
        activeVoices: 0,
        peakDb: -Infinity,
        hasClipping: false,
        dcOffset: 0,
        isStereo: true,
        cpuLoadEstimate: 0,
        tonalOnlyMode: this.isTonalOnly,
      };
    }
    const info = this.composer?.info();
    const a = this.chain.meters.master!;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      peak = Math.max(peak, Math.abs(buf[i]));
      sum += buf[i];
    }
    const busLevels: AudioDiagnostics['busLevels'] = {};
    (['harmony', 'motif', 'environment', 'modulation', 'reverb', 'frequency'] as MixBusId[]).forEach((id) => {
      busLevels![id] = { peakDb: this.meterDb(id), isMuted: this.effectiveBusGain(id) === 0, isSolo: false };
    });
    const voices = info?.activeVoices ?? 0;
    return {
      contextState: this.ctx.state,
      sampleRate: this.ctx.sampleRate,
      activeVoices: voices,
      peakDb: peak > 0 ? Math.round(20 * Math.log10(peak) * 10) / 10 : -100,
      hasClipping: peak >= 0.999,
      dcOffset: Math.round((sum / buf.length) * 1000) / 1000,
      isStereo: true,
      cpuLoadEstimate: Math.min(100, Math.round(4 + voices * 0.9)),
      busLevels,
      currentChord: info?.chord,
      currentScale: info?.key,
      tonalOnlyMode: this.isTonalOnly,
      intensity: info?.intensity,
      nextEvent: info?.nextEvent,
      seed: info?.seed,
    };
  }

  /** Smoothed 0..1 loudness of the master output — for slow, breath-like visuals. */
  getLevel(): number {
    const a = this.chain?.meters.master;
    if (!a || !this.ctx || this.ctx.state !== 'running') {
      this.levelSmoothed *= 0.95;
      return this.levelSmoothed;
    }
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length);
    const norm = Math.max(0, Math.min(1, (20 * Math.log10(rms + 1e-9) + 40) / 30));
    // ~1 s smoothing at the stage's frame rate: the ring breathes, it never flickers.
    this.levelSmoothed += (norm - this.levelSmoothed) * 0.035;
    return this.levelSmoothed;
  }

  getSpectrumData(): Uint8Array {
    const a = this.chain?.meters.master;
    if (!a) return new Uint8Array(128);
    const data = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(data);
    return data;
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  getCurrentRecipe(): SoundscapeRecipe | null {
    return this.currentRecipe;
  }

  isPlaying(): boolean {
    return !!this.composer && this.ctx?.state === 'running';
  }
}
