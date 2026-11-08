// Point d'entrée : assemble les composants et lance la boucle
(function () {
  const canvas = document.getElementById('game');
  const minimap = document.getElementById('minimap');
  const renderer = new Renderer(canvas);
  const ui = new UI();
  const input = new Input(canvas, minimap, renderer);
  input.ui = ui;
  let game = null;
  let difficulty = 'normal';

  for (const b of document.querySelectorAll('.diff')) {
    b.addEventListener('click', () => {
      document.querySelectorAll('.diff').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      difficulty = b.dataset.diff;
    });
  }

  function start() {
    game = new Game(difficulty);
    renderer.setGame(game);
    input.setGame(game);
    ui.setGame(game);
    game.ui = ui;
    window.game = game; // pratique pour le débogage dans la console
  }

  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnRestart').addEventListener('click', () => {
    document.getElementById('endScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('topbar').classList.add('hidden');
    document.getElementById('bottombar').classList.add('hidden');
    game = null;
  });

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    let dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (game) {
      acc += dt * game.speed;
      let n = 0;
      while (acc >= STEP && n < 10) { game.update(STEP); acc -= STEP; n++; }
      if (n >= 10) acc = 0;
      input.update(dt);
      renderer.render(input);
      renderer.renderMinimap(minimap);
      ui.update(dt);
    } else {
      renderer.renderIdle();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
