# Wellness First Global

Editorial-first marketing site and member shell: **Astro 6**, **Tailwind CSS 4**, **Cloudflare Pages** (static + Functions + optional KV), **Supabase** for email/password auth on member routes.

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

- **Marketing forms** default to **API mode** unless you set `PUBLIC_FORM_MODE=mailto` in `.env`. Plain `astro dev` does not run Cloudflare Pages Functions; use `mailto` for local form testing without `/api`, or test forms on a **Cloudflare Preview** deployment.
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

**Important:** the **`/functions` Cloudflare Pages Functions** (e.g. `/api/contact`) are **not** deployed to Vercel. For a Vercel preview, set **`PUBLIC_FORM_MODE=mailto`** in the project environment so contact/newsletter interest forms use mailto; production form APIs and KV should stay on **Cloudflare Pages** as above.

### Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `PUBLIC_SUPABASE_URL` | Build + browser | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Build + browser | Supabase anon key (RLS protects data) |
| `PUBLIC_FORM_MODE` | Build + browser | Omit or set to anything **other than** `mailto` for API forms. Use `mailto` only for local mailto handoff without `/api`. |
| `FORM_KV` | Worker / Functions | (Optional) KV namespace binding name in Cloudflare for form storage — not a `PUBLIC_*` var |

Copy from `.env.example` and mirror names in **Pages → Settings → Environment variables**.

### Supabase (auth)

In the Supabase dashboard: set **Site URL** to production origin; add **Redirect URLs** for localhost and production for `/app/**` and password recovery if used.

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
