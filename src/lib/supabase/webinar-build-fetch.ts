/** Fetch webinars for static `/webinars` + `/webinars/[slug]` builds. */
export type WebinarBuildRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  topic_key: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  seat_limit: number | null;
  booking_open: boolean;
  member_only: boolean;
  replay_url: string | null;
};

export async function fetchWebinarsForBuild(): Promise<WebinarBuildRow[]> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  const key = (typeof serviceKey === 'string' && serviceKey.length > 0 ? serviceKey : anonKey) ?? '';

  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/webinars?select=id,slug,title,description,topic_key,starts_at,ends_at,timezone,seat_limit,booking_open,member_only,replay_url&order=starts_at.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as WebinarBuildRow[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
