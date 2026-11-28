import type { PlanetPosition, AscendantInfo, PlanetName } from '../types.ts';
import type { AshtakavargaPlanet } from './ashtakavarga.ts';
import { DIGNITIES_MAP, ZODIAC_SIGNS } from './constants.ts';
import { getDivisionalSignIndex, type ShodashvargaId } from './shodashvarga.ts';
import { compoundRelation } from './ephemeris.ts';
import { earthTilt, meanLongitudes, localSiderealDegrees, norm360 } from './precision.ts';
import { calculateSolarDay } from '../panchang/solar-day.ts';
import * as Astronomy from 'astronomy-engine';

/**
 * Shadbala — six-fold planetary strength, computed per Brihat Parashara Hora Shastra (ch. 27).
 * All values in virupas (60 virupas = 1 rupa).
 *
 *  1. Sthana  : Uccha + Saptavargaja (7 vargas) + Ojhayugma + Kendradi + Drekkana
 *  2. Dig     : arc from the point of no directional strength / 3
 *  3. Kala    : Nathonnata + Paksha + Tribhaga + Abda + Masa + Vara + Hora + Ayana + Yuddha
 *  4. Chesta  : Chesta-kendra / 3. The Sun's and Moon's chesta is their Ayana and Paksha bala,
 *               which Kala bala already counts twice for them, so it is not added again (as Raman).
 *  5. Naisargika
 *  6. Drik    : (aspects from benefics − aspects from malefics) / 4, incl. special aspects
 *
 * Checked against B.V. Raman, Graha and Bhava Balas, Standard Horoscope (tests/astro/shadbala-raman.test.ts).
 */

export interface ShadbalaComponents {
  uccha: number;
  saptavargaja: number;
  ojhayugma: number;
  kendradi: number;
  drekkana: number;
  nathonnata: number;
  paksha: number;
  tribhaga: number;
  abda: number;
  masa: number;
  vara: number;
  hora: number;
  ayana: number;
  yuddha: number;
}

export interface PlanetShadbalaBreakdown {
  planet: AshtakavargaPlanet;
  sthanaBala: number;
  digBala: number;
  kaalaBala: number;
  chestaBala: number;
  naisargikaBala: number;
  drikBala: number;
  totalVirupas: number;
  totalRupas: number;
  requiredRupas: number;
  strengthRatio: number;
  isStrong: boolean;
  /** Ishta phala (capacity to give good results), 0–60. */
  ishtaPhala?: number;
  /** Kashta phala (capacity to give difficulty), 0–60. */
  kashtaPhala?: number;
  /** 1 = strongest by ratio. */
  rank?: number;
  components?: ShadbalaComponents;
}

export type ShadbalaResult = Record<AshtakavargaPlanet, PlanetShadbalaBreakdown>;

export interface ShadbalaContext {
  latitude: number;
  longitude: number;
  /** UTC offset (hours) at birth — used for the local weekday. */
  timezone: number;
}

const PLANETS: AshtakavargaPlanet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

// BPHS minimum required strength (rupas)
const REQUIRED_RUPAS: Record<AshtakavargaPlanet, number> = {
  Sun: 5.0, Moon: 6.0, Mars: 5.0, Mercury: 7.0, Jupiter: 6.5, Venus: 5.5, Saturn: 5.0,
};

const NAISARGIKA_BALA: Record<AshtakavargaPlanet, number> = {
  Sun: 60.0, Moon: 51.43, Venus: 42.86, Jupiter: 34.29, Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
};

/** Weekday lords, index 0 = Sunday. */
const WEEKDAY_LORD: AshtakavargaPlanet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
/** Chaldean (hora) order. */
const HORA_ORDER: AshtakavargaPlanet[] = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

const SAPTAVARGA: ShodashvargaId[] = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
const RELATION_VIRUPAS = { GreatFriend: 22.5, Friend: 15, Neutral: 7.5, Enemy: 3.75, GreatEnemy: 1.875, Self: 30 } as const;

/**
 * Ahargana (days since creation) for the Abda and Masa lords, after Raman,
 * Graha and Bhava Balas §60–63: 714,404,096,641 days on Wednesday 2 May 1827.
 */
const AHARGANA_EPOCH = 714_404_096_641;
const AHARGANA_EPOCH_DAY = Date.UTC(1827, 4, 2) / 86_400_000;

/** Days since creation for the local civil date of `instant` (UTC offset `tz` hours). */
export function ahargana(instant: Date, tz: number): number {
  const day = Math.floor((instant.getTime() + tz * 3_600_000) / 86_400_000);
  return AHARGANA_EPOCH + (day - AHARGANA_EPOCH_DAY);
}

const arc = (a: number, b: number) => {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
};

/** BPHS drishti value of `from` aspecting `to` (with special aspects of Mars, Jupiter, Saturn). */
export function drishtiValue(from: PlanetName, fromLong: number, toLong: number): number {
  const d = norm360(toLong - fromLong);
  let v = 0;
  if (d < 30) v = 0;
  else if (d < 60) v = (d - 30) / 2;
  else if (d < 90) v = d - 60 + 15;
  else if (d < 120) v = (120 - d) / 2 + 30;
  else if (d < 150) v = 150 - d;
  else if (d < 180) v = (d - 150) * 2;
  else if (d < 300) v = (300 - d) / 2;
  if (from === 'Saturn' && ((d >= 60 && d < 90) || (d >= 270 && d < 300))) v += 45;
  if (from === 'Jupiter' && ((d >= 120 && d < 150) || (d >= 240 && d < 270))) v += 30;
  if (from === 'Mars' && ((d >= 90 && d < 120) || (d >= 210 && d < 240))) v += 15;
  return Math.min(60, v);
}

export function calculateShadbala(
  ascendant: AscendantInfo,
  planets: Record<string, PlanetPosition>,
  birthDate: Date,
  ctx?: ShadbalaContext
): ShadbalaResult {
  const lat = ctx?.latitude ?? 0;
  const lon = ctx?.longitude ?? 0;
  const tz = ctx?.timezone ?? 0;

  const signOf = (p: PlanetName) => planets[p].sign.index;
  const sunL = planets.Sun.siderealLongitude;
  const moonL = planets.Moon.siderealLongitude;
  const ascL = ascendant.siderealLongitude;
  const mcL = ascendant.midheavenSidereal ?? norm360(ascL + 270);

  // ── Time context ───────────────────────────────────────────────────────────
  const solar = calculateSolarDay(birthDate, lat, lon, 'UTC');
  const isDay = birthDate >= solar.sunrise && birthDate < solar.sunset;
  const localWeekday = new Date(solar.sunrise.getTime() + tz * 3_600_000).getUTCDay();
  const varaLord = WEEKDAY_LORD[localWeekday];

  // Sun's hour angle (degrees from local apparent noon)
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, birthDate, new Astronomy.Observer(lat, lon, 0), true, true);
  let hourAngle = norm360(localSiderealDegrees(birthDate, lon) - sunEq.ra * 15);
  if (hourAngle > 180) hourAngle -= 360;

  // Tribhaga lord
  const thirdOf = (start: Date, end: Date) =>
    Math.min(2, Math.floor(((birthDate.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 3));
  const tribhagaLord: AshtakavargaPlanet = isDay
    ? (['Mercury', 'Sun', 'Saturn'] as const)[thirdOf(solar.sunrise, solar.sunset)]
    : (['Moon', 'Venus', 'Mars'] as const)[thirdOf(solar.sunset, solar.nextSunrise)];

  // Hora lord: equal 60-minute horas counted from sunrise, starting with the weekday lord.
  const horaIndex = Math.floor((birthDate.getTime() - solar.sunrise.getTime()) / 3_600_000);
  const horaLord = HORA_ORDER[(HORA_ORDER.indexOf(varaLord) + horaIndex) % 7];

  // Abda (year) and Masa (month) lords: weekday on which the 360-day year and 30-day month began,
  // counted from the ahargana of the Vedic (sunrise) day of birth.
  const days = ahargana(solar.sunrise, tz);
  const fromSunday = (n: number) => WEEKDAY_LORD[((n % 7) + 6) % 7]; // remainder 1 = Sunday
  const abdaLord = fromSunday(Math.floor(days / 360) * 3 + 1);
  const masaLord = fromSunday(Math.floor(days / 30) * 2 + 1);

  // Paksha: Sun–Moon elongation folded to 0..180
  let elong = norm360(moonL - sunL);
  const waxing = elong <= 180;
  if (elong > 180) elong = 360 - elong;

  // Mercury turns malefic when combust (within 14° of the Sun, 12° when retrograde) or in the
  // same sign as Mars, Saturn, Rahu or Ketu (Raman counts it malefic in his combust example).
  const merc = planets.Mercury;
  const mercCombust = arc(merc.siderealLongitude, sunL) <= (merc.isRetrograde ? 12 : 14);
  const mercWithMalefic = (['Mars', 'Saturn', 'Rahu', 'Ketu'] as const).some((q) => planets[q] && planets[q].sign.index === merc.sign.index);
  const mercuryBenefic = !mercCombust && !mercWithMalefic;
  const benefic = (p: PlanetName) =>
    p === 'Jupiter' || p === 'Venus' || (p === 'Mercury' && mercuryBenefic) || (p === 'Moon' && waxing);
  const obliquity = earthTilt(birthDate).trueObliquity;

  const means = meanLongitudes(birthDate);
  const comps = {} as Record<AshtakavargaPlanet, ShadbalaComponents>;
  const partial = {} as Record<AshtakavargaPlanet, { sthana: number; dig: number; kala: number; chesta: number; drik: number; phalaChesta: number }>;

  for (const p of PLANETS) {
    const pos = planets[p];
    const L = pos.siderealLongitude;
    const dig = DIGNITIES_MAP[p];

    // ── 1. Sthana ──
    const debL = ZODIAC_SIGNS.findIndex((s) => s.name === dig.debilitation.sign) * 30 + dig.debilitation.degree;
    const uccha = arc(L, debL) / 3;

    let saptavargaja = 0;
    for (const v of SAPTAVARGA) {
      const vSign = ZODIAC_SIGNS[getDivisionalSignIndex(v, L)];
      if (v === 'D1' && pos.sign.name === dig.moolatrikona.sign &&
          pos.degreeInSign >= dig.moolatrikona.startDegree && pos.degreeInSign <= dig.moolatrikona.endDegree) {
        saptavargaja += 45;
      } else if (vSign.lord === p) {
        saptavargaja += 30;
      } else {
        saptavargaja += RELATION_VIRUPAS[compoundRelation(p, vSign.lord, signOf)];
      }
    }

    const rasiOdd = pos.sign.index % 2 === 0;
    const navOdd = getDivisionalSignIndex('D9', L) % 2 === 0;
    const wantsEven = p === 'Moon' || p === 'Venus';
    const ojhayugmaTotal = ((wantsEven ? !rasiOdd : rasiOdd) ? 15 : 0) + ((wantsEven ? !navOdd : navOdd) ? 15 : 0);

    const kendradi = [1, 4, 7, 10].includes(pos.house) ? 60 : [2, 5, 8, 11].includes(pos.house) ? 30 : 15;

    const decan = Math.floor(pos.degreeInSign / 10); // 0,1,2
    const gender = ['Sun', 'Mars', 'Jupiter'].includes(p) ? 0 : ['Mercury', 'Saturn'].includes(p) ? 1 : 2;
    const drekkana = decan === gender ? 15 : 0;

    const sthana = uccha + saptavargaja + ojhayugmaTotal + kendradi + drekkana;

    // ── 2. Dig ──
    const powerPoint =
      p === 'Jupiter' || p === 'Mercury' ? ascL
        : p === 'Sun' || p === 'Mars' ? mcL
          : p === 'Saturn' ? norm360(ascL + 180)
            : norm360(mcL + 180); // Moon, Venus: IC
    const digBala = (180 - arc(L, powerPoint)) / 3;

    // ── 3. Kala ──
    const absHA = Math.abs(hourAngle);
    const nathonnata = p === 'Mercury' ? 60
      : ['Sun', 'Jupiter', 'Venus'].includes(p) ? ((180 - absHA) / 180) * 60
        : (absHA / 180) * 60;

    const pakshaBase = benefic(p) ? elong / 3 : 60 - elong / 3;
    const paksha = p === 'Moon' ? pakshaBase * 2 : pakshaBase;

    const tribhaga = p === 'Jupiter' || p === tribhagaLord ? 60 : 0;
    const abda = p === abdaLord ? 15 : 0;
    const masa = p === masaLord ? 30 : 0;
    const vara = p === varaLord ? 45 : 0;
    const hora = p === horaLord ? 60 : 0;

    // Kranti: declination of the planet's ecliptic point (latitude ignored, as in the texts).
    const decl = (Math.asin(Math.sin((obliquity * Math.PI) / 180) * Math.sin((pos.tropicalLongitude * Math.PI) / 180)) * 180) / Math.PI;
    const ayanaBase =
      p === 'Mercury' ? ((24 + Math.abs(decl)) / 48) * 60
        : p === 'Moon' || p === 'Saturn' ? ((24 - decl) / 48) * 60
          : ((24 + decl) / 48) * 60;
    const ayanaClamped = Math.max(0, Math.min(60, ayanaBase));
    const ayana = p === 'Sun' ? ayanaClamped * 2 : ayanaClamped;

    const kala = nathonnata + paksha + tribhaga + abda + masa + vara + hora + ayana;

    // ── 4. Chesta ──
    // Sun and Moon: counted inside Kala (doubled Ayana / Paksha); `phalaChesta` keeps it for Ishta/Kashta.
    let chesta: number;
    let phalaChesta: number;
    if (p === 'Sun') { chesta = 0; phalaChesta = ayanaClamped; }
    else if (p === 'Moon') { chesta = 0; phalaChesta = pakshaBase; }
    else {
      const trueTrop = pos.tropicalLongitude;
      const inner = p === 'Mercury' || p === 'Venus';
      const meanPlanet = inner ? means.Sun : means[p as 'Mars' | 'Jupiter' | 'Saturn'];
      const seeghrocha = inner ? means[p as 'Mercury' | 'Venus'] : means.Sun;
      let ck = norm360(seeghrocha - (meanPlanet + trueTrop) / 2);
      if (ck > 180) ck = 360 - ck;
      chesta = ck / 3;
      phalaChesta = chesta;
    }

    // ── 6. Drik ──
    let drikSum = 0;
    for (const q of PLANETS) {
      if (q === p) continue;
      const v = drishtiValue(q, planets[q].siderealLongitude, L);
      drikSum += benefic(q) ? v : -v;
    }
    const drik = drikSum / 4;

    comps[p] = {
      uccha, saptavargaja, ojhayugma: ojhayugmaTotal, kendradi, drekkana,
      nathonnata, paksha, tribhaga, abda, masa, vara, hora, ayana, yuddha: 0,
    };
    partial[p] = { sthana, dig: digBala, kala, chesta, drik, phalaChesta };
  }

  // ── Yuddha (planetary war): Mars–Saturn within 1°; the more northern planet wins. ──
  const warriors: AshtakavargaPlanet[] = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  for (let i = 0; i < warriors.length; i++) {
    for (let j = i + 1; j < warriors.length; j++) {
      const a = warriors[i], b = warriors[j];
      if (arc(planets[a].siderealLongitude, planets[b].siderealLongitude) >= 1) continue;
      const aWins = (planets[a].latitude ?? 0) >= (planets[b].latitude ?? 0);
      const [w, l] = aWins ? [a, b] : [b, a];
      const sum = (x: AshtakavargaPlanet) => partial[x].sthana + partial[x].dig + partial[x].kala;
      const diff = Math.abs(sum(w) - sum(l));
      partial[w].kala += diff; comps[w].yuddha += diff;
      partial[l].kala -= diff; comps[l].yuddha -= diff;
    }
  }

  const r1 = (x: number) => Math.round(x * 10) / 10;
  const result = {} as ShadbalaResult;
  for (const p of PLANETS) {
    const { sthana, dig, kala, chesta, drik, phalaChesta } = partial[p];
    const naisargika = NAISARGIKA_BALA[p];
    const total = sthana + dig + kala + chesta + naisargika + drik;
    const totalRupas = Number((total / 60).toFixed(2));
    const required = REQUIRED_RUPAS[p];
    const c = comps[p];
    result[p] = {
      planet: p,
      sthanaBala: r1(sthana),
      digBala: r1(dig),
      kaalaBala: r1(kala),
      chestaBala: r1(chesta),
      naisargikaBala: r1(naisargika),
      drikBala: r1(drik),
      totalVirupas: r1(total),
      totalRupas,
      requiredRupas: required,
      strengthRatio: Number((totalRupas / required).toFixed(2)),
      isStrong: totalRupas >= required,
      ishtaPhala: r1(Math.sqrt(Math.max(0, c.uccha * phalaChesta))),
      kashtaPhala: r1(Math.sqrt(Math.max(0, (60 - c.uccha) * (60 - phalaChesta)))),
      components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, r1(v)])) as unknown as ShadbalaComponents,
    };
  }
  [...PLANETS].sort((a, b) => result[b].strengthRatio - result[a].strengthRatio).forEach((p, i) => (result[p].rank = i + 1));
  return result;
}
