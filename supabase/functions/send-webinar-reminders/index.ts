import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { bearerToken, timingSafeEqual } from '../_shared/auth.ts';
import { reminder24hEmail, reminder1hEmail, type WebinarMailContext } from '../_shared/email-templates.ts';
import { sendTransactionalMail } from '../_shared/mailer.ts';
import { jsonResponse } from '../_shared/cors.ts';

function one<T>(rel: T | T[] | null): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

type WebinarRow = {
  slug: string;
  title: string;
  starts_at: string;
  timezone: string;
  replay_url: string | null;
};

type BookingRow = {
  id: string;
  user_id: string;
  reminder_24h_sent_at: string | null;
  reminder_1h_sent_at: string | null;
  webinars: WebinarRow | WebinarRow[] | null;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const siteUrl = Deno.env.get('SITE_URL')?.trim() ?? '';

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured' }, { status: 500 });
  }

  const token = bearerToken(req);
  if (!token || !timingSafeEqual(token, serviceKey)) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data: rawRows, error: qErr } = await admin
    .from('webinar_bookings')
    .select('id, user_id, reminder_24h_sent_at, reminder_1h_sent_at, webinars ( slug, title, starts_at, timezone, replay_url )')
    .eq('status', 'booked');

  if (qErr) {
    return jsonResponse({ error: qErr.message }, { status: 500 });
  }

  const rows = (rawRows ?? []) as BookingRow[];

  let sent24 = 0;
  let sent1 = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const webinar = one(row.webinars);
    if (!webinar) continue;

    const startMs = new Date(webinar.starts_at).getTime();
    const msToStart = startMs - nowMs;
    if (msToStart <= 0) continue;

    let kind: '1h' | '24h' | null = null;
    if (msToStart <= 60 * 60 * 1000 && !row.reminder_1h_sent_at) kind = '1h';
    else if (msToStart <= 24 * 60 * 60 * 1000 && !row.reminder_24h_sent_at) kind = '24h';

    if (!kind) continue;

    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(row.user_id);
    if (authErr || !authData.user?.email) {
      failures.push(`booking ${row.id}: no email`);
      continue;
    }

    const { data: prof } = await admin
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', row.user_id)
      .maybeSingle();

    const recipientName = prof?.display_name?.trim() || prof?.full_name?.trim() || null;

    const ctx: WebinarMailContext = {
      siteUrl,
      recipientName,
      webinarTitle: webinar.title,
      webinarSlug: webinar.slug,
      startsAt: webinar.starts_at,
      timezone: webinar.timezone,
      replayUrl: webinar.replay_url,
    };

    const { subject, html, text } =
      kind === '1h' ? reminder1hEmail(ctx) : reminder24hEmail(ctx);

    const mail = await sendTransactionalMail({ to: authData.user.email, subject, html, text });
    if (!mail.ok) {
      failures.push(`booking ${row.id} (${kind}): ${mail.error ?? 'send failed'}`);
      continue;
    }

    const patch =
      kind === '1h'
        ? { reminder_1h_sent_at: nowIso }
        : { reminder_24h_sent_at: nowIso };

    const { error: upErr } = await admin.from('webinar_bookings').update(patch).eq('id', row.id);

    if (upErr) {
      failures.push(`booking ${row.id}: sent but DB update failed — ${upErr.message}`);
      continue;
    }

    if (kind === '1h') sent1 += 1;
    else sent24 += 1;
  }

  return jsonResponse({
    ok: true,
    sent_reminder_24h: sent24,
    sent_reminder_1h: sent1,
    failures,
  });
});
