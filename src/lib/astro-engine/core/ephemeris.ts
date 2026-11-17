import * as Astronomy from 'astronomy-engine';
import { calculateLahiriAyanamsha, formatDegreesToDMS } from './ayanamsha.ts';
import { apparentBody, earthTilt, meanNode, trueNode } from './precision.ts';
import { ZODIAC_SIGNS, PLANET_SANSKRIT, DIGNITIES_MAP } from './constants.ts';
import { getNakshatraPlacement } from './nakshatra.ts';
import type {
  PlanetName,
  PlanetPosition,
  DignityType,
  ZodiacSignInfo,
  CompoundRelation,
  NodeType,
} from '../types.ts';

/** Moon's mean ascending node (kept for backwards compatibility). */
export function calculateMeanRahu(date: Date): number {
  return meanNode(date);
}

/* Natural relationships (BPHS). Nodes follow Saturn (Rahu) and Mars (Ketu), a common convention. */
const NATURAL: Record<string, { friends: PlanetName[]; enemies: PlanetName[] }> = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};
NATURAL.Rahu = NATURAL.Saturn;
NATURAL.Ketu = NATURAL.Mars;

/**
 * Pancha-dha maitri: compound relationship of `planet` towards `other`, combining natural friendship
 * with temporal friendship (planets in the 2nd, 3rd, 4th, 10th, 11th, 12th from it are temporal friends).
 */
export function compoundRelation(
  planet: PlanetName,
  other: PlanetName,
  signOf: (p: PlanetName) => number
): CompoundRelation {
  if (planet === other) return 'Self';
  const nat = NATURAL[planet];
  const natural = nat.friends.includes(other) ? 1 : nat.enemies.includes(other) ? -1 : 0;
  const dist = ((signOf(other) - signOf(planet) + 12) % 12) + 1;
  const temporal = [2, 3, 4, 10, 11, 12].includes(dist) ? 1 : -1;
  const sum = natural + temporal;
  return sum === 2 ? 'GreatFriend' : sum === 1 ? 'Friend' : sum === 0 ? 'Neutral' : sum === -1 ? 'Enemy' : 'GreatEnemy';
}

/**
 * Evaluates the dignity of a planet in a sidereal sign and degree.
 */
function determineDignity(
  planet: PlanetName,
  sign: ZodiacSignInfo,
  degreeInSign: number,
  relation?: CompoundRelation
): DignityType {
  const dignities = DIGNITIES_MAP[planet];
  if (!dignities) return 'Neutral';

  // Check Exaltation
  if (sign.name === dignities.exaltation.sign) {
    return 'Exalted';
  }

  // Check Debilitation
  if (sign.name === dignities.debilitation.sign) {
    return 'Debilitated';
  }

  // Check Moolatrikona
  if (
    sign.name === dignities.moolatrikona.sign &&
    degreeInSign >= dignities.moolatrikona.startDegree &&
    degreeInSign <= dignities.moolatrikona.endDegree
  ) {
    return 'Moolatrikona';
  }

  // Check Own Sign
  if (dignities.ownSigns.includes(sign.name)) {
    return 'OwnSign';
  }

  if (relation === 'GreatFriend' || relation === 'Friend') return 'Friendly';
  if (relation === 'Enemy' || relation === 'GreatEnemy') return 'Enemy';
  return 'Neutral';
}

export function calculatePlanetaryPositions(
  date: Date,
  ascendantSignIndex: number,
  nodeType: NodeType = 'true'
): Record<PlanetName, PlanetPosition> {
  // Sidereal = apparent tropical (true equinox) − nutation in longitude − Lahiri (mean equinox).
  const ayanamsha = calculateLahiriAyanamsha(date);
  const dpsi = earthTilt(date).dpsi;
  const node = nodeType === 'true' ? trueNode : meanNode;

  // Time delta to check retrograde motion (1 hour)
  const dtHours = 1;
  const nextDate = new Date(date.getTime() + dtHours * 3600 * 1000);

  const bodies: Array<{ name: PlanetName; body?: Astronomy.Body }> = [
    { name: 'Sun', body: Astronomy.Body.Sun },
    { name: 'Moon', body: Astronomy.Body.Moon },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Saturn', body: Astronomy.Body.Saturn },
    { name: 'Rahu' },
    { name: 'Ketu' },
  ];

  const result = {} as Record<PlanetName, PlanetPosition>;

  for (const { name, body } of bodies) {
    let tropicalLong = 0;
    let nextTropicalLong = 0;
    let eclLat: number | undefined;
    let decl: number | undefined;

    if (body) {
      const now = apparentBody(body, date);
      tropicalLong = now.longitude - dpsi; // → mean equinox of date
      nextTropicalLong = apparentBody(body, nextDate).longitude - dpsi;
      eclLat = now.latitude;
      decl = now.declination;
    } else if (name === 'Rahu') {
      tropicalLong = node(date);
      nextTropicalLong = node(nextDate);
    } else if (name === 'Ketu') {
      tropicalLong = (node(date) + 180) % 360;
      nextTropicalLong = (node(nextDate) + 180) % 360;
    }

    // Convert to Sidereal
    let siderealLong = (tropicalLong - ayanamsha) % 360;
    if (siderealLong < 0) siderealLong += 360;

    let nextSiderealLong = (nextTropicalLong - ayanamsha) % 360;
    if (nextSiderealLong < 0) nextSiderealLong += 360;

    // Calculate speed (degrees per day)
    let diff = nextSiderealLong - siderealLong;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const speed = (diff / dtHours) * 24;

    // The mean node is always retrograde; the true node can briefly move direct.
    const isRetrograde = (name === 'Rahu' || name === 'Ketu') && nodeType === 'mean' ? true : speed < 0;

    const signIndex = Math.floor(siderealLong / 30);
    const sign = ZODIAC_SIGNS[Math.min(Math.max(signIndex, 0), 11)];
    const degreeInSign = siderealLong - signIndex * 30;

    // House in Whole Sign system (1 to 12)
    const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;

    const nakPlacement = getNakshatraPlacement(siderealLong);
    const dignity = determineDignity(name, sign, degreeInSign);

    result[name] = {
      name,
      sanskrit: PLANET_SANSKRIT[name],
      tropicalLongitude: tropicalLong,
      siderealLongitude: siderealLong,
      sign,
      degreeInSign,
      formattedDegree: formatDegreesToDMS(degreeInSign),
      house,
      nakshatra: nakPlacement.nakshatra,
      nakshatraPada: nakPlacement.pada,
      speed,
      isRetrograde,
      dignity,
      latitude: eclLat,
      declination: decl,
    };
  }

  // Second pass: compound (natural + temporal) relationship with the sign lord → Friendly / Enemy dignity.
  const signOf = (p: PlanetName) => result[p].sign.index;
  for (const p of Object.keys(result) as PlanetName[]) {
    const pos = result[p];
    const lord = pos.sign.lord;
    const relation = compoundRelation(p, lord, signOf);
    pos.compoundRelation = relation;
    pos.dignity = determineDignity(p, pos.sign, pos.degreeInSign, relation);
  }

  return result;
}
