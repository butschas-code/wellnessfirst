/**
 * Life Rhythm — client controller for /astro.
 *
 * Every use case from the original dashboard, organised into five sections with sub-navigation:
 *   Today     · Overview · Best hours · Coming up · Travel · Reset plan
 *   You       · Profile · How you work · Strengths · Daily routine · Work & money · Health & energy
 *   Seasons   · This chapter · This year · Life map · Long cycles
 *   People    · Partner · Children
 *   Decisions · Ask a question · Check a decision
 *   Chart data (Pro only)
 *
 * Simple view: plain English, personalised from the full calculation set (src/lib/astro-insights.ts).
 * Pro detail: `.lr-pro` evidence lines, technical tables and the Chart data tab.
 */
import {
  calculateJanamKundli,
  calculatePanchang,
  calculateTimedChoghadiya,
  calculateAshtakoota,
  calculateRelationalSynastry,
  calculateGocharaTransits,
  calculatePrashnaKundli,
  calculateDerivedChart,
  calculateProgenyAnalysis,
  processAstroQuestion,
  calculateYoginiDasha,
  calculateAshtottariDasha,
  calculateCharaDasha,
  calculateVarshaphal,
  calculateKPAnalysis,
  calculateRulingPlanets,
  findMuhurtas,
  type MuhurtaActivity,
  type ComprehensiveKundliResult,
  type ElementType,
  type DashaPeriod,
  type TimedSlot,
} from '../lib/astro-engine/index.ts';
import {
  CHAPTERS,
  STRENGTHS,
  ELEMENTS,
  HOURS,
  ASK_LEVEL,
  ASK_TOPIC,
  ASK_EXAMPLES,
  SYNERGY_PLAIN,
  DAILY_RHYTHM,
  compatibilityCopy,
  temperamentHeadline,
  type HourTone,
} from '../lib/astro-copy.ts';
import * as C from '../lib/astro-content.ts';
import * as I from '../lib/astro-insights.ts';
import { buildReading } from '../lib/astro-reading.ts';
import { nakshatraDay, upcomingShifts, weekAhead } from '../lib/astro-today.ts';
import { chartSvg, type ChartStyle } from './astro-charts.ts';
import {
  type GeocodedPlace,
  type UserBirthProfile,
  STORAGE_KEY,
  PARTNER_STORAGE_KEY,
  MODE_KEY,
  SAMPLE_PROFILE,
  SAMPLE_PARTNER,
  storageGet,
  storageSet,
  searchGlobalPlaces,
  buildUtcDate,
  offsetForLocal,
  esc,
  fmtMonthYear,
  fmtISO,
  fmtBirthDate,
  fmtClock,
  fmtOffset,
  YEAR_MS,
  yearsBetween,
  durationPhrase,
  PLANET_ABBR,
  PLANET_ORDER,
  proBlock,
  kv,
  table,
  list,
  attachPlaceSearch,
  mountTimePicker,
  type TimePicker,
} from './astro-ui.ts';

const TODAY_PLACE_KEY = 'wfg_astro_today_place';
const PROFILES_KEY = 'wfg_astro_profiles';
const STYLE_KEY = 'wfg_astro_chart_style';

interface TodayPlace {
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  /** How we know: chosen by the user, their exact position, their device time zone, or the birth place. */
  source?: 'chosen' | 'gps' | 'device' | 'birth';
}

const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/* ═══════════ Small render helpers ═══════════ */

const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const ev = (text: string) => `<p class="lr-pro lr-ev">${esc(text)}</p>`;
const meter = (level: I.Level) => `<span class="lr-meter" data-level="${level}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
const LEVEL_WORD: Record<I.Level, string> = { strong: 'Strong', good: 'Good', average: 'Moderate', low: 'Needs care' };

function card(title: string, text: string, evidence?: string, opts: { quiet?: boolean; kicker?: string; num?: number } = {}) {
  return `<article class="${opts.quiet ? 'lr-card-quiet' : 'lr-card'}">
    ${opts.num ? `<span class="lr-num">${String(opts.num).padStart(2, '0')}</span>` : ''}
    ${opts.kicker ? `<p class="lr-label-sm ${opts.num ? 'mt-4' : ''}">${esc(opts.kicker)}</p>` : ''}
    <h4 class="lr-h3 ${opts.num || opts.kicker ? 'mt-2' : ''}">${esc(title)}</h4>
    ${text ? `<p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(text)}</p>` : ''}
    ${evidence ? ev(evidence) : ''}
  </article>`;
}

function labeledList(items: C.Labeled[], ease = false) {
  return `<ul class="lr-list${ease ? ' lr-list-ease' : ''}" role="list">${items
    .map((i) => `<li><span><strong class="font-medium">${esc(i.label)}.</strong> ${esc(i.text)}</span></li>`)
    .join('')}</ul>`;
}

function intro(kicker: string, title: string, lede: string, extra = '') {
  return `<div class="lr-intro">
    <div class="flex flex-wrap items-center gap-3"><p class="lr-date">${esc(kicker)}</p>${extra}</div>
    <h3 class="lr-h1">${esc(title)}</h3>
    <p class="lr-lede">${esc(lede)}</p>
  </div>`;
}

function sectionHead(title: string, subText?: string) {
  return `<div class="lr-section-head"><div><h3 class="lr-h2">${esc(title)}</h3>${subText ? `<p class="lr-sub max-w-2xl">${esc(subText)}</p>` : ''}</div></div>`;
}

/** Sub-navigation: pills that switch between sub-sections inside a tab. */
function subnav(tab: string, items: Array<[string, string]>, active: string) {
  return `<nav class="lr-subnav" aria-label="${esc(tab)} sections">${items
    .map(([id, label]) => `<button type="button" data-sub="${id}" aria-pressed="${id === active}">${esc(label)}</button>`)
    .join('')}</nav>`;
}
const sub = (id: string, active: string, html: string) =>
  `<div class="lr-sub" data-sub-panel="${id}" ${id === active ? '' : 'hidden'}>${html}</div>`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Quiet invitation to a one-to-one consultation. */
function consultCta(topic: string, line?: string) {
  return `<aside class="lr-cta">
    <div>
      <p class="lr-label-sm">Go deeper</p>
      <p class="mt-1.5 text-[0.9875rem] leading-relaxed text-charcoal">${esc(line ?? `Want this turned into a plan for your exact situation? In a one-to-one consultation we go through your ${topic} with you — your questions, your timing, your next steps.`)}</p>
    </div>
    <a class="btn-secondary shrink-0" href="/consultations" data-lr-cta="${esc(topic)}">Book a consultation</a>
  </aside>`;
}

/** A full life-area report: standing, mechanism, actions, dated timing, what to avoid. */
function reportHtml(r: I.TopicReport, opts: { cta?: boolean } = {}) {
  const win = r.windows.length
    ? `<ul class="mt-3 grid gap-3" role="list">${r.windows
        .map((w) => `<li class="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span class="lr-pill ${w.strength === 'strong' ? 'lr-tone-good' : 'lr-tone-steady'} !py-0.5 !text-[0.7rem]">${w.strength === 'strong' ? 'Strong' : 'Good'}</span><span class="font-medium tabular-nums text-ink">${esc(shortDate(w.start))} – ${esc(shortDate(w.end))}</span><span class="text-sm text-ink-500">${esc(w.why)}</span></li>`)
        .join('')}</ul>`
    : '<p class="mt-3 text-[0.9375rem] text-charcoal">No strong activation in the next two years — a time for steady maintenance rather than big moves here.</p>';
  return `<article class="lr-card lr-report">
    <p class="lr-label-sm">${esc(r.title)}</p>
    <h4 class="lr-h2 mt-2">${esc(r.verdict)}</h4>
    <p class="mt-3 max-w-3xl text-[0.9875rem] leading-relaxed text-charcoal">${esc(r.standing)}</p>
    <div class="mt-7 grid gap-8 lg:grid-cols-2">
      <div>
        <p class="lr-label-sm">How it works for you</p>
        <ul class="lr-list" role="list">${r.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
      <div>
        <p class="lr-label-sm">Do this</p>
        <ol class="mt-3 grid gap-3" role="list">${r.actions.map((a, i) => `<li class="grid grid-cols-[1.75rem_1fr] gap-2 text-[0.9375rem] leading-relaxed text-ink"><span class="lr-num !h-6 !w-6 !text-[0.65rem]">${i + 1}</span><span>${esc(a)}</span></li>`).join('')}</ol>
        <div class="mt-5 rounded-xl bg-warm-cream p-4 text-[0.9375rem]"><span class="font-medium text-ink">Avoid:</span> ${esc(r.avoid)}</div>
      </div>
    </div>
    <div class="mt-7 border-t border-line pt-6">
      <p class="lr-label-sm">Your timing for this — next 24 months</p>
      ${win}
    </div>
    ${ev(r.evidence)}
    ${opts.cta ? consultCta(r.title.toLowerCase()) : ''}
  </article>`;
}
const longDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* ═══════════ Controller ═══════════ */

type Tab = 'today' | 'reading' | 'you' | 'seasons' | 'people' | 'decide' | 'chart';
const TABS: Tab[] = ['today', 'reading', 'you', 'seasons', 'people', 'decide', 'chart'];

class LifeRhythm {
  private profile: UserBirthProfile | null = null;
  private chart: ComprehensiveKundliResult | null = null;
  private partner: UserBirthProfile | null = null;
  private partnerChart: ComprehensiveKundliResult | null = null;
  private place: GeocodedPlace | null = null;
  private partnerPlace: GeocodedPlace | null = null;
  private timePicker: TimePicker | null = null;
  private todayPlace: TodayPlace | null = null;
  private autoPlace: TodayPlace | null = null;
  private mode: 'simple' | 'pro' = 'simple';
  private tab: Tab = 'today';
  private chartStyle: ChartStyle = 'north';
  private varga = 'D1';
  private subs: Record<string, string> = { today: 'overview', you: 'profile', seasons: 'chapter', people: 'partner', decide: 'ask' };

  private app = document.getElementById('lr-app') as HTMLElement;
  private results = document.getElementById('lr-results') as HTMLElement;

  init() {
    if (!this.app) return;
    this.bindIntake();
    this.bindChrome();
    this.setMode(storageGet<string>(MODE_KEY) === 'pro' ? 'pro' : 'simple', false);
    this.chartStyle = (storageGet<string>(STYLE_KEY) as ChartStyle) || 'north';
    this.bindHeaderTools();
    this.todayPlace = storageGet<TodayPlace>(TODAY_PLACE_KEY);

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
    const picker = mountTimePicker(document.querySelector<HTMLElement>('[data-lr-timepicker="lr-time"]')!, time);
    this.timePicker = picker;

    (document.getElementById('lr-date') as HTMLInputElement).max = fmtISO(new Date());
    attachPlaceSearch(placeInput, placeList, (p) => (this.place = p));
    unknown.addEventListener('change', () => {
      picker.setDisabled(unknown.checked);
      document.getElementById('lr-time-hint')!.textContent = unknown.checked
        ? 'No problem. We’ll use midday — your life chapters stay reliable, but daily and house-based details become approximate.'
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
      this.run(
        { name, birthDate: date, birthTime: t, isTimeUnknown: isUnknown, cityName: placeInput.value, latitude: p.latitude, longitude: p.longitude, timezone: offsetForLocal(p.timezone, date, t), ianaTimezone: p.timezone },
        true
      );
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
    const unknown = document.getElementById('lr-time-unknown') as HTMLInputElement;
    this.timePicker?.set(p.birthTime);
    unknown.checked = p.isTimeUnknown;
    this.timePicker?.setDisabled(p.isTimeUnknown);
    (document.getElementById('lr-place') as HTMLInputElement).value = p.cityName;
    this.place = { id: 0, name: p.cityName, country: '', latitude: p.latitude, longitude: p.longitude, timezone: p.ianaTimezone || 'UTC' };
  }

  /* ─── Chrome: tabs, sub-tabs, mode ─── */

  private bindChrome() {
    // Mark the sticky tab bar while it is pinned under the site header.
    const bar = this.app.querySelector<HTMLElement>('.lr-tabs-wrap');
    if (bar && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => bar.classList.toggle('is-stuck', e.intersectionRatio < 1 && e.boundingClientRect.top < 120), {
        rootMargin: '-77px 0px 0px 0px',
        threshold: [1],
      }).observe(bar);
    }
    this.app.querySelectorAll<HTMLButtonElement>('[data-lr-mode]').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.lrMode as 'simple' | 'pro')));
    const tabs = Array.from(this.app.querySelectorAll<HTMLButtonElement>('[data-lr-tab]'));
    tabs.forEach((b) => b.addEventListener('click', () => this.setTab(b.dataset.lrTab as Tab, true)));
    this.app.querySelector('[role="tablist"]')?.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      const visible = tabs.filter((t) => t.offsetParent !== null);
      const i = visible.findIndex((t) => t.dataset.lrTab === this.tab);
      const next = k === 'ArrowRight' ? (i + 1) % visible.length : k === 'ArrowLeft' ? (i - 1 + visible.length) % visible.length : k === 'Home' ? 0 : k === 'End' ? visible.length - 1 : -1;
      if (next < 0) return;
      e.preventDefault();
      this.setTab(visible[next].dataset.lrTab as Tab, false);
      visible[next].focus();
    });

    // Sub-navigation (delegated, since panels are re-rendered)
    this.app.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.lr-subnav button[data-sub]');
      if (!btn) return;
      const panel = btn.closest<HTMLElement>('.lr-panel')!;
      const id = btn.dataset.sub!;
      this.subs[panel.id.replace('lr-panel-', '')] = id;
      panel.querySelectorAll<HTMLButtonElement>('.lr-subnav button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      panel.querySelectorAll<HTMLElement>('[data-sub-panel]').forEach((p) => (p.hidden = p.dataset.subPanel !== id));
      this.scrollToContent(btn.closest<HTMLElement>('.lr-subnav') ?? panel);
    });

    document.getElementById('lr-edit')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('lr-intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private setMode(mode: 'simple' | 'pro', persist = true) {
    this.mode = mode;
    this.app.dataset.mode = mode;
    this.app.querySelectorAll<HTMLButtonElement>('[data-lr-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lrMode === mode)));
    if (persist) storageSet(MODE_KEY, mode);
    if (mode === 'simple' && this.tab === 'chart') this.setTab('today', false);
  }

  private setTab(tab: Tab, scroll: boolean) {
    this.tab = tab;
    for (const t of TABS) {
      const btn = document.getElementById(`lr-tab-${t}`)!;
      const panel = document.getElementById(`lr-panel-${t}`)!;
      btn.setAttribute('aria-selected', String(t === tab));
      btn.tabIndex = t === tab ? 0 : -1;
      panel.hidden = t !== tab;
    }
    if (scroll) this.scrollToContent(document.getElementById(`lr-panel-${tab}`)!.parentElement!);
  }

  /** If the reader is already below `el`, bring its top back to just under the sticky tab bar. */
  private scrollToContent(el: HTMLElement) {
    let abs = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) abs += n.offsetTop;
    const bar = this.app.querySelector<HTMLElement>('.lr-tabs-wrap');
    const stickTop = bar ? parseFloat(getComputedStyle(bar).top) || 0 : 0;
    const target = Math.max(0, abs - stickTop - (bar?.offsetHeight ?? 0) - 8);
    if (window.scrollY > target) window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
  }

  /* ─── Header tools: profiles, language, PDF ─── */

  private profiles(): UserBirthProfile[] {
    return storageGet<UserBirthProfile[]>(PROFILES_KEY) ?? [];
  }

  private saveProfile(p: UserBirthProfile) {
    const key = (x: UserBirthProfile) => `${x.name}|${x.birthDate}|${x.birthTime}|${x.cityName}`;
    const list = this.profiles().filter((x) => key(x) !== key(p));
    list.unshift(p);
    storageSet(PROFILES_KEY, list.slice(0, 20));
    this.renderProfileSwitch();
  }

  private renderProfileSwitch() {
    const sel = document.getElementById('lr-profile-switch') as HTMLSelectElement | null;
    if (!sel) return;
    const list = this.profiles();
    sel.innerHTML =
      list.map((x, i) => `<option value="${i}">${esc(x.name || 'Unnamed')} · ${esc(fmtBirthDate(x.birthDate))}</option>`).join('') +
      `<option value="add">＋ ${'Add someone'}</option>`;
    sel.value = '0';
    sel.closest<HTMLElement>('[data-lr-profiles]')!.hidden = list.length === 0;
  }

  private bindHeaderTools() {
    const sel = document.getElementById('lr-profile-switch') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => {
      if (sel.value === 'add') {
        (document.getElementById('lr-form') as HTMLFormElement).reset();
        this.place = null;
        this.timePicker?.set('12:00');
        document.getElementById('lr-intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sel.value = '0';
        return;
      }
      const p = this.profiles()[Number(sel.value)];
      if (p) {
        this.fillForm(p);
        this.run(p, false);
      }
    });
    document.getElementById('lr-print')?.addEventListener('click', () => this.printReport());
    window.addEventListener('afterprint', () => this.app.classList.remove('lr-printing'));
    this.renderProfileSwitch();
  }

  /** Print-ready report of every section (the browser's “Save as PDF”). */
  private printReport() {
    this.app.classList.add('lr-printing');
    this.app.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
    const stamp = document.getElementById('lr-print-stamp');
    if (stamp) stamp.textContent = `Life Rhythm report · ${this.profile?.name || 'Personal'} · created ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · wellnessfirstglobal.com`;
    window.setTimeout(() => window.print(), 50);
  }

  /* ─── Run ─── */

  private run(profile: UserBirthProfile, scroll: boolean) {
    this.profile = profile;
    storageSet(STORAGE_KEY, profile);
    this.saveProfile(profile);
    this.chart = this.compute(profile);
    this.partnerChart = this.partner ? this.compute(this.partner) : null;
    this.renderHeader();
    this.renderToday();
    this.renderReading();
    this.renderYou();
    this.renderSeasons();
    this.renderPeople();
    this.renderDecide();
    this.renderChartData();
    this.results.hidden = false;
    this.setTab(this.mode === 'simple' && this.tab === 'chart' ? 'today' : this.tab, false);
    if (scroll) this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void this.resolveAutoPlace();
  }

  private compute(p: UserBirthProfile): ComprehensiveKundliResult {
    const tz = p.ianaTimezone ? offsetForLocal(p.ianaTimezone, p.birthDate, p.birthTime) : p.timezone;
    return calculateJanamKundli({ date: buildUtcDate(p.birthDate, p.birthTime, tz), latitude: p.latitude, longitude: p.longitude, timezone: tz });
  }

  private renderHeader() {
    const p = this.profile!;
    document.getElementById('lr-head-name')!.textContent = p.name ? `${p.name}’s rhythm` : 'Your rhythm';
    document.getElementById('lr-head-meta')!.textContent = [`Born ${fmtBirthDate(p.birthDate)}`, p.isTimeUnknown ? 'time not known' : fmtClock(p.birthTime), p.cityName].join(' · ');
    const note = document.getElementById('lr-head-note')!;
    note.hidden = !p.isTimeUnknown;
    note.textContent = 'Without a birth time we’ve used midday. Your life chapters are still reliable; your rising sign, life areas and daily details are approximate.';
  }

  /**
   * Where the person is today (for sunrise-based hours).
   * Priority: their choice / exact position → their device's time zone city → their birth place.
   */
  private place4Today(): TodayPlace {
    if (this.todayPlace) return this.todayPlace;
    if (this.autoPlace) return this.autoPlace;
    const p = this.profile!;
    return { name: p.cityName, latitude: p.latitude, longitude: p.longitude, timeZone: p.ianaTimezone || deviceTimeZone(), source: 'birth' };
  }

  /** If the device is in a different time zone from the birth place, use the time zone's city (e.g. Europe/Riga → Riga). */
  private async resolveAutoPlace() {
    if (this.todayPlace || this.autoPlace) return;
    const tz = deviceTimeZone();
    if (!this.profile || tz === this.profile.ianaTimezone || !tz.includes('/')) return;
    const city = tz.split('/').pop()!.replace(/_/g, ' ');
    try {
      const hits = await searchGlobalPlaces(city);
      const hit = hits.find((h) => h.timezone === tz) ?? hits[0];
      if (!hit) return;
      this.autoPlace = { name: [hit.name, hit.country].filter(Boolean).join(', '), latitude: hit.latitude, longitude: hit.longitude, timeZone: hit.timezone, source: 'device' };
      this.renderToday();
      this.renderDecide();
    } catch {
      /* offline — keep the birth place */
    }
  }

  private locationBar(loc: TodayPlace) {
    const why = {
      chosen: 'the place you chose',
      gps: 'your current position',
      device: 'your device’s time zone',
      birth: 'your birth place — change it if you live somewhere else',
    }[loc.source ?? 'chosen'];
    return `
      <div class="mb-8 flex flex-wrap items-center gap-3" data-lr-locbar>
        <span class="lr-loc">Times for <strong class="font-medium">${esc(loc.name.split(',')[0])}</strong><button type="button" data-lr-loc-change>Change</button></span>
        <span class="text-sm text-ink-500">Based on ${esc(why)}.</span>
        ${'geolocation' in navigator && loc.source !== 'gps' ? '<button type="button" class="lr-textbtn" data-lr-loc-gps>Use my exact location</button>' : ''}
      </div>
      <div class="relative -mt-4 mb-8 hidden max-w-md" data-lr-loc-form>
        <label for="lr-today-place" class="lr-label">Where are you today?</label>
        <input id="lr-today-place" class="input-wfg" autocomplete="off" placeholder="Start typing a town or city" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lr-today-place-list" />
        <div id="lr-today-place-list" class="lr-places !top-full mt-1" role="listbox" hidden></div>
      </div>`;
  }

  private timeIn(d: Date, tz: string) {
    return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).replace(/\s/g, '').toLowerCase();
  }

  /* ═══════════ TODAY ═══════════ */

  private renderReading() {
    const chart = this.chart!;
    const loc = this.place4Today();
    const r = buildReading(chart, new Date(), { latitude: loc.latitude, longitude: loc.longitude });
    const name = this.profile?.name?.trim();
    const section = (p: (typeof r.parts)[number]) => `
      <section class="lr-reading-part">
        <p class="lr-label-sm">${esc(p.kicker)}</p>
        <h3 class="lr-h2 mt-2">${esc(p.title)}</h3>
        <p class="lr-reading-text">${esc(p.text)}</p>
        ${p.actions.length ? `<div class="lr-reading-do"><p class="lr-reading-do-title">What to do</p><ul>${p.actions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${ev(p.how)}
      </section>`;
    const chartParts = r.parts.filter((p) => p.group === 'chart');
    const timing = r.parts.filter((p) => p.group === 'timing');
    const combos = r.parts.filter((p) => p.group === 'combinations');
    document.getElementById('lr-panel-reading')!.innerHTML = `
      ${intro('Your reading', name ? `${esc(name)}, here is what your chart says` : 'What your chart says', 'Your chart read area by area, in plain English: how each part of your life works for you, which planet runs it and where that leads, and what to do about it. Then where you are in time, and the combinations that shape you. Every statement comes from a specific placement — switch to Pro to see it.')}
      <article class="lr-reading mt-10">
        ${chartParts.map(section).join('')}
        <h2 class="lr-reading-group">Your timing</h2>
        ${timing.map(section).join('')}
        ${combos.length ? `<h2 class="lr-reading-group">Combinations in your chart</h2><div class="grid gap-5 md:grid-cols-2">${combos.map((c) => `<div class="${c.kicker.startsWith('Supportive') ? 'lr-card' : 'lr-card-quiet'}"><p class="lr-label-sm">${esc(c.kicker)}</p><h4 class="lr-h3 mt-2">${esc(c.title)}</h4><p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(c.text)}</p>${ev(c.how)}</div>`).join('')}</div>` : ''}
        <section class="lr-reading-part lr-reading-questions"><p class="lr-label-sm">To sit with this week</p><ol>${r.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></section>
      </article>
      ${consultCta('reading', 'A reading like this is the starting point. In a one-to-one consultation we go through it with you, answer your questions and turn the dates into a concrete plan.')}`;
  }

  private renderToday() {
    const chart = this.chart!;
    const now = new Date();
    const loc = this.place4Today();
    const panchang = calculatePanchang(now, loc.latitude, loc.longitude, loc.timeZone);
    const gochara = calculateGocharaTransits(chart, now);
    const day = I.dayInsight(chart, now, gochara.generalTransitTone);
    const solar = panchang.solarDay!;
    const slots = calculateTimedChoghadiya(solar);
    const t = (d: Date) => this.timeIn(d, loc.timeZone);
    const supportive = day.level !== 'light';
    const headline = (C.DAY_HEADLINE[panchang.vara.lord] ?? C.DAY_HEADLINE.Moon)[supportive ? 0 : 1];
    const levelLabel = { good: 'Supportive day', steady: 'Steady day', light: 'Lighter day' }[day.level];
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.timeZone });
    const town = loc.name.split(',')[0];
    // After sunset, today's daytime windows have passed — show tomorrow's instead.
    const afterSunset = now >= solar.sunset;
    const keyPanchang = afterSunset ? calculatePanchang(new Date(solar.nextSunrise.getTime() + 4 * 3_600_000), loc.latitude, loc.longitude, loc.timeZone) : panchang;
    const keySolar = keyPanchang.solarDay!;
    const keyMu = keyPanchang.muhuratTimes!;
    const keySlots = afterSunset ? calculateTimedChoghadiya(keySolar) : slots;
    const firstPeople = keySlots.find((s) => s.isDay && s.end > now && (s.name === 'Shubh' || s.name === 'Amrit' || s.name === 'Labh'));
    // Label the windows by calendar date in the user's time zone (a Vedic day runs sunrise to sunrise,
    // so after midnight the coming daylight is still "today" on the calendar).
    const calDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: loc.timeZone });
    const keyDateLabel = keySolar.sunrise.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.timeZone });
    const keyIsToday = calDay(keySolar.sunrise) === calDay(now);
    const keyWhen = afterSunset ? (keyIsToday ? 'Later today · ' : 'Tomorrow · ') : '';

    const keyWindows = `
      <section class="lr-section">
        ${sectionHead(`Key windows · ${keyIsToday ? 'today, ' : 'tomorrow, '}${keyDateLabel}`, `From the real sunrise (${t(keySolar.sunrise)}) and sunset (${t(keySolar.sunset)}) in ${town}.`)}
        <div class="grid gap-5 md:grid-cols-3">
          ${card(`${t(keyMu.abhijitMuhurat.start)} – ${t(keyMu.abhijitMuhurat.end)}`, 'Around local noon — a strong window for important decisions and starting things.', 'Abhijit muhurta (8th of 15 daytime muhurtas)', { kicker: `${keyWhen}Best for decisions` })}
          ${firstPeople ? card(`${t(firstPeople.start)} – ${t(firstPeople.end)}`, `${HOURS[firstPeople.name].label}: ${HOURS[firstPeople.name].tip.toLowerCase()}.`, `${firstPeople.name} choghadiya`, { kicker: `${keyWhen}Good for people` }) : card('Later', 'The best daytime windows for meetings have passed.', undefined, { kicker: 'Good for people' })}
          ${card(`${t(keyMu.rahuKalam.start)} – ${t(keyMu.rahuKalam.end)}`, 'Traditionally avoided for starting new things. Fine for routine work.', `Rahu Kalam (octant ${['8', '2', '7', '5', '6', '4', '3'][keySolar.weekday]} of daytime)`, { kicker: `${keyWhen}Avoid new starts`, quiet: true })}
        </div>
      </section>
`;

    const overview = `
      ${intro(dateStr, cap(headline), `Today is ${day.taraPlain} for you. Your natural focus today is ${day.moonArea.name.toLowerCase()} — ${day.moonArea.about.toLowerCase()}.`, `<span class="lr-pill lr-tone-${day.level}">${levelLabel}</span>`)}

      <div class="mt-10 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div class="lr-card flex items-center gap-6">
          <div class="lr-score" style="--p:${day.score};--lr-score-color:${day.level === 'light' ? '#d4bf9a' : 'var(--color-secondary)'}"><div><div><p class="lr-pro font-display text-3xl text-ink">${day.score}</p><p class="lr-pro text-[0.7rem] text-ink-500">of 100</p><p class="lr-simple-only font-display text-lg leading-tight text-ink">${{ good: 'Strong', steady: 'Steady', light: 'Light' }[day.level]}</p></div></div></div>
          <div>
            <p class="lr-label-sm">Your day rhythm</p>
            <p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">Calculated from your own birth details and today’s sky — not a generic daily horoscope.</p>
          </div>
        </div>
        <div class="lr-card">
          <p class="lr-label-sm">Why today feels this way</p>
          <ul class="lr-list" role="list">
            <li><span><strong class="font-medium">Your personal rhythm.</strong> ${esc(cap(day.taraPlain))}.</span></li>
            <li><span><strong class="font-medium">Your mood.</strong> ${day.chandraGood ? 'Feelings and energy tend to flow easily today — a good day for people and for things that need a calm head.' : 'Moods can be a little more sensitive today — leave touchy conversations for another day if you can.'}</span></li>
            <li><span><strong class="font-medium">The bigger picture.</strong> ${gochara.generalTransitTone === 'Highly Supportive' ? 'The bigger picture is on your side right now — a good time to push things forward.' : gochara.generalTransitTone === 'Challenging / Preservative' ? 'The bigger picture is demanding right now, so pace yourself and keep buffers.' : 'The bigger picture is mixed — neither pushing nor holding you back.'}</span></li>
          </ul>
          ${ev(day.evidence)}
        </div>
      </div>

      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="lr-card"><p class="lr-label-sm">Focus on</p>${labeledList(supportive ? C.TODAY_FOCUS.supportive : C.TODAY_FOCUS.steady)}</div>
        <div class="lr-card-quiet"><p class="lr-label-sm">Keep off your plate</p>${labeledList(C.TODAY_AVOID, true)}</div>
      </div>

      ${this.todayExtrasHtml(day, panchang.nakshatra.name, keySlots, keyMu.rahuKalam, now, t, { day: `${keyIsToday ? 'today' : 'tomorrow'}, ${keyDateLabel}`, afterSunset }, loc, keyWindows)}

      ${afterSunset ? '' : keyWindows}

      ${proBlock(
        kv([
          ['Weekday (Vara)', `${esc(panchang.vara.name)} · ${esc(panchang.vara.lord)}`],
          ['Tithi', `${esc(panchang.tithi.name)} · ${esc(panchang.tithi.paksha)} (${Math.round(panchang.tithi.percentageElapsed)}%)`],
          ['Moon nakshatra', `${esc(panchang.nakshatra.name)} pada ${panchang.nakshatra.pada} · ${esc(panchang.nakshatra.lord)}`],
          ['Yoga · Karana', `${esc(panchang.yoga.name)} · ${esc(panchang.karana.name)}`],
          ['Sunrise · Sunset', `${t(solar.sunrise)} · ${t(solar.sunset)}`],
          ['Rahu · Yama · Gulika', `${esc(panchang.muhurats.rahuKalam.start)} · ${esc(panchang.muhurats.yamagandam.start)} · ${esc(panchang.muhurats.gulikaKalam.start)}`],
          ['Sade Sati', gochara.saturnSadeSatiActive ? 'Active' : 'Not active'],
          ['Transit tone', esc(gochara.generalTransitTone)],
        ]) +
          `<div class="mt-5">${table(
            ['Graha', 'Sign', 'From Moon', 'From Lagna', 'SAV', 'Gochara', 'Vedha'],
            gochara.transits.map((x) => [esc(x.planet), esc(x.transitingSign), `H${x.transitingHouseFromMoon}`, `H${x.transitingHouseFromLagna}`, String(x.savPointsInHouse), x.isFavorable ? 'Favourable' : '<span class="muted">Unfavourable</span>', x.hasVedha ? `Yes (${esc(x.vedhaCausingPlanet ?? '')})` : '<span class="muted">—</span>'])
          )}</div>`,
        'Pro detail · Panchang & Gochara'
      )}`;

    const panel = document.getElementById('lr-panel-today')!;
    const a = this.subs.today;
    panel.innerHTML =
      subnav('Today', [['overview', 'Today'], ['hours', 'Best hours'], ['ahead', 'Coming up'], ['travel', 'Travel'], ['reset', 'Reset plan']], a) +
      this.locationBar(loc) +
      sub('overview', a, overview) +
      sub('hours', a, this.hoursHtml(slots, solar, loc, now)) +
      sub('ahead', a, this.comingUpHtml()) +
      sub('travel', a, this.travelHtml(day.level)) +
      sub('reset', a, this.resetHtml(day.level, gochara.saturnSadeSatiActive));
    this.bindTodayPlace(panel);
  }

  /** The daily-return content: a timed plan, today's star, the Moon's area, the week ahead, shifts and a check-in. */
  private todayExtrasHtml(
    day: I.DayInsight,
    nakName: string,
    slots: ReturnType<typeof calculateTimedChoghadiya>,
    rahu: { start: Date; end: Date },
    now: Date,
    t: (d: Date) => string,
    planFor: { day: string; afterSunset: boolean },
    loc: TodayPlace,
    tomorrowExtra = ''
  ) {
    const chart = this.chart!;
    const clear = (s: { start: Date; end: Date }) => !(s.start < rahu.end && s.end > rahu.start);
    const next = (names: string[]) => slots.find((s) => s.isDay && s.end > now && names.includes(s.name) && clear(s));
    const focus = next(['Amrit', 'Labh']);
    const people = next(['Shubh', 'Amrit']);
    const errands = next(['Char']);
    const plan: Array<[string, string, number]> = [];
    if (focus) plan.push([`${t(focus.start)} – ${t(focus.end)}`, 'Your most important task: deep work, an important decision, or the thing you have been putting off.', focus.start.getTime()]);
    if (people && people !== focus) plan.push([`${t(people.start)} – ${t(people.end)}`, 'Calls, meetings and the conversation you need to have — people are more receptive now.', people.start.getTime()]);
    if (errands) plan.push([`${t(errands.start)} – ${t(errands.end)}`, 'Errands, admin, travel and getting around.', errands.start.getTime()]);
    if (rahu.end > now) plan.push([`${t(rahu.start)} – ${t(rahu.end)}`, 'Don’t start anything new or sign anything here — use it for routine work.', rahu.start.getTime()]);
    plan.sort((a, b) => a[2] - b[2]);

    const nd = nakshatraDay(nakName);
    const mh = day.moonArea.house;
    const dayIdx = Math.floor(now.getTime() / 86_400_000);
    const moonAct = C.AREA_PLAYBOOK[mh].act[dayIdx % 3];
    const week = weekAhead(chart, now, loc);
    const best = [...week].sort((a, b) => b.score - a.score)[0];
    const shifts = upcomingShifts(chart, now, 45).slice(0, 6);
    const wd = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: loc.timeZone });
    const dm = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: loc.timeZone });

    const planSec = `
      <section class="lr-section">
        ${sectionHead(`Your plan for ${planFor.day}`, planFor.afterSunset ? `The sun has set, so today’s daytime windows are over — this plan is for the coming day, built from its real sunrise where you are.` : 'Built from today’s real sunrise where you are and the quality of each part of the day.')}
        <ol class="lr-plan" role="list">${plan.map(([time, what]) => `<li><span class="lr-plan-time">${esc(time)}</span><span>${esc(what)}</span></li>`).join('')}</ol>
      </section>
`;

    return `
      ${planFor.afterSunset ? '' : planSec}

      <section class="lr-section">
        <div class="grid gap-5 md:grid-cols-2">
          <article class="lr-card">
            <p class="lr-label-sm">The character of today</p>
            <h4 class="lr-h3 mt-2">${esc(cap(nd.name))}</h4>
            <p class="mt-3 text-sm font-medium text-ink">Good for</p>
            <ul class="mt-1.5 list-disc space-y-1 pl-5 text-[0.9375rem] text-charcoal">${nd.good.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
            <p class="mt-3 text-sm font-medium text-ink">Better avoided</p>
            <ul class="mt-1.5 list-disc space-y-1 pl-5 text-[0.9375rem] text-ink-500">${nd.avoid.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
            ${ev(`The Moon's nakshatra today is ${nakName}. Muhurta texts group the 27 nakshatras by nature (fixed, moving, quick, soft, mixed, sharp, fierce); each group suits different kinds of action.`)}
          </article>
          <article class="lr-card">
            <p class="lr-label-sm">Where your attention goes today</p>
            <h4 class="lr-h3 mt-2">${esc(cap(day.moonArea.name))}</h4>
            <p class="mt-3 text-[0.9375rem] leading-relaxed text-charcoal">Today the focus in your chart falls on ${esc(C.AREA_PLAYBOOK[mh].shows)}. That is where your attention naturally goes — so put it to use.</p>
            <div class="mt-4 rounded-xl bg-white p-4 text-[0.9375rem]"><span class="font-medium text-ink">One thing to do today:</span> ${esc(moonAct)}.</div>
            ${ev(`Transiting Moon in ${day.moonSignName}, your ${I.ORD(mh)} house from the Lagna (${day.moonArea.points} Sarvashtakavarga points).`)}
          </article>
        </div>
      </section>

      ${planFor.afterSunset ? planSec + tomorrowExtra : ''}

      <section class="lr-section">
        ${sectionHead('Your week ahead', `Best day this week: ${best.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.timeZone })} — good for ${best.goodFor}.`)}
        <div class="lr-week">${week
          .map((d, i) => `<div class="lr-week-day lr-tone-${d.level}${d === best ? ' is-best' : ''}">
            <p class="lr-week-name">${i === 0 ? 'Today' : esc(wd(d.date))}</p>
            <p class="lr-week-date">${esc(dm(d.date))}</p>
            <p class="lr-week-score"><span class="lr-pro">${d.score}</span><span class="lr-simple-only">${{ good: 'Strong', steady: 'Steady', light: 'Light' }[d.level]}</span></p>
            <p class="lr-week-for">${esc(cap(d.goodFor))}</p>
          </div>`)
          .join('')}</div>
        ${ev(`Daily score = personal Tarabala and Chandrabala from your birth Moon plus the transit picture, calculated for midday each day. "Good for" = the weekday's planetary ruler.`)}
      </section>

      ${shifts.length ? `<section class="lr-section">
        ${sectionHead('What changes in the coming weeks', 'The bigger shifts ahead for you, with dates — and how to use them.')}
        <ol class="lr-timeline" role="list">${shifts
          .map((x) => `<li><span class="dot" aria-hidden="true"></span><div><p class="lr-label-sm">${esc(x.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: loc.timeZone }))}</p><p class="mt-1 font-medium text-ink">${esc(x.title)}</p><p class="mt-1 text-[0.9375rem] leading-relaxed text-charcoal">${esc(x.text)}</p>${x.action ? `<p class="mt-1 text-sm text-ink"><span class="font-medium">Use it:</span> ${esc(x.action)}.</p>` : ''}${ev(x.pro)}</div></li>`)
          .join('')}</ol>
      </section>` : ''}

      <section class="lr-section">
        <div class="lr-card-quiet">
          <p class="lr-label-sm">This evening</p>
          <h4 class="lr-h3 mt-2">Two-minute check-in</h4>
          <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-[0.9375rem] text-charcoal">
            <li>${focus ? `Did you use ${esc(t(focus.start))}–${esc(t(focus.end))} for your most important task? If not, what got in the way?` : 'What was the most important thing you moved forward today?'}</li>
            <li>What happened today around ${esc(day.moonArea.name.toLowerCase())}? Note one thing — patterns show up within a few weeks.</li>
            <li>What is the one thing for tomorrow, and when will you do it?</li>
          </ol>
        </div>
      </section>`;
  }

  private hoursHtml(slots: TimedSlot[], solar: { sunrise: Date; sunset: Date; nextSunrise: Date; isApproximate: boolean }, loc: TodayPlace, now: Date) {
    const t = (d: Date) => this.timeIn(d, loc.timeZone);
    const total = solar.nextSunrise.getTime() - solar.sunrise.getTime();
    const tone = (n: string): HourTone => HOURS[n]?.tone ?? 'neutral';
    const nowPct = Math.min(100, Math.max(0, ((now.getTime() - solar.sunrise.getTime()) / total) * 100));
    const sunsetPct = ((solar.sunset.getTime() - solar.sunrise.getTime()) / total) * 100;
    const ribbon = slots
      .map((s) => `<span class="t-${tone(s.name)}${s.end <= now ? ' is-past' : ''}" style="flex:${((s.end.getTime() - s.start.getTime()) / total).toFixed(4)} 1 0" title="${esc(`${t(s.start)}–${t(s.end)} · ${HOURS[s.name]?.label ?? ''}`)}"></span>`)
      .join('');
    const ahead = slots.filter((s) => s.end > now && tone(s.name) === 'good').slice(0, 4);
    const windows = ahead.length
      ? ahead
          .map(
            (s) => `<div class="lr-window">
              <div><p class="lr-window-time">${t(s.start)} – ${t(s.end)}</p>${s.start <= now ? '<span class="lr-pill lr-tone-good mt-1.5 !py-0.5 !text-[0.7rem]">Now</span>' : ''}</div>
              <div><p class="font-medium text-ink">${esc(HOURS[s.name].label)}${s.isDay ? '' : ' <span class="text-sm font-normal text-ink-500">· evening</span>'}</p><p class="mt-0.5 text-sm text-ink-500">${esc(HOURS[s.name].tip)}</p></div>
            </div>`
          )
          .join('')
      : `<p class="text-[0.9875rem] leading-relaxed text-charcoal">The strongest periods of this day have passed. Wind down — tomorrow brings a fresh set.</p>`;

    const dl = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: loc.timeZone });
    return `
      ${intro('Best hours', 'When to do what', `This traditional day runs from sunrise to sunrise: ${dl(solar.sunrise)} ${t(solar.sunrise)} until ${dl(solar.nextSunrise)} ${t(solar.nextSunrise)}. Daytime and night-time are each split into eight equal parts. Some suit focus or people; others suit quieter work.`)}
      ${solar.isApproximate ? '<p class="mt-6 text-sm text-ink-500">The sun doesn’t rise or set here today, so a 6am–6pm day is used.</p>' : ''}
      <div class="lr-card mt-6">
        <div class="lr-ribbon !flex" role="img" aria-label="Today from sunrise to the next sunrise">
          ${ribbon}
          <i class="lr-now" style="left:calc(${nowPct.toFixed(2)}% - 1px)" aria-hidden="true"></i>
        </div>
        <div class="relative mt-3 h-5 text-xs tabular-nums text-ink-500" aria-hidden="true">
          <span class="absolute left-0"><span class="hidden sm:inline">Sunrise </span>${t(solar.sunrise)}</span>
          <span class="absolute -translate-x-1/2 whitespace-nowrap" style="left:${sunsetPct.toFixed(1)}%"><span class="hidden sm:inline">Sunset </span>${t(solar.sunset)}</span>
          <span class="absolute right-0">${t(solar.nextSunrise)}</span>
        </div>
        <div class="lr-legend mt-6" aria-hidden="true">
          <span><i style="background:color-mix(in srgb,var(--color-secondary) 70%,#fff)"></i>Good for focus or people</span>
          <span><i style="background:color-mix(in srgb,var(--color-accent) 70%,#fff)"></i>Fine for errands</span>
          <span><i style="background:#ebe5da"></i>Quieter</span>
        </div>
        <div class="mt-8 grid gap-8 md:grid-cols-[13rem_1fr]">
          <div><p class="lr-h3">Best windows ahead</p><p class="mt-1 text-sm text-ink-500">Based on sunrise ${t(solar.sunrise)} and sunset ${t(solar.sunset)}.</p></div>
          <div>${windows}</div>
        </div>
      </div>
      <details class="lr-card-quiet mt-5">
        <summary class="cursor-pointer font-medium text-ink">All 16 periods of today</summary>
        <div class="mt-4">${table(['Time', 'Good for'], slots.map((s) => [`${t(s.start)} – ${t(s.end)}`, `${esc(HOURS[s.name].label)} <span class="muted">· ${esc(HOURS[s.name].tip)}</span>`]), (i) => (slots[i].start <= now && slots[i].end > now ? 'is-now' : ''))}</div>
      </details>
      ${proBlock(
        table(['Slot', 'Choghadiya', 'Quality', 'Classical use'], slots.map((s) => [`${t(s.start)}–${t(s.end)}`, esc(s.name), esc(s.quality), `<span class="muted">${esc(s.recommendedActivity)}</span>`])) +
          `<p class="mt-3">Day = sunrise→sunset ÷ 8; night = sunset→next sunrise ÷ 8. Sunrise/sunset computed for ${loc.latitude.toFixed(3)}°, ${loc.longitude.toFixed(3)}° (${esc(loc.timeZone)}).</p>`,
        'Pro detail · Choghadiya'
      )}`;
  }

  private bindTodayPlace(panel: HTMLElement) {
    const btn = panel.querySelector<HTMLButtonElement>('[data-lr-loc-change]');
    const form = panel.querySelector<HTMLElement>('[data-lr-loc-form]');
    const input = panel.querySelector<HTMLInputElement>('#lr-today-place');
    const listEl = panel.querySelector<HTMLElement>('#lr-today-place-list');
    if (!btn || !form || !input || !listEl) return;
    btn.addEventListener('click', () => {
      form.classList.remove('hidden');
      input.focus();
    });
    const apply = (place: TodayPlace) => {
      this.todayPlace = place;
      storageSet(TODAY_PLACE_KEY, place);
      this.renderToday();
      this.renderDecide();
    };
    attachPlaceSearch(input, listEl, (p) => {
      if (!p) return;
      apply({ name: [p.name, p.country].filter(Boolean).join(', '), latitude: p.latitude, longitude: p.longitude, timeZone: p.timezone, source: 'chosen' });
    });
    panel.querySelector<HTMLButtonElement>('[data-lr-loc-gps]')?.addEventListener('click', (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(
        (pos) => apply({ name: 'Your location', latitude: pos.coords.latitude, longitude: pos.coords.longitude, timeZone: deviceTimeZone(), source: 'gps' }),
        () => (b.textContent = 'Location not available — choose a city instead'),
        { maximumAge: 3_600_000, timeout: 10_000 }
      );
    });
  }

  private comingUpHtml() {
    const chart = this.chart!;
    const { mahadasha: md, antardasha: ad } = chart.dasha.currentDasha;
    const now = new Date();
    const ads = md.antardashas ?? [];
    let next: DashaPeriod | undefined = ads[ads.findIndex((x) => x.startDate.getTime() === ad.startDate.getTime()) + 1];
    if (!next) {
      const mds = chart.dasha.mahadashas;
      next = mds[mds.findIndex((m) => m.startDate.getTime() === md.startDate.getTime()) + 1]?.antardashas?.[0];
    }
    const days = Math.max(0, Math.round((ad.endDate.getTime() - now.getTime()) / 86_400_000));
    const countdown = days > 60 ? `in about ${Math.round(days / 30.4)} months` : `in ${days} days`;
    const curB = I.phaseBrief(chart, ad);
    const nextB = next ? I.phaseBrief(chart, next) : null;
    const areaList = (b: I.PhaseBrief) => b.areas.map((x) => x.name.toLowerCase()).join(' and ');
    const roadmap = (b: I.PhaseBrief) => `<ol class="lr-timeline mt-4" role="list">${b.roadmap
      .map((r) => {
        const isNow = r.start <= now && r.end > now;
        return `<li class="${isNow ? 'is-now' : ''}"><span class="dot" aria-hidden="true"></span><div><p class="lr-label-sm">${esc(shortDate(r.start))} – ${esc(shortDate(r.end))}${isNow ? ' · now' : ''}</p><p class="mt-1 text-[0.9375rem] text-ink"><strong class="font-medium">${esc(cap(r.area.name))}</strong> <span class="text-ink-500">— ${esc(C.AREA_PLAYBOOK[r.area.house].shows)}</span></p><p class="lr-pro lr-ev">${esc(`${b.lord}–${r.lord} pratyantardasha (the third level of Vimshottari). ${r.lord} sits in your ${I.ORD(r.area.house)} house, which has ${r.area.points} Sarvashtakavarga points (28 is average).`)}</p></div></li>`;
      })
      .join('')}</ol>`;

    return `
      ${intro('Coming up', `Your focus shifts ${countdown}`, `Until ${longDate(ad.endDate)} the spotlight is on ${areaList(curB)}. Then ${nextB ? areaList(nextB) : 'a new area'} move${nextB && nextB.areas.length === 1 ? 's' : ''} to the centre.`)}

      <div class="lr-card mt-10">
        <p class="lr-label-sm">Right now · until ${esc(longDate(ad.endDate))}</p>
        <h4 class="lr-h2 mt-2">${esc(cap(areaList(curB)))}</h4>
        <p class="mt-3 max-w-3xl text-[0.9875rem] leading-relaxed text-charcoal">${esc(curB.why)}</p>
        <p class="mt-3 max-w-3xl text-[0.9875rem] leading-relaxed text-charcoal">${esc(curB.strength)}</p>
        <div class="mt-6 grid gap-8 lg:grid-cols-2">
          <div><p class="lr-label-sm">Make the most of the time left</p>${list(curB.actions)}</div>
          <div><p class="lr-label-sm">Finish before ${esc(ad.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }))}</p>${list(curB.close)}${curB.risk ? `<div class="mt-4 rounded-xl bg-warm-cream p-4 text-[0.9375rem]"><span class="font-medium text-ink">Watch out:</span> ${esc(curB.risk)}</div>` : ''}</div>
        </div>
        <details class="mt-6"><summary class="cursor-pointer font-medium text-ink">The smaller phases inside this one</summary>${roadmap(curB)}</details>
        ${ev(curB.evidence)}
      </div>

      ${nextB ? `<div class="lr-feature mt-5">
        <p class="lr-label-sm !text-white/60">Next phase · ${esc(longDate(nextB.start))} – ${esc(longDate(nextB.end))}</p>
        <p class="mt-2 font-display text-3xl font-medium">${esc(cap(areaList(nextB)))}</p>
        <p class="mt-4 max-w-3xl text-[0.9875rem] leading-relaxed text-white/85">${esc(nextB.why)}</p>
        <p class="mt-3 max-w-3xl text-[0.9875rem] leading-relaxed text-white/85">${esc(nextB.strength)}</p>
        <div class="mt-6 grid gap-6 border-t border-white/15 pt-6 lg:grid-cols-2">
          <div><p class="lr-label-sm !text-white/60">Prepare now</p><ul class="mt-3 grid gap-2.5 text-[0.9375rem] text-white/90" role="list">${nextB.actions.map((x) => `<li>— ${esc(x)}</li>`).join('')}</ul></div>
          <div><p class="lr-label-sm !text-white/60">Watch out</p><p class="mt-3 text-[0.9375rem] text-white/90">${esc(nextB.risk ?? 'No weak spot stands out — the main risk is simply not using the window.')}</p></div>
        </div>
        <p class="lr-pro lr-ev !text-white/70">${esc(nextB.evidence)}</p>
      </div>
      <details class="lr-card-quiet mt-5"><summary class="cursor-pointer font-medium text-ink">Month-by-month inside the next phase</summary>${roadmap(nextB)}</details>` : ''}

      ${consultCta('upcoming phase', 'Phase changes are the best moment for a consultation: we map the next months with you and decide what to start, finish and let go — specific to your situation.')}
      ${proBlock(kv([['Current', `${esc(md.lord)} MD / ${esc(ad.lord)} AD`], ['AD ends', fmtISO(ad.endDate)], ['Next AD', next ? `${esc(next.lord)} from ${fmtISO(next.startDate)}` : '—']]), 'Pro detail · Vimshottari transition')}`;
  }

  private travelHtml(level: 'good' | 'steady' | 'light') {
    const el = this.chart!.ascendant.sign.element as ElementType;
    const tr = C.TRAVEL[el];
    const readiness = level === 'good' ? 'Good timing for travel' : level === 'steady' ? 'Fine to travel — allow some extra time' : 'Better to stay local today if you can';
    return `
      ${intro('Travel', readiness, 'Directions and places that tend to suit you, based on your rising sign. Use them as a gentle tiebreaker when you have a choice.', `<span class="lr-pill lr-tone-${level}">${level === 'good' ? 'Green light' : level === 'steady' ? 'With buffer' : 'Stay grounded'}</span>`)}
      <div class="mt-10 grid gap-5 md:grid-cols-3">
        ${card(tr.work, 'Directions that tend to support work trips, meetings and new opportunities.', `Lagna element: ${el}`, { kicker: 'For work' })}
        ${card(tr.rest, 'Directions that tend to suit holidays, retreats and recovery.', undefined, { kicker: 'For rest' })}
        ${card(C.TRAVEL_CAUTION, 'Not a no-go — just plan buffers for delays and logistics.', undefined, { kicker: 'Allow extra time', quiet: true })}
      </div>
      <div class="lr-card mt-5"><p class="lr-label-sm">Places that tend to suit you</p><p class="mt-3 font-display text-xl leading-snug text-ink">${esc(tr.places)}</p></div>`;
  }

  private resetHtml(level: 'good' | 'steady' | 'light', sadeSati: boolean) {
    const { mahadasha: md, antardasha: ad } = this.chart!.dasha.currentDasha;
    const blend = I.blendInsight(this.chart!, md.lord, ad.lord);
    const reasons: string[] = [];
    if (sadeSati) reasons.push('You are in a long, multi-year consolidation cycle that clears out what isn’t sustainable. Friction now is part of the process, not a sign of failure.');
    if (level === 'light') reasons.push('Today itself is a lighter day for you, so pushing hard costs more than usual.');
    if (blend.tone === 'low') reasons.push('Your current phase pulls slightly against your bigger chapter, which can feel like working against the grain.');
    if (!reasons.length) reasons.push('Nothing in your timing points to a crisis right now. If you still feel overwhelmed, your pace may simply be out of step with what the moment asks for — the steps below still help.');
    return `
      ${intro('Reset plan', 'Feeling overwhelmed? Start here.', 'Four simple steps to take the pressure down. Use them whenever things feel like too much.')}
      <div class="lr-card-quiet mt-10"><p class="lr-label-sm">What may be behind it</p>${list(reasons)}${ev(`Sade Sati: ${sadeSati ? 'active' : 'inactive'} · day level: ${level} · ${blend.evidence}`)}</div>
      <div class="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">${C.RESET_STEPS.map((s, i) => card(s.title, s.text, undefined, { num: i + 1 })).join('')}</div>`;
  }

  /* ═══════════ YOU ═══════════ */

  private renderYou() {
    const chart = this.chart!;
    const bal = chart.elementBalance as Record<ElementType, number>;
    const sorted = (Object.entries(bal) as Array<[ElementType, number]>).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0) || 1;
    const [primary, secondary] = [sorted[0][0], sorted[1][0]];
    const asc = chart.ascendant;
    const { Moon: moon, Sun: sun, Mars: mars, Mercury: merc, Saturn: sat } = chart.planets;
    const archetype = C.ARCHETYPE[`${primary}-${secondary}`] ?? 'Your working style';

    const bars = sorted
      .map(([el, v]) => `<div>
          <div class="flex items-baseline justify-between gap-3"><p class="font-medium text-ink">${esc(ELEMENTS[el].label)} <span class="font-normal text-ink-500">· ${esc(ELEMENTS[el].meaning)}</span></p><p class="text-sm tabular-nums text-ink-500">${Math.round((v / total) * 100)}%</p></div>
          <div class="lr-bar mt-2"><i style="width:${((v / sorted[0][1]) * 100).toFixed(1)}%"></i></div>
        </div>`)
      .join('');

    const profile = `
      ${intro('Your profile', archetype, `${temperamentHeadline(primary, secondary)}. ${C.ARCHETYPE_SUMMARY[primary]}`)}
      <div class="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div class="lr-card"><p class="lr-label-sm">Your mix of qualities</p><div class="mt-5 grid gap-5">${bars}</div>${ev(sorted.map(([e, v]) => `${e} ${v}`).join(' · ') + ' (Lagna, Sun, Moon ×2; others ×1)')}</div>
        <div class="lr-card-quiet"><p class="lr-label-sm">Looking after yourself</p><p class="mt-4 font-display text-xl leading-snug text-ink">${esc(ELEMENTS[primary].care)}</p></div>
      </div>
      <section class="lr-section">
        ${sectionHead('Three sides of you', 'Each comes from a different part of your chart.')}
        <div class="grid gap-5 md:grid-cols-3">
          ${card('Your natural energy', C.RISING[asc.sign.name], `Lagna ${asc.sign.name} ${asc.formattedDegree} · ${asc.nakshatra.name} ${asc.nakshatraPada}`, { kicker: 'How you come across' })}
          ${card('How you handle stress', `${C.MOON_RESET[moon.sign.name].style} What helps: ${C.MOON_RESET[moon.sign.name].reset}`, I.explainPlanet(chart, 'Moon'), { kicker: 'Your inner world' })}
          ${card('Where you shine', C.SUN_HOUSE[sun.house], I.explainPlanet(chart, 'Sun'), { kicker: 'Your purpose' })}
        </div>
      </section>`;

    const pillars: Array<[C.Pillar, string]> = [
      [C.pillarAction(mars.sign.name, mars.isRetrograde), I.explainPlanet(chart, 'Mars')],
      [C.pillarThinking(merc.sign.name, merc.isRetrograde), I.explainPlanet(chart, 'Mercury')],
      [C.pillarLeadership(sun.house), I.explainPlanet(chart, 'Sun')],
      [C.pillarLongTerm(sat.house, sat.isRetrograde), I.explainPlanet(chart, 'Saturn')],
    ];
    const work = `
      ${intro('How you work', 'Four sides of how you get things done', 'How you act, think, lead and build for the long term — each based on a different planet in your chart.')}
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        ${pillars
          .map(([p, e]) => `<article class="lr-card">
            <p class="lr-label-sm">${esc(p.area)}</p>
            <h4 class="lr-h3 mt-2">${esc(p.style)}</h4>
            <dl class="mt-4 grid gap-4 text-[0.9375rem] leading-relaxed">
              <div><dt class="font-medium text-ink">Your strength</dt><dd class="text-charcoal">${esc(p.strength)}</dd></div>
              <div><dt class="font-medium text-ink">Watch out for</dt><dd class="text-charcoal">${esc(p.trap)}</dd></div>
              <div class="rounded-xl bg-muted-bg p-4"><dt class="font-medium text-ink">Rule of thumb</dt><dd class="text-charcoal">${esc(p.rule)}</dd></div>
            </dl>
            ${ev(e)}
          </article>`)
          .join('')}
      </div>`;

    const ns = I.naturalStrengths(chart, STRENGTHS);
    const ext = I.areaExtremes(chart);
    const baseYogas = (chart.yogas as any[]).map((y) => ({ name: y.name, title: C.YOGA_PLAIN[y.name]?.title, use: C.YOGA_PLAIN[y.name]?.use, ev: `${y.name} · ${y.category}`, strength: '' })).filter((x) => x.title);
    const extYogas = chart.extendedYogas ?? [];
    const supportive = [...baseYogas, ...extYogas.filter((y) => y.nature === 'supportive').map((y) => ({ name: y.name, title: y.plainTitle, use: y.plainUse, ev: `${y.name} · ${y.description} · strength ${y.strength}`, strength: y.strength }))];
    const challenging = extYogas.filter((y) => y.nature === 'challenging');
    const strengths = `
      ${intro('Strengths & watch-outs', 'What comes easily — and what needs care', 'Based on the classical six-part strength of each planet in your chart, and how much support each area of your life receives.')}
      <section class="lr-section !mt-10">
        ${sectionHead('What tends to come naturally')}
        <div class="grid gap-5 md:grid-cols-3">${ns.top.map((f, i) => card(f.title, f.text, f.evidence, { num: i + 1 })).join('')}</div>
      </section>
      <section class="lr-section">
        ${sectionHead('Where life tends to flow most easily', 'The three areas of your life with the most built-in support.')}
        <div class="grid gap-5 md:grid-cols-3">
          ${ext.best.map((x) => `<article class="lr-card"><div class="flex items-center justify-between gap-3"><p class="lr-label-sm">${LEVEL_WORD[x.level]}</p>${meter(x.level)}</div><h4 class="lr-h3 mt-2">${esc(x.name)}</h4><p class="mt-2 text-[0.9375rem] text-charcoal">${esc(x.about)}. This is one of the parts of your life where effort goes furthest — ${esc(lcFirst(C.AREA_PLAYBOOK[x.house].act[0]))}.</p>${ev(I.explainArea(chart, x.house))}</article>`).join('')}
        </div>
      </section>
      ${supportive.length ? `<section class="lr-section">${sectionHead(`${supportive.length} special combinations in your chart`, 'Classical planetary combinations (yogas) found in your chart, graded by how strong the planets forming them are.')}<div class="grid gap-5 md:grid-cols-2">${supportive.map((y) => card(y.title!, y.use!, y.ev, { kicker: y.strength ? `${cap(y.strength)} · ${y.name}` : y.name })).join('')}</div></section>` : ''}
      ${challenging.length ? `<section class="lr-section">${sectionHead('Combinations that ask for care', 'Not bad luck — patterns where a little structure makes a big difference.')}<div class="grid gap-5 md:grid-cols-2">${challenging.map((y) => card(y.plainTitle, y.plainUse, `${y.name} · ${y.description}`, { quiet: true, kicker: y.name })).join('')}</div></section>` : ''}
      <section class="lr-section">
        ${sectionHead('What may take more effort', 'Not weaknesses — areas where a little structure goes a long way.')}
        <div class="grid gap-5 md:grid-cols-2">${ns.low.map((f) => card(f.title, f.text, f.evidence, { quiet: true })).join('')}</div>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          ${ext.hardest.map((x) => {
            const l = C.LEAK[x.house];
            return `<article class="lr-card-quiet"><p class="lr-label-sm">${esc(x.name)}</p><h4 class="lr-h3 mt-2">${esc(l.title)}</h4><p class="mt-2 text-[0.9375rem] text-charcoal">${esc(l.risk)}</p><div class="mt-4 rounded-xl bg-white p-4 text-[0.9375rem]"><span class="font-medium text-ink">What helps:</span> ${esc(l.fix)}</div>${ev(I.explainArea(chart, x.house))}</article>`;
          }).join('')}
        </div>
        ${proBlock(table(['Graha', 'Sthana', 'Dig', 'Kala', 'Chesta', 'Naisarg.', 'Drik', 'Rupas', 'Req.', 'Ratio', 'Ishta', 'Kashta'], Object.values(chart.shadbala as Record<string, any>).map((s) => [esc(s.planet), s.sthanaBala.toFixed(1), s.digBala.toFixed(1), s.kaalaBala.toFixed(1), s.chestaBala.toFixed(1), s.naisargikaBala.toFixed(1), s.drikBala.toFixed(1), s.totalRupas.toFixed(2), s.requiredRupas.toFixed(1), s.strengthRatio.toFixed(2), String(s.ishtaPhala ?? '—'), String(s.kashtaPhala ?? '—')])), 'Pro detail · Shadbala (virupas, BPHS)')}
      </section>`;

    const rhythm = DAILY_RHYTHM[primary];
    const routine = `
      ${intro('Daily routine', 'A day that suits you', 'A simple structure built around your natural energy. Adjust it to your life.')}
      <div class="mt-10 grid gap-5 md:grid-cols-3">
        ${card('Morning', rhythm.morning, `Primary element: ${primary}`, { kicker: 'Start' })}
        ${card('Focus time', rhythm.focus, undefined, { kicker: 'Deep work' })}
        ${card('Evening', rhythm.evening, undefined, { kicker: 'Wind down' })}
      </div>
      <section class="lr-section">
        ${sectionHead('Your day, step by step')}
        <ol class="lr-timeline" role="list">${C.DAILY_ROUTINE.map((s) => `<li><span class="dot" aria-hidden="true"></span><div><p class="lr-label-sm">${esc(s.time)}</p><p class="lr-h3 mt-1">${esc(s.step)}</p><p class="mt-1 text-[0.9375rem] text-charcoal">${esc(s.text)}</p></div></li>`).join('')}</ol>
      </section>`;

    const h10el = chart.houses[9].sign.element as ElementType;
    const ws = C.WORK_STYLE[h10el];
    const cf = I.careerFindings(chart);
    const mdCh = I.chapterInsight(chart, chart.dasha.currentDasha.mahadasha);
    const careerActive = [mdCh.stage.house, ...mdCh.topics.map((x) => x.house)].some((h) => [2, 10, 11].includes(h));
    const d10 = (chart.shodashvarga as any)?.D10?.placements as Array<any> | undefined;
    const workMoney = `
      ${intro('Work & money', ws.title, ws.summary, `<span class="lr-pill lr-tone-steady">${esc(ws.label)}</span>`)}
      <div class="mt-10 grid gap-5">
        ${card(cf.direction.title, cf.direction.text, cf.direction.evidence)}
        ${reportHtml(I.topicReport(chart, 'career'))}
        ${reportHtml(I.topicReport(chart, 'money'), { cta: true })}
      </div>
      <div class="lr-card-quiet mt-5">
        <p class="lr-label-sm">In this chapter of your life</p>
        <p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">${careerActive ? `Your current chapter directly involves work and money — it plays out in your area of ${esc(mdCh.stage.name.toLowerCase())}. This is a period to invest in your career deliberately.` : `Your current chapter is focused more on ${esc(mdCh.stage.name.toLowerCase())} than on career. Keep work steady and put your extra energy where the chapter is pointing.`}</p>
        ${ev(mdCh.evidence)}
      </div>
      <section class="lr-section">
        ${sectionHead('Four money rules that suit you')}
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">${C.MONEY_RULES.map((r, i) => card(r.title, r.text, undefined, { num: i + 1 })).join('')}</div>
        <p class="mt-6 text-xs text-ink-500">General guidance on pacing, not financial advice.</p>
      </section>
      ${d10 ? proBlock(table(['Graha', 'D10 sign'], d10.map((p) => [esc(p.planet), esc(p.sign?.name ?? '')])), 'Pro detail · Dasamsa (D10)') : ''}`;

    const fast = bal.Fire + bal.Air >= bal.Earth + bal.Water;
    const et = fast ? C.ENERGY_TYPE.fast : C.ENERGY_TYPE.steady;
    const hf = I.healthFindings(chart);
    const health = `
      ${intro('Health & energy', et.title, et.summary, `<span class="lr-pill lr-tone-${fast ? 'steady' : 'good'}">${esc(et.label)}</span>`)}
      <div class="mt-10 grid gap-5">${reportHtml(I.topicReport(chart, 'health'))}</div>
      <div class="mt-5 grid gap-5 md:grid-cols-2">${hf.slice(1).map((f) => card(f.title, f.text, f.evidence, { quiet: true })).join('')}</div>
      <section class="lr-section">
        ${sectionHead('Where stress tends to show up', 'Common places tension collects for people with your pace.')}
        <div class="grid gap-5 md:grid-cols-3">${C.STRESS_SPOTS.map((s) => card(s.title, s.text, undefined, { quiet: true })).join('')}</div>
      </section>
      <section class="lr-section">
        ${sectionHead('Your recovery plan')}
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          ${card('Morning', rhythm.morning, undefined, { num: 1 })}
          ${card('Movement', C.MOVEMENT[primary], undefined, { num: 2 })}
          ${card('Sleep', C.SLEEP[primary], undefined, { num: 3 })}
          ${card('Evening', rhythm.evening, undefined, { num: 4 })}
        </div>
        <p class="mt-6 text-xs text-ink-500">${esc(C.HEALTH_NOTE)}</p>
        ${ev(`Element balance: Fire+Air ${bal.Fire + bal.Air} vs Earth+Water ${bal.Earth + bal.Water}`)}
        ${consultCta('energy and recovery')}
      </section>`;

    const homeLearning = `
      ${intro('Home & growth', 'Home, family and learning', 'Two more areas of your life, read the same way — where you stand, how it works for you, what to do and when.')}
      <div class="mt-10 grid gap-5">${reportHtml(I.topicReport(chart, 'home'))}${reportHtml(I.topicReport(chart, 'learning'), { cta: true })}</div>`;

    const panel = document.getElementById('lr-panel-you')!;
    const a = this.subs.you;
    panel.innerHTML =
      subnav('You', [['profile', 'Profile'], ['work-style', 'How you work'], ['strengths', 'Strengths'], ['routine', 'Daily routine'], ['work', 'Work & money'], ['health', 'Health & energy'], ['home', 'Home & growth']], a) +
      sub('profile', a, profile) + sub('work-style', a, work) + sub('strengths', a, strengths) + sub('routine', a, routine) + sub('work', a, workMoney) + sub('health', a, health) + sub('home', a, homeLearning);
  }

  /* ═══════════ SEASONS ═══════════ */

  private renderSeasons() {
    const chart = this.chart!;
    const now = new Date();
    const birth = chart.birthDetails.date;
    const cd = chart.dasha.currentDasha;
    const { mahadasha: md, antardasha: ad } = cd;
    const S = C.SEASON[md.lord];
    const SA = C.SEASON[ad.lord];
    const mdI = I.chapterInsight(chart, md);
    const adI = I.chapterInsight(chart, ad);
    const blend = I.blendInsight(chart, md.lord, ad.lord);
    const mds = chart.dasha.mahadashas;
    const mdIdx = mds.findIndex((m) => m.startDate.getTime() === md.startDate.getTime());
    const nextMd = mds[mdIdx + 1];
    const pct = (p: DashaPeriod) => Math.min(100, Math.max(0, ((now.getTime() - p.startDate.getTime()) / (p.endDate.getTime() - p.startDate.getTime())) * 100));
    const stage = C.stageOf(pct(ad));
    const topicsText = mdI.topics.length ? ` It also keeps bringing up ${mdI.topics.map((x) => x.name.toLowerCase()).join(' and ')}.` : '';

    const chapter = `
      ${intro('This chapter', S.era, `${S.theme} In your chart, this chapter plays out mainly in your area of ${mdI.stage.name.toLowerCase()} — ${mdI.stage.about.toLowerCase()}.${topicsText}`)}
      <div class="lr-feature mt-10">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p class="lr-label-sm !text-white/60">The chapter you’re in · ${esc(S.role)}</p><p class="mt-2 font-display text-3xl font-medium sm:text-4xl">${esc(CHAPTERS[md.lord].short)}</p></div>
          <p class="text-sm text-white/75">${esc(fmtMonthYear(md.startDate))} – ${esc(fmtMonthYear(md.endDate))} · ${esc(durationPhrase(yearsBetween(now, md.endDate)))} to go</p>
        </div>
        <div class="lr-progress mt-6" role="progressbar" aria-label="Progress through this chapter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct(md))}"><i style="width:${pct(md).toFixed(1)}%"></i></div>
        <div class="mt-8 grid gap-6 border-t border-white/15 pt-6 md:grid-cols-3">
          <div><p class="lr-label-sm !text-white/60">How well supported</p><p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${esc(mdI.supportText)}</p></div>
          <div><p class="lr-label-sm !text-white/60">Right now · until ${esc(fmtMonthYear(ad.endDate))}</p><p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${esc(SA.phase)}, playing out in your area of ${esc(adI.stage.name.toLowerCase())}. ${esc(stage.label)} — ${esc(stage.text.toLowerCase())}</p></div>
          <div><p class="lr-label-sm !text-white/60">Next chapter</p><p class="mt-2 text-[0.9875rem] leading-relaxed text-white/90">${nextMd ? `${esc(C.SEASON[nextMd.lord].era)}, from ${esc(fmtMonthYear(nextMd.startDate))}` : '—'}</p></div>
        </div>
        <p class="lr-pro lr-ev !text-white/70">${esc(mdI.evidence)}</p>
      </div>
      <div class="lr-card-quiet mt-5"><p class="lr-label-sm">How the big chapter and the current phase fit together</p><p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">${esc(blend.text)}</p>${ev(blend.evidence + ' · ' + adI.evidence)}</div>
      <section class="lr-section">
        ${sectionHead('What this phase feels like')}
        <div class="grid gap-5 md:grid-cols-2">${card('Around you', SA.outside, undefined, { kicker: 'Outside' })}${card('Inside you', SA.inside, undefined, { kicker: 'Inside', quiet: true })}</div>
      </section>
      <section class="lr-section">
        ${sectionHead('Your three priorities right now')}
        <div class="grid gap-5 md:grid-cols-3">${SA.priorities.map((p, i) => card(p, '', undefined, { num: i + 1 })).join('')}</div>
      </section>
      <section class="lr-section">
        <div class="grid gap-5 md:grid-cols-2">
          <div class="lr-card"><p class="lr-label-sm">Say yes to</p>${list(SA.yes)}</div>
          <div class="lr-card-quiet"><p class="lr-label-sm">Say no to</p>${list(SA.no, true)}</div>
        </div>
        <div class="lr-card-quiet mt-5"><p class="lr-label-sm">Common pitfalls in this phase</p>${list(SA.pitfalls, true)}</div>
        ${consultCta('life chapter', 'A chapter like this lasts years. In a consultation we look at how it plays out in your life specifically, and plan the key decisions inside it.')}
      </section>
      ${proBlock(table(['Level', 'Lord', 'Start', 'End'], ([['Mahadasha', md], ['Antardasha', ad], ['Pratyantardasha', cd.pratyantardasha], ['Sookshma', cd.sookshmaDasha], ['Prana', cd.praanaDasha]] as Array<[string, DashaPeriod | undefined]>).filter(([, d]) => d).map(([n, d]) => [esc(n), esc(d!.lord), fmtISO(d!.startDate), fmtISO(d!.endDate)])) + `<p class="mt-3">Vimshottari from Moon ${esc(chart.planets.Moon.formattedDegree)} ${esc(chart.planets.Moon.sign.name)} (${esc(chart.planets.Moon.nakshatra.name)}). Birth lord ${esc(chart.dasha.birthLord)}, balance ${chart.dasha.birthBalanceYears.toFixed(2)} y.</p>`, 'Pro detail · Vimshottari (5 levels)')}`;

    const st = I.slowTransits(chart, now);
    const horizon = new Date(now.getTime() + YEAR_MS);
    const upcoming: DashaPeriod[] = [];
    for (const m of mds) for (const x of m.antardashas ?? []) if (x.endDate > now && x.startDate < horizon) upcoming.push(x);
    const quarters = [0, 1, 2, 3].map((q) => {
      const qs = new Date(now.getTime() + (q * YEAR_MS) / 4);
      const qe = new Date(now.getTime() + ((q + 1) * YEAR_MS) / 4);
      return { qs, qe, active: upcoming.filter((x) => x.startDate < qe && x.endDate > qs), ingress: st.filter((s) => s.until && s.until >= qs && s.until < qe) };
    });
    const year = `
      ${intro('This year', 'The next twelve months', `${SA.phase} sets the tone, while the slow-moving planets shape the background. Here are the big influences, with their real dates.`)}
      <section class="lr-section !mt-10">
        ${sectionHead('The big background influences', 'Jupiter, Saturn and the lunar nodes move slowly, so their effect lasts months or years.')}
        <div class="grid gap-5 md:grid-cols-3">
          ${st.map((s) => `<article class="${s.favourable ? 'lr-card' : 'lr-card-quiet'}"><div class="flex items-center justify-between gap-3"><p class="lr-label-sm">${esc(s.planet === 'Rahu' ? 'Lunar node' : s.planet)}</p><span class="lr-pill ${s.favourable ? 'lr-tone-good' : 'lr-tone-light'} !py-0.5 !text-[0.7rem]">${s.favourable ? 'Supportive' : 'Demanding'}</span></div><h4 class="lr-h3 mt-2">${esc(s.area.name)}</h4><p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(s.plain)}</p>${s.until ? `<p class="mt-3 text-sm font-medium text-ink">Until about ${esc(longDate(s.until))}</p>` : ''}${ev(s.evidence)}</article>`).join('')}
        </div>
      </section>
      <section class="lr-section">
        ${sectionHead('Quarter by quarter')}
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          ${quarters.map((q, i) => `<article class="lr-card"><p class="lr-label-sm">${esc(fmtMonthYear(q.qs))} – ${esc(fmtMonthYear(q.qe))}</p><h4 class="lr-h3 mt-2">${esc(C.QUARTER_FOCUS[i].title)}</h4><p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(C.QUARTER_FOCUS[i].text)}</p>${q.active.length ? `<p class="mt-3 text-sm text-ink-500">Focus on ${esc(q.active.map((x) => CHAPTERS[x.lord].focus).join(', then '))}.</p>` : ''}${q.ingress.length ? `<p class="mt-2 text-sm text-ink-500">${esc(q.ingress.map((s) => `${s.planet === 'Rahu' ? 'The nodes change' : `${s.planet} changes`} sign ${s.until!.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`).join('; '))}.</p>` : ''}${ev(q.active.map((x) => `${x.lord} AD`).join(' → '))}</article>`).join('')}
        </div>
      </section>
      <section class="lr-section">
        <div class="grid gap-5 md:grid-cols-2">${card('Biggest opportunity this year', SA.priorities[0], undefined, { kicker: 'Breakthrough' })}${card('Biggest risk this year', SA.pitfalls[0], undefined, { kicker: 'Watch out', quiet: true })}</div>
      </section>`;

    const lifeEnd = new Date(birth.getTime() + 100 * YEAR_MS);
    const span = lifeEnd.getTime() - birth.getTime();
    const segs = mds.filter((m) => m.startDate < lifeEnd).map((m) => {
      const s = Math.max(m.startDate.getTime(), birth.getTime());
      const e = Math.min(m.endDate.getTime(), lifeEnd.getTime());
      return { m, w: ((e - s) / span) * 100, a0: (s - birth.getTime()) / YEAR_MS, a1: (e - birth.getTime()) / YEAR_MS };
    });
    const life = `
      ${intro('Life map', 'Your life in chapters', 'Life tends to move in long seasons, each with its own character. Here is how yours are laid out — and where you are now.')}
      <div class="lr-card mt-10">
        <div class="lr-life" role="img" aria-label="Life chapters from birth to age 100">
          ${segs.map(({ m, w }) => `<div class="${m === md ? 'is-now' : m.endDate < now ? 'is-past' : ''}" style="flex:0 0 calc(${w.toFixed(3)}% - 3px)" title="${esc(CHAPTERS[m.lord].short)}"><span>${w > 9 ? esc(CHAPTERS[m.lord].short) : ''}</span></div>`).join('')}
        </div>
        <div class="lr-life-axis" aria-hidden="true">${[0, 20, 40, 60, 80, 100].map((x) => `<span style="left:${x}%;${x === 0 ? 'transform:none' : x === 100 ? 'transform:translateX(-100%)' : ''}">${x === 0 ? 'Birth' : x}</span>`).join('')}</div>
        <ol class="mt-8 list-none gap-x-10 sm:columns-2" role="list">
          ${segs.map(({ m, a0, a1 }) => {
            const ci = I.chapterInsight(chart, m);
            return `<li class="break-inside-avoid border-t border-line py-4 ${m === md ? 'text-ink' : 'text-charcoal'}">
              <div class="flex items-baseline justify-between gap-4"><span class="font-medium">${esc(C.SEASON[m.lord].era)}${m === md ? ' <span class="lr-pill lr-tone-good ml-1 !py-0.5 !text-[0.7rem]">You are here</span>' : ''}</span><span class="shrink-0 text-sm tabular-nums text-ink-500">age ${Math.floor(a0)}–${Math.floor(a1)}</span></div>
              <p class="mt-1 text-sm text-ink-500">Mainly about ${esc(ci.stage.name.toLowerCase())} · ${esc(LEVEL_WORD[ci.support].toLowerCase())} support</p>
            </li>`;
          }).join('')}
        </ol>
        <p class="mt-6 text-sm text-ink-500">You are ${Math.floor(yearsBetween(birth, now))}. Chapters describe pace and focus — not fixed outcomes.</p>
      </div>
      ${proBlock(table(['Mahadasha', 'Start', 'End', 'Years', 'Lord in', 'Support'], mds.map((m) => { const ci = I.chapterInsight(chart, m); return [esc(m.lord), fmtISO(m.startDate), fmtISO(m.endDate), m.durationYears.toFixed(2), `H${ci.condition.house}`, ci.support]; }), (i) => (i === mdIdx ? 'is-now' : '')), 'Pro detail · 120-year Vimshottari')}`;

    const ss = chart.doshas.sadeSati;
    const phaseKey = !ss.isActive ? 'none' : ss.phase.includes('1st') ? 1 : ss.phase.includes('2nd') ? 2 : 3;
    const lc = C.LONG_CYCLE[phaseKey as keyof typeof C.LONG_CYCLE];
    const saturn = st.find((s) => s.planet === 'Saturn')!;
    const jupiter = st.find((s) => s.planet === 'Jupiter')!;
    const cycles = `
      ${intro('Long cycles', 'The slow rhythms behind your years', 'Some influences last for years. Knowing where you are in them helps you pace yourself.')}
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <article class="${ss.isActive ? 'lr-card-quiet' : 'lr-card'}"><p class="lr-label-sm">Consolidation cycle</p><h4 class="lr-h3 mt-2">${esc(lc.label)}</h4><p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(lc.text)}</p>${saturn.until ? `<p class="mt-3 text-sm font-medium text-ink">Saturn changes sign around ${esc(longDate(saturn.until))}</p>` : ''}${ev(`Sade Sati: ${ss.phase} · Saturn in ${ss.saturnSign}, natal Moon ${ss.moonSign}`)}</article>
        <article class="${jupiter.favourable ? 'lr-card' : 'lr-card-quiet'}"><p class="lr-label-sm">Growth cycle</p><h4 class="lr-h3 mt-2">${jupiter.favourable ? 'Jupiter is helping you' : 'Jupiter’s help is quieter now'}</h4><p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">${esc(jupiter.plain)}</p>${jupiter.until ? `<p class="mt-3 text-sm font-medium text-ink">Until about ${esc(longDate(jupiter.until))}</p>` : ''}${ev(jupiter.evidence)}</article>
      </div>`;

    const panel = document.getElementById('lr-panel-seasons')!;
    const a = this.subs.seasons;
    panel.innerHTML =
      subnav('Seasons', [['chapter', 'This chapter'], ['year', 'This year'], ['annual', 'Year chart'], ['life', 'Life map'], ['cycles', 'Long cycles'], ['systems', 'Other systems']], a) +
      sub('chapter', a, chapter) + sub('year', a, year) + sub('annual', a, this.annualHtml()) + sub('life', a, life) + sub('cycles', a, cycles) + sub('systems', a, this.systemsHtml());
  }

  private annualHtml() {
    const chart = this.chart!;
    const now = new Date();
    const loc = this.place4Today();
    const v = calculateVarshaphal(chart, now, { latitude: loc.latitude, longitude: loc.longitude });
    const munthaArea = C.LIFE_AREA[v.muntha.house];
    const yl = v.yearLord;
    const ylHouse = v.planets[yl].house;
    const nextBirthday = new Date(v.pravesha.getTime() + 365.2564 * 86_400_000);
    const ylNatal = I.planetCondition(chart, yl);
    return `
      ${intro('Year chart', `Your year since ${longDate(v.pravesha)}`, `Each year a new chart is cast for the exact moment the Sun returns to where it was when you were born — your astronomical birthday. This one runs until about ${longDate(nextBirthday)}.`)}
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <article class="lr-card"><p class="lr-label-sm">The theme of this year</p><h4 class="lr-h2 mt-2">${esc(cap(munthaArea.name))}</h4><p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">The year’s focal point (Muntha) falls in your ${esc(munthaArea.name.toLowerCase())} area this year — ${esc(C.AREA_PLAYBOOK[v.muntha.house].shows)}. ${[6, 8, 12].includes(v.muntha.house) ? 'That is one of the more demanding positions, so pace yourself and keep a buffer.' : [1, 9, 10, 11].includes(v.muntha.house) ? 'That is one of the most supportive positions — a year to move things forward.' : 'A year to work steadily on this area.'}</p>
          <p class="lr-label-sm mt-6">Do this year</p>${list(C.AREA_PLAYBOOK[v.muntha.house].act)}
          ${ev(`Muntha is the year's progressed point: it starts in your Lagna sign at birth and moves one sign per year. This year it is in ${v.muntha.sign}, the ${I.ORD(v.muntha.house)} house of the year chart, ruled by ${v.muntha.lord}. Muntha in the 1st, 9th, 10th or 11th is read as supportive; in the 6th, 8th or 12th as demanding.`)}</article>
        <article class="lr-card"><p class="lr-label-sm">The planet in charge of this year</p><h4 class="lr-h2 mt-2">${esc(yl)}</h4><p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">${esc(yl)} brings ${esc(I.PLANET_NATURE[yl].brings)} to this year, and works best through ${esc(I.PLANET_NATURE[yl].works)}. In the year chart it sits in your ${esc(C.LIFE_AREA[ylHouse].name.toLowerCase())} area. In your birth chart it is ${esc(ylNatal.phrase)}.</p>
          ${ev(`The year lord (Varsheshvara) is chosen from five office-holders (Pancha-adhikari): the strongest of them that aspects the year chart's Lagna. Candidates: ${v.candidates.map((c) => `${c.role} ${c.planet}${c.aspectsLagna ? ' (aspects)' : ''}`).join(' · ')}`)}</article>
      </div>
      <section class="lr-section">
        ${sectionHead('Month by month', 'The year is split into nine periods — each lights up a different part of life.')}
        <ol class="lr-timeline" role="list">
          ${v.mudda.map((m) => {
            const isNow = now >= m.start && now < m.end;
            const area = C.LIFE_AREA[chart.planets[m.lord].house];
            return `<li class="${isNow ? 'is-now' : ''}"><span class="dot" aria-hidden="true"></span><div><p class="lr-label-sm">${esc(shortDate(m.start))} – ${esc(shortDate(m.end))}${isNow ? ' · now' : ''}</p><p class="mt-1 text-[0.9375rem] text-ink"><strong class="font-medium">${esc(cap(area.name))}</strong> <span class="text-ink-500">— ${esc(C.AREA_PLAYBOOK[chart.planets[m.lord].house].act[0])}</span></p><p class="lr-pro lr-ev">${esc(`Mudda dasha: ${m.lord} · ${m.days.toFixed(0)} days`)}</p></div></li>`;
          }).join('')}
        </ol>
        ${consultCta('year ahead', 'A birthday-year consultation maps this year with you month by month — what to start, when to push and when to rest.')}
      </section>
      ${proBlock(kv([['Varsha Pravesha', v.pravesha.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'], ['Completed years', String(v.age)], ['Annual Lagna', `${esc(v.ascendant.sign.name)} ${esc(v.ascendant.formattedDegree)}`], ['Year lord', esc(yl)]]) + `<div class="mt-5">${table(['Graha', 'Sign', 'Degree', 'House'], PLANET_ORDER.map((n) => [esc(n), esc(v.planets[n].sign.name), esc(v.planets[n].formattedDegree), String(v.planets[n].house)]))}</div>`, 'Pro detail · Varshaphal (Tajika)')}`;
  }

  private systemsHtml() {
    const chart = this.chart!;
    const now = new Date();
    const systems = [calculateYoginiDasha(chart, now), calculateCharaDasha(chart, now), calculateAshtottariDasha(chart, now)];
    const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const houseOfSign = (sign: string) => ((SIGNS.indexOf(sign) - chart.ascendant.sign.index + 12) % 12) + 1;
    const houseOf = (r: ReturnType<typeof calculateYoginiDasha>, x: { label: string; lord?: I.PlanetKey }) =>
      r.system === 'Chara' ? houseOfSign(x.label) : chart.planets[x.lord!].house;

    // What the main (Vimshottari) timing currently highlights: where its two lords sit and what they rule.
    const { mahadasha: md, antardasha: ad } = chart.dasha.currentDasha;
    const vimAreas = new Set<number>([md.lord, ad.lord].flatMap((l) => [chart.planets[l].house, ...I.housesRuledBy(chart, l)]));
    const names = { Yogini: 'Yogini cycle · 36 years', Chara: 'Jaimini sign cycle', Ashtottari: 'Ashtottari cycle · 108 years' };
    const how = {
      Yogini: 'Eight periods of 1 to 8 years (36 in all), each run by a planet. Your starting point comes from the star the Moon was in when you were born: (nakshatra number + 3) divided by 8, the remainder picks the first yogini; the part of that star the Moon had already crossed is treated as already used up.',
      Chara: 'Jaimini’s Chara dasha (K.N. Rao method). Periods belong to signs, not planets, starting from your rising sign. A sign’s period in years is the count from that sign to the sign holding its ruler, minus one (12 if the ruler sits in the sign itself), counted forwards or backwards depending on the sign. Each period is split into 12 equal sub-periods, one per sign.',
      Ashtottari: 'Eight planets (Ketu is left out) over 108 years, starting from the group of nakshatras your Moon was in. Classically it is used only when Rahu is in a kendra or trikona from the Lagna lord, and not in the Lagna itself.',
    } as const;

    const cardFor = (r: ReturnType<typeof calculateYoginiDasha>) => {
      const m = r.current.main;
      const sb = r.current.sub;
      const mh = houseOf(r, m);
      const sh = sb ? houseOf(r, sb) : null;
      const P = C.AREA_PLAYBOOK;
      const agrees = vimAreas.has(mh) || (sh != null && vimAreas.has(sh));
      const agreeArea = vimAreas.has(mh) ? mh : sh!;
      const intro =
        r.system === 'Chara'
          ? `This period belongs to your ${C.LIFE_AREA[mh].name.toLowerCase()} sector, the part of your life about ${P[mh].shows}.`
          : `${m.lord} runs this period. It brings ${I.PLANET_NATURE[m.lord!].brings} into the part of your life about ${P[mh].shows}.`;
      const subLine = sb && sh
        ? sh === mh
          ? `Right now (until ${shortDate(sb.end)}) the focus sharpens on the same area — this is the most concentrated stretch of the period.`
          : `Right now (until ${shortDate(sb.end)}) the focus narrows to ${C.LIFE_AREA[sh].name.toLowerCase()}: ${P[sh].shows}.`
        : '';
      const todo = [P[mh].act[0], sh && sh !== mh ? P[sh].act[0] : P[mh].act[1]];
      const agreeHtml = r.applicable === false
        ? `<p class="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink-500"><span class="font-medium text-ink">Reference only.</span> The classical condition for using this system isn’t met in your chart, so ${agrees ? 'even though it points to the same area as your main timing, it doesn’t count as confirmation' : 'give it the least weight'}.</p>`
        : agrees
        ? `<p class="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink"><span class="font-medium">Agrees with your main timing.</span> Your main timing system also points to ${esc(C.LIFE_AREA[agreeArea].name.toLowerCase())} right now — treat this as a confirmed theme and give it priority.</p>`
        : `<p class="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink-500"><span class="font-medium text-ink">A different emphasis.</span> Your main timing points elsewhere right now — treat this as a background theme, not your first priority.</p>`;
      const subPro = sb && sh ? ` Current sub-period: ${sb.label}${sb.lord && sb.lord !== sb.label ? ` (${sb.lord})` : ''}, your ${I.ORD(sh)} house, ${fmtISO(sb.start)} to ${fmtISO(sb.end)}.` : '';
      const mainPro = r.system === 'Chara'
        ? `Current period: ${m.label}, your ${I.ORD(mh)} house, ${fmtISO(m.start)} to ${fmtISO(m.end)} (${m.years} years).`
        : `Current period: ${m.label}${m.lord && m.lord !== m.label ? ` (ruled by ${m.lord})` : ''}, ${fmtISO(m.start)} to ${fmtISO(m.end)} (${m.years.toFixed(m.years % 1 ? 2 : 0)} years). ${m.lord} sits in your ${I.ORD(mh)} house.`;
      const vimPro = ` Agreement check: the current Vimshottari ${md.lord}–${ad.lord} period activates houses ${[...vimAreas].sort((x, y) => x - y).join(', ')} (where the two lords sit and what they rule); this system's period${sh ? 's are' : ' is'} in house ${mh}${sh && sh !== mh ? ` and ${sh}` : ''}.`;
      return `<article class="${r.applicable === false ? 'lr-card-quiet' : 'lr-card'}">
        <p class="lr-label-sm">${esc(names[r.system])}</p>
        <h4 class="lr-h3 mt-2">${esc(cap(C.LIFE_AREA[mh].name))} <span class="font-normal text-ink-500">· until ${esc(fmtMonthYear(m.end))}</span></h4>
        <p class="mt-3 text-[0.9375rem] leading-relaxed text-charcoal">${esc(intro)} ${esc(subLine)}</p>
        <p class="mt-4 text-sm font-medium text-ink">What to do with it</p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem] text-charcoal">${todo.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${agreeHtml}
        ${ev(`${how[r.system]} ${mainPro}${subPro}${r.note ? ` ${r.note}` : ''}${vimPro}`)}
      </article>`;
    };
    const agreeing = systems.filter((r) => r.applicable !== false && (vimAreas.has(houseOf(r, r.current.main)) || (r.current.sub ? vimAreas.has(houseOf(r, r.current.sub)) : false))).length;
    return `
      ${intro('Other systems', 'A second and third opinion on timing', `Astrology has several independent ways of timing life. Your main timing (shown under “This chapter”) uses one of them. Here three others check it. ${agreeing >= 2 ? `Right now ${agreeing} of them agree with your main timing — so its themes are especially reliable.` : agreeing === 1 ? 'Right now one of them agrees with your main timing; the others add background themes.' : 'Right now they point to other areas than your main timing — treat those as background themes, and keep your main timing as your guide.'}`)}
      <div class="mt-10 grid gap-5 lg:grid-cols-3">${systems.map(cardFor).join('')}</div>
      ${proBlock(systems.map((r) => `<p class="lr-pro-tag mt-4">${esc(r.system)}</p>${table(['Period', 'House', 'Start', 'End', 'Years'], r.periods.slice(0, 16).map((x) => [`${esc(x.label)}${x.lord && x.lord !== x.label ? ` <span class="muted">${esc(x.lord)}</span>` : ''}`, String(houseOf(r, x)), fmtISO(x.start), fmtISO(x.end), x.years.toFixed(2)]), (i) => (r.periods[i] === r.current.main ? 'is-now' : ''))}`).join(''), 'Pro detail · Yogini, Chara, Ashtottari (house = counted from your Lagna)')}`;
  }

  /* ═══════════ PEOPLE ═══════════ */

  private renderPeople() {
    const chart = this.chart!;
    const rf = I.relationshipFindings(chart);
    let partner = intro('Partner', 'How your rhythms fit together', 'Start with what your own chart says about relationships — then add someone’s details to compare.') + `<div class="mt-10 grid gap-5">${reportHtml(I.topicReport(chart, 'relationships'))}</div><div class="mt-5 grid gap-5 md:grid-cols-2">${rf.map((f) => card(f.title, f.text, f.evidence, { quiet: true })).join('')}</div>`;
    partner += `<section class="lr-section">${this.partner && this.partnerChart ? this.partnerResult() : sectionHead('Compare with someone') + this.partnerForm()}</section>`;

    const h5el = chart.houses[4].sign.element as ElementType;
    const cs = C.CHILD_STYLE[h5el];
    let progenyPro = '';
    try {
      const pg = calculateProgenyAnalysis(chart, 'Joint');
      const dc = calculateDerivedChart(chart, 'First Child');
      const rows: Array<[string, string]> = [
        ['5H (D1)', `${esc(pg.fifthHouseD1Status.sign)} · lord ${esc(pg.fifthHouseD1Status.lord)}${pg.fifthHouseD1Status.occupyingPlanets.length ? ` · ${esc(pg.fifthHouseD1Status.occupyingPlanets.join(', '))}` : ''}`],
        ['Jupiter aspect on 5H', pg.fifthHouseD1Status.jupiterAspect ? 'Yes' : 'No'],
        ['D7 5H sign', esc(pg.d7SaptamsaOverview.fifthHouseD7Sign)],
        ['Derived lagna (1st child)', `${esc(dc.derivedAscendantSign)} · ${esc(dc.derivedAscendantLord)}`],
      ];
      if (pg.maleBeejaSphuta) rows.push(['Beeja sphuta', `${esc(pg.maleBeejaSphuta.sign)} ${esc(pg.maleBeejaSphuta.degreeInSign)} · ${esc(pg.maleBeejaSphuta.vitalityScore)}`]);
      if (pg.femaleKshetraSphuta) rows.push(['Kshetra sphuta', `${esc(pg.femaleKshetraSphuta.sign)} ${esc(pg.femaleKshetraSphuta.degreeInSign)} · ${esc(pg.femaleKshetraSphuta.receptivityScore)}`]);
      progenyPro = proBlock(kv(rows) + `<p class="mt-3">${esc(pg.d7SaptamsaOverview.progenySummary)}</p>`, 'Pro detail · Saptamsa, sphutas, Bhavat Bhavam');
    } catch {
      /* optional module */
    }
    const children = `
      ${intro('Children', cs.title, cs.learning)}
      <div class="mt-10 grid gap-5">${reportHtml(I.topicReport(chart, 'children'), { cta: true })}</div>
      <div class="lr-card-quiet mt-5"><p class="lr-label-sm">Pace and routine</p><p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">${esc(cs.pacing)}</p>${ev(`5H ${chart.houses[4].sign.name} (${h5el})`)}</div>
      <section class="lr-section">${sectionHead('Three principles that help')}<div class="grid gap-5 md:grid-cols-3">${C.PARENTING_PRINCIPLES.map((p, i) => card(p.title, p.text, undefined, { num: i + 1 })).join('')}</div></section>
      ${progenyPro}`;

    const panel = document.getElementById('lr-panel-people')!;
    const a = this.subs.people;
    panel.innerHTML = subnav('People', [['partner', 'Partner'], ['children', 'Children']], a) + sub('partner', a, partner) + sub('children', a, children);
    if (!this.partnerChart) this.bindPartnerForm(panel);
    panel.querySelector('[data-lr-partner-reset]')?.addEventListener('click', () => {
      this.partner = null;
      this.partnerChart = null;
      storageSet(PARTNER_STORAGE_KEY, null);
      this.renderPeople();
    });
  }

  private partnerResult(): string {
    const a = this.chart!;
    const b = this.partnerChart!;
    const k = calculateAshtakoota(a.planets.Moon.siderealLongitude, b.planets.Moon.siderealLongitude);
    const syn = calculateRelationalSynastry(a, b, 'Spousal / Romantic');
    const cp = compatibilityCopy(k.totalScore);
    const you = this.profile!.name || 'You';
    const them = this.partner!.name || 'Them';
    const cats = Object.entries(k.categories) as Array<[string, { maxScore: number; obtainedScore: number; name: string; description: string }]>;
    const mdA = I.chapterInsight(a, a.dasha.currentDasha.mahadasha);
    const mdB = I.chapterInsight(b, b.dasha.currentDasha.mahadasha);
    return `
      <div class="lr-card">
        <div class="flex flex-col gap-8 md:flex-row md:items-center">
          <div class="lr-ring shrink-0" style="--p:${Math.round((k.totalScore / 36) * 100)}" role="img" aria-label="${esc(cp.headline)}"><div><div><p class="font-display text-3xl text-ink">${k.totalScore}</p><p class="text-xs text-ink-500">of 36</p></div></div></div>
          <div class="flex-1"><p class="lr-label-sm">${esc(you)} &amp; ${esc(them)}</p><p class="lr-h2 mt-2">${esc(cp.headline)}</p><p class="lr-sub max-w-2xl">${esc(cp.body)}</p><p class="mt-4 text-[0.9375rem] text-charcoal">${esc(SYNERGY_PLAIN[syn.dashaResonance.mutualSynergy] ?? '')}</p></div>
          <button type="button" class="lr-textbtn self-start md:self-center" data-lr-partner-reset>Compare someone else</button>
        </div>
        <div class="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <div><p class="lr-label-sm">${esc(you)} — current chapter</p><p class="lr-h3 mt-1.5">${esc(C.SEASON[mdA.lord].era)}</p><p class="mt-1 text-sm text-ink-500">Mainly about ${esc(mdA.stage.name.toLowerCase())}</p></div>
          <div><p class="lr-label-sm">${esc(them)} — current chapter</p><p class="lr-h3 mt-1.5">${esc(C.SEASON[mdB.lord].era)}</p><p class="mt-1 text-sm text-ink-500">Mainly about ${esc(mdB.stage.name.toLowerCase())}</p></div>
        </div>
      </div>
      <div class="mt-10">${sectionHead('Where you match, and where you differ')}
        <div class="grid gap-x-12 gap-y-7 md:grid-cols-2">
          ${cats.map(([key, c]) => {
            const r = c.maxScore ? c.obtainedScore / c.maxScore : 0;
            const d = C.PARTNER_DIMENSIONS[key];
            return `<div><div class="flex items-baseline justify-between gap-3"><p class="font-medium text-ink">${esc(d?.title ?? c.name)}</p><p class="shrink-0 text-sm text-ink-500">${r >= 0.75 ? 'Strong' : r >= 0.4 ? 'Mixed' : 'Needs care'}</p></div><p class="mt-0.5 text-sm text-ink-500">${esc(d?.text ?? '')}</p><div class="lr-bar mt-2"><i style="width:${Math.max(4, r * 100).toFixed(0)}%;${r < 0.4 ? 'background:#d4bf9a' : ''}"></i></div></div>`;
          }).join('')}
        </div>
        <p class="mt-8 max-w-2xl text-sm leading-relaxed text-ink-500">Areas marked “needs care” are where clear, kind conversations help most. No score decides a relationship.</p>
        ${consultCta('relationship', 'Want to understand this relationship properly? A couples or partnership consultation goes through both charts with you — strengths, friction points and timing.')}
      </div>
      ${proBlock(table(['Koota', 'Score', 'Max', 'Note'], cats.map(([, c]) => [esc(c.name), String(c.obtainedScore), String(c.maxScore), `<span class="muted">${esc(c.description)}</span>`])) + `<div class="mt-5">${kv([['Ashtakoota', `${k.totalScore} / 36 (${k.percentage}%) · ${esc(k.verdict)}`], ['Moon nakshatras', `${esc(a.planets.Moon.nakshatra.name)} · ${esc(b.planets.Moon.nakshatra.name)}`], ['Mahadashas', `${esc(syn.dashaResonance.partnerAMahadasha)} · ${esc(syn.dashaResonance.partnerBMahadasha)}`], ['Manglik A / B', `${a.doshas.manglik.isManglik ? esc(a.doshas.manglik.severity) : 'No'} / ${b.doshas.manglik.isManglik ? esc(b.doshas.manglik.severity) : 'No'}`]])}</div>` + (syn.crossContacts.length ? `<div class="mt-5">${table(['A planet', 'In B house', 'Contact', 'With'], syn.crossContacts.map((c) => [esc(c.planetA), `H${c.houseInChartB}`, esc(c.contactType), esc(c.contactPartnerPlanet ?? '—')]))}</div>` : '') + `<p class="mt-3">${esc(syn.dashaResonance.guidance)} ${esc(syn.overallPacingVerdict)}</p>`, 'Pro detail · Ashtakoota & synastry')}`;
  }

  private partnerForm(): string {
    return `
      <div class="lr-card max-w-3xl">
        <div class="flex items-baseline justify-between gap-4 border-b border-primary/10 pb-5"><p class="font-display text-xl font-medium text-ink">Their details</p><button type="button" class="lr-textbtn" data-lr-partner-demo>Use an example</button></div>
        <form class="mt-6 grid gap-6 sm:grid-cols-2" data-lr-partner novalidate>
          <div><label for="lr-p-name" class="lr-label">Their name <span class="lr-optional">Optional</span></label><input id="lr-p-name" class="input-wfg" placeholder="First name" /></div>
          <div><label for="lr-p-date" class="lr-label">Date of birth</label><input id="lr-p-date" type="date" class="input-wfg" min="1900-01-01" max="${fmtISO(new Date())}" /></div>
          <div><div class="flex items-center justify-between gap-3"><label for="lr-p-time-h" class="lr-label">Time of birth</label><label class="lr-check"><input id="lr-p-unknown" type="checkbox" /><span>Not known</span></label></div><div data-lr-timepicker="lr-p-time"></div><input id="lr-p-time" type="hidden" value="12:00" /></div>
          <div class="relative"><label for="lr-p-place" class="lr-label">Place of birth</label><input id="lr-p-place" class="input-wfg" autocomplete="off" placeholder="Start typing a town or city" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lr-p-place-list" /><div id="lr-p-place-list" class="lr-places !top-full mt-1" role="listbox" hidden></div></div>
          <p class="lr-error sm:col-span-2" role="alert" data-lr-partner-error hidden></p>
          <div class="sm:col-span-2"><button type="submit" class="btn-primary w-full sm:w-auto">Compare our rhythms</button><p class="mt-3 text-xs text-ink-500">Only add someone’s details with their permission. Stays on this device.</p></div>
        </form>
      </div>`;
  }

  private bindPartnerForm(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-partner]');
    if (!form) return;
    const place = panel.querySelector<HTMLInputElement>('#lr-p-place')!;
    const unknown = panel.querySelector<HTMLInputElement>('#lr-p-unknown')!;
    const time = panel.querySelector<HTMLInputElement>('#lr-p-time')!;
    attachPlaceSearch(place, panel.querySelector('#lr-p-place-list')!, (p) => (this.partnerPlace = p));
    const picker = mountTimePicker(panel.querySelector<HTMLElement>('[data-lr-timepicker="lr-p-time"]')!, time);
    unknown.addEventListener('change', () => picker.setDisabled(unknown.checked));
    const commit = (p: UserBirthProfile) => {
      this.partner = p;
      this.partnerChart = this.compute(p);
      storageSet(PARTNER_STORAGE_KEY, p);
      this.renderPeople();
    };
    panel.querySelector('[data-lr-partner-demo]')?.addEventListener('click', () => commit(SAMPLE_PARTNER));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = panel.querySelector<HTMLElement>('[data-lr-partner-error]')!;
      const date = panel.querySelector<HTMLInputElement>('#lr-p-date')!.value;
      const t = unknown.checked ? '12:00' : time.value;
      const msg = !date ? 'Please add their date of birth.' : !this.partnerPlace ? 'Please choose their place of birth from the list.' : '';
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        return;
      }
      const pp = this.partnerPlace!;
      commit({ name: panel.querySelector<HTMLInputElement>('#lr-p-name')!.value.trim(), birthDate: date, birthTime: t, isTimeUnknown: unknown.checked, cityName: place.value, latitude: pp.latitude, longitude: pp.longitude, timezone: offsetForLocal(pp.timezone, date, t), ianaTimezone: pp.timezone });
    });
  }

  /* ═══════════ DECISIONS ═══════════ */

  private renderDecide() {
    const ask = `
      ${intro('Ask a question', 'Thinking about a decision?', 'Ask in your own words. We look at the timing of this exact moment together with your birth chart, and suggest sensible next steps.')}
      <div class="lr-card mt-10">
        <form class="lr-ask" data-lr-ask novalidate>
          <label for="lr-ask-input" class="sr-only">Your question</label>
          <input id="lr-ask-input" class="input-wfg flex-1 !min-h-12" placeholder="e.g. Is this a good week to travel?" maxlength="200" />
          <button type="submit" class="btn-primary !min-h-12 shrink-0">Check the timing</button>
        </form>
        <div class="lr-chips" aria-label="Example questions">${ASK_EXAMPLES.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <div id="lr-ask-answer" aria-live="polite"></div>
      </div>`;
    const check = `
      ${intro('Check a decision', 'Is the timing right for this?', 'A traditional technique reads the sky at the exact moment you ask. Choose what your decision is about, then ask.')}
      <div class="lr-card mt-10">
        <form class="grid gap-5 md:grid-cols-[1fr_16rem_auto] md:items-end" data-lr-prashna novalidate>
          <div><label for="lr-pr-q" class="lr-label">Your decision</label><input id="lr-pr-q" class="input-wfg !min-h-12" placeholder="e.g. Should I accept the role in Berlin?" maxlength="200" /></div>
          <div><label for="lr-pr-cat" class="lr-label">It’s about</label><select id="lr-pr-cat" class="input-wfg !min-h-12">${C.PRASHNA_CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(C.PRASHNA_CATEGORY_LABEL[c])}</option>`).join('')}</select></div>
          <button type="submit" class="btn-primary !min-h-12">Check now</button>
        </form>
        <div id="lr-pr-answer" aria-live="polite"></div>
      </div>`;
    const panel = document.getElementById('lr-panel-decide')!;
    const a = this.subs.decide;
    const dates = `
      ${intro('Find a good date', 'When should you do it?', 'Pick what you are planning. We scan the next three months for days and hours that suit it — using the traditional rules for that activity and your own birth Moon — and rank the best.')}
      <div class="lr-card mt-10">
        <form class="grid gap-5 md:grid-cols-[1fr_12rem_auto] md:items-end" data-lr-muhurta novalidate>
          <div><label for="lr-mu-act" class="lr-label">What are you planning?</label><select id="lr-mu-act" class="input-wfg !min-h-12">
            <option value="venture">Starting a business, job or project</option>
            <option value="contract">Signing a contract or buying property</option>
            <option value="moving">Moving into a new home</option>
            <option value="marriage">A wedding or engagement</option>
            <option value="travel">An important journey</option>
            <option value="learning">Starting a course or studies</option>
          </select></div>
          <div><label for="lr-mu-days" class="lr-label">Search ahead</label><select id="lr-mu-days" class="input-wfg !min-h-12"><option value="30">1 month</option><option value="90" selected>3 months</option><option value="180">6 months</option></select></div>
          <button type="submit" class="btn-primary !min-h-12">Find dates</button>
        </form>
        <p class="mt-3 text-sm text-ink-500">Times are for ${esc(this.place4Today().name.split(',')[0])} — change your location under Today.</p>
        <div id="lr-mu-out" aria-live="polite"></div>
      </div>`;
    panel.innerHTML = subnav('Decisions', [['ask', 'Ask a question'], ['check', 'Check a decision'], ['dates', 'Find a good date']], a) + sub('ask', a, ask) + sub('check', a, check) + sub('dates', a, dates);
    this.bindAsk(panel);
    this.bindPrashna(panel);
    this.bindMuhurta(panel);
  }

  private bindMuhurta(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-muhurta]');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const act = (panel.querySelector('#lr-mu-act') as HTMLSelectElement).value as MuhurtaActivity;
      const days = Number((panel.querySelector('#lr-mu-days') as HTMLSelectElement).value);
      const out = panel.querySelector<HTMLElement>('#lr-mu-out')!;
      out.innerHTML = '<p class="mt-6 text-sm text-ink-500">Scanning…</p>';
      window.setTimeout(() => {
        const loc = this.place4Today();
        const res = findMuhurtas(this.chart!, act, { latitude: loc.latitude, longitude: loc.longitude, timeZone: loc.timeZone, days, limit: 8 });
        const day = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: loc.timeZone });
        out.innerHTML = res.length
          ? `<div class="lr-answer"><p class="lr-label-sm">The ${res.length} best dates, in date order</p><ol class="mt-4 grid gap-4" role="list">${res
              .map((r, i) => `<li class="rounded-xl border border-line p-4 ${i === 0 ? 'bg-muted-bg' : ''}"><div class="flex flex-wrap items-baseline justify-between gap-2"><p class="font-medium text-ink">${esc(day(r.start))} · ${this.timeIn(r.start, loc.timeZone)} – ${this.timeIn(r.end, loc.timeZone)}</p><span class="lr-pill ${r.score >= 80 ? 'lr-tone-good' : 'lr-tone-steady'} !py-0.5 !text-[0.7rem]">${r.score >= 80 ? 'Excellent' : 'Good'} · ${r.score}</span></div><p class="mt-1.5 text-sm text-charcoal">${esc(r.reasons.join(' · '))}</p>${r.cautions.length ? `<p class="mt-1 text-sm text-ink-500">Note: ${esc(r.cautions.join(' · '))}</p>` : ''}<p class="lr-pro lr-ev">${esc(`${r.windowKind} · ${r.tithi} (${r.paksha}) · ${r.nakshatra} · ${r.karana}`)}</p></li>`)
              .join('')}</ol><p class="mt-5 text-xs text-ink-500">Based on traditional timing rules (tithi, nakshatra, weekday, karana) and your birth Moon. Practical factors always come first.</p>${consultCta('important date', 'For weddings, moves and launches, a consultation checks the shortlist against both charts and your practical constraints.')}</div>`
          : `<p class="mt-6 text-[0.9875rem] text-charcoal">No clearly good windows in this range — try a longer search.</p>`;
      }, 20);
    });
  }

  private bindAsk(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-ask]')!;
    const input = panel.querySelector<HTMLInputElement>('#lr-ask-input')!;
    const out = panel.querySelector<HTMLElement>('#lr-ask-answer')!;
    const ask = (q: string) => {
      if (!q.trim()) return input.focus();
      const loc = this.place4Today();
      const r = processAstroQuestion(this.chart!, q.trim(), { latitude: loc.latitude, longitude: loc.longitude }, new Date());
      const lvl = ASK_LEVEL[r.verdictLevel];
      const topic = ASK_TOPIC[r.topic] ?? ASK_TOPIC['General Decision'];
      out.innerHTML = `
        <div class="lr-answer">
          <p class="text-sm italic text-ink-500">“${esc(q.trim())}”</p>
          <div class="mt-4 flex items-center gap-3"><span class="lr-signal" data-level="${r.verdictLevel}" aria-hidden="true"><i></i><i></i><i></i></span><span class="lr-label-sm">${esc(topic.label)} · ${esc(lvl.label)}</span></div>
          <p class="lr-h2 mt-3">${esc(lvl.headline)}</p>
          <p class="lr-sub max-w-2xl">${esc(lvl.body)}</p>
          <div class="mt-6 grid gap-5 md:grid-cols-2">
            <div><p class="lr-label-sm">Sensible next steps</p>${list(topic.steps)}</div>
            <div class="grid content-start gap-4">
              <div class="rounded-xl bg-muted-bg p-4"><p class="lr-label-sm">Good timing</p><p class="mt-1.5 text-[0.9375rem] text-ink">${esc(r.optimalWindow)}</p></div>
              <div class="rounded-xl bg-warm-cream p-4"><p class="lr-label-sm">Avoid</p><p class="mt-1.5 text-[0.9375rem] text-ink">${esc(r.pitfallToAvoid)}</p></div>
            </div>
          </div>
          <p class="mt-6 text-xs leading-relaxed text-ink-500">A reflection on timing, not a prediction or advice. You know your situation best.</p>
          ${proBlock(kv([['Intent class', esc(r.topic)], ['Engine verdict', esc(r.verdict)], ['Alignment score', `${r.confidenceScore} / 100`], ...(r.travelGuidance ? ([['Favoured direction', esc(r.travelGuidance.bestDirection)], ['Caution direction', esc(r.travelGuidance.cautionDirection)]] as Array<[string, string]>) : [])]) + `<p class="mt-3">${esc(r.explanation)}</p>`, 'Pro detail · Horary matrix')}
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

  private bindPrashna(panel: HTMLElement) {
    const form = panel.querySelector<HTMLFormElement>('[data-lr-prashna]')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = panel.querySelector<HTMLInputElement>('#lr-pr-q')!;
      const cat = panel.querySelector<HTMLSelectElement>('#lr-pr-cat')!.value as (typeof C.PRASHNA_CATEGORIES)[number];
      if (!q.value.trim()) return q.focus();
      const loc = this.place4Today();
      const pr = calculatePrashnaKundli({ question: q.value.trim(), category: cat, queryTime: new Date(), latitude: loc.latitude, longitude: loc.longitude });
      const v = C.PRASHNA_VERDICT[pr.verdict] ?? C.PRASHNA_VERDICT['Constructive with Patience'];
      const harmonious = pr.tajikaAspect.yogaName.includes('Applying') || pr.tajikaAspect.yogaName.includes('Mediation');
      panel.querySelector<HTMLElement>('#lr-pr-answer')!.innerHTML = `
        <div class="lr-answer">
          <div class="flex items-center gap-3"><span class="lr-signal" data-level="${v.level}" aria-hidden="true"><i></i><i></i><i></i></span><span class="lr-label-sm">${esc(C.PRASHNA_CATEGORY_LABEL[cat])}</span></div>
          <p class="lr-h2 mt-3">${esc(v.headline)}</p>
          <p class="lr-sub max-w-2xl">${esc(v.text)}</p>
          <div class="lr-card-quiet mt-6"><p class="lr-label-sm">The momentum</p><p class="mt-2 text-[0.9375rem] text-charcoal">${harmonious ? 'The factors for you and for the matter are moving towards each other — things are coming together.' : 'The factors for you and for the matter are moving apart — sort out what is still unclear before you commit.'}</p></div>
          <p class="mt-6 text-xs leading-relaxed text-ink-500">A reflection on timing, not a prediction or advice.</p>
          ${proBlock(kv([['Prashna lagna', `${esc(pr.prashnaLagna.sign)} ${esc(pr.prashnaLagna.degree)} · ${esc(pr.prashnaLagna.lord)}`], ['Karyesh', `H${pr.karyesh.houseNumber} ${esc(pr.karyesh.sign)} · ${esc(pr.karyesh.lord)}`], ['Tajika', esc(pr.tajikaAspect.yogaName)], ['Verdict', esc(pr.verdict)]]) + `<p class="mt-3">${esc(pr.tajikaAspect.description)} ${esc(pr.guidance)}</p>`, 'Pro detail · Prashna')}
        </div>`;
    });
  }

  /* ═══════════ CHART DATA (Pro) ═══════════ */

  private renderChartData() {
    const c = this.chart!;
    const p = this.profile!;
    const sav = c.ashtakavarga;
    const maxSav = Math.max(...(sav.housePoints as number[]));
    const nav = (c.shodashvarga as any)?.D9?.placements as Array<any> | undefined;
    const d10 = (c.shodashvarga as any)?.D10?.placements as Array<any> | undefined;
    const vsign = (arr: Array<any> | undefined, n: string) => esc(arr?.find((x) => x.planet === n)?.sign?.name ?? '—');
    document.getElementById('lr-panel-chart')!.innerHTML = `
      ${intro('Chart data', 'The full workings', `Apparent sidereal positions (true node), ${c.ayanamsha.name} ayanamsha ${c.ayanamsha.formatted}, cast for ${fmtBirthDate(p.birthDate)} ${p.isTimeUnknown ? '12:00 (time unknown)' : p.birthTime} ${fmtOffset(c.birthDetails.timezone)} at ${c.birthDetails.latitude.toFixed(4)}°, ${c.birthDetails.longitude.toFixed(4)}°.`)}
      <div class="mt-10 grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div class="lr-card">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="sr-only" for="lr-varga">Divisional chart</label>
            <select id="lr-varga" class="input-wfg !min-h-10 !w-auto !py-1.5 !text-sm">${['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'].map((id) => `<option value="${id}" ${id === this.varga ? 'selected' : ''}>${id} · ${esc((c.shodashvarga as any)?.[id]?.name ?? 'Rasi')}</option>`).join('')}</select>
            <div class="lr-mode !bg-muted-bg !border-line" role="radiogroup" aria-label="Chart style">${(['north', 'south', 'east'] as ChartStyle[]).map((st) => `<button type="button" role="radio" aria-checked="${st === this.chartStyle}" data-lr-style="${st}" class="!text-ink-500 aria-checked:!bg-white aria-checked:!text-primary !min-h-8 !px-3 !text-xs">${cap(st)}</button>`).join('')}</div>
          </div>
          <div class="mt-4" id="lr-chart-draw">${this.chartFor(c)}</div>
          <p class="mt-3 text-xs text-ink-500">${esc((c.shodashvarga as any)?.[this.varga]?.description ?? '')}</p>
        </div>
        <div class="lr-card"><p class="lr-label-sm">Key points</p><div class="mt-5">${kv([
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
        ])}</div></div>
      </div>
      <section class="lr-section !mt-12">
        <h3 class="lr-h2">Graha positions</h3>
        <div class="mt-5">${table(['Graha', 'Sign', 'Degree', 'House', 'Nakshatra', 'Dignity', 'Relation', 'Motion', 'D9', 'D10', 'KP star / sub'], [
          ['<strong class="font-medium">Lagna</strong>', esc(c.ascendant.sign.name), esc(c.ascendant.formattedDegree), '1', `${esc(c.ascendant.nakshatra.name)} ${c.ascendant.nakshatraPada}`, '—', '—', '—', vsign(nav, 'Ascendant'), vsign(d10, 'Ascendant'), c.ascendant.kp ? `${esc(c.ascendant.kp.starLord)} / ${esc(c.ascendant.kp.subLord)}` : '—'],
          ...PLANET_ORDER.map((n) => {
            const pl = c.planets[n];
            return [esc(n), `${esc(pl.sign.name)} <span class="muted">${esc(pl.sign.sanskrit)}</span>`, esc(pl.formattedDegree), String(pl.house), `${esc(pl.nakshatra.name)} ${pl.nakshatraPada}`, esc(pl.dignity), esc(pl.compoundRelation ?? '—'), pl.isRetrograde ? 'Retrograde' : '<span class="muted">Direct</span>', vsign(nav, n), vsign(d10, n), pl.kp ? `${esc(pl.kp.starLord)} / ${esc(pl.kp.subLord)}` : '—'];
          }),
        ])}</div>
      </section>
      <section class="lr-section !mt-12">
        <div class="lr-section-head"><h3 class="lr-h2">Sarvashtakavarga by house</h3><p class="text-sm text-ink-500">${sav.totalPoints} bindus · 28+ is above average</p></div>
        <div class="lr-card">
          <div class="grid grid-cols-12 items-end gap-1.5 sm:gap-3" style="height:11rem">
            ${(sav.housePoints as number[]).map((v, i) => `<div class="flex h-full flex-col items-center justify-end gap-1.5" title="House ${i + 1}: ${v}"><span class="text-[0.7rem] tabular-nums text-ink-500">${v}</span><span class="w-full rounded-md" style="height:${((v / maxSav) * 100).toFixed(1)}%;background:${v >= 28 ? 'color-mix(in srgb,var(--color-secondary) 75%,#fff)' : '#e7e1d6'}"></span></div>`).join('')}
          </div>
          <div class="mt-2 grid grid-cols-12 gap-1.5 text-center text-[0.7rem] text-ink-500 sm:gap-3">${Array.from({ length: 12 }, (_, i) => `<span>H${i + 1}</span>`).join('')}</div>
        </div>
      </section>
      <section class="lr-section !mt-12">
        <h3 class="lr-h2">Shadbala components</h3>
        <div class="mt-5">${table(['Graha', 'Uccha', 'Saptavarga', 'Ojha', 'Kendra', 'Drekk.', 'Nathon.', 'Paksha', 'Tribh.', 'Abda', 'Masa', 'Vara', 'Hora', 'Ayana', 'Yuddha'], Object.values(c.shadbala as Record<string, any>).map((s) => { const k = s.components ?? {}; return [esc(s.planet), ...['uccha', 'saptavargaja', 'ojhayugma', 'kendradi', 'drekkana', 'nathonnata', 'paksha', 'tribhaga', 'abda', 'masa', 'vara', 'hora', 'ayana', 'yuddha'].map((x) => String(k[x] ?? '—'))]; }))}</div>
      </section>
      ${this.chartExtrasHtml(c)}
      ${c.yogas.length ? `<section class="lr-section !mt-12"><h3 class="lr-h2">Yogas detected</h3><div class="mt-5">${table(['Yoga', 'Category', 'Classical description'], c.yogas.map((y: any) => [`${esc(y.name)}${y.sanskrit && y.sanskrit !== y.name ? ` <span class="muted">${esc(y.sanskrit)}</span>` : ''}`, esc(y.category), `<span class="muted whitespace-normal">${esc(y.description)}</span>`]))}</div></section>` : ''}`;
    this.bindChartTools();
  }

  private chartFor(c: ComprehensiveKundliResult): string {
    const bySign: string[][] = Array.from({ length: 12 }, () => []);
    let ascSign = c.ascendant.sign.index;
    if (this.varga === 'D1') {
      for (const n of PLANET_ORDER) bySign[c.planets[n].sign.index].push(PLANET_ABBR[n] + (c.planets[n].isRetrograde && n !== 'Rahu' && n !== 'Ketu' ? 'ʳ' : ''));
    } else {
      const pl = ((c.shodashvarga as any)?.[this.varga]?.placements ?? []) as Array<{ planet: string; sign: { index: number } }>;
      for (const x of pl) {
        if (x.planet === 'Ascendant') ascSign = x.sign.index;
        else bySign[x.sign.index].push(PLANET_ABBR[x.planet as keyof typeof PLANET_ABBR] ?? x.planet);
      }
    }
    return chartSvg(this.chartStyle, { bySign, ascSign, label: this.varga });
  }

  private bindChartTools() {
    const panel = document.getElementById('lr-panel-chart')!;
    panel.querySelector<HTMLSelectElement>('#lr-varga')?.addEventListener('change', (e) => {
      this.varga = (e.target as HTMLSelectElement).value;
      panel.querySelector('#lr-chart-draw')!.innerHTML = this.chartFor(this.chart!);
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-lr-style]').forEach((b) =>
      b.addEventListener('click', () => {
        this.chartStyle = b.dataset.lrStyle as ChartStyle;
        storageSet(STYLE_KEY, this.chartStyle);
        panel.querySelectorAll<HTMLButtonElement>('[data-lr-style]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        panel.querySelector('#lr-chart-draw')!.innerHTML = this.chartFor(this.chart!);
      })
    );
  }

  private chartExtrasHtml(c: ComprehensiveKundliResult): string {
    const p = this.profile!;
    const kp = calculateKPAnalysis(c.birthDetails.date, c.birthDetails.latitude, c.birthDetails.longitude, c.planets);
    const loc = this.place4Today();
    const rp = calculateRulingPlanets(new Date(), loc.latitude, loc.longitude, loc.timeZone);
    const vim = c.vimshopaka ?? {};
    const bb = c.bhavaBala ?? [];
    const ext = c.extendedYogas ?? [];
    void p;
    return `
      <section class="lr-section !mt-12">
        <h3 class="lr-h2">Vimshopaka bala</h3>
        <p class="lr-sub">Dignity across divisional charts, out of 20 points per scheme.</p>
        <div class="mt-5">${table(['Graha', 'Shadvarga', 'Saptavarga', 'Dashavarga', 'Shodashavarga', 'Grade'], Object.values(vim).map((v) => [esc(v.planet), v.shadvarga.toFixed(2), v.saptavarga.toFixed(2), v.dashavarga.toFixed(2), `<strong class="font-medium">${v.shodashavarga.toFixed(2)}</strong>`, esc(v.grade)]))}</div>
      </section>
      <section class="lr-section !mt-12">
        <h3 class="lr-h2">Bhava bala</h3>
        <p class="lr-sub">House strength: lord’s Shadbala + directional strength + aspects on the bhava madhya + occupation.</p>
        <div class="mt-5">${table(['House', 'Adhipati', 'Dig', 'Drishti', 'Occupation', 'Virupas', 'Rupas', 'Rank'], bb.map((b) => [`H${b.house}`, b.adhipati.toFixed(1), String(b.dig), b.drishti.toFixed(1), String(b.occupation), b.totalVirupas.toFixed(1), `<strong class="font-medium">${b.totalRupas.toFixed(2)}</strong>`, String(b.rank)]))}</div>
      </section>
      <section class="lr-section !mt-12">
        <h3 class="lr-h2">KP — Placidus cusps</h3>
        <p class="lr-sub">KP ayanamsha ${kp.ayanamsha.toFixed(4)}°.</p>
        <div class="mt-5">${table(['Cusp', 'Longitude', 'Sign', 'Sign lord', 'Star lord', 'Sub lord', 'Sub-sub'], kp.cusps.map((x) => [`${x.house}`, `${(x.longitude % 30).toFixed(2)}° ${esc(x.sign)}`, esc(x.sign), esc(x.kp.signLord), esc(x.kp.starLord), `<strong class="font-medium">${esc(x.kp.subLord)}</strong>`, esc(x.kp.subSubLord)]))}</div>
        <h4 class="lr-h3 mt-8">House significators</h4>
        <div class="mt-4">${table(['House', 'L1 · star of occupants', 'L2 · occupants', 'L3 · star of owner', 'L4 · owner'], kp.significators.map((x) => [`${x.house}`, esc(x.starOfOccupants.join(', ') || '—'), esc(x.occupants.join(', ') || '—'), esc(x.starOfOwner.join(', ') || '—'), esc(x.owner)]))}</div>
        <h4 class="lr-h3 mt-8">Planet significations</h4>
        <div class="mt-4">${table(['Planet', 'Placidus house', 'Star lord', 'Sub lord', 'Signifies houses'], PLANET_ORDER.map((n) => [esc(n), String(kp.placidusHouse[n]), esc(kp.planetKP[n].starLord), esc(kp.planetKP[n].subLord), esc(kp.planetSignifies[n].join(', '))]))}</div>
        <h4 class="lr-h3 mt-8">Ruling planets now</h4>
        <div class="mt-4">${kv([
          ['For', `${esc(loc.name.split(',')[0])} · ${esc(new Date().toLocaleString('en-GB', { timeZone: loc.timeZone }))}`],
          ['Day lord', esc(rp.dayLord)],
          ['Lagna sign / star / sub', `${esc(rp.lagnaSignLord)} / ${esc(rp.lagnaStarLord)} / ${esc(rp.lagnaSubLord)}`],
          ['Moon sign / star / sub', `${esc(rp.moonSignLord)} / ${esc(rp.moonStarLord)} / ${esc(rp.moonSubLord)}`],
          ['Ruling planets (ordered)', esc(rp.ordered.join(', '))],
        ])}</div>
      </section>
      ${ext.length ? `<section class="lr-section !mt-12"><h3 class="lr-h2">Extended yogas</h3><div class="mt-5">${table(['Yoga', 'Nature', 'Strength', 'Planets', 'Configuration'], ext.map((y) => [esc(y.name), esc(y.nature), esc(y.strength), esc(y.planets.join(', ') || '—'), `<span class="muted whitespace-normal">${esc(y.description)}</span>`]))}</div></section>` : ''}`;
  }

}

if (typeof document !== 'undefined') {
  const start = () => new LifeRhythm().init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
