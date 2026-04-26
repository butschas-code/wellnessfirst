/**
 * Image strategy for this project
 * ----------------
 * - **Public / content URLs** (`/public/...` or frontmatter paths like `/brand/og-default.svg`):
 *   Use `<ContentImage />` or `<img>` with explicit `width` / `height` when known to reduce CLS;
 *   always set meaningful `alt` (or `alt=""` + decorative context only when truly decorative).
 * - **Optimized & hashed assets**: place files under `src/assets/` and import them:
 *   `import pic from '../assets/example.jpg'` then `<Image src={pic} alt="..." widths={[800,1200]} sizes="..." />`
 *   using `astro:assets` (`import { Image } from 'astro:assets'`).
 * - **Open Graph**: prefer ≥ 1200×630 for custom share images when you add raster OG art; SVG is fine for defaults.
 */

/** Default dimensions when only a public URL string is available (approximate OG ratio). */
export const DEFAULT_OG_DIMS = { width: 1200, height: 630 } as const;
