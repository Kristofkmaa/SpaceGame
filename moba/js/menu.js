// ============ Écrans : menu, sélection, versus, guide, options, pause, fin ============
class Menu {
  constructor(app) {
    this.app = app; this.current = null; this.stack = []; this.screens = {};
    for (const n of ['Main', 'Select', 'Versus', 'Howto', 'Options', 'Pause', 'End']) this.screens[n.toLowerCase()] = document.getElementById('screen' + n);
    document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => { this.app.audio.init(); this.app.audio.play('click'); a.dataset.go === 'back' ? this.back() : this.show(a.dataset.go); }));
    document.getElementById('btnFight').addEventListener('click', () => { this.app.audio.init(); this.versus(); });
    document.getElementById('btnResume').addEventListener('click', () => this.closePause());
    document.getElementById('btnQuit').addEventListener('click', () => { this.app.endGame(); this.show('main'); });
    document.getElementById('btnReplay').addEventListener('click', () => this.versus());
    this.buildLineup(); this.buildSelect(); this.buildOptions();
    this.show('main');
  }
  isOpen() { return this.current !== null; }
  show(name) {
    if (this.current && this.current !== name && name !== 'main') this.stack.push(this.current);
    for (const k in this.screens) this.screens[k].classList.toggle('hidden', k !== name);
    this.current = name;
    if (name === 'main') { this.stack = []; if (this.app.game) this.app.endGame(); }
    if (name === 'howto') this.renderHowto();
    if (name === 'options') this.renderKeys();
  }
  back() { const prev = this.stack.pop() || (this.app.game && this.app.game.state === 'playing' ? 'pause' : 'main'); this.current = null; this.show(prev); }
  hide() { for (const k in this.screens) this.screens[k].classList.add('hidden'); this.current = null; this.stack = []; }
  escape() { if (this.current === 'pause') this.closePause(); else if (this.current === 'versus' || this.current === 'end') return; else if (this.current !== 'main') this.back(); }
  openPause() { const g = this.app.game; if (!g || g.state !== 'playing') return; g.paused = true; this.stack = []; this.show('pause'); }
  closePause() { this.hide(); if (this.app.game) this.app.game.paused = false; }

  buildLineup() {
    const c = document.getElementById('lineup'), ctx = c.getContext('2d');
    const order = ['vipere', 'briseroc', 'etincelle', 'doc'];
    const pos = [[40, 140, 300], [270, 40, 380], [520, 120, 320], [700, 170, 280]];
    ctx.clearRect(0, 0, c.width, c.height);
    order.forEach((id, i) => {
      const [x, y, s] = pos[i];
      const off = document.createElement('canvas'); off.width = off.height = s;
      Art.portrait(off.getContext('2d'), id, s, s, { bg: false, team: 0, seed: 11 });
      ctx.save(); ctx.globalAlpha = i === 1 ? 1 : 0.92; ctx.drawImage(off, x, y + (c.height - y - s)); ctx.restore();
    });
    const fade = ctx.createLinearGradient(0, c.height - 120, 0, c.height); fade.addColorStop(0, 'rgba(27,20,16,0)'); fade.addColorStop(1, 'rgba(27,20,16,0.95)');
    ctx.fillStyle = fade; ctx.fillRect(0, c.height - 120, c.width, 120);
  }

  // ---------- Sélection ----------
  buildSelect() {
    const s = this.app.settings, box = document.getElementById('heroCards');
    for (const id in HEROES) {
      const d = HEROES[id], card = document.createElement('div'); card.className = 'hc'; card.dataset.id = id;
      const c = document.createElement('canvas'); c.width = 400; c.height = 500;
      Art.portrait(c.getContext('2d'), id, 400, 500, { team: 0, seed: 3 });
      card.appendChild(c);
      card.insertAdjacentHTML('beforeend', `<div class="nm"><span>${d.role}</span><b>${d.name}</b></div>`);
      card.addEventListener('click', () => { s.hero = id; this.app.saveSettings(); this.renderSelect(); this.app.audio.play('click'); });
      box.appendChild(card);
    }
    const seg = document.getElementById('diffSeg');
    for (const k in DIFFICULTY) {
      const a = document.createElement('a'); a.textContent = DIFFICULTY[k].label; a.dataset.v = k;
      a.addEventListener('click', () => { s.difficulty = k; this.app.saveSettings(); this.renderSelect(); this.app.audio.play('click'); });
      seg.appendChild(a);
    }
    this.renderSelect();
  }
  renderSelect() {
    const s = this.app.settings, id = s.hero, d = HEROES[id], K = this.app.keys;
    document.querySelectorAll('.hc').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
    document.querySelectorAll('#diffSeg a').forEach(a => a.classList.toggle('on', a.dataset.v === s.difficulty));
    document.getElementById('diffBrief').textContent = DIFFICULTY[s.difficulty].brief;
    const box = document.getElementById('heroDetail'); box.innerHTML = '';
    const big = document.createElement('div'); big.className = 'big';
    const c = document.createElement('canvas'); c.width = c.height = 600; Art.portrait(c.getContext('2d'), id, 600, 600, { team: 0, seed: 9 }); big.appendChild(c);
    big.insertAdjacentHTML('beforeend', `<div class="ratings">${Object.entries(d.ratings).map(([k, v]) => `<div><span>${k}</span><span>${[1, 2, 3].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}<div><span>Difficulté</span><span>${[1, 2, 3].map(i => `<i class="${i <= d.difficulty ? 'on' : ''}"></i>`).join('')}</span></div></div>`);
    box.appendChild(big);
    const col = document.createElement('div'); col.className = 'col';
    col.innerHTML = `<div class="kicker">${d.role} · ${d.ranged ? 'distance' : 'mêlée'}</div><div class="hn">${d.name}</div><div class="ht">${d.title}</div><p class="lore">${d.lore}</p><p class="tip">${d.tip}</p>`;
    d.abilities.forEach((aid, slot) => {
      const ab = ABILITIES[aid], row = document.createElement('div'); row.className = 'abil';
      row.appendChild((() => { const cc = document.createElement('canvas'); cc.width = cc.height = 96; Art.icon(cc.getContext('2d'), aid, 96, 'ability', id); return cc; })());
      row.insertAdjacentHTML('beforeend', `<div><div class="an"><span class="k">${K.label('ab' + slot)}</span>${ab.name}<small>${ab.ult ? 'Ultime · ' : ''}${ab.cost[0]} énergie · ${ab.cd[0]} s</small></div><div class="ad">${ab.desc()}</div></div>`);
      col.appendChild(row);
    });
    box.appendChild(col);
  }
  versus() {
    const s = this.app.settings, ids = Object.keys(HEROES);
    const allies = Utils.shuffle(ids.filter(x => x !== s.hero)).slice(0, 2);
    const enemies = Utils.shuffle(ids).slice(0, 3);
    const box = document.getElementById('versus');
    const card = (id, team, me, i) => `<div class="vc ${team ? 'red' : 'blue'} ${me ? 'me' : ''}" style="animation-delay:${i * 0.12}s"><canvas data-h="${id}" data-t="${team}" width="340" height="440"></canvas><b>${HEROES[id].name}</b><span>${me ? 'Vous' : HEROES[id].role}</span></div>`;
    box.innerHTML = `<div class="side">${[s.hero, ...allies].map((id, i) => card(id, 0, i === 0, i)).join('')}</div><div class="vs">VS</div><div class="side">${enemies.map((id, i) => card(id, 1, false, i + 3)).join('')}</div>`;
    box.querySelectorAll('canvas').forEach(c => Art.portrait(c.getContext('2d'), c.dataset.h, 340, 440, { team: +c.dataset.t, seed: 4 }));
    this.stack = []; this.show('versus');
    this.app.audio.play('horn');
    clearTimeout(this.vsTimer);
    this.vsTimer = setTimeout(() => this.app.startGame({ heroId: s.hero, allies, enemies, difficulty: s.difficulty }), 2600);
  }

  // ---------- Guide ----------
  renderHowto() {
    const K = this.app.keys, L = id => `<kbd>${K.label(id)}</kbd>`;
    const rows = [...FIXED_CONTROLS,
      ['Compétences', `${L('ab0')} ${L('ab1')} ${L('ab2')} ${L('ab3')}`], ['Sorts', `${L('sp0')} Saut · ${L('sp1')} Rustine`],
      ['Retour à la base', L('recall')], ['Boutique', L('shop')], ['Stop', L('stop')], ['Tableau des scores', `${L('scoreboard')} (maintenir)`],
      ['Caméra', `${L('camLock')} verrouiller / libérer · ${L('camCenter')} centrer (maintenir)`]];
    document.getElementById('howtoBody').innerHTML = `
      <h3>L’objectif</h3><p>Deux équipes de trois héros s’affrontent sur une seule voie, une autoroute effondrée. Chaque camp protège <b>deux tourelles</b> puis son <b>réacteur</b>. Le premier réacteur détruit perd la partie.</p>
      <h3>Les sbires et l’or</h3><p>Toutes les 30 secondes, chaque base envoie une vague de <b>pillards</b>, d’<b>arbalétriers</b> et parfois un <b>camion‑bélier</b>. Donnez le <b>dernier coup</b> à un sbire ennemi pour gagner de l’or. Rester à proximité suffit pour gagner de l’expérience.</p>
      <h3>Les tourelles</h3><p>Une tourelle frappe d’abord les sbires, mais elle se retourne contre vous si vous attaquez un héros à sa portée, et ses tirs se renforcent à chaque coup. Laissez vos sbires encaisser avant d’attaquer une tourelle. Sans sbires alliés à proximité, les structures ne subissent que 40 % des dégâts. La tourelle intérieure et le réacteur sont protégés tant que la structure précédente tient.</p>
      <h3>Niveaux et compétences</h3><p>Chaque niveau donne un point : améliorez une compétence avec <b>Ctrl + sa touche</b> ou le bouton + qui apparaît. L’ultime se débloque au niveau 6, puis 9 et 12. Maintenez la touche d’une compétence pour voir sa portée, relâchez pour la lancer vers le curseur.</p>
      <h3>Objets et retour</h3><p>Rentrez à la base avec ${L('recall')} (6 secondes, interrompu si vous êtes touché) pour vous soigner à la citerne et acheter des objets avec ${L('shop')}. La citerne ennemie détruit tout héros qui s’en approche.</p>
      <h3>Contrôles</h3><table class="ctrlTable">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
      <p style="margin-top:10px">Toutes les touches se changent dans <b>Options</b>, avec des préréglages AZERTY et QWERTY.</p>`;
  }

  // ---------- Options ----------
  buildOptions() {
    const s = this.app.settings, vol = document.getElementById('optVolume');
    vol.value = s.volume; vol.addEventListener('input', () => { s.volume = +vol.value; this.app.applySettings(); });
    vol.addEventListener('change', () => this.app.saveSettings());
    document.querySelectorAll('#screenOptions .seg[data-opt]').forEach(seg => {
      const key = seg.dataset.opt;
      seg.querySelectorAll('a').forEach(a => {
        a.classList.toggle('on', String(s[key] ? 1 : 0) === a.dataset.v);
        a.addEventListener('click', () => { s[key] = a.dataset.v === '1'; this.app.applySettings(); this.app.saveSettings(); seg.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); this.app.audio.play('click'); });
      });
    });
    document.querySelectorAll('#layoutSeg a').forEach(a => a.addEventListener('click', () => { this.app.keys.applyLayout(a.dataset.v); this.app.saveKeys(); this.renderKeys(); this.app.audio.play('click'); }));
  }
  renderKeys() {
    const K = this.app.keys, list = document.getElementById('keysList'); list.innerHTML = '';
    document.querySelectorAll('#layoutSeg a').forEach(a => a.classList.toggle('on', a.dataset.v === K.layout));
    let group = null;
    for (const a of KEY_ACTIONS) {
      if (a.group !== group) { group = a.group; list.insertAdjacentHTML('beforeend', `<div class="kgroup">${group}</div>`); }
      const row = document.createElement('div'); row.className = 'krow';
      row.innerHTML = `<span>${a.label}</span><kbd>${K.label(a.id)}</kbd>`;
      row.querySelector('kbd').addEventListener('click', () => this.listen(row, a));
      list.appendChild(row);
    }
  }
  listen(row, action) {
    if (this.listening) return;
    this.listening = true; row.classList.add('listen'); row.querySelector('kbd').textContent = 'Appuyez…';
    const done = () => { this.listening = false; window.removeEventListener('keydown', h, true); this.renderKeys(); if (this.app.game) this.app.ui.buildAbilities(); };
    const h = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      if (e.key === 'Escape') return done();
      const key = KeyBindings.norm(e);
      if (key.startsWith('Arrow')) { row.querySelector('kbd').textContent = 'Réservée'; return setTimeout(done, 700); }
      this.app.keys.set(action.id, key); this.app.saveKeys(); this.app.audio.play('click'); done();
    };
    window.addEventListener('keydown', h, true);
  }

  // ---------- Fin ----------
  showEnd(won) {
    const g = this.app.game;
    document.getElementById('endTitle').textContent = won ? 'Victoire' : 'Défaite';
    document.getElementById('endTitle').classList.toggle('defeat', !won);
    document.getElementById('endText').textContent = (won ? 'Le réacteur des Charognards n’est plus qu’un cratère fumant.' : 'Notre réacteur a sauté. Le convoi se replie dans la poussière.') + ` Durée : ${Utils.formatTime(g.time)}.`;
    const box = document.getElementById('endStats');
    box.innerHTML = this.app.ui.scoreTable(g.heroes); this.app.ui.fillScore(box);
    this.app.audio.play(won ? 'levelup' : 'death');
    this.stack = []; this.show('end');
  }
}
