// ============ Compétences des héros et sorts d'invocateur ============
// aim : 'line', 'circle', 'self', 'target', 'ally', 'cone'
const fmt = a => a.map(v => Math.round(v * 100) / 100).join(' / ');
const D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
const pred = (u, tm) => ({ x: u.x + (u.vx || 0) * tm, y: u.y + (u.vy || 0) * tm });
const inCone = (h, u, ang, half, range) => D(h, u) <= range + u.radius && Math.abs(Utils.normAngle(Utils.angleTo(h.x, h.y, u.x, u.y) - ang)) <= half + 0.1;

const ABILITIES = {
  // ================= Brise‑Roc =================
  ram: {
    name: 'Bélier', aim: 'line', range: 280, width: 56,
    cost: [50, 55, 60, 65, 70], cd: [11, 10, 9, 8, 7], dmg: [70, 110, 150, 190, 230],
    desc() { return `Fonce vers le curseur sur ${this.range} unités et s’arrête sur le premier héros percuté : ${fmt(this.dmg)} (+60 % dégâts d’attaque) dégâts physiques et 30 % de ralentissement pendant 1,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ad;
      g.startDash(h, x, y, { dist: this.range, speed: 950, fixed: true, onTouch: u => { g.damage(h, u, dmg, 'phys'); g.slow(u, 0.3, 1.5); g.fx('impact', { x: u.x, y: u.y, size: 28 }); g.sfx('thud', u.x, u.y); return u.kind === 'hero'; } });
      g.sfx('dash', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < 270 && d > 70 && h.hp / h.maxHp > 0.35 ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < 250); return m && h.mana / h.maxMana > 0.5 ? { x: m.x, y: m.y } : null; },
  },
  plate: {
    name: 'Tôle soudée', aim: 'self', radius: 0,
    cost: [60, 60, 60, 60, 60], cd: [15, 14, 13, 12, 11], val: [80, 125, 170, 215, 260],
    desc() { return `Se couvre de plaques soudées : bouclier de ${fmt(this.val)} (+8 % des PV max) pendant 3 s et +20 % de vitesse pendant 1,5 s.`; },
    cast(g, h, r) { g.shield(h, this.val[r - 1] + 0.08 * h.maxHp, 3); g.haste(h, 0.2, 1.5); g.sfx('metal', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { return h.hp / h.maxHp < 0.8 && enemies.some(e => D(e, h) < 420) && g.time - h.lastHit < 1 ? { x: h.x, y: h.y } : null; },
  },
  quake: {
    name: 'Onde de choc', aim: 'self', radius: 180,
    cost: [70, 70, 75, 80, 85], cd: [12, 11, 10, 9, 8], dmg: [60, 95, 130, 165, 200],
    desc() { return `Frappe le sol : ${fmt(this.dmg)} (+40 % dégâts d’attaque) dégâts physiques autour de lui (rayon ${this.radius}) et 0,75 s d’étourdissement.`; },
    cast(g, h, r) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ad; g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'phys'); g.stun(u, 0.75); }); g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.6 }); g.sfx('quake', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.radius - 10 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return ms.filter(m => D(m, h) < this.radius).length >= 2 ? { x: h.x, y: h.y } : null; },
  },
  roller: {
    name: 'Rouleau compresseur', aim: 'line', range: 560, width: 70, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [200, 300, 400],
    desc() { return `Après une courte préparation, charge sur ${this.range} unités. Les ennemis percutés subissent ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques et sont étourdis 1 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y);
      g.startChannel(h, { dur: 0.45, kind: 'windup', ang, length: this.range, width: this.width, onEnd: c => {
        if (c) return;
        g.startDash(h, h.x + Math.cos(ang) * 100, h.y + Math.sin(ang) * 100, { dist: this.range, speed: 1150, fixed: true, kind: 'charge', onTouch: u => { g.damage(h, u, dmg, 'phys'); g.stun(u, 1); g.fx('impact', { x: u.x, y: u.y, size: 40 }); g.sfx('thud', u.x, u.y); return false; } });
        g.sfx('engine', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 470 && (tg.hp / tg.maxHp < 0.55 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Vipère =================
  buckshot: {
    name: 'Chevrotine', aim: 'line', range: 540, width: 40,
    cost: [50, 55, 60, 65, 70], cd: [7, 6.5, 6, 5.5, 5], dmg: [60, 100, 140, 180, 220],
    desc() { return `Gerbe de plombs qui traverse tout sur ${this.range} unités : ${fmt(this.dmg)} (+100 % dégâts d’attaque) dégâts physiques à chaque ennemi.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + h.st.ad; g.skillshot(h, x, y, { range: this.range, speed: 1500, width: this.width, pierce: true, visual: 'slug', onHit: u => g.damage(h, u, dmg, 'phys') }); g.fx('muzzle', { x: h.x, y: h.y, angle: Utils.angleTo(h.x, h.y, x, y), dur: 0.12 }); g.sfx('shotgun', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); if (d > this.range - 30) return null; return pred(tg, d / 1500); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range - 50); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  roll: {
    name: 'Roulade', aim: 'line', range: 220, width: 30, escape: true,
    cost: [40, 40, 40, 40, 40], cd: [13, 12, 11, 10, 9], val: [40, 65, 90, 115, 140],
    desc() { return `Roule vers le curseur sur ${this.range} unités. La prochaine attaque dans les 3,5 s inflige ${fmt(this.val)} dégâts physiques supplémentaires.`; },
    cast(g, h, r, x, y) { g.startDash(h, x, y, { dist: this.range, speed: 1100 }); h.empower = { until: g.time + 3.5, bonus: this.val[r - 1] }; g.sfx('roll', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d > h.st.range + 40 && d < h.st.range + 200 && tg.hp / tg.maxHp < 0.35 ? { x: tg.x, y: tg.y } : null; },
  },
  trap: {
    name: 'Piège à loups', aim: 'circle', range: 420, radius: 40,
    cost: [50, 50, 50, 50, 50], cd: [14, 13, 12, 11, 10], dmg: [80, 120, 160, 200, 240],
    desc() { return `Enterre un piège invisible pour l’ennemi (3 au maximum). Le premier ennemi qui marche dessus est immobilisé 1,5 s et subit ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.4 * h.st.ap;
      const z = g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 60, kind: 'trap', hidden: true, trigger: true, heroesOnly: false,
        onTrigger: (u, zz) => { g.root(u, 1.5); g.damage(h, u, dmg, 'magic'); g.fx('snap', { x: zz.x, y: zz.y, dur: 0.8 }); g.sfx('trap', zz.x, zz.y); } });
      h.traps = h.traps.filter(t => !t.dead); h.traps.push(z); if (h.traps.length > 3) h.traps.shift().dead = true;
    },
    ai(g, h, tg) { const d = D(h, tg); return d > this.range ? null : pred(tg, 0.6); },
  },
  lead: {
    name: 'Pluie de plomb', aim: 'cone', range: 460, angle: 0.95, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [30, 45, 60],
    desc() { return `Immobile pendant 2 s, arrose un cône de 10 salves de ${fmt(this.dmg)} (+25 % dégâts d’attaque) dégâts physiques. Se déplacer interrompt la rafale.`; },
    cast(g, h, r, x, y) {
      const ang = Utils.angleTo(h.x, h.y, x, y), per = this.dmg[r - 1] + 0.25 * h.st.ad, range = this.range, half = this.angle / 2;
      g.startChannel(h, { dur: 2, every: 0.2, kind: 'cone', ang, range, half, cancelOnMove: true, onTick: () => {
        g.aoe(h.team, h.x, h.y, range, u => { if (inCone(h, u, ang, half, range)) g.damage(h, u, per, 'phys'); });
        g.fx('volley', { x: h.x, y: h.y, angle: ang, range, half, dur: 0.18 }); g.sfx('volley', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 420 && (tg.hp / tg.maxHp < 0.5 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Le Doc =================
  syringe: {
    name: 'Seringue', aim: 'line', range: 500, width: 32,
    cost: [55, 60, 65, 70, 75], cd: [8, 7, 6, 5, 4.5], dmg: [60, 95, 130, 165, 200], heal: [60, 90, 120, 150, 180],
    desc() { return `Seringue qui touche la première unité : un héros allié récupère ${fmt(this.heal)} (+30 % puissance) PV, un ennemi subit ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie et 25 % de ralentissement pendant 1,5 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, heal = this.heal[r - 1] + 0.3 * h.st.ap;
      g.skillshot(h, x, y, { range: this.range, speed: 1300, width: this.width, hitAllies: true, visual: 'syringe', onHit: u => {
        if (u.team === h.team) { g.heal(h, u, heal); g.fx('healBurst', { target: u, dur: 0.9 }); g.sfx('heal', u.x, u.y); }
        else { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.25, 1.5); g.fx('splash', { x: u.x, y: u.y, color: '#8cff7a', dur: 0.4 }); }
      } });
      g.sfx('syringe', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d > this.range - 30 ? null : pred(tg, d / 1300); },
    aiSupport(g, h, allies) { const a = allies.filter(x => x !== h && x.hp / x.maxHp < 0.65 && D(x, h) < this.range - 40).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; return a ? { x: a.x, y: a.y } : null; },
  },
  gas: {
    name: 'Gaz toxique', aim: 'circle', range: 450, radius: 140,
    cost: [70, 75, 80, 85, 90], cd: [13, 12, 11, 10, 9], dmg: [20, 30, 40, 50, 60],
    desc() { return `Nuage de rayon ${this.radius} pendant 3 s : ${fmt(this.dmg)} (+15 % puissance) dégâts d’énergie toutes les 0,5 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.15 * h.st.ap; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.25, dur: 3, every: 0.5, kind: 'gas', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => g.damage(h, u, dmg, 'magic')) }); g.sfx('glass', x, y); },
    ai(g, h, tg) { return D(h, tg) > this.range ? null : pred(tg, 0.5); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  adrenaline: {
    name: 'Adrénaline', aim: 'ally', range: 480,
    cost: [50, 55, 60, 65, 70], cd: [14, 13, 12, 11, 10], heal: [40, 60, 80, 100, 120],
    desc() { return `Pique un héros allié (ou lui‑même) : +35 % de vitesse pendant 2,5 s et ${fmt(this.heal)} (+20 % puissance) PV rendus.`; },
    cast(g, h, r, x, y, target) { const u = target || h; g.haste(u, 0.35, 2.5); g.heal(h, u, this.heal[r - 1] + 0.2 * h.st.ap); g.fx('adrenaline', { target: u, dur: 2.5 }); g.sfx('heal', u.x, u.y); },
    aiSupport(g, h, allies, enemies) { const a = allies.filter(x => x.hp / x.maxHp < 0.5 && D(x, h) < this.range && enemies.length).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; return a ? { x: a.x, y: a.y, target: a } : null; },
  },
  stim: {
    name: 'Stimulant de masse', aim: 'self', radius: 750, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], heal: [150, 250, 350],
    desc() { return `Tous les héros alliés dans un rayon de ${this.radius} récupèrent ${fmt(this.heal)} (+50 % puissance) PV et gagnent 30 % de vitesse pendant 2 s.`; },
    cast(g, h, r) { const heal = this.heal[r - 1] + 0.5 * h.st.ap; for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) <= this.radius) { g.heal(h, a, heal); g.haste(a, 0.3, 2); g.fx('healBurst', { target: a, dur: 1.2 }); } g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#8cff7a', dur: 0.8 }); g.sfx('stim', h.x, h.y); },
    aiSupport(g, h, allies) { return allies.some(a => a.hp / a.maxHp < 0.4 && D(a, h) < this.radius) ? { x: h.x, y: h.y } : null; },
  },

  // ================= Étincelle =================
  arc: {
    name: 'Arc électrique', aim: 'target', range: 380,
    cost: [60, 65, 70, 75, 80], cd: [7, 6.5, 6, 5.5, 5], dmg: [70, 105, 140, 175, 210],
    desc() { return `Foudroie l’ennemi ciblé : ${fmt(this.dmg)} (+60 % puissance) dégâts d’énergie. L’arc rebondit sur 2 ennemis proches pour 60 % des dégâts.`; },
    cast(g, h, r, x, y, target) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ap, hit = new Set([target.id]); let from = h, cur = target, k = 1;
      for (let i = 0; i < 3 && cur; i++) {
        g.fx('lightning', { x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, dur: 0.25 }); g.damage(h, cur, dmg * k, 'magic'); from = cur; k = 0.6;
        let nx = null, nd = 230; for (const u of g.enemyUnits(h.team)) { if (hit.has(u.id)) continue; const d = D(u, from); if (d < nd) { nd = d; nx = u; } }
        if (nx) hit.add(nx.id); cur = nx;
      }
      g.sfx('zap', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range + tg.radius ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m ? { x: m.x, y: m.y, target: m } : null; },
  },
  mine: {
    name: 'Mine magnétique', aim: 'circle', range: 450, radius: 130,
    cost: [70, 75, 80, 85, 90], cd: [11, 10.5, 10, 9.5, 9], dmg: [80, 120, 160, 200, 240],
    desc() { return `Mine qui explose après 0,9 s : ${fmt(this.dmg)} (+70 % puissance) dégâts d’énergie dans un rayon de ${this.radius} et 40 % de ralentissement pendant 1,5 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.7 * h.st.ap; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.9, dur: 0, kind: 'mine', instant: true, onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.4, 1.5); }); g.fx('emp', { x: z.x, y: z.y, r: z.r, dur: 0.5 }); g.sfx('emp', z.x, z.y); } }); g.sfx('throw', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) > this.range + 40 ? null : pred(tg, 0.9); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  overload: {
    name: 'Surcharge', aim: 'line', range: 270, width: 30, escape: true,
    cost: [80, 80, 80, 80, 80], cd: [18, 16, 14, 12, 10], val: [50, 75, 100, 125, 150],
    desc() { return `Se téléporte de ${this.range} unités vers le curseur et gagne un bouclier de ${fmt(this.val)} (+30 % puissance) pendant 2,5 s.`; },
    cast(g, h, r, x, y) { g.blink(h, x, y, this.range); g.shield(h, this.val[r - 1] + 0.3 * h.st.ap, 2.5); },
  },
  storm: {
    name: 'Tempête électrique', aim: 'circle', range: 650, radius: 250, ult: true,
    cost: [120, 120, 120], cd: [100, 85, 70], dmg: [80, 125, 170],
    desc() { return `Zone de rayon ${this.radius} : 5 éclairs frappent en 1,5 s, chacun infligeant ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie. Ils visent en priorité les héros.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.4 * h.st.ap; let n = 0;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.5, dur: 1.55, every: 0.3, kind: 'storm', onTick: z => {
        if (n++ >= 5) return;
        const heroes = g.heroes.filter(e => !e.dead && e.team !== h.team && D(e, z) <= z.r); let px, py;
        if (heroes.length && Math.random() < 0.7) { const e = Utils.pick(heroes); px = e.x + Utils.rand(-25, 25); py = e.y + Utils.rand(-25, 25); }
        else { const a = Utils.rand(0, 6.28), d = Math.sqrt(Math.random()) * z.r; px = z.x + Math.cos(a) * d; py = z.y + Math.sin(a) * d; }
        g.aoe(h.team, px, py, 90, u => g.damage(h, u, dmg, 'magic')); g.fx('strike', { x: px, y: py, dur: 0.45 }); g.sfx('thunder', px, py);
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 600 && (tg.hp / tg.maxHp < 0.6 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Rempart =================
  shieldbash: {
    name: 'Charge au bouclier', aim: 'line', range: 300, width: 60,
    cost: [55, 60, 65, 70, 75], cd: [12, 11, 10, 9, 8], dmg: [60, 95, 130, 165, 200],
    desc() { return `Charge sur ${this.range} unités derrière son bouclier. Le premier héros percuté subit ${fmt(this.dmg)} (+5 % des PV max de Rempart) dégâts physiques et est étourdi 1 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.05 * h.maxHp;
      g.startDash(h, x, y, { dist: this.range, speed: 900, fixed: true, onTouch: u => { g.damage(h, u, dmg, 'phys'); if (u.kind === 'hero') { g.stun(u, 1); g.sfx('thud', u.x, u.y); g.fx('impact', { x: u.x, y: u.y, size: 34 }); return true; } return false; } });
      g.sfx('dash', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < 290 && d > 60 ? { x: tg.x, y: tg.y } : null; },
  },
  shieldwall: {
    name: 'Mur de boucliers', aim: 'self', radius: 340,
    cost: [70, 70, 70, 70, 70], cd: [16, 15, 14, 13, 12], val: [60, 90, 120, 150, 180],
    desc() { return `Rempart et les héros alliés dans un rayon de ${this.radius} gagnent un bouclier de ${fmt(this.val)} (+8 % des PV max de Rempart) pendant 3 s.`; },
    cast(g, h, r) { const v = this.val[r - 1] + 0.08 * h.maxHp; for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) <= this.radius) g.shield(a, v, 3); g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#bfeaff', dur: 0.6 }); g.sfx('metal', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { return enemies.length && allies.some(a => a.hp / a.maxHp < 0.6 && D(a, h) < this.radius && g.time - a.lastHit < 1.2) ? { x: h.x, y: h.y } : null; },
  },
  taunt: {
    name: 'Provocation', aim: 'self', radius: 230,
    cost: [60, 65, 70, 75, 80], cd: [14, 13, 12, 11, 10], dur: [1, 1.15, 1.3, 1.45, 1.6],
    desc() { return `Frappe son bouclier : les ennemis dans un rayon de ${this.radius} sont forcés de l’attaquer pendant ${fmt(this.dur)} s. Gagne 25 blindage et isolation pendant 3 s.`; },
    cast(g, h, r) { g.aoe(h.team, h.x, h.y, this.radius, u => g.taunt(u, h, this.dur[r - 1])); g.addBuff(h, { id: 'taunt', dur: 3, stats: { armor: 25, resist: 25 } }); g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.4, color: '#ffd27a' }); g.sfx('gong', h.x, h.y); },
    ai(g, h, tg, ctx) { return ctx.enemies.some(e => D(e, h) < this.radius - 15) ? { x: h.x, y: h.y } : null; },
  },
  bastion: {
    name: 'Dernier rempart', aim: 'circle', range: 600, radius: 260, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], dmg: [150, 250, 350],
    desc() { return `Bondit sur la zone ciblée. À l’atterrissage, les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+6 % des PV max) dégâts physiques et sont étourdis 1,2 s. Rempart subit 40 % de dégâts en moins pendant 4 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.06 * h.maxHp;
      g.leap(h, x, y, 0.55, () => { g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'phys'); g.stun(u, 1.2); }); h.status.dr = { pct: 0.4, until: g.time + 4 }; g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.7 }); g.sfx('quake', h.x, h.y); });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 580 && ctx.enemies.filter(e => D(e, tg) < this.radius).length >= 1 ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Crocs =================
  pounce: {
    name: 'Bond', aim: 'target', range: 380,
    cost: [40, 45, 50, 55, 60], cd: [10, 9, 8, 7, 6], dmg: [70, 110, 150, 190, 230],
    desc() { return `Bondit sur l’ennemi ciblé et le lacère : ${fmt(this.dmg)} (+70 % dégâts d’attaque) dégâts physiques, +50 % contre les monstres.`; },
    cast(g, h, r, x, y, tg) {
      const dmg = this.dmg[r - 1] + 0.7 * h.st.ad;
      g.leap(h, tg.x, tg.y, 0.28, () => { if (!tg.dead) { g.damage(h, tg, dmg * (tg.kind === 'monster' ? 1.5 : 1), 'phys'); g.fx('claw', { x: tg.x, y: tg.y, dur: 0.35 }); } h.order = tg.dead ? null : { type: 'attack', target: tg }; }, tg);
      g.sfx('growl', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range && d > 90 ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m && m.kind === 'monster' ? { x: m.x, y: m.y, target: m } : null; },
  },
  rend: {
    name: 'Griffure', aim: 'cone', range: 200, angle: 1.6,
    cost: [30, 30, 30, 30, 30], cd: [6, 5.5, 5, 4.5, 4], dmg: [50, 80, 110, 140, 170],
    desc() { return `Lacère devant lui : ${fmt(this.dmg)} (+60 % dégâts d’attaque) dégâts physiques et saignement de 15 % de ces dégâts par seconde pendant 3 s. +40 % contre les monstres.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.6 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y); g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, this.angle / 2, this.range)) return; const d = dmg * (u.kind === 'monster' ? 1.4 : 1); g.damage(h, u, d, 'phys'); g.dot(u, 'bleed', d * 0.15, 3, h); }); g.fx('swipe', { x: h.x, y: h.y, angle: ang, range: this.range, dur: 0.25 }); g.sfx('swipe', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m ? { x: m.x, y: m.y } : null; },
  },
  frenzy: {
    name: 'Frénésie', aim: 'self', radius: 0,
    cost: [50, 50, 50, 50, 50], cd: [14, 13, 12, 11, 10], val: [0.4, 0.5, 0.6, 0.7, 0.8],
    desc() { return `Entre en frénésie pendant 4 s : +${fmt(this.val.map(v => v * 100))} % de vitesse d’attaque et 20 % de vol de vie.`; },
    cast(g, h, r) { g.addBuff(h, { id: 'frenzy', dur: 4, stats: { as: this.val[r - 1], lifesteal: 0.2 } }); g.fx('frenzy', { target: h, dur: 4 }); g.sfx('growl', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { const tg = h.order && h.order.target; return tg && D(tg, h) < 150 && (tg.kind === 'hero' || tg.kind === 'monster') ? { x: h.x, y: h.y } : null; },
  },
  hunt: {
    name: 'Curée', aim: 'target', range: 500, ult: true, heroOnly: true,
    cost: [100, 100, 100], cd: [90, 75, 60], dmg: [150, 250, 350],
    desc() { return `Fond sur un héros ennemi : ${fmt(this.dmg)} (+100 % dégâts d’attaque) dégâts physiques, +25 % des PV manquants de la cible. Si elle meurt dans la seconde, 70 % du délai est rendu.`; },
    cast(g, h, r, x, y, tg) {
      const base = this.dmg[r - 1] + h.st.ad;
      g.leap(h, tg.x, tg.y, 0.3, () => { if (tg.dead) return; g.damage(h, tg, base + 0.25 * (tg.maxHp - tg.hp), 'phys'); g.fx('claw', { x: tg.x, y: tg.y, dur: 0.5, big: true }); g.sfx('thud', tg.x, tg.y); if (tg.dead) h.cds[3] = Math.max(0, h.cds[3] - this.cd[r - 1] * 0.7); h.order = tg.dead ? null : { type: 'attack', target: tg }; }, tg);
    },
    ai(g, h, tg) { return D(h, tg) < this.range && tg.hp / tg.maxHp < 0.45 ? { x: tg.x, y: tg.y, target: tg } : null; },
  },

  // ================= Cendre =================
  flamer: {
    name: 'Lance‑flammes', aim: 'cone', range: 330, angle: 0.9,
    cost: [55, 60, 65, 70, 75], cd: [7, 6.5, 6, 5.5, 5], dmg: [60, 95, 130, 165, 200],
    desc() { return `Jet de flammes en cône : ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie, et les ennemis brûlent pendant 3 s (20 % des dégâts par seconde).`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, ang = Utils.angleTo(h.x, h.y, x, y); g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, this.angle / 2, this.range)) return; g.damage(h, u, dmg, 'magic'); g.dot(u, 'burn', dmg * 0.2, 3, h); }); g.fx('flame', { x: h.x, y: h.y, angle: ang, range: this.range, half: this.angle / 2, dur: 0.45 }); g.sfx('flame', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 2 ? { x: c[0].x, y: c[0].y } : null; },
  },
  molotov: {
    name: 'Cocktail', aim: 'circle', range: 480, radius: 150,
    cost: [70, 75, 80, 85, 90], cd: [13, 12, 11, 10, 9], dmg: [20, 30, 40, 50, 60],
    desc() { return `Bouteille enflammée : la zone (rayon ${this.radius}) brûle 3 s, inflige ${fmt(this.dmg)} (+15 % puissance) dégâts d’énergie toutes les 0,5 s et ralentit de 20 %.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.15 * h.st.ap; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.35, dur: 3, every: 0.5, kind: 'fire', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.2, 0.6); g.dot(u, 'burn', dmg * 0.4, 1.5, h); }) }); g.sfx('glass', x, y); },
    ai(g, h, tg) { return D(h, tg) > this.range ? null : pred(tg, 0.5); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  ignite: {
    name: 'Combustion', aim: 'target', range: 450,
    cost: [60, 65, 70, 75, 80], cd: [9, 8.5, 8, 7.5, 7], dmg: [70, 110, 150, 190, 230],
    desc() { return `Fait exploser la cible : ${fmt(this.dmg)} (+60 % puissance) dégâts d’énergie, +50 % si elle brûle déjà.`; },
    cast(g, h, r, x, y, tg) { const burning = tg.status.burn && tg.status.burn.until > g.time; const dmg = (this.dmg[r - 1] + 0.6 * h.st.ap) * (burning ? 1.5 : 1); g.damage(h, tg, dmg, 'magic'); g.dot(tg, 'burn', dmg * 0.1, 3, h); g.fx('fireburst', { x: tg.x, y: tg.y, dur: 0.6, big: burning }); g.sfx('explosion', tg.x, tg.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range && x.kind === 'monster'); return m ? { x: m.x, y: m.y, target: m } : null; },
  },
  inferno: {
    name: 'Brasier', aim: 'circle', range: 650, radius: 280, ult: true,
    cost: [120, 120, 120], cd: [110, 95, 80], dmg: [200, 300, 400],
    desc() { return `La zone ciblée (rayon ${this.radius}) entre en éruption après 0,7 s : ${fmt(this.dmg)} (+80 % puissance) dégâts d’énergie, puis brûle pendant 4 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ap;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 4, every: 0.5, kind: 'inferno', onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => g.damage(h, u, dmg, 'magic')); g.fx('fireburst', { x: z.x, y: z.y, dur: 0.9, big: true, r: z.r }); g.sfx('explosion', z.x, z.y); }, onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => g.dot(u, 'burn', dmg * 0.08, 1, h)) });
      g.sfx('charge', x, y);
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 620 && (tg.hp / tg.maxHp < 0.6 || ctx.enemies.length >= 2) ? pred(tg, 0.7) : null; },
  },

  // ================= Mécano =================
  wrench: {
    name: 'Clé à molette', aim: 'cone', range: 150, angle: 1.4,
    cost: [40, 45, 50, 55, 60], cd: [7, 6.5, 6, 5.5, 5], dmg: [70, 105, 140, 175, 210],
    desc() { return `Grand coup de clé devant lui : ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques et 30 % de ralentissement pendant 1 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.8 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y); g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, this.angle / 2, this.range)) return; g.damage(h, u, dmg, 'phys'); g.slow(u, 0.3, 1); }); g.fx('swipe', { x: h.x, y: h.y, angle: ang, range: this.range, dur: 0.25, color: '#d8d8d0' }); g.sfx('hammer', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m ? { x: m.x, y: m.y } : null; },
  },
  turret: {
    name: 'Tourelle portative', aim: 'circle', range: 300, radius: 380,
    cost: [70, 75, 80, 85, 90], cd: [16, 15, 14, 13, 12], dmg: [25, 35, 45, 55, 65],
    desc() { return `Déploie une tourelle pendant 8 s. Elle tire sur l’ennemi le plus proche (portée 380) toutes les 0,6 s : ${fmt(this.dmg)} (+20 % dégâts d’attaque, +20 % puissance) dégâts physiques.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.2 * h.st.ad + 0.2 * h.st.ap;
      g.addZone({ team: h.team, src: h, x, y, r: 380, delay: 0.4, dur: 8, every: 0.6, kind: 'miniturret', angle: h.angle, onTick: z => {
        let best = null, bd = 380; for (const u of g.enemyUnits(h.team)) { const d = D(u, z); if (d < bd) { bd = d; best = u; } }
        if (best) { z.angle = Utils.angleTo(z.x, z.y, best.x, best.y); g.homing({ x: z.x, y: z.y, radius: 10, team: h.team, kind: 'turretZone' }, best, { speed: 1100, visual: 'bullet', onHit: u => g.damage(h, u, dmg, 'phys') }); g.sfx('rifle', z.x, z.y); }
      } });
      g.sfx('build', x, y);
    },
    ai(g, h, tg) { return D(h, tg) < 420 ? { x: (h.x + tg.x) / 2, y: (h.y + tg.y) / 2 } : null; },
    aiFarm(g, h, ms) { return ms.length >= 2 && h.mana / h.maxMana > 0.5 ? { x: h.x, y: h.y } : null; },
  },
  spring: {
    name: 'Ressort', aim: 'circle', range: 300, radius: 130,
    cost: [60, 60, 60, 60, 60], cd: [14, 13, 12, 11, 10], dmg: [60, 90, 120, 150, 180],
    desc() { return `Bondit sur la zone ciblée grâce à ses jambes à ressort. À l’atterrissage : ${fmt(this.dmg)} (+40 % dégâts d’attaque) dégâts physiques dans un rayon de ${this.radius} et 0,6 s d’étourdissement.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ad; g.leap(h, x, y, 0.4, () => { g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'phys'); g.stun(u, 0.6); }); g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.5 }); g.sfx('thud', h.x, h.y); }); g.sfx('spring', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d < 300 && d > 80 ? { x: tg.x, y: tg.y } : null; },
    escape: true,
  },
  exo: {
    name: 'Exosquelette', aim: 'self', radius: 0, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], ad: [40, 70, 100], hp: [200, 350, 500],
    desc() { return `Enfile son exosquelette pendant 8 s : +${fmt(this.ad)} dégâts d’attaque, +${fmt(this.hp)} PV, +40 blindage et isolation, et grandit.`; },
    cast(g, h, r) { g.addBuff(h, { id: 'exo', dur: 8, stats: { ad: this.ad[r - 1], hp: this.hp[r - 1], armor: 40, resist: 40 }, scale: 1.35 }); g.heal(h, h, this.hp[r - 1]); g.fx('pulse', { x: h.x, y: h.y, r: 160, color: '#ffd27a', dur: 0.6 }); g.sfx('engine', h.x, h.y); },
    ai(g, h, tg, ctx) { return D(h, tg) < 250 && (ctx.enemies.length >= 2 || tg.hp / tg.maxHp < 0.6) ? { x: h.x, y: h.y } : null; },
  },
};

const SPELLS = {
  flash: { name: 'Saut', cd: 150, desc: 'Se téléporte instantanément de 220 unités vers le curseur.', cast(g, h, x, y) { g.blink(h, x, y, 220); return true; } },
  patch: { name: 'Rustine', cd: 120, desc: 'Rend 90 (+18 par niveau) PV et accélère de 25 % pendant 1,5 s.', cast(g, h) { g.heal(h, h, 90 + 18 * h.level); g.haste(h, 0.25, 1.5); g.fx('healBurst', { target: h, dur: 1 }); g.sfx('heal', h.x, h.y); return true; } },
  smite: {
    name: 'Châtiment', cd: 60, range: 280, desc: 'Inflige 450 (+25 par niveau) dégâts bruts à un monstre ou un sbire proche et rend 10 % des PV max. Indispensable pour la jungle et les monstres épiques.',
    cast(g, h, x, y) {
      let best = null, bd = Infinity;
      for (const u of [...g.monsters, ...g.minions]) { if (u.dead || u.team === h.team || D(u, h) > this.range + u.radius) continue; const d = Utils.dist(u.x, u.y, x, y); if (d < bd) { bd = d; best = u; } }
      if (!best) { g.castFail(h, 'Aucun monstre à portée du Châtiment'); return false; }
      g.fx('lightning', { x1: best.x, y1: best.y - 400, x2: best.x, y2: best.y, dur: 0.35, color: '#ffd27a' });
      g.damage(h, best, 450 + 25 * h.level, 'true'); g.heal(h, h, h.maxHp * 0.1); g.sfx('thunder', best.x, best.y); return true;
    },
  },
};
