import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function resolvePublicSupabaseEnv(): { url: string; anonKey: string } {
  const url =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ??
    process.env.PUBLIC_SUPABASE_URL ??
    '';
  const anonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ??
    process.env.PUBLIC_SUPABASE_ANON_KEY ??
    '';
  if (!url || !anonKey) {
    throw new Error(
      'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY (needed for server/build Supabase client)'
    );
  }
  return { url: String(url), anonKey: String(anonKey) };
}

/**
 * Supabase client for server-side code: Astro endpoints (`export const prerender = false`),
 * server islands later, Node scripts, or Vercel server routes.
 *
 * Uses the **anon** key only — never ship `service_role` to the browser or member bundles.
 * Row Level Security in Supabase should enforce access; pass a user JWT when you need RLS as that user.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const { url, anonKey } = resolvePublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Same anon client, scoped with the caller’s access token (e.g. `Authorization: Bearer …`).
 * Use after verifying the JWT or forwarding a trusted session from your API route.
 */
export async function createSupabaseServerClientForUser(
  accessToken: string,
  refreshToken?: string
): Promise<SupabaseClient> {
  const client = createSupabaseServerClient();
  await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
  return client;
}

/** Reads `Authorization: Bearer <access_token>` when present; otherwise returns an anon-only client. */
export async function createSupabaseServerClientFromAuthHeader(
  request: Request
): Promise<SupabaseClient> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) return createSupabaseServerClient();
  return createSupabaseServerClientForUser(token);
}
