/**
 * Tide — each space is a depth of water with its own light (Wellness First navy water, muted per-space light).
 * Values are linear-ish RGB 0–1 for the shader, plus hex for CSS.
 */

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

export const DEPTHS: Record<Depth, DepthPalette> = {
  surface: { glow: [0.663, 0.757, 0.576], deep: [0.012, 0.04, 0.065], mid: [0.04, 0.14, 0.2], dim: 1, pulse: 1, label: PLAYER_NAME, metres: '' },
  focus: { glow: [0.635, 0.753, 0.773], deep: [0.012, 0.042, 0.07], mid: [0.045, 0.15, 0.22], dim: 1, pulse: 1.25, label: 'Focus', metres: '12 m' },
  relax: { glow: [0.663, 0.757, 0.576], deep: [0.012, 0.045, 0.06], mid: [0.05, 0.15, 0.17], dim: 0.95, pulse: 0.9, label: 'Unwind', metres: '40 m' },
  sleep: { glow: [0.576, 0.651, 0.8], deep: [0.006, 0.018, 0.04], mid: [0.02, 0.06, 0.12], dim: 0.5, pulse: 0.55, label: 'Sleep', metres: '200 m' },
  meditate: { glow: [0.725, 0.714, 0.847], deep: [0.014, 0.03, 0.06], mid: [0.06, 0.1, 0.18], dim: 0.85, pulse: 0.7, label: 'Stillness', metres: '90 m' },
  energy: { glow: [0.796, 0.839, 0.561], deep: [0.014, 0.048, 0.06], mid: [0.06, 0.17, 0.18], dim: 1, pulse: 1.6, label: 'Energy', metres: '3 m' },
  balance: { glow: [0.886, 0.773, 0.714], deep: [0.025, 0.035, 0.06], mid: [0.1, 0.11, 0.17], dim: 0.95, pulse: 0.95, label: 'Balance', metres: '25 m' },
  recover: { glow: [0.624, 0.788, 0.757], deep: [0.01, 0.04, 0.06], mid: [0.04, 0.13, 0.17], dim: 0.8, pulse: 0.65, label: 'Recover', metres: '120 m' },
};

const toHex = (c: [number, number, number]) =>
  '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

export const glowHex = (d: Depth) => toHex((DEPTHS[d] || DEPTHS.surface).glow);
export const midHex = (d: Depth) => toHex((DEPTHS[d] || DEPTHS.surface).mid);
