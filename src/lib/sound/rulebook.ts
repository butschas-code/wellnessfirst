/**
 * Wellness Waves — the rulebook: chart → catalog categories (authored, versioned).
 *
 * STATUS: DRAFT v1, built from §5.3 of docs/ONDA_WHITE_LABEL_PLAN.md.
 * Sascha signs off v1 before launch. Rules marked `draft: 'added'` are not in
 * the §5.3 table and were added so every chart gets a program; drop or change
 * them at sign-off.
 *
 * Built like engine/domain/programs/adaptationPolicy.ts: explicit, reviewable,
 * pure. Every rule has an id, the time layer it reads, the catalog categories
 * it points at, a weight function (0–1) over plain chart facts, and its own
 * plain-English "why" (Simple view: no planet names) and technical basis (Pro).
 *
 * Copy rules (Wellness First tone + the frequency claims rules): describe
 * timing and pacing, never fate; never promise an effect on health, sleep,
 * mood or the brain. tests/sound/personalPrograms.test.ts lints all copy here.
 *
 * Changing any rule, weight or the slot table below changes programs: bump
 * RULEBOOK_VERSION (programs record the version they were made with).
 */

export const RULEBOOK_VERSION = '1.0.0';
export const RULEBOOK_STATUS: 'draft' | 'signed-off' = 'draft';

/** The ten source categories of the frequency catalog, exactly as written there. */
export const CATALOG_CATEGORIES = [
  'Relaxation & Stress Balance',
  'Sleep & Night Recovery',
  'Energy & Vitality',
  'Mental Focus & Clarity',
  'Emotional Balance',
  'Physical Ease & Recovery',
  'Movement & Activity Support',
  'Digestive & Metabolic Balance',
  'Mindfulness & Inner Awareness',
  'Daily Balance & Preventive Care',
] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type Level = 'strong' | 'good' | 'average' | 'low';
export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';
export type DayTempo = 'push' | 'steady' | 'soften' | 'rest';
export type Slot = 'morning' | 'midday' | 'evening';
export type Layer = 'natal' | 'chapter' | 'day';
export type Use = 'support' | 'amplify';

/** The chart reduced to plain facts. Produced by signals.ts; nothing here touches the engine. */
export interface ChartFacts {
  planets: Record<Planet, { level: Level; house: number }>;
  /** Life areas (houses 1–12): Sarvashtakavarga points and level. */
  areas: Record<number, { points: number; level: Level }>;
  timeUnknown: boolean;
  chapter: {
    /** Mahadasha and antardasha lords. */
    lord: Planet;
    subLord: Planet;
    /** Overall backing of the current chapter (chapterInsight). */
    support: Level;
    /** Last day of the current sub-period (antardasha), YYYY-MM-DD. */
    until: string;
    sadeSati: 'none' | 'rising' | 'peak' | 'setting';
    /** Transiting Saturn counted from the birth Moon sign (1–12). */
    saturnFromMoon: number;
  };
  day: {
    /** dayInsight score, 0–100. */
    score: number;
    taraGood: boolean;
    chandraGood: boolean;
    moonNakshatra: string;
  };
}

export interface Rule {
  id: string;
  layer: Layer;
  use: Use;
  categories: CatalogCategory[];
  /** 0 = does not apply, 1 = applies fully. Pure. */
  weight: (f: ChartFacts) => number;
  /** Simple view: one sentence, no planet names, no promises. */
  simple: string;
  /** Pro view: the exact condition. */
  pro: string;
  draft?: 'added';
}

/* ─────────────────────── helpers (pure) ─────────────────────── */

/** How much a weak level asks for support. */
const lowW = (l: Level) => (l === 'low' ? 1 : l === 'average' ? 0.35 : 0);
/** How much a strong level can be built on. */
const highW = (l: Level) => (l === 'strong' ? 1 : l === 'good' ? 0.5 : 0);
/** House-based facts are approximate without a birth time. */
const houseTrust = (f: ChartFacts) => (f.timeUnknown ? 0.5 : 1);
const max = (...xs: number[]) => Math.max(0, ...xs);

/** What each planet's nature points at when nothing in the table fires (draft, see below). */
export const PLANET_CATEGORY: Record<Planet, CatalogCategory> = {
  Sun: 'Energy & Vitality',
  Moon: 'Emotional Balance',
  Mars: 'Movement & Activity Support',
  Mercury: 'Mental Focus & Clarity',
  Jupiter: 'Mindfulness & Inner Awareness',
  Venus: 'Relaxation & Stress Balance',
  Saturn: 'Daily Balance & Preventive Care',
  Rahu: 'Mental Focus & Clarity',
  Ketu: 'Mindfulness & Inner Awareness',
};

const SEVEN: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const RANK: Record<Level, number> = { strong: 3, good: 2, average: 1, low: 0 };

/** The day's tempo from today's personal day quality (Tarabala, Chandrabala, transit tone). */
export function dayTempo(day: ChartFacts['day']): DayTempo {
  if (day.score >= 64) return 'push';
  if (day.score >= 42) return 'steady';
  return day.score >= 28 || day.taraGood ? 'soften' : 'rest';
}

const SOFTER: Record<DayTempo, DayTempo> = { push: 'steady', steady: 'soften', soften: 'rest', rest: 'rest' };

/** Tempo per slot: the morning and midday follow the day; the evening is always one step softer. */
export function slotTempo(day: DayTempo, slot: Slot): DayTempo {
  return slot === 'evening' ? SOFTER[day] : day;
}

/** Which player space (and so which frequency band) a Today slot uses, by tempo (§5.3, last row). */
export const SLOT_SPACE: Record<Slot, Record<DayTempo, 'focus' | 'energy' | 'balance' | 'relax' | 'meditate' | 'sleep'>> = {
  morning: { push: 'energy', steady: 'focus', soften: 'balance', rest: 'relax' },
  midday: { push: 'focus', steady: 'focus', soften: 'relax', rest: 'relax' },
  evening: { push: 'relax', steady: 'relax', soften: 'meditate', rest: 'sleep' },
};

/** Plain lines for the day, used at the start of a Today description. */
export const TEMPO_LINE: Record<DayTempo, string> = {
  push: 'Today has good momentum.',
  steady: 'Today is an even, steady day.',
  soften: 'Today asks for a gentler pace.',
  rest: 'Today asks for a slower start and plenty of pauses.',
};

/* ─────────────────────── the rules ─────────────────────── */

export const RULES: Rule[] = [
  // ── Natal: challenges → support ────────────────────────────────────────
  {
    id: 'natal.moon-or-4th-low',
    layer: 'natal',
    use: 'support',
    categories: ['Emotional Balance'],
    weight: (f) => max(lowW(f.planets.Moon.level), lowW(f.areas[4].level) * houseTrust(f)),
    simple: 'Your chart suggests feelings can take a while to settle, so this makes room for a calm, even middle.',
    pro: 'Moon condition low/average (Shadbala, dignity) or 4th house Sarvashtakavarga low/average.',
  },
  {
    id: 'natal.12th-low',
    layer: 'natal',
    use: 'support',
    categories: ['Sleep & Night Recovery'],
    weight: (f) => lowW(f.areas[12].level) * houseTrust(f),
    simple: 'Rest and switching off get less built-in backing in your chart, so this leans towards slow, night-time sounds.',
    pro: '12th house Sarvashtakavarga low/average.',
  },
  {
    id: 'natal.mercury-low',
    layer: 'natal',
    use: 'support',
    categories: ['Mental Focus & Clarity'],
    weight: (f) => lowW(f.planets.Mercury.level),
    simple: 'Concentration is something your chart asks you to build on purpose, so this brings in a steadier pulse for focused work.',
    pro: 'Mercury condition low/average.',
  },
  {
    id: 'natal.vitality-low',
    layer: 'natal',
    use: 'support',
    categories: ['Energy & Vitality'],
    weight: (f) => max(lowW(f.planets.Mars.level), lowW(f.planets.Sun.level), lowW(f.areas[1].level) * houseTrust(f)),
    simple: 'Your energy is worth pacing, so this adds a gentle lift you can come back to through the day.',
    pro: 'Mars or Sun condition low/average, or 1st house Sarvashtakavarga low/average.',
  },
  {
    id: 'natal.6th-low',
    layer: 'natal',
    use: 'support',
    categories: ['Physical Ease & Recovery'],
    weight: (f) => lowW(f.areas[6].level) * houseTrust(f),
    simple: 'Daily routines take more effort to settle in your chart, so this keeps an easy, unhurried rhythm.',
    pro: '6th house Sarvashtakavarga low/average.',
  },
  // ── Natal: strengths → amplify ─────────────────────────────────────────
  {
    id: 'natal.mars-strong',
    layer: 'natal',
    use: 'amplify',
    categories: ['Movement & Activity Support'],
    weight: (f) => highW(f.planets.Mars.level),
    simple: 'Drive and getting things moving come naturally to you, so this builds on that with a brighter, active pulse.',
    pro: 'Mars condition strong/good.',
  },
  {
    id: 'natal.mercury-strong',
    layer: 'natal',
    use: 'amplify',
    categories: ['Mental Focus & Clarity'],
    weight: (f) => highW(f.planets.Mercury.level),
    simple: 'A quick, clear mind is one of your strengths, so this gives it a crisp, even pulse to work with.',
    pro: 'Mercury condition strong/good.',
  },
  {
    id: 'natal.inner-strong',
    layer: 'natal',
    use: 'amplify',
    categories: ['Mindfulness & Inner Awareness'],
    weight: (f) =>
      max(highW(f.planets.Jupiter.level), f.planets.Ketu.house === 12 ? houseTrust(f) * 0.8 : 0, highW(f.areas[12].level) * 0.6 * houseTrust(f)),
    simple: 'Reflection and a quiet inner life are natural for you, so this leaves space to turn inward.',
    pro: 'Jupiter condition strong/good, or Ketu in the 12th house, or 12th house Sarvashtakavarga strong/good.',
  },
  // ── Natal fallbacks (draft additions) ──────────────────────────────────
  {
    id: 'natal.strongest-planet',
    layer: 'natal',
    use: 'amplify',
    categories: [],
    weight: () => 0.4,
    simple: 'This builds on the part of you that your chart shows as most at ease.',
    pro: 'Fires when no other strength rule gives a category of its own. Strongest of the seven visible planets by condition (ties in order Sun…Saturn) whose category is not a challenge; category from its nature (PLANET_CATEGORY).',
    draft: 'added',
  },
  {
    id: 'natal.quietest-planet',
    layer: 'natal',
    use: 'support',
    categories: [],
    weight: () => 0.4,
    simple: 'This gives a little extra room to the part of you that your chart shows as quieter.',
    pro: 'Fires when no other challenge rule gives a category of its own. Weakest of the seven visible planets by condition whose category is not a strength; category from its nature (PLANET_CATEGORY).',
    draft: 'added',
  },
  // ── Chapter ────────────────────────────────────────────────────────────
  {
    id: 'chapter.saturn-pressure',
    layer: 'chapter',
    use: 'support',
    categories: ['Relaxation & Stress Balance', 'Daily Balance & Preventive Care'],
    weight: (f) =>
      max(
        f.chapter.sadeSati === 'peak' ? 1 : f.chapter.sadeSati === 'none' ? 0 : 0.7,
        f.chapter.saturnFromMoon === 8 ? 0.8 : f.chapter.saturnFromMoon === 4 ? 0.6 : 0
      ),
    simple: 'This stretch of your life asks for patience and steady structure, so this keeps the pace calm and even.',
    pro: 'Sade Sati active (Saturn 12th/1st/2nd from the Moon; peak = 1st), or Saturn transiting 8th (ashtama) or 4th (ardhashtama) from the Moon.',
  },
  {
    id: 'chapter.low-backing',
    layer: 'chapter',
    use: 'support',
    categories: ['Daily Balance & Preventive Care'],
    weight: (f) => lowW(f.chapter.support) * 0.7,
    simple: 'Your current chapter rewards a steady routine over big pushes, so this favours an even, balanced rhythm.',
    pro: 'chapterInsight support (mahadasha lord condition × the house it occupies) low/average.',
    draft: 'added',
  },
  {
    id: 'chapter.strong-backing',
    layer: 'chapter',
    use: 'amplify',
    categories: [],
    weight: (f) => highW(f.chapter.support) * 0.7,
    simple: 'Your current chapter has good backing, so this leans into what it brings.',
    pro: 'chapterInsight support strong/good; category from the mahadasha lord’s nature (PLANET_CATEGORY).',
    draft: 'added',
  },
  // ── Day ────────────────────────────────────────────────────────────────
  {
    id: 'day.rest',
    layer: 'day',
    use: 'support',
    categories: ['Sleep & Night Recovery', 'Relaxation & Stress Balance'],
    weight: (f) => (dayTempo(f.day) === 'rest' ? 0.9 : 0),
    simple: 'Today is a day to go gently, so this keeps things slow and spacious.',
    pro: 'Day tempo "rest": dayInsight score < 28 and an unfavourable tara.',
  },
  {
    id: 'day.soften',
    layer: 'day',
    use: 'support',
    categories: ['Relaxation & Stress Balance'],
    weight: (f) => (dayTempo(f.day) === 'soften' ? 0.7 : 0),
    simple: 'Today asks for a softer pace, so this eases in before anything faster.',
    pro: 'Day tempo "soften": dayInsight score 28–41 (or lower with a favourable tara).',
  },
  {
    id: 'day.push',
    layer: 'day',
    use: 'amplify',
    categories: ['Energy & Vitality', 'Mental Focus & Clarity'],
    weight: (f) => (dayTempo(f.day) === 'push' ? 0.7 : 0),
    simple: 'Today has good momentum, so this adds a brighter pulse for getting things done.',
    pro: 'Day tempo "push": dayInsight score ≥ 64.',
  },
];

export const ruleById = (id: string) => RULES.find((r) => r.id === id);

/* ─────────────────────── applying the rules ─────────────────────── */

export interface Reason {
  ruleId: string;
  layer: Layer;
  use: Use;
  category: CatalogCategory;
  weight: number;
}

export type CategoryWeights = Record<CatalogCategory, number>;

export const zeroWeights = (): CategoryWeights =>
  Object.fromEntries(CATALOG_CATEGORIES.map((c) => [c, 0])) as CategoryWeights;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The strongest (or weakest) visible planet whose category is not already
 * claimed by the other use, so a category is never both strength and challenge.
 */
function extreme(f: ChartFacts, dir: 'strong' | 'weak', taken: CategoryWeights): Planet {
  const sorted = [...SEVEN].sort((a, b) => {
    const d = RANK[f.planets[b].level] - RANK[f.planets[a].level];
    return dir === 'strong' ? d : -d;
  });
  return sorted.find((p) => !(taken[PLANET_CATEGORY[p]] > 0)) ?? sorted[0];
}

/** Categories a rule points at for this chart (fallback rules resolve through PLANET_CATEGORY). */
function categoriesOf(rule: Rule, f: ChartFacts, support: CategoryWeights, amplify: CategoryWeights): CatalogCategory[] {
  if (rule.categories.length) return rule.categories;
  if (rule.id === 'natal.strongest-planet') return [PLANET_CATEGORY[extreme(f, 'strong', support)]];
  if (rule.id === 'natal.quietest-planet') return [PLANET_CATEGORY[extreme(f, 'weak', amplify)]];
  if (rule.id === 'chapter.strong-backing') return [PLANET_CATEGORY[f.chapter.lord]];
  return [];
}

/**
 * Fires every rule whose layer is in `layers`. Fallback rules only fire when
 * nothing else in their layer and use did. Weights per category are the max
 * over the rules pointing at it (not the sum), so one strong reason counts
 * as much as several weak ones.
 */
export function applyRules(f: ChartFacts, layers: Layer[] = ['natal', 'chapter', 'day']) {
  const support = zeroWeights();
  const amplify = zeroWeights();
  const reasons: Reason[] = [];
  const fire = (rule: Rule, w: number) => {
    if (!(w > 0)) return;
    for (const category of categoriesOf(rule, f, support, amplify)) {
      const target = rule.use === 'support' ? support : amplify;
      target[category] = round3(Math.max(target[category], w));
      reasons.push({ ruleId: rule.id, layer: rule.layer, use: rule.use, category, weight: round3(w) });
    }
  };
  const fallbacks = new Set(['natal.strongest-planet', 'natal.quietest-planet']);
  for (const rule of RULES) {
    if (!layers.includes(rule.layer) || fallbacks.has(rule.id)) continue;
    fire(rule, Math.max(0, Math.min(1, rule.weight(f))));
  }
  if (layers.includes('natal')) {
    for (const id of fallbacks) {
      const rule = ruleById(id)!;
      const own = rule.use === 'support' ? support : amplify;
      const other = rule.use === 'support' ? amplify : support;
      // Fires when no natal rule of this use fired, or every category it found is outweighed by the other use.
      const usable = reasons.some(
        (r) => r.layer === 'natal' && r.use === rule.use && (rule.use === 'support' ? own[r.category] >= other[r.category] : own[r.category] > other[r.category])
      );
      if (!usable) fire(rule, rule.weight(f));
    }
  }
  // Highest weight first; ties in rulebook order (stable sort).
  reasons.sort((a, b) => b.weight - a.weight);
  return { support, amplify, reasons };
}

/** Categories by weight, highest first; ties in catalog order. Zero weights left out. */
export function ranked(w: CategoryWeights): CatalogCategory[] {
  return CATALOG_CATEGORIES.filter((c) => w[c] > 0).sort((a, b) => w[b] - w[a]);
}
