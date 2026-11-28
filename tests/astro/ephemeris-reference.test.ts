/**
 * Planet positions against an independent reference.
 *
 * Reference: NASA JPL Horizons API (ssd.jpl.nasa.gov/api/horizons.api), fetched
 * 2026-11-28. Geocentric (CENTER 500@399), OBSERVER ephemeris, quantity 31
 * "ObsEcLon": apparent longitude (light-time, deflection, aberration) on the
 * true ecliptic and equinox of date, in degrees, times in UT.
 *
 * Our engine stores the tropical longitude on the mean equinox of date (it
 * removes nutation in longitude before subtracting the Lahiri ayanamsha), so
 * the comparison adds dpsi back. Measured worst case when this test was
 * written: 10.9″ (Saturn, 2001). Tolerance 30″, i.e. half an arcminute:
 * 1° of error shifts a played rate by only 1/360 of its band.
 *
 * The mean lunar node is checked against Meeus, Astronomical Algorithms
 * (2nd ed.), Example 47.a: Ω = 274.400656° on 1992 April 12, 0h TD.
 */
import { describe, expect, it } from 'vitest';
import { calculatePlanetaryPositions } from '../../src/lib/astro-engine/core/ephemeris';
import { earthTilt, meanNode } from '../../src/lib/astro-engine/core/precision';

const INSTANTS = ['1950-03-15T06:00Z', '1979-11-01T23:40Z', '1992-06-21T07:45Z', '2001-03-30T20:05Z', '2026-11-27T12:00Z', '2040-08-01T00:00Z'];

const HORIZONS: Record<string, number[]> = {
  Sun: [354.0887496, 218.951843, 90.1794222, 10.1792188, 245.2479061, 129.367223],
  Moon: [315.1940729, 8.2606813, 337.7966822, 79.5963847, 105.6930535, 52.3357061],
  Mercury: [342.4473364, 242.3874814, 111.2216985, 349.2451839, 227.1018256, 116.2264275],
  Venus: [311.5266374, 236.8784155, 92.2716683, 9.1137603, 206.199465, 146.2930463],
  Mars: [185.0574301, 141.3294688, 34.8909013, 260.2438488, 150.5991072, 171.5450779],
  Jupiter: [323.6192011, 155.8599702, 158.3469807, 67.412033, 146.6337798, 179.1370975],
  Saturn: [165.4125094, 173.3907788, 318.0388297, 57.6648308, 8.0958203, 187.6634608],
};

const TOLERANCE_ARCSEC = 30;
/** Signed difference a − b in arcseconds, across 0°/360°. */
const diffArcsec = (a: number, b: number) => ((((a - b + 540) % 360) + 360) % 360 - 180) * 3600;

describe('Planet positions vs JPL Horizons', () => {
  INSTANTS.forEach((iso, i) => {
    it(`${iso}: all seven planets within ${TOLERANCE_ARCSEC}″`, () => {
      const date = new Date(iso);
      const positions = calculatePlanetaryPositions(date, 0);
      const dpsi = earthTilt(date).dpsi;
      for (const [planet, ref] of Object.entries(HORIZONS)) {
        const ours = positions[planet as keyof typeof positions].tropicalLongitude + dpsi;
        const err = diffArcsec(ours, ref[i]);
        expect(Math.abs(err), `${planet} off by ${err.toFixed(1)}″`).toBeLessThan(TOLERANCE_ARCSEC);
      }
    });
  });
});

describe('Lunar node vs Meeus', () => {
  it('mean node, Example 47.a', () => {
    // 0h TD = 0h TT; ΔT in 1992 ≈ 59 s, so the UT instant is 59 s earlier.
    const date = new Date(Date.UTC(1992, 3, 12, 0, 0, 0) - 59_000);
    expect(Math.abs(meanNode(date) - 274.400656)).toBeLessThan(0.001);
  });
});
