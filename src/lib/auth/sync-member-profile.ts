import type { SupabaseClient, User } from '@supabase/supabase-js';

function coalesceNewsletter(meta: Record<string, unknown> | undefined): boolean {
  if (!meta || typeof meta !== 'object') return false;
  const v = meta['newsletter_opt_in'];
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.toLowerCase());
  return false;
}

function coalesceFullName(meta: Record<string, unknown> | undefined): string {
  if (!meta || typeof meta !== 'object') return '';
  const n = meta['full_name'];
  return typeof n === 'string' ? n.trim() : '';
}

/**
 * Ensures `public.profiles` reflects auth user + signup metadata (RLS: own row only).
 * Safe to call after sign-up (if a session exists), after `verifyOtp`, or on first login.
 */
export async function syncMemberProfileFromUser(
  supabase: SupabaseClient,
  user: User,
  overrides?: { full_name?: string; newsletter_opt_in?: boolean }
): Promise<{ error: string | null }> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full_name = (overrides?.full_name ?? coalesceFullName(meta)) || null;
  const newsletter_opt_in =
    overrides?.newsletter_opt_in !== undefined
      ? overrides.newsletter_opt_in
      : coalesceNewsletter(meta);

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name,
      newsletter_opt_in,
    },
    { onConflict: 'id' }
  );

  if (error) {
    const msg = error.message ?? '';
    if (/relation ['"]?profiles['"]? does not exist/i.test(msg) || /Could not find the table/i.test(msg)) {
      return {
        error:
          'The member database is not set up yet (the profiles table is missing). In your Supabase project, run the SQL migrations in supabase/migrations/ — see supabase/README.md — then try again.',
      };
    }
    return { error: msg };
  }
  return { error: null };
}
