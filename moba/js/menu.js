// ============ Écrans : menu, sélection, versus, guide, options, pause, fin ============
class Menu {
  constructor(app) {
    this.app = app; this.current = null; this.stack = []; this.screens = {};
    for (const n of ['Main', 'Select', 'Versus', 'Howto', 'Options', 'Pause', 'End', 'Multi', 'Lobby']) this.screens[n.toLowerCase()] = document.getElementById('screen' + n);
    document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => { this.app.audio.init(); this.app.audio.play('click'); a.dataset.go === 'back' ? this.back() : this.show(a.dataset.go); }));
    document.getElementById('btnFight').addEventListener('click', () => { this.app.audio.init(); this.versus(); });
    document.getElementById('btnResume').addEventListener('click', () => this.closePause());
    document.getElementById('btnQuit').addEventListener('click', () => { this.app.endGame(); this.show('main'); });
    document.getElementById('btnReplay').addEventListener('click', () => {
      if (this.app.multi.room) { this.app.endGame(); this.app.multi.backToLobby(); this.show('lobby'); }
      else this.versus();
    });
    this.buildSelect(); this.buildOptions(); this.buildMulti();
    this.app.multi.onChange = () => { if (this.current === 'multi') this.renderMulti(); else if (this.current === 'lobby') this.renderLobby(); };
    this.show('main');
  }
  isOpen() { return this.current !== null; }
  show(name) {
    if (this.current && this.current !== name && name !== 'main') this.stack.push(this.current);
    for (const k in this.screens) this.screens[k].classList.toggle('hidden', k !== name);
    this.current = name;
    if (name === 'main') { this.stack = []; if (this.app.game) this.app.endGame(); if (this.app.multi.room) this.app.multi.leave(); }
    if (name === 'multi') { if (this.app.multi.room) this.app.multi.leave(); this.stack = []; this.renderMulti(); this.app.multi.init(); }
    if (name === 'lobby') { this.stack = []; this.renderLobby(); }
    if (name === 'select') this.renderSelect(); else this.app.studio.stopTurntable();
    if (name === 'howto') this.renderHowto();
    if (name === 'options') this.renderKeys();
  }
  back() { const prev = this.stack.pop() || (this.app.game && this.app.game.state === 'playing' ? 'pause' : 'main'); this.current = null; this.show(prev); }
  hide() { for (const k in this.screens) this.screens[k].classList.add('hidden'); this.current = null; this.stack = []; this.app.studio.stopTurntable(); }
  escape() { if (this.current === 'pause') this.closePause(); else if (this.current === 'multi') this.show('main'); else if (['versus', 'end', 'main', 'lobby'].includes(this.current)) return; else this.back(); }
  openPause() { const g = this.app.game; if (!g || g.state !== 'playing') return; if (!this.app.online()) g.paused = true; document.getElementById('pauseNote').classList.toggle('hidden', !this.app.online()); this.stack = []; this.show('pause'); }
  closePause() { this.hide(); if (this.app.game) this.app.game.paused = false; }

  // ---------- Sélection ----------
  buildSelect() {
    const s = this.app.settings, grid = document.getElementById('heroGrid');
    for (const id in HEROES) {
      const card = document.createElement('div'); card.className = 'hc'; card.dataset.id = id;
      card.appendChild(this.app.studio.portrait(id, 128, 0));
      card.insertAdjacentHTML('beforeend', `<span class="nm">${HEROES[id].name}</span>`);
      card.addEventListener('click', () => { s.hero = id; if (!HEROES[id].roles.includes(s.role)) s.role = HEROES[id].roles[0]; this.app.saveSettings(); this.renderSelect(); this.app.audio.play('click'); });
      grid.appendChild(card);
    }
    const roles = document.getElementById('rolePick');
    for (const r of ROLE_ORDER) {
      const a = document.createElement('a'); a.dataset.r = r; a.innerHTML = `<i>${ROLE_GLYPH[r]}</i><b>${ROLES[r].label}</b>`;
      a.addEventListener('click', () => { s.role = r; this.app.saveSettings(); this.renderSelect(); this.app.audio.play('click'); });
      roles.appendChild(a);
    }
    const seg = document.getElementById('diffSeg');
    for (const k in DIFFICULTY) { const a = document.createElement('a'); a.textContent = DIFFICULTY[k].label; a.dataset.v = k; a.addEventListener('click', () => { s.difficulty = k; this.app.saveSettings(); this.renderSelect(); this.app.audio.play('click'); }); seg.appendChild(a); }
  }
  renderSelect() {
    const s = this.app.settings, id = s.hero, d = HEROES[id], K = this.app.keys;
    document.querySelectorAll('.hc').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
    document.querySelectorAll('#rolePick a').forEach(a => { a.classList.toggle('on', a.dataset.r === s.role); a.classList.toggle('fit', d.roles.includes(a.dataset.r)); });
    document.querySelectorAll('#diffSeg a').forEach(a => a.classList.toggle('on', a.dataset.v === s.difficulty));
    document.getElementById('roleHint').textContent = d.roles.includes(s.role) ? ROLES[s.role].desc : `${d.name} n’est pas pensé pour ce poste, mais rien ne vous en empêche.`;
    document.getElementById('diffBrief').textContent = DIFFICULTY[s.difficulty].brief;
    const box = document.getElementById('heroInfo');
    box.innerHTML = `<div class="kicker">${d.role} · ${d.ranged ? 'distance' : 'mêlée'} · ${d.roles.map(r => ROLES[r].label).join(', ')}</div><div class="hn">${d.name}</div><div class="ht">${d.title}</div>
      <div class="ratings">${Object.entries(d.ratings).map(([k, v]) => `<div><span>${k}</span><span>${[1, 2, 3].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}<div><span>Difficulté</span><span>${[1, 2, 3].map(i => `<i class="${i <= d.difficulty ? 'on' : ''}"></i>`).join('')}</span></div></div>
      <p class="lore">${d.lore}</p><p class="tip">${d.tip}</p><div id="abilList"></div>`;
    const list = document.getElementById('abilList');
    d.abilities.forEach((aid, slot) => {
      const ab = ABILITIES[aid], row = document.createElement('div'); row.className = 'abil';
      row.appendChild(Icons.get(aid, 96, 'ability', id));
      row.insertAdjacentHTML('beforeend', `<div><div class="an"><span class="k">${K.label('ab' + slot)}</span>${ab.name}<small>${ab.ult ? 'Ultime · ' : ''}${ab.cost[0]} énergie · ${ab.cd[0]} s</small></div><div class="ad">${ab.desc()}</div></div>`);
      list.appendChild(row);
    });
    if (this.current === 'select' || !this.current) { const stage = document.getElementById('stage'); if (!this.app.studio.tt || this._ttHero !== id) { this._ttHero = id; this.app.studio.startTurntable(stage, id); } }
  }
  buildTeams() {
    const s = this.app.settings, ids = Object.keys(HEROES);
    const fill = fixed => {
      const used = new Set(Object.values(fixed)), out = [];
      for (const r of ROLE_ORDER) {
        if (fixed[r]) { out.push({ id: fixed[r], role: r }); continue; }
        let c = Utils.shuffle(ids.filter(i => !used.has(i) && HEROES[i].roles.includes(r)));
        if (!c.length) c = Utils.shuffle(ids.filter(i => !used.has(i)));
        used.add(c[0]); out.push({ id: c[0], role: r });
      }
      return out;
    };
    const blue = fill({ [s.role]: s.hero }); const me = blue.findIndex(p => p.role === s.role); blue.unshift({ ...blue.splice(me, 1)[0], me: true, human: true });
    return { blue, red: fill({}) };
  }
  versus() {
    const s = this.app.settings, teams = this.buildTeams(), box = document.getElementById('versus');
    const card = (p, team, me, i) => `<div class="vc ${team ? 'red' : 'blue'} ${me ? 'me' : ''}" style="animation-delay:${i * 0.08}s"><canvas data-h="${p.id}" data-t="${team}" width="220" height="300"></canvas><b>${HEROES[p.id].name}</b><span>${ROLE_GLYPH[p.role]} ${me ? 'Vous' : ROLES[p.role].label}</span></div>`;
    const blueSorted = ROLE_ORDER.map(r => teams.blue.find(p => p.role === r)), redSorted = ROLE_ORDER.map(r => teams.red.find(p => p.role === r));
    box.innerHTML = `<div class="side">${blueSorted.map((p, i) => card(p, 0, p === teams.blue[0], i)).join('')}</div><div class="vs"><span>VS</span><small>${DIFFICULTY[s.difficulty].label}</small></div><div class="side">${redSorted.map((p, i) => card(p, 1, false, i + 5)).join('')}</div><div class="loadTip">Astuce : ${Utils.pick(TIPS)}</div>`;
    box.querySelectorAll('canvas').forEach(c => c.getContext('2d').drawImage(this.app.studio.card(c.dataset.h, 220, 300, +c.dataset.t), 0, 0));
    this.stack = []; this.show('versus'); this.app.audio.play('horn');
    clearTimeout(this.vsTimer);
    this.vsTimer = setTimeout(() => this.app.startGame({ blue: teams.blue, red: teams.red, difficulty: s.difficulty }), 3200);
  }

  // ---------- Multijoueur ----------
  buildMulti() {
    const s = this.app.settings, nick = document.getElementById('mpNick');
    nick.value = s.nick || '';
    nick.addEventListener('input', () => { s.nick = nick.value.replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, 16); this.app.saveSettings(); });
    nick.addEventListener('keydown', e => e.stopPropagation());
    const code = document.getElementById('mpCode');
    code.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') this.joinCode(); });
    document.getElementById('mpHost').addEventListener('click', async () => { if (!this.app.multi.hub) return; this.app.audio.play('click'); await this.app.multi.host(); this.show('lobby'); });
    document.getElementById('mpJoin').addEventListener('click', () => this.joinCode());
    document.getElementById('mpRetry').addEventListener('click', () => { this.app.multi.status = 'off'; this.app.multi.hub = null; this.renderMulti(); this.app.multi.init(); });
    document.getElementById('lobLeave').addEventListener('click', () => { this.app.multi.leave(); this.show('multi'); });
    document.getElementById('lobStart').addEventListener('click', () => { this.app.audio.play('click'); this.app.multi.start(); });
    document.getElementById('lobCopy').addEventListener('click', () => { const c = this.app.multi.code; try { navigator.clipboard.writeText(c); this.app.ui.toast('Code copié : ' + c, 'info'); } catch (e) { /* presse-papiers indisponible */ } });
    const seg = document.getElementById('lobDiff');
    for (const k in DIFFICULTY) { const a = document.createElement('a'); a.textContent = DIFFICULTY[k].label; a.dataset.v = k; a.addEventListener('click', () => { this.app.multi.setDiff(k); this.app.audio.play('click'); }); seg.appendChild(a); }
    const grid = document.getElementById('lobHeroes');
    for (const id in HEROES) {
      const c = document.createElement('div'); c.className = 'lh'; c.dataset.id = id;
      c.appendChild(this.app.studio.portrait(id, 96, 0)); c.insertAdjacentHTML('beforeend', `<span>${HEROES[id].name}</span>`);
      c.dataset.tip = `<b>${HEROES[id].name}</b> · ${HEROES[id].roles.map(r => ROLES[r].label).join(', ')}<br>${HEROES[id].title}`;
      c.addEventListener('click', () => { if (c.classList.contains('taken')) return; s.hero = id; this.app.saveSettings(); this.app.multi.setMine({ hero: id }); this.app.audio.play('click'); });
      grid.appendChild(c);
    }
  }
  async joinCode(code, hostPeer) {
    const m = this.app.multi; code = code || document.getElementById('mpCode').value;
    if (!m.hub || !String(code || '').trim()) return;
    this.app.audio.play('click'); await m.join(code, hostPeer); this.show('lobby');
  }
  renderMulti() {
    const m = this.app.multi, st = document.getElementById('mpStatus'), ready = m.status === 'ready';
    const how = m.hub ? (m.hub.kind === 'claude' ? 'Salon en direct de la page Claude' : 'Serveur de jeu ' + location.host) : '';
    st.className = 'mpStatus ' + m.status;
    st.innerHTML = m.status === 'connecting' || m.status === 'off' ? '<i></i>Connexion au salon…'
      : ready ? `<i></i>Connecté · ${how}`
      : '<i></i>Multijoueur indisponible ici. Ouvrez le jeu depuis le lien de la page Claude, ou lancez le serveur fourni : <code>node moba/server.js</code>, puis ouvrez l’adresse affichée.';
    document.getElementById('mpRetry').classList.toggle('hidden', m.status !== 'none');
    for (const id of ['mpHost', 'mpJoin']) document.getElementById(id).classList.toggle('off', !ready);
    const list = document.getElementById('mpList'), games = m.openGames();
    list.innerHTML = games.length ? '' : `<div class="empty">${ready ? 'Aucun salon ouvert pour l’instant. Créez‑en un, ou entrez le code qu’un ami vous a donné.' : '—'}</div>`;
    for (const gm of games) {
      const row = document.createElement('div'); row.className = 'mpGame' + (gm.started ? ' started' : '');
      row.innerHTML = `<b></b><span class="code">${esc(gm.code.toUpperCase())}</span><span class="n">${gm.started ? 'En cours' : gm.n + ' / 10 joueurs'}</span><a class="btn small${gm.started ? ' off' : ''}">Rejoindre</a>`;
      row.querySelector('b').textContent = `Salon de ${gm.nick}`;
      row.querySelector('a').addEventListener('click', () => { if (!gm.started) this.joinCode(gm.code, gm.peer); });
      list.appendChild(row);
    }
  }
  renderLobby() {
    const m = this.app.multi, lob = m.lob, me = m.hub && m.hub.me;
    document.getElementById('lobCode').textContent = (m.code || '').toUpperCase();
    document.getElementById('lobWho').textContent = m.isHost ? 'Vous êtes l’hôte : votre navigateur fait tourner la partie, gardez cet onglet ouvert.' : lob ? 'En attente du lancement par l’hôte.' : 'Connexion à l’hôte…';
    for (const team of [0, 1]) {
      const box = document.getElementById(team ? 'lobRed' : 'lobBlue');
      box.innerHTML = `<div class="th">${TEAM_INFO[team].name}</div>`;
      ROLE_ORDER.forEach((role, r) => {
        const i = team * 5 + r, sl = lob && lob.slots[i], mine = sl && sl.peer === me;
        const row = document.createElement('div'); row.className = 'ls' + (sl ? ' taken' : '') + (mine ? ' me' : '');
        row.innerHTML = `<span class="rl">${ROLE_GLYPH[role]} ${ROLES[role].label}</span><span class="pp"></span><span class="who"></span>`;
        if (sl && sl.hero) row.querySelector('.pp').appendChild(this.app.studio.portrait(sl.hero, 64, team));
        row.querySelector('.who').innerHTML = sl ? `<b></b><small>${sl.hero ? HEROES[sl.hero].name : 'Choisit un héros…'}</small>` : '<small>Bot · cliquez pour prendre la place</small>';
        if (sl) row.querySelector('.who b').textContent = sl.nick + (mine ? ' (vous)' : '');
        row.addEventListener('click', () => { if (!lob || (sl && !mine)) return; m.setMine({ slot: i }); this.app.audio.play('click'); });
        box.appendChild(row);
      });
    }
    const wait = document.getElementById('lobWait');
    wait.textContent = lob && lob.wait.length ? 'Sans place : ' + lob.wait.map(w => w.nick).join(', ') : '';
    const mySlot = lob ? lob.slots.findIndex(x => x && x.peer === me) : -1, myTeam = mySlot < 0 ? -1 : mySlot < 5 ? 0 : 1;
    const taken = new Set(lob && myTeam >= 0 ? lob.slots.slice(myTeam * 5, myTeam * 5 + 5).filter(x => x && x.peer !== me && x.hero).map(x => x.hero) : []);
    const myHero = mySlot >= 0 ? lob.slots[mySlot].hero : m.mine.hero;
    document.querySelectorAll('#lobHeroes .lh').forEach(c => { c.classList.toggle('sel', c.dataset.id === myHero); c.classList.toggle('taken', taken.has(c.dataset.id)); });
    document.querySelectorAll('#lobDiff a').forEach(a => { a.classList.toggle('on', lob && a.dataset.v === lob.diff); a.classList.toggle('off', !m.isHost); });
    const start = document.getElementById('lobStart');
    start.classList.toggle('hidden', !m.isHost);
    document.getElementById('lobWaitHost').classList.toggle('hidden', m.isHost);
    const humans = lob ? lob.slots.filter(Boolean).length : 0;
    document.getElementById('lobCount').textContent = `${humans} joueur${humans > 1 ? 's' : ''} · ${10 - humans} bot${10 - humans > 1 ? 's' : ''}`;
  }
  versusMulti(teams, diff, cb) {
    const box = document.getElementById('versus');
    const card = (p, team, i) => `<div class="vc ${team ? 'red' : 'blue'} ${p.me ? 'me' : ''}" style="animation-delay:${i * 0.08}s"><canvas data-h="${p.id}" data-t="${team}" width="220" height="300"></canvas><b>${HEROES[p.id].name}</b><span>${ROLE_GLYPH[p.role]} ${p.me ? 'Vous' : p.human ? esc(p.nick) : 'Bot · ' + ROLES[p.role].label}</span></div>`;
    box.innerHTML = `<div class="side">${teams.blue.map((p, i) => card(p, 0, i)).join('')}</div><div class="vs"><span>VS</span><small>En ligne · bots ${DIFFICULTY[diff].label}</small></div><div class="side">${teams.red.map((p, i) => card(p, 1, i + 5)).join('')}</div><div class="loadTip">Astuce : ${Utils.pick(TIPS)}</div>`;
    box.querySelectorAll('canvas').forEach(c => c.getContext('2d').drawImage(this.app.studio.card(c.dataset.h, 220, 300, +c.dataset.t), 0, 0));
    this.stack = []; this.show('versus'); this.app.audio.play('horn');
    clearTimeout(this.vsTimer);
    this.vsTimer = setTimeout(cb, 3200);
  }

  renderHowto() {
    const K = this.app.keys, L = id => `<kbd>${K.label(id)}</kbd>`;
    const rows = [...FIXED_CONTROLS, ['Compétences', `${L('ab0')} ${L('ab1')} ${L('ab2')} ${L('ab3')} — maintenir pour viser, relâcher pour lancer`], ['Améliorer une compétence', `Ctrl + ${L('ab0')} … ${L('ab3')}`], ['Sorts', `${L('sp0')} ${L('sp1')} (Saut, et Rustine ou Châtiment pour le jungler)`], ['Retour à la base', L('recall')], ['Boutique', L('shop')], ['Stop', L('stop')], ['Tableau des scores', `${L('scoreboard')} (maintenir)`], ['Caméra', `${L('camLock')} verrouiller / libérer · ${L('camCenter')} centrer · ${L('showRange')} portée d’attaque`]];
    document.getElementById('howtoBody').innerHTML = `
      <div class="cols"><div>
      <h3>L’objectif</h3><p>Deux équipes de cinq s’affrontent sur une carte à <b>trois voies</b> séparées par une <b>jungle</b> et traversées par une rivière toxique. Chaque voie est gardée par <b>deux tourelles</b> et un <b>inhibiteur</b>. Détruisez un inhibiteur pour ouvrir les <b>tourelles du réacteur</b>, puis le <b>réacteur</b> lui‑même.</p>
      <h3>Les voies et les sbires</h3><p>Toutes les 30 secondes, chaque base envoie une vague par voie. Donnez le <b>dernier coup</b> aux sbires ennemis pour l’or. Un inhibiteur détruit fait apparaître des <b>mastodontes</b> dans cette voie pour l’équipe adverse.</p>
      <h3>La jungle</h3><p>Six camps par camp : meute, vautours, golems, crapaud, et deux buffs. Le <b>Noyau radioactif</b> réduit les délais, la <b>Bête écarlate</b> fait brûler vos attaques. Dans la rivière dorment le <b>Ver des sables</b> (dégâts permanents pour l’équipe) et le <b>Titan de rouille</b> (dès 15 min, renforce l’équipe et ses sbires). Le jungler dispose de <b>Châtiment</b> pour sécuriser les monstres.</p>
      <h3>Le brouillard de guerre</h3><p>Vous ne voyez que ce que voient vos héros, sbires et tourelles. Les bots ennemis aussi.</p>
      </div><div>
      <h3>Objets et recettes</h3><p>Les <b>composants</b> se combinent en objets <b>intermédiaires</b>, puis en objets <b>légendaires</b>. Les composants déjà possédés sont déduits du prix. Ouvrez la boutique avec ${L('shop')} : l’arbre de fabrication montre ce qu’il vous manque.</p>
      <h3>Niveaux et compétences</h3><p>Niveau maximum 18. L’ultime se débloque aux niveaux 6, 11 et 16. Améliorez avec <b>Ctrl + touche</b> ou le bouton + au‑dessus de l’icône.</p>
      <h3>Contrôles</h3><table class="ctrlTable">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
      <p>Toutes les touches se changent dans <b>Options</b>, avec des préréglages AZERTY et QWERTY.</p>
      </div></div>`;
  }
  buildOptions() {
    const s = this.app.settings, vol = document.getElementById('optVolume');
    vol.value = s.volume; vol.addEventListener('input', () => { s.volume = +vol.value; this.app.applySettings(); }); vol.addEventListener('change', () => this.app.saveSettings());
    document.querySelectorAll('#screenOptions .seg[data-opt]').forEach(seg => {
      const key = seg.dataset.opt;
      seg.querySelectorAll('a').forEach(a => { a.classList.toggle('on', String(s[key] ? 1 : 0) === a.dataset.v); a.addEventListener('click', () => { s[key] = a.dataset.v === '1'; this.app.applySettings(); this.app.saveSettings(); seg.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); this.app.audio.play('click'); }); });
    });
    document.querySelectorAll('#layoutSeg a').forEach(a => a.addEventListener('click', () => { this.app.keys.applyLayout(a.dataset.v); this.app.saveKeys(); this.renderKeys(); this.app.audio.play('click'); }));
  }
  renderKeys() {
    const K = this.app.keys, list = document.getElementById('keysList'); list.innerHTML = '';
    document.querySelectorAll('#layoutSeg a').forEach(a => a.classList.toggle('on', a.dataset.v === K.layout));
    let group = null;
    for (const a of KEY_ACTIONS) {
      if (a.group !== group) { group = a.group; list.insertAdjacentHTML('beforeend', `<div class="kgroup">${group}</div>`); }
      const row = document.createElement('div'); row.className = 'krow'; row.innerHTML = `<span>${a.label}</span><kbd>${K.label(a.id)}</kbd>`;
      row.querySelector('kbd').addEventListener('click', () => this.listen(row, a)); list.appendChild(row);
    }
  }
  listen(row, action) {
    if (this.listening) return;
    this.listening = true; row.classList.add('listen'); row.querySelector('kbd').textContent = 'Appuyez…';
    const done = () => { this.listening = false; window.removeEventListener('keydown', h, true); this.renderKeys(); if (this.app.game) this.app.ui.buildAbilities(); };
    const h = e => { e.preventDefault(); e.stopImmediatePropagation(); if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return; if (e.key === 'Escape') return done(); const key = KeyBindings.norm(e); if (key.startsWith('Arrow') || /^[1-6]$/.test(key)) { row.querySelector('kbd').textContent = 'Réservée'; return setTimeout(done, 700); } this.app.keys.set(action.id, key); this.app.saveKeys(); this.app.audio.play('click'); done(); };
    window.addEventListener('keydown', h, true);
  }
  showEnd(won, lostMsg) {
    const g = this.app.game, foe = TEAM_INFO[1 - g.player.team].name, mp = this.app.online() || !!lostMsg;
    document.getElementById('endTitle').textContent = lostMsg ? 'Partie interrompue' : won ? 'Victoire' : 'Défaite';
    document.getElementById('endTitle').classList.toggle('defeat', !won);
    document.getElementById('endText').textContent = lostMsg ? lostMsg + '.' : (won ? `Le réacteur des ${foe} n’est plus qu’un cratère fumant.` : 'Notre réacteur a sauté. Le convoi se replie dans la poussière.') + ` Durée : ${Utils.formatTime(g.time)}.`;
    const replay = document.getElementById('btnReplay');
    replay.textContent = mp ? 'Retour au salon' : 'Rejouer';
    replay.classList.toggle('hidden', mp && !this.app.multi.room);
    const box = document.getElementById('endStats'); box.innerHTML = this.app.ui.scoreTable(g.heroes); this.app.ui.fillScore(box);
    this.app.audio.play(won ? 'levelup' : 'death');
    this.stack = []; this.show('end');
  }
}
const TIPS = [
  'Le dernier coup sur un sbire rapporte de l’or : attaquer sans arrêt ne suffit pas.',
  'Les composants déjà achetés sont déduits du prix des gros objets.',
  'Une tourelle frappe d’abord les sbires. Laissez la vague entrer avant vous.',
  'Le Ver des sables donne des dégâts permanents à toute l’équipe. Ne le laissez pas à l’ennemi.',
  'Maintenez la touche d’une compétence pour voir sa portée avant de la lancer.',
  'Châtiment inflige des dégâts bruts aux monstres : gardez‑le pour le dernier coup.',
  'Rentrer à la base au bon moment vaut mieux qu’une mort de plus.',
  'Le brouillard de guerre cache aussi le jungler ennemi. Méfiez‑vous des buissons silencieux.',
];
