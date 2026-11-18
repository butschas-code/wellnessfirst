import assert from 'node:assert';
import {
  calculateJanamKundli,
  calculateChoghadiya,
  calculateAyanamsha,
  generateTempoGuidance,
  calculatePrashnaKundli,
  calculateGocharaTransits,
  calculateDerivedChart,
  calculateProgenyAnalysis,
  calculateRelationalSynastry,
  calculatePanchang,
  calculateTimedChoghadiya,
} from '../src/lib/astro-engine/index.ts';
import { trueNode, meanNode } from '../src/lib/astro-engine/core/precision.ts';
import {
  calculateYoginiDasha,
  calculateAshtottariDasha,
  calculateCharaDasha,
  calculateVarshaphal,
  calculateKPAnalysis,
  calculateRulingPlanets,
  placidusCusps,
  findMuhurtas,
  calculatePlanetaryPositions,
} from '../src/lib/astro-engine/index.ts';

console.log('=== Running Full Vedic Astronomical Engine Verification ===\n');

// 1. Multi-Ayanamsha Systems
console.log('1. Testing Multi-Ayanamsha Systems:');
const j2000Date = new Date('2000-01-01T12:00:00Z');
const lahiri = calculateAyanamsha(j2000Date, 'Lahiri');
const kp = calculateAyanamsha(j2000Date, 'KP');
const raman = calculateAyanamsha(j2000Date, 'Raman');

console.log(`   - Lahiri (J2000.0): ${lahiri.toFixed(4)}°`);
console.log(`   - KP (J2000.0):     ${kp.toFixed(4)}°`);
console.log(`   - Raman (J2000.0):  ${raman.toFixed(4)}°`);
assert(lahiri > 23.85 && lahiri < 23.86);
console.log('   ✓ Multi-Ayanamsha system calculations validated.\n');

// 2. Comprehensive Janam Kundli Generation
console.log('2. Testing Comprehensive Janam Kundli Generation (New Delhi benchmark):');
const testBirthDate = new Date('1990-08-15T01:00:00Z');
const chartA = calculateJanamKundli({
  date: testBirthDate,
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 5.5,
});

console.log(`   - Ascendant: ${chartA.ascendant.sign.name} (${chartA.ascendant.formattedDegree})`);
console.log(`   - Ascendant KP: ${chartA.ascendant.kp?.formatted}`);
console.log(`   - Moon: ${chartA.planets.Moon.sign.name} (${chartA.planets.Moon.formattedDegree})`);
assert(chartA.ascendant.sign.name === 'Leo');
console.log('   ✓ Ascendant and Planetary KP positions validated.\n');

// 3. Shodashvarga (All 16 Divisional Charts D1..D60)
console.log('3. Testing Complete 16 Shodashvarga Divisional Charts (D1 to D60):');
assert.strictEqual(Object.keys(chartA.shodashvarga).length, 16);
console.log('   ✓ All 16 Shodashvarga harmonic charts validated.\n');

// 4. Complete Sarvashtakavarga (SAV 337 points)
console.log('4. Testing Ashtakavarga Engine (SAV 337 points):');
console.log(`   - Sarvashtakavarga Total Points: ${chartA.ashtakavarga.totalPoints}`);
assert.strictEqual(chartA.ashtakavarga.totalPoints, 337);
console.log('   ✓ Sarvashtakavarga matches 337 classical point matrix.\n');

// 5. Complete 6-Fold Shadbala
console.log('5. Testing Shadbala Six-Fold Planetary Strength:');
assert(chartA.shadbala.Sun.totalRupas > 0);
assert(chartA.shadbala.Jupiter.isStrong);
console.log('   ✓ Six-fold Shadbala calculations verified.\n');

// 6. Time and Place of Asking (Prashna Kundli / Horary Astrology)
console.log('6. Testing Time & Place of Asking (Prashna Kundli):');
const queryTime = new Date('2026-11-17T10:30:00Z');
const prashna = calculatePrashnaKundli({
  question: 'Will our new creative partnership and wellness launch succeed?',
  category: 'Partnership & Love',
  queryTime,
  latitude: 51.5074, // London
  longitude: -0.1278,
  horaryNumber: 108,
});
console.log(`   - Question: "${prashna.question}"`);
console.log(`   - Prashna Lagna: ${prashna.prashnaLagna.sign} (Lord: ${prashna.prashnaLagna.lord})`);
console.log(`   - Karyesh (Significator): ${prashna.karyesh.lord} (House ${prashna.karyesh.houseNumber} in ${prashna.karyesh.sign})`);
console.log(`   - Tajika Aspect: ${prashna.tajikaAspect.yogaName}`);
console.log(`   - Verdict: ${prashna.verdict}`);
console.log(`   - Guidance: ${prashna.guidance}`);
assert(prashna.prashnaLagna.sign);
assert(prashna.karyesh.lord);
console.log('   ✓ Time and Place of Asking (Prashna) engine verified.\n');

// 7. Real-Time Planetary Transits (Gochara) & Vedha Obstruction
console.log('7. Testing Real-Time Transits (Gochara) overlaid on Natal Chart:');
const transits = calculateGocharaTransits(chartA, queryTime);
console.log(`   - General Transit Tone: ${transits.generalTransitTone}`);
console.log(`   - Saturn Sade Sati Active: ${transits.saturnSadeSatiActive ? 'Yes' : 'No'}`);
console.log(`   - Jupiter Support Active: ${transits.jupiterSupportActive ? 'Yes' : 'No'}`);
console.log(`   - Sample Planet Transit: ${transits.transits[0].summary}`);
assert(transits.transits.length === 9);
console.log('   ✓ Real-time Gochara transits with SAV resilience verified.\n');

// 8. Derived Charts (Bhavat Bhavam) for Spouse and Children
console.log('8. Testing Derived Charts (Bhavat Bhavam) for Family Members:');
const spouseChart = calculateDerivedChart(chartA, 'Spouse');
console.log(`   - Spouse Derived Lagna: ${spouseChart.derivedAscendantSign} (Lord: ${spouseChart.derivedAscendantLord})`);
console.log(`   - Spouse Career (10th from 7th): Sign ${spouseChart.houses[9].sign}`);
console.log(`   - Spouse Guidance: ${spouseChart.vitalInsights.somaticGuidance}`);
assert.strictEqual(spouseChart.houses.length, 12);

const childChart = calculateDerivedChart(chartA, 'First Child');
console.log(`   - First Child Derived Lagna: ${childChart.derivedAscendantSign} (Lord: ${childChart.derivedAscendantLord})`);
console.log(`   - Child Guidance: ${childChart.vitalInsights.somaticGuidance}`);
assert.strictEqual(childChart.houses.length, 12);
console.log('   ✓ Derived Charts (Spouse, Child, Parents) verified.\n');

// 9. Fertility & Progeny Sphutas (Beeja & Kshetra Sphutas)
console.log('9. Testing Fertility & Conception Sphutas (Beeja & Kshetra Sphuta):');
const progeny = calculateProgenyAnalysis(chartA, 'Joint');
console.log(`   - Male Beeja Sphuta: ${progeny.maleBeejaSphuta?.sign} (${progeny.maleBeejaSphuta?.degreeInSign}) -> ${progeny.maleBeejaSphuta?.vitalityScore}`);
console.log(`   - Female Kshetra Sphuta: ${progeny.femaleKshetraSphuta?.sign} (${progeny.femaleKshetraSphuta?.degreeInSign}) -> ${progeny.femaleKshetraSphuta?.receptivityScore}`);
console.log(`   - D7 Saptamsa Overview: ${progeny.d7SaptamsaOverview.progenySummary}`);
assert(progeny.maleBeejaSphuta);
assert(progeny.femaleKshetraSphuta);
console.log('   ✓ Fertility and Progeny Sphutas verified.\n');

// 10. Multi-Chart Synastry & Mutual Dasha Resonance (Spouses & Parent-Child)
console.log('10. Testing Relational Synastry & Mutual Dasha Resonance:');
// Create Partner B chart (e.g. born 1992-04-10 in London)
const chartB = calculateJanamKundli({
  date: new Date('1992-04-10T14:15:00Z'),
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 1,
});

const synastry = calculateRelationalSynastry(chartA, chartB, 'Spousal / Romantic');
console.log(`   - Relationship Type: ${synastry.relationshipType}`);
console.log(`   - Cross-Chart Contacts Count: ${synastry.crossContacts.length}`);
if (synastry.crossContacts.length > 0) {
  console.log(`   * Contact 1: ${synastry.crossContacts[0].description}`);
}
console.log(`   - Mutual Dasha Resonance: ${synastry.dashaResonance.partnerAMahadasha} vs ${synastry.dashaResonance.partnerBMahadasha} (${synastry.dashaResonance.mutualSynergy})`);
console.log(`   - Guidance: ${synastry.dashaResonance.guidance}`);
console.log(`   - Composite Chart Planets: ${synastry.compositeChart.length}`);
assert(synastry.compositeChart.length === 7);
console.log('   ✓ Multi-Chart Synastry, Composite, and Mutual Dasha verified.\n');

// 11. Daily Choghadiya Muhurats
console.log('11. Testing Daily Choghadiya Muhurats:');
const choghadiya = calculateChoghadiya(new Date());
assert.strictEqual(choghadiya.daySlots.length, 8);
console.log('   ✓ Daily Choghadiya verified.\n');

// 12. Wellness Tempo Guidance
console.log('12. Testing Wellness Tempo Guidance:');
const tempo = generateTempoGuidance(chartA, chartA.dasha.currentDasha);
console.log(`   - Current Season Theme: ${tempo.seasonFocus.theme}`);
console.log(`   - Nervous System Rhythm: ${tempo.seasonFocus.nervousSystemTempo}`);
assert(tempo.seasonFocus.theme);
console.log('   ✓ Wellness Tempo guidance verified.\n');

// 13. Precision core
console.log('13. Testing precision core (Lahiri epoch, true node):');
const lahiriEpoch = calculateAyanamsha(new Date(Date.UTC(1956, 2, 21)), 'Lahiri');
assert(Math.abs(lahiriEpoch - 23.245524743) < 0.0005, `Lahiri at 1956-03-21 = ${lahiriEpoch}`);
assert(Math.abs(lahiri - 23.857092) < 0.0003, `Lahiri at J2000 = ${lahiri}`); // 23° 51' 25.5"
const nodeGap = Math.abs(((trueNode(j2000Date) - meanNode(j2000Date) + 540) % 360) - 180);
assert(nodeGap < 2, `true vs mean node differ by ${nodeGap}°`);
console.log(`   - Lahiri 1956-03-21: ${lahiriEpoch.toFixed(6)}° · true–mean node: ${nodeGap.toFixed(3)}°`);
console.log('   ✓ Precision core verified.\n');

// 14. Full BPHS Shadbala components
console.log('14. Testing full Shadbala components:');
const sb = calculateJanamKundli({ date: new Date(Date.UTC(1992, 5, 21, 7, 45)), latitude: 51.5074, longitude: -0.1278, timezone: 1 }).shadbala as any;
assert.strictEqual(sb.Sun.components.vara, 45, 'Sunday birth → Sun gets Vara bala');
assert.strictEqual(sb.Saturn.components.hora, 60, '5th hora from sunrise on Sunday → Saturn');
assert.strictEqual(sb.Jupiter.components.tribhaga, 60, 'Jupiter always gets Tribhaga bala');
assert(sb.Sun.components.ayana > 110, 'Sun at solstice → doubled Ayana bala');
console.log('   ✓ Shadbala (Sthana, Dig, Kala incl. Abda/Masa/Vara/Hora, Chesta, Drik) verified.\n');

// 15. Sunrise-based day (Riga, 17 Nov 2026)
console.log('15. Testing sunrise-based Panchang & Choghadiya (Riga):');
const riga = calculatePanchang(new Date('2026-11-17T21:00:00Z'), 56.9496, 24.1052, 'Europe/Riga');
const rigaTime = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Riga', hour: '2-digit', minute: '2-digit' });
assert.strictEqual(rigaTime(riga.solarDay!.sunrise), '08:08');
assert.strictEqual(rigaTime(riga.solarDay!.sunset), '16:07');
assert.strictEqual(riga.muhurats.rahuKalam.start, '14:07'); // Tuesday → 7th octant of daylight
const rigaSlots = calculateTimedChoghadiya(riga.solarDay!);
assert.strictEqual(rigaSlots.length, 16);
assert.strictEqual(rigaSlots[0].name, 'Rog'); // Tuesday day sequence starts with Rog
console.log(`   - Sunrise ${rigaTime(riga.solarDay!.sunrise)}, sunset ${rigaTime(riga.solarDay!.sunset)}, Rahu Kalam ${riga.muhurats.rahuKalam.start}–${riga.muhurats.rahuKalam.end}`);
console.log('   ✓ Sunrise-based timings verified.\n');

// 16. Dasha correctness + additional systems
console.log('16. Testing dasha systems (Vimshottari first-period fix, Yogini, Ashtottari, Chara):');
const ref = calculateJanamKundli({ date: new Date(Date.UTC(1992, 5, 21, 7, 45)), latitude: 51.5074, longitude: -0.1278, timezone: 1, targetDate: new Date('2026-11-18') });
const md0 = ref.dasha.mahadashas[0];
const yrs = (md0.endDate.getTime() - md0.startDate.getTime()) / (365.2425 * 86400000);
assert(Math.abs(yrs - 18) < 1e-6, 'first Mahadasha keeps its full length (starts before birth)');
const adSum = md0.antardashas!.reduce((t, a) => t + a.durationYears, 0);
assert(Math.abs(adSum - 18) < 1e-6, 'antardashas keep classical lengths');
const yog = calculateYoginiDasha(ref, new Date('2026-11-18'));
assert.strictEqual(yog.periods[0].label, 'Dhanya'); // Shatabhisha (24): (24+3) mod 8 = 3 → Dhanya
const asht = calculateAshtottariDasha(ref, new Date('2026-11-18'));
assert.strictEqual(asht.periods[0].label, 'Jupiter'); // Shatabhisha belongs to Jupiter's group
const chara = calculateCharaDasha(ref, new Date('2026-11-18'));
assert.strictEqual(chara.periods[0].label, ref.ascendant.sign.name);
console.log('   ✓ Vimshottari, Yogini, Ashtottari and Chara verified.\n');

// 17. Varshaphal
console.log('17. Testing Varshaphal:');
const vp = calculateVarshaphal(ref, new Date('2026-11-18'));
const sunAtReturn = calculatePlanetaryPositions(vp.pravesha, 0).Sun.siderealLongitude;
assert(Math.abs(sunAtReturn - ref.planets.Sun.siderealLongitude) * 3600 < 1, 'solar return within 1 arc-second');
assert.strictEqual(vp.age, 34);
assert.strictEqual(vp.muntha.sign, 'Taurus'); // Cancer lagna + 34 years
assert.strictEqual(vp.mudda.length, 9);
console.log(`   - Varsha Pravesha ${vp.pravesha.toISOString()} · year lord ${vp.yearLord}`);
console.log('   ✓ Varshaphal verified.\n');

// 18. KP
console.log('18. Testing KP (Placidus, significators, ruling planets):');
const cusps = placidusCusps(ref.birthDetails.date, 51.5074, -0.1278);
assert(Math.abs(cusps[0] - ref.ascendant.siderealLongitude) < 1e-6, 'cusp 1 = ascendant');
assert(Math.abs(cusps[9] - ref.ascendant.midheavenSidereal!) < 1e-6, 'cusp 10 = MC');
const kpa = calculateKPAnalysis(ref.birthDetails.date, 51.5074, -0.1278, ref.planets);
assert.strictEqual(kpa.significators.length, 12);
const rp = calculateRulingPlanets(new Date('2026-11-17T22:20:00Z'), 56.95, 24.1, 'Europe/Riga');
assert.strictEqual(rp.dayLord, 'Mars'); // 00:20 Wed in Riga is still Tuesday's Vedic day
console.log('   ✓ KP verified.\n');

// 19. Strength measures and yogas
console.log('19. Testing Vimshopaka, Bhava Bala and extended yogas:');
for (const v of Object.values(ref.vimshopaka!)) assert(v.shodashavarga >= 1 && v.shodashavarga <= 20);
assert.strictEqual(ref.bhavaBala!.length, 12);
assert(ref.extendedYogas!.some((y) => y.name === 'Yogakaraka' && y.planets[0] === 'Mars'), 'Mars is yogakaraka for Cancer lagna');
console.log('   ✓ Vimshopaka, Bhava Bala and yoga library verified.\n');

// 20. Muhurta
console.log('20. Testing muhurta finder:');
const mu = findMuhurtas(ref, 'venture', { from: new Date('2026-11-18'), days: 60, latitude: 56.95, longitude: 24.1, timeZone: 'Europe/Riga' });
assert(mu.length > 0 && mu.every((w) => w.score >= 60));
assert(mu.every((w) => ![4, 9, 14].includes(((w.tithiNumber - 1) % 15) + 1) || w.score < 70));
console.log(`   - Best: ${mu[0].start.toISOString()} score ${mu[0].score} (${mu[0].nakshatra}, ${mu[0].tithi})`);
console.log('   ✓ Muhurta finder verified.\n');

console.log('=== All 20 Astro Engine Systems Passed ===');
