/**
 * Page scripts under Astro's <ClientRouter /> (soft navigation).
 *
 * The site swaps pages without a full reload so the Wellness Waves player keeps
 * playing. Bundled <script> modules then run only once per visit, not once per
 * page. `onPage(setup)` restores per-page behaviour:
 *
 * - `setup` runs now and after every soft navigation, at most once per page view;
 * - `when` limits it to pages it belongs to (default: always);
 * - the `signal` passed to `setup` aborts when the page is swapped out. Pass it to
 *   window/document listeners (`{ signal }`) and unsubscribe anything else with
 *   `signal.addEventListener('abort', …)`, so nothing piles up across pages.
 *
 * Listeners on elements inside the page need no cleanup: they go with the old DOM.
 */

type Setup = (signal: AbortSignal) => void | Promise<void>;

interface OnPageOptions {
  /** Run only when this returns true for the current page. */
  when?: () => boolean;
}

let view = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('astro:after-swap', () => {
    view += 1;
  });
}

export function onPage(setup: Setup, options: OnPageOptions = {}): void {
  if (typeof document === 'undefined') return;
  let ranFor = -1;
  let controller: AbortController | null = null;

  const run = () => {
    if (ranFor === view) return;
    ranFor = view;
    if (options.when && !options.when()) return;
    controller = new AbortController();
    try {
      const result = setup(controller.signal);
      if (result instanceof Promise) result.catch((err) => console.error('[onPage]', err));
    } catch (err) {
      console.error('[onPage]', err);
    }
  };

  document.addEventListener('astro:before-swap', () => {
    controller?.abort();
    controller = null;
  });
  document.addEventListener('astro:page-load', run);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}

/** `when` helper: the current path is `path` (trailing slash ignored), or starts with `path/` if `prefix`. */
export function atPath(path: string, prefix = false): () => boolean {
  const norm = (p: string) => p.replace(/\/+$/, '') || '/';
  return () => {
    const here = norm(window.location.pathname);
    const want = norm(path);
    return prefix ? here === want || here.startsWith(want + '/') : here === want;
  };
}

/** `when` helper: an element matching `selector` is on the page. */
export function has(selector: string): () => boolean {
  return () => document.querySelector(selector) !== null;
}

/**
 * Same-site redirect that replaces the history entry. Uses soft navigation, so a
 * playing Wellness Waves session keeps going; Astro falls back to a full load
 * on pages without <ClientRouter />.
 */
export async function softReplace(url: string): Promise<void> {
  const { navigate } = await import('astro:transitions/client');
  await navigate(url, { history: 'replace' });
}
