-- Seed journal articles for static MDX slug ↔ Supabase catalog (favorites, activity).
-- Idempotent: upsert by slug.

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('astrology-tempo-not-fate', 'Astrology in Daily Life: Tempo, Not Prophecy', 'How to use sky literacy as a rhythm tool—reducing reactivity, not outsourcing agency to a feed.', 'clarity', 'public', true, '2026-02-02T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('breath-in-room', 'Breath in the Room, Not Just in the Body', 'Bringing pranayama and contemporary regulation science into a single, unpretentious frame—where space, sound, and tempo meet.', 'regulation', 'public', true, '2025-11-03T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('clarity-age-of-noise-inner-health', 'The Age of Noise: Why Inner Clarity Has Become a Form of Health', 'When information is endless but direction is scarce, the nervous system pays the price. Inner clarity is not luxury—it is the health of knowing what is true for you.', 'clarity', 'public', true, '2026-04-20T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('clarity-how-to-know-what-is-really-yours', 'How to Know What Is Really Yours', 'Not every goal is yours. Borrowed ambition comes with “should” and a fear of falling behind. Here is how the body and a few honest questions reveal what is truly yours.', 'clarity', 'public', true, '2026-04-18T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('clarity-quiet-discipline-coming-back', 'The Quiet Discipline of Coming Back to Yourself', 'The world rewards speed; the inner life grows through small, faithful returns. A one-minute “three-point return” can change the quality of a whole day.', 'clarity', 'public', true, '2026-04-16T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('clear-morning-rituals', 'The Quiet Architecture of a Clear Morning', 'A grounded approach to the first hours—less optimization, more coherence between body, space, and attention.', 'practices_rituals', 'public', true, '2025-10-12T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('conscious-living-choices-that-compound', 'Conscious Living Is Mostly Small Agreements With Yourself', 'A practical frame for values that do not need a vision board: fewer declarations, more repeatable yeses in ordinary hours.', 'clarity', 'public', true, '2025-12-08T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('energy-future-wellness-better-signals', 'The Future of Wellness Is Not More Apps — It Is Better Signals', 'Tracking steps and sleep can inform you; it does not always change the conditions your body lives in. The next phase belongs to calmer, more intelligent inputs—not another dashboard to perform for.', 'energy_frequency', 'public', true, '2026-04-03T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('energy-what-do-we-mean-by-frequency', 'What Do We Mean by “Frequency” in Wellness?', 'The word is everywhere—sound, PEMF, light, emotion. Here is a plain-language map: frequency as rhythm and signal, and what honest wellness language sounds like.', 'energy_frequency', 'public', true, '2026-04-05T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('energy-why-personalized-frequency-programs-matter', 'Why Personalized Frequency Programs Matter', 'One person’s “tired” is not another’s. Sensitivity, season, and state all change which signals help. The goal is not a generic protocol—it is support that fits a living system.', 'energy_frequency', 'public', true, '2026-04-01T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('environment-designing-space-helps-recover', 'Designing a Space That Helps You Recover', 'A recovery corner does not need a spa price tag. These five principles—simplicity, light, texture, sound, and meaning—help the room say: you do not have to perform here.', 'environment', 'public', true, '2026-04-06T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('environment-geopathic-stress-ancient-or-blind-spot', 'Geopathic Stress: Ancient Idea or Modern Blind Spot?', 'Many cultures asked how a place *feels* before building. Modernity measures square meters and Wi-Fi. A careful look at “geopathic” stress and what actually helps you sleep and settle.', 'environment', 'public', true, '2026-04-08T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('environment-your-home-is-not-neutral', 'Your Home Is Not Neutral', 'A room can look beautiful and still exhaust you. Light, air, sound, and order send signals the body reads whether or not you do. Coherence, not price, is what makes a home restorative.', 'environment', 'public', true, '2026-04-10T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('frequency-field-notes', 'Frequency Applications: Helpful Signals, Not Spectacle', 'When subtle tools support regulation and rest—without mistaking equipment for relationship, or resonance for identity.', 'energy_frequency', 'public', true, '2026-04-02T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('geopathic-signals-sleep-dignity', 'Geopathic Stress: Reading Land Without the Fear Playbook', 'A calm primer on what people mean by geopathic disruption—how to take sleep and somatic stress seriously without surrendering to superstition or shame.', 'environment', 'public', true, '2026-01-14T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('home-harmony-rooms-that-remember', 'Home Harmony: Rooms That Remember Calm', 'A gentle framework for order, light, and material honesty—so your space whispers back what you are trying to become.', 'environment', 'public', true, '2026-02-20T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('practices-evening-reset-close-day', 'The Evening Reset: How to Close the Day Properly', 'If you never complete the day, the mind keeps working through the night. A short, repeatable reset—list, dim, move, name, soften—gives the nervous system a bridge into rest.', 'practices_rituals', 'public', true, '2026-03-25T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('practices-five-minutes-day-direction', 'Five Minutes That Change the Direction of the Day', 'You do not need a cinematic morning routine. Five quiet minutes to arrive in the body, breathe longer on the out-breath, and choose an inner quality can re-anchor the hours that follow.', 'practices_rituals', 'public', true, '2026-03-28T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('practices-rituals-structure-for-soul', 'Rituals Are Not Decoration — They Are Structure for the Soul', 'Without ritual, everything runs together and the heart has no door. Small repeated gestures—breath, candle, silence, frequency—turn ordinary time into something the body can trust.', 'practices_rituals', 'public', true, '2026-03-22T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('regulation-body-keeps-the-rhythm', 'The Body Keeps the Rhythm', 'Your system does not only need fuel—it needs timing. Why anchors, light, meals, and evening dimming are signals the nervous system learns to trust.', 'regulation', 'public', true, '2026-04-13T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('regulation-calm-is-not-weakness', 'Why Calm Is Not Weakness', 'In a culture that mistakes speed for strength, real calm is capacity: to feel what moves through you without being owned by it. That is a trainable, intelligent form of power.', 'regulation', 'public', true, '2026-04-15T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('regulation-frequency-recovery-body-language', 'Frequency, Recovery, and the Language of the Body', 'Before the mind names it, the body feels rhythm, tone, and signal. A grounded look at frequency in wellness, PEMF, and how ritual completes what technology starts.', 'regulation', 'public', true, '2026-04-11T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.articles (slug, title, excerpt, topic_key, access_level, published, published_at)
VALUES ('stoicism-standards-without-cruelty', 'Stoicism for Modern Life: Standards Without Self-Attack', 'Separating the Stoic toolkit from internet machismo—courage, duty, and emotion without turning your day into a courtroom.', 'clarity', 'public', true, '2026-03-11T12:00:00Z'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  topic_key = EXCLUDED.topic_key,
  access_level = EXCLUDED.access_level,
  published = EXCLUDED.published,
  published_at = COALESCE(public.articles.published_at, EXCLUDED.published_at),
  updated_at = now();

