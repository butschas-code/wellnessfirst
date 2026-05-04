import type { Session } from '@supabase/supabase-js';
import { LOGIN_PATH } from '@/lib/auth/constants';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

/**
 * Static-site pattern: require an authenticated user or redirect to sign-in.
 * When moving to `output: 'server'` or `hybrid`, replace with Supabase cookie + `middleware` + `@supabase/ssr`.
 *
 * @returns session if authenticated; `null` if unconfigured, or after redirect (no session)
 */
export async function guardSessionOrRedirect(): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = getSupabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.replace(`${LOGIN_PATH}?next=${next}`);
    return null;
  }
  return session;
}
