-- Wellness First Global — demo seed for member tables (optional).
-- Run AFTER migration `20260206140000_wellness_member_system.sql`.
-- Safe to re-run: uses ON CONFLICT DO NOTHING where applicable.

-- ─── 3 sample articles ──────────────────────────────────────────────────────────
INSERT INTO public.articles (
  id,
  slug,
  title,
  excerpt,
  content,
  hero_image_url,
  topic_key,
  access_level,
  published,
  published_at
)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'demo-clarity-inner-quiet',
    'Demo: Finding Inner Quiet (member)',
    'Short demo article for Supabase catalog — clarity theme.',
    E'# Finding inner quiet\n\nThis is **sample body copy** stored in Postgres for My Wellness Space.',
    NULL,
    'clarity',
    'member',
    true,
    now() - interval '5 days'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'demo-regulation-nervous-system',
    'Demo: Regulation and the Nervous System (public)',
    'Sample public article for anonymous readability tests.',
    E'# Regulation\n\nDemo content for `access_level = public`.',
    NULL,
    'regulation',
    'public',
    true,
    now() - interval '3 days'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'demo-environment-home-coherence',
    'Demo: Home Coherence (public)',
    'Sample article linking environment theme.',
    E'# Environment\n\nPlaceholder paragraphs for favorites/reflections demos.',
    NULL,
    'environment',
    'public',
    true,
    now() - interval '1 day'
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── 2 sample webinars (no published flag; visibility is member_only + RLS) ───
INSERT INTO public.webinars (
  id,
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
    'b1000000-0000-4000-8000-000000000001',
    'demo-live-body-place-breath',
    'Demo Live: Body, Place, Breath',
    'Sample webinar row for bookings and reminders.',
    'practices_rituals',
    now() + interval '14 days',
    now() + interval '14 days' + interval '90 minutes',
    'Europe/Riga',
    80,
    true,
    false,
    NULL
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'demo-member-frequency-foundations',
    'Demo Members: Frequency Foundations',
    'Member-only webinar for access tests.',
    'energy_frequency',
    now() + interval '21 days',
    now() + interval '21 days' + interval '60 minutes',
    'Europe/Riga',
    40,
    true,
    true,
    NULL
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── 4 sample resources ────────────────────────────────────────────────────────
INSERT INTO public.resources (
  id,
  slug,
  title,
  description,
  topic_key,
  resource_type,
  file_url,
  external_url,
  access_level,
  published
)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'demo-checklist-evening-reset',
    'Demo Checklist: Evening Reset',
    'Printable-style checklist.',
    'practices_rituals',
    'checklist',
    NULL,
    NULL,
    'member',
    true
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'demo-guide-sleep-rhythm-map',
    'Demo Guide: Sleep Rhythm Map',
    'Short reader on sleep rhythm.',
    'sleep_rhythm',
    'guide',
    NULL,
    'https://example.com/demo-guide-sleep-rhythm',
    'public',
    true
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'demo-worksheet-values-clarity',
    'Demo Worksheet: Values Clarity',
    'Worksheet placeholder.',
    'clarity',
    'worksheet',
    NULL,
    NULL,
    'member',
    true
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    'demo-reading-list-regulation',
    'Demo Reading List: Regulation',
    'Curated links.',
    'regulation',
    'reading_list',
    NULL,
    NULL,
    'public',
    true
  )
ON CONFLICT (slug) DO NOTHING;
