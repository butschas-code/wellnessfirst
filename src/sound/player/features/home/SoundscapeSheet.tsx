/**
 * Soundscapes of one space. Tap one and it plays (the program carries over).
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import type { Intent } from '../../../engine/types/index';
import { SPACES, recipesFor } from '../../ui/catalogue';
import { useSwipeDown } from '../../ui/mobile';

export const SoundscapeSheet: React.FC<{
  space: Intent;
  currentId: string | null;
  onPick: (recipeId: string) => void;
  onClose: () => void;
}> = ({ space, currentId, onPick, onClose }) => {
  const swipe = useSwipeDown(onClose);
  const name = SPACES.find((s) => s.intent === space)?.name;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={`${name} soundscapes`} {...swipe}>
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          <h2>{name}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <section className="pick-group">
          <h3>Soundscapes</h3>
          <div className="options" role="radiogroup" aria-label="Soundscapes">
            {recipesFor(space).map((r) => (
              <button
                key={r.id}
                type="button"
                className="option technique"
                role="radio"
                aria-checked={r.id === currentId}
                onClick={() => {
                  onPick(r.id);
                  onClose();
                }}
              >
                <span>
                  <span className="technique__name">{r.title}</span>
                  <small>{r.shortDescription}</small>
                </span>
                {r.id === currentId && <Check size={18} strokeWidth={1.75} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
};
