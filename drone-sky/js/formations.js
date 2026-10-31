// Formation point generators. All return Float32Array(n * 3) in local units
// (about 56 wide, centred on the origin) unless noted.

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const MASK_W = 800, MASK_H = 450, UNIT = 0.07;   // 800 mask px -> 56 units

/* ---------- 2D mask shapes ---------- */
function hole(g, x, y, r) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore();
}
function drawStar(g) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? 82 : 205, a = -Math.PI / 2 + k * Math.PI / 5;
    g.lineTo(400 + r * Math.cos(a), 245 + r * Math.sin(a));
  }
  g.closePath(); g.fill();
  hole(g, 400, 235, 12);
}
function drawHeart(g) {
  g.beginPath();
  for (let k = 0; k <= 200; k++) {
    const t = k / 200 * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    g.lineTo(400 + x * 12.5, 215 - y * 12.5);
  }
  g.closePath(); g.fill();
  hole(g, 400, 232, 12);
}
function drawWhale(g) {
  g.beginPath(); g.ellipse(380, 250, 250, 100, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(220, 235, 105, 95, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(600, 212); g.quadraticCurveTo(680, 228, 715, 232); g.lineTo(715, 262); g.quadraticCurveTo(680, 270, 600, 300); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(712, 247); g.quadraticCurveTo(735, 190, 785, 165); g.quadraticCurveTo(772, 225, 742, 247); g.quadraticCurveTo(772, 272, 785, 330); g.quadraticCurveTo(735, 305, 712, 247); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(330, 322); g.quadraticCurveTo(350, 400, 430, 405); g.quadraticCurveTo(395, 360, 400, 322); g.closePath(); g.fill();
  [[215, 98, 9], [195, 72, 8], [237, 72, 8], [180, 50, 7], [252, 50, 7], [216, 42, 6]].forEach(c => {
    g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
  });
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(122, 268); g.quadraticCurveTo(200, 290, 292, 272); g.stroke();
  g.restore();
  hole(g, 195, 225, 12);
}
function drawWhaleMoon(g) {
  g.save(); g.translate(-20, 30); g.scale(0.92, 0.92); drawWhale(g); g.restore();
  g.beginPath(); g.arc(690, 85, 58, 0, Math.PI * 2); g.fill();
  hole(g, 718, 68, 52);
}

export const SHAPES = {
  star:      { label: '별',        became: '별이 됐어요',            spot: [400, 235], spotLabel: '별의 한가운데',   spotTopic: '별의 한가운데는',   draw: drawStar },
  heart:     { label: '하트',      became: '하트가 됐어요',          spot: [400, 232], spotLabel: '하트의 한가운데', spotTopic: '하트의 한가운데는', draw: drawHeart },
  whale:     { label: '고래',      became: '고래가 됐어요',          spot: [195, 225], spotLabel: '고래의 눈',       spotTopic: '고래의 눈은',       draw: drawWhale },
  whaleMoon: { label: '달과 고래', became: '달빛 아래 고래가 됐어요', spot: [159, 237], spotLabel: '고래의 눈',       spotTopic: '고래의 눈은',       draw: drawWhaleMoon }
};
export const MILESTONES = [{ at: 0, key: 'star' }, { at: 1000, key: 'heart' }, { at: 5000, key: 'whale' }, { at: 10000, key: 'whaleMoon' }];

export function shapeFor(count) {
  let key = 'star';
  MILESTONES.forEach(m => { if (count >= m.at) key = m.key; });
  return key;
}
export function spotLocal(key) {
  const s = SHAPES[key].spot;
  return [(s[0] - 400) * UNIT, (225 - s[1]) * UNIT, 0];
}

/* ---------- mask sampling ---------- */
const cache = new Map();
function sampleMask(cacheKey, drawFn, n) {
  const key = cacheKey + ':' + n;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = MASK_W; c.height = MASK_H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  drawFn(g);
  const data = g.getImageData(0, 0, MASK_W, MASK_H).data;
  const filled = (x, y) => data[((y | 0) * MASK_W + (x | 0)) * 4 + 3] > 128;
  let area = 0;
  for (let y = 0; y < MASK_H; y += 2) for (let x = 0; x < MASK_W; x += 2) if (filled(x, y)) area += 4;
  const out = new Float32Array(Math.max(n, 1) * 3);
  if (!area || n <= 0) return out;
  let step = Math.max(1.2, Math.sqrt(area / (n * 0.866)));
  let pts = [];
  for (let tries = 0; tries < 10; tries++) {
    pts = [];
    let row = 0;
    for (let y = step / 2; y < MASK_H; y += step * 0.866, row++) {
      const off = (row % 2) * step / 2;
      for (let x = step / 2 + off; x < MASK_W; x += step) if (filled(x, y)) pts.push(x, y);
    }
    if (pts.length / 2 >= n) break;
    step *= 0.9;
  }
  const m = pts.length / 2, r = mulberry32(n * 7 + 13);
  const pick = new Uint32Array(n);
  if (m >= n) {
    const idx = new Uint32Array(m);
    for (let i = 0; i < m; i++) idx[i] = i;
    for (let i = 0; i < n; i++) { const j = i + Math.floor(r() * (m - i)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; pick[i] = idx[i]; }
  } else {
    for (let i = 0; i < n; i++) pick[i] = i % m;
  }
  for (let i = 0; i < n; i++) {
    const k = pick[i], extra = i >= m ? 1 : 0;
    out[3 * i] = (pts[2 * k] - 400 + extra * (r() - 0.5) * 3) * UNIT;
    out[3 * i + 1] = (225 - pts[2 * k + 1] + extra * (r() - 0.5) * 3) * UNIT;
    out[3 * i + 2] = (r() - 0.5) * 0.6;
  }
  cache.set(key, out);
  return out;
}

export function shapePoints(key, n) { return sampleMask(key, SHAPES[key].draw, n); }

export function textPoints(text, n) {
  const draw = g => {
    let lines = [text];
    if ([...text].length > 8) {
      const mid = Math.floor(text.length / 2);
      let cut = text.lastIndexOf(' ', mid);
      if (cut < 2) cut = text.indexOf(' ', mid);
      if (cut < 2) cut = mid;
      lines = [text.slice(0, cut).trim(), text.slice(cut).trim()];
    }
    let size = lines.length > 1 ? 150 : 210;
    const font = s => '900 ' + s + 'px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
    g.font = font(size);
    const w = Math.max(...lines.map(l => g.measureText(l).width));
    if (w > 740) { size = Math.floor(size * 740 / w); g.font = font(size); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = size * 1.12, top = 235 - lh * (lines.length - 1) / 2;
    lines.forEach((l, k) => g.fillText(l, 400, top + k * lh));
  };
  return sampleMask('text:' + text, draw, n);
}

/* ---------- analytic formations ---------- */
// Launch pad on the water: world coordinates, XZ grid.
export function groundGrid(n) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * 2.4)));
  const gap = Math.min(1.25, 74 / cols);
  const rows = Math.ceil(n / cols);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out[3 * i] = (c - (cols - 1) / 2) * gap;
    out[3 * i + 1] = 1.1;
    out[3 * i + 2] = 6 - r * gap;
  }
  return out;
}
export function groundGap(n) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * 2.4)));
  return Math.min(1.25, 74 / cols);
}

// Upright curtain facing the shore.
export function curtain(n) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * 1.75)));
  const gap = 52 / cols;
  const rows = Math.ceil(n / cols);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out[3 * i] = (c - (cols - 1) / 2) * gap;
    out[3 * i + 1] = (r - (rows - 1) / 2) * gap;
    out[3 * i + 2] = 0;
  }
  return out;
}

export function sphere(n, R) {
  const out = new Float32Array(n * 3), ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * ga;
    out[3 * i] = Math.cos(a) * r * R; out[3 * i + 1] = y * R; out[3 * i + 2] = Math.sin(a) * r * R;
  }
  return out;
}

// Flat sheet in XZ, later tilted toward the viewer.
export function sheet(n, w, d) {
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * w / d)));
  const rows = Math.ceil(n / cols);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out[3 * i] = (c / (cols - 1) - 0.5) * w;
    out[3 * i + 1] = 0;
    out[3 * i + 2] = (r / Math.max(1, rows - 1) - 0.5) * d;
  }
  return out;
}

export function flower(n, R) {
  const out = new Float32Array(n * 3), r = mulberry32(99);
  let k = 0, guard = 0;
  while (k < n && guard++ < n * 40) {
    const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R;
    const rr = Math.hypot(x, y), th = Math.atan2(y, x);
    const edge = R * (0.18 + 0.82 * Math.abs(Math.cos(3 * th)));
    if (rr <= edge) { out[3 * k] = x; out[3 * k + 1] = y; out[3 * k + 2] = (r() - 0.5) * 1.2 - rr * 0.08; k++; }
  }
  for (; k < n; k++) { out[3 * k] = 0; out[3 * k + 1] = 0; out[3 * k + 2] = 0; }
  return out;
}

// Wide calm star field (ellipsoid).
export function field(n) {
  const out = new Float32Array(n * 3), r = mulberry32(5);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    out[3 * i] = Math.cos(a) * d * 36;
    out[3 * i + 1] = Math.sin(a) * d * 15;
    out[3 * i + 2] = (r() - 0.5) * 18;
  }
  return out;
}

// Spiral parameters (radius, angle, height) - turned into positions by the formation.
export function spiralParams(n) {
  const out = new Float32Array(n * 3), r = mulberry32(17);
  for (let i = 0; i < n; i++) {
    out[3 * i] = 5 + r() * 11;
    out[3 * i + 1] = r() * Math.PI * 2;
    out[3 * i + 2] = (r() - 0.5) * 22;
  }
  return out;
}

export const BURST_CENTERS = [[-15, 31, 0], [15, 34, -4], [0, 40, 3]];
export function burstSeeds(n) {
  const out = new Float32Array(n * 3), r = mulberry32(23);
  for (let i = 0; i < n; i++) {
    const c = BURST_CENTERS[i % 3];
    out[3 * i] = c[0] + (r() - 0.5) * 3;
    out[3 * i + 1] = c[1] + (r() - 0.5) * 3;
    out[3 * i + 2] = c[2] + (r() - 0.5) * 3;
  }
  return out;
}
