/**
 * Programs — every program for every space, in one place.
 * Chips choose the space (the playing one first); three plain groups:
 *   Journeys  move through several frequency catalog frequencies, one each minute
 *   Steady    one rhythm the whole time (Schumann resonance and others)
 *   Breathe   the music rises and falls for you to breathe with
 * Tap a program and it plays; one from another space switches to that space.
 */

import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { usePlayer } from '../../sessions/playerContext';
import { FLAGSHIP_BY_INTENT, SPACES, flagshipForNow, recipesFor } from '../../ui/catalogue';
import type { Intent } from '../../../engine/types/index';
import { TECHNIQUE_NOTE, type Technique, breathingFor, singlesFor } from '../../../engine/domain/wellness/techniques';
import { choosePersonal, chooseTechnique, pinPersonal, pinnedPersonal, programsFor, turnWellnessOff, useWellness } from '../wellness/wellness';
import { useSwipeDown } from '../../ui/mobile';
import { ForYou } from '../personal/ForYou';
import { techniqueForProgram } from '../personal/personal';
import type { PersonalProgram } from '../../host';

/** "For you" sits next to the spaces as its own category. */
type Tab = Intent | 'you';

const GROUPS = {
  journeys: { title: 'Journeys', hint: 'Move through several frequencies, one each minute' },
  steady: { title: 'Steady', hint: 'One rhythm the whole time' },
  breathe: { title: 'Breathe', hint: 'The music rises and falls, breathe along' },
};

const Row: React.FC<{ t: Technique; on: boolean; onPick: () => void }> = ({ t, on, onPick }) => (
  <button type="button" className="option technique" role="radio" aria-checked={on} onClick={onPick}>
    <span>
      <span className="technique__name">
        {t.name}
        {t.kind !== 'breath' && !t.programId && <em>{t.tag}</em>}
      </span>
      <small>{t.benefit}</small>
    </span>
    {on && <Check size={18} strokeWidth={1.75} aria-hidden="true" />}
  </button>
);

const ProgramSheet: React.FC<{ onClose: () => void; space?: Intent }> = ({ onClose, space: initialSpace }) => {
  const swipe = useSwipeDown(onClose);
  const { status: playStatus, currentRecipe, playRecipe } = usePlayer();
  const wellness = useWellness(500);
  const live = !!currentRecipe && (playStatus === 'playing' || playStatus === 'paused' || playStatus === 'loading');
  const playingSpace = live ? currentRecipe!.intent : null;
  const personalOn = !!pinnedPersonal() && (!live || wellness.technique?.id === pinnedPersonal()?.id);
  const [tab, setTab] = useState<Tab>(personalOn ? 'you' : initialSpace ?? playingSpace ?? currentRecipe?.intent ?? flagshipForNow().intent);
  const space: Intent = tab === 'you' ? playingSpace ?? currentRecipe?.intent ?? flagshipForNow().intent : tab;
  const setSpace = (s: Intent) => setTab(s);
  const [journeys, setJourneys] = useState<Technique[]>([]);

  useEffect(() => {
    if (tab === 'you') return;
    let alive = true;
    void programsFor(space).then((p) => alive && setJourneys(p));
    return () => {
      alive = false;
    };
  }, [space, tab]);

  // A personal program plays under whatever soundscape is on, or starts its suggested one.
  const playPersonal = async (p: PersonalProgram) => {
    const t = await techniqueForProgram(p);
    if (!t) return;
    if (live) choosePersonal(t);
    else {
      pinPersonal(t);
      await playRecipe(p.recipeId);
    }
    onClose();
  };

  const pick = async (t: Technique) => {
    let recipe = live && playingSpace === space ? currentRecipe! : null;
    if (!recipe) {
      await playRecipe(FLAGSHIP_BY_INTENT[space]);
      recipe = recipesFor(space).find((r) => r.id === FLAGSHIP_BY_INTENT[space]) ?? recipesFor(space)[0];
    }
    await chooseTechnique(recipe, t);
    onClose();
  };

  const off = () => {
    turnWellnessOff();
    onClose();
  };

  const isOn = (t: Technique) => live && playingSpace === space && wellness.technique?.id === t.id;

  const group = (key: keyof typeof GROUPS, list: Technique[]) =>
    list.length > 0 && (
      <section className="pick-group">
        <h3>{GROUPS[key].title}</h3>
        <p className="pick-group__hint">{GROUPS[key].hint}</p>
        <div className="options" role="radiogroup" aria-label={GROUPS[key].title}>
          {list.map((t) => (
            <Row key={t.id} t={t} on={isOn(t)} onPick={() => void pick(t)} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet programs" role="dialog" aria-modal="true" aria-label="Programs" {...swipe}>
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          <h2>Programs</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-chips" role="tablist" aria-label="Space">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'you'}
            className={`chip chip--you${personalOn && live ? ' is-playing' : ''}`}
            onClick={() => setTab('you')}
          >
            For you
          </button>
          {SPACES.map((s) => (
            <button
              key={s.intent}
              type="button"
              role="tab"
              aria-selected={tab === s.intent}
              className={`chip${s.intent === playingSpace ? ' is-playing' : ''}`}
              onClick={() => setSpace(s.intent)}
            >
              {s.name}
            </button>
          ))}
        </div>

        {tab === 'you' ? (
          <ForYou activeId={live ? wellness.technique?.id ?? null : pinnedPersonal()?.id ?? null} onPlay={(p) => void playPersonal(p)} />
        ) : (
          <>
            {group('journeys', journeys)}
            {group('steady', singlesFor(space))}
            {group('breathe', breathingFor(space))}
          </>
        )}

        {(tab === 'you' ? live : playingSpace === space || !live) && (
          <section className="pick-group">
            <div className="options">
              <button type="button" className="option" role="radio" aria-checked={live && !wellness.technique} onClick={off}>
                <span>
                  Just music
                  <small>No program, only the soundscape.</small>
                </span>
                {live && !wellness.technique && <Check size={18} strokeWidth={1.75} aria-hidden="true" />}
              </button>
            </div>
          </section>
        )}

        <p className="muted" style={{ fontSize: '0.78rem', marginTop: 24 }}>
          {TECHNIQUE_NOTE}
        </p>
      </aside>
    </>
  );
};

export default ProgramSheet;
