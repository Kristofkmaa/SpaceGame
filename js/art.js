// ============ Art vectoriel : vaisseaux, structures, icônes stratégiques ============
// Toutes les formes sont définies dans un repère normalisé (rayon = 1), pointant vers +x.
const Art = {
  M: pts => pts.map(p => [p[0], -p[1]]),   // miroir vertical

  ships: {
    collector: {
      layers: [
        { k: 'hull', p: [[0.9, 0.5], [0.5, 0.9], [-0.9, 0.9], [-0.9, -0.9], [0.5, -0.9], [0.9, -0.5]] },
        { k: 'stripe', p: [[-0.9, 0.9], [-0.55, 0.9], [-0.55, -0.9], [-0.9, -0.9]] },
        { k: 'dark', p: [[0.9, 0.5], [1.45, 0.85], [1.45, 0.6], [0.95, 0.3]] },
        { k: 'dark', p: [[0.9, -0.5], [1.45, -0.85], [1.45, -0.6], [0.95, -0.3]] },
        { k: 'bay', p: [[0.4, 0.35], [-0.3, 0.35], [-0.3, -0.35], [0.4, -0.35]] },
      ],
      engines: [[-0.95, 0.45, 0.3], [-0.95, -0.45, 0.3]],
    },
    scout: {
      layers: [
        { k: 'hull', p: [[1.3, 0], [-0.5, 0.45], [-1.0, 0.3], [-1.0, -0.3], [-0.5, -0.45]] },
        { k: 'stripe', p: [[0.3, 0], [-0.5, 0.28], [-0.5, -0.28]] },
        { k: 'glow', c: [1.05, 0, 0.12] },
      ],
      engines: [[-1.0, 0, 0.35]],
    },
    interceptor: {
      layers: [
        { k: 'hull', p: [[1.15, 0], [0.2, 0.3], [-0.4, 0.95], [-0.95, 1.0], [-0.75, 0.3], [-0.95, 0], [-0.75, -0.3], [-0.95, -1.0], [-0.4, -0.95], [0.2, -0.3]] },
        { k: 'stripe', p: [[-0.45, 0.95], [-0.95, 1.0], [-0.85, 0.65], [-0.55, 0.6]] },
        { k: 'stripe', p: [[-0.45, -0.95], [-0.95, -1.0], [-0.85, -0.65], [-0.55, -0.6]] },
        { k: 'dark', p: [[0.6, 0], [0.1, 0.18], [-0.2, 0.12], [-0.2, -0.12], [0.1, -0.18]] },
      ],
      engines: [[-0.8, 0.3, 0.28], [-0.8, -0.3, 0.28]],
    },
    corvette: {
      layers: [
        { k: 'dark', p: [[0.35, 0.55], [-0.55, 0.55], [-0.65, 1.0], [0.25, 1.0]] },
        { k: 'dark', p: [[0.35, -0.55], [-0.55, -0.55], [-0.65, -1.0], [0.25, -1.0]] },
        { k: 'hull', p: [[1.0, 0], [0.55, 0.45], [-0.75, 0.55], [-1.0, 0.3], [-1.0, -0.3], [-0.75, -0.55], [0.55, -0.45]] },
        { k: 'stripe', p: [[0.3, 0.62], [-0.1, 0.62], [-0.15, 0.93], [0.25, 0.93]] },
        { k: 'stripe', p: [[0.3, -0.62], [-0.1, -0.62], [-0.15, -0.93], [0.25, -0.93]] },
        { k: 'dark', p: [[0.55, 0.15], [0.1, 0.2], [0.1, -0.2], [0.55, -0.15]] },
        { k: 'turret', c: [-0.2, 0, 0.16], barrels: 2, len: 0.45 },
      ],
      engines: [[-0.95, 0.15, 0.25], [-0.95, -0.15, 0.25]],
    },
    assault: {
      layers: [
        { k: 'hull', p: [[1.45, 0], [1.05, 0.32], [-0.1, 0.42], [-0.5, 0.8], [-1.2, 0.8], [-1.35, 0.35], [-1.35, -0.35], [-1.2, -0.8], [-0.5, -0.8], [-0.1, -0.42], [1.05, -0.32]] },
        { k: 'stripe', p: [[-0.5, 0.8], [-1.2, 0.8], [-1.2, 0.55], [-0.55, 0.55]] },
        { k: 'stripe', p: [[-0.5, -0.8], [-1.2, -0.8], [-1.2, -0.55], [-0.55, -0.55]] },
        { k: 'dark', p: [[0.5, 0.2], [-0.4, 0.26], [-0.4, -0.26], [0.5, -0.2]] },
        { k: 'lights', p: [[0.3, 0.3], [0.0, 0.33], [-0.3, 0.33], [0.3, -0.3], [0.0, -0.33], [-0.3, -0.33]] },
        { k: 'turret', c: [0.15, 0, 0.17], barrels: 1, len: 0.5 },
      ],
      engines: [[-1.3, 0.2, 0.3], [-1.3, -0.2, 0.3]],
    },
    ion: {
      layers: [
        { k: 'hull', p: [[1.7, 0.14], [1.7, -0.14], [1.0, -0.4], [-0.3, -0.5], [-1.2, -0.75], [-1.35, -0.25], [-1.35, 0.25], [-1.2, 0.75], [-0.3, 0.5], [1.0, 0.4]] },
        { k: 'dark', p: [[-0.3, 0.5], [-1.2, 0.75], [-1.1, 0.45], [-0.4, 0.3]] },
        { k: 'dark', p: [[-0.3, -0.5], [-1.2, -0.75], [-1.1, -0.45], [-0.4, -0.3]] },
        { k: 'stripe', p: [[1.0, 0.1], [-1.0, 0.14], [-1.0, -0.14], [1.0, -0.1]] },
        { k: 'lights', p: [[0.5, 0.3], [0.2, 0.33], [-0.1, 0.36], [0.5, -0.3], [0.2, -0.33], [-0.1, -0.36]] },
        { k: 'glow', c: [1.6, 0, 0.17] },
      ],
      engines: [[-1.3, 0, 0.4]],
    },
    destroyer: {
      layers: [
        { k: 'hull', p: [[1.6, 0], [1.25, 0.28], [0.7, 0.4], [0.35, 0.72], [-0.45, 0.78], [-0.8, 0.52], [-1.3, 0.62], [-1.45, 0.22], [-1.45, -0.22], [-1.3, -0.62], [-0.8, -0.52], [-0.45, -0.78], [0.35, -0.72], [0.7, -0.4], [1.25, -0.28]] },
        { k: 'dark', p: [[0.75, 0.18], [-0.65, 0.28], [-0.65, -0.28], [0.75, -0.18]] },
        { k: 'stripe', p: [[1.25, 0.28], [0.7, 0.4], [0.7, 0.3], [1.15, 0.2]] },
        { k: 'stripe', p: [[1.25, -0.28], [0.7, -0.4], [0.7, -0.3], [1.15, -0.2]] },
        { k: 'stripe', p: [[-1.3, 0.62], [-1.45, 0.22], [-1.3, 0.22], [-1.15, 0.5]] },
        { k: 'stripe', p: [[-1.3, -0.62], [-1.45, -0.22], [-1.3, -0.22], [-1.15, -0.5]] },
        { k: 'lights', p: [[0.5, 0.5], [0.2, 0.55], [-0.1, 0.6], [-0.4, 0.6], [0.5, -0.5], [0.2, -0.55], [-0.1, -0.6], [-0.4, -0.6]] },
        { k: 'turret', c: [0.55, 0, 0.2], barrels: 2, len: 0.55 },
        { k: 'turret', c: [-0.35, 0, 0.2], barrels: 2, len: 0.55 },
      ],
      engines: [[-1.4, 0.35, 0.3], [-1.4, 0, 0.35], [-1.4, -0.35, 0.3]],
    },
  },

  structures: {
    mothership: {
      layers: [
        { k: 'hull', p: [[1.0, 0], [0.85, 0.22], [0.35, 0.32], [0.15, 0.72], [-0.45, 0.78], [-0.65, 0.45], [-1.0, 0.38], [-1.0, -0.38], [-0.65, -0.45], [-0.45, -0.78], [0.15, -0.72], [0.35, -0.32], [0.85, -0.22]] },
        { k: 'stripe', p: [[0.15, 0.72], [-0.45, 0.78], [-0.45, 0.62], [0.1, 0.58]] },
        { k: 'stripe', p: [[0.15, -0.72], [-0.45, -0.78], [-0.45, -0.62], [0.1, -0.58]] },
        { k: 'stripe', p: [[-1.0, 0.38], [-0.65, 0.45], [-0.65, 0.3], [-1.0, 0.25]] },
        { k: 'stripe', p: [[-1.0, -0.38], [-0.65, -0.45], [-0.65, -0.3], [-1.0, -0.25]] },
        { k: 'dark', p: [[0.7, 0.1], [0.3, 0.14], [-0.35, 0.16], [-0.35, -0.16], [0.3, -0.14], [0.7, -0.1]] },
        { k: 'lights', p: [[-0.5, 0.45], [-0.3, 0.47], [-0.1, 0.5], [0.1, 0.5], [0.3, 0.42], [-0.5, -0.45], [-0.3, -0.47], [-0.1, -0.5], [0.1, -0.5], [0.3, -0.42], [-0.8, 0.2], [-0.8, -0.2]] },
        { k: 'bayLights' },
        { k: 'dish', c: [-0.15, 0, 0.12] },
      ],
      engines: [[-1.0, 0.1, 0.25], [-1.0, -0.1, 0.25]],
    },
    shipyard: {
      layers: [
        { k: 'hull', p: [[1.0, 0.28], [-1.0, 0.28], [-1.0, 0.55], [1.0, 0.55]] },
        { k: 'hull', p: [[1.0, -0.28], [-1.0, -0.28], [-1.0, -0.55], [1.0, -0.55]] },
        { k: 'dark', p: [[-0.95, 0.28], [-0.72, 0.28], [-0.72, -0.28], [-0.95, -0.28]] },
        { k: 'dark', p: [[0.72, 0.28], [0.95, 0.28], [0.95, -0.28], [0.72, -0.28]] },
        { k: 'stripe', p: [[1.0, 0.28], [0.62, 0.28], [0.62, 0.55], [1.0, 0.55]] },
        { k: 'stripe', p: [[1.0, -0.28], [0.62, -0.28], [0.62, -0.55], [1.0, -0.55]] },
        { k: 'stripe', p: [[-1.0, 0.28], [-0.62, 0.28], [-0.62, 0.55], [-1.0, 0.55]] },
        { k: 'stripe', p: [[-1.0, -0.28], [-0.62, -0.28], [-0.62, -0.55], [-1.0, -0.55]] },
        { k: 'lights', p: [[0.4, 0.42], [0.0, 0.42], [-0.4, 0.42], [0.4, -0.42], [0.0, -0.42], [-0.4, -0.42]] },
        { k: 'gantry' },
      ],
      engines: [],
    },
    turret: {
      layers: [
        { k: 'hull', hex: 1.0 },
        { k: 'stripe', hex: 0.55 },
        { k: 'turret', c: [0, 0, 0.42], barrels: 2, len: 1.4 },
      ],
      engines: [],
    },
    research: {
      layers: [
        { k: 'ring', r: 1.0 },
        { k: 'hull', p: [[0.5, 0.12], [-0.5, 0.12], [-0.5, -0.12], [0.5, -0.12]] },
        { k: 'hull', p: [[0.12, 0.5], [0.12, -0.5], [-0.12, -0.5], [-0.12, 0.5]] },
        { k: 'core', c: [0, 0, 0.42] },
        { k: 'orbit' },
      ],
      engines: [],
    },
    relay: {
      layers: [
        { k: 'hull', hex: 0.8 },
        { k: 'stripe', p: [[0.8, 0], [0.3, 0.45], [0.3, -0.45]] },
        { k: 'dishBig' },
      ],
      engines: [],
    },
  },

  // ---------- Rendu d'un vaisseau à l'origine, orienté +x ----------
  drawShip(ctx, type, faction, r, o = {}) {
    const def = Art.ships[type]; if (!def) return;
    const col = FACTION_COLORS[faction];
    const t = o.time || 0;
    if (o.moving && def.engines.length) {
      const f = 0.75 + Math.random() * 0.5;
      for (const e of def.engines) {
        const g = ctx.createRadialGradient(e[0] * r, e[1] * r, 0, e[0] * r, e[1] * r, e[2] * r * 2.6 * f);
        g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(0.3, Utils.rgba('#ffb060', 0.6)); g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse((e[0] - e[2] * 0.8) * r, e[1] * r, e[2] * r * 2.8 * f, e[2] * r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    Art.layers(ctx, def.layers, col, r, o, t);
    if (type === 'collector' && o.cargo > 0) {
      const k = o.cargo / (o.capacity || 35);
      ctx.fillStyle = '#ffcf6b';
      ctx.fillRect(-0.3 * r, -0.3 * r, 0.7 * r * k, 0.6 * r);
    }
  },

  drawStructure(ctx, type, faction, r, o = {}) {
    const def = Art.structures[type]; if (!def) return;
    const col = FACTION_COLORS[faction];
    Art.layers(ctx, def.layers, col, r, o, o.time || 0);
  },

  layers(ctx, layers, col, r, o, t) {
    for (const L of layers) {
      switch (L.k) {
        case 'hull': case 'dark': case 'stripe': case 'bay': {
          ctx.fillStyle = L.k === 'hull' ? col.hull : L.k === 'stripe' ? col.team : L.k === 'bay' ? '#0a0d14' : col.hullDark;
          ctx.beginPath();
          if (L.hex) Art.hex(ctx, L.hex * r); else Art.poly(ctx, L.p, r);
          ctx.fill();
          if (L.k === 'hull') { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(0.8, r * 0.06); ctx.stroke(); }
          break;
        }
        case 'lights': {
          ctx.fillStyle = `rgba(255,245,210,${0.6 + 0.3 * Math.sin(t * 2)})`;
          for (const p of L.p) { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, Math.max(0.6, r * 0.045), 0, Math.PI * 2); ctx.fill(); }
          break;
        }
        case 'glow': {
          const g = ctx.createRadialGradient(L.c[0] * r, L.c[1] * r, 0, L.c[0] * r, L.c[1] * r, L.c[2] * r * 2.2);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col.glow); g.addColorStop(1, Utils.rgba(col.team, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(L.c[0] * r, L.c[1] * r, L.c[2] * r * 2.2, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'turret': {
          ctx.save();
          ctx.translate(L.c[0] * r, L.c[1] * r);
          ctx.rotate((o.turretAngle || 0) - (o.angle || 0));
          ctx.fillStyle = col.hullDark;
          const n = L.barrels, len = L.len * r, w = Math.max(1.2, r * 0.07);
          for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * w * 2.2; ctx.fillRect(0, off - w / 2, len, w); }
          ctx.fillStyle = col.hull;
          ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.fillStyle = col.team;
          ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r * 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'bayLights': {
          for (let i = 0; i < 5; i++) {
            const on = Math.sin(t * 4 - i * 0.9) > 0.3;
            ctx.fillStyle = on ? col.team : 'rgba(255,255,255,0.12)';
            ctx.fillRect((0.55 - i * 0.22) * r - 1, -0.05 * r, 2, 0.1 * r);
          }
          break;
        }
        case 'dish': {
          ctx.save(); ctx.translate(L.c[0] * r, L.c[1] * r); ctx.rotate(t * 0.6);
          ctx.strokeStyle = col.hull; ctx.lineWidth = Math.max(1, r * 0.03);
          ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r, -1.2, 1.2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L.c[2] * r, 0); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'dishBig': {
          ctx.save(); ctx.rotate(t * 0.9);
          ctx.strokeStyle = col.hull; ctx.lineWidth = Math.max(1, r * 0.1);
          ctx.beginPath(); ctx.arc(-0.2 * r, 0, 0.95 * r, -0.9, 0.9); ctx.stroke();
          ctx.fillStyle = col.team; ctx.beginPath(); ctx.arc(0.3 * r, 0, 0.15 * r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'ring': {
          ctx.strokeStyle = col.hull; ctx.lineWidth = Math.max(1.5, r * 0.12);
          ctx.beginPath(); ctx.arc(0, 0, L.r * r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
          break;
        }
        case 'core': {
          const g = ctx.createRadialGradient(-0.1 * r, -0.1 * r, 1, 0, 0, L.c[2] * r);
          g.addColorStop(0, col.glow); g.addColorStop(0.5, col.team); g.addColorStop(1, col.hullDark);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r * (1 + 0.04 * Math.sin(t * 3)), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'orbit': {
          for (let i = 0; i < 3; i++) {
            const a = t * 1.4 + i * Math.PI * 2 / 3;
            ctx.fillStyle = col.team;
            ctx.beginPath(); ctx.arc(Math.cos(a) * 0.75 * r, Math.sin(a) * 0.75 * r, Math.max(1, r * 0.06), 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case 'gantry': {
          const k = Math.sin(t * 1.1) * 0.55 * r;
          ctx.strokeStyle = col.hull; ctx.lineWidth = Math.max(1.5, r * 0.07);
          ctx.beginPath(); ctx.moveTo(k, -0.55 * r); ctx.lineTo(k, 0.55 * r); ctx.stroke();
          if (o.queueType) {
            // Silhouette du vaisseau en construction
            ctx.save(); ctx.globalAlpha = 0.15 + 0.75 * (o.queueProgress || 0);
            const ud = UNIT_TYPES[o.queueType];
            const sr = Math.min(r * 0.3, ud.radius * 0.9);
            ctx.translate(0, 0); ctx.rotate(0);
            Art.drawShip(ctx, o.queueType, o.faction, sr, { time: t });
            ctx.restore();
            ctx.fillStyle = `rgba(255,207,107,${0.4 + 0.5 * Math.sin(t * 9)})`;
            ctx.beginPath(); ctx.arc(k, 0, Math.max(1.5, r * 0.05), 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
      }
    }
  },

  poly(ctx, pts, r) { pts.forEach((p, i) => i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r)); ctx.closePath(); },
  hex(ctx, r) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); },

  // ---------- Icônes stratégiques (zoom arrière) ----------
  drawIcon(ctx, cls, faction, s, type) {
    const col = FACTION_COLORS[faction];
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = col.team;
    ctx.fillStyle = Utils.rgba(col.team, 0.22);
    ctx.beginPath();
    switch (cls) {
      case 'fighter': ctx.moveTo(s, 0); ctx.lineTo(-s * 0.8, s * 0.75); ctx.lineTo(-s * 0.8, -s * 0.75); ctx.closePath(); break;
      case 'corvette': ctx.moveTo(s, 0); ctx.lineTo(0, s * 0.8); ctx.lineTo(-s, 0); ctx.lineTo(0, -s * 0.8); ctx.closePath(); break;
      case 'frigate': ctx.rect(-s, -s * 0.55, s * 2, s * 1.1); break;
      case 'capital': ctx.rect(-s * 1.3, -s * 0.7, s * 2.6, s * 1.4); break;
      case 'utility': ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); break;
      default: Art.hex(ctx, type === 'mothership' ? s * 1.6 : s);
    }
    ctx.fill(); ctx.stroke();
    if (cls === 'capital') { ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(s * 0.9, 0); ctx.stroke(); }
    if (type === 'mothership') { ctx.fillStyle = col.team; ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'turret') { ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.stroke(); }
    if (type === 'relay') { ctx.beginPath(); ctx.arc(0, 0, s * 0.45, -1, 1); ctx.stroke(); }
    if (type === 'research') { ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke(); }
  },

  // ---------- Rendu dans un petit canvas (portraits, boutons, codex) ----------
  toCanvas(canvas, type, faction, kind = 'unit', angle = -0.35) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const def = kind === 'unit' ? Art.ships[type] : Art.structures[type];
    if (!def) return;
    // Étendue de la forme pour cadrer
    let maxR = 1;
    for (const L of def.layers) {
      if (L.p) for (const p of L.p) maxR = Math.max(maxR, Math.hypot(p[0], p[1]));
      if (L.hex) maxR = Math.max(maxR, L.hex);
      if (L.r) maxR = Math.max(maxR, L.r);
    }
    const r = (Math.min(w, h) * 0.42) / maxR;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);
    if (kind === 'unit') Art.drawShip(ctx, type, faction, r, { time: 1 });
    else Art.drawStructure(ctx, type, faction, r, { time: 1, angle });
    ctx.restore();
  },
};
