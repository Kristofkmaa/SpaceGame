// ============ Souris, clavier, caméra ============
class Input {
  constructor(app, canvas, minimap) {
    this.app = app; this.canvas = canvas; this.minimap = minimap;
    this.mouse = { sx: innerWidth / 2, sy: innerHeight / 2, wx: 0, wy: 0, in: false };
    this.aiming = null; this.rightHeld = false; this.lastRight = 0; this.keys = {}; this.pan = null; this.hover = null; this.centerHeld = false; this.showRange = false; this.lastMoveT = -9;
    this.bind();
  }
  get game() { return this.app.game; }
  get R() { return this.app.renderer; }
  get K() { return this.app.keys; }
  active() { return this.game && this.game.state === 'playing' && !this.app.menu.isOpen(); }
  bind() {
    const c = this.canvas;
    for (const el of [c, this.minimap]) el.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('mousedown', e => this.down(e));
    window.addEventListener('mouseup', e => { if (e.button === 2) this.rightHeld = false; if (e.button === 1) this.pan = null; });
    window.addEventListener('mousemove', e => this.move(e));
    c.addEventListener('mouseenter', () => this.mouse.in = true);
    c.addEventListener('mouseleave', () => this.mouse.in = false);
    c.addEventListener('wheel', e => { e.preventDefault(); if (!this.game || this.app.menu.isOpen()) return; const cam = this.game.camera; cam.zoom = Utils.clamp(cam.zoom * (e.deltaY > 0 ? 1.07 : 1 / 1.07), CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX); }, { passive: false });
    window.addEventListener('keydown', e => this.keyDown(e));
    window.addEventListener('keyup', e => this.keyUp(e));
    window.addEventListener('blur', () => { this.keys = {}; this.rightHeld = false; });
    this.minimap.addEventListener('mousedown', e => this.mini(e));
    this.minimap.addEventListener('mousemove', e => { if (e.buttons & 1) this.mini(e, true); if (e.buttons & 2) this.mini(e, true, true); });
  }
  updateMouse(e) { this.mouse.sx = e.clientX; this.mouse.sy = e.clientY; if (this.game) { const w = this.R.toWorld(e.clientX, e.clientY); this.mouse.wx = w.x; this.mouse.wy = w.y; } }
  // Cible sous le curseur, par projection à l'écran (les modèles ont du volume)
  hoverTarget() {
    const g = this.game, team = g.player.team, mx = this.mouse.sx, my = this.mouse.sy;
    let best = null, bd = Infinity;
    const check = (u, prio) => {
      if (!g.isTargetable(u, team) || (u.vis && !u.vis[team] && u.kind !== 'tower' && u.kind !== 'inhib' && u.kind !== 'nexus')) return;
      const h = this.R.unitHeight(u), c = this.R.toScreen(u.x, u.y, h * 0.5), e = this.R.toScreen(u.x + u.radius, u.y, h * 0.5);
      const pr = Math.max(14, Math.abs(e.x - c.x) * 1.25), half = Math.max(pr, Math.abs(this.R.toScreen(u.x, u.y, h).y - c.y));
      const dx = mx - c.x, dy = my - c.y;
      if (Math.abs(dx) > pr + 6 || Math.abs(dy) > half + 6) return;
      const d = Math.hypot(dx, dy) - prio;
      if (d < bd) { bd = d; best = u; }
    };
    for (const h of g.heroes) check(h, 30);
    for (const m of g.monsters) check(m, 10);
    for (const m of g.minions) check(m, 0);
    for (const s of g.structures()) check(s, -10);
    return best;
  }
  down(e) {
    if (!this.active()) return;
    this.app.audio.init(); this.updateMouse(e);
    const g = this.game;
    if (e.button === 1) { e.preventDefault(); this.pan = { x: e.clientX, y: e.clientY }; g.camera.locked = false; return; }
    if (e.button === 0) { if (this.aiming) this.castAim(); return; }
    if (e.button === 2) { if (this.aiming) { this.aiming = null; return; } this.rightHeld = true; this.rightClick(true); }
  }
  rightClick(first) {
    const g = this.game, h = g.player; if (h.dead) return;
    const u = this.hoverTarget();
    if (u) g.issueAttack(h, u);
    else { g.issueMove(h, this.mouse.wx, this.mouse.wy); if (first) this.lastMoveT = g.time; }
    this.lastRight = performance.now();
  }
  move(e) {
    this.updateMouse(e);
    if (this.pan && this.game) { const c = this.game.camera, k = 1.25 / c.zoom; c.x -= (e.clientX - this.pan.x) * k; c.y -= (e.clientY - this.pan.y) * k * 1.4; this.pan = { x: e.clientX, y: e.clientY }; }
  }
  mini(e, drag = false, right = false) {
    if (!this.active()) return;
    const g = this.game, r = this.minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * CONFIG.W, wy = (e.clientY - r.top) / r.height * CONFIG.H;
    if (e.button === 2 || right) { g.issueMove(g.player, wx, wy); this.lastMoveT = g.time; return; }
    g.camera.locked = false; g.camera.x = wx; g.camera.y = wy;
  }
  castAim() { const a = this.aiming; this.aiming = null; if (!a || !this.game) return; this.game.castAbility(this.game.player, a.slot, this.mouse.wx, this.mouse.wy); }
  keyDown(e) {
    const g = this.game, key = KeyBindings.norm(e), action = this.K.actionFor(key);
    if (g && g.state === 'playing' && !this.app.menu.isOpen() && (key === 'Tab' || key === ' ' || e.key.startsWith('Arrow'))) e.preventDefault();
    if (e.repeat) return;
    this.keys[key] = true;
    if (!g) return;
    if (e.key === 'Escape') {
      if (this.app.menu.isOpen()) { this.app.menu.escape(); return; }
      if (this.aiming) { this.aiming = null; return; }
      if (this.app.ui.shopOpen()) { this.app.ui.toggleShop(false); return; }
      this.app.menu.openPause(); return;
    }
    if (!this.active()) return;
    const h = g.player;
    if (/^[1-6]$/.test(key) && !action) { g.useItem(h, +key - 1); return; }
    if (action && action.startsWith('ab')) {
      const slot = +action[2];
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (!g.levelUp(h, slot)) g.castFail(h, h.points ? 'Rang maximal pour ce niveau' : 'Aucun point de compétence disponible'); return; }
      if (this.aiming) this.castAim();
      const ab = ABILITIES[h.def.abilities[slot]];
      if (ab.aim === 'self' && !h.dead) { g.castAbility(h, slot, this.mouse.wx, this.mouse.wy); return; }
      this.aiming = { slot, key }; return;
    }
    switch (action) {
      case 'sp0': g.useSpell(h, 0, this.mouse.wx, this.mouse.wy); break;
      case 'sp1': g.useSpell(h, 1, this.mouse.wx, this.mouse.wy); break;
      case 'recall': g.startRecall(h); break;
      case 'shop': this.app.ui.toggleShop(); break;
      case 'stop': g.issueStop(h); break;
      case 'scoreboard': this.app.ui.showScore(true); break;
      case 'camLock': g.camera.locked = !g.camera.locked; g.log(g.camera.locked ? 'Caméra verrouillée sur votre héros' : 'Caméra libre', 'info'); break;
      case 'camCenter': this.centerHeld = true; break;
      case 'showRange': this.showRange = true; break;
    }
  }
  keyUp(e) {
    const key = KeyBindings.norm(e); this.keys[key] = false;
    const action = this.K.actionFor(key);
    if (this.aiming && this.aiming.key === key) this.castAim();
    if (action === 'scoreboard' && this.app.ui) this.app.ui.showScore(false);
    if (action === 'camCenter') this.centerHeld = false;
    if (action === 'showRange') this.showRange = false;
  }
  update(dt) {
    const g = this.game; if (!g) return;
    const cam = g.camera, h = g.player;
    this.hover = this.active() ? this.hoverTarget() : null;
    this.canvas.style.cursor = this.hover ? 'crosshair' : 'default';
    if (this.rightHeld && this.active() && performance.now() - this.lastRight > 140) this.rightClick(false);
    if (cam.focus) { cam.x = Utils.lerp(cam.x, cam.focus.x, Math.min(1, dt * 3)); cam.y = Utils.lerp(cam.y, cam.focus.y, Math.min(1, dt * 3)); }
    else if (cam.locked || this.centerHeld) { cam.x = Utils.lerp(cam.x, h.x, Math.min(1, dt * 10)); cam.y = Utils.lerp(cam.y, h.y, Math.min(1, dt * 10)); }
    else if (!this.app.menu.isOpen()) {
      const sp = 1500 * dt / cam.zoom, m = 8, w = innerWidth, hh = innerHeight;
      if (this.keys['ArrowLeft']) cam.x -= sp; if (this.keys['ArrowRight']) cam.x += sp;
      if (this.keys['ArrowUp']) cam.y -= sp; if (this.keys['ArrowDown']) cam.y += sp;
      if (this.app.settings.edgeScroll && this.mouse.in && document.hasFocus()) {
        if (this.mouse.sx < m) cam.x -= sp; if (this.mouse.sx > w - m) cam.x += sp;
        if (this.mouse.sy < m) cam.y -= sp; if (this.mouse.sy > hh - m) cam.y += sp;
      }
    }
    cam.x = Utils.clamp(cam.x, 0, CONFIG.W); cam.y = Utils.clamp(cam.y, 300, CONFIG.H);
    const w = this.R.toWorld(this.mouse.sx, this.mouse.sy); this.mouse.wx = w.x; this.mouse.wy = w.y;
  }
}
