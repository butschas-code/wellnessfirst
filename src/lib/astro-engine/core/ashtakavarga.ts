import type { PlanetName, ZodiacSignName } from '../types.ts';
import { ZODIAC_SIGNS } from './constants.ts';

export type AshtakavargaPlanet =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn';

export interface BhinnashtakavargaResult {
  planet: AshtakavargaPlanet;
  totalPoints: number;
  signPoints: Record<ZodiacSignName, number>;
  housePoints: number[]; // Index 0..11 for houses 1..12
}

export interface SarvashtakavargaResult {
  totalPoints: number; // Exactly 337 points
  signPoints: Record<ZodiacSignName, number>;
  housePoints: number[]; // Index 0..11 for houses 1..12
  bav: Record<AshtakavargaPlanet, BhinnashtakavargaResult>;
}

// Classical Parashara Ashtakavarga Benefic Place Rules (Houses from source planet/lagna)
type SourceName = AshtakavargaPlanet | 'Lagna';

const ASHTAKAVARGA_RULES: Record<AshtakavargaPlanet, Record<SourceName, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

/**
 * Calculates complete Bhinnashtakavarga (BAV) and Sarvashtakavarga (SAV).
 */
export function calculateAshtakavarga(
  ascendantSignIndex: number,
  planetSignIndices: Record<PlanetName, number>
): SarvashtakavargaResult {
  const planets: AshtakavargaPlanet[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
  ];

  const sourcePositions: Record<SourceName, number> = {
    Sun: planetSignIndices.Sun,
    Moon: planetSignIndices.Moon,
    Mars: planetSignIndices.Mars,
    Mercury: planetSignIndices.Mercury,
    Jupiter: planetSignIndices.Jupiter,
    Venus: planetSignIndices.Venus,
    Saturn: planetSignIndices.Saturn,
    Lagna: ascendantSignIndex,
  };

  const bavResults = {} as Record<AshtakavargaPlanet, BhinnashtakavargaResult>;
  const savSignPoints: number[] = new Array(12).fill(0);

  for (const planet of planets) {
    const rules = ASHTAKAVARGA_RULES[planet];
    const signPoints: number[] = new Array(12).fill(0);

    for (const [source, houses] of Object.entries(rules) as Array<[SourceName, number[]]>) {
      const sourceSign = sourcePositions[source];
      for (const house of houses) {
        // House 1 is the same sign, House 2 is sign + 1, etc.
        const targetSign = (sourceSign + house - 1) % 12;
        signPoints[targetSign] += 1;
      }
    }

    const signPointsMap = {} as Record<ZodiacSignName, number>;
    const housePoints: number[] = [];
    let totalPoints = 0;

    for (let s = 0; s < 12; s++) {
      const signName = ZODIAC_SIGNS[s].name;
      const pts = signPoints[s];
      signPointsMap[signName] = pts;
      totalPoints += pts;

      // Add to SAV
      savSignPoints[s] += pts;
    }

    for (let h = 0; h < 12; h++) {
      const signIdx = (ascendantSignIndex + h) % 12;
      housePoints.push(signPoints[signIdx]);
    }

    bavResults[planet] = {
      planet,
      totalPoints,
      signPoints: signPointsMap,
      housePoints,
    };
  }

  const savSignMap = {} as Record<ZodiacSignName, number>;
  const savHousePoints: number[] = [];
  let savTotal = 0;

  for (let s = 0; s < 12; s++) {
    const signName = ZODIAC_SIGNS[s].name;
    const pts = savSignPoints[s];
    savSignMap[signName] = pts;
    savTotal += pts;
  }

  for (let h = 0; h < 12; h++) {
    const signIdx = (ascendantSignIndex + h) % 12;
    savHousePoints.push(savSignPoints[signIdx]);
  }

  return {
    totalPoints: savTotal,
    signPoints: savSignMap,
    housePoints: savHousePoints,
    bav: bavResults,
  };
}

