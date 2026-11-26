/**
 * Tide — the spaces as a swipeable carousel. The centred word is the space;
 * swiping previews its light, and (while something plays) switches to it once
 * the swipe settles. Tap a neighbour to bring it to the centre.
 */

import React, { useEffect, useRef } from 'react';
import { SPACES } from '../../ui/catalogue';
import type { Intent } from '../../../engine/types/index';
import { haptic } from '../../ui/mobile';

const ITEM = 150;
const GAP = 4;

export const SpaceCarousel: React.FC<{
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
