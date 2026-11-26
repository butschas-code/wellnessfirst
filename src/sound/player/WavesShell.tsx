/**
 * Wellness Waves — site island (tiny).
 *
 * Mounted on every page with `transition:persist`. It stays empty until the
 * visitor first opens the player room (/sound); only then is the full player
 * (engine, UI, styles) loaded. Sound can only start in the room, so pages a
 * visitor reaches by a full load never need it. Once loaded it stays mounted
 * for the rest of the visit, which keeps the audio playing between pages.
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';

const WavesPlayerRoot = lazy(() => import('./WavesPlayerRoot'));

const inRoom = () => typeof document !== 'undefined' && document.getElementById('ww-room') !== null;

const WavesShell: React.FC = () => {
  const [active, setActive] = useState(inRoom);

  useEffect(() => {
    if (active) return;
    const check = () => inRoom() && setActive(true);
    document.addEventListener('astro:page-load', check);
    return () => document.removeEventListener('astro:page-load', check);
  }, [active]);

  return active ? (
    <Suspense fallback={null}>
      <WavesPlayerRoot />
    </Suspense>
  ) : null;
};

export default WavesShell;
