// Generated soundtrack (Web Audio). Lobby: calm 72 BPM loop. Show: 50 bars at 90 BPM.
// The same bar/step clock drives the drones, so lights land on the beat.

export const BPM = 90;
export const SPB = 60 / BPM;
export const BAR = SPB * 4;
export const STEP = SPB / 4;
export const SHOW_BARS = 50;
export const SHOW_LEN = SHOW_BARS * BAR;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const inR = (bar, a, b) => bar >= a && bar < b;

// Bm7 - Gmaj7 - Dadd9 - A
const CHORDS = [[59, 62, 66, 69], [55, 59, 62, 66], [62, 66, 69, 76], [57, 61, 64, 69]];
const ROOTS = [47, 43, 38, 45];
// [step, midi, length in steps] per bar, 8 bars
const MELODY = [
  [[0, 78, 8], [8, 76, 4], [12, 74, 4]],
  [[0, 74, 8], [8, 71, 8]],
  [[0, 69, 4], [4, 71, 4], [8, 74, 4], [12, 76, 4]],
  [[0, 76, 12], [12, 73, 4]],
  [[0, 78, 4], [4, 81, 4], [8, 78, 4], [12, 76, 4]],
  [[0, 74, 4], [4, 76, 4], [8, 74, 4], [12, 71, 4]],
  [[0, 69, 8], [8, 74, 8]],
  [[0, 73, 16]]
];
const LOBBY_CHORDS = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 62, 64, 69]];
const PENTA = [66, 69, 71, 74, 76, 78, 81, 83];
const LOBBY_STEP = 60 / 72 / 2;

// Drum grid shared with the visuals.
export function drumAt(bar, step) {
  const d = { kick: false, snare: false, hat: false };
  const full = inR(bar, 16, 24) || inR(bar, 38, 46);
  if (inR(bar, 12, 16)) d.kick = step === 0 || step === 8;
  if (inR(bar, 8, 16)) d.hat = step % 4 === 2;
  if (full) { d.kick = step % 4 === 0; d.snare = step === 4 || step === 12; d.hat = step % 2 === 0 && step % 4 !== 0; }
  if (bar === 34) d.kick = step % 4 === 0;
  if (bar === 35) { d.kick = step % 2 === 0; d.snare = step % 2 === 0 || step >= 8; }
  return d;
}

export class Music {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.mode = 'off';
    this.timer = 0;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.build(this.ctx);
    this.timer = setInterval(() => this.tick(), 25);
    return true;
  }

  build(ctx) {
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : 0.62;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.out.connect(comp); comp.connect(ctx.destination);
    // reverb
    this.rev = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.42;
    this.rev.connect(wet); wet.connect(this.out);
    // noise
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.out.gain.setTargetAtTime(m ? 0 : 0.62, this.ctx.currentTime, 0.15);
    if (!m) this.ctx.resume();
  }
  running() { return !!this.ctx && this.ctx.state === 'running'; }

  startLobby() {
    if (!this.ctx) return;
    this.mode = 'lobby';
    this.lobbyNext = this.ctx.currentTime + 0.2;
    this.lobbyStep = 0;
  }
  startShow(at) {
    if (!this.ctx) return;
    this.mode = 'show';
    this.showT0 = at;
    this.showStep = 0;
  }
  stop() { this.mode = 'off'; }

  tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const ahead = ctx.currentTime + 0.18;
    if (this.mode === 'lobby') {
      while (this.lobbyNext < ahead) {
        this.lobbyEvent(this.lobbyStep, this.lobbyNext);
        this.lobbyStep++; this.lobbyNext += LOBBY_STEP;
      }
    } else if (this.mode === 'show') {
      while (this.showStep < SHOW_BARS * 16) {
        const t = this.showT0 + this.showStep * STEP;
        if (t >= ahead) break;
        if (t >= ctx.currentTime - 0.03) this.showEvent(Math.floor(this.showStep / 16), this.showStep % 16, t);
        this.showStep++;
      }
    }
  }

  /* ---------- arrangement ---------- */
  lobbyEvent(s, t) {
    const ch = LOBBY_CHORDS[Math.floor(s / 16) % 4];
    if (s % 16 === 0) this.pad(ch, t, LOBBY_STEP * 16, 0.032, 900);
    if (s % 16 === 0) this.bass(ch[0] - 24, t, LOBBY_STEP * 14, 0.07);
    if (Math.random() < 0.26) this.pluck(PENTA[Math.floor(Math.random() * PENTA.length)], t, 0.045, 2.6, 1700);
  }

  showEvent(bar, step, t) {
    const ci = bar % 4, ch = CHORDS[ci], root = ROOTS[ci];
    if (step === 0) {
      let vol = 0.04, cut = 1500;
      if (bar < 4) { cut = 450 + bar * 380; vol = 0.026 + bar * 0.006; }
      if (inR(bar, 24, 30)) cut = 1100;
      if (inR(bar, 30, 32)) vol = 0.01;
      if (inR(bar, 32, 34)) { vol = 0.05; cut = 1900; }
      if (bar === 36) { vol = 0.06; cut = 3200; }
      if (inR(bar, 46, 50)) { vol = 0.04 * (1 - (bar - 46) / 4.5); cut = 1000; }
      this.pad(ch, t, BAR, vol, cut);
    }
    if (bar < 4 && step === 0) this.pluck(ch[3] + 12, t, 0.08, 2.2, 2400);
    if (bar === 0 && step === 0) this.riser(t, BAR * 4, 0.05, 200, 2400);

    if ((inR(bar, 4, 24) || inR(bar, 32, 34) || inR(bar, 38, 46)) && step % 2 === 0) {
      const seq = [0, 1, 2, 3, 2, 1, 2, 3];
      this.pluck(ch[seq[(step / 2) % 8]] + 12, t, inR(bar, 4, 8) ? 0.04 : 0.055, 0.7, 2600);
    }
    if (inR(bar, 24, 30) && step % 4 === 0) this.pluck(ch[(step / 4) % 4] + 12, t, 0.035, 1.6, 1800);

    if ((inR(bar, 8, 24) || inR(bar, 38, 46)) && (step === 0 || step === 6 || step === 8)) {
      this.bass(root, t, step === 6 ? STEP * 2 : STEP * 5, 0.2);
    }

    const d = drumAt(bar, step);
    if (d.kick) this.kick(t, inR(bar, 12, 16) ? 0.55 : 0.8);
    if (d.snare) this.snare(t, bar === 35 ? 0.06 + step * 0.012 : 0.2);
    if (d.hat) this.hat(t, 0.045);

    if (inR(bar, 16, 24) || inR(bar, 38, 46)) {
      const mb = (bar - (bar >= 38 ? 38 : 16)) % 8;
      MELODY[mb].forEach(([s, m, len]) => { if (s === step) this.lead(m, t, len * STEP, 0.06); });
    }
    if (inR(bar, 24, 30)) {
      const mb = (bar - 24) % 8;
      MELODY[mb].forEach(([s, m]) => { if (s === step) this.pluck(m, t, 0.08, 2.4, 2200); });
    }
    if (inR(bar, 30, 32) && step % 8 === 0) this.pluck([81, 78, 76, 74][(bar - 30) * 2 + step / 8], t, 0.07, 3.5, 2000);
    if (bar === 32 && step === 0) this.riser(t, BAR * 2, 0.05, 300, 3000);
    if (bar === 34 && step === 0) this.riser(t, BAR * 2, 0.11, 300, 7000);

    if (bar === 36 && step === 0) { this.crash(t, 0.2); this.boom(t); this.crackle(t + 1.1, 4.5); }
    if (bar === 36 && step === 8) this.boom(t);
    if (bar === 37 && step === 0) this.boom(t);
    if ((bar === 38 || bar === 42) && step === 0) this.crash(t, 0.13);
    if (inR(bar, 46, 50) && step % 8 === 0) this.pluck(ch[step === 0 ? 0 : 2] + 12, t, 0.055, 3, 1800);
  }

  /* ---------- instruments ---------- */
  send(node, wet) {
    node.connect(this.out);
    if (wet) { const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.rev); }
  }
  env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  noise(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.start(t, Math.random() * 1.2, dur + 0.05);
    return src;
  }

  pad(notes, t, dur, vol, cutoff) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(1.1, dur * 0.4));
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.8);
    f.connect(g); this.send(g, 0.7);
    notes.forEach(m => [-8, 8].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(t + dur + 1.9);
    }));
  }
  pluck(m, t, vol, decay, bright) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright;
    const g = ctx.createGain(); this.env(g, t, 0.004, vol, 0, decay);
    f.connect(g); this.send(g, 0.5);
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(m) * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o1.connect(f); o2.connect(g2); g2.connect(f);
    o1.start(t); o2.start(t); o1.stop(t + decay + 0.1); o2.stop(t + decay + 0.1);
  }
  lead(m, t, dur, vol) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2300; f.Q.value = 1;
    const g = ctx.createGain(); this.env(g, t, 0.04, vol, Math.max(0, dur - 0.08), 0.35);
    f.connect(g); this.send(g, 0.4);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
    const lg = ctx.createGain(); lg.gain.value = 7; lfo.connect(lg);
    [-5, 5].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 0.5);
    });
    lfo.start(t); lfo.stop(t + dur + 0.5);
  }
  bass(m, t, dur, vol) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const g = ctx.createGain(); this.env(g, t, 0.01, vol, Math.max(0, dur - 0.1), 0.25);
    f.connect(g); this.send(g, 0);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(m + 12);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2); g2.connect(f);
    o.start(t); o2.start(t); o.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
  }
  kick(t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = ctx.createGain(); this.env(g, t, 0.003, vol, 0, 0.42);
    o.connect(g); this.send(g, 0);
    o.start(t); o.stop(t + 0.5);
  }
  snare(t, vol) {
    const ctx = this.ctx;
    const n = this.noise(t, 0.25);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = ctx.createGain(); this.env(g, t, 0.002, vol, 0, 0.2);
    n.connect(f); f.connect(g); this.send(g, 0.25);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190;
    const g2 = ctx.createGain(); this.env(g2, t, 0.002, vol * 0.6, 0, 0.1);
    o.connect(g2); this.send(g2, 0.1); o.start(t); o.stop(t + 0.15);
  }
  hat(t, vol) {
    const ctx = this.ctx;
    const n = this.noise(t, 0.08);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
    const g = ctx.createGain(); this.env(g, t, 0.001, vol, 0, 0.05);
    n.connect(f); f.connect(g); this.send(g, 0.1);
  }
  crash(t, vol) {
    const ctx = this.ctx;
    const n = this.noise(t, 2.6);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500;
    const g = ctx.createGain(); this.env(g, t, 0.003, vol, 0, 2.4);
    n.connect(f); f.connect(g); this.send(g, 0.5);
  }
  riser(t, dur, vol, f0, f1) {
    const ctx = this.ctx;
    const n = this.noise(t, dur);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.95); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(f); f.connect(g); this.send(g, 0.5);
  }
  boom(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const g = ctx.createGain(); this.env(g, t, 0.005, 0.7, 0, 1.2);
    o.connect(g); this.send(g, 0.4); o.start(t); o.stop(t + 1.3);
    const n = this.noise(t, 1.0);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g2 = ctx.createGain(); this.env(g2, t, 0.003, 0.25, 0, 0.9);
    n.connect(f); f.connect(g2); this.send(g2, 0.6);
  }
  crackle(t, dur) {
    const ctx = this.ctx;
    for (let k = 0; k < 70; k++) {
      const tt = t + Math.random() * dur, n = this.noise(tt, 0.03);
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000 + Math.random() * 4000;
      const g = ctx.createGain(); this.env(g, tt, 0.001, 0.05 + Math.random() * 0.06, 0, 0.025);
      n.connect(f); f.connect(g); this.send(g, 0.6);
    }
  }
}
