import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/browser';
import { isEmailAllowedForCms, getCmsAllowlistFromEnv } from '@/lib/cms/env';

let ran = false;

/**
 * Toggles gate panels: #cms-gate, #cms-gate-denied, #cms-gate-allowed. Run once per page.
 */
export function initCmsAuthGate(): void {
  if (typeof document === 'undefined' || ran) return;
  ran = true;

  const elLoading = document.getElementById('cms-gate');
  const elDenied = document.getElementById('cms-gate-denied');
  const elOk = document.getElementById('cms-gate-allowed');

  if (!elLoading) return;

  if (!isSupabaseConfigured()) {
    elLoading.classList.add('hidden');
    elDenied?.classList.remove('hidden');
    return;
  }

  const supabase = getSupabaseBrowser();
  void (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const allowlist = getCmsAllowlistFromEnv();
    elLoading.classList.add('hidden');

    if (!session?.user?.email) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
      return;
    }

    if (!isEmailAllowedForCms(session.user.email, allowlist)) {
      elDenied?.classList.remove('hidden');
      return;
    }

    elOk?.classList.remove('hidden');
  })();
}
