// The 13.5-minute show: public-domain melodies arranged here, plus the scene timeline.
// Every event is [time, instrument, ...args] in seconds from show start.

export const SHOW_LEN = 810;

export const SCENES = [
  { id: 'pad', at: 0 },
  { id: 'climb', at: 10 },
  { id: 'lightwave', at: 60 },
  { id: 'sunrise', at: 100 },
  { id: 'subway', at: 140 },
  { id: 'coffee', at: 180 },
  { id: 'clock', at: 220 },
  { id: 'rain', at: 270 },
  { id: 'boat', at: 320 },
  { id: 'rainbow', at: 360 },
  { id: 'main', at: 400 },
  { id: 'wish1', at: 400 + 200 / 3 },
  { id: 'wish2', at: 400 + 200 / 3 + 200 / 9 },
  { id: 'wish3', at: 400 + 200 / 3 + 400 / 9 },
  { id: 'scene', at: 400 + 400 / 3 },
  { id: 'solo', at: 400 + 500 / 3 },
  { id: 'stars', at: 600 },
  { id: 'fireworks', at: 645 },
  { id: 'thanks', at: 681 },
  { id: 'tomorrow', at: 717 },
  { id: 'approach', at: 742 },
  { id: 'land', at: 772 }
];
SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].at : SHOW_LEN; });

export const CHAPTERS = [
  { label: '프롤로그 · 점등', at: 0 },
  { label: '1막 · 오늘', at: 100 },
  { label: '2막 · 흔들림', at: 270 },
  { label: '3막 · 우리', at: 400 },
  { label: '불빛 하나', at: 400 + 500 / 3 },
  { label: '4막 · 내일', at: 600 },
  { label: '엔딩 · 착륙', at: 717 }
];

export const SONGS = [
  { from: 0, to: 10, title: '파도 소리' },
  { from: 10, to: 100, title: '사티 「짐노페디 1번」' },
  { from: 100, to: 270, title: '파헬벨 「캐논」' },
  { from: 270, to: 320, title: '빗소리' },
  { from: 320, to: 400, title: '브람스 「자장가」' },
  { from: 400, to: 600, title: '「아리랑」' },
  { from: 600, to: 717, title: '베토벤 「환희의 송가」' },
  { from: 717, to: SHOW_LEN, title: '「Auld Lang Syne」 (석별의 정)' }
];

// Beat grid per song, so lights can pulse on the music: [from, to, beatSeconds, beatsPerBar]
export const GRID = [
  [10, 100, 60 / 66, 3],
  [100, 270, 170 / 192, 4],
  [320, 400, 80 / 87, 3],
  [400, 600, 200 / 288, 3],
  [600, 717, 0.5625, 4],
  [717, 810, 60 / 76, 4]
];
export function beatAt(st) {
  for (const [from, to, len, per] of GRID) {
    if (st >= from && st < to) {
      const x = (st - from) / len, idx = Math.floor(x);
      return { on: true, idx, since: (x - idx) * len, len, down: idx % per === 0 };
    }
  }
  return { on: false, idx: 0, since: 99, len: 1, down: false };
}

// Fireworks: [time, shell]
export const FIREWORKS = [[645, 0], [649.5, 1], [654, 2], [658.5, 0], [663, 1], [667.5, 2], [672, 0], [672, 1], [676.5, 0], [676.5, 1], [676.5, 2]];

function rng(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function arrange() {
  const ev = [];
  const add = (...e) => ev.push(e);
  // play a list of [midi|null, beats] starting at t0
  const seq = (t0, beat, notes, fn) => { let t = t0; for (const [m, d] of notes) { if (m != null) fn(m, t, d * beat); t += d * beat; } return t; };
  const flat = bars => bars.flat();

  /* ---------- ambience & countdown ---------- */
  add(0, 'waves', SHOW_LEN);
  for (let k = 0; k < 10; k++) add(k, 'bell', 81, 0.05 + k * 0.006);
  add(9.2, 'str', [50, 57, 62, 66], 3, 0.04, 700);

  /* ---------- Satie, Gymnopédie No. 1 (D major, 3/4) ---------- */
  {
    const t0 = 10, b = 60 / 66, bar = 3 * b;
    const G = [59, 62, 66], D = [57, 61, 66];
    for (let k = 0; k < 32; k++) {
      const tb = t0 + k * bar, g = k % 2 === 0;
      add(tb, 'bass', g ? 43 : 38, bar * 0.95, 0.26);
      add(tb + b, 'pno', g ? G : D, 2 * b, 0.13);
      if (k >= 12 && k < 30) add(tb, 'str', g ? [43, 55, 59] : [38, 57, 61], bar, 0.035, 900);
    }
    add(t0 + 32 * bar, 'pno', [38, 57, 61, 66], 2.5, 0.15);
    const A = [[null, 1], [78, 1], [81, 1], [79, 1], [78, 1], [73, 1], [71, 1], [73, 1], [74, 1], [69, 3], [66, 12]];
    seq(t0 + 4 * bar, b, A, (m, t, d) => add(t, 'pno', m, d, 0.36));
    seq(t0 + 12 * bar, b, A, (m, t, d) => { add(t, 'pno', m, d, 0.34); add(t, 'str', [m], d, 0.045, 1700); });
    seq(t0 + 20 * bar, b, A, (m, t, d) => { add(t, 'pno', m - 12, d, 0.3); add(t, 'harp', m, 0.09); });
    add(t0 + 29 * bar, 'bell', 78, 0.08); add(t0 + 31 * bar, 'bell', 74, 0.07);
  }

  /* ---------- Pachelbel, Canon in D ---------- */
  {
    const t0 = 100, b = 170 / 192, cyc = 16 * b;
    const BASS = [50, 45, 47, 42, 43, 38, 43, 45];
    const CH = [[62, 66, 69], [61, 64, 69], [62, 66, 71], [61, 66, 69], [62, 67, 71], [62, 66, 69], [62, 67, 71], [61, 64, 69]];
    const V1 = [78, 76, 74, 73, 71, 69, 71, 73];
    const V2 = [74, 73, 71, 69, 67, 66, 67, 64];
    const V3 = [74, 78, 81, 79, 78, 74, 78, 76, 74, 71, 74, 81, 79, 83, 81, 79];
    for (let c = 0; c < 12; c++) {
      const tc = t0 + c * cyc;
      for (let k = 0; k < 8; k++) {
        const t = tc + k * 2 * b;
        add(t, 'bass', BASS[k], 2 * b * 0.95, c === 11 ? 0.2 : 0.28);
        add(t, 'str', CH[k], 2 * b, c === 0 ? 0.03 : (c >= 8 && c <= 10 ? 0.055 : 0.045), 1400);
        if ([1, 8, 9, 10, 11].includes(c)) add(t, 'lead', V1[k], 2 * b, c === 11 ? 0.09 : 0.14);
        if ([2, 6, 9, 10].includes(c)) add(t, 'flute', V2[k], 2 * b, 0.12);
        if (c >= 4 && c <= 9) { const ch = CH[k]; [ch[0], ch[1], ch[2], ch[1]].forEach((m, j) => add(t + j * b / 2, 'harp', m + 12, 0.08)); }
      }
      if ([3, 5, 8, 9, 10].includes(c)) V3.forEach((m, j) => add(tc + j * b, 'pno', m, b * 0.95, 0.24));
    }
  }

  /* ---------- rain interlude (E minor) ---------- */
  {
    add(268, 'rain', 54);
    const RC = [[52, 59, 64, 67], [48, 55, 60, 64], [43, 55, 59, 62], [50, 57, 62, 66]];
    for (let k = 0; k < 4; k++) add(270 + k * 12.5, 'str', RC[k], 12.5, 0.04, 800);
    const r = rng(7), sc = [64, 67, 71, 74, 76, 79];
    for (let t = 271; t < 318; t += 1.4 + r() * 1.3) add(t, 'pno', sc[Math.floor(r() * sc.length)], 2, 0.14);
  }

  /* ---------- Brahms, Wiegenlied (C major, 3/4) ---------- */
  {
    const t0 = 320, b = 80 / 87, bar = 3 * b;
    const MEL = [
      [[67, 2], [64, 0.5], [64, 0.5]], [[67, 2], [64, 0.5], [67, 0.5]], [[72, 1], [71, 1.5], [69, 0.5]], [[69, 1], [67, 1], [62, 0.5], [64, 0.5]],
      [[65, 1], [62, 1], [62, 0.5], [64, 0.5]], [[65, 2], [62, 0.5], [65, 0.5]], [[71, 0.5], [69, 0.5], [67, 1], [71, 1]], [[72, 2], [60, 0.5], [60, 0.5]],
      [[72, 2], [69, 0.5], [65, 0.5]], [[67, 2], [64, 0.5], [60, 0.5]], [[65, 1], [67, 1], [69, 1]], [[67, 2], [60, 0.5], [60, 0.5]],
      [[72, 2], [69, 0.5], [65, 0.5]], [[67, 2], [64, 0.5], [60, 0.5]], [[65, 1], [64, 1], [62, 1]], [[60, 3]]
    ];
    const C = [55, 60, 64], G7 = [55, 59, 62, 65], F = [53, 57, 60];
    const HARM = [C, C, G7, G7, G7, G7, G7, C, F, C, G7, C, F, C, G7, C];
    const ROOT = { 0: 48, 1: 43, 2: 41 };
    const rootOf = h => (h === C ? 48 : h === G7 ? 43 : 41);
    [48, 52, 55, 60].forEach((m, j) => add(t0 + j * b * 0.5, 'harp', m, 0.12));
    add(t0 + 2 * b, 'bell', 76, 0.2); add(t0 + 2.5 * b, 'bell', 76, 0.2);
    const accomp = (tb, h, v) => { add(tb, 'bass', rootOf(h), bar * 0.9, 0.2 * v); add(tb + b, 'pno', h, b * 0.9, 0.08 * v); add(tb + 2 * b, 'pno', h, b * 0.9, 0.07 * v); };
    for (let k = 0; k < 16; k++) {
      const tb = t0 + (k + 1) * bar;
      seq(tb, b, MEL[k], (m, t, d) => { add(t, 'bell', m + 12, 0.17); add(t, 'pno', m, d, 0.17); });
      accomp(tb, HARM[k], 1);
      if (k >= 8) add(tb, 'str', HARM[k], bar, 0.03, 1100);
    }
    for (let k = 0; k < 8; k++) {
      const tb = t0 + (17 + k) * bar;
      seq(tb, b, MEL[8 + k], (m, t, d) => { add(t, 'lead', m + 12, d, 0.11); add(t, 'bell', m + 24, 0.08); });
      accomp(tb, HARM[8 + k], 1.1);
      add(tb, 'str', HARM[8 + k], bar, 0.045, 1500);
    }
    for (let k = 0; k < 4; k++) {
      const tb = t0 + (25 + k) * bar;
      [60, 64, 67, 72, 76, 79].forEach((m, j) => add(tb + j * b * 0.5, 'harp', m, 0.1 - k * 0.015));
      add(tb, 'str', C, bar, 0.04 - k * 0.006, 1000);
    }
    add(t0 + 28 * bar, 'bass', 48, bar, 0.16);
  }

  /* ---------- Arirang (G major pentatonic, 3/4) ---------- */
  {
    const t0 = 400, b = 200 / 288, bar = 3 * b;
    const M = [
      [[62, 1.5], [64, 0.5], [62, 0.5], [64, 0.5]],
      [[67, 1.5], [69, 0.5], [67, 0.5], [69, 0.5]],
      [[71, 1], [69, 0.5], [71, 0.5], [67, 0.5], [64, 0.5]],
      [[62, 1.5], [64, 0.5], [62, 0.5], [64, 0.5]],
      [[67, 1.5], [69, 0.5], [67, 0.5], [69, 0.5]],
      [[71, 1.5], [69, 0.5], [67, 0.5], [64, 0.5]],
      [[62, 1], [64, 0.5], [67, 0.5], [69, 0.5], [67, 0.5]],
      [[67, 3]],
      [[74, 1.5], [74, 0.5], [74, 1]],
      [[71, 1.5], [69, 0.5], [71, 0.5], [69, 0.5]],
      [[71, 1], [67, 1], [64, 1]],
      [[62, 1.5], [64, 0.5], [62, 0.5], [64, 0.5]]
    ];
    M.push(M[4], M[5], M[6], M[7]);
    const Gc = [55, 59, 62], Cc = [55, 60, 64], Em = [55, 59, 64], Dc = [54, 57, 62];
    const H = [Gc, Cc, Em, Dc, Cc, Em, Dc, Gc, Gc, Em, Em, Dc, Cc, Em, Dc, Gc];
    const rootOf = h => (h === Gc ? 43 : h === Cc ? 48 : h === Em ? 40 : 38);
    const arp = (tb, h, v) => { [h[0], h[1], h[2], h[1] + 12, h[2], h[1]].forEach((m, j) => add(tb + j * b * 0.5, 'harp', m + 12, v)); };
    // verse v, bars [from, to)
    const verse = (v, from, to, o) => {
      for (let k = from; k < to; k++) {
        const tb = t0 + (v * 16 + k) * bar, h = H[k];
        seq(tb, b, M[k], (m, t, d) => {
          if (o.mel) add(t, o.mel, m + (o.oct || 0), d, o.mv);
          if (o.mel2) add(t, o.mel2, m + 12, d, o.mv2);
        });
        if (o.pad) add(tb, 'str', h, bar, o.pad, o.cut || 1300);
        if (o.bass) add(tb, 'bass', rootOf(h), bar * 0.9, o.bass);
        if (o.arp) arp(tb, h, o.arp);
        if (o.timp && k % 4 === 0) add(tb, 'timp', o.timp);
      }
    };
    verse(0, 0, 16, { mel: 'lead', mv: 0.16, pad: 0.05, bass: 0.26, arp: 0.05, timp: 0.25 });
    add(t0, 'crash', 0.1);
    verse(1, 0, 16, { mel: 'lead', mv: 0.17, mel2: 'flute', mv2: 0.1, pad: 0.06, bass: 0.28, arp: 0.07, timp: 0.3, cut: 1700 });
    add(t0 + 16 * bar, 'crash', 0.12);
    verse(2, 0, 16, { mel: 'pno', mv: 0.34, pad: 0.025, cut: 900, bass: 0.12 });
    verse(3, 0, 16, { mel: 'pno', mv: 0.32, pad: 0.025, cut: 900, arp: 0.04 });
    verse(4, 0, 16, { mel: 'lead', mv: 0.11, pad: 0.035, cut: 1000, bass: 0.14 });
    verse(5, 0, 8, { mel: 'pno', mv: 0.3 });                                                      // one light left
    verse(5, 8, 16, { mel: 'lead', mv: 0.2, mel2: 'flute', mv2: 0.12, pad: 0.07, bass: 0.3, arp: 0.07, timp: 0.35, cut: 2000 });
    add(t0 + (80 + 8) * bar, 'crash', 0.14);
    add(t0 + (80 + 8) * bar - 2 * b, 'swell', 2 * b, 0.08);
  }

  /* ---------- Beethoven, Ode to Joy (D major, 4/4) ---------- */
  {
    const t0 = 600, b = 0.5625, bar = 4 * b;
    const O = [
      [[66, 1], [66, 1], [67, 1], [69, 1]], [[69, 1], [67, 1], [66, 1], [64, 1]], [[62, 1], [62, 1], [64, 1], [66, 1]], [[66, 1.5], [64, 0.5], [64, 2]],
      [[66, 1], [66, 1], [67, 1], [69, 1]], [[69, 1], [67, 1], [66, 1], [64, 1]], [[62, 1], [62, 1], [64, 1], [66, 1]], [[64, 1.5], [62, 0.5], [62, 2]],
      [[64, 1], [64, 1], [66, 1], [62, 1]], [[64, 1], [66, 0.5], [67, 0.5], [66, 1], [62, 1]], [[64, 1], [66, 0.5], [67, 0.5], [66, 1], [64, 1]], [[62, 1], [64, 1], [57, 2]],
      [[66, 1], [66, 1], [67, 1], [69, 1]], [[69, 1], [67, 1], [66, 1], [64, 1]], [[62, 1], [62, 1], [64, 1], [66, 1]], [[64, 1.5], [62, 0.5], [62, 2]]
    ];
    const Dc = [62, 66, 69], Ac = [61, 64, 69];
    const H = [Dc, Ac, Dc, Ac, Dc, Ac, Dc, Dc, Ac, Ac, Ac, Ac, Dc, Ac, Dc, Dc];
    const rootOf = h => (h === Dc ? 38 : 45);
    const r = rng(3), high = [81, 83, 86, 88, 90, 93];
    for (let k = 0; k < 4; k++) {
      add(t0 + k * bar, 'str', Dc, bar, 0.03 + k * 0.006, 1000);
      for (let j = 0; j < 4; j++) add(t0 + k * bar + j * b + r() * 0.2, 'bell', high[Math.floor(r() * high.length)], 0.05);
    }
    const verse = (start, o) => {
      for (let k = 0; k < 16; k++) {
        const tb = start + k * bar, h = H[k];
        seq(tb, b, O[k], (m, t, d) => {
          add(t, o.mel, m + (o.oct || 0), d, o.mv);
          if (o.mel2) add(t, o.mel2, m + 12 + (o.oct || 0), d, o.mv2);
        });
        add(tb, 'str', h, bar, o.pad, o.cut || 1300);
        if (o.bass) { add(tb, 'bass', rootOf(h), 2 * b * 0.9, o.bass); add(tb + 2 * b, 'bass', rootOf(h), 2 * b * 0.9, o.bass * 0.8); }
        if (o.harp) [h[0], h[1], h[2], h[1]].forEach((m, j) => add(tb + j * b, 'harp', m + 12, o.harp));
        if (o.timp) { add(tb, 'timp', o.timp); add(tb + 2 * b, 'timp', o.timp * 0.7); }
      }
    };
    verse(t0 + 4 * bar, { mel: 'flute', mv: 0.14, oct: 12, pad: 0.035, harp: 0.06, bass: 0.14 });
    verse(645, { mel: 'lead', mv: 0.17, mel2: 'lead', mv2: 0.1, pad: 0.06, bass: 0.3, timp: 0.32, cut: 2200 });
    add(645, 'crash', 0.11);
    FIREWORKS.forEach(([t]) => add(t, 'boom', 0.38));
    add(646, 'crackle', 34);
    verse(681, { mel: 'pno', mv: 0.32, pad: 0.04, cut: 1100, bass: 0.12 });
    add(681, 'crash', 0.08);
  }

  /* ---------- Auld Lang Syne (G major, 4/4) ---------- */
  {
    const t0 = 717, b = 60 / 76, bar = 4 * b;
    const A = [
      [[67, 1.5], [67, 0.5], [67, 1], [71, 1]], [[69, 1.5], [67, 0.5], [69, 1], [71, 1]], [[67, 1.5], [67, 0.5], [71, 1], [74, 1]], [[76, 3], [76, 1]],
      [[74, 1.5], [71, 0.5], [71, 1], [67, 1]], [[69, 1.5], [67, 0.5], [69, 1], [71, 1]], [[67, 1.5], [64, 0.5], [64, 1], [62, 1]], [[67, 3], [76, 1]],
      [[74, 1.5], [71, 0.5], [71, 1], [67, 1]], [[69, 1.5], [67, 0.5], [69, 1], [76, 1]], [[74, 1.5], [71, 0.5], [71, 1], [74, 1]], [[76, 3], [79, 1]],
      [[74, 1.5], [71, 0.5], [71, 1], [67, 1]], [[69, 1.5], [67, 0.5], [69, 1], [71, 1]], [[67, 1.5], [64, 0.5], [64, 1], [62, 1]], [[67, 4]]
    ];
    const Gc = [55, 59, 62], Dc = [54, 57, 62], Cc = [55, 60, 64], Em = [55, 59, 64];
    const H = [Gc, Dc, Gc, Cc, Gc, Dc, Cc, Gc, Gc, Dc, Em, Cc, Gc, Dc, Cc, Gc];
    const rootOf = h => (h === Gc ? 43 : h === Dc ? 38 : h === Cc ? 48 : 40);
    add(t0, 'str', Gc, bar, 0.03, 900);
    [55, 59, 62, 67].forEach((m, j) => add(t0 + j * b * 0.5, 'harp', m, 0.1));
    add(t0 + 3 * b, 'pno', 62, b, 0.3);
    for (let k = 0; k < 16; k++) {
      const tb = t0 + (k + 1) * bar, h = H[k];
      seq(tb, b, A[k], (m, t, d) => add(t, 'pno', m, d, 0.32));
      add(tb, 'str', h, bar, 0.035, 1100);
      add(tb, 'bass', rootOf(h), bar * 0.9, 0.18);
      add(tb + 2 * b, 'pno', h, 2 * b, 0.07);
    }
    for (let k = 0; k < 8; k++) {
      const tb = t0 + (17 + k) * bar, h = H[8 + k];
      seq(tb, b, A[8 + k], (m, t, d) => { add(t, 'lead', m, d, 0.1); add(t, 'pno', m, d, 0.2); });
      add(tb, 'str', h, bar, 0.045, 1300);
      add(tb, 'bass', rootOf(h), bar * 0.9, 0.18);
    }
    for (let k = 0; k < 4; k++) {
      const tb = t0 + (25 + k) * bar;
      [55, 59, 62, 67, 71, 74].forEach((m, j) => add(tb + j * b * 0.5, 'harp', m + 12, 0.08 - k * 0.015));
      add(tb, 'str', Gc, bar, 0.035 - k * 0.006, 900);
    }
    add(t0 + 28 * bar, 'pno', [43, 55, 59, 62, 67], 3, 0.18);
  }

  ev.sort((a, b) => a[0] - b[0]);
  return ev;
}
