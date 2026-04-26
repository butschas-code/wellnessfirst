/** First scroll tint on home; keep in sync with `:root --wfg-home-ambient` and `body.wfg-home-body` in global.css. */
export const WFG_HOME_SCROLL_FIRST_BG = '#f4f6f4';

/**
 * Color journey matched to the home page bands (hero through newsletter), then into deeper
 * forest/navy for the end of long pages. Used when a route has fewer than two `[data-bg]` nodes
 * (see `src/scripts/scroll-color-transition.ts`).
 */
export const HOME_SCROLL_STOPS: readonly string[] = [
  WFG_HOME_SCROLL_FIRST_BG,
  '#f8faf8', // intro
  '#f0f4f2', // paths
  '#e8f0e9', // five themes
  '#d7e2da', // article grid
  '#c1d0c3', // webinar
  '#9fb0a0', // newsletter
  '#7d9080', // same family as `scroll-color-transition` tail, long-scroll bridge
  '#1a2f3d',
  '#0a2334',
];
