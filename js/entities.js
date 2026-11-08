// Entités du jeu : astéroïdes, unités, structures, projectiles, effets
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
  }
  takeDamage(amount, game, attacker) {
    if (this.dead) return;
    this.hp -= amount;
    this.lastHitTime = game.time;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; game.onDeath(this, attacker); }
  }
}

class Asteroid extends Entity {
  constructor(x, y, minerals) {
    super(x, y, FACTION.NEUTRAL);
    this.kind = 'asteroid';
    this.minerals = minerals;
    this.maxMinerals = minerals;
    this.radius = 12 + Math.sqrt(minerals) * 0.55;
    this.rotation = Utils.rand(0, Math.PI * 2);
    this.spin = Utils.rand(-0.15, 0.15);
    // Forme polygonale irrégulière
    const n = Utils.randInt(7, 11);
    this.shape = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.shape.push({ a, r: Utils.rand(0.72, 1.0) });
    }
  }
}

class Unit extends Entity {
  constructor(type, x, y, faction) {
    super(x, y, faction);
    this.kind = 'unit';
    this.type = type;
    this.def = UNIT_TYPES[type];
    this.hp = this.maxHp = this.def.hp;
    this.radius = this.def.radius;
    this.angle = Utils.rand(0, Math.PI * 2);
    this.order = null;        // { type, x, y, target, resume }
    this.cooldown = 0;
    this.cargo = 0;
    this.lastAsteroid = null;
    this.moving = false;
    this.group = null;
  }
  get isCombat() { return this.def.damage > 0; }
}

class Structure extends Entity {
  constructor(type, x, y, faction, built = true) {
    super(x, y, faction);
    this.kind = 'structure';
    this.type = type;
    this.def = STRUCTURE_TYPES[type];
    this.maxHp = this.def.hp;
    this.radius = this.def.radius;
    this.building = !built;
    this.buildProgress = built ? 1 : 0;
    this.hp = built ? this.maxHp : this.maxHp * 0.1;
    this.queue = [];          // { type, progress }
    this.cooldown = 0;
    this.rotation = 0;
    this.turretAngle = 0;
    this.rally = null;
    this.target = null;
  }
}

class Projectile {
  constructor(opts) {
    this.x = opts.x; this.y = opts.y;
    this.kind = opts.kind;        // 'missile' | 'plasma'
    this.target = opts.target;
    this.damage = opts.damage;
    this.faction = opts.faction;
    this.owner = opts.owner;
    this.speed = opts.speed;
    this.turn = opts.turn;        // capacité de guidage (rad/s)
    this.angle = opts.angle;
    this.life = opts.life;
    this.dead = false;
    this.trail = [];
  }
}

class Effect {
  constructor(type, props) {
    this.type = type;
    this.t = 0;
    this.dur = props.dur || 0.5;
    Object.assign(this, props);
    this.dead = false;
  }
}
