// Logique centrale : état de la partie, simulation, commandes
class Game {
  constructor(difficultyKey) {
    this.difficultyKey = difficultyKey;
    this.difficulty = DIFFICULTY[difficultyKey] || DIFFICULTY.normal;
    this.units = []; this.structures = []; this.asteroids = []; this.projectiles = []; this.effects = [];
    this.minerals = {};
    this.minerals[FACTION.PLAYER] = CONFIG.START_MINERALS;
    this.minerals[FACTION.ENEMY] = CONFIG.START_MINERALS + this.difficulty.startBonus;
    this.time = 0; this.speed = 1; this.paused = false; this.state = 'playing';
    this.selection = []; this.groups = {};
    this.mode = null;           // null | { attackMove: true } | { place: 'turret' }
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.stats = { killed: 0, lost: 0, mined: 0 };
    this.ui = null;
    World.generate(this);
    this.ai = new AI(this, FACTION.ENEMY, this.difficulty);
    const base = this.playerBase();
    if (base) { this.camera.x = base.x; this.camera.y = base.y; }
  }

  playerBase() { return this.structures.find(s => s.faction === FACTION.PLAYER && s.type === 'station' && !s.dead); }
  message(text, cls) { if (this.ui) this.ui.message(text, cls); }

  // ---------- Boucle de simulation ----------
  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.time += dt;
    for (const s of this.structures) if (!s.dead) this.updateStructure(s, dt);
    for (const u of this.units) if (!u.dead) this.updateUnit(u, dt);
    this.applySeparation();
    for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt);
    for (const e of this.effects) { e.t += dt; if (e.t >= e.dur) e.dead = true; }
    this.ai.update(dt);
    this.cleanup();
    this.checkEnd();
  }

  updateStructure(s, dt) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    s.rotation += dt * 0.12;
    if (s.building) {
      s.buildProgress = Math.min(1, s.buildProgress + dt / s.def.buildTime);
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.9 * dt / s.def.buildTime);
      if (s.buildProgress >= 1) {
        s.building = false;
        if (s.faction === FACTION.PLAYER) this.message(`${s.def.name} opérationnel${s.def.fem ? 'le' : ''}`, 'good');
      }
      return;
    }
    if (s.queue.length) {
      const item = s.queue[0];
      item.progress += dt;
      if (item.progress >= UNIT_TYPES[item.type].buildTime) {
        s.queue.shift();
        this.spawnFromStructure(s, item.type);
      }
    }
    if (s.def.damage) {
      let t = s.target;
      if (!t || t.dead || Utils.dist(s.x, s.y, t.x, t.y) - t.radius > s.def.range) {
        t = s.target = this.nearestEnemy(s.x, s.y, s.def.range, s.faction);
      }
      if (t) {
        s.turretAngle = Utils.lerpAngle(s.turretAngle, Utils.angleTo(s.x, s.y, t.x, t.y), Math.min(1, dt * 6));
        this.fire(s, t);
      }
    }
  }

  defaultRally(s) {
    const ang = Utils.angleTo(s.x, s.y, CONFIG.WORLD_W / 2, CONFIG.WORLD_H / 2);
    return { x: s.x + Math.cos(ang) * (s.radius + 110), y: s.y + Math.sin(ang) * (s.radius + 110) };
  }

  spawnFromStructure(s, type) {
    const rally = s.rally || this.defaultRally(s);
    const ang = Utils.angleTo(s.x, s.y, rally.x, rally.y);
    const u = this.spawnUnit(type, s.x + Math.cos(ang) * (s.radius + 14), s.y + Math.sin(ang) * (s.radius + 14), s.faction);
    u.angle = ang;
    if (type === 'harvester') {
      const a = this.nearestAsteroid(s.x, s.y, 1500);
      u.order = a ? { type: 'mine', target: a } : { type: 'move', x: rally.x, y: rally.y };
    } else {
      u.order = { type: 'attackMove', x: rally.x + Utils.rand(-35, 35), y: rally.y + Utils.rand(-35, 35) };
    }
    return u;
  }

  spawnUnit(type, x, y, faction) {
    const u = new Unit(type, x, y, faction);
    this.units.push(u);
    return u;
  }

  updateUnit(u, dt) {
    u.cooldown = Math.max(0, u.cooldown - dt);
    u.moving = false;
    u.mining = false;
    let o = u.order;

    // Cible disparue
    if (o && o.target && o.target.dead) {
      if (o.type === 'mine') {
        const a = this.nearestAsteroid(o.target.x, o.target.y, 800);
        o = u.order = a ? { type: 'mine', target: a } : (u.cargo > 0 ? { type: 'return' } : null);
      } else {
        o = u.order = o.resume || null;
      }
    }
    if (!o) {
      if (u.isCombat) {
        const e = this.nearestEnemy(u.x, u.y, u.def.range * CONFIG.AGGRO_RANGE, u.faction);
        if (e) o = u.order = { type: 'attack', target: e, resume: { type: 'guard', x: u.x, y: u.y } };
      }
      if (!o) return;
    }

    switch (o.type) {
      case 'move':
        if (this.moveUnit(u, o.x, o.y, dt)) u.order = null;
        break;
      case 'guard':
        if (this.moveUnit(u, o.x, o.y, dt)) u.order = null;
        break;
      case 'attackMove': {
        const e = u.isCombat ? this.nearestEnemy(u.x, u.y, u.def.range * CONFIG.AGGRO_RANGE, u.faction) : null;
        if (e) { u.order = { type: 'attack', target: e, resume: o }; break; }
        if (this.moveUnit(u, o.x, o.y, dt)) u.order = null;
        break;
      }
      case 'attack': {
        const t = o.target;
        if (!u.isCombat) { u.order = o.resume || null; break; }
        // Laisse : une unité en garde ne poursuit pas trop loin
        if (o.resume && o.resume.type === 'guard' && Utils.dist(u.x, u.y, o.resume.x, o.resume.y) > u.def.range * 2.5) {
          u.order = o.resume; break;
        }
        const d = Utils.dist(u.x, u.y, t.x, t.y) - t.radius;
        if (d <= u.def.range) {
          u.angle = Utils.lerpAngle(u.angle, Utils.angleTo(u.x, u.y, t.x, t.y), Math.min(1, dt * 8));
          this.fire(u, t);
        } else {
          this.moveUnit(u, t.x, t.y, dt, u.def.range * 0.85 + t.radius);
        }
        break;
      }
      case 'mine': this.updateMining(u, o, dt); break;
      case 'return': this.updateReturn(u, o, dt); break;
      default: u.order = null;
    }
  }

  moveUnit(u, tx, ty, dt, stopDist = 6) {
    const dx = tx - u.x, dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d <= stopDist) return true;
    const step = Math.min(d - stopDist + 0.01, u.def.speed * dt);
    u.x += dx / d * step; u.y += dy / d * step;
    u.angle = Utils.lerpAngle(u.angle, Math.atan2(dy, dx), Math.min(1, dt * 10));
    u.moving = true;
    u.x = Utils.clamp(u.x, 10, CONFIG.WORLD_W - 10);
    u.y = Utils.clamp(u.y, 10, CONFIG.WORLD_H - 10);
    return false;
  }

  updateMining(u, o, dt) {
    const a = o.target;
    if (u.cargo >= u.def.capacity - 0.01) { u.order = { type: 'return', asteroid: a }; return; }
    const stop = a.radius + u.radius + 6;
    if (Utils.dist(u.x, u.y, a.x, a.y) > stop + 3) { this.moveUnit(u, a.x, a.y, dt, stop); return; }
    u.angle = Utils.lerpAngle(u.angle, Utils.angleTo(u.x, u.y, a.x, a.y), Math.min(1, dt * 6));
    const amt = Math.min(u.def.mineRate * dt, a.minerals, u.def.capacity - u.cargo);
    a.minerals -= amt; u.cargo += amt;
    u.lastAsteroid = a; u.mining = true;
    if (a.minerals <= 0.01) {
      a.minerals = 0; a.dead = true;
      this.effects.push(new Effect('explosion', { x: a.x, y: a.y, dur: 0.8, size: a.radius * 1.5, color: '#8c8275' }));
    }
  }

  updateReturn(u, o, dt) {
    const s = this.nearestStructure(u.faction, u.x, u.y, st => st.def.deposit && !st.building);
    if (!s) { u.order = null; return; }
    const stop = s.radius + u.radius + 8;
    if (Utils.dist(u.x, u.y, s.x, s.y) > stop + 3) { this.moveUnit(u, s.x, s.y, dt, stop); return; }
    let amt = u.cargo;
    if (u.faction === FACTION.ENEMY) amt *= this.difficulty.income;
    this.minerals[u.faction] += amt;
    if (u.faction === FACTION.PLAYER) {
      this.stats.mined += amt;
      this.effects.push(new Effect('float', { x: u.x, y: u.y - 12, text: '+' + Math.round(amt), dur: 1.1, color: '#ffd54f' }));
    }
    u.cargo = 0;
    const prev = o.asteroid && !o.asteroid.dead ? o.asteroid : this.nearestAsteroid(o.asteroid ? o.asteroid.x : u.x, o.asteroid ? o.asteroid.y : u.y, 900);
    u.order = prev ? { type: 'mine', target: prev } : null;
  }

  fire(src, t) {
    if (src.cooldown > 0) return;
    const def = src.def;
    src.cooldown = def.fireRate;
    const col = FACTION_COLORS[src.faction].main;
    if (def.projectile === 'laser') {
      t.takeDamage(def.damage, this, src);
      const hx = t.x + Utils.rand(-t.radius * 0.5, t.radius * 0.5), hy = t.y + Utils.rand(-t.radius * 0.5, t.radius * 0.5);
      this.effects.push(new Effect('beam', { x1: src.x, y1: src.y, x2: hx, y2: hy, dur: 0.12, color: col }));
      this.effects.push(new Effect('hit', { x: hx, y: hy, dur: 0.25, size: 5, color: '#ffffff' }));
    } else {
      const ang = Utils.angleTo(src.x, src.y, t.x, t.y);
      const plasma = def.projectile === 'plasma';
      this.projectiles.push(new Projectile({
        x: src.x + Math.cos(ang) * src.radius, y: src.y + Math.sin(ang) * src.radius,
        kind: def.projectile, target: t, damage: def.damage, faction: src.faction, owner: src,
        speed: plasma ? 240 : 330, turn: plasma ? 1.2 : 5.5, angle: ang, life: 4,
      }));
    }
  }

  updateProjectile(p, dt) {
    p.life -= dt;
    if (p.life <= 0) { p.dead = true; return; }
    const t = p.target;
    if (t && !t.dead) {
      let d = Utils.angleTo(p.x, p.y, t.x, t.y) - p.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const maxTurn = p.turn * dt;
      p.angle += Utils.clamp(d, -maxTurn, maxTurn);
    }
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 6) p.trail.shift();
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (t && !t.dead && Utils.dist(p.x, p.y, t.x, t.y) <= t.radius + 4) {
      t.takeDamage(p.damage, this, p.owner);
      p.dead = true;
      const plasma = p.kind === 'plasma';
      this.effects.push(new Effect('explosion', { x: p.x, y: p.y, dur: plasma ? 0.45 : 0.3, size: plasma ? 24 : 12, color: FACTION_COLORS[p.faction].main }));
    } else if (p.x < -50 || p.y < -50 || p.x > CONFIG.WORLD_W + 50 || p.y > CONFIG.WORLD_H + 50) {
      p.dead = true;
    }
  }

  // Évite l'empilement des unités et les fait sortir des structures
  applySeparation() {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i]; if (a.dead) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.radius + b.radius + 3;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 < 0.01) { a.x += Utils.rand(-1, 1); a.y += Utils.rand(-1, 1); continue; }
        const d = Math.sqrt(d2), push = (min - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        const wa = b.radius / (a.radius + b.radius), wb = a.radius / (a.radius + b.radius);
        a.x -= nx * push * wa; a.y -= ny * push * wa;
        b.x += nx * push * wb; b.y += ny * push * wb;
      }
      for (const s of this.structures) {
        if (s.dead) continue;
        const dx = a.x - s.x, dy = a.y - s.y;
        const min = a.radius + s.radius + 2;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        a.x = s.x + dx / d * min; a.y = s.y + dy / d * min;
      }
    }
  }

  cleanup() {
    const alive = e => !e.dead;
    this.units = this.units.filter(alive);
    this.structures = this.structures.filter(alive);
    this.asteroids = this.asteroids.filter(alive);
    this.projectiles = this.projectiles.filter(alive);
    this.effects = this.effects.filter(alive);
  }

  onDeath(e, attacker) {
    if (e.kind !== 'unit' && e.kind !== 'structure') return;
    const col = FACTION_COLORS[e.faction].main;
    this.effects.push(new Effect('explosion', { x: e.x, y: e.y, dur: e.kind === 'structure' ? 1.2 : 0.6, size: e.radius * 2.2, color: col }));
    if (e.kind === 'unit') {
      if (e.faction === FACTION.PLAYER) this.stats.lost++; else this.stats.killed++;
    } else {
      const f = e.def.fem ? 'e' : '';
      if (e.faction === FACTION.PLAYER) this.message(`${e.def.name} détruit${f} !`, 'warn');
      else this.message(`${e.def.name} ennemi${f} détruit${f} !`, 'good');
    }
    this.selection = this.selection.filter(s => s !== e);
    for (const k in this.groups) this.groups[k] = this.groups[k].filter(s => s !== e);
  }

  checkEnd() {
    const pAlive = this.structures.some(s => s.faction === FACTION.PLAYER && !s.dead);
    const eAlive = this.structures.some(s => s.faction === FACTION.ENEMY && !s.dead);
    if (!pAlive) { this.state = 'lost'; if (this.ui) this.ui.showEnd(false); }
    else if (!eAlive) { this.state = 'won'; if (this.ui) this.ui.showEnd(true); }
  }

  // ---------- Requêtes spatiales ----------
  nearestEnemy(x, y, range, faction) {
    let best = null, bd = Infinity;
    const check = (e) => {
      if (e.dead || e.faction === faction || e.faction === FACTION.NEUTRAL) return;
      const d = Utils.dist(x, y, e.x, e.y) - e.radius;
      if (d <= range && d < bd) { bd = d; best = e; }
    };
    for (const u of this.units) check(u);
    for (const s of this.structures) check(s);
    return best;
  }
  enemiesNear(x, y, range, faction) {
    const out = [];
    for (const u of this.units) if (!u.dead && u.faction !== faction && u.faction !== FACTION.NEUTRAL && Utils.dist(x, y, u.x, u.y) <= range) out.push(u);
    return out;
  }
  nearestAsteroid(x, y, range) {
    let best = null, bd = range * range;
    for (const a of this.asteroids) {
      if (a.dead || a.minerals <= 0) continue;
      const d = Utils.dist2(x, y, a.x, a.y);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
  nearestStructure(faction, x, y, filter) {
    let best = null, bd = Infinity;
    for (const s of this.structures) {
      if (s.dead || s.faction !== faction || (filter && !filter(s))) continue;
      const d = Utils.dist2(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  entityAt(wx, wy, tolerance = 6) {
    let best = null, bd = Infinity;
    const check = (e, extra) => {
      if (e.dead) return;
      const d = Utils.dist(wx, wy, e.x, e.y);
      if (d <= e.radius + tolerance + extra && d < bd) { bd = d; best = e; }
    };
    for (const u of this.units) check(u, 4);
    if (best) return best;
    for (const s of this.structures) check(s, 0);
    if (best) return best;
    for (const a of this.asteroids) check(a, 0);
    return best;
  }
  playerEntitiesInRect(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const inside = e => !e.dead && e.faction === FACTION.PLAYER && e.x >= minX - e.radius && e.x <= maxX + e.radius && e.y >= minY - e.radius && e.y <= maxY + e.radius;
    const units = this.units.filter(inside);
    if (units.length) return units;
    return this.structures.filter(inside);
  }

  // ---------- Commandes ----------
  select(entities, add = false) {
    if (!add) this.selection = [];
    for (const e of entities) if (!this.selection.includes(e)) this.selection.push(e);
    // Ne pas mélanger unités et structures
    if (this.selection.some(e => e.kind === 'unit')) this.selection = this.selection.filter(e => e.kind === 'unit');
  }
  selectedUnits() { return this.selection.filter(e => e.kind === 'unit' && !e.dead); }
  selectedStructures() { return this.selection.filter(e => e.kind === 'structure' && !e.dead); }

  formation(units, x, y, type) {
    const n = units.length;
    if (!n) return;
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), spacing = 36;
    units.forEach((u, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const ox = (c - (cols - 1) / 2) * spacing, oy = (r - (rows - 1) / 2) * spacing;
      u.order = { type, x: Utils.clamp(x + ox, 10, CONFIG.WORLD_W - 10), y: Utils.clamp(y + oy, 10, CONFIG.WORLD_H - 10) };
    });
  }
  commandMove(units, x, y) {
    this.formation(units, x, y, 'move');
    this.effects.push(new Effect('marker', { x, y, dur: 0.6, color: '#69f0ae' }));
  }
  commandAttackMove(units, x, y) {
    this.formation(units, x, y, 'attackMove');
    this.effects.push(new Effect('marker', { x, y, dur: 0.6, color: '#ff5252' }));
  }
  commandAttack(units, target) {
    for (const u of units) {
      if (u.isCombat) u.order = { type: 'attack', target, resume: null };
      else u.order = { type: 'move', x: target.x, y: target.y };
    }
    this.effects.push(new Effect('marker', { x: target.x, y: target.y, dur: 0.6, color: '#ff5252' }));
  }
  commandMine(units, asteroid) {
    for (const u of units) {
      if (u.type === 'harvester') u.order = { type: 'mine', target: asteroid };
      else u.order = { type: 'attackMove', x: asteroid.x, y: asteroid.y };
    }
    this.effects.push(new Effect('marker', { x: asteroid.x, y: asteroid.y, dur: 0.6, color: '#ffd54f' }));
  }
  commandReturn(units) {
    for (const u of units) if (u.type === 'harvester') u.order = { type: 'return', asteroid: u.lastAsteroid };
  }
  commandStop(units) { for (const u of units) u.order = null; }
  commandRally(structures, x, y) {
    for (const s of structures) s.rally = { x, y };
    this.effects.push(new Effect('marker', { x, y, dur: 0.6, color: '#ffd54f' }));
  }

  queueProduction(s, type) {
    const def = UNIT_TYPES[type];
    const player = s.faction === FACTION.PLAYER;
    if (!def || !s.def.produces || !s.def.produces.includes(type) || s.building) return false;
    if (s.queue.length >= 5) { if (player) this.message('File de production pleine', 'warn'); return false; }
    if (this.minerals[s.faction] < def.cost) { if (player) this.message('Minéraux insuffisants', 'warn'); return false; }
    this.minerals[s.faction] -= def.cost;
    s.queue.push({ type, progress: 0 });
    return true;
  }
  cancelProduction(s, index) {
    const it = s.queue.splice(index, 1)[0];
    if (it) this.minerals[s.faction] += UNIT_TYPES[it.type].cost;
  }

  canPlace(type, x, y, faction) {
    const def = STRUCTURE_TYPES[type];
    if (!def) return false;
    const r = def.radius;
    if (x < r || y < r || x > CONFIG.WORLD_W - r || y > CONFIG.WORLD_H - r) return false;
    const near = this.structures.some(s => !s.dead && s.faction === faction && Utils.dist(s.x, s.y, x, y) <= CONFIG.BUILD_RADIUS);
    if (!near) return false;
    for (const s of this.structures) if (!s.dead && Utils.dist(s.x, s.y, x, y) < s.radius + r + 14) return false;
    for (const a of this.asteroids) if (!a.dead && Utils.dist(a.x, a.y, x, y) < a.radius + r + 10) return false;
    return true;
  }
  placeStructure(type, x, y, faction) {
    const def = STRUCTURE_TYPES[type];
    const player = faction === FACTION.PLAYER;
    if (!this.canPlace(type, x, y, faction)) { if (player) this.message('Emplacement invalide : construisez près d\'un bâtiment allié', 'warn'); return null; }
    if (this.minerals[faction] < def.cost) { if (player) this.message('Minéraux insuffisants', 'warn'); return null; }
    this.minerals[faction] -= def.cost;
    const s = new Structure(type, x, y, faction, false);
    this.structures.push(s);
    return s;
  }
}
