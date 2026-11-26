/**
 * Wellness — the running program, in the player: one pill, tap to change.
 * "Just music" lives in the same list, so there is no separate switch.
 */

import React from 'react';
import { ChevronRight, Infinity as InfinityIcon } from 'lucide-react';
import { useWellness } from '../wellness/wellness';

export const ProgramPanel: React.FC<{ onBrowse: () => void }> = ({ onBrowse }) => {
  const { technique } = useWellness(500);
  return (
    <button type="button" className="home__program program-pill" onClick={onBrowse} aria-label="Change program">
      <InfinityIcon size={15} strokeWidth={1.5} aria-hidden="true" />
      <span>{technique ? technique.name : 'Just music'}</span>
      <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
};
