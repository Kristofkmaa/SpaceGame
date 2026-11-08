// ============ Simulation de la partie ============
class Game {
  constructor(opts, audio) {
    MAP.init();
    this.opts = opts; this.audio = audio; this.ui = null;
    this.diff = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    this.time = 0; this.paused = false; this.state = 'playing'; this.endAt = 0; this.winner = null;
    this.heroes = []; this.minions = []; this.monsters = []; this.towers = []; this.inhibs = []; this.nexuses = [];
    this.projectiles = []; this.zones = []; this.effects = []; this.floats = []; this.rubble = [];
    this.kills = [0, 0]; this.towersDown = [0, 0]; this.dragons = [0, 0]; this.firstBlood = false;
    this.waveN = 0; this.nextWave = CONFIG.WAVE_FIRST; this.spawnQueue = [];
    this.visSources = [[], []]; this.visTimer = 0;
    this.camps = MAP.campSpots.map(c => ({ ...c, alive: [], respawnAt: c.first, cleared: false }));
    this.setupStructures();
    this.setupHeroes(opts);
    this.player = this.heroes.find(h => h.isPlayer);
    this.camera = { x: this.player.x, y: this.player.y, zoom: 1, locked: opts.cameraLocked !== false };
    this.updateVision();
  }

  // ---------- Mise en place ----------
  setupStructures() {
    for (const team of [0, 1]) {
      for (const lane of LANES) {
        CONFIG.TOWER_PROGRESS[lane].forEach((p, tier) => {
          const pt = MAP.pointAt(team, lane, p);
          if (tier < 2) this.towers.push(new Structure('tower', team, pt.x, pt.y, { hp: TOWER.hp, radius: TOWER.radius, lane, tier }));
          else this.inhibs.push(new Structure('inhib', team, pt.x, pt.y, { hp: INHIB.hp, radius: INHIB.radius, lane }));
        });
      }
      for (const p of CONFIG.NEXUS_TOWERS) { const q = team ? MAP.mirror(p[0], p[1]) : { x: p[0], y: p[1] }; this.towers.push(new Structure('tower', team, q.x, q.y, { hp: TOWER.hp * 0.9, radius: TOWER.radius, tier: 3 })); }
      const n = MAP.nexus[team]; this.nexuses.push(new Structure('nexus', team, n.x, n.y, { hp: NEXUS.hp, radius: NEXUS.radius }));
    }
  }
  setupHeroes(o) {
    // o.blue / o.red : listes { id, role } ; le premier bleu est le joueur
    o.blue.forEach((p, i) => { const h = new Hero(p.id, 0, this, { player: i === 0, role: p.role }); if (i > 0 || o.autoPlayer) h.bot = new HeroBot(this, h); this.heroes.push(h); });
    o.red.forEach(p => { const h = new Hero(p.id, 1, this, { role: p.role }); h.bot = new HeroBot(this, h); this.heroes.push(h); });
    for (const team of [0, 1]) this.heroes.filter(h => h.team === team).forEach((h, i) => { const f = MAP.fountains[team], a = i * 1.25; h.x = h.px = f.x + Math.cos(a) * 70; h.y = h.py = f.y + Math.sin(a) * 70; });
  }

  // ---------- Accès ----------
  log(text, cls) { if (this.ui) this.ui.toast(text, cls); }
  sfx(name, x, y) { if (this.audio) this.audio.play(name, x, y); }
  fx(type, props) { if (this.effects.length < 500) this.effects.push(new Effect(type, props)); }
  float(text, x, y, color, big) { if (this.floats.length < 80) this.floats.push({ text: String(text), x: x + Utils.rand(-8, 8), y, color, big, t: 0, dur: 0.9 }); }
  announce(title, sub, cls, icon) { if (this.ui) this.ui.announce(title, sub, cls, icon); }
  inShop(h) { const f = MAP.fountains[h.team]; return Utils.dist(h.x, h.y, f.x, f.y) <= CONFIG.SHOP_R; }
  canShop(h) { return h.dead || this.inShop(h); }
  structures() { return [...this.towers, ...this.inhibs, ...this.nexuses]; }
  enemyUnits(team) {
    const out = [];
    for (const h of this.heroes) if (!h.dead && h.team !== team) out.push(h);
    for (const m of this.minions) if (!m.dead && m.team !== team) out.push(m);
    for (const m of this.monsters) if (!m.dead) out.push(m);
    return out;
  }
  seen(team, u) { return u.vis ? u.vis[team] : true; }
  enemyHeroesNear(x, y, r, team, vis = true) { return this.heroes.filter(h => !h.dead && h.team !== team && (!vis || h.vis[team]) && Utils.dist(x, y, h.x, h.y) <= r); }
  allyHeroesNear(x, y, r, team) { return this.heroes.filter(h => !h.dead && h.team === team && Utils.dist(x, y, h.x, h.y) <= r); }
  enemyMinionsNear(x, y, r, team) { return this.minions.filter(m => !m.dead && m.team !== team && Utils.dist(x, y, m.x, m.y) <= r); }
  alliedMinionsNear(team, x, y, r) { let n = 0; for (const m of this.minions) if (!m.dead && m.team === team && Utils.dist(x, y, m.x, m.y) <= r) n++; return n; }
  isTargetable(u, byTeam) {
    if (!u || u.dead || u.team === byTeam) return false;
    if (u.kind === 'tower') {
      if (u.tier === 1) return this.towers.every(t => !(t.team === u.team && t.lane === u.lane && t.tier === 0 && !t.dead));
      if (u.tier === 3) return this.inhibs.some(i => i.team === u.team && i.dead);
      return true;
    }
    if (u.kind === 'inhib') return this.towers.every(t => !(t.team === u.team && t.lane === u.lane && t.tier === 1 && !t.dead));
    if (u.kind === 'nexus') return this.towers.every(t => !(t.team === u.team && t.tier === 3 && !t.dead));
    return true;
  }
  laneFront(team, lane) { let best = null; for (const m of this.minions) if (!m.dead && m.team === team && m.lane === lane) { const p = MAP.progress(team, lane, m.x, m.y); if (best === null || p > best) best = p; } return best; }
  laneEnemyStructure(team, lane) {
    const e = 1 - team;
    for (const tier of [0, 1]) { const t = this.towers.find(x => x.team === e && x.lane === lane && x.tier === tier && !x.dead); if (t) return t; }
    const inh = this.inhibs.find(i => i.team === e && i.lane === lane && !i.dead); if (inh) return inh;
    const nt = this.towers.find(x => x.team === e && x.tier === 3 && !x.dead); if (nt) return nt;
    return this.nexuses.find(n => n.team === e && !n.dead) || null;
  }
  laneOwnStructureProgress(team, lane) {
    for (const tier of [0, 1]) { const t = this.towers.find(x => x.team === team && x.lane === lane && x.tier === tier && !x.dead); if (t) return MAP.progress(team, lane, t.x, t.y); }
    return CONFIG.TOWER_PROGRESS[lane][2];
  }
  underEnemyTower(team, x, y) { return this.towers.some(t => !t.dead && t.team !== team && Utils.dist(t.x, t.y, x, y) <= TOWER.range + 25); }
  structureSafeToHit(s, team) { return s.kind !== 'tower' || this.alliedMinionsNear(team, s.x, s.y, TOWER.range) >= 2; }

  // ---------- Boucle ----------
  update(dt) {
    if (this.paused) return;
    this.time += dt;
    if (this.state === 'playing') {
      if (this.time >= this.nextWave) { this.queueWave(); this.nextWave += CONFIG.WAVE_PERIOD; }
      this.processSpawns(); this.updateCamps();
      for (const h of this.heroes) this.updateHero(h, dt);
      for (const m of this.minions) if (!m.dead) this.updateMinion(m, dt);
      for (const m of this.monsters) if (!m.dead) this.updateMonster(m, dt);
      for (const tw of this.towers) if (!tw.dead) this.updateTower(tw, dt);
      for (const i of this.inhibs) if (i.dead && this.time >= i.respawnAt) { i.dead = false; i.hp = i.maxHp; this.announce('Inhibiteur reconstruit', i.team === 0 ? 'Notre ' + LANE_NAMES[i.lane].toLowerCase() + ' est de nouveau protégée' : 'Les Charognards ont réparé leur inhibiteur', 'info'); }
      for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt);
      for (const z of this.zones) if (!z.dead) this.updateZone(z, dt);
      this.updateDots(dt);
      this.separate();
      for (const u of this.heroes) { u.vx = (u.x - u.px) / dt; u.vy = (u.y - u.py) / dt; u.px = u.x; u.py = u.y; }
      this.visTimer -= dt; if (this.visTimer <= 0) { this.visTimer = 0.1; this.updateVision(); }
    }
    for (const e of this.effects) { e.t += dt; if (e.t >= e.dur) e.dead = true; }
    for (const f of this.floats) f.t += dt;
    this.minions = this.minions.filter(m => !m.dead);
    this.monsters = this.monsters.filter(m => !m.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.zones = this.zones.filter(z => !z.dead);
    this.effects = this.effects.filter(e => !e.dead);
    this.floats = this.floats.filter(f => f.t < f.dur);
  }

  // ---------- Vision ----------
  updateVision() {
    const V = CONFIG.VISION;
    for (const team of [0, 1]) {
      const src = [];
      for (const h of this.heroes) if (!h.dead && h.team === team) src.push({ x: h.x, y: h.y, r: V.hero });
      for (const m of this.minions) if (!m.dead && m.team === team) src.push({ x: m.x, y: m.y, r: V.minion });
      for (const t of this.towers) if (!t.dead && t.team === team) src.push({ x: t.x, y: t.y, r: V.tower });
      for (const i of this.inhibs) if (!i.dead && i.team === team) src.push({ x: i.x, y: i.y, r: V.inhib });
      for (const n of this.nexuses) if (n.team === team) src.push({ x: n.x, y: n.y, r: V.nexus });
      src.push({ x: MAP.fountains[team].x, y: MAP.fountains[team].y, r: V.fountain });
      for (const z of this.zones) if (z.team === team && z.kind === 'miniturret') src.push({ x: z.x, y: z.y, r: 380 });
      this.visSources[team] = src;
      const see = u => { for (const s of src) { const r = s.r + u.radius; if (Utils.dist2(s.x, s.y, u.x, u.y) <= r * r) return true; } return false; };
      for (const h of this.heroes) if (h.team !== team) h.vis[team] = !h.dead && see(h);
      for (const m of this.minions) if (m.team !== team) m.vis[team] = see(m);
      for (const m of this.monsters) m.vis[team] = see(m);
    }
  }

  // ---------- Vagues ----------
  queueWave() {
    this.waveN++;
    for (const team of [0, 1]) for (const lane of LANES) {
      const enemyInhibDown = this.inhibs.some(i => i.team !== team && i.lane === lane && i.dead);
      const types = ['melee', 'melee', 'melee'];
      if (enemyInhibDown) types.push('super');
      else if (this.waveN % CONFIG.SIEGE_EVERY === 0 || this.time > 14 * 60) types.push('siege');
      types.push('ranged', 'ranged', 'ranged');
      types.forEach((type, i) => this.spawnQueue.push({ team, lane, type, at: this.time + i * 0.7 }));
    }
    if (this.waveN === 1) { this.announce('Les pillards arrivent', 'Les premières vagues partent sur les trois voies', 'info'); this.sfx('horn'); }
  }
  processSpawns() {
    if (!this.spawnQueue.length || this.spawnQueue[0].at > this.time) { if (!this.spawnQueue.some(s => s.at <= this.time)) return; }
    const due = this.spawnQueue.filter(s => s.at <= this.time);
    this.spawnQueue = this.spawnQueue.filter(s => s.at > this.time);
    for (const s of due) {
      if (this.nexuses[s.team].dead) continue;
      const pt = MAP.pointAt(s.team, s.lane, 120, Utils.rand(-25, 25));
      const m = new Minion(s.type, s.team, s.lane, pt.x, pt.y, this); m.angle = pt.angle; this.minions.push(m);
    }
  }

  // ---------- Jungle ----------
  updateCamps() {
    for (const c of this.camps) {
      if (c.alive.length || this.time < c.respawnAt) continue;
      c.respawnAt = Infinity; c.cleared = false;
      c.alive = c.mobs.map((type, i) => {
        const a = i / c.mobs.length * Math.PI * 2, d = i === 0 ? 0 : 60;
        const m = new Monster(type, c, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d);
        m.angle = Utils.angleTo(m.x, m.y, 2500, 2500); this.monsters.push(m); return m;
      });
      if (c.epic) this.announce(c.name, c.id === 'worm' ? 'Le Ver des sables émerge dans la rivière' : 'Le Titan de rouille s’est réveillé', 'info');
    }
  }
  aggroCamp(m, src) {
    if (!src || src.dead || src.team === 2) return;
    for (const o of m.camp.alive) if (!o.dead && !o.resetting && !o.target) o.target = src;
    if (!m.target) m.target = src;
  }
  updateMonster(m, dt) {
    const t = this.time; m.attackCd -= dt; m.moving = false;
    if (m.stunned(t)) return;
    const taunt = m.taunted(t); if (taunt) m.target = taunt;
    if (m.resetting) {
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
      if (this.moveToward(m, m.home.x, m.home.y, dt, 6, 2)) { m.resetting = false; m.hp = m.maxHp; m.target = null; }
      return;
    }
    const tg = m.target;
    if (!tg) { if (m.hp < m.maxHp && t - m.lastHit > 4) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.05 * dt); return; }
    const leash = m.def.epic ? 900 : 650;
    if (tg.dead || Utils.dist(m.home.x, m.home.y, tg.x, tg.y) > leash || Utils.dist(m.home.x, m.home.y, m.x, m.y) > leash) {
      for (const o of m.camp.alive) if (!o.dead) { o.target = null; o.resetting = true; }
      return;
    }
    const reach = m.def.range + m.radius + tg.radius;
    if (Utils.dist(m.x, m.y, tg.x, tg.y) <= reach) {
      m.angle = Utils.lerpAngle(m.angle, Utils.angleTo(m.x, m.y, tg.x, tg.y), 0.3);
      if (m.attackCd <= 0) {
        m.attackCd = m.def.period; m.attackAnim = t;
        if (m.def.ranged) this.homing(m, tg, { speed: 700, visual: m.def.epic ? 'acid' : 'spit', onHit: u => this.damage(m, u, m.ad, 'phys') });
        else { this.damage(m, tg, m.ad, 'phys'); this.fx('slash', { x: tg.x, y: tg.y, angle: m.angle, dur: 0.2 }); }
        if (m.def.epic === 'worm' && Math.random() < 0.35) { this.aoe(2, tg.x, tg.y, 150, u => this.damage(m, u, m.ad * 0.6, 'magic')); this.fx('quake', { x: tg.x, y: tg.y, r: 150, dur: 0.6, color: '#c9a24a' }); }
        if (m.def.epic === 'titan') { this.aoe(2, m.x, m.y, 220, u => { if (u !== tg) this.damage(m, u, m.ad * 0.5, 'phys'); }); this.fx('quake', { x: m.x, y: m.y, r: 220, dur: 0.5 }); }
      }
    } else this.moveToward(m, tg.x, tg.y, dt, reach - 4, 1.2);
  }
  campCleared(c, killer) {
    c.alive = []; c.respawnAt = this.time + c.respawn; c.cleared = true;
    const team = killer ? killer.team : null;
    if (team === null || team === 2) return;
    if (c.id === 'worm') {
      this.dragons[team]++;
      for (const h of this.heroes) if (h.team === team) h.gold += 75;
      this.announce('Ver des sables vaincu', `${TEAM_INFO[team].name} : +${this.dragons[team] * 6} % de dégâts pour toute l’équipe`, team === 0 ? 'good' : 'bad');
    } else if (c.id === 'titan') {
      for (const h of this.heroes) if (h.team === team && !h.dead) this.addBuff(h, { id: 'titan', dur: BUFFS.titan.dur, stats: { ad: 40, ap: 40 } });
      for (const h of this.heroes) if (h.team === team) h.gold += 200;
      this.announce('Titan de rouille abattu', `${TEAM_INFO[team].name} reçoivent la Faveur du Titan`, team === 0 ? 'good' : 'bad');
    }
  }

  // ---------- Héros ----------
  updateHero(h, dt) {
    const t = this.time;
    if (h.dead) { if (t >= h.respawnAt) this.respawn(h); else if (h.bot) h.bot.update(dt); return; }
    h.moving = false;
    h.hp = Math.min(h.maxHp, h.hp + h.st.hpRegen * dt);
    h.mana = Math.min(h.maxMana, h.mana + h.st.manaRegen * dt);
    if (t > CONFIG.WAVE_FIRST) h.gold += CONFIG.PASSIVE_GOLD * dt;
    for (let i = 0; i < 4; i++) if (h.cds[i] > 0) h.cds[i] = Math.max(0, h.cds[i] - dt);
    for (let i = 0; i < 2; i++) if (h.spellCds[i] > 0) h.spellCds[i] = Math.max(0, h.spellCds[i] - dt);
    h.attackCd -= dt;
    if (h.empower && h.empower.until < t) h.empower = null;
    if (h.buffs.length && h.buffs.some(b => b.until <= t)) { h.buffs = h.buffs.filter(b => b.until > t); h.scale = Math.max(1, ...h.buffs.map(b => b.scale || 1)); h.recompute(); }
    if (h.potions.length) { h.potions = h.potions.filter(p => p.until > t); for (const p of h.potions) h.hp = Math.min(h.maxHp, h.hp + p.rate * dt); }
    const f = MAP.fountains[h.team];
    if (Utils.dist(h.x, h.y, f.x, f.y) < CONFIG.FOUNTAIN_R) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.1 * dt); h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.1 * dt); }
    const ef = MAP.fountains[1 - h.team];
    if (Utils.dist(h.x, h.y, ef.x, ef.y) < CONFIG.FOUNTAIN_R + 60) { h.zapped = t; this.damage(null, h, 800 * dt, 'true'); if (h.dead) return; }
    if (h.bot) h.bot.update(dt);
    if (h.recall) {
      if (t >= h.recall.end) { h.recall = null; this.fx('teleport', { x: h.x, y: h.y, dur: 0.6, team: h.team }); h.x = h.px = f.x + Utils.rand(-40, 40); h.y = h.py = f.y + Utils.rand(-40, 40); h.order = null; h.path = null; this.fx('teleport', { x: h.x, y: h.y, dur: 0.8, team: h.team }); this.sfx('recallEnd', h.x, h.y); }
      return;
    }
    if (h.dash) { this.updateDash(h, dt); return; }
    if (h.channel) { if (h.stunned(t)) this.endChannel(h, true); else { this.updateChannel(h, dt); return; } }
    if (h.stunned(t)) return;
    const taunt = h.taunted(t);
    if (taunt) { if (this.inAttackRange(h, taunt)) this.tryAttack(h, taunt); else this.moveToward(h, taunt.x, taunt.y, dt, h.st.range + h.radius + taunt.radius - 6); return; }
    this.executeOrder(h, dt);
  }
  executeOrder(h, dt) {
    let o = h.order;
    if (o && o.target && (o.target.dead || (o.target.team !== h.team && !this.isTargetable(o.target, h.team)) || (o.target.vis && o.target.team !== h.team && !o.target.vis[h.team] && o.target.kind !== 'tower'))) o = h.order = null;
    if (!o) {
      const e = this.nearestAttackable(h, h.st.range + h.radius + 6);
      if (e) this.tryAttack(h, e);
      return;
    }
    if (o.type === 'move') { if (this.followPath(h, o, dt)) h.order = null; }
    else if (o.type === 'attack') {
      const tg = o.target;
      if (this.inAttackRange(h, tg)) this.tryAttack(h, tg);
      else this.chase(h, tg, h.st.range + h.radius + tg.radius - 6, dt);
    } else if (o.type === 'cast') {
      const ab = ABILITIES[h.def.abilities[o.slot]], tg = o.target;
      if (Utils.dist(h.x, h.y, tg.x, tg.y) <= ab.range + tg.radius + 5) { h.order = null; this.castAbility(h, o.slot, tg.x, tg.y, tg); }
      else this.chase(h, tg, ab.range, dt);
    }
  }
  followPath(h, o, dt) {
    if (!o.path) o.path = MAP.path(h.x, h.y, o.x, o.y), o.pi = 0;
    const wp = o.path[o.pi];
    if (!wp) return true;
    const last = o.pi === o.path.length - 1;
    if (this.moveToward(h, wp.x, wp.y, dt, last ? 4 : 10)) { o.pi++; if (o.pi >= o.path.length) return true; }
    else if (!h.moving && h.rooted && !h.rooted(this.time)) { o.path = null; }
    return false;
  }
  chase(h, tg, stop, dt) {
    if (MAP.los(h.x, h.y, tg.x, tg.y)) { h.chasePath = null; this.moveToward(h, tg.x, tg.y, dt, stop); return; }
    if (!h.chasePath || this.time - h.chasePath.t > 0.5) h.chasePath = { t: this.time, path: MAP.path(h.x, h.y, tg.x, tg.y), pi: 0 };
    const cp = h.chasePath, wp = cp.path[cp.pi];
    if (!wp) return;
    if (this.moveToward(h, wp.x, wp.y, dt, 10)) cp.pi++;
  }
  nearestAttackable(h, range) {
    let best = null, bd = Infinity;
    const check = u => { if (!this.isTargetable(u, h.team) || (u.vis && !u.vis[h.team] && u.kind !== 'tower')) return; if (u.kind === 'monster' && !u.target) return; const d = Utils.dist(h.x, h.y, u.x, u.y) - u.radius; if (d <= range && d < bd) { bd = d; best = u; } };
    for (const u of this.heroes) check(u);
    for (const m of this.minions) check(m);
    if (best) return best;
    for (const m of this.monsters) check(m);
    for (const s of this.structures()) check(s);
    return best;
  }
  inAttackRange(h, tg) { return Utils.dist(h.x, h.y, tg.x, tg.y) <= h.st.range + h.radius + tg.radius; }
  tryAttack(h, tg) {
    h.angle = Utils.lerpAngle(h.angle, Utils.angleTo(h.x, h.y, tg.x, tg.y), 0.5);
    if (h.attackCd > 0) return;
    h.attackCd = 1 / h.st.as; h.attackAnim = this.time;
    if (h.def.ranged) { this.homing(h, tg, { speed: 1000, visual: h.def.projectile, onHit: u => this.basicHit(h, u) }); this.sfx({ bullet: 'rifle', spark: 'sparkShot', ember: 'flameShot' }[h.def.projectile] || 'dart', h.x, h.y); }
    else { this.basicHit(h, tg); this.fx('slash', { x: tg.x, y: tg.y, angle: h.angle, dur: 0.2 }); this.sfx(h.heroId === 'crocs' ? 'swipe' : 'hammer', h.x, h.y); }
  }
  basicHit(h, tg) {
    let dmg = h.st.ad, crit = false;
    if (h.st.crit && Math.random() < h.st.crit) { dmg *= h.st.critMult; crit = true; }
    if (h.empower && h.empower.until >= this.time) { dmg += h.empower.bonus; h.empower = null; this.fx('impact', { x: tg.x, y: tg.y, size: 20 }); }
    this.damage(h, tg, dmg, 'phys', { basic: true, crit });
    if (h.hasBuff('red') && !tg.dead) { this.dot(tg, 'burn', 8 + 2 * h.level, 3, h); this.slow(tg, 0.1, 1.5); }
  }
  moveToward(u, tx, ty, dt, stop, mult = 1) {
    const t = this.time;
    if (u.rooted(t)) return false;
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
    if (d <= stop) return true;
    const speed = (u.kind === 'hero' ? u.st.ms : u.ms) * u.msMult(t) * mult;
    const step = Math.min(d - stop, speed * dt);
    const ox = u.x, oy = u.y;
    u.x += dx / d * step; u.y += dy / d * step;
    MAP.resolve(u);
    u.angle = Utils.lerpAngle(u.angle, Math.atan2(dy, dx), Math.min(1, dt * 12));
    u.moving = Utils.dist(ox, oy, u.x, u.y) > step * 0.2; u.walk += dt * speed * 0.06;
    return false;
  }

  // ---------- Ordres ----------
  issueMove(h, x, y) {
    if (h.dead) return;
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    const prev = h.order;
    if (prev && prev.type === 'move' && Utils.dist(prev.x, prev.y, x, y) < 30 && prev.path) return;
    h.order = { type: 'move', x, y, path: null, pi: 0 };
  }
  issueAttack(h, tg) {
    if (h.dead || (tg.team !== h.team && !this.isTargetable(tg, h.team))) return;
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    if (h.order && h.order.type === 'attack' && h.order.target === tg) return;
    h.order = { type: 'attack', target: tg };
  }
  issueStop(h) { h.order = null; if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true); }
  startRecall(h) { if (h.dead || h.recall || h.dash || h.channel) return; h.order = null; h.recall = { start: this.time, end: this.time + CONFIG.RECALL_TIME }; this.sfx('recall', h.x, h.y); }
  canCast(h, slot) { const r = h.ranks[slot]; if (!r || h.cds[slot] > 0) return false; return h.mana >= ABILITIES[h.def.abilities[slot]].cost[r - 1]; }
  castFail(h, msg) { if (h.isPlayer && msg) { this.log(msg, 'warn'); this.sfx('error'); } return false; }
  findAbilityTarget(h, ab, x, y) {
    if (ab.aim === 'ally') { let best = null, bd = 170; for (const a of this.heroes) { if (a.dead || a.team !== h.team) continue; const d = Utils.dist(a.x, a.y, x, y); if (d < bd && Utils.dist(h.x, h.y, a.x, a.y) <= ab.range + 40) { bd = d; best = a; } } return best || h; }
    let best = null, bd = Infinity;
    for (const u of this.enemyUnits(h.team)) { if (ab.heroOnly && u.kind !== 'hero') continue; if (!u.vis[h.team]) continue; const d = Utils.dist(u.x, u.y, x, y) - u.radius; if (d < 110 && d < bd) { bd = d; best = u; } }
    return best;
  }
  castAbility(h, slot, x, y, forced) {
    const t = this.time;
    if (h.dead || h.stunned(t) || h.dash || (h.channel && !h.channel.cancelOnMove) || h.taunted(t)) return false;
    const r = h.ranks[slot];
    if (!r) return this.castFail(h, 'Compétence pas encore apprise : Ctrl + touche pour l’améliorer');
    if (h.cds[slot] > 0) return this.castFail(h, 'Compétence pas encore prête');
    const ab = ABILITIES[h.def.abilities[slot]], cost = ab.cost[r - 1];
    if (h.mana < cost) return this.castFail(h, 'Pas assez d’énergie');
    let target = null;
    if (ab.aim === 'target' || ab.aim === 'ally') {
      target = forced && !forced.dead ? forced : this.findAbilityTarget(h, ab, x, y);
      if (!target) return this.castFail(h, ab.heroOnly ? 'Ciblez un héros ennemi' : 'Aucune cible sous le curseur');
      if (ab.aim === 'target' && Utils.dist(h.x, h.y, target.x, target.y) > ab.range + target.radius + 10) { h.order = { type: 'cast', slot, target }; return true; }
      x = target.x; y = target.y;
    }
    if (ab.aim === 'circle') { const d = Utils.dist(h.x, h.y, x, y); if (d > ab.range) { x = h.x + (x - h.x) / d * ab.range; y = h.y + (y - h.y) / d * ab.range; } }
    if (h.recall) h.recall = null;
    if (h.channel) this.endChannel(h, true);
    h.mana -= cost; h.cds[slot] = ab.cd[r - 1] * (1 - h.st.cdr);
    if (Utils.dist(h.x, h.y, x, y) > 1) h.angle = Utils.angleTo(h.x, h.y, x, y);
    h.castAnim = t;
    ab.cast(this, h, r, x, y, target);
    return true;
  }
  useSpell(h, i, x, y) {
    if (h.dead || h.stunned(this.time) || h.dash) return false;
    if (h.spellCds[i] > 0) { if (h.isPlayer) this.castFail(h, 'Sort pas encore prêt'); return false; }
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    const sp = SPELLS[h.spells[i]];
    if (sp.cast(this, h, x, y) !== false) h.spellCds[i] = sp.cd;
    return true;
  }
  levelUp(h, slot) { if (!h.canLevel(slot)) return false; h.ranks[slot]++; h.points--; if (h.isPlayer) this.sfx('skillUp'); return true; }
  useItem(h, idx) {
    const s = h.items[idx]; if (!s || h.dead) return false;
    if (s.id === 'potion') { h.potions.push({ until: this.time + 12, rate: 150 / 12 }); s.n--; if (s.n <= 0) h.items.splice(idx, 1); this.fx('healBurst', { target: h, dur: 1 }); this.sfx('heal', h.x, h.y); return true; }
    return false;
  }

  // ---------- Boutique à recettes ----------
  priceFor(h, id) {
    const used = new Set();
    const rec = (iid, top) => {
      if (!top) { const idx = h.items.findIndex((s, i) => s.id === iid && !used.has(i)); if (idx >= 0) { used.add(idx); return 0; } }
      const it = ITEMS[iid]; let p = it.recipe;
      for (const c of (it.from || [])) p += rec(c, false);
      return p;
    };
    return { price: rec(id, true), used };
  }
  buy(h, id) {
    const it = ITEMS[id];
    if (!this.canShop(h)) { this.castFail(h, 'Revenez à la base pour acheter'); return false; }
    if (it.consumable) {
      const slot = h.items.find(s => s.id === id && s.n < it.stack);
      if (h.gold < it.recipe) return this.castFail(h, 'Pas assez d’or');
      if (!slot && h.items.length >= 6) return this.castFail(h, 'Inventaire plein');
      h.gold -= it.recipe; if (slot) slot.n++; else h.items.push({ id, n: 1 });
      if (h.isPlayer) this.sfx('buy'); return true;
    }
    const { price, used } = this.priceFor(h, id);
    if (h.gold < price) return this.castFail(h, 'Pas assez d’or');
    if (h.items.length - used.size + 1 > 6) return this.castFail(h, 'Inventaire plein : revendez un objet');
    h.items = h.items.filter((s, i) => !used.has(i));
    h.items.push({ id }); h.gold -= price; h.recompute();
    if (h.isPlayer) this.sfx('buy');
    return true;
  }
  sell(h, idx) {
    if (!this.canShop(h) || idx >= h.items.length) return false;
    const s = h.items.splice(idx, 1)[0], it = ITEMS[s.id];
    h.gold += Math.round(it.consumable ? it.recipe * 0.5 * s.n : it.cost * 0.7); h.recompute();
    if (h.isPlayer) this.sfx('buy');
    return true;
  }

  // ---------- Déplacements spéciaux ----------
  startDash(h, x, y, o) {
    const d0 = Utils.dist(h.x, h.y, x, y), ang = d0 > 1 ? Math.atan2(y - h.y, x - h.x) : h.angle;
    const dist = o.fixed ? o.dist : Math.min(o.dist, Math.max(60, d0));
    h.dash = { ang, dist, done: 0, speed: o.speed, onTouch: o.onTouch, onEnd: o.onEnd, hit: new Set(), kind: o.kind || 'dash' };
    h.angle = ang; h.order = null; if (h.recall) h.recall = null;
  }
  leap(h, x, y, dur, onLand, follow) {
    h.dash = { leap: true, x0: h.x, y0: h.y, tx: x, ty: y, t: 0, dur, onLand, follow };
    h.angle = Utils.angleTo(h.x, h.y, x, y); h.order = null; if (h.recall) h.recall = null;
  }
  updateDash(h, dt) {
    const d = h.dash;
    if (d.leap) {
      d.t += dt; const k = Math.min(1, d.t / d.dur);
      const tx = d.follow && !d.follow.dead ? d.follow.x - Math.cos(h.angle) * (d.follow.radius + h.radius) : d.tx, ty = d.follow && !d.follow.dead ? d.follow.y - Math.sin(h.angle) * (d.follow.radius + h.radius) : d.ty;
      h.x = d.x0 + (tx - d.x0) * k; h.y = d.y0 + (ty - d.y0) * k; h.z = Math.sin(k * Math.PI) * 60; h.moving = true;
      if (k >= 1) { h.z = 0; MAP.resolve(h); h.dash = null; if (d.onLand) d.onLand(); }
      return;
    }
    const step = Math.min(d.speed * dt, d.dist - d.done), ox = h.x, oy = h.y;
    h.x += Math.cos(d.ang) * step; h.y += Math.sin(d.ang) * step; MAP.resolve(h);
    const moved = Utils.dist(ox, oy, h.x, h.y); d.done += step; h.moving = true; h.walk += dt * 20;
    if (Math.random() < 0.5) this.fx('dust', { x: h.x, y: h.y, size: h.radius, dur: 0.6 });
    let stop = false;
    if (d.onTouch) for (const u of this.enemyUnits(h.team)) { if (d.hit.has(u.id)) continue; if (Utils.dist(h.x, h.y, u.x, u.y) <= h.radius + u.radius + 10) { d.hit.add(u.id); if (d.onTouch(u)) { stop = true; break; } } }
    if (stop || d.done >= d.dist - 0.5 || moved < step * 0.3) { h.dash = null; if (d.onEnd) d.onEnd(); }
  }
  blink(h, x, y, max) {
    const d = Utils.dist(h.x, h.y, x, y), k = d > max ? max / d : 1;
    const c = MAP.freePoint(h.x + (x - h.x) * k, h.y + (y - h.y) * k);
    this.fx('blink', { x: h.x, y: h.y, dur: 0.5 });
    if (d > 1) h.angle = Utils.angleTo(h.x, h.y, x, y);
    h.x = h.px = c.x; h.y = h.py = c.y; MAP.resolve(h); h.order = null; if (h.recall) h.recall = null;
    this.fx('blink', { x: h.x, y: h.y, dur: 0.5 }); this.sfx('blink', h.x, h.y);
  }
  startChannel(h, o) { h.channel = { until: this.time + o.dur, every: o.every || 0, tickT: 0, onTick: o.onTick, onEnd: o.onEnd, cancelOnMove: !!o.cancelOnMove, kind: o.kind, ang: o.ang, range: o.range, half: o.half, length: o.length, width: o.width, start: this.time, dur: o.dur }; h.order = null; if (o.ang !== undefined) h.angle = o.ang; }
  updateChannel(h, dt) { const c = h.channel; if (c.every) { c.tickT -= dt; if (c.tickT <= 0) { c.tickT += c.every; c.onTick(); } } if (this.time >= c.until && h.channel === c) this.endChannel(h, false); }
  endChannel(h, cancelled) { const c = h.channel; h.channel = null; if (c && c.onEnd) c.onEnd(cancelled); }

  // ---------- Projectiles et zones ----------
  skillshot(h, x, y, o) { const ang = Utils.angleTo(h.x, h.y, x, y); this.projectiles.push(new Projectile({ x: h.x + Math.cos(ang) * h.radius, y: h.y + Math.sin(ang) * h.radius, ang, speed: o.speed, range: o.range, width: o.width, team: h.team, src: h, pierce: !!o.pierce, hitAllies: !!o.hitAllies, onHit: o.onHit, visual: o.visual, traveled: 0, hit: new Set() })); }
  homing(src, tg, o) { const ang = Utils.angleTo(src.x, src.y, tg.x, tg.y), off = src.kind === 'tower' ? 20 : (src.radius || 10) * 0.8; this.projectiles.push(new Projectile({ homing: true, x: src.x + Math.cos(ang) * off, y: src.y + Math.sin(ang) * off, ang, speed: o.speed, target: tg, team: src.team, src, onHit: o.onHit, visual: o.visual, high: src.kind === 'tower' })); }
  updateProjectile(p, dt) {
    p.age += dt;
    if (p.homing) {
      const tg = p.target; if (!tg || tg.dead) { p.dead = true; return; }
      const d = Utils.dist(p.x, p.y, tg.x, tg.y), step = p.speed * dt;
      if (d <= step + tg.radius * 0.6) { p.dead = true; p.onHit(tg); return; }
      p.ang = Utils.angleTo(p.x, p.y, tg.x, tg.y); p.x += Math.cos(p.ang) * step; p.y += Math.sin(p.ang) * step; return;
    }
    const step = Math.min(p.speed * dt, p.range - p.traveled), x0 = p.x, y0 = p.y;
    p.x += Math.cos(p.ang) * step; p.y += Math.sin(p.ang) * step; p.traveled += step;
    const cands = this.enemyUnits(p.team);
    if (p.hitAllies) for (const a of this.heroes) if (!a.dead && a.team === p.team && a !== p.src) cands.push(a);
    let firstD = Infinity, first = null;
    for (const u of cands) {
      if (p.hit.has(u.id)) continue;
      const pr = Utils.projSeg(u.x, u.y, x0, y0, p.x, p.y);
      if (Utils.dist(u.x, u.y, pr.x, pr.y) <= u.radius + p.width / 2) {
        if (p.pierce) { p.hit.add(u.id); p.onHit(u); }
        else { const dd = Utils.dist(x0, y0, u.x, u.y); if (dd < firstD) { firstD = dd; first = u; } }
      }
    }
    if (first) { p.hit.add(first.id); p.onHit(first); p.dead = true; }
    if (p.traveled >= p.range - 0.1) p.dead = true;
  }
  addZone(o) { const z = new Zone(o); this.zones.push(z); return z; }
  updateZone(z, dt) {
    z.t += dt;
    if (!z.armed && z.t >= z.delay) { z.armed = true; if (z.onArm) z.onArm(z); if (z.instant) { z.dead = true; return; } }
    if (z.armed) {
      if (z.every) { z.tickT -= dt; if (z.tickT <= 0) { z.tickT += z.every; z.onTick(z); } }
      if (z.trigger) for (const u of this.enemyUnits(z.team)) if (u.kind !== 'monster' && Utils.dist(u.x, u.y, z.x, z.y) <= z.r + u.radius * 0.5) { z.onTrigger(u, z); z.dead = true; break; }
    }
    if (z.t >= z.delay + z.dur) z.dead = true;
  }
  aoe(team, x, y, r, fn) { const list = this.enemyUnits(team).filter(u => Utils.dist(x, y, u.x, u.y) <= r + u.radius); for (const u of list) fn(u); return list; }

  // ---------- États ----------
  stun(u, d) { if (u.kind !== 'hero' && u.kind !== 'minion' && u.kind !== 'monster') return; if (u.def && u.def.epic) d *= 0.3; u.status.stun = Math.max(u.status.stun, this.time + d); if (u.kind === 'hero') { if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); } this.fx('stun', { target: u, dur: d }); }
  root(u, d) { u.status.root = Math.max(u.status.root, this.time + d); if (u.recall) u.recall = null; this.fx('root', { target: u, dur: d }); }
  slow(u, pct, d) { u.status.slows.push({ pct, until: this.time + d }); }
  haste(u, pct, d) { u.status.hastes.push({ pct, until: this.time + d }); }
  shield(u, amt, d) { u.status.shields.push({ amt, until: this.time + d }); this.fx('shield', { target: u, dur: d }); }
  taunt(u, src, d) {
    if (u.kind === 'hero') { u.status.taunt = { src, until: this.time + d }; if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); }
    else if (u.kind === 'minion') { u.aggro = src; u.aggroUntil = this.time + d; u.target = src; }
    else if (u.kind === 'monster') { u.status.taunt = { src, until: this.time + d }; this.aggroCamp(u, src); }
    this.fx('taunt', { target: u, dur: d });
  }
  dot(u, kind, dps, dur, src) { const cur = u.status[kind]; if (cur && cur.until > this.time && cur.dps > dps) { cur.until = this.time + dur; return; } u.status[kind] = { dps, until: this.time + dur, src, tick: 0.5 }; }
  updateDots(dt) {
    const t = this.time;
    const tick = u => { for (const kind of ['burn', 'bleed']) { const s = u.status[kind]; if (!s) continue; if (s.until <= t) { u.status[kind] = null; continue; } s.tick -= dt; if (s.tick <= 0) { s.tick += 0.5; this.damage(s.src && !s.src.dead ? s.src : null, u, s.dps * 0.5, kind === 'burn' ? 'magic' : 'phys', { dot: true }); } } };
    for (const h of this.heroes) if (!h.dead) tick(h);
    for (const m of this.minions) if (!m.dead && (m.status.burn || m.status.bleed)) tick(m);
    for (const m of this.monsters) if (!m.dead && (m.status.burn || m.status.bleed)) tick(m);
  }
  addBuff(h, b) {
    h.buffs = h.buffs.filter(x => x.id !== b.id);
    h.buffs.push({ ...b, until: this.time + b.dur });
    h.scale = Math.max(1, ...h.buffs.map(x => x.scale || 1));
    h.recompute();
  }
  heal(src, u, amt) {
    if (u.dead) return 0;
    const a = amt * (1 + (src && src.st && src.st.healPower || 0)), before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + a);
    const got = u.hp - before;
    if (got >= 1 && (u === this.player || src === this.player)) this.float('+' + Math.round(got), u.x, u.y, '#8cff7a');
    return got;
  }

  // ---------- Dégâts ----------
  damage(src, tg, amount, type = 'phys', opt = {}) {
    if (!tg || tg.dead) return 0;
    if (src && src.team === tg.team) return 0;
    if ((tg.kind === 'tower' || tg.kind === 'inhib' || tg.kind === 'nexus') && !this.isTargetable(tg, 1 - tg.team)) return 0;
    let dmg = amount;
    if (src && src.kind === 'hero' && src.team < 2) dmg *= 1 + 0.06 * this.dragons[src.team];
    if (src && src.kind === 'minion' && (tg.kind !== 'minion') && this.heroes.some(h => !h.dead && h.team === src.team && h.hasBuff('titan') && Utils.dist(h.x, h.y, src.x, src.y) < 800)) dmg *= 1.5;
    if (type === 'phys') dmg *= 100 / (100 + Math.max(0, tg.st.armor || 0));
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, tg.st.resist || 0));
    if (tg.kind === 'tower' || tg.kind === 'inhib' || tg.kind === 'nexus') {
      if (src && src.kind === 'minion') dmg *= src.def.siege ? 1.5 : 1;
      if (!this.alliedMinionsNear(1 - tg.team, tg.x, tg.y, 600)) dmg *= 0.4;
    }
    if (tg.status.dr && tg.status.dr.until > this.time) dmg *= 1 - tg.status.dr.pct;
    const t = this.time;
    if (tg.status.shields.length) for (const s of tg.status.shields) { if (s.until <= t || dmg <= 0) continue; const a = Math.min(s.amt, dmg); s.amt -= a; dmg -= a; }
    tg.hp -= dmg; tg.lastHit = t;
    if (tg.kind === 'hero') { if (tg.recall) { tg.recall = null; if (tg.isPlayer) this.log('Retour interrompu', 'warn'); } if (src && src.kind === 'hero') tg.damagedBy.set(src.id, t); if (opt.basic && tg.st.thorns && src && !src.dead) this.damage(tg, src, dmg * tg.st.thorns, 'magic'); }
    if (tg.kind === 'monster' && src) this.aggroCamp(tg, src.kind === 'turretZone' ? null : src);
    if (src && src.kind === 'hero') {
      src.lastCombat = t;
      if (tg.kind === 'hero') src.dmgDealt += dmg;
      if (opt.basic && src.st.lifesteal) src.hp = Math.min(src.maxHp, src.hp + dmg * src.st.lifesteal);
      if (tg.kind === 'hero') this.callForHelp(src, tg);
    }
    if (dmg >= 1 && !opt.silent && this.player && (src === this.player || tg === this.player))
      this.float(Math.round(dmg) + (opt.crit ? '!' : ''), tg.x, tg.y, tg === this.player ? '#ff6a5a' : opt.crit ? '#ff9a3a' : type === 'magic' ? '#9fd8ff' : type === 'true' ? '#ffffff' : '#ffd27a', opt.crit || dmg > 150);
    if (tg.hp <= 0) { tg.hp = 0; this.kill(tg, src); }
    return dmg;
  }
  callForHelp(src, victim) {
    for (const tw of this.towers) if (!tw.dead && tw.team === victim.team && Utils.dist(tw.x, tw.y, src.x, src.y) <= TOWER.range + src.radius) { tw.aggro = src; tw.aggroUntil = this.time + 2.5; }
    for (const m of this.minions) if (!m.dead && m.team === victim.team && Utils.dist(m.x, m.y, src.x, src.y) < 420) { m.aggro = src; m.aggroUntil = this.time + 2.5; }
  }
  kill(u, src) {
    if (u.dead) return;
    u.dead = true;
    const t = this.time;
    const killerHero = src && src.kind === 'hero' ? src : null;
    if (u.kind === 'minion') {
      if (killerHero) { const gold = u.def.gold + Math.floor(t / 90); killerHero.gold += gold; killerHero.cs++; if (killerHero.isPlayer) { this.float('+' + gold, u.x, u.y, '#ffd34d', true); this.sfx('gold'); } }
      this.shareXp(1 - u.team, u.x, u.y, u.def.xp);
      this.fx('death', { x: u.x, y: u.y, size: u.radius * 1.6, dur: 0.7, team: u.team });
      if (u.def.siege || u.def.super) this.fx('explosion', { x: u.x, y: u.y, size: 50, dur: 0.8 });
    } else if (u.kind === 'monster') {
      const k = killerHero || (src && src.kind === 'minion' ? null : null);
      if (k) {
        k.gold += u.def.gold; k.cs += u.def.epic ? 4 : 2; this.addXp(k, u.def.xp);
        if (k.isPlayer) { this.float('+' + u.def.gold, u.x, u.y, '#ffd34d', true); this.sfx('gold'); }
        if (u.def.buff) { this.addBuff(k, { id: u.def.buff, dur: BUFFS[u.def.buff].dur, stats: u.def.buff === 'blue' ? { cdr: 0.2, manaRegen: 6 } : {} }); if (k.isPlayer) this.announce(BUFFS[u.def.buff].name, BUFFS[u.def.buff].desc, 'good'); }
        if (u.def.epic) for (const h of this.heroes) if (h.team === k.team && h !== k && !h.dead) this.addXp(h, u.def.xp * 0.5);
      }
      this.fx('death', { x: u.x, y: u.y, size: u.radius * 1.6, dur: 0.8, team: 2 });
      u.camp.alive = u.camp.alive.filter(m => !m.dead);
      if (!u.camp.alive.length) this.campCleared(u.camp, k || src);
    } else if (u.kind === 'hero') this.heroDeath(u, src);
    else if (u.kind === 'tower') {
      this.towersDown[u.team]++;
      for (const h of this.heroes) if (h.team !== u.team) h.gold += 150;
      this.rubble.push({ x: u.x, y: u.y, r: u.radius, team: u.team, seed: Math.random() });
      this.fx('explosion', { x: u.x, y: u.y, size: 110, dur: 1.6 }); this.sfx('towerFall', u.x, u.y);
      this.announce(u.team === 0 ? 'Tourelle perdue' : 'Tourelle détruite', u.lane ? LANE_NAMES[u.lane] : 'Défense du réacteur', u.team === 0 ? 'bad' : 'good');
    } else if (u.kind === 'inhib') {
      u.respawnAt = t + CONFIG.INHIB_RESPAWN;
      for (const h of this.heroes) if (h.team !== u.team) h.gold += 50;
      this.fx('explosion', { x: u.x, y: u.y, size: 100, dur: 1.4 }); this.sfx('towerFall', u.x, u.y);
      this.announce(u.team === 0 ? 'Inhibiteur détruit' : 'Inhibiteur ennemi détruit', u.team === 0 ? 'Des mastodontes ennemis vont déferler' : 'Nos mastodontes vont déferler', u.team === 0 ? 'bad' : 'good');
    } else if (u.kind === 'nexus') {
      this.state = 'over'; this.winner = 1 - u.team; this.endAt = t + 3.5;
      this.fx('explosion', { x: u.x, y: u.y, size: 260, dur: 3 }); this.sfx('coreFall', u.x, u.y);
      this.camera.locked = false; this.camera.focus = { x: u.x, y: u.y };
      this.announce(this.winner === 0 ? 'Victoire' : 'Défaite', this.winner === 0 ? 'Le réacteur des Charognards a sauté' : 'Notre réacteur a sauté', this.winner === 0 ? 'good' : 'bad');
    }
  }
  shareXp(team, x, y, amount) { const rec = this.heroes.filter(h => !h.dead && h.team === team && Utils.dist(h.x, h.y, x, y) <= CONFIG.XP_RANGE); if (!rec.length) return; const each = rec.length === 1 ? amount : amount * 1.25 / rec.length; for (const h of rec) this.addXp(h, each); }
  addXp(h, amt) {
    if (h.level >= CONFIG.MAX_LEVEL) return;
    h.xp += amt;
    while (h.level < CONFIG.MAX_LEVEL && h.xp >= xpToNext(h.level)) {
      h.xp -= xpToNext(h.level); h.level++; h.points++; h.recompute();
      this.fx('levelup', { target: h, dur: 1.2 });
      if (h.isPlayer) { this.sfx('levelup'); if (h.level === 6) this.log('Niveau 6 : votre ultime est disponible', 'good'); }
    }
    if (h.level >= CONFIG.MAX_LEVEL) h.xp = 0;
  }
  heroDeath(v, src) {
    const t = this.time;
    v.d++; v.respawnAt = t + respawnTime(v.level, t);
    v.order = null; v.dash = null; v.channel = null; v.recall = null; v.empower = null; v.z = 0;
    v.status = { stun: 0, root: 0, slows: [], hastes: [], shields: [], taunt: null, burn: null, bleed: null };
    v.buffs = []; v.potions = []; v.scale = 1; v.recompute();
    let killer = src && src.kind === 'hero' ? src : null;
    const recent = [...v.damagedBy.entries()].filter(([, tt]) => t - tt <= CONFIG.ASSIST_WINDOW);
    if (!killer && recent.length) { recent.sort((a, b) => b[1] - a[1]); killer = this.heroes.find(h => h.id === recent[0][0]) || null; }
    const assisters = this.heroes.filter(h => h !== killer && h.team !== v.team && recent.some(([id]) => id === h.id));
    const bounty = Math.min(600, 300 + 60 * Math.max(0, v.streak - 1));
    if (killer) { killer.k++; killer.streak++; killer.gold += bounty + (this.firstBlood ? 0 : 100); killer.multi = t - killer.multi.t < 10 ? { n: killer.multi.n + 1, t } : { n: 1, t }; this.kills[killer.team]++; }
    v.streak = 0;
    for (const a of assisters) { a.a++; a.gold += Math.round(bounty * 0.5 / assisters.length); }
    const rec = [killer, ...assisters].filter(Boolean), xp = 120 + 35 * v.level;
    for (const h of rec) this.addXp(h, rec.length > 1 ? xp * 1.3 / rec.length : xp);
    v.damagedBy.clear();
    this.fx('heroDeath', { x: v.x, y: v.y, dur: 1.4, team: v.team }); this.sfx('death', v.x, v.y);
    if (this.ui) this.ui.feed(killer, v, assisters);
    if (killer && !this.firstBlood) { this.firstBlood = true; this.announce('Premier sang', `${killer.name} élimine ${v.name}`, killer.team === 0 ? 'good' : 'bad'); }
    else if (killer && killer.multi.n >= 2) this.announce(['', '', 'Double élimination', 'Triple élimination', 'Quadruple élimination', 'Pentakill'][Math.min(5, killer.multi.n)], killer.name, killer.team === 0 ? 'good' : 'bad');
    else if (v.isPlayer) this.announce('Vous êtes à terre', killer ? `Éliminé par ${killer.name}` : 'Exécuté', 'bad');
    else if (killer && killer.isPlayer) this.announce('Ennemi éliminé', v.name, 'good');
    else if (v.team === 0) this.announce('Un allié est tombé', v.name, 'bad');
    else this.announce('Ennemi éliminé', v.name, 'good');
  }
  respawn(h) {
    const f = MAP.fountains[h.team];
    h.dead = false; h.x = h.px = f.x + Utils.rand(-40, 40); h.y = h.py = f.y + Utils.rand(-40, 40);
    h.hp = h.maxHp; h.mana = h.maxMana; h.order = null; h.attackCd = 0;
    this.fx('teleport', { x: h.x, y: h.y, dur: 0.9, team: h.team });
    if (h.isPlayer) this.sfx('respawn');
  }

  // ---------- Sbires ----------
  updateMinion(m, dt) {
    const t = this.time;
    m.attackCd -= dt; m.moving = false;
    if (m.stunned(t)) return;
    m.retarget -= dt;
    if (m.retarget <= 0 || !this.validMinionTarget(m, m.target)) { m.retarget = 0.35; m.target = this.minionPickTarget(m); }
    const tg = m.target;
    if (tg) {
      const reach = m.def.range + m.radius + tg.radius;
      if (Utils.dist(m.x, m.y, tg.x, tg.y) <= reach) {
        m.angle = Utils.lerpAngle(m.angle, Utils.angleTo(m.x, m.y, tg.x, tg.y), 0.3);
        if (m.attackCd <= 0) {
          m.attackCd = m.def.period; m.attackAnim = t;
          if (m.def.ranged) this.homing(m, tg, { speed: m.def.siege ? 650 : 780, visual: m.def.siege ? 'shell' : 'bolt', onHit: u => this.damage(m, u, m.ad, 'phys') });
          else this.damage(m, tg, m.ad, 'phys');
          if (Math.random() < 0.15) this.sfx(m.def.ranged ? 'bow' : 'clank', m.x, m.y);
        }
      } else this.moveToward(m, tg.x, tg.y, dt, reach - 4);
    } else {
      const p = MAP.progress(m.team, m.lane, m.x, m.y);
      const pt = MAP.pointAt(m.team, m.lane, p + 140, m.lat);
      this.moveToward(m, pt.x, pt.y, dt, 4);
    }
  }
  validMinionTarget(m, tg) { return tg && !tg.dead && tg.kind !== 'monster' && this.isTargetable(tg, m.team) && Utils.dist(m.x, m.y, tg.x, tg.y) < 520; }
  minionPickTarget(m) {
    if (m.aggro && this.time < m.aggroUntil && this.validMinionTarget(m, m.aggro) && Utils.dist(m.x, m.y, m.aggro.x, m.aggro.y) < 480) return m.aggro;
    const R = 340; let best = null, bd = Infinity;
    for (const o of this.minions) if (!o.dead && o.team !== m.team) { const d = Utils.dist(m.x, m.y, o.x, o.y); if (d < R && d < bd) { bd = d; best = o; } }
    if (best) return best;
    for (const s of this.structures()) if (this.isTargetable(s, m.team)) { const d = Utils.dist(m.x, m.y, s.x, s.y) - s.radius; if (d < R + 40 && d < bd) { bd = d; best = s; } }
    if (best) return best;
    for (const h of this.heroes) if (!h.dead && h.team !== m.team && h.vis[m.team]) { const d = Utils.dist(m.x, m.y, h.x, h.y); if (d < R && d < bd) { bd = d; best = h; } }
    return best;
  }

  // ---------- Tourelles ----------
  updateTower(tw, dt) {
    const t = this.time; tw.attackCd -= dt;
    const inRange = u => u && !u.dead && u.team !== tw.team && u.team !== 2 && Utils.dist(tw.x, tw.y, u.x, u.y) <= TOWER.range + u.radius;
    if (tw.aggro && t < tw.aggroUntil && inRange(tw.aggro) && tw.target !== tw.aggro) { tw.target = tw.aggro; tw.ramp = 0; }
    if (!inRange(tw.target)) {
      tw.target = null; tw.ramp = 0; let best = null, bd = Infinity;
      for (const m of this.minions) if (inRange(m)) { const d = Utils.dist(tw.x, tw.y, m.x, m.y); if (d < bd) { bd = d; best = m; } }
      if (!best) for (const h of this.heroes) if (inRange(h)) { const d = Utils.dist(tw.x, tw.y, h.x, h.y); if (d < bd) { bd = d; best = h; } }
      tw.target = best;
    }
    if (!tw.target) return;
    tw.turretAngle = Utils.lerpAngle(tw.turretAngle, Utils.angleTo(tw.x, tw.y, tw.target.x, tw.target.y), Math.min(1, dt * 8));
    if (tw.attackCd > 0) return;
    tw.attackCd = TOWER.period; tw.attackAnim = t;
    const tg = tw.target, isHero = tg.kind === 'hero';
    let dmg;
    if (isHero) { dmg = (TOWER.dmg + TOWER.perMin * t / 60) * (1 + tw.ramp); tw.ramp = Math.min(1.2, tw.ramp + 0.4); }
    else dmg = tg.maxHp * (tg.type === 'siege' ? 0.14 : tg.type === 'super' ? 0.08 : tg.type === 'ranged' ? 0.7 : 0.45);
    this.homing(tw, tg, { speed: 850, visual: 'flare', onHit: u => this.damage(tw, u, dmg, isHero ? 'phys' : 'true', { silent: !isHero }) });
    this.sfx('tower', tw.x, tw.y);
  }

  // ---------- Collisions ----------
  separate() {
    const us = [];
    for (const h of this.heroes) if (!h.dead && !h.dash) us.push(h);
    for (const m of this.minions) if (!m.dead) us.push(m);
    for (const m of this.monsters) if (!m.dead) us.push(m);
    // Grille spatiale pour limiter les paires
    const B = 80, cells = new Map();
    for (const u of us) { const k = Math.floor(u.x / B) * 1000 + Math.floor(u.y / B); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(u); }
    for (const a of us) {
      const cx = Math.floor(a.x / B), cy = Math.floor(a.y / B);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = cells.get((cx + dx) * 1000 + cy + dy); if (!list) continue;
        for (const b of list) {
          if (b.id <= a.id) continue;
          const ddx = b.x - a.x, ddy = b.y - a.y, min = a.radius + b.radius, d2 = ddx * ddx + ddy * ddy;
          if (d2 >= min * min) continue;
          if (d2 < 0.01) { a.x += Utils.rand(-1, 1); continue; }
          const d = Math.sqrt(d2), push = (min - d) * 0.5, nx = ddx / d, ny = ddy / d;
          let wa = 0.5, wb = 0.5;
          if (a.kind === 'hero' && b.kind !== 'hero') { wa = 0.15; wb = 0.85; } else if (b.kind === 'hero' && a.kind !== 'hero') { wa = 0.85; wb = 0.15; }
          a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
        }
      }
    }
    for (const a of us) {
      for (const s of this.structures()) {
        if (s.dead) continue;
        const dx = a.x - s.x, dy = a.y - s.y, min = a.radius + s.radius;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d2 = dx * dx + dy * dy; if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01; a.x = s.x + dx / d * min; a.y = s.y + dy / d * min;
      }
      MAP.resolve(a);
    }
  }
}
