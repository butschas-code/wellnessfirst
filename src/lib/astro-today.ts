/**
 * Life Rhythm — what changes day to day: the Moon's nakshatra for today, a seven-day outlook,
 * and planetary shifts (sign changes, retrograde stations) over the coming weeks.
 */
import type { ComprehensiveKundliResult, PlanetName } from './astro-engine/types.ts';
import { calculatePanchang } from './astro-engine/panchang/panchang.ts';
import { calculatePlanetaryPositions } from './astro-engine/core/ephemeris.ts';
import { calculateGocharaTransits } from './astro-engine/predictive/transits.ts';
import * as I from './astro-insights.ts';
import { AREA_PLAYBOOK, LIFE_AREA } from './astro-content.ts';

/** Classical nakshatra groups (Muhurta Chintamani) in plain, practical terms. */
const NAK_GROUPS: Array<{ naks: string[]; name: string; good: string[]; avoid: string[] }> = [
  { naks: ['Rohini', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada'], name: 'a steady, “fixed” day', good: ['Starting things meant to last: a habit, a savings plan, a long project', 'Signing long-term agreements, moving into a home', 'Planting, building, laying foundations'], avoid: ['Quick, throwaway decisions', 'Travel you could postpone'] },
  { naks: ['Punarvasu', 'Swati', 'Shravana', 'Dhanishta', 'Shatabhisha'], name: 'a “moving” day', good: ['Travel, errands and getting around', 'Changes: switching tools, rearranging, trying something new', 'Learning and listening'], avoid: ['Locking in permanent commitments'] },
  { naks: ['Ashwini', 'Pushya', 'Hasta'], name: 'a “quick” day', good: ['Fast tasks you can finish today', 'Selling, trading, practical deals', 'Learning a skill, health check-ups, starting treatment'], avoid: ['Dragging out decisions'] },
  { naks: ['Mrigashira', 'Chitra', 'Anuradha', 'Revati'], name: 'a “soft” day', good: ['Friendships, dates and making up', 'Creative and design work, music, clothes', 'Gentle conversations and favours'], avoid: ['Confrontation and hard negotiations'] },
  { naks: ['Krittika', 'Vishakha'], name: 'a “mixed” day', good: ['Routine work and everyday duties', 'Cooking, cleaning, maintenance', 'Finishing what is already in progress'], avoid: ['Launching anything important'] },
  { naks: ['Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'], name: 'a “sharp” day', good: ['Research, analysis and getting to the root of a problem', 'Ending what has run its course, decisive cuts', 'Hard conversations that need honesty'], avoid: ['Delicate talks, new partnerships and celebrations'] },
  { naks: ['Bharani', 'Magha', 'Purva Phalguni', 'Purva Ashadha', 'Purva Bhadrapada'], name: 'a “fierce” day', good: ['Tough, demanding tasks that need force', 'Competition, sport, standing your ground', 'Clearing backlogs'], avoid: ['New beginnings, signing and big purchases'] },
];

export function nakshatraDay(name: string) {
  return NAK_GROUPS.find((g) => g.naks.includes(name)) ?? NAK_GROUPS[4];
}

/** What each weekday (by its planetary ruler) is naturally good for. */
const WEEKDAY_FOR: Record<string, string> = {
  Sun: 'leadership, visibility and decisions',
  Moon: 'people, home and care',
  Mars: 'action, sport and tough tasks',
  Mercury: 'paperwork, writing and negotiation',
  Jupiter: 'learning, advice and big-picture planning',
  Venus: 'relationships, creativity and pleasure',
  Saturn: 'routine, clearing and long-term work',
};

export interface DayOutlook {
  date: Date;
  score: number;
  level: 'good' | 'steady' | 'light';
  goodFor: string;
  nakshatra: string;
  nakshatraKind: string;
  taraGood: boolean;
}

export function weekAhead(chart: ComprehensiveKundliResult, from: Date, place: { latitude: number; longitude: number; timeZone: string }): DayOutlook[] {
  const out: DayOutlook[] = [];
  for (let i = 0; i < 7; i++) {
    // Midday of each calendar day, so the day's Moon and weekday are representative.
    const d = new Date(from.getTime() + i * 86_400_000);
    const noon = new Date(d.toLocaleDateString('en-CA', { timeZone: place.timeZone }) + 'T12:00:00Z');
    const p = calculatePanchang(noon, place.latitude, place.longitude, place.timeZone);
    const day = I.dayInsight(chart, noon, calculateGocharaTransits(chart, noon).generalTransitTone);
    out.push({
      date: noon,
      score: day.score,
      level: day.level,
      goodFor: WEEKDAY_FOR[p.vara.lord] ?? 'steady work',
      nakshatra: p.nakshatra.name,
      nakshatraKind: nakshatraDay(p.nakshatra.name).name,
      taraGood: day.taraGood,
    });
  }
  return out;
}

const RETRO: Partial<Record<PlanetName, string>> = {
  Mercury: 'double-check messages, contracts and travel plans. Good for revising and finishing, less so for launching.',
  Venus: 'revisit relationships and spending rather than starting new ones.',
  Mars: 'energy turns inward — finish projects rather than starting new fights or ventures.',
  Jupiter: 'review your growth plans and beliefs rather than expanding.',
  Saturn: 'review commitments and structures; tidy up what isn’t working.',
};
const STAY: Partial<Record<PlanetName, string>> = {
  Sun: 'about a month',
  Mercury: 'about three weeks',
  Venus: 'about four weeks',
  Mars: 'about six weeks',
  Jupiter: 'about a year',
  Saturn: 'about two and a half years',
};

export interface Shift {
  date: Date;
  planet: PlanetName;
  kind: 'sign' | 'retro' | 'direct';
  text: string;
  action?: string;
}

/** Sign changes and retrograde stations of the visible planets over the next `days` days. */
export function upcomingShifts(chart: ComprehensiveKundliResult, from: Date, days = 45): Shift[] {
  const asc = chart.ascendant.sign.index;
  const watch: PlanetName[] = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const out: Shift[] = [];
  let prev = calculatePlanetaryPositions(from, asc);
  for (let d = 1; d <= days; d++) {
    const date = new Date(from.getTime() + d * 86_400_000);
    const cur = calculatePlanetaryPositions(date, asc);
    for (const p of watch) {
      const a = prev[p], b = cur[p];
      if (a.sign.index !== b.sign.index) {
        const h = ((b.sign.index - asc + 12) % 12) + 1;
        out.push({
          date, planet: p, kind: 'sign',
          text: `${I.pname(p).replace(/^the/, 'The')} moves into your area of ${LIFE_AREA[h].name.toLowerCase()} for ${STAY[p]}, bringing ${I.PLANET_NATURE[p].brings} to ${AREA_PLAYBOOK[h].shows}.`,
          action: AREA_PLAYBOOK[h].act[0],
        });
      }
      if (!a.isRetrograde && b.isRetrograde && RETRO[p]) out.push({ date, planet: p, kind: 'retro', text: `${p} turns retrograde (it appears to move backwards for a while): ${RETRO[p]}` });
      if (a.isRetrograde && !b.isRetrograde && RETRO[p]) out.push({ date, planet: p, kind: 'direct', text: `${p} moves forward again — what stalled in its area can move now.` });
    }
    prev = cur;
  }
  return out;
}
