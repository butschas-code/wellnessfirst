import { calculateLahiriAyanamsha, formatDegreesToDMS } from './ayanamsha.ts';
import { ZODIAC_SIGNS } from './constants.ts';
import { getNakshatraPlacement } from './nakshatra.ts';
import { earthTilt, localSiderealDegrees, norm360 } from './precision.ts';
import type { AscendantInfo } from '../types.ts';

export function calculateAscendant(
  date: Date,
  latitude: number,
  longitude: number
): AscendantInfo {
  // Local apparent sidereal time → RAMC (true equinox of date).
  const ramcDeg = localSiderealDegrees(date, longitude);
  const ramcRad = (ramcDeg * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // True obliquity of the ecliptic (IAU 2006 mean obliquity + nutation in obliquity).
  const tilt = earthTilt(date);
  const epsRad = (tilt.trueObliquity * Math.PI) / 180;

  // Ascendant: tan(λ) = cos(RAMC) / −(sin(RAMC)·cos ε + tan φ·sin ε)
  const y = Math.cos(ramcRad);
  const x = -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);
  const tropicalAscDeg = norm360((Math.atan2(y, x) * 180) / Math.PI);

  // Midheaven: tan(MC) = tan(RAMC) / cos ε
  const tropicalMcDeg = norm360((Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)) * 180) / Math.PI);

  // Remove nutation (true → mean equinox), then apply Lahiri for the sidereal Lagna.
  const ayanamsha = calculateLahiriAyanamsha(date);
  const siderealAscDeg = norm360(tropicalAscDeg - tilt.dpsi - ayanamsha);
  const siderealMcDeg = norm360(tropicalMcDeg - tilt.dpsi - ayanamsha);

  const signIndex = Math.floor(siderealAscDeg / 30);
  const sign = ZODIAC_SIGNS[Math.min(Math.max(signIndex, 0), 11)];
  const degreeInSign = siderealAscDeg - signIndex * 30;

  const nakPlacement = getNakshatraPlacement(siderealAscDeg);

  return {
    tropicalLongitude: tropicalAscDeg,
    siderealLongitude: siderealAscDeg,
    sign,
    degreeInSign,
    formattedDegree: formatDegreesToDMS(degreeInSign),
    nakshatra: nakPlacement.nakshatra,
    nakshatraPada: nakPlacement.pada,
    midheavenSidereal: siderealMcDeg,
  };
}
