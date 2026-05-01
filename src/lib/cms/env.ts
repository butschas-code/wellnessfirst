/**
 * `PUBLIC_CMS_ALLOWED_EMAILS` — comma‑separated Supabase user emails that may open `/app/cms/*`.
 * Empty means no one can access the hub (Decap on `/admin/` may still be used if you configure its GitHub auth separately).
 */
export function getCmsAllowlistFromEnv(): string[] {
  const raw = import.meta.env.PUBLIC_CMS_ALLOWED_EMAILS;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForCms(email: string | undefined, allowlist: string[]): boolean {
  if (!email || allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
