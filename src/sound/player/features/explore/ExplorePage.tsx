/**
 * Wellness Waves — Catalogue
 * Browse by space, character and words. Filters are derived from each
 * release's authored world, so "Nature" really has an environment bed.
 */

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Intent } from '../../../engine/types/index';
import { RECIPES } from '../../../engine/recipes/catalog';
import { usePlayer } from '../../sessions/playerContext';
import { ReleaseRow } from '../../ui/Release';
import { previewDepth } from '../../ui/stage/stage';
import { SPACES, linerNotes, spaceName } from '../../ui/catalogue';
import { SPACE_EXPLANATIONS } from '../../content/explanations';

export const ExplorePage: React.FC<{
  onListen: (id: string, open?: boolean) => Promise<void>;
}> = ({ onListen }) => {
  const { currentRecipe, status, togglePlayPause } = usePlayer();
  const [space, setSpace] = useState<Intent | 'all'>('all');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECIPES.filter((r) => {
      if (space !== 'all' && r.intent !== space) return false;
      const notes = linerNotes(r);
      if (!q) return true;
      const hay = [r.title, r.shortDescription, spaceName(r.intent), notes.key, notes.instruments, ...r.tags]
        .join(' ')
        .toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
  }, [space, query]);


  const reset = () => {
    setSpace('all');
    setQuery('');
  };

  const isActive = (id: string) => currentRecipe?.id === id && status !== 'idle' && status !== 'ended';
  const play = (id: string) => {
    if (isActive(id)) void togglePlayPause();
    else void onListen(id, false);
  };

  return (
    <div className="wrap">
      <header className="page-head">
        <h1 className="h1">All sounds</h1>
      </header>

      <div className="filters" role="search">
        <div className="tabs" aria-label="Space">
          <button type="button" aria-pressed={space === 'all'} onClick={() => setSpace('all')}>
            All
          </button>
          {SPACES.map((s) => (
            <button
              key={s.intent}
              type="button"
              aria-pressed={space === s.intent}
              onClick={() => setSpace(s.intent)}
              onMouseEnter={() => previewDepth(s.intent)}
              onMouseLeave={() => previewDepth(null)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="visually-hidden">Search the catalogue</span>
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
          />
        </label>
      </div>

      {space !== 'all' && (
        <p className="lede" style={{ marginBottom: 28 }}>
          {SPACE_EXPLANATIONS[space].lead}
        </p>
      )}

      <p className="visually-hidden" aria-live="polite">
        {results.length} {results.length === 1 ? 'release' : 'releases'} shown
      </p>

      {results.length === 0 ? (
        <div className="empty">
          <h2 className="h3">Nothing matches that yet.</h2>
          <p>Try fewer filters or a different word. Every release is listed under All.</p>
          <button type="button" className="btn btn--quiet btn--small" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="index">
          {results.map((r) => (
            <ReleaseRow key={r.id} recipe={r} active={isActive(r.id)} playing={status === 'playing'} onPlay={() => play(r.id)} rich />
          ))}
        </div>
      )}

    </div>
  );
};
