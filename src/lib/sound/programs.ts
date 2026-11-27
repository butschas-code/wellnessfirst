/**
 * Wellness Waves — personal program sets (§5.4–5.6).
 *
 * signals → composed arcs (dayArc.ts) → template name and description.
 * Every set is composed from the chart, value by value: Today as three day
 * arcs, This Chapter, Your Strengths and Gentle Support as theme arcs. No set
 * picks from the catalog any more (rulebook 2.0.0); stored catalog-based
 * programs from rulebook 1 still validate and play.
 * Pure and deterministic: no clock, no database, no LLM. The API stores what
 * this returns; anonymous visitors get the same programs without storage.
 *
 * Names and descriptions are templates only (decided 2026-11-26). Simple view
 * never names planets; Pro view lists every rate, its voices and the rule ids.
 */

import type { Intent } from '../../sound/engine/types/index';
import { contentHash, type AnyComposition, type ArcComposition, type Composition } from '../../sound/engine/compose/index';
import { ARC_RULEBOOK_STATUS, ARC_RULEBOOK_VERSION, LIBRARY, NATURE, AREA_NATURE, arcRuleById, audibleTone, catalogEcho, composeDayArc, composeThemeArc, strengthThemes, supportThemes, type ArcFacts, type DayArc, type Theme } from './dayArc';
import type { BirthProfile } from './profile';
import type { SoundSignals } from './signals';
import { TEMPO_LINE, type CatalogCategory, type DayTempo, type Reason, type Slot } from './rulebook';

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
  composition: AnyComposition;
  reasons: Array<Reason | ArcReason>;
  versions: Record<string, string> & { signals: string };
  contentHash: string;
  /** Deterministic key of this generation request; UNIQUE per user in the database. */
  genKey: string;
  profileId: string;
  profileVersion: number;
}

/** Why an arc movement looks the way it does (rulebook 2). */
export interface ArcReason {
  ruleId: string;
  layer: 'arc';
  /** Movement ids the rule shaped. */
  movements: string[];
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

/* ───────────────────────── helpers ───────────────────────── */

/** A seed tied to the chart itself (not the account), so the same chart and day give the same program. */
export function chartSeed(p: BirthProfile): string {
  return `${p.birthDate}T${p.timeUnknown ? 'noon' : p.birthTime}@${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
}

function finish(
  base: Omit<GeneratedProgram, 'contentHash' | 'versions' | 'recipeId' | 'intent'>,
  signals: SoundSignals
): GeneratedProgram {
  const c = base.composition as Composition | ArcComposition;
  return {
    ...base,
    intent: c.intent,
    recipeId: c.recipeId,
    versions: { ...c.versions, signals: signals.versions.signals },
    contentHash: contentHash(c),
  };
}

/* ───────────────────────── the sets ───────────────────────── */

/* ───────────────────────── today: personal day arcs ───────────────────────── */

const SLOT_TITLE: Record<Slot, string> = { morning: 'Morning Rise', midday: 'Midday Current', evening: 'Evening Descent' };

/** Plain words for each movement (Simple view). */
const MOVE_WORD: Record<string, string> = {
  'morning.ground': 'grounds',
  'morning.wake': 'wakes slowly',
  'morning.rise': 'rises to your home tone',
  'morning.lift': 'lifts',
  'morning.spark': 'sparks',
  'morning.settle': 'settles',
  'midday.reset': 'resets',
  'midday.focus': 'focuses',
  'midday.drive': 'drives',
  'midday.pause': 'pauses',
  'midday.renew': 'renews',
  'midday.return': 'returns',
  'evening.unwind': 'unwinds',
  'evening.ground': 'grounds',
  'evening.release': 'releases',
  'evening.drift': 'drifts',
  'evening.deep': 'goes deep',
  'theme.arrive': 'arrives at your home tone',
  'theme.approach': 'moves in',
  'theme.hold': 'stays with it',
  'theme.deepen': 'deepens',
  'theme.integrate': 'comes back to centre',
};

const hzText = (v: number) => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(2).replace(/0$/, '') : v.toFixed(1).replace(/\.0$/, ''));
const minutes = (s: number) => Math.round(s / 60);

function arcShapeSentence(c: ArcComposition): string {
  const ms = c.movements;
  const words = ms.map((m) => MOVE_WORD[m.id] ?? m.id.split('.')[1]);
  const lo = Math.min(...ms.flatMap((m) => [m.fromHz, m.toHz]));
  const hi = Math.max(...ms.flatMap((m) => [m.fromHz, m.toHz]));
  const last = ms[ms.length - 1];
  return `Over ${minutes(c.totalSeconds)} minutes it ${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}, between ${hzText(lo)} and ${hzText(hi)} Hz, then holds ${hzText(last.toHz)} Hz until you change it.`;
}

function arcProText(arc: DayArc, f: ArcFacts, tempo: DayTempo, daily = true): string {
  const c = arc.composition;
  const voice = (v: { source: string; weight: number }) => (v.source in LIBRARY_LABELS ? v.source : `${v.source} ${v.weight}`);
  const lines = [
    `Day arc · rulebook ${c.versions.rulebook}${ARC_RULEBOOK_STATUS === 'draft' ? ' (draft, awaiting sign-off)' : ''} · composer ${c.versions.composer} · library ${c.versions.library}. Built value by value from the chart; no catalog program is reused.`,
    daily
      ? `Constitution lean: ${arc.lean} (vata ${arc.shares.vata}, pitta ${arc.shares.pitta}, kapha ${arc.shares.kapha}). Home tone ${hzText(arc.home)} Hz. Hour ruler at ${c.slot === 'morning' ? '08:00' : c.slot === 'midday' ? '13:00' : '21:00'}: ${arc.hora}. Weekday lord ${f.today.vara}; Moon in ${f.today.moonNakshatra} (${f.today.moonLord}), ${f.today.waxing ? 'waxing' : 'waning'}. Periods ${f.dasha.maha}/${f.dasha.antar}${f.dasha.pratyantar ? `/${f.dasha.pratyantar}` : ''}. Day tempo: ${tempo}.`
      : `Theme: ${c.theme}. Home tone ${hzText(arc.home)} Hz. Periods ${f.dasha.maha}/${f.dasha.antar} until ${f.chapterUntil}. Natal only: does not change from day to day${c.theme?.startsWith('chapter') ? ' within this sub-period' : ''}.`,
    ...c.movements.map((m, i) => {
      const rate = m.fromHz === m.toHz ? `${hzText(m.fromHz)} Hz` : `${hzText(m.fromHz)} → ${hzText(m.toHz)} Hz`;
      const extras = [
        m.shape === 'firm' ? 'firm pulse' : 'round pulse',
        `drift ±${Math.round(m.jitter.pct * 1000) / 10}% every ${m.jitter.every} s`,
        ...(m.burst ? [`${m.burst.hz} Hz bursts ${m.burst.on} s every ${m.burst.every} s`] : []),
        ...(m.breath ? [`breathing swell ${Math.round(m.breath.hz * 600) / 10}/min`] : []),
      ];
      const echo = catalogEcho(m.toHz);
      return `${i + 1}. ${m.id.split('.')[1]} · ${rate} · ${minutes(m.seconds)} min · ${extras.join(', ')} · voices: ${m.voices.map(voice).join(', ')}${echo ? ` · ≈ ${echo.raw} Hz in ${echo.name} (${echo.id})` : ''}.`;
    }),
    `Planet tones (orbit raised by octaves): ${(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'] as const).map((p) => `${p} ${audibleTone(p).toFixed(2)}`).join(', ')} Hz.`,
    `Rules: ${arc.rules.join(', ')}.`,
  ];
  return lines.join('\n');
}

const LIBRARY_LABELS: Record<string, true> = Object.fromEntries(Object.values(LIBRARY).map((l) => [l.label, true]));

function today(signals: SoundSignals, profile: BirthProfile, slot: Slot, tempo: DayTempo): GeneratedProgram {
  const f = signals.arc;
  if (!f) throw new Error('Day arcs need the full chart facts (computeSignals).');
  const arc = composeDayArc(f, slot, tempo, `${chartSeed(profile)}|arc|${signals.date}|${slot}`);
  const composition = arc.composition;
  const reasons: ArcReason[] = arc.rules.map((ruleId) => ({
    ruleId,
    layer: 'arc',
    movements: composition.movements.filter((m) => m.rules.includes(ruleId)).map((m) => m.id),
  }));
  // Lean lines only where the lean changes this slot (earthy: mornings; fiery: midday; airy: all).
  const leanHere = (id: string) => !(id === 'lean.kapha' && slot !== 'morning') && !(id === 'lean.pitta' && slot !== 'midday');
  const chartLine = [...arc.rules.filter((id) => !id.startsWith('lean.')), ...arc.rules.filter((id) => id.startsWith('lean.'))]
    .filter((id) => !id.startsWith('tempo.') && leanHere(id))
    .map((id) => arcRuleById(id)?.simple)
    .find((t): t is string => !!t);
  const description = [TEMPO_LINE[tempo], ...(chartLine ? [chartLine] : []), arcShapeSentence(composition)].join(' ');
  return finish(
    {
      kind: 'today',
      slot,
      validFrom: signals.date,
      validTo: signals.date,
      name: `${TEMPO_WORD[tempo]} ${SLOT_TITLE[slot]}`,
      description,
      descriptionPro: arcProText(arc, f, tempo),
      composition,
      reasons,
      genKey: `${profile.id}:${profile.version}:today:${slot}:${signals.date}:arc-${ARC_RULEBOOK_VERSION}`,
      profileId: profile.id,
      profileVersion: profile.version,
    },
    signals
  );
}

/* ───────────────────────── chapter, strengths, support: theme arcs ───────────────────────── */

const until = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function themeProgram(signals: SoundSignals, profile: BirthProfile, kind: 'chapter' | 'strength' | 'challenge', theme: Theme, rank: number): GeneratedProgram {
  const f = signals.arc;
  if (!f) throw new Error('Theme arcs need the full chart facts (computeSignals).');
  const seedKey = kind === 'chapter' ? `chapter|${f.dasha.maha}-${f.dasha.antar}-${f.chapterUntil}` : `${kind}|${rank}`;
  const arc = composeThemeArc(f, theme, `${chartSeed(profile)}|arc|${seedKey}`);
  const composition = arc.composition;
  const reasons: ArcReason[] = arc.rules.map((ruleId) => ({
    ruleId,
    layer: 'arc',
    movements: composition.movements.filter((m) => m.rules.includes(ruleId)).map((m) => m.id),
  }));
  const chapterLine = kind === 'chapter' ? arc.rules.map((id) => arcRuleById(id)?.simple).find((t): t is string => !!t) : undefined;
  const description = [
    chapterLine ?? arc.line,
    ...(kind === 'chapter' ? [`Made for the stretch of time you are in now, until ${until(f.chapterUntil)}.`] : []),
    arcShapeSentence(composition),
  ].join(' ');
  const prefix = kind === 'chapter' ? 'This Chapter' : kind === 'strength' ? 'Your Strength' : 'Gentle Support';
  return finish(
    {
      kind,
      slot: null,
      validFrom: signals.date,
      validTo: kind === 'chapter' ? f.chapterUntil : null,
      name: `${prefix}: ${arc.title}`,
      description,
      descriptionPro: arcProText(arc, f, signals.dayTempo, false),
      composition,
      reasons,
      genKey:
        kind === 'chapter'
          ? `${profile.id}:${profile.version}:chapter:${f.dasha.maha}-${f.dasha.antar}-${f.chapterUntil}:arc-${ARC_RULEBOOK_VERSION}`
          : `${profile.id}:${profile.version}:${kind}:${rank}:arc-${ARC_RULEBOOK_VERSION}`,
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
      return [themeProgram(signals, profile, 'chapter', { kind: 'chapter' }, 0)];
    case 'strengths':
      return strengthThemes(signals.arc!, NATAL_COUNT).map((t, i) => themeProgram(signals, profile, 'strength', t, i));
    case 'challenges':
      return supportThemes(signals.arc!, NATAL_COUNT).map((t, i) => themeProgram(signals, profile, 'challenge', t, i));
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
  ...Object.values(SLOT_TITLE),
  ...Object.values(NATURE).flatMap((n) => [n.strong.title, n.strong.line, n.support.title, n.support.line]),
  ...Object.values(AREA_NATURE).flatMap((a) => [a.title, a.line]),
  ...Object.values(MOVE_WORD),
];
