import type { AscendantInfo, PlanetPosition, PlanetName } from '../types.ts';
import { ZODIAC_SIGNS, DIGNITIES_MAP } from './constants.ts';
import { getDivisionalSignIndex, type ShodashvargaId } from './shodashvarga.ts';
import { compoundRelation } from './ephemeris.ts';
import { drishtiValue } from './shadbala.ts';
import { norm360 } from './precision.ts';

/* ═══════════ Vimshopaka Bala (BPHS ch. 7) ═══════════ */

const SCHEMES: Record<string, Partial<Record<ShodashvargaId, number>>> = {
  Shadvarga: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  Saptavarga: { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
  Dashavarga: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  Shodashavarga: { D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4 },
};
const POINTS = { Self: 20, GreatFriend: 18, Friend: 15, Neutral: 10, Enemy: 7, GreatEnemy: 5 } as const;

export interface VimshopakaResult {
  planet: PlanetName;
  shadvarga: number;
  saptavarga: number;
  dashavarga: number;
  shodashavarga: number;
  /** Plain grade of the Shodashavarga score (out of 20). */
  grade: 'excellent' | 'good' | 'average' | 'weak';
}

export function calculateVimshopaka(planets: Record<PlanetName, PlanetPosition>): Record<string, VimshopakaResult> {
  const signOf = (p: PlanetName) => planets[p].sign.index;
  const out: Record<string, VimshopakaResult> = {};
  for (const p of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as PlanetName[]) {
    const L = planets[p].siderealLongitude;
    const exSign = DIGNITIES_MAP[p].exaltation.sign;
    const pointsIn = (v: ShodashvargaId) => {
      const s = ZODIAC_SIGNS[getDivisionalSignIndex(v, L)];
      if (s.lord === p || s.name === exSign) return POINTS.Self;
      return POINTS[compoundRelation(p, s.lord, signOf) as keyof typeof POINTS] ?? POINTS.Neutral;
    };
    const score = (scheme: Partial<Record<ShodashvargaId, number>>) =>
      Math.round(Object.entries(scheme).reduce((sum, [v, w]) => sum + (w! * pointsIn(v as ShodashvargaId)) / 20, 0) * 100) / 100;
    const sh = score(SCHEMES.Shodashavarga);
    out[p] = {
      planet: p,
      shadvarga: score(SCHEMES.Shadvarga),
      saptavarga: score(SCHEMES.Saptavarga),
      dashavarga: score(SCHEMES.Dashavarga),
      shodashavarga: sh,
      grade: sh >= 15 ? 'excellent' : sh >= 12 ? 'good' : sh >= 9 ? 'average' : 'weak',
    };
  }
  return out;
}

/* ═══════════ Bhava Bala (BPHS ch. 27) ═══════════ */

export interface BhavaBalaResult {
  house: number;
  adhipati: number;
  dig: number;
  drishti: number;
  occupation: number;
  totalVirupas: number;
  totalRupas: number;
  rank: number;
}

type SignClass = 'Nara' | 'Jalachara' | 'Keeta' | 'Chatushpada';

/** Sign classification for Bhava Dig Bala; Sagittarius and Capricorn split at 15°. */
function signClass(signIdx: number, deg: number): SignClass {
  switch (signIdx) {
    case 2: case 5: case 6: case 10: return 'Nara';
    case 3: case 11: return 'Jalachara';
    case 7: return 'Keeta';
    case 8: return deg < 15 ? 'Nara' : 'Chatushpada';
    case 9: return deg < 15 ? 'Chatushpada' : 'Jalachara';
    default: return 'Chatushpada'; // Aries, Taurus, Leo
  }
}
const STRONG_HOUSE: Record<SignClass, number> = { Nara: 1, Jalachara: 4, Keeta: 7, Chatushpada: 10 };

export function calculateBhavaBala(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>,
  shadbala: Record<string, { totalVirupas: number }>
): BhavaBalaResult[] {
  const ascL = ascendant.siderealLongitude;
  const moonWaxing = norm360(planets.Moon.siderealLongitude - planets.Sun.siderealLongitude) <= 180;
  const benefic = (p: PlanetName) => p === 'Jupiter' || p === 'Venus' || p === 'Mercury' || (p === 'Moon' && moonWaxing);
  const seven: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  const rows = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const madhya = norm360(ascL + i * 30); // equal-house bhava madhya from the Lagna degree
    const signIdx = Math.floor(madhya / 30);
    const lord = ZODIAC_SIGNS[signIdx].lord;
    const adhipati = shadbala[lord]?.totalVirupas ?? 0;

    const cls = signClass(signIdx, madhya % 30);
    const d = Math.abs(house - STRONG_HOUSE[cls]);
    const dist = Math.min(d, 12 - d); // 0..6 houses
    const dig = (6 - dist) * 10;

    let drishti = 0;
    for (const p of seven) {
      const v = drishtiValue(p, planets[p].siderealLongitude, madhya);
      // Jupiter's and Mercury's aspects count in full; others one quarter.
      const w = p === 'Jupiter' || p === 'Mercury' ? v : v / 4;
      drishti += benefic(p) ? w : -w;
    }

    let occupation = 0;
    for (const p of seven) {
      if (planets[p].house !== house) continue;
      if (p === 'Jupiter' || p === 'Mercury') occupation += 60;
      if (p === 'Saturn' || p === 'Mars' || p === 'Sun') occupation -= 60;
    }

    const total = adhipati + dig + drishti + occupation;
    return { house, adhipati: Math.round(adhipati * 10) / 10, dig, drishti: Math.round(drishti * 10) / 10, occupation, totalVirupas: Math.round(total * 10) / 10, totalRupas: Math.round((total / 60) * 100) / 100, rank: 0 };
  });
  [...rows].sort((a, b) => b.totalVirupas - a.totalVirupas).forEach((r, i) => (r.rank = i + 1));
  return rows;
}
