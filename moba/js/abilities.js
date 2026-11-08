// ============ Compétences des héros et sorts communs ============
// aim : 'line' (trait), 'circle' (zone au curseur), 'self' (autour du héros), 'target' (ennemi ciblé), 'ally' (allié ciblé), 'cone'
const fmt = a => a.map(v => Math.round(v * 100) / 100).join(' / ');
const D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
const pred = (u, tm) => MAP.clamp(u.x + (u.vx || 0) * tm, u.y + (u.vy || 0) * tm, 0);

const ABILITIES = {
  // ---------------- Brise‑Roc ----------------
  ram: {
    name: 'Bélier', aim: 'line', range: 280, width: 56,
    cost: [50, 55, 60, 65], cd: [11, 10, 9, 8], dmg: [70, 110, 150, 190],
    desc() { return `Fonce vers le curseur sur ${this.range} unités et s’arrête sur le premier héros percuté. Inflige ${fmt(this.dmg)} (+60 % dégâts d’attaque) dégâts physiques et ralentit de 30 % pendant 1,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ad;
      g.startDash(h, x, y, { dist: this.range, speed: 950, fixed: true, onTouch: u => {
        g.damage(h, u, dmg, 'phys'); g.slow(u, 0.3, 1.5); g.fx('impact', { x: u.x, y: u.y, size: 28 }); g.sfx('thud', u.x, u.y);
        return u.kind === 'hero';
      } });
      g.sfx('dash', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < 270 && d > 70 && h.hp / h.maxHp > 0.35 ? { x: tg.x, y: tg.y } : null; },
  },
  plate: {
    name: 'Tôle soudée', aim: 'self', radius: 0,
    cost: [60, 60, 60, 60], cd: [15, 14, 13, 12], val: [80, 125, 170, 215],
    desc() { return `Se couvre de plaques soudées : bouclier de ${fmt(this.val)} (+8 % des PV max) pendant 3 s, et +20 % de vitesse pendant 1,5 s.`; },
    cast(g, h, r) { g.shield(h, this.val[r - 1] + 0.08 * h.maxHp, 3); g.haste(h, 0.2, 1.5); g.sfx('metal', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { return h.hp / h.maxHp < 0.8 && enemies.some(e => D(e, h) < 420) && g.time - h.lastHit < 1 ? { x: h.x, y: h.y } : null; },
  },
  quake: {
    name: 'Onde de choc', aim: 'self', radius: 180,
    cost: [70, 70, 75, 80], cd: [12, 11, 10, 9], dmg: [60, 95, 130, 165],
    desc() { return `Frappe le sol de son marteau : ${fmt(this.dmg)} (+40 % dégâts d’attaque) dégâts physiques autour de lui (rayon ${this.radius}) et étourdit 0,75 s.`; },
    cast(g, h, r) {
      const dmg = this.dmg[r - 1] + 0.4 * h.st.ad;
      g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'phys'); g.stun(u, 0.75); });
      g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.6 }); g.sfx('quake', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.radius - 10 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return ms.filter(m => D(m, h) < this.radius).length >= 3 ? { x: h.x, y: h.y } : null; },
  },
  roller: {
    name: 'Rouleau compresseur', aim: 'line', range: 560, width: 70, ult: true,
    cost: [100, 100, 100], cd: [90, 75, 60], dmg: [200, 300, 400],
    desc() { return `Après une courte préparation, charge sur ${this.range} unités. Tous les ennemis percutés subissent ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques et sont étourdis 1 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ad;
      const ang = Utils.angleTo(h.x, h.y, x, y);
      g.startChannel(h, { dur: 0.45, kind: 'windup', ang, length: this.range, width: this.width, onEnd: cancelled => {
        if (cancelled) return;
        g.startDash(h, h.x + Math.cos(ang) * 100, h.y + Math.sin(ang) * 100, { dist: this.range, speed: 1150, fixed: true, kind: 'charge', onTouch: u => {
          g.damage(h, u, dmg, 'phys'); g.stun(u, 1); g.fx('impact', { x: u.x, y: u.y, size: 40 }); g.sfx('thud', u.x, u.y); return false;
        } });
        g.sfx('engine', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 470 && (tg.hp / tg.maxHp < 0.55 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ---------------- Vipère ----------------
  buckshot: {
    name: 'Chevrotine', aim: 'line', range: 540, width: 40,
    cost: [50, 55, 60, 65], cd: [7, 6.5, 6, 5.5], dmg: [60, 100, 140, 180],
    desc() { return `Tire une gerbe de plombs qui traverse tout sur ${this.range} unités : ${fmt(this.dmg)} (+100 % dégâts d’attaque) dégâts physiques à chaque ennemi touché.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + h.st.ad;
      g.skillshot(h, x, y, { range: this.range, speed: 1500, width: this.width, pierce: true, visual: 'slug', onHit: u => g.damage(h, u, dmg, 'phys') });
      g.fx('muzzle', { x: h.x, y: h.y, angle: Utils.angleTo(h.x, h.y, x, y), size: 30, dur: 0.12 }); g.sfx('shotgun', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range - 30) return null; const p = pred(tg, d / 1500); return { x: p.x, y: p.y }; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range - 50); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  roll: {
    name: 'Roulade', aim: 'line', range: 220, width: 30, escape: true,
    cost: [40, 40, 40, 40], cd: [13, 12, 11, 10], val: [40, 65, 90, 115],
    desc() { return `Roule vers le curseur sur ${this.range} unités. La prochaine attaque dans les 3,5 s inflige ${fmt(this.val)} dégâts physiques supplémentaires.`; },
    cast(g, h, r, x, y) { g.startDash(h, x, y, { dist: this.range, speed: 1100 }); h.empower = { until: g.time + 3.5, bonus: this.val[r - 1] }; g.sfx('roll', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d > h.st.range + 40 && d < h.st.range + 200 && tg.hp / tg.maxHp < 0.35 ? { x: tg.x, y: tg.y } : null; },
  },
  trap: {
    name: 'Piège à loups', aim: 'circle', range: 420, radius: 40,
    cost: [50, 50, 50, 50], cd: [14, 13, 12, 11], dmg: [80, 120, 160, 200],
    desc() { return `Enterre un piège invisible pour l’ennemi (3 au maximum). Le premier ennemi qui marche dessus est immobilisé 1,5 s et subit ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.4 * h.st.ap;
      const z = g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 45, kind: 'trap', hidden: true, trigger: true,
        onTrigger: (u, zz) => { g.root(u, 1.5); g.damage(h, u, dmg, 'magic'); g.fx('snap', { x: zz.x, y: zz.y, dur: 0.8 }); g.sfx('trap', zz.x, zz.y); } });
      h.traps = h.traps.filter(t => !t.dead); h.traps.push(z); if (h.traps.length > 3) h.traps.shift().dead = true;
      g.sfx('dig', x, y);
    },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range) return null; const p = pred(tg, 0.6); return { x: p.x, y: p.y }; },
  },
  lead: {
    name: 'Pluie de plomb', aim: 'cone', range: 460, angle: 0.95, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [30, 45, 60],
    desc() { return `Immobile pendant 2 s, arrose un cône devant elle de 10 salves de ${fmt(this.dmg)} (+25 % dégâts d’attaque) dégâts physiques. Se déplacer interrompt la rafale.`; },
    cast(g, h, r, x, y) {
      const ang = Utils.angleTo(h.x, h.y, x, y), per = this.dmg[r - 1] + 0.25 * h.st.ad, range = this.range, half = this.angle / 2;
      g.startChannel(h, { dur: 2, every: 0.2, kind: 'cone', ang, range, half, cancelOnMove: true, onTick: () => {
        g.aoe(h.team, h.x, h.y, range, u => { if (Math.abs(Utils.normAngle(Utils.angleTo(h.x, h.y, u.x, u.y) - ang)) <= half + 0.08) g.damage(h, u, per, 'phys'); });
        g.fx('volley', { x: h.x, y: h.y, angle: ang, range, half, dur: 0.18 }); g.sfx('volley', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 420 && (tg.hp / tg.maxHp < 0.5 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ---------------- Le Doc ----------------
  syringe: {
    name: 'Seringue', aim: 'line', range: 500, width: 32,
    cost: [55, 60, 65, 70], cd: [8, 7, 6, 5], dmg: [60, 95, 130, 165], heal: [60, 90, 120, 150],
    desc() { return `Lance une seringue qui touche la première unité sur son passage. Un héros allié récupère ${fmt(this.heal)} (+30 % puissance) PV. Un ennemi subit ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie et est ralenti de 25 % pendant 1,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, heal = this.heal[r - 1] + 0.3 * h.st.ap;
      g.skillshot(h, x, y, { range: this.range, speed: 1300, width: this.width, hitAllies: true, visual: 'syringe', onHit: u => {
        if (u.team === h.team) { g.heal(h, u, heal); g.fx('healBurst', { target: u, dur: 0.9 }); g.sfx('heal', u.x, u.y); }
        else { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.25, 1.5); g.fx('splash', { x: u.x, y: u.y, color: '#8cff7a', dur: 0.4 }); }
      } });
      g.sfx('syringe', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range - 30) return null; const p = pred(tg, d / 1300); return { x: p.x, y: p.y }; },
    aiSupport(g, h, allies) { const a = allies.filter(x => x !== h && x.hp / x.maxHp < 0.65 && D(x, h) < this.range - 40).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; return a ? { x: a.x, y: a.y } : null; },
  },
  gas: {
    name: 'Gaz toxique', aim: 'circle', range: 450, radius: 140,
    cost: [70, 75, 80, 85], cd: [13, 12, 11, 10], dmg: [20, 30, 40, 50],
    desc() { return `Brise une fiole au sol : un nuage de rayon ${this.radius} reste 3 s et inflige ${fmt(this.dmg)} (+15 % puissance) dégâts d’énergie toutes les 0,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.15 * h.st.ap;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.25, dur: 3, every: 0.5, kind: 'gas', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => g.damage(h, u, dmg, 'magic')) });
      g.sfx('glass', x, y);
    },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range) return null; const p = pred(tg, 0.5); return { x: p.x, y: p.y }; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 4 ? { x: c[0].x, y: c[0].y } : null; },
  },
  adrenaline: {
    name: 'Adrénaline', aim: 'ally', range: 480,
    cost: [50, 55, 60, 65], cd: [14, 13, 12, 11], heal: [40, 60, 80, 100],
    desc() { return `Pique un héros allié (ou lui‑même) : +35 % de vitesse pendant 2,5 s et ${fmt(this.heal)} (+20 % puissance) PV rendus.`; },
    cast(g, h, r, x, y, target) {
      const u = target || h;
      g.haste(u, 0.35, 2.5); g.heal(h, u, this.heal[r - 1] + 0.2 * h.st.ap);
      g.fx('adrenaline', { target: u, dur: 2.5 }); g.sfx('heal', u.x, u.y);
    },
    aiSupport(g, h, allies, enemies) {
      const a = allies.filter(x => x.hp / x.maxHp < 0.5 && D(x, h) < this.range && enemies.length).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
      return a ? { x: a.x, y: a.y, target: a } : null;
    },
  },
  stim: {
    name: 'Stimulant de masse', aim: 'self', radius: 750, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], heal: [150, 250, 350],
    desc() { return `Injecte un cocktail à tous les héros alliés dans un rayon de ${this.radius} : ${fmt(this.heal)} (+50 % puissance) PV rendus et +30 % de vitesse pendant 2 s.`; },
    cast(g, h, r) {
      const heal = this.heal[r - 1] + 0.5 * h.st.ap;
      for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) <= this.radius) { g.heal(h, a, heal); g.haste(a, 0.3, 2); g.fx('healBurst', { target: a, dur: 1.2 }); }
      g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#8cff7a', dur: 0.8 }); g.sfx('stim', h.x, h.y);
    },
    aiSupport(g, h, allies) { return allies.some(a => a.hp / a.maxHp < 0.4 && D(a, h) < this.radius) ? { x: h.x, y: h.y } : null; },
  },

  // ---------------- Étincelle ----------------
  arc: {
    name: 'Arc électrique', aim: 'target', range: 380,
    cost: [60, 65, 70, 75], cd: [7, 6.5, 6, 5.5], dmg: [70, 105, 140, 175],
    desc() { return `Foudroie l’ennemi ciblé : ${fmt(this.dmg)} (+60 % puissance) dégâts d’énergie. L’arc rebondit sur 2 ennemis proches pour 60 % des dégâts.`; },
    cast(g, h, r, x, y, target) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ap, hit = new Set([target.id]);
      let from = h, cur = target, k = 1;
      for (let i = 0; i < 3 && cur; i++) {
        g.fx('lightning', { x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, dur: 0.25 });
        g.damage(h, cur, dmg * k, 'magic');
        from = cur; k = 0.6;
        let nx = null, nd = 230;
        for (const u of g.enemyUnits(h.team)) { if (hit.has(u.id)) continue; const d = D(u, from); if (d < nd) { nd = d; nx = u; } }
        if (nx) hit.add(nx.id); cur = nx;
      }
      g.sfx('zap', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range + tg.radius ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m && ms.length >= 3 ? { x: m.x, y: m.y, target: m } : null; },
  },
  mine: {
    name: 'Mine magnétique', aim: 'circle', range: 450, radius: 130,
    cost: [70, 75, 80, 85], cd: [11, 10.5, 10, 9.5], dmg: [80, 120, 160, 200],
    desc() { return `Lance une mine qui explose au bout de 0,9 s : ${fmt(this.dmg)} (+70 % puissance) dégâts d’énergie dans un rayon de ${this.radius} et 40 % de ralentissement pendant 1,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.7 * h.st.ap;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.9, dur: 0, kind: 'mine', instant: true, onArm: z => {
        g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.4, 1.5); });
        g.fx('emp', { x: z.x, y: z.y, r: z.r, dur: 0.5 }); g.sfx('emp', z.x, z.y);
      } });
      g.sfx('throw', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range + 40) return null; const p = pred(tg, 0.9); return { x: p.x, y: p.y }; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  overload: {
    name: 'Surcharge', aim: 'line', range: 270, width: 30, escape: true,
    cost: [80, 80, 80, 80], cd: [18, 16, 14, 12], val: [50, 75, 100, 125],
    desc() { return `Se téléporte de ${this.range} unités vers le curseur dans un éclair et gagne un bouclier de ${fmt(this.val)} (+30 % puissance) pendant 2,5 s.`; },
    cast(g, h, r, x, y) { g.blink(h, x, y, this.range); g.shield(h, this.val[r - 1] + 0.3 * h.st.ap, 2.5); },
  },
  storm: {
    name: 'Tempête électrique', aim: 'circle', range: 650, radius: 250, ult: true,
    cost: [120, 120, 120], cd: [100, 85, 70], dmg: [80, 125, 170],
    desc() { return `Déchaîne la foudre sur une zone de rayon ${this.radius} : 5 éclairs frappent en 1,5 s, chacun infligeant ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie dans un petit rayon. Les éclairs visent en priorité les héros.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.4 * h.st.ap;
      let n = 0;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.5, dur: 1.85, every: 0.3, kind: 'storm', onTick: z => {
        if (n++ >= 5) return;
        const heroes = g.heroes.filter(e => !e.dead && e.team !== h.team && D(e, z) <= z.r);
        let px, py;
        if (heroes.length && Math.random() < 0.7) { const e = Utils.pick(heroes); px = e.x + Utils.rand(-25, 25); py = e.y + Utils.rand(-25, 25); }
        else { const a = Utils.rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * z.r; px = z.x + Math.cos(a) * d; py = z.y + Math.sin(a) * d; }
        g.aoe(h.team, px, py, 90, u => g.damage(h, u, dmg, 'magic'));
        g.fx('strike', { x: px, y: py, dur: 0.45 }); g.sfx('thunder', px, py);
      } });
      g.sfx('charge', x, y);
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 600 && (tg.hp / tg.maxHp < 0.6 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },
};

const SPELLS = {
  flash: { name: 'Saut', cd: 120, desc: 'Se téléporte instantanément de 220 unités vers le curseur. Idéal pour fuir ou pour surprendre.', cast(g, h, x, y) { g.blink(h, x, y, 220); } },
  patch: { name: 'Rustine', cd: 90, desc: 'Rend 90 (+18 par niveau) PV et accélère de 25 % pendant 1,5 s.', cast(g, h) { g.heal(h, h, 90 + 18 * h.level); g.haste(h, 0.25, 1.5); g.fx('healBurst', { target: h, dur: 1 }); g.sfx('heal', h.x, h.y); } },
};
