import { getNakshatraPlacement } from '../core/nakshatra.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';
import type { AshtakootaResult, AshtakootaCategoryScore } from '../types.ts';

export function calculateAshtakoota(
  brideMoonLongitude: number,
  groomMoonLongitude: number
): AshtakootaResult {
  const brideNak = getNakshatraPlacement(brideMoonLongitude);
  const groomNak = getNakshatraPlacement(groomMoonLongitude);

  const brideSignIndex = Math.floor(brideMoonLongitude / 30);
  const groomSignIndex = Math.floor(groomMoonLongitude / 30);

  const brideSign = ZODIAC_SIGNS[brideSignIndex];
  const groomSign = ZODIAC_SIGNS[groomSignIndex];

  // 1. Varna (1 Point)
  // Water signs: Brahmin (4), Fire signs: Kshatriya (3), Earth signs: Vaishya (2), Air signs: Shudra (1)
  const varnaRank: Record<string, number> = {
    Water: 4,
    Fire: 3,
    Earth: 2,
    Air: 1,
  };
  const brideVarna = varnaRank[brideSign.element];
  const groomVarna = varnaRank[groomSign.element];
  const varnaScore = groomVarna >= brideVarna ? 1 : 0;
  const varna: AshtakootaCategoryScore = {
    name: 'Varna (Spiritual Disposition)',
    maxScore: 1,
    obtainedScore: varnaScore,
    description: varnaScore === 1 ? 'Ego harmony and shared spiritual temperament.' : 'Disparity in intrinsic role expectations.',
  };

  // 2. Vashya (2 Points)
  // Mutual influence and natural attraction
  let vashyaScore = 0;
  if (brideSignIndex === groomSignIndex) vashyaScore = 2;
  else if (Math.abs(brideSignIndex - groomSignIndex) === 6) vashyaScore = 1;
  else vashyaScore = 1.5;
  const vashya: AshtakootaCategoryScore = {
    name: 'Vashya (Mutual Attraction & Resonance)',
    maxScore: 2,
    obtainedScore: vashyaScore,
    description: vashyaScore >= 1.5 ? 'Balanced mutual respect and natural pull.' : 'Subtle friction in reciprocal accommodation.',
  };

  // 3. Tara (3 Points)
  // Destiny and longevity support
  const count1 = ((groomNak.nakshatra.index - brideNak.nakshatra.index + 27) % 9) + 1;
  const count2 = ((brideNak.nakshatra.index - groomNak.nakshatra.index + 27) % 9) + 1;
  const auspiciousTaras = [1, 2, 4, 6, 8, 9];
  let taraScore = 0;
  if (auspiciousTaras.includes(count1) && auspiciousTaras.includes(count2)) taraScore = 3;
  else if (auspiciousTaras.includes(count1) || auspiciousTaras.includes(count2)) taraScore = 1.5;
  const tara: AshtakootaCategoryScore = {
    name: 'Tara (Destiny & Auspicious Timing)',
    maxScore: 3,
    obtainedScore: taraScore,
    description: taraScore === 3 ? 'Reciprocal life expansion and protection.' : 'Moderate shared life luck.',
  };

  // 4. Yoni (4 Points)
  // Biological rhythm and physical affinity
  const sameYoni = brideNak.nakshatra.yoni === groomNak.nakshatra.yoni;
  const yoniScore = sameYoni ? 4 : 2;
  const yoni: AshtakootaCategoryScore = {
    name: 'Yoni (Biological & Somatic Compatibility)',
    maxScore: 4,
    obtainedScore: yoniScore,
    description: sameYoni ? 'Harmonious physical chemistry and biorhythms.' : 'Neutral somatic complement.',
  };

  // 5. Graha Maitri (5 Points)
  // Moon sign planetary friendship (psychological rapport)
  let maitriScore = 0;
  if (brideSign.lord === groomSign.lord) maitriScore = 5;
  else maitriScore = 3;
  const grahaMaitri: AshtakootaCategoryScore = {
    name: 'Graha Maitri (Mental & Psychological Rapport)',
    maxScore: 5,
    obtainedScore: maitriScore,
    description: maitriScore === 5 ? 'High intellectual alignment and ease of conversation.' : 'Constructive difference in cognitive styles.',
  };

  // 6. Gana (6 Points)
  // Temperament: Deva (serene), Manushya (human/practical), Rakshasa (fiery/intense)
  let ganaScore = 0;
  const bGana = brideNak.nakshatra.gana;
  const gGana = groomNak.nakshatra.gana;
  if (bGana === gGana) ganaScore = 6;
  else if ((bGana === 'Deva' && gGana === 'Manushya') || (bGana === 'Manushya' && gGana === 'Deva')) ganaScore = 5;
  else ganaScore = 1;
  const gana: AshtakootaCategoryScore = {
    name: 'Gana (Temperamental Cadence)',
    maxScore: 6,
    obtainedScore: ganaScore,
    description: ganaScore >= 5 ? 'Compatible emotional thresholds and daily pacing.' : 'Different intensity tolerances requiring conscious empathy.',
  };

  // 7. Bhakoot (7 Points)
  // Emotional prosperity and family welfare
  const diffSign = ((groomSignIndex - brideSignIndex + 12) % 12) + 1;
  const inauspiciousDiff = [2, 12, 6, 8, 9, 5];
  const bhakootScore = inauspiciousDiff.includes(diffSign) ? 0 : 7;
  const bhakoot: AshtakootaCategoryScore = {
    name: 'Bhakoot (Emotional Resonance & Growth)',
    maxScore: 7,
    obtainedScore: bhakootScore,
    description: bhakootScore === 7 ? 'Flow of mutual support and shared prosperity.' : 'Occasional emotional divergence in priorities.',
  };

  // 8. Nadi (8 Points)
  // Genetic, nervous system, and prana constitution
  const sameNadi = brideNak.nakshatra.nadi === groomNak.nakshatra.nadi;
  const nadiScore = sameNadi ? 0 : 8;
  const nadi: AshtakootaCategoryScore = {
    name: 'Nadi (Pranic & Nervous System Balance)',
    maxScore: 8,
    obtainedScore: nadiScore,
    description: nadiScore === 8 ? 'Ideal energetic polarity and genetic vitality.' : 'Identical elemental pulse; requires mindful lifestyle differentiation.',
  };

  const totalScore =
    varnaScore +
    vashyaScore +
    taraScore +
    yoniScore +
    maitriScore +
    ganaScore +
    bhakootScore +
    nadiScore;

  let verdict: 'Excellent' | 'Good' | 'Average' | 'Challenging' = 'Challenging';
  if (totalScore >= 28) verdict = 'Excellent';
  else if (totalScore >= 21) verdict = 'Good';
  else if (totalScore >= 18) verdict = 'Average';

  return {
    totalScore,
    maxScore: 36,
    percentage: Math.round((totalScore / 36) * 100),
    verdict,
    categories: {
      varna,
      vashya,
      tara,
      yoni,
      grahaMaitri,
      gana,
      bhakoot,
      nadi,
    },
  };
}
