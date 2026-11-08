// ============ Assemblage et boucle ============
(function () {
  const DEFAULTS = { volume: 60, music: true, edgeScroll: true, cameraLocked: true, damageNumbers: true, shadows: true, difficulty: 'normal', hero: 'briseroc', role: 'top' };
  const load = () => { try { return JSON.parse(localStorage.getItem('brulees2.settings') || '{}'); } catch (e) { return {}; } };
  const app = {
    game: null, settings: Object.assign({}, DEFAULTS, load()),
    saveSettings() { try { localStorage.setItem('brulees2.settings', JSON.stringify(this.settings)); } catch (e) { /* stockage indisponible */ } },
    saveKeys() { this.settings.keys = this.keys.save(); this.saveSettings(); },
    applySettings() { this.audio.setVolume(this.settings.volume / 100); this.audio.setMusic(this.settings.music); this.renderer.settings.damageNumbers = this.settings.damageNumbers; this.renderer.settings.shadows = this.settings.shadows; },
    startGame(opts) {
      MAP.init(); this.menu.hide();
      this.game = new Game({ ...opts, cameraLocked: this.settings.cameraLocked }, this.audio);
      this.game.ui = this.ui; this.renderer.setGame(this.game); this.ui.setGame();
      window.game = this.game;
      setTimeout(() => this.game && this.game.time < 4 && this.ui.toast(`Clic droit pour vous déplacer · ${this.keys.label('shop')} : boutique · Ctrl + ${this.keys.label('ab0')} : apprendre une compétence`, 'info'), 800);
    },
    endGame() { this.game = null; this.ui.hide(); },
  };
  if (!HEROES[app.settings.hero]) app.settings.hero = 'briseroc';
  if (!ROLES[app.settings.role]) app.settings.role = 'top';
  if (!DIFFICULTY[app.settings.difficulty]) app.settings.difficulty = 'normal';
  const canvas = document.getElementById('gameCanvas'), overlay = document.getElementById('overlay'), minimap = document.getElementById('minimap');
  app.keys = new KeyBindings(app.settings.keys);
  app.audio = new GameAudio();
  app.renderer = new Renderer3D(canvas, overlay);
  app.studio = new Studio();
  app.ui = new UI(app);
  app.input = new Input(app, canvas, minimap);
  app.menu = new Menu(app);
  app.applySettings();
  window.app = app;

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0, errors = 0;
  function frame(now) {
    try { step(now); } catch (err) { console.error(err); if (++errors <= 3 && app.game) app.ui.toast('Incident : ' + (err && err.message), 'warn'); last = now; }
    requestAnimationFrame(frame);
  }
  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const g = app.game;
    if (!g) {
      if (!app.renderer.showcase) app.renderer.showcase = new Showcase(app.renderer);
      app.renderer.octx.clearRect(0, 0, overlay.width, overlay.height);
      app.renderer.showcase.render(now / 1000); return;
    }
    acc += dt; let n = 0;
    while (acc >= STEP && n < 6) { g.update(STEP); acc -= STEP; n++; }
    if (n >= 6) acc = 0;
    app.input.update(dt);
    app.audio.listener = { x: g.camera.x, y: g.camera.y, zoom: 1 };
    app.renderer.render(app.input, dt);
    app.renderer.renderMinimap(minimap, app.ui.portraits);
    app.ui.update(dt);
    if (g.state === 'over' && g.time >= g.endAt && !g.endShown) { g.endShown = true; app.menu.showEnd(g.winner === 0); }
  }
  requestAnimationFrame(frame);
})();
