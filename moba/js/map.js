// ============ Géométrie de l'arène : voie, bases, zones praticables ============
class LanePath {
  constructor(pts) {
    this.pts = pts.map(p => ({ x: p[0], y: p[1] }));
    this.cum = [0]; this.len = [];
    for (let i = 0; i < this.pts.length - 1; i++) {
      const l = Utils.dist(this.pts[i].x, this.pts[i].y, this.pts[i + 1].x, this.pts[i + 1].y);
      this.len.push(l); this.cum.push(this.cum[i] + l);
    }
    this.L = this.cum[this.cum.length - 1];
  }
  project(x, y) {
    let best = null;
    for (let i = 0; i < this.len.length; i++) {
      const a = this.pts[i], b = this.pts[i + 1];
      const pr = Utils.projSeg(x, y, a.x, a.y, b.x, b.y);
      const d = Utils.dist(x, y, pr.x, pr.y);
      if (!best || d < best.d) best = { x: pr.x, y: pr.y, d, s: this.cum[i] + pr.t * this.len[i] };
    }
    return best;
  }
  point(s) {
    s = Utils.clamp(s, 0, this.L);
    let i = 0;
    while (i < this.len.length - 1 && s > this.cum[i + 1]) i++;
    const a = this.pts[i], b = this.pts[i + 1], t = (s - this.cum[i]) / this.len[i];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: ang, nx: -Math.sin(ang), ny: Math.cos(ang) };
  }
}

const MAP = {
  init() {
    if (this.lane) return;
    this.lane = new LanePath(CONFIG.LANE);
    const p0 = this.lane.point(0), p1 = this.lane.point(this.lane.L);
    this.bases = [{ x: p0.x, y: p0.y }, { x: p1.x, y: p1.y }];
    this.fountains = [
      { x: p0.x - Math.cos(p0.angle) * 150, y: p0.y - Math.sin(p0.angle) * 150 },
      { x: p1.x + Math.cos(p1.angle) * 150, y: p1.y + Math.sin(p1.angle) * 150 },
    ];
  },
  walkable(x, y, r = 0) {
    if (this.lane.project(x, y).d <= CONFIG.LANE_HALF - r) return true;
    for (const b of this.bases) if (Utils.dist(x, y, b.x, b.y) <= CONFIG.BASE_R - r) return true;
    return false;
  },
  // Ramène un point dans la zone praticable (glissement le long des bords)
  clamp(x, y, r = 0) {
    const half = CONFIG.LANE_HALF - r, br = CONFIG.BASE_R - r;
    const pr = this.lane.project(x, y);
    if (pr.d <= half) return { x, y };
    for (const b of this.bases) if (Utils.dist(x, y, b.x, b.y) <= br) return { x, y };
    let best = { x: pr.x + (x - pr.x) / pr.d * half, y: pr.y + (y - pr.y) / pr.d * half, d: pr.d - half };
    for (const b of this.bases) {
      const d = Utils.dist(x, y, b.x, b.y);
      if (d - br < best.d) best = { x: b.x + (x - b.x) / d * br, y: b.y + (y - b.y) / d * br, d: d - br };
    }
    return { x: Utils.clamp(best.x, r, CONFIG.W - r), y: Utils.clamp(best.y, r, CONFIG.H - r) };
  },
  // Progression le long de la voie, mesurée depuis la base d'une équipe
  progress(team, x, y) { const s = this.lane.project(x, y).s; return team === 0 ? s : this.lane.L - s; },
  pointAt(team, p, lat = 0) {
    const s = team === 0 ? p : this.lane.L - p;
    const pt = this.lane.point(s);
    return { x: pt.x + pt.nx * lat, y: pt.y + pt.ny * lat, angle: team === 0 ? pt.angle : pt.angle + Math.PI };
  },
};
