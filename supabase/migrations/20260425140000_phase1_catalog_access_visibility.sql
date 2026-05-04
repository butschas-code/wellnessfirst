-- Phase 1: authenticated clients can read webinar_participants + paid rows for placeholder UI.
-- Keep `content` / `file_url` NULL until those tiers are activated to avoid leaking assets early.

DROP POLICY IF EXISTS articles_select_authenticated ON public.articles;

CREATE POLICY articles_select_authenticated
  ON public.articles FOR SELECT TO authenticated
  USING (
    published = true
    AND access_level IN ('public', 'member', 'webinar_participants', 'paid')
  );

DROP POLICY IF EXISTS resources_select_authenticated ON public.resources;

CREATE POLICY resources_select_authenticated
  ON public.resources FOR SELECT TO authenticated
  USING (
    published = true
    AND access_level IN ('public', 'member', 'webinar_participants', 'paid')
  );
