/**
 * Frequency programs — the ones that make sense here (owner decision, 2026-10-19).
 *
 * One way to hear them: Pulse (a soft swell or pulse in the music's own
 * drone), on any speaker. No binaural, no literal tones. Each space only uses
 * programs from its matching catalog category, and only the values whose speed
 * suits that space: very slow for Sleep, slow for Stillness and Unwind, faster
 * for Focus. Values outside the range are left out of the sequence; a program
 * with fewer than three suitable values is not offered.
 */

import type { Intent } from '../../types/index';
import type { CanonicalProgram, RenderPlan } from './types';
import { catalogRef, programsInCategory } from './catalog';
import { planFor } from './adaptationPolicy';

interface SpaceRule {
  category: string;
  /** A second catalog category to draw from when the first has few suitable programs. */
  also?: string;
  minHz: number;
  maxHz: number;
  /** Also play 40–1000 Hz values as soft tones at their literal pitch (PEMF-style catalogs). */
  tones?: boolean;
}

export const SPACE_PROGRAM_RULES: Record<Intent, SpaceRule> = {
  sleep: { category: 'Sleep & Night Recovery', minHz: 0.01, maxHz: 4 },
  meditate: { category: 'Mindfulness & Inner Awareness', minHz: 0.01, maxHz: 8 },
  relax: { category: 'Relaxation & Stress Balance', minHz: 0.01, maxHz: 12 },
  focus: { category: 'Mental Focus & Clarity', minHz: 4, maxHz: 40 },
  energy: { category: 'Energy & Vitality', also: 'Movement & Activity Support', minHz: 6, maxHz: 40, tones: true },
  balance: { category: 'Emotional Balance', minHz: 0.01, maxHz: 12 },
  recover: { category: 'Physical Ease & Recovery', also: 'Movement & Activity Support', minHz: 0.01, maxHz: 8, tones: true },
};

const MIN_VALUES = 3;
const MAX_PER_SPACE = 4;
export const STEP_SECONDS = 60;

/** The program reduced to the values that suit the space, or null. */
function suited(p: CanonicalProgram, rule: SpaceRule): CanonicalProgram | null {
  const frequencies = p.frequencies.filter(
    (f) => (f.hz >= rule.minHz && f.hz <= rule.maxHz) || (rule.tones && f.hz > 40 && f.hz <= 1000)
  );
  return frequencies.length >= MIN_VALUES ? { ...p, frequencies, frequencyCount: frequencies.length } : null;
}

const cache = new Map<Intent, RenderPlan[]>();

/** The few programs offered for a space, best first. */
export function programsForSpace(intent: Intent): RenderPlan[] {
  const hit = cache.get(intent);
  if (hit) return hit;
  const rule = SPACE_PROGRAM_RULES[intent];
  const plans = [...programsInCategory(rule.category), ...(rule.also ? programsInCategory(rule.also) : [])]
    .map((p) => suited(p, rule))
    .filter((p): p is CanonicalProgram => !!p)
    .map((p) => planFor(p, catalogRef(), { strategy: 'pulse', includeTones: !!rule.tones, stepSeconds: STEP_SECONDS }))
    .filter((plan) => plan.renderable && plan.sequence.length >= MIN_VALUES)
    // The space's own category first, then the most usable values.
    .sort((a, b) => Number(a.category !== rule.category) - Number(b.category !== rule.category) || b.sequence.length - a.sequence.length)
    .slice(0, MAX_PER_SPACE);
  cache.set(intent, plans);
  return plans;
}
