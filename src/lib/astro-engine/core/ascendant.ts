import * as Astronomy from 'astronomy-engine';
import { calculateLahiriAyanamsha, formatDegreesToDMS } from './ayanamsha.ts';
import { ZODIAC_SIGNS } from './constants.ts';
import { getNakshatraPlacement } from './nakshatra.ts';
import type { AscendantInfo } from '../types.ts';

export function calculateAscendant(
  date: Date,
  latitude: number,
  longitude: number
): AscendantInfo {
  // Greenwich Mean Sidereal Time in hours
  const gmstHours = Astronomy.SiderealTime(date);

  // Local Sidereal Time in hours
  let lstHours = (gmstHours + longitude / 15) % 24;
  if (lstHours < 0) lstHours += 24;

  // RAMC (Right Ascension of Medium Coeli) in radians
  const ramcRad = (lstHours * 15 * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // Approximate true obliquity of the ecliptic around date
  // Standard J2000 obliquity with precession rate
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525.0;
  // Laskar formula approximation (arcsec)
  const epsilonDeg = 23.43929111 - 0.013004167 * t;
  const epsRad = (epsilonDeg * Math.PI) / 180;

  // Standard Astrological Ascendant calculation:
  // tan(lambda) = cos(RAMC) / (-sin(RAMC)*cos(eps) - tan(lat)*sin(eps))
  const y = Math.cos(ramcRad);
  const x = -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);

  let tropicalAscDeg = (Math.atan2(y, x) * 180) / Math.PI;
  if (tropicalAscDeg < 0) tropicalAscDeg += 360;

  // Apply Lahiri Ayanamsha for Sidereal Ascendant (Lagna)
  const ayanamsha = calculateLahiriAyanamsha(date);
  let siderealAscDeg = (tropicalAscDeg - ayanamsha) % 360;
  if (siderealAscDeg < 0) siderealAscDeg += 360;

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
  };
}
