import type { PlanetPosition, AscendantInfo } from '../types.ts';
import type { AshtakavargaPlanet } from './ashtakavarga.ts';
import { DIGNITIES_MAP } from './constants.ts';

export interface PlanetShadbalaBreakdown {
  planet: AshtakavargaPlanet;
  sthanaBala: number; // Positional
  digBala: number; // Directional
  kaalaBala: number; // Temporal
  chestaBala: number; // Motional
  naisargikaBala: number; // Natural
  drikBala: number; // Aspectual
  totalVirupas: number;
  totalRupas: number; // Virupas / 60
  requiredRupas: number;
  strengthRatio: number; // totalRupas / requiredRupas
  isStrong: boolean;
}

export type ShadbalaResult = Record<AshtakavargaPlanet, PlanetShadbalaBreakdown>;

// Classical Parashara Required Minimum Rupas
const REQUIRED_RUPAS: Record<AshtakavargaPlanet, number> = {
  Sun: 5.0, // 300 Virupas
  Moon: 6.0, // 360 Virupas
  Mars: 5.0, // 300 Virupas
  Mercury: 7.0, // 420 Virupas
  Jupiter: 6.5, // 390 Virupas
  Venus: 5.5, // 330 Virupas
  Saturn: 5.0, // 300 Virupas
};

// Natural (Naisargika) Strength in Virupas
const NAISARGIKA_BALA: Record<AshtakavargaPlanet, number> = {
  Sun: 60.0,
  Moon: 51.43,
  Venus: 42.86,
  Jupiter: 34.29,
  Mercury: 25.71,
  Mars: 17.14,
  Saturn: 8.57,
};

/**
 * Calculates Uccha Bala (Exaltation Strength) from 0 to 60 Virupas.
 */
function calculateUcchaBala(planet: AshtakavargaPlanet, longitude: number): number {
  const debSign = DIGNITIES_MAP[planet].debilitation.sign;
  const debDeg = DIGNITIES_MAP[planet].debilitation.degree;

  // Find sign index
  const signNames = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const debSignIdx = signNames.indexOf(debSign);
  const debAbsoluteLong = debSignIdx * 30 + debDeg;

  let diff = Math.abs(longitude - debAbsoluteLong);
  if (diff > 180) diff = 360 - diff;

  // Max diff is 180 (at deep exaltation) = 60 virupas
  return (diff / 180) * 60;
}

/**
 * Calculates Dig Bala (Directional Strength) from 0 to 60 Virupas.
 * Power points:
 * - Jupiter & Mercury: 1st House Cusp (Lagna)
 * - Sun & Mars: 10th House Cusp (Midheaven / South)
 * - Saturn: 7th House Cusp (Descendant / West)
 * - Moon & Venus: 4th House Cusp (Nadir / North)
 */
function calculateDigBala(
  planet: AshtakavargaPlanet,
  planetLong: number,
  ascendantLong: number
): number {
  let powerLong = 0;
  if (planet === 'Jupiter' || planet === 'Mercury') {
    powerLong = ascendantLong; // 1st
  } else if (planet === 'Sun' || planet === 'Mars') {
    powerLong = (ascendantLong + 270) % 360; // 10th
  } else if (planet === 'Saturn') {
    powerLong = (ascendantLong + 180) % 360; // 7th
  } else if (planet === 'Moon' || planet === 'Venus') {
    powerLong = (ascendantLong + 90) % 360; // 4th
  }

  let arc = Math.abs(planetLong - powerLong);
  if (arc > 180) arc = 360 - arc;

  // 180° away = 0 virupas; 0° away = 60 virupas
  return (1 - arc / 180) * 60;
}

/**
 * Calculates Chesta Bala (Motional Strength).
 */
function calculateChestaBala(
  planet: AshtakavargaPlanet,
  isRetrograde: boolean,
  speed: number
): number {
  if (planet === 'Sun' || planet === 'Moon') {
    // Luminaries do not retrograde; they use Ayana motional proxy
    return 35 + Math.min(Math.abs(speed) * 2, 25);
  }

  if (isRetrograde) {
    return 60; // Classical Parashara rule: retrograde planet gets maximum Chesta Bala (60)
  }

  // Direct planets: strength scaled by velocity
  const normalSpeed = Math.abs(speed);
  return Math.min(Math.max(normalSpeed * 15, 10), 45);
}

/**
 * Calculates comprehensive 6-fold Shadbala for the 7 primary planets.
 */
export function calculateShadbala(
  ascendant: AscendantInfo,
  planets: Record<string, PlanetPosition>,
  _birthDate: Date
): ShadbalaResult {
  const planetKeys: AshtakavargaPlanet[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
  ];

  const result = {} as ShadbalaResult;

  // Check if daytime birth (Sun above horizon / roughly houses 7-12)
  const sunHouse = planets.Sun.house;
  const isDayBirth = sunHouse >= 7 && sunHouse <= 12;

  // Paksha (Moon ahead of Sun up to 180 = Shukla Paksha)
  const moonLong = planets.Moon.siderealLongitude;
  const sunLong = planets.Sun.siderealLongitude;
  const pakshaDiff = (moonLong - sunLong + 360) % 360;
  const pakshaStrength = (pakshaDiff / 180) * 60;

  for (const p of planetKeys) {
    const pos = planets[p];

    // 1. Sthana Bala (Exaltation + Kendra + Sign Dignity)
    const ucchaBala = calculateUcchaBala(p, pos.siderealLongitude);
    const kendraBala = [1, 4, 7, 10].includes(pos.house)
      ? 60
      : [2, 5, 8, 11].includes(pos.house)
      ? 30
      : 15;
    const dignityBonus =
      pos.dignity === 'Exalted'
        ? 45
        : pos.dignity === 'OwnSign'
        ? 30
        : pos.dignity === 'Moolatrikona'
        ? 37.5
        : 15;
    const sthanaBala = Math.round(ucchaBala + kendraBala + dignityBonus);

    // 2. Dig Bala
    const digBala = Math.round(
      calculateDigBala(p, pos.siderealLongitude, ascendant.siderealLongitude)
    );

    // 3. Kaala Bala (Day/Night Natonnata + Paksha + Dina lord)
    let diurnalBala = 30;
    if (p === 'Sun' || p === 'Jupiter' || p === 'Venus') {
      diurnalBala = isDayBirth ? 50 : 20;
    } else if (p === 'Moon' || p === 'Mars' || p === 'Saturn') {
      diurnalBala = isDayBirth ? 20 : 50;
    }
    const pakshaBala = ['Moon', 'Jupiter', 'Venus'].includes(p)
      ? pakshaStrength
      : 60 - pakshaStrength;
    const kaalaBala = Math.round(diurnalBala + pakshaBala);

    // 4. Chesta Bala
    const chestaBala = Math.round(calculateChestaBala(p, pos.isRetrograde, pos.speed));

    // 5. Naisargika Bala
    const naisargikaBala = Math.round(NAISARGIKA_BALA[p]);

    // 6. Drik Bala (Aspectual estimate based on benefic/malefic positions)
    const jupAspect = Math.abs(pos.house - planets.Jupiter.house) % 12;
    const beneficAspectBonus = [0, 4, 6, 8].includes(jupAspect) ? 15 : 0;
    const drikBala = 15 + beneficAspectBonus;

    const totalVirupas =
      sthanaBala + digBala + kaalaBala + chestaBala + naisargikaBala + drikBala;
    const totalRupas = Number((totalVirupas / 60).toFixed(2));
    const requiredRupas = REQUIRED_RUPAS[p];
    const strengthRatio = Number((totalRupas / requiredRupas).toFixed(2));
    const isStrong = strengthRatio >= 1.0;

    result[p] = {
      planet: p,
      sthanaBala,
      digBala,
      kaalaBala,
      chestaBala,
      naisargikaBala,
      drikBala,
      totalVirupas,
      totalRupas,
      requiredRupas,
      strengthRatio,
      isStrong,
    };
  }

  return result;
}
