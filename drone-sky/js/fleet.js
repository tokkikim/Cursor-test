// Drone fleet with show-drone flight rules:
// - every transition is planned so all drones leave and arrive together,
// - minimum-jerk speed profile (smooth take-off and stop),
// - peak speed capped near real show speeds (1 unit = 4 m, VMAX 1.4 u/s = 5.6 m/s),
// - drones are paired with nearby target slots to keep flights short.
import { C } from './scenes.js';

export const VMAX = 1.4;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const minJerk = u => u * u * u * (10 + u * (-15 + 6 * u));
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

function part1by1(v) { v &= 0x3ff; v = (v | (v << 8)) & 0x00ff00ff; v = (v | (v << 4)) & 0x0f0f0f0f; v = (v | (v << 2)) & 0x33333333; v = (v | (v << 1)) & 0x55555555; return v; }
// Morton keys on the two widest axes of a point set (z is flipped so "near" maps to "low").
function mortonKeys(xs, ys, zs, n) {
  const ax = [xs, ys, zs], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = ax[k][i]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  const ext = [0, 1, 2].map(k => hi[k] - lo[k]);
  const order = [0, 1, 2].sort((a, b) => ext[b] - ext[a]);
  const a1 = order[0], a2 = order[1];
  const keys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let u = ext[a1] > 1e-6 ? (ax[a1][i] - lo[a1]) / ext[a1] : 0.5;
    let v = ext[a2] > 1e-6 ? (ax[a2][i] - lo[a2]) / ext[a2] : 0.5;
    if (a1 === 2) u = 1 - u;
    if (a2 === 2) v = 1 - v;
    keys[i] = part1by1(Math.round(u * 1023)) | (part1by1(Math.round(v * 1023)) << 1);
  }
  return keys;
}

export class Fleet {
  constructor(geo, cap) {
    this.geo = geo; this.cap = cap;
    this.pos = geo.attributes.position.array;
    this.col = geo.attributes.aColor.array;
    this.alpha = geo.attributes.aAlpha.array;
    this.size = geo.attributes.aSize.array;
    this.from = new Float32Array(cap * 3);
    this.base = new Float32Array(cap * 3);
    this.tag = new Uint8Array(cap);
    this.prm = new Float32Array(cap);
    this.prevCol = new Float32Array(cap * 3);
    this.prevA = new Float32Array(cap);
    this.N = 0; this.def = null; this.t0 = 0; this.T = 0;
    this.baseSize = 0.9;
    this.o = new Float32Array(3); this.c = new Float32Array(5);
  }

  setCount(n) {
    for (let i = this.N; i < n; i++) {
      this.pos[3 * i] = (hash(i * 3 + 1) - 0.5) * 70;
      this.pos[3 * i + 1] = -1;
      this.pos[3 * i + 2] = 4 - hash(i * 5 + 1) * 30;
      this.alpha[i] = 0;
    }
    this.N = n;
    this.geo.setDrawRange(0, n);
    this.baseSize = Math.max(0.5, Math.min(1.05, 1.05 * Math.sqrt(1600 / Math.max(1, n))));
  }

  // def: scene definition; shape: {pts, tag, prm} for the participating drones (local coords unless def.absolute)
  setScene(def, shape, t, me, opts = {}) {
    const N = this.N, pos = this.pos;
    this.from.set(pos.subarray(0, N * 3));
    this.prevCol.set(this.col.subarray(0, N * 3));
    this.prevA.set(this.alpha.subarray(0, N));
    this.def = def; this.t0 = t;
    const cx = def.absolute ? 0 : C[0], cy = def.absolute ? 0 : C[1], cz = def.absolute ? 0 : C[2];

    if (shape) {
      const useSpot = !!(def.spot && me.launched && me.spot && opts.spot);
      const idx = [];
      for (let i = 0; i < N; i++) { if (i === 0 && (!me.launched || useSpot)) continue; idx.push(i); }
      const n = idx.length, p = shape.pts;
      // pair by locality
      const sx = new Float32Array(n), sy = new Float32Array(n), sz = new Float32Array(n);
      for (let k = 0; k < n; k++) { const i = idx[k]; sx[k] = pos[3 * i]; sy[k] = pos[3 * i + 1]; sz[k] = pos[3 * i + 2]; }
      const dx = new Float32Array(n), dy = new Float32Array(n), dz = new Float32Array(n);
      for (let k = 0; k < n; k++) { dx[k] = p[3 * k] + cx; dy[k] = p[3 * k + 1] + cy; dz[k] = p[3 * k + 2] + cz; }
      const ks = mortonKeys(sx, sy, sz, n), kd = mortonKeys(dx, dy, dz, n);
      const os = Array.from({ length: n }, (_, k) => k).sort((a, b) => ks[a] - ks[b]);
      const od = Array.from({ length: n }, (_, k) => k).sort((a, b) => kd[a] - kd[b]);
      const asg = new Int32Array(n);                 // source k -> target index
      for (let j = 0; j < n; j++) asg[os[j]] = od[j];
      // shorten flights with random pairwise swaps
      const d2 = (k, m) => { const x = sx[k] - dx[m], y = sy[k] - dy[m], z = sz[k] - dz[m]; return x * x + y * y + z * z; };
      const iters = Math.min(260000, n * 45);
      let seed = 12345;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let it = 0; it < iters; it++) {
        const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
        if (a === b) continue;
        const ta = asg[a], tb = asg[b];
        if (d2(a, tb) + d2(b, ta) < d2(a, ta) + d2(b, tb)) { asg[a] = tb; asg[b] = ta; }
      }
      let maxD = 0;
      for (let k = 0; k < n; k++) {
        const i = idx[k], m = asg[k];
        this.base[3 * i] = p[3 * m]; this.base[3 * i + 1] = p[3 * m + 1]; this.base[3 * i + 2] = p[3 * m + 2];
        this.tag[i] = shape.tag[m]; this.prm[i] = shape.prm[m];
        maxD = Math.max(maxD, Math.sqrt(d2(k, m)));
      }
      if (useSpot) {
        const sp = opts.spot;
        this.base[0] = sp[0]; this.base[1] = sp[1]; this.base[2] = sp[2]; this.tag[0] = 0; this.prm[0] = (sp[0] + 28) / 56;
        maxD = Math.max(maxD, Math.hypot(pos[0] - sp[0] - cx, pos[1] - sp[1] - cy, pos[2] - sp[2] - cz));
      }
      if (!me.launched) { this.base[0] = pos[0] - cx; this.base[1] = pos[1] - cy; this.base[2] = pos[2] - cz; }
      this.maxD = maxD;
      const slot = opts.slot || 40;
      const tcap = def.tcap ? Math.min(def.tcap, slot * 0.95) : Math.min(26, slot * 0.72);
      this.T = Math.max(def.tmin || 4, Math.min(tcap, 1.875 * maxD / VMAX));
    } else {
      this.T = 1.5;     // keep the layout, only the light programme changes
      this.maxD = 0;
    }
    if (opts.instant) this.t0 = t - this.T - 0.01;
  }

  update(t, st, fx, me) {
    const def = this.def; if (!def) return;
    const N = this.N, pos = this.pos, o = this.o, c = this.c, base = this.base, from = this.from;
    const p = this.T > 0 ? clamp01((t - this.t0) / this.T) : 1, e = minJerk(p);
    const kc = clamp01(p * 1.8), dim = 1 - 0.3 * Math.sin(Math.PI * p);
    const cx = def.absolute ? 0 : C[0], cy = def.absolute ? 0 : C[1], cz = def.absolute ? 0 : C[2];
    const bs = this.baseSize;
    fx.pos = pos;
    for (let i = 0; i < N; i++) {
      const bx = base[3 * i], by = base[3 * i + 1], bz = base[3 * i + 2], tg = this.tag[i], pr = this.prm[i];
      if (def.dyn) def.dyn(i, bx, by, bz, tg, pr, st, o, fx);
      else { o[0] = bx + cx; o[1] = by + cy; o[2] = bz + cz; }
      if (p < 1) {
        pos[3 * i] = from[3 * i] + (o[0] - from[3 * i]) * e;
        pos[3 * i + 1] = from[3 * i + 1] + (o[1] - from[3 * i + 1]) * e;
        pos[3 * i + 2] = from[3 * i + 2] + (o[2] - from[3 * i + 2]) * e;
      } else { pos[3 * i] = o[0]; pos[3 * i + 1] = o[1]; pos[3 * i + 2] = o[2]; }
      def.color(i, tg, pr, bx, by, bz, st, c, fx);
      if (kc < 1) {
        this.col[3 * i] = this.prevCol[3 * i] + (c[0] - this.prevCol[3 * i]) * kc;
        this.col[3 * i + 1] = this.prevCol[3 * i + 1] + (c[1] - this.prevCol[3 * i + 1]) * kc;
        this.col[3 * i + 2] = this.prevCol[3 * i + 2] + (c[2] - this.prevCol[3 * i + 2]) * kc;
        this.alpha[i] = (this.prevA[i] + (c[3] - this.prevA[i]) * kc) * dim;
      } else {
        this.col[3 * i] = c[0]; this.col[3 * i + 1] = c[1]; this.col[3 * i + 2] = c[2];
        this.alpha[i] = c[3] * dim;
      }
      this.size[i] = c[4] * bs;
    }
    if (N > 0) {
      if (!me.launched) this.alpha[0] = 0;
      else if (fx.meColor) {
        const mc = fx.meColor;
        this.col[0] = mc[0]; this.col[1] = mc[1]; this.col[2] = mc[2];
        this.alpha[0] = Math.max(this.alpha[0], fx.meAlpha); this.size[0] = bs * fx.meSize;
      }
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aAlpha.needsUpdate = true; a.aSize.needsUpdate = true;
  }
}
