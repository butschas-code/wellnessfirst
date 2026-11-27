/** Single source for primary destinations (header, mobile menu, footer). */
export type PrimaryNavItem = {
  href: string;
  label: string;
  /** Header / mobile sheet show an icon only; footer still uses `label` text. */
  iconOnly?: boolean;
  /** Listed in the footer only, not in the header or mobile menu. */
  footerOnly?: boolean;
};

export const primaryNav: readonly PrimaryNavItem[] = [
  { href: '/articles', label: 'Articles' },
  { href: '/webinars', label: 'Webinars' },
  { href: '/shop', label: 'Shop' },
  { href: '/liferhythm', label: 'Life Rhythm' },
  { href: '/sound', label: 'Wellness Waves' },
  { href: '/about', label: 'About' },
  { href: '/csr', label: 'CSR', footerOnly: true },
  { href: '/login', label: 'Sign in', iconOnly: true },
];

/** Header and mobile menu: everything except footer-only links. */
export const headerNav = primaryNav.filter((item) => !item.footerOnly);
