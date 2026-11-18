import { calculateAscendant } from './core/ascendant.ts';
import { calculatePlanetaryPositions } from './core/ephemeris.ts';
import { calculateAyanamsha, formatDegreesToDMS } from './core/ayanamsha.ts';
import { calculateHouses } from './core/divisional.ts';
import { calculateAllShodashvarga } from './core/shodashvarga.ts';
import { calculateAshtakavarga } from './core/ashtakavarga.ts';
import { calculateShadbala } from './core/shadbala.ts';
import { calculateKP } from './core/kp.ts';
import { calculateJaimini } from './core/jaimini.ts';
import { calculateUpagrahas } from './core/upagrahas.ts';
import { calculateBhavaChalit } from './core/bhavachalit.ts';
import { calculateVedicAspects } from './core/aspects.ts';
import { calculateVimshottariDasha } from './predictive/dasha.ts';
import { analyzeDoshas } from './predictive/doshas.ts';
import { detectYogas } from './predictive/yogas.ts';
import { calculateGocharaTransits } from './predictive/transits.ts';
import { calculatePanchang } from './panchang/panchang.ts';
import { calculateChoghadiya } from './panchang/choghadiya.ts';
import { calculateSolarDay, calculateTimedChoghadiya, calculateDayMuhurats } from './panchang/solar-day.ts';
import { detectExtendedYogas } from './predictive/yogas-extended.ts';
import { calculateVimshopaka, calculateBhavaBala } from './core/vimshopaka-bhava.ts';
import { calculateYoginiDasha, calculateAshtottariDasha, calculateCharaDasha } from './predictive/dasha-systems.ts';
import { calculateVarshaphal, solarReturn } from './annual/varshaphal.ts';
import { calculateKPAnalysis, calculateRulingPlanets, placidusCusps } from './core/kp-system.ts';
import { findMuhurtas, MUHURTA_RULES } from './predictive/muhurta.ts';
import { calculateAshtakoota } from './matching/ashtakoota.ts';
import { calculateElementBalance, generateTempoGuidance } from './wellness/tempo.ts';
import { calculatePrashnaKundli } from './prashna/prashna.ts';
import { calculateDerivedChart } from './relational/bhavatbhavam.ts';
import { calculateProgenyAnalysis } from './relational/progeny.ts';
import { calculateRelationalSynastry } from './relational/synastry.ts';

import type {
  ComprehensiveKundliResult,
  AyanamshaSystem,
  PlanetName,
  NodeType,
} from './types.ts';

export interface ChartCalculationParams {
  date: Date; // UTC date instance
  latitude: number; // e.g. 28.6139 (Delhi) or 51.5074 (London)
  longitude: number; // e.g. 77.2090 or -0.1278
  timezone?: number; // offset in hours e.g. 5.5 for IST
  targetDate?: Date; // date for which active dasha / transits are evaluated (defaults to now)
  ayanamshaSystem?: AyanamshaSystem; // defaults to 'Lahiri'
  nodeType?: NodeType; // 'true' (default) or 'mean' lunar node for Rahu/Ketu
}

/**
 * Enterprise-grade Vedic Astrology & Cosmic Tempo Engine.
 * Covers full state-of-the-art complexities:
 * - Multi-Ayanamsha (Lahiri, KP, Raman, Sayana)
 * - Complete 16 Shodashvarga divisional charts (D1 to D60)
 * - Complete Sarvashtakavarga (337 points) & Bhinnashtakavarga
 * - 6-Fold Shadbala in Rupas and Virupas
 * - KP System (Sign Lord, Star Lord, Sub Lord, Sub-Sub Lord)
 * - Jaimini 7 Chara Karakas (AK..DK) & Arudha Padas (AL, UL, A1..A12)
 * - Upagrahas & Invisible points (Gulika, Mandi, Dhuma, etc.)
 * - Sripathi Bhava Chalit with house shift detection
 * - Vishesha Drishtis (Special Vedic aspects for Mars, Jupiter, Saturn, Rahu, Ketu)
 * - 50+ Classical Yogas with cancellations (Neechabhanga Raja Yoga, etc.)
 * - 5-Level Vimshottari Dasha (Mahadasha down to Praana Dasha)
 * - Real-Time Sky Transits (Gochara) with SAV scoring and Vedha obstruction checks
 * - Time & Place of Asking Engine (Prashna Kundli / Horary with Tajika Ithasala/Esharpha yogas)
 * - Relational Derived Charts (Bhavat Bhavam for Spouses, Children, Parents)
 * - Fertility & Progeny Sphutas (Beeja Sphuta & Kshetra Sphuta with D7 harmonic check)
 * - Cross-Chart Synastry Overlays, Composite Midpoints & Mutual Dasha Pacing
 * - Daily Real-time Panchang & Choghadiya Muhurats
 * - 36 Guna Ashtakoota Milan
 * - Proprietary WellnessFirst Tempo translation layer
 */
export function calculateJanamKundli(
  params: ChartCalculationParams
): ComprehensiveKundliResult {
  const {
    date,
    latitude,
    longitude,
    timezone = 0,
    targetDate = new Date(),
    ayanamshaSystem = 'Lahiri',
    nodeType = 'true',
  } = params;

  // 1. Calculate Ayanamsha
  const ayanamshaVal = calculateAyanamsha(date, ayanamshaSystem);

  // 2. Calculate Sidereal Ascendant (Lagna)
  const ascendant = calculateAscendant(date, latitude, longitude);
  ascendant.kp = calculateKP(ascendant.siderealLongitude);

  // 3. Calculate Planetary Placements (Navagrahas) & KP Lords
  const planets = calculatePlanetaryPositions(date, ascendant.sign.index, nodeType);
  for (const pName of Object.keys(planets) as PlanetName[]) {
    planets[pName].kp = calculateKP(planets[pName].siderealLongitude);
  }

  // 4. Generate Houses (Whole Sign System)
  const houses = calculateHouses(ascendant.sign.index, ascendant.siderealLongitude, planets);

  // 5. Complete Shodashvarga (All 16 Divisional Charts D1..D60)
  const shodashvarga = calculateAllShodashvarga(ascendant, planets);

  // 6. Complete Ashtakavarga (Sarvashtakavarga 337 pts + BAV for 7 planets)
  const planetSignIndices = {
    Sun: planets.Sun.sign.index,
    Moon: planets.Moon.sign.index,
    Mars: planets.Mars.sign.index,
    Mercury: planets.Mercury.sign.index,
    Jupiter: planets.Jupiter.sign.index,
    Venus: planets.Venus.sign.index,
    Saturn: planets.Saturn.sign.index,
    Rahu: planets.Rahu.sign.index,
    Ketu: planets.Ketu.sign.index,
  };
  const ashtakavarga = calculateAshtakavarga(ascendant.sign.index, planetSignIndices);

  // 7. Complete Shadbala (Six-Fold Strengths)
  const shadbala = calculateShadbala(ascendant, planets, date, { latitude, longitude, timezone });

  // 8. Bhava Chalit Chart & House Shift Detection
  const bhavaChalit = calculateBhavaChalit(ascendant, planets);

  // 9. Jaimini 7 Chara Karakas & Arudha Padas
  const jaimini = calculateJaimini(ascendant.sign.index, planets);

  // 10. Upagrahas (Gulika, Mandi, Dhuma, Vyatipata, Parivesha, Indrachapa, Upaketu)
  const upagrahas = calculateUpagrahas(planets.Sun, ascendant, date);

  // 11. Vedic Aspects (Special Drishtis)
  const aspects = calculateVedicAspects(planets);

  // 12. Classical Yogas (core set + extended library graded by Shadbala)
  const extendedYogas = detectExtendedYogas(ascendant, planets, shadbala as any);
  const yogas = detectYogas(ascendant, planets);
  const vimshopaka = calculateVimshopaka(planets);
  const bhavaBala = calculateBhavaBala(ascendant, planets, shadbala as any);

  // 13. Deep 5-Level Vimshottari Dasha
  const dasha = calculateVimshottariDasha(planets.Moon.siderealLongitude, date, targetDate);

  // 14. Current Saturn Sign for Sade Sati calculation
  const currentPlanets = calculatePlanetaryPositions(targetDate, ascendant.sign.index);
  const currentSaturnSignIndex = currentPlanets.Saturn.sign.index;

  // 15. Classical Doshas (Manglik, Sade Sati, Kaal Sarp)
  const doshas = analyzeDoshas(ascendant, planets, currentSaturnSignIndex);

  // 16. Elemental Constitution Balance
  const elementBalance = calculateElementBalance(ascendant.sign.element, planets);

  return {
    calculationTime: new Date(),
    birthDetails: {
      date,
      latitude,
      longitude,
      timezone,
    },
    ayanamsha: {
      name: ayanamshaSystem,
      valueDegrees: ayanamshaVal,
      formatted: formatDegreesToDMS(ayanamshaVal),
    },
    ascendant,
    planets,
    houses,
    shodashvarga,
    ashtakavarga,
    shadbala,
    bhavaChalit,
    jaimini,
    upagrahas,
    aspects,
    yogas,
    extendedYogas,
    vimshopaka,
    bhavaBala,
    dasha,
    doshas,
    elementBalance,
  };
}

export {
  calculatePanchang,
  calculateChoghadiya,
  calculateSolarDay,
  calculateTimedChoghadiya,
  calculateDayMuhurats,
  calculateAshtakoota,
  detectYogas,
  calculateShadbala,
  calculateAshtakavarga,
  calculateKP,
  calculateJaimini,
  calculateBhavaChalit,
  calculateUpagrahas,
  calculateVedicAspects,
  calculateAllShodashvarga,
  generateTempoGuidance,
  calculateAyanamsha,
  calculateAscendant,
  calculateGocharaTransits,
  calculatePrashnaKundli,
  calculateDerivedChart,
  calculateProgenyAnalysis,
  calculateRelationalSynastry,
  detectExtendedYogas,
  calculateVimshopaka,
  calculateBhavaBala,
  calculateYoginiDasha,
  calculateAshtottariDasha,
  calculateCharaDasha,
  calculateVarshaphal,
  solarReturn,
  calculateKPAnalysis,
  calculateRulingPlanets,
  placidusCusps,
  findMuhurtas,
  MUHURTA_RULES,
  calculatePlanetaryPositions,
};

export {
  processAstroQuestion,
  classifyQuestionIntent,
  type AstroQAResult,
  type QATopic,
} from './predictive/qa-matrix.ts';

export * from './types.ts';
export * from './core/constants.ts';
export type { SolarDay, TimedSlot, DayMuhurats } from './panchang/solar-day.ts';
export type { ExtendedYoga } from './predictive/yogas-extended.ts';
export type { VimshopakaResult, BhavaBalaResult } from './core/vimshopaka-bhava.ts';
export type { DashaSystemResult, GenericPeriod } from './predictive/dasha-systems.ts';
export type { VarshaphalResult, MuddaPeriod } from './annual/varshaphal.ts';
export type { KPAnalysis, KPCusp, KPSignificators, RulingPlanets } from './core/kp-system.ts';
export type { MuhurtaActivity, MuhurtaWindow } from './predictive/muhurta.ts';
