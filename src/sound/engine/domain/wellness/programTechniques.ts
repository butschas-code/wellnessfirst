/**
 * Frequency programs as techniques (owner decision, 2026-10-20).
 *
 * Every space plays one of its curated Frequency programs by default, cycling
 * through the program's own frequencies in catalog order, one per minute,
 * woven into the music itself:
 *   below 0.5 Hz  a slow swell of the whole mix (deeper, it is felt as breathing)
 *   0.5–4 Hz      a soft pulse
 *   above 4 Hz    a fine flutter (shallower, so fast rates stay pleasant)
 * Only values whose speed suits the space are used (see programs/curated.ts).
 * Loaded lazily with the catalog.
 */

import type { Intent } from '../../types/index';
import type { RenderPlan } from '../programs/types';
import { programsForSpace, STEP_SECONDS } from '../programs/curated';
import type { Technique } from './techniques';

/** What a space's programs are for. Never a promise. */
const PROGRAM_BENEFIT: Record<Intent, string> = {
  focus: 'For focused work and study.',
  relax: 'For unwinding after a busy day.',
  sleep: 'For winding down into the night.',
  meditate: 'For meditation and inner quiet.',
  energy: 'For mornings, movement and training.',
  balance: 'For finding a steady, even middle.',
  recover: 'For rest and recovery after effort.',
};

/**
 * App names for the catalog programs offered here. The catalog's own names
 * describe intended effects ("Lower Back Comfort Support"); in a sound app those
 * read as health claims, so each program gets a name for the moment instead.
 * The catalog ID stays visible in "About this sound".
 */
export const PROGRAM_COPY: Record<string, { name: string; line: string }> = {
  // Focus
  focu_039: { name: 'Study Hours', line: 'A fine flutter that slowly quickens. For reading and study.' },
  focu_043: { name: 'Open Mind', line: 'Starts loose and slow, then brightens. For ideas and creative work.' },
  focu_044: { name: 'Clear Line', line: 'A crisp, quick flutter throughout. For decisions and sharp tasks.' },
  focu_046: { name: 'Ready', line: 'A short, even lift. For the minutes before a meeting or a call.' },
  // Unwind
  rela_007: { name: 'Soft Pause', line: 'Twelve gentle steps from slow swells to a light flutter. For a break in the day.' },
  rela_004: { name: 'Long Breath', line: 'Swells at breathing pace that turn into soft pulses. For slowing down.' },
  rela_003: { name: 'Steady Ground', line: 'An even, grounded pulse that hardly changes. For coming back to yourself.' },
  rela_014: { name: 'Evening Drift', line: 'Very slow waves drifting towards a calm pulse. For the evening.' },
  // Sleep
  slee_015: { name: 'Quiet Mind', line: 'Slow swells easing into a soft, slow beat. For when thoughts keep turning.' },
  slee_018: { name: 'Nightfall', line: 'Opens with one long wave every twenty seconds. For lights out.' },
  slee_020: { name: 'Lights Low', line: 'Only long, slow swells, like breathing in sleep. For drifting off.' },
  slee_023: { name: 'Deep Night', line: 'The slowest waves of all. For long nights and waking in the night.' },
  // Stillness
  mind_092: { name: 'Slow Attention', line: 'From slow swells to a gentle pulse. For body-scan practice.' },
  mind_096: { name: 'Still Point', line: 'Settles step by step towards a quiet centre. For sitting meditation.' },
  mind_088: { name: 'Here, Now', line: 'Soft waves that return again and again. For present-moment practice.' },
  mind_095: { name: 'Inward', line: 'Very long waves first, then a light pulse. For deep, quiet practice.' },
  // Energy
  ener_027: { name: 'Fresh Start', line: 'A bright flutter, then clear tones that climb. For getting started.' },
  ener_030: { name: 'Forward', line: 'A driving pulse and rising tones. For motivation and training.' },
  ener_032: { name: 'Warm Flow', line: 'A warm pulse with round, low tones. For steady movement.' },
  ener_028: { name: 'Daybreak', line: 'A quick lift and bright tones. For the first hour of the day.' },
  // Balance
  emot_050: { name: 'Settle', line: 'Soft steps from slow waves to a warm pulse. For after a hard moment.' },
  emot_055: { name: 'Kind Light', line: 'Gentle, unhurried steps towards a light flutter. For being kind to yourself.' },
  emot_054: { name: 'Safe Harbour', line: 'A calm, even pulse that holds steady. For feeling at ease.' },
  emot_058: { name: 'Room to Breathe', line: 'Long, breath-like waves opening into a soft pulse. For making space.' },
  // Recover
  phys_064: { name: 'Unwound', line: 'Pure tones that climb from deep to high. For stretching out after effort.' },
  phys_065: { name: 'Light Steps', line: 'Clear mid tones, one each minute. For after a long day on your feet.' },
  phys_062: { name: 'At Ease', line: 'Deep, round tones that brighten slowly. For full rest.' },
  phys_068: { name: 'Warm Glow', line: 'The lowest, warmest tones first. For a slow, warm wind-down.' },
};

/** Kept for callers that only need the name. */
export const PROGRAM_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PROGRAM_COPY).map(([id, c]) => [id, c.name])
);


export const depthFor = (hz: number) => (hz < 0.5 ? 0.38 : hz < 4 ? 0.3 : 0.24);

const fmt = (hz: number) => (hz < 1 ? hz.toFixed(2).replace(/0$/, '') : hz < 10 ? hz.toFixed(1).replace(/\.0$/, '') : String(Math.round(hz)));

export function techniqueFromPlan(plan: RenderPlan, space: Intent): Technique {
  const rates = plan.sequence.map((s) => s.renderedHz);
  const tones = plan.sequence.filter((s) => s.method === 'tone').length;
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  return {
    id: `inf:${plan.programId}`,
    programId: plan.programId,
    name: PROGRAM_COPY[plan.programId]?.name ?? plan.programName,
    tag: `${rates.length} frequencies`,
    spaces: [space],
    kind: 'pulse',
    pulse: {
      hz: plan.sequence[0].method === 'tone' ? 1 : rates[0],
      depth: plan.sequence[0].method === 'tone' ? 0 : depthFor(rates[0]),
      sequence: plan.sequence.map((s) => ({
        hz: s.renderedHz,
        seconds: STEP_SECONDS,
        depth: s.method === 'tone' ? 0 : depthFor(s.renderedHz),
        tone: s.method === 'tone',
      })),
    },
    benefit: PROGRAM_COPY[plan.programId]?.line ?? PROGRAM_BENEFIT[space],
    what: tones
      ? `Moves through ${rates.length} frequencies, ${fmt(lo)} to ${fmt(hi)} Hz, one each minute: the low ones as a pulse in the music, the higher ones as a soft, pure tone at exactly that pitch.`
      : `Moves through ${rates.length} frequencies, ${fmt(lo)} to ${fmt(hi)} Hz, one each minute, as a gentle swell and pulse in the music.`,
    background: `One of the 105 frequency sequences in our own library, each put together for a moment of the day and first made for frequency-wellness devices. Here it is played as sound. (Ref. ${plan.programId})`,
  };
}

/** The Frequency programs offered for a space, as techniques, default first. */
export function programTechniquesFor(space: Intent): Technique[] {
  return programsForSpace(space).map((p) => techniqueFromPlan(p, space));
}
