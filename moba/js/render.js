// ============ Rendu : arène, unités, effets, barres, indicateurs, minimap ============
const MapArt = {
  groundTile(size = 512, seed = 3) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), rnd = Utils.seeded(seed);
    ctx.fillStyle = '#7b6648'; ctx.fillRect(0, 0, size, size);
    const blob = (x, y, r, col) => { for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } };
    for (let i = 0; i < 40; i++) blob(rnd() * size, rnd() * size, 60 + rnd() * 140, rnd() > 0.5 ? 'rgba(150,126,90,0.35)' : 'rgba(90,72,50,0.35)');
    for (let i = 0; i < 700; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(60,48,34,0.35)' : 'rgba(180,160,120,0.25)'; const s = 1 + rnd() * 2.2; ctx.fillRect(rnd() * size, rnd() * size, s, s); }
    ctx.strokeStyle = 'rgba(50,38,26,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) { let x = rnd() * size, y = rnd() * size; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 70; ctx.lineTo(x, y); } ctx.stroke(); }
    return c;
  },
  build() {
    const W = CONFIG.W, H = CONFIG.H, half = CONFIG.LANE_HALF, lane = MAP.lane, rnd = Utils.seeded(42);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const pat = ctx.createPattern(MapArt.groundTile(), 'repeat');
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    // Hors‑piste : terre plus sombre, dunes, ruines
    ctx.fillStyle = 'rgba(28,18,10,0.5)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 260;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rnd() > 0.5 ? 'rgba(160,120,80,0.18)' : 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const offLane = (x, y, m) => lane.project(x, y).d > half + m && !MAP.bases.some(b => Utils.dist(x, y, b.x, b.y) < CONFIG.BASE_R + m);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * H, w = 70 + rnd() * 150, h = 50 + rnd() * 110;
      if (!offLane(x, y, 140)) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * 0.6 - 0.3);
      ctx.fillStyle = 'rgba(20,14,8,0.4)'; ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
      ctx.fillStyle = '#625a4e'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#857c6c'; ctx.lineWidth = 6; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#4a4238'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-w / 2 + w * rnd(), -h / 2); ctx.lineTo(-w / 2 + w * rnd(), h / 2); ctx.stroke();
      ctx.fillStyle = '#3e372e'; for (let k = 0; k < 4; k++) ctx.fillRect(-w / 2 + rnd() * w * 0.8, -h / 2 + rnd() * h * 0.8, 10 + rnd() * 16, 8 + rnd() * 10);
      ctx.restore();
    }
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 60;
      if (!offLane(x, y, 60)) continue;
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(25,18,10,0.7)'); g.addColorStop(1, 'rgba(25,18,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Voie praticable
    const path = () => { ctx.beginPath(); lane.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = half * 2 + 30; ctx.stroke();
    path(); ctx.strokeStyle = pat; ctx.lineWidth = half * 2; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,220,170,0.07)'; ctx.stroke();
    for (const b of MAP.bases) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, CONFIG.BASE_R + 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pat; ctx.beginPath(); ctx.arc(b.x, b.y, CONFIG.BASE_R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,170,0.07)'; ctx.fill();
    }
    // Ancienne route goudronnée
    path(); ctx.strokeStyle = '#3d3832'; ctx.lineWidth = 120; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(90,82,70,0.35)'; ctx.lineWidth = 110; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(220,190,110,0.28)'; ctx.lineWidth = 3; ctx.setLineDash([30, 34]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(30,24,18,0.55)'; ctx.lineWidth = 1.5;
    for (let s = 60; s < lane.L; s += 40) {
      const p = lane.point(s), off = (rnd() - 0.5) * 100;
      ctx.beginPath(); let x = p.x + p.nx * off, y = p.y + p.ny * off; ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,130,90,0.5)';
    for (let s = 0; s < lane.L; s += 18) { const p = lane.point(s); for (const side of [-1, 1]) if (rnd() > 0.4) { const o = side * (60 + rnd() * 30); ctx.fillRect(p.x + p.nx * o, p.y + p.ny * o, 3 + rnd() * 5, 3 + rnd() * 4); } }
    // Bords de voie : blocs de béton, pneus, épaves
    for (let s = 380; s < lane.L - 380; s += 60 + rnd() * 50) {
      const p = lane.point(s);
      for (const side of [-1, 1]) {
        const o = side * (half + 18 + rnd() * 20), x = p.x + p.nx * o, y = p.y + p.ny * o, r = rnd();
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle + (rnd() - 0.5) * 0.5);
        if (r < 0.45) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-26, -9, 56, 22); ctx.fillStyle = '#9a9283'; ctx.fillRect(-28, -11, 56, 22); ctx.fillStyle = '#b4ab9a'; ctx.fillRect(-28, -11, 56, 7); ctx.fillStyle = '#c9a24a'; ctx.fillRect(-12, -4, 6, 14); ctx.fillRect(6, -4, 6, 14); }
        else if (r < 0.7) { for (const [dx, dy] of [[0, 0], [16, 4], [7, -12]]) { ctx.fillStyle = '#1e1b17'; ctx.beginPath(); ctx.arc(dx, dy, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3e3a33'; ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); } }
        else if (r < 0.88) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-36, -14, 80, 36); ctx.fillStyle = '#6e4630'; ctx.fillRect(-40, -18, 80, 36); ctx.fillStyle = '#4a2e1e'; ctx.fillRect(-16, -16, 34, 32); ctx.fillStyle = '#2a2420'; ctx.fillRect(-36, -20, 12, 6); ctx.fillRect(24, -20, 12, 6); ctx.fillRect(-36, 14, 12, 6); ctx.fillRect(24, 14, 12, 6); ctx.fillStyle = 'rgba(160,90,40,0.6)'; ctx.fillRect(-30, -10, 10, 8); }
        else { ctx.fillStyle = '#5a5046'; ctx.beginPath(); ctx.moveTo(-24, 10); ctx.lineTo(-10, -16); ctx.lineTo(8, -10); ctx.lineTo(26, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-8, -4, 14, 8); }
        ctx.restore();
      }
    }
    // Bases : enceintes, tentes, caisses
    MAP.bases.forEach((b, team) => {
      const col = TEAM_INFO[team], open = MAP.lane.point(team === 0 ? 0 : lane.L).angle + (team === 0 ? 0 : Math.PI);
      for (let i = 0; i < 40; i++) {
        const a = open + 0.55 + i / 40 * (Math.PI * 2 - 1.1);
        const x = b.x + Math.cos(a) * (CONFIG.BASE_R + 8), y = b.y + Math.sin(a) * (CONFIG.BASE_R + 8);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-30, -6, 62, 22);
        ctx.fillStyle = i % 5 === 0 ? '#5a4a3a' : '#7d7466'; ctx.fillRect(-32, -10, 64, 20);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-32, 4, 64, 6);
        if (i % 5 === 0) { ctx.fillStyle = col.color; ctx.fillRect(-6, -10, 12, 20); }
        ctx.restore();
      }
      for (let k = 0; k < 4; k++) {
        const a = open + Math.PI + (k - 1.5) * 0.55, d = CONFIG.BASE_R * 0.62;
        const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-26, -20, 60, 50);
        ctx.fillStyle = '#7a7058'; ctx.beginPath(); ctx.moveTo(-30, -24); ctx.lineTo(30, -24); ctx.lineTo(30, 24); ctx.lineTo(-30, 24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#625944'; ctx.fillRect(-30, -2, 60, 4);
        ctx.fillStyle = col.dark; ctx.fillRect(-30, -24, 10, 48);
        ctx.restore();
      }
      for (let k = 0; k < 8; k++) {
        const a = rnd() * Math.PI * 2, d = 120 + rnd() * 180, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
        if (Utils.dist(x, y, MAP.fountains[team].x, MAP.fountains[team].y) < CONFIG.FOUNTAIN_R + 30 || lane.project(x, y).d < 80) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 10, y - 8, 26, 24); ctx.fillStyle = '#8a6a44'; ctx.fillRect(x - 13, y - 13, 26, 26); ctx.strokeStyle = '#5a442a'; ctx.lineWidth = 2; ctx.strokeRect(x - 13, y - 13, 26, 26); ctx.beginPath(); ctx.moveTo(x - 13, y - 13); ctx.lineTo(x + 13, y + 13); ctx.stroke();
      }
    });
    return c;
  },
};

class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.game = null; this.map = null; this.settings = { damageNumbers: true };
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  setGame(g) { this.game = g; if (!this.map) { MAP.init(); this.map = MapArt.build(); } }
  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
  toScreen(x, y) { const c = this.game.camera; return { x: (x - c.x) * c.zoom + this.canvas.width / 2, y: (y - c.y) * c.zoom + this.canvas.height / 2 }; }
  toWorld(x, y) { const c = this.game.camera; return { x: (x - this.canvas.width / 2) / c.zoom + c.x, y: (y - this.canvas.height / 2) / c.zoom + c.y }; }
  viewRect() { const a = this.toWorld(0, 0), b = this.toWorld(this.canvas.width, this.canvas.height); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }
  vis(x, y, m, v) { return x > v.x1 - m && x < v.x2 + m && y > v.y1 - m && y < v.y2 + m; }

  render(input) {
    const ctx = this.ctx, g = this.game, w = this.canvas.width, h = this.canvas.height, cam = g.camera, t = g.time;
    ctx.fillStyle = '#1e150e'; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    const v = this.viewRect();
    const sx = Math.max(0, Math.floor(v.x1)), sy = Math.max(0, Math.floor(v.y1)), ex = Math.min(CONFIG.W, Math.ceil(v.x2)), ey = Math.min(CONFIG.H, Math.ceil(v.y2));
    if (ex > sx && ey > sy) ctx.drawImage(this.map, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    this.drawFountains(v);
    for (const r of g.rubble) if (this.vis(r.x, r.y, 150, v)) this.drawRubble(r);
    for (const e of g.effects) if (e.type === 'heroDeath' || e.type === 'death') this.drawEffect(e);
    for (const z of g.zones) if (this.vis(z.x, z.y, z.r + 50, v)) this.drawZone(z);
    this.drawGroundRings(v);
    this.drawIndicators(input);
    // Unités triées par profondeur
    const list = [];
    for (const s of g.towers) if (!s.dead && this.vis(s.x, s.y, 120, v)) list.push(s);
    for (const s of g.cores) if (!s.dead && this.vis(s.x, s.y, 150, v)) list.push(s);
    for (const m of g.minions) if (this.vis(m.x, m.y, 40, v)) list.push(m);
    for (const hh of g.heroes) if (!hh.dead && this.vis(hh.x, hh.y, 60, v)) list.push(hh);
    list.sort((a, b) => a.y - b.y);
    for (const u of list) this.drawUnit(u);
    for (const p of g.projectiles) if (this.vis(p.x, p.y, 40, v)) this.drawProjectile(p);
    for (const e of g.effects) if (e.type !== 'heroDeath' && e.type !== 'death') this.drawEffect(e);
    this.drawTowerWarnings();
    ctx.restore();
    this.drawBars(list);
    if (this.settings.damageNumbers) this.drawFloats();
    this.drawVignette();
    if (g.player.dead) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, w, h); ctx.restore(); ctx.fillStyle = 'rgba(10,6,4,0.25)'; ctx.fillRect(0, 0, w, h); }
    if (input.hover) this.canvas.style.cursor = 'crosshair'; else this.canvas.style.cursor = 'default';
  }

  drawFountains(v) {
    const ctx = this.ctx, t = this.game.time;
    MAP.fountains.forEach((f, team) => {
      if (!this.vis(f.x, f.y, CONFIG.FOUNTAIN_R + 80, v)) return;
      const col = TEAM_INFO[team];
      const g = ctx.createRadialGradient(f.x, f.y, 40, f.x, f.y, CONFIG.FOUNTAIN_R);
      g.addColorStop(0, Utils.rgba(col.color, 0.2)); g.addColorStop(0.85, Utils.rgba(col.color, 0.12 + 0.05 * Math.sin(t * 2))); g.addColorStop(1, Utils.rgba(col.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, CONFIG.FOUNTAIN_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = Utils.rgba(col.color, 0.45); ctx.lineWidth = 2; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.arc(f.x, f.y, CONFIG.FOUNTAIN_R, t * 0.1, t * 0.1 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // Château d'eau
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(f.x + 14, f.y + 18, 62, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy] of [[-44, -44], [44, -44], [-44, 44], [44, 44]]) { ctx.fillStyle = '#4a3a2a'; ctx.fillRect(f.x + dx - 5, f.y + dy - 5, 10, 10); }
      ctx.fillStyle = '#6f7a7e'; ctx.beginPath(); ctx.arc(f.x, f.y, 58, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4c5558'; ctx.lineWidth = 4; ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20); ctx.lineTo(f.x + Math.cos(a) * 56, f.y + Math.sin(a) * 56); ctx.stroke(); }
      const w2 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 22); w2.addColorStop(0, col.light); w2.addColorStop(1, col.color);
      ctx.fillStyle = w2; ctx.beginPath(); ctx.arc(f.x, f.y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col.color; ctx.fillRect(f.x - 58, f.y - 6, 14, 12);
      for (let i = 0; i < 6; i++) { const k = ((t * 0.4 + i / 6) % 1), a = i * 1.7; ctx.fillStyle = Utils.rgba(col.light, (1 - k) * 0.7); ctx.fillRect(f.x + Math.cos(a) * (80 + i * 18), f.y + Math.sin(a) * (80 + i * 18) - k * 40, 3, 3); }
    });
  }
  drawRubble(r) {
    const ctx = this.ctx, rnd = Utils.seeded(Math.floor(r.seed * 1e6));
    const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r * 1.8); g.addColorStop(0, 'rgba(15,10,6,0.85)'); g.addColorStop(1, 'rgba(15,10,6,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 1.8, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, d = rnd() * r.r * 1.3; ctx.fillStyle = rnd() > 0.5 ? '#6f685c' : '#4a443a'; ctx.save(); ctx.translate(r.x + Math.cos(a) * d, r.y + Math.sin(a) * d); ctx.rotate(rnd() * 3); ctx.fillRect(-6 - rnd() * 8, -4, 12 + rnd() * 10, 8 + rnd() * 6); ctx.restore(); }
    const k = (this.game.time * 0.3 + r.seed) % 1;
    ctx.fillStyle = `rgba(60,50,42,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(r.x + Math.sin(k * 6) * 8, r.y - k * 60, 10 + k * 22, 0, Math.PI * 2); ctx.fill();
  }
  drawGroundRings(v) {
    const ctx = this.ctx, g = this.game;
    for (const h of g.heroes) {
      if (h.dead || !this.vis(h.x, h.y, 60, v)) continue;
      const col = h.isPlayer ? '#ffd34d' : TEAM_INFO[h.team].color;
      ctx.strokeStyle = Utils.rgba(col, 0.85); ctx.lineWidth = h.isPlayer ? 3 : 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, h.radius + 6, (h.radius + 6) * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      if (h.isPlayer) { ctx.fillStyle = Utils.rgba(col, 0.9); const a = h.angle; ctx.beginPath(); ctx.moveTo(h.x + Math.cos(a) * (h.radius + 16), h.y + 4 + Math.sin(a) * (h.radius + 16) * 0.8); ctx.lineTo(h.x + Math.cos(a + 0.25) * (h.radius + 8), h.y + 4 + Math.sin(a + 0.25) * (h.radius + 8) * 0.8); ctx.lineTo(h.x + Math.cos(a - 0.25) * (h.radius + 8), h.y + 4 + Math.sin(a - 0.25) * (h.radius + 8) * 0.8); ctx.fill(); }
      if (h.recall) {
        const k = (g.time - h.recall.start) / CONFIG.RECALL_TIME;
        ctx.strokeStyle = Utils.rgba(TEAM_INFO[h.team].light, 0.9); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        const col2 = TEAM_INFO[h.team].color, gr = ctx.createLinearGradient(h.x, h.y - 120, h.x, h.y);
        gr.addColorStop(0, Utils.rgba(col2, 0)); gr.addColorStop(1, Utils.rgba(col2, 0.35 * k));
        ctx.fillStyle = gr; ctx.fillRect(h.x - h.radius, h.y - 120, h.radius * 2, 120);
      }
    }
    if (g.player && g.player.order && g.player.order.target && g.player.order.type === 'attack') {
      const tg = g.player.order.target; ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(tg.x, tg.y + 3, tg.radius + 8, (tg.radius + 8) * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  drawZone(z) {
    const ctx = this.ctx, g = this.game, t = g.time;
    if (z.kind === 'trap') {
      if (z.team !== g.player.team) return;
      const a = z.armed ? 0.85 : 0.4;
      ctx.globalAlpha = a; ctx.strokeStyle = '#8a8a82'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(z.x, z.y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(z.x + Math.cos(an) * 16, z.y + Math.sin(an) * 16); ctx.lineTo(z.x + Math.cos(an) * 10, z.y + Math.sin(an) * 10); ctx.stroke(); }
      ctx.fillStyle = TEAM_INFO[z.team].color; ctx.beginPath(); ctx.arc(z.x, z.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; return;
    }
    if (z.kind === 'gas') {
      const k = z.armed ? Math.min(1, (z.t - z.delay) / 0.3) : 0.3, fade = Math.min(1, (z.delay + z.dur - z.t) / 0.4);
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 + t * 0.4, d = (i % 3) * z.r * 0.3, x = z.x + Math.cos(a) * d, y = z.y + Math.sin(a) * d, r = z.r * (0.45 + (i % 2) * 0.15) * k;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(140,220,90,${0.35 * fade})`); gr.addColorStop(1, 'rgba(140,220,90,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = `rgba(140,220,90,${0.4 * fade})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (z.kind === 'mine') {
      const k = Utils.clamp(z.t / z.delay, 0, 1);
      ctx.strokeStyle = `rgba(127,220,255,${0.3 + 0.5 * k})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(127,220,255,0.12)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(z.x, z.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Math.sin(t * 20) > 0 ? '#7fdcff' : '#2a5a70'; ctx.beginPath(); ctx.arc(z.x, z.y, 4, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (z.kind === 'storm') {
      const gr = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); gr.addColorStop(0, 'rgba(40,60,90,0.35)'); gr.addColorStop(1, 'rgba(40,60,90,0.05)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(127,220,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, -t, -t + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  drawUnit(u) {
    const ctx = this.ctx, g = this.game, t = g.time;
    if (u.kind === 'tower') { ctx.save(); ctx.translate(u.x, u.y); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(10, 14, u.radius * 1.05, u.radius * 0.85, 0, 0, Math.PI * 2); ctx.fill(); Art.tower(ctx, u.team, u.radius, u.turretAngle, t, t - (u.attackAnim || -9) < 0.12); ctx.restore(); return; }
    if (u.kind === 'core') { ctx.save(); ctx.translate(u.x, u.y); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(12, 16, u.radius * 1.05, u.radius * 0.85, 0, 0, Math.PI * 2); ctx.fill(); Art.core(ctx, u.team, u.radius, t); ctx.restore(); return; }
    ctx.save(); ctx.translate(u.x, u.y);
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(u.radius * 0.2, u.radius * 0.3, u.radius * 1.05, u.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(u.angle);
    const period = u.kind === 'hero' ? 1 / u.st.as : u.def.period;
    const atk = t - u.attackAnim < Math.min(0.35, period * 0.6) ? (t - u.attackAnim) / Math.min(0.35, period * 0.6) : (u.castAnim && t - u.castAnim < 0.3 ? (t - u.castAnim) / 0.3 : -1);
    if (u.kind === 'hero') {
      if (t - u.lastHit < 0.1) ctx.filter = 'brightness(1.8)';
      Art.hero(ctx, u.heroId, u.radius, { team: u.team, moving: u.moving, walk: u.walk, attack: atk, time: t + u.id });
      ctx.filter = 'none';
      if (u.status.shields.length && u.shieldAmt(t) > 0) { ctx.strokeStyle = 'rgba(220,220,210,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, u.radius + 6, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      if (t - u.lastHit < 0.08) ctx.filter = 'brightness(1.8)';
      Art.minion(ctx, u.type, u.radius, { team: u.team, moving: u.moving, walk: u.walk, attack: atk });
      ctx.filter = 'none';
    }
    ctx.restore();
    if (u.kind === 'hero' && u.channel && u.channel.kind === 'windup') {
      const c = u.channel, k = (t - c.start) / c.dur;
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(c.ang);
      ctx.fillStyle = `rgba(255,120,60,${0.15 + 0.25 * k})`; ctx.fillRect(0, -c.width / 2, c.length, c.width);
      ctx.strokeStyle = 'rgba(255,140,80,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(0, -c.width / 2, c.length, c.width);
      ctx.restore();
    }
  }

  drawProjectile(p) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    switch (p.visual) {
      case 'bullet': ctx.fillStyle = 'rgba(255,230,160,0.55)'; ctx.fillRect(-22, -1.2, 22, 2.4); ctx.fillStyle = '#fff0c0'; ctx.fillRect(-4, -2, 8, 4); break;
      case 'dart': ctx.fillStyle = '#d8d8d0'; ctx.fillRect(-10, -1.5, 14, 3); ctx.fillStyle = '#8cff7a'; ctx.fillRect(-8, -2.5, 6, 5); break;
      case 'spark': { const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 10); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#7fdcff'); gr.addColorStop(1, 'rgba(127,220,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); break; }
      case 'bolt': ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#b8b8b0'; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(11, 0); ctx.lineTo(6, 3); ctx.fill(); break;
      case 'shell': ctx.fillStyle = '#2a251e'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(200,190,170,0.4)'; ctx.beginPath(); ctx.arc(-10, 0, 6, 0, Math.PI * 2); ctx.fill(); break;
      case 'flare': { const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 16); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, TEAM_INFO[p.team].light); gr.addColorStop(1, Utils.rgba(TEAM_INFO[p.team].color, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = Utils.rgba(TEAM_INFO[p.team].color, 0.4); ctx.fillRect(-30, -3, 30, 6); break; }
      case 'slug': ctx.fillStyle = 'rgba(255,220,150,0.5)'; for (let i = 0; i < 6; i++) ctx.fillRect(-26 - i * 4, (i - 2.5) * 5, 22, 2); ctx.fillStyle = '#fff0c0'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(0, (i - 2.5) * 5, 2.4, 0, Math.PI * 2); ctx.fill(); } break;
      case 'syringe': ctx.fillStyle = '#e8e8e0'; ctx.fillRect(-14, -4, 20, 8); ctx.fillStyle = '#8cff7a'; ctx.fillRect(-12, -3, 12, 6); ctx.strokeStyle = '#e8e8e0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, 0); ctx.stroke(); break;
    }
    ctx.restore();
  }

  drawEffect(e) {
    const ctx = this.ctx, k = Utils.clamp(e.t / e.dur, 0, 1), g = this.game;
    const tx = e.target ? e.target.x : e.x, ty = e.target ? e.target.y : e.y;
    if (e.target && e.target.dead) return;
    switch (e.type) {
      case 'dust': { const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * (0.6 + k)); gr.addColorStop(0, `rgba(190,165,120,${0.4 * (1 - k)})`); gr.addColorStop(1, 'rgba(190,165,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.6 + k), 0, Math.PI * 2); ctx.fill(); break; }
      case 'impact': ctx.strokeStyle = `rgba(255,220,160,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.4 + k), 0, Math.PI * 2); ctx.stroke(); break;
      case 'slash': ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.strokeStyle = `rgba(255,240,210,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-10, 0, 22, -1 + k, 1 + k); ctx.stroke(); ctx.restore(); break;
      case 'muzzle': ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.globalAlpha = 1 - k; { const gr = ctx.createRadialGradient(20, 0, 0, 20, 0, e.size); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.4, 'rgba(255,190,90,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(10, -e.size * 0.5); ctx.lineTo(20 + e.size * 1.6, 0); ctx.lineTo(10, e.size * 0.5); ctx.closePath(); ctx.fill(); } ctx.restore(); ctx.globalAlpha = 1; break;
      case 'quake': { ctx.strokeStyle = `rgba(255,210,150,${1 - k})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * Utils.easeOut(k), 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = `rgba(40,25,15,${0.8 * (1 - k)})`; ctx.lineWidth = 3; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.2; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20); ctx.lineTo(e.x + Math.cos(a + 0.1) * e.r * 0.6, e.y + Math.sin(a + 0.1) * e.r * 0.6); ctx.lineTo(e.x + Math.cos(a) * e.r * 0.95, e.y + Math.sin(a) * e.r * 0.95); ctx.stroke(); } break; }
      case 'stun': { const r = (e.target.radius || 20) * 0.7; for (let i = 0; i < 3; i++) { const a = g.time * 6 + i * 2.1; ctx.fillStyle = '#ffe680'; ctx.beginPath(); const x = tx + Math.cos(a) * r, y = ty - (e.target.radius || 20) - 10 + Math.sin(a) * r * 0.35; for (let j = 0; j < 5; j++) { const b = j / 5 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(b) * 5, y + Math.sin(b) * 5); ctx.lineTo(x + Math.cos(b + 0.63) * 2, y + Math.sin(b + 0.63) * 2); } ctx.fill(); } break; }
      case 'root': ctx.strokeStyle = 'rgba(160,160,150,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, (e.target.radius || 20) + 4, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * ((e.target.radius || 20) + 4), ty + Math.sin(a) * ((e.target.radius || 20) + 4)); ctx.lineTo(tx + Math.cos(a) * ((e.target.radius || 20) - 4), ty + Math.sin(a) * ((e.target.radius || 20) - 4)); ctx.stroke(); } break;
      case 'shield': break;
      case 'snap': ctx.strokeStyle = `rgba(200,200,190,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 18 + k * 10, 0, Math.PI * 2); ctx.stroke(); break;
      case 'volley': { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.fillStyle = `rgba(255,220,150,${0.18 * (1 - k)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, e.range, -e.half, e.half); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(255,240,200,${1 - k})`; ctx.lineWidth = 1.5; const rnd = Utils.seeded(Math.floor(e.x * 7 + g.time * 50)); for (let i = 0; i < 14; i++) { const a = (rnd() * 2 - 1) * e.half, d = e.range * (0.3 + rnd() * 0.7); ctx.beginPath(); ctx.moveTo(Math.cos(a) * d * 0.6, Math.sin(a) * d * 0.6); ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); ctx.stroke(); } ctx.restore(); break; }
      case 'splash': ctx.fillStyle = Utils.rgba(e.color, 0.5 * (1 - k)); for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * k * 22, e.y + Math.sin(a) * k * 22, 4 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill(); } break;
      case 'healBurst': for (let i = 0; i < 4; i++) { const a = i * 1.57 + e.t * 2, x = tx + Math.cos(a) * 18, y = ty - k * 40 - i * 4; ctx.fillStyle = `rgba(140,255,122,${1 - k})`; ctx.fillRect(x - 1.5, y - 5, 3, 10); ctx.fillRect(x - 5, y - 1.5, 10, 3); } break;
      case 'adrenaline': ctx.strokeStyle = `rgba(255,120,90,${0.6 * (1 - k)})`; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const yy = ty - 10 + i * 10; ctx.beginPath(); ctx.moveTo(tx - 30 - i * 4, yy); ctx.lineTo(tx - 16, yy); ctx.stroke(); } break;
      case 'pulse': ctx.strokeStyle = Utils.rgba(e.color, 0.7 * (1 - k)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * Utils.easeOut(k), 0, Math.PI * 2); ctx.stroke(); break;
      case 'lightning': this.bolt(e.x1, e.y1, e.x2, e.y2, 1 - k, Math.floor(e.t * 30)); break;
      case 'strike': { const a = 1 - k; this.bolt(e.x + 30, e.y - 340, e.x, e.y, a, Math.floor(e.t * 30) + Math.floor(e.x)); const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 90); gr.addColorStop(0, `rgba(200,240,255,${0.6 * a})`); gr.addColorStop(1, 'rgba(127,220,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, 90, 0, Math.PI * 2); ctx.fill(); break; }
      case 'emp': ctx.strokeStyle = `rgba(127,220,255,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * Utils.easeOut(k), 0, Math.PI * 2); ctx.stroke(); this.bolt(e.x - e.r * 0.6, e.y, e.x + e.r * 0.6, e.y, 1 - k, Math.floor(e.t * 40)); break;
      case 'blink': for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, d = 10 + k * 30; ctx.fillStyle = `rgba(200,240,255,${1 - k})`; ctx.fillRect(e.x + Math.cos(a) * d - 2, e.y + Math.sin(a) * d - 2, 4, 4); } break;
      case 'levelup': ctx.strokeStyle = `rgba(255,211,77,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(tx, ty - k * 30, 30, 12, 0, 0, Math.PI * 2); ctx.stroke(); break;
      case 'respawn': ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 20 + k * 50, 0, Math.PI * 2); ctx.stroke(); break;
      case 'death': { const col = TEAM_INFO[e.team].color; ctx.fillStyle = `rgba(30,22,14,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.8 + k), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = Utils.rgba(col, 0.8 * (1 - k)); for (let i = 0; i < 6; i++) { const a = i * 1.1 + e.x; ctx.fillRect(e.x + Math.cos(a) * k * e.size * 1.4, e.y + Math.sin(a) * k * e.size * 1.4, 3, 3); } if (e.siege) { this.explosion(e.x, e.y, 40, k); } break; }
      case 'heroDeath': { ctx.fillStyle = `rgba(20,14,8,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x, e.y, 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = Utils.rgba(TEAM_INFO[e.team].color, 1 - k); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 20 + k * 60, 0, Math.PI * 2); ctx.stroke(); break; }
      case 'bigExplosion': this.explosion(e.x, e.y, e.size, k); break;
    }
  }
  explosion(x, y, size, k) {
    const ctx = this.ctx;
    ctx.globalAlpha = 1 - k;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, size * (0.4 + k));
    gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,170,70,0.9)'); gr.addColorStop(0.7, 'rgba(120,60,30,0.5)'); gr.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, size * (0.4 + k), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e2620';
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + x, d = size * 1.4 * Utils.easeOut(k) * (0.7 + (i % 3) * 0.2); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - Math.sin(k * Math.PI) * 30, 4 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  bolt(x1, y1, x2, y2, a, seed) {
    const ctx = this.ctx, rnd = Utils.seeded(seed * 9973 + 17), n = Math.max(4, Math.floor(Utils.dist(x1, y1, x2, y2) / 26));
    const pts = [[x1, y1]];
    for (let i = 1; i < n; i++) { const k = i / n; pts.push([x1 + (x2 - x1) * k + (rnd() - 0.5) * 26, y1 + (y2 - y1) * k + (rnd() - 0.5) * 26]); }
    pts.push([x2, y2]);
    for (const [w, col] of [[7, `rgba(127,220,255,${0.35 * a})`], [2.5, `rgba(240,252,255,${a})`]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
  }
  drawTowerWarnings() {
    const ctx = this.ctx, g = this.game, p = g.player;
    for (const tw of g.towers) {
      if (tw.dead || tw.team === p.team) continue;
      const d = Utils.dist(tw.x, tw.y, p.x, p.y);
      if (!p.dead && d < TOWER.range + 160) {
        ctx.strokeStyle = tw.target === p ? 'rgba(255,60,40,0.8)' : 'rgba(255,90,60,0.35)'; ctx.lineWidth = tw.target === p ? 3 : 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(tw.x, tw.y, TOWER.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (tw.target === p) { ctx.strokeStyle = 'rgba(255,60,40,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tw.x, tw.y - 18); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      }
    }
    for (const h of g.heroes) if (!h.dead && h.zapped && g.time - h.zapped < 0.1) { const f = MAP.fountains[1 - h.team]; this.bolt(f.x, f.y, h.x, h.y, 1, Math.floor(g.time * 30)); }
  }

  // Indicateur de visée du joueur
  drawIndicators(input) {
    const ctx = this.ctx, g = this.game, h = g.player;
    if (h.dead || !input.aiming) return;
    const ab = ABILITIES[h.def.abilities[input.aiming.slot]];
    const mx = input.mouse.wx, my = input.mouse.wy, ang = Utils.angleTo(h.x, h.y, mx, my);
    const fill = 'rgba(255,224,160,0.18)', line = 'rgba(255,224,160,0.75)';
    ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.fillStyle = fill;
    if (ab.aim === 'line') {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang); ctx.fillRect(0, -ab.width / 2, ab.range, ab.width); ctx.strokeRect(0, -ab.width / 2, ab.range, ab.width);
      ctx.beginPath(); ctx.moveTo(ab.range, -ab.width / 2 - 8); ctx.lineTo(ab.range + 18, 0); ctx.lineTo(ab.range, ab.width / 2 + 8); ctx.closePath(); ctx.fillStyle = line; ctx.fill(); ctx.restore();
    } else if (ab.aim === 'circle') {
      ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(h.x, h.y, ab.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const d = Utils.dist(h.x, h.y, mx, my), k = d > ab.range ? ab.range / d : 1, cx = h.x + (mx - h.x) * k, cy = h.y + (my - h.y) * k;
      ctx.beginPath(); ctx.arc(cx, cy, ab.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (ab.aim === 'self') {
      ctx.beginPath(); ctx.arc(h.x, h.y, ab.radius || 60, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (ab.aim === 'cone') {
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, ab.range, ang - ab.angle / 2, ang + ab.angle / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(h.x, h.y, ab.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const tg = g.findAbilityTarget(h, ab, mx, my);
      if (tg) { ctx.strokeStyle = ab.aim === 'ally' ? 'rgba(140,255,122,0.9)' : 'rgba(255,90,70,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.radius + 8, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  // Barres de vie (en coordonnées écran)
  drawBars(list) {
    const ctx = this.ctx, g = this.game, z = g.camera.zoom;
    ctx.font = "600 12px 'Barlow Condensed', sans-serif"; ctx.textAlign = 'center';
    for (const u of list) {
      const p = this.toScreen(u.x, u.y);
      if (u.kind === 'hero') {
        const w = 74, x = p.x - w / 2, y = p.y - (u.radius + 34) * z;
        const col = u.isPlayer ? '#8be07a' : u.team === g.player.team ? TEAM_INFO[0].bar : TEAM_INFO[1].bar;
        ctx.fillStyle = 'rgba(10,8,6,0.8)'; ctx.fillRect(x - 18, y - 2, w + 20, 15);
        ctx.fillStyle = '#2a241c'; ctx.fillRect(x - 17, y - 1, 15, 13);
        ctx.fillStyle = '#f3e6cf'; ctx.fillText(u.level, x - 9.5, y + 10);
        ctx.fillStyle = '#3a2a22'; ctx.fillRect(x, y, w, 8);
        ctx.fillStyle = col; ctx.fillRect(x, y, w * u.hp / u.maxHp, 8);
        const sh = u.shieldAmt(g.time); if (sh > 0) { ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x + w * u.hp / u.maxHp, y, Math.min(w * sh / u.maxHp, w * (1 - u.hp / u.maxHp)), 8); }
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 100; k < u.maxHp; k += 100) ctx.fillRect(x + w * k / u.maxHp, y, 1, k % 500 ? 4 : 8);
        ctx.fillStyle = '#4a88d8'; ctx.fillRect(x, y + 9, w * u.mana / u.maxMana, 3);
        ctx.fillStyle = u.isPlayer ? '#ffd34d' : '#f3e6cf'; ctx.fillText(u.name, p.x, y - 5);
      } else if (u.kind === 'minion') {
        const w = u.def.siege ? 38 : 28, x = p.x - w / 2, y = p.y - (u.radius + 12) * z;
        ctx.fillStyle = 'rgba(10,8,6,0.75)'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
        ctx.fillStyle = u.team === g.player.team ? TEAM_INFO[0].bar : TEAM_INFO[1].bar; ctx.fillRect(x, y, w * u.hp / u.maxHp, 4);
      } else {
        const w = u.kind === 'core' ? 130 : 96, x = p.x - w / 2, y = p.y - (u.radius + (u.kind === 'core' ? 28 : 46)) * z;
        ctx.fillStyle = 'rgba(10,8,6,0.8)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
        ctx.fillStyle = u.team === g.player.team ? TEAM_INFO[0].bar : TEAM_INFO[1].bar; ctx.fillRect(x, y, w * u.hp / u.maxHp, 8);
        if (!g.isTargetable(u, 1 - u.team)) {
          ctx.fillStyle = '#f3e6cf'; ctx.fillRect(p.x - 6, y - 16, 12, 10); ctx.strokeStyle = '#f3e6cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, y - 16, 4, Math.PI, 0); ctx.stroke();
        }
      }
    }
    ctx.textAlign = 'left';
  }
  drawFloats() {
    const ctx = this.ctx, g = this.game;
    ctx.textAlign = 'center';
    for (const f of g.floats) {
      const k = f.t / f.dur, p = this.toScreen(f.x, f.y);
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `700 ${f.big ? 20 : 15}px 'Barlow Condensed', sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(f.text, p.x + 1, p.y - k * 36 + 1);
      ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, p.y - k * 36);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  drawVignette() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,10,0,0.5)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  }

  renderMinimap(mm) {
    const ctx = mm.getContext('2d'), g = this.game, sx = mm.width / CONFIG.W, sy = mm.height / CONFIG.H;
    if (!this.miniBg) {
      const c = document.createElement('canvas'); c.width = mm.width; c.height = mm.height;
      const x = c.getContext('2d'); x.drawImage(this.map, 0, 0, c.width, c.height); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, 0, c.width, c.height);
      this.miniBg = c;
    }
    ctx.drawImage(this.miniBg, 0, 0);
    for (const s of g.structures()) {
      if (s.dead) continue;
      ctx.fillStyle = s.team === g.player.team ? TEAM_INFO[0].color : TEAM_INFO[1].color;
      const r = s.kind === 'core' ? 8 : 6; ctx.fillRect(s.x * sx - r / 2, s.y * sy - r / 2, r, r);
      ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 1; ctx.strokeRect(s.x * sx - r / 2, s.y * sy - r / 2, r, r);
    }
    for (const m of g.minions) { ctx.fillStyle = m.team === g.player.team ? TEAM_INFO[0].light : TEAM_INFO[1].light; ctx.fillRect(m.x * sx - 1, m.y * sy - 1, 2, 2); }
    for (const h of g.heroes) {
      if (h.dead) continue;
      ctx.fillStyle = h.isPlayer ? '#ffd34d' : h.team === g.player.team ? TEAM_INFO[0].color : TEAM_INFO[1].color;
      ctx.beginPath(); ctx.arc(h.x * sx, h.y * sy, h.isPlayer ? 5 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const v = this.viewRect();
    ctx.strokeStyle = 'rgba(255,240,210,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(v.x1 * sx + 0.5, v.y1 * sy + 0.5, (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);
  }

  // Fond animé du menu : l'arène qui défile lentement
  renderIdle() {
    if (!this.map) { MAP.init(); this.map = MapArt.build(); }
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, t = performance.now() / 1000;
    const lane = MAP.lane, s = (t * 40) % lane.L, p = lane.point(s);
    ctx.fillStyle = '#1e150e'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(0.8, 0.8); ctx.translate(-p.x, -p.y);
    ctx.drawImage(this.map, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(20,12,6,0.62)'; ctx.fillRect(0, 0, w, h);
    const gr = ctx.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(20,12,6,0.85)'); gr.addColorStop(0.55, 'rgba(20,12,6,0.2)'); gr.addColorStop(1, 'rgba(20,12,6,0.4)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    this.drawVignette();
  }
}
