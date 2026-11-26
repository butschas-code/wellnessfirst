/**
 * Wellness Waves — Frequency layer
 *
 * Renders a RenderPlan on its own bus, separate from the music, on the audio
 * clock. Methods:
 *   swell / am  a soft drone on the release's tonic (root + fifth) whose
 *               amplitude is modulated by a sine LFO at the step's literal rate
 *   binaural    two pure carriers, left and right, differing by the step's value
 *   tone        a soft sine at the step's literal pitch (opt-in only)
 * Rate changes glide linearly (phase-continuous oscillators, no clicks); every
 * method crossfades over POLICY.transitionSeconds. All automation is linear and
 * self-tracked (Smoother), so offline renders match live playback.
 */

import { POLICY } from '../../domain/programs/adaptationPolicy';
import type { PlanStep, RenderPlan } from '../../domain/programs/types';
import { Smoother, wave } from '../ambient/instruments';
import { midiToFreq } from '../ambient/theory';

export interface FrequencyLayerOptions {
  /** Pitch class of the release's tonic, so the carrier sits inside the music. */
  tonicPc: number;
  /** 0–1 listener intensity. */
  intensity: number;
  startAt: number;
  /** Index in plan.sequence to start from (used when the music changes). */
  startStep?: number;
  fadeIn?: number;
}

export interface FrequencyLayerStatus {
  programId: string;
  arm: RenderPlan['arm'];
  stepIndex: number;
  stepCount: number;
  step: PlanStep;
  elapsedInStep: number;
  stepRemaining: number;
  pass: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * Target level of the layer relative to the music, in dB, per intensity:
 * −24 dB at 0, about −18 dB at the 0.35 default, −8 dB at the maximum. It is
 * always quieter than the music. Calibrated offline against the flagships
 * (rela_001 swell measured at −8.9 dB re music for a linear level of 0.0655).
 */
export const layerRelativeDb = (intensity: number) => -24 + 16 * clamp(intensity);
const CALIBRATION_DB = 14.8;
export const layerLevel = (intensity: number) => Math.pow(10, (layerRelativeDb(intensity) - CALIBRATION_DB) / 20);

/** Share of total energy the layer adds; used to trim the music for equal-loudness A/B. */
export const LAYER_ENERGY_SHARE = (intensity: number) => Math.pow(10, layerRelativeDb(intensity) / 10);
export const musicCompensation = (intensity: number) => Math.sqrt(1 - LAYER_ENERGY_SHARE(intensity));

export class FrequencyLayer {
  readonly plan: RenderPlan;
  private ctx: BaseAudioContext;
  private out: GainNode;
  private outS: Smoother;
  private t0: number;
  private startStep: number;
  private nextStep: number;
  private stopped = false;
  private intensity: number;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];

  // AM / swell path
  private amLevel: Smoother;
  private amBase: Smoother;
  private lfo: OscillatorNode;
  private lfoRate: Smoother;
  private lfoDepth: Smoother;

  // Binaural path
  private binLevel: Smoother;
  private binRight: OscillatorNode;
  private binRightHz: Smoother;
  private binCarrierHz: number;

  // Tone path: one oscillator per tone step
  private toneBus: GainNode;

  constructor(ctx: BaseAudioContext, destination: AudioNode, plan: RenderPlan, opts: FrequencyLayerOptions) {
    this.ctx = ctx;
    this.plan = plan;
    this.intensity = clamp(opts.intensity);
    const t = opts.startAt;
    this.t0 = t;
    this.startStep = Math.max(0, Math.min(plan.sequence.length - 1, opts.startStep ?? 0));
    this.nextStep = 0;

    this.out = ctx.createGain();
    this.outS = new Smoother(this.out.gain, 0, t);
    this.outS.set(layerLevel(this.intensity), t, opts.fadeIn ?? 3);
    this.out.connect(destination);
    this.nodes.push(this.out);

    // ---- AM / swell drone: tonic + fifth in a warm mid register ----------
    let root = 48 + opts.tonicPc;
    if (root > 55) root -= 12;
    const drone = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.Q.setValueAtTime(0.5, t);
    // Exactly in tune: detuned unisons would beat (≈0.8 Hz) and add a rhythm the
    // catalog never specified, contaminating the program's own modulation.
    [
      [root, 0.8],
      [root + 7, 0.3],
      [root + 12, 0.18],
    ].forEach(([m, g]) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave(ctx, 'padSoft'));
      o.frequency.setValueAtTime(midiToFreq(m), t);
      const og = ctx.createGain();
      og.gain.setValueAtTime(g, t);
      o.connect(og);
      og.connect(drone);
      o.start(t);
      this.sources.push(o);
      this.nodes.push(og);
    });
    drone.connect(lp);

    // amGain.gain = (1 − d/2) + (d/2)·sin(2πft): swings between 1 − d and 1, never negative.
    const amGain = ctx.createGain();
    this.amBase = new Smoother(amGain.gain, 1, t);
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfoRate = new Smoother(this.lfo.frequency, 1, t);
    const lfoDepth = ctx.createGain();
    this.lfoDepth = new Smoother(lfoDepth.gain, 0, t);
    this.lfo.connect(lfoDepth);
    lfoDepth.connect(amGain.gain);
    this.lfo.start(t);
    this.sources.push(this.lfo);
    lp.connect(amGain);
    const amOut = ctx.createGain();
    this.amLevel = new Smoother(amOut.gain, 0, t);
    amGain.connect(amOut);
    amOut.connect(this.out);
    this.nodes.push(drone, lp, amGain, lfoDepth, amOut);

    // ---- Binaural pair: tonic carrier between 196 and 392 Hz -------------
    this.binCarrierHz = midiToFreq(55 + ((opts.tonicPc - 7 + 12) % 12));
    const merger = ctx.createChannelMerger(2);
    const binGain = ctx.createGain();
    this.binLevel = new Smoother(binGain.gain, 0, t);
    const left = ctx.createOscillator();
    left.frequency.setValueAtTime(this.binCarrierHz, t);
    this.binRight = ctx.createOscillator();
    this.binRightHz = new Smoother(this.binRight.frequency, this.binCarrierHz, t);
    const lg = ctx.createGain();
    const rg = ctx.createGain();
    lg.gain.setValueAtTime(0.5, t);
    rg.gain.setValueAtTime(0.5, t);
    left.connect(lg);
    this.binRight.connect(rg);
    lg.connect(merger, 0, 0);
    rg.connect(merger, 0, 1);
    merger.connect(binGain);
    binGain.connect(this.out);
    left.start(t);
    this.binRight.start(t);
    this.sources.push(left, this.binRight);
    this.nodes.push(merger, binGain, lg, rg);

    // ---- Tone bus ---------------------------------------------------------
    this.toneBus = ctx.createGain();
    this.toneBus.gain.setValueAtTime(0.6, t);
    this.toneBus.connect(this.out);
    this.nodes.push(this.toneBus);
  }

  private stepAt(n: number): PlanStep {
    const seq = this.plan.sequence;
    return seq[(this.startStep + n) % seq.length];
  }

  /** Schedules every step boundary up to `until` on the audio clock. */
  scheduleUntil(until: number): void {
    if (this.stopped || !this.plan.renderable) return;
    const dur = this.plan.options.stepSeconds;
    const glide = POLICY.transitionSeconds;
    let guard = 0;
    while (guard++ < 500) {
      const at = this.t0 + this.nextStep * dur;
      if (at >= until) break;
      const step = this.stepAt(this.nextStep);
      const first = this.nextStep === 0;
      const g = first ? 0.05 : glide;
      const isMod = step.method === 'am' || step.method === 'swell';
      if (isMod) {
        this.lfoRate.set(step.renderedHz, at, g);
        this.lfoDepth.set(step.depth / 2, at, g);
        this.amBase.set(1 - step.depth / 2, at, g);
      }
      this.amLevel.set(isMod ? 1 : 0, at, glide);
      if (step.method === 'binaural') this.binRightHz.set(this.binCarrierHz + step.renderedHz, at, g);
      this.binLevel.set(step.method === 'binaural' ? 0.8 : 0, at, glide);
      if (step.method === 'tone') this.scheduleTone(step.renderedHz, at, dur);
      this.nextStep++;
    }
  }

  private scheduleTone(hz: number, at: number, dur: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(hz, at);
    const env = this.ctx.createGain();
    const fade = POLICY.transitionSeconds;
    // Equal loudness is not attempted; higher tones are simply kept quieter.
    const level = hz > 500 ? 0.35 : hz > 250 ? 0.5 : 0.7;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + fade);
    env.gain.setValueAtTime(level, at + dur);
    env.gain.linearRampToValueAtTime(0, at + dur + fade);
    o.connect(env);
    env.connect(this.toneBus);
    o.start(at);
    o.stop(at + dur + fade + 0.05);
    this.sources.push(o);
    this.nodes.push(env);
    // Forget finished tone voices so long sessions do not accumulate nodes.
    if (this.sources.length > 64) this.sources.splice(4, this.sources.length - 48);
  }

  setIntensity(intensity: number, at = this.ctx.currentTime): void {
    this.intensity = clamp(intensity);
    if (!this.stopped) this.outS.set(layerLevel(this.intensity), at, 0.4);
  }

  /** Fades to silence and stops every source. Returns the time audio ends. */
  stop(fade = 1.2): number {
    const now = this.ctx.currentTime;
    if (this.stopped) return now;
    this.stopped = true;
    this.outS.set(0, now, fade);
    const end = now + fade + 0.1;
    this.sources.forEach((s) => {
      try {
        s.stop(end);
      } catch {
        // already stopped
      }
    });
    return end;
  }

  dispose(): void {
    [...this.sources, ...this.nodes].forEach((n) => {
      try {
        n.disconnect();
      } catch {
        // ignore
      }
    });
    this.sources = [];
    this.nodes = [];
  }

  status(now = this.ctx.currentTime): FrequencyLayerStatus {
    const dur = this.plan.options.stepSeconds;
    const elapsed = Math.max(0, now - this.t0);
    const n = Math.floor(elapsed / dur);
    const len = this.plan.sequence.length;
    return {
      programId: this.plan.programId,
      arm: this.plan.arm,
      stepIndex: (this.startStep + n) % len,
      stepCount: len,
      step: this.stepAt(n),
      elapsedInStep: elapsed - n * dur,
      stepRemaining: dur - (elapsed - n * dur),
      pass: Math.floor((this.startStep + n) / len) + 1,
    };
  }
}
