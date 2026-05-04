import { LOGIN_PATH, SIGNUP_PATH } from '@/lib/auth/constants';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import {
  formatWebinarScheduleStart,
  googleCalendarTemplateUrl,
} from '@/lib/webinars/format-schedule';
import { sendWebinarBookingConfirmation } from '@/lib/webinars/send-booking-confirmation';

export type WebinarDetailPayload = {
  id: string;
  slug: string;
  title: string;
  topicLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  timezoneLabel: string;
  seatLimit: number | null;
  bookingOpen: boolean;
  replayUrl: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function scheduleHuman(p: WebinarDetailPayload): string {
  return formatWebinarScheduleStart({ starts_at: p.startsAt, timezone: p.timezone });
}

function endedNow(row: WebinarDetailPayload): boolean {
  const t = row.endsAt ? new Date(row.endsAt).getTime() : new Date(row.startsAt).getTime();
  return t < Date.now();
}

async function bookedSeatCount(webinarId: string): Promise<number | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc('webinar_booked_seat_count', { w_id: webinarId });
  if (error || data == null) return null;
  const n = typeof data === 'number' ? data : Number(data);
  return Number.isFinite(n) ? n : null;
}

async function logActivity(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  userId: string,
  activityType: 'webinar_booked' | 'webinar_cancelled',
  webinarId: string,
  slug: string,
  bookingId?: string,
): Promise<void> {
  const { error } = await supabase.from('member_activity').insert({
    user_id: userId,
    activity_type: activityType,
    entity_type: 'webinar',
    entity_id: webinarId,
    metadata: { slug, booking_id: bookingId ?? null },
  });
  if (error) console.warn('[webinar-booking] activity log failed', error.message);
}

export function initWebinarDetailBooking(payload: WebinarDetailPayload): void {
  if (typeof document === 'undefined') return;

  const root = document.getElementById('w-webinar-book-root');
  const metaSlot = document.getElementById('w-webinar-meta-slot');
  if (!root || !metaSlot) return;

  const metaEl = metaSlot;
  const memberHubWebinarsPath = '/my-wellness-space/webinars';
  const nextPath = `/webinars/${payload.slug}`;
  const nextQ = encodeURIComponent(nextPath);

  function metaTimezoneFooter(): string {
    return `<p class="mt-3 text-sm text-ink-600">All times shown in the gathering&apos;s local zone (${esc(payload.timezoneLabel)}).</p>`;
  }

  function renderArchiveMeta(): void {
    metaEl.innerHTML = `
      <p class="text-lg font-medium text-ink">${esc(scheduleHuman(payload))}${payload.topicLabel ? `<span class="block mt-2 text-secondary">${esc(payload.topicLabel)}</span>` : ''}</p>
      ${metaTimezoneFooter()}
      <a class="mt-4 inline-flex text-sm font-medium text-secondary underline decoration-line underline-offset-4 hover:text-ink"
         href="${esc(
           googleCalendarTemplateUrl({
             title: payload.title,
             details: `Invitation — Wellness First Global.\n${typeof window !== 'undefined' ? window.location.href : ''}`,
             startIso: payload.startsAt,
             endIso: payload.endsAt,
           }),
         )}" target="_blank" rel="noopener noreferrer">Add to calendar</a>
    `;
  }

  const setRootHtml = (html: string): void => {
    root.innerHTML = html;
    bindAuthLinks(root);
    bindPrimary(root);
  };

  function bindAuthLinks(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLAnchorElement>('a[data-w-auth="signup"]').forEach((a) => {
      a.href = `${SIGNUP_PATH}?next=${nextQ}`;
    });
    scope.querySelectorAll<HTMLAnchorElement>('a[data-w-auth="login"]').forEach((a) => {
      a.href = `${LOGIN_PATH}?next=${nextQ}`;
    });
  }

  function bindPrimary(scope: HTMLElement): void {
    const btn = scope.querySelector<HTMLButtonElement>('button[data-w-action="rsvp"]');
    btn?.addEventListener('click', () => void onRsvp());

    const cancel = scope.querySelector<HTMLButtonElement>('button[data-w-action="cancel"]');
    cancel?.addEventListener('click', () => void onCancel());
  }

  async function onCancel(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm('Release your seat for this gathering? You can RSVP again if places remain.')) return;

    const { data: row, error: selErr } = await supabase
      .from('webinar_bookings')
      .select('id')
      .eq('webinar_id', payload.id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (selErr || !row?.id) {
      setRootHtml(`<p class="text-sm text-red-800">${esc(selErr?.message ?? 'Could not find your reservation.')}</p>`);
      return;
    }

    const { error: upErr } = await supabase
      .from('webinar_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', row.id);

    if (upErr) {
      setRootHtml(`<p class="text-sm text-red-800">${esc(upErr.message)}</p>`);
      return;
    }

    await logActivity(supabase, session.user.id, 'webinar_cancelled', payload.id, payload.slug, row.id);
    void hydrate();
  }

  async function onRsvp(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const unlimited = payload.seatLimit == null;
    if (!unlimited) {
      const cnt = await bookedSeatCount(payload.id);
      if (cnt != null && cnt >= payload.seatLimit!) {
        setRootHtml(waitlistHtml());
        return;
      }
    }

    const { data: existing, error: selErr } = await supabase
      .from('webinar_bookings')
      .select('id, status')
      .eq('webinar_id', payload.id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (selErr) {
      setRootHtml(`<p class="text-sm text-red-800">${esc(selErr.message)}</p>`);
      return;
    }

    let bookingId: string;
    let transitioned = false;

    if (!existing) {
      const ins = await supabase
        .from('webinar_bookings')
        .insert({ user_id: session.user.id, webinar_id: payload.id, status: 'booked' })
        .select('id')
        .single();

      if (ins.error) {
        if (ins.error.code === '23505') {
          void hydrate();
          return;
        }
        setRootHtml(`<p class="text-sm text-red-800">${esc(ins.error.message)}</p>`);
        return;
      }
      bookingId = ins.data!.id;
      transitioned = true;
    } else if (existing.status === 'booked') {
      void hydrate();
      return;
    } else if (existing.status === 'cancelled') {
      const up = await supabase
        .from('webinar_bookings')
        .update({
          status: 'booked',
          cancelled_at: null,
          booked_at: new Date().toISOString(),
          confirmation_sent_at: null,
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (up.error) {
        setRootHtml(`<p class="text-sm text-red-800">${esc(up.error.message)}</p>`);
        return;
      }
      bookingId = up.data!.id;
      transitioned = true;
    } else {
      setRootHtml(
        `<p class="text-sm text-ink-600">Your invitation for this session is already noted differently on our side. If something looks wrong, please write us through Contact.</p>`,
      );
      return;
    }

    if (transitioned) {
      await logActivity(supabase, session.user.id, 'webinar_booked', payload.id, payload.slug, bookingId);
      const notifyUrl =
        typeof import.meta.env !== 'undefined'
          ? (import.meta.env.PUBLIC_WEBINAR_BOOKING_NOTIFY_URL as string | undefined)
          : undefined;
      const usesEdgeConfirmation = Boolean(notifyUrl?.trim());

      const ok = await sendWebinarBookingConfirmation(bookingId, {
        accessToken: session.access_token,
      });

      if (ok && !usesEdgeConfirmation) {
        await supabase
          .from('webinar_bookings')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', bookingId);
      }
    }

    void hydrate();
  }

  function loggedOutInvitationHtml(): string {
    return `
      <div class="rounded-2xl border border-ink/10 bg-paper px-6 py-8 shadow-elevated sm:px-8">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Your seat</p>
        <p class="mt-4 text-base leading-relaxed text-ink-700">
          To hold a quiet place in the room, we ask you to register once — private to you, no feed.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a data-w-auth="signup" class="btn-primary inline-flex justify-center no-underline" href="#">Create free account</a>
          <a data-w-auth="login" class="btn-secondary inline-flex justify-center no-underline" href="#">Log in</a>
        </div>
      </div>`;
  }

  function waitlistHtml(): string {
    return `
      <div class="rounded-2xl border border-secondary/25 bg-secondary/[0.06] px-6 py-8 sm:px-8">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Full circle</p>
        <p class="mt-4 font-display text-xl text-ink">This gathering has reached its gentle capacity</p>
        <p class="mt-3 text-sm leading-relaxed text-ink-600">
          We are not operating a waiting list yet — if a seat opens, we may invite again calmly through articles or the newsletter.
        </p>
      </div>`;
  }

  function bookedHtml(): string {
    return `
      <div class="rounded-2xl border border-ink/10 bg-paper px-6 py-8 shadow-elevated sm:px-8">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Held for you</p>
        <p class="mt-4 font-display text-xl text-ink">You are expected</p>
        <p class="mt-3 text-sm leading-relaxed text-ink-600">
          Arrive a little early if you can; there is no hurry inside the hour itself.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <button type="button" data-w-action="cancel" class="btn-secondary">Release my seat</button>
          <a class="btn-primary inline-flex no-underline" href="${memberHubWebinarsPath}">My webinars</a>
        </div>
      </div>`;
  }

  async function hydrate(): Promise<void> {
    const ended = endedNow(payload);

    if (ended || !payload.bookingOpen) {
      renderArchiveMeta();
      const replay =
        payload.replayUrl?.trim() ?
          `<p class="mt-4"><a class="btn-primary inline-flex no-underline" href="${esc(payload.replayUrl.trim())}" target="_blank" rel="noopener noreferrer">Open replay</a></p>`
        : '';

      setRootHtml(`
        <div class="rounded-2xl border border-ink/10 bg-paper/80 px-6 py-8 sm:px-8">
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-400">${ended ? 'After the hour' : 'Invitations paused'}</p>
          <p class="mt-4 text-base leading-relaxed text-ink-700">
            ${ended ? 'This gathering has already passed — thank you for your attention.' : 'We are not adding new seats to this session right now.'}
          </p>
          ${replay}
        </div>`);
      return;
    }

    if (!isSupabaseConfigured()) {
      renderArchiveMeta();
      setRootHtml(`<p class="text-sm text-ink-600">Connection unavailable — please try again shortly.</p>`);
      return;
    }

    setRootHtml(`<p class="text-sm text-ink-500">Checking the room…</p>`);

    const supabase = getSupabaseBrowser();
    const [countRes, sessionRes] = await Promise.all([
      bookedSeatCount(payload.id),
      supabase.auth.getSession(),
    ]);

    const session = sessionRes.data.session;
    const unlimited = payload.seatLimit == null;
    const cnt = countRes ?? 0;
    const full = !unlimited && cnt >= payload.seatLimit!;

    let bookingRow: { id: string; status: string } | null = null;
    if (session) {
      const { data } = await supabase
        .from('webinar_bookings')
        .select('id, status')
        .eq('webinar_id', payload.id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      bookingRow = data ?? null;
    }

    const seatsLine =
      unlimited ?
        `<p class="mt-3 text-sm text-ink-600">Places remain open — we gather without tightening the room.</p>`
      : `<p class="mt-3 text-sm text-ink-600">${full ? 'Every seat we allocated for this hour is spoken for.' : `${esc(String(cnt))} of ${esc(String(payload.seatLimit))} seats held.`}</p>`;

    metaEl.innerHTML = `
      <p class="text-lg font-medium text-ink">${esc(scheduleHuman(payload))}${payload.topicLabel ? `<span class="block mt-2 text-secondary">${esc(payload.topicLabel)}</span>` : ''}</p>
      ${seatsLine}
      ${metaTimezoneFooter()}
      <a class="mt-4 inline-flex text-sm font-medium text-secondary underline decoration-line underline-offset-4 hover:text-ink"
         href="${esc(
           googleCalendarTemplateUrl({
             title: payload.title,
             details: `Invitation — Wellness First Global.\n${window.location.href}`,
             startIso: payload.startsAt,
             endIso: payload.endsAt,
           }),
         )}" target="_blank" rel="noopener noreferrer">Add to calendar</a>
    `;

    if (bookingRow?.status === 'booked') {
      setRootHtml(bookedHtml());
      return;
    }

    if (full) {
      setRootHtml(waitlistHtml());
      return;
    }

    if (!session) {
      setRootHtml(loggedOutInvitationHtml());
      return;
    }

    setRootHtml(`
      <div class="rounded-2xl border border-ink/10 bg-paper px-6 py-8 shadow-elevated sm:px-8">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Respond</p>
        <p class="mt-4 text-base leading-relaxed text-ink-700">
          Reserve quietly — one seat per account for this gathering.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <button type="button" data-w-action="rsvp" class="btn-primary">Reserve my seat</button>
          <a class="btn-secondary inline-flex justify-center no-underline" href="${memberHubWebinarsPath}">What I have booked</a>
        </div>
      </div>`);
  }

  let authListening = false;
  if (!authListening && isSupabaseConfigured()) {
    authListening = true;
    getSupabaseBrowser().auth.onAuthStateChange(() => void hydrate());
  }

  void hydrate();
}
