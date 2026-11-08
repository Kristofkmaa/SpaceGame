// ============ IA adverse : économie, contre-composition, défense, vagues ============
class AI {
  constructor(game, faction, difficulty) {
    this.game = game; this.faction = faction; this.diff = difficulty;
    this.timer = 0; this.attacking = false; this.waves = 0; this.researchOrder = ['mining', 'weapons1', 'armor1', 'sensors', 'engines', 'weapons2', 'armor2'];
  }
  update(dt) { this.timer += dt; if (this.timer < this.diff.reaction) return; this.timer = 0; this.think(); }

  think() {
    const g = this.game, f = this.faction;
    const my = g.structures.filter(s => s.faction === f && !s.dead);
    if (!my.length) return;
    const base = my.find(s => s.type === 'mothership') || my[0];
    const units = g.units.filter(u => u.faction === f && !u.dead);
    const coll = units.filter(u => u.type === 'collector'), combat = units.filter(u => u.isCombat && u.type !== 'scout');
    const producers = my.filter(s => !s.building && s.def.produces);
    const m = g.time / 60;
    for (const s of producers) if (!s.rally) s.rally = this.rallyPoint(s);

    // Collecteurs inactifs
    for (const h of coll) if (!h.order) { const a = g.nearestAsteroid(h.x, h.y, 2600); if (a) h.order = { type: 'mine', target: a }; }

    // Économie
    const queued = t => my.reduce((n, s) => n + s.queue.filter(q => q.type === t).length, 0);
    const wantColl = Math.min(10, 4 + Math.floor(m / 1.4));
    const ms = producers.find(s => s.type === 'mothership');
    if (ms && coll.length + queued('collector') < wantColl && ms.queue.length < 2) g.queueProduction(ms, 'collector');
    if (ms && m > 0.5 && units.filter(u => u.type === 'scout').length + queued('scout') < 1 && ms.queue.length < 2) g.queueProduction(ms, 'scout');

    // Bâtiments
    const count = t => my.filter(s => s.type === t).length;
    const ru = g.ru[f];
    if (count('turret') < Math.min(5, 1 + Math.floor(m / 2.5)) && ru >= 230 && m > 0.7) this.tryPlace('turret', base, 120, 230);
    else if (count('shipyard') < Math.min(2, 1 + Math.floor(m / 6)) && ru >= 560 && m > 1.5) this.tryPlace('shipyard', base, 170, 300);
    else if (count('research') < 1 && ru >= 450 && m > 3) this.tryPlace('research', base, 150, 260);
    else if (count('relay') < 1 && ru >= 260 && m > 2) this.tryPlace('relay', base, 380, 430);

    // Recherche
    const lab = my.find(s => s.type === 'research' && !s.building && !s.research);
    if (lab && ru > 500) { for (const id of this.researchOrder) if (g.canResearch(f, id)) { g.startResearch(f, id); break; } }

    // Production militaire : contre la composition adverse observée
    const capFree = g.capMax(f) - g.capUsed(f);
    for (const s of producers) {
      if (s.queue.length >= 2) continue;
      const type = this.pickCombatType(m, s);
      if (!type) continue;
      const def = UNIT_TYPES[type];
      if (ru >= def.cost && capFree >= def.cap) g.queueProduction(s, type);
    }

    // Défense
    let threat = null;
    for (const s of my) { const es = g.enemiesNear(s.x, s.y, 560, f); if (es.length) { threat = es[0]; break; } }
    if (threat) for (const u of combat) {
      if (u.order && u.order.type === 'attack') continue;
      if (!this.attacking || Utils.dist(u.x, u.y, base.x, base.y) < 1000) u.order = { type: 'attackMove', x: threat.x, y: threat.y };
    }

    // Offensive
    const threshold = this.diff.attackSize + this.waves * this.diff.attackGrowth * 2 + m * 0.35;
    const strength = combat.reduce((n, u) => n + u.def.cost / 75, 0);
    if (!this.attacking && strength >= threshold && !threat && g.time >= this.diff.firstAttack) this.launchAttack(combat, base);
    if (this.attacking) {
      if (strength < threshold * 0.3) { this.attacking = false; this.rallyAll(combat, base); }
      else for (const u of combat) if (!u.order) { const t = this.pickTarget(u.x, u.y); if (t) u.order = { type: 'attackMove', x: t.x, y: t.y }; }
    }
  }

  // Choisit un type qui contre l'armée adverse
  pickCombatType(m, producer) {
    const g = this.game;
    const enemy = g.units.filter(u => u.faction !== this.faction && u.faction !== FACTION.NEUTRAL && u.isCombat);
    const cls = { fighter: 0, corvette: 0, frigate: 0, capital: 0 };
    for (const u of enemy) cls[u.def.cls] = (cls[u.def.cls] || 0) + u.def.cost;
    const w = { interceptor: 2 + cls.capital / 200, corvette: 1 + cls.fighter / 120 + m * 0.2, assault: 0.6 + cls.corvette / 150 + m * 0.3, ion: (m > 2 ? 0.4 : 0) + cls.capital / 300 + cls.frigate / 500, destroyer: (m > 4 ? 0.3 : 0) + cls.frigate / 250 };
    const avail = Object.keys(w).filter(t => producer.def.produces.includes(t) && g.canProduce(producer, t) !== 'requires');
    if (!avail.length) return null;
    const total = avail.reduce((n, t) => n + w[t], 0);
    let r = Math.random() * total;
    for (const t of avail) { r -= w[t]; if (r <= 0) return t; }
    return avail[0];
  }

  pickTarget(x, y) {
    const g = this.game;
    let best = null, bd = Infinity;
    for (const s of g.structures) { if (s.dead || s.faction === this.faction) continue; const d = Utils.dist2(x, y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
    if (best) return best;
    for (const u of g.units) { if (u.dead || u.faction === this.faction) continue; const d = Utils.dist2(x, y, u.x, u.y); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  launchAttack(combat, base) {
    this.attacking = true; this.waves++;
    const t = this.pickTarget(base.x, base.y);
    if (!t) return;
    const saved = this.game.formation; this.game.formation = 'delta';
    for (const s of this.game.formationSlots(combat, t.x, t.y)) { s.u.order = { type: 'attackMove', x: s.x, y: s.y }; s.u.stance = 'aggressive'; }
    this.game.formation = saved;
  }
  rallyAll(combat, base) { const r = this.rallyPoint(base); for (const u of combat) { u.order = { type: 'move', x: r.x + Utils.rand(-80, 80), y: r.y + Utils.rand(-80, 80) }; u.stance = 'neutral'; } }
  rallyPoint(s) { const ang = Utils.angleTo(s.x, s.y, this.game.W / 2, this.game.H / 2); return { x: s.x + Math.cos(ang) * 260, y: s.y + Math.sin(ang) * 260 }; }
  tryPlace(type, base, minD, maxD) {
    const g = this.game, toCenter = Utils.angleTo(base.x, base.y, g.W / 2, g.H / 2);
    for (let i = 0; i < 16; i++) {
      const ang = toCenter + Utils.rand(-1.5, 1.5), d = Utils.rand(minD, maxD);
      const x = base.x + Math.cos(ang) * d, y = base.y + Math.sin(ang) * d;
      if (g.canPlace(type, x, y, this.faction)) { g.placeStructure(type, x, y, this.faction); return true; }
    }
    return false;
  }
}
