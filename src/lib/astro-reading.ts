/**
 * Life Rhythm — the personal reading.
 *
 * Four paragraphs in plain English, each synthesised from several calculations at once
 * (the way a consulting astrologer reads a chart), plus reflection questions.
 * Every paragraph carries `how`: the exact technical basis, shown in Pro view.
 *
 *  1. How you are built — Lagna, Lagna lord's house, Moon, strongest planet (Shadbala).
 *  2. Where effort pays and where it leaks — Sarvashtakavarga extremes, strongest yoga, weakest planet.
 *  3. The chapter you are in — Vimshottari mahadasha with ages, progress, antardasha blend, moves.
 *  4. The next 18 months — dasha + Jupiter windows per life area, slow transits, Varshaphal.
 */
import type { ComprehensiveKundliResult, PlanetName, DashaPeriod } from './astro-engine/types.ts';
import { calculateVarshaphal } from './astro-engine/annual/varshaphal.ts';
import * as I from './astro-insights.ts';
import { AREA_PLAYBOOK, LEAK, LIFE_AREA, MOON_RESET, RISING } from './astro-content.ts';
import { CHAPTERS, STRENGTHS } from './astro-copy.ts';
import { BASE_YOGA_PLAIN, COMES_THROUGH, LEVER, LINK_HOW, NAKSHATRA_PLAIN, PLANET_IN_HOUSE, UPHILL } from './astro-reading-copy.ts';
import { YOGA_PLAIN } from './astro-content.ts';

export interface ReadingPart {
  /** Which group the section belongs to on the page. */
  group: 'chart' | 'timing' | 'combinations';
  kicker: string;
  title: string;
  text: string;
  /** Concrete next steps that follow from this section. */
  actions: string[];
  how: string;
}

export interface Reading {
  parts: ReadingPart[];
  questions: string[];
}

const SEVEN: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const YEAR = 365.2425 * 86_400_000;

/** What it means for your life when the ruler of your rising sign sits in each house. */
const LAGNA_LORD_IN: Record<number, string> = {
  1: 'you are self-directed: your life moves when you move, so personal initiative matters more than waiting for the right moment or the right people.',
  2: 'your confidence is tied to what you build and earn and to your own voice. Financial security is not a side issue for you, it is part of feeling like yourself.',
  3: 'you grow through your own effort, skills and communication. The more you put your work out into the world, the more your life opens up.',
  4: 'your centre of gravity is home, family and inner security. A stable base is not a luxury for you but the precondition for everything else.',
  5: 'you are driven by creativity, ideas and what you bring into the world, children included. You do best when your work leaves room to create.',
  6: 'you rise by solving problems and handling difficulties others avoid. That is a real strength, as long as you guard your health while doing it.',
  7: 'your life runs through other people. Partners, clients and collaborators bring your biggest turning points, so choosing them well is one of your most important skills.',
  8: 'your life moves through deep change, research and shared resources. You are built for transformation and do well in work that deals with depth, crisis or other people’s money.',
  9: 'you are guided by meaning, learning and good teachers. You do best when your work serves a bigger purpose, and luck tends to follow principled choices.',
  10: 'you are built for responsibility and visible work. Career is not just a job for you but a core part of who you are.',
  11: 'you are oriented towards goals, networks and gains. Your life opens through the right communities, so they deserve real investment.',
  12: 'you are drawn to the inner life, distant places and work behind the scenes. Solitude and time away restore you, but spending and over-giving need watching.',
};

const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
/** What each planet stands for in everyday terms — used so Simple view never needs planet names. */
const PLANET_PLAIN: Record<string, string> = {
  Sun: 'your confidence', Moon: 'your emotional side', Mars: 'your drive', Mercury: 'your thinking',
  Jupiter: 'your judgement', Venus: 'your capacity for love and beauty', Saturn: 'your discipline', Rahu: 'your ambition', Ketu: 'your detachment',
};
/** Safety net: replace any planet name left in Simple text with what it stands for. */
const plainify = (t: string) =>
  t
    .replace(/\s*\((?:(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)(?:,\s*| and )?)+\)/g, '')
    .replace(/\b(?:the )?(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/gi, (m, p: string) => PLANET_PLAIN[p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()] ?? m)
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const stripDot = (t: string) => t.replace(/[.\s]+$/, '');
const area = (h: number) => LIFE_AREA[h].name.toLowerCase();
const levelWord = (l: string) => ({ strong: 'strong', good: 'good', average: 'moderate', low: 'something to build up' } as Record<string, string>)[l] ?? 'moderate';
const monthYear = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const dayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const range = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear()
    ? `${a.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} to ${dayMonth(b)}`
    : `${dayMonth(a)} to ${dayMonth(b)}`;
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function nextAntardasha(chart: ComprehensiveKundliResult, md: DashaPeriod, ad: DashaPeriod): DashaPeriod | undefined {
  const ads = md.antardashas ?? [];
  const n = ads[ads.findIndex((x) => x.startDate.getTime() === ad.startDate.getTime()) + 1];
  if (n) return n;
  const mds = chart.dasha.mahadashas;
  return mds[mds.findIndex((m) => m.startDate.getTime() === md.startDate.getTime()) + 1]?.antardashas?.[0];
}

type Tier = 'strong' | 'ok' | 'weak' | 'none';
type Dig = 'good' | 'neutral' | 'friction' | 'fallen' | 'fallenFixed';

/** One sentence on how well a planet delivers, phrased for a given subject ("It", "Your drive here"). */
const QUALITY: Record<Tier, Record<Dig, string>> = {
  strong: {
    good: '{S} is one of the most dependable things in your chart.',
    neutral: '{S} works reliably.',
    friction: '{S} works reliably, though rarely smoothly.',
    fallenFixed: '{S} starts out awkward and gets clearly better with age and practice.',
    fallen: '{S} has power, but results come late and through effort.',
  },
  ok: {
    good: '{S} is an asset, but only if you keep putting time into it.',
    neutral: '{S} holds up in normal times and wobbles under stress.',
    friction: '{S} works, but with friction and little to spare.',
    fallenFixed: '{S} starts out awkward and improves with practice — early setbacks are not the final word.',
    fallen: '{S} pays off late, and only through steady effort.',
  },
  weak: {
    good: '{S} has real potential that switches on only when you work at it.',
    neutral: '{S} is inconsistent: strong in some years, barely there in others.',
    friction: '{S} is inconsistent and meets resistance, so don’t build plans that rely on it alone.',
    fallenFixed: '{S} starts weak — first attempts often fail — and turns into a strength with age and practice. Don’t give up on it early.',
    fallen: '{S} is a weak spot: results come late and only through deliberate effort.',
  },
  none: {
    good: '{S} is a real asset.',
    neutral: '',
    friction: '',
    fallenFixed: '{S} improves with age and practice.',
    fallen: '{S} needs patience.',
  },
};

const STOP = new Set('your with that this them they from into have more than when what will about and the for are you before every give keep make take'.split(' '));
const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
/** True when two actions say essentially the same thing. */
const sameAction = (a: string, b: string) => {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return a === b;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) >= 0.6;
};
const firstSentence = (t: string) => { const i = t.indexOf('. '); return i < 0 ? t : t.slice(0, i + 1); };
const restSentences = (t: string) => { const i = t.indexOf('. '); return i < 0 ? '' : t.slice(i + 2); };
const sentence = (t: string) => cap(stripDot(t)) + '.';

export function buildReading(chart: ComprehensiveKundliResult, now: Date = new Date(), place?: { latitude: number; longitude: number }): Reading {
  const P = chart.planets;
  const birth = chart.birthDetails.date;
  const age = (d: Date) => Math.floor((d.getTime() - birth.getTime()) / YEAR);
  const sb = chart.shadbala as Record<string, any>;
  const byStrength = [...SEVEN].sort((a, b) => sb[a].rank - sb[b].rank);
  const low = byStrength[byStrength.length - 1];
  const ascSign = chart.ascendant.sign.name as keyof typeof RISING;
  const moonSign = P.Moon.sign.name as keyof typeof MOON_RESET;

  const areas = I.allAreas(chart).sort((a, b) => b.points - a.points);
  const [b1, b2] = areas;
  const worst = areas[areas.length - 1];
  const rankOf = (h: number) => areas.findIndex((a) => a.house === h) + 1;
  /** Concrete support statement: where the area ranks among the twelve. */
  const support = (h: number, label: string) => {
    const r = rankOf(h);
    return `${cap(label)} ranks ${I.ORD(r)} of 12 life areas for built-in support${r <= 3 ? ' — one of your strongest' : r >= 10 ? ' — one of your weakest, so it needs more structure than the rest' : ''}.`;
  };

  /* ── Strength of a planet, said once per planet ── */
  const cancelled = (p: PlanetName) => (chart.extendedYogas ?? []).some((y) => y.name === 'Neechabhanga Raja Yoga' && y.planets[0] === p);
  const tierOf = (p: PlanetName): Tier => {
    const s = sb[p] as { strengthRatio: number } | undefined;
    return !s ? 'none' : s.strengthRatio >= 1.3 ? 'strong' : s.strengthRatio >= 1 ? 'ok' : 'weak';
  };
  const digOf = (p: PlanetName): Dig => {
    const d = P[p].dignity;
    return ['Exalted', 'OwnSign', 'Moolatrikona'].includes(d) ? 'good' : d === 'Debilitated' ? (cancelled(p) ? 'fallenFixed' : 'fallen') : d === 'Enemy' ? 'friction' : 'neutral';
  };
  const isStrong = (p: PlanetName) => tierOf(p) === 'strong' || digOf(p) === 'good';
  const qualified = new Set<PlanetName>();
  const qual = (p: PlanetName, subject: string) => {
    if (qualified.has(p)) return '';
    qualified.add(p);
    return QUALITY[tierOf(p)][digOf(p)].replace('{S}', subject);
  };

  /* ── How an area reaches you, through the house its ruler sits in ── */
  const lordLinks = new Map<PlanetName, string>();
  let lastLink = '';
  const link = (h: number, label: string) => {
    const lord = chart.houses[h - 1].sign.lord as PlanetName;
    const y = P[lord].house;
    const dist = ((y - h + 12) % 12) + 1;
    const prev = lordLinks.get(lord);
    let text: string;
    if (prev && prev === lastLink) {
      text = `${cap(label)} comes from the same place, so the two rise and fall together.`;
    } else if (prev) {
      text = y === h ? `You are directly in charge of ${label}: it responds to your own effort more than to luck or other people.` : `${cap(label)} runs through ${LINK_HOW[y]}. The same planet runs ${prev}, so the two tend to rise and fall together.`;
    } else {
      lordLinks.set(lord, label);
      const q = qual(lord, 'It');
      if (y === h) text = `You are directly in charge of ${label}: it responds to your own effort more than to luck or other people. ${q}`;
      else if (UPHILL[dist]) {
        const strongLord = isStrong(lord);
        text = `${cap(label)} runs through ${LINK_HOW[y]}. ${UPHILL[dist]} ${strongLord ? 'The planet behind it is strong, though, so it pays off once you are past the first obstacles.' : q}`;
        if (strongLord) qualified.add(lord);
      } else text = `${cap(label)} runs through ${LINK_HOW[y]}. ${q}`;
    }
    lastLink = label;
    return { lord, y, text: text.trim(), lever: LEVER[y] };
  };

  /* ── A planet sitting in an area: what it does (text) and how to use it (advice) ── */
  const mentioned = new Set<PlanetName>();
  const occupantsOf = (h: number, skip: PlanetName[] = []) => (Object.keys(P) as PlanetName[]).filter((p) => P[p].house === h && !skip.includes(p));
  const occupant = (p: PlanetName) => {
    mentioned.add(p);
    const full = PLANET_IN_HOUSE[p][P[p].house];
    return { text: `${firstSentence(full)} ${qual(p, `${cap(PLANET_PLAIN[p])} here`)}`.trim(), advice: restSentences(full) };
  };
  /** When an area has strong planets in it but little built-in support, say so instead of contradicting ourselves. */
  const mismatch = (h: number, occ: PlanetName[]) =>
    rankOf(h) >= 10 && occ.some(isStrong)
      ? 'So the talent is there but the foundation is thin: good things happen here, and they only last if you put structure around them.'
      : rankOf(h) <= 3 && occ.length && occ.every((p) => tierOf(p) === 'weak')
        ? ' The ground is good even though the planets in it are not strong, so steady effort here still pays.'
        : '';
  const areaSection = (o: { kicker: string; title: string; house: number; label: string; lead?: string; tail?: string; extraActions?: string[]; how: string }) => {
    const l = link(o.house, o.label);
    const occ = occupantsOf(o.house, ['Moon']).filter((p) => !mentioned.has(p));
    const placed = occ.map(occupant);
    return {
      group: 'chart' as const, kicker: o.kicker, title: o.title,
      text: [o.lead, l.text, support(o.house, o.label), ...placed.map((x) => x.text), mismatch(o.house, occ).trim(), o.tail].filter(Boolean).join(' '),
      actions: [...placed.map((x) => x.advice).filter(Boolean), sentence(l.lever), ...AREA_PLAYBOOK[o.house].act.slice(0, 2).map(sentence), ...(o.extraActions ?? [])],
      how: o.how,
      lord: l.lord,
    };
  };

  const parts: ReadingPart[] = [];

  /* ── Overview: where effort pays and where it leaks ── */
  parts.push({
    group: 'chart', kicker: 'Overview', title: 'Where your effort pays — and where it leaks',
    text:
      `Built-in support is highest for ${area(b1.house)} and ${area(b2.house)} — 1st and 2nd of the 12 life areas — so effort there goes furthest. Give both a fixed slot every week. ` +
      `Support is lowest for ${area(worst.house)}. Typically that shows up as ${lc(stripDot(LEAK[worst.house].risk))}. A rule works better here than willpower. ` +
      `The trait that needs the most practice is ${lc(STRENGTHS[low]?.title ?? 'balance')}: ${lc(STRENGTHS[low]?.effort ?? '')}`,
    actions: [sentence(AREA_PLAYBOOK[b1.house].act[0]), sentence(AREA_PLAYBOOK[b2.house].act[0]), sentence(LEAK[worst.house].fix)],
    how: `${I.explainArea(chart, b1.house)} ${I.explainArea(chart, b2.house)} ${I.explainArea(chart, worst.house)} Weakest planet by Shadbala: ${I.explainPlanet(chart, low)}`,
  });

  /* ── You ── */
  const l1lord = chart.ascendant.sign.lord as PlanetName;
  const l1 = { lord: l1lord, y: P[l1lord].house, lever: LEVER[P[l1lord].house] };
  lordLinks.set(l1.lord, 'your life direction');
  const lagNak = chart.ascendant.nakshatra?.name;
  const occ1 = occupantsOf(1).filter((p) => p !== 'Moon');
  const placed1 = occ1.map(occupant);
  parts.push({
    group: 'chart', kicker: 'You', title: 'How you come across and what drives you',
    text:
      `First impression: ${lc(RISING[ascSign])}${lagNak && NAKSHATRA_PLAIN[lagNak] ? ` Beyond that, ${NAKSHATRA_PLAIN[lagNak]}` : ''} ` +
      `What drives your life: ${LAGNA_LORD_IN[l1.y]} ${qual(l1.lord, 'This drive')} ` +
      placed1.map((x) => x.text).join(' '),
    actions: [...placed1.map((x) => x.advice).filter(Boolean), sentence(l1.lever), sentence(AREA_PLAYBOOK[l1.y].act[0])],
    how: `Lagna ${ascSign} ${chart.ascendant.formattedDegree}${lagNak ? ` in ${lagNak}` : ''}. ${I.explainPlanet(chart, l1.lord)} ${I.explainArea(chart, 1)}`,
  });

  /* ── Mind ── */
  const moonNak = P.Moon.nakshatra.name;
  mentioned.add('Moon');
  parts.push({
    group: 'chart', kicker: 'Your mind', title: 'How you feel, cope and recover',
    text:
      `Emotionally, ${lc(MOON_RESET[moonSign].style)} ${NAKSHATRA_PLAIN[moonNak] ? sentence(NAKSHATRA_PLAIN[moonNak]) + ' ' : ''}` +
      `${firstSentence(PLANET_IN_HOUSE.Moon[P.Moon.house])} ${qual('Moon', 'Your emotional resilience')}`,
    actions: [`When you are stressed: ${lc(stripDot(MOON_RESET[moonSign].reset))}.`, sentence(restSentences(PLANET_IN_HOUSE.Moon[P.Moon.house]) || AREA_PLAYBOOK[P.Moon.house].act[0])],
    how: `Moon in ${moonSign}, ${moonNak} nakshatra. ${I.explainPlanet(chart, 'Moon')}`,
  });

  /* ── Life areas ── */
  const sun = levelWord(I.strengthPlain(chart, 'Sun').level);
  parts.push(areaSection({
    kicker: 'Work in the world', title: 'Career and reputation', house: 10, label: 'your career',
    tail: `Authority — how readily people accept your lead — is ${sun}; staying power on long projects is ${levelWord(I.strengthPlain(chart, 'Saturn').level)}.`,
    how: `${I.explainArea(chart, 10)} Its ruler: ${I.explainPlanet(chart, chart.houses[9].sign.lord as PlanetName)} Career karakas: Sun (authority) and Saturn (endurance).`,
  }));
  const venusIn7 = P.Venus.house === 7;
  parts.push(areaSection({
    kicker: 'Partnership', title: 'Partners, clients and agreements', house: 7, label: 'partnership',
    tail: venusIn7 ? '' : `Your capacity for warmth and give-and-take in close relationships is ${levelWord(I.strengthPlain(chart, 'Venus').level)}.`,
    how: `${I.explainArea(chart, 7)} Its ruler: ${I.explainPlanet(chart, chart.houses[6].sign.lord as PlanetName)}${venusIn7 ? '' : ` Venus: ${I.explainPlanet(chart, 'Venus')}`}`,
  }));

  // Money: savings (2nd) and gains (11th) together.
  const l2 = link(2, 'what you keep');
  const l11 = link(11, 'what comes in');
  const occMoney = [...occupantsOf(2, ['Moon']), ...occupantsOf(11, ['Moon'])].filter((p) => !mentioned.has(p));
  const placedMoney = occMoney.map((p) => ({ p, ...occupant(p) }));
  const r2 = rankOf(2), r11 = rankOf(11);
  parts.push({
    group: 'chart', kicker: 'Money', title: 'What comes in and what you keep',
    text: [
      l2.text, l11.text,
      `Savings rank ${I.ORD(r2)} and gains ${I.ORD(r11)} of 12 life areas for built-in support${r2 >= 10 && r11 >= 10 ? ', so money needs firm systems rather than good intentions' : r2 <= 3 && r11 <= 3 ? ', one of the better-backed parts of your chart' : ''}.`,
      ...placedMoney.map((x) => `In ${area(P[x.p].house)}: ${lc(x.text)}`),
    ].join(' '),
    actions: [...placedMoney.map((x) => x.advice).filter(Boolean), sentence(l2.lever), l2.y === l11.y ? '' : sentence(l11.lever), sentence(AREA_PLAYBOOK[2].act[1])].filter(Boolean),
    how: `${I.explainArea(chart, 2)} ${I.explainArea(chart, 11)} 2nd lord: ${I.explainPlanet(chart, l2.lord)} 11th lord: ${I.explainPlanet(chart, l11.lord)}`,
  });

  parts.push(areaSection({
    kicker: 'Body and energy', title: 'Health, routines and stamina', house: 6, label: 'your daily health',
    lead: `Basic vitality is ${sun}; resilience — how fast you bounce back — is ${levelWord(I.strengthPlain(chart, l1.lord).level)}.`,
    extraActions: ['This is about pacing and habits, not medical advice — for health concerns, see a qualified professional.'],
    how: `${I.explainArea(chart, 6)} 6th lord: ${I.explainPlanet(chart, chart.houses[5].sign.lord as PlanetName)} Sun: ${I.explainPlanet(chart, 'Sun')}`,
  }));
  parts.push(areaSection({
    kicker: 'Home and roots', title: 'Home, family and feeling settled', house: 4, label: 'home life',
    how: `${I.explainArea(chart, 4)} 4th lord: ${I.explainPlanet(chart, chart.houses[3].sign.lord as PlanetName)}`,
  }));

  /* ── Everything not covered yet, grouped by area ── */
  const rest = (Object.keys(P) as PlanetName[]).filter((p) => !mentioned.has(p));
  if (rest.length) {
    const byHouse = new Map<number, PlanetName[]>();
    for (const p of rest) byHouse.set(P[p].house, [...(byHouse.get(P[p].house) ?? []), p]);
    const groups = [...byHouse.entries()].map(([h, ps]) => ({ h, placed: ps.map(occupant) }));
    parts.push({
      group: 'chart', kicker: 'Other themes', title: 'The rest of your chart',
      text: groups.map((g) => `${cap(area(g.h))}: ${g.placed.map((x, i) => (i === 0 ? lc(x.text) : x.text)).join(' ')}`).join(' '),
      actions: groups.flatMap((g) => g.placed.map((x) => x.advice)).filter(Boolean),
      how: rest.map((p) => I.explainPlanet(chart, p)).join(' '),
    });
  }

  /* ── The chapter you are in ── */
  const { mahadasha: md, antardasha: ad } = chart.dasha.currentDasha;
  const mdB = I.phaseBrief(chart, md);
  const adB = I.phaseBrief(chart, ad);
  const pct = Math.round(((now.getTime() - md.startDate.getTime()) / (md.endDate.getTime() - md.startDate.getTime())) * 100);
  const blend = I.blendInsight(chart, md.lord, ad.lord);
  const mdRules = mdB.areas.filter((a) => a.role === 'rules').map((a) => area(a.house));
  const next = nextAntardasha(chart, md, ad);
  const stage =
    pct < 25 ? 'near the start of it: what you begin in these years sets the tone for the rest of the chapter.'
    : pct < 50 ? 'in the first half: this stretch rewards following through on what you started more than new starts.'
    : pct < 75 ? `past the middle: results from the first half should be showing now — build on what works and drop what hasn’t by ${monthYear(md.endDate)}.`
    : `in the final stretch: finish and consolidate, and avoid big commitments that would run past ${monthYear(md.endDate)}.`;
  const backing = { strong: 'strong backing, so it tends to deliver', good: 'good backing', average: 'moderate backing', low: 'limited backing, so expect to work for what it brings' }[I.strengthPlain(chart, md.lord).level];
  parts.push({
    group: 'timing', kicker: 'Where you are now', title: `A chapter of ${CHAPTERS[md.lord].short.toLowerCase()}`,
    text:
      `Since ${monthYear(md.startDate)}${md.startDate > birth ? ` (age ${age(md.startDate)})` : ' (your birth)'} you have been in a chapter of ${CHAPTERS[md.lord].short.toLowerCase()} that runs until ${monthYear(md.endDate)} (age ${age(md.endDate)}). ` +
      `It plays out mainly in ${area(mdB.areas[0].house)}${mdRules.length ? `, and also involves ${joinAnd(mdRules)}` : ''}, so these years keep coming back to ${AREA_PLAYBOOK[mdB.areas[0].house].shows}. ` +
      `Your chart gives it ${backing}. You are ${stage} ` +
      `Until ${dayMonth(ad.endDate)} the current sub-phase puts ${joinAnd(adB.areas.slice(0, 2).map((a) => area(a.house)))} in front. ${blend.text}` +
      (next ? ` After that the focus moves to ${joinAnd(I.phaseBrief(chart, next).areas.slice(0, 2).map((a) => area(a.house)))}.` : ''),
    actions: [sentence(adB.actions[0]), adB.actions[1] ? sentence(adB.actions[1]) : '', `Before ${dayMonth(ad.endDate)}: ${lc(stripDot(adB.close[0]))}.`].filter(Boolean),
    how: `Vimshottari ${md.lord} mahadasha ${md.startDate.toISOString().slice(0, 10)} to ${md.endDate.toISOString().slice(0, 10)} (${pct}% elapsed); ${ad.lord} antardasha to ${ad.endDate.toISOString().slice(0, 10)}${next ? `, then ${next.lord}` : ''}. ${mdB.evidence} ${blend.evidence}`,
  });

  /* ── The next 18 months ── */
  const horizon = new Date(now.getTime() + 18 * 30.44 * 86_400_000);
  const pick = (topic: 'career' | 'money' | 'relationships') => {
    const w = I.topicReport(chart, topic, now).windows.filter((x) => x.start < horizon);
    return w.find((x) => x.strength === 'strong') ?? w[0];
  };
  const TOPIC = {
    career: { label: 'work and reputation', move: 'apply, pitch or ask for the bigger role' },
    money: { label: 'money', move: 'negotiate pay or prices and set up the savings plan' },
    relationships: { label: 'relationships and agreements', move: 'sign, commit to or renegotiate the agreements that matter' },
  } as const;
  const when = (a: Date, b: Date) => (a <= now ? `now until ${dayMonth(b)}` : range(a, b));
  const windows = (['career', 'money', 'relationships'] as const).map((t) => ({ t, w: pick(t) })).filter((x) => x.w);
  const tr = I.slowTransits(chart, now);
  const sat = tr.find((x) => x.planet === 'Saturn')!;
  const jup = tr.find((x) => x.planet === 'Jupiter')!;
  let yearLine = '';
  let howYear = '';
  try {
    const v = calculateVarshaphal(chart, now, place);
    const end = new Date(v.pravesha.getTime() + 365.2564 * 86_400_000);
    yearLine = ` Your current birthday year, to ${dayMonth(end)}, centres on ${area(v.muntha.house)}: ${AREA_PLAYBOOK[v.muntha.house].shows}.`;
    howYear = ` Varshaphal from ${v.pravesha.toISOString().slice(0, 10)}: Muntha in ${v.muntha.sign} (${I.ORD(v.muntha.house)} house of the year chart), year lord ${v.yearLord}.`;
  } catch {
    /* year chart optional */
  }
  parts.push({
    group: 'timing', kicker: 'Coming up', title: 'The next 18 months',
    text:
      (windows.length
        ? `Your clearest openings: ${joinAnd(windows.map(({ t, w }) => `${TOPIC[t].label}, ${when(w!.start, w!.end)}${w!.strength === 'strong' ? ' (strong)' : ''}`))}. Put the big steps for each inside its window. `
        : 'No sharply marked openings for work, money or relationships in the next 18 months, so steady weekly effort beats waiting for a big moment. ') +
      `Growth is ${jup.favourable ? 'supported' : 'slow but possible'} in ${area(jup.houseFromAsc)}${jup.until ? ` until about ${monthYear(jup.until)}` : ''}${jup.favourable ? ' — say yes to opportunities there' : ' — it comes through effort, not luck'}. ` +
      `${cap(area(sat.houseFromAsc))} ${sat.favourable ? 'rewards patient, disciplined work' : 'will feel like hard work'}${sat.until ? ` until about ${monthYear(sat.until)}` : ''}${sat.favourable ? '.' : ' — build systems around it rather than forcing results.'}` +
      yearLine,
    actions: windows.length
      ? windows.map(({ t, w }) => `${cap(when(w!.start, w!.end))}: ${TOPIC[t].move}.`)
      : ['Keep an even weekly rhythm rather than waiting for a big moment.'],
    how: `Windows: Vimshottari antardashas and pratyantardashas whose lords occupy or rule the 10th/2nd/7th houses, plus Jupiter transits through them (next 18 months). ${jup.evidence} ${sat.evidence}${howYear}`,
  });

  const questions = [
    `What would change if you treated ${area(b1.house)} as your main lever for the next year — and what would you stop doing to make room for it?`,
    `What does ${area(worst.house)} cost you each month in time, money or energy, and what is the smallest rule that would stop that?`,
    `What needs to be finished before ${monthYear(ad.endDate)} so the next phase can start clean?`,
  ];

  /* ── Combinations (yogas): one card per idea, strongest first ── */
  type Combo = ReadingPart & { rank: number };
  const combos = new Map<string, Combo>();
  const addCombo = (c: Combo) => {
    const prev = combos.get(c.title);
    if (!prev || c.rank < prev.rank) combos.set(c.title, c);
  };
  for (const y of chart.yogas ?? []) {
    const base = String(y.name).replace(/\s*\(.*\)$/, '');
    if (base.startsWith('Neechabhanga')) continue; // covered by the extended library with its planets
    const plain = BASE_YOGA_PLAIN[base] ?? (YOGA_PLAIN[base] ? { ...YOGA_PLAIN[base], care: false } : null);
    if (!plain) continue;
    addCombo({ group: 'combinations', kicker: plain.care ? 'Combination that asks for care' : 'Supportive combination', title: plain.title, text: plain.use, actions: [], how: `${y.name}: ${y.description}`, rank: plain.care ? 3 : 0 });
  }
  for (const y of chart.extendedYogas ?? []) {
    const ps = y.planets.filter((p) => P[p]);
    const where = [...new Set(ps.map((p) => area(P[p].house)))];
    const mild = y.strength === 'weak' && y.nature === 'supportive';
    addCombo({
      group: 'combinations',
      kicker: y.nature !== 'supportive' ? 'Combination that asks for care' : mild ? 'Supportive combination · mild' : 'Supportive combination',
      title: y.plainTitle,
      text: `${y.plainUse}${where.length ? ` In your chart it involves ${joinAnd(where)}.` : ''}`,
      actions: [],
      how: `${y.name} (${y.strength}): ${y.description}${ps.length ? ` Formed by ${joinAnd([...new Set(ps.map((p) => `${I.pname(p)} in the ${I.ORD(P[p].house)} house`))])}.` : ''}`,
      rank: y.nature !== 'supportive' ? 3 : mild ? 2 : y.strength === 'strong' ? 0 : 1,
    });
  }
  if (chart.doshas?.kaalSarp?.isKaalSarp) {
    addCombo({
      group: 'combinations', kicker: 'Combination that asks for care', title: 'Life on one track',
      text: `Your chart is unusually focused: everything pulls between ${area(P.Rahu.house)} on one side and ${area(P.Ketu.house)} on the other. Life can feel channelled along one strong track, with little sideways room. Use the focus, and deliberately build a second interest or support system so one theme doesn’t carry you along.`,
      actions: [],
      how: `Kaal Sarp (modern classification, not in BPHS): all seven planets hemmed between Rahu (${I.ORD(P.Rahu.house)} house) and Ketu (${I.ORD(P.Ketu.house)} house).`,
      rank: 3,
    });
  }
  parts.push(...[...combos.values()].sort((a, b) => a.rank - b.rank).map(({ rank: _r, ...c }) => c));

  /* ── Final pass: plain words, and no action repeated anywhere in the reading ── */
  const doneActions: string[] = [];
  for (const p of parts) {
    delete (p as any).lord;
    p.text = plainify(p.text.replace(/\s+/g, ' ').trim());
    p.title = plainify(p.title);
    p.actions = p.actions
      .map((a) => plainify(sentence(a)))
      .filter((a) => {
        if (doneActions.some((d) => sameAction(a, d))) return false;
        doneActions.push(a);
        return true;
      })
      .slice(0, 3);
  }
  return { parts, questions };
}
