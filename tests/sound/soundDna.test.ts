import { describe, it, expect } from 'vitest';
import { DEFAULT_SOUND_DNA, SoundDnaService } from '../../src/sound/engine/personalization/soundDna';
import { CalibrationService } from '../../src/sound/engine/personalization/calibration';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';

describe('Sound DNA & Calibration Personalization', () => {
  it('provides valid default 8-axis sound DNA profile', () => {
    expect(DEFAULT_SOUND_DNA.warmth).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SOUND_DNA.warmth).toBeLessThanOrEqual(1);
    expect(DEFAULT_SOUND_DNA.brightness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SOUND_DNA.brightness).toBeLessThanOrEqual(1);
    expect(DEFAULT_SOUND_DNA.density).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SOUND_DNA.density).toBeLessThanOrEqual(1);
  });

  it('generates coherent human-centered descriptor summary', () => {
    const summary = SoundDnaService.getDescriptorSummary(DEFAULT_SOUND_DNA);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('resolves DNA within recipe artistic bounds', () => {
    const recipe = RECIPES[0];
    const extremeUserDna = {
      ...DEFAULT_SOUND_DNA,
      warmth: 0.05, // Below recipe min
      brightness: 0.99, // Above recipe max
    };

    const resolved = SoundDnaService.resolveForRecipe(recipe, extremeUserDna);
    expect(resolved.warmth).toBeGreaterThanOrEqual(recipe.dnaBounds.minWarmth);
    expect(resolved.warmth).toBeLessThanOrEqual(recipe.dnaBounds.maxWarmth);
    expect(resolved.brightness).toBeGreaterThanOrEqual(recipe.dnaBounds.minBrightness);
    expect(resolved.brightness).toBeLessThanOrEqual(recipe.dnaBounds.maxBrightness);
  });

  it('calculates calibrated Sound DNA deterministically from A/B responses', () => {
    const answers: Record<string, 'A' | 'B'> = {
      'calib-warmth': 'A',
      'calib-movement': 'B',
      'calib-density': 'A',
      'calib-nature': 'A',
      'calib-rhythm': 'B',
    };

    const calibrated = CalibrationService.calculateCalibratedDna(answers, DEFAULT_SOUND_DNA);
    expect(calibrated.warmth).toBe(0.85); // Option A override
    expect(calibrated.movement).toBe(0.8); // Option B override
    expect(calibrated.density).toBe(0.25); // Option A override
    expect(calibrated.nature).toBe(0.9); // Option A override
    expect(calibrated.rhythm).toBe(0.75); // Option B override
  });
});
