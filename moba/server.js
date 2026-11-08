#!/usr/bin/env node
// Terres Brûlées : serveur de jeu en réseau local ou sur Internet.
// Sert les fichiers du jeu et relaie les messages entre joueurs (WebSocket sur /ws).
// Aucune dépendance : Node 16 ou plus récent suffit.
//
//   node server.js                 → http://localhost:8080
//   node server.js --port 3000
//   node server.js --lag 80 --drop 0.03   (simule une connexion médiocre, pour tester)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const PORT = +(arg('port', process.env.PORT || 8080));
const LAG = +arg('lag', 0), DROP = +arg('drop', 0);
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const MAX_MSG = 4096;

// ---------- Fichiers ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) || path.basename(file) === 'server.js') { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- WebSocket minimal ----------
let nextPeer = 1;
const clients = new Set();
const rooms = new Map(); // nom → Set(client)

server.on('upgrade', (req, socket) => {
  if ((req.url || '').split('?')[0] !== '/ws' || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const c = { socket, peer: 'p' + (nextPeer++).toString(36) + crypto.randomBytes(3).toString('hex'), rooms: new Set(), presence: new Map(), buf: Buffer.alloc(0), alive: true };
  clients.add(c);
  send(c, { op: 'hello', peer: c.peer });
  join(c, '');
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); parse(c); });
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
});

function frame(text) {
  const payload = Buffer.from(text, 'utf8'), n = payload.length;
  let head;
  if (n < 126) { head = Buffer.alloc(2); head[1] = n; }
  else if (n < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  head[0] = 0x81;
  return Buffer.concat([head, payload]);
}
function rawSend(c, buf) { if (c.alive && !c.socket.destroyed) c.socket.write(buf); }
function send(c, obj, lossy) {
  if (lossy && DROP && Math.random() < DROP) return;
  const buf = frame(JSON.stringify(obj));
  if (LAG) setTimeout(() => rawSend(c, buf), LAG * (0.8 + Math.random() * 0.4)); else rawSend(c, buf);
}
function parse(c) {
  while (c.buf.length >= 2) {
    const b0 = c.buf[0], b1 = c.buf[1], op = b0 & 15, masked = b1 & 128;
    let len = b1 & 127, off = 2;
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (c.buf.length < 10) return; len = Number(c.buf.readBigUInt64BE(2)); off = 10; }
    if (len > 1 << 20) { drop(c); return; }
    const need = off + (masked ? 4 : 0) + len; if (c.buf.length < need) return;
    let data = c.buf.slice(off + (masked ? 4 : 0), need);
    if (masked) { const mask = c.buf.slice(off, off + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3]; }
    c.buf = c.buf.slice(need);
    if (op === 8) { drop(c); return; }
    if (op === 9) { const pong = Buffer.concat([Buffer.from([0x8a, data.length]), data]); rawSend(c, pong); continue; }
    if (op === 1) { let m; try { m = JSON.parse(data.toString('utf8')); } catch (e) { continue; } handle(c, m); }
  }
}

// ---------- Salons ----------
function peersOf(name) { const set = rooms.get(name); return set ? [...set].map(c => ({ peer: c.peer, presence: c.presence.get(name) || {} })) : []; }
function broadcastPeers(name) { const set = rooms.get(name); if (!set) return; const peers = peersOf(name); for (const c of set) send(c, { op: 'peers', room: name, peers }); }
function join(c, name) {
  if (typeof name !== 'string' || name.length > 48 || c.rooms.has(name)) return;
  if (!rooms.has(name)) rooms.set(name, new Set());
  rooms.get(name).add(c); c.rooms.add(name); c.presence.set(name, {});
  broadcastPeers(name);
}
function leave(c, name) {
  const set = rooms.get(name); if (!set) return;
  set.delete(c); c.rooms.delete(name); c.presence.delete(name);
  if (!set.size) rooms.delete(name); else broadcastPeers(name);
}
function drop(c) {
  if (!c.alive) return; c.alive = false; clients.delete(c);
  for (const name of [...c.rooms]) leave(c, name);
  try { c.socket.destroy(); } catch (e) { /* déjà fermé */ }
}
function handle(c, m) {
  if (!m || typeof m !== 'object') return;
  const name = typeof m.room === 'string' ? m.room : '';
  switch (m.op) {
    case 'join': if (name) join(c, name); break;
    case 'leave': if (name) leave(c, name); break;
    case 'presence': {
      if (!c.rooms.has(name) || !m.patch || typeof m.patch !== 'object') return;
      const cur = Object.assign({}, c.presence.get(name));
      for (const k in m.patch) { if (m.patch[k] === null) delete cur[k]; else cur[k] = m.patch[k]; }
      if (JSON.stringify(cur).length > MAX_MSG) return;
      c.presence.set(name, cur); broadcastPeers(name); break;
    }
    case 'emit': {
      if (!c.rooms.has(name) || typeof m.topic !== 'string' || !/^[a-z][a-z0-9_.-]{0,47}$/.test(m.topic)) return;
      if (Buffer.byteLength(JSON.stringify(m.data === undefined ? null : m.data)) > MAX_MSG) return;
      const out = { op: 'msg', room: name, topic: m.topic, data: m.data, peer: c.peer };
      for (const o of rooms.get(name)) send(o, out, true);
      break;
    }
  }
}

server.listen(PORT, () => {
  const nets = require('os').networkInterfaces(), ips = [];
  for (const k in nets) for (const n of nets[k]) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  console.log(`Terres Brûlées : http://localhost:${PORT}`);
  for (const ip of ips) console.log(`Sur le réseau local : http://${ip}:${PORT}`);
  if (LAG || DROP) console.log(`Simulation réseau : latence ${LAG} ms, perte ${Math.round(DROP * 100)} %`);
});
