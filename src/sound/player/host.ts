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

export interface Host {
  /** One stretch of listening ended. */
  recordListen(listen: Listen): void;
  /** A product milestone (play, favourite, …) for first-party analytics. */
  track(step: FunnelStep, props?: Record<string, string>): void;
}

let host: Host = {
  recordListen: () => {},
  track: () => {},
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
