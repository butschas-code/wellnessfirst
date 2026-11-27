/**
 * Personal day arcs (rulebook 2): each person gets their own morning, midday
 * and evening program, built value by value from the chart; they stay inside
 * the safety limits, play exactly as composed, and change with the chart and
 * the day.
 */

import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { computeSignals } from '../../src/lib/sound/signals';
import { buildProgramSet, type GeneratedProgram } from '../../src/lib/sound/programs';
import { browserToBirthProfile, type BrowserProfile } from '../../src/lib/sound/profile';
import { ARC_RULES, LIBRARY, audibleTone, constitution, horaLord, octavePosition } from '../../src/lib/sound/dayArc';
import { ARC_LIMITS, arcSteps, isArc, planForComposition, validateComposition, type ArcComposition } from '../../src/sound/engine/compose/index';
import { WellnessLayer } from '../../src/sound/engine/audio/wellness/layer';
import { techniqueForProgram } from '../../src/sound/player/features/personal/personal';

const base = { isTimeUnknown: false, cityName: 'x', timezone: 0 };
const PEOPLE: BrowserProfile[] = [
  { ...base, name: 'Alex', birthDate: '1992-06-21', birthTime: '08:45', latitude: 51.5074, longitude: -0.1278, timezone: 1, ianaTimezone: 'Europe/London' },
  { ...base, name: 'Jordan', birthDate: '1994-09-15', birthTime: '14:20', latitude: 40.7128, longitude: -74.006, timezone: -4, ianaTimezone: 'America/New_York' },
  { ...base, name: 'Sam', birthDate: '1985-02-03', birthTime: '12:00', isTimeUnknown: true, latitude: 51.5074, longitude: -0.1278, timezone: 0, ianaTimezone: 'Europe/London' },
  { ...base, name: 'Riya', birthDate: '1979-11-02', birthTime: '05:10', latitude: 19.076, longitude: 72.8777, timezone: 5.5, ianaTimezone: 'Asia/Kolkata' },
  { ...base, name: 'Lena', birthDate: '2001-03-30', birthTime: '23:05', latitude: 56.9496, longitude: 24.1052, timezone: 3, ianaTimezone: 'Europe/Riga' },
];
const profile = (p: BrowserProfile) => browserToBirthProfile(p, `fixture-${p.name.toLowerCase()}`, 1);
const todayFor = (p: BrowserProfile, date: string): GeneratedProgram[] => {
  const bp = profile(p);
  return buildProgramSet('today', computeSignals(bp, date, p.ianaTimezone!), bp);
};
const arc = (g: GeneratedProgram) => g.composition as ArcComposition;
const rates = (c: ArcComposition) => c.movements.map((m) => [m.fromHz, m.toHz]);

const DATES = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, 10, 1) + i * 17 * 86_400_000).toISOString().slice(0, 10));
const ALL = PEOPLE.flatMap((p) => DATES.flatMap((d) => todayFor(p, d)));

describe('The frequency library', () => {
  it('planet tones match the cosmic-octave values (orbit raised by octaves)', () => {
    expect(audibleTone('Sun')).toBeCloseTo(136.1, 1);
    expect(audibleTone('Moon')).toBeCloseTo(210.42, 1);
    expect(audibleTone('Mercury')).toBeCloseTo(141.27, 1);
    expect(audibleTone('Venus')).toBeCloseTo(221.23, 1);
    expect(audibleTone('Mars')).toBeCloseTo(144.72, 1);
    expect(audibleTone('Jupiter')).toBeCloseTo(183.58, 1);
    expect(audibleTone('Saturn')).toBeCloseTo(147.85, 1);
    expect(octavePosition('Rahu')).toBe(octavePosition('Ketu'));
  });

  it('hour rulers follow the Chaldean order from the weekday lord', () => {
    expect(horaLord('Sun', 6)).toBe('Sun');
    expect(horaLord('Sun', 7)).toBe('Venus');
    expect(horaLord('Sun', 13)).toBe('Sun');
    expect(horaLord('Venus', 8)).toBe('Moon');
  });
});

describe('Day arcs', () => {
  it('today is three arcs, morning, midday and evening, each in its own shape', () => {
    const list = todayFor(PEOPLE[0], '2026-11-27');
    expect(list.map((g) => g.slot)).toEqual(['morning', 'midday', 'evening']);
    for (const g of list) expect(isArc(g.composition)).toBe(true);
    const ids = list.map((g) => arc(g).movements.map((m) => m.id.split('.')[0]));
    expect(ids[0].every((x) => x === 'morning')).toBe(true);
    expect(ids[2].every((x) => x === 'evening')).toBe(true);
  });

  it('every arc is valid and inside the safety limits', () => {
    expect(ALL.length).toBe(PEOPLE.length * DATES.length * 3);
    for (const g of ALL) {
      const c = arc(g);
      expect(validateComposition(c), g.name).toEqual([]);
      expect(c.totalSeconds).toBeLessThanOrEqual(ARC_LIMITS.maxTotalSeconds);
      expect(c.totalSeconds).toBe(c.movements.reduce((t, m) => t + m.seconds, 0));
      for (const m of c.movements) {
        for (const hz of [m.fromHz, m.toHz]) {
          expect(hz).toBeGreaterThanOrEqual(ARC_LIMITS.minHz);
          expect(hz).toBeLessThanOrEqual(ARC_LIMITS.maxHz);
        }
        expect(m.voices.length).toBeGreaterThan(0);
      }
    }
  });

  it('evenings only descend, end at or below about 1 Hz, and never fire bursts', () => {
    for (const g of ALL.filter((x) => x.slot === 'evening')) {
      const ms = arc(g).movements;
      for (let i = 1; i < ms.length; i++) expect(ms[i].toHz).toBeLessThanOrEqual(ms[i - 1].toHz + 0.5);
      expect(ms[ms.length - 1].toHz).toBeLessThanOrEqual(1.2);
      expect(ms.some((m) => m.burst)).toBe(false);
    }
  });

  it('mornings rise above the waking rate and settle back below their peak', () => {
    for (const g of ALL.filter((x) => x.slot === 'morning')) {
      const ms = arc(g).movements;
      const peak = Math.max(...ms.map((m) => m.toHz));
      expect(peak).toBeGreaterThanOrEqual(12);
      expect(ms[ms.length - 1].toHz).toBeLessThan(peak);
    }
  });

  it('gamma bursts only appear in midday focus, at 40 Hz, 2 s every 15 s', () => {
    const bursts = ALL.flatMap((g) => arc(g).movements.filter((m) => m.burst));
    for (const m of bursts) {
      expect(m.id).toBe('midday.focus');
      expect(m.burst).toEqual({ hz: LIBRARY.gamma.hz, on: 2, every: 15 });
    }
  });

  it('two people never get the same program on the same day', () => {
    for (const d of DATES.slice(0, 4)) {
      const byPerson = PEOPLE.map((p) => todayFor(p, d));
      for (let s = 0; s < 3; s++) {
        const keys = byPerson.map((list) => JSON.stringify(rates(arc(list[s]))));
        expect(new Set(keys).size).toBe(PEOPLE.length);
      }
    }
  });

  it('the same person gets a different program on different days', () => {
    for (const p of PEOPLE) {
      const keys = DATES.map((d) => JSON.stringify(todayFor(p, d).map((g) => rates(arc(g)))));
      expect(new Set(keys).size).toBeGreaterThanOrEqual(DATES.length - 1);
    }
  });

  it('home tones spread across the range', () => {
    const homes = PEOPLE.map((p) => arc(todayFor(p, '2026-11-27')[0]).movements.find((m) => m.id === 'morning.rise')!.toHz);
    expect(new Set(homes).size).toBe(PEOPLE.length);
    expect(Math.max(...homes) - Math.min(...homes)).toBeGreaterThan(0.6);
  });

  it('same chart and date → identical arcs', () => {
    expect(JSON.stringify(todayFor(PEOPLE[3], '2027-01-05'))).toBe(JSON.stringify(todayFor(PEOPLE[3], '2027-01-05')));
  });

  it('constitution shares add up and lean is one of the three', () => {
    for (const p of PEOPLE) {
      const s = computeSignals(profile(p), '2026-11-27', p.ianaTimezone!);
      const c = constitution(s.arc!);
      expect(c.shares.vata + c.shares.pitta + c.shares.kapha).toBeCloseTo(1, 1);
      expect(['vata', 'pitta', 'kapha']).toContain(c.lean);
    }
  });

  it('every fired rule is in the rule table', () => {
    const ids = new Set(ARC_RULES.map((r) => r.id));
    expect(ids.size).toBe(ARC_RULES.length);
    for (const g of ALL) for (const r of g.reasons) expect(ids.has(r.ruleId), r.ruleId).toBe(true);
  });

  it('a tampered arc is refused', () => {
    const c = arc(ALL[0]);
    const bad = (patch: Partial<ArcComposition['movements'][number]>) => ({ ...c, movements: [{ ...c.movements[0], ...patch }, ...c.movements.slice(1)] });
    expect(validateComposition(bad({ fromHz: 120 }))).not.toEqual([]);
    expect(validateComposition(bad({ seconds: 5 }))).not.toEqual([]);
    expect(validateComposition(bad({ depth: 0.9 }))).not.toEqual([]);
    expect(validateComposition(bad({ jitter: { pct: 0.5, every: 2 } }))).not.toEqual([]);
    expect(validateComposition(bad({ burst: { hz: 40, on: 20, every: 10 } }))).not.toEqual([]);
    expect(validateComposition(bad({ breath: { hz: 1, depth: 0.1 } }))).not.toEqual([]);
    expect(() => planForComposition(bad({ fromHz: 120 }))).toThrow();
  });
});

describe('Playback', () => {
  it('the player gets every movement with its glide, drift, bursts and swell', async () => {
    const g = ALL.find((x) => arc(x).movements.some((m) => m.burst)) ?? ALL[1];
    const t = await techniqueForProgram({ ...g, id: null, saved: false, slot: g.slot });
    expect(t!.pulse!.sequence).toEqual(arcSteps(arc(g)));
    expect(t!.pulse!.holdLast).toBe(true);
  });

  it('the layer follows the arc: rates stay near the plan, bursts reach 40 Hz, the last movement holds', async () => {
    const g = ALL.find((x) => arc(x).movements.some((m) => m.burst));
    expect(g, 'some midday arc has bursts').toBeTruthy();
    const c = arc(g!);
    const t = (await techniqueForProgram({ ...g!, id: null, saved: false, slot: g!.slot }))!;
    const ctx = new OfflineAudioContext(2, 22050, 22050) as unknown as BaseAudioContext;
    const layer = new WellnessLayer(ctx, { send: ctx.createGain(), dest: ctx.destination }, t, 0, 1);
    const end = c.totalSeconds;
    for (let x = 30; x <= end + 600; x += 30) layer.scheduleUntil(x);
    let at = 0;
    for (const m of c.movements) {
      // Mid-movement, away from bursts: within the drift of the planned rate.
      const mid = at + m.seconds / 2 + 0.7;
      const planned = m.fromHz + (m.toHz - m.fromHz) * ((mid - at) / m.seconds);
      if (!m.burst) expect(Math.abs(layer.pulseHz(mid) / planned - 1)).toBeLessThan(m.jitter.pct * 2 + 0.03);
      if (m.burst) expect(layer.pulseHz(at + m.burst.every + 1)).toBeCloseTo(40, 0);
      at += m.seconds;
    }
    const last = c.movements[c.movements.length - 1];
    expect(Math.abs(layer.pulseHz(end + 300) / last.toHz - 1)).toBeLessThan(last.jitter.pct * 2 + 0.03);
  });

  it('evening arcs breathe: the swell is visible to the stage', async () => {
    const g = ALL.find((x) => x.slot === 'evening')!;
    const t = (await techniqueForProgram({ ...g, id: null, saved: false, slot: g.slot }))!;
    const ctx = new OfflineAudioContext(2, 22050, 22050) as unknown as BaseAudioContext;
    const layer = new WellnessLayer(ctx, { send: ctx.createGain(), dest: ctx.destination }, t, 0, 1);
    for (let x = 30; x <= 900; x += 30) layer.scheduleUntil(x);
    const ground = arc(g).movements[0].seconds + 30;
    expect(layer.breathAt(ground)).not.toBeNull();
  });
});

describe('Theme arcs: chapter, strengths, gentle support', () => {
  const setsFor = (p: BrowserProfile, date: string) => {
    const bp = profile(p);
    const s = computeSignals(bp, date, p.ianaTimezone!);
    return {
      chapter: buildProgramSet('chapter', s, bp),
      strengths: buildProgramSet('strengths', s, bp),
      challenges: buildProgramSet('challenges', s, bp),
    };
  };
  const all = PEOPLE.flatMap((p) => DATES.slice(0, 4).flatMap((d) => Object.values(setsFor(p, d)).flat()));

  it('every set is composed (arcs), valid, within limits and holds its last movement', () => {
    expect(all.length).toBeGreaterThan(PEOPLE.length * 4 * 3);
    for (const g of all) {
      expect(isArc(g.composition), g.name).toBe(true);
      const c = arc(g);
      expect(validateComposition(c)).toEqual([]);
      expect(c.slot).toBeNull();
      expect(c.theme).toBeTruthy();
      expect(c.holdLast).toBe(true);
    }
  });

  it('one chapter, up to two strengths and two supports; a planet is never both', () => {
    for (const p of PEOPLE) {
      const s = setsFor(p, '2026-11-27');
      expect(s.chapter.length).toBe(1);
      expect(s.strengths.length).toBeGreaterThanOrEqual(1);
      expect(s.strengths.length).toBeLessThanOrEqual(2);
      expect(s.challenges.length).toBeGreaterThanOrEqual(1);
      expect(s.challenges.length).toBeLessThanOrEqual(2);
      const strong = s.strengths.map((g) => arc(g).theme!.split(':')[1]);
      const weak = s.challenges.map((g) => arc(g).theme!.split(':')[1]);
      for (const w of weak) expect(strong).not.toContain(w);
    }
  });

  it('strengths and supports do not change with the date; the chapter changes only with the period', () => {
    for (const p of PEOPLE) {
      const a = setsFor(p, DATES[0]);
      const b = setsFor(p, DATES[1]);
      expect(a.strengths.map((g) => g.contentHash)).toEqual(b.strengths.map((g) => g.contentHash));
      expect(a.challenges.map((g) => g.contentHash)).toEqual(b.challenges.map((g) => g.contentHash));
      const sameKey = a.chapter[0].genKey === b.chapter[0].genKey;
      if (sameKey) expect(a.chapter[0].contentHash).toBe(b.chapter[0].contentHash);
    }
  });

  it('two people with the same strength planet still get different rates', () => {
    const byTheme = new Map<string, string[]>();
    for (const p of PEOPLE) {
      for (const g of setsFor(p, '2026-11-27').strengths) {
        const k = arc(g).theme!;
        byTheme.set(k, [...(byTheme.get(k) ?? []), JSON.stringify(rates(arc(g)))]);
      }
    }
    for (const list of byTheme.values()) expect(new Set(list).size).toBe(list.length);
  });

  it('a deep-rest support ends near 1 Hz; a focus support carries 40 Hz bursts', () => {
    for (const g of all) {
      const c = arc(g);
      if (c.theme === 'support:area-12') expect(c.movements[c.movements.length - 1].toHz).toBeLessThanOrEqual(1.2);
      if (c.theme === 'support:Mercury') expect(c.movements.some((m) => m.burst?.hz === 40)).toBe(true);
    }
  });
});
