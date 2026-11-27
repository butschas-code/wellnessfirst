export type MemberNavKey =
  | 'overview'
  | 'rhythm'
  | 'saved-articles'
  | 'webinars'
  | 'resources'
  | 'interests'
  | 'reflections'
  | 'consultation'
  | 'account';

/**
 * Webinars and Resources are hidden from the Wellness Space for now (their pages
 * still exist). Flip these to bring them back in the nav and on the overview.
 */
export const MEMBER_SHOW_WEBINARS = false;
export const MEMBER_SHOW_RESOURCES = false;

const ALL_ITEMS: readonly { key: MemberNavKey; href: string; label: string }[] = [
  { key: 'overview', href: '/my-wellness-space', label: 'Overview' },
  { key: 'rhythm', href: '/my-wellness-space/rhythm', label: 'Life Rhythm & Programs' },
  { key: 'saved-articles', href: '/my-wellness-space/saved-articles', label: 'Saved Articles' },
  { key: 'webinars', href: '/my-wellness-space/webinars', label: 'My Webinars' },
  { key: 'resources', href: '/my-wellness-space/resources', label: 'Resources' },
  { key: 'interests', href: '/my-wellness-space/interests', label: 'My Interests' },
  { key: 'reflections', href: '/my-wellness-space/reflections', label: 'Reflections' },
  { key: 'consultation', href: '/my-wellness-space/consultation', label: 'Consultation Request' },
  { key: 'account', href: '/my-wellness-space/account', label: 'Account Settings' },
] as const;

export const MEMBER_NAV_ITEMS = ALL_ITEMS.filter(
  (i) => (i.key !== 'webinars' || MEMBER_SHOW_WEBINARS) && (i.key !== 'resources' || MEMBER_SHOW_RESOURCES),
);
