/**
 * Wellness Waves — offline signal analysis & WAV encoding
 * Pure functions (no DOM) used by tests, the Studio export and the preview script.
 */

export interface SignalReport {
  peakDb: number;
  rmsDb: number;
  rms: number;
  dcOffset: number;
  clippedSamples: number;
  /** Energy-weighted spectral centroid. */
  centroidHz: number;
  /** Share of spectral energy above 4 kHz — high values read as hiss. */
  highShare: number;
  /** Mean spectral flatness 0 (pure tones) … 1 (white noise). */
  flatness: number;
  /** Loudest minus quietest 1 s RMS window (dB) — large = jumpy. */
  loudnessRangeDb: number;
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export function analyzeChannels(left: Float32Array, right: Float32Array, sampleRate: number): SignalReport {
  const n = left.length;
  let peak = 0;
  let sumSq = 0;
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i];
    const r = right[i];
    const al = Math.abs(l);
    const ar = Math.abs(r);
    if (al > peak) peak = al;
    if (ar > peak) peak = ar;
    if (al >= 0.999 || ar >= 0.999) clipped++;
    sumSq += l * l + r * r;
    sum += l + r;
  }
  const rms = Math.sqrt(sumSq / (2 * n));

  // 1 s windowed loudness (skip the first 5 s fade-in).
  const win = sampleRate;
  const levels: number[] = [];
  for (let s = sampleRate * 5; s + win <= n; s += win) {
    let e = 0;
    for (let i = s; i < s + win; i++) e += left[i] * left[i] + right[i] * right[i];
    levels.push(10 * Math.log10(e / (2 * win) + 1e-12));
  }
  const loudnessRangeDb = levels.length ? Math.max(...levels) - Math.min(...levels) : 0;

  // Spectral stats on the mid signal, 4096-point Hann frames, hop 8192.
  const N = 4096;
  const hann = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  let wCentroid = 0;
  let wTotal = 0;
  let high = 0;
  let flatSum = 0;
  let frames = 0;
  const hiBin = Math.floor((4000 / sampleRate) * N);
  for (let s = sampleRate * 5; s + N <= n; s += N * 2) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = ((left[s + i] + right[s + i]) / 2) * hann[i];
    fft(re, im);
    let frameE = 0;
    let logSum = 0;
    let linSum = 0;
    const lo = 2;
    const hi = N / 2;
    for (let k = lo; k < hi; k++) {
      const p = re[k] * re[k] + im[k] * im[k] + 1e-20;
      const f = (k * sampleRate) / N;
      wCentroid += f * p;
      wTotal += p;
      frameE += p;
      if (k >= hiBin) high += p;
      logSum += Math.log(p);
      linSum += p;
    }
    if (frameE > 1e-12) {
      const m = hi - lo;
      flatSum += Math.exp(logSum / m) / (linSum / m);
      frames++;
    }
  }

  return {
    peakDb: 20 * Math.log10(peak + 1e-12),
    rmsDb: 20 * Math.log10(rms + 1e-12),
    rms,
    dcOffset: sum / (2 * n),
    clippedSamples: clipped,
    centroidHz: wTotal > 0 ? wCentroid / wTotal : 0,
    highShare: wTotal > 0 ? high / wTotal : 0,
    flatness: frames ? flatSum / frames : 0,
    loudnessRangeDb,
  };
}

/** 16-bit PCM stereo WAV with TPDF dither. Returns raw bytes. */
export function encodeWav16(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const n = left.length;
  const dataSize = n * 4;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataSize, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataSize, true);
  let o = 44;
  const q = (x: number) => {
    const d = (Math.random() - Math.random()) / 32768;
    const s = Math.max(-1, Math.min(1, x + d));
    return Math.round(s < 0 ? s * 32768 : s * 32767);
  };
  for (let i = 0; i < n; i++) {
    v.setInt16(o, q(left[i]), true);
    v.setInt16(o + 2, q(right[i]), true);
    o += 4;
  }
  return new Uint8Array(buf);
}

/**
 * Strongest amplitude-modulation rate (Hz) in [lo, hi] between `from` and `to`
 * seconds, found from a 200 Hz RMS envelope with a fine DFT. Used to verify that
 * a rendered program actually modulates at its planned rate.
 */
export function envelopeModulationRate(
  x: Float32Array,
  sampleRate: number,
  from: number,
  to: number,
  lo: number,
  hi: number,
  step = 0.005
): number {
  const frame = Math.round(sampleRate / 200);
  const env: number[] = [];
  for (let s = Math.round(from * sampleRate); s + frame <= Math.round(to * sampleRate); s += frame) {
    let e = 0;
    for (let i = s; i < s + frame; i++) e += x[i] * x[i];
    env.push(Math.sqrt(e / frame));
  }
  const mean = env.reduce((a, b) => a + b, 0) / Math.max(1, env.length);
  let best = lo;
  let bestP = -1;
  for (let f = lo; f <= hi; f += step) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < env.length; n++) {
      const a = (2 * Math.PI * f * n) / 200;
      re += (env[n] - mean) * Math.cos(a);
      im -= (env[n] - mean) * Math.sin(a);
    }
    const p = re * re + im * im;
    if (p > bestP) {
      bestP = p;
      best = f;
    }
  }
  return best;
}
