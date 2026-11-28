/**
 * Wellness Waves — personal day arcs (composer 2, rulebook 2).
 *
 * Builds three programs a day (morning, midday, evening) for one person, value
 * by value. Nothing is picked from existing programs. Each program is an arc of
 * movements whose shape follows the time of day (wake → lift → settle, focus →
 * pause → return, unwind → ground → release → drift) and whose exact rates are
 * computed from the whole chart:
 *
 *   tones        every planet has a tone from its orbital period, raised by
 *                octaves (the "cosmic octave" method), and turned by the degree
 *                it stood at at birth (one zodiac turn = one octave, Kepler's
 *                mapping), so the same planet sounds different in every chart.
 *                A movement's rate is the strength-weighted blend of the tones
 *                of the planets that voice it, placed inside the movement's band.
 *   home tone    the blend of all nine planets by their six-fold strength, in
 *                the 8.5–11.5 Hz range: the person's own resting rate.
 *   voices       which planets voice a movement: the Moon at waking, the planet
 *                ruling the hour (hora) of each slot, the weekday lord, the
 *                running period lords, the ascendant lord, Mercury for focus,
 *                Saturn and Ketu for release, and so on (ARC_RULES).
 *   constitution Moon nadi, element balance and the ascendant element give an
 *                Ayurvedic-style lean (airy, fiery or earthy) that sets peaks,
 *                lengths, drift and pulse shape.
 *   challenges   weak or strong factors add, lengthen, soften or skip
 *                movements (grounding, bursts, a recovery pause, longer drift).
 *   today        the day's score sets the tempo; the transiting Moon and the
 *                weekday lord colour the voices.
 *
 * Pure and deterministic: same facts, date and slot → same arc. Copy never
 * names planets in Simple view and makes no health claims.
 */

import type { Intent } from '../../sound/engine/types/index';
import {
  ARC_COMPOSER_VERSION,
  ARC_SCHEMA,
  ARC_LIMITS,
  type ArcComposition,
  type ArcMovement,
  type ArcShape,
  type ArcVoice,
} from '../../sound/engine/compose/arc';
import { SUGGESTED_RECIPE } from '../../sound/engine/compose/compose';
import { catalog } from '../../sound/engine/domain/programs/catalog';
import type { DayTempo, Level, Planet, Slot } from './rulebook';

export const ARC_RULEBOOK_VERSION = '2.1.0';
export const ARC_RULEBOOK_STATUS: 'draft' | 'signed-off' = 'draft';
export const ARC_LIBRARY_VERSION = '1.0.0';

const PLANETS: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

/* ───────────────────────── facts the arcs read ───────────────────────── */

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Dosha = 'vata' | 'pitta' | 'kapha';

export interface ArcFacts {
  planets: Record<Planet, { level: Level; strength: number; house: number; dignity: string; retro: boolean; /** Sidereal longitude at birth, degrees. */ lon: number }>;
  ascLord: Planet;
  ascElement: Element;
  moon: { nakshatra: string; lord: Planet; gana: string; nadi: 'Adi' | 'Madhya' | 'Antya'; pada: number };
  elements: Record<Element, number>;
  /** Life areas used by the arc rules: house → level. */
  areas: Record<number, Level>;
  timeUnknown: boolean;
  dasha: { maha: Planet; antar: Planet; pratyantar: Planet | null };
  sadeSati: 'none' | 'rising' | 'peak' | 'setting';
  /** Overall backing of the current chapter (main and sub-period). */
  chapterSupport: Level;
  /** Last day of the current sub-period, YYYY-MM-DD. */
  chapterUntil: string;
  today: {
    date: string;
    vara: Planet;
    moonNakshatra: string;
    moonLord: Planet;
    /** Sidereal longitude of today's Moon at local noon, degrees. */
    moonLon: number;
    waxing: boolean;
    score: number;
    /**
     * Hora (hour) ruler of each slot's clock hour, from the real sunrise and sunset
     * (day and night each split into 12 equal horas). Absent when the member is
     * away from the birth time zone or the sun does not rise: then equal hours
     * from 06:00 are used (horaLord).
     */
    hora?: Record<Slot, Planet>;
  };
}

/* ───────────────────────── the frequency library ───────────────────────── */

/**
 * Orbital periods (days). Sun: the sidereal year (the Sun's path through the
 * zodiac as seen from Earth). Moon: the synodic month. Rahu and Ketu: the
 * nodal cycle of the Moon's orbit (both ends of one axis share it).
 */
export const ORBIT_DAYS: Record<Planet, number> = {
  Sun: 365.256363,
  Moon: 29.530589,
  Mercury: 87.9691,
  Venus: 224.701,
  Mars: 686.98,
  Jupiter: 4332.59,
  Saturn: 10759.22,
  Rahu: 6798.38,
  Ketu: 6798.38,
};

/** Position of a planet's tone within the octave, 0–1 (log2 of its orbital frequency, fractional part). */
export function octavePosition(p: Planet): number {
  const f = 1 / (ORBIT_DAYS[p] * 86_400);
  const l = Math.log2(f);
  return l - Math.floor(l);
}

/** Voice name for today's transiting Moon. */
export const MOON_TODAY = 'Moon today';

/**
 * A voice's position in the octave for this chart: the planet's orbital tone,
 * turned by its birth degree (360° = one octave). Today's Moon uses today's degree.
 */
export function chartPosition(f: ArcFacts, source: string): number {
  const planet = (source === MOON_TODAY ? 'Moon' : source) as Planet;
  const lon = source === MOON_TODAY ? f.today.moonLon : f.planets[planet].lon;
  const u = octavePosition(planet) + lon / 360;
  return u - Math.floor(u);
}

/** The planet's tone raised by whole octaves into 128–256 Hz (the audible "cosmic octave" tone). */
export function audibleTone(p: Planet): number {
  return 128 * Math.pow(2, octavePosition(p));
}

/** Fixed research values the arcs use, with where they come from. */
export const LIBRARY = {
  earth: {
    hz: 7.83,
    label: 'Earth resonance',
    basis: 'Schumann resonance (~7.83 Hz). Used for grounding in the Infinity device catalog (Deep Relaxation, Meditation Support, Emotional Grounding).',
  },
  gamma: {
    hz: 40,
    label: 'Gamma bursts',
    basis: '40 Hz is where the auditory steady-state response is strongest (ASSR reviews); the device catalog\'s Focus Boost uses 40 Hz bursts of 2 s every 15 s over a 10 Hz base.',
  },
  ten: {
    hz: 10,
    label: '10 Hz renewal',
    basis: '10 Hz is the rate most studied for cell-level renewal in PEMF research (Goodwin, NASA TP-2003-212054); used in the device catalog\'s recovery programs.',
  },
  breath: {
    hz: 0.1,
    label: 'Resonance breathing',
    basis: 'About six breaths a minute (0.1 Hz, range 4.5–6.5) is the resonance rate of heart-rate variability (Lehrer & Gevirtz 2014).',
  },
  slow: {
    hz: 1,
    label: 'Slow wave',
    basis: 'Rates at or below 1 Hz are used for sleep in pulsed-field trials, and match the slow oscillation of deep sleep.',
  },
  drift: {
    hz: 0,
    label: 'Drift',
    basis: 'The device jitter spec: ±5 % for sleep and calm programs, ±10 % for activation, so the pattern never sits perfectly still (against habituation).',
  },
} as const;

/* ───────────────────────── tone maths ───────────────────────── */

const round2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Strength of a planet as a weight factor (0.6–1.8). */
const strengthOf = (f: ArcFacts, p: Planet) => clamp(f.planets[p].strength, 0.6, 1.8);

/**
 * The strength-weighted blend of planet tones, placed inside [lo, hi].
 * Tones are octave-equivalent, so they are averaged on the circle; the result
 * keeps its position in the octave and is mapped onto the band.
 */
export function blendInBand(f: ArcFacts, voices: ArcVoice[], lo: number, hi: number): number {
  let x = 0;
  let y = 0;
  for (const v of voices) {
    const u = chartPosition(f, v.source);
    x += v.weight * Math.cos(2 * Math.PI * u);
    y += v.weight * Math.sin(2 * Math.PI * u);
  }
  let u: number;
  if (Math.hypot(x, y) < 1e-6) {
    const top = [...voices].sort((a, b) => b.weight - a.weight)[0];
    u = chartPosition(f, top.source);
  } else {
    u = Math.atan2(y, x) / (2 * Math.PI);
    if (u < 0) u += 1;
  }
  return round2(lo * Math.pow(hi / lo, u));
}

/** Merge voices on the same planet; drop zero weights; heaviest first. */
function voices(f: ArcFacts, list: Array<[Planet | typeof MOON_TODAY, number]>): ArcVoice[] {
  const m = new Map<string, number>();
  for (const [p, w] of list) if (w > 0) m.set(p, (m.get(p) ?? 0) + w * (p === MOON_TODAY ? 1 : strengthOf(f, p)));
  return [...m.entries()]
    .map(([source, weight]) => ({ source, weight: round2(weight) }))
    .sort((a, b) => b.weight - a.weight || (a.source < b.source ? -1 : 1));
}

/* ───────────────────────── constitution and hours ───────────────────────── */

export function constitution(f: ArcFacts): { lean: Dosha; shares: Record<Dosha, number> } {
  const s: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
  s[f.moon.nadi === 'Adi' ? 'vata' : f.moon.nadi === 'Madhya' ? 'pitta' : 'kapha'] += 2;
  const total = Object.values(f.elements).reduce((a, b) => a + b, 0) || 1;
  const add = (el: Element, w: number) => {
    if (el === 'Air') s.vata += w;
    else if (el === 'Fire') s.pitta += w;
    else if (el === 'Earth') s.kapha += w;
    else {
      s.pitta += w / 2;
      s.kapha += w / 2;
    }
  };
  for (const el of ['Fire', 'Earth', 'Air', 'Water'] as Element[]) add(el, (4 * f.elements[el]) / total);
  add(f.ascElement, 1);
  const sum = s.vata + s.pitta + s.kapha;
  const shares = { vata: round2(s.vata / sum), pitta: round2(s.pitta / sum), kapha: round2(s.kapha / sum) };
  const lean = (['vata', 'pitta', 'kapha'] as Dosha[]).sort((a, b) => s[b] - s[a] || (a < b ? -1 : 1))[0];
  return { lean, shares };
}

/** Chaldean order: each hour's ruler is the next planet in this list. */
const CHALDEAN: Planet[] = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
export const WEEKDAY_LORD: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
/** Local clock hour each slot is built around. */
export const SLOT_HOUR: Record<Slot, number> = { morning: 8, midday: 13, evening: 21 };

/** Fallback: equal 60-minute hours counted from 06:00, the first ruled by the weekday lord. */
export function horaLord(vara: Planet, clockHour: number): Planet {
  const h = (((clockHour - 6) % 24) + 24) % 24;
  return CHALDEAN[(CHALDEAN.indexOf(vara) + h) % 7];
}

/**
 * Hora ruler at `at` from the real solar day containing it: sunrise to sunset is
 * split into 12 day horas, sunset to the next sunrise into 12 night horas, and the
 * first hora after sunrise belongs to the lord of that sunrise's weekday. A moment
 * before sunrise therefore belongs to the previous Vedic day.
 */
export function sunriseHoraLord(day: { sunrise: Date; sunset: Date; nextSunrise: Date; weekday: number }, at: Date): Planet {
  const t = at.getTime();
  const rise = day.sunrise.getTime();
  const set = day.sunset.getTime();
  const next = day.nextSunrise.getTime();
  const index = t < set
    ? Math.floor(((t - rise) / (set - rise)) * 12)
    : 12 + Math.floor(((t - set) / (next - set)) * 12);
  const vara = WEEKDAY_LORD[day.weekday];
  return CHALDEAN[(CHALDEAN.indexOf(vara) + Math.max(0, Math.min(23, index))) % 7];
}

/* ───────────────────────── rules ───────────────────────── */

export interface ArcRule {
  id: string;
  slot: Slot | 'all';
  /** Plain-language condition. */
  when: string;
  /** Plain-language effect on the program. */
  does: string;
  /** Member-facing sentence (Simple view). No planet names, no claims. */
  simple?: string;
}

export const ARC_RULES: ArcRule[] = [
  { id: 'base.home', slot: 'all', when: 'Always.', does: 'Your home tone (8.5–11.5 Hz) is the blend of all nine planets weighted by their strength. Every program passes through it.' },
  { id: 'base.hora', slot: 'all', when: 'Always.', does: 'The planet ruling the hour of each slot (08:00, 13:00, 21:00) voices that slot\'s opening movement. Hours follow the real sunrise and sunset at the birth place while the member is in the birth time zone; otherwise equal hours from 06:00.' },
  { id: 'base.period', slot: 'all', when: 'Always.', does: 'The running period lords (main and sub-period) voice the lift, drive and release movements lightly.' },
  { id: 'base.day', slot: 'all', when: 'Always.', does: 'Today\'s Moon (at its degree today), the weekday lord and the planet ruling today\'s Moon station voice the waking, reset, pause, return, drift and deep movements, so the programs change every day.' },
  { id: 'lean.vata', slot: 'all', when: 'Your constitution leans airy (vata).', does: 'Lower peaks (beta capped at 16 Hz), longer grounding and settling, smaller drift, rounded pulse; evening always grounds at 7.83 Hz.', simple: 'Your programs keep a grounded, unhurried shape.' },
  { id: 'lean.pitta', slot: 'all', when: 'Your constitution leans fiery (pitta).', does: 'Midday drive capped at 17 Hz with a rounded pulse, and a longer midday pause to cool down.', simple: 'Your midday program builds in a longer pause to cool down.' },
  { id: 'lean.kapha', slot: 'all', when: 'Your constitution leans earthy (kapha).', does: 'Shorter waking, a firmer pulse and a higher morning peak (up to 22 Hz), larger drift.', simple: 'Your mornings get a brighter, firmer lift.' },
  { id: 'need.ground', slot: 'all', when: 'The Moon or the 4th area (home, inner calm) is low.', does: 'Adds a 7.83 Hz grounding movement before waking and lengthens evening grounding.', simple: 'A grounding passage is added, because steadiness is something to build on.' },
  { id: 'need.focus', slot: 'midday', when: 'Mercury is low, or Mercury runs the current period.', does: 'Adds 40 Hz bursts (2 s every 15 s) to the midday focus movement.', simple: 'Short, bright bursts are woven into the focus part.' },
  { id: 'need.recover', slot: 'midday', when: 'The 6th area (daily health, routines) or overall vitality is low.', does: 'The midday pause becomes a 10 Hz renewal movement, one minute longer; the morning spark is left out.', simple: 'Midday includes a longer renewal pause.' },
  { id: 'need.rest', slot: 'evening', when: 'The 12th area (sleep, letting go) is low.', does: 'Longer, slower drift (breathing swell at 4.5 per minute) and a longer slow-wave ending.', simple: 'Your evening winds down more slowly than most.' },
  { id: 'need.pressure', slot: 'evening', when: 'Saturn is pressing on the Moon (the 7.5-year cycle at its rising or peak).', does: 'Longer release with less drift: a steadier, more even descent.', simple: 'Evenings stay especially even for now.' },
  { id: 'strong.mars', slot: 'morning', when: 'Mars is strong.', does: 'The morning spark gets a firm pulse and one extra minute.', simple: 'Your morning has a strong, clear spark to work with.' },
  { id: 'low.mars', slot: 'morning', when: 'Mars is low.', does: 'No spark: the morning lifts to its steady peak and settles.' },
  { id: 'strong.mercury', slot: 'midday', when: 'Mercury is strong.', does: 'The midday focus movement runs one minute longer.', simple: 'Focus is a strength, so midday gives it more room.' },
  { id: 'strong.top', slot: 'morning', when: 'Always (your strongest planet).', does: 'Your strongest planet voices the morning settle, so the day starts from your strength.' },
  { id: 'quiet.top', slot: 'midday', when: 'Always (your quietest planet).', does: 'Your quietest planet voices the midday pause, so it gets attention when the day is calm.' },
  { id: 'tempo.push', slot: 'all', when: 'Today scores 64 or more.', does: 'Lift, spark, focus and drive run 10 % longer.', simple: 'Today has good momentum.' },
  { id: 'tempo.steady', slot: 'all', when: 'Today scores 42–63.', does: 'Lengths as designed.', simple: 'Today is an even, steady day.' },
  { id: 'tempo.soften', slot: 'all', when: 'Today scores 28–41, or a lower score with a supportive Moon station.', does: 'No spark or drive; active movements 10 % shorter, evening 15 % longer.', simple: 'Today asks for a gentler pace.' },
  { id: 'tempo.rest', slot: 'all', when: 'Today scores below 28.', does: 'As soften, and the morning wakes more slowly.', simple: 'Today asks for a slower start and plenty of pauses.' },
];

export const arcRuleById = (id: string) => ARC_RULES.find((r) => r.id === id);

/* ───────────────────────── composer ───────────────────────── */

export const SLOT_INTENT: Record<Slot, Record<DayTempo, Intent>> = {
  morning: { push: 'energy', steady: 'focus', soften: 'balance', rest: 'relax' },
  midday: { push: 'focus', steady: 'focus', soften: 'balance', rest: 'relax' },
  evening: { push: 'relax', steady: 'relax', soften: 'meditate', rest: 'sleep' },
};

/** Pulse depth by rate: deeper for slow rates, lighter where fast pulses would feel rough. */
const depthFor = (hz: number) => (hz < 4 ? 0.3 : hz < 8 ? 0.27 : hz < 15 ? 0.24 : 0.21);
const len = (s: number) => clamp(Math.round(s / 10) * 10, ARC_LIMITS.minSeconds, ARC_LIMITS.maxSeconds);

interface Ctx {
  f: ArcFacts;
  slot: Slot;
  tempo: DayTempo;
  lean: Dosha;
  hora: Planet;
  home: number;
  homeVoices: ArcVoice[];
  strongest: Planet;
  quietest: Planet;
  fired: Set<string>;
}

function mv(
  c: Ctx,
  id: string,
  from: number,
  to: number,
  seconds: number,
  opts: { shape?: ArcShape; jitter: [number, number]; burst?: ArcMovement['burst']; breath?: ArcMovement['breath']; voices: ArcVoice[]; rules: string[] }
): ArcMovement {
  for (const r of opts.rules) c.fired.add(r);
  return {
    id,
    fromHz: round2(from),
    toHz: round2(to),
    seconds: len(seconds),
    depth: depthFor(Math.min(from, to)),
    shape: opts.shape ?? 'sine',
    jitter: { pct: opts.jitter[0], every: opts.jitter[1] },
    ...(opts.burst ? { burst: opts.burst } : {}),
    ...(opts.breath ? { breath: opts.breath } : {}),
    voices: opts.voices,
    rules: opts.rules,
  };
}

const lowish = (l: Level) => l === 'low';
const strongish = (l: Level) => l === 'strong';
const fixed = (key: keyof typeof LIBRARY): ArcVoice[] => [{ source: LIBRARY[key].label, weight: 1 }];

function context(f: ArcFacts, slot: Slot, tempo: DayTempo): Ctx {
  const { lean } = constitution(f);
  const homeVoices = voices(f, [...PLANETS.map((p) => [p, 1] as [Planet, number]), ['Moon', 1], [f.ascLord, 0.5]]);
  const ranked = [...PLANETS].sort((a, b) => f.planets[b].strength - f.planets[a].strength || (a < b ? -1 : 1));
  return {
    f,
    slot,
    tempo,
    lean,
    hora: f.today.hora?.[slot] ?? horaLord(f.today.vara, SLOT_HOUR[slot]),
    home: blendInBand(f, homeVoices, 8.5, 11.5),
    homeVoices,
    strongest: ranked[0],
    quietest: ranked[ranked.length - 1],
    fired: new Set([`tempo.${tempo}`, `lean.${lean}`, 'base.home', 'base.hora']),
  };
}

const active = (c: Ctx) => (c.tempo === 'push' ? 1.1 : c.tempo === 'steady' ? 1 : 0.9);
const calmer = (c: Ctx) => c.tempo === 'soften' || c.tempo === 'rest';

function morning(c: Ctx): ArcMovement[] {
  const { f } = c;
  const out: ArcMovement[] = [];
  const ground = lowish(f.planets.Moon.level) || lowish(f.areas[4] ?? 'average');
  if (ground) {
    out.push(mv(c, 'morning.ground', LIBRARY.earth.hz, LIBRARY.earth.hz, 120, { jitter: [0.04, 4], breath: { hz: 0.1, depth: 0.1 }, voices: fixed('earth'), rules: ['need.ground'] }));
  }
  const wakeV = voices(f, [['Moon', 1], [MOON_TODAY, 0.8], [c.hora, 0.7], [f.today.moonLord, 0.4]]);
  const wake = blendInBand(c.f, wakeV, 5.5, 7.5);
  const wakeLen = (c.lean === 'kapha' ? 150 : c.lean === 'vata' ? 240 : 180) * (c.tempo === 'rest' ? 1.3 : 1);
  out.push(mv(c, 'morning.wake', wake, wake, wakeLen, { jitter: [0.05, 3], breath: { hz: 0.1, depth: 0.1 }, voices: wakeV, rules: ['base.hora'] }));
  out.push(mv(c, 'morning.rise', wake, c.home, 240, { jitter: [0.06, 3], voices: c.homeVoices, rules: ['base.home'] }));

  const liftV = voices(f, [['Sun', 1], [f.ascLord, 0.8], [f.today.vara, 0.6], [f.dasha.maha, 0.35]]);
  const lift = blendInBand(c.f, liftV, 12, 15);
  const firm = c.lean === 'kapha' || strongish(f.planets.Mars.level);
  out.push(mv(c, 'morning.lift', c.home, lift, 300 * active(c), { shape: firm ? 'firm' : 'sine', jitter: [0.08, 2.5], voices: liftV, rules: ['base.day', 'base.period'] }));

  const lowMars = lowish(f.planets.Mars.level);
  const recover = lowish(f.areas[6] ?? 'average') || lowish(f.planets.Sun.level);
  if (lowMars) c.fired.add('low.mars');
  if (recover) c.fired.add('need.recover');
  const sparkOk = !calmer(c) && !lowMars && !recover && !(c.lean === 'vata' && c.tempo !== 'push');
  if (sparkOk) {
    const sparkV = voices(f, [['Mars', 1], ['Sun', 0.6], [f.dasha.antar, 0.35]]);
    const cap = c.lean === 'kapha' ? 22 : c.lean === 'vata' ? 16 : 20;
    const spark = blendInBand(c.f, sparkV, 15, cap);
    const strongMars = strongish(f.planets.Mars.level);
    out.push(
      mv(c, 'morning.spark', lift, spark, (240 + (strongMars ? 60 : 0)) * active(c), {
        shape: firm || strongMars ? 'firm' : 'sine',
        jitter: [c.lean === 'vata' ? 0.07 : 0.1, 2],
        voices: sparkV,
        rules: ['base.period', ...(strongMars ? ['strong.mars'] : [])],
      })
    );
  }
  const settleV = voices(f, [[c.strongest, 1], [f.ascLord, 0.5]]);
  const settle = blendInBand(c.f, settleV, 10, 12.5);
  const prev = out[out.length - 1].toHz;
  out.push(mv(c, 'morning.settle', prev, settle, c.lean === 'vata' ? 240 : 180, { jitter: [0.06, 3], voices: settleV, rules: ['strong.top'] }));
  return out;
}

function midday(c: Ctx): ArcMovement[] {
  const { f } = c;
  const out: ArcMovement[] = [];
  const resetV = voices(f, [[c.hora, 1], [MOON_TODAY, 0.5]]);
  const reset = blendInBand(c.f, resetV, 10, 12.5);
  out.push(mv(c, 'midday.reset', reset, c.home, 180, { jitter: [0.05, 3], breath: { hz: 0.1, depth: 0.1 }, voices: resetV, rules: ['base.hora', 'base.home'] }));

  const focusV = voices(f, [['Mercury', 1.5], ['Jupiter', 0.6], [c.hora, 0.5], [f.dasha.maha, 0.3]]);
  const focus = blendInBand(c.f, focusV, 12, 15);
  const mercuryNeed = lowish(f.planets.Mercury.level) || f.dasha.maha === 'Mercury' || f.dasha.antar === 'Mercury';
  const strongMercury = strongish(f.planets.Mercury.level);
  out.push(
    mv(c, 'midday.focus', c.home, focus, (360 + (strongMercury ? 60 : 0)) * active(c), {
      jitter: [0.08, 2.5],
      ...(mercuryNeed ? { burst: { hz: LIBRARY.gamma.hz, on: 2, every: 15 } } : {}),
      voices: mercuryNeed ? [...focusV, ...fixed('gamma')] : focusV,
      rules: ['base.period', ...(mercuryNeed ? ['need.focus'] : []), ...(strongMercury ? ['strong.mercury'] : [])],
    })
  );

  if (!calmer(c)) {
    const driveV = voices(f, [['Mars', 1], ['Sun', 0.8], [f.dasha.maha, 0.5]]);
    const cap = c.lean === 'pitta' ? 17 : c.lean === 'vata' ? 16 : 19;
    const drive = blendInBand(c.f, driveV, 15, cap);
    out.push(mv(c, 'midday.drive', focus, drive, 300 * active(c), { shape: c.lean === 'pitta' || c.lean === 'vata' ? 'sine' : 'firm', jitter: [0.1, 2], voices: driveV, rules: ['base.period'] }));
  }

  const recover = lowish(f.areas[6] ?? 'average') || lowish(f.planets.Sun.level);
  const pauseLen = 180 + (c.lean === 'pitta' ? 60 : 0) + (recover ? 60 : 0);
  if (recover) {
    out.push(mv(c, 'midday.renew', LIBRARY.ten.hz, LIBRARY.ten.hz, pauseLen, { jitter: [0.05, 3], breath: { hz: 0.1, depth: 0.14 }, voices: fixed('ten'), rules: ['need.recover'] }));
  } else {
    const pauseV = voices(f, [['Venus', 1], [MOON_TODAY, 0.6], [c.quietest, 0.8]]);
    const pause = blendInBand(c.f, pauseV, 7.8, 9.5);
    out.push(mv(c, 'midday.pause', pause, pause, pauseLen, { jitter: [0.05, 3], breath: { hz: 0.1, depth: 0.14 }, voices: pauseV, rules: ['quiet.top'] }));
  }

  const backV = voices(f, [['Mercury', 1], [f.today.vara, 0.7], [MOON_TODAY, 0.5], [f.today.moonLord, 0.4]]);
  const back = blendInBand(c.f, backV, 11.5, 14);
  out.push(mv(c, 'midday.return', out[out.length - 1].toHz, back, 240, { jitter: [0.07, 2.5], voices: backV, rules: ['base.day'] }));
  return out;
}

function evening(c: Ctx): ArcMovement[] {
  const { f } = c;
  const out: ArcMovement[] = [];
  const longer = calmer(c) ? 1.15 : 1;
  const restNeed = lowish(f.areas[12] ?? 'average');
  const pressure = f.sadeSati === 'rising' || f.sadeSati === 'peak';
  const drift = pressure ? 0.035 : 0.05;

  const unwindV = voices(f, [['Venus', 1], [c.hora, 0.7]]);
  const unwind = blendInBand(c.f, unwindV, 7.8, 9.5);
  out.push(mv(c, 'evening.unwind', c.home, unwind, 240, { jitter: [drift, 3], voices: [...c.homeVoices.slice(0, 2), ...unwindV], rules: ['base.home', 'base.hora'] }));

  const ground = c.lean === 'vata' || lowish(f.planets.Moon.level) || lowish(f.areas[4] ?? 'average');
  const groundLen = 240 + (ground && c.lean === 'vata' ? 60 : 0) + (lowish(f.planets.Moon.level) || lowish(f.areas[4] ?? 'average') ? 60 : 0);
  if (ground) {
    out.push(
      mv(c, 'evening.ground', unwind, LIBRARY.earth.hz, groundLen * longer, {
        jitter: [drift, 4],
        breath: { hz: 0.09, depth: 0.12 },
        voices: fixed('earth'),
        rules: c.lean === 'vata' ? ['lean.vata', ...(lowish(f.planets.Moon.level) || lowish(f.areas[4] ?? 'average') ? ['need.ground'] : [])] : ['need.ground'],
      })
    );
  } else {
    const gV = voices(f, [['Moon', 1], ['Venus', 0.6]]);
    const g = blendInBand(c.f, gV, 6.5, 8);
    out.push(mv(c, 'evening.ground', unwind, g, groundLen * longer, { jitter: [drift, 4], breath: { hz: 0.09, depth: 0.12 }, voices: gV, rules: [] }));
  }

  const relV = voices(f, [['Saturn', 1], ['Ketu', 0.8], [c.hora, 0.5], [f.dasha.antar, 0.35]]);
  const rel = blendInBand(c.f, relV, 4.5, 6.5);
  out.push(
    mv(c, 'evening.release', out[out.length - 1].toHz, rel, (pressure ? 360 : 300) * longer, {
      jitter: [drift, 4],
      breath: { hz: 0.083, depth: 0.14 },
      voices: relV,
      rules: ['base.period', ...(pressure ? ['need.pressure'] : [])],
    })
  );

  const driftV = voices(f, [['Moon', 1], [MOON_TODAY, 0.8], ['Jupiter', 0.7], [f.today.moonLord, 0.4]]);
  const low = blendInBand(c.f, driftV, 1.5, 3.5);
  out.push(
    mv(c, 'evening.drift', rel, low, (restNeed ? 420 : 360) * longer, {
      jitter: [Math.min(drift, 0.05), 5],
      breath: { hz: restNeed ? 0.075 : 0.083, depth: 0.15 },
      voices: driftV,
      rules: ['base.day', ...(restNeed ? ['need.rest'] : [])],
    })
  );

  const deepV = voices(f, [['Moon', 1], [MOON_TODAY, 0.6], ['Ketu', 0.5]]);
  const deep = blendInBand(c.f, deepV, 0.6, 1.2);
  out.push(
    mv(c, 'evening.deep', low, deep, (restNeed ? 360 : 300) * longer, {
      jitter: [0.04, 6],
      breath: { hz: 0.075, depth: 0.15 },
      voices: [...deepV, ...fixed('slow')],
      rules: restNeed ? ['need.rest'] : [],
    })
  );
  return out;
}

export interface DayArc {
  composition: ArcComposition;
  /** Rule ids that shaped this program, in table order. */
  rules: string[];
  lean: Dosha;
  shares: Record<Dosha, number>;
  hora: Planet;
  home: number;
}

export function composeDayArc(f: ArcFacts, slot: Slot, tempo: DayTempo, seed: string): DayArc {
  const c = context(f, slot, tempo);
  const movements = slot === 'morning' ? morning(c) : slot === 'midday' ? midday(c) : evening(c);
  // Stay inside the session limit: trim the longest movements in 10 s steps.
  let total = movements.reduce((t, m) => t + m.seconds, 0);
  while (total > ARC_LIMITS.maxTotalSeconds) {
    const m = [...movements].sort((a, b) => b.seconds - a.seconds)[0];
    m.seconds -= 10;
    total -= 10;
  }
  c.fired.add('base.period');
  const intent = SLOT_INTENT[slot][tempo];
  const composition: ArcComposition = {
    schema: ARC_SCHEMA,
    slot,
    intent,
    recipeId: SUGGESTED_RECIPE[intent],
    movements,
    holdLast: true,
    seed,
    totalSeconds: total,
    versions: { composer: ARC_COMPOSER_VERSION, rulebook: ARC_RULEBOOK_VERSION, library: ARC_LIBRARY_VERSION },
  };
  const { shares } = constitution(f);
  return { composition, rules: ARC_RULES.map((r) => r.id).filter((id) => c.fired.has(id)), lean: c.lean, shares, hora: c.hora, home: c.home };
}

/* ───────────────────────── catalog echoes (Pro view) ───────────────────────── */

let pulseValues: Array<{ hz: number; raw: string; id: string; name: string }> | null = null;

/** A value in the frequency catalog within 1 % of `hz`, if any (shown in Pro view, never used to choose). */
export function catalogEcho(hz: number): { hz: number; raw: string; id: string; name: string } | null {
  pulseValues ??= catalog().programs.flatMap((p) =>
    p.frequencies.filter((v) => v.hz <= 40).map((v) => ({ hz: v.hz, raw: v.raw, id: p.id, name: p.name }))
  );
  let best: (typeof pulseValues)[number] | null = null;
  for (const v of pulseValues) {
    const d = Math.abs(v.hz - hz) / hz;
    if (d <= 0.01 && (!best || d < Math.abs(best.hz - hz) / hz)) best = v;
  }
  return best;
}

/* ───────────────────────── theme arcs: chapter, strengths, support ───────────────────────── */

/**
 * What each planet's arc sounds like when it is built on (strong) or supported
 * (low): the band its tone is placed in, extras, the player space, and the
 * member-facing title and sentence (no planet names, no claims).
 */
interface Nature {
  strong: { band: [number, number]; firm?: boolean; breath?: boolean; intent: Intent; title: string; line: string };
  support: {
    band: [number, number];
    fixed?: keyof typeof LIBRARY;
    burst?: boolean;
    intent: Intent;
    title: string;
    line: string;
  };
}

export const NATURE: Record<Planet, Nature> = {
  Sun: {
    strong: { band: [12, 15], firm: true, intent: 'energy', title: 'Steady Fire', line: 'Steady energy and a clear sense of direction come naturally to you, so this builds on that.' },
    support: { band: [9, 11], fixed: 'ten', intent: 'recover', title: 'Renewal', line: 'Energy gets less built-in backing in your chart, so this makes room to recharge.' },
  },
  Moon: {
    strong: { band: [6, 8], breath: true, intent: 'meditate', title: 'Inner Tide', line: 'A rich inner life comes naturally to you, so this leaves space to feel it.' },
    support: { band: [6.5, 8], fixed: 'earth', intent: 'balance', title: 'Grounding', line: 'Feelings can take a while to settle for you, so this offers a calm, grounded middle.' },
  },
  Mars: {
    strong: { band: [15, 20], firm: true, intent: 'energy', title: 'Clear Drive', line: 'Drive and getting things moving come naturally to you, so this builds on that with a brighter pulse.' },
    support: { band: [10, 13], intent: 'balance', title: 'Gentle Start', line: 'Getting going can take more effort for you, so this builds up slowly from a calm start.' },
  },
  Mercury: {
    strong: { band: [12, 15], intent: 'focus', title: 'Quick Mind', line: 'Quick thinking comes naturally to you, so this gives focus plenty of room.' },
    support: { band: [12, 14], burst: true, intent: 'focus', title: 'Clear Focus', line: 'Focus gets less built-in backing in your chart, so this adds short, bright bursts to hold attention.' },
  },
  Jupiter: {
    strong: { band: [8.5, 11], breath: true, intent: 'balance', title: 'Wide View', line: 'Seeing the bigger picture comes naturally to you, so this opens out into a wide, easy calm.' },
    support: { band: [8, 10], intent: 'relax', title: 'Open Outlook', line: 'Optimism gets less built-in backing in your chart, so this keeps the music open and unhurried.' },
  },
  Venus: {
    strong: { band: [7.8, 10], breath: true, intent: 'relax', title: 'Easy Grace', line: 'Ease and enjoyment come naturally to you, so this leans into a soft, warm calm.' },
    support: { band: [7.8, 9.5], intent: 'relax', title: 'Softening', line: 'Letting yourself relax gets less built-in backing in your chart, so this softens slowly.' },
  },
  Saturn: {
    strong: { band: [4.5, 6.5], intent: 'meditate', title: 'Long Patience', line: 'Patience and staying power come naturally to you, so this settles into a long, even rhythm.' },
    support: { band: [4.5, 6.5], intent: 'meditate', title: 'Steady Ground', line: 'Pressure can build up for you, so this keeps a slow, even, steady pace.' },
  },
  Rahu: {
    strong: { band: [13, 17], intent: 'focus', title: 'Bold Reach', line: 'Reaching for something new comes naturally to you, so this keeps a bright, forward pulse.' },
    support: { band: [6.5, 8], fixed: 'earth', intent: 'balance', title: 'Settling', line: 'Restlessness can run high for you, so this brings things back down to earth.' },
  },
  Ketu: {
    strong: { band: [3, 5], breath: true, intent: 'meditate', title: 'Quiet Depth', line: 'Turning inward comes naturally to you, so this goes slow and deep.' },
    support: { band: [6.5, 8], intent: 'balance', title: 'Present Moment', line: 'Staying present can be harder for you, so this keeps a gentle, steady middle.' },
  },
};

/** Life areas that get their own support arc when low. */
export const AREA_NATURE: Record<4 | 6 | 12, { planet: Planet; title: string; line: string; intent: Intent }> = {
  4: { planet: 'Moon', title: 'Home Ground', line: 'Inner calm gets less built-in backing in your chart, so this is built around a grounding rhythm.', intent: 'balance' },
  6: { planet: 'Sun', title: 'Daily Renewal', line: 'Daily routines and recharging get less backing in your chart, so this makes room to renew.', intent: 'recover' },
  12: { planet: 'Moon', title: 'Deep Rest', line: 'Rest and switching off get less built-in backing in your chart, so this winds down slowly and deeply.', intent: 'sleep' },
};

export type Theme =
  | { kind: 'strength'; planet: Planet }
  | { kind: 'support'; planet: Planet }
  | { kind: 'area'; house: 4 | 6 | 12 }
  | { kind: 'chapter' };

ARC_RULES.push(
  { id: 'set.strength', slot: 'all', when: 'Your two strongest planets (strong or good, by six-fold strength).', does: 'Each gets its own arc: home tone → that planet\'s band, built on with its extras (firm pulse, breathing swell), then integrates. The tone is that planet\'s, turned by its birth degree, blended with the ascendant lord.' },
  { id: 'set.support.planet', slot: 'all', when: 'Your weakest planets: low ones first, then the weakest average ones (by six-fold strength). Never a planet that is also a strength.', does: 'A support arc in a softer band for that planet, sometimes with a research value: 10 Hz renewal, 7.83 Hz grounding or 40 Hz bursts. Breathing swell throughout, smaller drift.' },
  { id: 'set.support.area', slot: 'all', when: 'The 4th (inner calm), 6th (routines) or 12th (rest) area is low (needs a birth time).', does: 'A support arc for that area: grounding, renewal, or a slow descent to about 1 Hz.' },
  { id: 'chapter.lords', slot: 'all', when: 'Always (the current main and sub-period).', does: 'The chapter arc is voiced by the main period lord (counts 1.5) and the sub-period lord, in the main lord\'s band.' },
  { id: 'chapter.support', slot: 'all', when: 'The chapter\'s backing is low, or Saturn is pressing on the Moon (rising or peak).', does: 'The chapter arc uses the gentle support version of the main lord\'s band, with a breathing swell.', simple: 'This stretch of time asks for patience, so this keeps the pace calm and even.' },
  { id: 'chapter.build', slot: 'all', when: 'The chapter\'s backing is good or strong.', does: 'The chapter arc uses the build-on version of the main lord\'s band.', simple: 'This stretch of time has good backing, so this builds on it.' },
);

/** Strength first by level, then six-fold strength. Two strongest planets with level good or strong (at least one). */
export function strengthThemes(f: ArcFacts, n = 2): Theme[] {
  const ranked = [...PLANETS].sort((a, b) => f.planets[b].strength - f.planets[a].strength || (a < b ? -1 : 1));
  const good = ranked.filter((p) => f.planets[p].level === 'strong' || f.planets[p].level === 'good');
  return (good.length ? good : ranked).slice(0, n).map((planet) => ({ kind: 'strength', planet }));
}

/** Low areas first (they are specific), then the weakest planets; never a planet that is also a strength. */
export function supportThemes(f: ArcFacts, n = 2): Theme[] {
  const strong = new Set(strengthThemes(f).map((t) => (t as { planet: Planet }).planet));
  const areas = ([12, 4, 6] as const).filter((h) => f.areas[h] === 'low').map((house) => ({ kind: 'area', house }) as Theme);
  const ranked = [...PLANETS].filter((p) => !strong.has(p)).sort((a, b) => f.planets[a].strength - f.planets[b].strength || (a < b ? -1 : 1));
  // Low planets first; then the weakest average ones fill the second place; failing both, the weakest overall.
  const needy = [...ranked.filter((p) => f.planets[p].level === 'low'), ...ranked.filter((p) => f.planets[p].level === 'average')];
  const planets = (needy.length ? needy : ranked).map((planet) => ({ kind: 'support', planet }) as Theme);
  return [...areas, ...planets].slice(0, n);
}

export interface ThemeArc extends DayArc {
  title: string;
  line: string;
}

/** A theme arc: arrive at your home tone, approach and hold the theme, deepen, then integrate and hold. */
export function composeThemeArc(f: ArcFacts, theme: Theme, seed: string): ThemeArc {
  const c = context(f, 'midday', 'steady');
  c.fired.clear();
  c.fired.add('base.home');
  const out: ArcMovement[] = [];
  const arrive = (breath = 0.1) =>
    out.push(mv(c, 'theme.arrive', c.home, c.home, 180, { jitter: [0.05, 3], breath: { hz: breath, depth: 0.1 }, voices: c.homeVoices, rules: ['base.home'] }));

  let intent: Intent;
  let title: string;
  let line: string;
  let themeId: string;

  if (theme.kind === 'area' && theme.house === 12) {
    // Deep rest: a slow descent that ends near 1 Hz and stays there.
    const a = AREA_NATURE[12];
    ({ intent, title, line } = a);
    themeId = 'support:area-12';
    arrive(0.09);
    const v1 = voices(f, [['Moon', 1], ['Venus', 0.6]]);
    const g = blendInBand(f, v1, 6.5, 8);
    out.push(mv(c, 'theme.approach', c.home, g, 240, { jitter: [0.05, 4], breath: { hz: 0.09, depth: 0.12 }, voices: v1, rules: ['set.support.area'] }));
    const v2 = voices(f, [['Saturn', 1], ['Ketu', 0.8]]);
    const r = blendInBand(f, v2, 4.5, 6.5);
    out.push(mv(c, 'theme.hold', g, r, 300, { jitter: [0.04, 4], breath: { hz: 0.083, depth: 0.14 }, voices: v2, rules: ['set.support.area'] }));
    const v3 = voices(f, [['Moon', 1], ['Jupiter', 0.7]]);
    const d = blendInBand(f, v3, 1.5, 3.5);
    out.push(mv(c, 'theme.deepen', r, d, 420, { jitter: [0.04, 5], breath: { hz: 0.075, depth: 0.15 }, voices: v3, rules: ['set.support.area'] }));
    const v4 = voices(f, [['Moon', 1], ['Ketu', 0.5]]);
    const e = blendInBand(f, v4, 0.6, 1.2);
    out.push(mv(c, 'theme.integrate', d, e, 360, { jitter: [0.04, 6], breath: { hz: 0.075, depth: 0.15 }, voices: [...v4, ...fixed('slow')], rules: ['set.support.area'] }));
  } else {
    // Planet themes (strength, support, chapter) and the 4th and 6th areas.
    let planet: Planet;
    let support: boolean;
    let extra: Array<[Planet, number]>;
    let rule: string;
    if (theme.kind === 'chapter') {
      planet = f.dasha.maha;
      support = f.chapterSupport === 'low' || f.sadeSati === 'rising' || f.sadeSati === 'peak';
      extra = [[f.dasha.antar, 1]];
      rule = support ? 'chapter.support' : 'chapter.build';
      c.fired.add('chapter.lords');
      themeId = `chapter:${f.dasha.maha}-${f.dasha.antar}-${f.chapterUntil}`;
    } else if (theme.kind === 'area') {
      planet = AREA_NATURE[theme.house].planet;
      support = true;
      extra = [['Moon', 0.4]];
      rule = 'set.support.area';
      themeId = `support:area-${theme.house}`;
    } else {
      planet = theme.planet;
      support = theme.kind === 'support';
      extra = support ? [['Moon', 0.4]] : [[f.ascLord, 0.4]];
      rule = support ? 'set.support.planet' : 'set.strength';
      themeId = `${theme.kind}:${planet}`;
    }
    const n = NATURE[planet];
    if (theme.kind === 'area') {
      const a = AREA_NATURE[theme.house];
      ({ intent, title, line } = a);
    } else {
      const side = support ? n.support : n.strong;
      intent = side.intent;
      title = side.title;
      line = side.line;
    }
    const sup = n.support;
    const st = n.strong;
    const band = support ? sup.band : st.band;
    const drift: [number, number] = support ? [0.05, 3.5] : [st.band[0] >= 12 ? 0.09 : 0.06, st.band[0] >= 12 ? 2.5 : 3];
    const shape: ArcShape = !support && st.firm ? 'firm' : 'sine';
    const breathOn = support || !!st.breath;
    const breath = breathOn ? { hz: band[1] <= 8 ? 0.09 : 0.1, depth: support ? 0.12 : 0.1 } : undefined;
    const fixedKey = support && theme.kind !== 'chapter' ? (theme.kind === 'area' ? (theme.house === 4 ? 'earth' : 'ten') : sup.fixed) : undefined;
    const burst = support && sup.burst ? { hz: LIBRARY.gamma.hz, on: 2, every: 15 } : undefined;

    arrive();
    const themeV = voices(f, [[planet, 1.5], ...extra]);
    const a = blendInBand(f, themeV, band[0], band[1]);
    out.push(mv(c, 'theme.approach', c.home, a, 240, { shape, jitter: drift, ...(breath ? { breath } : {}), voices: themeV, rules: [rule] }));
    if (fixedKey) {
      const hz = LIBRARY[fixedKey].hz;
      out.push(mv(c, 'theme.hold', a, hz, 360, { jitter: [0.04, 4], ...(breath ? { breath } : {}), voices: fixed(fixedKey), rules: [rule] }));
    } else {
      out.push(mv(c, 'theme.hold', a, a, 360, { shape, jitter: drift, ...(burst ? { burst } : {}), ...(breath ? { breath } : {}), voices: burst ? [...themeV, ...fixed('gamma')] : themeV, rules: [rule] }));
    }
    // Deepen: support goes to the softer half of the band, a strength to the brighter half.
    const half: [number, number] = support ? [band[0], (band[0] + band[1]) / 2] : [(band[0] + band[1]) / 2, band[1]];
    // The chapter deepens into its sub-period (led by the sub-period lord); others stay led by the theme planet.
    const deepV =
      theme.kind === 'chapter'
        ? voices(f, [[f.dasha.antar, 1.5], [planet, 0.5]])
        : voices(f, [[planet, 1], [support ? 'Moon' : c.strongest, 0.6]]);
    const d = blendInBand(f, deepV, half[0], half[1]);
    out.push(mv(c, 'theme.deepen', out[out.length - 1].toHz, d, 300, { shape, jitter: drift, ...(breath ? { breath } : {}), voices: deepV, rules: [rule] }));
    // Integrate: halfway (in log terms) between the theme and your home tone, then hold.
    const integ = round2(Math.sqrt(d * c.home));
    out.push(mv(c, 'theme.integrate', d, integ, 240, { jitter: [0.05, 3], ...(breath ? { breath } : {}), voices: [...deepV.slice(0, 1), ...c.homeVoices.slice(0, 2)], rules: ['base.home'] }));
  }

  const total = out.reduce((t, m) => t + m.seconds, 0);
  const composition: ArcComposition = {
    schema: ARC_SCHEMA,
    slot: null,
    theme: themeId,
    intent,
    recipeId: SUGGESTED_RECIPE[intent],
    movements: out,
    holdLast: true,
    seed,
    totalSeconds: total,
    versions: { composer: ARC_COMPOSER_VERSION, rulebook: ARC_RULEBOOK_VERSION, library: ARC_LIBRARY_VERSION },
  };
  const { shares } = constitution(f);
  return {
    composition,
    rules: ARC_RULES.map((r) => r.id).filter((id) => c.fired.has(id)),
    lean: c.lean,
    shares,
    hora: c.hora,
    home: c.home,
    title,
    line,
  };
}
