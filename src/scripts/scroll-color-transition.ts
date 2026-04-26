import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WFG_HOME_SCROLL_FIRST_BG, HOME_SCROLL_STOPS } from '@/lib/home-scroll-colors';

gsap.registerPlugin(ScrollTrigger);

export { WFG_HOME_SCROLL_FIRST_BG, HOME_SCROLL_STOPS } from '@/lib/home-scroll-colors';

/** @deprecated Use `HOME_SCROLL_STOPS` */
export const MARKETING_PAGE_SCROLL_STOPS = HOME_SCROLL_STOPS;

/** Bridge into primary navy (home CTA only; section mode). */
const CTA_MID_N = '#1a2f3d';

const scrollRange = {
  start: 'top bottom' as const,
  end: 'top 38%' as const,
  scrub: 0.22,
  invalidateOnRefresh: true,
};

/** Last segment: `end: top 38%` can be unreachable for the final on-page block; `max` ties progress to the real scroll end. */
const scrollRangeLast = {
  start: 'top bottom' as const,
  end: 'max' as const,
  scrub: 0.22,
  invalidateOnRefresh: true,
};

function initDocumentColorStops(stops: readonly string[]): void {
  if (stops.length < 2) return;
  gsap.set(document.body, { backgroundColor: stops[0], backgroundImage: 'none' });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'max',
      scrub: 0.22,
      invalidateOnRefresh: true,
    },
  });
  for (let i = 1; i < stops.length; i += 1) {
    tl.to(document.body, { backgroundColor: stops[i]!, ease: 'none', duration: 1 });
  }
}

/**
 * - **Two or more** `[data-bg]` sections: scrub between consecutive stops (home).
 * - **Otherwise:** scrub through `HOME_SCROLL_STOPS` over the full page height.
 */
export function scrollColorTransition(): void {
  if (typeof document === 'undefined') return;
  if (!document.body.classList.contains('wfg-home-body')) return;

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-bg]'));

  if (reduced) {
    const firstStop =
      document.querySelector<HTMLElement>('[data-bg]')?.getAttribute('data-bg') ?? WFG_HOME_SCROLL_FIRST_BG;
    gsap.set(document.body, { backgroundColor: firstStop, backgroundImage: 'none' });
    return;
  }

  if (sections.length < 2) {
    initDocumentColorStops(HOME_SCROLL_STOPS);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    return;
  }

  const firstBg = sections[0]?.getAttribute('data-bg') ?? WFG_HOME_SCROLL_FIRST_BG;

  /**
   * Several `fromTo` + ScrollTrigger tweens on `document.body` can leave a lower
   * section’s “from” colour applied at progress 0 on first paint. Lock the
   * actual first `[data-bg]` and re-apply it after every refresh when still at
   * the top of the page.
   */
  const applyTopScrollStop = () => {
    if (window.scrollY > 1) return;
    gsap.set(document.body, { backgroundColor: firstBg, backgroundImage: 'none' });
  };
  applyTopScrollStop();
  ScrollTrigger.addEventListener('refresh', applyTopScrollStop);

  const lastIdx = sections.length - 1;

  for (let i = 1; i < sections.length; i += 1) {
    const el = sections[i];
    const from = sections[i - 1]?.getAttribute('data-bg');
    const to = el?.getAttribute('data-bg');
    if (from == null || to == null) continue;

    /** Two-step bridge to navy (was the bottom `wfg-home-cta` band; only when that section exists). */
    const isFinalCta = i === lastIdx && to.toLowerCase() === '#0a2334';

    if (isFinalCta) {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            ...scrollRangeLast,
          },
        })
        .fromTo(
          document.body,
          { backgroundColor: from },
          { backgroundColor: CTA_MID_N, ease: 'none', duration: 1, immediateRender: false },
        )
        .to(document.body, { backgroundColor: to, ease: 'none', duration: 1 });
      continue;
    }

    const stRange = i === lastIdx ? scrollRangeLast : scrollRange;

    gsap.fromTo(
      document.body,
      { backgroundColor: from },
      {
        backgroundColor: to,
        ease: 'none',
        immediateRender: false,
        overwrite: 'auto',
        scrollTrigger: {
          trigger: el,
          ...stRange,
        },
      },
    );
  }

  requestAnimationFrame(() => {
    applyTopScrollStop();
    ScrollTrigger.refresh();
    requestAnimationFrame(applyTopScrollStop);
  });
  window.addEventListener(
    'load',
    () => {
      applyTopScrollStop();
      ScrollTrigger.refresh();
    },
    { once: true },
  );
}
