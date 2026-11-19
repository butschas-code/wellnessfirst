/**
 * Life Rhythm — personal insight engine.
 *
 * Turns the full calculation set (house rulerships, Shadbala, Sarvashtakavarga, dignities,
 * dashas, transits, Tarabala/Chandrabala, yogas) into personal, plain-English findings.
 * Every finding carries `evidence` — the exact technical basis, shown in Pro view.
 */
import * as Astronomy from 'astronomy-engine';
import type { ComprehensiveKundliResult, PlanetName, DashaPeriod } from './astro-engine/types.ts';
import { calculatePlanetaryPositions } from './astro-engine/core/ephemeris.ts';
import { apparentBody, earthTilt, trueNode, norm360 } from './astro-engine/core/precision.ts';
import { calculateLahiriAyanamsha } from './astro-engine/core/ayanamsha.ts';
import { ZODIAC_SIGNS, NAKSHATRAS } from './astro-engine/core/constants.ts';
import { LIFE_AREA, AREA_PLAYBOOK } from './astro-content.ts';
import { VIMSHOTTARI_DASHA_CYCLE } from './astro-engine/core/constants.ts';

export type PlanetKey = PlanetName;
export type Level = 'strong' | 'good' | 'average' | 'low';

const SEVEN: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/* ═══════════ Life-area support (Sarvashtakavarga) ═══════════ */

export interface AreaSupport {
  house: number;
  points: number;
  level: Level;
  name: string;
  about: string;
  /** ELI5 phrase, e.g. "well supported". */
  phrase: string;
}

export function areaSupport(chart: ComprehensiveKundliResult, house: number): AreaSupport {
  const points = (chart.ashtakavarga.housePoints as number[])[house - 1] ?? 28;
  const level: Level = points >= 32 ? 'strong' : points >= 28 ? 'good' : points >= 25 ? 'average' : 'low';
  const phrase = {
    strong: 'very well supported',
    good: 'well supported',
    average: 'moderately supported',
    low: 'less naturally supported',
  }[level];
  return { house, points, level, phrase, ...LIFE_AREA[house] };
}

export function allAreas(chart: ComprehensiveKundliResult): AreaSupport[] {
  return Array.from({ length: 12 }, (_, i) => areaSupport(chart, i + 1));
}

/* ═══════════ Planet condition ═══════════ */

export interface PlanetCondition {
  planet: PlanetName;
  house: number;
  rules: number[];
  level: Level;
  /** ELI5 e.g. "one of your strongest influences". */
  phrase: string;
  dignityPlain: string;
  evidence: string;
}

const DIGNITY_PLAIN: Record<string, string> = {
  Exalted: 'at its very best',
  Moolatrikona: 'in one of its strongest positions',
  OwnSign: 'at home',
  Friendly: 'in friendly territory',
  Neutral: 'in neutral territory',
  Enemy: 'in uncomfortable territory',
  Debilitated: 'in its most challenging position',
};

export function housesRuledBy(chart: ComprehensiveKundliResult, p: PlanetName): number[] {
  return chart.houses.filter((h) => h.sign.lord === p).map((h) => h.houseNumber);
}

export const ORD = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const pname = (p: string) => (p === 'Sun' || p === 'Moon' ? `the ${p}` : p);
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const fix = (n: number, d = 2) => Number(n).toFixed(d);
const nodeWord = (p: PlanetName) => (p === 'Rahu' ? 'Rahu (the north lunar node)' : p === 'Ketu' ? 'Ketu (the south lunar node)' : p);

const DIGNITY_PRO: Record<string, string> = {
  Exalted: 'exalted (uchcha) — the sign where it is strongest',
  Moolatrikona: 'in its moolatrikona sign — its "office", very dependable',
  OwnSign: 'in its own sign (swakshetra) — fully in control',
  Friendly: 'in the sign of a friend (by five-fold friendship) — works with modest effort',
  Neutral: 'in a neutral sign — gives results in proportion to effort',
  Enemy: 'in the sign of an enemy (by five-fold friendship) — works with friction',
  Debilitated: 'debilitated (neecha) — the sign where it is weakest',
};

/**
 * Pro view: one planet, fully explained — position, house, dignity, what it rules, Shadbala.
 * Written so a reader who knows some astrology can check every number.
 */
export function explainPlanet(chart: ComprehensiveKundliResult, p: PlanetName): string {
  const pos = chart.planets[p];
  const rules = housesRuledBy(chart, p);
  const sb = (chart.shadbala as Record<string, any>)[p];
  const out = [
    `${nodeWord(p)} is at ${pos.formattedDegree} ${pos.sign.name} (${pos.nakshatra.name} nakshatra) in your ${ORD(pos.house)} house, counted from the rising sign (Lagna). It is ${DIGNITY_PRO[pos.dignity] ?? DIGNITY_PRO.Neutral}${pos.isRetrograde ? ', and retrograde' : ''}.`,
  ];
  if (rules.length) out.push(`It rules (is lord of) your ${joinAnd(rules.map((h) => `${ORD(h)} house — ${LIFE_AREA[h].name.toLowerCase()}`))}, so it also delivers the results of ${rules.length > 1 ? 'those houses' : 'that house'}.`);
  if (sb) {
    out.push(
      `Shadbala (the six-fold strength from BPHS) is ${fix(sb.totalRupas)} rupas against a classical minimum of ${fix(sb.requiredRupas, 1)} for ${p}: ${Math.round(sb.strengthRatio * 100)}%. At 100% or more a planet can fully give its results; below 100% it gives them partially or late. It ranks ${sb.rank} of the 7 planets in your chart.`
    );
  } else {
    out.push(`The nodes have no Shadbala. They give the results of the house they occupy and of the planet that owns their sign (here ${pos.sign.lord}, in your ${ORD(chart.planets[pos.sign.lord].house)} house).`);
  }
  return out.join(' ');
}

/** Pro view: a house's Sarvashtakavarga score, explained with its rank. */
export function explainArea(chart: ComprehensiveKundliResult, h: number): string {
  const a = areaSupport(chart, h);
  const rank = allAreas(chart).sort((x, y) => y.points - x.points).findIndex((x) => x.house === h) + 1;
  const sign = chart.houses[h - 1].sign;
  return `Your ${ORD(h)} house (${a.name.toLowerCase()}; ${sign.name}, ruled by ${sign.lord}) has ${a.points} Sarvashtakavarga points (bindus). The 12 houses always share 337 points, so 28 is average: 28+ counts as supported, 32+ as strong, under 25 as weak. This house ranks ${rank} of 12 in your chart.`;
}

/** Plain view: a planet's overall capacity, no numbers. */
export function strengthPlain(chart: ComprehensiveKundliResult, p: PlanetName, withPlace = true): { text: string; level: Level } {
  const sb = (chart.shadbala as Record<string, any>)[p];
  const pos = chart.planets[p];
  const place = DIGNITY_PLAIN[pos.dignity] ?? 'in neutral territory';
  if (!sb) {
    const a = areaSupport(chart, pos.house);
    return { level: a.level, text: `${p === 'Rahu' ? 'The north node' : 'The south node'} has no strength of its own — it amplifies whatever part of life it sits in, and in your chart that part of life is ${a.phrase}.` };
  }
  const r = sb.strengthRatio as number;
  const power = r >= 1.2 ? 'has more than enough power to deliver' : r >= 1 ? 'has just enough power to deliver' : 'is short of the power it needs, so it delivers slowly or partly';
  const rel = sb.rank <= 2 ? 'one of the two most powerful planets in your chart' : sb.rank >= 6 ? 'one of the less powerful planets in your chart' : 'mid-range compared with your other planets';
  const level: Level = r >= 1.2 && sb.rank <= 3 ? 'strong' : r >= 1.1 ? 'good' : r >= 0.95 ? 'average' : 'low';
  return { level, text: withPlace ? `${cap1(pname(p))} is ${rel}, ${power}, and it sits ${place}.` : `${cap1(pname(p))} is ${rel} and ${power}.` };
}

export function planetCondition(chart: ComprehensiveKundliResult, p: PlanetName): PlanetCondition {
  const pos = chart.planets[p];
  const rules = housesRuledBy(chart, p);
  const sb = (chart.shadbala as Record<string, any>)[p];
  let level: Level;
  let phrase: string;
  let strengthEv = '';
  if (sb) {
    const r = sb.strengthRatio as number;
    level = r >= 1.4 ? 'strong' : r >= 1.1 ? 'good' : r >= 0.9 ? 'average' : 'low';
    phrase = {
      strong: 'one of the strongest influences in your chart',
      good: 'a solid influence in your chart',
      average: 'a moderate influence in your chart',
      low: 'one of the quieter influences in your chart',
    }[level];
    strengthEv = ` · Shadbala ${sb.totalRupas} Rp (${Math.round(r * 100)}% of ${sb.requiredRupas}, rank ${sb.rank}/7)`;
  } else {
    // Nodes: judge by dignity of dispositor and SAV of the house they occupy.
    const sav = areaSupport(chart, pos.house).level;
    level = sav;
    phrase = 'an influence that amplifies whatever area it sits in';
  }
  if (pos.dignity === 'Exalted' || pos.dignity === 'OwnSign' || pos.dignity === 'Moolatrikona') {
    if (level === 'average' || level === 'low') level = 'good';
  }
  return {
    planet: p,
    house: pos.house,
    rules,
    level,
    phrase,
    dignityPlain: DIGNITY_PLAIN[pos.dignity] ?? 'in neutral territory',
    evidence: explainPlanet(chart, p),
  };
}

/* ═══════════ Chapters (dasha) ═══════════ */

export interface ChapterInsight {
  lord: PlanetName;
  start: Date;
  end: Date;
  /** Main stage: the life area the lord occupies. */
  stage: AreaSupport;
  /** Areas the lord rules — the topics this chapter keeps bringing up. */
  topics: AreaSupport[];
  condition: PlanetCondition;
  /** 'strong' | 'good' | 'average' | 'low' — overall support for this chapter. */
  support: Level;
  supportText: string;
  advice: string;
  evidence: string;
}

function combine(a: Level, b: Level): Level {
  const v = { strong: 3, good: 2, average: 1, low: 0 };
  const avg = (v[a] + v[b]) / 2;
  return avg >= 2.5 ? 'strong' : avg >= 1.5 ? 'good' : avg >= 0.75 ? 'average' : 'low';
}

export function chapterInsight(chart: ComprehensiveKundliResult, period: DashaPeriod): ChapterInsight {
  const cond = planetCondition(chart, period.lord);
  const stage = areaSupport(chart, cond.house);
  const topics = cond.rules.filter((h) => h !== cond.house).map((h) => areaSupport(chart, h));
  const support = combine(cond.level, stage.level);
  const supportText = {
    strong: 'Your chart gives this chapter strong backing. Effort you put in here tends to pay off well.',
    good: 'Your chart gives this chapter good backing. Steady effort tends to be rewarded.',
    average: 'Your chart gives this chapter moderate backing. Progress comes, but it asks for patience and good habits.',
    low: 'Your chart gives this chapter less natural backing. Go step by step, ask for support, and protect your energy — this chapter rewards patience more than force.',
  }[support];
  const advice =
    support === 'strong' || support === 'good'
      ? `Lean into ${stage.name.toLowerCase()} — that is where this chapter does its best work.`
      : `Build a steady routine around ${stage.name.toLowerCase()} rather than pushing hard all at once.`;
  return {
    lord: period.lord,
    start: period.startDate,
    end: period.endDate,
    stage,
    topics,
    condition: cond,
    support,
    supportText,
    advice,
    evidence: `${cond.evidence} ${explainArea(chart, stage.house)}`,
  };
}

/** How the main chapter and the current phase blend (house distance between their lords). */
export function blendInsight(chart: ComprehensiveKundliResult, md: PlanetName, ad: PlanetName) {
  if (md === ad) return { tone: 'good' as Level, text: 'The current phase repeats the theme of the whole chapter, so its themes come through especially clearly.', evidence: `Both the main period (mahadasha) and the current sub-period (antardasha) are run by ${md}, so its results are doubled.` };
  const a = chart.planets[md].house;
  const b = chart.planets[ad].house;
  const dist = ((b - a + 12) % 12) + 1;
  const [tone, text]: [Level, string] = [1, 5, 9].includes(dist)
    ? ['strong', 'The current phase works in harmony with the bigger chapter — a good time to make progress on its themes.']
    : [3, 11, 10, 4, 7].includes(dist)
      ? ['good', 'The current phase supports the bigger chapter through effort and teamwork.']
      : [6, 8, 12].includes(dist)
        ? ['low', 'The current phase pulls in a slightly different direction from the bigger chapter. Expect some friction — keep your priorities simple.']
        : ['average', 'The current phase adds a new focus alongside the bigger chapter.'];
  return { tone, text, evidence: `${md} (main period) sits in your ${ORD(a)} house and ${ad} (current sub-period) in your ${ORD(b)}. Counted from ${md}, ${ad} is ${ORD(dist)}. Placements 1st/5th/9th from each other (trines) blend best; 3rd/4th/7th/10th/11th support each other; 6th/8th/12th (dusthana) pull against each other.` };
}

/* ═══════════ Today: personal day quality ═══════════ */

const TARA = [
  { name: 'Janma', good: false, plain: 'a sensitive day — your own star returns' },
  { name: 'Sampat', good: true, plain: 'a day that favours gains and progress' },
  { name: 'Vipat', good: false, plain: 'a day that can bring small obstacles' },
  { name: 'Kshema', good: true, plain: 'a day of wellbeing and ease' },
  { name: 'Pratyak', good: false, plain: 'a day that can bring resistance' },
  { name: 'Sadhana', good: true, plain: 'a day where effort gets results' },
  { name: 'Naidhana', good: false, plain: 'a day to go gently and avoid big risks' },
  { name: 'Mitra', good: true, plain: 'a friendly, supportive day' },
  { name: 'Parama Mitra', good: true, plain: 'a very supportive day' },
];

export interface DayInsight {
  score: number; // 0–100
  level: 'good' | 'steady' | 'light';
  taraName: string;
  taraGood: boolean;
  taraPlain: string;
  chandraHouse: number;
  chandraGood: boolean;
  moonArea: AreaSupport;
  moonSignName: string;
  moonNakshatra: string;
  evidence: string;
}

export function dayInsight(chart: ComprehensiveKundliResult, now: Date, transitTone: string): DayInsight {
  const sky = calculatePlanetaryPositions(now, chart.ascendant.sign.index);
  const moon = sky.Moon;
  const birthNak = chart.planets.Moon.nakshatra.index;
  const count = ((moon.nakshatra.index - birthNak + 27) % 27) + 1;
  const tara = TARA[(count - 1) % 9];
  const chandraHouse = ((moon.sign.index - chart.planets.Moon.sign.index + 12) % 12) + 1;
  const chandraGood = [1, 3, 6, 7, 10, 11].includes(chandraHouse);
  const moonArea = areaSupport(chart, moon.house);

  let score = 50;
  score += tara.good ? 18 : -14;
  score += chandraGood ? 14 : -10;
  score += transitTone === 'Highly Supportive' ? 12 : transitTone === 'Challenging / Preservative' ? -12 : 0;
  score += moonArea.level === 'strong' ? 6 : moonArea.level === 'low' ? -6 : 0;
  score = Math.max(5, Math.min(95, score));
  const level = score >= 64 ? 'good' : score >= 42 ? 'steady' : 'light';

  return {
    score,
    level,
    taraName: tara.name,
    taraGood: tara.good,
    taraPlain: tara.plain,
    chandraHouse,
    chandraGood,
    moonArea,
    moonSignName: moon.sign.name,
    moonNakshatra: moon.nakshatra.name,
    evidence: `Tarabala: today's Moon nakshatra (${moon.nakshatra.name}) is number ${count} counted from your birth nakshatra (${chart.planets.Moon.nakshatra.name}), which gives the tara "${tara.name}" — ${tara.good ? 'one of the favourable taras' : 'one of the difficult taras (Janma, Vipat, Pratyak and Naidhana are the difficult ones)'}. Chandrabala: the Moon is ${ORD(chandraHouse)} from your birth Moon sign, which is ${chandraGood ? 'favourable (1st, 3rd, 6th, 7th, 10th and 11th are good)' : 'unfavourable (only 1st, 3rd, 6th, 7th, 10th and 11th are good)'}. The Moon is in ${moon.sign.name}, your ${ORD(moon.house)} house (${moonArea.points} Sarvashtakavarga points). Overall transit picture (gochara from the Moon): ${transitTone}.`,
  };
}

/* ═══════════ Slow transits with real dates ═══════════ */

function siderealLongitude(p: 'Jupiter' | 'Saturn' | 'Rahu', date: Date): number {
  const ayan = calculateLahiriAyanamsha(date);
  if (p === 'Rahu') return norm360(trueNode(date) - ayan);
  const body = p === 'Jupiter' ? Astronomy.Body.Jupiter : Astronomy.Body.Saturn;
  return norm360(apparentBody(body, date).longitude - earthTilt(date).dpsi - ayan);
}

/** Next date the planet changes sign, searched day by day then refined. */
function nextIngress(p: 'Jupiter' | 'Saturn' | 'Rahu', from: Date, maxDays: number): Date | null {
  const sign0 = Math.floor(siderealLongitude(p, from) / 30);
  const step = 4;
  let prev = from;
  for (let d = step; d <= maxDays; d += step) {
    const t = new Date(from.getTime() + d * 86_400_000);
    if (Math.floor(siderealLongitude(p, t) / 30) !== sign0) {
      let lo = prev.getTime(), hi = t.getTime();
      while (hi - lo > 3_600_000 * 6) {
        const mid = (lo + hi) / 2;
        if (Math.floor(siderealLongitude(p, new Date(mid)) / 30) === sign0) lo = mid; else hi = mid;
      }
      return new Date(hi);
    }
    prev = t;
  }
  return null;
}

export interface SlowTransit {
  planet: 'Jupiter' | 'Saturn' | 'Rahu';
  signName: string;
  houseFromAsc: number;
  houseFromMoon: number;
  area: AreaSupport;
  until: Date | null;
  favourable: boolean;
  plain: string;
  evidence: string;
}

const FAV_FROM_MOON: Record<string, number[]> = {
  Jupiter: [2, 5, 7, 9, 11],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
};

export function slowTransits(chart: ComprehensiveKundliResult, now: Date): SlowTransit[] {
  const ascIdx = chart.ascendant.sign.index;
  const moonIdx = chart.planets.Moon.sign.index;
  const span = { Jupiter: 500, Saturn: 1200, Rahu: 700 } as const;
  return (['Jupiter', 'Saturn', 'Rahu'] as const).map((p) => {
    const L = siderealLongitude(p, now);
    const signIdx = Math.floor(L / 30);
    const h = ((signIdx - ascIdx + 12) % 12) + 1;
    const hm = ((signIdx - moonIdx + 12) % 12) + 1;
    const area = areaSupport(chart, h);
    const favourable = FAV_FROM_MOON[p].includes(hm);
    const until = nextIngress(p, now, span[p]);
    const verb = { Jupiter: 'brings growth and opportunity to', Saturn: 'asks for patience and structure in', Rahu: 'brings change and new appetite to' }[p];
    const quality = favourable
      ? 'This tends to be a supportive placement for you.'
      : p === 'Jupiter'
        ? 'Its help here is quieter — make the most of it with steady effort.'
        : 'Expect it to feel like hard work — slow and steady wins.';
    return {
      planet: p,
      signName: ZODIAC_SIGNS[signIdx].name,
      houseFromAsc: h,
      houseFromMoon: hm,
      area,
      until,
      favourable,
      plain: `${p === 'Rahu' ? 'The north node' : p} currently ${verb} the part of your life about ${AREA_PLAYBOOK[h].shows}. ${quality} ${favourable ? `Use it: ${AREA_PLAYBOOK[h].act[0].charAt(0).toLowerCase() + AREA_PLAYBOOK[h].act[0].slice(1)}.` : `Protect it: watch out for ${AREA_PLAYBOOK[h].risk}.`}`,
      evidence: `${p} is moving through ${ZODIAC_SIGNS[signIdx].name}: your ${ORD(h)} house counted from the Lagna (which life area it affects) and ${ORD(hm)} counted from your Moon (classical transit results, gochara, are judged from the Moon; for ${p} the good positions from the Moon are ${FAV_FROM_MOON[p].map(ORD).join(', ')}). That house has ${area.points} Sarvashtakavarga points — more points, more help from the transit.${until ? ` It changes sign around ${until.toISOString().slice(0, 10)}.` : ''}`,
    };
  });
}

/* ═══════════ Profile-level findings ═══════════ */

export interface Finding {
  title: string;
  text: string;
  evidence: string;
}

/** Strongest planets → what comes naturally, explained by why they are strong. */
export function naturalStrengths(chart: ComprehensiveKundliResult, copy: Record<string, { title: string; natural: string; effort: string }>) {
  const sb = Object.values(chart.shadbala as Record<string, any>).sort((a, b) => b.strengthRatio - a.strengthRatio);
  const why = (p: PlanetName) => {
    const s = (chart.shadbala as any)[p];
    const c = s.components ?? {};
    const reasons: string[] = [];
    if (s.sthanaBala > 200) reasons.push('well placed');
    if (s.digBala > 45) reasons.push('in its best direction');
    if (s.chestaBala > 40) reasons.push('moving with strength');
    if (s.drikBala > 10) reasons.push('supported by helpful planets');
    if ((c.ayana ?? 0) > 50 && p !== 'Sun') reasons.push('boosted by the season of your birth');
    return reasons.length ? `It is strong because it is ${reasons.slice(0, 2).join(' and ')}.` : '';
  };
  const describe = (s: any, kind: 'natural' | 'effort'): Finding => {
    const p = s.planet as PlanetName;
    const cond = planetCondition(chart, p);
    const area = LIFE_AREA[cond.house];
    return {
      title: copy[p]?.title ?? p,
      text:
        kind === 'natural'
          ? `${copy[p]?.natural ?? ''} This shows up most in the part of your life about ${AREA_PLAYBOOK[cond.house].shows}. ${why(p)}`
          : `${copy[p]?.effort ?? ''} It plays out mostly in the part of your life about ${AREA_PLAYBOOK[cond.house].shows}.`,
      evidence: cond.evidence,
    };
  };
  return {
    top: sb.slice(0, 3).map((s) => describe(s, 'natural')),
    low: sb.slice(-2).reverse().map((s) => describe(s, 'effort')),
  };
}

/** Where life tends to flow most and least easily (SAV extremes). */
export function areaExtremes(chart: ComprehensiveKundliResult) {
  const all = allAreas(chart).sort((a, b) => b.points - a.points);
  return { best: all.slice(0, 3), hardest: all.slice(-2).reverse() };
}

export const WORK_VIA_HOUSE: Record<number, string> = {
  1: 'roles where you are the face of the work and set your own direction',
  2: 'work with money, food, voice, values or anything that builds lasting resources',
  3: 'writing, media, sales, marketing, design or hands-on skills',
  4: 'work rooted in home, property, education, care or a strong team culture',
  5: 'creative work, teaching, strategy, entertainment or working with young people',
  6: 'service, health, problem-solving, operations, law or improving systems',
  7: 'partnerships, client work, negotiation, consulting or public-facing roles',
  8: 'research, finance, investigation, psychology, crisis or transformation work',
  9: 'teaching, law, publishing, travel, philosophy or advisory roles',
  10: 'leadership, management, public roles or building a strong reputation',
  11: 'networks, technology, communities, large organisations or fundraising',
  12: 'behind-the-scenes, international, research, retreat, care or creative-solitary work',
};

export function careerFindings(chart: ComprehensiveKundliResult) {
  const h10 = chart.houses[9];
  const lord = h10.sign.lord;
  const cond = planetCondition(chart, lord);
  const a10 = areaSupport(chart, 10);
  const a2 = areaSupport(chart, 2);
  const a11 = areaSupport(chart, 11);
  const inH10 = chart.houses[9].planets;
  return {
    direction: {
      title: 'Work that tends to suit you',
      text: `Your career area is guided by ${lord === 'Rahu' || lord === 'Ketu' ? 'the lunar node' : lord}, which sits in the part of your life about ${AREA_PLAYBOOK[cond.house].shows}. That points to work in ${WORK_VIA_HOUSE[cond.house]}. ${strengthPlain(chart, lord).text}`,
      evidence: `Your 10th house (career) is ${h10.sign.name}, so its ruler is ${lord}. ${cond.evidence}${inH10.length ? ` Planets in the 10th house: ${inH10.join(', ')}.` : ''}`,
    },
    career: {
      title: 'Career support',
      text: `Compared with the rest of your chart, your career area is ${a10.phrase}. ${a10.level === 'strong' || a10.level === 'good' ? 'Visible effort at work tends to be noticed and rewarded.' : 'Recognition tends to come through steady, consistent work rather than quick wins.'}`,
      evidence: explainArea(chart, 10),
    },
    savings: {
      title: 'Saving and keeping money',
      text: `Your money-and-savings area is ${a2.phrase}. ${a2.points >= 28 ? 'You tend to hold on to resources well — let savings build automatically.' : 'Money can slip away more easily — automatic transfers to savings on payday help a lot.'}`,
      evidence: `${explainArea(chart, 2)} Its ruler ${chart.houses[1].sign.lord} sits in your ${ORD(chart.planets[chart.houses[1].sign.lord].house)} house.`,
    },
    gains: {
      title: 'Gains through people',
      text: `Your area of friends and gains is ${a11.phrase}. ${a11.points >= 28 ? 'Opportunities tend to come through your network — stay connected.' : 'A few deep, trusted relationships will serve you better than a large network.'}`,
      evidence: `${explainArea(chart, 11)} Its ruler ${chart.houses[10].sign.lord} sits in your ${ORD(chart.planets[chart.houses[10].sign.lord].house)} house.`,
    },
  };
}

export function healthFindings(chart: ComprehensiveKundliResult) {
  const lagnaLord = chart.ascendant.sign.lord;
  const lc = planetCondition(chart, lagnaLord);
  const a1 = areaSupport(chart, 1);
  const a6 = areaSupport(chart, 6);
  const moon = planetCondition(chart, 'Moon');
  return [
    {
      title: 'Your core vitality',
      text: `The planet that represents you, ${lagnaLord}, is ${lc.phrase} and sits ${lc.dignityPlain}. Your energy area is ${a1.phrase}. ${
        lc.level === 'strong' || lc.level === 'good' ? 'You tend to have good reserves — just don’t mistake that for unlimited.' : 'Your energy is precious — guard sleep and recovery like appointments.'
      }`,
      evidence: `The ruler of your rising sign (Lagna lord) is ${lagnaLord}. ${lc.evidence} ${explainArea(chart, 1)}`,
    },
    {
      title: 'Emotional resilience',
      text: `Your Moon — which shows how you handle stress — is ${moon.phrase} and sits ${moon.dignityPlain}. ${
        moon.level === 'strong' || moon.level === 'good' ? 'You tend to bounce back well after hard days.' : 'Stress can linger, so build regular decompression into your week.'
      }`,
      evidence: moon.evidence,
    },
    {
      title: 'Daily habits',
      text: `Your area of routines and health is ${a6.phrase}. ${
        a6.points >= 28 ? 'Good habits tend to stick once you start them.' : 'Habits take more effort to establish — start very small and keep it daily.'
      }`,
      evidence: `${explainArea(chart, 6)} Its ruler ${chart.houses[5].sign.lord} sits in your ${ORD(chart.planets[chart.houses[5].sign.lord].house)} house.`,
    },
  ];
}

export function relationshipFindings(chart: ComprehensiveKundliResult) {
  const a7 = areaSupport(chart, 7);
  const lord7 = chart.houses[6].sign.lord;
  const c7 = planetCondition(chart, lord7);
  const venus = planetCondition(chart, 'Venus');
  return [
    {
      title: 'Partnership in your chart',
      text: `Your partnership area is ${a7.phrase}. It is guided by ${lord7}, which sits in the part of your life about ${AREA_PLAYBOOK[c7.house].shows} — so ${LIFE_AREA[c7.house].about.toLowerCase()} often play a part in how close relationships develop.`,
      evidence: `${explainArea(chart, 7)} ${c7.evidence}`,
    },
    {
      title: 'Warmth and affection',
      text: `Venus, which shows how you give and receive affection, is ${venus.phrase} and sits ${venus.dignityPlain}. ${
        venus.level === 'strong' || venus.level === 'good' ? 'Warmth tends to come naturally to you.' : 'Showing affection may need a little conscious attention — small daily gestures matter.'
      }`,
      evidence: venus.evidence,
    },
  ];
}

export function childrenFindings(chart: ComprehensiveKundliResult) {
  const a5 = areaSupport(chart, 5);
  const lord5 = chart.houses[4].sign.lord;
  const c5 = planetCondition(chart, lord5);
  const jup = planetCondition(chart, 'Jupiter');
  return [
    {
      title: 'Children and creativity in your chart',
      text: `Your area of children and creativity is ${a5.phrase}. It is guided by ${lord5}, which sits in the part of your life about ${AREA_PLAYBOOK[c5.house].shows} — so that is where creative ideas and your bond with children tend to grow.`,
      evidence: `${explainArea(chart, 5)} ${c5.evidence}`,
    },
    {
      title: 'Guidance and patience',
      text: `Jupiter — the natural teacher — is ${jup.phrase}. ${
        jup.level === 'strong' || jup.level === 'good' ? 'Patience and good guidance tend to come naturally to you as a parent or mentor.' : 'Patience may take conscious practice — a pause before reacting goes a long way.'
      }`,
      evidence: jup.evidence,
    },
  ];
}

export { NAKSHATRAS, SEVEN };

/* ═══════════ Phase brief: specific, dated and actionable ═══════════ */

const YEAR = 365.2425 * 86_400_000;

export interface PhaseBrief {
  lord: PlanetName;
  start: Date;
  end: Date;
  /** Life areas this phase activates: where the lord sits first, then what it rules. */
  areas: Array<AreaSupport & { role: 'sits in' | 'rules' }>;
  why: string;
  strength: string;
  actions: string[];
  close: string[];
  risk: string | null;
  roadmap: Array<{ lord: PlanetName; start: Date; end: Date; area: AreaSupport }>;
  evidence: string;
}

export function phaseBrief(chart: ComprehensiveKundliResult, period: DashaPeriod): PhaseBrief {
  const cond = planetCondition(chart, period.lord);
  const sits = { ...areaSupport(chart, cond.house), role: 'sits in' as const };
  const rules = cond.rules.filter((h) => h !== cond.house).map((h) => ({ ...areaSupport(chart, h), role: 'rules' as const }));
  const areas = [sits, ...rules];
  const word = period.lord === 'Rahu' ? 'the north node (Rahu)' : period.lord === 'Ketu' ? 'the south node (Ketu)' : pname(period.lord);
  const P = (h: number) => AREA_PLAYBOOK[h].shows;
  const why =
    `For this stretch of time, ${word} sets the agenda. In your chart it lives in the part of life about ${P(sits.house)} — so that is where things move first and where you will feel this phase most.` +
    (rules.length
      ? ` It is also in charge of ${joinAnd(rules.map((r) => P(r.house)))}. These are linked now: what happens with ${LIFE_AREA[sits.house].name.toLowerCase()} feeds straight into ${joinAnd(rules.map((r) => LIFE_AREA[r.house].name.toLowerCase()))} — progress in one lifts the other, and a problem in one shows up in the other.`
      : '') +
    ` Practically: plan your next months around these areas, because what you start or repair here tends to hold for the rest of this phase (until ${period.endDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}).`;

  const sp = strengthPlain(chart, period.lord);
  const pos = chart.planets[period.lord];
  const hardSign = ['Debilitated', 'Enemy'].includes(pos.dignity);
  const advice =
    sp.level === 'strong' || sp.level === 'good'
      ? 'What that means for you: this phase rewards initiative. Aim higher than usual, ask clearly for what you want, and start the bigger projects now rather than later — the backing is there.'
      : sp.level === 'average'
        ? 'What that means for you: results come from steady, consistent effort rather than big pushes. Choose two or three priorities and work on them every week instead of chasing everything.'
        : 'What that means for you: results come more slowly in this phase. Set smaller milestones, keep a buffer of time and money, and get good advice before big commitments.';
  const strength = `How well equipped is ${period.lord === 'Rahu' || period.lord === 'Ketu' ? 'this node' : pname(period.lord)} to deliver? ${sp.text} ${advice}${hardSign ? ' Because its position is uncomfortable, early efforts may be underrated — keep a record of what you achieve and build allies.' : ''}`;

  const actions = areas.slice(0, 2).flatMap((a) => AREA_PLAYBOOK[a.house].act.slice(0, a.role === 'sits in' ? 2 : 1));
  if (actions.length < 3 && areas[0]) actions.push(AREA_PLAYBOOK[areas[0].house].act[2]);
  const close = areas.map((a) => AREA_PLAYBOOK[a.house].close);
  const weakest = [...areas].sort((a, b) => a.points - b.points)[0];
  const risk = weakest && weakest.points < 28 ? `The weak spot in this phase is ${weakest.name.toLowerCase()} — it gets less built-in support in your chart than most areas. Guard against ${AREA_PLAYBOOK[weakest.house].risk}.` : null;

  // Sub-phases (pratyantardashas) inside this period, each with its main area.
  const startIdx = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === period.lord);
  const roadmap: PhaseBrief['roadmap'] = [];
  let t = period.startDate.getTime();
  for (let i = 0; i < 9; i++) {
    const it = VIMSHOTTARI_DASHA_CYCLE[(startIdx + i) % 9];
    const ms = ((period.durationYears * it.years) / 120) * YEAR;
    roadmap.push({ lord: it.lord, start: new Date(t), end: new Date(t + ms), area: areaSupport(chart, chart.planets[it.lord].house) });
    t += ms;
  }

  return {
    lord: period.lord,
    start: period.startDate,
    end: period.endDate,
    areas,
    why,
    strength,
    actions,
    close,
    risk,
    roadmap,
    evidence: `This is the ${period.lord} mahadasha (Vimshottari), ${period.startDate.toISOString().slice(0, 10)} to ${period.endDate.toISOString().slice(0, 10)}. A dasha lord gives the results of the house it occupies first, then of the houses it rules. ${cond.evidence} ${areas.map((a) => explainArea(chart, a.house)).join(' ')}`,
  };
}

/* ═══════════ Life-area reports: specific, dated, actionable ═══════════ */

/** What each planet brings to any area it occupies or runs — concrete behavioural effects. */
export const PLANET_NATURE: Record<PlanetName, { brings: string; works: string }> = {
  Sun: { brings: 'visibility, authority and pride', works: 'leading openly and owning decisions; it struggles under micromanagement' },
  Moon: { brings: 'feelings, care, the public and fluctuation', works: 'rhythm and emotional safety; results rise and fall in cycles' },
  Mars: { brings: 'drive, competition, conflict and speed', works: 'direct action and clear targets; it overheats without an outlet' },
  Mercury: { brings: 'communication, analysis, trade and skills', works: 'writing things down, negotiating and learning; it scatters when overloaded' },
  Jupiter: { brings: 'growth, wisdom, teachers and generosity', works: 'learning, mentoring and long-term plans; it overpromises when unchecked' },
  Venus: { brings: 'relationships, comfort, beauty and value', works: 'quality, charm and fair exchange; it avoids conflict too long' },
  Saturn: { brings: 'discipline, delay, duty and endurance', works: 'patience and systems; results come slowly but last' },
  Rahu: { brings: 'ambition, the unconventional, technology and foreign links', works: 'bold, new approaches; it creates restlessness and overreach' },
  Ketu: { brings: 'detachment, depth, research and sudden endings', works: 'specialist depth and letting go; it can make you disengage' },
};

const DIGNITY_EFFECT: Record<string, string> = {
  Exalted: 'is at its very strongest here — this is a genuine asset to build on deliberately',
  Moolatrikona: 'is in one of its most comfortable positions — reliable, consistent results',
  OwnSign: 'is in its own sign — you have natural command over this area',
  Friendly: 'is in a friendly sign — things work with modest effort',
  Neutral: 'is in a neutral sign — results match the effort you put in',
  Enemy: 'is in an uncomfortable sign — expect friction; structure and good advisers compensate',
  Debilitated: 'is in its weakest sign — early efforts are often undervalued, so build proof, allies and patience',
};

export interface TimingWindow {
  start: Date;
  end: Date;
  strength: 'strong' | 'good';
  why: string;
}

/** Dated windows in the next `months` when these houses are activated by dasha sub-periods or Jupiter's transit. */
export function areaWindows(chart: ComprehensiveKundliResult, houses: number[], from: Date, months = 24): TimingWindow[] {
  const to = new Date(from.getTime() + months * 30.44 * 86_400_000);
  const involve = (p: PlanetName) => {
    const sits = houses.includes(chart.planets[p].house) ? 2 : 0;
    const rules = housesRuledBy(chart, p).some((h) => houses.includes(h)) ? 1 : 0;
    return sits + rules;
  };
  const role = (p: PlanetName) => (houses.includes(chart.planets[p].house) ? 'sits in this area' : housesRuledBy(chart, p).some((h) => houses.includes(h)) ? 'runs this area' : 'connects to it');
  const out: TimingWindow[] = [];
  for (const md of chart.dasha.mahadashas) {
    if (md.endDate < from || md.startDate > to) continue;
    for (const ad of md.antardashas ?? []) {
      if (ad.endDate < from || ad.startDate > to) continue;
      const adScore = involve(ad.lord);
      if (adScore >= 2 || (adScore >= 1 && involve(md.lord) >= 1)) {
        out.push({
          start: ad.startDate < from ? from : ad.startDate,
          end: ad.endDate,
          strength: adScore >= 2 && involve(md.lord) >= 1 ? 'strong' : 'good',
          why: `${cap1(pname(ad.lord))}, which ${role(ad.lord)}, is in charge for these months — a sustained push for this area. Use it for the bigger moves.`,
        });
        continue;
      }
      // Pratyantardashas inside this antardasha
      const i0 = VIMSHOTTARI_DASHA_CYCLE.findIndex((c) => c.lord === ad.lord);
      let t = ad.startDate.getTime();
      for (let i = 0; i < 9; i++) {
        const it = VIMSHOTTARI_DASHA_CYCLE[(i0 + i) % 9];
        const ms = ((ad.durationYears * it.years) / 120) * YEAR;
        const s = new Date(t), e = new Date(t + ms);
        t += ms;
        if (e < from || s > to) continue;
        const score = adScore + involve(it.lord) + (involve(md.lord) ? 1 : 0);
        if (involve(it.lord) >= 2 || (involve(it.lord) >= 1 && score >= 2)) {
          out.push({
            start: s < from ? from : s,
            end: e,
            strength: score >= 4 ? 'strong' : 'good',
            why: `${cap1(pname(it.lord))}, which ${role(it.lord)}, is in charge for these weeks${adScore ? `, within the ${ad.lord} period, which also ${role(ad.lord)}` : ''}. A short, focused window — schedule the important step here.`,
          });
        }
      }
    }
  }
  // Jupiter transiting any of these houses (counted from the Lagna)
  const ascIdx = chart.ascendant.sign.index;
  let segStart: Date | null = null;
  for (let d = 0; d <= months * 30.44; d += 5) {
    const day = new Date(from.getTime() + d * 86_400_000);
    const L = siderealLongitude('Jupiter', day);
    const h = ((Math.floor(L / 30) - ascIdx + 12) % 12) + 1;
    const inside = houses.includes(h);
    if (inside && !segStart) segStart = day;
    if ((!inside || d + 5 > months * 30.44) && segStart) {
      out.push({ start: segStart, end: day, strength: 'good', why: 'Jupiter, the planet of growth, moves through this area — doors open more easily. Say yes to opportunities and ask for support.' });
      segStart = null;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface TopicReport {
  id: string;
  title: string;
  verdict: string;
  standing: string;
  how: string[];
  actions: string[];
  avoid: string;
  windows: TimingWindow[];
  evidence: string;
}

interface TopicDef {
  id: string;
  title: string;
  houses: number[];
  karaka: PlanetName;
  karakaRole: string;
  actions: [string, string, string, string];
  weakFix: string;
  avoid: string;
}

export const TOPICS: Record<string, TopicDef> = {
  career: {
    id: 'career', title: 'Career & reputation', houses: [10, 6], karaka: 'Saturn', karakaRole: 'stamina for long-term work',
    actions: ['Pick one visible project this quarter that shows your best skill, and own it end to end', 'Book a career conversation with the person who decides your next step — bring three concrete results', 'Keep a running “wins” document; update it every Friday', 'Block two mornings a week for deep work on the thing that builds your reputation'],
    weakFix: 'Partner with someone whose strengths cover yours, and let results — not self-promotion — speak first',
    avoid: 'Taking on responsibility without the authority or support to deliver it',
  },
  money: {
    id: 'money', title: 'Money & savings', houses: [2, 11], karaka: 'Jupiter', karakaRole: 'judgement about growth and abundance',
    actions: ['Automate a fixed transfer to savings on payday — start with 10%', 'List every income source and price; raise the most underpriced one this quarter', 'Keep three to six months of expenses in an easy-access account before taking any investment risk', 'Review subscriptions and recurring costs every quarter'],
    weakFix: 'Use rules, not willpower — automatic saving and a 48-hour pause before any unplanned purchase over a set amount',
    avoid: 'Decisions made under time pressure or social pressure',
  },
  relationships: {
    id: 'relationships', title: 'Relationships & partnership', houses: [7], karaka: 'Venus', karakaRole: 'warmth and the capacity to enjoy closeness',
    actions: ['Schedule one unhurried, phone-free evening a week with your partner or closest person', 'Say expectations out loud — money, time, chores, plans — rather than assuming', 'Put business partnerships and big shared purchases in writing', 'When conflict comes up, settle first, then talk — never in the heat of it'],
    weakFix: 'Choose fewer, better people, and be explicit early about what you need',
    avoid: 'Keeping the peace by staying silent about things that matter to you',
  },
  health: {
    id: 'health', title: 'Energy & vitality', houses: [1, 6], karaka: 'Sun', karakaRole: 'core vitality and resilience',
    actions: ['Fix your wake-up time — the same time every day, weekends included', 'Get 10 minutes of daylight outdoors within an hour of waking', 'Move every day: 30 minutes, whatever form you enjoy', 'Set a hard stop for work and screens in the evening'],
    weakFix: 'Treat recovery as a scheduled appointment, not something you do when there is time left',
    avoid: 'Running on caffeine and willpower through tired phases',
  },
  home: {
    id: 'home', title: 'Home & family', houses: [4], karaka: 'Moon', karakaRole: 'emotional security',
    actions: ['Make one room or corner of your home genuinely calm and clutter-free', 'Have a regular family meal or call — same day, every week', 'Sort property, rent and household paperwork in one sitting', 'Keep work out of the bedroom'],
    weakFix: 'Build stability through routine rather than waiting for the perfect home',
    avoid: 'Letting work stress spill into home life',
  },
  children: {
    id: 'children', title: 'Children & creativity', houses: [5], karaka: 'Jupiter', karakaRole: 'patience and guidance',
    actions: ['Give a creative project a fixed weekly slot, however small', 'Spend 20 minutes of undivided attention with a child or mentee each day', 'Test new ideas small before you invest heavily', 'Learn something just for the joy of it'],
    weakFix: 'Keep creative bets small and frequent rather than big and rare',
    avoid: 'Pouring time or money into an untested idea all at once',
  },
  learning: {
    id: 'learning', title: 'Learning, travel & growth', houses: [9, 3], karaka: 'Jupiter', karakaRole: 'wisdom and good teachers',
    actions: ['Commit to one structured course or qualification this year', 'Find a mentor who is five to ten years ahead of you', 'Plan one meaningful trip that teaches you something', 'Write down the principles you want to work and live by'],
    weakFix: 'Learn in small, consistent doses with a clear end goal',
    avoid: 'Collecting courses and ideas without applying them',
  },
};

export function topicReport(chart: ComprehensiveKundliResult, topicId: keyof typeof TOPICS, from: Date = new Date()): TopicReport {
  const T = TOPICS[topicId];
  const main = T.houses[0];
  const a = areaSupport(chart, main);
  const bb = chart.bhavaBala?.find((b) => b.house === main);
  const lord = chart.houses[main - 1].sign.lord;
  const lp = chart.planets[lord];
  const lc = planetCondition(chart, lord);
  const sb = (chart.shadbala as Record<string, any>)[lord];
  const vim = chart.vimshopaka?.[lord];
  const cancelled = chart.extendedYogas?.some((y) => y.name === 'Neechabhanga Raja Yoga' && y.planets.includes(lord));
  const occupants = chart.houses[main - 1].planets as PlanetName[];
  const kc = planetCondition(chart, T.karaka);
  const strongArea = (bb ? bb.rank <= 4 : false) || a.points >= 30;
  const weakLord = ['Debilitated', 'Enemy'].includes(lp.dignity) && !cancelled;

  const savRank = allAreas(chart).sort((x, y) => y.points - x.points).findIndex((x) => x.house === main) + 1;
  const standing =
    (savRank <= 3
      ? `Compared with the other parts of your life, ${T.title.toLowerCase()} is one of your three best-supported areas — effort here goes further than elsewhere, so it deserves a real share of your time.`
      : savRank >= 10
        ? `Compared with the other parts of your life, ${T.title.toLowerCase()} gets less built-in support. It is not closed to you — it simply needs more structure, patience and good advice than your stronger areas.`
        : `Compared with the other parts of your life, ${T.title.toLowerCase()} sits in the middle — it gives back roughly what you put in.`) +
    (bb && bb.rank <= 4 && savRank > 4
      ? ' Its foundation is stronger than it first looks, so consistent effort can lift it well above average.'
      : bb && bb.rank > 6 && savRank <= 4
        ? ' The opportunities are plentiful, but they do not land by themselves — you have to act on them.'
        : '');

  const how: string[] = [];
  how.push(
    lp.house === main
      ? `It is run by ${lord}, which sits in this very area — so you are directly in charge here. It responds to your own effort more than to luck or other people.`
      : `It is run by ${lord === 'Rahu' || lord === 'Ketu' ? `the lunar node ${lord}` : lord}, which lives in the part of your life about ${AREA_PLAYBOOK[lp.house].shows}. So that is your lever: look after those things and your ${T.title.toLowerCase()} follows. ${cap1(AREA_PLAYBOOK[lp.house].act[0])}.`
  );
  how.push(
    `${lord} ${DIGNITY_EFFECT[lp.dignity] ?? DIGNITY_EFFECT.Neutral}${cancelled ? ' — but a classical cancellation applies, so this weakness tends to turn into a strength with time' : ''}.${
      ' ' + strengthPlain(chart, lord, false).text
    }${vim ? ` Looked at from every angle of your chart, it is ${{ excellent: 'consistently strong', good: 'mostly well placed', average: 'mixed', weak: 'often under pressure' }[vim.grade as string] ?? 'mixed'}.` : ''}`
  );
  if (occupants.length) {
    how.push(
      occupants
        .map((p) => `${p} sits right in this area, bringing ${PLANET_NATURE[p].brings} — it works best through ${PLANET_NATURE[p].works}.`)
        .join(' ')
    );
  }
  how.push(`${T.karaka}, the natural indicator of ${T.karakaRole}, is ${kc.phrase}.`);

  const actions = [...T.actions.slice(0, 3)];
  if (weakLord || !strongArea) actions.push(T.weakFix);
  else actions.push(T.actions[3]);

  const verdict = strongArea && !weakLord
    ? 'A strong area for you — invest here deliberately.'
    : strongArea && weakLord
      ? 'Well supported, but its guiding planet works against itself — structure and allies unlock it.'
      : !strongArea && !weakLord
        ? 'Moderate support — consistent effort beats big pushes here.'
        : 'Less naturally supported — small, steady steps and good advice make the difference.';

  const windows = areaWindows(chart, T.houses, from, 24).slice(0, 4);
  return {
    id: T.id,
    title: T.title,
    verdict,
    standing,
    how,
    actions,
    avoid: T.avoid,
    windows,
    evidence: `${explainArea(chart, main)}${bb ? ` Bhava Bala (a separate classical measure of house strength, BPHS) is ${fix(bb.totalRupas)} rupas, rank ${bb.rank} of 12.` : ''} ${cap1(lc.evidence)}${vim ? ` Vimshopaka (how dignified ${lord} is across the 16 divisional charts, out of 20): ${vim.shodashavarga.toFixed(1)} — ${vim.grade}.` : ''}${occupants.length ? ` Planets inside the house: ${occupants.join(', ')}.` : ''}`,
  };
}
