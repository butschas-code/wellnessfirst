/** Matches `public.articles.access_level` / `public.resources.access_level`. */
export const ACCESS_LEVELS = ['public', 'member', 'webinar_participants', 'paid'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export function isAccessLevel(v: unknown): v is AccessLevel {
  return typeof v === 'string' && (ACCESS_LEVELS as readonly string[]).includes(v);
}

export function normalizeAccessLevel(v: unknown): AccessLevel {
  return isAccessLevel(v) ? v : 'public';
}

export function accessBadgeLabel(level: AccessLevel): string | null {
  switch (level) {
    case 'public':
      return null;
    case 'member':
      return 'Members';
    case 'webinar_participants':
      return 'Webinar';
    case 'paid':
      return 'Program';
    default:
      return null;
  }
}
