import { VIMSHOTTARI_DASHA_CYCLE } from '../core/constants.ts';
import { getNakshatraPlacement } from '../core/nakshatra.ts';
import type {
  DashaPeriod,
  VimshottariDashaResult,
} from '../types.ts';

const MS_PER_YEAR = 365.2425 * 24 * 3600 * 1000;

export interface DeepDashaHierarchy {
  mahadasha: DashaPeriod;
  antardasha: DashaPeriod;
  pratyantardasha: DashaPeriod;
  sookshmaDasha: DashaPeriod;
  praanaDasha: DashaPeriod;
}

export function calculateVimshottariDasha(
  moonSiderealLongitude: number,
  birthDate: Date,
  targetDate: Date = new Date()
): VimshottariDashaResult & { deepHierarchy?: DeepDashaHierarchy } {
  const nakPlacement = getNakshatraPlacement(moonSiderealLongitude);
  const birthLord = nakPlacement.nakshatra.lord;

  // Percentage of nakshatra remaining at birth
  const fractionElapsed = nakPlacement.degreeInNakshatra / (360 / 27);
  const fractionRemaining = 1 - fractionElapsed;

  // Find index of birth lord in 9-planet cycle
  const cycleStartIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex(
    (item) => item.lord === birthLord
  );

  const birthLordCycleItem = VIMSHOTTARI_DASHA_CYCLE[cycleStartIndex];
  const birthBalanceYears = birthLordCycleItem.years * fractionRemaining;

  const mahadashas: DashaPeriod[] = [];
  // The first Mahadasha began before birth: its elapsed part is (1 − fraction remaining) of its full length.
  // Starting from that true start keeps every Antardasha at its classical full length.
  const elapsedYears = birthLordCycleItem.years - birthBalanceYears;
  let currentPointer = new Date(birthDate.getTime() - elapsedYears * MS_PER_YEAR);

  // Generate 120 years of Mahadashas starting from birth lord
  for (let i = 0; i < VIMSHOTTARI_DASHA_CYCLE.length; i++) {
    const cycleIndex = (cycleStartIndex + i) % VIMSHOTTARI_DASHA_CYCLE.length;
    const item = VIMSHOTTARI_DASHA_CYCLE[cycleIndex];

    const durationYears = item.years;
    const durationMs = durationYears * MS_PER_YEAR;
    const endDate = new Date(currentPointer.getTime() + durationMs);

    const period: DashaPeriod = {
      lord: item.lord,
      startDate: new Date(currentPointer.getTime()),
      endDate: new Date(endDate.getTime()),
      durationYears,
      antardashas: [],
    };

    // Calculate Antardashas (Sub-periods) for this Mahadasha
    const mdLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === item.lord);
    let adPointer = new Date(period.startDate.getTime());

    for (let j = 0; j < VIMSHOTTARI_DASHA_CYCLE.length; j++) {
      const adIndex = (mdLordIndex + j) % VIMSHOTTARI_DASHA_CYCLE.length;
      const adItem = VIMSHOTTARI_DASHA_CYCLE[adIndex];

      const nominalAdYears = (item.years * adItem.years) / 120;
      const effectiveAdYears = nominalAdYears;
      const adMs = effectiveAdYears * MS_PER_YEAR;
      const adEnd = new Date(adPointer.getTime() + adMs);

      const antardasha: DashaPeriod = {
        lord: adItem.lord,
        startDate: new Date(adPointer.getTime()),
        endDate: new Date(adEnd.getTime()),
        durationYears: effectiveAdYears,
      };

      period.antardashas?.push(antardasha);
      adPointer = adEnd;
    }

    mahadashas.push(period);
    currentPointer = endDate;
  }

  // Determine active Mahadasha and Antardasha at targetDate
  let activeMd = mahadashas[0];
  for (const md of mahadashas) {
    if (targetDate >= md.startDate && targetDate <= md.endDate) {
      activeMd = md;
      break;
    }
  }

  let activeAd = activeMd.antardashas?.[0] || activeMd;
  if (activeMd.antardashas) {
    for (const ad of activeMd.antardashas) {
      if (targetDate >= ad.startDate && targetDate <= ad.endDate) {
        activeAd = ad;
        break;
      }
    }
  }

  // Calculate 3rd level: Pratyantardasha for active Antardasha
  const adLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === activeAd.lord);
  let pdPointer = new Date(activeAd.startDate.getTime());
  let activePd: DashaPeriod = { ...activeAd, durationYears: activeAd.durationYears / 12 };

  for (let k = 0; k < VIMSHOTTARI_DASHA_CYCLE.length; k++) {
    const pdIndex = (adLordIndex + k) % VIMSHOTTARI_DASHA_CYCLE.length;
    const pdItem = VIMSHOTTARI_DASHA_CYCLE[pdIndex];
    const pdYears = (activeAd.durationYears * pdItem.years) / 120;
    const pdMs = pdYears * MS_PER_YEAR;
    const pdEnd = new Date(pdPointer.getTime() + pdMs);

    const pdPeriod: DashaPeriod = {
      lord: pdItem.lord,
      startDate: new Date(pdPointer.getTime()),
      endDate: new Date(pdEnd.getTime()),
      durationYears: pdYears,
    };

    if (targetDate >= pdPeriod.startDate && targetDate <= pdPeriod.endDate) {
      activePd = pdPeriod;
    }
    pdPointer = pdEnd;
  }

  // Calculate 4th level: Sookshma Dasha
  const pdLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === activePd.lord);
  let sdPointer = new Date(activePd.startDate.getTime());
  let activeSd: DashaPeriod = { ...activePd, durationYears: activePd.durationYears / 12 };

  for (let m = 0; m < VIMSHOTTARI_DASHA_CYCLE.length; m++) {
    const sdIndex = (pdLordIndex + m) % VIMSHOTTARI_DASHA_CYCLE.length;
    const sdItem = VIMSHOTTARI_DASHA_CYCLE[sdIndex];
    const sdYears = (activePd.durationYears * sdItem.years) / 120;
    const sdMs = sdYears * MS_PER_YEAR;
    const sdEnd = new Date(sdPointer.getTime() + sdMs);

    const sdPeriod: DashaPeriod = {
      lord: sdItem.lord,
      startDate: new Date(sdPointer.getTime()),
      endDate: new Date(sdEnd.getTime()),
      durationYears: sdYears,
    };

    if (targetDate >= sdPeriod.startDate && targetDate <= sdPeriod.endDate) {
      activeSd = sdPeriod;
    }
    sdPointer = sdEnd;
  }

  // Calculate 5th level: Praana Dasha
  const sdLordIndex = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === activeSd.lord);
  let prdPointer = new Date(activeSd.startDate.getTime());
  let activePrd: DashaPeriod = { ...activeSd, durationYears: activeSd.durationYears / 12 };

  for (let n = 0; n < VIMSHOTTARI_DASHA_CYCLE.length; n++) {
    const prdIndex = (sdLordIndex + n) % VIMSHOTTARI_DASHA_CYCLE.length;
    const prdItem = VIMSHOTTARI_DASHA_CYCLE[prdIndex];
    const prdYears = (activeSd.durationYears * prdItem.years) / 120;
    const prdMs = prdYears * MS_PER_YEAR;
    const prdEnd = new Date(prdPointer.getTime() + prdMs);

    const prdPeriod: DashaPeriod = {
      lord: prdItem.lord,
      startDate: new Date(prdPointer.getTime()),
      endDate: new Date(prdEnd.getTime()),
      durationYears: prdYears,
    };

    if (targetDate >= prdPeriod.startDate && targetDate <= prdPeriod.endDate) {
      activePrd = prdPeriod;
    }
    prdPointer = prdEnd;
  }

  return {
    birthLord,
    birthBalanceYears,
    mahadashas,
    currentDasha: {
      mahadasha: activeMd,
      antardasha: activeAd,
      pratyantardasha: activePd,
      sookshmaDasha: activeSd,
      praanaDasha: activePrd,
    },
    deepHierarchy: {
      mahadasha: activeMd,
      antardasha: activeAd,
      pratyantardasha: activePd,
      sookshmaDasha: activeSd,
      praanaDasha: activePrd,
    },
  };
}
