import { getSupabaseBrowser } from '@/lib/supabase/browser';

/** Cached slug → published article id for favorites, reflections, etc. */
const idBySlug = new Map<string, string>();

export function peekCachedArticleId(slug: string): string | undefined {
  return idBySlug.get(slug);
}

export async function getPublishedArticleIdBySlug(slug: string): Promise<string | null> {
  const cached = idBySlug.get(slug);
  if (cached) return cached;

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data?.id) return null;
  idBySlug.set(slug, data.id);
  return data.id;
}

export function rememberArticleIdForSlug(slug: string, id: string): void {
  idBySlug.set(slug, id);
}
