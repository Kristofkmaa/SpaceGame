// ============ Modèles 3D low‑poly (Three.js) ============
// Repère : x = avant du modèle, y = haut. 1 unité 3D = 10 unités de simulation.
const S3 = 0.1;
const M3 = {
  geos: new Map(), mats: new Map(),
  geo(key, make) { if (!this.geos.has(key)) this.geos.set(key, make()); return this.geos.get(key); },
  mat(color, o = {}) {
    const key = color + '|' + JSON.stringify(o);
    if (!this.mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, flatShading: o.flat !== false, roughness: o.r !== undefined ? o.r : 0.85, metalness: o.m || 0.05 });
      if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei !== undefined ? o.ei : 1; }
      if (o.t) { m.transparent = true; m.opacity = o.o !== undefined ? o.o : 0.6; m.depthWrite = false; }
      if (o.side) m.side = THREE.DoubleSide;
      this.mats.set(key, m);
    }
    return this.mats.get(key);
  },
  mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; },
  box(w, h, d, c, o) { return this.mesh(this.geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), this.mat(c, o)); },
  cyl(rt, rb, h, c, seg = 8, o) { return this.mesh(this.geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), this.mat(c, o)); },
  sph(r, c, o, ws = 10, hs = 8) { return this.mesh(this.geo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)), this.mat(c, o)); },
  cone(r, h, c, seg = 6, o) { return this.mesh(this.geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), this.mat(c, o)); },
  tor(r, t, c, o, arc = Math.PI * 2) { return this.mesh(this.geo(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 6, 12, arc)), this.mat(c, o)); },
  at(m, x, y, z, rx = 0, ry = 0, rz = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; },
  group(...children) { const g = new THREE.Group(); for (const c of children) g.add(c); return g; },

  // Silhouette humanoïde articulée (jambes et bras pivotants)
  humanoid(o) {
    const g = new THREE.Group(), P = { root: g };
    const hip = o.hip, th = o.torsoH, tw = o.torsoW, td = o.torsoD || tw * 0.62, lw = o.legW, aw = o.armW, al = o.armL;
    const body = new THREE.Group(); g.add(body); P.body = body;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(0, hip, s * (tw * 0.24)); body.add(pivot);
      pivot.add(this.at(this.box(lw, hip * 0.8, lw, o.pants), 0, -hip * 0.42, 0));
      pivot.add(this.at(this.box(lw * 1.35, hip * 0.22, lw * 1.05, o.boots || '#1e1a15'), lw * 0.15, -hip * 0.9, 0));
      P[s < 0 ? 'legL' : 'legR'] = pivot;
    }
    const torso = this.at(this.box(td, th, tw, o.top), 0, hip + th / 2, 0); body.add(torso); P.torso = torso;
    if (o.belt) body.add(this.at(this.box(td * 1.05, th * 0.12, tw * 1.03, o.belt), 0, hip + th * 0.08, 0));
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(0, hip + th * 0.9, s * (tw / 2 + aw / 2)); body.add(pivot);
      pivot.add(this.at(this.box(aw, al, aw, o.sleeve || o.top), 0, -al / 2, 0));
      pivot.add(this.at(this.box(aw * 0.95, aw * 0.8, aw * 0.95, o.skin || '#b08060'), 0, -al - aw * 0.3, 0));
      P[s < 0 ? 'armL' : 'armR'] = pivot;
      const hand = new THREE.Group(); hand.position.set(0, -al - aw * 0.3, 0); pivot.add(hand); P[s < 0 ? 'handL' : 'handR'] = hand;
    }
    const head = new THREE.Group(); head.position.set(0, hip + th + o.headR * 0.95, 0); body.add(head); P.head = head;
    if (!o.noHead) head.add(this.sph(o.headR, o.skin || '#b08060', {}, 8, 6));
    P.height = hip + th + o.headR * 2;
    return P;
  },

  // ---------------- Héros ----------------
  hero(id, team) {
    const T = TEAM_INFO[team].color, G = (...a) => this.group(...a);
    let P;
    switch (id) {
      case 'rouille': {
        P = this.humanoid({ hip: 1.6, torsoH: 2.3, torsoW: 2.5, torsoD: 2.0, legW: 0.85, armW: 0.75, armL: 1.9, headR: 0.68, top: '#8a5e4a', pants: '#4a3a2e', skin: '#d0a888', sleeve: '#8a5e4a', noHead: true, belt: '#2a1e14' });
        P.head.add(this.sph(0.7, '#d0a888', {}, 8, 6));
        P.head.add(this.at(this.sph(0.42, '#e8e4dc', {}, 8, 6), -0.45, 0.45, 0));
        for (const z of [-0.26, 0.26]) P.head.add(this.at(this.cyl(0.2, 0.2, 0.16, '#3a6a6a', 8, { m: 0.5, r: 0.3, e: '#1a4a4a', ei: 0.4 }), 0.52, 0.32, z, 0, 0, Math.PI / 2));
        P.head.add(this.at(this.box(0.1, 0.12, 0.9, '#2a2420'), 0.55, 0.32, 0));
        P.head.add(this.at(this.tor(0.62, 0.18, T), 0, -0.55, 0, Math.PI / 2, 0, 0));
        P.torso.add(this.at(this.box(0.15, 2.0, 1.9, '#5a3a22'), 1.02, -0.3, 0));
        // Bras droit : pince de grue hydraulique
        P.armR.add(this.at(this.cyl(0.55, 0.6, 1.4, '#c8a020', 8, { m: 0.5, r: 0.4 }), 0, -0.9, 0));
        P.armR.add(this.at(this.cyl(0.18, 0.18, 1.8, '#9a9a92', 6, { m: 0.7, r: 0.3 }), 0.4, -1.2, 0.35));
        const claw = G(this.box(0.9, 0.5, 0.9, '#5a5a52', { m: 0.6, r: 0.4 }));
        for (const s of [-1, 1]) claw.add(this.at(this.box(0.3, 1.4, 0.25, '#7a7a72', { m: 0.6, r: 0.4 }), 0.35, -0.6, s * 0.35, 0, 0, s * 0.25));
        claw.position.set(0, -0.2, 0); P.handR.add(claw); P.weapon = claw;
        const pile = G(this.box(1.0, 0.8, 1.4, '#6a5a44'), this.at(this.cyl(0.4, 0.4, 0.3, '#2a2622', 8), 0, 0.6, 0.2, Math.PI / 2, 0, 0), this.at(this.box(0.3, 1.2, 0.3, '#8a4a2a', { m: 0.4 }), -0.1, 0.7, -0.4, 0.3, 0, 0.4));
        pile.position.set(-1.25, 3.0, 0); P.body.add(pile);
        break;
      }
      case 'goudron': {
        P = this.humanoid({ hip: 2.2, torsoH: 2.4, torsoW: 1.6, legW: 0.55, armW: 0.5, armL: 2.25, headR: 0.6, top: '#221c18', pants: '#1a1614', skin: '#8a6a50', sleeve: '#221c18', boots: '#14100c', noHead: true });
        const robe = this.cone(1.35, 3.4, '#1e1814', 8, { r: 0.25, m: 0.3 }); robe.position.set(0, 1.75, 0); P.body.add(robe);
        P.head.add(this.sph(0.72, '#1e1814', { r: 0.3, m: 0.3 }, 8, 6));
        P.head.add(this.at(this.box(0.2, 0.6, 0.7, '#0a0806'), 0.6, -0.1, 0));
        for (const z of [-0.15, 0.15]) P.head.add(this.at(this.sph(0.07, '#ffb347', { e: '#ff8a2a', ei: 2 }, 6, 4), 0.68, 0.0, z));
        P.head.add(this.at(this.cone(0.3, 0.7, '#1e1814', 6, { r: 0.25, m: 0.3 }), -0.3, 0.55, 0, 0, 0, 0.8));
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; P.body.add(this.at(this.sph(0.14, '#9a9282', { m: 0.6, r: 0.3 }, 6, 4), Math.cos(a) * 0.75, 4.35 - Math.abs(Math.sin(a)) * 0.2, Math.sin(a) * 0.75)); }
        P.body.add(this.at(this.box(0.1, 0.5, 0.35, T), 0.62, 4.0, 0));
        for (const hand of [P.handL, P.handR]) hand.add(this.box(0.62, 0.62, 0.62, '#c8b89a'));
        break;
      }
      case 'louve': {
        P = this.humanoid({ hip: 1.5, torsoH: 1.8, torsoW: 1.6, torsoD: 1.2, legW: 0.6, armW: 0.5, armL: 2.1, headR: 0.55, top: '#5a4030', pants: '#3a2e22', skin: '#c8a080', sleeve: '#c8a080', noHead: true });
        P.body.rotation.z = -0.35; P.body.position.y = -0.15;
        P.head.add(this.box(1.0, 0.8, 0.8, '#e0d8c0'));
        P.head.add(this.at(this.box(0.7, 0.4, 0.5, '#d8d0b8'), 0.75, -0.18, 0));
        for (const z of [-0.2, 0.2]) P.head.add(this.at(this.sph(0.13, '#ff3a2a', { e: '#ff2010', ei: 2.2 }, 6, 4), 0.5, 0.12, z));
        for (const z of [-0.32, 0.32]) P.head.add(this.at(this.cone(0.18, 0.6, '#d8d0b8', 4), -0.1, 0.6, z, z, 0, 0));
        for (const x of [0.95, 1.0]) P.head.add(this.at(this.cone(0.05, 0.22, '#f0ece0', 3), x, -0.42, x > 0.97 ? 0.12 : -0.12, Math.PI, 0, 0));
        const cloak = this.cone(1.1, 2.6, '#6a6460', 7); cloak.position.set(-0.4, 2.4, 0); cloak.rotation.z = 0.2; P.body.add(cloak);
        for (let i = 0; i < 6; i++) P.body.add(this.at(this.cone(0.18, 0.7, '#4a4440', 4), -0.8, 2.2 + i * 0.3, (i % 2 ? 0.25 : -0.25), 0, 0, 0.9));
        P.torso.add(this.at(this.box(1.25, 0.3, 1.65, T), 0, -0.55, 0));
        for (const hand of [P.handL, P.handR]) hand.add(this.at(this.box(0.12, 1.1, 0.28, '#b8b8b0', { m: 0.7, r: 0.3 }), 0.3, -0.45, 0, 0, 0, Math.PI * 0.75));
        P.weapon = P.handR.children[0];
        break;
      }
      case 'silo': {
        P = this.humanoid({ hip: 2.2, torsoH: 2.8, torsoW: 3.0, torsoD: 2.2, legW: 1.05, armW: 0.95, armL: 2.4, headR: 0.8, top: '#4a6a7a', pants: '#3a5a6a', skin: '#b08868', sleeve: '#b08868', noHead: true, belt: '#2a3a44' });
        P.head.add(this.sph(0.82, '#b08868', {}, 8, 6));
        P.head.add(this.at(this.cone(0.62, 1.1, '#9a9690', 6), 0.4, -0.7, 0, 0, 0, Math.PI));
        P.head.add(this.at(this.cyl(0.8, 0.86, 0.5, '#5a4a3a', 8), 0, 0.5, 0));
        for (const s of [-1, 1]) P.torso.add(this.at(this.box(0.25, 2.8, 0.35, '#3a5a6a'), 0.95, 0.2, s * 0.8));
        const tank = G(this.cyl(1.3, 1.3, 3.6, '#8a5a3a', 12, { m: 0.4, r: 0.6 }), this.at(this.sph(1.3, '#8a5a3a', { m: 0.4, r: 0.6 }, 12, 6), 0, 1.8, 0), this.at(this.cyl(0.25, 0.25, 0.5, '#4a4a46', 6, { m: 0.6 }), 0, 3.2, 0), this.at(this.tor(0.4, 0.08, '#c83a2a'), 0, 3.5, 0, Math.PI / 2, 0, 0));
        for (const y of [-1.1, 0.2, 1.4]) tank.add(this.at(this.tor(1.32, 0.09, '#4a3a2a', { m: 0.5 }), 0, y, 0, Math.PI / 2, 0, 0));
        tank.add(this.at(this.box(0.1, 0.9, 1.4, T), 1.3, 0.6, 0));
        tank.position.set(-1.9, 4.0, 0); P.body.add(tank);
        const nozzle = G(this.at(this.cyl(0.16, 0.22, 1.6, '#c8a050', 8, { m: 0.7, r: 0.3 }), 0.6, -0.2, 0, 0, 0, Math.PI / 2), this.at(this.sph(0.12, '#9fd8ff', { e: '#5ab8ff', ei: 1.5 }, 6, 4), 1.45, -0.2, 0));
        P.armR.rotation.z = Math.PI / 3; nozzle.rotation.z = -Math.PI / 3; P.handR.add(nozzle); P.weapon = nozzle; P.glow = nozzle.children[1];
        break;
      }
      case 'neon': {
        P = this.humanoid({ hip: 1.75, torsoH: 1.9, torsoW: 1.6, legW: 0.56, armW: 0.48, armL: 1.8, headR: 0.6, top: '#2a2a3a', pants: '#3a2a4a', skin: '#e0b090', boots: '#e8e0d8' });
        for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; P.head.add(this.at(this.cone(0.2, 0.75, '#ff7a2a', 4), Math.cos(a) * 0.35 - 0.1, 0.45, Math.sin(a) * 0.4, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9)); }
        P.head.add(this.at(this.box(0.3, 0.3, 1.1, '#3a3a3a', { m: 0.5 }), 0.3, 0.42, 0));
        for (const z of [-0.25, 0.25]) P.head.add(this.at(this.cyl(0.17, 0.17, 0.1, '#7fdcff', 8, { e: '#3ab8ff', ei: 1.2 }), 0.42, 0.42, z, 0, 0, Math.PI / 2));
        for (const s of [-1, 1]) P.torso.add(this.at(this.box(0.1, 1.9, 0.12, '#ff4ad8', { e: '#ff2ac8', ei: 1.8 }), 0.56, 0, s * 0.42));
        P.torso.add(this.at(this.box(1.15, 0.3, 1.65, T), 0, -0.7, 0));
        for (const leg of [P.legL, P.legR]) { leg.add(this.at(this.box(1.1, 0.18, 0.5, '#2a2a2a'), 0.12, -1.85, 0)); for (const x of [-0.3, 0.45]) leg.add(this.at(this.cyl(0.14, 0.14, 0.4, '#ff4ad8', 8, { e: '#ff2ac8', ei: 1 }), x, -1.98, 0, Math.PI / 2, 0, 0)); }
        for (const arm of [P.armL, P.armR]) for (const y of [-0.5, -0.9, -1.3]) arm.add(this.at(this.tor(0.3, 0.06, '#c87533', { m: 0.6 }), 0, y, 0, Math.PI / 2, 0, 0));
        const coils = [];
        for (const z of [-0.5, 0.5]) {
          const c = G(this.cyl(0.26, 0.34, 2.2, '#3a3026'));
          for (let i = 0; i < 6; i++) c.add(this.at(this.tor(0.34, 0.07, '#c87533', { m: 0.6, r: 0.4 }), 0, -0.8 + i * 0.33, 0, Math.PI / 2, 0, 0));
          c.add(this.at(this.sph(0.3, '#bfeaff', { e: '#7fdcff', ei: 2 }, 8, 6), 0, 1.3, 0));
          c.position.set(-0.95, 3.4, z); P.body.add(c); coils.push(c);
        }
        P.coils = coils;
        const glove = this.sph(0.36, '#7a8a96', { e: '#3ab8ff', ei: 0.6 }); P.handR.add(glove); P.glow = glove;
        break;
      }
      case 'cendre': {
        P = this.humanoid({ hip: 1.9, torsoH: 2.1, torsoW: 1.7, legW: 0.6, armW: 0.52, armL: 1.9, headR: 0.62, top: '#6a1a14', pants: '#4a120e', skin: '#e0c0a8', noHead: true, belt: '#c8a050' });
        const robe = this.cone(1.25, 3.0, '#5a1410', 8); robe.position.set(0, 1.5, 0); P.body.add(robe);
        robe.add(this.at(this.tor(1.05, 0.08, '#c8a050', { m: 0.6 }), 0, -1.2, 0, Math.PI / 2, 0, 0));
        for (const z of [-0.42, 0.42]) { const tank = G(this.cyl(0.38, 0.38, 2.2, '#8a2a18', 10, { m: 0.3, r: 0.5 }), this.at(this.sph(0.38, '#8a2a18', { m: 0.3 }, 10, 6), 0, 1.1, 0), this.at(this.tor(0.4, 0.06, '#c8a050', { m: 0.6 }), 0, 0.3, 0, Math.PI / 2, 0, 0)); tank.position.set(-1.0, 3.0, z); P.body.add(tank); }
        P.head.add(this.box(1.15, 1.2, 1.15, '#3a3a36', { m: 0.4 }));
        P.head.add(this.at(this.box(0.1, 0.3, 0.85, '#ff8a2a', { e: '#ff6a10', ei: 1.6 }), 0.6, 0.05, 0));
        P.head.add(this.at(this.cone(0.95, 1.5, '#4a100c', 8), -0.1, 0.55, 0));
        P.head.add(this.at(this.tor(0.58, 0.14, T), 0, -0.6, 0, Math.PI / 2, 0, 0));
        const censer = G(this.at(this.cyl(0.04, 0.04, 0.9, '#c8a050', 4), 0, -0.4, 0), this.at(this.sph(0.38, '#8a6a30', { m: 0.6, r: 0.4 }, 8, 6), 0, -0.95, 0));
        const flame = this.cone(0.25, 0.8, '#ffb347', 5, { e: '#ff6a10', ei: 2 }); flame.position.set(0, -0.45, 0); flame.castShadow = false; censer.add(flame);
        P.armR.rotation.z = Math.PI / 2.6; censer.rotation.z = -Math.PI / 2.6; P.handR.add(censer); P.weapon = censer; P.flame = flame; P.aimPose = true;
        break;
      }
      case 'comtesse': {
        P = this.humanoid({ hip: 1.95, torsoH: 2.0, torsoW: 1.45, legW: 0.52, armW: 0.44, armL: 1.95, headR: 0.58, top: '#5a1a2e', pants: '#3a1020', skin: '#e8ccb8', sleeve: '#5a1a2e', noHead: true });
        const skirt = this.cone(1.55, 2.6, '#4a1426', 10); skirt.position.set(0, 1.25, 0); P.body.add(skirt);
        skirt.add(this.at(this.tor(1.45, 0.07, '#d8b060', { m: 0.6 }), 0, -1.15, 0, Math.PI / 2, 0, 0));
        P.torso.add(this.at(this.box(0.9, 0.35, 1.5, '#e8e0d0'), 0.15, 0.8, 0));
        P.head.add(this.sph(0.6, '#e8ccb8', {}, 8, 6));
        P.head.add(this.at(this.sph(0.5, '#2a1a14', {}, 8, 6), -0.2, 0.35, 0));
        P.head.add(this.at(this.cyl(0.25, 0.3, 0.6, '#2a1a14', 8), -0.35, 0.8, 0));
        P.head.add(this.at(this.tor(0.15, 0.04, '#d8b060', { m: 0.7 }), 0.55, 0.12, 0.2, 0, Math.PI / 2, 0));
        P.head.add(this.at(this.cyl(0.12, 0.12, 0.02, '#bfeaff', 8, { e: '#7fdcff', ei: 0.8, t: true, o: 0.7 }), 0.56, 0.12, 0.2, 0, 0, Math.PI / 2));
        P.head.add(this.at(this.cyl(0.55, 0.55, 0.12, '#1a0a10', 10), 0.05, 0.6, 0, 0, 0, -0.2));
        P.head.add(this.at(this.cone(0.08, 1.3, T, 4), -0.2, 1.1, 0.3, 0.4, 0, 0.6));
        const rifle = G(this.at(this.cyl(0.07, 0.07, 4.6, '#2b2722', 6, { m: 0.6 }), 1.7, 0, 0, 0, 0, Math.PI / 2), this.at(this.box(1.5, 0.32, 0.24, '#6a3a1e'), -0.3, -0.1, 0), this.at(this.cyl(0.12, 0.12, 0.9, '#3a3a36', 8, { m: 0.6 }), 0.5, 0.22, 0, 0, 0, Math.PI / 2), this.at(this.box(0.5, 0.06, 0.24, '#d8b060', { m: 0.7 }), 0.2, 0.0, 0));
        P.armR.rotation.z = Math.PI / 2.3; P.armL.rotation.z = Math.PI / 2.6;
        rifle.position.set(0, -0.2, 0); rifle.rotation.z = -Math.PI / 2.3; P.handR.add(rifle); P.weapon = rifle; P.aimPose = true;
        break;
      }
      case 'gaspard': {
        P = this.humanoid({ hip: 1.9, torsoH: 2.6, torsoW: 2.8, torsoD: 2.3, legW: 0.95, armW: 0.85, armL: 2.0, headR: 0.75, top: '#e0d8c8', pants: '#3a3a3a', skin: '#d09070', sleeve: '#e0d8c8', noHead: true });
        P.torso.add(this.at(this.sph(1.3, '#e0d8c8', {}, 10, 8), 0.4, -0.3, 0));
        P.torso.add(this.at(this.box(0.2, 1.8, 1.8, '#f0ece0'), 1.25, -0.5, 0));
        P.head.add(this.sph(0.78, '#d09070', {}, 8, 6));
        P.head.add(this.at(this.cyl(0.62, 0.55, 1.2, '#f4f0e8', 10), -0.05, 0.95, 0));
        P.head.add(this.at(this.sph(0.75, '#f4f0e8', {}, 10, 6), -0.05, 1.6, 0));
        P.head.add(this.at(this.box(0.25, 0.18, 0.9, '#3a2418'), 0.72, -0.18, 0));
        P.head.add(this.at(this.tor(0.66, 0.16, T), 0, -0.65, 0, Math.PI / 2, 0, 0));
        P.torso.add(this.at(this.tor(1.3, 0.12, '#c8a050', { m: 0.6 }), 0.2, 0.2, 0, 0.9, 0, 0));
        const gun = G(this.at(this.cyl(0.55, 0.55, 1.0, '#3a3a36', 10, { m: 0.6, r: 0.4 }), 0.2, 0, 0, 0, 0, Math.PI / 2));
        const barrels = G(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; barrels.add(this.at(this.cyl(0.1, 0.1, 2.4, '#4a4a46', 6, { m: 0.7, r: 0.3 }), 0, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, 0, Math.PI / 2)); }
        barrels.position.set(1.8, 0, 0); gun.add(barrels);
        gun.add(this.at(this.cyl(0.6, 0.6, 0.6, '#6a5a2a', 10, { m: 0.5 }), -0.2, -0.6, 0.5, Math.PI / 2, 0, 0));
        P.armR.rotation.z = Math.PI / 2.8; P.armL.rotation.z = Math.PI / 2.5;
        gun.position.set(0.2, -0.3, -0.4); gun.rotation.z = -Math.PI / 2.8; P.handR.add(gun); P.weapon = gun; P.spin = barrels; P.aimPose = true;
        break;
      }
      case 'suture': {
        P = this.humanoid({ hip: 2.0, torsoH: 2.1, torsoW: 1.6, legW: 0.56, armW: 0.5, armL: 2.0, headR: 0.62, top: '#2a2a26', pants: '#2a2622', skin: '#c99a74', sleeve: '#2a2a26', noHead: true });
        const coat = this.cyl(0.9, 1.3, 2.4, '#3a3630', 8); coat.position.set(0, 1.5, 0); P.body.add(coat);
        for (const [y, z] of [[1.0, 0.6], [1.6, -0.5], [2.2, 0.3]]) coat.add(this.at(this.box(0.04, 0.4, 0.05, '#e8e0c0'), 1.0, y - 1.5, z, 0.5, 0, 0));
        P.head.add(this.sph(0.66, '#3a3630', {}, 8, 6));
        P.head.add(this.at(this.cone(0.3, 1.5, '#d8ccb0', 6), 1.15, -0.25, 0, 0, 0, -Math.PI / 2 - 0.25));
        for (const z of [-0.26, 0.26]) P.head.add(this.at(this.cyl(0.2, 0.2, 0.12, '#8cff7a', 8, { e: '#3aff2a', ei: 1.3 }), 0.55, 0.15, z, 0, 0, Math.PI / 2));
        P.head.add(this.at(this.cyl(0.42, 0.5, 0.9, '#1a1814', 8), -0.05, 0.85, 0));
        P.head.add(this.at(this.cyl(0.85, 0.85, 0.08, '#1a1814', 10), -0.05, 0.42, 0));
        P.head.add(this.at(this.box(0.08, 0.15, 0.86, T), 0.0, 0.5, 0));
        const bag = G(this.box(0.9, 0.7, 0.5, '#5a3a22'), this.at(this.box(0.3, 0.3, 0.52, '#e8e0d0'), 0, 0.05, 0), this.at(this.box(0.1, 0.3, 0.06, '#c83a2a'), 0, 0.05, 0.27), this.at(this.box(0.3, 0.1, 0.06, '#c83a2a'), 0, 0.05, 0.27));
        bag.position.set(0, 1.9, -1.0); P.body.add(bag);
        const gun = G(this.at(this.cyl(0.16, 0.16, 1.6, '#6a6458'), 0.7, 0, 0, 0, 0, Math.PI / 2), this.at(this.cyl(0.13, 0.13, 0.8, '#8cff7a', 6, { e: '#3aff2a', ei: 0.8 }), 0.6, 0.18, 0, 0, 0, Math.PI / 2), this.at(this.cyl(0.03, 0.03, 0.9, '#e0e0d8'), 1.9, 0, 0, 0, 0, Math.PI / 2));
        P.armR.rotation.z = Math.PI / 2.4; gun.rotation.z = -Math.PI / 2.4; P.handR.add(gun); P.weapon = gun; P.aimPose = true;
        break;
      }
      case 'crieur': {
        P = this.humanoid({ hip: 1.9, torsoH: 2.2, torsoW: 2.0, legW: 0.7, armW: 0.6, armL: 1.9, headR: 0.66, top: '#a8a03a', pants: '#3a3a44', skin: '#8a5a3a', sleeve: '#a8a03a' });
        P.head.add(this.at(this.box(0.2, 0.3, 1.0, '#141414', { m: 0.6, r: 0.2 }), 0.55, 0.1, 0));
        for (const z of [-0.68, 0.68]) P.head.add(this.at(this.cyl(0.32, 0.32, 0.25, '#2a2a2a', 10), 0, 0, z, Math.PI / 2, 0, 0));
        P.head.add(this.at(this.tor(0.68, 0.08, '#2a2a2a', {}, Math.PI), 0, 0, 0, 0, Math.PI / 2, 0));
        P.torso.add(this.at(this.box(1.45, 0.4, 2.05, T), 0, 0.6, 0));
        const horn = G(this.at(this.cone(1.1, 1.8, '#d8d0b8', 12, { side: true }), 0.6, 0, 0, 0, 0, Math.PI / 2), this.at(this.cyl(0.35, 0.35, 0.6, '#3a3a36', 8), -0.5, 0, 0, 0, 0, Math.PI / 2));
        horn.scale.setScalar(0.7); horn.position.set(-1.0, 4.3, 1.25); horn.rotation.y = -0.5; horn.rotation.z = 0.35; P.body.add(horn);
        P.body.add(this.at(this.box(0.8, 1.4, 1.4, '#4a4a52'), -1.15, 3.0, 0));
        const ant = G(this.at(this.cyl(0.04, 0.05, 3.0, '#9a9a92', 4), 0, 1.5, 0)), light = this.sph(0.16, '#ff4a3a', { e: '#ff2010', ei: 2 }, 6, 4); light.position.y = 3.05; ant.add(light);
        ant.position.set(-1.3, 3.6, -0.5); P.body.add(ant); P.glow = light;
        const mic = G(this.at(this.cyl(0.08, 0.1, 0.6, '#2a2a2a', 6), 0.3, 0, 0, 0, 0, Math.PI / 2), this.at(this.sph(0.2, '#5a5a5a', { m: 0.5 }, 8, 6), 0.65, 0, 0));
        P.armR.rotation.z = Math.PI / 2.4; mic.rotation.z = -Math.PI / 2.4; P.handR.add(mic); P.weapon = mic; P.aimPose = true;
        break;
      }
      case 'balafre': {
        P = this.humanoid({ hip: 2.0, torsoH: 2.2, torsoW: 1.85, legW: 0.66, armW: 0.56, armL: 2.0, headR: 0.62, top: '#e08a20', pants: '#2a2a34', skin: '#b88a68', sleeve: '#2a2a34' });
        for (const y of [-0.3, 0.4]) P.torso.add(this.at(this.box(1.12, 0.14, 1.87, '#e8e8e0', { e: '#a8a8a0', ei: 0.3 }), 0, y, 0));
        P.head.add(this.at(this.cyl(0.64, 0.66, 0.35, '#1e2a44', 10), 0, 0.42, 0));
        P.head.add(this.at(this.box(0.55, 0.08, 0.9, '#1e2a44'), 0.55, 0.3, 0));
        P.head.add(this.at(this.box(0.06, 0.7, 0.08, '#a82a1a'), 0.6, -0.05, 0.12, 0.6, 0, 0));
        P.torso.add(this.at(this.box(1.2, 0.35, 1.9, T), 0, -0.85, 0));
        const sword = G(this.at(this.box(0.12, 3.1, 0.34, '#e4e8ec', { m: 0.3, r: 0.3, e: '#8a9098', ei: 0.35 }), 0, 1.75, 0), this.at(this.box(0.2, 0.15, 0.9, '#3a3a36', { m: 0.6 }), 0, 0.15, 0), this.at(this.cyl(0.11, 0.11, 0.7, '#2a1a10', 6), 0, -0.25, 0), this.at(this.box(0.13, 0.5, 0.1, '#e08a20'), 0, 2.6, 0));
        sword.position.set(0.25, -0.1, 0); sword.rotation.z = -1.0; P.handR.add(sword); P.weapon = sword;
        break;
      }
      case 'vase': {
        P = this.humanoid({ hip: 1.9, torsoH: 2.0, torsoW: 1.65, legW: 0.58, armW: 0.48, armL: 1.9, headR: 0.6, top: '#2e5a64', pants: '#5a4a3a', skin: '#c8946a', sleeve: '#2e5a64', boots: '#1a120c', noHead: true });
        const tails = this.cone(1.15, 2.4, '#26505a', 8); tails.position.set(-0.15, 1.9, 0); P.body.add(tails);
        P.torso.add(this.at(this.box(1.1, 0.4, 1.7, '#a82a24'), 0, -0.8, 0));
        P.torso.add(this.at(this.box(0.2, 1.4, 0.6, '#e8e0d0'), 0.55, 0.2, 0));
        P.head.add(this.sph(0.6, '#c8946a', {}, 8, 6));
        P.head.add(this.at(this.sph(0.5, '#3a2014', {}, 8, 6), -0.25, 0.1, 0));
        const hat = G(this.cyl(0.95, 0.95, 0.12, '#1a1410', 3), this.at(this.cyl(0.5, 0.58, 0.55, '#1a1410', 8), 0, 0.3, 0), this.at(this.tor(0.52, 0.06, '#d8b060', { m: 0.6 }), 0, 0.1, 0, Math.PI / 2, 0, 0));
        hat.add(this.at(this.cone(0.1, 1.2, '#f0ece0', 4), -0.3, 0.6, 0.35, 0.5, 0, 0.7)); hat.add(this.at(this.box(0.3, 0.2, 0.6, T), 0.45, 0.25, 0));
        hat.position.set(0, 0.5, 0); hat.rotation.y = Math.PI / 6; P.head.add(hat);
        const saber = G(this.at(this.box(0.1, 2.6, 0.32, '#e4e8ec', { m: 0.3, r: 0.3, e: '#8a9098', ei: 0.35 }), 0.15, 1.5, 0, 0, 0, -0.12), this.at(this.tor(0.25, 0.05, '#d8b060', { m: 0.7 }, Math.PI), 0, 0.15, 0, 0, Math.PI / 2, 0), this.at(this.cyl(0.1, 0.1, 0.55, '#2a1a10', 6), 0, -0.2, 0));
        saber.position.set(0.25, -0.1, 0); saber.rotation.z = -1.1; P.handR.add(saber); P.weapon = saber;
        const pistol = G(this.at(this.cyl(0.08, 0.1, 1.1, '#3a3a36', 6, { m: 0.7 }), 0.55, 0, 0, 0, 0, Math.PI / 2), this.at(this.box(0.45, 0.4, 0.2, '#6a3a1e'), -0.05, -0.2, 0, 0, 0, 0.4));
        P.armL.rotation.z = 0.7; pistol.rotation.z = -0.7; P.handL.add(pistol);
        break;
      }
    }
    return P;
  },

  // ---------------- Sbires ----------------
  minion(type, team) {
    const T = TEAM_INFO[team].color;
    if (type === 'siege') {
      const g = new THREE.Group(), P = { root: g, body: g };
      for (const [x, z] of [[0.9, 1.1], [0.9, -1.1], [-0.9, 1.1], [-0.9, -1.1]]) g.add(this.at(this.cyl(0.55, 0.55, 0.5, '#17150f', 8), x, 0.55, z, Math.PI / 2, 0, 0));
      g.add(this.at(this.box(3.0, 1.3, 2.0, '#6a5a44'), -0.3, 1.4, 0));
      g.add(this.at(this.box(3.02, 0.4, 2.02, T), -0.3, 1.6, 0));
      g.add(this.at(this.box(1.0, 1.1, 1.8, '#3e3a32'), 1.0, 2.4, 0));
      const ram = this.cone(0.6, 1.6, '#9a9a92', 6, { m: 0.6, r: 0.4 }); ram.position.set(2.2, 1.4, 0); ram.rotation.z = -Math.PI / 2; g.add(ram); P.weapon = ram;
      P.height = 3; return P;
    }
    if (type === 'super') {
      const P = this.humanoid({ hip: 1.8, torsoH: 2.3, torsoW: 2.5, torsoD: 1.8, legW: 0.95, armW: 0.85, armL: 2.2, headR: 0.6, top: '#4a4038', pants: '#2a241e', skin: '#8a6a50', noHead: true, belt: '#1a1612' });
      P.head.add(this.box(1.2, 1.1, 1.2, '#3a3632', { m: 0.4 })); P.head.add(this.at(this.box(0.1, 0.25, 0.9, T, { e: T, ei: 1.5 }), 0.62, 0, 0));
      for (const s of [-1, 1]) P.body.add(this.at(this.box(1.1, 0.6, 1.0, T), 0, 4.0, s * 1.5));
      const club = this.group(this.at(this.cyl(0.18, 0.4, 2.6, '#5a4630'), 0, 1.0, 0)); for (let i = 0; i < 5; i++) club.add(this.at(this.cone(0.12, 0.45, '#9a9a92', 4), 0, 1.8 + (i % 3) * 0.3, 0, i * 1.2, 0, Math.PI / 2));
      club.rotation.z = -1.2; P.handR.add(club); P.weapon = club; return P;
    }
    const ranged = type === 'ranged';
    const P = this.humanoid({ hip: 1.15, torsoH: 1.35, torsoW: 1.3, legW: 0.45, armW: 0.4, armL: 1.25, headR: 0.45, top: ranged ? '#5d5242' : '#6e5a44', pants: '#3a3226', skin: '#a07a5a' });
    P.head.add(this.at(this.cyl(0.47, 0.47, 0.22, T, 8), 0, 0.2, 0));
    P.torso.add(this.at(this.box(0.9, 0.3, 1.35, T), 0, 0.2, 0));
    if (ranged) {
      const xbow = this.group(this.at(this.box(1.3, 0.16, 0.16, '#3a2f24'), 0.4, 0, 0), this.at(this.tor(0.55, 0.06, '#5a4630', {}, Math.PI), 0.9, 0, 0, Math.PI / 2, 0, Math.PI / 2));
      P.armR.rotation.z = Math.PI / 2.3; xbow.rotation.z = -Math.PI / 2.3; P.handR.add(xbow); P.weapon = xbow; P.aimPose = true;
    } else {
      const blade = this.box(0.12, 1.2, 0.3, '#b8b8b0', { m: 0.6, r: 0.3 }); blade.position.set(0.1, 0.5, 0); blade.rotation.z = -1.2; P.handR.add(blade); P.weapon = blade;
    }
    return P;
  },

  // ---------------- Monstres ----------------
  quadruped(o) {
    const g = new THREE.Group(), P = { root: g, body: new THREE.Group() }; g.add(P.body);
    P.body.add(this.at(this.box(o.len, o.h, o.w, o.c), 0, o.leg + o.h / 2, 0));
    const head = this.group(this.box(o.head, o.head * 0.8, o.head * 0.8, o.c), this.at(this.box(o.head * 0.6, o.head * 0.4, o.head * 0.5, o.c2 || o.c), o.head * 0.6, -o.head * 0.15, 0));
    for (const z of [-1, 1]) { head.add(this.at(this.cone(o.head * 0.18, o.head * 0.5, o.c2 || o.c, 4), -o.head * 0.1, o.head * 0.55, z * o.head * 0.25)); head.add(this.at(this.sph(o.head * 0.09, o.eye || '#ffdd55', { e: o.eye || '#ffaa00', ei: 1.5 }, 5, 4), o.head * 0.42, o.head * 0.12, z * o.head * 0.2)); }
    head.position.set(o.len / 2 + o.head * 0.3, o.leg + o.h * 0.85, 0); P.body.add(head); P.head = head;
    P.legs = [];
    for (const [x, z] of [[o.len * 0.35, 1], [o.len * 0.35, -1], [-o.len * 0.35, 1], [-o.len * 0.35, -1]]) { const pv = new THREE.Group(); pv.position.set(x, o.leg, z * o.w * 0.35); pv.add(this.at(this.box(o.legW, o.leg, o.legW, o.c2 || o.c), 0, -o.leg / 2, 0)); P.body.add(pv); P.legs.push(pv); }
    const tail = this.cyl(o.legW * 0.4, o.legW * 0.2, o.len * 0.5, o.c, 5); tail.position.set(-o.len * 0.6, o.leg + o.h * 0.8, 0); tail.rotation.z = 1.0; P.body.add(tail);
    P.height = o.leg + o.h + o.head; return P;
  },
  monster(type) {
    switch (type) {
      case 'wolf': return this.quadruped({ len: 2.4, h: 1.0, w: 1.0, leg: 1.0, legW: 0.3, head: 0.9, c: '#5a4a3a', c2: '#3a2e24' });
      case 'wolfAlpha': return this.quadruped({ len: 3.4, h: 1.5, w: 1.4, leg: 1.4, legW: 0.45, head: 1.3, c: '#3a3028', c2: '#241c16', eye: '#ff3a2a' });
      case 'vulture': case 'vultureBig': {
        const k = type === 'vultureBig' ? 1.5 : 1, g = new THREE.Group(), P = { root: g, body: new THREE.Group() }; g.add(P.body);
        P.body.add(this.at(this.sph(0.9 * k, '#3a3028', {}, 8, 6), 0, 2.6 * k, 0)); P.body.children[0].scale.set(1.3, 0.9, 0.9);
        P.body.add(this.at(this.cyl(0.18 * k, 0.25 * k, 1.0 * k, '#c8a888'), 0.8 * k, 3.2 * k, 0, 0, 0, -0.7));
        P.body.add(this.at(this.sph(0.32 * k, '#c8a888', {}, 6, 4), 1.2 * k, 3.6 * k, 0));
        P.body.add(this.at(this.cone(0.14 * k, 0.5 * k, '#e8c040', 4), 1.55 * k, 3.5 * k, 0, 0, 0, -Math.PI / 2));
        P.wings = [];
        for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(0, 2.9 * k, s * 0.5 * k); w.add(this.at(this.box(1.4 * k, 0.12, 2.4 * k, '#2a221c'), -0.2, 0, s * 1.2 * k)); P.body.add(w); P.wings.push(w); }
        for (const z of [-0.3, 0.3]) P.body.add(this.at(this.cyl(0.08 * k, 0.08 * k, 1.6 * k, '#c8a040'), 0, 0.9 * k, z * k));
        P.height = 4 * k; P.fly = true; return P;
      }
      case 'golem': case 'golemSmall': {
        const k = type === 'golem' ? 1.25 : 0.85;
        const P = this.humanoid({ hip: 1.6 * k, torsoH: 2.2 * k, torsoW: 2.6 * k, torsoD: 1.9 * k, legW: 1.0 * k, armW: 0.95 * k, armL: 2.3 * k, headR: 0.55 * k, top: '#7a5a3a', pants: '#5a4430', skin: '#6a6a62', sleeve: '#6a5a4a', noHead: true });
        P.head.add(this.box(1.1 * k, 0.9 * k, 1.1 * k, '#6a6a62', { m: 0.5 }));
        for (const z of [-0.25, 0.25]) P.head.add(this.at(this.box(0.1, 0.18 * k, 0.22 * k, '#ffcf4a', { e: '#ffaa00', ei: 2 }), 0.56 * k, 0.05, z * k));
        P.torso.add(this.at(this.cyl(0.4 * k, 0.4 * k, 0.2, '#c96f2b', 8, { e: '#7a3a10', ei: 0.5 }), 0.98 * k, 0.2, 0, 0, 0, Math.PI / 2));
        return P;
      }
      case 'toad': {
        const g = new THREE.Group(), P = { root: g, body: new THREE.Group() }; g.add(P.body);
        const b = this.sph(2.3, '#6a7a3a', {}, 12, 8); b.scale.set(1.2, 0.75, 1.1); b.position.y = 1.8; P.body.add(b);
        for (let i = 0; i < 7; i++) { const a = i * 1.7; P.body.add(this.at(this.sph(0.35, '#4a5a2a', {}, 6, 4), Math.cos(a) * 1.8, 2.8, Math.sin(a) * 1.6)); }
        for (const z of [-0.8, 0.8]) P.body.add(this.at(this.sph(0.45, '#e8d84a', { e: '#c8b820', ei: 0.8 }, 8, 6), 1.6, 3.2, z));
        P.body.add(this.at(this.box(0.4, 0.25, 2.2, '#3a1a1a'), 2.5, 1.6, 0));
        P.legs = [];
        for (const z of [-1.6, 1.6]) { const pv = new THREE.Group(); pv.position.set(-0.8, 1.2, z); pv.add(this.at(this.box(1.6, 0.7, 0.7, '#5a6a2a'), 0.3, -0.6, 0)); P.body.add(pv); P.legs.push(pv); }
        P.height = 3.6; P.squash = true; return P;
      }
      case 'blueBuff': {
        const P = this.humanoid({ hip: 1.9, torsoH: 2.8, torsoW: 3.2, torsoD: 2.3, legW: 1.15, armW: 1.15, armL: 2.6, headR: 0.6, top: '#5a6068', pants: '#3a4048', skin: '#4a5058', sleeve: '#4a5058', noHead: true });
        P.head.add(this.box(1.2, 0.9, 1.2, '#4a5058'));
        P.torso.add(this.at(new THREE.Mesh(this.geo('oct1', () => new THREE.OctahedronGeometry(0.9, 0)), this.mat('#9fe8ff', { e: '#3ac8ff', ei: 2.2 })), 1.1, 0.2, 0));
        for (const s of [-1, 1]) P.body.add(this.at(new THREE.Mesh(this.geo('dod1', () => new THREE.DodecahedronGeometry(0.9, 0)), this.mat('#5a6068')), 0, 5.0, s * 1.9));
        P.core = P.torso.children[0]; return P;
      }
      case 'redBuff': {
        const P = this.quadruped({ len: 4.2, h: 1.9, w: 2.0, leg: 1.5, legW: 0.6, head: 1.6, c: '#8a2a1a', c2: '#5a1a10', eye: '#ffb030' });
        for (let i = 0; i < 6; i++) P.body.add(this.at(this.cone(0.3, 1.1, '#2a1410', 4), 1.3 - i * 0.55, 3.8, 0));
        P.body.add(this.at(this.sph(0.6, '#ff6a20', { e: '#ff4a10', ei: 1.4 }, 8, 6), 0, 2.4, 0)); return P;
      }
      case 'worm': {
        const g = new THREE.Group(), P = { root: g, body: new THREE.Group(), segs: [] }; g.add(P.body);
        for (let i = 0; i < 7; i++) { const r = 2.6 - i * 0.18, s = this.sph(r, i % 2 ? '#b89a6a' : '#a0845a', {}, 10, 8); P.body.add(s); P.segs.push(s); }
        const mouth = new THREE.Group();
        mouth.add(this.at(this.cyl(1.7, 2.0, 0.6, '#3a1a14', 10), 0, 0, 0, 0, 0, Math.PI / 2));
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; mouth.add(this.at(this.cone(0.22, 0.9, '#f0e8d0', 4), 0.3, Math.cos(a) * 1.5, Math.sin(a) * 1.5, a, 0, -Math.PI / 2)); }
        P.body.add(mouth); P.mouth = mouth; P.height = 9; P.worm = true; return P;
      }
      case 'titan': {
        const P = this.humanoid({ hip: 5.5, torsoH: 6, torsoW: 7, torsoD: 5, legW: 2.4, armW: 2.0, armL: 6, headR: 1.4, top: '#8a5a2a', pants: '#5a4a3a', skin: '#5a5a52', sleeve: '#6a4a2a', noHead: true, boots: '#3a3630' });
        P.head.add(this.box(3, 2.2, 3, '#6a6a62', { m: 0.5 }));
        P.head.add(this.at(this.box(0.2, 0.6, 2.2, '#ff3a2a', { e: '#ff2a10', ei: 2.5 }), 1.52, 0.1, 0));
        for (const s of [-1, 1]) P.body.add(this.at(this.box(2.8, 1.6, 2.6, '#7a4a20', { m: 0.3 }), 0, 11.4, s * 4.3));
        for (const hand of [P.handL, P.handR]) hand.add(this.at(this.cyl(0.9, 1.1, 3.4, '#4a4a46', 8, { m: 0.6 }), 0.8, -0.6, 0, 0, 0, -0.8));
        P.torso.add(this.at(this.cyl(1.4, 1.4, 0.4, '#ffaa30', 12, { e: '#ff7a10', ei: 1.6 }), 2.55, 0.5, 0, 0, 0, Math.PI / 2));
        for (let i = 0; i < 4; i++) P.body.add(this.at(this.cyl(0.4, 0.4, 3.5, '#3a3a36'), -2.8, 13 + (i % 2), -1.5 + i, 0.2 * i, 0, 0.2));
        return P;
      }
    }
  },

  // ---------------- Structures ----------------
  tower(team) {
    const T = TEAM_INFO[team].color, g = new THREE.Group(), P = { root: g };
    g.add(this.at(this.cyl(4.0, 4.4, 1.6, '#6f685c', 8), 0, 0.8, 0));
    g.add(this.at(this.cyl(2.5, 2.9, 8, '#8a8374', 8), 0, 5.6, 0));
    for (let i = 0; i < 4; i++) g.add(this.at(this.box(0.2, 7.8, 0.4, '#5a544a'), Math.cos(i * Math.PI / 2 + 0.4) * 2.65, 5.6, Math.sin(i * Math.PI / 2 + 0.4) * 2.65, 0, -(i * Math.PI / 2 + 0.4), 0));
    g.add(this.at(this.cyl(3.4, 3.2, 0.7, '#6f685c', 8), 0, 9.9, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const bag = this.sph(0.5, i % 2 ? '#a6957a' : '#988870', {}, 6, 4); bag.scale.set(1.3, 0.6, 0.9); bag.position.set(Math.cos(a) * 3.0, 10.5, Math.sin(a) * 3.0); bag.rotation.y = -a; g.add(bag); }
    const turret = new THREE.Group(); turret.position.set(0, 11.3, 0);
    turret.add(this.box(2.4, 1.5, 2.2, T, { m: 0.3, r: 0.5 }));
    for (const z of [-0.45, 0.45]) turret.add(this.at(this.cyl(0.2, 0.2, 3.2, '#23201a', 8, { m: 0.6 }), 2.2, 0.1, z, 0, 0, Math.PI / 2));
    turret.add(this.at(this.box(1.0, 0.6, 1.4, TEAM_INFO[team].dark), -0.9, 0.9, 0));
    g.add(turret); P.turret = turret;
    const light = this.sph(0.45, TEAM_INFO[team].light, { e: T, ei: 2.5 }, 8, 6); light.position.set(-1.4, 12.6, 0); g.add(light); P.light = light;
    g.add(this.at(this.cyl(0.08, 0.08, 4, '#3a342c'), -2.6, 12, -2.0));
    const flag = this.box(0.05, 1.0, 1.8, T, { side: true }); flag.position.set(-2.6, 13.4, -1.1); g.add(flag); P.flag = flag;
    P.height = 14; return P;
  },
  inhib(team) {
    const T = TEAM_INFO[team].color, g = new THREE.Group(), P = { root: g };
    g.add(this.at(this.cyl(3.6, 4.0, 1.2, '#5c5850', 6), 0, 0.6, 0));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.add(this.at(this.box(0.4, 6, 0.4, '#4a4640', { m: 0.5 }), Math.cos(a) * 2.2, 4, Math.sin(a) * 2.2, Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15)); }
    g.add(this.at(this.tor(2.0, 0.18, '#c87533', { m: 0.6 }), 0, 6.6, 0, Math.PI / 2, 0, 0));
    const crystal = new THREE.Mesh(this.geo('oct2', () => new THREE.OctahedronGeometry(1.4, 0)), this.mat(TEAM_INFO[team].light, { e: T, ei: 1.8 }));
    crystal.position.y = 5.0; crystal.castShadow = true; g.add(crystal); P.crystal = crystal;
    P.height = 8; return P;
  },
  nexus(team) {
    const T = TEAM_INFO[team].color, g = new THREE.Group(), P = { root: g };
    g.add(this.at(this.cyl(6.6, 7.2, 2, '#4e4a42', 8), 0, 1, 0));
    for (let i = 0; i < 16; i++) g.add(this.at(this.box(0.9, 0.5, 1.8, i % 2 ? '#e8b04a' : '#1c1a16'), Math.cos(i / 16 * Math.PI * 2) * 6.4, 2.1, Math.sin(i / 16 * Math.PI * 2) * 6.4, 0, -i / 16 * Math.PI * 2, 0));
    g.add(this.at(this.cyl(4.2, 4.8, 8, '#6c665a', 12), 0, 6, 0));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(this.at(this.box(0.5, 7, 2.2, '#5a554c', { m: 0.4 }), Math.cos(a) * 4.7, 6, Math.sin(a) * 4.7, 0, -a, 0)); }
    const core = this.sph(3.3, TEAM_INFO[team].light, { e: T, ei: 2.0 }, 14, 10); core.position.y = 11.5; g.add(core); P.core = core;
    g.add(this.at(this.tor(3.6, 0.35, '#3a3632', { m: 0.6 }), 0, 11.5, 0, Math.PI / 2, 0, 0));
    for (const s of [-1, 1]) g.add(this.at(this.tor(2.6, 0.5, '#5a554c', { m: 0.5 }, Math.PI), s * 5.5, 3, 0, 0, s > 0 ? 0 : Math.PI, 0));
    P.height = 16; return P;
  },
  fountain(team) {
    const T = TEAM_INFO[team].color, g = new THREE.Group();
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.add(this.at(this.cyl(0.35, 0.45, 9, '#4a3a2a', 6), x, 4.5, z, x * 0.03, 0, -z * 0.03));
    g.add(this.at(this.cyl(4.6, 4.6, 4, '#6f7a7e', 14, { m: 0.5, r: 0.5 }), 0, 11, 0));
    g.add(this.at(this.cone(4.9, 1.8, '#5c666a', 14, { m: 0.5 }), 0, 13.9, 0));
    g.add(this.at(this.box(0.3, 3.2, 4.65 * 2.01, T), 0, 11, 0));
    const ring = new THREE.Mesh(this.geo('fring', () => new THREE.RingGeometry(CONFIG.FOUNTAIN_R * S3 - 1.2, CONFIG.FOUNTAIN_R * S3, 48)), this.mat(T, { e: T, ei: 0.6, t: true, o: 0.35, flat: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    return g;
  },
};
