/**
 * Frequency programs — types.
 *
 * Three layers are kept strictly apart:
 *   1. Source catalog   — CanonicalProgram: exactly what the workbook says.
 *   2. Adaptation policy — authored, versioned choices about how a value may be heard.
 *   3. Render plan       — the concrete, deterministic schedule the audio engine runs.
 * Nothing in layers 2–3 is attributed to the source.
 */

import { z } from 'zod';

export const CanonicalFrequencySchema = z.object({
  index: z.number().int().nonnegative(),
  hz: z.number().positive().finite(),
  /** Cell text exactly as written in the workbook (e.g. "15" vs "15.0"). */
  raw: z.string().min(1),
});

export const CanonicalProgramSchema = z.object({
  id: z.string().regex(/^[a-z]{4}_\d{3}$/),
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  frequencyCount: z.number().int().positive(),
  frequencies: z.array(CanonicalFrequencySchema).min(1),
  sourceRow: z.number().int().positive(),
});

export const CanonicalCatalogSchema = z.object({
  schema: z.literal('infinity-sound/canonical-program-catalog'),
  importVersion: z.string(),
  source: z.object({
    file: z.string(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    sheets: z.array(z.string()),
    note: z.string(),
  }),
  categories: z.array(
    z.object({ name: z.string(), declaredProgramCount: z.number().int().positive(), sourceRow: z.number().int() })
  ),
  programs: z.array(CanonicalProgramSchema),
  importIssues: z.array(z.string()),
});

export type CanonicalFrequency = z.infer<typeof CanonicalFrequencySchema>;
export type CanonicalProgram = z.infer<typeof CanonicalProgramSchema>;
export type CanonicalCatalog = z.infer<typeof CanonicalCatalogSchema>;

/** How the listener chose to hear a program. */
export type RenderStrategy = 'pulse' | 'binaural';

/** How one step is actually rendered. */
export type StepMethod = 'swell' | 'am' | 'binaural' | 'tone' | 'skipped';

/** What the rendered number means physically — never conflated. */
export type RenderedKind = 'modulation-rate' | 'beat-difference' | 'literal-pitch' | 'none';

export interface RenderOptions {
  strategy: RenderStrategy;
  /** Also play 40–1000 Hz values as soft tones at their literal pitch. */
  includeTones: boolean;
  /** Authored step length in seconds. The catalog specifies none. */
  stepSeconds: number;
}

export interface PlanStep {
  /** Position in the source program's ordered list. */
  sourceIndex: number;
  sourceHz: number;
  sourceRaw: string;
  method: StepMethod;
  kind: RenderedKind;
  /** Hz actually rendered: modulation rate, beat difference or tone pitch. */
  renderedHz: number;
  /** Relative modulation depth 0–1 (AM/swell) or relative level (binaural/tone). */
  depth: number;
  /** Offset within one pass of the sequence (skipped steps take no time). */
  startSeconds: number;
  durationSeconds: number;
  flags: string[];
  reason?: string;
  /** Catalog program the value comes from (set for compositions, which mix programs). */
  sourceProgramId?: string;
}

export interface RenderPlan {
  policyVersion: string;
  catalog: { importVersion: string; sha256: string; file: string };
  programId: string;
  programName: string;
  category: string;
  options: RenderOptions;
  /** Every source value in order, including skipped ones with their reason. */
  steps: PlanStep[];
  /** Rendered steps only, in order — what the engine loops. */
  sequence: PlanStep[];
  passSeconds: number;
  renderable: boolean;
  /** 'program' for the real catalog sequence, 'control' for the matched control arm. */
  arm: 'program' | 'control';
}
