/**
 * Wellness techniques, measured on real offline renders of the music:
 * pulses at their stated rate, breaths at their stated pace and depth,
 * nothing clips, and switching off really is off.
 */

import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { renderRecipe } from '../../src/sound/engine/audio/ambient/master';
import { analyzeChannels, envelopeModulationRate } from '../../src/sound/engine/audio/ambient/analysis';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';
import { GOAL_PROFILES } from '../../src/sound/engine/personalization/soundDna';
import { TECHNIQUES, techniqueById, techniquesFor } from '../../src/sound/engine/domain/wellness/techniques';
import { PROGRAM_NAMES, programTechniquesFor } from '../../src/sound/engine/domain/wellness/programTechniques';
import type { Intent } from '../../src/sound/engine/types/index';
import { WellnessLayer } from '../../src/sound/engine/audio/wellness/layer';

const SR = 22050;
type Ctx = globalThis.OfflineAudioContext;
const offline = (s: number) => new OfflineAudioContext(2, Math.round(SR * s), SR) as unknown as Ctx;
const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;
const t = (id: string) => techniqueById(id)!;

async function render(recipeId: string, techniqueId: string | null, seconds: number) {
  const r = recipe(recipeId);
  return renderRecipe(offline(seconds), r, GOAL_PROFILES[r.intent].defaultDna, {
    seconds,
    seed: 'wellness',
    technique: techniqueId ? t(techniqueId) : undefined,
  });
}

/** RMS in dB per window of `win` seconds. */
function rmsTrack(x: Float32Array, win: number, from: number, to: number): number[] {
  const n = Math.round(win * SR);
  const out: number[] = [];
  for (let s = Math.round(from * SR); s + n <= Math.round(to * SR); s += n) {
    let e = 0;
    for (let i = s; i < s + n; i++) e += x[i] * x[i];
    out.push(10 * Math.log10(e / n + 1e-12));
  }
  return out;
}

describe('technique catalog', () => {
  const SPACES: Intent[] = ['focus', 'relax', 'sleep', 'meditate', 'energy', 'balance', 'recover'];

  it('every space has Frequency programs (cycling catalog frequencies) and techniques', () => {
    SPACES.forEach((space) => {
      const programs = programTechniquesFor(space);
      expect(programs.length, space).toBeGreaterThanOrEqual(2);
      programs.forEach((p) => {
        expect(p.pulse!.sequence!.length).toBeGreaterThanOrEqual(3);
        expect(p.programId).toBeTruthy();
        // Never the catalog's effect-style name in the app.
        expect(PROGRAM_NAMES[p.programId!], `${p.programId} needs an app name`).toBe(p.name);
      });
      expect(techniquesFor(space).length, space).toBeGreaterThanOrEqual(3);
    });
  });

  it('includes the Schumann resonance and keeps copy free of health promises', () => {
    expect(TECHNIQUES.some((x) => x.pulse?.hz === 7.83)).toBe(true);
    const banned = /\b(cure|cures|heal|heals|treats?|reduces? stress|improves?|induces?|guarantee)/i;
    TECHNIQUES.forEach((x) => {
      expect(x.what).not.toMatch(banned);
      expect(x.benefit).not.toMatch(banned);
      expect(x.background).not.toMatch(banned);
    });
  });
});

describe('pulse techniques (real renders)', () => {
  for (const [id, song] of [
    ['focus-pulse', 'quiet-momentum'],
    ['gamma-40', 'quiet-momentum'],
    ['earth-pulse', 'soft-landing'],
    ['theta-6', 'soft-landing'],
  ] as const) {
    it(`${id} modulates the music at ${t(id).pulse!.hz} Hz`, async () => {
      const hz = t(id).pulse!.hz;
      const buf = await render(song, id, 14);
      const rate = envelopeModulationRate(buf.getChannelData(0), SR, 6, 14, hz * 0.75, hz * 1.25, 0.02);
      expect(Math.abs(rate - hz)).toBeLessThan(0.15);
      expect(analyzeChannels(buf.getChannelData(0), buf.getChannelData(1), SR).clippedSamples).toBe(0);
    }, 60000);
  }

  it('without a technique the music has no such pulse', async () => {
    const buf = await render('quiet-momentum', null, 14);
    const on = await render('quiet-momentum', 'focus-pulse', 14);
    const strength = (b: AudioBuffer) => {
      const env = rmsTrack(b.getChannelData(0), 1 / 200, 6, 14);
      // Share of envelope energy at 16 Hz.
      let re = 0;
      let im = 0;
      const mean = env.reduce((a, c) => a + c, 0) / env.length;
      env.forEach((v, n) => {
        re += (v - mean) * Math.cos((2 * Math.PI * 16 * n) / 200);
        im -= (v - mean) * Math.sin((2 * Math.PI * 16 * n) / 200);
      });
      return Math.hypot(re, im);
    };
    expect(strength(on)).toBeGreaterThan(strength(buf) * 4);
  }, 60000);
});

describe('Frequency programs (real renders)', () => {
  it('step through their frequencies in order, in the music itself', async () => {
    const base = programTechniquesFor('relax')[0];
    const t = {
      ...base,
      pulse: { ...base.pulse!, hz: 7.6, sequence: [{ hz: 7.6, seconds: 8, depth: 0.24 }, { hz: 3, seconds: 8, depth: 0.3 }] },
    };
    const r = recipe('soft-landing');
    const buf = await renderRecipe(offline(16), r, GOAL_PROFILES.relax.defaultDna, { seconds: 16, seed: 'seq', technique: t });
    const x = buf.getChannelData(0);
    expect(Math.abs(envelopeModulationRate(x, SR, 2, 7.5, 5, 10, 0.02) - 7.6)).toBeLessThan(0.2);
    expect(Math.abs(envelopeModulationRate(x, SR, 12.5, 16, 2, 4.5, 0.02) - 3)).toBeLessThan(0.25);
  }, 60000);
});

describe('frequency program tones (real renders)', () => {
  /** Power at one frequency (Goertzel) over a window. */
  const power = (x: Float32Array, hz: number, from: number, to: number) => {
    const k = (2 * Math.PI * hz) / SR;
    let s1 = 0;
    let s2 = 0;
    for (let i = Math.round(from * SR); i < Math.round(to * SR); i++) {
      const s0 = x[i] + 2 * Math.cos(k) * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return s1 * s1 + s2 * s2 - 2 * Math.cos(k) * s1 * s2;
  };

  it('a catalog value above the pulse range sounds as a soft tone at exactly that pitch', async () => {
    const base = programTechniquesFor('recover')[0];
    const t = { ...base, pulse: { ...base.pulse!, hz: 1, depth: 0, sequence: [{ hz: 272, seconds: 20, depth: 0, tone: true }] } };
    const r = recipe('slow-tide');
    const dna = GOAL_PROFILES.recover.defaultDna;
    const on = await renderRecipe(offline(12), r, dna, { seconds: 12, seed: 'tone', technique: t });
    const off = await renderRecipe(offline(12), r, dna, { seconds: 12, seed: 'tone' });
    const ratio = power(on.getChannelData(0), 272, 6, 12) / power(off.getChannelData(0), 272, 6, 12);
    expect(ratio).toBeGreaterThan(10);
    expect(analyzeChannels(on.getChannelData(0), on.getChannelData(1), SR).clippedSamples).toBe(0);
  }, 60000);
});

describe('breath techniques (real renders)', () => {
  it('long exhale: the music swells every ten seconds by several dB', async () => {
    const buf = await render('soft-landing', 'long-exhale', 42);
    const track = rmsTrack(buf.getChannelData(0), 0.25, 10, 42);
    // Period by autocorrelation over 6–16 s.
    const lagOf = (sec: number) => Math.round(sec / 0.25);
    let best = 0;
    let bestR = -Infinity;
    for (let lag = lagOf(6); lag <= lagOf(16); lag++) {
      let r = 0;
      for (let i = 0; i + lag < track.length; i++) r += track[i] * track[i + lag];
      r /= track.length - lag;
      if (r > bestR) {
        bestR = r;
        best = lag * 0.25;
      }
    }
    expect(Math.abs(best - 10)).toBeLessThan(1);
    const sorted = [...track].sort((a, b) => a - b);
    const swing = sorted[Math.floor(sorted.length * 0.9)] - sorted[Math.floor(sorted.length * 0.1)];
    expect(swing).toBeGreaterThan(3);
  }, 90000);

  it('breath state follows the pattern, and slowing breath slows down', () => {
    const ctx = offline(1);
    const src = ctx.createGain();
    const layer = new WellnessLayer(ctx, { send: src, dest: ctx.destination }, t('four-seven-eight'), 0, 1);
    layer.scheduleUntil(60);
    expect(layer.breathAt(2)!.phase).toBe('in');
    expect(layer.breathAt(8)!.phase).toBe('hold');
    expect(layer.breathAt(8)!.value).toBeCloseTo(1, 2);
    expect(layer.breathAt(15)!.phase).toBe('out');

    const slow = new WellnessLayer(ctx, { send: src, dest: ctx.destination }, t('slowing-breath'), 0, 1);
    for (let x = 60; x <= 1500; x += 60) slow.scheduleUntil(x);
    const cycleAt = (sec: number) => {
      const s = slow.breathAt(sec)!;
      return s; // phase exists at any time
    };
    expect(cycleAt(5).phase).toBeDefined();
    // Early cycles are 10 s; after twenty minutes they are 15 s.
    const early = (slow as unknown as { segments: Array<{ start: number; end: number; phase: string }> }).segments;
    const inhales = early.filter((s) => s.phase === 'in');
    const last = inhales[inhales.length - 1];
    // After twenty minutes the 4 s inhale has stretched to 6 s.
    expect(last.end - last.start).toBeCloseTo(6, 1);
  });

  it('delta drift glides from 4 Hz towards 1 Hz', () => {
    const ctx = offline(1);
    const layer = new WellnessLayer(ctx, { send: ctx.createGain(), dest: ctx.destination }, t('delta-drift'), 0, 1);
    expect(layer.pulseHz(0)).toBeCloseTo(4, 1);
    expect(layer.pulseHz(900)).toBeGreaterThan(2);
    expect(layer.pulseHz(900)).toBeLessThan(3);
    expect(layer.pulseHz(2000)).toBeCloseTo(1, 1);
  });
});
