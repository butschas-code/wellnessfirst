/**
 * Bespoke 1.5px stroke SVG Icon Library for Astronomical & Wellness Engine
 * Adheres strictly to the Impeccable craft floor: no Unicode emojis as icons,
 * consistent 1.5px stroke geometry, accessible currentColor styling.
 */

export type AstroIconName =
  | 'compass'
  | 'clock'
  | 'calendar'
  | 'bolt'
  | 'star'
  | 'briefcase'
  | 'leaf'
  | 'handshake'
  | 'users'
  | 'shield'
  | 'sun'
  | 'moon'
  | 'flame'
  | 'water'
  | 'wind'
  | 'earth'
  | 'brain'
  | 'bone'
  | 'rocket'
  | 'airplane'
  | 'coins'
  | 'home'
  | 'target'
  | 'radar'
  | 'check'
  | 'cross'
  | 'arrowRight'
  | 'sparkles'
  | 'scale'
  | 'info'
  | 'alert'
  | 'pulse'
  | 'chart'
  | 'gem'
  | 'anchor';

export const ASTRO_ICONS: Record<AstroIconName, string> = {
  compass: `<circle cx="12" cy="12" r="9.5"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fill-opacity="0.15"/>`,
  clock: `<circle cx="12" cy="12" r="9.5"/><polyline points="12 6.5 12 12 15.5 14"/>`,
  calendar: `<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="5"/><line x1="16" y1="2.5" x2="16" y2="5"/><circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="12" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/>`,
  bolt: `<polygon points="13 2 4.5 13.5 11 13.5 10 22 19.5 9.5 13 9.5 13 2"/>`,
  star: `<polygon points="12 2.5 14.8 8.8 21.5 9.6 16.5 14.2 17.8 21 12 17.6 6.2 21 7.5 14.2 2.5 9.6 9.2 8.8 12 2.5"/>`,
  briefcase: `<rect x="3" y="6.5" width="18" height="14" rx="2"/><path d="M8 6.5V4.5C8 3.67 8.67 3 9.5 3H14.5C15.33 3 16 3.67 16 4.5V6.5"/><line x1="3" y1="12" x2="21" y2="12"/>`,
  leaf: `<path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 20 3C20 12 16 19 11 20Z"/><line x1="11" y1="20" x2="7.5" y2="16.5"/>`,
  handshake: `<path d="M18.5 13L15 9.5L10 14.5L7 11.5L3 15.5L7 19.5L12 14.5L15.5 18L21 12.5L18.5 10"/><path d="M10 7L13 10"/>`,
  users: `<path d="M16 21V19C16 17.34 14.66 16 13 16H6C4.34 16 3 17.34 3 19V21"/><circle cx="9.5" cy="8.5" r="4"/><path d="M21 21V19.5C21 18.25 20.15 17.2 19 16.9"/><path d="M16 4.3C16.85 4.6 17.5 5.5 17.5 6.5C17.5 7.5 16.85 8.4 16 8.7"/>`,
  shield: `<path d="M12 2.5L19.5 5.5V11.5C19.5 16.5 16.3 20.8 12 22C7.7 20.8 4.5 16.5 4.5 11.5V5.5L12 2.5Z"/><line x1="12" y1="2.5" x2="12" y2="22"/>`,
  sun: `<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"/>`,
  moon: `<path d="M20.5 14.5A9 9 0 1 1 9.5 3.5A7 7 0 0 0 20.5 14.5Z"/>`,
  flame: `<path d="M12 2.5C12 2.5 7 8 7 13.5C7 16.54 9.24 19.5 12 19.5C14.76 19.5 17 16.54 17 13.5C17 8 12 2.5 12 2.5Z"/><path d="M12 10C12 10 9.5 13 9.5 15.5C9.5 16.88 10.62 18 12 18C13.38 18 14.5 16.88 14.5 15.5C14.5 13 12 10 12 10Z"/>`,
  water: `<path d="M3 11C5.5 9 8.5 9 11 11C13.5 13 16.5 13 19 11C20.5 9.8 21.5 10 22 10.5"/><path d="M3 16C5.5 14 8.5 14 11 16C13.5 18 16.5 18 19 16C20.5 14.8 21.5 15 22 15.5"/>`,
  wind: `<path d="M3.5 9H16.5C18 9 19.5 7.8 19.5 6.2C19.5 4.6 18.1 3.5 16.5 3.5C15 3.5 14 4.5 14 6"/><path d="M2.5 13.5H19C20.4 13.5 21.5 14.6 21.5 16C21.5 17.4 20.4 18.5 19 18.5C17.6 18.5 16.5 17.4 16.5 16"/><path d="M4 18H11.5C12.5 18 13.5 18.8 13.5 19.8C13.5 20.8 12.6 21.5 11.5 21.5C10.5 21.5 9.8 20.8 9.8 20"/>`,
  earth: `<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12H21.5"/><path d="M12 2.5C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21.5"/><path d="M12 2.5C9.5 5.5 8 8.5 8 12C8 15.5 9.5 18.5 12 21.5"/>`,
  brain: `<path d="M9.5 4C8.1 4 7 5.1 7 6.5C7 6.9 7.1 7.2 7.3 7.5C5.9 8.1 5 9.4 5 11C5 12.1 5.5 13.1 6.3 13.7C5.5 14.5 5 15.7 5 17C5 19.2 6.8 21 9 21C9.6 21 10.1 20.9 10.6 20.6C11 20.9 11.5 21 12 21V4H9.5Z"/><path d="M14.5 4C15.9 4 17 5.1 17 6.5C17 6.9 16.9 7.2 16.7 7.5C18.1 8.1 19 9.4 19 11C19 12.1 18.5 13.1 17.7 13.7C18.5 14.5 19 15.7 19 17C19 19.2 17.2 21 15 21C14.4 21 13.9 20.9 13.4 20.6C13 20.9 12.5 21 12 21V4H14.5Z"/>`,
  bone: `<path d="M17.5 4C16.8 4 16.1 4.4 15.7 5L8.3 12.4C7.9 12 7.2 11.6 6.5 11.6C4.6 11.6 3 13.2 3 15.1C3 16 3.4 16.8 4 17.4C3.4 18 3 18.8 3 19.7C3 21.6 4.6 23.2 6.5 23.2C7.4 23.2 8.2 22.8 8.8 22.2C9.4 22.8 10.2 23.2 11.1 23.2C13 23.2 14.6 21.6 14.6 19.7C14.6 19 14.2 18.3 13.8 17.9L21.2 10.5C21.8 10.9 22.5 11.3 23.2 11.3"/>`,
  rocket: `<path d="M12 2.5C15 5.5 17.5 10 17 14L14 17L12 15L10 17L7 14C6.5 10 9 5.5 12 2.5Z"/><circle cx="12" cy="9" r="1.5"/><path d="M7 14L4 16L5 19L8.5 18.5"/><path d="M17 14L20 16L19 19L15.5 18.5"/><line x1="12" y1="17" x2="12" y2="21.5"/>`,
  airplane: `<path d="M21.5 12.5L3.5 2.5L8.5 12.5L3.5 22.5L21.5 12.5Z"/><line x1="8.5" y1="12.5" x2="21.5" y2="12.5"/>`,
  coins: `<ellipse cx="12" cy="7" rx="8" ry="3.5"/><path d="M4 7V12C4 13.9 7.6 15.5 12 15.5C16.4 15.5 20 13.9 20 12V7"/><path d="M4 12V17C4 18.9 7.6 20.5 12 20.5C16.4 20.5 20 18.9 20 17V12"/>`,
  home: `<path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V10.5Z"/><path d="M9 21V13H15V21"/>`,
  target: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>`,
  radar: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.5"/><line x1="12" y1="12" x2="18.5" y2="5.5"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  cross: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  arrowRight: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  sparkles: `<path d="M12 2.5L13.8 8.2L19.5 10L13.8 11.8L12 17.5L10.2 11.8L4.5 10L10.2 8.2L12 2.5Z"/><path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z"/>`,
  scale: `<path d="M12 3V21"/><path d="M5 7H19"/><path d="M5 7L2 14H8L5 7Z"/><path d="M19 7L16 14H22L19 7Z"/><path d="M8 21H16"/>`,
  info: `<circle cx="12" cy="12" r="9.5"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.5" r="0.75" fill="currentColor"/>`,
  alert: `<polygon points="12 3 22 20.5 2 20.5 12 3"/><line x1="12" y1="9.5" x2="12" y2="14.5"/><circle cx="12" cy="17.5" r="0.75" fill="currentColor"/>`,
  pulse: `<polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/>`,
  chart: `<line x1="4" y1="20" x2="20" y2="20"/><polyline points="5 15 10 10 14 14 19 7"/>`,
  gem: `<polygon points="6 3.5 18 3.5 21.5 8.5 12 21 2.5 8.5 6 3.5"/><polyline points="2.5 8.5 21.5 8.5"/><polyline points="12 21 7.5 8.5 10 3.5"/><polyline points="12 21 16.5 8.5 14 3.5"/>`,
  anchor: `<circle cx="12" cy="5" r="2.5"/><line x1="12" y1="7.5" x2="12" y2="21"/><path d="M5 12C5 16 8.1 19.5 12 19.5C15.9 19.5 19 16 19 12"/><line x1="8" y1="10" x2="16" y2="10"/>`
};

/**
 * Returns an inline SVG element string for the given icon name.
 */
export function getAstroIcon(name: AstroIconName, className: string = 'w-4 h-4'): string {
  const inner = ASTRO_ICONS[name] || ASTRO_ICONS.star;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${inner}</svg>`;
}

