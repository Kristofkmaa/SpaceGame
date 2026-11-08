// ============ Simulation : état, ordres, combat, économie, recherche ============
class Game {
  constructor(settings, audio) {
    this.settings = settings;
    this.difficulty = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
    const map = CONFIG.MAPS[settings.map] || CONFIG.MAPS.medium;
    this.W = map.w; this.H = map.h;
    this.audio = audio;
    this.ui = null;

    this.units = []; this.structures = []; this.asteroids = []; this.projectiles = []; this.effects = [];
    this.dust = [];
    this.ghosts = [];
    const startRU = (CONFIG.RESOURCES[settings.resources] || CONFIG.RESOURCES.normal).v;
    this.ru = { [FACTION.PLAYER]: startRU, [FACTION.ENEMY]: startRU + this.difficulty.startBonus };
    this.upgrades = { [FACTION.PLAYER]: { armor: 0, weapons: 0, engines: 0, mining: 0, sensors: 0 }, [FACTION.ENEMY]: { armor: 0, weapons: 0, engines: 0, mining: 0, sensors: 0 } };
    this.researched = { [FACTION.PLAYER]: new Set(), [FACTION.ENEMY]: new Set() };

    this.time = 0; this.speed = 1; this.paused = false; this.state = 'playing';
    this.selection = []; this.groups = {};
    this.mode = null;             // null | {attackMove:true} | {place:'turret'}
    this.formation = 'delta';
    this.camera = { x: 0, y: 0, zoom: 0.9 };
    this.stats = { killed: 0, lost: 0, mined: 0, structuresKilled: 0, structuresLost: 0, built: 0 };
    this.flags = {};
    this.visTimer = 0;

    World.generate(this);
    this.ai = new AI(this, FACTION.ENEMY, this.difficulty);
    const base = this.playerBase();
    if (base) { this.camera.x = base.x; this.camera.y = base.y; }
  }

  // ---------- Accès ----------
  playerBase() { return this.structures.find(s => s.faction === FACTION.PLAYER && s.type === 'mothership' && !s.dead); }
  mult(faction, key) { return 1 + (this.upgrades[faction] ? this.upgrades[faction][key] : 0); }
  capUsed(f) { let n = 0; for (const u of this.units) if (!u.dead && u.faction === f) n += u.def.cap; for (const s of this.structures) if (!s.dead && s.faction === f) for (const q of s.queue) n += UNIT_TYPES[q.type].cap; return n; }
  capMax(f) { let n = 0; for (const s of this.structures) if (!s.dead && s.faction === f && !s.building) n += s.def.cap; return n; }
  log(text, cls) { if (this.ui) this.ui.log(text, cls); }
  sfx(name, x, y) { if (this.audio) this.audio.play(name, x, y); }

  // ---------- Boucle ----------
  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.time += dt;
    for (const s of this.structures) if (!s.dead) this.updateStructure(s, dt);
    for (const u of this.units) if (!u.dead) this.updateUnit(u, dt);
    this.applySeparation();
    for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt);
    for (const e of this.effects) {
      e.t += dt;
      if (e.type === 'ion') {
        if (e.src.dead || e.target.dead) { e.dead = true; continue; }
        const due = e.dmg * Math.min(1, e.t / e.dur) - e.dealt;
        if (due > 0) { e.target.takeDamage(due, this, e.src); e.dealt += due; }
      }
      if (e.t >= e.dur) e.dead = true;
    }
    this.visTimer += dt;
    if (this.visTimer >= CONFIG.VIS_TICK) { this.visTimer = 0; this.updateVisibility(); this.scriptedEvents(); }
    this.ai.update(dt);
    this.cleanup();
    this.checkEnd();
  }

  // Visibilité côté joueur (brouillard de guerre)
  updateVisibility() {
    const sources = [];
    for (const u of this.units) if (!u.dead && u.faction === FACTION.PLAYER) sources.push({ x: u.x, y: u.y, r: u.sensor });
    for (const s of this.structures) if (!s.dead && s.faction === FACTION.PLAYER) sources.push({ x: s.x, y: s.y, r: s.building ? s.sensor * 0.4 : s.sensor });
    this.visionSources = sources;
    const see = (e) => { for (const s of sources) { const r = s.r + e.radius; if (Utils.dist2(s.x, s.y, e.x, e.y) <= r * r) return true; } return false; };
    for (const u of this.units) if (u.faction !== FACTION.PLAYER) u.seen = see(u);
    for (const s of this.structures) if (s.faction !== FACTION.PLAYER) {
      s.seen = see(s);
      if (s.seen) {
        let g = this.ghosts.find(x => x.id === s.id);
        if (!g) this.ghosts.push({ id: s.id, x: s.x, y: s.y, type: s.type, faction: s.faction });
      }
    }
    for (const a of this.asteroids) a.seen = see(a);
  }
  isVisiblePoint(x, y) {
    if (!this.visionSources) return true;
    for (const s of this.visionSources) if (Utils.dist2(s.x, s.y, x, y) <= s.r * s.r) return true;
    return false;
  }

  // Journal du commandement de flotte : événements scénarisés
  scriptedEvents() {
    const f = this.flags, t = this.time;
    if (!f.intro1 && t > 2.5) { f.intro1 = true; this.log('Sortie d’hyperespace réussie. Vaisseau‑mère opérationnel.', 'sys'); }
    if (!f.intro2 && t > 7) { f.intro2 = true; this.log('Gisements détectés à proximité. Collecteurs déployés.', 'sys'); }
    if (!f.intro3 && t > 14) { f.intro3 = true; this.log('Les capteurs longue portée relèvent une présence hostile dans ce secteur.', 'sys'); }
    if (!f.contact && this.units.some(u => u.faction === FACTION.ENEMY && u.seen)) { f.contact = true; this.log('Contact : vaisseaux hostiles identifiés.', 'warn'); this.sfx('alert'); }
    if (!f.enemyBase && this.structures.some(s => s.faction === FACTION.ENEMY && s.type === 'mothership' && s.seen)) { f.enemyBase = true; this.log('Vaisseau‑mère ennemi localisé. Objectif confirmé.', 'warn'); this.sfx('alert'); }
    // Flotte hostile en approche
    if (!f.lastApproach || t - f.lastApproach > 45) {
      for (const s of this.structures) {
        if (s.dead || s.faction !== FACTION.PLAYER) continue;
        const n = this.units.filter(u => u.faction === FACTION.ENEMY && u.isCombat && u.seen && Utils.dist(u.x, u.y, s.x, s.y) < 900).length;
        if (n >= 3) { f.lastApproach = t; this.log(`Alerte : flotte hostile en approche (${n} vaisseaux).`, 'warn'); this.sfx('alert'); break; }
      }
    }
    const base = this.playerBase();
    if (base && t - base.lastHitTime < 0.3 && (!f.lastBaseHit || t - f.lastBaseHit > 30)) { f.lastBaseHit = t; this.log('Le vaisseau‑mère est attaqué !', 'warn'); this.sfx('alert'); }
  }

  // ---------- Structures ----------
  updateStructure(s, dt) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    s.rotation += dt * 0.1;
    if (s.building) {
      s.buildProgress = Math.min(1, s.buildProgress + dt / s.def.buildTime);
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.9 * dt / s.def.buildTime);
      if (s.buildProgress >= 1) {
        s.building = false;
        if (s.faction === FACTION.PLAYER) { this.log(`${s.def.name} opérationnel${s.def.fem ? 'le' : ''}.`, 'good'); this.sfx('confirm'); this.stats.built++; }
      }
      return;
    }
    if (s.def.regen && s.hp < s.maxHp) s.hp = Math.min(s.maxHp, s.hp + s.def.regen * dt);
    // Production
    if (s.queue.length) {
      const item = s.queue[0];
      item.progress += dt;
      if (item.progress >= UNIT_TYPES[item.type].buildTime) { s.queue.shift(); this.spawnFromStructure(s, item.type); }
    }
    // Recherche
    if (s.research) {
      const r = RESEARCH[s.research.id];
      s.research.progress += dt;
      if (s.research.progress >= r.time) { this.completeResearch(s.faction, s.research.id); s.research = null; }
    }
    // Réparation des vaisseaux proches
    if (s.def.deposit || s.type === 'shipyard') {
      for (const u of this.units) {
        if (u.dead || u.faction !== s.faction || u.hp >= u.maxHp) continue;
        if (Utils.dist2(u.x, u.y, s.x, s.y) < CONFIG.REPAIR_RANGE * CONFIG.REPAIR_RANGE && this.time - u.lastHitTime > 3) {
          u.hp = Math.min(u.maxHp, u.hp + u.maxHp * CONFIG.REPAIR_RATE * dt);
          u.repairing = this.time;
        }
      }
    }
    // Plateforme de défense
    if (s.def.damage) {
      let t = s.target;
      if (!t || t.dead || Utils.dist(s.x, s.y, t.x, t.y) - t.radius > s.range) t = s.target = this.nearestEnemy(s.x, s.y, s.range, s.faction);
      if (t) { s.turretAngle = Utils.lerpAngle(s.turretAngle, Utils.angleTo(s.x, s.y, t.x, t.y), Math.min(1, dt * 5)); this.fire(s, t); }
    }
  }

  defaultRally(s) {
    const ang = Utils.angleTo(s.x, s.y, this.W / 2, this.H / 2);
    return { x: s.x + Math.cos(ang) * (s.radius + 130), y: s.y + Math.sin(ang) * (s.radius + 130) };
  }

  spawnFromStructure(s, type) {
    const rally = s.rally || this.defaultRally(s);
    const ang = s.type === 'shipyard' ? s.angle : Utils.angleTo(s.x, s.y, rally.x, rally.y);
    const u = this.spawnUnit(type, s.x + Math.cos(ang) * (s.radius + 16), s.y + Math.sin(ang) * (s.radius + 16), s.faction);
    u.angle = ang;
    if (type === 'collector') {
      const a = this.nearestAsteroid(s.x, s.y, 1800);
      u.order = a ? { type: 'mine', target: a } : { type: 'move', x: rally.x, y: rally.y };
    } else {
      u.order = { type: 'attackMove', x: rally.x + Utils.rand(-40, 40), y: rally.y + Utils.rand(-40, 40) };
    }
    if (s.faction === FACTION.PLAYER) this.sfx('build', s.x, s.y);
    return u;
  }
  spawnUnit(type, x, y, faction) { const u = new Unit(type, x, y, faction, this); this.units.push(u); return u; }

  // ---------- Unités ----------
  updateUnit(u, dt) {
    u.cooldown = Math.max(0, u.cooldown - dt);
    u.moving = false; u.mining = false;
    let o = u.order;
    if (o && o.target && o.target.dead) {
      if (o.type === 'mine') { const a = this.nearestAsteroid(o.target.x, o.target.y, 900); o = u.order = a ? { type: 'mine', target: a } : (u.cargo > 0 ? { type: 'return' } : null); }
      else o = u.order = o.resume || null;
    }
    if (!o) {
      if (u.isCombat && u.stance !== 'evasive') {
        const e = this.nearestEnemy(u.x, u.y, this.aggroRange(u), u.faction);
        if (e) o = u.order = { type: 'attack', target: e, resume: u.stance === 'aggressive' ? null : { type: 'guard', x: u.x, y: u.y } };
      }
      if (!o) { if (u.turretAngle !== undefined) u.turretAngle = Utils.lerpAngle(u.turretAngle, u.angle, dt * 2); return; }
    }
    switch (o.type) {
      case 'move': if (this.moveUnit(u, o.x, o.y, dt)) u.order = null; break;
      case 'guard': if (this.moveUnit(u, o.x, o.y, dt)) u.order = null; break;
      case 'attackMove': {
        const e = (u.isCombat && u.stance !== 'evasive') ? this.nearestEnemy(u.x, u.y, this.aggroRange(u), u.faction) : null;
        if (e) { u.order = { type: 'attack', target: e, resume: o }; break; }
        if (this.moveUnit(u, o.x, o.y, dt)) u.order = null;
        break;
      }
      case 'attack': {
        const t = o.target;
        if (!u.isCombat) { u.order = o.resume || null; break; }
        if (o.resume && o.resume.type === 'guard' && Utils.dist(u.x, u.y, o.resume.x, o.resume.y) > u.range * 2.5 + 100) { u.order = o.resume; break; }
        const d = Utils.dist(u.x, u.y, t.x, t.y) - t.radius;
        u.turretAngle = Utils.lerpAngle(u.turretAngle, Utils.angleTo(u.x, u.y, t.x, t.y), Math.min(1, dt * 6));
        if (d <= u.range) {
          // Les chasseurs restent mobiles (orbite), les autres se stabilisent
          if (u.def.cls === 'fighter') {
            const orbit = Utils.angleTo(t.x, t.y, u.x, u.y) + 0.9;
            this.moveUnit(u, t.x + Math.cos(orbit) * (u.range * 0.7 + t.radius), t.y + Math.sin(orbit) * (u.range * 0.7 + t.radius), dt, 4);
          } else u.angle = Utils.lerpAngle(u.angle, Utils.angleTo(u.x, u.y, t.x, t.y), Math.min(1, dt * 4));
          this.fire(u, t);
        } else this.moveUnit(u, t.x, t.y, dt, u.range * 0.8 + t.radius);
        break;
      }
      case 'flee': {
        const s = this.nearestStructure(u.faction, u.x, u.y, st => !st.building && (st.def.deposit || st.type === 'shipyard' || st.type === 'turret'));
        if (!s) { u.order = o.resume || null; break; }
        const d = Utils.dist(u.x, u.y, s.x, s.y);
        if (d > s.radius + 90) this.moveUnit(u, s.x, s.y, dt, s.radius + 70);
        const safe = this.time - u.lastHitTime > 4 && !this.nearestEnemy(u.x, u.y, 420, u.faction);
        if (safe && this.time - o.since > 5) u.order = o.resume || null;
        break;
      }
      case 'mine': this.updateMining(u, o, dt); break;
      case 'return': this.updateReturn(u, o, dt); break;
      default: u.order = null;
    }
  }
  aggroRange(u) { return u.stance === 'aggressive' ? Math.max(u.sensor, u.range * CONFIG.AGGRO) : u.range * CONFIG.AGGRO; }

  moveUnit(u, tx, ty, dt, stopDist = 6) {
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
    if (d <= stopDist) return true;
    const step = Math.min(d - stopDist + 0.01, u.speed * dt);
    u.x += dx / d * step; u.y += dy / d * step;
    const turn = u.def.cls === 'capital' ? 2.5 : u.def.cls === 'frigate' ? 4 : 10;
    u.angle = Utils.lerpAngle(u.angle, Math.atan2(dy, dx), Math.min(1, dt * turn));
    u.moving = true;
    u.x = Utils.clamp(u.x, 10, this.W - 10); u.y = Utils.clamp(u.y, 10, this.H - 10);
    return false;
  }

  updateMining(u, o, dt) {
    const a = o.target;
    if (u.cargo >= u.capacity - 0.01) { u.order = { type: 'return', asteroid: a }; return; }
    const stop = a.radius + u.radius + 8;
    if (Utils.dist(u.x, u.y, a.x, a.y) > stop + 3) { this.moveUnit(u, a.x, a.y, dt, stop); return; }
    u.angle = Utils.lerpAngle(u.angle, Utils.angleTo(u.x, u.y, a.x, a.y), Math.min(1, dt * 6));
    const amt = Math.min(u.mineRate * dt, a.minerals, u.capacity - u.cargo);
    a.minerals -= amt; u.cargo += amt; u.lastAsteroid = a; u.mining = true;
    if (a.minerals <= 0.01) { a.minerals = 0; a.dead = true; this.effects.push(new Effect('explosion', { x: a.x, y: a.y, dur: 0.8, size: a.radius * 1.4, color: '#8c8275' })); }
  }
  updateReturn(u, o, dt) {
    const s = this.nearestStructure(u.faction, u.x, u.y, st => st.def.deposit && !st.building);
    if (!s) { u.order = null; return; }
    const stop = s.radius + u.radius + 10;
    if (Utils.dist(u.x, u.y, s.x, s.y) > stop + 3) { this.moveUnit(u, s.x, s.y, dt, stop); return; }
    let amt = u.cargo;
    if (u.faction === FACTION.ENEMY) amt *= this.difficulty.income;
    this.ru[u.faction] += amt;
    if (u.faction === FACTION.PLAYER) { this.stats.mined += amt; this.effects.push(new Effect('float', { x: u.x, y: u.y - 14, text: '+' + Math.round(amt), dur: 1.1, color: '#ffcf6b' })); this.sfx('deposit', u.x, u.y); }
    u.cargo = 0;
    const prev = o.asteroid && !o.asteroid.dead ? o.asteroid : this.nearestAsteroid(o.asteroid ? o.asteroid.x : u.x, o.asteroid ? o.asteroid.y : u.y, 1000);
    u.order = prev ? { type: 'mine', target: prev } : null;
  }

  // ---------- Combat ----------
  damageMult(src, target) {
    const row = DAMAGE_TABLE[src.type];
    const cls = target.def ? target.def.cls : 'structure';
    return row && row[cls] != null ? row[cls] : 1;
  }
  fire(src, t) {
    if (src.cooldown > 0) return;
    const def = src.def;
    src.cooldown = def.fireRate;
    const col = FACTION_COLORS[src.faction].team;
    const dmg = src.damage * this.damageMult(src, t);
    const ang = Utils.angleTo(src.x, src.y, t.x, t.y);
    const ox = src.x + Math.cos(ang) * src.radius * 0.8, oy = src.y + Math.sin(ang) * src.radius * 0.8;
    switch (def.weapon) {
      case 'laser': {
        t.takeDamage(dmg, this, src);
        const hx = t.x + Utils.rand(-t.radius * 0.5, t.radius * 0.5), hy = t.y + Utils.rand(-t.radius * 0.5, t.radius * 0.5);
        this.effects.push(new Effect('beam', { x1: ox, y1: oy, x2: hx, y2: hy, dur: 0.1, color: col, width: 2 }));
        this.effects.push(new Effect('hit', { x: hx, y: hy, dur: 0.2, size: 4, color: '#ffffff' }));
        this.sfx('laser', src.x, src.y);
        break;
      }
      case 'ion': {
        this.effects.push(new Effect('ion', { src, target: t, dur: 0.55, color: col, dmg, dealt: 0 }));
        this.sfx('ion', src.x, src.y);
        break;
      }
      case 'flak': {
        for (let i = 0; i < 2; i++) {
          const a = ang + Utils.rand(-0.12, 0.12);
          this.projectiles.push(new Projectile({ x: ox, y: oy, kind: 'flak', target: t, damage: dmg / 2, faction: src.faction, owner: src, speed: 520, turn: 6, angle: a, life: 0.9 }));
        }
        this.sfx('flak', src.x, src.y);
        break;
      }
      case 'missile':
        this.projectiles.push(new Projectile({ x: ox, y: oy, kind: 'missile', target: t, damage: dmg, faction: src.faction, owner: src, speed: 340, turn: 5, angle: ang + Utils.rand(-0.6, 0.6), life: 4 }));
        this.sfx('missile', src.x, src.y);
        break;
      case 'plasma':
        this.projectiles.push(new Projectile({ x: ox, y: oy, kind: 'plasma', target: t, damage: dmg, faction: src.faction, owner: src, speed: 250, turn: 1.3, angle: ang, life: 4 }));
        this.sfx('plasma', src.x, src.y);
        break;
    }
  }
  updateProjectile(p, dt) {
    p.life -= dt;
    if (p.life <= 0) { p.dead = true; return; }
    const t = p.target;
    if (t && !t.dead) {
      const d = Utils.normAngle(Utils.angleTo(p.x, p.y, t.x, t.y) - p.angle);
      const maxTurn = p.turn * dt;
      p.angle += Utils.clamp(d, -maxTurn, maxTurn);
    }
    if (p.kind !== 'flak') { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 7) p.trail.shift(); }
    p.x += Math.cos(p.angle) * p.speed * dt; p.y += Math.sin(p.angle) * p.speed * dt;
    if (t && !t.dead && Utils.dist(p.x, p.y, t.x, t.y) <= t.radius + 4) {
      t.takeDamage(p.damage, this, p.owner);
      p.dead = true;
      const big = p.kind === 'plasma';
      this.effects.push(new Effect('explosion', { x: p.x, y: p.y, dur: big ? 0.5 : 0.25, size: big ? 26 : p.kind === 'flak' ? 6 : 12, color: FACTION_COLORS[p.faction].team }));
      if (big) this.sfx('explosion', p.x, p.y);
    } else if (p.x < -50 || p.y < -50 || p.x > this.W + 50 || p.y > this.H + 50) p.dead = true;
  }

  applySeparation() {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i]; if (a.dead) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, min = a.radius + b.radius + 3, d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 < 0.01) { a.x += Utils.rand(-1, 1); a.y += Utils.rand(-1, 1); continue; }
        const d = Math.sqrt(d2), push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
        const wa = b.radius / (a.radius + b.radius), wb = a.radius / (a.radius + b.radius);
        a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      }
      for (const s of this.structures) {
        if (s.dead) continue;
        const dx = a.x - s.x, dy = a.y - s.y, min = a.radius + s.radius + 2, d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        a.x = s.x + dx / d * min; a.y = s.y + dy / d * min;
      }
    }
  }

  cleanup() {
    const alive = e => !e.dead;
    this.units = this.units.filter(alive); this.structures = this.structures.filter(alive);
    this.asteroids = this.asteroids.filter(alive); this.projectiles = this.projectiles.filter(alive); this.effects = this.effects.filter(alive);
  }

  onDeath(e, attacker) {
    if (e.kind !== 'unit' && e.kind !== 'structure') return;
    const col = FACTION_COLORS[e.faction].team;
    const big = e.kind === 'structure' || e.def.cls === 'capital';
    this.effects.push(new Effect('explosion', { x: e.x, y: e.y, dur: big ? 1.4 : 0.6, size: e.radius * 2.4, color: col, debris: big }));
    if (e.seen || e.faction === FACTION.PLAYER) this.sfx(big ? 'bigExplosion' : 'explosion', e.x, e.y);
    if (e.kind === 'unit') {
      if (e.faction === FACTION.PLAYER) this.stats.lost++; else this.stats.killed++;
    } else {
      const f = e.def.fem ? 'e' : '';
      if (e.faction === FACTION.PLAYER) { this.stats.structuresLost++; this.log(`${e.def.name} détruit${f}.`, 'warn'); }
      else { this.stats.structuresKilled++; this.log(`${e.def.name} ennemi${f} détruit${f}.`, 'good'); }
      this.ghosts = this.ghosts.filter(g => g.id !== e.id);
      for (const q of e.queue) this.ru[e.faction] += 0; // pas de remboursement
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

  // ---------- Recherche ----------
  canResearch(faction, id) {
    const r = RESEARCH[id];
    if (!r || this.researched[faction].has(id)) return false;
    if (r.requires && !this.researched[faction].has(r.requires)) return false;
    return true;
  }
  startResearch(faction, id) {
    const module = this.structures.find(s => !s.dead && s.faction === faction && s.type === 'research' && !s.building);
    const player = faction === FACTION.PLAYER;
    if (!module) { if (player) { this.log('Aucun module de recherche opérationnel.', 'warn'); this.sfx('error'); } return false; }
    if (module.research) { if (player) { this.log('Une recherche est déjà en cours.', 'warn'); this.sfx('error'); } return false; }
    if (!this.canResearch(faction, id)) return false;
    const r = RESEARCH[id];
    if (this.ru[faction] < r.cost) { if (player) { this.log('Ressources insuffisantes.', 'warn'); this.sfx('error'); } return false; }
    this.ru[faction] -= r.cost;
    module.research = { id, progress: 0 };
    if (player) this.sfx('confirm');
    return true;
  }
  cancelResearch(faction) {
    const module = this.structures.find(s => !s.dead && s.faction === faction && s.type === 'research' && s.research);
    if (!module) return;
    this.ru[faction] += RESEARCH[module.research.id].cost;
    module.research = null;
  }
  completeResearch(faction, id) {
    const r = RESEARCH[id];
    this.researched[faction].add(id);
    this.upgrades[faction][r.key] += r.value;
    if (r.key === 'armor') {
      const k = (1 + this.upgrades[faction].armor) / (1 + this.upgrades[faction].armor - r.value);
      for (const u of this.units) if (u.faction === faction) { u.maxHp *= k; u.hp *= k; }
      for (const s of this.structures) if (s.faction === faction) { s.maxHp *= k; s.hp *= k; }
    }
    if (faction === FACTION.PLAYER) { this.log(`Recherche terminée : ${r.name}.`, 'good'); this.sfx('research'); }
  }

  // ---------- Requêtes spatiales ----------
  nearestEnemy(x, y, range, faction) {
    let best = null, bd = Infinity;
    const check = e => {
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
    for (const a of this.asteroids) { if (a.dead || a.minerals <= 0) continue; const d = Utils.dist2(x, y, a.x, a.y); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  nearestStructure(faction, x, y, filter) {
    let best = null, bd = Infinity;
    for (const s of this.structures) { if (s.dead || s.faction !== faction || (filter && !filter(s))) continue; const d = Utils.dist2(x, y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  entityAt(wx, wy, tolerance = 6) {
    let best = null, bd = Infinity;
    const check = (e, extra) => {
      if (e.dead || !e.seen) return;
      const d = Utils.dist(wx, wy, e.x, e.y);
      if (d <= e.radius + tolerance + extra && d < bd) { bd = d; best = e; }
    };
    for (const u of this.units) check(u, 5);
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

  // ---------- Sélection et commandes ----------
  select(entities, add = false) {
    if (!add) this.selection = [];
    for (const e of entities) if (!this.selection.includes(e)) this.selection.push(e);
    if (this.selection.some(e => e.kind === 'unit')) this.selection = this.selection.filter(e => e.kind === 'unit');
    if (this.selection.length > 1 && this.selection[0].kind === 'structure') this.selection = [this.selection[0]];
    if (entities.length) this.sfx('select');
  }
  selectedUnits() { return this.selection.filter(e => e.kind === 'unit' && !e.dead); }
  selectedStructures() { return this.selection.filter(e => e.kind === 'structure' && !e.dead); }

  // Calcule les positions de formation autour de (x, y), orientée depuis le centre du groupe
  formationSlots(units, x, y) {
    const n = units.length;
    if (!n) return [];
    const cx = units.reduce((s, u) => s + u.x, 0) / n, cy = units.reduce((s, u) => s + u.y, 0) / n;
    const dir = Utils.dist(cx, cy, x, y) > 20 ? Utils.angleTo(cx, cy, x, y) : (units[0].angle || 0);
    const sorted = units.slice().sort((a, b) => b.radius - a.radius);
    const spacing = Math.max(...units.map(u => u.radius)) * 2 + 18;
    const local = [];
    switch (this.formation) {
      case 'delta': {
        // Rangées en V : 1, 2, 3, ...
        let row = 0, idx = 0;
        while (idx < n) {
          const count = row + 1;
          for (let i = 0; i < count && idx < n; i++, idx++) local.push({ x: -row * spacing * 0.9, y: (i - (count - 1) / 2) * spacing * 1.1 });
          row++;
        }
        break;
      }
      case 'wall': for (let i = 0; i < n; i++) local.push({ x: 0, y: (i - (n - 1) / 2) * spacing }); break;
      case 'column': for (let i = 0; i < n; i++) local.push({ x: -i * spacing, y: 0 }); break;
      default: {
        const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
        for (let i = 0; i < n; i++) local.push({ x: -(Math.floor(i / cols) - (rows - 1) / 2) * spacing, y: ((i % cols) - (cols - 1) / 2) * spacing });
      }
    }
    const c = Math.cos(dir), s = Math.sin(dir);
    return sorted.map((u, i) => ({ u, x: Utils.clamp(x + local[i].x * c - local[i].y * s, 10, this.W - 10), y: Utils.clamp(y + local[i].x * s + local[i].y * c, 10, this.H - 10) }));
  }
  commandMove(units, x, y) { for (const s of this.formationSlots(units, x, y)) s.u.order = { type: 'move', x: s.x, y: s.y }; this.effects.push(new Effect('marker', { x, y, dur: 0.7, color: '#7ef0b0' })); this.sfx('click'); }
  commandAttackMove(units, x, y) { for (const s of this.formationSlots(units, x, y)) s.u.order = { type: 'attackMove', x: s.x, y: s.y }; this.effects.push(new Effect('marker', { x, y, dur: 0.7, color: '#ff5c5c' })); this.sfx('click'); }
  commandAttack(units, target) {
    for (const u of units) u.order = u.isCombat ? { type: 'attack', target, resume: null, explicit: true } : { type: 'move', x: target.x, y: target.y };
    this.effects.push(new Effect('marker', { x: target.x, y: target.y, dur: 0.7, color: '#ff5c5c', follow: target })); this.sfx('click');
  }
  commandMine(units, asteroid) {
    for (const u of units) u.order = u.type === 'collector' ? { type: 'mine', target: asteroid } : { type: 'attackMove', x: asteroid.x, y: asteroid.y };
    this.effects.push(new Effect('marker', { x: asteroid.x, y: asteroid.y, dur: 0.7, color: '#ffcf6b' })); this.sfx('click');
  }
  commandReturn(units) { for (const u of units) if (u.type === 'collector') u.order = { type: 'return', asteroid: u.lastAsteroid }; this.sfx('click'); }
  commandStop(units) { for (const u of units) u.order = null; this.sfx('click'); }
  commandStance(units, stance) { for (const u of units) u.stance = stance; this.sfx('click'); }
  commandRally(structures, x, y) { for (const s of structures) s.rally = { x, y }; this.effects.push(new Effect('marker', { x, y, dur: 0.7, color: '#ffcf6b' })); this.sfx('click'); }

  canProduce(s, type) {
    const def = UNIT_TYPES[type];
    if (!def || !s.def.produces || !s.def.produces.includes(type) || s.building) return 'impossible';
    if (def.requires && !this.structures.some(x => !x.dead && x.faction === s.faction && x.type === def.requires && !x.building)) return 'requires';
    if (s.queue.length >= 5) return 'queue';
    if (this.capUsed(s.faction) + def.cap > this.capMax(s.faction)) return 'cap';
    if (this.ru[s.faction] < def.cost) return 'ru';
    return 'ok';
  }
  queueProduction(s, type) {
    const r = this.canProduce(s, type);
    const player = s.faction === FACTION.PLAYER;
    if (r !== 'ok') {
      if (player) {
        const msg = { requires: 'Nécessite un chantier naval.', queue: 'File de production pleine.', cap: 'Capacité de flotte atteinte : construisez un chantier naval.', ru: 'Ressources insuffisantes.' }[r];
        if (msg) { this.log(msg, 'warn'); this.sfx('error'); }
      }
      return false;
    }
    this.ru[s.faction] -= UNIT_TYPES[type].cost;
    s.queue.push({ type, progress: 0 });
    if (player) this.sfx('confirm');
    return true;
  }
  cancelProduction(s, index) { const it = s.queue.splice(index, 1)[0]; if (it) this.ru[s.faction] += UNIT_TYPES[it.type].cost; }

  canPlace(type, x, y, faction) {
    const def = STRUCTURE_TYPES[type];
    if (!def) return false;
    const r = def.radius;
    if (x < r || y < r || x > this.W - r || y > this.H - r) return false;
    if (!this.structures.some(s => !s.dead && s.faction === faction && Utils.dist(s.x, s.y, x, y) <= CONFIG.BUILD_RADIUS)) return false;
    for (const s of this.structures) if (!s.dead && Utils.dist(s.x, s.y, x, y) < s.radius + r + 16) return false;
    for (const a of this.asteroids) if (!a.dead && Utils.dist(a.x, a.y, x, y) < a.radius + r + 10) return false;
    return true;
  }
  placeStructure(type, x, y, faction) {
    const def = STRUCTURE_TYPES[type];
    const player = faction === FACTION.PLAYER;
    if (def.max && this.structures.filter(s => !s.dead && s.faction === faction && s.type === type).length >= def.max) { if (player) { this.log(`Un seul ${def.name.toLowerCase()} autorisé.`, 'warn'); this.sfx('error'); } return null; }
    if (!this.canPlace(type, x, y, faction)) { if (player) { this.log('Emplacement invalide : construisez à portée d’un bâtiment allié.', 'warn'); this.sfx('error'); } return null; }
    if (this.ru[faction] < def.cost) { if (player) { this.log('Ressources insuffisantes.', 'warn'); this.sfx('error'); } return null; }
    this.ru[faction] -= def.cost;
    const s = new Structure(type, x, y, faction, this, false);
    this.structures.push(s);
    if (player) this.sfx('confirm');
    return s;
  }
}
