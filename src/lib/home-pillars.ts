/**
 * Home page: five subject pillars (no numbering in UI). Links match article index anchors.
 */
import type { UnsplashPhotoKey, UnsplashSlotRatio } from '@/lib/unsplash-placeholders';

export type HomePillarId = 'clarity' | 'regulation' | 'environment' | 'energy' | 'practices';

export const homePillarList: {
  id: HomePillarId;
  label: string;
  kicker: string;
  title: string;
  body: string;
  /** Unsplash crop + key for the card image (see getUnsplashPlaceholderUrl). */
  image: { ratio: UnsplashSlotRatio; key: UnsplashPhotoKey };
  /** When set, this asset is used instead of the Unsplash placeholder. */
  imageUrl?: string;
}[] = [
  {
    id: 'clarity',
    image: { ratio: '3-2', key: 'article' },
    imageUrl: '/images/pillar-clarity.jpg',
    label: 'Clarity',
    kicker: '',
    title: 'Understand your patterns. Move with better timing.',
    body: `Clarity begins when you can read the patterns behind your thoughts, choices, and turning points. Here we explore astrology as a language for self-understanding: attention, values, timing, life themes, inner direction, and the difference between what is truly yours and what is simply noise.

For when you want to understand yourself, your rhythm, and the decisions shaping your life with more honesty, perspective, and precision.`,
  },
  {
    id: 'regulation',
    image: { ratio: '4-5', key: 'default' },
    label: 'Regulation',
    kicker: 'Steadiness in real life',
    title: 'Find a rhythm your system can live with.',
    body: `Regulation is about steadiness in real life. We explore sleep, stress, recovery, breath, nervous system rhythm, and the small daily adjustments that help your body move through life with more balance.

Not forced calm. Not perfection. A better rhythm.`,
  },
  {
    id: 'environment',
    image: { ratio: '16-9', key: 'default' },
    imageUrl: '/images/pillar-environment.jpg',
    label: 'Environment',
    kicker: 'Space that holds you',
    title: 'Let your space support the life you want to live.',
    body: `Your home is not just background. Light, air, materials, order, sound, sleep spaces, energetic home alignment, Vastu, and geopathic stress all belong to the question of how a place feels — and how it affects daily life.

This subject is for anyone who senses that space matters.`,
  },
  {
    id: 'energy',
    image: { ratio: '16-9', key: 'webinar' },
    imageUrl: '/images/pillar-energy.jpg',
    label: 'Energy & Frequency',
    kicker: 'Subtle inputs, grounded work',
    title: 'Work with subtle inputs in a grounded way.',
    body: `Energy & Frequency is where we explore PEMF, frequency applications, sound, energetic hygiene, and supportive tools such as Infinity Uno.

This is also where astrology and timing naturally belong — as a way to understand cycles, seasons, patterns, and better moments for action.

No fatalism. No hype. Just a more intelligent way to work with the layers that shape experience.`,
  },
  {
    id: 'practices',
    image: { ratio: '3-2', key: 'product' },
    imageUrl: '/images/pillar-practices.jpg',
    label: 'Practices & Rituals',
    kicker: 'What repeats, holds',
    title: 'Make the good things repeatable.',
    body: `Practices and rituals turn ideas into daily life. Here we explore morning and evening routines, journaling, grounding, prayer, meditation, simple ceremonies, and the small repeated actions that give the day more shape.

Not another self-improvement plan. A way to make life feel held.`,
  },
];

export const pillarIdToCategory: Record<HomePillarId, string> = {
  clarity: 'Clarity',
  regulation: 'Regulation',
  environment: 'Environment',
  energy: 'Energy & Frequency',
  practices: 'Practices & Rituals',
};

/** Article + webinars index section hashes (see articles/index topicAnchorId). */
export function homeCategoryHash(category: string): string {
  return category
    .toLowerCase()
    .replace(/\s*&\s*/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
