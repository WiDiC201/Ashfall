// ============================================================
//  ASHFALL - game.js
//  The state machine that holds everything together:
//  title -> story card -> play -> clear -> next chapter ...
// ============================================================
'use strict';

const Game = {
state: 'title',
chapter: 0,
world: null,
player: null,
abilities: { dash: false, wall: false, double: false },

// pressed keys are sampled once per frame so a single tap can
// never be eaten twice by the fixed physics steps
press: { jump: false, dash: false },

story: null,
dialogue: null,

time: 0,
acc: 0,
shake: 0,
hitstop: 0,
deadTimer: 0,
clearTimer: 0,
stateTimer: 0,
endingTimer: 0,
emberSpawn: 0,
drip: 0,
last: 0,

// ==========================================================
//  setup
// ==========================================================
boot() {
Render.init();
Input.attach();
requestAnimationFrame(this.frame.bind(this));
},

has(ability) { return !!this.abilities[ability]; },

abilitiesFor(i) {
return { dash: i >= 1, wall: i >= 2, double: i >= 3 };
},

burst(x, y, n, o) { FX.burst(x, y, n, o); },

shakeBy(n) { this.shake = Math.min(26, this.shake + n); },

// ==========================================================
//  the loop
// ==========================================================
frame(ts) {
requestAnimationFrame(this.frame.bind(this));

const now = ts / 1000;
let dt = this.last ? now - this.last : 0;
this.last = now;
dt = Math.min(dt, CONFIG.MAX_FRAME);

this.tick(dt);
this.draw(dt);
},

tick(dt) {
this.time += dt;
if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 42);
FX.update(dt);
if (this.dialogue) {
this.dialogue.t -= dt;
if (this.dialogue.t <= 0) this.dialogue = null;
}

switch (this.state) {
case 'title': this.tickTitle(dt); break;
case 'story': this.tickStory(dt); break;
case 'play': this.tickPlay(dt); break;
case 'paused': this.tickPaused(dt); break;
case 'dead': this.tickDead(dt); break;
case 'clear': this.tickClear(dt); break;
case 'ending': this.tickEnding(dt); break;
}

Input.endFrame();
},

// ----------------------------------------------------------
tickTitle(dt) {
this.emberSpawn -= dt;
if (this.emberSpawn <= 0) {
this.emberSpawn = rand(0.05, 0.16);
FX.trail(rand(0, CONFIG.VW), CONFIG.VH + 10, pick([PAL.ember, PAL.emberHot, PAL.flame]));
}

if (Input.pressedCode() && CONFIG.DEV) {
const n = Input.pressedCode();
if (n >= 1 && n <= LEVELS.length) {
Audio.init();
this.loadChapter(n - 1, true);
return;
}
}

if (Input.pressed('confirm')) {
Audio.init();
Audio.sfx('ui');
this.showStory({
title: 'ASHFALL',
subtitle: STORY.subtitle,
lines: STORY.intro,
hint: 'ENTER to begin',
next: () => {
this.state = 'title';
this.loadChapter(0, true);
},
});
}
},

// ----------------------------------------------------------
tickStory(dt) {
this.stateTimer += dt;
if (this.stateTimer > 0.35 && Input.pressed('confirm')) {
Audio.sfx('ui');
const next = this.story.next;
this.story = null;
this.stateTimer = 0;
if (next) next();
}
},

// ----------------------------------------------------------
tickPlay(dt) {
if (Input.pressed('pause')) { Audio.sfx('ui'); this.state = 'paused'; return; }
if (Input.pressed('restart')) { this.loadChapter(this.chapter, false); return; }
if (Input.pressed('mute')) { Audio.toggleMute(); return; }

this.press.jump = Input.pressed('jump');
this.press.dash = Input.pressed('dash');

if (this.hitstop > 0) {
this.hitstop -= dt;
return;
}

this.acc = Math.min(this.acc + dt, 0.12);
const step = CONFIG.FIXED;
while (this.acc >= step) {
this.world.update(step, this.player);
this.player.update(step);
this.acc -= step;
}

// a few embers drift off the lantern, so the dark has depth
this.drip -= dt;
if (this.drip <= 0) {
this.drip = rand(0.06, 0.18);
const lx = this.player.x + this.player.w / 2 + this.player.face * 9;
FX.trail(lx + rand(-2, 2), this.player.y + 24, pick([PAL.ember, PAL.flame, PAL.emberHot]));
}

Render.updateCamera(this.world, dt);
this.checkEntities();
},

// ----------------------------------------------------------
tickPaused(dt) {
if (Input.pressed('pause') || Input.pressed('confirm')) {
Audio.sfx('ui');
this.state = 'play';
}
},

// ----------------------------------------------------------
tickDead(dt) {
this.deadTimer -= dt;
this.world.update(dt, this.player);
Render.updateCamera(this.world, dt);
if (this.deadTimer <= 0) {
this.player.hearts = CONFIG.MAX_HEARTS;
this.player.respawn(this.spawnPoint());
Render.snapCamera(this.world);
this.state = 'play';
}
},

// ----------------------------------------------------------
tickClear(dt) {
this.clearTimer -= dt;
this.world.update(dt, this.player);
Render.updateCamera(this.world, dt);
if (this.clearTimer <= 0) this.afterBrazier();
},

// ----------------------------------------------------------
tickEnding(dt) {
this.endingTimer += dt;
this.emberSpawn -= dt;
if (this.emberSpawn <= 0) {
this.emberSpawn = rand(0.04, 0.12);
FX.trail(rand(0, CONFIG.VW), CONFIG.VH + 10, pick([PAL.ember, PAL.emberHot]));
}
const done = this.endingTimer > STORY.ending.length * 3.2 + 3;
if (done && Input.pressed('confirm')) {
Audio.stopMusic();
this.state = 'title';
FX.clear();
}
},

// ==========================================================
//  flow
// ==========================================================
showStory(opts) {
this.story = opts;
this.state = 'story';
this.stateTimer = 0;
},

loadChapter(i, announce) {
this.chapter = i;
this.world = new World(i);
this.player = new Player(this.world);
this.abilities = this.abilitiesFor(i);
this.acc = 0;
this.shake = 0;
this.hitstop = 0;
this.dialogue = null;
Render.prepare(this.world);
Audio.music(i);

const ch = STORY.chapter(i);
if (announce) {
const lines = ch.intro.slice();
const keys = ['dash', 'wall', 'double'];
if (i > 0 && i - 1 < keys.length) lines.push(STORY.unlocks[keys[i - 1]]);

this.showStory({
title: 'Chapter ' + ch.name,
subtitle: ch.title,
lines: lines,
hint: 'ENTER to begin',
next: () => { this.state = 'play'; },
});
} else {
this.state = 'play';
}
},

spawnPoint() {
return this.world.checkpoint || this.world.spawn;
},

respawn(player) {
const spot = this.spawnPoint();
player.place(spot);
player.iframes = 1.3;
if (player.hearts <= 0) player.hearts = CONFIG.MAX_HEARTS;
this.shake = 0;
Render.snapCamera(this.world);
},

playerDied() {
this.deadTimer = 1.0;
this.state = 'dead';
},

completeChapter() {
const b = this.world.braziers[0];
if (b) b.lit = true;
Audio.sfx('brazier');
this.shakeBy(10);
this.burst(b ? b.x : this.player.cx, b ? b.y : this.player.cy, 40, {
color: PAL.emberHot, speed: 220, up: 160, life: 1.4, gravity: 120,
});
this.clearTimer = 1.5;
this.state = 'clear';
},

afterBrazier() {
const ch = STORY.chapter(this.chapter);
const last = this.chapter >= LEVELS.length - 1;
this.showStory({
title: last ? 'The Last Lamp' : 'Chapter ' + ch.name + ' cleared',
subtitle: last ? '' : 'the light holds',
lines: ch.clear,
hint: last ? 'ENTER' : 'ENTER to go on',
next: () => {
if (last) this.startEnding();
else this.loadChapter(this.chapter + 1, true);
},
});
},

startEnding() {
this.state = 'ending';
this.endingTimer = 0;
this.emberSpawn = 0;
Audio.stopMusic();
Audio.sfx('brazier');
},

// ==========================================================
//  world interaction
// ==========================================================
checkEntities() {
const p = this.player;
const w = this.world;
const box = { x: p.x, y: p.y, w: p.w, h: p.h };

// embers
for (const e of w.embers) {
if (e.taken) continue;
if (Math.abs(e.x - p.cx) < 20 && Math.abs(e.y - p.cy) < 24) {
e.taken = true;
p.embers++;
Audio.sfx('ember');
this.burst(e.x, e.y, 10, { color: PAL.emberHot, speed: 110, life: 0.5, gravity: 120 });
}
}

// lanterns
for (const l of w.lanterns) {
if (l.lit) continue;
if (Math.abs(l.x - p.cx) < 26 && Math.abs(l.y - 20 - p.cy) < 34) {
l.lit = true;
w.checkpoint = { x: p.x, y: p.y };
Audio.sfx('checkpoint');
this.burst(l.x, l.y - 30, 14, { color: PAL.ember, speed: 90, life: 0.7, gravity: -20 });
}
}

// tablets
for (const s of w.tablets) {
const near = Math.abs(s.x - p.cx) < 34 && Math.abs(s.y - 16 - p.cy) < 40;
if (near && !s.read) {
s.read = true;
Audio.sfx('tablet');
this.dialogue = { text: s.text, t: 6.5 };
}
}

// brazier
for (const b of w.braziers) {
if (b.lit) continue;
if (Math.abs(b.x - p.cx) < 34 && Math.abs(b.y - 12 - p.cy) < 52) {
this.completeChapter();
return;
}
}

// enemies
for (const e of w.enemies) {
if (!e.alive) continue;
if (!aabb(box, e)) continue;

const stomp = e.kind === 'crawler' && p.vy > 60 && p.y + p.h - 10 < e.y + 12;
if (stomp) {
e.alive = false;
e.squash = 0.45;
p.vy = -430;
p.jumps = 1;
Audio.sfx('stomp');
this.shakeBy(5);
this.hitstop = 0.05;
this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, {
color: '#6d6480', speed: 150, life: 0.5, gravity: 500,
});
} else {
p.hurt(e.x + e.w / 2);
}
}
},

// ==========================================================
//  drawing
// ==========================================================
draw(dt) {
const ctx = Render.ctx;

if (this.state === 'title') {
this.drawTitle(ctx, dt);
return;
}

if (!this.world) return;

Render.draw(this.world, this.player, dt);

if (this.dialogue && this.state === 'play') {
Render.dialogue(ctx, this.dialogue.text);
}

if (this.state === 'story' && this.story) {
Render.card(ctx, this.story.title, this.story.subtitle, this.story.lines, this.story.hint);
} else if (this.state === 'paused') {
this.drawPause(ctx);
} else if (this.state === 'ending') {
this.drawEnding(ctx);
} else if (this.state === 'clear') {
const k = clamp(1 - this.clearTimer / 1.5, 0, 1);
ctx.fillStyle = 'rgba(255,180,110,' + (0.18 * (1 - k)) + ')';
ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
}
},

drawTitle(ctx, dt) {
const W = CONFIG.VW, H = CONFIG.VH;

const g = ctx.createLinearGradient(0, 0, 0, H);
g.addColorStop(0, '#04050b');
g.addColorStop(0.6, '#0a0f1d');
g.addColorStop(1, '#101728');
ctx.fillStyle = g;
ctx.fillRect(0, 0, W, H);

// a slow breathing glow behind the title
const pulse = 0.5 + Math.sin(this.time * 0.7) * 0.12;
const rg = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, 320);
rg.addColorStop(0, 'rgba(255,150,70,' + (0.13 * pulse) + ')');
rg.addColorStop(1, 'rgba(255,120,40,0)');
ctx.fillStyle = rg;
ctx.fillRect(0, 0, W, H);

FX.draw(ctx, { x: 0, y: 0 });

ctx.textAlign = 'center';

ctx.save();
ctx.shadowColor = 'rgba(255,150,80,0.55)';
ctx.shadowBlur = 40;
ctx.font = '300 96px Georgia, "Times New Roman", serif';
ctx.fillStyle = '#f2e6cf';
ctx.fillText('ASHFALL', W / 2, H * 0.42);
ctx.restore();

ctx.font = 'italic 21px Georgia, serif';
ctx.fillStyle = 'rgba(205,195,175,0.65)';
ctx.fillText(STORY.subtitle, W / 2, H * 0.42 + 42);

const a = 0.35 + Math.sin(this.time * 3) * 0.35;
ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
ctx.fillStyle = 'rgba(255,190,120,' + a + ')';
ctx.fillText('PRESS  ENTER', W / 2, H * 0.72);

ctx.font = '13px "Segoe UI", system-ui, sans-serif';
ctx.fillStyle = 'rgba(190,200,230,0.45)';
ctx.fillText('A / D  move     SPACE  jump     SHIFT  dash     R  restart     ESC  pause', W / 2, H - 64);
ctx.fillStyle = 'rgba(190,200,230,0.25)';
ctx.fillText('headphones recommended    sound is generated live', W / 2, H - 40);

if (CONFIG.DEV) {
ctx.textAlign = 'right';
ctx.fillStyle = 'rgba(190,200,230,0.18)';
ctx.font = '11px "Segoe UI", system-ui, sans-serif';
ctx.fillText('dev: 1-5 jump to chapter', W - 16, H - 14);
}
},

drawPause(ctx) {
ctx.fillStyle = 'rgba(4,6,13,0.82)';
ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
ctx.textAlign = 'center';
ctx.font = '300 44px Georgia, serif';
ctx.fillStyle = PAL.bone;
ctx.fillText('PAUSED', CONFIG.VW / 2, 200);

ctx.font = '16px Georgia, serif';
ctx.fillStyle = 'rgba(220,215,200,0.7)';
const lines = [
'A / D  -  walk',
'SPACE  -  jump   (hold for height)',
'SHIFT  -  dash',
'R  -  restart this chapter',
'M  -  mute',
'ESC  -  resume',
];
lines.forEach((l, i) => ctx.fillText(l, CONFIG.VW / 2, 262 + i * 30));

if (this.player) {
ctx.font = 'italic 16px Georgia, serif';
ctx.fillStyle = 'rgba(255,190,120,0.75)';
ctx.fillText('embers gathered: ' + this.player.embers + ' / ' + this.world.emberTotal, CONFIG.VW / 2, 470);
}
},

drawEnding(ctx) {
const W = CONFIG.VW, H = CONFIG.VH;
const t = this.endingTimer;

// the sky slowly warms
const k = clamp(t / 14, 0, 1);
const g = ctx.createLinearGradient(0, 0, 0, H);
g.addColorStop(0, 'rgb(' + Math.round(4 + 60 * k) + ',' + Math.round(5 + 34 * k) + ',' + Math.round(11 + 18 * k) + ')');
g.addColorStop(0.55, 'rgb(' + Math.round(10 + 120 * k) + ',' + Math.round(15 + 62 * k) + ',28)');
g.addColorStop(1, 'rgb(' + Math.round(19 + 150 * k) + ',' + Math.round(26 + 70 * k) + ',40)');
ctx.fillStyle = g;
ctx.fillRect(0, 0, W, H);

const sun = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, 240 + 120 * k);
sun.addColorStop(0, 'rgba(255,235,190,' + (0.15 + 0.5 * k) + ')');
sun.addColorStop(1, 'rgba(255,160,80,0)');
ctx.fillStyle = sun;
ctx.fillRect(0, 0, W, H);

FX.draw(ctx, { x: 0, y: 0 });

ctx.textAlign = 'center';
const per = 3.2;
const lines = STORY.ending;
const idx = Math.min(lines.length - 1, Math.floor(t / per));

ctx.font = '18px Georgia, serif';
for (let i = 0; i <= idx; i++) {
const local = clamp((t - i * per) / 1.1, 0, 1);
const fade = i === idx ? local : 0.42;
ctx.fillStyle = 'rgba(245,236,220,' + fade + ')';   
this.wrapped(ctx, lines[i], W / 2, H * 0.32 + i * 86, 660, 26);
}

if (t > lines.length * per + 2.2) {
const a = clamp((t - lines.length * per - 2.2) / 1.5, 0, 1);
ctx.font = '500 13px "Segoe UI", system-ui, sans-serif';
ctx.fillStyle = 'rgba(255,220,180,' + (0.35 + Math.sin(t * 3) * 0.25) * a + ')';
ctx.fillText(STORY.endingFoot, W / 2, H - 32);
}
},

wrapped(ctx, text, cx, y, maxWidth, lineHeight) {
const lines = Render.wrap(ctx, text, maxWidth);
lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
},
};

window.addEventListener('load', () => Game.boot());
