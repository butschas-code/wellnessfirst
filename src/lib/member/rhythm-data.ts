/**
 * Life Rhythm and Wellness Waves for the Wellness Space: the birth details saved
 * to the account and the programs the member saved. Both come from the site's
 * own API under the member's token (RLS owner-only), never straight from tables.
 */

export interface RhythmProfile {
  savedAt: string;
  profile: { name: string; birthDate: string; birthTime: string; isTimeUnknown: boolean; cityName: string };
}

export interface SavedProgram {
  id: string;
  name: string;
  description: string;
  slot?: 'morning' | 'midday' | 'evening' | null;
  savedAt?: string | null;
  label?: string | null;
}

export interface RhythmData {
  profile: RhythmProfile | null;
  programs: SavedProgram[];
  error: string | null;
}

export async function fetchRhythmData(token: string): Promise<RhythmData> {
  const headers = { Authorization: `Bearer ${token}` };
  const out: RhythmData = { profile: null, programs: [], error: null };
  const [p, s] = await Promise.allSettled([
    fetch('/api/astro/profile', { headers }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`profile ${r.status}`)))),
    fetch('/api/sound/programs?set=saved', { headers }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`programs ${r.status}`)))),
  ]);
  if (p.status === 'fulfilled') out.profile = p.value.profile ?? null;
  else out.error = String(p.reason);
  if (s.status === 'fulfilled') out.programs = s.value.programs ?? [];
  else out.error = out.error ?? String(s.reason);
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const link = 'text-sm font-medium text-secondary underline decoration-line underline-offset-4';

function formatBirth(p: RhythmProfile['profile']): string {
  const d = new Date(`${p.birthDate}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${d}${p.isTimeUnknown ? ' · time unknown' : ` · ${p.birthTime}`} · ${p.cityName}`;
}

/** The birth-details card: what is saved, or how to save it. */
export function profileHtml(profile: RhythmProfile | null): string {
  if (!profile) {
    return `<div class="max-w-xl border-l-[3px] border-secondary/35 pl-5 sm:pl-6">
      <p class="font-display text-lg text-ink">No birth details saved yet</p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600">Fill in Life Rhythm and tick “save to my account”. Your rhythm then opens on any device, and Wellness Waves makes sound programs from it.</p>
      <a class="btn-primary mt-6 inline-flex min-h-11 items-center justify-center px-8" href="/liferhythm#lr-intake">Open Life Rhythm</a>
    </div>`;
  }
  const p = profile.profile;
  return `<div class="max-w-2xl rounded-xl border border-ink/[0.08] bg-white/80 p-7 shadow-sm shadow-ink/[0.03]">
    <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Saved birth details</p>
    <p class="font-display mt-3 text-2xl tracking-tight text-ink">${esc(p.name || 'You')}</p>
    <p class="mt-2 text-sm text-ink-600">${esc(formatBirth(p))}</p>
    <div class="mt-6 flex flex-wrap gap-x-6 gap-y-3">
      <a class="${link}" href="/liferhythm#lr-results">See your rhythm →</a>
      <a class="${link}" href="/sound?programs=for-you">Your programs in Wellness Waves →</a>
    </div>
  </div>`;
}

const SLOT: Record<string, string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };

/** Saved programs, newest first. `limit` trims the list for the overview. */
export function programsHtml(programs: SavedProgram[], limit?: number): string {
  if (!programs.length) {
    return `<div class="max-w-xl border-l-[3px] border-secondary/35 pl-5 sm:pl-6">
      <p class="font-display text-lg text-ink">No saved programs yet</p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600">In Wellness Waves, open Programs → For you and tap Save on a program you like. It stays here and plays exactly the same later.</p>
      <a class="mt-4 inline-flex ${link}" href="/sound?programs=for-you">Open Wellness Waves</a>
    </div>`;
  }
  const shown = limit ? programs.slice(0, limit) : programs;
  const rows = shown
    .map((p) => {
      const first = p.description.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.');
      const slot = p.slot ? `<span class="mt-1 block text-xs uppercase tracking-wider text-ink-400">${esc(SLOT[p.slot] ?? p.slot)}</span>` : '';
      return `<li class="border-b border-ink/[0.06] py-6 first:pt-0">
        <a class="group block" href="/sound?programs=for-you">
          <span class="font-display text-xl text-ink transition-colors group-hover:text-secondary">${esc(p.label || p.name)}</span>
          ${slot}
          <span class="mt-2 line-clamp-2 block text-sm text-ink-500">${esc(first)}</span>
        </a>
      </li>`;
    })
    .join('');
  const more = limit && programs.length > limit ? `<p class="mt-8"><a class="${link}" href="/my-wellness-space/rhythm">All ${programs.length} saved programs</a></p>` : '';
  return `<ul class="max-w-2xl">${rows}</ul>${more}`;
}
