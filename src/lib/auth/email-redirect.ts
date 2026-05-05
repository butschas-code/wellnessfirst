import { VERIFY_EMAIL_PATH } from '@/lib/auth/constants';

/**
 * Absolute URL Supabase redirects to after email actions (signup confirm, magic link, etc.).
 *
 * Supabase Dashboard (Auth → URL configuration):
 * - Add this path (and origin) to **Redirect URLs** allow list, e.g. `http://localhost:4321/verify-email` and production `https://www.wellnessfirstglobal.com/verify-email` (include apex too if you use it).
 * - Set **Site URL** to your primary production origin.
 * - For production deliverability, configure **Custom SMTP** (Project Settings → Auth) if the default quota is tight.
 *
 * Email templates (Auth → Email templates):
 * - “Confirm signup”: can use `{{ .Token }}` for a numeric code when your project sends OTP-style mail, or the default link.
 * - Ensure links in templates match your **Site URL** / redirect allow list.
 */
export function authEmailRedirectUrl(pathname: string = VERIFY_EMAIL_PATH): string {
  if (typeof window === 'undefined') {
    return pathname;
  }
  return `${window.location.origin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
