import * as Astronomy from 'astronomy-engine';
import { calculateLahiriAyanamsha } from '../core/ayanamsha.ts';
import { getNakshatraPlacement } from '../core/nakshatra.ts';
import type { PanchangResult, PlanetName } from '../types.ts';

const TITHI_NAMES = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashti',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dvadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima', // 15
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashti',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dvadashi',
  'Trayodashi',
  'Chaturdashi',
  'Amavasya', // 30
];

const VARA_INFO: Array<{ name: string; lord: PlanetName }> = [
  { name: 'Ravivara (Sunday)', lord: 'Sun' },
  { name: 'Somavara (Monday)', lord: 'Moon' },
  { name: 'Mangalavara (Tuesday)', lord: 'Mars' },
  { name: 'Budhavara (Wednesday)', lord: 'Mercury' },
  { name: 'Guruvara (Thursday)', lord: 'Jupiter' },
  { name: 'Shukravara (Friday)', lord: 'Venus' },
  { name: 'Shanivara (Saturday)', lord: 'Saturn' },
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shoola', 'Ganda', 'Vriddhi', 'Dhruva',
  'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
  'Brahma', 'Indra', 'Vaidhriti'
];

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kintughna'
];

export function calculatePanchang(
  date: Date,
  _latitude: number = 28.6139,
  _longitude: number = 77.209
): PanchangResult {
  const ayanamsha = calculateLahiriAyanamsha(date);

  // Tropical coordinates
  const sunPos = Astronomy.SunPosition(date);
  const sunTropLong = ((sunPos.elon % 360) + 360) % 360;

  const moonVec = Astronomy.GeoVector(Astronomy.Body.Moon, date, false);
  const moonEcl = Astronomy.Ecliptic(moonVec);
  const moonTropLong = ((moonEcl.elon % 360) + 360) % 360;

  // Sidereal coordinates
  const sunSidLong = ((sunTropLong - ayanamsha) % 360 + 360) % 360;
  const moonSidLong = ((moonTropLong - ayanamsha) % 360 + 360) % 360;

  // 1. Tithi: (Moon - Sun) % 360 / 12
  let tithiDiff = (moonSidLong - sunSidLong + 360) % 360;
  const tithiIndex = Math.floor(tithiDiff / 12); // 0..29
  const tithiNumber = tithiIndex + 1;
  const tithiName = TITHI_NAMES[tithiIndex];
  const paksha: 'Shukla' | 'Krishna' = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const tithiPercentageElapsed = ((tithiDiff % 12) / 12) * 100;

  // 2. Vara (Weekday)
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const vara = VARA_INFO[dayOfWeek];

  // 3. Nakshatra
  const moonNakPlacement = getNakshatraPlacement(moonSidLong);

  // 4. Yoga: (Sun + Moon) % 360 / (360 / 27)
  const yogaAngle = (sunSidLong + moonSidLong) % 360;
  const yogaIndex = Math.floor(yogaAngle / (360 / 27));
  const yogaNumber = yogaIndex + 1;
  const yogaName = YOGA_NAMES[Math.min(yogaIndex, 26)];

  // 5. Karana: half of a tithi (6 degrees)
  const karanaIndex = Math.floor(tithiDiff / 6);
  let karanaName: string;
  if (karanaIndex === 0) karanaName = 'Kintughna';
  else if (karanaIndex >= 57) {
    const fixedKaranas = ['Shakuni', 'Chatushpada', 'Naga'];
    karanaName = fixedKaranas[karanaIndex - 57];
  } else {
    karanaName = KARANA_NAMES[(karanaIndex - 1) % 7];
  }

  // 6. Muhurats (Rahu Kalam, Yamagandam, Abhijit)
  // Standard daytime intervals (06:00 to 18:00 base approximation)
  // Day partitioned into 8 segments of 1.5h (90 mins):
  // Segments: 1: 06:00-07:30, 2: 07:30-09:00, 3: 09:00-10:30, 4: 10:30-12:00,
  //           5: 12:00-13:30, 6: 13:30-15:00, 7: 15:00-16:30, 8: 16:30-18:00
  const rahuOctants = [8, 2, 7, 5, 6, 4, 3]; // Sun=8, Mon=2, Tue=7, Wed=5, Thu=6, Fri=4, Sat=3
  const yamaOctants = [5, 4, 3, 2, 1, 7, 6]; // Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
  const gulikaOctants = [7, 6, 5, 4, 3, 2, 1];

  function getOctantTime(octant: number): { start: string; end: string } {
    const startHour = 6 + (octant - 1) * 1.5;
    const endHour = startHour + 1.5;

    const formatHour = (h: number) => {
      const hours = Math.floor(h);
      const minutes = Math.round((h - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    return { start: formatHour(startHour), end: formatHour(endHour) };
  }

  return {
    date,
    tithi: {
      number: tithiNumber,
      name: tithiName,
      paksha,
      percentageElapsed: Math.round(tithiPercentageElapsed),
    },
    vara,
    nakshatra: {
      name: moonNakPlacement.nakshatra.name,
      number: moonNakPlacement.nakshatra.index + 1,
      lord: moonNakPlacement.nakshatra.lord,
      pada: moonNakPlacement.pada,
    },
    yoga: {
      name: yogaName,
      number: yogaNumber,
    },
    karana: {
      name: karanaName,
      number: karanaIndex + 1,
    },
    muhurats: {
      rahuKalam: getOctantTime(rahuOctants[dayOfWeek]),
      yamagandam: getOctantTime(yamaOctants[dayOfWeek]),
      gulikaKalam: getOctantTime(gulikaOctants[dayOfWeek]),
      abhijitMuhurat: { start: '11:44', end: '12:32' },
    },
  };
}
