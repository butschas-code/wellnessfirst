import { calculateAscendant } from '../core/ascendant.ts';
import { calculatePlanetaryPositions } from '../core/ephemeris.ts';
import { calculateKP } from '../core/kp.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';
import type { PlanetName } from '../types.ts';

export type PrashnaCategory =
  | 'Health & Vitality'
  | 'Career & Calling'
  | 'Partnership & Love'
  | 'Children & Fertility'
  | 'Relocation & Home'
  | 'Financial Flow'
  | 'General Guidance';

export interface PrashnaQueryOptions {
  question: string;
  category: PrashnaCategory;
  queryTime: Date;
  latitude: number;
  longitude: number;
  horaryNumber?: number; // 1..249 KP Seed (optional)
}

export interface PrashnaResult {
  question: string;
  category: PrashnaCategory;
  queryTime: Date;
  location: { latitude: number; longitude: number };
  prashnaLagna: {
    sign: string;
    degree: string;
    lord: PlanetName;
  };
  karyesh: {
    houseNumber: number;
    sign: string;
    lord: PlanetName;
    domainMeaning: string;
  };
  tajikaAspect: {
    yogaName: 'Ithasala (Applying - Favorable)' | 'Esharpha (Separating - Delayed)' | 'Kamboola (Moon Mediation)' | 'Neutral Aspect';
    description: string;
  };
  kpSeed?: {
    seedNumber: number;
    subLord: PlanetName;
  };
  verdict: 'Favorable / High Manifestation' | 'Constructive with Patience' | 'Delayed / Re-evaluation Needed';
  guidance: string;
}

const CATEGORY_HOUSES: Record<PrashnaCategory, { house: number; meaning: string }> = {
  'Health & Vitality': { house: 1, meaning: 'Physical vitality, somatic resilience, and autonomous recovery.' },
  'Career & Calling': { house: 10, meaning: 'Executive agency, professional status, and purposeful initiatives.' },
  'Partnership & Love': { house: 7, meaning: 'Spouse, co-founder, mutual reciprocity, and contract integrity.' },
  'Children & Fertility': { house: 5, meaning: 'Children, creative lineage, conception, and joyful projects.' },
  'Relocation & Home': { house: 4, meaning: 'Domestic peace, real estate, sanctuary spaces, and emotional foundation.' },
  'Financial Flow': { house: 11, meaning: 'Gains, commercial liquidity, community rewards, and compounding capital.' },
  'General Guidance': { house: 9, meaning: 'Higher wisdom, ethical alignment, long-range travel, and dharmic path.' },
};

export function calculatePrashnaKundli(options: PrashnaQueryOptions): PrashnaResult {
  const { question, category, queryTime, latitude, longitude, horaryNumber } = options;

  // 1. Calculate Prashna Ascendant for time and place of asking
  const ascendant = calculateAscendant(queryTime, latitude, longitude);
  const ascSignIdx = ascendant.sign.index;
  const lagnaLord = ascendant.sign.lord;

  // 2. Calculate Planets for moment of asking
  const planets = calculatePlanetaryPositions(queryTime, ascSignIdx);

  // 3. Determine Karyesh (Significator of the matter asked)
  const meta = CATEGORY_HOUSES[category] || CATEGORY_HOUSES['General Guidance'];
  const targetHouse = meta.house;
  const targetSignIdx = (ascSignIdx + targetHouse - 1) % 12;
  const targetSign = ZODIAC_SIGNS[targetSignIdx];
  const karyeshLord = targetSign.lord;

  // 4. Evaluate Tajika / Prashna Yoga between Lagnesh and Karyesh
  const lagneshPos = planets[lagnaLord];
  const karyeshPos = planets[karyeshLord];
  const moonPos = planets.Moon;

  // Check angular relationship
  const angleDiff = Math.abs(lagneshPos.siderealLongitude - karyeshPos.siderealLongitude) % 360;
  const angularAspect = angleDiff > 180 ? 360 - angleDiff : angleDiff;

  // Faster planet determination
  const isLagneshFaster = Math.abs(lagneshPos.speed) > Math.abs(karyeshPos.speed);
  const fasterPlanet = isLagneshFaster ? lagneshPos : karyeshPos;
  const slowerPlanet = isLagneshFaster ? karyeshPos : lagneshPos;

  let yogaName: PrashnaResult['tajikaAspect']['yogaName'] = 'Neutral Aspect';
  let yogaDesc = 'Lagnesh and Karyesh operate with standard mutual independence.';

  // Check applying vs separating (Ithasala vs Esharpha)
  if (angularAspect <= 12 || Math.abs(angularAspect - 60) <= 8 || Math.abs(angularAspect - 120) <= 8) {
    if (fasterPlanet.siderealLongitude < slowerPlanet.siderealLongitude) {
      yogaName = 'Ithasala (Applying - Favorable)';
      yogaDesc = 'Applying harmonic aspect between the Querent and the Question Significator: high natural momentum for positive resolution.';
    } else {
      yogaName = 'Esharpha (Separating - Delayed)';
      yogaDesc = 'Separating aspect: the primary window has peaked; outcome requires conscious recalibration and patience.';
    }
  } else {
    // Check Moon mediation (Kamboola Yoga)
    const moonToLagnesh = Math.abs(moonPos.siderealLongitude - lagneshPos.siderealLongitude);
    const moonToKaryesh = Math.abs(moonPos.siderealLongitude - karyeshPos.siderealLongitude);
    if (moonToLagnesh <= 12 || moonToKaryesh <= 12) {
      yogaName = 'Kamboola (Moon Mediation)';
      yogaDesc = 'The Moon mediates between Querent and Significator, carrying favorable energetic transmission through an intermediary.';
    }
  }

  // 5. KP Seed Number Mapping if provided (1..249)
  let kpSeed: PrashnaResult['kpSeed'] = undefined;
  if (horaryNumber && horaryNumber >= 1 && horaryNumber <= 249) {
    // Map 1..249 to a 360 degree arc
    const seedDegree = ((horaryNumber - 1) / 249) * 360;
    const seedKP = calculateKP(seedDegree);
    kpSeed = {
      seedNumber: horaryNumber,
      subLord: seedKP.subLord,
    };
  }

  // 6. Verdict and Guidance
  let verdict: PrashnaResult['verdict'] = 'Constructive with Patience';
  let guidance = '';

  if (yogaName === 'Ithasala (Applying - Favorable)' || yogaName === 'Kamboola (Moon Mediation)') {
    verdict = 'Favorable / High Manifestation';
    guidance = 'The cosmic configuration at the moment of asking indicates open channels. Move forward with centered intention and clear boundaries.';
  } else if (yogaName === 'Esharpha (Separating - Delayed)') {
    verdict = 'Delayed / Re-evaluation Needed';
    guidance = 'The energy calls for pausing immediate assertion. Review agreements, gather somatic composure, and re-engage in the next seasonal window.';
  } else {
    verdict = 'Constructive with Patience';
    guidance = 'Steady progress is indicated. Avoid forcing rapid conclusions; allow the natural rhythm of the matter to mature without anxiety.';
  }

  return {
    question,
    category,
    queryTime,
    location: { latitude, longitude },
    prashnaLagna: {
      sign: ascendant.sign.name,
      degree: ascendant.formattedDegree,
      lord: lagnaLord,
    },
    karyesh: {
      houseNumber: targetHouse,
      sign: targetSign.name,
      lord: karyeshLord,
      domainMeaning: meta.meaning,
    },
    tajikaAspect: {
      yogaName,
      description: yogaDesc,
    },
    kpSeed,
    verdict,
    guidance,
  };
}

