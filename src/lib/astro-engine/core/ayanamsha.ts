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

  // Base Lahiri Ayanamsha at J2000.0 (23° 51' 25.53")
  const lahiri = 23.85709167 + 1.39604167 * t + 0.000308 * t * t;

  switch (system) {
    case 'Lahiri':
      return lahiri;
    case 'KP':
      // KP Ayanamsha is approximately 5 minutes 56 seconds (~0.0989°) less than Lahiri
      return lahiri - 0.09888889;
    case 'Raman':
      // Raman Ayanamsha uses 397 AD as zero year (~1.447° less than Lahiri at J2000)
      return 22.40972222 + 1.39604167 * t + 0.000308 * t * t;
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
