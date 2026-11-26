/**
 * Wellness Waves — Sound DNA & Personalization Engine
 * Manages 8-axis listener preferences, goal defaults, and human descriptors.
 * Complies with Phase 09 and Phase 24.
 */

import type { GoalProfile, Intent, SoundDNA, SoundscapeRecipe } from '../types/index';
import { Storage } from '../lib/storage';

export const DEFAULT_SOUND_DNA: SoundDNA = {
  warmth: 0.7,
  brightness: 0.45,
  density: 0.5,
  movement: 0.4,
  nature: 0.6,
  rhythm: 0.3,
  musicality: 0.65,
  spatiality: 0.6,
};

export const GOAL_PROFILES: Record<Intent, GoalProfile> = {
  focus: {
    id: 'focus',
    label: 'Focus',
    subtitle: 'Make space for what matters',
    description: 'Grounding, low-distraction soundscapes that mask environmental disruption and support sustained attention.',
    colorCue: 'Blue Mineral',
    accentHex: '#526E78',
    defaultDna: {
      warmth: 0.65,
      brightness: 0.5,
      density: 0.6,
      movement: 0.35,
      nature: 0.5,
      rhythm: 0.25,
      musicality: 0.6,
      spatiality: 0.5,
    },
  },
  relax: {
    id: 'relax',
    label: 'Unwind',
    subtitle: 'Let the day soften',
    description: 'Warm, decelerating acoustic textures for evening decompression and releasing sensory tension.',
    colorCue: 'Sage',
    accentHex: '#849C8B',
    defaultDna: {
      warmth: 0.8,
      brightness: 0.35,
      density: 0.45,
      movement: 0.4,
      nature: 0.7,
      rhythm: 0.3,
      musicality: 0.7,
      spatiality: 0.7,
    },
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep',
    subtitle: 'Settle into the night',
    description: 'Dark, enveloping sub-bass and heavy filtered noise designed to protect sleep continuity without startle peaks.',
    colorCue: 'Dusky Indigo',
    accentHex: '#454C6B',
    defaultDna: {
      warmth: 0.9,
      brightness: 0.15,
      density: 0.35,
      movement: 0.2,
      nature: 0.6,
      rhythm: 0.1,
      musicality: 0.4,
      spatiality: 0.5,
    },
  },
  meditate: {
    id: 'meditate',
    label: 'Stillness',
    subtitle: 'Listen inward',
    description: 'Spacious open harmonics and resonant Tibetan singing bowls that create a quiet field for breath and reflection.',
    colorCue: 'Mauve Clay',
    accentHex: '#947E76',
    defaultDna: {
      warmth: 0.75,
      brightness: 0.4,
      density: 0.3,
      movement: 0.3,
      nature: 0.4,
      rhythm: 0.1,
      musicality: 0.85,
      spatiality: 0.85,
    },
  },
  energy: {
    id: 'energy',
    label: 'Energy',
    subtitle: 'Get moving',
    description: 'Bright, rhythmic soundscapes with a lift, for mornings, movement and training.',
    colorCue: 'Fresh Green',
    accentHex: '#8CFFB3',
    defaultDna: { warmth: 0.45, brightness: 0.7, density: 0.65, movement: 0.7, nature: 0.35, rhythm: 0.75, musicality: 0.7, spatiality: 0.4 },
  },
  balance: {
    id: 'balance',
    label: 'Balance',
    subtitle: 'Find your middle',
    description: 'Warm, even, consonant soundscapes for reflective moments and finding a steady centre.',
    colorCue: 'Rose Quartz',
    accentHex: '#F2C6E6',
    defaultDna: { warmth: 0.75, brightness: 0.45, density: 0.45, movement: 0.4, nature: 0.55, rhythm: 0.2, musicality: 0.75, spatiality: 0.65 },
  },
  recover: {
    id: 'recover',
    label: 'Recover',
    subtitle: 'Rest after effort',
    description: 'Slow, low, warm soundscapes for rest and recovery after physical or mental effort.',
    colorCue: 'Deep Teal',
    accentHex: '#6BD9E6',
    defaultDna: { warmth: 0.85, brightness: 0.3, density: 0.35, movement: 0.25, nature: 0.7, rhythm: 0.05, musicality: 0.6, spatiality: 0.8 },
  },
};

export const SoundDnaService = {
  getStoredDna(): SoundDNA {
    return Storage.get<SoundDNA>('user_sound_dna', DEFAULT_SOUND_DNA);
  },

  saveDna(dna: SoundDNA): void {
    Storage.set('user_sound_dna', dna);
  },

  resetDna(): SoundDNA {
    this.saveDna(DEFAULT_SOUND_DNA);
    return DEFAULT_SOUND_DNA;
  },

  /**
   * Resolves final Sound DNA by merging:
   * Hard limits > Explicit User Preferences > Recipe Artistic Bounds > Goal Defaults
   */
  resolveForRecipe(recipe: SoundscapeRecipe, userDna?: SoundDNA): SoundDNA {
    const goalDefault = GOAL_PROFILES[recipe.intent].defaultDna;
    const base = userDna || this.getStoredDna();

    // Blend user preference with goal default
    const merged: SoundDNA = {
      warmth: base.warmth * 0.7 + goalDefault.warmth * 0.3,
      brightness: base.brightness * 0.7 + goalDefault.brightness * 0.3,
      density: base.density * 0.7 + goalDefault.density * 0.3,
      movement: base.movement * 0.7 + goalDefault.movement * 0.3,
      nature: base.nature * 0.7 + goalDefault.nature * 0.3,
      rhythm: base.rhythm * 0.7 + goalDefault.rhythm * 0.3,
      musicality: base.musicality * 0.7 + goalDefault.musicality * 0.3,
      spatiality: base.spatiality * 0.7 + goalDefault.spatiality * 0.3,
    };

    // Clamp within recipe's artistic bounds
    return {
      warmth: Math.max(recipe.dnaBounds.minWarmth, Math.min(recipe.dnaBounds.maxWarmth, merged.warmth)),
      brightness: Math.max(recipe.dnaBounds.minBrightness, Math.min(recipe.dnaBounds.maxBrightness, merged.brightness)),
      density: Math.max(recipe.dnaBounds.minDensity, Math.min(recipe.dnaBounds.maxDensity, merged.density)),
      movement: merged.movement,
      nature: merged.nature,
      rhythm: merged.rhythm,
      musicality: merged.musicality,
      spatiality: merged.spatiality,
    };
  },

  /**
   * Generates intuitive human-centered summary descriptor
   * e.g., "Warm · Spacious · Gentle · Organic"
   */
  getDescriptorSummary(dna: SoundDNA): string {
    const traits: string[] = [];

    if (dna.warmth > 0.65) traits.push('Warm');
    else if (dna.warmth < 0.4) traits.push('Crisp');

    if (dna.spatiality > 0.65) traits.push('Spacious');
    else if (dna.spatiality < 0.4) traits.push('Intimate');

    if (dna.movement < 0.35) traits.push('Still');
    else traits.push('Drifting');

    if (dna.nature > 0.55) traits.push('Organic');
    else traits.push('Synthetic');

    return traits.slice(0, 4).join(' · ');
  },
};
