// Génération de la carte et du fond étoilé
const World = {
  generate(game) {
    const W = CONFIG.WORLD_W, H = CONFIG.WORLD_H;

    // Stations de départ (coins opposés)
    const pBase = new Structure('station', 560, H - 560, FACTION.PLAYER);
    const eBase = new Structure('station', W - 560, 560, FACTION.ENEMY);
    game.structures.push(pBase, eBase);

    // Champs d'astéroïdes : définis pour le joueur puis reflétés pour l'ennemi
    const fields = [
      { x: 900, y: H - 420, n: 6, rich: 1.0 },
      { x: 420, y: H - 980, n: 6, rich: 1.0 },
      { x: 1500, y: H - 1050, n: 7, rich: 1.3 },
      { x: 800, y: 800, n: 8, rich: 1.6 },
      { x: 1700, y: H - 350, n: 7, rich: 1.4 },
    ];
    for (const f of fields) {
      World.addField(game, f.x, f.y, f.n, f.rich);
      World.addField(game, W - f.x, H - f.y, f.n, f.rich);
    }
    // Champ central riche
    World.addField(game, W / 2, H / 2, 11, 2.0, 170);

    // Collecteurs de départ
    for (const base of [pBase, eBase]) {
      for (let i = 0; i < CONFIG.START_HARVESTERS; i++) {
        const ang = (i / CONFIG.START_HARVESTERS) * Math.PI * 2;
        const u = game.spawnUnit('harvester', base.x + Math.cos(ang) * 70, base.y + Math.sin(ang) * 70, base.faction);
        const a = game.nearestAsteroid(u.x, u.y, 1500);
        if (a) u.order = { type: 'mine', target: a };
      }
    }
  },

  addField(game, cx, cy, n, rich, spread = 130) {
    for (let i = 0; i < n; i++) {
      let placed = false;
      for (let t = 0; t < 30 && !placed; t++) {
        const ang = Utils.rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * spread;
        const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d;
        const minerals = Math.round(Utils.rand(350, 800) * rich);
        const a = new Asteroid(x, y, minerals);
        if (x < a.radius + 20 || y < a.radius + 20 || x > CONFIG.WORLD_W - a.radius - 20 || y > CONFIG.WORLD_H - a.radius - 20) continue;
        let ok = true;
        for (const o of game.asteroids) if (Utils.dist(o.x, o.y, x, y) < o.radius + a.radius + 10) { ok = false; break; }
        for (const s of game.structures) if (Utils.dist(s.x, s.y, x, y) < s.radius + a.radius + 60) { ok = false; break; }
        if (ok) { game.asteroids.push(a); placed = true; }
      }
    }
  },

  // Étoiles du fond (coordonnées dans une tuile carrée répétée)
  makeStars(count, seed, tile) {
    const rnd = Utils.seeded(seed);
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({ x: rnd() * tile, y: rnd() * tile, s: 0.4 + rnd() * 1.4, b: 0.3 + rnd() * 0.7, tw: rnd() * Math.PI * 2 });
    }
    return stars;
  },
};
