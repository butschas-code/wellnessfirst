/**
 * Shadbala against the classic worked example: B.V. Raman, "Graha and Bhava
 * Balas", the Standard Horoscope (female, 16 October 1918, 2h 6m 16s p.m. LMT,
 * 13° N, 5h 10m 20s E = 77°35'05" E). Values from Examples 13–56.
 *
 * Raman's own nirayana longitudes are fed in (his ayanamsha and ephemeris
 * differ from ours by about 1.4°), so this tests the Shadbala rules, not the
 * ephemeris (see ephemeris-reference.test.ts for that).
 *
 * Measured when this test was written (ours − Raman, virupas):
 *   Dig ≤ 0.09 · Sthana ≤ 0.02 · Drik ≤ 0.05 · Naisargika exact (Raman rounds
 *   to 2 decimals) · Kala ≤ 1.18 (Jupiter) · totals ≤ 0.07 rupa (Mercury).
 *   Abda Saturn, Masa Mercury, Vara Mercury, Hora Moon: identical.
 *
 * Remaining differences, from tables rather than rules:
 *  - Ayana bala (inside Kala): Raman reads kranti from printed tables; we
 *    compute the declination of the ecliptic point from the true obliquity.
 *  - Chesta bala of Mercury: 6.6 vs 2.30. Raman's Seeghrochcha of Mercury
 *    (Example 47: 174.49° nirayana) comes from traditional mean-motion tables
 *    and sits ~12° from the modern mean heliocentric longitude we use, so the
 *    chesta kendra differs by ~13°. Jupiter, Venus and Saturn agree within 0.8.
 *    Raman does not print a readable Chesta for Mars in this scan.
 */
import { describe, expect, it } from 'vitest';
import { calculateJanamKundli } from '../../src/lib/astro-engine/index';
import { calculateShadbala, ahargana } from '../../src/lib/astro-engine/core/shadbala';
import { ZODIAC_SIGNS } from '../../src/lib/astro-engine/core/constants';

const dms = (d: number, m: number, s = 0) => d + m / 60 + s / 3600;
const BIRTH = new Date(Date.UTC(1918, 9, 16, 8, 55, 56)); // 14:06:16 LMT − 5:10:20
const CTX = { latitude: 13, longitude: dms(77, 35, 5), timezone: dms(5, 10, 20) };

const RAMAN_LON: Record<string, number> = {
  Sun: dms(180, 53, 55), Moon: dms(311, 17, 19), Mars: dms(229, 30, 34), Mercury: dms(181, 31, 34),
  Jupiter: dms(84, 0, 49), Venus: dms(171, 9, 56), Saturn: dms(124, 22, 41), Rahu: dms(234, 23, 47), Ketu: dms(54, 23, 47),
};
const ASC = dms(298, 27);
const MC = dms(216, 30);

type P = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

/** Raman's values in virupas (null where the scan of the book is unreadable). */
const RAMAN: Record<P, { dig: number; naisargika: number; sthana: number | null; kala: number; chesta: number | null; drik: number; rupas: number | null }> = {
  Sun: { dig: 48.1, naisargika: 60, sthana: 198.0, kala: 102.98, chesta: 0, drik: 15.86, rupas: 7.08 },
  Moon: { dig: 31.56, naisargika: 51.43, sthana: null, kala: 202.04, chesta: 0, drik: -21.73, rupas: null },
  Mars: { dig: 55.7, naisargika: 17.14, sthana: null, kala: 30.06, chesta: null, drik: 0.95, rupas: null },
  Mercury: { dig: 21.09, naisargika: 25.7, sthana: 279.5, kala: 192.79, chesta: 2.3, drik: 15.64, rupas: 8.95 },
  Jupiter: { dig: 11.5, naisargika: 34.28, sthana: 157.58, kala: 211.18, chesta: 35.26, drik: -16.04, rupas: 7.23 },
  Venus: { dig: 15.15, naisargika: 42.85, sthana: 178.2, kala: 115.53, chesta: 5.95, drik: 18.47, rupas: 6.27 },
  Saturn: { dig: 58.02, naisargika: 8.57, sthana: 177.3, kala: 116.97, chesta: 21.14, drik: 7.21, rupas: 6.49 },
};

/** Our chart for the moment, with Raman's longitudes, signs, houses and in-sign degrees put in. */
function ramanShadbala() {
  const chart = calculateJanamKundli({ date: BIRTH, ...CTX });
  const ascSign = Math.floor(ASC / 30);
  const ascendant = { ...chart.ascendant, siderealLongitude: ASC, midheavenSidereal: MC, sign: ZODIAC_SIGNS[ascSign] };
  const planets = Object.fromEntries(
    Object.entries(chart.planets).map(([name, pos]) => {
      const L = RAMAN_LON[name] ?? pos.siderealLongitude;
      const sign = Math.floor(L / 30);
      return [name, { ...pos, siderealLongitude: L, sign: ZODIAC_SIGNS[sign], degreeInSign: L - sign * 30, house: ((sign - ascSign + 12) % 12) + 1 }];
    })
  );
  return calculateShadbala(ascendant as typeof chart.ascendant, planets as typeof chart.planets, BIRTH, CTX);
}

const sb = ramanShadbala();
const PLANETS = Object.keys(RAMAN) as P[];

describe('Shadbala vs Raman, Standard Horoscope', () => {
  it('ahargana of the birth day is 714,404,130,045 (Example 20)', () => {
    expect(ahargana(BIRTH, CTX.timezone)).toBe(714_404_130_045);
  });

  it('time lords: Abda Saturn, Masa Mercury, Vara Mercury, Hora Moon', () => {
    expect(sb.Saturn.components!.abda).toBe(15);
    expect(sb.Mercury.components!.masa).toBe(30);
    expect(sb.Mercury.components!.vara).toBe(45);
    expect(sb.Moon.components!.hora).toBe(60);
    for (const p of PLANETS) {
      if (p !== 'Saturn') expect(sb[p].components!.abda, p).toBe(0);
      if (p !== 'Mercury') expect(sb[p].components!.masa, p).toBe(0);
    }
  });

  it('Dig bala within 0.2 virupa', () => {
    for (const p of PLANETS) expect(Math.abs(sb[p].digBala - RAMAN[p].dig), p).toBeLessThan(0.2);
  });

  it('Naisargika bala within 0.1 virupa', () => {
    for (const p of PLANETS) expect(Math.abs(sb[p].naisargikaBala - RAMAN[p].naisargika), p).toBeLessThan(0.1);
  });

  it('Sthana bala within 1 virupa', () => {
    for (const p of PLANETS) {
      const ref = RAMAN[p].sthana;
      if (ref !== null) expect(Math.abs(sb[p].sthanaBala - ref), p).toBeLessThan(1);
    }
  });

  it('Kala bala within 1.5 virupas (Ayana from computed kranti)', () => {
    for (const p of PLANETS) expect(Math.abs(sb[p].kaalaBala - RAMAN[p].kala), `${p}: ${sb[p].kaalaBala}`).toBeLessThan(1.5);
  });

  it('Mercury, combust, counts as a malefic: Paksha 16.54', () => {
    expect(Math.abs(sb.Mercury.components!.paksha - 16.54)).toBeLessThan(0.2);
  });

  it('Chesta bala within 1 virupa; none for the Sun and Moon; Mercury within 5 (table difference, see header)', () => {
    for (const p of PLANETS) {
      const ref = RAMAN[p].chesta;
      if (ref !== null) expect(Math.abs(sb[p].chestaBala - ref), `${p}: ${sb[p].chestaBala}`).toBeLessThan(p === 'Mercury' ? 5 : 1);
    }
  });

  it('Drik bala within 0.2 virupa', () => {
    for (const p of PLANETS) expect(Math.abs(sb[p].drikBala - RAMAN[p].drik), `${p}: ${sb[p].drikBala}`).toBeLessThan(0.2);
  });

  it('totals within 0.1 rupa; Mars weakest, Mercury strongest by rupas', () => {
    for (const p of PLANETS) {
      const ref = RAMAN[p].rupas;
      if (ref !== null) expect(Math.abs(sb[p].totalRupas - ref), `${p}: ${sb[p].totalRupas}`).toBeLessThan(0.1);
    }
    const byRupas = [...PLANETS].sort((a, b) => sb[a].totalRupas - sb[b].totalRupas);
    expect(byRupas[0]).toBe('Mars');
    expect(byRupas[byRupas.length - 1]).toBe('Mercury');
  });
});
