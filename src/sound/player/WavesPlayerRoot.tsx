/**
 * Wellness Waves — the full player (loaded on first visit to /sound by WavesShell).
 *
 * Lives inside the persistent island, so audio and player state survive soft
 * navigation between pages.
 *
 * - On `/sound` it renders the full player room (water stage + home controls)
 *   into the page's `#ww-room` element through a portal.
 * - Everywhere else it shows the pinned mini player while something plays.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { navigate } from 'astro:transitions/client';
import { PlayerProvider, usePlayer } from './sessions/playerContext';
import { HomePage } from './features/home/HomePage';
import { MiniPlayer } from './components/MiniPlayer';
import { TideStage } from './ui/stage/TideStage';
import { setStage, subscribe } from './ui/stage/stage';
import { useSingleTab } from './runtime/singleTab';
import { useLongRun } from './runtime/longRun';
import { connectHost } from './runtime/siteHost';
import { PLAYER_NAME } from './brand';
import './styles/waves.css';
import './styles/theme.css';

export const ROOM_PATH = '/sound';
const ROOM_ID = 'ww-room';

const findRoom = () => document.getElementById(ROOM_ID);

/** The room element of the current page, or null; follows soft navigation. */
function useRoom(): HTMLElement | null {
  const [room, setRoom] = useState<HTMLElement | null>(() => findRoom());
  useEffect(() => {
    // Unmount the portal before Astro removes its target from the page.
    const beforeSwap = () => flushSync(() => setRoom(null));
    const afterLoad = () => setRoom(findRoom());
    document.addEventListener('astro:before-swap', beforeSwap);
    document.addEventListener('astro:page-load', afterLoad);
    return () => {
      document.removeEventListener('astro:before-swap', beforeSwap);
      document.removeEventListener('astro:page-load', afterLoad);
    };
  }, []);
  return room;
}

const Shell: React.FC = () => {
  const room = useRoom();
  const { currentRecipe, status, playRecipe, togglePlayPause, toggleMute } = usePlayer();
  const otherTab = useSingleTab();
  useLongRun();

  const listening = !!currentRecipe && status !== 'idle' && status !== 'ended';

  // The water follows what plays; the ring sits in the room's hero placement.
  useEffect(() => {
    setStage({ depth: listening ? currentRecipe!.intent : 'surface', mode: 'hero' });
  }, [listening, currentRecipe]);

  // Mirror the depth onto every .ww element so CSS light (--glow) matches the water.
  useEffect(
    () =>
      subscribe((t) => {
        document.querySelectorAll<HTMLElement>('.ww').forEach((el) => {
          if (t.depth === 'surface') delete el.dataset.depth;
          else el.dataset.depth = t.depth;
        });
      }),
    [room]
  );

  // Keyboard: space plays/pauses and M mutes, in the room only.
  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space' && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        e.preventDefault();
        void togglePlayPause();
      } else if (e.code === 'KeyM') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room, togglePlayPause, toggleMute]);

  const listen = useCallback(async (recipeId: string) => playRecipe(recipeId), [playRecipe]);
  const openRoom = useCallback(() => void navigate(ROOM_PATH), []);

  return (
    <div className="ww ww-shell">
      {otherTab && (
        <p className="ww-notice" role="status">
          {PLAYER_NAME} is playing in another tab. Playing here will pause it there.
        </p>
      )}
      {room
        ? createPortal(
            <>
              <TideStage />
              <HomePage onNavigate={() => {}} onListen={listen} />
            </>,
            room
          )
        : <MiniPlayer onExpand={openRoom} />}
    </div>
  );
};

const WavesPlayerRoot: React.FC = () => {
  useEffect(() => connectHost(), []);
  return (
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  );
};

export default WavesPlayerRoot;
