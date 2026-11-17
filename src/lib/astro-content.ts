/**
 * Life Rhythm — in-depth, plain-English content for every use case.
 * Ported from the original dashboard (Today, Blueprint, Timeline, Timing, Partner, Decision,
 * Career & Wealth, Vitality, Parenting, Annual Forecast, Crisis Reset) and rewritten without jargon.
 * Rules: plain words, actionable, no promises, no medical/financial claims.
 */
import type { PlanetName, ElementType, ZodiacSignName } from './astro-engine/types.ts';

/* ═══════════ Today ═══════════ */

/** Day headline by weekday ruler × whether conditions are supportive. */
export const DAY_HEADLINE: Record<string, [string, string]> = {
  Sun: ['A day for focused, decisive action', 'A day for steady, independent work'],
  Mars: ['A day for focused, decisive action', 'A day for steady, independent work'],
  Mercury: ['A day for communication and organising', 'A day to simplify and check details'],
  Jupiter: ['A day for long-term planning', 'A day to review your goals and commitments'],
  Venus: ['A day for collaboration and creative work', 'A day to keep conversations calm and kind'],
  Saturn: ['A day for deep focus and structured tasks', 'A day for routine upkeep and saving energy'],
  Moon: ['A day for reflection and a personal reset', 'A day for a quiet pace and rest'],
};

export interface Labeled {
  label: string;
  text: string;
}

export const TODAY_FOCUS: { supportive: Labeled[]; steady: Labeled[] } = {
  supportive: [
    { label: 'Important tasks', text: 'Block your clearest hours for demanding work and key decisions.' },
    { label: 'Follow-through', text: 'Send pending messages, finish drafts and close open items before mid-afternoon.' },
    { label: 'Midday reset', text: 'Take a 15–20 minute walk outside in daylight to refresh your focus.' },
  ],
  steady: [
    { label: 'One thing at a time', text: 'Choose the one task that matters most today and finish it before starting anything else.' },
    { label: 'Protect your diary', text: 'Keep non-essential meetings off today. Your own work is the priority.' },
    { label: 'Gentle movement', text: 'A walk, a stretch or some fresh air between tasks keeps your energy even.' },
  ],
};

export const TODAY_AVOID: Labeled[] = [
  { label: 'Late, difficult talks', text: 'Avoid sensitive negotiations or hard conversations late in the day, when you are tired.' },
  { label: 'Multitasking', text: 'Finish one meaningful task before moving to the next.' },
  { label: 'Eating on the run', text: 'Take a proper break away from screens to eat.' },
];

/** Travel guidance by the element of the rising sign. */
export const TRAVEL: Record<ElementType, { work: string; rest: string; places: string }> = {
  Fire: {
    work: 'South & south-east',
    rest: 'West & north-west',
    places: 'Sunny, open places with height and energy — mountain towns, lively cities, warm and dry climates.',
  },
  Air: {
    work: 'South & south-east',
    rest: 'West & north-west',
    places: 'International cities, university towns, places with ideas and conversation — and fresh, breezy air.',
  },
  Earth: {
    work: 'East & north-east',
    rest: 'North & north-east',
    places: 'Historic stone towns, countryside and valleys, places with a sense of permanence and good food.',
  },
  Water: {
    work: 'East & north-east',
    rest: 'North & north-east',
    places: 'Places near water — lakes, coast, rivers — and quiet green forests.',
  },
};
export const TRAVEL_CAUTION = 'South-west — allow extra time for delays';

/** What a sub-period brings, used for "coming up next". */
export const PERIOD_THEME: Record<PlanetName, { title: string; incoming: string }> = {
  Sun: { title: 'Leadership, clarity and being seen', incoming: 'taking the lead, setting a clear direction and being more visible' },
  Moon: { title: 'Balance, rest and strong foundations', incoming: 'emotional balance, home life and a restorative rhythm' },
  Mars: { title: 'Action, building and getting things done', incoming: 'decisive action, building things and tackling hard tasks directly' },
  Mercury: { title: 'Organising, learning and clear communication', incoming: 'getting organised, writing, learning and clear agreements' },
  Jupiter: { title: 'Growth, learning and long-term plans', incoming: 'long-term growth, teaching or mentoring, and wise investments of time and money' },
  Venus: { title: 'Creative work, relationships and refinement', incoming: 'creative work, trusted partnerships and improving the quality of what you do' },
  Saturn: { title: 'Structure, discipline and strong foundations', incoming: 'simplifying, cutting waste and building things that last' },
  Rahu: { title: 'New ideas, bold moves and wider horizons', incoming: 'trying new things, reaching new people and exploring unfamiliar ground' },
  Ketu: { title: 'Simplifying, depth and letting go', incoming: 'deep focused work, research and letting go of what no longer fits' },
};

export const WRAP_UP = [
  'Finish or formally close open agreements',
  'Write down and hand over recurring tasks',
  'Put some money aside so you start the next phase with a buffer',
];

/* ═══════════ You: profile ═══════════ */

export const ARCHETYPE: Record<string, string> = {
  'Fire-Air': 'The Active Strategist',
  'Air-Fire': 'The Creative Pioneer',
  'Fire-Earth': 'The Practical Doer',
  'Earth-Fire': 'The Steady Builder',
  'Earth-Air': 'The Systems Planner',
  'Air-Earth': 'The Organised Thinker',
  'Earth-Water': 'The Careful Steward',
  'Water-Earth': 'The Intuitive Planner',
  'Water-Air': 'The Perceptive Observer',
  'Air-Water': 'The Creative Communicator',
  'Water-Fire': 'The Purposeful Leader',
  'Fire-Water': 'The Warm Energiser',
  'Fire-Fire': 'The Initiator',
  'Earth-Earth': 'The Builder',
  'Air-Air': 'The Thinker',
  'Water-Water': 'The Empath',
};

export const ARCHETYPE_SUMMARY: Record<ElementType, string> = {
  Fire: 'You tend to work best with a clear goal and momentum. You are good at starting important things — and do better when you plan regular evening rest so you don’t run yourself down.',
  Earth: 'You tend to work best with steady routines, patience and follow-through. You build reliable, lasting results when you have protected time without interruptions.',
  Air: 'You tend to take in information quickly and connect ideas easily. You communicate well — and benefit from limits on screen time and evening input so your mind can rest.',
  Water: 'You tend to notice details and moods that others miss. You work best when your surroundings are calm and settled.',
};

/** Rising sign: your natural energy and how you come across. */
export const RISING: Record<ZodiacSignName, string> = {
  Aries: 'Quick to start and full of energy, especially in the morning. Long, slow meetings drain you fast.',
  Taurus: 'Steady and durable. Slow to warm up, then hard to stop. A good breakfast and a calm start matter.',
  Gemini: 'Quick-thinking and good at juggling. A quiet first hour without notifications keeps you from feeling scattered.',
  Cancer: 'Your energy rises when you feel safe and connected. You can pick up other people’s tension, so choose your company carefully.',
  Leo: 'Warm, visible and generous. You thrive when you can lead; being micromanaged wears you down.',
  Virgo: 'Precise and thorough. Watch for perfectionism — it tends to show up as tension in your body.',
  Libra: 'You do best in calm, pleasant, well-ordered surroundings. Ongoing conflict or mess drains you.',
  Scorpio: 'Capable of intense focus, especially under pressure. You need time alone and physical exercise to let off steam.',
  Sagittarius: 'Optimistic and driven by purpose and freedom. Repetitive, boxed-in work makes you sluggish.',
  Capricorn: 'Disciplined and resilient. Your stamina grows with experience and consistency.',
  Aquarius: 'Independent and inventive. You need mental space and time outdoors to reset.',
  Pisces: 'Imaginative and sensitive. Crowded, noisy places tire you quickly — build in quiet pauses.',
};

/** Moon sign: how you handle stress and what helps you reset. */
export const MOON_RESET: Record<ZodiacSignName, { style: string; reset: string }> = {
  Aries: { style: 'You work stress off through movement and quick action.', reset: 'A hard workout before any emotional conversation.' },
  Taurus: { style: 'You need physical comfort and stability to feel settled.', reset: 'A home-cooked meal, a massage or time in nature.' },
  Gemini: { style: 'You process feelings by thinking and talking them through.', reset: 'Journaling, or talking it over with someone you trust.' },
  Cancer: { style: 'You feel things deeply and need a safe home base.', reset: 'A warm bath, a quiet evening, and no difficult messages after 7pm.' },
  Leo: { style: 'You recover through creativity, play and appreciation.', reset: 'A creative hobby with no deadlines where you call the shots.' },
  Virgo: { style: 'You calm anxiety by bringing order to things.', reset: 'Tidy your space, then consciously let go of what you can’t fix.' },
  Libra: { style: 'You feel stressed until harmony is restored.', reset: 'A calm one-to-one talk, gentle music and pleasant surroundings.' },
  Scorpio: { style: 'You process privately and deeply.', reset: 'Time alone in nature, hard exercise, and a break from social demands.' },
  Sagittarius: { style: 'You recover by seeing the bigger picture.', reset: 'A long walk in open country, a good book, or planning a trip.' },
  Capricorn: { style: 'You tend to hold pressure in and keep going.', reset: 'Celebrate small wins, schedule guilt-free rest, and hand off what you can.' },
  Aquarius: { style: 'You step back and look at things objectively.', reset: 'Time alone, reading, and a break from social media.' },
  Pisces: { style: 'You absorb other people’s feelings easily.', reset: 'Swimming or a bath, quiet time, and firm boundaries on your energy.' },
};

/** Sun house: where you naturally shine. */
export const SUN_HOUSE: Record<number, string> = {
  1: 'You lead by example. Your presence sets the tone — roles that keep you in the background hold you back.',
  2: 'You shine in managing money and resources, and people trust how clearly you speak.',
  3: 'You shine through communication, writing and taking the first step where others hesitate.',
  4: 'You are the steady anchor for family, home or team — people lean on your stability.',
  5: 'You shine through creativity, original ideas and inspiring others with your work.',
  6: 'You shine at solving problems, fixing what is broken and making things run smoothly.',
  7: 'You do your best work through partnerships, negotiation and working one-to-one.',
  8: 'You are at your best in deep work, research and steadying others through big changes.',
  9: 'You shine as a teacher, mentor or guide, and through learning and travel.',
  10: 'You are suited to leadership and public responsibility. Your work is how people know you.',
  11: 'You shine through networks, communities and bringing people together around a goal.',
  12: 'You do your best work behind the scenes, with independence and room to think.',
};

/* ═══════════ You: how you work (four pillars) ═══════════ */

export interface Pillar {
  area: string;
  style: string;
  strength: string;
  trap: string;
  rule: string;
}

export function pillarAction(sign: ZodiacSignName, retro: boolean): Pillar {
  const direct = ['Aries', 'Scorpio', 'Capricorn'].includes(sign);
  const steady = ['Taurus', 'Virgo', 'Cancer'].includes(sign);
  const adaptive = ['Gemini', 'Libra', 'Aquarius'].includes(sign);
  return {
    area: 'How you take action',
    style: direct ? 'Decisive and direct' : steady ? 'Steady and consistent' : adaptive ? 'Adaptable and responsive' : 'Focused bursts',
    strength: direct
      ? 'Determination, and the willingness to act when hard decisions need making.'
      : steady
        ? 'Reliable stamina and the patience to see multi-step projects through.'
        : 'Agility. You adapt quickly to changing demands and organise work well.',
    trap: retro
      ? 'Keeping frustration to yourself until it builds up. Say what you need early.'
      : ['Aries', 'Scorpio', 'Leo'].includes(sign)
        ? 'Impatience when others need more time. Getting everyone on board first saves rework later.'
        : 'Taking on lots of small tasks and mistaking busyness for progress.',
    rule: 'Do your most demanding task early in the day. Don’t try to resolve conflicts when you are tired or hungry.',
  };
}

export function pillarThinking(sign: ZodiacSignName, retro: boolean): Pillar {
  const analytic = ['Gemini', 'Virgo'].includes(sign);
  const intuitive = ['Cancer', 'Scorpio', 'Pisces'].includes(sign);
  const practical = ['Taurus', 'Capricorn', 'Libra'].includes(sign);
  return {
    area: 'How you think and decide',
    style: analytic ? 'Sharp and analytical' : intuitive ? 'Intuitive and perceptive' : practical ? 'Practical and grounded' : 'Big-picture and direct',
    strength: analytic
      ? 'Clear thinking. You break problems down quickly and get to the point.'
      : intuitive
        ? 'You sense what is going on between people before anyone says it.'
        : 'You turn complicated ideas into something simple and useful.',
    trap: retro
      ? 'Over-editing and second-guessing before you share. Release your work when it is good enough.'
      : analytic
        ? 'Overthinking small details while the big task waits.'
        : 'Assuming others follow your leaps of thought. Write down your reasoning.',
    rule: 'Keep a quiet first 90 minutes with messages closed. Keep routine meetings to 25 minutes with a short written agenda.',
  };
}

export function pillarLeadership(house: number): Pillar {
  const front = [1, 10].includes(house);
  const vision = [9, 11].includes(house);
  const creative = [3, 5].includes(house);
  return {
    area: 'How you lead and influence',
    style: front ? 'Out in front' : vision ? 'Big-picture visionary' : creative ? 'Creative champion' : 'Trusted adviser',
    strength: front
      ? 'A natural presence and willingness to take full responsibility. People look to you.'
      : vision
        ? 'A long-range vision that brings different people together around a shared goal.'
        : 'Quiet influence — you steer things well without needing the spotlight.',
    trap: 'Saying yes to obligations that don’t matter, or seeking approval from people who don’t share your goals.',
    rule: 'Keep the final say on what matters most to you, and let go of the day-to-day details.',
  };
}

export function pillarLongTerm(house: number, retro: boolean): Pillar {
  return {
    area: 'How you build for the long term',
    style: [10, 11].includes(house)
      ? 'Building a lasting reputation'
      : [1, 2].includes(house)
        ? 'The patient craftsperson'
        : [6, 8].includes(house)
          ? 'Strong in difficult times'
          : 'The long-range learner',
    strength: 'What felt slow or hard early in life tends to become a real strength with time — often from your mid-thirties onward.',
    trap: retro
      ? 'A harsh inner critic. You judge yourself by standards you would never apply to others.'
      : 'Giving up during the slow early stage, just before steady effort starts to pay off.',
    rule: 'Spend 30 minutes every Friday reviewing your long-term goals. Measure progress in years, not weeks.',
  };
}

/* ═══════════ You: strengths & watch-outs ═══════════ */

export const YOGA_PLAIN: Record<string, { title: string; use: string }> = {
  'Gaja Kesari Yoga': { title: 'Calm, trusted judgement', use: 'People trust your counsel. Use it in tense situations — your calm steadies others.' },
  'Budhaditya Yoga': { title: 'Clear, intelligent thinking', use: 'Bring your clarity to planning and explaining. You make complicated things simple.' },
  'Chandra-Mangala Yoga': { title: 'A practical head for resources', use: 'Trust your instinct for what is worth investing time and money in.' },
  'Ruchaka Yoga': { title: 'Courage and drive', use: 'Take on the hard, physical or competitive challenges others avoid — and build in recovery.' },
  'Bhadra Yoga': { title: 'Precision and skill with systems', use: 'Organise, analyse, communicate. You make things work better.' },
  'Hamsa Yoga': { title: 'Integrity and wisdom', use: 'Teach and mentor. People grow around you.' },
  'Malavya Yoga': { title: 'Taste and a feel for beauty', use: 'Put your sense of quality into what you make and the spaces you shape.' },
  'Sasa Yoga': { title: 'Staying power', use: 'Play the long game. Patience is your edge when others rush.' },
  'Neechabhanga Raja Yoga': { title: 'Turning setbacks into strengths', use: 'Difficult starts tend to become your biggest assets. Don’t give up early.' },
  'Viparita Raja Yoga': { title: 'Strength in a crisis', use: 'You often do your best when things are hard. Stay steady and others will follow.' },
  'Dhana Yoga': { title: 'Building resources over time', use: 'Steady saving and patient effort tend to add up for you.' },
  'Amala Yoga': { title: 'A good name', use: 'Your reputation for doing the right thing opens doors. Protect it.' },
  'Saraswati Yoga': { title: 'Learning and expression', use: 'Write, teach, create. Your words and ideas carry weight.' },
};

export const YOGA_FALLBACK = [
  { title: 'A steady core', use: 'You stay balanced when things around you are chaotic. Lead with your values.' },
  { title: 'Independent focus', use: 'You can work on your own for long stretches. Trust your long-range instincts.' },
];

/** Life areas (houses) in plain words. */
export const LIFE_AREA: Record<number, { name: string; about: string }> = {
  1: { name: 'Energy & self', about: 'Your health, energy and how you show up' },
  2: { name: 'Money & savings', about: 'Income, savings and what you value' },
  3: { name: 'Effort & communication', about: 'Initiative, writing, siblings and short trips' },
  4: { name: 'Home & roots', about: 'Home, family and feeling settled' },
  5: { name: 'Creativity & children', about: 'Creative work, children, fun and new ideas' },
  6: { name: 'Work routines & health', about: 'Daily work, habits and solving problems' },
  7: { name: 'Partnerships', about: 'Partner, close collaborators and agreements' },
  8: { name: 'Change & shared resources', about: 'Big changes, research and joint finances' },
  9: { name: 'Purpose & learning', about: 'Beliefs, study, teachers and long journeys' },
  10: { name: 'Career & reputation', about: 'Work, responsibility and how you are known' },
  11: { name: 'Friends & goals', about: 'Networks, community and gains' },
  12: { name: 'Rest & retreat', about: 'Sleep, solitude, letting go and travel abroad' },
};

/** Watch-outs for the two weakest life areas. */
export const LEAK: Record<number, { title: string; risk: string; fix: string }> = {
  1: { title: 'Running on empty', risk: 'Saying yes to every urgent demand and skipping recovery.', fix: 'Protect a regular eight-hour sleep window and drink water before your first meeting.' },
  2: { title: 'Money slipping away', risk: 'Unplanned spending, or agreeing to things under social pressure.', fix: 'Wait 48 hours before any purchase or commitment that isn’t in your budget.' },
  3: { title: 'Lost in small tasks', risk: 'Getting pulled into constant small coordination and minor fires.', fix: 'Hand off logistics where you can, and turn off non-urgent notifications.' },
  4: { title: 'Work coming home', risk: 'Late-night stress spilling into home life.', fix: 'Have a set place for work and close the laptop by 7:30pm.' },
  5: { title: 'Over-investing in long shots', risk: 'Pouring time or money into untested ideas all at once.', fix: 'Try small first. Scale up only when something is clearly working.' },
  6: { title: 'Admin overload', risk: 'Small problems and paperwork piling up.', fix: 'Set one weekly slot to clear admin, and get help with what you can.' },
  7: { title: 'Giving too much in partnerships', risk: 'Over-accommodating others or agreeing to vague arrangements.', fix: 'Put agreements in writing, with clear limits.' },
  8: { title: 'Caught off guard', risk: 'Facing surprises without a buffer.', fix: 'Build up a savings buffer so emergencies don’t become crises.' },
  9: { title: 'Values clashing', risk: 'Arguing principles with people who only think short-term.', fix: 'Choose partners and employers whose values match yours.' },
  10: { title: 'Too much on your shoulders', risk: 'Carrying lots of visibility and responsibility without support.', fix: 'Get help with scheduling and protect blocks of private time.' },
  11: { title: 'Spread too thin socially', risk: 'Low-value events and favours that eat your time.', fix: 'Review your commitments every quarter and step back from what doesn’t matter.' },
  12: { title: 'Restless nights', risk: 'Lying awake thinking, or screens right before bed.', fix: 'Keep phones out of the bedroom and wind down with something calm.' },
};

export const DAILY_ROUTINE = [
  { step: 'Morning start', time: 'First 90 minutes', text: 'Ten minutes of daylight outdoors, water, and no email or social media until you have moved.' },
  { step: 'Deep focus', time: 'Mid-morning', text: 'Your most important task, with notifications off.' },
  { step: 'People time', time: 'Early afternoon', text: 'Group calls, meetings and one-to-ones into this window to protect your mornings.' },
  { step: 'Reset', time: 'Late afternoon', text: 'A brisk 15-minute walk, a few slow breaths, or a cup of tea away from screens.' },
  { step: 'Wind down', time: 'Evening', text: 'Dim the screens and let your mind settle — a book, a chat, a quiet walk.' },
];

/* ═══════════ You: work & money ═══════════ */

export const WORK_STYLE: Record<ElementType, { label: string; title: string; summary: string }> = {
  Fire: {
    label: 'Independent and pioneering',
    title: 'You do your best work when you lead',
    summary: 'You tend to thrive when you own the direction — starting things, building from scratch, and putting your name to your work.',
  },
  Earth: {
    label: 'Steady builder',
    title: 'You build value through reliability',
    summary: 'You tend to do well through dependable delivery, good systems and patient, long-term building. You cut waste and make things last.',
  },
  Air: {
    label: 'Ideas and connections',
    title: 'You create value through knowledge and networks',
    summary: 'You tend to do well with ideas, writing, media, technology and deal-making — turning what you know into something many people can use.',
  },
  Water: {
    label: 'Trusted adviser',
    title: 'You create value through trust and relationships',
    summary: 'You tend to do well where trust matters — advising, caring, guiding people through change, and work that aligns with your values.',
  },
};

export const MONEY_RULES = [
  { title: 'Value, not discounts', text: 'Avoid competing on price. Be clear about the value of what you offer.' },
  { title: 'Get help before you grow', text: 'Get support with routine work before taking on more. Protect your energy for what only you can do.' },
  { title: 'Keep a buffer', text: 'Aim for several months of expenses in savings before taking bigger risks.' },
  { title: 'Clear agreements', text: 'Make sure every agreement says clearly who owns what and how either side can exit.' },
];

/* ═══════════ You: health & energy ═══════════ */

export const ENERGY_TYPE = {
  fast: {
    label: 'Fast-paced energy',
    title: 'You run fast — protect your recovery',
    summary: 'You tend to move quickly and take on a lot. To stay balanced, keep a consistent evening wind-down and protect your sleep.',
    recovery: 'Needs deliberate slowing down',
  },
  steady: {
    label: 'Steady energy',
    title: 'You have staying power — keep moving',
    summary: 'You tend to have steady stamina and patience. When stressed, daily movement, fresh air and light activity help you stay alert.',
    recovery: 'Naturally steady',
  },
};

export const STRESS_SPOTS = [
  { title: 'Digestion', text: 'Stress and eating don’t mix well. Avoid eating during tense calls or in a rush.' },
  { title: 'Sleep', text: 'Stop screens and big decisions about two hours before bed so you can fall asleep more easily.' },
  { title: 'Neck, shoulders and back', text: 'Tension tends to collect here. Stretch daily and get up from your desk regularly.' },
];

export const MOVEMENT: Record<ElementType, string> = {
  Fire: 'Vigorous exercise suits you — followed by a proper cool-down so you don’t stay wired.',
  Earth: 'Regular, steady exercise — walking, strength training, yoga — at the same time each day.',
  Air: 'Varied movement outdoors — cycling, walking, dancing — that also clears your head.',
  Water: 'Flowing, gentle movement — swimming, yoga, walks by water or in green spaces.',
};

export const SLEEP: Record<ElementType, string> = {
  Fire: 'A cool, dark bedroom and a firm cut-off for work in the evening.',
  Earth: 'The same bedtime and wake-up time every day, weekends included.',
  Air: 'No screens in the last hour — read or write something down to empty your mind.',
  Water: 'A calm, cosy evening routine and some time alone before bed.',
};

export const HEALTH_NOTE = 'This is about pacing and habits, not medical advice. For health concerns, please speak with a doctor.';

/* ═══════════ Seasons: in-depth chapter profiles ═══════════ */

export interface SeasonProfile {
  era: string;
  phase: string;
  role: string;
  theme: string;
  outside: string;
  inside: string;
  priorities: [string, string, string];
  yes: [string, string, string];
  no: [string, string, string];
  pitfalls: [string, string];
  prepare: string;
}

export const SEASON: Record<PlanetName, SeasonProfile> = {
  Sun: {
    era: 'A chapter of stepping up and being seen',
    phase: 'A phase of leadership and visibility',
    role: 'The leader',
    theme: 'Owning your decisions, being visible and setting direction.',
    outside: 'People notice how clearly and decisively you act. This is a time to step forward and own your area.',
    inside: 'Less patience for vague compromises or background roles, and a strong wish to speak with your own voice.',
    priorities: [
      'Be clear about which decisions are yours, and make them.',
      'Put your name to the work you believe in most.',
      'Cut unnecessary delays — decide, then move.',
    ],
    yes: ['Opportunities to speak, present or lead', 'Roles with clear responsibility', 'Daily routines that keep your energy high'],
    no: ['Supporting roles for people who won’t decide', 'Committees where nobody is accountable', 'Watering down your standards to please everyone'],
    pitfalls: ['Confusing decisiveness with not listening.', 'Trying to solve everything yourself instead of building support.'],
    prepare: 'Help the people around you take on more, so things run well without you there all the time.',
  },
  Moon: {
    era: 'A chapter of care, connection and foundations',
    phase: 'A phase of community and a safe home base',
    role: 'The caretaker',
    theme: 'Building trust, emotional safety and a strong home base.',
    outside: 'People look to you for steadiness and warmth. Pure logic works less well now; understanding people works better.',
    inside: 'More sensitivity to tension around you, and energy that comes in waves. Flexible pacing works better than forcing it.',
    priorities: [
      'Make your home a place where you truly recharge.',
      'Invest in a few close, trusting relationships.',
      'Turn what you sense about people into something useful — writing, care, better service.',
    ],
    yes: ['Building community and loyalty', 'Writing, listening and creative work', 'Regular breaks in nature or near water'],
    no: ['Draining conflicts and stand-offs', 'Back-to-back days with no breathing room', 'Taking on everyone else’s worries'],
    pitfalls: ['Making big decisions on a low day.', 'Rescuing others at your own expense.'],
    prepare: 'Write down how routine things are done, so your energy isn’t used up by everyday problems.',
  },
  Mars: {
    era: 'A chapter of action and building',
    phase: 'A phase of doing and making',
    role: 'The builder',
    theme: 'Decisive action, courage and visible progress.',
    outside: 'Things move fast and doing beats planning. Getting things out into the world matters more than getting them perfect.',
    inside: 'Lots of drive and impatience with indecision. Energy that needs a physical outlet or it turns into irritation.',
    priorities: [
      'Get real work out into the world instead of polishing it forever.',
      'Have the overdue conversations — calmly and directly.',
      'Exercise daily so the extra energy has somewhere to go.',
    ],
    yes: ['Starting new projects', 'Clear, direct decisions', 'Demanding physical training — with recovery'],
    no: ['Endless brainstorming with nothing finished', 'Passive-aggressive standoffs', 'Late nights fuelled by caffeine'],
    pitfalls: ['Winning arguments and losing relationships.', 'Charging ahead before you have what you need.'],
    prepare: 'Consolidate what you have built: write down how it works and hand over the day-to-day.',
  },
  Mercury: {
    era: 'A chapter of learning, skills and communication',
    phase: 'A phase of organising and sharing',
    role: 'The communicator',
    theme: 'Skills, clear agreements, writing and well-organised systems.',
    outside: 'Information moves fast. Opportunities come through writing, learning, technology and clear agreements.',
    inside: 'A busy, quick mind — good at spotting patterns, but easily overloaded.',
    priorities: [
      'Write down what you know so others can use it.',
      'Make your agreements, prices and terms clear.',
      'Cut information overload — fewer apps, fewer feeds.',
    ],
    yes: ['Writing, teaching and sharing ideas', 'Automating repetitive tasks', 'Clear, written agreements'],
    no: ['Verbal deals without anything in writing', 'Chasing every new trend', 'Ten open projects with none finished'],
    pitfalls: ['Knowing a lot but finishing little.', 'Poor sleep from late-night screens and a racing mind.'],
    prepare: 'Bring your tools and notes together so things are easy to find and run smoothly.',
  },
  Jupiter: {
    era: 'A chapter of growth and wisdom',
    phase: 'A phase of teaching and thoughtful expansion',
    role: 'The mentor',
    theme: 'Growing wisely, teaching others and investing for the long term.',
    outside: 'Doors tend to open through your reputation, generosity and experience. Good people are drawn to you.',
    inside: 'Optimism and a big-picture view — which makes it tempting to take on too much.',
    priorities: [
      'Step into the role of adviser or mentor.',
      'Put your time and money into things that last.',
      'Set clear values for how you work and what you say yes to.',
    ],
    yes: ['Mentoring and advising', 'Learning and teaching', 'Opportunities that widen your horizons'],
    no: ['Getting stuck in minor day-to-day fires', 'Big fixed costs based on hopeful forecasts', 'Short-term gains that cost your reputation'],
    pitfalls: ['Underestimating how long and how much things cost.', 'Growing too fast and losing what made you good.'],
    prepare: 'Review where your time and money go, and let go of what isn’t working before the next phase.',
  },
  Venus: {
    era: 'A chapter of relationships and refinement',
    phase: 'A phase of quality and collaboration',
    role: 'The creator',
    theme: 'Quality, beauty, good partnerships and fair exchange.',
    outside: 'Quality and good relationships count for more than force. Care and attention to detail are noticed.',
    inside: 'A pull towards comfort, beauty and harmony, and less tolerance for chaos.',
    priorities: [
      'Raise the quality of what you make and how it is presented.',
      'Build partnerships where both sides win.',
      'Look after yourself — rest, good food, things that restore you.',
    ],
    yes: ['Work you are proud of', 'Partnerships with people you respect', 'A home and workspace that feel good'],
    no: ['Undercutting yourself on price', 'Tolerating disrespectful people', 'Comforts that erode your daily discipline'],
    pitfalls: ['Avoiding conflict even when something is clearly wrong.', 'Polishing the surface before checking that it works.'],
    prepare: 'Put your best partnerships on a clear, written footing.',
  },
  Saturn: {
    era: 'A chapter of building steadily',
    phase: 'A phase of discipline and simplifying',
    role: 'The master builder',
    theme: 'Strong foundations, less waste and steady long-term progress.',
    outside: 'Shortcuts tend not to work now. What is well built lasts; what isn’t, shows its cracks.',
    inside: 'A strong sense of responsibility, and frustration with delays — alongside a growing sense that slow progress is real progress.',
    priorities: [
      'Look closely at your spending and commitments, and drop what isn’t worth it.',
      'Build routines and systems that can handle surprises.',
      'Think in years, not weeks.',
    ],
    yes: ['Clear agreements and good routines', 'Regular sleep, water and movement', 'Unglamorous work that pays off over time'],
    no: ['Get-rich-quick schemes', 'Growing before things are stable', 'Fighting delays you can’t change — work within them'],
    pitfalls: ['Letting discipline turn into pessimism.', 'Neglecting rest until your body forces you to stop.'],
    prepare: 'Look at what you have built and decide which parts are ready to grow.',
  },
  Rahu: {
    era: 'A chapter of new directions',
    phase: 'A phase of change and bold moves',
    role: 'The explorer',
    theme: 'New paths, wider horizons and unconventional moves.',
    outside: 'Old playbooks work less well. Opportunities come from new places — abroad, online, or in unexpected directions.',
    inside: 'Strong ambition and restlessness. Without grounding, it can tip into overdrive.',
    priorities: [
      'Spot new opportunities early and test them carefully.',
      'Look beyond your usual circle — new places, new people.',
      'Keep simple daily anchors: sleep, meals, walks.',
    ],
    yes: ['Well-judged risks with limited downside', 'Learning new tools and channels', 'Finding your own niche'],
    no: ['People who insist it must be done the old way', 'Decisions driven by fear of missing out', 'Overselling or cutting corners'],
    pitfalls: ['Feeling unstoppable and over-stretching.', 'Pushing your body like a machine.'],
    prepare: 'Turn quick wins into something lasting — savings, skills, solid agreements.',
  },
  Ketu: {
    era: 'A chapter of simplifying and going deeper',
    phase: 'A phase of review and letting go',
    role: 'The deep thinker',
    theme: 'Letting go of what no longer fits, deep work and reclaiming your time.',
    outside: 'Surface-level things lose their appeal. Projects and relationships that don’t fit tend to fall away.',
    inside: 'Reflective and less interested in small talk — with real capacity for depth and insight.',
    priorities: [
      'Close what is finished: old projects, commitments that no longer fit.',
      'Protect long, uninterrupted time for deep work or study.',
      'Make room for solitude and rest.',
    ],
    yes: ['Deep, focused work', 'Simplifying your life and calendar', 'Retreats, quiet time and rest'],
    no: ['Shallow networking', 'Holding on to what has run its course', 'Roles full of politics'],
    pitfalls: ['Withdrawing from responsibilities completely.', 'Leaving abruptly instead of closing things well.'],
    prepare: 'Get your finances and systems clean and simple, ready for a more outward phase.',
  },
};

export function stageOf(pct: number): { label: string; text: string } {
  if (pct < 25) return { label: 'Early in this phase', text: 'Set your direction and build momentum.' };
  if (pct <= 75) return { label: 'In the middle of this phase', text: 'This is the time to make the most of it.' };
  return { label: 'Late in this phase', text: 'Finish, consolidate and prepare for what comes next.' };
}

/** Long consolidation cycle (Sade Sati) in plain words. */
export const LONG_CYCLE = {
  none: {
    label: 'Not active',
    text: 'You are not in a long consolidation cycle right now. A good time to build and take well-judged steps forward.',
  },
  1: {
    label: 'Active — phase 1 of 3',
    text: 'The beginning of a multi-year period of clearing out. What is superficial or unsustainable tends to fall away. Pace yourself and review your commitments honestly.',
  },
  2: {
    label: 'Active — phase 2 of 3',
    text: 'The most demanding part. Strip things back to what matters and look after your energy. What you strengthen now tends to last.',
  },
  3: {
    label: 'Active — phase 3 of 3',
    text: 'The pressure eases. Things become clearer, and the patient work of recent years starts to pay off.',
  },
};

export const QUARTER_FOCUS = [
  { title: 'Review and align', text: 'Review your commitments, simplify your schedule and cut what you don’t need before starting anything big.' },
  { title: 'Launch and reach out', text: 'A good stretch to share new work, speak up and follow up on opportunities.' },
  { title: 'Consolidate and refine', text: 'Fix what isn’t working, improve routines and make sure things run smoothly.' },
  { title: 'Harvest and plan', text: 'Wrap things up, put agreements in place and plan for the year after.' },
];

/* ═══════════ People ═══════════ */

export const PARTNER_DIMENSIONS: Record<string, { title: string; text: string }> = {
  grahaMaitri: { title: 'Understanding each other', text: 'How easily you see eye to eye, talk things through and share values.' },
  gana: { title: 'Temperament and pace', text: 'Whether your daily energy, patience and reactions to stress fit together.' },
  bhakoot: { title: 'Support and shared direction', text: 'Emotional support and agreement on the long-term path, including money.' },
  nadi: { title: 'Energy rhythm', text: 'Whether your energy types balance each other over the long run.' },
  vashya: { title: 'Mutual respect', text: 'Willingness to listen to each other and settle disagreements without ego.' },
  varna: { title: 'Values', text: 'How you each see work, duty and what matters.' },
  tara: { title: 'Wellbeing together', text: 'How you affect each other’s day-to-day wellbeing.' },
  yoni: { title: 'Comfort and closeness', text: 'Physical ease and comfort with each other.' },
};

export const CHILD_STYLE: Record<ElementType, { title: string; learning: string; pacing: string }> = {
  Fire: {
    title: 'Active, hands-on and independent',
    learning: 'Children in your life tend to learn best by doing — trying things, practising and getting quick feedback. They thrive with freedom and real challenges.',
    pacing: 'Give them plenty of physical activity and a clear wind-down before bed.',
  },
  Earth: {
    title: 'Steady, practical and routine-loving',
    learning: 'Children in your life tend to learn best with clear routines, step-by-step demonstrations and time to practise. Avoid rushing them through changes.',
    pacing: 'Predictable days, regular meals and calm transitions help them feel secure.',
  },
  Air: {
    title: 'Curious, talkative and questioning',
    learning: 'Children in your life tend to learn through questions, stories and conversation. They need their reasoning respected and shut down with “because I said so”.',
    pacing: 'Plenty of conversation, books and variety — and quiet, screen-free evenings.',
  },
  Water: {
    title: 'Sensitive, intuitive and caring',
    learning: 'Children in your life tend to sense the mood at home instantly. They learn through connection and close up under harsh criticism.',
    pacing: 'A calm home atmosphere and gentle, warm correction work best.',
  },
};

export const PARENTING_PRINCIPLES = [
  { title: 'Calm down before you talk', text: 'Don’t try to teach or correct when either of you is upset. Settle first, then talk.' },
  { title: '20 minutes of full attention', text: 'A short daily window without phones or screens builds trust and security.' },
  { title: 'Respect their pace', text: 'Don’t pass your busy schedule on to them. Leave room for free play and exploring.' },
];

export const PRASHNA_CATEGORIES = [
  'Career & Calling',
  'Financial Flow',
  'Partnership & Love',
  'Relocation & Home',
  'Health & Vitality',
  'Children & Fertility',
  'General Guidance',
] as const;

export const PRASHNA_CATEGORY_LABEL: Record<string, string> = {
  'Career & Calling': 'Work and career',
  'Financial Flow': 'Money',
  'Partnership & Love': 'Love and partnership',
  'Relocation & Home': 'Home and moving',
  'Health & Vitality': 'Health and energy',
  'Children & Fertility': 'Children and family',
  'General Guidance': 'Something else',
};

export const PRASHNA_VERDICT: Record<string, { level: 'green' | 'amber' | 'red'; headline: string; text: string }> = {
  'Favorable / High Manifestation': {
    level: 'green',
    headline: 'Things are lining up',
    text: 'The moment you asked shows forward momentum. Go ahead with clear intentions and clear limits.',
  },
  'Constructive with Patience': {
    level: 'amber',
    headline: 'Steady progress — don’t force it',
    text: 'Progress is likely, but at its own pace. Avoid rushing to a conclusion; let it develop.',
  },
  'Delayed / Re-evaluation Needed': {
    level: 'red',
    headline: 'Pause and review first',
    text: 'Now isn’t the moment to push. Check the details and agreements, and look at it again in a few weeks.',
  },
};

/* ═══════════ Reset plan ═══════════ */

export const RESET_STEPS = [
  { title: 'Stop pushing', text: 'Give yourself 24 quiet hours: no new proposals, no big emails, and screens off after dark.' },
  { title: 'Cut back', text: 'List everything you agreed to out of guilt, people-pleasing or fear of missing out. Cancel or postpone half of it.' },
  { title: 'Clear your space', text: 'Tidy your desk, clear notifications and simplify your surroundings. Outer order helps inner calm.' },
  { title: 'Do one kind thing', text: 'Help someone quietly, without needing credit. It shifts your attention and lifts your mood.' },
];
