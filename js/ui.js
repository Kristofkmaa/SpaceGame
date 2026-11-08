// ============ HUD en jeu ============
class UI {
  constructor(app) {
    this.app = app;
    this.el = {};
    for (const id of ['hud', 'ru', 'cap', 'capMax', 'clock', 'speed', 'speedStat', 'btnMenu', 'log', 'hint', 'selPanel', 'selEmpty', 'selSingle', 'selPortrait', 'selName', 'selClass', 'selHp', 'selStats', 'selMulti',
      'cmdTitle', 'cmdGrid', 'queue', 'btnBuild', 'btnResearch', 'sidePanel', 'sideTitle', 'sideList', 'sideClose', 'tooltip']) this.el[id] = document.getElementById(id);
    this.speeds = [0.5, 1, 1.5, 2, 3];
    this.cmdSig = ''; this.selSig = ''; this.sideTab = null; this.selTimer = 0; this.sideTimer = 0; this.portraitId = null;
    this.el.speedStat.addEventListener('click', () => this.cycleSpeed(1));
    this.el.btnMenu.addEventListener('click', () => this.app.menu.openPause());
    this.el.btnBuild.addEventListener('click', () => this.toggleSide('build'));
    this.el.btnResearch.addEventListener('click', () => this.toggleSide('research'));
    this.el.sideClose.addEventListener('click', () => this.closeSide());
    document.addEventListener('mouseover', e => {
      const b = e.target.closest('[data-tip]');
      if (b) { this.el.tooltip.innerHTML = b.dataset.tip; this.el.tooltip.classList.remove('hidden'); } else this.el.tooltip.classList.add('hidden');
    });
    document.addEventListener('mousemove', e => {
      if (this.el.tooltip.classList.contains('hidden')) return;
      const t = this.el.tooltip;
      t.style.left = Math.min(e.clientX + 16, window.innerWidth - t.offsetWidth - 8) + 'px';
      t.style.top = Math.max(8, e.clientY - t.offsetHeight - 14) + 'px';
    });
    this.el.queue.addEventListener('mousedown', e => {
      const q = e.target.closest('[data-cancel]'); if (!q) return;
      const s = this.game.selectedStructures()[0]; if (s) { this.game.cancelProduction(s, parseInt(q.dataset.cancel, 10)); this.refreshCommands(true); }
    });
    this.el.selMulti.addEventListener('mousedown', e => {
      const u = e.target.closest('[data-id]'); if (!u) return;
      const ent = this.game.selection.find(x => x.id === parseInt(u.dataset.id, 10)); if (!ent) return;
      if (e.shiftKey) this.game.selection = this.game.selection.filter(x => x !== ent); else this.game.select([ent]);
    });
  }
  get game() { return this.app.game; }

  setGame() {
    this.cmdSig = ''; this.selSig = ''; this.portraitId = null;
    this.el.log.innerHTML = ''; this.el.hud.classList.remove('hidden'); this.closeSide(); this.setHint(null);
    this.refreshSelection(true); this.refreshCommands(true);
  }
  hide() { this.el.hud.classList.add('hidden'); }

  log(text, cls = '') {
    const d = document.createElement('div');
    d.className = 'entry ' + cls;
    d.innerHTML = `<span class="who">${cls === 'sys' ? 'Radio' : cls === 'warn' ? 'Alerte' : 'Convoi'}</span>${text}`;
    if (this.game) this.game.sfx('radio');
    this.el.log.appendChild(d);
    while (this.el.log.children.length > 5) this.el.log.firstChild.remove();
    setTimeout(() => d.remove(), 10500);
  }
  setHint(text) { if (text) { this.el.hint.textContent = text; this.el.hint.classList.remove('hidden'); } else this.el.hint.classList.add('hidden'); }
  cycleSpeed(dir) { const g = this.game; if (!g) return; let i = this.speeds.indexOf(g.speed); g.speed = this.speeds[Utils.clamp(i + dir, 0, this.speeds.length - 1)]; }

  update(dt) {
    const g = this.game; if (!g) return;
    this.el.ru.textContent = Math.floor(g.ru[FACTION.PLAYER]);
    this.el.cap.textContent = g.capUsed(FACTION.PLAYER); this.el.capMax.textContent = g.capMax(FACTION.PLAYER);
    this.el.clock.textContent = Utils.formatTime(g.time);
    this.el.speed.textContent = g.paused ? 'Pause' : g.speed + '×';
    this.selTimer += dt; if (this.selTimer > 0.15) { this.selTimer = 0; this.refreshSelection(); }
    this.refreshCommands();
    if (this.sideTab) { this.sideTimer += dt; if (this.sideTimer > 0.25) { this.sideTimer = 0; this.refreshSide(); } }
  }

  // ---------- Infobulles ----------
  counters(type) {
    const row = DAMAGE_TABLE[type]; if (!row) return '';
    const strong = Object.keys(row).filter(c => row[c] >= 1.4).map(c => CLASSES[c]);
    const weakTo = Object.keys(DAMAGE_TABLE).filter(a => a !== 'turret' && DAMAGE_TABLE[a][UNIT_TYPES[type].cls] >= 1.4).map(a => UNIT_TYPES[a].plural);
    let s = '';
    if (strong.length) s += `<br><span class="good">Efficace contre : ${strong.join(', ')}</span>`;
    if (weakTo.length) s += `<br><span class="bad">Vulnérable aux : ${weakTo.join(', ')}</span>`;
    return s;
  }
  unitTip(type) {
    const d = UNIT_TYPES[type];
    let s = `<b>${d.name}</b> <span class="gold">⚙ ${d.cost}</span> · ${d.buildTime}s · ${d.cap} place${d.cap > 1 ? 's' : ''} du convoi<br>${d.desc}<br>Blindage ${d.hp} · Vitesse ${d.speed} · Détection ${d.sensor}`;
    if (d.damage) s += `<br>Dégâts ${d.damage} toutes les ${d.fireRate}s · Portée ${d.range}`; else s += `<br>Benne ${d.capacity} · Récupération ${d.mineRate}/s`;
    if (d.requires) s += `<br><span class="bad">Nécessite : ${STRUCTURE_TYPES[d.requires].name}</span>`;
    return s + this.counters(type);
  }
  structTip(type) {
    const d = STRUCTURE_TYPES[type];
    let s = `<b>${d.name}</b> <span class="gold">⚙ ${d.cost}</span> · ${d.buildTime}s<br>${d.desc}<br>Blindage ${d.hp} · Détection ${d.sensor}`;
    if (d.damage) s += `<br>Dégâts ${d.damage} toutes les ${d.fireRate}s · Portée ${d.range}`;
    if (d.cap) s += `<br>Places du convoi +${d.cap}`;
    return s;
  }
  orderLabel(u) {
    const o = u.order; if (!o) return 'En attente';
    return { move: 'Déplacement', attackMove: 'Attaque en mouvement', attack: 'Engage : ' + (o.target.def ? o.target.def.name : 'cible'), mine: 'Récupération', return: 'Retour au Bastion', guard: 'Retour au poste', flee: 'Repli' }[o.type] || o.type;
  }

  // ---------- Panneau de sélection ----------
  refreshSelection(force) {
    const g = this.game, sel = g.selection.filter(e => !e.dead), el = this.el;
    el.selEmpty.classList.toggle('hidden', sel.length > 0);
    el.selSingle.classList.toggle('hidden', sel.length !== 1);
    el.selMulti.classList.toggle('hidden', sel.length < 2);
    if (!sel.length) return;
    if (sel.length === 1) {
      const e = sel[0];
      if (this.portraitId !== e.id) { this.portraitId = e.id; Art.toCanvas(el.selPortrait, e.type, e.faction, e.kind); el.selName.textContent = e.def.name; el.selClass.textContent = CLASSES[e.def.cls]; }
      el.selHp.style.width = (e.hp / e.maxHp * 100).toFixed(0) + '%';
      const rows = [['Blindage', `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`]];
      if (e.kind === 'unit') {
        if (e.isCombat) rows.push(['Armement', `${Math.round(e.damage)} / ${e.def.fireRate}s · portée ${e.range}`]);
        if (e.type === 'collector') rows.push(['Benne', `${Math.floor(e.cargo)} / ${Math.floor(e.capacity)}`]);
        rows.push(['Tactique', STANCES[e.stance].label], ['État', this.orderLabel(e)]);
        if (e.group) rows.push(['Groupe', e.group]);
      } else {
        if (e.building) rows.push(['Construction', (e.buildProgress * 100).toFixed(0) + ' %']);
        else if (e.research) rows.push(['Amélioration', `${RESEARCH[e.research.id].name} · ${(e.research.progress / RESEARCH[e.research.id].time * 100).toFixed(0)} %`]);
        else if (e.def.produces) rows.push(['Production', e.queue.length ? `${e.queue.length} en file` : 'Inactive'], ['Ralliement', 'Clic droit pour définir']);
        if (e.def.damage) rows.push(['Armement', `${Math.round(e.damage)} / ${e.def.fireRate}s · portée ${e.range}`]);
        rows.push(['Détection', Math.round(e.sensor)]);
      }
      el.selStats.innerHTML = rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
      return;
    }
    const sig = sel.map(e => e.id).join(',');
    if (sig !== this.selSig || force) {
      this.selSig = sig;
      el.selMulti.innerHTML = '';
      for (const e of sel.slice(0, 24)) {
        const d = document.createElement('div'); d.className = 'u'; d.dataset.id = e.id; d.dataset.tip = `<b>${e.def.name}</b><br>Clic : isoler · Maj+clic : retirer`;
        const c = document.createElement('canvas'); c.width = 48; c.height = 38; Art.toCanvas(c, e.type, e.faction, e.kind, -0.3);
        d.appendChild(c);
        const hp = document.createElement('div'); hp.className = 'hp'; hp.innerHTML = '<div></div>'; d.appendChild(hp);
        if (e.group) { const n = document.createElement('span'); n.className = 'n'; n.textContent = e.group; d.appendChild(n); }
        el.selMulti.appendChild(d);
      }
    }
    for (const d of el.selMulti.children) { const e = sel.find(x => x.id === parseInt(d.dataset.id, 10)); if (e) d.querySelector('.hp > div').style.width = (e.hp / e.maxHp * 100).toFixed(0) + '%'; }
  }

  // ---------- Carte de commandes ----------
  refreshCommands(force) {
    const g = this.game, units = g.selectedUnits(), structs = g.selectedStructures();
    const s0 = structs[0];
    const sig = [units.map(u => u.type).sort().join(''), s0 ? s0.type + (s0.building ? 'b' : '') + s0.queue.map(q => q.type).join('') + (s0.research ? s0.research.id : '') : '', g.mode ? (g.mode.place || 'a') : '', g.formation, units.length ? units.map(u => u.stance).join('') : ''].join('|');
    if (sig !== this.cmdSig || force) { this.cmdSig = sig; this.buildCommands(units, s0); }
    // Disponibilité et progression
    for (const b of this.el.cmdGrid.querySelectorAll('[data-produce]')) b.classList.toggle('disabled', g.canProduce(s0, b.dataset.produce) !== 'ok');
    for (const q of this.el.queue.children) { const i = parseInt(q.dataset.cancel, 10); const it = s0 && s0.queue[i]; if (it) q.querySelector('.p').style.width = (i === 0 ? it.progress / UNIT_TYPES[it.type].buildTime * 100 : 0) + '%'; }
    const rb = this.el.cmdGrid.querySelector('[data-research-progress]'); if (rb && s0 && s0.research) rb.style.width = (s0.research.progress / RESEARCH[s0.research.id].time * 100) + '%';
  }
  cmdButton(o) {
    const b = document.createElement('div'); b.className = 'cmd' + (o.active ? ' active' : '');
    b.innerHTML = (o.glyph ? `<span class="glyph">${o.glyph}</span>` : '') + `<span class="name">${o.name}</span>` + (o.key ? `<span class="k">${o.key}</span>` : '') + (o.cost != null ? `<span class="cost">${o.cost}</span>` : '');
    if (o.icon) { const c = document.createElement('canvas'); c.width = 44; c.height = 44; Art.toCanvas(c, o.icon, FACTION.PLAYER, o.iconKind || 'unit'); b.insertBefore(c, b.firstChild); }
    if (o.tip) b.dataset.tip = o.tip;
    if (o.produce) b.dataset.produce = o.produce;
    b.addEventListener('click', () => { if (!b.classList.contains('disabled') || o.produce) o.onClick(); });
    return b;
  }
  segRow(label, options, current, onPick) {
    const row = document.createElement('div'); row.className = 'segRow';
    row.innerHTML = `<span class="lblRow">${label}</span>`;
    for (const o of options) {
      const b = document.createElement('button'); b.textContent = o.label; b.className = o.id === current ? 'on' : '';
      if (o.tip) b.dataset.tip = o.tip;
      b.addEventListener('click', () => onPick(o.id)); row.appendChild(b);
    }
    return row;
  }
  buildCommands(units, s) {
    const g = this.game, grid = this.el.cmdGrid, q = this.el.queue;
    grid.innerHTML = ''; q.innerHTML = '';
    if (s) {
      this.el.cmdTitle.textContent = s.def.name;
      if (s.building) { grid.innerHTML = '<span class="lbl" style="padding:10px">En construction…</span>'; return; }
      if (s.def.produces) {
        for (const t of s.def.produces) { const d = UNIT_TYPES[t]; grid.appendChild(this.cmdButton({ name: d.short || d.name, icon: t, key: d.key, cost: d.cost, tip: this.unitTip(t), produce: t, onClick: () => this.produce(t) })); }
        for (let i = 0; i < s.queue.length; i++) {
          const it = s.queue[i], d = document.createElement('div'); d.className = 'q'; d.dataset.cancel = i; d.dataset.tip = `<b>${UNIT_TYPES[it.type].name}</b><br>Clic : annuler (remboursé)`;
          const c = document.createElement('canvas'); c.width = 40; c.height = 40; Art.toCanvas(c, it.type, FACTION.PLAYER, 'unit'); d.appendChild(c);
          const p = document.createElement('div'); p.className = 'p'; d.appendChild(p); q.appendChild(d);
        }
      } else if (s.type === 'research') {
        if (s.research) {
          const r = RESEARCH[s.research.id];
          grid.innerHTML = `<div style="flex:1"><div class="lbl">Amélioration en cours</div><div style="font-size:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:4px 0">${r.name}</div><div class="bar"><div data-research-progress style="width:0;background:var(--gold)"></div></div></div>`;
          grid.appendChild(this.cmdButton({ name: 'Annuler', glyph: '✕', onClick: () => { g.cancelResearch(FACTION.PLAYER); this.refreshCommands(true); } }));
        } else grid.appendChild(this.cmdButton({ name: 'Améliorer', glyph: '⚒', key: 'R', tip: '<b>Ouvrir les améliorations</b>', onClick: () => this.toggleSide('research') }));
      } else grid.innerHTML = `<span class="lbl" style="padding:10px">${s.def.desc}</span>`;
      return;
    }
    if (units.length) {
      this.el.cmdTitle.textContent = units.length === 1 ? units[0].def.name : `${units.length} véhicules`;
      const combat = units.some(u => u.isCombat);
      grid.appendChild(this.cmdButton({ name: 'Stop', glyph: '■', key: 'S', tip: '<b>Stop</b><br>Annule les ordres en cours.', onClick: () => g.commandStop(g.selectedUnits()) }));
      if (combat) grid.appendChild(this.cmdButton({ name: 'Attaque‑mvt', glyph: '✦', key: 'A', active: g.mode && g.mode.attackMove, tip: '<b>Attaque en mouvement</b><br>Progresse en engageant tout ennemi rencontré.', onClick: () => { g.mode = { attackMove: true }; this.setHint('Attaque en mouvement — cliquez sur la destination'); this.refreshCommands(true); } }));
      if (units.some(u => u.type === 'collector')) grid.appendChild(this.cmdButton({ name: 'Retour', glyph: '⌂', tip: '<b>Retour</b><br>Ramène la benne au Bastion.', onClick: () => g.commandReturn(g.selectedUnits()) }));
      const stances = Object.keys(STANCES).map(id => ({ id, label: STANCES[id].label, tip: `<b>${STANCES[id].label}</b> (${STANCES[id].key})<br>${STANCES[id].desc}` }));
      const cur = units.every(u => u.stance === units[0].stance) ? units[0].stance : null;
      const wrap = document.createElement('div'); wrap.style.flexBasis = '100%';
      wrap.appendChild(this.segRow('Tactique', stances, cur, id => { g.commandStance(g.selectedUnits(), id); this.refreshCommands(true); }));
      wrap.appendChild(this.segRow('Formation', Object.keys(FORMATIONS).map((id, i) => ({ id, label: FORMATIONS[id].label, tip: `<b>${FORMATIONS[id].label}</b> (F${i + 1})<br>${FORMATIONS[id].desc}` })), g.formation, id => { g.formation = id; this.refreshCommands(true); }));
      grid.appendChild(wrap);
      return;
    }
    this.el.cmdTitle.textContent = 'Commandes';
    grid.innerHTML = '<span class="lbl" style="padding:10px;line-height:1.6">Sélectionnez le Bastion pour produire des véhicules.<br>B : construire · R : améliorer</span>';
  }

  produce(type) {
    const g = this.game, producers = g.selectedStructures().filter(s => s.def.produces && s.def.produces.includes(type) && !s.building);
    if (!producers.length) return;
    producers.sort((a, b) => a.queue.length - b.queue.length);
    g.queueProduction(producers[0], type); this.refreshCommands(true);
  }
  startPlacement(type) {
    const g = this.game, d = STRUCTURE_TYPES[type];
    if (!g.structures.some(s => s.faction === FACTION.PLAYER && !s.dead && !s.building)) return;
    if (g.mode && g.mode.place === type) { g.mode = null; this.setHint(null); return; }
    if (g.ru[FACTION.PLAYER] < d.cost) { g.log('Ferraille insuffisante.', 'warn'); g.sfx('error'); return; }
    g.mode = { place: type }; g.sfx('click');
    this.setHint(`${d.name} — cliquez pour placer · Maj : plusieurs · clic droit : annuler`);
    this.refreshSide();
  }

  // ---------- Panneau latéral ----------
  sideOpen() { return !!this.sideTab; }
  closeSide() { this.sideTab = null; this.el.sidePanel.classList.add('hidden'); this.el.btnBuild.classList.remove('on'); this.el.btnResearch.classList.remove('on'); }
  toggleSide(tab) {
    if (this.sideTab === tab) { this.closeSide(); return; }
    this.sideTab = tab; this.el.sidePanel.classList.remove('hidden');
    this.el.btnBuild.classList.toggle('on', tab === 'build'); this.el.btnResearch.classList.toggle('on', tab === 'research');
    this.el.sideTitle.textContent = tab === 'build' ? 'Construction' : 'Améliorations';
    this.game.sfx('click'); this.refreshSide(true);
  }
  refreshSide(force) {
    const g = this.game, list = this.el.sideList; if (!this.sideTab) return;
    const sig = this.sideTab + '|' + (g.mode ? g.mode.place : '') + '|' + [...g.researched[FACTION.PLAYER]].join(',') + '|' + g.structures.filter(s => s.faction === FACTION.PLAYER && s.type === 'research').map(s => (s.research ? s.research.id : '-') + s.building).join(',');
    if (sig === this.sideSig && !force) {
      const lab = g.structures.find(s => !s.dead && s.faction === FACTION.PLAYER && s.type === 'research' && s.research);
      if (lab) { const p = list.querySelector('[data-rprog]'); if (p) p.style.width = (lab.research.progress / RESEARCH[lab.research.id].time * 100) + '%'; }
      for (const it of list.querySelectorAll('[data-cost]')) it.classList.toggle('disabled', parseInt(it.dataset.cost, 10) > g.ru[FACTION.PLAYER] && !it.classList.contains('done'));
      return;
    }
    this.sideSig = sig; list.innerHTML = '';
    if (this.sideTab === 'build') {
      for (const t in STRUCTURE_TYPES) {
        const d = STRUCTURE_TYPES[t]; if (!d.key) continue;
        const it = document.createElement('div'); it.className = 'item' + (g.mode && g.mode.place === t ? ' active' : ''); it.dataset.cost = d.cost;
        it.innerHTML = `<div class="t"><div class="n"><span>${d.name}<span class="k">${d.key}</span></span><span class="c">⚙ ${d.cost}</span></div><div class="d">${d.desc}</div></div>`;
        const c = document.createElement('canvas'); c.width = 52; c.height = 52; Art.toCanvas(c, t, FACTION.PLAYER, 'structure'); it.insertBefore(c, it.firstChild);
        it.addEventListener('click', () => this.startPlacement(t)); list.appendChild(it);
      }
    } else {
      const lab = g.structures.find(s => !s.dead && s.faction === FACTION.PLAYER && s.type === 'research' && !s.building);
      if (!lab) { const n = document.createElement('div'); n.className = 'item'; n.innerHTML = '<div class="t"><div class="n">Aucun laboratoire</div><div class="d">Construisez un laboratoire (B puis M) pour accéder aux améliorations.</div></div>'; n.addEventListener('click', () => this.toggleSide('build')); list.appendChild(n); }
      for (const id in RESEARCH) {
        const r = RESEARCH[id], done = g.researched[FACTION.PLAYER].has(id), cur = lab && lab.research && lab.research.id === id;
        const locked = r.requires && !g.researched[FACTION.PLAYER].has(r.requires);
        const it = document.createElement('div'); it.className = 'item' + (done ? ' done' : cur ? ' active' : locked ? ' disabled' : ''); if (!done) it.dataset.cost = r.cost;
        it.innerHTML = `<div class="t"><div class="n"><span>${r.name}</span><span class="c">${done ? '✓' : '⚙ ' + r.cost}</span></div><div class="d">${r.desc}${locked ? ` <span style="color:var(--gold)">Requiert ${RESEARCH[r.requires].name}.</span>` : ''} ${done ? '' : r.time + ' s'}</div>${cur ? '<div class="prog"><div data-rprog style="width:0"></div></div>' : ''}</div>`;
        if (!done && !locked && !cur) it.addEventListener('click', () => { g.startResearch(FACTION.PLAYER, id); this.refreshSide(true); });
        list.appendChild(it);
      }
    }
  }

  showEnd(won) { this.app.menu.showEnd(won); }
}
