/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Supabase project URL (public, safe in client bundle) */
  readonly PUBLIC_SUPABASE_URL?: string;
  /** Supabase anonymous key (public, protected by RLS in Supabase) */
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /**
   * Public marketing forms: default (unset) uses Cloudflare Pages Functions (`/api/*`).
   * Set to `mailto` for local dev without `wrangler pages dev` (mailto handoff).
   */
  readonly PUBLIC_FORM_MODE?: 'mailto' | 'api' | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
