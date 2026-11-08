// ============ Assemblage et boucle ============
(function () {
  const DEFAULTS = { nick: '', volume: 60, music: true, edgeScroll: true, cameraLocked: true, damageNumbers: true, shadows: true, difficulty: 'normal', hero: 'rouille', role: 'top' };
  const load = () => { try { return JSON.parse(localStorage.getItem('brulees2.settings') || '{}'); } catch (e) { return {}; } };
  const app = {
    game: null, settings: Object.assign({}, DEFAULTS, load()),
    saveSettings() { try { localStorage.setItem('brulees2.settings', JSON.stringify(this.settings)); } catch (e) { /* stockage indisponible */ } },
    saveKeys() { this.settings.keys = this.keys.save(); this.saveSettings(); },
    applySettings() { this.audio.setVolume(this.settings.volume / 100); this.audio.setMusic(this.settings.music); this.renderer.settings.damageNumbers = this.settings.damageNumbers; this.renderer.settings.shadows = this.settings.shadows; },
    startGame(opts) {
      MAP.init(); this.menu.hide(); this.closeNet();
      this.game = new Game({ ...opts, cameraLocked: this.settings.cameraLocked }, this.audio);
      this.game.ui = this.ui;
      if (opts.mode === 'host') new NetHost(this, this.game, this.multi);
      else if (opts.mode === 'client') new NetClient(this, this.game, this.multi);
      this.renderer.setGame(this.game); this.ui.setGame();
      window.game = this.game;
      setTimeout(() => this.game && this.game.time < 4 && this.ui.toast(`Clic droit pour vous déplacer · ${this.keys.label('shop')} : boutique · Ctrl + ${this.keys.label('ab0')} : apprendre une compétence`, 'info'), 800);
    },
    endGame() { this.closeNet(); this.game = null; this.ui.hide(); },
    closeNet() { const g = this.game; if (g && g.net) g.net.close(); if (g && g.remote) g.remote.close(); },
    online() { const g = this.game; return !!(g && (g.net || g.remote)); },
    // Toutes les actions du joueur passent par ici : appliquées directement en solo
    // et chez l'hôte, envoyées à l'hôte quand on est client.
    act(name, ...args) {
      const g = this.game; if (!g) return false;
      const h = g.player;
      if (g.remote) {
        if (name === 'move') { const l = this._last; if (l && l.n === 'move' && Utils.dist(l.x, l.y, args[0], args[1]) < 25 && performance.now() - l.t < 400) return true; this._last = { n: 'move', x: args[0], y: args[1], t: performance.now() }; h.order = { type: 'move', x: args[0], y: args[1] }; }
        else if (name === 'attack') { const l = this._last; if (l && l.n === 'attack' && l.u === args[0] && performance.now() - l.t < 600) return true; this._last = { n: 'attack', u: args[0], t: performance.now() }; h.order = { type: 'attack', target: args[0] }; }
        else { this._last = null; if (name === 'stop' || name === 'cast' || name === 'spell') h.order = null; }
        g.remote.send(name, ...args.map(v => v && typeof v === 'object' ? v.id : v));
        return true;
      }
      switch (name) {
        case 'move': return g.issueMove(h, args[0], args[1]);
        case 'attack': return g.issueAttack(h, args[0]);
        case 'stop': return g.issueStop(h);
        case 'cast': return g.castAbility(h, args[0], args[1], args[2]);
        case 'spell': return g.useSpell(h, args[0], args[1], args[2]);
        case 'recall': return g.startRecall(h);
        case 'level': if (!g.levelUp(h, args[0])) g.castFail(h, h.points ? 'Rang maximal pour ce niveau' : 'Aucun point de compétence disponible'); return true;
        case 'buy': return g.buy(h, args[0]);
        case 'sell': return g.sell(h, args[0]);
        case 'item': return g.useItem(h, args[0]);
      }
      return false;
    },
  };
  if (!HEROES[app.settings.hero]) app.settings.hero = 'rouille';
  if (!ROLES[app.settings.role]) app.settings.role = 'top';
  if (!DIFFICULTY[app.settings.difficulty]) app.settings.difficulty = 'normal';
  const canvas = document.getElementById('gameCanvas'), overlay = document.getElementById('overlay'), minimap = document.getElementById('minimap');
  app.keys = new KeyBindings(app.settings.keys);
  app.audio = new GameAudio();
  app.renderer = new Renderer3D(canvas, overlay);
  app.studio = new Studio();
  app.ui = new UI(app);
  app.input = new Input(app, canvas, minimap);
  app.multi = new Multi(app);
  app.menu = new Menu(app);
  app.applySettings();
  window.app = app;

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0, errors = 0;
  function frame(now) {
    try { step(now); } catch (err) { console.error(err); if (++errors <= 3 && app.game) app.ui.toast('Incident : ' + (err && err.message), 'warn'); last = now; }
    requestAnimationFrame(frame);
  }
  function step(now, background) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const g = app.game;
    if (!g) {
      if (background) return;
      if (!app.renderer.showcase) app.renderer.showcase = new Showcase(app.renderer);
      app.renderer.octx.clearRect(0, 0, overlay.width, overlay.height);
      app.renderer.showcase.render(now / 1000); return;
    }
    if (g.remote) g.update(dt);
    else {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 6) { g.update(STEP); acc -= STEP; n++; }
      if (n >= 6) acc = 0;
      if (g.net) g.net.frame();
    }
    if (background) return;
    app.input.update(dt);
    app.audio.listener = { x: g.camera.x, y: g.camera.y, zoom: 1 };
    app.renderer.render(app.input, dt);
    app.renderer.renderMinimap(minimap, app.ui.portraits);
    app.ui.update(dt);
    if (g.state === 'over' && g.time >= g.endAt && !g.endShown) { g.endShown = true; app.menu.showEnd(g.winner === g.player.team, g.lostMsg); }
  }
  requestAnimationFrame(frame);
  // L'hôte doit continuer à simuler quand son onglet passe en arrière-plan
  // (le navigateur suspend alors requestAnimationFrame).
  let bg = null;
  const stopBg = () => { if (bg) { bg.stop(); bg = null; } };
  document.addEventListener('visibilitychange', () => {
    stopBg();
    if (!document.hidden || !app.game || !app.game.net) return;
    const tick = () => { if (!document.hidden) return stopBg(); try { step(performance.now(), true); } catch (e) { console.error(e); } };
    try {
      const url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 33)'], { type: 'text/javascript' }));
      const w = new Worker(url); w.onmessage = tick; bg = { stop: () => { w.terminate(); URL.revokeObjectURL(url); } };
    } catch (e) { const id = setInterval(tick, 33); bg = { stop: () => clearInterval(id) }; }
  });
})();
