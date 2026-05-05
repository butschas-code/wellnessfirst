# Wellness First Global

Editorial-first marketing site and member shell: **Astro 6**, **Tailwind CSS 4**, **Vercel** or **Cloudflare Pages**, **Supabase** for auth, member data, catalog-backed webinars/resources, and optional transactional hooks.

## Requirements

- **Node.js** ≥ 22.12 (see `package.json` `engines`)

## Setup

```bash
git clone <repository-url> && cd wellnessfirstglobal.com
npm install
cp .env.example .env
```

Edit `.env` with your values (see [Environment variables](#environment-variables)).

## Local development

```bash
npm run dev
```

Opens the Vite dev server (default [http://localhost:4321](http://localhost:4321)).

- **Marketing forms:** With plain `astro dev`, submissions default to **mailto** (no `/api` on the dev server). To POST against `/api/*` locally, run **`wrangler pages dev`** (Cloudflare) and set **`PUBLIC_FORM_MODE=api`**. Production behavior depends on host — see [Deployment (Vercel)](#deployment-vercel) and [`forms-config.ts`](./src/lib/forms-config.ts).
- **Supabase auth** needs `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` for sign-in/up and member `/app` + `/community/*` flows.

### Quality checks

```bash
npm run check      # Astro + TypeScript (src) + Pages Functions (functions/)
npm run build      # Production build to dist/
npm run preview    # Preview the static build (via Astro)
```

## Content model

Content lives under `src/content/` and is registered in `src/content.config.ts`.

| Collection      | Path                      | Purpose |
|----------------|---------------------------|--------|
| `articles`     | `src/content/articles/`   | Journal posts; optional `slug`, `featured`, related offers |
| `webinars`     | `src/content/webinars/`   | Sessions; `format`, `primaryLink`, narrative blocks |
| `consultations`| `src/content/consultations/` | Consult offers |
| `products`     | `src/content/products/`   | Shop / product detail |
| `pages`        | `src/content/pages/`      | Long-form pages; `showInNav`, `navLabel` for `/p/{id}` |

**Publishing:** entries use `draft: false` (default) and are filtered with `getPublished()` from `src/lib/content-filters.ts`.

**URLs:** articles and offers use public slugs where set; see `src/lib/offer-paths.ts` and collection schema for `slug` vs file `id`.

### Where articles and media live (especially on Vercel)

| Kind | Storage | Notes |
|------|---------|--------|
| **Journal copy (markdown)** | **Git** — `src/content/articles/` | Built into static HTML at `npm run build`. Editing is via Git (or Decap `/admin` committing to this repo). **Not** stored in Supabase as blobs. |
| **Hero / cover images** | **`public/`** (paths like `/media/...`) or **any HTTPS URL** in frontmatter (`coverImage`) | Served as static assets from Vercel or externally; choose URLs suitable for production caching/CDN. |
| **Shop copy, pages, legacy webinars MD** | **Git** — `src/content/*` | Same build-time pipeline. |
| **Live webinars list, bookings, seats** | **Supabase** (Postgres + RLS) | Listing/detail shells can be built with optional **`SUPABASE_SERVICE_ROLE_KEY`** at build time (CI secret only). |
| **Resources library, profiles, consultations** | **Supabase** | Member flows read/write via anon client + RLS. |
| **Optional uploads / large binaries** | Not wired by default | Add **Supabase Storage** (or another bucket) if editors need browser uploads instead of Git + `public/`. |

Member-gated article **metadata** can align with Supabase `journal_article_catalog` (see `supabase/` migrations); the **canonical authored body** for public builds remains the Markdown in this repo unless you extend the stack.

## Deployment (Cloudflare Pages)

1. **Connect** the Git repository to **Cloudflare Pages**.
2. **Build settings**
   - Build command: `npm run build`
   - Build output: **`dist`** (Astro + `@astrojs/cloudflare` places static files in `dist/client` and the worker in `dist/server`; Cloudflare’s **Astro** template usually wires this automatically). If you deploy manually, follow [Deploy Astro to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/) for your adapter version.
3. **Root directory:** repository root (must include the `functions/` folder for Pages Functions).
4. **Environment variables** (see below): set `PUBLIC_*` for **Production** and **Preview**; rebuild after changes.
5. **Functions:** `/functions/api/*.ts` deploys as `/api/contact`, `/api/newsletter`, `/api/webinar-interest`. Optional **KV** binding **`FORM_KV`** for durable form payloads (see `.env.example`).
6. **Wrangler:** `wrangler.jsonc` configures the Astro Cloudflare server entry; production hosting is typically **Pages**, not `wrangler deploy` of the same file—use the Pages UI for env and bindings.

## Deployment (Vercel)

[Vercel](https://vercel.com) sets `VERCEL=1` during the build, which makes `astro.config.mjs` use **`@astrojs/vercel`** instead of `@astrojs/cloudflare`. The site builds as a **static** Astro app suitable for Vercel.

**Marketing forms:** Cloudflare **`/functions`** (e.g. `/api/contact`) are **not** deployed here. Unless you add your own Vercel serverless routes for `/api/contact`, `/api/newsletter`, and `/api/webinar-interest`, the client defaults to **mailto** on Vercel builds (`src/lib/forms-config.ts`). You can still force **`PUBLIC_FORM_MODE=api`** if you proxy those paths elsewhere.

**Optional:** set **`PUBLIC_FORM_MODE=mailto`** explicitly in Vercel env if you want to document intent; behavior matches the default for Vercel builds.

### Custom domain (`www` vs apex)

Production defaults assume **`https://www.wellnessfirstglobal.com`** as the canonical host (`astro.config.mjs`, `public/robots.txt`, Decap `public/admin/config.yml`).

1. **Vercel → Domains:** Assign **`www.wellnessfirstglobal.com`** and **`wellnessfirstglobal.com`**; redirect one to the other so SEO stays consistent (pick **`www`** to match this repo, or set **`PUBLIC_SITE_URL`** to your preferred origin — no trailing slash — and rebuild).
2. **Supabase → Authentication → URL configuration:** Set **Site URL** to that same canonical origin (e.g. `https://www.wellnessfirstglobal.com`). Under **Redirect URLs**, include **`https://www.wellnessfirstglobal.com/**`** (and **`https://wellnessfirstglobal.com/**`** if bare apex still resolves without redirect). Include **`http://localhost:4321/**`** for local auth flows.
3. **GitHub OAuth App** (Decap `/admin`): **Authorization callback URL** must be **`https://www.wellnessfirstglobal.com/callback`** (must match `base_url` in `public/admin/config.yml`). Update the GitHub app if it still points at `*.vercel.app`.
4. After DNS/CDN changes, trigger a **redeploy** so builds pick up env overrides (`PUBLIC_SITE_URL`).

### Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `PUBLIC_SITE_URL` | Build only | Optional. Canonical site origin (no `/` at end). Overrides default `https://www.wellnessfirstglobal.com` for sitemap, `Astro.site`, OG URLs. |
| `PUBLIC_SUPABASE_URL` | Build + browser | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Build + browser | Supabase anon key (RLS protects data) |
| `PUBLIC_FORM_MODE` | Build + browser | `mailto` → mailto only. Any other non-empty value → POST `/api/*` (Cloudflare Functions). **Unset:** Vercel production → mailto; Cloudflare production → API; `astro dev` → mailto. |
| `FORM_KV` | Worker / Functions | (Optional) KV namespace binding name in Cloudflare for form storage — not a `PUBLIC_*` var |

Copy from `.env.example` and mirror names in **Pages → Settings → Environment variables**.

### Supabase (auth)

In the Supabase dashboard: set **Site URL** to your canonical production origin (e.g. `https://www.wellnessfirstglobal.com`); add **Redirect URLs** for localhost and both bare apex and `www` if both hostnames reach the app.

### Supabase env vars (“My Wellness Space” base)

Place **`PUBLIC_SUPABASE_URL`** and **`PUBLIC_SUPABASE_ANON_KEY`** where your build reads env:

| Where | Files / UI |
|-------|------------|
| **Local** | `.env` or `.env.local` at repo root (copy from `.env.example` or `.env.local.example`). Astro/Vite loads these automatically for `npm run dev` / `npm run build`. |
| **Cloudflare Pages** | Project → Settings → Environment variables → Production / Preview (same variable names). |
| **Vercel** | Project → Settings → Environment variables (Production / Preview). |

**Naming:** Astro uses **`PUBLIC_*`** for values exposed to the browser — same role as **`NEXT_PUBLIC_*`** in Next.js. Only use the **anon** key client-side; keep **`service_role`** out of this repo and off the frontend.

Clients live under **`src/lib/supabase/`**: **`browser.ts`** (PKCE session in the browser) and **`server.ts`** (anon server client for future SSR/API routes).

**Database (My Wellness Space):** migrations and seeds are in **`supabase/`** — see **[`supabase/README.md`](./supabase/README.md)**.

## Repository layout (short)

- `src/pages/` — routes (`/`, `/articles`, `/app/*`, `/community/*`, …)
- `src/components/` — layouts, cards, forms, member UI
- `src/lib/` — site config, SEO, navigation, Supabase client, form config
- `supabase/` — Postgres migrations + optional SQL seeds for the member system
- `functions/` — Cloudflare Pages Functions for public forms
- `public/` — `robots.txt`, favicon, static brand assets

## License

Proprietary — All rights reserved unless otherwise stated.
