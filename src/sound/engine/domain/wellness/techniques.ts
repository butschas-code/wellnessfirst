/**
 * Wellness Waves — wellness techniques.
 *
 * Each space runs one technique woven into the music itself:
 *   pulse     the whole mix gently pulses at a set rate (amplitude modulation),
 *             the method used in published research on rhythmic music for focus
 *   breath    the music swells and settles at a breathing pace; the ring
 *             breathes with it, so you can breathe along
 *   sequence  an frequency catalog sequence, played as soft pulses beneath it
 *
 * Copy rules (docs/frequency-integration/research/claims-register.md): say
 * what you hear and do and where the idea comes from; never promise an effect
 * on health, sleep, mood or the brain.
 */

import type { Intent } from '../../types/index';

export interface BreathPattern {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

/** One step of a sequence. Catalog programs use hz/seconds/depth; personal arcs add the rest. */
export interface SequenceStep {
  hz: number;
  seconds: number;
  depth: number;
  tone?: boolean;
  /** Glide from `hz` to this rate across the whole step. */
  toHz?: number;
  /** firm: slightly squarer pulse (adds a third harmonic to the pulse). */
  shape?: 'sine' | 'firm';
  /** Slow drift around the rate: ± pct, new target every `every` s. */
  jitter?: { pct: number; every: number };
  /** Short bursts at another rate: `on` s every `every` s. */
  burst?: { hz: number; on: number; every: number };
  /** A breathing swell in the music. */
  breath?: { hz: number; depth: number };
}

export interface Technique {
  id: string;
  name: string;
  /** Short tag shown with the name: "16 Hz", "6 / min". */
  tag: string;
  spaces: Intent[];
  kind: 'pulse' | 'breath' | 'sequence';
  pulse?: {
    hz: number;
    /** Optional slow glide to another rate over `minutes` (e.g. sleep: slower over time). */
    to?: { hz: number; minutes: number };
    /** Modulation depth 0–1 of the music's amplitude. */
    depth: number;
    /** Frequency programs: cycle through these rates in order, looping. Overrides `hz`/`to`. */
    sequence?: Array<SequenceStep>;
    /** Personal arcs: after the last step, hold it instead of starting over. */
    holdLast?: boolean;
    /** Seed for the deterministic drift (jitter) pattern. */
    seed?: string;
  };
  /** frequency program this technique plays, if any. */
  programId?: string;
  breath?: {
    pattern: BreathPattern;
    /** Optional: stretch the pattern by this factor over `minutes` (breathing slows down). */
    slowTo?: { factor: number; minutes: number };
    /** How far the music dips on the out-breath, 0–1 of amplitude. */
    depth: number;
  };
  /** What it is for, in a few words ("For deep work…"). Never a promise. */
  benefit: string;
  /** One plain sentence: what you hear / do. */
  what: string;
  /** One plain sentence: where the idea comes from. Never a promise. */
  background: string;
}

export const TECHNIQUES: Technique[] = [
  // ---- Focus ---------------------------------------------------------------
  {
    id: 'focus-pulse',
    name: 'Focus pulse',
    tag: '16 Hz',
    spaces: ['energy', 'focus'],
    kind: 'pulse',
    pulse: { hz: 16, depth: 0.32 },
    benefit: 'A fine flutter, sixteen times a second. For deep work.',
    what: 'The music carries a fast, fine flutter, sixteen times a second. You hear it as texture, not as a beat.',
    background: 'Based on research into rhythmic amplitude modulation in music and sustained attention.',
  },
  {
    id: 'gamma-40',
    name: 'Gamma',
    tag: '40 Hz',
    spaces: ['energy', 'focus'],
    kind: 'pulse',
    pulse: { hz: 40, depth: 0.28 },
    benefit: 'A very fast, light shimmer. For sharp, demanding tasks.',
    what: 'A very fast shimmer, forty times a second, inside the music.',
    background: 'Inspired by early-stage university research on 40 Hz sound and light. Still being studied.',
  },
  {
    id: 'alpha-10',
    name: 'Alpha flow',
    tag: '10 Hz',
    spaces: ['balance', 'focus', 'relax'],
    kind: 'pulse',
    pulse: { hz: 10, depth: 0.26 },
    benefit: 'A soft, even flutter. For creative work and ideas.',
    what: 'A soft, even flutter, ten times a second. Lighter than Focus pulse, good for creative work.',
    background: 'Ten per second is in the alpha range, the rhythm linked to relaxed, wakeful attention.',
  },
  // ---- Unwind ----------------------------------------------------------------
  {
    id: 'long-exhale',
    name: 'Long exhale',
    tag: '6 / min',
    spaces: ['balance', 'recover', 'relax'],
    kind: 'breath',
    breath: { pattern: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, depth: 0.4 },
    benefit: 'Rises for four, falls for six. For letting the day go.',
    what: 'The music rises for four seconds and falls for six. Breathe in as it rises, out as it falls.',
    background: 'Slow breathing with a longer out-breath is a widely used relaxation technique.',
  },
  {
    id: 'coherent',
    name: 'Coherent breathing',
    tag: '5.5 / min',
    spaces: ['balance', 'meditate', 'relax'],
    kind: 'breath',
    breath: { pattern: { inhale: 5.5, holdIn: 0, exhale: 5.5, holdOut: 0 }, depth: 0.38 },
    benefit: 'Rises and falls evenly, five and a half times a minute. For a calm rhythm.',
    what: 'The music rises and falls evenly, about five and a half times a minute. Breathe with it.',
    background: 'This pace is studied in heart-rate-variability research as a resonant breathing rate.',
  },
  {
    id: 'earth-pulse',
    name: 'Schumann resonance',
    tag: '7.83 Hz',
    spaces: ['balance', 'energy', 'focus', 'meditate', 'recover', 'relax', 'sleep'],
    kind: 'pulse',
    pulse: { hz: 7.83, depth: 0.24 },
    benefit: "The Earth's own rhythm as a gentle tremble. For feeling grounded.",
    what: 'A gentle tremble in the music, 7.83 times a second.',
    background: 'The Schumann resonance: the natural electromagnetic rhythm between the Earth and the ionosphere.',
  },
  // ---- Sleep -----------------------------------------------------------------
  {
    id: 'slowing-breath',
    name: 'Slowing breath',
    tag: '6 → 4 / min',
    spaces: ['sleep'],
    kind: 'breath',
    breath: { pattern: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, slowTo: { factor: 1.5, minutes: 20 }, depth: 0.36 },
    benefit: 'A breath that slows from six to four a minute. For drifting off.',
    what: 'The music breathes slowly, and over twenty minutes it breathes slower still. Follow it if you like.',
    background: 'Gradually slowing your breathing is a common part of winding down for bed.',
  },
  {
    id: 'four-seven-eight',
    name: '4-7-8 breathing',
    tag: '4 · 7 · 8',
    spaces: ['sleep'],
    kind: 'breath',
    breath: { pattern: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, depth: 0.4 },
    benefit: 'In for four, hold for seven, out for eight. For a quiet mind at bedtime.',
    what: 'In for four as the music rises, hold for seven while it stays, out for eight as it falls.',
    background: 'A popular breathing pattern for evenings, taught in many relaxation practices.',
  },
  {
    id: 'delta-drift',
    name: 'Delta drift',
    tag: '4 → 1 Hz',
    spaces: ['recover', 'sleep'],
    kind: 'pulse',
    pulse: { hz: 4, to: { hz: 1, minutes: 30 }, depth: 0.2 },
    benefit: 'A pulse that slows down over half an hour. For long, deep rest.',
    what: 'A slow pulse in the music that gets slower and slower over half an hour.',
    background: 'It moves down from the theta into the delta range, the rhythms of drowsiness and deep sleep.',
  },
  // ---- Stillness ---------------------------------------------------------------
  {
    id: 'box',
    name: 'Box breathing',
    tag: '4 · 4 · 4 · 4',
    spaces: ['meditate'],
    kind: 'breath',
    breath: { pattern: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }, depth: 0.4 },
    benefit: 'In, hold, out, hold, four seconds each. For a steady, clear head.',
    what: 'In for four, hold for four, out for four, hold for four. The music and the ring show each part.',
    background: 'A simple, even breathing pattern used in mindfulness and in high-pressure jobs.',
  },
  {
    id: 'theta-6',
    name: 'Theta',
    tag: '6 Hz',
    spaces: ['meditate', 'recover'],
    kind: 'pulse',
    pulse: { hz: 6, depth: 0.22 },
    benefit: 'A slow, rounded pulse. For deep meditation and quiet rest.',
    what: 'A slow, rounded pulse in the music, six times a second.',
    background: 'Six per second is in the theta range, often associated with deep meditation.',
  },
  // ---- Energy ----------------------------------------------------------------
  {
    id: 'lift-20',
    name: 'Lift',
    tag: '20 Hz',
    spaces: ['energy'],
    kind: 'pulse',
    pulse: { hz: 20, depth: 0.3 },
    benefit: 'A quick, bright flutter. For waking up and getting going.',
    what: 'A quick, bright flutter in the music, twenty times a second.',
    background: 'Twenty per second is in the beta range, the rhythm of an alert, active state.',
  },
  {
    id: 'power-breath',
    name: 'Rhythm breath',
    tag: '10 / min',
    spaces: ['energy'],
    kind: 'breath',
    breath: { pattern: { inhale: 3, holdIn: 0, exhale: 3, holdOut: 0 }, depth: 0.34 },
    benefit: 'Up and down every three seconds. For moving in rhythm.',
    what: 'The music rises and falls every three seconds. Breathe or step in time with it.',
    background: 'Matching breath to a steady rhythm is common in running, cycling and warm-ups.',
  },
];

export const techniqueById = (id: string | undefined | null) => TECHNIQUES.find((t) => t.id === id);
export const techniquesFor = (space: Intent) => TECHNIQUES.filter((t) => t.spaces.includes(space));

/** Single-frequency programs per space, in order. The Schumann resonance is in every space. */
const SINGLES: Record<Intent, string[]> = {
  focus: ['focus-pulse', 'gamma-40', 'earth-pulse'],
  relax: ['alpha-10', 'earth-pulse'],
  sleep: ['delta-drift', 'earth-pulse'],
  meditate: ['theta-6', 'earth-pulse'],
  energy: ['lift-20', 'gamma-40', 'earth-pulse'],
  balance: ['alpha-10', 'earth-pulse'],
  recover: ['theta-6', 'earth-pulse'],
};

/** Breathing patterns per space (not frequencies; shown separately). */
const BREATHING: Record<Intent, string[]> = {
  focus: [],
  relax: ['long-exhale', 'coherent'],
  sleep: ['slowing-breath', 'four-seven-eight'],
  meditate: ['box', 'coherent'],
  energy: ['power-breath'],
  balance: ['coherent', 'long-exhale'],
  recover: ['long-exhale'],
};

const byIds = (ids: string[]) => ids.map((id) => techniqueById(id)).filter((t): t is Technique => !!t);
export const singlesFor = (space: Intent) => byIds(SINGLES[space]);
export const breathingFor = (space: Intent) => byIds(BREATHING[space]);

/** About six programs per space: Frequency programs first, then single frequencies. */
export const PROGRAMS_PER_SPACE = 6;

/** Shown once, small, wherever techniques are listed. */
export const TECHNIQUE_NOTE =
  'Programs shape how the music moves. They are for relaxation and wellbeing, not medical treatment, and experiences vary. If you have epilepsy or a sound sensitivity, use Gamma and fast pulses with care.';
