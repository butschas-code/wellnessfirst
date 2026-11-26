/**
 * Wellness Waves — My Sound
 * Eight named swatches. Each one lights the parts of the ensemble it really
 * steers in the composer, so nothing here is a placebo slider.
 */

import React, { useState } from 'react';
import { RotateCcw, Play, Check, ChevronLeft } from 'lucide-react';
import { usePlayer } from '../../sessions/playerContext';
import type { SoundDNA } from '../../../engine/types/index';
import { SoundDnaService } from '../../../engine/personalization/soundDna';
import { CALIBRATION_PAIRS, CalibrationService } from '../../../engine/personalization/calibration';
import { AudioEngine } from '../../../engine/audio/engine';
import { RecipeCatalog } from '../../../engine/recipes/catalog';
import { flagshipForNow } from '../../ui/catalogue';

type Part = 'Pad' | 'Bass' | 'Keys' | 'Pulse' | 'Bells' | 'Shimmer' | 'Environment' | 'Hall';

interface Swatch {
  key: keyof SoundDNA;
  name: string;
  left: string;
  right: string;
  color: string;
  governs: Part[];
  how: string;
  simple: boolean;
}

const SWATCHES: Swatch[] = [
  { key: 'warmth', name: 'Warmth', left: 'Crisp', right: 'Warm', color: '#8fe8c8', governs: ['Pad', 'Bass'], how: 'Darkens the pad filter, softens its tone and lifts the bass.', simple: true },
  { key: 'movement', name: 'Movement', left: 'Still', right: 'Drifting', color: '#8ce6ff', governs: ['Pad'], how: 'Ensemble drift, filter breathing and how often chords change.', simple: true },
  { key: 'nature', name: 'Texture', left: 'Pure', right: 'Organic', color: '#6bf2c7', governs: ['Environment'], how: 'Level of the ocean, rain or wind bed on releases that have one.', simple: true },
  { key: 'rhythm', name: 'Rhythm', left: 'Free', right: 'Pulsing', color: '#b4b4ff', governs: ['Pulse'], how: 'A soft arpeggio and a gentle breathing of the pad. Zero turns it off.', simple: true },
  { key: 'spatiality', name: 'Space', left: 'Close', right: 'Vast', color: '#8fb0ff', governs: ['Hall', 'Pad'], how: 'Hall and echo levels, stereo width and the length of tails.', simple: true },
  { key: 'brightness', name: 'Brightness', left: 'Soft', right: 'Clear', color: '#d6f6ff', governs: ['Pad', 'Shimmer', 'Keys'], how: 'Opens the pad filter, raises the shimmer and the attack of keys.', simple: false },
  { key: 'density', name: 'Density', left: 'Sparse', right: 'Full', color: '#9de8e0', governs: ['Pad', 'Keys', 'Bells', 'Pulse'], how: 'Voices in each chord and how often phrases, bells and pulses occur.', simple: false },
  { key: 'musicality', name: 'Melody', left: 'Ambient', right: 'Melodic', color: '#c0b8ff', governs: ['Keys', 'Bells'], how: 'How present the melodic keys and bells are against the pad.', simple: false },
];


export const SoundDnaPage: React.FC = () => {
  const { soundDna, updateSoundDna, resetSoundDna, playRecipe, currentRecipe, status } = usePlayer();
  const [wizard, setWizard] = useState(false);
  const [saved, setSaved] = useState(false);

  const visible = SWATCHES.filter((s) => s.simple);
  const playing = status === 'playing';

  const change = (patch: Partial<SoundDNA>) => {
    updateSoundDna(patch);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  if (wizard) {
    return (
      <div className="wrap">
        <Calibration
          onDone={(dna) => {
            if (dna) change(dna);
            setWizard(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="page-head">
        <h1 className="h1">My Sound</h1>
        <p className="descriptor" style={{ marginTop: 14 }}>{SoundDnaService.getDescriptorSummary(soundDna)}</p>
        <div className="toolbar" style={{ marginTop: 28 }}>
          {!playing && (
            <button type="button" className="btn btn--primary btn--small" onClick={() => void playRecipe((currentRecipe ?? flagshipForNow()).id)}>
              <Play size={16} strokeWidth={1.75} /> Play
            </button>
          )}
          <button type="button" className="btn btn--quiet btn--small" onClick={() => setWizard(true)}>
            Ear test
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small"
            onClick={() => {
              resetSoundDna();
              setSaved(true);
            }}
          >
            <RotateCcw size={16} strokeWidth={1.75} /> Reset
          </button>
          <span className="toast" role="status" aria-live="polite">
            {saved ? 'Saved' : ''}
          </span>
        </div>
      </header>

      <div className="dna">
        <div>
          {visible.map((s) => (
            <div
              key={s.key}
              className="swatch"
              style={{ ['--swatch' as string]: s.color }}
            >
              <span className="swatch__chip" aria-hidden="true" />
              <label style={{ display: 'block' }}>
                <span className="control__row">
                  <span className="control__name">{s.name}</span>
                  <span className="control__value">{Math.round(soundDna[s.key] * 100)}</span>
                </span>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={soundDna[s.key]}
                  onChange={(e) => change({ [s.key]: Number(e.target.value) } as Partial<SoundDNA>)}
                  style={{ ['--fill' as string]: `${soundDna[s.key] * 100}%` }}
                />
                <span className="control__ends">
                  <span>{s.left}</span>
                  <span>{s.right}</span>
                </span>

              </label>
            </div>
          ))}


        </div>

      </div>
    </div>
  );
};

const Calibration: React.FC<{ onDone: (dna: SoundDNA | null) => void }> = ({ onDone }) => {
  const { soundDna, playRecipe } = usePlayer();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B'>>({});
  const [auditioning, setAuditioning] = useState<'A' | 'B' | null>(null);
  const pair = CALIBRATION_PAIRS[step];
  const last = step === CALIBRATION_PAIRS.length - 1;

  const audition = async (which: 'A' | 'B') => {
    const opt = which === 'A' ? pair.optionA : pair.optionB;
    setAuditioning(which);
    await playRecipe(opt.sampleRecipeId);
    const recipe = RecipeCatalog.getById(opt.sampleRecipeId);
    if (recipe) {
      AudioEngine.getInstance().updateDna({ ...SoundDnaService.resolveForRecipe(recipe, soundDna), ...opt.dnaOverride });
    }
  };

  const choose = (which: 'A' | 'B') => setAnswers((a) => ({ ...a, [pair.id]: which }));

  return (
    <div className="wizard" style={{ padding: '56px 0' }}>
      <div className="wizard__progress" aria-label={`Question ${step + 1} of ${CALIBRATION_PAIRS.length}`}>
        {CALIBRATION_PAIRS.map((p, i) => (
          <span key={p.id} className={i <= step ? 'is-done' : ''} />
        ))}
      </div>
      <h1 className="h2">{pair.question}</h1>
      <p className="muted">Listen to both at a comfortable volume, then pick the one that feels right. There are no wrong answers.</p>
      <div className="ab">
        {(['A', 'B'] as const).map((w) => {
          const opt = w === 'A' ? pair.optionA : pair.optionB;
          const chosen = answers[pair.id] === w;
          return (
            <div key={w} className={`ab__option${chosen ? ' is-chosen' : ''}`}>
              <h3>{opt.label}</h3>
              <p>{opt.description}</p>
              <div className="toolbar">
                <button type="button" className="btn btn--quiet btn--small" onClick={() => void audition(w)} aria-pressed={auditioning === w}>
                  <Play size={16} strokeWidth={1.75} /> {auditioning === w ? 'Playing' : 'Listen'}
                </button>
                <button type="button" className={`btn btn--small ${chosen ? 'btn--primary' : 'btn--quiet'}`} onClick={() => choose(w)} aria-pressed={chosen}>
                  {chosen && <Check size={16} strokeWidth={1.75} />} This one
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="toolbar">
        <button type="button" className="btn btn--quiet btn--small" onClick={() => (step === 0 ? onDone(null) : setStep(step - 1))}>
          <ChevronLeft size={16} strokeWidth={1.75} /> {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--small"
          disabled={!answers[pair.id]}
          onClick={() => {
            setAuditioning(null);
            if (last) onDone(CalibrationService.calculateCalibratedDna(answers, soundDna));
            else setStep(step + 1);
          }}
        >
          {last ? 'Save my sound' : 'Next'}
        </button>
        <button type="button" className="text-link" onClick={() => onDone(null)}>
          Skip for now
        </button>
      </div>
    </div>
  );
};
