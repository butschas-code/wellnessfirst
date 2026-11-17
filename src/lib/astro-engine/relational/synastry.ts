import type {
  ComprehensiveKundliResult,
  PlanetName,
  ZodiacSignName,
} from '../types.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';
import { formatDegreesToDMS } from '../core/ayanamsha.ts';

export interface CrossChartContact {
  planetA: PlanetName;
  houseInChartB: number;
  contactType: 'Conjunction' | 'Trine (Supportive)' | 'Opposition (Dynamic Polarity)' | 'Square (Catalyst)';
  contactPartnerPlanet?: PlanetName;
  description: string;
}

export interface CompositePlanetItem {
  planet: PlanetName;
  midpointLongitude: number;
  sign: ZodiacSignName;
  formattedDegree: string;
}

export interface RelationalSynastryResult {
  relationshipType: 'Spousal / Romantic' | 'Parent & Child' | 'Co-Founders / Creative';
  crossContacts: CrossChartContact[];
  compositeChart: CompositePlanetItem[];
  dashaResonance: {
    partnerAMahadasha: PlanetName;
    partnerBMahadasha: PlanetName;
    mutualSynergy: 'Harmonious Flow' | 'Complementary Challenge' | 'Transformative Evolution';
    guidance: string;
  };
  overallPacingVerdict: string;
}

/**
 * Calculates multi-chart relational dynamics (Synastry, Cross-House Overlays,
 * Composite Midpoints, and Mutual Dasha Pacing) between two individuals (Spouse or Child).
 */
export function calculateRelationalSynastry(
  chartA: ComprehensiveKundliResult,
  chartB: ComprehensiveKundliResult,
  relationshipType: 'Spousal / Romantic' | 'Parent & Child' | 'Co-Founders / Creative' = 'Spousal / Romantic'
): RelationalSynastryResult {
  const planetsA = chartA.planets;
  const planetsB = chartB.planets;
  const ascBIdx = chartB.ascendant.sign.index;

  const crossContacts: CrossChartContact[] = [];
  const planetKeys: PlanetName[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
  ];

  // 1. Cross-House Placements: Where Partner A's planets fall in Partner B's chart
  for (const pName of planetKeys) {
    const posA = planetsA[pName];
    const posB = planetsB[pName];
    const houseInB = ((posA.sign.index - ascBIdx + 12) % 12) + 1;

    // Check angular difference between corresponding planets or Moon/Sun
    let diff = Math.abs(posA.siderealLongitude - posB.siderealLongitude);
    if (diff > 180) diff = 360 - diff;

    if (diff <= 10) {
      crossContacts.push({
        planetA: pName,
        houseInChartB: houseInB,
        contactType: 'Conjunction',
        contactPartnerPlanet: pName,
        description: `Both individuals have ${pName} in close proximity (${diff.toFixed(1)}°): deep mutual recognition of ${pName}'s archetype.`,
      });
    } else if (Math.abs(diff - 120) <= 8) {
      crossContacts.push({
        planetA: pName,
        houseInChartB: houseInB,
        contactType: 'Trine (Supportive)',
        contactPartnerPlanet: pName,
        description: `${pName} forms an effortless trine connection, providing natural emotional ease and mutual encouragement.`,
      });
    } else if (Math.abs(diff - 180) <= 8) {
      crossContacts.push({
        planetA: pName,
        houseInChartB: houseInB,
        contactType: 'Opposition (Dynamic Polarity)',
        contactPartnerPlanet: pName,
        description: `${pName} opposes partner's placement: offers complementary balancing perspectives and healthy contrast.`,
      });
    }
  }

  // Cross-check Moon-Jupiter contacts (supreme emotional sanctuary)
  const moonAtoJupB = Math.abs(planetsA.Moon.siderealLongitude - planetsB.Jupiter.siderealLongitude) % 360;
  if (moonAtoJupB <= 12 || Math.abs(moonAtoJupB - 120) <= 8) {
    crossContacts.push({
      planetA: 'Moon',
      houseInChartB: planetsB.Jupiter.house,
      contactType: 'Trine (Supportive)',
      contactPartnerPlanet: 'Jupiter',
      description: 'Partner A’s Moon resonates warmly with Partner B’s Jupiter: innate emotional safety, generosity, and forgiveness.',
    });
  }

  // 2. Composite Midpoint Chart (The relationship entity itself)
  const compositeChart: CompositePlanetItem[] = [];
  for (const pName of planetKeys) {
    const longA = planetsA[pName].siderealLongitude;
    const longB = planetsB[pName].siderealLongitude;

    // Shortest arc midpoint
    let diff = longB - longA;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const midLong = ((longA + diff / 2 + 360) % 360);

    const signIdx = Math.floor(midLong / 30);
    const sign = ZODIAC_SIGNS[signIdx].name;
    const degInSign = midLong - signIdx * 30;

    compositeChart.push({
      planet: pName,
      midpointLongitude: midLong,
      sign,
      formattedDegree: formatDegreesToDMS(degInSign),
    });
  }

  // 3. Mutual Dasha Resonance
  const dashaA = chartA.dasha.currentDasha.mahadasha.lord;
  const dashaB = chartB.dasha.currentDasha.mahadasha.lord;

  let mutualSynergy: RelationalSynastryResult['dashaResonance']['mutualSynergy'] =
    'Harmonious Flow';
  let guidance = '';

  if (dashaA === dashaB) {
    mutualSynergy = 'Harmonious Flow';
    guidance = `Both individuals are synchronized under ${dashaA} Mahadasha: shared collective tempo and aligned priorities.`;
  } else if (
    (dashaA === 'Jupiter' && dashaB === 'Saturn') ||
    (dashaA === 'Saturn' && dashaB === 'Jupiter')
  ) {
    mutualSynergy = 'Complementary Challenge';
    guidance =
      'One partner is in an expansive vision cycle (Jupiter) while the other is consolidating boundaries (Saturn). Balance expansion with structural grounding.';
  } else {
    mutualSynergy = 'Transformative Evolution';
    guidance = `Partner A moves through ${dashaA} rhythm while Partner B experiences ${dashaB}. Respect individual seasons without requiring identical energy levels.`;
  }

  return {
    relationshipType,
    crossContacts,
    compositeChart,
    dashaResonance: {
      partnerAMahadasha: dashaA,
      partnerBMahadasha: dashaB,
      mutualSynergy,
      guidance,
    },
    overallPacingVerdict:
      relationshipType === 'Parent & Child'
        ? 'Parent-child dynamic thrives when the child’s native sensory tempo is given patience and co-regulation.'
        : 'Spousal partnership holds rich complementary resources; communication flourishes when pacing differences are treated as assets rather than friction.',
  };
}

