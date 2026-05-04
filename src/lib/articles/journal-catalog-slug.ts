import type { ArticleEntry } from '@/types/content';

/**
 * Article URLs use `/articles/[slug]` where slug is `entry.data.slug ?? entry.id`.
 * After seeding `public.articles`, the same string must appear as `articles.slug`
 * so favorites and activity can resolve rows.
 */
export function journalCatalogSlug(entry: ArticleEntry): string {
  return entry.data.slug ?? entry.id;
}
