/**
 * Life Rhythm — shared UI helpers: storage, geocoding, time zones, formatting,
 * place search and the 12-hour time picker.
 */
import type { PlanetName } from '../lib/astro-engine/index.ts';

/* ═══════════════════════════ Types & storage ═══════════════════════════ */

export interface GeocodedPlace {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string; // IANA
}

export interface UserBirthProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM (24h)
  isTimeUnknown: boolean;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset in hours at birth
  ianaTimezone?: string;
}

export const STORAGE_KEY = 'wfg_astro_active_profile';
export const PARTNER_STORAGE_KEY = 'wfg_astro_partner_profile';
export const MODE_KEY = 'wfg_astro_view_mode';

export const SAMPLE_PROFILE: UserBirthProfile = {
  name: 'Alex',
  birthDate: '1992-06-21',
  birthTime: '08:45',
  isTimeUnknown: false,
  cityName: 'London, United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 1,
  ianaTimezone: 'Europe/London',
};

export const SAMPLE_PARTNER: UserBirthProfile = {
  name: 'Jordan',
  birthDate: '1994-09-15',
  birthTime: '14:20',
  isTimeUnknown: false,
  cityName: 'New York, United States',
  latitude: 40.7128,
  longitude: -74.006,
  timezone: -4,
  ianaTimezone: 'America/New_York',
};

export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function storageSet(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    /* private mode — fine */
  }
}

/* ═══════════════════════════ Geo & time helpers ═══════════════════════════ */

/** Worldwide place search via the free Open-Meteo geocoding API (only the typed text is sent). */
export async function searchGlobalPlaces(query: string, signal?: AbortSignal): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query.trim()
  )}&count=8&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.results)) return [];
  return data.results.map((r: any) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || 'UTC',
  }));
}

/** UTC offset (hours) of an IANA zone at a given instant — handles historical DST. */
export function getTimezoneOffsetHours(timeZone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date);
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const m = tz.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (m) return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60);
  } catch {
    /* unknown zone */
  }
  return 0;
}

/** Local birth date/time + offset → UTC Date. */
export function buildUtcDate(dateStr: string, timeStr: string, tzOffsetHours: number): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = (timeStr || '12:00').split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0) - tzOffsetHours * 3_600_000);
}

export function offsetForLocal(iana: string, dateStr: string, timeStr: string): number {
  // First guess with the naive UTC instant, then refine once (covers DST edges).
  const guess = getTimezoneOffsetHours(iana, buildUtcDate(dateStr, timeStr, 0));
  return getTimezoneOffsetHours(iana, buildUtcDate(dateStr, timeStr, guess));
}

/* ═══════════════════════════ Formatting ═══════════════════════════ */

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const fmtLong = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtMonthYear = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
export const fmtISO = (d: Date) => d.toISOString().slice(0, 10);
export const fmtWeekday = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function fmtBirthDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return fmtLong(new Date(y, m - 1, d));
}

export function fmtClock(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const h = parseInt(hs, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return ms === '00' ? `${h12}${suffix}` : `${h12}:${ms}${suffix}`;
}

export function fmtOffset(h: number) {
  const sign = h < 0 ? '−' : '+';
  const a = Math.abs(h);
  const hh = Math.floor(a);
  const mm = Math.round((a - hh) * 60);
  return `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
}

export const YEAR_MS = 365.2425 * 86_400_000;
export const yearsBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / YEAR_MS;

export function durationPhrase(years: number): string {
  if (years < 1 / 12) return 'a few weeks';
  if (years < 1) {
    const m = Math.max(1, Math.round(years * 12));
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  const y = Math.round(years);
  return `about ${y} year${y === 1 ? '' : 's'}`;
}

export const PLANET_ABBR: Record<PlanetName, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};
export const PLANET_ORDER: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export const proBlock = (inner: string, label = 'Pro detail') =>
  `<div class="lr-pro lr-pro-block"><p class="lr-pro-tag">${esc(label)}</p>${inner}</div>`;

export const kv = (rows: Array<[string, string]>) =>
  `<dl class="lr-kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

export const table = (head: string[], rows: string[][], rowClass: (i: number) => string = () => '') =>
  `<div class="lr-table-wrap"><table class="lr-table"><thead><tr>${head
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r, i) => `<tr class="${rowClass(i)}">${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

export const list = (items: string[], ease = false) =>
  `<ul class="lr-list${ease ? ' lr-list-ease' : ''}" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/* ═══════════════════════════ Place search widget ═══════════════════════════ */

export function attachPlaceSearch(
  input: HTMLInputElement,
  listEl: HTMLElement,
  onPick: (p: GeocodedPlace | null) => void
) {
  let timer: number | undefined;
  let ctrl: AbortController | undefined;
  let results: GeocodedPlace[] = [];
  let active = -1;

  const close = () => {
    listEl.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const label = (p: GeocodedPlace) => [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : '', p.country].filter(Boolean).join(', ');

  const paint = (msg?: string) => {
    listEl.innerHTML = msg
      ? `<p class="lr-place-empty">${esc(msg)}</p>`
      : results
          .map(
            (p, i) => `<button type="button" role="option" id="${listEl.id}-${i}" data-i="${i}" aria-selected="${i === active}">
              <span class="lr-place-name">${esc(p.name)}</span>
              <span class="lr-place-sub">${esc([p.admin1, p.country].filter(Boolean).join(', '))}</span>
            </button>`
          )
          .join('');
    listEl.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `${listEl.id}-${active}`);
  };

  const pick = (i: number) => {
    const p = results[i];
    if (!p) return;
    input.value = label(p);
    onPick(p);
    close();
  };

  input.addEventListener('input', () => {
    onPick(null);
    window.clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return close();
    timer = window.setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      paint('Searching…');
      try {
        results = await searchGlobalPlaces(q, ctrl.signal);
        active = results.length ? 0 : -1;
        results.length ? paint() : paint('No places found. Try the nearest larger town.');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') paint('Place search is unavailable right now. Please try again.');
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (listEl.hidden || !results.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(Math.max(active, 0));
    } else if (e.key === 'Escape') {
      close();
    }
  });

  listEl.addEventListener('mousedown', (e) => e.preventDefault());
  listEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]');
    if (b) pick(Number(b.dataset.i));
  });
  input.addEventListener('blur', () => window.setTimeout(close, 120));
}

/* ═══════════════════════════ 12-hour time picker ═══════════════════════════ */

export interface TimePicker {
  set(hhmm: string): void;
  setDisabled(disabled: boolean): void;
}

/** Hour (1–12) + minute + explicit AM/PM. Writes "HH:MM" (24h) to `hidden`. */
export function mountTimePicker(container: HTMLElement, hidden: HTMLInputElement): TimePicker {
  const id = container.dataset.lrTimepicker || hidden.id;
  container.innerHTML = `
    <div class="lr-time" role="group" aria-label="Time of birth">
      <select id="${id}-h" class="input-wfg" aria-label="Hour">
        ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
      </select>
      <span class="lr-time-colon" aria-hidden="true">:</span>
      <select id="${id}-m" class="input-wfg" aria-label="Minutes">
        ${Array.from({ length: 60 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
      </select>
      <div class="lr-ampm" role="radiogroup" aria-label="AM or PM">
        <button type="button" role="radio" data-p="AM" aria-checked="false">AM</button>
        <button type="button" role="radio" data-p="PM" aria-checked="true">PM</button>
      </div>
    </div>`;
  const wrap = container.firstElementChild as HTMLElement;
  const hour = container.querySelector<HTMLSelectElement>(`#${id}-h`)!;
  const min = container.querySelector<HTMLSelectElement>(`#${id}-m`)!;
  const periodBtns = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-p]'));
  let period: 'AM' | 'PM' = 'PM';

  const paintPeriod = () => periodBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.p === period)));
  const write = () => {
    let h = Number(hour.value) % 12;
    if (period === 'PM') h += 12;
    hidden.value = `${String(h).padStart(2, '0')}:${String(Number(min.value)).padStart(2, '0')}`;
  };
  const set = (hhmm: string) => {
    const [hs, ms] = (hhmm || '12:00').split(':');
    const h24 = Math.min(23, Math.max(0, parseInt(hs, 10) || 0));
    period = h24 >= 12 ? 'PM' : 'AM';
    hour.value = String(h24 % 12 === 0 ? 12 : h24 % 12);
    min.value = String(Math.min(59, Math.max(0, parseInt(ms, 10) || 0)));
    paintPeriod();
    write();
  };

  hour.addEventListener('change', write);
  min.addEventListener('change', write);
  periodBtns.forEach((b) =>
    b.addEventListener('click', () => {
      period = b.dataset.p as 'AM' | 'PM';
      paintPeriod();
      write();
    })
  );
  container.querySelector('.lr-ampm')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return;
    e.preventDefault();
    period = period === 'AM' ? 'PM' : 'AM';
    paintPeriod();
    write();
    periodBtns.find((b) => b.dataset.p === period)?.focus();
  });

  set(hidden.value);
  return {
    set,
    setDisabled(disabled: boolean) {
      hour.disabled = disabled;
      min.disabled = disabled;
      periodBtns.forEach((b) => (b.disabled = disabled));
      if (disabled) wrap.setAttribute('data-disabled', '');
      else wrap.removeAttribute('data-disabled');
    },
  };
}

