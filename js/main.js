// ============ Assemblage et boucle ============
(function () {
  const DEFAULTS = { volume: 60, music: true, edgeScroll: true, grid: true, ranges: true, difficulty: 'normal', map: 'medium', resources: 'normal' };
  const app = {
    game: null,
    settings: Object.assign({}, DEFAULTS, (() => { try { return JSON.parse(localStorage.getItem('nebula.settings') || '{}'); } catch (e) { return {}; } })()),
    saveSettings() { try { localStorage.setItem('nebula.settings', JSON.stringify(this.settings)); } catch (e) { /* stockage indisponible */ } },
    applySettings() { this.audio.setVolume(this.settings.volume / 100); this.audio.setMusic(this.settings.music); this.renderer.settings.grid = this.settings.grid; this.renderer.settings.ranges = this.settings.ranges; },
    startGame() {
      this.menu.hide();
      this.game = new Game(this.settings, this.audio);
      this.game.ui = this.ui;
      this.renderer.setGame(this.game);
      this.ui.setGame();
      this.audio.play('hyperspace');
      window.game = this.game;
    },
    endGame() { this.game = null; this.ui.hide(); this.renderer.setGame(null); },
  };
  const canvas = document.getElementById('game'), minimap = document.getElementById('minimap');
  app.audio = new GameAudio();
  app.renderer = new Renderer(canvas);
  app.ui = new UI(app);
  app.input = new Input(app, canvas, minimap);
  app.menu = new Menu(app);
  app.applySettings();
  window.app = app;

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const g = app.game;
    if (g) {
      acc += dt * g.speed; let n = 0;
      while (acc >= STEP && n < 10) { g.update(STEP); acc -= STEP; n++; }
      if (n >= 10) acc = 0;
      app.input.update(dt);
      app.audio.listener = { x: g.camera.x, y: g.camera.y, zoom: g.camera.zoom };
      app.renderer.render(app.input);
      app.renderer.renderMinimap(minimap);
      app.ui.update(dt);
    } else app.renderer.renderIdle();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
