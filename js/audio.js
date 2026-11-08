// ============ Son synthétisé (WebAudio) : vent des Terres désolées et effets ============
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
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.5); }

  // Vent : bruit filtré dont la hauteur et le volume respirent lentement, plus une basse sourde
  startAmbient() {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.09, t, 4);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.11; const lg2 = c.createGain(); lg2.gain.value = 0.035; lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start(t);
    n.connect(f); f.connect(g); g.connect(this.music); n.start(t);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 38; const og = c.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(this.music); o.start(t);
    this.stormGain = c.createGain(); this.stormGain.gain.value = 0;
    const sn = c.createBufferSource(); sn.buffer = this.noise; sn.loop = true; const sf = c.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 900;
    sn.connect(sf); sf.connect(this.stormGain); this.stormGain.connect(this.music); sn.start(t);
  }
  setStorm(on) { if (this.stormGain) this.stormGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 3); }

  gainFor(x, y) { if (x == null) return 1; const d = Utils.dist(x, y, this.listener.x, this.listener.y) * this.listener.zoom; return Utils.clamp(1 - d / 1400, 0.08, 1); }

  play(name, x, y) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    const minGap = { mg: 40, hmg: 35, cannon: 90, rocket: 70, arty: 150, explosion: 60, bigExplosion: 300, click: 30, deposit: 100 }[name] || 50;
    if (this.last[name] && now - this.last[name] < minGap) return;
    this.last[name] = now;
    const vol = this.gainFor(x, y), c = this.ctx, t = c.currentTime;
    const out = c.createGain(); out.connect(this.sfx);
    const env = (g, peak, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const osc = (type, f0, f1, dur, peak) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = c.createGain(); env(g, peak * vol, 0.005, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); };
    const noise = (dur, peak, f0, f1, type = 'lowpass', q = 1) => { const n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); const g = c.createGain(); env(g, peak * vol, 0.004, dur); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.05); };
    switch (name) {
      case 'mg': noise(0.05, 0.12, 2200, 900, 'bandpass', 1.5); osc('square', 420, 180, 0.04, 0.05); break;
      case 'hmg': noise(0.07, 0.16, 1500, 500, 'bandpass', 1.2); osc('square', 260, 110, 0.06, 0.07); break;
      case 'cannon': noise(0.3, 0.3, 1400, 150); osc('sine', 170, 45, 0.3, 0.22); break;
      case 'rocket': noise(0.55, 0.14, 900, 250, 'bandpass', 1.2); osc('sawtooth', 300, 120, 0.4, 0.05); break;
      case 'arty': noise(0.7, 0.45, 800, 60); osc('sine', 95, 28, 0.7, 0.35); noise(0.12, 0.25, 5000, 1500, 'highpass'); break;
      case 'explosion': noise(0.5, 0.3, 2500, 90); osc('sine', 120, 35, 0.4, 0.15); break;
      case 'bigExplosion': noise(1.7, 0.5, 2000, 45); osc('sine', 65, 22, 1.5, 0.35); noise(0.3, 0.3, 6000, 1000, 'highpass'); break;
      case 'click': noise(0.03, 0.08, 3000, 2000, 'bandpass', 3); break;
      case 'confirm': osc('square', 520, 520, 0.05, 0.04); setTimeout(() => this.playRaw('square', 780, 0.07, 0.04), 70); break;
      case 'error': osc('square', 140, 100, 0.16, 0.06); break;
      case 'select': noise(0.04, 0.07, 2600, 1800, 'bandpass', 4); break;
      case 'alert': osc('sawtooth', 480, 720, 0.5, 0.07); setTimeout(() => this.playRaw('sawtooth', 720, 0.5, 0.07, 480), 500); break;
      case 'research': [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playRaw('square', f, 0.18, 0.05), i * 120)); break;
      case 'radio': noise(0.08, 0.05, 1800, 1200, 'bandpass', 2); osc('square', 1200, 1200, 0.03, 0.02); break;
      case 'arrive': { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(30, t); o.frequency.linearRampToValueAtTime(70, t + 2.4); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 3.3); noise(3.0, 0.12, 400, 120); break; }
      case 'build': noise(0.05, 0.14, 3500, 2500, 'bandpass', 5); setTimeout(() => this.playRaw('triangle', 1800, 0.08, 0.05), 110); break;
      case 'deposit': osc('triangle', 2400, 1800, 0.06, 0.04); break;
      case 'storm': noise(2.5, 0.2, 300, 1200); break;
    }
  }
  playRaw(type, f, dur, peak, f1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
}
