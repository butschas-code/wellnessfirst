/**
 * Frequency programs — catalog integrity, adaptation policy and DSP proof.
 * DSP assertions render the real FrequencyLayer / composer offline and measure
 * the output. They prove the signal is present and correct, nothing more:
 * they say nothing about wellness effects.
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { OfflineAudioContext } from 'node-web-audio-api';
import { catalog, catalogRef, planForId, programById } from '../../src/sound/engine/domain/programs/catalog';
import { POLICY, controlPlanFor, planFor, resolveStep } from '../../src/sound/engine/domain/programs/adaptationPolicy';
import { FrequencyLayer, layerLevel } from '../../src/sound/engine/audio/frequency/layer';
import { MUSIC_BUSES, renderRecipe } from '../../src/sound/engine/audio/ambient/master';
import { analyzeChannels, envelopeModulationRate } from '../../src/sound/engine/audio/ambient/analysis';
import { arcAt } from '../../src/sound/engine/audio/ambient/arcs';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';
import { GOAL_PROFILES } from '../../src/sound/engine/personalization/soundDna';
import type { RenderPlan } from '../../src/sound/engine/domain/programs/types';

const SR = 22050;
type Ctx = globalThis.OfflineAudioContext;
const offline = (s: number) => new OfflineAudioContext(2, Math.round(SR * s), SR) as unknown as Ctx;
const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;
const dnaFor = (id: string) => GOAL_PROFILES[recipe(id).intent].defaultDna;

/** Renders only the frequency layer, starting at a given step of the plan. */
async function renderLayer(plan: RenderPlan, seconds: number, startStep = 0, intensity = 0.6) {
  const ctx = offline(seconds);
  const layer = new FrequencyLayer(ctx, ctx.destination, plan, { tonicPc: 3, intensity, startAt: 0, startStep, fadeIn: 0.05 });
  layer.scheduleUntil(seconds);
  return ctx.startRendering();
}

const modulationRate = (x: Float32Array, from: number, to: number, lo: number, hi: number) =>
  envelopeModulationRate(x, SR, from, to, lo, hi);

/** Strongest spectral peak (Hz) of a channel between lo and hi, via a fine DFT. */
function peakHz(x: Float32Array, from: number, to: number, lo: number, hi: number, step = 0.02): number {
  const a0 = Math.round(from * SR);
  const n = Math.round((to - from) * SR);
  let best = lo;
  let bestP = -1;
  for (let f = lo; f <= hi; f += step) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * f) / SR;
    for (let i = 0; i < n; i += 2) {
      re += x[a0 + i] * Math.cos(w * i);
      im -= x[a0 + i] * Math.sin(w * i);
    }
    const p = re * re + im * im;
    if (p > bestP) {
      bestP = p;
      best = f;
    }
  }
  return best;
}

describe('canonical catalog (source of truth)', () => {
  const c = catalog();

  it('holds all 105 programs in the ten source categories, nothing dropped', () => {
    expect(c.programs).toHaveLength(105);
    expect(c.categories).toHaveLength(10);
    expect(c.importIssues).toEqual([]);
    c.categories.forEach((cat) => {
      expect(c.programs.filter((p) => p.category === cat.name)).toHaveLength(cat.declaredProgramCount);
    });
    expect(new Set(c.programs.map((p) => p.id)).size).toBe(105);
  });

  it('preserves every ordered value exactly as written', () => {
    let values = 0;
    c.programs.forEach((p) => {
      expect(p.frequencies).toHaveLength(p.frequencyCount);
      p.frequencies.forEach((f, i) => {
        expect(f.index).toBe(i);
        expect(Number(f.raw)).toBe(f.hz);
        expect(f.hz).toBeGreaterThan(0);
      });
      values += p.frequencies.length;
    });
    expect(values).toBe(1224);
    expect(programById('rela_001')!.frequencies.map((f) => f.raw).join(', ')).toBe('0.2, 0.25, 0.78, 2.65, 4.17, 7.6, 15, 21, 55');
    expect(programById('rela_001')!.name).toBe('Deep Calm & Nervous Ease');
  });

  it('matches the owner workbook checksum when the workbook is available', () => {
    const wb = path.resolve(__dirname, '../../PEMF_105_Wellness_Catalog_v2.xlsx');
    if (!fs.existsSync(wb)) return; // CI without the proprietary workbook: the generated artifact is authoritative
    const sha = crypto.createHash('sha256').update(fs.readFileSync(wb)).digest('hex');
    expect(c.source.sha256).toBe(sha);
  });
});

describe('adaptation policy', () => {
  const pulse = { strategy: 'pulse' as const, includeTones: false, stepSeconds: 60 };
  const bin = { ...pulse, strategy: 'binaural' as const };

  it.each([
    [0.05, pulse, 'swell'],
    [0.49, pulse, 'swell'],
    [0.5, pulse, 'am'],
    [7.83, pulse, 'am'],
    [40, pulse, 'am'],
    [40.5, pulse, 'skipped'],
    [528, { ...pulse, includeTones: true }, 'tone'],
    [1000, { ...pulse, includeTones: true }, 'tone'],
    [1950.5, { ...pulse, includeTones: true }, 'skipped'],
    [0.3, bin, 'swell'],
    [4.17, bin, 'binaural'],
    [30, bin, 'binaural'],
    [35, bin, 'skipped'],
  ])('%s Hz → %s', (hz, opts, method) => {
    const r = resolveStep(hz, opts);
    expect(r.method).toBe(method);
    if (method === 'skipped') expect(r.reason).toBeTruthy();
  });

  it('eases AM depth above the roughness threshold', () => {
    expect(resolveStep(10, pulse).depth).toBe(POLICY.amDepth);
    expect(resolveStep(39, pulse).depth).toBeLessThan(POLICY.amDepth * 0.5);
  });

  it('is deterministic, ordered and explains every skipped value', () => {
    const a = planForId('rela_001')!;
    const b = planForId('rela_001')!;
    expect(a).toEqual(b);
    expect(a.steps.map((s) => s.sourceIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a.sequence.map((s) => s.sourceHz)).toEqual([0.2, 0.25, 0.78, 2.65, 4.17, 7.6, 15, 21]);
    expect(a.steps[8]).toMatchObject({ sourceHz: 55, method: 'skipped' });
    a.sequence.forEach((s, i) => expect(s.startSeconds).toBe(i * 60));
    expect(a.catalog.sha256).toBe(catalog().source.sha256);
  });

  it('reports which programs cannot be rendered without tones, and none with them', () => {
    const noTones = catalog().programs.filter((p) => !planFor(p, catalogRef()).renderable);
    const withTones = catalog().programs.filter((p) => !planFor(p, catalogRef(), { includeTones: true }).renderable);
    expect(noTones.length).toBe(19);
    expect(withTones.length).toBe(0);
  });

  it('builds a matched control arm: same shape, different rates', () => {
    const plan = planForId('rela_001')!;
    const ctrl = controlPlanFor(plan);
    expect(ctrl.arm).toBe('control');
    expect(ctrl.sequence.map((s) => s.method)).toEqual([...plan.sequence].reverse().map((s) => s.method));
    expect(ctrl.sequence.map((s) => s.durationSeconds)).toEqual(plan.sequence.map((s) => s.durationSeconds));
    ctrl.sequence.forEach((s, i) => {
      const original = [...plan.sequence].reverse()[i];
      expect(s.renderedHz).not.toBe(original.renderedHz);
    });
  });
});

describe('frequency layer DSP (real offline renders)', () => {
  it('rela_001 step 6 modulates the drone at its literal 7.6 Hz', async () => {
    const plan = planForId('rela_001', { stepSeconds: 20 })!;
    const buf = await renderLayer(plan, 20, 5);
    expect(modulationRate(buf.getChannelData(0), 4, 20, 2, 30)).toBeCloseTo(7.6, 1);
  }, 60000);

  it('rela_001 step 3 renders the 0.78 Hz pulse', async () => {
    const plan = planForId('rela_001', { stepSeconds: 30 })!;
    const buf = await renderLayer(plan, 30, 2);
    expect(Math.abs(modulationRate(buf.getChannelData(0), 5, 30, 0.3, 3) - 0.78)).toBeLessThan(0.03);
  }, 60000);

  it('a program from another category (focu_038) renders its own rates', async () => {
    const plan = planForId('focu_038', { stepSeconds: 20 })!;
    const amStep = plan.sequence.findIndex((s) => s.method === 'am' && s.renderedHz > 2 && s.renderedHz < 20);
    expect(amStep).toBeGreaterThanOrEqual(0);
    const target = plan.sequence[amStep].renderedHz;
    const buf = await renderLayer(plan, 20, amStep);
    expect(Math.abs(modulationRate(buf.getChannelData(0), 4, 20, 1, 30) - target) / target).toBeLessThan(0.02);
  }, 60000);

  it('follows a multi-step sequence: every step measures at its own rate, with no carrier beating', async () => {
    const plan = planForId('rela_001', { stepSeconds: 20 })!;
    const buf = await renderLayer(plan, 80, 2); // 0.78 → 2.65 → 4.17 → 7.6 Hz
    const x = buf.getChannelData(0);
    [0.78, 2.65, 4.17, 7.6].forEach((hz, i) => {
      const measured = modulationRate(x, i * 20 + 5, (i + 1) * 20, 0.3, 25);
      expect(Math.abs(measured - hz) / hz).toBeLessThan(0.03);
    });
  }, 120000);

  it('binaural: left and right carriers differ by the step value', async () => {
    const plan = planForId('rela_001', { strategy: 'binaural', stepSeconds: 20 })!;
    const step = plan.sequence.findIndex((s) => s.sourceHz === 4.17);
    const buf = await renderLayer(plan, 20, step);
    const l = peakHz(buf.getChannelData(0), 5, 20, 150, 420, 0.5);
    const r = peakHz(buf.getChannelData(1), 5, 20, 150, 420, 0.5);
    const fl = peakHz(buf.getChannelData(0), 5, 20, l - 1, l + 1);
    const fr = peakHz(buf.getChannelData(1), 5, 20, r - 6, r + 6);
    expect(Math.abs(fr - fl - 4.17)).toBeLessThan(0.08);
  }, 60000);

  it('step transitions are click-free and the layer never clips', async () => {
    const plan = planForId('rela_001', { stepSeconds: 20, includeTones: true })!;
    const buf = await renderLayer(plan, 46, 6, 1); // 15 Hz → 21 Hz → 55 Hz tone
    const x = buf.getChannelData(0);
    let maxDelta = 0;
    let peak = 0;
    for (let i = 1; i < x.length; i++) {
      maxDelta = Math.max(maxDelta, Math.abs(x[i] - x[i - 1]));
      peak = Math.max(peak, Math.abs(x[i]));
    }
    expect(peak).toBeLessThan(0.5);
    expect(maxDelta).toBeLessThan(0.05);
  }, 60000);

  it('off means off: with the frequency bus muted the music is sample-identical', async () => {
    const r = recipe('soft-landing');
    const plan = planForId('rela_001', { stepSeconds: 10 })!;
    const a = await renderRecipe(offline(12), r, dnaFor('soft-landing'), { seconds: 12, seed: 'ab' });
    const b = await renderRecipe(offline(12), r, dnaFor('soft-landing'), {
      seconds: 12,
      seed: 'ab',
      program: { plan, intensity: 0.6 },
      busGains: { frequency: 0 },
    });
    const c = await renderRecipe(offline(12), r, dnaFor('soft-landing'), { seconds: 12, seed: 'ab', program: { plan, intensity: 0.6 } });
    const A = a.getChannelData(0);
    const B = b.getChannelData(0);
    const C = c.getChannelData(0);
    let diffOff = 0;
    let diffOn = 0;
    for (let i = 0; i < A.length; i++) {
      diffOff = Math.max(diffOff, Math.abs(A[i] - B[i]));
      diffOn = Math.max(diffOn, Math.abs(A[i] - C[i]));
    }
    expect(diffOff).toBe(0);
    expect(diffOn).toBeGreaterThan(0.001);
  }, 60000);

  it('music + program at maximum intensity stays clean and the layer stays below the music', async () => {
    const r = recipe('quiet-momentum');
    const plan = planForId('rela_001', { stepSeconds: 10, includeTones: true })!;
    const both = await renderRecipe(offline(30), r, dnaFor('quiet-momentum'), { seconds: 30, seed: 'max', program: { plan, intensity: 1 } });
    const off = Object.fromEntries(MUSIC_BUSES.map((b) => [b, 0]));
    const layer = await renderRecipe(offline(30), r, dnaFor('quiet-momentum'), {
      seconds: 30,
      seed: 'max',
      program: { plan, intensity: 1 },
      busGains: off,
    });
    const music = await renderRecipe(offline(30), r, dnaFor('quiet-momentum'), { seconds: 30, seed: 'max' });
    const s = analyzeChannels(both.getChannelData(0), both.getChannelData(1), SR);
    const l = analyzeChannels(layer.getChannelData(0), layer.getChannelData(1), SR);
    const m = analyzeChannels(music.getChannelData(0), music.getChannelData(1), SR);
    expect(s.clippedSamples).toBe(0);
    expect(s.peakDb).toBeLessThan(-1);
    expect(l.rmsDb).toBeLessThan(m.rmsDb - 4);
    expect(layerLevel(0)).toBeLessThan(layerLevel(1));
  }, 90000);
});

describe('session arcs and personalisation', () => {
  it('unwind moves Arrival → Release → Settling → Stillness without steps', () => {
    const phases: string[] = [];
    let prev = arcAt('unwind', 0);
    for (let m = 0; m <= 60; m += 0.5) {
      const p = arcAt('unwind', m);
      if (phases[phases.length - 1] !== p.phase) phases.push(p.phase);
      expect(p.intensityCap).toBeLessThanOrEqual(prev.intensityCap + 1e-9);
      expect(Math.abs(p.density - prev.density)).toBeLessThan(0.03);
      expect(Math.abs(p.events - prev.events)).toBeLessThan(0.04);
      prev = p;
    }
    expect(phases).toEqual(['Arrival', 'Release', 'Settling', 'Stillness']);
    expect(arcAt('steady', 90)).toMatchObject({ intensityCap: 1, density: 1, events: 1 });
  });

  it('checkpoints at 0, 10, 30 and 60 minutes darken an Unwind session gradually', async () => {
    const r = recipe('soft-landing');
    const centroids: number[] = [];
    for (const minutes of [0, 10, 30, 60]) {
      const b = await renderRecipe(offline(40), r, dnaFor('soft-landing'), { seconds: 40, seed: 'arc', arcOffsetMinutes: minutes });
      centroids.push(analyzeChannels(b.getChannelData(0), b.getChannelData(1), SR).centroidHz);
    }
    expect(centroids[3]).toBeLessThan(centroids[0]);
    for (let i = 1; i < centroids.length; i++) expect(Math.abs(centroids[i] - centroids[i - 1]) / centroids[i - 1]).toBeLessThan(0.35);
  }, 120000);

  it('two Sound DNA profiles on the same seed sound measurably different', async () => {
    const r = recipe('soft-landing');
    const warm = { ...dnaFor('soft-landing'), warmth: 0.95, brightness: 0.15, spatiality: 0.4 };
    const open = { ...dnaFor('soft-landing'), warmth: 0.3, brightness: 0.9, spatiality: 0.9 };
    const a = await renderRecipe(offline(30), r, warm, { seconds: 30, seed: 'dna' });
    const b = await renderRecipe(offline(30), r, open, { seconds: 30, seed: 'dna' });
    const ca = analyzeChannels(a.getChannelData(0), a.getChannelData(1), SR).centroidHz;
    const cb = analyzeChannels(b.getChannelData(0), b.getChannelData(1), SR).centroidHz;
    expect(cb / ca).toBeGreaterThan(1.15);
  }, 60000);

  it('Focus masking is optional, independent and stays out of hiss territory', async () => {
    const r = recipe('quiet-momentum');
    const base = { energy: 0.5, texture: 0.5, space: 0.5 };
    const off = await renderRecipe(offline(30), r, dnaFor('quiet-momentum'), { seconds: 30, seed: 'm', shape: base });
    const on = await renderRecipe(offline(30), r, dnaFor('quiet-momentum'), { seconds: 30, seed: 'm', shape: { ...base, masking: 1 } });
    const a = analyzeChannels(off.getChannelData(0), off.getChannelData(1), SR);
    const b = analyzeChannels(on.getChannelData(0), on.getChannelData(1), SR);
    expect(b.rmsDb - a.rmsDb).toBeGreaterThan(1.5);
    expect(b.highShare).toBeLessThan(0.05);
    expect(b.clippedSamples).toBe(0);
  }, 60000);
});
