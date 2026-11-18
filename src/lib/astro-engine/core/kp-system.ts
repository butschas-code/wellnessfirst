import type { PlanetName, PlanetPosition } from '../types.ts';
import { calculateKP, type KPPosition } from './kp.ts';
import { calculateLahiriAyanamsha, calculateAyanamsha } from './ayanamsha.ts';
import { earthTilt, localSiderealDegrees, norm360 } from './precision.ts';
import { calculatePlanetaryPositions } from './ephemeris.ts';
import { calculateAscendant } from './ascendant.ts';
import { ZODIAC_SIGNS } from './constants.ts';
import { calculateSolarDay } from '../panchang/solar-day.ts';

/**
 * Krishnamurti Paddhati (KP):
 *  - Placidus house cusps (KP uses Placidus with the KP ayanamsha)
 *  - Cusp sign/star/sub/sub-sub lords
 *  - Four-level significators per house and the houses each planet signifies
 *  - Ruling planets for any moment and place
 */

const D = Math.PI / 180;

export interface KPCusp {
  house: number;
  longitude: number;
  sign: string;
  kp: KPPosition;
}

/** Placidus cusps (sidereal), iterating the semi-arc trisection for houses 11, 12, 2, 3. */
export function placidusCusps(date: Date, latitude: number, longitude: number, ayanamsha = calculateLahiriAyanamsha(date)): number[] {
  const tilt = earthTilt(date);
  const eps = tilt.trueObliquity * D;
  const phi = latitude * D;
  const ramc = localSiderealDegrees(date, longitude);
  const eclFromRA = (ra: number) => norm360(Math.atan2(Math.sin(ra * D), Math.cos(ra * D) * Math.cos(eps)) / D);
  const decOf = (lam: number) => Math.asin(Math.sin(eps) * Math.sin(lam * D));
  const semiArc = (lam: number) => {
    const x = -Math.tan(phi) * Math.tan(decOf(lam));
    return Math.acos(Math.max(-1, Math.min(1, x))) / D; // diurnal semi-arc, degrees
  };
  const solve = (f: number, above: boolean) => {
    let ra = norm360(ramc + (above ? 90 * f : 180 - 90 * f));
    for (let i = 0; i < 50; i++) {
      const lam = eclFromRA(ra);
      const dsa = semiArc(lam);
      const next = above ? norm360(ramc + f * dsa) : norm360(ramc + 180 - f * (180 - dsa));
      if (Math.abs(((next - ra + 540) % 360) - 180) < 1e-9) break;
      ra = next;
    }
    return eclFromRA(ra);
  };

  // Ascendant and MC (tropical, true equinox)
  const ramcR = ramc * D;
  const asc = norm360(Math.atan2(Math.cos(ramcR), -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / D);
  const mc = eclFromRA(ramc);

  const trop: number[] = new Array(12);
  trop[0] = asc;
  trop[9] = mc;
  trop[10] = solve(1 / 3, true);
  trop[11] = solve(2 / 3, true);
  trop[1] = solve(2 / 3, false); // 2nd: 1/3 of nocturnal arc below the horizon
  trop[2] = solve(1 / 3, false); // 3rd
  for (const i of [0, 1, 2, 9, 10, 11]) trop[(i + 6) % 12] = norm360(trop[i] + 180);
  return trop.map((l) => norm360(l - tilt.dpsi - ayanamsha));
}

export interface KPSignificators {
  house: number;
  /** Level 1 (strongest): planets in the star of the occupants. */
  starOfOccupants: PlanetName[];
  /** Level 2: occupants. */
  occupants: PlanetName[];
  /** Level 3: planets in the star of the cusp's sign lord. */
  starOfOwner: PlanetName[];
  /** Level 4: cusp's sign lord. */
  owner: PlanetName;
}

export interface KPAnalysis {
  ayanamsha: number;
  cusps: KPCusp[];
  /** House (1–12) each planet occupies by Placidus cusps. */
  placidusHouse: Record<PlanetName, number>;
  planetKP: Record<PlanetName, KPPosition>;
  significators: KPSignificators[];
  /** Houses each planet signifies (union of all four levels). */
  planetSignifies: Record<PlanetName, number[]>;
}

const ALL: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export function calculateKPAnalysis(
  date: Date,
  latitude: number,
  longitude: number,
  planets: Record<PlanetName, PlanetPosition>
): KPAnalysis {
  // KP uses its own ayanamsha; shift the Lahiri-based planet longitudes accordingly.
  const kpAyan = calculateAyanamsha(date, 'KP');
  const shift = calculateLahiriAyanamsha(date) - kpAyan;
  const cuspL = placidusCusps(date, latitude, longitude, kpAyan);
  const cusps = cuspL.map((l, i) => ({ house: i + 1, longitude: l, sign: ZODIAC_SIGNS[Math.floor(l / 30)].name, kp: calculateKP(l) }));

  const planetL = Object.fromEntries(ALL.map((p) => [p, norm360(planets[p].siderealLongitude + shift)])) as Record<PlanetName, number>;
  const planetKP = Object.fromEntries(ALL.map((p) => [p, calculateKP(planetL[p])])) as Record<PlanetName, KPPosition>;

  const inHouse = (L: number) => {
    for (let i = 0; i < 12; i++) {
      const a = cuspL[i], b = cuspL[(i + 1) % 12];
      const span = norm360(b - a);
      if (norm360(L - a) < span) return i + 1;
    }
    return 1;
  };
  const placidusHouse = Object.fromEntries(ALL.map((p) => [p, inHouse(planetL[p])])) as Record<PlanetName, number>;
  const starLord = (p: PlanetName) => planetKP[p].starLord;

  const significators: KPSignificators[] = cusps.map((c) => {
    const occupants = ALL.filter((p) => placidusHouse[p] === c.house);
    const owner = ZODIAC_SIGNS[Math.floor(c.longitude / 30)].lord;
    return {
      house: c.house,
      starOfOccupants: ALL.filter((p) => occupants.includes(starLord(p))),
      occupants,
      starOfOwner: ALL.filter((p) => starLord(p) === owner),
      owner,
    };
  });

  const planetSignifies = Object.fromEntries(
    ALL.map((p) => [
      p,
      significators
        .filter((s) => s.starOfOccupants.includes(p) || s.occupants.includes(p) || s.starOfOwner.includes(p) || s.owner === p)
        .map((s) => s.house),
    ])
  ) as Record<PlanetName, number[]>;

  return { ayanamsha: kpAyan, cusps, placidusHouse, planetKP, significators, planetSignifies };
}

export interface RulingPlanets {
  at: Date;
  dayLord: PlanetName;
  lagnaSignLord: PlanetName;
  lagnaStarLord: PlanetName;
  lagnaSubLord: PlanetName;
  moonSignLord: PlanetName;
  moonStarLord: PlanetName;
  moonSubLord: PlanetName;
  /** De-duplicated, in classical order of strength. */
  ordered: PlanetName[];
}

const WEEKDAY_LORD: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/** KP ruling planets for a moment and place (day lord is sunrise-based). */
export function calculateRulingPlanets(at: Date, latitude: number, longitude: number, timeZone = 'UTC'): RulingPlanets {
  const kpShift = calculateLahiriAyanamsha(at) - calculateAyanamsha(at, 'KP');
  const asc = calculateAscendant(at, latitude, longitude);
  const moon = calculatePlanetaryPositions(at, asc.sign.index).Moon;
  const aKP = calculateKP(norm360(asc.siderealLongitude + kpShift));
  const mKP = calculateKP(norm360(moon.siderealLongitude + kpShift));
  const dayLord = WEEKDAY_LORD[calculateSolarDay(at, latitude, longitude, timeZone).weekday];
  const ordered = [...new Set<PlanetName>([aKP.subLord, aKP.starLord, aKP.signLord, mKP.starLord, mKP.signLord, dayLord])];
  return {
    at,
    dayLord,
    lagnaSignLord: aKP.signLord,
    lagnaStarLord: aKP.starLord,
    lagnaSubLord: aKP.subLord,
    moonSignLord: mKP.signLord,
    moonStarLord: mKP.starLord,
    moonSubLord: mKP.subLord,
    ordered,
  };
}
