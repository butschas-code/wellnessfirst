/**
 * Wellness Waves — catalogue facts for the sleeve world.
 * Every liner note shown in the UI is derived from the authored sound world,
 * so what the page says is what the composer actually plays.
 */

import type { Intent, SoundscapeRecipe } from '../../engine/types/index';
import { RECIPES } from '../../engine/recipes/catalog';
import { SOUND_WORLDS, type SoundWorld, worldForRecipe } from '../../engine/audio/ambient/worlds';
import { pcName } from '../../engine/audio/ambient/theory';

export const SPACES: Array<{ intent: Intent; name: string; line: string }> = [
  { intent: 'focus', name: 'Focus', line: 'Make space for what matters.' },
  { intent: 'relax', name: 'Unwind', line: 'Let the day soften.' },
  { intent: 'sleep', name: 'Sleep', line: 'Settle into the night.' },
  { intent: 'meditate', name: 'Stillness', line: 'Listen inward.' },
  { intent: 'energy', name: 'Energy', line: 'Get moving.' },
  { intent: 'balance', name: 'Balance', line: 'Find your middle.' },
  { intent: 'recover', name: 'Recover', line: 'Rest after effort.' },
];

export const spaceName = (intent: Intent): string => SPACES.find((s) => s.intent === intent)?.name ?? intent;

export const FLAGSHIP_BY_INTENT: Record<Intent, string> = {
  focus: 'quiet-momentum',
  relax: 'soft-landing',
  sleep: 'night-current',
  meditate: 'open-space',
  energy: 'first-light',
  balance: 'even-keel',
  recover: 'slow-tide',
};

/** IS·01 … IS·12 in catalogue order. */
export function catalogueNumber(recipe: Pick<SoundscapeRecipe, 'id'>): string {
  const i = RECIPES.findIndex((r) => r.id === recipe.id);
  return `IS·${String(i >= 0 ? i + 1 : 0).padStart(2, '0')}`;
}

const MODE_LABEL: Record<SoundWorld['key']['mode'], string> = {
  ionian: 'major',
  aeolian: 'minor',
  dorian: 'dorian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
};

const INSTRUMENT_LABEL: Record<string, string> = {
  rhodes: 'Rhodes',
  felt: 'felt piano',
  kalimba: 'kalimba',
  mallet: 'mallets',
  glass: 'glass keys',
};

const TEXTURE_LABEL: Record<string, string> = {
  ocean: 'ocean',
  rain: 'rain',
  wind: 'wind',
  air: 'air',
  hearth: 'hearth',
};

export interface LinerNotes {
  key: string;
  tempo: string;
  instruments: string;
  hall: string;
  character: string[];
}

export function linerNotes(recipe: SoundscapeRecipe): LinerNotes {
  const w = worldForRecipe(recipe);
  const parts: string[] = [w.pad.soft ? 'soft pad' : 'pad'];
  if (w.keys.level > 0 && w.keys.phrasesPerMin > 0) parts.push(INSTRUMENT_LABEL[w.keys.instrument]);
  if (w.pulse.level > 0) parts.push(`${INSTRUMENT_LABEL[w.pulse.instrument]} pulse`);
  if (w.bells.level > 0) parts.push('bells');
  if (w.texture.kind !== 'none') parts.push(TEXTURE_LABEL[w.texture.kind]);
  return {
    key: `${pcName(w.key.tonicPc)} ${MODE_LABEL[w.key.mode]}`,
    tempo: `${w.bpm} bpm`,
    instruments: parts.join(', '),
    hall: `${w.space.reverbSeconds} s hall`,
    character: characterOf(w),
  };
}

export type Character = 'Musical' | 'Atmospheric' | 'Nature' | 'Pulse' | 'Minimal';
export const CHARACTERS: Character[] = ['Musical', 'Atmospheric', 'Nature', 'Pulse', 'Minimal'];

function characterOf(w: SoundWorld): Character[] {
  const c: Character[] = [];
  if (w.keys.phrasesPerMin >= 0.7) c.push('Musical');
  if (w.keys.phrasesPerMin < 0.7 || w.space.reverbSeconds >= 8) c.push('Atmospheric');
  if (['ocean', 'rain', 'wind', 'hearth'].includes(w.texture.kind)) c.push('Nature');
  if (w.pulse.level > 0) c.push('Pulse');
  if (w.keys.phrasesPerMin <= 0.35) c.push('Minimal');
  return c;
}

/** The flagship that suits the listener's local hour. */
export function flagshipForNow(date = new Date()): SoundscapeRecipe {
  const h = date.getHours();
  const intent: Intent = h >= 22 || h < 5 ? 'sleep' : h < 12 ? 'focus' : h < 18 ? 'focus' : 'relax';
  return RECIPES.find((r) => r.id === FLAGSHIP_BY_INTENT[intent])!;
}

export function recipesFor(intent: Intent): SoundscapeRecipe[] {
  return RECIPES.filter((r) => r.intent === intent);
}

export { SOUND_WORLDS };
