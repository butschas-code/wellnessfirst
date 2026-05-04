# Supabase — Wellness First Global

## “No tables” vs “where is my login?”

- **Email/password accounts** live in Supabase **Auth**, not in **Table Editor → public**. Open **Authentication → Users** to see sign-ups. The **Table Editor** defaults to schema **`public`**; it will look empty until you run migrations.
- **This app’s data** (`profiles`, `articles`, `webinar_bookings`, …) lives in **`public`** and is created only when you apply the SQL files in [`migrations/`](./migrations/). Until then, sign-in/sign-up can fail when the app tries to sync **`profiles`**.

**Fix (pick one):**

1. **CLI (recommended)** — from repo root:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF   # Dashboard → Project Settings → General → Reference ID
   supabase db push
   ```

   (`YOUR_PROJECT_REF` is the short id in your Supabase URL, e.g. `ernnivcfkxyejltxsbrn`.)

2. **Dashboard SQL** — run each file below **in name order**, full paste, **SQL Editor → New query**, one file per run (or concatenate if you know what you’re doing):

   1. `20260206140000_wellness_member_system.sql`
   2. `20260424100000_profiles_newsletter_from_signup_metadata.sql`
   3. `20260424120000_seed_journal_articles.sql`
   4. `20260425100000_article_reflections_unique_user_article.sql`
   5. `20260425140000_phase1_catalog_access_visibility.sql`
   6. `20260426100000_webinar_seats_and_seed.sql`
   7. `20260427120000_resources_resource_type.sql`
   8. `20260427180000_consultation_requests_edit_policy.sql`

Then optionally run [`seeds/member_system_seed.sql`](./seeds/member_system_seed.sql) for demo catalog rows.

---

## Migration

SQL lives in [`migrations/`](./migrations/). Notable files:

- `20260206140000_wellness_member_system.sql` — core schema (includes `resources`, `resource_downloads`).
- `20260425140000_phase1_catalog_access_visibility.sql` — catalog visibility for authenticated users.
- `20260427120000_resources_resource_type.sql` — `resources.resource_type` (library shelves).
- `20260427180000_consultation_requests_edit_policy.sql` — consultation rows editable by owner only while `status = 'new'`.

### Option A — Supabase CLI

From the repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project):

```bash
supabase db push
```

Or apply a single file to a linked remote:

```bash
supabase db execute --file supabase/migrations/20260206140000_wellness_member_system.sql
```

(Exact CLI flags can vary by CLI version; `supabase db push` applies pending migrations from `supabase/migrations/`.)

### Option B — Dashboard SQL Editor (no CLI)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run **every** migration file in **timestamp order** (see numbered list in the section above), one query per file — not only the first file.
3. If something already exists from a partial run, fix the error or reset the remote DB and reapply cleanly.

## Seed data (optional)

After the migration succeeds, open **SQL Editor** again and run:

`supabase/seeds/member_system_seed.sql`

This inserts demo articles, webinars, and resources (`ON CONFLICT DO NOTHING` on slugs).

## Notes

- **RLS** is enabled; client apps should use the **anon** key with policies, or **authenticated** JWT for member routes. **`service_role`** bypasses RLS — server-only, never in the browser.
- New users get a **`public.profiles`** row from trigger **`on_auth_user_created`** on **`auth.users`** (with **`ON CONFLICT DO NOTHING`** if a profile row already exists).
- **`is_webinar_participant(user, id, type)`**: for **`webinar`**, checks **`webinar_bookings`** with **`status = booked`**. For **`article`** / **`resource`**, returns **`false`** until you add mapping (e.g. link tables or entitlements).

## Supabase Dashboard configuration (outside SQL)

| Area | What to set |
|------|-------------|
| **Authentication → URL configuration** | **Site URL**: your production origin. **Redirect URLs**: e.g. `http://localhost:4321/**`, `https://your-domain/**`, plus `/app/**` or post-login routes. |
| **Authentication → Providers** | Enable **Email** (and email confirmation if required). |
| **Project Settings → API** | Use the **anon** public key in app env (`PUBLIC_SUPABASE_ANON_KEY`). Never put **service_role** in frontend env. |
| **Email templates** | Optional: align confirmation / recovery links with **Site URL** and redirects. |

If an **older** version of this migration already ran on a database, do not paste this file again blindly — add a incremental migration or reset the DB and reapply.

---

## Edge Functions — webinar email (`functions/`)

Transactional mail defaults to **Resend** when `RESEND_API_KEY` is set. To use **Postmark** instead, set `POSTMARK_SERVER_TOKEN` and leave `RESEND_API_KEY` unset (see `_shared/mailer.ts`).

| Function | Purpose | Auth |
|----------|---------|------|
| `send-webinar-confirmation` | Sends booking confirmation; sets `confirmation_sent_at`. Body: `{ "booking_id": "uuid" }`. | Member **`Authorization: Bearer <access_token>`** |
| `send-webinar-reminders` | Sends 24h / 1h reminders; updates `reminder_*_sent_at`. Body: `{}`. | **`Authorization: Bearer <SERVICE_ROLE_KEY>`** (cron / server only) |

Shared templates live in `functions/_shared/email-templates.ts` (confirmation, 24h, 1h, optional replay helper).

### Deployment commands

From the repo root (after [Supabase CLI](https://supabase.com/docs/guides/cli) install):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase functions deploy send-webinar-confirmation
supabase functions deploy send-webinar-reminders
```

Project layout lives under [`supabase/functions/`](./functions/). [`config.toml`](./config.toml) sets `[functions] verify_jwt = false` because each handler validates auth explicitly.

### Required secrets (Dashboard → Edge Functions → Secrets, or CLI)

Set these **for Edge Functions** (never commit values):

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  EMAIL_FROM="Wellness First <hello@yourdomain.com>" \
  SITE_URL=https://wellnessfirstglobal.com \
  SUPABASE_ANON_KEY=your_anon_public_key
```

Notes:

- **`SUPABASE_SERVICE_ROLE_KEY`** — Often injected automatically for Edge Functions on hosted Supabase. If local serve fails with missing admin access, add it via `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` (still **never** put this in Astro `.env` or client bundles).
- **`SUPABASE_URL`** — Usually auto-provided alongside anon/service keys in the Edge runtime.
- **`SITE_URL`** — Public site origin used for links inside emails (`/webinars/{slug}`).

Postmark alternative:

```bash
supabase secrets set POSTMARK_SERVER_TOKEN=xxxxxxxx EMAIL_FROM="..."
# Omit RESEND_API_KEY so Postmark is selected.
```

### Cron — reminders every 15 minutes

See **[`sql/webinar_reminders_cron.sql`](./sql/webinar_reminders_cron.sql)** for:

- **`pg_cron` + `pg_net`** example (replace URL and Bearer token; prefer Vault / Dashboard schedules over committing secrets).

Dashboard path (recommended when available):

1. Database → Extensions → enable **pg_cron** and **pg_net** (if using SQL scheduling).
2. **Edge Functions → `send-webinar-reminders` → Schedules** → interval **every 15 minutes**, method POST, body `{}`.
3. Schedule runs server-side; configure secrets as above so the function can send mail and update rows.

### Frontend wiring

Set **`PUBLIC_WEBINAR_BOOKING_NOTIFY_URL`** in the Astro site to:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-webinar-confirmation`

The browser sends only the **anon session JWT** and **`booking_id`**; confirmation timestamps are written by the Edge Function.

### Local testing

1. Start local stack (Docker):

   ```bash
   supabase start
   ```

2. Env file for secrets (example path `.env.functions.local`, do not commit):

   ```
   RESEND_API_KEY=re_test_or_real
   EMAIL_FROM=Wellness First <onboarding@resend.dev>
   SITE_URL=http://localhost:4321
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=<output of supabase status>
   SUPABASE_SERVICE_ROLE_KEY=<output of supabase status>
   ```

3. Serve functions:

   ```bash
   supabase functions serve --env-file ./supabase/.env.functions.local --no-verify-jwt
   ```

4. **Confirmation** (replace JWT with a signed-in user access token from your app):

   ```bash
   curl -sS -X POST 'http://127.0.0.1:54321/functions/v1/send-webinar-confirmation' \
     -H "Authorization: Bearer USER_ACCESS_JWT" \
     -H "Content-Type: application/json" \
     -d '{"booking_id":"BOOKING_UUID"}'
   ```

5. **Reminders** (service role):

   ```bash
   curl -sS -X POST 'http://127.0.0.1:54321/functions/v1/send-webinar-reminders' \
     -H "Authorization: Bearer SERVICE_ROLE_JWT" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

Resend requires a verified domain or their test sender for production deliverability.
