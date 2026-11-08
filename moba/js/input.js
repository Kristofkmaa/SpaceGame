// ============ Souris, clavier, caméra ============
class Input {
  constructor(app, canvas, minimap) {
    this.app = app; this.canvas = canvas; this.minimap = minimap;
    this.mouse = { sx: 0, sy: 0, wx: 0, wy: 0, in: false };
    this.aiming = null; this.rightHeld = false; this.lastRight = 0; this.keys = {}; this.pan = null; this.hover = null; this.centerHeld = false;
    this.bind();
  }
  get game() { return this.app.game; }
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
    c.addEventListener('wheel', e => { e.preventDefault(); if (!this.game || this.app.menu.isOpen()) return; const cam = this.game.camera; cam.zoom = Utils.clamp(cam.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX); }, { passive: false });
    window.addEventListener('keydown', e => this.keyDown(e));
    window.addEventListener('keyup', e => this.keyUp(e));
    window.addEventListener('blur', () => { this.keys = {}; this.rightHeld = false; });
    this.minimap.addEventListener('mousedown', e => this.mini(e));
    this.minimap.addEventListener('mousemove', e => { if (e.buttons & 1) this.mini(e, true); });
  }
  updateMouse(e) { this.mouse.sx = e.clientX; this.mouse.sy = e.clientY; if (this.game) { const w = this.app.renderer.toWorld(e.clientX, e.clientY); this.mouse.wx = w.x; this.mouse.wy = w.y; } }
  hoverTarget() {
    const g = this.game, mx = this.mouse.wx, my = this.mouse.wy;
    let best = null, bd = Infinity;
    const check = (u, bonus) => { if (!g.isTargetable(u, g.player.team)) return; const d = Utils.dist(mx, my, u.x, u.y) - u.radius - bonus; if (d < 12 && d < bd) { bd = d; best = u; } };
    for (const h of g.heroes) check(h, 8);
    if (best) return best;
    for (const m of g.minions) check(m, 4);
    if (best) return best;
    for (const s of g.structures()) check(s, 0);
    return best;
  }
  down(e) {
    if (!this.active()) return;
    this.app.audio.init();
    this.updateMouse(e);
    const g = this.game;
    if (e.button === 1) { e.preventDefault(); this.pan = { x: e.clientX, y: e.clientY }; g.camera.locked = false; return; }
    if (e.button === 0) { if (this.aiming) this.castAim(); return; }
    if (e.button === 2) {
      if (this.aiming) { this.aiming = null; return; }
      this.rightHeld = true; this.rightClick(true);
    }
  }
  rightClick(first) {
    const g = this.game, h = g.player;
    if (h.dead) return;
    const u = this.hoverTarget();
    if (u) { g.issueAttack(h, u); if (first) g.fx('impact', { x: u.x, y: u.y, size: u.radius + 6, dur: 0.3 }); }
    else { g.issueMove(h, this.mouse.wx, this.mouse.wy); if (first) g.fx('respawn', { x: h.order ? h.order.x : this.mouse.wx, y: h.order ? h.order.y : this.mouse.wy, dur: 0.35 }); }
    this.lastRight = performance.now();
  }
  move(e) {
    this.updateMouse(e);
    if (this.pan && this.game) { const c = this.game.camera; c.x -= (e.clientX - this.pan.x) / c.zoom; c.y -= (e.clientY - this.pan.y) / c.zoom; this.pan = { x: e.clientX, y: e.clientY }; }
  }
  mini(e, drag = false) {
    if (!this.active()) return;
    const g = this.game, r = this.minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * CONFIG.W, wy = (e.clientY - r.top) / r.height * CONFIG.H;
    if (e.button === 2 && !drag) { g.issueMove(g.player, wx, wy); return; }
    g.camera.locked = false; g.camera.x = wx; g.camera.y = wy;
  }
  castAim() {
    const a = this.aiming; this.aiming = null;
    if (!a || !this.game) return;
    this.game.castAbility(this.game.player, a.slot, this.mouse.wx, this.mouse.wy);
  }
  keyDown(e) {
    const g = this.game, key = KeyBindings.norm(e), action = this.K.actionFor(key);
    if (g && g.state === 'playing' && (key === 'Tab' || key === ' ' || e.key.startsWith('Arrow')) && !this.app.menu.isOpen()) e.preventDefault();
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
    if (action && action.startsWith('ab')) {
      const slot = +action[2];
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (!g.levelUp(h, slot)) g.castFail(h, h.points ? 'Rang maximal atteint pour ce niveau' : 'Aucun point de compétence disponible'); return; }
      if (this.aiming) this.castAim();
      const ab = ABILITIES[h.def.abilities[slot]];
      if (ab.aim === 'self' && !h.dead) { g.castAbility(h, slot, this.mouse.wx, this.mouse.wy); return; }
      this.aiming = { slot, key };
      return;
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
    }
  }
  keyUp(e) {
    const key = KeyBindings.norm(e); this.keys[key] = false;
    const action = this.K.actionFor(key);
    if (this.aiming && this.aiming.key === key) this.castAim();
    if (action === 'scoreboard' && this.app.ui) this.app.ui.showScore(false);
    if (action === 'camCenter') this.centerHeld = false;
  }
  update(dt) {
    const g = this.game; if (!g) return;
    const cam = g.camera, h = g.player;
    this.hover = this.active() ? this.hoverTarget() : null;
    if (this.rightHeld && this.active() && performance.now() - this.lastRight > 140) this.rightClick(false);
    if (cam.focus) { cam.x = Utils.lerp(cam.x, cam.focus.x, Math.min(1, dt * 3)); cam.y = Utils.lerp(cam.y, cam.focus.y, Math.min(1, dt * 3)); }
    else if (cam.locked || this.centerHeld) { cam.x = Utils.lerp(cam.x, h.x, Math.min(1, dt * 10)); cam.y = Utils.lerp(cam.y, h.y, Math.min(1, dt * 10)); }
    else if (!this.app.menu.isOpen()) {
      const sp = 1100 * dt / cam.zoom, m = 10, w = window.innerWidth, hh = window.innerHeight;
      if (this.keys['ArrowLeft']) cam.x -= sp; if (this.keys['ArrowRight']) cam.x += sp;
      if (this.keys['ArrowUp']) cam.y -= sp; if (this.keys['ArrowDown']) cam.y += sp;
      if (this.app.settings.edgeScroll && this.mouse.in && document.hasFocus()) {
        if (this.mouse.sx < m) cam.x -= sp; if (this.mouse.sx > w - m) cam.x += sp;
        if (this.mouse.sy < m) cam.y -= sp; if (this.mouse.sy > hh - m) cam.y += sp;
      }
    }
    cam.x = Utils.clamp(cam.x, 0, CONFIG.W); cam.y = Utils.clamp(cam.y, 0, CONFIG.H);
    const w = this.app.renderer.toWorld(this.mouse.sx, this.mouse.sy); this.mouse.wx = w.x; this.mouse.wy = w.y;
  }
}
