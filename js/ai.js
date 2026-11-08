// Intelligence artificielle de la faction adverse
class AI {
  constructor(game, faction, difficulty) {
    this.game = game;
    this.faction = faction;
    this.diff = difficulty;
    this.timer = 0;
    this.attacking = false;
    this.waves = 0;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < this.diff.reaction) return;
    this.timer = 0;
    this.think();
  }

  think() {
    const g = this.game, f = this.faction;
    const my = g.structures.filter(s => s.faction === f && !s.dead);
    if (!my.length) return;
    const base = my.find(s => s.type === 'station') || my[0];
    const units = g.units.filter(u => u.faction === f && !u.dead);
    const harv = units.filter(u => u.type === 'harvester');
    const combat = units.filter(u => u.isCombat);
    const producers = my.filter(s => !s.building && s.def.produces);
    const minutes = g.time / 60;

    // Points de ralliement
    for (const s of producers) if (!s.rally) s.rally = this.rallyPoint(s);

    // 1. Collecteurs inactifs
    for (const h of harv) {
      if (!h.order) {
        const a = g.nearestAsteroid(h.x, h.y, 2500);
        if (a) h.order = { type: 'mine', target: a };
      }
    }

    // 2. Économie
    const queuedHarv = my.reduce((n, s) => n + s.queue.filter(q => q.type === 'harvester').length, 0);
    const wantHarv = Math.min(9, 4 + Math.floor(minutes / 1.5));
    const station = producers.find(s => s.type === 'station');
    if (station && harv.length + queuedHarv < wantHarv && station.queue.length < 2) {
      g.queueProduction(station, 'harvester');
    }

    // 3. Bâtiments
    const shipyards = my.filter(s => s.type === 'shipyard');
    const turrets = my.filter(s => s.type === 'turret');
    const wantTurrets = Math.min(5, 1 + Math.floor(minutes / 2.5));
    if (turrets.length < wantTurrets && g.minerals[f] >= STRUCTURE_TYPES.turret.cost + 60 && minutes > 0.75) {
      this.tryPlace('turret', base, 110, 200);
    } else if (shipyards.length < Math.min(2, 1 + Math.floor(minutes / 5)) && g.minerals[f] >= STRUCTURE_TYPES.shipyard.cost + 120 && minutes > 1.5) {
      this.tryPlace('shipyard', base, 150, 280);
    }

    // 4. Production militaire
    for (const s of producers) {
      if (s.queue.length >= 2) continue;
      const type = this.pickCombatType(minutes);
      if (g.minerals[f] >= UNIT_TYPES[type].cost) g.queueProduction(s, type);
    }

    // 5. Défense : une menace près d'un bâtiment rappelle les unités proches
    let threat = null;
    for (const s of my) {
      const es = g.enemiesNear(s.x, s.y, 520, f);
      if (es.length) { threat = es[0]; break; }
    }
    if (threat) {
      for (const u of combat) {
        if (u.order && u.order.type === 'attack') continue;
        if (!this.attacking || Utils.dist(u.x, u.y, base.x, base.y) < 900) {
          u.order = { type: 'attackMove', x: threat.x, y: threat.y };
        }
      }
    }

    // 6. Offensive
    const threshold = this.diff.attackSize + this.waves * this.diff.attackGrowth * 2 + minutes * 0.3;
    const strength = combat.reduce((n, u) => n + u.def.cost / 75, 0); // en équivalents chasseurs
    if (!this.attacking && strength >= threshold && !threat && g.time >= this.diff.firstAttack) {
      this.launchAttack(combat, base);
    }
    if (this.attacking) {
      if (strength < threshold * 0.3) {
        this.attacking = false;
        this.rallyAll(combat, base);
      } else {
        for (const u of combat) {
          if (!u.order) {
            const t = this.pickTarget(u.x, u.y);
            if (t) u.order = { type: 'attackMove', x: t.x, y: t.y };
          }
        }
      }
    }
  }

  pickCombatType(m) {
    const w = { fighter: 3, frigate: 1 + m * 0.5, cruiser: m > 3 ? (m - 3) * 0.45 : 0 };
    const total = w.fighter + w.frigate + w.cruiser;
    let r = Math.random() * total;
    for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
    return 'fighter';
  }

  pickTarget(x, y) {
    const g = this.game;
    let best = null, bd = Infinity;
    for (const s of g.structures) {
      if (s.dead || s.faction === this.faction) continue;
      const d = Utils.dist2(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) return best;
    for (const u of g.units) {
      if (u.dead || u.faction === this.faction) continue;
      const d = Utils.dist2(x, y, u.x, u.y);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  launchAttack(combat, base) {
    this.attacking = true;
    this.waves++;
    const t = this.pickTarget(base.x, base.y);
    if (!t) return;
    for (const u of combat) u.order = { type: 'attackMove', x: t.x + Utils.rand(-60, 60), y: t.y + Utils.rand(-60, 60) };
  }

  rallyAll(combat, base) {
    const r = this.rallyPoint(base);
    for (const u of combat) u.order = { type: 'move', x: r.x + Utils.rand(-70, 70), y: r.y + Utils.rand(-70, 70) };
  }

  rallyPoint(s) {
    const ang = Utils.angleTo(s.x, s.y, CONFIG.WORLD_W / 2, CONFIG.WORLD_H / 2);
    return { x: s.x + Math.cos(ang) * 230, y: s.y + Math.sin(ang) * 230 };
  }

  tryPlace(type, base, minD, maxD) {
    const g = this.game;
    const toCenter = Utils.angleTo(base.x, base.y, CONFIG.WORLD_W / 2, CONFIG.WORLD_H / 2);
    for (let i = 0; i < 14; i++) {
      const ang = toCenter + Utils.rand(-1.4, 1.4);
      const d = Utils.rand(minD, maxD);
      const x = base.x + Math.cos(ang) * d, y = base.y + Math.sin(ang) * d;
      if (g.canPlace(type, x, y, this.faction)) { g.placeStructure(type, x, y, this.faction); return true; }
    }
    return false;
  }
}
