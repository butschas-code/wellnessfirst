/**
 * Subtle Y translation on [data-wfg-parallax] for depth (home only).
 * Respects reduced motion. Paired with --wfg-p-y in CSS.
 */
export function initHomeParallax(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layers = document.querySelectorAll<HTMLElement>('[data-wfg-parallax]');
  if (layers.length === 0) return;

  let ticking = false;
  const update = () => {
    for (const el of layers) {
      const speed = parseFloat(el.getAttribute('data-wfg-parallax') || '0.1');
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const n = (center - vh * 0.5) / vh;
      const offset = n * 28 * speed;
      el.style.setProperty('--wfg-p-y', `${-offset.toFixed(2)}px`);
    }
    ticking = false;
  };

  const onFrame = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }
  };

  update();
  window.addEventListener('scroll', onFrame, { passive: true });
  window.addEventListener('resize', onFrame, { passive: true });
}
