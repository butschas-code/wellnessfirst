/**
 * Wellness Waves — Instrument voices
 * Band-limited wavetable pads, FM electric piano, felt piano, mallets, bells,
 * sub bass and airy shimmer. Every voice is a short-lived node graph with a
 * smooth envelope; nothing here ever hard-starts at full level.
 */

import { midiToFreq } from './theory';

export interface VoiceHandle {
  /** Audio time at which every source in this voice has stopped. */
  end: number;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  /** Fades the voice out from `time` over `fade` seconds (used on stop / crossfade). */
  release: (time: number, fade: number) => void;
}

// ---------------------------------------------------------------------------
// Wavetables
// ---------------------------------------------------------------------------

type WaveName = 'pad' | 'padSoft' | 'padBright' | 'felt' | 'bass' | 'reed';
const waveCache = new WeakMap<BaseAudioContext, Partial<Record<WaveName, PeriodicWave>>>();

function buildWave(ctx: BaseAudioContext, harmonics: number[]): PeriodicWave {
  const real = new Float32Array(harmonics.length + 1);
  const imag = new Float32Array(harmonics.length + 1);
  harmonics.forEach((a, i) => {
    imag[i + 1] = a;
  });
  return ctx.createPeriodicWave(real, imag);
}

export function wave(ctx: BaseAudioContext, name: WaveName): PeriodicWave {
  let cache = waveCache.get(ctx);
  if (!cache) {
    cache = {};
    waveCache.set(ctx, cache);
  }
  if (!cache[name]) {
    let h: number[];
    switch (name) {
      case 'pad':
        // Soft sawtooth: rolled-off harmonics with slightly weaker evens — warm, never buzzy.
        h = Array.from({ length: 28 }, (_, i) => {
          const n = i + 1;
          return (1 / Math.pow(n, 1.55)) * (n % 2 === 0 ? 0.62 : 1);
        });
        break;
      case 'padBright':
        // Fuller harmonics for a bright Feel: glassy, still rolled off at the top.
        h = Array.from({ length: 40 }, (_, i) => {
          const n = i + 1;
          return (1 / Math.pow(n, 1.15)) * (n % 2 === 0 ? 0.7 : 1);
        });
        break;
      case 'padSoft':
        h = Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          return 1 / Math.pow(n, 2.3);
        });
        break;
      case 'felt':
        h = [1, 0.32, 0.14, 0.06, 0.03, 0.012];
        break;
      case 'bass':
        h = [1, 0.22, 0.06, 0.02];
        break;
      case 'reed':
        h = [1, 0.05, 0.38, 0.03, 0.16, 0.02, 0.07];
        break;
    }
    cache[name] = buildWave(ctx, h);
  }
  return cache[name]!;
}

/**
 * Linear, self-tracking automation for a continuous parameter. Because the
 * smoother knows its own curve it never needs cancelAndHold or chained
 * setTargetAtTime calls, which behave inconsistently across implementations.
 */
export class Smoother {
  private segs: Array<{ t0: number; v0: number; t1: number; v1: number }>;

  constructor(private param: AudioParam, value: number, at: number) {
    param.setValueAtTime(value, at);
    this.segs = [{ t0: at, v0: value, t1: at, v1: value }];
  }

  valueAt(t: number): number {
    // Segments are kept in start order: binary search for the last one starting at or before t.
    let lo = 0;
    let hi = this.segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.segs[mid].t0 <= t) lo = mid;
      else hi = mid - 1;
    }
    const seg = this.segs[lo];
    if (t >= seg.t1) return seg.v1;
    if (t <= seg.t0) return seg.v0;
    return seg.v0 + ((seg.v1 - seg.v0) * (t - seg.t0)) / (seg.t1 - seg.t0);
  }

  get target(): number {
    return this.segs[this.segs.length - 1].v1;
  }

  /** Glide linearly to `value`, starting at `at`, over `seconds`. */
  set(value: number, at: number, seconds: number): void {
    const v = this.valueAt(at);
    this.segs = this.segs.filter((s) => s.t0 < at);
    // Long schedules (a whole arc movement of drift and bursts) are planned ahead, so keep
    // enough history for valueAt(now) to stay right; trim only far beyond that.
    if (this.segs.length > 4096) this.segs = this.segs.slice(-2048);
    this.param.cancelScheduledValues(at);
    this.param.linearRampToValueAtTime(v, at);
    this.param.linearRampToValueAtTime(value, at + Math.max(0.01, seconds));
    this.segs.push({ t0: at, v0: v, t1: at + Math.max(0.01, seconds), v1: value });
  }
}

function makeHandle(
  end: number,
  sources: AudioScheduledSourceNode[],
  nodes: AudioNode[],
  envelope: GainNode,
  curve: (t: number) => number
): VoiceHandle {
  let released: { at: number; v: number; fade: number } | null = null;
  const valueAt = (t: number) => {
    if (released && t >= released.at) {
      return t >= released.at + released.fade ? 0 : released.v * (1 - (t - released.at) / released.fade);
    }
    return curve(t);
  };
  const handle: VoiceHandle = {
    end,
    sources,
    nodes,
    release: (time: number, fade: number) => {
      const stopAt = time + fade + 0.05;
      if (stopAt >= handle.end) return;
      const g = envelope.gain;
      const v = valueAt(time);
      g.cancelScheduledValues(time);
      // Ramp (not jump) onto the release point so an in-flight attack stays smooth.
      if (time > envelope.context.currentTime + 0.02) g.linearRampToValueAtTime(v, time);
      else g.setValueAtTime(v, time);
      g.linearRampToValueAtTime(0, time + fade);
      released = { at: time, v, fade };
      sources.forEach((s) => {
        try {
          s.stop(stopAt);
        } catch {
          // already stopped
        }
      });
      handle.end = stopAt;
    },
  };
  return handle;
}

/** attack → hold → release, all linear. */
const ahr = (start: number, attack: number, level: number, relStart: number, release: number) => (t: number) => {
  if (t <= start) return 0;
  if (t < start + attack) return (level * (t - start)) / attack;
  if (t < relStart) return level;
  if (t < relStart + release) return level * (1 - (t - relStart) / release);
  return 0;
};

/** linear attack → exponential decay. */
const strikeCurve = (start: number, peak: number, attack: number, tau: number) => (t: number) => {
  if (t <= start) return 0;
  if (t < start + attack) return (peak * (t - start)) / attack;
  return peak * Math.exp(-(t - start - attack) / tau);
};

// ---------------------------------------------------------------------------
// Pad note — three detuned wavetable oscillators spread across the stereo field.
// The shared pad filter lives in the composer so the whole pad sweeps together.
// ---------------------------------------------------------------------------

export interface PadNoteOptions {
  midi: number;
  start: number;
  attack: number;
  hold: number;
  release: number;
  level: number;
  detuneCents: number;
  width: number;
  soft?: boolean;
  bright?: boolean;
  /** Shared slow LFOs (cents) that make the ensemble drift. */
  driftA?: AudioNode;
  driftB?: AudioNode;
}

export function padNote(ctx: BaseAudioContext, dest: AudioNode, o: PadNoteOptions): VoiceHandle {
  const freq = midiToFreq(o.midi);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, o.start);
  env.gain.linearRampToValueAtTime(o.level, o.start + o.attack);
  const relStart = o.start + o.attack + o.hold;
  env.gain.setValueAtTime(o.level, relStart);
  env.gain.linearRampToValueAtTime(0, relStart + o.release);
  env.connect(dest);

  const end = relStart + o.release + 0.05;
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [env];
  const spread = [-1, 0, 1];
  spread.forEach((side, i) => {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave(ctx, o.soft ? 'padSoft' : o.bright ? 'padBright' : 'pad'));
    osc.frequency.setValueAtTime(freq, o.start);
    osc.detune.setValueAtTime(side * o.detuneCents + (i - 1) * 0.7, o.start);
    if (side < 0 && o.driftA) o.driftA.connect(osc.detune);
    if (side > 0 && o.driftB) o.driftB.connect(osc.detune);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(side * o.width, o.start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(side === 0 ? 0.42 : 0.33, o.start);
    osc.connect(g);
    g.connect(pan);
    pan.connect(env);
    osc.start(o.start);
    osc.stop(end);
    sources.push(osc);
    nodes.push(pan, g);
  });
  return makeHandle(end, sources, nodes, env, ahr(o.start, o.attack, o.level, relStart, o.release));
}

// ---------------------------------------------------------------------------
// Sustained bass — pure, round, below the pad.
// ---------------------------------------------------------------------------

export function bassNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  midi: number,
  start: number,
  attack: number,
  hold: number,
  release: number,
  level: number
): VoiceHandle {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(level, start + attack);
  env.gain.setValueAtTime(level, start + attack + hold);
  env.gain.linearRampToValueAtTime(0, start + attack + hold + release);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(220, start);
  lp.Q.setValueAtTime(0.5, start);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave(ctx, 'bass'));
  osc.frequency.setValueAtTime(midiToFreq(midi), start);
  osc.connect(lp);
  lp.connect(env);
  env.connect(dest);
  const end = start + attack + hold + release + 0.05;
  osc.start(start);
  osc.stop(end);
  return makeHandle(end, [osc], [lp, env], env, ahr(start, attack, level, start + attack + hold, release));
}

// ---------------------------------------------------------------------------
// Struck voices
// ---------------------------------------------------------------------------

export type KeyInstrument = 'rhodes' | 'felt' | 'kalimba' | 'mallet' | 'glass';

export interface StrikeOptions {
  midi: number;
  start: number;
  velocity: number; // 0..1
  pan: number;
  brightness: number; // 0..1
  /** Decay multiplier — >1 longer tails. */
  sustain?: number;
}

function strikeEnvelope(ctx: BaseAudioContext, start: number, peak: number, attack: number, tau: number) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(peak, start + attack);
  env.gain.setTargetAtTime(0, start + attack, tau);
  return { env, curve: strikeCurve(start, peak, attack, tau) };
}

/**
 * Struck / plucked note. Lower notes ring longer, higher velocity opens the filter,
 * and every instrument has a soft (never clicky) attack.
 */
export function strike(
  ctx: BaseAudioContext,
  dest: AudioNode,
  instrument: KeyInstrument,
  o: StrikeOptions
): VoiceHandle {
  const f = midiToFreq(o.midi);
  const sustain = o.sustain ?? 1;
  const registerDecay = Math.max(0.45, Math.min(1.6, 1.4 - (o.midi - 60) / 40));
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(o.pan, o.start);
  pan.connect(dest);
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [pan];

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.setValueAtTime(0.4, o.start);
  lp.connect(pan);
  nodes.push(lp);

  let env: GainNode;
  let curve: (t: number) => number;
  let tail: number;

  const osc = (type: OscillatorType | PeriodicWave, freq: number, gain: number, to: AudioNode) => {
    const s = ctx.createOscillator();
    if (typeof type === 'string') s.type = type as OscillatorType;
    else s.setPeriodicWave(type);
    s.frequency.setValueAtTime(freq, o.start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, o.start);
    s.connect(g);
    g.connect(to);
    sources.push(s);
    nodes.push(g);
    return { s, g };
  };

  switch (instrument) {
    case 'rhodes': {
      // Two-operator FM: modulation index decays quickly, leaving a round sine body.
      const tau = 1.1 * registerDecay * sustain;
      ({ env, curve } = strikeEnvelope(ctx, o.start, 0.5 * o.velocity, 0.008, tau));
      env.connect(lp);
      lp.frequency.setValueAtTime(1800 + o.brightness * 2400 * o.velocity, o.start);
      lp.frequency.setTargetAtTime(900 + o.brightness * 700, o.start + 0.05, 0.6);
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(f, o.start);
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(f, o.start);
      const index = ctx.createGain();
      const peakIndex = f * (0.9 + o.velocity * 1.4);
      index.gain.setValueAtTime(peakIndex, o.start);
      index.gain.setTargetAtTime(f * 0.12, o.start + 0.005, 0.35);
      mod.connect(index);
      index.connect(carrier.frequency);
      carrier.connect(env);
      sources.push(carrier, mod);
      nodes.push(index, env);
      // Tine — a quick, quiet bell-ish overtone that gives the Rhodes its sparkle.
      const tine = osc('sine', f * 4, 0, lp);
      tine.g.gain.setValueAtTime(0, o.start);
      tine.g.gain.linearRampToValueAtTime(0.06 * o.velocity * (0.4 + o.brightness), o.start + 0.004);
      tine.g.gain.setTargetAtTime(0, o.start + 0.004, 0.09);
      tail = tau * 7;
      break;
    }
    case 'felt': {
      const tau = 0.85 * registerDecay * sustain;
      ({ env, curve } = strikeEnvelope(ctx, o.start, 0.55 * o.velocity, 0.014, tau));
      env.connect(lp);
      lp.frequency.setValueAtTime(900 + o.brightness * 1800 * o.velocity, o.start);
      lp.frequency.setTargetAtTime(420 + o.brightness * 300, o.start + 0.02, 0.5);
      osc(wave(ctx, 'felt'), f, 1, env);
      osc('sine', f * 2.002, 0.12, env);
      nodes.push(env);
      tail = tau * 7;
      break;
    }
    case 'kalimba': {
      const tau = 0.55 * registerDecay * sustain;
      ({ env, curve } = strikeEnvelope(ctx, o.start, 0.5 * o.velocity, 0.004, tau));
      env.connect(lp);
      lp.frequency.setValueAtTime(3200 + o.brightness * 2000, o.start);
      osc('sine', f, 1, env);
      const p2 = osc('sine', f * 5.95, 0, env);
      p2.g.gain.setValueAtTime(0.18 * o.velocity, o.start);
      p2.g.gain.setTargetAtTime(0, o.start, 0.05);
      nodes.push(env);
      tail = tau * 7;
      break;
    }
    case 'mallet': {
      const tau = 0.7 * registerDecay * sustain;
      ({ env, curve } = strikeEnvelope(ctx, o.start, 0.5 * o.velocity, 0.006, tau));
      env.connect(lp);
      lp.frequency.setValueAtTime(1400 + o.brightness * 1800, o.start);
      osc('sine', f, 1, env);
      const p2 = osc('sine', f * 3.99, 0, env);
      p2.g.gain.setValueAtTime(0.14 * o.velocity, o.start);
      p2.g.gain.setTargetAtTime(0, o.start, 0.12);
      nodes.push(env);
      tail = tau * 7;
      break;
    }
    case 'glass': {
      const tau = 1.6 * sustain;
      ({ env, curve } = strikeEnvelope(ctx, o.start, 0.32 * o.velocity, 0.06, tau));
      env.connect(lp);
      lp.frequency.setValueAtTime(4500, o.start);
      osc('sine', f, 1, env);
      osc('sine', f * 2, 0.22, env);
      osc('sine', f * 3, 0.06, env);
      nodes.push(env);
      tail = tau * 7;
      break;
    }
  }

  const end = o.start + tail + 0.1;
  sources.forEach((s) => {
    s.start(o.start);
    s.stop(end);
  });
  return makeHandle(end, sources, nodes, env, curve);
}

// ---------------------------------------------------------------------------
// Bell — tuned additive partials with partial-dependent decay.
// ---------------------------------------------------------------------------

export function bell(
  ctx: BaseAudioContext,
  dest: AudioNode,
  midi: number,
  start: number,
  velocity: number,
  pan: number,
  length: number
): VoiceHandle {
  const f = midiToFreq(midi);
  const partials: Array<[number, number, number]> = [
    // ratio, gain, decay multiplier
    [1, 1, 1],
    [2.0, 0.45, 0.7],
    [3.0, 0.16, 0.45],
    [4.16, 0.12, 0.3],
    [5.43, 0.06, 0.22],
  ];
  const out = ctx.createStereoPanner();
  out.pan.setValueAtTime(pan, start);
  out.connect(dest);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(0.18 * velocity, start + 0.012);
  master.connect(out);
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [out, master];
  const end = start + length + 0.2;
  partials.forEach(([ratio, gain, decay]) => {
    if (f * ratio > 9000) return;
    const s = ctx.createOscillator();
    s.type = 'sine';
    s.frequency.setValueAtTime(f * ratio, start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.setTargetAtTime(0, start + 0.012, (length / 6) * decay);
    s.connect(g);
    g.connect(master);
    s.start(start);
    s.stop(end);
    sources.push(s);
    nodes.push(g);
  });
  return makeHandle(end, sources, nodes, master, ahr(start, 0.012, 0.18 * velocity, end, 0.01));
}

// ---------------------------------------------------------------------------
// Shimmer — a quiet high sustained partial with slow tremolo.
// ---------------------------------------------------------------------------

export function shimmerTone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  midi: number,
  start: number,
  duration: number,
  level: number,
  pan: number,
  tremoloHz: number
): VoiceHandle {
  const env = ctx.createGain();
  const attack = Math.min(6, duration * 0.35);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(level, start + attack);
  env.gain.setValueAtTime(level, start + duration - attack);
  env.gain.linearRampToValueAtTime(0, start + duration);
  const trem = ctx.createGain();
  trem.gain.setValueAtTime(0.65, start);
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(tremoloHz, start);
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(0.35, start);
  lfo.connect(lfoDepth);
  lfoDepth.connect(trem.gain);
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(pan, start);
  const s = ctx.createOscillator();
  s.type = 'sine';
  s.frequency.setValueAtTime(midiToFreq(midi), start);
  const s2 = ctx.createOscillator();
  s2.type = 'sine';
  s2.frequency.setValueAtTime(midiToFreq(midi) * 1.0015, start);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.5, start);
  s.connect(trem);
  s2.connect(g2);
  g2.connect(trem);
  trem.connect(env);
  env.connect(p);
  p.connect(dest);
  const end = start + duration + 0.05;
  [s, s2, lfo].forEach((src) => {
    src.start(start);
    src.stop(end);
  });
  return makeHandle(end, [s, s2, lfo], [env, trem, lfoDepth, p, g2], env, ahr(start, attack, level, start + duration - attack, attack));
}
