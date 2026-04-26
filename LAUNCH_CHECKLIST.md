# Launch checklist — Wellness First Global

Use this list before pointing the production domain at the new build. Items are ordered by theme; check all that apply to your release.

---

## 1. Visual polish

- [ ] Home, About, Articles, Webinars, Consultations, Shop, Community, Contact render with no layout breaks at **320px**, **768px**, and **1280px** width.
- [ ] Hero spacing and type scale look intentional on mobile (no orphaned one-line headings).
- [ ] Styleguide (`/styleguide`) is **noindex** and excluded from sitemap; only use internally.

## 2. Mobile responsiveness

- [ ] Primary nav: hamburger opens/closes; scroll lock when open; **Escape** closes menu.
- [ ] Article / shop / webinar filter pills work on touch targets (no accidental double-tap issues).
- [ ] Member `/app` and `/community` pages: forms and cards scroll without horizontal overflow.

## 3. Accessibility basics

- [ ] Skip link (“Skip to main content”) visible on focus.
- [ ] Interactive controls are **buttons** or **links** with discernible names (`aria-label` where icon-only).
- [ ] Mobile menu dialog: `aria-expanded` on open button; `aria-hidden` toggles on the panel (see `SiteHeader.astro`).
- [ ] Form success and error regions: `role="status"` / `role="alert"` and `aria-live` where implemented.
- [ ] Meaningful **alt** text on non-decorative images (article/offer heroes).

## 4. Metadata and SEO

- [ ] `astro.config.mjs` `site` is the **canonical production origin** (HTTPS, no trailing slash issues in `sitemap`).
- [ ] Key routes set `canonicalPath` / `title` / `description` on `BaseLayout`.
- [ ] **Sitemap** (`@astrojs/sitemap`) generated; member paths (`/app`, `/community/*` except public `/community`) **excluded** in config.
- [ ] **`public/robots.txt`**: `Sitemap` URL matches production; **Disallow** includes `/app/`, `/styleguide`, and **member** `/community/...` paths (dashboard + track slugs). **Do not** block the public invitation page `/community` (no trailing path segment).
- [ ] When adding a **new community track**: add a matching `Disallow: /community/{trackId}` line in `robots.txt` (or adjust policy) and keep `src/lib/community-tracks.ts` in sync.
- [ ] Open Graph: default or per-page images; avoid SVG for social where platforms expect raster (documented in code comments if SVG default remains).

## 5. Internal linking

- [ ] Header `primaryNav` and CMS-driven `/p/*` pages match the footer “Key destinations” story.
- [ ] Footer: legal links + contact + member sign-in.
- [ ] `src/pages/p/about.astro` redirects to `/about` (legacy path).

## 6. CTA consistency

- [ ] Primary actions use `btn-primary`; secondary use `btn-secondary`; “quiet” uses `link-wfg` / `link-wfg-ghost` as in existing pages.
- [ ] Consultation and contact paths are clear from home and article bottoms (`ConversionCallout` where used).

## 7. Content completeness

- [ ] **Imprint** (`/legal/imprint`): replace placeholder **legal entity / address** when incorporated.
- [ ] `site.contactEmail` in `src/lib/site.ts` matches a working inbox (or forwarder).
- [ ] **Draft** content: all collections use `draft: false` for anything public (filter is in `getPublished`).

## 8. Auth flow sanity

- [ ] **Supabase** project has email provider configured; Site URL and redirect URLs include production and preview as needed.
- [ ] `PUBLIC_SUPABASE_*` set in **Cloudflare Pages** for production and preview builds.
- [ ] `/app/sign-in` → `next` param allows `/app/*` and `/community/*` (`safeMemberNextParam`).
- [ ] Member layouts use `noindex` (`AppLayout`); no Supabase keys in server logs.

## 9. Form handling sanity

- [ ] Production: **`PUBLIC_FORM_MODE` is not `mailto`** (omit or set to a value other than `mailto`) so forms POST to **Pages Functions**.
- [ ] **KV (optional):** `FORM_KV` binding in Cloudflare for durable storage; without KV, submissions still return 200 with a safe log line (no PII in logs).
- [ ] **Smoke test** on a **Preview** URL: contact, interest/newsletter, webinar interest; verify success UI and (if KV) keys in dashboard.

## 10. Code cleanliness

- [ ] `npm run check` passes (Astro + `functions` TypeScript).
- [ ] `npm run build` passes with no new errors.
- [ ] **Post-launch:** migrate off deprecated Content Layer `entry.slug` usage in templates where the build warns—prefer `id` or explicit `data.slug` from schema (see build log).

## 11. Dead code and unused files

- [ ] Remove experimental copies of pages/components not referenced by routes.
- [ ] Keep `functions/lib` only for shared handlers; do not add route files that only duplicate logic without exports.

## 12. Deployment readiness (Cloudflare Pages)

- [ ] **Build command:** `npm run build` (Node 22+).
- [ ] **Output directory** matches the Astro + Cloudflare adapter layout for the Pages project (see README).
- [ ] **Root** includes `functions/` so **Pages Functions** deploy with the site.
- [ ] **Environment variables** set for Production and Preview.
- [ ] **Custom domain** + HTTPS + redirect from apex → `www` or chosen canonical (as you prefer), aligned with `site` in `astro.config.mjs`.
- [ ] **Analytics / cookies:** privacy copy in `/legal/privacy` matches what you run in production.

---

## Day-one quick smoke test (production)

1. Open `/`, `/contact`, `/community`, one article, one product, one webinar.
2. Submit **contact** form → success state (or check KV / email process).
3. **Sign up** + **sign in** + **open library** (`/community/dashboard`) + **sign out**.
4. `curl -I` or browser devtools: `robots.txt` and `sitemap-index.xml` return 200 on production origin.

---

*Last updated with repository review (April 2026). Update this file when launch scope changes.*
