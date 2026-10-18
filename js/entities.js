// ============================================================
//  ASHFALL - entities.js
//  The World turns an ASCII level into tiles and things that
//  move: embers, enemies, checkpoints, crumbling floors.
// ============================================================
'use strict';

const TILE = CONFIG.TILE;

// ------------------------------------------------------------
//  a platform that slides back and forth
// ------------------------------------------------------------
class Mover {
constructor(x, y, axis) {
this.w = TILE * 2;
this.h = 14;
this.ox = x;
this.oy = y;
this.x = x;
this.y = y;
this.prevX = x;
this.prevY = y;
this.axis = axis;
this.range = TILE * 3;
this.t = Math.random() * Math.PI * 2;
}

update(dt) {
this.prevX = this.x;
this.prevY = this.y;
this.t += dt * 0.85;
// 0..1, easing at both ends because it is a sine
const k = (Math.sin(this.t) + 1) / 2;
if (this.axis === 'h') { this.x = this.ox + k * this.range; this.y = this.oy; }
else { this.x = this.ox; this.y = this.oy + k * this.range; }
}
}

// ------------------------------------------------------------
//  the world
// ------------------------------------------------------------
class World {
constructor(index) {
this.index = index;
this.def = LEVELS[index];
this.story = STORY.chapter(index);

const rows = this.def.map;
this.h = rows.length;
this.w = Math.max.apply(null, rows.map((r) => r.length));
this.grid = rows.map((r) => r.padEnd(this.w, '.').split(''));

this.embers = [];
this.lanterns = [];
this.braziers = [];
this.tablets = [];
this.enemies = [];
this.movers = [];
this.crumbles = new Map();

this.spawn = { x: TILE * 2, y: TILE * 2 };
this.checkpoint = null;
this.time = 0;
this.pixelW = this.w * TILE;
this.pixelH = this.h * TILE;

this.parse();
this.emberTotal = this.embers.length;
}

// turn map characters into objects, then erase them from the grid
parse() {
for (let y = 0; y < this.h; y++) {
for (let x = 0; x < this.w; x++) {
const c = this.grid[y][x];
const px = x * TILE;
const py = y * TILE;

if (c === '@') {
this.spawn = { x: px + 6, y: py + TILE - CONFIG.PLAYER_H };
this.grid[y][x] = '.';
} else if (c === 'o') {
this.embers.push({ x: px + TILE / 2, y: py + TILE / 2, taken: false, phase: Math.random() * 6.28 });
this.grid[y][x] = '.';
} else if (c === 'L') {
this.lanterns.push({ x: px + TILE / 2, y: py + TILE - 6, lit: false, phase: Math.random() * 6.28 });
this.grid[y][x] = '.';
} else if (c === 'B') {
this.braziers.push({ x: px + TILE / 2, y: py + TILE - 4, lit: false });
this.grid[y][x] = '.';
} else if (c === 'T') {
const text = (this.story.tablets || [])[this.tablets.length] || 'The stone is worn smooth by hands older than yours.';
this.tablets.push({ x: px + TILE / 2, y: py + TILE - 8, text: text, read: false, near: false });
this.grid[y][x] = '.';
} else if (c === 'e') {
this.enemies.push({
kind: 'crawler', x: px + 5, y: py + TILE - 24, w: 22, h: 24,
dir: -1, speed: 46, alive: true, squash: 0, phase: 0,
});
this.grid[y][x] = '.';
} else if (c === 'w') {
this.enemies.push({
kind: 'drifter', x: px + 5, y: py + 5, w: 22, h: 22,
baseX: px + 5, baseY: py + 5, range: TILE * 3.2,
phase: Math.random() * 6.28, alive: true, squash: 0,
});
this.grid[y][x] = '.';
} else if (c === 'h' || c === 'v') {
this.movers.push(new Mover(px, py + 10, c));
this.grid[y][x] = '.';
}
}
}
}

// --- tile queries -----------------------------------------
tileAt(tx, ty) {
if (tx < 0 || tx >= this.w) return '#';
if (ty < 0 || ty >= this.h) return '.';
return this.grid[ty][tx];
}

isSolidChar(c) { return c === '#' || c === '-'; }

solidAt(tx, ty) { return this.isSolidChar(this.tileAt(tx, ty)); }

solidPx(px, py) {
return this.solidAt(Math.floor(px / TILE), Math.floor(py / TILE));
}

// what kind of harmful tile does this box touch? '' if none
hazardIn(box) {
const x0 = Math.floor(box.x / TILE);
const x1 = Math.floor((box.x + box.w - 1) / TILE);
const y0 = Math.floor(box.y / TILE);
const y1 = Math.floor((box.y + box.h - 1) / TILE);
for (let ty = y0; ty <= y1; ty++) {
for (let tx = x0; tx <= x1; tx++) {
const c = this.tileAt(tx, ty);
if (c === '~') return '~';
if (c === '^' && box.y + box.h > ty * TILE + 16) return '^';
}
}
return '';
}

// --- crumbling floors -------------------------------------
touchCrumble(tx, ty) {
const key = tx + ',' + ty;
if (this.crumbles.has(key)) return;
this.crumbles.set(key, { tx: tx, ty: ty, timer: 0.45, gone: 0 });
}

updateCrumbles(dt) {
this.crumbles.forEach((c, key) => {
if (c.gone > 0) {
c.gone -= dt;
if (c.gone <= 0) {
this.grid[c.ty][c.tx] = '-';
this.crumbles.delete(key);
}
return;
}
c.timer -= dt;
if (c.timer <= 0) {
this.grid[c.ty][c.tx] = '.';
c.gone = 3.2;
Audio.sfx('crumble');
Game.burst(c.tx * TILE + TILE / 2, c.ty * TILE + TILE / 2, 10, { color: PAL.stoneEdge, up: 120 });
}
});
}

// --- main update ------------------------------------------
update(dt, player) {
this.time += dt;

this.updateCrumbles(dt);

// moving platforms carry anything standing on them
for (const m of this.movers) {
m.update(dt);
if (player.riding === m) {
player.x += m.x - m.prevX;
player.y += m.y - m.prevY;
}
}

for (const e of this.enemies) {
if (e.squash > 0) { e.squash -= dt; continue; }
if (!e.alive) continue;
this.updateEnemy(e, dt);
}
}

updateEnemy(e, dt) {
if (e.kind === 'crawler') {
e.phase += dt * 6;
e.x += e.dir * e.speed * dt;

const aheadX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
const midY = e.y + e.h / 2;
const footY = e.y + e.h + 2;
const wall = this.solidPx(aheadX, midY) || this.solidPx(aheadX, e.y + e.h - 4);
const floor = this.solidPx(aheadX, footY);
if (wall || !floor) e.dir *= -1;
} else {
e.phase += dt * 1.4;
e.x = e.baseX + Math.sin(e.phase) * e.range;
e.y = e.baseY + Math.sin(e.phase * 2.1) * 14;
}
}

resetCrumbles() {
this.crumbles.forEach((c) => { this.grid[c.ty][c.tx] = '-'; });
this.crumbles.clear();
}
}
