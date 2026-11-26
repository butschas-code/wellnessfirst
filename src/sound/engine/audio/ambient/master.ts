/**
 * Wellness Waves — Mixer & master chain
 * Bus gains → DC/rumble high-pass → gentle glue compressor → safety limiter.
 * Shared by the live engine and every offline render so they sound identical.
 */

import type { AudioMode, ShapeParams, SoundDNA, SoundscapeRecipe } from '../../types/index';
import { Composer, type ComposerBuses } from './composer';
import { type SoundWorld, worldForRecipe } from './worlds';
import { FrequencyLayer, musicCompensation } from '../frequency/layer';
import { ARC_FOR_INTENT, type ArcKind } from './arcs';
import type { RenderPlan } from '../../domain/programs/types';
import type { Technique } from '../../domain/wellness/techniques';
import { WellnessLayer } from '../wellness/layer';

export type MixBusId = 'harmony' | 'motif' | 'texture' | 'environment' | 'modulation' | 'reverb' | 'frequency';

export const DEFAULT_BUS_GAINS: Record<MixBusId, number> = {
  harmony: 1,
  motif: 0.9,
  texture: 1,
  environment: 1,
  modulation: 1,
  reverb: 1,
  /** Frequency layer — only ever fed when the listener opts in. */
  frequency: 1,
};

/** Buses that carry the music itself (everything except the opt-in frequency layer). */
export const MUSIC_BUSES: MixBusId[] = ['harmony', 'motif', 'texture', 'environment', 'modulation', 'reverb'];

export interface MasterChain {
  buses: Record<MixBusId, GainNode>;
  /** Post-limiter node; connect to destination (via volume) or an analyser. */
  output: AudioNode;
  input: GainNode;
  composerBuses: ComposerBuses;
  /** The finished mix after the limiter; wellness layers tap it here. */
  musicSum: GainNode;
  /** Untreated path to the output; faded out while a wellness layer plays. */
  musicDry: GainNode;
  /** Where wellness layers send the treated mix (feeds `output`). */
  post: GainNode;
  meters: Partial<Record<MixBusId | 'master', AnalyserNode>>;
}

export function createMasterChain(ctx: BaseAudioContext, withMeters = false): MasterChain {
  const t = ctx.currentTime;
  const input = ctx.createGain();
  input.gain.setValueAtTime(1, t);

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(24, t);
  hp.Q.setValueAtTime(0.6, t);

  // Gentle glue: low ratio, slow attack — keeps the mix cohesive without pumping.
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.setValueAtTime(-20, t);
  glue.knee.setValueAtTime(12, t);
  glue.ratio.setValueAtTime(2, t);
  glue.attack.setValueAtTime(0.08, t);
  glue.release.setValueAtTime(0.6, t);

  // Safety limiter — should almost never engage at normal levels.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-3, t);
  limiter.knee.setValueAtTime(0, t);
  limiter.ratio.setValueAtTime(20, t);
  limiter.attack.setValueAtTime(0.003, t);
  limiter.release.setValueAtTime(0.25, t);

  input.connect(hp);
  hp.connect(glue);
  glue.connect(limiter);

  // Wellness sits after the dynamics: it only ever lowers the level, so it can
  // never push the limiter, and its depth is exactly what was asked for.
  const musicSum = ctx.createGain();
  musicSum.gain.setValueAtTime(1, t);
  const musicDry = ctx.createGain();
  musicDry.gain.setValueAtTime(1, t);
  const post = ctx.createGain();
  post.gain.setValueAtTime(1, t);
  limiter.connect(musicSum);

  // Last line of defence: transparent below −2 dBFS, then a smooth knee that can
  // never reach full scale (the limiter's 3 ms attack lets rare transients by).
  const safety = ctx.createWaveShaper();
  const N = 4096;
  const curve = new Float32Array(N);
  const knee = 0.8;
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (0.98 - knee) * Math.tanh((a - knee) / (0.98 - knee));
    curve[i] = Math.sign(x) * y;
  }
  safety.curve = curve;
  post.connect(safety);
  musicSum.connect(musicDry);
  musicDry.connect(post);

  const buses = {} as Record<MixBusId, GainNode>;
  const meters: MasterChain['meters'] = {};
  (Object.keys(DEFAULT_BUS_GAINS) as MixBusId[]).forEach((id) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(DEFAULT_BUS_GAINS[id], t);
    g.connect(input);
    buses[id] = g;
    if (withMeters) {
      const a = ctx.createAnalyser();
      a.fftSize = 2048;
      g.connect(a);
      meters[id] = a;
    }
  });
  if (withMeters) {
    const a = ctx.createAnalyser();
    a.fftSize = 2048;
    // Before the wellness layer: visuals follow the music, never a 16-40 Hz program flutter.
    limiter.connect(a);
    meters.master = a;
  }

  return {
    buses,
    output: safety,
    input,
    musicSum,
    musicDry,
    post,
    meters,
    composerBuses: {
      harmony: buses.harmony,
      motif: buses.motif,
      environment: buses.environment,
      modulation: buses.modulation,
      space: buses.reverb,
    },
  };
}

export interface OfflineRenderOptions {
  seconds: number;
  seed?: string;
  mode?: AudioMode;
  shape?: ShapeParams;
  tonalOnly?: boolean;
  /** Bus gain overrides, e.g. { motif: 0 } to solo the harmony. */
  busGains?: Partial<Record<MixBusId, number>>;
  /** Renders this world instead of the recipe's authored one (Studio drafts). */
  world?: SoundWorld;
  /** Session arc; defaults to the recipe's space. Pass 'steady' to disable. */
  arc?: ArcKind;
  arcMinutes?: number;
  /** Start the arc this many minutes in (checkpoint renders without rendering the whole hour). */
  arcOffsetMinutes?: number;
  /** Initial fade-in duration in seconds (default 2.5; pass 0 for continuation chunks). */
  fadeIn?: number;
  /** Optional frequency program on the frequency bus. */
  program?: { plan: RenderPlan; intensity: number; startStep?: number };
  /** Optional wellness technique working on the music itself. */
  technique?: Technique;
}

/**
 * Renders a recipe through the real composer and master chain into an
 * OfflineAudioContext the caller created (browser or Node polyfill).
 */
export async function renderRecipe(
  ctx: OfflineAudioContext,
  recipe: SoundscapeRecipe,
  dna: SoundDNA,
  opts: OfflineRenderOptions
): Promise<AudioBuffer> {
  const chain = createMasterChain(ctx);
  chain.output.connect(ctx.destination);
  const gains = { ...opts.busGains };
  if (opts.tonalOnly) {
    gains.texture = 0;
    gains.environment = 0;
    gains.modulation = 0;
  }
  // Same equal-loudness trim as the live engine when a program is audible.
  const programAudible = !!opts.program?.plan.renderable && (gains.frequency ?? 1) > 0;
  if (programAudible) {
    const comp = musicCompensation(opts.program!.intensity);
    MUSIC_BUSES.forEach((id) => {
      gains[id] = (gains[id] ?? DEFAULT_BUS_GAINS[id]) * comp;
    });
  }
  (Object.keys(gains) as MixBusId[]).forEach((id) => {
    chain.buses[id].gain.setValueAtTime(gains[id] ?? 1, 0);
  });
  const fadeIn = opts.fadeIn ?? 2.5;
  const composer = new Composer(ctx, opts.world ?? worldForRecipe(recipe), chain.composerBuses, {
    seed: opts.seed ?? `${recipe.id}@${recipe.version}#${recipe.seed ?? 'reference'}`,
    dna,
    shape: opts.shape ?? { energy: 0.5, texture: 0.5, space: 0.5 },
    mode: opts.mode ?? 'ambient',
    startAt: 0,
    fadeIn,
    arc: opts.arc ?? ARC_FOR_INTENT[recipe.intent],
    arcMinutes: opts.arcMinutes,
    arcOffsetMinutes: opts.arcOffsetMinutes,
  });
  composer.scheduleUntil(opts.seconds);
  if (opts.technique) {
    chain.musicDry.gain.setValueAtTime(1, 0);
    chain.musicDry.gain.linearRampToValueAtTime(0, 0.5);
    const w = new WellnessLayer(ctx, { send: chain.musicSum, dest: chain.post }, opts.technique, 0, 0.5);
    w.scheduleUntil(opts.seconds);
  }
  if (opts.program && opts.program.plan.renderable) {
    const layer = new FrequencyLayer(ctx, chain.buses.frequency, opts.program.plan, {
      tonicPc: (opts.world ?? worldForRecipe(recipe)).key.tonicPc,
      intensity: opts.program.intensity,
      startAt: 0,
      startStep: opts.program.startStep,
      fadeIn,
    });
    layer.scheduleUntil(opts.seconds);
  }
  return ctx.startRendering();
}
