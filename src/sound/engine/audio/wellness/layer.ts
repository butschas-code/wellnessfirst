/**
 * Wellness Waves — Wellness layer.
 *
 * Works on the finished music, after the master dynamics (it only ever lowers
 * the level, so it can never push the limiter).
 * Each layer has its own path (send → pulse → breath → out → dest) and fades
 * in over the dry path, so switching techniques is a clean crossfade:
 *   pulse   pulseGain = (1 − d/2) + (d/2)·sin(2πft): the whole mix flutters at f
 *   breath  breathGain glides between 1 − depth and 1 in the pattern's segments
 *           (in, hold, out, hold); the stage reads the same schedule to breathe
 * Linear, self-tracked automation only (Smoother), so offline renders match
 * live playback exactly. Visuals never mirror anything faster than 1 Hz.
 */

import { Smoother } from '../ambient/instruments';
import type { BreathPattern, Technique } from '../../domain/wellness/techniques';

export interface WellnessNodes {
  /** The summed music. */
  send: AudioNode;
  /** Where the treated music goes (the master input). */
  dest: AudioNode;
}

export type BreathPhase = 'in' | 'hold' | 'out' | 'rest';

export interface BreathState {
  /** 0 = fully out, 1 = fully in. */
  value: number;
  phase: BreathPhase;
  /** Seconds left in this part of the breath. */
  remaining: number;
}

interface Segment {
  start: number;
  end: number;
  from: number;
  to: number;
  phase: BreathPhase;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export class WellnessLayer {
  readonly technique: Technique;
  private ctx: BaseAudioContext;
  private t0: number;
  private stopped = false;
  private lfo: OscillatorNode | null = null;
  private lfoDepthNode: GainNode | null = null;
  private pulseBase: Smoother;
  private pulseDepth: Smoother | null = null;
  private pulseRate: Smoother | null = null;
  private breath: Smoother;
  private out: Smoother;
  private nodes: AudioNode[] = [];
  private segments: Segment[] = [];
  private nextBreathAt: number;
  /** frequency program: next step boundary and index. */
  private nextStepAt = Infinity;
  private stepIndex = 0;
  private steps = 0;
  /** Soft literal-pitch tones for catalog values above the pulse range. */
  private toneBus: GainNode;
  private toneVoices: Array<{ osc: OscillatorNode; env: GainNode; end: number }> = [];

  constructor(ctx: BaseAudioContext, nodes: WellnessNodes, technique: Technique, startAt: number, fadeIn = 4) {
    this.ctx = ctx;
    this.technique = technique;
    const t = startAt;
    this.t0 = t;
    const pulse = ctx.createGain();
    const breath = ctx.createGain();
    const out = ctx.createGain();
    nodes.send.connect(pulse);
    pulse.connect(breath);
    breath.connect(out);
    out.connect(nodes.dest);
    this.nodes.push(pulse, breath, out);
    this.toneBus = ctx.createGain();
    this.toneBus.gain.setValueAtTime(1, t);
    this.toneBus.connect(out);
    this.nodes.push(this.toneBus);
    this.pulseBase = new Smoother(pulse.gain, 1, t);
    this.breath = new Smoother(breath.gain, 1, t);
    this.out = new Smoother(out.gain, 0, t);
    this.out.set(1, t, fadeIn);
    this.nextBreathAt = t;

    const p = technique.pulse;
    if (technique.kind === 'pulse' && p) {
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.pulseRate = new Smoother(this.lfo.frequency, p.hz, t);
      this.lfoDepthNode = ctx.createGain();
      this.pulseDepth = new Smoother(this.lfoDepthNode.gain, 0, t);
      this.lfo.connect(this.lfoDepthNode);
      this.lfoDepthNode.connect(pulse.gain);
      this.lfo.start(t);
      this.pulseDepth.set(p.depth / 2, t, fadeIn);
      this.pulseBase.set(1 - p.depth / 2, t, fadeIn);
      if (p.to) this.pulseRate.set(p.to.hz, t + fadeIn, p.to.minutes * 60);
      if (p.sequence?.length) {
        this.nextStepAt = t + p.sequence[0].seconds;
        this.stepIndex = 0;
        if (p.sequence[0].tone) this.scheduleTone(p.sequence[0].hz, t, p.sequence[0].seconds);
      }
    }
  }

  /** The breath pattern at audio time t, stretched if the technique slows down. */
  private patternAt(t: number): BreathPattern {
    const b = this.technique.breath!;
    const slow = b.slowTo;
    const k = slow ? 1 + (slow.factor - 1) * clamp((t - this.t0) / (slow.minutes * 60)) : 1;
    const p = b.pattern;
    return { inhale: p.inhale * k, holdIn: p.holdIn * k, exhale: p.exhale * k, holdOut: p.holdOut * k };
  }

  /** Schedules breath segments up to `until` on the audio clock. */
  scheduleUntil(until: number): void {
    if (this.stopped) return;
    this.scheduleSteps(until);
    if (this.technique.kind !== 'breath') return;
    const low = 1 - this.technique.breath!.depth;
    let guard = 0;
    while (this.nextBreathAt < until && guard++ < 64) {
      const at = this.nextBreathAt;
      const p = this.patternAt(at);
      const parts: Array<[BreathPhase, number, number]> = [
        ['in', p.inhale, 1],
        ['hold', p.holdIn, 1],
        ['out', p.exhale, low],
        ['rest', p.holdOut, low],
      ];
      let s = at;
      let from = this.segments.length ? this.segments[this.segments.length - 1].to : low;
      for (const [phase, dur, to] of parts) {
        if (dur <= 0) continue;
        this.breath.set(to, s, dur);
        this.segments.push({ start: s, end: s + dur, from, to, phase });
        from = to;
        s += dur;
      }
      this.nextBreathAt = s;
      if (this.segments.length > 48) this.segments.splice(0, this.segments.length - 32);
    }
  }

  /** Frequency programs: glide to each next frequency (and its depth) in catalog order, looping. */
  private scheduleSteps(until: number): void {
    const seq = this.technique.pulse?.sequence;
    if (!seq?.length || !this.pulseRate || !this.pulseDepth) return;
    const glide = 4;
    let guard = 0;
    while (this.nextStepAt < until && guard++ < 32) {
      const at = this.nextStepAt;
      this.stepIndex = (this.stepIndex + 1) % seq.length;
      const step = seq[this.stepIndex];
      if (step.tone) {
        // A pitch, not a rate: let the pulse rest and sound the value as a soft tone.
        this.pulseDepth.set(0, at, glide);
        this.pulseBase.set(1, at, glide);
        this.scheduleTone(step.hz, at, step.seconds);
      } else {
        this.pulseRate.set(step.hz, at, glide);
        this.pulseDepth.set(step.depth / 2, at, glide);
        this.pulseBase.set(1 - step.depth / 2, at, glide);
      }
      this.nextStepAt = at + step.seconds;
      this.steps++;
    }
  }

  /** One catalog value as a pure tone at its literal pitch, faded in and out over 4 s. */
  private scheduleTone(hz: number, at: number, seconds: number): void {
    const fade = 4;
    const level = hz > 500 ? 0.035 : hz > 200 ? 0.045 : 0.06;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, at);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + fade);
    env.gain.setValueAtTime(level, at + seconds);
    env.gain.linearRampToValueAtTime(0, at + seconds + fade);
    osc.connect(env);
    env.connect(this.toneBus);
    osc.start(at);
    const end = at + seconds + fade + 0.05;
    osc.stop(end);
    this.toneVoices.push({ osc, env, end });
    // Forget finished voices so long sessions do not accumulate nodes.
    const now = this.ctx.currentTime;
    this.toneVoices = this.toneVoices.filter((v) => {
      if (v.end > now - 1) return true;
      try {
        v.osc.disconnect();
        v.env.disconnect();
      } catch {
        // ignore
      }
      return false;
    });
  }

  /** Where the breath is now; null for techniques without breathing. */
  breathAt(t = this.ctx.currentTime): BreathState | null {
    if (this.technique.kind !== 'breath' || this.stopped) return null;
    const low = 1 - this.technique.breath!.depth;
    const seg = this.segments.find((s) => t >= s.start && t < s.end);
    if (!seg) return { value: 0, phase: 'rest', remaining: 0 };
    const v = seg.from + ((seg.to - seg.from) * (t - seg.start)) / (seg.end - seg.start);
    return { value: clamp((v - low) / (1 - low)), phase: seg.phase, remaining: seg.end - t };
  }

  /** Current pulse rate in Hz (it may be gliding); 0 for non-pulse techniques. */
  pulseHz(t = this.ctx.currentTime): number {
    return this.pulseRate ? this.pulseRate.valueAt(t) : 0;
  }

  /** Returns the music to neutral and stops. Returns the time it ends. */
  stop(fade = 2): number {
    const now = this.ctx.currentTime;
    if (this.stopped) return now;
    this.stopped = true;
    this.out.set(0, now, fade);
    const end = now + fade + 0.1;
    [this.lfo, ...this.toneVoices.map((v) => v.osc)].forEach((o) => {
      try {
        o?.stop(end);
      } catch {
        // already stopped
      }
    });
    return end;
  }

  dispose(): void {
    [this.lfo, this.lfoDepthNode, ...this.nodes, ...this.toneVoices.flatMap((v) => [v.osc, v.env])].forEach((n) => {
      try {
        n?.disconnect();
      } catch {
        // ignore
      }
    });
  }
}
