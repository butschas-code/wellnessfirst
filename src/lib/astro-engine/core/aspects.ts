import type { PlanetPosition, PlanetName } from '../types.ts';

export interface AspectItem {
  aspectingPlanet: PlanetName;
  targetPlanet?: PlanetName;
  targetHouse: number; // 1..12
  aspectType: '7th Full' | 'Mars 4th/8th' | 'Jupiter 5th/9th' | 'Saturn 3rd/10th' | 'Rahu/Ketu 5th/9th';
  strengthPercentage: number;
}

export function calculateVedicAspects(
  planets: Record<PlanetName, PlanetPosition>
): AspectItem[] {
  const aspects: AspectItem[] = [];
  const planetKeys = Object.keys(planets) as PlanetName[];

  for (const sourceName of planetKeys) {
    const sourcePos = planets[sourceName];
    const sourceHouse = sourcePos.house;

    // 1. All planets have 100% 7th House Aspect
    const seventhHouse = ((sourceHouse + 5) % 12) + 1;
    aspects.push({
      aspectingPlanet: sourceName,
      targetHouse: seventhHouse,
      aspectType: '7th Full',
      strengthPercentage: 100,
    });

    // 2. Special Mars Aspects (4th and 8th)
    if (sourceName === 'Mars') {
      const fourthHouse = ((sourceHouse + 2) % 12) + 1;
      const eighthHouse = ((sourceHouse + 6) % 12) + 1;
      aspects.push({
        aspectingPlanet: 'Mars',
        targetHouse: fourthHouse,
        aspectType: 'Mars 4th/8th',
        strengthPercentage: 100,
      });
      aspects.push({
        aspectingPlanet: 'Mars',
        targetHouse: eighthHouse,
        aspectType: 'Mars 4th/8th',
        strengthPercentage: 100,
      });
    }

    // 3. Special Jupiter Aspects (5th and 9th)
    if (sourceName === 'Jupiter') {
      const fifthHouse = ((sourceHouse + 3) % 12) + 1;
      const ninthHouse = ((sourceHouse + 7) % 12) + 1;
      aspects.push({
        aspectingPlanet: 'Jupiter',
        targetHouse: fifthHouse,
        aspectType: 'Jupiter 5th/9th',
        strengthPercentage: 100,
      });
      aspects.push({
        aspectingPlanet: 'Jupiter',
        targetHouse: ninthHouse,
        aspectType: 'Jupiter 5th/9th',
        strengthPercentage: 100,
      });
    }

    // 4. Special Saturn Aspects (3rd and 10th)
    if (sourceName === 'Saturn') {
      const thirdHouse = ((sourceHouse + 1) % 12) + 1;
      const tenthHouse = ((sourceHouse + 8) % 12) + 1;
      aspects.push({
        aspectingPlanet: 'Saturn',
        targetHouse: thirdHouse,
        aspectType: 'Saturn 3rd/10th',
        strengthPercentage: 100,
      });
      aspects.push({
        aspectingPlanet: 'Saturn',
        targetHouse: tenthHouse,
        aspectType: 'Saturn 3rd/10th',
        strengthPercentage: 100,
      });
    }

    // 5. Special Rahu & Ketu Aspects (5th and 9th)
    if (sourceName === 'Rahu' || sourceName === 'Ketu') {
      const fifthHouse = ((sourceHouse + 3) % 12) + 1;
      const ninthHouse = ((sourceHouse + 7) % 12) + 1;
      aspects.push({
        aspectingPlanet: sourceName,
        targetHouse: fifthHouse,
        aspectType: 'Rahu/Ketu 5th/9th',
        strengthPercentage: 100,
      });
      aspects.push({
        aspectingPlanet: sourceName,
        targetHouse: ninthHouse,
        aspectType: 'Rahu/Ketu 5th/9th',
        strengthPercentage: 100,
      });
    }
  }

  // Cross-reference which planets are stationed in those targeted houses
  for (const asp of aspects) {
    const targetPlanet = planetKeys.find((p) => planets[p].house === asp.targetHouse);
    if (targetPlanet) {
      asp.targetPlanet = targetPlanet;
    }
  }

  return aspects;
}

