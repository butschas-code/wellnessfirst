import { guardSessionOrRedirect } from '@/lib/app/guardSession';
import { topicLabel } from '@/lib/member/topic-labels';
import { RESOURCE_TYPE_SECTION_LABEL, isResourceTypeKey } from '@/lib/resources/resource-types';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type ResourceRel = {
  slug: string;
  title: string;
  description: string | null;
  topic_key: string | null;
  resource_type: string | null;
};

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function shelfLabel(type: string | null | undefined): string {
  return isResourceTypeKey(type) ? RESOURCE_TYPE_SECTION_LABEL[type] : 'Library';
}

function resourceRowCard(w: ResourceRel): string {
  const topic = w.topic_key ? topicLabel(w.topic_key) : '';
  const shelf = shelfLabel(w.resource_type);
  const desc = w.description ? `<p class="mt-2 line-clamp-2 text-sm text-ink-600">${esc(w.description.replace(/\s+/g, ' ').trim().slice(0, 160))}</p>` : '';
  return `<li class="border-b border-ink/[0.06] py-6 first:pt-0">
    <a class="group block" href="/resources/${esc(w.slug)}">
      <span class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-secondary">${esc(shelf)}</span>
      <span class="mt-1 block font-display text-xl text-ink transition-colors group-hover:text-secondary">${esc(w.title)}</span>
      ${topic ? `<span class="mt-1 block text-xs uppercase tracking-wider text-ink-400">${esc(topic)}</span>` : ''}
      ${desc}
    </a>
  </li>`;
}

export async function initResourceMemberHub(): Promise<void> {
  const state = document.getElementById('w-rs-state');
  const skel = document.getElementById('w-rs-skel');
  const panel = document.getElementById('w-rs-panel');
  const avail = document.getElementById('w-rs-available');
  const recent = document.getElementById('w-rs-recent');
  const suggest = document.getElementById('w-rs-suggested');

  if (!avail || !recent || !suggest) return;

  if (!isSupabaseConfigured()) {
    if (state) state.textContent = 'Supabase is not configured.';
    return;
  }

  const session = await guardSessionOrRedirect();
  if (!session) return;

  state?.classList.add('hidden');
  skel?.classList.remove('hidden');

  const supabase = getSupabaseBrowser();
  const uid = session.user.id;

  const [prefsRes, catalogRes, downloadsRes] = await Promise.all([
    supabase.from('topic_preferences').select('topic_key').eq('user_id', uid),
    supabase
      .from('resources')
      .select('slug, title, description, topic_key, resource_type, access_level')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('resource_downloads')
      .select('downloaded_at, resources ( slug, title, description, topic_key, resource_type )')
      .eq('user_id', uid)
      .order('downloaded_at', { ascending: false })
      .limit(15),
  ]);

  skel?.classList.add('hidden');
  panel?.classList.remove('hidden');

  const prefKeys = [...new Set((prefsRes.data ?? []).map((r) => r.topic_key).filter(Boolean))] as string[];

  if (catalogRes.error) {
    avail.innerHTML = `<p class="text-sm text-red-800">${esc(catalogRes.error.message)}</p>`;
    recent.innerHTML = '';
    suggest.innerHTML = '';
    return;
  }

  const catalog = (catalogRes.data ?? []) as {
    slug: string;
    title: string;
    description: string | null;
    topic_key: string | null;
    resource_type: string | null;
    access_level: string;
  }[];

  const availableNow = catalog.filter((r) => r.access_level === 'public' || r.access_level === 'member');

  const tierNote = (tier: string): string => {
    if (tier === 'webinar_participants') {
      return '<p class="mt-3 text-sm text-ink-600">Held for webinar participants — arrive through your invitation first.</p>';
    }
    if (tier === 'paid') {
      return '<p class="mt-3 text-sm text-ink-600">Reserved for a future guided pathway.</p>';
    }
    return '';
  };

  const availableHtml =
    availableNow.length === 0
      ? `<p class="max-w-lg text-sm leading-relaxed text-ink-600">Nothing on the open shelf yet — when guides land, they line up here without noise.</p>`
      : `<ul class="max-w-2xl">${availableNow.map((r) => resourceRowCard(r)).join('')}</ul>`;

  const gated = catalog.filter((r) => r.access_level === 'webinar_participants' || r.access_level === 'paid');
  const gatedHtml =
    gated.length === 0
      ? ''
      : `<div class="mt-12 border-t border-ink/[0.06] pt-12">
          <h3 class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-400">Coming into reach</h3>
          <ul class="mt-6 max-w-2xl space-y-10 list-none p-0">
            ${gated
              .map(
                (r) => `<li>
              <a class="font-display text-lg text-ink underline decoration-ink/15 decoration-1 underline-offset-4 hover:text-secondary" href="/resources/${esc(r.slug)}">${esc(r.title)}</a>
              ${tierNote(r.access_level)}
            </li>`,
              )
              .join('')}
          </ul>
        </div>`;

  avail.innerHTML = availableHtml + gatedHtml;

  const rawDl = (downloadsRes.data ?? []) as {
    downloaded_at: string;
    resources: ResourceRel | ResourceRel[] | null;
  }[];
  const recentRows = rawDl.map((d) => one(d.resources)).filter(Boolean) as ResourceRel[];

  if (downloadsRes.error) {
    recent.innerHTML = `<p class="text-sm text-ink-600">${esc(downloadsRes.error.message)}</p>`;
  } else if (recentRows.length === 0) {
    recent.innerHTML =
      '<p class="max-w-lg text-sm leading-relaxed text-ink-600">When you open a worksheet or guide while signed in, it leaves a gentle trace here — no scores, only memory.</p>';
  } else {
    recent.innerHTML = `<ul class="max-w-2xl">${recentRows.map((w) => resourceRowCard(w)).join('')}</ul>`;
  }

  const downloadedSlugs = new Set(recentRows.map((r) => r.slug));

  if (prefKeys.length === 0) {
    suggest.innerHTML =
      '<p class="max-w-lg text-sm leading-relaxed text-ink-600">Choose themes under Interests — we will quietly align suggestions with what you care about.</p>';
  } else {
    const { data: sugData, error: sugErr } = await supabase
      .from('resources')
      .select('slug, title, description, topic_key, resource_type')
      .eq('published', true)
      .in('topic_key', prefKeys)
      .in('access_level', ['public', 'member'])
      .order('created_at', { ascending: false })
      .limit(24);

    if (sugErr) {
      suggest.innerHTML = `<p class="text-sm text-red-800">${esc(sugErr.message)}</p>`;
    } else {
      const sugRows = ((sugData ?? []) as ResourceRel[]).filter(
        (r, i, arr) => arr.findIndex((x) => x.slug === r.slug) === i,
      );
      const fresh = sugRows.filter((r) => !downloadedSlugs.has(r.slug));
      const picked = (fresh.length > 0 ? fresh : sugRows).slice(0, 8);
      if (picked.length === 0) {
        suggest.innerHTML =
          '<p class="max-w-lg text-sm leading-relaxed text-ink-600">Nothing extra matched today — your themes may already be reflected above.</p>';
      } else {
        suggest.innerHTML = `<ul class="max-w-2xl">${picked.map((w) => resourceRowCard(w)).join('')}</ul>`;
      }
    }
  }
}
