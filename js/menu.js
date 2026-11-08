// ============ Écrans : menu principal, escarmouche, codex, options, pause, fin ============
class Menu {
  constructor(app) {
    this.app = app; this.current = null; this.stack = [];
    this.screens = {};
    for (const n of ['Main', 'Skirmish', 'Codex', 'Options', 'Pause', 'End']) this.screens[n.toLowerCase()] = document.getElementById('screen' + n);
    document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => { this.app.audio.init(); this.app.audio.play('click'); const to = a.dataset.go; to === 'back' ? this.back() : this.show(to); }));
    document.getElementById('btnDeploy').addEventListener('click', () => { this.app.audio.init(); this.app.startGame(); });
    document.getElementById('btnResume').addEventListener('click', () => this.closePause());
    document.getElementById('btnAbandon').addEventListener('click', () => { this.app.endGame(); this.show('main'); });
    document.getElementById('btnReplay').addEventListener('click', () => this.app.startGame());
    this.buildSkirmish(); this.buildOptions();
    document.querySelectorAll('.codexTabs a').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('.codexTabs a').forEach(x => x.classList.remove('on')); a.classList.add('on'); this.renderCodex(a.dataset.tab); }));
    this.show('main');
  }
  isOpen() { return this.current !== null; }
  show(name) {
    if (this.current && this.current !== name) this.stack.push(this.current);
    for (const k in this.screens) this.screens[k].classList.toggle('hidden', k !== name);
    this.current = name;
    if (name === 'codex') this.renderCodex(document.querySelector('.codexTabs a.on').dataset.tab);
    if (name === 'skirmish') this.updateBrief();
    if (name === 'main') this.stack = [];
  }
  back() { const prev = this.stack.pop() || (this.app.game ? 'pause' : 'main'); this.current = null; this.show(prev); }
  hide() { for (const k in this.screens) this.screens[k].classList.add('hidden'); this.current = null; this.stack = []; }
  escape() { if (this.current === 'pause') this.closePause(); else if (this.current !== 'main' && this.current !== 'end') this.back(); }
  openPause() { if (!this.app.game || this.app.game.state !== 'playing') return; this.app.game.paused = true; this.stack = []; this.show('pause'); this.app.audio.play('click'); }
  closePause() { this.hide(); if (this.app.game) this.app.game.paused = false; }

  // ----- Escarmouche -----
  buildSkirmish() {
    const s = this.app.settings;
    const defs = { difficulty: Object.keys(DIFFICULTY).map(k => [k, DIFFICULTY[k].label]), map: Object.keys(CONFIG.MAPS).map(k => [k, CONFIG.MAPS[k].label]), resources: Object.keys(CONFIG.RESOURCES).map(k => [k, CONFIG.RESOURCES[k].label]) };
    for (const seg of document.querySelectorAll('#screenSkirmish .seg')) {
      const key = seg.dataset.key;
      for (const [v, label] of defs[key]) {
        const a = document.createElement('a'); a.textContent = label; a.dataset.v = v; a.classList.toggle('on', s[key] === v);
        a.addEventListener('click', () => { s[key] = v; this.app.saveSettings(); seg.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); this.updateBrief(); this.app.audio.play('click'); });
        seg.appendChild(a);
      }
    }
  }
  updateBrief() {
    const s = this.app.settings, d = DIFFICULTY[s.difficulty], m = CONFIG.MAPS[s.map];
    document.getElementById('brief').textContent = `${d.brief} Territoire : ${m.label.toLowerCase()} (${m.w} × ${m.h}). ${CONFIG.RESOURCES[s.resources].v} unités de ferraille au départ.`;
  }

  // ----- Options -----
  buildOptions() {
    const s = this.app.settings, vol = document.getElementById('optVolume');
    vol.value = s.volume; vol.addEventListener('input', () => { s.volume = parseInt(vol.value, 10); this.app.applySettings(); });
    vol.addEventListener('change', () => { this.app.saveSettings(); this.app.audio.play('confirm'); });
    for (const seg of document.querySelectorAll('#screenOptions .seg')) {
      const key = seg.dataset.opt;
      seg.querySelectorAll('a').forEach(a => {
        a.classList.toggle('on', String(s[key] ? 1 : 0) === a.dataset.v);
        a.addEventListener('click', () => { s[key] = a.dataset.v === '1'; this.app.applySettings(); this.app.saveSettings(); seg.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); this.app.audio.play('click'); });
      });
    }
  }

  // ----- Codex -----
  renderCodex(tab) {
    const body = document.getElementById('codexBody'); body.innerHTML = '';
    const ui = this.app.ui;
    if (tab === 'units') {
      for (const t in UNIT_TYPES) {
        const d = UNIT_TYPES[t], div = document.createElement('div'); div.className = 'cx';
        div.innerHTML = `<div><div class="n">${d.name}<small>${CLASSES[d.cls]} · ⚙ ${d.cost} · ${d.cap} place${d.cap > 1 ? 's' : ''}</small></div><div class="d">${d.desc}</div><div class="s"><span>Blindage <b>${d.hp}</b></span><span>Vitesse <b>${d.speed}</b></span>${d.damage ? `<span>Dégâts <b>${d.damage}</b> / ${d.fireRate}s</span><span>Portée <b>${d.range}</b></span>` : `<span>Benne <b>${d.capacity}</b></span>`}<span>Détection <b>${d.sensor}</b></span></div><div class="s">${ui.counters(t).replace(/<br>/g, '')}</div></div>`;
        const c = document.createElement('canvas'); c.width = 72; c.height = 72; Art.toCanvas(c, t, FACTION.PLAYER, 'unit'); div.insertBefore(c, div.firstChild);
        body.appendChild(div);
      }
    } else if (tab === 'structures') {
      for (const t in STRUCTURE_TYPES) {
        const d = STRUCTURE_TYPES[t], div = document.createElement('div'); div.className = 'cx';
        div.innerHTML = `<div><div class="n">${d.name}<small>${d.cost ? '⚙ ' + d.cost : 'Initial'}${d.key ? ' · touche ' + d.key : ''}</small></div><div class="d">${d.desc}</div><div class="s"><span>Blindage <b>${d.hp}</b></span><span>Détection <b>${d.sensor}</b></span>${d.cap ? `<span>Convoi <b>+${d.cap}</b></span>` : ''}${d.damage ? `<span>Dégâts <b>${d.damage}</b> / ${d.fireRate}s · portée ${d.range}</span>` : ''}</div></div>`;
        const c = document.createElement('canvas'); c.width = 72; c.height = 72; Art.toCanvas(c, t, FACTION.PLAYER, 'structure'); div.insertBefore(c, div.firstChild);
        body.appendChild(div);
      }
      const r = document.createElement('div'); r.className = 'cx'; r.innerHTML = '<div><div class="n">Améliorations</div><div class="d">' + Object.values(RESEARCH).map(x => `<b style="color:var(--ink)">${x.name}</b> (⚙ ${x.cost}) — ${x.desc}`).join('<br>') + '</div></div>';
      body.appendChild(r);
    } else if (tab === 'controls') {
      const rows = [['Sélectionner', '<kbd>Clic gauche</kbd> / glisser · <kbd>Maj</kbd> ajouter · double‑clic : même type à l’écran'], ['Ordre contextuel', '<kbd>Clic droit</kbd> : déplacer, attaquer, récupérer, décharger, point de ralliement'], ['Attaque en mouvement', '<kbd>A</kbd> puis clic'], ['Stop', '<kbd>S</kbd>'], ['Tactique', '<kbd>G</kbd> agressif · <kbd>N</kbd> neutre · <kbd>V</kbd> évasif (véhicules sélectionnés)'], ['Formation', '<kbd>F1</kbd> libre · <kbd>F2</kbd> delta · <kbd>F3</kbd> ligne · <kbd>F4</kbd> colonne'], ['Groupes', '<kbd>Ctrl</kbd>+<kbd>1‑5</kbd> assigner · <kbd>1‑5</kbd> rappeler · deux fois : centrer'], ['Production', 'Bastion sélectionné : <kbd>C</kbd> <kbd>E</kbd> <kbd>I</kbd> <kbd>V</kbd> <kbd>F</kbd> <kbd>N</kbd> <kbd>D</kbd>'], ['Construction / Améliorations', '<kbd>B</kbd> / <kbd>R</kbd> — ou directement <kbd>T</kbd> <kbd>P</kbd> <kbd>M</kbd> <kbd>L</kbd>'], ['Caméra', 'Flèches · bords de l’écran · clic milieu · minimap'], ['Zoom tactique', 'Molette : en dézoomant, les véhicules s’affichent en icônes tactiques'], ['Divers', '<kbd>Espace</kbd> centrer sur le Bastion · <kbd>P</kbd> pause · <kbd>+</kbd>/<kbd>-</kbd> vitesse · <kbd>Échap</kbd> annuler / menu']];
      body.innerHTML = '<table class="ctrlTable">' + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
    } else {
      body.innerHTML = `<div class="doctrine">
        <p><b>La ferraille d’abord.</b> Chaque récupérateur de plus accélère tout le reste. Visez six à huit récupérateurs, puis un atelier pour agrandir le convoi.</p>
        <p><b>Contrer, pas accumuler.</b> Les buggys tournent autour des chars lourds, les technicals déchiquettent les buggys, les blindés écrasent les technicals, les chars lourds brisent les blindés. Regardez ce que l’ennemi envoie et répondez.</p>
        <p><b>Voir avant d’être vu.</b> Un motard en tactique évasive sur chaque route et un mirador vous donnent le temps de réagir. Hors de portée de vos détecteurs, l’ennemi est invisible. Pendant une tempête de poussière, tout le monde voit moins loin : c’est le moment des coups de main.</p>
        <p><b>Tactiques.</b> Mettez vos récupérateurs en évasif, vos défenseurs en neutre pour qu’ils reviennent à leur poste, et passez en agressif pour nettoyer un secteur. La formation Ligne maximise la puissance de feu, la Colonne traverse les ruines.</p>
        <p><b>Réparer.</b> Les véhicules abîmés se réparent près du Bastion ou d’un atelier. Un repli bien timé vaut mieux qu’une carcasse de plus dans le désert.</p>
      </div>`;
    }
  }

  // ----- Fin -----
  showEnd(won) {
    const g = this.app.game;
    document.getElementById('endTitle').textContent = won ? 'Victoire' : 'Défaite';
    document.getElementById('endTitle').classList.toggle('defeat', !won);
    document.getElementById('endText').textContent = won ? 'Le Bastion des Charognards n’est plus qu’un tas de tôle fumante. Le territoire est à nous.' : 'Notre dernier bâtiment est tombé. Le convoi se disperse dans la poussière.';
    const rows = [['Durée', Utils.formatTime(g.time)], ['Véhicules détruits', g.stats.killed], ['Véhicules perdus', g.stats.lost], ['Bâtiments détruits', g.stats.structuresKilled], ['Bâtiments perdus', g.stats.structuresLost], ['Ferraille récupérée', Math.floor(g.stats.mined)], ['Améliorations', g.researched[FACTION.PLAYER].size + ' / ' + Object.keys(RESEARCH).length]];
    document.getElementById('endStats').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    this.app.audio.play(won ? 'research' : 'alert');
    this.stack = []; this.show('end');
  }
}
