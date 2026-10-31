import { createWorld } from './world.js';
import { Fleet, sectionAt, DRONE_COLORS } from './show.js';
import { Music, BAR, STEP, SHOW_LEN, drumAt } from './music.js';
import { SHAPES, MILESTONES, shapeFor } from './formations.js';

/* ---------- config ---------- */
const MAX_VISUAL = 5000;
const DEMO_FIRST_WAIT = 75 * 1000;     // demo: first show 75 s after load
const DEMO_GAP = 150 * 1000;           // demo: next show 2.5 min after the previous one ends
const COLOR_NAMES = ['기본', '하늘', '벚꽃', '민트', '금빛'];
const ADJ = ['졸린', '수줍은', '용감한', '배고픈', '반짝이는', '느긋한', '설레는', '씩씩한', '조용한', '포근한', '꿈꾸는', '부지런한'];
const NOUN = ['반딧불', '별똥별', '부엉이', '고래', '토끼', '구름', '등불', '참새', '달팽이', '여우', '고양이', '해파리'];
const WISHES = [
  '엄마 수술 잘 끝나게 해주세요', '우리 고양이 오래 살았으면', '취업 제발', '내일 발표 안 떨게',
  '보고 싶다', '합격했다고 말하고 싶어요', '그냥 오늘 잘 자고 싶다', '다들 아프지 말자',
  '면접 붙게 해주세요', '친구랑 화해하고 싶어', '내년엔 덜 불안하기를', '수능 대박 나자',
  '이번 주도 버텼다', '아빠랑 여행 가고 싶어'
];
const SKY_WISHES = ['엄마 수술 잘 되길', '우리 고양이 오래오래', '다들 아프지 말자', '합격하게 해주세요', '보고 싶다'];
const DEMO_SCENES = ['엄마 생일 축하해', '우리 결혼해요', '수능 대박', '다들 수고했어'];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const rand = Math.random;
const pick = a => a[Math.floor(rand() * a.length)];
const fmt = n => n.toLocaleString('ko-KR');
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function hashName(i) {
  let h = (i * 2654435761) >>> 0;
  const a = ADJ[h % ADJ.length]; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  const b = NOUN[h % NOUN.length]; h = Math.imul(h ^ (h >>> 11), 2246822519) >>> 0;
  return a + ' ' + b + ' #' + (1000 + (h % 9000));
}
function simWish(i) {
  const h = Math.imul(i + 17, 2654435761) >>> 0;
  return (h % 100) < 62 ? WISHES[h % WISHES.length] : '';
}
function newName() {
  const num = 1000 + Math.floor(rand() * 9000);
  return { name: pick(ADJ) + ' ' + pick(NOUN) + ' #' + num, num };
}

/* ---------- state ---------- */
const first = newName();
const me = { launched: false, name: first.name, num: first.num, wish: '', color: 0, spot: false, scene: '' };
const pm = /^#pair-(\d{4})$/.exec(location.hash || '');
const pairNum = pm ? pm[1] : null;
let baseCount = 1284, shownCount = 1284, pendingCount = null;
let mode = 'lobby';
let showT0 = 0, useAudioClock = false, curSection = null, showState = null, snapshot = null;
let nextShowAt = Date.now() + DEMO_FIRST_WAIT;
let spotsLeft = 2;
const music = new Music();

/* ---------- world ---------- */
const canvas = $('sky');
let world;
try {
  world = createWorld(canvas, MAX_VISUAL + 2);
} catch (e) {
  $('nogl').hidden = false;
  throw e;
}
const fleet = new Fleet(world.droneGeo, MAX_VISUAL + 2);
function visualN() { return Math.min(baseCount, MAX_VISUAL) + 1; }
function resize() { world.resize(window.innerWidth, window.innerHeight); world.setShot(shotFor(curSection ? curSection.id : null)); }
window.addEventListener('resize', resize);
resize();

const now = () => performance.now() / 1000;
fleet.setCount(visualN());
for (let i = 0; i < fleet.N; i++) fleet.pos[3 * i + 1] = 1.1;
fleet.setFormation('ground', now(), { me, quick: true, friend: !!pairNum });
// start already parked on the pad
fleet.from.set(fleet.pos.subarray(0, fleet.N * 3));

/* ---------- show flow ---------- */
function shotFor(id) {
  if (mode !== 'show' || !id) return 'lobby';
  if (id === 'main' || id === 'reprise' || id === 'solo') return 'close';
  if (id === 'landing') return 'lobby';
  return 'show';
}
function showTime() {
  return useAudioClock ? music.ctx.currentTime - showT0 : now() - showT0;
}
function startShow() {
  if (mode === 'show') return;
  if (music.running()) { const at = music.ctx.currentTime + 0.4; music.startShow(at); showT0 = at; useAudioClock = true; }
  else { showT0 = now() + 0.4; useAudioClock = false; }
  const others = WISHES.filter(w => w !== me.wish);
  showState = {
    me, friend: !!pairNum,
    shapeKey: shapeFor(baseCount + (me.launched ? 1 : 0)),
    wish1: { text: pick(SKY_WISHES), mine: false },
    wish2: me.launched && me.wish ? { text: me.wish, mine: true } : { text: pick(SKY_WISHES.filter(w => w !== others[0])), mine: false },
    scene: me.launched && me.scene ? { text: me.scene, mine: true, from: me.name } : { text: pick(DEMO_SCENES), mine: false, from: hashName(Math.floor(rand() * 9000) + 3) },
    soloIdx: me.launched ? 0 : 2 + Math.floor(rand() * Math.max(1, fleet.N - 2)),
    count: baseCount + (me.launched ? 1 : 0)
  };
  if (showState.wish1.text === showState.wish2.text) showState.wish1.text = '다들 아프지 말자';
  mode = 'show';
  curSection = null;
  snapshot = null;
  clearBubbles(); hideTip();
  $('progress').hidden = false;
  document.body.classList.add('in-show');
}
function enterSection(sec) {
  curSection = sec;
  const id = sec.id === 'landing' ? 'ground' : sec.id;
  fleet.setFormation(id, now(), Object.assign({}, showState, { quick: false }));
  world.setShot(shotFor(sec.id));
}
function endShow() {
  mode = 'lobby';
  curSection = null;
  music.startLobby();
  world.setShot('lobby');
  setCaption('', '');
  $('progress').hidden = true;
  document.body.classList.remove('in-show');
  if (me.spot) { me.spot = false; spotsLeft = 2; }
  if (me.scene) me.scene = '';
  refreshShop();
  if (pendingCount !== null) { baseCount = pendingCount; pendingCount = null; }
  if (fleet.N !== visualN()) fleet.setCount(visualN());
  fleet.setFormation('ground', now(), { me, quick: true, friend: !!pairNum });
  nextShowAt = Date.now() + DEMO_GAP;
  if (snapshot && snapshot.launched) toast('오늘의 하늘이 카드로 만들어졌어요', '보기', openShare);
}

/* ---------- captions ---------- */
function captionFor(id, st) {
  const s = showState, shape = SHAPES[s.shapeKey], n = fmt(s.count);
  switch (id) {
    case 'takeoff': return ['오늘 하루, 어땠나요?', ''];
    case 'sphere': return ['이 넓은 세상 어딘가에서', ''];
    case 'wave': return ['흔들리는 날도 있었지만', ''];
    case 'flower': return ['그래도 꽃은 피었어요', ''];
    case 'main': return ['오늘 밤, 우리가 모여 ' + shape.became, n + '개의 불빛이 함께 만들었어요'];
    case 'wish1': return ['오늘 밤, 누군가의 소원', '모두가 같은 소원을 보고 있어요'];
    case 'wish2': return s.wish2.mine ? ['당신의 소원이 하늘에 떴어요', '데모에서는 적은 소원이 항상 뽑혀요'] : ['또 다른 누군가의 소원', ''];
    case 'scene': return s.scene.mine ? ['당신의 마음이 하늘을 채웠어요', n + '명이 함께 보고 있어요'] : [s.scene.from + ' 님이 보낸 마음', '내 장면 · 15,000원'];
    case 'solo':
      if (st < 2 * BAR) return me.launched ? ['이 불빛 하나가 당신이에요', '오늘 하루를 버틴 당신'] : ['이 불빛 하나는 누군가의 오늘이에요', ''];
      return ['그리고, 혼자가 아니에요', n + '명이 지금 같은 하늘을 보고 있어요'];
    case 'build': return ['다 함께', ''];
    case 'burst': return ['', ''];
    case 'thanks': return ['', '모두에게, 그리고 나에게'];
    case 'reprise':
      if (!me.launched) return [n + '개의 불빛이 함께였어요', ''];
      return s.me.spot ? [shape.spotTopic + ' 바로 당신이었어요', ''] : [n + '개의 불빛 중 하나, 바로 당신', ''];
    case 'landing': return ['내일 밤 10시에 또 만나요', '데모에서는 2분 30초 뒤에 다시 열려요'];
  }
  return ['', ''];
}
const capEl = $('caption');
let capKey = '';
function setCaption(a, b) {
  const key = a + '|' + b;
  if (key === capKey) return;
  capKey = key;
  capEl.classList.remove('on');
  setTimeout(() => {
    $('cap-a').textContent = a; $('cap-b').textContent = b;
    if (a || b) capEl.classList.add('on');
  }, 350);
}

/* ---------- frame ---------- */
function envFor(st, key) {
  const s0 = Math.floor(st / STEP);
  for (let k = 0; k < 16; k++) {
    const s = s0 - k; if (s < 0) break;
    if (drumAt(Math.floor(s / 16), s % 16)[key]) return Math.exp(-(st - s * STEP) * 7);
  }
  return 0;
}
const fx = { st: 0, kick: 0, hat: 0, snare: 0, soloIdx: 0, soloX: 0, soloY: 0, soloZ: 0 };
const pt = { x: 0, y: 0, visible: false };
let last = now();
function frame() {
  const t = now(), dt = Math.min(0.05, t - last); last = t;
  if (mode === 'lobby' && Date.now() >= nextShowAt) startShow();
  if (mode === 'show') {
    const st = showTime();
    if (st >= SHOW_LEN) endShow();
    else {
      const bar = Math.floor(Math.max(0, st) / BAR);
      const sec = sectionAt(bar);
      if (!curSection || sec.id !== curSection.id) enterSection(sec);
      fx.st = st - sec.bar * BAR;
      fx.kick = envFor(st, 'kick'); fx.hat = envFor(st, 'hat'); fx.snare = envFor(st, 'snare');
      fx.soloIdx = showState.soloIdx;
      fx.soloX = fleet.pos[3 * fx.soloIdx]; fx.soloY = fleet.pos[3 * fx.soloIdx + 1]; fx.soloZ = fleet.pos[3 * fx.soloIdx + 2];
      const c = captionFor(sec.id, fx.st); setCaption(c[0], c[1]);
      $('progress-fill').style.width = Math.min(100, Math.max(0, st) / SHOW_LEN * 100) + '%';
      if (sec.id === 'reprise' && !snapshot && fx.st > 2.6 * BAR && t - fleet.t0 > 5.2) takeSnapshot();
    }
  } else {
    fx.st = t; fx.kick = 0; fx.hat = 0;
  }
  fleet.update(t, fx, me);
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
    const drift = Math.round(rand() * 6 - 2);
    shownCount = Math.max(1, shownCount + drift);
    const target = baseCount + (me.launched ? 1 : 0);
    if (Math.abs(shownCount - target) > target * 0.03) shownCount = target;
  }
  $('count').textContent = fmt(shownCount);
  const nx = $('next');
  if (mode === 'show') {
    const st = Math.max(0, showTime()), left = Math.max(0, Math.round(SHOW_LEN - st));
    nx.innerHTML = '쇼 진행 중 · <b>' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '</b> 남음';
  } else {
    const left = Math.max(0, Math.round((nextShowAt - Date.now()) / 1000));
    nx.innerHTML = '다음 쇼까지 <b>' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0') + '</b>';
  }
  const c = baseCount + (me.launched ? 1 : 0);
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
  fleet.pos[0] = 0; fleet.pos[1] = 0.4; fleet.pos[2] = 34;
  $('btn-launch').textContent = '내 드론 찾기';
  $('btn-launch').classList.remove('primary');
  if (mode === 'lobby') fleet.setFormation('ground', now(), { me, quick: true, friend: !!pairNum });
  const left = Math.max(0, Math.round((nextShowAt - Date.now()) / 1000));
  toast(mode === 'show' ? '띄웠어요! 다음 쇼부터 함께 날아요' : '띄웠어요! ' + Math.floor(left / 60) + '분 ' + (left % 60) + '초 뒤 쇼에서 모두 함께 날아요');
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

/* shop */
let chosenColor = 1;
const sw = $('swatches');
[1, 2, 3].forEach(k => {
  const b = document.createElement('button');
  const c = DRONE_COLORS[k];
  b.type = 'button'; b.className = 'swatch';
  b.style.background = 'rgb(' + c.map(v => Math.round(v * 255)).join(',') + ')';
  b.setAttribute('aria-label', COLOR_NAMES[k]);
  b.setAttribute('aria-pressed', k === 1 ? 'true' : 'false');
  b.addEventListener('click', () => {
    chosenColor = k;
    sw.querySelectorAll('.swatch').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    refreshShop();
  });
  sw.appendChild(b);
});
function needLaunch() {
  if (me.launched) return false;
  close('shop');
  toast('먼저 내 드론을 띄워 주세요', '띄우기', () => open('onboard'));
  return true;
}
function paid(text) { toast('테스트 결제 완료 · ' + text + ' (실제 돈은 나가지 않았어요)'); }
$('buy-color').addEventListener('click', () => {
  if (needLaunch()) return;
  me.color = chosenColor; refreshShop();
  paid(COLOR_NAMES[chosenColor] + ' 색 적용');
});
$('buy-spot').addEventListener('click', () => {
  if (needLaunch() || me.spot) return;
  me.spot = true; spotsLeft -= 1; refreshShop();
  paid('다음 쇼에서 ' + SHAPES[shapeFor(baseCount + 1)].spotLabel + ' 자리를 맡아요');
});
$('buy-scene').addEventListener('click', () => {
  if (needLaunch()) return;
  const v = $('scene-input').value.trim();
  if (!v) { $('scene-input').focus(); toast('하늘에 띄울 메시지를 적어 주세요'); return; }
  me.scene = v; refreshShop();
  paid('다음 쇼에서 "' + v + '" 메시지가 하늘을 채워요');
});
function refreshShop() {
  const shape = SHAPES[shapeFor(baseCount + (me.launched ? 1 : 0))];
  $('buy-color').disabled = me.color === chosenColor;
  $('buy-color').textContent = me.color === chosenColor ? '적용됨' : '1,000원';
  $('spot-title').textContent = '명당 자리 · ' + shape.spotLabel;
  $('spot-desc').textContent = '"오늘의 그림"에서 ' + shape.spotLabel + ' 자리를 금빛으로 맡아요. 마지막 장면과 공유 카드에도 그렇게 남아요.';
  $('spot-left').textContent = me.spot ? '구매 완료 · 다음 쇼에 반영' : '이번 쇼 ' + spotsLeft + '자리 남음';
  $('buy-spot').disabled = me.spot;
  $('buy-spot').textContent = me.spot ? '적용됨' : '5,000원';
  $('scene-left').textContent = me.scene ? '구매 완료 · "' + me.scene + '"' : '이번 쇼 3자리 중 1자리 남음';
  $('buy-scene').disabled = !!me.scene;
  $('buy-scene').textContent = me.scene ? '적용됨' : '15,000원';
}
$('btn-shop').addEventListener('click', () => { refreshShop(); open('shop'); });

/* demo crowd */
$('demo-count').addEventListener('change', e => {
  const v = parseInt(e.target.value, 10);
  if (mode === 'show') { pendingCount = v; toast('쇼가 끝나면 인원이 바뀌어요'); return; }
  baseCount = v; shownCount = v + (me.launched ? 1 : 0);
  fleet.setCount(visualN());
  fleet.setFormation('ground', now(), { me, quick: true, friend: !!pairNum });
  refreshShop();
});

/* ---------- share card ---------- */
function takeSnapshot() {
  const { W, H } = world.size();
  const p = me.launched ? world.project(fleet.pos[0], fleet.pos[1], fleet.pos[2], { x: 0, y: 0, visible: false }) : null;
  snapshot = {
    img: world.capture(), W, H, me: p && { x: p.x, y: p.y },
    key: showState.shapeKey, count: showState.count, spot: me.spot, launched: me.launched
  };
}
function openShare() {
  if (!snapshot) return;
  const shape = SHAPES[snapshot.key];
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const g = c.getContext('2d');
    g.fillStyle = '#02040b'; g.fillRect(0, 0, 1080, 1920);
    // cover-crop the captured frame into the top 1300px
    const boxH = 1300, scale = Math.max(1080 / snapshot.W, boxH / snapshot.H);
    const dw = snapshot.W * scale, dh = snapshot.H * scale, dx = (1080 - dw) / 2, dy = 160 + (boxH - dh) / 2;
    g.save(); g.beginPath(); g.rect(0, 160, 1080, boxH); g.clip();
    g.drawImage(img, dx, dy, dw, dh);
    g.restore();
    const fade = g.createLinearGradient(0, 1250, 0, 1460);
    fade.addColorStop(0, 'rgba(2,4,11,0)'); fade.addColorStop(1, 'rgba(2,4,11,1)');
    g.fillStyle = fade; g.fillRect(0, 1250, 1080, 220);
    if (snapshot.me) {
      const px = dx + snapshot.me.x * scale, py = dy + snapshot.me.y * scale;
      if (py > 160 && py < 1460) {
        g.strokeStyle = '#ffcf6b'; g.lineWidth = 4;
        g.beginPath(); g.arc(px, py, 34, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffcf6b'; g.font = '700 38px "Noto Sans KR", sans-serif'; g.textAlign = 'center';
        g.fillText('나', px, py - 50);
      }
    }
    g.textAlign = 'center';
    g.fillStyle = '#eef1fa'; g.font = '700 58px "Gowun Batang", serif'; g.fillText('하늘한칸', 540, 100);
    const d = new Date();
    g.fillStyle = '#a3adc8'; g.font = '400 30px "Noto Sans KR", sans-serif';
    g.fillText(d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' 밤의 쇼', 540, 145);
    g.fillStyle = '#eef1fa'; g.font = '700 70px "Gowun Batang", serif';
    g.fillText(snapshot.spot ? shape.spotTopic + ' 나였어요' : fmt(snapshot.count) + '개의 불빛 중 하나', 540, 1560);
    g.fillStyle = '#c9d0e6'; g.font = '400 42px "Noto Sans KR", sans-serif';
    g.fillText('오늘 밤, 우리가 모여 ' + shape.became, 540, 1640);
    g.fillStyle = '#ffcf6b'; g.font = '500 34px "Noto Sans KR", sans-serif';
    g.fillText(me.name, 540, 1730);
    g.fillStyle = '#a3adc8'; g.font = '400 30px "Noto Sans KR", sans-serif';
    g.fillText('매일 밤 10시 · 나도 한 칸 띄우러 가기', 540, 1850);
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

// test hook for automated checks
window.__sky = { startShow, state: () => ({ mode, section: curSection && curSection.id, st: mode === 'show' ? showTime() : 0 }), seek: s => { showT0 -= s; } };
