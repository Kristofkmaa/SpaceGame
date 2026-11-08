// ============ Génération du terrain : décharges, autoroute abandonnée, ruines, cratères ============
const World = {
  generate(game) {
    const W = game.W, H = game.H, margin = 560;
    const rnd = Utils.seeded(Math.floor(Math.random() * 1e9));
    game.terrain = { craters: [], roads: [], ruins: [], scrub: [] };

    const pBase = new Structure('mothership', margin, H - margin, FACTION.PLAYER, game);
    const eBase = new Structure('mothership', W - margin, margin, FACTION.ENEMY, game);
    game.structures.push(pBase, eBase);

    // Autoroute abandonnée : diagonale ondulée reliant les deux bases
    const road = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      road.push({ x: pBase.x + (eBase.x - pBase.x) * t + Math.sin(t * Math.PI * 3) * W * 0.07, y: pBase.y + (eBase.y - pBase.y) * t + Math.cos(t * Math.PI * 2) * H * 0.08 });
    }
    game.terrain.roads.push(road);
    // Route secondaire transversale
    const road2 = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; road2.push({ x: W * 0.12 + (W * 0.76) * t, y: H * 0.78 - (H * 0.56) * t * 0 + Math.sin(t * Math.PI) * -H * 0.5 + H * 0.0 }); }
    game.terrain.roads.push(road2.map(p => ({ x: p.x, y: Utils.clamp(p.y, 200, H - 200) })));

    // Décharges proches des bases
    World.addField(game, margin + 420, H - margin + 60, 7, 1.0, 150);
    World.addField(game, margin - 60, H - margin - 440, 7, 1.0, 150);
    World.addField(game, W - margin - 420, margin - 60, 7, 1.0, 150);
    World.addField(game, W - margin + 60, margin + 440, 7, 1.0, 150);

    // Convoi abandonné le long de l'autoroute (épaves riches)
    for (let i = 2; i <= 12; i++) {
      if (i === 7) continue;
      const p = road[i];
      World.addField(game, p.x + Utils.rand(-90, 90), p.y + Utils.rand(-90, 90), Utils.randInt(2, 4), 1.3, 110);
    }
    // Villes en ruines sur les flancs (riches) et au centre
    for (const [cx, cy, n] of [[W * 0.22, H * 0.22, 9], [W * 0.78, H * 0.78, 9], [W / 2, H / 2, 12]]) {
      World.addRuins(game, cx, cy, n === 12 ? 7 : 5, 260, rnd);
      World.addField(game, cx, cy, n, n === 12 ? 2.2 : 1.8, 200);
    }
    // Cratères et broussailles
    for (let i = 0; i < 26; i++) {
      const x = W * (0.06 + rnd() * 0.88), y = H * (0.06 + rnd() * 0.88);
      if (Utils.dist(x, y, pBase.x, pBase.y) < 500 || Utils.dist(x, y, eBase.x, eBase.y) < 500) continue;
      game.terrain.craters.push({ x, y, r: 30 + rnd() * 70, rot: rnd() * Math.PI });
    }
    for (let i = 0; i < 90; i++) game.terrain.scrub.push({ x: W * rnd(), y: H * rnd(), r: 8 + rnd() * 14, seed: rnd() });

    // Nuages de poussière dérivants (visuels)
    for (let i = 0; i < 5; i++) {
      const x = W * (0.15 + rnd() * 0.7), y = H * (0.15 + rnd() * 0.7);
      game.dust.push({ x, y, rx: 420 + rnd() * 500, ry: 260 + rnd() * 300, rot: rnd() * Math.PI, vx: 6 + rnd() * 8, vy: 2 + rnd() * 4, hue: [[190, 160, 110], [170, 140, 100], [205, 175, 120]][i % 3] });
    }

    // Récupérateurs de départ
    for (const base of [pBase, eBase]) {
      for (let i = 0; i < CONFIG.START_COLLECTORS; i++) {
        const ang = base.angle + (i - 1) * 0.5;
        const u = game.spawnUnit('collector', base.x + Math.cos(ang) * (base.radius + 40), base.y + Math.sin(ang) * (base.radius + 40), base.faction);
        u.angle = ang;
        const a = game.nearestAsteroid(u.x, u.y, 1600);
        if (a) u.order = { type: 'mine', target: a };
      }
    }
    game.effects.push(new Effect('arrival', { x: pBase.x, y: pBase.y, r: pBase.radius, dur: 3.0 }));
    game.effects.push(new Effect('arrival', { x: eBase.x, y: eBase.y, r: eBase.radius, dur: 3.0 }));
  },

  addRuins(game, cx, cy, n, spread, rnd) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spread;
      game.terrain.ruins.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, w: 60 + rnd() * 90, h: 50 + rnd() * 70, rot: rnd() * 0.6 - 0.3, seed: rnd() });
    }
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

  // Texture de sol répétée (tuile), dessinée une seule fois
  makeGroundTile(size = 512, seed = 3) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), rnd = Utils.seeded(seed);
    ctx.fillStyle = '#7b6648'; ctx.fillRect(0, 0, size, size);
    // Taches de terre plus claires / plus sombres, répétables (dessinées avec recouvrement des bords)
    const blob = (x, y, r, col) => { for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } };
    for (let i = 0; i < 40; i++) blob(rnd() * size, rnd() * size, 60 + rnd() * 140, rnd() > 0.5 ? 'rgba(150,126,90,0.35)' : 'rgba(90,72,50,0.35)');
    for (let i = 0; i < 14; i++) blob(rnd() * size, rnd() * size, 30 + rnd() * 60, 'rgba(120,80,50,0.25)');
    // Cailloux
    for (let i = 0; i < 700; i++) { ctx.fillStyle = rnd() > 0.5 ? 'rgba(60,48,34,0.35)' : 'rgba(180,160,120,0.25)'; const s = 1 + rnd() * 2.2; ctx.fillRect(rnd() * size, rnd() * size, s, s); }
    // Craquelures
    ctx.strokeStyle = 'rgba(50,38,26,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      let x = rnd() * size, y = rnd() * size; ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 70; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    return c;
  },

  makeStars(count, seed, tile) {
    const rnd = Utils.seeded(seed), out = [];
    for (let i = 0; i < count; i++) out.push({ x: rnd() * tile, y: rnd() * tile, s: 1 + rnd() * 2, b: 0.2 + rnd() * 0.5, tw: rnd() * Math.PI * 2 });
    return out;
  },
};
