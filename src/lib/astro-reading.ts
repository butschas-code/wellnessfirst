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
import { AREA_PLAYBOOK, LEAK, LIFE_AREA, MOON_RESET, RISING, stageOf } from './astro-content.ts';
import { STRENGTHS } from './astro-copy.ts';
import { BASE_YOGA_PLAIN, COMES_THROUGH, LEVER, NAKSHATRA_PLAIN, PLANET_IN_HOUSE } from './astro-reading-copy.ts';
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
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const stripDot = (t: string) => t.replace(/[.\s]+$/, '');
const area = (h: number) => LIFE_AREA[h].name.toLowerCase();
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

export function buildReading(chart: ComprehensiveKundliResult, now: Date = new Date(), place?: { latitude: number; longitude: number }): Reading {
  const P = chart.planets;
  const birth = chart.birthDetails.date;
  const age = (d: Date) => Math.floor((d.getTime() - birth.getTime()) / YEAR);
  const sb = chart.shadbala as Record<string, any>;
  const byStrength = [...SEVEN].sort((a, b) => sb[a].rank - sb[b].rank);
  const top = byStrength[0];
  const low = byStrength[byStrength.length - 1];

  /* ── 1. How you are built ── */
  const ascSign = chart.ascendant.sign.name as keyof typeof RISING;
  const ll = chart.ascendant.sign.lord as PlanetName;
  const llHouse = P[ll].house;
  const moonSign = P.Moon.sign.name as keyof typeof MOON_RESET;
  const p1 =
    `With ${ascSign} rising: ${lc(RISING[ascSign])} That is the side of you people meet first. ` +
    `The planet that steers your whole chart, ${I.pname(ll)}, sits in your area of ${area(llHouse)}${['Debilitated', 'Enemy'].includes(P[ll].dignity) ? `, ${I.planetCondition(chart, ll).dignityPlain}` : ['Exalted', 'OwnSign', 'Moolatrikona'].includes(P[ll].dignity) ? `, ${I.planetCondition(chart, ll).dignityPlain}` : ''}. That means ${LAGNA_LORD_IN[llHouse]} ${['Debilitated', 'Enemy'].includes(P[ll].dignity) ? 'Because that planet is under pressure, this is also where you will have to work hardest: go slower than you want to, and get advice before big moves there. ' : ['Exalted', 'OwnSign', 'Moolatrikona'].includes(P[ll].dignity) ? 'Because that planet is in great shape, this is an area you can lean on with confidence. ' : ''}` +
    `Underneath, your emotional engine is ${/^[AEIOU]/.test(moonSign) ? 'an' : 'a'} ${moonSign} Moon: ${lc(MOON_RESET[moonSign].style)} When things get heavy, what reliably helps is ${lc(stripDot(MOON_RESET[moonSign].reset))}. ` +
    (top === ll
      ? `${cap(I.pname(top))} is also the most powerful planet in your chart, so you are built to steer your own course — results come fastest when you trust your own judgement.`
      : `The most powerful planet in your chart is ${I.pname(top)}, which brings ${I.PLANET_NATURE[top].brings} into your area of ${area(P[top].house)}. That is where your biggest results tend to come from, and it works best through ${I.PLANET_NATURE[top].works}.`);
  const how1 = `Lagna ${ascSign} ${chart.ascendant.formattedDegree}; its lord ${ll}: ${I.explainPlanet(chart, ll)} Moon: ${I.explainPlanet(chart, 'Moon')} Strongest planet by Shadbala: ${top}. ${top === ll ? '' : I.explainPlanet(chart, top)}`;

  /* ── 2. Where effort pays and where it leaks ── */
  const areas = I.allAreas(chart).sort((a, b) => b.points - a.points);
  const [b1, b2] = areas;
  const worst = areas[areas.length - 1];
  const yogas = (chart.extendedYogas ?? []).filter((y) => y.nature === 'supportive');
  const yoga = yogas.find((y) => y.strength === 'strong') ?? yogas.find((y) => y.strength === 'moderate');
  const p2 =
    `Your chart puts the most built-in support behind ${area(b1.house)} and ${area(b2.house)}. Effort there goes further than anywhere else, so give both a fixed share of every week — for example: ${lc(stripDot(AREA_PLAYBOOK[b1.house].act[0]))}, and ${lc(stripDot(AREA_PLAYBOOK[b2.house].act[0]))}. ` +
    (yoga ? `You also carry a classical combination (${yoga.name}) that gives you ${lc(stripDot(yoga.plainTitle))}. ${yoga.plainUse} ` : '') +
    `The opposite end is ${area(worst.house)}, which gets the least support in your chart. In everyday life that tends to look like this: ${lc(stripDot(LEAK[worst.house].risk))}. The fix is structure, not willpower: ${lc(LEAK[worst.house].fix)} ` +
    `Finally, ${I.pname(low)} is the least powerful planet in your chart, so the quality it stands for (${lc(STRENGTHS[low]?.title ?? low)}) needs deliberate practice: ${lc(STRENGTHS[low]?.effort ?? '')}`;
  const how2 = `${I.explainArea(chart, b1.house)} ${I.explainArea(chart, b2.house)} ${I.explainArea(chart, worst.house)}${yoga ? ` Strongest supportive yoga: ${yoga.name} (${yoga.strength}; planets ${yoga.planets.join(', ')}).` : ''} Weakest planet by Shadbala: ${I.explainPlanet(chart, low)}`;


  /* ══ Life areas, read one by one (the way an astrologer walks through a chart) ══ */
  const mentioned = new Set<PlanetName>();
  const sbOf = (p: PlanetName) => sb[p] as { strengthRatio: number; rank: number } | undefined;
  const cancelled = (p: PlanetName) => (chart.extendedYogas ?? []).some((y) => y.name === 'Neechabhanga Raja Yoga' && y.planets[0] === p);
  /** Plain words for how strongly a planet can deliver what it promises. */
  const qual = (p: PlanetName): string => {
    const s = sbOf(p);
    const d = P[p].dignity;
    const power = !s
      ? ''
      : s.strengthRatio >= 1.3
        ? 'This planet is strong in your chart, so this comes through clearly and reliably.'
        : s.strengthRatio >= 1
          ? 'This planet has enough strength to deliver, without much in reserve.'
          : 'This planet is under-powered, so these themes show up unevenly — strongly at times, faintly at others.';
    const place =
      d === 'Exalted'
        ? ' It is in its best sign — a genuine asset.'
        : d === 'OwnSign' || d === 'Moolatrikona'
          ? ' It is in its own territory, which makes it dependable.'
          : d === 'Debilitated'
            ? cancelled(p)
              ? ' It is in its weakest sign, but a classical cancellation applies: this tends to start hard and become a strength with time and effort.'
              : ' It is in its weakest sign, so results come later and through effort.'
            : d === 'Enemy'
              ? ' It sits in an uncomfortable sign, so expect some friction.'
              : '';
    return (power + place).trim();
  };
  const occupantsOf = (h: number, skip: PlanetName[] = []) =>
    (Object.keys(P) as PlanetName[]).filter((p) => P[p].house === h && !skip.includes(p));
  const nm = (p: PlanetName) => cap(p === 'Rahu' ? 'Rahu (the north node)' : p === 'Ketu' ? 'Ketu (the south node)' : I.pname(p));
  const placementText = (p: PlanetName, named = false) => {
    mentioned.add(p);
    return `${nm(p)} sits ${named ? `in your area of ${area(P[p].house)}` : 'here'}: ${lc(PLANET_IN_HOUSE[p][P[p].house])} ${qual(p)}`.trim();
  };
  /** How an area reaches you, through the house its ruling planet sits in. */
  const link = (h: number, label: string) => {
    const lord = chart.houses[h - 1].sign.lord as PlanetName;
    const y = P[lord].house;
    const dist = ((y - h + 12) % 12) + 1;
    const text =
      y === h
        ? `${cap(label)} is ruled by ${I.pname(lord)}, which sits right in this area — you are directly in charge here, and it responds to your own effort more than to luck or other people.`
        : `${cap(label)} is ruled by ${I.pname(lord)}, which sits in your area of ${area(y)}. So ${label} is closely tied to ${COMES_THROUGH[y]}.` +
          ([6, 8, 12].includes(dist) ? ' That link sits in a difficult position relative to this area, so it tends to cost you something before it gives — expect detours, and don’t mistake them for dead ends.' : '');
    return { lord, y, text: y === h ? text : `${text} ${qual(lord)}`.trim(), lever: `To move ${label} forward, ${LEVER[y]}.` };
  };
  const supportWords = (h: number) => {
    const rank = areas.findIndex((a) => a.house === h) + 1;
    return rank <= 3 ? 'one of the best-supported areas of your chart' : rank >= 10 ? 'one of the less-supported areas of your chart, so it needs more structure than others' : 'in the middle range of support in your chart';
  };
  const parts: ReadingPart[] = [];

  // You
  const l1 = link(1, 'your life direction');
  const lagNak = chart.ascendant.nakshatra?.name;
  parts.push({
    group: 'chart', kicker: 'You', title: `${ascSign} rising`,
    text:
      `${RISING[ascSign]} That is the side people meet first.${lagNak && NAKSHATRA_PLAIN[lagNak] ? ` Your rising degree falls in ${lagNak}: ${NAKSHATRA_PLAIN[lagNak]}` : ''} ` +
      `${l1.text} In practice: ${LAGNA_LORD_IN[l1.y]} ` +
      occupantsOf(1).map((p) => placementText(p)).join(' '),
    actions: [cap(l1.lever.replace('To move your life direction forward, ', '')), cap(stripDot(AREA_PLAYBOOK[l1.y].act[0])) + '.'],
    how: `Lagna ${ascSign} ${chart.ascendant.formattedDegree}${lagNak ? ` in ${lagNak}` : ''}. ${I.explainPlanet(chart, l1.lord)} ${I.explainArea(chart, 1)}`,
  });

  // Mind
  const moonNak = P.Moon.nakshatra.name;
  mentioned.add('Moon');
  parts.push({
    group: 'chart', kicker: 'Your mind', title: `${moonSign} Moon in ${moonNak}`,
    text:
      `The Moon shows how you feel, what settles you and how you handle stress. Yours is in ${moonSign}: ${lc(MOON_RESET[moonSign].style)} ` +
      `Your birth star is ${moonNak}: ${NAKSHATRA_PLAIN[moonNak] ?? ''} ` +
      `It sits in your area of ${area(P.Moon.house)}: ${lc(PLANET_IN_HOUSE.Moon[P.Moon.house])} ${qual('Moon')}`,
    actions: [`When you are stressed: ${lc(stripDot(MOON_RESET[moonSign].reset))}.`, cap(stripDot(AREA_PLAYBOOK[P.Moon.house].act[0])) + '.'],
    how: I.explainPlanet(chart, 'Moon'),
  });

  // Work
  const l10 = link(10, 'your career');
  const occ10 = occupantsOf(10, ['Moon']);
  parts.push({
    group: 'chart', kicker: 'Work in the world', title: 'Career and reputation',
    text:
      `${l10.text} Your career area is ${supportWords(10)}. ` +
      (occ10.length ? occ10.map((p) => placementText(p)).join(' ') + ' ' : '') +
      `Two planets naturally stand for career: the Sun for authority and Saturn for staying power. ${I.strengthPlain(chart, 'Sun', false).text} ${I.strengthPlain(chart, 'Saturn', false).text}`,
    actions: [l10.lever, cap(stripDot(AREA_PLAYBOOK[10].act[0])) + '.', cap(stripDot(AREA_PLAYBOOK[10].act[1])) + '.'],
    how: `${I.explainArea(chart, 10)} Its ruler: ${I.explainPlanet(chart, l10.lord)}`,
  });

  // Partnership
  const l7 = link(7, 'partnership');
  const occ7 = occupantsOf(7, ['Moon']);
  parts.push({
    group: 'chart', kicker: 'Partnership', title: 'Partners, clients and agreements',
    text:
      `${l7.text} This area is ${supportWords(7)}. ` +
      (occ7.length ? occ7.map((p) => placementText(p)).join(' ') + ' ' : '') +
      (occ7.includes('Venus') ? '' : `Venus, the natural indicator of love and partnership, sits in your area of ${area(P.Venus.house)}. ${qual('Venus')}`),
    actions: [l7.lever, cap(stripDot(AREA_PLAYBOOK[7].act[0])) + '.', cap(stripDot(AREA_PLAYBOOK[7].act[1])) + '.'],
    how: `${I.explainArea(chart, 7)} Its ruler: ${I.explainPlanet(chart, l7.lord)}${occ7.includes('Venus') ? '' : ` Venus: ${I.explainPlanet(chart, 'Venus')}`}`,
  });

  // Money
  const l2 = link(2, 'your money');
  const l11 = link(11, 'your income from work and contacts');
  const occMoney = [...occupantsOf(2, ['Moon']), ...occupantsOf(11, ['Moon'])];
  parts.push({
    group: 'chart', kicker: 'Money', title: 'What comes in and what you keep',
    text:
      `${l2.text} ${l11.text} Your savings area is ${supportWords(2)}, and your area of gains is ${supportWords(11)}. ` +
      (occMoney.length ? occMoney.map((p) => placementText(p, true)).join(' ') : ''),
    actions: [...new Set([l2.y === l11.y ? `To build income and savings, ${LEVER[l2.y]}.` : l2.lever, l2.y === l11.y ? '' : l11.lever, cap(stripDot(AREA_PLAYBOOK[2].act[1])) + '.'])].filter(Boolean),
    how: `${I.explainArea(chart, 2)} ${I.explainArea(chart, 11)} 2nd lord: ${I.explainPlanet(chart, l2.lord)} 11th lord: ${I.explainPlanet(chart, l11.lord)}`,
  });

  // Body & energy
  const l6 = link(6, 'your daily health');
  const occ6 = occupantsOf(6, ['Moon']);
  parts.push({
    group: 'chart', kicker: 'Body and energy', title: 'Health, routines and stamina',
    text:
      `Your basic vitality depends on the ruler of your chart and on the Sun. ${l1.lord === 'Sun' ? '' : `${I.strengthPlain(chart, l1.lord).text} `}${I.strengthPlain(chart, 'Sun').text} ` +
      `${l6.text} ` +
      (occ6.length ? occ6.map((p) => placementText(p)).join(' ') : ''),
    actions: [cap(stripDot(AREA_PLAYBOOK[6].act[0])) + '.', cap(stripDot(AREA_PLAYBOOK[6].act[1])) + '.', 'This is about pacing and habits, not medical advice — for health concerns, see a qualified professional.'],
    how: `${I.explainArea(chart, 6)} 6th lord: ${I.explainPlanet(chart, l6.lord)} Sun: ${I.explainPlanet(chart, 'Sun')}`,
  });

  // Home
  const l4 = link(4, 'home life');
  const occ4 = occupantsOf(4, ['Moon']);
  parts.push({
    group: 'chart', kicker: 'Home and roots', title: 'Home, family and feeling settled',
    text: `${l4.text} This area is ${supportWords(4)}. ` + (occ4.length ? occ4.map((p) => placementText(p)).join(' ') : ''),
    actions: [cap(stripDot(AREA_PLAYBOOK[4].act[0])) + '.', cap(stripDot(AREA_PLAYBOOK[4].act[1])) + '.'],
    how: `${I.explainArea(chart, 4)} 4th lord: ${I.explainPlanet(chart, l4.lord)}`,
  });

  // Everything not covered yet
  const rest = (Object.keys(P) as PlanetName[]).filter((p) => !mentioned.has(p));
  if (rest.length) {
    parts.push({
      group: 'chart', kicker: 'Other themes', title: 'The rest of your chart',
      text: rest.map((p) => placementText(p, true)).join(' '),
      actions: rest.slice(0, 3).map((p) => {
        const use = PLANET_IN_HOUSE[p][P[p].house].split('. ').slice(1).join('. ');
        return cap(stripDot(use || AREA_PLAYBOOK[P[p].house].act[0])) + '.';
      }),
      how: rest.map((p) => I.explainPlanet(chart, p)).join(' '),
    });
  }

  /* ── 3. The chapter you are in ── */
  const { mahadasha: md, antardasha: ad } = chart.dasha.currentDasha;
  const mdB = I.phaseBrief(chart, md);
  const adB = I.phaseBrief(chart, ad);
  const pct = Math.round(((now.getTime() - md.startDate.getTime()) / (md.endDate.getTime() - md.startDate.getTime())) * 100);
  const stage = stageOf(pct);
  const blend = I.blendInsight(chart, md.lord, ad.lord);
  const mdRules = mdB.areas.filter((a) => a.role === 'rules').map((a) => area(a.house));
  const next = nextAntardasha(chart, md, ad);
  const where = pct < 25 ? 'near the start' : pct < 50 ? 'in the first half' : pct < 75 ? 'past the middle' : 'in the final stretch';
  const p3 =
    `Since ${monthYear(md.startDate)}${md.startDate > birth ? ` (age ${age(md.startDate)})` : ' (your birth)'} you have been in a ${md.lord} chapter that runs until ${monthYear(md.endDate)} (age ${age(md.endDate)}). ` +
    `${cap(I.pname(md.lord))} sits in your area of ${area(mdB.areas[0].house)}${mdRules.length ? ` and also rules ${joinAnd(mdRules)}` : ''}, so these years keep returning to ${AREA_PLAYBOOK[mdB.areas[0].house].shows}. ` +
    `${I.strengthPlain(chart, md.lord).text} You are ${where} of this chapter: ${lc(stage.text)} ` +
    `Right now, until ${dayMonth(ad.endDate)}, the ${ad.lord} sub-period puts ${joinAnd(adB.areas.slice(0, 2).map((a) => area(a.house)))} in front. ${blend.text} ` +
    `The two most useful moves for this stretch: ${lc(stripDot(adB.actions[0]))}, and ${lc(stripDot(adB.actions[1] ?? adB.actions[0]))}. Before ${dayMonth(ad.endDate)}, ${lc(stripDot(adB.close[0]))}${next ? ` — from then on the focus moves to ${joinAnd(I.phaseBrief(chart, next).areas.slice(0, 2).map((a) => area(a.house)))}` : ''}.`;
  const how3 = `Vimshottari ${md.lord} mahadasha ${md.startDate.toISOString().slice(0, 10)} to ${md.endDate.toISOString().slice(0, 10)} (${pct}% elapsed); ${ad.lord} antardasha to ${ad.endDate.toISOString().slice(0, 10)}${next ? `, then ${next.lord}` : ''}. ${mdB.evidence} ${blend.evidence}`;

  /* ── 4. The next 18 months ── */
  const horizon = new Date(now.getTime() + 18 * 30.44 * 86_400_000);
  const pick = (topic: 'career' | 'money' | 'relationships') => {
    const w = I.topicReport(chart, topic, now).windows.filter((x) => x.start < horizon);
    return w.find((x) => x.strength === 'strong') ?? w[0];
  };
  const labels = { career: 'work and reputation', money: 'money', relationships: 'relationships and agreements' } as const;
  const lines: string[] = [];
  for (const t of ['career', 'money', 'relationships'] as const) {
    const w = pick(t);
    if (w) lines.push(`for ${labels[t]}, ${range(w.start, w.end)} (${stripDot(w.why.split('.')[0]).replace(/^The /, 'the ')})`);
  }
  const tr = I.slowTransits(chart, now);
  const sat = tr.find((x) => x.planet === 'Saturn')!;
  const jup = tr.find((x) => x.planet === 'Jupiter')!;
  let yearLine = '';
  let howYear = '';
  try {
    const v = calculateVarshaphal(chart, now, place);
    const end = new Date(v.pravesha.getTime() + 365.2564 * 86_400_000);
    yearLine = ` Your current birthday year, which runs to ${dayMonth(end)}, centres on ${area(v.muntha.house)}: ${AREA_PLAYBOOK[v.muntha.house].shows}.`;
    howYear = ` Varshaphal from ${v.pravesha.toISOString().slice(0, 10)}: Muntha in ${v.muntha.sign} (${I.ORD(v.muntha.house)} house of the year chart), year lord ${v.yearLord}.`;
  } catch {
    /* year chart optional */
  }
  const p4 =
    (lines.length
      ? `Your clearest openings in the next 18 months: ${joinAnd(lines)}. Put the important steps for each into those dates rather than spreading them evenly. `
      : 'The next 18 months bring no sharply marked openings for work, money or relationships, so steady, even effort works better than waiting for a big moment. ') +
    `In the background, Jupiter ${jup.favourable ? 'supports' : 'quietly helps'} your area of ${area(jup.houseFromAsc)}${jup.until ? ` until about ${monthYear(jup.until)}` : ''} — ${jup.favourable ? 'a good time to say yes to growth there' : 'growth there comes through steady effort rather than luck'}. ` +
    `Saturn ${sat.favourable ? 'rewards patient work' : 'asks for patience and structure'} in your area of ${area(sat.houseFromAsc)}${sat.until ? ` until about ${monthYear(sat.until)}` : ''} — ${sat.favourable ? 'slow, disciplined effort there builds something lasting' : `expect that part of life to feel like hard work; don’t force it, build systems around it`}.` +
    yearLine;
  const how4 = `Windows: Vimshottari antardashas and pratyantardashas whose lords occupy or rule the 10th/2nd/7th houses, plus Jupiter transits through them (next 18 months). ${jup.evidence} ${sat.evidence}${howYear}`;

  const questions = [
    `What would change if you treated the area of ${area(b1.house)} as your main lever for the next year — and what would you stop doing to make room for it?`,
    `What does the area of ${area(worst.house)} cost you each month in time, money or energy, and what is the smallest rule that would stop that?`,
    `What needs to be finished before ${monthYear(ad.endDate)} so the next phase can start clean?`,
  ];

  parts.unshift({ group: 'chart', kicker: 'Overview', title: 'Where your effort pays — and where it leaks', text: p2, actions: [cap(stripDot(AREA_PLAYBOOK[b1.house].act[0])) + '.', cap(stripDot(LEAK[worst.house].fix)) + '.'], how: how2 });
  parts.push({ group: 'timing', kicker: 'Where you are now', title: `The ${md.lord} chapter`, text: p3, actions: [cap(stripDot(adB.actions[0])) + '.', cap(stripDot(adB.actions[1] ?? adB.actions[0])) + '.', `Before ${dayMonth(ad.endDate)}: ${lc(stripDot(adB.close[0]))}.`], how: how3 });
  parts.push({ group: 'timing', kicker: 'Coming up', title: 'The next 18 months', text: p4, actions: lines.length ? ['Put your most important steps for work, money and relationships into the dates above.', 'Mark the dates in your calendar now, with one concrete goal for each.'] : ['Keep an even weekly rhythm rather than waiting for a big moment.'], how: how4 });

  // Combinations (yogas), each tied to the placements that form it.
  const seen = new Set<string>();
  for (const y of chart.yogas ?? []) {
    const base = String(y.name).replace(/\s*\(.*\)$/, '');
    if (base.startsWith('Neechabhanga')) continue; // covered by the extended library with its planets
    const plain = BASE_YOGA_PLAIN[base] ?? (YOGA_PLAIN[base] ? { ...YOGA_PLAIN[base], care: false } : null);
    if (!plain || seen.has(base)) continue;
    seen.add(base);
    parts.push({
      group: 'combinations', kicker: plain.care ? 'Combination that asks for care' : 'Supportive combination', title: plain.title,
      text: plain.use, actions: [], how: `${y.name}: ${y.description}`,
    });
  }
  for (const y of chart.extendedYogas ?? []) {
    const where = y.planets.filter((p) => P[p]).map((p) => `${I.pname(p)} in your area of ${area(P[p].house)}`);
    const mild = y.strength === 'weak' && y.nature === 'supportive' ? ' The planets forming it are not very strong, so expect a milder version that needs effort to activate.' : '';
    parts.push({
      group: 'combinations', kicker: y.nature === 'supportive' ? 'Supportive combination' : 'Combination that asks for care', title: y.plainTitle,
      text: `${where.length ? `In your chart this is formed by ${joinAnd([...new Set(where)])}. ` : ''}${y.plainUse}${mild}`,
      actions: [],
      how: `${y.name} (${y.strength}): ${y.description}`,
    });
  }
  if (chart.doshas?.kaalSarp?.isKaalSarp) {
    parts.push({
      group: 'combinations', kicker: 'Combination that asks for care', title: 'Life on one track',
      text: `All seven classical planets sit on one side of the Rahu–Ketu axis (Rahu in your area of ${area(P.Rahu.house)}, Ketu in ${area(P.Ketu.house)}). Life can feel channelled along one strong track, with little sideways room. Use the focus it gives you, and deliberately build a second interest or support system so you aren’t carried along by one theme only.`,
      actions: [],
      how: 'Kaal Sarp (modern classification, not in BPHS): all seven planets hemmed between Rahu and Ketu.',
    });
  }

  return { parts, questions };
}
