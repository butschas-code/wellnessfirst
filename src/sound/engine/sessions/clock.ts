/**
 * Listening clock — elapsed time and sleep-timer seconds left.
 * Kept outside React context on purpose: it changes every second, and only the
 * few places that show it should redraw, not the whole app (battery).
 */

import { useSyncExternalStore } from 'react';

export interface ClockState {
  elapsed: number;
  remaining: number;
}

let state: ClockState = { elapsed: 0, remaining: 0 };
const listeners = new Set<() => void>();

export const clockStore = {
  get: (): ClockState => state,
  set(patch: Partial<ClockState>): void {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Re-renders only when the selected value changes. Return a primitive. */
export function useClock<T extends string | number>(select: (s: ClockState) => T): T {
  return useSyncExternalStore(clockStore.subscribe, () => select(clockStore.get()));
}
