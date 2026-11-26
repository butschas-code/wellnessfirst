/**
 * Wellness Waves — wellness-compliant explanations.
 *
 * Rules (see docs/frequency-integration/research/claims-register.md):
 * describe what you hear and the moment it is designed for; never claim an
 * effect on the body, brain, health or sleep; no "treats", "heals", "reduces
 * stress", "improves focus", "induces sleep"; say plainly that experiences vary.
 */

import type { Intent } from '../../engine/types/index';
import type { PlanStep, RenderPlan } from '../../engine/domain/programs/types';

export interface SpaceExplanation {
  title: string;
  /** One sentence, shown large. */
  lead: string;
  /** What you hear, in a sentence or two. */
  sound: string;
  /** Moments it is made for. */
  goodFor: string[];
  /** A small tip. */
  tip: string;
  /** Honesty note for this space. */
  note: string;
}

export const SPACE_EXPLANATIONS: Record<Intent, SpaceExplanation> = {
  focus: {
    title: 'Focus',
    lead: 'A calm, steady current to work in. It stays in the background, so your attention can stay on what matters.',
    sound: 'Warm chords that change slowly, a gentle tempo and no words. Nothing sudden to pull you away.',
    goodFor: ['Deep work', 'Studying', 'Writing', 'Reading', 'Coding'],
    tip: 'Start it as you begin a task and let it run. Take a short break every hour or so.',
    note: 'Music for your surroundings, not a treatment. Everyone experiences sound differently.',
  },
  relax: {
    title: 'Unwind',
    lead: 'For the space between a busy day and a quiet evening. The music slowly softens around you.',
    sound: 'Fuller, slower harmony in a soft, spacious room. Over half an hour it becomes calmer and warmer.',
    goodFor: ['After work', 'A slow evening', 'Reading', 'Stretching', 'Cooking'],
    tip: 'Let the music breathe for you, or breathe along with it.',
    note: 'Everyone experiences sound differently. If anything feels uncomfortable, lower the volume or stop.',
  },
  sleep: {
    title: 'Sleep',
    lead: 'A dark, slow soundscape to carry you into the night. It asks nothing of you.',
    sound: 'A low, sustained harmony with almost no events, thinning and darkening over the first half hour.',
    goodFor: ['Falling asleep', 'Bedtime routine', 'Night waking', 'Naps'],
    tip: 'Set the timer, keep the volume low and put the phone face down. It fades out on its own.',
    note: 'Not a treatment for sleep problems. If you often struggle to sleep, talk to a healthcare professional.',
  },
  meditate: {
    title: 'Stillness',
    lead: 'Open, spacious sound for quiet moments. No voice, no guidance: the attention is yours.',
    sound: 'Long, open chords over a steady low note, with an occasional bell. Nothing happens quickly.',
    goodFor: ['Meditation', 'Breathwork', 'Yoga', 'Journaling', 'A quiet pause'],
    tip: 'Sit comfortably, close your eyes and follow the ring with your breath.',
    note: 'Not a substitute for professional care. Experiences vary.',
  },
  energy: {
    title: 'Energy',
    lead: 'Bright, rhythmic sound with a lift in it. Made for mornings, movement and getting going.',
    sound: 'A quicker tempo, open major harmony and a rolling pulse that warms up over the first minutes and then keeps you moving.',
    goodFor: ['Morning start', 'Workout', 'Running', 'Walking', 'Chores'],
    tip: 'Turn it up a little for training; it holds a steady pace you can move to.',
    note: 'Listen at a comfortable volume, and never in situations that need your full hearing, such as traffic.',
  },
  balance: {
    title: 'Balance',
    lead: 'Warm, even sound for finding your middle again, whatever kind of day it has been.',
    sound: 'Gentle, consonant harmony at an easy pace. Nothing sharp, nothing sad, no surprises.',
    goodFor: ['After a hard moment', 'Journaling', 'A quiet break', 'Reflection', 'Commuting'],
    tip: 'Give it ten minutes. Breathe with the swell and let your thoughts settle at their own pace.',
    note: 'Not a substitute for mental health care. If you are struggling, please reach out to someone you trust or a professional.',
  },
  recover: {
    title: 'Recover',
    lead: 'Slow, low and warm. A place to rest after effort, from training to a long week.',
    sound: 'Deep, unhurried harmony with ocean and hearth sounds. Over forty minutes it grows darker and softer.',
    goodFor: ['After a workout', 'Stretching', 'Massage', 'Bath', 'Lying down'],
    tip: 'Lie down if you can, and let the sound get slower with you.',
    note: 'Not a medical or physiotherapy treatment. Experiences vary.',
  },
};

/** What each catalog category is designed for, phrased as moments, not outcomes. */
export const CATEGORY_EXPLANATIONS: Record<string, string> = {
  'Relaxation & Stress Balance': 'Sequences chosen for unwinding moments: after work, between meetings, before an evening at home.',
  'Sleep & Night Recovery': 'Sequences chosen to accompany your bedtime routine, played as very slow swells beneath the music.',
  'Energy & Vitality': 'Sequences chosen for active parts of the day, such as mornings and getting started.',
  'Mental Focus & Clarity': 'Sequences chosen to sit under work and study sessions.',
  'Emotional Balance': 'Sequences chosen for reflective, quieter moments.',
  'Physical Ease & Recovery': 'Sequences chosen to accompany rest after activity, stretching or a quiet evening.',
  'Movement & Activity Support': 'Sequences chosen to accompany warm-ups, walks and light activity.',
  'Digestive & Metabolic Balance': 'Sequences chosen for calm moments around meals. Purely a listening choice; no effect on the body is claimed.',
  'Mindfulness & Inner Awareness': 'Sequences chosen for meditation, breathing exercises and stillness.',
  'Daily Balance & Preventive Care': 'Sequences chosen to mark the rhythm of the day: morning, afternoon and evening routines.',
};

/** Shown with every program. Required wording (pack prompt 04). */
export const PROGRAM_DISCLAIMER =
  'This adds subtle sound modulation based on a frequency sequence from our own library, first made for frequency-wellness devices. It does not generate PEMF and has not been shown to reproduce the effects proposed for those devices.';

/** Plain description of what a program sounds like, generated from its plan. */
export function describeProgramSound(plan: RenderPlan): string {
  const count = (m: PlanStep['method']) => plan.sequence.filter((s) => s.method === m).length;
  const parts: string[] = [];
  const swells = count('swell');
  const pulses = count('am');
  const binaural = count('binaural');
  const tones = count('tone');
  if (swells) parts.push(`${swells} slow ${swells === 1 ? 'swell' : 'swells'}`);
  if (pulses) parts.push(`${pulses} soft ${pulses === 1 ? 'pulse' : 'pulses'}`);
  if (binaural) parts.push(`${binaural} binaural ${binaural === 1 ? 'step' : 'steps'}`);
  if (tones) parts.push(`${tones} quiet ${tones === 1 ? 'tone' : 'tones'}`);
  const minutes = Math.round(plan.passSeconds / 60);
  return `You hear ${parts.join(', ')} under the music, one after another, about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} for the whole sequence before it begins again.`;
}
