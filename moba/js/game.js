// ============ Simulation de la partie ============
class Game {
  constructor(opts, audio) {
    MAP.init(); NEXT_ID = 1;
    this.opts = opts; this.audio = audio; this.ui = null; this.net = null; this.remote = null;
    this.diff = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    this.time = 0; this.paused = false; this.state = 'playing'; this.endAt = 0; this.winner = null;
    this.heroes = []; this.minions = []; this.monsters = []; this.towers = []; this.inhibs = []; this.nexuses = [];
    this.projectiles = []; this.zones = []; this.effects = []; this.floats = []; this.rubble = [];
    this.kills = [0, 0]; this.towersDown = [0, 0]; this.dragons = [0, 0]; this.firstBlood = false;
    this.waveN = 0; this.nextWave = CONFIG.WAVE_FIRST; this.spawnQueue = [];
    this.visSources = [[], []]; this.visTimer = 0; this.timers = [];
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
    // o.blue / o.red : listes { id, role, human, peer, nick, me } ; « me » désigne le héros de ce poste
    const client = o.mode === 'client';
    [o.blue, o.red].forEach((list, team) => list.forEach(p => {
      const h = new Hero(p.id, team, this, { player: !!p.me, role: p.role });
      h.human = !!p.human; h.peer = p.peer || null; h.nick = p.nick || '';
      if (!client && (!p.human || (p.me && o.autoPlayer))) h.bot = new HeroBot(this, h);
      this.heroes.push(h);
    }));
    for (const team of [0, 1]) this.heroes.filter(h => h.team === team).forEach((h, i) => { const f = MAP.fountains[team], a = i * 1.25; h.x = h.px = f.x + Math.cos(a) * 70; h.y = h.py = f.y + Math.sin(a) * 70; });
  }

  // ---------- Accès ----------
  // Présentation : tout ce qui part vers l'écran passe par ici, pour le joueur local
  // comme pour les joueurs distants (l'hôte relaie ces événements sur le réseau).
  log(text, cls) { if (this.ui) this.ui.toast(text, cls); }
  watched(u) { return !!u && u.kind === 'hero' && (u.isPlayer || u.human); }
  notify(h, text, cls) { if (h === this.player) this.log(text, cls); else if (this.net && h.human) this.net.event(['t', h.id, text, cls || ''], true); }
  sfx(name, x, y) { if (this.audio) this.audio.play(name, x, y); if (this.net) this.net.event(['s', name, x === undefined ? -1 : Math.round(x), y === undefined ? -1 : Math.round(y)]); }
  sfxFor(h, name) { if (h === this.player) { if (this.audio) this.audio.play(name); } else if (this.net && h.human) this.net.event(['s', name, -1, -1, h.id]); }
  fx(type, props) { if (this.effects.length < 500) this.effects.push(new Effect(type, props)); if (this.net) this.net.fx(type, props); }
  float(text, x, y, color, big, owner) {
    x += Utils.rand(-8, 8);
    if ((!owner || owner === this.player) && this.floats.length < 80) this.floats.push({ text: String(text), x, y, color, big, t: 0, dur: 0.9 });
    if (this.net && owner && owner.human && owner !== this.player) this.net.event(['f', owner.id, String(text), Math.round(x), Math.round(y), color, big ? 1 : 0]);
  }
  say(key, data, only) {
    if (this.ui && (!only || only === this.player)) { const a = narrate(this, key, data, this.player); if (a) this.ui.announce(a[0], a[1], a[2]); }
    if (this.net) this.net.event(['a', key, data, only ? only.id : 0], true);
  }
  feedKill(killer, v, assisters) { if (this.ui) this.ui.feed(killer, v, assisters); if (this.net) this.net.event(['k', killer ? killer.id : 0, v.id, assisters.length], true); }
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
    if (this.remote) { this.remote.tick(dt); return; }
    if (this.paused) return;
    this.time += dt;
    if (this.state === 'playing') {
      if (this.time >= this.nextWave) { this.queueWave(); this.nextWave += CONFIG.WAVE_PERIOD; }
      this.processSpawns(); this.updateCamps();
      for (const h of this.heroes) this.updateHero(h, dt);
      for (const m of this.minions) if (!m.dead) this.updateMinion(m, dt);
      for (const m of this.monsters) if (!m.dead) this.updateMonster(m, dt);
      for (const tw of this.towers) if (!tw.dead) this.updateTower(tw, dt);
      for (const i of this.inhibs) if (i.dead && this.time >= i.respawnAt) { i.dead = false; i.hp = i.maxHp; this.say('inhibBack', { team: i.team, lane: i.lane }); }
      for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt);
      for (const z of this.zones) if (!z.dead) this.updateZone(z, dt);
      this.updateDots(dt);
      if (this.timers.length) { const due = this.timers.filter(x => x.at <= this.time); if (due.length) { this.timers = this.timers.filter(x => x.at > this.time); for (const x of due) x.fn(); } }
      this.updateAir();
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
      // Flair de Louve : les ennemis blessés sont révélés à toute son équipe
      for (const l of this.heroes) if (!l.dead && l.team === team && l.def.passive === 'scent') for (const e of this.heroes) if (!e.dead && e.team !== team && e.hp / e.maxHp < 0.4 && Utils.dist(l.x, l.y, e.x, e.y) < 1600) e.vis[team] = true;
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
    if (this.waveN === 1) { this.say('waves', {}); this.sfx('horn'); }
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
      if (c.epic) this.say('epic', { id: c.id });
    }
  }
  aggroCamp(m, src) {
    if (!src || src.dead || src.team === 2) return;
    for (const o of m.camp.alive) if (!o.dead && !o.resetting && !o.target) o.target = src;
    if (!m.target) m.target = src;
  }
  updateMonster(m, dt) {
    const t = this.time; m.attackCd -= dt; m.moving = false;
    if (m.disp) { this.updateDisp(m, dt); return; }
    if (m.stunned(t)) return;
    if (this.flee(m, dt)) return;
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
      this.say('worm', { team, n: this.dragons[team] });
    } else if (c.id === 'titan') {
      for (const h of this.heroes) if (h.team === team && !h.dead) this.addBuff(h, { id: 'titan', dur: BUFFS.titan.dur, stats: { ad: 40, ap: 40 } });
      for (const h of this.heroes) if (h.team === team) h.gold += 200;
      this.say('titan', { team });
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
    const P = h.passive; if (P && P.tick) P.tick(this, h, dt);
    if (h.dead) return;
    if (h.bot) h.bot.update(dt);
    if (h.disp) { this.updateDisp(h, dt); return; }
    if (h.recall) {
      if (t >= h.recall.end) { h.recall = null; this.fx('teleport', { x: h.x, y: h.y, dur: 0.6, team: h.team }); h.x = h.px = f.x + Utils.rand(-40, 40); h.y = h.py = f.y + Utils.rand(-40, 40); h.order = null; h.path = null; this.fx('teleport', { x: h.x, y: h.y, dur: 0.8, team: h.team }); this.sfx('recallEnd', h.x, h.y); }
      return;
    }
    if (h.dash) { this.updateDash(h, dt); return; }
    if (h.channel) { if (h.stunned(t)) this.endChannel(h, true); else { this.updateChannel(h, dt); return; } }
    if (h.stunned(t)) return;
    if (this.flee(h, dt)) return;
    const taunt = h.taunted(t);
    if (taunt) { if (this.inAttackRange(h, taunt)) this.tryAttack(h, taunt); else this.moveToward(h, taunt.x, taunt.y, dt, h.atkRange() + h.radius + taunt.radius - 6); return; }
    this.executeOrder(h, dt);
  }
  executeOrder(h, dt) {
    let o = h.order;
    if (o && o.target && (o.target.dead || (o.target.team !== h.team && !this.isTargetable(o.target, h.team)) || (o.target.vis && o.target.team !== h.team && !o.target.vis[h.team] && o.target.kind !== 'tower'))) o = h.order = null;
    if (!o) {
      const e = this.nearestAttackable(h, h.atkRange() + h.radius + 6);
      if (e) this.tryAttack(h, e);
      return;
    }
    if (o.type === 'move') { if (this.followPath(h, o, dt)) h.order = null; }
    else if (o.type === 'attack') {
      const tg = o.target;
      if (this.inAttackRange(h, tg)) this.tryAttack(h, tg);
      else this.chase(h, tg, h.atkRange() + h.radius + tg.radius - 6, dt);
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
  inAttackRange(h, tg) { return Utils.dist(h.x, h.y, tg.x, tg.y) <= h.atkRange() + h.radius + tg.radius; }
  tryAttack(h, tg) {
    h.angle = Utils.lerpAngle(h.angle, Utils.angleTo(h.x, h.y, tg.x, tg.y), 0.5);
    if (h.attackCd > 0) return;
    h.attackCd = 1 / h.st.as; h.attackAnim = this.time;
    const P = h.passive, gun = !h.def.ranged && P && P.range && P.range(h) > 0;
    if (h.def.ranged || gun) { const vis = gun ? 'bullet' : h.def.projectile; this.homing(h, tg, { speed: gun ? 1600 : 1000, visual: vis, onHit: u => this.basicHit(h, u) }); this.sfx({ bullet: 'rifle', spark: 'sparkShot', ember: 'flameShot' }[vis] || 'dart', h.x, h.y); if (gun) this.fx('muzzle', { x: h.x, y: h.y, angle: h.angle, dur: 0.12 }); }
    else { this.basicHit(h, tg); this.fx('slash', { x: tg.x, y: tg.y, angle: h.angle, dur: 0.2, big: !!h.def.blade }); this.sfx(h.def.blade ? 'swipe' : h.def.claws ? 'swipe' : 'hammer', h.x, h.y); }
  }
  basicHit(h, tg) {
    const P = h.passive, o = { dmg: h.st.ad, crit: !!h.st.crit && Math.random() < h.st.crit, bonus: 0, bonusType: 'magic' };
    if (P && P.preBasic) P.preBasic(this, h, tg, o);
    let dmg = o.dmg * (o.crit ? h.st.critMult : 1), emp = null;
    if (h.empower && h.empower.until >= this.time) { emp = h.empower; dmg += emp.bonus; h.empower = null; this.fx('impact', { x: tg.x, y: tg.y, size: 24 }); }
    this.damage(h, tg, dmg, 'phys', { basic: true, crit: o.crit });
    if (o.bonus && !tg.dead) this.damage(h, tg, o.bonus, o.bonusType, { proc: true });
    if (emp && emp.onHit && !tg.dead) emp.onHit(tg);
    if (h.hasBuff('red') && !tg.dead) { this.dot(tg, 'burn', 8 + 2 * h.level, 3, h); this.slow(tg, 0.1, 1.5); }
    if (P && P.onBasic && !tg.dead) P.onBasic(this, h, tg);
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
    x = Utils.clamp(x, 0, CONFIG.W); y = Utils.clamp(y, 0, CONFIG.H);
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
  costOf(h, slot) { const r = h.ranks[slot]; return h.pas.free > this.time ? 0 : ABILITIES[h.def.abilities[slot]].cost[r - 1]; }
  canCast(h, slot) { const r = h.ranks[slot]; if (!r || h.cds[slot] > 0 || h.silenced(this.time) || h.feared(this.time)) return false; return h.mana >= this.costOf(h, slot); }
  castFail(h, msg) { if (msg && this.watched(h)) { this.notify(h, msg, 'warn'); this.sfxFor(h, 'error'); } return false; }
  findAbilityTarget(h, ab, x, y) {
    if (ab.aim === 'ally') { let best = null, bd = 170; for (const a of this.heroes) { if (a.dead || a.team !== h.team) continue; const d = Utils.dist(a.x, a.y, x, y); if (d < bd && Utils.dist(h.x, h.y, a.x, a.y) <= ab.range + 40) { bd = d; best = a; } } return best || h; }
    let best = null, bd = Infinity;
    for (const u of this.enemyUnits(h.team)) { if (ab.heroOnly && u.kind !== 'hero') continue; if (!u.vis[h.team]) continue; const d = Utils.dist(u.x, u.y, x, y) - u.radius; if (d < 110 && d < bd) { bd = d; best = u; } }
    return best;
  }
  castAbility(h, slot, x, y, forced) {
    const t = this.time;
    if (h.dead || h.stunned(t) || h.dash || h.disp || (h.channel && !h.channel.cancelOnMove) || h.taunted(t) || h.feared(t)) return false;
    const r = h.ranks[slot];
    if (!r) return this.castFail(h, 'Compétence pas encore apprise : Ctrl + touche pour l’améliorer');
    if (h.silenced(t)) return this.castFail(h, 'Réduit au silence');
    if (h.cds[slot] > 0) return this.castFail(h, 'Compétence pas encore prête');
    const ab = ABILITIES[h.def.abilities[slot]], cost = this.costOf(h, slot);
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
    h.mana -= cost; h.cds[slot] = ab.cd[r - 1] * (1 - h.st.cdr); if (!cost && h.pas.free) h.pas.free = 0;
    if (Utils.dist(h.x, h.y, x, y) > 1) h.angle = Utils.angleTo(h.x, h.y, x, y);
    h.castAnim = t;
    if (ab.cast(this, h, r, x, y, target) === false) { h.cds[slot] = 0; h.mana += cost; return false; }
    const P = h.passive; if (P && P.onCast) P.onCast(this, h, slot);
    if (slot === 3) this.bark(h, 'ult', true);
    return true;
  }
  useSpell(h, i, x, y) {
    if (h.dead || h.stunned(this.time) || h.dash || h.disp) return false;
    if (h.spellCds[i] > 0) return this.castFail(h, 'Sort pas encore prêt');
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    const sp = SPELLS[h.spells[i]];
    if (sp.cast(this, h, x, y) !== false) h.spellCds[i] = sp.cd;
    return true;
  }
  levelUp(h, slot) { if (!h.canLevel(slot)) return false; h.ranks[slot]++; h.points--; this.sfxFor(h, 'skillUp'); return true; }
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
      this.sfxFor(h, 'buy'); return true;
    }
    const { price, used } = this.priceFor(h, id);
    if (h.gold < price) return this.castFail(h, 'Pas assez d’or');
    if (h.items.length - used.size + 1 > 6) return this.castFail(h, 'Inventaire plein : revendez un objet');
    h.items = h.items.filter((s, i) => !used.has(i));
    h.items.push({ id }); h.gold -= price; h.recompute();
    this.sfxFor(h, 'buy');
    return true;
  }
  sell(h, idx) {
    if (!this.canShop(h) || idx >= h.items.length) return false;
    const s = h.items.splice(idx, 1)[0], it = ITEMS[s.id];
    h.gold += Math.round(it.consumable ? it.recipe * 0.5 * s.n : it.cost * 0.7); h.recompute();
    this.sfxFor(h, 'buy');
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
  slow(u, pct, d) { if (u.def && u.def.epic) pct *= 0.5; u.status.slows.push({ pct, until: this.time + d }); }
  silence(u, d, quiet) { if (u.kind !== 'hero') return; const was = u.status.silence > this.time; u.status.silence = Math.max(u.status.silence, this.time + d); if (u.channel) this.endChannel(u, true); if (u.recall) u.recall = null; if (!quiet || !was) this.fx('silence', { target: u, dur: quiet ? 0.6 : d }); }
  fear(u, src, d) {
    if (u.kind !== 'hero' && u.kind !== 'minion') return; // les monstres de la jungle ne fuient pas : ils gardent leur camp
    u.status.fear = { src, x: src.x, y: src.y, until: this.time + d };
    if (u.kind === 'hero') { if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); }
    this.fx('fear', { target: u, dur: d });
  }
  flee(u, dt) {
    const f = u.feared(this.time); if (!f) return false;
    const sx = f.src && !f.src.dead ? f.src.x : f.x, sy = f.src && !f.src.dead ? f.src.y : f.y, a = Utils.angleTo(sx, sy, u.x, u.y);
    this.moveToward(u, u.x + Math.cos(a) * 200, u.y + Math.sin(a) * 200, dt, 0, 0.85); return true;
  }
  // Déplacement forcé (attraction, projection) : la cible ne peut rien faire pendant le trajet
  displace(u, x, y, dur, onEnd) {
    if (!u || u.dead || u.kind === 'tower' || u.kind === 'inhib' || u.kind === 'nexus' || (u.def && u.def.epic)) { if (onEnd) onEnd(); return; }
    const p = MAP.freePoint(Utils.clamp(x, 40, CONFIG.W - 40), Utils.clamp(y, 40, CONFIG.H - 40));
    u.disp = { x0: u.x, y0: u.y, x1: p.x, y1: p.y, t: 0, dur: Math.max(0.05, dur), onEnd };
    u.status.stun = Math.max(u.status.stun, this.time + dur);
    if (u.kind === 'hero') { u.dash = null; if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); u.order = null; }
  }
  updateDisp(u, dt) {
    const d = u.disp; d.t += dt; const k = Math.min(1, d.t / d.dur);
    u.x = d.x0 + (d.x1 - d.x0) * k; u.y = d.y0 + (d.y1 - d.y0) * k; u.moving = true;
    if (k >= 1) { u.disp = null; MAP.resolve(u); u.px = u.x; u.py = u.y; if (d.onEnd) d.onEnd(); }
  }
  pull(u, x, y, speed = 1300, onEnd) { this.displace(u, x, y, Utils.dist(u.x, u.y, x, y) / speed, onEnd); }
  knockback(u, fx, fy, dist, dur = 0.3, onEnd) { const a = Utils.angleTo(fx, fy, u.x, u.y); this.displace(u, u.x + Math.cos(a) * dist, u.y + Math.sin(a) * dist, dur, onEnd); }
  knockup(u, d) {
    if (u.kind !== 'hero' && u.kind !== 'minion' && u.kind !== 'monster') return;
    if (u.def && u.def.epic) { this.stun(u, d); return; }
    this.stun(u, d); u.air = { t0: this.time, dur: d };
  }
  updateAir() {
    const t = this.time;
    const f = u => { if (!u.air) return; const k = (t - u.air.t0) / u.air.dur; if (k >= 1 || u.dead) { u.air = null; u.z = 0; } else u.z = Math.sin(k * Math.PI) * 45; };
    for (const h of this.heroes) f(h); for (const m of this.minions) f(m); for (const m of this.monsters) f(m);
  }
  // Dégâts subis augmentés (marque, flaque…) : src = null pour toutes les sources
  amp(u, pct, d, src = null, key = 'amp') { const s = u.status; s.amps = s.amps.filter(a => a.until > this.time && a.key !== key); s.amps.push({ pct, until: this.time + d, src, key }); }
  hot(u, total, d, src) { u.status.regen.push({ rate: total / d, until: this.time + d, src }); }
  after(sec, fn) { this.timers.push({ at: this.time + sec, fn }); }
  // Charges électriques de Néon : à trois, la cible grille
  addCharge(u, src) {
    const s = u.status, t = this.time;
    if (u.dead || s.chargeImmune > t || (u.kind !== 'hero' && u.kind !== 'minion' && u.kind !== 'monster')) return;
    if (!s.charges || s.charges.until < t || s.charges.src !== src) s.charges = { n: 0, src, until: 0 };
    s.charges.n++; s.charges.until = t + 6;
    this.fx('static', { target: u, dur: 0.6, n: s.charges.n });
    if (s.charges.n >= 3) {
      s.charges = null; s.chargeImmune = t + 6;
      this.stun(u, 1); this.fx('lightning', { x1: u.x, y1: u.y - 300, x2: u.x, y2: u.y, dur: 0.35, color: '#9fe8ff' }); this.sfx('zap', u.x, u.y);
      this.damage(src, u, 30 + 12 * src.level + 0.3 * src.st.ap, 'magic', { proc: true });
    }
  }
  bark(h, kind, force) {
    const v = h.def.voice && h.def.voice[kind]; if (!v || !v.length) return;
    if (!force && h.bubble && h.bubble.until > this.time) return;
    const text = Utils.pick(v); h.bubble = { text, until: this.time + 2.6 };
    if (this.net) this.net.event(['b', h.id, text]);
  }
  haste(u, pct, d) { u.status.hastes.push({ pct, until: this.time + d }); }
  shield(u, amt, d, src) { amt *= this.healMod(src, u); u.status.shields.push({ amt, until: this.time + d }); this.fx('shield', { target: u, dur: d }); }
  healMod(src, u) { const P = src && src.kind === 'hero' ? src.passive : null; return P && P.healMod ? P.healMod(this, src, u) : 1; }
  taunt(u, src, d) {
    if (u.kind === 'hero') { u.status.taunt = { src, until: this.time + d }; if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); }
    else if (u.kind === 'minion') { u.aggro = src; u.aggroUntil = this.time + d; u.target = src; }
    else if (u.kind === 'monster') { u.status.taunt = { src, until: this.time + d }; this.aggroCamp(u, src); }
    this.fx('taunt', { target: u, dur: d });
  }
  dot(u, kind, dps, dur, src) { const cur = u.status[kind]; if (cur && cur.until > this.time && cur.dps > dps) { cur.until = this.time + dur; return; } u.status[kind] = { dps, until: this.time + dur, src, tick: 0.5 }; }
  updateDots(dt) {
    const t = this.time;
    for (const h of this.heroes) { const r = h.status.regen; if (!r.length || h.dead) continue; h.status.regen = r.filter(x => x.until > t); for (const x of h.status.regen) h.hp = Math.min(h.maxHp, h.hp + x.rate * dt); }
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
    const a = amt * (1 + (src && src.st && src.st.healPower || 0)) * this.healMod(src, u), before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + a);
    const got = u.hp - before;
    if (got >= 1) { if (this.watched(u)) this.float('+' + Math.round(got), u.x, u.y, '#8cff7a', false, u); if (this.watched(src) && src !== u) this.float('+' + Math.round(got), u.x, u.y, '#8cff7a', false, src); }
    return got;
  }

  // ---------- Dégâts ----------
  damage(src, tg, amount, type = 'phys', opt = {}) {
    if (!tg || tg.dead) return 0;
    if (src && src.team === tg.team) return 0;
    if ((tg.kind === 'tower' || tg.kind === 'inhib' || tg.kind === 'nexus') && !this.isTargetable(tg, 1 - tg.team)) return 0;
    if (tg.status.invuln > this.time) return 0;
    let dmg = amount;
    if (src && src.kind === 'hero' && src.team < 2) dmg *= 1 + 0.06 * this.dragons[src.team];
    if (src && src.kind === 'minion' && (tg.kind !== 'minion') && this.heroes.some(h => !h.dead && h.team === src.team && h.hasBuff('titan') && Utils.dist(h.x, h.y, src.x, src.y) < 800)) dmg *= 1.5;
    if (type === 'phys') dmg *= 100 / (100 + Math.max(0, tg.st.armor || 0));
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, tg.st.resist || 0));
    if (tg.kind === 'tower' || tg.kind === 'inhib' || tg.kind === 'nexus') {
      if (src && src.kind === 'minion') dmg *= src.def.siege ? 1.5 : 1;
      if (!this.alliedMinionsNear(1 - tg.team, tg.x, tg.y, 600)) dmg *= 0.4;
    }
    const t = this.time;
    if (tg.status.amps.length) for (const a of tg.status.amps) if (a.until > t && (!a.src || a.src === src)) dmg *= 1 + a.pct;
    if (tg.status.parry && tg.status.parry.until > t && src) { tg.status.parry.blocked += dmg; if (src.kind === 'hero') tg.status.parry.hitters.add(src); this.fx('impact', { x: tg.x, y: tg.y, size: 18 }); this.sfx('clank', tg.x, tg.y); return 0; }
    if (tg.kind === 'hero' && tg.passive && tg.passive.modTaken) { dmg = tg.passive.modTaken(this, tg, src, dmg, opt); if (dmg <= 0) return 0; }
    if (tg.status.dr && tg.status.dr.until > this.time) dmg *= 1 - tg.status.dr.pct;
    if (tg.status.shields.length) for (const s of tg.status.shields) { if (s.until <= t || dmg <= 0) continue; const a = Math.min(s.amt, dmg); s.amt -= a; dmg -= a; }
    if (tg.status.undying > t && tg.hp - dmg < 1) dmg = Math.max(0, tg.hp - 1);
    tg.hp -= dmg; tg.lastHit = t;
    if (tg.kind === 'hero') { if (tg.recall) { tg.recall = null; this.notify(tg, 'Retour interrompu', 'warn'); } if (src && src.kind === 'hero') tg.damagedBy.set(src.id, t); if (opt.basic && tg.st.thorns && src && !src.dead) this.damage(tg, src, dmg * tg.st.thorns, 'magic'); }
    if (tg.kind === 'monster' && src) this.aggroCamp(tg, src.kind === 'turretZone' ? null : src);
    if (src && src.kind === 'hero') {
      src.lastCombat = t;
      if (tg.kind === 'hero') src.dmgDealt += dmg;
      if (opt.basic && src.st.lifesteal) src.hp = Math.min(src.maxHp, src.hp + dmg * src.st.lifesteal);
      if (tg.kind === 'hero') this.callForHelp(src, tg);
    }
    if (dmg >= 1 && !opt.silent) {
      const txt = Math.round(dmg) + (opt.crit ? '!' : '');
      if (this.watched(tg)) this.float(txt, tg.x, tg.y, '#ff6a5a', opt.crit || dmg > 150, tg);
      if (this.watched(src)) this.float(txt, tg.x, tg.y, opt.crit ? '#ff9a3a' : type === 'magic' ? '#9fd8ff' : type === 'true' ? '#ffffff' : '#ffd27a', opt.crit || dmg > 150, src);
    }
    if (src && src.kind === 'hero' && src.passive && src.passive.onDealt && tg.team !== src.team) src.passive.onDealt(this, src, tg, dmg, opt);
    if (tg.kind === 'hero' && tg.passive && tg.passive.onTaken && !tg.dead) tg.passive.onTaken(this, tg, src, dmg, opt);
    if (tg.hp <= 0 && !tg.dead) { tg.hp = 0; this.kill(tg, src); }
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
    if (killerHero && killerHero.passive && killerHero.passive.onKill) killerHero.passive.onKill(this, killerHero, u);
    const burn = u.status && u.status.burn;
    if (burn && burn.until > t && burn.src && burn.src.kind === 'hero' && burn.src.passive && burn.src.passive.onBurnDeath) burn.src.passive.onBurnDeath(this, burn.src, u);
    if (u.kind === 'minion' || u.kind === 'monster' || u.kind === 'hero') for (const h of this.heroes) if (!h.dead && h.passive && h.passive.onDeathNear && Utils.dist(h.x, h.y, u.x, u.y) < 600) h.passive.onDeathNear(this, h, u);
    if (u.kind === 'minion') {
      if (killerHero) { const gold = u.def.gold + Math.floor(t / 90); killerHero.gold += gold; killerHero.cs++; if (this.watched(killerHero)) { this.float('+' + gold, u.x, u.y, '#ffd34d', true, killerHero); this.sfxFor(killerHero, 'gold'); } }
      this.shareXp(1 - u.team, u.x, u.y, u.def.xp);
      this.fx('death', { x: u.x, y: u.y, size: u.radius * 1.6, dur: 0.7, team: u.team });
      if (u.def.siege || u.def.super) this.fx('explosion', { x: u.x, y: u.y, size: 50, dur: 0.8 });
    } else if (u.kind === 'monster') {
      const k = killerHero || (src && src.kind === 'minion' ? null : null);
      if (k) {
        k.gold += u.def.gold; k.cs += u.def.epic ? 4 : 2; this.addXp(k, u.def.xp);
        if (this.watched(k)) { this.float('+' + u.def.gold, u.x, u.y, '#ffd34d', true, k); this.sfxFor(k, 'gold'); }
        if (u.def.buff) { this.addBuff(k, { id: u.def.buff, dur: BUFFS[u.def.buff].dur, stats: u.def.buff === 'blue' ? { cdr: 0.2, manaRegen: 6 } : {} }); if (this.watched(k)) this.say('buff', { id: u.def.buff }, k); }
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
      this.say('tower', { team: u.team, lane: u.lane || '' });
    } else if (u.kind === 'inhib') {
      u.respawnAt = t + CONFIG.INHIB_RESPAWN;
      for (const h of this.heroes) if (h.team !== u.team) h.gold += 50;
      this.fx('explosion', { x: u.x, y: u.y, size: 100, dur: 1.4 }); this.sfx('towerFall', u.x, u.y);
      this.say('inhib', { team: u.team });
    } else if (u.kind === 'nexus') {
      this.state = 'over'; this.winner = 1 - u.team; this.endAt = t + 3.5;
      this.fx('explosion', { x: u.x, y: u.y, size: 260, dur: 3 }); this.sfx('coreFall', u.x, u.y);
      this.camera.locked = false; this.camera.focus = { x: u.x, y: u.y };
      this.say('end', { winner: this.winner });
    }
  }
  shareXp(team, x, y, amount) { const rec = this.heroes.filter(h => !h.dead && h.team === team && Utils.dist(h.x, h.y, x, y) <= CONFIG.XP_RANGE); if (!rec.length) return; const each = rec.length === 1 ? amount : amount * 1.25 / rec.length; for (const h of rec) this.addXp(h, each); }
  addXp(h, amt) {
    if (h.level >= CONFIG.MAX_LEVEL) return;
    h.xp += amt;
    while (h.level < CONFIG.MAX_LEVEL && h.xp >= xpToNext(h.level)) {
      h.xp -= xpToNext(h.level); h.level++; h.points++; h.recompute();
      this.fx('levelup', { target: h, dur: 1.2 });
      if (this.watched(h)) { this.sfxFor(h, 'levelup'); if (h.level === 6) this.notify(h, 'Niveau 6 : votre ultime est disponible', 'good'); }
    }
    if (h.level >= CONFIG.MAX_LEVEL) h.xp = 0;
  }
  heroDeath(v, src) {
    const t = this.time;
    v.d++; v.respawnAt = t + respawnTime(v.level, t);
    v.order = null; v.dash = null; v.channel = null; v.recall = null; v.empower = null; v.z = 0;
    v.status = freshStatus(); v.disp = null; v.air = null;
    v.buffs = []; v.potions = []; v.scale = 1; v.recompute();
    this.bark(v, 'death', true);
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
    this.feedKill(killer, v, assisters);
    if (killer) this.bark(killer, 'kill', true);
    const fb = !!killer && !this.firstBlood; if (fb) this.firstBlood = true;
    this.say('kill', { k: killer ? killer.id : 0, v: v.id, fb, multi: killer ? killer.multi.n : 0 });
  }
  respawn(h) {
    const f = MAP.fountains[h.team];
    h.dead = false; h.x = h.px = f.x + Utils.rand(-40, 40); h.y = h.py = f.y + Utils.rand(-40, 40);
    h.hp = h.maxHp; h.mana = h.maxMana; h.order = null; h.attackCd = 0;
    this.fx('teleport', { x: h.x, y: h.y, dur: 0.9, team: h.team });
    this.sfxFor(h, 'respawn'); this.bark(h, 'respawn');
  }

  // ---------- Sbires ----------
  updateMinion(m, dt) {
    const t = this.time;
    m.attackCd -= dt; m.moving = false;
    if (m.disp) { this.updateDisp(m, dt); return; }
    if (m.stunned(t)) return;
    if (this.flee(m, dt)) return;
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
    for (const h of this.heroes) if (!h.dead && !h.dash && !h.disp) us.push(h);
    for (const m of this.minions) if (!m.dead && !m.disp) us.push(m);
    for (const m of this.monsters) if (!m.dead && !m.disp) us.push(m);
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

// ---------- Annonces, rédigées du point de vue de chaque joueur ----------
function heroLabel(h) { return h ? (h.nick ? `${h.nick} (${h.name})` : h.name) : ''; }
function narrate(g, key, d, me) {
  const my = me ? me.team : 0, ours = t => t === my, tone = t => ours(t) ? 'good' : 'bad', foe = TEAM_INFO[1 - my].name;
  const H = id => g.heroes.find(h => h.id === id);
  switch (key) {
    case 'waves': return ['Les pillards arrivent', 'Les premières vagues partent sur les trois voies', 'info'];
    case 'epic': return d.id === 'worm' ? ['Ver des sables', 'Le Ver des sables émerge dans la rivière', 'info'] : ['Titan de rouille', 'Le Titan de rouille s’est réveillé', 'info'];
    case 'inhibBack': return ['Inhibiteur reconstruit', ours(d.team) ? 'Notre ' + LANE_NAMES[d.lane].toLowerCase() + ' est de nouveau protégée' : `Les ${foe} ont réparé leur inhibiteur`, 'info'];
    case 'worm': return ['Ver des sables vaincu', `${TEAM_INFO[d.team].name} : +${d.n * 6} % de dégâts pour toute l’équipe`, tone(d.team)];
    case 'titan': return ['Titan de rouille abattu', `${TEAM_INFO[d.team].name} reçoivent la Faveur du Titan`, tone(d.team)];
    case 'buff': return BUFFS[d.id] ? [BUFFS[d.id].name, BUFFS[d.id].desc, 'good'] : null;
    case 'tower': return [ours(d.team) ? 'Tourelle perdue' : 'Tourelle détruite', d.lane ? LANE_NAMES[d.lane] : 'Défense du réacteur', ours(d.team) ? 'bad' : 'good'];
    case 'inhib': return [ours(d.team) ? 'Inhibiteur détruit' : 'Inhibiteur ennemi détruit', ours(d.team) ? 'Des mastodontes ennemis vont déferler' : 'Nos mastodontes vont déferler', ours(d.team) ? 'bad' : 'good'];
    case 'end': return [ours(d.winner) ? 'Victoire' : 'Défaite', ours(d.winner) ? `Le réacteur des ${foe} a sauté` : 'Notre réacteur a sauté', tone(d.winner)];
    case 'kill': {
      const k = H(d.k), v = H(d.v); if (!v) return null;
      if (k && d.fb) return ['Premier sang', `${heroLabel(k)} élimine ${heroLabel(v)}`, tone(k.team)];
      if (k && d.multi >= 2) return [['', '', 'Double élimination', 'Triple élimination', 'Quadruple élimination', 'Pentakill'][Math.min(5, d.multi)], heroLabel(k), tone(k.team)];
      if (v === me) return ['Vous êtes à terre', k ? `Éliminé par ${heroLabel(k)}` : 'Exécuté', 'bad'];
      if (k && k === me) return ['Ennemi éliminé', heroLabel(v), 'good'];
      if (ours(v.team)) return ['Un allié est tombé', heroLabel(v), 'bad'];
      return ['Ennemi éliminé', heroLabel(v), 'good'];
    }
  }
  return null;
}
