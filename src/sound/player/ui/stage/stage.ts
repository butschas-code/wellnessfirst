/**
 * Tide stage — shared state for the full-screen water + ring.
 * Pages declare what they want (depth, ring placement); the renderer eases
 * towards it every frame, so moving between pages is one continuous scene.
 */

import type { Depth } from './palette';

export type RingMode = 'hero' | 'player' | 'ambient' | 'hidden';

export interface StageTarget {
  depth: Depth;
  mode: RingMode;
}

type Listener = (t: StageTarget) => void;

let target: StageTarget = { depth: 'surface', mode: 'hero' };
/** A temporary depth while the pointer rests on a space (cleared on leave). */
let preview: Depth | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l(current()));

export function current(): StageTarget {
  return { ...target, depth: preview ?? target.depth };
}

export function setStage(next: Partial<StageTarget>): void {
  target = { ...target, ...next };
  emit();
}

export function previewDepth(depth: Depth | null): void {
  preview = depth;
  emit();
}

/** Home and the player measure the room their controls leave and place the ring there (fractions of height, from the top). */
const placements: Partial<Record<RingMode, { y: number; r: number }>> = {};
export function setRingPlacement(mode: RingMode, p: { y: number; r: number } | null): void {
  if (p) placements[mode] = p;
  else delete placements[mode];
}
export const setHeroPlacement = (p: { y: number; r: number } | null) => setRingPlacement('hero', p);
export const ringPlacement = (mode: RingMode) => placements[mode] ?? null;

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Ring placement per mode: centre (x, y as fraction of viewport), radius (fraction of height), brightness. */
export const MODES: Record<RingMode, { x: number; y: number; r: number; light: number }> = {
  hero: { x: 0.5, y: 0.58, r: 0.2, light: 1 },
  player: { x: 0.5, y: 0.53, r: 0.29, light: 1 },
  ambient: { x: 0.8, y: 0.62, r: 0.36, light: 0.4 },
  hidden: { x: 0.5, y: 0.5, r: 0.6, light: 0 },
};

/** Tall screens: the ring rides higher so text and controls below stay clear. */
export const MODES_PORTRAIT: Record<RingMode, { x: number; y: number; r: number; light: number }> = {
  hero: { x: 0.5, y: 0.63, r: 0.15, light: 1 },
  player: { x: 0.5, y: 0.7, r: 0.16, light: 1 },
  ambient: { x: 0.5, y: 0.78, r: 0.2, light: 0.35 },
  hidden: { x: 0.5, y: 0.5, r: 0.6, light: 0 },
};
