// ============ Entités ============
let NEXT_ID = 1;

class Entity {
  constructor(x, y, faction) {
    this.id = NEXT_ID++;
    this.x = x; this.y = y;
    this.faction = faction;
    this.dead = false;
    this.hp = 1; this.maxHp = 1;
    this.radius = 10;
    this.kind = 'entity';
    this.seen = faction === FACTION.PLAYER;   // visible pour le joueur ?
    this.lastHitTime = -99;
    this.spawnTime = 0;
  }
  takeDamage(amount, game, attacker) {
    if (this.dead) return;
    this.hp -= amount;
    this.lastHitTime = game.time;
    this.lastAttacker = attacker;
    if (this.onHit) this.onHit(game, attacker);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; game.onDeath(this, attacker); }
  }
}

class Asteroid extends Entity {
  constructor(x, y, minerals) {
    super(x, y, FACTION.NEUTRAL);
    this.kind = 'asteroid';
    this.seen = true;
    this.minerals = minerals;
    this.maxMinerals = minerals;
    this.radius = 11 + Math.sqrt(minerals) * 0.5;
    this.rotation = Utils.rand(0, Math.PI * 2);
    this.spin = Utils.rand(-0.12, 0.12);
    const n = Utils.randInt(7, 11);
    this.shape = [];
    for (let i = 0; i < n; i++) this.shape.push({ a: (i / n) * Math.PI * 2, r: Utils.rand(0.7, 1.0) });
  }
}

class Unit extends Entity {
  constructor(type, x, y, faction, game) {
    super(x, y, faction);
    this.kind = 'unit';
    this.type = type;
    this.def = UNIT_TYPES[type];
    this.game = game;
    this.radius = this.def.radius;
    this.maxHp = this.def.hp * game.mult(faction, 'armor');
    this.hp = this.maxHp;
    this.angle = Utils.rand(0, Math.PI * 2);
    this.order = null;
    this.cooldown = Utils.rand(0, 0.3);
    this.cargo = 0;
    this.lastAsteroid = null;
    this.moving = false;
    this.mining = false;
    this.group = null;
    this.stance = this.def.stance;
    this.turretAngle = 0;
    this.spawnTime = game.time;
  }
  get isCombat() { return this.def.damage > 0; }
  get speed() { return this.def.speed * this.game.mult(this.faction, 'engines'); }
  get damage() { return this.def.damage * this.game.mult(this.faction, 'weapons'); }
  get sensor() { return this.def.sensor * this.game.mult(this.faction, 'sensors') * this.game.sensorFactor(); }
  get capacity() { return this.def.capacity * this.game.mult(this.faction, 'mining'); }
  get mineRate() { return this.def.mineRate * this.game.mult(this.faction, 'mining'); }
  get range() { return this.def.range; }
  onHit(game, attacker) {
    // Tactique évasive : repli vers un bâtiment allié
    if (this.stance === 'evasive' && attacker && !(this.order && (this.order.type === 'flee' || this.order.type === 'attack' && this.order.explicit))) {
      this.order = { type: 'flee', resume: this.order, since: game.time };
    }
  }
}

class Structure extends Entity {
  constructor(type, x, y, faction, game, built = true) {
    super(x, y, faction);
    this.kind = 'structure';
    this.type = type;
    this.def = STRUCTURE_TYPES[type];
    this.game = game;
    this.maxHp = this.def.hp * game.mult(faction, 'armor');
    this.radius = this.def.radius;
    this.building = !built;
    this.buildProgress = built ? 1 : 0;
    this.hp = built ? this.maxHp : this.maxHp * 0.1;
    this.queue = [];
    this.research = null;      // { id, progress }
    this.cooldown = 0;
    this.rotation = 0;
    this.angle = Utils.angleTo(x, y, game.W / 2, game.H / 2);
    this.turretAngle = this.angle;
    this.rally = null;
    this.target = null;
    this.spawnTime = game.time;
  }
  get damage() { return (this.def.damage || 0) * this.game.mult(this.faction, 'weapons'); }
  get sensor() { return this.def.sensor * this.game.mult(this.faction, 'sensors') * this.game.sensorFactor(); }
  get range() { return this.def.range || 0; }
}

class Projectile {
  constructor(o) {
    Object.assign(this, o);
    this.dead = false;
    this.trail = [];
  }
}

class Effect {
  constructor(type, props) {
    this.type = type;
    this.t = 0;
    this.dur = 0.5;
    Object.assign(this, props);
    this.dead = false;
  }
}
