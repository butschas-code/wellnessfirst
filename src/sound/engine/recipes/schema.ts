/**
 * Wellness Waves — Soundscape Recipe Schema Definition & Validation
 * Enforces strict typing, range boundaries, and versioning via Zod.
 */

import { z } from 'zod';

export const LayerSourceTypeSchema = z.enum([
  'chord_pad',
  'harmonic_drone',
  'generative_motif',
  'felt_key',
  'muted_pluck',
  'oscillator',
  'noise',
  'modal_bell',
  'procedural_texture',
  'sample',
]);

export const AudioLayerDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceType: LayerSourceTypeSchema,
  bus: z
    .enum([
      'harmony',
      'motif',
      'texture',
      'environment',
      'modulation',
      'reverb',
      'master',
      'tonal',
      'noise',
    ])
    .optional(),
  baseGain: z.number().min(0.0).max(1.0),
  pan: z.number().min(-1.0).max(1.0),
  reverbSend: z.number().min(0.0).max(1.0),
  delaySend: z.number().min(0.0).max(1.0),
  chordPadConfig: z
    .object({
      progressionId: z.string().min(1),
      waveform: z.enum(['triangle', 'sine', 'sawtooth']).optional(),
      filterCutoffHz: z.number().positive().optional(),
      resonanceQ: z.number().nonnegative().optional(),
      detuneCents: z.number().optional(),
      spreadVoices: z.number().int().min(1).max(8).optional(),
    })
    .optional(),
  harmonicDroneConfig: z
    .object({
      fundamentalHz: z.number().positive(),
      waveform: z.enum(['sine', 'triangle', 'sawtooth']).optional(),
      partials: z.array(z.number().positive()),
      partialGains: z.array(z.number().min(0.0).max(1.0)).optional(),
      detuneCents: z.number().optional(),
      lfoRateHz: z.number().nonnegative().optional(),
    })
    .optional(),
  generativeMotifConfig: z
    .object({
      scaleNotes: z.array(z.string().min(1)),
      intervalSeconds: z.number().positive(),
      randomizeInterval: z.number().nonnegative(),
      toneType: z.enum(['warm_bell', 'felt_rhodes', 'chime', 'soft_pluck', 'felt_key']),
    })
    .optional(),
  feltKeyConfig: z
    .object({
      scaleNotes: z.array(z.string().min(1)),
      intervalSeconds: z.number().positive(),
      randomizeInterval: z.number().nonnegative(),
      velocitySensitivity: z.number().min(0.0).max(1.0).optional(),
      decaySeconds: z.number().positive().optional(),
    })
    .optional(),
  mutedPluckConfig: z
    .object({
      scaleNotes: z.array(z.string().min(1)),
      intervalSeconds: z.number().positive(),
      randomizeInterval: z.number().nonnegative(),
      damping: z.number().min(0.0).max(1.0).optional(),
      pluckBrightness: z.number().min(0.0).max(1.0).optional(),
    })
    .optional(),
  oscillatorConfig: z
    .object({
      waveform: z.enum(['sine', 'triangle', 'sawtooth']),
      baseFrequency: z.number().positive(),
      detuneCents: z.number().optional(),
      harmonics: z.array(z.number()).optional(),
    })
    .optional(),
  noiseConfig: z
    .object({
      color: z.enum(['pink', 'brown', 'white']),
      filterType: z.enum(['lowpass', 'bandpass', 'highpass']),
      cutoffHz: z.number().positive(),
      resonanceQ: z.number().nonnegative(),
    })
    .optional(),
  modalBellConfig: z
    .object({
      fundamentalHz: z.number().positive(),
      damping: z.number().min(0.0).max(1.0),
      strikeIntervalSeconds: z.number().positive(),
      randomizeInterval: z.number().nonnegative(),
    })
    .optional(),
  proceduralTextureConfig: z
    .object({
      textureType: z.enum(['rain', 'wind', 'stream', 'forest_chimes', 'deep_swell']),
      variationSpeed: z.number().positive(),
      intensity: z.number().min(0.0).max(1.0),
    })
    .optional(),
  binauralEligible: z.boolean().optional(),
  rhythmicEligible: z.boolean().optional(),
});

export const SoundscapeRecipeSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1),
  intent: z.enum(['focus', 'relax', 'sleep', 'meditate', 'energy', 'balance', 'recover']),
  family: z.enum(['atmosphere', 'nature', 'flow', 'resonance']),
  shortDescription: z.string().min(5),
  longDescription: z.string().min(10),
  artworkSlot: z.string().min(1),
  basePalette: z.string().min(1),
  targetDurationMinutes: z.number().nonnegative().optional(),
  defaultMode: z.enum(['ambient', 'rhythmic', 'binaural']),
  status: z.enum(['draft', 'qa_approved', 'published']).optional(),
  dnaBounds: z.object({
    minWarmth: z.number().min(0.0).max(1.0),
    maxWarmth: z.number().min(0.0).max(1.0),
    minBrightness: z.number().min(0.0).max(1.0),
    maxBrightness: z.number().min(0.0).max(1.0),
    minDensity: z.number().min(0.0).max(1.0),
    maxDensity: z.number().min(0.0).max(1.0),
  }),
  layers: z.array(AudioLayerDefinitionSchema).min(1).max(8),
  seed: z.union([z.string(), z.number()]).optional(),
  tags: z.array(z.string()),
});
