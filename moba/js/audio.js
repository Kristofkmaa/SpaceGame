// ============ Son synthétisé (WebAudio) ============
class GameAudio {
  constructor() { this.ctx = null; this.volume = 0.6; this.musicOn = true; this.last = {}; this.listener = { x: 0, y: 0, zoom: 1 }; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = this.musicOn ? 1 : 0; this.music.connect(this.master);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.5); }
  startAmbient() {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.07, t, 4);
    n.connect(f); f.connect(g); g.connect(this.music); n.start(t);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 41; const og = c.createGain(); og.gain.value = 0.045; o.connect(og); og.connect(this.music); o.start(t);
    // Percussion lointaine et métallique
    this.drumTimer = setInterval(() => { if (this.musicOn && this.ctx.state === 'running') this.drum(); }, 2400);
  }
  drum() {
    const c = this.ctx, t = c.currentTime;
    for (const [dt, f, v] of [[0, 70, 0.09], [0.6, 70, 0.06], [1.2, 95, 0.05], [1.5, 70, 0.07]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t + dt); o.frequency.exponentialRampToValueAtTime(35, t + dt + 0.3);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(v, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.4);
      o.connect(g); g.connect(this.music); o.start(t + dt); o.stop(t + dt + 0.5);
    }
  }
  gainFor(x, y) { if (x == null) return 1; const d = Utils.dist(x, y, this.listener.x, this.listener.y) * this.listener.zoom; return Utils.clamp(1 - d / 1300, 0, 1); }
  play(name, x, y) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const vol = this.gainFor(x, y); if (vol <= 0.02) return;
    const now = performance.now(), gap = { rifle: 60, dart: 60, sparkShot: 60, flameShot: 60, hammer: 60, swipe: 60, clank: 90, bow: 90, tower: 100, gold: 40, volley: 90, thud: 60, death: 100 }[name] || 40;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const c = this.ctx, t = c.currentTime, out = c.createGain(); out.connect(this.sfx);
    const env = (g, peak, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const osc = (type, f0, f1, dur, peak, delay = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + delay + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur); o.connect(g); g.connect(out); o.start(t + delay); o.stop(t + delay + dur + 0.05); };
    const noise = (dur, peak, f0, f1, type = 'lowpass', q = 1) => { const n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); const g = c.createGain(); env(g, peak * vol, 0.004, dur); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.05); };
    switch (name) {
      case 'rifle': noise(0.12, 0.2, 2400, 500, 'bandpass', 1.2); osc('square', 200, 80, 0.08, 0.06); break;
      case 'shotgun': noise(0.35, 0.4, 2000, 150); osc('sine', 120, 40, 0.25, 0.25); break;
      case 'dart': noise(0.06, 0.08, 4000, 2500, 'highpass'); break;
      case 'sparkShot': osc('sawtooth', 1600, 400, 0.1, 0.05); noise(0.05, 0.06, 6000, 3000, 'highpass'); break;
      case 'hammer': noise(0.12, 0.2, 900, 200); osc('sine', 140, 60, 0.12, 0.16); break;
      case 'clank': noise(0.05, 0.05, 3000, 1500, 'bandpass', 4); break;
      case 'bow': noise(0.05, 0.05, 1500, 900, 'bandpass', 3); break;
      case 'tower': osc('sawtooth', 380, 90, 0.25, 0.08); noise(0.2, 0.12, 1200, 300); break;
      case 'thud': noise(0.25, 0.35, 700, 80); osc('sine', 90, 40, 0.25, 0.3); break;
      case 'dash': case 'roll': noise(0.3, 0.12, 400, 2000, 'bandpass', 0.8); break;
      case 'metal': osc('triangle', 900, 700, 0.3, 0.07); osc('triangle', 1350, 1100, 0.25, 0.05, 0.03); break;
      case 'quake': noise(0.7, 0.45, 500, 40); osc('sine', 60, 25, 0.6, 0.35); break;
      case 'engine': { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, t); o.frequency.linearRampToValueAtTime(90, t + 0.6); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); env(g, 0.25 * vol, 0.05, 0.7); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.8); break; }
      case 'trap': osc('square', 600, 120, 0.12, 0.1); noise(0.15, 0.25, 3000, 800, 'bandpass', 2); break;
      case 'dig': noise(0.2, 0.08, 600, 300); break;
      case 'volley': noise(0.16, 0.18, 2200, 600, 'bandpass', 1); break;
      case 'syringe': noise(0.1, 0.08, 3000, 1800, 'highpass'); osc('sine', 1200, 1600, 0.08, 0.03); break;
      case 'heal': osc('sine', 660, 880, 0.2, 0.06); osc('sine', 990, 1320, 0.25, 0.04, 0.08); break;
      case 'glass': noise(0.25, 0.15, 6000, 2500, 'highpass'); osc('triangle', 2400, 1800, 0.1, 0.04); break;
      case 'stim': [523, 659, 784].forEach((f, i) => osc('sine', f, f * 1.02, 0.35, 0.06, i * 0.07)); break;
      case 'zap': osc('sawtooth', 1800, 300, 0.2, 0.08); noise(0.15, 0.12, 5000, 1500, 'bandpass', 2); break;
      case 'emp': osc('sine', 300, 60, 0.4, 0.2); noise(0.3, 0.2, 4000, 400, 'bandpass', 1); break;
      case 'throw': noise(0.15, 0.06, 800, 1600, 'bandpass', 1); break;
      case 'blink': osc('sine', 300, 1800, 0.18, 0.08); break;
      case 'charge': osc('sawtooth', 80, 400, 0.5, 0.05); break;
      case 'thunder': noise(0.8, 0.45, 3000, 60); osc('sine', 70, 30, 0.6, 0.25); break;
      case 'horn': { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.linearRampToValueAtTime(116, t + 1.6); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.2); g.gain.setValueAtTime(0.18, t + 1.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 1.9); break; }
      case 'gold': osc('triangle', 1800, 2400, 0.06, 0.04); osc('triangle', 2400, 2800, 0.08, 0.03, 0.05); break;
      case 'explosion': noise(0.6, 0.35, 2500, 80); osc('sine', 110, 35, 0.5, 0.2); break;
      case 'towerFall': noise(1.6, 0.55, 2000, 40); osc('sine', 60, 22, 1.5, 0.4); break;
      case 'coreFall': noise(3.0, 0.7, 1800, 30); osc('sine', 50, 18, 2.8, 0.5); break;
      case 'levelup': [392, 523, 659, 784].forEach((f, i) => osc('square', f, f, 0.12, 0.05, i * 0.08)); break;
      case 'skillUp': osc('square', 660, 990, 0.1, 0.05); break;
      case 'death': osc('sawtooth', 300, 60, 0.8, 0.1); break;
      case 'respawn': osc('sine', 200, 800, 0.6, 0.1); break;
      case 'recall': osc('sine', 300, 600, 1.5, 0.05); break;
      case 'recallEnd': osc('sine', 600, 1200, 0.3, 0.08); break;
      case 'buy': osc('triangle', 1200, 1200, 0.05, 0.05); osc('triangle', 1600, 1600, 0.08, 0.05, 0.06); break;
      case 'error': osc('square', 160, 120, 0.15, 0.06); break;
      case 'click': noise(0.03, 0.08, 3000, 2000, 'bandpass', 3); break;
      case 'gong': osc('triangle', 220, 210, 0.9, 0.12); osc('sine', 440, 430, 0.6, 0.06); noise(0.1, 0.15, 3000, 1000, 'bandpass', 2); break;
      case 'growl': { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t + 0.4); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = c.createGain(); env(g, 0.12 * vol, 0.03, 0.4); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5); break; }
      case 'swipe': noise(0.15, 0.18, 4000, 900, 'bandpass', 1.5); break;
      case 'flame': noise(0.6, 0.3, 900, 300, 'lowpass', 0.7); break;
      case 'flameShot': noise(0.15, 0.12, 1400, 500, 'lowpass', 0.7); break;
      case 'spring': osc('sine', 200, 900, 0.25, 0.08); osc('sine', 900, 300, 0.2, 0.05, 0.2); break;
      case 'build': noise(0.05, 0.14, 3500, 2500, 'bandpass', 5); osc('triangle', 1800, 1800, 0.08, 0.05, 0.1); break;
      case 'announceGood': [523, 784].forEach((f, i) => osc('sawtooth', f, f, 0.3, 0.05, i * 0.15)); break;
      case 'announceBad': [392, 294].forEach((f, i) => osc('sawtooth', f, f, 0.35, 0.05, i * 0.18)); break;
    }
  }
}
