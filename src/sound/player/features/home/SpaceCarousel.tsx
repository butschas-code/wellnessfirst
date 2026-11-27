/**
 * The spaces. On touch screens: a swipeable carousel, where the centred word is
 * the space; swiping previews its light, and (while something plays) switches to
 * it once the swipe settles. Tap a neighbour to bring it to the centre.
 * On desktop (mouse, wide screen): every space in one row with previous/next
 * arrows, and the arrow keys step through them from anywhere on the page.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SPACES } from '../../ui/catalogue';
import type { Intent } from '../../../engine/types/index';
import { haptic } from '../../ui/mobile';

const ITEM = 150;
const GAP = 4;

const DESKTOP = '(hover: hover) and (pointer: fine) and (min-width: 900px)';

function useDesktop(): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return on;
}

/** Arrow keys anywhere on the page, unless typing or a sheet/dialog is open. */
function useArrowKeys(step: (dir: 1 | -1) => void): void {
  const ref = useRef(step);
  ref.current = step;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable], [role="slider"], .sheet, .feel, [role="dialog"]')) return;
      if (document.querySelector('.ww .sheet, .ww [role="dialog"]')) return;
      e.preventDefault();
      ref.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export const SpaceCarousel: React.FC<{
  selected: Intent;
  onSelect: (intent: Intent) => void;
  onTapSelected: () => void;
}> = (props) => (useDesktop() ? <SpaceRow {...props} /> : <SpaceRail {...props} />);

const SpaceRow: React.FC<{
  selected: Intent;
  onSelect: (intent: Intent) => void;
  onTapSelected: () => void;
}> = ({ selected, onSelect, onTapSelected }) => {
  const index = Math.max(0, SPACES.findIndex((s) => s.intent === selected));
  const go = (i: number) => {
    const n = (i + SPACES.length) % SPACES.length;
    if (n !== index) onSelect(SPACES[n].intent);
  };
  useArrowKeys((dir) => go(index + dir));

  return (
    <div className="spaces spaces--row">
      <div className="spaces__bar">
        <button type="button" className="spaces__step" onClick={() => go(index - 1)} aria-label={`Previous space: ${SPACES[(index + SPACES.length - 1) % SPACES.length].name}`}>
          <ChevronLeft size={22} strokeWidth={1.25} aria-hidden="true" />
        </button>
        <div className="spaces__list" role="radiogroup" aria-label="Space">
          {SPACES.map((s, i) => (
            <button
              key={s.intent}
              type="button"
              role="radio"
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              className="spaces__word"
              onClick={() => (i === index ? onTapSelected() : go(i))}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button type="button" className="spaces__step" onClick={() => go(index + 1)} aria-label={`Next space: ${SPACES[(index + 1) % SPACES.length].name}`}>
          <ChevronRight size={22} strokeWidth={1.25} aria-hidden="true" />
        </button>
      </div>
      <p className="spaces__line" aria-live="polite">
        {SPACES[index].line}
        <span className="spaces__keys" aria-hidden="true">← → to change</span>
      </p>
    </div>
  );
};

const SpaceRail: React.FC<{
  selected: Intent;
  onSelect: (intent: Intent) => void;
  onTapSelected: () => void;
}> = ({ selected, onSelect, onTapSelected }) => {
  const rail = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);
  const index = Math.max(0, SPACES.findIndex((s) => s.intent === selected));
  const lastIndex = useRef(index);

  // Keep the rail centred on the selected space (also when it changes from elsewhere).
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const target = index * (ITEM + GAP);
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: lastIndex.current === index ? 'auto' : 'smooth' });
    lastIndex.current = index;
  }, [index]);

  const onScroll = () => {
    if (settle.current !== null) clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = rail.current;
      if (!el) return;
      const i = Math.max(0, Math.min(SPACES.length - 1, Math.round(el.scrollLeft / (ITEM + GAP))));
      if (i !== lastIndex.current) {
        lastIndex.current = i;
        haptic();
        onSelect(SPACES[i].intent);
      }
    }, 140);
  };

  const tap = (i: number) => {
    if (i === index) onTapSelected();
    else rail.current?.scrollTo({ left: i * (ITEM + GAP), behavior: 'smooth' });
  };

  return (
    <div className="spaces">
      <div
        ref={rail}
        className="spaces__rail"
        role="radiogroup"
        aria-label="Space"
        onScroll={onScroll}
        style={{ ['--item' as string]: `${ITEM}px`, ['--gap' as string]: `${GAP}px` }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            tap(Math.max(0, Math.min(SPACES.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1))));
          }
        }}
      >
        {SPACES.map((s, i) => (
          <button
            key={s.intent}
            type="button"
            role="radio"
            aria-checked={i === index}
            tabIndex={i === index ? 0 : -1}
            className="spaces__item"
            onClick={() => tap(i)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="spaces__line" aria-live="polite">
        {SPACES[index].line}
      </p>
      <div className="spaces__dots" aria-hidden="true">
        {SPACES.map((s, i) => (
          <span key={s.intent} className={i === index ? 'is-on' : ''} />
        ))}
      </div>
    </div>
  );
};
