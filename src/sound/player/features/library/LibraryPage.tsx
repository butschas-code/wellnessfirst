/**
 * Wellness Waves — Library
 * Saved releases and what you played recently. Stored in this browser only.
 */

import React from 'react';
import { usePlayer } from '../../sessions/playerContext';
import { RecipeCatalog } from '../../../engine/recipes/catalog';
import type { SoundscapeRecipe } from '../../../engine/types/index';
import { ReleaseRow } from '../../ui/Release';

interface Props {
  onNavigate: (route: string) => void;
  onListen: (id: string, open?: boolean) => Promise<void>;
}

export const LibraryPage: React.FC<Props> = ({ onNavigate, onListen }) => {
  const { favorites, recentRecipeIds, currentRecipe, status, togglePlayPause } = usePlayer();
  const saved = favorites.map((id) => RecipeCatalog.getById(id)).filter(Boolean) as SoundscapeRecipe[];
  const recent = recentRecipeIds.map((id) => RecipeCatalog.getById(id)).filter(Boolean) as SoundscapeRecipe[];

  const isActive = (id: string) => currentRecipe?.id === id && status !== 'idle' && status !== 'ended';
  const play = (id: string) => (isActive(id) ? void togglePlayPause() : void onListen(id, false));

  const shelf = (items: SoundscapeRecipe[]) => (
    <div className="index">
      {items.map((r) => (
        <ReleaseRow key={r.id} recipe={r} active={isActive(r.id)} playing={status === 'playing'} onPlay={() => play(r.id)} />
      ))}
    </div>
  );

  return (
    <div className="wrap">
      <header className="page-head">
        <h1 className="h1">Saved</h1>
      </header>

      <section aria-labelledby="saved-title" style={{ marginBottom: 72 }}>
        <h2 id="saved-title" className="h3" style={{ marginBottom: 24 }}>
          Kept
        </h2>
        {saved.length ? (
          shelf(saved)
        ) : (
          <div className="empty" style={{ paddingTop: 0 }}>
            <p>Nothing here yet.</p>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => onNavigate('explore')}>
              All sounds
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-title">
        <h2 id="recent-title" className="h3" style={{ marginBottom: 24 }}>
          Recently played
        </h2>
        {recent.length ? (
          shelf(recent)
        ) : (
          <div className="empty" style={{ paddingTop: 0 }}>
            <p>Nothing yet.</p>
            <button type="button" className="btn btn--primary btn--small" onClick={() => onNavigate('home')}>
              Play
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
