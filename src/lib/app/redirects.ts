import { MEMBER_HOME_PATH } from '@/lib/auth/constants';

/**
 * Open redirect protection: only allow known member paths as post-login targets.
 */
export function safeMemberNextParam(raw: string | null | undefined): string {
  const fallback = MEMBER_HOME_PATH;
  if (!raw || typeof raw !== 'string') return fallback;
  if (raw.includes('//') || raw.includes('..')) return fallback;
  if (raw.startsWith('/my-wellness-space')) return raw;
  if (raw.startsWith('/app/')) return raw;
  if (raw.startsWith('/community/')) return raw;
  return fallback;
}
