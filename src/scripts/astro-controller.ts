/**
 * Life Rhythm — client controller for /astro.
 *
 * Runs the deterministic engine in the browser and renders two layers from the same data:
 *  - Simple view: plain English only (see src/lib/astro-copy.ts)
 *  - Pro detail:  `.lr-pro` blocks + the Chart data tab with full technical workings
 */
import {
  calculateJanamKundli,
  calculatePanchang,
  calculateChoghadiya,
  calculateAshtakoota,
  calculateRelationalSynastry,
  calculateGocharaTransits,
  processAstroQuestion,
  type ComprehensiveKundliResult,
  type PlanetName,
  type ElementType,
  type DashaPeriod,
} from '../lib/astro-engine/index.ts';
import {
  CHAPTERS,
  STRENGTHS,
  ELEMENTS,
  DAY_TONE,
  HOURS,
  ASK_LEVEL,
  ASK_TOPIC,
  ASK_EXAMPLES,
  KOOTA_PLAIN,
  SYNERGY_PLAIN,
  DAILY_RHYTHM,
  compatibilityCopy,
  temperamentHeadline,
  type HourTone,
} from '../lib/astro-copy.ts';

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

const STORAGE_KEY = 'wfg_astro_active_profile';
const PARTNER_STORAGE_KEY = 'wfg_astro_partner_profile';
const MODE_KEY = 'wfg_astro_view_mode';

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

function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function storageSet(key: string, value: unknown) {
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

function offsetForLocal(iana: string, dateStr: string, timeStr: string): number {
  // First guess with the naive UTC instant, then refine once (covers DST edges).
  const guess = getTimezoneOffsetHours(iana, buildUtcDate(dateStr, timeStr, 0));
  return getTimezoneOffsetHours(iana, buildUtcDate(dateStr, timeStr, guess));
}

/* ═══════════════════════════ Formatting ═══════════════════════════ */

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmtLong = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonthYear = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const fmtISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtWeekday = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

function fmtBirthDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return fmtLong(new Date(y, m - 1, d));
}

function fmtClock(hhmm: string): string {
  const [hs, ms] = hhmm.split(':');
  const h = parseInt(hs, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return ms === '00' ? `${h12}${suffix}` : `${h12}:${ms}${suffix}`;
}

function fmtOffset(h: number) {
  const sign = h < 0 ? '−' : '+';
  const a = Math.abs(h);
  const hh = Math.floor(a);
  const mm = Math.round((a - hh) * 60);
  return `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
}

const YEAR_MS = 365.2425 * 86_400_000;
const yearsBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / YEAR_MS;

function durationPhrase(years: number): string {
  if (years < 1 / 12) return 'a few weeks';
  if (years < 1) {
    const m = Math.max(1, Math.round(years * 12));
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  const y = Math.round(years);
  return `about ${y} year${y === 1 ? '' : 's'}`;
}

const PLANET_ABBR: Record<PlanetName, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};
const PLANET_ORDER: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

const proBlock = (inner: string, label = 'Pro detail') =>
  `<div class="lr-pro lr-pro-block"><p class="lr-pro-tag">${esc(label)}</p>${inner}</div>`;

const kv = (rows: Array<[string, string]>) =>
  `<dl class="lr-kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

const table = (head: string[], rows: string[][], rowClass: (i: number) => string = () => '') =>
  `<div class="lr-table-wrap"><table class="lr-table"><thead><tr>${head
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r, i) => `<tr class="${rowClass(i)}">${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

const list = (items: string[], ease = false) =>
  `<ul class="lr-list${ease ? ' lr-list-ease' : ''}" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/* ═══════════════════════════ Place search widget ═══════════════════════════ */

function attachPlaceSearch(
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

/* ═══════════════════════════ Controller ═══════════════════════════ */

type Tab = 'today' | 'nature' | 'seasons' | 'together' | 'chart';
const TABS: Tab[] = ['today', 'nature', 'seasons', 'together', 'chart'];

class LifeRhythm {
  private profile: UserBirthProfile | null = null;
  private chart: ComprehensiveKundliResult | null = null;
  private partner: UserBirthProfile | null = null;
  private partnerChart: ComprehensiveKundliResult | null = null;
  private place: GeocodedPlace | null = null;
  private partnerPlace: GeocodedPlace | null = null;
  private mode: 'simple' | 'pro' = 'simple';
  private tab: Tab = 'today';

  private app = document.getElementById('lr-app') as HTMLElement;
  private results = document.getElementById('lr-results') as HTMLElement;

  init() {
    if (!this.app) return;
    this.bindIntake();
    this.bindChrome();

    const savedMode = storageGet<string>(MODE_KEY);
    this.setMode(savedMode === 'pro' ? 'pro' : 'simple', false);

    const saved = storageGet<UserBirthProfile>(STORAGE_KEY);
    this.partner = storageGet<UserBirthProfile>(PARTNER_STORAGE_KEY);
    if (saved?.birthDate && Number.isFinite(saved.latitude)) {
      this.fillForm(saved);
      this.run(saved, false);
      const start = document.getElementById('lr-hero-start') as HTMLAnchorElement | null;
      if (start) {
        start.textContent = 'See your rhythm';
        start.href = '#lr-results';
      }
    }
  }

  /* ─── Intake ─── */

  private bindIntake() {
    const form = document.getElementById('lr-form') as HTMLFormElement;
    const placeInput = document.getElementById('lr-place') as HTMLInputElement;
    const placeList = document.getElementById('lr-place-list') as HTMLElement;
    const unknown = document.getElementById('lr-time-unknown') as HTMLInputElement;
    const time = document.getElementById('lr-time') as HTMLInputElement;

    const today = new Date();
    (document.getElementById('lr-date') as HTMLInputElement).max = fmtISO(today);

    attachPlaceSearch(placeInput, placeList, (p) => (this.place = p));
    unknown.addEventListener('change', () => {
      time.disabled = unknown.checked;
      document.getElementById('lr-time-hint')!.textContent = unknown.checked
        ? 'No problem. We’ll use midday — your seasons stay accurate, but some daily details will be approximate.'
        : 'A birth certificate often has it. If you’re unsure, a rough time is better than none.';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = document.getElementById('lr-form-error')!;
      const name = (document.getElementById('lr-name') as HTMLInputElement).value.trim();
      const date = (document.getElementById('lr-date') as HTMLInputElement).value;
      const isUnknown = unknown.checked;
      const t = isUnknown ? '12:00' : time.value;

      const problem = !date
        ? 'Please add your date of birth.'
        : date < '1900-01-01' || date > fmtISO(new Date())
          ? 'Please check the date of birth — it looks out of range.'
          : !isUnknown && !t
            ? 'Please add your time of birth, or tick “I don’t know it”.'
            : !this.place
              ? 'Please choose your place of birth from the list as you type.'
              : '';
      if (problem) {
        err.textContent = problem;
        err.hidden = false;
        return;
      }
      err.hidden = true;

      const p = this.place!;
      const profile: UserBirthProfile = {
        name,
        birthDate: date,
        birthTime: t,
        isTimeUnknown: isUnknown,
        cityName: placeInput.value,
        latitude: p.latitude,
        longitude: p.longitude,
        timezone: offsetForLocal(p.timezone, date, t),
        ianaTimezone: p.timezone,
      };
      this.run(profile, true);
    });

    document.querySelectorAll<HTMLElement>('[data-lr-demo]').forEach((b) =>
      b.addEventListener('click', () => {
        this.fillForm(SAMPLE_PROFILE);
        this.partner = SAMPLE_PARTNER;
        storageSet(PARTNER_STORAGE_KEY, SAMPLE_PARTNER);
        this.run(SAMPLE_PROFILE, true);
      })
    );
  }

  private fillForm(p: UserBirthProfile) {
    (document.getElementById('lr-name') as HTMLInputElement).value = p.name;
    (document.getElementById('lr-date') as HTMLInputElement).value = p.birthDate;
    const time = document.getElementById('lr-time') as HTMLInputElement;
    const unknown = document.getElementById('lr-time-unknown') as HTMLInputElement;
    time.value = p.birthTime;
    unknown.checked = p.isTimeUnknown;
    time.disabled = p.isTimeUnknown;
    (document.getElementById('lr-place') as HTMLInputElement).value = p.cityName;
    this.place = {
      id: 0,
      name: p.cityName,
      country: '',
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.ianaTimezone || 'UTC',
    };
  }

  /* ─── Chrome: tabs, mode, edit ─── */

  private bindChrome() {
    this.app.querySelectorAll<HTMLButtonElement>('[data-lr-mode]').forEach((b) =>
      b.addEventListener('click', () => this.setMode(b.dataset.lrMode as 'simple' | 'pro'))
    );

    const tabs = Array.from(this.app.querySelectorAll<HTMLButtonElement>('[data-lr-tab]'));
    tabs.forEach((b) => b.addEventListener('click', () => this.setTab(b.dataset.lrTab as Tab, true)));
    this.app.querySelector('[role="tablist"]')?.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      const visible = tabs.filter((t) => t.offsetParent !== null);
      const i = visible.findIndex((t) => t.dataset.lrTab === this.tab);
      let next = -1;
      if (ke.key === 'ArrowRight') next = (i + 1) % visible.length;
      else if (ke.key === 'ArrowLeft') next = (i - 1 + visible.length) % visible.length;
      else if (ke.key === 'Home') next = 0;
      else if (ke.key === 'End') next = visible.length - 1;
      if (next < 0) return;
      e.preventDefault();
      this.setTab(visible[next].dataset.lrTab as Tab, false);
      visible[next].focus();
    });

    document.getElementById('lr-edit')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('lr-intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => (document.getElementById('lr-date') as HTMLInputElement)?.focus({ preventScroll: true }), 500);
    });
  }

  private setMode(mode: 'simple' | 'pro', persist = true) {
    this.mode = mode;
    this.app.dataset.mode = mode;
    this.app.querySelectorAll<HTMLButtonElement>('[data-lr-mode]').forEach((b) =>
      b.setAttribute('aria-checked', String(b.dataset.lrMode === mode))
    );
    if (persist) storageSet(MODE_KEY, mode);
    if (mode === 'simple' && this.tab === 'chart') this.setTab('today', false);
  }

  private setTab(tab: Tab, scroll: boolean) {
    this.tab = tab;
    for (const t of TABS) {
      const btn = document.getElementById(`lr-tab-${t}`)!;
      const panel = document.getElementById(`lr-panel-${t}`)!;
      const on = t === tab;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
    }
    if (scroll) {
      const bar = this.app.querySelector('.lr-tabs-wrap') as HTMLElement;
      if (bar.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: window.scrollY + bar.getBoundingClientRect().top - 88, behavior: 'smooth' });
      }
    }
  }

  /* ─── Run ─── */

  private run(profile: UserBirthProfile, scroll: boolean) {
    this.profile = profile;
    storageSet(STORAGE_KEY, profile);
    this.chart = this.compute(profile);
    this.partnerChart = this.partner ? this.compute(this.partner) : null;

    this.renderHeader();
    this.renderToday();
    this.renderNature();
    this.renderSeasons();
    this.renderTogether();
    this.renderChartData();

    this.results.hidden = false;
    this.setTab(this.mode === 'simple' && this.tab === 'chart' ? 'today' : this.tab, false);
    if (scroll) this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private compute(p: UserBirthProfile): ComprehensiveKundliResult {
    const tz = p.ianaTimezone ? offsetForLocal(p.ianaTimezone, p.birthDate, p.birthTime) : p.timezone;
    return calculateJanamKundli({
      date: buildUtcDate(p.birthDate, p.birthTime, tz),
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: tz,
    });
  }

  private renderHeader() {
    const p = this.profile!;
    document.getElementById('lr-head-name')!.textContent = p.name ? `${p.name}’s rhythm` : 'Your rhythm';
    document.getElementById('lr-head-meta')!.textContent = [
      `Born ${fmtBirthDate(p.birthDate)}`,
      p.isTimeUnknown ? 'time not known' : fmtClock(p.birthTime),
      p.cityName,
    ].join(' · ');
    const note = document.getElementById('lr-head-note')!;
    note.hidden = !p.isTimeUnknown;
    note.textContent =
      'Without a birth time we’ve used midday. Your life seasons are still reliable; your nature and daily details are a close approximation.';
  }

  private chapterNow() {
    const cd = this.chart!.dasha.currentDasha;
    return { md: cd.mahadasha, ad: cd.antardasha };
  }

  /* ═══ Today ═══ */

  private renderToday() {
    const chart = this.chart!;
    const p = this.profile!;
    const now = new Date();
    const gochara = calculateGocharaTransits(chart, now);
    const panchang = calculatePanchang(now, p.latitude, p.longitude);
    const tone = DAY_TONE[gochara.generalTransitTone] ?? DAY_TONE['Constructive Pacing'];
    const chapter = CHAPTERS[this.chapterNow().md.lord];

    // On a lighter day, don't let the chapter push for effort — keep the day's own advice.
    const doItems = tone.level === 'light' ? [...tone.do, 'Go to bed a little earlier tonight'] : [...tone.do, chapter.leanInto[0]];
    const avoidItems = [...tone.avoid, chapter.goEasy[0]].slice(0, 3);

    const intro = `
      <div class="lr-intro">
        <div class="flex flex-wrap items-center gap-3">
          <p class="lr-date">${esc(fmtWeekday(now))}</p>
          <span class="lr-pill lr-tone-${tone.level}">${esc(tone.label)}</span>
        </div>
        <h3 class="lr-h1">${esc(tone.headline)}</h3>
        <p class="lr-lede">${esc(tone.body)}</p>
      </div>
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <div class="lr-card">
          <p class="lr-label-sm">Lean into</p>
          ${list(doItems)}
        </div>
        <div class="lr-card-quiet">
          <p class="lr-label-sm">Go easy on</p>
          ${list(avoidItems, true)}
        </div>
      </div>
      ${proBlock(
        kv([
          ['Transit tone', esc(gochara.generalTransitTone)],
          ['Weekday (Vara)', `${esc(panchang.vara.name)} · ${esc(panchang.vara.lord)}`],
          ['Tithi', `${esc(panchang.tithi.name)} · ${esc(panchang.tithi.paksha)} (${Math.round(panchang.tithi.percentageElapsed)}%)`],
          ['Moon nakshatra', `${esc(panchang.nakshatra.name)} pada ${panchang.nakshatra.pada} · ${esc(panchang.nakshatra.lord)}`],
          ['Yoga · Karana', `${esc(panchang.yoga.name)} · ${esc(panchang.karana.name)}`],
          ['Sade Sati', gochara.saturnSadeSatiActive ? 'Active' : 'Not active'],
          ['Jupiter support', gochara.jupiterSupportActive ? 'Active' : 'Not active'],
          ['Rahu Kalam', `${esc(panchang.muhurats.rahuKalam.start)}–${esc(panchang.muhurats.rahuKalam.end)}`],
          ['Abhijit', `${esc(panchang.muhurats.abhijitMuhurat.start)}–${esc(panchang.muhurats.abhijitMuhurat.end)}`],
        ]) +
          `<div class="mt-5">${table(
            ['Graha', 'Transit sign', 'From Moon', 'From Lagna', 'SAV', 'Gochara', 'Vedha'],
            gochara.transits.map((t) => [
              esc(t.planet),
              esc(t.transitingSign),
              `H${t.transitingHouseFromMoon}`,
              `H${t.transitingHouseFromLagna}`,
              String(t.savPointsInHouse),
              t.isFavorable ? 'Favourable' : '<span class="muted">Unfavourable</span>',
              t.hasVedha ? `Yes (${esc(t.vedhaCausingPlanet ?? '')})` : '<span class="muted">—</span>',
            ])
          )}</div>`,
        'Pro detail · Gochara & Panchang'
      )}`;

    const panel = document.getElementById('lr-panel-today')!;
    panel.innerHTML = intro + this.hoursSection(now) + this.askSection();
    this.bindAsk(panel);
  }

  private hoursSection(now: Date): string {
    const cg = calculateChoghadiya(now);
    const slots = [...cg.daySlots, ...cg.nightSlots]; // 06:00 → 06:00 (+1)
    const minutesSince6 = (((now.getHours() * 60 + now.getMinutes() - 360) % 1440) + 1440) % 1440;
    const nowIdx = Math.floor(minutesSince6 / 90);
    const tone = (n: string): HourTone => HOURS[n]?.tone ?? 'neutral';

    const ribbon = slots
      .map((s, i) => {
        const h = HOURS[s.name];
        return `<span class="t-${tone(s.name)}${i < nowIdx ? ' is-past' : ''}" title="${esc(
          `${fmtClock(s.startTime)}–${fmtClock(s.endTime)} · ${h?.label ?? ''}`
        )}"></span>`;
      })
      .join('');

    // Up to three good windows still ahead (until midnight-ish: slots 0..11 = 06:00–24:00)
    const ahead = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => i >= nowIdx && i <= 11 && tone(s.name) === 'good')
      .slice(0, 3);

    const windows = ahead.length
      ? ahead
          .map(
            ({ s, i }) => `
          <div class="lr-window">
            <div>
              <p class="lr-window-time">${fmtClock(s.startTime)} – ${fmtClock(s.endTime)}</p>
              ${i === nowIdx ? '<span class="lr-pill lr-tone-good mt-1.5 !py-0.5 !text-[0.7rem]">Now</span>' : ''}
            </div>
            <div>
              <p class="font-medium text-ink">${esc(HOURS[s.name].label)}</p>
              <p class="mt-0.5 text-sm text-ink-500">${esc(HOURS[s.name].tip)}</p>
            </div>
          </div>`
          )
          .join('')
      : `<p class="text-[0.9875rem] leading-relaxed text-charcoal">The strongest hours for today have passed. This evening suits winding down — tomorrow brings a fresh set.</p>`;

    return `
      <section class="lr-section" aria-labelledby="lr-hours-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-hours-title" class="lr-h2">Your hours today</h3>
            <p class="lr-sub max-w-xl">Some hours suit focus or people; others suit quieter work. Use it as a gentle guide when you have a choice.</p>
          </div>
          <div class="lr-legend" aria-hidden="true">
            <span><i class="t-good" style="background:color-mix(in srgb,var(--color-secondary) 70%,#fff)"></i>Good for focus or people</span>
            <span><i style="background:color-mix(in srgb,var(--color-accent) 70%,#fff)"></i>Fine for errands</span>
            <span><i style="background:#ebe5da"></i>Quieter</span>
          </div>
        </div>
        <div class="lr-card">
          <div class="lr-ribbon" role="img" aria-label="Today from 6am to 6am, in 90-minute blocks">
            ${ribbon}
            <i class="lr-now" style="left:calc(${((minutesSince6 / 1440) * 100).toFixed(2)}% - 1px)" aria-hidden="true"></i>
          </div>
          <div class="lr-ribbon-axis" aria-hidden="true"><span>6am</span><span>Noon</span><span>6pm</span><span>Midnight</span><span>6am</span></div>
          <div class="mt-8 grid gap-8 md:grid-cols-[13rem_1fr]">
            <div>
              <p class="lr-h3">Best windows still ahead</p>
              <p class="mt-1 text-sm text-ink-500">Times are approximate, based on a 6am sunrise.</p>
            </div>
            <div>${windows}</div>
          </div>
        </div>
        ${proBlock(
          table(
            ['Slot', 'Choghadiya', 'Quality', 'Classical use'],
            slots.map((s) => [
              `${s.startTime}–${s.endTime}`,
              esc(s.name),
              esc(s.quality),
              `<span class="muted">${esc(s.recommendedActivity)}</span>`,
            ]),
            (i) => (i === nowIdx ? 'is-now' : '')
          ) + `<p class="mt-3">Fixed 6:00 sunrise model, device-local time. Day lord sequence by weekday.</p>`,
          'Pro detail · Choghadiya'
        )}
      </section>`;
  }

  private askSection(): string {
    return `
      <section class="lr-section" aria-labelledby="lr-ask-title">
        <div class="lr-card">
          <div class="max-w-2xl">
            <h3 id="lr-ask-title" class="lr-h2">Thinking about a decision?</h3>
            <p class="lr-sub">Ask in your own words. We’ll look at the timing of this moment and suggest a few sensible next steps.</p>
          </div>
          <form class="lr-ask mt-6" data-lr-ask novalidate>
            <label for="lr-ask-input" class="sr-only">Your question</label>
            <input id="lr-ask-input" class="input-wfg flex-1 !min-h-12" placeholder="e.g. Is this a good week to travel?" maxlength="200" />
            <button type="submit" class="btn-primary !min-h-12 shrink-0">Check the timing</button>
          </form>
          <div class="lr-chips" aria-label="Example questions">
            ${ASK_EXAMPLES.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
          </div>
          <div id="lr-ask-answer" aria-live="polite"></div>
        </div>
      </section>`;
  }

  private bindAsk(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-ask]')!;
    const input = panel.querySelector<HTMLInputElement>('#lr-ask-input')!;
    const out = panel.querySelector<HTMLElement>('#lr-ask-answer')!;
    const ask = (q: string) => {
      if (!q.trim()) {
        input.focus();
        return;
      }
      const p = this.profile!;
      const r = processAstroQuestion(this.chart!, q.trim(), { latitude: p.latitude, longitude: p.longitude }, new Date());
      const lvl = ASK_LEVEL[r.verdictLevel];
      const topic = ASK_TOPIC[r.topic] ?? ASK_TOPIC['General Decision'];
      out.innerHTML = `
        <div class="lr-answer">
          <p class="text-sm italic text-ink-500">“${esc(q.trim())}”</p>
          <div class="mt-4 flex items-center gap-3">
            <span class="lr-signal" data-level="${r.verdictLevel}" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="lr-label-sm">${esc(topic.label)} · ${esc(lvl.label)}</span>
          </div>
          <p class="lr-h2 mt-3">${esc(lvl.headline)}</p>
          <p class="lr-sub max-w-2xl">${esc(lvl.body)}</p>
          <p class="lr-label-sm mt-7">Sensible next steps</p>
          ${list(topic.steps)}
          <p class="mt-6 text-xs leading-relaxed text-ink-500">A reflection on timing, not a prediction or advice. You know your situation best.</p>
          ${proBlock(
            kv([
              ['Intent class', esc(r.topic)],
              ['Engine verdict', esc(r.verdict)],
              ['Alignment score', `${r.confidenceScore} / 100`],
              ['Suggested window', esc(r.optimalWindow)],
              ...(r.travelGuidance
                ? ([
                    ['Favoured direction', esc(r.travelGuidance.bestDirection)],
                    ['Caution direction', esc(r.travelGuidance.cautionDirection)],
                  ] as Array<[string, string]>)
                : []),
            ]) +
              `<p class="mt-3">Horary (Prashna) chart cast for ${esc(new Date().toLocaleString('en-GB'))}; lagna-lord ↔ karyesh aspect, applying/separating, weighted by natal SAV of the target house.</p>`,
            'Pro detail · Prashna'
          )}
        </div>`;
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ask(input.value);
    });
    panel.querySelectorAll<HTMLButtonElement>('.lr-chips button').forEach((b) =>
      b.addEventListener('click', () => {
        input.value = b.dataset.q ?? '';
        ask(input.value);
      })
    );
  }

  /* ═══ Your nature ═══ */

  private renderNature() {
    const chart = this.chart!;
    const bal = chart.elementBalance as Record<ElementType, number>;
    const sorted = (Object.entries(bal) as Array<[ElementType, number]>).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0) || 1;
    const [primary, secondary] = [sorted[0][0], sorted[1][0]];
    const rhythm = DAILY_RHYTHM[primary];

    const strengths = Object.values(chart.shadbala as Record<string, any>).sort(
      (a, b) => b.strengthRatio - a.strengthRatio
    );
    const top = strengths.slice(0, 3);
    const low = strengths.slice(-2).reverse();

    const bars = sorted
      .map(
        ([el, v]) => `
        <div>
          <div class="flex items-baseline justify-between gap-3">
            <p class="font-medium text-ink">${esc(ELEMENTS[el].label)} <span class="font-normal text-ink-500">· ${esc(ELEMENTS[el].meaning)}</span></p>
            <p class="text-sm tabular-nums text-ink-500">${Math.round((v / total) * 100)}%</p>
          </div>
          <div class="lr-bar mt-2"><i style="width:${((v / sorted[0][1]) * 100).toFixed(1)}%"></i></div>
        </div>`
      )
      .join('');

    const asc = chart.ascendant;
    const moon = chart.planets.Moon;
    const sun = chart.planets.Sun;

    document.getElementById('lr-panel-nature')!.innerHTML = `
      <div class="lr-intro">
        <p class="lr-date">Your nature</p>
        <h3 class="lr-h1">${esc(temperamentHeadline(primary, secondary))}</h3>
        <p class="lr-lede">Everyone is a mix of four qualities. Yours leans towards <strong class="font-medium text-ink">${esc(
          ELEMENTS[primary].label.toLowerCase()
        )}</strong> — ${esc(ELEMENTS[primary].meaning.toLowerCase())} — backed by <strong class="font-medium text-ink">${esc(
          ELEMENTS[secondary].label.toLowerCase()
        )}</strong>.</p>
      </div>

      <div class="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div class="lr-card">
          <p class="lr-label-sm">Your mix</p>
          <div class="mt-5 grid gap-5">${bars}</div>
        </div>
        <div class="lr-card-quiet flex flex-col">
          <p class="lr-label-sm">Looking after yourself</p>
          <p class="mt-4 font-display text-xl leading-snug text-ink sm:text-[1.4rem]">${esc(ELEMENTS[primary].care)}</p>
          <div class="mt-auto border-t border-primary/10 pt-5">
            <p class="lr-label-sm !mt-6">Pace that suits this season</p>
            <p class="mt-2 text-[0.9375rem] text-charcoal">${esc(CHAPTERS[this.chapterNow().md.lord].pace)}</p>
          </div>
        </div>
      </div>

      ${proBlock(
        kv([
          ['Lagna (Ascendant)', `${esc(asc.sign.name)} · ${esc(asc.sign.sanskrit)} ${esc(asc.formattedDegree)}`],
          ['Lagna nakshatra', `${esc(asc.nakshatra.name)} pada ${asc.nakshatraPada}`],
          ['Lagna lord', esc(asc.sign.lord)],
          ['Moon (Rashi)', `${esc(moon.sign.name)} · ${esc(moon.sign.sanskrit)} ${esc(moon.formattedDegree)}`],
          ['Janma nakshatra', `${esc(moon.nakshatra.name)} pada ${moon.nakshatraPada} · ${esc(moon.nakshatra.lord)}`],
          ['Sun', `${esc(sun.sign.name)} ${esc(sun.formattedDegree)}`],
          ['Element points', sorted.map(([e, v]) => `${e} ${v}`).join(' · ')],
          ['Modality (Lagna)', esc(asc.sign.modality)],
        ]),
        'Pro detail · Constitution'
      )}

      <section class="lr-section" aria-labelledby="lr-nat-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-nat-title" class="lr-h2">What tends to come naturally</h3>
            <p class="lr-sub">Qualities you can lean on, especially when things get busy.</p>
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          ${top
            .map(
              (s, i) => `
            <article class="lr-card">
              <span class="lr-num">${String(i + 1).padStart(2, '0')}</span>
              <h4 class="lr-h3 mt-4">${esc(STRENGTHS[s.planet]?.title ?? s.planet)}</h4>
              <p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(STRENGTHS[s.planet]?.natural ?? '')}</p>
              <p class="lr-pro mt-4 text-xs text-ink-500">${esc(s.planet)} · ${s.totalRupas.toFixed(2)} rupas (${Math.round(
                s.strengthRatio * 100
              )}% of required)</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <section class="lr-section" aria-labelledby="lr-eff-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-eff-title" class="lr-h2">What may take more effort</h3>
            <p class="lr-sub">Not weaknesses — just areas where a little structure goes a long way.</p>
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          ${low
            .map(
              (s) => `
            <article class="lr-card-quiet">
              <h4 class="lr-h3">${esc(STRENGTHS[s.planet]?.title ?? s.planet)}</h4>
              <p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(STRENGTHS[s.planet]?.effort ?? '')}</p>
              <p class="lr-pro mt-4 text-xs text-ink-500">${esc(s.planet)} · ${s.totalRupas.toFixed(2)} rupas (${Math.round(
                s.strengthRatio * 100
              )}% of required)</p>
            </article>`
            )
            .join('')}
        </div>
        ${proBlock(
          table(
            ['Graha', 'Sthana', 'Dig', 'Kala', 'Chesta', 'Naisargika', 'Drik', 'Rupas', 'Required', 'Ratio'],
            strengths.map((s) => [
              esc(s.planet),
              s.sthanaBala.toFixed(1),
              s.digBala.toFixed(1),
              s.kaalaBala.toFixed(1),
              s.chestaBala.toFixed(1),
              s.naisargikaBala.toFixed(1),
              s.drikBala.toFixed(1),
              s.totalRupas.toFixed(2),
              s.requiredRupas.toFixed(1),
              `${s.strengthRatio.toFixed(2)}${s.isStrong ? '' : ' <span class="muted">(weak)</span>'}`,
            ])
          ),
          'Pro detail · Shadbala (virupas)'
        )}
      </section>

      <section class="lr-section" aria-labelledby="lr-day-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-day-title" class="lr-h2">A rhythm that suits you</h3>
            <p class="lr-sub">A simple shape for an ordinary day. Adjust it to your life.</p>
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          ${(
            [
              ['Morning', rhythm.morning],
              ['Focus time', rhythm.focus],
              ['Evening', rhythm.evening],
            ] as const
          )
            .map(
              ([t, b]) => `
            <article class="border-t-2 border-primary/15 pt-5">
              <p class="lr-label-sm">${t}</p>
              <p class="mt-3 font-display text-lg leading-snug text-ink">${esc(b)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>`;
  }

  /* ═══ Your seasons ═══ */

  private renderSeasons() {
    const chart = this.chart!;
    const now = new Date();
    const birth = chart.birthDetails.date;
    const { md, ad } = this.chapterNow();
    const ch = CHAPTERS[md.lord];
    const mds = chart.dasha.mahadashas;
    const mdIdx = mds.findIndex((m) => m.lord === md.lord && m.startDate.getTime() === md.startDate.getTime());
    const nextMd = mds[mdIdx + 1];
    const progress = Math.min(100, Math.max(0, ((now.getTime() - md.startDate.getTime()) / (md.endDate.getTime() - md.startDate.getTime())) * 100));
    const left = yearsBetween(now, md.endDate);

    // Life ribbon: birth → age 100
    const lifeEnd = new Date(birth.getTime() + 100 * YEAR_MS);
    const span = lifeEnd.getTime() - birth.getTime();
    const lifeSegs = mds
      .filter((m) => m.startDate < lifeEnd)
      .map((m) => {
        const s = Math.max(m.startDate.getTime(), birth.getTime());
        const e = Math.min(m.endDate.getTime(), lifeEnd.getTime());
        return { m, w: ((e - s) / span) * 100, startAge: (s - birth.getTime()) / YEAR_MS, endAge: (e - birth.getTime()) / YEAR_MS };
      });
    const ageNow = yearsBetween(birth, now);

    // Year ahead: sub-periods overlapping the next 12 months
    const horizon = new Date(now.getTime() + YEAR_MS);
    const upcoming: DashaPeriod[] = [];
    for (const m of mds) {
      for (const a of m.antardashas ?? []) {
        if (a.endDate > now && a.startDate < horizon) upcoming.push(a);
      }
    }

    const cd = chart.dasha.currentDasha;
    const levels: Array<[string, DashaPeriod | undefined]> = [
      ['Mahadasha', cd.mahadasha],
      ['Antardasha', cd.antardasha],
      ['Pratyantardasha', cd.pratyantardasha],
      ['Sookshma', cd.sookshmaDasha],
      ['Prana', cd.praanaDasha],
    ];

    document.getElementById('lr-panel-seasons')!.innerHTML = `
      <div class="lr-intro">
        <p class="lr-date">Your seasons</p>
        <h3 class="lr-h1">${esc(ch.title)}</h3>
        <p class="lr-lede">${esc(ch.summary)}</p>
      </div>

      <div class="lr-feature mt-10">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="lr-label-sm !text-white/60">The chapter you’re in</p>
            <p class="mt-2 font-display text-3xl font-medium sm:text-4xl">${esc(ch.short)}</p>
          </div>
          <p class="text-sm text-white/75">${esc(fmtMonthYear(md.startDate))} – ${esc(fmtMonthYear(md.endDate))} · ${esc(
            durationPhrase(left)
          )} to go</p>
        </div>
        <div class="lr-progress mt-6" role="progressbar" aria-label="Progress through this chapter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><i style="width:${progress.toFixed(1)}%"></i></div>
        <div class="mt-8 grid gap-6 border-t border-white/15 pt-6 sm:grid-cols-3">
          <div>
            <p class="lr-label-sm !text-white/60">Pace</p>
            <p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${esc(ch.pace)}</p>
          </div>
          <div>
            <p class="lr-label-sm !text-white/60">Focus right now</p>
            <p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${esc(
              CHAPTERS[ad.lord].focus.charAt(0).toUpperCase() + CHAPTERS[ad.lord].focus.slice(1)
            )}, until ${esc(fmtMonthYear(ad.endDate))}</p>
          </div>
          <div>
            <p class="lr-label-sm !text-white/60">Next chapter</p>
            <p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${
              nextMd ? `${esc(CHAPTERS[nextMd.lord].short)}, from ${esc(fmtMonthYear(nextMd.startDate))}` : '—'
            }</p>
          </div>
        </div>
      </div>

      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="lr-card">
          <p class="lr-label-sm">This season suits</p>
          ${list(ch.leanInto)}
        </div>
        <div class="lr-card-quiet">
          <p class="lr-label-sm">Watch out for</p>
          ${list(ch.goEasy, true)}
        </div>
      </div>

      ${proBlock(
        table(
          ['Level', 'Lord', 'Start', 'End'],
          levels
            .filter(([, d]) => d)
            .map(([n, d]) => [esc(n), esc(d!.lord), fmtISO(d!.startDate), fmtISO(d!.endDate)])
        ) +
          `<p class="mt-3">Vimshottari dasha from Moon at ${esc(chart.planets.Moon.formattedDegree)} ${esc(
            chart.planets.Moon.sign.name
          )} (${esc(chart.planets.Moon.nakshatra.name)}). Birth lord ${esc(chart.dasha.birthLord)}, balance ${chart.dasha.birthBalanceYears.toFixed(2)} y.</p>`,
        'Pro detail · Vimshottari'
      )}

      <section class="lr-section" aria-labelledby="lr-life-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-life-title" class="lr-h2">Your life in chapters</h3>
            <p class="lr-sub max-w-xl">Life tends to move in long seasons, each with its own feel. Here is how yours are laid out.</p>
          </div>
        </div>
        <div class="lr-card">
          <div class="lr-life" role="img" aria-label="Life chapters from birth to age 100">
            ${lifeSegs
              .map(
                ({ m, w }) => `<div class="${m === md ? 'is-now' : m.endDate < now ? 'is-past' : ''}" style="flex:0 0 calc(${w.toFixed(
                  3
                )}% - 3px)" title="${esc(CHAPTERS[m.lord].short)}"><span>${w > 9 ? esc(CHAPTERS[m.lord].short) : ''}</span></div>`
              )
              .join('')}
          </div>
          <div class="lr-life-axis" aria-hidden="true">
            ${[0, 20, 40, 60, 80, 100]
              .map((a) => `<span style="left:${a}%;${a === 0 ? 'transform:none' : a === 100 ? 'transform:translateX(-100%)' : ''}">${a === 0 ? 'Birth' : `${a}`}</span>`)
              .join('')}
          </div>
          <ol class="mt-8 list-none gap-x-10 sm:columns-2" role="list">
            ${lifeSegs
              .map(
                ({ m, startAge, endAge }) => `
              <li class="flex break-inside-avoid items-baseline justify-between gap-4 border-t border-line py-3 ${m === md ? 'font-medium text-ink' : 'text-charcoal'}">
                <span>${esc(CHAPTERS[m.lord].short)}${m === md ? ' <span class="lr-pill lr-tone-good ml-1 !py-0.5 !text-[0.7rem]">You are here</span>' : ''}</span>
                <span class="shrink-0 text-sm tabular-nums text-ink-500">age ${Math.floor(startAge)}–${Math.floor(endAge)}</span>
              </li>`
              )
              .join('')}
          </ol>
          <p class="mt-6 text-sm text-ink-500">You are ${Math.floor(ageNow)}. Chapters are a way of reflecting on pace and focus — not fixed outcomes.</p>
        </div>
        ${proBlock(
          table(
            ['Mahadasha', 'Start', 'End', 'Years'],
            mds.map((m) => [esc(m.lord), fmtISO(m.startDate), fmtISO(m.endDate), m.durationYears.toFixed(2)]),
            (i) => (i === mdIdx ? 'is-now' : '')
          ),
          'Pro detail · 120-year cycle'
        )}
      </section>

      <section class="lr-section" aria-labelledby="lr-year-title">
        <div class="lr-section-head">
          <div>
            <h3 id="lr-year-title" class="lr-h2">The year ahead</h3>
            <p class="lr-sub max-w-xl">Within the bigger chapter, shorter phases shift the focus. Here’s what the next twelve months look like.</p>
          </div>
        </div>
        <ol class="lr-timeline" role="list">
          ${upcoming
            .map((a) => {
              const isNow = a.startDate <= now && a.endDate > now;
              const c = CHAPTERS[a.lord];
              return `
              <li class="${isNow ? 'is-now' : ''}">
                <span class="dot" aria-hidden="true"></span>
                <div>
                  <p class="lr-label-sm">${isNow ? 'Now' : `From ${esc(fmtMonthYear(a.startDate))}`} · until ${esc(fmtMonthYear(a.endDate))}</p>
                  <p class="lr-h3 mt-1.5">Focus on ${esc(c.focus)}</p>
                  <p class="mt-1 text-[0.9375rem] text-charcoal">${esc(c.leanInto[0])}.</p>
                  <p class="lr-pro mt-2 text-xs text-ink-500">${esc(md.lord)}–${esc(a.lord)} antardasha · ${fmtISO(a.startDate)} → ${fmtISO(a.endDate)}</p>
                </div>
              </li>`;
            })
            .join('')}
        </ol>
      </section>`;
  }

  /* ═══ Together ═══ */

  private renderTogether() {
    const panel = document.getElementById('lr-panel-together')!;
    const intro = `
      <div class="lr-intro">
        <p class="lr-date">Together</p>
        <h3 class="lr-h1">How your rhythms fit together</h3>
        <p class="lr-lede">Add someone’s birth details — a partner, friend, family member or co-founder — to see where your natural pace matches and where it differs.</p>
      </div>`;

    if (!this.partner || !this.partnerChart) {
      panel.innerHTML = intro + this.partnerForm();
      this.bindPartnerForm(panel);
      return;
    }

    const a = this.chart!;
    const b = this.partnerChart;
    const k = calculateAshtakoota(a.planets.Moon.siderealLongitude, b.planets.Moon.siderealLongitude);
    const syn = calculateRelationalSynastry(a, b, 'Spousal / Romantic');
    const copy = compatibilityCopy(k.totalScore);
    const you = this.profile!.name || 'You';
    const them = this.partner.name || 'Them';
    const cats = Object.entries(k.categories) as Array<[string, { maxScore: number; obtainedScore: number; name: string; description: string }]>;

    panel.innerHTML = `
      ${intro}
      <div class="mt-10 lr-card">
        <div class="flex flex-col gap-8 md:flex-row md:items-center">
          <div class="lr-ring shrink-0" style="--p:${Math.round((k.totalScore / 36) * 100)}" role="img" aria-label="${esc(copy.headline)}">
            <div><div><p class="font-display text-3xl text-ink">${k.totalScore}</p><p class="text-xs text-ink-500">of 36</p></div></div>
          </div>
          <div class="flex-1">
            <p class="lr-label-sm">${esc(you)} &amp; ${esc(them)}</p>
            <p class="lr-h2 mt-2">${esc(copy.headline)}</p>
            <p class="lr-sub max-w-2xl">${esc(copy.body)}</p>
            <p class="mt-4 text-[0.9375rem] text-charcoal">${esc(SYNERGY_PLAIN[syn.dashaResonance.mutualSynergy] ?? '')}</p>
          </div>
          <button type="button" class="lr-textbtn self-start md:self-center" data-lr-partner-reset>Compare someone else</button>
        </div>

        <div class="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <div><p class="lr-label-sm">${esc(you)} — current chapter</p><p class="lr-h3 mt-1.5">${esc(CHAPTERS[a.dasha.currentDasha.mahadasha.lord].short)}</p></div>
          <div><p class="lr-label-sm">${esc(them)} — current chapter</p><p class="lr-h3 mt-1.5">${esc(CHAPTERS[b.dasha.currentDasha.mahadasha.lord].short)}</p></div>
        </div>
      </div>

      <section class="lr-section !mt-12" aria-labelledby="lr-fit-title">
        <h3 id="lr-fit-title" class="lr-h2">Where you match, and where you differ</h3>
        <div class="mt-6 grid gap-x-12 gap-y-6 md:grid-cols-2">
          ${cats
            .map(([key, c]) => {
              const r = c.maxScore ? c.obtainedScore / c.maxScore : 0;
              const word = r >= 0.75 ? 'Strong' : r >= 0.4 ? 'Mixed' : 'Needs care';
              return `
              <div>
                <div class="flex items-baseline justify-between gap-3">
                  <p class="font-medium text-ink">${esc(KOOTA_PLAIN[key]?.label ?? c.name)} <span class="font-normal text-ink-500">· ${esc(KOOTA_PLAIN[key]?.meaning ?? '')}</span></p>
                  <p class="shrink-0 text-sm text-ink-500">${word}</p>
                </div>
                <div class="lr-bar mt-2"><i style="width:${Math.max(4, r * 100).toFixed(0)}%;${r < 0.4 ? 'background:#d4bf9a' : ''}"></i></div>
              </div>`;
            })
            .join('')}
        </div>
        <p class="mt-8 max-w-2xl text-sm leading-relaxed text-ink-500">Areas marked “needs care” are where clear, kind conversations help most. No score decides a relationship.</p>
        ${proBlock(
          table(
            ['Koota', 'Score', 'Max', 'Note'],
            cats.map(([, c]) => [esc(c.name), String(c.obtainedScore), String(c.maxScore), `<span class="muted">${esc(c.description)}</span>`])
          ) +
            `<div class="mt-5">${kv([
              ['Ashtakoota total', `${k.totalScore} / 36 (${k.percentage}%) · ${esc(k.verdict)}`],
              ['Moon A / B', `${esc(a.planets.Moon.nakshatra.name)} · ${esc(b.planets.Moon.nakshatra.name)}`],
              ['Mahadasha A / B', `${esc(syn.dashaResonance.partnerAMahadasha)} · ${esc(syn.dashaResonance.partnerBMahadasha)}`],
              ['Dasha resonance', esc(syn.dashaResonance.mutualSynergy)],
            ])}</div>` +
            (syn.crossContacts.length
              ? `<div class="mt-5">${table(
                  ['A planet', 'Falls in B house', 'Contact', 'With'],
                  syn.crossContacts.map((c) => [esc(c.planetA), `H${c.houseInChartB}`, esc(c.contactType), esc(c.contactPartnerPlanet ?? '—')])
                )}</div>`
              : ''),
          'Pro detail · Ashtakoota & synastry'
        )}
      </section>`;

    panel.querySelector('[data-lr-partner-reset]')?.addEventListener('click', () => {
      this.partner = null;
      this.partnerChart = null;
      storageSet(PARTNER_STORAGE_KEY, null);
      this.renderTogether();
      (document.getElementById('lr-p-name') as HTMLInputElement)?.focus();
    });
  }

  private partnerForm(): string {
    return `
      <div class="mt-10 lr-card max-w-3xl">
        <div class="flex items-baseline justify-between gap-4 border-b border-primary/10 pb-5">
          <p class="font-display text-xl font-medium text-ink">Their details</p>
          <button type="button" class="lr-textbtn" data-lr-partner-demo>Use an example</button>
        </div>
        <form class="mt-6 grid gap-6 sm:grid-cols-2" data-lr-partner novalidate>
          <div>
            <label for="lr-p-name" class="lr-label">Their name <span class="lr-optional">Optional</span></label>
            <input id="lr-p-name" class="input-wfg" placeholder="First name" />
          </div>
          <div>
            <label for="lr-p-date" class="lr-label">Date of birth</label>
            <input id="lr-p-date" type="date" class="input-wfg" min="1900-01-01" max="${fmtISO(new Date())}" />
          </div>
          <div>
            <div class="flex items-center justify-between gap-3">
              <label for="lr-p-time" class="lr-label">Time of birth</label>
              <label class="lr-check"><input id="lr-p-unknown" type="checkbox" /><span>Not known</span></label>
            </div>
            <input id="lr-p-time" type="time" value="12:00" class="input-wfg" />
          </div>
          <div class="relative">
            <label for="lr-p-place" class="lr-label">Place of birth</label>
            <input id="lr-p-place" class="input-wfg" autocomplete="off" placeholder="Start typing a town or city" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lr-p-place-list" />
            <div id="lr-p-place-list" class="lr-places !top-full mt-1" role="listbox" hidden></div>
          </div>
          <p class="lr-error sm:col-span-2" role="alert" data-lr-partner-error hidden></p>
          <div class="sm:col-span-2">
            <button type="submit" class="btn-primary w-full sm:w-auto">Compare our rhythms</button>
            <p class="mt-3 text-xs text-ink-500">Only add someone’s details with their permission. Stays on this device.</p>
          </div>
        </form>
      </div>`;
  }

  private bindPartnerForm(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-partner]')!;
    const place = panel.querySelector<HTMLInputElement>('#lr-p-place')!;
    const unknown = panel.querySelector<HTMLInputElement>('#lr-p-unknown')!;
    const time = panel.querySelector<HTMLInputElement>('#lr-p-time')!;
    attachPlaceSearch(place, panel.querySelector('#lr-p-place-list')!, (p) => (this.partnerPlace = p));
    unknown.addEventListener('change', () => (time.disabled = unknown.checked));

    const commit = (p: UserBirthProfile) => {
      this.partner = p;
      this.partnerChart = this.compute(p);
      storageSet(PARTNER_STORAGE_KEY, p);
      this.renderTogether();
    };

    panel.querySelector('[data-lr-partner-demo]')?.addEventListener('click', () => commit(SAMPLE_PARTNER));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = panel.querySelector<HTMLElement>('[data-lr-partner-error]')!;
      const date = panel.querySelector<HTMLInputElement>('#lr-p-date')!.value;
      const t = unknown.checked ? '12:00' : time.value;
      const msg = !date
        ? 'Please add their date of birth.'
        : !unknown.checked && !t
          ? 'Please add their time of birth, or tick “Not known”.'
          : !this.partnerPlace
            ? 'Please choose their place of birth from the list.'
            : '';
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        return;
      }
      const pp = this.partnerPlace!;
      commit({
        name: panel.querySelector<HTMLInputElement>('#lr-p-name')!.value.trim(),
        birthDate: date,
        birthTime: t,
        isTimeUnknown: unknown.checked,
        cityName: place.value,
        latitude: pp.latitude,
        longitude: pp.longitude,
        timezone: offsetForLocal(pp.timezone, date, t),
        ianaTimezone: pp.timezone,
      });
    });
  }

  /* ═══ Chart data (Pro only) ═══ */

  private renderChartData() {
    const c = this.chart!;
    const p = this.profile!;
    const sav = c.ashtakavarga;
    const maxSav = Math.max(...(sav.housePoints as number[]));

    document.getElementById('lr-panel-chart')!.innerHTML = `
      <div class="lr-intro">
        <p class="lr-date">Chart data</p>
        <h3 class="lr-h1">The full workings</h3>
        <p class="lr-lede">Sidereal positions using the ${esc(c.ayanamsha.name)} ayanamsha (${esc(c.ayanamsha.formatted)}), cast for ${esc(
          fmtBirthDate(p.birthDate)
        )} ${p.isTimeUnknown ? '12:00 (time unknown)' : esc(p.birthTime)} ${esc(fmtOffset(c.birthDetails.timezone))} at ${c.birthDetails.latitude.toFixed(
          4
        )}°, ${c.birthDetails.longitude.toFixed(4)}°.</p>
      </div>

      <div class="mt-10 grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div class="lr-card">
          <p class="lr-label-sm">Rashi chart (D1) · North Indian</p>
          <div class="mt-4">${this.northIndianChart(c)}</div>
        </div>
        <div class="lr-card">
          <p class="lr-label-sm">Key points</p>
          <div class="mt-5">${kv([
            ['Lagna', `${esc(c.ascendant.sign.name)} ${esc(c.ascendant.formattedDegree)}`],
            ['Lagna nakshatra', `${esc(c.ascendant.nakshatra.name)} ${c.ascendant.nakshatraPada}`],
            ['Rashi (Moon)', esc(c.planets.Moon.sign.name)],
            ['Janma nakshatra', `${esc(c.planets.Moon.nakshatra.name)} ${c.planets.Moon.nakshatraPada}`],
            ['Ayanamsha', `${esc(c.ayanamsha.name)} ${esc(c.ayanamsha.formatted)}`],
            ['Birth dasha lord', `${esc(c.dasha.birthLord)} (${c.dasha.birthBalanceYears.toFixed(2)} y)`],
            ['Current MD / AD', `${esc(c.dasha.currentDasha.mahadasha.lord)} / ${esc(c.dasha.currentDasha.antardasha.lord)}`],
            ['Manglik', c.doshas.manglik.isManglik ? `Yes · ${esc(c.doshas.manglik.severity)}` : 'No'],
            ['Sade Sati', c.doshas.sadeSati.isActive ? esc(c.doshas.sadeSati.phase) : 'Not active'],
            ['Kaal Sarp', c.doshas.kaalSarp.isKaalSarp ? esc(c.doshas.kaalSarp.type ?? 'Yes') : 'No'],
            ['SAV total', String(sav.totalPoints)],
            ['Calculated', esc(c.calculationTime.toLocaleString('en-GB'))],
          ])}</div>
        </div>
      </div>

      <section class="lr-section !mt-12" aria-labelledby="lr-grahas-title">
        <h3 id="lr-grahas-title" class="lr-h2">Graha positions</h3>
        <div class="mt-5">${table(
          ['Graha', 'Sign', 'Degree', 'House', 'Nakshatra', 'Dignity', 'Motion', 'KP star / sub'],
          [
            [
              '<strong class="font-medium">Lagna</strong>',
              esc(c.ascendant.sign.name),
              esc(c.ascendant.formattedDegree),
              '1',
              `${esc(c.ascendant.nakshatra.name)} ${c.ascendant.nakshatraPada}`,
              '—',
              '—',
              c.ascendant.kp ? `${esc(c.ascendant.kp.starLord)} / ${esc(c.ascendant.kp.subLord)}` : '—',
            ],
            ...PLANET_ORDER.map((n) => {
              const pl = c.planets[n];
              return [
                esc(n),
                `${esc(pl.sign.name)} <span class="muted">${esc(pl.sign.sanskrit)}</span>`,
                esc(pl.formattedDegree),
                String(pl.house),
                `${esc(pl.nakshatra.name)} ${pl.nakshatraPada}`,
                esc(pl.dignity),
                pl.isRetrograde ? 'Retrograde' : '<span class="muted">Direct</span>',
                pl.kp ? `${esc(pl.kp.starLord)} / ${esc(pl.kp.subLord)}` : '—',
              ];
            }),
          ]
        )}</div>
      </section>

      <section class="lr-section !mt-12" aria-labelledby="lr-sav-title">
        <div class="lr-section-head">
          <h3 id="lr-sav-title" class="lr-h2">Sarvashtakavarga by house</h3>
          <p class="text-sm text-ink-500">${sav.totalPoints} bindus · 28+ is above average</p>
        </div>
        <div class="lr-card">
          <div class="grid grid-cols-12 items-end gap-1.5 sm:gap-3" style="height:11rem">
            ${(sav.housePoints as number[])
              .map(
                (v, i) => `<div class="flex h-full flex-col items-center justify-end gap-1.5" title="House ${i + 1}: ${v}">
                  <span class="text-[0.7rem] tabular-nums text-ink-500">${v}</span>
                  <span class="w-full rounded-md" style="height:${((v / maxSav) * 100).toFixed(1)}%;background:${
                    v >= 28 ? 'color-mix(in srgb,var(--color-secondary) 75%,#fff)' : '#e7e1d6'
                  }"></span>
                </div>`
              )
              .join('')}
          </div>
          <div class="mt-2 grid grid-cols-12 gap-1.5 text-center text-[0.7rem] text-ink-500 sm:gap-3">${Array.from(
            { length: 12 },
            (_, i) => `<span>H${i + 1}</span>`
          ).join('')}</div>
        </div>
      </section>

      ${
        c.yogas.length
          ? `<section class="lr-section !mt-12" aria-labelledby="lr-yoga-title">
        <h3 id="lr-yoga-title" class="lr-h2">Yogas detected</h3>
        <div class="mt-5">${table(
          ['Yoga', 'Category', 'Classical description'],
          c.yogas.map((y: any) => [
            `${esc(y.name)}${y.sanskrit && y.sanskrit !== y.name ? ` <span class="muted">${esc(y.sanskrit)}</span>` : ''}`,
            esc(y.category),
            `<span class="muted whitespace-normal">${esc(y.description)}</span>`,
          ])
        )}</div>
      </section>`
          : ''
      }`;
  }

  /** North Indian diamond chart. House 1 at top centre, counter-clockwise. */
  private northIndianChart(c: ComprehensiveKundliResult): string {
    const S = 320;
    const h = S / 2;
    const q = S / 4;
    // Label anchor per house (1..12) and sign-number anchor
    const anchors: Array<[number, number]> = [
      [h, q], [q, q / 2.2], [q / 2.2, q], [q, h], [q / 2.2, S - q], [q, S - q / 2.2],
      [h, S - q], [S - q, S - q / 2.2], [S - q / 2.2, S - q], [S - q, h], [S - q / 2.2, q], [S - q, q / 2.2],
    ];
    const byHouse: string[][] = Array.from({ length: 12 }, () => []);
    for (const n of PLANET_ORDER) {
      const pl = c.planets[n];
      byHouse[pl.house - 1].push(PLANET_ABBR[n] + (pl.isRetrograde ? 'ʳ' : ''));
    }
    const ascIdx = c.ascendant.sign.index;
    const cells = anchors
      .map(([x, y], i) => {
        const signNo = ((ascIdx + i) % 12) + 1;
        const ps = byHouse[i];
        const big = i % 3 === 0; // kendras have more room
        const lines = [];
        for (let k = 0; k < ps.length; k += big ? 3 : 2) lines.push(ps.slice(k, k + (big ? 3 : 2)).join(' '));
        const startY = y - ((lines.length - 1) * 13) / 2 + (big ? 6 : 4);
        return `
          <text x="${x}" y="${big ? y - 22 : y - 12}" text-anchor="middle" font-size="10" fill="var(--color-cool-gray)">${signNo}</text>
          ${i === 0 ? `<text x="${x}" y="${y - 34}" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="var(--color-secondary)">ASC</text>` : ''}
          ${lines
            .map((l, li) => `<text x="${x}" y="${startY + li * 13}" text-anchor="middle" font-size="11.5" font-weight="500" fill="var(--color-ink)">${esc(l)}</text>`)
            .join('')}`;
      })
      .join('');
    return `<svg class="lr-chart-svg w-full" viewBox="-1 -1 ${S + 2} ${S + 2}" role="img" aria-label="North Indian birth chart">
      <rect x="0" y="0" width="${S}" height="${S}" rx="10" fill="color-mix(in srgb, var(--color-accent) 6%, #fff)" stroke="var(--color-line-strong)"/>
      <g stroke="var(--color-line-strong)" stroke-width="1">
        <line x1="0" y1="0" x2="${S}" y2="${S}"/><line x1="${S}" y1="0" x2="0" y2="${S}"/>
        <polygon points="${h},0 ${S},${h} ${h},${S} 0,${h}" fill="none"/>
      </g>
      ${cells}
    </svg>`;
  }
}

if (typeof document !== 'undefined') {
  const start = () => new LifeRhythm().init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
