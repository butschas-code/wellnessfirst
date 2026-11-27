/**
 * Personal programs ("For you") — a stored composition or day arc → a playable technique.
 *
 * The composition is re-validated against this build's catalog and turned into
 * a plan with planForComposition, so what plays is exactly the catalog values
 * the server chose. It plays like any frequency program: woven into the music,
 * one value per step, looping until the listener changes it.
 */

import type { Technique } from '../../../engine/domain/wellness/techniques';
import type { PersonalProgram } from '../../host';

/** Same depths as the catalog programs in each space (domain/wellness/programTechniques.ts). */
const depthFor = (hz: number) => (hz < 0.5 ? 0.38 : hz < 4 ? 0.3 : 0.24);

const fmt = (hz: number) => (hz < 1 ? hz.toFixed(2).replace(/0$/, '') : hz < 10 ? hz.toFixed(1).replace(/\.0$/, '') : String(Math.round(hz)));

export const personalTechniqueId = (p: Pick<PersonalProgram, 'id' | 'contentHash'>) => `ww:${p.id ?? p.contentHash}`;

/** Null if the program no longer matches this build's catalog (it is then not played). */
export async function techniqueForProgram(p: PersonalProgram): Promise<Technique | null> {
  const { planForComposition, validateComposition, isArc, arcSteps } = await import('../../../engine/compose/index');
  if (validateComposition(p.composition).length) return null;
  if (isArc(p.composition)) {
    // A personal day arc: every movement keeps its glide, drift, bursts and breathing swell.
    const c = p.composition;
    const steps = arcSteps(c);
    const all = steps.flatMap((s) => [s.hz, s.toHz]);
    return {
      id: personalTechniqueId(p),
      name: p.name,
      tag: `${steps.length} movements`,
      spaces: ['focus', 'relax', 'sleep', 'meditate', 'energy', 'balance', 'recover'],
      kind: 'pulse',
      pulse: { hz: steps[0].hz, depth: steps[0].depth, sequence: steps, holdLast: true, seed: c.seed },
      benefit: p.description,
      what: `${steps.length} movements over ${Math.round(c.totalSeconds / 60)} minutes, ${fmt(Math.min(...all))} to ${fmt(Math.max(...all))} Hz, as a gentle pulse in the music; it holds the last one until you change it.`,
      background: 'Composed for you from your whole birth chart: each rate is worked out for you, not picked from a list.',
    };
  }
  const plan = planForComposition(p.composition, p.name);
  if (!plan.renderable) return null;
  const seq = plan.sequence;
  const rates = seq.map((s) => s.renderedHz);
  return {
    id: personalTechniqueId(p),
    name: p.name,
    tag: `${rates.length} frequencies`,
    spaces: ['focus', 'relax', 'sleep', 'meditate', 'energy', 'balance', 'recover'],
    kind: 'pulse',
    pulse: {
      hz: rates[0],
      depth: depthFor(rates[0]),
      sequence: seq.map((s) => ({ hz: s.renderedHz, seconds: s.durationSeconds, depth: depthFor(s.renderedHz) })),
    },
    benefit: p.description,
    what: `Moves through ${rates.length} frequencies, ${fmt(Math.min(...rates))} to ${fmt(Math.max(...rates))} Hz, as a gentle swell and pulse in the music, and loops.`,
    background: 'Made for you from your birth chart, using only values from our frequency library.',
  };
}

/** Plain-words "how is this made", shown under the (i) when a personal program plays. */
export const PERSONAL_HOW =
  'How it is made: your birth date, time and place show where the planets were when you were born. Each one has its own slow rhythm. We turn those rhythms into soft pulses in the music and put them in an order that fits the time of day. Nobody picks it from a list: it is put together just for you.';

export const isPersonalTechnique = (id: string | undefined) => !!id && id.startsWith('ww:');

export const SLOT_LABEL = { morning: 'Morning', midday: 'Midday', evening: 'Evening' } as const;

/** The slot the listener is in now (local time): before 11 morning, before 17 midday, else evening. */
export function currentSlot(now = new Date()): 'morning' | 'midday' | 'evening' {
  const h = now.getHours();
  return h < 11 ? 'morning' : h < 17 ? 'midday' : 'evening';
}

/** Life Rhythm's Simple/Pro choice, shared so both read the same way. */
const MODE_KEY = 'wfg_astro_view_mode';
export function readViewMode(): 'simple' | 'pro' {
  try {
    return JSON.parse(localStorage.getItem(MODE_KEY) ?? 'null') === 'pro' ? 'pro' : 'simple';
  } catch {
    return 'simple';
  }
}
export function writeViewMode(mode: 'simple' | 'pro'): void {
  try {
    localStorage.setItem(MODE_KEY, JSON.stringify(mode));
  } catch {
    /* private mode */
  }
}
