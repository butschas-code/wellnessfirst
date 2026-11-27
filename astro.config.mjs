// @ts-check
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

/** Vercel sets `VERCEL=1` during `npm run build` — the Cloudflare adapter is incompatible with that platform. */
const useVercel = Boolean(process.env.VERCEL);

const _dirname = dirname(fileURLToPath(import.meta.url));

/** Canonical site origin for sitemap, `Astro.site`, OG URLs. Override per deploy with `PUBLIC_SITE_URL`. */
const siteFromEnv = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
const configuredSite = siteFromEnv || 'https://www.wellnessfirstglobal.com';

// https://astro.build/config
export default defineConfig({
  site: configuredSite,
  output: 'static',
  /** Life Rhythm moved from /astro — keep old links and bookmarks working. */
  redirects: {
    '/astro': '/liferhythm',
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    define: {
      /** Used by `src/lib/forms-config.ts` — Vercel has no `/functions` form APIs by default. */
      __WFG_DEPLOY_TARGET__: JSON.stringify(useVercel ? 'vercel' : 'cloudflare'),
    },
    resolve: {
      alias: {
        '@': resolve(_dirname, 'src'),
      },
    },
    plugins: [tailwindcss()],
    ssr: {
      /**
       * astronomy-engine ships its ESM build as `.js` without `"type": "module"`, so Node on
       * Vercel loads it as CommonJS and the programs API crashes ("Unexpected token 'export'").
       * Bundling it into the server build avoids loading it from node_modules at runtime.
       */
      noExternal: ['astronomy-engine'],
    },
  },
  adapter: useVercel ? vercel() : cloudflare(),
  integrations: [
    mdx(),
    /** Wellness Waves player (src/sound/player) is a React island. */
    react({ include: ['**/src/sound/**'] }),
    sitemap({
      filter: (page) => {
        if (page.includes('/styleguide') || page.includes('/app') || /\/astro\/?$/.test(page)) return false;
        try {
          const p = new URL(page).pathname.replace(/\/$/, '') || '/';
          if (p === '/community/dashboard' || p.startsWith('/community/')) return false;
          if (
            p === '/login' ||
            p === '/signup' ||
            p === '/verify-email' ||
            p === '/forgot-password' ||
            p === '/reset-password' ||
            p.startsWith('/my-wellness-space')
          ) {
            return false;
          }
        } catch {
          return true;
        }
        return true;
      },
    }),
  ],
});