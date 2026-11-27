/**
 * Composer — builds the exact program from a request (§5.4).
 *
 * Deterministic: catalog programs are tried in a seeded order (SeededRNG over
 * `seed|role|category`), so ties break the same way every time. Values come
 * only from catalog programs, filtered to the space's band exactly like the
 * curated pairings (domain/programs/curated.ts): Sleep keeps ≤ 4 Hz, Focus
 * keeps 4–40 Hz, and so on. Values outside the band are dropped, never moved.
 */

import type { Intent } from '../types/index';
import type { CanonicalProgram } from '../domain/programs/types';
import { catalog, programsInCategory } from '../domain/programs/catalog';
import { POLICY, POLICY_VERSION } from '../domain/programs/adaptationPolicy';
import { SPACE_PROGRAM_RULES } from '../domain/programs/curated';
import { SeededRNG } from '../lib/rng';
import { COMPOSER_VERSION, COMPOSITION_SCHEMA, type ComposeRequest, type Composition, type CompositionPhase } from './types';

/** Values per phase: enough to be a journey, few enough to keep phases distinct. */
export const MAX_VALUES_PER_PHASE = 4;
export const MIN_VALUES_PER_PHASE = 2;

/** Step length per space (authored; within the policy's 20–300 s). Slower spaces step slower. */
export const STEP_SECONDS: Record<Intent, number> = {
  focus: 60,
  energy: 60,
  balance: 60,
  relax: 60,
  recover: 75,
  meditate: 90,
  sleep: 90,
};

/** Suggested soundscape per space; mirrors FLAGSHIP_BY_INTENT in player/ui/catalogue.ts (tested). */
export const SUGGESTED_RECIPE: Record<Intent, string> = {
  focus: 'quiet-momentum',
  relax: 'soft-landing',
  sleep: 'night-current',
  meditate: 'open-space',
  energy: 'first-light',
  balance: 'even-keel',
  recover: 'slow-tide',
};

/** The space's own catalog categories, used for the arrive and integrate phases. */
export function homeCategories(intent: Intent): string[] {
  const r = SPACE_PROGRAM_RULES[intent];
  return r.also ? [r.category, r.also] : [r.category];
}

export function band(intent: Intent): { minHz: number; maxHz: number } {
  const r = SPACE_PROGRAM_RULES[intent];
  // Compositions are pulses only: no literal tones, so never above the modulation range.
  return { minHz: r.minHz, maxHz: Math.min(r.maxHz, POLICY.amMaxHz) };
}

function seededOrder<T>(items: T[], seed: string): T[] {
  const rng = new SeededRNG(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const byId = (a: CanonicalProgram, b: CanonicalProgram) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The in-band values of a program, in catalog order. */
function inBand(p: CanonicalProgram, intent: Intent) {
  const { minHz, maxHz } = band(intent);
  return p.frequencies.filter((f) => f.hz >= minHz && f.hz <= maxHz);
}

function pickPhase(
  req: ComposeRequest,
  role: CompositionPhase['role'],
  categories: string[],
  used: Set<string>,
  phaseNo: number
): CompositionPhase | null {
  const stepSeconds = STEP_SECONDS[req.intent];
  // Unused programs first; a program already in this composition only as a last resort.
  for (const allowReuse of [false, true]) {
    for (const category of categories) {
      const candidates = seededOrder([...programsInCategory(category)].sort(byId), `${req.seed}|${role}|${phaseNo}|${category}`);
      for (const p of candidates) {
        if (!allowReuse && used.has(p.id)) continue;
        const values = inBand(p, req.intent);
        if (values.length < MIN_VALUES_PER_PHASE) continue;
        // A contiguous window keeps the catalog's own order and shape.
        const span = Math.min(MAX_VALUES_PER_PHASE, values.length);
        const rng = new SeededRNG(`${req.seed}|${role}|${phaseNo}|${p.id}|window`);
        const start = Math.floor(rng.next() * (values.length - span + 1));
        return {
          role,
          sourceProgramId: p.id,
          frequencyIndices: values.slice(start, start + span).map((f) => f.index),
          stepSeconds,
        };
      }
    }
  }
  return null;
}

export function compose(req: ComposeRequest): Composition {
  const used = new Set<string>();
  const phases: CompositionPhase[] = [];
  req.phases.forEach((ph, i) => {
    const phase = pickPhase(req, ph.role, ph.categories, used, i);
    if (!phase) return;
    used.add(phase.sourceProgramId);
    phases.push(phase);
  });
  if (!phases.length) {
    // Every space has curated programs in its home band, so this is a fallback that never empties.
    const phase = pickPhase(req, 'arrive', homeCategories(req.intent), used, 0);
    if (!phase) throw new Error(`No catalog program fits the ${req.intent} band.`);
    phases.push(phase);
  }
  const c = catalog();
  return {
    schema: COMPOSITION_SCHEMA,
    intent: req.intent,
    recipeId: SUGGESTED_RECIPE[req.intent],
    phases,
    totalSeconds: phases.reduce((t, p) => t + p.frequencyIndices.length * p.stepSeconds, 0),
    versions: {
      catalog: c.importVersion,
      catalogSha: c.source.sha256,
      policy: POLICY_VERSION,
      rulebook: req.rulebookVersion,
      composer: COMPOSER_VERSION,
    },
  };
}
