// ============ IA des héros : voie, jungle, combat, repli, achats ============
class HeroBot {
  constructor(game, hero) {
    this.g = game; this.h = hero; this.d = game.diff;
    this.t = Math.random() * 0.4; this.lat = Utils.rand(-70, 70);
    this.lane = ROLES[hero.role].lane;
  }
  update(dt) { this.t -= dt; if (this.t > 0) return; this.t = this.d.reaction * Utils.rand(0.8, 1.25); this.think(); }
  power(list) { let p = 0; for (const u of list) p += (u.hp / u.maxHp) * (u.level + 0.5 * u.items.filter(s => ITEMS[s.id].tier >= 2).length + (u.ranks[3] > 0 && u.cds[3] <= 0 ? 1.5 : 0)); return p; }
  pickSkill() {
    const h = this.h;
    if (h.canLevel(3)) return 3;
    for (const s of h.def.skillOrder) if (h.ranks[s] === 0 && h.canLevel(s)) return s;
    for (const s of h.def.skillOrder) if (h.canLevel(s)) return s;
    return -1;
  }
  // ---------- Achats ----------
  covers(owned, id) { const stack = [owned]; while (stack.length) { const x = stack.pop(); if (x === id) return true; for (const c of (ITEMS[x].from || [])) stack.push(c); } return false; }
  nextGoal() {
    const owned = this.h.items.map(s => s.id).filter(i => i !== 'potion');
    const used = new Set();
    for (const id of this.h.def.build) {
      const i = owned.findIndex((o, k) => !used.has(k) && this.covers(o, id));
      if (i >= 0) { used.add(i); continue; }
      return id;
    }
    return null;
  }
  shop() {
    const g = this.g, h = this.h;
    for (let n = 0; n < 8; n++) {
      const goal = this.nextGoal(); if (!goal) break;
      if (h.items.length >= 6) { const pi = h.items.findIndex(s => s.id === 'potion'); if (pi >= 0) { g.sell(h, pi); continue; } }
      const { price } = g.priceFor(h, goal);
      if (h.gold >= price) { if (!g.buy(h, goal)) break; continue; }
      const comp = this.component(goal); if (comp && g.buy(h, comp)) continue;
      break;
    }
    if (g.time < 90 && h.gold >= 50 && !h.items.some(s => s.id === 'potion' && s.n >= 2) && h.items.length < 6) g.buy(h, 'potion');
  }
  component(goal) {
    const g = this.g, h = this.h; let best = null, bp = 0;
    const walk = id => { for (const c of (ITEMS[id].from || [])) { if (h.items.some(s => this.covers(s.id, c))) continue; const { price } = g.priceFor(h, c); if (price <= h.gold && price > bp) { bp = price; best = c; } walk(c); } };
    walk(goal); return best;
  }
  tryCast(slots, fn) {
    const g = this.g, h = this.h;
    for (const s of slots) {
      if (!g.canCast(h, s) || Math.random() > this.d.skill) continue;
      const plan = fn(ABILITIES[h.def.abilities[s]], s);
      if (plan && g.castAbility(h, s, plan.x, plan.y, plan.target)) return true;
    }
    return false;
  }
  goTo(x, y) { const h = this.h; if (Utils.dist(h.x, h.y, x, y) > 45) this.g.issueMove(h, x, y); else if (h.order && h.order.type === 'move') h.order = null; }

  // ---------- Décision ----------
  think() {
    const g = this.g, h = this.h, D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
    if (h.dead) { this.shop(); return; }
    while (h.points > 0) { const s = this.pickSkill(); if (s < 0 || !g.levelUp(h, s)) break; }
    if (g.canShop(h)) this.shop();
    if (h.dash || (h.channel && !h.channel.cancelOnMove)) return;
    const hpP = h.hp / h.maxHp, manaP = h.mana / h.maxMana;
    const enemies = g.enemyHeroesNear(h.x, h.y, 800, h.team);
    if (h.recall) { if (enemies.some(e => D(e, h) < 700)) h.recall = null; else return; }
    if (h.channel) return;
    const f = MAP.fountains[h.team];
    if (g.inShop(h) && (hpP < 0.9 || manaP < 0.6) && !enemies.length) { this.goTo(f.x + this.lat * 0.4, f.y - this.lat * 0.3); return; }
    if (g.time > 600 * 2 && h.role !== 'jungle' && h.role !== 'top') this.lane = 'mid';
    // Potion
    if (hpP < 0.55 && !h.potions.length && !g.inShop(h)) { const pi = h.items.findIndex(s => s.id === 'potion'); if (pi >= 0) g.useItem(h, pi); }
    const allies = g.allyHeroesNear(h.x, h.y, 800, h.team);
    const myPow = this.power(allies), theirPow = this.power(enemies);
    const towerOnMe = g.towers.some(tw => !tw.dead && tw.team !== h.team && tw.target === h);
    const enemiesAlive = g.heroes.filter(e => !e.dead && e.team !== h.team).length, alliesAlive = g.heroes.filter(e => !e.dead && e.team === h.team).length;
    this.push = enemiesAlive <= 2 && alliesAlive >= 4 && hpP > 0.5;
    if (hpP < 0.25 || (hpP < 0.45 && theirPow > myPow * 1.25) || (towerOnMe && (hpP < (this.push ? 0.4 : 0.75) || (!enemies.length && !this.push)))) return this.retreat(enemies, hpP);
    if (!enemies.length && !g.underEnemyTower(h.team, h.x, h.y) && !h.potions.length) {
      const goal = this.nextGoal();
      if (hpP < 0.4 || manaP < 0.12 || (goal && h.gold >= g.priceFor(h, goal).price + 200 && hpP < 0.85)) { g.startRecall(h); return; }
    }
    if (this.tryCast([0, 1, 2, 3], ab => ab.aiSupport ? ab.aiSupport(g, h, allies, enemies) : null)) return;
    // Combat contre les héros
    let target = null;
    if (enemies.length) {
      const cands = enemies.filter(e => D(e, h) <= h.st.range + 350 && (!g.underEnemyTower(h.team, e.x, e.y) || (e.hp / e.maxHp < 0.2 && hpP > 0.6 && this.d.aggression > 0)));
      cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      const c = cands[0];
      if (c && (myPow >= theirPow * (0.9 - this.d.aggression) || c.hp / c.maxHp < 0.3)) target = c;
    }
    if (target) {
      if (this.tryCast([3, 0, 2, 1], ab => ab.ai ? ab.ai(g, h, target, { enemies, allies }) : null)) return;
      if (h.spells[1] === 'patch' && hpP < 0.3 && h.spellCds[1] <= 0) g.useSpell(h, 1, h.x, h.y);
      g.issueAttack(h, target); return;
    }
    // Aider un allié en combat proche
    const fight = g.heroes.find(a => !a.dead && a.team === h.team && a !== h && D(a, h) < 1500 && D(a, h) > 500 && g.enemyHeroesNear(a.x, a.y, 500, h.team).length && a.lastCombat > g.time - 2);
    if (fight && hpP > 0.6 && (h.role === 'jungle' || h.role === 'support' || D(fight, h) < 1000)) { this.goTo(fight.x, fight.y); return; }
    if (h.role === 'jungle') return this.jungle(enemies, hpP);
    return this.laning(enemies, hpP, manaP);
  }

  laning(enemies, hpP, manaP) {
    const g = this.g, h = this.h, D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y), lane = this.lane;
    // Le soutien suit son tireur
    if (h.role === 'support' && lane === 'bot') {
      const adc = g.heroes.find(a => !a.dead && a.team === h.team && a.role === 'adc');
      if (adc && D(adc, h) > 350) { this.goTo(adc.x - Math.cos(adc.angle) * 80, adc.y - Math.sin(adc.angle) * 80); return; }
    }
    const minions = g.enemyMinionsNear(h.x, h.y, h.st.range + 320, h.team).filter(m => m.vis[h.team] && (!g.underEnemyTower(h.team, m.x, m.y) || g.alliedMinionsNear(h.team, m.x, m.y, TOWER.range) >= 2));
    if (h.role !== 'support' && Math.random() < this.d.lastHit) {
      const lh = minions.filter(m => m.hp <= h.st.ad * 100 / (100 + m.st.armor) * 1.05).sort((a, b) => D(a, h) - D(b, h))[0];
      if (lh) { g.issueAttack(h, lh); return; }
    }
    const es = g.laneEnemyStructure(h.team, lane);
    if (es && !enemies.length && (this.push || D(h, es) < TOWER.range + 320) && (g.structureSafeToHit(es, h.team) || this.push) && g.isTargetable(es, h.team)) { g.issueAttack(h, es); return; }
    if (minions.length && !enemies.length && h.role !== 'support') {
      if (manaP > 0.6 && Math.random() < this.d.skill * 0.5 && this.tryCast([0, 1, 2], ab => ab.aiFarm ? ab.aiFarm(g, h, minions) : null)) return;
      g.issueAttack(h, minions.reduce((a, b) => (a.hp < b.hp ? a : b))); return;
    }
    if (enemies.length && manaP > 0.55 && Math.random() < this.d.skill * 0.6) {
      const e = enemies.slice().sort((a, b) => D(a, h) - D(b, h))[0];
      if (!g.underEnemyTower(h.team, e.x, e.y) && this.tryCast([0, 1, 2], ab => ab.ai && !ab.escape && ab.aim !== 'self' && !ab.ult ? ab.ai(g, h, e, { enemies, allies: [] }) : null)) return;
    }
    // Position derrière la vague
    let front = g.laneFront(h.team, lane);
    if (front === null) front = g.laneOwnStructureProgress(h.team, lane) + 60;
    let p = front - (h.def.ranged ? 170 : 70);
    if (es && es.kind === 'tower' && !this.push) { const ep = MAP.progress(h.team, lane, es.x, es.y); p = Math.min(p, ep - (g.structureSafeToHit(es, h.team) ? 140 : TOWER.range + 70)); }
    if (enemies.length) p -= 80;
    p = Math.max(p, 250);
    const pt = MAP.pointAt(h.team, lane, p, this.lat);
    this.goTo(pt.x, pt.y);
  }

  jungle(enemies, hpP) {
    const g = this.g, h = this.h, D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
    const smiteSlot = h.spells.indexOf('smite'), smiteDmg = 450 + 25 * h.level;
    const nearMon = g.monsters.filter(m => !m.dead && D(m, h) < 500);
    // Ne pas s'acharner sur un camp quand la vie manque
    const engagedMon = nearMon.filter(m => m.target === h);
    if (engagedMon.length) {
      const left = engagedMon.reduce((s, m) => s + m.hp, 0), myDps = h.st.ad * h.st.as * 1.3 + 40;
      const incoming = engagedMon.reduce((s, m) => s + m.ad / m.def.period, 0) * 100 / (100 + h.st.armor);
      if (h.hp < incoming * (left / myDps) * 1.1 && !(smiteSlot >= 0 && h.spellCds[smiteSlot] <= 0 && left < smiteDmg * 1.2)) { this.goTo(MAP.fountains[h.team].x, MAP.fountains[h.team].y); return; }
    } else if (hpP < 0.45 && !enemies.length) { this.g.startRecall(h); return; }
    if (smiteSlot >= 0 && h.spellCds[smiteSlot] <= 0) {
      const m = nearMon.find(x => x.hp <= smiteDmg && D(x, h) < 280 + x.radius && (x.def.buff || x.def.epic || x.def.hp >= 1100));
      if (m) { g.useSpell(h, smiteSlot, m.x, m.y); return; }
    }
    if (nearMon.length) {
      const engaged = nearMon.filter(m => m.target === h || m.target);
      const tg = (engaged.length ? engaged : nearMon).reduce((a, b) => (a.hp < b.hp ? a : b));
      if (Math.random() < this.d.skill && this.tryCast([0, 1, 2, 3], ab => (ab.aiFarm && !ab.ult) ? ab.aiFarm(g, h, nearMon) : (ab.aiSupport ? ab.aiSupport(g, h, [h], []) : null))) return;
      g.issueAttack(h, tg); return;
    }
    // Opportunité d'attaque sur une voie
    if (h.level >= 3 && hpP > 0.6) {
      const prey = g.heroes.filter(e => !e.dead && e.team !== h.team && e.vis[h.team] && D(e, h) < 1800 && e.hp / e.maxHp < 0.6 && g.allyHeroesNear(e.x, e.y, 700, h.team).length && !g.underEnemyTower(h.team, e.x, e.y))[0];
      if (prey) { this.goTo(prey.x, prey.y); return; }
    }
    // Objectifs épiques
    const allyCount = (x, y) => g.allyHeroesNear(x, y, 1400, h.team).length;
    for (const c of g.camps) {
      if (!c.epic || !c.alive.length) continue;
      const need = c.id === 'worm' ? (h.level >= 7 ? 2 : 9) : (h.level >= 13 ? 4 : 9);
      if (allyCount(c.x, c.y) + 1 >= need && !g.enemyHeroesNear(c.x, c.y, 1200, h.team).length) { this.goTo(c.x, c.y); return; }
    }
    // Prochain camp de son côté (ou du côté ennemi s'il est proche et sûr)
    const camps = g.camps.filter(c => !c.epic && c.alive.length && (c.side === h.team || (h.level >= 6 && !g.enemyHeroesNear(c.x, c.y, 900, h.team).length && D(c, h) < 1300)));
    if (camps.length) {
      camps.sort((a, b) => (D(a, h) - (a.mobs[0].includes('Buff') ? 400 : 0)) - (D(b, h) - (b.mobs[0].includes('Buff') ? 400 : 0)));
      this.goTo(camps[0].x, camps[0].y); return;
    }
    // Rien à faire : patrouille vers la voie la plus menacée
    const lanes = LANES.map(l => ({ l, e: g.heroes.filter(e => !e.dead && e.team !== h.team && e.vis[h.team] && MAP.nearestLane(e.x, e.y) === l).length }));
    lanes.sort((a, b) => b.e - a.e);
    const pt = MAP.pointAt(h.team, lanes[0].l, Math.max(800, (g.laneFront(h.team, lanes[0].l) || 1500) - 200), 150);
    this.goTo(pt.x, pt.y);
  }

  retreat(enemies, hpP) {
    const g = this.g, h = this.h, D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y), f = MAP.fountains[h.team];
    const close = enemies.filter(e => D(e, h) < 430);
    const pi = h.items.findIndex(s => s.id === 'potion'); if (pi >= 0 && !h.potions.length) g.useItem(h, pi);
    if (h.spells[1] === 'patch' && hpP < 0.35 && close.length && h.spellCds[1] <= 0 && Math.random() < this.d.skill + 0.2) g.useSpell(h, 1, h.x, h.y);
    const ang = Utils.angleTo(h.x, h.y, f.x, f.y), back = { x: h.x + Math.cos(ang) * 300, y: h.y + Math.sin(ang) * 300 };
    if (close.length && hpP < 0.2 && h.spellCds[0] <= 0 && Math.random() < this.d.skill) { g.useSpell(h, 0, back.x, back.y); return; }
    if (close.length && this.tryCast([1, 2], ab => ab.escape ? back : null)) return;
    if (!enemies.some(e => D(e, h) < 900) && !g.underEnemyTower(h.team, h.x, h.y) && !g.towers.some(tw => !tw.dead && tw.team !== h.team && tw.target === h)) { g.startRecall(h); return; }
    this.goTo(f.x, f.y);
  }
}
