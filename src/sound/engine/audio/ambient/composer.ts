/**
 * Wellness Waves — Generative ambient composer
 *
 * Turns a SoundWorld + seed into an endless piece on the audio clock:
 *  - harmony: voice-led chord pads through one shared, slowly breathing filter
 *  - bass: a round root (or pedal) under the pad
 *  - keys: sparse melodic phrases that remember and vary their motifs
 *  - pulse: optional soft arpeggio with gentle pad "breathing" on the beat
 *  - bells / shimmer: rare resonant accents, always in key
 *  - texture: optional environmental bed on its own bus
 *  - sections: an intensity curve that opens/closes filters and density,
 *    occasional key changes, and slow darkening for sleep worlds
 *
 * The composer never owns a timer: the host calls `scheduleUntil(t)` (live,
 * from a look-ahead loop) or once for the full length (OfflineAudioContext).
 */

import { SeededRNG } from '../../lib/rng';
import type { AudioMode, ShapeParams, SoundDNA } from '../../types/index';
import { Smoother, type VoiceHandle, bassNote, bell, padNote, shimmerTone, strike } from './instruments';
import { type SpaceUnit, type TextureUnit, createSpace, createTexture } from './space';
import {
  type Chord,
  type ChordChoice,
  buildChord,
  midiName,
  nearestInSet,
  scalePitches,
  voiceChord,
  weightedChoice,
} from './theory';
import type { SoundWorld } from './worlds';
import { type ArcKind, type ArcPoint, arcAt } from './arcs';

export type PartId = 'pad' | 'bass' | 'keys' | 'pulse' | 'bells' | 'shimmer' | 'texture' | 'mask' | 'binaural';

export const PART_LABELS: Record<PartId, { name: string; bus: string }> = {
  pad: { name: 'Chord pad', bus: 'harmony' },
  bass: { name: 'Bass', bus: 'harmony' },
  keys: { name: 'Keys melody', bus: 'motif' },
  pulse: { name: 'Pulse arpeggio', bus: 'motif' },
  bells: { name: 'Bells', bus: 'motif' },
  shimmer: { name: 'Shimmer', bus: 'harmony' },
  texture: { name: 'Environment', bus: 'environment' },
  mask: { name: 'Masking bed', bus: 'environment' },
  binaural: { name: 'Binaural layer', bus: 'modulation' },
};

export interface ComposerBuses {
  harmony: AudioNode;
  motif: AudioNode;
  environment: AudioNode;
  modulation: AudioNode;
  space: AudioNode;
}

export interface ComposerOptions {
  seed: string;
  dna: SoundDNA;
  shape: ShapeParams;
  mode: AudioMode;
  startAt?: number;
  fadeIn?: number;
  /** Session arc (authored); defaults to steady. */
  arc?: ArcKind;
  arcMinutes?: number;
  /** Treat the session as already this many minutes old (offline checkpoint renders). */
  arcOffsetMinutes?: number;
}

export interface ComposerInfo {
  chord: string;
  key: string;
  intensity: number;
  activeVoices: number;
  nextEvent: string;
  elapsed: number;
  seed: string;
  phase: string;
}

interface Phrase {
  /** Offsets in scale steps relative to the first note. */
  steps: number[];
  durations: number[];
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * Scenes — the orchestration changes every section, so the music keeps
 * moving: which layers lead, where the pad sits, how open it sounds.
 * Multipliers on the world's levels; the session arc still caps everything.
 */
interface Scene {
  name: string;
  keys: number;
  bells: number;
  pulse: number;
  shimmer: number;
  bass: number;
  /** Pad register shift in semitones. */
  lift: number;
  /** Pad filter multiplier. */
  open: number;
}

const SCENES: Scene[] = [
  { name: 'full', keys: 1, bells: 1, pulse: 1, shimmer: 1, bass: 1, lift: 0, open: 1 },
  { name: 'pad alone', keys: 0.15, bells: 0.4, pulse: 0, shimmer: 1.5, bass: 1.2, lift: -3, open: 0.75 },
  { name: 'melody', keys: 1.6, bells: 0.5, pulse: 0.6, shimmer: 0.6, bass: 0.9, lift: 2, open: 1.1 },
  { name: 'pulse', keys: 0.6, bells: 0.7, pulse: 1.6, shimmer: 0.8, bass: 1, lift: 0, open: 1.15 },
  { name: 'open sky', keys: 0.8, bells: 1.5, pulse: 0.4, shimmer: 1.8, bass: 0.6, lift: 5, open: 1.35 },
  { name: 'deep', keys: 0.5, bells: 0.6, pulse: 0.5, shimmer: 0.4, bass: 1.5, lift: -5, open: 0.65 },
];

export class Composer {
  readonly seed: string;
  private rng: SeededRNG;
  private dna: SoundDNA;
  private shape: ShapeParams;
  private mode: AudioMode;
  private t0: number;
  private stopped = false;

  private parts: Record<PartId, GainNode>;
  private partMutes: Partial<Record<PartId, boolean>> = {};
  private revSends: Partial<Record<PartId, GainNode>> = {};
  private delaySends: Partial<Record<PartId, GainNode>> = {};
  private space: SpaceUnit;
  private spaceOut: GainNode;
  private padFilterA: BiquadFilterNode;
  private padFilterB: BiquadFilterNode;
  private padDuck: GainNode;
  /** Feel's tone control: low shelf (warm) and high shelf (bright) per bus. */
  private tone: Array<{ low: BiquadFilterNode; high: BiquadFilterNode }> = [];
  private filterLfo: OscillatorNode;
  private filterLfoDepth: GainNode;
  private driftA: GainNode;
  private driftB: GainNode;
  private driftOscs: OscillatorNode[] = [];
  private texture: TextureUnit | null = null;
  private mask: TextureUnit | null = null;
  private arc: ArcKind;
  private arcMinutes: number | undefined;
  private arcOffset: number;
  private sm = new Map<string, Smoother>();
  private binauralSources: OscillatorNode[] = [];
  private staticNodes: AudioNode[] = [];

  private voices = new Set<VoiceHandle>();
  private padVoices = new Map<number, VoiceHandle>();
  private bassVoice: { midi: number; handle: VoiceHandle } | null = null;

  // Harmony state
  private tonicPc: number;
  private lastModulationAt: number;
  private choice: ChordChoice;
  private chord: Chord;
  private voicing: number[] | null = null;
  private nextChordAt: number;

  // Event clocks
  private nextPhraseAt: number;
  private nextBellAt: number;
  private nextShimmerAt: number;
  private nextStepAt: number;
  private step = 0;
  private arpIndex = 0;
  private nextSectionAt: number;
  private scene: Scene = SCENES[0];

  // Intensity curve: I(t) = target + (from - target) * exp(-(t - since) / tau)
  private intensityFrom: number;
  private intensityTarget: number;
  private intensitySince: number;
  private readonly intensityTau = 14;

  private motif: Phrase | null = null;
  private lastMelodyNote: number | null = null;

  constructor(
    private ctx: BaseAudioContext,
    private world: SoundWorld,
    buses: ComposerBuses,
    opts: ComposerOptions
  ) {
    this.seed = opts.seed;
    this.rng = new SeededRNG(opts.seed);
    this.dna = { ...opts.dna };
    this.shape = { ...opts.shape };
    this.mode = opts.mode;
    this.arc = opts.arc ?? 'steady';
    this.arcMinutes = opts.arcMinutes;
    this.arcOffset = (opts.arcOffsetMinutes ?? 0) * 60;
    const t = opts.startAt ?? ctx.currentTime + 0.05;
    this.t0 = t;
    const fadeIn = opts.fadeIn ?? 3;

    // ---- parts ------------------------------------------------------------
    const mk = () => ctx.createGain();
    this.parts = {
      pad: mk(),
      bass: mk(),
      keys: mk(),
      pulse: mk(),
      bells: mk(),
      shimmer: mk(),
      texture: mk(),
      mask: mk(),
      binaural: mk(),
    };
    const toneInto = (bus: AudioNode): AudioNode => {
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.setValueAtTime(260, t);
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.setValueAtTime(1800, t);
      low.connect(high);
      high.connect(bus);
      this.tone.push({ low, high });
      return low;
    };
    const harmonyIn = toneInto(buses.harmony);
    const motifIn = toneInto(buses.motif);
    this.parts.pad.connect(harmonyIn);
    this.parts.bass.connect(harmonyIn);
    this.parts.shimmer.connect(harmonyIn);
    this.parts.keys.connect(motifIn);
    this.parts.pulse.connect(motifIn);
    this.parts.bells.connect(motifIn);
    this.parts.texture.connect(buses.environment);
    this.parts.mask.connect(buses.environment);
    this.parts.binaural.connect(buses.modulation);

    // ---- space ------------------------------------------------------------
    const beat = 60 / world.bpm;
    this.space = createSpace(
      ctx,
      world.space.reverbSeconds,
      world.space.darkness,
      Math.min(3.5, beat * world.space.delayBeats),
      world.space.feedback
    );
    this.spaceOut = ctx.createGain();
    this.smoother('spaceOut', this.spaceOut.gain, 0, t).set(1, t, fadeIn);
    this.space.reverbOut.connect(this.spaceOut);
    this.space.delayOut.connect(this.spaceOut);
    this.spaceOut.connect(buses.space);
    (['pad', 'keys', 'pulse', 'bells', 'shimmer', 'bass'] as PartId[]).forEach((p) => {
      const r = ctx.createGain();
      this.parts[p].connect(r);
      r.connect(this.space.reverbIn);
      this.revSends[p] = r;
      if (p === 'keys' || p === 'pulse' || p === 'bells' || p === 'pad') {
        const d = ctx.createGain();
        this.parts[p].connect(d);
        d.connect(this.space.delayIn);
        this.delaySends[p] = d;
      }
    });

    // ---- pad chain: notes -> filterA -> filterB -> duck -> pad part ---------
    this.padFilterA = ctx.createBiquadFilter();
    this.padFilterB = ctx.createBiquadFilter();
    [this.padFilterA, this.padFilterB].forEach((f) => {
      f.type = 'lowpass';
      f.Q.setValueAtTime(0.55, t);
    });
    this.padDuck = ctx.createGain();
    this.padDuck.gain.setValueAtTime(1, t);
    this.padFilterA.connect(this.padFilterB);
    this.padFilterB.connect(this.padDuck);
    this.padDuck.connect(this.parts.pad);

    // Slow filter breathing shared by the whole pad.
    this.filterLfo = ctx.createOscillator();
    this.filterLfoDepth = ctx.createGain();
    this.filterLfo.connect(this.filterLfoDepth);
    this.filterLfoDepth.connect(this.padFilterA.frequency);
    this.filterLfoDepth.connect(this.padFilterB.frequency);
    this.filterLfo.start(t);

    // Ensemble drift (cents) shared by all pad oscillators.
    this.driftA = ctx.createGain();
    this.driftB = ctx.createGain();
    [
      [0.071, this.driftA],
      [0.113, this.driftB],
    ].forEach(([hz, g]) => {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(hz as number, t);
      o.connect(g as GainNode);
      o.start(t);
      this.driftOscs.push(o);
    });

    this.staticNodes.push(
      this.padFilterA,
      this.padFilterB,
      this.padDuck,
      this.filterLfoDepth,
      this.driftA,
      this.driftB,
      this.spaceOut,
      ...Object.values(this.parts),
      ...this.tone.flatMap((x) => [x.low, x.high]),
      ...Object.values(this.revSends),
      ...Object.values(this.delaySends),
      ...this.space.nodes
    );

    // ---- texture & binaural -------------------------------------------------
    this.texture = createTexture(ctx, world.texture.kind, t);
    if (this.texture) this.texture.output.connect(this.parts.texture);
    if (this.mode === 'binaural') this.startBinaural(t);

    // ---- harmony state ------------------------------------------------------
    this.tonicPc = world.key.tonicPc;
    this.lastModulationAt = t;
    this.choice = world.palette.find((c) => c.degree === 0) ?? world.palette[0];
    this.chord = buildChord(this.tonicPc, world.key.mode, this.choice);
    this.nextChordAt = t;
    this.nextPhraseAt = t + 4 + this.rng.range(0, 4);
    this.nextBellAt = t + 6 + this.rng.range(0, 8);
    this.nextShimmerAt = t + 8 + this.rng.range(0, 10);
    this.nextStepAt = t + beat * 4; // let the pad bloom before the pulse enters
    this.nextSectionAt = t + this.rng.range(30, 50);
    const [lo, hi] = world.intensity;
    this.intensityFrom = lo;
    this.intensityTarget = lo + (hi - lo) * 0.5;
    this.intensitySince = t;

    (Object.keys(this.parts) as PartId[]).forEach((p) => this.smoother(`part:${p}`, this.parts[p].gain, 0, t));
    Object.entries(this.revSends).forEach(([p, g]) => this.smoother(`rev:${p}`, g!.gain, 0, t));
    Object.entries(this.delaySends).forEach(([p, g]) => this.smoother(`dly:${p}`, g!.gain, 0, t));
    const c0 = this.padCutoff(t);
    this.smoother('cutA', this.padFilterA.frequency, c0, t);
    this.smoother('cutB', this.padFilterB.frequency, c0, t);
    this.smoother('lfoDepth', this.filterLfoDepth.gain, 0, t);
    this.smoother('lfoRate', this.filterLfo.frequency, 0.035, t);
    this.smoother('driftA', this.driftA.gain, 0, t);
    this.smoother('driftB', this.driftB.gain, 0, t);
    this.tone.forEach((x, i) => {
      this.smoother(`toneLow${i}`, x.low.gain, 0, t);
      this.smoother(`toneHigh${i}`, x.high.gain, 0, t);
    });
    this.applyContinuous(t, fadeIn);
  }

  private smoother(id: string, param: AudioParam, value: number, at: number): Smoother {
    const s = new Smoother(param, value, at);
    this.sm.set(id, s);
    return s;
  }

  private glide(id: string, value: number, at: number, seconds: number): void {
    this.sm.get(id)?.set(value, at, seconds);
  }

  // =========================================================================
  // Public control
  // =========================================================================

  scheduleUntil(until: number): void {
    if (this.stopped) return;
    let guard = 0;
    const maxEvents = Math.max(2000, Math.ceil(until * 10));
    while (guard++ < maxEvents) {
      const next = Math.min(
        this.nextChordAt,
        this.nextPhraseAt,
        this.nextBellAt,
        this.nextShimmerAt,
        this.nextStepAt,
        this.nextSectionAt
      );
      if (next >= until) break;
      if (next === this.nextChordAt) this.scheduleChord(next);
      else if (next === this.nextSectionAt) this.scheduleSection(next);
      else if (next === this.nextStepAt) this.schedulePulseStep(next);
      else if (next === this.nextPhraseAt) this.schedulePhrase(next);
      else if (next === this.nextBellAt) this.scheduleBell(next);
      else this.scheduleShimmer(next);
    }
    this.collectFinished(this.ctx.currentTime);
  }

  setDna(dna: SoundDNA): void {
    this.dna = { ...dna };
    this.applyContinuous(this.ctx.currentTime, 1.2);
  }

  setShape(shape: ShapeParams): void {
    this.shape = { ...shape };
    this.retargetIntensity(this.ctx.currentTime, false);
    this.applyContinuous(this.ctx.currentTime, 1.2);
  }

  setPartMute(part: PartId, muted: boolean): void {
    this.partMutes[part] = muted;
    this.applyContinuous(this.ctx.currentTime, 0.3);
  }

  isPartMuted(part: PartId): boolean {
    return !!this.partMutes[part];
  }

  /** Fades everything out and releases all nodes once silent. Returns the time audio ends. */
  stop(fade = 1.5): number {
    if (this.stopped) return this.ctx.currentTime;
    this.stopped = true;
    const now = this.ctx.currentTime;
    (Object.keys(this.parts) as PartId[]).forEach((p) => this.glide(`part:${p}`, 0, now, fade));
    this.glide('spaceOut', 0, now, fade);
    const end = now + fade + 0.1;
    this.voices.forEach((v) => v.release(now, fade));
    [this.filterLfo, ...this.driftOscs, ...this.binauralSources, ...(this.texture?.sources ?? []), ...(this.mask?.sources ?? [])].forEach((s) => {
      try {
        s.stop(end);
      } catch {
        // already stopped
      }
    });
    return end;
  }

  /** Disconnects every node. Call after `stop()`'s returned time has passed. */
  dispose(): void {
    const all: AudioNode[] = [
      ...this.staticNodes,
      this.filterLfo,
      ...this.driftOscs,
      ...this.binauralSources,
      ...(this.texture ? [...this.texture.nodes, ...this.texture.sources] : []),
      ...(this.mask ? [...this.mask.nodes, ...this.mask.sources] : []),
    ];
    this.voices.forEach((v) => all.push(...v.nodes, ...v.sources));
    all.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        // ignore
      }
    });
    this.voices.clear();
    this.padVoices.clear();
  }

  info(): ComposerInfo {
    const now = this.ctx.currentTime;
    const upcoming: Array<[number, string]> = [
      [this.nextChordAt, 'chord change'],
      [this.nextPhraseAt, 'melodic phrase'],
      [this.nextSectionAt, 'section shift'],
    ];
    if (this.levels().bells > 0) upcoming.push([this.nextBellAt, 'bell']);
    upcoming.sort((a, b) => a[0] - b[0]);
    const [nt, nl] = upcoming[0];
    return {
      chord: this.chord.label,
      key: `${midiName(this.tonicPc + 60).replace(/-?\d+$/, '')} ${this.world.key.mode}`,
      intensity: Math.round(this.intensityAt(now) * 100) / 100,
      activeVoices: this.countActive(now),
      nextEvent: `${nl} in ${Math.max(0, nt - now).toFixed(1)}s`,
      elapsed: now - this.t0,
      seed: this.seed,
      phase: this.arcPoint(now).phase,
    };
  }

  // =========================================================================
  // Mix & continuous parameters
  // =========================================================================

  private intensityAt(t: number): number {
    const k = Math.exp(-Math.max(0, t - this.intensitySince) / this.intensityTau);
    return this.intensityTarget + (this.intensityFrom - this.intensityTarget) * k;
  }

  /** Where the session arc is at audio time t. */
  private arcPoint(t: number): ArcPoint {
    return arcAt(this.arc, (t - this.t0 + this.arcOffset) / 60, this.arcMinutes);
  }

  private darkenAt(t: number): number {
    if (!this.world.darkenMinutes) return 1;
    const p = clamp((t - this.t0 + this.arcOffset) / (this.world.darkenMinutes * 60));
    return 1 - 0.45 * p;
  }

  private rhythmAmount(): number {
    const r = Math.max(this.dna.rhythm, this.mode === 'rhythmic' ? 0.7 : 0);
    return r < 0.06 ? 0 : clamp(0.25 + r * 1.5, 0, 1.4);
  }

  /** Target linear levels for each part from world × DNA × shape. */
  private levels(): Record<PartId, number> {
    const d = this.dna;
    const w = this.world;
    // Spaces without a written pulse still get a soft arpeggio when Feel is lively.
    const pulseBase = w.pulse.level > 0 ? w.pulse.level : this.mode === 'rhythmic' ? 0.22 : d.rhythm > 0.3 ? 0.2 : 0;
    const textureShape = clamp(this.shape.texture * 2, 0, 2);
    const sc = this.scene;
    return {
      pad: 1,
      bass: w.bass.level * 0.45 * (0.4 + 1.1 * d.warmth) * sc.bass,
      keys: w.keys.level * 1.3 * (0.35 + 0.95 * d.musicality) * sc.keys,
      pulse: pulseBase * this.rhythmAmount() * sc.pulse,
      bells: w.bells.level * 2.5 * (0.5 + 0.7 * d.musicality) * sc.bells,
      shimmer: w.shimmer.level * (0.15 + 1.9 * d.brightness) * sc.shimmer,
      texture: w.texture.level * (0.2 + 1.5 * d.nature) * textureShape,
      // Optional masking bed, independent of world texture and of any program.
      mask: 0.42 * clamp(this.shape.masking ?? 0),
      binaural: this.mode === 'binaural' ? 0.05 : 0,
    };
  }

  private padCutoff(t: number): number {
    const d = this.dna;
    const i = this.intensityAt(t + this.intensityTau);
    const energy = 0.8 + this.shape.energy * 0.4;
    const c =
      this.world.pad.cutoff *
      Math.pow(2, (d.brightness - 0.5) * 2.6) *
      Math.pow(2, -(d.warmth - 0.5) * 1.2) *
      this.scene.open *
      (0.7 + 0.6 * i) *
      energy *
      this.darkenAt(t) *
      this.arcPoint(t).brightness;
    return clamp(c, 180, 7000);
  }

  private applyContinuous(t: number, smooth: number): void {
    if (this.stopped) return;
    const dur = Math.max(0.05, smooth);
    const lv = this.levels();
    if (lv.mask > 0 && !this.mask) {
      // Created on first use so a session that never asks for masking pays nothing.
      this.mask = createTexture(this.ctx, 'mask', t);
      this.mask?.output.connect(this.parts.mask);
    }
    (Object.keys(this.parts) as PartId[]).forEach((p) => {
      this.glide(`part:${p}`, this.partMutes[p] ? 0 : lv[p], t, dur);
    });

    const space = clamp(0.35 + this.shape.space * 1.3, 0, 1.6) * (0.55 + 0.9 * this.dna.spatiality);
    const rev = this.world.space.reverbWet * space;
    const dly = this.world.space.delayWet * space;
    const sends: Array<[string, number]> = [
      ['rev:pad', rev * 0.9],
      ['rev:keys', rev * 1.1],
      ['rev:pulse', rev * 0.8],
      ['rev:bells', rev * 1.4],
      ['rev:shimmer', rev * 1.6],
      ['rev:bass', rev * 0.15],
      ['dly:keys', dly],
      ['dly:pulse', dly * 1.2],
      ['dly:bells', dly * 0.6],
      ['dly:pad', dly * 0.15],
    ];
    sends.forEach(([id, v]) => this.glide(id, v, t, dur));

    const slow = Math.max(dur, 2);
    // Tone: warm lifts the lows and dims the highs; bright does the opposite.
    const lowDb = (this.dna.warmth - 0.5) * 12 - (this.dna.brightness - 0.5) * 4;
    const highDb = (this.dna.brightness - 0.5) * 18 - (this.dna.warmth - 0.5) * 6;
    this.tone.forEach((_, i) => {
      this.glide(`toneLow${i}`, clamp(lowDb, -9, 8), t, Math.min(dur, 1.5));
      this.glide(`toneHigh${i}`, clamp(highDb, -14, 10), t, Math.min(dur, 1.5));
    });
    const cutoff = this.padCutoff(t);
    this.glide('cutA', cutoff, t, slow);
    this.glide('cutB', cutoff, t, slow);
    const mv = this.dna.movement;
    this.glide('lfoDepth', cutoff * (0.08 + 0.32 * mv), t, slow);
    this.glide('lfoRate', 0.02 + 0.06 * mv, t, slow);
    const drift = this.world.pad.detune * (0.25 + 1.2 * mv);
    this.glide('driftA', drift, t, slow);
    this.glide('driftB', drift, t, slow);
  }

  // =========================================================================
  // Sections — the slow arc
  // =========================================================================

  private retargetIntensity(t: number, random: boolean): void {
    const [lo, hi] = this.world.intensity;
    const current = this.intensityAt(t);
    let target = random ? lo + this.rng.next() * (hi - lo) : this.intensityTarget;
    target = clamp(target + (this.shape.energy - 0.5) * 0.4 + (this.dna.density - 0.5) * 0.2, 0.05, 1);
    target = Math.min(target, this.arcPoint(t).intensityCap);
    this.intensityFrom = current;
    this.intensityTarget = target;
    this.intensitySince = t;
  }

  private scheduleSection(t: number): void {
    const others = SCENES.filter((x) => x !== this.scene);
    this.scene = others[Math.floor(this.rng.next() * others.length)];
    this.retargetIntensity(t, true);
    this.applyContinuous(t, 16);
    this.nextSectionAt = t + this.rng.range(35, 80);
  }

  // =========================================================================
  // Harmony
  // =========================================================================

  private scheduleChord(t: number): void {
    const w = this.world;
    const first = this.voicing === null;

    if (!first) {
      // Occasional key change by a fourth or fifth — six of seven notes shared.
      if (w.modulateEveryMin > 0 && t - this.lastModulationAt > w.modulateEveryMin * 60) {
        this.tonicPc = (this.tonicPc + (this.rng.next() < 0.5 ? 5 : 7)) % 12;
        this.lastModulationAt = t;
        this.choice = w.palette.find((c) => c.degree === 0) ?? w.palette[0];
      } else if (this.choice.degree !== 0 && this.rng.next() < w.homePull) {
        this.choice = w.palette.find((c) => c.degree === 0) ?? w.palette[0];
      } else {
        this.choice = weightedChoice(w.palette, this.rng, this.choice);
      }
      this.chord = buildChord(this.tonicPc, w.key.mode, this.choice);
    }

    // Keep the pad in roughly the same register even after key changes.
    const voices = clamp(Math.round(w.pad.voices - 1 + this.dna.density * this.arcPoint(t).density * 2), 3, 6);
    const lift = this.scene.lift;
    const next = voiceChord(this.chord, voices, w.pad.low + lift, w.pad.high + lift, this.voicing, this.rng);
    const level = (w.pad.level * 5) / (voices + 1);
    const attack = first ? Math.min(4, w.pad.attack) : w.pad.attack * (1.2 - this.dna.movement * 0.4);
    const release = w.pad.release;

    // Release notes that leave, start notes that arrive, keep common tones ringing.
    const keep = new Set<number>();
    this.padVoices.forEach((handle, midi) => {
      if (next.includes(midi)) keep.add(midi);
      else {
        handle.release(t + attack * 0.25, release);
        this.padVoices.delete(midi);
      }
    });
    next.forEach((midi) => {
      if (keep.has(midi)) return;
      const h = padNote(this.ctx, this.padFilterA, {
        midi,
        start: t,
        attack,
        hold: 3600,
        release,
        level,
        detuneCents: w.pad.detune * (0.6 + this.dna.movement * 0.6),
        width: 0.25 + this.dna.spatiality * 0.6,
        soft: w.pad.soft || this.dna.warmth > 0.82,
        bright: this.dna.brightness > 0.65,
        driftA: this.driftA,
        driftB: this.driftB,
      });
      this.padVoices.set(midi, h);
      this.voices.add(h);
    });
    this.voicing = next;

    // Bass: chord root, or a pedal on the tonic.
    const rootPc = w.bass.pedal ? this.tonicPc : this.chord.rootPc;
    let bassMidi = w.bass.low;
    while ((bassMidi % 12 + 12) % 12 !== rootPc) bassMidi++;
    if (!this.bassVoice || this.bassVoice.midi !== bassMidi) {
      this.bassVoice?.handle.release(t + 1, w.pad.release * 0.8);
      const h = bassNote(this.ctx, this.parts.bass, bassMidi, t, Math.max(3, attack), 3600, release, 0.5);
      this.voices.add(h);
      this.bassVoice = { midi: bassMidi, handle: h };
    }

    const beat = 60 / w.bpm;
    const [bLo, bHi] = w.barsPerChord;
    const bars = Math.round(this.rng.range(bLo, bHi) * (1.25 - this.dna.movement * 0.5));
    this.nextChordAt = t + Math.max(2, bars) * 4 * beat;
    if (!first) this.applyContinuous(t, 6);
  }

  private chordPcs(): number[] {
    return this.chord.pcs;
  }

  // =========================================================================
  // Melody
  // =========================================================================

  private schedulePhrase(t: number): void {
    const w = this.world;
    const lv = this.levels();
    const beat = 60 / w.bpm;
    const darken = this.darkenAt(t);
    const rate =
      w.keys.phrasesPerMin *
      (0.4 + 1.1 * this.dna.density) *
      (0.5 + 0.8 * this.dna.musicality) *
      (0.6 + 0.8 * this.intensityAt(t)) *
      darken *
      this.arcPoint(t).events;
    const scheduleNext = (from: number) => {
      const meanGap = rate > 0 ? 60 / rate : 600;
      this.nextPhraseAt = from + meanGap * this.rng.range(0.6, 1.4);
    };
    if (lv.keys <= 0 || rate <= 0) {
      scheduleNext(t);
      return;
    }
    // Do not straddle a chord change: wait for the new chord instead.
    const room = this.nextChordAt - t;
    if (room < beat * 6) {
      this.nextPhraseAt = this.nextChordAt + beat * this.rng.range(1, 3);
      return;
    }

    const scale = scalePitches(this.tonicPc, w.key.mode, w.keys.low, w.keys.high, w.key.melodyAvoid);
    const chordPcs = this.chordPcs();
    const center = (w.keys.low + w.keys.high) / 2;
    const startTarget = this.lastMelodyNote ?? center + this.rng.range(-4, 4);
    const startPitch = nearestInSet(Math.round(startTarget + this.rng.range(-3, 3)), chordPcs);

    let phrase: Phrase;
    if (this.motif && this.rng.next() < 0.55) {
      // Variation: same contour, one step nudged, maybe one note dropped.
      const steps = [...this.motif.steps];
      const durations = [...this.motif.durations];
      const k = 1 + Math.floor(this.rng.next() * Math.max(1, steps.length - 1));
      steps[k] += this.rng.next() < 0.5 ? 1 : -1;
      if (steps.length > 3 && this.rng.next() < 0.3) {
        steps.splice(k, 1);
        durations.splice(k, 1);
      }
      phrase = { steps, durations };
    } else {
      const n = 3 + Math.floor(this.rng.next() * (2 + this.dna.density * 2.5));
      const steps = [0];
      const durations: number[] = [];
      let pos = 0;
      for (let i = 1; i < n; i++) {
        const leap = this.rng.next();
        let move = leap < 0.55 ? 1 : leap < 0.85 ? 2 : 3;
        // Arch contour: rise in the first half, fall back afterwards.
        const dir = i < n / 2 ? (this.rng.next() < 0.7 ? 1 : -1) : this.rng.next() < 0.7 ? -1 : 1;
        if (Math.abs(pos + dir * move) > 5) move = 1;
        pos += dir * move;
        steps.push(pos);
      }
      const rhythmPool = [1, 1, 1.5, 2, 2, 3];
      for (let i = 0; i < n; i++) {
        durations.push(i === n - 1 ? 4 : rhythmPool[Math.floor(this.rng.next() * rhythmPool.length)]);
      }
      phrase = { steps, durations };
      this.motif = phrase;
    }

    // Realise the phrase on the current scale; strong notes land on chord tones.
    const startIdx = scale.indexOf(nearestInSet(startPitch, scale.map((m) => m % 12)));
    const baseIdx = startIdx >= 0 ? startIdx : Math.floor(scale.length / 2);
    let time = t;
    const total = phrase.durations.reduce((a, b) => a + b, 0) * beat;
    const stretch = total > room - beat * 2 ? (room - beat * 2) / total : 1;
    const inst = w.keys.instrument;
    phrase.steps.forEach((s, i) => {
      const idx = clamp(baseIdx + s, 0, scale.length - 1);
      let midi = scale[idx];
      const strong = i === 0 || i === phrase.steps.length - 1;
      if (strong) midi = nearestInSet(midi, chordPcs);
      midi = clamp(midi, w.keys.low, w.keys.high);
      const human = this.rng.range(-0.02, 0.03);
      const vel = clamp((strong ? 0.6 : 0.45) * this.rng.range(0.8, 1.1) * (i === phrase.steps.length - 1 ? 0.85 : 1), 0.15, 0.8);
      const h = strike(this.ctx, this.parts.keys, inst, {
        midi,
        start: time + human,
        velocity: vel,
        pan: this.rng.range(-0.35, 0.35),
        brightness: clamp(this.dna.brightness * darken),
        sustain: 1 + this.dna.spatiality * 0.4,
      });
      this.voices.add(h);
      // A soft octave "ghost" now and then, for sparkle.
      if (i === phrase.steps.length - 1 && this.dna.brightness > 0.45 && this.rng.next() < 0.3 && midi + 12 <= 96) {
        const g = strike(this.ctx, this.parts.keys, inst, {
          midi: midi + 12,
          start: time + beat * 0.5,
          velocity: vel * 0.35,
          pan: -this.rng.range(-0.4, 0.4),
          brightness: this.dna.brightness * 0.6,
        });
        this.voices.add(g);
      }
      this.lastMelodyNote = midi;
      time += phrase.durations[i] * beat * stretch;
    });
    scheduleNext(time);
  }

  // =========================================================================
  // Pulse — soft arpeggio on a grid, with gentle pad breathing on each beat
  // =========================================================================

  private schedulePulseStep(t: number): void {
    const w = this.world;
    const beat = 60 / w.bpm;
    const stepDur = beat / 4;
    const lv = this.levels();
    const pattern = w.pulse.pattern.length ? w.pulse.pattern : [0.8, 0, 0, 0, 0.5, 0, 0, 0, 0.7, 0, 0, 0, 0.5, 0, 0, 0];
    const vel = pattern[this.step % pattern.length];
    const intensity = this.intensityAt(t);

    if (lv.pulse > 0.0001 && vel > 0) {
      const gate = clamp(0.35 + intensity * 0.5 + this.dna.density * 0.3);
      if (this.rng.next() < gate) {
        const arp = (this.voicing ?? [60, 64, 67]).map((m) => {
          let x = m + 12;
          while (x > 86) x -= 12;
          return x;
        });
        arp.sort((a, b) => a - b);
        const len = arp.length;
        const cycle = len * 2 - 2 || 1;
        const pos = this.arpIndex % cycle;
        const midi = arp[pos < len ? pos : cycle - pos];
        this.arpIndex++;
        const h = strike(this.ctx, this.parts.pulse, w.pulse.instrument || 'mallet', {
          midi,
          start: t,
          velocity: vel * (0.55 + intensity * 0.4),
          pan: ((this.step % 4) - 1.5) * 0.18,
          brightness: this.dna.brightness * 0.8,
          sustain: 0.6,
        });
        this.voices.add(h);
      }
    }

    // Pad breathing on each quarter note.
    if (this.step % 4 === 0) {
      const depth = (w.pulse.sidechain || (this.mode === 'rhythmic' ? 0.1 : 0)) * this.rhythmAmount();
      if (depth > 0.005) {
        // Linear segments only: deterministic in every Web Audio implementation.
        const g = this.padDuck.gain;
        g.setValueAtTime(1, t);
        g.linearRampToValueAtTime(1 - clamp(depth, 0, 0.35), t + 0.04);
        g.linearRampToValueAtTime(1, t + beat * 0.7);
      }
    }

    this.step++;
    // When the pulse is inaudible, idle cheaply and check again next bar.
    if (lv.pulse <= 0.0001 && !(w.pulse.sidechain > 0 && this.rhythmAmount() > 0)) {
      this.step = 0;
      this.nextStepAt = t + beat * 4;
    } else {
      this.nextStepAt = t + stepDur;
    }
  }

  // =========================================================================
  // Accents
  // =========================================================================

  private scheduleBell(t: number): void {
    const w = this.world;
    const lv = this.levels();
    const rate =
      w.bells.perMin * (0.5 + this.dna.density) * (0.6 + 0.8 * this.intensityAt(t)) * this.darkenAt(t) * this.arcPoint(t).events;
    if (lv.bells > 0 && rate > 0) {
      const target = this.rng.range(w.bells.low, w.bells.high);
      const midi = nearestInSet(Math.round(target), this.chordPcs());
      const len = 7 + this.dna.spatiality * 7;
      this.voices.add(bell(this.ctx, this.parts.bells, midi, t, this.rng.range(0.55, 0.9), this.rng.range(-0.5, 0.5), len));
      if (this.rng.next() < 0.3) {
        // A soft answering fifth.
        this.voices.add(
          bell(this.ctx, this.parts.bells, nearestInSet(midi + 7, this.chordPcs()), t + this.rng.range(1.5, 3.5), 0.4, this.rng.range(-0.5, 0.5), len)
        );
      }
    }
    const gap = rate > 0 ? 60 / rate : 120;
    this.nextBellAt = t + gap * this.rng.range(0.6, 1.5);
  }

  private scheduleShimmer(t: number): void {
    const lv = this.levels();
    if (lv.shimmer > 0 && this.voicing) {
      const top = [...this.voicing].sort((a, b) => b - a).slice(0, 2);
      const dur = this.rng.range(14, 26);
      top.forEach((m, i) => {
        let midi = m + 12;
        while (midi < 79) midi += 12;
        while (midi > 96) midi -= 12;
        const h = shimmerTone(
          this.ctx,
          this.parts.shimmer,
          midi,
          t + i * this.rng.range(1, 3),
          Math.min(dur, this.nextChordAt - t + 4),
          0.5,
          i === 0 ? -0.55 : 0.55,
          this.rng.range(0.08, 0.2)
        );
        this.voices.add(h);
      });
    }
    this.nextShimmerAt = t + this.rng.range(18, 40) * (1.3 - this.intensityAt(t) * 0.6);
  }

  private startBinaural(t: number): void {
    // Two pure tones a few Hz apart, one per ear. Headphones only; off by default.
    const base = 110 * Math.pow(2, ((this.tonicPc - 9 + 12) % 12) / 12);
    const merger = this.ctx.createChannelMerger(2);
    [0, 1].forEach((ch) => {
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(base + ch * 6, t);
      o.connect(merger, 0, ch);
      o.start(t);
      this.binauralSources.push(o);
    });
    merger.connect(this.parts.binaural);
    this.staticNodes.push(merger);
  }

  // =========================================================================
  // Housekeeping
  // =========================================================================

  private countActive(now: number): number {
    let n = 0;
    this.voices.forEach((v) => {
      if (v.end > now) n++;
    });
    return n;
  }

  private collectFinished(now: number): void {
    this.voices.forEach((v) => {
      if (v.end < now - 0.5) {
        [...v.sources, ...v.nodes].forEach((n) => {
          try {
            n.disconnect();
          } catch {
            // ignore
          }
        });
        this.voices.delete(v);
      }
    });
  }
}
