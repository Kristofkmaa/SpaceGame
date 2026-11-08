// ============ Rendu : terrain, brouillard, icônes tactiques, tempêtes, minimap ============
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fog = document.createElement('canvas');
    this.fctx = this.fog.getContext('2d');
    this.game = null;
    this.settings = { grid: true, ranges: true };
    this.groundTile = World.makeGroundTile(512, 3);
    this.pattern = this.ctx.createPattern(this.groundTile, 'repeat');
    this.streaks = World.makeStars(140, 5, 1);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  setGame(game) { this.game = game; }
  resize() { this.canvas.width = this.fog.width = window.innerWidth; this.canvas.height = this.fog.height = window.innerHeight; }

  toScreen(wx, wy) { const c = this.game.camera; return { x: (wx - c.x) * c.zoom + this.canvas.width / 2, y: (wy - c.y) * c.zoom + this.canvas.height / 2 }; }
  toWorld(sx, sy) { const c = this.game.camera; return { x: (sx - this.canvas.width / 2) / c.zoom + c.x, y: (sy - this.canvas.height / 2) / c.zoom + c.y }; }
  viewRect() { const a = this.toWorld(0, 0), b = this.toWorld(this.canvas.width, this.canvas.height); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }
  visible(e, view, margin = 60) { const m = margin + (e.radius || 0); return e.x > view.x1 - m && e.x < view.x2 + m && e.y > view.y1 - m && e.y < view.y2 + m; }
  get iconMode() { return this.game.camera.zoom < CONFIG.ICON_ZOOM; }
  get iconBlend() { return Utils.clamp((CONFIG.ICON_ZOOM + 0.12 - this.game.camera.zoom) / 0.24, 0, 1); }

  render(input) {
    const ctx = this.ctx, g = this.game, w = this.canvas.width, h = this.canvas.height, cam = g.camera;
    ctx.fillStyle = '#2a211a'; ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    const view = this.viewRect();
    this.drawGround(view);
    this.drawTerrain(view);
    this.drawDust(view);
    if (this.settings.grid) this.drawGrid(view);
    for (const e of g.effects) if (e.type === 'scorch') this.drawEffect(e);
    for (const a of g.asteroids) if (this.visible(a, view)) this.drawScrap(a);
    this.drawGhosts(view);
    this.drawOrders();
    for (const s of g.structures) if (s.seen && this.visible(s, view, 300)) this.drawStructure(s);
    for (const e of g.effects) if (e.type === 'dust') this.drawEffect(e);
    for (const u of g.units) if (u.seen && this.visible(u, view)) this.drawUnit(u);
    for (const p of g.projectiles) if (!p.dead && !(p.delay > 0) && this.visible(p, view)) this.drawProjectile(p);
    for (const e of g.effects) if (e.type !== 'scorch' && e.type !== 'dust') this.drawEffect(e);
    this.drawPlacement(input);
    if (this.iconBlend > 0) this.drawIcons(view);
    this.drawBounds();
    ctx.restore();

    this.drawFog();
    this.drawStorm();
    this.drawVignette();

    if (input.selBox) {
      const b = input.selBox;
      ctx.strokeStyle = 'rgba(190,240,160,0.9)'; ctx.fillStyle = 'rgba(190,240,160,0.08)'; ctx.lineWidth = 1;
      const x = Math.min(b.x1, b.x2), y = Math.min(b.y1, b.y2), bw = Math.abs(b.x2 - b.x1), bh = Math.abs(b.y2 - b.y1);
      ctx.fillRect(x, y, bw, bh); ctx.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }

  // ---------- Terrain ----------
  drawGround(view) {
    const ctx = this.ctx, g = this.game;
    const x1 = Math.max(0, view.x1), y1 = Math.max(0, view.y1), x2 = Math.min(g.W, view.x2), y2 = Math.min(g.H, view.y2);
    if (x2 <= x1 || y2 <= y1) return;
    ctx.fillStyle = this.pattern; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    // Lumière rasante : dégradé chaud du coin sud-ouest
    const grad = ctx.createLinearGradient(0, g.H, g.W, 0);
    grad.addColorStop(0, 'rgba(255,190,110,0.10)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(40,30,60,0.14)');
    ctx.fillStyle = grad; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }
  drawTerrain(view) {
    const ctx = this.ctx, g = this.game, T = g.terrain, z = g.camera.zoom;
    if (!T) return;
    // Routes
    for (const road of T.roads) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(52,46,40,0.85)'; ctx.lineWidth = 58;
      ctx.beginPath(); road.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,80,66,0.5)'; ctx.lineWidth = 50; ctx.stroke();
      ctx.strokeStyle = 'rgba(200,170,90,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([26, 30]); ctx.stroke(); ctx.setLineDash([]);
    }
    // Cratères
    for (const c of T.craters) {
      if (!this.visible(c, view, c.r)) continue;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      const grad = ctx.createRadialGradient(0, 0, c.r * 0.2, 0, 0, c.r);
      grad.addColorStop(0, 'rgba(30,22,14,0.75)'); grad.addColorStop(0.7, 'rgba(60,46,32,0.5)'); grad.addColorStop(1, 'rgba(150,125,85,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, c.r, c.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(170,145,100,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, c.r * 0.85, c.r * 0.68, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.restore();
    }
    // Ruines
    for (const r of T.ruins) {
      if (!this.visible(r, view, Math.max(r.w, r.h))) continue;
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.fillStyle = 'rgba(40,32,24,0.35)'; ctx.fillRect(-r.w / 2 + 8, -r.h / 2 + 10, r.w, r.h);
      ctx.fillStyle = '#6f665a'; ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
      ctx.strokeStyle = '#8f8676'; ctx.lineWidth = 5; ctx.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
      ctx.strokeStyle = '#4a4238'; ctx.lineWidth = 1; ctx.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
      // murs intérieurs écroulés
      ctx.strokeStyle = '#8f8676'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-r.w / 2 + r.w * (0.3 + r.seed * 0.3), -r.h / 2); ctx.lineTo(-r.w / 2 + r.w * (0.3 + r.seed * 0.3), r.h * (0.1 - r.seed * 0.4)); ctx.moveTo(-r.w / 2, r.h * (0.2 - r.seed * 0.5)); ctx.lineTo(r.w * 0.2, r.h * (0.2 - r.seed * 0.5)); ctx.stroke();
      ctx.fillStyle = 'rgba(60,50,40,0.6)';
      for (let i = 0; i < 6; i++) { const a = r.seed * 10 + i * 1.7; ctx.fillRect(Math.cos(a) * r.w * 0.55, Math.sin(a) * r.h * 0.55, 5, 4); }
      ctx.restore();
    }
    // Broussailles
    if (z > 0.35) for (const b of T.scrub) {
      if (!this.visible(b, view, 20)) continue;
      ctx.fillStyle = 'rgba(70,74,40,0.55)';
      for (let i = 0; i < 5; i++) { const a = b.seed * 20 + i * 1.3; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * b.r * 0.5, b.y + Math.sin(a) * b.r * 0.4, b.r * 0.35, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  drawDust(view) {
    const ctx = this.ctx, t = this.game.time;
    for (const d of this.game.dust) {
      const x = ((d.x + d.vx * t) % (this.game.W + d.rx * 2) + this.game.W + d.rx * 2) % (this.game.W + d.rx * 2) - d.rx, y = d.y + Math.sin(t * 0.03 + d.x) * 80;
      if (x + d.rx < view.x1 || x - d.rx > view.x2 || y + d.ry < view.y1 || y - d.ry > view.y2) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot); ctx.scale(1, d.ry / d.rx);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d.rx);
      grad.addColorStop(0, `rgba(${d.hue[0]},${d.hue[1]},${d.hue[2]},0.16)`); grad.addColorStop(1, `rgba(${d.hue[0]},${d.hue[1]},${d.hue[2]},0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, d.rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  drawBounds() {
    const ctx = this.ctx, g = this.game;
    ctx.strokeStyle = 'rgba(255,200,120,0.3)'; ctx.lineWidth = 3 / g.camera.zoom; ctx.setLineDash([30, 22]);
    ctx.strokeRect(0, 0, g.W, g.H); ctx.setLineDash([]);
  }
  drawGrid(view) {
    const ctx = this.ctx, g = this.game, a = Utils.clamp((0.9 - g.camera.zoom) * 0.16, 0, 0.12);
    if (a <= 0.005) return;
    const step = 500;
    ctx.strokeStyle = `rgba(255,220,160,${a})`; ctx.lineWidth = 1 / g.camera.zoom;
    ctx.beginPath();
    for (let x = Math.max(0, Math.floor(view.x1 / step) * step); x <= Math.min(g.W, view.x2); x += step) { ctx.moveTo(x, Math.max(0, view.y1)); ctx.lineTo(x, Math.min(g.H, view.y2)); }
    for (let y = Math.max(0, Math.floor(view.y1 / step) * step); y <= Math.min(g.H, view.y2); y += step) { ctx.moveTo(Math.max(0, view.x1), y); ctx.lineTo(Math.min(g.W, view.x2), y); }
    ctx.stroke();
  }

  // Décharge de ferraille
  drawScrap(a) {
    const ctx = this.ctx;
    if (this.iconMode) {
      ctx.fillStyle = a.seen ? 'rgba(200,170,90,0.9)' : 'rgba(140,120,80,0.7)';
      ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(a.radius * 0.8, 4 / this.game.camera.zoom), 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rotation);
    if (!a.seen) ctx.globalAlpha = 0.6;
    const ratio = a.minerals / a.maxMinerals;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(a.radius * 0.15, a.radius * 0.25, a.radius * 1.05, a.radius * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    a.shape.forEach((p, i) => { const x = Math.cos(p.a) * p.r * a.radius, y = Math.sin(p.a) * p.r * a.radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.fillStyle = '#5a4a3c'; ctx.fill();
    ctx.strokeStyle = '#2e2520'; ctx.lineWidth = 1.2; ctx.stroke();
    // Plaques de tôle, pneus et ferraille qui brille
    for (let i = 0; i < a.shape.length; i++) {
      const p = a.shape[i], d = a.radius * p.r * 0.55;
      ctx.save(); ctx.translate(Math.cos(p.a) * d, Math.sin(p.a) * d); ctx.rotate(p.a + p.r * 3);
      ctx.fillStyle = i % 3 === 0 ? PALETTE.rust : i % 3 === 1 ? PALETTE.metal : '#17150f';
      if (i % 3 === 2) { ctx.beginPath(); ctx.arc(0, 0, a.radius * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a362e'; ctx.beginPath(); ctx.arc(0, 0, a.radius * 0.09, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-a.radius * 0.25, -a.radius * 0.12, a.radius * 0.5, a.radius * 0.24);
      ctx.restore();
    }
    ctx.fillStyle = `rgba(255,236,170,${0.25 + 0.6 * ratio * (0.6 + 0.4 * Math.sin(this.game.time * 3 + a.id))})`;
    for (let i = 0; i < 3; i++) { const ang = a.shape[(i * 3) % a.shape.length].a + 0.9, d = a.radius * 0.4; ctx.beginPath(); ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, 1.2 + a.radius * 0.05 * ratio, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  drawGhosts(view) {
    const ctx = this.ctx, g = this.game;
    for (const gh of g.ghosts) {
      const live = g.structures.find(s => s.id === gh.id);
      if (live && live.seen) continue;
      if (gh.x < view.x1 - 200 || gh.x > view.x2 + 200 || gh.y < view.y1 - 200 || gh.y > view.y2 + 200) continue;
      ctx.save(); ctx.translate(gh.x, gh.y); ctx.globalAlpha = 0.4;
      if (this.iconBlend < 1) { ctx.rotate(live ? live.angle : 0); Art.drawStructure(ctx, gh.type, gh.faction, STRUCTURE_TYPES[gh.type].radius, { time: 0 }); }
      ctx.restore();
    }
  }

  drawOrders() {
    const ctx = this.ctx, g = this.game, z = g.camera.zoom;
    ctx.lineWidth = 1 / z;
    for (const u of g.selection) {
      if (u.kind !== 'unit' || !u.order) continue;
      const o = u.order; let tx, ty, col;
      if (o.type === 'move' || o.type === 'attackMove' || o.type === 'guard') { tx = o.x; ty = o.y; col = o.type === 'move' ? 'rgba(190,240,160,0.4)' : 'rgba(255,110,80,0.4)'; }
      else if (o.target && !o.target.dead) { tx = o.target.x; ty = o.target.y; col = o.type === 'mine' ? 'rgba(255,215,120,0.35)' : 'rgba(255,110,80,0.4)'; }
      else continue;
      ctx.strokeStyle = col; ctx.setLineDash([6 / z, 6 / z]);
      ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const s of g.selection) {
      if (s.kind !== 'structure' || !s.def.produces) continue;
      const r = s.rally || g.defaultRally(s);
      ctx.strokeStyle = 'rgba(255,215,120,0.6)'; ctx.setLineDash([4 / z, 6 / z]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(r.x, r.y - 14 / z); ctx.lineTo(r.x, r.y + 6 / z); ctx.stroke();
      ctx.fillStyle = 'rgba(255,215,120,0.85)';
      ctx.beginPath(); ctx.moveTo(r.x, r.y - 14 / z); ctx.lineTo(r.x + 10 / z, r.y - 10 / z); ctx.lineTo(r.x, r.y - 6 / z); ctx.fill();
    }
  }

  drawStructure(s) {
    const ctx = this.ctx, r = s.radius, g = this.game, z = g.camera.zoom;
    const selected = g.selection.includes(s);
    const alphaShip = 1 - this.iconBlend;
    if (alphaShip > 0) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
      let a = alphaShip * (s.building ? 0.4 + 0.5 * s.buildProgress : 1);
      if (s.type === 'mothership') { const k = Utils.clamp((g.time - s.spawnTime) / 3, 0, 1); const e = Utils.easeOut(k); ctx.scale(0.5 + 0.5 * e, 0.5 + 0.5 * e); a *= e; }
      ctx.globalAlpha = a;
      const q = s.queue[0];
      Art.drawStructure(ctx, s.type, s.faction, r, { time: g.time + s.id, turretAngle: s.turretAngle, angle: s.angle, queueType: q ? q.type : null, queueProgress: q ? q.progress / UNIT_TYPES[q.type].buildTime : 0, faction: s.faction });
      ctx.restore();
      if (s.building) {
        ctx.strokeStyle = 'rgba(255,215,120,0.9)'; ctx.lineWidth = 2 / z;
        ctx.beginPath(); ctx.arc(s.x, s.y, r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.buildProgress); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,215,120,0.2)'; ctx.beginPath(); ctx.arc(s.x, s.y, r + 10, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (selected) {
      ctx.strokeStyle = '#bef0a0'; ctx.lineWidth = 1.5 / z;
      this.bracket(s.x, s.y, r + 8);
      if (this.settings.ranges) {
        if (s.range) { ctx.strokeStyle = 'rgba(255,110,80,0.4)'; ctx.setLineDash([6 / z, 8 / z]); ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = 'rgba(79,184,220,0.25)'; ctx.setLineDash([3 / z, 9 / z]); ctx.beginPath(); ctx.arc(s.x, s.y, s.sensor, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (!this.iconMode && (selected || s.hp < s.maxHp || s.building)) this.drawHpBar(s, r * 1.8, r + 16);
  }

  drawUnit(u) {
    const ctx = this.ctx, r = u.radius, g = this.game, z = g.camera.zoom;
    const selected = g.selection.includes(u);
    const alphaShip = 1 - this.iconBlend;
    if (alphaShip > 0) {
      if (u.mining && u.lastAsteroid && !u.lastAsteroid.dead) {
        // Chalumeau : étincelles vers la décharge
        ctx.strokeStyle = `rgba(255,230,150,${0.5 + 0.4 * Math.sin(g.time * 30)})`; ctx.lineWidth = 1.5;
        const ax = u.lastAsteroid.x + Utils.rand(-4, 4), ay = u.lastAsteroid.y + Utils.rand(-4, 4);
        ctx.beginPath(); ctx.moveTo(u.x + Math.cos(u.angle) * r * 1.4, u.y + Math.sin(u.angle) * r * 1.4); ctx.lineTo(ax, ay); ctx.stroke();
        ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(ax, ay, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); ctx.globalAlpha = alphaShip;
      Art.drawShip(ctx, u.type, u.faction, r, { moving: u.moving, cargo: u.cargo, capacity: u.capacity, turretAngle: u.turretAngle, angle: u.angle, time: g.time + u.id });
      ctx.restore();
      if (u.repairing && g.time - u.repairing < 0.2) {
        ctx.strokeStyle = `rgba(190,240,160,${0.3 + 0.3 * Math.sin(g.time * 10)})`; ctx.lineWidth = 1 / z;
        ctx.beginPath(); ctx.arc(u.x, u.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (selected) {
      ctx.strokeStyle = '#bef0a0'; ctx.lineWidth = 1.5 / z;
      this.bracket(u.x, u.y, r + 6);
      if (this.settings.ranges && u.range && g.selection.length <= 3) { ctx.strokeStyle = 'rgba(255,110,80,0.25)'; ctx.setLineDash([4 / z, 8 / z]); ctx.beginPath(); ctx.arc(u.x, u.y, u.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (!this.iconMode && (selected || u.hp < u.maxHp)) this.drawHpBar(u, Math.max(18, r * 2.2), r + 10);
    if (u.group && selected && !this.iconMode) { ctx.fillStyle = '#f0e6d2'; ctx.font = `${10 / z}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center'; ctx.fillText(u.group, u.x, u.y + r + 20 / z); ctx.textAlign = 'left'; }
  }

  bracket(x, y, r) {
    const ctx = this.ctx, l = r * 0.45;
    ctx.beginPath();
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { ctx.moveTo(x + sx * r, y + sy * (r - l)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - l), y + sy * r); }
    ctx.stroke();
  }
  drawHpBar(e, w, offset) {
    const ctx = this.ctx, z = this.game.camera.zoom, ratio = Utils.clamp(e.hp / e.maxHp, 0, 1);
    const hh = 3 / z, x = e.x - w / 2, y = e.y - offset;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, hh);
    ctx.fillStyle = ratio > 0.5 ? '#9be28a' : ratio > 0.25 ? '#ffcf6b' : '#ff5c5c'; ctx.fillRect(x, y, w * ratio, hh);
  }

  drawIcons(view) {
    const ctx = this.ctx, g = this.game, z = g.camera.zoom, a = this.iconBlend, s = 7 / z;
    ctx.globalAlpha = a;
    for (const st of g.structures) {
      if (!st.seen || !this.visible(st, view, 100)) continue;
      ctx.save(); ctx.translate(st.x, st.y); Art.drawIcon(ctx, 'structure', st.faction, s * 1.2, st.type); ctx.restore();
      if (g.selection.includes(st)) { ctx.strokeStyle = '#bef0a0'; ctx.lineWidth = 1 / z; this.bracket(st.x, st.y, s * 2.4); }
    }
    for (const gh of g.ghosts) {
      const live = g.structures.find(x => x.id === gh.id); if (live && live.seen) continue;
      ctx.save(); ctx.translate(gh.x, gh.y); ctx.globalAlpha = a * 0.4; Art.drawIcon(ctx, 'structure', gh.faction, s * 1.2, gh.type); ctx.restore(); ctx.globalAlpha = a;
    }
    for (const u of g.units) {
      if (!u.seen || !this.visible(u, view, 50)) continue;
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); Art.drawIcon(ctx, u.def.cls, u.faction, s, u.type); ctx.restore();
      if (g.selection.includes(u)) { ctx.strokeStyle = '#bef0a0'; ctx.lineWidth = 1 / z; this.bracket(u.x, u.y, s * 1.8); }
      if (u.hp < u.maxHp * 0.999) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(u.x - s, u.y - s * 1.8, s * 2, 2 / z); ctx.fillStyle = u.hp / u.maxHp > 0.5 ? '#9be28a' : '#ff5c5c'; ctx.fillRect(u.x - s, u.y - s * 1.8, s * 2 * u.hp / u.maxHp, 2 / z); }
    }
    ctx.globalAlpha = 1;
  }

  drawProjectile(p) {
    const ctx = this.ctx;
    if (p.kind === 'shell') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(255,220,150,0.5)'; ctx.fillRect(-14, -1, 14, 2);
      ctx.fillStyle = '#2a251e'; ctx.fillRect(-3, -1.8, 7, 3.6); ctx.restore();
    } else if (p.kind === 'rocket') {
      for (let i = 0; i < p.trail.length; i++) { const tr = p.trail[i], age = this.game.time - tr.t; ctx.fillStyle = `rgba(200,195,185,${Math.max(0, 0.45 - age * 0.9)})`; ctx.beginPath(); ctx.arc(tr.x, tr.y, 2 + age * 9, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = PALETTE.metal; ctx.fillRect(-6, -1.5, 10, 3); ctx.fillStyle = FACTION_COLORS[p.faction].team; ctx.fillRect(-2, -1.5, 3, 3);
      ctx.fillStyle = `rgba(255,200,100,${0.6 + Math.random() * 0.4})`; ctx.beginPath(); ctx.arc(-8, 0, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (p.kind === 'arty') {
      // Ombre au sol et obus en l'air
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a251e'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h, 4 + p.h * 0.004, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,150,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y - p.h); ctx.lineTo(p.x - Math.cos(p.angle) * 16, p.y - p.h - Math.sin(p.angle) * 16 + 8); ctx.stroke();
      if (p.t > 0.75) { ctx.strokeStyle = `rgba(255,110,80,${(p.t - 0.75) * 3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.tx, p.ty, p.splash, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  drawEffect(e) {
    const ctx = this.ctx, k = Utils.clamp(e.t / e.dur, 0, 1), g = this.game, z = g.camera.zoom;
    switch (e.type) {
      case 'tracer':
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.heavy ? '#ffd27a' : '#fff1b8'; ctx.lineWidth = e.heavy ? 2.2 : 1.4;
        ctx.beginPath(); ctx.moveTo(e.x1 + (e.x2 - e.x1) * k * 0.6, e.y1 + (e.y2 - e.y1) * k * 0.6); ctx.lineTo(e.x2, e.y2); ctx.stroke(); ctx.globalAlpha = 1; break;
      case 'muzzle': {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.globalAlpha = 1 - k;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 1.6); grad.addColorStop(0, 'rgba(255,255,230,1)'); grad.addColorStop(0.4, 'rgba(255,190,90,0.8)'); grad.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, -e.size * 0.5); ctx.lineTo(e.size * 1.8, 0); ctx.lineTo(0, e.size * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1; break;
      }
      case 'hit': ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.5 + k), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'dust': {
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * (0.5 + k * 1.3));
        grad.addColorStop(0, `rgba(190,165,120,${0.35 * (1 - k)})`); grad.addColorStop(1, 'rgba(190,165,120,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.5 + k * 1.3), 0, Math.PI * 2); ctx.fill(); break;
      }
      case 'scorch': {
        const a = k < 0.8 ? 1 : (1 - k) / 0.2;
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size);
        grad.addColorStop(0, `rgba(20,14,8,${0.75 * a})`); grad.addColorStop(0.6, `rgba(30,22,12,${0.45 * a})`); grad.addColorStop(1, 'rgba(30,22,12,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
        if (e.wreck && !this.iconMode) {
          ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.globalAlpha = 0.55 * a;
          Art.drawShip(ctx, e.wreck, FACTION.NEUTRAL, UNIT_TYPES[e.wreck].radius, { time: 0 });
          ctx.restore();
          if (k < 0.15) { ctx.fillStyle = `rgba(60,50,40,${(0.15 - k) * 3})`; ctx.beginPath(); ctx.arc(e.x + Math.sin(e.t * 2) * 4, e.y - e.t * 12, 6 + e.t * 6, 0, Math.PI * 2); ctx.fill(); }
        }
        break;
      }
      case 'explosion': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = 'rgba(255,200,120,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * Utils.easeOut(k), 0, Math.PI * 2); ctx.stroke();
        const core = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 0.6 * (1 - k * 0.4));
        core.addColorStop(0, 'rgba(255,255,230,1)'); core.addColorStop(0.4, 'rgba(255,170,80,0.85)'); core.addColorStop(1, 'rgba(120,60,30,0)');
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.debris ? '#3a322a' : '#ffb060';
        const n = e.debris ? 14 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.x * 0.01, sp = 1 + ((i * 7) % 5) * 0.2, d = e.size * 1.5 * Utils.easeOut(k) * sp;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d - (e.debris ? Math.sin(k * Math.PI) * 20 : 0), (e.debris ? 2.6 : 2) * (1 - k) + 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case 'marker': {
        const x = e.follow && !e.follow.dead ? e.follow.x : e.x, y = e.follow && !e.follow.dead ? e.follow.y : e.y;
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 1.5 / z; this.bracket(x, y, (22 * (1 - k) + 6) / z); ctx.globalAlpha = 1; break;
      }
      case 'float':
        ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k; ctx.font = `600 ${13 / z}px 'Barlow Condensed', sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - k * 25 / z); ctx.textAlign = 'left'; ctx.globalAlpha = 1; break;
      case 'arrival': {
        // Nuage de poussière soulevé par l'arrivée du convoi
        ctx.globalAlpha = (1 - k) * 0.8;
        const grad = ctx.createRadialGradient(e.x, e.y, e.r * 0.5, e.x, e.y, e.r * (1.2 + k * 2.2));
        grad.addColorStop(0, 'rgba(200,175,130,0)'); grad.addColorStop(0.6, 'rgba(200,175,130,0.45)'); grad.addColorStop(1, 'rgba(200,175,130,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.2 + k * 2.2), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; break;
      }
    }
  }

  drawPlacement(input) {
    const g = this.game, ctx = this.ctx, z = g.camera.zoom;
    if (!g.mode || !g.mode.place) return;
    const def = STRUCTURE_TYPES[g.mode.place];
    ctx.strokeStyle = 'rgba(79,184,220,0.25)'; ctx.lineWidth = 1 / z; ctx.setLineDash([8 / z, 10 / z]);
    for (const s of g.structures) { if (s.dead || s.faction !== FACTION.PLAYER) continue; ctx.beginPath(); ctx.arc(s.x, s.y, CONFIG.BUILD_RADIUS, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    if (!input.mouse.inCanvas) return;
    const ok = g.canPlace(g.mode.place, input.mouse.wx, input.mouse.wy, FACTION.PLAYER);
    ctx.save(); ctx.translate(input.mouse.wx, input.mouse.wy); ctx.globalAlpha = 0.6;
    ctx.rotate(Utils.angleTo(input.mouse.wx, input.mouse.wy, g.W / 2, g.H / 2));
    Art.drawStructure(ctx, g.mode.place, FACTION.PLAYER, def.radius, { time: g.time });
    ctx.restore();
    ctx.strokeStyle = ok ? '#bef0a0' : '#ff5c5c'; ctx.lineWidth = 1.5 / z;
    this.bracket(input.mouse.wx, input.mouse.wy, def.radius + 8);
    if (def.range) { ctx.strokeStyle = 'rgba(255,110,80,0.35)'; ctx.setLineDash([6 / z, 8 / z]); ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (def.sensor > 600) { ctx.strokeStyle = 'rgba(79,184,220,0.3)'; ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.sensor * g.sensorFactor(), 0, Math.PI * 2); ctx.stroke(); }
  }

  drawFog() {
    const g = this.game, f = this.fctx, w = this.fog.width, h = this.fog.height, cam = g.camera;
    f.globalCompositeOperation = 'source-over';
    f.fillStyle = 'rgba(22,16,10,0.72)'; f.fillRect(0, 0, w, h);
    f.globalCompositeOperation = 'destination-out';
    for (const s of g.visionSources || []) {
      const p = this.toScreen(s.x, s.y), r = s.r * cam.zoom;
      if (p.x + r < 0 || p.y + r < 0 || p.x - r > w || p.y - r > h) continue;
      const grad = f.createRadialGradient(p.x, p.y, r * 0.75, p.x, p.y, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = grad; f.beginPath(); f.arc(p.x, p.y, r, 0, Math.PI * 2); f.fill();
    }
    this.ctx.drawImage(this.fog, 0, 0);
  }
  // Tempête de poussière : voile ocre et traînées rapides en diagonale
  drawStorm() {
    const g = this.game, f = g.storm.fade; if (f <= 0) return;
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, t = g.time;
    ctx.fillStyle = `rgba(190,150,95,${0.22 * f})`; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(230,205,160,${0.22 * f})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const s of this.streaks) {
      const sp = 900 + s.s * 500, x = ((s.x * w + t * sp) % (w + 200)) - 100, y = ((s.y * h + t * sp * 0.35) % (h + 100)) - 50;
      ctx.moveTo(x, y); ctx.lineTo(x - 26 - s.s * 18, y - 9 - s.s * 5);
    }
    ctx.stroke();
  }
  drawVignette() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(20,10,0,0.5)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }

  renderMinimap(mm) {
    const ctx = mm.getContext('2d'), g = this.game, sx = mm.width / g.W, sy = mm.height / g.H;
    ctx.fillStyle = '#4a3c2c'; ctx.fillRect(0, 0, mm.width, mm.height);
    if (g.terrain) { ctx.strokeStyle = 'rgba(30,26,22,0.8)'; ctx.lineWidth = 2; for (const road of g.terrain.roads) { ctx.beginPath(); road.forEach((p, i) => i ? ctx.lineTo(p.x * sx, p.y * sy) : ctx.moveTo(p.x * sx, p.y * sy)); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, mm.width, mm.height);
    ctx.fillStyle = 'rgba(79,184,220,0.09)';
    for (const s of g.visionSources || []) { ctx.beginPath(); ctx.arc(s.x * sx, s.y * sy, s.r * sx, 0, Math.PI * 2); ctx.fill(); }
    for (const a of g.asteroids) { ctx.fillStyle = a.seen ? '#c9a24a' : '#7a6a48'; ctx.fillRect(a.x * sx - 1, a.y * sy - 1, 2.2, 2.2); }
    for (const gh of g.ghosts) { const live = g.structures.find(x => x.id === gh.id); if (live && live.seen) continue; ctx.fillStyle = Utils.rgba(FACTION_COLORS[gh.faction].team, 0.4); ctx.fillRect(gh.x * sx - 2, gh.y * sy - 2, 4, 4); }
    for (const s of g.structures) { if (s.dead || !s.seen) continue; ctx.fillStyle = FACTION_COLORS[s.faction].team; const r = s.type === 'mothership' ? 7 : 4; ctx.fillRect(s.x * sx - r / 2, s.y * sy - r / 2, r, r); }
    for (const u of g.units) { if (u.dead || !u.seen) continue; ctx.fillStyle = FACTION_COLORS[u.faction].team; ctx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2); }
    const v = this.viewRect();
    ctx.strokeStyle = 'rgba(255,240,210,0.8)'; ctx.lineWidth = 1;
    ctx.strokeRect(v.x1 * sx + 0.5, v.y1 * sy + 0.5, (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);
  }

  // Fond du menu : sol qui défile, char lourd en silhouette, poussière
  renderIdle() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, t = performance.now() / 1000;
    ctx.save();
    ctx.translate(-((t * 14) % 512), -((t * 6) % 512));
    ctx.fillStyle = this.pattern; ctx.fillRect(0, 0, w + 512, h + 512);
    ctx.restore();
    ctx.fillStyle = 'rgba(30,18,8,0.45)'; ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, h, w, 0); grad.addColorStop(0, 'rgba(255,170,90,0.18)'); grad.addColorStop(1, 'rgba(20,10,30,0.3)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w * 0.7, h * 0.56 + Math.sin(t * 0.4) * 4); ctx.rotate(-0.55 + Math.sin(t * 0.1) * 0.02); ctx.globalAlpha = 0.9;
    Art.drawShip(ctx, 'destroyer', FACTION.PLAYER, Math.min(w, h) * 0.13, { time: t, moving: true, turretAngle: -0.55 + Math.sin(t * 0.3) * 0.4, angle: -0.55 });
    ctx.restore();
    // Poussière soulevée
    for (let i = 0; i < 6; i++) { const k = ((t * 0.25 + i * 0.17) % 1); const g2 = ctx.createRadialGradient(w * 0.7 - 140 - k * 500, h * 0.56 + 120 + k * 260, 0, w * 0.7 - 140 - k * 500, h * 0.56 + 120 + k * 260, 80 + k * 180); g2.addColorStop(0, `rgba(200,170,120,${0.22 * (1 - k)})`); g2.addColorStop(1, 'rgba(200,170,120,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h); }
    this.drawVignette();
  }
}
