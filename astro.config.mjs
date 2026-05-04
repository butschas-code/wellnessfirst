// @ts-check
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

/** Vercel sets `VERCEL=1` during `npm run build` — the Cloudflare adapter is incompatible with that platform. */
const useVercel = Boolean(process.env.VERCEL);

const _dirname = dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://wellnessfirstglobal.com',
  output: 'static',
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
  },
  adapter: useVercel ? vercel() : cloudflare(),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        if (page.includes('/styleguide') || page.includes('/app')) return false;
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