export const site = {
  name: 'Wellness First Global',
  tagline: 'Clear writing, free sessions, and a steady pace.',
  description:
    'Thoughtful articles, free live webinars, and a quiet community for conscious living—plus a small shop and private guidance when you need it.',
  /** Short line for header/footer; distinct from the longer meta `description`. */
  brandLine:
    'Writing first, then free sessions and community, and a small shelf of tools we stand behind. Private help is there when a page is not enough.',
  /** Legacy short intro; the home page uses dedicated copy in `index.astro`. */
  whatThisIs:
    'We publish articles, host free live sessions, and open quiet spaces for learning. A small shop and private guidance are optional next steps.',
  /**
   * Placeholder until your domain inboxes are live; replace in deploy without hunting the codebase.
   * Display-only strings use `String(site.contactEmail)`.
   */
  contactEmail: 'hello@wellnessfirstglobal.com' as const,
} as const;

export const socialPreview = {
  defaultOgImage: '/brand/og-default.svg',
} as const;
