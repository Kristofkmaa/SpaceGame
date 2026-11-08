// Interface HTML : barre du haut, panneau de sélection, commandes, messages
class UI {
  constructor() {
    this.game = null;
    this.el = {};
    for (const id of ['topbar', 'bottombar', 'minerals', 'unitCount', 'clock', 'btnSpeed', 'btnPause', 'btnHelp',
      'selTitle', 'selBody', 'cmdButtons', 'buildButtons', 'messages', 'tooltip', 'startScreen', 'endScreen',
      'endTitle', 'endText', 'btnStart', 'btnRestart', 'helpScreen', 'btnCloseHelp']) {
      this.el[id] = document.getElementById(id);
    }
    this.cmdSig = '';
    this.selTimer = 0;
    this.speeds = [0.5, 1, 1.5, 2, 3];
    this.el.btnPause.addEventListener('click', () => { if (this.game) this.game.paused = !this.game.paused; });
    this.el.btnSpeed.addEventListener('click', () => this.cycleSpeed(1));
    this.el.btnHelp.addEventListener('click', () => this.toggleHelp());
    this.el.btnCloseHelp.addEventListener('click', () => this.toggleHelp());
    // Infobulles
    document.addEventListener('mouseover', e => {
      const b = e.target.closest('[data-tip]');
      if (b) { this.el.tooltip.innerHTML = b.dataset.tip; this.el.tooltip.classList.remove('hidden'); }
      else this.el.tooltip.classList.add('hidden');
    });
    document.addEventListener('mousemove', e => {
      if (this.el.tooltip.classList.contains('hidden')) return;
      const t = this.el.tooltip;
      t.style.left = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 8) + 'px';
      t.style.top = Math.max(8, e.clientY - t.offsetHeight - 12) + 'px';
    });
    // Annulation d'une production en file (mousedown : le panneau est reconstruit souvent)
    this.el.selBody.addEventListener('mousedown', e => {
      const b = e.target.closest('[data-cancel]');
      if (b && this.game) {
        const s = this.game.selectedStructures()[0];
        if (s) this.game.cancelProduction(s, parseInt(b.dataset.cancel, 10));
        this.refreshSelection(true);
        return;
      }
      const chip = e.target.closest('[data-type]');
      if (chip && this.game) {
        const same = this.game.selectedUnits().filter(u => u.type === chip.dataset.type);
        if (same.length) this.game.select(same);
      }
    });
  }

  setGame(game) {
    this.game = game;
    this.cmdSig = '';
    this.el.messages.innerHTML = '';
    this.el.topbar.classList.remove('hidden');
    this.el.bottombar.classList.remove('hidden');
    this.el.endScreen.classList.add('hidden');
    this.el.startScreen.classList.add('hidden');
    this.el.helpScreen.classList.add('hidden');
    this.refreshSelection(true);
    this.refreshCommands(true);
    this.message(`Partie lancée — difficulté ${game.difficulty.label}. Détruisez la station ennemie !`, 'good');
  }

  helpOpen() { return !this.el.helpScreen.classList.contains('hidden'); }
  toggleHelp() {
    const open = this.helpOpen();
    this.el.helpScreen.classList.toggle('hidden', open);
    if (this.game) this.game.paused = !open;
  }

  cycleSpeed(dir) {
    if (!this.game) return;
    let i = this.speeds.indexOf(this.game.speed);
    i = Utils.clamp(i + dir, 0, this.speeds.length - 1);
    this.game.speed = this.speeds[i];
    this.message(`Vitesse x${this.game.speed}`);
  }

  message(text, cls = '') {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.textContent = text;
    this.el.messages.appendChild(d);
    while (this.el.messages.children.length > 5) this.el.messages.firstChild.remove();
    setTimeout(() => d.remove(), 4000);
  }

  update(dt) {
    const g = this.game; if (!g) return;
    this.el.minerals.textContent = Math.floor(g.minerals[FACTION.PLAYER]);
    this.el.unitCount.textContent = g.units.filter(u => u.faction === FACTION.PLAYER && !u.dead).length;
    this.el.clock.textContent = Utils.formatTime(g.time);
    this.el.btnSpeed.textContent = 'x' + g.speed;
    this.el.btnPause.textContent = g.paused ? 'Reprendre' : 'Pause';
    this.selTimer += dt;
    if (this.selTimer > 0.15) { this.selTimer = 0; this.refreshSelection(); }
    this.refreshCommands();
  }

  unitTip(type) {
    const d = UNIT_TYPES[type];
    let s = `<b>${d.name}</b> — ${d.cost} minéraux, ${d.buildTime}s<br>${d.desc}<br>PV ${d.hp} • Vitesse ${d.speed}`;
    if (d.damage) s += ` • Dégâts ${d.damage} / ${d.fireRate}s • Portée ${d.range}`;
    else s += ` • Capacité ${d.capacity}`;
    return s;
  }
  structTip(type) {
    const d = STRUCTURE_TYPES[type];
    let s = `<b>${d.name}</b> — ${d.cost} minéraux, ${d.buildTime}s<br>${d.desc}<br>PV ${d.hp}`;
    if (d.damage) s += ` • Dégâts ${d.damage} / ${d.fireRate}s • Portée ${d.range}`;
    return s;
  }

  orderLabel(u) {
    const o = u.order;
    if (!o) return 'En attente';
    switch (o.type) {
      case 'move': return 'Déplacement';
      case 'attackMove': return 'Attaque en mouvement';
      case 'attack': return 'Attaque : ' + (o.target.def ? o.target.def.name : 'cible');
      case 'mine': return 'Extraction';
      case 'return': return 'Retour à la station';
      case 'guard': return 'Retour en position';
    }
    return o.type;
  }

  refreshSelection(force) {
    const g = this.game;
    const sel = g.selection.filter(e => !e.dead);
    const el = this.el;
    if (!sel.length) { el.selTitle.textContent = 'Aucune sélection'; el.selBody.innerHTML = '<i>Sélectionnez des unités ou un bâtiment.</i>'; return; }
    const hpBar = (e) => `<div class="hpbar"><div style="width:${(e.hp / e.maxHp * 100).toFixed(0)}%"></div></div>`;
    if (sel.length === 1) {
      const e = sel[0];
      el.selTitle.textContent = e.def.name;
      let html = `PV ${Math.ceil(e.hp)} / ${e.maxHp}${hpBar(e)}`;
      if (e.kind === 'unit') {
        html += `État : ${this.orderLabel(e)}<br>`;
        if (e.type === 'harvester') html += `Cargaison : ${Math.floor(e.cargo)} / ${e.def.capacity}<br>`;
        else html += `Dégâts ${e.def.damage} • Portée ${e.def.range}<br>`;
        if (e.group) html += `Groupe ${e.group}`;
      } else {
        if (e.building) html += `En construction : ${(e.buildProgress * 100).toFixed(0)}%`;
        else if (e.def.produces) {
          html += e.queue.length ? '<div class="queue">' : 'File de production vide<br><small>Clic droit pour fixer le point de ralliement.</small>';
          e.queue.forEach((q, i) => {
            const d = UNIT_TYPES[q.type];
            const p = i === 0 ? Math.min(100, q.progress / d.buildTime * 100) : 0;
            html += `<div class="item"><span style="width:84px">${d.name}</span><div class="bar"><div style="width:${p.toFixed(0)}%"></div></div><button data-cancel="${i}" title="Annuler">✕</button></div>`;
          });
          if (e.queue.length) html += '</div>';
        } else if (e.def.damage) html += `Dégâts ${e.def.damage} • Portée ${e.def.range}`;
      }
      el.selBody.innerHTML = html;
      return;
    }
    // Sélection multiple
    el.selTitle.textContent = `${sel.length} unités sélectionnées`;
    const counts = {};
    let hp = 0, maxHp = 0;
    for (const e of sel) { counts[e.type] = (counts[e.type] || 0) + 1; hp += e.hp; maxHp += e.maxHp; }
    let html = `PV totaux ${Math.ceil(hp)} / ${maxHp}${hpBar({ hp, maxHp })}<div class="multi">`;
    for (const t in counts) html += `<span class="chip" data-type="${t}" title="Ne garder que ce type">${counts[t]}× ${(UNIT_TYPES[t] || STRUCTURE_TYPES[t]).name}</span>`;
    el.selBody.innerHTML = html + '</div>';
  }

  // Boutons de commande / construction : reconstruits seulement si la situation change
  refreshCommands(force) {
    const g = this.game;
    const units = g.selectedUnits();
    const producers = g.selectedStructures().filter(s => s.def.produces && !s.building);
    const hasBase = g.structures.some(s => s.faction === FACTION.PLAYER && !s.dead && !s.building);
    const sig = [units.length ? 'u' + (units.some(u => u.isCombat) ? 'c' : '') + (units.some(u => u.type === 'harvester') ? 'h' : '') : '',
      producers.length ? 'p' + producers.map(s => s.type).sort().join('') : '', hasBase ? 'b' : '',
      g.mode ? (g.mode.place || 'a') : ''].join('|');
    if (sig !== this.cmdSig || force) {
      this.cmdSig = sig;
      this.buildCommandButtons(units, producers);
      this.buildBuildButtons(hasBase);
    }
    // Disponibilité selon les minéraux
    const m = g.minerals[FACTION.PLAYER];
    for (const b of document.querySelectorAll('[data-cost]')) b.disabled = parseInt(b.dataset.cost, 10) > m;
  }

  button(name, cost, key, tip, onClick, active) {
    const b = document.createElement('button');
    b.className = 'cmd' + (active ? ' active' : '');
    b.innerHTML = `<span class="name">${name}</span>` + (cost != null ? `<span class="cost">◆ ${cost}</span>` : '') + (key ? `<span class="key">${key}</span>` : '');
    if (cost != null) b.dataset.cost = cost;
    if (tip) b.dataset.tip = tip;
    b.addEventListener('click', onClick);
    return b;
  }

  buildCommandButtons(units, producers) {
    const g = this.game, box = this.el.cmdButtons;
    box.innerHTML = '';
    if (producers.length) {
      const types = Object.keys(UNIT_TYPES).filter(t => producers.some(s => s.def.produces.includes(t)));
      for (const t of types) {
        const d = UNIT_TYPES[t];
        box.appendChild(this.button(d.name, d.cost, d.key, this.unitTip(t), () => this.produce(t)));
      }
    } else if (units.length) {
      box.appendChild(this.button('Stop', null, 'S', '<b>Stop</b><br>Annule les ordres en cours.', () => g.commandStop(g.selectedUnits())));
      if (units.some(u => u.isCombat)) {
        box.appendChild(this.button('Attaque‑mouvement', null, 'A', '<b>Attaque en mouvement</b><br>Avance en engageant tout ennemi rencontré.', () => { g.mode = { attackMove: true }; }, g.mode && g.mode.attackMove));
      }
      if (units.some(u => u.type === 'harvester')) {
        box.appendChild(this.button('Retour base', null, null, '<b>Retour</b><br>Ramène la cargaison à la station.', () => g.commandReturn(g.selectedUnits())));
      }
    } else {
      box.innerHTML = '<span style="color:var(--muted);font-size:12px">Sélectionnez une station pour produire des unités.</span>';
    }
  }

  buildBuildButtons(hasBase) {
    const g = this.game, box = this.el.buildButtons;
    box.innerHTML = '';
    if (!hasBase) { box.innerHTML = '<span style="color:var(--muted);font-size:12px">Aucun bâtiment opérationnel.</span>'; return; }
    for (const t in STRUCTURE_TYPES) {
      const d = STRUCTURE_TYPES[t];
      if (!d.key) continue;
      box.appendChild(this.button(d.name, d.cost, d.key, this.structTip(t), () => this.startPlacement(t), g.mode && g.mode.place === t));
    }
  }

  produce(type) {
    const g = this.game;
    const producers = g.selectedStructures().filter(s => s.def.produces && s.def.produces.includes(type) && !s.building);
    if (!producers.length) return;
    producers.sort((a, b) => a.queue.length - b.queue.length);
    g.queueProduction(producers[0], type);
  }

  startPlacement(type) {
    const g = this.game;
    const d = STRUCTURE_TYPES[type];
    if (!g.structures.some(s => s.faction === FACTION.PLAYER && !s.dead && !s.building)) return;
    if (g.minerals[FACTION.PLAYER] < d.cost) { this.message('Minéraux insuffisants', 'warn'); return; }
    g.mode = (g.mode && g.mode.place === type) ? null : { place: type };
    if (g.mode) this.message(`Choisissez un emplacement pour : ${d.name} (clic droit pour annuler)`);
  }

  showEnd(won) {
    const g = this.game;
    this.el.endTitle.textContent = won ? 'VICTOIRE' : 'DÉFAITE';
    this.el.endTitle.classList.toggle('defeat', !won);
    this.el.endText.innerHTML = (won ? 'La station ennemie a été réduite en poussière.' : 'Votre dernière structure a été détruite.') +
      `<br><br>Durée : ${Utils.formatTime(g.time)} • Vaisseaux détruits : ${g.stats.killed} • Vaisseaux perdus : ${g.stats.lost} • Minéraux extraits : ${Math.floor(g.stats.mined)}`;
    this.el.endScreen.classList.remove('hidden');
  }
}
