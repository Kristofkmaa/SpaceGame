// ============ Son synthétisé (WebAudio) : ambiance et effets ============
class GameAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
    this.musicOn = true;
    this.last = {};
    this.listener = { x: 0, y: 0, zoom: 1 };
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = this.musicOn ? 1 : 0; this.music.connect(this.master);
    // Tampon de bruit blanc
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.5); }

  // Nappe sombre : deux oscillateurs désaccordés filtrés, respiration lente
  startAmbient() {
    const c = this.ctx, t = c.currentTime;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 180; filt.Q.value = 2;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.045;
    const lfoG = c.createGain(); lfoG.gain.value = 90;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start(t);
    const g = c.createGain(); g.gain.value = 0.0; g.gain.setTargetAtTime(0.11, t, 4);
    filt.connect(g); g.connect(this.music);
    for (const [type, f] of [['sawtooth', 55], ['sawtooth', 55.4], ['sine', 110.2], ['triangle', 27.5]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(filt); o.start(t);
    }
    // Scintillement aigu très discret
    const hi = c.createOscillator(); hi.type = 'sine'; hi.frequency.value = 1318.5;
    const hiG = c.createGain(); hiG.gain.value = 0;
    const hiL = c.createOscillator(); hiL.frequency.value = 0.07;
    const hiLG = c.createGain(); hiLG.gain.value = 0.012;
    hiL.connect(hiLG); hiLG.connect(hiG.gain); hiL.start(t);
    hi.connect(hiG); hiG.connect(this.music); hi.start(t);
  }

  gainFor(x, y) {
    if (x == null) return 1;
    const d = Utils.dist(x, y, this.listener.x, this.listener.y) * this.listener.zoom;
    return Utils.clamp(1 - d / 1400, 0.08, 1);
  }

  play(name, x, y) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    const minGap = { laser: 45, flak: 35, missile: 80, plasma: 120, ion: 200, explosion: 60, bigExplosion: 300, click: 30 }[name] || 50;
    if (this.last[name] && now - this.last[name] < minGap) return;
    this.last[name] = now;
    const vol = this.gainFor(x, y);
    const c = this.ctx, t = c.currentTime;
    const out = c.createGain(); out.connect(this.sfx);
    const env = (g, peak, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const osc = (type, f0, f1, dur, peak) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = c.createGain(); env(g, peak * vol, 0.005, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); };
    const noise = (dur, peak, f0, f1, type = 'lowpass', q = 1) => { const n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); const g = c.createGain(); env(g, peak * vol, 0.005, dur); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.05); };
    switch (name) {
      case 'laser': osc('square', 1400, 420, 0.08, 0.07); break;
      case 'flak': noise(0.06, 0.09, 2500, 800, 'bandpass', 2); osc('triangle', 600, 200, 0.05, 0.05); break;
      case 'missile': noise(0.35, 0.09, 900, 200, 'bandpass', 1.5); osc('sine', 320, 90, 0.3, 0.06); break;
      case 'plasma': osc('sine', 170, 50, 0.45, 0.2); noise(0.2, 0.08, 600, 100); break;
      case 'ion': { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.25); f.frequency.exponentialRampToValueAtTime(200, t + 0.7); const g = c.createGain(); env(g, 0.14 * vol, 0.03, 0.7); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.8); break; }
      case 'explosion': noise(0.5, 0.28, 3000, 90); osc('sine', 120, 35, 0.4, 0.15); break;
      case 'bigExplosion': noise(1.6, 0.5, 2500, 50); osc('sine', 70, 25, 1.4, 0.35); noise(0.3, 0.3, 6000, 1000, 'highpass'); break;
      case 'click': osc('sine', 1500, 1200, 0.03, 0.06); break;
      case 'confirm': osc('sine', 660, 660, 0.06, 0.06); setTimeout(() => this.playRaw('sine', 990, 0.07, 0.06), 60); break;
      case 'error': osc('square', 160, 120, 0.14, 0.06); break;
      case 'select': osc('sine', 880, 1100, 0.05, 0.05); break;
      case 'alert': osc('triangle', 440, 440, 0.12, 0.12); setTimeout(() => this.playRaw('triangle', 330, 0.25, 0.12), 150); break;
      case 'research': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playRaw('sine', f, 0.3, 0.08), i * 110)); break;
      case 'hyperspace': { osc('sine', 90, 1500, 1.8, 0.22); noise(2.0, 0.14, 300, 6000, 'highpass'); break; }
      case 'build': osc('triangle', 300, 520, 0.12, 0.07); break;
      case 'deposit': osc('sine', 1200, 1800, 0.05, 0.03); break;
    }
  }

  playRaw(type, f, dur, peak) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
}
