import * as Astronomy from 'astronomy-engine';
import type { ChoghadiyaType } from './choghadiya.ts';
import { CHOGHADIYA_DAY_SEQUENCES, CHOGHADIYA_NIGHT_SEQUENCES, CHOGHADIYA_QUALITY } from './choghadiya.ts';

/**
 * A Vedic day runs from sunrise to the next sunrise at the observer's location.
 * All day-division timings (Choghadiya, Rahu Kalam, Abhijit…) are fractions of that span,
 * so they must be computed from the real local sunrise and sunset — never a fixed 6:00.
 */
export interface SolarDay {
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
  /** 0 = Sunday … 6 = Saturday, taken from the sunrise date in the location's time zone. */
  weekday: number;
  /** True when the sun does not rise/set (polar day/night); a 06:00/18:00 local split is used. */
  isApproximate: boolean;
  timeZone: string;
}

export interface TimedSlot {
  name: ChoghadiyaType;
  quality: 'Auspicious' | 'Neutral' | 'Inauspicious';
  start: Date;
  end: Date;
  isDay: boolean;
  recommendedActivity: string;
}

const HOUR = 3_600_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekdayIn(date: Date, timeZone: string): number {
  const w = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date);
  return Math.max(0, WEEKDAYS.indexOf(w));
}

/** Local wall-clock midnight (as a UTC instant) for the calendar day containing `date` in `timeZone`. */
function localMidnight(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const sinceMidnight = (get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000;
  return new Date(date.getTime() - sinceMidnight - date.getMilliseconds());
}

/** The sunrise-to-sunrise day that contains `now` at the given location. */
export function calculateSolarDay(now: Date, latitude: number, longitude: number, timeZone = 'UTC'): SolarDay {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const rise = (from: Date) => Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, from, 2)?.date ?? null;
  const set = (from: Date) => Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, from, 2)?.date ?? null;

  // Latest sunrise at or before `now`, then the one after it.
  let sunrise = rise(new Date(now.getTime() - 30 * HOUR));
  let nextSunrise = sunrise ? rise(new Date(sunrise.getTime() + HOUR)) : null;
  while (sunrise && nextSunrise && nextSunrise <= now) {
    sunrise = nextSunrise;
    nextSunrise = rise(new Date(sunrise.getTime() + HOUR));
  }
  const sunset = sunrise ? set(sunrise) : null;

  if (sunrise && nextSunrise && sunset && sunset < nextSunrise && sunrise <= now) {
    return { sunrise, sunset, nextSunrise, weekday: weekdayIn(sunrise, timeZone), isApproximate: false, timeZone };
  }

  // Polar day/night: fall back to a 06:00–18:00 local split.
  let start = new Date(localMidnight(now, timeZone).getTime() + 6 * HOUR);
  if (start > now) start = new Date(start.getTime() - 24 * HOUR);
  return {
    sunrise: start,
    sunset: new Date(start.getTime() + 12 * HOUR),
    nextSunrise: new Date(start.getTime() + 24 * HOUR),
    weekday: weekdayIn(start, timeZone),
    isApproximate: true,
    timeZone,
  };
}

/** Choghadiya: daytime and night-time each split into 8 equal parts of the real day/night length. */
export function calculateTimedChoghadiya(day: SolarDay): TimedSlot[] {
  const build = (from: Date, to: Date, seq: ChoghadiyaType[], isDay: boolean): TimedSlot[] => {
    const part = (to.getTime() - from.getTime()) / 8;
    return seq.map((name, i) => ({
      name,
      quality: CHOGHADIYA_QUALITY[name].quality,
      recommendedActivity: CHOGHADIYA_QUALITY[name].activity,
      start: new Date(from.getTime() + i * part),
      end: new Date(from.getTime() + (i + 1) * part),
      isDay,
    }));
  };
  return [
    ...build(day.sunrise, day.sunset, CHOGHADIYA_DAY_SEQUENCES[day.weekday], true),
    ...build(day.sunset, day.nextSunrise, CHOGHADIYA_NIGHT_SEQUENCES[day.weekday], false),
  ];
}

const RAHU_OCTANT = [8, 2, 7, 5, 6, 4, 3];
const YAMA_OCTANT = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_OCTANT = [7, 6, 5, 4, 3, 2, 1];

export interface DayMuhurats {
  rahuKalam: { start: Date; end: Date };
  yamagandam: { start: Date; end: Date };
  gulikaKalam: { start: Date; end: Date };
  /** 8th of the 15 daytime muhurtas, centred on local solar noon. */
  abhijitMuhurat: { start: Date; end: Date };
}

export function calculateDayMuhurats(day: SolarDay): DayMuhurats {
  const len = day.sunset.getTime() - day.sunrise.getTime();
  const octant = (n: number) => ({
    start: new Date(day.sunrise.getTime() + ((n - 1) * len) / 8),
    end: new Date(day.sunrise.getTime() + (n * len) / 8),
  });
  return {
    rahuKalam: octant(RAHU_OCTANT[day.weekday]),
    yamagandam: octant(YAMA_OCTANT[day.weekday]),
    gulikaKalam: octant(GULIKA_OCTANT[day.weekday]),
    abhijitMuhurat: {
      start: new Date(day.sunrise.getTime() + (7 * len) / 15),
      end: new Date(day.sunrise.getTime() + (8 * len) / 15),
    },
  };
}
