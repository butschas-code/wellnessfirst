/**
* Tide — each space is a depth of water with its own light.
* Values are linear-ish RGB 0–1 for the shader, plus hex for CSS.
*/
import type { Intent } from '../../../engine/types/index';
import { PLAYER_NAME } from '../../brand';

export type Depth = Intent | 'surface';

export interface DepthPalette {
  glow: [number, number, number];
  deep: [number, number, number];
  mid: [number, number, number];
  /** Overall light level (Sleep is nearly dark). */
  dim: number;
  /** Ring breathing speed multiplier. */
  pulse: number;
  label: string;
  metres: string;
}

// Near-black night with a faint tint; each space keeps its own light in Wellness First tones
// (sage #89a375, mist #a2c0c5, cream #f4efe6 and their muted neighbours).
export const DEPTHS: Record<Depth, DepthPalette> = {
  surface: { glow: [0.78, 0.83, 0.71], deep: [0.008, 0.012, 0.014], mid: [0.035, 0.05, 0.045], dim: 1, pulse: 1, label: PLAYER_NAME, metres: '' },
  focus: { glow: [0.635, 0.753, 0.773], deep: [0.007, 0.012, 0.016], mid: [0.03, 0.05, 0.058], dim: 1, pulse: 1.25, label: 'Focus', metres: '12 m' },
  relax: { glow: [0.663, 0.757, 0.576], deep: [0.008, 0.013, 0.011], mid: [0.035, 0.052, 0.035], dim: 0.95, pulse: 0.9, label: 'Unwind', metres: '40 m' },
  sleep: { glow: [0.56, 0.64, 0.75], deep: [0.004, 0.006, 0.01], mid: [0.016, 0.024, 0.04], dim: 0.55, pulse: 0.55, label: 'Sleep', metres: '200 m' },
  meditate: { glow: [0.9, 0.86, 0.79], deep: [0.009, 0.009, 0.009], mid: [0.045, 0.042, 0.036], dim: 0.85, pulse: 0.7, label: 'Stillness', metres: '90 m' },
  energy: { glow: [0.8, 0.83, 0.56], deep: [0.009, 0.012, 0.008], mid: [0.045, 0.05, 0.028], dim: 1, pulse: 1.6, label: 'Energy', metres: '3 m' },
  balance: { glow: [0.886, 0.773, 0.714], deep: [0.011, 0.009, 0.009], mid: [0.055, 0.042, 0.038], dim: 0.95, pulse: 0.95, label: 'Balance', metres: '25 m' },
  recover: { glow: [0.62, 0.79, 0.76], deep: [0.006, 0.012, 0.012], mid: [0.028, 0.05, 0.048], dim: 0.8, pulse: 0.65, label: 'Recover', metres: '120 m' },
};

const toHex = (c: [number, number, number]) =>
  '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

export const glowHex = (d: Depth) => toHex((DEPTHS[d] || DEPTHS.surface).glow);
export const midHex = (d: Depth) => toHex((DEPTHS[d] || DEPTHS.surface).mid);
