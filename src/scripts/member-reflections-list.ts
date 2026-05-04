import { guardSessionOrRedirect } from '@/lib/app/guardSession';
import { formatDate } from '@/lib/format';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

type ArticleJoin = {
  slug: string;
  title: string;
  published: boolean | null;
};

type ReflectionRow = {
  id: string;
  reflection_text: string;
  updated_at: string;
  articles: ArticleJoin | ArticleJoin[] | null;
};

function normalizeArticle(joined: ReflectionRow['articles']): ArticleJoin | null {
  if (!joined) return null;
  return Array.isArray(joined) ? joined[0] ?? null : joined;
}

function renderEmpty(): string {
  return `<div class="max-w-lg border-l-[3px] border-secondary/35 pl-5 sm:pl-6">
    <p class="text-sm leading-relaxed text-ink-600">Your private notes and reflections will appear here.</p>
    <a class="mt-4 inline-flex text-sm font-medium text-secondary underline decoration-line underline-offset-4" href="/articles">Browse articles</a>
  </div>`;
}

function renderRow(r: ReflectionRow): string {
  const a = normalizeArticle(r.articles)!;
  const when = formatDate(new Date(r.updated_at));
  const safeBody = esc(r.reflection_text);
  return `<li data-ref-row data-ref-id="${esc(r.id)}" class="py-10 first:pt-0">
    <div data-ref-view>
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <a class="font-display text-xl text-secondary underline decoration-line underline-offset-4" href="/articles/${esc(a.slug)}">${esc(a.title)}</a>
        <time class="text-xs uppercase tracking-wider text-ink-400" datetime="${esc(r.updated_at)}">${esc(when)}</time>
      </div>
      <p data-ref-body class="mt-5 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-700">${safeBody}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" data-ref-edit-btn class="btn-secondary text-sm">Edit</button>
        <button type="button" data-ref-delete-btn class="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-50">Delete</button>
      </div>
    </div>
    <div data-ref-editor class="mt-6 hidden rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
      <label class="sr-only">Edit reflection</label>
      <textarea data-ref-textarea rows="7" maxlength="12000" class="w-full resize-y rounded-lg border border-ink/12 px-3 py-2 text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-400 focus:border-secondary/35 focus:outline-none focus:ring-2 focus:ring-secondary/15">${safeBody}</textarea>
      <div class="mt-3 flex flex-wrap gap-3">
        <button type="button" data-ref-save-btn class="btn-primary text-sm">Save</button>
        <button type="button" data-ref-cancel-btn class="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  </li>`;
}

export async function initMemberReflectionsList(): Promise<void> {
  const state = document.getElementById('w-ref-state');
  const skel = document.getElementById('w-ref-skel');
  const panel = document.getElementById('w-ref-panel');
  const mountEl = document.getElementById('w-ref-mount');
  if (!(mountEl instanceof HTMLElement)) return;

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

  async function loadRows(): Promise<ReflectionRow[]> {
    const { data, error } = await supabase
      .from('article_reflections')
      .select('id, reflection_text, updated_at, articles ( slug, title, published )')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(80);

    if (error) throw error;

    const raw = (data ?? []) as unknown as ReflectionRow[];
    return raw.filter((r) => {
      const art = normalizeArticle(r.articles);
      return Boolean(art && art.published === true);
    });
  }

  function renderMount(rows: ReflectionRow[], root: HTMLElement): void {
    if (rows.length === 0) {
      root.innerHTML = renderEmpty();
      return;
    }
    root.innerHTML = `<ul class="max-w-2xl" role="list">${rows.map(renderRow).join('')}</ul>`;
  }

  let delegated = false;
  function bindDelegation(root: HTMLElement): void {
    if (delegated) return;
    delegated = true;

    root.addEventListener('click', (ev) => {
      const t = ev.target as HTMLElement | null;
      if (!t) return;

      const editBtn = t.closest<HTMLElement>('[data-ref-edit-btn]');
      const delBtn = t.closest<HTMLElement>('[data-ref-delete-btn]');
      const saveBtn = t.closest<HTMLElement>('[data-ref-save-btn]');
      const cancelBtn = t.closest<HTMLElement>('[data-ref-cancel-btn]');

      const row = t.closest<HTMLElement>('[data-ref-row]');
      if (!row) return;

      const view = row.querySelector<HTMLElement>('[data-ref-view]');
      const editor = row.querySelector<HTMLElement>('[data-ref-editor]');
      const textarea = row.querySelector<HTMLTextAreaElement>('[data-ref-textarea]');
      const bodyEl = row.querySelector<HTMLElement>('[data-ref-body]');

      if (editBtn && view && editor) {
        row.dataset.originalReflection = textarea?.value ?? '';
        view.classList.add('hidden');
        editor.classList.remove('hidden');
        textarea?.focus();
        return;
      }

      if (cancelBtn && view && editor && textarea) {
        textarea.value = row.dataset.originalReflection ?? textarea.value;
        editor.classList.add('hidden');
        view.classList.remove('hidden');
        return;
      }

      if (saveBtn && view && editor && textarea && bodyEl) {
        void (async () => {
          const text = textarea.value.trim();
          if (!text) return;

          const id = row.getAttribute('data-ref-id');
          if (!id) return;

          const { error } = await supabase
            .from('article_reflections')
            .update({ reflection_text: text })
            .eq('id', id)
            .eq('user_id', uid);

          if (error) {
            window.alert(error.message);
            return;
          }

          bodyEl.textContent = text;
          editor.classList.add('hidden');
          view.classList.remove('hidden');
          delete row.dataset.originalReflection;
          const timeEl = row.querySelector('time');
          const nowIso = new Date().toISOString();
          if (timeEl) {
            timeEl.dateTime = nowIso;
            timeEl.textContent = formatDate(new Date(nowIso));
          }
        })();
        return;
      }

      if (delBtn) {
        void (async () => {
          const ok = window.confirm('Remove this reflection permanently?');
          if (!ok) return;

          const id = row.getAttribute('data-ref-id');
          if (!id) return;

          const { error } = await supabase.from('article_reflections').delete().eq('id', id).eq('user_id', uid);

          if (error) {
            window.alert(error.message);
            return;
          }

          row.remove();
          const list = root.querySelector('ul');
          if (list && list.querySelectorAll('[data-ref-row]').length === 0) {
            root.innerHTML = renderEmpty();
          }
        })();
      }
    });
  }

  try {
    const rows = await loadRows();
    skel?.classList.add('hidden');
    panel?.classList.remove('hidden');
    renderMount(rows, mountEl);
    bindDelegation(mountEl);
  } catch (e) {
    skel?.classList.add('hidden');
    panel?.classList.remove('hidden');
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    mountEl.innerHTML = `<p class="text-sm text-red-800">${esc(msg)}</p>`;
  }
}
