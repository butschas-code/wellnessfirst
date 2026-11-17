import * as Astronomy from 'astronomy-engine';
import { calculateLahiriAyanamsha } from '../core/ayanamsha.ts';
import { apparentBody, earthTilt, norm360 } from '../core/precision.ts';
import { calculateSolarDay, calculateDayMuhurats } from './solar-day.ts';
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
  latitude: number = 28.6139,
  longitude: number = 77.209,
  timeZone: string = 'UTC'
): PanchangResult {
  const ayanamsha = calculateLahiriAyanamsha(date);
  const dpsi = earthTilt(date).dpsi;

  // Apparent tropical coordinates (mean equinox of date), consistent with the natal ephemeris
  const sunTropLong = norm360(apparentBody(Astronomy.Body.Sun, date).longitude - dpsi);
  const moonTropLong = norm360(apparentBody(Astronomy.Body.Moon, date).longitude - dpsi);

  // The Vedic day runs sunrise to sunrise at the observer's location
  const solarDay = calculateSolarDay(date, latitude, longitude, timeZone);
  const dayMuhurats = calculateDayMuhurats(solarDay);
  const hhmm = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d);
  const span = (x: { start: Date; end: Date }) => ({ start: hhmm(x.start), end: hhmm(x.end) });

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
  const dayOfWeek = solarDay.weekday; // 0 = Sunday, sunrise-based
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
      rahuKalam: span(dayMuhurats.rahuKalam),
      yamagandam: span(dayMuhurats.yamagandam),
      gulikaKalam: span(dayMuhurats.gulikaKalam),
      abhijitMuhurat: span(dayMuhurats.abhijitMuhurat),
    },
    solarDay,
    muhuratTimes: dayMuhurats,
  };
}
