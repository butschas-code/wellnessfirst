/**
 * Wellness Waves — keep playing like a real player.
 *
 * Phones only keep a page's sound alive in the background (screen locked,
 * another app open, browser minimised) when it plays through a media element.
 * So the finished Web Audio mix is routed into a MediaStream and played by an
 * <audio> element, which also gives the lock screen its controls. If the
 * element cannot play, the mix goes straight to the speakers as before.
 *
 * The scheduler tick runs in a Worker: background tabs throttle page timers
 * hard, workers much less. The engine also schedules further ahead while hidden.
 */

import { Logger } from '../lib/logger';

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export class MediaOutput {
  readonly element: HTMLAudioElement | null = null;
  private routed = false;
  private externalListeners = new Set<(playing: boolean) => void>();
  /** Our own play()/pause() calls: their events are not "external". */
  private expect: { play: boolean; pause: boolean } = { play: false, pause: false };

  constructor(
    private ctx: AudioContext,
    private source: AudioNode
  ) {
    // Safari 16.4+: treat this page's sound as media playback (ignores the
    // silent switch, continues with the screen locked).
    try {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      // not supported
    }

    const forceDirect = (() => {
      try {
        return localStorage.getItem('wellness_waves_audio_direct') === '1';
      } catch {
        return false;
      }
    })();
    const canStream = typeof ctx.createMediaStreamDestination === 'function' && 'srcObject' in HTMLMediaElement.prototype;

    if (canStream && !forceDirect) {
      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      const el = document.createElement('audio');
      el.setAttribute('playsinline', '');
      el.setAttribute('aria-hidden', 'true');
      el.preload = 'auto';
      el.srcObject = dest.stream;
      el.style.display = 'none';
      // Outside <body>: the site swaps <body> on soft navigation, which would stop the sound.
      document.documentElement.appendChild(el);
      // The OS (lock screen, headphones unplugged, a call) can pause or resume the element.
      el.addEventListener('pause', () => this.external('pause'));
      el.addEventListener('play', () => this.external('play'));
      this.element = el;
      this.routed = true;
    } else {
      source.connect(ctx.destination);
    }
  }

  private external(kind: 'play' | 'pause'): void {
    if (this.expect[kind]) {
      this.expect[kind] = false;
      return;
    }
    this.externalListeners.forEach((l) => l(kind === 'play'));
  }

  /** Called when something outside the app pauses or resumes playback. */
  onExternalChange(listener: (playing: boolean) => void): () => void {
    this.externalListeners.add(listener);
    return () => this.externalListeners.delete(listener);
  }

  /** Starts the element. Call synchronously inside the user's tap the first time. */
  play(): void {
    const el = this.element;
    if (!el || !this.routed || !el.paused) return;
    this.expect.play = true;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.catch((e) => {
        this.expect.play = false;
        // Could not start media playback: fall back to direct output so sound still plays.
        Logger.warn('Media element playback refused; using direct output', { error: String(e) });
        this.fallBack();
      });
    }
  }

  pause(): void {
    if (!this.element || !this.routed || this.element.paused) return;
    this.expect.pause = true;
    this.element.pause();
  }

  private fallBack(): void {
    if (!this.routed) return;
    this.routed = false;
    try {
      this.source.connect(this.ctx.destination);
    } catch {
      // ignore
    }
  }

  get backgroundCapable(): boolean {
    return this.routed;
  }
}

/** A steady tick that survives background throttling better than window timers. */
export function startClock(intervalMs: number, tick: () => void): () => void {
  try {
    const src = `let id=null;onmessage=(e)=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = tick;
    worker.postMessage(intervalMs);
    // Window timer as a second source: whichever fires, scheduling is idempotent.
    const id = window.setInterval(tick, intervalMs);
    return () => {
      worker.postMessage(0);
      worker.terminate();
      clearInterval(id);
    };
  } catch {
    const id = window.setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }
}
