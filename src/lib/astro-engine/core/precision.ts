import * as Astronomy from 'astronomy-engine';

/**
 * High-precision helpers shared by the ephemeris, ascendant and strength modules.
 *
 * Conventions (matching Swiss Ephemeris sidereal mode):
 *  - Bodies: apparent geocentric positions (light-time + aberration), true ecliptic of date.
 *  - Sidereal longitude = apparent tropical longitude − nutation in longitude − ayanamsha (mean equinox).
 *  - Lunar node: true (osculating) node by default; mean node available.
 */

const DEG = Math.PI / 180;
export const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Julian centuries (TT ≈ UT here; ΔT is handled inside astronomy-engine for body positions). */
export function centuriesJ2000(date: Date): number {
  return (date.getTime() / 86_400_000 + 2440587.5 - 2451545.0) / 36525;
}

export interface EarthTilt {
  /** Nutation in longitude, degrees. */
  dpsi: number;
  /** True obliquity of the ecliptic, degrees. */
  trueObliquity: number;
  /** Mean obliquity, degrees. */
  meanObliquity: number;
}

export function earthTilt(date: Date): EarthTilt {
  const t = Astronomy.e_tilt(Astronomy.MakeTime(date));
  return { dpsi: t.dpsi / 3600, trueObliquity: t.tobl, meanObliquity: t.mobl };
}

export interface ApparentBody {
  /** Apparent tropical longitude (true equinox & ecliptic of date), degrees. */
  longitude: number;
  /** Ecliptic latitude, degrees. */
  latitude: number;
  /** Declination (true equator of date), degrees. */
  declination: number;
  /** Right ascension (true equator of date), hours. */
  rightAscension: number;
}

export function apparentBody(body: Astronomy.Body, date: Date): ApparentBody {
  const vec = Astronomy.GeoVector(body, date, true); // EQJ, light-time + aberration
  const ecl = Astronomy.Ecliptic(vec); // → true ecliptic of date
  const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date), vec);
  const sph = Astronomy.SphereFromVector(eqd);
  return {
    longitude: norm360(ecl.elon),
    latitude: ecl.elat,
    declination: sph.lat,
    rightAscension: norm360(sph.lon) / 15,
  };
}

/** Lunar fundamental arguments (Meeus, ch. 47), degrees. */
function lunarArgs(t: number) {
  return {
    D: 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + (t * t * t) / 545868,
    M: 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + (t * t * t) / 24490000,
    Mp: 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + (t * t * t) / 69699,
    F: 93.272095 + 483202.0175233 * t - 0.0036539 * t * t - (t * t * t) / 3526000,
  };
}

/** Mean ascending node of the Moon (mean equinox of date), degrees. */
export function meanNode(date: Date): number {
  const t = centuriesJ2000(date);
  return norm360(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467441 - (t * t * t * t) / 60616000);
}

/** True (osculating) ascending node of the Moon (Meeus ch. 47 periodic terms), degrees. */
export function trueNode(date: Date): number {
  const t = centuriesJ2000(date);
  const { D, M, Mp, F } = lunarArgs(t);
  const s = (deg: number) => Math.sin(deg * DEG);
  return norm360(
    meanNode(date) - 1.4979 * s(2 * (D - F)) - 0.15 * s(M) - 0.1226 * s(2 * D) + 0.1176 * s(2 * F) - 0.0801 * s(2 * (Mp - F))
  );
}

/** Mean tropical longitudes (Meeus Table 31.A, mean equinox of date), degrees — used for Chesta Bala. */
export function meanLongitudes(date: Date) {
  const t = centuriesJ2000(date);
  return {
    Sun: norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t),
    Mercury: norm360(252.250906 + 149474.0722491 * t + 0.0003035 * t * t),
    Venus: norm360(181.979801 + 58519.2130302 * t + 0.00031014 * t * t),
    Mars: norm360(355.433 + 19141.6964471 * t + 0.00031052 * t * t),
    Jupiter: norm360(34.351519 + 3036.3027748 * t + 0.0002233 * t * t),
    Saturn: norm360(50.077444 + 1223.5110686 * t + 0.00051908 * t * t),
  };
}

/** Local apparent sidereal time in degrees. */
export function localSiderealDegrees(date: Date, longitude: number): number {
  return norm360(Astronomy.SiderealTime(date) * 15 + longitude);
}
