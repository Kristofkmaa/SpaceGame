// ============ Studio : portraits 3D, présentoir de sélection, scène du menu ============
const HERO_THEME = {
  briseroc:  { bg: ['#9a5428', '#24120a'], accent: '#ffb347' },
  vipere:    { bg: ['#6a7a3a', '#141a0a'], accent: '#56d0c8' },
  doc:       { bg: ['#3a7a58', '#0a1c12'], accent: '#8cff7a' },
  etincelle: { bg: ['#34649a', '#0a1424'], accent: '#7fdcff' },
  rempart:   { bg: ['#4a5a72', '#10141c'], accent: '#bfeaff' },
  crocs:     { bg: ['#6a3a3a', '#160a0a'], accent: '#ff5a4a' },
  cendre:    { bg: ['#a84a1a', '#200c04'], accent: '#ffa24a' },
  mecano:    { bg: ['#8a7a2a', '#1a1606'], accent: '#ffd24a' },
};
class Studio {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.outputEncoding = THREE.LinearEncoding; this.r.toneMapping = THREE.NoToneMapping;
    this.r.shadowMap.enabled = true; this.r.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffe6c8', '#2a1a10', 0.75));
    this.key = new THREE.DirectionalLight('#ffe0b8', 1.1); this.key.position.set(6, 8, 6); this.key.castShadow = true; this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight('#7fdcff', 1.4); this.rim.position.set(-6, 5, -4); this.scene.add(this.rim);
    this.cam = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
    this.holder = new THREE.Group(); this.scene.add(this.holder);
    this.cache = {};
  }
  clear() { while (this.holder.children.length) this.holder.remove(this.holder.children[0]); }
  // Portrait en buste, mis en cache
  portrait(id, size = 256, team = 0) {
    const key = id + size + team; if (this.cache[key]) return this.cache[key];
    this.clear(); this.r.setSize(size, size, false);
    const P = M3.hero(id, team); this.holder.add(P.root); P.root.rotation.y = 0.55;
    if (P.armR && !P.aimPose) P.armR.rotation.z += 0.2;
    const th = HERO_THEME[id];
    this.rim.color.set(th.accent); this.rim.intensity = 1.8;
    P.root.updateMatrixWorld(true); const hp = P.head.getWorldPosition(new THREE.Vector3());
    this.cam.aspect = 1; this.cam.fov = 26; this.cam.updateProjectionMatrix();
    this.cam.position.set(hp.x + 5.4, hp.y + 0.2, hp.z + 2.1); this.cam.lookAt(hp.x, hp.y - 0.45, hp.z);
    this.r.render(this.scene, this.cam);
    const out = document.createElement('canvas'); out.width = out.height = size; const x = out.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, size); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]); x.fillStyle = g; x.fillRect(0, 0, size, size);
    const sun = x.createRadialGradient(size * 0.7, size * 0.25, 0, size * 0.7, size * 0.25, size * 0.6); sun.addColorStop(0, 'rgba(255,220,160,0.35)'); sun.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = sun; x.fillRect(0, 0, size, size);
    x.drawImage(this.canvas, 0, 0, size, size);
    const v = x.createLinearGradient(0, size * 0.7, 0, size); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = v; x.fillRect(0, 0, size, size);
    this.cache[key] = out; return out;
  }
  // Carte en pied pour la sélection et l'écran versus
  card(id, w, h, team = 0) {
    const key = 'card' + id + w + h + team; if (this.cache[key]) return this.cache[key];
    this.clear(); this.r.setSize(w, h, false);
    const P = M3.hero(id, team); this.holder.add(P.root); P.root.rotation.y = 0.5;
    const th = HERO_THEME[id], box = new THREE.Box3().setFromObject(P.root), H = box.max.y - box.min.y, cy = (box.max.y + box.min.y) / 2;
    this.rim.color.set(th.accent); this.cam.aspect = w / h; this.cam.fov = 30; this.cam.updateProjectionMatrix();
    const dist = H * 0.5 / Math.tan(15 * Math.PI / 180) * 1.12;
    this.cam.position.set(dist * 0.94, cy + H * 0.08, dist * 0.34); this.cam.lookAt(0, cy, 0);
    this.r.render(this.scene, this.cam);
    const out = document.createElement('canvas'); out.width = w; out.height = h; const x = out.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 7; i++) x.fillRect(w * (0.02 + i * 0.15), h * (0.5 - (i % 3) * 0.05), w * 0.09, h);
    const fl = x.createRadialGradient(w / 2, h * 0.9, 0, w / 2, h * 0.9, w * 0.5); fl.addColorStop(0, 'rgba(0,0,0,0.5)'); fl.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = fl; x.fillRect(0, 0, w, h);
    x.drawImage(this.canvas, 0, 0, w, h);
    this.cache[key] = out; return out;
  }
  // Présentoir animé de l'écran de sélection
  startTurntable(container, id) {
    this.stopTurntable();
    container.appendChild(this.canvas); this.canvas.className = 'turntable';
    const w = container.clientWidth || 520, h = container.clientHeight || 600;
    this.r.setSize(w, h, false); this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.clear();
    const P = M3.hero(id, 0); this.holder.add(P.root);
    const ped = M3.cyl(3.4, 3.8, 0.8, '#2a2018', 10); ped.position.y = -0.4; ped.receiveShadow = true; this.holder.add(ped);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.45, 3.7, 40), new THREE.MeshBasicMaterial({ color: HERO_THEME[id].accent, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; this.holder.add(ring);
    this.rim.color.set(HERO_THEME[id].accent);
    const box = new THREE.Box3().setFromObject(P.root), H = box.max.y - box.min.y, cy = (box.max.y + box.min.y) / 2;
    this.cam.aspect = w / h; this.cam.fov = 30; this.cam.updateProjectionMatrix();
    const dist = Math.max(H * 0.5 / Math.tan(15 * Math.PI / 180), 4.2 / Math.tan(15 * Math.PI / 180) / Math.max(0.6, w / h)) * 1.25;
    this.cam.position.set(dist, cy + H * 0.25, 0); this.cam.lookAt(0, cy - H * 0.05, 0);
    let t0 = performance.now(); this.tt = { P, running: true };
    const loop = (now) => {
      if (!this.tt || !this.tt.running) return;
      const t = (now - t0) / 1000;
      P.root.rotation.y = Math.sin(t * 0.45) * 0.9;
      if (P.legL && !P.aimPose) { P.armR.rotation.z = (P.base0 = P.base0 ?? P.armR.rotation.z) + Math.sin(t * 1.4) * 0.08; }
      if (P.coils) for (const c of P.coils) c.children[c.children.length - 1].material.emissiveIntensity = 1.5 + Math.sin(t * 20) * 0.8;
      if (P.flame) P.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);
      this.r.render(this.scene, this.cam);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stopTurntable() { if (this.tt) this.tt.running = false; this.tt = null; if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas); }
}

// Scène d'ambiance du menu principal, rendue par le moteur principal
class Showcase {
  constructor(renderer) {
    this.R = renderer; const scene = this.scene = new THREE.Scene();
    const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256; const s = sky.getContext('2d');
    const g = s.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2a1a2a'); g.addColorStop(0.45, '#8a3a1a'); g.addColorStop(0.62, '#e0883a'); g.addColorStop(0.7, '#4a2a18'); g.addColorStop(1, '#1a100a');
    s.fillStyle = g; s.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(sky); scene.background = tex;
    scene.fog = new THREE.Fog('#5a2a14', 40, 140);
    scene.add(new THREE.HemisphereLight('#ffc890', '#2a1a10', 0.6));
    const sun = new THREE.DirectionalLight('#ffb070', 1.2); sun.position.set(-30, 20, -40); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); scene.add(sun);
    this.fire = new THREE.PointLight('#ff8a30', 2.2, 40, 2); this.fire.position.set(4, 4, 6); scene.add(this.fire);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 40), new THREE.MeshStandardMaterial({ color: '#4e3e2a', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const rnd = Utils.seeded(3);
    for (let i = 0; i < 70; i++) { const a = rnd() * 6.28, d = 14 + rnd() * 90, sz = 1 + rnd() * 5; const m = M3.mesh(M3.geo('dod1', () => new THREE.DodecahedronGeometry(1, 0)), M3.mat(rnd() > 0.5 ? '#5e4e3c' : '#6e5c46')); m.position.set(Math.cos(a) * d, sz * 0.4, Math.sin(a) * d - 10); m.scale.set(sz, sz * (0.6 + rnd()), sz); scene.add(m); }
    for (let i = 0; i < 6; i++) { const w = M3.box(8 + rnd() * 10, 6 + rnd() * 14, 2, '#5a544a'); w.position.set(-50 + i * 22 + rnd() * 6, 4, -60 - rnd() * 30); w.rotation.y = rnd() * 0.6 - 0.3; scene.add(w); }
    const barrel = M3.group(M3.cyl(0.9, 0.9, 2.2, '#6a3a22', 10), M3.at(M3.cone(0.8, 1.6, '#ffb347', 6, { e: '#ff6a10', ei: 2.5 }), 0, 1.7, 0)); barrel.position.set(4, 1.1, 6); scene.add(barrel); this.flame = barrel.children[1];
    const order = ['vipere', 'rempart', 'briseroc', 'etincelle', 'crocs'];
    this.heroes = order.map((id, i) => { const P = M3.hero(id, 0); P.root.position.set(-6 + i * 3.6, 0, (i % 2) * 2.2 - Math.abs(i - 2) * 0.8); P.root.rotation.y = -0.85 + (i - 2) * 0.12; scene.add(P.root); return P; });
    const dustGeo = new THREE.BufferGeometry(), pts = [];
    for (let i = 0; i < 500; i++) pts.push((rnd() - 0.5) * 80, rnd() * 20, (rnd() - 0.5) * 60);
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffd8a0', size: 0.18, transparent: true, opacity: 0.6 })); scene.add(this.dust);
    this.cam = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 400);
  }
  render(t) {
    const c = this.cam;
    c.position.set(Math.sin(t * 0.05) * 6 + 16, 6.5 + Math.sin(t * 0.13) * 0.4, 18 + Math.cos(t * 0.05) * 3); c.lookAt(1.5, 3.4, 0);
    this.fire.intensity = 2 + Math.random() * 0.6; this.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
    this.dust.position.x = (t * 1.5) % 20 - 10; this.dust.rotation.y = t * 0.01;
    this.heroes.forEach((P, i) => { if (P.body) P.body.position.y = Math.sin(t * 1.2 + i) * 0.05; if (P.coils) for (const cc of P.coils) cc.children[cc.children.length - 1].material.emissiveIntensity = 1.5 + Math.sin(t * 20 + i) * 0.8; });
    this.R.r.render(this.scene, c);
  }
}
