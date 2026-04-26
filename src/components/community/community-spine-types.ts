export type CommunityPage =
  | 'home'
  | 'webinars'
  | 'shop'
  | 'consultations'
  | 'about'
  | 'contact'
  | 'article'
  | 'webinar'
  | 'product'
  | 'consultation';

export type SpotlightCard = {
  kicker: string;
  title: string;
  meta?: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** primary link opens in new tab */
  primaryExternal?: boolean;
};
