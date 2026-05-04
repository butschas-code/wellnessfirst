/**
 * Cloudflare Pages Functions (see `/functions/api`). Submits as `application/x-www-form-urlencoded`.
 * Not available on default Vercel static hosting unless you add matching routes.
 */
export const FORM_API = {
  contact: '/api/contact',
  newsletter: '/api/newsletter',
  webinarInterest: '/api/webinar-interest',
} as const;

/**
 * Whether contact / newsletter / webinar-interest forms POST to `/api/*`.
 *
 * - `PUBLIC_FORM_MODE=mailto` → always mailto.
 * - Any other non-empty `PUBLIC_FORM_MODE` → always API (e.g. proxy or Cloudflare).
 * - Unset: **local dev** (`import.meta.env.DEV`) → mailto; **production Cloudflare** → API;
 *   **production Vercel** → mailto (`__WFG_DEPLOY_TARGET__` from `astro.config.mjs`).
 */
export function isFormApiMode(): boolean {
  const mode = import.meta.env.PUBLIC_FORM_MODE;
  if (mode === 'mailto') return false;
  if (typeof mode === 'string' && mode.length > 0 && mode !== 'mailto') return true;
  if (import.meta.env.DEV) return false;
  return __WFG_DEPLOY_TARGET__ === 'cloudflare';
}
