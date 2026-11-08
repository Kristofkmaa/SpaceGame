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
    document.getElementById('brief').textContent = `${d.brief} Carte ${m.label.toLowerCase()} (${m.w} × ${m.h}), ${CONFIG.RESOURCES[s.resources].v} unités de ressources au départ.`;
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
        div.innerHTML = `<div><div class="n">${d.name}<small>${CLASSES[d.cls]} · ◆ ${d.cost} · ${d.cap} pt${d.cap > 1 ? 's' : ''}</small></div><div class="d">${d.desc}</div><div class="s"><span>Structure <b>${d.hp}</b></span><span>Vitesse <b>${d.speed}</b></span>${d.damage ? `<span>Dégâts <b>${d.damage}</b> / ${d.fireRate}s</span><span>Portée <b>${d.range}</b></span>` : `<span>Capacité <b>${d.capacity}</b></span>`}<span>Capteurs <b>${d.sensor}</b></span></div><div class="s">${ui.counters(t).replace(/<br>/g, '')}</div></div>`;
        const c = document.createElement('canvas'); c.width = 72; c.height = 72; Art.toCanvas(c, t, FACTION.PLAYER, 'unit'); div.insertBefore(c, div.firstChild);
        body.appendChild(div);
      }
    } else if (tab === 'structures') {
      for (const t in STRUCTURE_TYPES) {
        const d = STRUCTURE_TYPES[t], div = document.createElement('div'); div.className = 'cx';
        div.innerHTML = `<div><div class="n">${d.name}<small>${d.cost ? '◆ ' + d.cost : 'Initial'}${d.key ? ' · touche ' + d.key : ''}</small></div><div class="d">${d.desc}</div><div class="s"><span>Structure <b>${d.hp}</b></span><span>Capteurs <b>${d.sensor}</b></span>${d.cap ? `<span>Flotte <b>+${d.cap}</b></span>` : ''}${d.damage ? `<span>Dégâts <b>${d.damage}</b> / ${d.fireRate}s · portée ${d.range}</span>` : ''}</div></div>`;
        const c = document.createElement('canvas'); c.width = 72; c.height = 72; Art.toCanvas(c, t, FACTION.PLAYER, 'structure'); div.insertBefore(c, div.firstChild);
        body.appendChild(div);
      }
      const r = document.createElement('div'); r.className = 'cx'; r.innerHTML = '<div><div class="n">Technologies</div><div class="d">' + Object.values(RESEARCH).map(x => `<b style="color:var(--ink)">${x.name}</b> (◆ ${x.cost}) — ${x.desc}`).join('<br>') + '</div></div>';
      body.appendChild(r);
    } else if (tab === 'controls') {
      const rows = [['Sélectionner', '<kbd>Clic gauche</kbd> / glisser · <kbd>Maj</kbd> ajouter · double‑clic : même type à l’écran'], ['Ordre contextuel', '<kbd>Clic droit</kbd> : déplacer, attaquer, extraire, décharger, point de ralliement'], ['Attaque en mouvement', '<kbd>A</kbd> puis clic'], ['Stop', '<kbd>S</kbd>'], ['Tactique', '<kbd>G</kbd> agressif · <kbd>N</kbd> neutre · <kbd>V</kbd> évasif (vaisseaux sélectionnés)'], ['Formation', '<kbd>F1</kbd> libre · <kbd>F2</kbd> delta · <kbd>F3</kbd> mur · <kbd>F4</kbd> colonne'], ['Groupes', '<kbd>Ctrl</kbd>+<kbd>1‑5</kbd> assigner · <kbd>1‑5</kbd> rappeler · deux fois : centrer'], ['Production', 'Vaisseau‑mère sélectionné : <kbd>C</kbd> <kbd>E</kbd> <kbd>I</kbd> <kbd>V</kbd> <kbd>F</kbd> <kbd>N</kbd> <kbd>D</kbd>'], ['Construction / Recherche', '<kbd>B</kbd> / <kbd>R</kbd> — ou directement <kbd>T</kbd> <kbd>P</kbd> <kbd>M</kbd> <kbd>L</kbd>'], ['Caméra', 'Flèches · bords de l’écran · clic milieu · minimap'], ['Zoom stratégique', 'Molette : en dézoomant, la flotte s’affiche en icônes tactiques'], ['Divers', '<kbd>Espace</kbd> centrer sur le vaisseau‑mère · <kbd>P</kbd> pause · <kbd>+</kbd>/<kbd>-</kbd> vitesse · <kbd>Échap</kbd> annuler / menu']];
      body.innerHTML = '<table class="ctrlTable">' + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
    } else {
      body.innerHTML = `<div class="doctrine">
        <p><b>Économie d’abord.</b> Chaque collecteur supplémentaire accélère tout le reste. Visez six à huit collecteurs, puis un chantier naval pour la capacité de flotte.</p>
        <p><b>Contrer, pas accumuler.</b> Les intercepteurs harcèlent les destroyers, les corvettes déchiquettent les chasseurs, les frégates d’assaut écrasent les corvettes, les destroyers brisent les frégates. Observez la flotte adverse et répondez.</p>
        <p><b>Voir avant d’être vu.</b> Un éclaireur en tactique évasive sur chaque route d’approche et un relais de capteurs vous donnent le temps de réagir. Hors de portée des capteurs, l’ennemi est invisible.</p>
        <p><b>Tactiques.</b> Mettez vos collecteurs en évasif, vos défenseurs en neutre pour qu’ils reviennent à leur poste, et passez en agressif pour nettoyer un secteur. La formation Mur maximise la puissance de feu, la Colonne traverse les ceintures.</p>
        <p><b>Réparer.</b> Les vaisseaux endommagés se réparent près du vaisseau‑mère ou d’un chantier. Un repli bien timé vaut mieux qu’un vaisseau perdu.</p>
      </div>`;
    }
  }

  // ----- Fin -----
  showEnd(won) {
    const g = this.app.game;
    document.getElementById('endTitle').textContent = won ? 'Victoire' : 'Défaite';
    document.getElementById('endTitle').classList.toggle('defeat', !won);
    document.getElementById('endText').textContent = won ? 'Le vaisseau‑mère ennemi a été réduit en poussière. Le secteur est à nous.' : 'Notre dernière structure a été détruite. La flotte se disperse.';
    const rows = [['Durée', Utils.formatTime(g.time)], ['Vaisseaux détruits', g.stats.killed], ['Vaisseaux perdus', g.stats.lost], ['Structures détruites', g.stats.structuresKilled], ['Structures perdues', g.stats.structuresLost], ['Ressources extraites', Math.floor(g.stats.mined)], ['Technologies', g.researched[FACTION.PLAYER].size + ' / ' + Object.keys(RESEARCH).length]];
    document.getElementById('endStats').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    this.app.audio.play(won ? 'research' : 'alert');
    this.stack = []; this.show('end');
  }
}
