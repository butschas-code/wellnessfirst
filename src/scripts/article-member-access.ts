import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

function show(el: HTMLElement | null, on: boolean): void {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

export function initArticleMemberAccess(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('[data-member-article-root][data-access-level="member"]');
  if (!root) return;

  const slug = root.dataset.catalogSlug?.trim();
  if (!slug) return;

  const gate = root.querySelector<HTMLElement>('[data-member-soft-gate]');
  const bodyWrap = root.querySelector<HTMLElement>('[data-member-body-wrap]');
  const htmlHost = root.querySelector<HTMLElement>('[data-member-article-html]');
  const status = root.querySelector<HTMLElement>('[data-member-article-status]');
  if (!gate || !bodyWrap || !status) return;
  const statusEl = status;

  async function showGuestGate(): Promise<void> {
    show(gate, true);
    show(bodyWrap, false);
    statusEl.classList.add('hidden');
  }

  async function loadBody(): Promise<void> {
    if (!isSupabaseConfigured()) {
      statusEl.textContent = 'Catalog connection unavailable.';
      statusEl.classList.remove('hidden');
      await showGuestGate();
      return;
    }

    show(gate, false);
    show(bodyWrap, true);
    statusEl.textContent = 'Opening article…';
    statusEl.classList.remove('hidden');

    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('articles')
      .select('content, access_level')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error) {
      statusEl.textContent = error.message;
      return;
    }

    if (!data || data.access_level !== 'member') {
      statusEl.textContent = 'This piece is not available in your library catalog yet.';
      if (htmlHost) htmlHost.innerHTML = '';
      return;
    }

    const html = data.content?.trim();
    if (!html) {
      statusEl.textContent =
        'The full article text has not been published to the secure catalog yet. Your editors can sync it from the article workflow.';
      if (htmlHost) htmlHost.innerHTML = '';
      return;
    }

    statusEl.classList.add('hidden');
    if (htmlHost) htmlHost.innerHTML = html;
  }

  void (async () => {
    if (!isSupabaseConfigured()) {
      await showGuestGate();
      return;
    }

    const supabase = getSupabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      await showGuestGate();
      return;
    }

    await loadBody();
  })();
}
