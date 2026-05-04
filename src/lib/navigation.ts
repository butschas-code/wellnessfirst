/** Single source for primary destinations (header, mobile menu, footer). */
export type PrimaryNavItem = {
  href: string;
  label: string;
  /** Header / mobile sheet show an icon only; footer still uses `label` text. */
  iconOnly?: boolean;
};

export const primaryNav: readonly PrimaryNavItem[] = [
  { href: '/articles', label: 'Articles' },
  { href: '/webinars', label: 'Webinars' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/login', label: 'Sign in', iconOnly: true },
];
