import type {
  PlanetName,
  ComprehensiveKundliResult,
} from '../types.ts';
import { calculatePlanetaryPositions } from '../core/ephemeris.ts';

export interface TransitPlanetStatus {
  planet: PlanetName;
  transitingSign: string;
  transitingHouseFromMoon: number;
  transitingHouseFromLagna: number;
  savPointsInHouse: number;
  isFavorable: boolean;
  hasVedha: boolean;
  vedhaCausingPlanet?: PlanetName;
  summary: string;
}

export interface GocharaTransitResult {
  transitDate: Date;
  transits: TransitPlanetStatus[];
  generalTransitTone: 'Highly Supportive' | 'Constructive Pacing' | 'Challenging / Preservative';
  saturnSadeSatiActive: boolean;
  jupiterSupportActive: boolean;
}

// Classical Gochara Benefic Houses from Moon
const BENEFIC_HOUSES_FROM_MOON: Record<PlanetName, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
  Ketu: [3, 6, 11],
};

// Classical Vedha (Obstruction) Pairing: [Benefic House, Obstructing House]
// E.g. for Sun: House 3 is obstructed by House 12, 6 by 9, 10 by 4, 11 by 5
const VEDHA_PAIRS: Record<string, Array<[number, number]>> = {
  Sun: [[3, 12], [6, 9], [10, 4], [11, 5]],
  Moon: [[1, 5], [3, 9], [6, 12], [7, 2], [10, 4], [11, 8]],
  Mars: [[3, 12], [6, 9], [11, 5]],
  Mercury: [[2, 5], [4, 3], [6, 9], [8, 1], [10, 7], [11, 12]],
  Jupiter: [[2, 12], [5, 4], [7, 3], [9, 10], [11, 8]],
  Venus: [[1, 8], [2, 7], [3, 1], [4, 10], [5, 9], [8, 5], [9, 11], [11, 6], [12, 3]],
  Saturn: [[3, 12], [6, 9], [11, 5]],
  Rahu: [[3, 12], [6, 9], [11, 5]],
  Ketu: [[3, 12], [6, 9], [11, 5]],
};

/**
 * Calculates real-time planetary transits (Gochara) overlaid onto the birth chart,
 * with Sarvashtakavarga resilience and classical Vedha obstruction checks.
 */
export function calculateGocharaTransits(
  natalChart: ComprehensiveKundliResult,
  transitDate: Date = new Date()
): GocharaTransitResult {
  const natalAscIndex = natalChart.ascendant.sign.index;
  const natalMoonIndex = natalChart.planets.Moon.sign.index;

  // Calculate current sky placements
  const currentPlanets = calculatePlanetaryPositions(transitDate, natalAscIndex);

  const transits: TransitPlanetStatus[] = [];
  const planetKeys = Object.keys(currentPlanets) as PlanetName[];

  let favorableCount = 0;

  for (const pName of planetKeys) {
    const curPos = currentPlanets[pName];
    const houseFromMoon = ((curPos.sign.index - natalMoonIndex + 12) % 12) + 1;
    const houseFromLagna = ((curPos.sign.index - natalAscIndex + 12) % 12) + 1;

    // SAV points in this house from natal Ashtakavarga
    const savPoints = natalChart.ashtakavarga.housePoints[houseFromLagna - 1] || 28;

    const naturallyBeneficHouse = (BENEFIC_HOUSES_FROM_MOON[pName] || []).includes(houseFromMoon);

    // Check for classical Vedha obstruction
    let hasVedha = false;
    let vedhaCausingPlanet: PlanetName | undefined = undefined;

    if (naturallyBeneficHouse) {
      const pairs = VEDHA_PAIRS[pName] || [];
      const matchPair = pairs.find(([ben]) => ben === houseFromMoon);
      if (matchPair) {
        const obstructingHouse = matchPair[1];
        // Check if any planet (except Saturn for Sun, or Sun for Saturn) is in obstructing house
        for (const otherName of planetKeys) {
          if (otherName === pName) continue;
          if (pName === 'Sun' && otherName === 'Saturn') continue; // Sun-Saturn don't cause mutual vedha
          if (pName === 'Saturn' && otherName === 'Sun') continue;

          const otherHouseFromMoon =
            ((currentPlanets[otherName].sign.index - natalMoonIndex + 12) % 12) + 1;
          if (otherHouseFromMoon === obstructingHouse) {
            hasVedha = true;
            vedhaCausingPlanet = otherName;
            break;
          }
        }
      }
    }

    const isFavorable = naturallyBeneficHouse && !hasVedha && savPoints >= 28;
    if (isFavorable) favorableCount += 1;

    let summary = '';
    if (isFavorable) {
      summary = `${pName} transits House ${houseFromMoon} from Moon in a high-resilience sector (${savPoints} SAV points). Highly constructive.`;
    } else if (hasVedha) {
      summary = `${pName} transits House ${houseFromMoon} from Moon, but benefic flow is obstructed (Vedha) by ${vedhaCausingPlanet}.`;
    } else {
      summary = `${pName} transits House ${houseFromMoon} from Moon with ${savPoints} SAV points. Demands steady pacing and conscious conservation.`;
    }

    transits.push({
      planet: pName,
      transitingSign: curPos.sign.name,
      transitingHouseFromMoon: houseFromMoon,
      transitingHouseFromLagna: houseFromLagna,
      savPointsInHouse: savPoints,
      isFavorable,
      hasVedha,
      vedhaCausingPlanet,
      summary,
    });
  }

  // General transit tone
  let generalTransitTone: 'Highly Supportive' | 'Constructive Pacing' | 'Challenging / Preservative' =
    'Constructive Pacing';
  if (favorableCount >= 5) generalTransitTone = 'Highly Supportive';
  else if (favorableCount <= 2) generalTransitTone = 'Challenging / Preservative';

  const saturnStatus = transits.find((t) => t.planet === 'Saturn');
  const saturnHouseFromMoon = saturnStatus?.transitingHouseFromMoon || 0;
  const saturnSadeSatiActive = [12, 1, 2].includes(saturnHouseFromMoon);

  const jupiterStatus = transits.find((t) => t.planet === 'Jupiter');
  const jupiterSupportActive = (jupiterStatus?.isFavorable || false);

  return {
    transitDate,
    transits,
    generalTransitTone,
    saturnSadeSatiActive,
    jupiterSupportActive,
  };
}
