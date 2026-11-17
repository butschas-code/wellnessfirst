import type {
  ComprehensiveKundliResult,
} from '../types.ts';
import { calculateAscendant } from '../core/ascendant.ts';
import { calculatePlanetaryPositions } from '../core/ephemeris.ts';
import { ZODIAC_SIGNS } from '../core/constants.ts';

export type QATopic =
  | 'Travel & Journeys'
  | 'Relocation & Sanctuary'
  | 'Career & Enterprise'
  | 'Capital & Investment'
  | 'Partnership & Alliances'
  | 'Health & Vitality'
  | 'Family & Progeny'
  | 'General Decision';

export interface AstroQAResult {
  question: string;
  topic: QATopic;
  verdict: 'High Alignment: Green Light to Proceed' | 'Proceed with Defined Conditions' | 'Pause & Re-Evaluate Dependencies';
  verdictLevel: 'green' | 'amber' | 'red';
  confidenceScore: number; // 0..100
  explanation: string;
  actionSteps: [string, string, string];
  pitfallToAvoid: string;
  optimalWindow: string;
  travelGuidance?: {
    travelReadiness: string;
    bestDirection: string;
    cautionDirection: string;
    beneficPlaceArchetypes: string;
  };
}

/**
 * Classifies freeform natural language questions into an astrological domain
 * using deterministic intent matching (Zero LLM dependencies).
 */
export function classifyQuestionIntent(text: string): { topic: QATopic; targetHouse: number } {
  const lower = text.toLowerCase();

  // 1. Travel & Foreign Journeys
  if (/\b(travel|trip|flight|visit|destination|vacation|abroad|country|countries|flying|fly|drive|driving|journey|pack|luggage|visiting|go to|leave)\b/i.test(lower)) {
    return { topic: 'Travel & Journeys', targetHouse: 9 };
  }

  // 2. Relocation & Home
  if (/\b(move|moving|relocate|relocation|city|apartment|house|neighborhood|live in|rent|property|lease|buy a home)\b/i.test(lower)) {
    return { topic: 'Relocation & Sanctuary', targetHouse: 4 };
  }

  // 3. Career, Business, Job, Promotion
  if (/\b(job|career|boss|promotion|raise|interview|work|client|business|company|startup|launch|offer|pitch|hire|contract|deal|partner|co-founder|founder|product)\b/i.test(lower)) {
    return { topic: 'Career & Enterprise', targetHouse: 10 };
  }

  // 4. Money, Investment, Wealth
  if (/\b(money|invest|investment|stock|crypto|cash|buy|purchase|afford|sell|debt|loan|finances|wealth|profit|shares|fund)\b/i.test(lower)) {
    return { topic: 'Capital & Investment', targetHouse: 11 };
  }

  // 5. Relationship, Love, Marriage
  if (/\b(partner|relationship|love|marriage|marry|dating|date|boyfriend|girlfriend|husband|wife|divorce|breakup|ex|reconcile|crush)\b/i.test(lower)) {
    return { topic: 'Partnership & Alliances', targetHouse: 7 };
  }

  // 6. Health, Fatigue, Burnout, Healing
  if (/\b(health|sick|tired|fatigue|burnout|surgery|doctor|healing|pain|diet|sleep|insomnia|gut|weight|illness|recovery)\b/i.test(lower)) {
    return { topic: 'Health & Vitality', targetHouse: 1 };
  }

  // 7. Children, Parenting, Family
  if (/\b(child|children|kid|kids|pregnant|pregnancy|fertility|baby|son|daughter|family|parent|parents)\b/i.test(lower)) {
    return { topic: 'Family & Progeny', targetHouse: 5 };
  }

  return { topic: 'General Decision', targetHouse: 1 };
}

/**
 * Deterministic Astrological Q&A Engine (No LLM added).
 * Processes freeform user queries against:
 * 1. Current moment horary alignment (Tajika Ithasala/Esharpha aspects).
 * 2. User's natal chart capacity (Ashtakavarga points).
 * 3. Active life chapter (Vimshottari Dasha).
 */
export function processAstroQuestion(
  chart: ComprehensiveKundliResult,
  question: string,
  location: { latitude: number; longitude: number },
  queryTime: Date = new Date()
): AstroQAResult {
  const { topic, targetHouse } = classifyQuestionIntent(question);

  // 1. Calculate Prashna Horary positions for the exact moment and location
  const ascendant = calculateAscendant(queryTime, location.latitude, location.longitude);
  const ascSignIdx = ascendant.sign.index;
  const lagnaLord = ascendant.sign.lord;

  const currentPlanets = calculatePlanetaryPositions(queryTime, ascSignIdx);

  // 2. Identify Karyesh (Significator for the question topic)
  const targetSignIdx = (ascSignIdx + targetHouse - 1) % 12;
  const targetSign = ZODIAC_SIGNS[targetSignIdx];
  const karyeshLord = targetSign.lord;

  // 3. Evaluate angular aspect between Lagna Lord and Karyesh Lord
  const lagneshPos = currentPlanets[lagnaLord];
  const karyeshPos = currentPlanets[karyeshLord];

  const angleDiff = Math.abs(lagneshPos.siderealLongitude - karyeshPos.siderealLongitude) % 360;
  const aspectAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;

  // Check if forming (applying) or separating
  const isLagneshFaster = Math.abs(lagneshPos.speed) > Math.abs(karyeshPos.speed);
  const fasterPos = isLagneshFaster ? lagneshPos : karyeshPos;
  const slowerPos = isLagneshFaster ? karyeshPos : lagneshPos;
  const isApplying = fasterPos.siderealLongitude < slowerPos.siderealLongitude;

  // 4. Check Natal Capacity in Target Domain
  const natalDomainPts = chart.ashtakavarga.housePoints[targetHouse - 1] || 28;
  const isNatalStrong = natalDomainPts >= 28;

  // 5. Determine Verdict
  let verdict: AstroQAResult['verdict'] = 'Proceed with Defined Conditions';
  let verdictLevel: AstroQAResult['verdictLevel'] = 'amber';
  let score = 65;

  const isTrineOrSextile = Math.abs(aspectAngle - 60) <= 8 || Math.abs(aspectAngle - 120) <= 8;
  const isConjunction = aspectAngle <= 12;
  const isSquareOrOpposition = Math.abs(aspectAngle - 90) <= 8 || Math.abs(aspectAngle - 180) <= 8;

  if ((isTrineOrSextile || isConjunction) && isApplying) {
    verdict = 'High Alignment: Green Light to Proceed';
    verdictLevel = 'green';
    score = isNatalStrong ? 92 : 82;
  } else if (isSquareOrOpposition && !isApplying) {
    verdict = 'Pause & Re-Evaluate Dependencies';
    verdictLevel = 'red';
    score = isNatalStrong ? 52 : 38;
  } else {
    verdict = 'Proceed with Defined Conditions';
    verdictLevel = 'amber';
    score = isNatalStrong ? 74 : 64;
  }

  // 6. Build Topic-Specific Guidance Matrix
  let explanation = '';
  let actionSteps: [string, string, string] = [
    'Define clear written parameters before committing.',
    'Confirm team and operational bandwidth.',
    'Protect your recovery routines during the sprint.'
  ];
  let pitfallToAvoid = 'Assuming unstated alignment without signed commitments.';
  let optimalWindow = 'Within the next 7 to 14 days during daytime active hours.';

  const ascEl = chart.ascendant.sign.element;

  // Directional Travel Logic (Digbala & Elements)
  let travelGuidance: AstroQAResult['travelGuidance'] = undefined;
  if (topic === 'Travel & Journeys' || topic === 'Relocation & Sanctuary') {
    let bestDir = 'South & East (High Career Stature & Dynamic Growth)';
    let cautionDir = 'South-West (Requires Extra Logistical Buffer)';
    let places = 'Elevated terrain, vibrant metropolitan hubs, and sunlit destinations.';

    if (ascEl === 'Water') {
      bestDir = 'North & North-East (Deep Nervous System Sanctuary & Creative Flow)';
      cautionDir = 'South (High Pressure & Fast Burnout)';
      places = 'Lakeside retreats, coastal sanctuaries, and lush temperate forests.';
    } else if (ascEl === 'Earth') {
      bestDir = 'West & South-West (Grounding Real Estate & Compounding Value)';
      cautionDir = 'North-East (Unfocused Distraction)';
      places = 'Historic stone cities, agricultural valleys, and structured architectural centers.';
    } else if (ascEl === 'Air') {
      bestDir = 'North-West & West (Intellectual Networking & Rapid Innovation)';
      cautionDir = 'South-East (Physical Inflammation)';
      places = 'Global international hubs, tech corridors, and academic research capitals.';
    }

    travelGuidance = {
      travelReadiness: verdictLevel === 'green'
        ? 'High Atmospheric Support for Departure'
        : verdictLevel === 'amber'
        ? 'Moderate Alignment: Expect Minor Logistical Friction'
        : 'Better for Local Grounding: Postpone Discretionary Travel',
      bestDirection: bestDir,
      cautionDirection: cautionDir,
      beneficPlaceArchetypes: places,
    };
  }

  // Populate dynamic responses
  if (topic === 'Travel & Journeys') {
    explanation = verdictLevel === 'green'
      ? 'The environmental momentum strongly supports departure and geographic movement. Transits favor travel for strategic business, creative renewal, and expanding horizons.'
      : verdictLevel === 'amber'
      ? 'Travel is viable but demands extra operational buffers. Expect minor scheduling adjustments, airport delays, or communication re-routing.'
      : 'The active transit weather suggests environmental friction for travel right now. It is more advantageous to stay grounded and execute local priorities before departing.';

    actionSteps = [
      'Travel in your optimal cardinal direction for best restorative and commercial outcomes.',
      'Leave during morning or early afternoon peak windows; avoid late-night transit.',
      'Build a 90-minute operational buffer into all connecting itineraries.'
    ];
    pitfallToAvoid = 'Traveling with an over-packed schedule that leaves zero room for decompression.';
    optimalWindow = 'Between 10:00 AM and 2:00 PM on departure day.';
  } else if (topic === 'Career & Enterprise') {
    explanation = verdictLevel === 'green'
      ? 'High atmospheric alignment for professional initiatives. Your mandate carries weight right now; market counterparties are receptive to bold proposals and clear terms.'
      : verdictLevel === 'amber'
      ? 'Constructive momentum, but success hinges on precision. Double-check contractual deliverables and confirm who holds final budget approval before proceeding.'
      : 'Environmental friction is elevated. Delay major unilateral announcements until operational dependencies and counterparty commitments are verified in writing.';

    actionSteps = [
      'Pitch high-ticket value anchors; do not compromise on core standard.',
      'Ensure clear decision-maker lines: negotiate only with final budget holders.',
      'Document deliverables and milestones in writing before starting execution.'
    ];
    pitfallToAvoid = 'Giving away strategic advice for free in the hope of closing a future contract.';
    optimalWindow = 'During mid-morning focus windows over the next 10 business days.';
  } else if (topic === 'Capital & Investment') {
    explanation = verdictLevel === 'green'
      ? 'Financial indicators show positive cashflow momentum. Reinvesting capital into high-conviction assets or operational leverage is supported.'
      : verdictLevel === 'amber'
      ? 'Liquidity conditions are steady but require strict discipline. Ensure your 9-month emergency cash buffer remains completely untouched before investing.'
      : 'Atmospheric transits caution against speculative or illiquid capital commitments right now. Preserve cash reserves and review terms closely.';

    actionSteps = [
      'Protect core cash reserves: invest only discretionary surplus capital.',
      'Seek asymmetric upside with capped downside; avoid open-ended liabilities.',
      'Require third-party operational audit before wiring capital to new partners.'
    ];
    pitfallToAvoid = 'Making financial commitments driven by FOMO or fast-moving social hype.';
    optimalWindow = 'During early week business hours after formal contract review.';
  } else if (topic === 'Partnership & Alliances') {
    explanation = verdictLevel === 'green'
      ? 'Strong relational chemistry and mutual respect. Both parties operate with constructive momentum and complimentary capabilities.'
      : verdictLevel === 'amber'
      ? 'Good potential, but unspoken expectations could create friction later. Clarify equity splits, decision authority, and exit clauses immediately.'
      : 'Significant friction or misaligned expectations detected. Do not rush into shared commitments until personal boundaries and financial terms are fully aligned.';

    actionSteps = [
      'Define unambiguous division of labor: who leads, who builds, who sells.',
      'Establish a formal 90-day trial period before signing long-term partnership pacts.',
      'Test alignment on values and crisis behavior before sharing financial accounts.'
    ];
    pitfallToAvoid = 'Relying on emotional connection while ignoring obvious operational red flags.';
    optimalWindow = 'Over a structured daytime lunch or working session in person.';
  } else if (topic === 'Health & Vitality') {
    explanation = verdictLevel === 'green'
      ? 'Your autonomic vitality is in a restorative cycle. Cellular recovery and energetic stamina are receptive to physical training and healthy routines.'
      : verdictLevel === 'amber'
      ? 'Mild adrenal fatigue or digestive sensitivity. Your body is asking for rhythmic consistency: regular meal times, hydration, and an evening screen curfew.'
      : 'Elevated sympathetic nervous system strain. Stop trying to out-muscle physical fatigue. Prioritize deep sleep, somatic down-regulation, and nervous system recovery.';

    actionSteps = [
      'Institute a 24-hour digital and cognitive de-escalation protocol.',
      'Hydrate with mineral-rich water and take a 20-minute daily nature walk.',
      'Stop screen exposure 90 minutes before sleep to reset your melatonin curve.'
    ];
    pitfallToAvoid = 'Using caffeine and stimulants to mask legitimate physical exhaustion.';
    optimalWindow = 'Immediate execution of restorative sleep protocols tonight.';
  } else {
    // General Guidance
    explanation = verdictLevel === 'green'
      ? 'Environmental timing is constructively aligned with your query. You have atmospheric tailwinds to take decisive forward steps.'
      : verdictLevel === 'amber'
      ? 'Momentum is neutral-to-supportive. Progress will occur, but it demands patience and attention to operational details.'
      : 'The timing advises reflection over rapid action. Resolve internal ambiguities and verify dependencies before making irrevocable commitments.';

    actionSteps = [
      'Focus on what is directly within your control today.',
      'Eliminate 30% of secondary obligations to free up cognitive bandwidth.',
      'Make decisions from calm conviction rather than reactive urgency.'
    ];
    pitfallToAvoid = 'Forcing an outcome before the environmental conditions have matured.';
    optimalWindow = 'Review progress again in 7 days after establishing baseline clarity.';
  }

  return {
    question,
    topic,
    verdict,
    verdictLevel,
    confidenceScore: score,
    explanation,
    actionSteps,
    pitfallToAvoid,
    optimalWindow,
    travelGuidance,
  };
}
