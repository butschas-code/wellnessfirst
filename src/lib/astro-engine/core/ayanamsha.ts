/**
 * Ayanamsha calculations supporting standard systems used across Vedic astrology:
 * - Lahiri (Chitrapaksha) - Official Indian Ephemeris standard (default)
 * - KP (Krishnamurti Padhdhati)
 * - Raman (B.V. Raman)
 * - Sayana (Tropical / Zero Ayanamsha)
 */

export type AyanamshaSystem = 'Lahiri' | 'KP' | 'Raman' | 'Sayana';

export function calculateJulianDay(date: Date): number {
  const time = date.getTime();
  // 86400000 ms in a day, Unix epoch is JD 2440587.5
  return time / 86400000 + 2440587.5;
}

export function calculateAyanamsha(
  date: Date,
  system: AyanamshaSystem = 'Lahiri'
): number {
  if (system === 'Sayana') return 0;

  const jd = calculateJulianDay(date);
  const t = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0

  // General precession in longitude since J2000 (IAU 2006, Capitaine et al.), degrees.
  const precessionSince2000 = (tc: number) =>
    (5028.796195 * tc + 1.1054348 * tc * tc + 0.00007964 * tc ** 3 - 0.000023857 * tc ** 4) / 3600;
  const precession = precessionSince2000(t);

  // Lahiri (Chitrapaksha), defined as in Swiss Ephemeris: 23.245524743° at JD 2435553.5 (1956-03-21).
  const T0_LAHIRI = (2435553.5 - 2451545.0) / 36525.0;
  const lahiri = 23.245524743 + precession - precessionSince2000(T0_LAHIRI);

  switch (system) {
    case 'Lahiri':
      return lahiri;
    case 'KP':
      // KP (new) ayanamsha: 5' 56" less than Lahiri.
      return lahiri - 0.098869;
    case 'Raman':
      // B.V. Raman: 22° 24' 35" at J2000.
      return lahiri - (23.857164 - 22.409722); // Raman: 22° 24' 35" at J2000
    default:
      return lahiri;
  }
}

export function calculateLahiriAyanamsha(date: Date): number {
  return calculateAyanamsha(date, 'Lahiri');
}

export function formatDegreesToDMS(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const d = Math.floor(normalized);
  const minFloat = (normalized - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60);

  return `${d}° ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}"`;
}
