-- ====================================================================
-- Wellness Waves: birth profiles on the account and personal programs.
-- Phases 3 and 4 of docs/ONDA_WHITE_LABEL_PLAN.md (§5.1, §6).
--
--   astro_profiles       birth details, versioned, owner-only, explicit consent
--   sound_signals        the chart as numbers for one (profile version, local day)
--   sound_programs       generated programs; rows are never updated
--   sound_program_saves  a member's saved programs (frozen copies by reference)
--
-- Programs are written only by the server (service role) so a client can
-- never make up a program. Members read their own rows and the standard
-- (user_id IS NULL) ones. Everything goes with the account (ON DELETE CASCADE).
-- ====================================================================

-- --------------------------------------------------------------------
-- Birth profiles (§5.1)
-- --------------------------------------------------------------------
-- Editing birth details adds a new row with the same lineage_id and the next
-- version. Old versions stay, so programs made from them keep pointing at the
-- exact details they were made from. Removing a profile deletes every version.
CREATE TABLE IF NOT EXISTS public.astro_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- All versions of one person's details share this id.
  lineage_id UUID NOT NULL DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  -- 'Me', 'Partner', …
  label TEXT NOT NULL DEFAULT 'Me' CHECK (char_length(label) BETWEEN 1 AND 40),
  display_name TEXT CHECK (char_length(display_name) <= 80),
  birth_date DATE NOT NULL CHECK (birth_date >= DATE '1900-01-01'),
  birth_time TIME NOT NULL DEFAULT '12:00',
  time_unknown BOOLEAN NOT NULL DEFAULT FALSE,
  place_name TEXT NOT NULL CHECK (char_length(place_name) BETWEEN 1 AND 160),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  -- IANA zone of the birth place, plus the UTC offset (hours) at the birth moment.
  tz TEXT NOT NULL CHECK (char_length(tz) BETWEEN 1 AND 64),
  tz_offset_hours NUMERIC(4, 2) NOT NULL CHECK (tz_offset_hours BETWEEN -14 AND 14),
  ayanamsa TEXT NOT NULL DEFAULT 'Lahiri' CHECK (ayanamsa IN ('Lahiri', 'KP', 'Raman', 'Sayana')),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  -- The newest version of a lineage is current; older ones are kept for programs.
  superseded_at TIMESTAMPTZ,
  -- Explicit consent at save (required), and which wording the member agreed to.
  consent_at TIMESTAMPTZ NOT NULL,
  consent_version TEXT NOT NULL CHECK (char_length(consent_version) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lineage_id, version)
);

CREATE INDEX IF NOT EXISTS astro_profiles_user_idx ON public.astro_profiles (user_id, created_at DESC);
-- At most one current primary profile per member.
CREATE UNIQUE INDEX IF NOT EXISTS astro_profiles_one_primary
  ON public.astro_profiles (user_id) WHERE is_primary AND superseded_at IS NULL;

ALTER TABLE public.astro_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "astro_profiles: read own" ON public.astro_profiles;
CREATE POLICY "astro_profiles: read own" ON public.astro_profiles
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "astro_profiles: insert own" ON public.astro_profiles;
CREATE POLICY "astro_profiles: insert own" ON public.astro_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Updates only mark a version superseded or change which profile is primary;
-- the trigger below keeps the birth details themselves immutable.
DROP POLICY IF EXISTS "astro_profiles: update own" ON public.astro_profiles;
CREATE POLICY "astro_profiles: update own" ON public.astro_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "astro_profiles: delete own" ON public.astro_profiles;
CREATE POLICY "astro_profiles: delete own" ON public.astro_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.astro_profiles_keep_details()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.user_id, NEW.lineage_id, NEW.version, NEW.birth_date, NEW.birth_time, NEW.time_unknown,
      NEW.place_name, NEW.lat, NEW.lon, NEW.tz, NEW.tz_offset_hours, NEW.ayanamsa, NEW.consent_at, NEW.created_at)
     IS DISTINCT FROM
     (OLD.user_id, OLD.lineage_id, OLD.version, OLD.birth_date, OLD.birth_time, OLD.time_unknown,
      OLD.place_name, OLD.lat, OLD.lon, OLD.tz, OLD.tz_offset_hours, OLD.ayanamsa, OLD.consent_at, OLD.created_at) THEN
    RAISE EXCEPTION 'Birth details are versioned: insert a new version instead of editing one.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS astro_profiles_keep_details ON public.astro_profiles;
CREATE TRIGGER astro_profiles_keep_details
  BEFORE UPDATE ON public.astro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.astro_profiles_keep_details();

-- --------------------------------------------------------------------
-- Signals: the chart as plain numbers for one profile version and local day (§5.2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sound_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.astro_profiles(id) ON DELETE CASCADE,
  profile_version INTEGER NOT NULL,
  local_date DATE NOT NULL,
  signals JSONB NOT NULL,
  versions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, profile_id, profile_version, local_date)
);

ALTER TABLE public.sound_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sound_signals: read own" ON public.sound_signals;
CREATE POLICY "sound_signals: read own" ON public.sound_signals
  FOR SELECT USING (auth.uid() = user_id);
-- No insert/update policy: only the server writes signals.

-- --------------------------------------------------------------------
-- Programs (§6). Immutable: never updated, so a saved program sounds the
-- same a year later.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sound_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = standard program for everyone.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Removing birth details keeps already-made programs playable (the
  -- composition is a frozen copy) but drops the link to the details.
  profile_id UUID REFERENCES public.astro_profiles(id) ON DELETE SET NULL,
  profile_version INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('standard', 'today', 'chapter', 'strength', 'challenge')),
  slot TEXT CHECK (slot IN ('morning', 'midday', 'evening')),
  valid_from DATE NOT NULL,
  valid_to DATE,
  name TEXT NOT NULL CHECK (char_length(name) <= 120),
  description TEXT NOT NULL CHECK (char_length(description) <= 1000),
  description_pro TEXT NOT NULL CHECK (char_length(description_pro) <= 8000),
  intent TEXT NOT NULL CHECK (char_length(intent) <= 32),
  recipe_id TEXT NOT NULL CHECK (char_length(recipe_id) <= 64),
  composition JSONB NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  versions JSONB NOT NULL,
  content_hash TEXT NOT NULL CHECK (char_length(content_hash) <= 64),
  -- Deterministic key of the generation request (profile version, kind, slot,
  -- day, rulebook). Makes "compute on first open" idempotent under races.
  gen_key TEXT NOT NULL CHECK (char_length(gen_key) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sound_programs_gen_key
  ON public.sound_programs (user_id, gen_key);
CREATE INDEX IF NOT EXISTS sound_programs_user_kind_idx
  ON public.sound_programs (user_id, kind, valid_from DESC);

ALTER TABLE public.sound_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sound_programs: read own or standard" ON public.sound_programs;
CREATE POLICY "sound_programs: read own or standard" ON public.sound_programs
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
-- No insert/update/delete policy: only the server writes programs.

CREATE OR REPLACE FUNCTION public.sound_programs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- The only allowed change is the FK going NULL when birth details are deleted.
  IF (NEW.id, NEW.user_id, NEW.kind, NEW.slot, NEW.valid_from, NEW.valid_to, NEW.name, NEW.description,
      NEW.description_pro, NEW.intent, NEW.recipe_id, NEW.composition, NEW.reasons, NEW.versions,
      NEW.content_hash, NEW.gen_key, NEW.created_at, NEW.profile_version)
     IS DISTINCT FROM
     (OLD.id, OLD.user_id, OLD.kind, OLD.slot, OLD.valid_from, OLD.valid_to, OLD.name, OLD.description,
      OLD.description_pro, OLD.intent, OLD.recipe_id, OLD.composition, OLD.reasons, OLD.versions,
      OLD.content_hash, OLD.gen_key, OLD.created_at, OLD.profile_version)
     OR NEW.profile_id IS NOT NULL AND NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    RAISE EXCEPTION 'sound_programs rows are immutable.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sound_programs_immutable ON public.sound_programs;
CREATE TRIGGER sound_programs_immutable
  BEFORE UPDATE ON public.sound_programs
  FOR EACH ROW EXECUTE FUNCTION public.sound_programs_immutable();

-- --------------------------------------------------------------------
-- Saved programs. Saving only adds a row here; the program never changes.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sound_program_saves (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.sound_programs(id) ON DELETE CASCADE,
  label TEXT CHECK (char_length(label) <= 80),
  note TEXT CHECK (char_length(note) <= 500),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, program_id)
);

CREATE INDEX IF NOT EXISTS sound_program_saves_user_idx ON public.sound_program_saves (user_id, saved_at DESC);

ALTER TABLE public.sound_program_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sound_program_saves: read own" ON public.sound_program_saves;
CREATE POLICY "sound_program_saves: read own" ON public.sound_program_saves
  FOR SELECT USING (auth.uid() = user_id);
-- A member can only save programs they can see (their own or standard ones).
DROP POLICY IF EXISTS "sound_program_saves: insert own" ON public.sound_program_saves;
CREATE POLICY "sound_program_saves: insert own" ON public.sound_program_saves
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sound_programs p
      WHERE p.id = program_id AND (p.user_id IS NULL OR p.user_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "sound_program_saves: update own" ON public.sound_program_saves;
CREATE POLICY "sound_program_saves: update own" ON public.sound_program_saves
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sound_program_saves: delete own" ON public.sound_program_saves;
CREATE POLICY "sound_program_saves: delete own" ON public.sound_program_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Listening rows can now point at the program that played.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sound_listens_program_id_fkey'
  ) THEN
    ALTER TABLE public.sound_listens
      ADD CONSTRAINT sound_listens_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.sound_programs(id) ON DELETE SET NULL;
  END IF;
END $$;
