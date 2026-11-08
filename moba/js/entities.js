// ============ Entités ============
let NEXT_ID = 1;
class Unit {
  constructor(kind, team, x, y, radius) {
    this.id = NEXT_ID++; this.kind = kind; this.team = team;
    this.x = x; this.y = y; this.px = x; this.py = y; this.vx = 0; this.vy = 0;
    this.radius = radius; this.hp = 1; this.maxHp = 1; this.dead = false;
    this.angle = team === 0 ? -Math.PI / 4 : Math.PI * 0.75;
    this.st = { armor: 0, resist: 0 };
    this.status = { stun: 0, root: 0, slows: [], hastes: [], shields: [], taunt: null, burn: null, bleed: null };
    this.moving = false; this.walk = Math.random() * 6; this.lastHit = -99; this.attackAnim = -99; this.castAnim = -99;
    this.vis = [team === 0, team === 1];
  }
  stunned(t) { return this.status.stun > t; }
  rooted(t) { return this.status.root > t || this.status.stun > t; }
  taunted(t) { return this.status.taunt && this.status.taunt.until > t && !this.status.taunt.src.dead ? this.status.taunt.src : null; }
  msMult(t) {
    const s = this.status; let slow = 0, haste = 0;
    if (s.slows.length) { s.slows = s.slows.filter(x => x.until > t); for (const x of s.slows) slow = Math.max(slow, x.pct); }
    if (s.hastes.length) { s.hastes = s.hastes.filter(x => x.until > t); for (const x of s.hastes) haste += x.pct; }
    return (1 - slow) * (1 + haste);
  }
  shieldAmt(t) { const s = this.status; if (s.shields.length) s.shields = s.shields.filter(x => x.until > t && x.amt > 0.5); let n = 0; for (const x of s.shields) n += x.amt; return n; }
}

class Hero extends Unit {
  constructor(heroId, team, game, opts = {}) {
    const def = HEROES[heroId], f = MAP.fountains[team];
    super('hero', team, f.x, f.y, def.radius);
    this.heroId = heroId; this.def = def; this.game = game;
    this.isPlayer = !!opts.player; this.name = def.name; this.role = opts.role || def.roles[0];
    this.level = 1; this.xp = 0; this.points = 1;
    this.ranks = [0, 0, 0, 0]; this.cds = [0, 0, 0, 0];
    this.spells = this.role === 'jungle' ? ['flash', 'smite'] : ['flash', 'patch']; this.spellCds = [0, 0];
    this.items = []; this.gold = CONFIG.START_GOLD;
    this.k = 0; this.d = 0; this.a = 0; this.cs = 0; this.dmgDealt = 0; this.streak = 0; this.multi = { n: 0, t: -99 };
    this.attackCd = 0; this.order = null; this.path = null; this.dash = null; this.channel = null; this.recall = null; this.empower = null;
    this.respawnAt = 0; this.damagedBy = new Map(); this.traps = []; this.lastCombat = -99;
    this.buffs = []; this.potions = []; this.scale = 1;
    this.recompute(); this.hp = this.maxHp; this.mana = this.maxMana;
  }
  itemStats() {
    const it = { hp: 0, mana: 0, ad: 0, ap: 0, armor: 0, resist: 0, as: 0, ms: 0, lifesteal: 0, cdr: 0, hpRegen: 0, manaRegen: 0, healPower: 0, crit: 0, thorns: 0 };
    for (const slot of this.items) { const s = ITEMS[slot.id].stats; for (const k in s) it[k] += s[k]; }
    for (const b of this.buffs) if (b.stats) for (const k in b.stats) it[k] = (it[k] || 0) + b.stats[k];
    return it;
  }
  recompute() {
    const b = this.def.base, g = this.def.growth, L = this.level - 1, it = this.itemStats();
    const oldMax = this.maxHp > 1 ? this.maxHp : 0, oldMana = this.maxMana || 0;
    this.maxHp = b.hp + g.hp * L + it.hp; this.maxMana = b.mana + g.mana * L + it.mana;
    this.st = {
      ad: b.ad + g.ad * L + it.ad, ap: it.ap, armor: b.armor + g.armor * L + it.armor, resist: b.resist + g.resist * L + it.resist,
      as: Math.min(2.5, b.as * (1 + g.as * L + it.as)), ms: b.ms + it.ms, range: b.range, lifesteal: it.lifesteal, cdr: Math.min(0.4, it.cdr),
      hpRegen: b.hpRegen + g.hpRegen * L + it.hpRegen, manaRegen: b.manaRegen + g.manaRegen * L + it.manaRegen, healPower: it.healPower,
      crit: Math.min(1, it.crit), critMult: this.items.some(s => s.id === 'railgun') ? 2.25 : 1.75, thorns: it.thorns,
    };
    if (oldMax) {
      this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
      this.mana = Math.min(this.maxMana, this.mana + Math.max(0, this.maxMana - oldMana));
    }
  }
  hasBuff(id) { return this.buffs.some(b => b.id === id); }
  rankCap(slot) { if (slot === 3) return this.level >= 16 ? 3 : this.level >= 11 ? 2 : this.level >= 6 ? 1 : 0; return Math.min(5, Math.ceil(this.level / 2)); }
  canLevel(slot) { return this.points > 0 && this.ranks[slot] < Math.min(this.rankCap(slot), ABILITIES[this.def.abilities[slot]].cost.length); }
}

class Minion extends Unit {
  constructor(type, team, lane, x, y, game) {
    const d = MINIONS[type];
    super('minion', team, x, y, d.radius);
    const m = game.time / 60;
    this.type = type; this.def = d; this.lane = lane;
    this.maxHp = this.hp = d.hp + (type === 'siege' ? 40 : type === 'super' ? 60 : 14) * m;
    this.ad = d.ad + 0.9 * m;
    this.st = { armor: d.armor, resist: d.resist };
    this.attackCd = 0.3; this.target = null; this.retarget = 0;
    this.lat = Utils.rand(-60, 60); this.aggro = null; this.aggroUntil = 0;
  }
  get ms() { return this.def.ms; }
}

class Monster extends Unit {
  constructor(type, camp, x, y) {
    const d = MONSTERS[type];
    super('monster', 2, x, y, d.radius);
    this.type = type; this.def = d; this.camp = camp;
    this.home = { x, y }; this.maxHp = this.hp = d.hp; this.ad = d.ad;
    this.st = { armor: d.armor, resist: d.resist };
    this.attackCd = 0; this.target = null; this.resetting = false; this.angle = Math.random() * 6;
    this.vis = [false, false];
  }
  get ms() { return 175; }
}

class Structure extends Unit {
  constructor(kind, team, x, y, o) {
    super(kind, team, x, y, o.radius);
    this.maxHp = this.hp = o.hp; this.lane = o.lane || null; this.tier = o.tier !== undefined ? o.tier : null;
    this.attackCd = 0; this.target = null; this.ramp = 0; this.aggro = null; this.aggroUntil = 0;
    this.turretAngle = team === 0 ? -Math.PI / 4 : Math.PI * 0.75;
    this.vis = [true, true]; this.respawnAt = 0;
    this.st = { armor: kind === 'tower' ? 40 : 20, resist: kind === 'tower' ? 40 : 20 };
  }
}

class Projectile { constructor(o) { Object.assign(this, o); this.dead = false; this.age = 0; } }
class Zone { constructor(o) { this.t = 0; this.armed = false; this.tickT = 0; this.dead = false; Object.assign(this, o); } }
class Effect { constructor(type, props) { this.type = type; this.t = 0; this.dur = 0.5; Object.assign(this, props); this.dead = false; } }
