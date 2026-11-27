/**
 * For you — personal programs as their own category in the Programs sheet.
 *
 *   Today        morning / midday / evening, the current slot marked "Now"
 *   This chapter the stretch of time the member is in
 *   Strengths    builds on what the chart shows as natural
 *   Challenges   gentle support where the chart shows less backing
 *   Saved        frozen copies, replayed exactly
 *
 * Tapping a program plays it under whatever soundscape is playing (or starts
 * its suggested soundscape). It keeps playing across soundscapes until the
 * member picks something else. Each program has a plain-words "why".
 * Without birth details there is a quiet invitation, never a gate.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, ChevronDown } from 'lucide-react';
import { personalPrograms, saveProgram, type PersonalProgram, type PersonalResult, type PersonalSet } from '../../host';
import { SLOT_LABEL, currentSlot, personalTechniqueId } from './personal';
import '../../styles/personal.css';

type Loaded = Partial<Record<PersonalSet, PersonalResult>>;

const SECTIONS: Array<{ set: PersonalSet; title: string; hint: string }> = [
  { set: 'today', title: 'Today', hint: 'Three programs for your day. Pick the one that fits; it plays until you change it.' },
  { set: 'chapter', title: 'This chapter', hint: 'For the stretch of time you are in now.' },
  { set: 'strengths', title: 'Your strengths', hint: 'Builds on what comes naturally to you.' },
  { set: 'challenges', title: 'Gentle support', hint: 'More room where your chart shows less backing.' },
  { set: 'saved', title: 'Saved', hint: 'Your saved programs, exactly as they were.' },
];

/** What a free account adds, said plainly to anyone signed out. */
const AccountPerks: React.FC = () => (
  <div className="fy-perks">
    <p className="fy-perks__title">With a free account</p>
    <ul>
      <li>Your programs follow you to every device.</li>
      <li>Save the ones you like. They play exactly the same later.</li>
      <li>Find your saved programs and Life Rhythm in your Wellness Space.</li>
    </ul>
    <p className="fy-perks__actions">
      <a className="chip fy-cta" href="/signup">
        Create a free account
      </a>
      <a href="/login">Sign in</a>
    </p>
  </div>
);

interface RowProps {
  p: PersonalProgram;
  on: boolean;
  now: boolean;
  canSave: boolean;
  onPlay: (p: PersonalProgram) => void;
  onSave: (p: PersonalProgram) => void;
}

const Row: React.FC<RowProps> = ({ p, on, now, canSave, onPlay, onSave }) => {
  const [why, setWhy] = useState(false);
  return (
    <div className={`fy-row${on ? ' is-on' : ''}`}>
      <button type="button" className="option technique" role="radio" aria-checked={on} onClick={() => onPlay(p)}>
        <span>
          <span className="technique__name">
            {p.slot && <span className={`fy-slot${now ? ' is-now' : ''}`}>{now ? `${SLOT_LABEL[p.slot]} · now` : SLOT_LABEL[p.slot]}</span>}
            {p.name}
          </span>
          <small>{p.description.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')}</small>
        </span>
        {on && <Check size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <div className="fy-row__tools">
        <button type="button" className="fy-link" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
          Why this <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" style={{ transform: why ? 'rotate(180deg)' : undefined }} />
        </button>
        {canSave && p.id && (
          <button type="button" className="fy-link" aria-pressed={p.saved} onClick={() => onSave(p)}>
            {p.saved ? <BookmarkCheck size={14} strokeWidth={1.5} aria-hidden="true" /> : <Bookmark size={14} strokeWidth={1.5} aria-hidden="true" />}
            {p.saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
      {why && <p className="fy-why">{p.description}</p>}
    </div>
  );
};

export const ForYou: React.FC<{
  activeId: string | null;
  onPlay: (p: PersonalProgram) => void;
}> = ({ activeId, onPlay }) => {
  const [loaded, setLoaded] = useState<Loaded>({});
  const slot = currentSlot();

  useEffect(() => {
    let alive = true;
    for (const { set } of SECTIONS) {
      void personalPrograms(set).then((r) => alive && setLoaded((l) => ({ ...l, [set]: r })));
    }
    return () => {
      alive = false;
    };
  }, []);

  const toggleSave = useCallback(async (p: PersonalProgram) => {
    if (!p.id) return;
    const next = await saveProgram(p.id, !p.saved);
    setLoaded((l) => {
      const out: Loaded = {};
      for (const [k, r] of Object.entries(l) as Array<[PersonalSet, PersonalResult]>) {
        out[k] = r.status === 'ok' ? { ...r, programs: r.programs.map((x) => (x.id === p.id ? { ...x, saved: next } : x)) } : r;
      }
      // A newly saved program appears under Saved at once.
      const saved = out.saved;
      if (saved?.status === 'ok') {
        const has = saved.programs.some((x) => x.id === p.id);
        if (next && !has) out.saved = { ...saved, programs: [{ ...p, saved: true }, ...saved.programs] };
        if (!next && has) out.saved = { ...saved, programs: saved.programs.filter((x) => x.id !== p.id) };
      }
      return out;
    });
  }, []);

  const today = loaded.today;
  if (!today) return <p className="muted fy-note">Putting your programs together…</p>;
  if (today.status === 'no-profile') {
    return (
      <section className="pick-group fy-invite">
        <h3>Made for you</h3>
        <p>
          Add your birth details in Life Rhythm and you get frequency programs put together from your chart: three for each day, and some for your
          strengths and challenges.
        </p>
        <a className="chip fy-cta" href="/liferhythm#lr-intake">
          Add birth details
        </a>
        {!today.signedIn && <AccountPerks />}
      </section>
    );
  }
  if (today.status !== 'ok') {
    return <p className="muted fy-note">{('message' in today && today.message) || 'Your programs are not available just now.'}</p>;
  }

  return (
    <>
      <div className="fy-head">
        {!today.canSave && (
          <p className="fy-note">
            {today.signedIn ? (
              <>Made from the birth details in this browser. <a href="/liferhythm#lr-intake">Save them to your account</a> to keep programs.</>
            ) : (
              <>Made from the birth details in this browser.</>
            )}
          </p>
        )}
        {!today.signedIn && <AccountPerks />}
      </div>

      {SECTIONS.map(({ set, title, hint }) => {
        const r = loaded[set];
        if (!r || r.status !== 'ok' || !r.programs.length) return null;
        const canSave = r.canSave && set !== 'saved' ? true : set === 'saved';
        return (
          <section key={set} className="pick-group">
            <h3>{title}</h3>
            <p className="pick-group__hint">{hint}</p>
            <div className="options" role="radiogroup" aria-label={title}>
              {r.programs.map((p) => (
                <Row
                  key={p.id ?? p.contentHash}
                  p={p}
                  on={activeId === personalTechniqueId(p)}
                  now={set === 'today' && p.slot === slot}
                  canSave={canSave}
                  onPlay={onPlay}
                  onSave={(x) => void toggleSave(x)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};
