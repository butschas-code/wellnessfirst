import type { Session } from '@supabase/supabase-js';
import { MEMBER_HOME_PATH } from '@/lib/auth/constants';

/** If the visitor already has a confirmed, usable session, send them to My Wellness Space. */
export function redirectIfAuthenticatedSession(session: Session | null): boolean {
  if (!session?.user) return false;
  if (!session.user.email_confirmed_at) return false;
  window.location.replace(MEMBER_HOME_PATH);
  return true;
}
