import { describe, it, expect } from 'vitest';
import { RECIPES } from '../../src/sound/engine/recipes/catalog';
import { SoundscapeRecipeSchema } from '../../src/sound/engine/recipes/schema';

describe('Soundscape Recipe Catalog & Schema Validation', () => {
  it('contains exactly 12 authoritative curated recipes', () => {
    expect(RECIPES).toHaveLength(21);
  });

  it('validates every recipe against strict Zod schema', () => {
    RECIPES.forEach((recipe) => {
      const result = SoundscapeRecipeSchema.safeParse(recipe);
      expect(result.success, `Recipe ${recipe.id} failed schema validation: ${JSON.stringify(result)}`).toBe(true);
    });
  });

  it('covers all 4 intents: focus, relax, sleep, meditate', () => {
    const intents = new Set(RECIPES.map((r) => r.intent));
    expect(intents.has('focus')).toBe(true);
    expect(intents.has('relax')).toBe(true);
    expect(intents.has('sleep')).toBe(true);
    expect(intents.has('meditate')).toBe(true);
  });

  it('covers all 4 sonic families: atmosphere, nature, flow, resonance', () => {
    const families = new Set(RECIPES.map((r) => r.family));
    expect(families.has('atmosphere')).toBe(true);
    expect(families.has('nature')).toBe(true);
    expect(families.has('flow')).toBe(true);
    expect(families.has('resonance')).toBe(true);
  });

  it('ensures all layer gains are safely bounded between 0.0 and 1.0', () => {
    RECIPES.forEach((recipe) => {
      recipe.layers.forEach((layer) => {
        expect(layer.baseGain).toBeGreaterThanOrEqual(0.0);
        expect(layer.baseGain).toBeLessThanOrEqual(1.0);
        expect(layer.reverbSend).toBeGreaterThanOrEqual(0.0);
        expect(layer.reverbSend).toBeLessThanOrEqual(1.0);
        expect(layer.delaySend).toBeGreaterThanOrEqual(0.0);
        expect(layer.delaySend).toBeLessThanOrEqual(1.0);
      });
    });
  });
});
