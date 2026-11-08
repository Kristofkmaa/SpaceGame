// ============ Passifs, compétences des héros et sorts d'invocateur ============
// aim : 'line', 'circle', 'self', 'target', 'ally', 'cone'
const fmt = a => a.map(v => Math.round(v * 100) / 100).join(' / ');
const pct = a => a.map(v => Math.round(v * 100)).join(' / ') + ' %';
const D = (a, b) => Utils.dist(a.x, a.y, b.x, b.y);
const pred = (u, tm) => ({ x: u.x + (u.vx || 0) * tm, y: u.y + (u.vy || 0) * tm });
const inCone = (h, u, ang, half, range) => D(h, u) <= range + u.radius && Math.abs(Utils.normAngle(Utils.angleTo(h.x, h.y, u.x, u.y) - ang)) <= half + 0.1;
const near = (list, p, r) => list.filter(e => D(e, p) <= r).length;

// ---------------- Passifs ----------------
// Crochets disponibles : init, tick, preBasic, onBasic, onDealt, onTaken, modTaken, onKill,
// onDeathNear, onBurnDeath, onCast, stats, range, healMod, counter, ready.
const PASSIVES = {
  scrap: {
    name: 'Récupération',
    desc() { return 'Chaque coup porté à un héros ennemi (une fois par seconde et par cible) et chaque ennemi qui meurt près d’elle lui rapportent 1 ferraille, jusqu’à 6. Chaque ferraille donne 3 (+0,25 par niveau) blindage et isolation.'; },
    init(h) { h.pas.n = 0; h.pas.hit = {}; },
    counter(h) { return h.pas.n ? String(h.pas.n) : ''; }, ready(h) { return h.pas.n >= 6; },
    stats(h) { const k = h.pas.n * (3 + 0.25 * h.level); return k ? { armor: k, resist: k } : null; },
    gain(h, n) { const v = Utils.clamp(h.pas.n + n, 0, 6); if (v !== h.pas.n) { h.pas.n = v; h.recompute(); } },
    onDealt(g, h, tg, dmg, opt) { if (tg.kind !== 'hero' || opt.dot || opt.proc) return; if ((h.pas.hit[tg.id] || 0) > g.time) return; h.pas.hit[tg.id] = g.time + 1; this.gain(h, 1); },
    onDeathNear(g, h, u) { if (u.team !== h.team) this.gain(h, 1); },
  },
  pilgrim: {
    name: 'Pèlerinage',
    desc() { return 'Marcher remplit sa Ferveur, jusqu’à 100. Pleine, sa prochaine attaque inflige 30 (+10 par niveau, +30 % dégâts d’attaque) dégâts d’énergie supplémentaires et lui rend 6 % de ses PV max.'; },
    init(h) { h.pas.n = 0; h.pas.lx = null; h.pas.trail = 0; },
    counter(h) { return h.pas.n >= 100 ? '' : String(Math.floor(h.pas.n)); }, ready(h) { return h.pas.n >= 100; },
    tick(g, h) {
      if (h.pas.lx !== null && !h.disp && !h.dash) { const d = Utils.dist(h.pas.lx, h.pas.ly, h.x, h.y); if (d < 120) h.pas.n = Math.min(100, h.pas.n + d / 25 * (h.hasBuff('slowmarch') ? 2 : 1)); }
      h.pas.lx = h.x; h.pas.ly = h.y;
      if (h.hasBuff('slowmarch') && h.pas.trail <= g.time) {
        h.pas.trail = g.time + 0.3;
        g.addZone({ team: h.team, src: h, x: h.x, y: h.y, r: 85, delay: 0, dur: 2, every: 0.25, kind: 'tar', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => g.slow(u, 0.35, 0.4)) });
      }
    },
    preBasic(g, h, tg, o) { if (h.pas.n < 100) return; h.pas.n = 0; o.bonus = 30 + 10 * h.level + 0.3 * h.st.ad; g.heal(h, h, h.maxHp * 0.06); g.fx('pulse', { x: h.x, y: h.y, r: 90, color: '#ffd27a', dur: 0.4 }); },
  },
  scent: {
    name: 'Flair',
    desc() { return 'Les héros ennemis sous 40 % de PV à moins de 1600 unités sont révélés à toute son équipe, même dans le brouillard. Elle court 20 % plus vite tant qu’une proie blessée est proche.'; },
    init(h) { h.pas.n = 0; h.pas.q = null; },
    counter() { return ''; }, ready(h) { return h.msBonus > 0; },
    tick(g, h) {
      let prey = false;
      for (const e of g.heroes) if (!e.dead && e.team !== h.team && e.hp / e.maxHp < 0.4 && D(e, h) < 1000) { prey = true; break; }
      h.msBonus = (prey ? 0.2 : 0) + (h.pas.q && h.pas.q.until > g.time ? 0.35 : 0);
    },
    onBasic(g, h, tg) { if (h.hasBuff('fangs')) g.dot(tg, 'bleed', 8 + 3 * h.level + 0.15 * h.st.ad, 3, h); },
    onKill(g, h, v) { const q = h.pas.q; if (q && v.id === q.id && q.until > g.time) { g.heal(h, h, h.maxHp * 0.25); h.cds[3] *= 0.25; h.pas.q = null; g.fx('frenzy', { target: h, dur: 1.5 }); } },
  },
  reserve: {
    name: 'Réserve d’eau',
    desc() { return 'Quand il passe sous 35 % de PV, il boit une grande gorgée et récupère 20 % de ses PV max en 3 s. Recharge : 60 s.'; },
    init(h) { h.pas.n = 0; h.pas.cd = 0; },
    counter(h) { return h.pas.n > 0 ? String(h.pas.n) : ''; }, ready(h) { return h.pas.n <= 0; },
    tick(g, h) { h.pas.n = Math.max(0, Math.ceil(h.pas.cd - g.time)); },
    onTaken(g, h) { if (h.hp / h.maxHp >= 0.35 || h.pas.cd > g.time) return; h.pas.cd = g.time + 60; g.hot(h, h.maxHp * 0.2, 3, h); g.fx('splash', { x: h.x, y: h.y, color: '#7fc8ff', dur: 0.7 }); g.fx('healBurst', { target: h, dur: 3 }); g.sfx('heal', h.x, h.y); },
  },
  surge: {
    name: 'Surtension',
    desc() { return 'Chaque compétence qui touche un ennemi le charge (3 charges au maximum, 6 s). À trois charges, la cible grille : étourdie 1 s, elle subit 30 (+12 par niveau, +30 % puissance) dégâts d’énergie. Une même cible ne peut griller qu’une fois toutes les 6 s.'; },
    counter() { return ''; },
    onDealt(g, h, tg, dmg, opt) { if (opt.basic || opt.dot || opt.proc) return; g.addCharge(tg, h); },
  },
  offering: {
    name: 'Offrande',
    desc() { return 'Ses compétences enflamment leurs cibles. Un ennemi qui meurt en brûlant explose : 30 (+8 par niveau, +20 % puissance) dégâts d’énergie autour de lui, et ses voisins prennent feu à leur tour.'; },
    counter() { return ''; },
    onBurnDeath(g, h, u) {
      const dmg = 30 + 8 * h.level + 0.2 * h.st.ap;
      g.fx('fireburst', { x: u.x, y: u.y, dur: 0.6, big: true, r: 150 }); g.sfx('explosion', u.x, u.y);
      g.aoe(h.team, u.x, u.y, 150, e => { if (e === u) return; g.damage(h, e, dmg, 'magic', { proc: true }); if (!e.dead) g.dot(e, 'burn', dmg * 0.15, 3, h); });
    },
  },
  etiquette: {
    name: 'Étiquette',
    desc() { return 'Une attaque sur quatre est un Tir d’honneur : +100 de portée et coup critique assuré.'; },
    init(h) { h.pas.n = 0; },
    counter(h) { return h.pas.n >= 3 ? '' : String(h.pas.n + 1); }, ready(h) { return h.pas.n >= 3; },
    range(h) { return h.pas.n >= 3 ? 100 : 0; },
    preBasic(g, h, tg, o) { if (h.pas.n >= 3) { h.pas.n = 0; o.crit = true; g.fx('impact', { x: tg.x, y: tg.y, size: 34 }); } else h.pas.n++; },
  },
  warmup: {
    name: 'Échauffement',
    desc() { return 'Chaque attaque qui suit la précédente de moins de 2,5 s augmente sa vitesse d’attaque de 7 %, jusqu’à 6 fois. Les cumuls retombent s’il s’arrête de tirer.'; },
    init(h) { h.pas.n = 0; h.pas.last = -9; },
    counter(h) { return h.pas.n ? String(h.pas.n) : ''; }, ready(h) { return h.pas.n >= 6; },
    stats(h) { return h.pas.n ? { as: 0.07 * h.pas.n } : null; },
    add(h, k) { const v = Utils.clamp(h.pas.n + k, 0, 6); h.pas.last = h.game.time; if (v !== h.pas.n) { h.pas.n = v; h.recompute(); } },
    onBasic(g, h) { if (g.time - h.pas.last > 2.5) { h.pas.n = 0; } this.add(h, 1); },
    tick(g, h) { if (h.pas.n && g.time - h.pas.last > 2.5) { h.pas.n = 0; h.recompute(); } },
  },
  triage: {
    name: 'Urgences',
    desc() { return 'Ses soins et ses boucliers sont 40 % plus efficaces sur les alliés sous 40 % de PV.'; },
    counter() { return ''; },
    healMod(g, src, u) { return u.hp / u.maxHp < 0.4 ? 1.4 : 1; },
  },
  onair: {
    name: 'En direct',
    desc() { return 'Les héros alliés à moins de 700 unités courent 8 % plus vite. Chaque fois qu’il lance une compétence, les alliés proches (lui compris) reçoivent un bouclier de 20 (+8 par niveau, +10 % puissance) pendant 2 s.'; },
    counter() { return ''; },
    tick(g, h) { if (((h.pas.tk = (h.pas.tk || 0) + 1) & 7) !== 0) return; for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) < 700) a.status.aura = g.time + 0.3; },
    onCast(g, h) { const v = 20 + 8 * h.level + 0.1 * h.st.ap; for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) < 600) g.shield(a, v, 2, h); },
  },
  guard: {
    name: 'Garde haute',
    desc() { return 'Toutes les 10 s, il pare la prochaine attaque de base d’un héros ennemi (aucun dégât) et riposte aussitôt : 20 (+10 par niveau, +50 % dégâts d’attaque) dégâts physiques.'; },
    init(h) { h.pas.n = 0; h.pas.cd = 0; },
    counter(h) { return h.pas.n > 0 ? String(h.pas.n) : ''; }, ready(h) { return h.pas.n <= 0; },
    tick(g, h) { h.pas.n = Math.max(0, Math.ceil(h.pas.cd - g.time)); },
    modTaken(g, h, src, dmg, opt) {
      if (!opt.basic || !src || src.kind !== 'hero' || h.pas.cd > g.time) return dmg;
      h.pas.cd = g.time + 10;
      g.fx('snap', { x: h.x, y: h.y, dur: 0.5 }); g.sfx('clank', h.x, h.y);
      g.fx('slash', { x: src.x, y: src.y, angle: Utils.angleTo(h.x, h.y, src.x, src.y), dur: 0.25, big: true });
      g.damage(h, src, 20 + 10 * h.level + 0.5 * h.st.ad, 'phys', { proc: true });
      return 0;
    },
  },
  powder: {
    name: 'Poudre et acier',
    desc() { return 'Chaque compétence recharge son pistolet. Sa prochaine attaque devient un tir à 300 unités de portée supplémentaires qui inflige 20 (+9 par niveau, +40 % dégâts d’attaque) dégâts physiques en plus.'; },
    init(h) { h.pas.n = 0; },
    counter() { return ''; }, ready(h) { return h.pas.n > 0; },
    range(h) { return h.pas.n ? 300 : 0; },
    onCast(g, h) { h.pas.n = 1; },
    preBasic(g, h, tg, o) { if (!h.pas.n) return; h.pas.n = 0; o.bonus = 20 + 9 * h.level + 0.4 * h.st.ad; o.bonusType = 'phys'; },
  },
};

// ---------------- Compétences ----------------
const ABILITIES = {
  // ================= Mère Rouille =================
  hook: {
    name: 'Grappin', aim: 'line', range: 620, width: 50,
    cost: [60, 65, 70, 75, 80], cd: [16, 15, 14, 13, 12], dmg: [80, 120, 160, 200, 240],
    desc() { return `Lance un crochet magnétique. Le premier ennemi touché subit ${fmt(this.dmg)} (+8 % de ses PV max à elle) dégâts d’énergie, est tiré jusqu’à elle et étourdi 0,5 s. Un héros accroché rapporte 1 ferraille de plus.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.08 * h.maxHp;
      g.skillshot(h, x, y, { range: this.range, speed: 1500, width: this.width, visual: 'hook', onHit: u => {
        g.damage(h, u, dmg, 'magic'); if (u.dead) return;
        const a = Utils.angleTo(h.x, h.y, u.x, u.y), dd = h.radius + u.radius + 12;
        g.fx('tether', { src: h, target: u, dur: 0.5, color: '#a8a090' });
        g.pull(u, h.x + Math.cos(a) * dd, h.y + Math.sin(a) * dd, 1500, () => g.stun(u, 0.5));
        if (u.kind === 'hero') PASSIVES.scrap.gain(h, 1);
        g.sfx('metal', u.x, u.y);
      } });
      g.sfx('throw', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range - 40 && d > 170 ? pred(tg, d / 1500) : null; },
  },
  scrapshield: {
    name: 'Blindage de fortune', aim: 'self', radius: 0,
    cost: [50, 50, 50, 50, 50], cd: [14, 13, 12, 11, 10], val: [60, 100, 140, 180, 220],
    desc() { return `Soude toute sa ferraille sur elle : bouclier de ${fmt(this.val)} (+40 par ferraille, +6 % PV max) pendant 4 s et +25 % de vitesse pendant 2 s. Consomme la ferraille.`; },
    cast(g, h, r) { const n = h.pas.n; g.shield(h, this.val[r - 1] + 40 * n + 0.06 * h.maxHp, 4, h); g.haste(h, 0.25, 2); PASSIVES.scrap.gain(h, -n); g.fx('pulse', { x: h.x, y: h.y, r: 120, color: '#c8b89a', dur: 0.5 }); g.sfx('metal', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { return h.pas.n >= 2 && h.hp / h.maxHp < 0.85 && enemies.some(e => D(e, h) < 450) && g.time - h.lastHit < 1.2 ? { x: h.x, y: h.y } : null; },
  },
  press: {
    name: 'Presse hydraulique', aim: 'self', radius: 0,
    cost: [40, 40, 40, 40, 40], cd: [9, 8, 7, 6, 5], dmg: [50, 80, 110, 140, 170],
    desc() { return `Sa prochaine attaque dans les 5 s écrase la cible avec sa pince : ${fmt(this.dmg)} (+50 % dégâts d’attaque, +4 % PV max) dégâts physiques supplémentaires, et la cible est projetée en l’air pendant 0,75 s.`; },
    cast(g, h, r) { h.empower = { until: g.time + 5, bonus: this.dmg[r - 1] + 0.5 * h.st.ad + 0.04 * h.maxHp, onHit: tg => { g.knockup(tg, 0.75); g.fx('quake', { x: tg.x, y: tg.y, r: 90, dur: 0.4 }); g.sfx('thud', tg.x, tg.y); } }; h.attackCd = 0; g.sfx('engine', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < h.st.range + h.radius + tg.radius + 60 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return ms.some(m => m.kind === 'monster' && D(m, h) < 150) ? { x: h.x, y: h.y } : null; },
  },
  magnet: {
    name: 'Électroaimant', aim: 'circle', range: 650, radius: 380, ult: true,
    cost: [100, 100, 100], cd: [120, 105, 90], dmg: [150, 250, 350], stun: [1, 1.25, 1.5],
    desc() { return `Pose un aimant géant. Après 0,6 s, tous les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+8 % PV max) dégâts d’énergie, sont aspirés vers le centre puis étourdis ${fmt(this.stun)} s. Remplit sa réserve de ferraille.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.08 * h.maxHp, st = this.stun[r - 1];
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.6, dur: 0, kind: 'magnet', instant: true, onArm: z => {
        g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); if (u.dead) return; const a = Math.random() * 6.28, rr = Utils.rand(20, 60); g.pull(u, z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 1400, () => g.stun(u, st)); });
        PASSIVES.scrap.gain(h, 6); g.fx('emp', { x: z.x, y: z.y, r: z.r, dur: 0.6 }); g.sfx('emp', z.x, z.y);
      } });
      g.sfx('charge', x, y);
    },
    ai(g, h, tg, ctx) { return D(h, tg) < this.range && (near(ctx.enemies, tg, this.radius) >= 2 || tg.hp / tg.maxHp < 0.5) ? pred(tg, 0.6) : null; },
  },

  // ================= Frère Goudron =================
  tarpalm: {
    name: 'Paume de goudron', aim: 'line', range: 380, width: 60,
    cost: [50, 55, 60, 65, 70], cd: [12, 11, 10, 9, 8], dmg: [70, 110, 150, 190, 230],
    desc() { return `Bondit sur ${this.range} unités. Le premier ennemi touché reçoit ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques et reste englué au sol pendant 1 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ad;
      g.startDash(h, x, y, { dist: this.range, speed: 1000, fixed: true, onTouch: u => { g.damage(h, u, dmg, 'phys'); g.root(u, 1); g.fx('splash', { x: u.x, y: u.y, color: '#2a2420', dur: 0.5 }); g.sfx('thud', u.x, u.y); return true; } });
      g.sfx('dash', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < 360 && d > 80 ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < 300); return m && h.mana / h.maxMana > 0.5 ? { x: m.x, y: m.y } : null; },
  },
  vow: {
    name: 'Vœu de silence', aim: 'self', radius: 280,
    cost: [70, 70, 70, 70, 70], cd: [16, 15, 14, 13, 12], dmg: [50, 80, 110, 140, 170],
    desc() { return `Frappe le sol : les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+40 % dégâts d’attaque) dégâts d’énergie et sont réduits au silence 1,5 s (ils ne peuvent plus lancer de compétences). Il subit 20 % de dégâts en moins pendant 2,5 s.`; },
    cast(g, h, r) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ad; g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'magic'); g.silence(u, 1.5); }); h.status.dr = { pct: 0.2, until: g.time + 2.5 }; g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.6, color: '#3a3430' }); g.sfx('gong', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.radius - 20 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return near(ms, h, this.radius) >= 3 ? { x: h.x, y: h.y } : null; },
  },
  slowmarch: {
    name: 'Marche lente', aim: 'self', radius: 0, escape: true,
    cost: [50, 50, 50, 50, 50], cd: [18, 17, 16, 15, 14], ms: [0.25, 0.3, 0.35, 0.4, 0.45],
    desc() { return `Pendant 3 s : +${pct(this.ms)} de vitesse, insensible aux ralentissements, et il laisse une traînée de goudron qui ralentit les ennemis de 35 %. Sa Ferveur se remplit deux fois plus vite.`; },
    cast(g, h, r) { g.haste(h, this.ms[r - 1], 3); h.status.slowImmune = g.time + 3; g.addBuff(h, { id: 'slowmarch', dur: 3 }); g.sfx('dig', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d > h.st.range + 80 && d < 700 ? { x: h.x, y: h.y } : null; },
  },
  sermon: {
    name: 'Sermon de bitume', aim: 'circle', range: 600, radius: 320, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], dmg: [40, 60, 80],
    desc() { return `Recouvre la zone de goudron pendant 4 s. Les ennemis pris dedans sont ralentis de 40 %, réduits au silence et subissent ${fmt(this.dmg)} (+25 % dégâts d’attaque) dégâts d’énergie toutes les 0,5 s. Il se soigne de 30 % des dégâts infligés, et sa Ferveur se remplit.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.25 * h.st.ad; let k = 0;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.3, dur: 4, every: 0.25, kind: 'tar', big: true, onTick: z => {
        const hit = (k++ % 2) === 0;
        g.aoe(h.team, z.x, z.y, z.r, u => { g.slow(u, 0.4, 0.4); g.silence(u, 0.4, true); if (hit) { const d = g.damage(h, u, dmg, 'magic'); if (u.kind === 'hero') g.heal(h, h, d * 0.3); } });
      } });
      h.pas.n = 100; g.fx('quake', { x, y, r: this.radius, dur: 0.8, color: '#2a2420' }); g.sfx('gong', x, y);
    },
    ai(g, h, tg, ctx) { return D(h, tg) < this.range && (near(ctx.enemies, tg, this.radius) >= 2 || tg.hp / tg.maxHp < 0.55) ? pred(tg, 0.3) : null; },
  },

  // ================= Louve =================
  pounce: {
    name: 'Bond', aim: 'target', range: 430,
    cost: [40, 45, 50, 55, 60], cd: [9, 8.5, 8, 7.5, 7], dmg: [60, 95, 130, 165, 200],
    desc() { return `Saute sur un ennemi et le lacère : ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques. Si la cible était sous 40 % de PV, 60 % du délai est rendu.`; },
    cast(g, h, r, x, y, tg) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ad, low = tg.hp / tg.maxHp < 0.4;
      g.leap(h, tg.x, tg.y, 0.3, () => { if (!tg.dead) { g.damage(h, tg, dmg, 'phys'); g.fx('claw', { x: tg.x, y: tg.y, dur: 0.4, big: true }); g.sfx('swipe', tg.x, tg.y); } if (low) h.cds[0] *= 0.4; }, tg);
      g.sfx('growl', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range + tg.radius ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => x.kind === 'monster' && D(x, h) < this.range); return m ? { x: m.x, y: m.y, target: m } : null; },
  },
  fangs: {
    name: 'Crocs et lames', aim: 'self', radius: 0,
    cost: [40, 40, 40, 40, 40], cd: [12, 11, 10, 9, 8], as: [0.3, 0.4, 0.5, 0.6, 0.7],
    desc() { return `Pendant 4 s : +${pct(this.as)} de vitesse d’attaque et 15 % de vol de vie, et chaque attaque fait saigner la cible pendant 3 s (8 +3 par niveau, +15 % dégâts d’attaque par seconde).`; },
    cast(g, h, r) { g.addBuff(h, { id: 'fangs', dur: 4, stats: { as: this.as[r - 1], lifesteal: 0.15 } }); g.fx('frenzy', { target: h, dur: 4 }); g.sfx('growl', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < h.st.range + h.radius + tg.radius + 80 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return ms.some(m => m.kind === 'monster' && D(m, h) < 160) ? { x: h.x, y: h.y } : null; },
  },
  howl: {
    name: 'Hurlement', aim: 'self', radius: 320, escape: true,
    cost: [60, 60, 60, 60, 60], cd: [16, 15, 14, 13, 12], dmg: [40, 70, 100, 130, 160],
    desc() { return `Hurlement terrifiant : les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+40 % dégâts d’attaque) dégâts d’énergie, et les héros et sbires s’enfuient pendant 1 s (1,5 s pour les sbires). Elle gagne 30 % de vitesse pendant 2 s.`; },
    cast(g, h, r) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ad; g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.fear(u, h, u.kind === 'hero' ? 1 : 1.5); }); g.haste(h, 0.3, 2); g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#c84a3a', dur: 0.6 }); g.sfx('growl', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.radius - 30 ? { x: h.x, y: h.y } : null; },
  },
  quarry: {
    name: 'Curée', aim: 'target', range: 550, ult: true, heroOnly: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [100, 175, 250], amp: [0.2, 0.3, 0.4],
    desc() { return `Bondit sur un héros ennemi (${fmt(this.dmg)} +60 % dégâts d’attaque) et le marque 6 s : elle lui inflige ${pct(this.amp)} de dégâts en plus et court 35 % plus vite. Si la proie meurt marquée, Louve récupère 25 % de ses PV et son ultime se recharge aux trois quarts.`; },
    cast(g, h, r, x, y, tg) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ad;
      g.amp(tg, this.amp[r - 1], 6, h, 'quarry'); h.pas.q = { id: tg.id, until: g.time + 6 };
      g.fx('mark', { target: tg, dur: 6 });
      g.leap(h, tg.x, tg.y, 0.35, () => { if (!tg.dead) { g.damage(h, tg, dmg, 'phys'); g.fx('claw', { x: tg.x, y: tg.y, dur: 0.5, big: true }); } }, tg);
      g.sfx('growl', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range && tg.hp / tg.maxHp < 0.6 ? { x: tg.x, y: tg.y, target: tg } : null; },
  },

  // ================= Vieux Silo =================
  jet: {
    name: 'Jet sous pression', aim: 'line', range: 560, width: 70,
    cost: [60, 60, 60, 60, 60], cd: [10, 9.5, 9, 8.5, 8], dmg: [70, 110, 150, 190, 230],
    desc() { return `Jet d’eau qui traverse tout sur ${this.range} unités : ${fmt(this.dmg)} (+5 % PV max) dégâts d’énergie, et les ennemis touchés sont repoussés de 180 unités.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.05 * h.maxHp, ang = Utils.angleTo(h.x, h.y, x, y);
      g.skillshot(h, x, y, { range: this.range, speed: 1400, width: this.width, pierce: true, visual: 'water', onHit: u => { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.displace(u, u.x + Math.cos(ang) * 180, u.y + Math.sin(ang) * 180, 0.25); } });
      g.sfx('dig', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range - 50 ? pred(tg, d / 1400) : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range - 50); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  puddle: {
    name: 'Flaque', aim: 'circle', range: 450, radius: 200,
    cost: [60, 65, 70, 75, 80], cd: [16, 15, 14, 13, 12], dmg: [40, 60, 80, 100, 120],
    desc() { return `Inonde la zone pendant 4 s : ${fmt(this.dmg)} (+3 % PV max) dégâts d’énergie à l’arrivée, puis 35 % de ralentissement. Les ennemis trempés subissent 15 % de dégâts en plus, de toutes les sources.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.03 * h.maxHp; let first = true;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.2, dur: 4, every: 0.25, kind: 'puddle', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => { if (first) g.damage(h, u, dmg, 'magic'); g.slow(u, 0.35, 0.4); g.amp(u, 0.15, 0.4, null, 'soaked'); }) && (first = false) });
      g.fx('splash', { x, y, color: '#7fc8ff', dur: 0.6 }); g.sfx('glass', x, y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range + 40 ? pred(tg, 0.3) : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  dive: {
    name: 'Plongeon', aim: 'circle', range: 420, radius: 170, escape: true,
    cost: [70, 70, 70, 70, 70], cd: [15, 14, 13, 12, 11], dmg: [60, 95, 130, 165, 200],
    desc() { return `Saute à pleine charge sur la zone. À l’atterrissage, les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+5 % PV max) dégâts d’énergie et sont projetés en l’air pendant 0,6 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.05 * h.maxHp; g.leap(h, x, y, 0.45, () => { g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.knockup(u, 0.6); }); g.fx('splash', { x: h.x, y: h.y, color: '#7fc8ff', dur: 0.6 }); g.fx('quake', { x: h.x, y: h.y, r: this.radius, dur: 0.5, color: '#9fd8ff' }); g.sfx('thud', h.x, h.y); }); g.sfx('spring', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range && d > 100 ? { x: tg.x, y: tg.y } : null; },
  },
  flood: {
    name: 'Rupture de digue', aim: 'line', range: 1100, width: 240, ult: true,
    cost: [100, 100, 100], cd: [120, 105, 90], dmg: [150, 250, 350],
    desc() { return `Après 0,6 s de préparation, libère une vague géante sur ${this.range} unités. Elle inflige ${fmt(this.dmg)} (+8 % PV max) dégâts d’énergie, emporte les ennemis sur 260 unités puis les étourdit 1 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.08 * h.maxHp, ang = Utils.angleTo(h.x, h.y, x, y);
      g.startChannel(h, { dur: 0.6, kind: 'windup', ang, length: this.range, width: this.width, onEnd: c => {
        if (c) return;
        g.skillshot(h, h.x + Math.cos(ang) * 200, h.y + Math.sin(ang) * 200, { range: this.range, speed: 900, width: this.width, pierce: true, visual: 'wave', onHit: u => { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.displace(u, u.x + Math.cos(ang) * 260, u.y + Math.sin(ang) * 260, 0.4, () => g.stun(u, 1)); } });
        g.sfx('quake', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { return D(h, tg) < 900 && (ctx.enemies.length >= 2 || tg.hp / tg.maxHp < 0.5) ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Néon =================
  arc: {
    name: 'Arc électrique', aim: 'target', range: 450,
    cost: [50, 55, 60, 65, 70], cd: [6, 5.5, 5, 4.5, 4], dmg: [70, 105, 140, 175, 210],
    desc() { return `Foudroie l’ennemi ciblé : ${fmt(this.dmg)} (+60 % puissance) dégâts d’énergie. L’arc rebondit sur 2 ennemis proches pour 60 % des dégâts, et charge chacun d’eux.`; },
    cast(g, h, r, x, y, target) {
      const dmg = this.dmg[r - 1] + 0.6 * h.st.ap, hit = new Set([target.id]); let from = h, cur = target, k = 1;
      for (let i = 0; i < 3 && cur; i++) {
        g.fx('lightning', { x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, dur: 0.25 }); g.damage(h, cur, dmg * k, 'magic'); from = cur; k = 0.6;
        let nx = null, nd = 300; for (const u of g.enemyUnits(h.team)) { if (hit.has(u.id) || !u.vis[h.team]) continue; const d = D(u, from); if (d < nd) { nd = d; nx = u; } }
        if (nx) hit.add(nx.id); cur = nx;
      }
      g.sfx('zap', h.x, h.y);
    },
    ai(g, h, tg) { return D(h, tg) < this.range + tg.radius ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m ? { x: m.x, y: m.y, target: m } : null; },
  },
  shortcircuit: {
    name: 'Court‑circuit', aim: 'circle', range: 520, radius: 180,
    cost: [70, 75, 80, 85, 90], cd: [12, 11, 10, 9, 8], dmg: [80, 120, 160, 200, 240],
    desc() { return `Balance une zone instable qui explose après 0,7 s : ${fmt(this.dmg)} (+70 % puissance) dégâts d’énergie dans un rayon de ${this.radius} et 40 % de ralentissement pendant 1,5 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.7 * h.st.ap; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 0, kind: 'mine', instant: true, onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); g.slow(u, 0.4, 1.5); }); g.fx('emp', { x: z.x, y: z.y, r: z.r, dur: 0.5 }); g.sfx('emp', z.x, z.y); } }); g.sfx('throw', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) > this.range + 40 ? null : pred(tg, 0.7); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  skates: {
    name: 'Patins', aim: 'line', range: 320, width: 30, escape: true,
    cost: [60, 60, 60, 60, 60], cd: [14, 13, 12, 11, 10], val: [40, 70, 100, 130, 160],
    desc() { return `File sur ses patins sur ${this.range} unités et gagne un bouclier de ${fmt(this.val)} (+40 % puissance) pendant 2 s. Sa prochaine compétence dans les 3 s ne coûte pas d’énergie.`; },
    cast(g, h, r, x, y) { g.startDash(h, x, y, { dist: this.range, speed: 1300 }); g.shield(h, this.val[r - 1] + 0.4 * h.st.ap, 2, h); h.pas.free = g.time + 3; g.sfx('roll', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d > 460 && d < 700 && tg.hp / tg.maxHp < 0.35 ? { x: tg.x, y: tg.y } : null; },
  },
  blackout: {
    name: 'Délestage', aim: 'self', radius: 550, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [180, 280, 380],
    desc() { return `Coupe le courant autour d’elle. Après 0,5 s, tous les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+80 % puissance) dégâts d’énergie et reçoivent trois charges : ils grillent tous en même temps.`; },
    cast(g, h, r) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ap;
      g.startChannel(h, { dur: 0.5, kind: 'windup', onEnd: c => {
        if (c) return;
        g.aoe(h.team, h.x, h.y, this.radius, u => { g.addCharge(u, h); g.addCharge(u, h); g.damage(h, u, dmg, 'magic'); });
        g.fx('emp', { x: h.x, y: h.y, r: this.radius, dur: 0.8 }); g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#7fdcff', dur: 0.6 }); g.sfx('thunder', h.x, h.y);
      } });
      g.sfx('charge', h.x, h.y);
    },
    ai(g, h, tg, ctx) { return D(h, tg) < this.radius - 80 && (near(ctx.enemies, h, this.radius - 60) >= 2 || tg.hp / tg.maxHp < 0.6) ? { x: h.x, y: h.y } : null; },
  },

  // ================= Sœur Cendre =================
  flamer: {
    name: 'Souffle sacré', aim: 'cone', range: 330, angle: 0.9,
    cost: [55, 60, 65, 70, 75], cd: [7, 6.5, 6, 5.5, 5], dmg: [60, 95, 130, 165, 200],
    desc() { return `Jet de flammes en cône : ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie, et les ennemis brûlent pendant 3 s (20 % des dégâts par seconde).`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, ang = Utils.angleTo(h.x, h.y, x, y); g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, this.angle / 2, this.range)) return; g.dot(u, 'burn', dmg * 0.2, 3, h); g.damage(h, u, dmg, 'magic'); }); g.fx('flame', { x: h.x, y: h.y, angle: ang, range: this.range, half: this.angle / 2, dur: 0.45 }); g.sfx('flame', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 2 ? { x: c[0].x, y: c[0].y } : null; },
  },
  molotov: {
    name: 'Cocktail', aim: 'circle', range: 480, radius: 150,
    cost: [70, 75, 80, 85, 90], cd: [13, 12, 11, 10, 9], dmg: [20, 30, 40, 50, 60],
    desc() { return `Bouteille enflammée : la zone (rayon ${this.radius}) brûle 3 s, inflige ${fmt(this.dmg)} (+15 % puissance) dégâts d’énergie toutes les 0,5 s, ralentit de 20 % et enflamme ceux qui s’y trouvent.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.15 * h.st.ap; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.35, dur: 3, every: 0.5, kind: 'fire', onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => { g.dot(u, 'burn', dmg * 0.4, 1.5, h); g.damage(h, u, dmg, 'magic'); g.slow(u, 0.2, 0.6); }) }); g.sfx('glass', x, y); },
    ai(g, h, tg) { return D(h, tg) > this.range ? null : pred(tg, 0.5); },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  ignite: {
    name: 'Combustion', aim: 'target', range: 450,
    cost: [60, 65, 70, 75, 80], cd: [9, 8.5, 8, 7.5, 7], dmg: [70, 110, 150, 190, 230],
    desc() { return `Fait exploser la cible : ${fmt(this.dmg)} (+60 % puissance) dégâts d’énergie, +50 % si elle brûle déjà. La cible s’enflamme.`; },
    cast(g, h, r, x, y, tg) { const burning = tg.status.burn && tg.status.burn.until > g.time; const dmg = (this.dmg[r - 1] + 0.6 * h.st.ap) * (burning ? 1.5 : 1); g.dot(tg, 'burn', dmg * 0.1, 3, h); g.damage(h, tg, dmg, 'magic'); g.fx('fireburst', { x: tg.x, y: tg.y, dur: 0.6, big: burning }); g.sfx('explosion', tg.x, tg.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y, target: tg } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range && x.kind === 'monster'); return m ? { x: m.x, y: m.y, target: m } : null; },
  },
  inferno: {
    name: 'Brasier', aim: 'circle', range: 650, radius: 280, ult: true,
    cost: [120, 120, 120], cd: [110, 95, 80], dmg: [200, 300, 400],
    desc() { return `La zone ciblée (rayon ${this.radius}) entre en éruption après 0,7 s : ${fmt(this.dmg)} (+80 % puissance) dégâts d’énergie, puis le sol brûle pendant 4 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.8 * h.st.ap;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 4, every: 0.5, kind: 'inferno', onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.dot(u, 'burn', dmg * 0.08, 1, h); g.damage(h, u, dmg, 'magic'); }); g.fx('fireburst', { x: z.x, y: z.y, dur: 0.9, big: true, r: z.r }); g.sfx('explosion', z.x, z.y); }, onTick: z => g.aoe(h.team, z.x, z.y, z.r, u => g.dot(u, 'burn', dmg * 0.08, 1, h)) });
      g.sfx('charge', x, y);
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 620 && (tg.hp / tg.maxHp < 0.6 || ctx.enemies.length >= 2) ? pred(tg, 0.7) : null; },
  },

  // ================= La Comtesse =================
  aimed: {
    name: 'Tir ajusté', aim: 'line', range: 950, width: 45,
    cost: [50, 55, 60, 65, 70], cd: [9, 8.25, 7.5, 6.75, 6], dmg: [80, 125, 170, 215, 260],
    desc() { return `Épaule pendant 0,4 s, puis tire une balle qui traverse tout sur ${this.range} unités : ${fmt(this.dmg)} (+90 % dégâts d’attaque) dégâts physiques, 30 % de moins après chaque cible traversée.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.9 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y);
      g.startChannel(h, { dur: 0.4, kind: 'windup', ang, length: this.range, width: this.width, onEnd: c => {
        if (c) return; let k = 1;
        g.skillshot(h, h.x + Math.cos(ang) * 100, h.y + Math.sin(ang) * 100, { range: this.range, speed: 2600, width: this.width, pierce: true, visual: 'sniper', onHit: u => { g.damage(h, u, dmg * k, 'phys'); k *= 0.7; } });
        g.fx('muzzle', { x: h.x, y: h.y, angle: ang, dur: 0.15 }); g.sfx('shotgun', h.x, h.y);
      } });
    },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range - 60 ? pred(tg, 0.4 + d / 2600) : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < 700); return c.length >= 3 && h.mana / h.maxMana > 0.6 ? { x: c[0].x, y: c[0].y } : null; },
  },
  curtsey: {
    name: 'Révérence', aim: 'line', range: 260, width: 30, escape: true,
    cost: [40, 40, 40, 40, 40], cd: [13, 12, 11, 10, 9], val: [30, 55, 80, 105, 130],
    desc() { return `Esquive gracieuse de ${this.range} unités. Sa prochaine attaque dans les 4 s inflige ${fmt(this.val)} dégâts physiques supplémentaires et devient un Tir d’honneur.`; },
    cast(g, h, r, x, y) { g.startDash(h, x, y, { dist: this.range, speed: 1100 }); h.empower = { until: g.time + 4, bonus: this.val[r - 1] }; h.pas.n = 3; g.sfx('roll', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d > h.st.range + 40 && d < h.st.range + 220 && tg.hp / tg.maxHp < 0.35 ? { x: tg.x, y: tg.y } : null; },
  },
  snare: {
    name: 'Piège de chasse', aim: 'circle', range: 420, radius: 40,
    cost: [50, 50, 50, 50, 50], cd: [14, 13, 12, 11, 10], dmg: [60, 100, 140, 180, 220],
    desc() { return `Enterre un piège invisible pour l’ennemi (2 au maximum). Le premier ennemi qui marche dessus est immobilisé 1,5 s et subit ${fmt(this.dmg)} (+50 % dégâts d’attaque) dégâts physiques.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ad;
      const z = g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.7, dur: 60, kind: 'trap', hidden: true, trigger: true,
        onTrigger: (u, zz) => { g.root(u, 1.5); g.damage(h, u, dmg, 'phys'); g.fx('snap', { x: zz.x, y: zz.y, dur: 0.8 }); g.sfx('trap', zz.x, zz.y); } });
      h.traps = h.traps.filter(t => !t.dead); h.traps.push(z); if (h.traps.length > 2) h.traps.shift().dead = true;
    },
    ai(g, h, tg) { return D(h, tg) > this.range ? null : pred(tg, 0.6); },
  },
  lastbullet: {
    name: 'Dernière balle', aim: 'target', range: 1800, ult: true, heroOnly: true,
    cost: [100, 100, 100], cd: [110, 95, 80], dmg: [250, 375, 500],
    desc() { return `Vise un héros ennemi visible pendant 1 s, puis tire : ${fmt(this.dmg)} (+90 % dégâts d’attaque) dégâts physiques, plus 25 % des PV qui manquent à la cible. Être étourdie interrompt la visée.`; },
    cast(g, h, r, x, y, tg) {
      const base = this.dmg[r - 1] + 0.9 * h.st.ad;
      g.fx('tether', { src: h, target: tg, dur: 1, color: '#ff3a2a', thin: true });
      g.startChannel(h, { dur: 1, kind: 'aim', onEnd: c => {
        if (c || tg.dead) return;
        g.homing(h, tg, { speed: 3200, visual: 'sniper', onHit: u => { g.damage(h, u, base + 0.25 * (u.maxHp - u.hp), 'phys'); g.fx('impact', { x: u.x, y: u.y, size: 44 }); } });
        g.fx('muzzle', { x: h.x, y: h.y, angle: Utils.angleTo(h.x, h.y, tg.x, tg.y), dur: 0.2 }); g.sfx('shotgun', h.x, h.y);
      } });
    },
    ai(g, h, tg, ctx) { return D(h, tg) < this.range && tg.hp / tg.maxHp < 0.4 && !ctx.enemies.some(e => D(e, h) < 450) ? { x: tg.x, y: tg.y, target: tg } : null; },
  },

  // ================= Gros Gaspard =================
  burst: {
    name: 'Rafale', aim: 'cone', range: 480, angle: 0.7,
    cost: [50, 50, 55, 55, 60], cd: [8, 7.5, 7, 6.5, 6], dmg: [60, 95, 130, 165, 200],
    desc() { return `Arrose un cône devant lui : ${fmt(this.dmg)} (+90 % dégâts d’attaque) dégâts physiques à chaque ennemi touché. Gagne 2 cumuls d’Échauffement.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.9 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y), half = this.angle / 2; g.aoe(h.team, h.x, h.y, this.range, u => { if (inCone(h, u, ang, half, this.range)) g.damage(h, u, dmg, 'phys'); }); PASSIVES.warmup.add(h, 2); g.fx('volley', { x: h.x, y: h.y, angle: ang, range: this.range, half, dur: 0.2 }); g.sfx('volley', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range - 20 ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range - 40); return c.length >= 3 ? { x: c[0].x, y: c[0].y } : null; },
  },
  dugin: {
    name: 'En position', aim: 'self', radius: 0,
    cost: [60, 60, 60, 60, 60], cd: [16, 15, 14, 13, 12], val: [80, 100, 120, 140, 160],
    desc() { return `Plante son trépied pendant 4 s : +${fmt(this.val)} de portée d’attaque et 20 % de dégâts subis en moins, mais 30 de vitesse de déplacement en moins.`; },
    cast(g, h, r) { g.addBuff(h, { id: 'dugin', dur: 4, stats: { range: this.val[r - 1], ms: -30 } }); h.status.dr = { pct: 0.2, until: g.time + 4 }; g.sfx('build', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d < h.st.range + 140 && d > h.st.range - 60 && h.hp / h.maxHp > 0.4 ? { x: h.x, y: h.y } : null; },
  },
  grenade: {
    name: 'Grenade de cuisine', aim: 'circle', range: 600, radius: 160,
    cost: [60, 60, 60, 60, 60], cd: [12, 11.5, 11, 10.5, 10], dmg: [70, 110, 150, 190, 230],
    desc() { return `Lance une cocotte‑minute piégée qui explose après 0,55 s : ${fmt(this.dmg)} (+60 % dégâts d’attaque) dégâts physiques dans un rayon de ${this.radius}, et les ennemis sont repoussés du centre.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.6 * h.st.ad; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.55, dur: 0, kind: 'mine', instant: true, onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'phys'); if (!u.dead) g.knockback(u, z.x, z.y, 140, 0.25); }); g.fx('explosion', { x: z.x, y: z.y, size: z.r, dur: 0.7 }); g.sfx('explosion', z.x, z.y); } }); g.sfx('throw', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? pred(tg, 0.55) : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range); return c.length >= 4 ? { x: c[0].x, y: c[0].y } : null; },
  },
  barrage: {
    name: 'Tir de barrage', aim: 'cone', range: 520, angle: 1.0, ult: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [22, 32, 42],
    desc() { return `Immobile pendant 3 s, il vide son chargeur sur un cône : 20 salves de ${fmt(this.dmg)} (+14 % dégâts d’attaque) dégâts physiques qui ralentissent de 20 %. Se déplacer interrompt le tir.`; },
    cast(g, h, r, x, y) {
      const ang = Utils.angleTo(h.x, h.y, x, y), per = this.dmg[r - 1] + 0.14 * h.st.ad, range = this.range, half = this.angle / 2; let k = 0;
      g.startChannel(h, { dur: 3, every: 0.15, kind: 'cone', ang, range, half, cancelOnMove: true, onTick: () => {
        g.aoe(h.team, h.x, h.y, range, u => { if (inCone(h, u, ang, half, range)) { g.damage(h, u, per, 'phys'); g.slow(u, 0.2, 0.5); } });
        if ((k++ & 1) === 0) { g.fx('volley', { x: h.x, y: h.y, angle: ang, range, half, dur: 0.18 }); g.sfx('volley', h.x, h.y); }
      } });
    },
    ai(g, h, tg, ctx) { const d = D(h, tg); return d < 470 && (tg.hp / tg.maxHp < 0.5 || ctx.enemies.length >= 2) ? { x: tg.x, y: tg.y } : null; },
  },

  // ================= Doc Suture =================
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
  transfusion: {
    name: 'Transfusion', aim: 'ally', range: 550,
    cost: [60, 65, 70, 75, 80], cd: [14, 13, 12, 11, 10], heal: [80, 120, 160, 200, 240],
    desc() { return `Branche une poche de sang sur un héros allié (ou sur lui‑même) : il récupère ${fmt(this.heal)} (+50 % puissance) PV en 3 s et gagne 20 % de vitesse pendant 2 s.`; },
    cast(g, h, r, x, y, target) { const u = target || h, total = (this.heal[r - 1] + 0.5 * h.st.ap) * (1 + (h.st.healPower || 0)) * g.healMod(h, u); g.hot(u, total, 3, h); g.haste(u, 0.2, 2); if (u !== h) g.fx('tether', { src: h, target: u, dur: 0.8, color: '#e84a4a' }); g.fx('healBurst', { target: u, dur: 3 }); g.sfx('heal', u.x, u.y); },
    aiSupport(g, h, allies, enemies) { const a = allies.filter(x => x.hp / x.maxHp < 0.6 && D(x, h) < this.range && (enemies.length || x.hp / x.maxHp < 0.4)).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; return a ? { x: a.x, y: a.y, target: a } : null; },
  },
  sleepgas: {
    name: 'Gaz anesthésiant', aim: 'circle', range: 500, radius: 160,
    cost: [70, 75, 80, 85, 90], cd: [16, 15, 14, 13, 12], dmg: [50, 80, 110, 140, 170], stun: [1, 1.1, 1.2, 1.3, 1.4],
    desc() { return `Lance une ampoule de gaz qui éclate après 0,6 s : les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie et s’endorment ${fmt(this.stun)} s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ap, st = this.stun[r - 1]; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.6, dur: 0, kind: 'gas', instant: true, onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.stun(u, st); }); g.fx('splash', { x: z.x, y: z.y, color: '#b89ae8', dur: 0.6 }); g.sfx('glass', z.x, z.y); } }); g.sfx('throw', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range + 20 ? pred(tg, 0.6) : null; },
  },
  revive: {
    name: 'Réanimation', aim: 'ally', range: 900, ult: true,
    cost: [100, 100, 100], cd: [120, 100, 80], heal: [200, 300, 400],
    desc() { return `Un héros allié (ou lui‑même) ne peut plus descendre sous 1 PV pendant 2,5 s, puis récupère ${fmt(this.heal)} (+60 % puissance) PV.`; },
    cast(g, h, r, x, y, target) { const u = target || h, heal = this.heal[r - 1] + 0.6 * h.st.ap; u.status.undying = g.time + 2.5; g.fx('undying', { target: u, dur: 2.5 }); g.after(2.5, () => { if (!u.dead) { g.heal(h, u, heal); g.fx('healBurst', { target: u, dur: 1.2 }); g.sfx('heal', u.x, u.y); } }); g.sfx('stim', u.x, u.y); },
    aiSupport(g, h, allies, enemies) { const a = allies.filter(x => x.hp / x.maxHp < 0.25 && D(x, h) < this.range && enemies.some(e => D(e, x) < 600)).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; return a ? { x: a.x, y: a.y, target: a } : null; },
  },

  // ================= Le Crieur =================
  feedback: {
    name: 'Larsen', aim: 'cone', range: 400, angle: 0.8,
    cost: [55, 60, 65, 70, 75], cd: [8, 7.5, 7, 6.5, 6], dmg: [60, 95, 130, 165, 200],
    desc() { return `Larsen strident en cône : ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie, et les ennemis touchés sont repoussés de 120 unités.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, ang = Utils.angleTo(h.x, h.y, x, y), half = this.angle / 2; g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, half, this.range)) return; g.damage(h, u, dmg, 'magic'); if (!u.dead) g.knockback(u, h.x, h.y, 120, 0.25); }); g.fx('sonic', { x: h.x, y: h.y, angle: ang, range: this.range, half, dur: 0.45 }); g.sfx('horn', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range - 20 ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const c = ms.filter(m => D(m, h) < this.range - 40); return c.length >= 3 && h.mana / h.maxMana > 0.6 ? { x: c[0].x, y: c[0].y } : null; },
  },
  anthem: {
    name: 'Hymne', aim: 'self', radius: 600,
    cost: [70, 70, 70, 70, 70], cd: [18, 17, 16, 15, 14], as: [0.15, 0.2, 0.25, 0.3, 0.35],
    desc() { return `Passe l’hymne du convoi à plein volume : les héros alliés dans un rayon de ${this.radius} gagnent 30 % de vitesse et +${pct(this.as)} de vitesse d’attaque pendant 3 s.`; },
    cast(g, h, r) { for (const a of g.heroes) if (!a.dead && a.team === h.team && D(a, h) <= this.radius) { g.addBuff(a, { id: 'anthem', dur: 3, stats: { as: this.as[r - 1] } }); g.haste(a, 0.3, 3); g.fx('adrenaline', { target: a, dur: 2 }); } g.fx('pulse', { x: h.x, y: h.y, r: this.radius, color: '#ffd24a', dur: 0.7 }); g.sfx('horn', h.x, h.y); },
    aiSupport(g, h, allies, enemies) { return enemies.length && allies.filter(a => a !== h && D(a, h) < this.radius && enemies.some(e => D(e, a) < 500)).length >= 1 ? { x: h.x, y: h.y } : null; },
  },
  jamming: {
    name: 'Interférences', aim: 'circle', range: 550, radius: 170,
    cost: [70, 75, 80, 85, 90], cd: [14, 13, 12, 11, 10], dmg: [40, 70, 100, 130, 160], sil: [1.2, 1.3, 1.4, 1.5, 1.6],
    desc() { return `Brouille les ondes de la zone : les ennemis dans un rayon de ${this.radius} subissent ${fmt(this.dmg)} (+40 % puissance) dégâts d’énergie et sont réduits au silence ${fmt(this.sil)} s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.4 * h.st.ap, s = this.sil[r - 1]; g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.25, dur: 0, instant: true, onArm: z => { g.aoe(h.team, z.x, z.y, z.r, u => { g.damage(h, u, dmg, 'magic'); g.silence(u, s); }); g.fx('emp', { x: z.x, y: z.y, r: z.r, dur: 0.5, color: '#ffd24a' }); g.sfx('zap', z.x, z.y); } }); },
    ai(g, h, tg) { return D(h, tg) < this.range + 30 ? pred(tg, 0.25) : null; },
  },
  soundwall: {
    name: 'Mur du son', aim: 'line', range: 900, width: 260, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], dmg: [120, 200, 280], val: [100, 175, 250],
    desc() { return `Envoie une onde sonore géante sur ${this.range} unités. Les ennemis traversés subissent ${fmt(this.dmg)} (+50 % puissance) dégâts d’énergie et sont étourdis 1,25 s ; les alliés traversés reçoivent un bouclier de ${fmt(this.val)} (+40 % puissance).`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ap, sh = this.val[r - 1] + 0.4 * h.st.ap;
      g.skillshot(h, x, y, { range: this.range, speed: 1100, width: this.width, pierce: true, hitAllies: true, visual: 'sound', onHit: u => { if (u.team === h.team) g.shield(u, sh, 3, h); else { g.damage(h, u, dmg, 'magic'); if (!u.dead) g.stun(u, 1.25); } } });
      g.shield(h, sh, 3, h); g.sfx('horn', h.x, h.y);
    },
    ai(g, h, tg, ctx) { return D(h, tg) < 750 && (ctx.enemies.length >= 2 || tg.hp / tg.maxHp < 0.5) ? pred(tg, D(h, tg) / 1100) : null; },
  },

  // ================= Balafre =================
  lunge: {
    name: 'Fente', aim: 'line', range: 320, width: 70,
    cost: [40, 40, 45, 45, 50], cd: [8, 7.5, 7, 6.5, 6], dmg: [60, 95, 130, 165, 200],
    desc() { return `Traverse ${this.range} unités d’une fente : ${fmt(this.dmg)} (+90 % dégâts d’attaque) dégâts physiques à chaque ennemi traversé. Toucher un héros rend 1,5 s de délai.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.9 * h.st.ad; let hero = false;
      g.startDash(h, x, y, { dist: this.range, speed: 1400, fixed: true, onTouch: u => { g.damage(h, u, dmg, 'phys'); g.fx('slash', { x: u.x, y: u.y, angle: h.angle, dur: 0.25, big: true }); if (u.kind === 'hero' && !hero) { hero = true; h.cds[0] = Math.max(0, h.cds[0] - 1.5); } return false; } });
      g.sfx('swipe', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < 300 ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.filter(x => D(x, h) < 300); return m.length >= 2 ? { x: m[0].x, y: m[0].y } : null; },
  },
  counter: {
    name: 'Contre', aim: 'self', radius: 220,
    cost: [50, 50, 50, 50, 50], cd: [16, 15, 14, 13, 12], dmg: [60, 95, 130, 165, 200],
    desc() { return `Se met en garde 1,2 s sans bouger : il ne subit aucun dégât. Ensuite, il frappe autour de lui (rayon ${this.radius}) pour ${fmt(this.dmg)} (+60 % dégâts d’attaque, +50 % des dégâts parés) dégâts physiques, et les héros qui l’ont frappé sont étourdis 0,75 s.`; },
    cast(g, h, r) {
      const base = this.dmg[r - 1] + 0.6 * h.st.ad, p = h.status.parry = { until: g.time + 1.2, blocked: 0, hitters: new Set() };
      h.status.root = Math.max(h.status.root, g.time + 1.2); h.order = null; g.fx('shield', { target: h, dur: 1.2 });
      g.after(1.2, () => {
        if (h.dead) return; h.status.parry = null;
        const dmg = base + 0.5 * p.blocked;
        g.aoe(h.team, h.x, h.y, this.radius, u => { g.damage(h, u, dmg, 'phys'); if (p.hitters.has(u) && !u.dead) g.stun(u, 0.75); });
        g.fx('whirl', { x: h.x, y: h.y, r: this.radius, dur: 0.35 }); g.sfx('swipe', h.x, h.y);
      });
      g.sfx('metal', h.x, h.y);
    },
    ai(g, h, tg, ctx) { return near(ctx.enemies, h, 300) >= 1 && g.time - h.lastHit < 0.6 ? { x: h.x, y: h.y } : null; },
  },
  whirl: {
    name: 'Moulinet', aim: 'self', radius: 220,
    cost: [50, 50, 50, 50, 50], cd: [10, 9, 8, 7, 6], dmg: [50, 80, 110, 140, 170],
    desc() { return `Fait tournoyer sa lame : ${fmt(this.dmg)} (+70 % dégâts d’attaque) dégâts physiques et 30 % de ralentissement pendant 1 s autour de lui (rayon ${this.radius}). Il récupère 20 % des dégâts infligés aux héros.`; },
    cast(g, h, r) { const dmg = this.dmg[r - 1] + 0.7 * h.st.ad; g.aoe(h.team, h.x, h.y, this.radius, u => { const d = g.damage(h, u, dmg, 'phys'); g.slow(u, 0.3, 1); if (u.kind === 'hero') g.heal(h, h, d * 0.2); }); g.fx('whirl', { x: h.x, y: h.y, r: this.radius, dur: 0.35 }); g.sfx('swipe', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.radius - 10 ? { x: h.x, y: h.y } : null; },
    aiFarm(g, h, ms) { return near(ms, h, this.radius) >= 2 ? { x: h.x, y: h.y } : null; },
  },
  ticket: {
    name: 'Ticket de sortie', aim: 'target', range: 450, ult: true, heroOnly: true,
    cost: [100, 100, 100], cd: [100, 85, 70], dmg: [70, 110, 150],
    desc() { return `Fond sur un héros ennemi et le frappe trois fois en 0,6 s, intouchable pendant l’assaut : ${fmt(this.dmg)} (+50 % dégâts d’attaque) dégâts physiques par coup, et le dernier ajoute 15 % des PV qui manquent à la cible.`; },
    cast(g, h, r, x, y, tg) {
      const per = this.dmg[r - 1] + 0.5 * h.st.ad;
      h.status.invuln = g.time + 0.75; h.status.root = Math.max(h.status.root, g.time + 0.7); h.order = null;
      [0, 0.25, 0.5].forEach((dt, i) => g.after(dt, () => {
        if (tg.dead || h.dead) return;
        const a = Utils.angleTo(tg.x, tg.y, h.x, h.y) + Math.PI * (0.6 + i * 0.4), d = tg.radius + h.radius + 16;
        g.fx('blink', { x: h.x, y: h.y, dur: 0.3 });
        h.x = h.px = tg.x + Math.cos(a) * d; h.y = h.py = tg.y + Math.sin(a) * d; MAP.resolve(h); h.angle = Utils.angleTo(h.x, h.y, tg.x, tg.y); h.attackAnim = g.time;
        g.damage(h, tg, per + (i === 2 ? 0.15 * (tg.maxHp - tg.hp) : 0), 'phys');
        g.fx('slash', { x: tg.x, y: tg.y, angle: h.angle, dur: 0.3, big: true }); g.sfx('swipe', tg.x, tg.y);
      }));
    },
    ai(g, h, tg) { return D(h, tg) < this.range && tg.hp / tg.maxHp < 0.5 ? { x: tg.x, y: tg.y, target: tg } : null; },
  },

  // ================= Capitaine Vase =================
  slash: {
    name: 'Coup de sabre', aim: 'cone', range: 200, angle: 1.6,
    cost: [40, 40, 45, 45, 50], cd: [6, 5.5, 5, 4.5, 4], dmg: [60, 95, 130, 165, 200],
    desc() { return `Large revers de sabre devant elle : ${fmt(this.dmg)} (+80 % dégâts d’attaque) dégâts physiques et 25 % de ralentissement pendant 1 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.8 * h.st.ad, ang = Utils.angleTo(h.x, h.y, x, y); g.aoe(h.team, h.x, h.y, this.range, u => { if (!inCone(h, u, ang, this.angle / 2, this.range)) return; g.damage(h, u, dmg, 'phys'); g.slow(u, 0.25, 1); }); g.fx('swipe', { x: h.x, y: h.y, angle: ang, range: this.range, dur: 0.25, color: '#e8e0c8' }); g.sfx('swipe', h.x, h.y); },
    ai(g, h, tg) { return D(h, tg) < this.range ? { x: tg.x, y: tg.y } : null; },
    aiFarm(g, h, ms) { const m = ms.find(x => D(x, h) < this.range); return m ? { x: m.x, y: m.y } : null; },
  },
  pistol: {
    name: 'Pistolet à silex', aim: 'line', range: 700, width: 40,
    cost: [50, 50, 55, 55, 60], cd: [10, 9, 8, 7, 6], dmg: [70, 110, 150, 190, 230],
    desc() { return `Tire une balle de plomb : le premier ennemi touché subit ${fmt(this.dmg)} (+70 % dégâts d’attaque) dégâts physiques et encaisse 15 % de dégâts en plus de sa part pendant 4 s.`; },
    cast(g, h, r, x, y) { const dmg = this.dmg[r - 1] + 0.7 * h.st.ad; g.skillshot(h, x, y, { range: this.range, speed: 2000, width: this.width, visual: 'bullet', onHit: u => { g.damage(h, u, dmg, 'phys'); g.amp(u, 0.15, 4, h, 'powder'); g.fx('impact', { x: u.x, y: u.y, size: 26 }); } }); g.fx('muzzle', { x: h.x, y: h.y, angle: Utils.angleTo(h.x, h.y, x, y), dur: 0.15 }); g.sfx('rifle', h.x, h.y); },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range - 40 ? pred(tg, d / 2000) : null; },
  },
  boarding: {
    name: 'Grappin d’abordage', aim: 'line', range: 520, width: 50,
    cost: [60, 60, 60, 60, 60], cd: [14, 13, 12, 11, 10], dmg: [50, 80, 110, 140, 170],
    desc() { return `Lance un grappin. S’il accroche un ennemi, il subit ${fmt(this.dmg)} (+50 % dégâts d’attaque) dégâts physiques et elle se hisse jusqu’à lui.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ad;
      g.skillshot(h, x, y, { range: this.range, speed: 1600, width: this.width, visual: 'hook', onHit: u => {
        g.damage(h, u, dmg, 'phys'); g.fx('tether', { src: h, target: u, dur: 0.35, color: '#8a7a5a' });
        const a = Utils.angleTo(u.x, u.y, h.x, h.y), dd = h.radius + u.radius + 10; g.pull(h, u.x + Math.cos(a) * dd, u.y + Math.sin(a) * dd, 1600);
      } });
      g.sfx('throw', h.x, h.y);
    },
    ai(g, h, tg) { const d = D(h, tg); return d < this.range - 40 && d > 200 && h.hp / h.maxHp > 0.4 ? pred(tg, d / 1600) : null; },
  },
  broadside: {
    name: 'Bordée', aim: 'circle', range: 750, radius: 300, ult: true,
    cost: [100, 100, 100], cd: [110, 95, 80], dmg: [90, 140, 190],
    desc() { return `Son voilier des sables tire une bordée sur la zone : après 0,8 s, 8 boulets tombent en 1,6 s. Chacun inflige ${fmt(this.dmg)} (+50 % dégâts d’attaque) dégâts physiques dans un rayon de 110 et projette en l’air 0,35 s.`; },
    cast(g, h, r, x, y) {
      const dmg = this.dmg[r - 1] + 0.5 * h.st.ad; let n = 0;
      g.addZone({ team: h.team, src: h, x, y, r: this.radius, delay: 0.8, dur: 1.65, every: 0.2, kind: 'bombard', onTick: z => {
        if (n++ >= 8) return;
        const heroes = g.heroes.filter(e => !e.dead && e.team !== h.team && D(e, z) <= z.r); let px, py;
        if (heroes.length && Math.random() < 0.6) { const e = Utils.pick(heroes); px = e.x + Utils.rand(-40, 40); py = e.y + Utils.rand(-40, 40); }
        else { const a = Utils.rand(0, 6.28), d = Math.sqrt(Math.random()) * z.r; px = z.x + Math.cos(a) * d; py = z.y + Math.sin(a) * d; }
        g.aoe(h.team, px, py, 110, u => { g.damage(h, u, dmg, 'phys'); if (!u.dead) g.knockup(u, 0.35); });
        g.fx('explosion', { x: px, y: py, size: 70, dur: 0.6 }); g.sfx('explosion', px, py);
      } });
      g.sfx('horn', h.x, h.y);
    },
    ai(g, h, tg, ctx) { return D(h, tg) < this.range && (near(ctx.enemies, tg, this.radius) >= 2 || tg.hp / tg.maxHp < 0.5) ? pred(tg, 0.8) : null; },
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
