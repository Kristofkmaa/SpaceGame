// Rendu du monde sur le canvas principal et de la minimap
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = null;
    this.TILE = 1800;
    this.stars = [
      { f: 0.12, pts: World.makeStars(260, 11, this.TILE), col: '#8aa4c8' },
      { f: 0.28, pts: World.makeStars(180, 23, this.TILE), col: '#c9d8f2' },
      { f: 0.55, pts: World.makeStars(90, 37, this.TILE), col: '#ffffff' },
    ];
    this.nebulae = [
      { x: 1100, y: 700, r: 900, c: 'rgba(90, 40, 160,' },
      { x: 3200, y: 2300, r: 1000, c: 'rgba(20, 90, 150,' },
      { x: 2100, y: 1500, r: 700, c: 'rgba(150, 60, 90,' },
    ];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setGame(game) { this.game = game; }

  // Fond animé affiché sur l'écran de démarrage
  renderIdle() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = '#04060e';
    ctx.fillRect(0, 0, w, h);
    const saved = this.game;
    this.game = { camera: { x: performance.now() * 0.02, y: 0, zoom: 1 }, time: performance.now() / 1000 };
    this.drawStars();
    this.game = saved;
  }
  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

  toScreen(wx, wy) {
    const c = this.game.camera;
    return { x: (wx - c.x) * c.zoom + this.canvas.width / 2, y: (wy - c.y) * c.zoom + this.canvas.height / 2 };
  }
  toWorld(sx, sy) {
    const c = this.game.camera;
    return { x: (sx - this.canvas.width / 2) / c.zoom + c.x, y: (sy - this.canvas.height / 2) / c.zoom + c.y };
  }
  viewRect() {
    const a = this.toWorld(0, 0), b = this.toWorld(this.canvas.width, this.canvas.height);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }
  visible(e, view, margin = 60) {
    const m = margin + e.radius;
    return e.x > view.x1 - m && e.x < view.x2 + m && e.y > view.y1 - m && e.y < view.y2 + m;
  }

  render(input) {
    const ctx = this.ctx, g = this.game, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = '#04060e';
    ctx.fillRect(0, 0, w, h);
    this.drawStars();

    const cam = g.camera;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    const view = this.viewRect();

    this.drawNebulae();
    this.drawBounds();
    for (const a of g.asteroids) if (this.visible(a, view)) this.drawAsteroid(a);
    this.drawOrders();
    for (const s of g.structures) if (this.visible(s, view, 300)) this.drawStructure(s);
    for (const u of g.units) if (this.visible(u, view)) this.drawUnit(u);
    for (const p of g.projectiles) if (!p.dead) this.drawProjectile(p);
    for (const e of g.effects) this.drawEffect(e);
    this.drawPlacement(input);
    ctx.restore();

    // Rectangle de sélection
    if (input.selBox) {
      const b = input.selBox;
      ctx.strokeStyle = 'rgba(105,240,174,0.9)';
      ctx.fillStyle = 'rgba(105,240,174,0.08)';
      ctx.lineWidth = 1;
      const x = Math.min(b.x1, b.x2), y = Math.min(b.y1, b.y2);
      ctx.fillRect(x, y, Math.abs(b.x2 - b.x1), Math.abs(b.y2 - b.y1));
      ctx.strokeRect(x + 0.5, y + 0.5, Math.abs(b.x2 - b.x1), Math.abs(b.y2 - b.y1));
    }
    if (g.paused && g.state === 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#cfe3ff';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSE', w / 2, h / 2);
      ctx.textAlign = 'left';
    }
  }

  drawStars() {
    const ctx = this.ctx, cam = this.game.camera, w = this.canvas.width, h = this.canvas.height, T = this.TILE;
    const t = this.game.time;
    for (const layer of this.stars) {
      const ox = -((cam.x * layer.f * cam.zoom) % T), oy = -((cam.y * layer.f * cam.zoom) % T);
      ctx.fillStyle = layer.col;
      for (let tx = -1; tx <= Math.ceil(w / T); tx++) {
        for (let ty = -1; ty <= Math.ceil(h / T); ty++) {
          for (const s of layer.pts) {
            const x = s.x + ox + tx * T, y = s.y + oy + ty * T;
            if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
            const tw = 0.75 + 0.25 * Math.sin(t * 1.5 + s.tw);
            ctx.globalAlpha = s.b * tw;
            const sz = s.s * (0.7 + layer.f);
            ctx.fillRect(x, y, sz, sz);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawNebulae() {
    const ctx = this.ctx;
    for (const n of this.nebulae) {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.c + '0.16)');
      grad.addColorStop(1, n.c + '0)');
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
  }

  drawBounds() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(79,195,247,0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 14]);
    ctx.strokeRect(0, 0, CONFIG.WORLD_W, CONFIG.WORLD_H);
    ctx.setLineDash([]);
  }

  drawAsteroid(a) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation + this.game.time * a.spin);
    const ratio = a.minerals / a.maxMinerals;
    ctx.beginPath();
    a.shape.forEach((p, i) => {
      const x = Math.cos(p.a) * p.r * a.radius, y = Math.sin(p.a) * p.r * a.radius;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#5a5248';
    ctx.fill();
    ctx.strokeStyle = '#8c8275';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Veines de minerai
    ctx.fillStyle = `rgba(255, 213, 79, ${0.35 + 0.55 * ratio})`;
    for (let i = 0; i < 4; i++) {
      const ang = a.shape[i * 2 % a.shape.length].a + 0.4;
      const d = a.radius * 0.45;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, 1.6 + a.radius * 0.08 * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawOrders() {
    const ctx = this.ctx, g = this.game;
    for (const u of g.selection) {
      if (u.kind !== 'unit' || !u.order) continue;
      const o = u.order;
      let tx, ty, col;
      if (o.type === 'move' || o.type === 'attackMove' || o.type === 'guard') { tx = o.x; ty = o.y; col = o.type === 'move' ? 'rgba(105,240,174,0.35)' : 'rgba(255,82,82,0.35)'; }
      else if (o.target && !o.target.dead) { tx = o.target.x; ty = o.target.y; col = o.type === 'mine' ? 'rgba(255,213,79,0.3)' : 'rgba(255,82,82,0.35)'; }
      else continue;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Points de ralliement des structures sélectionnées
    for (const s of g.selection) {
      if (s.kind !== 'structure' || !s.rally) continue;
      ctx.strokeStyle = 'rgba(255,213,79,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.rally.x, s.rally.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(s.rally.x, s.rally.y - 14); ctx.lineTo(s.rally.x, s.rally.y + 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,213,79,0.8)';
      ctx.beginPath(); ctx.moveTo(s.rally.x, s.rally.y - 14); ctx.lineTo(s.rally.x + 10, s.rally.y - 10); ctx.lineTo(s.rally.x, s.rally.y - 6); ctx.fill();
    }
  }

  drawStructure(s) {
    const ctx = this.ctx, col = FACTION_COLORS[s.faction], r = s.radius;
    const selected = this.game.selection.includes(s);
    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.building) ctx.globalAlpha = 0.45 + 0.4 * s.buildProgress;

    if (s.type === 'station') {
      // Anneau externe rotatif
      ctx.save();
      ctx.rotate(s.rotation);
      ctx.strokeStyle = col.main; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
        ctx.fillStyle = col.dark;
        ctx.fillRect(Math.cos(a) * r - 7, Math.sin(a) * r - 7, 14, 14);
      }
      ctx.restore();
      // Corps central
      const grad = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 2, 0, 0, r * 0.55);
      grad.addColorStop(0, col.light); grad.addColorStop(1, col.dark);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col.main; ctx.lineWidth = 2; ctx.stroke();
      // Lumière pulsante
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(this.game.time * 3)})`;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    } else if (s.type === 'shipyard') {
      ctx.fillStyle = col.dark; ctx.strokeStyle = col.main; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(-r, -r * 0.7, r * 2, r * 1.4); ctx.fill(); ctx.stroke();
      // Hangar
      ctx.fillStyle = '#060a14';
      ctx.fillRect(-r * 0.75, -r * 0.35, r * 1.5, r * 0.7);
      ctx.strokeStyle = col.light; ctx.lineWidth = 1;
      ctx.strokeRect(-r * 0.75, -r * 0.35, r * 1.5, r * 0.7);
      // Grue
      ctx.strokeStyle = col.main; ctx.lineWidth = 2;
      const k = Math.sin(this.game.time * 1.2) * r * 0.5;
      ctx.beginPath(); ctx.moveTo(k, -r * 0.7); ctx.lineTo(k, r * 0.7); ctx.stroke();
      if (s.queue.length) {
        ctx.fillStyle = `rgba(255,213,79,${0.4 + 0.4 * Math.sin(this.game.time * 6)})`;
        ctx.beginPath(); ctx.arc(k, 0, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (s.type === 'turret') {
      ctx.fillStyle = col.dark; ctx.strokeStyle = col.main; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(s.turretAngle);
      ctx.fillStyle = col.main;
      ctx.fillRect(0, -3, r * 1.5, 6);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fillStyle = col.light; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Construction en cours
    if (s.building) {
      ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.buildProgress); ctx.stroke();
    }
    ctx.restore();

    if (selected) {
      ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2); ctx.stroke();
      if (s.def.range) {
        ctx.strokeStyle = 'rgba(255,82,82,0.3)'; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.def.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (selected || s.hp < s.maxHp || s.building) this.drawHpBar(s, r * 2, r + 12);
  }

  drawUnit(u) {
    const ctx = this.ctx, col = FACTION_COLORS[u.faction], r = u.radius;
    const selected = this.game.selection.includes(u);

    // Rayon d'extraction
    if (u.mining && u.lastAsteroid && !u.lastAsteroid.dead) {
      ctx.strokeStyle = `rgba(255,213,79,${0.5 + 0.3 * Math.sin(this.game.time * 20)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.lastAsteroid.x + Utils.rand(-3, 3), u.lastAsteroid.y + Utils.rand(-3, 3)); ctx.stroke();
    }

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.angle);
    // Propulsion
    if (u.moving) {
      const f = 0.7 + Math.random() * 0.6;
      ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
      ctx.beginPath(); ctx.ellipse(-r * 1.05, 0, r * 0.55 * f, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 220, 0.9)';
      ctx.beginPath(); ctx.ellipse(-r * 0.95, 0, r * 0.25 * f, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = col.main; ctx.strokeStyle = col.light; ctx.lineWidth = 1;
    ctx.beginPath();
    const P = (pts) => { pts.forEach((p, i) => i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r)); ctx.closePath(); };
    switch (u.type) {
      case 'fighter':
        P([[1.1, 0], [-0.9, 0.8], [-0.45, 0], [-0.9, -0.8]]);
        break;
      case 'frigate':
        P([[1.3, 0], [0.3, 0.5], [-0.5, 1.0], [-1.0, 0.45], [-1.0, -0.45], [-0.5, -1.0], [0.3, -0.5]]);
        break;
      case 'cruiser':
        P([[1.35, 0], [0.6, 0.5], [-0.3, 0.6], [-0.5, 1.05], [-1.15, 0.95], [-1.0, 0.3], [-1.0, -0.3], [-1.15, -0.95], [-0.5, -1.05], [-0.3, -0.6], [0.6, -0.5]]);
        break;
      default: // collecteur
        P([[0.9, 0.45], [0.5, 0.75], [-0.9, 0.75], [-0.9, -0.75], [0.5, -0.75], [0.9, -0.45]]);
    }
    ctx.fill(); ctx.stroke();
    if (u.type === 'harvester') {
      ctx.strokeStyle = col.light; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r * 0.9, r * 0.45); ctx.lineTo(r * 1.4, r * 0.7); ctx.moveTo(r * 0.9, -r * 0.45); ctx.lineTo(r * 1.4, -r * 0.7); ctx.stroke();
      if (u.cargo > 0) {
        ctx.fillStyle = '#ffd54f';
        const cw = r * 1.4 * (u.cargo / u.def.capacity);
        ctx.fillRect(-r * 0.7, -r * 0.3, cw, r * 0.6);
      }
    } else {
      // Cockpit
      ctx.fillStyle = col.light;
      ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (selected) {
      ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(u.x, u.y, r + 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (selected || u.hp < u.maxHp) this.drawHpBar(u, Math.max(18, r * 2.2), r + 10);
    if (u.group && selected) {
      ctx.fillStyle = '#cfe3ff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(u.group, u.x, u.y + r + 20); ctx.textAlign = 'left';
    }
  }

  drawHpBar(e, w, offset) {
    const ctx = this.ctx, ratio = Utils.clamp(e.hp / e.maxHp, 0, 1);
    const x = e.x - w / 2, y = e.y - offset;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = ratio > 0.5 ? '#69f0ae' : ratio > 0.25 ? '#ffd54f' : '#ff5252';
    ctx.fillRect(x, y, w * ratio, 4);
  }

  drawProjectile(p) {
    const ctx = this.ctx, col = FACTION_COLORS[p.faction];
    if (p.kind === 'missile') {
      ctx.strokeStyle = 'rgba(255,200,120,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath();
      p.trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y));
      ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = col.light; ctx.fillRect(-5, -1.5, 10, 3);
      ctx.restore();
    } else {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, col.main); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawEffect(e) {
    const ctx = this.ctx, k = Utils.clamp(e.t / e.dur, 0, 1);
    switch (e.type) {
      case 'beam':
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case 'hit':
        ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.5 + k), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'explosion': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size * k, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255, 220, 150, ${(1 - k) * 0.8})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.5 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.color;
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.x * 0.01;
          const d = e.size * 1.4 * k;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 2.2 * (1 - k) + 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'marker':
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 18 * (1 - k) + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(e.x - 6, e.y); ctx.lineTo(e.x + 6, e.y); ctx.moveTo(e.x, e.y - 6); ctx.lineTo(e.x, e.y + 6); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case 'float':
        ctx.fillStyle = e.color; ctx.globalAlpha = 1 - k; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - k * 25); ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
        break;
    }
  }

  drawPlacement(input) {
    const g = this.game, ctx = this.ctx;
    if (!g.mode || !g.mode.place) return;
    const def = STRUCTURE_TYPES[g.mode.place];
    // Zones constructibles
    ctx.strokeStyle = 'rgba(79,195,247,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([8, 10]);
    for (const s of g.structures) {
      if (s.dead || s.faction !== FACTION.PLAYER) continue;
      ctx.beginPath(); ctx.arc(s.x, s.y, CONFIG.BUILD_RADIUS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (!input.mouse.inCanvas) return;
    const ok = g.canPlace(g.mode.place, input.mouse.wx, input.mouse.wy, FACTION.PLAYER);
    ctx.fillStyle = ok ? 'rgba(105,240,174,0.25)' : 'rgba(255,82,82,0.25)';
    ctx.strokeStyle = ok ? '#69f0ae' : '#ff5252'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (def.range) {
      ctx.strokeStyle = 'rgba(255,82,82,0.3)'; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.arc(input.mouse.wx, input.mouse.wy, def.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  renderMinimap(mm) {
    const ctx = mm.getContext('2d'), g = this.game;
    const sx = mm.width / CONFIG.WORLD_W, sy = mm.height / CONFIG.WORLD_H;
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, mm.width, mm.height);
    for (const a of g.asteroids) {
      ctx.fillStyle = '#7a7060';
      ctx.fillRect(a.x * sx - 1, a.y * sy - 1, 2.5, 2.5);
    }
    for (const s of g.structures) {
      if (s.dead) continue;
      ctx.fillStyle = FACTION_COLORS[s.faction].main;
      const r = Math.max(3, s.radius * sx * 1.6);
      ctx.fillRect(s.x * sx - r / 2, s.y * sy - r / 2, r, r);
    }
    for (const u of g.units) {
      if (u.dead) continue;
      ctx.fillStyle = FACTION_COLORS[u.faction].main;
      ctx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2);
    }
    // Cadre caméra
    const v = this.viewRect();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(v.x1 * sx + 0.5, v.y1 * sy + 0.5, (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);
  }
}
