/**
 * Life Rhythm — plain-English copy layer.
 *
 * The engine speaks astrology (dashas, choghadiya, ashtakoota…). This file translates its
 * structured output into calm, unambiguous, actionable language for the Simple view.
 * Rules: no Sanskrit, no degrees, no promises, no medical/financial claims. Timing and pacing only.
 */
import type { PlanetName, ElementType } from './astro-engine/types.ts';

export interface ChapterCopy {
  /** Short noun phrase, e.g. "Building steadily". */
  short: string;
  /** Headline, e.g. "A season of building steadily". */
  title: string;
  summary: string;
  leanInto: [string, string, string];
  goEasy: [string, string];
  pace: string;
  /** Phrase used for a sub-period: "Right now the focus is on …". */
  focus: string;
}

export const CHAPTERS: Record<PlanetName, ChapterCopy> = {
  Sun: {
    short: 'Stepping forward',
    title: 'A season of stepping forward',
    summary:
      'This chapter tends to bring attention to who you are and what you stand for. It suits being clear about your direction and owning your decisions.',
    leanInto: [
      'Make the decision you have been putting off',
      'Take the lead on one thing that matters to you',
      'Get daylight early in the day',
    ],
    goEasy: ['Carrying everyone else’s priorities', 'Pushing so hard that rest gets skipped'],
    pace: 'Steady and deliberate',
    focus: 'direction and visibility',
  },
  Moon: {
    short: 'Care & connection',
    title: 'A season of care and connection',
    summary:
      'This chapter tends to put home, family and feelings at the centre. Energy can rise and fall more than usual, so a gentle routine helps.',
    leanInto: [
      'Make time for the people closest to you',
      'Keep regular meal and sleep times',
      'Write things down when your mind is busy',
    ],
    goEasy: ['Big decisions on a low day', 'Saying yes when you need rest'],
    pace: 'Gentle, with natural ups and downs',
    focus: 'home and wellbeing',
  },
  Mars: {
    short: 'Effort & courage',
    title: 'A season of effort and courage',
    summary:
      'This chapter tends to bring more drive and less patience. It suits tackling hard things head-on, as long as you also make room to cool down.',
    leanInto: [
      'Start the task you have been avoiding',
      'Move your body every day',
      'Have the honest conversation, calmly',
    ],
    goEasy: ['Rushing or reacting in anger', 'Training hard without recovery'],
    pace: 'Focused bursts with real breaks',
    focus: 'energy and getting things done',
  },
  Mercury: {
    short: 'Learning & communicating',
    title: 'A season of learning and communicating',
    summary:
      'This chapter tends to favour skills, writing, conversations and trade. Your mind may be busier than usual, so short focused blocks work best.',
    leanInto: [
      'Learn a new skill or take a course',
      'Write, pitch or share your ideas',
      'Clear loose ends and paperwork',
    ],
    goEasy: ['Juggling too many things at once', 'Screens late into the evening'],
    pace: 'Quick and flexible, in short blocks',
    focus: 'communication and learning',
  },
  Jupiter: {
    short: 'Growth & perspective',
    title: 'A season of growth and perspective',
    summary:
      'This chapter tends to open space for study, teaching and a wider view of life. It suits thinking long-term and sharing what you know.',
    leanInto: [
      'Plan for the long term, not just this month',
      'Teach, mentor or help someone',
      'Make time for reading and reflection',
    ],
    goEasy: ['Over-promising or over-committing', 'Overdoing it because things feel good'],
    pace: 'Spacious and unhurried',
    focus: 'growth and long-term plans',
  },
  Venus: {
    short: 'Relationships & enjoyment',
    title: 'A season of relationships and enjoyment',
    summary:
      'This chapter tends to bring partnerships, beauty and comfort into focus. It suits creative work and investing in the relationships that matter.',
    leanInto: [
      'Invest time in your closest relationships',
      'Make something — design, cook, create',
      'Make your space feel calm and cared for',
    ],
    goEasy: ['Keeping the peace at your own expense', 'Spending to feel better'],
    pace: 'Balanced and easy-going',
    focus: 'relationships and creativity',
  },
  Saturn: {
    short: 'Building steadily',
    title: 'A season of building steadily',
    summary:
      'This chapter tends to reward patience, structure and consistent effort. Progress can feel slow, but what you build now is built to last.',
    leanInto: [
      'Pick one long-term goal and work on it daily',
      'Simplify — let go of what no longer serves you',
      'Keep a regular sleep schedule',
    ],
    goEasy: ['Expecting quick results', 'Being too hard on yourself'],
    pace: 'Slow, steady and consistent',
    focus: 'structure and discipline',
  },
  Rahu: {
    short: 'New directions',
    title: 'A season of new directions',
    summary:
      'This chapter tends to bring ambition, change and unfamiliar paths. It can feel exciting and unsettling at once, so simple grounding habits matter.',
    leanInto: [
      'Explore an idea or place that is new to you',
      'Say yes to change that is useful',
      'Keep simple daily anchors — walks, meals, sleep',
    ],
    goEasy: ['Chasing every new opportunity', 'More caffeine, less rest'],
    pace: 'Fast and changeable — keep it anchored',
    focus: 'change and new opportunities',
  },
  Ketu: {
    short: 'Letting go',
    title: 'A season of letting go',
    summary:
      'This chapter tends to turn attention inward. It suits finishing old projects, simplifying and reflecting, more than starting big new ones.',
    leanInto: [
      'Finish or close old projects',
      'Clear your home and your calendar',
      'Make time for quiet — walks, stillness, rest',
    ],
    goEasy: ['Forcing big new starts', 'Cutting yourself off from people'],
    pace: 'Quiet and reflective',
    focus: 'simplifying and reflection',
  },
};

export interface StrengthCopy {
  title: string;
  natural: string;
  effort: string;
}

/** Used for the seven classical bodies scored by the strength engine. */
export const STRENGTHS: Record<string, StrengthCopy> = {
  Sun: {
    title: 'Direction',
    natural: 'You tend to know what you want and are comfortable taking the lead.',
    effort: 'Trusting your own direction may take practice. Small, regular decisions build it.',
  },
  Moon: {
    title: 'Emotional awareness',
    natural: 'You tend to read people well and look after those around you.',
    effort: 'Moods may swing more than you would like. Steady routines help a lot.',
  },
  Mars: {
    title: 'Stamina',
    natural: 'You tend to have the energy and courage to get hard things done.',
    effort: 'Getting started can be the hardest part. Short, timed bursts help.',
  },
  Mercury: {
    title: 'Clear thinking',
    natural: 'You tend to think quickly and explain things clearly.',
    effort: 'Staying focused and organised may take effort. Lists and fewer tabs help.',
  },
  Jupiter: {
    title: 'Perspective',
    natural: 'You tend to see the bigger picture and stay hopeful.',
    effort: 'The bigger picture can get lost in the day-to-day. A weekly review helps.',
  },
  Venus: {
    title: 'Warmth',
    natural: 'You tend to build easy relationships and care about how things feel.',
    effort: 'Pleasure and rest can slip down the list. Put them in the diary.',
  },
  Saturn: {
    title: 'Staying power',
    natural: 'You tend to be patient and disciplined, and you finish what you start.',
    effort: 'Routines may not come naturally. Start with one small habit.',
  },
};

export interface ElementCopy {
  label: string;
  meaning: string;
  adjective: string;
  withPhrase: string;
  care: string;
}

export const ELEMENTS: Record<ElementType, ElementCopy> = {
  Fire: {
    label: 'Drive',
    meaning: 'Energy, enthusiasm, getting started',
    adjective: 'Driven',
    withPhrase: 'with a spark of drive',
    care: 'You may push past tiredness without noticing. Plan rest before you need it.',
  },
  Earth: {
    label: 'Steadiness',
    meaning: 'Practical, patient, reliable',
    adjective: 'Grounded',
    withPhrase: 'with a practical streak',
    care: 'Routine suits you. Change things up now and then so you don’t get stuck.',
  },
  Air: {
    label: 'Ideas',
    meaning: 'Thinking, talking, connecting',
    adjective: 'Curious',
    withPhrase: 'with a lively mind',
    care: 'Your mind runs fast. Time outdoors and away from screens helps you settle.',
  },
  Water: {
    label: 'Feeling',
    meaning: 'Intuition, empathy, care',
    adjective: 'Intuitive',
    withPhrase: 'with a caring side',
    care: 'You pick up on other people’s moods. Quiet time alone helps you recharge.',
  },
};

export type DayLevel = 'good' | 'steady' | 'light';

export const DAY_TONE: Record<
  string,
  { level: DayLevel; label: string; headline: string; body: string; do: string[]; avoid: string[] }
> = {
  'Highly Supportive': {
    level: 'good',
    label: 'Supportive day',
    headline: 'A good day to move things forward',
    body: 'Conditions today lean in your favour. A good day to start something, ask for something, or make a decision.',
    do: ['Start something you have been planning', 'Send the message or have the conversation'],
    avoid: ['Filling every gap in your diary'],
  },
  'Constructive Pacing': {
    level: 'steady',
    label: 'Steady day',
    headline: 'A steady day — keep a normal pace',
    body: 'Nothing pushes strongly either way today. Stick to your plan and do the important things first.',
    do: ['Finish what is already in motion', 'Do your hardest task in your best hours'],
    avoid: ['Starting too many new things at once'],
  },
  'Challenging / Preservative': {
    level: 'light',
    label: 'Lighter day',
    headline: 'A day for a lighter load',
    body: 'Today asks for patience. Do what is needed, leave big decisions for another day, and protect your rest.',
    do: ['Keep your list short — three things is plenty', 'Get outside and move gently'],
    avoid: ['Big decisions or tense negotiations', 'A late night'],
  },
};

export type HourTone = 'good' | 'neutral' | 'quiet';

export const HOURS: Record<string, { label: string; tip: string; tone: HourTone }> = {
  Amrit: { label: 'Clear & calm', tip: 'Important starts and focused work', tone: 'good' },
  Shubh: { label: 'Good for people', tip: 'Meetings, conversations, creative work', tone: 'good' },
  Labh: { label: 'Good for practical work', tip: 'Planning, learning, money matters', tone: 'good' },
  Char: { label: 'Good for getting around', tip: 'Errands, travel, admin', tone: 'neutral' },
  Rog: { label: 'Low energy', tip: 'Routine tasks — avoid arguments', tone: 'quiet' },
  Kaal: { label: 'Low energy', tip: 'Tidying, clearing, quiet work', tone: 'quiet' },
  Udveg: { label: 'Restless', tip: 'A walk or a break to settle', tone: 'quiet' },
};

export const ASK_LEVEL: Record<'green' | 'amber' | 'red', { label: string; headline: string; body: string }> = {
  green: {
    label: 'Supportive',
    headline: 'The timing looks supportive',
    body: 'Conditions lean towards moving ahead. Still check the practical details — they matter more than timing.',
  },
  amber: {
    label: 'With care',
    headline: 'Possible — with some care',
    body: 'Moving ahead is reasonable once you are clear on the details. Take one small step first and see how it goes.',
  },
  red: {
    label: 'Wait a little',
    headline: 'Worth waiting a little',
    body: 'The timing suggests a pause. Use it to gather information and settle what is still unclear, then look again in a week or two.',
  },
};

export const ASK_TOPIC: Record<string, { label: string; steps: [string, string, string] }> = {
  'Travel & Journeys': {
    label: 'Travel',
    steps: [
      'Leave extra time between connections',
      'Travel during the day where you can',
      'Keep the first day after arriving light',
    ],
  },
  'Relocation & Sanctuary': {
    label: 'Moving home',
    steps: [
      'Visit at different times of day before committing',
      'Get the full costs in writing',
      'Give yourself time to settle in',
    ],
  },
  'Career & Enterprise': {
    label: 'Work',
    steps: [
      'Get the key details in writing',
      'Speak with the person who actually decides',
      'Prepare your main points in advance',
    ],
  },
  'Capital & Investment': {
    label: 'Money',
    steps: [
      'Only use money you can afford to set aside',
      'Read the terms closely, or ask someone you trust',
      'Don’t decide under time pressure',
    ],
  },
  'Partnership & Alliances': {
    label: 'Relationships',
    steps: [
      'Talk openly about what you each expect',
      'Agree who does what',
      'Take it one step at a time',
    ],
  },
  'Health & Vitality': {
    label: 'Health & energy',
    steps: [
      'For health decisions, speak with a doctor or qualified professional',
      'Keep regular sleep and meal times',
      'Build in rest before you feel you need it',
    ],
  },
  'Family & Progeny': {
    label: 'Family',
    steps: [
      'Talk it through with the people involved',
      'Keep routines steady for everyone',
      'Ask for help where you need it',
    ],
  },
  'General Decision': {
    label: 'A decision',
    steps: [
      'Focus on what you can control',
      'Write down the pros and cons',
      'Sleep on it before you commit',
    ],
  },
};

export const ASK_EXAMPLES = [
  'Should I accept the new job offer?',
  'Is this a good week to travel?',
  'Should I sign the lease on the new flat?',
  'Is now a good time to start my own business?',
];

export function compatibilityCopy(score: number): { headline: string; body: string; level: DayLevel } {
  if (score >= 28)
    return {
      headline: 'Naturally in step',
      body: 'Your rhythms tend to fit together easily. Keep talking openly — ease is a good start, not a guarantee.',
      level: 'good',
    };
  if (score >= 21)
    return {
      headline: 'A good overall fit',
      body: 'Your rhythms mostly fit well, with a few areas that need a little more understanding.',
      level: 'good',
    };
  if (score >= 18)
    return {
      headline: 'Workable, with effort',
      body: 'Some things come easily, others will need patience and clear conversations.',
      level: 'steady',
    };
  return {
    headline: 'Different rhythms',
    body: 'You tend to work at different paces. That can be balancing — it simply asks for more patience and clear agreements.',
    level: 'light',
  };
}

export const KOOTA_PLAIN: Record<string, { label: string; meaning: string }> = {
  varna: { label: 'Values', meaning: 'How you see work and duty' },
  vashya: { label: 'Give and take', meaning: 'Who leads, who follows' },
  tara: { label: 'Wellbeing together', meaning: 'How you affect each other’s day-to-day' },
  yoni: { label: 'Comfort', meaning: 'Physical ease and closeness' },
  grahaMaitri: { label: 'Friendship', meaning: 'How easily you understand each other' },
  gana: { label: 'Temperament', meaning: 'Calm vs. intense natures' },
  bhakoot: { label: 'Shared direction', meaning: 'Long-term goals and family life' },
  nadi: { label: 'Energy rhythm', meaning: 'Whether your energy types balance' },
};

export const SYNERGY_PLAIN: Record<string, string> = {
  'Harmonious Flow': 'Your current life chapters support each other.',
  'Complementary Challenge': 'Your current life chapters pull in different directions — which can balance each other out.',
  'Transformative Evolution': 'You are both in a season of change at the same time. Be patient with each other.',
};

export const DAILY_RHYTHM: Record<ElementType, { morning: string; focus: string; evening: string }> = {
  Fire: {
    morning: 'Move first — a brisk walk or a short workout.',
    focus: 'Early, before the day gets busy and pulls you in many directions.',
    evening: 'Cool down: softer light, and no hard exercise late.',
  },
  Earth: {
    morning: 'The same wake-up time each day, and a proper breakfast.',
    focus: 'Late morning, in one long, uninterrupted stretch.',
    evening: 'A regular wind-down routine you can rely on.',
  },
  Air: {
    morning: 'Daylight and fresh air before you look at a screen.',
    focus: 'Short blocks of 45–60 minutes, with real breaks in between.',
    evening: 'Screens off an hour before bed to let your mind slow down.',
  },
  Water: {
    morning: 'A quiet start — no messages for the first half hour.',
    focus: 'Whenever it is calm. Protect that time from interruptions.',
    evening: 'Time on your own to unwind — a warm bath, a book, a walk.',
  },
};

export function temperamentHeadline(primary: ElementType, secondary: ElementType): string {
  return `${ELEMENTS[primary].adjective}, ${ELEMENTS[secondary].withPhrase}`;
}

export const DISCLAIMER =
  'Life Rhythm is a reflection tool for pacing and timing. It does not predict events and is not medical, financial, legal or psychological advice.';
