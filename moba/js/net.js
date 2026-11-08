// ============ Multijoueur ============
// Architecture : l'hôte fait tourner la vraie simulation. Les autres joueurs envoient
// leurs ordres (clic droit, compétences, achats) et reçoivent dix fois par seconde
// un instantané compact de la partie, qu'ils affichent avec un léger différé pour
// interpoler les mouvements.
//
// Deux transports, même interface :
//  - le salon temps réel d'une page Claude (capacité « room ») ;
//  - le serveur fourni (node server.js), par WebSocket.
const NET = {
  TICK: 0.1,           // instantanés par seconde de jeu : 10
  DETAIL_EVERY: 3,     // statistiques complètes des héros : un instantané sur trois
  INTERP: 0.17,        // retard d'affichage côté client (s)
  MAX_MSG: 3900,       // octets par message (limite du salon : 4 Kio)
  VISUALS: ['bullet', 'dart', 'spark', 'ember', 'bolt', 'shell', 'flare', 'slug', 'syringe', 'spit', 'acid'],
  ZONES: ['', 'gas', 'fire', 'inferno', 'mine', 'storm', 'trap', 'miniturret'],
};
NET.MINION_TYPES = Object.keys(MINIONS);
NET.MONSTER_TYPES = Object.keys(MONSTERS);

// ---------- Codage binaire compact ----------
class BinW {
  constructor(n) { this.b = new Uint8Array(n); this.i = 0; }
  u8(v) { this.b[this.i++] = v < 0 ? 0 : v > 255 ? 255 : v | 0; }
  u16(v) { v = v < 0 ? 0 : v > 65535 ? 65535 : Math.round(v); this.b[this.i++] = v & 255; this.b[this.i++] = v >> 8; }
  i8(v) { v = Math.round(v); v = v < -127 ? -127 : v > 127 ? 127 : v; this.b[this.i++] = v & 255; }
  ang(a) { this.i8(Utils.normAngle(a || 0) / Math.PI * 127); }
  age(now, t0) { this.u8(t0 === undefined || t0 < -50 ? 255 : Math.min(254, Math.max(0, Math.round((now - t0) * 50)))); }
  b64() { let s = ''; for (let k = 0; k < this.i; k++) s += String.fromCharCode(this.b[k]); return btoa(s); }
}
class BinR {
  constructor(str) { const s = atob(str); this.b = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) this.b[k] = s.charCodeAt(k); this.i = 0; }
  more() { return this.i < this.b.length; }
  u8() { return this.b[this.i++]; }
  u16() { const v = this.b[this.i] | (this.b[this.i + 1] << 8); this.i += 2; return v; }
  i8() { const v = this.b[this.i++]; return v > 127 ? v - 256 : v; }
  ang() { return this.i8() / 127 * Math.PI; }
  age(now) { const v = this.u8(); return v === 255 ? -99 : now - v / 50; }
}
function utf8Len(s) { let n = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? (i++, 4) : 3; } return n; }

// ---------- Transports ----------
const Transport = {
  async connect() {
    if (window.claude && typeof window.claude.use === 'function') {
      try { const room = await window.claude.use('room'); if (room) return await ClaudeHub.create(room); } catch (e) { console.warn('Salon Claude indisponible', e); }
    }
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try { return await WsHub.create((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { /* pas de serveur */ }
    }
    return null;
  },
};
class ClaudeHub {
  static async create(room) {
    const hub = new ClaudeHub(); hub.kind = 'claude'; hub.room = room; hub.lobby = room;
    hub.me = await new Promise(res => {
      const find = () => { const p = room.peers().find(q => q.sameTab); return p ? p.peer : null; };
      const now = find(); if (now) return res(now);
      let un = null; const timer = setTimeout(() => { if (un) un(); res(null); }, 9000);
      un = room.onPeers(() => { const p = find(); if (p) { clearTimeout(timer); if (un) un(); res(p); } }, () => { clearTimeout(timer); res(null); });
    });
    if (!hub.me) throw new Error('Aucune identité dans le salon');
    return hub;
  }
  join(name) { return this.room.join(name); }
  connected() { return this.room.connected(); }
}
class WsHub {
  static create(url) {
    return new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(url); } catch (e) { rej(e); return; }
      const hub = new WsHub(ws); hub.kind = 'ws';
      const t = setTimeout(() => { rej(new Error('délai')); try { ws.close(); } catch (e) { /* déjà fermé */ } }, 4000);
      ws.addEventListener('error', () => { clearTimeout(t); rej(new Error('ws')); });
      hub.onHello = () => { clearTimeout(t); res(hub); };
    });
  }
  constructor(ws) {
    this.ws = ws; this.rooms = new Map(); this.me = null; this.open = false;
    ws.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } this.recv(m); });
    ws.addEventListener('close', () => { this.open = false; for (const r of this.rooms.values()) r._peers([]); });
    this.lobby = this.room('');
  }
  room(name) { let r = this.rooms.get(name); if (!r) { r = new WsRoom(this, name); this.rooms.set(name, r); } return r; }
  send(o) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  recv(m) {
    if (m.op === 'hello') { this.me = m.peer; this.open = true; if (this.onHello) this.onHello(); return; }
    const r = this.rooms.get(m.room); if (!r) return;
    if (m.op === 'msg') r._msg(m); else if (m.op === 'peers') r._peers(m.peers);
  }
  join(name) { const r = this.room(name); this.send({ op: 'join', room: name }); return Promise.resolve(r); }
  connected() { return this.open; }
}
class WsRoom {
  constructor(hub, name) { this.hub = hub; this.name = name; this.handlers = new Map(); this.peerFns = new Set(); this.list = []; }
  emit(topic, data) {
    const txt = JSON.stringify(data === undefined ? null : data);
    if (utf8Len(txt) > 4096) return Promise.reject({ code: 'invalid_argument', message: 'message > 4 Kio' });
    this.hub.send({ op: 'emit', room: this.name, topic, data }); return Promise.resolve();
  }
  on(topic, fn) { if (!this.handlers.has(topic)) this.handlers.set(topic, new Set()); this.handlers.get(topic).add(fn); return () => { const s = this.handlers.get(topic); if (s) s.delete(fn); }; }
  presence(patch) { this.hub.send({ op: 'presence', room: this.name, patch }); return Promise.resolve(); }
  peers() { return this.list; }
  onPeers(fn) { this.peerFns.add(fn); queueMicrotask(() => { if (this.peerFns.has(fn)) fn({ peers: this.list, joined: this.list, left: [], updated: [] }); }); return () => this.peerFns.delete(fn); }
  leave() { this.hub.send({ op: 'leave', room: this.name }); this.hub.rooms.delete(this.name); this.handlers.clear(); this.peerFns.clear(); return Promise.resolve(); }
  connected() { return this.hub.open; }
  _msg(m) {
    const set = this.handlers.get(m.topic); if (!set) return;
    const me = m.peer === this.hub.me, msg = { topic: m.topic, data: m.data, peer: m.peer, isMe: me, sameTab: me, kind: 'viewer', guest: false, by: null };
    for (const fn of [...set]) fn(msg);
  }
  _peers(arr) {
    const old = new Map(this.list.map(p => [p.peer, p]));
    const next = arr.map(p => {
      const o = old.get(p.peer);
      if (o && JSON.stringify(o.presence) === JSON.stringify(p.presence || {})) return o;
      return Object.freeze({ peer: p.peer, presence: Object.freeze(p.presence || {}), isMe: p.peer === this.hub.me, sameTab: p.peer === this.hub.me, kind: 'viewer', guest: false, by: null, updatedAt: Date.now() });
    });
    const ids = new Set(next.map(p => p.peer));
    const change = { peers: next, joined: next.filter(p => !old.has(p.peer)), left: this.list.filter(p => !ids.has(p.peer)), updated: next.filter(p => old.has(p.peer) && old.get(p.peer) !== p) };
    this.list = next;
    for (const fn of [...this.peerFns]) fn(change);
  }
}

// ---------- Salon d'avant-partie ----------
// Emplacements 0-4 : Convoyeurs (Haut, Jungle, Milieu, Tireur, Soutien) ; 5-9 : Charognards.
class Multi {
  constructor(app) { this.app = app; this.hub = null; this.status = 'off'; this.room = null; this.isHost = false; this.hostPeer = null; this.code = null; this.lob = null; this.mine = {}; this.order = []; this.unsub = []; this.onChange = () => {}; this.started = false; }
  get nick() { return (this.app.settings.nick || '').trim() || 'Survivant'; }
  async init() {
    if (this.hub || this.status === 'connecting') return this.hub;
    this.status = 'connecting'; this.onChange();
    this.hub = await Transport.connect();
    this.status = this.hub ? 'ready' : 'none';
    if (this.hub) this.hub.lobby.onPeers(() => this.onChange(), () => { this.status = 'none'; this.onChange(); });
    this.onChange();
    return this.hub;
  }
  openGames() {
    if (!this.hub) return [];
    return this.hub.lobby.peers().filter(p => p.kind === 'viewer' && !p.isMe && p.presence && p.presence.host && typeof p.presence.host.code === 'string')
      .map(p => ({ peer: p.peer, code: String(p.presence.host.code).slice(0, 8), nick: String(p.presence.nick || 'Hôte').slice(0, 20), n: +p.presence.host.n || 1, started: !!p.presence.host.started }));
  }
  async host() {
    if (!this.hub) return;
    this.code = Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'x');
    this.isHost = true; this.hostPeer = this.hub.me; this.started = false;
    this.room = await this.hub.join('mb-' + this.code);
    this.lob = { code: this.code, diff: this.app.settings.difficulty || 'normal', slots: Array(10).fill(null), wait: [], started: false };
    this.order = [this.hub.me];
    this.setMine({ nick: this.nick, hero: this.app.settings.hero, slot: Math.max(0, ROLE_ORDER.indexOf(this.app.settings.role)) });
    this.unsub.push(this.room.onPeers(() => this.resolve()));
    this.unsub.push(this.room.on('c', m => this.app.game && this.app.game.net && this.app.game.net.cmd(m)));
    this.unsub.push(this.room.on('p', m => { if (!m.isMe) this.room.emit('p', { to: m.peer, c: m.data && m.data.c }).catch(() => {}); }));
    this.beat = setInterval(() => { this.resolve(true); this.advertise(); }, 1500);
    this.advertise(); this.resolve(true);
  }
  advertise() {
    if (!this.hub || !this.isHost) return;
    const n = this.lob ? this.lob.slots.filter(Boolean).length : 1;
    this.hub.lobby.presence({ nick: this.nick, host: { code: this.code, n, started: this.started } }).catch(() => {});
  }
  async join(code, hostPeer) {
    if (!this.hub) return;
    code = String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8); if (!code) return;
    this.code = code; this.isHost = false; this.hostPeer = hostPeer || null; this.lob = null; this.started = false;
    this.room = await this.hub.join('mb-' + code);
    this.setMine({ nick: this.nick, hero: this.app.settings.hero, slot: null });
    this.unsub.push(this.room.on('lob', m => {
      const d = m.data; if (!d || d.code !== this.code) return;
      if (!this.hostPeer) this.hostPeer = m.peer;
      if (m.peer !== this.hostPeer) return;
      const first = !this.lob; this.lob = d;
      if (first && this.mine.slot === null) this.autoSlot();
      this.onChange();
    }));
    this.unsub.push(this.room.on('go', m => {
      const d = m.data; if (m.peer !== this.hostPeer || !d || d.code !== this.code || d.id === this.lastGo) return;
      if (this.app.game && this.app.game.state === 'playing') return;
      this.lastGo = d.id; this.launch(d);
    }));
    this.unsub.push(this.room.onPeers(ch => { if (this.hostPeer && ch.left.some(p => p.peer === this.hostPeer)) this.hostGone(); else this.onChange(); }));
    this.joinTimer = setTimeout(() => { if (!this.lob && this.room) { this.app.ui.toast('Aucun hôte ne répond avec ce code', 'warn'); } }, 6000);
  }
  autoSlot() {
    const pref = Math.max(0, ROLE_ORDER.indexOf(this.app.settings.role));
    const free = i => !this.lob.slots[i];
    const order = [pref, pref + 5, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const pick = order.find(i => i >= 0 && i < 10 && free(i));
    if (pick !== undefined) this.setMine({ slot: pick });
  }
  setMine(patch) { Object.assign(this.mine, patch); if (this.room) this.room.presence(patch).catch(() => {}); if (this.isHost) this.resolve(); this.onChange(); }
  // L'hôte attribue les places dans l'ordre d'arrivée et refuse les doublons de héros dans une équipe.
  resolve(force) {
    if (!this.isHost || !this.room || this.started) return;
    const peers = this.room.peers().filter(p => p.kind === 'viewer');
    for (const p of peers) if (!this.order.includes(p.peer)) this.order.push(p.peer);
    this.order = this.order.filter(id => id === this.hub.me || peers.some(p => p.peer === id));
    const pres = id => id === this.hub.me ? this.mine : ((peers.find(p => p.peer === id) || {}).presence || {});
    const slots = Array(10).fill(null), wait = [];
    for (const id of this.order) {
      const pr = pres(id), nick = String(pr.nick || 'Survivant').slice(0, 16), hero = HEROES[pr.hero] ? pr.hero : null, s = Number.isInteger(pr.slot) && pr.slot >= 0 && pr.slot < 10 ? pr.slot : -1;
      if (s < 0 || slots[s]) { wait.push({ peer: id, nick }); continue; }
      const team = s < 5 ? 0 : 5, dup = hero && slots.slice(team, team + 5).some(x => x && x.hero === hero);
      slots[s] = { peer: id, nick, hero: dup ? null : hero };
    }
    const lob = { code: this.code, diff: this.lob.diff, slots, wait, started: false };
    const sig = JSON.stringify(lob);
    if (sig !== this._sig || force) { this._sig = sig; this.lob = lob; this.room.emit('lob', lob).catch(() => {}); this.onChange(); }
  }
  setDiff(d) { if (!this.isHost || !DIFFICULTY[d]) return; this.lob.diff = d; this.app.settings.difficulty = d; this.app.saveSettings(); this.resolve(true); }
  // Composition finale : humains à leur place, bots ailleurs.
  buildTeams() {
    const ids = Object.keys(HEROES), cfg = { blue: [], red: [] };
    for (const team of [0, 1]) {
      const used = new Set(this.lob.slots.slice(team * 5, team * 5 + 5).filter(Boolean).map(s => s.hero).filter(Boolean));
      ROLE_ORDER.forEach((role, r) => {
        const s = this.lob.slots[team * 5 + r];
        let id = s && s.hero;
        if (!id) { let c = Utils.shuffle(ids.filter(i => !used.has(i) && HEROES[i].roles.includes(role))); if (!c.length) c = Utils.shuffle(ids.filter(i => !used.has(i))); id = c[0] || ids[0]; used.add(id); }
        (team ? cfg.red : cfg.blue).push(s ? { id, role, human: true, peer: s.peer, nick: s.nick } : { id, role });
      });
    }
    return cfg;
  }
  start() {
    if (!this.isHost || this.started) return;
    const humans = this.lob.slots.filter(Boolean).length;
    if (!this.lob.slots.some(s => s && s.peer === this.hub.me)) { this.app.ui.toast('Prenez une place avant de lancer', 'warn'); return; }
    const go = { id: Date.now() % 1e9, code: this.code, diff: this.lob.diff, cfg: this.buildTeams(), n: humans };
    let k = 0; const send = () => { if (this.room) this.room.emit('go', go).catch(() => {}); if (++k < 4) setTimeout(send, 500); };
    send();
    this.launch(go);
  }
  launch(go) {
    const me = this.hub.me, cfg = go.cfg;
    const mark = l => l.map(p => ({ ...p, me: !!p.human && p.peer === me }));
    const blue = mark(cfg.blue), red = mark(cfg.red);
    if (![...blue, ...red].some(p => p.me)) { this.app.ui.toast('La partie a commencé sans vous : aucune place libre', 'warn'); return; }
    this.started = true; clearTimeout(this.joinTimer);
    if (this.isHost) { this.advertise(); }
    this.app.menu.versusMulti({ blue, red }, go.diff, () => this.app.startGame({ blue, red, difficulty: go.diff, mode: this.isHost ? 'host' : 'client' }));
  }
  // Fin de partie : tout le monde revient au salon, l'hôte peut relancer.
  backToLobby() { this.started = false; if (this.isHost) { this.advertise(); this.resolve(true); } this.onChange(); }
  hostGone() {
    const inGame = this.app.game && this.app.game.remote;
    this.leave();
    if (inGame) this.app.game.remote.lost('L’hôte a quitté la partie');
    else { this.app.ui.toast('L’hôte a fermé le salon', 'warn'); this.app.menu.show('multi'); }
  }
  leave() {
    for (const u of this.unsub) { try { u(); } catch (e) { /* déjà détaché */ } } this.unsub = [];
    clearInterval(this.beat); clearTimeout(this.joinTimer);
    if (this.isHost && this.hub) this.hub.lobby.presence({ host: null }).catch(() => {});
    if (this.room) { this.room.leave().catch(() => {}); this.room = null; }
    this.isHost = false; this.hostPeer = null; this.code = null; this.lob = null; this.started = false; this.mine = {}; this.order = []; this._sig = null;
    this.onChange();
  }
}

// ---------- Hôte : relaie la partie ----------
class NetHost {
  constructor(app, game, multi) {
    this.app = app; this.g = game; this.multi = multi; this.room = multi.room;
    this.t = -1; this.seq = 0; this.events = []; this.rel = []; this.relSeq = 0; this.removed = []; this.prevIds = new Set();
    this.pids = new WeakMap(); this.nextPid = 1; this.zids = new WeakMap(); this.nextZid = 1;
    this.byPeer = new Map(); for (const h of game.heroes) if (h.human && h.peer && h !== game.player) this.byPeer.set(h.peer, h);
    this.unsub = [this.room.onPeers(ch => this.peersChanged(ch))];
    game.net = this;
  }
  close() { for (const u of this.unsub) u(); this.unsub = []; if (this.g) this.g.net = null; }
  event(e, reliable) {
    if (reliable) { this.rel.push({ s: ++this.relSeq, t: Math.round(this.g.time * 100) / 100, e }); return; }
    if (this.events.length < 220) this.events.push(e);
  }
  fx(type, props) {
    if (type === 'dust') return;
    const o = {};
    for (const k in props) { const v = props[k]; if (v && typeof v === 'object') { if (v.id) o[k] = { u: v.id }; } else o[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v; }
    this.event(['x', type, o]);
  }
  peersChanged(ch) {
    for (const p of ch.left) {
      const h = this.byPeer.get(p.peer); if (!h) continue;
      this.byPeer.delete(p.peer); h.human = false; h.peer = null; h.bot = new HeroBot(this.g, h);
      this.g.log(`${h.nick || h.name} a quitté la partie : un bot prend le relais`, 'warn');
      this.event(['t', 0, `${h.nick || h.name} a quitté la partie : un bot prend le relais`, 'warn'], true);
      h.nick = '';
    }
  }
  // Ordres des joueurs distants, vérifiés avant d'être appliqués.
  cmd(m) {
    const h = this.byPeer.get(m.peer), g = this.g; if (!h || !m.data || !Array.isArray(m.data.c)) return;
    const [name, a, b, c] = m.data.c, num = v => typeof v === 'number' && isFinite(v), unit = id => num(id) ? this.unitById(id) : null;
    switch (name) {
      case 'move': if (num(a) && num(b)) g.issueMove(h, Utils.clamp(a, 0, CONFIG.W), Utils.clamp(b, 0, CONFIG.H)); break;
      case 'attack': { const u = unit(a); if (u) g.issueAttack(h, u); break; }
      case 'stop': g.issueStop(h); break;
      case 'cast': if (num(a) && a >= 0 && a < 4 && num(b) && num(c)) g.castAbility(h, a | 0, b, c); break;
      case 'spell': if (num(a) && (a === 0 || a === 1) && num(b) && num(c)) g.useSpell(h, a, b, c); break;
      case 'recall': g.startRecall(h); break;
      case 'level': if (num(a) && a >= 0 && a < 4) { if (!g.levelUp(h, a | 0)) g.castFail(h, h.points ? 'Rang maximal pour ce niveau' : 'Aucun point de compétence disponible'); } break;
      case 'buy': if (typeof a === 'string' && ITEMS[a]) g.buy(h, a); break;
      case 'sell': if (num(a) && a >= 0 && a < 6) g.sell(h, a | 0); break;
      case 'item': if (num(a) && a >= 0 && a < 6) g.useItem(h, a | 0); break;
    }
  }
  unitById(id) {
    const g = this.g;
    for (const l of [g.heroes, g.minions, g.monsters, g.towers, g.inhibs, g.nexuses]) for (const u of l) if (u.id === id) return u;
    return null;
  }
  frame() {
    const g = this.g;
    if (g.time - this.t < NET.TICK - 1e-6) return;
    this.t = g.time; this.seq++;
    const T = Math.round(g.time * 1000) / 1000, parts = [];
    // Unités retirées depuis le dernier instantané
    const ids = new Set(); for (const m of g.minions) ids.add(m.id); for (const m of g.monsters) ids.add(m.id);
    for (const id of this.prevIds) if (!ids.has(id)) this.removed.push({ id, t: T });
    this.prevIds = ids; this.removed = this.removed.filter(r => T - r.t < 1);
    this.rel = this.rel.filter(r => g.time - r.t < 1.6);
    parts.push({ k: 'g', st: g.state, w: g.winner, ea: g.endAt, ki: g.kills, td: g.towersDown, dr: g.dragons, rm: this.removed.map(r => [r.id, r.t]) });
    parts.push({ k: 'h', d: this.encHeroes(T) });
    parts.push({ k: 'b', d: this.encStructures(T) });
    parts.push({ k: 'p', d: this.encProjectiles() });
    parts.push({ k: 'z', d: this.encZones() });
    for (const chunk of this.chunks(g.minions, 200)) parts.push({ k: 'm', d: this.encMinions(chunk, T) });
    parts.push({ k: 'n', d: this.encMonsters(T) });
    if (this.rel.length) parts.push({ k: 'r', d: this.rel.map(r => [r.s, r.t, r.e]) });
    if (this.events.length) parts.push({ k: 'e', d: this.events });
    if (this.seq % NET.DETAIL_EVERY === 1) parts.push({ k: 'd', cr: g.camps.map(c => c.alive.length ? -1 : isFinite(c.respawnAt) ? Math.round(c.respawnAt) : -2), hs: g.heroes.map(h => this.detail(h)) });
    this.events = [];
    this.send(T, parts);
  }
  chunks(list, n) { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); if (!out.length) out.push([]); return out; }
  send(T, parts) {
    const base = utf8Len(JSON.stringify({ T, q: this.seq, p: [] }));
    let cur = [], size = base;
    const flush = () => { if (!cur.length) return; this.room.emit('s', { T, q: this.seq, p: cur }).catch(() => {}); cur = []; size = base; };
    for (let part of parts) {
      let len = utf8Len(JSON.stringify(part)) + 1;
      if (len > NET.MAX_MSG - base && Array.isArray(part.d) && (part.k === 'e' || part.k === 'r')) {
        // Trop d'événements d'un coup : on garde le début
        const d = part.d.slice(); while (d.length && utf8Len(JSON.stringify({ k: part.k, d })) > NET.MAX_MSG - base - 10) d.pop();
        part = { k: part.k, d }; len = utf8Len(JSON.stringify(part)) + 1;
      }
      if (size + len > NET.MAX_MSG) flush();
      cur.push(part); size += len;
    }
    flush();
  }
  encHeroes(T) {
    const g = this.g, w = new BinW(g.heroes.length * 24);
    for (const h of g.heroes) {
      w.u16(h.id); w.u16(h.x); w.u16(h.y); w.u8(h.z || 0); w.ang(h.angle);
      w.u16(h.hp); w.u16(h.maxHp); w.u16(h.mana); w.u16(h.maxMana);
      const t = g.time, f = (h.dead ? 1 : 0) | (h.moving ? 2 : 0) | (h.recall ? 4 : 0) | (h.dash ? 8 : 0) | (h.stunned(t) ? 16 : 0) | (h.rooted(t) ? 32 : 0) | (h.channel ? 64 : 0);
      w.u16(f); w.age(T, h.attackAnim); w.age(T, h.castAnim); w.u16(h.dead ? 0 : h.shieldAmt(t)); w.u8((h.scale || 1) * 50); w.age(T, h.recall ? h.recall.start : undefined);
    }
    return w.b64();
  }
  encStructures(T) {
    const list = this.g.structures(), w = new BinW(list.length * 9);
    for (const s of list) { w.u16(s.id); w.u16(s.hp); w.u8(s.dead ? 1 : 0); w.ang(s.turretAngle || 0); w.age(T, s.attackAnim); w.u16(s.target && !s.target.dead ? s.target.id : 0); }
    return w.b64();
  }
  encMinions(list, T) {
    const w = new BinW(list.length * 15);
    for (const m of list) { w.u16(m.id); w.u8(NET.MINION_TYPES.indexOf(m.type) * 2 + m.team); w.u16(m.x); w.u16(m.y); w.u16(m.hp); w.u16(m.maxHp); w.ang(m.angle); w.u8(m.moving ? 1 : 0); w.age(T, m.attackAnim); }
    return w.b64();
  }
  encMonsters(T) {
    const g = this.g, w = new BinW(g.monsters.length * 14);
    for (const m of g.monsters) { w.u16(m.id); w.u8(NET.MONSTER_TYPES.indexOf(m.type)); w.u8(g.camps.indexOf(m.camp)); w.u16(m.x); w.u16(m.y); w.u16(m.hp); w.ang(m.angle); w.u8(m.moving ? 1 : 0); w.age(T, m.attackAnim); }
    return w.b64();
  }
  encProjectiles() {
    const list = this.g.projectiles.filter(p => !p.dead).slice(0, 120), w = new BinW(list.length * 13);
    for (const p of list) {
      let id = this.pids.get(p); if (!id) { id = this.nextPid; this.nextPid = this.nextPid % 65000 + 1; this.pids.set(p, id); }
      const vi = NET.VISUALS.indexOf(p.visual);
      w.u16(id); w.u8(vi < 0 ? 0 : vi); w.u8((p.team === 1 ? 1 : p.team === 2 ? 2 : 0) | (p.high ? 4 : 0) | (p.homing ? 8 : 0)); w.u16(p.x); w.u16(p.y); w.ang(p.ang); w.u8(p.speed / 10); w.u16(p.homing && p.target && !p.target.dead ? p.target.id : 0);
    }
    return w.b64();
  }
  encZones() {
    const list = this.g.zones.filter(z => !z.dead && NET.ZONES.indexOf(z.kind) > 0), w = new BinW(list.length * 16);
    for (const z of list) {
      let id = this.zids.get(z); if (!id) { id = this.nextZid; this.nextZid = this.nextZid % 65000 + 1; this.zids.set(z, id); }
      w.u16(id); w.u8(NET.ZONES.indexOf(z.kind)); w.u8(z.team); w.u16(z.x); w.u16(z.y); w.u16(z.r); w.u16(z.t * 50); w.u8((z.delay || 0) * 20); w.u16(Math.min(3000, z.dur || 0) * 20); w.u8(z.armed ? 1 : 0); w.ang(z.angle || 0);
    }
    return w.b64();
  }
  detail(h) {
    const r1 = v => Math.round(v * 10) / 10;
    return [h.id, h.level, Math.round(h.xp), h.points, Math.floor(h.gold), h.k, h.d, h.a, h.cs, h.ranks, h.cds.map(r1), h.spellCds.map(r1), r1(h.respawnAt), h.items.map(s => s.n ? [s.id, s.n] : [s.id]),
      h.buffs.map(b => [b.id, r1(b.until), b.dur, b.stats || null, b.scale || 0]), Math.round(h.st.ms * h.msMult(this.g.time)), h.human ? (h.nick || '') : ''];
  }
}

// ---------- Client : affiche la partie de l'hôte ----------
class NetClient {
  constructor(app, game, multi) {
    this.app = app; this.g = game; this.multi = multi; this.room = multi.room; this.hostPeer = multi.hostPeer;
    this.byId = new Map(); for (const u of [...game.heroes, ...game.structures()]) { this.byId.set(u.id, u); u._s = []; }
    this.minionMap = new Map(); this.monsterMap = new Map(); this.projMap = new Map(); this.zoneMap = new Map();
    this.evq = []; this.relSeen = new Set(); this.headers = []; this.removals = [];
    this.offset = null; this.renderT = 0; this.lastRecv = performance.now(); this.lastMT = 0; this.rtt = 0; this.cmdN = 0; this.started = false; this.gone = false;
    game.remote = this; game.camps.forEach(c => { c.alive = []; });
    this.unsub = [
      this.room.on('s', m => { if (m.peer === this.hostPeer && m.data) this.recv(m.data); }),
      this.room.on('p', m => { if (m.peer === this.hostPeer && m.data && m.data.to === this.multi.hub.me) this.rtt = performance.now() - m.data.c; }),
    ];
    this.ping = setInterval(() => this.room.emit('p', { c: performance.now() }).catch(() => {}), 2000);
  }
  close() { for (const u of this.unsub) u(); this.unsub = []; clearInterval(this.ping); }
  send(name, ...args) { this.room.emit('c', { n: ++this.cmdN, c: [name, ...args.map(a => typeof a === 'number' ? Math.round(a * 10) / 10 : a)] }).catch(() => {}); }
  lost(msg) {
    if (this.gone) return; this.gone = true; this.close();
    const g = this.g; if (g.state === 'playing') { g.state = 'over'; g.winner = -1; g.endAt = g.time; g.lostMsg = msg; }
  }
  // ---- Réception ----
  recv(d) {
    const T = d.T, now = performance.now() / 1000;
    this.lastRecv = performance.now();
    const off = T - now;
    if (this.offset === null || off > this.offset + 2 || off < this.offset - 2) this.offset = off;
    else this.offset += (off - this.offset) * (off > this.offset ? 0.3 : 0.03);
    for (const p of d.p || []) {
      try { this.part(p, T); } catch (e) { console.warn('Instantané illisible', p.k, e); }
    }
  }
  part(p, T) {
    switch (p.k) {
      case 'g': this.headers.push({ t: T, ...p }); if (this.headers.length > 30) this.headers.shift(); for (const [id, t] of p.rm || []) this.removals.push({ id, t }); break;
      case 'h': this.decHeroes(p.d, T); break;
      case 'b': this.decStructures(p.d, T); break;
      case 'p': this.decProjectiles(p.d, T); break;
      case 'z': this.decZones(p.d, T); break;
      case 'm': this.decMinions(p.d, T); this.lastMT = Math.max(this.lastMT, T); break;
      case 'n': this.decMonsters(p.d, T); break;
      case 'e': for (const e of p.d) this.evq.push({ t: T, e }); break;
      case 'r': for (const [s, t, e] of p.d) if (!this.relSeen.has(s)) { this.relSeen.add(s); this.evq.push({ t, e }); } break;
      case 'd': this.decDetail(p); break;
    }
  }
  sample(u, s) {
    const a = u._s || (u._s = []);
    if (a.length && a[a.length - 1].t >= s.t) { if (a.some(x => x.t === s.t)) return; a.push(s); a.sort((x, y) => x.t - y.t); }
    else a.push(s);
    if (a.length > 8) a.shift();
  }
  decHeroes(str, T) {
    const r = new BinR(str);
    while (r.more()) {
      const id = r.u16(), s = { t: T, x: r.u16(), y: r.u16(), z: r.u8(), a: r.ang(), hp: r.u16(), maxHp: r.u16(), mana: r.u16(), maxMana: r.u16(), f: r.u16(), atk: r.age(T), cast: r.age(T), sh: r.u16(), sc: r.u8() / 50, rec: r.age(T) };
      const h = this.byId.get(id); if (h) this.sample(h, s);
    }
  }
  decStructures(str, T) {
    const r = new BinR(str);
    while (r.more()) { const id = r.u16(), s = { t: T, hp: r.u16(), dead: r.u8() & 1, a: r.ang(), atk: r.age(T), tg: r.u16() }; const u = this.byId.get(id); if (u) this.sample(u, s); }
  }
  decMinions(str, T) {
    const r = new BinR(str), g = this.g;
    while (r.more()) {
      const id = r.u16(), ti = r.u8(), s = { t: T, x: r.u16(), y: r.u16(), hp: r.u16(), maxHp: r.u16(), a: r.ang(), f: r.u8(), atk: r.age(T) };
      let m = this.minionMap.get(id);
      if (!m) {
        const type = NET.MINION_TYPES[ti >> 1] || 'melee';
        m = new Minion(type, ti & 1, null, s.x, s.y, g); m.id = id; m._s = []; m.angle = s.a;
        this.minionMap.set(id, m); this.byId.set(id, m); g.minions.push(m);
      }
      m.seen = T; this.sample(m, s);
    }
  }
  decMonsters(str, T) {
    const r = new BinR(str), g = this.g;
    while (r.more()) {
      const id = r.u16(), type = NET.MONSTER_TYPES[r.u8()], ci = r.u8(), s = { t: T, x: r.u16(), y: r.u16(), hp: r.u16(), a: r.ang(), f: r.u8(), atk: r.age(T) };
      let m = this.monsterMap.get(id);
      if (!m) {
        const camp = g.camps[ci] || g.camps[0];
        m = new Monster(type || 'golem', camp, s.x, s.y); m.id = id; m._s = []; m.angle = s.a;
        this.monsterMap.set(id, m); this.byId.set(id, m); g.monsters.push(m); camp.alive.push(m);
      }
      m.seen = T; this.sample(m, s);
    }
  }
  decProjectiles(str, T) {
    const r = new BinR(str), present = new Set();
    while (r.more()) {
      const id = r.u16(), vi = r.u8(), tf = r.u8(), s = { t: T, x: r.u16(), y: r.u16(), a: r.ang(), sp: r.u8() * 10, tg: r.u16() };
      present.add(id);
      let p = this.projMap.get(id);
      if (!p) { p = new Projectile({ visual: NET.VISUALS[vi], team: tf & 3, high: !!(tf & 4), homing: !!(tf & 8), x: s.x, y: s.y, ang: s.a, speed: s.sp, target: null }); p._s = []; p.born = T; this.projMap.set(id, p); }
      if (s.tg) p.target = this.byId.get(s.tg) || p.target;
      p.goneAt = null; this.sample(p, s);
    }
    for (const [id, p] of this.projMap) if (!present.has(id) && !p.goneAt) p.goneAt = T;
  }
  decZones(str, T) {
    const r = new BinR(str), present = new Set();
    while (r.more()) {
      const id = r.u16(), kind = NET.ZONES[r.u8()], team = r.u8(), x = r.u16(), y = r.u16(), rad = r.u16(), zt = r.u16() / 50, delay = r.u8() / 20, dur = r.u16() / 20, armed = !!(r.u8() & 1), angle = r.ang();
      present.add(id);
      let z = this.zoneMap.get(id);
      if (!z) { z = new Zone({ kind, team, x, y, r: rad, delay, dur, angle }); z.born = T; this.zoneMap.set(id, z); }
      Object.assign(z, { x, y, r: rad, delay, dur, angle, base: zt, baseT: T, armedNet: armed, goneAt: null });
    }
    for (const [id, z] of this.zoneMap) if (!present.has(id) && !z.goneAt) z.goneAt = T;
  }
  decDetail(p) {
    const g = this.g;
    if (Array.isArray(p.cr)) p.cr.forEach((v, i) => { const c = g.camps[i]; if (!c) return; c.respawnAt = v === -2 ? Infinity : v; });
    for (const row of p.hs || []) {
      const [id, level, xp, points, gold, k, d, a, cs, ranks, cds, scd, respawnAt, items, buffs, ms] = row, h = this.byId.get(id);
      if (!h || h.kind !== 'hero') continue;
      const sig = level + '|' + JSON.stringify(items) + '|' + JSON.stringify(buffs.map(b => [b[0], b[3], b[4]]));
      Object.assign(h, { level, xp, points, gold, k, d, a, cs, respawnAt });
      h.ranks = ranks.slice(0, 4); h.cds = cds.slice(0, 4); h.spellCds = scd.slice(0, 2);
      h.buffs = buffs.map(b => ({ id: b[0], until: b[1], dur: b[2], stats: b[3] || undefined, scale: b[4] || undefined }));
      if (sig !== h._sig) { h._sig = sig; h.items = items.filter(it => ITEMS[it[0]]).map(it => it[1] ? { id: it[0], n: it[1] } : { id: it[0] }); const hp = h.hp, mana = h.mana; h.recompute(); h.hp = hp; h.mana = mana; }
      h.st.ms = ms; h.status.slows = []; h.status.hastes = [];
      if (h !== g.player) { h.nick = row[16] || ''; h.human = !!row[16]; }
    }
  }
  // ---- Affichage différé ----
  pick(u, rt) {
    const a = u._s; if (!a || !a.length) return null;
    let i = a.length - 1; while (i > 0 && a[i].t > rt) i--;
    const s0 = a[i], s1 = a[i + 1];
    if (!s1 || s0.t > rt) return { s0, s1: null, k: 0 };
    const k = Utils.clamp((rt - s0.t) / (s1.t - s0.t), 0, 1);
    return { s0, s1, k };
  }
  move(u, P, dt) {
    const { s0, s1, k } = P, ox = u.x, oy = u.y;
    if (s1 && Utils.dist(s0.x, s0.y, s1.x, s1.y) < 400) { u.x = s0.x + (s1.x - s0.x) * k; u.y = s0.y + (s1.y - s0.y) * k; u.angle = Utils.lerpAngle(s0.a, s1.a, k); }
    else { u.x = s0.x; u.y = s0.y; u.angle = s0.a; }
    const moved = Utils.dist(ox, oy, u.x, u.y); if (moved < 200) u.walk += moved * 0.06;
    u.px = u.x; u.py = u.y;
  }
  tick(dt) {
    const g = this.g;
    if (this.offset === null) { g.time += 0; return; }
    let rt = performance.now() / 1000 + this.offset - NET.INTERP;
    if (rt < this.renderT && rt > this.renderT - 1) rt = this.renderT;
    this.renderT = rt; g.time = Math.max(0, rt);
    // En-tête : état de la partie
    let hd = null; for (const h of this.headers) if (h.t <= rt) hd = h;
    if (hd) {
      g.kills = hd.ki || g.kills; g.towersDown = hd.td || g.towersDown; g.dragons = hd.dr || g.dragons;
      if (hd.st === 'over' && g.state === 'playing') { g.state = 'over'; g.winner = hd.w; g.endAt = rt + 3.5; const n = g.nexuses[1 - hd.w]; if (n) { g.camera.locked = false; g.camera.focus = { x: n.x, y: n.y }; } }
    }
    // Événements
    if (this.evq.length) {
      this.evq.sort((a, b) => a.t - b.t);
      while (this.evq.length && this.evq[0].t <= rt) this.apply(this.evq.shift().e);
      if (this.evq.length > 600) this.evq.splice(0, this.evq.length - 600);
    }
    // Retraits
    if (this.removals.length) {
      const keep = [];
      for (const r of this.removals) { if (r.t <= rt) this.drop(r.id); else keep.push(r); }
      this.removals = keep;
    }
    // Héros
    for (const h of g.heroes) {
      const P = this.pick(h, rt); if (!P) continue; const s = P.s0;
      this.move(h, P, dt);
      h.z = P.s1 ? s.z + (P.s1.z - s.z) * P.k : s.z;
      h.hp = s.hp; h.maxHp = Math.max(1, s.maxHp); h.mana = s.mana; h.maxMana = Math.max(1, s.maxMana);
      const wasDead = h.dead; h.dead = !!(s.f & 1); h.moving = !!(s.f & 2);
      if (wasDead && !h.dead && h === g.player) { g.camera.x = h.x; g.camera.y = h.y; }
      h.attackAnim = s.atk; h.castAnim = s.cast; h.scale = s.sc || 1;
      h.status.shields = s.sh ? [{ amt: s.sh, until: Infinity }] : [];
      h.status.stun = s.f & 16 ? rt + 0.2 : 0; h.status.root = s.f & 32 ? rt + 0.2 : 0;
      h.recall = s.f & 4 ? { start: s.rec, end: s.rec + CONFIG.RECALL_TIME } : null;
      for (let i = 0; i < 4; i++) if (h.cds[i] > 0) h.cds[i] = Math.max(0, h.cds[i] - dt);
      for (let i = 0; i < 2; i++) if (h.spellCds[i] > 0) h.spellCds[i] = Math.max(0, h.spellCds[i] - dt);
      if (h.order && h.order.type === 'attack' && (!h.order.target || h.order.target.dead)) h.order = null;
    }
    // Structures
    for (const st of g.structures()) {
      const P = this.pick(st, rt); if (!P) continue; const s = P.s0;
      st.hp = s.hp; st.dead = !!s.dead; st.turretAngle = P.s1 ? Utils.lerpAngle(s.a, P.s1.a, P.k) : s.a; st.attackAnim = s.atk;
      st.target = s.tg ? this.byId.get(s.tg) || null : null;
    }
    // Sbires et monstres
    const stale = this.lastMT - 0.8;
    for (const [id, m] of this.minionMap) {
      if (m.seen < stale) { this.drop(id); continue; }
      const P = this.pick(m, rt); if (!P) continue; const s = P.s0;
      this.move(m, P, dt); m.hp = s.hp; m.maxHp = Math.max(1, s.maxHp); m.moving = !!(s.f & 1); m.attackAnim = s.atk;
    }
    for (const [id, m] of this.monsterMap) {
      if (m.seen < stale) { this.drop(id); continue; }
      const P = this.pick(m, rt); if (!P) continue; const s = P.s0;
      this.move(m, P, dt); m.hp = s.hp; m.moving = !!(s.f & 1); m.attackAnim = s.atk;
    }
    // Projectiles : interpolés, puis prolongés jusqu'à leur cible
    const projs = [];
    for (const [id, p] of this.projMap) {
      const a = p._s, last = a[a.length - 1];
      if (p.goneAt && rt >= last.t + 0.06) { this.projMap.delete(id); continue; }
      if (rt < a[0].t) continue;
      const P = this.pick(p, rt);
      if (P.s1) { p.x = P.s0.x + (P.s1.x - P.s0.x) * P.k; p.y = P.s0.y + (P.s1.y - P.s0.y) * P.k; p.ang = P.s1.a; }
      else {
        const e = Math.min(0.25, rt - last.t);
        if (p.homing && p.target && !p.target.dead) { const d = Utils.dist(last.x, last.y, p.target.x, p.target.y), step = Math.min(d, p.speed * e); p.ang = Utils.angleTo(last.x, last.y, p.target.x, p.target.y); p.x = last.x + Math.cos(p.ang) * step; p.y = last.y + Math.sin(p.ang) * step; }
        else { p.x = last.x + Math.cos(last.a) * p.speed * e; p.y = last.y + Math.sin(last.a) * p.speed * e; p.ang = last.a; }
      }
      projs.push(p);
    }
    g.projectiles = projs;
    // Zones
    const zones = [];
    for (const [id, z] of this.zoneMap) {
      if (z.goneAt && rt >= z.goneAt - 0.05) { this.zoneMap.delete(id); continue; }
      if (rt < z.born) continue;
      z.t = Math.max(0, z.base + (rt - z.baseT)); z.armed = z.armedNet || z.t >= z.delay;
      zones.push(z);
    }
    g.zones = zones;
    // Vision recalculée localement, effets et chiffres
    g.visTimer -= dt; if (g.visTimer <= 0) { g.visTimer = 0.1; g.updateVision(); }
    for (const e of g.effects) { e.t += dt; if (e.t >= e.dur) e.dead = true; }
    for (const f of g.floats) f.t += dt;
    g.effects = g.effects.filter(e => !e.dead); g.floats = g.floats.filter(f => f.t < f.dur);
    if (!this.gone && performance.now() - this.lastRecv > 7000) this.lost('Connexion perdue avec l’hôte');
  }
  drop(id) {
    const g = this.g, m = this.minionMap.get(id) || this.monsterMap.get(id);
    if (!m) return;
    m.dead = true; this.minionMap.delete(id); this.monsterMap.delete(id); this.byId.delete(id);
    if (m.kind === 'minion') g.minions = g.minions.filter(x => x !== m);
    else { g.monsters = g.monsters.filter(x => x !== m); if (m.camp) m.camp.alive = m.camp.alive.filter(x => x !== m); }
  }
  apply(e) {
    const g = this.g, me = g.player, ui = this.app.ui;
    switch (e[0]) {
      case 'x': { const props = {}; for (const k in e[2]) { const v = e[2][k]; props[k] = v && typeof v === 'object' ? this.byId.get(v.u) || null : v; } if (props.target === null) return; if (g.effects.length < 500) g.effects.push(new Effect(e[1], props)); break; }
      case 's': if (e[4] && e[4] !== me.id) return; g.sfx(e[1], e[2] < 0 ? undefined : e[2], e[3] < 0 ? undefined : e[3]); break;
      case 'f': if (e[1] === me.id && g.floats.length < 80) g.floats.push({ text: e[2], x: e[3], y: e[4], color: e[5], big: !!e[6], t: 0, dur: 0.9 }); break;
      case 't': if (e[1] === 0 || e[1] === me.id) ui.toast(e[2], e[3]); break;
      case 'a': { if (e[3] && e[3] !== me.id) return; const a = narrate(g, e[1], e[2] || {}, me); if (a) ui.announce(a[0], a[1], a[2]); break; }
      case 'k': { const v = this.byId.get(e[2]); if (v) ui.feed(this.byId.get(e[1]) || null, v, new Array(e[3] || 0)); break; }
    }
  }
}
