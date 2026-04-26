import type { CollectionEntry } from 'astro:content';

/** Public URL path (respects optional `slug` in frontmatter). */
export function articlePath(entry: CollectionEntry<'articles'>) {
  const s = entry.data.slug ?? entry.id;
  return `/articles/${s}`;
}

/** @internal — resolve entry from param `slug` (file id or custom slug). */
export function getArticleByParamSlug(
  items: CollectionEntry<'articles'>[],
  paramSlug: string
): CollectionEntry<'articles'> | undefined {
  return items.find((e) => (e.data.slug ?? e.id) === paramSlug);
}

/**
 * Suggest related pieces: same category, then shared tags, then recency.
 */
export function relatedArticles(
  all: CollectionEntry<'articles'>[],
  current: CollectionEntry<'articles'>,
  limit = 3
): CollectionEntry<'articles'>[] {
  const cat = current.data.category;
  const tagSet = new Set(current.data.tags);
  return all
    .filter((a) => a.id !== current.id)
    .map((entry) => {
      let score = 0;
      if (entry.data.category === cat) score += 4;
      for (const t of entry.data.tags) {
        if (tagSet.has(t)) score += 2;
      }
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || +b.entry.data.publishedAt - +a.entry.data.publishedAt
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/** Fallback: latest pieces if there is no tag/category overlap. */
export function fillRelatedArticles(
  all: CollectionEntry<'articles'>[],
  current: CollectionEntry<'articles'>,
  limit: number
): CollectionEntry<'articles'>[] {
  const primary = relatedArticles(all, current, limit);
  if (primary.length >= limit) return primary;
  const ids = new Set([current.id, ...primary.map((e) => e.id)]);
  const more = all
    .filter((a) => !ids.has(a.id))
    .sort((a, b) => +b.data.publishedAt - +a.data.publishedAt);
  for (const e of more) {
    if (primary.length >= limit) break;
    primary.push(e);
  }
  return primary.slice(0, limit);
}
