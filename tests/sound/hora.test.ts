/**
 * Hora (hour) rulers of the day-arc slots: real sunrise and sunset at the birth
 * place while the member is in the birth time zone, equal hours from 06:00 otherwise.
 */
import { describe, expect, it } from 'vitest';
import { horaLord, sunriseHoraLord } from '../../src/lib/sound/dayArc';
import { slotHoras } from '../../src/lib/sound/signals';
import { calculateSolarDay } from '../../src/lib/astro-engine/panchang/solar-day';
import { browserToBirthProfile } from '../../src/lib/sound/profile';

const london = browserToBirthProfile(
  { name: 'Alex', birthDate: '1992-06-21', birthTime: '08:45', isTimeUnknown: false, cityName: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 1, ianaTimezone: 'Europe/London' },
  'fixture-alex',
  1
);

describe('sunriseHoraLord', () => {
  // A Sunday: sunrise 06:00, sunset 18:00, next sunrise 06:00 (UTC), so horas are 60 minutes.
  const day = { sunrise: new Date('2026-11-29T06:00Z'), sunset: new Date('2026-11-29T18:00Z'), nextSunrise: new Date('2026-11-30T06:00Z'), weekday: 0 };

  it('the first hora after sunrise belongs to the weekday lord, then the Chaldean order', () => {
    expect(sunriseHoraLord(day, new Date('2026-11-29T06:00Z'))).toBe('Sun');
    expect(sunriseHoraLord(day, new Date('2026-11-29T07:30Z'))).toBe('Venus');
    expect(sunriseHoraLord(day, new Date('2026-11-29T08:59Z'))).toBe('Mercury');
  });

  it('day and night horas follow the real day length', () => {
    // Short winter day: 08:00–16:00, so a day hora lasts 40 minutes.
    const winter = { sunrise: new Date('2026-12-20T08:00Z'), sunset: new Date('2026-12-20T16:00Z'), nextSunrise: new Date('2026-12-21T08:00Z'), weekday: 0 };
    expect(sunriseHoraLord(winter, new Date('2026-12-20T08:41Z'))).toBe('Venus'); // 2nd day hora
    // First night hora: 13th from sunrise.
    expect(sunriseHoraLord(winter, new Date('2026-12-20T16:10Z'))).toBe(horaLord('Sun', 6 + 12));
  });

  it('a moment before sunrise belongs to the previous Vedic day', () => {
    const at = new Date('2026-11-29T06:30Z'); // 06:30 London, before the 07:40 sunrise, on a Sunday
    const solar = calculateSolarDay(at, 51.5074, -0.1278, 'Europe/London');
    expect(solar.sunrise < at).toBe(true);
    expect(solar.weekday).toBe(6); // Saturday's sunrise
    expect(sunriseHoraLord(solar, at)).not.toBe(horaLord('Sun', 6));
  });
});

describe('slotHoras', () => {
  it('in the birth time zone, the hours follow the sunrise at the birth place', () => {
    // Friday 27 November 2026, London sunrise ≈ 07:39: 08:00 falls in the first hora, Venus.
    const h = slotHoras(london, '2026-11-27', 'Europe/London');
    expect(h).toBeDefined();
    expect(h!.morning).toBe('Venus');
    // Equal hours from 06:00 would give the third hora instead.
    expect(horaLord('Venus', 8)).not.toBe('Venus');
  });

  it('away from the birth time zone, it falls back to equal hours', () => {
    expect(slotHoras(london, '2026-11-27', 'Asia/Tokyo')).toBeUndefined();
  });
});
