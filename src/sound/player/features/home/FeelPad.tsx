/**
 * Tide — Feel. The ring becomes a touch surface: drag the light.
 * Left ↔ right: warm ↔ bright. Down ↔ up: calm ↔ lively.
 * One position sets every quality the old Shape and My Sound sliders did.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../sessions/playerContext';
import { Storage } from '../../../engine/lib/storage';

interface XY {
  x: number;
  y: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Keep the point inside the circle. */
const inCircle = ({ x, y }: XY): XY => {
  const d = Math.hypot(x, y);
  return d > 1 ? { x: x / d, y: y / d } : { x, y };
};

export const loadFeel = (): XY => Storage.get<XY>('feel_xy', { x: 0, y: 0 });

export const FeelPad: React.FC = () => {
  const { updateSoundDna, updateShapeParams } = usePlayer();
  const [xy, setXy] = useState<XY>(loadFeel);
  const surface = useRef<HTMLDivElement>(null);
  const pending = useRef<XY | null>(null);
  const timer = useRef<number | null>(null);

  const apply = useCallback(
    (p: XY) => {
      // Full range on both axes: every move should be clearly heard.
      updateSoundDna({
        warmth: clamp(0.5 - 0.5 * p.x),
        brightness: clamp(0.5 + 0.5 * p.x),
        movement: clamp(0.5 + 0.5 * p.y),
        density: clamp(0.5 + 0.45 * p.y),
        musicality: clamp(0.55 + 0.4 * p.y),
        rhythm: clamp(0.9 * p.y),
        spatiality: clamp(0.65 - 0.3 * p.y),
      });
      updateShapeParams({ energy: clamp(0.5 + 0.5 * p.y), space: clamp(0.6 - 0.3 * p.y) });
      Storage.set('feel_xy', p);
    },
    [updateSoundDna, updateShapeParams]
  );

  // Throttle engine updates; the music glides between them anyway.
  const schedule = useCallback(
    (p: XY) => {
      pending.current = p;
      if (timer.current !== null) return;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (pending.current) apply(pending.current);
      }, 140);
    },
    [apply]
  );

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const fromPointer = (e: React.PointerEvent) => {
    const r = surface.current!.getBoundingClientRect();
    const p = inCircle({
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -(((e.clientY - r.top) / r.height) * 2 - 1),
    });
    setXy(p);
    schedule(p);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = 0.1;
    const d: Record<string, XY> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    if (!d[e.key]) return;
    e.preventDefault();
    const p = inCircle({ x: xy.x + d[e.key].x, y: xy.y + d[e.key].y });
    setXy(p);
    schedule(p);
  };

  return (
    <div className="feel">
      <div
        ref={surface}
        className="feel__surface"
        role="application"
        tabIndex={0}
        aria-label="Feel. Arrow left warmer, right brighter, up livelier, down calmer."
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') fromPointer(e);
        }}
        onKeyDown={onKey}
      >
        <span
          className="feel__dot"
          style={{ left: `${50 + xy.x * 42}%`, top: `${50 - xy.y * 42}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="feel__label feel__label--t">Lively</span>
      <span className="feel__label feel__label--b">Calm</span>
      <span className="feel__label feel__label--l">Warm</span>
      <span className="feel__label feel__label--r">Bright</span>
    </div>
  );
};
