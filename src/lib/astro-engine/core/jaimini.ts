import type { PlanetName, PlanetPosition, ZodiacSignName } from '../types.ts';
import { ZODIAC_SIGNS } from './constants.ts';

export type CharaKarakaRole =
  | 'Atmakaraka'
  | 'Amatyakaraka'
  | 'Bhratrukaraka'
  | 'Matrukaraka'
  | 'Putrakaraka'
  | 'Gnatikaraka'
  | 'Darakaraka';

export interface CharaKarakaItem {
  role: CharaKarakaRole;
  shortCode: 'AK' | 'AmK' | 'BK' | 'MK' | 'PK' | 'GK' | 'DK';
  planet: PlanetName;
  degreeInSign: number;
  formattedDegree: string;
  sign: ZodiacSignName;
  description: string;
}

export interface ArudhaPadaItem {
  houseNumber: number; // 1..12
  code: string; // 'AL' / 'A1', 'UL' / 'A12', etc.
  sign: ZodiacSignName;
  signIndex: number;
}

export interface JaiminiAnalysisResult {
  karakas: CharaKarakaItem[];
  arudhas: ArudhaPadaItem[];
  atmakaraka: CharaKarakaItem;
  darakaraka: CharaKarakaItem;
}

const KARAKA_META: Array<{
  role: CharaKarakaRole;
  shortCode: 'AK' | 'AmK' | 'BK' | 'MK' | 'PK' | 'GK' | 'DK';
  description: string;
}> = [
  { role: 'Atmakaraka', shortCode: 'AK', description: 'Soul indicator; core life lesson and highest inner evolution.' },
  { role: 'Amatyakaraka', shortCode: 'AmK', description: 'Executive driver, career, public agency, and intellect.' },
  { role: 'Bhratrukaraka', shortCode: 'BK', description: 'Mentors, guides, comrades, and spiritual advisors.' },
  { role: 'Matrukaraka', shortCode: 'MK', description: 'Mother, grounding, somatic peace, and domestic sanctuary.' },
  { role: 'Putrakaraka', shortCode: 'PK', description: 'Creative progeny, apprentices, and original thought.' },
  { role: 'Gnatikaraka', shortCode: 'GK', description: 'Tests, challenges, rivalry, and immunological resilience.' },
  { role: 'Darakaraka', shortCode: 'DK', description: 'Spouse, deepest union, and symbiotic partnership.' },
];

export function calculateJaimini(
  ascendantSignIndex: number,
  planets: Record<PlanetName, PlanetPosition>
): JaiminiAnalysisResult {
  // 1. Calculate 7 Chara Karakas (excluding Rahu & Ketu)
  const candidatePlanets: PlanetName[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
  ];

  const sorted = candidatePlanets
    .map((name) => planets[name])
    .sort((a, b) => b.degreeInSign - a.degreeInSign);

  const karakas: CharaKarakaItem[] = sorted.map((pos, idx) => {
    const meta = KARAKA_META[idx];
    return {
      role: meta.role,
      shortCode: meta.shortCode,
      planet: pos.name,
      degreeInSign: pos.degreeInSign,
      formattedDegree: pos.formattedDegree,
      sign: pos.sign.name,
      description: meta.description,
    };
  });

  // 2. Calculate Arudha Padas (A1..A12)
  const arudhas: ArudhaPadaItem[] = [];

  for (let h = 0; h < 12; h++) {
    const houseSignIdx = (ascendantSignIndex + h) % 12;
    const houseLord = ZODIAC_SIGNS[houseSignIdx].lord;
    const lordSignIdx = planets[houseLord].sign.index;

    // Distance from house to lord
    const dist = (lordSignIdx - houseSignIdx + 12) % 12;

    // Preliminary Arudha sign
    let arudhaSignIdx = (lordSignIdx + dist) % 12;

    // Parashara Exception: If Arudha falls in the same house or 7th from it
    const diffFromHouse = (arudhaSignIdx - houseSignIdx + 12) % 12;
    if (diffFromHouse === 0 || diffFromHouse === 6) {
      // Shift by 10 signs (9 houses forward)
      arudhaSignIdx = (arudhaSignIdx + 9) % 12;
    }

    const houseNum = h + 1;
    let code = `A${houseNum}`;
    if (houseNum === 1) code = 'AL (Arudha Lagna)';
    else if (houseNum === 12) code = 'UL (Upapada)';

    arudhas.push({
      houseNumber: houseNum,
      code,
      sign: ZODIAC_SIGNS[arudhaSignIdx].name,
      signIndex: arudhaSignIdx,
    });
  }

  return {
    karakas,
    arudhas,
    atmakaraka: karakas[0],
    darakaraka: karakas[6],
  };
}

