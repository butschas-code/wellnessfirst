/**
 * Wellness Waves — signals: the chart as a "needs vector" (§5.2).
 *
 * Runs the existing deterministic chart engine for one birth profile and one
 * local calendar day, reduces it to plain facts, and applies the rulebook.
 * No copy, no audio, no clock: every moment used is derived from the inputs
 * (the day is evaluated at local noon), so the same profile, date and
 * rulebook version always give the same signals.
 */

import { calculateJanamKundli, calculateGocharaTransits } from '../astro-engine/index.ts';
import { calculatePlanetaryPositions } from '../astro-engine/core/ephemeris.ts';
import type { ComprehensiveKundliResult } from '../astro-engine/types.ts';
import { allAreas, chapterInsight, dayInsight, planetCondition } from '../astro-insights.ts';
import type { BirthProfile } from './profile';
import { WEEKDAY_LORD, type ArcFacts } from './dayArc';
import {
  RULEBOOK_VERSION,
  type CategoryWeights,
  type ChartFacts,
  type DayTempo,
  type Planet,
  type Reason,
  type Slot,
  applyRules,
  dayTempo,
  slotTempo,
} from './rulebook';

export const SIGNALS_VERSION = '1.0.0';

export interface SoundSignals {
  profileId: string;
  profileVersion: number;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  timeZone: string;
  /** One weight per catalog category (0–1). From challenges (support) and strengths (amplify). */
  support: CategoryWeights;
  amplify: CategoryWeights;
  /** Natal layer only: what never changes. */
  natal: { support: CategoryWeights; amplify: CategoryWeights };
  /** Chapter layer only: the current period. */
  chapter: { support: CategoryWeights; amplify: CategoryWeights; lord: Planet; subLord: Planet; until: string };
  dayTempo: DayTempo;
  windows: { slot: Slot; tempo: DayTempo }[];
  reasons: Reason[];
  facts: ChartFacts;
  /** The deeper chart reading the day arcs use (dayArc.ts). */
  arc?: ArcFacts;
  versions: { signals: string; rulebook: string };
}

const PLANETS: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

/** UTC offset (minutes) of `timeZone` at instant `t`. */
function offsetMinutes(timeZone: string, t: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(t));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return Math.round((asUtc - t) / 60_000);
}

/** The instant of local noon on `date` in `timeZone`. */
export function localNoon(date: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 12);
  let tz = 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    tz = timeZone;
  } catch {
    /* unknown zone: UTC */
  }
  return new Date(guess - offsetMinutes(tz, guess) * 60_000);
}

export function birthInstant(p: BirthProfile): Date {
  const [y, mo, d] = p.birthDate.split('-').map(Number);
  const [h, mi] = (p.timeUnknown ? '12:00' : p.birthTime).split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0) - p.tzOffsetHours * 3_600_000);
}

const SADE: Record<string, ChartFacts['chapter']['sadeSati']> = {
  None: 'none',
  'Rising (1st phase)': 'rising',
  'Peak (2nd phase)': 'peak',
  'Setting (3rd phase)': 'setting',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The chart reduced to the facts the rulebook reads. */
export function chartFacts(chart: ComprehensiveKundliResult, noon: Date, timeUnknown: boolean): ChartFacts {
  const planets = Object.fromEntries(
    PLANETS.map((p) => {
      const c = planetCondition(chart, p);
      return [p, { level: c.level, house: c.house }];
    })
  ) as ChartFacts['planets'];
  const areas = Object.fromEntries(allAreas(chart).map((a) => [a.house, { points: a.points, level: a.level }]));
  const { mahadasha, antardasha } = chart.dasha.currentDasha;
  const sky = calculatePlanetaryPositions(noon, chart.ascendant.sign.index);
  const saturnFromMoon = ((sky.Saturn.sign.index - chart.planets.Moon.sign.index + 12) % 12) + 1;
  const tone = calculateGocharaTransits(chart, noon).generalTransitTone;
  const day = dayInsight(chart, noon, tone);
  return {
    planets,
    areas,
    timeUnknown,
    chapter: {
      lord: mahadasha.lord as Planet,
      subLord: antardasha.lord as Planet,
      support: chapterInsight(chart, mahadasha).support,
      until: iso(antardasha.endDate),
      sadeSati: SADE[chart.doshas.sadeSati.phase] ?? 'none',
      saturnFromMoon,
    },
    day: { score: day.score, taraGood: day.taraGood, chandraGood: day.chandraGood, moonNakshatra: day.moonNakshatra },
  };
}

const NODE_STRENGTH: Record<string, number> = { strong: 1.4, good: 1.2, average: 1, low: 0.8 };

/** The chart in the depth the day arcs read: strengths, Moon station, elements, period lords, today. */
export function arcFacts(chart: ComprehensiveKundliResult, noon: Date, date: string, facts: ChartFacts): ArcFacts {
  const sb = chart.shadbala as Record<string, { strengthRatio?: number } | undefined>;
  const planets = Object.fromEntries(
    PLANETS.map((p) => {
      const pos = chart.planets[p];
      const ratio = sb?.[p]?.strengthRatio;
      return [
        p,
        {
          level: facts.planets[p].level,
          strength: Math.round((typeof ratio === 'number' && Number.isFinite(ratio) ? ratio : NODE_STRENGTH[facts.planets[p].level]) * 1000) / 1000,
          house: pos.house,
          dignity: pos.dignity,
          retro: !!pos.isRetrograde,
          lon: Math.round(pos.siderealLongitude * 1000) / 1000,
        },
      ];
    })
  ) as ArcFacts['planets'];
  const moon = chart.planets.Moon.nakshatra;
  const sky = calculatePlanetaryPositions(noon, chart.ascendant.sign.index);
  const elong = (((sky.Moon.siderealLongitude - sky.Sun.siderealLongitude) % 360) + 360) % 360;
  const [y, m, d] = date.split('-').map(Number);
  const cd = chart.dasha.currentDasha;
  return {
    planets,
    ascLord: chart.ascendant.sign.lord as Planet,
    ascElement: chart.ascendant.sign.element,
    moon: { nakshatra: moon.name, lord: moon.lord as Planet, gana: moon.gana, nadi: moon.nadi, pada: chart.planets.Moon.nakshatraPada },
    elements: { ...chart.elementBalance },
    // Without a birth time the houses are not reliable, so the arcs ignore them.
    areas: facts.timeUnknown ? {} : Object.fromEntries(Object.entries(facts.areas).map(([h, a]) => [Number(h), a.level])),
    timeUnknown: facts.timeUnknown,
    dasha: { maha: cd.mahadasha.lord as Planet, antar: cd.antardasha.lord as Planet, pratyantar: (cd.pratyantardasha?.lord as Planet | undefined) ?? null },
    sadeSati: facts.chapter.sadeSati,
    chapterSupport: facts.chapter.support,
    chapterUntil: facts.chapter.until,
    today: {
      date,
      vara: WEEKDAY_LORD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      moonNakshatra: sky.Moon.nakshatra.name,
      moonLord: sky.Moon.nakshatra.lord as Planet,
      moonLon: Math.round(sky.Moon.siderealLongitude * 1000) / 1000,
      waxing: elong < 180,
      score: facts.day.score,
    },
  };
}

/** Signals for one birth profile on one local day. Pure and deterministic. */
export function computeSignals(profile: BirthProfile, date: string, timeZone: string): SoundSignals {
  const noon = localNoon(date, timeZone);
  const chart = calculateJanamKundli({
    date: birthInstant(profile),
    latitude: profile.lat,
    longitude: profile.lon,
    timezone: profile.tzOffsetHours,
    targetDate: noon,
  });
  const facts = chartFacts(chart, noon, profile.timeUnknown);
  const signals = signalsFromFacts(facts, { profileId: profile.id, profileVersion: profile.version, date, timeZone });
  return { ...signals, arc: arcFacts(chart, noon, date, facts) };
}

/** The rulebook half of computeSignals, split out so it can be tested on hand-made facts. */
export function signalsFromFacts(
  facts: ChartFacts,
  meta: { profileId: string; profileVersion: number; date: string; timeZone: string }
): SoundSignals {
  const all = applyRules(facts);
  const natal = applyRules(facts, ['natal']);
  const chapter = applyRules(facts, ['chapter']);
  const tempo = dayTempo(facts.day);
  return {
    ...meta,
    support: all.support,
    amplify: all.amplify,
    natal: { support: natal.support, amplify: natal.amplify },
    chapter: { support: chapter.support, amplify: chapter.amplify, lord: facts.chapter.lord, subLord: facts.chapter.subLord, until: facts.chapter.until },
    dayTempo: tempo,
    windows: (['morning', 'midday', 'evening'] as const).map((slot) => ({ slot, tempo: slotTempo(tempo, slot) })),
    reasons: all.reasons,
    facts,
    versions: { signals: SIGNALS_VERSION, rulebook: RULEBOOK_VERSION },
  };
}
