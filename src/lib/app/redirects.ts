/**
 * Open redirect protection: only allow known member paths as post-login targets.
 */
export function safeMemberNextParam(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/app/dashboard';
  if (raw.includes('//') || raw.includes('..')) return '/app/dashboard';
  if (raw.startsWith('/app/')) return raw;
  if (raw.startsWith('/community/')) return raw;
  return '/app/dashboard';
}
