// Show script: sections on the music's bar grid, and the drone fleet that flies them.
import * as F from './formations.js';
import { BAR, SPB } from './music.js';
import { hsl } from './world.js';

export const SECTIONS = [
  { id: 'takeoff', bar: 0 },
  { id: 'sphere', bar: 4 },
  { id: 'wave', bar: 8 },
  { id: 'flower', bar: 12 },
  { id: 'main', bar: 16 },
  { id: 'wish1', bar: 24 },
  { id: 'wish2', bar: 26 },
  { id: 'scene', bar: 28 },
  { id: 'solo', bar: 30 },
  { id: 'build', bar: 34 },
  { id: 'burst', bar: 36 },
  { id: 'thanks', bar: 38 },
  { id: 'reprise', bar: 42 },
  { id: 'landing', bar: 46 }
];
export function sectionAt(bar) {
  let s = SECTIONS[0];
  for (const x of SECTIONS) if (bar >= x.bar) s = x;
  return s;
}

const C = [0, 27, 0];
const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

export const DRONE_COLORS = [[1, 0.93, 0.8], [0.62, 0.78, 1], [1, 0.62, 0.8], [0.56, 0.95, 0.82], [1, 0.8, 0.38]];

/* ---------- formations ---------- */
function makeForm(id, s) {
  const st = fx => fx.st;
  switch (id) {
    case 'ground': return {
      dur: s.quick ? 3 : 6, arc: 0,
      stagger: (i, b) => s.quick ? s.rnd[i] * 0.8 : (b[0] + 40) / 80 * 3 + s.rnd[i] * 0.3,
      make: n => F.groundGrid(n),
      target(i, x, y, z, t, o) { o[0] = x; o[1] = y + Math.sin(t * 0.9 + x * 0.3) * 0.05; o[2] = z; },
      color(i, t, p, o) {
        o[0] = 1; o[1] = 0.8; o[2] = 0.52;
        const rest = 0.2 + 0.1 * Math.sin(t * 1.2 + s.rnd[i] * 6.28);
        o[3] = s.quick ? rest : rest + (1 - p) * 0.7; o[4] = 0.75;
      }
    };
    case 'takeoff': return {
      dur: 6.5, arc: 0,
      stagger: (i, b) => (b[0] + 28) / 56 * 2.2 + s.rnd[i] * 0.4,
      make: n => F.curtain(n),
      target(i, x, y, z, t, o) { o[0] = x + C[0]; o[1] = y + C[1]; o[2] = z + C[2]; },
      color(i, t, p, o, fx) {
        const b = s.base, x = b[3 * i];
        if (p < 1) { o[0] = 1; o[1] = 0.85; o[2] = 0.62; o[3] = 0.25 + 0.75 * p; o[4] = 0.9; return; }
        hsl(0.57 + 0.08 * Math.sin(x * 0.09 - fx.st * 1.4), 0.75, 0.66, o, 0); o[3] = 1; o[4] = 1;
      }
    };
    case 'sphere': return {
      dur: 4, arc: 3,
      make: n => F.sphere(n, 14),
      target(i, x, y, z, t, o, fx) {
        const a = t * 0.45, ca = Math.cos(a), sa = Math.sin(a);
        let X = x * ca + z * sa, Z = -x * sa + z * ca;
        const tl = 0.35, ct = Math.cos(tl), sn = Math.sin(tl);
        let Y = y * ct - Z * sn; Z = y * sn + Z * ct;
        const k = 1 + fx.kick * 0.05;
        o[0] = X * k + C[0]; o[1] = Y * k + C[1]; o[2] = Z * k + C[2];
      },
      color(i, t, p, o, fx) {
        const lat = s.base[3 * i + 1] / 14;
        hsl(0.55 + 0.22 * Math.sin(lat * 3 + t * 0.7), 0.8, 0.6 + fx.kick * 0.12, o, 0); o[3] = 1; o[4] = 1;
      }
    };
    case 'wave': return {
      dur: 4, arc: 2,
      make: n => F.sheet(n, 60, 26),
      target(i, x, y, z, t, o, fx) {
        const h = Math.sin(x * 0.2 + t * 2.0) * 2.4 + Math.cos(z * 0.33 + t * 1.4) * 1.3;
        const a = -0.7, ca = Math.cos(a), sa = Math.sin(a);
        o[0] = x; o[1] = h * ca - z * sa + 24; o[2] = h * sa + z * ca;
        s.h[i] = h;
      },
      color(i, t, p, o, fx) {
        const h = s.h[i] || 0;
        hsl(0.56 - h * 0.012, 0.85, 0.42 + (h + 3.7) / 7.4 * 0.32, o, 0);
        if (fx.hat > 0.4 && hash(i * 31 + Math.floor(t * 10)) < 0.035) { o[0] = o[1] = o[2] = 1; }
        o[3] = 1; o[4] = 1;
      }
    };
    case 'flower': return {
      dur: 3.5, arc: 2,
      make: n => F.flower(n, 15),
      target(i, x, y, z, t, o, fx) {
        const open = 0.22 + 0.78 * (1 - Math.pow(1 - clamp01(fx.st / 5), 3));
        const a = t * 0.12, ca = Math.cos(a), sa = Math.sin(a);
        const k = open * (1 + fx.kick * 0.03);
        o[0] = (x * ca - y * sa) * k + C[0]; o[1] = (x * sa + y * ca) * k + C[1]; o[2] = z + C[2];
      },
      color(i, t, p, o, fx) {
        const b = s.base, rr = Math.hypot(b[3 * i], b[3 * i + 1]) / 15;
        if (rr < 0.17) hsl(0.12, 0.95, 0.6, o, 0);
        else hsl(0.93 - rr * 0.07, 0.75, 0.52 + (1 - rr) * 0.16 + fx.kick * 0.1, o, 0);
        o[3] = 1; o[4] = 1;
      }
    };
    case 'main': case 'reprise': {
      const key = s.shapeKey, whale = key === 'whale' || key === 'whaleMoon';
      return {
        dur: 4, arc: 3, spot: F.spotLocal(key),
        make: n => F.shapePoints(key, n),
        target(i, x, y, z, t, o, fx) {
          let X = x, Y = y, Z = z;
          if (key === 'star') { const a = Math.sin(t * 0.6) * 0.55; X = x * Math.cos(a); Z = z + x * Math.sin(a); }
          else if (key === 'heart') { const k = 1 + fx.kick * 0.07; X = x * k; Y = y * k; }
          else if (whale) {
            const tail = x > 13.5 && y < 6 && !(key === 'whaleMoon' && y > 5);
            if (tail) {
              const jx = 13.5, jy = -2, w = clamp01((x - jx) / 12);
              const a = Math.sin(t * 1.8) * 0.28 * w, ca = Math.cos(a), sa = Math.sin(a);
              X = jx + (x - jx) * ca - (y - jy) * sa; Y = jy + (x - jx) * sa + (y - jy) * ca;
            }
            const moon = key === 'whaleMoon' && x > 13 && y > 5;
            if (!moon) { Y += Math.sin(t * 0.9) * 0.6; X += Math.sin(t * 0.45) * 1.2; }
          }
          o[0] = X + C[0]; o[1] = Y + C[1]; o[2] = Z + C[2];
        },
        color(i, t, p, o, fx) {
          const b = s.base, x = b[3 * i], y = b[3 * i + 1];
          if (id === 'reprise') {
            hsl(0.1 + 0.05 * Math.sin(x * 0.12 - t * 1.6), 0.85, 0.62 + 0.1 * Math.sin(y * 0.3 + t * 2), o, 0);
          } else if (key === 'star') hsl(0.13, 0.9, 0.58 + 0.08 * Math.sin(x + t * 3), o, 0);
          else if (key === 'heart') hsl(0.97, 0.8, 0.56 + fx.kick * 0.14, o, 0);
          else {
            const moon = key === 'whaleMoon' && x > 13 && y > 5;
            if (moon) hsl(0.12, 0.85, 0.66, o, 0);
            else if (y > 8 && x < -6) { const f = 0.7 + 0.3 * Math.sin(t * 9 + i); o[0] = f; o[1] = f; o[2] = 1; }
            else hsl(0.58, 0.7, 0.5 + (y + 7) / 14 * 0.26, o, 0);
          }
          if (hash(i * 7 + Math.floor(t * 6)) < 0.008) { o[0] = o[1] = o[2] = 1; }
          o[3] = 1; o[4] = 1;
        }
      };
    }
    case 'wish1': case 'wish2': case 'scene': {
      const text = id === 'scene' ? s.scene.text : id === 'wish1' ? s.wish1.text : s.wish2.text;
      const mine = id === 'scene' ? s.scene.mine : id === 'wish2' && s.wish2.mine;
      return {
        dur: 2.6, arc: 2,
        stagger: (i, b) => (b[0] + 28) / 56 * 0.8,
        make: n => F.textPoints(text, n),
        target(i, x, y, z, t, o) { o[0] = x + C[0]; o[1] = y + C[1] + Math.sin(x * 0.3 + t * 2) * 0.12; o[2] = z + C[2]; },
        color(i, t, p, o) {
          const x = s.base[3 * i];
          if (mine) hsl(0.11, 0.9, 0.62 + 0.08 * Math.sin(x * 0.2 - t * 3), o, 0);
          else if (id === 'scene') hsl(0.94, 0.55, 0.78, o, 0);
          else hsl(0.1, 0.45, 0.8 + 0.06 * Math.sin(x * 0.2 - t * 2), o, 0);
          o[3] = 1; o[4] = 0.85;
        }
      };
    }
    case 'solo': return {
      dur: 3.5, arc: 0,
      make: n => F.field(n),
      target(i, x, y, z, t, o) {
        o[0] = x + Math.sin(t * 0.3 + s.rnd[i] * 6) * 0.3 + C[0];
        o[1] = y + Math.cos(t * 0.25 + s.rnd[i] * 6) * 0.3 + C[1] + 2;
        o[2] = z + C[2];
      },
      color(i, t, p, o, fx) {
        hsl(0.1, 0.5, 0.76, o, 0); o[4] = 1;
        const darkEnd = 2 * BAR;
        if (fx.st < darkEnd) { o[3] = 0.015 + 0.985 * Math.max(0, 1 - fx.st / 1.6); }
        else {
          const R = (fx.st - darkEnd) * 9, b = s.pos;
          const d = Math.hypot(b[3 * i] - fx.soloX, b[3 * i + 1] - fx.soloY, (b[3 * i + 2] - fx.soloZ) * 0.5);
          o[3] = d < R ? Math.min(1, 0.015 + (R - d) / 4) : 0.015;
        }
        if (i === fx.soloIdx) { o[3] = 1; hsl(0.11, 0.95, 0.66, o, 0); o[4] = 1.7; }
      }
    };
    case 'build': return {
      dur: 2.2, arc: 0,
      make: n => F.spiralParams(n),
      target(i, x, y, z, t, o, fx) {
        const prog = clamp01(fx.st / (2 * BAR));
        const rad = x * (1 - 0.88 * prog), ang = y + t * (0.8 + prog * 6);
        o[0] = Math.cos(ang) * rad + C[0];
        o[1] = z * (1 - 0.7 * prog) + C[1] + prog * 6;
        o[2] = Math.sin(ang) * rad + C[2];
      },
      color(i, t, p, o, fx) {
        hsl(s.base[3 * i + 1] / 6.283 + t * 0.4, 0.85, 0.6 + fx.kick * 0.1, o, 0); o[3] = 1; o[4] = 1;
      }
    };
    case 'burst': {
      const starts = [0, 2 * SPB, 4 * SPB], hues = [0.12, 0.93, 0.52];
      return {
        dur: 0.9, arc: 0,
        make: n => F.burstSeeds(n),
        target(i, x, y, z, t, o, fx) {
          const g = s.group(i), sv = fx.st - starts[g];
          if (sv <= 0) { o[0] = x; o[1] = y; o[2] = z; return; }
          const V = 10 + s.rnd[i] * 5, k = 1.5, d = V * (1 - Math.exp(-k * sv)) / k;
          const dir = s.dir;
          o[0] = x + dir[3 * i] * d; o[1] = y + dir[3 * i + 1] * d - 0.45 * sv * sv; o[2] = z + dir[3 * i + 2] * d;
        },
        color(i, t, p, o, fx) {
          const g = s.group(i), sv = fx.st - starts[g];
          if (sv <= 0) { hsl(hues[g], 0.9, 0.7, o, 0); o[3] = 0; o[4] = 0.6; return; }
          hsl(hues[g], 0.9, 0.62 + 0.38 * Math.exp(-sv * 4), o, 0);
          let a = Math.exp(-Math.max(0, sv - 0.7) * 0.6);
          if (sv > 1.5 && hash(i * 13 + Math.floor(t * 14)) < 0.25) { a = Math.min(1, a * 2.2); o[0] = o[1] = o[2] = 1; }
          o[3] = a; o[4] = 1.1;
        }
      };
    }
    case 'thanks': return {
      dur: 3.2, arc: 2,
      stagger: (i, b) => (b[0] + 28) / 56 * 1.0,
      make: n => F.textPoints('오늘도 수고했어요', n),
      target(i, x, y, z, t, o) { o[0] = x + C[0]; o[1] = y + C[1] + Math.sin(x * 0.25 + t * 1.6) * 0.1; o[2] = z + C[2]; },
      color(i, t, p, o) { hsl(0.1, 0.55, 0.74 + 0.08 * Math.sin(s.base[3 * i] * 0.2 - t * 2), o, 0); o[3] = 1; o[4] = 0.85; }
    };
  }
  return null;
}

/* ---------- fleet ---------- */
export class Fleet {
  constructor(geo, cap) {
    this.geo = geo; this.cap = cap;
    this.pos = geo.attributes.position.array;
    this.col = geo.attributes.aColor.array;
    this.alpha = geo.attributes.aAlpha.array;
    this.size = geo.attributes.aSize.array;
    this.from = new Float32Array(cap * 3);
    this.base = new Float32Array(cap * 3);
    this.delay = new Float32Array(cap);
    this.rnd = new Float32Array(cap);
    this.dir = new Float32Array(cap * 3);
    this.h = new Float32Array(cap);
    this.N = 0;
    this.form = null; this.t0 = 0;
    this.baseSize = 0.9;
    for (let i = 0; i < cap; i++) {
      this.rnd[i] = hash(i * 977 + 3);
      const u = hash(i * 131 + 7) * 2 - 1, th = hash(i * 71 + 11) * Math.PI * 2, rr = Math.sqrt(1 - u * u);
      this.dir[3 * i] = Math.cos(th) * rr; this.dir[3 * i + 1] = u; this.dir[3 * i + 2] = Math.sin(th) * rr;
    }
    this.o = new Float32Array(3);
    this.c = new Float32Array(5);
    this.groupOf = new Uint8Array(cap);
  }

  setCount(n) {
    for (let i = this.N; i < n; i++) {
      this.pos[3 * i] = (this.rnd[i] - 0.5) * 70;
      this.pos[3 * i + 1] = -1;
      this.pos[3 * i + 2] = 4 - hash(i * 5 + 1) * 30;
      this.alpha[i] = 0;
    }
    this.N = n;
    this.geo.setDrawRange(0, n);
    this.baseSize = Math.max(0.5, Math.min(1.05, 1.05 * Math.sqrt(1600 / Math.max(1, n))));
  }

  // state: { me, shapeKey, wish1, wish2, scene, friend, quick }
  setFormation(id, t, state) {
    const N = this.N, pos = this.pos;
    const s = Object.assign({ rnd: this.rnd, dir: this.dir, h: this.h, base: this.base, pos: this.pos, group: i => this.groupOf[i] }, state);
    const form = makeForm(id, s);
    this.from.set(pos.subarray(0, N * 3));
    const me = state.me, useSpot = !!(form.spot && me.launched && me.spot);
    const idx = [];
    for (let i = 0; i < N; i++) { if (i === 0 && (!me.launched || useSpot)) continue; idx.push(i); }
    const n = idx.length;
    const pts = form.make(n);
    const order = new Array(n);
    for (let k = 0; k < n; k++) order[k] = k;
    order.sort((a, b) => (pts[3 * a] - pts[3 * b]) || (pts[3 * a + 1] - pts[3 * b + 1]));
    idx.sort((a, b) => (pos[3 * a] - pos[3 * b]) || (pos[3 * a + 1] - pos[3 * b + 1]));
    for (let k = 0; k < n; k++) {
      const i = idx[k], p = order[k];
      this.base[3 * i] = pts[3 * p]; this.base[3 * i + 1] = pts[3 * p + 1]; this.base[3 * i + 2] = pts[3 * p + 2];
      this.groupOf[i] = p % 3;
    }
    if (useSpot) { this.base[0] = form.spot[0]; this.base[1] = form.spot[1]; this.base[2] = form.spot[2]; this.groupOf[0] = 0; }
    if (!me.launched) { this.base[0] = this.from[0]; this.base[1] = this.from[1]; this.base[2] = this.from[2]; }
    if (id === 'ground' && me.launched && state.friend && N > 2) this.placeBeside(1, 0, F.groundGap(n));
    const b = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      b[0] = this.base[3 * i]; b[1] = this.base[3 * i + 1]; b[2] = this.base[3 * i + 2];
      this.delay[i] = form.stagger ? form.stagger(i, b) : this.rnd[i] * 0.7;
    }
    this.form = form; this.formId = id; this.t0 = t; this.state = s;
  }

  // Move drone `who` to the grid slot next to drone `anchor` by swapping with its occupant.
  placeBeside(anchor, who, gap) {
    const bx = this.base[3 * anchor] + gap, bz = this.base[3 * anchor + 2];
    let best = -1, bd = Infinity;
    for (let i = 2; i < this.N; i++) {
      const d = Math.abs(this.base[3 * i] - bx) + Math.abs(this.base[3 * i + 2] - bz);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    for (let k = 0; k < 3; k++) { const tmp = this.base[3 * who + k]; this.base[3 * who + k] = this.base[3 * best + k]; this.base[3 * best + k] = tmp; }
  }

  update(t, fx, me) {
    const form = this.form; if (!form) return;
    const N = this.N, pos = this.pos, o = this.o, c = this.c, base = this.base, from = this.from;
    const el = t - this.t0, dur = form.dur, arc = form.arc || 0, bs = this.baseSize;
    for (let i = 0; i < N; i++) {
      form.target(i, base[3 * i], base[3 * i + 1], base[3 * i + 2], t, o, fx);
      const p = dur > 0 ? clamp01((el - this.delay[i]) / dur) : 1;
      if (p < 1) {
        const e = ease(p);
        pos[3 * i] = from[3 * i] + (o[0] - from[3 * i]) * e;
        pos[3 * i + 1] = from[3 * i + 1] + (o[1] - from[3 * i + 1]) * e;
        pos[3 * i + 2] = from[3 * i + 2] + (o[2] - from[3 * i + 2]) * e + Math.sin(Math.PI * p) * arc;
      } else { pos[3 * i] = o[0]; pos[3 * i + 1] = o[1]; pos[3 * i + 2] = o[2]; }
      form.color(i, t, p, c, fx);
      this.col[3 * i] = c[0]; this.col[3 * i + 1] = c[1]; this.col[3 * i + 2] = c[2];
      this.alpha[i] = c[3]; this.size[i] = c[4] * bs;
    }
    if (N > 0) {
      if (!me.launched) this.alpha[0] = 0;
      else if (this.formId !== 'solo' && this.formId !== 'burst') {
        const gold = me.spot && (this.formId === 'main' || this.formId === 'reprise');
        const col = gold ? DRONE_COLORS[4] : DRONE_COLORS[me.color];
        this.col[0] = col[0]; this.col[1] = col[1]; this.col[2] = col[2];
        this.alpha[0] = 1; this.size[0] = bs * (gold ? 2.2 : 1.5);
      }
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aAlpha.needsUpdate = true; a.aSize.needsUpdate = true;
  }
}
