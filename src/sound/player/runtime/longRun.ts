/**
 * Wellness Waves — all-day robustness.
 *
 * The engine already resumes after iOS interruptions, keeps a worker clock for
 * background tabs, and plays through a media element for lock-screen controls.
 * This hook covers what a whole day in a browser adds:
 *
 * - an output device change (Bluetooth headphones on/off) can leave the
 *   AudioContext suspended: resume if we were playing;
 * - coming back from sleep or the back-forward cache (`pageshow`): same;
 * - a slow watchdog that resumes a context that went quiet on its own.
 */

import { useEffect, useRef } from 'react';
import { AudioEngine } from '../../engine/audio/engine';
import { usePlayer } from '../sessions/playerContext';
import { STATE_HYDRATED_EVENT } from './siteHost';

const WATCHDOG_MS = 30_000;

export function useLongRun(): void {
  const { status, reloadFromStorage } = usePlayer();
  const playing = useRef(false);
  playing.current = status === 'playing';

  useEffect(() => {
    const revive = () => {
      if (playing.current) void AudioEngine.getInstance().resume();
    };
    const media = navigator.mediaDevices;
    media?.addEventListener?.('devicechange', revive);
    window.addEventListener('pageshow', revive);
    window.addEventListener('focus', revive);
    const id = window.setInterval(revive, WATCHDOG_MS);
    return () => {
      media?.removeEventListener?.('devicechange', revive);
      window.removeEventListener('pageshow', revive);
      window.removeEventListener('focus', revive);
      clearInterval(id);
    };
  }, []);

  // Account data arrived (another device's favourites, Sound DNA): show it.
  useEffect(() => {
    const onHydrated = () => reloadFromStorage();
    window.addEventListener(STATE_HYDRATED_EVENT, onHydrated);
    return () => window.removeEventListener(STATE_HYDRATED_EVENT, onHydrated);
  }, [reloadFromStorage]);
}
