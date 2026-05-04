import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const u = import.meta.env.PUBLIC_SUPABASE_URL;
  const k = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(u && k && u.length > 0 && k.length > 0);
}

/**
 * Browser-only Supabase client (static site: session in localStorage, PKCE).
 * Call only from client scripts / components. Throws if env missing.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser() must run in the browser');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured (set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY)');
  }
  if (!_client) {
    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (typeof url !== 'string' || !url || typeof key !== 'string' || !key) {
      throw new Error('Supabase is not configured (set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY)');
    }
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Default GoTrue flow is `implicit` (tokens in URL hash). Supabase “confirm signup” emails
        // commonly redirect that way. `pkce` rejects hash-token redirects (“Not a valid PKCE flow url”),
        // which leaves users stuck on `/verify-email` while the email only contains a link.
      },
    });
  }
  return _client;
}
