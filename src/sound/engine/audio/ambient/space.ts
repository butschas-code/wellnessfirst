/**
 * Wellness Waves — Space & texture
 * A lush synthetic hall (frequency-dependent decay), a damped stereo ping-pong
 * delay, and optional environmental beds. Textures are shaped, never raw noise.
 */

import { SeededRNG } from '../../lib/rng';
import { BufferGenerators } from '../bufferGenerators';

/**
 * Stereo hall impulse: decorrelated noise with an exponential envelope whose
 * high frequencies decay faster than the lows (like a real room), plus a few
 * soft early reflections and pre-delay.
 */
export function createHallImpulse(
  ctx: BaseAudioContext,
  seconds: number,
  darkness = 0.5,
  preDelay = 0.03
): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * (seconds + preDelay));
  const buffer = ctx.createBuffer(2, length, sr);
  const pre = Math.floor(sr * preDelay);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const rng = new SeededRNG(9001 + ch * 7919);
    let lp = 0;
    let energy = 0;
    for (let i = pre; i < length; i++) {
      const t = (i - pre) / sr;
      const progress = t / seconds;
      // Decay to -60 dB at `seconds`.
      const amp = Math.exp((-6.9 * t) / seconds);
      // One-pole lowpass whose cutoff closes as the tail ages.
      const cutoff = 9000 * Math.pow(1 - darkness * 0.85, progress * 3) + 350;
      const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sr);
      lp += a * (rng.next() * 2 - 1 - lp);
      // Smooth 40 ms onset so the hall blooms instead of clicking.
      const onset = Math.min(1, t / 0.04);
      const v = lp * amp * onset;
      data[i] = v;
      energy += v * v;
    }
    // Early reflections.
    const taps = [0.011, 0.019, 0.027, 0.041, 0.053];
    taps.forEach((tap, k) => {
      const idx = pre + Math.floor((tap + ch * 0.0031) * sr);
      if (idx < length) data[idx] += (0.35 / (k + 1)) * (k % 2 === 0 ? 1 : -1);
    });
    const norm = 1 / Math.sqrt(energy || 1);
    for (let i = 0; i < length; i++) data[i] *= norm * 0.9;
  }
  return buffer;
}

export interface SpaceUnit {
  reverbIn: GainNode;
  delayIn: GainNode;
  reverbOut: GainNode;
  delayOut: GainNode;
  nodes: AudioNode[];
  setDelayTime: (seconds: number, at: number) => void;
}

export function createSpace(
  ctx: BaseAudioContext,
  reverbSeconds: number,
  darkness: number,
  delaySeconds: number,
  feedback: number
): SpaceUnit {
  const t = ctx.currentTime;
  const reverbIn = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.normalize = false;
  convolver.buffer = createHallImpulse(ctx, reverbSeconds, darkness);
  // Keep low mud out of the hall.
  const preHp = ctx.createBiquadFilter();
  preHp.type = 'highpass';
  preHp.frequency.setValueAtTime(160, t);
  const reverbOut = ctx.createGain();
  reverbOut.gain.setValueAtTime(1, t);
  reverbIn.connect(preHp);
  preHp.connect(convolver);
  convolver.connect(reverbOut);

  // Ping-pong delay with a darkening feedback path (tape-like repeats).
  const delayIn = ctx.createGain();
  const dl = ctx.createDelay(4);
  const dr = ctx.createDelay(4);
  dl.delayTime.setValueAtTime(delaySeconds, t);
  dr.delayTime.setValueAtTime(delaySeconds, t);
  const fbL = ctx.createGain();
  const fbR = ctx.createGain();
  const fb = Math.min(0.5, Math.max(0, feedback));
  fbL.gain.setValueAtTime(fb, t);
  fbR.gain.setValueAtTime(fb, t);
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.setValueAtTime(2600, t);
  const thin = ctx.createBiquadFilter();
  thin.type = 'highpass';
  thin.frequency.setValueAtTime(260, t);
  const merger = ctx.createChannelMerger(2);
  const delayOut = ctx.createGain();
  delayIn.connect(thin);
  thin.connect(damp);
  damp.connect(dl);
  dl.connect(fbL);
  fbL.connect(dr);
  dr.connect(fbR);
  fbR.connect(dl);
  dl.connect(merger, 0, 0);
  dr.connect(merger, 0, 1);
  merger.connect(delayOut);
  // Echoes also bloom into the hall.
  delayOut.connect(reverbIn);

  return {
    reverbIn,
    delayIn,
    reverbOut,
    delayOut,
    nodes: [reverbIn, convolver, preHp, reverbOut, delayIn, dl, dr, fbL, fbR, damp, thin, merger, delayOut],
    setDelayTime: (seconds: number, at: number) => {
      dl.delayTime.setTargetAtTime(seconds, at, 0.5);
      dr.delayTime.setTargetAtTime(seconds, at, 0.5);
    },
  };
}

export type TextureKind = 'none' | 'air' | 'ocean' | 'rain' | 'wind' | 'hearth' | 'mask';

export interface TextureUnit {
  output: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
}

/**
 * Environmental bed. Every kind is band-limited and slowly modulated so it reads
 * as place, not hiss. Returned output is unity-ish; the composer sets level.
 */
export function createTexture(ctx: BaseAudioContext, kind: TextureKind, start: number): TextureUnit | null {
  if (kind === 'none') return null;
  const output = ctx.createGain();
  output.gain.setValueAtTime(1, start);
  const nodes: AudioNode[] = [output];
  const sources: AudioScheduledSourceNode[] = [];
  const src = ctx.createBufferSource();
  src.buffer =
    kind === 'ocean' || kind === 'wind' || kind === 'hearth'
      ? BufferGenerators.createBrownNoiseBuffer(ctx, 12)
      : BufferGenerators.createPinkNoiseBuffer(ctx, 12);
  src.loop = true;
  sources.push(src);

  const lfo = (hz: number, depth: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(hz, start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(depth, start);
    o.connect(g);
    g.connect(target);
    o.start(start);
    sources.push(o);
    nodes.push(g);
  };

  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  nodes.push(f1, f2, amp);
  src.connect(f1);
  f1.connect(f2);
  f2.connect(amp);
  amp.connect(output);

  switch (kind) {
    case 'ocean':
      // Slow swells: low-passed brown noise with a ~11 s wave cycle.
      f1.type = 'lowpass';
      f1.frequency.setValueAtTime(420, start);
      f2.type = 'highpass';
      f2.frequency.setValueAtTime(60, start);
      amp.gain.setValueAtTime(0.55, start);
      lfo(0.09, 0.4, amp.gain);
      lfo(0.09, 260, f1.frequency);
      break;
    case 'wind':
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(520, start);
      f1.Q.setValueAtTime(1.6, start);
      f2.type = 'lowpass';
      f2.frequency.setValueAtTime(1400, start);
      amp.gain.setValueAtTime(0.7, start);
      lfo(0.05, 260, f1.frequency);
      lfo(0.037, 0.25, amp.gain);
      break;
    case 'rain':
      // Soft distant rain: band-limited, rolled off well below "hiss" territory.
      f1.type = 'highpass';
      f1.frequency.setValueAtTime(600, start);
      f2.type = 'lowpass';
      f2.frequency.setValueAtTime(3800, start);
      amp.gain.setValueAtTime(0.35, start);
      lfo(0.06, 0.08, amp.gain);
      break;
    case 'hearth':
      f1.type = 'lowpass';
      f1.frequency.setValueAtTime(700, start);
      f2.type = 'highpass';
      f2.frequency.setValueAtTime(90, start);
      amp.gain.setValueAtTime(0.5, start);
      lfo(0.13, 0.12, amp.gain);
      break;
    case 'mask':
      // Steady masking bed: pink noise shaped to the speech band (≈120 Hz – 2.2 kHz),
      // rolled off above so it reads as soft air, not hiss. No modulation.
      f1.type = 'highpass';
      f1.frequency.setValueAtTime(120, start);
      f2.type = 'lowpass';
      f2.frequency.setValueAtTime(2200, start);
      f2.Q.setValueAtTime(0.5, start);
      amp.gain.setValueAtTime(0.9, start);
      break;
    case 'air':
    default:
      f1.type = 'lowpass';
      f1.frequency.setValueAtTime(1500, start);
      f2.type = 'highpass';
      f2.frequency.setValueAtTime(180, start);
      amp.gain.setValueAtTime(0.3, start);
      lfo(0.04, 0.1, amp.gain);
      break;
  }
  src.start(start);
  return { output, sources, nodes };
}
