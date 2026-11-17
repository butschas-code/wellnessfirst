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
import { LIFE_AREA } from './astro-content.ts';

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
    evidence: `${p} in ${pos.sign.name} ${pos.formattedDegree} · H${pos.house} · ${pos.dignity}${pos.isRetrograde ? ' · R' : ''}${
      rules.length ? ` · lord of H${rules.join(', H')}` : ''
    }${strengthEv}`,
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
    evidence: `${cond.evidence} · SAV H${stage.house} = ${stage.points}`,
  };
}

/** How the main chapter and the current phase blend (house distance between their lords). */
export function blendInsight(chart: ComprehensiveKundliResult, md: PlanetName, ad: PlanetName) {
  if (md === ad) return { tone: 'good' as Level, text: 'The current phase repeats the theme of the whole chapter, so its themes come through especially clearly.', evidence: `${md}/${ad}` };
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
  return { tone, text, evidence: `${ad} is ${dist}${['st', 'nd', 'rd'][dist - 1] ?? 'th'} from ${md} (H${b} from H${a})` };
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
    evidence: `Tarabala: ${tara.name} (${count} from ${chart.planets.Moon.nakshatra.name}) · Chandrabala: transit Moon ${chandraHouse}H from natal Moon (${chandraGood ? 'favourable' : 'unfavourable'}) · Moon in ${moon.sign.name}/${moon.nakshatra.name}, H${moon.house} (SAV ${moonArea.points}) · Gochara: ${transitTone}`,
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
      plain: `${p === 'Rahu' ? 'The lunar node' : p} currently ${verb} your area of ${area.name.toLowerCase()}. ${quality}`,
      evidence: `${p} transiting ${ZODIAC_SIGNS[signIdx].name} · H${h} from Lagna · H${hm} from Moon · SAV ${area.points}${until ? ` · ingress ${until.toISOString().slice(0, 10)}` : ''}`,
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
          ? `${copy[p]?.natural ?? ''} This shows up most in your area of ${area.name.toLowerCase()}. ${why(p)}`
          : `${copy[p]?.effort ?? ''} It plays out mostly in your area of ${area.name.toLowerCase()}.`,
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
      text: `Your career area is guided by ${lord === 'Rahu' || lord === 'Ketu' ? 'the lunar node' : lord}, which sits in your area of ${LIFE_AREA[cond.house].name.toLowerCase()}. That points to ${WORK_VIA_HOUSE[cond.house]}. ${lord} is ${cond.phrase} and sits ${cond.dignityPlain}.`,
      evidence: `10H ${h10.sign.name}, lord ${cond.evidence}${inH10.length ? ` · in 10H: ${inH10.join(', ')}` : ''}`,
    },
    career: {
      title: 'Career support',
      text: `Your career area is ${a10.phrase} (${a10.points} support points; 28 is average). ${a10.level === 'strong' || a10.level === 'good' ? 'Visible effort at work tends to be noticed and rewarded.' : 'Recognition tends to come through steady, consistent work rather than quick wins.'}`,
      evidence: `SAV 10H = ${a10.points}`,
    },
    savings: {
      title: 'Saving and keeping money',
      text: `Your money-and-savings area is ${a2.phrase} (${a2.points} points). ${a2.points >= 28 ? 'You tend to hold on to resources well — let savings build automatically.' : 'Money can slip away more easily — automatic transfers to savings on payday help a lot.'}`,
      evidence: `SAV 2H = ${a2.points} · 2L ${chart.houses[1].sign.lord} in H${chart.planets[chart.houses[1].sign.lord].house}`,
    },
    gains: {
      title: 'Gains through people',
      text: `Your area of friends and gains is ${a11.phrase} (${a11.points} points). ${a11.points >= 28 ? 'Opportunities tend to come through your network — stay connected.' : 'A few deep, trusted relationships will serve you better than a large network.'}`,
      evidence: `SAV 11H = ${a11.points} · 11L ${chart.houses[10].sign.lord} in H${chart.planets[chart.houses[10].sign.lord].house}`,
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
      text: `The planet that represents you, ${lagnaLord}, is ${lc.phrase} and sits ${lc.dignityPlain}. Your energy area is ${a1.phrase} (${a1.points} points). ${
        lc.level === 'strong' || lc.level === 'good' ? 'You tend to have good reserves — just don’t mistake that for unlimited.' : 'Your energy is precious — guard sleep and recovery like appointments.'
      }`,
      evidence: `Lagna lord ${lc.evidence} · SAV 1H = ${a1.points}`,
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
      text: `Your area of routines and health is ${a6.phrase} (${a6.points} points). ${
        a6.points >= 28 ? 'Good habits tend to stick once you start them.' : 'Habits take more effort to establish — start very small and keep it daily.'
      }`,
      evidence: `SAV 6H = ${a6.points} · 6L ${chart.houses[5].sign.lord} in H${chart.planets[chart.houses[5].sign.lord].house}`,
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
      text: `Your partnership area is ${a7.phrase} (${a7.points} points). It is guided by ${lord7}, which sits in your area of ${LIFE_AREA[c7.house].name.toLowerCase()} — so ${LIFE_AREA[c7.house].about.toLowerCase()} often play a part in how close relationships develop.`,
      evidence: `SAV 7H = ${a7.points} · 7L ${c7.evidence}`,
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
      text: `Your area of children and creativity is ${a5.phrase} (${a5.points} points). It is guided by ${lord5}, which sits in your area of ${LIFE_AREA[c5.house].name.toLowerCase()}.`,
      evidence: `SAV 5H = ${a5.points} · 5L ${c5.evidence}`,
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
