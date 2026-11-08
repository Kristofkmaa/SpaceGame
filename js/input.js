// Gestion souris / clavier / caméra
class Input {
  constructor(canvas, minimap, renderer) {
    this.canvas = canvas;
    this.minimap = minimap;
    this.renderer = renderer;
    this.game = null;
    this.ui = null;
    this.mouse = { sx: 0, sy: 0, wx: 0, wy: 0, inCanvas: false };
    this.selBox = null;
    this.keys = {};
    this.panDrag = null;
    this.bind();
  }

  setGame(game) { this.game = game; this.selBox = null; this.panDrag = null; }

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
    if (this.game) {
      const w = this.renderer.toWorld(e.clientX, e.clientY);
      this.mouse.wx = w.x; this.mouse.wy = w.y;
    }
  }

  onMouseDown(e) {
    const g = this.game;
    if (!g || g.state !== 'playing') return;
    this.updateMouse(e);
    const { wx, wy } = this.mouse;
    if (e.button === 1) { this.panDrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }

    if (e.button === 0) {
      if (g.mode && g.mode.place) {
        const s = g.placeStructure(g.mode.place, wx, wy, FACTION.PLAYER);
        if (s && !e.shiftKey) g.mode = null;
        if (s) g.message(`Construction : ${s.def.name}`);
        return;
      }
      if (g.mode && g.mode.attackMove) {
        const units = g.selectedUnits();
        const t = g.entityAt(wx, wy);
        if (t && t.faction === FACTION.ENEMY) g.commandAttack(units, t);
        else g.commandAttackMove(units, wx, wy);
        g.mode = null;
        return;
      }
      this.selBox = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY, shift: e.shiftKey };
      return;
    }

    if (e.button === 2) {
      if (g.mode) { g.mode = null; return; }
      this.smartCommand(wx, wy);
    }
  }

  smartCommand(wx, wy) {
    const g = this.game;
    const units = g.selectedUnits();
    const structures = g.selectedStructures();
    const t = g.entityAt(wx, wy);
    if (units.length) {
      if (t && t.kind !== 'asteroid' && t.faction === FACTION.ENEMY) g.commandAttack(units, t);
      else if (t && t.kind === 'asteroid') g.commandMine(units, t);
      else if (t && t.kind === 'structure' && t.faction === FACTION.PLAYER && t.def.deposit && units.some(u => u.type === 'harvester')) {
        g.commandReturn(units.filter(u => u.type === 'harvester'));
        g.commandMove(units.filter(u => u.type !== 'harvester'), wx, wy);
      }
      else g.commandMove(units, wx, wy);
    } else if (structures.length) {
      g.commandRally(structures.filter(s => s.def.produces), wx, wy);
    }
  }

  onDblClick(e) {
    const g = this.game;
    if (!g || g.state !== 'playing' || g.mode) return;
    this.updateMouse(e);
    const t = g.entityAt(this.mouse.wx, this.mouse.wy);
    if (t && t.kind === 'unit' && t.faction === FACTION.PLAYER) {
      const view = this.renderer.viewRect();
      const same = g.units.filter(u => !u.dead && u.faction === FACTION.PLAYER && u.type === t.type && this.renderer.visible(u, view, 0));
      g.select(same, e.shiftKey);
    }
  }

  onMouseMove(e) {
    this.updateMouse(e);
    if (this.panDrag && this.game) {
      const c = this.game.camera;
      c.x -= (e.clientX - this.panDrag.x) / c.zoom;
      c.y -= (e.clientY - this.panDrag.y) / c.zoom;
      this.panDrag = { x: e.clientX, y: e.clientY };
      this.clampCamera();
    }
    if (this.selBox) { this.selBox.x2 = e.clientX; this.selBox.y2 = e.clientY; }
  }

  onMouseUp(e) {
    const g = this.game;
    if (e.button === 1) { this.panDrag = null; return; }
    if (e.button !== 0 || !this.selBox || !g) { return; }
    const b = this.selBox; this.selBox = null;
    if (g.state !== 'playing') return;
    const w = Math.abs(b.x2 - b.x1), h = Math.abs(b.y2 - b.y1);
    if (w > 5 || h > 5) {
      const a = this.renderer.toWorld(b.x1, b.y1), c = this.renderer.toWorld(b.x2, b.y2);
      const ents = g.playerEntitiesInRect(a.x, a.y, c.x, c.y);
      if (ents.length || !b.shift) g.select(ents, b.shift);
    } else {
      const wp = this.renderer.toWorld(b.x2, b.y2);
      const t = g.entityAt(wp.x, wp.y);
      if (t && t.kind !== 'asteroid' && t.faction === FACTION.PLAYER) {
        if (b.shift && g.selection.includes(t)) g.selection = g.selection.filter(s => s !== t);
        else g.select([t], b.shift);
      } else if (!b.shift) {
        g.selection = [];
      }
    }
  }

  onWheel(e) {
    e.preventDefault();
    const g = this.game; if (!g) return;
    const c = g.camera;
    const before = this.renderer.toWorld(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    c.zoom = Utils.clamp(c.zoom * factor, CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);
    const after = this.renderer.toWorld(e.clientX, e.clientY);
    c.x += before.x - after.x; c.y += before.y - after.y;
    this.clampCamera();
  }

  onMinimap(e, drag = false) {
    const g = this.game; if (!g || g.state !== 'playing') return;
    const r = this.minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * CONFIG.WORLD_W;
    const wy = (e.clientY - r.top) / r.height * CONFIG.WORLD_H;
    if (e.button === 2 && !drag) {
      const units = g.selectedUnits();
      if (units.length) g.commandAttackMove(units, wx, wy);
      return;
    }
    g.camera.x = wx; g.camera.y = wy;
    this.clampCamera();
  }

  onKeyDown(e) {
    const g = this.game;
    if (!g) return;
    const k = e.key.toLowerCase();
    this.keys[k] = true;
    if (e.key.startsWith('Arrow')) e.preventDefault();
    if (e.key === 'F1') { e.preventDefault(); this.ui.toggleHelp(); return; }
    if (e.key === 'Escape') {
      if (this.ui.helpOpen()) { this.ui.toggleHelp(); return; }
      if (g.mode) g.mode = null; else g.selection = [];
      return;
    }
    if (k === 'p') { g.paused = !g.paused; return; }
    if (e.key === '+' || e.key === '=') { this.ui.cycleSpeed(1); return; }
    if (e.key === '-') { this.ui.cycleSpeed(-1); return; }
    if (g.state !== 'playing') return;
    if (k === ' ') { e.preventDefault(); const b = g.playerBase(); if (b) { g.camera.x = b.x; g.camera.y = b.y; } return; }

    // Groupes de contrôle
    if (/^[1-5]$/.test(e.key)) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const sel = g.selection.filter(e => e.kind === 'unit');
        if (!sel.length) return;
        for (const u of g.units) if (u.group === e.key) u.group = null;
        for (const u of sel) if (u.kind === 'unit') u.group = e.key;
        g.groups[e.key] = sel;
        g.message(`Groupe ${e.key} créé (${sel.length})`);
      } else if (g.groups[e.key] && g.groups[e.key].length) {
        g.select(g.groups[e.key].filter(u => !u.dead));
      }
      return;
    }

    const units = g.selectedUnits();
    const structures = g.selectedStructures();
    if (k === 'a' && units.some(u => u.isCombat)) { g.mode = { attackMove: true }; return; }
    if (k === 's' && units.length) { g.commandStop(units); g.mode = null; return; }
    // Production
    const producers = structures.filter(s => s.def.produces && !s.building);
    if (producers.length) {
      for (const type in UNIT_TYPES) {
        if (UNIT_TYPES[type].key.toLowerCase() === k) { this.ui.produce(type); return; }
      }
    }
    // Construction
    for (const type in STRUCTURE_TYPES) {
      const d = STRUCTURE_TYPES[type];
      if (d.key && d.key.toLowerCase() === k) { this.ui.startPlacement(type); return; }
    }
  }

  update(dt) {
    const g = this.game; if (!g) return;
    const c = g.camera;
    const sp = CONFIG.CAMERA_SPEED * dt / c.zoom;
    if (this.keys['arrowleft']) c.x -= sp;
    if (this.keys['arrowright']) c.x += sp;
    if (this.keys['arrowup']) c.y -= sp;
    if (this.keys['arrowdown']) c.y += sp;
    // Défilement par les bords
    if (this.mouse.inCanvas && !this.selBox && document.hasFocus()) {
      const m = 14, w = window.innerWidth, h = window.innerHeight;
      if (this.mouse.sx < m) c.x -= sp;
      if (this.mouse.sx > w - m) c.x += sp;
      if (this.mouse.sy < 40 + m && this.mouse.sy > 40) c.y -= sp;
      if (this.mouse.sy > h - 180 - m && this.mouse.sy < h - 180) c.y += sp;
    }
    this.clampCamera();
    const w = this.renderer.toWorld(this.mouse.sx, this.mouse.sy);
    this.mouse.wx = w.x; this.mouse.wy = w.y;
  }

  clampCamera() {
    const c = this.game.camera;
    c.x = Utils.clamp(c.x, 0, CONFIG.WORLD_W);
    c.y = Utils.clamp(c.y, 0, CONFIG.WORLD_H);
  }
}
