/**
 * Life Rhythm — birth details on the member's account (Phase 3).
 * Thin client for /api/astro/profile. Signed-out visitors never call it:
 * their details stay in this browser only.
 */
import { getSupabaseBrowser, isSupabaseConfigured } from '../lib/supabase/browser.ts';
import type { UserBirthProfile } from './astro-ui.ts';

export interface AccountProfile {
  id: string;
  version: number;
  savedAt: string;
  profile: UserBirthProfile;
}

export async function accountToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await getSupabaseBrowser().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

export async function loadAccountProfile(token: string): Promise<AccountProfile | null> {
  const res = await fetch('/api/astro/profile', { headers: headers(token) });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  const body = await res.json();
  return body.profile ?? null;
}

export async function saveAccountProfile(token: string, profile: UserBirthProfile): Promise<AccountProfile> {
  const res = await fetch('/api/astro/profile', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ consent: true, label: 'Me', profile: { ...profile, name: profile.name ?? '' } }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Your birth details could not be saved.');
  return body as AccountProfile;
}

export async function removeAccountProfile(token: string): Promise<void> {
  const res = await fetch('/api/astro/profile', { method: 'DELETE', headers: headers(token) });
  if (!res.ok) throw new Error('Your birth details could not be removed.');
}

/** Same birth (ignores name changes in the browser copy's formatting). */
export function sameDetails(a: UserBirthProfile, b: UserBirthProfile): boolean {
  return (
    a.birthDate === b.birthDate &&
    (a.isTimeUnknown ? 'u' : a.birthTime) === (b.isTimeUnknown ? 'u' : b.birthTime) &&
    Math.abs(a.latitude - b.latitude) < 1e-6 &&
    Math.abs(a.longitude - b.longitude) < 1e-6 &&
    (a.name ?? '') === (b.name ?? '')
  );
}
