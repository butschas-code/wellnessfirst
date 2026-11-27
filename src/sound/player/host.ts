/**
 * Wellness Waves — host seam.
 *
 * The only place the player talks to Wellness First (account, /api/sound/*,
 * analytics). Player UI never imports Supabase or site code directly; the site
 * plugs its implementations in with `configureHost()` when it mounts the player.
 *
 * Defaults are no-ops; runtime/siteHost.ts connects Wellness First (member
 * state sync and the listening log in Supabase).
 */

import type { AnyComposition } from '../engine/compose/plan';

/** Why a stretch of listening was logged. `chunk`: periodic save during a long session. */
export type EndedBy = 'switch' | 'stop' | 'timer' | 'leave' | 'chunk';

/** Long sessions are logged every this many seconds. */
export const LISTEN_CHUNK_SECONDS = 15 * 60;

/** Shorter than this is a tap through the catalogue, not listening. */
export const MIN_LISTEN_SECONDS = 10;

export interface Listen {
  recipeId: string;
  intent?: string;
  audioMode?: string;
  startedAt: number;
  seconds: number;
  endedBy: EndedBy;
}

export type FunnelStep = 'visit' | 'cta' | 'play' | 'signup' | 'signed_in' | 'favorite';

/* ───────────── personal programs (Phase 5) ───────────── */

export type PersonalSet = 'today' | 'chapter' | 'strengths' | 'challenges' | 'saved';

/** One personal program as the site returns it (see src/lib/sound/server.ts ApiProgram). */
export interface PersonalProgram {
  /** null: computed from browser-only birth details, playable but not saveable. */
  id: string | null;
  kind: 'today' | 'chapter' | 'strength' | 'challenge' | 'standard';
  slot: 'morning' | 'midday' | 'evening' | null;
  name: string;
  description: string;
  descriptionPro: string;
  intent: string;
  recipeId: string;
  composition: AnyComposition;
  /** Catalog rules carry use/category/weight; day-arc rules carry the movements they shaped. */
  reasons: Array<{ ruleId: string; layer: string; use?: string; category?: string; weight?: number; movements?: string[] }>;
  validFrom: string;
  validTo: string | null;
  contentHash: string;
  saved: boolean;
  savedAt?: string | null;
}

export type PersonalResult =
  | { status: 'ok'; programs: PersonalProgram[]; signedIn: boolean; canSave: boolean; source: 'account' | 'device'; date?: string }
  /** No birth details anywhere: invite to add them (never a gate before listening). */
  | { status: 'no-profile'; signedIn: boolean }
  | { status: 'signed-out' }
  | { status: 'unavailable'; message?: string };

export interface Host {
  /** One stretch of listening ended. */
  recordListen(listen: Listen): void;
  /** A product milestone (play, favourite, …) for first-party analytics. */
  track(step: FunnelStep, props?: Record<string, string>): void;
  /** Personal programs for a set, made from the member's (or this browser's) birth details. */
  personalPrograms(set: PersonalSet): Promise<PersonalResult>;
  /** Save or unsave a stored program (free account). Resolves to the new saved state. */
  saveProgram(id: string, saved: boolean): Promise<boolean>;
}

let host: Host = {
  recordListen: () => {},
  track: () => {},
  personalPrograms: async () => ({ status: 'unavailable' }),
  saveProgram: async () => false,
};

export function configureHost(impl: Partial<Host>): void {
  host = { ...host, ...impl };
}

export function recordListen(listen: Listen): void {
  if (listen.seconds < MIN_LISTEN_SECONDS) return;
  host.recordListen({ ...listen, seconds: Math.min(Math.round(listen.seconds), 86400) });
}

export function trackFunnel(step: FunnelStep, props?: Record<string, string>): void {
  host.track(step, props);
}

export const personalPrograms = (set: PersonalSet) => host.personalPrograms(set);
export const saveProgram = (id: string, saved: boolean) => host.saveProgram(id, saved);
