/**
 * Wellness Waves — what an account syncs, and how two copies are merged.
 * Pure functions (no network, no DOM) so the rules are testable.
 */

import type { ShapeParams, SoundDNA } from '../types/index';

/** Local storage keys that follow the account. */
export const SYNC_KEYS = [
  'user_favorites',
  'recent_recipes',
  'user_sound_dna',
  'feel_xy',
  'user_shape_params',
  'program_prefs',
  'programs_auto',
] as const;

export interface SyncedState {
  favorites: string[];
  recents: string[];
  sound_dna: SoundDNA | null;
  feel: { x: number; y: number } | null;
  shape: ShapeParams | null;
  program_prefs: Record<string, unknown> | null;
  programs_auto: boolean | null;
  /** ms since epoch of the newest change in this copy. */
  updated_at: number;
}

const unique = (xs: string[]) => Array.from(new Set(xs));

/**
 * Merge rules:
 *  - favorites: union, nothing saved anywhere is ever lost;
 *  - recents: this device's order first, then the other's, max 10;
 *  - preferences (sound, feel, shape, programs): the newer copy wins as a whole.
 */
export function mergeState(local: SyncedState, remote: SyncedState | null): SyncedState {
  if (!remote) return local;
  const preferRemote = remote.updated_at > local.updated_at;
  const pick = <T>(l: T | null, r: T | null): T | null => (preferRemote ? r ?? l : l ?? r);
  return {
    favorites: unique([...remote.favorites, ...local.favorites]),
    recents: unique([...local.recents, ...remote.recents]).slice(0, 10),
    sound_dna: pick(local.sound_dna, remote.sound_dna),
    feel: pick(local.feel, remote.feel),
    shape: pick(local.shape, remote.shape),
    program_prefs: pick(local.program_prefs, remote.program_prefs),
    programs_auto: pick(local.programs_auto, remote.programs_auto),
    updated_at: Math.max(local.updated_at, remote.updated_at),
  };
}

export function sameState(a: SyncedState, b: SyncedState): boolean {
  const strip = (s: SyncedState) => JSON.stringify({ ...s, updated_at: 0 });
  return strip(a) === strip(b);
}
