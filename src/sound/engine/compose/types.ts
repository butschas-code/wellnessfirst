/**
 * Compositions — personal frequency programs (§5.4).
 *
 * A composition is an ordered list of phases. Every phase points at one
 * catalog program and lists which of its values play, in order. Nothing in a
 * composition is a number the catalog does not contain: the values are
 * looked up by (program id, index) when the plan is made.
 */

import type { Intent, SoundDNA } from '../types/index';

export const COMPOSITION_SCHEMA = 'wellness-waves/composition@1' as const;
export const COMPOSER_VERSION = '1.0.0';

export type PhaseRole = 'arrive' | 'support' | 'amplify' | 'integrate';

export interface CompositionPhase {
  role: PhaseRole;
  /** Catalog program id, e.g. 'rela_004'. */
  sourceProgramId: string;
  /** Catalog `index` values of that program, in play order. */
  frequencyIndices: number[];
  /** Policy-bounded (20–300 s). */
  stepSeconds: number;
}

export interface Composition {
  schema: typeof COMPOSITION_SCHEMA;
  /** The player space whose band the values were chosen for. */
  intent: Intent;
  /** Suggested default soundscape; the member can play it under any soundscape. */
  recipeId: string;
  soundDna?: Partial<SoundDNA>;
  phases: CompositionPhase[];
  /** One cycle, for display and listen logging only. Compositions loop until changed. */
  totalSeconds: number;
  versions: { catalog: string; catalogSha: string; policy: string; rulebook: string; composer: string };
}

/** What to build: the space, and for each phase which categories to draw from, best first. */
export interface ComposeRequest {
  intent: Intent;
  phases: { role: PhaseRole; categories: string[] }[];
  /** Tie-breaks; same seed → same choices. */
  seed: string;
  rulebookVersion: string;
}
