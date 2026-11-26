/**
 * Feel must be clearly heard; the curated programs must fit their spaces;
 * the account merge rules must never lose a saved sound.
 */

import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { renderRecipe } from '../../src/sound/engine/audio/ambient/master';
import { analyzeChannels } from '../../src/sound/engine/audio/ambient/analysis';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';
import { GOAL_PROFILES } from '../../src/sound/engine/personalization/soundDna';
import { programsForSpace, SPACE_PROGRAM_RULES } from '../../src/sound/engine/domain/programs/curated';
import { mergeState, type SyncedState } from '../../src/sound/engine/state/syncState';

const SR = 22050;
type Ctx = globalThis.OfflineAudioContext;
const offline = (s: number) => new OfflineAudioContext(2, Math.round(SR * s), SR) as unknown as Ctx;
const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;

describe('Feel', () => {
  it('opposite corners of the pad sound clearly different', async () => {
    const r = recipe('soft-landing');
    const base = GOAL_PROFILES.relax.defaultDna;
    const warmCalm = { ...base, warmth: 1, brightness: 0, movement: 0, density: 0.05, rhythm: 0, spatiality: 0.95 };
    const brightLively = { ...base, warmth: 0, brightness: 1, movement: 1, density: 0.95, rhythm: 0.9, spatiality: 0.35 };
    const a = await renderRecipe(offline(30), r, warmCalm, { seconds: 30, seed: 'feel', shape: { energy: 0, texture: 0.5, space: 0.9 } });
    const b = await renderRecipe(offline(30), r, brightLively, { seconds: 30, seed: 'feel', shape: { energy: 1, texture: 0.5, space: 0.3 } });
    const ca = analyzeChannels(a.getChannelData(0), a.getChannelData(1), SR).centroidHz;
    const cb = analyzeChannels(b.getChannelData(0), b.getChannelData(1), SR).centroidHz;
    expect(cb / ca).toBeGreaterThan(1.6);
  }, 60000);
});

describe('curated programs', () => {
  it('each space offers a few programs from its catalog categories, each value at a suitable speed or as a tone', () => {
    (Object.keys(SPACE_PROGRAM_RULES) as Array<keyof typeof SPACE_PROGRAM_RULES>).forEach((space) => {
      const plans = programsForSpace(space);
      const rule = SPACE_PROGRAM_RULES[space];
      expect(plans.length, space).toBeGreaterThanOrEqual(3);
      expect(plans.length).toBeLessThanOrEqual(4);
      plans.forEach((p) => {
        expect([rule.category, rule.also]).toContain(p.category);
        expect(p.options.strategy).toBe('pulse');
        p.sequence.forEach((s) => {
          if (s.method === 'tone') {
            expect(rule.tones, `${space} plays tones`).toBe(true);
            expect(s.renderedHz).toBeLessThanOrEqual(1000);
          } else {
            expect(['swell', 'am']).toContain(s.method);
            expect(s.renderedHz).toBeLessThanOrEqual(rule.maxHz);
          }
        });
      });
    });
  });
});

describe('account merge', () => {
  const blank: SyncedState = {
    favorites: [],
    recents: [],
    sound_dna: null,
    feel: null,
    shape: null,
    program_prefs: null,
    programs_auto: null,
    updated_at: 0,
  };

  it('keeps every saved sound from both copies', () => {
    const m = mergeState({ ...blank, favorites: ['a', 'b'] }, { ...blank, favorites: ['b', 'c'] });
    expect(m.favorites.sort()).toEqual(['a', 'b', 'c']);
  });

  it('puts this device’s recents first and caps them at ten', () => {
    const local = { ...blank, recents: ['x', 'y'] };
    const remote = { ...blank, recents: Array.from({ length: 12 }, (_, i) => `r${i}`) };
    const m = mergeState(local, remote);
    expect(m.recents.slice(0, 2)).toEqual(['x', 'y']);
    expect(m.recents).toHaveLength(10);
  });

  it('takes preferences from the newer copy, falling back to the other', () => {
    const local = { ...blank, feel: { x: 0.1, y: 0.1 }, programs_auto: true, updated_at: 100 };
    const remote = { ...blank, feel: { x: -0.5, y: 0.5 }, updated_at: 200 };
    const m = mergeState(local, remote);
    expect(m.feel).toEqual({ x: -0.5, y: 0.5 });
    expect(m.programs_auto).toBe(true);
    expect(m.updated_at).toBe(200);
  });

  it('returns this device unchanged when the account is empty', () => {
    const local = { ...blank, favorites: ['a'] };
    expect(mergeState(local, null)).toBe(local);
  });
});
