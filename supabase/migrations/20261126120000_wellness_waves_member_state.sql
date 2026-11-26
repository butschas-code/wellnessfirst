-- ====================================================================
-- Wellness Waves (sound player): per-member state and listening log.
-- Phase 2 of docs/ONDA_WHITE_LABEL_PLAN.md. Owner-only RLS on both
-- tables; rows go with the account (ON DELETE CASCADE).
-- Anonymous listening is never sent; it stays on the device.
-- ====================================================================

-- Favourites, recents and listening preferences that follow the member
-- across devices. One row per member; the client merges and upserts.
CREATE TABLE IF NOT EXISTS public.sound_user_state (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  favorites TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(favorites) <= 500),
  recents TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(recents) <= 50),
  sound_dna JSONB,
  feel JSONB,
  shape JSONB,
  program_prefs JSONB,
  programs_auto BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sound_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sound_user_state: read own" ON public.sound_user_state;
CREATE POLICY "sound_user_state: read own" ON public.sound_user_state
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sound_user_state: insert own" ON public.sound_user_state;
CREATE POLICY "sound_user_state: insert own" ON public.sound_user_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sound_user_state: update own" ON public.sound_user_state;
CREATE POLICY "sound_user_state: update own" ON public.sound_user_state
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "sound_user_state: delete own" ON public.sound_user_state;
CREATE POLICY "sound_user_state: delete own" ON public.sound_user_state
  FOR DELETE USING (auth.uid() = user_id);

-- One row per stretch of listening: a soundscape played until it was
-- switched, stopped, ended by the sleep timer, the page was left, or a
-- 15-minute chunk of a long session was saved.
CREATE TABLE IF NOT EXISTS public.sound_listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Made on the device, so a retried upload never counts twice.
  client_id TEXT NOT NULL CHECK (char_length(client_id) BETWEEN 8 AND 64),
  recipe_id TEXT NOT NULL CHECK (char_length(recipe_id) <= 64),
  -- Personal programs (Phase 4+) will reference sound_programs here.
  program_id UUID,
  intent TEXT CHECK (char_length(intent) <= 32),
  audio_mode TEXT CHECK (char_length(audio_mode) <= 32),
  started_at TIMESTAMPTZ NOT NULL,
  -- Seconds actually playing (pauses excluded), at most one day per row.
  seconds INTEGER NOT NULL CHECK (seconds > 0 AND seconds <= 86400),
  ended_by TEXT CHECK (ended_by IN ('switch', 'stop', 'timer', 'leave', 'chunk')),
  device TEXT CHECK (char_length(device) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS sound_listens_user_started_idx
  ON public.sound_listens (user_id, started_at DESC);

ALTER TABLE public.sound_listens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sound_listens: read own" ON public.sound_listens;
CREATE POLICY "sound_listens: read own" ON public.sound_listens
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sound_listens: insert own" ON public.sound_listens;
CREATE POLICY "sound_listens: insert own" ON public.sound_listens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
