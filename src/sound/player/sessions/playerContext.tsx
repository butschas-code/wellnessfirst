/**
 * Wellness Waves — Global Player & Session Context
 * Single source of truth for audio playback, timers, Sound DNA, and Media Session.
 * Guaranteed seamless audio continuity across route navigation.
 * Compliant with Phase 10, Phase 23, and UX Implementation Prompt.
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { AudioMode, PlaybackSession, PlaybackStatus, ShapeParams, SoundDNA, SoundscapeRecipe } from '../../engine/types/index';
import { AudioEngine } from '../../engine/audio/engine';
import { RECIPES, RecipeCatalog } from '../../engine/recipes/catalog';
import { SoundDnaService } from '../../engine/personalization/soundDna';
import { Logger } from '../../engine/lib/logger';
import { Storage } from '../../engine/lib/storage';
import { startAutoWellness } from '../features/wellness/wellness';
import { clockStore } from '../../engine/sessions/clock';
import { type EndedBy, LISTEN_CHUNK_SECONDS, recordListen, trackFunnel } from '../host';
import { PLAYER_NAME } from '../brand';

interface PlayerContextType {
  status: PlaybackStatus;
  currentRecipe: SoundscapeRecipe | null;
  currentSession: PlaybackSession | null;
  soundDna: SoundDNA;
  shapeParams: ShapeParams;
  volume: number;
  audioMode: AudioMode;
  isMuted: boolean;
  isNoiseMuted: boolean;
  favorites: string[];
  recentRecipeIds: string[];
  activeTimerMinutes: number; // 0 = indefinite

  // Actions
  playRecipe: (recipeId: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stop: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleNoiseMute: () => void;
  setAudioMode: (mode: AudioMode) => Promise<void>;
  updateShapeParams: (newParams: Partial<ShapeParams>) => void;
  updateSoundDna: (newDna: Partial<SoundDNA>) => void;
  resetSoundDna: () => void;
  setSessionTimer: (minutes: number) => void;
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  /** Re-reads favourites, history, My Sound and Shape from storage (after account sync). */
  reloadFromStorage: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [currentRecipe, setCurrentRecipe] = useState<SoundscapeRecipe | null>(null);
  const [currentSession, setCurrentSession] = useState<PlaybackSession | null>(null);
  const [soundDna, setSoundDna] = useState<SoundDNA>(() => SoundDnaService.getStoredDna());
  const [shapeParams, setShapeParamsState] = useState<ShapeParams>(() => 
    Storage.get('user_shape_params', { energy: 0.5, texture: 0.2, space: 0.5 })
  );
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isNoiseMuted, setIsNoiseMuted] = useState(false);
  const [audioMode, setAudioModeState] = useState<AudioMode>('ambient');
  const [favorites, setFavorites] = useState<string[]>(() => Storage.get('user_favorites', []));
  const [recentRecipeIds, setRecentRecipeIds] = useState<string[]>(() => Storage.get('recent_recipes', []));
  const [activeTimerMinutes, setActiveTimerMinutes] = useState(0);

  const timerIntervalRef = useRef<number | null>(null);
  const sessionSecondsRef = useRef(0);
  // The stretch of listening in progress, sent to the account when it ends.
  const listenRef = useRef<{ recipeId: string; intent: string; audioMode: string; startedAt: number } | null>(null);

  const endListen = (endedBy: EndedBy, keepGoing = false) => {
    const l = listenRef.current;
    if (!l) return;
    recordListen({ ...l, seconds: sessionSecondsRef.current, endedBy });
    sessionSecondsRef.current = 0;
    listenRef.current = keepGoing ? { ...l, startedAt: Date.now() } : null;
  };

  // Initialize Media Session API
  const updateMediaSession = (recipe: SoundscapeRecipe, playing: boolean) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: recipe.title,
        artist: PLAYER_NAME,
        album: 'Composed live',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

      // Handlers read the latest actions through a ref: lock-screen taps can come
      // long after this render, when its closures would be stale.
      const act = () => actionsRef.current;
      navigator.mediaSession.setActionHandler('play', () => void act().play());
      navigator.mediaSession.setActionHandler('pause', () => void act().pause());
      navigator.mediaSession.setActionHandler('stop', () => act().stop());
      // Lock-screen "next" plays another release from the same space.
      navigator.mediaSession.setActionHandler('nexttrack', () => act().next());
    }
  };

  // Play a recipe by ID
  const playRecipe = async (recipeId: string) => {
    const recipe = RecipeCatalog.getById(recipeId) || RECIPES[0];
    endListen('switch');
    setStatus('loading');
    setCurrentRecipe(recipe);

    try {
      const engine = AudioEngine.getInstance();
      const resolvedDna = SoundDnaService.resolveForRecipe(recipe, soundDna);
      const modeToUse = recipe.defaultMode || 'ambient';
      setAudioModeState(modeToUse);

      await engine.playRecipe(recipe, resolvedDna, modeToUse);
      // Each space runs its wellness technique unless switched off.
      void startAutoWellness(recipe);

      // Evolution (sections, key changes, darkening) lives inside the composer.
      setStatus('playing');
      updateMediaSession(recipe, true);
      trackFunnel('play', { recipe: recipe.id });

      // Record recent history
      setRecentRecipeIds((prev) => {
        const updated = [recipeId, ...prev.filter((id) => id !== recipeId)].slice(0, 10);
        Storage.set('recent_recipes', updated);
        return updated;
      });

      // Reset session timer
      sessionSecondsRef.current = 0;
      clockStore.set({ elapsed: 0 });
      listenRef.current = { recipeId: recipe.id, intent: recipe.intent, audioMode: modeToUse, startedAt: Date.now() };
      setCurrentSession({
        sessionId: 'session-' + Date.now(),
        recipeId: recipe.id,
        startTime: Date.now(),
        elapsedSeconds: 0,
        targetDurationMinutes: activeTimerMinutes,
        sleepTimerActive: activeTimerMinutes > 0,
        isPaused: false,
        audioMode: modeToUse,
        dna: resolvedDna,
        volume,
      });
    } catch (e) {
      Logger.error('Playback failed', { error: String(e) });
      setStatus('error');
    }
  };

  const togglePlayPause = async () => {
    const engine = AudioEngine.getInstance();
    if (status === 'playing') {
      setStatus('pausing');
      await engine.pause();
      setStatus('paused');
      if (currentRecipe) updateMediaSession(currentRecipe, false);
    } else if (status === 'paused') {
      setStatus('resuming');
      await engine.resume();
      setStatus('playing');
      if (currentRecipe) updateMediaSession(currentRecipe, true);
    } else if (currentRecipe) {
      await playRecipe(currentRecipe.id);
    } else {
      // First click: Start default recipe
      await playRecipe(RECIPES[0].id);
    }
  };

  const stop = () => {
    endListen('stop');
    const engine = AudioEngine.getInstance();
    engine.stopActiveLayers(0.8);
    setStatus('idle');
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  };

  const handleSetVolume = (vol: number) => {
    setVolumeState(vol);
    setIsMuted(vol === 0);
    AudioEngine.getInstance().setVolume(vol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      AudioEngine.getInstance().setVolume(volume);
    } else {
      setIsMuted(true);
      AudioEngine.getInstance().setVolume(0);
    }
  };

  const handleSetAudioMode = async (mode: AudioMode) => {
    setAudioModeState(mode);
    await AudioEngine.getInstance().setMode(mode);
  };

  const toggleNoiseMute = () => {
    const muted = AudioEngine.getInstance().toggleNoiseMute();
    setIsNoiseMuted(muted);
  };

  const updateShapeParams = (newParams: Partial<ShapeParams>) => {
    const updated = { ...shapeParams, ...newParams };
    setShapeParamsState(updated);
    Storage.set('user_shape_params', updated);
    AudioEngine.getInstance().applyShapeParams(updated);
  };

  const updateSoundDna = (partialDna: Partial<SoundDNA>) => {
    const updated: SoundDNA = { ...soundDna, ...partialDna };
    setSoundDna(updated);
    SoundDnaService.saveDna(updated);
    AudioEngine.getInstance().updateDna(currentRecipe ? SoundDnaService.resolveForRecipe(currentRecipe, updated) : updated);
  };

  const resetSoundDna = () => {
    const defaultDna = SoundDnaService.resetDna();
    setSoundDna(defaultDna);
    AudioEngine.getInstance().updateDna(
      currentRecipe ? SoundDnaService.resolveForRecipe(currentRecipe, defaultDna) : defaultDna
    );
  };

  const setSessionTimer = (minutes: number) => {
    setActiveTimerMinutes(minutes);
    clockStore.set({ remaining: minutes * 60 });
    // The fade itself is scheduled on the audio clock: it happens even with the screen off.
    AudioEngine.getInstance().setSleepTimer(minutes * 60);
  };

  const toggleFavorite = (recipeId: string) => {
    if (!favorites.includes(recipeId)) trackFunnel('favorite', { recipe: recipeId });
    setFavorites((prev) => {
      const next = prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId];
      Storage.set('user_favorites', next);
      return next;
    });
  };

  const isFavorite = (recipeId: string) => favorites.includes(recipeId);

  const reloadFromStorage = () => {
    const dna = SoundDnaService.getStoredDna();
    const shape = Storage.get<ShapeParams>('user_shape_params', { energy: 0.5, texture: 0.2, space: 0.5 });
    setSoundDna(dna);
    setShapeParamsState(shape);
    setFavorites(Storage.get('user_favorites', []));
    setRecentRecipeIds(Storage.get('recent_recipes', []));
    AudioEngine.getInstance().applyShapeParams(shape);
    AudioEngine.getInstance().updateDna(currentRecipe ? SoundDnaService.resolveForRecipe(currentRecipe, dna) : dna);
  };

  // Elapsed time and the sleep timer, read from clocks rather than counted ticks:
  // background tabs throttle timers, so a tick can arrive minutes late.
  useEffect(() => {
    if (status !== 'playing') return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.round((now - last) / 1000);
      if (delta >= 1) {
        last += delta * 1000;
        sessionSecondsRef.current += delta;
        clockStore.set({ elapsed: clockStore.get().elapsed + delta });
        // All-day listening: log it in chunks, so closing the tab loses at most one chunk.
        if (sessionSecondsRef.current >= LISTEN_CHUNK_SECONDS) endListen('chunk', true);
      }
      if (activeTimerMinutes > 0) {
        const left = AudioEngine.getInstance().getSleepRemaining();
        if (left === null) return;
        clockStore.set({ remaining: Math.ceil(left) });
        if (left <= 0.5) {
          endListen('timer');
          stop();
          setStatus('ended');
          setActiveTimerMinutes(0);
        }
      }
    }, 1000);
    timerIntervalRef.current = id;
    return () => clearInterval(id);
  }, [status, activeTimerMinutes, volume]);

  // Latest playback actions, for the lock screen and the OS.
  const actionsRef = useRef({
    play: async () => undefined as void,
    pause: async () => undefined as void,
    stop: () => undefined as void,
    next: () => undefined as void,
  });
  actionsRef.current = {
    play: async () => {
      if (status !== 'playing') await togglePlayPause();
    },
    pause: async () => {
      if (status === 'playing') await togglePlayPause();
    },
    stop,
    next: () => {
      if (!currentRecipe) return;
      const siblings = RECIPES.filter((r) => r.intent === currentRecipe.intent);
      const next = siblings[(siblings.findIndex((r) => r.id === currentRecipe.id) + 1) % siblings.length];
      void playRecipe(next.id);
    },
  };

  // Paused or resumed from outside the app (lock screen, headphones, a call).
  useEffect(
    () =>
      AudioEngine.getInstance().onExternalPlayState((playing) => {
        setStatus(playing ? 'playing' : 'paused');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }),
    []
  );

  // Handle Visibility Change & Interruption
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // The page may never come back (closed from the app switcher): save what was heard so far.
        endListen('leave', true);
        Logger.debug('Page visibility hidden');
      } else {
        Logger.debug('Page visibility visible; checking audio context state');
        if (status === 'playing') {
          AudioEngine.getInstance().resume();
        }
      }
    };

    const handlePageHide = () => endListen('leave', true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [status]);

  return (
    <PlayerContext.Provider
      value={{
        reloadFromStorage,
        status,
        currentRecipe,
        currentSession,
        soundDna,
        shapeParams,
        volume,
        audioMode,
        isMuted,
        isNoiseMuted,
        favorites,
        recentRecipeIds,
        activeTimerMinutes,
        playRecipe,
        togglePlayPause,
        stop,
        setVolume: handleSetVolume,
        toggleMute,
        toggleNoiseMute,
        setAudioMode: handleSetAudioMode,
        updateShapeParams,
        updateSoundDna,
        resetSoundDna,
        setSessionTimer,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
