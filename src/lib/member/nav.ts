export type MemberNavKey =
  | 'overview'
  | 'saved-articles'
  | 'webinars'
  | 'resources'
  | 'interests'
  | 'reflections'
  | 'consultation'
  | 'account';

export const MEMBER_NAV_ITEMS: readonly { key: MemberNavKey; href: string; label: string }[] = [
  { key: 'overview', href: '/my-wellness-space', label: 'Overview' },
  { key: 'saved-articles', href: '/my-wellness-space/saved-articles', label: 'Saved Articles' },
  { key: 'webinars', href: '/my-wellness-space/webinars', label: 'My Webinars' },
  { key: 'resources', href: '/my-wellness-space/resources', label: 'Resources' },
  { key: 'interests', href: '/my-wellness-space/interests', label: 'My Interests' },
  { key: 'reflections', href: '/my-wellness-space/reflections', label: 'Reflections' },
  { key: 'consultation', href: '/my-wellness-space/consultation', label: 'Consultation Request' },
  { key: 'account', href: '/my-wellness-space/account', label: 'Account Settings' },
] as const;
