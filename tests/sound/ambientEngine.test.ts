/**
 * Real-engine audio tests: every assertion here renders the actual composer and
 * master chain through an OfflineAudioContext (node-web-audio-api).
 */

import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';
import { GOAL_PROFILES } from '../../src/sound/engine/personalization/soundDna';
import { type OfflineRenderOptions, renderRecipe } from '../../src/sound/engine/audio/ambient/master';
import { analyzeChannels } from '../../src/sound/engine/audio/ambient/analysis';
import { Composer } from '../../src/sound/engine/audio/ambient/composer';
import { SOUND_WORLDS, worldForRecipe } from '../../src/sound/engine/audio/ambient/worlds';
import { buildChord, voiceChord } from '../../src/sound/engine/audio/ambient/theory';
import { SeededRNG } from '../../src/sound/engine/lib/rng';

const SR = 22050;
const FLAGSHIPS = ['quiet-momentum', 'soft-landing', 'night-current', 'open-space'];

type Ctx = globalThis.OfflineAudioContext;
const offline = (seconds: number) => new OfflineAudioContext(2, SR * seconds, SR) as unknown as Ctx;

async function render(id: string, seconds: number, extra: Partial<OfflineRenderOptions> = {}) {
  const recipe = RECIPES.find((r) => r.id === id)!;
  const buf = await renderRecipe(offline(seconds), recipe, GOAL_PROFILES[recipe.intent].defaultDna, {
    seconds,
    seed: `${id}-test`,
    ...extra,
  });
  return buf;
}

/** 12-bin pitch-class energy profile of a buffer (mid channel). */
function chroma(buf: AudioBuffer): number[] {
  const L = buf.getChannelData(0);
  const N = 8192;
  const out = new Array(12).fill(0);
  for (let s = SR * 4; s + N <= L.length; s += N * 2) {
    for (let k = 1; k < N / 2; k++) {
      const f = (k * SR) / N;
      if (f < 60 || f > 2000) continue;
      let re = 0;
      let im = 0;
      // Goertzel-free DFT bin (sparse frames keep this cheap enough)
      for (let i = 0; i < N; i += 4) {
        const a = (2 * Math.PI * k * i) / N;
        re += L[s + i] * Math.cos(a);
        im -= L[s + i] * Math.sin(a);
      }
      const midi = Math.round(69 + 12 * Math.log2(f / 440));
      out[((midi % 12) + 12) % 12] += re * re + im * im;
    }
    break; // one frame is enough for a profile
  }
  const sum = out.reduce((a, b) => a + b, 0) || 1;
  return out.map((v) => v / sum);
}

describe('harmonic grammar', () => {
  it('never voices minor-ninth colour tones', () => {
    Object.values(SOUND_WORLDS).forEach((w) => {
      w.palette.forEach((choice) => {
        const chord = buildChord(w.key.tonicPc, w.key.mode, choice);
        chord.pcs.slice(1).forEach((pc) => {
          expect((pc - chord.rootPc + 12) % 12).not.toBe(1);
        });
      });
    });
  });

  it('voice-leads smoothly between chords', () => {
    const w = SOUND_WORLDS['soft-landing'];
    const rng = new SeededRNG('vl');
    let prev: number[] | null = null;
    for (const choice of [...w.palette, ...w.palette]) {
      const chord = buildChord(w.key.tonicPc, w.key.mode, choice);
      const v = voiceChord(chord, 5, w.pad.low, w.pad.high, prev, rng);
      expect(v.length).toBe(5);
      v.forEach((m) => expect(chord.pcs).toContain(m % 12));
      if (prev) {
        const a = [...prev].sort((x, y) => x - y);
        const b = [...v].sort((x, y) => x - y);
        const move = a.reduce((acc, m, i) => acc + Math.abs(m - b[i]), 0);
        expect(move / 5).toBeLessThanOrEqual(4); // average voice moves ≤ a major third
      }
      prev = v;
    }
  });

  it('every recipe resolves to an authored world', () => {
    RECIPES.forEach((r) => expect(SOUND_WORLDS[r.id] ?? worldForRecipe(r)).toBeDefined());
    RECIPES.forEach((r) => expect(SOUND_WORLDS[r.id]).toBeDefined());
  });
});

describe('flagship renders (real engine)', () => {
  for (const id of FLAGSHIPS) {
    it(`${id}: musical, clean and safe`, async () => {
      const full = await render(id, 30);
      const tonal = await render(id, 30, { tonalOnly: true });
      const a = analyzeChannels(full.getChannelData(0), full.getChannelData(1), SR);
      const t = analyzeChannels(tonal.getChannelData(0), tonal.getChannelData(1), SR);

      expect(a.clippedSamples).toBe(0);
      expect(a.peakDb).toBeLessThan(-1);
      expect(a.rmsDb).toBeGreaterThan(-30); // clearly audible
      expect(a.rmsDb).toBeLessThan(-12); // comfortable
      expect(Math.abs(a.dcOffset)).toBeLessThan(0.002);
      expect(a.highShare).toBeLessThan(0.05); // no hiss
      expect(a.flatness).toBeLessThan(0.1); // tonal, not noise
      expect(a.loudnessRangeDb).toBeLessThan(14); // no jump scares
      // Hard gate: with every noise/texture bus muted, the music is still all there.
      expect(t.rms / a.rms).toBeGreaterThan(0.9);
    }, 60000);
  }

  it('flagships are harmonically distinct from one another', async () => {
    const profiles = await Promise.all(FLAGSHIPS.map(async (id) => chroma(await render(id, 12))));
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const dot = profiles[i].reduce((acc, v, k) => acc + v * profiles[j][k], 0);
        const ni = Math.hypot(...profiles[i]);
        const nj = Math.hypot(...profiles[j]);
        expect(dot / (ni * nj)).toBeLessThan(0.97);
      }
    }
  }, 120000);

  it('renders a Studio world override instead of the authored world', async () => {
    const authored = SOUND_WORLDS['soft-landing'];
    const muted = structuredClone(authored);
    muted.pad.level = 0;
    muted.bass.level = 0;
    muted.keys.level = 0;
    muted.bells.level = 0;
    muted.shimmer.level = 0;
    const base = await render('soft-landing', 8);
    const over = await render('soft-landing', 8, { world: muted });
    const a = analyzeChannels(base.getChannelData(0), base.getChannelData(1), SR);
    const b = analyzeChannels(over.getChannelData(0), over.getChannelData(1), SR);
    expect(b.rms).toBeLessThan(a.rms * 0.1);
    expect(authored.pad.level).toBeGreaterThan(0); // the authored world is untouched
  }, 60000);
});

describe('composer lifecycle', () => {
  it('is deterministic for a given seed', async () => {
    const a = await render('soft-landing', 8);
    const b = await render('soft-landing', 8);
    const A = a.getChannelData(0);
    const B = b.getChannelData(0);
    let diff = 0;
    for (let i = 0; i < A.length; i += 7) diff = Math.max(diff, Math.abs(A[i] - B[i]));
    expect(diff).toBeLessThan(1e-4);
  }, 30000);

  it('keeps event density bounded over a long session and stops cleanly', () => {
    const ctx = offline(1);
    const out = ctx.createGain();
    const recipe = RECIPES.find((r) => r.id === 'quiet-momentum')!;
    const c = new Composer(ctx, worldForRecipe(recipe), {
      harmony: out,
      motif: out,
      environment: out,
      modulation: out,
      space: out,
    }, {
      seed: 'long',
      dna: GOAL_PROFILES.focus.defaultDna,
      shape: { energy: 0.5, texture: 0.5, space: 0.5 },
      mode: 'ambient',
      startAt: 0,
    });
    c.scheduleUntil(30 * 60); // 30 minutes of score
    const voices = (c as unknown as { voices: Set<unknown> }).voices.size;
    expect(voices).toBeGreaterThan(200); // it keeps composing…
    expect(voices / 30).toBeLessThan(260); // …at a calm rate (< ~4 events/s incl. pulse)
    c.stop(1);
    c.scheduleUntil(40 * 60);
    expect((c as unknown as { voices: Set<unknown> }).voices.size).toBe(voices); // nothing new after stop
    c.dispose();
  });
});
