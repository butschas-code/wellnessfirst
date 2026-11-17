import { NAKSHATRAS } from './constants.ts';
import type { NakshatraInfo } from '../types.ts';

export interface NakshatraPlacement {
  nakshatra: NakshatraInfo;
  pada: number; // 1..4
  degreeInNakshatra: number; // 0..13.33333333
  percentageElapsed: number; // 0..100%
}

export function getNakshatraPlacement(siderealLongitude: number): NakshatraPlacement {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  const nakshatraSpan = 360 / 27; // 13.33333333 degrees = 13° 20'
  const padaSpan = nakshatraSpan / 4; // 3.33333333 degrees = 3° 20'

  const nakshatraIndex = Math.floor(normalized / nakshatraSpan);
  const safeIndex = Math.min(Math.max(nakshatraIndex, 0), 26);
  const nakshatra = NAKSHATRAS[safeIndex];

  const degreeInNakshatra = normalized - safeIndex * nakshatraSpan;
  const pada = Math.min(Math.floor(degreeInNakshatra / padaSpan) + 1, 4);
  const percentageElapsed = (degreeInNakshatra / nakshatraSpan) * 100;

  return {
    nakshatra,
    pada,
    degreeInNakshatra,
    percentageElapsed,
  };
}
