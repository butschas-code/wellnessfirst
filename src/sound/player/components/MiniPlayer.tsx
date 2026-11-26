/**
 * Wellness Waves — persistent mini player
 * Follows you across pages while a release plays or is paused.
 */

import React from 'react';
import { Pause, Play, X } from 'lucide-react';
import { usePlayer } from '../sessions/playerContext';
import { RingGlyph } from '../ui/Release';
import { catalogueNumber, spaceName } from '../ui/catalogue';
import { useWellness } from '../features/wellness/wellness';
import { useClock } from '../../engine/sessions/clock';

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

export const MiniPlayer: React.FC<{ onExpand: () => void }> = ({ onExpand }) => {
  const { currentRecipe, status, togglePlayPause, stop, activeTimerMinutes } =
    usePlayer();
  const { technique } = useWellness(1000);
  const elapsedSeconds = useClock((c) => c.elapsed);
  const remainingTimerSeconds = useClock((c) => c.remaining);
  if (!currentRecipe || status === 'idle') return null;
  const playing = status === 'playing';

  return (
    <div className="mini" role="region" aria-label="Now playing">
      <button type="button" className="mini__open" onClick={onExpand} aria-label={`Open player: ${currentRecipe.title}`}>
        <RingGlyph recipe={currentRecipe} live={playing} />
        <span className="mini__text">
          <span className="mini__title" style={{ display: 'block' }}>
            {currentRecipe.title}
          </span>
          <span className="mini__meta" style={{ display: 'block' }}>
            {catalogueNumber(currentRecipe)} · {spaceName(currentRecipe.intent)} ·{' '}
            {status === 'ended'
              ? 'Session complete'
              : status === 'error'
                ? 'Could not start'
                : activeTimerMinutes > 0
                  ? `${clock(remainingTimerSeconds)} left`
                  : playing
                    ? clock(elapsedSeconds)
                    : 'Paused'}
            {technique && ` · ${technique.name}`}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="play-btn"
        onClick={() => void togglePlayPause()}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-busy={status === 'loading'}
      >
        {playing ? <Pause size={20} strokeWidth={1.75} /> : <Play size={20} strokeWidth={1.75} style={{ marginLeft: 2 }} />}
      </button>
      <button type="button" className="icon-btn" onClick={stop} aria-label="Stop and close">
        <X size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
};
