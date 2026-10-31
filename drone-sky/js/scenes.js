// Scene library for the 13.5-minute show: shape builders, slow in-formation motion,
// light programs (fast effects are done with light, not flight) and subtitles.
import { sampleMask, maskArea, shapePoints, textPoints, spotLocal, SHAPES, mulberry32, groundGrid, flower as flowerPts, field as fieldPts, MASK } from './formations.js';
import { hsl } from './world.js';
import { FIREWORKS } from './score.js';

export const C = [0, 27, 0];
const U = MASK.UNIT;
const lx = px => (px - 400) * U, ly = py => (225 - py) * U;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const minJerk = u => u * u * u * (10 + u * (-15 + 6 * u));
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
const twinkle = (i, t, rate) => hash(i * 7 + Math.floor(t * rate));

/* ---------- shape plumbing ---------- */
function newShape(n) { const m = Math.max(1, n); return { n, pts: new Float32Array(m * 3), tag: new Uint8Array(m), prm: new Float32Array(m) }; }
function alloc(n, w) {
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const c = w.map(x => Math.floor(n * x / sum));
  let r = n - c.reduce((a, b) => a + b, 0);
  for (let i = 0; r > 0; i = (i + 1) % c.length, r--) c[i]++;
  return c;
}
// parts: { key, draw } mask part or { gen(count) -> Float32Array, area }, plus tag, prm(x,y,i,count), w (density)
// counts follow `share` when every part has one, otherwise drawn area x density `w`
function parts(n, list) {
  const areas = list.every(p => p.share) ? list.map(p => p.share) : list.map(p => maskArea(p.key, p.draw) * (p.w || 1));
  const counts = alloc(n, areas);
  const s = newShape(n);
  let o = 0;
  list.forEach((p, k) => {
    const c = counts[k]; if (!c) return;
    const pts = p.gen ? p.gen(c) : sampleMask(p.key, p.draw, c);
    for (let i = 0; i < c; i++) {
      let x = pts[3 * i], y = pts[3 * i + 1], z = pts[3 * i + 2];
      if (p.xf) { const q = p.xf(x, y, z); x = q[0]; y = q[1]; z = q[2]; }
      s.pts[3 * (o + i)] = x; s.pts[3 * (o + i) + 1] = y; s.pts[3 * (o + i) + 2] = z;
      s.tag[o + i] = p.tag; s.prm[o + i] = p.prm ? p.prm(x, y, i, c) : 0;
    }
    o += c;
  });
  return s;
}
function single(pts, n, tag, prmFn) {
  const s = newShape(n);
  s.pts.set(pts.subarray(0, n * 3));
  for (let i = 0; i < n; i++) { s.tag[i] = tag || 0; s.prm[i] = prmFn ? prmFn(pts[3 * i], pts[3 * i + 1], i) : 0; }
  return s;
}

/* ---------- builders ---------- */
function ground(n, y) {
  const g = groundGrid(n);
  for (let i = 0; i < n; i++) g[3 * i + 1] = y;
  return single(g, n, 0, x => (x + 40) / 80);
}
function curtain(n) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * 2.4))), rows = Math.ceil(n / cols);
  const gx = 54 / cols, gy = 28 / Math.max(1, rows - 1);
  const s = newShape(n);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    s.pts[3 * i] = (c - (cols - 1) / 2) * gx;
    s.pts[3 * i + 1] = 13 + r * gy - C[1];
    s.pts[3 * i + 2] = 0;
    s.prm[i] = c / Math.max(1, cols - 1);
  }
  return s;
}
const SUN_Y = ly(300);
function sunrise(n) {
  return parts(n, [
    { key: 'sun', tag: 0, draw: g => { g.beginPath(); g.arc(400, 300, 105, Math.PI, 0); g.closePath(); g.fill(); } },
    { key: 'rays', tag: 1, draw: g => {
      g.lineWidth = 11; g.lineCap = 'round';
      for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 9; g.beginPath(); g.moveTo(400 + Math.cos(a) * 130, 300 + Math.sin(a) * 130); g.lineTo(400 + Math.cos(a) * 205, 300 + Math.sin(a) * 205); g.stroke(); }
    }, prm: (x, y) => Math.min(8, Math.floor(Math.atan2(y - SUN_Y, x) / (Math.PI / 9))) / 8 },
    { key: 'horizon', tag: 2, draw: g => g.fillRect(40, 312, 720, 7), prm: x => (x + 28) / 56 },
    { key: 'glints', tag: 3, w: 0.8, draw: g => { for (let x = 90; x < 720; x += 46) { g.fillRect(x, 345, 22, 5); g.fillRect(x + 20, 372, 16, 5); } }, prm: x => (x + 28) / 56 }
  ]);
}
const WHEELS = [200, 250, 430, 480, 590, 640].map(x => [lx(x), ly(322)]);
function subway(n) {
  const body = g => {
    g.beginPath(); g.moveTo(195, 160); g.lineTo(655, 160); g.quadraticCurveTo(680, 160, 680, 185); g.lineTo(680, 288);
    g.quadraticCurveTo(680, 310, 655, 310); g.lineTo(140, 310); g.lineTo(140, 235); g.quadraticCurveTo(146, 172, 195, 160); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (let x = 215; x < 640; x += 78) g.fillRect(x, 185, 56, 52);
    g.beginPath(); g.moveTo(152, 232); g.quadraticCurveTo(158, 190, 196, 184); g.lineTo(196, 232); g.closePath(); g.fill();
    g.restore();
  };
  return parts(n, [
    { key: 'train', tag: 0, draw: body },
    { key: 'windows', tag: 1, w: 1.15, draw: g => { for (let x = 219; x < 640; x += 78) g.fillRect(x, 189, 48, 44); g.beginPath(); g.moveTo(158, 228); g.quadraticCurveTo(163, 194, 192, 189); g.lineTo(192, 228); g.closePath(); g.fill(); }, prm: x => (x + 28) / 56 },
    { key: 'wheels', tag: 2, w: 1.3, draw: g => WHEELS.forEach(([x]) => { g.beginPath(); g.arc(x / U + 400, 322, 17, 0, Math.PI * 2); g.fill(); }), prm: x => { let b = 0, d = 1e9; WHEELS.forEach((w, k) => { const e = Math.abs(w[0] - x); if (e < d) { d = e; b = k; } }); return b; } },
    { key: 'rail', tag: 3, draw: g => g.fillRect(30, 342, 740, 7), prm: x => (x + 28) / 56 },
    { key: 'speed', tag: 4, draw: g => { g.fillRect(700, 192, 70, 6); g.fillRect(712, 232, 58, 6); g.fillRect(700, 272, 70, 6); }, prm: x => (x - lx(700)) / (lx(770) - lx(700)) }
  ]);
}
function coffee(n) {
  const steamY0 = ly(178), steamY1 = ly(40);
  return parts(n, [
    { key: 'cup', tag: 0, draw: g => {
      g.beginPath(); g.moveTo(285, 195); g.lineTo(515, 195); g.lineTo(500, 322); g.quadraticCurveTo(495, 356, 455, 356); g.lineTo(345, 356); g.quadraticCurveTo(305, 356, 300, 322); g.closePath(); g.fill();
      g.lineWidth = 17; g.beginPath(); g.arc(522, 262, 40, -Math.PI / 2, Math.PI / 2); g.stroke();
    } },
    { key: 'saucer', tag: 2, draw: g => { g.beginPath(); g.ellipse(400, 372, 175, 14, 0, 0, Math.PI * 2); g.fill(); } },
    { key: 'steam', tag: 1, w: 1.2, draw: g => {
      g.lineWidth = 10; g.lineCap = 'round';
      [345, 400, 455].forEach((sx, k) => { g.beginPath(); for (let y = 178; y >= 40; y -= 4) g.lineTo(sx + Math.sin((178 - y) / 24 + k * 1.7) * 15, y); g.stroke(); });
    }, prm: (x, y) => clamp01((y - steamY0) / (steamY1 - steamY0)) }
  ]);
}
const CLOCK_R = 14;
function clock(n) {
  const [cr, ct, ch, cm, cb] = alloc(n, [38, 17, 14, 24, 7]);
  const s = newShape(n);
  let o = 0;
  const put = (x, y, tag, prm) => { s.pts[3 * o] = x; s.pts[3 * o + 1] = y; s.pts[3 * o + 2] = 0; s.tag[o] = tag; s.prm[o] = prm; o++; };
  for (let i = 0; i < cr; i++) { const ring = i % 3, a = (Math.floor(i / 3) / Math.ceil(cr / 3)) * Math.PI * 2; const r = CLOCK_R - 0.6 + ring * 0.6; put(Math.sin(a) * r, Math.cos(a) * r, 0, 0); }
  for (let i = 0; i < ct; i++) { const k = i % 12, j = Math.floor(i / 12), per = Math.ceil(ct / 12); const a = k / 12 * Math.PI * 2; const r = 10.8 + (j % Math.ceil(per / 2)) / Math.max(1, Math.ceil(per / 2) - 1) * 1.8; const w = (j % 2 ? 0.22 : -0.22) * (k % 3 === 0 ? 1.6 : 1); put(Math.sin(a) * r + Math.cos(a) * w, Math.cos(a) * r - Math.sin(a) * w, 1, k === 0 ? 1 : 0); }
  const hand = (cnt, len, rows, width, tag, angle) => {
    const per = Math.ceil(cnt / rows);
    for (let i = 0; i < cnt; i++) {
      const row = i % rows, j = Math.floor(i / rows);
      const r = 0.9 + (j / Math.max(1, per - 1)) * (len - 0.9), w = (row - (rows - 1) / 2) * width;
      put(Math.sin(angle) * r + Math.cos(angle) * w, Math.cos(angle) * r - Math.sin(angle) * w, tag, r / len);
    }
  };
  hand(ch, 7.4, 3, 0.36, 2, CLOCK_START.hour);
  hand(cm, 11.6, 2, 0.32, 3, CLOCK_START.min);
  for (let i = 0; i < cb; i++) { const a = i * 2.39996, r = Math.sqrt(i / cb) * 1.1; put(Math.cos(a) * r, Math.sin(a) * r, 4, 0); }
  return s;
}
const CLOCK_START = { hour: (9.5 / 12) * Math.PI * 2, min: Math.PI };   // 9:30
const CLOCK_SWEEP = { from: 20, to: 46 };                                  // minute hand 9:30 -> 10:00
function rain(n) {
  const canopy = g => {
    g.beginPath(); g.moveTo(250, 200); g.quadraticCurveTo(400, 40, 550, 200);
    for (let k = 0; k < 4; k++) { const x0 = 550 - k * 75; g.quadraticCurveTo(x0 - 37, 176, x0 - 75, 200); }
    g.closePath(); g.fill();
  };
  const handle = g => { g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(400, 188); g.lineTo(400, 332); g.arc(386, 332, 14, 0, Math.PI); g.stroke(); };
  const sheltered = (x, y) => Math.abs(x) < 11.4 && y < 8.6;
  const rainGen = c => {
    let s = Math.sqrt(1560 / c), pts = [];
    for (let tries = 0; tries < 8; tries++) {
      pts = [];
      let col = 0;
      for (let x = -31; x <= 31; x += s, col++) for (let y = -16.5; y <= 17; y += s * 0.75) if (!sheltered(x, y)) pts.push(x, y, (hash(col * 13) - 0.5) * 2, col);
      if (pts.length / 4 >= c) break;
      s *= 0.92;
    }
    const out = new Float32Array(c * 3), m = pts.length / 4, r = mulberry32(c);
    for (let i = 0; i < c; i++) { const k = m > c ? Math.floor(i * m / c) : i % m; out[3 * i] = pts[4 * k]; out[3 * i + 1] = pts[4 * k + 1]; out[3 * i + 2] = pts[4 * k + 2]; }
    void r;
    return out;
  };
  return parts(n, [
    { key: 'canopy', tag: 0, share: 0.17, draw: canopy, prm: x => clamp01((x + 10.5) / 21) },
    { key: 'handle', tag: 1, share: 0.04, draw: handle },
    { gen: rainGen, share: 0.79, tag: 2, prm: x => hash(Math.round((x + 31) * 10) * 7) }
  ]);
}
const WAVE_A = -0.62, WAVE_Y = -9.5, BOAT_Z = 3;
function waveH(x, z, st) { return Math.sin(x * 0.16 + st * 0.5) * 1.3 + Math.cos(z * 0.3 + st * 0.37) * 0.6; }
function boat(n) {
  const ca = Math.cos(WAVE_A), sa = Math.sin(WAVE_A);
  const sheetGen = c => {
    const cols = Math.max(4, Math.ceil(Math.sqrt(c * 60 / 22))), rows = Math.ceil(c / cols), out = new Float32Array(c * 3);
    for (let i = 0; i < c; i++) {
      const x = ((i % cols) / (cols - 1) - 0.5) * 60, z = (Math.floor(i / cols) / Math.max(1, rows - 1) - 0.5) * 22;
      out[3 * i] = x; out[3 * i + 1] = WAVE_Y - z * sa; out[3 * i + 2] = z * ca;
    }
    return out;
  };
  const toBoat = (x, y, z) => [x * 0.5, y * 0.5 - 5.0, BOAT_Z + z * 0.3];
  return parts(n, [
    { gen: sheetGen, share: 0.62, tag: 0 },
    { key: 'hull', tag: 1, share: 0.18, draw: g => { g.beginPath(); g.moveTo(230, 250); g.lineTo(570, 250); g.lineTo(505, 315); g.lineTo(295, 315); g.closePath(); g.fill(); }, xf: toBoat },
    { key: 'sail', tag: 2, share: 0.2, draw: g => { g.beginPath(); g.moveTo(405, 80); g.lineTo(405, 238); g.lineTo(290, 238); g.closePath(); g.fill(); g.beginPath(); g.moveTo(415, 105); g.lineTo(415, 238); g.lineTo(500, 238); g.closePath(); g.fill(); }, xf: toBoat }
  ]);
}
const RAINBOW_HUES = [0.78, 0.68, 0.58, 0.33, 0.15, 0.07, 0.0];
function rainbow(n) {
  const [ra, fl] = alloc(n, [62, 38]);
  const s = newShape(n);
  const radii = RAINBOW_HUES.map((h, k) => 20.6 + k * 1.2), tot = radii.reduce((a, b) => a + b, 0);
  const per = alloc(ra, radii);
  let o = 0;
  radii.forEach((r, k) => {
    for (let j = 0; j < per[k]; j++) {
      const th = Math.PI * (j + 0.5) / per[k];
      s.pts[3 * o] = Math.cos(th) * r; s.pts[3 * o + 1] = -13.5 + Math.sin(th) * r; s.pts[3 * o + 2] = (hash(o) - 0.5) * 0.6;
      s.tag[o] = k; s.prm[o] = th / Math.PI; o++;
    }
  });
  void tot;
  const f = flowerPts(fl, 7.2);
  for (let i = 0; i < fl; i++) {
    s.pts[3 * o] = f[3 * i]; s.pts[3 * o + 1] = f[3 * i + 1] - 5.5; s.pts[3 * o + 2] = f[3 * i + 2];
    s.tag[o] = 7; s.prm[o] = Math.hypot(f[3 * i], f[3 * i + 1]) / 7.2; o++;
  }
  return s;
}
const STARS = [[-24, 4], [-16, 7.5], [-9, 7], [-2.5, 5], [0, -3], [12, -2], [13.5, 7.5]];
const PATH = [0, 1, 2, 3, 6, 5, 4, 3];
const POLARIS = [15.5, 14.6];
function stars(n) {
  const s = newShape(n);
  const perStar = Math.max(6, Math.min(40, Math.round(n * 0.012)));
  const segs = [];
  let L = 0;
  for (let k = 0; k + 1 < PATH.length; k++) { const a = STARS[PATH[k]], b = STARS[PATH[k + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, L, d]); L += d; }
  const lineCount = Math.min(Math.floor(n * 0.12), Math.floor(L / 0.45));
  const gd = Math.hypot(POLARIS[0] - STARS[6][0], POLARIS[1] - STARS[6][1]);
  const guideCount = Math.min(Math.floor(n * 0.02), Math.floor(gd / 0.9));
  const polarisCount = perStar * 2;
  let o = 0;
  const put = (x, y, z, tag, prm) => { if (o >= n) return; s.pts[3 * o] = x; s.pts[3 * o + 1] = y; s.pts[3 * o + 2] = z; s.tag[o] = tag; s.prm[o] = prm; o++; };
  const cluster = (cx, cy, cnt, tag, idx) => { for (let j = 0; j < cnt; j++) { const u = hash(o * 3 + 1) * 2 - 1, th = hash(o * 5 + 2) * 6.283, rr = Math.sqrt(1 - u * u) * 0.55; put(cx + Math.cos(th) * rr, cy + u * 0.55, Math.sin(th) * rr, tag, idx); } };
  STARS.forEach((p, k) => cluster(p[0], p[1], perStar, 0, k / 6));
  cluster(POLARIS[0], POLARIS[1], polarisCount, 4, 1);
  for (let j = 0; j < lineCount; j++) {
    const at = (j + 0.5) / lineCount * L;
    const sg = segs.find(q => at >= q[2] && at <= q[2] + q[3]) || segs[segs.length - 1];
    const u = (at - sg[2]) / sg[3];
    put(sg[0][0] + (sg[1][0] - sg[0][0]) * u, sg[0][1] + (sg[1][1] - sg[0][1]) * u, 0, 1, at / L);
  }
  for (let j = 0; j < guideCount; j++) { const u = (j + 0.5) / guideCount; put(STARS[6][0] + (POLARIS[0] - STARS[6][0]) * u, STARS[6][1] + (POLARIS[1] - STARS[6][1]) * u, 0, 3, u); }
  const rest = n - o, f = fieldPts(Math.max(1, rest));
  for (let j = 0; j < rest; j++) put(f[3 * j] * 1.02, f[3 * j + 1] * 1.05, f[3 * j + 2] - 4, 2, hash(j * 11));
  return s;
}
export const SHELLS = [[-15, 2, 0], [15, 5, -4], [0, 10, 3]];
const SHELL_R = 8.5;
function fireworks(n) {
  const s = newShape(n), per = alloc(n, [1, 1, 1]);
  let o = 0;
  SHELLS.forEach((c, k) => {
    const cnt = per[k], m = 7, spokes = Math.max(1, Math.ceil(cnt / m)), ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < cnt; i++) {
      const sp = i % spokes, j = Math.floor(i / spokes);
      const y = 1 - (sp + 0.5) / spokes * 2, rr = Math.sqrt(1 - y * y), a = sp * ga;
      const r = SHELL_R * (j + 1) / m;
      s.pts[3 * o] = c[0] + Math.cos(a) * rr * r; s.pts[3 * o + 1] = c[1] + y * r; s.pts[3 * o + 2] = c[2] + Math.sin(a) * rr * r;
      s.tag[o] = k; s.prm[o] = (j + 1) / m; o++;
    }
  });
  return s;
}
function text(t, n) { return single(textPoints(t, n), n, 0, x => (x + 28) / 56); }

/* ---------- scene definitions ---------- */
const WARM = (o, a, s) => { o[0] = 1; o[1] = 0.8; o[2] = 0.52; o[3] = a; o[4] = s || 0.8; };

export const DEFS = {
  pad: {
    absolute: true,
    build: n => ground(n, 1.1),
    color(i, tag, prm, x, y, z, st, o) { WARM(o, 0.22 + 0.1 * Math.sin(st * 1.2 + hash(i) * 6.28)); },
    cap: (st, c) => c.lobby ? null : st < 10 ? [String(10 - Math.floor(st)), '다 함께 바라봐요'] : null
  },
  climb: {
    tcap: 47, tmin: 40,
    build: n => curtain(n),
    color(i, tag, prm, x, y, z, st, o) { WARM(o, 0.3, 0.85); },
    cap: st => st > 4 ? ['오늘 하루, 어땠나요?', ''] : null
  },
  lightwave: {
    keep: 'climb',
    color(i, tag, prm, x, y, z, st, o) {
      const front = -30 + st * 9;
      if (x > front) { WARM(o, 0.3, 0.85); return; }
      const fresh = clamp01((front - x) / 6);
      hsl(0.12 + (0.46 * clamp01((st - 8) / 12)) + 0.05 * Math.sin(x * 0.08 - st * 0.5), 0.75, 0.56 + (1 - fresh) * 0.25, o, 0);
      o[3] = 0.72; o[4] = 0.8;
    },
    cap: (st, c) => ['오늘 밤, ' + c.n + '개의 불빛이 모였어요', '']
  },
  sunrise: {
    build: n => sunrise(n),
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag === 0) { hsl(0.06 + clamp01((y - SUN_Y) / 7) * 0.05, 0.95, 0.56, o, 0); o[3] = clamp01(st / 5); o[4] = 1; return; }
      if (tag === 1) {
        const k = Math.round(prm * 8), on = st > 6 + k * fx.beatLen;
        hsl(0.11, 0.95, 0.6 + 0.12 * Math.sin(st * 2 - k * 0.7), o, 0); o[3] = on ? 1 : 0.04; o[4] = 1; return;
      }
      if (tag === 2) { o[0] = 0.85; o[1] = 0.9; o[2] = 1; o[3] = 0.8; o[4] = 0.9; return; }
      o[0] = 1; o[1] = 0.85; o[2] = 0.6; o[3] = 0.2 + 0.7 * twinkle(i, st, 3); o[4] = 0.8;
    },
    cap: () => ['아침엔 알람과 싸웠고', '']
  },
  subway: {
    build: n => subway(n),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { o[0] = 0.8; o[1] = 0.87; o[2] = 1; o[3] = 0.85; o[4] = 0.9; return; }
      if (tag === 1) { const b = 0.55 + 0.45 * Math.sin(prm * 28 + st * 4.5); o[0] = 1; o[1] = 0.86; o[2] = 0.5; o[3] = 0.35 + 0.65 * b; o[4] = 1; return; }
      if (tag === 2) { const w = WHEELS[Math.round(prm)], a = Math.atan2(y - w[1], x - w[0]); o[0] = 0.7; o[1] = 0.75; o[2] = 0.85; o[3] = Math.sin(a * 3 + st * 5) > 0.2 ? 0.9 : 0.2; o[4] = 0.9; return; }
      if (tag === 3) { const on = ((prm * 16 - st * 1.6) % 1 + 1) % 1 < 0.5; o[0] = 0.85; o[1] = 0.85; o[2] = 0.95; o[3] = on ? 0.85 : 0.12; o[4] = 0.85; return; }
      const on = ((prm * 2 - st * 2.2) % 1 + 1) % 1 < 0.45; o[0] = 0.75; o[1] = 0.85; o[2] = 1; o[3] = on ? 0.9 : 0.05; o[4] = 0.85;
    },
    cap: () => ['만원 지하철에 몸을 실었죠', '']
  },
  coffee: {
    build: n => coffee(n),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { o[0] = 1; o[1] = 0.92; o[2] = 0.78; o[3] = 0.95; o[4] = 0.95; return; }
      if (tag === 2) { o[0] = 0.85; o[1] = 0.88; o[2] = 1; o[3] = 0.7; o[4] = 0.85; return; }
      const f = Math.max(0, Math.sin(prm * 10 - st * 2.4));
      o[0] = 1; o[1] = 1; o[2] = 1; o[3] = 0.12 + 0.88 * f * f * (1 - prm * 0.5); o[4] = 0.9;
    },
    cap: () => ['식은 커피로 버틴 오후', '']
  },
  clock: {
    build: n => clock(n),
    dyn(i, x, y, z, tag, prm, st, o) {
      let d = 0;
      if (tag === 3) d = Math.PI * minJerk(clamp01((st - CLOCK_SWEEP.from) / (CLOCK_SWEEP.to - CLOCK_SWEEP.from)));
      else if (tag === 2) d = (Math.PI / 12) * minJerk(clamp01((st - CLOCK_SWEEP.from) / (CLOCK_SWEEP.to - CLOCK_SWEEP.from)));
      if (d) { const c = Math.cos(d), s = Math.sin(d); o[0] = x * c + y * s + C[0]; o[1] = -x * s + y * c + C[1]; o[2] = z + C[2]; return; }
      o[0] = x + C[0]; o[1] = y + C[1]; o[2] = z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o) {
      const ten = st > CLOCK_SWEEP.to ? 0.5 + 0.5 * Math.sin((st - CLOCK_SWEEP.to) * 3) : 0;
      if (tag === 0) { o[0] = 0.75 + ten * 0.25; o[1] = 0.85 + ten * 0.1; o[2] = 1; o[3] = 0.9; o[4] = 0.9; return; }
      if (tag === 1) { hsl(0.12, 0.9, prm ? 0.72 : 0.6, o, 0); o[3] = 1; o[4] = prm ? 1.2 : 0.95; return; }
      if (tag === 2) { o[0] = 1; o[1] = 1; o[2] = 1; o[3] = 1; o[4] = 1; return; }
      hsl(0.11, 0.95, 0.62, o, 0); o[3] = 1; o[4] = 1;
    },
    cap: st => st < CLOCK_SWEEP.to ? ['그리고 지금', ''] : ['밤 10시', '']
  },
  rain: {
    build: n => rain(n),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { const seg = Math.floor(prm * 6) % 2; hsl(seg ? 0.98 : 0.07, seg ? 0.65 : 0.5, seg ? 0.6 : 0.82, o, 0); o[3] = 0.95; o[4] = 1; return; }
      if (tag === 1) { o[0] = 0.85; o[1] = 0.85; o[2] = 0.9; o[3] = 0.85; o[4] = 0.9; return; }
      const head = 18 - (((st * 7 + prm * 40) % 40) + 40) % 40, d = y - head;
      const a = d > 0 && d < 3.4 ? 1 - d / 3.4 : 0;
      o[0] = 0.7; o[1] = 0.85; o[2] = 1; o[3] = 0.04 + 0.9 * a; o[4] = 0.8;
    },
    cap: () => ['비 오는 날도 있었고', '']
  },
  boat: {
    build: n => boat(n),
    dyn(i, x, y, z, tag, prm, st, o) {
      const ca = Math.cos(WAVE_A), sa = Math.sin(WAVE_A);
      if (tag === 0) { const h = waveH(x, z / ca, st); o[0] = x + C[0]; o[1] = y + h * ca + C[1]; o[2] = z + h * sa + C[2]; return; }
      const h0 = waveH(0, BOAT_Z / ca, st), th = 0.08 * Math.sin(st * 2 * Math.PI / 5.5), px = 0, py = -8.0;
      const dx = x - px, dy = y - py, c = Math.cos(th), s = Math.sin(th);
      o[0] = px + dx * c - dy * s + Math.sin(st * 0.18) * 2 + C[0];
      o[1] = py + dx * s + dy * c + h0 * ca + C[1];
      o[2] = z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) {
        const ca = Math.cos(WAVE_A), h = waveH(x, z / ca, st);
        hsl(0.57 - h * 0.01, 0.85, 0.4 + (h + 1.9) / 3.8 * 0.3, o, 0);
        if (h > 1.45 && twinkle(i, st, 6) < 0.3) { o[0] = o[1] = o[2] = 1; }
        o[3] = 0.9; o[4] = 0.85; return;
      }
      if (tag === 1) { o[0] = 0.95; o[1] = 0.96; o[2] = 1; o[3] = 1; o[4] = 1; return; }
      o[0] = 1; o[1] = 0.93; o[2] = 0.78; o[3] = 1; o[4] = 1;
    },
    cap: () => ['흔들린 날도 있었지만', '']
  },
  rainbow: {
    build: n => rainbow(n),
    dyn(i, x, y, z, tag, prm, st, o) {
      if (tag === 7) { const k = 0.2 + 0.8 * minJerk(clamp01((st - 8) / 18)), cy = -5.5; o[0] = x * k + C[0]; o[1] = cy + (y - cy) * k + C[1]; o[2] = z + C[2]; return; }
      o[0] = x + C[0]; o[1] = y + C[1]; o[2] = z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 7) { if (prm < 0.17) hsl(0.12, 0.95, 0.6, o, 0); else hsl(0.93 - prm * 0.06, 0.75, 0.55 + (1 - prm) * 0.15, o, 0); o[3] = clamp01((st - 6) / 4); o[4] = 1; return; }
      const on = st > 2 + (6 - tag) * 1.4;
      hsl(RAINBOW_HUES[tag], 0.85, 0.58, o, 0); o[3] = on ? 0.95 : 0.03; o[4] = 1;
    },
    cap: () => ['그래도 꽃은 피었어요', '']
  },
  main: {
    spot: true,
    build: (n, c) => single(shapePoints(c.shapeKey, n), n, 0, x => (x + 28) / 56),
    dyn(i, x, y, z, tag, prm, st, o, fx) {
      const key = fx.shapeKey, whale = key === 'whale' || key === 'whaleMoon';
      let X = x, Y = y, Z = z;
      if (key === 'star') { const a = st * 0.08, ca = Math.cos(a); X = x * ca; Z = z + x * Math.sin(a); }
      else if (key === 'heart') { const k = 1 + fx.pulse * 0.02; X = x * k; Y = y * k; }
      else if (whale) {
        const moon = key === 'whaleMoon' && x > 13 && y > 5;
        if (!moon) {
          if (x > 13.5 && y < 6) {
            const jx = 13.5, jy = -2, w = clamp01((x - jx) / 12), a = Math.sin(st * 1.0) * 0.12 * w, c = Math.cos(a), s = Math.sin(a);
            X = jx + (x - jx) * c - (y - jy) * s; Y = jy + (x - jx) * s + (y - jy) * c;
          }
          X += Math.sin(st * 0.08) * 4; Y += Math.sin(st * 0.25) * 0.6;
        }
      }
      o[0] = X + C[0]; o[1] = Y + C[1]; o[2] = Z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o, fx) {
      const key = fx.shapeKey;
      if (key === 'star') hsl(0.13, 0.9, 0.58 + 0.08 * Math.sin(x + st * 1.5), o, 0);
      else if (key === 'heart') hsl(0.97, 0.8, 0.55 + fx.pulse * 0.12, o, 0);
      else {
        const moon = key === 'whaleMoon' && x > 13 && y > 5;
        if (moon) hsl(0.12, 0.85, 0.66, o, 0);
        else if (y > 8 && x < -6) { const f = 0.7 + 0.3 * Math.sin(st * 5 + i); o[0] = f; o[1] = f; o[2] = 1; }
        else hsl(0.58, 0.7, 0.5 + (y + 7) / 14 * 0.26, o, 0);
      }
      if (twinkle(i, st, 4) < 0.006) { o[0] = o[1] = o[2] = 1; }
      o[3] = 1; o[4] = 1;
    },
    cap: (st, c) => ['오늘 밤, 우리가 모여 ' + SHAPES[c.shapeKey].became, c.n + '개의 불빛이 함께 만들었어요']
  },
  wish1: { build: (n, c) => text(c.wishes[0].text, n), color: wishColor(0), cap: () => ['오늘 밤, 누군가의 소원', '모두가 같은 소원을 보고 있어요'] },
  wish2: { build: (n, c) => text(c.wishes[1].text, n), color: wishColor(1), cap: (st, c) => c.wishes[1].mine ? ['당신의 소원이 하늘에 떴어요', '데모에서는 적은 소원이 항상 뽑혀요'] : ['또 다른 누군가의 소원', ''] },
  wish3: { build: (n, c) => text(c.wishes[2].text, n), color: wishColor(2), cap: () => ['그리고 또 하나의 소원', ''] },
  scene: {
    build: (n, c) => text(c.scene.text, n),
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (fx.scene.mine) hsl(0.11, 0.9, 0.62 + 0.08 * Math.sin(prm * 12 - st * 2), o, 0);
      else hsl(0.94, 0.55, 0.76 + 0.06 * Math.sin(prm * 12 - st * 2), o, 0);
      o[3] = 1; o[4] = 0.9;
    },
    cap: (st, c) => c.scene.mine ? ['당신의 마음이 하늘을 채웠어요', c.n + '명이 함께 보고 있어요'] : [c.scene.from + ' 님이 보낸 마음', '내 마음을 하늘에 · 15,000원']
  },
  solo: {
    build: n => single(fieldPts(n), n, 0),
    dyn(i, x, y, z, tag, prm, st, o) { o[0] = x + Math.sin(st * 0.15 + hash(i) * 6) * 0.25 + C[0]; o[1] = y + Math.cos(st * 0.12 + hash(i) * 6) * 0.25 + C[1] + 2; o[2] = z + C[2]; },
    color(i, tag, prm, x, y, z, st, o, fx) {
      hsl(0.1, 0.5, 0.76, o, 0); o[4] = 1;
      const dark = 200 / 12;
      if (st < dark) o[3] = 0.012 + 0.988 * Math.max(0, 1 - (st - 1) / 3);
      else {
        const R = (st - dark) * 4.2, d = Math.hypot(fx.pos[3 * i] - fx.solo[0], fx.pos[3 * i + 1] - fx.solo[1], (fx.pos[3 * i + 2] - fx.solo[2]) * 0.5);
        o[3] = d < R ? Math.min(1, 0.012 + (R - d) / 5) : 0.012;
      }
      if (i === fx.soloIdx) { hsl(0.11, 0.95, 0.66, o, 0); o[3] = 1; o[4] = 1.8; }
    },
    cap: (st, c) => {
      if (st < 200 / 12) return c.me.launched ? ['이 불빛 하나가 당신이에요', '오늘 하루를 버틴 당신'] : ['이 불빛 하나는 누군가의 오늘이에요', ''];
      return ['그리고, 혼자가 아니에요', c.n + '명이 지금 같은 하늘을 보고 있어요'];
    }
  },
  stars: {
    build: n => stars(n),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 2) { o[0] = 0.85; o[1] = 0.9; o[2] = 1; o[3] = 0.1 + 0.3 * twinkle(i, st, 1.5); o[4] = 0.7; return; }
      if (tag === 0) { o[0] = 0.85; o[1] = 0.92; o[2] = 1; o[3] = clamp01((st - 3) / 3) * (0.8 + 0.2 * Math.sin(st * 3 + i)); o[4] = 1.3; return; }
      if (tag === 1) { const p = clamp01((st - 9) / 20); o[0] = 0.62; o[1] = 0.78; o[2] = 1; o[3] = prm < p ? 0.9 : 0.02; o[4] = 0.8; return; }
      if (tag === 3) { const p = clamp01((st - 31) / 6); o[0] = 1; o[1] = 0.85; o[2] = 0.55; o[3] = prm < p && ((prm * 8 + st) % 1) < 0.6 ? 0.8 : 0.02; o[4] = 0.75; return; }
      hsl(0.12, 0.9, 0.7, o, 0); o[3] = st > 37 ? 1 : 0.05; o[4] = 1.6;
    },
    cap: st => st < 31 ? ['내일은 조금 더 가벼워지길', ''] : ['길을 잃으면, 북쪽의 별을 찾아요', '북두칠성 끝을 따라가면 북극성이 있어요']
  },
  fireworks: {
    build: n => fireworks(n),
    color(i, tag, prm, x, y, z, st, o, fx) {
      let best = 0, hue = 0.1, white = 0;
      for (let k = 0; k < FIREWORKS.length; k++) {
        const [tf, shell] = FIREWORKS[k];
        if (shell !== tag) continue;
        const s = fx.abs - tf; if (s < 0 || s > 9) continue;
        const front = s * 7.5, r = prm * SHELL_R;
        if (r > front) continue;
        const a = Math.exp(-(front - r) * 0.22) * Math.exp(-Math.max(0, s - 1.3) * 0.65);
        if (a > best) { best = a; hue = [0.12, 0.93, 0.52, 0.0, 0.33][k % 5]; white = Math.exp(-(front - r) * 1.5); }
        if (s > 1.6 && twinkle(i, fx.abs, 12) < 0.18) best = Math.max(best, 0.9 * Math.exp(-(s - 1.6) * 0.4));
      }
      hsl(hue, 0.9, 0.6 + 0.35 * white, o, 0);
      o[3] = 0.03 + best; o[4] = 1;
    },
    cap: () => null
  },
  thanks: { build: n => text('오늘도 수고했어요', n), color: (i, tag, prm, x, y, z, st, o) => { hsl(0.1, 0.55, 0.74 + 0.08 * Math.sin(prm * 10 - st * 1.5), o, 0); o[3] = 1; o[4] = 0.9; }, cap: () => ['', '모두에게, 그리고 나에게'] },
  tomorrow: { build: n => text('내일 밤 10시', n), color: (i, tag, prm, x, y, z, st, o) => { hsl(0.58, 0.6, 0.75 + 0.06 * Math.sin(prm * 10 - st * 1.5), o, 0); o[3] = 1; o[4] = 0.9; }, cap: (st, c) => ['내일 밤 10시에 또 만나요', '오늘 ' + c.n + '명이 함께했어요'] },
  approach: {
    absolute: true, tcap: 30,
    build: n => ground(n, 15),
    color(i, tag, prm, x, y, z, st, o) { WARM(o, 0.55, 0.85); },
    cap: () => null
  },
  land: {
    keep: 'approach', absolute: true,
    dyn(i, x, y, z, tag, prm, st, o) {
      const delay = (6 - z) / 32 * 6, p = minJerk(clamp01((st - 2 - delay) / 28));
      o[0] = x; o[1] = y - 13.9 * p; o[2] = z;
      SCRATCH[i] = p;
    },
    color(i, tag, prm, x, y, z, st, o) { const p = SCRATCH[i] || 0; WARM(o, 0.55 * (1 - p) + 0.06, 0.85); },
    cap: () => null
  }
};
const SCRATCH = new Float32Array(6000);
function wishColor(k) {
  return (i, tag, prm, x, y, z, st, o, fx) => {
    if (fx.wishes[k].mine) hsl(0.11, 0.9, 0.62 + 0.08 * Math.sin(prm * 12 - st * 2), o, 0);
    else hsl(0.1, 0.45, 0.8 + 0.06 * Math.sin(prm * 12 - st * 2), o, 0);
    o[3] = 1; o[4] = 0.9;
  };
}
export { spotLocal };
