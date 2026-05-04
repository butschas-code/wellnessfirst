import { getEntry } from 'astro:content';
import { publishedOnly } from '@/lib/content-filters';
import type { ArticleEntry } from '@/types/content';

/** Resolve related articles from article collection ids; skips missing or draft. */
export async function resolveRelatedArticles(ids: string[]): Promise<ArticleEntry[]> {
  const out: ArticleEntry[] = [];
  for (const id of ids) {
    const e = await getEntry('articles', id);
    if (e && publishedOnly(e)) out.push(e);
  }
  return out;
}
