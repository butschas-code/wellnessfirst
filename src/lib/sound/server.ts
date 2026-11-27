/**
 * Wellness Waves — server helpers for /api/sound/* and /api/astro/profile.
 * Server-only (imports astro:env). Reads use the member's JWT so RLS applies;
 * program and signal inserts use the service role so clients can't make up
 * programs. Without SUPABASE_SERVICE_ROLE_KEY, programs are computed and
 * returned but not stored (they can be played, not saved).
 */

import { getSecret } from 'astro:env/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AstroProfileRow } from './profile';
import type { GeneratedProgram } from './programs';
import type { SoundSignals } from './signals';

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

function env(key: string): string {
  return (getSecret(key) ?? (import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
}

const supabaseUrl = () => env('PUBLIC_SUPABASE_URL');
const anonKey = () => env('PUBLIC_SUPABASE_ANON_KEY');

export const isConfigured = () => !!supabaseUrl() && !!anonKey();

/** Service-role client, or null when the key is not set. Never sent to a browser. */
export function serviceClient(): SupabaseClient | null {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || !supabaseUrl()) return null;
  return createClient(supabaseUrl(), key, opts);
}

export interface Caller {
  user: User;
  /** Anon key + the member's JWT: every query runs under RLS as that member. */
  db: SupabaseClient;
}

/** The signed-in member from `Authorization: Bearer <access token>`, or null. */
export async function callerFrom(request: Request): Promise<Caller | null> {
  if (!isConfigured()) return null;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const db = createClient(supabaseUrl(), anonKey(), { ...opts, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, db };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });

export const fail = (status: number, error: string, message?: string) => json({ error, message: message ?? error }, status);

export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('too-large');
  return text ? JSON.parse(text) : {};
}

/** The member's current primary birth profile (newest version), or null. */
export async function currentProfile(db: SupabaseClient, userId: string): Promise<AstroProfileRow | null> {
  const { data, error } = await db
    .from('astro_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .is('superseded_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AstroProfileRow | null) ?? null;
}

/* ───────────────────────── programs ───────────────────────── */

/** What the player receives for one program. `id` is null for programs that were not stored. */
export interface ApiProgram {
  id: string | null;
  kind: GeneratedProgram['kind'] | 'standard';
  slot: GeneratedProgram['slot'];
  name: string;
  description: string;
  descriptionPro: string;
  intent: string;
  recipeId: string;
  composition: GeneratedProgram['composition'];
  reasons: GeneratedProgram['reasons'];
  validFrom: string;
  validTo: string | null;
  contentHash: string;
  saved: boolean;
  savedAt?: string | null;
  label?: string | null;
}

export interface ProgramRow {
  id: string;
  user_id: string | null;
  kind: ApiProgram['kind'];
  slot: ApiProgram['slot'];
  valid_from: string;
  valid_to: string | null;
  name: string;
  description: string;
  description_pro: string;
  intent: string;
  recipe_id: string;
  composition: ApiProgram['composition'];
  reasons: ApiProgram['reasons'];
  content_hash: string;
  gen_key: string;
}

export function fromRow(r: ProgramRow, saved = false, extra: Partial<ApiProgram> = {}): ApiProgram {
  return {
    id: r.id,
    kind: r.kind,
    slot: r.slot,
    name: r.name,
    description: r.description,
    descriptionPro: r.description_pro,
    intent: r.intent,
    recipeId: r.recipe_id,
    composition: r.composition,
    reasons: r.reasons,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    contentHash: r.content_hash,
    saved,
    ...extra,
  };
}

export function fromGenerated(g: GeneratedProgram): ApiProgram {
  return {
    id: null,
    kind: g.kind,
    slot: g.slot,
    name: g.name,
    description: g.description,
    descriptionPro: g.descriptionPro,
    intent: g.intent,
    recipeId: g.recipeId,
    composition: g.composition,
    reasons: g.reasons,
    validFrom: g.validFrom,
    validTo: g.validTo,
    contentHash: g.contentHash,
    saved: false,
  };
}

/**
 * Stores generated programs (and their signals) once, then returns the stored
 * rows in the generated order. Idempotent: the UNIQUE (user_id, gen_key)
 * index makes concurrent first opens insert each program exactly once.
 */
export async function storePrograms(
  service: SupabaseClient,
  caller: Caller,
  generated: GeneratedProgram[],
  signals: SoundSignals
): Promise<ApiProgram[]> {
  const uid = caller.user.id;
  if (!generated.length) return [];
  const sig = await service.from('sound_signals').upsert(
    {
      user_id: uid,
      profile_id: signals.profileId,
      profile_version: signals.profileVersion,
      local_date: signals.date,
      signals,
      versions: signals.versions,
    },
    { onConflict: 'user_id,profile_id,profile_version,local_date', ignoreDuplicates: true }
  );
  if (sig.error) throw sig.error;
  const ins = await service.from('sound_programs').upsert(
    generated.map((g) => ({
      user_id: uid,
      profile_id: g.profileId,
      profile_version: g.profileVersion,
      kind: g.kind,
      slot: g.slot,
      valid_from: g.validFrom,
      valid_to: g.validTo,
      name: g.name,
      description: g.description,
      description_pro: g.descriptionPro,
      intent: g.intent,
      recipe_id: g.recipeId,
      composition: g.composition,
      reasons: g.reasons,
      versions: g.versions,
      content_hash: g.contentHash,
      gen_key: g.genKey,
    })),
    { onConflict: 'user_id,gen_key', ignoreDuplicates: true }
  );
  if (ins.error) throw ins.error;
  // Read back as the member (RLS), so only their own rows can come back.
  const keys = generated.map((g) => g.genKey);
  const { data, error } = await caller.db.from('sound_programs').select('*').eq('user_id', uid).in('gen_key', keys);
  if (error) throw error;
  const rows = (data ?? []) as ProgramRow[];
  const saved = await savedIds(caller, rows.map((r) => r.id));
  return keys
    .map((k) => rows.find((r) => r.gen_key === k))
    .filter((r): r is ProgramRow => !!r)
    .map((r) => fromRow(r, saved.has(r.id)));
}

export async function savedIds(caller: Caller, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data, error } = await caller.db.from('sound_program_saves').select('program_id').in('program_id', ids);
  if (error) throw error;
  return new Set((data ?? []).map((r: { program_id: string }) => r.program_id));
}

export async function savedPrograms(caller: Caller): Promise<ApiProgram[]> {
  const { data, error } = await caller.db
    .from('sound_program_saves')
    .select('program_id, label, saved_at, sound_programs(*)')
    .order('saved_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  type Row = { program_id: string; label: string | null; saved_at: string; sound_programs: ProgramRow | ProgramRow[] | null };
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const p = Array.isArray(r.sound_programs) ? r.sound_programs[0] : r.sound_programs;
      return p ? fromRow(p, true, { savedAt: r.saved_at, label: r.label }) : null;
    })
    .filter((p): p is ApiProgram => !!p);
}
