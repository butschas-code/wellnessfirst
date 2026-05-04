-- Booked-seat aggregate for public webinar detail (anon-safe via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.webinar_booked_seat_count(w_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.webinar_bookings
  WHERE webinar_id = w_id AND status = 'booked';
$$;

GRANT EXECUTE ON FUNCTION public.webinar_booked_seat_count(uuid) TO anon, authenticated;

-- Seed webinars aligned with former MDX slugs (single catalog for listings + bookings).
INSERT INTO public.webinars (
  slug,
  title,
  description,
  topic_key,
  starts_at,
  ends_at,
  timezone,
  seat_limit,
  booking_open,
  member_only,
  replay_url
)
VALUES
  (
    'bodies-places-breath-free',
    'Bodies, Places, Breath: A Free Live Hour for Honest Questions',
    'A free, unhurried session on how rooms, air, and tempo meet the nervous system—without turning your life into a dashboard. Short teaching, guided pauses, and open Q&A at the intersection of somatic literacy, breath practice, and environmental cues.',
    'regulation',
    '2026-06-10T17:00:00+00'::timestamptz,
    '2026-06-10T18:30:00+00'::timestamptz,
    'Europe/Riga',
    80,
    true,
    false,
    null
  ),
  (
    'astrology-tempo-daily-rhythm',
    'Astrology as Tempo, Not Fate (Free Replay)',
    'Sky literacy as tempo, not fate—less reactivity in an ordinary week, without outsourcing your agency to a feed or a chart. Recorded session with reflective prompts you can reuse.',
    'astrology_timing',
    '2025-12-05T18:00:00+00'::timestamptz,
    '2025-12-05T19:05:00+00'::timestamptz,
    'Europe/Riga',
    null,
    false,
    false,
    null
  ),
  (
    'geopathic-questions-honest-room',
    'Geopathic Questions & the Honest Room (Free Replay)',
    'Land, sleep, and rest with dignity—how to test a bedroom without turning your home into a courtroom or a panic buy. Structured replay with simple experiments that respect budget and landlords.',
    'geopathic_stress',
    '2025-11-18T19:30:00+00'::timestamptz,
    '2025-11-18T20:40:00+00'::timestamptz,
    'Europe/Riga',
    null,
    false,
    false,
    null
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  topic_key = EXCLUDED.topic_key,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  timezone = EXCLUDED.timezone,
  seat_limit = EXCLUDED.seat_limit,
  booking_open = EXCLUDED.booking_open,
  member_only = EXCLUDED.member_only,
  replay_url = COALESCE(public.webinars.replay_url, EXCLUDED.replay_url),
  updated_at = now();
