import * as Astronomy from 'astronomy-engine';
import { calculateLahiriAyanamsha, calculateJulianDay, formatDegreesToDMS } from './ayanamsha.ts';
import { ZODIAC_SIGNS, PLANET_SANSKRIT, DIGNITIES_MAP } from './constants.ts';
import { getNakshatraPlacement } from './nakshatra.ts';
import type {
  PlanetName,
  PlanetPosition,
  DignityType,
  ZodiacSignInfo,
} from '../types.ts';

/**
 * Calculates Moon's mean ascending node (Rahu) in tropical ecliptic degrees
 * using the standard IAU polynomial (Meeus Astronomical Algorithms).
 */
export function calculateMeanRahu(date: Date): number {
  const jd = calculateJulianDay(date);
  const t = (jd - 2451545.0) / 36525.0;

  let omega =
    125.04452 -
    1934.136261 * t +
    0.0020708 * t * t +
    (t * t * t) / 450000;

  omega = ((omega % 360) + 360) % 360;
  return omega;
}

/**
 * Calculates the geocentric tropical ecliptic longitude of a celestial body.
 */
function getTropicalLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    const sunPos = Astronomy.SunPosition(date);
    return ((sunPos.elon % 360) + 360) % 360;
  }

  const vec = Astronomy.GeoVector(body, date, false);
  const ecl = Astronomy.Ecliptic(vec);
  return ((ecl.elon % 360) + 360) % 360;
}

/**
 * Evaluates the dignity of a planet in a sidereal sign and degree.
 */
function determineDignity(
  planet: PlanetName,
  sign: ZodiacSignInfo,
  degreeInSign: number
): DignityType {
  const dignities = DIGNITIES_MAP[planet];
  if (!dignities) return 'Neutral';

  // Check Exaltation
  if (sign.name === dignities.exaltation.sign) {
    return 'Exalted';
  }

  // Check Debilitation
  if (sign.name === dignities.debilitation.sign) {
    return 'Debilitated';
  }

  // Check Moolatrikona
  if (
    sign.name === dignities.moolatrikona.sign &&
    degreeInSign >= dignities.moolatrikona.startDegree &&
    degreeInSign <= dignities.moolatrikona.endDegree
  ) {
    return 'Moolatrikona';
  }

  // Check Own Sign
  if (dignities.ownSigns.includes(sign.name)) {
    return 'OwnSign';
  }

  return 'Neutral';
}

export function calculatePlanetaryPositions(
  date: Date,
  ascendantSignIndex: number
): Record<PlanetName, PlanetPosition> {
  const ayanamsha = calculateLahiriAyanamsha(date);

  // Time delta to check retrograde motion (1 hour)
  const dtHours = 1;
  const nextDate = new Date(date.getTime() + dtHours * 3600 * 1000);

  const bodies: Array<{ name: PlanetName; body?: Astronomy.Body }> = [
    { name: 'Sun', body: Astronomy.Body.Sun },
    { name: 'Moon', body: Astronomy.Body.Moon },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Saturn', body: Astronomy.Body.Saturn },
    { name: 'Rahu' },
    { name: 'Ketu' },
  ];

  const result = {} as Record<PlanetName, PlanetPosition>;

  for (const { name, body } of bodies) {
    let tropicalLong = 0;
    let nextTropicalLong = 0;

    if (body) {
      tropicalLong = getTropicalLongitude(body, date);
      nextTropicalLong = getTropicalLongitude(body, nextDate);
    } else if (name === 'Rahu') {
      tropicalLong = calculateMeanRahu(date);
      nextTropicalLong = calculateMeanRahu(nextDate);
    } else if (name === 'Ketu') {
      tropicalLong = (calculateMeanRahu(date) + 180) % 360;
      nextTropicalLong = (calculateMeanRahu(nextDate) + 180) % 360;
    }

    // Convert to Sidereal
    let siderealLong = (tropicalLong - ayanamsha) % 360;
    if (siderealLong < 0) siderealLong += 360;

    let nextSiderealLong = (nextTropicalLong - ayanamsha) % 360;
    if (nextSiderealLong < 0) nextSiderealLong += 360;

    // Calculate speed (degrees per day)
    let diff = nextSiderealLong - siderealLong;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const speed = (diff / dtHours) * 24;

    // Rahu and Ketu are always retrograde in mean motion
    const isRetrograde = name === 'Rahu' || name === 'Ketu' ? true : speed < 0;

    const signIndex = Math.floor(siderealLong / 30);
    const sign = ZODIAC_SIGNS[Math.min(Math.max(signIndex, 0), 11)];
    const degreeInSign = siderealLong - signIndex * 30;

    // House in Whole Sign system (1 to 12)
    const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;

    const nakPlacement = getNakshatraPlacement(siderealLong);
    const dignity = determineDignity(name, sign, degreeInSign);

    result[name] = {
      name,
      sanskrit: PLANET_SANSKRIT[name],
      tropicalLongitude: tropicalLong,
      siderealLongitude: siderealLong,
      sign,
      degreeInSign,
      formattedDegree: formatDegreesToDMS(degreeInSign),
      house,
      nakshatra: nakPlacement.nakshatra,
      nakshatraPada: nakPlacement.pada,
      speed,
      isRetrograde,
      dignity,
    };
  }

  return result;
}
