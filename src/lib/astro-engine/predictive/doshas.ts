import type {
  DoshaAnalysis,
  PlanetPosition,
  AscendantInfo,
  PlanetName,
} from '../types.ts';

export function analyzeDoshas(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>,
  currentSaturnSignIndex: number
): DoshaAnalysis {
  // 1. Manglik (Kuja) Dosha Analysis
  const mars = planets.Mars;
  const moon = planets.Moon;
  const venus = planets.Venus;

  const manglikHousesFromLagna = [1, 2, 4, 7, 8, 12];
  const factors: string[] = [];
  const cancellations: string[] = [];

  // Check from Lagna
  if (manglikHousesFromLagna.includes(mars.house)) {
    factors.push(`Mars is placed in House ${mars.house} from Ascendant (${ascendant.sign.name}).`);
  }

  // Check from Moon
  const marsHouseFromMoon = ((mars.sign.index - moon.sign.index + 12) % 12) + 1;
  if (manglikHousesFromLagna.includes(marsHouseFromMoon)) {
    factors.push(`Mars is placed in House ${marsHouseFromMoon} from Natal Moon.`);
  }

  // Check from Venus
  const marsHouseFromVenus = ((mars.sign.index - venus.sign.index + 12) % 12) + 1;
  if (manglikHousesFromLagna.includes(marsHouseFromVenus)) {
    factors.push(`Mars is placed in House ${marsHouseFromVenus} from Venus.`);
  }

  // Classical Cancellations (Parashara / Mantreshwara)
  if (mars.sign.name === 'Aries' || mars.sign.name === 'Scorpio') {
    cancellations.push('Mars is in its own domicile sign (Aries/Scorpio), nullifying affliction.');
  }
  if (mars.sign.name === 'Capricorn') {
    cancellations.push('Mars is in exaltation (Capricorn), channelizing energy productively.');
  }
  if (planets.Jupiter.house === mars.house) {
    cancellations.push('Benevolent Jupiter is conjunct Mars, tempering intensity.');
  }

  const isManglik = factors.length > 0 && cancellations.length === 0;
  let severity: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (factors.length === 1) severity = cancellations.length > 0 ? 'Low' : 'Medium';
  else if (factors.length >= 2) severity = cancellations.length > 0 ? 'Medium' : 'High';

  // 2. Sade Sati Analysis (Saturn 7.5 year transit)
  const natalMoonSignIndex = moon.sign.index;
  const diffFromMoon = (currentSaturnSignIndex - natalMoonSignIndex + 12) % 12;

  let sadeSatiActive = false;
  let sadeSatiPhase: 'None' | 'Rising (1st phase)' | 'Peak (2nd phase)' | 'Setting (3rd phase)' = 'None';
  let sadeSatiDesc = 'Saturn is currently not transiting your natal Moon quadrant.';

  if (diffFromMoon === 11) {
    sadeSatiActive = true;
    sadeSatiPhase = 'Rising (1st phase)';
    sadeSatiDesc = 'Saturn transits the 12th house from your natal Moon: an invitation for introspection, clearing old obligations, and prioritizing restorative sleep.';
  } else if (diffFromMoon === 0) {
    sadeSatiActive = true;
    sadeSatiPhase = 'Peak (2nd phase)';
    sadeSatiDesc = 'Saturn conjuncts your natal Moon: peak period of discipline, emotional boundary-setting, and establishing sustainable daily pacing.';
  } else if (diffFromMoon === 1) {
    sadeSatiActive = true;
    sadeSatiPhase = 'Setting (3rd phase)';
    sadeSatiDesc = 'Saturn transits the 2nd house from your natal Moon: consolidating newfound maturity into practical family and financial stability.';
  }

  // 3. Kaal Sarp Analysis
  // Checks if all visible planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
  // are contained within one half of the zodiac between Rahu and Ketu.
  const rahuLong = planets.Rahu.siderealLongitude;
  const ketuLong = planets.Ketu.siderealLongitude;

  const visiblePlanets: PlanetName[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
  ];

  let allBetweenRahuKetu = true;
  let allBetweenKetuRahu = true;

  for (const pName of visiblePlanets) {
    const long = planets[pName].siderealLongitude;
    // Check if long is between rahu and ketu (increasing angle)
    const inRahuToKetu =
      rahuLong < ketuLong
        ? long >= rahuLong && long <= ketuLong
        : long >= rahuLong || long <= ketuLong;

    if (!inRahuToKetu) allBetweenRahuKetu = false;
    if (inRahuToKetu) allBetweenKetuRahu = false;
  }

  const isKaalSarp = allBetweenRahuKetu || allBetweenKetuRahu;

  return {
    manglik: {
      isManglik,
      severity,
      factors,
      cancellations,
    },
    sadeSati: {
      isActive: sadeSatiActive,
      phase: sadeSatiPhase,
      saturnSign: planets.Saturn.sign.name,
      moonSign: moon.sign.name,
      description: sadeSatiDesc,
    },
    kaalSarp: {
      isKaalSarp,
      direction: allBetweenRahuKetu ? 'Ascending' : allBetweenKetuRahu ? 'Descending' : undefined,
    },
  };
}
