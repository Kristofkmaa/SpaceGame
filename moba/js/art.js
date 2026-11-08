// ============ Art vectoriel : héros, sbires, structures, portraits, icônes ============
const HERO_THEME = {
  briseroc:  { bg: ['#8a4a26', '#2a150b'], accent: '#ffb347' },
  vipere:    { bg: ['#5a6a34', '#161b0c'], accent: '#56d0c8' },
  doc:       { bg: ['#356f50', '#0c1f14'], accent: '#8cff7a' },
  etincelle: { bg: ['#2f5a8a', '#0b1626'], accent: '#7fdcff' },
};

const Art = {
  // ---------------- Héros vus de dessus (face vers +x) ----------------
  hero(ctx, id, r, a) {
    const team = TEAM_INFO[a.team], t = a.time || 0;
    const walk = a.moving ? Math.sin(a.walk) : 0;
    const atk = a.attack;   // 0..1 pendant l'animation d'attaque, sinon -1
    // Pieds
    ctx.fillStyle = '#1c1813';
    ctx.beginPath(); ctx.ellipse(walk * 0.34 * r, -0.3 * r, 0.22 * r, 0.13 * r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-walk * 0.34 * r, 0.3 * r, 0.22 * r, 0.13 * r, 0, 0, Math.PI * 2); ctx.fill();
    const stroke = () => { ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke(); };
    const circle = (x, y, rr, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x * r, y * r, rr * r, 0, Math.PI * 2); ctx.fill(); };
    if (id === 'briseroc') {
      const swing = atk >= 0 ? Math.sin(atk * Math.PI) : 0;
      ctx.save(); ctx.translate(0.05 * r, 0.62 * r); ctx.rotate(-1.0 + swing * 1.7);
      ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 0.13 * r; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1.05 * r, 0); ctx.stroke();
      ctx.fillStyle = '#8f8f88'; ctx.fillRect(0.82 * r, -0.3 * r, 0.36 * r, 0.6 * r); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(0.82 * r, -0.3 * r, 0.36 * r, 0.6 * r);
      ctx.fillStyle = '#c96f2b'; ctx.fillRect(0.88 * r, -0.08 * r, 0.24 * r, 0.16 * r);
      ctx.restore();
      ctx.fillStyle = '#6b4a32'; ctx.beginPath(); ctx.ellipse(0, 0, 0.5 * r, 0.92 * r, 0, 0, Math.PI * 2); ctx.fill(); stroke();
      ctx.fillStyle = team.color; ctx.fillRect(-0.12 * r, -0.55 * r, 0.16 * r, 1.1 * r);
      for (const s of [-1, 1]) {
        circle(-0.02, s * 0.72, 0.31, '#221f1c'); circle(-0.02, s * 0.72, 0.17, '#4a4540');
        ctx.strokeStyle = '#3a3631'; ctx.lineWidth = Math.max(1, 0.05 * r); ctx.setLineDash([0.08 * r, 0.06 * r]);
        ctx.beginPath(); ctx.arc(-0.02 * r, s * 0.72 * r, 0.25 * r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      circle(0.36, -0.55, 0.14, '#4a3a2a');
      circle(0.08, 0, 0.31, '#8d8678'); ctx.beginPath(); ctx.arc(0.08 * r, 0, 0.31 * r, 0, Math.PI * 2); stroke();
      ctx.fillStyle = '#ffb347'; ctx.fillRect(0.27 * r, -0.17 * r, 0.09 * r, 0.34 * r);
      ctx.fillStyle = 'rgba(255,180,70,0.35)'; ctx.fillRect(0.36 * r, -0.2 * r, 0.12 * r, 0.4 * r);
    } else if (id === 'vipere') {
      const recoil = atk >= 0 ? (1 - atk) * 0.18 * r : 0;
      ctx.fillStyle = '#4b4a38'; ctx.beginPath();
      ctx.moveTo(0.3 * r, -0.6 * r); ctx.quadraticCurveTo(-0.6 * r, -0.85 * r, -1.15 * r, -0.1 * r + Math.sin(t * 3) * 0.05 * r);
      ctx.quadraticCurveTo(-0.6 * r, 0.85 * r, 0.3 * r, 0.6 * r); ctx.closePath(); ctx.fill(); stroke();
      ctx.fillStyle = '#5c5a44'; ctx.beginPath(); ctx.ellipse(0, 0, 0.36 * r, 0.62 * r, 0, 0, Math.PI * 2); ctx.fill(); stroke();
      ctx.save(); ctx.translate(-recoil, 0);
      ctx.strokeStyle = '#2b2722'; ctx.lineWidth = 0.1 * r; ctx.beginPath(); ctx.moveTo(-0.1 * r, 0.32 * r); ctx.lineTo(1.6 * r, 0.2 * r); ctx.stroke();
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(-0.3 * r, 0.24 * r, 0.42 * r, 0.16 * r);
      ctx.fillStyle = '#3a3a36'; ctx.fillRect(0.45 * r, 0.12 * r, 0.32 * r, 0.1 * r);
      ctx.restore();
      circle(0.45, 0.24, 0.1, '#7a5a40');
      circle(0.05, 0, 0.29, '#3f3f30');
      ctx.strokeStyle = team.color; ctx.lineWidth = 0.12 * r; ctx.beginPath(); ctx.arc(0.05 * r, 0, 0.3 * r, -1.2, 1.2); ctx.stroke();
      circle(0.27, -0.1, 0.07, '#56d0c8'); circle(0.27, 0.1, 0.07, '#56d0c8');
    } else if (id === 'doc') {
      ctx.fillStyle = '#4e463a'; ctx.fillRect(-0.8 * r, -0.42 * r, 0.42 * r, 0.84 * r);
      for (let i = 0; i < 3; i++) {
        const glow = 0.6 + 0.4 * Math.sin(t * 3 + i);
        ctx.fillStyle = `rgba(140,255,122,${glow})`; ctx.fillRect(-0.74 * r, (-0.34 + i * 0.26) * r, 0.3 * r, 0.16 * r);
      }
      ctx.fillStyle = '#b8b09a'; ctx.beginPath(); ctx.ellipse(0, 0, 0.4 * r, 0.72 * r, 0, 0, Math.PI * 2); ctx.fill(); stroke();
      circle(0, -0.6, 0.13, '#f0ece0'); ctx.fillStyle = '#d4362a'; ctx.fillRect(-0.03 * r, -0.69 * r, 0.06 * r, 0.18 * r); ctx.fillRect(-0.09 * r, -0.63 * r, 0.18 * r, 0.06 * r);
      const push = atk >= 0 ? Math.sin(atk * Math.PI) * 0.12 * r : 0;
      ctx.fillStyle = '#6a6458'; ctx.fillRect(0.2 * r + push, 0.28 * r, 0.75 * r, 0.16 * r);
      ctx.fillStyle = '#8cff7a'; ctx.fillRect(0.4 * r + push, 0.3 * r, 0.3 * r, 0.12 * r);
      ctx.strokeStyle = '#d8d8d0'; ctx.lineWidth = Math.max(1, 0.04 * r); ctx.beginPath(); ctx.moveTo(0.95 * r + push, 0.36 * r); ctx.lineTo(1.3 * r + push, 0.36 * r); ctx.stroke();
      circle(0.05, 0, 0.29, '#38362f');
      ctx.strokeStyle = team.color; ctx.lineWidth = 0.1 * r; ctx.beginPath(); ctx.arc(0.05 * r, 0, 0.27 * r, 2.2, 4.1); ctx.stroke();
      circle(0.24, -0.11, 0.08, '#d8c890'); circle(0.24, 0.11, 0.08, '#d8c890'); circle(0.34, 0, 0.1, '#5a564c');
    } else if (id === 'etincelle') {
      circle(-0.55, 0, 0.3, '#3a3026');
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#c87533'; ctx.lineWidth = Math.max(1, 0.06 * r); ctx.beginPath(); ctx.arc(-0.55 * r, 0, (0.12 + i * 0.07) * r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(160,230,255,0.9)'; ctx.lineWidth = Math.max(1, 0.035 * r);
      const seed = Math.floor(t * 14);
      for (let k = 0; k < 2; k++) {
        const rnd = Utils.seeded(seed * 7 + k), a0 = rnd() * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(-0.55 * r, 0);
        for (let j = 1; j <= 4; j++) { const d = j * 0.14 * r; ctx.lineTo(-0.55 * r + Math.cos(a0) * d + (rnd() - 0.5) * 0.15 * r, Math.sin(a0) * d + (rnd() - 0.5) * 0.15 * r); }
        ctx.stroke();
      }
      ctx.fillStyle = '#4a5866'; ctx.beginPath(); ctx.ellipse(0, 0, 0.38 * r, 0.66 * r, 0, 0, Math.PI * 2); ctx.fill(); stroke();
      ctx.strokeStyle = team.color; ctx.lineWidth = 0.08 * r; ctx.beginPath(); ctx.moveTo(-0.3 * r, -0.45 * r); ctx.lineTo(0.2 * r, -0.2 * r); ctx.moveTo(-0.3 * r, 0.45 * r); ctx.lineTo(0.2 * r, 0.2 * r); ctx.stroke();
      const glow = 0.5 + 0.5 * Math.sin(t * 6) + (atk >= 0 ? 0.6 : 0);
      const gg = ctx.createRadialGradient(0.6 * r, 0.45 * r, 0, 0.6 * r, 0.45 * r, 0.4 * r);
      gg.addColorStop(0, `rgba(127,220,255,${Math.min(1, glow)})`); gg.addColorStop(1, 'rgba(127,220,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0.6 * r, 0.45 * r, 0.4 * r, 0, Math.PI * 2); ctx.fill();
      circle(0.55, 0.45, 0.15, '#7a8a96');
      circle(0.06, 0, 0.27, '#c99a74');
      ctx.fillStyle = '#e8722a'; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const ang = Math.PI * 0.55 + i / 8 * Math.PI * 0.9, rr = i % 2 ? 0.3 : 0.44; ctx.lineTo(0.06 * r + Math.cos(ang) * rr * r, Math.sin(ang) * rr * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c87533'; ctx.fillRect(0.12 * r, -0.2 * r, 0.08 * r, 0.4 * r);
    }
  },

  // ---------------- Sbires ----------------
  minion(ctx, type, r, a) {
    const team = TEAM_INFO[a.team], walk = a.moving ? Math.sin(a.walk) : 0, atk = a.attack;
    if (type === 'siege') {
      ctx.fillStyle = '#17150f';
      for (const [x, y] of [[0.55, 0.62], [0.55, -0.62], [-0.55, 0.62], [-0.55, -0.62]]) ctx.fillRect((x - 0.2) * r, (y - 0.13) * r, 0.4 * r, 0.26 * r);
      ctx.fillStyle = '#6a5a44'; ctx.fillRect(-0.85 * r, -0.55 * r, 1.4 * r, 1.1 * r);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-0.85 * r, -0.55 * r, 1.4 * r, 1.1 * r);
      ctx.fillStyle = team.color; ctx.fillRect(-0.85 * r, -0.12 * r, 1.1 * r, 0.24 * r);
      ctx.fillStyle = '#3e3a32'; ctx.fillRect(0.25 * r, -0.45 * r, 0.3 * r, 0.9 * r);
      const ram = atk >= 0 ? Math.sin(atk * Math.PI) * 0.2 * r : 0;
      ctx.fillStyle = '#9a9a92'; ctx.beginPath(); ctx.moveTo((0.55) * r + ram, -0.3 * r); ctx.lineTo(1.15 * r + ram, 0); ctx.lineTo(0.55 * r + ram, 0.3 * r); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.fillStyle = '#1c1813';
    ctx.beginPath(); ctx.ellipse(walk * 0.35 * r, -0.3 * r, 0.22 * r, 0.14 * r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-walk * 0.35 * r, 0.3 * r, 0.22 * r, 0.14 * r, 0, 0, Math.PI * 2); ctx.fill();
    if (type === 'melee') {
      const sw = atk >= 0 ? Math.sin(atk * Math.PI) : 0;
      ctx.save(); ctx.translate(0.1 * r, 0.6 * r); ctx.rotate(-0.8 + sw * 1.5);
      ctx.fillStyle = '#b8b8b0'; ctx.fillRect(0, -0.07 * r, 0.9 * r, 0.14 * r); ctx.restore();
      ctx.fillStyle = '#6e5a44'; ctx.beginPath(); ctx.ellipse(0, 0, 0.42 * r, 0.8 * r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = team.color; ctx.fillRect(-0.15 * r, -0.75 * r, 0.3 * r, 0.3 * r); ctx.fillRect(-0.15 * r, 0.45 * r, 0.3 * r, 0.3 * r);
    } else {
      ctx.fillStyle = '#5d5242'; ctx.beginPath(); ctx.ellipse(0, 0, 0.4 * r, 0.75 * r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = team.color; ctx.fillRect(-0.7 * r, -0.2 * r, 0.35 * r, 0.4 * r);
      ctx.strokeStyle = '#3a2f24'; ctx.lineWidth = Math.max(1, 0.12 * r);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1.0 * r, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0.6 * r, 0, 0.55 * r, -1.0, 1.0); ctx.stroke();
    }
    ctx.fillStyle = '#a07a5a'; ctx.beginPath(); ctx.arc(0.08 * r, 0, 0.32 * r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = team.color; ctx.beginPath(); ctx.arc(0.08 * r, 0, 0.32 * r, 2.4, 3.9); ctx.lineTo(0.08 * r, 0); ctx.fill();
  },

  // ---------------- Structures ----------------
  tower(ctx, team, r, ang, t, fired) {
    const col = TEAM_INFO[team];
    ctx.fillStyle = '#6f685c'; ctx.beginPath(); Art.octo(ctx, r); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8a8374'; ctx.beginPath(); Art.octo(ctx, r * 0.78); ctx.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = i % 2 ? '#a6957a' : '#988870'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.17, r * 0.11, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.rotate(ang);
    const kick = fired ? 6 : 0;
    ctx.fillStyle = '#23201a'; ctx.fillRect(r * 0.1 - kick, -r * 0.16, r * 0.95, r * 0.1); ctx.fillRect(r * 0.1 - kick, r * 0.06, r * 0.95, r * 0.1);
    ctx.fillStyle = col.color; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col.dark; ctx.fillRect(-r * 0.32, -r * 0.12, r * 0.3, r * 0.24);
    ctx.restore();
    // Mât et drapeau
    ctx.strokeStyle = '#3a342c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(-r * 0.6, -r * 1.25); ctx.stroke();
    const w = Math.sin(t * 4) * 3;
    ctx.fillStyle = col.color; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 1.25); ctx.lineTo(-r * 0.6 + 20, -r * 1.18 + w); ctx.lineTo(-r * 0.6, -r * 1.05); ctx.closePath(); ctx.fill();
  },
  core(ctx, team, r, t) {
    const col = TEAM_INFO[team];
    ctx.fillStyle = '#4e4a42'; ctx.beginPath(); Art.octo(ctx, r); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4 + Math.PI / 8); ctx.fillStyle = '#6c665a'; ctx.fillRect(r * 0.55, -r * 0.08, r * 0.42, r * 0.16); ctx.restore(); }
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#e8b04a' : '#1c1a16'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, i / 16 * Math.PI * 2, (i + 1) / 16 * Math.PI * 2); ctx.arc(0, 0, r * 0.47, (i + 1) / 16 * Math.PI * 2, i / 16 * Math.PI * 2, true); ctx.fill(); }
    const p = 0.75 + 0.25 * Math.sin(t * 2.5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.47);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col.light); g.addColorStop(0.8, col.color); g.addColorStop(1, col.dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.47 * p, 0, Math.PI * 2); ctx.fill();
    const h = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
    h.addColorStop(0, Utils.rgba(col.color, 0.25 * p)); h.addColorStop(1, Utils.rgba(col.color, 0));
    ctx.fillStyle = h; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
  },
  octo(ctx, r) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); },

  // ---------------- Portraits de face ----------------
  portrait(ctx, id, w, h, opts = {}) {
    const th = HERO_THEME[id], s = w / 100;
    ctx.save();
    if (opts.bg !== false) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const sun = ctx.createRadialGradient(w * 0.72, h * 0.3, 0, w * 0.72, h * 0.3, w * 0.55);
      sun.addColorStop(0, 'rgba(255,210,150,0.35)'); sun.addColorStop(1, 'rgba(255,210,150,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.05 + i * 0.16), h * (0.66 - (i % 3) * 0.06), w * 0.1, h * 0.4);
    }
    ctx.scale(s, h / 100);
    const P = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };
    const C = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const team = TEAM_INFO[opts.team !== undefined ? opts.team : 0];
    ctx.lineJoin = 'round';
    if (id === 'briseroc') {
      ctx.save(); ctx.translate(18, 30); ctx.rotate(-0.6);
      ctx.fillStyle = '#5a4630'; ctx.fillRect(-3, 0, 6, 55);
      ctx.fillStyle = '#8f8f88'; ctx.fillRect(-14, -14, 28, 18); ctx.fillStyle = '#c96f2b'; ctx.fillRect(-6, -10, 12, 10);
      ctx.restore();
      P([[-5, 100], [-5, 78], [18, 64], [40, 60], [60, 60], [82, 64], [105, 78], [105, 100]], '#5d4330');
      C(16, 74, 16, '#221f1c'); C(16, 74, 9, '#4a4540'); C(84, 74, 16, '#221f1c'); C(84, 74, 9, '#4a4540');
      ctx.strokeStyle = '#8a8270'; ctx.lineWidth = 2.4; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(26, 64); ctx.lineTo(70, 100); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = team.color; ctx.fillRect(44, 78, 12, 22);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(42, 54, 16, 10);
      ctx.fillStyle = '#8d8678'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(32, 22, 36, 40, 8) : ctx.rect(32, 22, 36, 40); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = team.color; ctx.fillRect(48, 22, 4, 14);
      ctx.fillStyle = '#1a1612'; ctx.fillRect(36, 38, 28, 9);
      const glow = ctx.createLinearGradient(36, 42, 64, 42); glow.addColorStop(0, '#ff8a1a'); glow.addColorStop(0.5, '#ffd27a'); glow.addColorStop(1, '#ff8a1a');
      ctx.fillStyle = glow; ctx.fillRect(38, 41, 24, 3);
      ctx.fillStyle = 'rgba(255,170,60,0.25)'; ctx.fillRect(34, 36, 32, 13);
      for (const [x, y] of [[35, 26], [65, 26], [35, 58], [65, 58]]) C(x, y, 1.3, '#5a5448');
    } else if (id === 'vipere') {
      ctx.strokeStyle = '#2b2722'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(74, 100); ctx.lineTo(92, 6); ctx.stroke();
      ctx.fillStyle = '#3a3a36'; ctx.fillRect(84, 30, 6, 12);
      P([[-5, 100], [8, 76], [30, 66], [70, 66], [92, 76], [105, 100]], '#4b4a38');
      P([[26, 88], [30, 40], [40, 20], [50, 14], [60, 20], [70, 40], [74, 88]], '#3f3f30');
      ctx.fillStyle = '#16140f'; ctx.beginPath(); ctx.ellipse(50, 48, 15, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a40'; ctx.beginPath(); ctx.ellipse(50, 52, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a241c'; ctx.fillRect(37, 40, 26, 6);
      for (const x of [43, 57]) { C(x, 43, 6, '#2a2a26'); C(x, 43, 4.4, '#56d0c8'); C(x - 1.4, 41.6, 1.4, '#e8fffc'); }
      P([[36, 54], [64, 54], [66, 66], [50, 72], [34, 66]], team.color);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (const y of [58, 62, 66]) { ctx.beginPath(); ctx.moveTo(37, y); ctx.lineTo(63, y); ctx.stroke(); }
      ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 82); ctx.lineTo(60, 100); ctx.stroke();
      for (let i = 0; i < 5; i++) C(22 + i * 8, 86 + i * 3, 1.8, '#c9a24a');
    } else if (id === 'doc') {
      P([[-5, 100], [6, 74], [30, 64], [70, 64], [94, 74], [105, 100]], '#b8b09a');
      P([[30, 64], [50, 84], [70, 64], [62, 100], [38, 100]], '#8f8774');
      ctx.strokeStyle = '#3a342a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 76); ctx.lineTo(80, 100); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#8cff7a'; ctx.globalAlpha = 0.85; ctx.fillRect(20 + i * 11, 77 + i * 3.6, 4, 9); ctx.globalAlpha = 1; }
      C(86, 82, 7, '#f0ece0'); ctx.fillStyle = '#d4362a'; ctx.fillRect(84.6, 77, 2.8, 10); ctx.fillRect(81, 80.6, 10, 2.8);
      ctx.fillStyle = team.color; ctx.beginPath(); ctx.ellipse(50, 24, 20, 10, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(30, 22, 40, 6);
      ctx.fillStyle = '#c99a74'; ctx.fillRect(40, 54, 20, 12);
      ctx.fillStyle = '#38362f'; ctx.beginPath(); ctx.ellipse(50, 46, 17, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      for (const x of [43, 57]) { C(x, 41, 6.5, '#1e1c18'); C(x, 41, 5, '#d8c890'); C(x - 1.5, 39.5, 1.6, '#fffbe6'); }
      C(50, 58, 7.5, '#5a564c'); ctx.strokeStyle = '#2a2824'; ctx.lineWidth = 1; for (const dy of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(45, 58 + dy); ctx.lineTo(55, 58 + dy); ctx.stroke(); }
      ctx.fillStyle = '#4e4a40'; ctx.fillRect(28, 50, 7, 10); ctx.fillStyle = '#6a6658'; ctx.fillRect(27, 48, 9, 3);
    } else if (id === 'etincelle') {
      for (const x of [14, 86]) {
        ctx.fillStyle = '#3a3026'; ctx.fillRect(x - 4, 30, 8, 46);
        for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#c87533' : '#e0954a'; ctx.fillRect(x - 6, 32 + i * 4.4, 12, 3); }
        C(x, 28, 5, '#9aa8b0');
      }
      ctx.strokeStyle = 'rgba(160,230,255,0.95)'; ctx.lineWidth = 1.6; ctx.shadowColor = '#7fdcff'; ctx.shadowBlur = 8;
      const rnd = Utils.seeded(opts.seed || 5);
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(14, 28); for (let i = 1; i < 8; i++) ctx.lineTo(14 + i * 9.1, 22 - Math.sin(i / 8 * Math.PI) * 14 + (rnd() - 0.5) * 8); ctx.lineTo(86, 28); ctx.stroke(); }
      ctx.shadowBlur = 0;
      P([[-5, 100], [8, 76], [30, 66], [70, 66], [92, 76], [105, 100]], '#4a5866');
      ctx.fillStyle = team.color; ctx.fillRect(30, 70, 7, 30); ctx.fillRect(63, 70, 7, 30);
      ctx.fillStyle = '#c99a74'; ctx.fillRect(43, 56, 14, 12);
      ctx.fillStyle = '#c99a74'; ctx.beginPath(); ctx.ellipse(50, 44, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8722a'; ctx.beginPath();
      const spikes = [[32, 40], [28, 22], [38, 30], [40, 10], [48, 24], [56, 8], [60, 24], [70, 14], [66, 32], [74, 30], [68, 42], [64, 30], [36, 30]];
      spikes.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3d24'; ctx.fillRect(34, 30, 32, 4);
      for (const x of [42, 58]) { C(x, 31, 6, '#c87533'); C(x, 31, 4.4, '#7fdcff'); C(x - 1.4, 29.6, 1.3, '#e8fbff'); }
      C(44, 46, 1.8, '#2a1d14'); C(56, 46, 1.8, '#2a1d14');
      ctx.strokeStyle = '#2a1d14'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(50, 51, 6, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#f3e6cf'; ctx.beginPath(); ctx.arc(50, 51.5, 4.6, 0.3, Math.PI - 0.3); ctx.fill();
      ctx.fillStyle = 'rgba(40,30,20,0.4)'; ctx.beginPath(); ctx.ellipse(39, 52, 4, 2, 0.3, 0, Math.PI * 2); ctx.fill();
      for (const [x, y] of [[41, 49], [43, 50], [57, 49], [59, 50]]) C(x, y, 0.7, '#9a6a4a');
    }
    ctx.restore();
  },

  // ---------------- Icônes ----------------
  icon(ctx, id, size, kind = 'ability', hero) {
    const S = size;
    ctx.clearRect(0, 0, S, S);
    const th = hero ? HERO_THEME[hero] : null;
    const bg = kind === 'item' ? ['#6a5638', '#1e170e'] : kind === 'spell' ? ['#4a5560', '#141a20'] : th ? th.bg : ['#555', '#222'];
    const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.scale(S / 100, S / 100);
    ctx.strokeStyle = '#f3e6cf'; ctx.fillStyle = '#f3e6cf'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const L = (pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    const F = (pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };
    const C = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); };
    const accent = th ? th.accent : '#ffcf6b';
    switch (id) {
      case 'ram': F([[20, 62], [58, 62], [58, 76], [84, 50], [58, 24], [58, 38], [20, 38]]); ctx.lineWidth = 4; L([[8, 30], [18, 30]]); L([[4, 50], [14, 50]]); L([[8, 70], [18, 70]]); break;
      case 'plate': F([[50, 12], [84, 24], [80, 58], [50, 88], [20, 58], [16, 24]]); ctx.fillStyle = bg[1]; for (const [x, y] of [[32, 30], [68, 30], [32, 56], [68, 56], [50, 72]]) C(x, y, 4, true); break;
      case 'quake': C(50, 60, 10, true); ctx.lineWidth = 5; for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; L([[50 + Math.cos(a) * 16, 60 + Math.sin(a) * 16], [50 + Math.cos(a) * 34 + (i % 2) * 4, 60 + Math.sin(a) * 34], [50 + Math.cos(a) * 44, 60 + Math.sin(a) * 44]]); } L([[14, 82], [86, 82]]); break;
      case 'roller': C(40, 56, 26); C(40, 56, 8, true); ctx.lineWidth = 5; L([[70, 34], [92, 34]]); L([[74, 50], [96, 50]]); L([[70, 66], [92, 66]]); ctx.lineWidth = 7; L([[14, 86], [70, 86]]); break;
      case 'buckshot': C(20, 50, 8, true); ctx.lineWidth = 5; for (const dy of [-24, -12, 0, 12, 24]) { L([[32, 50 + dy * 0.2], [86, 50 + dy]]); C(88, 50 + dy, 4, true); } break;
      case 'roll': ctx.beginPath(); ctx.arc(50, 52, 28, Math.PI * 0.9, Math.PI * 2.3); ctx.stroke(); F([[72, 20], [86, 40], [64, 44]]); break;
      case 'trap': ctx.beginPath(); ctx.arc(50, 56, 32, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 4; for (let i = 0; i <= 6; i++) { const x = 22 + i * 9.3; L([[x, 56], [x + 4, 42], [x + 8, 56]]); } ctx.lineWidth = 7; L([[14, 70], [86, 70]]); C(50, 70, 6, true); break;
      case 'lead': for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 18 + c * 22 + r * 6, y = 18 + r * 26; ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.fillRect(-3, -9, 6, 14); ctx.beginPath(); ctx.arc(0, 5, 3, 0, Math.PI); ctx.fill(); ctx.restore(); } break;
      case 'syringe': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); ctx.strokeRect(-30, -10, 46, 20); ctx.fillStyle = accent; ctx.fillRect(-26, -6, 26, 12); ctx.lineWidth = 5; L([[16, 0], [40, 0]]); L([[-30, -14], [-30, 14]]); L([[-42, 0], [-30, 0]]); L([[-42, -10], [-42, 10]]); ctx.restore(); break;
      case 'gas': ctx.fillStyle = accent; for (const [x, y, r] of [[34, 56, 18], [56, 46, 22], [70, 62, 16], [46, 68, 14]]) C(x, y, r, true); ctx.fillStyle = bg[1]; C(52, 50, 4, true); C(64, 62, 3, true); break;
      case 'adrenaline': F([[50, 84], [16, 50], [16, 32], [30, 18], [50, 30], [70, 18], [84, 32], [84, 50]]); ctx.strokeStyle = bg[1]; ctx.lineWidth = 6; L([[58, 30], [44, 52], [58, 52], [44, 74]]); break;
      case 'stim': F([[40, 12], [60, 12], [60, 40], [88, 40], [88, 60], [60, 60], [60, 88], [40, 88], [40, 60], [12, 60], [12, 40], [40, 40]]); break;
      case 'arc': ctx.fillStyle = accent; F([[58, 8], [24, 56], [46, 56], [38, 92], [76, 40], [54, 40]]); break;
      case 'mine': ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(50, 46, 24, Math.PI, 0); ctx.stroke(); L([[26, 46], [26, 72]]); L([[74, 46], [74, 72]]); ctx.fillStyle = accent; ctx.fillRect(18, 72, 16, 10); ctx.fillRect(66, 72, 16, 10); break;
      case 'overload': ctx.fillStyle = accent; F([[62, 10], [36, 50], [54, 50], [44, 90], [72, 44], [54, 44]]); ctx.lineWidth = 4; L([[10, 40], [28, 40]]); L([[6, 56], [26, 56]]); L([[12, 72], [30, 72]]); break;
      case 'storm': F([[20, 46], [24, 30], [40, 24], [52, 12], [70, 18], [80, 32], [84, 46]]); ctx.fillStyle = accent; F([[44, 50], [30, 74], [42, 74], [34, 94], [56, 66], [44, 66], [52, 50]]); F([[70, 50], [62, 66], [70, 66], [64, 82], [80, 60], [72, 60], [76, 50]]); break;
      case 'flash': ctx.fillStyle = '#ffe9a8'; F([[50, 6], [60, 40], [94, 50], [60, 60], [50, 94], [40, 60], [6, 50], [40, 40]]); break;
      case 'patch': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); ctx.fillStyle = '#e8d8b8'; ctx.fillRect(-38, -14, 76, 28); ctx.fillStyle = '#c9b48a'; ctx.fillRect(-12, -14, 24, 28); ctx.fillStyle = '#8a7650'; for (const [x, y] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } ctx.restore(); break;
      case 'recall': L([[50, 14], [16, 44], [84, 44], [50, 14]]); ctx.strokeRect(26, 44, 48, 40); ctx.fillRect(42, 60, 16, 24); break;
      // Objets
      case 'boots': F([[30, 14], [56, 14], [56, 60], [86, 66], [88, 84], [24, 84], [24, 60]]); ctx.fillStyle = bg[1]; ctx.fillRect(24, 74, 64, 4); break;
      case 'knife': F([[16, 84], [30, 70], [78, 14], [84, 22], [42, 76]]); ctx.fillStyle = '#5a3d24'; F([[10, 90], [26, 74], [36, 84], [20, 98]]); break;
      case 'bloodpump': ctx.fillStyle = '#d4362a'; F([[50, 84], [18, 52], [18, 34], [32, 20], [50, 32], [68, 20], [82, 34], [82, 52]]); ctx.strokeStyle = '#f3e6cf'; ctx.lineWidth = 5; L([[50, 30], [50, 8], [76, 8]]); break;
      case 'trigger': ctx.lineWidth = 8; L([[14, 30], [86, 30]]); L([[26, 30], [20, 80]]); ctx.beginPath(); ctx.arc(48, 52, 14, 0, Math.PI); ctx.stroke(); L([[44, 30], [44, 54]]); break;
      case 'plates': for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#c9b48a' : '#f3e6cf'; ctx.fillRect(16 + i * 6, 18 + i * 22, 62, 16); ctx.fillStyle = bg[1]; ctx.beginPath(); ctx.arc(24 + i * 6, 26 + i * 22, 3, 0, 7); ctx.arc(70 + i * 6, 26 + i * 22, 3, 0, 7); ctx.fill(); } break;
      case 'insulation': ctx.beginPath(); ctx.ellipse(36, 50, 18, 32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(36, 18, 46, 64); ctx.fillStyle = '#e8b04a'; for (let i = 0; i < 4; i++) ctx.fillRect(44, 24 + i * 15, 34, 6); break;
      case 'battery': ctx.strokeRect(14, 30, 72, 50); ctx.fillRect(24, 20, 14, 10); ctx.fillRect(62, 20, 14, 10); ctx.fillStyle = '#e8b04a'; F([[54, 36], [38, 60], [50, 60], [44, 76], [62, 52], [50, 52]]); break;
      case 'jerrycan': F([[20, 24], [62, 24], [80, 42], [80, 88], [20, 88]]); ctx.fillStyle = bg[1]; ctx.fillRect(30, 30, 22, 8); ctx.strokeStyle = bg[1]; ctx.lineWidth = 5; L([[30, 50], [70, 80]]); L([[70, 50], [30, 80]]); break;
      case 'vest': F([[24, 16], [40, 16], [50, 30], [60, 16], [76, 16], [86, 40], [80, 88], [20, 88], [14, 40]]); ctx.fillStyle = bg[1]; for (let i = 0; i < 3; i++) ctx.fillRect(22, 46 + i * 13, 56, 4); break;
      case 'chainsaw': ctx.fillRect(10, 40, 34, 30); ctx.lineWidth = 6; ctx.strokeRect(44, 44, 46, 22); ctx.lineWidth = 3; for (let i = 0; i < 8; i++) L([[46 + i * 6, 40], [49 + i * 6, 36]]); ctx.fillStyle = '#e8b04a'; ctx.fillRect(14, 30, 20, 10); break;
      case 'autogun': ctx.fillRect(12, 30, 70, 16); ctx.fillRect(28, 46, 16, 36); ctx.fillRect(52, 46, 10, 28); ctx.fillStyle = '#e8b04a'; ctx.fillRect(82, 34, 10, 8); break;
      case 'reactor': ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(50, 50, 38, 14, i * Math.PI / 3, 0, Math.PI * 2); ctx.stroke(); } ctx.fillStyle = '#7fdcff'; C(50, 50, 10, true); break;
      case 'tankshell': F([[50, 8], [70, 30], [70, 92], [30, 92], [30, 30]]); ctx.fillStyle = '#c87533'; ctx.fillRect(30, 70, 40, 10); break;
      case 'gasmask': ctx.beginPath(); ctx.ellipse(50, 46, 32, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = bg[1]; C(38, 40, 9, true); C(62, 40, 9, true); ctx.fillStyle = '#d8c890'; C(38, 40, 6, true); C(62, 40, 6, true); ctx.fillStyle = '#5a564c'; C(50, 68, 10, true); break;
      case 'medkit': ctx.fillRect(12, 28, 76, 56); ctx.strokeRect(36, 16, 28, 12); ctx.fillStyle = '#d4362a'; ctx.fillRect(44, 40, 12, 34); ctx.fillRect(33, 51, 34, 12); break;
      case 'coil': ctx.fillStyle = '#c87533'; for (let i = 0; i < 7; i++) ctx.fillRect(30, 20 + i * 10, 40, 6); ctx.fillStyle = '#9aa8b0'; C(50, 14, 8, true); ctx.strokeStyle = '#7fdcff'; ctx.lineWidth = 3; L([[58, 12], [72, 6], [68, 16], [86, 10]]); break;
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, S - 2, S - 2);
  },
};
