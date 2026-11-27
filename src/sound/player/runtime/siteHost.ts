/**
 * Wellness Waves — the Wellness First side of the host seam.
 *
 * Signed in: player state (favourites, recents, Sound DNA, feel, shape, program
 * preferences) follows the member through `sound_user_state`, and listening is
 * logged to `sound_listens`. Signed out: everything stays on this device.
 *
 * Merge rules live in engine/state/syncState.ts (pure, tested).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { Storage } from '../../engine/lib/storage';
import { Logger } from '../../engine/lib/logger';
import { SYNC_KEYS, type SyncedState, mergeState, sameState } from '../../engine/state/syncState';
import { configureHost, type Listen, type PersonalResult, type PersonalSet } from '../host';

const STATE_TABLE = 'sound_user_state';
const LISTEN_TABLE = 'sound_listens';
const QUEUE_KEY = 'listening_queue';
const MAX_QUEUE = 200;

/** Fired on window after account data was written into local storage. */
export const STATE_HYDRATED_EVENT = 'ww:state-hydrated';

interface QueuedListen extends Listen {
  clientId: string;
  userId: string;
  device: string;
}

let userId: string | null = null;
let flushing = false;
let writing = false;

const device = () => {
  const app = window.matchMedia?.('(display-mode: standalone)').matches ? 'app' : 'web';
  const form = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  return `${app}-${form}`;
};

const clientId = () =>
  'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// ------------------------------------------------------------------ listening --

function queueListen(listen: Listen): void {
  if (!userId) return;
  const item: QueuedListen = { ...listen, clientId: clientId(), userId, device: device() };
  Storage.set(QUEUE_KEY, [...Storage.get<QueuedListen[]>(QUEUE_KEY, []), item].slice(-MAX_QUEUE));
  void flushListens();
}

async function flushListens(): Promise<void> {
  const db = client();
  if (!db || !userId || flushing) return;
  const uid = userId;
  const mine = Storage.get<QueuedListen[]>(QUEUE_KEY, []).filter((q) => q.userId === uid);
  if (!mine.length) return;
  flushing = true;
  try {
    const { error } = await db.from(LISTEN_TABLE).upsert(
      mine.map((q) => ({
        user_id: uid,
        client_id: q.clientId,
        recipe_id: q.recipeId,
        intent: q.intent ?? null,
        audio_mode: q.audioMode ?? null,
        started_at: new Date(q.startedAt).toISOString(),
        seconds: q.seconds,
        ended_by: q.endedBy,
        device: q.device,
      })),
      { onConflict: 'user_id,client_id', ignoreDuplicates: true }
    );
    if (error) throw error;
    const sent = new Set(mine.map((q) => q.clientId));
    Storage.set(QUEUE_KEY, Storage.get<QueuedListen[]>(QUEUE_KEY, []).filter((q) => !sent.has(q.clientId)));
  } catch (e) {
    Logger.warn('Listening upload failed; will retry', { error: String(e) });
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------------- state --

function readLocal(): SyncedState {
  return {
    favorites: Storage.get<string[]>('user_favorites', []),
    recents: Storage.get<string[]>('recent_recipes', []),
    sound_dna: Storage.get('user_sound_dna', null),
    feel: Storage.get('feel_xy', null),
    shape: Storage.get('user_shape_params', null),
    program_prefs: Storage.get('program_prefs', null),
    programs_auto: Storage.get<boolean | null>('programs_auto', null),
    updated_at: Math.max(0, ...SYNC_KEYS.map((k) => Storage.updatedAt(k))),
  };
}

function writeLocal(s: SyncedState): void {
  writing = true;
  try {
    Storage.set('user_favorites', s.favorites);
    Storage.set('recent_recipes', s.recents);
    if (s.sound_dna) Storage.set('user_sound_dna', s.sound_dna);
    if (s.feel) Storage.set('feel_xy', s.feel);
    if (s.shape) Storage.set('user_shape_params', s.shape);
    if (s.program_prefs) Storage.set('program_prefs', s.program_prefs);
    if (s.programs_auto !== null) Storage.set('programs_auto', s.programs_auto);
  } finally {
    writing = false;
  }
}

async function pull(db: SupabaseClient, uid: string): Promise<SyncedState | null> {
  const { data, error } = await db.from(STATE_TABLE).select('*').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    favorites: data.favorites ?? [],
    recents: data.recents ?? [],
    sound_dna: data.sound_dna,
    feel: data.feel,
    shape: data.shape,
    program_prefs: data.program_prefs,
    programs_auto: data.programs_auto,
    updated_at: data.updated_at ? Date.parse(data.updated_at) : 0,
  };
}

async function push(db: SupabaseClient, uid: string, s: SyncedState): Promise<void> {
  const { error } = await db.from(STATE_TABLE).upsert({
    user_id: uid,
    favorites: s.favorites,
    recents: s.recents,
    sound_dna: s.sound_dna,
    feel: s.feel,
    shape: s.shape,
    program_prefs: s.program_prefs,
    programs_auto: s.programs_auto,
    updated_at: new Date(s.updated_at || Date.now()).toISOString(),
  });
  if (error) throw error;
}

function startSync(db: SupabaseClient, uid: string): () => void {
  let stopped = false;
  let timer: number | null = null;

  const schedulePush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      if (!stopped) push(db, uid, readLocal()).catch((e) => Logger.warn('Sync push failed; will retry on next change', { error: String(e) }));
    }, 1500);
  };

  void (async () => {
    try {
      const local = readLocal();
      const remote = await pull(db, uid);
      if (stopped) return;
      const merged = mergeState(local, remote);
      if (!sameState(merged, local)) {
        writeLocal(merged);
        window.dispatchEvent(new Event(STATE_HYDRATED_EVENT));
      }
      if (!remote || !sameState(merged, remote)) await push(db, uid, merged);
    } catch (e) {
      Logger.warn('Initial sync failed; this device keeps working locally', { error: String(e) });
    }
  })();

  const unsub = Storage.onChange((key) => {
    if (!writing && (SYNC_KEYS as readonly string[]).includes(key)) schedulePush();
  });

  return () => {
    stopped = true;
    unsub();
    if (timer !== null) clearTimeout(timer);
  };
}

// ---------------------------------------------------------- personal programs --

/** Life Rhythm's browser copy of the birth details (src/scripts/astro-ui.ts STORAGE_KEY). */
const LR_PROFILE_KEY = 'wfg_astro_active_profile';

function deviceProfile(): unknown | null {
  try {
    const raw = localStorage.getItem(LR_PROFILE_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return p && typeof p === 'object' && typeof p.birthDate === 'string' ? p : null;
  } catch {
    return null;
  }
}

const deviceTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const todayLocal = () => new Date().toLocaleDateString('en-CA');

async function accessToken(): Promise<string | null> {
  const db = client();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session?.access_token ?? null;
}

async function personalPrograms(set: PersonalSet): Promise<PersonalResult> {
  const token = await accessToken();
  const day = `date=${todayLocal()}&tz=${encodeURIComponent(deviceTz())}`;
  try {
    if (token) {
      const res = await fetch(`/api/sound/programs?set=${set}&${day}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { status: 'ok', programs: body.programs ?? [], signedIn: true, canSave: !!body.stored || set === 'saved', source: 'account', date: body.date };
      if (res.status !== 404 || body.error !== 'no-profile') return { status: 'unavailable', message: body.message };
    }
    if (set === 'saved') return token ? { status: 'ok', programs: [], signedIn: true, canSave: true, source: 'account' } : { status: 'signed-out' };
    // No account profile (or signed out): the same programs from this browser's birth details, unsaved.
    const profile = deviceProfile();
    if (!profile) return { status: 'no-profile', signedIn: !!token };
    const res = await fetch('/api/sound/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set, profile, date: todayLocal(), tz: deviceTz() }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'unavailable', message: body.message };
    return { status: 'ok', programs: body.programs ?? [], signedIn: !!token, canSave: false, source: 'device', date: body.date };
  } catch (e) {
    Logger.warn('Personal programs failed', { error: String(e) });
    return { status: 'unavailable', message: 'You seem to be offline.' };
  }
}

async function saveProgram(id: string, saved: boolean): Promise<boolean> {
  const token = await accessToken();
  if (!token) return !saved;
  const res = await fetch(`/api/sound/program/${encodeURIComponent(id)}/save`, {
    method: saved ? 'POST' : 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: saved ? '{}' : undefined,
  });
  return res.ok ? saved : !saved;
}

// ---------------------------------------------------------------------- wiring --

function client(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return getSupabaseBrowser();
  } catch {
    return null;
  }
}

/** Plugs Wellness First into the player. Returns a cleanup function. */
export function connectHost(): () => void {
  configureHost({ recordListen: queueListen, personalPrograms, saveProgram });
  const db = client();
  if (!db) return () => {};

  let stopSync: (() => void) | null = null;
  const signIn = (uid: string | null) => {
    if (uid === userId) return;
    stopSync?.();
    stopSync = null;
    userId = uid;
    if (uid) {
      stopSync = startSync(db, uid);
      void flushListens();
    }
  };

  void db.auth.getSession().then(({ data }) => signIn(data.session?.user.id ?? null));
  const { data } = db.auth.onAuthStateChange((_event, session) => signIn(session?.user.id ?? null));
  const onOnline = () => void flushListens();
  window.addEventListener('online', onOnline);

  return () => {
    data.subscription.unsubscribe();
    window.removeEventListener('online', onOnline);
    stopSync?.();
  };
}
