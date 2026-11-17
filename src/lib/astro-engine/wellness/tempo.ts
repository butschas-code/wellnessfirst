import type {
  ElementType,
  JanamKundliResult,
  PlanetPosition,
  DashaPeriod,
} from '../types.ts';

export interface TempoWellnessGuidance {
  primaryElement: ElementType;
  secondaryElement: ElementType;
  elementalSummary: string;
  seasonFocus: {
    dashaLord: string;
    subLord: string;
    theme: string;
    nervousSystemTempo: string;
    workRecommendation: string;
    sleepAndRecovery: string;
  };
  dailyRhythms: {
    morningRitual: string;
    deepWorkWindow: string;
    downRegulation: string;
  };
}

export function calculateElementBalance(
  ascendantElement: ElementType,
  planets: Record<string, PlanetPosition>
): Record<ElementType, number> {
  const balance: Record<ElementType, number> = {
    Fire: 0,
    Earth: 0,
    Air: 0,
    Water: 0,
  };

  // Weight Ascendant heavily (2 points)
  balance[ascendantElement] += 2;

  // Weight Sun and Moon heavily (2 points each)
  balance[planets.Sun.sign.element] += 2;
  balance[planets.Moon.sign.element] += 2;

  // Other planets (1 point each)
  const remaining = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  for (const name of remaining) {
    const el = planets[name].sign.element;
    balance[el] += 1;
  }

  return balance;
}

export function generateTempoGuidance(
  chart: JanamKundliResult,
  currentDasha: { mahadasha: DashaPeriod; antardasha: DashaPeriod }
): TempoWellnessGuidance {
  const elements = Object.entries(chart.elementBalance).sort((a, b) => b[1] - a[1]);
  const primaryElement = elements[0][0] as ElementType;
  const secondaryElement = elements[1][0] as ElementType;

  const elementDescriptions: Record<ElementType, string> = {
    Fire: 'High metabolic drive and spontaneous inspiration. Prone to heat depletion and over-extension if rest is delayed.',
    Earth: 'Steady physical endurance, grounded somatic intuition. Thrives on stable routines and gradual compounding.',
    Air: 'Rapid synaptic processing, high ideation. Needs deliberate sensory anchoring to soothe sympathetic overdrive.',
    Water: 'Deep somatic receptivity, empathetic awareness. Vital to protect boundaries and prioritize emotional detox.',
  };

  const dashaThemes: Record<string, { theme: string; tempo: string; work: string; recovery: string }> = {
    Sun: {
      theme: 'Solar Sovereignty & Core Identity',
      tempo: 'Deliberate, centered, and high-visibility pacing.',
      work: 'Step into leadership and structural decisions; say no to low-leverage obligations.',
      recovery: 'Early morning sunlight exposure; posture-lengthening stretches.',
    },
    Moon: {
      theme: 'Emotional Reclamation & Cyclic Nourishment',
      tempo: 'Fluctuating, intuitive, cyclical.',
      work: 'Prioritize creative ideation, writing, care-giving, and collaborative community.',
      recovery: 'Warm magnesium baths, screen-free evenings, and emotional journaling.',
    },
    Mars: {
      theme: 'Vital Enterprise & Protective Drive',
      tempo: 'High-torque, focused bursts.',
      work: 'Tackle formidable projects, physical construction, and overdue negotiations.',
      recovery: 'Cold plunges, high-intensity intervals followed by conscious breathwork to avoid inflammation.',
    },
    Rahu: {
      theme: 'Accelerated Learning & Pattern Disruption',
      tempo: 'Electric, unconventional, non-linear.',
      work: 'Pioneer novel technologies, global outreach, and cross-disciplinary work.',
      recovery: 'Heavy nervous-system grounding: walk barefoot on soil, minimize caffeine.',
    },
    Jupiter: {
      theme: 'Dharmic Expansion & Wisdom Synthesis',
      tempo: 'Generous, spacious, dignified.',
      work: 'Publishing, mentorship, long-term strategic vision, and philosophical study.',
      recovery: 'Generous sleep margins, walking in open nature, restorative yoga.',
    },
    Saturn: {
      theme: 'Structural Endurance & Essential Purity',
      tempo: 'Measured, rhythmic, long-range.',
      work: 'Simplifying systems, institutional building, and eliminating frivolous waste.',
      recovery: 'Consistent circadian sleep schedule; joint mobility work and warm herbal infusions.',
    },
    Mercury: {
      theme: 'Discernment, Translation & Fluid Skill',
      tempo: 'Agile, communicative, modular.',
      work: 'Editing, commerce, publishing, programming, and relationship networks.',
      recovery: 'Scheduled digital fasts, silence windows, and pranayama.',
    },
    Ketu: {
      theme: 'Subconscious Mastery & Non-Attachment',
      tempo: 'Introspective, subtle, meditative.',
      work: 'Deep technical architecture, research, closure of past loops, and spiritual practices.',
      recovery: 'Solitary retreats, sound baths, yoga nidra, and nervous-system quietude.',
    },
    Venus: {
      theme: 'Aesthetic Harmony, Restorative Ease & Relational Trust',
      tempo: 'Harmonious, sensory-rich, balanced.',
      work: 'Design, partnership cultivation, brand refinement, and artistic creation.',
      recovery: 'Sensory beauty, nourishing farm-fresh meals, massage, and gentle movement.',
    },
  };

  const md = currentDasha.mahadasha.lord;
  const ad = currentDasha.antardasha.lord;
  const defaultTheme = dashaThemes[md] || dashaThemes.Sun;

  return {
    primaryElement,
    secondaryElement,
    elementalSummary: `${elementDescriptions[primaryElement]} Balanced by ${secondaryElement.toLowerCase()} stability.`,
    seasonFocus: {
      dashaLord: md,
      subLord: ad,
      theme: defaultTheme.theme,
      nervousSystemTempo: defaultTheme.tempo,
      workRecommendation: defaultTheme.work,
      sleepAndRecovery: defaultTheme.recovery,
    },
    dailyRhythms: {
      morningRitual: 'Hydration with unrefined salt, 10 minutes of direct sky gaze before screens, gentle spinal articulation.',
      deepWorkWindow: 'Mid-morning (09:30 - 12:30), matching solar elevation for highest cognitive clarity.',
      downRegulation: 'Evening digital twilight starting at 20:30; amber lighting to honor melatonin synthesis.',
    },
  };
}
