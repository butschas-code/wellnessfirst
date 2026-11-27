/**
 * Home, "For you" selected: today's three personal programs right under the
 * carousel. One tap plays one; the one for this time of day is marked "now".
 * Without birth details it shows a single way to add them.
 */
import React from 'react';
import type { PersonalProgram, PersonalResult } from '../../host';
import { SLOT_LABEL, currentSlot, personalTechniqueId } from './personal';
import '../../styles/personal.css';

export const TodayStrip: React.FC<{
  /** Today's programs, loaded by the home (null while loading). */
  today: PersonalResult | null;
  activeId: string | null;
  onPlay: (p: PersonalProgram) => void;
}> = ({ today, activeId, onPlay }) => {
  const slot = currentSlot();

  if (!today) return <div className="today-strip today-strip--loading" aria-hidden="true" />;
  if (today.status === 'no-profile' || today.status === 'signed-out') {
    return (
      <div className="today-strip today-strip--invite">
        <a className="today-strip__cta" href="/liferhythm#lr-intake">
          Add your birth details to get your programs
        </a>
      </div>
    );
  }
  if (today.status !== 'ok' || !today.programs.length) return null;

  return (
    <div className="today-strip" role="radiogroup" aria-label="Today's programs">
      {today.programs.map((p) => {
        const on = activeId === personalTechniqueId(p);
        const now = p.slot === slot;
        return (
          <button
            key={p.id ?? p.contentHash}
            type="button"
            role="radio"
            aria-checked={on}
            className={`today-strip__item${on ? ' is-on' : ''}${now ? ' is-now' : ''}`}
            onClick={() => onPlay(p)}
          >
            <span className="today-strip__slot">
              {p.slot ? SLOT_LABEL[p.slot] : 'Today'}
              {now && <em> · now</em>}
            </span>
            <span className="today-strip__name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
};

/** The program of today that fits this time of day. */
export function nowProgram(r: PersonalResult | null): PersonalProgram | null {
  if (!r || r.status !== 'ok') return null;
  const slot = currentSlot();
  return r.programs.find((p) => p.slot === slot) ?? r.programs[0] ?? null;
}
