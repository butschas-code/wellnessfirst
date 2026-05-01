import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const publicPathOrUrl = z.union([z.string().startsWith('/'), z.string().url()]);
const ctaTarget = z.union([
  z.string().startsWith('/'),
  z.string().startsWith('mailto:'),
  z.string().url(),
]);

/**
 * Decap CMS list fields often write `{ tag: "x" }` / `{ product: "id" }` style rows.
 * Authoring by hand and most frontmatter use plain `string[]`. Accept both.
 */
function stringListFromDecap(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  const out: string[] = [];
  for (const item of val) {
    if (typeof item === 'string') {
      out.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const v = o.tag ?? o.product ?? o.aid ?? o.area;
      if (typeof v === 'string') out.push(v);
    }
  }
  return out;
}

const stringListField = z.preprocess(stringListFromDecap, z.array(z.string()).default([]));
const focusAreasField = z.preprocess(stringListFromDecap, z.array(z.string()).min(1));

/** Public URL segment; lowercase, hyphenated. If omitted, the file `id` is used. */
const articleSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens, e.g. my-article-slug')
  .optional();

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    /** Optional URL slug; must stay unique and stable for links & SEO. */
    slug: articleSlug,
    /** Short lead for cards, list pages, and default meta when `seoDescription` is unset. */
    excerpt: z.string(),
    subtitle: z.string().optional(),
    author: z.string(),
    /** Publication date (for display, order, and structured data). */
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    readingMinutes: z.number().int().min(1).max(120).optional(),
    /** Facet for the journal filter strip and browse UX. */
    category: z.string(),
    /** Topic labels; support related-article matching and future discovery. */
    tags: stringListField,
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** Optional hero: path under `/public` (e.g. `/media/...` ) or full URL. */
    coverImage: publicPathOrUrl.optional(),
    /** Affects the article page hero only; list/card previews always use `cover`. */
    coverImageFit: z.enum(['cover', 'contain']).optional(),
    /** Product collection entry `id`s (file stem), e.g. `infinity-uno`. */
    relatedProducts: stringListField,
    /** Webinar entry `id` to surface in the related-offer block. */
    relatedWebinar: z.string().optional(),
    /** Consultation entry `id` for the related-offer block. */
    relatedConsultation: z.string().optional(),
    /** Overwrites `<title>` in head (still suffixed with site name unless equal to site name). */
    seoTitle: z.string().optional(),
    /** Overwrites default meta/OG description. */
    seoDescription: z.string().optional(),
  }),
});

const offerSlug = articleSlug;

const webinars = defineCollection({
  loader: glob({ base: './src/content/webinars', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug: offerSlug,
    /** Card, list, and default meta (hero lead on the detail page). */
    excerpt: z.string(),
    /** Core narrative blocks for the detail template. */
    whatItIs: z.string(),
    whoItIsFor: z.string(),
    whyItMatters: z.string(),
    whatToExpect: z.string(),
    /** Optional trust-building line (host intent, editorial standard, no paywall games). */
    trustNote: z.string().optional(),
    startAt: z.coerce.date(),
    durationMinutes: z.number().int().min(15).max(240),
    format: z.enum(['live', 'replay']),
    host: z.string(),
    /** Free sessions are clearly marked in the UI; paid pricing can join later. */
    isFree: z.boolean().default(true),
    /** Registration or replay access; mailto, path, or external URL. */
    primaryLink: ctaTarget.optional(),
    coverImage: publicPathOrUrl.optional(),
    relatedArticleIds: stringListField,
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

const consultations = defineCollection({
  loader: glob({ base: './src/content/consultations', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug: offerSlug,
    /** Short line for cards and meta. */
    summary: z.string(),
    whatItIs: z.string(),
    whoItIsFor: z.string(),
    whyItMatters: z.string(),
    whatToExpect: z.string(),
    cadence: z.string(),
    leadTime: z.string(),
    focusAreas: focusAreasField,
    ctaLabel: z.string().default('Begin a conversation'),
    ctaHref: ctaTarget,
    /** Optional hero: path under `/public` or full URL. */
    coverImage: publicPathOrUrl.optional(),
    /**
     * Browse filter + card labelling.
     * Thematic consults use the first four; legacy values remain valid for older entries.
     */
    group: z
      .enum(['geopathic', 'astrology', 'home', 'frequency', 'coaching', 'environment', 'ritual'])
      .default('coaching'),
    order: z.number().int().default(0),
    relatedArticleIds: stringListField,
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

const products = defineCollection({
  loader: glob({ base: './src/content/products', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    name: z.string(),
    slug: offerSlug,
    /** Card + hero tagline; keep it editorial, not SKU copy. */
    oneLine: z.string(),
    category: z.string(),
    whatItIs: z.string(),
    whoItIsFor: z.string(),
    whyItMatters: z.string(),
    whatToExpect: z.string(),
    /** Optional material, origin, or design note—signals curation. */
    craftNote: z.string().optional(),
    priceNote: z.string().optional(),
    learnMoreUrl: ctaTarget.optional(),
    image: publicPathOrUrl.optional(),
    availability: z.enum(['available', 'waitlist', 'retired']),
    order: z.number().int().default(0),
    relatedArticleIds: stringListField,
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    /** Optional: editors using Decap may keep this in frontmatter; not used for routes (file `id` is the slug). */
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    showInNav: z.boolean().default(true),
    navLabel: z.string().optional(),
    order: z.number().int().default(100),
    /** Hero text alignment / density */
    hero: z
      .object({
        eyebrow: z.string().optional(),
        align: z.enum(['left', 'center']).default('left'),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, webinars, consultations, products, pages };
