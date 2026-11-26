/**
 * Wellness — which technique each space plays, and starting it.
 * On by default; one switch turns techniques off everywhere.
 */

import { useEffect, useState } from 'react';
import type { Intent, SoundscapeRecipe } from '../../../engine/types/index';
import { AudioEngine, type WellnessStatus } from '../../../engine/audio/engine';
import { Storage } from '../../../engine/lib/storage';
import { PROGRAMS_PER_SPACE, type Technique, singlesFor, techniqueById, techniquesFor } from '../../../engine/domain/wellness/techniques';
import { RECIPES } from '../../../engine/recipes/catalog';

export const wellnessEnabled = () => Storage.get<boolean>('programs_auto', true);
export const setWellnessEnabled = (on: boolean) => Storage.set('programs_auto', on);

const choices = () => Storage.get<Partial<Record<Intent, string>>>('technique_choice', {});

/** A space's Frequency programs, as techniques. The catalog chunk loads on first use. */
export async function programsFor(intent: Intent): Promise<Technique[]> {
  const { programTechniquesFor } = await import('../../../engine/domain/wellness/programTechniques');
  // About six per space in total: the Frequency programs fill what the single frequencies leave.
  return programTechniquesFor(intent).slice(0, Math.max(2, PROGRAMS_PER_SPACE - singlesFor(intent).length));
}

/**
 * What a release plays: the listener's pick for its space, else one of the
 * space's Frequency programs (a different one for each release).
 */
export async function techniqueFor(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>): Promise<Technique | null> {
  const programs = await programsFor(recipe.intent);
  const picked = choices()[recipe.intent];
  if (picked) {
    const t = programs.find((p) => p.id === picked) ?? techniqueById(picked);
    if (t) return t;
  }
  if (programs.length) {
    const siblings = RECIPES.filter((r) => r.intent === recipe.intent);
    const i = Math.max(0, siblings.findIndex((r) => r.id === recipe.id));
    return programs[i % programs.length];
  }
  return techniquesFor(recipe.intent)[0] ?? null;
}

const run = (t: Technique) => AudioEngine.getInstance().startTechnique(t);

/** Starts the right program or technique for what is playing now, if they are on. */
export async function startAutoWellness(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>): Promise<void> {
  if (!wellnessEnabled()) return;
  const t = await techniqueFor(recipe);
  if (!t) return;
  // The same one keeps running across releases: no restart, no gap.
  if (AudioEngine.getInstance().getWellnessStatus().technique?.id === t.id) return;
  run(t);
}

/** The listener picks a program or technique for a space: remember it and play it. */
export async function chooseTechnique(recipe: Pick<SoundscapeRecipe, 'id' | 'intent'>, t: Technique): Promise<boolean> {
  Storage.set('technique_choice', { ...choices(), [recipe.intent]: t.id });
  setWellnessEnabled(true);
  return run(t);
}

export function turnWellnessOff(): void {
  setWellnessEnabled(false);
  AudioEngine.getInstance().stopTechnique();
}

/** Live technique status; fast enough to follow a breath. */
export function useWellness(intervalMs = 200): WellnessStatus {
  const engine = AudioEngine.getInstance();
  const [status, setStatus] = useState<WellnessStatus>(() => engine.getWellnessStatus());
  useEffect(() => {
    // Only re-render when something shown changes (technique, on/off, breath phase):
    // the breath value itself is drawn by the stage, not by React.
    let key = '';
    const tick = () => {
      const next = engine.getWellnessStatus();
      const k = `${next.technique?.id}|${next.active}|${next.breath?.phase ?? ''}`;
      if (k === key) return;
      key = k;
      setStatus(next);
    };
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [engine, intervalMs]);
  return status;
}
