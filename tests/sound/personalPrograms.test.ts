/**
 * Personal programs (phase 4): the same chart and day always give the same
 * program, every value that plays is a catalog value inside the space's band,
 * and all copy stays within the claims rules.
 */

import { describe, expect, it } from 'vitest';
import { computeSignals, localNoon, signalsFromFacts } from '../../src/lib/sound/signals';
import { buildProgramSet, PROGRAM_SETS, TEMPLATE_COPY, CATEGORY_SPACE, slotForHour, type GeneratedProgram } from '../../src/lib/sound/programs';
import { RULES, RULEBOOK_VERSION, applyRules, dayTempo, slotTempo, type ChartFacts, type Level, type Planet } from '../../src/lib/sound/rulebook';
import { browserToBirthProfile, type BrowserProfile } from '../../src/lib/sound/profile';
import { band, compose, homeCategories, planForComposition, validateComposition, SUGGESTED_RECIPE, stableStringify, type Composition } from '../../src/sound/engine/compose/index';
import { programById } from '../../src/sound/engine/domain/programs/catalog';
import { FLAGSHIP_BY_INTENT } from '../../src/sound/player/ui/catalogue';
import { techniqueForProgram } from '../../src/sound/player/features/personal/personal';
import { ARC_RULES } from '../../src/lib/sound/dayArc';

const ALEX: BrowserProfile = {
  name: 'Alex',
  birthDate: '1992-06-21',
  birthTime: '08:45',
  isTimeUnknown: false,
  cityName: 'London, United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 1,
  ianaTimezone: 'Europe/London',
};
const JORDAN: BrowserProfile = {
  name: 'Jordan',
  birthDate: '1994-09-15',
  birthTime: '14:20',
  isTimeUnknown: false,
  cityName: 'New York, United States',
  latitude: 40.7128,
  longitude: -74.006,
  timezone: -4,
  ianaTimezone: 'America/New_York',
};
const NO_TIME: BrowserProfile = { ...ALEX, name: 'Sam', birthDate: '1985-02-03', isTimeUnknown: true, birthTime: '12:00' };

const profile = (p: BrowserProfile) => browserToBirthProfile(p, `fixture-${p.name.toLowerCase()}`, 1);

function allPrograms(p: BrowserProfile, date: string, tz: string): GeneratedProgram[] {
  const bp = profile(p);
  const s = computeSignals(bp, date, tz);
  return PROGRAM_SETS.flatMap((set) => buildProgramSet(set, s, bp));
}

/** What a golden file pins: everything a member hears and reads. */
const golden = (list: GeneratedProgram[]) =>
  list.map((g) => ({
    kind: g.kind,
    slot: g.slot,
    name: g.name,
    description: g.description,
    intent: g.intent,
    recipeId: g.recipeId,
    validFrom: g.validFrom,
    validTo: g.validTo,
    composition: g.composition,
    reasons: g.reasons,
    contentHash: g.contentHash,
    genKey: g.genKey,
  }));

describe('Determinism (golden files)', () => {
  const cases: Array<[string, BrowserProfile, string, string]> = [
    ['alex-2026-11-27', ALEX, '2026-11-27', 'Europe/London'],
    ['alex-2027-03-14', ALEX, '2027-03-14', 'Europe/Riga'],
    ['jordan-2026-11-27', JORDAN, '2026-11-27', 'America/New_York'],
    ['sam-no-time-2026-11-27', NO_TIME, '2026-11-27', 'Europe/London'],
  ];
  for (const [name, p, date, tz] of cases) {
    it(`${name}: same chart + date → same programs`, async () => {
      const a = golden(allPrograms(p, date, tz));
      const b = golden(allPrograms(p, date, tz));
      expect(stableStringify(a)).toBe(stableStringify(b));
      await expect(JSON.stringify(a, null, 2) + '\n').toMatchFileSnapshot(`./__golden__/programs-${name}.json`);
    });
  }

  it('signals do not depend on the wall clock', () => {
    const bp = profile(ALEX);
    const a = computeSignals(bp, '2026-11-27', 'Europe/London');
    const b = computeSignals(bp, '2026-11-27', 'Europe/London');
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(a.versions.rulebook).toBe(RULEBOOK_VERSION);
  });

  it('today has three slots and natal sets do not change with the date', () => {
    const bp = profile(JORDAN);
    const d1 = computeSignals(bp, '2026-11-27', 'America/New_York');
    const d2 = computeSignals(bp, '2027-05-02', 'America/New_York');
    expect(buildProgramSet('today', d1, bp).map((p) => p.slot)).toEqual(['morning', 'midday', 'evening']);
    const pick = (s: typeof d1) => buildProgramSet('strengths', s, bp).map((p) => [p.contentHash, p.genKey]);
    expect(pick(d1)).toEqual(pick(d2));
    expect(stableStringify(buildProgramSet('challenges', d1, bp).map((p) => p.composition))).toBe(
      stableStringify(buildProgramSet('challenges', d2, bp).map((p) => p.composition))
    );
  });
});

describe('Stored rulebook-1 programs (catalog compositions) still play exactly', () => {
  // Nothing new is composed this way since rulebook 2, but saved programs are immutable and must keep playing.
  const intents = ['focus', 'relax', 'sleep', 'meditate', 'energy', 'balance', 'recover'] as const;
  const programs = intents.flatMap((intent) =>
    ['a', 'b', 'c'].map((seed) =>
      compose({
        intent,
        phases: [
          { role: 'arrive', categories: homeCategories(intent) },
          { role: 'support', categories: ['Emotional Balance', ...homeCategories(intent)] },
          { role: 'integrate', categories: homeCategories(intent) },
        ],
        seed,
        rulebookVersion: '1.0.0',
      })
    )
  );

  it('every rendered Hz is the catalog value at its (program, index), inside the space band', () => {
    for (const c of programs) {
      expect(validateComposition(c)).toEqual([]);
      const plan = planForComposition(c);
      expect(plan.renderable).toBe(true);
      const { minHz, maxHz } = band(c.intent);
      for (const s of plan.sequence) {
        const row = programById(s.sourceProgramId!)!.frequencies.find((f) => f.index === s.sourceIndex)!;
        expect(s.renderedHz).toBe(row.hz);
        expect(s.renderedHz).toBeGreaterThanOrEqual(minHz);
        expect(s.renderedHz).toBeLessThanOrEqual(maxHz);
      }
      expect(c.totalSeconds).toBe(plan.passSeconds);
    }
  });

  it('sleep stays at or below 4 Hz and focus between 4 and 40 Hz', () => {
    expect(band('sleep').maxHz).toBe(4);
    expect(band('focus')).toEqual({ minHz: 4, maxHz: 40 });
  });

  it('the player plays exactly the plan and refuses a tampered program', async () => {
    const c = programs[5];
    const asApi = { id: null, saved: false, slot: null, kind: 'chapter' as const, name: 'Old', description: '', descriptionPro: '', intent: c.intent, recipeId: c.recipeId, composition: c, reasons: [], validFrom: '2026-01-01', validTo: null, contentHash: 'abc' };
    const t = await techniqueForProgram(asApi);
    const plan = planForComposition(c);
    expect(t!.pulse!.sequence!.map((s) => [s.hz, s.seconds])).toEqual(plan.sequence.map((s) => [s.renderedHz, s.durationSeconds]));
    const bad = { ...asApi, composition: { ...c, phases: [{ ...c.phases[0], frequencyIndices: [999] }] } };
    expect(await techniqueForProgram(bad)).toBeNull();
  });

  it('a tampered composition is refused', () => {
    const c = programs[0];
    const fake = (patch: Partial<Composition['phases'][number]>): Composition => ({ ...c, phases: [{ ...c.phases[0], ...patch }] });
    expect(validateComposition(fake({ frequencyIndices: [999] }))).not.toEqual([]);
    expect(validateComposition(fake({ sourceProgramId: 'xxxx_000' }))).not.toEqual([]);
    expect(validateComposition(fake({ stepSeconds: 5 }))).not.toEqual([]);
    expect(validateComposition({ ...c, schema: 'other' })).not.toEqual([]);
    expect(() => planForComposition(fake({ frequencyIndices: [999] }))).toThrow();
  });
});

describe('Rulebook', () => {
  const lv = (l: Level) => ({ level: l, house: 1 });
  const facts = (patch: Partial<Record<Planet, Level>> = {}, areaLow: number[] = []): ChartFacts => ({
    planets: Object.fromEntries(
      (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as Planet[]).map((p) => [p, lv(patch[p] ?? 'good')])
    ) as ChartFacts['planets'],
    areas: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, { points: 30, level: areaLow.includes(i + 1) ? 'low' : 'good' }])),
    timeUnknown: false,
    chapter: { lord: 'Venus', subLord: 'Sun', support: 'good', until: '2027-01-01', sadeSati: 'none', saturnFromMoon: 3 },
    day: { score: 50, taraGood: true, chandraGood: true, moonNakshatra: 'Rohini' },
  });

  it('maps the §5.3 table', () => {
    expect(applyRules(facts({ Moon: 'low' })).support['Emotional Balance']).toBe(1);
    expect(applyRules(facts({}, [12])).support['Sleep & Night Recovery']).toBe(1);
    expect(applyRules(facts({ Mercury: 'low' })).support['Mental Focus & Clarity']).toBe(1);
    expect(applyRules(facts({ Sun: 'low' })).support['Energy & Vitality']).toBe(1);
    expect(applyRules(facts({}, [6])).support['Physical Ease & Recovery']).toBe(1);
    expect(applyRules(facts({ Mars: 'strong' })).amplify['Movement & Activity Support']).toBe(1);
    expect(applyRules(facts({ Mercury: 'strong' })).amplify['Mental Focus & Clarity']).toBe(1);
    expect(applyRules(facts({ Jupiter: 'strong' })).amplify['Mindfulness & Inner Awareness']).toBe(1);
    const saturn = facts();
    saturn.chapter.sadeSati = 'peak';
    const r = applyRules(saturn);
    expect(r.support['Relaxation & Stress Balance']).toBe(1);
    expect(r.support['Daily Balance & Preventive Care']).toBe(1);
  });

  it('house rules count half without a birth time', () => {
    const f = facts({}, [12]);
    f.timeUnknown = true;
    expect(applyRules(f).support['Sleep & Night Recovery']).toBe(0.5);
  });

  it('every chart gets at least one strength and one challenge (fallbacks)', () => {
    const s = signalsFromFacts(facts(), { profileId: 'x', profileVersion: 1, date: '2026-11-27', timeZone: 'UTC' });
    expect(Object.values(s.natal.amplify).some((w) => w > 0)).toBe(true);
    expect(Object.values(s.natal.support).some((w) => w > 0)).toBe(true);
  });

  it('day tempo and slots', () => {
    expect(dayTempo({ score: 80, taraGood: true, chandraGood: true, moonNakshatra: '' })).toBe('push');
    expect(dayTempo({ score: 50, taraGood: true, chandraGood: true, moonNakshatra: '' })).toBe('steady');
    expect(dayTempo({ score: 30, taraGood: false, chandraGood: false, moonNakshatra: '' })).toBe('soften');
    expect(dayTempo({ score: 10, taraGood: false, chandraGood: false, moonNakshatra: '' })).toBe('rest');
    expect(slotTempo('push', 'evening')).toBe('steady');
    expect(slotTempo('rest', 'evening')).toBe('rest');
    expect([slotForHour(7), slotForHour(13), slotForHour(20)]).toEqual(['morning', 'midday', 'evening']);
  });

  it('rule ids are unique and every category maps to a player space', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const cat of RULES.flatMap((r) => r.categories)) expect(CATEGORY_SPACE[cat]).toBeTruthy();
  });

  it('local noon follows the time zone', () => {
    expect(localNoon('2026-11-27', 'Europe/Riga').toISOString()).toBe('2026-11-27T10:00:00.000Z');
    expect(localNoon('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(localNoon('2026-07-01', 'Not/AZone').toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });
});

describe('Copy', () => {
  // Health, outcome and fate words that must never appear in program copy
  // (frequency claims rules + Life Rhythm tone: timing and pacing, not fate).
  const BANNED = [
    /\bheal/i, /\bcure/i, /\btreat/i, /\btherap/i, /\bdiagnos/i, /\bmedic/i, /\bclinic/i, /\bsymptom/i, /\bdisease/i,
    /\banxiety\b/i, /\bdepress/i, /\binsomnia/i, /\bpain\b/i, /\bimmun/i, /\bdetox/i, /\bhormon/i, /\bbrain/i,
    /\bguarantee/i, /\bproven/i, /\bwill (improve|fix|make you)/i, /\bdestin/i, /\bfate\b/i, /\bdoomed/i, /\bunlucky/i,
    /\bPEMF\b/, /\bfrequenc(y|ies) (heal|restore|repair)/i,
  ];
  const PLANET_NAMES = /\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/;

  it('rule and template copy passes the claims lint', () => {
    for (const text of [...RULES.map((r) => r.simple), ...ARC_RULES.flatMap((r) => (r.simple ? [r.simple] : [])), ...TEMPLATE_COPY]) {
      for (const re of BANNED) expect(text, text).not.toMatch(re);
      expect(text, text).not.toMatch(PLANET_NAMES);
    }
  });

  it('generated names and Simple descriptions pass it too', () => {
    const list = [ALEX, JORDAN, NO_TIME].flatMap((p) => allPrograms(p, '2026-11-27', p.ianaTimezone!));
    for (const g of list) {
      for (const text of [g.name, g.description]) {
        for (const re of BANNED) expect(text, text).not.toMatch(re);
        expect(text, text).not.toMatch(PLANET_NAMES);
      }
      expect(g.description.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(4);
      const c = g.composition;
      expect(g.descriptionPro).toContain('phases' in c ? c.phases[0].sourceProgramId : c.movements[0].id.split('.')[1]);
    }
  });

  it('suggested soundscapes are the player flagships', () => {
    expect(SUGGESTED_RECIPE).toEqual(FLAGSHIP_BY_INTENT);
  });
});
