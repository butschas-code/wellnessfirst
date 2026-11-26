/**
 * Frequency programs — automatic pairing (owner decision, 2026-10-19).
 *
 * Each space quietly runs one of its few suitable programs (see
 * domain/programs/curated.ts) as a soft pulse in the music, at a low level.
 * The listener can pick another program for the space, or switch them off.
 */

import type { Intent, SoundscapeRecipe } from '../../../engine/types/index';
import type { RenderPlan } from '../../../engine/domain/programs/types';
import { AudioEngine } from '../../../engine/audio/engine';
import { Storage } from '../../../engine/lib/storage';
import { RECIPES } from '../../../engine/recipes/catalog';

export const AUTO_INTENSITY = 0.3;

export const autoProgramsEnabled = () => Storage.get<boolean>('programs_auto', true);
export const setAutoProgramsEnabled = (on: boolean) => Storage.set('programs_auto', on);

/** The listener's pick per space, if any. */
const choices = () => Storage.get<Partial<Record<Intent, string>>>('program_choice', {});

/** The programs offered for a space. The catalog chunk loads on first use. */
export async function programsFor(intent: Intent): Promise<RenderPlan[]> {
  const { programsForSpace } = await import('../../../engine/domain/programs/curated');
  return programsForSpace(intent);
}

/** The program a release runs: the listener's pick, else one per release. */
export async function autoPlanFor(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>): Promise<RenderPlan | null> {
  const plans = await programsFor(recipe.intent);
  if (!plans.length) return null;
  const picked = plans.find((p) => p.programId === choices()[recipe.intent]);
  if (picked) return picked;
  const siblings = RECIPES.filter((r) => r.intent === recipe.intent);
  const i = Math.max(0, siblings.findIndex((r) => r.id === recipe.id));
  return plans[i % plans.length];
}

/** Starts the paired program for whatever is playing now, if programs are on. */
export async function startAutoProgram(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>): Promise<void> {
  if (!autoProgramsEnabled()) return;
  const plan = await autoPlanFor(recipe);
  if (plan) AudioEngine.getInstance().startProgram(plan, AUTO_INTENSITY);
}

/** The listener picks a program for a space: remember it, switch programs on, play it. */
export function chooseProgram(intent: Intent, plan: RenderPlan): boolean {
  Storage.set('program_choice', { ...choices(), [intent]: plan.programId });
  setAutoProgramsEnabled(true);
  return AudioEngine.getInstance().startProgram(plan, AUTO_INTENSITY);
}
