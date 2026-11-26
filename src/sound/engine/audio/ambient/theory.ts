/**
 * Wellness Waves — Harmonic grammar
 * Modes, diatonic chord construction, voice-leading and melodic helpers.
 * Everything is expressed in MIDI note numbers; pitch classes are 0–11.
 */

import { SeededRNG } from '../../lib/rng';

export type ModeName = 'ionian' | 'dorian' | 'lydian' | 'mixolydian' | 'aeolian';

export const MODES: Record<ModeName, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

/** Chord colours built by stacking scale thirds from a degree. */
export type ChordShape = 'triad' | 'seventh' | 'add9' | 'ninth' | 'sus2' | 'sus4' | 'fifths' | 'six9';

export interface ChordChoice {
  /** Scale degree, 0-based (0 = tonic). */
  degree: number;
  shape: ChordShape;
  weight: number;
}

export interface Chord {
  /** Pitch class of the chord root. */
  rootPc: number;
  /** Pitch classes of the chord, root first, most important colour tones next. */
  pcs: number[];
  label: string;
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function pcName(pc: number): string {
  return NOTE_NAMES[((pc % 12) + 12) % 12];
}

export function midiName(midi: number): string {
  return `${pcName(midi)}${Math.floor(midi / 12) - 1}`;
}

function scaleDegreeSemis(scale: number[], degree: number): number {
  const len = scale.length;
  const oct = Math.floor(degree / len);
  return scale[((degree % len) + len) % len] + oct * 12;
}

/**
 * Builds a diatonic chord. Colour tones that would clash (minor ninths,
 * tritone fifths) are dropped rather than voiced.
 */
export function buildChord(tonicPc: number, mode: ModeName, choice: ChordChoice): Chord {
  const scale = MODES[mode];
  const deg = choice.degree;
  const rootSemi = scaleDegreeSemis(scale, deg);
  const at = (steps: number) => scaleDegreeSemis(scale, deg + steps) - rootSemi;

  const third = at(2);
  const fifth = at(4);
  const seventh = at(6);
  const ninth = at(8) - 12;
  const fourth = at(3);
  const sixth = at(5);

  let rel: number[];
  switch (choice.shape) {
    case 'triad':
      rel = [0, third, fifth];
      break;
    case 'seventh':
      rel = [0, third, seventh, fifth];
      break;
    case 'add9':
      rel = [0, third, ninth, fifth];
      break;
    case 'ninth':
      rel = [0, third, seventh, ninth, fifth];
      break;
    case 'sus2':
      rel = [0, ninth, fifth];
      break;
    case 'sus4':
      rel = [0, fourth, fifth, ninth];
      break;
    case 'fifths':
      rel = [0, fifth, ninth];
      break;
    case 'six9':
      rel = [0, third, sixth, ninth, fifth];
      break;
  }

  // Remove clashing colour tones.
  rel = rel.filter((r, i) => {
    if (i === 0) return true;
    const iv = ((r % 12) + 12) % 12;
    if (iv === 1) return false; // minor ninth against the root
    if (iv === 6 && choice.shape !== 'triad') return false; // tritone colour
    return true;
  });
  if (fifth % 12 !== 7) {
    // Diminished fifth: substitute a perfect fifth so the colour stays consonant.
    rel = rel.map((r) => (r === fifth ? 7 : r));
  }

  const rootPc = (tonicPc + rootSemi) % 12;
  const pcs = Array.from(new Set(rel.map((r) => (rootPc + r + 120) % 12)));
  const minor = third % 12 === 3;
  const suffix: Record<ChordShape, string> = {
    triad: minor ? 'm' : '',
    seventh: minor ? 'm7' : seventh % 12 === 11 ? 'maj7' : '7',
    add9: minor ? 'm(add9)' : 'add9',
    ninth: minor ? 'm9' : seventh % 12 === 11 ? 'maj9' : '9',
    sus2: 'sus2',
    sus4: 'sus4',
    fifths: '5(add9)',
    six9: minor ? 'm6/9' : '6/9',
  };
  return { rootPc, pcs, label: `${pcName(rootPc)}${suffix[choice.shape]}` };
}

/**
 * Chooses a voicing of `count` notes inside [low, high] that keeps the chord's
 * colour, avoids muddy low clusters and moves as little as possible from the
 * previous voicing (smooth voice leading).
 */
export function voiceChord(
  chord: Chord,
  count: number,
  low: number,
  high: number,
  previous: number[] | null,
  rng: SeededRNG
): number[] {
  const candidates: number[] = [];
  for (let m = low; m <= high; m++) {
    if (chord.pcs.includes(((m % 12) + 12) % 12)) candidates.push(m);
  }
  const n = Math.min(count, candidates.length);
  const essential = chord.pcs.slice(1, Math.min(chord.pcs.length, 4)); // colour tones matter most
  const centre = (low + high) / 2;
  const prevSorted = previous ? [...previous].sort((a, b) => a - b) : null;

  let best: number[] = candidates.slice(0, n);
  let bestScore = Infinity;
  const pick: number[] = [];

  const score = (v: number[]): number => {
    let s = 0;
    const pcsPresent = new Set(v.map((m) => m % 12));
    essential.forEach((pc) => {
      if (!pcsPresent.has(pc)) s += 9;
    });
    s += (v.length - pcsPresent.size) * 1.5; // doublings
    for (let i = 1; i < v.length; i++) {
      const iv = v[i] - v[i - 1];
      if (iv < 2) s += 8; // semitone clusters
      if (v[i - 1] < 55 && iv < 5) s += 6; // muddy low thirds
      if (iv > 9) s += (iv - 9) * 0.8; // holes in the voicing
    }
    const span = v[v.length - 1] - v[0];
    if (span < 10) s += (10 - span) * 0.8;
    if (span > 26) s += (span - 26) * 0.6;
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    s += Math.abs(mean - centre) * 0.25;
    if (prevSorted && prevSorted.length === v.length) {
      let move = 0;
      for (let i = 0; i < v.length; i++) move += Math.abs(v[i] - prevSorted[i]);
      s += move * 0.9;
    }
    return s + rng.next() * 0.5;
  };

  const recurse = (start: number) => {
    if (pick.length === n) {
      const sc = score(pick);
      if (sc < bestScore) {
        bestScore = sc;
        best = [...pick];
      }
      return;
    }
    for (let i = start; i <= candidates.length - (n - pick.length); i++) {
      pick.push(candidates[i]);
      recurse(i + 1);
      pick.pop();
    }
  };
  recurse(0);
  return best;
}

/** All scale pitches within [low, high], minus any `avoid` scale offsets (e.g. [5, 11] → pentatonic-ish). */
export function scalePitches(
  tonicPc: number,
  mode: ModeName,
  low: number,
  high: number,
  avoid: number[] = []
): number[] {
  const pcs = new Set(MODES[mode].filter((s) => !avoid.includes(s)).map((s) => (tonicPc + s) % 12));
  const out: number[] = [];
  for (let m = low; m <= high; m++) if (pcs.has(((m % 12) + 12) % 12)) out.push(m);
  return out;
}

/** Nearest pitch to `target` whose pitch class is in `pcs`. */
export function nearestInSet(target: number, pcs: number[]): number {
  let best = target;
  let dist = Infinity;
  for (let d = 0; d <= 6; d++) {
    for (const cand of [target - d, target + d]) {
      if (pcs.includes(((cand % 12) + 12) % 12) && Math.abs(cand - target) < dist) {
        best = cand;
        dist = Math.abs(cand - target);
      }
    }
    if (dist < Infinity) break;
  }
  return best;
}

/** Weighted choice that avoids repeating `avoid` when alternatives exist. */
export function weightedChoice<T extends { weight: number }>(items: T[], rng: SeededRNG, avoid?: T): T {
  const pool = items.length > 1 && avoid ? items.filter((i) => i !== avoid) : items;
  const total = pool.reduce((a, b) => a + b.weight, 0);
  let r = rng.next() * total;
  for (const it of pool) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return pool[pool.length - 1];
}
