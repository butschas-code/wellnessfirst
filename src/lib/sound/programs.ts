/**
 * Wellness Waves — personal program sets (§5.4–5.6).
 *
 * signals → composer requests → compositions → template name and description.
 * Pure and deterministic: no clock, no database, no LLM. The API stores what
 * this returns; anonymous visitors get the same programs without storage.
 *
 * Names and descriptions are templates only (decided 2026-11-26). Simple view
 * never names planets; Pro view lists every catalog value and the rule ids.
 */

import type { Intent } from '../../sound/engine/types/index';
import { compose, homeCategories, band, contentHash, type Composition, type ComposeRequest, type PhaseRole } from '../../sound/engine/compose/index';
import { programById } from '../../sound/engine/domain/programs/catalog';
import type { BirthProfile } from './profile';
import type { SoundSignals } from './signals';
import {
  RULEBOOK_STATUS,
  RULEBOOK_VERSION,
  TEMPO_LINE,
  SLOT_SPACE,
  type CatalogCategory,
  type CategoryWeights,
  type DayTempo,
  type Reason,
  type Slot,
  ranked,
  ruleById,
} from './rulebook';

export type ProgramKind = 'today' | 'chapter' | 'strength' | 'challenge';
export type ProgramSet = 'today' | 'chapter' | 'strengths' | 'challenges';
export const PROGRAM_SETS: ProgramSet[] = ['today', 'chapter', 'strengths', 'challenges'];

export interface GeneratedProgram {
  kind: ProgramKind;
  slot: Slot | null;
  validFrom: string;
  validTo: string | null;
  name: string;
  description: string;
  descriptionPro: string;
  intent: Intent;
  recipeId: string;
  composition: Composition;
  reasons: Reason[];
  versions: Composition['versions'] & { signals: string };
  contentHash: string;
  /** Deterministic key of this generation request; UNIQUE per user in the database. */
  genKey: string;
  profileId: string;
  profileVersion: number;
}

/* ───────────────────────── authored copy ───────────────────────── */

/** Which player space a catalog category belongs to (its band and default soundscape). */
export const CATEGORY_SPACE: Record<CatalogCategory, Intent> = {
  'Relaxation & Stress Balance': 'relax',
  'Sleep & Night Recovery': 'sleep',
  'Energy & Vitality': 'energy',
  'Mental Focus & Clarity': 'focus',
  'Emotional Balance': 'balance',
  'Physical Ease & Recovery': 'recover',
  'Movement & Activity Support': 'energy',
  'Digestive & Metabolic Balance': 'balance',
  'Mindfulness & Inner Awareness': 'meditate',
  'Daily Balance & Preventive Care': 'balance',
};

/** Short, effect-free titles for program names. */
export const CATEGORY_TITLE: Record<CatalogCategory, string> = {
  'Relaxation & Stress Balance': 'Calm Ground',
  'Sleep & Night Recovery': 'Night Quiet',
  'Energy & Vitality': 'Bright Start',
  'Mental Focus & Clarity': 'Clear Mind',
  'Emotional Balance': 'Even Keel',
  'Physical Ease & Recovery': 'Easy Pace',
  'Movement & Activity Support': 'In Motion',
  'Digestive & Metabolic Balance': 'Steady Centre',
  'Mindfulness & Inner Awareness': 'Inner Quiet',
  'Daily Balance & Preventive Care': 'Daily Rhythm',
};

/** What the music invites you to do, as a verb for "settle, then …". */
export const CATEGORY_VERB: Record<CatalogCategory, string> = {
  'Relaxation & Stress Balance': 'unwind',
  'Sleep & Night Recovery': 'drift',
  'Energy & Vitality': 'lift',
  'Mental Focus & Clarity': 'focus',
  'Emotional Balance': 'steady',
  'Physical Ease & Recovery': 'ease off',
  'Movement & Activity Support': 'move',
  'Digestive & Metabolic Balance': 'settle in',
  'Mindfulness & Inner Awareness': 'turn inward',
  'Daily Balance & Preventive Care': 'find your rhythm',
};

const TEMPO_WORD: Record<DayTempo, string> = { push: 'Bright', steady: 'Steady', soften: 'Soft', rest: 'Quiet' };
const SLOT_WORD: Record<Slot, string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };
const SPACE_WORD: Record<Intent, string> = {
  focus: 'Focus',
  relax: 'Unwind',
  sleep: 'Sleep',
  meditate: 'Stillness',
  energy: 'Energy',
  balance: 'Balance',
  recover: 'Recover',
};

/* ───────────────────────── helpers ───────────────────────── */

const fmtHz = (raw: string) => raw.replace(/\.0+$/, '');

function count(c: Composition) {
  return c.phases.reduce((n, p) => n + p.frequencyIndices.length, 0);
}

function stepPhrase(c: Composition): string {
  const s = c.phases[0]?.stepSeconds ?? 60;
  return s === 60 ? 'one each minute' : s % 60 === 0 ? `one every ${s / 60} minutes` : `one every ${s} seconds`;
}

function shapeSentence(c: Composition): string {
  return `It moves through ${count(c)} frequencies, ${stepPhrase(c)}, as a soft pulse under any soundscape, and loops until you change it.`;
}

/** Category each phase actually drew from. */
const phaseCategory = (c: Composition, role: PhaseRole) =>
  c.phases.filter((p) => p.role === role).map((p) => programById(p.sourceProgramId)!.category as CatalogCategory);

/** The reasons that explain this composition: rules whose category made it into a matching phase. */
function reasonsFor(c: Composition, all: Reason[], extra: (r: Reason) => boolean = () => false): Reason[] {
  const support = new Set(phaseCategory(c, 'support'));
  const amplify = new Set(phaseCategory(c, 'amplify'));
  const seen = new Set<string>();
  return all.filter((r) => {
    const hit = (r.use === 'support' && support.has(r.category)) || (r.use === 'amplify' && amplify.has(r.category)) || extra(r);
    const key = `${r.ruleId}|${r.category}`;
    if (!hit || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** First rule sentences, without repeats, up to `n`. */
function simpleLines(reasons: Reason[], n: number): string[] {
  const out: string[] = [];
  for (const r of reasons) {
    const line = ruleById(r.ruleId)?.simple;
    if (line && !out.includes(line)) out.push(line);
    if (out.length >= n) break;
  }
  return out;
}

function proText(c: Composition, reasons: Reason[], tempo?: DayTempo): string {
  const b = band(c.intent);
  const lines = [
    `Rulebook ${c.versions.rulebook}${RULEBOOK_STATUS === 'draft' ? ' (draft, awaiting sign-off)' : ''} · composer ${c.versions.composer} · adaptation policy ${c.versions.policy} · catalog ${c.versions.catalog} (sha256 ${c.versions.catalogSha.slice(0, 12)}…).`,
    `Space: ${SPACE_WORD[c.intent]}, band ${b.minHz}–${b.maxHz} Hz, played as amplitude pulse (no tones, no binaural). Step ${c.phases[0]?.stepSeconds ?? 60} s; one cycle ${Math.round(c.totalSeconds / 60)} min; loops until changed.${tempo ? ` Day tempo: ${tempo}.` : ''}`,
    ...c.phases.map((p, i) => {
      const prog = programById(p.sourceProgramId)!;
      const values = p.frequencyIndices.map((idx) => `${fmtHz(prog.frequencies.find((f) => f.index === idx)!.raw)} Hz [#${idx}]`);
      return `${i + 1}. ${p.role} · ${prog.id} (${prog.category}): ${values.join(', ')}.`;
    }),
    reasons.length
      ? `Rules fired: ${reasons.map((r) => `${r.ruleId} → ${r.use} ${r.category} (${r.weight})`).join('; ')}.`
      : 'Rules fired: none beyond the space defaults.',
  ];
  return lines.join('\n');
}

/** A seed tied to the chart itself (not the account), so the same chart and day give the same program. */
export function chartSeed(p: BirthProfile): string {
  return `${p.birthDate}T${p.timeUnknown ? 'noon' : p.birthTime}@${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
}

function finish(
  base: Omit<GeneratedProgram, 'contentHash' | 'versions' | 'recipeId' | 'intent'>,
  signals: SoundSignals
): GeneratedProgram {
  const c = base.composition;
  return {
    ...base,
    intent: c.intent,
    recipeId: c.recipeId,
    versions: { ...c.versions, signals: signals.versions.signals },
    contentHash: contentHash(c),
  };
}

/* ───────────────────────── the sets ───────────────────────── */

function today(signals: SoundSignals, profile: BirthProfile, slot: Slot, tempo: DayTempo): GeneratedProgram {
  const intent = SLOT_SPACE[slot][tempo];
  const home = homeCategories(intent);
  const support = ranked(signals.support);
  const amplify = ranked(signals.amplify);
  const phases: ComposeRequest['phases'] = [
    { role: 'arrive', categories: home },
    { role: 'support', categories: [...support, ...home] },
    ...(slot === 'evening' ? [] : [{ role: 'amplify' as const, categories: [...amplify, ...home] }]),
    { role: 'integrate', categories: home },
  ];
  const composition = compose({
    intent,
    phases,
    seed: `${chartSeed(profile)}|today|${signals.date}|${slot}`,
    rulebookVersion: RULEBOOK_VERSION,
  });
  const reasons = reasonsFor(composition, signals.reasons, (r) => r.layer === 'day');
  // Evenings wind down: the name follows the space, not the busiest phase.
  const lead =
    slot === 'evening'
      ? (home[0] as CatalogCategory)
      : (phaseCategory(composition, 'amplify')[0] ?? phaseCategory(composition, 'support')[0] ?? (home[0] as CatalogCategory));
  const name = `${TEMPO_WORD[tempo]} ${SLOT_WORD[slot]}: settle, then ${CATEGORY_VERB[lead]}`;
  // The day line describes the whole day; the chart line explains the phase the name is about.
  const chartReasons = reasons.filter((r) => r.layer !== 'day');
  const ordered =
    slot === 'evening'
      ? chartReasons.filter((r) => home.includes(r.category))
      : [...chartReasons.filter((r) => r.category === lead), ...chartReasons.filter((r) => r.category !== lead)];
  const description = [TEMPO_LINE[signals.dayTempo], ...simpleLines(ordered, 1), shapeSentence(composition)].join(' ');
  return finish(
    {
      kind: 'today',
      slot,
      validFrom: signals.date,
      validTo: signals.date,
      name,
      description,
      descriptionPro: proText(composition, reasons, tempo),
      composition,
      reasons,
      genKey: `${profile.id}:${profile.version}:today:${slot}:${signals.date}:${RULEBOOK_VERSION}`,
      profileId: profile.id,
      profileVersion: profile.version,
    },
    signals
  );
}

function natal(signals: SoundSignals, profile: BirthProfile, kind: 'strength' | 'challenge', rank: number): GeneratedProgram | null {
  const use = kind === 'strength' ? 'amplify' : 'support';
  const weights: CategoryWeights = signals.natal[use];
  const other: CategoryWeights = signals.natal[use === 'amplify' ? 'support' : 'amplify'];
  // A category is either a strength or a challenge, never both: the higher weight wins, ties go to support.
  const cats = ranked(weights).filter((c) => (use === 'support' ? weights[c] >= other[c] : weights[c] > other[c]));
  const category = cats[rank];
  if (!category) return null;
  const intent = CATEGORY_SPACE[category];
  const home = homeCategories(intent);
  const composition = compose({
    intent,
    phases: [
      { role: 'arrive', categories: home },
      { role: use, categories: [category] },
      { role: use, categories: [category, ...cats.filter((c) => c !== category)] },
      { role: 'integrate', categories: home },
    ],
    seed: `${chartSeed(profile)}|${kind}|${rank}`,
    rulebookVersion: RULEBOOK_VERSION,
  });
  const reasons = reasonsFor(
    composition,
    signals.reasons.filter((r) => r.layer === 'natal')
  );
  const title = CATEGORY_TITLE[category];
  const name = kind === 'strength' ? `Your Strength: ${title}` : `Gentle Support: ${title}`;
  const description = [...simpleLines(reasons.filter((r) => r.category === category), 1), shapeSentence(composition)].join(' ');
  return finish(
    {
      kind,
      slot: null,
      validFrom: signals.date,
      validTo: null,
      name,
      description,
      descriptionPro: proText(composition, reasons),
      composition,
      reasons,
      genKey: `${profile.id}:${profile.version}:${kind}:${rank}:${RULEBOOK_VERSION}`,
      profileId: profile.id,
      profileVersion: profile.version,
    },
    signals
  );
}

function chapter(signals: SoundSignals, profile: BirthProfile): GeneratedProgram {
  const support = ranked(signals.chapter.support);
  const amplify = ranked(signals.chapter.amplify);
  const lead = support[0] ?? amplify[0] ?? 'Daily Balance & Preventive Care';
  const intent = CATEGORY_SPACE[lead];
  const home = homeCategories(intent);
  const composition = compose({
    intent,
    phases: [
      { role: 'arrive', categories: home },
      ...(support.length ? [{ role: 'support' as const, categories: support }] : []),
      ...(amplify.length ? [{ role: 'amplify' as const, categories: amplify }] : []),
      { role: 'integrate', categories: home },
    ],
    seed: `${chartSeed(profile)}|chapter|${signals.chapter.lord}-${signals.chapter.subLord}-${signals.chapter.until}`,
    rulebookVersion: RULEBOOK_VERSION,
  });
  const reasons = reasonsFor(
    composition,
    signals.reasons.filter((r) => r.layer === 'chapter')
  );
  const description = [
    ...simpleLines(reasons, 1),
    `Made for the stretch of time you are in now, until ${new Date(`${signals.chapter.until}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}.`,
    shapeSentence(composition),
  ].join(' ');
  return finish(
    {
      kind: 'chapter',
      slot: null,
      validFrom: signals.date,
      validTo: signals.chapter.until,
      name: `This Chapter: ${CATEGORY_TITLE[lead]}`,
      description,
      descriptionPro: proText(composition, reasons),
      composition,
      reasons,
      genKey: `${profile.id}:${profile.version}:chapter:${signals.chapter.lord}-${signals.chapter.subLord}-${signals.chapter.until}:${RULEBOOK_VERSION}`,
      profileId: profile.id,
      profileVersion: profile.version,
    },
    signals
  );
}

/** Up to two strengths and two challenges (§5.6). */
const NATAL_COUNT = 2;

export function buildProgramSet(set: ProgramSet, signals: SoundSignals, profile: BirthProfile): GeneratedProgram[] {
  switch (set) {
    case 'today':
      return signals.windows.map((w) => today(signals, profile, w.slot, w.tempo));
    case 'chapter':
      return [chapter(signals, profile)];
    case 'strengths':
      return Array.from({ length: NATAL_COUNT }, (_, i) => natal(signals, profile, 'strength', i)).filter((p): p is GeneratedProgram => !!p);
    case 'challenges':
      return Array.from({ length: NATAL_COUNT }, (_, i) => natal(signals, profile, 'challenge', i)).filter((p): p is GeneratedProgram => !!p);
  }
}

/** The slot a local hour falls in: before 11 morning, before 17 midday, else evening. */
export function slotForHour(hour: number): Slot {
  return hour < 11 ? 'morning' : hour < 17 ? 'midday' : 'evening';
}

/** All copy the templates can produce, for the claims lint. */
export const TEMPLATE_COPY = [
  ...Object.values(CATEGORY_TITLE),
  ...Object.values(CATEGORY_VERB),
  ...Object.values(TEMPO_LINE),
  'It moves through frequencies, as a soft pulse under any soundscape, and loops until you change it.',
  'Made for the stretch of time you are in now.',
  'Your Strength', 'Gentle Support', 'This Chapter', 'settle, then',
];
