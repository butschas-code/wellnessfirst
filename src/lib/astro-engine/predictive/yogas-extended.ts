import type { PlanetPosition, AscendantInfo, PlanetName } from '../types.ts';
import { ZODIAC_SIGNS, DIGNITIES_MAP } from '../core/constants.ts';
import type { YogaResult } from './yogas.ts';

/**
 * Extended yoga library (BPHS, Phaladeepika, Saravali) — Raja, Dhana, Parivartana, Nabhasa,
 * Chandra/Lagna-based and Arishta (challenging) yogas. Whole-sign houses; Parashari graha drishti.
 * Each result carries the participating planets and a strength grade from their Shadbala.
 */

export interface ExtendedYoga extends YogaResult {
  planets: PlanetName[];
  strength: 'strong' | 'moderate' | 'weak';
  /** Plain-English title and how to use it (Simple view). */
  plainTitle: string;
  plainUse: string;
  /** Supportive or challenging. */
  nature: 'supportive' | 'challenging';
}

const SEVEN: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const BENEFICS: PlanetName[] = ['Mercury', 'Jupiter', 'Venus'];
const MALEFICS: PlanetName[] = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];

export function detectExtendedYogas(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>,
  shadbala?: Record<string, { strengthRatio: number }>
): ExtendedYoga[] {
  const out: ExtendedYoga[] = [];
  const asc = ascendant.sign.index;
  const lordOf = (h: number): PlanetName => ZODIAC_SIGNS[(asc + h - 1) % 12].lord;
  const houseOf = (p: PlanetName) => planets[p].house;
  const signOf = (p: PlanetName) => planets[p].sign.index;
  const fromMoon = (p: PlanetName) => ((signOf(p) - signOf('Moon') + 12) % 12) + 1;
  const strong = (p: PlanetName) => ['Exalted', 'OwnSign', 'Moolatrikona'].includes(planets[p].dignity);

  /** Parashari aspect of a on b (whole sign). */
  const aspects = (a: PlanetName, b: PlanetName) => {
    const d = ((signOf(b) - signOf(a) + 12) % 12) + 1;
    if (d === 7) return true;
    if (a === 'Mars' && (d === 4 || d === 8)) return true;
    if (a === 'Jupiter' && (d === 5 || d === 9)) return true;
    if (a === 'Saturn' && (d === 3 || d === 10)) return true;
    return false;
  };
  const exchange = (a: PlanetName, b: PlanetName) =>
    a !== b && ZODIAC_SIGNS[signOf(a)].lord === b && ZODIAC_SIGNS[signOf(b)].lord === a;
  const related = (a: PlanetName, b: PlanetName) =>
    a !== b && (signOf(a) === signOf(b) || (aspects(a, b) && aspects(b, a)) || exchange(a, b));
  const relWord = (a: PlanetName, b: PlanetName) =>
    signOf(a) === signOf(b) ? 'conjunct' : exchange(a, b) ? 'in exchange' : 'in mutual aspect';

  const grade = (ps: PlanetName[]): ExtendedYoga['strength'] => {
    const rs = ps.map((p) => shadbala?.[p]?.strengthRatio).filter((x): x is number => typeof x === 'number');
    if (!rs.length) return 'moderate';
    const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
    return avg >= 1.25 ? 'strong' : avg >= 1 ? 'moderate' : 'weak';
  };
  const add = (y: Omit<ExtendedYoga, 'strength' | 'sanskrit'> & { sanskrit?: string }) => {
    if (out.some((o) => o.name === y.name && o.planets.join() === y.planets.join())) return;
    out.push({ ...y, sanskrit: y.sanskrit ?? y.name, strength: grade(y.planets) });
  };

  // ── Raja yogas: kendra lord with trikona lord ──
  const seen = new Set<string>();
  for (const k of KENDRA) {
    for (const t of TRIKONA) {
      if (k === 1 && t === 1) continue;
      const a = lordOf(k), b = lordOf(t);
      const key = [a, b].sort().join('-');
      if (a === b || seen.has(key) || !related(a, b)) continue;
      seen.add(key);
      add({
        name: 'Raja Yoga', category: 'Raja', planets: [a, b], nature: 'supportive',
        description: `Lord of ${k}H (${a}) ${relWord(a, b)} with lord of ${t}H (${b}): kendra–trikona union.`,
        wellnessMeaning: 'Effort meets good fortune; status and achievement through consistent action.',
        plainTitle: 'Effort that gets recognised',
        plainUse: `Two key parts of your chart (${a} and ${b}) work together, linking action with good fortune. Put steady effort behind your main goals — it tends to be rewarded.`,
      });
    }
  }
  // Planets that rule both a kendra and a trikona (Yogakaraka)
  for (const p of SEVEN) {
    const ruled = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(h) === p);
    if (ruled.some((h) => [4, 7, 10].includes(h)) && ruled.some((h) => [5, 9].includes(h))) {
      add({
        name: 'Yogakaraka', category: 'Raja', planets: [p], nature: 'supportive',
        description: `${p} rules both a kendra and a trikona (H${ruled.join(', H')}).`,
        wellnessMeaning: 'A single planet carries the chart’s capacity for success.',
        plainTitle: 'A built-in success planet',
        plainUse: `${p} is especially helpful for you. Its periods and the areas it touches tend to bring progress.`,
      });
    }
  }
  // Dharma-Karmadhipati
  if (related(lordOf(9), lordOf(10))) {
    add({
      name: 'Dharma-Karmadhipati Yoga', category: 'Raja', planets: [lordOf(9), lordOf(10)], nature: 'supportive',
      description: `9th lord (${lordOf(9)}) ${relWord(lordOf(9), lordOf(10))} with 10th lord (${lordOf(10)}).`,
      wellnessMeaning: 'Purpose and profession aligned.',
      plainTitle: 'Work that fits your purpose',
      plainUse: 'Your sense of meaning and your career are linked. Choose work that reflects your values — it tends to go further.',
    });
  }

  // ── Dhana yogas: 2nd/11th lords with 1st/5th/9th lords ──
  for (const w of [2, 11]) {
    for (const t of [1, 5, 9]) {
      const a = lordOf(w), b = lordOf(t);
      if (a !== b && related(a, b)) {
        add({
          name: 'Dhana Yoga', category: 'Dhana', planets: [a, b].sort() as PlanetName[], nature: 'supportive',
          description: `Lord of ${w}H (${a}) ${relWord(a, b)} with lord of ${t}H (${b}).`,
          wellnessMeaning: 'Resources accumulate through steady effort.',
          plainTitle: 'A knack for building resources',
          plainUse: 'Money and fortune are connected in your chart. Patient saving and investing in your skills tend to add up.',
        });
      }
    }
  }
  // Lakshmi
  const l9 = lordOf(9);
  if ((KENDRA.includes(houseOf(l9)) || TRIKONA.includes(houseOf(l9))) && strong(l9) && strong(lordOf(1)) === true) {
    add({
      name: 'Lakshmi Yoga', category: 'Dhana', planets: [l9, lordOf(1)], nature: 'supportive',
      description: `9th lord ${l9} dignified in a kendra/trikona with a strong Lagna lord.`,
      wellnessMeaning: 'Grace, prosperity and generosity.',
      plainTitle: 'Good fortune and generosity',
      plainUse: 'Fortune tends to favour you, especially when you are generous with what you have.',
    });
  }

  // ── Parivartana (exchange) ──
  for (let i = 0; i < SEVEN.length; i++) {
    for (let j = i + 1; j < SEVEN.length; j++) {
      const a = SEVEN[i], b = SEVEN[j];
      if (!exchange(a, b)) continue;
      const hs = [houseOf(a), houseOf(b)];
      const type = hs.some((h) => DUSTHANA.includes(h)) ? 'Dainya' : hs.includes(3) ? 'Khala' : 'Maha';
      add({
        name: `${type} Parivartana Yoga`, category: 'Special', planets: [a, b], nature: type === 'Dainya' ? 'challenging' : 'supportive',
        description: `${a} and ${b} exchange signs (H${hs[0]} ↔ H${hs[1]}).`,
        wellnessMeaning: type === 'Maha' ? 'Two life areas strongly support each other.' : type === 'Khala' ? 'Gains through effort and initiative, with ups and downs.' : 'Struggle that converts into resilience.',
        plainTitle: type === 'Maha' ? 'Two areas of life that feed each other' : type === 'Khala' ? 'Progress through initiative' : 'Strength built through difficulty',
        plainUse: type === 'Maha' ? 'Progress in one of these areas tends to lift the other. Work on both together.' : type === 'Khala' ? 'Results come from your own effort and courage rather than luck.' : 'Some areas of life ask more of you, but working through them builds real resilience.',
      });
    }
  }

  // ── Moon/Lagna-based ──
  const benInFromMoon = (hs: number[]) => BENEFICS.filter((p) => hs.includes(fromMoon(p)));
  const adhi = benInFromMoon([6, 7, 8]);
  if (adhi.length >= 2) {
    add({
      name: 'Adhi Yoga', category: 'Chandra', planets: adhi, nature: 'supportive',
      description: `Benefics ${adhi.join(', ')} in the 6th/7th/8th from the Moon.`,
      wellnessMeaning: 'Leadership, comfort and protection.',
      plainTitle: 'Natural leadership and protection',
      plainUse: 'You tend to be supported by others and can lead calmly. Step into responsibility when it is offered.',
    });
  }
  const lagnadhi = BENEFICS.filter((p) => [6, 7, 8].includes(houseOf(p)));
  if (lagnadhi.length >= 2) {
    add({
      name: 'Lagnadhi Yoga', category: 'Benefic', planets: lagnadhi, nature: 'supportive',
      description: `Benefics ${lagnadhi.join(', ')} in the 6th/7th/8th from Lagna.`,
      wellnessMeaning: 'A good name and a steady life.',
      plainTitle: 'A good reputation',
      plainUse: 'People tend to trust you. Your integrity is one of your best assets.',
    });
  }
  const vasu = BENEFICS.filter((p) => [3, 6, 10, 11].includes(fromMoon(p)));
  if (vasu.length >= 2) {
    add({
      name: 'Vasumati Yoga', category: 'Dhana', planets: vasu, nature: 'supportive',
      description: `Benefics ${vasu.join(', ')} in upachaya houses from the Moon.`,
      wellnessMeaning: 'Prosperity that grows over time.',
      plainTitle: 'Resources that grow with time',
      plainUse: 'Things improve as you get older and more experienced. Play the long game.',
    });
  }
  if ([6, 8, 12].includes(fromMoon('Jupiter')) && !KENDRA.includes(houseOf('Jupiter'))) {
    add({
      name: 'Shakata Yoga', category: 'Chandra', planets: ['Jupiter', 'Moon'], nature: 'challenging',
      description: `Jupiter ${fromMoon('Jupiter')}th from the Moon (not in a kendra from Lagna).`,
      wellnessMeaning: 'Fortune rises and falls like a cart wheel.',
      plainTitle: 'Ups and downs in fortune',
      plainUse: 'Good and lean phases can alternate. Save in the good times so the quieter ones feel easy.',
    });
  }

  // ── Kartari (hemming) ──
  const in2 = (ps: PlanetName[], h: number) => ps.filter((p) => houseOf(p) === h);
  const ben2 = in2(BENEFICS, 2), ben12 = in2(BENEFICS, 12);
  const mal2 = in2(['Sun', 'Mars', 'Saturn'], 2), mal12 = in2(['Sun', 'Mars', 'Saturn'], 12);
  if (ben2.length && ben12.length) {
    add({
      name: 'Shubha Kartari Yoga', category: 'Benefic', planets: [...ben2, ...ben12], nature: 'supportive',
      description: 'Benefics on both sides of the Lagna (2nd and 12th).', wellnessMeaning: 'Protected and supported.',
      plainTitle: 'Surrounded by support', plainUse: 'You tend to be protected by good influences. Lean on the people around you.',
    });
  }
  if (mal2.length && mal12.length) {
    add({
      name: 'Papa Kartari Yoga', category: 'Special', planets: [...mal2, ...mal12], nature: 'challenging',
      description: 'Malefics on both sides of the Lagna (2nd and 12th).', wellnessMeaning: 'Feeling pressed in.',
      plainTitle: 'Feeling squeezed at times', plainUse: 'Pressure can come from several sides. Protect your time and energy with clear boundaries.',
    });
  }

  // ── Classical named yogas ──
  const l1 = lordOf(1);
  if (planets[l1].dignity === 'Exalted' && KENDRA.includes(houseOf(l1)) && aspects('Jupiter', l1)) {
    add({ name: 'Chamara Yoga', category: 'Raja', planets: [l1, 'Jupiter'], nature: 'supportive', description: 'Exalted Lagna lord in a kendra aspected by Jupiter.', wellnessMeaning: 'Honour and eloquence.', plainTitle: 'Respect and a way with words', plainUse: 'People listen to you. Use your voice for things that matter.' });
  }
  const l4 = lordOf(4), l9b = lordOf(9);
  if (KENDRA.includes(((houseOf(l9b) - houseOf(l4) + 12) % 12) + 1) && (strong(l1) || KENDRA.includes(houseOf(l1)))) {
    add({ name: 'Kahala Yoga', category: 'Raja', planets: [l4, l9b], nature: 'supportive', description: '4th and 9th lords in mutual kendras with a strong Lagna lord.', wellnessMeaning: 'Courage and initiative.', plainTitle: 'Boldness when it counts', plainUse: 'You can act with courage. Use it to start the things others hesitate over.' });
  }
  const l5 = lordOf(5), l6 = lordOf(6);
  if (l5 !== l6 && KENDRA.includes(((houseOf(l6) - houseOf(l5) + 12) % 12) + 1) && (strong(l1) || KENDRA.includes(houseOf(l1)))) {
    add({ name: 'Sankha Yoga', category: 'Benefic', planets: [l5, l6], nature: 'supportive', description: '5th and 6th lords in mutual kendras with a strong Lagna lord.', wellnessMeaning: 'Humane, long-lived, cultured.', plainTitle: 'Kindness and good judgement', plainUse: 'Your fairness is noticed. It builds lasting relationships.' });
  }
  if (['Mercury', 'Venus'].some((p) => signOf(p as PlanetName) === signOf('Jupiter')) && [2, 5].includes(houseOf('Jupiter'))) {
    add({ name: 'Kalanidhi Yoga', category: 'Benefic', planets: ['Jupiter'], nature: 'supportive', description: 'Jupiter in the 2nd/5th with Mercury or Venus.', wellnessMeaning: 'Learning, arts and refinement.', plainTitle: 'Talent for learning and the arts', plainUse: 'Study, teaching or creative work tend to suit you and bring rewards.' });
  }
  const benKendra = BENEFICS.filter((p) => KENDRA.includes(houseOf(p)));
  if (benKendra.length >= 2 && ![6, 8].some((h) => MALEFICS.some((m) => houseOf(m) === h))) {
    add({ name: 'Parvata Yoga', category: 'Benefic', planets: benKendra, nature: 'supportive', description: 'Benefics in kendras with the 6th and 8th free of malefics.', wellnessMeaning: 'Prosperity and good standing.', plainTitle: 'Steady and well regarded', plainUse: 'You tend to be stable and respected. Build on that foundation.' });
  }

  // ── Neecha Bhanga (cancelled debilitation) ──
  for (const p of SEVEN) {
    if (planets[p].dignity !== 'Debilitated') continue;
    const debLord = ZODIAC_SIGNS[signOf(p)].lord;
    const exSign = DIGNITIES_MAP[p].exaltation.sign;
    const exLord = ZODIAC_SIGNS.find((s) => s.name === exSign)!.lord;
    const inKendra = (q: PlanetName) => KENDRA.includes(houseOf(q)) || KENDRA.includes(fromMoon(q));
    if (inKendra(debLord) || inKendra(exLord)) {
      add({ name: 'Neechabhanga Raja Yoga', category: 'Raja', planets: [p, debLord], nature: 'supportive', description: `${p} debilitated, cancelled by ${inKendra(debLord) ? debLord : exLord} in a kendra.`, wellnessMeaning: 'Weakness turned into strength.', plainTitle: 'Turning setbacks into strengths', plainUse: `An area that starts out hard (linked to ${p}) tends to become a real strength over time. Don’t give up early.` });
    }
  }

  // ── Nabhasa: Sankhya (number of signs occupied by the seven planets) ──
  const occupied = new Set(SEVEN.map(signOf)).size;
  const sankhya: Record<number, [string, string, string]> = {
    7: ['Vallaki Yoga', 'Many interests', 'Your planets spread across seven signs, so your interests run wide. Pick two or three to go deep on, or you end up good at many things and known for none.'],
    6: ['Dama Yoga', 'Generous and helpful', 'People come to you for help, and you give it. Let it be returned — ask for favours too, not just grant them.'],
    5: ['Pasha Yoga', 'Capable and resourceful', 'You can juggle a lot at once. The risk is saying yes to everything: cap your commitments at a number you set in advance.'],
    4: ['Kedara Yoga', 'Hard-working and grounded', 'You do best with practical work that produces something you can see — a product, a building, a garden, a business. Abstract or purely talk-based work drains you faster.'],
    3: ['Shula Yoga', 'Sharp and determined', 'Your energy is narrow and pointed. One clear goal at a time gets results; three at once gets conflict.'],
    2: ['Yuga Yoga', 'Independent', 'You prefer your own path and resist being managed. Build two or three trusted allies so independence doesn’t turn into isolation.'],
    1: ['Gola Yoga', 'Concentrated energy', 'Your energy is packed into one place. Use it for a single big project, and schedule rest on purpose — you won’t stop on your own.'],
  };
  const [sName, sTitle, sUse] = sankhya[occupied];
  add({ name: sName, category: 'Special', planets: [], nature: 'supportive', description: `Seven planets occupy ${occupied} signs (Nabhasa Sankhya yoga).`, wellnessMeaning: sTitle, plainTitle: sTitle, plainUse: sUse });

  // Ashraya Nabhasa: all seven in movable / fixed / dual signs
  const mod = new Set(SEVEN.map((p) => planets[p].sign.modality));
  if (mod.size === 1) {
    const m = [...mod][0];
    const [n, t, u] = m === 'Chara' ? ['Rajju Yoga', 'Love of movement and travel', 'Travel and change suit you.'] : m === 'Sthira' ? ['Musala Yoga', 'Steadfast and determined', 'Your persistence is your strength.'] : ['Nala Yoga', 'Adaptable and skilful', 'Your flexibility lets you handle many situations.'];
    add({ name: n, category: 'Special', planets: [], nature: 'supportive', description: `All seven planets in ${m} signs.`, wellnessMeaning: t, plainTitle: t, plainUse: u });
  }

  // Graha Malika: planets in 5+ consecutive signs
  const occ = new Set((Object.keys(planets) as PlanetName[]).map(signOf));
  let run = 0, best = 0;
  for (let i = 0; i < 24; i++) {
    run = occ.has(i % 12) ? run + 1 : 0;
    best = Math.max(best, Math.min(run, 12));
  }
  if (best >= 5) {
    add({ name: 'Graha Malika Yoga', category: 'Special', planets: [], nature: 'supportive', description: `Planets in ${best} consecutive signs.`, wellnessMeaning: 'A garland of planets — sustained effort brings rewards.', plainTitle: 'Momentum that builds', plainUse: 'One success tends to lead to the next. Keep going once things start moving.' });
  }

  // ── Arishta (challenging) ──
  const l11 = lordOf(11);
  if (DUSTHANA.includes(houseOf(l11)) && !strong(l11)) {
    add({ name: 'Daridra Yoga', category: 'Special', planets: [l11], nature: 'challenging', description: `11th lord ${l11} in H${houseOf(l11)} without dignity.`, wellnessMeaning: 'Gains need extra effort.', plainTitle: 'Gains take steady effort', plainUse: 'Income and gains may need more effort than usual. Budget carefully and build income in more than one way.' });
  }
  if (DUSTHANA.includes(houseOf(l1)) && !strong(l1)) {
    add({ name: 'Lagna-lord in Dusthana', category: 'Special', planets: [l1], nature: 'challenging', description: `Lagna lord ${l1} in H${houseOf(l1)}.`, wellnessMeaning: 'Vitality needs protection.', plainTitle: 'Your energy needs looking after', plainUse: 'You can give too much of yourself. Rest and routines matter more for you than for most.' });
  }

  return out;
}
