/**
 * Wellness Waves — Core Type Definitions & System Contracts
 * Compliant with 00_GLOBAL_CONTRACT.md & Phases 01-28
 */

export type Intent = 'focus' | 'relax' | 'sleep' | 'meditate' | 'energy' | 'balance' | 'recover';

export type SonicFamily = 'atmosphere' | 'nature' | 'flow' | 'resonance';

export type AudioMode = 'ambient' | 'rhythmic' | 'binaural';

export type PlaybackStatus = 
  | 'idle' 
  | 'loading' 
  | 'ready' 
  | 'playing' 
  | 'pausing' 
  | 'paused' 
  | 'interrupted' 
  | 'resuming' 
  | 'stopping' 
  | 'ended'
  | 'error';

/**
 * 8-Axis Sound DNA Preference Model (Values bounded 0.0 to 1.0)
 */
export interface SoundDNA {
  warmth: number;      // Low frequencies & soft harmonics vs crisp high end
  brightness: number;  // Spectral openness & presence
  density: number;     // Number of active concurrent layers
  movement: number;    // LFO rates, pan drift, spatial sweep
  nature: number;      // Organic field recordings vs pure procedural synthesis
  rhythm: number;      // Gentle pulsing vs static drone
  musicality: number;  // Harmonic pitched chords vs atmospheric noise
  spatiality: number;  // Stereo width, reverb room size, diffusion
}

export interface GoalProfile {
  id: Intent;
  label: string;
  subtitle: string;
  description: string;
  defaultDna: SoundDNA;
  colorCue: string;
  accentHex: string;
}

export type LayerSourceType = 
  | 'chord_pad'
  | 'harmonic_drone'
  | 'generative_motif'
  | 'felt_key'
  | 'muted_pluck'
  | 'oscillator' 
  | 'noise' 
  | 'modal_bell' 
  | 'procedural_texture' 
  | 'sample';

export interface FeltKeyConfig {
  scaleNotes: string[];
  intervalSeconds: number;
  randomizeInterval: number;
  velocitySensitivity?: number;
  decaySeconds?: number;
}

export interface MutedPluckConfig {
  scaleNotes: string[];
  intervalSeconds: number;
  randomizeInterval: number;
  damping?: number;
  pluckBrightness?: number;
}

export interface ChordPadConfig {
  progressionId: string;
  waveform?: 'triangle' | 'sine' | 'sawtooth';
  filterCutoffHz?: number;
  resonanceQ?: number;
  detuneCents?: number;
  spreadVoices?: number; // 3 to 5 voices
}

export interface HarmonicDroneConfig {
  fundamentalHz: number;
  waveform?: 'sine' | 'triangle' | 'sawtooth';
  partials: number[];       // e.g. [1.0, 1.5, 2.0, 3.0]
  partialGains?: number[];  // relative gains
  detuneCents?: number;
  lfoRateHz?: number;       // breathing filter rate
}

export interface GenerativeMotifConfig {
  scaleNotes: string[];     // e.g. ['C4', 'E4', 'G4', 'B4', 'D5']
  intervalSeconds: number;
  randomizeInterval: number;
  toneType: 'warm_bell' | 'felt_rhodes' | 'chime' | 'soft_pluck' | 'felt_key';
}

export interface OscillatorLayerConfig {
  waveform: 'sine' | 'triangle' | 'sawtooth';
  baseFrequency: number;
  detuneCents?: number;
  harmonics?: number[];
}

export interface NoiseLayerConfig {
  color: 'pink' | 'brown' | 'white';
  filterType: 'lowpass' | 'bandpass' | 'highpass';
  cutoffHz: number;
  resonanceQ: number;
}

export interface ModalBellConfig {
  fundamentalHz: number;
  damping: number;
  strikeIntervalSeconds: number;
  randomizeInterval: number;
}

export interface ProceduralTextureConfig {
  textureType: 'rain' | 'wind' | 'stream' | 'forest_chimes' | 'deep_swell';
  variationSpeed: number;
  intensity: number;
}

export type AudioBusType = 
  | 'harmony' 
  | 'motif' 
  | 'texture' 
  | 'environment' 
  | 'modulation' 
  | 'reverb' 
  | 'master'
  | 'tonal' 
  | 'noise'
  | 'frequency';

export interface AudioLayerDefinition {
  id: string;
  name: string;
  sourceType: LayerSourceType;
  bus?: AudioBusType;     // 'harmony', 'motif', 'texture', 'environment', 'modulation', or legacy 'tonal'/'noise'
  baseGain: number;       // 0.0 to 1.0
  pan: number;            // -1.0 to 1.0
  reverbSend: number;     // 0.0 to 1.0
  delaySend: number;      // 0.0 to 1.0
  chordPadConfig?: ChordPadConfig;
  harmonicDroneConfig?: HarmonicDroneConfig;
  generativeMotifConfig?: GenerativeMotifConfig;
  feltKeyConfig?: FeltKeyConfig;
  mutedPluckConfig?: MutedPluckConfig;
  oscillatorConfig?: OscillatorLayerConfig;
  noiseConfig?: NoiseLayerConfig;
  modalBellConfig?: ModalBellConfig;
  proceduralTextureConfig?: ProceduralTextureConfig;
  binauralEligible?: boolean;
  rhythmicEligible?: boolean;
}

export type RecipeStatus = 'draft' | 'qa_approved' | 'published';

export interface SoundscapeRecipe {
  id: string;
  version: string;
  title: string;
  intent: Intent;
  family: SonicFamily;
  shortDescription: string;
  longDescription: string;
  artworkSlot: string;
  basePalette: string;
  targetDurationMinutes?: number;
  defaultMode: AudioMode;
  status?: RecipeStatus;
  dnaBounds: {
    minWarmth: number;
    maxWarmth: number;
    minBrightness: number;
    maxBrightness: number;
    minDensity: number;
    maxDensity: number;
  };
  layers: AudioLayerDefinition[];
  seed?: string | number;
  tags: string[];
}

export interface ShapeParams {
  energy: number;   // 0.0 to 1.0 (controls harmonic brightness & pulse tempo)
  texture: number;  // 0.0 to 1.0 (controls noise bus level: 0.0 = completely off, 1.0 = gentle masking)
  space: number;    // 0.0 to 1.0 (controls reverb and delay sends)
  /** 0–1 optional steady masking bed (warm shaped noise). 0 / undefined = off. Independent of any program. */
  masking?: number;
}

export interface PlaybackSession {
  sessionId: string;
  recipeId: string;
  startTime: number;
  elapsedSeconds: number;
  targetDurationMinutes?: number; // 0 or undefined = indefinite
  sleepTimerActive: boolean;
  sleepTimerRemainingSeconds?: number;
  isPaused: boolean;
  audioMode: AudioMode;
  dna: SoundDNA;
  volume: number; // 0.0 to 1.0
}

export interface MixerBusState {
  id: AudioBusType;
  name: string;
  gain: number;
  isMuted: boolean;
  isSolo: boolean;
  peakDb: number;
}

export interface AudioDiagnostics {
  contextState: AudioContextState | 'closed' | 'uninitialized';
  sampleRate: number;
  activeVoices: number;
  peakDb: number;
  hasClipping: boolean;
  dcOffset: number;
  isStereo: boolean;
  cpuLoadEstimate: number;
  busLevels?: Record<string, { peakDb: number; isMuted: boolean; isSolo: boolean }>;
  currentChord?: string;
  currentScale?: string;
  tonalOnlyMode?: boolean;
  intensity?: number;
  nextEvent?: string;
  seed?: string;
}

export type EntitlementTier = 
  | 'anonymous' 
  | 'free_authenticated' 
  | 'plus' 
  | 'founder' 
  | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  tier: EntitlementTier;
  soundDna: SoundDNA;
  favorites: string[];
  recentRecipeIds: string[];
  createdAt: string;
}
