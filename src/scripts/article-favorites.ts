import { LOGIN_PATH, SIGNUP_PATH } from '@/lib/auth/constants';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { getPublishedArticleIdBySlug, peekCachedArticleId, rememberArticleIdForSlug } from '@/scripts/catalog-article-id';

const ATTR_FAVORITE = 'data-article-favorite';
const ATTR_SLUG = 'data-article-slug';

let delegationBound = false;

function encodeNext(path: string): string {
  return encodeURIComponent(path.startsWith('/') ? path : `/${path}`);
}

function ensureLoginModal(): HTMLElement {
  let el = document.getElementById('wfg-fav-login-modal');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'wfg-fav-login-modal';
  el.className =
    'fixed inset-0 z-[200] hidden items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'wfg-fav-login-title');
  el.innerHTML = `
    <div class="relative max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-elevated">
      <button type="button" class="absolute right-4 top-4 text-ink-400 hover:text-ink" data-wfg-fav-close aria-label="Close">&times;</button>
      <p id="wfg-fav-login-title" class="font-display text-xl text-ink">Save articles to revisit</p>
      <p class="mt-2 text-sm leading-relaxed text-ink-600">Log in or create a free account to keep a personal reading list.</p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a class="btn-primary inline-flex justify-center no-underline" data-wfg-fav-login href="#">Log in</a>
        <a class="btn-secondary inline-flex justify-center no-underline" data-wfg-fav-signup href="#">Create free account</a>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => {
    el!.classList.add('hidden');
    el!.classList.remove('flex');
  };
  el.querySelector('[data-wfg-fav-close]')?.addEventListener('click', close);
  el.addEventListener('click', (ev) => {
    if (ev.target === el) close();
  });

  return el;
}

function openLoginInvite(): void {
  const next = `${window.location.pathname}${window.location.search || ''}`;
  const q = encodeNext(next);
  const modal = ensureLoginModal();
  const login = modal.querySelector<HTMLAnchorElement>('[data-wfg-fav-login]');
  const signup = modal.querySelector<HTMLAnchorElement>('[data-wfg-fav-signup]');
  if (login) login.href = `${LOGIN_PATH}?next=${q}`;
  if (signup) signup.href = `${SIGNUP_PATH}?next=${q}`;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function isPressed(btn: HTMLElement): boolean {
  return btn.getAttribute('aria-pressed') === 'true';
}

function setSavedUI(btn: HTMLElement, saved: boolean): void {
  btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
  btn.setAttribute('aria-label', saved ? 'Remove saved article' : 'Save article');
  const label = btn.querySelector('[data-fav-visible-label]');
  if (label) label.textContent = saved ? 'Saved' : 'Save';
}

async function resolveArticleIds(slugs: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(slugs)].filter(Boolean);
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const supabase = getSupabaseBrowser();
  const uncached = unique.filter((s) => !peekCachedArticleId(s));
  if (uncached.length > 0) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug')
      .in('slug', uncached)
      .eq('published', true);
    if (error) {
      console.warn('[article-favorites] catalog lookup failed', error.message);
      return out;
    }
    for (const row of data ?? []) {
      if (row.slug && row.id) rememberArticleIdForSlug(row.slug, row.id);
    }
  }
  for (const s of unique) {
    const id = peekCachedArticleId(s);
    if (id) out.set(s, id);
  }
  return out;
}

async function hydrate(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const buttons = Array.from(document.querySelectorAll<HTMLElement>(`[${ATTR_FAVORITE}]`));
  if (buttons.length === 0) return;

  const slugs = buttons.map((b) => b.getAttribute(ATTR_SLUG)).filter((s): s is string => Boolean(s));

  const supabase = getSupabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    for (const btn of buttons) setSavedUI(btn, false);
    return;
  }

  const map = await resolveArticleIds(slugs);
  const ids = [...new Set([...map.values()])];
  if (ids.length === 0) {
    for (const btn of buttons) setSavedUI(btn, false);
    return;
  }

  const { data: favs } = await supabase
    .from('article_favorites')
    .select('article_id')
    .eq('user_id', session.user.id)
    .in('article_id', ids);

  const savedIds = new Set((favs ?? []).map((r) => r.article_id));

  for (const btn of buttons) {
    const slug = btn.getAttribute(ATTR_SLUG);
    if (!slug) continue;
    const aid = map.get(slug);
    setSavedUI(btn, Boolean(aid && savedIds.has(aid)));
  }
}

async function onFavoriteClick(btn: HTMLElement): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const slug = btn.getAttribute(ATTR_SLUG);
  if (!slug) return;

  const supabase = getSupabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    openLoginInvite();
    return;
  }

  const articleId = await getPublishedArticleIdBySlug(slug);
  if (!articleId) {
    console.warn('[article-favorites] unknown slug', slug);
    return;
  }

  const uid = session.user.id;
  const saving = !isPressed(btn);

  if (!saving) {
    const { error } = await supabase.from('article_favorites').delete().eq('user_id', uid).eq('article_id', articleId);
    if (error) console.warn('[article-favorites] remove failed', error.message);
    else setSavedUI(btn, false);
    return;
  }

  const { error } = await supabase.from('article_favorites').insert({ user_id: uid, article_id: articleId });
  const dup = error?.code === '23505';
  if (error && !dup) {
    console.warn('[article-favorites] save failed', error.message);
    return;
  }

  setSavedUI(btn, true);

  if (!dup) {
    const { error: actErr } = await supabase.from('member_activity').insert({
      user_id: uid,
      activity_type: 'favorite_article',
      entity_type: 'article',
      entity_id: articleId,
      metadata: { slug },
    });
    if (actErr) console.warn('[article-favorites] activity log failed', actErr.message);
  }
}

function bindDelegation(): void {
  if (delegationBound) return;
  delegationBound = true;

  document.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement | null;
    const btn = t?.closest(`[${ATTR_FAVORITE}]`) as HTMLElement | null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    void onFavoriteClick(btn);
  });

  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseBrowser();
  supabase.auth.onAuthStateChange(() => void hydrate());
}

/** Wire favorite buttons present in the DOM; safe to call on every page load. */
export function initArticleFavorites(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  bindDelegation();
  void hydrate();
}
