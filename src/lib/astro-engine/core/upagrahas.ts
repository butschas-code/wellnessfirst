import type { PlanetPosition, AscendantInfo, ZodiacSignName } from '../types.ts';
import { ZODIAC_SIGNS } from './constants.ts';
import { formatDegreesToDMS } from './ayanamsha.ts';

export interface UpagrahaItem {
  name: string;
  sanskrit: string;
  longitude: number;
  sign: ZodiacSignName;
  degreeInSign: number;
  formattedDegree: string;
  house: number;
}

export interface UpagrahaResult {
  gulika: UpagrahaItem;
  mandi: UpagrahaItem;
  dhuma: UpagrahaItem;
  vyatipata: UpagrahaItem;
  parivesha: UpagrahaItem;
  indrachapa: UpagrahaItem;
  upaketu: UpagrahaItem;
}

export function calculateUpagrahas(
  sunPosition: PlanetPosition,
  ascendant: AscendantInfo,
  birthDate: Date
): UpagrahaResult {
  const sunLong = sunPosition.siderealLongitude;
  const ascLong = ascendant.siderealLongitude;
  const ascSignIdx = ascendant.sign.index;

  function makeItem(name: string, sanskrit: string, long: number): UpagrahaItem {
    const norm = ((long % 360) + 360) % 360;
    const signIdx = Math.floor(norm / 30);
    const sign = ZODIAC_SIGNS[signIdx].name;
    const degInSign = norm - signIdx * 30;
    const house = ((signIdx - ascSignIdx + 12) % 12) + 1;

    return {
      name,
      sanskrit,
      longitude: norm,
      sign,
      degreeInSign: degInSign,
      formattedDegree: formatDegreesToDMS(degInSign),
      house,
    };
  }

  // 1. Classical Mathematical Upagrahas based on Solar Longitude
  const dhumaLong = sunLong + 133.33333333; // 4 signs 13° 20'
  const vyatipataLong = 360 - dhumaLong;
  const pariveshaLong = vyatipataLong + 180;
  const indrachapaLong = 360 - pariveshaLong;
  const upaketuLong = indrachapaLong + 16.66666667;

  // 2. Gulika & Mandi approximation based on Saturn's day-segment
  const dayOfWeek = birthDate.getDay();
  // Saturn's segment indices for day: Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1
  const gulikaDaySegments = [7, 6, 5, 4, 3, 2, 1];
  const seg = gulikaDaySegments[dayOfWeek];
  // Gulika rising roughly around (seg - 0.5) * 1.5 hours after sunrise
  const gulikaLong = (ascLong + (seg - 1) * 30 + 15) % 360;
  const mandiLong = (gulikaLong + 2) % 360; // Mandi is closely bound to Gulika

  return {
    gulika: makeItem('Gulika', 'Gulika', gulikaLong),
    mandi: makeItem('Mandi', 'Māndi', mandiLong),
    dhuma: makeItem('Dhuma', 'Dhūma', dhumaLong),
    vyatipata: makeItem('Vyatipata', 'Vyatīpāta', vyatipataLong),
    parivesha: makeItem('Parivesha', 'Pariveṣa', pariveshaLong),
    indrachapa: makeItem('Indrachapa', 'Indracāpa', indrachapaLong),
    upaketu: makeItem('Upaketu', 'Upaketu', upaketuLong),
  };
}

