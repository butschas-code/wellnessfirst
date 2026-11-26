/**
 * Wellness Waves — session arcs (authored design, not a clinical protocol).
 *
 * A pure function of elapsed minutes that the composer multiplies into its
 * intensity ceiling, density, brightness and event rate. Values move along
 * smoothstep curves between anchors, so there are no audible steps.
 *
 *   steady     Focus: a stable, low-distraction bed; no arc.
 *   unwind     Arrival → Release → Settling → Stillness over `minutes`.
 *   sleep      Gradual thinning of activity over `minutes` (filters darken separately).
 *   stillness  Barely perceptible easing towards more space.
 *   rise       Energy: warms up over the first minutes, then holds a lifted level.
 */

import type { Intent } from '../../types/index';

export type ArcKind = 'steady' | 'unwind' | 'sleep' | 'stillness' | 'rise';

export interface ArcPoint {
  phase: string;
  /** Upper bound on the composer's intensity (0–1). */
  intensityCap: number;
  /** Multipliers. */
  density: number;
  brightness: number;
  events: number;
}

interface Anchor {
  at: number; // fraction of the arc length
  phase: string;
  v: [number, number, number, number]; // cap, density, brightness, events
}

const ARCS: Record<ArcKind, Anchor[]> = {
  steady: [{ at: 0, phase: 'Steady', v: [1, 1, 1, 1] }],
  unwind: [
    { at: 0, phase: 'Arrival', v: [1, 1, 1, 1] },
    { at: 0.15, phase: 'Release', v: [1, 1, 1, 1] },
    { at: 0.45, phase: 'Settling', v: [0.8, 0.85, 0.9, 0.8] },
    { at: 0.8, phase: 'Stillness', v: [0.62, 0.72, 0.82, 0.55] },
    { at: 1, phase: 'Stillness', v: [0.55, 0.65, 0.76, 0.42] },
  ],
  sleep: [
    { at: 0, phase: 'Settling in', v: [1, 1, 1, 1] },
    { at: 0.5, phase: 'Thinning', v: [0.78, 0.82, 1, 0.6] },
    { at: 1, phase: 'Night', v: [0.55, 0.65, 1, 0.35] },
  ],
  rise: [
    { at: 0, phase: 'Warming up', v: [0.7, 0.8, 0.9, 0.75] },
    { at: 0.35, phase: 'Building', v: [0.95, 1, 1, 1.05] },
    { at: 1, phase: 'Moving', v: [1, 1.05, 1.05, 1.15] },
  ],
  stillness: [
    { at: 0, phase: 'Opening', v: [1, 1, 1, 1] },
    { at: 0.45, phase: 'Resting', v: [0.88, 0.88, 0.96, 0.8] },
    { at: 1, phase: 'Spacious', v: [0.78, 0.78, 0.92, 0.65] },
  ],
};

export const ARC_FOR_INTENT: Record<Intent, ArcKind> = {
  focus: 'steady',
  relax: 'unwind',
  sleep: 'sleep',
  meditate: 'stillness',
  energy: 'rise',
  balance: 'stillness',
  recover: 'unwind',
};

/** Default arc lengths in minutes (configurable per session). */
export const ARC_MINUTES: Record<ArcKind, number> = {
  steady: 1,
  unwind: 30,
  sleep: 35,
  stillness: 45,
  rise: 15,
};

const smooth = (x: number) => x * x * (3 - 2 * x);

export function arcAt(kind: ArcKind, elapsedMinutes: number, minutes = ARC_MINUTES[kind]): ArcPoint {
  const anchors = ARCS[kind];
  const f = Math.max(0, elapsedMinutes) / Math.max(1, minutes);
  if (anchors.length === 1 || f <= anchors[0].at) return point(anchors[0].phase, anchors[0].v);
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    if (f <= b.at) {
      const k = smooth((f - a.at) / (b.at - a.at));
      const v = a.v.map((x, j) => x + (b.v[j] - x) * k) as Anchor['v'];
      return point(k < 0.5 ? a.phase : b.phase, v);
    }
  }
  const last = anchors[anchors.length - 1];
  return point(last.phase, last.v);
}

const point = (phase: string, v: Anchor['v']): ArcPoint => ({
  phase,
  intensityCap: v[0],
  density: v[1],
  brightness: v[2],
  events: v[3],
});
