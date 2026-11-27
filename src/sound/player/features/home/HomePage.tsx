/**
 * Tide — the whole app on one screen.
 * Tap the ring: play / pause. Swipe the words: another space. Nothing to read.
 * Everything fits one screen: the ring takes the space the controls leave.
 */

import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { haptic } from '../../ui/mobile';
import { AudioWaveform, Check, ChevronRight, Heart, Info, ListMusic, Infinity as InfinityIcon, Leaf, Moon, Pause, Play, Shuffle, SlidersHorizontal } from 'lucide-react';
import { SpaceInfoSheet } from './SpaceInfoSheet';
import { FeelPad } from './FeelPad';
import { choosePersonal, pinPersonal, pinnedPersonal, techniqueFor, useWellness, wellnessEnabled } from '../wellness/wellness';
import { isPersonalTechnique, personalTechniqueId, techniqueForProgram } from '../personal/personal';
import { TodayStrip, nowProgram } from '../personal/TodayStrip';
import { personalPrograms, saveProgram, type PersonalProgram, type PersonalResult } from '../../host';
import type { Technique } from '../../../engine/domain/wellness/techniques';
import { usePlayer } from '../../sessions/playerContext';
import { FLAGSHIP_BY_INTENT, SPACES, flagshipForNow, recipesFor } from '../../ui/catalogue';
import { SpaceCarousel, type SpaceKey } from './SpaceCarousel';
import { SoundscapeSheet } from './SoundscapeSheet';
import { previewDepth, setHeroPlacement } from '../../ui/stage/stage';
import type { Intent } from '../../../engine/types/index';
import { useClock } from '../../../engine/sessions/clock';
import { PLAYER_NAME } from '../../brand';

const ProgramSheet = lazy(() => import('../programs/ProgramSheet'));

/** Home-screen shortcut (?space=focus) chooses what the first tap plays. */
const shortcutSpace = (): Intent | null => {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('space');
  return SPACES.some((space) => space.intent === requested) ? (requested as Intent) : null;
};

/** Link from the Wellness Space (?programs=for-you) opens Programs on "For you". */
const wantsForYou = () => new URLSearchParams(window.location.search).get('programs') === 'for-you';

const TIMER_STEPS = [0, 30, 60, 120];

const BREATH_WORD = { in: 'in', hold: 'hold', out: 'out', rest: 'hold' } as const;

interface HomePageProps {
  onNavigate: (route: string) => void;
  onListen: (recipeId: string, open?: boolean) => Promise<void>;
}

export const HomePage: React.FC<HomePageProps> = ({ onListen }) => {
  const {
    currentRecipe,
    status,
    togglePlayPause,
    playRecipe,
    activeTimerMinutes,
    setSessionTimer,
    isFavorite,
    toggleFavorite,
    shapeParams,
    updateShapeParams,
    updateSoundDna,
  } = usePlayer();
  const wellness = useWellness();
  const [feeling, setFeeling] = useState(false);
  const [info, setInfo] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickYou, setPickYou] = useState(false);
  useEffect(() => {
    const open = () => {
      if (!wantsForYou()) return;
      setPickYou(true);
      setPicking(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('programs');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    };
    open();
    document.addEventListener('astro:page-load', open);
    return () => document.removeEventListener('astro:page-load', open);
  }, []);
  const [choosingSound, setChoosingSound] = useState(false);
  const natureOn = shapeParams.texture > 0.05;
  const [shortcut] = useState(shortcutSpace);

  useEffect(() => {
    if (shortcut) previewDepth(shortcut);
  }, [shortcut]);

  const live = !!currentRecipe && status !== 'idle' && status !== 'ended' && status !== 'error';
  const playing = status === 'playing';
  const busy = status === 'loading' || status === 'resuming';
  const space: Intent | null = live ? currentRecipe!.intent : null;
  const [sel, setSel] = useState<Intent>(() => shortcut ?? currentRecipe?.intent ?? flagshipForNow().intent);
  // "For you" is its own space in the carousel; it starts selected while a personal program plays.
  const [forYou, setForYou] = useState<boolean>(() => !shortcut && isPersonalTechnique(wellness.technique?.id));
  const personalNow = live && isPersonalTechnique(wellness.technique?.id) ? wellness.technique : null;
  // Picking a program moves the carousel with it: a personal one to For you, a space's one away.
  const techId = wellness.technique?.id;
  useEffect(() => {
    if (!techId) return;
    setForYou(isPersonalTechnique(techId));
  }, [techId]);
  // While a stored personal program plays, the heart saves that program to the account
  // (it then shows in the Wellness Space). Otherwise it favourites the soundscape.
  const storedProgramId = personalNow && /^ww:[0-9a-f]{8}-[0-9a-f]{4}-/i.test(personalNow.id) ? personalNow.id.slice(3) : null;
  const [programSaved, setProgramSaved] = useState(false);
  useEffect(() => {
    setProgramSaved(false);
    if (!storedProgramId) return;
    let alive = true;
    void personalPrograms('saved').then((r) => alive && setProgramSaved(r.status === 'ok' && r.programs.some((p) => p.id === storedProgramId)));
    return () => {
      alive = false;
    };
  }, [storedProgramId]);
  const hearted = storedProgramId ? programSaved : !!currentRecipe && isFavorite(currentRecipe.id);
  const toggleHeart = () => {
    if (storedProgramId) void saveProgram(storedProgramId, !programSaved).then(setProgramSaved);
    else if (currentRecipe) toggleFavorite(currentRecipe.id);
  };
  // Today's personal programs, shown on the home while For you is selected.
  const [today, setToday] = useState<PersonalResult | null>(null);
  const playNowWhenLoaded = useRef(false);
  const playPersonal = async (p: PersonalProgram) => {
    haptic();
    const t = await techniqueForProgram(p);
    if (!t) return;
    if (live) choosePersonal(t);
    else {
      pinPersonal(t);
      await playRecipe(p.recipeId);
    }
  };
  // Load today's programs the first time For you is shown.
  useEffect(() => {
    if (!forYou || today) return;
    let alive = true;
    void personalPrograms('today').then((r) => {
      if (!alive) return;
      setToday(r);
      const p = playNowWhenLoaded.current ? nowProgram(r) : null;
      playNowWhenLoaded.current = false;
      if (p) void playPersonal(p);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forYou, today]);
  // A pin from an earlier day is not today's program: start the one for now instead.
  const startForYou = () => {
    const pinned = pinnedPersonal();
    const programs = today?.status === 'ok' ? today.programs : [];
    const picked = pinned && programs.find((p) => personalTechniqueId(p) === pinned.id);
    const p = picked || nowProgram(today);
    if (p) void playPersonal(p);
    else if (pinned) playSel(sel);
    else openForYou();
  };
  const openForYou = () => {
    setPickYou(true);
    setPicking(true);
  };

  // Follow what plays (e.g. lock-screen "next"), so the carousel always shows it.
  useEffect(() => {
    if (space) setSel(space);
  }, [space]);

  const playSel = (intent: Intent) => {
    if (currentRecipe?.intent === intent) void playRecipe(currentRecipe.id);
    else void onListen(FLAGSHIP_BY_INTENT[intent], false);
  };

  const tapRing = () => {
    haptic();
    if (live) void togglePlayPause();
    // For you: the program picked today, else the one for this time of day.
    else if (forYou) startForYou();
    else playSel(sel);
  };

  const selectSpace = (key: SpaceKey) => {
    if (key === 'you') {
      setForYou(true);
      if (!live) previewDepth(null);
      // Already playing something else: switch to the program for now, like any other space.
      else if (!personalNow) {
        const p = nowProgram(today);
        if (p) void playPersonal(p);
        else if (!today) playNowWhenLoaded.current = true;
      }
      return;
    }
    const intent = key;
    setForYou(false);
    setSel(intent);
    if (live && space !== intent) {
      previewDepth(null);
      void onListen(FLAGSHIP_BY_INTENT[intent], false);
    } else if (!live) previewDepth(intent);
  };

  const tapSelected = () => {
    haptic();
    if (forYou) {
      if (live && personalNow) void togglePlayPause();
      else startForYou();
    } else if (live && space === sel) void togglePlayPause();
    else playSel(sel);
  };

  // Fit one screen: the ring takes whatever height the controls below leave.
  const below = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{ y: number; d: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = below.current;
      if (!el) return;
      const H = window.innerHeight;
      const W = window.innerWidth;
      const top = 56; // the bar
      const bottom = el.getBoundingClientRect().top - 18;
      const avail = Math.max(120, bottom - top);
      // Headroom for the ring's pulse and drift (it can grow ~15%).
      let d = Math.min((avail - 16) * 0.82, W * 0.66, H * 0.4);
      // Adjust: leave room for the labels on all four sides of the ring.
      if (feeling) d = Math.min(d, W - 2 * 84, avail - 90);
      const y = top + avail / 2;
      setRing({ y, d });
      setHeroPlacement({ y: y / H, r: d / 2 / H });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (below.current) ro.observe(below.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      setHeroPlacement(null);
    };
  }, [feeling]);

  const another = () => {
    if (!currentRecipe) return;
    haptic();
    const list = recipesFor(currentRecipe.intent);
    const next = list[(list.findIndex((r) => r.id === currentRecipe.id) + 1) % list.length];
    void onListen(next.id, false);
  };

  const cycleTimer = () => {
    const i = TIMER_STEPS.indexOf(activeTimerMinutes);
    setSessionTimer(TIMER_STEPS[(i + 1) % TIMER_STEPS.length]);
  };

  const toggleNature = () => {
    if (natureOn) updateShapeParams({ texture: 0 });
    else {
      updateShapeParams({ texture: 0.6 });
      updateSoundDna({ nature: 0.8 });
    }
  };

  const breath = wellness.breath;
  // The soundscape shown: what plays, else the last one of this space, else its flagship.
  const shownRecipe =
    live && currentRecipe
      ? currentRecipe
      : currentRecipe?.intent === sel
        ? currentRecipe
        : recipesFor(sel).find((r) => r.id === FLAGSHIP_BY_INTENT[sel]) ?? recipesFor(sel)[0];

  // Before playing, show what the selected space will play (and let it be changed).
  const [upNext, setUpNext] = useState<Technique | null>(null);
  useEffect(() => {
    if (live) return;
    let alive = true;
    void techniqueFor({ id: currentRecipe?.intent === sel ? currentRecipe.id : FLAGSHIP_BY_INTENT[sel], intent: sel }).then(
      (t) => alive && setUpNext(wellnessEnabled() ? t : null)
    );
    return () => {
      alive = false;
    };
  }, [sel, live, picking, currentRecipe]);

  const minutesLeft = useClock((c) => Math.max(1, Math.ceil(c.remaining / 60)));
  const timerLabel =
    activeTimerMinutes > 0 ? `${minutesLeft}′` : '';

  return (
    <section
      className="home"
      aria-label={PLAYER_NAME}
      style={ring ? { ['--ring-y' as string]: `${ring.y}px`, ['--ring-d' as string]: `${ring.d}px` } : undefined}
    >
      {feeling && <FeelPad />}
      <button
        type="button"
        hidden={feeling}
        className={`home__ring${playing ? ' is-playing' : ''}`}
        onClick={tapRing}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-busy={busy}
      >
        {playing ? <Pause size={44} strokeWidth={1} /> : <Play size={44} strokeWidth={1} style={{ marginLeft: 6 }} />}
        {playing && breath && (
          <span className="home__breath" aria-live="off">
            {BREATH_WORD[breath.phase]}
          </span>
        )}
      </button>

      <div className="home__below" ref={below}>
        {!feeling && <SpaceCarousel selected={forYou ? 'you' : sel} onSelect={selectSpace} onTapSelected={tapSelected} />}
        {!feeling && forYou && (
          <TodayStrip
            today={today}
            activeId={live ? wellness.technique?.id ?? null : pinnedPersonal()?.id ?? null}
            onPlay={(p) => void playPersonal(p)}
          />
        )}
        <button
          type="button"
          className="home__now"
          onClick={() => setInfo(true)}
          hidden={feeling}
          aria-label={live ? `About ${currentRecipe!.title}` : `About ${SPACES.find((x) => x.intent === sel)?.name}`}
        >
          <span>About</span>
          <Info size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
        {!feeling && (
          <div className="home__pills">
          <button type="button" className="home__program home__sound" onClick={() => setChoosingSound(true)} aria-label="Choose soundscape">
            <AudioWaveform size={15} strokeWidth={1.5} aria-hidden="true" />
            <span aria-live="polite">{shownRecipe.title}</span>
            <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`home__program${forYou ? ' home__program--you' : ''}`}
            onClick={() => (forYou ? openForYou() : setPicking(true))}
            aria-label={forYou ? 'All my programs' : 'Choose program'}
          >
            {forYou ? <ListMusic size={15} strokeWidth={1.5} aria-hidden="true" /> : <InfinityIcon size={15} strokeWidth={1.5} aria-hidden="true" />}
            <span aria-live="polite">
              {forYou
                ? 'All my programs'
                : live
                  ? wellness.technique
                    ? wellness.technique.name
                    : 'Just music'
                  : upNext
                    ? upNext.name
                    : 'Choose a program'}
            </span>
            <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
          </div>
        )}

        {feeling ? (
          <>
          <p className="home__hint">Drag the light to shape the sound</p>
          <div className="home__tools home__tools--feel">
            <button
              type="button"
              className={`chip home__nature${natureOn ? ' is-on' : ''}`}
              onClick={toggleNature}
              aria-pressed={natureOn}
            >
              <Leaf size={16} strokeWidth={1.5} aria-hidden="true" />
              Nature sounds {natureOn ? 'on' : 'off'}
            </button>
            <button type="button" className="icon-btn home__done" onClick={() => setFeeling(false)} aria-label="Done">
              <Check size={24} strokeWidth={1.5} />
            </button>
          </div>
          </>
        ) : (
          <>
            <div className="home__tools">
              <button type="button" className="tool" onClick={another} disabled={!live}>
                <Shuffle size={20} strokeWidth={1.5} aria-hidden="true" />
                <span>Next</span>
              </button>
              <button type="button" className={`tool${activeTimerMinutes > 0 ? ' is-on' : ''}`} onClick={cycleTimer}>
                <Moon size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="nums">{activeTimerMinutes > 0 ? `${timerLabel} left` : 'Timer'}</span>
              </button>
              <button type="button" className="tool" onClick={() => setFeeling(true)}>
                <SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden="true" />
                <span>Adjust</span>
              </button>
              <button
                type="button"
                className={`tool${hearted ? ' is-on' : ''}`}
                onClick={toggleHeart}
                disabled={!live}
                aria-pressed={hearted}
                aria-label={storedProgramId ? (hearted ? 'Program saved' : 'Save this program') : undefined}
              >
                <Heart size={20} strokeWidth={1.5} aria-hidden="true" fill={hearted ? 'currentColor' : 'none'} />
                <span>{hearted ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </>
        )}
      </div>
      {choosingSound && (
        <SoundscapeSheet
          space={space ?? sel}
          currentId={live ? currentRecipe!.id : shownRecipe.id}
          onPick={(id) => void onListen(id, false)}
          onClose={() => setChoosingSound(false)}
        />
      )}
      {picking && (
        <Suspense fallback={null}>
          <ProgramSheet
            space={space ?? sel}
            startOnYou={pickYou}
            onClose={() => {
              setPicking(false);
              setPickYou(false);
            }}
          />
        </Suspense>
      )}
      {info && <SpaceInfoSheet space={space ?? sel} onClose={() => setInfo(false)} />}
    </section>
  );
};
