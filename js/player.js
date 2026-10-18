// ============================================================
//  ASHFALL - player.js
//  The Lamplighter. All of the movement feel lives here:
//  acceleration, coyote time, jump buffering, wall jumps,
//  dashes and the second jump.
// ============================================================
'use strict';

class Player {
constructor(world) {
this.world = world;
this.w = CONFIG.PLAYER_W;
this.h = CONFIG.PLAYER_H;

this.hearts = CONFIG.MAX_HEARTS;
this.embers = 0;
this.dead = false;
this.light = 1;

this.place(world.spawn);
}

place(pos) {
this.x = pos.x;
this.y = pos.y;
this.vx = 0;
this.vy = 0;
this.face = 1;
this.onGround = false;
this.coyote = 0;
this.jumpBuf = 0;
this.jumps = 0;
this.dashT = 0;
this.dashCd = 0;
this.dashDir = 1;
this.wallDir = 0;
this.wallLock = 0;
this.iframes = 0;
this.riding = null;
this.walk = 0;
this.squash = 0;
this.dead = false;
}

get cx() { return this.x + this.w / 2; }
get cy() { return this.y + this.h / 2; }

// ==========================================================
//  update
// ==========================================================
update(dt) {
const C = CONFIG;

if (this.dashCd > 0) this.dashCd -= dt;
if (this.wallLock > 0) this.wallLock -= dt;
if (this.iframes > 0) this.iframes -= dt;
if (this.squash > 0) this.squash -= dt * 3;

this.walk += Math.abs(this.vx) * dt * 0.045;

const move = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);

// ------------------------------------------------------
//  dash
// ------------------------------------------------------
if (Game.press.dash && Game.has('dash') && this.dashCd <= 0) {
Game.press.dash = false;
this.dashT = C.DASH_TIME;
this.dashDir = move !== 0 ? move : this.face;
this.face = this.dashDir;
this.dashCd = C.DASH_CD;
this.vy = 0;
this.iframes = Math.max(this.iframes, C.DASH_TIME * 0.7);
Audio.sfx('dash');
Game.shakeBy(2.5);
Game.burst(this.cx, this.cy, 9, {
color: PAL.ember, speed: 90, dir: -this.dashDir, spread: 0.7, life: 0.35,
});
}

if (this.dashT > 0) {
this.dashT -= dt;
this.vx = this.dashDir * C.DASH_SPEED;
this.vy = 0;
if (this.dashT <= 0) {
this.vx *= 0.5;
this.vy = 0;
}
} else {
// ----------------------------------------------------
//  walking
// ----------------------------------------------------
if (this.wallLock > 0) {
// wall jump: hands off for a moment
} else if (move !== 0) {
const accel = this.onGround ? C.GROUND_ACCEL : C.AIR_ACCEL;
this.vx = approach(this.vx, move * C.RUN_MAX, accel * dt);
this.face = move;
} else {
const drag = this.onGround ? C.GROUND_FRICTION : C.AIR_DRAG;
this.vx = approach(this.vx, 0, drag * dt);
}
}

// ------------------------------------------------------
//  jumping
// ------------------------------------------------------
if (Game.press.jump) {
Game.press.jump = false;
this.jumpBuf = C.BUFFER;
} else {
this.jumpBuf = Math.max(0, this.jumpBuf - dt);
}

if (this.onGround) this.coyote = C.COYOTE;
else this.coyote = Math.max(0, this.coyote - dt);

if (this.jumpBuf > 0) {
if (this.coyote > 0) {
this.vy = C.JUMP_VEL;
this.onGround = false;
this.coyote = 0;
this.jumpBuf = 0;
this.jumps = 1;
this.squash = 0.5;
Audio.sfx('jump');
Game.burst(this.cx, this.y + this.h, 5, {
color: PAL.stoneEdge, speed: 60, spread: 1.4, life: 0.3,
});
} else if (Game.has('wall') && this.wallDir !== 0) {
this.vy = C.WALL_JUMP_Y;
this.vx = -this.wallDir * C.WALL_JUMP_X;
this.wallLock = C.WALL_LOCK;
this.jumpBuf = 0;
this.jumps = 1;
this.face = -this.wallDir;
Audio.sfx('wall');
Game.shakeBy(2);
Game.burst(this.cx + this.wallDir * 10, this.cy, 7, {
color: PAL.stoneEdge, speed: 110, dir: -this.wallDir, spread: 0.9, life: 0.35,
});
} else if (Game.has('double') && this.jumps < 2) {
this.vy = C.DOUBLE_VEL;
this.jumps = 2;
this.jumpBuf = 0;
this.squash = 0.6;
Audio.sfx('double');
Game.burst(this.cx, this.y + this.h, 12, {
color: PAL.emberHot, speed: 120, spread: 1.6, life: 0.45,
});
}
}

// let go of jump early for a shorter hop
if (this.vy < C.JUMP_CUT && !Input.held('jump')) this.vy = C.JUMP_CUT;

// ------------------------------------------------------
//  gravity
// ------------------------------------------------------
if (this.dashT <= 0) {
this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);

// wall slide
const pushing = (this.wallDir > 0 && move > 0) || (this.wallDir < 0 && move < 0);
if (!this.onGround && pushing && this.vy > C.WALL_SLIDE && Game.has('wall')) {
this.vy = C.WALL_SLIDE;
if (Math.random() < 0.25) {
Game.burst(this.cx + this.wallDir * 9, this.y + this.h * 0.6, 1, {
color: PAL.stoneEdge, speed: 40, life: 0.35, up: -30,
});
}
}
}

// ------------------------------------------------------
//  move & collide
// ------------------------------------------------------
this.moveX(dt);
const prevBottom = this.y + this.h;
this.moveY(dt, prevBottom);
this.rideMovers(prevBottom);

// ------------------------------------------------------
//  hazards
// ------------------------------------------------------
const box = { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 6 };
const hazard = this.world.hazardIn(box);
if (hazard === '~') {
this.drown();
} else if (hazard === '^') {
this.hurt(this.cx);
}

if (this.y > this.world.pixelH + 120) this.drown();
}

// ----------------------------------------------------------
moveX(dt) {
this.x += this.vx * dt;
this.wallDir = 0;
if (this.vx === 0) return;

const top = Math.floor(this.y / TILE);
const bot = Math.floor((this.y + this.h - 1) / TILE);

if (this.vx > 0) {
const tx = Math.floor((this.x + this.w - 1) / TILE);
for (let ty = top; ty <= bot; ty++) {
if (this.world.solidAt(tx, ty)) {
this.x = tx * TILE - this.w - 0.01;
this.vx = 0;
this.wallDir = 1;
return;
}
}
} else {
const tx = Math.floor(this.x / TILE);
for (let ty = top; ty <= bot; ty++) {
if (this.world.solidAt(tx, ty)) {
this.x = (tx + 1) * TILE + 0.01;
this.vx = 0;
this.wallDir = -1;
return;
}
}
}
}

moveY(dt, prevBottom) {
const wasGround = this.onGround;
this.y += this.vy * dt;
this.onGround = false;

const left = Math.floor(this.x / TILE);
const right = Math.floor((this.x + this.w - 1) / TILE);

if (this.vy > 0) {
// note: y + h, not y + h - 1. Using the exact bottom edge is
// what keeps a standing player from jittering on tile seams.
const ty = Math.floor((this.y + this.h) / TILE);
for (let tx = left; tx <= right; tx++) {
const c = this.world.tileAt(tx, ty);
const solid = this.world.isSolidChar(c);
const oneWay = c === '=' && prevBottom <= ty * TILE + 2;
if (solid || oneWay) {
this.y = ty * TILE - this.h - 0.01;
this.vy = 0;
this.onGround = true;
if (c === '-') this.world.touchCrumble(tx, ty);
if (!wasGround) {
this.squash = 0.8;
Audio.sfx('land');
Game.burst(this.cx, this.y + this.h, 4, {
color: PAL.stoneEdge, speed: 55, spread: 1.5, life: 0.3,
});
}
break;
}
}
} else if (this.vy < 0) {
const ty = Math.floor(this.y / TILE);
for (let tx = left; tx <= right; tx++) {
if (this.world.solidAt(tx, ty)) {
this.y = (ty + 1) * TILE + 0.01;
this.vy = 0;
break;
}
}
}
}

rideMovers(prevBottom) {
this.riding = null;
for (const m of this.world.movers) {
const overlapX = this.x + this.w > m.x + 2 && this.x < m.x + m.w - 2;
if (!overlapX) continue;
if (this.vy >= 0 && prevBottom <= m.prevY + 8 && this.y + this.h >= m.y) {
this.y = m.y - this.h;
this.vy = 0;
this.onGround = true;
this.riding = m;
}
}
}

// ----------------------------------------------------------
hurt(fromX) {
if (this.iframes > 0 || this.dead) return;
this.hearts--;
this.iframes = CONFIG.IFRAMES;
this.dashT = 0;

const dir = this.cx < fromX ? -1 : 1;
this.vx = dir * CONFIG.HURT_KNOCK_X;
this.vy = CONFIG.HURT_KNOCK_Y;
this.wallLock = 0;

Audio.sfx('hurt');
Game.shakeBy(9);
Game.hitstop = 0.09;
Game.burst(this.cx, this.cy, 12, { color: PAL.blood, speed: 150, spread: 3.14, life: 0.5 });

if (this.hearts <= 0) this.die();
}

drown() {
if (this.dead) return;
this.hearts = Math.max(0, this.hearts - 1);
Audio.sfx('hurt');
Game.burst(this.cx, this.cy, 16, { color: PAL.waterLite, speed: 120, spread: 3.14, life: 0.6 });
if (this.hearts <= 0) this.die();
else Game.respawn(this);
}

die() {
this.dead = true;
Audio.sfx('die');
Game.shakeBy(14);
Game.hitstop = 0.16;
Game.burst(this.cx, this.cy, 26, { color: PAL.ember, speed: 190, spread: 3.14, life: 0.9 });
Game.playerDied();
}

respawn(pos) {
const hearts = this.hearts <= 0 ? CONFIG.MAX_HEARTS : this.hearts;
this.place(pos);
this.hearts = hearts;
this.iframes = 1.3;
}
}
