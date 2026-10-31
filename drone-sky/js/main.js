import { createWorld } from './world.js';
import { Fleet } from './fleet.js';
import { Music } from './music.js';
import { EPISODES } from './episodes.js';
import { loadPortraits } from './film.js';
import { initAdmin, applyOverrides, capOverride } from './admin.js';
import { SHAPES, MILESTONES, shapeFor } from './formations.js';

let ep = EPISODES.yunseul;
const eventsCache = {};

/* ---------- config ---------- */
const MAX_VISUAL = 5000;
const DEMO_FIRST_WAIT = 90 * 1000;
const DEMO_GAP = 150 * 1000;
const DRONE_COLORS = [[1, 0.93, 0.8], [0.62, 0.78, 1], [1, 0.62, 0.8], [0.56, 0.95, 0.82], [1, 0.8, 0.38]];
const COLOR_NAMES = ['기본', '하늘', '벚꽃', '민트', '금빛'];
const ADJ = ['졸린', '수줍은', '용감한', '배고픈', '반짝이는', '느긋한', '설레는', '씩씩한', '조용한', '포근한', '꿈꾸는', '부지런한'];
const NOUN = ['반딧불', '별똥별', '부엉이', '고래', '토끼', '구름', '등불', '참새', '달팽이', '여우', '고양이', '해파리'];
const WISHES = [
  '엄마 수술 잘 끝나게 해주세요', '우리 고양이 오래 살았으면', '취업 제발', '내일 발표 안 떨게',
  '보고 싶다', '합격했다고 말하고 싶어요', '그냥 오늘 잘 자고 싶다', '다들 아프지 말자',
  '면접 붙게 해주세요', '친구랑 화해하고 싶어', '내년엔 덜 불안하기를', '이번 주도 버텼다', '아빠랑 여행 가고 싶어'
];
const SKY_WISHES = ['엄마 수술 잘 되길', '우리 고양이 오래오래', '다들 아프지 말자', '합격하게 해주세요', '보고 싶다', '내일은 웃자'];
const DEMO_SCENES = ['엄마 생일 축하해', '우리 결혼해요', '수능 대박', '다들 수고했어'];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const rand = Math.random;
const pick = a => a[Math.floor(rand() * a.length)];
const fmt = n => n.toLocaleString('ko-KR');
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function hashName(i) {
  let h = (i * 2654435761) >>> 0;
  const a = ADJ[h % ADJ.length]; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  const b = NOUN[h % NOUN.length]; h = Math.imul(h ^ (h >>> 11), 2246822519) >>> 0;
  return a + ' ' + b + ' #' + (1000 + (h % 9000));
}
function simWish(i) { const h = Math.imul(i + 17, 2654435761) >>> 0; return (h % 100) < 62 ? WISHES[h % WISHES.length] : ''; }
function newName() { const num = 1000 + Math.floor(rand() * 9000); return { name: pick(ADJ) + ' ' + pick(NOUN) + ' #' + num, num }; }

/* ---------- state ---------- */
const first = newName();
const me = { launched: false, name: first.name, num: first.num, wish: '', color: 0, spot: false, scene: '' };
const pm = /^#pair-(\d{4})$/.exec(location.hash || '');
const pairNum = pm ? pm[1] : null;
let baseCount = 1284, shownCount = 1284, pendingCount = null;
let mode = 'lobby';
let showT0 = 0, useAudioClock = false, sceneIdx = -1, show = null, snapshot = null;
let nextShowAt = Date.now() + DEMO_FIRST_WAIT;
let spotsLeft = 2;
let paused = false, pausedAt = 0, vclock = 0, adminOpen = false;
const music = new Music();

/* ---------- world ---------- */
const canvas = $('sky');
let world;
try { world = createWorld(canvas, MAX_VISUAL + 2); } catch (e) { $('nogl').hidden = false; throw e; }
const fleet = new Fleet(world.droneGeo, MAX_VISUAL + 2);
const visualN = () => Math.min(baseCount, MAX_VISUAL) + 1;
const now = () => performance.now() / 1000;
function resize() { world.resize(window.innerWidth, window.innerHeight); world.setShot(shot()); }
window.addEventListener('resize', resize);

const lobbyCtx = () => ({ me, lobby: true, n: fmt(baseCount + (me.launched ? 1 : 0)) });
const participants = def => fleet.N - ((!me.launched || (def.spot && me.spot)) ? 1 : 0);
function enterLobbyLayout(instant) {
  const def = ep.defs.pad;
  fleet.setScene(def, def.build(participants(def), lobbyCtx()), vclock, me, { instant, slot: 8 });
  if (pairNum && me.launched && fleet.N > 2) placeBesideFriend();
}
function placeBesideFriend() {
  const b = fleet.base, bx = b[3] + 1.2, bz = b[5];
  let best = -1, bd = Infinity;
  for (let i = 2; i < fleet.N; i++) { const d = Math.abs(b[3 * i] - bx) + Math.abs(b[3 * i + 2] - bz); if (d < bd) { bd = d; best = i; } }
  if (best < 0) return;
  for (let k = 0; k < 3; k++) { const t = b[k]; b[k] = b[3 * best + k]; b[3 * best + k] = t; }
}
fleet.setCount(visualN());
for (let i = 0; i < fleet.N; i++) fleet.pos[3 * i + 1] = 1.1;
resize();
enterLobbyLayout(true);

/* ---------- show flow ---------- */
function shot() {
  if (mode !== 'show' || sceneIdx < 0) return 'lobby';
  const id = ep.SCENES[sceneIdx].id;
  return id === 'pad' || id === 'approach' || id === 'land' ? 'lobby' : 'show';
}
function showTime() { if (paused) return pausedAt; return useAudioClock ? music.ctx.currentTime - showT0 : now() - showT0; }
function pauseShow() { if (mode !== 'show' || paused) return; pausedAt = Math.max(0, showTime()); paused = true; if (music.ctx) music.ctx.suspend(); }
function resumeShow() { if (!paused) return; paused = false; if (useAudioClock) music.ctx.resume(); else showT0 = now() - pausedAt; }
function buildShowState() {
  const count = baseCount + (me.launched ? 1 : 0);
  const pool = SKY_WISHES.slice().sort(() => rand() - 0.5);
  return {
    me, n: fmt(count), count,
    shapeKey: shapeFor(count),
    wishes: [
      { text: pool[0], mine: false },
      me.launched && me.wish ? { text: me.wish, mine: true } : { text: pool[1], mine: false },
      { text: pool[2], mine: false }
    ],
    scene: me.launched && me.scene ? { text: me.scene, mine: true, from: me.name } : { text: pick(DEMO_SCENES), mine: false, from: hashName(Math.floor(rand() * 9000) + 3) },
    soloIdx: me.launched ? 0 : 2 + Math.floor(rand() * Math.max(1, fleet.N - 2))
  };
}
function startShow() {
  if (mode === 'show') return;
  if (ep.needsFile && !music.custom) {
    toast('영화 회차는 노래 음원이 필요해요. "내 음악 파일"에서 라이선스 받은 음원을 골라 주세요');
    nextShowAt = Date.now() + DEMO_GAP;
    return;
  }
  if (ep.dynamic) { ep.prepare(music.custom.buffer); delete eventsCache[ep.id]; }
  applyOverrides(ep);
  if (music.custom) music.setCustom(music.custom.buffer, ep.customFrom);
  fillChapters();
  const events = eventsCache[ep.id] || (eventsCache[ep.id] = ep.arrange());
  show = buildShowState();
  if (music.running()) { const at = music.ctx.currentTime + 0.4; music.startShow(at, events); showT0 = at; useAudioClock = true; }
  else { showT0 = now() + 0.4; useAudioClock = false; }
  mode = 'show';
  sceneIdx = -1;
  snapshot = null;
  clearBubbles(); hideTip();
  $('progress').hidden = false;
  document.body.classList.add('in-show');
}
function sceneAt(st) { let k = 0; for (let i = 0; i < ep.SCENES.length; i++) if (st >= ep.SCENES[i].at) k = i; return k; }
function enterScene(k, instant) {
  const sc = ep.SCENES[k], def = ep.defs[sc.id];
  if (def.keep && instant) {
    const parent = ep.defs[def.keep];
    fleet.setScene(parent, parent.build(participants(parent), show), vclock, me, { instant: true });
  }
  const shape = def.keep ? null : def.build(participants(def), show);
  fleet.setScene(def, shape, vclock, me, { instant, slot: sc.end - sc.at, spot: def.spot ? ep.spotAt(show) : null });
  sceneIdx = k;
  world.setShot(shot());
}
function endShow() {
  if (paused) { paused = false; if (music.ctx) music.ctx.resume(); }
  mode = 'lobby';
  sceneIdx = -1;
  music.startLobby();
  setCaption('', '');
  $('progress').hidden = true;
  document.body.classList.remove('in-show');
  if (me.spot) { me.spot = false; spotsLeft = 2; }
  if (me.scene) me.scene = '';
  refreshShop();
  if (pendingCount !== null) { baseCount = pendingCount; pendingCount = null; }
  if (fleet.N !== visualN()) fleet.setCount(visualN());
  enterLobbyLayout(false);
  world.setShot('lobby');
  nextShowAt = Date.now() + (adminOpen ? 1e12 : DEMO_GAP);
  if (snapshot && snapshot.launched) toast('오늘의 하늘이 카드로 만들어졌어요', '보기', openShare);
}
function seekTo(st) {
  if (mode !== 'show') startShow();
  st = Math.max(0, Math.min(ep.SHOW_LEN - 1, st));
  if (useAudioClock) { music.seek(st); showT0 = music.showT0; } else showT0 = now() - st;
  if (paused) pausedAt = st;
  enterScene(sceneAt(st), true);
  world.snap();
}

/* ---------- captions ---------- */
const capEl = $('caption');
let capKey = '', capTimer = 0;
function setCaption(a, b) {
  const key = a + '|' + b;
  if (key === capKey) return;
  capKey = key;
  capEl.classList.remove('on');
  clearTimeout(capTimer);
  capTimer = setTimeout(() => { $('cap-a').textContent = a; $('cap-b').textContent = b; if (a || b) capEl.classList.add('on'); }, 450);
}

/* ---------- frame ---------- */
const fx = { abs: 0, pulse: 0, beatLen: 1, soloIdx: 0, solo: [0, 0, 0], pos: null, shapeKey: 'star', wishes: null, scene: null, meColor: null, meAlpha: 1, meSize: 1.5 };
const pt = { x: 0, y: 0, visible: false };
let last = now();
function frame() {
  const t0 = now(), rdt = Math.min(0.05, t0 - last); last = t0;
  const dt = paused ? 0 : rdt;
  vclock += dt;
  const t = vclock;
  if (mode === 'lobby' && !adminOpen && Date.now() >= nextShowAt) startShow();
  let st = t;
  if (mode === 'show') {
    const abs = showTime();
    if (abs >= ep.SHOW_LEN) endShow();
    else {
      const k = sceneAt(Math.max(0, abs));
      if (k !== sceneIdx) enterScene(k, false);
      const sc = ep.SCENES[sceneIdx];
      st = Math.max(0, abs) - sc.at;
      fx.abs = abs;
      const b = ep.beatAt(abs);
      fx.pulse = b.on ? Math.exp(-b.since * (b.down ? 4 : 7)) * (b.down ? 1 : 0.5) : 0;
      if (music.inCustom && music.inCustom(abs) && music.customSrc) fx.pulse = Math.min(1, Math.max(0, (music.energy() - 0.35) * 2.2));
      fx.soloDark = ep.soloDark;
      fx.beatLen = b.len;
      fx.shapeKey = show.shapeKey; fx.wishes = show.wishes; fx.scene = show.scene;
      fx.soloIdx = show.soloIdx;
      fx.solo[0] = fleet.pos[3 * fx.soloIdx]; fx.solo[1] = fleet.pos[3 * fx.soloIdx + 1]; fx.solo[2] = fleet.pos[3 * fx.soloIdx + 2];
      const cap = capOverride(ep.id, sc.id) || (ep.defs[sc.id].cap ? ep.defs[sc.id].cap(st, show) : null);
      setCaption(cap ? cap[0] : '', cap ? cap[1] : '');
      $('progress-fill').style.width = Math.min(100, Math.max(0, abs) / ep.SHOW_LEN * 100) + '%';
      if (sc.id === ep.snapScene && !snapshot && t - fleet.t0 > fleet.T + 3) takeSnapshot();
    }
  }
  const id = mode === 'show' && sceneIdx >= 0 ? ep.SCENES[sceneIdx].id : 'pad';
  if (id === 'solo' || id === 'tSolo' || id === 'fireworks' || id === 'rockets') fx.meColor = null;
  else {
    const gold = me.spot && id === ep.spotScene;
    fx.meColor = gold ? DRONE_COLORS[4] : DRONE_COLORS[me.color];
    fx.meAlpha = id === 'land' || id === 'pad' ? 0.6 : 1;
    fx.meSize = gold ? 2.2 : 1.5;
  }
  fleet.update(t, st, fx, me);
  world.render(t, dt, reduced);
  placeRings();
  requestAnimationFrame(frame);
}

/* ---------- overlays ---------- */
const meRing = $('me-ring'), friendRing = $('friend-ring');
function placeRings() {
  if (me.launched && fleet.N > 0) {
    world.project(fleet.pos[0], fleet.pos[1], fleet.pos[2], pt);
    meRing.hidden = !pt.visible;
    meRing.style.transform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
  } else meRing.hidden = true;
  if (pairNum && fleet.N > 1 && mode === 'lobby') {
    world.project(fleet.pos[3], fleet.pos[4], fleet.pos[5], pt);
    friendRing.hidden = !pt.visible;
    friendRing.style.transform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
  } else friendRing.hidden = true;
}
let bubbles = [];
function clearBubbles() { bubbles.forEach(b => b.remove()); bubbles = []; }
function spawnBubble() {
  if (mode !== 'lobby' || document.hidden || fleet.N < 4) return;
  const i = 2 + Math.floor(rand() * (fleet.N - 2)), w = simWish(i);
  if (!w) return;
  world.project(fleet.pos[3 * i], fleet.pos[3 * i + 1], fleet.pos[3 * i + 2], pt);
  const { W, H } = world.size();
  if (!pt.visible || pt.y < H * 0.25 || pt.y > H - 150 || pt.x < 60 || pt.x > W - 60) return;
  const b = document.createElement('div');
  b.className = 'bubble'; b.textContent = w;
  b.style.left = pt.x + 'px'; b.style.top = (pt.y - 8) + 'px';
  document.body.appendChild(b); bubbles.push(b);
  setTimeout(() => { b.remove(); bubbles = bubbles.filter(x => x !== b); }, 4500);
  while (bubbles.length > 3) bubbles.shift().remove();
}
let tipEl = null, tipTimer = 0;
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
canvas.addEventListener('pointerdown', e => {
  let best = -1, bd = 24 * 24;
  for (let i = me.launched ? 0 : 1; i < fleet.N; i++) {
    if (fleet.alpha[i] < 0.05) continue;
    world.project(fleet.pos[3 * i], fleet.pos[3 * i + 1], fleet.pos[3 * i + 2], pt);
    if (!pt.visible) continue;
    const d = (pt.x - e.clientX) ** 2 + (pt.y - e.clientY) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  hideTip();
  if (best < 0) return;
  let name, wish;
  if (best === 0) { name = me.name + ' (나)'; wish = me.wish; }
  else if (best === 1 && pairNum) { name = '친구 #' + pairNum; wish = simWish(1); }
  else { name = hashName(best); wish = simWish(best); }
  world.project(fleet.pos[3 * best], fleet.pos[3 * best + 1], fleet.pos[3 * best + 2], pt);
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  const b = document.createElement('b'); b.textContent = name; tipEl.appendChild(b);
  tipEl.appendChild(document.createTextNode(wish || '소원 없이 구경 중'));
  tipEl.style.left = pt.x + 'px'; tipEl.style.top = (pt.y - 14) + 'px';
  document.body.appendChild(tipEl);
  clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 3200);
});

/* ---------- HUD ---------- */
function updateHud() {
  if (mode === 'lobby') {
    shownCount = Math.max(1, shownCount + Math.round(rand() * 6 - 2));
    const target = baseCount + (me.launched ? 1 : 0);
    if (Math.abs(shownCount - target) > target * 0.03) shownCount = target;
  }
  $('count').textContent = fmt(shownCount);
  const nx = $('next'), song = $('song');
  if (mode === 'show') {
    const abs = Math.max(0, showTime());
    nx.innerHTML = '쇼 <b>' + clock(abs) + '</b> / ' + clock(ep.SHOW_LEN);
    const s = ep.SONGS.find(x => abs >= x.from && abs < x.to);
    song.textContent = music.inCustom && music.inCustom(abs) && music.customSrc ? '음악 · 내 음악 파일' : s ? '음악 · ' + s.title : '';
    const ch = ep.CHAPTERS.filter(c => abs >= c.at).pop();
    if (ch && document.activeElement !== $('chapter')) $('chapter').value = String(ch.at);
  } else {
    const left = Math.max(0, Math.round((nextShowAt - Date.now()) / 1000));
    nx.innerHTML = '다음 쇼까지 <b>' + clock(left) + '</b>';
    song.textContent = '실서비스에서는 매일 밤 10시';
  }
  const c = baseCount + (me.launched ? 1 : 0);
  if (ep.id !== 'yunseul') { $('goal-text').textContent = '특별 회차 · 그날 밤을 기억하며'; $('goal-fill').style.width = '100%'; return; }
  let cur = 'star', next = null, prevAt = 0;
  MILESTONES.forEach(m => { if (c >= m.at) { cur = m.key; prevAt = m.at; } else if (!next) next = m; });
  if (next) {
    $('goal-text').textContent = '오늘의 그림 ' + SHAPES[cur].label + ' · ' + SHAPES[next.key].label + '까지 ' + fmt(next.at - c) + '명';
    $('goal-fill').style.width = Math.min(100, (c - prevAt) / (next.at - prevAt) * 100) + '%';
  } else {
    $('goal-text').textContent = '오늘의 그림 ' + SHAPES[cur].label + ' · 최고 단계';
    $('goal-fill').style.width = '100%';
  }
}

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(text, btnLabel, onBtn) {
  const el = $('toast'), btn = $('toast-btn');
  $('toast-text').textContent = text;
  if (btnLabel) { btn.hidden = false; btn.textContent = btnLabel; btn.onclick = () => { el.hidden = true; onBtn(); }; }
  else btn.hidden = true;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, btnLabel ? 10000 : 3800);
}

/* ---------- audio ---------- */
function wakeAudio() {
  if (!music.init()) return;
  if (mode === 'lobby' && music.mode !== 'lobby') music.startLobby();
  if (mode === 'show' && music.mode !== 'show') {           // a show that began silently: join it in time
    const st = showTime();
    music.startShow(music.ctx.currentTime - st, eventsCache[ep.id]);
    music.seek(st);
    showT0 = music.showT0; useAudioClock = true;
  }
  updateSoundBtn();
}
function updateSoundBtn() { $('btn-sound').textContent = music.ctx && !music.muted ? '소리 끄기' : '소리 켜기'; }
$('btn-sound').addEventListener('click', () => {
  if (!music.ctx) { music.muted = false; wakeAudio(); return; }
  music.setMuted(!music.muted);
  updateSoundBtn();
});

/* ---------- sheets ---------- */
function open(id) { $(id).hidden = false; const f = $(id).querySelector('button, input'); if (f) f.focus(); }
function close(id) { $(id).hidden = true; }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(b.getAttribute('data-close'))));
document.querySelectorAll('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s && s.id !== 'onboard') s.hidden = true; }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') ['shop', 'share'].forEach(close); });

$('ob-name').textContent = me.name;
if (pairNum) { $('ob-pair').hidden = false; $('ob-pair').textContent = '친구 #' + pairNum + '의 링크로 왔어요. 띄우면 친구 드론 옆에 자리를 잡아요.'; }
$('ob-rename').addEventListener('click', () => { const n = newName(); me.name = n.name; me.num = n.num; $('ob-name').textContent = me.name; });
$('ob-go').addEventListener('click', () => { me.wish = $('ob-wish').value.trim(); wakeAudio(); launch(); close('onboard'); });
$('ob-skip').addEventListener('click', () => { wakeAudio(); close('onboard'); });
$('btn-launch').addEventListener('click', () => {
  if (!me.launched) { open('onboard'); return; }
  toast('금빛 고리 안이 내 드론이에요 · ' + me.name);
});
function launch() {
  if (me.launched) return;
  me.launched = true;
  fleet.pos[0] = 0; fleet.pos[1] = 0.4; fleet.pos[2] = 30;
  $('btn-launch').textContent = '내 드론 찾기';
  $('btn-launch').classList.remove('primary');
  if (mode === 'lobby') enterLobbyLayout(false);
  const left = Math.max(0, Math.round((nextShowAt - Date.now()) / 1000));
  toast(mode === 'show' ? '띄웠어요! 다음 장면부터 함께 날아요' : '띄웠어요! ' + Math.floor(left / 60) + '분 ' + (left % 60) + '초 뒤 쇼에서 함께 날아요');
}
function inviteLink() { return location.href.split('#')[0] + '#pair-' + me.num; }
function copyInvite() {
  if (!me.launched) { toast('먼저 내 드론을 띄워 주세요', '띄우기', () => open('onboard')); return; }
  const link = inviteLink();
  const done = () => toast('링크를 복사했어요. 친구가 들어오면 내 옆에서 날아요');
  const fail = () => toast('복사가 막혔어요. 링크: ' + link);
  try { navigator.clipboard.writeText(link).then(done, fail); } catch (e) { fail(); }
}
$('btn-invite').addEventListener('click', copyInvite);
$('share-invite').addEventListener('click', copyInvite);
$('btn-preview').addEventListener('click', () => {
  wakeAudio();
  if (mode === 'show') { toast('이미 쇼가 진행 중이에요'); return; }
  startShow();
});
const chapterSel = $('chapter');
function fillChapters() {
  chapterSel.innerHTML = '<option value="" disabled selected>이동</option>';
  ep.CHAPTERS.forEach(c => { const o = document.createElement('option'); o.value = String(c.at); o.textContent = clock(c.at) + ' ' + c.label; chapterSel.appendChild(o); });
}
fillChapters();
$('episode').addEventListener('change', e => {
  const next = EPISODES[e.target.value]; if (!next || next === ep) return;
  if (mode === 'show') { mode = 'lobby'; sceneIdx = -1; music.startLobby(); setCaption('', ''); $('progress').hidden = true; document.body.classList.remove('in-show'); enterLobbyLayout(false); world.setShot('lobby'); }
  ep = next;
  $('subtitle').textContent = ep.subtitle;
  fillChapters(); refreshShop(); updateHud();
  if (music.custom) { music.setCustom(music.custom.buffer, ep.customFrom); if (ep.dynamic) { ep.prepare(music.custom.buffer); fillChapters(); } }
  toast(ep.needsFile && !music.custom ? ep.title + ' 회차예요. 먼저 "내 음악 파일"로 노래 음원을 골라 주세요' : ep.title + ' 회차로 바꿨어요. "지금 쇼 시작"을 눌러 보세요');
});
$('face-file').addEventListener('change', async e => {
  const files = e.target.files; if (!files || !files.length) return;
  try {
    const k = await loadPortraits(files);
    if (EPISODES.film.SCENES && music.custom && ep.dynamic) { ep.prepare(music.custom.buffer); fillChapters(); }
    toast('사진 ' + k + '장을 드론 배치로 바꿨어요. 영화 회차의 클라이맥스 다음에 하늘에 떠요');
  } catch (err) { toast('이 사진은 열 수 없어요. JPG나 PNG 파일을 골라 주세요'); }
});
$('music-file').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  wakeAudio();
  if (!music.ctx) { toast('이 브라우저에서는 소리를 낼 수 없어요'); return; }
  try {
    const buf = await music.ctx.decodeAudioData(await f.arrayBuffer());
    music.setCustom(buf, ep.customFrom);
    if (ep.dynamic) { ep.prepare(buf); fillChapters(); }
    if (mode === 'show') music.playCustom(showTime());
    toast('"' + f.name + '"을 ' + clock(ep.customFrom) + '부터 틀어요 (' + clock(buf.duration) + ' 길이). 그동안 기본 음악은 쉬어요');
  } catch (err) { toast('이 파일은 재생할 수 없어요. MP3나 M4A 파일을 골라 주세요'); }
});
chapterSel.addEventListener('change', () => { wakeAudio(); seekTo(parseFloat(chapterSel.value)); });

/* shop */
let chosenColor = 1;
const sw = $('swatches');
[1, 2, 3].forEach(k => {
  const b = document.createElement('button'), c = DRONE_COLORS[k];
  b.type = 'button'; b.className = 'swatch';
  b.style.background = 'rgb(' + c.map(v => Math.round(v * 255)).join(',') + ')';
  b.setAttribute('aria-label', COLOR_NAMES[k]);
  b.setAttribute('aria-pressed', k === 1 ? 'true' : 'false');
  b.addEventListener('click', () => { chosenColor = k; sw.querySelectorAll('.swatch').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); refreshShop(); });
  sw.appendChild(b);
});
function needLaunch() {
  if (me.launched) return false;
  close('shop');
  toast('먼저 내 드론을 띄워 주세요', '띄우기', () => open('onboard'));
  return true;
}
function paid(text) { toast('테스트 결제 완료 · ' + text + ' (실제 돈은 나가지 않았어요)'); }
$('buy-color').addEventListener('click', () => { if (needLaunch()) return; me.color = chosenColor; refreshShop(); paid(COLOR_NAMES[chosenColor] + ' 색 적용'); });
$('buy-spot').addEventListener('click', () => {
  if (needLaunch() || me.spot) return;
  me.spot = true; spotsLeft -= 1; refreshShop();
  paid('다음 쇼에서 ' + ep.spotLabel(baseCount + 1) + ' 자리를 맡아요');
});
$('buy-scene').addEventListener('click', () => {
  if (needLaunch()) return;
  const v = $('scene-input').value.trim();
  if (!v) { $('scene-input').focus(); toast('하늘에 띄울 메시지를 적어 주세요'); return; }
  me.scene = v; refreshShop();
  paid('다음 쇼에서 "' + v + '" 메시지가 하늘을 채워요');
});
function refreshShop() {
  const spotLabel = ep.spotLabel(baseCount + (me.launched ? 1 : 0));
  $('buy-color').disabled = me.color === chosenColor;
  $('buy-color').textContent = me.color === chosenColor ? '적용됨' : '1,000원';
  $('spot-title').textContent = '명당 자리 · ' + spotLabel;
  $('spot-desc').textContent = '쇼의 대표 장면에서 ' + spotLabel + ' 자리를 금빛으로 맡아요. 공유 카드에도 그렇게 남아요.';
  $('spot-left').textContent = me.spot ? '구매 완료 · 다음 쇼에 반영' : '이번 쇼 ' + spotsLeft + '자리 남음';
  $('buy-spot').disabled = me.spot;
  $('buy-spot').textContent = me.spot ? '적용됨' : '5,000원';
  $('scene-left').textContent = me.scene ? '구매 완료 · "' + me.scene + '"' : '이번 쇼 3자리 중 1자리 남음';
  $('buy-scene').disabled = !!me.scene;
  $('buy-scene').textContent = me.scene ? '적용됨' : '15,000원';
}
$('btn-shop').addEventListener('click', () => { refreshShop(); open('shop'); });

$('demo-count').addEventListener('change', e => {
  const v = parseInt(e.target.value, 10);
  if (mode === 'show') { pendingCount = v; toast('쇼가 끝나면 인원이 바뀌어요'); return; }
  baseCount = v; shownCount = v + (me.launched ? 1 : 0);
  fleet.setCount(visualN());
  enterLobbyLayout(false);
  refreshShop();
});

/* ---------- share card ---------- */
function takeSnapshot() {
  const { W, H } = world.size();
  const p = me.launched ? world.project(fleet.pos[0], fleet.pos[1], fleet.pos[2], { x: 0, y: 0, visible: false }) : null;
  snapshot = { img: world.capture(), W, H, me: p && { x: p.x, y: p.y }, key: show.shapeKey, count: show.count, countText: fmt(show.count), spot: me.spot, launched: me.launched, ep };
}
function openShare() {
  if (!snapshot) return;
  const sep = snapshot.ep;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const g = c.getContext('2d');
    g.fillStyle = '#02040b'; g.fillRect(0, 0, 1080, 1920);
    const boxH = 1300, scale = Math.max(1080 / snapshot.W, boxH / snapshot.H);
    const dw = snapshot.W * scale, dh = snapshot.H * scale, dx = (1080 - dw) / 2, dy = 160 + (boxH - dh) / 2;
    g.save(); g.beginPath(); g.rect(0, 160, 1080, boxH); g.clip(); g.drawImage(img, dx, dy, dw, dh); g.restore();
    const fade = g.createLinearGradient(0, 1250, 0, 1460);
    fade.addColorStop(0, 'rgba(2,4,11,0)'); fade.addColorStop(1, 'rgba(2,4,11,1)');
    g.fillStyle = fade; g.fillRect(0, 1250, 1080, 220);
    if (snapshot.me) {
      const px = dx + snapshot.me.x * scale, py = dy + snapshot.me.y * scale;
      if (py > 160 && py < 1460) {
        g.strokeStyle = '#ffcf6b'; g.lineWidth = 4; g.beginPath(); g.arc(px, py, 34, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffcf6b'; g.font = '700 38px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText('나', px, py - 50);
      }
    }
    g.textAlign = 'center';
    g.fillStyle = '#eef1fa'; g.font = '700 58px "Gowun Batang", serif'; g.fillText('하늘한칸', 540, 100);
    const d = new Date();
    g.fillStyle = '#a3adc8'; g.font = '400 30px "Noto Sans KR", sans-serif';
    g.fillText(sep.place + ' · ' + d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' 밤 10시', 540, 145);
    g.fillStyle = '#eef1fa'; g.font = '700 70px "Gowun Batang", serif';
    g.fillText(sep.cardHead(snapshot), 540, 1560);
    g.fillStyle = '#c9d0e6'; g.font = '400 42px "Noto Sans KR", sans-serif';
    g.fillText(sep.cardSub(snapshot), 540, 1640);
    g.fillStyle = '#ffcf6b'; g.font = '500 34px "Noto Sans KR", sans-serif'; g.fillText(me.name, 540, 1730);
    g.fillStyle = '#a3adc8'; g.font = '400 30px "Noto Sans KR", sans-serif'; g.fillText('매일 밤 10시 · 나도 한 칸 띄우러 가기', 540, 1850);
    $('share-img').src = c.toDataURL('image/jpeg', 0.92);
    open('share');
  };
  img.src = snapshot.img;
}

/* ---------- boot ---------- */
setInterval(updateHud, 500);
setInterval(spawnBubble, 2300);
updateHud();
refreshShop();
updateSoundBtn();
requestAnimationFrame(frame);

/* ---------- operator timeline editor ---------- */
const DEFAULT_AT = {}, DEFAULT_SONG = {};
Object.values(EPISODES).forEach(e => { DEFAULT_AT[e.id] = Object.fromEntries(e.SCENES.map(s => [s.id, s.at])); DEFAULT_SONG[e.id] = e.customFrom; });
const dummyShow = () => ({ me, n: fmt(baseCount), count: baseCount, shapeKey: shapeFor(baseCount), wishes: [{ text: '', mine: false }, { text: '', mine: false }, { text: '', mine: false }], scene: { text: '', mine: false, from: '누군가' }, soloIdx: 0 });
const resync = () => { if (mode === 'show') { const k = sceneAt(Math.max(0, showTime())); if (k !== sceneIdx) enterScene(k, false); } fillChapters(); };
const admin = initAdmin({
  ep: () => ep, music: () => music, toast,
  time: () => (mode === 'show' ? Math.max(0, showTime()) : 0),
  paused: () => paused || mode !== 'show',
  play: () => { wakeAudio(); if (mode !== 'show') startShow(); else resumeShow(); },
  pause: pauseShow,
  seek: t => { wakeAudio(); seekTo(t); },
  changed: resync,
  songMoved: v => { if (music.custom) { music.setCustom(music.custom.buffer, v); if (mode === 'show') music.playCustom(showTime()); } },
  defaultCap: id => { const d = ep.defs[id]; try { return d && d.cap ? d.cap(5, show || dummyShow()) : null; } catch (e) { return null; } },
  reset: () => {
    if (ep.dynamic && music.custom) ep.prepare(music.custom.buffer);
    else { ep.SCENES.forEach(s => { if (DEFAULT_AT[ep.id][s.id] != null) s.at = DEFAULT_AT[ep.id][s.id]; }); ep.SCENES.sort((a, b) => a.at - b.at); ep.SCENES.forEach((s, i) => { s.end = i + 1 < ep.SCENES.length ? ep.SCENES[i + 1].at : ep.SHOW_LEN; }); ep.customFrom = DEFAULT_SONG[ep.id]; }
    resync();
    if (music.custom) { music.setCustom(music.custom.buffer, ep.customFrom); if (mode === 'show') music.playCustom(showTime()); }
  },
  opened: () => {
    adminOpen = true; nextShowAt = Date.now() + 1e12;
    wakeAudio();
    if (mode !== 'show') { startShow(); if (mode === 'show') { seekTo(0); pauseShow(); } }
  },
  closed: () => { adminOpen = false; if (paused) resumeShow(); if (mode === 'lobby') nextShowAt = Date.now() + DEMO_GAP; }
});
$('btn-admin').addEventListener('click', () => admin.open());
if (location.hash === '#admin') admin.open();

window.__sky = { startShow, seekTo, setEpisode: id => { const s = $('episode'); s.value = id; s.dispatchEvent(new Event('change')); }, state: () => ({ mode, ep: ep.id, scene: sceneIdx >= 0 ? ep.SCENES[sceneIdx].id : null, st: mode === 'show' ? showTime() : 0, T: fleet.T, maxD: fleet.maxD }) };
