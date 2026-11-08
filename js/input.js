// ============ Souris, clavier, caméra ============
class Input {
  constructor(app, canvas, minimap) {
    this.app = app; this.canvas = canvas; this.minimap = minimap;
    this.mouse = { sx: 0, sy: 0, wx: 0, wy: 0, inCanvas: false };
    this.selBox = null; this.keys = {}; this.panDrag = null;
    this.bind();
  }
  get game() { return this.app.game; }
  get renderer() { return this.app.renderer; }
  get ui() { return this.app.ui; }

  bind() {
    const c = this.canvas;
    c.addEventListener('contextmenu', e => e.preventDefault());
    this.minimap.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('mousedown', e => this.onMouseDown(e));
    c.addEventListener('dblclick', e => this.onDblClick(e));
    window.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('mouseup', e => this.onMouseUp(e));
    c.addEventListener('mouseenter', () => this.mouse.inCanvas = true);
    c.addEventListener('mouseleave', () => this.mouse.inCanvas = false);
    c.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    this.minimap.addEventListener('mousedown', e => this.onMinimap(e));
    this.minimap.addEventListener('mousemove', e => { if (e.buttons & 1) this.onMinimap(e, true); });
  }
  updateMouse(e) {
    this.mouse.sx = e.clientX; this.mouse.sy = e.clientY;
    if (this.game) { const w = this.renderer.toWorld(e.clientX, e.clientY); this.mouse.wx = w.x; this.mouse.wy = w.y; }
  }
  active() { return this.game && this.game.state === 'playing' && !this.app.menu.isOpen(); }

  onMouseDown(e) {
    if (!this.active()) return;
    const g = this.game;
    this.updateMouse(e);
    const { wx, wy } = this.mouse;
    if (e.button === 1) { this.panDrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    if (e.button === 0) {
      if (g.mode && g.mode.place) {
        const s = g.placeStructure(g.mode.place, wx, wy, FACTION.PLAYER);
        if (s) { g.log(`Construction lancée : ${s.def.name}.`); if (!e.shiftKey) { g.mode = null; this.ui.setHint(null); } }
        return;
      }
      if (g.mode && g.mode.attackMove) {
        const units = g.selectedUnits(), t = g.entityAt(wx, wy);
        if (t && t.faction === FACTION.ENEMY) g.commandAttack(units, t); else g.commandAttackMove(units, wx, wy);
        g.mode = null; this.ui.setHint(null);
        return;
      }
      this.selBox = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY, shift: e.shiftKey };
      return;
    }
    if (e.button === 2) {
      if (g.mode) { g.mode = null; this.ui.setHint(null); return; }
      this.smartCommand(wx, wy);
    }
  }
  smartCommand(wx, wy) {
    const g = this.game, units = g.selectedUnits(), structures = g.selectedStructures(), t = g.entityAt(wx, wy);
    if (units.length) {
      if (t && t.kind !== 'asteroid' && t.faction === FACTION.ENEMY) g.commandAttack(units, t);
      else if (t && t.kind === 'asteroid') g.commandMine(units, t);
      else if (t && t.kind === 'structure' && t.faction === FACTION.PLAYER && t.def.deposit && units.some(u => u.type === 'collector')) {
        g.commandReturn(units.filter(u => u.type === 'collector')); g.commandMove(units.filter(u => u.type !== 'collector'), wx, wy);
      } else g.commandMove(units, wx, wy);
    } else if (structures.length) g.commandRally(structures.filter(s => s.def.produces), wx, wy);
  }
  onDblClick(e) {
    if (!this.active() || this.game.mode) return;
    const g = this.game; this.updateMouse(e);
    const t = g.entityAt(this.mouse.wx, this.mouse.wy);
    if (t && t.kind === 'unit' && t.faction === FACTION.PLAYER) {
      const view = this.renderer.viewRect();
      g.select(g.units.filter(u => !u.dead && u.faction === FACTION.PLAYER && u.type === t.type && this.renderer.visible(u, view, 0)), e.shiftKey);
    }
  }
  onMouseMove(e) {
    this.updateMouse(e);
    if (this.panDrag && this.game) {
      const c = this.game.camera;
      c.x -= (e.clientX - this.panDrag.x) / c.zoom; c.y -= (e.clientY - this.panDrag.y) / c.zoom;
      this.panDrag = { x: e.clientX, y: e.clientY }; this.clampCamera();
    }
    if (this.selBox) { this.selBox.x2 = e.clientX; this.selBox.y2 = e.clientY; }
  }
  onMouseUp(e) {
    const g = this.game;
    if (e.button === 1) { this.panDrag = null; return; }
    if (e.button !== 0 || !this.selBox || !g) return;
    const b = this.selBox; this.selBox = null;
    if (!this.active()) return;
    const w = Math.abs(b.x2 - b.x1), h = Math.abs(b.y2 - b.y1);
    if (w > 5 || h > 5) {
      const a = this.renderer.toWorld(b.x1, b.y1), c = this.renderer.toWorld(b.x2, b.y2);
      const ents = g.playerEntitiesInRect(a.x, a.y, c.x, c.y);
      if (ents.length || !b.shift) g.select(ents, b.shift);
    } else {
      const wp = this.renderer.toWorld(b.x2, b.y2), t = g.entityAt(wp.x, wp.y, this.renderer.iconMode ? 14 / g.camera.zoom : 6);
      if (t && t.kind !== 'asteroid' && t.faction === FACTION.PLAYER) {
        if (b.shift && g.selection.includes(t)) g.selection = g.selection.filter(s => s !== t); else g.select([t], b.shift);
      } else if (!b.shift) g.selection = [];
    }
  }
  onWheel(e) {
    e.preventDefault();
    if (!this.game || this.app.menu.isOpen()) return;
    const c = this.game.camera, before = this.renderer.toWorld(e.clientX, e.clientY);
    c.zoom = Utils.clamp(c.zoom * (e.deltaY < 0 ? 1.14 : 1 / 1.14), CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);
    const after = this.renderer.toWorld(e.clientX, e.clientY);
    c.x += before.x - after.x; c.y += before.y - after.y; this.clampCamera();
  }
  onMinimap(e, drag = false) {
    if (!this.active()) return;
    const g = this.game, r = this.minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * g.W, wy = (e.clientY - r.top) / r.height * g.H;
    if (e.button === 2 && !drag) { const units = g.selectedUnits(); if (units.length) g.commandAttackMove(units, wx, wy); return; }
    g.camera.x = wx; g.camera.y = wy; this.clampCamera();
  }

  onKeyDown(e) {
    const g = this.game, k = e.key.toLowerCase();
    this.keys[k] = true;
    if (e.key.startsWith('Arrow') || e.key.startsWith('F')) { if (/^F[1-4]$/.test(e.key) || e.key.startsWith('Arrow')) e.preventDefault(); }
    if (!g) return;
    if (e.key === 'Escape') {
      if (this.app.menu.isOpen()) { this.app.menu.escape(); return; }
      if (g.mode) { g.mode = null; this.ui.setHint(null); return; }
      if (this.ui.sideOpen()) { this.ui.closeSide(); return; }
      if (g.selection.length) { g.selection = []; return; }
      this.app.menu.openPause(); return;
    }
    if (this.app.menu.isOpen()) return;
    if (k === 'p') { g.paused = !g.paused; return; }
    if (e.key === '+' || e.key === '=') { this.ui.cycleSpeed(1); return; }
    if (e.key === '-') { this.ui.cycleSpeed(-1); return; }
    if (g.state !== 'playing') return;
    if (k === ' ') { e.preventDefault(); const b = g.playerBase(); if (b) { g.camera.x = b.x; g.camera.y = b.y; } return; }
    if (k === 'b') { this.ui.toggleSide('build'); return; }
    if (k === 'r') { this.ui.toggleSide('research'); return; }
    if (/^[1-5]$/.test(e.key)) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const sel = g.selection.filter(x => x.kind === 'unit'); if (!sel.length) return;
        for (const u of g.units) if (u.group === e.key) u.group = null;
        for (const u of sel) u.group = e.key;
        g.groups[e.key] = sel; g.log(`Groupe ${e.key} assigné (${sel.length} véhicules).`); g.sfx('confirm');
      } else if (g.groups[e.key] && g.groups[e.key].length) {
        const grp = g.groups[e.key].filter(u => !u.dead);
        g.select(grp);
        if (this.lastGroupKey === e.key && performance.now() - this.lastGroupTime < 400 && grp.length) { g.camera.x = grp[0].x; g.camera.y = grp[0].y; }
        this.lastGroupKey = e.key; this.lastGroupTime = performance.now();
      }
      return;
    }
    const units = g.selectedUnits(), structures = g.selectedStructures();
    if (/^F[1-4]$/.test(e.key)) { g.formation = ['none', 'delta', 'wall', 'column'][parseInt(e.key[1]) - 1]; this.ui.refreshCommands(true); return; }
    if (units.length) {
      if (k === 'a' && units.some(u => u.isCombat)) { g.mode = { attackMove: true }; this.ui.setHint('Attaque en mouvement — cliquez sur la destination'); return; }
      if (k === 's') { g.commandStop(units); g.mode = null; this.ui.setHint(null); return; }
      for (const st in STANCES) if (STANCES[st].key.toLowerCase() === k) { g.commandStance(units, st); this.ui.refreshCommands(true); return; }
    }
    const producers = structures.filter(s => s.def.produces && !s.building);
    if (producers.length) for (const type in UNIT_TYPES) if (UNIT_TYPES[type].key.toLowerCase() === k) { this.ui.produce(type); return; }
    for (const type in STRUCTURE_TYPES) { const d = STRUCTURE_TYPES[type]; if (d.key && d.key.toLowerCase() === k) { this.ui.startPlacement(type); return; } }
  }

  update(dt) {
    const g = this.game; if (!g || this.app.menu.isOpen()) return;
    const c = g.camera, sp = CONFIG.CAMERA_SPEED * dt / c.zoom;
    if (this.keys['arrowleft']) c.x -= sp; if (this.keys['arrowright']) c.x += sp;
    if (this.keys['arrowup']) c.y -= sp; if (this.keys['arrowdown']) c.y += sp;
    if (this.app.settings.edgeScroll && this.mouse.inCanvas && !this.selBox && document.hasFocus()) {
      const m = 12, w = window.innerWidth, h = window.innerHeight;
      if (this.mouse.sx < m) c.x -= sp; if (this.mouse.sx > w - m) c.x += sp;
      if (this.mouse.sy < 46 + m && this.mouse.sy > 46) c.y -= sp;
      if (this.mouse.sy > h - 186 - m && this.mouse.sy < h - 186) c.y += sp;
    }
    this.clampCamera();
    const w = this.renderer.toWorld(this.mouse.sx, this.mouse.sy); this.mouse.wx = w.x; this.mouse.wy = w.y;
  }
  clampCamera() { const c = this.game.camera; c.x = Utils.clamp(c.x, 0, this.game.W); c.y = Utils.clamp(c.y, 0, this.game.H); }
}
