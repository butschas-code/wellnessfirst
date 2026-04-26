/**
 * Homepage: marketing meta, article picks, footer line.
 * Article links point at real content routes; displayed titles on cards may differ from MD titles.
 */
export const homeMetaDescription =
  'Explore what quietly makes life better — Clarity, Regulation, Environment, Energy & Frequency, and Practices & Rituals. Articles, free webinars, and grounded ideas for conscious living.';

export const homeFooterTagline =
  'Wellness First Global — conscious living through Clarity, Regulation, Environment, Energy & Frequency, and Practices & Rituals.';

export const homeFeaturedArticleIds = [
  'clarity-age-of-noise-inner-health',
  'regulation-calm-is-not-weakness',
  'environment-your-home-is-not-neutral',
  'energy-what-do-we-mean-by-frequency',
  'practices-rituals-structure-for-soul',
] as const;

export const homeJournalDisplay: Record<
  (typeof homeFeaturedArticleIds)[number],
  { category: string; title: string; summary: string }
> = {
  'clarity-age-of-noise-inner-health': {
    category: 'Clarity',
    title: 'The Age of Noise: Why Inner Clarity Has Become a Form of Health',
    summary:
      'When information is endless but direction is scarce, the nervous system pays the price. Inner clarity is not luxury—it is the health of knowing what is true for you.',
  },
  'regulation-calm-is-not-weakness': {
    category: 'Regulation',
    title: 'Why Calm Is Not Weakness',
    summary:
      'In a culture that mistakes speed for strength, real calm is capacity: to feel what moves through you without being owned by it. That is a trainable, intelligent form of power.',
  },
  'environment-your-home-is-not-neutral': {
    category: 'Environment',
    title: 'Your Home Is Not Neutral',
    summary:
      'A room can look beautiful and still exhaust you. Light, air, sound, and order send signals the body reads whether or not you do. Coherence, not price, is what makes a home restorative.',
  },
  'energy-what-do-we-mean-by-frequency': {
    category: 'Energy & Frequency',
    title: 'What Do We Mean by “Frequency” in Wellness?',
    summary:
      'A plain-language map: frequency as rhythm and signal, and what honest wellness language sounds like—without empty jargon.',
  },
  'practices-rituals-structure-for-soul': {
    category: 'Practices & Rituals',
    title: 'Rituals Are Not Decoration — They Are Structure for the Soul',
    summary:
      'Small repeated gestures turn ordinary time into something the body can trust—without performance or show.',
  },
};

export const homeProductIds = [
  { id: 'infinity-uno' as const, cta: 'Learn more' as const },
  { id: 'riverstone-bracelet-set' as const, cta: 'View item' as const },
  { id: 'hanuman-murti-brass' as const, cta: 'View item' as const },
] as const;

export const homeProductDisplay: Record<
  'infinity-uno' | 'riverstone-bracelet-set' | 'hanuman-murti-brass',
  { category: string; title: string; summary: string }
> = {
  'infinity-uno': {
    category: 'Frequency & Regulation',
    title: 'Infinity Uno',
    summary:
      'A frequency-based tool for calm, focus, and unhurried regulation. Offered thoughtfully, not impulsively.',
  },
  'riverstone-bracelet-set': {
    category: 'Wearable Craft',
    title: 'Bracelets',
    summary:
      'Simple wearable pieces chosen for texture, presence, and quiet everyday meaning.',
  },
  'hanuman-murti-brass': {
    category: 'Sacred Object',
    title: 'Hanuman Murti',
    summary:
      'A sacred object for home, practice, and remembrance — chosen with care, not as décor noise.',
  },
};

/** Primary footer links in the order specified for the home marketing footer. */
export const homeFooterNav = [
  { href: '/about', label: 'About' },
  { href: '/articles', label: 'Articles' },
  { href: '/webinars', label: 'Webinars' },
  { href: '/shop', label: 'Shop' },
  { href: '/contact', label: 'Contact' },
] as const;

export const homeFooterLegal = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/imprint', label: 'Imprint' },
] as const;
