import * as Astronomy from 'astronomy-engine';
import type { ComprehensiveKundliResult, PlanetName, AscendantInfo, PlanetPosition } from '../types.ts';
import { calculateAscendant } from '../core/ascendant.ts';
import { calculatePlanetaryPositions } from '../core/ephemeris.ts';
import { calculateLahiriAyanamsha } from '../core/ayanamsha.ts';
import { apparentBody, earthTilt, norm360 } from '../core/precision.ts';
import { calculateShadbala } from '../core/shadbala.ts';
import { calculateSolarDay } from '../panchang/solar-day.ts';
import { ZODIAC_SIGNS, VIMSHOTTARI_DASHA_CYCLE } from '../core/constants.ts';

/**
 * Varshaphal (Tajika annual chart).
 *  - Varsha Pravesha: the instant the Sun returns to its exact natal sidereal longitude.
 *  - Muntha: natal Lagna advanced one sign per completed year.
 *  - Varsheshvara (year lord): strongest of the five office-bearers (Pancha-adhikari) that aspects the
 *    annual Lagna by a Tajika aspect (all but the 2/6/8/12 relationships).
 *  - Mudda dasha: Vimshottari compressed into one solar year.
 */

export interface MuddaPeriod {
  lord: PlanetName;
  start: Date;
  end: Date;
  days: number;
}

export interface VarshaphalResult {
  age: number;
  pravesha: Date;
  ascendant: AscendantInfo;
  planets: Record<PlanetName, PlanetPosition>;
  muntha: { signIndex: number; sign: string; house: number; lord: PlanetName };
  candidates: Array<{ role: string; planet: PlanetName; aspectsLagna: boolean; strength: number }>;
  yearLord: PlanetName;
  mudda: MuddaPeriod[];
  currentMudda?: MuddaPeriod;
}

const DAY = 86_400_000;

function sunSidereal(date: Date): number {
  return norm360(apparentBody(Astronomy.Body.Sun, date).longitude - earthTilt(date).dpsi - calculateLahiriAyanamsha(date));
}

/** Find the instant near `guess` when the sidereal Sun equals `target` (Newton iteration). */
export function solarReturn(target: number, guess: Date): Date {
  let t = guess.getTime();
  for (let i = 0; i < 12; i++) {
    let diff = target - sunSidereal(new Date(t));
    diff = ((diff + 540) % 360) - 180;
    if (Math.abs(diff) < 1e-6) break;
    t += (diff / 0.9856) * DAY;
  }
  return new Date(t);
}

// Tri-rashi pati by annual Lagna sign: [day, night]
const TRI_RASHI: PlanetName[][] = [
  ['Sun', 'Jupiter'], ['Venus', 'Moon'], ['Saturn', 'Mercury'], ['Venus', 'Mars'], ['Jupiter', 'Sun'], ['Moon', 'Venus'],
  ['Mercury', 'Saturn'], ['Mars', 'Venus'], ['Saturn', 'Saturn'], ['Mars', 'Mars'], ['Jupiter', 'Jupiter'], ['Moon', 'Moon'],
];

export function calculateVarshaphal(
  natal: ComprehensiveKundliResult,
  at: Date = new Date(),
  place?: { latitude: number; longitude: number }
): VarshaphalResult {
  const birth = natal.birthDetails.date;
  const lat = place?.latitude ?? natal.birthDetails.latitude;
  const lon = place?.longitude ?? natal.birthDetails.longitude;
  const natalSun = natal.planets.Sun.siderealLongitude;

  // Most recent solar return on or before `at`
  let age = Math.floor((at.getTime() - birth.getTime()) / (365.2564 * DAY));
  let pravesha = solarReturn(natalSun, new Date(birth.getTime() + age * 365.2564 * DAY));
  if (pravesha > at) {
    age -= 1;
    pravesha = solarReturn(natalSun, new Date(birth.getTime() + age * 365.2564 * DAY));
  }
  age = Math.max(0, age);

  const ascendant = calculateAscendant(pravesha, lat, lon);
  const planets = calculatePlanetaryPositions(pravesha, ascendant.sign.index);
  const shadbala = calculateShadbala(ascendant, planets, pravesha, { latitude: lat, longitude: lon, timezone: natal.birthDetails.timezone }) as Record<string, any>;

  const munthaIdx = (natal.ascendant.sign.index + age) % 12;
  const muntha = {
    signIndex: munthaIdx,
    sign: ZODIAC_SIGNS[munthaIdx].name,
    house: ((munthaIdx - ascendant.sign.index + 12) % 12) + 1,
    lord: ZODIAC_SIGNS[munthaIdx].lord,
  };

  const solar = calculateSolarDay(pravesha, lat, lon, 'UTC');
  const isDay = pravesha >= solar.sunrise && pravesha < solar.sunset;
  const candidates: Array<{ role: string; planet: PlanetName }> = [
    { role: 'Muntha lord', planet: muntha.lord },
    { role: 'Birth Lagna lord', planet: natal.ascendant.sign.lord },
    { role: 'Annual Lagna lord', planet: ascendant.sign.lord },
    { role: 'Tri-rashi lord', planet: TRI_RASHI[ascendant.sign.index][isDay ? 0 : 1] },
    { role: isDay ? 'Day lord (Sun’s sign)' : 'Night lord (Moon’s sign)', planet: (isDay ? planets.Sun : planets.Moon).sign.lord },
  ];
  const scored = candidates.map((c) => {
    const dist = ((ascendant.sign.index - planets[c.planet].sign.index + 12) % 12) + 1;
    const aspectsLagna = ![2, 6, 8, 12].includes(dist);
    return { ...c, aspectsLagna, strength: shadbala[c.planet]?.strengthRatio ?? 0 };
  });
  const pool = scored.filter((c) => c.aspectsLagna);
  const yearLord = (pool.length ? pool : scored).sort((a, b) => b.strength - a.strength)[0].planet;

  // Mudda dasha: start lord = (Janma nakshatra number + completed years − 2) mod 9, Ketu = 1.
  const nakNo = natal.planets.Moon.nakshatra.index + 1;
  const startIdx = (((nakNo + age - 2) % 9) + 9) % 9;
  const yearLen = solarReturn(natalSun, new Date(pravesha.getTime() + 365.2564 * DAY)).getTime() - pravesha.getTime();
  const mudda: MuddaPeriod[] = [];
  let t = pravesha.getTime();
  for (let i = 0; i < 9; i++) {
    const it = VIMSHOTTARI_DASHA_CYCLE[(startIdx + i) % 9];
    const ms = (it.years / 120) * yearLen;
    mudda.push({ lord: it.lord, start: new Date(t), end: new Date(t + ms), days: ms / DAY });
    t += ms;
  }

  return {
    age,
    pravesha,
    ascendant,
    planets,
    muntha,
    candidates: scored,
    yearLord,
    mudda,
    currentMudda: mudda.find((m) => at >= m.start && at < m.end),
  };
}
