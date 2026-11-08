// ============ IA des héros : farm, combat, repli, achats ============
class HeroBot {
  constructor(game, hero) {
    this.g = game; this.h = hero; this.d = game.diff;
    this.t = Math.random() * 0.4; this.lat = Utils.rand(-80, 80);
  }
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.d.reaction * Utils.rand(0.8, 1.25);
    this.think();
  }
  power(list) {
    let p = 0;
    for (const u of list) p += (u.hp / u.maxHp) * (u.level + 0.7 * u.items.length + (u.ranks[3] > 0 && u.cds[3] <= 0 ? 1.5 : 0));
    return p;
  }
  pickSkill() {
    const h = this.h;
    if (h.canLevel(3)) return 3;
    for (const s of h.def.skillOrder) if (h.ranks[s] === 0 && h.canLevel(s)) return s;
    for (const s of h.def.skillOrder) if (h.canLevel(s)) return s;
    return -1;
  }
  nextItem() {
    const h = this.h, owned = h.items.slice();
    for (const id of h.def.build) { const i = owned.indexOf(id); if (i >= 0) owned.splice(i, 1); else return id; }
    return null;
  }
  shop() {
    const g = this.g, h = this.h;
    for (let n = 0; n < 6; n++) { const id = this.nextItem(); if (!id || h.gold < ITEMS[id].cost || h.items.length >= 6) break; g.buy(h, id); }
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

  think() {
    const g = this.g, h = this.h;
    if (h.dead) { this.shop(); return; }
    while (h.points > 0) { const s = this.pickSkill(); if (s < 0 || !g.levelUp(h, s)) break; }
    if (g.canShop(h)) this.shop();
    if (h.dash || (h.channel && !h.channel.cancelOnMove)) return;
    const D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
    const hpP = h.hp / h.maxHp, manaP = h.mana / h.maxMana;
    const enemies = g.enemyHeroesNear(h.x, h.y, 800, h.team);
    if (h.recall) { if (enemies.some(e => D(e, h) < 650)) h.recall = null; else return; }
    if (h.channel) return;
    // Rester à la citerne tant qu'on n'est pas soigné
    if (g.inBase(h) && (hpP < 0.92 || manaP < 0.6) && !enemies.length) {
      const f = MAP.fountains[h.team];
      if (D(h, f) > 90) g.issueMove(h, f.x + this.lat * 0.4, f.y + this.lat * 0.2);
      return;
    }
    const allies = g.allyHeroesNear(h.x, h.y, 800, h.team);
    const myPow = this.power(allies), theirPow = this.power(enemies);
    const towerOnMe = g.towers.some(tw => !tw.dead && tw.team !== h.team && tw.target === h);
    // Fenêtre de poussée : l'équipe adverse est décimée
    const enemiesAlive = g.heroes.filter(e => !e.dead && e.team !== h.team).length;
    const alliesAlive = g.heroes.filter(e => !e.dead && e.team === h.team).length;
    this.push = enemiesAlive <= 1 && alliesAlive >= 2 && hpP > 0.5;
    if (hpP < 0.25 || (hpP < 0.45 && theirPow > myPow * 1.25) || (towerOnMe && (hpP < (this.push ? 0.4 : 0.75) || (!enemies.length && !this.push)))) return this.retreat(enemies, hpP);
    if (!enemies.length && !g.underEnemyTower(h.team, h.x, h.y)) {
      const next = this.nextItem();
      if (hpP < 0.45 || manaP < 0.15 || (next && h.gold >= ITEMS[next].cost + 250 && hpP < 0.8)) { g.startRecall(h); return; }
    }
    // Soins, boucliers, accélérations
    if (this.tryCast([0, 1, 2, 3], ab => ab.aiSupport ? ab.aiSupport(g, h, allies, enemies) : null)) return;
    // Combat
    let target = null;
    if (enemies.length) {
      const cands = enemies.filter(e => D(e, h) <= h.st.range + 330 && (!g.underEnemyTower(h.team, e.x, e.y) || (e.hp / e.maxHp < 0.2 && hpP > 0.6 && this.d.aggression > 0)));
      cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      const c = cands[0];
      if (c && (myPow >= theirPow * (0.9 - this.d.aggression) || c.hp / c.maxHp < 0.3)) target = c;
    }
    if (target) {
      if (this.tryCast([3, 0, 2, 1], ab => ab.ai ? ab.ai(g, h, target, { enemies, allies }) : null)) return;
      g.issueAttack(h, target); return;
    }
    // Farm : achever les sbires
    const minions = g.enemyMinionsNear(h.x, h.y, h.st.range + 320, h.team).filter(m => !g.underEnemyTower(h.team, m.x, m.y) || g.structureSafeToHit(g.enemyFrontStructure(h.team), h.team));
    if (Math.random() < this.d.lastHit) {
      const hit = h.st.ad;
      const lh = minions.filter(m => m.hp <= hit * 100 / (100 + m.st.armor) * 1.05).sort((a, b) => D(a, h) - D(b, h))[0];
      if (lh) { g.issueAttack(h, lh); return; }
    }
    // Siège
    const es = g.enemyFrontStructure(h.team);
    if (es && !enemies.length && (this.push || D(h, es) < TOWER.range + 320) && (g.structureSafeToHit(es, h.team) || this.push)) { g.issueAttack(h, es); return; }
    // Pousser la vague quand la voie est libre
    if (minions.length && !enemies.length) {
      if (manaP > 0.65 && Math.random() < this.d.skill * 0.5 && this.tryCast([0, 1, 2], ab => ab.aiFarm ? ab.aiFarm(g, h, minions) : null)) return;
      const low = minions.reduce((a, b) => (a.hp < b.hp ? a : b));
      g.issueAttack(h, low); return;
    }
    // Harcèlement à distance
    if (enemies.length && manaP > 0.55 && Math.random() < this.d.skill * 0.6) {
      const e = enemies.sort((a, b) => D(a, h) - D(b, h))[0];
      if (!g.underEnemyTower(h.team, e.x, e.y) && this.tryCast([0, 1], ab => ab.ai && !ab.escape && ab.aim !== 'self' ? ab.ai(g, h, e, { enemies, allies }) : null)) return;
    }
    this.position(enemies);
  }

  position(enemies) {
    const g = this.g, h = this.h;
    let front = g.frontProgress(h.team);
    if (front === null) front = g.outerStructureProgress(h.team) + 60;
    let p = front - (h.def.ranged ? 160 : 60);
    const es = g.enemyFrontStructure(h.team);
    if (es && es.kind === 'tower') {
      const ep = MAP.progress(h.team, es.x, es.y);
      if (!this.push) p = Math.min(p, ep - (g.structureSafeToHit(es, h.team) ? 140 : TOWER.range + 60));
    }
    if (enemies.length) p -= 70;
    p = Math.max(p, 260);
    const pt = MAP.pointAt(h.team, p, this.lat);
    if (Utils.dist(h.x, h.y, pt.x, pt.y) > 50) g.issueMove(h, pt.x, pt.y);
    else if (h.order && h.order.type === 'move') h.order = null;
  }

  retreat(enemies, hpP) {
    const g = this.g, h = this.h, D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
    const close = enemies.filter(e => D(e, h) < 430);
    const f = MAP.fountains[h.team];
    if (hpP < 0.35 && close.length && h.spellCds[1] <= 0 && Math.random() < this.d.skill + 0.2) g.useSpell(h, 1, h.x, h.y);
    const back = MAP.pointAt(h.team, Math.max(0, MAP.progress(h.team, h.x, h.y) - 400), this.lat * 0.4);
    if (close.length && hpP < 0.2 && h.spellCds[0] <= 0 && Math.random() < this.d.skill) { g.useSpell(h, 0, back.x, back.y); return; }
    if (close.length && this.tryCast([1, 2], ab => ab.escape ? { x: back.x, y: back.y } : null)) return;
    if (!enemies.some(e => D(e, h) < 900) && !g.underEnemyTower(h.team, h.x, h.y) && !g.towers.some(tw => !tw.dead && tw.team !== h.team && tw.target === h)) { g.startRecall(h); return; }
    if (D(h, f) > 60) g.issueMove(h, back.x, back.y);
  }
}
