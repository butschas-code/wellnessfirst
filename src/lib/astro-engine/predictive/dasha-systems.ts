import type { ComprehensiveKundliResult, PlanetName } from '../types.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';

/**
 * Additional dasha systems: Yogini (36y), Ashtottari (108y) and Jaimini Chara (sign-based).
 * All follow the classical convention that the first period began before birth, so every
 * sub-period keeps its full classical length.
 */

const MS_PER_YEAR = 365.2425 * 86_400_000;
const NAK_SPAN = 360 / 27;

export interface GenericPeriod {
  /** Planet name for nakshatra systems; sign name for Chara. */
  label: string;
  lord?: PlanetName;
  start: Date;
  end: Date;
  years: number;
  subs?: GenericPeriod[];
}

export interface DashaSystemResult {
  system: 'Yogini' | 'Ashtottari' | 'Chara';
  periods: GenericPeriod[];
  current: { main: GenericPeriod; sub?: GenericPeriod };
  /** Classical applicability note (e.g. Ashtottari conditions). */
  note?: string;
  applicable?: boolean;
}

function findCurrent(periods: GenericPeriod[], at: Date) {
  const main = periods.find((p) => at >= p.start && at < p.end) ?? periods[periods.length - 1];
  const sub = main.subs?.find((p) => at >= p.start && at < p.end);
  return { main, sub };
}

/** Build a nakshatra-based cycle with proportional sub-periods. */
function buildCycle(
  seq: Array<{ label: string; lord: PlanetName; years: number }>,
  total: number,
  startIdx: number,
  elapsedYears: number,
  birth: Date,
  spanYears: number
): GenericPeriod[] {
  const out: GenericPeriod[] = [];
  let t = birth.getTime() - elapsedYears * MS_PER_YEAR;
  const end = birth.getTime() + spanYears * MS_PER_YEAR;
  for (let i = 0; t < end; i++) {
    const it = seq[(startIdx + i) % seq.length];
    const s = t;
    const e = s + it.years * MS_PER_YEAR;
    const subs: GenericPeriod[] = [];
    let st = s;
    for (let j = 0; j < seq.length; j++) {
      const sj = seq[(startIdx + i + j) % seq.length];
      const y = (it.years * sj.years) / total;
      subs.push({ label: sj.label, lord: sj.lord, start: new Date(st), end: new Date(st + y * MS_PER_YEAR), years: y });
      st += y * MS_PER_YEAR;
    }
    out.push({ label: it.label, lord: it.lord, start: new Date(s), end: new Date(e), years: it.years, subs });
    t = e;
  }
  return out;
}

/* ═══════════ Yogini ═══════════ */

const YOGINI = [
  { label: 'Mangala', lord: 'Moon' as PlanetName, years: 1 },
  { label: 'Pingala', lord: 'Sun' as PlanetName, years: 2 },
  { label: 'Dhanya', lord: 'Jupiter' as PlanetName, years: 3 },
  { label: 'Bhramari', lord: 'Mars' as PlanetName, years: 4 },
  { label: 'Bhadrika', lord: 'Mercury' as PlanetName, years: 5 },
  { label: 'Ulka', lord: 'Saturn' as PlanetName, years: 6 },
  { label: 'Siddha', lord: 'Venus' as PlanetName, years: 7 },
  { label: 'Sankata', lord: 'Rahu' as PlanetName, years: 8 },
];

export function calculateYoginiDasha(chart: ComprehensiveKundliResult, at: Date = new Date()): DashaSystemResult {
  const moonL = chart.planets.Moon.siderealLongitude;
  const nak = Math.floor(moonL / NAK_SPAN); // 0..26
  const frac = (moonL - nak * NAK_SPAN) / NAK_SPAN;
  // (nakshatra number + 3) mod 8, remainder 0 → 8th yogini
  const r = (nak + 1 + 3) % 8;
  const idx = (r === 0 ? 8 : r) - 1;
  const elapsed = YOGINI[idx].years * frac;
  const periods = buildCycle(YOGINI, 36, idx, elapsed, chart.birthDetails.date, 110);
  return { system: 'Yogini', periods, current: findCurrent(periods, at), applicable: true };
}

/* ═══════════ Ashtottari ═══════════ */

const ASHTOTTARI = [
  { label: 'Sun', lord: 'Sun' as PlanetName, years: 6, naks: [5, 6, 7, 8] }, // Ardra–Ashlesha
  { label: 'Moon', lord: 'Moon' as PlanetName, years: 15, naks: [9, 10, 11] }, // Magha–U.Phalguni
  { label: 'Mars', lord: 'Mars' as PlanetName, years: 8, naks: [12, 13, 14, 15] }, // Hasta–Vishakha
  { label: 'Mercury', lord: 'Mercury' as PlanetName, years: 17, naks: [16, 17, 18] }, // Anuradha–Mula
  { label: 'Saturn', lord: 'Saturn' as PlanetName, years: 10, naks: [19, 20, 21] }, // P.Ashadha–Shravana (Abhijit within)
  { label: 'Jupiter', lord: 'Jupiter' as PlanetName, years: 19, naks: [22, 23, 24] }, // Dhanishta–P.Bhadrapada
  { label: 'Rahu', lord: 'Rahu' as PlanetName, years: 12, naks: [25, 26, 0, 1] }, // U.Bhadrapada–Bharani
  { label: 'Venus', lord: 'Venus' as PlanetName, years: 21, naks: [2, 3, 4] }, // Krittika–Mrigashira
];

export function calculateAshtottariDasha(chart: ComprehensiveKundliResult, at: Date = new Date()): DashaSystemResult {
  const moonL = chart.planets.Moon.siderealLongitude;
  const nak = Math.floor(moonL / NAK_SPAN);
  const frac = (moonL - nak * NAK_SPAN) / NAK_SPAN;
  const idx = ASHTOTTARI.findIndex((g) => g.naks.includes(nak));
  const g = ASHTOTTARI[idx];
  const k = g.naks.indexOf(nak);
  const elapsed = g.years * ((k + frac) / g.naks.length);
  const periods = buildCycle(ASHTOTTARI, 108, idx, elapsed, chart.birthDetails.date, 110);

  // Classical condition: Rahu in a kendra or trikona from the Lagna lord (not in Lagna itself).
  const lagnaLord = chart.ascendant.sign.lord;
  const fromLL = ((chart.planets.Rahu.sign.index - chart.planets[lagnaLord].sign.index + 12) % 12) + 1;
  const applicable = [1, 4, 5, 7, 9, 10].includes(fromLL) && chart.planets.Rahu.house !== 1;
  return {
    system: 'Ashtottari',
    periods,
    current: findCurrent(periods, at),
    applicable,
    note: applicable
      ? 'Applicable: Rahu is in a kendra/trikona from the Lagna lord.'
      : 'Shown for reference: the classical condition (Rahu in kendra/trikona from the Lagna lord, not in Lagna) is not met.',
  };
}

/* ═══════════ Jaimini Chara (K. N. Rao method) ═══════════ */

const SAVYA = new Set([0, 1, 2, 6, 7, 8]); // Aries, Taurus, Gemini, Libra, Scorpio, Sagittarius

export function calculateCharaDasha(chart: ComprehensiveKundliResult, at: Date = new Date()): DashaSystemResult {
  const lagna = chart.ascendant.sign.index;
  const signOf = (p: PlanetName) => chart.planets[p].sign.index;
  const occupants = (s: number) => (Object.keys(chart.planets) as PlanetName[]).filter((p) => signOf(p) === s).length;

  const lordOf = (s: number): PlanetName => {
    // Dual lordship: Scorpio (Mars/Ketu), Aquarius (Saturn/Rahu) — the stronger: more company, else the one not in the sign itself.
    if (s === 7 || s === 10) {
      const [a, b] = s === 7 ? (['Mars', 'Ketu'] as PlanetName[]) : (['Saturn', 'Rahu'] as PlanetName[]);
      if (signOf(a) === s && signOf(b) !== s) return b;
      if (signOf(b) === s && signOf(a) !== s) return a;
      return occupants(signOf(b)) > occupants(signOf(a)) ? b : a;
    }
    return ZODIAC_SIGNS[s].lord;
  };

  const yearsOf = (s: number) => {
    const lord = lordOf(s);
    const ls = signOf(lord);
    if (ls === s) return 12;
    const count = SAVYA.has(s) ? ((ls - s + 12) % 12) + 1 : ((s - ls + 12) % 12) + 1;
    const y = count - 1;
    return y === 0 ? 12 : y;
  };

  const direct = SAVYA.has((lagna + 8) % 12); // 9th from Lagna decides the direction
  const order = Array.from({ length: 12 }, (_, i) => (direct ? (lagna + i) % 12 : (lagna - i + 12) % 12));
  const first = order.map((s) => ({ s, y: yearsOf(s) }));
  const second = order.map((s, i) => ({ s, y: 12 - first[i].y })).filter((x) => x.y > 0);

  const periods: GenericPeriod[] = [];
  let t = chart.birthDetails.date.getTime();
  for (const { s, y } of [...first, ...second]) {
    const start = t;
    const end = start + y * MS_PER_YEAR;
    const subs: GenericPeriod[] = [];
    const subDirect = SAVYA.has(s);
    for (let j = 1; j <= 12; j++) {
      const ss = subDirect ? (s + j) % 12 : (s - j + 12) % 12;
      const a = start + ((j - 1) * (end - start)) / 12;
      subs.push({ label: ZODIAC_SIGNS[ss].name, start: new Date(a), end: new Date(a + (end - start) / 12), years: y / 12 });
    }
    periods.push({ label: ZODIAC_SIGNS[s].name, start: new Date(start), end: new Date(end), years: y, subs });
    t = end;
  }
  return {
    system: 'Chara',
    periods,
    current: findCurrent(periods, at),
    applicable: true,
    note: `Sign-based; ${direct ? 'zodiacal' : 'reverse'} order from Lagna (9th from Lagna ${direct ? 'savya' : 'apasavya'}).`,
  };
}
