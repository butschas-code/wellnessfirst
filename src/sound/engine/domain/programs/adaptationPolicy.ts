/**
 * Frequency programs — audio adaptation policy (authored, versioned).
 *
 * The workbook gives ordered frequency values and nothing else: no durations,
 * waveforms, depths or mechanisms. Everything below is OUR design choice for
 * turning a value into something audible, kept conservative and labelled as
 * such. It is not a therapeutic prescription and does not reproduce PEMF.
 *
 * Bands (policy 1.0.0):
 *   0.05 – <0.5 Hz  swell     slow amplitude breathing at the literal rate
 *   0.5  – 40 Hz    am        "Pulse": amplitude modulation at the literal rate
 *   0.5  – 30 Hz    binaural  headphones: left/right carriers differ by the literal value
 *   >40  – 1000 Hz  tone      optional soft sine at the literal pitch (off by default)
 *   >1000 Hz        skipped   above a comfortable sustained-tone range
 */

import type { CanonicalProgram, PlanStep, RenderOptions, RenderPlan, StepMethod } from './types';

export const POLICY_VERSION = '1.0.0';

export const POLICY = {
  swellMaxHz: 0.5,
  amMaxHz: 40,
  binauralMinHz: 0.5,
  binauralMaxHz: 30,
  toneMaxHz: 1000,
  /** Tones below this are inaudible or distorted on phone/laptop speakers. */
  speakerFloorHz: 60,
  /** Above this, AM reads as roughness; depth is eased down towards amMaxHz. */
  amRoughnessHz: 12,
  defaultStepSeconds: 60,
  minStepSeconds: 20,
  maxStepSeconds: 300,
  /** Linear glide between consecutive steps (seconds). */
  transitionSeconds: 4,
  swellDepth: 0.7,
  amDepth: 0.55,
  /** Matched control: each rendered rate is moved by this ratio, order reversed. */
  controlRatio: 1.37,
} as const;

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  strategy: 'pulse',
  includeTones: false,
  stepSeconds: POLICY.defaultStepSeconds,
};

/**
 * Secondary browsing taxonomy (authored, not source): which release a program
 * starts on when nothing is playing. Source categories are never renamed.
 */
export const CATEGORY_TO_INTENT: Record<string, 'focus' | 'relax' | 'sleep' | 'meditate'> = {
  'Relaxation & Stress Balance': 'relax',
  'Sleep & Night Recovery': 'sleep',
  'Energy & Vitality': 'focus',
  'Mental Focus & Clarity': 'focus',
  'Emotional Balance': 'relax',
  'Physical Ease & Recovery': 'relax',
  'Movement & Activity Support': 'focus',
  'Digestive & Metabolic Balance': 'relax',
  'Mindfulness & Inner Awareness': 'meditate',
  'Daily Balance & Preventive Care': 'relax',
};

interface Resolution {
  method: StepMethod;
  kind: PlanStep['kind'];
  depth: number;
  flags: string[];
  reason?: string;
}

/** Decides how one source value is heard under the chosen options. Pure. */
export function resolveStep(hz: number, opts: RenderOptions): Resolution {
  const flags: string[] = [];
  if (!(hz > 0) || !Number.isFinite(hz)) {
    return { method: 'skipped', kind: 'none', depth: 0, flags, reason: 'Not a positive, finite number.' };
  }
  if (hz < POLICY.swellMaxHz) {
    return { method: 'swell', kind: 'modulation-rate', depth: POLICY.swellDepth, flags };
  }
  if (opts.strategy === 'binaural') {
    if (hz <= POLICY.binauralMaxHz) {
      return { method: 'binaural', kind: 'beat-difference', depth: 1, flags };
    }
    if (hz <= POLICY.amMaxHz) {
      return {
        method: 'skipped',
        kind: 'none',
        depth: 0,
        flags,
        reason: `Above the ${POLICY.binauralMaxHz} Hz range in which a binaural difference is perceived. Choose Pulse to hear it.`,
      };
    }
  } else if (hz <= POLICY.amMaxHz) {
    let depth: number = POLICY.amDepth;
    if (hz > POLICY.amRoughnessHz) {
      const t = (hz - POLICY.amRoughnessHz) / (POLICY.amMaxHz - POLICY.amRoughnessHz);
      depth = POLICY.amDepth * (1 - 0.6 * t);
      flags.push('depth-eased-for-roughness');
    }
    return { method: 'am', kind: 'modulation-rate', depth, flags };
  }
  if (hz <= POLICY.toneMaxHz) {
    if (!opts.includeTones) {
      return {
        method: 'skipped',
        kind: 'none',
        depth: 0,
        flags,
        reason: `Above the ${POLICY.amMaxHz} Hz modulation range. Turn on “Also play higher values as tones” to hear it as a pitch.`,
      };
    }
    if (hz < POLICY.speakerFloorHz) flags.push('below-small-speaker-range');
    return { method: 'tone', kind: 'literal-pitch', depth: 1, flags };
  }
  return {
    method: 'skipped',
    kind: 'none',
    depth: 0,
    flags,
    reason: `Above ${POLICY.toneMaxHz} Hz: a sustained pure tone this high is shrill, so it is not rendered.`,
  };
}

const clampStep = (s: number) => Math.max(POLICY.minStepSeconds, Math.min(POLICY.maxStepSeconds, Math.round(s)));

/** Deterministic render plan for a program. Same inputs → identical plan. */
export function planFor(program: CanonicalProgram, catalog: RenderPlan['catalog'], options: Partial<RenderOptions> = {}): RenderPlan {
  const opts: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  opts.stepSeconds = clampStep(opts.stepSeconds);
  let t = 0;
  const steps: PlanStep[] = program.frequencies.map((f) => {
    const r = resolveStep(f.hz, opts);
    const rendered = r.method !== 'skipped';
    const step: PlanStep = {
      sourceIndex: f.index,
      sourceHz: f.hz,
      sourceRaw: f.raw,
      method: r.method,
      kind: r.kind,
      renderedHz: rendered ? f.hz : 0,
      depth: r.depth,
      startSeconds: rendered ? t : t,
      durationSeconds: rendered ? opts.stepSeconds : 0,
      flags: [...r.flags],
      reason: r.reason,
    };
    if (rendered && r.method === 'swell' && opts.stepSeconds * f.hz < 2) {
      step.flags.push('fewer-than-two-cycles-per-step');
    }
    if (rendered) t += opts.stepSeconds;
    return step;
  });
  const sequence = steps.filter((s) => s.method !== 'skipped');
  return {
    policyVersion: POLICY_VERSION,
    catalog,
    programId: program.id,
    programName: program.name,
    category: program.category,
    options: opts,
    steps,
    sequence,
    passSeconds: t,
    renderable: sequence.length > 0,
    arm: 'program',
  };
}

/**
 * Matched control arm for blinded comparison: identical methods, depths,
 * durations and step count (so loudness and roughness stay comparable), but
 * every rendered rate is moved by a fixed ratio within its own band and the
 * order is reversed. It is deliberately NOT the catalog sequence.
 */
export function controlPlanFor(plan: RenderPlan): RenderPlan {
  const bandMax = (m: StepMethod) =>
    m === 'swell' ? POLICY.swellMaxHz : m === 'binaural' ? POLICY.binauralMaxHz : m === 'am' ? POLICY.amMaxHz : POLICY.toneMaxHz;
  const bandMin = (m: StepMethod) => (m === 'swell' ? 0.05 : m === 'tone' ? POLICY.amMaxHz : POLICY.binauralMinHz);
  const moved = [...plan.sequence].reverse().map((s, i) => {
    let hz = s.renderedHz * POLICY.controlRatio;
    if (hz >= bandMax(s.method)) hz = s.renderedHz / POLICY.controlRatio;
    hz = Math.max(bandMin(s.method), Math.min(bandMax(s.method) * 0.999, hz));
    return {
      ...s,
      renderedHz: Math.round(hz * 1000) / 1000,
      startSeconds: i * plan.options.stepSeconds,
      flags: [...s.flags, 'control-arm'],
    };
  });
  return { ...plan, arm: 'control', sequence: moved, steps: moved };
}

/** Human description of a step, used in the UI and render manifests. */
export function describeStep(s: PlanStep): string {
  const hz = s.renderedHz < 1 ? s.renderedHz.toFixed(2) : s.renderedHz < 10 ? s.renderedHz.toFixed(2) : s.renderedHz.toFixed(1);
  switch (s.method) {
    case 'swell':
      return `${hz} Hz slow swell (one rise every ${(1 / s.renderedHz).toFixed(1)} s)`;
    case 'am':
      return `${hz} Hz pulse`;
    case 'binaural':
      return `${hz} Hz binaural difference`;
    case 'tone':
      return `${hz} Hz tone`;
    default:
      return 'not rendered';
  }
}
