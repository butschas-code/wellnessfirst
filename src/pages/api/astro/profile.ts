/**
 * Birth profile on the account (Phase 3, §5.1).
 *
 *   GET     the member's current primary profile, or { profile: null }
 *   POST    { consent: true, label?, profile } saves it; changed details add a new version
 *   DELETE  removes every version (programs already made stay playable, unlinked)
 *
 * Signed-in members only (Authorization: Bearer <access token>); RLS owner-only.
 */
import type { APIRoute } from 'astro';
import { CONSENT_VERSION, SaveProfileSchema, isValidTimeZone, rowToBrowserProfile, sameBirth, type AstroProfileRow } from '@/lib/sound/profile';
import { callerFrom, currentProfile, fail, json, readJson } from '@/lib/sound/server';

export const prerender = false;

const view = (r: AstroProfileRow) => ({
  id: r.id,
  version: r.version,
  label: r.label,
  savedAt: r.created_at,
  consentAt: r.consent_at,
  profile: rowToBrowserProfile(r),
});

export const GET: APIRoute = async ({ request }) => {
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  try {
    const row = await currentProfile(caller.db, caller.user.id);
    return json({ profile: row ? view(row) : null });
  } catch {
    return fail(500, 'profile-read-failed');
  }
};

export const POST: APIRoute = async ({ request }) => {
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return fail(400, 'bad-json');
  }
  const parsed = SaveProfileSchema.safeParse(body);
  if (!parsed.success) {
    const consent = parsed.error.issues.some((i) => i.path[0] === 'consent');
    return fail(400, consent ? 'consent-required' : 'invalid-profile', consent ? 'Please agree to saving your birth details first.' : 'Some birth details look wrong.');
  }
  const { profile: p, label } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  if (p.birthDate > today) return fail(400, 'invalid-profile', 'The date of birth is in the future.');
  const tz = p.ianaTimezone && isValidTimeZone(p.ianaTimezone) ? p.ianaTimezone : 'UTC';

  try {
    const current = await currentProfile(caller.db, caller.user.id);
    if (current && sameBirth(rowToBrowserProfile(current), { ...p, ianaTimezone: tz })) {
      return json({ ...view(current), created: false });
    }
    const now = new Date().toISOString();
    // The one-primary index allows a single current row: retire the old version first.
    if (current) {
      const { error } = await caller.db.from('astro_profiles').update({ superseded_at: now }).eq('id', current.id);
      if (error) throw error;
    }
    const { data, error } = await caller.db
      .from('astro_profiles')
      .insert({
        user_id: caller.user.id,
        ...(current ? { lineage_id: current.lineage_id } : {}),
        version: current ? current.version + 1 : 1,
        label,
        display_name: p.name || null,
        birth_date: p.birthDate,
        birth_time: p.isTimeUnknown ? '12:00' : p.birthTime,
        time_unknown: p.isTimeUnknown,
        place_name: p.cityName,
        lat: p.latitude,
        lon: p.longitude,
        tz,
        tz_offset_hours: p.timezone,
        is_primary: true,
        consent_at: now,
        consent_version: CONSENT_VERSION,
      })
      .select('*')
      .single();
    if (error) {
      // Put the previous version back so the member never ends up without one.
      if (current) await caller.db.from('astro_profiles').update({ superseded_at: null }).eq('id', current.id);
      throw error;
    }
    return json({ ...view(data as AstroProfileRow), created: true }, 201);
  } catch {
    return fail(500, 'profile-save-failed', 'Your birth details could not be saved. Please try again.');
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');
  const { error } = await caller.db.from('astro_profiles').delete().eq('user_id', caller.user.id);
  if (error) return fail(500, 'profile-delete-failed');
  return json({ deleted: true });
};
