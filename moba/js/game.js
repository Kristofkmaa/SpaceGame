// ============ Simulation de la partie ============
class Game {
  constructor(opts, audio) {
    MAP.init();
    this.opts = opts; this.audio = audio; this.ui = null;
    this.diff = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    this.time = 0; this.paused = false; this.state = 'playing'; this.endAt = 0; this.winner = null;
    this.heroes = []; this.minions = []; this.towers = []; this.cores = [];
    this.projectiles = []; this.zones = []; this.effects = []; this.floats = []; this.rubble = [];
    this.kills = [0, 0]; this.towersDown = [0, 0]; this.firstBlood = false;
    this.waveN = 0; this.nextWave = CONFIG.WAVE_FIRST; this.spawnQueue = [];
    this.setupStructures();
    this.setupHeroes(opts);
    this.player = this.heroes.find(h => h.isPlayer);
    this.camera = { x: this.player.x + 300, y: this.player.y - 100, zoom: CONFIG.ZOOM_DEFAULT, locked: opts.cameraLocked !== false };
  }

  // ---------- Mise en place ----------
  setupStructures() {
    const L = MAP.lane.L;
    for (const team of [0, 1]) {
      for (const [p, tier] of [[0.37 * L, 0], [0.2 * L, 1]]) { const pt = MAP.pointAt(team, p); this.towers.push(new Tower(team, tier, pt.x, pt.y)); }
      const c = MAP.pointAt(team, 330); this.cores.push(new Core(team, c.x, c.y));
    }
  }
  setupHeroes(o) {
    const make = (id, team, player) => { const h = new Hero(id, team, this, { player }); if (!player || o.autoPlayer) h.bot = new HeroBot(this, h); this.heroes.push(h); };
    make(o.heroId, 0, true);
    for (const id of o.allies) make(id, 0, false);
    for (const id of o.enemies) make(id, 1, false);
    for (const team of [0, 1]) this.heroes.filter(h => h.team === team).forEach((h, i) => {
      const f = MAP.fountains[team], a = i * 2.1; h.x = h.px = f.x + Math.cos(a) * 50; h.y = h.py = f.y + Math.sin(a) * 50;
    });
  }

  // ---------- Accès ----------
  log(text, cls) { if (this.ui) this.ui.toast(text, cls); }
  sfx(name, x, y) { if (this.audio) this.audio.play(name, x, y); }
  fx(type, props) { if (this.effects.length < 600) this.effects.push(new Effect(type, props)); }
  float(text, x, y, color, big) { if (this.floats.length < 80) this.floats.push({ text: String(text), x: x + Utils.rand(-8, 8), y, color, big, t: 0, dur: 0.9 }); }
  announce(title, sub, cls) { if (this.ui) this.ui.announce(title, sub, cls); }
  inBase(h) { const b = MAP.bases[h.team]; return Utils.dist(h.x, h.y, b.x, b.y) <= CONFIG.BASE_R + 10; }
  canShop(h) { return h.dead || this.inBase(h); }
  enemyUnits(team) { const out = []; for (const h of this.heroes) if (!h.dead && h.team !== team) out.push(h); for (const m of this.minions) if (!m.dead && m.team !== team) out.push(m); return out; }
  enemyHeroesNear(x, y, r, team) { return this.heroes.filter(h => !h.dead && h.team !== team && Utils.dist(x, y, h.x, h.y) <= r); }
  allyHeroesNear(x, y, r, team) { return this.heroes.filter(h => !h.dead && h.team === team && Utils.dist(x, y, h.x, h.y) <= r); }
  enemyMinionsNear(x, y, r, team) { return this.minions.filter(m => !m.dead && m.team !== team && Utils.dist(x, y, m.x, m.y) <= r); }
  alliedMinionsNear(team, x, y, r) { let n = 0; for (const m of this.minions) if (!m.dead && m.team === team && Utils.dist(x, y, m.x, m.y) <= r) n++; return n; }
  towerDead(team, tier) { return !this.towers.some(t => t.team === team && t.tier === tier && !t.dead); }
  isTargetable(u, byTeam) {
    if (!u || u.dead || u.team === byTeam) return false;
    if (u.kind === 'tower' && u.tier === 1) return this.towerDead(u.team, 0);
    if (u.kind === 'core') return this.towerDead(u.team, 0) && this.towerDead(u.team, 1);
    return true;
  }
  structures() { return [...this.towers, ...this.cores]; }
  // Première structure ennemie encore debout en remontant la voie
  enemyFrontStructure(team) {
    const e = 1 - team;
    for (const tier of [0, 1]) { const t = this.towers.find(x => x.team === e && x.tier === tier && !x.dead); if (t) return t; }
    return this.cores.find(c => c.team === e && !c.dead) || null;
  }
  outerStructureProgress(team) {
    for (const tier of [0, 1]) { const t = this.towers.find(x => x.team === team && x.tier === tier && !x.dead); if (t) return MAP.progress(team, t.x, t.y); }
    return 330;
  }
  frontProgress(team) { let best = null; for (const m of this.minions) if (!m.dead && m.team === team) { const p = MAP.progress(team, m.x, m.y); if (best === null || p > best) best = p; } return best; }
  underEnemyTower(team, x, y) { return this.towers.some(t => !t.dead && t.team !== team && Utils.dist(t.x, t.y, x, y) <= TOWER.range + 20); }
  structureSafeToHit(s, team) { return s.kind === 'core' || this.alliedMinionsNear(team, s.x, s.y, TOWER.range) >= 2; }

  // ---------- Boucle ----------
  update(dt) {
    if (this.paused) return;
    this.time += dt;
    if (this.state === 'playing') {
      if (this.time >= this.nextWave) { this.queueWave(); this.nextWave += CONFIG.WAVE_PERIOD; }
      this.processSpawns();
      for (const h of this.heroes) this.updateHero(h, dt);
      for (const m of this.minions) if (!m.dead) this.updateMinion(m, dt);
      for (const tw of this.towers) if (!tw.dead) this.updateTower(tw, dt);
      for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt);
      for (const z of this.zones) if (!z.dead) this.updateZone(z, dt);
      this.separate();
      for (const u of this.heroes) { u.vx = (u.x - u.px) / dt; u.vy = (u.y - u.py) / dt; u.px = u.x; u.py = u.y; }
    }
    for (const e of this.effects) { e.t += dt; if (e.t >= e.dur) e.dead = true; }
    for (const f of this.floats) f.t += dt;
    this.minions = this.minions.filter(m => !m.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.zones = this.zones.filter(z => !z.dead);
    this.effects = this.effects.filter(e => !e.dead);
    this.floats = this.floats.filter(f => f.t < f.dur);
  }

  // ---------- Vagues de sbires ----------
  queueWave() {
    this.waveN++;
    const types = ['melee', 'melee', 'melee'];
    if (this.waveN % CONFIG.SIEGE_EVERY === 0 || this.time > 12 * 60) types.push('siege');
    if (this.time > 15 * 60 && !this.lateGame) { this.lateGame = true; this.announce('Rage du désert', 'Les sbires frappent plus fort les structures', 'info'); }
    types.push('ranged', 'ranged', 'ranged');
    for (const team of [0, 1]) types.forEach((type, i) => this.spawnQueue.push({ team, type, at: this.time + i * 0.75 }));
    if (this.waveN === 1) { this.announce('Les pillards arrivent', 'Première vague de sbires', 'info'); this.sfx('horn'); }
  }
  processSpawns() {
    const due = this.spawnQueue.filter(s => s.at <= this.time);
    if (!due.length) return;
    this.spawnQueue = this.spawnQueue.filter(s => s.at > this.time);
    for (const s of due) {
      const c = this.cores.find(x => x.team === s.team);
      if (!c || c.dead) continue;
      const pt = MAP.pointAt(s.team, 420, Utils.rand(-30, 30));
      const m = new Minion(s.type, s.team, pt.x, pt.y, this);
      m.angle = pt.angle; this.minions.push(m);
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
    // Citernes : soin chez soi, tir de barrage chez l'ennemi
    const f = MAP.fountains[h.team];
    if (Utils.dist(h.x, h.y, f.x, f.y) < CONFIG.FOUNTAIN_R) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.12 * dt); h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.12 * dt); }
    const ef = MAP.fountains[1 - h.team];
    if (Utils.dist(h.x, h.y, ef.x, ef.y) < CONFIG.FOUNTAIN_R + 40) { h.zapped = t; this.damage(null, h, 700 * dt, 'true'); if (h.dead) return; }
    if (h.bot) h.bot.update(dt);
    if (h.recall) {
      if (t >= h.recall.end) { h.recall = null; const ff = MAP.fountains[h.team]; this.fx('respawn', { x: h.x, y: h.y, dur: 0.6 }); h.x = h.px = ff.x + Utils.rand(-30, 30); h.y = h.py = ff.y + Utils.rand(-30, 30); h.order = null; this.fx('respawn', { x: h.x, y: h.y, dur: 0.8 }); this.sfx('recallEnd', h.x, h.y); }
      return;
    }
    if (h.dash) { this.updateDash(h, dt); return; }
    if (h.channel) {
      if (h.stunned(t)) this.endChannel(h, true);
      else { this.updateChannel(h, dt); return; }
    }
    if (h.stunned(t)) return;
    this.executeOrder(h, dt);
  }

  executeOrder(h, dt) {
    let o = h.order;
    if (o && o.target && !this.isTargetable(o.target, o.type === 'cast' && ABILITIES[h.def.abilities[o.slot]].aim === 'ally' ? -1 : h.team)) o = h.order = null;
    if (!o) {
      // Au repos : riposte automatique sur un ennemi à portée
      const e = this.nearestAttackable(h, h.st.range + h.radius + 6);
      if (e) this.tryAttack(h, e);
      return;
    }
    if (o.type === 'move') { if (this.moveToward(h, o.x, o.y, dt, 4)) h.order = null; }
    else if (o.type === 'attack') {
      const tg = o.target;
      if (this.inAttackRange(h, tg)) this.tryAttack(h, tg);
      else this.moveToward(h, tg.x, tg.y, dt, h.st.range + h.radius + tg.radius - 6);
    } else if (o.type === 'cast') {
      const ab = ABILITIES[h.def.abilities[o.slot]], tg = o.target;
      if (Utils.dist(h.x, h.y, tg.x, tg.y) <= ab.range + tg.radius + 5) { h.order = null; this.castAbility(h, o.slot, tg.x, tg.y, tg); }
      else this.moveToward(h, tg.x, tg.y, dt, ab.range);
    }
  }
  nearestAttackable(h, range) {
    let best = null, bd = Infinity;
    const check = u => { if (!this.isTargetable(u, h.team)) return; const d = Utils.dist(h.x, h.y, u.x, u.y) - u.radius; if (d <= range && d < bd) { bd = d; best = u; } };
    for (const u of this.heroes) check(u);
    for (const m of this.minions) check(m);
    for (const s of this.towers) check(s);
    for (const c of this.cores) check(c);
    return best;
  }
  inAttackRange(h, tg) { return Utils.dist(h.x, h.y, tg.x, tg.y) <= h.st.range + h.radius + tg.radius; }
  tryAttack(h, tg) {
    h.angle = Utils.lerpAngle(h.angle, Utils.angleTo(h.x, h.y, tg.x, tg.y), 0.5);
    if (h.attackCd > 0) return;
    h.attackCd = 1 / h.st.as; h.attackAnim = this.time;
    if (h.def.ranged) {
      this.homing(h, tg, { speed: 950, visual: h.def.projectile, onHit: u => this.basicHit(h, u) });
      this.sfx(h.def.projectile === 'bullet' ? 'rifle' : h.def.projectile === 'spark' ? 'sparkShot' : 'dart', h.x, h.y);
    } else { this.basicHit(h, tg); this.fx('slash', { x: tg.x, y: tg.y, angle: h.angle, dur: 0.2 }); this.sfx('hammer', h.x, h.y); }
  }
  basicHit(h, tg) {
    let dmg = h.st.ad;
    if (h.empower && h.empower.until >= this.time) { dmg += h.empower.bonus; h.empower = null; this.fx('impact', { x: tg.x, y: tg.y, size: 20 }); }
    this.damage(h, tg, dmg, 'phys', { basic: true });
  }
  moveToward(u, tx, ty, dt, stop) {
    const t = this.time;
    if (u.rooted(t)) return false;
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
    if (d <= stop) return true;
    const speed = (u.kind === 'hero' ? u.st.ms : u.ms) * u.msMult(t);
    const step = Math.min(d - stop, speed * dt);
    const c = MAP.clamp(u.x + dx / d * step, u.y + dy / d * step, u.radius);
    u.x = c.x; u.y = c.y;
    u.angle = Utils.lerpAngle(u.angle, Math.atan2(dy, dx), Math.min(1, dt * 12));
    u.moving = true; u.walk += dt * speed * 0.06;
    return false;
  }

  // ---------- Ordres (joueur et bots) ----------
  issueMove(h, x, y) {
    if (h.dead) return;
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    const c = MAP.clamp(x, y, h.radius);
    h.order = { type: 'move', x: c.x, y: c.y };
  }
  issueAttack(h, tg) {
    if (h.dead || !this.isTargetable(tg, h.team)) return;
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    h.order = { type: 'attack', target: tg };
  }
  issueStop(h) { h.order = null; if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true); }
  startRecall(h) {
    if (h.dead || h.recall || h.dash || h.channel) return;
    h.order = null; h.recall = { start: this.time, end: this.time + CONFIG.RECALL_TIME };
    this.sfx('recall', h.x, h.y);
  }
  canCast(h, slot) {
    const r = h.ranks[slot]; if (!r || h.cds[slot] > 0) return false;
    return h.mana >= ABILITIES[h.def.abilities[slot]].cost[r - 1];
  }
  castFail(h, msg) { if (h.isPlayer && msg) { this.log(msg, 'warn'); this.sfx('error'); } return false; }
  findAbilityTarget(h, ab, x, y) {
    if (ab.aim === 'ally') {
      let best = null, bd = 170;
      for (const a of this.heroes) { if (a.dead || a.team !== h.team) continue; const d = Utils.dist(a.x, a.y, x, y); if (d < bd && Utils.dist(h.x, h.y, a.x, a.y) <= ab.range + 40) { bd = d; best = a; } }
      return best || h;
    }
    let best = null, bd = Infinity;
    for (const u of this.enemyUnits(h.team)) { const d = Utils.dist(u.x, u.y, x, y) - u.radius; if (d < 110 && d < bd) { bd = d; best = u; } }
    return best;
  }
  castAbility(h, slot, x, y, forced) {
    const t = this.time;
    if (h.dead || h.stunned(t) || h.dash || (h.channel && !h.channel.cancelOnMove)) return false;
    const r = h.ranks[slot];
    if (!r) return this.castFail(h, 'Compétence pas encore apprise : Ctrl + touche pour l’améliorer');
    if (h.cds[slot] > 0) return this.castFail(h, 'Compétence pas encore prête');
    const ab = ABILITIES[h.def.abilities[slot]];
    const cost = ab.cost[r - 1];
    if (h.mana < cost) return this.castFail(h, 'Pas assez d’énergie');
    let target = null;
    if (ab.aim === 'target' || ab.aim === 'ally') {
      target = forced && !forced.dead ? forced : this.findAbilityTarget(h, ab, x, y);
      if (!target) return this.castFail(h, 'Aucune cible sous le curseur');
      if (ab.aim === 'target' && Utils.dist(h.x, h.y, target.x, target.y) > ab.range + target.radius + 10) { h.order = { type: 'cast', slot, target }; return true; }
      x = target.x; y = target.y;
    }
    if (ab.aim === 'circle') { const d = Utils.dist(h.x, h.y, x, y); if (d > ab.range) { x = h.x + (x - h.x) / d * ab.range; y = h.y + (y - h.y) / d * ab.range; } }
    if (h.recall) h.recall = null;
    if (h.channel) this.endChannel(h, true);
    h.mana -= cost; h.cds[slot] = ab.cd[r - 1] * (1 - h.st.cdr);
    if (Utils.dist(h.x, h.y, x, y) > 1) h.angle = Utils.angleTo(h.x, h.y, x, y);
    h.castAnim = t;
    if (h.order && h.order.type === 'attack' && ab.aim === 'line' && ab.escape) h.order = null;
    ab.cast(this, h, r, x, y, target);
    return true;
  }
  useSpell(h, i, x, y) {
    if (h.dead || h.stunned(this.time) || h.spellCds[i] > 0) { if (h.isPlayer && h.spellCds[i] > 0) this.castFail(h, 'Sort pas encore prêt'); return false; }
    if (h.dash) return false;
    if (h.recall) h.recall = null;
    if (h.channel && h.channel.cancelOnMove) this.endChannel(h, true);
    const sp = SPELLS[h.spells[i]];
    sp.cast(this, h, x, y);
    h.spellCds[i] = sp.cd;
    return true;
  }
  levelUp(h, slot) {
    if (!h.canLevel(slot)) return false;
    h.ranks[slot]++; h.points--;
    if (h.isPlayer) this.sfx('skillUp');
    return true;
  }

  // ---------- Boutique ----------
  buy(h, id) {
    const it = ITEMS[id];
    if (!this.canShop(h)) { if (h.isPlayer) this.castFail(h, 'Revenez à votre base pour acheter'); return false; }
    if (h.items.length >= 6) { if (h.isPlayer) this.castFail(h, 'Inventaire plein : revendez un objet'); return false; }
    if (h.gold < it.cost) { if (h.isPlayer) this.castFail(h, 'Pas assez d’or'); return false; }
    h.gold -= it.cost; h.items.push(id); h.recompute();
    if (h.isPlayer) this.sfx('buy');
    return true;
  }
  sell(h, idx) {
    if (!this.canShop(h) || idx >= h.items.length) return false;
    const id = h.items.splice(idx, 1)[0];
    h.gold += Math.round(ITEMS[id].cost * 0.6); h.recompute();
    if (h.isPlayer) this.sfx('buy');
    return true;
  }

  // ---------- Mouvements spéciaux ----------
  startDash(h, x, y, o) {
    const d0 = Utils.dist(h.x, h.y, x, y);
    const ang = d0 > 1 ? Math.atan2(y - h.y, x - h.x) : h.angle;
    const dist = o.fixed ? o.dist : Math.min(o.dist, Math.max(60, d0));
    h.dash = { ang, dist, done: 0, speed: o.speed, onTouch: o.onTouch, onEnd: o.onEnd, hit: new Set(), kind: o.kind || 'dash' };
    h.angle = ang; h.order = null; if (h.recall) h.recall = null;
  }
  updateDash(h, dt) {
    const d = h.dash, step = Math.min(d.speed * dt, d.dist - d.done);
    const c = MAP.clamp(h.x + Math.cos(d.ang) * step, h.y + Math.sin(d.ang) * step, h.radius);
    const moved = Utils.dist(h.x, h.y, c.x, c.y);
    h.x = c.x; h.y = c.y; d.done += step; h.moving = true; h.walk += dt * 20;
    if (Math.random() < 0.5) this.fx('dust', { x: h.x, y: h.y, size: h.radius, dur: 0.6 });
    let stop = false;
    if (d.onTouch) for (const u of this.enemyUnits(h.team)) {
      if (d.hit.has(u.id)) continue;
      if (Utils.dist(h.x, h.y, u.x, u.y) <= h.radius + u.radius + 10) { d.hit.add(u.id); if (d.onTouch(u)) { stop = true; break; } }
    }
    if (stop || d.done >= d.dist - 0.5 || moved < step * 0.3) { h.dash = null; if (d.onEnd) d.onEnd(); }
  }
  blink(h, x, y, max) {
    const d = Utils.dist(h.x, h.y, x, y), k = d > max ? max / d : 1;
    const c = MAP.clamp(h.x + (x - h.x) * k, h.y + (y - h.y) * k, h.radius);
    this.fx('blink', { x: h.x, y: h.y, dur: 0.5 });
    if (d > 1) h.angle = Utils.angleTo(h.x, h.y, x, y);
    h.x = h.px = c.x; h.y = h.py = c.y; h.order = null; if (h.recall) h.recall = null;
    this.fx('blink', { x: h.x, y: h.y, dur: 0.5 }); this.sfx('blink', h.x, h.y);
  }
  startChannel(h, o) {
    h.channel = { until: this.time + o.dur, every: o.every || 0, tickT: 0, onTick: o.onTick, onEnd: o.onEnd, cancelOnMove: !!o.cancelOnMove, kind: o.kind, ang: o.ang, range: o.range, half: o.half, length: o.length, width: o.width, start: this.time, dur: o.dur };
    h.order = null; h.angle = o.ang !== undefined ? o.ang : h.angle;
  }
  updateChannel(h, dt) {
    const c = h.channel;
    if (c.every) { c.tickT -= dt; if (c.tickT <= 0) { c.tickT += c.every; c.onTick(); } }
    if (this.time >= c.until && h.channel === c) this.endChannel(h, false);
  }
  endChannel(h, cancelled) { const c = h.channel; h.channel = null; if (c && c.onEnd) c.onEnd(cancelled); }

  // ---------- Projectiles et zones ----------
  skillshot(h, x, y, o) {
    const ang = Utils.angleTo(h.x, h.y, x, y);
    this.projectiles.push(new Projectile({ x: h.x + Math.cos(ang) * h.radius, y: h.y + Math.sin(ang) * h.radius, ang, speed: o.speed, range: o.range, width: o.width, team: h.team, src: h, pierce: !!o.pierce, hitAllies: !!o.hitAllies, onHit: o.onHit, visual: o.visual, traveled: 0, hit: new Set() }));
  }
  homing(src, tg, o) {
    const ang = Utils.angleTo(src.x, src.y, tg.x, tg.y);
    const off = src.kind === 'tower' ? 26 : src.radius * 0.8;
    this.projectiles.push(new Projectile({ homing: true, x: src.x + Math.cos(ang) * off, y: src.y + Math.sin(ang) * off - (src.kind === 'tower' ? 18 : 0), ang, speed: o.speed, target: tg, team: src.team, src, onHit: o.onHit, visual: o.visual }));
  }
  updateProjectile(p, dt) {
    if (p.homing) {
      const tg = p.target;
      if (!tg || tg.dead) { p.dead = true; return; }
      const d = Utils.dist(p.x, p.y, tg.x, tg.y), step = p.speed * dt;
      if (d <= step + tg.radius * 0.6) { p.dead = true; p.onHit(tg); return; }
      p.ang = Utils.angleTo(p.x, p.y, tg.x, tg.y);
      p.x += Math.cos(p.ang) * step; p.y += Math.sin(p.ang) * step;
      return;
    }
    const step = Math.min(p.speed * dt, p.range - p.traveled);
    const x0 = p.x, y0 = p.y;
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
      if (z.trigger) for (const u of this.enemyUnits(z.team)) {
        if (Utils.dist(u.x, u.y, z.x, z.y) <= z.r + u.radius * 0.5) { z.onTrigger(u, z); z.dead = true; break; }
      }
    }
    if (z.t >= z.delay + z.dur) z.dead = true;
  }
  aoe(team, x, y, r, fn) { const list = this.enemyUnits(team).filter(u => Utils.dist(x, y, u.x, u.y) <= r + u.radius); for (const u of list) fn(u); return list; }

  // ---------- États ----------
  stun(u, d) {
    if (u.kind !== 'hero' && u.kind !== 'minion') return;
    u.status.stun = Math.max(u.status.stun, this.time + d);
    if (u.kind === 'hero') { if (u.recall) u.recall = null; if (u.channel) this.endChannel(u, true); }
    this.fx('stun', { target: u, dur: d });
  }
  root(u, d) { u.status.root = Math.max(u.status.root, this.time + d); if (u.recall) u.recall = null; this.fx('root', { target: u, dur: d }); }
  slow(u, pct, d) { u.status.slows.push({ pct, until: this.time + d }); }
  haste(u, pct, d) { u.status.hastes.push({ pct, until: this.time + d }); }
  shield(u, amt, d) { u.status.shields.push({ amt, until: this.time + d }); this.fx('shield', { target: u, dur: d }); }
  heal(src, u, amt) {
    if (u.dead) return 0;
    const a = amt * (1 + (src && src.st && src.st.healPower || 0));
    const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + a);
    const got = u.hp - before;
    if (got >= 1 && (u === this.player || src === this.player)) this.float('+' + Math.round(got), u.x, u.y - u.radius - 14, '#8cff7a');
    return got;
  }

  // ---------- Dégâts et éliminations ----------
  damage(src, tg, amount, type = 'phys', opt = {}) {
    if (!tg || tg.dead) return 0;
    if (src && src.team === tg.team) return 0;
    if ((tg.kind === 'tower' || tg.kind === 'core') && !this.isTargetable(tg, 1 - tg.team)) return 0;
    let dmg = amount;
    if (type === 'phys') dmg *= 100 / (100 + Math.max(0, tg.st.armor || 0));
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, tg.st.resist || 0));
    if (tg.kind === 'tower' || tg.kind === 'core') {
      if (src && src.kind === 'minion') dmg *= (src.def.siege ? 1.5 : 1) * (this.lateGame ? 1.8 : 1);
      if (!this.alliedMinionsNear(1 - tg.team, tg.x, tg.y, 560)) dmg *= 0.4;   // protection sans sbires
    }
    const t = this.time;
    if (tg.status.shields.length) for (const s of tg.status.shields) { if (s.until <= t || dmg <= 0) continue; const a = Math.min(s.amt, dmg); s.amt -= a; dmg -= a; }
    tg.hp -= dmg; tg.lastHit = t;
    if (tg.kind === 'hero') {
      if (tg.recall) { tg.recall = null; if (tg.isPlayer) this.log('Retour interrompu', 'warn'); }
      if (src && src.kind === 'hero') tg.damagedBy.set(src.id, t);
    }
    if (src && src.kind === 'hero') {
      src.lastCombat = t;
      if (tg.kind === 'hero') src.dmgDealt += dmg;
      if (opt.basic && src.st.lifesteal) src.hp = Math.min(src.maxHp, src.hp + dmg * src.st.lifesteal);
      if (tg.kind === 'hero') this.callForHelp(src, tg);
    }
    if (dmg >= 1 && this.player && (src === this.player || tg === this.player))
      this.float(Math.round(dmg), tg.x, tg.y - tg.radius - 10, tg === this.player ? '#ff6a5a' : type === 'magic' ? '#9fd8ff' : type === 'true' ? '#ffffff' : '#ffd27a', dmg > 120);
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
    if (u.kind === 'minion') {
      if (src && src.kind === 'hero') {
        const gold = u.def.gold + Math.floor(t / 90);
        src.gold += gold; src.cs++;
        if (src.isPlayer) { this.float('+' + gold, u.x, u.y - 22, '#ffd34d', true); this.sfx('gold'); }
      }
      this.shareXp(1 - u.team, u.x, u.y, u.def.xp);
      this.fx('death', { x: u.x, y: u.y, size: u.radius * 1.6, dur: 0.7, team: u.team, siege: u.def.siege });
      if (u.def.siege) this.sfx('explosion', u.x, u.y);
    } else if (u.kind === 'hero') this.heroDeath(u, src);
    else if (u.kind === 'tower') {
      this.towersDown[u.team]++;
      for (const h of this.heroes) if (h.team !== u.team) h.gold += 120;
      this.rubble.push({ x: u.x, y: u.y, r: u.radius, team: u.team, seed: Math.random() });
      this.fx('bigExplosion', { x: u.x, y: u.y, size: 90, dur: 1.6 }); this.sfx('towerFall', u.x, u.y);
      if (u.team === 0) this.announce('Tourelle perdue', 'Les Charognards avancent', 'bad');
      else this.announce('Tourelle détruite', '+120 or pour toute l’équipe', 'good');
    } else if (u.kind === 'core') {
      this.state = 'over'; this.winner = 1 - u.team; this.endAt = t + 3.2;
      this.rubble.push({ x: u.x, y: u.y, r: u.radius * 1.4, team: u.team, seed: Math.random(), core: true });
      this.fx('bigExplosion', { x: u.x, y: u.y, size: 180, dur: 2.6 }); this.sfx('coreFall', u.x, u.y);
      this.camera.locked = false; this.camera.focus = { x: u.x, y: u.y };
      this.announce(this.winner === 0 ? 'Victoire' : 'Défaite', this.winner === 0 ? 'Le réacteur des Charognards a sauté' : 'Notre réacteur a sauté', this.winner === 0 ? 'good' : 'bad');
    }
  }
  shareXp(team, x, y, amount) {
    const rec = this.heroes.filter(h => !h.dead && h.team === team && Utils.dist(h.x, h.y, x, y) <= CONFIG.XP_RANGE);
    if (!rec.length) return;
    const each = rec.length === 1 ? amount : amount * 1.25 / rec.length;
    for (const h of rec) this.addXp(h, each);
  }
  addXp(h, amt) {
    if (h.level >= CONFIG.MAX_LEVEL) return;
    h.xp += amt;
    while (h.level < CONFIG.MAX_LEVEL && h.xp >= xpToNext(h.level)) {
      h.xp -= xpToNext(h.level); h.level++; h.points++; h.recompute();
      this.fx('levelup', { target: h, dur: 1.2 });
      if (h.isPlayer) { this.sfx('levelup'); if (h.level === 6) this.log('Niveau 6 : votre ultime est disponible (Ctrl + ' + (this.ui ? this.ui.keyLabel('ab3') : 'R') + ')', 'good'); }
    }
    if (h.level >= CONFIG.MAX_LEVEL) h.xp = 0;
  }
  heroDeath(v, src) {
    const t = this.time;
    v.d++; v.respawnAt = t + respawnTime(v.level, t);
    v.order = null; v.dash = null; v.channel = null; v.recall = null; v.empower = null;
    v.status = { stun: 0, root: 0, slows: [], hastes: [], shields: [] };
    let killer = src && src.kind === 'hero' ? src : null;
    const recent = [...v.damagedBy.entries()].filter(([, tt]) => t - tt <= CONFIG.ASSIST_WINDOW);
    if (!killer && recent.length) { recent.sort((a, b) => b[1] - a[1]); killer = this.heroes.find(h => h.id === recent[0][0]) || null; }
    const assisters = this.heroes.filter(h => h !== killer && h.team !== v.team && recent.some(([id]) => id === h.id));
    const bounty = Math.min(500, 300 + 50 * Math.max(0, v.streak - 1));
    if (killer) {
      killer.k++; killer.streak++;
      killer.gold += bounty + (this.firstBlood ? 0 : 100);
      killer.multi = t - killer.multi.t < 10 ? { n: killer.multi.n + 1, t } : { n: 1, t };
      this.kills[killer.team]++;
    }
    v.streak = 0;
    for (const a of assisters) { a.a++; a.gold += Math.round(bounty * 0.5 / assisters.length); }
    const rec = [killer, ...assisters].filter(Boolean);
    const xp = 120 + 35 * v.level;
    for (const h of rec) this.addXp(h, rec.length > 1 ? xp * 1.3 / rec.length : xp);
    v.damagedBy.clear();
    this.fx('heroDeath', { x: v.x, y: v.y, dur: 1.4, team: v.team });
    this.sfx('death', v.x, v.y);
    if (this.ui) this.ui.feed(killer, v, assisters);
    if (killer && !this.firstBlood) { this.firstBlood = true; this.announce('Premier sang', `${killer.name} élimine ${v.name}`, killer.team === 0 ? 'good' : 'bad'); }
    else if (killer && killer.multi.n >= 2) this.announce(['', '', 'Double élimination', 'Triple élimination'][Math.min(3, killer.multi.n)], killer.name, killer.team === 0 ? 'good' : 'bad');
    else if (v.isPlayer) this.announce('Vous êtes à terre', killer ? `Éliminé par ${killer.name}` : 'Exécuté', 'bad');
    else if (killer && killer.isPlayer) this.announce('Ennemi éliminé', v.name, 'good');
    else if (v.team === 0) this.announce('Un allié est tombé', v.name, 'bad');
    else this.announce('Ennemi éliminé', v.name, 'good');
    this.firstBlood = this.firstBlood || !!killer;
  }
  respawn(h) {
    const f = MAP.fountains[h.team];
    h.dead = false; h.x = h.px = f.x + Utils.rand(-30, 30); h.y = h.py = f.y + Utils.rand(-30, 30);
    h.hp = h.maxHp; h.mana = h.maxMana; h.order = null; h.attackCd = 0;
    this.fx('respawn', { x: h.x, y: h.y, dur: 0.9 });
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
          if (m.def.ranged) this.homing(m, tg, { speed: m.def.siege ? 620 : 760, visual: m.def.siege ? 'shell' : 'bolt', onHit: u => this.damage(m, u, m.ad, 'phys') });
          else this.damage(m, tg, m.ad, 'phys');
          if (Math.random() < 0.25) this.sfx(m.def.ranged ? 'bow' : 'clank', m.x, m.y);
        }
      } else this.moveToward(m, tg.x, tg.y, dt, reach - 4);
    } else {
      const p = MAP.progress(m.team, m.x, m.y);
      const pt = MAP.pointAt(m.team, p + 140, m.lat);
      this.moveToward(m, pt.x, pt.y, dt, 4);
    }
  }
  validMinionTarget(m, tg) { return tg && !tg.dead && this.isTargetable(tg, m.team) && Utils.dist(m.x, m.y, tg.x, tg.y) < 520; }
  minionPickTarget(m) {
    if (m.aggro && this.time < m.aggroUntil && this.validMinionTarget(m, m.aggro) && Utils.dist(m.x, m.y, m.aggro.x, m.aggro.y) < 480) return m.aggro;
    const R = 340;
    let best = null, bd = Infinity;
    for (const o of this.minions) if (!o.dead && o.team !== m.team) { const d = Utils.dist(m.x, m.y, o.x, o.y); if (d < R && d < bd) { bd = d; best = o; } }
    if (best) return best;
    for (const s of this.structures()) if (this.isTargetable(s, m.team)) { const d = Utils.dist(m.x, m.y, s.x, s.y) - s.radius; if (d < R + 40 && d < bd) { bd = d; best = s; } }
    if (best) return best;
    for (const h of this.heroes) if (!h.dead && h.team !== m.team) { const d = Utils.dist(m.x, m.y, h.x, h.y); if (d < R && d < bd) { bd = d; best = h; } }
    return best;
  }

  // ---------- Tourelles ----------
  updateTower(tw, dt) {
    const t = this.time;
    tw.attackCd -= dt;
    const inRange = u => u && !u.dead && u.team !== tw.team && Utils.dist(tw.x, tw.y, u.x, u.y) <= TOWER.range + u.radius;
    if (tw.aggro && t < tw.aggroUntil && inRange(tw.aggro) && tw.target !== tw.aggro) { tw.target = tw.aggro; tw.ramp = 0; }
    if (!inRange(tw.target)) {
      tw.target = null; tw.ramp = 0;
      let best = null, bd = Infinity;
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
    else dmg = tg.maxHp * (tg.type === 'siege' ? 0.14 : tg.type === 'ranged' ? 0.7 : 0.45);
    this.homing(tw, tg, { speed: 820, visual: 'flare', onHit: u => this.damage(tw, u, dmg, isHero ? 'phys' : 'true') });
    this.sfx('tower', tw.x, tw.y);
  }

  // ---------- Collisions ----------
  separate() {
    const us = [];
    for (const h of this.heroes) if (!h.dead && !h.dash) us.push(h);
    for (const m of this.minions) if (!m.dead) us.push(m);
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j], dx = b.x - a.x, dy = b.y - a.y, min = a.radius + b.radius, d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 < 0.01) { a.x += Utils.rand(-1, 1); a.y += Utils.rand(-1, 1); continue; }
        const d = Math.sqrt(d2), push = (min - d), nx = dx / d, ny = dy / d;
        let wa = 0.5, wb = 0.5;
        if (a.kind === 'hero' && b.kind === 'minion') { wa = 0.15; wb = 0.85; } else if (a.kind === 'minion' && b.kind === 'hero') { wa = 0.85; wb = 0.15; }
        a.x -= nx * push * wa * 0.5; a.y -= ny * push * wa * 0.5; b.x += nx * push * wb * 0.5; b.y += ny * push * wb * 0.5;
      }
      for (const s of this.structures()) {
        if (s.dead) continue;
        const dx = a.x - s.x, dy = a.y - s.y, min = a.radius + s.radius, d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01; a.x = s.x + dx / d * min; a.y = s.y + dy / d * min;
      }
      const c = MAP.clamp(a.x, a.y, a.radius); a.x = c.x; a.y = c.y;
    }
  }
}
