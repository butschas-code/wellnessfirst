/**
 * Tide — release primitives.
 * A release is shown as a line in an index, marked by a small ring of its
 * space's light. The ring breathes when that release is playing.
 */

import React from 'react';
import { Pause, Play } from 'lucide-react';
import type { SoundscapeRecipe } from '../../engine/types/index';
import { glowHex } from './stage/palette';
import { previewDepth } from './stage/stage';
import { catalogueNumber, linerNotes, spaceName } from './catalogue';

export const RingGlyph: React.FC<{ recipe?: Pick<SoundscapeRecipe, 'intent'>; live?: boolean; small?: boolean; className?: string }> = ({
  recipe,
  live = false,
  small = false,
  className = '',
}) => (
  <span
    className={`ring-glyph${small ? ' ring-glyph--sm' : ''}${live ? ' is-live' : ''} ${className}`}
    style={recipe ? { ['--g' as string]: glowHex(recipe.intent) } : undefined}
    aria-hidden="true"
  />
);

interface ReleaseRowProps {
  recipe: SoundscapeRecipe;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  /** Show the one-line description. */
  rich?: boolean;
  /** Show the space name in the meta line. */
  showSpace?: boolean;
}

export const ReleaseRow: React.FC<ReleaseRowProps> = ({ recipe, active, playing, onPlay, rich = false, showSpace = true }) => {
  const notes = linerNotes(recipe);
  const live = active && playing;
  return (
    <button
      type="button"
      className={`idx-row${active ? ' is-active' : ''}`}
      onClick={onPlay}
      onMouseEnter={() => previewDepth(recipe.intent)}
      onMouseLeave={() => previewDepth(null)}
      onFocus={() => previewDepth(recipe.intent)}
      onBlur={() => previewDepth(null)}
      aria-label={`${live ? 'Pause' : 'Play'} ${recipe.title}, ${spaceName(recipe.intent)}`}
      style={{ ['--g' as string]: glowHex(recipe.intent) }}
    >
      <RingGlyph recipe={recipe} live={live} />
      <span>
        <span className="idx-row__title">
          {recipe.title}
          {live && <span className="now-dot" aria-hidden="true" />}
        </span>
        <span className="idx-row__meta">
          {showSpace ? `${spaceName(recipe.intent)} · ` : ''}
          {notes.key} · {notes.tempo} · {catalogueNumber(recipe)}
        </span>
        {rich && <span className="idx-row__desc">{recipe.shortDescription}</span>}
      </span>
      <span className="idx-row__act" aria-hidden="true">
        {live ? <Pause size={16} strokeWidth={1.75} /> : <Play size={16} strokeWidth={1.75} style={{ marginLeft: 2 }} />}
      </span>
    </button>
  );
};
