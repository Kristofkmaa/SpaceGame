// ============ Entités : héros, sbires, tourelles, réacteurs, projectiles, zones, effets ============
let NEXT_ID = 1;

class Unit {
  constructor(kind, team, x, y, radius) {
    this.id = NEXT_ID++; this.kind = kind; this.team = team;
    this.x = x; this.y = y; this.px = x; this.py = y; this.vx = 0; this.vy = 0;
    this.radius = radius; this.hp = 1; this.maxHp = 1; this.dead = false;
    this.angle = team === 0 ? -0.2 : Math.PI - 0.2;
    this.st = { armor: 0, resist: 0 };
    this.status = { stun: 0, root: 0, slows: [], hastes: [], shields: [] };
    this.moving = false; this.walk = Math.random() * 6; this.lastHit = -99; this.attackAnim = -99;
  }
  stunned(t) { return this.status.stun > t; }
  rooted(t) { return this.status.root > t || this.status.stun > t; }
  msMult(t) {
    const s = this.status; let slow = 0, haste = 0;
    if (s.slows.length) { s.slows = s.slows.filter(x => x.until > t); for (const x of s.slows) slow = Math.max(slow, x.pct); }
    if (s.hastes.length) { s.hastes = s.hastes.filter(x => x.until > t); for (const x of s.hastes) haste += x.pct; }
    return (1 - slow) * (1 + haste);
  }
  shieldAmt(t) {
    const s = this.status;
    if (s.shields.length) s.shields = s.shields.filter(x => x.until > t && x.amt > 0.5);
    let n = 0; for (const x of s.shields) n += x.amt; return n;
  }
}

class Hero extends Unit {
  constructor(heroId, team, game, opts = {}) {
    const def = HEROES[heroId], f = MAP.fountains[team];
    super('hero', team, f.x, f.y, def.radius);
    this.heroId = heroId; this.def = def; this.game = game;
    this.isPlayer = !!opts.player; this.name = def.name;
    this.level = 1; this.xp = 0; this.points = 1;
    this.ranks = [0, 0, 0, 0]; this.cds = [0, 0, 0, 0]; this.spells = ['flash', 'patch']; this.spellCds = [0, 0];
    this.items = []; this.gold = CONFIG.START_GOLD;
    this.k = 0; this.d = 0; this.a = 0; this.cs = 0; this.dmgDealt = 0; this.streak = 0; this.multi = { n: 0, t: -99 };
    this.attackCd = 0; this.castAnim = -99;
    this.order = null; this.dash = null; this.channel = null; this.recall = null; this.empower = null;
    this.respawnAt = 0; this.damagedBy = new Map(); this.traps = []; this.lastCombat = -99;
    this.recompute(); this.hp = this.maxHp; this.mana = this.maxMana;
  }
  recompute() {
    const b = this.def.base, g = this.def.growth, L = this.level - 1;
    const it = { hp: 0, mana: 0, ad: 0, ap: 0, armor: 0, resist: 0, as: 0, ms: 0, lifesteal: 0, cdr: 0, hpRegen: 0, manaRegen: 0, healPower: 0 };
    for (const id of this.items) { const s = ITEMS[id].stats; for (const k in s) it[k] += s[k]; }
    const oldMax = this.maxHp > 1 ? this.maxHp : 0, oldMana = this.maxMana || 0;
    this.maxHp = b.hp + g.hp * L + it.hp;
    this.maxMana = b.mana + g.mana * L + it.mana;
    this.st = {
      ad: b.ad + g.ad * L + it.ad, ap: it.ap, armor: b.armor + g.armor * L + it.armor, resist: b.resist + g.resist * L + it.resist,
      as: Math.min(2.5, b.as * (1 + g.as * L + it.as)), ms: b.ms + it.ms, range: b.range, lifesteal: it.lifesteal, cdr: Math.min(0.35, it.cdr),
      hpRegen: b.hpRegen + g.hpRegen * L + it.hpRegen, manaRegen: b.manaRegen + g.manaRegen * L + it.manaRegen, healPower: it.healPower,
    };
    if (oldMax) {
      this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
      this.mana = Math.min(this.maxMana, this.mana + Math.max(0, this.maxMana - oldMana));
    }
  }
  rankCap(slot) {
    if (slot === 3) return this.level >= 12 ? 3 : this.level >= 9 ? 2 : this.level >= 6 ? 1 : 0;
    return Math.min(4, Math.ceil(this.level / 2));
  }
  canLevel(slot) { return this.points > 0 && this.ranks[slot] < this.rankCap(slot); }
}

class Minion extends Unit {
  constructor(type, team, x, y, game) {
    const d = MINIONS[type];
    super('minion', team, x, y, d.radius);
    const m = game.time / 60;
    this.type = type; this.def = d;
    this.maxHp = this.hp = d.hp + (type === 'siege' ? 40 : 14) * m;
    this.ad = d.ad + 0.9 * m;
    this.st = { armor: d.armor, resist: 0 };
    this.attackCd = 0.3; this.target = null; this.retarget = 0;
    this.lat = Utils.rand(-70, 70); this.aggro = null; this.aggroUntil = 0;
  }
  get ms() { return this.def.ms; }
}

class Tower extends Unit {
  constructor(team, tier, x, y) {
    super('tower', team, x, y, TOWER.radius);
    this.tier = tier; this.maxHp = this.hp = TOWER.hp;
    this.attackCd = 0; this.target = null; this.ramp = 0; this.aggro = null; this.aggroUntil = 0;
    this.turretAngle = team === 0 ? -0.2 : Math.PI - 0.2;
  }
}

class Core extends Unit {
  constructor(team, x, y) { super('core', team, x, y, CORE.radius); this.maxHp = this.hp = CORE.hp; }
}

class Projectile { constructor(o) { Object.assign(this, o); this.dead = false; this.trail = []; } }
class Zone { constructor(o) { this.t = 0; this.armed = false; this.tickT = 0; this.dead = false; Object.assign(this, o); } }
class Effect { constructor(type, props) { this.type = type; this.t = 0; this.dur = 0.5; Object.assign(this, props); this.dead = false; } }
