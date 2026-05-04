-- Wellness First Global — member system schema (My Wellness Space)
-- Requires: Supabase project with auth.users (standard).
-- Apply via Supabase CLI (`supabase db push`) or Dashboard → SQL Editor (paste full file).

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Topic keys (preferences + catalog columns) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.is_allowed_topic_key(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_key IS NOT NULL
    AND p_key IN (
      'clarity',
      'regulation',
      'environment',
      'energy_frequency',
      'practices_rituals',
      'astrology_timing',
      'vastu_place_quality',
      'geopathic_stress',
      'sleep_rhythm',
      'family_home_atmosphere'
    );
$$;

-- ─── updated_at ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- True when user has an active booking for webinar id (content_type = 'webinar').
-- For content_type 'article' | 'resource', extend when you link catalog rows to webinars.
CREATE OR REPLACE FUNCTION public.is_webinar_participant(
  p_user_uuid uuid,
  p_article_or_resource_id uuid,
  p_content_type text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_user_uuid IS NULL OR p_article_or_resource_id IS NULL OR p_content_type IS NULL THEN
    RETURN false;
  END IF;

  IF lower(p_content_type) = 'webinar' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.webinar_bookings wb
      WHERE wb.user_id = p_user_uuid
        AND wb.webinar_id = p_article_or_resource_id
        AND wb.status = 'booked'
    );
  END IF;

  IF lower(p_content_type) IN ('article', 'resource') THEN
    -- Placeholder: add webinar_content_links / SKU checks later.
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_webinar_participant(uuid, uuid, text) IS
  'Extend article/resource branches when catalog maps to webinars or SKUs; webinar branch uses webinar_bookings (status booked).';

-- ─── 1. profiles ──────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  display_name text,
  avatar_url text,
  country text,
  timezone text,
  preferred_language text NOT NULL DEFAULT 'en',
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ─── 2. topic_preferences ─────────────────────────────────────────────────────
CREATE TABLE public.topic_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT topic_preferences_topic_valid CHECK (public.is_allowed_topic_key(topic_key)),
  CONSTRAINT topic_preferences_user_topic UNIQUE (user_id, topic_key)
);

-- ─── 3. articles ──────────────────────────────────────────────────────────────
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text,
  hero_image_url text,
  topic_key text,
  access_level text NOT NULL DEFAULT 'public',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT articles_access_level_chk CHECK (
    access_level IN ('public', 'member', 'webinar_participants', 'paid')
  ),
  CONSTRAINT articles_topic_key_chk CHECK (
    topic_key IS NULL OR public.is_allowed_topic_key(topic_key)
  )
);

CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ─── 4. article_favorites ────────────────────────────────────────────────────
CREATE TABLE public.article_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_favorites_user_article UNIQUE (user_id, article_id)
);

-- ─── 5. article_reflections ──────────────────────────────────────────────────
CREATE TABLE public.article_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  reflection_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER article_reflections_set_updated_at
  BEFORE UPDATE ON public.article_reflections
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ─── 6. webinars (no published column: visibility = member_only + role) ─────────
CREATE TABLE public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  topic_key text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Riga',
  seat_limit integer,
  booking_open boolean NOT NULL DEFAULT true,
  member_only boolean NOT NULL DEFAULT false,
  replay_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webinars_topic_key_chk CHECK (
    topic_key IS NULL OR public.is_allowed_topic_key(topic_key)
  )
);

CREATE TRIGGER webinars_set_updated_at
  BEFORE UPDATE ON public.webinars
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ─── 7. webinar_bookings ──────────────────────────────────────────────────────
CREATE TABLE public.webinar_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  webinar_id uuid NOT NULL REFERENCES public.webinars (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'booked',
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  confirmation_sent_at timestamptz,
  booked_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT webinar_bookings_status_chk CHECK (
    status IN ('booked', 'cancelled', 'attended', 'no_show')
  ),
  CONSTRAINT webinar_bookings_user_webinar UNIQUE (user_id, webinar_id)
);

-- ─── 8. resources ───────────────────────────────────────────────────────────────
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  topic_key text,
  file_url text,
  external_url text,
  access_level text NOT NULL DEFAULT 'member',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resources_access_level_chk CHECK (
    access_level IN ('public', 'member', 'webinar_participants', 'paid')
  ),
  CONSTRAINT resources_topic_key_chk CHECK (
    topic_key IS NULL OR public.is_allowed_topic_key(topic_key)
  )
);

CREATE TRIGGER resources_set_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ─── 9. resource_downloads ────────────────────────────────────────────────────
CREATE TABLE public.resource_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources (id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 10. consultation_requests ─────────────────────────────────────────────────
CREATE TABLE public.consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  email text,
  preferred_language text,
  topic text,
  situation text,
  desired_support text,
  urgency text,
  consent_to_contact boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultation_requests_status_chk CHECK (
    status IN ('new', 'reviewed', 'contacted', 'closed')
  )
);

CREATE TRIGGER consultation_requests_set_updated_at
  BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ─── 11. member_activity ───────────────────────────────────────────────────────
CREATE TABLE public.member_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_email ON public.profiles (email);

CREATE INDEX idx_topic_preferences_user_id ON public.topic_preferences (user_id);

CREATE INDEX idx_articles_slug ON public.articles (slug);
CREATE INDEX idx_articles_published_access ON public.articles (published, access_level);
CREATE INDEX idx_articles_topic_key ON public.articles (topic_key) WHERE topic_key IS NOT NULL;
CREATE INDEX idx_articles_published_true ON public.articles (published) WHERE published;

CREATE INDEX idx_article_favorites_user_id ON public.article_favorites (user_id);
CREATE INDEX idx_article_favorites_article_id ON public.article_favorites (article_id);

CREATE INDEX idx_article_reflections_user_id ON public.article_reflections (user_id);
CREATE INDEX idx_article_reflections_article_id ON public.article_reflections (article_id);

CREATE INDEX idx_webinars_slug ON public.webinars (slug);
CREATE INDEX idx_webinars_starts_at ON public.webinars (starts_at);
CREATE INDEX idx_webinars_member_only ON public.webinars (member_only);

CREATE INDEX idx_webinar_bookings_user_id ON public.webinar_bookings (user_id);
CREATE INDEX idx_webinar_bookings_webinar_id ON public.webinar_bookings (webinar_id);
CREATE INDEX idx_webinar_bookings_status ON public.webinar_bookings (status);

CREATE INDEX idx_resources_slug ON public.resources (slug);
CREATE INDEX idx_resources_published_access ON public.resources (published, access_level);

CREATE INDEX idx_resource_downloads_user_id ON public.resource_downloads (user_id);
CREATE INDEX idx_resource_downloads_resource_id ON public.resource_downloads (resource_id);

CREATE INDEX idx_consultation_requests_user_id ON public.consultation_requests (user_id);
CREATE INDEX idx_consultation_requests_status ON public.consultation_requests (status);

CREATE INDEX idx_member_activity_user_id_created ON public.member_activity (user_id, created_at DESC);

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activity ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- topic_preferences
CREATE POLICY topic_preferences_select_own
  ON public.topic_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY topic_preferences_insert_own
  ON public.topic_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY topic_preferences_update_own
  ON public.topic_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY topic_preferences_delete_own
  ON public.topic_preferences FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- articles: anon public published; authenticated public+member + gated tiers via helper / placeholder
CREATE POLICY articles_select_anon_public
  ON public.articles FOR SELECT TO anon
  USING (published = true AND access_level = 'public');

CREATE POLICY articles_select_authenticated
  ON public.articles FOR SELECT TO authenticated
  USING (
    published = true
    AND (
      access_level IN ('public', 'member')
      OR (
        access_level = 'webinar_participants'
        AND public.is_webinar_participant(auth.uid(), id, 'article')
      )
      OR (
        access_level = 'paid'
        AND false
      )
    )
  );

-- article_favorites
CREATE POLICY article_favorites_all_own
  ON public.article_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- article_reflections
CREATE POLICY article_reflections_all_own
  ON public.article_reflections FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- webinars: public sees non–member-only; auth sees all
CREATE POLICY webinars_select_anon_public
  ON public.webinars FOR SELECT TO anon
  USING (member_only = false);

CREATE POLICY webinars_select_authenticated_all
  ON public.webinars FOR SELECT TO authenticated
  USING (true);

-- webinar_bookings
CREATE POLICY webinar_bookings_select_own
  ON public.webinar_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY webinar_bookings_insert_own
  ON public.webinar_bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY webinar_bookings_update_own
  ON public.webinar_bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- resources
CREATE POLICY resources_select_anon_public
  ON public.resources FOR SELECT TO anon
  USING (published = true AND access_level = 'public');

CREATE POLICY resources_select_authenticated
  ON public.resources FOR SELECT TO authenticated
  USING (
    published = true
    AND (
      access_level IN ('public', 'member')
      OR (
        access_level = 'webinar_participants'
        AND public.is_webinar_participant(auth.uid(), id, 'resource')
      )
      OR (
        access_level = 'paid'
        AND false
      )
    )
  );

-- resource_downloads
CREATE POLICY resource_downloads_select_own
  ON public.resource_downloads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY resource_downloads_insert_own
  ON public.resource_downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- consultation_requests
CREATE POLICY consultation_requests_select_own
  ON public.consultation_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY consultation_requests_insert_own
  ON public.consultation_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY consultation_requests_update_own
  ON public.consultation_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- member_activity
CREATE POLICY member_activity_select_own
  ON public.member_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY member_activity_insert_own
  ON public.member_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── Grants ─────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_webinar_participant(uuid, uuid, text) TO anon, authenticated;

GRANT ALL ON TABLE public.topic_preferences TO authenticated;

GRANT SELECT ON TABLE public.articles TO anon;
GRANT SELECT ON TABLE public.articles TO authenticated;

GRANT ALL ON TABLE public.article_favorites TO authenticated;
GRANT ALL ON TABLE public.article_reflections TO authenticated;

GRANT SELECT ON TABLE public.webinars TO anon;
GRANT SELECT ON TABLE public.webinars TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.webinar_bookings TO authenticated;

GRANT SELECT ON TABLE public.resources TO anon;
GRANT SELECT ON TABLE public.resources TO authenticated;

GRANT SELECT, INSERT ON TABLE public.resource_downloads TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.consultation_requests TO authenticated;

GRANT SELECT, INSERT ON TABLE public.member_activity TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
