// @ts-check
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

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
    resolve: {
      alias: {
        '@': resolve(_dirname, 'src'),
      },
    },
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        if (page.includes('/styleguide') || page.includes('/app')) return false;
        try {
          const p = new URL(page).pathname.replace(/\/$/, '') || '/';
          if (p === '/community/dashboard' || p.startsWith('/community/')) return false;
        } catch {
          return true;
        }
        return true;
      },
    }),
  ],
});