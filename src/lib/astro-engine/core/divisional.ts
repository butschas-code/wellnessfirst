import { ZODIAC_SIGNS } from './constants.ts';
import type {
  DivisionalChart,
  DivisionalChartPlacement,
  PlanetPosition,
  AscendantInfo,
  HouseInfo,
} from '../types.ts';

/**
 * Calculates D1 (Rasi) Chart placements.
 */
export function calculateD1Chart(
  ascendant: AscendantInfo,
  planets: Record<string, PlanetPosition>
): DivisionalChart {
  const placements: DivisionalChartPlacement[] = [
    {
      planet: 'Ascendant',
      sign: ascendant.sign,
      harmonicDegree: ascendant.degreeInSign,
    },
  ];

  for (const pos of Object.values(planets)) {
    placements.push({
      planet: pos.name,
      sign: pos.sign,
      harmonicDegree: pos.degreeInSign,
    });
  }

  return {
    id: 'D1',
    name: 'Rasi',
    description: 'Root natal chart representing the physical incarnation, physical body, and general life path.',
    placements,
  };
}

/**
 * Calculates D9 (Navamsa) Chart placements.
 * The 1/9th harmonic chart. Vital in Vedic astrology for inner potential,
 * subconscious strength, spiritual path, and life after age ~30.
 */
export function calculateD9Chart(
  ascendant: AscendantInfo,
  planets: Record<string, PlanetPosition>
): DivisionalChart {
  const navamsaSpan = 30 / 9; // 3.33333333 degrees = 3° 20'

  function getNavamsaPlacement(
    planet: PlanetPosition['name'] | 'Ascendant',
    siderealLongitude: number
  ): DivisionalChartPlacement {
    const totalNavamsas = Math.floor(siderealLongitude / navamsaSpan);
    const navamsaSignIndex = totalNavamsas % 12;
    const sign = ZODIAC_SIGNS[navamsaSignIndex];
    const harmonicDegree = (siderealLongitude % navamsaSpan) * 9; // Expand 3°20' to 30°

    return {
      planet,
      sign,
      harmonicDegree,
    };
  }

  const placements: DivisionalChartPlacement[] = [
    getNavamsaPlacement('Ascendant', ascendant.siderealLongitude),
  ];

  for (const pos of Object.values(planets)) {
    placements.push(getNavamsaPlacement(pos.name, pos.siderealLongitude));
  }

  return {
    id: 'D9',
    name: 'Navamsa',
    description: 'Harmonic 9th divisional chart representing inner fortitude, dharma, and soul trajectory.',
    placements,
  };
}

/**
 * Generates the 12 houses according to the Whole Sign system with planet occupancies.
 */
export function calculateHouses(
  ascendantSignIndex: number,
  ascendantLongitude: number,
  planets: Record<string, PlanetPosition>
): HouseInfo[] {
  const houses: HouseInfo[] = [];

  for (let i = 0; i < 12; i++) {
    const houseNumber = i + 1;
    const signIndex = (ascendantSignIndex + i) % 12;
    const sign = ZODIAC_SIGNS[signIndex];
    const cuspLongitude = (signIndex * 30 + (ascendantLongitude % 30)) % 360;

    const occupyingPlanets = Object.values(planets)
      .filter((p) => p.house === houseNumber)
      .map((p) => p.name);

    houses.push({
      houseNumber,
      sign,
      cuspLongitude,
      planets: occupyingPlanets,
    });
  }

  return houses;
}
