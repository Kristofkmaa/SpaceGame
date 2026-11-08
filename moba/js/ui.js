// ============ HUD : barre principale, boutique à recettes, tableau des scores ============
function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const ROLE_GLYPH = { top: '▲', jungle: '✦', mid: '◆', adc: '➶', support: '✚' };
class UI {
  constructor(app) {
    this.app = app; this.el = {};
    for (const id of ['hud', 'killsBlue', 'killsRed', 'kda', 'cs', 'clock', 'feed', 'objectives', 'allyFrames', 'announce', 'toasts', 'deathBanner', 'respawnIn', 'deathBy',
      'statPanel', 'xpRing', 'heroPortrait', 'lvlBadge', 'buffRow', 'abilityRow', 'hpFill', 'shieldFill', 'hpText', 'manaFill', 'manaText', 'spellBox', 'items', 'gold', 'btnShop', 'btnRecall', 'shop', 'scoreboard', 'tooltip', 'recallBar', 'recallFill', 'gameCanvas', 'netInfo']) this.el[id] = document.getElementById(id);
    this.slow = 0; this.shopCat = 'rec'; this.selItem = null;
    this.el.btnShop.addEventListener('click', () => this.toggleShop());
    this.el.btnRecall.addEventListener('click', () => this.app.act('recall'));
    document.addEventListener('mouseover', e => { const b = e.target.closest('[data-tip]'); if (b) { this.el.tooltip.innerHTML = typeof b._tip === 'function' ? b._tip() : b.dataset.tip; this.el.tooltip.classList.remove('hidden'); } else this.el.tooltip.classList.add('hidden'); });
    document.addEventListener('mousemove', e => { const t = this.el.tooltip; if (t.classList.contains('hidden')) return; t.style.left = Math.min(e.clientX + 18, innerWidth - t.offsetWidth - 10) + 'px'; t.style.top = Math.max(10, e.clientY - t.offsetHeight - 16) + 'px'; });
  }
  get game() { return this.app.game; }
  get studio() { return this.app.studio; }
  keyLabel(id) { return this.app.keys.label(id); }
  portrait(id, size, team = 0) { const src = this.studio.portrait(id, 128, team), c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(src, 0, 0, size, size); return c; }

  setGame() {
    const g = this.game, h = g.player;
    this.el.hud.classList.remove('hidden');
    for (const k of ['feed', 'announce', 'toasts']) this.el[k].innerHTML = '';
    const pc = this.el.heroPortrait.getContext('2d'); pc.clearRect(0, 0, 128, 128); pc.drawImage(this.studio.portrait(h.heroId, 128, h.team), 0, 0);
    this.portraits = {}; for (const id in HEROES) this.portraits[id] = this.studio.portrait(id, 128, 0);
    this.buildAbilities(); this.buildAllyFrames(); this.buildObjectives(); this.toggleShop(false); this.showScore(false);
    this.el.btnRecall.innerHTML = ''; this.el.btnRecall.appendChild(Icons.get('recall', 30, 'spell')); this.el.btnRecall.dataset.tip = `<b>Retour à la base</b> <span class="k">[${this.keyLabel('recall')}]</span><br>6 s, interrompu par les dégâts.`;
    this.el.btnShop.dataset.tip = `<b>Boutique</b> <span class="k">[${this.keyLabel('shop')}]</span><br>Achats à la base ou à terre.`;
    this.update(0, true);
  }
  hide() { this.el.hud.classList.add('hidden'); this.toggleShop(false); this.el.gameCanvas.style.filter = ''; }

  // ---------- Compétences ----------
  abilityTip(slot) {
    const h = this.game.player, ab = ABILITIES[h.def.abilities[slot]], r = h.ranks[slot], cur = Math.max(1, r);
    return `<b>${ab.name}</b> <span class="k">[${this.keyLabel('ab' + slot)}]</span>${ab.ult ? ' <span class="u">Ultime</span>' : ''}<br><span class="m">${ab.cost[cur - 1]} énergie</span> · <span class="c">${ab.cd[cur - 1]} s</span> · rang ${r}/${ab.cost.length}<div class="d">${ab.desc()}</div>` + (r === 0 ? `<span class="g">Ctrl + ${this.keyLabel('ab' + slot)} pour l’apprendre${ab.ult ? ' (niveau 6)' : ''}</span>` : '');
  }
  buildAbilities() {
    const g = this.game, h = g.player, row = this.el.abilityRow; row.innerHTML = ''; this.abEls = [];
    const P = PASSIVES[h.def.passive], pd = document.createElement('div'); pd.className = 'ab pas';
    pd.appendChild(Icons.get(h.def.passive, 96, 'ability', h.heroId)); pd.insertAdjacentHTML('beforeend', '<span class="cnt"></span><span class="tag">Passif</span>');
    pd.dataset.tip = '1'; pd._tip = () => `<b>${P.name}</b> <span class="u">Passif</span><div class="d">${P.desc()}</div>`;
    row.appendChild(pd); this.pasEl = pd;
    h.def.abilities.forEach((id, slot) => {
      const d = document.createElement('div'); d.className = 'ab' + (slot === 3 ? ' ult' : '');
      d.appendChild(Icons.get(id, 120, 'ability', h.heroId));
      d.insertAdjacentHTML('beforeend', `<div class="cd"></div><div class="cdT"></div><span class="key">${this.keyLabel('ab' + slot)}</span><span class="cost"></span><div class="pips">${'<i></i>'.repeat(ABILITIES[id].cost.length)}</div><button class="up hidden" tabindex="-1">+</button>`);
      d.dataset.tip = '1'; d._tip = () => this.abilityTip(slot);
      d.querySelector('.up').addEventListener('mousedown', ev => { ev.stopPropagation(); this.app.act('level', slot); });
      row.appendChild(d); this.abEls.push(d);
    });
    const sb = this.el.spellBox; sb.innerHTML = '';
    h.spells.forEach((id, i) => {
      const d = document.createElement('div'); d.className = 'ab sp';
      d.appendChild(Icons.get(id, 96, 'spell'));
      d.insertAdjacentHTML('beforeend', `<div class="cd"></div><div class="cdT"></div><span class="key">${this.keyLabel('sp' + i)}</span>`);
      d.dataset.tip = '1'; d._tip = () => `<b>${SPELLS[id].name}</b> <span class="k">[${this.keyLabel('sp' + i)}]</span> · <span class="c">${SPELLS[id].cd} s</span><div class="d">${SPELLS[id].desc}</div>`;
      sb.appendChild(d); this.abEls.push(d);
    });
  }
  buildAllyFrames() {
    const g = this.game, box = this.el.allyFrames; box.innerHTML = ''; this.allyEls = [];
    for (const a of g.heroes.filter(x => x.team === g.player.team && !x.isPlayer)) {
      const d = document.createElement('div'); d.className = 'af';
      const pw = document.createElement('div'); pw.className = 'pw'; pw.appendChild(this.portrait(a.heroId, 46, a.team)); pw.insertAdjacentHTML('beforeend', '<span class="lv"></span><span class="rs"></span><i class="ult"></i>'); d.appendChild(pw);
      d.insertAdjacentHTML('beforeend', `<div class="info"><div class="nm">${a.nick ? `<em>${esc(a.nick)}</em>` : a.name}<span>${ROLE_GLYPH[a.role]} ${ROLES[a.role].label}</span></div><div class="b"><div class="hp"></div></div><div class="b m"><div class="mp"></div></div></div>`);
      d.dataset.tip = '1'; d._tip = () => `<b>${a.nick ? esc(a.nick) + ' · ' : ''}${a.name}</b> · ${ROLES[a.role].label}<br>Niveau ${a.level} · ${a.k}/${a.d}/${a.a} · ${a.cs} sbires`;
      box.appendChild(d); this.allyEls.push({ a, d });
    }
  }
  buildObjectives() {
    const box = this.el.objectives; box.innerHTML = '';
    this.objEls = this.game.camps.filter(c => c.epic).map(c => { const d = document.createElement('div'); d.className = 'obj'; d.innerHTML = `<span class="ic ${c.id}"></span><span class="nm">${c.name}</span><b></b>`; box.appendChild(d); return { c, d }; });
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
    this.el.manaFill.style.width = (h.mana / h.maxMana * 100) + '%'; this.el.manaText.textContent = `${Math.floor(h.mana)} / ${Math.round(h.maxMana)}`;
    this.el.gold.textContent = Math.floor(h.gold);
    const P = PASSIVES[h.def.passive], sil = h.silenced(t), free = h.pas.free > t;
    if (this.pasEl) { this.pasEl.querySelector('.cnt').textContent = P.counter ? P.counter(h) : ''; this.pasEl.classList.toggle('ready', !!(P.ready && P.ready(h))); }
    h.def.abilities.forEach((id, slot) => {
      const d = this.abEls[slot], ab = ABILITIES[id], r = h.ranks[slot], total = r ? ab.cd[r - 1] * (1 - h.st.cdr) : 1, cd = h.cds[slot], cost = r ? (free ? 0 : ab.cost[r - 1]) : 0;
      d.classList.toggle('locked', r === 0); d.classList.toggle('nomana', r > 0 && cd <= 0 && h.mana < cost);
      d.classList.toggle('ready', r > 0 && cd <= 0 && h.mana >= cost && !sil); d.classList.toggle('silenced', sil);
      d.classList.toggle('aiming', !!(this.app.input.aiming && this.app.input.aiming.slot === slot));
      d.querySelector('.cd').style.background = cd > 0 ? `conic-gradient(transparent ${360 * (1 - cd / total)}deg, rgba(6,4,2,0.74) 0deg)` : 'none';
      d.querySelector('.cdT').textContent = cd > 0 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
      d.querySelector('.cost').textContent = r ? cost : '';
      d.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < r));
      d.querySelector('.up').classList.toggle('hidden', !h.canLevel(slot));
    });
    h.spells.forEach((id, i) => { const d = this.abEls[4 + i], cd = h.spellCds[i]; d.querySelector('.cd').style.background = cd > 0 ? `conic-gradient(transparent ${360 * (1 - cd / SPELLS[id].cd)}deg, rgba(6,4,2,0.74) 0deg)` : 'none'; d.querySelector('.cdT').textContent = cd > 0 ? Math.ceil(cd) : ''; });
    this.el.deathBanner.classList.toggle('hidden', !h.dead);
    this.el.gameCanvas.style.filter = h.dead ? 'grayscale(0.9) brightness(0.75)' : '';
    if (h.dead) this.el.respawnIn.textContent = Math.ceil(h.respawnAt - t);
    this.el.recallBar.classList.toggle('hidden', !h.recall);
    if (h.recall) this.el.recallFill.style.width = ((t - h.recall.start) / CONFIG.RECALL_TIME * 100) + '%';
    this.slow -= dt; if (this.slow > 0 && !force) return; this.slow = 0.25;
    this.el.lvlBadge.textContent = h.level;
    const xpk = h.level >= CONFIG.MAX_LEVEL ? 1 : h.xp / xpToNext(h.level);
    this.el.xpRing.style.background = `conic-gradient(#9a6ae8 ${xpk * 360}deg, #241a2c 0deg)`;
    const st = h.st;
    this.el.statPanel.innerHTML = [['atk', 'Attaque', Math.round(st.ad)], ['ap', 'Puissance', Math.round(st.ap)], ['arm', 'Blindage', Math.round(st.armor)], ['res', 'Isolation', Math.round(st.resist)], ['as', 'Cadence', st.as.toFixed(2)], ['cdr', 'Délais', Math.round(st.cdr * 100) + '%'], ['crit', 'Critique', Math.round(st.crit * 100) + '%'], ['ms', 'Vitesse', Math.round(st.ms * h.msMult(t))]].map(([c, k, v]) => `<div class="s ${c}" data-tip="<b>${k}</b>"><i></i><b>${v}</b></div>`).join('');
    this.el.kda.textContent = `${h.k} / ${h.d} / ${h.a}`; this.el.cs.textContent = h.cs;
    this.el.buffRow.innerHTML = h.buffs.filter(b => b.dur >= 3).map(b => `<div class="bf ${b.id}" data-tip="<b>${BUFFS[b.id] ? BUFFS[b.id].name : b.id}</b>${BUFFS[b.id] ? '<br>' + BUFFS[b.id].desc : ''}"><span>${Math.ceil(b.until - t)}</span></div>`).join('') + (g.dragons[h.team] ? `<div class="bf worm" data-tip="<b>Écailles du ver</b><br>+${g.dragons[h.team] * 6} % de dégâts"><span>×${g.dragons[h.team]}</span></div>` : '');
    this.el.netInfo.classList.toggle('hidden', !this.app.online());
    if (g.remote) { const ms = Math.round(g.remote.rtt); this.el.netInfo.innerHTML = `<i class="${ms > 250 ? 'bad' : ms > 120 ? 'mid' : ''}"></i>En ligne · ${ms ? ms + ' ms' : '…'}`; }
    else if (g.net) this.el.netInfo.innerHTML = `<i></i>Hôte · ${g.heroes.filter(x => x.human).length} joueur${g.heroes.filter(x => x.human).length > 1 ? 's' : ''}`;
    this.renderItems();
    for (const { a, d } of this.allyEls) {
      d.classList.toggle('dead', a.dead);
      d.querySelector('.lv').textContent = a.level; d.querySelector('.rs').textContent = a.dead ? Math.ceil(a.respawnAt - t) : '';
      d.querySelector('.hp').style.width = (a.dead ? 0 : a.hp / a.maxHp * 100) + '%'; d.querySelector('.mp').style.width = (a.dead ? 0 : a.mana / a.maxMana * 100) + '%';
      d.querySelector('.ult').classList.toggle('on', a.ranks[3] > 0 && a.cds[3] <= 0);
    }
    for (const { c, d } of this.objEls) { const alive = c.alive.length > 0; d.classList.toggle('alive', alive); d.querySelector('b').textContent = alive ? 'Présent' : Utils.formatTime(c.respawnAt - t); }
    if (this.shopOpen()) this.refreshShop();
    if (!this.el.scoreboard.classList.contains('hidden')) this.renderScore();
  }
  renderItems() {
    const h = this.game.player, box = this.el.items, sig = h.items.map(s => s.id + (s.n || '')).join(',');
    if (box._sig === sig) return; box._sig = sig; box.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('div'); s.className = 'slot'; const it = h.items[i];
      s.insertAdjacentHTML('beforeend', `<span class="k">${i + 1}</span>`);
      if (it) { s.appendChild(Icons.get(it.id, 80, 'item')); if (it.n) s.insertAdjacentHTML('beforeend', `<span class="n">${it.n}</span>`); s.dataset.tip = '1'; s._tip = () => this.itemTip(it.id); s.addEventListener('mousedown', e => { if (e.button === 0) this.app.act('item', i); }); }
      box.appendChild(s);
    }
  }
  itemTip(id) {
    const it = ITEMS[id], g = this.game, price = g ? g.priceFor(g.player, id).price : it.cost;
    return `<b>${it.name}</b> <span class="k">${it.consumable ? it.recipe : price} or</span>${!it.consumable && price !== it.cost ? ` <span class="dim">(${it.cost})</span>` : ''}<br>` + Object.entries(it.stats).map(([k, v]) => `<span class="g">${STAT_LABELS[k][1](v)}</span> ${STAT_LABELS[k][0]}`).join('<br>') + (it.passive ? `<div class="d">${it.passive}</div>` : '') + (it.desc ? `<div class="d">${it.desc}</div>` : '');
  }

  // ---------- Messages ----------
  toast(text, cls = '') { for (const c of this.el.toasts.children) if (c.textContent === text) return; const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = text; this.el.toasts.appendChild(d); while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove(); setTimeout(() => d.remove(), 3000); }
  announce(title, sub, cls = 'info') { this.el.announce.innerHTML = `<div class="a ${cls}"><div class="orn"></div><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; this.app.audio.play(cls === 'bad' ? 'announceBad' : 'announceGood'); }
  feed(killer, victim, assists) {
    const d = document.createElement('div'); d.className = 'kill';
    const pc = h => { const w = document.createElement('span'); w.className = 'pk ' + (h.team === 0 ? 'b' : 'r'); w.appendChild(this.portrait(h.heroId, 34, h.team)); return w; };
    if (killer) d.appendChild(pc(killer)); else d.insertAdjacentHTML('beforeend', '<span class="txt">Exécuté</span>');
    d.insertAdjacentHTML('beforeend', `<span class="sw ${killer && killer.team === 0 ? 'b' : 'r'}"></span>`);
    d.appendChild(pc(victim));
    if (assists && assists.length) d.insertAdjacentHTML('beforeend', `<span class="txt">+${assists.length}</span>`);
    this.el.feed.appendChild(d); while (this.el.feed.children.length > 5) this.el.feed.firstChild.remove();
    setTimeout(() => d.remove(), 9000);
  }

  // ---------- Boutique ----------
  shopOpen() { return !this.el.shop.classList.contains('hidden'); }
  toggleShop(force) {
    const open = force !== undefined ? force : !this.shopOpen();
    this.el.shop.classList.toggle('hidden', !open);
    if (open) { if (!this.el.shop.dataset.built) this.buildShop(); if (!this.selItem) this.selItem = this.recommended()[0]; this.renderShopGrid(); this.refreshShop(true); this.app.audio.play('click'); }
  }
  recommended() { const h = this.game.player, out = []; for (const id of h.def.build) { if (!out.includes(id)) out.push(id); } if (!out.includes('potion')) out.push('potion'); return out; }
  buildShop() {
    const s = this.el.shop; s.dataset.built = '1';
    s.innerHTML = `<div class="shHead"><div class="ttl">Comptoir de Gros‑Louis<small>Pièces, armes et blindages de récupération</small></div><div id="shStatus"></div><div class="gold"><span class="coin"></span><b id="shGold">0</b></div><button class="x" id="shClose">✕</button></div>
      <div class="shBody"><nav id="shCats"></nav><div class="shGrid" id="shGrid"></div><div class="shDetail" id="shDetail"></div></div>
      <div class="shFoot"><span class="lbl">Inventaire</span><div id="shInv"></div><span class="hint">Clic droit sur un objet de la boutique : achat rapide · clic sur un objet de l’inventaire : sélection</span></div>`;
    document.getElementById('shClose').addEventListener('click', () => this.toggleShop(false));
    const cats = document.getElementById('shCats');
    for (const [k, label] of [['rec', 'Recommandés'], ...Object.entries(ITEM_CATS)]) {
      const a = document.createElement('a'); a.textContent = label; a.dataset.c = k; a.addEventListener('click', () => { this.shopCat = k; this.renderShopGrid(); }); cats.appendChild(a);
    }
  }
  itemCell(id) {
    const d = document.createElement('div'); d.className = 'si'; d.dataset.id = id;
    d.appendChild(Icons.get(id, 96, 'item')); d.insertAdjacentHTML('beforeend', '<span class="c"></span>');
    d.dataset.tip = '1'; d._tip = () => this.itemTip(id);
    d.addEventListener('click', () => { this.selItem = id; this.refreshShop(true); });
    d.addEventListener('contextmenu', e => { e.preventDefault(); this.app.act('buy', id); this.refreshShop(true); });
    return d;
  }
  renderShopGrid() {
    const grid = document.getElementById('shGrid'); grid.innerHTML = '';
    document.querySelectorAll('#shCats a').forEach(a => a.classList.toggle('on', a.dataset.c === this.shopCat));
    if (this.shopCat === 'rec') {
      grid.insertAdjacentHTML('beforeend', `<div class="sec">Build conseillé pour ${this.game.player.name}</div>`);
      const row = document.createElement('div'); row.className = 'row build'; this.recommended().forEach((id, i) => { if (i) row.insertAdjacentHTML('beforeend', '<span class="arrow">›</span>'); row.appendChild(this.itemCell(id)); }); grid.appendChild(row);
      return;
    }
    const ids = Object.keys(ITEMS).filter(id => this.shopCat === 'all' || ITEMS[id].cat === this.shopCat);
    for (const [tier, label] of [[3, 'Légendaires'], [2, 'Intermédiaires'], [1, 'Composants'], [0, 'Consommables']]) {
      const list = ids.filter(id => ITEMS[id].tier === tier).sort((a, b) => ITEMS[a].cost - ITEMS[b].cost); if (!list.length) continue;
      grid.insertAdjacentHTML('beforeend', `<div class="sec">${label}</div>`);
      const row = document.createElement('div'); row.className = 'row'; for (const id of list) row.appendChild(this.itemCell(id)); grid.appendChild(row);
    }
  }
  ownedPaths(id) {
    const h = this.game.player, used = new Set(), owned = new Set();
    const rec = (iid, path, top) => {
      if (!top) { const idx = h.items.findIndex((s, i) => s.id === iid && !used.has(i)); if (idx >= 0) { used.add(idx); owned.add(path); return; } }
      (ITEMS[iid].from || []).forEach((c, i) => rec(c, path + '.' + i, false));
    };
    rec(id, 'r', true); return owned;
  }
  treeNode(id, path, owned) {
    const n = document.createElement('div'); n.className = 'tn';
    const head = document.createElement('div'); head.className = 'ti' + (owned.has(path) ? ' own' : ''); head.appendChild(Icons.get(id, 64, 'item'));
    head.insertAdjacentHTML('beforeend', `<span>${owned.has(path) ? '✓' : ITEMS[id].recipe && ITEMS[id].from ? '+' + ITEMS[id].recipe : ITEMS[id].cost}</span>`);
    head.dataset.tip = '1'; head._tip = () => this.itemTip(id); head.addEventListener('click', () => { this.selItem = id; this.refreshShop(true); });
    n.appendChild(head);
    const from = ITEMS[id].from;
    if (from && !owned.has(path)) { const ch = document.createElement('div'); ch.className = 'tc'; from.forEach((c, i) => ch.appendChild(this.treeNode(c, path + '.' + i, owned))); n.appendChild(ch); }
    return n;
  }
  refreshShop(force) {
    const g = this.game, h = g.player, can = g.canShop(h);
    document.getElementById('shGold').textContent = Math.floor(h.gold);
    const st = document.getElementById('shStatus'); st.textContent = can ? (h.dead ? 'À terre : achats possibles' : 'À la base : achats possibles') : `Hors de la base : rentrez avec ${this.keyLabel('recall')} pour acheter`; st.className = can ? 'ok' : 'no';
    for (const d of this.el.shop.querySelectorAll('.si')) {
      const id = d.dataset.id, it = ITEMS[id], p = it.consumable ? it.recipe : g.priceFor(h, id).price;
      d.querySelector('.c').textContent = p; d.classList.toggle('poor', p > h.gold); d.classList.toggle('sel', id === this.selItem);
      d.classList.toggle('owned', h.items.some(s => s.id === id));
    }
    const sig = this.selItem + '|' + h.items.map(s => s.id + (s.n || '')).join(',') + '|' + can + '|' + Math.floor(h.gold / 25);
    if (sig === this._sig && !force) return; this._sig = sig;
    const id = this.selItem, it = ITEMS[id], box = document.getElementById('shDetail'), price = it.consumable ? it.recipe : g.priceFor(h, id).price;
    box.innerHTML = '';
    const top = document.createElement('div'); top.className = 'dtop'; top.appendChild(Icons.get(id, 96, 'item'));
    top.insertAdjacentHTML('beforeend', `<div><div class="nm">${it.name}</div><div class="pr"><span class="coin"></span>${price}${price !== it.cost && !it.consumable ? ` <s>${it.cost}</s>` : ''}</div><div class="tier">${['Consommable', 'Composant', 'Intermédiaire', 'Légendaire'][it.tier]}</div></div>`);
    box.appendChild(top);
    box.insertAdjacentHTML('beforeend', `<div class="st">${Object.entries(it.stats).map(([k, v]) => `<div><span>${STAT_LABELS[k][0]}</span><b>${STAT_LABELS[k][1](v)}</b></div>`).join('')}</div>${it.passive ? `<p class="pas"><b>Passif :</b> ${it.passive}</p>` : ''}${it.desc ? `<p class="pas">${it.desc}</p>` : ''}`);
    if (it.from) { box.insertAdjacentHTML('beforeend', '<div class="lbl">Fabrication</div>'); const tree = document.createElement('div'); tree.className = 'tree'; tree.appendChild(this.treeNode(id, 'r', this.ownedPaths(id))); box.appendChild(tree); }
    if (it.into.length) { box.insertAdjacentHTML('beforeend', '<div class="lbl">Sert à fabriquer</div>'); const r = document.createElement('div'); r.className = 'into'; for (const p of it.into) { const c = Icons.get(p, 56, 'item'); c.dataset.tip = '1'; c._tip = () => this.itemTip(p); c.addEventListener('click', () => { this.selItem = p; this.refreshShop(true); }); r.appendChild(c); } box.appendChild(r); }
    const b = document.createElement('a'); b.className = 'btn primary buy' + (can && h.gold >= price ? '' : ' off'); b.innerHTML = `Acheter <span class="coin"></span>${price}`;
    b.addEventListener('click', () => { this.app.act('buy', id); this.refreshShop(true); }); box.appendChild(b);
    const inv = document.getElementById('shInv'); inv.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('div'); s.className = 'slot'; const x = h.items[i];
      if (x) { s.appendChild(Icons.get(x.id, 80, 'item')); if (x.n) s.insertAdjacentHTML('beforeend', `<span class="n">${x.n}</span>`); s.dataset.tip = '1'; s._tip = () => this.itemTip(x.id) + `<br><span class="k">Clic droit : revendre ${Math.round(ITEMS[x.id].consumable ? ITEMS[x.id].recipe * 0.5 * x.n : ITEMS[x.id].cost * 0.7)} or</span>`; s.addEventListener('click', () => { this.selItem = x.id; this.refreshShop(true); }); s.addEventListener('contextmenu', e => { e.preventDefault(); this.app.act('sell', i); this.refreshShop(true); }); }
      inv.appendChild(s);
    }
  }

  // ---------- Tableau des scores ----------
  showScore(on) { this.el.scoreboard.classList.toggle('hidden', !on); if (on) this.renderScore(); }
  scoreTable(heroes) {
    const g = this.game;
    let html = '';
    for (const team of [0, 1]) {
      const list = heroes.filter(x => x.team === team);
      html += `<div class="sbTeam ${team ? 'red' : 'blue'}"><div class="sbHead"><span>${TEAM_INFO[team].name}</span><b>${g.kills[team]}</b><small>${g.towersDown[1 - team]} tourelles · ${g.dragons[team]} ver${g.dragons[team] > 1 ? 's' : ''}</small></div><table><tr><th></th><th>Héros</th><th>Poste</th><th>Niv.</th><th>É / M / A</th><th>Sbires</th><th>Objets</th></tr>`;
      for (const h of list) html += `<tr class="${h.isPlayer ? 'me' : ''}" data-h="${h.id}"><td class="p"></td><td>${h.name}${h.isPlayer ? ' <em>(vous)</em>' : h.nick ? ` <em class="nick">${esc(h.nick)}</em>` : ''}</td><td>${ROLE_GLYPH[h.role]} ${ROLES[h.role].label}</td><td>${h.level}</td><td>${h.k} / ${h.d} / ${h.a}</td><td>${h.cs}</td><td class="it"></td></tr>`;
      html += '</table></div>';
    }
    return html;
  }
  fillScore(box) {
    const g = this.game;
    for (const tr of box.querySelectorAll('tr[data-h]')) {
      const h = g.heroes.find(x => x.id === +tr.dataset.h);
      const p = this.portrait(h.heroId, 36, h.team); if (h.dead) p.style.filter = 'grayscale(1)'; tr.querySelector('.p').appendChild(p);
      const it = document.createElement('div'); it.className = 'mini'; for (const s of h.items) it.appendChild(Icons.get(s.id, 48, 'item')); tr.querySelector('.it').appendChild(it);
    }
  }
  renderScore() { const box = this.el.scoreboard; box.innerHTML = this.scoreTable(this.game.heroes); this.fillScore(box); }
}
