import { ZODIAC_SIGNS } from './constants.ts';
import type {
  DivisionalChart,
  DivisionalChartPlacement,
  PlanetPosition,
  AscendantInfo,
  PlanetName,
} from '../types.ts';

export type ShodashvargaId =
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D7'
  | 'D9'
  | 'D10'
  | 'D12'
  | 'D16'
  | 'D20'
  | 'D24'
  | 'D27'
  | 'D30'
  | 'D40'
  | 'D45'
  | 'D60';

interface VargaMeta {
  id: ShodashvargaId;
  name: string;
  sanskrit: string;
  focus: string;
}

export const SHODASHVARGA_META: Record<ShodashvargaId, VargaMeta> = {
  D1: { id: 'D1', name: 'Rasi', sanskrit: 'Rāśi', focus: 'Physical existence, general life path, and physical constitution.' },
  D2: { id: 'D2', name: 'Hora', sanskrit: 'Horā', focus: 'Wealth, financial liquidity, and material resources.' },
  D3: { id: 'D3', name: 'Drekkana', sanskrit: 'Drekkāṇa', focus: 'Siblings, courage, vitality, and physical stamina.' },
  D4: { id: 'D4', name: 'Chaturthamsa', sanskrit: 'Caturthāṃśa', focus: 'Fixed assets, real estate, home, and destiny fortune.' },
  D7: { id: 'D7', name: 'Saptamsa', sanskrit: 'Saptāṃśa', focus: 'Children, creative progeny, and energetic continuation.' },
  D9: { id: 'D9', name: 'Navamsa', sanskrit: 'Navāṃśa', focus: 'Dharma, inner potential, soul trajectory, and marriage.' },
  D10: { id: 'D10', name: 'Dasamsa', sanskrit: 'Daśāṃśa', focus: 'Career, public stature, executive authority, and reputation.' },
  D12: { id: 'D12', name: 'Dwadasamsa', sanskrit: 'Dvādaśāṃśa', focus: 'Parents, heritage, ancestral legacy, and past life links.' },
  D16: { id: 'D16', name: 'Shodashamsa', sanskrit: 'Ṣoḍaśāṃśa', focus: 'Comforts, vehicles, conveyances, and inner contentment.' },
  D20: { id: 'D20', name: 'Vimsamsa', sanskrit: 'Viṃśāṃśa', focus: 'Spiritual discipline, meditation, and devotional depth.' },
  D24: { id: 'D24', name: 'Chaturvimsamsa', sanskrit: 'Caturviṃśāṃśa', focus: 'Higher education, academic mastery, and intellect.' },
  D27: { id: 'D27', name: 'Saptavimsamsa', sanskrit: 'Saptaviṃśāṃśa', focus: 'Subconscious resilience, strengths, and vulnerabilities.' },
  D30: { id: 'D30', name: 'Trimsamsa', sanskrit: 'Triṃśāṃśa', focus: 'Overcoming misfortune, health afflictions, and psychological tests.' },
  D40: { id: 'D40', name: 'Khavedamsa', sanskrit: 'Khavedāṃśa', focus: 'Subtle auspicious auspiciousness and moral resilience.' },
  D45: { id: 'D45', name: 'Akshavedamsa', sanskrit: 'Akṣavedāṃśa', focus: 'Purity of character, ethical conduct, and inner clarity.' },
  D60: { id: 'D60', name: 'Shashtiamsa', sanskrit: 'Ṣaṣṭyāṃśa', focus: 'Deep past karma, root destiny imprint (paramount in Parashara).' },
};

/**
 * Calculates the sign index (0..11) for any divisional chart given a sidereal longitude.
 */
export function getDivisionalSignIndex(
  vargaId: ShodashvargaId,
  siderealLongitude: number
): number {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  const isOddSign = signIndex % 2 === 0; // Aries(0), Gemini(2), Leo(4)... are odd signs

  switch (vargaId) {
    case 'D1':
      return signIndex;

    case 'D2': {
      // Hora: 15° divisions
      // Odd signs: 0-15° Leo (4), 15-30° Cancer (3)
      // Even signs: 0-15° Cancer (3), 15-30° Leo (4)
      const firstHalf = degreeInSign < 15;
      if (isOddSign) return firstHalf ? 4 : 3;
      return firstHalf ? 3 : 4;
    }

    case 'D3': {
      // Drekkana: 10° divisions
      // 0-10°: same sign, 10-20°: 5th sign, 20-30°: 9th sign
      const part = Math.floor(degreeInSign / 10);
      if (part === 0) return signIndex;
      if (part === 1) return (signIndex + 4) % 12;
      return (signIndex + 8) % 12;
    }

    case 'D4': {
      // Chaturthamsa: 7°30' divisions
      // 1st, 4th, 7th, 10th from the sign
      const part = Math.min(Math.floor(degreeInSign / 7.5), 3);
      return (signIndex + part * 3) % 12;
    }

    case 'D7': {
      // Saptamsa: 30/7° divisions
      const part = Math.min(Math.floor(degreeInSign / (30 / 7)), 6);
      const startSign = isOddSign ? signIndex : (signIndex + 6) % 12;
      return (startSign + part) % 12;
    }

    case 'D9': {
      // Navamsa: 3°20' divisions
      const totalPart = Math.floor(normalized / (30 / 9));
      return totalPart % 12;
    }

    case 'D10': {
      // Dasamsa: 3° divisions
      const part = Math.min(Math.floor(degreeInSign / 3), 9);
      const startSign = isOddSign ? signIndex : (signIndex + 8) % 12;
      return (startSign + part) % 12;
    }

    case 'D12': {
      // Dwadasamsa: 2°30' divisions
      const part = Math.min(Math.floor(degreeInSign / 2.5), 11);
      return (signIndex + part) % 12;
    }

    case 'D16': {
      // Shodashamsa: 30/16° divisions
      const part = Math.min(Math.floor(degreeInSign / (30 / 16)), 15);
      const modality = ZODIAC_SIGNS[signIndex].modality;
      const startSign = modality === 'Chara' ? 0 : modality === 'Sthira' ? 4 : 8;
      return (startSign + part) % 12;
    }

    case 'D20': {
      // Vimsamsa: 1.5° divisions
      const part = Math.min(Math.floor(degreeInSign / 1.5), 19);
      const modality = ZODIAC_SIGNS[signIndex].modality;
      const startSign = modality === 'Chara' ? 0 : modality === 'Sthira' ? 8 : 4;
      return (startSign + part) % 12;
    }

    case 'D24': {
      // Chaturvimsamsa: 1.25° divisions
      const part = Math.min(Math.floor(degreeInSign / 1.25), 23);
      const startSign = isOddSign ? 4 : 3;
      return (startSign + part) % 12;
    }

    case 'D27': {
      // Saptavimsamsa: 30/27° divisions
      const part = Math.min(Math.floor(degreeInSign / (30 / 27)), 26);
      const element = ZODIAC_SIGNS[signIndex].element;
      const startSign =
        element === 'Fire' ? 0 : element === 'Water' ? 9 : element === 'Air' ? 6 : 3;
      return (startSign + part) % 12;
    }

    case 'D30': {
      // Trimsamsa: Parashara unequal divisions
      if (isOddSign) {
        if (degreeInSign < 5) return 0; // Aries (Mars)
        if (degreeInSign < 10) return 10; // Aquarius (Saturn)
        if (degreeInSign < 18) return 8; // Sagittarius (Jupiter)
        if (degreeInSign < 25) return 2; // Gemini (Mercury)
        return 6; // Libra (Venus)
      } else {
        if (degreeInSign < 5) return 1; // Taurus (Venus)
        if (degreeInSign < 12) return 5; // Virgo (Mercury)
        if (degreeInSign < 20) return 11; // Pisces (Jupiter)
        if (degreeInSign < 25) return 9; // Capricorn (Saturn)
        return 7; // Scorpio (Mars)
      }
    }

    case 'D40': {
      // Khavedamsa: 0.75° divisions
      const part = Math.min(Math.floor(degreeInSign / 0.75), 39);
      const startSign = isOddSign ? 0 : 6;
      return (startSign + part) % 12;
    }

    case 'D45': {
      // Akshavedamsa: 2/3° divisions
      const part = Math.min(Math.floor(degreeInSign / (2 / 3)), 44);
      const modality = ZODIAC_SIGNS[signIndex].modality;
      const startSign = modality === 'Chara' ? 0 : modality === 'Sthira' ? 4 : 8;
      return (startSign + part) % 12;
    }

    case 'D60': {
      // Shashtiamsa: 0.5° divisions
      const part = Math.min(Math.floor(degreeInSign / 0.5), 59);
      const startSign = isOddSign ? signIndex : (signIndex + 6) % 12;
      return (startSign + part) % 12;
    }

    default:
      return signIndex;
  }
}

/**
 * Builds the complete Shodashvarga (16 divisional charts) for the chart.
 */
export function calculateAllShodashvarga(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>
): Record<ShodashvargaId, DivisionalChart> {
  const vargas = Object.keys(SHODASHVARGA_META) as ShodashvargaId[];
  const result = {} as Record<ShodashvargaId, DivisionalChart>;

  for (const vId of vargas) {
    const meta = SHODASHVARGA_META[vId];
    const ascSignIdx = getDivisionalSignIndex(vId, ascendant.siderealLongitude);
    const placements: DivisionalChartPlacement[] = [
      {
        planet: 'Ascendant',
        sign: ZODIAC_SIGNS[ascSignIdx],
        harmonicDegree: 0,
      },
    ];

    for (const [pName, pos] of Object.entries(planets) as Array<[PlanetName, PlanetPosition]>) {
      const pSignIdx = getDivisionalSignIndex(vId, pos.siderealLongitude);
      placements.push({
        planet: pName,
        sign: ZODIAC_SIGNS[pSignIdx],
        harmonicDegree: 0,
      });
    }

    result[vId] = {
      id: vId,
      name: `${meta.name} (${vId})`,
      description: meta.focus,
      placements,
    };
  }

  return result;
}

