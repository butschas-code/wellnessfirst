import type { PlanetName } from '../types.ts';
import { ZODIAC_SIGNS, VIMSHOTTARI_DASHA_CYCLE } from './constants.ts';
import { getNakshatraPlacement } from './nakshatra.ts';

export interface KPPosition {
  longitude: number;
  signLord: PlanetName;
  starLord: PlanetName;
  subLord: PlanetName;
  subSubLord: PlanetName;
  formatted: string;
}

export function calculateKP(siderealLongitude: number): KPPosition {
  const normalized = ((siderealLongitude % 360) + 360) % 360;

  // 1. Sign Lord
  const signIndex = Math.floor(normalized / 30);
  const signLord = ZODIAC_SIGNS[signIndex].lord;

  // 2. Star Lord (Nakshatra)
  const nakPlacement = getNakshatraPlacement(normalized);
  const starLord = nakPlacement.nakshatra.lord;

  // 3. Sub Lord
  // Nakshatra span = 800 arcminutes (13.33333333°)
  const degreeInNak = nakPlacement.degreeInNakshatra;
  const minutesInNak = degreeInNak * 60; // 0..800

  // Find index of star lord in vimshottari cycle
  const starLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === starLord);

  let accumulatedMinutes = 0;
  let subLord: PlanetName = starLord;
  let subSpanMinutes = 0;
  let subOffsetMinutes = 0;

  for (let i = 0; i < VIMSHOTTARI_DASHA_CYCLE.length; i++) {
    const cycleIdx = (starLordIndex + i) % VIMSHOTTARI_DASHA_CYCLE.length;
    const subItem = VIMSHOTTARI_DASHA_CYCLE[cycleIdx];
    // Arc of sub in minutes = (subItem.years / 120) * 800
    const span = (subItem.years / 120) * 800;

    if (minutesInNak >= accumulatedMinutes && minutesInNak < accumulatedMinutes + span) {
      subLord = subItem.lord;
      subSpanMinutes = span;
      subOffsetMinutes = minutesInNak - accumulatedMinutes;
      break;
    }
    accumulatedMinutes += span;
  }

  // 4. Sub-Sub Lord
  const subLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === subLord);
  let subSubAccumulated = 0;
  let subSubLord: PlanetName = subLord;

  for (let j = 0; j < VIMSHOTTARI_DASHA_CYCLE.length; j++) {
    const cycleIdx = (subLordIndex + j) % VIMSHOTTARI_DASHA_CYCLE.length;
    const ssItem = VIMSHOTTARI_DASHA_CYCLE[cycleIdx];
    const ssSpan = (ssItem.years / 120) * subSpanMinutes;

    if (subOffsetMinutes >= subSubAccumulated && subOffsetMinutes < subSubAccumulated + ssSpan) {
      subSubLord = ssItem.lord;
      break;
    }
    subSubAccumulated += ssSpan;
  }

  return {
    longitude: normalized,
    signLord,
    starLord,
    subLord,
    subSubLord,
    formatted: `${signLord} / ${starLord} / ${subLord} / ${subSubLord}`,
  };
}

