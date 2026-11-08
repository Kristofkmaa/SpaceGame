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
      // --- Brise‑Roc
      case 'ram': F([[18, 62], [58, 62], [58, 78], [88, 50], [58, 22], [58, 38], [18, 38]]); ctx.lineWidth = 4; L([[6, 30], [16, 30]]); L([[2, 50], [12, 50]]); L([[6, 70], [16, 70]]); break;
      case 'plate': shield(50, 50, 1); for (const [x, y] of [[36, 34], [64, 34], [36, 56], [64, 56], [50, 70]]) C(x, y, 4, true, '#3a2a1a'); break;
      case 'quake': C(50, 62, 10, true); ctx.lineWidth = 5; for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; L([[50 + Math.cos(a) * 16, 62 + Math.sin(a) * 16], [50 + Math.cos(a) * 34, 62 + Math.sin(a) * 34], [50 + Math.cos(a + 0.1) * 46, 62 + Math.sin(a + 0.1) * 46]]); } L([[12, 84], [88, 84]]); break;
      case 'roller': C(40, 56, 26); C(40, 56, 8, true); ctx.lineWidth = 5; L([[72, 34], [94, 34]]); L([[76, 50], [98, 50]]); L([[72, 66], [94, 66]]); ctx.lineWidth = 7; L([[12, 88], [70, 88]]); break;
      // --- Vipère
      case 'buckshot': C(18, 50, 9, true); ctx.lineWidth = 4; for (const dy of [-26, -13, 0, 13, 26]) { L([[30, 50 + dy * 0.2], [84, 50 + dy]]); C(88, 50 + dy, 4, true, acc); } break;
      case 'roll': ctx.beginPath(); ctx.arc(50, 52, 28, Math.PI * 0.9, Math.PI * 2.3); ctx.stroke(); F([[74, 18], [88, 40], [64, 44]]); break;
      case 'trap': ctx.beginPath(); ctx.arc(50, 58, 32, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 4; for (let i = 0; i <= 6; i++) { const x = 22 + i * 9.3; L([[x, 58], [x + 4, 44], [x + 8, 58]]); } ctx.lineWidth = 7; L([[12, 72], [88, 72]]); C(50, 72, 6, true, acc); break;
      case 'lead': for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 18 + c * 22 + r * 6, y = 16 + r * 26; ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.fillRect(-3, -9, 6, 14); ctx.beginPath(); ctx.arc(0, 5, 3, 0, Math.PI); ctx.fill(); ctx.restore(); } break;
      // --- Le Doc
      case 'syringe': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); ctx.strokeRect(-30, -10, 46, 20); R(-26, -6, 26, 12, acc); ctx.lineWidth = 5; L([[16, 0], [42, 0]]); L([[-30, -14], [-30, 14]]); L([[-44, 0], [-30, 0]]); L([[-44, -10], [-44, 10]]); ctx.restore(); break;
      case 'gas': for (const [x, y, r] of [[34, 58, 18], [56, 46, 22], [72, 62, 16], [48, 70, 14]]) C(x, y, r, true, acc); C(52, 50, 4, true, '#0a1c12'); C(66, 62, 3, true, '#0a1c12'); break;
      case 'adrenaline': F([[50, 86], [14, 50], [14, 30], [30, 16], [50, 30], [70, 16], [86, 30], [86, 50]], '#e85a4a'); ctx.strokeStyle = '#fff4d8'; ctx.lineWidth = 6; L([[58, 28], [44, 52], [58, 52], [44, 76]]); break;
      case 'stim': F([[40, 10], [60, 10], [60, 40], [90, 40], [90, 60], [60, 60], [60, 90], [40, 90], [40, 60], [10, 60], [10, 40], [40, 40]], acc); break;
      // --- Étincelle
      case 'arc': bolt(); break;
      case 'mine': ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(50, 46, 24, Math.PI, 0); ctx.stroke(); L([[26, 46], [26, 70]]); L([[74, 46], [74, 70]]); R(16, 70, 20, 12, acc); R(64, 70, 20, 12, acc); break;
      case 'overload': bolt(6); ctx.lineWidth = 4; L([[8, 40], [26, 40]]); L([[4, 56], [24, 56]]); L([[10, 72], [28, 72]]); break;
      case 'storm': F([[18, 46], [22, 30], [38, 24], [52, 12], [70, 18], [80, 32], [86, 46]]); F([[44, 50], [30, 74], [42, 74], [34, 94], [56, 66], [44, 66], [52, 50]], acc); F([[70, 50], [62, 66], [70, 66], [64, 84], [82, 60], [72, 60], [76, 50]], acc); break;
      // --- Rempart
      case 'shieldbash': shield(42, 50, 0.9); F([[70, 40], [90, 50], [70, 60]], acc); ctx.lineWidth = 6; L([[60, 50], [84, 50]]); break;
      case 'shieldwall': for (const dx of [-24, 0, 24]) shield(50 + dx, 54 - (dx ? 0 : 8), 0.62, dx ? undefined : acc); break;
      case 'taunt': shield(50, 50, 1); R(46, 26, 8, 30, '#2a1a10'); C(50, 66, 5, true, '#2a1a10'); break;
      case 'bastion': shield(50, 40, 0.8); ctx.lineWidth = 6; L([[14, 84], [86, 84]]); for (const x of [20, 34, 66, 80]) L([[x, 76], [x + (x < 50 ? -6 : 6), 64]]); break;
      // --- Crocs
      case 'pounce': for (const dx of [-14, 0, 14]) F([[50 + dx, 18], [56 + dx, 56], [50 + dx, 64], [44 + dx, 56]]); F([[70, 70], [92, 80], [70, 90]], acc); ctx.lineWidth = 5; L([[20, 80], [80, 80]]); break;
      case 'rend': ctx.lineWidth = 8; for (const dx of [-18, 0, 18]) L([[30 + dx, 16], [70 + dx, 84]]); ctx.strokeStyle = acc; ctx.lineWidth = 3; for (const dx of [-18, 0, 18]) L([[34 + dx, 22], [66 + dx, 78]]); break;
      case 'frenzy': F([[20, 30], [40, 70], [50, 40], [60, 70], [80, 30], [70, 84], [50, 60], [30, 84]], acc); C(50, 22, 8, true); break;
      case 'hunt': C(50, 46, 26, true); C(40, 42, 7, true, '#2a0a0a'); C(60, 42, 7, true, '#2a0a0a'); F([[50, 52], [46, 60], [54, 60]], '#2a0a0a'); for (const x of [38, 46, 54, 62]) R(x - 2, 66, 5, 10); ctx.strokeStyle = acc; ctx.lineWidth = 4; C(50, 50, 42); break;
      // --- Cendre
      case 'flamer': R(8, 44, 30, 14); F([[38, 40], [92, 18], [92, 84], [38, 62]], acc); flame(70, 52, 0.55); break;
      case 'molotov': R(40, 36, 20, 50); R(44, 22, 12, 16); flame(50, 16, 0.35, acc); R(42, 54, 16, 12, acc); break;
      case 'ignite': flame(50, 54, 1, acc); flame(50, 60, 0.55); break;
      case 'inferno': flame(30, 60, 0.6, acc); flame(70, 60, 0.6, acc); flame(50, 50, 0.95); ctx.lineWidth = 5; L([[10, 90], [90, 90]]); break;
      // --- Mécano
      case 'wrench': ctx.save(); ctx.translate(50, 50); ctx.rotate(-0.78); R(-6, -6, 12, 52); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, -18, 16, 0.6, Math.PI * 2 - 0.6 + Math.PI); ctx.stroke(); ctx.restore(); break;
      case 'turret': R(30, 60, 40, 26); R(36, 40, 28, 22, acc); R(60, 46, 32, 8); ctx.lineWidth = 6; L([[26, 88], [74, 88]]); break;
      case 'spring': ctx.lineWidth = 6; L([[30, 86], [70, 78], [30, 68], [70, 58], [30, 48], [70, 38], [30, 28]]); F([[50, 4], [66, 22], [34, 22]], acc); break;
      case 'exo': R(28, 14, 44, 30); R(20, 44, 60, 16, acc); R(30, 60, 14, 30); R(56, 60, 14, 30); C(50, 28, 7, true, '#1a1606'); break;
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
