// Web Audio engine. Plays the arranged show (score.js) and a calm lobby loop.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const LOBBY_CHORDS = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 62, 64, 69]];
const PENTA = [66, 69, 71, 74, 76, 78, 81];
const LOBBY_STEP = 60 / 70 / 2;

export class Music {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.mode = 'off';
    this.events = [];
    this.ptr = 0;
    this.level = 0.55;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.build(this.ctx);
    setInterval(() => this.tick(), 30);
    return true;
  }

  build(ctx) {
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : this.level;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.out.connect(comp); comp.connect(ctx.destination);
    this.rev = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
    }
    this.rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    this.rev.connect(wet); wet.connect(this.out);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // a soft piano-like timbre
    const n = 10, re = new Float32Array(n), im = new Float32Array(n);
    [0, 1, 0.42, 0.28, 0.16, 0.1, 0.07, 0.045, 0.03, 0.02].forEach((v, i) => { im[i] = v; });
    this.pianoWave = ctx.createPeriodicWave(re, im);
    this.ambience = [];
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.out.gain.setTargetAtTime(m ? 0 : this.level, this.ctx.currentTime, 0.2);
    if (!m) this.ctx.resume();
  }
  running() { return !!this.ctx && this.ctx.state === 'running'; }

  startLobby() {
    if (!this.ctx) return;
    this.stopAmbience();
    this.stopCustom();
    this.mode = 'lobby';
    this.lobbyNext = this.ctx.currentTime + 0.3;
    this.lobbyStep = 0;
    this.ambience.push(this.waves(this.ctx.currentTime + 0.1, 36000, 0.06));
  }
  startShow(at, events) {
    if (!this.ctx) return;
    this.stopAmbience();
    this.mode = 'show';
    this.events = events;
    this.showT0 = at;
    this.ptr = 0;
    this.playCustom(0);
  }
  // jump inside the show: restart long ambience that covers this moment
  seek(st) {
    if (!this.ctx || this.mode !== 'show') return;
    this.stopAmbience();
    const now = this.ctx.currentTime;
    this.showT0 = now - st;
    let lo = 0, hi = this.events.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.events[mid][0] < st) lo = mid + 1; else hi = mid; }
    this.ptr = lo;
    this.playCustom(st);
    for (const e of this.events) {
      if ((e[1] === 'waves' || e[1] === 'rain' || e[1] === 'crackle') && e[0] < st && e[0] + e[2] > st) this.play([0, e[1], e[0] + e[2] - st, e[3]], now + 0.05);
    }
  }
  stopAmbience() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this.ambience.forEach(a => { try { a.g.gain.cancelScheduledValues(t); a.g.gain.setTargetAtTime(0.0001, t, 0.4); a.src.stop(t + 2); } catch (e) { /* already stopped */ } });
    this.ambience = [];
  }

  // a listener's own audio file, played inside the show from `at` seconds; generated music pauses meanwhile
  setCustom(buffer, at) { this.custom = buffer ? { buffer, at, dur: buffer.duration } : null; }
  inCustom(st) { return this.custom && st >= this.custom.at && st < this.custom.at + this.custom.dur; }
  playCustom(st) {
    if (!this.ctx || !this.custom) return;
    if (this.customSrc) { try { this.customSrc.stop(); } catch (e) { /* stopped */ } this.customSrc = null; }
    const c = this.custom, now = this.ctx.currentTime;
    const startAt = this.showT0 + c.at, offset = Math.max(0, st - c.at);
    if (offset >= c.dur) return;
    const src = this.ctx.createBufferSource(); src.buffer = c.buffer;
    if (!this.analyser) { this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024; this.freq = new Uint8Array(this.analyser.frequencyBinCount); }
    const g = this.ctx.createGain(); g.gain.value = 0.9;
    src.connect(g); g.connect(this.out); g.connect(this.analyser);
    src.start(Math.max(now, startAt), offset);
    this.customSrc = src;
  }
  // low-band energy of the custom track, 0..1, for light pulses
  energy() {
    if (!this.analyser || !this.customSrc) return 0;
    this.analyser.getByteFrequencyData(this.freq);
    let s = 0; for (let i = 1; i < 12; i++) s += this.freq[i];
    return s / (11 * 255);
  }
  stopCustom() { if (this.customSrc) { try { this.customSrc.stop(); } catch (e) { /* stopped */ } this.customSrc = null; } }

  tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.25;
    if (this.mode === 'lobby') {
      while (this.lobbyNext < ahead) { this.lobbyEvent(this.lobbyStep, this.lobbyNext); this.lobbyStep++; this.lobbyNext += LOBBY_STEP; }
    } else if (this.mode === 'show') {
      while (this.ptr < this.events.length) {
        const e = this.events[this.ptr], t = this.showT0 + e[0];
        if (t >= ahead) break;
        this.ptr++;
        const quiet = this.inCustom(e[0]) && e[1] !== 'waves' && e[1] !== 'rain' && e[1] !== 'crackle';
        if (!quiet && t >= now - 0.05) this.play(e, Math.max(t, now));
      }
    }
  }

  play(e, t) {
    const [, kind, a, b, c, d] = e;
    switch (kind) {
      case 'pno': (Array.isArray(a) ? a : [a]).forEach(m => this.piano(m, t, b, c)); break;
      case 'str': this.strings(a, t, b, c, d); break;
      case 'lead': this.lead(a, t, b, c); break;
      case 'flute': this.flute(a, t, b, c); break;
      case 'bass': this.bass(a, t, b, c); break;
      case 'harp': this.harp(a, t, b); break;
      case 'bell': this.bell(a, t, b); break;
      case 'timp': this.timp(t, a); break;
      case 'crash': this.crash(t, a); break;
      case 'swell': this.swell(t, a, b); break;
      case 'boom': this.boom(t, a); break;
      case 'crackle': this.crackle(t, a); break;
      case 'rain': this.ambience.push(this.rain(t, a)); break;
      case 'waves': this.ambience.push(this.waves(t, a, 0.07)); break;
      case 'horn': this.horn(t, a, b); break;
    }
  }

  lobbyEvent(s, t) {
    const ch = LOBBY_CHORDS[Math.floor(s / 16) % 4];
    if (s % 16 === 0) { this.strings(ch, t, LOBBY_STEP * 16, 0.028, 850); this.bass(ch[0] - 24, t, LOBBY_STEP * 14, 0.12); }
    if (Math.random() < 0.24) this.piano(PENTA[Math.floor(Math.random() * PENTA.length)], t, 2.5, 0.12);
  }

  /* ---------- helpers ---------- */
  send(node, wet) {
    node.connect(this.out);
    if (wet) { const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.rev); }
  }
  adsr(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + rel);
    return t + Math.max(a, dur) + rel;
  }
  noise(t, dur, loop) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = !!loop;
    if (loop) src.start(t); else src.start(t, Math.random() * 2, dur + 0.05);
    return src;
  }
  vibrato(t, rate, cents, delay) {
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = rate;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cents, t + delay + 0.3);
    lfo.connect(g); lfo.start(t);
    return { node: g, lfo };
  }

  /* ---------- instruments ---------- */
  piano(m, t, dur, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.setPeriodicWave(this.pianoWave); o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.setPeriodicWave(this.pianoWave); o2.frequency.value = mtof(m); o2.detune.value = 4;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(1400, t + 1.2);
    const g = ctx.createGain();
    const decay = Math.min(5, 1.4 + (84 - m) * 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * 0.5 * 0.35, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(decay, dur + 0.6) + 0.4);
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); this.send(g, 0.45);
    const end = t + Math.min(decay, dur + 0.6) + 0.5;
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }
  strings(notes, t, dur, vel, cutoff) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1300; f.Q.value = 0.5;
    const g = ctx.createGain();
    const a = Math.min(0.9, dur * 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + a);
    g.gain.setValueAtTime(vel, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
    f.connect(g); this.send(g, 0.65);
    const vib = this.vibrato(t, 5, 6, 0.2);
    notes.forEach(m => [-7, 7].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      vib.node.connect(o.detune);
      o.connect(f); o.start(t); o.stop(t + dur + 1.3);
    }));
    vib.lfo.stop(t + dur + 1.3);
  }
  lead(m, t, dur, vel) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2800; f.Q.value = 0.8;
    const g = ctx.createGain(); const end = this.adsr(g, t, 0.09, vel, dur, 0.35);
    f.connect(g); this.send(g, 0.5);
    const vib = this.vibrato(t, 5.6, 10, 0.25);
    [-6, 6].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      vib.node.connect(o.detune); o.connect(f); o.start(t); o.stop(end + 0.05);
    });
    vib.lfo.stop(end + 0.05);
  }
  flute(m, t, dur, vel) {
    const ctx = this.ctx;
    const g = ctx.createGain(); const end = this.adsr(g, t, 0.07, vel, dur, 0.25);
    this.send(g, 0.5);
    const vib = this.vibrato(t, 5, 12, 0.2);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(m) * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    vib.node.connect(o.detune); vib.node.connect(o2.detune);
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(end + 0.05); o2.stop(end + 0.05); vib.lfo.stop(end + 0.05);
  }
  bass(m, t, dur, vel) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    const g = ctx.createGain(); const end = this.adsr(g, t, 0.05, vel, dur, 0.4);
    f.connect(g); this.send(g, 0.2);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(m);
    const g2 = ctx.createGain(); g2.gain.value = 0.6;
    o.connect(f); o2.connect(g2); g2.connect(f);
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }
  harp(m, t, vel) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3600;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    f.connect(g); this.send(g, 0.55);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(m) * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2); g2.connect(f);
    o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9);
  }
  bell(m, t, vel) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    this.send(g, 0.6);
    [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([r, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m) * r;
      const ga = ctx.createGain(); ga.gain.value = a; o.connect(ga); ga.connect(g);
      o.start(t); o.stop(t + 2.7);
    });
  }
  timp(t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(98, t); o.frequency.exponentialRampToValueAtTime(82, t + 0.4);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); this.send(g, 0.4); o.start(t); o.stop(t + 1.7);
    const n = this.noise(t, 0.2), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(vel * 0.4, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(f); f.connect(g2); this.send(g2, 0.3);
  }
  crash(t, vel) {
    const ctx = this.ctx;
    const n = this.noise(t, 3), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    n.connect(f); f.connect(g); this.send(g, 0.5);
  }
  swell(t, dur, vel) {
    const ctx = this.ctx;
    const n = this.noise(t, dur), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(f); f.connect(g); this.send(g, 0.5);
  }
  boom(t, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(85, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g); this.send(g, 0.4); o.start(t); o.stop(t + 1.5);
    const n = this.noise(t, 1.2), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(vel * 0.35, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    n.connect(f); f.connect(g2); this.send(g2, 0.6);
  }
  crackle(t, dur) {
    const ctx = this.ctx;
    const count = Math.floor(dur * 9);
    for (let k = 0; k < count; k++) {
      const tt = t + Math.random() * dur, n = this.noise(tt, 0.03);
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000 + Math.random() * 4000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.03 + Math.random() * 0.05, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.025);
      n.connect(f); f.connect(g); this.send(g, 0.6);
    }
  }
  rain(t, dur) {
    const ctx = this.ctx;
    const src = this.noise(t, dur, true);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 4);
    g.gain.setValueAtTime(0.09, t + Math.max(4, dur - 5)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); this.send(g, 0.3);
    src.stop(t + dur + 0.1);
    return { src, g };
  }
  horn(t, dur, vel) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 1.2;
    const g = ctx.createGain(); const end = this.adsr(g, t, 0.35, vel, dur, 1.4);
    f.connect(g); this.send(g, 0.7);
    [[45, -6], [45, 6], [52, 0], [33, 0]].forEach(([m, dt]) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(f); o.start(t); o.stop(end);
    });
  }
  waves(t, dur, vol) {
    const ctx = this.ctx;
    const src = this.noise(t, dur, true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 3);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = vol * 0.7;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); this.send(g, 0.2);
    lfo.start(t); src.stop(t + dur); lfo.stop(t + dur);
    return { src, g };
  }
}
