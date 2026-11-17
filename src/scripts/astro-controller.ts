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

interface TodayPlace {
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

/* ═══════════ Small render helpers ═══════════ */

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
const longDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* ═══════════ Controller ═══════════ */

type Tab = 'today' | 'you' | 'seasons' | 'people' | 'decide' | 'chart';
const TABS: Tab[] = ['today', 'you', 'seasons', 'people', 'decide', 'chart'];

class LifeRhythm {
  private profile: UserBirthProfile | null = null;
  private chart: ComprehensiveKundliResult | null = null;
  private partner: UserBirthProfile | null = null;
  private partnerChart: ComprehensiveKundliResult | null = null;
  private place: GeocodedPlace | null = null;
  private partnerPlace: GeocodedPlace | null = null;
  private timePicker: TimePicker | null = null;
  private todayPlace: TodayPlace | null = null;
  private mode: 'simple' | 'pro' = 'simple';
  private tab: Tab = 'today';
  private subs: Record<string, string> = { today: 'overview', you: 'profile', seasons: 'chapter', people: 'partner', decide: 'ask' };

  private app = document.getElementById('lr-app') as HTMLElement;
  private results = document.getElementById('lr-results') as HTMLElement;

  init() {
    if (!this.app) return;
    this.bindIntake();
    this.bindChrome();
    this.setMode(storageGet<string>(MODE_KEY) === 'pro' ? 'pro' : 'simple', false);
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
    if (scroll) {
      const bar = this.app.querySelector('.lr-tabs-wrap') as HTMLElement;
      if (bar.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + bar.getBoundingClientRect().top - 88, behavior: 'smooth' });
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
    this.renderYou();
    this.renderSeasons();
    this.renderPeople();
    this.renderDecide();
    this.renderChartData();
    this.results.hidden = false;
    this.setTab(this.mode === 'simple' && this.tab === 'chart' ? 'today' : this.tab, false);
    if (scroll) this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  /** Where the person is today (for sunrise-based hours). Defaults to the birth place. */
  private place4Today(): TodayPlace {
    if (this.todayPlace) return this.todayPlace;
    const p = this.profile!;
    return { name: p.cityName, latitude: p.latitude, longitude: p.longitude, timeZone: p.ianaTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone };
  }

  private timeIn(d: Date, tz: string) {
    return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).replace(/\s/g, '').toLowerCase();
  }

  /* ═══════════ TODAY ═══════════ */

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
    const keyWhen = afterSunset ? 'Tomorrow · ' : '';

    const overview = `
      ${intro(dateStr, cap(headline), `Today is ${day.taraPlain} for you. The Moon is moving through your area of ${day.moonArea.name.toLowerCase()} — ${day.moonArea.about.toLowerCase()} — so that is a natural focus today.`, `<span class="lr-pill lr-tone-${day.level}">${levelLabel}</span>`)}

      <div class="mt-10 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div class="lr-card flex items-center gap-6">
          <div class="lr-score" style="--p:${day.score};--lr-score-color:${day.level === 'light' ? '#d4bf9a' : 'var(--color-secondary)'}"><div><div><p class="font-display text-3xl text-ink">${day.score}</p><p class="text-[0.7rem] text-ink-500">of 100</p></div></div></div>
          <div>
            <p class="lr-label-sm">Your day rhythm</p>
            <p class="mt-2 text-[0.9375rem] leading-relaxed text-charcoal">Calculated from your own birth Moon and today’s sky — not a generic daily horoscope.</p>
          </div>
        </div>
        <div class="lr-card">
          <p class="lr-label-sm">Why today feels this way</p>
          <ul class="lr-list" role="list">
            <li><span><strong class="font-medium">Your birth star.</strong> ${esc(cap(day.taraPlain))}.</span></li>
            <li><span><strong class="font-medium">Your Moon.</strong> ${day.chandraGood ? 'Today’s Moon sits in a supportive position relative to your birth Moon — feelings and energy tend to flow more easily.' : 'Today’s Moon sits in a less supportive position relative to your birth Moon — moods can be a little more sensitive.'}</span></li>
            <li><span><strong class="font-medium">The wider sky.</strong> ${gochara.generalTransitTone === 'Highly Supportive' ? 'Most planets are in helpful positions for you right now.' : gochara.generalTransitTone === 'Challenging / Preservative' ? 'Several planets are in demanding positions for you right now, so pace yourself.' : 'The bigger planetary picture is mixed — neither pushing nor holding you back.'}</span></li>
          </ul>
          ${ev(day.evidence)}
        </div>
      </div>

      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="lr-card"><p class="lr-label-sm">Focus on</p>${labeledList(supportive ? C.TODAY_FOCUS.supportive : C.TODAY_FOCUS.steady)}</div>
        <div class="lr-card-quiet"><p class="lr-label-sm">Keep off your plate</p>${labeledList(C.TODAY_AVOID, true)}</div>
      </div>

      <section class="lr-section">
        ${sectionHead(afterSunset ? 'Tomorrow’s key windows' : 'Today’s key windows', `From the real sunrise (${t(keySolar.sunrise)}) and sunset (${t(keySolar.sunset)}) in ${town}.`)}
        <div class="grid gap-5 md:grid-cols-3">
          ${card(`${t(keyMu.abhijitMuhurat.start)} – ${t(keyMu.abhijitMuhurat.end)}`, 'Around local noon — a strong window for important decisions and starting things.', 'Abhijit muhurta (8th of 15 daytime muhurtas)', { kicker: `${keyWhen}Best for decisions` })}
          ${firstPeople ? card(`${t(firstPeople.start)} – ${t(firstPeople.end)}`, `${HOURS[firstPeople.name].label}: ${HOURS[firstPeople.name].tip.toLowerCase()}.`, `${firstPeople.name} choghadiya`, { kicker: `${keyWhen}Good for people` }) : card('Later', 'The best daytime windows for meetings have passed.', undefined, { kicker: 'Good for people' })}
          ${card(`${t(keyMu.rahuKalam.start)} – ${t(keyMu.rahuKalam.end)}`, 'Traditionally avoided for starting new things. Fine for routine work.', `Rahu Kalam (octant ${['8', '2', '7', '5', '6', '4', '3'][keySolar.weekday]} of daytime)`, { kicker: `${keyWhen}Avoid new starts`, quiet: true })}
        </div>
      </section>

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
      sub('overview', a, overview) +
      sub('hours', a, this.hoursHtml(slots, solar, loc, now)) +
      sub('ahead', a, this.comingUpHtml()) +
      sub('travel', a, this.travelHtml(day.level)) +
      sub('reset', a, this.resetHtml(day.level, gochara.saturnSadeSatiActive));
    this.bindTodayPlace(panel);
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

    return `
      ${intro('Best hours', 'When to do what today', 'Each day and night is split into eight equal parts, based on the real sunrise and sunset where you are. Some parts suit focus or people; others suit quieter work.')}
      <div class="mt-8 flex flex-wrap items-center gap-3">
        <span class="lr-loc">Times for <strong class="font-medium">${esc(loc.name.split(',')[0])}</strong> <button type="button" data-lr-loc-change>Change</button></span>
        ${solar.isApproximate ? '<span class="text-sm text-ink-500">The sun doesn’t rise or set here today, so a 6am–6pm day is used.</span>' : ''}
      </div>
      <div class="relative mt-4 hidden max-w-md" data-lr-loc-form>
        <label for="lr-today-place" class="lr-label">Where are you today?</label>
        <input id="lr-today-place" class="input-wfg" autocomplete="off" placeholder="Start typing a town or city" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lr-today-place-list" />
        <div id="lr-today-place-list" class="lr-places !top-full mt-1" role="listbox" hidden></div>
      </div>
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
    attachPlaceSearch(input, listEl, (p) => {
      if (!p) return;
      this.todayPlace = { name: [p.name, p.country].filter(Boolean).join(', '), latitude: p.latitude, longitude: p.longitude, timeZone: p.timezone };
      storageSet(TODAY_PLACE_KEY, this.todayPlace);
      this.renderToday();
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
    const cur = C.PERIOD_THEME[ad.lord];
    const nxt = next ? C.PERIOD_THEME[next.lord] : null;
    const nextInsight = next ? I.chapterInsight(chart, next) : null;

    return `
      ${intro('Coming up', `Your focus shifts ${countdown}`, `Right now your focus is on ${cur.title.toLowerCase()}. On ${longDate(ad.endDate)} a new phase begins.`)}
      <div class="lr-feature mt-10">
        <p class="lr-label-sm !text-white/60">Next phase · from ${esc(longDate(ad.endDate))}</p>
        <p class="mt-2 font-display text-3xl font-medium">${esc(nxt?.title ?? '—')}</p>
        <p class="mt-4 max-w-2xl text-[0.9875rem] leading-relaxed text-white/85">Your focus moves towards ${esc(nxt?.incoming ?? '')}.${nextInsight ? ` In your chart it plays out mainly in your area of ${esc(nextInsight.stage.name.toLowerCase())}. ${esc(nextInsight.supportText)}` : ''}</p>
        ${nextInsight ? `<p class="lr-pro lr-ev !text-white/70">${esc(nextInsight.evidence)}</p>` : ''}
      </div>
      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="lr-card"><p class="lr-label-sm">Before ${esc(ad.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</p>${list(C.WRAP_UP)}</div>
        <div class="lr-card-quiet"><p class="lr-label-sm">How to prepare</p><p class="mt-3 text-[0.9875rem] leading-relaxed text-charcoal">${esc(C.SEASON[ad.lord].prepare)}</p></div>
      </div>
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
          ${card('How you handle stress', `${C.MOON_RESET[moon.sign.name].style} What helps: ${C.MOON_RESET[moon.sign.name].reset}`, `Moon ${moon.sign.name} ${moon.formattedDegree} · ${moon.nakshatra.name} ${moon.nakshatraPada} · ${moon.dignity}`, { kicker: 'Your inner world' })}
          ${card('Where you shine', C.SUN_HOUSE[sun.house], `Sun ${sun.sign.name} ${sun.formattedDegree} · H${sun.house} · ${sun.dignity}`, { kicker: 'Your purpose' })}
        </div>
      </section>`;

    const pillars: Array<[C.Pillar, string]> = [
      [C.pillarAction(mars.sign.name, mars.isRetrograde), `Mars ${mars.sign.name} · H${mars.house}${mars.isRetrograde ? ' · R' : ''} · ${mars.dignity}`],
      [C.pillarThinking(merc.sign.name, merc.isRetrograde), `Mercury ${merc.sign.name} · H${merc.house}${merc.isRetrograde ? ' · R' : ''} · ${merc.dignity}`],
      [C.pillarLeadership(sun.house), `Sun ${sun.sign.name} · H${sun.house} · ${sun.dignity}`],
      [C.pillarLongTerm(sat.house, sat.isRetrograde), `Saturn ${sat.sign.name} · H${sat.house}${sat.isRetrograde ? ' · R' : ''} · ${sat.dignity}`],
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
    const yogas = (chart.yogas as any[]).map((y) => ({ y, plain: C.YOGA_PLAIN[y.name] })).filter((x) => x.plain);
    const strengths = `
      ${intro('Strengths & watch-outs', 'What comes easily — and what needs care', 'Based on the classical six-part strength of each planet in your chart, and how much support each area of your life receives.')}
      <section class="lr-section !mt-10">
        ${sectionHead('What tends to come naturally')}
        <div class="grid gap-5 md:grid-cols-3">${ns.top.map((f, i) => card(f.title, f.text, f.evidence, { num: i + 1 })).join('')}</div>
      </section>
      <section class="lr-section">
        ${sectionHead('Where life tends to flow most easily', 'The three areas of your life with the most built-in support.')}
        <div class="grid gap-5 md:grid-cols-3">
          ${ext.best.map((x) => `<article class="lr-card"><div class="flex items-center justify-between gap-3"><p class="lr-label-sm">${LEVEL_WORD[x.level]}</p>${meter(x.level)}</div><h4 class="lr-h3 mt-2">${esc(x.name)}</h4><p class="mt-2 text-[0.9375rem] text-charcoal">${esc(x.about)}. ${x.points} support points — the average is 28.</p>${ev(`SAV H${x.house} = ${x.points}`)}</article>`).join('')}
        </div>
      </section>
      ${yogas.length ? `<section class="lr-section">${sectionHead('Special strengths in your chart', 'Rare combinations in your chart, and how to put them to use.')}<div class="grid gap-5 md:grid-cols-2">${yogas.slice(0, 6).map(({ y, plain }) => card(plain.title, plain.use, `${y.name} · ${y.category}`)).join('')}</div></section>` : ''}
      <section class="lr-section">
        ${sectionHead('What may take more effort', 'Not weaknesses — areas where a little structure goes a long way.')}
        <div class="grid gap-5 md:grid-cols-2">${ns.low.map((f) => card(f.title, f.text, f.evidence, { quiet: true })).join('')}</div>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          ${ext.hardest.map((x) => {
            const l = C.LEAK[x.house];
            return `<article class="lr-card-quiet"><p class="lr-label-sm">${esc(x.name)} · ${x.points} points</p><h4 class="lr-h3 mt-2">${esc(l.title)}</h4><p class="mt-2 text-[0.9375rem] text-charcoal">${esc(l.risk)}</p><div class="mt-4 rounded-xl bg-white p-4 text-[0.9375rem]"><span class="font-medium text-ink">What helps:</span> ${esc(l.fix)}</div>${ev(`SAV H${x.house} = ${x.points} (among lowest)`)}</article>`;
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
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        ${card(cf.direction.title, cf.direction.text, cf.direction.evidence)}
        ${card(cf.career.title, cf.career.text, cf.career.evidence)}
        ${card(cf.savings.title, cf.savings.text, cf.savings.evidence)}
        ${card(cf.gains.title, cf.gains.text, cf.gains.evidence)}
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
      <div class="mt-10 grid gap-5 md:grid-cols-3">${hf.map((f) => card(f.title, f.text, f.evidence)).join('')}</div>
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
      </section>`;

    const panel = document.getElementById('lr-panel-you')!;
    const a = this.subs.you;
    panel.innerHTML =
      subnav('You', [['profile', 'Profile'], ['work-style', 'How you work'], ['strengths', 'Strengths'], ['routine', 'Daily routine'], ['work', 'Work & money'], ['health', 'Health & energy']], a) +
      sub('profile', a, profile) + sub('work-style', a, work) + sub('strengths', a, strengths) + sub('routine', a, routine) + sub('work', a, workMoney) + sub('health', a, health);
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
    panel.innerHTML = subnav('Seasons', [['chapter', 'This chapter'], ['year', 'This year'], ['life', 'Life map'], ['cycles', 'Long cycles']], a) + sub('chapter', a, chapter) + sub('year', a, year) + sub('life', a, life) + sub('cycles', a, cycles);
  }

  /* ═══════════ PEOPLE ═══════════ */

  private renderPeople() {
    const chart = this.chart!;
    const rf = I.relationshipFindings(chart);
    let partner = intro('Partner', 'How your rhythms fit together', 'Start with what your own chart says about relationships — then add someone’s details to compare.') + `<div class="mt-10 grid gap-5 md:grid-cols-2">${rf.map((f) => card(f.title, f.text, f.evidence)).join('')}</div>`;
    partner += `<section class="lr-section">${this.partner && this.partnerChart ? this.partnerResult() : sectionHead('Compare with someone') + this.partnerForm()}</section>`;

    const h5el = chart.houses[4].sign.element as ElementType;
    const cs = C.CHILD_STYLE[h5el];
    const cfnd = I.childrenFindings(chart);
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
      <div class="mt-10 grid gap-5 md:grid-cols-2">${cfnd.map((f) => card(f.title, f.text, f.evidence)).join('')}</div>
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
    panel.innerHTML = subnav('Decisions', [['ask', 'Ask a question'], ['check', 'Check a decision']], a) + sub('ask', a, ask) + sub('check', a, check);
    this.bindAsk(panel);
    this.bindPrashna(panel);
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
        <div class="lr-card"><p class="lr-label-sm">Rashi chart (D1) · North Indian</p><div class="mt-4">${this.northIndianChart(c)}</div></div>
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
      ${c.yogas.length ? `<section class="lr-section !mt-12"><h3 class="lr-h2">Yogas detected</h3><div class="mt-5">${table(['Yoga', 'Category', 'Classical description'], c.yogas.map((y: any) => [`${esc(y.name)}${y.sanskrit && y.sanskrit !== y.name ? ` <span class="muted">${esc(y.sanskrit)}</span>` : ''}`, esc(y.category), `<span class="muted whitespace-normal">${esc(y.description)}</span>`]))}</div></section>` : ''}`;
  }

  /** North Indian diamond chart. House 1 at top centre, counter-clockwise. */
  private northIndianChart(c: ComprehensiveKundliResult): string {
    const S = 320, h = S / 2, q = S / 4;
    const anchors: Array<[number, number]> = [[h, q], [q, q / 2.2], [q / 2.2, q], [q, h], [q / 2.2, S - q], [q, S - q / 2.2], [h, S - q], [S - q, S - q / 2.2], [S - q / 2.2, S - q], [S - q, h], [S - q / 2.2, q], [S - q, q / 2.2]];
    const byHouse: string[][] = Array.from({ length: 12 }, () => []);
    for (const n of PLANET_ORDER) byHouse[c.planets[n].house - 1].push(PLANET_ABBR[n] + (c.planets[n].isRetrograde && n !== 'Rahu' && n !== 'Ketu' ? 'ʳ' : ''));
    const ascIdx = c.ascendant.sign.index;
    const cells = anchors.map(([x, y], i) => {
      const big = i % 3 === 0;
      const ps = byHouse[i];
      const lines: string[] = [];
      for (let k = 0; k < ps.length; k += big ? 3 : 2) lines.push(ps.slice(k, k + (big ? 3 : 2)).join(' '));
      const startY = y - ((lines.length - 1) * 13) / 2 + (big ? 6 : 4);
      return `<text x="${x}" y="${big ? y - 22 : y - 12}" text-anchor="middle" font-size="10" fill="var(--color-cool-gray)">${((ascIdx + i) % 12) + 1}</text>${i === 0 ? `<text x="${x}" y="${y - 34}" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="var(--color-secondary)">ASC</text>` : ''}${lines.map((l, li) => `<text x="${x}" y="${startY + li * 13}" text-anchor="middle" font-size="11.5" font-weight="500" fill="var(--color-ink)">${esc(l)}</text>`).join('')}`;
    }).join('');
    return `<svg class="lr-chart-svg w-full" viewBox="-1 -1 ${S + 2} ${S + 2}" role="img" aria-label="North Indian birth chart"><rect x="0" y="0" width="${S}" height="${S}" rx="10" fill="color-mix(in srgb, var(--color-accent) 6%, #fff)" stroke="var(--color-line-strong)"/><g stroke="var(--color-line-strong)" stroke-width="1"><line x1="0" y1="0" x2="${S}" y2="${S}"/><line x1="${S}" y1="0" x2="0" y2="${S}"/><polygon points="${h},0 ${S},${h} ${h},${S} 0,${h}" fill="none"/></g>${cells}</svg>`;
  }
}

if (typeof document !== 'undefined') {
  const start = () => new LifeRhythm().init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
