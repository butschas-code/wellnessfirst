/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Supabase project URL (public, safe in client bundle) */
  readonly PUBLIC_SUPABASE_URL?: string;
  /** Supabase anonymous key (public, protected by RLS in Supabase) */
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /**
   * Marketing forms: `mailto` → mailto handoff. Any other non-empty value → POST `/api/*`
   * (Cloudflare Pages Functions only). When unset, see `isFormApiMode()` in `forms-config.ts`
   * (Vercel + local dev default to mailto; Cloudflare production defaults to API).
   */
  readonly PUBLIC_FORM_MODE?: 'mailto' | 'api' | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Build-time deploy family — injected in `astro.config.mjs` (`vite.define`). */
declare const __WFG_DEPLOY_TARGET__: 'vercel' | 'cloudflare';
