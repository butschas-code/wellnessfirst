/**
 * Wellness Waves — Sound worlds
 * The authored musical identity of every soundscape: key, mode, chord palette,
 * tempo, instrumentation, space and how it evolves. The composer turns a world
 * plus a seed into an endless, never-repeating but recognisable piece.
 */

import type { Intent, SoundscapeRecipe } from '../../types/index';
import type { KeyInstrument } from './instruments';
import type { TextureKind } from './space';
import type { ChordChoice, ModeName } from './theory';

export interface SoundWorld {
  key: { tonicPc: number; mode: ModeName; melodyAvoid?: number[] };
  bpm: number;
  barsPerChord: [number, number];
  palette: ChordChoice[];
  /** Extra probability of returning to the home chord. */
  homePull: number;
  /** Minutes between gentle key changes (a fourth or fifth away); 0 = never. */
  modulateEveryMin: number;
  pad: {
    voices: number;
    low: number;
    high: number;
    level: number;
    cutoff: number;
    detune: number;
    soft: boolean;
    attack: number;
    release: number;
  };
  bass: { level: number; low: number; pedal: boolean };
  keys: { level: number; instrument: KeyInstrument; phrasesPerMin: number; low: number; high: number };
  pulse: { level: number; instrument: KeyInstrument; pattern: number[]; sidechain: number };
  bells: { level: number; perMin: number; low: number; high: number };
  shimmer: { level: number };
  texture: { kind: TextureKind; level: number };
  space: {
    reverbSeconds: number;
    darkness: number;
    reverbWet: number;
    delayBeats: number;
    feedback: number;
    delayWet: number;
  };
  /** Sleep worlds slowly close their filters over this many minutes. */
  darkenMinutes: number;
  intensity: [number, number];
}

const NO_PULSE = { level: 0, instrument: 'mallet' as KeyInstrument, pattern: [], sidechain: 0 };

// 16-step patterns (velocities, 0 = rest).
const PULSE_STEADY = [0.9, 0, 0.45, 0, 0.7, 0, 0.45, 0, 0.85, 0, 0.45, 0, 0.7, 0, 0.5, 0.3];
const PULSE_SPARSE = [0.8, 0, 0, 0, 0.5, 0, 0, 0, 0.7, 0, 0, 0.35, 0, 0, 0.5, 0];
const PULSE_DRIVE = [1, 0, 0.5, 0.3, 0.8, 0, 0.55, 0.3, 0.95, 0, 0.5, 0.35, 0.8, 0.25, 0.6, 0.45];
const PULSE_ROLLING = [0.8, 0.3, 0.5, 0.3, 0.7, 0.3, 0.5, 0.35, 0.8, 0.3, 0.5, 0.3, 0.65, 0.35, 0.5, 0.4];

export const SOUND_WORLDS: Record<string, SoundWorld> = {
  // ---------------------------------------------------------------- FOCUS --
  'quiet-momentum': {
    key: { tonicPc: 5, mode: 'ionian', melodyAvoid: [5, 11] }, // F major, pentatonic melodies
    bpm: 72,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 5, shape: 'seventh', weight: 2 },
      { degree: 3, shape: 'ninth', weight: 2 },
      { degree: 1, shape: 'seventh', weight: 1.2 },
      { degree: 4, shape: 'sus4', weight: 0.8 },
    ],
    homePull: 0.3,
    modulateEveryMin: 9,
    pad: { voices: 5, low: 53, high: 76, level: 0.05, cutoff: 1500, detune: 7, soft: false, attack: 5, release: 7 },
    bass: { level: 0.16, low: 36, pedal: false },
    keys: { level: 0.5, instrument: 'rhodes', phrasesPerMin: 1.3, low: 62, high: 84 },
    pulse: { level: 0.32, instrument: 'mallet', pattern: PULSE_STEADY, sidechain: 0.14 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.012 },
    texture: { kind: 'none', level: 0 },
    space: { reverbSeconds: 5.5, darkness: 0.45, reverbWet: 0.4, delayBeats: 0.75, feedback: 0.32, delayWet: 0.22 },
    darkenMinutes: 0,
    intensity: [0.35, 0.8],
  },
  'deep-work': {
    key: { tonicPc: 9, mode: 'dorian' }, // A dorian
    bpm: 64,
    barsPerChord: [4, 8],
    palette: [
      { degree: 0, shape: 'ninth', weight: 3 },
      { degree: 3, shape: 'ninth', weight: 1.5 },
      { degree: 6, shape: 'add9', weight: 1.5 },
      { degree: 2, shape: 'seventh', weight: 1.5 },
    ],
    homePull: 0.35,
    modulateEveryMin: 12,
    pad: { voices: 5, low: 52, high: 74, level: 0.05, cutoff: 1200, detune: 6, soft: false, attack: 6, release: 8 },
    bass: { level: 0.17, low: 36, pedal: false },
    keys: { level: 0.45, instrument: 'felt', phrasesPerMin: 0.8, low: 60, high: 81 },
    pulse: { level: 0.24, instrument: 'kalimba', pattern: PULSE_SPARSE, sidechain: 0.08 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.008 },
    texture: { kind: 'air', level: 0.03 },
    space: { reverbSeconds: 5, darkness: 0.55, reverbWet: 0.38, delayBeats: 1.5, feedback: 0.3, delayWet: 0.2 },
    darkenMinutes: 0,
    intensity: [0.3, 0.7],
  },
  'flow-state': {
    key: { tonicPc: 0, mode: 'lydian', melodyAvoid: [11] }, // C lydian
    bpm: 80,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'seventh', weight: 3 },
      { degree: 1, shape: 'add9', weight: 2 },
      { degree: 5, shape: 'seventh', weight: 1.5 },
      { degree: 2, shape: 'seventh', weight: 1.2 },
      { degree: 4, shape: 'sus2', weight: 1 },
    ],
    homePull: 0.25,
    modulateEveryMin: 8,
    pad: { voices: 4, low: 55, high: 77, level: 0.05, cutoff: 1900, detune: 8, soft: false, attack: 4, release: 6 },
    bass: { level: 0.15, low: 36, pedal: false },
    keys: { level: 0.4, instrument: 'glass', phrasesPerMin: 1.1, low: 67, high: 88 },
    pulse: { level: 0.3, instrument: 'kalimba', pattern: PULSE_ROLLING, sidechain: 0.12 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.014 },
    texture: { kind: 'rain', level: 0.03 },
    space: { reverbSeconds: 5, darkness: 0.4, reverbWet: 0.36, delayBeats: 0.75, feedback: 0.35, delayWet: 0.24 },
    darkenMinutes: 0,
    intensity: [0.4, 0.85],
  },

  // --------------------------------------------------------------- UNWIND --
  'soft-landing': {
    key: { tonicPc: 3, mode: 'ionian', melodyAvoid: [5, 11] }, // E♭ major
    bpm: 56,
    barsPerChord: [3, 5],
    palette: [
      { degree: 0, shape: 'ninth', weight: 3 },
      { degree: 3, shape: 'ninth', weight: 2.2 },
      { degree: 5, shape: 'ninth', weight: 2 },
      { degree: 1, shape: 'seventh', weight: 1.2 },
      { degree: 2, shape: 'seventh', weight: 0.8 },
    ],
    homePull: 0.25,
    modulateEveryMin: 10,
    pad: { voices: 5, low: 51, high: 75, level: 0.055, cutoff: 1250, detune: 9, soft: false, attack: 7, release: 9 },
    bass: { level: 0.18, low: 34, pedal: false },
    keys: { level: 0.5, instrument: 'rhodes', phrasesPerMin: 0.9, low: 58, high: 82 },
    pulse: NO_PULSE,
    bells: { level: 0.25, perMin: 0.35, low: 75, high: 87 },
    shimmer: { level: 0.014 },
    texture: { kind: 'none', level: 0 },
    space: { reverbSeconds: 7, darkness: 0.5, reverbWet: 0.48, delayBeats: 1.5, feedback: 0.34, delayWet: 0.24 },
    darkenMinutes: 0,
    intensity: [0.3, 0.75],
  },
  'dusk-horizon': {
    key: { tonicPc: 7, mode: 'dorian' }, // G dorian
    bpm: 54,
    barsPerChord: [3, 5],
    palette: [
      { degree: 0, shape: 'ninth', weight: 3 },
      { degree: 6, shape: 'add9', weight: 2 },
      { degree: 2, shape: 'ninth', weight: 2 },
      { degree: 3, shape: 'seventh', weight: 1.4 },
    ],
    homePull: 0.3,
    modulateEveryMin: 11,
    pad: { voices: 5, low: 50, high: 74, level: 0.055, cutoff: 1100, detune: 10, soft: false, attack: 8, release: 10 },
    bass: { level: 0.18, low: 34, pedal: false },
    keys: { level: 0.46, instrument: 'rhodes', phrasesPerMin: 0.7, low: 58, high: 79 },
    pulse: NO_PULSE,
    bells: { level: 0.15, perMin: 0.2, low: 74, high: 86 },
    shimmer: { level: 0.01 },
    texture: { kind: 'air', level: 0.035 },
    space: { reverbSeconds: 7.5, darkness: 0.55, reverbWet: 0.5, delayBeats: 1.5, feedback: 0.36, delayWet: 0.22 },
    darkenMinutes: 0,
    intensity: [0.3, 0.7],
  },
  'warm-hearth': {
    key: { tonicPc: 2, mode: 'ionian', melodyAvoid: [5, 11] }, // D major
    bpm: 58,
    barsPerChord: [3, 5],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 3, shape: 'seventh', weight: 2 },
      { degree: 5, shape: 'seventh', weight: 2 },
      { degree: 4, shape: 'sus4', weight: 1 },
      { degree: 0, shape: 'six9', weight: 1 },
    ],
    homePull: 0.25,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 50, high: 72, level: 0.05, cutoff: 1000, detune: 8, soft: true, attack: 7, release: 9 },
    bass: { level: 0.17, low: 36, pedal: false },
    keys: { level: 0.55, instrument: 'felt', phrasesPerMin: 1.0, low: 57, high: 79 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.006 },
    texture: { kind: 'ocean', level: 0.07 },
    space: { reverbSeconds: 5, darkness: 0.65, reverbWet: 0.42, delayBeats: 1.5, feedback: 0.28, delayWet: 0.16 },
    darkenMinutes: 0,
    intensity: [0.3, 0.65],
  },

  // ---------------------------------------------------------------- SLEEP --
  'night-current': {
    key: { tonicPc: 9, mode: 'aeolian', melodyAvoid: [8] }, // A minor, dark and still
    bpm: 44,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'add9', weight: 4 },
      { degree: 5, shape: 'seventh', weight: 2 },
      { degree: 3, shape: 'ninth', weight: 1.4 },
      { degree: 2, shape: 'add9', weight: 1 },
    ],
    homePull: 0.4,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 45, high: 69, level: 0.06, cutoff: 760, detune: 6, soft: true, attack: 10, release: 12 },
    bass: { level: 0.2, low: 33, pedal: true },
    keys: { level: 0.32, instrument: 'felt', phrasesPerMin: 0.3, low: 55, high: 74 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0 },
    texture: { kind: 'none', level: 0 },
    space: { reverbSeconds: 8, darkness: 0.75, reverbWet: 0.5, delayBeats: 2, feedback: 0.3, delayWet: 0.12 },
    darkenMinutes: 35,
    intensity: [0.15, 0.45],
  },
  'midnight-drift': {
    key: { tonicPc: 1, mode: 'ionian', melodyAvoid: [5, 11] }, // D♭ major
    bpm: 42,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 3, shape: 'seventh', weight: 2 },
      { degree: 5, shape: 'seventh', weight: 1.5 },
      { degree: 0, shape: 'six9', weight: 1 },
    ],
    homePull: 0.35,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 46, high: 70, level: 0.058, cutoff: 820, detune: 7, soft: true, attack: 10, release: 12 },
    bass: { level: 0.18, low: 32, pedal: false },
    keys: { level: 0.3, instrument: 'glass', phrasesPerMin: 0.35, low: 63, high: 80 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.004 },
    texture: { kind: 'ocean', level: 0.06 },
    space: { reverbSeconds: 8, darkness: 0.7, reverbWet: 0.52, delayBeats: 2, feedback: 0.32, delayWet: 0.14 },
    darkenMinutes: 35,
    intensity: [0.15, 0.45],
  },
  'lunar-nocturne': {
    key: { tonicPc: 5, mode: 'aeolian', melodyAvoid: [8] }, // F minor
    bpm: 46,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'ninth', weight: 3 },
      { degree: 5, shape: 'seventh', weight: 2 },
      { degree: 6, shape: 'sus2', weight: 1.5 },
      { degree: 3, shape: 'seventh', weight: 1.2 },
    ],
    homePull: 0.35,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 46, high: 70, level: 0.058, cutoff: 850, detune: 7, soft: true, attack: 9, release: 11 },
    bass: { level: 0.18, low: 29, pedal: false },
    keys: { level: 0.35, instrument: 'felt', phrasesPerMin: 0.45, low: 56, high: 77 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.004 },
    texture: { kind: 'rain', level: 0.025 },
    space: { reverbSeconds: 7.5, darkness: 0.7, reverbWet: 0.5, delayBeats: 2, feedback: 0.3, delayWet: 0.14 },
    darkenMinutes: 35,
    intensity: [0.15, 0.5],
  },

  // ------------------------------------------------------------ STILLNESS --
  'open-space': {
    key: { tonicPc: 2, mode: 'mixolydian' }, // D mixolydian — open fifths
    bpm: 50,
    barsPerChord: [5, 8],
    palette: [
      { degree: 0, shape: 'fifths', weight: 4 },
      { degree: 6, shape: 'fifths', weight: 1.5 },
      { degree: 3, shape: 'sus2', weight: 1.5 },
      { degree: 0, shape: 'sus4', weight: 1.2 },
      { degree: 4, shape: 'sus4', weight: 0.8 },
    ],
    homePull: 0.4,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 50, high: 74, level: 0.058, cutoff: 1300, detune: 5, soft: false, attack: 9, release: 11 },
    bass: { level: 0.2, low: 38, pedal: true },
    keys: { level: 0.32, instrument: 'glass', phrasesPerMin: 0.35, low: 69, high: 86 },
    pulse: NO_PULSE,
    bells: { level: 0.4, perMin: 0.7, low: 62, high: 81 },
    shimmer: { level: 0.016 },
    texture: { kind: 'none', level: 0 },
    space: { reverbSeconds: 9, darkness: 0.5, reverbWet: 0.55, delayBeats: 2, feedback: 0.35, delayWet: 0.16 },
    darkenMinutes: 0,
    intensity: [0.25, 0.6],
  },
  'sacred-void': {
    key: { tonicPc: 0, mode: 'aeolian', melodyAvoid: [8] }, // C minor, sparse
    bpm: 46,
    barsPerChord: [6, 9],
    palette: [
      { degree: 0, shape: 'fifths', weight: 4 },
      { degree: 5, shape: 'sus2', weight: 1.5 },
      { degree: 3, shape: 'fifths', weight: 1.4 },
      { degree: 6, shape: 'sus2', weight: 1 },
    ],
    homePull: 0.45,
    modulateEveryMin: 0,
    pad: { voices: 4, low: 48, high: 72, level: 0.058, cutoff: 1000, detune: 5, soft: true, attack: 11, release: 13 },
    bass: { level: 0.2, low: 36, pedal: true },
    keys: { level: 0.28, instrument: 'glass', phrasesPerMin: 0.25, low: 67, high: 84 },
    pulse: NO_PULSE,
    bells: { level: 0.35, perMin: 0.45, low: 60, high: 79 },
    shimmer: { level: 0.012 },
    texture: { kind: 'wind', level: 0.04 },
    space: { reverbSeconds: 10, darkness: 0.6, reverbWet: 0.58, delayBeats: 2, feedback: 0.32, delayWet: 0.12 },
    darkenMinutes: 0,
    intensity: [0.2, 0.55],
  },
  'tibetan-resonance': {
    key: { tonicPc: 7, mode: 'mixolydian' }, // G — resonant, bowl-like bells in key
    bpm: 48,
    barsPerChord: [5, 8],
    palette: [
      { degree: 0, shape: 'fifths', weight: 4 },
      { degree: 3, shape: 'sus2', weight: 1.5 },
      { degree: 6, shape: 'fifths', weight: 1.2 },
    ],
    homePull: 0.45,
    modulateEveryMin: 0,
    pad: { voices: 3, low: 50, high: 71, level: 0.06, cutoff: 900, detune: 4, soft: true, attack: 10, release: 12 },
    bass: { level: 0.22, low: 31, pedal: true },
    keys: { level: 0, instrument: 'glass', phrasesPerMin: 0, low: 67, high: 84 },
    pulse: NO_PULSE,
    bells: { level: 0.55, perMin: 1.1, low: 55, high: 74 },
    shimmer: { level: 0.01 },
    texture: { kind: 'none', level: 0 },
    space: { reverbSeconds: 9, darkness: 0.55, reverbWet: 0.55, delayBeats: 2, feedback: 0.3, delayWet: 0.1 },
    darkenMinutes: 0,
    intensity: [0.25, 0.6],
  },
  // --------------------------------------------------------------- ENERGY --
  // Brighter, faster, rhythmic: a lift for mornings, workouts and getting going.
  'first-light': {
    key: { tonicPc: 2, mode: 'mixolydian', melodyAvoid: [5] }, // D mixolydian
    bpm: 100,
    barsPerChord: [2, 4],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 6, shape: 'triad', weight: 2 },
      { degree: 3, shape: 'add9', weight: 2 },
      { degree: 4, shape: 'sus4', weight: 1.2 },
    ],
    homePull: 0.3,
    modulateEveryMin: 6,
    pad: { voices: 4, low: 55, high: 79, level: 0.045, cutoff: 2300, detune: 8, soft: false, attack: 2.5, release: 4 },
    bass: { level: 0.2, low: 36, pedal: false },
    keys: { level: 0.42, instrument: 'rhodes', phrasesPerMin: 1.6, low: 64, high: 86 },
    pulse: { level: 0.44, instrument: 'mallet', pattern: PULSE_DRIVE, sidechain: 0.2 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.016 },
    texture: { kind: 'air', level: 0.025 },
    space: { reverbSeconds: 3.5, darkness: 0.3, reverbWet: 0.3, delayBeats: 0.75, feedback: 0.3, delayWet: 0.22 },
    darkenMinutes: 0,
    intensity: [0.55, 1],
  },
  tailwind: {
    key: { tonicPc: 7, mode: 'ionian', melodyAvoid: [5, 11] }, // G major
    bpm: 108,
    barsPerChord: [2, 4],
    palette: [
      { degree: 0, shape: 'six9', weight: 3 },
      { degree: 4, shape: 'sus2', weight: 2 },
      { degree: 5, shape: 'seventh', weight: 2 },
      { degree: 3, shape: 'add9', weight: 1.5 },
    ],
    homePull: 0.25,
    modulateEveryMin: 5,
    pad: { voices: 4, low: 57, high: 81, level: 0.045, cutoff: 2600, detune: 9, soft: false, attack: 2, release: 3.5 },
    bass: { level: 0.2, low: 38, pedal: false },
    keys: { level: 0.38, instrument: 'glass', phrasesPerMin: 1.8, low: 67, high: 89 },
    pulse: { level: 0.42, instrument: 'kalimba', pattern: PULSE_ROLLING, sidechain: 0.18 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.018 },
    texture: { kind: 'wind', level: 0.03 },
    space: { reverbSeconds: 3, darkness: 0.25, reverbWet: 0.28, delayBeats: 0.5, feedback: 0.28, delayWet: 0.2 },
    darkenMinutes: 0,
    intensity: [0.6, 1],
  },
  'high-tide': {
    key: { tonicPc: 4, mode: 'dorian' }, // E dorian
    bpm: 96,
    barsPerChord: [2, 4],
    palette: [
      { degree: 0, shape: 'ninth', weight: 3 },
      { degree: 3, shape: 'add9', weight: 2 },
      { degree: 6, shape: 'add9', weight: 1.5 },
      { degree: 1, shape: 'seventh', weight: 1.2 },
    ],
    homePull: 0.3,
    modulateEveryMin: 7,
    pad: { voices: 5, low: 52, high: 76, level: 0.05, cutoff: 2000, detune: 7, soft: false, attack: 3, release: 4.5 },
    bass: { level: 0.22, low: 35, pedal: false },
    keys: { level: 0.4, instrument: 'felt', phrasesPerMin: 1.4, low: 62, high: 84 },
    pulse: { level: 0.46, instrument: 'mallet', pattern: PULSE_STEADY, sidechain: 0.22 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.012 },
    texture: { kind: 'ocean', level: 0.03 },
    space: { reverbSeconds: 4, darkness: 0.35, reverbWet: 0.32, delayBeats: 0.75, feedback: 0.32, delayWet: 0.2 },
    darkenMinutes: 0,
    intensity: [0.55, 0.95],
  },

  // -------------------------------------------------------------- BALANCE --
  // Warm, consonant and even: nothing sharp, nothing sad, a steady middle.
  'even-keel': {
    key: { tonicPc: 8, mode: 'ionian', melodyAvoid: [5, 11] }, // A♭ major
    bpm: 66,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 3, shape: 'six9', weight: 2 },
      { degree: 5, shape: 'seventh', weight: 1.5 },
      { degree: 4, shape: 'sus2', weight: 1.2 },
    ],
    homePull: 0.4,
    modulateEveryMin: 10,
    pad: { voices: 5, low: 51, high: 74, level: 0.05, cutoff: 1300, detune: 6, soft: false, attack: 5, release: 7 },
    bass: { level: 0.16, low: 36, pedal: false },
    keys: { level: 0.42, instrument: 'felt', phrasesPerMin: 0.9, low: 60, high: 81 },
    pulse: { level: 0.16, instrument: 'kalimba', pattern: PULSE_SPARSE, sidechain: 0.05 },
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.01 },
    texture: { kind: 'hearth', level: 0.03 },
    space: { reverbSeconds: 6, darkness: 0.5, reverbWet: 0.42, delayBeats: 1.5, feedback: 0.3, delayWet: 0.16 },
    darkenMinutes: 0,
    intensity: [0.3, 0.65],
  },
  'kind-weather': {
    key: { tonicPc: 10, mode: 'lydian', melodyAvoid: [11] }, // B♭ lydian
    bpm: 70,
    barsPerChord: [4, 6],
    palette: [
      { degree: 0, shape: 'seventh', weight: 3 },
      { degree: 1, shape: 'add9', weight: 2 },
      { degree: 4, shape: 'sus2', weight: 1.5 },
      { degree: 5, shape: 'seventh', weight: 1.2 },
    ],
    homePull: 0.35,
    modulateEveryMin: 11,
    pad: { voices: 5, low: 53, high: 76, level: 0.05, cutoff: 1500, detune: 7, soft: false, attack: 5, release: 7 },
    bass: { level: 0.15, low: 34, pedal: false },
    keys: { level: 0.45, instrument: 'rhodes', phrasesPerMin: 1, low: 62, high: 84 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.012 },
    texture: { kind: 'rain', level: 0.035 },
    space: { reverbSeconds: 6.5, darkness: 0.45, reverbWet: 0.45, delayBeats: 1, feedback: 0.3, delayWet: 0.18 },
    darkenMinutes: 0,
    intensity: [0.3, 0.65],
  },
  'common-ground': {
    key: { tonicPc: 2, mode: 'ionian', melodyAvoid: [5, 11] }, // D major
    bpm: 62,
    barsPerChord: [4, 8],
    palette: [
      { degree: 0, shape: 'six9', weight: 3 },
      { degree: 3, shape: 'add9', weight: 2 },
      { degree: 5, shape: 'add9', weight: 1.5 },
      { degree: 4, shape: 'sus4', weight: 1 },
    ],
    homePull: 0.4,
    modulateEveryMin: 0,
    pad: { voices: 5, low: 50, high: 74, level: 0.05, cutoff: 1250, detune: 6, soft: true, attack: 6, release: 8 },
    bass: { level: 0.15, low: 38, pedal: true },
    keys: { level: 0.35, instrument: 'glass', phrasesPerMin: 0.7, low: 66, high: 86 },
    pulse: NO_PULSE,
    bells: { level: 0.35, perMin: 0.8, low: 67, high: 84 },
    shimmer: { level: 0.012 },
    texture: { kind: 'wind', level: 0.025 },
    space: { reverbSeconds: 7, darkness: 0.5, reverbWet: 0.48, delayBeats: 2, feedback: 0.28, delayWet: 0.12 },
    darkenMinutes: 0,
    intensity: [0.25, 0.6],
  },

  // -------------------------------------------------------------- RECOVER --
  // Slow, low and warm: rest after effort, long and unhurried.
  'slow-tide': {
    key: { tonicPc: 0, mode: 'ionian', melodyAvoid: [5, 11] }, // C major, low
    bpm: 56,
    barsPerChord: [5, 8],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 5, shape: 'seventh', weight: 1.5 },
      { degree: 3, shape: 'six9', weight: 1.5 },
      { degree: 4, shape: 'sus2', weight: 1 },
    ],
    homePull: 0.45,
    modulateEveryMin: 0,
    pad: { voices: 5, low: 48, high: 70, level: 0.055, cutoff: 1000, detune: 6, soft: true, attack: 7, release: 9 },
    bass: { level: 0.18, low: 33, pedal: true },
    keys: { level: 0.32, instrument: 'felt', phrasesPerMin: 0.5, low: 57, high: 77 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.006 },
    texture: { kind: 'ocean', level: 0.045 },
    space: { reverbSeconds: 8, darkness: 0.6, reverbWet: 0.5, delayBeats: 2, feedback: 0.28, delayWet: 0.1 },
    darkenMinutes: 40,
    intensity: [0.2, 0.5],
  },
  'warm-stone': {
    key: { tonicPc: 8, mode: 'lydian', melodyAvoid: [11] }, // A♭ lydian
    bpm: 54,
    barsPerChord: [5, 8],
    palette: [
      { degree: 0, shape: 'seventh', weight: 3 },
      { degree: 1, shape: 'add9', weight: 1.5 },
      { degree: 5, shape: 'seventh', weight: 1.2 },
      { degree: 0, shape: 'fifths', weight: 1 },
    ],
    homePull: 0.45,
    modulateEveryMin: 0,
    pad: { voices: 5, low: 49, high: 71, level: 0.055, cutoff: 950, detune: 5, soft: true, attack: 8, release: 10 },
    bass: { level: 0.19, low: 32, pedal: true },
    keys: { level: 0.28, instrument: 'rhodes', phrasesPerMin: 0.45, low: 58, high: 76 },
    pulse: NO_PULSE,
    bells: { level: 0, perMin: 0, low: 72, high: 88 },
    shimmer: { level: 0.006 },
    texture: { kind: 'hearth', level: 0.04 },
    space: { reverbSeconds: 8.5, darkness: 0.62, reverbWet: 0.5, delayBeats: 2, feedback: 0.26, delayWet: 0.1 },
    darkenMinutes: 40,
    intensity: [0.2, 0.5],
  },
  'deep-rest': {
    key: { tonicPc: 7, mode: 'mixolydian', melodyAvoid: [5] }, // G mixolydian
    bpm: 52,
    barsPerChord: [6, 9],
    palette: [
      { degree: 0, shape: 'add9', weight: 3 },
      { degree: 6, shape: 'add9', weight: 1.5 },
      { degree: 3, shape: 'six9', weight: 1.2 },
    ],
    homePull: 0.5,
    modulateEveryMin: 0,
    pad: { voices: 5, low: 47, high: 69, level: 0.055, cutoff: 900, detune: 5, soft: true, attack: 8, release: 11 },
    bass: { level: 0.18, low: 31, pedal: true },
    keys: { level: 0.2, instrument: 'felt', phrasesPerMin: 0.3, low: 55, high: 74 },
    pulse: NO_PULSE,
    bells: { level: 0.4, perMin: 0.6, low: 55, high: 72 },
    shimmer: { level: 0.005 },
    texture: { kind: 'ocean', level: 0.04 },
    space: { reverbSeconds: 9, darkness: 0.65, reverbWet: 0.55, delayBeats: 2, feedback: 0.26, delayWet: 0.08 },
    darkenMinutes: 45,
    intensity: [0.18, 0.45],
  },
};

const INTENT_FALLBACK: Record<Intent, string> = {
  focus: 'quiet-momentum',
  relax: 'soft-landing',
  sleep: 'night-current',
  meditate: 'open-space',
  energy: 'first-light',
  balance: 'even-keel',
  recover: 'slow-tide',
};

/** Resolves the authored world for a recipe (Studio drafts fall back by intent). */
export function worldForRecipe(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>): SoundWorld {
  return SOUND_WORLDS[recipe.id] ?? SOUND_WORLDS[INTENT_FALLBACK[recipe.intent] ?? 'soft-landing'];
}
