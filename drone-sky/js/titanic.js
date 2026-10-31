// Special episode: RMS Titanic, April 1912. Told from the historical record, as remembrance.
// Music: Joplin "The Entertainer" (1902, from the public-domain Mutopia edition), "Amazing Grace",
// Satie "Gymnopédie No. 1". A listener may also play their own audio file in Act 3-4.
import { DEFS as BASE, parts, single, newShape, alloc, text, hash, twinkle, clamp01, minJerk, lx, ly, C } from './scenes.js';
import { field as fieldPts } from './formations.js';
import { hsl } from './world.js';

export const SHOW_LEN = 750;
export const SCENES = [
  { id: 'pad', at: 0 }, { id: 'climb', at: 10 }, { id: 'tLightwave', at: 60 },
  { id: 'ship', at: 100 }, { id: 'compass', at: 150 }, { id: 'violin', at: 205 },
  { id: 'calmSea', at: 260 }, { id: 'iceberg', at: 300 }, { id: 'rockets', at: 340 },
  { id: 'lifeboats', at: 400 }, { id: 'band', at: 441 }, { id: 'tSolo', at: 481 },
  { id: 'carpathia', at: 540 }, { id: 'date', at: 590 }, { id: 'remember', at: 620 }, { id: 'safe', at: 650 },
  { id: 'approach', at: 680 }, { id: 'land', at: 710 }
];
SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].at : SHOW_LEN; });
export const CHAPTERS = [
  { label: '프롤로그 · 출항 전', at: 0 }, { label: '1막 · 꿈의 배', at: 100 }, { label: '2막 · 그날 밤', at: 260 },
  { label: '3막 · 마지막까지', at: 400 }, { label: '불빛 하나', at: 481 }, { label: '4막 · 새벽', at: 540 }, { label: '엔딩 · 착륙', at: 680 }
];
export const SONGS = [
  { from: 0, to: 100, title: '파도와 뱃고동' }, { from: 100, to: 260, title: '스콧 조플린 「The Entertainer」 (1902)' },
  { from: 260, to: 400, title: '고요한 바다' }, { from: 400, to: 540, title: '「Amazing Grace」' },
  { from: 540, to: 620, title: '사티 「짐노페디 1번」' }, { from: 620, to: SHOW_LEN, title: '「Amazing Grace」' }
];
export const GRID = [[100, 260, 0.8, 2], [401, 541, 2.5 / 3, 3], [540, 620, 80 / 87, 3], [621, 741, 2.5 / 3, 3]];
export const ROCKETS = [342, 349, 356, 363, 370, 377, 384, 391];
export const CUSTOM_FROM = 400;      // where a listener's own song starts by default
export const META = {
  title: '타이타닉, 1912', subtitle: '특별 회차 · 그날 밤을 기억하며', place: '타이타닉 1912 특별 회차',
  snapScene: 'ship', spotScene: 'ship', spotLabel: '뱃머리 불빛', spotTopic: '뱃머리 불빛은',
  cardLine: '1912년 4월, 타이타닉호를 기억하며', soloDark: 20
};

/* ---------- music ---------- */
export function arrange() {
  const ev = [], add = (...e) => ev.push(e);
  const seq = (t0, unit, notes, fn) => { let t = t0; for (const [m, d] of notes) { if (m != null) fn(m, t, d * unit); t += d * unit; } return t; };

  add(0, 'waves', SHOW_LEN);
  for (let k = 0; k < 10; k++) add(k, 'bell', 81, 0.05 + k * 0.006);
  add(8, 'horn', 3, 0.16); add(58, 'horn', 2.4, 0.14); add(96.5, 'horn', 1.2, 0.12); add(98, 'horn', 1.6, 0.12);
  [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 60, 64], [55, 59, 62, 67]].forEach((c, k) => { add(12 + k * 22, 'str', c, 22, 0.028, 750); add(12 + k * 22 + 2, 'pno', c[3] + 12, 3, 0.1); });

  /* The Entertainer, first strain (C major, 2/4). 16th = 0.2 s, bar = 1.6 s. */
  {
    const t0 = 100, u = 0.2, bar = 1.6;
    const INTRO = [[86, 1], [88, 1], [84, 1], [81, 2], [83, 1], [79, 2], [74, 1], [76, 1], [72, 1], [69, 2], [71, 1], [67, 2], [62, 1], [64, 1], [60, 1], [57, 2], [59, 1], [57, 1], [56, 1], [55, 2], [null, 2], [null, 2], [62, 1], [63, 1]];
    const A = [[64, 1], [72, 2], [64, 1], [72, 2], [64, 1], [72, 6], [84, 1], [86, 1], [87, 1],
      [88, 1], [84, 1], [86, 1], [88, 2], [83, 1], [86, 2], [84, 6], [62, 1], [63, 1],
      [64, 1], [72, 2], [64, 1], [72, 2], [64, 1], [72, 7], [81, 1], [79, 1],
      [78, 1], [81, 1], [84, 1], [88, 2], [86, 1], [84, 1], [81, 1], [86, 6], [62, 1], [63, 1],
      [64, 1], [72, 2], [64, 1], [72, 2], [64, 1], [72, 6], [84, 1], [86, 1], [87, 1],
      [88, 1], [84, 1], [86, 1], [88, 2], [83, 1], [86, 2], [84, 6], [84, 1], [86, 1],
      [88, 1], [84, 1], [86, 1], [88, 2], [84, 1], [86, 1], [84, 1],
      [88, 1], [84, 1], [86, 1], [88, 2], [84, 1], [86, 1], [84, 1],
      [88, 1], [84, 1], [86, 1], [88, 2], [83, 1], [86, 2], [84, 6], [62, 1], [63, 1]];
    const Cc = [64, 67, 72], C7 = [67, 70, 72], F = [69, 72], Cg = [67, 72], G7 = [65, 67, 71], D7 = [62, 66, 69, 72], D7b = [66, 69, 72], G = [67, 71], Fm = [65, 68, 72], Fc = [65, 69, 72];
    // left hand per bar: four eighths, number = bass note, array = chord, null = rest
    const LH = [[48, Cc, 43, C7], [41, F, 40, Cg], [43, Cc, 43, G7], [48, Cc, Cc, G], [48, Cc, 43, C7], [41, F, 40, 39], [38, D7, 38, D7b], [G, 43, 45, 47],
      [48, Cc, 43, C7], [41, F, 40, Cg], [43, Cc, 43, G7], [48, Cc, Cc, null], [48, Cc, 46, Cc], [45, Fc, 44, Fm], [43, Cc, 43, G], [[48, 55, 60], 43, 45, 47]];
    seq(t0, u, INTRO, (m, t, d) => add(t, 'pno', m, d, 0.26));
    add(t0 + 3 * bar + 0.4, 'pno', [79, 74, 71, 67], 0.4, 0.22);
    for (let p = 0; p < 6; p++) {
      const ts = t0 + 4 * bar + p * 16 * bar, last = p === 5;
      const notes = last ? A.slice(0, -2) : A;
      seq(ts, u, notes, (m, t, d) => {
        if (p < 2) add(t, 'pno', m, d, 0.24);
        else if (p < 4) { add(t, 'flute', m - 12, d, 0.13); add(t, 'pno', m, d, 0.13); }
        else { add(t, 'lead', m - 12, d, 0.12); add(t, 'pno', m, d, 0.15); }
      });
      LH.forEach((bars, k) => bars.forEach((x, j) => {
        const t = ts + k * bar + j * 0.4;
        if (x == null) return;
        if (Array.isArray(x)) add(t, 'pno', x, 0.35, p < 2 ? 0.09 : 0.08);
        else { add(t, 'bass', x, 0.36, p < 2 ? 0.16 : 0.2); if (p >= 2) add(t, 'pno', x, 0.35, 0.08); }
      }));
      if (p >= 4) LH.forEach((bars, k) => { if (k % 4 === 0) add(ts + k * bar, 'str', [60, 64, 67], 4 * bar, 0.022, 1300); });
    }
    add(t0 + 100 * bar - 1.6, 'pno', [48, 60, 64, 67, 72], 2, 0.2);
  }

  /* night at sea */
  {
    [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]].forEach((c, k) => add(260 + k * 10, 'str', c, 10, 0.026, 650));
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let t = 261; t < 299; t += 2 + r() * 2.5) add(t, 'bell', [81, 84, 86, 88, 91][Math.floor(r() * 5)], 0.035);
    add(300, 'bell', 72, 0.22); add(300.7, 'bell', 72, 0.22); add(301.4, 'bell', 72, 0.22);
    add(300, 'str', [33, 40], 40, 0.05, 300);
    for (let t = 303; t < 338; t += 1.1) { const v = 0.06 + (t - 303) / 35 * 0.08; add(t, 'timp', v); add(t + 0.28, 'timp', v * 0.6); }
    add(320, 'str', [57, 58, 64], 18, 0.018, 900);
    add(340, 'str', [50, 57, 62, 65], 30, 0.03, 800); add(370, 'str', [46, 53, 58, 62], 30, 0.03, 800);
    ROCKETS.forEach(t => { add(t, 'swell', 1.4, 0.05); add(t + 1.5, 'boom', 0.22); add(t + 1.5, 'crash', 0.04); });
  }

  /* Amazing Grace (G major, 3/4), bar = 2.5 s */
  const grace = (start, o) => {
    const b = 2.5 / 3, bar = 2.5;
    const M = [[[67, 2], [71, 0.5], [67, 0.5]], [[71, 2], [69, 1]], [[67, 2], [64, 1]], [[62, 2], [62, 1]],
      [[67, 2], [71, 0.5], [67, 0.5]], [[71, 2], [69, 1]], [[74, 3]], [[74, 2], [71, 1]],
      [[74, 2], [71, 0.5], [67, 0.5]], [[71, 2], [69, 1]], [[67, 2], [64, 1]], [[62, 2], [62, 1]],
      [[67, 2], [71, 0.5], [67, 0.5]], [[71, 2], [69, 1]], [[67, 3]], [[67, 3]]];
    const Gc = [55, 59, 62], Cc = [55, 60, 64], Em = [55, 59, 64], Dc = [54, 57, 62];
    const H = [Gc, Gc, Cc, Gc, Gc, Em, Dc, Dc, Gc, Gc, Cc, Gc, Em, Dc, Gc, Gc];
    const root = h => (h === Gc ? 43 : h === Cc ? 48 : h === Em ? 40 : 38);
    if (o.pickup) add(start - b, o.mel, 62 + (o.oct || 0), b, o.mv);
    for (let k = o.from || 0; k < (o.to || 16); k++) {
      const tb = start + k * bar, h = H[k];
      seq(tb, b, M[k], (m, t, d) => { add(t, o.mel, m + (o.oct || 0), d, o.mv); if (o.mel2) add(t, o.mel2, m + 12, d, o.mv2); });
      if (o.pad) add(tb, 'str', h, bar, o.pad, o.cut || 1200);
      if (o.bass) add(tb, 'bass', root(h), bar * 0.9, o.bass);
      if (o.harp) [h[0], h[1], h[2], h[1] + 12, h[2], h[1]].forEach((m, j) => add(tb + j * b * 0.5, 'harp', m + 12, o.harp));
      if (k === 15 || k === 7) add(tb + 2 * b, o.mel, (k === 7 ? 71 : 62) + (o.oct || 0), b, o.mv * (k === 15 ? 0.8 : 1));
    }
  };
  grace(401, { pickup: true, mel: 'lead', mv: 0.12, pad: 0.028, bass: 0.12, cut: 900 });
  grace(441, { mel: 'lead', mv: 0.14, pad: 0.045, bass: 0.16, harp: 0.045 });
  grace(481, { mel: 'pno', mv: 0.28, to: 8 });
  grace(481, { mel: 'lead', mv: 0.16, mel2: 'flute', mv2: 0.08, pad: 0.06, bass: 0.2, harp: 0.05, from: 8, cut: 1800 });
  add(481 + 8 * 2.5, 'timp', 0.2); add(481 + 8 * 2.5, 'crash', 0.07); add(481 + 8 * 2.5 - 1.6, 'swell', 1.6, 0.06);
  add(521, 'str', [43, 55, 59, 62], 17, 0.035, 1000);
  [55, 59, 62, 67, 71, 74].forEach((m, j) => add(521 + j * 0.4, 'harp', m + 12, 0.06));

  /* Gymnopédie No. 1, 29 bars */
  {
    const t0 = 540, bar = 80 / 29, b = bar / 3;
    const G = [59, 62, 66], D = [57, 61, 66];
    for (let k = 0; k < 28; k++) {
      const tb = t0 + k * bar, g = k % 2 === 0;
      add(tb, 'bass', g ? 43 : 38, bar * 0.95, 0.24);
      add(tb + b, 'pno', g ? G : D, 2 * b, 0.12);
      if (k >= 12) add(tb, 'str', g ? [43, 55, 59] : [38, 57, 61], bar, 0.035, 900);
    }
    add(t0 + 28 * bar, 'pno', [38, 57, 61, 66], 2.5, 0.14);
    const A = [[null, 1], [78, 1], [81, 1], [79, 1], [78, 1], [73, 1], [71, 1], [73, 1], [74, 1], [69, 3], [66, 12]];
    seq(t0 + 4 * bar, b, A, (m, t, d) => add(t, 'pno', m, d, 0.34));
    seq(t0 + 12 * bar, b, A, (m, t, d) => { add(t, 'pno', m, d, 0.32); add(t, 'str', [m], d, 0.045, 1700); });
    seq(t0 + 20 * bar, b, A.slice(0, 10), (m, t, d) => { add(t, 'pno', m - 12, d, 0.28); add(t, 'harp', m, 0.08); });
  }

  grace(621, { pickup: true, mel: 'lead', mv: 0.15, mel2: 'flute', mv2: 0.09, pad: 0.06, bass: 0.2, harp: 0.05, cut: 1800 });
  add(621, 'crash', 0.06);
  grace(661, { mel: 'pno', mv: 0.26, pad: 0.035, bass: 0.12, cut: 1000 });
  grace(701, { mel: 'pno', mv: 0.2, mel2: 'bell', mv2: 0.04 });
  add(741, 'str', [43, 55, 59, 62, 67], 8, 0.035, 900); add(741, 'pno', [43, 55, 59, 62, 67], 4, 0.16);

  ev.forEach(e => { if (e[1] === 'bell' && e.length === 5) { e[3] = e[4]; e.length = 4; } });
  ev.sort((a, b) => a[0] - b[0]);
  return ev;
}

/* ---------- shapes ---------- */
const PORT_ROWS = [270, 290];
function hull(g) {
  g.beginPath(); g.moveTo(62, 250); g.lineTo(735, 250); g.quadraticCurveTo(744, 292, 712, 322); g.lineTo(122, 322); g.quadraticCurveTo(80, 302, 62, 250); g.closePath(); g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out'; portholes(g); g.restore();
}
function portholes(g) { PORT_ROWS.forEach(y => { for (let x = 110; x < 705; x += 13) { g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill(); } }); }
function decks(g) { g.fillRect(165, 226, 480, 24); g.fillRect(215, 212, 400, 14); }
const FUNNELS = [250, 345, 440, 535];
function funnels(g) { FUNNELS.forEach(x => { g.beginPath(); g.moveTo(x, 212); g.lineTo(x + 34, 212); g.lineTo(x + 48, 92); g.lineTo(x + 14, 92); g.closePath(); g.fill(); }); }
function masts(g) {
  g.lineCap = 'round'; g.lineWidth = 4; g.beginPath(); g.moveTo(118, 250); g.lineTo(124, 58); g.moveTo(690, 250); g.lineTo(684, 66); g.stroke();
  g.lineWidth = 2.6; g.beginPath(); g.moveTo(66, 250); g.lineTo(124, 60); g.lineTo(684, 68); g.lineTo(735, 250); g.stroke();
}
function smoke(g) {   // the fourth funnel was a dummy, so only three smoke
  g.lineWidth = 12; g.lineCap = 'round';
  FUNNELS.slice(0, 3).forEach((x, k) => { g.beginPath(); for (let s = 0; s <= 1.0001; s += 0.05) g.lineTo(x + 32 + s * 110, 84 - s * 52 + Math.sin(s * 6 + k) * 5); g.stroke(); });
}
const BOW = [lx(84), ly(246), 0];
const SMOKE_TOP = ly(32), SMOKE_BOT = ly(86), FUNNEL_BAND = ly(116);
function shipParts(xf) {
  return [
    { key: 'hull', tag: 0, w: 0.8, draw: hull, xf },
    { key: 'decks', tag: 1, w: 1.0, draw: decks, xf },
    { key: 'funnels', tag: 2, w: 1.1, draw: funnels, xf },
    { key: 'ports', tag: 3, w: 2.6, draw: portholes, xf },
    { key: 'masts', tag: 4, w: 1.8, draw: masts, xf },
    { key: 'smoke', tag: 5, w: 0.9, draw: smoke, xf, prm: (x, y) => clamp01((y - (xf ? xf(0, SMOKE_BOT, 0)[1] : SMOKE_BOT)) / ((xf ? xf(0, SMOKE_TOP, 0)[1] : SMOKE_TOP) - (xf ? xf(0, SMOKE_BOT, 0)[1] : SMOKE_BOT))) }
  ];
}
function shipColor(tag, prm, y, st, o, fx, i, yBand) {
  if (tag === 0) { o[0] = 0.55; o[1] = 0.62; o[2] = 0.8; o[3] = 0.55; o[4] = 0.85; return; }
  if (tag === 1) { o[0] = 0.96; o[1] = 0.96; o[2] = 1; o[3] = 0.9; o[4] = 0.9; return; }
  if (tag === 2) { if (y > yBand) { o[0] = 0.35; o[1] = 0.3; o[2] = 0.3; o[3] = 0.45; } else { o[0] = 1; o[1] = 0.7; o[2] = 0.36; o[3] = 0.95; } o[4] = 0.95; return; }
  if (tag === 3) { const f = 0.75 + 0.25 * Math.sin(st * 1.3 + i); o[0] = 1; o[1] = 0.82 * f + 0.1; o[2] = 0.45; o[3] = 1; o[4] = 0.95; return; }
  if (tag === 4) { o[0] = 0.7; o[1] = 0.76; o[2] = 0.9; o[3] = 0.6; o[4] = 0.7; return; }
  const flow = Math.max(0, Math.sin(prm * 9 - st * 1.8));
  o[0] = 0.85; o[1] = 0.85; o[2] = 0.9; o[3] = 0.08 + 0.5 * flow * (1 - prm * 0.6); o[4] = 0.85;
}
function compassDraw(g) {
  const cx = 400, cy = 225, pts = [];
  for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + k * Math.PI / 8, r = k % 4 === 0 ? 150 : k % 2 === 0 ? 92 : 30; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
}
function compassRing(g) { g.lineWidth = 6; g.beginPath(); g.arc(400, 225, 175, 0, Math.PI * 2); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(400, 225, 112, 0, Math.PI * 2); g.stroke(); }
function compassLetters(g) {
  g.font = '900 40px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', 400, 22); g.fillText('S', 400, 430); g.fillText('E', 612, 225); g.fillText('W', 188, 225);
}
function violinBody(g) {
  g.beginPath(); g.ellipse(300, 300, 82, 92, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(300, 172, 66, 70, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(250, 200, 100, 80);
  g.save(); g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(214, 238, 30, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(386, 238, 30, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.beginPath(); g.moveTo(268, 230); g.quadraticCurveTo(258, 270, 268, 310); g.stroke(); g.beginPath(); g.moveTo(332, 230); g.quadraticCurveTo(342, 270, 332, 310); g.stroke();
  g.restore();
}
function violinNeck(g) { g.fillRect(291, 30, 18, 80); g.beginPath(); g.arc(300, 26, 13, 0, Math.PI * 2); g.fill(); g.fillRect(288, 100, 24, 150); }
function violinStrings(g) { g.lineWidth = 2; [292, 297, 303, 308].forEach(x => { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 360); g.stroke(); }); }
function bow(g) { g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(130, 400); g.lineTo(500, 130); g.stroke(); }
function notes(g) {
  [[560, 190], [655, 130], [712, 250], [600, 330]].forEach(([x, y]) => {
    g.beginPath(); g.ellipse(x, y, 15, 11, -0.4, 0, Math.PI * 2); g.fill();
    g.fillRect(x + 11, y - 62, 5, 62);
    g.lineWidth = 5; g.beginPath(); g.moveTo(x + 14, y - 62); g.quadraticCurveTo(x + 44, y - 46, x + 34, y - 18); g.stroke();
  });
}
function iceTop(g) { g.beginPath(); [[240, 232], [292, 176], [326, 188], [372, 92], [410, 142], [442, 118], [484, 190], [524, 172], [566, 232]].forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); }
function iceBelow(g) { g.beginPath(); [[220, 242], [580, 242], [640, 320], [560, 418], [360, 436], [196, 352]].forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); }
function waterline(g) { g.fillRect(40, 235, 720, 5); }
function carpathiaHull(g) {
  g.beginPath(); g.moveTo(120, 262); g.lineTo(560, 262); g.quadraticCurveTo(566, 292, 545, 318); g.lineTo(160, 318); g.quadraticCurveTo(128, 300, 120, 262); g.closePath(); g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out'; for (let x = 160; x < 540; x += 15) { g.beginPath(); g.arc(x, 282, 3.4, 0, Math.PI * 2); g.fill(); } g.restore();
}
function carpathiaTop(g) { g.fillRect(220, 236, 260, 26); g.beginPath(); g.moveTo(330, 236); g.lineTo(368, 236); g.lineTo(380, 92); g.lineTo(342, 92); g.closePath(); g.fill(); g.lineWidth = 4; g.beginPath(); g.moveTo(170, 262); g.lineTo(176, 110); g.moveTo(520, 262); g.lineTo(514, 118); g.stroke(); }
function carpathiaPorts(g) { for (let x = 160; x < 540; x += 15) { g.beginPath(); g.arc(x, 282, 3.4, 0, Math.PI * 2); g.fill(); } }
function sun(g) { g.beginPath(); g.arc(640, 300, 92, Math.PI, 0); g.closePath(); g.fill(); }
function sunRays(g) { g.lineWidth = 9; g.lineCap = 'round'; for (let k = 0; k < 7; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 7; g.beginPath(); g.moveTo(640 + Math.cos(a) * 112, 300 + Math.sin(a) * 112); g.lineTo(640 + Math.cos(a) * 168, 300 + Math.sin(a) * 168); g.stroke(); } }
function horizon(g) { g.fillRect(30, 320, 740, 5); }

function seaSheet(c, w, d, y0, tilt) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(c * w / d))), rows = Math.ceil(c / cols), out = new Float32Array(c * 3), ca = Math.cos(tilt), sa = Math.sin(tilt);
  for (let i = 0; i < c; i++) {
    const x = ((i % cols) / (cols - 1) - 0.5) * w, z = (Math.floor(i / cols) / Math.max(1, rows - 1) - 0.5) * d;
    out[3 * i] = x; out[3 * i + 1] = y0 - z * sa; out[3 * i + 2] = z * ca;
  }
  return out;
}
const SEA_TILT = -0.62;

/* ---------- scene definitions ---------- */
const ROCKET_X = [-9, 5, -3, 9, -6, 2, -11, 7], ROCKET_H = [6, 9, 10.5, 7, 9.5, 11, 7.5, 10];
const BOATS = Array.from({ length: 20 }, (_, k) => [-26 + (k % 10) * 5.8 + (k >= 10 ? 2.9 : 0), -6.5 - (k >= 10 ? 2.6 : 0), k >= 10 ? -5 : 2]);
const STAFF_NOTES = [62, 67, 71, 67, 71, 69, 67, 64, 62, 67, 71, 67, 71, 69, 74, 74];

export const DEFS = {
  pad: BASE.pad,
  climb: { ...BASE.climb, cap: st => st > 4 ? ['114년 전 봄, 한 척의 배 이야기', ''] : null },
  tLightwave: { ...BASE.lightwave, cap: () => ['1912년 4월 10일, 사우샘프턴', '가장 큰 배가 첫 항해를 시작한 날'] },
  ship: {
    spot: true,
    build: n => parts(n, shipParts()),
    color(i, tag, prm, x, y, z, st, o, fx) { shipColor(tag, prm, y, st, o, fx, i, FUNNEL_BAND); },
    cap: st => st < 25 ? ['길이 269미터, 그 시절 가장 큰 배', ''] : ['2,200여 명이 저마다의 꿈을 싣고', '이민 가는 가족, 신혼부부, 일하러 가는 사람들']
  },
  compass: {
    build: n => parts(n, [
      { key: 'rose', tag: 0, w: 1.1, draw: compassDraw, prm: (x, y) => (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1 },
      { key: 'ring', tag: 1, w: 1.6, draw: compassRing, prm: (x, y) => (Math.atan2(y, x) / (2 * Math.PI) + 1) % 1 },
      { key: 'letters', tag: 2, w: 1.4, draw: compassLetters }
    ]),
    dyn(i, x, y, z, tag, prm, st, o) {
      const a = tag === 0 ? Math.sin(st * 0.12) * 0.08 : 0, c = Math.cos(a), s = Math.sin(a);
      o[0] = x * c - y * s + C[0]; o[1] = x * s + y * c + C[1]; o[2] = z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { const west = x < -6 && Math.abs(y) < 2.5; if (west) hsl(0.11, 0.95, 0.6 + 0.12 * Math.sin(st * 2), o, 0); else { o[0] = 0.85; o[1] = 0.9; o[2] = 1; } o[3] = 1; o[4] = west ? 1.2 : 0.95; return; }
      if (tag === 1) { const head = (st * 0.06) % 1, d = ((prm - head) % 1 + 1) % 1; o[0] = 0.7; o[1] = 0.8; o[2] = 1; o[3] = 0.35 + 0.65 * Math.max(0, 1 - d * 6); o[4] = 0.85; return; }
      const w = x < -5; if (w) hsl(0.11, 0.95, 0.65, o, 0); else { o[0] = 0.9; o[1] = 0.92; o[2] = 1; } o[3] = 1; o[4] = 1;
    },
    cap: () => ['대서양 건너 뉴욕을 향해', '서쪽으로, 새로운 삶이 기다리는 곳으로']
  },
  violin: {
    build: n => parts(n, [
      { key: 'vbody', tag: 0, w: 0.9, draw: violinBody },
      { key: 'vneck', tag: 0, w: 1.2, draw: violinNeck },
      { key: 'vstr', tag: 1, w: 2.2, draw: violinStrings },
      { key: 'vbow', tag: 2, w: 1.6, draw: bow },
      { key: 'vnotes', tag: 3, w: 1.4, draw: notes, prm: x => x > 18 ? 2 : x > 14 ? 1 : x > 10 ? 3 : 0 }
    ]),
    dyn(i, x, y, z, tag, prm, st, o) {
      let X = x, Y = y;
      if (tag === 2) { const s = Math.sin(st * 2 * Math.PI / 6) * 1.0; X += s * 0.8; Y -= s * 0.58; }
      if (tag === 3) Y += Math.sin(st * 0.5 + prm * 1.7) * 0.8;
      o[0] = X + C[0]; o[1] = Y + C[1]; o[2] = z + C[2];
    },
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag === 0) { hsl(0.07, 0.75, 0.5 + 0.12 * (y + 10) / 20, o, 0); o[3] = 0.95; o[4] = 0.95; return; }
      if (tag === 1) { o[0] = 1; o[1] = 0.95; o[2] = 0.85; o[3] = 0.5 + 0.5 * fx.pulse; o[4] = 0.8; return; }
      if (tag === 2) { o[0] = 0.92; o[1] = 0.9; o[2] = 0.82; o[3] = 0.85; o[4] = 0.85; return; }
      hsl(0.12, 0.9, 0.62, o, 0); o[3] = 0.5 + 0.5 * Math.max(0, Math.sin(st * 2 - prm * 1.6)); o[4] = 1;
    },
    cap: () => ['배 위에는 여덟 명의 악단이 있었어요', '식당에서, 갑판에서, 사람들을 위해 연주했죠']
  },
  calmSea: {
    tcap: 32,
    build: n => parts(n, [
      { gen: c => { const f = fieldPts(c); for (let i = 0; i < c; i++) { f[3 * i + 1] = 2 + Math.abs(f[3 * i + 1]) * 0.95; } return f; }, share: 0.55, tag: 0 },
      { gen: c => seaSheet(c, 62, 22, -9.5, SEA_TILT), share: 0.45, tag: 1 }
    ].map(p => ({ ...p, prm: (x, y, k) => hash(k * 13 + 1) }))),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { o[0] = 0.85; o[1] = 0.9; o[2] = 1; o[3] = 0.25 + 0.55 * twinkle(i, st, 0.8 + prm); o[4] = 0.75; return; }
      o[0] = 0.25; o[1] = 0.4; o[2] = 0.75; o[3] = 0.1 + 0.25 * twinkle(i, st, 0.5); o[4] = 0.7;
    },
    cap: () => ['4월 14일 밤, 바다는 거울처럼 잔잔했어요', '달도 없이, 별만 가득한 밤']
  },
  iceberg: {
    build: n => parts(n, [
      { key: 'iceTop', tag: 0, w: 1.3, draw: iceTop }, { key: 'iceBelow', tag: 1, w: 0.7, draw: iceBelow }, { key: 'water', tag: 2, w: 1.5, draw: waterline }
    ]),
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 0) { o[0] = 0.85; o[1] = 0.95; o[2] = 1; o[3] = clamp01(st / 6); o[4] = 1; return; }
      if (tag === 2) { o[0] = 0.5; o[1] = 0.65; o[2] = 0.9; o[3] = 0.7; o[4] = 0.8; return; }
      hsl(0.55, 0.7, 0.45, o, 0); o[3] = 0.06 + 0.6 * clamp01((st - 16) / 10); o[4] = 0.85;
    },
    cap: st => st < 14 ? ['밤 11시 40분', '망루의 종이 세 번 울렸어요'] : ['빙산', '보이는 건 아주 작은 끝이었어요']
  },
  rockets: {
    build: n => {
      const xf = (x, y, z) => [x * 0.55, y * 0.55 - 10, z];
      const deckY = xf(0, ly(250), 0)[1];
      return parts(n, [
        ...shipParts(xf).map(p => ({ ...p, share: { 0: 0.1, 1: 0.07, 2: 0.07, 3: 0.08, 4: 0.04, 5: 0.02 }[p.tag] })),
        { gen: c => { const out = new Float32Array(c * 3); for (let i = 0; i < c; i++) { const k = i % 8, u = Math.floor(i / 8) / Math.max(1, Math.ceil(c / 8) - 1); out[3 * i] = ROCKET_X[k] * (0.4 + 0.6 * u); out[3 * i + 1] = deckY + (ROCKET_H[k] - deckY) * u; out[3 * i + 2] = 0; } return out; }, share: 0.22, tag: 6, prm: (x, y, j) => (j % 8) + clamp01((y - deckY) / 25) },
        { gen: c => { const out = new Float32Array(c * 3), per = Math.ceil(c / 8), ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < c; i++) { const k = i % 8, j = Math.floor(i / 8), m = 5, sp = Math.floor(j / m), rr = ((j % m) + 1) / m * 4.5, spokes = Math.max(1, Math.ceil(per / m)), yy = 1 - (sp + 0.5) / spokes * 2, r2 = Math.sqrt(Math.max(0, 1 - yy * yy)); out[3 * i] = ROCKET_X[k] * 0.4 + ROCKET_X[k] * 0.6 + Math.cos(sp * ga) * r2 * rr; out[3 * i + 1] = ROCKET_H[k] + yy * rr; out[3 * i + 2] = Math.sin(sp * ga) * r2 * rr; } return out; }, share: 0.4, tag: 7, prm: (x, y, j) => (j % 8) + (((Math.floor(j / 8)) % 5) + 1) / 5 }
      ]);
    },
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag <= 5) { shipColor(tag, prm, y, st, o, fx, i, FUNNEL_BAND * 0.55 - 10); if (tag === 3) o[3] *= 0.85; return; }
      const k = Math.floor(prm), f = prm - k, s = fx.abs - ROCKETS[k];
      o[0] = 1; o[1] = 0.97; o[2] = 0.92; o[4] = tag === 7 ? 1 : 0.8;
      if (tag === 6) { const head = s / 1.5; o[3] = s > 0 && f < head && s < 3 ? 0.9 * Math.exp(-Math.max(0, s - 1.5) * 2) : 0.0; return; }
      const sb = s - 1.5, front = sb * 4;
      o[3] = sb > 0 && f * 4.5 < front ? Math.min(1, 0.25 + Math.exp(-(front - f * 4.5) * 0.6)) * Math.exp(-Math.max(0, sb - 1.8) * 0.45) : 0;
    },
    cap: () => ['배는 하늘로 흰 신호탄을 쏘아 올렸어요', '여기 우리가 있다고']
  },
  lifeboats: {
    tcap: 30,
    build: n => {
      const [sea, hulls, lamps] = alloc(n, [55, 30, 15]), s = newShape(n);
      let o = 0;
      const sp = seaSheet(sea, 62, 22, -9.5, SEA_TILT);
      for (let i = 0; i < sea; i++, o++) { s.pts.set(sp.subarray(3 * i, 3 * i + 3), 3 * o); s.tag[o] = 2; s.prm[o] = hash(i); }
      for (let i = 0; i < hulls; i++, o++) { const b = BOATS[i % 20], u = Math.floor(i / 20) / Math.max(1, Math.ceil(hulls / 20) - 1), th = Math.PI + u * Math.PI; s.pts[3 * o] = b[0] + Math.cos(th) * 1.7; s.pts[3 * o + 1] = b[1] + Math.sin(th) * 0.7; s.pts[3 * o + 2] = b[2]; s.tag[o] = 0; s.prm[o] = i % 20; }
      for (let i = 0; i < lamps; i++, o++) { const b = BOATS[i % 20]; s.pts[3 * o] = b[0] + (hash(i * 3) - 0.5) * 0.4; s.pts[3 * o + 1] = b[1] + 1.2 + (hash(i * 5) - 0.5) * 0.4; s.pts[3 * o + 2] = b[2]; s.tag[o] = 1; s.prm[o] = i % 20; }
      return s;
    },
    color(i, tag, prm, x, y, z, st, o) {
      if (tag === 2) { o[0] = 0.2; o[1] = 0.32; o[2] = 0.6; o[3] = 0.08 + 0.12 * twinkle(i, st, 0.6); o[4] = 0.7; return; }
      const on = st > 3 + prm * 1.2;
      if (tag === 1) { const f = 0.8 + 0.2 * Math.sin(st * 4 + prm * 3); o[0] = 1; o[1] = 0.78 * f; o[2] = 0.4; o[3] = on ? 1 : 0.02; o[4] = 1.3; return; }
      o[0] = 0.8; o[1] = 0.82; o[2] = 0.9; o[3] = on ? 0.5 : 0.02; o[4] = 0.8;
    },
    cap: () => ['구명보트 스무 척이 차가운 바다에 내려졌어요', '서로의 손을 꼭 잡은 채로']
  },
  band: {
    tcap: 30,
    build: n => {
      const [staff, nts, mus] = alloc(n, [45, 30, 25]), s = newShape(n);
      let o = 0;
      for (let i = 0; i < staff; i++, o++) { const line = i % 5, u = Math.floor(i / 5) / Math.max(1, Math.ceil(staff / 5) - 1); s.pts[3 * o] = -27 + u * 54; s.pts[3 * o + 1] = 1 + line * 1.5; s.pts[3 * o + 2] = 0; s.tag[o] = 0; }
      for (let i = 0; i < nts; i++, o++) { const k = i % 16, j = Math.floor(i / 16), a = j * 2.4, r = Math.sqrt(j / Math.max(1, Math.ceil(nts / 16))) * 0.75; s.pts[3 * o] = -24 + k * 3.2 + Math.cos(a) * r * 1.3; s.pts[3 * o + 1] = 1 + (STAFF_NOTES[k] - 64) * 0.375 + Math.sin(a) * r; s.pts[3 * o + 2] = 0; s.tag[o] = 1; s.prm[o] = k; }
      for (let i = 0; i < mus; i++, o++) { const k = i % 8, j = Math.floor(i / 8), a = j * 2.4, r = Math.sqrt(j / Math.max(1, Math.ceil(mus / 8))) * 0.9, cx = -15 + k * (30 / 7), cy = -10 + Math.cos((k - 3.5) / 3.5 * 1.2) * 2.5; s.pts[3 * o] = cx + Math.cos(a) * r; s.pts[3 * o + 1] = cy + Math.sin(a) * r; s.pts[3 * o + 2] = (hash(o) - 0.5) * 0.5; s.tag[o] = 2; s.prm[o] = k; }
      return s;
    },
    color(i, tag, prm, x, y, z, st, o, fx) {
      if (tag === 0) { o[0] = 0.75; o[1] = 0.8; o[2] = 0.95; o[3] = 0.55; o[4] = 0.75; return; }
      if (tag === 1) { const cur = Math.floor(st / 2.5) % 16, on = prm <= cur || st >= 40; hsl(0.11, 0.9, prm === cur ? 0.78 : 0.6, o, 0); o[3] = on ? (prm === cur ? 1 : 0.75) : 0.05; o[4] = prm === cur ? 1.3 : 1; return; }
      hsl(0.09, 0.8, 0.66 + 0.1 * fx.pulse, o, 0); o[3] = 1; o[4] = 1.4;
    },
    cap: () => ['악단은 마지막까지 연주를 멈추지 않았어요', '곁에 있는 사람들이 덜 무섭도록']
  },
  tSolo: {
    ...BASE.solo,
    cap: (st, c) => st < 20
      ? ['불빛 하나하나가 한 사람의 이야기였어요', '그날 밤, 1,500여 명이 돌아오지 못했어요']
      : ['오늘 밤, 우리가 그 불빛을 다시 켜요', c.n + '명이 함께 기억하고 있어요']
  },
  carpathia: {
    tcap: 30,
    build: n => parts(n, [
      { key: 'sun', tag: 0, w: 1.0, draw: sun }, { key: 'sunRays', tag: 1, w: 1.4, draw: sunRays }, { key: 'horizon2', tag: 2, w: 1.4, draw: horizon },
      { key: 'cHull', tag: 3, w: 0.9, draw: carpathiaHull }, { key: 'cTop', tag: 4, w: 1.2, draw: carpathiaTop }, { key: 'cPorts', tag: 5, w: 2.4, draw: carpathiaPorts }
    ]),
    color(i, tag, prm, x, y, z, st, o) {
      const dawn = clamp01(st / 20);
      if (tag === 0) { hsl(0.05 + 0.05 * dawn, 0.95, 0.5 + 0.1 * dawn, o, 0); o[3] = 0.2 + 0.8 * dawn; o[4] = 1; return; }
      if (tag === 1) { hsl(0.1, 0.95, 0.62, o, 0); o[3] = clamp01((st - 10) / 8) * (0.7 + 0.3 * Math.sin(st * 1.5 + x)); o[4] = 1; return; }
      if (tag === 2) { hsl(0.07, 0.6, 0.7, o, 0); o[3] = 0.4 + 0.5 * dawn; o[4] = 0.85; return; }
      if (tag === 5) { o[0] = 1; o[1] = 0.85; o[2] = 0.5; o[3] = 1; o[4] = 0.95; return; }
      o[0] = 0.85; o[1] = 0.88; o[2] = 0.95; o[3] = tag === 3 ? 0.6 : 0.9; o[4] = 0.9;
    },
    cap: st => st < 22 ? ['새벽 4시, 카르파티아호가 도착했어요', '신호를 듣고 밤새 달려온 배'] : ['700여 명이 구조되었어요', '']
  },
  date: { build: n => text('1912. 4. 15', n), color: (i, tag, prm, x, y, z, st, o) => { o[0] = 0.75; o[1] = 0.85; o[2] = 1; o[3] = 0.9; o[4] = 0.9; }, cap: () => ['', ''] },
  remember: { build: n => text('잊지 않을게요', n), color: (i, tag, prm, x, y, z, st, o) => { hsl(0.58, 0.45, 0.8 + 0.06 * Math.sin(prm * 10 - st * 1.2), o, 0); o[3] = 1; o[4] = 0.9; }, cap: () => ['', '그 밤을, 그 사람들을'] },
  safe: { build: n => text('오늘도 무사히', n), color: (i, tag, prm, x, y, z, st, o) => { hsl(0.1, 0.75, 0.68 + 0.08 * Math.sin(prm * 10 - st * 1.5), o, 0); o[3] = 1; o[4] = 0.9; }, cap: (st, c) => ['당신의 오늘도, 무사히 항구에 닿았어요', '오늘 ' + c.n + '명이 함께했어요'] },
  approach: BASE.approach,
  land: BASE.land
};
DEFS.ship.spotAt = BOW;
export { shipParts, shipColor, FUNNEL_BAND };
