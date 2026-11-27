/**
 * Personal program sets (§7).
 *
 *   GET  ?set=today|chapter|strengths|challenges|saved&date=YYYY-MM-DD&tz=Area/City
 *        Signed in. Computes the set from the account's birth profile on first
 *        open, stores it once (idempotent), and returns the stored programs.
 *   POST { set, date, tz, profile }
 *        Anyone. Same programs from birth details kept in the browser; nothing
 *        is stored, so these can be played but not saved.
 */
import type { APIRoute } from 'astro';
import { BrowserProfileSchema, browserToBirthProfile, isValidTimeZone, isYmd, localDate, rowToBirthProfile } from '@/lib/sound/profile';
import { computeSignals } from '@/lib/sound/signals';
import { PROGRAM_SETS, buildProgramSet, type ProgramSet } from '@/lib/sound/programs';
import { callerFrom, currentProfile, fail, fromGenerated, json, readJson, savedPrograms, serviceClient, storePrograms } from '@/lib/sound/server';

export const prerender = false;

const SETS = [...PROGRAM_SETS, 'saved'] as const;
type SetParam = (typeof SETS)[number];

/** "Today" is the member's day: allow their calendar date to be a day either side of UTC. */
function dayIsPlausible(date: string): boolean {
  const t = Date.parse(`${date}T12:00:00Z`);
  return Math.abs(t - Date.now()) <= 1.6 * 86_400_000;
}

function resolveDay(dateParam: unknown, tzParam: unknown, fallbackTz: string) {
  const tz = typeof tzParam === 'string' && isValidTimeZone(tzParam) ? tzParam : fallbackTz;
  const date = isYmd(dateParam) ? dateParam : localDate(new Date(), tz);
  return { tz, date };
}

export const GET: APIRoute = async ({ request, url }) => {
  const set = (url.searchParams.get('set') ?? 'today') as SetParam;
  if (!SETS.includes(set)) return fail(400, 'unknown-set');
  const caller = await callerFrom(request);
  if (!caller) return fail(401, 'sign-in-required');

  try {
    if (set === 'saved') return json({ set, programs: await savedPrograms(caller) });

    const row = await currentProfile(caller.db, caller.user.id);
    if (!row) return fail(404, 'no-profile', 'Add your birth details in Life Rhythm to get personal programs.');
    const { tz, date } = resolveDay(url.searchParams.get('date'), url.searchParams.get('tz'), row.tz);
    if (!dayIsPlausible(date)) return fail(400, 'bad-date');

    const profile = rowToBirthProfile(row);
    const signals = computeSignals(profile, date, tz);
    const generated = buildProgramSet(set as ProgramSet, signals, profile);
    const service = serviceClient();
    const programs = service ? await storePrograms(service, caller, generated, signals) : generated.map(fromGenerated);
    return json({ set, date, timeZone: tz, dayTempo: signals.dayTempo, stored: !!service, programs });
  } catch {
    return fail(500, 'programs-failed', 'Your programs could not be made just now.');
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await readJson(request)) as Record<string, unknown>;
  } catch {
    return fail(400, 'bad-json');
  }
  const set = (body.set ?? 'today') as SetParam;
  if (!PROGRAM_SETS.includes(set as ProgramSet)) return fail(400, 'unknown-set');
  const parsed = BrowserProfileSchema.safeParse(body.profile);
  if (!parsed.success) return fail(400, 'invalid-profile');
  const { tz, date } = resolveDay(body.date, body.tz, parsed.data.ianaTimezone || 'UTC');
  if (!dayIsPlausible(date)) return fail(400, 'bad-date');
  try {
    const profile = browserToBirthProfile(parsed.data);
    const signals = computeSignals(profile, date, tz);
    const programs = buildProgramSet(set as ProgramSet, signals, profile).map(fromGenerated);
    return json({ set, date, timeZone: tz, dayTempo: signals.dayTempo, stored: false, programs });
  } catch {
    return fail(500, 'programs-failed', 'Your programs could not be made just now.');
  }
};
