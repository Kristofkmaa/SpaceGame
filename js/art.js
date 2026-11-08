// ============ Art vectoriel vu de dessus : véhicules, bâtiments, icônes ============
// Formes définies dans un repère normalisé (rayon = 1), avant du véhicule vers +x.
const PALETTE = { bay: '#1c1813', glass: '#2b3d47', metal: '#a39a88', rust: '#7a4a2a', concrete: '#8c8478', ground: '#5c4e3f', canvas: '#6e6a52' };

const Art = {
  ships: {
    collector: {
      layers: [
        { k: 'wheels', p: [[-0.7, 0.72], [-0.7, -0.72], [0.0, 0.72], [0.0, -0.72], [0.75, 0.7], [0.75, -0.7]], w: 0.42, h: 0.24 },
        { k: 'rect', c: 'hull', x: -0.2, y: 0, w: 1.6, h: 1.2 },
        { k: 'rect', c: 'bay', x: -0.25, y: 0, w: 1.3, h: 0.9 },
        { k: 'rect', c: 'dark', x: 0.8, y: 0, w: 0.5, h: 1.1 },
        { k: 'rect', c: 'glass', x: 0.98, y: 0, w: 0.12, h: 0.8 },
        { k: 'rect', c: 'stripe', x: 0.6, y: 0, w: 0.1, h: 1.1 },
        { k: 'crane', x: -0.75, y: 0.3 },
        { k: 'lights', p: [[1.06, 0.4], [1.06, -0.4]] },
      ],
      trail: [[-1.0, 0.6], [-1.0, -0.6]],
    },
    scout: {
      layers: [
        { k: 'wheels', p: [[0.6, 0], [-0.65, 0]], w: 0.5, h: 0.3 },
        { k: 'poly', c: 'hull', p: [[1.0, 0], [0.6, 0.28], [-0.7, 0.3], [-1.0, 0], [-0.7, -0.3], [0.6, -0.28]] },
        { k: 'poly', c: 'stripe', p: [[0.3, 0.15], [-0.3, 0.2], [-0.3, -0.2], [0.3, -0.15]] },
        { k: 'dot', c: 'dark', x: -0.15, y: 0, r: 0.22 },
        { k: 'lights', p: [[1.0, 0]] },
      ],
      trail: [[-1.0, 0]],
    },
    interceptor: {
      layers: [
        { k: 'wheels', p: [[0.55, 0.78], [0.55, -0.78], [-0.65, 0.82], [-0.65, -0.82]], w: 0.45, h: 0.32 },
        { k: 'poly', c: 'hull', p: [[0.95, 0], [0.7, 0.45], [-0.7, 0.55], [-1.0, 0.3], [-1.0, -0.3], [-0.7, -0.55], [0.7, -0.45]] },
        { k: 'poly', c: 'stripe', p: [[0.9, 0.1], [0.45, 0.38], [0.45, -0.38], [0.9, -0.1]] },
        { k: 'rect', c: 'dark', x: -0.2, y: 0, w: 0.7, h: 0.8 },
        { k: 'rect', c: 'glass', x: 0.28, y: 0, w: 0.14, h: 0.6 },
        { k: 'turret', c: [-0.2, 0, 0.14], barrels: 1, len: 0.55 },
        { k: 'lights', p: [[0.95, 0.25], [0.95, -0.25]] },
      ],
      trail: [[-1.0, 0.4], [-1.0, -0.4]],
    },
    corvette: {
      layers: [
        { k: 'wheels', p: [[0.55, 0.72], [0.55, -0.72], [-0.6, 0.72], [-0.6, -0.72]], w: 0.45, h: 0.26 },
        { k: 'rect', c: 'hull', x: -0.05, y: 0, w: 2.0, h: 1.1 },
        { k: 'rect', c: 'bay', x: -0.5, y: 0, w: 0.95, h: 0.9 },
        { k: 'rect', c: 'dark', x: 0.5, y: 0, w: 0.8, h: 1.05 },
        { k: 'rect', c: 'glass', x: 0.78, y: 0, w: 0.12, h: 0.8 },
        { k: 'rect', c: 'stripe', x: 0.3, y: 0, w: 0.12, h: 1.05 },
        { k: 'turret', c: [-0.45, 0, 0.2], barrels: 1, len: 0.85 },
        { k: 'lights', p: [[0.98, 0.38], [0.98, -0.38]] },
      ],
      trail: [[-1.05, 0.5], [-1.05, -0.5]],
    },
    assault: {
      layers: [
        { k: 'track', x: -0.55, y: 0.66, w: 1.4, h: 0.34 }, { k: 'track', x: -0.55, y: -0.66, w: 1.4, h: 0.34 },
        { k: 'wheels', p: [[0.75, 0.7], [0.75, -0.7]], w: 0.45, h: 0.3 },
        { k: 'poly', c: 'hull', p: [[1.25, 0], [1.05, 0.5], [-1.0, 0.58], [-1.3, 0.35], [-1.3, -0.35], [-1.0, -0.58], [1.05, -0.5]] },
        { k: 'poly', c: 'stripe', p: [[-1.0, 0.58], [-0.2, 0.5], [-0.2, 0.4], [-1.0, 0.47]] },
        { k: 'poly', c: 'stripe', p: [[-1.0, -0.58], [-0.2, -0.5], [-0.2, -0.4], [-1.0, -0.47]] },
        { k: 'rect', c: 'dark', x: -0.3, y: 0, w: 1.2, h: 0.75 },
        { k: 'rect', c: 'glass', x: 0.78, y: 0, w: 0.12, h: 0.5 },
        { k: 'turret', c: [-0.1, 0, 0.32], barrels: 1, len: 1.0 },
        { k: 'lights', p: [[1.2, 0.3], [1.2, -0.3]] },
      ],
      trail: [[-1.3, 0.6], [-1.3, -0.6]],
    },
    ion: {
      layers: [
        { k: 'wheels', p: [[0.8, 0.68], [0.8, -0.68], [-0.3, 0.68], [-0.3, -0.68], [-0.8, 0.68], [-0.8, -0.68]], w: 0.4, h: 0.26 },
        { k: 'rect', c: 'hull', x: -0.05, y: 0, w: 2.6, h: 1.0 },
        { k: 'rect', c: 'bay', x: -0.4, y: 0, w: 1.7, h: 0.85 },
        { k: 'rect', c: 'dark', x: 0.95, y: 0, w: 0.6, h: 1.0 },
        { k: 'rect', c: 'glass', x: 1.12, y: 0, w: 0.12, h: 0.75 },
        { k: 'rect', c: 'stripe', x: 0.62, y: 0, w: 0.1, h: 1.0 },
        { k: 'launcher', c: [-0.4, 0], w: 1.4, h: 0.7, tubes: 6 },
        { k: 'lights', p: [[1.25, 0.35], [1.25, -0.35]] },
      ],
      trail: [[-1.35, 0.5], [-1.35, -0.5]],
    },
    destroyer: {
      layers: [
        { k: 'track', x: 0, y: 0.74, w: 2.6, h: 0.42 }, { k: 'track', x: 0, y: -0.74, w: 2.6, h: 0.42 },
        { k: 'poly', c: 'hull', p: [[1.3, 0], [1.15, 0.55], [-1.15, 0.6], [-1.3, 0.4], [-1.3, -0.4], [-1.15, -0.6], [1.15, -0.55]] },
        { k: 'poly', c: 'stripe', p: [[-1.15, 0.6], [-0.85, 0.58], [-0.85, -0.58], [-1.15, -0.6]] },
        { k: 'rect', c: 'dark', x: -0.7, y: 0, w: 0.6, h: 0.9 },
        { k: 'dots', c: 'metal', p: [[-0.6, 0.3], [-0.6, -0.3]], r: 0.08 },
        { k: 'turret', c: [0.05, 0, 0.48], barrels: 1, len: 1.55, wmul: 1.6, brake: true },
        { k: 'lights', p: [[1.25, 0.35], [1.25, -0.35]] },
      ],
      trail: [[-1.3, 0.75], [-1.3, -0.75]],
    },
  },

  structures: {
    mothership: {
      layers: [
        { k: 'pad', r: 1.0 },
        { k: 'rect', c: 'dark', x: 0.2, y: 0.55, w: 0.5, h: 0.3 }, { k: 'rect', c: 'dark', x: 0.2, y: -0.55, w: 0.5, h: 0.3 },
        { k: 'dots', c: 'metal', p: [[-0.6, 0.45], [-0.6, -0.45]], r: 0.15 },
        { k: 'rect', c: 'hull', x: -0.1, y: 0, w: 0.9, h: 0.6 },
        { k: 'rect', c: 'dark', x: -0.1, y: 0, w: 0.8, h: 0.08 },
        { k: 'rect', c: 'stripe', x: 0.3, y: 0, w: 0.08, h: 0.6 },
        { k: 'lights', p: [[-0.4, 0.22], [-0.2, 0.22], [0.0, 0.22], [-0.4, -0.22], [-0.2, -0.22], [0.0, -0.22]] },
        { k: 'wall', r: 1.0 },
        { k: 'rect', c: 'bay', x: 0.95, y: 0, w: 0.22, h: 0.4 },
        { k: 'bayLights' },
        { k: 'flags', p: [[0.71, 0.71], [-0.71, 0.71], [-0.71, -0.71], [0.71, -0.71]] },
        { k: 'dish', c: [-0.15, 0, 0.14] },
      ],
    },
    shipyard: {
      layers: [
        { k: 'pad', r: 1.05, square: true },
        { k: 'dots', c: 'metal', p: [[-0.75, 0.8], [-0.55, 0.85]], r: 0.1 },
        { k: 'rect', c: 'hull', x: -0.1, y: 0, w: 1.8, h: 1.3 },
        { k: 'rect', c: 'dark', x: -0.1, y: 0, w: 1.7, h: 0.08 },
        { k: 'rect', c: 'bay', x: 0.5, y: 0, w: 0.7, h: 1.0 },
        { k: 'rect', c: 'stripe', x: -0.95, y: 0, w: 0.1, h: 1.3 },
        { k: 'rect', c: 'stripe', x: 0.78, y: 0.6, w: 0.25, h: 0.1 }, { k: 'rect', c: 'stripe', x: 0.78, y: -0.6, w: 0.25, h: 0.1 },
        { k: 'lights', p: [[-0.6, 0.55], [-0.3, 0.55], [-0.6, -0.55], [-0.3, -0.55]] },
        { k: 'gantry' },
      ],
    },
    turret: {
      layers: [
        { k: 'poly', c: 'concrete', hex: 1.0 },
        { k: 'poly', c: 'dark', hex: 0.72 },
        { k: 'poly', c: 'concrete', hex: 0.45 },
        { k: 'turret', c: [0, 0, 0.38], barrels: 2, len: 1.3 },
      ],
    },
    research: {
      layers: [
        { k: 'pad', r: 1.0 },
        { k: 'panel', x: 0, y: 0.82, w: 1.3, h: 0.3 }, { k: 'panel', x: 0, y: -0.82, w: 1.3, h: 0.3 },
        { k: 'dome', r: 0.62 },
        { k: 'mast', x: 0.7, y: 0 },
        { k: 'sweep', r: 0.95 },
      ],
    },
    relay: {
      layers: [
        { k: 'tower' },
        { k: 'rect', c: 'hull', x: 0, y: 0, w: 0.9, h: 0.9 },
        { k: 'rect', c: 'dark', x: 0, y: 0, w: 0.5, h: 0.5 },
        { k: 'rect', c: 'stripe', x: 0, y: 0, w: 0.2, h: 0.2 },
        { k: 'searchlight' },
      ],
    },
  },

  color(key, col) { return key === 'hull' ? col.hull : key === 'dark' ? col.hullDark : key === 'stripe' ? col.team : PALETTE[key] || key; },

  // Étendue d'une définition (pour les ombres et le cadrage)
  extent(def) {
    if (def._ext) return def._ext;
    let m = 0.8;
    for (const L of def.layers) {
      if (L.p && Array.isArray(L.p[0])) for (const p of L.p) m = Math.max(m, Math.hypot(p[0], p[1]) + (L.w || 0) / 2);
      if (L.x !== undefined && L.w) m = Math.max(m, Math.hypot(Math.abs(L.x) + L.w / 2, Math.abs(L.y || 0) + L.h / 2));
      if (L.hex) m = Math.max(m, L.hex);
      if (L.r) m = Math.max(m, L.r);
      if (L.k === 'launcher') m = Math.max(m, Math.abs(L.c[0]) + L.w / 2);
    }
    return def._ext = m;
  },

  drawShip(ctx, type, faction, r, o = {}) {
    const def = Art.ships[type]; if (!def) return;
    const col = FACTION_COLORS[faction];
    const ext = Art.extent(def);
    // Ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0.12 * r, 0.22 * r, ext * r * 0.95, ext * r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    Art.layers(ctx, def.layers, col, r, o, o.time || 0);
    if (type === 'collector' && o.cargo > 0) {
      const k = Math.min(1, o.cargo / (o.capacity || 35));
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(-0.9 * r, -0.4 * r, 1.3 * r * k, 0.8 * r);
      ctx.fillStyle = PALETTE.metal;
      for (let i = 0; i < 4; i++) ctx.fillRect((-0.85 + i * 0.3) * r, (-0.3 + (i % 2) * 0.35) * r, 0.14 * r, 0.14 * r);
    }
  },

  drawStructure(ctx, type, faction, r, o = {}) {
    const def = Art.structures[type]; if (!def) return;
    Art.layers(ctx, def.layers, FACTION_COLORS[faction], r, o, o.time || 0);
  },

  layers(ctx, layers, col, r, o, t) {
    const lw = Math.max(0.8, r * 0.06);
    for (const L of layers) {
      switch (L.k) {
        case 'rect': {
          ctx.fillStyle = Art.color(L.c, col);
          ctx.fillRect((L.x - L.w / 2) * r, (L.y - L.h / 2) * r, L.w * r, L.h * r);
          if (L.c === 'hull') { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = lw; ctx.strokeRect((L.x - L.w / 2) * r, (L.y - L.h / 2) * r, L.w * r, L.h * r); }
          break;
        }
        case 'poly': {
          ctx.fillStyle = Art.color(L.c, col);
          ctx.beginPath(); if (L.hex) Art.hex(ctx, L.hex * r); else Art.poly(ctx, L.p, r); ctx.fill();
          if (L.c === 'hull' || L.c === 'concrete') { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = lw; ctx.stroke(); }
          break;
        }
        case 'dot': ctx.fillStyle = Art.color(L.c, col); ctx.beginPath(); ctx.arc(L.x * r, L.y * r, L.r * r, 0, Math.PI * 2); ctx.fill(); break;
        case 'dots': ctx.fillStyle = Art.color(L.c, col); for (const p of L.p) { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, L.r * r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = lw * 0.7; ctx.stroke(); } break;
        case 'wheels': {
          ctx.fillStyle = '#17150f';
          for (const p of L.p) { ctx.fillRect((p[0] - L.w / 2) * r, (p[1] - L.h / 2) * r, L.w * r, L.h * r); }
          ctx.fillStyle = '#3a362e';
          for (const p of L.p) { ctx.fillRect((p[0] - L.w / 2 + 0.06) * r, (p[1] - L.h / 2 + 0.06) * r, (L.w - 0.12) * r, (L.h - 0.12) * r); }
          break;
        }
        case 'track': {
          ctx.fillStyle = '#17150f';
          ctx.fillRect((L.x - L.w / 2) * r, (L.y - L.h / 2) * r, L.w * r, L.h * r);
          ctx.strokeStyle = '#3f3a30'; ctx.lineWidth = Math.max(0.6, r * 0.03);
          const n = Math.floor(L.w / 0.18), off = o.moving ? (t * 3) % 0.18 : 0;
          ctx.beginPath();
          for (let i = 0; i <= n; i++) { const x = (L.x - L.w / 2 + i * 0.18 + off) * r; if (x > (L.x + L.w / 2) * r) continue; ctx.moveTo(x, (L.y - L.h / 2) * r); ctx.lineTo(x, (L.y + L.h / 2) * r); }
          ctx.stroke();
          break;
        }
        case 'lights': {
          ctx.fillStyle = `rgba(255,236,190,${0.75 + 0.2 * Math.sin(t * 2)})`;
          for (const p of L.p) { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, Math.max(0.7, r * 0.06), 0, Math.PI * 2); ctx.fill(); }
          break;
        }
        case 'crane': {
          ctx.strokeStyle = PALETTE.metal; ctx.lineWidth = Math.max(1, r * 0.09);
          const a = -0.5 + Math.sin(t * 0.8) * 0.2;
          ctx.beginPath(); ctx.moveTo(L.x * r, L.y * r); ctx.lineTo((L.x + Math.cos(a) * 1.0) * r, (L.y + Math.sin(a) * 1.0) * r); ctx.stroke();
          ctx.fillStyle = col.team; ctx.beginPath(); ctx.arc((L.x + Math.cos(a) * 1.0) * r, (L.y + Math.sin(a) * 1.0) * r, Math.max(1, r * 0.1), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'turret': {
          ctx.save(); ctx.translate(L.c[0] * r, L.c[1] * r); ctx.rotate((o.turretAngle || 0) - (o.angle || 0));
          const n = L.barrels, len = L.len * r, w = Math.max(1.2, r * 0.08) * (L.wmul || 1);
          ctx.fillStyle = '#23201a';
          for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * w * 2.2; ctx.fillRect(0, off - w / 2, len, w); }
          if (L.brake) { ctx.fillStyle = PALETTE.metal; ctx.fillRect(len - w * 1.6, -w * 0.9, w * 1.6, w * 1.8); }
          ctx.fillStyle = col.hull; ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = lw; ctx.stroke();
          ctx.fillStyle = col.team; ctx.fillRect(-L.c[2] * r * 0.6, -L.c[2] * r * 0.25, L.c[2] * r * 0.5, L.c[2] * r * 0.5);
          ctx.restore();
          break;
        }
        case 'launcher': {
          ctx.save(); ctx.translate(L.c[0] * r, L.c[1] * r); ctx.rotate((o.turretAngle || 0) - (o.angle || 0));
          ctx.fillStyle = col.hullDark; ctx.fillRect(-L.w / 2 * r, -L.h / 2 * r, L.w * r, L.h * r);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = lw; ctx.strokeRect(-L.w / 2 * r, -L.h / 2 * r, L.w * r, L.h * r);
          ctx.fillStyle = col.team; ctx.fillRect(-L.w / 2 * r, -L.h / 2 * r, L.w * 0.12 * r, L.h * r);
          const cols = L.tubes / 2;
          for (let i = 0; i < L.tubes; i++) {
            const cx = (-L.w / 2 + L.w * 0.25 + (i % cols) * (L.w * 0.7 / cols)) * r, cy = ((i < cols ? -1 : 1) * L.h * 0.25) * r;
            ctx.fillStyle = '#0d0b08'; ctx.beginPath(); ctx.arc(cx, cy, L.h * 0.16 * r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          break;
        }
        // ----- bâtiments -----
        case 'pad': {
          ctx.fillStyle = 'rgba(40,32,24,0.45)';
          ctx.beginPath();
          if (L.square) ctx.rect(-L.r * r, -L.r * r, L.r * 2 * r, L.r * 2 * r); else Art.octo(ctx, L.r * r);
          ctx.fill();
          break;
        }
        case 'wall': {
          ctx.strokeStyle = PALETTE.concrete; ctx.lineWidth = Math.max(2, r * 0.11);
          ctx.beginPath(); Art.octo(ctx, L.r * r); ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(0.8, r * 0.02); ctx.stroke();
          ctx.strokeStyle = PALETTE.rust; ctx.lineWidth = Math.max(1, r * 0.03); ctx.setLineDash([r * 0.12, r * 0.1]);
          ctx.beginPath(); Art.octo(ctx, L.r * r * 0.93); ctx.stroke(); ctx.setLineDash([]);
          break;
        }
        case 'flags': {
          for (const p of L.p) {
            ctx.fillStyle = PALETTE.metal; ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, Math.max(1, r * 0.035), 0, Math.PI * 2); ctx.fill();
            const wave = Math.sin(t * 5 + p[0] * 3) * 0.05;
            ctx.fillStyle = col.team; ctx.beginPath(); ctx.moveTo(p[0] * r, p[1] * r); ctx.lineTo((p[0] - 0.2) * r, (p[1] - 0.06 + wave) * r); ctx.lineTo((p[0] - 0.2) * r, (p[1] + 0.06 + wave) * r); ctx.closePath(); ctx.fill();
          }
          break;
        }
        case 'bayLights': {
          for (let i = 0; i < 4; i++) {
            const on = Math.sin(t * 4 - i * 0.9) > 0.3;
            ctx.fillStyle = on ? col.team : 'rgba(255,255,255,0.15)';
            ctx.fillRect(0.86 * r - 1, (-0.18 + i * 0.12) * r, Math.max(1.5, r * 0.025), 0.06 * r);
          }
          break;
        }
        case 'dish': {
          ctx.save(); ctx.translate(L.c[0] * r, L.c[1] * r); ctx.rotate(t * 0.7);
          ctx.strokeStyle = PALETTE.metal; ctx.lineWidth = Math.max(1, r * 0.03);
          ctx.beginPath(); ctx.arc(0, 0, L.c[2] * r, -1.1, 1.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L.c[2] * r, 0); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'gantry': {
          const k = Math.sin(t * 1.1) * 0.35 * r;
          ctx.strokeStyle = PALETTE.metal; ctx.lineWidth = Math.max(1.5, r * 0.06);
          ctx.beginPath(); ctx.moveTo(0.2 * r + k, -0.5 * r); ctx.lineTo(0.2 * r + k, 0.5 * r); ctx.stroke();
          if (o.queueType) {
            ctx.save(); ctx.globalAlpha = 0.2 + 0.75 * (o.queueProgress || 0);
            const ud = UNIT_TYPES[o.queueType];
            Art.drawShip(ctx, o.queueType, o.faction, Math.min(r * 0.3, ud.radius * 0.9), { time: t });
            ctx.restore();
            // Étincelles de soudure
            if (Math.sin(t * 17) > 0.4) { ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(0.2 * r + k, Utils.rand(-0.3, 0.3) * r, Math.max(1, r * 0.04), 0, Math.PI * 2); ctx.fill(); }
          }
          break;
        }
        case 'panel': {
          ctx.fillStyle = '#1e2a3a'; ctx.fillRect((L.x - L.w / 2) * r, (L.y - L.h / 2) * r, L.w * r, L.h * r);
          ctx.strokeStyle = PALETTE.metal; ctx.lineWidth = Math.max(0.6, r * 0.02);
          ctx.strokeRect((L.x - L.w / 2) * r, (L.y - L.h / 2) * r, L.w * r, L.h * r);
          ctx.beginPath(); for (let i = 1; i < 6; i++) { const x = (L.x - L.w / 2 + L.w * i / 6) * r; ctx.moveTo(x, (L.y - L.h / 2) * r); ctx.lineTo(x, (L.y + L.h / 2) * r); } ctx.stroke();
          break;
        }
        case 'dome': {
          const g = ctx.createRadialGradient(-0.2 * r, -0.2 * r, 1, 0, 0, L.r * r);
          g.addColorStop(0, '#d6cfbf'); g.addColorStop(0.6, PALETTE.metal); g.addColorStop(1, '#5a5244');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L.r * r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = lw; ctx.stroke();
          ctx.fillStyle = col.team; ctx.beginPath(); ctx.arc(0, 0, L.r * r * 0.18, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'mast': {
          ctx.strokeStyle = PALETTE.metal; ctx.lineWidth = Math.max(1, r * 0.05);
          ctx.beginPath(); ctx.moveTo(L.x * r, L.y * r); ctx.lineTo((L.x + 0.3) * r, (L.y - 0.3) * r); ctx.stroke();
          ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff4d3a' : '#5a2a22'; ctx.beginPath(); ctx.arc((L.x + 0.3) * r, (L.y - 0.3) * r, Math.max(1, r * 0.06), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'sweep': {
          const a = t * 1.6;
          const g = ctx.createConicGradient ? ctx.createConicGradient(a, 0, 0) : null;
          if (g) { g.addColorStop(0, Utils.rgba(col.team, 0.35)); g.addColorStop(0.25, Utils.rgba(col.team, 0)); g.addColorStop(1, Utils.rgba(col.team, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L.r * r, 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = Utils.rgba(col.team, 0.7); ctx.lineWidth = Math.max(0.8, r * 0.03);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * L.r * r, Math.sin(a) * L.r * r); ctx.stroke();
          break;
        }
        case 'tower': {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0.5 * r, 0.6 * r, 0.7 * r, 0.45 * r, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = PALETTE.rust; ctx.lineWidth = Math.max(1, r * 0.09);
          ctx.beginPath();
          for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { ctx.moveTo(sx * 0.8 * r, sy * 0.8 * r); ctx.lineTo(sx * 0.4 * r, sy * 0.4 * r); }
          ctx.stroke();
          break;
        }
        case 'searchlight': {
          const a = t * 0.9 + (o.angle || 0) * 0;
          ctx.save(); ctx.rotate(a);
          const g = ctx.createLinearGradient(0, 0, 2.6 * r, 0);
          g.addColorStop(0, 'rgba(255,240,190,0.35)'); g.addColorStop(1, 'rgba(255,240,190,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2.6 * r, -0.7 * r); ctx.lineTo(2.6 * r, 0.7 * r); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(0.2 * r, 0, Math.max(1, r * 0.1), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
  },

  poly(ctx, pts, r) { pts.forEach((p, i) => i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r)); ctx.closePath(); },
  hex(ctx, r) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); },
  octo(ctx, r) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); },

  // ---------- Icônes tactiques (zoom arrière) ----------
  drawIcon(ctx, cls, faction, s, type) {
    const col = FACTION_COLORS[faction];
    ctx.lineWidth = 1.5; ctx.strokeStyle = col.team; ctx.fillStyle = Utils.rgba(col.team, 0.22);
    ctx.beginPath();
    switch (cls) {
      case 'fighter': ctx.moveTo(s, 0); ctx.lineTo(-s * 0.8, s * 0.75); ctx.lineTo(-s * 0.8, -s * 0.75); ctx.closePath(); break;
      case 'corvette': ctx.moveTo(s, 0); ctx.lineTo(0, s * 0.8); ctx.lineTo(-s, 0); ctx.lineTo(0, -s * 0.8); ctx.closePath(); break;
      case 'frigate': ctx.rect(-s, -s * 0.55, s * 2, s * 1.1); break;
      case 'capital': ctx.rect(-s * 1.3, -s * 0.7, s * 2.6, s * 1.4); break;
      case 'utility': ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); break;
      default: Art.octo(ctx, type === 'mothership' ? s * 1.6 : s);
    }
    ctx.fill(); ctx.stroke();
    if (cls === 'capital') { ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(s * 0.9, 0); ctx.stroke(); }
    if (type === 'mothership') { ctx.fillStyle = col.team; ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'turret') { ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.stroke(); }
    if (type === 'relay') { ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.4); ctx.lineTo(0, -s * 0.4); ctx.lineTo(s * 0.4, s * 0.4); ctx.stroke(); }
    if (type === 'research') { ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke(); }
  },

  toCanvas(canvas, type, faction, kind = 'unit', angle = -0.35) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const def = kind === 'unit' ? Art.ships[type] : Art.structures[type];
    if (!def) return;
    const r = (Math.min(w, h) * 0.42) / Art.extent(def);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(angle);
    if (kind === 'unit') Art.drawShip(ctx, type, faction, r, { time: 1 }); else Art.drawStructure(ctx, type, faction, r, { time: 1, angle });
    ctx.restore();
  },
};
