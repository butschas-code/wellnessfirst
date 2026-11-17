import type { ComprehensiveKundliResult } from '../types.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';
import { formatDegreesToDMS } from '../core/ayanamsha.ts';
import { getDivisionalSignIndex } from '../core/shodashvarga.ts';

export interface ProgenyAnalysisResult {
  maleBeejaSphuta?: {
    longitude: number;
    sign: string;
    degreeInSign: string;
    isOddSign: boolean;
    navamsaSign: string;
    isOddNavamsa: boolean;
    vitalityScore: 'Highly Fertile' | 'Moderate / Supportive' | 'Requires Grounding';
    interpretation: string;
  };
  femaleKshetraSphuta?: {
    longitude: number;
    sign: string;
    degreeInSign: string;
    isEvenSign: boolean;
    navamsaSign: string;
    isEvenNavamsa: boolean;
    receptivityScore: 'Highly Receptive' | 'Moderate / Supportive' | 'Requires Grounding';
    interpretation: string;
  };
  fifthHouseD1Status: {
    sign: string;
    lord: string;
    occupyingPlanets: string[];
    jupiterAspect: boolean;
  };
  d7SaptamsaOverview: {
    fifthHouseD7Sign: string;
    progenySummary: string;
  };
  conceptionTimingGuidance: string;
}

/**
 * Calculates Beeja Sphuta (male seed vitality) and Kshetra Sphuta (female soil receptivity),
 * combined with D7 (Saptamsa) harmonic insights for children planning.
 */
export function calculateProgenyAnalysis(
  chart: ComprehensiveKundliResult,
  gender: 'Male' | 'Female' | 'Joint' = 'Joint'
): ProgenyAnalysisResult {
  const planets = chart.planets;
  const sunLong = planets.Sun.siderealLongitude;
  const moonLong = planets.Moon.siderealLongitude;
  const marsLong = planets.Mars.siderealLongitude;
  const venusLong = planets.Venus.siderealLongitude;
  const jupLong = planets.Jupiter.siderealLongitude;

  // 1. Male Beeja Sphuta = Sun + Venus + Jupiter
  let maleBeejaSphuta: ProgenyAnalysisResult['maleBeejaSphuta'] = undefined;
  if (gender === 'Male' || gender === 'Joint') {
    const beejaLong = (sunLong + venusLong + jupLong) % 360;
    const signIdx = Math.floor(beejaLong / 30);
    const sign = ZODIAC_SIGNS[signIdx].name;
    const degInSign = beejaLong - signIdx * 30;
    const isOddSign = signIdx % 2 === 0; // Aries(0), Gemini(2) are odd signs

    const navamsaSignIdx = getDivisionalSignIndex('D9', beejaLong);
    const navSign = ZODIAC_SIGNS[navamsaSignIdx].name;
    const isOddNavamsa = navamsaSignIdx % 2 === 0;

    let vitalityScore: 'Highly Fertile' | 'Moderate / Supportive' | 'Requires Grounding' =
      'Moderate / Supportive';
    if (isOddSign && isOddNavamsa) vitalityScore = 'Highly Fertile';
    else if (!isOddSign && !isOddNavamsa) vitalityScore = 'Requires Grounding';

    maleBeejaSphuta = {
      longitude: beejaLong,
      sign,
      degreeInSign: formatDegreesToDMS(degInSign),
      isOddSign,
      navamsaSign: navSign,
      isOddNavamsa,
      vitalityScore,
      interpretation:
        vitalityScore === 'Highly Fertile'
          ? 'Beeja Sphuta aligns in masculine signs in both Rasi and Navamsa: vigorous reproductive vitality and constitutional stamina.'
          : 'Beeja Sphuta is balanced; cellular health benefits from mineral hydration, clean sleep, and minimizing heat exposure.',
    };
  }

  // 2. Female Kshetra Sphuta = Moon + Mars + Jupiter
  let femaleKshetraSphuta: ProgenyAnalysisResult['femaleKshetraSphuta'] = undefined;
  if (gender === 'Female' || gender === 'Joint') {
    const kshetraLong = (moonLong + marsLong + jupLong) % 360;
    const signIdx = Math.floor(kshetraLong / 30);
    const sign = ZODIAC_SIGNS[signIdx].name;
    const degInSign = kshetraLong - signIdx * 30;
    const isEvenSign = signIdx % 2 !== 0; // Taurus(1), Cancer(3) are even signs

    const navamsaSignIdx = getDivisionalSignIndex('D9', kshetraLong);
    const navSign = ZODIAC_SIGNS[navamsaSignIdx].name;
    const isEvenNavamsa = navamsaSignIdx % 2 !== 0;

    let receptivityScore: 'Highly Receptive' | 'Moderate / Supportive' | 'Requires Grounding' =
      'Moderate / Supportive';
    if (isEvenSign && isEvenNavamsa) receptivityScore = 'Highly Receptive';
    else if (!isEvenSign && !isEvenNavamsa) receptivityScore = 'Requires Grounding';

    femaleKshetraSphuta = {
      longitude: kshetraLong,
      sign,
      degreeInSign: formatDegreesToDMS(degInSign),
      isEvenSign,
      navamsaSign: navSign,
      isEvenNavamsa,
      receptivityScore,
      interpretation:
        receptivityScore === 'Highly Receptive'
          ? 'Kshetra Sphuta falls in receptive feminine signs in both Rasi and Navamsa: rich somatic nourishment and natural maternal vitality.'
          : 'Kshetra Sphuta is receptive; optimize thyroid and adrenal reserves through nourishing fats and nervous-system quietude.',
    };
  }

  // 3. 5th House Analysis in Natal Chart
  const fifthHouse = chart.houses[4]; // index 4 is house 5
  const jupiterHouse = planets.Jupiter.house;
  const jupiterAspectsFifth = [1, 5, 9].includes(((jupiterHouse - 5 + 12) % 12) + 1);

  // 4. D7 Saptamsa Overview
  const d7Chart = chart.shodashvarga.D7;
  const d7AscSign = d7Chart.placements[0].sign.index;
  const d7FifthSignIdx = (d7AscSign + 4) % 12;
  const d7FifthSign = ZODIAC_SIGNS[d7FifthSignIdx].name;

  return {
    maleBeejaSphuta,
    femaleKshetraSphuta,
    fifthHouseD1Status: {
      sign: fifthHouse.sign.name,
      lord: fifthHouse.sign.lord,
      occupyingPlanets: fifthHouse.planets,
      jupiterAspect: jupiterAspectsFifth,
    },
    d7SaptamsaOverview: {
      fifthHouseD7Sign: d7FifthSign,
      progenySummary: `The 5th house of D7 Saptamsa is anchored in ${d7FifthSign}, indicating harmonious creative continuation and healthy intergenerational bonds.`,
    },
    conceptionTimingGuidance:
      'Plan family expansion during benefic transits (Jupiter transiting 1st, 5th, or 9th from natal Moon), and favor Shukla Paksha (waxing moon) for optimal autonomic vitality.',
  };
}

