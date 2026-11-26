/**
 * Frequency programs — React binding to the engine's opt-in frequency layer.
 * Status is read from the engine (the single source of truth), so the UI can
 * never claim a program is active when no signal is routed.
 */

import { useCallback, useEffect, useState } from 'react';
import { AudioEngine, type ProgramStatus } from '../../../engine/audio/engine';
import type { RenderOptions, RenderPlan } from '../../../engine/domain/programs/types';
import { DEFAULT_RENDER_OPTIONS } from '../../../engine/domain/programs/adaptationPolicy';
import { Storage } from '../../../engine/lib/storage';

export interface ProgramPrefs extends RenderOptions {
  intensity: number;
}

const DEFAULT_PREFS: ProgramPrefs = { ...DEFAULT_RENDER_OPTIONS, intensity: 0.35 };

export function loadProgramPrefs(): ProgramPrefs {
  return { ...DEFAULT_PREFS, ...Storage.get<Partial<ProgramPrefs>>('program_prefs', {}) };
}

export function saveProgramPrefs(p: ProgramPrefs): void {
  Storage.set('program_prefs', p);
}

export function useProgram() {
  const engine = AudioEngine.getInstance();
  const [status, setStatus] = useState<ProgramStatus>(() => engine.getProgramStatus());

  useEffect(() => {
    const tick = () => setStatus(engine.getProgramStatus());
    tick();
    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, [engine]);

  const start = useCallback(
    (plan: RenderPlan, intensity: number) => {
      const ok = engine.startProgram(plan, intensity);
      setStatus(engine.getProgramStatus());
      return ok;
    },
    [engine]
  );

  const setEnabled = useCallback(
    (on: boolean) => {
      engine.setProgramEnabled(on);
      setStatus(engine.getProgramStatus());
    },
    [engine]
  );

  const setIntensity = useCallback(
    (v: number) => {
      engine.setProgramIntensity(v);
      const prefs = loadProgramPrefs();
      saveProgramPrefs({ ...prefs, intensity: v });
      setStatus(engine.getProgramStatus());
    },
    [engine]
  );

  const stop = useCallback(() => {
    engine.stopProgram();
    setStatus(engine.getProgramStatus());
  }, [engine]);

  return { status, start, setEnabled, setIntensity, stop };
}
