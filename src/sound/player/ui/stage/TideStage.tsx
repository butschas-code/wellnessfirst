/**
 * Stage renderer — a lotus of light on a near-black night (Wellness First).
 *
 * One fixed WebGL canvas behind every route: three rings of overlapping petal outlines
 * turning slowly in opposite directions and opening and closing on their own
 * phases, so the bloom never visibly repeats. It eases between space palettes
 * and placements, breathes with the music's smoothed level, sends a soft
 * soft wave outward on each chord change, and mirrors a running frequency
 * program's slow swells (< 1 Hz only: faster visual flicker is a photosensitivity
 * hazard, so faster program rates are never flashed). Renders at device
 * resolution (capped for battery) so the petal lines stay crisp, ≤ 30 fps, pauses in hidden tabs,
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
const float PI = 3.14159265;
const vec3 CREAM = vec3(.957, .937, .902);
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
// Signed distance to a leaf (vesica) lying along +x, half-length hl, half-width hw.
float leaf(vec2 q, float hl, float hw){
  float rr = (hl * hl / hw + hw) * .5, dd = (hl * hl / hw - hw) * .5;
  vec2 v = abs(vec2(q.y, q.x));
  return ((v.y - hl) * dd > v.x * hl) ? length(v - vec2(0., hl)) : length(v - vec2(-dd, 0.)) - rr;
}
// One ring of k overlapping petals turned by rot: x = distance to the nearest outline, y = signed (inside < 0).
// Only the petal under the point and its two neighbours are evaluated; the angle wraps, so it is seamless.
vec2 bloom(vec2 p, float k, float rot, float base, float hl, float hw){
  float sec = 6.2831853 / k;
  float i0 = floor((atan(p.y, p.x) - rot) / sec + .5);
  float edge = 1e3, inside = 1e3;
  for (int j = -1; j <= 1; j++) {
    float ang = (i0 + float(j)) * sec + rot;
    float c = cos(ang), s = sin(ang);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) - vec2(base + hl, 0.);
    float d = leaf(q, hl, hw);
    edge = min(edge, abs(d));
    inside = min(inside, d);
  }
  return vec2(edge, inside);
}
// Outline at distance d: a crisp, pixel-antialiased core (half-width w) plus a tight glow.
// px is one device pixel in p units, so the edge stays sharp at any resolution.
vec2 line(float d, float w, float px){
  float core = 1. - smoothstep(w, w + 1.6 * px, d);
  return vec2(core, exp(-d * 90.) * .32 + exp(-d * 22.) * .08);
}
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = (gl_FragCoord.xy - r * CENTER) / r.y;
  // Slow float, well under 1 Hz.
  p -= vec2(sin(t * .11) + .4 * sin(t * .27 + 1.3), cos(t * .09) + .4 * cos(t * .21 + .7)) * R * .03;
  float L = length(p);
  float a = atan(p.y, p.x);
  vec2 cd = vec2(cos(a), sin(a));

  // Night: near-black with a faint tint of the space's light gathered behind the bloom.
  float px = 1. / r.y;
  vec3 col = DEEP;
  col += MID * exp(-L * L / (R * R * 5.)) * DIM;
  float mist = fbm(p * 2.2 + vec2(t * .018, -t * .014));
  col += C * .018 * smoothstep(.45, .95, mist) * exp(-L / (R * 2.6)) * DIM;

  float beat = .5 + .5 * sin(t * PULSE * .9);
  float open = 1. + .045 * beat + .08 * SWELL;
  float bright = (.55 + .55 * SWELL) * (.85 + .25 * beat) * (1. + SHIM) * DIM * LIGHT;
  float wob = (fbm(cd * 1.2 + vec2(t * .05, -t * .04)) - .5) * .008;

  // Three rings of petals turning slowly in opposite directions, each opening and closing on its own phase.
  vec2 b1 = bloom(p, 8., t * .017, R * .06, R * .47 * open * (1. + .035 * sin(t * .23)), R * .17);
  vec2 b2 = bloom(p, 8., PI / 8. - t * .023, R * .04, R * .36 * open * (1. + .045 * sin(t * .19 + 2.1)), R * .15);
  vec2 b3 = bloom(p, 6., t * .031, R * .02, R * .22 * open * (1. + .055 * sin(t * .29 + 4.)), R * .1);
  vec2 l1 = line(b1.x + wob, .0011, px);
  vec2 l2 = line(b2.x + wob * .8, .001, px);
  vec2 l3 = line(b3.x + wob * .6, .0009, px);
  vec3 c1 = C;
  vec3 c2 = mix(C, CREAM, .3);
  vec3 c3 = mix(C, CREAM, .6);
  float vary = .8 + .35 * fbm(cd * 2. + vec2(t * .06, 7.));
  col += (c1 * (l1.x * 1.05 + l1.y * .7) + c2 * (l2.x * 1. + l2.y * .62) + c3 * (l3.x * .95 + l3.y * .5)) * bright * vary;
  // Soft petal bodies: light pools inside each ring, densest where rings overlap.
  col += C * .022 * (smoothstep(0., -.08, b1.y) + smoothstep(0., -.06, b2.y) + smoothstep(0., -.04, b3.y)) * DIM * LIGHT;
  // A quiet seed of light at the heart.
  col += mix(C, CREAM, .5) * exp(-L * L / (R * R * .02)) * .07 * bright;
  // Keep the very centre calm so the play / pause mark stays readable.
  col *= .45 + .55 * smoothstep(R * .05, R * .3, L);

  // Chord change: a soft petal-shaped wave travelling outward.
  if (RIP >= 0. && RIP < 1.) {
    float rr = R * (1. + RIP * .34);
    col += C * exp(-pow((L - rr) / .007, 2.)) * (1. - RIP) * .25 * DIM * LIGHT;
  }
  col *= smoothstep(1.5, .2, length(uv - vec2(.5, .52)));
  col += (h(gl_FragCoord.xy + fract(t) * 91.) - .5) * .012;
  gl_FragColor = vec4(max(col, 0.), 1.);
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
      // The petals are fine lines, so render at the screen's own resolution (capped for battery);
      // a low-res canvas stretched by CSS blurs them. Video/shorts production renders up to 1080p.
      let dpr = Math.min(isVideoStage ? 1 : 2, window.devicePixelRatio || 1);
      const maxArea = isVideoStage ? 2073600 : 1800000;
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
