/**
 * Cloudflare Pages Functions (see `/functions/api`). Submits as `application/x-www-form-urlencoded`.
 */
export const FORM_API = {
  contact: '/api/contact',
  newsletter: '/api/newsletter',
  webinarInterest: '/api/webinar-interest',
} as const;

/** When `import.meta.env.PUBLIC_FORM_MODE === 'mailto'`, client uses mailto instead of API (local dev). */
export function isFormApiMode(): boolean {
  return import.meta.env.PUBLIC_FORM_MODE !== 'mailto';
}
