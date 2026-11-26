/**
 * Tide — small native-app behaviours.
 */

import { useRef } from 'react';

/** A light tick on supporting devices (Android); silently ignored elsewhere. */
export function haptic(ms = 8): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // unsupported
  }
}

/**
 * Swipe a bottom sheet down to close it. Starts only when the sheet is
 * scrolled to the top, so normal scrolling inside it still works.
 */
export function useSwipeDown(onClose: () => void) {
  const start = useRef<number | null>(null);
  const dy = useRef(0);

  const reset = (el: HTMLElement) => {
    el.style.transition = 'transform 280ms cubic-bezier(.22,1,.36,1)';
    el.style.transform = '';
  };

  return {
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      if (window.innerWidth >= 760 || e.currentTarget.scrollTop > 0) return;
      start.current = e.touches[0].clientY;
      dy.current = 0;
      e.currentTarget.style.transition = 'none';
    },
    onTouchMove: (e: React.TouchEvent<HTMLElement>) => {
      if (start.current === null) return;
      dy.current = Math.max(0, e.touches[0].clientY - start.current);
      e.currentTarget.style.transform = `translateY(${dy.current}px)`;
    },
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
      if (start.current === null) return;
      start.current = null;
      if (dy.current > 90) {
        haptic();
        onClose();
      } else reset(e.currentTarget);
    },
  };
}
