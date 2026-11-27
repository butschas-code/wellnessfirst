/**
 * Arc compositions — personal day programs built value by value (composer 2).
 *
 * Unlike catalog compositions (types.ts), an arc is not a selection of
 * existing programs. Every movement carries its own rates, computed for one
 * person from their chart (src/lib/sound/dayArc.ts), and the shape of the
 * session: glides between rates, a slow drift around the rate so the pattern
 * never sits perfectly still (the device catalog's "jitter"), optional short
 * bursts, and an optional breathing swell. The engine plays it as a pulse in
 * the music; it never plays literal tones or binaural beats.
 *
 * Hard limits are enforced here, on every load, so a stored or tampered arc
 * that leaves them is refused rather than played.
 */

import type { Intent } from '../types/index';
import type { PlanStep, RenderPlan } from '../domain/programs/types';
import { catalogRef } from '../domain/programs/catalog';
import { POLICY_VERSION } from '../domain/programs/adaptationPolicy';
import { contentHash } from './hash';

export const ARC_SCHEMA = 'wellness-waves/arc@1' as const;
export const ARC_COMPOSER_VERSION = '2.0.0';

/** Safety and comfort limits (authored; see docs/rulebook). */
export const ARC_LIMITS = {
  minHz: 0.5,
  maxHz: 40,
  minSeconds: 60,
  maxSeconds: 900,
  maxTotalSeconds: 45 * 60,
  maxDepth: 0.4,
  maxJitter: 0.12,
  minJitterEvery: 1,
  maxJitterEvery: 12,
  minBreathHz: 0.05,
  maxBreathHz: 0.12,
  maxBreathDepth: 0.2,
  minBurstEvery: 8,
  maxBurstOn: 4,
} as const;

export type ArcShape = 'sine' | 'firm';

export interface ArcVoice {
  /** What the rate was derived from: a planet, or a fixed research value. */
  source: string;
  weight: number;
}

export interface ArcMovement {
  /** Stable id of the movement kind, e.g. 'morning.lift'. */
  id: string;
  /** Rate at the start of the movement, Hz. */
  fromHz: number;
  /** Rate at the end; equal to fromHz for a steady movement. */
  toHz: number;
  seconds: number;
  /** Pulse depth, 0–ARC_LIMITS.maxDepth. */
  depth: number;
  /** sine: rounded pulse. firm: a slightly squarer pulse for waking movements. */
  shape: ArcShape;
  /** Slow drift around the rate: ± pct, a new target every `every` seconds. */
  jitter: { pct: number; every: number };
  /** Short bursts at a second rate: `on` seconds every `every` seconds. */
  burst?: { hz: number; on: number; every: number };
  /** A breathing swell in the music at this rate (Hz) and depth. */
  breath?: { hz: number; depth: number };
  /** Where the rate came from, for the Pro view. */
  voices: ArcVoice[];
  /** Ids of the arc rules that shaped this movement. */
  rules: string[];
}

export interface ArcComposition {
  schema: typeof ARC_SCHEMA;
  /** Day arcs: the slot. Theme arcs (chapter, strength, support): null. */
  slot: 'morning' | 'midday' | 'evening' | null;
  /** Theme arcs: what the arc is about, e.g. 'strength:Mars', 'support:area-12', 'chapter:Saturn-Venus'. */
  theme?: string;
  intent: Intent;
  recipeId: string;
  movements: ArcMovement[];
  /** After the last movement the program holds it instead of starting over. */
  holdLast: true;
  /** Seed for the drift pattern; same seed → same drift. */
  seed: string;
  totalSeconds: number;
  versions: { composer: string; rulebook: string; library: string };
}

export const isArc = (c: unknown): c is ArcComposition => !!c && typeof c === 'object' && (c as { schema?: unknown }).schema === ARC_SCHEMA;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const within = (v: unknown, lo: number, hi: number) => finite(v) && v >= lo && v <= hi;

/** Problems that make an arc unsafe to play. Empty when it is fine. */
export function validateArc(c: unknown): string[] {
  const L = ARC_LIMITS;
  const errors: string[] = [];
  const x = c as Partial<ArcComposition> | null;
  if (!x || typeof x !== 'object') return ['Not an object.'];
  if (x.schema !== ARC_SCHEMA) errors.push(`Unknown schema ${String(x.schema)}.`);
  if (!Array.isArray(x.movements) || x.movements.length === 0) return [...errors, 'No movements.'];
  let total = 0;
  for (const [i, m] of x.movements.entries()) {
    const at = `Movement ${i + 1}`;
    if (!m || typeof m !== 'object') {
      errors.push(`${at}: not an object.`);
      continue;
    }
    if (!within(m.fromHz, L.minHz, L.maxHz) || !within(m.toHz, L.minHz, L.maxHz)) errors.push(`${at}: rate outside ${L.minHz}–${L.maxHz} Hz.`);
    if (!within(m.seconds, L.minSeconds, L.maxSeconds)) errors.push(`${at}: length outside ${L.minSeconds}–${L.maxSeconds} s.`);
    if (!within(m.depth, 0.05, L.maxDepth)) errors.push(`${at}: depth outside 0.05–${L.maxDepth}.`);
    if (m.shape !== 'sine' && m.shape !== 'firm') errors.push(`${at}: unknown shape.`);
    if (!m.jitter || !within(m.jitter.pct, 0, L.maxJitter) || !within(m.jitter.every, L.minJitterEvery, L.maxJitterEvery)) {
      errors.push(`${at}: drift outside ±${L.maxJitter * 100}% / ${L.minJitterEvery}–${L.maxJitterEvery} s.`);
    }
    if (m.burst) {
      const b = m.burst;
      if (!within(b.hz, L.minHz, L.maxHz) || !within(b.on, 0.5, L.maxBurstOn) || !within(b.every, L.minBurstEvery, 120) || b.on >= b.every) {
        errors.push(`${at}: burst outside limits.`);
      }
    }
    if (m.breath && (!within(m.breath.hz, L.minBreathHz, L.maxBreathHz) || !within(m.breath.depth, 0.02, L.maxBreathDepth))) {
      errors.push(`${at}: breathing swell outside limits.`);
    }
    if (finite(m.seconds)) total += m.seconds;
  }
  if (total > L.maxTotalSeconds) errors.push(`Longer than ${L.maxTotalSeconds / 60} minutes.`);
  if (finite(x.totalSeconds) && Math.abs(x.totalSeconds - total) > 0.5) errors.push('Total length does not match the movements.');
  return errors;
}

/** One playable step for the wellness layer (domain/wellness/techniques.ts). */
export interface ArcStep {
  hz: number;
  toHz: number;
  seconds: number;
  depth: number;
  shape: ArcShape;
  jitter: { pct: number; every: number };
  burst?: { hz: number; on: number; every: number };
  breath?: { hz: number; depth: number };
}

export const arcSteps = (c: ArcComposition): ArcStep[] =>
  c.movements.map((m) => ({
    hz: m.fromHz,
    toHz: m.toHz,
    seconds: m.seconds,
    depth: m.depth,
    shape: m.shape,
    jitter: m.jitter,
    ...(m.burst ? { burst: m.burst } : {}),
    ...(m.breath ? { breath: m.breath } : {}),
  }));

/** A RenderPlan view of the arc (one step per movement), for the API and logs. */
export function planForArc(c: ArcComposition, name = 'Personal program'): RenderPlan {
  const errors = validateArc(c);
  if (errors.length) throw new Error(`Invalid arc: ${errors.join(' ')}`);
  let t = 0;
  const steps: PlanStep[] = c.movements.map((m, i) => {
    const s: PlanStep = {
      sourceIndex: i,
      sourceHz: m.fromHz,
      sourceRaw: String(m.fromHz),
      method: 'am',
      kind: 'modulation-rate',
      renderedHz: m.fromHz,
      depth: m.depth,
      startSeconds: t,
      durationSeconds: m.seconds,
      flags: [`movement:${m.id}`, ...(m.toHz !== m.fromHz ? [`glide-to:${m.toHz}`] : []), ...(m.burst ? [`burst:${m.burst.hz}`] : [])],
    };
    t += m.seconds;
    return s;
  });
  return {
    policyVersion: POLICY_VERSION,
    catalog: catalogRef(),
    programId: `arc:${contentHash(c).slice(0, 12)}`,
    programName: name,
    category: 'Personal',
    options: { strategy: 'pulse', includeTones: false, stepSeconds: steps[0]?.durationSeconds ?? 60 },
    steps,
    sequence: steps,
    passSeconds: t,
    renderable: steps.length > 0,
    arm: 'program',
  };
}
