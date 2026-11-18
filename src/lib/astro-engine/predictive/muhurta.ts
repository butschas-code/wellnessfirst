import type { ComprehensiveKundliResult } from '../types.ts';
import { calculatePanchang } from '../panchang/panchang.ts';
import { calculateTimedChoghadiya, type SolarDay } from '../panchang/solar-day.ts';
import { calculatePlanetaryPositions } from '../core/ephemeris.ts';

/**
 * Muhurta finder — scans the coming days for the best windows for an activity.
 *
 * Classical filters (Muhurta Chintamani conventions):
 *  - Tithi: avoid Rikta (4, 9, 14) and Amavasya; prefer the bright fortnight for auspicious starts.
 *  - Nakshatra: activity-specific favourable stars.
 *  - Vara: activity-specific favourable weekdays (sunrise-based).
 *  - Karana: avoid Vishti (Bhadra).
 *  - Kharmas: no marriage or house-warming while the Sun is in sidereal Sagittarius or Pisces.
 *  - Personal: Tarabala and Chandrabala from the person's birth Moon.
 *  - Window: Abhijit (not on Wednesdays) or an Amrit/Shubh/Labh choghadiya, never overlapping Rahu Kalam.
 */

export type MuhurtaActivity = 'marriage' | 'moving' | 'travel' | 'venture' | 'contract' | 'learning';

const NAK = (names: string[]) => new Set(names);
export const MUHURTA_RULES: Record<MuhurtaActivity, { naks: Set<string>; days: number[]; kharmas: boolean; brightOnly: boolean }> = {
  marriage: { naks: NAK(['Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati']), days: [1, 3, 4, 5], kharmas: true, brightOnly: false },
  moving: { naks: NAK(['Rohini', 'Mrigashira', 'Uttara Phalguni', 'Chitra', 'Anuradha', 'Uttara Ashadha', 'Dhanishta', 'Shatabhisha', 'Uttara Bhadrapada', 'Revati']), days: [1, 3, 4, 5, 6], kharmas: true, brightOnly: true },
  travel: { naks: NAK(['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Anuradha', 'Shravana', 'Dhanishta', 'Revati']), days: [1, 3, 4, 5], kharmas: false, brightOnly: false },
  venture: { naks: NAK(['Ashwini', 'Rohini', 'Pushya', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati']), days: [3, 4, 5], kharmas: false, brightOnly: true },
  contract: { naks: NAK(['Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Shravana', 'Revati']), days: [1, 3, 4, 5], kharmas: false, brightOnly: false },
  learning: { naks: NAK(['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Revati']), days: [0, 3, 4], kharmas: false, brightOnly: false },
};

const TARA_GOOD = [false, true, false, true, false, true, false, true, true]; // Janma … Parama Mitra

export interface MuhurtaWindow {
  start: Date;
  end: Date;
  score: number; // 0–100
  weekday: number;
  tithi: string;
  tithiNumber: number;
  paksha: string;
  nakshatra: string;
  karana: string;
  windowKind: 'Abhijit' | 'Amrit' | 'Shubh' | 'Labh';
  reasons: string[];
  cautions: string[];
}

export function findMuhurtas(
  chart: ComprehensiveKundliResult,
  activity: MuhurtaActivity,
  opts: { from?: Date; days?: number; latitude: number; longitude: number; timeZone: string; limit?: number }
): MuhurtaWindow[] {
  const rule = MUHURTA_RULES[activity];
  const from = opts.from ?? new Date();
  const days = opts.days ?? 90;
  const birthNak = chart.planets.Moon.nakshatra.index;
  const birthMoonSign = chart.planets.Moon.sign.index;
  const results: MuhurtaWindow[] = [];

  for (let d = 0; d < days; d++) {
    // Evaluate each solar day at local noon-ish to get its sunrise frame.
    const probe = new Date(from.getTime() + d * 86_400_000 + 3_600_000);
    const day0 = calculatePanchang(probe, opts.latitude, opts.longitude, opts.timeZone);
    const solar = day0.solarDay as SolarDay;
    const mu = day0.muhuratTimes!;
    const slots = calculateTimedChoghadiya(solar).filter((s) => s.isDay && ['Amrit', 'Shubh', 'Labh'].includes(s.name));
    const overlapsRahu = (a: Date, b: Date) => a < mu.rahuKalam.end && b > mu.rahuKalam.start;

    const candidates: Array<{ start: Date; end: Date; kind: MuhurtaWindow['windowKind'] }> = [];
    if (solar.weekday !== 3) candidates.push({ start: mu.abhijitMuhurat.start, end: mu.abhijitMuhurat.end, kind: 'Abhijit' });
    for (const s of slots) candidates.push({ start: s.start, end: s.end, kind: s.name as MuhurtaWindow['windowKind'] });

    let best: MuhurtaWindow | null = null;
    for (const c of candidates) {
      if (c.end <= from || overlapsRahu(c.start, c.end)) continue;
      const mid = new Date((c.start.getTime() + c.end.getTime()) / 2);
      const p = calculatePanchang(mid, opts.latitude, opts.longitude, opts.timeZone);
      const sky = calculatePlanetaryPositions(mid, chart.ascendant.sign.index);
      const reasons: string[] = [];
      const cautions: string[] = [];
      let score = 50;

      const t = p.tithi.number;
      const inPaksha = ((t - 1) % 15) + 1;
      if ([4, 9, 14].includes(inPaksha) || t === 30) {
        score -= 40;
        cautions.push(t === 30 ? 'New Moon day (Amavasya)' : `Rikta tithi (${p.tithi.name})`);
      } else if (p.tithi.paksha === 'Shukla') {
        score += 10;
        reasons.push('Waxing Moon');
      } else if (rule.brightOnly) {
        score -= 10;
        cautions.push('Waning Moon');
      }

      if (rule.naks.has(p.nakshatra.name)) {
        score += 20;
        reasons.push(`Favourable star (${p.nakshatra.name})`);
      } else {
        score -= 15;
      }
      if (rule.days.includes(solar.weekday)) {
        score += 8;
        reasons.push('Favourable weekday');
      }
      if (p.karana.name === 'Vishti') {
        score -= 30;
        cautions.push('Vishti (Bhadra) karana');
      }
      if (rule.kharmas && [8, 11].includes(sky.Sun.sign.index)) {
        score -= 45;
        cautions.push('Kharmas — Sun in Sagittarius/Pisces');
      }
      const tara = ((sky.Moon.nakshatra.index - birthNak + 27) % 27) % 9;
      if (TARA_GOOD[tara]) {
        score += 10;
        reasons.push('Good for your birth star (Tarabala)');
      } else {
        score -= 12;
        cautions.push('Weak Tarabala for you');
      }
      const ch = ((sky.Moon.sign.index - birthMoonSign + 12) % 12) + 1;
      if ([1, 3, 6, 7, 10, 11].includes(ch)) {
        score += 8;
        reasons.push('Moon well placed for you (Chandrabala)');
      } else {
        score -= 8;
      }
      if (c.kind === 'Abhijit') {
        score += 6;
        reasons.push('Abhijit — the midday window');
      } else if (c.kind === 'Amrit') {
        score += 5;
      }

      score = Math.max(0, Math.min(100, score));
      const w: MuhurtaWindow = {
        start: c.start, end: c.end, score, weekday: solar.weekday,
        tithi: p.tithi.name, tithiNumber: t, paksha: p.tithi.paksha, nakshatra: p.nakshatra.name, karana: p.karana.name,
        windowKind: c.kind, reasons, cautions,
      };
      if (!best || w.score > best.score) best = w;
    }
    if (best && best.score >= 60 && !results.some((r) => r.start.getTime() === best!.start.getTime())) results.push(best);
  }
  // Keep the best-scoring windows, then present them in date order.
  return results
    .sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime())
    .slice(0, opts.limit ?? 8)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
