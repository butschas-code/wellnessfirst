export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu';

export type ZodiacSignName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type SanskritSignName =
  | 'Mesha'
  | 'Vrishabha'
  | 'Mithuna'
  | 'Karka'
  | 'Simha'
  | 'Kanya'
  | 'Tula'
  | 'Vrishchika'
  | 'Dhanu'
  | 'Makara'
  | 'Kumbha'
  | 'Meena';

export type ElementType = 'Fire' | 'Earth' | 'Air' | 'Water';
export type ModalityType = 'Chara' | 'Sthira' | 'Dwisvabhava';
export type DignityType =
  | 'Exalted'
  | 'Moolatrikona'
  | 'OwnSign'
  | 'Friendly'
  | 'Neutral'
  | 'Enemy'
  | 'Debilitated';

export type AyanamshaSystem = 'Lahiri' | 'KP' | 'Raman' | 'Sayana';

export interface ZodiacSignInfo {
  index: number; // 0..11
  name: ZodiacSignName;
  sanskrit: SanskritSignName;
  lord: PlanetName;
  element: ElementType;
  modality: ModalityType;
  startDegree: number;
  endDegree: number;
}

export interface NakshatraInfo {
  index: number; // 0..26
  name: string;
  sanskrit: string;
  lord: PlanetName;
  startDegree: number;
  endDegree: number;
  deity: string;
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  yoni: string;
  nadi: 'Adi' | 'Madhya' | 'Antya';
  symbol: string;
}

export interface KPPosition {
  longitude: number;
  signLord: PlanetName;
  starLord: PlanetName;
  subLord: PlanetName;
  subSubLord: PlanetName;
  formatted: string;
}

export interface PlanetPosition {
  name: PlanetName;
  sanskrit: string;
  tropicalLongitude: number;
  siderealLongitude: number;
  sign: ZodiacSignInfo;
  degreeInSign: number;
  formattedDegree: string;
  house: number; // 1..12
  nakshatra: NakshatraInfo;
  nakshatraPada: number; // 1..4
  speed: number;
  isRetrograde: boolean;
  dignity: DignityType;
  /** Five-fold compound relationship with the sign lord (natural + temporal). */
  compoundRelation?: CompoundRelation;
  /** Ecliptic latitude, degrees. */
  latitude?: number;
  /** Declination (true equator of date), degrees. */
  declination?: number;
  kp?: KPPosition;
}

export type CompoundRelation = 'GreatFriend' | 'Friend' | 'Neutral' | 'Enemy' | 'GreatEnemy' | 'Self';
export type NodeType = 'true' | 'mean';

export interface AscendantInfo {
  tropicalLongitude: number;
  siderealLongitude: number;
  sign: ZodiacSignInfo;
  degreeInSign: number;
  formattedDegree: string;
  nakshatra: NakshatraInfo;
  nakshatraPada: number;
  /** Sidereal longitude of the Midheaven (MC), degrees. */
  midheavenSidereal?: number;
  kp?: KPPosition;
}

export interface HouseInfo {
  houseNumber: number; // 1..12
  sign: ZodiacSignInfo;
  cuspLongitude: number;
  planets: PlanetName[];
}

export interface DivisionalChartPlacement {
  planet: PlanetName | 'Ascendant';
  sign: ZodiacSignInfo;
  harmonicDegree: number;
}

export interface DivisionalChart {
  id: string; // 'D1' | 'D9' | 'D10' etc.
  name: string;
  description: string;
  placements: DivisionalChartPlacement[];
}

export interface DashaPeriod {
  lord: PlanetName;
  startDate: Date;
  endDate: Date;
  durationYears: number;
  antardashas?: DashaPeriod[];
  pratyantardashas?: DashaPeriod[];
}

export interface VimshottariDashaResult {
  birthLord: PlanetName;
  birthBalanceYears: number;
  mahadashas: DashaPeriod[];
  currentDasha: {
    mahadasha: DashaPeriod;
    antardasha: DashaPeriod;
    pratyantardasha?: DashaPeriod;
    sookshmaDasha?: DashaPeriod;
    praanaDasha?: DashaPeriod;
  };
}

export interface PanchangResult {
  date: Date;
  tithi: {
    number: number;
    name: string;
    paksha: 'Shukla' | 'Krishna';
    percentageElapsed: number;
  };
  vara: {
    name: string;
    lord: PlanetName;
  };
  nakshatra: {
    name: string;
    number: number;
    lord: PlanetName;
    pada: number;
  };
  yoga: {
    name: string;
    number: number;
  };
  karana: {
    name: string;
    number: number;
  };
  muhurats: {
    rahuKalam: { start: string; end: string };
    yamagandam: { start: string; end: string };
    gulikaKalam: { start: string; end: string };
    abhijitMuhurat: { start: string; end: string };
  };
  /** Sunrise-to-sunrise day at the observer's location. */
  solarDay?: import('./panchang/solar-day.ts').SolarDay;
  /** Exact muhurat instants (Date objects). */
  muhuratTimes?: import('./panchang/solar-day.ts').DayMuhurats;
}

export interface DoshaAnalysis {
  manglik: {
    isManglik: boolean;
    severity: 'None' | 'Low' | 'Medium' | 'High';
    factors: string[];
    cancellations: string[];
  };
  sadeSati: {
    isActive: boolean;
    phase: 'None' | 'Rising (1st phase)' | 'Peak (2nd phase)' | 'Setting (3rd phase)';
    saturnSign: ZodiacSignName;
    moonSign: ZodiacSignName;
    description: string;
  };
  kaalSarp: {
    isKaalSarp: boolean;
    type?: string;
    direction?: 'Ascending' | 'Descending';
  };
}

export interface AshtakootaCategoryScore {
  name: string;
  maxScore: number;
  obtainedScore: number;
  description: string;
}

export interface AshtakootaResult {
  totalScore: number;
  maxScore: 36;
  percentage: number;
  verdict: 'Excellent' | 'Good' | 'Average' | 'Challenging';
  categories: {
    varna: AshtakootaCategoryScore;
    vashya: AshtakootaCategoryScore;
    tara: AshtakootaCategoryScore;
    yoni: AshtakootaCategoryScore;
    grahaMaitri: AshtakootaCategoryScore;
    gana: AshtakootaCategoryScore;
    bhakoot: AshtakootaCategoryScore;
    nadi: AshtakootaCategoryScore;
  };
}

export interface ComprehensiveKundliResult {
  calculationTime: Date;
  birthDetails: {
    date: Date;
    latitude: number;
    longitude: number;
    timezone: number;
  };
  ayanamsha: {
    name: AyanamshaSystem;
    valueDegrees: number;
    formatted: string;
  };
  ascendant: AscendantInfo;
  planets: Record<PlanetName, PlanetPosition>;
  houses: HouseInfo[];
  shodashvarga: Record<string, DivisionalChart>; // All 16 divisional charts D1..D60
  ashtakavarga: any; // Sarvashtakavarga & Bhinnashtakavarga (337 points)
  shadbala: any; // Six-fold strengths in Rupas and Virupas
  bhavaChalit: any; // House midpoints & planet shifts
  jaimini: any; // Chara Karakas (AK, AmK) & Arudha Padas (AL, UL)
  upagrahas: any; // Gulika, Mandi, Dhuma, etc.
  aspects: any; // Vedic Drishtis (special aspects)
  yogas: any[]; // Detected classical Yogas
  extendedYogas?: import('./predictive/yogas-extended.ts').ExtendedYoga[];
  vimshopaka?: Record<string, import('./core/vimshopaka-bhava.ts').VimshopakaResult>;
  bhavaBala?: import('./core/vimshopaka-bhava.ts').BhavaBalaResult[];
  dasha: VimshottariDashaResult;
  doshas: DoshaAnalysis;
  elementBalance: {
    Fire: number;
    Earth: number;
    Air: number;
    Water: number;
  };
}

export type JanamKundliResult = ComprehensiveKundliResult;
