/**
 * Tide — "About this sound". From the playing title on home, and the (i) in the player.
 * What it is for and when to use it; never music theory, never a promise.
 */

import React from 'react';
import { X } from 'lucide-react';
import type { Intent } from '../../../engine/types/index';
import { SPACES } from '../../ui/catalogue';
import { SPACE_EXPLANATIONS } from '../../content/explanations';
import { TECHNIQUE_NOTE } from '../../../engine/domain/wellness/techniques';
import { useSwipeDown } from '../../ui/mobile';
import { useWellness } from '../wellness/wellness';
import { usePlayer } from '../../sessions/playerContext';
import { PLAYER_NAME } from '../../brand';
import { PERSONAL_HOW, isPersonalTechnique } from '../personal/personal';

export const SpaceInfoSheet: React.FC<{ space: Intent | null; onClose: () => void }> = ({ space, onClose }) => {
  const swipe = useSwipeDown(onClose);
  const wellness = useWellness(1000);
  const { currentRecipe } = usePlayer();
  const e = space ? SPACE_EXPLANATIONS[space] : null;
  const t = wellness.technique;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet about" role="dialog" aria-modal="true" aria-label={e ? `About ${e.title}` : 'About the spaces'} {...swipe}>
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          <span className="about__eyebrow">{e ? e.title : PLAYER_NAME}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {e ? (
          <>
            <h2 className="about__title">{currentRecipe && currentRecipe.intent === space ? currentRecipe.title : e.title}</h2>
            <p className="about__lead">{e.lead}</p>

            <ul className="about__chips" aria-label="Good for">
              {e.goodFor.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>

            {t && (
              <section className="about__card">
                <p className="about__card-kicker">Woven in</p>
                <h3>
                  {t.name} <em>{t.tag}</em>
                </h3>
                <p className="about__benefit">{t.benefit}</p>
                <p>{t.what}</p>
                <p className="about__fine">{t.background}</p>
                {isPersonalTechnique(t.id) && <p className="about__fine">{PERSONAL_HOW}</p>}
              </section>
            )}

            <p className="about__body">{e.sound}</p>
            <p className="about__tip">{e.tip}</p>
            <p className="about__fine">{t ? `${e.note} ${TECHNIQUE_NOTE}` : e.note}</p>
          </>
        ) : (
          <>
            <h2 className="about__title">{SPACES.length} spaces</h2>
            <div className="about__spaces">
              {SPACES.map((s) => (
                <div key={s.intent}>
                  <h3>{s.name}</h3>
                  <p>{SPACE_EXPLANATIONS[s.intent].lead}</p>
                </div>
              ))}
            </div>
            <p className="about__fine">Music for your surroundings, not a treatment. Experiences vary from person to person.</p>
          </>
        )}
      </aside>
    </>
  );
};
