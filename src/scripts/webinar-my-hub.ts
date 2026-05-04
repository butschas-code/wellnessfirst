import { guardSessionOrRedirect } from '@/lib/app/guardSession';
import { formatMemberSessionInstant } from '@/lib/member/format-dates';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type WebinarRel = {
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  replay_url: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  booked_at: string;
  cancelled_at: string | null;
  webinars: WebinarRel | WebinarRel[] | null;
};

function oneWebinar(rel: WebinarRel | WebinarRel[] | null | undefined): WebinarRel | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function webinarEnded(w: WebinarRel): boolean {
  const t = w.ends_at ? new Date(w.ends_at).getTime() : new Date(w.starts_at).getTime();
  return t < Date.now() - 60_000;
}

function webinarUpcoming(w: WebinarRel): boolean {
  return !webinarEnded(w);
}

function rowCard(w: WebinarRel, opts: { replay?: boolean; statusNote?: string } = {}): string {
  const when = esc(formatMemberSessionInstant(w.starts_at, w.timezone));
  const replay =
    opts.replay && w.replay_url?.trim() ?
      `<a class="mt-3 inline-flex text-sm font-medium text-secondary underline decoration-line underline-offset-4 hover:text-ink" href="${esc(w.replay_url.trim())}" target="_blank" rel="noopener noreferrer">Open replay</a>`
    : '';
  const note = opts.statusNote ? `<span class="mt-2 block text-xs uppercase tracking-wide text-ink-400">${esc(opts.statusNote)}</span>` : '';

  return `<li class="border-b border-ink/[0.06] py-6 first:pt-0">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a class="group block" href="/webinars/${esc(w.slug)}">
          <span class="font-display text-xl text-ink transition-colors group-hover:text-secondary">${esc(w.title)}</span>
          <span class="mt-1.5 block text-sm text-ink-500">${when}</span>
          ${note}
        </a>
        ${replay}
      </div>
    </div>
  </li>`;
}

function listUl(rows: string[], emptyCopy: string): string {
  if (rows.length === 0) {
    return `<p class="max-w-lg text-sm leading-relaxed text-ink-600">${emptyCopy}</p>`;
  }
  return `<ul class="max-w-2xl">${rows.join('')}</ul>`;
}

export async function initWebinarMyHub(): Promise<void> {
  const state = document.getElementById('w-wb-state');
  const skel = document.getElementById('w-wb-skel');
  const panel = document.getElementById('w-wb-panel');
  const up = document.getElementById('w-wb-upcoming');
  const past = document.getElementById('w-wb-past');
  const cancelledEl = document.getElementById('w-wb-cancelled');

  if (!up || !past || !cancelledEl) return;

  if (!isSupabaseConfigured()) {
    if (state) state.textContent = 'Supabase is not configured.';
    return;
  }

  const session = await guardSessionOrRedirect();
  if (!session) return;

  state?.classList.add('hidden');
  skel?.classList.remove('hidden');

  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from('webinar_bookings')
    .select('id, status, booked_at, cancelled_at, webinars ( slug, title, starts_at, ends_at, timezone, replay_url )')
    .eq('user_id', session.user.id)
    .order('booked_at', { ascending: false });

  skel?.classList.add('hidden');
  panel?.classList.remove('hidden');

  if (error) {
    up.innerHTML = `<p class="text-sm text-red-800">${esc(error.message)}</p>`;
    past.innerHTML = '';
    cancelledEl.innerHTML = '';
    return;
  }

  const raw = (data ?? []) as BookingRow[];

  const normalized = raw.map((row) => ({
    ...row,
    webinars: oneWebinar(row.webinars),
  }));

  const cancelled = normalized.filter((r) => r.status === 'cancelled' && r.webinars);

  const active = normalized.filter((r) => r.webinars && r.status !== 'cancelled');

  const upcomingBooked = active.filter((r) => r.status === 'booked' && r.webinars && webinarUpcoming(r.webinars));

  const upcomingSorted = [...upcomingBooked].sort(
    (a, b) => new Date(a.webinars!.starts_at).getTime() - new Date(b.webinars!.starts_at).getTime(),
  );

  const pastOrMixed = active.filter((r) => {
    const w = r.webinars;
    if (!w) return false;
    if (['attended', 'no_show'].includes(r.status)) return true;
    return r.status === 'booked' && webinarEnded(w);
  });

  const pastSorted = [...pastOrMixed].sort(
    (a, b) => new Date(b.webinars!.starts_at).getTime() - new Date(a.webinars!.starts_at).getTime(),
  );

  const cancelledSorted = [...cancelled].sort(
    (a, b) =>
      new Date(b.cancelled_at ?? b.booked_at).getTime() - new Date(a.cancelled_at ?? a.booked_at).getTime(),
  );

  up.innerHTML = listUl(
    upcomingSorted.map((r) => rowCard(r.webinars!)),
    'Nothing scheduled — when you reserve a seat, the invitation appears here with its time.',
  );

  past.innerHTML = listUl(
    pastSorted.map((r) => {
      const note =
        r.status === 'attended' ? 'Attended'
        : r.status === 'no_show' ? 'Recorded as absent'
        : r.status === 'booked' ? 'Past session'
        : '';
      return rowCard(r.webinars!, {
        replay: true,
        statusNote: note,
      });
    }),
    'Past gatherings will gather here — including replay links when we publish them.',
  );

  cancelledEl.innerHTML = listUl(
    cancelledSorted.map((r) => rowCard(r.webinars!, { statusNote: 'Cancelled reservation' })),
    'No cancelled invitations.',
  );
}
