// Episode: Titanic (1997 film), built around the licensed soundtrack recording the operator loads.
// The song is not bundled: the show waits for the audio file, finds its climax and lays the scenes on it.
import { parts, text, clamp01, twinkle, lx, ly, C, newShape } from './scenes.js';
import { DEFS as T, shipParts, shipColor, FUNNEL_BAND } from './titanic.js';
import { hsl } from './world.js';

export const SONG_AT = 50;          // the song starts after countdown and take-off
const LAND = 70;                    // approach + landing after the song
export const META = {
  title: '타이타닉 (1997 영화)', subtitle: '영화 회차 · My Heart Will Go On', place: '타이타닉 영화 회차',
  snapScene: 'fFlying', spotScene: 'fFlying', spotLabel: '뱃머리 두 사람 곁', spotTopic: '뱃머리 두 사람 곁은',
  cardLine: '나는 지금 날고 있어요', soloDark: 20
};

/* ---------- song analysis ---------- */
// Loudness envelope -> the biggest sustained rise in the second half (the key change), as seconds into the song.
export function findClimax(buffer) {
  const sr = buffer.sampleRate, ch = buffer.getChannelData(0), win = Math.floor(sr * 0.5);
  const env = [];
  for (let i = 0; i + win <= ch.length; i += win) { let s = 0; for (let j = i; j < i + win; j += 4) s += ch[j] * ch[j]; env.push(Math.sqrt(s / (win / 4))); }
  const n = env.length, dur = buffer.duration;
  if (n < 40) return dur * 0.65;
  const mean = (a, b) => { let s = 0; for (let k = a; k < b; k++) s += env[k]; return s / Math.max(1, b - a); };
  let best = -1, at = Math.floor(n * 0.65);
  for (let k = Math.floor(n * 0.45); k < Math.floor(n * 0.88); k++) {
    const rise = mean(k, Math.min(n, k + 16)) - mean(Math.max(0, k - 16), k);
    if (rise > best) { best = rise; at = k; }
  }
  return at * 0.5;
}

/* ---------- portraits from licensed stills ---------- */
// Up to two images the operator loads; each becomes a drone formation coloured from the photo.
const PORTRAITS = [];
export const portraitCount = () => PORTRAITS.length;
export async function loadPortraits(files) {
  PORTRAITS.length = 0;
  for (const f of Array.from(files).slice(0, 2)) {
    const bmp = await createImageBitmap(f);
    const c = document.createElement('canvas'); c.width = 800; c.height = 450;
    const g = c.getContext('2d', { willReadFrequently: true });
    const s = Math.min(800 / bmp.width, 440 / bmp.height), w = bmp.width * s, h = bmp.height * s;
    g.drawImage(bmp, (800 - w) / 2, (450 - h) / 2, w, h);
    PORTRAITS.push({ data: g.getImageData(0, 0, 800, 450).data, cache: {} });
  }
  return PORTRAITS.length;
}
// Importance sampling on 4-px cells: brightness plus edges (eyes, mouth, jaw line) get more drones.
function portraitShape(k, n) {
  const P = PORTRAITS[k];
  if (P.cache[n]) return P.cache[n];
  const W = 200, H = 112, CS = 4, lum = new Float32Array(W * H), rgb = new Uint32Array(W * H), d = P.data;
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    let r = 0, gg = 0, b = 0, m = 0;
    for (let y = cy * CS; y < cy * CS + CS && y < 450; y++) for (let x = cx * CS; x < cx * CS + CS; x++) { const o = (y * 800 + x) * 4; r += d[o]; gg += d[o + 1]; b += d[o + 2]; m++; }
    r /= m; gg /= m; b /= m;
    lum[cy * W + cx] = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    rgb[cy * W + cx] = (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b);
  }
  const wt = new Float64Array(W * H);
  let total = 0;
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    const i = cy * W + cx;
    if (cy > 0 && cy < H - 1 && cx > 0 && cx < W - 1) {
      const ex = lum[i + 1] - lum[i - 1], ey = lum[i + W] - lum[i - W];
      total += 0.5 * Math.pow(lum[i], 2) + 3.2 * Math.min(0.5, Math.hypot(ex, ey));
    }
    wt[i] = total;      // running sum over every cell keeps the table monotonic
  }
  const s = newShape(n);
  let seed = 99 + k;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let j = 0; j < n; j++) {
    const u = (j + rnd()) / n * total;
    let lo = 0, hi = W * H - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (wt[mid] < u) lo = mid + 1; else hi = mid; }
    const cx = lo % W, cy = Math.floor(lo / W);
    const px = (cx + rnd()) * CS, py = (cy + rnd()) * CS;
    s.pts[3 * j] = lx(px); s.pts[3 * j + 1] = ly(py); s.pts[3 * j + 2] = (rnd() - 0.5) * 0.4;
    s.prm[j] = rgb[lo];
  }
  P.cache[n] = s;
  return s;
}
function portraitDef(k) {
  return {
    tcap: 26,
    build: n => portraitShape(k, n),
    color(i, tag, prm, x, y, z, st, o, fx) {
      const v = prm | 0, r = (v >> 16 & 255) / 255, g = (v >> 8 & 255) / 255, b = (v & 255) / 255;
      const m = (r + g + b) / 3, sat = 1.25;                 // a touch more colour, LEDs read washed out otherwise
      o[0] = clamp01(m + (r - m) * sat); o[1] = clamp01(m + (g - m) * sat); o[2] = clamp01(m + (b - m) * sat);
      o[0] *= 0.85; o[1] *= 0.85; o[2] *= 0.85;
      o[3] = 0.2 + 0.55 * Math.min(1, m * 1.4) + 0.1 * fx.pulse; o[4] = 0.8;
    },
    cap: () => ['그날의 두 사람', '']
  };
}

/* ---------- timeline built from the song ---------- */
const BEFORE = ['fShip', 'fStars', 'fBow', 'fHeart', 'fHand', 'fIceberg', 'fNever'];
const AFTER = ['fFlying', 'fStair', 'fTitle'];
export function plan(songDur, climax, faces = 0) {
  const s0 = SONG_AT, cl = s0 + Math.max(60, Math.min(songDur - 45, climax)), end = s0 + songDur;
  const scenes = [{ id: 'pad', at: 0 }, { id: 'climb', at: 10 }];
  BEFORE.forEach((id, k) => scenes.push({ id, at: s0 + (cl - s0) * k / BEFORE.length }));
  const afterLen = end - cl;
  const after = ['fFlying', ...Array.from({ length: faces }, (_, k) => 'fPortrait' + k), 'fStair', 'fTitle'];
  const share = { fFlying: 1.3, fStair: 0.9, fTitle: 0.9, fPortrait0: 1.1, fPortrait1: 1.1 };
  const sum = after.reduce((a, id) => a + share[id], 0);
  let acc = cl;
  after.forEach(id => { scenes.push({ id, at: acc }); acc += afterLen * share[id] / sum; });
  scenes.push({ id: 'approach', at: end + 2 }, { id: 'land', at: end + 2 + 30 });
  const SHOW_LEN = end + 2 + LAND;
  scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].at : SHOW_LEN; });
  return {
    SHOW_LEN, SCENES: scenes,
    CHAPTERS: [{ label: '출항 전', at: 0 }, { label: '노래 시작', at: s0 }, { label: '바다의 심장', at: scenes[5].at }, { label: '클라이맥스 · 날고 있어요', at: cl }, { label: '착륙', at: end + 2 }],
    SONGS: [{ from: 0, to: s0, title: '파도와 뱃고동' }, { from: s0, to: end, title: '「My Heart Will Go On」 (라이선스 음원)' }, { from: end, to: SHOW_LEN, title: '파도 소리' }]
  };
}
export function arrange(p) {
  const ev = [], add = (...e) => ev.push(e);
  add(0, 'waves', p.SHOW_LEN);
  for (let k = 0; k < 10; k++) add(k, 'bell', 81, 0.05 + k * 0.006);
  add(8, 'horn', 3, 0.16); add(40, 'horn', 2.4, 0.13);
  add(12, 'str', [50, 57, 62, 66], 18, 0.025, 700); add(30, 'str', [47, 54, 59, 62], 18, 0.025, 700);
  const e = p.SCENES.find(s => s.id === 'approach').at;
  add(e + 1, 'str', [52, 59, 64, 68], 30, 0.025, 700); add(e + 31, 'str', [49, 56, 61, 64], 30, 0.022, 650);
  return ev.sort((a, b) => a[0] - b[0]);
}

/* ---------- shapes ---------- */
function prow(g) { g.beginPath(); g.moveTo(40, 372); g.lineTo(690, 318); g.lineTo(770, 296); g.lineTo(712, 344); g.lineTo(40, 430); g.closePath(); g.fill(); }
function railing(g) {
  g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 338); g.lineTo(770, 290); g.stroke();
  for (let x = 60; x < 760; x += 34) { const y = 338 - (x - 40) * (48 / 730); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30); g.stroke(); }
}
function figures(g) {
  // Rose at the front, arms spread; Jack behind, hands at her waist
  g.beginPath(); g.arc(612, 148, 13, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(603, 163); g.lineTo(621, 163); g.lineTo(628, 240); g.lineTo(640, 296); g.lineTo(592, 300); g.lineTo(600, 240); g.closePath(); g.fill();
  g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(612, 172); g.quadraticCurveTo(560, 168, 500, 160); g.moveTo(612, 172); g.quadraticCurveTo(668, 168, 728, 160); g.stroke();
  g.beginPath(); g.arc(590, 140, 14, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(578, 156); g.lineTo(602, 156); g.lineTo(604, 300); g.lineTo(576, 300); g.closePath(); g.fill();
  g.lineWidth = 7; g.beginPath(); g.moveTo(596, 175); g.quadraticCurveTo(612, 205, 616, 212); g.stroke();
}
function sunset(g) { g.beginPath(); g.arc(170, 300, 120, Math.PI, 0); g.closePath(); g.fill(); }
function glowRays(g) { g.lineWidth = 7; g.lineCap = 'round'; for (let k = 0; k < 11; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 11; g.beginPath(); g.moveTo(612 + Math.cos(a) * 120, 170 + Math.sin(a) * 120); g.lineTo(612 + Math.cos(a) * 165, 170 + Math.sin(a) * 165); g.stroke(); } }
function heartPath(g, cx, cy, s) { g.beginPath(); for (let k = 0; k <= 160; k++) { const t = k / 160 * Math.PI * 2; g.lineTo(cx + 16 * Math.pow(Math.sin(t), 3) * s, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s); } g.closePath(); }
function gem(g) {
  heartPath(g, 400, 270, 8.2); g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3;
  [[400, 175, 300, 300], [400, 175, 500, 300], [330, 225, 400, 380], [470, 225, 400, 380], [300, 255, 500, 255]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  g.restore();
}
function diamonds(g) { g.setLineDash([6, 7]); g.lineWidth = 8; heartPath(g, 400, 268, 9.6); g.stroke(); g.setLineDash([]); }
function chain(g) { g.lineWidth = 4; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(170, 20); g.quadraticCurveTo(250, 150, 392, 158); g.moveTo(630, 20); g.quadraticCurveTo(550, 150, 408, 158); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(400, 162, 9, 0, Math.PI * 2); g.fill(); }
function hand(g) {
  g.beginPath(); g.ellipse(400, 300, 68, 82, 0, 0, Math.PI * 2); g.fill();
  [[-50, -70, 0.12, 95], [-17, -88, 0.03, 110], [17, -86, -0.03, 104], [48, -68, -0.12, 86]].forEach(([dx, dy, rot, len]) => {
    g.save(); g.translate(400 + dx, 300 + dy); g.rotate(rot); g.beginPath(); g.roundRect(-14, -len, 28, len + 20, 14); g.fill(); g.restore();
  });
  g.save(); g.translate(330, 320); g.rotate(-0.9); g.beginPath(); g.roundRect(-15, -80, 30, 90, 15); g.fill(); g.restore();
}
function drips(g) { g.lineWidth = 5; g.lineCap = 'round'; [350, 385, 420, 455].forEach((x, k) => { g.beginPath(); g.moveTo(x, 370); g.lineTo(x + (k % 2 ? 2 : -2), 430 - k * 8); g.stroke(); }); }
function stairs(g) {
  g.lineWidth = 6; g.lineCap = 'round';
  [[1, 0], [-1, 800]].forEach(([dir, base]) => {
    g.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20; g.lineTo(base + dir * (110 + u * 220), 420 - u * 190 - Math.sin(u * Math.PI) * 25); } g.stroke();
    for (let k = 0; k < 9; k++) { const u = k / 9, x = base + dir * (120 + u * 210), y = 420 - u * 190 - Math.sin(u * Math.PI) * 25; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dir * 40, y + 6); g.stroke(); }
  });
  g.fillRect(320, 222, 160, 8);
}
function clockFace(g) { g.lineWidth = 6; g.beginPath(); g.arc(400, 150, 44, 0, Math.PI * 2); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(400, 150); g.lineTo(400, 118); g.moveTo(400, 150); g.lineTo(424, 158); g.stroke(); g.fillRect(352, 196, 96, 20); }
function dome(g) { g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(400, 340, 250 + k * 34, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); } }

const SUN_C = [lx(170), ly(300)];
function bowShape(n, withRays) {
  const list = [
    { key: 'fProw', tag: 0, w: 0.8, draw: prow }, { key: 'fRail', tag: 1, w: 1.6, draw: railing },
    { key: 'fFigures', tag: 2, w: 3.2, draw: figures }, { key: 'fSunset', tag: 3, w: 0.9, draw: sunset }
  ];
  if (withRays) list.push({ key: 'fRays', tag: 4, w: 1.6, draw: glowRays, prm: (x, y) => clamp01((Math.atan2(y - ly(170), x - lx(612)) / Math.PI)) });
  return parts(n, list);
}
function bowColor(i, tag, prm, x, y, z, st, o, fx, climax) {
  if (tag === 0) { hsl(0.07, 0.35, 0.72, o, 0); o[3] = 0.6; o[4] = 0.85; return; }
  if (tag === 1) { o[0] = 1; o[1] = 0.9; o[2] = 0.75; o[3] = 0.75; o[4] = 0.75; return; }
  if (tag === 2) { hsl(0.1, 0.9, 0.62 + 0.15 * fx.pulse, o, 0); o[3] = 1; o[4] = 1.15; return; }
  if (tag === 3) { hsl(0.03 + clamp01((y - SUN_C[1]) / 8) * 0.06, 0.95, 0.5, o, 0); o[3] = climax ? 0.8 : 0.9; o[4] = 1; return; }
  hsl(0.11, 0.95, 0.65, o, 0); o[3] = 0.25 + 0.75 * clamp01(fx.pulse * 1.4) * (0.6 + 0.4 * Math.sin(st * 2 + prm * 9)); o[4] = 1;
}

export const DEFS = {
  pad: T.pad, climb: { ...T.climb, cap: st => st > 4 ? ['1912년 4월, 사우샘프턴 항구', '영화 「타이타닉」'] : null },
  fShip: { ...T.ship, spot: false, cap: () => ['꿈의 배, 타이타닉', ''] },
  fStars: { ...T.calmSea, cap: () => ['별이 쏟아지던 바다 위에서', ''] },
  fBow: {
    build: n => bowShape(n, false),
    color(i, tag, prm, x, y, z, st, o, fx) { bowColor(i, tag, prm, x, y, z, st, o, fx, false); },
    cap: () => ['뱃머리에 선 두 사람', '']
  },
  fHeart: {
    build: n => parts(n, [{ key: 'fGem', tag: 0, w: 1.0, draw: gem }, { key: 'fDiamonds', tag: 1, w: 1.8, draw: diamonds }, { key: 'fChain', tag: 2, w: 1.6, draw: chain }]),
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag === 0) { hsl(0.62, 0.9, 0.42 + 0.2 * clamp01((y + 3) / 14) + 0.1 * fx.pulse, o, 0); if (twinkle(i, st, 5) < 0.02) { o[0] = o[1] = o[2] = 1; } o[3] = 1; o[4] = 1; return; }
      if (tag === 1) { o[0] = 0.95; o[1] = 0.97; o[2] = 1; o[3] = 0.55 + 0.45 * twinkle(i, st, 4); o[4] = 1; return; }
      o[0] = 0.8; o[1] = 0.84; o[2] = 0.9; o[3] = 0.75; o[4] = 0.8;
    },
    cap: () => ['바다의 심장', '']
  },
  fHand: {
    build: n => parts(n, [{ key: 'fHandP', tag: 0, w: 1.0, draw: hand }, { key: 'fDrips', tag: 1, w: 2.2, draw: drips, prm: (x, y) => clamp01((ly(370) - y) / (ly(370) - ly(430))) }]),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { o[0] = 1; o[1] = 0.93; o[2] = 0.85; o[3] = 0.9; o[4] = 0.95; return; }
      const f = Math.max(0, Math.sin(prm * 6 - st * 1.2)); o[0] = 0.8; o[1] = 0.88; o[2] = 1; o[3] = 0.15 + 0.8 * f; o[4] = 0.85;
    },
    cap: () => ['김 서린 창에 남은 손자국', '']
  },
  fIceberg: { ...T.iceberg, cap: st => st < 12 ? ['그리고, 빙산', ''] : ['차가운 바다 위에서', ''] },
  fNever: { build: n => text('절대 놓지 않을게', n), color: (i, tag, prm, x, y, z, st, o, fx) => { hsl(0.58, 0.45, 0.78 + 0.08 * fx.pulse, o, 0); o[3] = 1; o[4] = 0.9; }, cap: () => ['', '약속은 끝까지'] },
  fFlying: {
    spot: true,
    build: n => bowShape(n, true),
    color(i, tag, prm, x, y, z, st, o, fx) { bowColor(i, tag, prm, x, y, z, st, o, fx, true); },
    cap: () => ['나는 지금 날고 있어요', '']
  },
  fStair: {
    build: n => parts(n, [{ key: 'fStairs', tag: 0, w: 1.4, draw: stairs }, { key: 'fClock', tag: 1, w: 1.8, draw: clockFace }, { key: 'fDome', tag: 2, w: 1.4, draw: dome, prm: x => (x + 28) / 56 }]),
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag === 0) { hsl(0.1, 0.7, 0.62, o, 0); o[3] = 0.95; o[4] = 0.9; return; }
      if (tag === 1) { o[0] = 1; o[1] = 0.97; o[2] = 0.9; o[3] = 1; o[4] = 1; return; }
      hsl(0.55, 0.4, 0.75, o, 0); o[3] = 0.35 + 0.5 * Math.max(0, Math.sin(prm * 8 - st * 0.8)) + 0.2 * fx.pulse; o[4] = 0.85;
    },
    cap: () => ['모두가 다시 만나는 그곳', '시계 아래 계단에서']
  },
  fTitle: { build: n => text('My Heart Will Go On', n), color: (i, tag, prm, x, y, z, st, o, fx) => { hsl(0.1, 0.8, 0.66 + 0.1 * Math.sin(prm * 10 - st * 1.5) + 0.08 * fx.pulse, o, 0); o[3] = 1; o[4] = 0.9; }, cap: (st, c) => ['마음은 계속될 거예요', '오늘 ' + c.n + '명이 함께했어요'] },
  fPortrait0: portraitDef(0), fPortrait1: portraitDef(1),
  approach: T.approach, land: T.land
};
export const SPOT = [lx(612), ly(250), 0];
void C; void shipParts; void shipColor; void FUNNEL_BAND;
