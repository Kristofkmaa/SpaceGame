// ============ HUD en partie ============
class UI {
  constructor(app) {
    this.app = app; this.el = {};
    for (const id of ['hud', 'killsBlue', 'killsRed', 'clock', 'towersInfo', 'myStats', 'allyFrames', 'feed', 'announce', 'toasts', 'deathBanner', 'respawnIn', 'recallBar', 'recallFill',
      'statsCol', 'xpRing', 'heroPortrait', 'lvlBadge', 'abilityRow', 'hpFill', 'shieldFill', 'hpText', 'manaFill', 'manaText', 'items', 'gold', 'btnShop', 'btnRecall',
      'shop', 'shopStatus', 'shopGold', 'shopClose', 'shopHero', 'shopRec', 'shopT1', 'shopT2', 'shopDetail', 'scoreboard', 'tooltip']) this.el[id] = document.getElementById(id);
    this.slow = 0; this.selItem = null; this.portraits = {};
    this.el.btnShop.addEventListener('click', () => this.toggleShop());
    this.el.btnRecall.addEventListener('click', () => this.game && this.game.startRecall(this.game.player));
    this.el.shopClose.addEventListener('click', () => this.toggleShop(false));
    document.addEventListener('mouseover', e => { const b = e.target.closest('[data-tip]'); if (b) { this.el.tooltip.innerHTML = typeof b._tip === 'function' ? b._tip() : b.dataset.tip; this.el.tooltip.classList.remove('hidden'); } else this.el.tooltip.classList.add('hidden'); });
    document.addEventListener('mousemove', e => { const t = this.el.tooltip; if (t.classList.contains('hidden')) return; t.style.left = Math.min(e.clientX + 16, innerWidth - t.offsetWidth - 8) + 'px'; t.style.top = Math.max(8, e.clientY - t.offsetHeight - 14) + 'px'; });
  }
  get game() { return this.app.game; }
  keyLabel(id) { return this.app.keys.label(id); }
  portraitCanvas(id, size, team) {
    const key = id + size + team;
    if (!this.portraits[key]) { const c = document.createElement('canvas'); c.width = c.height = size; Art.portrait(c.getContext('2d'), id, size, size, { team }); this.portraits[key] = c; }
    const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(this.portraits[key], 0, 0); return c;
  }
  iconCanvas(id, size, kind, hero) { const c = document.createElement('canvas'); c.width = c.height = size; Art.icon(c.getContext('2d'), id, size, kind, hero); return c; }

  setGame() {
    const g = this.game, h = g.player;
    this.el.hud.classList.remove('hidden');
    for (const k of ['feed', 'announce', 'toasts']) this.el[k].innerHTML = '';
    Art.portrait(this.el.heroPortrait.getContext('2d'), h.heroId, 120, 120, { team: 0 });
    this.el.shopHero.textContent = h.def.name;
    this.buildAbilities(); this.buildAllyFrames(); this.buildShop(); this.toggleShop(false); this.showScore(false);
    this.update(0, true);
  }
  hide() { this.el.hud.classList.add('hidden'); this.toggleShop(false); }

  // ---------- Barre de compétences ----------
  abilityTip(slot) {
    const h = this.game.player, ab = ABILITIES[h.def.abilities[slot]], r = h.ranks[slot];
    const cur = Math.max(1, r);
    return `<b>${ab.name}</b> <span class="k">[${this.keyLabel('ab' + slot)}]</span>${ab.ult ? ' · Ultime' : ''}<br><span class="m">${ab.cost[cur - 1]} énergie</span> · délai ${ab.cd[cur - 1]} s · rang ${r}/${ab.cost.length}<br>${ab.desc()}` +
      (r === 0 ? `<br><span class="g">Ctrl + ${this.keyLabel('ab' + slot)} pour apprendre${ab.ult ? ' (niveau 6)' : ''}.</span>` : '');
  }
  buildAbilities() {
    const g = this.game, h = g.player, row = this.el.abilityRow;
    row.innerHTML = ''; this.abEls = [];
    h.def.abilities.forEach((id, slot) => {
      const d = document.createElement('div'); d.className = 'ab';
      d.appendChild(this.iconCanvas(id, 54, 'ability', h.heroId));
      d.insertAdjacentHTML('beforeend', `<div class="cd"></div><div class="cdT"></div><span class="key">${this.keyLabel('ab' + slot)}</span><span class="cost"></span><div class="pips">${'<i></i>'.repeat(ABILITIES[id].cost.length)}</div><button class="up hidden">+</button>`);
      d.dataset.tip = '1'; d._tip = () => this.abilityTip(slot);
      d.querySelector('.up').addEventListener('click', ev => { ev.stopPropagation(); g.levelUp(h, slot); });
      d.addEventListener('mousedown', ev => { if (ev.button === 0 && ev.ctrlKey) g.levelUp(h, slot); });
      row.appendChild(d); this.abEls.push(d);
    });
    const sep = document.createElement('div'); sep.className = 'sep'; row.appendChild(sep);
    h.spells.forEach((id, i) => {
      const d = document.createElement('div'); d.className = 'ab small';
      d.appendChild(this.iconCanvas(id, 42, 'spell'));
      d.insertAdjacentHTML('beforeend', `<div class="cd"></div><div class="cdT"></div><span class="key">${this.keyLabel('sp' + i)}</span>`);
      d.dataset.tip = '1'; d._tip = () => `<b>${SPELLS[id].name}</b> <span class="k">[${this.keyLabel('sp' + i)}]</span> · délai ${SPELLS[id].cd} s<br>${SPELLS[id].desc}`;
      row.appendChild(d); this.abEls.push(d);
    });
  }
  buildAllyFrames() {
    const g = this.game, box = this.el.allyFrames; box.innerHTML = ''; this.allyEls = [];
    for (const h of g.heroes.filter(x => x.team === 0 && !x.isPlayer)) {
      const d = document.createElement('div'); d.className = 'af';
      d.appendChild(this.portraitCanvas(h.heroId, 80, 0));
      d.insertAdjacentHTML('beforeend', `<div class="info"><div class="nm">${h.name}<span></span></div><div class="b"><div></div></div></div><div class="rs"></div>`);
      box.appendChild(d); this.allyEls.push({ h, d });
    }
  }

  // ---------- Mise à jour ----------
  update(dt, force) {
    const g = this.game; if (!g) return;
    const h = g.player, t = g.time;
    this.el.clock.textContent = Utils.formatTime(t);
    this.el.killsBlue.textContent = g.kills[0]; this.el.killsRed.textContent = g.kills[1];
    this.el.hpFill.style.width = (h.hp / h.maxHp * 100) + '%';
    const sh = h.shieldAmt(t);
    this.el.shieldFill.style.left = (h.hp / h.maxHp * 100) + '%'; this.el.shieldFill.style.width = Math.min(100 - h.hp / h.maxHp * 100, sh / h.maxHp * 100) + '%';
    this.el.hpText.textContent = `${Math.ceil(h.hp)} / ${Math.round(h.maxHp)}`;
    this.el.manaFill.style.width = (h.mana / h.maxMana * 100) + '%';
    this.el.manaText.textContent = `${Math.floor(h.mana)} / ${Math.round(h.maxMana)}`;
    this.el.gold.textContent = Math.floor(h.gold);
    // Compétences et sorts
    h.def.abilities.forEach((id, slot) => {
      const d = this.abEls[slot], ab = ABILITIES[id], r = h.ranks[slot];
      const total = r ? ab.cd[r - 1] * (1 - h.st.cdr) : 1, cd = h.cds[slot];
      d.classList.toggle('locked', r === 0);
      d.classList.toggle('nomana', r > 0 && cd <= 0 && h.mana < ab.cost[r - 1]);
      d.querySelector('.cd').style.background = cd > 0 ? `conic-gradient(transparent ${360 * (1 - cd / total)}deg, rgba(8,6,4,0.72) 0deg)` : 'none';
      d.querySelector('.cdT').textContent = cd > 0 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
      d.querySelector('.cost').textContent = r ? ab.cost[r - 1] : '';
      d.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < r));
      d.querySelector('.up').classList.toggle('hidden', !h.canLevel(slot) || h.dead && false);
    });
    h.spells.forEach((id, i) => {
      const d = this.abEls[4 + i], cd = h.spellCds[i];
      d.querySelector('.cd').style.background = cd > 0 ? `conic-gradient(transparent ${360 * (1 - cd / SPELLS[id].cd)}deg, rgba(8,6,4,0.72) 0deg)` : 'none';
      d.querySelector('.cdT').textContent = cd > 0 ? Math.ceil(cd) : '';
    });
    // Mort et retour
    this.el.deathBanner.classList.toggle('hidden', !h.dead);
    if (h.dead) this.el.respawnIn.textContent = Math.ceil(h.respawnAt - t);
    this.el.recallBar.classList.toggle('hidden', !h.recall);
    if (h.recall) this.el.recallFill.style.width = ((t - h.recall.start) / CONFIG.RECALL_TIME * 100) + '%';
    this.slow -= dt;
    if (this.slow > 0 && !force) return;
    this.slow = 0.25;
    this.el.lvlBadge.textContent = h.level;
    const xpk = h.level >= CONFIG.MAX_LEVEL ? 1 : h.xp / xpToNext(h.level);
    this.el.xpRing.style.background = `conic-gradient(var(--gold) ${xpk * 360}deg, #3a2c1e 0deg)`;
    const st = h.st;
    this.el.statsCol.innerHTML = [['Attaque', Math.round(st.ad)], ['Puissance', Math.round(st.ap)], ['Blindage', Math.round(st.armor)], ['Isolation', Math.round(st.resist)], ['Cadence', st.as.toFixed(2)], ['Vitesse', Math.round(st.ms * h.msMult(t))]].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
    this.el.myStats.innerHTML = `<b>${h.k} / ${h.d} / ${h.a}</b>Sbires <b>${h.cs}</b>`;
    const down = g.towersDown;
    this.el.towersInfo.textContent = `Tourelles ${2 - down[0]} – ${2 - down[1]}`;
    this.renderItems(this.el.items, h.items, true);
    for (const { h: a, d } of this.allyEls) {
      d.classList.toggle('dead', a.dead);
      d.querySelector('.nm span').textContent = 'Niv. ' + a.level;
      d.querySelector('.b > div').style.width = (a.dead ? 0 : a.hp / a.maxHp * 100) + '%';
      d.querySelector('.rs').textContent = a.dead ? Math.ceil(a.respawnAt - t) : '';
    }
    if (this.shopOpen()) this.refreshShop();
    if (!this.el.scoreboard.classList.contains('hidden')) this.renderScore();
  }
  renderItems(box, items, tips) {
    const sig = items.join(',');
    if (box._sig === sig) return;
    box._sig = sig; box.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('div'); s.className = 'slot';
      if (items[i]) { s.appendChild(this.iconCanvas(items[i], 38, 'item')); if (tips) { s.dataset.tip = '1'; s._tip = () => this.itemTip(items[i]); } }
      box.appendChild(s);
    }
  }
  itemTip(id) { const it = ITEMS[id]; return `<b>${it.name}</b> <span class="k">${it.cost} or</span><br>` + Object.entries(it.stats).map(([k, v]) => `<span class="g">${STAT_LABELS[k][1](v)}</span> ${STAT_LABELS[k][0]}`).join('<br>'); }

  // ---------- Messages ----------
  toast(text, cls = '') {
    const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = text;
    this.el.toasts.appendChild(d); while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 3000);
  }
  announce(title, sub, cls = 'info') {
    this.el.announce.innerHTML = `<div class="a ${cls}"><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
    this.app.audio.play(cls === 'bad' ? 'announceBad' : 'announceGood');
  }
  feed(killer, victim, assists) {
    const d = document.createElement('div'); d.className = 'kill';
    const pc = (h) => { const c = this.portraitCanvas(h.heroId, 60, h.team); c.className = h.team === 0 ? 'k-blue' : 'k-red'; return c; };
    if (killer) d.appendChild(pc(killer)); else d.insertAdjacentHTML('beforeend', '<span class="txt">Exécuté</span>');
    d.insertAdjacentHTML('beforeend', `<span class="arrow">▶</span>`);
    d.appendChild(pc(victim));
    if (assists && assists.length) d.insertAdjacentHTML('beforeend', `<span class="txt">+${assists.length}</span>`);
    this.el.feed.appendChild(d); while (this.el.feed.children.length > 5) this.el.feed.firstChild.remove();
    setTimeout(() => d.remove(), 8000);
  }

  // ---------- Boutique ----------
  shopOpen() { return !this.el.shop.classList.contains('hidden'); }
  toggleShop(force) {
    const open = force !== undefined ? force : !this.shopOpen();
    this.el.shop.classList.toggle('hidden', !open);
    if (open) { this.refreshShop(true); this.app.audio.play('click'); }
  }
  buildShop() {
    const h = this.game.player;
    const mk = (box, ids) => { box.innerHTML = ''; for (const id of ids) { const d = document.createElement('div'); d.className = 'si'; d.dataset.id = id; d.appendChild(this.iconCanvas(id, 56, 'item')); d.insertAdjacentHTML('beforeend', `<div class="c">${ITEMS[id].cost}</div>`); d.dataset.tip = '1'; d._tip = () => this.itemTip(id); d.addEventListener('click', () => { this.selItem = id; this.refreshShop(true); }); d.addEventListener('dblclick', () => this.game.buy(h, id)); d.addEventListener('contextmenu', e => { e.preventDefault(); this.game.buy(h, id); }); box.appendChild(d); } };
    mk(this.el.shopRec, [...new Set(h.def.build)]);
    mk(this.el.shopT1, Object.keys(ITEMS).filter(k => ITEMS[k].tier === 1));
    mk(this.el.shopT2, Object.keys(ITEMS).filter(k => ITEMS[k].tier === 2));
    this.selItem = h.def.build[0];
  }
  refreshShop(force) {
    const g = this.game, h = g.player, can = g.canShop(h);
    this.el.shopGold.textContent = Math.floor(h.gold);
    this.el.shopStatus.textContent = can ? (h.dead ? 'À terre : vous pouvez acheter' : 'À la base : achats possibles') : 'Rejoignez votre base pour acheter (' + this.keyLabel('recall') + ')';
    this.el.shopStatus.classList.toggle('no', !can);
    for (const d of this.el.shop.querySelectorAll('.si')) { d.classList.toggle('sel', d.dataset.id === this.selItem); d.classList.toggle('poor', ITEMS[d.dataset.id].cost > h.gold); }
    const sig = this.selItem + '|' + h.items.join(',') + '|' + can + '|' + Math.floor(h.gold / 50);
    if (sig === this._shopSig && !force) return;
    this._shopSig = sig;
    const it = ITEMS[this.selItem], box = this.el.shopDetail; box.innerHTML = '';
    box.appendChild(this.iconCanvas(this.selItem, 72, 'item'));
    box.insertAdjacentHTML('beforeend', `<div class="nm">${it.name}</div><div class="st">${Object.entries(it.stats).map(([k, v]) => `<div><span>${STAT_LABELS[k][0]}</span><b>${STAT_LABELS[k][1](v)}</b></div>`).join('')}</div>`);
    const b = document.createElement('a'); b.className = 'btn primary' + (can && h.gold >= it.cost && h.items.length < 6 ? '' : ' off'); b.textContent = `Acheter · ${it.cost}`;
    b.addEventListener('click', () => { g.buy(h, this.selItem); this.refreshShop(true); });
    box.appendChild(b);
    box.insertAdjacentHTML('beforeend', `<div class="own">Inventaire (${h.items.length}/6) · clic pour revendre à 60 %</div>`);
    const own = document.createElement('div'); own.className = 'ownRow';
    h.items.forEach((id, i) => { const s = document.createElement('div'); s.className = 'slot'; s.appendChild(this.iconCanvas(id, 38, 'item')); s.dataset.tip = '1'; s._tip = () => this.itemTip(id) + `<br><span class="k">Revendre : ${Math.round(ITEMS[id].cost * 0.6)} or</span>`; s.addEventListener('click', () => { g.sell(h, i); this.refreshShop(true); }); own.appendChild(s); });
    box.appendChild(own);
  }

  // ---------- Tableau des scores ----------
  showScore(on) { this.el.scoreboard.classList.toggle('hidden', !on); if (on) this.renderScore(); }
  scoreTable(heroes, withTeam = true) {
    const g = this.game;
    let html = '<table><tr><th></th><th>Héros</th><th>Niv.</th><th>É / M / A</th><th>Sbires</th><th>Objets</th></tr>';
    for (const team of [0, 1]) {
      if (withTeam) html += `<tr><td colspan="6" class="team ${team ? 'red' : 'blue'}">${TEAM_INFO[team].name} · ${g.kills[team]}</td></tr>`;
      for (const h of heroes.filter(x => x.team === team)) html += `<tr class="${h.isPlayer ? 'me' : ''}" data-h="${h.id}"><td class="p"></td><td>${h.name}${h.isPlayer ? ' (vous)' : ''}</td><td>${h.level}</td><td>${h.k} / ${h.d} / ${h.a}</td><td>${h.cs}</td><td class="it"></td></tr>`;
    }
    return html + '</table>';
  }
  fillScore(box) {
    const g = this.game;
    for (const tr of box.querySelectorAll('tr[data-h]')) {
      const h = g.heroes.find(x => x.id === +tr.dataset.h);
      tr.querySelector('.p').appendChild(this.portraitCanvas(h.heroId, 64, h.team));
      const it = document.createElement('div'); it.className = 'mini-items'; for (const id of h.items) it.appendChild(this.iconCanvas(id, 22, 'item'));
      tr.querySelector('.it').appendChild(it);
    }
  }
  renderScore() { const box = this.el.scoreboard; box.innerHTML = this.scoreTable(this.game.heroes); this.fillScore(box); }
}
