/**
 * planForComposition — a composition → the RenderPlan the engine loops.
 *
 * Each phase goes through the existing adaptation policy (`planFor`) on the
 * catalog program reduced to the listed values; the phases are then joined in
 * order and every step records `sourceProgramId`. FrequencyLayer and the
 * wellness layer play it unchanged, and loop it like any program.
 */

import type { CanonicalProgram, PlanStep, RenderOptions, RenderPlan } from '../domain/programs/types';
import { catalog, catalogRef, programById } from '../domain/programs/catalog';
import { POLICY, POLICY_VERSION, planFor } from '../domain/programs/adaptationPolicy';
import { COMPOSITION_SCHEMA, type Composition } from './types';
import { contentHash } from './hash';

/** Problems that make a composition unsafe to play (wrong schema, values not in the catalog, …). */
export function validateComposition(c: unknown): string[] {
  const errors: string[] = [];
  const x = c as Partial<Composition> | null;
  if (!x || typeof x !== 'object') return ['Not an object.'];
  if (x.schema !== COMPOSITION_SCHEMA) errors.push(`Unknown schema ${String(x.schema)}.`);
  if (!Array.isArray(x.phases) || x.phases.length === 0) errors.push('No phases.');
  const cat = catalog();
  if (x.versions && x.versions.catalogSha !== cat.source.sha256) errors.push('Made with a different catalog.');
  for (const [i, p] of (x.phases ?? []).entries()) {
    const prog = programById(p?.sourceProgramId);
    if (!prog) {
      errors.push(`Phase ${i + 1}: unknown catalog program ${String(p?.sourceProgramId)}.`);
      continue;
    }
    if (!Array.isArray(p.frequencyIndices) || !p.frequencyIndices.length) errors.push(`Phase ${i + 1}: no values.`);
    for (const idx of p.frequencyIndices ?? []) {
      if (!prog.frequencies.some((f) => f.index === idx)) errors.push(`Phase ${i + 1}: ${prog.id} has no value at index ${idx}.`);
    }
    if (!(p.stepSeconds >= POLICY.minStepSeconds && p.stepSeconds <= POLICY.maxStepSeconds)) {
      errors.push(`Phase ${i + 1}: step length outside ${POLICY.minStepSeconds}–${POLICY.maxStepSeconds} s.`);
    }
  }
  return errors;
}

export function planForComposition(c: Composition, name = 'Personal program'): RenderPlan {
  const errors = validateComposition(c);
  if (errors.length) throw new Error(`Invalid composition: ${errors.join(' ')}`);
  const steps: PlanStep[] = [];
  let t = 0;
  let options: RenderOptions | null = null;
  for (const phase of c.phases) {
    const prog = programById(phase.sourceProgramId)!;
    const frequencies = phase.frequencyIndices.map((idx) => prog.frequencies.find((f) => f.index === idx)!);
    const subset: CanonicalProgram = { ...prog, frequencies, frequencyCount: frequencies.length };
    const plan = planFor(subset, catalogRef(), { strategy: 'pulse', includeTones: false, stepSeconds: phase.stepSeconds });
    options ??= plan.options;
    for (const s of plan.steps) {
      steps.push({ ...s, sourceProgramId: prog.id, startSeconds: t + s.startSeconds, flags: [...s.flags, `phase:${phase.role}`] });
    }
    t += plan.passSeconds;
  }
  const sequence = steps.filter((s) => s.method !== 'skipped');
  return {
    policyVersion: POLICY_VERSION,
    catalog: catalogRef(),
    programId: `composition:${contentHash(c).slice(0, 12)}`,
    programName: name,
    category: 'Personal',
    options: options ?? { strategy: 'pulse', includeTones: false, stepSeconds: POLICY.defaultStepSeconds },
    steps,
    sequence,
    passSeconds: t,
    renderable: sequence.length > 0,
    arm: 'program',
  };
}
