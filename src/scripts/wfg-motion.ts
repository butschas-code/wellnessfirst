/**
 * Scroll reveals for [data-reveal] blocks. Adds .wfg-reveal-visible when in view.
 * Skips work when user prefers reduced motion.
 */
export function initWfgMotion(): void {
  const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (nodes.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const el of nodes) {
      el.classList.add('wfg-reveal-visible');
    }
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('wfg-reveal-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  for (const el of nodes) {
    io.observe(el);
  }
}
