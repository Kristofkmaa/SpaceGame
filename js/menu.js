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
    this.buildSkirmish(); this.buildOptions(); this.buildKeys();
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

  // ----- Touches -----
  buildKeys() {
    document.getElementById('btnResetKeys').addEventListener('click', () => { this.app.keys.reset(); this.app.saveKeys(); this.renderKeys(); this.app.ui.refreshKeyLabels(); this.app.audio.play('confirm'); });
    this.renderKeys();
  }
  renderKeys() {
    const list = document.getElementById('keysList'); list.innerHTML = '';
    let group = null;
    for (const a of KEY_ACTIONS) {
      if (a.group !== group) { group = a.group; const h = document.createElement('div'); h.className = 'kgroup'; h.textContent = group; list.appendChild(h); }
      const row = document.createElement('div'); row.className = 'krow'; row.dataset.id = a.id;
      row.innerHTML = `<span>${a.label}</span><kbd>${this.app.keys.label(a.id)}</kbd>`;
      row.querySelector('kbd').addEventListener('click', () => this.listenKey(row, a));
      list.appendChild(row);
    }
  }
  listenKey(row, action) {
    if (this.listening) return;
    this.listening = true;
    row.classList.add('listening'); row.querySelector('kbd').textContent = 'Appuyez…';
    const done = () => { this.listening = false; window.removeEventListener('keydown', handler, true); this.renderKeys(); this.app.ui.refreshKeyLabels(); };
    const handler = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      if (e.key === 'Escape') { done(); return; }
      const key = KeyBindings.norm(e);
      if (/^[1-5]$/.test(key) || key.startsWith('Arrow')) { row.querySelector('kbd').textContent = 'Réservée'; setTimeout(done, 700); return; }
      this.app.keys.set(action.id, key); this.app.saveKeys(); this.app.audio.play('confirm'); done();
    };
    window.addEventListener('keydown', handler, true);
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
      const K = this.app.keys, L = id => `<kbd>${K.label(id)}</kbd>`;
      const rows = FIXED_CONTROLS.map(r => [r[0], r[1]]);
      rows.splice(2, 0, ['Caméra au clavier', `${L('camUp')} ${L('camLeft')} ${L('camDown')} ${L('camRight')} ou les flèches · ${L('center')} : centrer sur le Bastion`]);
      rows.push(['Attaque en mouvement', `${L('attackMove')} puis clic`], ['Stop', L('stop')],
        ['Tactique', `${L('stanceAggressive')} agressif · ${L('stanceNeutral')} neutre · ${L('stanceEvasive')} évasif`],
        ['Formation', `${L('formation0')} libre · ${L('formation1')} delta · ${L('formation2')} ligne · ${L('formation3')} colonne`],
        ['Production', Object.keys(UNIT_TYPES).map(t => `${L('produce_' + t)} ${UNIT_TYPES[t].short || UNIT_TYPES[t].name}`).join(' · ')],
        ['Construction', `${L('build')} construction · ${L('research')} améliorations · ${['shipyard', 'turret', 'research', 'relay'].map(t => `${L('place_' + t)} ${STRUCTURE_TYPES[t].name}`).join(' · ')}`],
        ['Partie', `${L('pause')} pause · ${L('speedUp')} / ${L('speedDown')} vitesse`]);
      body.innerHTML = '<table class="ctrlTable">' + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table><p class="doctrine" style="margin-top:14px"><b>Toutes ces touches se changent dans Options → Touches.</b></p>';
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
