import type {
  ComprehensiveKundliResult,
  PlanetName,
  ZodiacSignName,
} from '../types.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';

export type RelativeType =
  | 'Spouse'
  | 'First Child'
  | 'Second Child'
  | 'Mother'
  | 'Father'
  | 'Younger Sibling'
  | 'Elder Sibling';

export interface DerivedHouseItem {
  derivedHouseNumber: number; // 1..12 from relative perspective
  natalHouseNumber: number; // 1..12 from querent chart
  sign: ZodiacSignName;
  lord: PlanetName;
  significance: string;
  occupyingPlanets: PlanetName[];
}

export interface DerivedChartResult {
  relative: RelativeType;
  baseNatalHouse: number;
  derivedAscendantSign: ZodiacSignName;
  derivedAscendantLord: PlanetName;
  houses: DerivedHouseItem[];
  vitalInsights: {
    healthAndVitalityHouse: number;
    financialFlowHouse: number;
    careerAndStatureHouse: number;
    somaticGuidance: string;
  };
}

const RELATIVE_NATAL_HOUSES: Record<RelativeType, { natalHouse: number; significance: string }> = {
  Spouse: { natalHouse: 7, significance: 'Marriage partner, life companion, and long-term intimate commitments.' },
  'First Child': { natalHouse: 5, significance: 'Firstborn child, creative legacy, and foundational parenting path.' },
  'Second Child': { natalHouse: 7, significance: 'Second child (3rd from 5th house), expanding domestic dynamics.' },
  Mother: { natalHouse: 4, significance: 'Mother, ancestral sanctuary, emotional grounding, and maternal health.' },
  Father: { natalHouse: 9, significance: 'Father, paternal lineage, ethical mentorship, and higher guidance.' },
  'Younger Sibling': { natalHouse: 3, significance: 'Younger siblings, close peers, courage, and creative collaboration.' },
  'Elder Sibling': { natalHouse: 11, significance: 'Elder siblings, mentors, and broad community alliances.' },
};

/**
 * Calculates Bhavat Bhavam (Derived Charts) rotating the natal chart to
 * analyze the independent perspective and vitality of spouses, children, and parents.
 */
export function calculateDerivedChart(
  natalChart: ComprehensiveKundliResult,
  relative: RelativeType
): DerivedChartResult {
  const meta = RELATIVE_NATAL_HOUSES[relative];
  const baseNatalHouse = meta.natalHouse;

  // The base natal house becomes derived house 1
  const natalAscSignIdx = natalChart.ascendant.sign.index;
  const derivedAscSignIdx = (natalAscSignIdx + baseNatalHouse - 1) % 12;
  const derivedAscSign = ZODIAC_SIGNS[derivedAscSignIdx];
  const derivedAscLord = derivedAscSign.lord;

  const houses: DerivedHouseItem[] = [];

  for (let d = 0; d < 12; d++) {
    const derivedHouseNum = d + 1;
    const natalHouseNum = ((baseNatalHouse - 1 + d) % 12) + 1;
    const signIdx = (derivedAscSignIdx + d) % 12;
    const sign = ZODIAC_SIGNS[signIdx];

    const occupyingPlanets = Object.values(natalChart.planets)
      .filter((p) => p.sign.index === signIdx)
      .map((p) => p.name);

    let significance = '';
    if (derivedHouseNum === 1) significance = `${relative}'s Physical Vitality & Core Self`;
    else if (derivedHouseNum === 2) significance = `${relative}'s Financial Reserves & Family Resources`;
    else if (derivedHouseNum === 4) significance = `${relative}'s Emotional Sanctuary & Inner Peace`;
    else if (derivedHouseNum === 5) significance = `${relative}'s Creative Expression & Intellect`;
    else if (derivedHouseNum === 7) significance = `${relative}'s Reciprocal Partnerships (The Querent)`;
    else if (derivedHouseNum === 10) significance = `${relative}'s Career, Calling & Public Stature`;
    else significance = `${relative}'s House ${derivedHouseNum} operations`;

    houses.push({
      derivedHouseNumber: derivedHouseNum,
      natalHouseNumber: natalHouseNum,
      sign: sign.name,
      lord: sign.lord,
      significance,
      occupyingPlanets,
    });
  }

  // Derived vital insights
  let somaticGuidance = '';
  if (relative === 'Spouse') {
    somaticGuidance =
      'Your chart indicates your spouse is grounded by ' +
      derivedAscSign.name +
      ' energy. Support their nervous system by honoring their native pace without imposing your internal calendar.';
  } else if (relative === 'First Child') {
    somaticGuidance =
      'Your first child operates from ' +
      derivedAscSign.name +
      ' vitality. Foster their creative instinct without pressure; their autonomic regulation thrives on open playtime.';
  } else {
    somaticGuidance = `Family dynamics flow smoothly when ${relative}'s ${derivedAscSign.name} rhythm is respected with spacious communication.`;
  }

  return {
    relative,
    baseNatalHouse,
    derivedAscendantSign: derivedAscSign.name,
    derivedAscendantLord: derivedAscLord,
    houses,
    vitalInsights: {
      healthAndVitalityHouse: 1,
      financialFlowHouse: 2,
      careerAndStatureHouse: 10,
      somaticGuidance,
    },
  };
}

