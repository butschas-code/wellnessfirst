-- ─── Schedule: send-webinar-reminders (every 15 minutes) ─────────────────────
--
-- Prerequisites (Supabase Dashboard → Database → Extensions):
--   - pg_cron
--   - pg_net
--
-- SECURITY: Do not paste your service_role key into chat logs or committed SQL.
-- Prefer storing the secret in Supabase Vault and reading it inside the cron job,
-- or use Dashboard → Edge Functions → Schedules if your plan supports it.
--
-- Replace placeholders:
--   YOUR_PROJECT_REF  → Project Settings → General → Reference ID
--   YOUR_SERVICE_ROLE_JWT → Project Settings → API → service_role (secret)
--

-- Example using pg_cron + pg_net (runs in the database):
/*
SELECT cron.schedule(
  'send-webinar-reminders-every-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-webinar-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_JWT'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- To remove the job later:
-- SELECT cron.unschedule('send-webinar-reminders-every-15m');

-- ─── Alternative: Dashboard ────────────────────────────────────────────────────
-- 1. Deploy function `send-webinar-reminders` (see supabase/README.md).
-- 2. Supabase Dashboard → Edge Functions → send-webinar-reminders → Schedules.
-- 3. Create schedule: */15 * * * * (every 15 minutes), POST body `{}`.
-- 4. Ensure function secrets include SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
--    EMAIL_FROM, SITE_URL (and SUPABASE_URL / SUPABASE_ANON_KEY where applicable).
