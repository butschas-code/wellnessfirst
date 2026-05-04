import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { bearerToken } from '../_shared/auth.ts';
import { confirmationEmail, type WebinarMailContext } from '../_shared/email-templates.ts';
import { sendTransactionalMail } from '../_shared/mailer.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type Body = { booking_id?: string };

function one<T>(rel: T | T[] | null): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const siteUrl = Deno.env.get('SITE_URL')?.trim() ?? '';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured: Supabase env missing' }, { status: 500 });
  }

  const jwt = bearerToken(req);
  if (!jwt) {
    return jsonResponse({ error: 'Missing Authorization Bearer token' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bookingId = body.booking_id?.trim();
  if (!bookingId) {
    return jsonResponse({ error: 'booking_id is required' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser(jwt);

  if (userErr || !user) {
    return jsonResponse({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: booking, error: bookErr } = await admin
    .from('webinar_bookings')
    .select(
      'id, user_id, status, confirmation_sent_at, webinars ( slug, title, starts_at, timezone, replay_url )',
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bookErr) {
    return jsonResponse({ error: bookErr.message }, { status: 500 });
  }
  if (!booking) {
    return jsonResponse({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, { status: 403 });
  }

  if (booking.status !== 'booked') {
    return jsonResponse({ error: 'Booking is not active' }, { status: 409 });
  }

  if (booking.confirmation_sent_at) {
    return jsonResponse({ ok: true, skipped: 'already_sent' }, { status: 200 });
  }

  const webinar = one(booking.webinars as { slug: string; title: string; starts_at: string; timezone: string; replay_url: string | null } | null);
  if (!webinar) {
    return jsonResponse({ error: 'Webinar not found for booking' }, { status: 500 });
  }

  const { data: prof } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', booking.user_id)
    .maybeSingle();

  const { data: authData, error: authAdErr } = await admin.auth.admin.getUserById(booking.user_id);
  if (authAdErr || !authData.user?.email) {
    return jsonResponse({ error: 'Could not resolve recipient email' }, { status: 500 });
  }

  const email = authData.user.email;
  const recipientName =
    prof?.display_name?.trim() ||
    prof?.full_name?.trim() ||
    null;

  const ctx: WebinarMailContext = {
    siteUrl,
    recipientName,
    webinarTitle: webinar.title,
    webinarSlug: webinar.slug,
    startsAt: webinar.starts_at,
    timezone: webinar.timezone,
    replayUrl: webinar.replay_url,
  };

  const { subject, html, text } = confirmationEmail(ctx);
  const sent = await sendTransactionalMail({ to: email, subject, html, text });

  if (!sent.ok) {
    return jsonResponse({ error: sent.error ?? 'Mail send failed' }, { status: 502 });
  }

  const { error: upErr } = await admin
    .from('webinar_bookings')
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('user_id', user.id);

  if (upErr) {
    return jsonResponse({ error: upErr.message, warning: 'Email sent but timestamp not saved' }, { status: 500 });
  }

  return jsonResponse({ ok: true }, { status: 200 });
});
