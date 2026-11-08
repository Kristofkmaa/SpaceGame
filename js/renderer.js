// ============ Rendu : monde, brouillard, icônes stratégiques, minimap ============
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fog = document.createElement('canvas');
    this.fctx = this.fog.getContext('2d');
    this.game = null;
    this.settings = { grid: true, ranges: true };
    this.TILE = 1800;
    this.stars = [
      { f: 0.10, pts: World.makeStars(300, 11, this.TILE) },
      { f: 0.25, pts: World.makeStars(200, 23, this.TILE) },
      { f: 0.50, pts: World.makeStars(90, 37, this.TILE) },
    ];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  setGame(game) { this.game = game; }
  resize() { this.canvas.width = this.fog.width = window.innerWidth; this.canvas.height = this.fog.height = window.innerHeight; }

  toScreen(wx, wy) { const c = this.game.camera; return { x: (wx - c.x) * c.zoom + this.canvas.width / 2, y: (wy - c.y) * c.zoom + this.canvas.height / 2 }; }
  toWorld(sx, sy) { const c = this.game.camera; return { x: (sx - this.canvas.width / 2) / c.zoom + c.x, y: (sy - this.canvas.height / 2) / c.zoom + c.y }; }
  viewRect() { const a = this.toWorld(0, 0), b = this.toWorld(this.canvas.width, this.canvas.height); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }
  visible(e, view, margin = 60) { const m = margin + e.radius; return e.x > view.x1 - m && e.x < view.x2 + m && e.y > view.y1 - m && e.y < view.y2 + m; }
  get iconMode() { return this.game.camera.zoom < CONFIG.ICON_ZOOM; }
  get iconBlend() { return Utils.clamp((CONFIG.ICON_ZOOM + 0.12 - this.game.camera.zoom) / 0.24, 0, 1); }

  // ---------- Image principale ----------
  render(input) {
    const ctx = this.ctx, g = this.game, w = this.canvas.width, h = this.canvas.height, cam = g.camera;
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, w, h);
    this.drawStars(cam, g.time);

    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    const view = this.viewRect();
    this.drawDust(view);
    this.drawBounds();
    if (this.settings.grid) this.drawGrid(view);
    for (const a of g.asteroids) if (this.visible(a, view)) this.drawAsteroid(a);
    this.drawGhosts(view);
    this.drawOrders();
    for (const s of g.structures) if ((s.seen) && this.visible(s, view, 300)) this.drawStructure(s);
    for (const u of g.units) if (u.seen && this.visible(u, view)) this.drawUnit(u);
    for (const p of g.projectiles) if (!p.dead && this.visible(p, view)) this.drawProjectile(p);
    for (const e of g.effects) this.drawEffect(e);
    this.drawPlacement(input);
    if (this.iconBlend > 0) this.drawIcons(view);
    ctx.restore();

    this.drawFog();
    this.drawVignette();

    if (input.selBox) {
      const b = input.selBox;
      ctx.strokeStyle = 'rgba(126,240,176,0.9)'; ctx.fillStyle = 'rgba(126,240,176,0.07)'; ctx.lineWidth = 1;
      const x = Math.min(b.x1, b.x2), y = Math.min(b.y1, b.y2), bw = Math.abs(b.x2 - b.x1), bh = Math.abs(b.y2 - b.y1);
      ctx.fillRect(x, y, bw, bh); ctx.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }

  drawStars(cam, t) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, T = this.TILE;
    for (const layer of this.stars) {
      const ox = -((cam.x * layer.f * cam.zoom) % T), oy = -((cam.y * layer.f * cam.zoom) % T);
      for (let tx = -1; tx <= Math.ceil(w / T); tx++) for (let ty = -1; ty <= Math.ceil(h / T); ty++) for (const s of layer.pts) {
        const x = s.x + ox + tx * T, y = s.y + oy + ty * T;
        if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
        ctx.globalAlpha = s.b * (0.75 + 0.25 * Math.sin(t * 1.3 + s.tw));
        ctx.fillStyle = s.warm ? '#ffd9b0' : '#dfe9ff';
        const sz = s.s * (0.6 + layer.f);
        ctx.fillRect(x, y, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
  }
  drawDust(view) {
    const ctx = this.ctx;
    for (const d of this.game.dust) {
      if (d.x + d.rx < view.x1 || d.x - d.rx > view.x2 || d.y + d.ry < view.y1 || d.y - d.ry > view.y2) continue;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.scale(1, d.ry / d.rx);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d.rx);
      grad.addColorStop(0, `rgba(${d.hue[0]},${d.hue[1]},${d.hue[2]},0.13)`); grad.addColorStop(0.6, `rgba(${d.hue[0]},${d.hue[1]},${d.hue[2]},0.05)`); grad.addColorStop(1, `rgba(${d.hue[0]},${d.hue[1]},${d.hue[2]},0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, d.rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  drawBounds() {
    const ctx = this.ctx, g = this.game;
    ctx.strokeStyle = 'rgba(160,182,204,0.18)'; ctx.lineWidth = 2 / g.camera.zoom; ctx.setLineDash([24, 18]);
    ctx.strokeRect(0, 0, g.W, g.H); ctx.setLineDash([]);
  }
  drawGrid(view) {
    const ctx = this.ctx, g = this.game, a = Utils.clamp((0.9 - g.camera.zoom) * 0.14, 0, 0.1);
    if (a <= 0.005) return;
    const step = 500;
    ctx.strokeStyle = `rgba(95,211,255,${a})`; ctx.lineWidth = 1 / g.camera.zoom;
    ctx.beginPath();
    for (let x = Math.max(0, Math.floor(view.x1 / step) * step); x <= Math.min(g.W, view.x2); x += step) { ctx.moveTo(x, Math.max(0, view.y1)); ctx.lineTo(x, Math.min(g.H, view.y2)); }
    for (let y = Math.max(0, Math.floor(view.y1 / step) * step); y <= Math.min(g.H, view.y2); y += step) { ctx.moveTo(Math.max(0, view.x1), y); ctx.lineTo(Math.min(g.W, view.x2), y); }
    ctx.stroke();
  }

  drawAsteroid(a) {
    const ctx = this.ctx;
    if (this.iconMode) {
      ctx.fillStyle = a.seen ? 'rgba(170,150,110,0.9)' : 'rgba(120,108,88,0.7)';
      ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(a.radius * 0.8, 4 / this.game.camera.zoom), 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rotation + this.game.time * a.spin);
    if (!a.seen) ctx.globalAlpha = 0.55;
    const ratio = a.minerals / a.maxMinerals;
    ctx.beginPath();
    a.shape.forEach((p, i) => { const x = Math.cos(p.a) * p.r * a.radius, y = Math.sin(p.a) * p.r * a.radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.fillStyle = '#4f4841'; ctx.fill();
    ctx.strokeStyle = '#7d7366'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = `rgba(255,207,107,${0.3 + 0.6 * ratio})`;
    for (let i = 0; i < 4; i++) {
      const ang = a.shape[(i * 2) % a.shape.length].a + 0.4, d = a.radius * 0.45;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, 1.4 + a.radius * 0.08 * ratio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawGhosts(view) {
    const ctx = this.ctx, g = this.game;
    for (const gh of g.ghosts) {
      const live = g.structures.find(s => s.id === gh.id);
      if (live && live.seen) continue;
      if (gh.x < view.x1 - 200 || gh.x > view.x2 + 200 || gh.y < view.y1 - 200 || gh.y > view.y2 + 200) continue;
      ctx.save(); ctx.translate(gh.x, gh.y); ctx.globalAlpha = 0.35;
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
      if (o.type === 'move' || o.type === 'attackMove' || o.type === 'guard') { tx = o.x; ty = o.y; col = o.type === 'move' ? 'rgba(126,240,176,0.35)' : 'rgba(255,92,92,0.35)'; }
      else if (o.target && !o.target.dead) { tx = o.target.x; ty = o.target.y; col = o.type === 'mine' ? 'rgba(255,207,107,0.3)' : 'rgba(255,92,92,0.35)'; }
      else continue;
      ctx.strokeStyle = col; ctx.setLineDash([6 / z, 6 / z]);
      ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const s of g.selection) {
      if (s.kind !== 'structure' || !s.def.produces) continue;
      const r = s.rally || g.defaultRally(s);
      ctx.strokeStyle = 'rgba(255,207,107,0.55)'; ctx.setLineDash([4 / z, 6 / z]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(r.x, r.y - 14 / z); ctx.lineTo(r.x, r.y + 6 / z); ctx.stroke();
      ctx.fillStyle = 'rgba(255,207,107,0.8)';
      ctx.beginPath(); ctx.moveTo(r.x, r.y - 14 / z); ctx.lineTo(r.x + 10 / z, r.y - 10 / z); ctx.lineTo(r.x, r.y - 6 / z); ctx.fill();
    }
  }

  // Révélation hyperespace : clip progressif de gauche à droite dans le repère du vaisseau
  hyperClip(e, dur = 3.0) {
    const k = Utils.clamp((this.game.time - e.spawnTime) / dur, 0, 1);
    if (k >= 1 || e.type !== 'mothership') return false;
    const ctx = this.ctx, r = e.radius * 1.3;
    ctx.beginPath(); ctx.rect(-r, -r, r * 2 * Utils.easeOut(k), r * 2); ctx.clip();
    return true;
  }

  drawStructure(s) {
    const ctx = this.ctx, r = s.radius, g = this.game, z = g.camera.zoom;
    const selected = g.selection.includes(s);
    const alphaShip = 1 - this.iconBlend;
    if (alphaShip > 0) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
      ctx.globalAlpha = alphaShip * (s.building ? 0.4 + 0.5 * s.buildProgress : 1);
      this.hyperClip(s);
      const q = s.queue[0];
      Art.drawStructure(ctx, s.type, s.faction, r, { time: g.time + s.id, turretAngle: s.turretAngle, angle: s.angle, queueType: q ? q.type : null, queueProgress: q ? q.progress / UNIT_TYPES[q.type].buildTime : 0, faction: s.faction });
      ctx.restore();
      if (s.building) {
        ctx.strokeStyle = 'rgba(255,207,107,0.9)'; ctx.lineWidth = 2 / z;
        ctx.beginPath(); ctx.arc(s.x, s.y, r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.buildProgress); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,207,107,0.2)'; ctx.beginPath(); ctx.arc(s.x, s.y, r + 10, 0, Math.PI * 2); ctx.stroke();
      }
      // Impulsion des capteurs du relais
      if (s.type === 'relay' && !s.building) {
        const k = (g.time * 0.35 + s.id * 0.1) % 1;
        ctx.strokeStyle = Utils.rgba(FACTION_COLORS[s.faction].team, 0.25 * (1 - k)); ctx.lineWidth = 1.5 / z;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sensor * k, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (selected) {
      ctx.strokeStyle = '#7ef0b0'; ctx.lineWidth = 1.5 / z;
      this.bracket(s.x, s.y, r + 8);
      if (this.settings.ranges) {
        if (s.range) { ctx.strokeStyle = 'rgba(255,92,92,0.35)'; ctx.setLineDash([6 / z, 8 / z]); ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = 'rgba(95,211,255,0.18)'; ctx.setLineDash([3 / z, 9 / z]); ctx.beginPath(); ctx.arc(s.x, s.y, s.sensor, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
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
        ctx.strokeStyle = `rgba(255,207,107,${0.45 + 0.3 * Math.sin(g.time * 22)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.lastAsteroid.x + Utils.rand(-3, 3), u.lastAsteroid.y + Utils.rand(-3, 3)); ctx.stroke();
      }
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); ctx.globalAlpha = alphaShip;
      Art.drawShip(ctx, u.type, u.faction, r, { moving: u.moving, cargo: u.cargo, capacity: u.capacity, turretAngle: u.turretAngle, angle: u.angle, time: g.time + u.id });
      ctx.restore();
      if (u.repairing && g.time - u.repairing < 0.2) {
        ctx.strokeStyle = `rgba(126,240,176,${0.3 + 0.3 * Math.sin(g.time * 10)})`; ctx.lineWidth = 1 / z;
        ctx.beginPath(); ctx.arc(u.x, u.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (selected) {
      ctx.strokeStyle = '#7ef0b0'; ctx.lineWidth = 1.5 / z;
      this.bracket(u.x, u.y, r + 6);
      if (this.settings.ranges && u.range && g.selection.length <= 3) { ctx.strokeStyle = 'rgba(255,92,92,0.2)'; ctx.setLineDash([4 / z, 8 / z]); ctx.beginPath(); ctx.arc(u.x, u.y, u.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (!this.iconMode && (selected || u.hp < u.maxHp)) this.drawHpBar(u, Math.max(18, r * 2.2), r + 10);
    if (u.group && selected && !this.iconMode) { ctx.fillStyle = '#d7e1ea'; ctx.font = `${10 / z}px Rajdhani, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(u.group, u.x, u.y + r + 20 / z); ctx.textAlign = 'left'; }
  }

  // Coins de sélection (quatre équerres) plutôt qu'un cercle
  bracket(x, y, r) {
    const ctx = this.ctx, l = r * 0.45;
    ctx.beginPath();
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      ctx.moveTo(x + sx * r, y + sy * (r - l)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - l), y + sy * r);
    }
    ctx.stroke();
  }
  drawHpBar(e, w, offset) {
    const ctx = this.ctx, z = this.game.camera.zoom, ratio = Utils.clamp(e.hp / e.maxHp, 0, 1);
    const hh = 3 / z, x = e.x - w / 2, y = e.y - offset;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, hh);
    ctx.fillStyle = ratio > 0.5 ? '#7ef0b0' : ratio > 0.25 ? '#ffcf6b' : '#ff5c5c'; ctx.fillRect(x, y, w * ratio, hh);
  }

  drawIcons(view) {
    const ctx = this.ctx, g = this.game, z = g.camera.zoom, a = this.iconBlend;
    const s = 7 / z;
    ctx.globalAlpha = a;
    for (const st of g.structures) {
      if (!st.seen || !this.visible(st, view, 100)) continue;
      ctx.save(); ctx.translate(st.x, st.y); Art.drawIcon(ctx, 'structure', st.faction, s * 1.2, st.type); ctx.restore();
      if (g.selection.includes(st)) { ctx.strokeStyle = '#7ef0b0'; ctx.lineWidth = 1 / z; this.bracket(st.x, st.y, s * 2.4); }
    }
    for (const gh of g.ghosts) {
      const live = g.structures.find(x => x.id === gh.id); if (live && live.seen) continue;
      ctx.save(); ctx.translate(gh.x, gh.y); ctx.globalAlpha = a * 0.4; Art.drawIcon(ctx, 'structure', gh.faction, s * 1.2, gh.type); ctx.restore(); ctx.globalAlpha = a;
    }
    for (const u of g.units) {
      if (!u.seen || !this.visible(u, view, 50)) continue;
      ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.angle); Art.drawIcon(ctx, u.def.cls, u.faction, s, u.type); ctx.restore();
      if (g.selection.includes(u)) { ctx.strokeStyle = '#7ef0b0'; ctx.lineWidth = 1 / z; this.bracket(u.x, u.y, s * 1.8); }
      if (u.hp < u.maxHp * 0.999) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(u.x - s, u.y - s * 1.8, s * 2, 2 / z); ctx.fillStyle = u.hp / u.maxHp > 0.5 ? '#7ef0b0' : '#ff5c5c'; ctx.fillRect(u.x - s, u.y - s * 1.8, s * 2 * u.hp / u.maxHp, 2 / z); }
    }
    ctx.globalAlpha = 1;
  }

  drawProjectile(p) {
    const ctx = this.ctx, col = FACTION_COLORS[p.faction];
    if (p.kind === 'flak') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-4, -1, 8, 2); ctx.restore();
    } else if (p.kind === 'missile') {
      ctx.strokeStyle = 'rgba(255,200,120,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); p.trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y)); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = col.hull; ctx.fillRect(-5, -1.5, 10, 3); ctx.fillStyle = '#fff2c0'; ctx.fillRect(-7, -1, 2, 2); ctx.restore();
    } else {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col.team); g.addColorStop(1, Utils.rgba(col.team, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = Utils.rgba(col.team, 0.35); ctx.lineWidth = 3; ctx.beginPath(); p.trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y)); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  }

  drawEffect(e) {
    const ctx = this.ctx, k = Utils.clamp(e.t / e.dur, 0, 1), g = this.game, z = g.camera.zoom;
    switch (e.type) {
      case 'beam':
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.color; ctx.lineWidth = e.width || 2;
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1; break;
      case 'ion': {
        const s = e.src, t = e.target;
        if (s.dead || t.dead) break;
        const w = (1 - k) * 7 + 1;
        ctx.strokeStyle = Utils.rgba(e.color, 0.35); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.strokeStyle = e.color; ctx.lineWidth = w; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.35; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(t.x + Utils.rand(-3, 3), t.y + Utils.rand(-3, 3), w * 1.3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'hit': ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.5 + k), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'explosion': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * Utils.easeOut(k), 0, Math.PI * 2); ctx.stroke();
        const core = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 0.6 * (1 - k * 0.4));
        core.addColorStop(0, 'rgba(255,255,240,1)'); core.addColorStop(0.4, 'rgba(255,200,120,0.8)'); core.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.debris ? '#9aa5b1' : e.color;
        const n = e.debris ? 14 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.x * 0.01, sp = 1 + ((i * 7) % 5) * 0.2;
          const d = e.size * 1.5 * Utils.easeOut(k) * sp;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, (e.debris ? 2.6 : 2) * (1 - k) + 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case 'marker': {
        const x = e.follow && !e.follow.dead ? e.follow.x : e.x, y = e.follow && !e.follow.dead ? e.follow.y : e.y;
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 1.5 / z;
        this.bracket(x, y, (22 * (1 - k) + 6) / z); ctx.globalAlpha = 1; break;
      }
      case 'float':
        ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k; ctx.font = `600 ${12 / z}px Rajdhani, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - k * 25 / z); ctx.textAlign = 'left'; ctx.globalAlpha = 1; break;
      case 'hyperspace': {
        // Fenêtre d'hyperespace : plan lumineux qui balaie le vaisseau
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
        const r = e.r * 1.3, px = -r + r * 2 * Utils.easeOut(k);
        const a = k < 0.85 ? 1 : (1 - k) / 0.15;
        ctx.globalAlpha = a;
        const grad = ctx.createLinearGradient(px - 40, 0, px + 10, 0);
        grad.addColorStop(0, 'rgba(95,211,255,0)'); grad.addColorStop(0.7, 'rgba(95,211,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.fillStyle = grad; ctx.fillRect(px - 40, -r, 50, r * 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(px, -r, 2.5, r * 2);
        ctx.strokeStyle = 'rgba(95,211,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore(); ctx.globalAlpha = 1; break;
      }
    }
  }

  drawPlacement(input) {
    const g = this.game, ctx = this.ctx, z = g.camera.zoom;
    if (!g.mode || !g.mode.place) return;
    const def = STRUCTURE_TYPES[g.mode.place];
    ctx.strokeStyle = 'rgba(95,211,255,0.22)'; ctx.lineWidth = 1 / z; ctx.setLineDash([8 / z, 10 / z]);
    for (const s of g.structures) { if (s.dead || s.faction !== FACTION.PLAYER) continue; ctx.beginPath(); ctx.arc(s.x, s.y, CONFIG.BUILD_RADIUS, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    if (!input.mouse.inCanvas) return;
    const ok = g.canPlace(g.mode.place, input.mouse.wx, input.mouse.wy, FACTION.PLAYER);
    ctx.save(); ctx.translate(input.mouse.wx, input.mouse.wy); ctx.globalAlpha = 0.55;
    ctx.rotate(Utils.angleTo(input.mouse.wx, input.mouse.wy, g.W / 2, g.H / 2));
    Art.drawStructure(ctx, g.mode.place, FACTION.PLAYER, def.radius, { time: g.time });
    ctx.restore();
    ctx.strokeStyle = ok ? '#7ef0b0' : '#ff5c5c'; ctx.lineWidth = 1.5 / z;
    this.bracket(input.mouse.wx, input.mouse.wy, def.radius + 8);
    if (def.range) { ctx.strokeStyle = 'rgba(255,92,92,0.3)'; ctx.setLineDash([6 / z, 8 / z]); ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (def.type === 'relay' || def.sensor > 600) { ctx.strokeStyle = 'rgba(95,211,255,0.25)'; ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.sensor, 0, Math.PI * 2); ctx.stroke(); }
  }

  // Brouillard de guerre : voile sombre percé par les capteurs
  drawFog() {
    const g = this.game, f = this.fctx, w = this.fog.width, h = this.fog.height, cam = g.camera;
    f.globalCompositeOperation = 'source-over';
    f.fillStyle = 'rgba(4,6,12,0.74)'; f.fillRect(0, 0, w, h);
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
  drawVignette() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }

  // ---------- Minimap ----------
  renderMinimap(mm) {
    const ctx = mm.getContext('2d'), g = this.game;
    const sx = mm.width / g.W, sy = mm.height / g.H;
    ctx.fillStyle = '#04060b'; ctx.fillRect(0, 0, mm.width, mm.height);
    // Zones de vision
    ctx.fillStyle = 'rgba(95,211,255,0.07)';
    for (const s of g.visionSources || []) { ctx.beginPath(); ctx.arc(s.x * sx, s.y * sy, s.r * sx, 0, Math.PI * 2); ctx.fill(); }
    for (const a of g.asteroids) { ctx.fillStyle = a.seen ? '#7a7060' : '#4a443c'; ctx.fillRect(a.x * sx - 1, a.y * sy - 1, 2.2, 2.2); }
    for (const gh of g.ghosts) { const live = g.structures.find(x => x.id === gh.id); if (live && live.seen) continue; ctx.fillStyle = Utils.rgba(FACTION_COLORS[gh.faction].team, 0.4); ctx.fillRect(gh.x * sx - 2, gh.y * sy - 2, 4, 4); }
    for (const s of g.structures) {
      if (s.dead || !s.seen) continue;
      ctx.fillStyle = FACTION_COLORS[s.faction].team;
      const r = s.type === 'mothership' ? 7 : 4;
      ctx.fillRect(s.x * sx - r / 2, s.y * sy - r / 2, r, r);
    }
    for (const u of g.units) { if (u.dead || !u.seen) continue; ctx.fillStyle = FACTION_COLORS[u.faction].team; ctx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2); }
    // Alertes : vaisseaux ennemis visibles clignotent
    const v = this.viewRect();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
    ctx.strokeRect(v.x1 * sx + 0.5, v.y1 * sy + 0.5, (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);
  }

  // Fond du menu : étoiles, poussière et silhouette du vaisseau-mère
  renderIdle() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, t = performance.now() / 1000;
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, w, h);
    const fake = { x: t * 18, y: Math.sin(t * 0.05) * 60, zoom: 1 };
    this.drawStars(fake, t);
    const grad = ctx.createRadialGradient(w * 0.75, h * 0.4, 0, w * 0.75, h * 0.4, w * 0.6);
    grad.addColorStop(0, 'rgba(60,40,140,0.22)'); grad.addColorStop(0.5, 'rgba(20,80,140,0.08)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w * 0.72, h * 0.52 + Math.sin(t * 0.3) * 10); ctx.rotate(-0.35 + Math.sin(t * 0.1) * 0.03); ctx.globalAlpha = 0.85;
    Art.drawStructure(ctx, 'mothership', FACTION.PLAYER, Math.min(w, h) * 0.26, { time: t });
    ctx.restore();
    this.drawVignette();
  }
}
