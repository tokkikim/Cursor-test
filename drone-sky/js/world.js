// Night harbour: sky, water, bridge, skyline, drones with water reflections and bloom.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { mulberry32 } from './formations.js';

const LIGHT_VS = `
attribute vec3 aColor;
attribute float aAlpha;
attribute float aSize;
uniform float uScale;
uniform float uTime;
uniform float uMirror;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float a = aAlpha;
  if (uMirror > 0.5) {
    p.y = -p.y;
    p.x += sin(p.y * 0.55 + uTime * 1.7 + p.z * 0.21) * (0.18 - p.y * 0.012);
    a *= 0.30 * exp(p.y * 0.022);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = aSize * uScale / -mv.z;
  gl_PointSize = clamp(s, 1.5, 72.0) * (uMirror > 0.5 ? 1.25 : 1.0);
  vColor = aColor;
  vAlpha = a * clamp(s / 2.5, 0.4, 1.0);
}`;
const LIGHT_FS = `
uniform float uMirror;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  if (uMirror > 0.5) q.y *= 0.33;
  float d2 = dot(q, q) * 4.0;
  float core = exp(-d2 * 22.0);
  float halo = exp(-d2 * 4.5) * 0.18;
  float a = (core + halo) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * (core * 1.25 + halo), a);
}`;

function lightMaterial(mirror) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 800 }, uTime: { value: 0 }, uMirror: { value: mirror ? 1 : 0 } },
    vertexShader: LIGHT_VS,
    fragmentShader: LIGHT_FS,
    transparent: true,
    depthWrite: false,
    depthTest: !mirror,
    blending: THREE.AdditiveBlending
  });
}

function lightGeometry(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 5000);
  return g;
}

export function createWorld(canvas, cap) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x02040b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060a1a, 0.0021);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);

  const materials = [];
  function addLights(geo, mirror) {
    const main = new THREE.Points(geo, lightMaterial(false));
    main.frustumCulled = false; main.renderOrder = 3; scene.add(main); materials.push(main.material);
    if (mirror) {
      const m = new THREE.Points(geo, lightMaterial(true));
      m.frustumCulled = false; m.renderOrder = 2; scene.add(m); materials.push(m.material);
    }
  }

  /* sky */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){
      float h = vP.y;
      vec3 zen = vec3(0.006, 0.012, 0.04);
      vec3 hor = vec3(0.05, 0.065, 0.16);
      vec3 glow = vec3(0.16, 0.09, 0.2);
      vec3 c = mix(hor, zen, smoothstep(0.0, 0.45, h));
      c += glow * exp(-abs(h) * 30.0) * 0.35;
      if (h < 0.0) c = mix(hor * 0.5, vec3(0.01, 0.015, 0.03), smoothstep(0.0, 0.2, -h));
      gl_FragColor = vec4(c, 1.0);
    }`
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  /* stars */
  const r = mulberry32(11);
  const starN = 1400, starGeo = lightGeometry(starN);
  {
    const p = starGeo.attributes.position.array, c = starGeo.attributes.aColor.array, a = starGeo.attributes.aAlpha.array, s = starGeo.attributes.aSize.array;
    for (let i = 0; i < starN; i++) {
      const th = r() * Math.PI * 2, y = 0.06 + r() * 0.94, rr = Math.sqrt(1 - y * y);
      p[3 * i] = Math.cos(th) * rr * 1500; p[3 * i + 1] = y * 1500; p[3 * i + 2] = Math.sin(th) * rr * 1500;
      const warm = r();
      c[3 * i] = 0.8 + warm * 0.2; c[3 * i + 1] = 0.85; c[3 * i + 2] = 1.0 - warm * 0.15;
      a[i] = 0.12 + r() * 0.35; s[i] = 3 + r() * 4;
    }
  }
  addLights(starGeo, false);

  /* water */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x02050c }));
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 0;
  scene.add(water);

  /* skyline */
  const bN = 140;
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const buildings = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0x03050c }), bN);
  const winPos = [], winCol = [];
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < bN; i++) {
    const w = 8 + r() * 18, d = 8 + r() * 10, h = 8 + Math.pow(r(), 2.2) * 58;
    const x = -460 + i * 6.8 + r() * 4, z = -320 - r() * 60;
    m4.makeScale(w, h, d); m4.setPosition(x, 0, z);
    buildings.setMatrixAt(i, m4);
    for (let wy = 3; wy < h - 2; wy += 2.6) for (let wx = -w / 2 + 1.5; wx < w / 2 - 1; wx += 2.2) {
      if (r() < 0.16) {
        winPos.push(x + wx, wy, z + d / 2 + 0.2);
        const cool = r() < 0.25;
        winCol.push(cool ? 0.7 : 1.0, cool ? 0.85 : 0.75, cool ? 1.0 : 0.45);
      }
    }
    if (h > 45) { winPos.push(x, h + 1, z); winCol.push(1, 0.1, 0.08); }
  }
  scene.add(buildings);
  const winN = winPos.length / 3, winGeo = lightGeometry(winN);
  winGeo.attributes.position.array.set(winPos);
  winGeo.attributes.aColor.array.set(winCol);
  winGeo.attributes.aAlpha.array.fill(0.3);
  winGeo.attributes.aSize.array.fill(2.0);
  addLights(winGeo, true);

  /* bridge (suspension) */
  const BZ = -110, DECK = 11, TOWER = 52, TX = 95, SPAN = 330;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(SPAN * 2, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x04060d }));
  deck.position.set(0, DECK - 1, BZ); scene.add(deck);
  [-TX, TX].forEach(x => {
    [-2.5, 2.5].forEach(dz => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, TOWER, 2.2), new THREE.MeshBasicMaterial({ color: 0x04060d }));
      t.position.set(x, TOWER / 2, BZ + dz); scene.add(t);
    });
  });
  const brPos = [], brKind = [];
  for (let x = -SPAN; x <= SPAN; x += 3) { brPos.push(x, DECK, BZ + 3.2); brKind.push(0); }
  const cable = x => {
    const ax = Math.abs(x);
    if (ax <= TX) return DECK + 4 + (TOWER - DECK - 4) * Math.pow(ax / TX, 2);
    const u = (ax - TX) / (SPAN - TX);
    return TOWER - (TOWER - DECK - 1) * (1 - Math.pow(1 - u, 2));
  };
  for (let x = -SPAN; x <= SPAN; x += 2.4) { brPos.push(x, cable(x), BZ + 2.5); brKind.push(1); }
  [-TX, TX].forEach(x => { for (let y = 2; y < TOWER; y += 2.5) { brPos.push(x, y, BZ + 3.5); brKind.push(2); } });
  const brN = brPos.length / 3, brGeo = lightGeometry(brN);
  brGeo.attributes.position.array.set(brPos);
  brGeo.attributes.aSize.array.fill(2.6);
  brGeo.attributes.aAlpha.array.fill(0.5);
  addLights(brGeo, true);

  /* drones */
  const droneGeo = lightGeometry(cap);
  addLights(droneGeo, true);

  /* post */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.72, 0.45, 0.16);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 1, H = 1;
  function resize(w, h) {
    W = w; H = h;
    const pr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    bloom.resolution.set(w * pr / 2, h * pr / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const scale = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    materials.forEach(m => { m.uniforms.uScale.value = scale; });
  }

  /* camera rig */
  const look = new THREE.Vector3(0, 12, -14);
  const camPos = new THREE.Vector3(0, 16, 80);
  const want = { pos: new THREE.Vector3(0, 16, 80), look: new THREE.Vector3(0, 6, -14) };
  function fitDistance() {
    const halfW = 31, halfH = 21;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(halfH / t, halfW / (t * camera.aspect)) * 1.12;
  }
  function setShot(name) {
    const d = fitDistance();
    if (name === 'lobby') { want.pos.set(0, 18, Math.max(70, d * 0.85)); want.look.set(0, 4, -12); }
    else if (name === 'show') { want.pos.set(0, 6, d + 8); want.look.set(0, 27, 0); }
    else if (name === 'close') { want.pos.set(0, 10, d - 4); want.look.set(0, 29, 0); }
  }
  setShot('lobby');
  camPos.copy(want.pos); look.copy(want.look);

  let bridgeTick = 0;
  function render(t, dt, reduced) {
    const k = 1 - Math.exp(-dt * 0.6);
    camPos.lerp(want.pos, k); look.lerp(want.look, k);
    const drift = reduced ? 0 : 1;
    camera.position.set(camPos.x + Math.sin(t * 0.05) * 4 * drift, camPos.y + Math.sin(t * 0.13) * 0.4 * drift, camPos.z);
    camera.lookAt(look);
    materials.forEach(m => { m.uniforms.uTime.value = t; });

    // bridge LEDs: slow colour waves like a real lit bridge
    if (++bridgeTick % 3 === 0) {
      const c = brGeo.attributes.aColor.array;
      for (let i = 0; i < brN; i++) {
        const x = brPos[3 * i], kind = brKind[i];
        if (kind === 0) { c[3 * i] = 1; c[3 * i + 1] = 0.86; c[3 * i + 2] = 0.65; continue; }
        const h = (x * 0.0015 + t * 0.03 + (kind === 2 ? 0.5 : 0)) % 1;
        hsl(h, 0.55, 0.62, c, 3 * i);
      }
      brGeo.attributes.aColor.needsUpdate = true;
      const wa = winGeo.attributes.aAlpha.array;
      for (let i = winN - 1, n = 0; i >= 0 && n < 20; i--) {
        if (winCol[3 * i] === 1 && winCol[3 * i + 1] === 0.1) { wa[i] = Math.sin(t * 2.4 + i) > 0.6 ? 0.9 : 0.1; n++; }
      }
      winGeo.attributes.aAlpha.needsUpdate = true;
    }
    composer.render();
  }

  const v = new THREE.Vector3();
  function project(x, y, z, out) {
    v.set(x, y, z).project(camera);
    out.x = (v.x + 1) / 2 * W; out.y = (1 - v.y) / 2 * H; out.visible = v.z < 1 && v.z > -1;
    return out;
  }
  function capture() {
    composer.render();
    return renderer.domElement.toDataURL('image/jpeg', 0.92);
  }

  const snap = () => { camPos.copy(want.pos); look.copy(want.look); };
  return { droneGeo, resize, render, project, setShot, snap, capture, size: () => ({ W, H }) };
}

export function hsl(h, s, l, out, o) {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  out[o] = f(0); out[o + 1] = f(8); out[o + 2] = f(4);
}
