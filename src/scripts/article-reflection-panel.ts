import { LOGIN_PATH, SIGNUP_PATH } from '@/lib/auth/constants';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { getPublishedArticleIdBySlug } from '@/scripts/catalog-article-id';

function encodeNext(path: string): string {
  return encodeURIComponent(path.startsWith('/') ? path : `/${path}`);
}

function show(el: HTMLElement | null, on: boolean): void {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

function setStatus(el: HTMLElement | null, kind: 'idle' | 'ok' | 'err', msg: string): void {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden', 'text-green-800', 'text-red-800', 'text-ink-600');
  el.classList.add('text-sm');
  if (kind === 'idle') {
    el.classList.add('text-ink-600');
  } else if (kind === 'ok') {
    el.classList.add('text-green-800');
  } else {
    el.classList.add('text-red-800');
  }
}

async function logReflectionCreated(userId: string, articleId: string, slug: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from('member_activity').insert({
    user_id: userId,
    activity_type: 'article_reflection_created',
    entity_type: 'article',
    entity_id: articleId,
    metadata: { slug },
  });
  if (error) console.warn('[article-reflection] activity log failed', error.message);
}

export function initArticleReflectionPanel(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('[data-article-reflection-root]');
  if (!root) return;

  const rawSlug = root.dataset.catalogSlug?.trim();
  if (!rawSlug) return;
  const slug = rawSlug;

  const elLoading = root.querySelector<HTMLElement>('[data-w-ar-loading]');
  const elNoCfg = root.querySelector<HTMLElement>('[data-w-ar-no-config]');
  const elOut = root.querySelector<HTMLElement>('[data-w-ar-logged-out]');
  const elIn = root.querySelector<HTMLElement>('[data-w-ar-private]');
  const elMissing = root.querySelector<HTMLElement>('[data-w-ar-no-catalog]');

  const ta = root.querySelector<HTMLTextAreaElement>('[data-w-ar-textarea]');
  const btnSave = root.querySelector<HTMLButtonElement>('[data-w-ar-save]');
  const btnDel = root.querySelector<HTMLButtonElement>('[data-w-ar-delete]');
  const status = root.querySelector<HTMLElement>('[data-w-ar-status]');

  const next = `${window.location.pathname}${window.location.search || ''}`;
  const q = encodeNext(next);
  root.querySelectorAll<HTMLAnchorElement>('[data-w-ar-login]').forEach((a) => {
    a.href = `${LOGIN_PATH}?next=${q}`;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-w-ar-signup]').forEach((a) => {
    a.href = `${SIGNUP_PATH}?next=${q}`;
  });

  let reflectionId: string | null = null;
  let articleIdCache: string | null = null;

  async function loadReflection(uid: string, aid: string): Promise<void> {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('article_reflections')
      .select('id, reflection_text')
      .eq('user_id', uid)
      .eq('article_id', aid)
      .maybeSingle();

    if (error) {
      setStatus(status, 'err', error.message);
      reflectionId = null;
      if (ta) ta.value = '';
      show(btnDel, false);
      return;
    }

    if (data?.id) {
      reflectionId = data.id;
      if (ta) ta.value = data.reflection_text ?? '';
      show(btnDel, true);
    } else {
      reflectionId = null;
      if (ta) ta.value = '';
      show(btnDel, false);
    }
    setStatus(status, 'idle', '');
    status?.classList.add('hidden');
  }

  async function mount(): Promise<void> {
    show(elLoading, true);
    show(elNoCfg, false);
    show(elOut, false);
    show(elIn, false);
    show(elMissing, false);

    if (!isSupabaseConfigured()) {
      show(elLoading, false);
      show(elNoCfg, true);
      return;
    }

    const supabase = getSupabaseBrowser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    show(elLoading, false);

    if (!session) {
      show(elOut, true);
      return;
    }

    const aid = await getPublishedArticleIdBySlug(slug);
    if (!aid) {
      show(elMissing, true);
      return;
    }

    articleIdCache = aid;
    show(elIn, true);
    await loadReflection(session.user.id, aid);
  }

  btnSave?.addEventListener('click', () => {
    void (async () => {
      const text = ta?.value.trim() ?? '';
      if (!text) {
        setStatus(status, 'err', 'Write something short before saving.');
        status?.classList.remove('hidden');
        return;
      }

      const supabase = getSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !articleIdCache) return;

      const uid = session.user.id;
      const aid = articleIdCache;

      if (reflectionId) {
        const { error } = await supabase
          .from('article_reflections')
          .update({ reflection_text: text })
          .eq('id', reflectionId)
          .eq('user_id', uid);
        if (error) {
          setStatus(status, 'err', error.message);
          status?.classList.remove('hidden');
          return;
        }
        setStatus(status, 'ok', 'Saved.');
      } else {
        const { data: inserted, error } = await supabase
          .from('article_reflections')
          .insert({ user_id: uid, article_id: aid, reflection_text: text })
          .select('id')
          .maybeSingle();

        if (error?.code === '23505') {
          await loadReflection(uid, aid);
          setStatus(status, 'ok', 'Saved.');
          status?.classList.remove('hidden');
          return;
        }

        if (error) {
          setStatus(status, 'err', error.message);
          status?.classList.remove('hidden');
          return;
        }

        if (inserted?.id) reflectionId = inserted.id;
        show(btnDel, true);
        void logReflectionCreated(uid, aid, slug);
        setStatus(status, 'ok', 'Saved.');
      }
      status?.classList.remove('hidden');
    })();
  });

  btnDel?.addEventListener('click', () => {
    void (async () => {
      if (!reflectionId) return;
      const ok = window.confirm('Remove this private reflection? This cannot be undone.');
      if (!ok) return;

      const supabase = getSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('article_reflections').delete().eq('id', reflectionId).eq('user_id', session.user.id);

      if (error) {
        setStatus(status, 'err', error.message);
        status?.classList.remove('hidden');
        return;
      }

      reflectionId = null;
      if (ta) ta.value = '';
      show(btnDel, false);
      setStatus(status, 'idle', 'Removed.');
      status?.classList.remove('hidden');
    })();
  });

  void mount();
}
