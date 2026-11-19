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

/** What a planet entering one of your life areas means in practice — no planet names (those go to Pro). */
const ENTERS: Partial<Record<PlanetName, { stay: string; title: string; text: (shows: string) => string }>> = {
  Sun: { stay: 'about a month', title: 'in the spotlight', text: (x) => `For about a month, ${x} move into the spotlight. Good time to take charge here, make decisions and be seen — just don’t make it all about being right.` },
  Mercury: { stay: 'about three weeks', title: 'time to talk it through', text: (x) => `For about three weeks, this is the best time to plan, write, negotiate and sort out the details around ${x}. Have the conversations and get things on paper.` },
  Venus: { stay: 'about four weeks', title: 'a smoother, friendlier stretch', text: (x) => `For about four weeks, things go more easily and pleasantly around ${x}. Good for agreements, making up, asking for favours and spending on quality.` },
  Mars: { stay: 'about six weeks', title: 'more drive — and more friction', text: (x) => `For about six weeks, you get extra energy around ${x}, but also more friction. Push forward on what matters, and watch your temper.` },
  Jupiter: { stay: 'about a year', title: 'a year of growth', text: (x) => `For about a year, growth and opportunity favour ${x}. Say yes to openings here, learn, and think bigger.` },
  Saturn: { stay: 'about two and a half years', title: 'a long, serious stretch', text: (x) => `For about two and a half years, ${x} ask for patience, structure and commitment. What you build here slowly will last.` },
};
const RETRO: Partial<Record<PlanetName, { title: string; text: (shows: string) => string; back: string }>> = {
  Mercury: { title: 'Double-check everything', text: () => 'For about three weeks, misunderstandings, delays and tech glitches are more likely. Re-read messages and contracts, back up your data, allow extra time for travel — revise and finish rather than launch.', back: 'Communication runs smoothly again — a good moment to send what you held back.' },
  Venus: { title: 'Revisit rather than start', text: (x) => `For about six weeks, rethink relationships and spending around ${x} rather than starting new ones. Old contacts may come back.`, back: 'Relationships and money decisions get clearer again.' },
  Mars: { title: 'Finish, don’t start fights', text: (x) => `For about two months, energy around ${x} turns inward. Finish projects and avoid new conflicts or risky starts.`, back: 'Your drive comes back — projects that stalled can move.' },
  Jupiter: { title: 'Growth slows for a while', text: (x) => `For about four months, growth around ${x} slows down. Review your plans and consolidate rather than expand.`, back: 'Growth picks up again — time to act on what you reviewed.' },
  Saturn: { title: 'Review your commitments', text: (x) => `For about four months, take stock of commitments and structures around ${x}. Tidy up what isn’t working.`, back: 'Things that stalled can move again — follow through on what you decided.' },
};

export interface Shift {
  date: Date;
  planet: PlanetName;
  kind: 'sign' | 'retro' | 'direct';
  /** Plain headline, e.g. "Money & savings: a smoother, friendlier stretch". */
  title: string;
  text: string;
  action?: string;
  /** Technical basis for Pro view. */
  pro: string;
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
      const h = ((b.sign.index - asc + 12) % 12) + 1;
      const shows = AREA_PLAYBOOK[h].shows;
      const name = LIFE_AREA[h].name;
      if (a.sign.index !== b.sign.index && ENTERS[p]) {
        const e = ENTERS[p]!;
        out.push({
          date, planet: p, kind: 'sign', title: `${name}: ${e.title}`, text: e.text(shows), action: AREA_PLAYBOOK[h].act[0],
          pro: `${p} enters ${b.sign.name} (your ${I.ORD(h)} house from the Lagna) for ${e.stay}.`,
        });
      }
      if (!a.isRetrograde && b.isRetrograde && RETRO[p]) {
        out.push({ date, planet: p, kind: 'retro', title: RETRO[p]!.title, text: RETRO[p]!.text(shows), pro: `${p} stations retrograde in ${b.sign.name} (your ${I.ORD(h)} house).` });
      }
      if (a.isRetrograde && !b.isRetrograde && RETRO[p]) {
        out.push({ date, planet: p, kind: 'direct', title: `${name}: moving again`, text: RETRO[p]!.back, pro: `${p} stations direct in ${b.sign.name} (your ${I.ORD(h)} house).` });
      }
    }
    prev = cur;
  }
  return out;
}
