/**
 * Personal programs ("For you") — a stored composition → a playable technique.
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
  const { planForComposition, validateComposition } = await import('../../../engine/compose/index');
  if (validateComposition(p.composition).length) return null;
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
