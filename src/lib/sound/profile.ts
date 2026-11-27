/**
 * Birth profile — one shape for the browser (Life Rhythm), the account
 * (`astro_profiles`) and the program pipeline. Pure; no Supabase, no DOM.
 */

import { z } from 'zod';

/** Bump when the consent wording in Life Rhythm changes. */
export const CONSENT_VERSION = 'birth-details@1';

export const CONSENT_TEXT =
  'Save these birth details to my Wellness First account, so Life Rhythm and Wellness Waves can use them on any device I sign in on. I can remove them at any time.';

const ymd = /^\d{4}-\d{2}-\d{2}$/;
const hm = /^\d{2}:\d{2}$/;

/** What Life Rhythm keeps in the browser (`wfg_astro_active_profile`). */
export const BrowserProfileSchema = z.object({
  name: z.string().max(80).default(''),
  birthDate: z.string().regex(ymd),
  birthTime: z.string().regex(hm),
  isTimeUnknown: z.boolean().default(false),
  cityName: z.string().min(1).max(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.number().min(-14).max(14),
  ianaTimezone: z.string().max(64).optional(),
});
export type BrowserProfile = z.infer<typeof BrowserProfileSchema>;

/** What the program pipeline needs: the birth moment and place, plus where it came from. */
export interface BirthProfile {
  /** `astro_profiles.id`, or 'device' for details that only live in this browser. */
  id: string;
  version: number;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  lat: number;
  lon: number;
  /** UTC offset in hours at the birth moment. */
  tzOffsetHours: number;
  tz: string;
}

/** A row of `astro_profiles` (columns used here). */
export interface AstroProfileRow {
  id: string;
  user_id: string;
  lineage_id: string;
  version: number;
  label: string;
  display_name: string | null;
  birth_date: string;
  birth_time: string;
  time_unknown: boolean;
  place_name: string;
  lat: number;
  lon: number;
  tz: string;
  tz_offset_hours: number | string;
  ayanamsa: string;
  is_primary: boolean;
  superseded_at: string | null;
  consent_at: string;
  consent_version: string;
  created_at: string;
}

export const SaveProfileSchema = z.object({
  consent: z.literal(true),
  label: z.string().min(1).max(40).default('Me'),
  profile: BrowserProfileSchema,
});

export function rowToBrowserProfile(r: AstroProfileRow): BrowserProfile {
  return {
    name: r.display_name ?? '',
    birthDate: r.birth_date,
    birthTime: r.birth_time.slice(0, 5),
    isTimeUnknown: r.time_unknown,
    cityName: r.place_name,
    latitude: r.lat,
    longitude: r.lon,
    timezone: Number(r.tz_offset_hours),
    ianaTimezone: r.tz,
  };
}

export function rowToBirthProfile(r: AstroProfileRow): BirthProfile {
  return {
    id: r.id,
    version: r.version,
    birthDate: r.birth_date,
    birthTime: r.birth_time.slice(0, 5),
    timeUnknown: r.time_unknown,
    lat: r.lat,
    lon: r.lon,
    tzOffsetHours: Number(r.tz_offset_hours),
    tz: r.tz,
  };
}

export function browserToBirthProfile(p: BrowserProfile, id = 'device', version = 1): BirthProfile {
  return {
    id,
    version,
    birthDate: p.birthDate,
    birthTime: p.isTimeUnknown ? '12:00' : p.birthTime,
    timeUnknown: p.isTimeUnknown,
    lat: p.latitude,
    lon: p.longitude,
    tzOffsetHours: p.timezone,
    tz: p.ianaTimezone || 'UTC',
  };
}

/** True when two sets of details describe the same birth (so no new version is needed). */
export function sameBirth(a: BrowserProfile, b: BrowserProfile): boolean {
  const t = (p: BrowserProfile) => (p.isTimeUnknown ? 'unknown' : p.birthTime);
  return (
    a.birthDate === b.birthDate &&
    t(a) === t(b) &&
    a.cityName === b.cityName &&
    Math.abs(a.latitude - b.latitude) < 1e-6 &&
    Math.abs(a.longitude - b.longitude) < 1e-6 &&
    Math.abs(a.timezone - b.timezone) < 1e-6 &&
    (a.name ?? '') === (b.name ?? '')
  );
}

/** Calendar date (YYYY-MM-DD) in a time zone. */
export function localDate(at: Date, timeZone: string): string {
  try {
    return at.toLocaleDateString('en-CA', { timeZone });
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const isYmd = (s: unknown): s is string => typeof s === 'string' && ymd.test(s) && !Number.isNaN(Date.parse(s));
