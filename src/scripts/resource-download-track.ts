import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';

/** Fire-and-forget insert when a signed-in member opens a file/link. */
export function bindResourceDownloadClick(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  el: HTMLElement | null,
): void {
  if (!el) return;
  el.addEventListener('click', () => {
    void supabase.from('resource_downloads').insert({
      user_id: userId,
      resource_id: resourceId,
    });
  });
}

/** Links rendered in SSR that include `data-resource-download-id`. */
export function initResourceDownloadTracking(): void {
  if (typeof document === 'undefined') return;
  if (!isSupabaseConfigured()) return;

  const nodes = document.querySelectorAll<HTMLElement>('[data-resource-download-id]');
  if (nodes.length === 0) return;

  const supabase = getSupabaseBrowser();

  void (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

    nodes.forEach((el) => {
      const raw = el.dataset.resourceDownloadId?.trim();
      if (!raw) return;
      bindResourceDownloadClick(supabase, uid, raw, el);
    });
  })();
}
