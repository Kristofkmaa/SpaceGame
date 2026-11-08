// ============ Carte : voies, jungle, obstacles, navigation (A*) ============
class LanePath {
  constructor(pts) {
    this.pts = pts.map(p => ({ x: p[0], y: p[1] }));
    this.cum = [0]; this.len = [];
    for (let i = 0; i < this.pts.length - 1; i++) { const l = Utils.dist(this.pts[i].x, this.pts[i].y, this.pts[i + 1].x, this.pts[i + 1].y); this.len.push(l); this.cum.push(this.cum[i] + l); }
    this.L = this.cum[this.cum.length - 1];
  }
  project(x, y) {
    let best = null;
    for (let i = 0; i < this.len.length; i++) {
      const a = this.pts[i], b = this.pts[i + 1], pr = Utils.projSeg(x, y, a.x, a.y, b.x, b.y), d = Utils.dist(x, y, pr.x, pr.y);
      if (!best || d < best.d) best = { x: pr.x, y: pr.y, d, s: this.cum[i] + pr.t * this.len[i] };
    }
    return best;
  }
  point(s) {
    s = Utils.clamp(s, 0, this.L);
    let i = 0; while (i < this.len.length - 1 && s > this.cum[i + 1]) i++;
    const a = this.pts[i], b = this.pts[i + 1], t = (s - this.cum[i]) / this.len[i], ang = Math.atan2(b.y - a.y, b.x - a.x);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: ang, nx: -Math.sin(ang), ny: Math.cos(ang) };
  }
}

const MAP = {
  CELL: 40,
  init() {
    if (this.ready) return;
    this.ready = true;
    const W = CONFIG.W, H = CONFIG.H, M = (p) => [W - p[0], H - p[1]];
    this.mirror = (x, y) => ({ x: W - x, y: H - y });
    this.lanes = {}; for (const k of LANES) this.lanes[k] = new LanePath(LANE_POINTS[k]);
    const side = (p) => [{ x: p[0], y: p[1] }, { x: M(p)[0], y: M(p)[1] }];
    this.bases = side(CONFIG.BASE_CENTER); this.fountains = side(CONFIG.FOUNTAIN); this.nexus = side(CONFIG.NEXUS);
    this.campSpots = [];
    for (const c of CAMPS) for (const team of [0, 1]) { const p = team ? this.mirror(c.x, c.y) : { x: c.x, y: c.y }; this.campSpots.push({ ...c, key: c.id + team, side: team, x: p.x, y: p.y }); }
    for (const e of EPICS) this.campSpots.push({ ...e, key: e.id, side: -1, epic: true });
    this.genObstacles();
    this.buildGrid();
  },
  distToLanes(x, y) { let d = Infinity; for (const k of LANES) d = Math.min(d, this.lanes[k].project(x, y).d); return d; },
  distToRiver(x, y) { return Math.abs(y - x) / Math.SQRT2; },
  // Murs de jungle générés côté bleu puis reflétés : la carte est parfaitement symétrique
  genObstacles() {
    const rnd = Utils.seeded(20251108), W = CONFIG.W, obs = [];
    const blueCamps = [...CAMPS.map(c => ({ x: c.x, y: c.y })), { x: EPICS[0].x, y: EPICS[0].y }, this.mirror(EPICS[1].x, EPICS[1].y)];
    const corridors = [];
    for (const c of CAMPS) {
      for (const k of LANES) { const p = this.lanes[k].project(c.x, c.y); if (p.d < 1000) corridors.push([c.x, c.y, p.x, p.y]); }
      const rv = (c.x + c.y) / 2; if (this.distToRiver(c.x, c.y) < 1300) corridors.push([c.x, c.y, rv, rv]);
      for (const o of CAMPS) if (o !== c && Utils.dist(c.x, c.y, o.x, o.y) < 950) corridors.push([c.x, c.y, o.x, o.y]);
    }
    for (const e of [EPICS[0], this.mirror(EPICS[1].x, EPICS[1].y)]) { for (const k of LANES) { const p = this.lanes[k].project(e.x, e.y); if (p.d < 1300) corridors.push([e.x, e.y, p.x, p.y]); } }
    // Couloirs supplémentaires entre voies et rivière
    corridors.push([1900, 2900, 2500, 2500], [1150, 3300, 1700, 2600], [2700, 3200, 3100, 3100], [800, 2600, 1150, 2350]);
    this.corridors = corridors;
    const segD = (x, y, s) => { const p = Utils.projSeg(x, y, s[0], s[1], s[2], s[3]); return Utils.dist(x, y, p.x, p.y); };
    for (let gx = 0; gx <= W; gx += 105) for (let gy = 0; gy <= W; gy += 105) {
      const x = gx + (rnd() - 0.5) * 70, y = gy + (rnd() - 0.5) * 70, r = 48 + rnd() * 62;
      if (y - x < 150) continue;
      if (x < r || y < r || x > W - r || y > W - r) continue;
      if (this.distToLanes(x, y) < 245 + r) continue;
      if (this.distToRiver(x, y) < 190 + r) continue;
      if (Utils.dist(x, y, CONFIG.BASE_CENTER[0], CONFIG.BASE_CENTER[1]) < CONFIG.BASE_R + r) continue;
      if (blueCamps.some(c => Utils.dist(x, y, c.x, c.y) < 240 + r)) continue;
      if (Utils.dist(x, y, EPICS[0].x, EPICS[0].y) < 360 + r) continue;
      if (corridors.some(s => segD(x, y, s) < 95 + r)) continue;
      const roll = rnd();
      obs.push({ x, y, r, kind: roll < 0.62 ? 'rock' : roll < 0.82 ? 'wreck' : 'ruin', rot: rnd() * Math.PI * 2, seed: rnd() });
    }
    // Enceinte de la base, ouverte sur chaque voie
    const [bx, by] = CONFIG.BASE_CENTER;
    for (let a = 0; a < Math.PI * 2; a += 0.075) {
      const x = bx + Math.cos(a) * 1010, y = by + Math.sin(a) * 1010;
      if (x < 30 || y > W - 30) continue;
      if (this.distToLanes(x, y) < 300) continue;
      obs.push({ x, y, r: 42, kind: 'wall', rot: a + Math.PI / 2, seed: rnd() });
    }
    const mirrored = obs.map(o => ({ ...o, x: W - o.x, y: W - o.y, rot: o.rot + Math.PI }));
    this.obstacles = [...obs, ...mirrored];
    // Index spatial
    this.obsBucket = new Map(); const B = 250;
    this.obstacles.forEach((o, i) => {
      for (let bx = Math.floor((o.x - o.r) / B); bx <= Math.floor((o.x + o.r) / B); bx++)
        for (let by = Math.floor((o.y - o.r) / B); by <= Math.floor((o.y + o.r) / B); by++) {
          const k = bx * 1000 + by; if (!this.obsBucket.has(k)) this.obsBucket.set(k, []); this.obsBucket.get(k).push(o);
        }
    });
  },
  obstaclesNear(x, y) { return this.obsBucket.get(Math.floor(x / 250) * 1000 + Math.floor(y / 250)) || []; },
  buildGrid() {
    const C = this.CELL, n = Math.ceil(CONFIG.W / C);
    this.gn = n; this.grid = new Uint8Array(n * n);
    for (const o of this.obstacles) {
      const pad = o.r + 16;
      for (let cx = Math.floor((o.x - pad) / C); cx <= Math.floor((o.x + pad) / C); cx++)
        for (let cy = Math.floor((o.y - pad) / C); cy <= Math.floor((o.y + pad) / C); cy++) {
          if (cx < 0 || cy < 0 || cx >= n || cy >= n) continue;
          if (Utils.dist((cx + 0.5) * C, (cy + 0.5) * C, o.x, o.y) < pad) this.grid[cy * n + cx] = 1;
        }
    }
  },
  blockedCell(cx, cy) { return cx < 0 || cy < 0 || cx >= this.gn || cy >= this.gn || this.grid[cy * this.gn + cx] === 1; },
  blockedAt(x, y) { return this.blockedCell(Math.floor(x / this.CELL), Math.floor(y / this.CELL)); },
  // Repousse une unité hors des obstacles et des bords
  resolve(u) {
    for (const o of this.obstaclesNear(u.x, u.y)) {
      const dx = u.x - o.x, dy = u.y - o.y, min = o.r + u.radius, d2 = dx * dx + dy * dy;
      if (d2 < min * min) { const d = Math.sqrt(d2) || 0.01; u.x = o.x + dx / d * min; u.y = o.y + dy / d * min; }
    }
    u.x = Utils.clamp(u.x, u.radius, CONFIG.W - u.radius); u.y = Utils.clamp(u.y, u.radius, CONFIG.H - u.radius);
  },
  freePoint(x, y) {
    const C = this.CELL; let cx = Math.floor(x / C), cy = Math.floor(y / C);
    if (!this.blockedCell(cx, cy)) return { x, y };
    for (let r = 1; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      if (!this.blockedCell(cx + dx, cy + dy)) return { x: (cx + dx + 0.5) * C, y: (cy + dy + 0.5) * C };
    }
    return { x, y };
  },
  los(x0, y0, x1, y1) {
    const d = Utils.dist(x0, y0, x1, y1), n = Math.ceil(d / 18);
    for (let i = 1; i <= n; i++) { const k = i / n; if (this.blockedAt(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false; }
    return true;
  },
  // A* sur grille 8‑connexe, chemin lissé par lignes de vue
  path(x0, y0, x1, y1) {
    const g = this.freePoint(x1, y1); x1 = g.x; y1 = g.y;
    if (this.los(x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
    const C = this.CELL, n = this.gn;
    const s = this.freePoint(x0, y0), sx = Math.floor(s.x / C), sy = Math.floor(s.y / C), tx = Math.floor(x1 / C), ty = Math.floor(y1 / C);
    const start = sy * n + sx, goal = ty * n + tx;
    if (!this.gScore || this.gScore.length !== n * n) { this.gScore = new Float32Array(n * n); this.came = new Int32Array(n * n); this.stamp = new Uint32Array(n * n); this.closedStamp = new Uint32Array(n * n); this.run = 0; }
    const run = ++this.run, gS = this.gScore, came = this.came, st = this.stamp, cl = this.closedStamp;
    const heap = [], push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = i => { const dx = Math.abs(i % n - tx), dy = Math.abs(Math.floor(i / n) - ty); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    st[start] = run; gS[start] = 0; came[start] = -1; push(h(start), start);
    let found = false, iter = 0;
    while (heap.length && iter++ < 20000) {
      const [, cur] = pop();
      if (cl[cur] === run) continue; cl[cur] = run;
      if (cur === goal) { found = true; break; }
      const cx = cur % n, cy = Math.floor(cur / n);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (this.blockedCell(nx, ny)) continue;
        if (dx && dy && (this.blockedCell(cx + dx, cy) || this.blockedCell(cx, cy + dy))) continue;
        const ni = ny * n + nx; if (cl[ni] === run) continue;
        const ng = gS[cur] + (dx && dy ? Math.SQRT2 : 1);
        if (st[ni] !== run || ng < gS[ni]) { st[ni] = run; gS[ni] = ng; came[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    if (!found) return [{ x: x1, y: y1 }];
    const cells = []; for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map(c => ({ x: (c % n + 0.5) * C, y: (Math.floor(c / n) + 0.5) * C }));
    pts[pts.length - 1] = { x: x1, y: y1 };
    // Lissage
    const out = []; let ax = x0, ay = y0, i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.los(ax, ay, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j;
    }
    if (!out.length) out.push(pts[pts.length - 1]);
    return out;
  },
  progress(team, lane, x, y) { const L = this.lanes[lane], s = L.project(x, y).s; return team === 0 ? s : L.L - s; },
  pointAt(team, lane, p, lat = 0) {
    const L = this.lanes[lane], s = team === 0 ? p : L.L - p, pt = L.point(s);
    return { x: pt.x + pt.nx * lat, y: pt.y + pt.ny * lat, angle: team === 0 ? pt.angle : pt.angle + Math.PI };
  },
  nearestLane(x, y) { let best = null, bd = Infinity; for (const k of LANES) { const d = this.lanes[k].project(x, y).d; if (d < bd) { bd = d; best = k; } } return best; },
};
