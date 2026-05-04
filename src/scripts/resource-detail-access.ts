import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { bindResourceDownloadClick } from '@/scripts/resource-download-track';

function show(el: HTMLElement | null, on: boolean): void {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

export function initResourceDetailAccess(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('[data-resource-detail-root][data-access-level="member"]');
  if (!root) return;

  const slug = root.dataset.resourceSlug?.trim();
  if (!slug) return;

  const gate = root.querySelector<HTMLElement>('[data-resource-soft-gate]');
  const actions = root.querySelector<HTMLElement>('[data-resource-actions]');
  const status = root.querySelector<HTMLElement>('[data-resource-status]');
  if (!gate || !actions || !status) return;
  const statusEl = status;

  void (async () => {
    if (!isSupabaseConfigured()) {
      show(gate, true);
      show(actions, false);
      statusEl.textContent = 'Catalog connection unavailable.';
      statusEl.classList.remove('hidden');
      return;
    }

    const supabase = getSupabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      show(gate, true);
      show(actions, false);
      statusEl.classList.add('hidden');
      return;
    }

    show(gate, false);
    show(actions, true);
    statusEl.textContent = 'Checking access…';
    statusEl.classList.remove('hidden');

    const { data, error } = await supabase
      .from('resources')
      .select('id, access_level, file_url, external_url')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error) {
      statusEl.textContent = error.message;
      return;
    }

    if (!data || data.access_level !== 'member') {
      statusEl.textContent = 'This piece is not offered as member-access material.';
      actions.replaceChildren();
      return;
    }

    const link = data.external_url || data.file_url;
    if (!link) {
      statusEl.textContent = 'Nothing is linked here yet.';
      actions.replaceChildren();
      return;
    }

    statusEl.classList.add('hidden');
    const label = data.external_url ? 'Open link' : 'Open file';
    actions.replaceChildren();
    const a = document.createElement('a');
    a.className = 'btn-primary inline-flex no-underline';
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.dataset.resourceDownloadId = data.id;
    bindResourceDownloadClick(supabase, session.user.id, data.id, a);
    actions.appendChild(a);
  })();
}
