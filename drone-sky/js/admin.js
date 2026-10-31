// Operator timeline editor: line scenes up with the music by ear and by eye.
// Space: play/pause · C: start the selected scene here and select the next · ←/→: nudge 0.1 s (Shift: 1 s)
const KEY = 'haneul-admin-v1';
const LABELS = {
  pad: '카운트다운', climb: '이륙', lightwave: '점등', tLightwave: '점등', sunrise: '해돋이', subway: '지하철', coffee: '커피잔', clock: '시계',
  rain: '비와 우산', boat: '종이배', rainbow: '무지개와 꽃', main: '오늘의 그림', wish1: '소원 1', wish2: '소원 2', wish3: '소원 3', scene: '내 마음을 하늘에',
  solo: '불빛 하나', tSolo: '불빛 하나', stars: '북두칠성', fireworks: '빛 불꽃', thanks: '오늘도 수고했어요', tomorrow: '내일 밤 10시', approach: '착륙 준비', land: '착륙',
  ship: '타이타닉', compass: '나침반', violin: '바이올린', calmSea: '잔잔한 바다', iceberg: '빙산', rockets: '신호탄', lifeboats: '구명보트', band: '악단',
  carpathia: '카르파티아호', date: '1912. 4. 15', remember: '잊지 않을게요', safe: '오늘도 무사히',
  fShip: '꿈의 배', fStars: '별 바다', fBow: '뱃머리 두 사람', fHeart: '바다의 심장', fHand: '손자국', fIceberg: '빙산', fNever: '놓지 않을게',
  fFlying: '날고 있어요', fPortrait0: '얼굴 사진 1', fPortrait1: '얼굴 사진 2', fStair: '대계단', fTitle: '제목'
};
export const labelOf = id => LABELS[id] || id;

/* ---------- saved overrides ---------- */
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage blocked: edits still apply this session */ } }
const slot = id => (store[id] = store[id] || { scenes: {}, caps: {}, songAt: null });

export function applyOverrides(ep) {
  const o = store[ep.id]; if (!o) return;
  ep.SCENES.forEach(s => { if (o.scenes[s.id] != null && s.id !== 'pad') s.at = o.scenes[s.id]; });
  ep.SCENES.sort((a, b) => a.at - b.at);
  fixEnds(ep);
  if (o.songAt != null) ep.customFrom = o.songAt;
}
export function capOverride(epId, id) {
  const c = store[epId] && store[epId].caps[id];
  return c && (c[0] || c[1]) ? c : null;
}
function fixEnds(ep) { ep.SCENES.forEach((s, i) => { s.end = i + 1 < ep.SCENES.length ? ep.SCENES[i + 1].at : ep.SHOW_LEN; }); }

/* ---------- editor ---------- */
export function initAdmin(api) {
  const $ = id => document.getElementById(id);
  const panel = $('admin'), cv = $('tl'), g = cv.getContext('2d');
  let sel = 1, zoom = 1, scroll = 0, drag = null, peaks = null, peaksFor = null;
  const fmt = t => Math.floor(t / 60) + ':' + (t % 60).toFixed(1).padStart(4, '0');

  function ep() { return api.ep(); }
  function W() { return cv.clientWidth; }
  function pps() { return W() / ep().SHOW_LEN * zoom; }
  const xAt = t => (t - scroll) * pps();
  const tAt = x => x / pps() + scroll;

  function computePeaks() {
    const m = api.music(), buf = m.custom && m.custom.buffer;
    if (!buf) { peaks = null; peaksFor = null; return; }
    if (peaksFor === buf) return;
    const ch = buf.getChannelData(0), bins = 4000, per = Math.floor(ch.length / bins);
    peaks = new Float32Array(bins);
    for (let b = 0; b < bins; b++) { let mx = 0; for (let i = b * per; i < (b + 1) * per; i += 8) { const v = Math.abs(ch[i]); if (v > mx) mx = v; } peaks[b] = mx; }
    peaksFor = buf;
  }

  function draw() {
    if (panel.hidden) return;
    const dpr = window.devicePixelRatio || 1, w = W(), h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const e = ep(), now = api.time();
    // ruler
    g.fillStyle = '#9aa4bf'; g.font = '11px "Noto Sans KR", sans-serif';
    const step = pps() > 8 ? 5 : pps() > 2 ? 10 : 30;
    for (let t = Math.floor(scroll / step) * step; t < tAt(w); t += step) {
      const x = xAt(t); g.fillRect(x, 0, 1, t % (step * 6) === 0 ? 10 : 5);
      if (t % (step * 2) === 0) g.fillText(fmt(t).replace(/\.\d$/, ''), x + 3, 11);
    }
    // scenes
    e.SCENES.forEach((s, i) => {
      const x0 = xAt(s.at), x1 = xAt(s.end);
      if (x1 < 0 || x0 > w) return;
      g.fillStyle = i === sel ? 'rgba(255,207,107,0.55)' : i % 2 ? 'rgba(158,197,255,0.22)' : 'rgba(158,197,255,0.12)';
      g.fillRect(x0, 18, Math.max(1, x1 - x0 - 1), 40);
      g.fillStyle = '#ffcf6b'; g.fillRect(x0, 16, 2, 44);
      if (x1 - x0 > 30) { g.save(); g.beginPath(); g.rect(x0, 18, x1 - x0 - 2, 40); g.clip(); g.fillStyle = '#eef1fa'; g.font = '12px "Noto Sans KR", sans-serif'; g.fillText(labelOf(s.id), x0 + 5, 42); g.restore(); }
    });
    // song waveform
    computePeaks();
    if (peaks) {
      const m = api.music(), at = e.customFrom, dur = m.custom.buffer.duration;
      const x0 = xAt(at), x1 = xAt(at + dur);
      g.fillStyle = 'rgba(255,158,201,0.12)'; g.fillRect(x0, 64, x1 - x0, 44);
      g.fillStyle = 'rgba(255,158,201,0.8)';
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, x1); x++) {
        const b = Math.floor((tAt(x) - at) / dur * peaks.length); if (b < 0 || b >= peaks.length) continue;
        const a = peaks[b] * 20; g.fillRect(x, 86 - a, 1, a * 2 + 1);
      }
      g.fillStyle = '#ff9ec9'; g.fillText('노래', x0 + 4, 76);
    } else { g.fillStyle = '#6f7894'; g.fillText('노래 파일을 불러오면 여기 파형이 보여요', 8, 90); }
    // playhead
    const px = xAt(now); g.fillStyle = '#ff6b6b'; g.fillRect(px, 0, 2, h);
    $('adm-time').textContent = fmt(now) + ' / ' + fmt(e.SHOW_LEN);
    $('adm-play').textContent = api.paused() ? '재생' : '일시정지';
    requestAnimationFrame(draw);
  }

  function refreshInspector() {
    const e = ep(), s = e.SCENES[sel]; if (!s) return;
    $('adm-scene').textContent = labelOf(s.id);
    $('adm-at').value = s.at.toFixed(1);
    $('adm-at').disabled = s.id === 'pad';
    const o = slot(e.id), c = o.caps[s.id] || ['', ''], d = api.defaultCap(s.id) || ['', ''];
    $('adm-cap-a').value = c[0]; $('adm-cap-a').placeholder = d[0] || '(자막 없음)';
    $('adm-cap-b').value = c[1]; $('adm-cap-b').placeholder = d[1] || '(작은 자막 없음)';
    $('adm-song').value = (e.customFrom || 0).toFixed(1);
  }
  function setStart(i, t) {
    const e = ep(), s = e.SCENES[i]; if (!s || s.id === 'pad') return;
    const lo = e.SCENES[i - 1].at + 2, hi = i + 1 < e.SCENES.length ? e.SCENES[i + 1].at - 2 : e.SHOW_LEN - 2;
    s.at = Math.round(Math.max(lo, Math.min(hi, t)) * 10) / 10;
    fixEnds(e);
    slot(e.id).scenes[s.id] = s.at; save();
    api.changed();
    refreshInspector();
  }
  function select(i) { sel = Math.max(0, Math.min(ep().SCENES.length - 1, i)); refreshInspector(); }

  cv.addEventListener('pointerdown', ev => {
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, e = ep();
    if (y >= 16 && y <= 60) {
      const near = e.SCENES.findIndex((s, i) => i > 0 && Math.abs(xAt(s.at) - x) < 6);
      if (near > 0) { drag = near; select(near); cv.setPointerCapture(ev.pointerId); return; }
      const t = tAt(x), k = e.SCENES.findIndex(s => t >= s.at && t < s.end);
      if (k >= 0) select(k);
      return;
    }
    api.seek(tAt(x)); drag = 'seek'; cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener('pointermove', ev => {
    if (drag == null) return;
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left;
    if (drag === 'seek') api.seek(tAt(x)); else setStart(drag, tAt(x));
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) { const r = cv.getBoundingClientRect(), t = tAt(ev.clientX - r.left); zoom = Math.max(1, Math.min(40, zoom * (ev.deltaY < 0 ? 1.2 : 1 / 1.2))); scroll = Math.max(0, t - (ev.clientX - r.left) / pps()); }
    else scroll = Math.max(0, Math.min(ep().SHOW_LEN - W() / pps(), scroll + (ev.deltaX || ev.deltaY) / pps()));
  }, { passive: false });

  $('adm-play').addEventListener('click', () => api.paused() ? api.play() : api.pause());
  $('adm-back').addEventListener('click', () => api.seek(api.time() - 5));
  $('adm-zin').addEventListener('click', () => { zoom = Math.min(40, zoom * 1.5); scroll = Math.max(0, api.time() - W() / pps() / 2); });
  $('adm-zout').addEventListener('click', () => { zoom = Math.max(1, zoom / 1.5); scroll = Math.max(0, Math.min(scroll, ep().SHOW_LEN - W() / pps())); });
  $('adm-at').addEventListener('change', e => setStart(sel, parseFloat(e.target.value) || 0));
  $('adm-here').addEventListener('click', () => setStart(sel, api.time()));
  $('adm-preview').addEventListener('click', () => api.seek(ep().SCENES[sel].at));
  const capChange = () => { const e = ep(), s = e.SCENES[sel]; slot(e.id).caps[s.id] = [$('adm-cap-a').value.trim(), $('adm-cap-b').value.trim()]; save(); };
  $('adm-cap-a').addEventListener('input', capChange); $('adm-cap-b').addEventListener('input', capChange);
  $('adm-song').addEventListener('change', e => { const v = Math.max(0, parseFloat(e.target.value) || 0); ep().customFrom = v; slot(ep().id).songAt = v; save(); api.songMoved(v); });
  $('adm-song-here').addEventListener('click', () => { const v = Math.round(api.time() * 10) / 10; ep().customFrom = v; slot(ep().id).songAt = v; save(); api.songMoved(v); refreshInspector(); });
  $('adm-reset').addEventListener('click', () => {
    delete store[ep().id]; save();
    api.reset(); select(1);
    api.toast('이 회차의 장면 시간과 자막을 처음 상태로 되돌렸어요');
  });
  $('adm-export').addEventListener('click', () => {
    $('adm-json').value = JSON.stringify({ episode: ep().id, scenes: ep().SCENES.map(s => ({ id: s.id, at: s.at })), songAt: ep().customFrom, captions: slot(ep().id).caps }, null, 2);
    $('adm-io').hidden = false; $('adm-json').select();
  });
  $('adm-import').addEventListener('click', () => { $('adm-json').value = ''; $('adm-io').hidden = false; $('adm-json').focus(); });
  $('adm-io-apply').addEventListener('click', () => {
    try {
      const j = JSON.parse($('adm-json').value);
      if (j.episode && j.episode !== ep().id) { api.toast('다른 회차(' + j.episode + ')의 시간표예요. 회차를 먼저 바꿔 주세요'); return; }
      const o = slot(ep().id);
      (j.scenes || []).forEach(s => { if (typeof s.at === 'number') o.scenes[s.id] = s.at; });
      if (typeof j.songAt === 'number') o.songAt = j.songAt;
      if (j.captions) o.caps = j.captions;
      save(); applyOverrides(ep()); api.changed(); api.songMoved(ep().customFrom); refreshInspector();
      $('adm-io').hidden = true; api.toast('시간표를 불러왔어요');
    } catch (err) { api.toast('JSON 형식이 맞지 않아요'); }
  });
  $('adm-io-copy').addEventListener('click', () => { try { navigator.clipboard.writeText($('adm-json').value).then(() => api.toast('복사했어요'), () => api.toast('복사가 막혔어요. 글자를 직접 선택해 복사해 주세요')); } catch (e) { api.toast('복사가 막혔어요'); } });
  $('adm-io-close').addEventListener('click', () => { $('adm-io').hidden = true; });
  $('adm-close').addEventListener('click', () => close());

  document.addEventListener('keydown', ev => {
    if (panel.hidden || ev.target.matches('input, textarea, select')) return;
    if (ev.code === 'Space') { ev.preventDefault(); api.paused() ? api.play() : api.pause(); }
    else if (ev.key === 'c' || ev.key === 'C') { ev.preventDefault(); setStart(sel, api.time()); select(sel + 1); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); const d = (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 1 : 0.1); setStart(sel, ep().SCENES[sel].at + d); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); select(sel - 1); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); select(sel + 1); }
  });

  function open() {
    panel.hidden = false; document.body.classList.add('admin-on');
    api.opened();
    select(Math.min(sel, ep().SCENES.length - 1));
    requestAnimationFrame(draw);
  }
  function close() { panel.hidden = true; document.body.classList.remove('admin-on'); api.closed(); }
  return { open, close, refresh: refreshInspector };
}
