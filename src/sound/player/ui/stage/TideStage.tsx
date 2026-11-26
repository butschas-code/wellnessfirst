/**
 * Tide stage renderer — deep water with a ring of its own light.
 *
 * One fixed WebGL canvas behind every route. It eases between depths (space
 * palettes) and ring placements, breathes with the music's smoothed level,
 * sends a ripple outward on each chord change, and mirrors a running frequency
 * program's slow swells (< 1 Hz only: faster visual flicker is a photosensitivity
 * hazard, so faster program rates are never flashed). Renders at reduced
 * resolution (the image is soft by nature), ≤ 30 fps, pauses in hidden tabs,
 * and holds a still frame under prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react';
import { AudioEngine } from '../../../engine/audio/engine';
import { DEPTHS } from './palette';
import { MODES, MODES_PORTRAIT, current, ringPlacement, subscribe } from './stage';

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';

const FRAG = `
precision highp float;
uniform vec2 r; uniform float t;
uniform vec3 C, DEEP, MID;
uniform vec2 CENTER; uniform float R, LIGHT, DIM, PULSE, SWELL, RIP, SHIM;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  float aspect = r.x / r.y;
  vec2 q = uv * vec2(aspect, 1.);
  // Water: depth gradient, a slow shaft of light, caustic shimmer near the surface.
  vec3 col = mix(DEEP, MID, smoothstep(0., 1., uv.y));
  float cx = CENTER.x * aspect + .14 * sin(t * .06);
  float d = abs(q.x - cx - (1. - uv.y) * .22);
  float shaft = exp(-d * d * 7.) * smoothstep(.1, 1., uv.y);
  float rays = fbm(vec2(q.x * 3. - (1. - uv.y) * 1.1, t * .07));
  col += C * .2 * shaft * (.3 + .7 * rays) * DIM;
  float cau = fbm(q * vec2(5., 11.) + vec2(t * .04, t * .09));
  col += C * .14 * pow(cau, 3.) * smoothstep(.55, 1., uv.y) * DIM;
  // The ring: seamless liquid light (noise sampled around a circle).
  // The ring drifts a little, like something floating (slow, well under 1 Hz).
  vec2 drift = vec2(sin(t * .13) + .5 * sin(t * .31 + 1.3), cos(t * .11) + .5 * cos(t * .23 + .7)) * R * .045;
  vec2 p = (gl_FragCoord.xy - r * CENTER) / r.y - drift;
  float a = atan(p.y, p.x);
  vec2 cd = vec2(cos(a), sin(a));
  float beat = .5 + .5 * sin(t * PULSE * 1.6);
  float wob = (fbm(cd * 1.3 + vec2(t * .08, -t * .06)) - .5) * .04;
  float rad = R * (1. + .04 * beat + .09 * SWELL) + wob;
  float dist = length(p) - rad;
  float core = exp(-pow(dist / .0075, 2.));
  float halo = exp(-abs(dist) * 30.) * .42 + exp(-abs(dist) * 8.) * .18 + exp(-abs(dist) * 2.5) * .06;
  float bright = (.5 + .6 * SWELL) * (.8 + .32 * beat) * (1. + SHIM) * DIM * LIGHT;
  float vary = .78 + .4 * fbm(cd * 2. + vec2(t * .07, 7.));
  col += C * (core * .95 + halo) * bright * vary;
  col += vec3(1.) * core * .16 * bright;
  // Chord ripple travelling outward.
  if (RIP >= 0. && RIP < 1.) {
    float ripple = exp(-pow((length(p) - rad - RIP * .38) / .006, 2.)) * (1. - RIP) * .38;
    col += C * ripple * DIM * LIGHT;
  }
  col += C * .05 * smoothstep(rad, 0., length(p)) * DIM * LIGHT;
  col *= smoothstep(1.45, .25, length(uv - vec2(.5, .55)));
  col += (h(gl_FragCoord.xy + fract(t) * 91.) - .5) * .014;
  gl_FragColor = vec4(col, 1.);
}`;

type V3 = [number, number, number];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export const TideStage: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      document.documentElement.classList.add('no-gl');
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      document.documentElement.classList.add('no-gl');
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      r: U('r'), t: U('t'), C: U('C'), DEEP: U('DEEP'), MID: U('MID'), CENTER: U('CENTER'),
      R: U('R'), LIGHT: U('LIGHT'), DIM: U('DIM'), PULSE: U('PULSE'), SWELL: U('SWELL'), RIP: U('RIP'), SHIM: U('SHIM'),
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const engine = AudioEngine.getInstance();
    const init = current();
    const s = {
      glow: [...DEPTHS[init.depth].glow] as V3,
      deep: [...DEPTHS[init.depth].deep] as V3,
      mid: [...DEPTHS[init.depth].mid] as V3,
      dim: DEPTHS[init.depth].dim,
      pulse: DEPTHS[init.depth].pulse,
      ...MODES[init.mode],
    };
    let rippleAt = -10;
    let lastChord: string | undefined;
    let shimRate = 0;
    let breathScale = 1;
    let raf = 0;
    let last = 0;
    let lastPoll = 0;
    const t0 = performance.now();

    const frame = (now: number, force = false) => {
      raf = requestAnimationFrame((n) => frame(n));
      // Battery: ~24 fps while playing, ~8 fps when still; nothing while hidden.
      const playing = engine.isPlaying();
      if (!force && (document.hidden || now - last < (playing ? 41 : 120))) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      const target = current();
      const pal = DEPTHS[target.depth];
      const tall = cv.clientHeight > cv.clientWidth * 1.05;
      const base = (tall ? MODES_PORTRAIT : MODES)[target.mode];
      const hp = ringPlacement(target.mode);
      // The shader's y runs from the bottom; Home measures from the top.
      const mode = hp ? { ...base, y: 1 - hp.y, r: hp.r } : base;
      // Frame-by-frame exports may pass a fixed step so depth and placement still ease (explainer shorts).
      const exportDt = (window as unknown as { __EXPORT_DT__?: number }).__EXPORT_DT__;
      const ease = (tau: number) => (exportDt ? 1 - Math.exp(-exportDt / tau) : reduce.matches || force ? 1 : 1 - Math.exp(-dt / tau));
      const k = ease(0.9);
      s.glow = lerp3(s.glow, pal.glow, k);
      s.deep = lerp3(s.deep, pal.deep, k);
      s.mid = lerp3(s.mid, pal.mid, k);
      s.dim = lerp(s.dim, pal.dim, k);
      s.pulse = lerp(s.pulse, pal.pulse, k);
      const km = ease(0.7);
      s.x = lerp(s.x, mode.x, km);
      s.y = lerp(s.y, mode.y, km);
      s.r = lerp(s.r, mode.r, km);
      s.light = lerp(s.light, mode.light, km);
      const exportTime = (window as unknown as { __EXPORT_TIME__?: number }).__EXPORT_TIME__;
      const time = exportTime !== undefined ? exportTime : (now - t0) / 1000;
      // Follow the composer a few times a second.
      if (now - lastPoll > 500) {
        lastPoll = now;
        const chord = engine.getDiagnostics().currentChord;
        if (chord && lastChord && chord !== lastChord) rippleAt = time;
        lastChord = chord;
        const prog = engine.getProgramStatus();
        const step = prog.state === 'active' ? prog.step?.step : undefined;
        // Only slow swells are mirrored literally; never flash faster than 1 Hz.
        shimRate = step && step.method === 'swell' && step.renderedHz <= 1 ? step.renderedHz : 0;
      }
      const level = engine.getLevel();
      const shim = shimRate > 0 ? 0.12 * Math.sin(2 * Math.PI * shimRate * time) : 0;

      const isVideoStage = exportTime !== undefined || window.location.pathname.includes('/video') || window.location.pathname.includes('/short');
      // Soft light needs few pixels: render small (≤ ~160k px) and let CSS scale it up during normal app use.
      // During video/shorts production, render at full high-resolution (up to 1080p/4k).
      let dpr = Math.min(1.5, window.devicePixelRatio || 1) * (isVideoStage ? 1.0 : 0.5);
      const maxArea = isVideoStage ? 2073600 : 160000;
      const area = cv.clientWidth * cv.clientHeight * dpr * dpr;
      if (area > maxArea) dpr *= Math.sqrt(maxArea / area);
      const w = Math.max(2, Math.round(cv.clientWidth * dpr));
      const h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
        gl.viewport(0, 0, w, h);
      }
      // Breath techniques: the ring grows on the in-breath and settles on the out (< 1 Hz).
      const breath = reduce.matches ? null : engine.getWellnessStatus().breath;
      const want = breath ? 0.93 + 0.14 * breath.value : 1;
      breathScale = lerp(breathScale, want, 1 - Math.exp(-dt / 0.25));
      const rScale = breathScale;
      gl.uniform2f(u.r, w, h);
      gl.uniform1f(u.t, reduce.matches ? 30 : time + 20);
      gl.uniform3fv(u.C, s.glow);
      gl.uniform3fv(u.DEEP, s.deep);
      gl.uniform3fv(u.MID, s.mid);
      gl.uniform2f(u.CENTER, s.x, s.y);
      gl.uniform1f(u.R, s.r * rScale);
      gl.uniform1f(u.LIGHT, s.light);
      gl.uniform1f(u.DIM, s.dim);
      // In video/export mode, emit an outward pulse of light every 15.0 seconds (travels for 4.8s)
      const ripVal = isVideoStage
        ? ((time % 15.0) / 4.8 < 1.0 ? (time % 15.0) / 4.8 : -1)
        : (reduce.matches ? -1 : (time - rippleAt) / 5);
      // Synchronized calm breathing swell (5.0s period, exactly 3 breath cycles per 15s)
      const swellVal = isVideoStage
        ? 0.45 + 0.15 * Math.sin(time * 1.256637)
        : (reduce.matches ? 0.4 : level);

      gl.uniform1f(u.SWELL, swellVal);
      gl.uniform1f(u.RIP, ripVal);
      gl.uniform1f(u.SHIM, reduce.matches ? 0 : shim);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (reduce.matches) cancelAnimationFrame(raf);
    };

    raf = requestAnimationFrame((n) => frame(n, true));
    (window as unknown as { __RENDER_STAGE_FRAME__?: (t: number) => void }).__RENDER_STAGE_FRAME__ = (t: number) => {
      (window as unknown as { __EXPORT_TIME__?: number }).__EXPORT_TIME__ = t;
      frame(performance.now(), true);
    };
    // Under reduced motion, repaint only when the target changes.
    const unsub = subscribe(() => {
      if (reduce.matches) requestAnimationFrame((n) => frame(n, true));
    });
    const onVis = () => {
      if (!document.hidden && !reduce.matches) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame((n) => frame(n));
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="tide-stage" aria-hidden="true" />;
};
