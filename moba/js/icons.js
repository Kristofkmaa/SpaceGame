// ============ Icônes peintes : compétences, sorts, objets ============
const ICON_BG = { atk: ['#8a3a22', '#2a0e06'], mag: ['#3a4a8a', '#0c1028'], def: ['#4a6a4a', '#0e1a0e'], spd: ['#8a6a3a', '#22180a'], use: ['#6a7a3a', '#141a08'], spell: ['#3a5a6a', '#0a161c'] };
const Icons = {
  cache: {},
  get(id, size, kind, hero) { const k = id + size + kind + (hero || ''); if (!this.cache[k]) { const c = document.createElement('canvas'); c.width = c.height = size; this.draw(c.getContext('2d'), id, size, kind, hero); this.cache[k] = c; } const out = document.createElement('canvas'); out.width = out.height = size; out.getContext('2d').drawImage(this.cache[k], 0, 0); return out; },
  draw(ctx, id, S, kind, hero) {
    const bg = kind === 'ability' ? HERO_THEME[hero].bg : kind === 'spell' ? ICON_BG.spell : ICON_BG[ITEMS[id] ? ITEMS[id].cat : 'atk'];
    const g = ctx.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S * 0.5, S * 0.5, S * 0.8); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.scale(S / 100, S / 100);
    const gold = ctx.createLinearGradient(0, 10, 0, 90); gold.addColorStop(0, '#fff4d8'); gold.addColorStop(1, kind === 'item' ? '#e0b060' : '#f0c878');
    ctx.fillStyle = gold; ctx.strokeStyle = gold; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    const acc = kind === 'ability' ? HERO_THEME[hero].accent : '#ffcf6b';
    const L = p => { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); };
    const F = (p, c) => { if (c) ctx.fillStyle = c; ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); ctx.fillStyle = gold; };
    const C = (x, y, r, fill, c) => { if (c) { ctx.fillStyle = c; ctx.strokeStyle = c; } ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); ctx.fillStyle = gold; ctx.strokeStyle = gold; };
    const R = (x, y, w, h, c) => { if (c) ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.fillStyle = gold; };
    const shield = (cx, cy, s, c) => F([[cx, cy - 34 * s], [cx + 28 * s, cy - 24 * s], [cx + 25 * s, cy + 8 * s], [cx, cy + 34 * s], [cx - 25 * s, cy + 8 * s], [cx - 28 * s, cy - 24 * s]], c);
    const flame = (cx, cy, s, c) => { if (c) ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy - 40 * s); ctx.bezierCurveTo(cx + 30 * s, cy - 10 * s, cx + 26 * s, cy + 30 * s, cx, cy + 34 * s); ctx.bezierCurveTo(cx - 26 * s, cy + 30 * s, cx - 30 * s, cy - 6 * s, cx - 6 * s, cy - 18 * s); ctx.bezierCurveTo(cx - 4 * s, cy - 6 * s, cx + 4 * s, cy - 10 * s, cx, cy - 40 * s); ctx.fill(); ctx.fillStyle = gold; };
    const bolt = (dx = 0, s = 1, c = acc) => F([[58 * s + dx, 8], [24 * s + dx, 56], [46 * s + dx, 56], [38 * s + dx, 92], [76 * s + dx, 40], [54 * s + dx, 40]], c);
    const boot = c => { F([[30, 14], [56, 14], [56, 58], [86, 64], [88, 84], [22, 84], [22, 58]]); if (c) R(22, 70, 66, 6, c); };
    switch (id) {
      // --- Mère Rouille
      case 'scrap': ctx.save(); ctx.translate(40, 58); for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -30, 12, 12); } ctx.restore(); C(40, 58, 18, true); C(40, 58, 8, true, '#2a1a0a'); F([[66, 14], [86, 26], [86, 48], [66, 60], [46, 48], [46, 26]], acc); C(66, 37, 8, true, '#2a1a0a'); break;
      case 'hook': ctx.lineWidth = 5; for (let i = 0; i < 5; i++) C(16 + i * 10, 84 - i * 10, 5); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(70, 34, 18, Math.PI * 0.75, Math.PI * 2.1); ctx.stroke(); F([[86, 30], [96, 46], [80, 44]], acc); break;
      case 'scrapshield': shield(50, 50, 1); for (const [x, y] of [[36, 34], [64, 34], [36, 56], [64, 56], [50, 70]]) C(x, y, 5, true, '#3a2a1a'); ctx.strokeStyle = acc; ctx.lineWidth = 4; L([[30, 46], [70, 46]]); break;
      case 'press': R(34, 10, 32, 26); R(26, 36, 14, 34); R(60, 36, 14, 34); F([[26, 70], [40, 70], [36, 82]], acc); F([[60, 70], [74, 70], [64, 82]], acc); ctx.lineWidth = 5; L([[16, 92], [84, 92]]); break;
      case 'magnet': ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(50, 46, 24, Math.PI, 0); ctx.stroke(); L([[26, 46], [26, 66]]); L([[74, 46], [74, 66]]); R(18, 66, 16, 16, acc); R(66, 66, 16, 16, acc); ctx.lineWidth = 3; ctx.strokeStyle = acc; L([[40, 88], [44, 96]]); L([[60, 88], [56, 96]]); break;
      // --- Frère Goudron
      case 'pilgrim': for (const [x, y, s] of [[30, 80, 1], [52, 60, -1], [36, 40, 1], [58, 20, -1]]) { ctx.beginPath(); ctx.ellipse(x, y, 7, 11, s * 0.2, 0, Math.PI * 2); ctx.fill(); C(x + s * 2, y - 15, 3, true); } C(78, 76, 9, true, acc); break;
      case 'tarpalm': R(30, 40, 40, 36); for (let i = 0; i < 4; i++) R(30 + i * 10.5, 14 + Math.abs(i - 1.5) * 5, 8, 30); R(16, 50, 16, 10); for (const x of [36, 52, 64]) F([[x - 4, 76], [x + 4, 76], [x, 92]], '#1a1410'); break;
      case 'vow': C(50, 50, 34); ctx.lineWidth = 7; L([[30, 62], [70, 62]]); ctx.strokeStyle = acc; ctx.lineWidth = 9; L([[50, 30], [50, 80]]); break;
      case 'slowmarch': for (const [x, y] of [[34, 70], [62, 36]]) { ctx.beginPath(); ctx.ellipse(x, y, 10, 16, 0.3, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = acc; for (const [x, y] of [[20, 90], [44, 88], [72, 60], [84, 70]]) { ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = gold; break;
      case 'sermon': F([[50, 8], [76, 52], [70, 80], [50, 90], [30, 80], [24, 52]], '#1a1410'); ctx.lineWidth = 5; ctx.strokeStyle = acc; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; L([[50 + Math.cos(a) * 40, 56 + Math.sin(a) * 40], [50 + Math.cos(a) * 46, 56 + Math.sin(a) * 46]]); } C(44, 54, 5, true, '#fff4d8'); break;
      // --- Louve
      case 'scent': ctx.beginPath(); ctx.moveTo(10, 50); ctx.quadraticCurveTo(50, 14, 90, 50); ctx.quadraticCurveTo(50, 86, 10, 50); ctx.fill(); C(50, 50, 14, true, acc); C(50, 50, 5, true, '#1a0606'); ctx.lineWidth = 4; L([[20, 20], [30, 28]]); L([[80, 20], [70, 28]]); break;
      case 'pounce': for (const dx of [-14, 0, 14]) F([[50 + dx, 18], [56 + dx, 56], [50 + dx, 64], [44 + dx, 56]]); F([[70, 70], [92, 80], [70, 90]], acc); ctx.lineWidth = 5; L([[20, 80], [80, 80]]); break;
      case 'fangs': ctx.lineWidth = 7; L([[16, 84], [70, 20]]); L([[84, 84], [30, 20]]); F([[34, 50], [42, 50], [38, 70]], acc); F([[58, 50], [66, 50], [62, 70]], acc); break;
      case 'howl': F([[22, 90], [30, 56], [46, 40], [54, 14], [62, 34], [74, 30], [70, 50], [60, 64], [58, 90]]); C(56, 38, 3, true, acc); ctx.strokeStyle = acc; ctx.lineWidth = 4; for (const r of [12, 22]) { ctx.beginPath(); ctx.arc(66, 22, r, -1.4, -0.2); ctx.stroke(); } break;
      case 'quarry': C(50, 46, 26, true); C(40, 42, 7, true, '#2a0a0a'); C(60, 42, 7, true, '#2a0a0a'); F([[50, 52], [46, 60], [54, 60]], '#2a0a0a'); for (const x of [38, 46, 54, 62]) R(x - 2, 66, 5, 10); ctx.strokeStyle = acc; ctx.lineWidth = 4; C(50, 50, 42); L([[50, 2], [50, 14]]); L([[50, 86], [50, 98]]); break;
      // --- Vieux Silo
      case 'reserve': R(28, 24, 44, 64); ctx.beginPath(); ctx.ellipse(50, 24, 22, 8, 0, 0, Math.PI * 2); ctx.fill(); R(44, 8, 12, 10); F([[50, 42], [62, 62], [58, 72], [50, 76], [42, 72], [38, 62]], acc); break;
      case 'jet': R(8, 40, 30, 20); R(38, 44, 14, 12); ctx.strokeStyle = acc; ctx.lineWidth = 6; for (const dy of [-12, 0, 12]) L([[56, 50 + dy * 0.3], [92, 50 + dy]]); break;
      case 'puddle': F([[50, 8], [66, 36], [62, 48], [50, 52], [38, 48], [34, 36]], acc); ctx.lineWidth = 5; for (const [rx, ry] of [[22, 7], [36, 12]]) { ctx.beginPath(); ctx.ellipse(50, 74, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); } break;
      case 'dive': ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(14, 60); ctx.quadraticCurveTo(40, 0, 66, 64); ctx.stroke(); F([[58, 58], [74, 62], [66, 74]]); ctx.fillStyle = acc; for (const [x, h] of [[54, 16], [66, 24], [78, 16]]) F([[x - 5, 92], [x, 92 - h], [x + 5, 92]], acc); break;
      case 'flood': ctx.beginPath(); ctx.moveTo(6, 90); ctx.quadraticCurveTo(10, 30, 50, 20); ctx.quadraticCurveTo(84, 14, 90, 40); ctx.quadraticCurveTo(70, 30, 62, 46); ctx.quadraticCurveTo(80, 60, 94, 90); ctx.closePath(); ctx.fillStyle = acc; ctx.fill(); ctx.fillStyle = gold; ctx.lineWidth = 4; L([[20, 70], [44, 50]]); break;
      // --- Néon
      case 'surge': bolt(0, 1, acc); for (const [x, y] of [[20, 80], [80, 20], [82, 80]]) C(x, y, 8, true); break;
      case 'arc': bolt(); break;
      case 'shortcircuit': R(30, 40, 30, 34); R(36, 26, 6, 14); R(48, 26, 6, 14); ctx.lineWidth = 6; L([[45, 74], [45, 92]]); F([[66, 20], [86, 30], [74, 38], [92, 50], [70, 44], [80, 34]], acc); break;
      case 'skates': F([[20, 22], [46, 22], [50, 54], [82, 58], [86, 72], [18, 72]]); R(18, 72, 68, 6, '#2a1a3a'); for (const x of [28, 50, 72]) C(x, 86, 8, true, acc); break;
      case 'blackout': C(50, 40, 24, true); R(40, 62, 20, 16); R(42, 80, 16, 6); ctx.strokeStyle = acc; ctx.lineWidth = 8; L([[14, 14], [86, 86]]); break;
      // --- Sœur Cendre
      case 'offering': ctx.strokeStyle = acc; ctx.lineWidth = 5; C(50, 24, 16); flame(50, 60, 0.85); break;
      case 'flamer': R(8, 44, 30, 14); F([[38, 40], [92, 18], [92, 84], [38, 62]], acc); flame(70, 52, 0.55); break;
      case 'molotov': R(40, 36, 20, 50); R(44, 22, 12, 16); flame(50, 16, 0.35, acc); R(42, 54, 16, 12, acc); break;
      case 'ignite': flame(50, 54, 1, acc); flame(50, 60, 0.55); break;
      case 'inferno': flame(30, 60, 0.6, acc); flame(70, 60, 0.6, acc); flame(50, 50, 0.95); ctx.lineWidth = 5; L([[10, 90], [90, 90]]); break;
      // --- La Comtesse
      case 'etiquette': ctx.lineWidth = 9; C(44, 44, 26); ctx.fillStyle = acc; ctx.globalAlpha = 0.5; C(44, 44, 20, true, acc); ctx.globalAlpha = 1; ctx.lineWidth = 4; ctx.strokeStyle = gold; ctx.beginPath(); ctx.moveTo(64, 62); ctx.quadraticCurveTo(80, 80, 72, 94); ctx.stroke(); break;
      case 'aimed': C(50, 50, 30); C(50, 50, 6, true, acc); ctx.lineWidth = 5; L([[50, 6], [50, 30]]); L([[50, 70], [50, 94]]); L([[6, 50], [30, 50]]); L([[70, 50], [94, 50]]); break;
      case 'curtsey': F([[50, 20], [62, 40], [80, 88], [20, 88], [38, 40]]); C(50, 14, 8, true); ctx.strokeStyle = acc; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(50, 60, 40, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); F([[60, 18], [72, 24], [60, 30]], acc); break;
      case 'snare': ctx.beginPath(); ctx.arc(50, 58, 32, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 4; for (let i = 0; i <= 6; i++) { const x = 22 + i * 9.3; L([[x, 58], [x + 4, 44], [x + 8, 58]]); } ctx.lineWidth = 7; L([[12, 72], [88, 72]]); C(50, 72, 6, true, acc); break;
      case 'lastbullet': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); R(-10, -6, 20, 40); ctx.beginPath(); ctx.moveTo(-10, -6); ctx.quadraticCurveTo(0, -40, 10, -6); ctx.fill(); R(-11, 26, 22, 8, acc); ctx.restore(); ctx.strokeStyle = acc; ctx.lineWidth = 3; C(50, 50, 44); break;
      // --- Gros Gaspard
      case 'warmup': R(42, 10, 16, 60); C(50, 78, 14, true); R(46, 36, 8, 40, acc); C(50, 78, 9, true, acc); ctx.lineWidth = 3; for (const y of [20, 32, 44]) L([[60, y], [70, y]]); break;
      case 'burst': C(18, 50, 9, true); ctx.lineWidth = 4; for (const dy of [-26, -13, 0, 13, 26]) { L([[30, 50 + dy * 0.2], [84, 50 + dy]]); C(88, 50 + dy, 4, true, acc); } break;
      case 'dugin': ctx.lineWidth = 6; L([[50, 40], [24, 88]]); L([[50, 40], [76, 88]]); L([[50, 40], [50, 88]]); R(30, 24, 52, 16); for (const x of [14, 40, 66]) { ctx.beginPath(); ctx.ellipse(x + 12, 90, 14, 6, 0, 0, Math.PI * 2); ctx.fillStyle = acc; ctx.fill(); } ctx.fillStyle = gold; break;
      case 'grenade': R(24, 40, 52, 46); R(18, 34, 64, 8); R(44, 24, 12, 10); ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(50, 22); ctx.quadraticCurveTo(40, 12, 50, 6); ctx.stroke(); L([[30, 60], [70, 60]]); break;
      case 'barrage': for (let i = 0; i < 6; i++) R(10, 26 + i * 8, 46, 5); R(56, 26, 14, 46); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C(78 + c * 7, 30 + r * 16 + c * 4, 3, true, acc); break;
      // --- Doc Suture
      case 'triage': F([[40, 10], [60, 10], [60, 40], [90, 40], [90, 60], [60, 60], [60, 90], [40, 90], [40, 60], [10, 60], [10, 40], [40, 40]], acc); ctx.lineWidth = 3; ctx.strokeStyle = '#0a1c12'; for (const x of [30, 44, 58]) L([[x, 30], [x + 12, 70]]); break;
      case 'syringe': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); ctx.strokeRect(-30, -10, 46, 20); R(-26, -6, 26, 12, acc); ctx.lineWidth = 5; L([[16, 0], [42, 0]]); L([[-30, -14], [-30, 14]]); L([[-44, 0], [-30, 0]]); L([[-44, -10], [-44, 10]]); ctx.restore(); break;
      case 'transfusion': R(20, 10, 40, 52); R(24, 26, 32, 32, '#d4362a'); R(34, 4, 12, 8); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, 62); ctx.quadraticCurveTo(40, 90, 70, 84); ctx.stroke(); C(78, 80, 9, true, acc); break;
      case 'sleepgas': for (const [x, y, r] of [[34, 58, 18], [56, 46, 22], [72, 62, 16], [48, 70, 14]]) C(x, y, r, true, '#b89ae8'); ctx.strokeStyle = '#fff4d8'; ctx.lineWidth = 5; L([[60, 12], [80, 12], [60, 32], [80, 32]]); break;
      case 'revive': F([[50, 86], [14, 50], [14, 30], [30, 16], [50, 30], [70, 16], [86, 30], [86, 50]], '#e85a4a'); ctx.strokeStyle = '#fff4d8'; ctx.lineWidth = 5; L([[16, 52], [36, 52], [44, 36], [54, 68], [62, 46], [84, 46]]); break;
      // --- Le Crieur
      case 'onair': R(40, 14, 20, 40); C(50, 14, 10, true); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(50, 44, 20, 0, Math.PI); ctx.stroke(); L([[50, 64], [50, 76]]); R(14, 80, 72, 14, '#c83a2a'); break;
      case 'feedback': F([[14, 40], [32, 40], [56, 18], [56, 82], [32, 60], [14, 60]]); ctx.strokeStyle = acc; ctx.lineWidth = 5; for (const r of [14, 26, 38]) { ctx.beginPath(); ctx.arc(56, 50, r, -0.8, 0.8); ctx.stroke(); } break;
      case 'anthem': C(32, 74, 13, true); C(70, 66, 13, true); R(40, 18, 7, 58); R(78, 10, 7, 58); F([[40, 18], [85, 10], [85, 24], [40, 32]], acc); break;
      case 'jamming': ctx.lineWidth = 6; L([[50, 90], [50, 30]]); L([[30, 90], [50, 30], [70, 90]]); ctx.strokeStyle = acc; ctx.lineWidth = 4; L([[10, 22], [20, 12], [30, 22], [40, 12]]); L([[60, 12], [70, 22], [80, 12], [90, 22]]); C(50, 26, 6, true); break;
      case 'soundwall': ctx.lineWidth = 7; for (const x of [24, 44, 64]) { ctx.beginPath(); ctx.arc(x, 50, 36, -0.9, 0.9); ctx.stroke(); } ctx.strokeStyle = acc; ctx.beginPath(); ctx.arc(84, 50, 36, -0.9, 0.9); ctx.stroke(); break;
      // --- Balafre
      case 'guard': ctx.save(); ctx.translate(50, 50); R(-4, -44, 8, 64); R(-18, 18, 36, 7); R(-4, 25, 8, 16, '#6a4426'); ctx.restore(); ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(50, 50, 38, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); break;
      case 'lunge': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.5); R(-40, -4, 70, 8); F([[30, -6], [46, 0], [30, 6]]); R(-44, -14, 6, 28); R(-58, -4, 14, 8, '#6a4426'); ctx.restore(); ctx.strokeStyle = acc; ctx.lineWidth = 4; L([[8, 80], [30, 72]]); L([[12, 92], [36, 84]]); break;
      case 'counter': for (const s of [-1, 1]) { ctx.save(); ctx.translate(50, 50); ctx.rotate(s * 0.78); R(-4, -44, 8, 62); R(-14, 16, 28, 6); ctx.restore(); } C(50, 32, 9, true, acc); break;
      case 'whirl': ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(50, 50, 32, 0.2, Math.PI * 1.7); ctx.stroke(); F([[80, 18], [86, 44], [64, 36]], acc); ctx.save(); ctx.translate(50, 50); ctx.rotate(0.6); R(-3, -24, 6, 30); ctx.restore(); break;
      case 'ticket': F([[14, 26], [86, 26], [86, 42], [80, 50], [86, 58], [86, 74], [14, 74], [14, 58], [20, 50], [14, 42]]); ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); L([[64, 28], [64, 72]]); ctx.setLineDash([]); ctx.strokeStyle = acc; ctx.lineWidth = 7; L([[10, 86], [90, 14]]); break;
      // --- Capitaine Vase
      case 'powder': F([[30, 40], [70, 40], [76, 86], [24, 86]]); R(26, 50, 48, 6, '#6a4426'); R(26, 72, 48, 6, '#6a4426'); ctx.strokeStyle = acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(50, 40); ctx.quadraticCurveTo(60, 20, 72, 22); ctx.stroke(); C(76, 18, 6, true, acc); break;
      case 'slash': ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(30, 74, 58, -1.35, -0.2); ctx.stroke(); ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(30, 74, 46, -1.25, -0.3); ctx.stroke(); R(14, 70, 24, 8); break;
      case 'pistol': R(12, 34, 60, 12); F([[18, 46], [38, 46], [32, 84], [12, 80]], '#8a5a30'); R(60, 30, 8, 6); ctx.strokeStyle = acc; ctx.lineWidth = 4; L([[76, 36], [92, 30]]); L([[76, 42], [92, 46]]); break;
      case 'boarding': ctx.lineWidth = 7; L([[50, 20], [50, 72]]); ctx.beginPath(); ctx.arc(50, 56, 26, 0.3, Math.PI - 0.3); ctx.stroke(); F([[72, 64], [84, 54], [80, 70]], acc); F([[28, 64], [16, 54], [20, 70]], acc); C(50, 16, 7); ctx.lineWidth = 3; L([[50, 10], [70, 2]]); break;
      case 'broadside': R(14, 52, 52, 22); C(24, 74, 10, true, '#6a4426'); C(54, 74, 10, true, '#6a4426'); R(62, 56, 14, 14); for (const [x, y] of [[84, 30], [70, 18], [90, 12]]) C(x, y, 6, true, acc); break;
      // --- Sorts
      case 'flash': F([[50, 4], [60, 40], [96, 50], [60, 60], [50, 96], [40, 60], [4, 50], [40, 40]], '#ffe9a8'); break;
      case 'patch': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); R(-38, -14, 76, 28, '#ecdcbc'); R(-12, -14, 24, 28, '#c9b48a'); ctx.restore(); break;
      case 'smite': F([[30, 14], [70, 14], [70, 36], [56, 36], [56, 86], [44, 86], [44, 36], [30, 36]]); bolt(20, 0.8, '#ffd24a'); break;
      case 'recall': L([[50, 14], [14, 44], [86, 44], [50, 14]]); ctx.strokeRect(24, 44, 52, 40); R(42, 60, 16, 24); break;
      // --- Objets
      case 'knife': F([[16, 84], [30, 70], [80, 14], [86, 20], [42, 76]]); F([[8, 92], [24, 76], [34, 86], [18, 100]], '#6a4426'); break;
      case 'pipe': ctx.lineWidth = 10; L([[20, 86], [72, 22]]); ctx.beginPath(); ctx.arc(80, 24, 10, Math.PI * 0.8, Math.PI * 2.1); ctx.stroke(); L([[20, 86], [12, 78]]); break;
      case 'trigger': ctx.lineWidth = 9; L([[12, 30], [88, 30]]); L([[24, 30], [18, 82]]); ctx.beginPath(); ctx.arc(48, 52, 14, 0, Math.PI); ctx.stroke(); L([[44, 30], [44, 54]]); break;
      case 'scope': R(14, 40, 72, 20); C(30, 50, 14, true, '#2a1a10'); C(30, 50, 9, true, '#8ad8ff'); ctx.lineWidth = 3; ctx.strokeStyle = '#2a1a10'; L([[58, 30], [62, 70]]); break;
      case 'plates': for (let i = 0; i < 3; i++) { R(14 + i * 6, 16 + i * 22, 64, 16, i === 1 ? '#c9b48a' : undefined); C(22 + i * 6, 24 + i * 22, 3, true, '#22180a'); C(70 + i * 6, 24 + i * 22, 3, true, '#22180a'); } break;
      case 'insulation': ctx.beginPath(); ctx.ellipse(34, 50, 18, 32, 0, 0, Math.PI * 2); ctx.stroke(); R(34, 18, 48, 64); for (let i = 0; i < 4; i++) R(42, 24 + i * 15, 36, 6, '#e8b04a'); break;
      case 'vest': F([[24, 14], [40, 14], [50, 28], [60, 14], [76, 14], [88, 40], [82, 90], [18, 90], [12, 40]]); for (let i = 0; i < 3; i++) R(20, 46 + i * 13, 60, 4, '#2a1a10'); break;
      case 'vial': R(40, 12, 20, 14); F([[40, 26], [60, 26], [78, 72], [70, 90], [30, 90], [22, 72]]); F([[30, 60], [70, 60], [78, 72], [70, 88], [30, 88], [22, 72]], '#8cff7a'); break;
      case 'battery': ctx.strokeRect(14, 30, 72, 52); R(24, 20, 14, 10); R(62, 20, 14, 10); F([[54, 36], [38, 60], [50, 60], [44, 78], [64, 52], [52, 52]], '#ffcf4a'); break;
      case 'capacitor': R(30, 14, 40, 70); R(36, 84, 6, 12); R(58, 84, 6, 12); R(30, 30, 40, 6, '#3a4a8a'); bolt(0, 1, '#9fe8ff'); break;
      case 'jerrycan': F([[20, 24], [62, 24], [82, 42], [82, 90], [20, 90]]); R(30, 30, 22, 8, '#22180a'); ctx.strokeStyle = '#22180a'; ctx.lineWidth = 5; L([[30, 50], [72, 82]]); L([[72, 50], [30, 82]]); break;
      case 'gear': for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(50, 50); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-7, -42, 14, 16); ctx.restore(); } C(50, 50, 28, true); C(50, 50, 10, true, '#141a28'); break;
      case 'boots': boot(); break;
      case 'bootsArmor': boot('#8a8a82'); R(56, 30, 10, 30, '#8a8a82'); break;
      case 'bootsAtk': boot('#d8482a'); F([[60, 20], [80, 30], [62, 36]], '#d8482a'); break;
      case 'bootsMag': boot('#7fdcff'); C(70, 30, 8, true, '#7fdcff'); break;
      case 'potion': F([[38, 10], [62, 10], [62, 30], [80, 54], [74, 90], [26, 90], [20, 54], [38, 30]]); F([[24, 58], [76, 58], [74, 88], [26, 88]], '#e8584a'); R(44, 66, 12, 4, '#fff4d8'); R(48, 62, 4, 12, '#fff4d8'); break;
      case 'bloodpump': F([[50, 88], [16, 54], [16, 34], [30, 20], [50, 32], [70, 20], [84, 34], [84, 54]], '#d4362a'); ctx.lineWidth = 6; L([[50, 30], [50, 8], [80, 8]]); break;
      case 'revolver': R(14, 30, 60, 14); C(48, 44, 14, true); R(20, 50, 16, 34); R(74, 32, 12, 8, '#ffcf4a'); break;
      case 'sight': C(50, 50, 32); C(50, 50, 6, true, '#ff3a2a'); ctx.lineWidth = 4; L([[50, 8], [50, 30]]); L([[50, 70], [50, 92]]); L([[8, 50], [30, 50]]); L([[70, 50], [92, 50]]); break;
      case 'hydraulics': R(34, 10, 32, 50); R(42, 60, 16, 32, '#c96f2b'); R(28, 86, 44, 8); R(30, 6, 40, 8); break;
      case 'kevlar': F([[24, 14], [40, 14], [50, 28], [60, 14], [76, 14], [88, 40], [82, 90], [18, 90], [12, 40]]); shield(50, 56, 0.55, '#4a6a4a'); break;
      case 'faraday': ctx.lineWidth = 4; ctx.strokeRect(18, 18, 64, 64); for (let i = 1; i < 4; i++) { L([[18 + i * 16, 18], [18 + i * 16, 82]]); L([[18, 18 + i * 16], [82, 18 + i * 16]]); } bolt(0, 1, '#9fe8ff'); break;
      case 'bulwark': shield(50, 50, 1.2); shield(50, 50, 0.7, '#4a6a4a'); break;
      case 'coil': for (let i = 0; i < 7; i++) R(30, 18 + i * 10, 40, 6, '#c87533'); C(50, 12, 8, true, '#9aa8b0'); ctx.strokeStyle = '#7fdcff'; ctx.lineWidth = 3; L([[58, 10], [72, 4], [68, 14], [88, 8]]); break;
      case 'generator': R(14, 30, 72, 50); C(36, 55, 14, true, '#141a28'); C(36, 55, 6, true); R(58, 38, 20, 6, '#ffcf4a'); R(58, 50, 20, 6, '#ffcf4a'); R(58, 62, 20, 6, '#ffcf4a'); break;
      case 'chainsaw': R(8, 38, 34, 32); ctx.lineWidth = 6; ctx.strokeRect(42, 42, 50, 24); ctx.lineWidth = 3; for (let i = 0; i < 8; i++) L([[44 + i * 6, 38], [47 + i * 6, 34]]); R(12, 28, 22, 10, '#ffcf4a'); break;
      case 'railgun': R(8, 42, 84, 12); R(60, 36, 32, 4, '#9fe8ff'); R(60, 56, 32, 4, '#9fe8ff'); R(20, 54, 16, 30); C(88, 48, 6, true, '#9fe8ff'); break;
      case 'autogun': R(10, 30, 70, 18); R(26, 48, 16, 36); R(52, 48, 10, 26); R(80, 34, 12, 10, '#ffcf4a'); break;
      case 'vampire': F([[30, 14], [40, 60], [50, 30], [60, 60], [70, 14], [64, 80], [50, 60], [36, 80]]); C(50, 86, 8, true, '#d4362a'); break;
      case 'exoarmor': R(28, 14, 44, 30); R(20, 44, 60, 16, '#c96f2b'); R(30, 60, 14, 30); R(56, 60, 14, 30); break;
      case 'tankshell': F([[50, 6], [72, 30], [72, 92], [28, 92], [28, 30]]); R(28, 70, 44, 10, '#c87533'); break;
      case 'gasmask': ctx.beginPath(); ctx.ellipse(50, 48, 32, 36, 0, 0, Math.PI * 2); ctx.fill(); C(38, 42, 9, true, '#0e1a0e'); C(62, 42, 9, true, '#0e1a0e'); C(38, 42, 6, true, '#d8c890'); C(62, 42, 6, true, '#d8c890'); C(50, 70, 10, true, '#5a564c'); break;
      case 'spikes': shield(50, 52, 0.95); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; F([[50 + Math.cos(a) * 30, 52 + Math.sin(a) * 30], [50 + Math.cos(a) * 48, 52 + Math.sin(a) * 48], [50 + Math.cos(a + 0.12) * 30, 52 + Math.sin(a + 0.12) * 30]]); } break;
      case 'reactor': ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(50, 50, 38, 14, i * Math.PI / 3, 0, Math.PI * 2); ctx.stroke(); } C(50, 50, 10, true, '#7fdcff'); break;
      case 'tesla': for (let i = 0; i < 7; i++) R(32, 26 + i * 9, 36, 5, '#c87533'); C(50, 18, 10, true, '#9aa8b0'); ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 3; L([[40, 12], [22, 4], [28, 16], [8, 12]]); L([[60, 12], [78, 4], [72, 16], [92, 12]]); break;
      case 'medkit': R(12, 28, 76, 58); ctx.lineWidth = 6; ctx.strokeRect(36, 16, 28, 12); R(44, 40, 12, 36, '#d4362a'); R(32, 52, 36, 12, '#d4362a'); break;
    }
    ctx.restore();
    // Biseau
    ctx.strokeStyle = 'rgba(255,230,180,0.25)'; ctx.lineWidth = Math.max(1, S * 0.03); ctx.strokeRect(S * 0.03, S * 0.03, S * 0.94, S * 0.94);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = Math.max(1, S * 0.02); ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  },
};
