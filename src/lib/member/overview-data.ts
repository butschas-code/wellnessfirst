import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileRow = {
  full_name: string | null;
  display_name: string | null;
  onboarding_completed: boolean | null;
};

export type FavoriteArticleRow = {
  created_at: string;
  articles: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    topic_key: string | null;
  } | null;
};

export type BookingRow = {
  id: string;
  webinars: {
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    timezone: string;
  } | null;
};

export type ResourceRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  topic_key: string | null;
  resource_type?: string | null;
  created_at: string;
  external_url: string | null;
  file_url: string | null;
};

/** Published articles suggested from topic_preferences (excluding saves handled in fetch). */
export type RecommendedArticleRow = {
  slug: string;
  title: string | null;
  excerpt: string | null;
  topic_key: string | null;
};

export type OverviewConsultationSummary = {
  id: string;
  status: string;
  topic: string | null;
  created_at: string;
  updated_at: string;
};

export type OverviewWebinarCatalogRow = {
  slug: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  topic_key: string | null;
  booking_open: boolean | null;
};

const RESOURCE_SELECT =
  'id, slug, title, description, topic_key, resource_type, created_at, external_url, file_url' as const;

const ARTICLE_PUBLIC_MEMBER_FILTER = ['public', 'member'] as const;

async function fetchOverviewResources(
  supabase: SupabaseClient,
  topicKeys: string[],
  limit = 6,
): Promise<{ rows: ResourceRow[]; error: string | null }> {
  if (topicKeys.length === 0) {
    const { data, error } = await supabase
      .from('resources')
      .select(RESOURCE_SELECT)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { rows: (data ?? []) as unknown as ResourceRow[], error: error?.message ?? null };
  }

  const { data: matched, error: e1 } = await supabase
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('published', true)
    .in('topic_key', topicKeys)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (e1) return { rows: [], error: e1.message };
  const matchedRows = (matched ?? []) as unknown as ResourceRow[];
  if (matchedRows.length >= limit) {
    return { rows: matchedRows.slice(0, limit), error: null };
  }

  const ids = new Set(matchedRows.map((r) => r.id));
  const { data: filler, error: e2 } = await supabase
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (e2) return { rows: matchedRows, error: e2.message };

  const extra = ((filler ?? []) as unknown as ResourceRow[])
    .filter((r) => !ids.has(r.id))
    .slice(0, limit - matchedRows.length);

  return { rows: [...matchedRows, ...extra], error: null };
}

async function fetchSuggestedArticlesWhenNoSaves(
  supabase: SupabaseClient,
  topicKeys: string[],
  savedSlugs: Set<string>,
  limit = 10,
): Promise<{ rows: RecommendedArticleRow[]; error: string | null }> {
  const selectCols = 'slug, title, excerpt, topic_key';
  const base = () =>
    supabase
      .from('articles')
      .select(selectCols)
      .eq('published', true)
      .in('access_level', ARTICLE_PUBLIC_MEMBER_FILTER);

  if (topicKeys.length === 0) {
    const { data, error } = await base().order('published_at', { ascending: false }).limit(limit + savedSlugs.size);
    const rows = ((data ?? []) as RecommendedArticleRow[]).filter((a) => !savedSlugs.has(a.slug));
    return { rows: rows.slice(0, limit), error: error?.message ?? null };
  }

  const { data: matched, error: e1 } = await base()
    .in('topic_key', topicKeys)
    .order('published_at', { ascending: false })
    .limit(limit + savedSlugs.size);

  if (e1) return { rows: [], error: e1.message };

  let merged = ((matched ?? []) as RecommendedArticleRow[]).filter((a) => !savedSlugs.has(a.slug));
  const seen = new Set(merged.map((a) => a.slug));

  if (merged.length < Math.min(6, limit)) {
    const { data: filler, error: e2 } = await base()
      .order('published_at', { ascending: false })
      .limit(limit * 3);
    if (e2) return { rows: merged.slice(0, limit), error: e2.message };
    for (const a of (filler ?? []) as RecommendedArticleRow[]) {
      if (seen.has(a.slug) || savedSlugs.has(a.slug)) continue;
      seen.add(a.slug);
      merged.push(a);
      if (merged.length >= limit) break;
    }
  }

  return { rows: merged.slice(0, limit), error: null };
}

function takeUniqueBySlug<T extends { slug: string }>(items: T[], n: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of items) {
    if (!x.slug || seen.has(x.slug)) continue;
    seen.add(x.slug);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

export type OverviewPayload = {
  profile: ProfileRow | null;
  topicKeys: string[];
  upcomingBookings: BookingRow[];
  /** Bookable upcoming webinars when user has no bookings (catalog). */
  catalogWebinarsUpcoming: OverviewWebinarCatalogRow[];
  savedArticles: FavoriteArticleRow[];
  recommendedArticles: RecommendedArticleRow[];
  recommendedWebinars: OverviewWebinarCatalogRow[];
  exploreArticles: RecommendedArticleRow[];
  exploreWebinars: OverviewWebinarCatalogRow[];
  exploreResources: ResourceRow[];
  suggestedArticlesWhenNoSaves: RecommendedArticleRow[];
  /** Resources whose topic matches preferences (subset of shelf); avoids duplicating generic filler from §6. */
  recommendedResources: ResourceRow[];
  recentResources: ResourceRow[];
  consultations: OverviewConsultationSummary[];
  fetchError: string | null;
};

export async function fetchMemberOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<OverviewPayload> {
  let fetchError: string | null = null;

  /** PostgREST may return an embedded row as object or single-element array depending on typings. */
  const one = <T,>(rel: T | T[] | null | undefined): T | null => {
    if (rel == null) return null;
    return Array.isArray(rel) ? (rel[0] ?? null) : rel;
  };

  const [profileRes, prefsRes, favoritesRes, bookingsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, display_name, onboarding_completed').eq('id', userId).maybeSingle(),
    supabase.from('topic_preferences').select('topic_key').eq('user_id', userId),
    supabase
      .from('article_favorites')
      .select('created_at, articles ( id, slug, title, excerpt, topic_key )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('webinar_bookings')
      .select('id, webinars ( id, slug, title, starts_at, ends_at, timezone )')
      .eq('user_id', userId)
      .eq('status', 'booked'),
  ]);

  const batchErr =
    profileRes.error?.message ||
    prefsRes.error?.message ||
    favoritesRes.error?.message ||
    bookingsRes.error?.message;
  if (batchErr) fetchError = batchErr;

  const topicKeys = (prefsRes.data ?? []).map((r) => r.topic_key).filter((k): k is string => typeof k === 'string');

  const savedArticles = (
    (favoritesRes.data ?? []) as {
      created_at: string;
      articles: FavoriteArticleRow['articles'] | FavoriteArticleRow['articles'][] | null;
    }[]
  ).map((row) => ({
    created_at: row.created_at,
    articles: one(row.articles),
  }));

  const savedSlugs = new Set(
    savedArticles.map((s) => s.articles?.slug).filter((x): x is string => typeof x === 'string'),
  );

  const hasSavedArticles = savedArticles.some((s) => s.articles != null);

  const [
    resourcesPack,
    recommendedRes,
    recentPoolRes,
    consultationsRes,
    webinarsRes,
    suggestedNoSavePack,
  ] = await Promise.all([
    fetchOverviewResources(supabase, topicKeys),
    topicKeys.length === 0
      ? Promise.resolve({ data: [] as RecommendedArticleRow[], error: null })
      : supabase
          .from('articles')
          .select('slug, title, excerpt, topic_key')
          .eq('published', true)
          .in('access_level', ARTICLE_PUBLIC_MEMBER_FILTER)
          .in('topic_key', topicKeys)
          .order('published_at', { ascending: false })
          .limit(18),
    supabase
      .from('articles')
      .select('slug, title, excerpt, topic_key')
      .eq('published', true)
      .in('access_level', ARTICLE_PUBLIC_MEMBER_FILTER)
      .order('published_at', { ascending: false })
      .limit(28),
    supabase
      .from('consultation_requests')
      .select('id, status, topic, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('webinars')
      .select('slug, title, starts_at, ends_at, timezone, topic_key, booking_open')
      .eq('booking_open', true)
      .order('starts_at', { ascending: true })
      .limit(56),
    !hasSavedArticles ? fetchSuggestedArticlesWhenNoSaves(supabase, topicKeys, savedSlugs, 10) : Promise.resolve({ rows: [], error: null }),
  ]);

  if (resourcesPack.error) fetchError = fetchError ?? resourcesPack.error;
  if (recommendedRes.error?.message) fetchError = fetchError ?? recommendedRes.error.message;
  if (recentPoolRes.error?.message) fetchError = fetchError ?? recentPoolRes.error.message;
  if (consultationsRes.error?.message) fetchError = fetchError ?? consultationsRes.error.message;
  if (webinarsRes.error?.message) fetchError = fetchError ?? webinarsRes.error.message;
  if (suggestedNoSavePack.error) fetchError = fetchError ?? suggestedNoSavePack.error;

  const rawRecommended = (recommendedRes.data ?? []) as RecommendedArticleRow[];
  const recommendedArticles = rawRecommended.filter((a) => !savedSlugs.has(a.slug)).slice(0, 8);

  const recentPool = ((recentPoolRes.data ?? []) as RecommendedArticleRow[]).filter(
    (a) => !savedSlugs.has(a.slug),
  );

  const nowMs = Date.now();
  const cutoff = nowMs - 60000;

  const catalogRaw = (webinarsRes.data ?? []) as OverviewWebinarCatalogRow[];
  const catalogWebinarsUpcoming = catalogRaw.filter((w) => {
    if (!w.starts_at) return false;
    return new Date(w.starts_at).getTime() >= cutoff;
  });

  const recommendedWebinars =
    topicKeys.length === 0
      ? []
      : catalogWebinarsUpcoming
          .filter((w) => w.topic_key && topicKeys.includes(w.topic_key))
          .slice(0, 8);

  /** Explore rail: topic-aware when prefs exist; otherwise browse catalog + recent pool. */
  let exploreArticles: RecommendedArticleRow[] = [];
  let exploreWebinars: OverviewWebinarCatalogRow[] = [];
  let exploreResources: ResourceRow[] = [];

  if (topicKeys.length > 0) {
    exploreArticles = takeUniqueBySlug([...recommendedArticles, ...recentPool], 4);
    exploreWebinars = recommendedWebinars.slice(0, 3);
    if (exploreWebinars.length < 2) {
      const picked = new Set(exploreWebinars.map((w) => w.slug));
      for (const w of catalogWebinarsUpcoming) {
        if (picked.has(w.slug)) continue;
        picked.add(w.slug);
        exploreWebinars.push(w);
        if (exploreWebinars.length >= 3) break;
      }
    }
    exploreResources = resourcesPack.rows.slice(0, 3);
  } else {
    exploreArticles = recentPool.slice(0, 4);
    exploreWebinars = catalogWebinarsUpcoming.slice(0, 3);
    exploreResources = resourcesPack.rows.slice(0, 3);
  }

  const consultations = (consultationsRes.data ?? []) as OverviewConsultationSummary[];

  const recommendedResources =
    topicKeys.length === 0
      ? []
      : resourcesPack.rows
          .filter((r) => r.topic_key != null && topicKeys.includes(r.topic_key))
          .slice(0, 6);

  const bookings = (
    (bookingsRes.data ?? []) as {
      id: string;
      webinars: BookingRow['webinars'] | BookingRow['webinars'][] | null;
    }[]
  ).map((b) => ({
    id: b.id,
    webinars: one(b.webinars),
  }));
  const upcomingBookings = bookings
    .filter((b) => b.webinars && new Date(b.webinars.starts_at).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(a.webinars!.starts_at).getTime() - new Date(b.webinars!.starts_at).getTime(),
    )
    .slice(0, 8);

  return {
    profile: profileRes.data ?? null,
    topicKeys,
    upcomingBookings,
    catalogWebinarsUpcoming,
    savedArticles,
    recommendedArticles,
    recommendedWebinars,
    exploreArticles,
    exploreWebinars,
    exploreResources,
    suggestedArticlesWhenNoSaves: suggestedNoSavePack.rows,
    recommendedResources,
    recentResources: resourcesPack.rows,
    consultations,
    fetchError,
  };
}
