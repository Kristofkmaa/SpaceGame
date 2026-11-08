// ============ Génération de la carte ============
const World = {
  generate(game) {
    const W = game.W, H = game.H;
    const margin = 560;
    const pBase = new Structure('mothership', margin, H - margin, FACTION.PLAYER, game);
    const eBase = new Structure('mothership', W - margin, margin, FACTION.ENEMY, game);
    game.structures.push(pBase, eBase);

    // Champs proches des bases
    World.addField(game, margin + 420, H - margin + 60, 7, 1.0, 150);
    World.addField(game, margin - 60, H - margin - 440, 7, 1.0, 150);
    World.addField(game, W - margin - 420, margin - 60, 7, 1.0, 150);
    World.addField(game, W - margin + 60, margin + 440, 7, 1.0, 150);

    // Ceinture d'astéroïdes sinueuse à travers la carte (symétrie centrale)
    const steps = Math.floor(W / 95);
    for (let i = 0; i <= steps / 2; i++) {
      const t = i / steps;
      const x = W * (0.12 + 0.76 * t);
      const y = H / 2 + Math.sin(t * Math.PI * 2.2 + 0.4) * H * 0.2;
      if (Math.sin(t * 37.1) > -0.35) {
        const rich = 1.2 + 0.6 * Math.abs(0.5 - t) * -2 + 0.8;
        World.addField(game, x + Utils.rand(-40, 40), y + Utils.rand(-60, 60), Utils.randInt(2, 4), rich, 95);
      }
    }
    // Miroir : on reflète tous les astéroïdes générés jusqu'ici au-delà du centre
    const half = game.asteroids.slice();
    for (const a of half) {
      if (a.x > W * 0.52 || (a.x > W * 0.48 && a.y < H / 2)) continue;
      const m = new Asteroid(W - a.x, H - a.y, a.maxMinerals);
      if (World.free(game, m)) game.asteroids.push(m);
    }
    // Gisements riches aux flancs
    World.addField(game, W * 0.22, H * 0.22, 9, 1.8, 170);
    World.addField(game, W * 0.78, H * 0.78, 9, 1.8, 170);
    // Cœur de la carte
    World.addField(game, W / 2, H / 2, 12, 2.2, 200);

    // Nuages de poussière (visuels)
    const rnd = Utils.seeded(7);
    for (let i = 0; i < 4; i++) {
      const x = W * (0.2 + rnd() * 0.6), y = H * (0.2 + rnd() * 0.6);
      const d = { x, y, rx: 500 + rnd() * 600, ry: 300 + rnd() * 400, rot: rnd() * Math.PI, hue: [[90, 50, 170], [40, 110, 170], [160, 60, 90], [60, 90, 150]][i] };
      game.dust.push(d);
      game.dust.push({ ...d, x: W - x, y: H - y, rot: -d.rot });
    }

    // Collecteurs de départ
    for (const base of [pBase, eBase]) {
      const toward = base.angle;
      for (let i = 0; i < CONFIG.START_COLLECTORS; i++) {
        const ang = toward + (i - 1) * 0.5;
        const u = game.spawnUnit('collector', base.x + Math.cos(ang) * (base.radius + 40), base.y + Math.sin(ang) * (base.radius + 40), base.faction);
        u.angle = ang;
        const a = game.nearestAsteroid(u.x, u.y, 1600);
        if (a) u.order = { type: 'mine', target: a };
      }
    }
    game.effects.push(new Effect('hyperspace', { x: pBase.x, y: pBase.y, r: pBase.radius, angle: pBase.angle, dur: 3.0 }));
    game.effects.push(new Effect('hyperspace', { x: eBase.x, y: eBase.y, r: eBase.radius, angle: eBase.angle, dur: 3.0 }));
  },

  free(game, a) {
    if (a.x < a.radius + 20 || a.y < a.radius + 20 || a.x > game.W - a.radius - 20 || a.y > game.H - a.radius - 20) return false;
    for (const o of game.asteroids) if (Utils.dist(o.x, o.y, a.x, a.y) < o.radius + a.radius + 10) return false;
    for (const s of game.structures) if (Utils.dist(s.x, s.y, a.x, a.y) < s.radius + a.radius + 90) return false;
    return true;
  },

  addField(game, cx, cy, n, rich, spread = 130) {
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 25; t++) {
        const ang = Utils.rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * spread;
        const a = new Asteroid(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, Math.round(Utils.rand(300, 750) * Math.max(0.6, rich)));
        if (World.free(game, a)) { game.asteroids.push(a); break; }
      }
    }
  },

  makeStars(count, seed, tile) {
    const rnd = Utils.seeded(seed);
    const stars = [];
    for (let i = 0; i < count; i++) stars.push({ x: rnd() * tile, y: rnd() * tile, s: 0.4 + rnd() * 1.5, b: 0.25 + rnd() * 0.75, tw: rnd() * Math.PI * 2, warm: rnd() > 0.8 });
    return stars;
  },
};
