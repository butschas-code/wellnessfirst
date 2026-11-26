/**
 * Wellness Waves — 60-Second Auditory Calibration System
 * Implements 5 fast perceptual A/B auditory comparisons with real live audio generation.
 * Complies with Phase 24 and Rescue Specification.
 */

import type { SoundDNA } from '../types/index';

export interface CalibrationPair {
  id: string;
  dimension: keyof SoundDNA;
  question: string;
  optionA: {
    label: string;
    description: string;
    sampleRecipeId: string;
    dnaOverride: Partial<SoundDNA>;
  };
  optionB: {
    label: string;
    description: string;
    sampleRecipeId: string;
    dnaOverride: Partial<SoundDNA>;
  };
}

export const CALIBRATION_PAIRS: CalibrationPair[] = [
  {
    id: 'calib-warmth',
    dimension: 'warmth',
    question: 'Which tonal balance feels gentler to your ears?',
    optionA: {
      label: 'Deep & Mellow',
      description: 'Rolled-off high frequencies, velvety low-mid body.',
      sampleRecipeId: 'dusk-horizon',
      dnaOverride: { warmth: 0.85, brightness: 0.25 },
    },
    optionB: {
      label: 'Crisp & Open',
      description: 'Lighter high-frequency air and clearer presence.',
      sampleRecipeId: 'deep-work',
      dnaOverride: { warmth: 0.45, brightness: 0.75 },
    },
  },
  {
    id: 'calib-movement',
    dimension: 'movement',
    question: 'How do you prefer sound to behave over time?',
    optionA: {
      label: 'Completely Still',
      description: 'Steady, unchanging acoustic foundation.',
      sampleRecipeId: 'deep-work',
      dnaOverride: { movement: 0.15 },
    },
    optionB: {
      label: 'Gently Drifting',
      description: 'Slow spatial panning and gradual acoustic breathing.',
      sampleRecipeId: 'creative-flow',
      dnaOverride: { movement: 0.8 },
    },
  },
  {
    id: 'calib-density',
    dimension: 'density',
    question: 'What level of acoustic fullness works best for you?',
    optionA: {
      label: 'Minimal & Sparse',
      description: 'Uncluttered space with plenty of room between sounds.',
      sampleRecipeId: 'sacred-void',
      dnaOverride: { density: 0.25 },
    },
    optionB: {
      label: 'Rich & Enveloping',
      description: 'Full multi-layered blanket that masks all room noise.',
      sampleRecipeId: 'midnight-drift',
      dnaOverride: { density: 0.85 },
    },
  },
  {
    id: 'calib-nature',
    dimension: 'nature',
    question: 'Which source texture feels more natural to your mind?',
    optionA: {
      label: 'Organic Nature',
      description: 'Real-world water, rain, wind, and forest resonance.',
      sampleRecipeId: 'ocean-drift',
      dnaOverride: { nature: 0.9 },
    },
    optionB: {
      label: 'Pure Synthesizer',
      description: 'Clean harmonic oscillators and diffuse acoustic space.',
      sampleRecipeId: 'deep-work',
      dnaOverride: { nature: 0.2 },
    },
  },
  {
    id: 'calib-rhythm',
    dimension: 'rhythm',
    question: 'Do you prefer a gentle rhythmic pulse or continuous drone?',
    optionA: {
      label: 'Steady Drone',
      description: 'Continuous unbroken acoustic tone.',
      sampleRecipeId: 'deep-work',
      dnaOverride: { rhythm: 0.1 },
    },
    optionB: {
      label: 'Gentle Pulse',
      description: 'Subtle wave-like modulation for a calming tempo.',
      sampleRecipeId: 'creative-flow',
      dnaOverride: { rhythm: 0.75 },
    },
  },
];

export const CalibrationService = {
  calculateCalibratedDna(answers: Record<string, 'A' | 'B'>, baseDna: SoundDNA): SoundDNA {
    const result: SoundDNA = { ...baseDna };

    CALIBRATION_PAIRS.forEach((pair) => {
      const choice = answers[pair.id];
      if (choice === 'A') {
        const override = pair.optionA.dnaOverride;
        Object.assign(result, override);
      } else if (choice === 'B') {
        const override = pair.optionB.dnaOverride;
        Object.assign(result, override);
      }
    });

    return result;
  },
};
