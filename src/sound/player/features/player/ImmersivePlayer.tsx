/**
 * Tide — the player.
 * The stage draws the ring at full scale; the current chord sits at its
 * centre. Title and program at the lower left, transport at the lower right,
 * the session as a thin line of light that grows chord by chord.
 */

import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { setRingPlacement } from '../../ui/stage/stage';
import {
  ChevronDown,
  Heart,
  Info,
  Infinity as InfinityIcon,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayer } from '../../sessions/playerContext';
import { flagshipForNow } from '../../ui/catalogue';
import { ProgramPanel } from '../programs/ProgramPanel';
import { SpaceInfoSheet } from '../home/SpaceInfoSheet';
import { useClock } from '../../../engine/sessions/clock';

// The 105-program catalog is only loaded when someone opens it.
const ProgramSheet = lazy(() => import('../programs/ProgramSheet'));

const TIMERS = [
  { minutes: 0, label: 'Until I stop' },
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '90 minutes' },
  { minutes: 120, label: '2 hours' },
];

export const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
};


export const ImmersivePlayer: React.FC<{
  onClose: () => void;
  onNavigate: (route: string) => void;
  initialSheet?: 'programs' | 'shape';
}> = ({ onClose, initialSheet }) => {
  const {
    status,
    currentRecipe,
    playRecipe,
    togglePlayPause,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    activeTimerMinutes,
    setSessionTimer,
    isFavorite,
    toggleFavorite,
  } = usePlayer();

  const recipe = currentRecipe ?? flagshipForNow();
  const [timerOpen, setTimerOpen] = useState(false);
  const [sheet, setSheet] = useState<'notes' | 'programs' | null>(initialSheet === 'programs' ? 'programs' : null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isPlaying = status === 'playing';
  const isBusy = status === 'loading' || status === 'resuming' || status === 'pausing';
  const fav = isFavorite(recipe.id);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // The ring sits in the room between the top bar and the title, on any screen.
  const base = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = base.current;
      if (!el) return;
      const H = window.innerHeight;
      const W = window.innerWidth;
      const top = 64;
      const bottom = el.getBoundingClientRect().top - 16;
      const avail = Math.max(100, bottom - top);
      const d = Math.min((avail - 12) * 0.82, W * 0.68, H * 0.4);
      setRingPlacement('player', { y: (top + avail / 2) / H, r: d / 2 / H });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (base.current) ro.observe(base.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      setRingPlacement('player', null);
    };
  }, []);

  const start = () => {
    if (status === 'idle' || status === 'ended' || status === 'error' || !currentRecipe) void playRecipe(recipe.id);
    else void togglePlayPause();
  };

  const elapsedSeconds = useClock((c) => c.elapsed);
  const remainingTimerSeconds = useClock((c) => c.remaining);
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="player" role="dialog" aria-modal="true" aria-label={`${recipe.title} player`}>
      <div className="wrap player__bar">
        <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close player">
          <ChevronDown size={24} strokeWidth={1.5} />
        </button>
        <div className="player__tools">
          <button type="button" className="icon-btn" onClick={() => setSheet('notes')} aria-label="About this sound">
            <Info size={19} strokeWidth={1.5} />
          </button>
          <button type="button" className="icon-btn" onClick={() => setSheet('programs')} aria-label="Programs">
            <InfinityIcon size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={`icon-btn${fav ? ' is-on' : ''}`}
            onClick={() => toggleFavorite(recipe.id)}
            aria-pressed={fav}
            aria-label={fav ? 'Remove from saved' : 'Save'}
          >
            <Heart size={19} strokeWidth={1.5} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="wrap player__stage">

        <div className="player__base" ref={base}>
          <div>
            <h1 className="player__title">{recipe.title}</h1>
            <p className="player__desc">{recipe.shortDescription}</p>

            {status === 'error' && (
              <p className="state-note state-note--error" role="alert">
                Audio could not start. Make sure this tab is allowed to play sound, then press play again.
              </p>
            )}
            {status === 'ended' && (
              <p className="state-note">
                Your session faded out as planned.{' '}
                <button type="button" className="text-link" onClick={() => void playRecipe(recipe.id)}>
                  <RotateCcw size={14} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: '-2px' }} /> Play again
                </button>
              </p>
            )}

            <ProgramPanel onBrowse={() => setSheet('programs')} />

          </div>

          <div className="transport">
            <div className="elapsed">
              <b>{activeTimerMinutes > 0 ? clock(remainingTimerSeconds) : clock(elapsedSeconds)}</b>
              <span>{activeTimerMinutes > 0 ? 'until the fade ends' : 'listened'}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`icon-btn${activeTimerMinutes > 0 ? ' is-on' : ''}`}
                onClick={() => setTimerOpen((o) => !o)}
                aria-expanded={timerOpen}
                aria-haspopup="menu"
                aria-label="Sleep timer"
              >
                <Timer size={20} strokeWidth={1.5} />
              </button>
              {timerOpen && (
                <div className="popover" role="menu" aria-label="Sleep timer">
                  <p>Fades out gently over the last five minutes.</p>
                  {TIMERS.map((t) => (
                    <button
                      key={t.minutes}
                      type="button"
                      role="menuitemradio"
                      aria-checked={activeTimerMinutes === t.minutes}
                      onClick={() => {
                        setSessionTimer(t.minutes);
                        setTimerOpen(false);
                      }}
                    >
                      {t.label}
                      {activeTimerMinutes === t.minutes && <span aria-hidden="true">•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="volume">
              <button type="button" className="icon-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                <VolumeIcon size={19} strokeWidth={1.5} />
              </button>
              <label style={{ flex: 1 }}>
                <span className="visually-hidden">Volume</span>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ ['--fill' as string]: `${(isMuted ? 0 : volume) * 100}%` }}
                  aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)} percent`}
                />
              </label>
            </div>
            <button type="button" className="play-btn" onClick={start} aria-label={isPlaying ? 'Pause' : 'Play'} aria-busy={isBusy}>
              {isPlaying ? <Pause size={26} strokeWidth={1.5} /> : <Play size={26} strokeWidth={1.5} style={{ marginLeft: 3 }} />}
            </button>
          </div>
        </div>
      </div>

      {sheet === 'programs' && (
        <Suspense fallback={null}>
          <ProgramSheet onClose={() => setSheet(null)} />
        </Suspense>
      )}

      {sheet === 'notes' && <SpaceInfoSheet space={recipe.intent} onClose={() => setSheet(null)} />}

    </div>
  );
};
