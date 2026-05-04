/**
 * Build-time fetch for `/resources` + `/resources/[slug]`.
 * Prefer `SUPABASE_SERVICE_ROLE_KEY` in CI so shells prerender for all access rows.
 */

export type ResourceBuildRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  access_level: string;
  resource_type: string;
  file_url: string | null;
  external_url: string | null;
  topic_key: string | null;
  published: boolean;
};

export async function fetchPublishedResourcesForBuild(): Promise<ResourceBuildRow[]> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  const key = (typeof serviceKey === 'string' && serviceKey.length > 0 ? serviceKey : anonKey) ?? '';

  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/resources?published=eq.true&select=id,slug,title,description,access_level,resource_type,file_url,external_url,topic_key,published&order=slug.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ResourceBuildRow[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
