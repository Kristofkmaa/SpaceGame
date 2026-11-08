// ============ Rendu 3D (Three.js) ============
class Renderer3D {
  constructor(canvas, overlay) {
    this.canvas = canvas; this.overlay = overlay; this.octx = overlay.getContext('2d');
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.outputEncoding = THREE.LinearEncoding; this.r.toneMapping = THREE.NoToneMapping;
    this.cam = new THREE.PerspectiveCamera(38, 1, 1, 1400);
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.v = new THREE.Vector3();
    this.settings = { damageNumbers: true, shadows: true };
    this.game = null; this.models = new Map(); this.fxObjs = new Map(); this.projObjs = new Map(); this.zoneObjs = new Map();
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.r.setSize(w, h, false); this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.overlay.width = w; this.overlay.height = h;
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    if (this.showcase) { this.showcase.cam.aspect = w / h; this.showcase.cam.updateProjectionMatrix(); }
  }

  // ---------------- Monde statique ----------------
  buildWorld() {
    if (this.scene) return;
    MAP.init();
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a120c');
    scene.fog = new THREE.Fog('#22180f', 170, 360);
    scene.add(new THREE.HemisphereLight('#ffe6c4', '#2a1c10', 0.62));
    const sun = this.sun = new THREE.DirectionalLight('#ffd8a8', 1.05);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120; sc.near = 10; sc.far = 420; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    // Sol peint
    this.groundCanvas = this.paintGround(2048);
    const tex = new THREE.CanvasTexture(this.groundCanvas); tex.anisotropy = this.r.capabilities.getMaxAnisotropy();
    const W = CONFIG.W * S3;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, W / 2); ground.receiveShadow = true; scene.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, W * 4), new THREE.MeshStandardMaterial({ color: '#241a10', roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(W / 2, -0.2, W / 2); scene.add(outer);
    // Rivière toxique
    const len = CONFIG.W * Math.SQRT2 * S3;
    const water = this.water = new THREE.Mesh(new THREE.PlaneGeometry(len, 24, 40, 2), new THREE.MeshStandardMaterial({ color: '#3a4a22', emissive: '#1e3a08', emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.62 }));
    water.rotation.x = -Math.PI / 2; water.rotation.z = -Math.PI / 4; water.position.set(W / 2, 0.18, W / 2); water.receiveShadow = true; scene.add(water);
    this.buildObstacles(scene);
    for (const team of [0, 1]) { const f = M3.fountain(team), p = MAP.fountains[team]; f.position.set(p.x * S3, 0, p.y * S3); scene.add(f); }
    // Brouillard de guerre
    this.fogCanvas = document.createElement('canvas'); this.fogCanvas.width = this.fogCanvas.height = 256;
    this.fogTex = new THREE.CanvasTexture(this.fogCanvas);
    const fog = this.fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({ map: this.fogTex, transparent: true, depthWrite: false }));
    fog.rotation.x = -Math.PI / 2; fog.position.set(W / 2, 0.45, W / 2); fog.renderOrder = 2; scene.add(fog);
    this.ui3d = new THREE.Group(); scene.add(this.ui3d);
    this.buildIndicators();
  }
  paintGround(N) {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), k = N / CONFIG.W, rnd = Utils.seeded(7);
    // Texture de sable répétée
    const tile = document.createElement('canvas'); tile.width = tile.height = 256; const t = tile.getContext('2d');
    t.fillStyle = '#6e5639'; t.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { const px = rnd() * 256, py = rnd() * 256, r = 20 + rnd() * 70; for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { const g = t.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); g.addColorStop(0, rnd() > 0.5 ? 'rgba(140,110,72,0.45)' : 'rgba(70,52,32,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = g; t.fillRect(px + ox - r, py + oy - r, r * 2, r * 2); } }
    for (let i = 0; i < 900; i++) { t.fillStyle = rnd() > 0.5 ? 'rgba(60,46,30,0.35)' : 'rgba(190,168,128,0.25)'; t.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
    x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, N, N);
    // Jungle plus sombre et sèche
    x.fillStyle = 'rgba(40,30,14,0.34)'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 2200; i++) { const px = rnd() * CONFIG.W, py = rnd() * CONFIG.W; if (MAP.distToLanes(px, py) < 280 || MAP.distToRiver(px, py) < 220) continue; x.fillStyle = rnd() > 0.5 ? 'rgba(84,90,44,0.35)' : 'rgba(60,46,26,0.35)'; x.beginPath(); x.arc(px * k, py * k, (2 + rnd() * 5), 0, Math.PI * 2); x.fill(); }
    // Rivière
    x.lineCap = 'round';
    x.strokeStyle = 'rgba(58,48,32,0.9)'; x.lineWidth = 420 * k; x.beginPath(); x.moveTo(150 * k, 150 * k); x.lineTo(4850 * k, 4850 * k); x.stroke();
    x.strokeStyle = 'rgba(34,40,20,0.9)'; x.lineWidth = 260 * k; x.stroke();
    // Bases bétonnées
    MAP.bases.forEach((b, team) => {
      x.fillStyle = '#4e4840'; x.beginPath(); x.arc(b.x * k, b.y * k, 1000 * k, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(30,26,20,0.35)'; x.lineWidth = 1;
      for (let gx = -1000; gx <= 1000; gx += 90) { x.beginPath(); x.moveTo((b.x + gx) * k, (b.y - 1000) * k); x.lineTo((b.x + gx) * k, (b.y + 1000) * k); x.stroke(); x.beginPath(); x.moveTo((b.x - 1000) * k, (b.y + gx) * k); x.lineTo((b.x + 1000) * k, (b.y + gx) * k); x.stroke(); }
      x.strokeStyle = TEAM_INFO[team].color; x.globalAlpha = 0.35; x.lineWidth = 6; x.beginPath(); x.arc(b.x * k, b.y * k, 980 * k, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1;
    });
    // Routes des trois voies
    for (const lane of LANES) {
      const pts = MAP.lanes[lane].pts, path = () => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p.x * k, p.y * k) : x.moveTo(p.x * k, p.y * k)); };
      x.lineJoin = 'round';
      path(); x.strokeStyle = 'rgba(150,120,80,0.4)'; x.lineWidth = 470 * k; x.stroke();
      path(); x.strokeStyle = '#2e2a25'; x.lineWidth = 210 * k; x.stroke();
      path(); x.strokeStyle = 'rgba(96,88,76,0.35)'; x.lineWidth = 190 * k; x.stroke();
      path(); x.strokeStyle = 'rgba(214,180,96,0.45)'; x.lineWidth = 2.2; x.setLineDash([12, 14]); x.stroke(); x.setLineDash([]);
      const L = MAP.lanes[lane];
      x.strokeStyle = 'rgba(24,20,16,0.6)'; x.lineWidth = 1;
      for (let s = 40; s < L.L; s += 34) { const p = L.point(s), off = (rnd() - 0.5) * 170; let px = (p.x + p.nx * off) * k, py = (p.y + p.ny * off) * k; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += (rnd() - 0.5) * 9; py += (rnd() - 0.5) * 9; x.lineTo(px, py); } x.stroke(); }
    }
    // Clairières des camps et fosses épiques
    for (const c of MAP.campSpots) {
      const r = c.epic ? 340 : 190, g = x.createRadialGradient(c.x * k, c.y * k, 0, c.x * k, c.y * k, r * k);
      g.addColorStop(0, c.epic ? 'rgba(30,22,12,0.85)' : 'rgba(70,52,30,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(c.x * k, c.y * k, r * k, 0, Math.PI * 2); x.fill();
      if (c.epic) { x.strokeStyle = 'rgba(200,170,110,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(c.x * k, c.y * k, 300 * k, 0, Math.PI * 2); x.stroke(); }
    }
    return c;
  }
  buildObstacles(scene) {
    const rocks = [], trees = [], cars = [], walls = [], rubble = [], wheels = [], bush = [];
    const rnd = Utils.seeded(99);
    for (const o of MAP.obstacles) {
      const r = o.r * S3, x = o.x * S3, z = o.y * S3;
      if (o.kind === 'wall') { walls.push({ x, z, sx: 9, sy: 3.4 + rnd() * 0.6, sz: 2.4, ry: -o.rot, c: '#7d766a' }); continue; }
      if (o.kind === 'rock' || (o.kind === 'ruin' && o.seed > 0.7)) {
        const n = 2 + Math.floor(o.seed * 3);
        for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = i ? r * 0.55 : 0, s = r * (i ? 0.55 : 0.95); rocks.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, s, sy: s * (0.7 + rnd() * 0.6), ry: rnd() * 6.28, c: rnd() > 0.5 ? '#6e5e4c' : '#7d6a52' }); }
        if (o.seed < 0.3) trees.push({ x: x + r * 0.2, z: z - r * 0.1, s: 0.8 + rnd() * 0.6, ry: rnd() * 6.28 });
      } else if (o.kind === 'wreck') {
        const ry = -o.rot, len = r * 1.6;
        cars.push({ x, z, ry, len, c: Utils.pick(['#7a4a2a', '#6a5a3a', '#5a6a6a', '#8a3a22']) });
        for (const [dx, dz] of [[0.32, 0.5], [0.32, -0.5], [-0.32, 0.5], [-0.32, -0.5]]) wheels.push({ x: x + Math.cos(ry) * dx * len - Math.sin(ry) * dz * 2.2, z: z - Math.sin(ry) * dx * len - Math.cos(ry) * dz * 2.2 });
        if (o.seed > 0.5) rocks.push({ x: x + r * 0.6, z: z + r * 0.4, s: r * 0.4, sy: r * 0.3, ry: 0, c: '#5a4a3a' });
      } else {
        const ry = -o.rot;
        walls.push({ x, z, sx: r * 1.8, sy: 2.2 + o.seed * 3, sz: 0.9, ry, c: '#8a8374' });
        walls.push({ x: x + Math.sin(ry) * r * 0.8, z: z + Math.cos(ry) * r * 0.8, sx: 0.9, sy: 1.6 + o.seed * 2, sz: r * 1.4, ry, c: '#7a7466' });
        for (let i = 0; i < 4; i++) rubble.push({ x: x + (rnd() - 0.5) * r * 1.6, z: z + (rnd() - 0.5) * r * 1.6, s: 0.4 + rnd() * 0.7, ry: rnd() * 6 });
      }
      for (let i = 0; i < 3; i++) { const a = rnd() * 6.28, d = r + 1 + rnd() * 2.5; bush.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, s: 0.5 + rnd() * 0.8 }); }
    }
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const inst = (geo, mat, list, set) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length); m.castShadow = true; m.receiveShadow = true;
      list.forEach((it, i) => { set(dummy, it); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (it.c) m.setColorAt(i, col.set(it.c)); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); return m;
    };
    const flat = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
    inst(new THREE.DodecahedronGeometry(1, 0), flat('#ffffff'), rocks, (d, it) => { d.position.set(it.x, it.sy * 0.55, it.z); d.scale.set(it.s, it.sy, it.s); d.rotation.set(0, it.ry, 0); });
    inst(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff'), walls, (d, it) => { d.position.set(it.x, it.sy / 2, it.z); d.scale.set(it.sx, it.sy, it.sz); d.rotation.set(0, it.ry, 0); });
    inst(new THREE.DodecahedronGeometry(1, 0), flat('#6a645a'), rubble, (d, it) => { d.position.set(it.x, it.s * 0.3, it.z); d.scale.set(it.s, it.s * 0.6, it.s); d.rotation.set(0, it.ry, 0); });
    inst(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff'), cars, (d, it) => { d.position.set(it.x, 1.4, it.z); d.scale.set(it.len, 1.5, 2.6); d.rotation.set(0, it.ry, 0.06); });
    inst(new THREE.BoxGeometry(1, 1, 1), flat('#4a3a2a'), cars, (d, it) => { d.position.set(it.x - Math.cos(it.ry) * it.len * 0.05, 2.6, it.z + Math.sin(it.ry) * it.len * 0.05); d.scale.set(it.len * 0.5, 1.1, 2.3); d.rotation.set(0, it.ry, 0.06); });
    inst(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 10), flat('#1c1a16'), wheels, (d, it) => { d.position.set(it.x, 0.7, it.z); d.scale.set(1, 1, 1); d.rotation.set(Math.PI / 2, 0, 0); });
    inst(new THREE.CylinderGeometry(0.25, 0.45, 9, 6), flat('#4a3a2a'), trees, (d, it) => { d.position.set(it.x, 4.5 * it.s, it.z); d.scale.setScalar(it.s); d.rotation.set(0.08, it.ry, 0); });
    inst(new THREE.CylinderGeometry(0.1, 0.22, 4, 5), flat('#4a3a2a'), trees, (d, it) => { d.position.set(it.x + 1.2 * it.s, 7 * it.s, it.z); d.scale.setScalar(it.s); d.rotation.set(0, it.ry, -0.9); });
    inst(new THREE.CylinderGeometry(0.1, 0.2, 3.4, 5), flat('#4a3a2a'), trees, (d, it) => { d.position.set(it.x - 1 * it.s, 6 * it.s, it.z + 0.4); d.scale.setScalar(it.s); d.rotation.set(0.3, it.ry, 0.8); });
    const tufts = [], pebbles = [], bones = [];
    for (let i = 0; i < 2600; i++) {
      const px = rnd() * CONFIG.W, py = rnd() * CONFIG.W;
      if (MAP.blockedAt(px, py) || MAP.distToLanes(px, py) < 150 || Utils.dist(px, py, CONFIG.BASE_CENTER[0], CONFIG.BASE_CENTER[1]) < 1000 || Utils.dist(px, py, CONFIG.W - CONFIG.BASE_CENTER[0], CONFIG.W - CONFIG.BASE_CENTER[1]) < 1000) continue;
      const roll = rnd();
      if (roll < 0.6) tufts.push({ x: px * S3, z: py * S3, s: 0.5 + rnd() * 0.7, ry: rnd() * 6, c: rnd() > 0.5 ? '#6a6a30' : '#7a6a3a' });
      else if (roll < 0.93) pebbles.push({ x: px * S3, z: py * S3, s: 0.15 + rnd() * 0.35, ry: rnd() * 6 });
      else bones.push({ x: px * S3, z: py * S3, ry: rnd() * 6 });
    }
    inst(new THREE.ConeGeometry(0.5, 1.4, 4), flat('#ffffff'), tufts, (d, it) => { d.position.set(it.x, it.s * 0.6, it.z); d.scale.set(it.s, it.s, it.s); d.rotation.set(0.2, it.ry, 0.15); }).castShadow = false;
    inst(new THREE.DodecahedronGeometry(1, 0), flat('#5e4e3a'), pebbles, (d, it) => { d.position.set(it.x, it.s * 0.3, it.z); d.scale.set(it.s, it.s * 0.6, it.s); d.rotation.set(0, it.ry, 0); }).castShadow = false;
    inst(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 5), flat('#d8ccb0'), bones, (d, it) => { d.position.set(it.x, 0.15, it.z); d.scale.set(1, 1, 1); d.rotation.set(Math.PI / 2, it.ry, 0); }).castShadow = false;
    const bm = inst(new THREE.IcosahedronGeometry(1, 0), flat('#5a5a2e'), bush, (d, it) => { d.position.set(it.x, it.s * 0.4, it.z); d.scale.set(it.s, it.s * 0.6, it.s); d.rotation.set(0, it.s * 9, 0); });
    bm.castShadow = false;
  }
  buildIndicators() {
    const mk = (geo, color, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; this.ui3d.add(m); return m; };
    this.ind = {
      rect: mk(new THREE.PlaneGeometry(1, 1), '#ffe0a0', 0.22), range: mk(new THREE.RingGeometry(0.985, 1, 64), '#ffe0a0', 0.6), disc: mk(new THREE.CircleGeometry(1, 40), '#ffe0a0', 0.22),
      discEdge: mk(new THREE.RingGeometry(0.95, 1, 40), '#ffe0a0', 0.7), cone: mk(new THREE.CircleGeometry(1, 24, 0, 1), '#ffe0a0', 0.22),
      hover: mk(new THREE.RingGeometry(0.85, 1, 32), '#ff5a40', 0.85), target: mk(new THREE.RingGeometry(0.8, 1, 32), '#ff5a40', 0.9),
      towerRange: mk(new THREE.RingGeometry(0.985, 1, 64), '#ff4a30', 0.5), attackRange: mk(new THREE.RingGeometry(0.99, 1, 64), '#bfeaff', 0.25), move: mk(new THREE.RingGeometry(0.6, 1, 24), '#9be28a', 0.9),
    };
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.towerLine = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#ff3a20' })); this.towerLine.visible = false; this.ui3d.add(this.towerLine);
  }

  // ---------------- Partie ----------------
  setGame(g) {
    this.buildWorld();
    this.game = g;
    if (this.gameGroup) { this.scene.remove(this.gameGroup); }
    this.gameGroup = new THREE.Group(); this.scene.add(this.gameGroup);
    this.models.clear(); this.fxObjs.clear(); this.projObjs.clear(); this.zoneObjs.clear(); this.rubbleObjs = new Map();
    for (const s of g.structures()) {
      const P = s.kind === 'tower' ? M3.tower(s.team) : s.kind === 'inhib' ? M3.inhib(s.team) : M3.nexus(s.team);
      P.root.position.set(s.x * S3, 0, s.y * S3); this.gameGroup.add(P.root); this.models.set(s.id, P);
    }
    this.miniBg = null; this.fogT = 0;
  }
  toWorld(sx, sy) {
    const ndc = { x: sx / window.innerWidth * 2 - 1, y: -(sy / window.innerHeight) * 2 + 1 };
    this.ray.setFromCamera(ndc, this.cam);
    const p = this.ray.ray.intersectPlane(this.plane, this.v);
    return p ? { x: p.x / S3, y: p.z / S3 } : { x: 0, y: 0 };
  }
  toScreen(x, y, h = 0) { this.v.set(x * S3, h, y * S3).project(this.cam); return { x: (this.v.x + 1) / 2 * window.innerWidth, y: (1 - this.v.y) / 2 * window.innerHeight, behind: this.v.z > 1 }; }
  unitHeight(u) { const m = this.models.get(u.id); return m && m.height ? m.height * (u.scale || 1) : (u.kind === 'tower' ? 14 : 4); }

  render(input, dt) {
    const g = this.game, t = g.time, cam = g.camera;
    const tx = cam.x * S3, tz = cam.y * S3, z = cam.zoom;
    this.cam.position.set(tx, 82 * z, tz + 54 * z); this.cam.lookAt(tx, 0, tz - 1);
    this.sun.position.set(tx - 90, 160, tz + 70); this.sun.target.position.set(tx, 0, tz); this.sun.castShadow = this.settings.shadows;
    this.water.material.emissiveIntensity = 0.22 + 0.06 * Math.sin(t * 1.5);
    this.syncUnits(t, dt); this.syncProjectiles(); this.syncZones(t); this.syncFx(t);
    this.fogT -= dt; if (this.fogT <= 0) { this.fogT = 0.1; this.drawFog(); }
    this.syncIndicators(input);
    this.r.render(this.scene, this.cam);
    this.drawOverlay(input);
  }

  // ---------------- Unités ----------------
  syncUnits(t, dt) {
    const g = this.game, team = g.player.team, seen = new Set();
    const put = (u, make) => {
      let P = this.models.get(u.id);
      if (!P) { P = make(); this.gameGroup.add(P.root); this.models.set(u.id, P); P.walkK = 0; if (u.kind === 'hero') this.addRing(P, u); }
      seen.add(u.id);
      const vis = !u.dead && (u.team === team || u.vis[team]);
      P.root.visible = vis; if (!vis) return;
      P.root.position.set(u.x * S3, (u.z || 0) * S3, u.y * S3);
      P.root.rotation.y = -u.angle;
      const sc = (u.scale || 1); P.root.scale.setScalar(sc);
      this.animate(P, u, t, dt);
    };
    for (const h of g.heroes) put(h, () => M3.hero(h.heroId, h.team));
    for (const m of g.minions) put(m, () => M3.minion(m.type, m.team));
    for (const m of g.monsters) put(m, () => { const P = M3.monster(m.type); if (P.fly) P.root.position.y = 0; return P; });
    for (const s of g.structures()) {
      const P = this.models.get(s.id); seen.add(s.id);
      if (s.dead) { P.root.visible = false; if (!this.rubbleObjs.has(s.id)) this.rubbleObjs.set(s.id, this.makeRubble(s)); this.rubbleObjs.get(s.id).visible = true; continue; }
      P.root.visible = true; if (this.rubbleObjs.has(s.id)) this.rubbleObjs.get(s.id).visible = false;
      if (P.turret) { P.turret.rotation.y = -s.turretAngle; const kick = t - s.attackAnim < 0.12 ? 0.4 : 0; P.turret.position.x = -kick * Math.cos(s.turretAngle); P.turret.position.z = -kick * Math.sin(s.turretAngle); }
      if (P.flag) P.flag.rotation.y = Math.sin(t * 3 + s.id) * 0.3;
      if (P.crystal) { P.crystal.rotation.y = t * 1.2; P.crystal.position.y = 5 + Math.sin(t * 2 + s.id) * 0.4; }
      if (P.core) P.core.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04);
    }
    for (const [id, P] of this.models) if (!seen.has(id)) { this.gameGroup.remove(P.root); this.models.delete(id); }
  }
  addRing(P, u) {
    const isP = u.isPlayer, col = isP ? '#ffd34d' : TEAM_INFO[u.team].color;
    const ring = new THREE.Mesh(M3.geo('hring', () => new THREE.RingGeometry(0.86, 1, 40)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: isP ? 0.95 : 0.75, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.55; ring.scale.setScalar(u.radius * S3 + 0.5); ring.renderOrder = 4; P.root.add(ring); P.ring = ring;
  }
  makeRubble(s) {
    const g = new THREE.Group(), rnd = Utils.seeded(s.id * 97);
    for (let i = 0; i < 9; i++) { const m = M3.mesh(M3.geo('dod1', () => new THREE.DodecahedronGeometry(1, 0)), M3.mat(rnd() > 0.5 ? '#6f685c' : '#4a443a')); const a = rnd() * 6.28, d = rnd() * s.radius * S3; m.position.set(Math.cos(a) * d, 0.4, Math.sin(a) * d); m.scale.set(0.6 + rnd(), 0.4 + rnd() * 0.5, 0.6 + rnd()); g.add(m); }
    const scorch = new THREE.Mesh(M3.geo('disc', () => new THREE.CircleGeometry(1, 24)), new THREE.MeshBasicMaterial({ color: '#120c08', transparent: true, opacity: 0.6, depthWrite: false })); scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.3; scorch.scale.setScalar(s.radius * S3 * 1.8); g.add(scorch);
    g.position.set(s.x * S3, 0, s.y * S3); this.gameGroup.add(g); return g;
  }
  animate(P, u, t, dt) {
    P.walkK = Utils.lerp(P.walkK || 0, u.moving ? 1 : 0, Math.min(1, dt * 10));
    const w = Math.sin(u.walk * 1.15) * P.walkK;
    if (P.legL) { P.legL.rotation.z = w * 0.65; P.legR.rotation.z = -w * 0.65; }
    if (P.legs) P.legs.forEach((l, i) => l.rotation.z = (i % 3 === 0 ? 1 : -1) * w * 0.6);
    if (P.body && !P.worm) P.body.position.y = (P.bodyY || 0) + Math.abs(w) * 0.18;
    const period = u.kind === 'hero' ? 1 / u.st.as : (u.def.period || 1);
    const at = t - u.attackAnim, dur = Math.min(0.35, period * 0.6), atk = at < dur ? at / dur : -1;
    const cst = t - (u.castAnim || -99), cast = cst < 0.35 ? cst / 0.35 : -1;
    if (P.armR) {
      if (P.base === undefined) P.base = { r: P.armR.rotation.z, l: P.armL.rotation.z };
      if (P.aimPose) { P.armR.rotation.z = P.base.r - (atk >= 0 ? Math.sin(atk * Math.PI) * 0.25 : 0); P.armL.rotation.z = P.base.l; }
      else {
        P.armR.rotation.z = P.base.r - w * 0.5 + (atk >= 0 ? (atk < 0.35 ? -atk / 0.35 * 1.4 : -1.4 + (atk - 0.35) / 0.65 * 2.9) : 0);
        P.armL.rotation.z = P.base.l + w * 0.5;
      }
      if (cast >= 0) { P.armL.rotation.z = P.base.l + Math.sin(cast * Math.PI) * 1.8; if (!P.aimPose) P.armR.rotation.z = P.base.r + Math.sin(cast * Math.PI) * 1.4; }
    }
    if (P.coils) for (const c of P.coils) c.children[c.children.length - 1].material.emissiveIntensity = 1.5 + Math.sin(t * 20 + c.position.z) * 0.8;
    if (P.flame) P.flame.scale.set(1, 0.8 + Math.random() * 0.6 + (atk >= 0 ? 2 : 0), 1);
    if (P.glow) P.glow.material.emissiveIntensity = 0.5 + (atk >= 0 ? 2 : 0) + Math.sin(t * 6) * 0.3;
    if (P.wings) { const f = Math.sin(t * 8 + u.id) * 0.6; P.wings[0].rotation.x = f; P.wings[1].rotation.x = -f; P.body.position.y = Math.sin(t * 2 + u.id) * 0.4; }
    if (P.squash) P.body.scale.set(1, 1 + Math.sin(t * 3 + u.id) * 0.05 - (atk >= 0 ? Math.sin(atk * Math.PI) * 0.15 : 0), 1);
    if (P.core && u.kind === 'monster') P.core.rotation.y = t * 1.5;
    if (P.worm) {
      const rise = atk >= 0 ? Math.sin(atk * Math.PI) * 1.5 : 0;
      P.segs.forEach((s, i) => { const k = i / (P.segs.length - 1); s.position.set(-k * 9 + Math.sin(t * 1.4 + i) * 0.4, Math.sin((1 - k) * Math.PI * 0.55) * (8 + rise) - k * 1.5, Math.sin(t * 0.9 + i * 0.7) * 0.8); });
      P.mouth.position.set(1.2 + Math.sin(t * 1.4) * 0.4, 8.6 + rise, 0);
    }
  }

  // ---------------- Projectiles ----------------
  syncProjectiles() {
    const g = this.game, team = g.player.team, seen = new Set();
    const make = p => {
      const v = p.visual;
      const col = { bullet: '#ffe9a8', dart: '#8cff7a', spark: '#9fe8ff', ember: '#ffa24a', bolt: '#8a6a4a', shell: '#2a251e', flare: TEAM_INFO[p.team] ? TEAM_INFO[p.team].light : '#fff', slug: '#ffe0a0', syringe: '#e8e8e0', spit: '#9ad84a', acid: '#e8d84a' }[v] || '#fff';
      const glow = ['bullet', 'spark', 'ember', 'flare', 'slug', 'spit', 'acid'].includes(v);
      const size = { flare: 1.0, shell: 0.6, spark: 0.55, ember: 0.55, slug: 0.4, acid: 0.9, spit: 0.5 }[v] || 0.32;
      const m = new THREE.Mesh(M3.geo('ps' + size, () => new THREE.SphereGeometry(size, 8, 6)), new THREE.MeshBasicMaterial({ color: col, transparent: glow, opacity: 1, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending }));
      if (v === 'bullet' || v === 'dart' || v === 'syringe' || v === 'bolt') m.scale.set(3, 0.6, 0.6);
      if (v === 'flare' || v === 'spark' || v === 'acid') { const halo = new THREE.Mesh(M3.geo('ps' + size * 2.2, () => new THREE.SphereGeometry(size * 2.2, 8, 6)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); m.add(halo); }
      this.gameGroup.add(m); return m;
    };
    for (const p of g.projectiles) {
      let m = this.projObjs.get(p); if (!m) { m = make(p); this.projObjs.set(p, m); }
      seen.add(p);
      let h = 3.2;
      if (p.high && p.target) { const d = Utils.dist(p.x, p.y, p.target.x, p.target.y); h = 3 + Math.min(9, d * 0.03); }
      if (p.src && p.src.kind === 'monster' && p.src.def.epic === 'worm') h = 6;
      m.position.set(p.x * S3, h, p.y * S3); m.rotation.y = -p.ang;
      const tgt = p.target; m.visible = p.team === team || !tgt || true;
    }
    for (const [p, m] of this.projObjs) if (!seen.has(p)) { this.gameGroup.remove(m); this.projObjs.delete(p); }
  }

  // ---------------- Zones ----------------
  syncZones(t) {
    const g = this.game, team = g.player.team, seen = new Set();
    for (const z of g.zones) {
      if (z.kind === 'trap' && z.team !== team) continue;
      let o = this.zoneObjs.get(z); if (!o) { o = this.makeZone(z); this.zoneObjs.set(z, o); this.gameGroup.add(o.root); }
      seen.add(z); this.updateZone(z, o, t);
    }
    for (const [z, o] of this.zoneObjs) if (!seen.has(z)) { this.gameGroup.remove(o.root); this.zoneObjs.delete(z); }
  }
  makeZone(z) {
    const root = new THREE.Group(), o = { root }; root.position.set(z.x * S3, 0, z.y * S3);
    const disc = (r, col, op, add) => { const m = new THREE.Mesh(M3.geo('disc', () => new THREE.CircleGeometry(1, 32)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); m.position.y = 0.6; m.renderOrder = 3; root.add(m); return m; };
    const ring = (r, col, op) => { const m = new THREE.Mesh(M3.geo('zring', () => new THREE.RingGeometry(0.94, 1, 48)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); m.position.y = 0.62; m.renderOrder = 3; root.add(m); return m; };
    const R = z.r * S3;
    switch (z.kind) {
      case 'gas': o.ring = ring(R, '#8cff7a', 0.5); o.puffs = []; for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(M3.geo('ps1', () => new THREE.SphereGeometry(1, 8, 6)), new THREE.MeshBasicMaterial({ color: '#7ad84a', transparent: true, opacity: 0.22, depthWrite: false })); root.add(p); o.puffs.push(p); } break;
      case 'fire': case 'inferno': o.ring = ring(R, '#ff8a2a', 0.7); o.disc = disc(R, '#ff5a10', 0.18, true); o.flames = []; for (let i = 0; i < (z.kind === 'inferno' ? 16 : 9); i++) { const f = M3.cone(0.6, 2.2, '#ffb347', 5, { e: '#ff6a10', ei: 2 }); f.castShadow = false; const a = i * 2.4, d = Math.sqrt((i + 0.5) / 10) * R * 0.85; f.position.set(Math.cos(a) * d, 1.1, Math.sin(a) * d); root.add(f); o.flames.push(f); } break;
      case 'mine': o.ring = ring(R, '#7fdcff', 0.7); o.disc = disc(R, '#7fdcff', 0.12); root.add(M3.at(M3.cyl(0.9, 1.0, 0.6, '#3a3a3a', 10), 0, 0.3, 0)); o.light = M3.sph(0.35, '#7fdcff', { e: '#3ab8ff', ei: 2 }); o.light.position.y = 0.8; root.add(o.light); break;
      case 'storm': o.ring = ring(R, '#7fdcff', 0.6); o.disc = disc(R, '#1a2a40', 0.35); o.cloud = new THREE.Mesh(M3.geo('ps1', () => new THREE.SphereGeometry(1, 8, 6)), new THREE.MeshBasicMaterial({ color: '#2a3446', transparent: true, opacity: 0.55, depthWrite: false })); o.cloud.scale.set(R, 2.5, R); o.cloud.position.y = 26; root.add(o.cloud); break;
      case 'trap': { const g = M3.group(M3.at(M3.tor(1.4, 0.18, '#8a8a82', { m: 0.6 }), 0, 0.3, 0, Math.PI / 2, 0, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(M3.at(M3.cone(0.16, 0.6, '#b8b8b0', 3), Math.cos(a) * 1.2, 0.5, Math.sin(a) * 1.2, 0, 0, 0)); } g.add(M3.at(M3.cyl(0.3, 0.3, 0.2, TEAM_INFO[z.team].color), 0, 0.3, 0)); root.add(g); o.g = g; break; }
      case 'miniturret': { const g = M3.group(M3.at(M3.cyl(0.8, 1.2, 1.4, '#5a5a52', 6, { m: 0.5 }), 0, 0.7, 0)); const head = M3.group(M3.box(1.4, 0.8, 1.0, TEAM_INFO[z.team].color), M3.at(M3.cyl(0.12, 0.12, 1.6, '#23201a', 6), 0.9, 0, 0, 0, 0, Math.PI / 2)); head.position.y = 1.8; g.add(head); o.head = head; root.add(g); o.ring = ring(R, TEAM_INFO[z.team].color, 0.12); break; }
    }
    return o;
  }
  updateZone(z, o, t) {
    const k = z.delay ? Math.min(1, z.t / z.delay) : 1, fade = z.dur ? Math.min(1, (z.delay + z.dur - z.t) / 0.4) : 1;
    if (o.ring) o.ring.material.opacity = (z.armed ? 0.55 : 0.3 + 0.4 * k) * fade;
    if (o.puffs) o.puffs.forEach((p, i) => { const a = i * 0.7 + t * 0.4, d = (i % 3) * z.r * S3 * 0.3; p.position.set(Math.cos(a) * d, 1.5 + (i % 2), Math.sin(a) * d); p.scale.setScalar(z.r * S3 * (0.4 + (i % 2) * 0.12) * Math.min(1, z.t / 0.4)); p.material.opacity = 0.22 * fade; });
    if (o.flames) o.flames.forEach((f, i) => { const s = z.armed ? 0.7 + Math.random() * 0.6 : 0.2; f.scale.set(s, s * (1 + Math.sin(t * 12 + i)), s); f.visible = z.armed || z.kind === 'fire'; });
    if (o.disc && z.kind === 'inferno') o.disc.material.opacity = z.armed ? 0.25 : 0.1 + 0.2 * k;
    if (o.light) o.light.material.emissiveIntensity = Math.sin(t * 20) > 0 ? 3 : 0.3;
    if (o.disc && z.kind === 'mine') o.disc.scale.setScalar(z.r * S3 * k);
    if (o.cloud) o.cloud.material.opacity = 0.55 * fade;
    if (o.head && z.angle !== undefined) o.head.rotation.y = -z.angle;
    if (o.g) o.g.children.forEach(c => c.material && (c.material.opacity = 1));
  }

  // ---------------- Effets ----------------
  syncFx(t) {
    const g = this.game, seen = new Set();
    for (const e of g.effects) {
      let o = this.fxObjs.get(e);
      if (o === undefined) { o = this.makeFx(e); this.fxObjs.set(e, o); if (o) this.gameGroup.add(o.root); }
      seen.add(e); if (o) this.updateFx(e, o, t);
    }
    for (const [e, o] of this.fxObjs) if (!seen.has(e)) { if (o) { this.gameGroup.remove(o.root); if (o.dispose) o.dispose(); } this.fxObjs.delete(e); }
  }
  basic(col, add = true, op = 1) { return new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide }); }
  makeFx(e) {
    const root = new THREE.Group(), o = { root };
    const ring = (col, add = true) => { const m = new THREE.Mesh(M3.geo('fring1', () => new THREE.RingGeometry(0.8, 1, 40)), this.basic(col, add)); m.rotation.x = -Math.PI / 2; m.position.y = 0.7; root.add(m); return m; };
    const ball = (col, add = true) => { const m = new THREE.Mesh(M3.geo('ps1', () => new THREE.SphereGeometry(1, 10, 8)), this.basic(col, add)); root.add(m); return m; };
    const pos = (x, y, h = 0) => root.position.set(x * S3, h, y * S3);
    switch (e.type) {
      case 'dust': pos(e.x, e.y); o.b = ball('#b8a07a', false); o.b.position.y = 0.8; break;
      case 'impact': case 'snap': pos(e.x, e.y); o.r = ring('#ffe0a0'); break;
      case 'quake': case 'pulse': case 'emp': pos(e.x, e.y); o.r = ring(e.color || (e.type === 'emp' ? '#7fdcff' : '#ffd8a0')); if (e.type === 'quake') { o.b = ball('#a8906a', false); o.b.position.y = 0.5; } break;
      case 'teleport': case 'blink': case 'respawn': pos(e.x, e.y); o.r = ring(e.team !== undefined ? TEAM_INFO[e.team].light : '#bfeaff'); o.col = new THREE.Mesh(M3.geo('cylfx', () => new THREE.CylinderGeometry(1, 1, 1, 16, 1, true)), this.basic(e.team !== undefined ? TEAM_INFO[e.team].color : '#9fe8ff')); root.add(o.col); break;
      case 'levelup': o.follow = true; o.r = ring('#ffd34d'); break;
      case 'explosion': case 'fireburst': case 'death': case 'heroDeath': case 'splash': {
        pos(e.x, e.y); const big = e.type === 'explosion' || (e.type === 'fireburst' && e.big);
        o.b = ball(e.type === 'death' ? '#c8a878' : e.type === 'splash' ? (e.color || '#8cff7a') : '#ffb050'); o.b.position.y = 1.5;
        o.smoke = []; const n = big ? 8 : 4; for (let i = 0; i < n; i++) { const s = ball('#3a3028', false); s.material.opacity = 0.5; o.smoke.push(s); }
        o.size = (e.size || (e.r ? e.r : big ? 120 : 40)) * S3; if (e.type === 'heroDeath') { o.r = ring(TEAM_INFO[e.team].color); o.size = 4; }
        break;
      }
      case 'muzzle': pos(e.x, e.y, 3.4); o.b = ball('#ffe8a0'); break;
      case 'slash': case 'swipe': case 'claw': {
        pos(e.x || 0, e.y || 0, 2.4); const geo = M3.geo('arc', () => new THREE.RingGeometry(0.7, 1, 20, 1, -0.9, 1.8)); o.a = new THREE.Mesh(geo, this.basic(e.color || (e.type === 'claw' ? '#ff6a5a' : '#fff0d0'))); o.a.rotation.x = -Math.PI / 2; root.add(o.a);
        root.rotation.y = -(e.angle || 0); o.size = e.type === 'swipe' ? (e.range || 150) * S3 : e.big ? 6 : 3.2; break;
      }
      case 'volley': case 'flame': {
        pos(e.x, e.y, 1.2); const geo = M3.geo('cone' + e.half.toFixed(2), () => new THREE.CircleGeometry(1, 24, -e.half, e.half * 2)); o.a = new THREE.Mesh(geo, this.basic(e.type === 'flame' ? '#ff7a20' : '#ffe0a0')); o.a.rotation.x = -Math.PI / 2; o.a.scale.setScalar(e.range * S3); root.add(o.a); root.rotation.y = -e.angle;
        if (e.type === 'flame') { o.parts = []; for (let i = 0; i < 12; i++) { const b = ball(i % 2 ? '#ffb347' : '#ff5a10'); o.parts.push({ m: b, a: (Math.random() * 2 - 1) * e.half, d: Math.random() }); } }
        break;
      }
      case 'lightning': case 'strike': {
        const x1 = e.type === 'strike' ? e.x : e.x1, y1 = e.type === 'strike' ? e.y : e.y1, x2 = e.type === 'strike' ? e.x : e.x2, y2 = e.type === 'strike' ? e.y : e.y2;
        const pts = [], n = 9, h1 = e.type === 'strike' ? 40 : 3, h2 = e.type === 'strike' ? 0.5 : 3;
        for (let i = 0; i <= n; i++) { const k = i / n, j = i && i < n ? 1.4 : 0; pts.push(new THREE.Vector3((x1 + (x2 - x1) * k) * S3 + (Math.random() - 0.5) * j * 2, h1 + (h2 - h1) * k + (Math.random() - 0.5) * j, (y1 + (y2 - y1) * k) * S3 + (Math.random() - 0.5) * j * 2)); }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        o.l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: e.color || '#dff6ff', transparent: true, blending: THREE.AdditiveBlending }));
        root.add(o.l); o.dispose = () => geo.dispose();
        if (e.type === 'strike') { o.b = ball('#9fe8ff'); o.b.position.set(e.x * S3, 0.8, e.y * S3); o.r = ring('#9fe8ff'); o.r.position.set(e.x * S3, 0.7, e.y * S3); }
        break;
      }
      case 'stun': case 'taunt': o.follow = true; o.stars = []; for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(M3.geo('tet', () => new THREE.TetrahedronGeometry(0.35)), this.basic(e.type === 'taunt' ? '#ff9a3a' : '#ffe680', false)); root.add(s); o.stars.push(s); } break;
      case 'root': o.follow = true; o.r = ring('#b8b8b0', false); break;
      case 'shield': o.follow = true; o.b = new THREE.Mesh(M3.geo('ps1', () => new THREE.SphereGeometry(1, 12, 10)), this.basic('#dfe8f0', true, 0.18)); root.add(o.b); break;
      case 'healBurst': case 'adrenaline': case 'frenzy': o.follow = true; o.parts = []; for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(M3.geo('cross', () => new THREE.BoxGeometry(0.25, 0.8, 0.25)), this.basic(e.type === 'healBurst' ? '#8cff7a' : '#ff6a5a')); root.add(b); o.parts.push(b); } break;
      default: return null;
    }
    return o;
  }
  updateFx(e, o, t) {
    const k = Utils.clamp(e.t / e.dur, 0, 1), fade = 1 - k;
    if (o.follow) { const u = e.target; if (!u || u.dead) { o.root.visible = false; return; } o.root.position.set(u.x * S3, (u.z || 0) * S3, u.y * S3); }
    const H = e.target ? this.unitHeight(e.target) : 4;
    switch (e.type) {
      case 'dust': o.b.scale.setScalar((e.size || 20) * S3 * (0.5 + k)); o.b.material.opacity = 0.35 * fade; break;
      case 'impact': case 'snap': o.r.scale.setScalar((e.size || 24) * S3 * (0.4 + k)); o.r.material.opacity = fade; break;
      case 'quake': case 'pulse': case 'emp': o.r.scale.setScalar(e.r * S3 * Utils.easeOut(k)); o.r.material.opacity = fade; if (o.b) { o.b.scale.set(e.r * S3 * (0.3 + k * 0.7), 1.5 * fade, e.r * S3 * (0.3 + k * 0.7)); o.b.material.opacity = 0.35 * fade; } break;
      case 'teleport': case 'blink': case 'respawn': o.r.scale.setScalar(2 + k * 4); o.r.material.opacity = fade; o.col.scale.set(2.2 * fade + 0.3, 14, 2.2 * fade + 0.3); o.col.position.y = 7; o.col.material.opacity = 0.45 * fade; break;
      case 'levelup': o.r.scale.setScalar(3 + k); o.r.position.y = 0.5 + k * H; o.r.material.opacity = fade; break;
      case 'explosion': case 'fireburst': case 'death': case 'heroDeath': case 'splash': {
        const s = o.size; o.b.scale.setScalar(s * (0.3 + Utils.easeOut(k) * 0.7)); o.b.material.opacity = (e.type === 'death' ? 0.4 : 0.9) * fade;
        o.smoke.forEach((m, i) => { const a = i / o.smoke.length * Math.PI * 2 + e.x; m.position.set(Math.cos(a) * s * k * 0.9, 1 + k * s * 0.8 + i * 0.2, Math.sin(a) * s * k * 0.9); m.scale.setScalar(s * 0.35 * (0.5 + k)); m.material.opacity = 0.45 * fade; });
        if (o.r) { o.r.scale.setScalar(2 + k * 8); o.r.material.opacity = fade; }
        break;
      }
      case 'muzzle': o.b.scale.setScalar(1.3 * fade + 0.2); o.b.material.opacity = fade; break;
      case 'slash': case 'swipe': case 'claw': o.a.scale.setScalar(o.size * (0.7 + k * 0.4)); o.a.rotation.z = -1 + k * 1.2; o.a.material.opacity = fade; break;
      case 'volley': o.a.material.opacity = 0.35 * fade; break;
      case 'flame': o.a.material.opacity = 0.3 * fade; o.parts.forEach(p => { const d = (p.d + k) % 1 * e.range * S3; p.m.position.set(Math.cos(p.a) * d, 0.5 + d * 0.05, -Math.sin(p.a) * d); p.m.scale.setScalar(0.5 + d * 0.06); p.m.material.opacity = fade * (1 - (p.d + k) % 1); }); break;
      case 'lightning': case 'strike': o.l.material.opacity = fade; if (o.b) { o.b.scale.setScalar(9 * (0.3 + k)); o.b.material.opacity = 0.6 * fade; o.r.scale.setScalar(9 * (0.4 + k)); o.r.material.opacity = fade; } break;
      case 'stun': case 'taunt': o.stars.forEach((s, i) => { const a = t * 6 + i * 2.1; s.position.set(Math.cos(a) * 1.4, H + 0.8, Math.sin(a) * 1.4); s.rotation.y = t * 5; }); break;
      case 'root': o.r.scale.setScalar(e.target.radius * S3 + 0.8); o.r.material.opacity = 0.9; break;
      case 'shield': { const sh = e.target.shieldAmt ? e.target.shieldAmt(this.game.time) : 0; o.b.visible = sh > 0; o.b.scale.set(e.target.radius * S3 + 1.4, H * 0.6 + 0.6, e.target.radius * S3 + 1.4); o.b.position.y = H * 0.5; break; }
      case 'healBurst': case 'adrenaline': case 'frenzy': o.parts.forEach((p, i) => { const a = i * 1.25 + e.t * 2, kk = (k * (e.type === 'healBurst' ? 1 : 3) + i * 0.2) % 1; p.position.set(Math.cos(a) * 1.6, 1 + kk * H, Math.sin(a) * 1.6); p.material.opacity = (1 - kk) * (e.type === 'healBurst' ? fade : 0.8); }); break;
    }
  }

  // ---------------- Indicateurs ----------------
  syncIndicators(input) {
    const g = this.game, h = g.player, I = this.ind;
    for (const k in I) I[k].visible = false;
    this.towerLine.visible = false;
    const at = (m, x, y, yy = 0.7) => m.position.set(x * S3, yy, y * S3);
    if (!h.dead) {
      if (input.aiming) {
        const ab = ABILITIES[h.def.abilities[input.aiming.slot]], mx = input.mouse.wx, my = input.mouse.wy, ang = Utils.angleTo(h.x, h.y, mx, my);
        if (ab.aim === 'line') { I.rect.visible = true; I.rect.scale.set(ab.range * S3, ab.width * S3, 1); at(I.rect, h.x + Math.cos(ang) * ab.range / 2, h.y + Math.sin(ang) * ab.range / 2); I.rect.rotation.z = -ang; }
        else if (ab.aim === 'circle') { I.range.visible = true; I.range.scale.setScalar(ab.range * S3); at(I.range, h.x, h.y); const d = Utils.dist(h.x, h.y, mx, my), k = d > ab.range ? ab.range / d : 1; I.disc.visible = I.discEdge.visible = true; I.disc.scale.setScalar(ab.radius * S3); I.discEdge.scale.setScalar(ab.radius * S3); at(I.disc, h.x + (mx - h.x) * k, h.y + (my - h.y) * k); at(I.discEdge, h.x + (mx - h.x) * k, h.y + (my - h.y) * k); }
        else if (ab.aim === 'self') { I.disc.visible = I.discEdge.visible = true; const r = (ab.radius || 70) * S3; I.disc.scale.setScalar(r); I.discEdge.scale.setScalar(r); at(I.disc, h.x, h.y); at(I.discEdge, h.x, h.y); }
        else if (ab.aim === 'cone') { I.cone.visible = true; I.cone.geometry.dispose(); I.cone.geometry = M3.geo('icone' + ab.angle, () => new THREE.CircleGeometry(1, 24, -ab.angle / 2, ab.angle)); I.cone.scale.setScalar(ab.range * S3); at(I.cone, h.x, h.y); I.cone.rotation.z = -ang; }
        else { I.range.visible = true; I.range.scale.setScalar(ab.range * S3); at(I.range, h.x, h.y); const tg = g.findAbilityTarget(h, ab, mx, my); if (tg) { I.target.visible = true; I.target.material.color.set(ab.aim === 'ally' ? '#8cff7a' : '#ff5a40'); I.target.scale.setScalar(tg.radius * S3 + 1.2); at(I.target, tg.x, tg.y); } }
      }
      if (input.showRange) { I.attackRange.visible = true; I.attackRange.scale.setScalar((h.st.range + h.radius) * S3); at(I.attackRange, h.x, h.y); }
      if (input.hover && input.hover.team !== h.team) { I.hover.visible = true; I.hover.scale.setScalar(input.hover.radius * S3 + 1); at(I.hover, input.hover.x, input.hover.y, 0.75); }
      const o = h.order; if (o && o.type === 'attack' && o.target && !o.target.dead) { I.target.visible = true; I.target.material.color.set('#ff5a40'); I.target.scale.setScalar(o.target.radius * S3 + 1.2); at(I.target, o.target.x, o.target.y, 0.8); }
      if (o && o.type === 'move' && g.time - (input.lastMoveT || 0) < 0.4) { I.move.visible = true; const k = (g.time - input.lastMoveT) / 0.4; I.move.scale.setScalar(2.4 * (1 - k) + 0.4); I.move.material.opacity = 1 - k; at(I.move, o.x, o.y); }
      for (const tw of g.towers) {
        if (tw.dead || tw.team === h.team) continue;
        const d = Utils.dist(tw.x, tw.y, h.x, h.y);
        if (d < TOWER.range + 200) { I.towerRange.visible = true; I.towerRange.scale.setScalar(TOWER.range * S3); at(I.towerRange, tw.x, tw.y); I.towerRange.material.opacity = tw.target === h ? 0.9 : 0.45; }
        if (tw.target === h) { const p = this.towerLine.geometry.attributes.position; p.setXYZ(0, tw.x * S3, 11.3, tw.y * S3); p.setXYZ(1, h.x * S3, 2, h.y * S3); p.needsUpdate = true; this.towerLine.visible = true; }
      }
    }
  }

  // ---------------- Brouillard de guerre ----------------
  drawFog() {
    const g = this.game, f = this.fogCanvas.getContext('2d'), N = 256, k = N / CONFIG.W;
    f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, N, N);
    f.fillStyle = 'rgba(10,6,3,0.62)'; f.fillRect(0, 0, N, N);
    f.globalCompositeOperation = 'destination-out';
    for (const s of g.visSources[g.player.team]) {
      const r = s.r * k, gr = f.createRadialGradient(s.x * k, s.y * k, r * 0.7, s.x * k, s.y * k, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = gr; f.beginPath(); f.arc(s.x * k, s.y * k, r, 0, Math.PI * 2); f.fill();
    }
    f.globalCompositeOperation = 'source-over';
    this.fogTex.needsUpdate = true;
  }

  // ---------------- Calque 2D : barres, noms, chiffres ----------------
  drawOverlay(input) {
    const ctx = this.octx, g = this.game, w = this.overlay.width, hgt = this.overlay.height, team = g.player.team;
    ctx.clearRect(0, 0, w, hgt);
    ctx.textAlign = 'center';
    const bar = (u, width, hh, col, yOff) => {
      const p = this.toScreen(u.x, u.y, this.unitHeight(u) + yOff);
      if (p.behind || p.x < -100 || p.x > w + 100 || p.y < -60 || p.y > hgt + 60) return null;
      const x = Math.round(p.x - width / 2), y = Math.round(p.y);
      ctx.fillStyle = 'rgba(8,6,4,0.85)'; ctx.fillRect(x - 1, y - 1, width + 2, hh + 2);
      ctx.fillStyle = col; ctx.fillRect(x, y, width * Math.max(0, u.hp / u.maxHp), hh);
      return { x, y };
    };
    for (const m of g.minions) if (m.team === team || m.vis[team]) bar(m, m.def.super ? 40 : 30, 4, m.team === team ? TEAM_INFO[0].bar : TEAM_INFO[1].bar, 0.8);
    for (const m of g.monsters) if (m.vis[team] && (m.hp < m.maxHp || input.hover === m)) bar(m, m.def.epic ? 120 : 52, m.def.epic ? 7 : 5, '#d8b860', 1);
    for (const s of g.structures()) {
      if (s.dead) continue;
      const b = bar(s, s.kind === 'nexus' ? 140 : 100, 7, s.team === team ? TEAM_INFO[0].bar : TEAM_INFO[1].bar, 2);
      if (b && !g.isTargetable(s, 1 - s.team)) { ctx.fillStyle = '#e8dcc4'; ctx.fillRect(b.x - 16, b.y - 2, 10, 9); ctx.strokeStyle = '#e8dcc4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x - 11, b.y - 2, 3.5, Math.PI, 0); ctx.stroke(); }
    }
    for (const h of g.heroes) {
      if (h.dead || (h.team !== team && !h.vis[team])) continue;
      const p = this.toScreen(h.x, h.y, this.unitHeight(h) + 2.2 + (h.z || 0) * S3);
      if (p.behind) continue;
      const bw = 92, x = Math.round(p.x - bw / 2 + 9), y = Math.round(p.y);
      const col = h.isPlayer ? '#7fd96a' : h.team === team ? '#3aa6dd' : '#de3f2a';
      ctx.fillStyle = 'rgba(10,8,6,0.88)'; ctx.fillRect(x - 21, y - 3, bw + 23, 17);
      ctx.strokeStyle = 'rgba(201,154,74,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x - 21.5, y - 3.5, bw + 24, 18);
      ctx.fillStyle = '#20180f'; ctx.fillRect(x - 19, y - 1, 16, 13);
      ctx.fillStyle = '#f0e2c4'; ctx.font = "700 11px 'Barlow Condensed', sans-serif"; ctx.fillText(h.level, x - 11, y + 9.5);
      ctx.fillStyle = '#2a1f18'; ctx.fillRect(x, y - 1, bw, 9);
      ctx.fillStyle = col; ctx.fillRect(x, y - 1, bw * h.hp / h.maxHp, 9);
      const sh = h.shieldAmt(g.time); if (sh > 0) { ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x + bw * h.hp / h.maxHp, y - 1, Math.min(bw * sh / h.maxHp, bw * (1 - h.hp / h.maxHp)), 9); }
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; for (let k = 100; k < h.maxHp; k += 100) ctx.fillRect(x + bw * k / h.maxHp, y - 1, 1, k % 1000 ? 4 : 9);
      ctx.fillStyle = '#3e7ad8'; ctx.fillRect(x, y + 9, bw * h.mana / h.maxMana, 3);
      ctx.font = "600 12px 'Barlow Condensed', sans-serif"; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(h.name, p.x + 1, y - 6); ctx.fillStyle = h.isPlayer ? '#ffd76a' : '#f0e2c4'; ctx.fillText(h.name, p.x, y - 7);
      if (h.recall) { const k = (g.time - h.recall.start) / CONFIG.RECALL_TIME; ctx.fillStyle = TEAM_INFO[h.team].light; ctx.fillRect(x, y + 14, bw * k, 3); }
    }
    if (this.settings.damageNumbers) for (const f of g.floats) {
      const k = f.t / f.dur, p = this.toScreen(f.x, f.y, 5 + k * 3);
      ctx.globalAlpha = 1 - k * k; ctx.font = `800 ${f.big ? 22 : 16}px 'Barlow Condensed', sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(f.text, p.x + 1.5, p.y + 1.5); ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // ---------------- Minimap ----------------
  renderMinimap(mm, portraits) {
    const ctx = mm.getContext('2d'), g = this.game, W = mm.width, k = W / CONFIG.W, team = g.player.team;
    if (!this.miniBg) { const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); x.drawImage(this.groundCanvas, 0, 0, W, W); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 0, W, W); x.fillStyle = 'rgba(30,22,14,0.65)'; for (const o of MAP.obstacles) { x.beginPath(); x.arc(o.x * k, o.y * k, o.r * k, 0, Math.PI * 2); x.fill(); } this.miniBg = c; }
    ctx.drawImage(this.miniBg, 0, 0);
    ctx.drawImage(this.fogCanvas, 0, 0, W, W);
    for (const c of g.camps) { if (!c.alive.length) continue; if (!c.alive.some(m => m.vis[team]) && !c.epic) { ctx.fillStyle = 'rgba(216,184,96,0.5)'; ctx.beginPath(); ctx.arc(c.x * k, c.y * k, 2.5, 0, Math.PI * 2); ctx.fill(); continue; } ctx.fillStyle = c.epic ? '#ffb030' : '#d8b860'; ctx.beginPath(); ctx.arc(c.x * k, c.y * k, c.epic ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); }
    for (const s of g.structures()) { if (s.dead) continue; ctx.fillStyle = s.team === team ? TEAM_INFO[0].color : TEAM_INFO[1].color; const r = s.kind === 'nexus' ? 9 : s.kind === 'inhib' ? 6 : 6; ctx.fillRect(s.x * k - r / 2, s.y * k - r / 2, r, r); ctx.strokeStyle = '#100b07'; ctx.lineWidth = 1; ctx.strokeRect(s.x * k - r / 2, s.y * k - r / 2, r, r); }
    for (const m of g.minions) { if (m.team !== team && !m.vis[team]) continue; ctx.fillStyle = m.team === team ? TEAM_INFO[0].light : TEAM_INFO[1].light; ctx.fillRect(m.x * k - 1, m.y * k - 1, 2, 2); }
    for (const h of g.heroes) {
      if (h.dead || (h.team !== team && !h.vis[team])) continue;
      const x = h.x * k, y = h.y * k, r = 8;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      if (portraits && portraits[h.heroId]) ctx.drawImage(portraits[h.heroId], x - r, y - r, r * 2, r * 2); else { ctx.fillStyle = '#444'; ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = h.isPlayer ? '#ffd34d' : h.team === team ? TEAM_INFO[0].color : TEAM_INFO[1].color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Cadre de la caméra
    const c = [this.toWorld(0, 0), this.toWorld(window.innerWidth, 0), this.toWorld(window.innerWidth, window.innerHeight), this.toWorld(0, window.innerHeight)];
    ctx.strokeStyle = 'rgba(255,244,220,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); c.forEach((p, i) => i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)); ctx.closePath(); ctx.stroke();
  }
}
