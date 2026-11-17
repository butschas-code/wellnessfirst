import type { PlanetPosition, AscendantInfo, PlanetName, ZodiacSignName } from '../types.ts';
import { ZODIAC_SIGNS } from './constants.ts';
import { formatDegreesToDMS } from './ayanamsha.ts';

export interface BhavaCuspItem {
  houseNumber: number; // 1..12
  arambhaLongitude: number; // Start
  madhyaLongitude: number; // Midpoint (Cusp)
  antyaLongitude: number; // End
  sign: ZodiacSignName;
  formattedMadhya: string;
  occupyingPlanets: PlanetName[];
}

export interface PlanetBhavaShift {
  planet: PlanetName;
  rasiHouse: number;
  bhavaChalitHouse: number;
  hasShifted: boolean;
  explanation: string;
}

export interface BhavaChalitResult {
  houses: BhavaCuspItem[];
  shifts: PlanetBhavaShift[];
}

/**
 * Calculates Sripathi / Equal House Bhava Chalit chart and identifies house shifts.
 */
export function calculateBhavaChalit(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>
): BhavaChalitResult {
  const ascLong = ascendant.siderealLongitude;
  const houses: BhavaCuspItem[] = [];

  // Generate 12 Bhavas: Each Bhava Madhya is ascLong + (h * 30)
  for (let h = 0; h < 12; h++) {
    const houseNumber = h + 1;
    const madhya = (ascLong + h * 30) % 360;
    const arambha = (madhya - 15 + 360) % 360;
    const antya = (madhya + 15) % 360;

    const signIdx = Math.floor(madhya / 30);
    const sign = ZODIAC_SIGNS[signIdx].name;

    houses.push({
      houseNumber,
      arambhaLongitude: arambha,
      madhyaLongitude: madhya,
      antyaLongitude: antya,
      sign,
      formattedMadhya: formatDegreesToDMS(madhya % 30),
      occupyingPlanets: [],
    });
  }

  // Determine which Bhava each planet actually occupies
  const shifts: PlanetBhavaShift[] = [];

  for (const [pName, pos] of Object.entries(planets) as Array<[PlanetName, PlanetPosition]>) {
    const pLong = pos.siderealLongitude;
    let bhavaNumber = 1;

    for (const bhava of houses) {
      let isInside = false;
      if (bhava.arambhaLongitude < bhava.antyaLongitude) {
        isInside = pLong >= bhava.arambhaLongitude && pLong < bhava.antyaLongitude;
      } else {
        // House crosses 0° Aries
        isInside = pLong >= bhava.arambhaLongitude || pLong < bhava.antyaLongitude;
      }

      if (isInside) {
        bhavaNumber = bhava.houseNumber;
        bhava.occupyingPlanets.push(pName);
        break;
      }
    }

    const rasiHouse = pos.house;
    const hasShifted = rasiHouse !== bhavaNumber;
    const explanation = hasShifted
      ? `${pName} sits in Sign ${pos.sign.name} (House ${rasiHouse} in Rasi), but operates from Bhava ${bhavaNumber} in Bhava Chalit due to degree cusp proximity.`
      : `${pName} occupies House ${rasiHouse} identically in both Rasi and Bhava Chalit.`;

    shifts.push({
      planet: pName,
      rasiHouse,
      bhavaChalitHouse: bhavaNumber,
      hasShifted,
      explanation,
    });
  }

  return {
    houses,
    shifts,
  };
}

