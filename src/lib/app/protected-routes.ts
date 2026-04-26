/**
 * Member-only pages: real content that must not render without a session.
 * `src/pages/app/index.astro` is a redirect hub, not a gated content page.
 * For static `output: 'static'`, use `guardSessionOrRedirect` on each path here
 * until we adopt SSR + cookie sessions.
 *
 * **Community (member):** `/community/dashboard` and `/community/{trackId}` (see
 * `src/lib/community-tracks.ts` for `trackId` values) — all client-guarded.
 */
export const protectedAppPaths = ['/app/dashboard'] as const;

export type ProtectedAppPath = (typeof protectedAppPaths)[number];

/** Member community library hub (client-guarded). */
export const protectedCommunityHubPaths = ['/community/dashboard'] as const;
