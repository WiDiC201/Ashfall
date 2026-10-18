// ============================================================
//  ASHFALL — render.js
//  Everything you see. Also the camera and the particles.
//
//  The trick that makes the game feel lit: draw the world,
//  then lay a near-black sheet over it and punch soft holes
//  in that sheet wherever a light is. No shaders needed.
// ============================================================
'use strict';

// ------------------------------------------------------------
//  particles
// ------------------------------------------------------------
const FX = {
  list: [],

  burst(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      if (this.list.length > 420) break;
      const ang = (o.spread !== undefined)
        ? (o.dir || 0) + rand(-o.spread / 2, o.spread / 2)
        : rand(0, Math.PI * 2);
      const sp = rand((o.speed || 120) * 0.35, o.speed || 120);
      this.list.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (o.up ? o.up * rand(0.3, 1) : 0),
        life: (o.life || 0.5) * rand(0.7, 1.3),
        max: o.life || 0.5,
        color: o.color || PAL.ember,
        size: o.size || rand(1.4, 3.2),
        gravity: o.gravity === undefined ? 420 : o.gravity,
        add: o.add !== false,
      });
    }
  },

  trail(x, y, color) {
    if (this.list.length > 420) return;
    this.list.push({
      x: x, y: y, vx: rand(-8, 8), vy: rand(-40, -12),
      life: rand(0.6, 1.4), max: 1.4, color: color || PAL.ember,
      size: rand(0.8, 2.0), gravity: -12, add: true,
    });
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.6 * dt;
    }
  },

  draw(ctx, cam) {
    ctx.save();
    for (const p of this.list) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + a * 0.8);
      ctx.fillRect(p.x - cam.x - s / 2, p.y - cam.y - s / 2, s, s);
    }
    ctx.restore();
  },

  clear() { this.list.length = 0; },
};

// ------------------------------------------------------------
//  renderer
// ------------------------------------------------------------
const Render = {
  canvas: null,
  ctx: null,
  cam: { x: 0, y: 0 },

  lightCv: null,
  lightCtx: null,

  bg: null,
  t: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CONFIG.VW;
    this.canvas.height = CONFIG.VH;
    this.lightCv = document.createElement('canvas');
    this.lightCv.width = CONFIG.VW;
    this.lightCv.height = CONFIG.VH;
    this.lightCtx = this.lightCv.getContext('2d');
  },

  // build the parallax scenery once per chapter
  prepare(world) {
    const rnd = seeded(world.def.seed);
    const far = [];
    const near = [];
    const dust = [];
    for (let i = 0; i < 40; i++) {
      far.push({
        x: i * 170 + rnd() * 60,
        w: 50 + rnd() * 90,
        h: 140 + rnd() * 260,
        shade: rnd(),
      });
    }
    for (let i = 0; i < 26; i++) {
      near.push({
        x: i * 250 + rnd() * 90,
        w: 60 + rnd() * 110,
        h: 80 + rnd() * 190,
        shade: rnd(),
      });
    }
    for (let i = 0; i < 46; i++) {
      dust.push({
        x: rnd() * CONFIG.VW,
        y: rnd() * CONFIG.VH,
        r: 0.6 + rnd() * 1.6,
        sp: 4 + rnd() * 14,
        ph: rnd() * 6.28,
      });
    }
    this.bg = { far, near, dust };
    FX.clear();
    this.cam.x = 0;
    this.cam.y = 0;
    this.snapCamera(world);
  },

  snapCamera(world) {
    const p = Game.player;
    if (!p) return;
    this.cam.x = clamp(p.cx - CONFIG.VW / 2, 0, Math.max(0, world.pixelW - CONFIG.VW));
    this.cam.y = clamp(p.cy - CONFIG.VH / 2, 0, Math.max(0, world.pixelH - CONFIG.VH));
  },

  updateCamera(world, dt) {
    const p = Game.player;
    if (!p) return;
    const targetX = p.cx + clamp(p.vx * 0.22, -70, 70) - CONFIG.VW / 2;
    const targetY = p.cy - CONFIG.VH / 2 - 10;

    const maxX = Math.max(0, world.pixelW - CONFIG.VW);
    const maxY = Math.max(0, world.pixelH - CONFIG.VH);
    const k = 1 - Math.exp(-9 * dt);

    this.cam.x = lerp(this.cam.x, clamp(targetX, 0, maxX), k);
    this.cam.y = lerp(this.cam.y, clamp(targetY, 0, maxY), k);
    this.cam.x = clamp(this.cam.x, 0, maxX);
    this.cam.y = clamp(this.cam.y, 0, maxY);
  },

  // ==========================================================
  //  drawing
  // ==========================================================
  draw(world, player, dt) {
    const ctx = this.ctx;
    const cam = this.cam;
    this.t += dt;

    // shake is decayed by the game loop, applied here
    let sx = 0, sy = 0;
    if (Game.shake > 0.2) {
      sx = rand(-1, 1) * Game.shake;
      sy = rand(-1, 1) * Game.shake;
    }
    cam.x += sx;
    cam.y += sy;

    this.drawSky(ctx, world);
    this.drawBackdrop(ctx, cam);

    // --- world ----------------------------------------------
    this.drawTiles(ctx, world, cam);
    this.drawEntities(ctx, world, cam);
    this.drawPlayer(ctx, player, cam);
    FX.draw(ctx, cam);

    this.drawLights(ctx, world, player, cam);
    this.drawVignette(ctx);

    cam.x -= sx;
    cam.y -= sy;

    this.drawHUD(ctx, world, player);
  },

  drawSky(ctx, world) {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.VH);
    const dark = world.def.darkness;
    g.addColorStop(0, '#04050b');
    g.addColorStop(0.45, '#0a0f1d');
    g.addColorStop(1, '#131a2b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);

    // a faint moon-coloured stain where the sun used to be
    const mx = CONFIG.VW * 0.72, my = CONFIG.VH * 0.24;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 260);
    mg.addColorStop(0, 'rgba(120,140,190,' + (0.05 + (1 - dark) * 0.25) + ')');
    mg.addColorStop(1, 'rgba(120,140,190,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
  },

  drawBackdrop(ctx, cam) {
    if (!this.bg) return;
    const t = this.t;

    // far towers
    ctx.fillStyle = '#111828';
    for (const s of this.bg.far) {
      const x = s.x - cam.x * 0.25;
      const base = CONFIG.VH + 60 - cam.y * 0.12;
      this.tower(ctx, x, base, s.w, s.h);
    }

    // floating fog bands
    ctx.fillStyle = 'rgba(90,110,160,0.05)';
    for (let i = 0; i < 3; i++) {
      const y = 120 + i * 140 + Math.sin(t * 0.3 + i) * 14;
      ctx.fillRect(0, y, CONFIG.VW, 46);
    }

    // near ruins
    ctx.fillStyle = '#182034';
    for (const s of this.bg.near) {
      const x = s.x - cam.x * 0.55;
      const base = CONFIG.VH + 90 - cam.y * 0.3;
      this.tower(ctx, x, base, s.w, s.h);
    }

    // dust
    ctx.fillStyle = 'rgba(200,215,245,0.20)';
    for (const d of this.bg.dust) {
      const x = (d.x + t * d.sp) % CONFIG.VW;
      const y = d.y + Math.sin(t * 0.6 + d.ph) * 12;
      ctx.fillRect(x, y, d.r, d.r);
    }
  },

  tower(ctx, x, baseY, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w * 0.18, baseY - h);
    ctx.lineTo(x + w * 0.82, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath();
    ctx.fill();
  },

  drawTiles(ctx, world, cam) {
    const T = TILE;
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1);
    const x1 = Math.min(world.w - 1, Math.floor((cam.x + CONFIG.VW) / T) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const y1 = Math.min(world.h - 1, Math.floor((cam.y + CONFIG.VH) / T) + 1);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = world.grid[ty][tx];
        if (c === '.') continue;
        const sx = Math.round(tx * T - cam.x);
        const sy = Math.round(ty * T - cam.y);

        if (c === '#') this.stone(ctx, world, tx, ty, sx, sy);
        else if (c === '=') this.plank(ctx, sx, sy);
        else if (c === '-') this.crumble(ctx, world, tx, ty, sx, sy);
        else if (c === '^') this.spikes(ctx, sx, sy);
        else if (c === '~') this.water(ctx, world, tx, ty, sx, sy);
      }
    }
  },

  stone(ctx, world, tx, ty, sx, sy) {
    const T = TILE;
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(sx, sy, T, T);

    const above = world.tileAt(tx, ty - 1);
    if (above !== '#' && above !== '-') {
      ctx.fillStyle = PAL.stoneLite;
      ctx.fillRect(sx, sy, T, 7);
      ctx.fillStyle = PAL.stoneEdge;
      ctx.fillRect(sx, sy, T, 2);
      // moss on some tiles, deterministically
      if ((tx * 7 + ty * 13) % 11 < 4) {
        ctx.fillStyle = PAL.moss;
        ctx.fillRect(sx, sy + 3, T, 3);
      }
    } else if ((tx * 3 + ty * 17) % 7 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(sx + 4, sy + 6, T - 8, 2);
    }

    const below = world.tileAt(tx, ty + 1);
    if (below !== '#' && below !== '-') {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(sx, sy + T - 6, T, 6);
    }
  },

  plank(ctx, sx, sy) {
    const T = TILE;
    ctx.fillStyle = PAL.stoneLite;
    ctx.fillRect(sx, sy + 3, T, 7);
    ctx.fillStyle = PAL.stoneEdge;
    ctx.fillRect(sx, sy + 3, T, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx, sy + 10, T, 2);
  },

  crumble(ctx, world, tx, ty, sx, sy) {
    const T = TILE;
    const state = world.crumbles.get(tx + ',' + ty);
    let ox = 0;
    if (state && state.gone <= 0) ox = Math.sin(state.timer * 70) * 1.6;

    ctx.fillStyle = '#2a2b3d';
    ctx.fillRect(sx + ox, sy, T, T);
    ctx.fillStyle = '#3a3d57';
    ctx.fillRect(sx + ox, sy, T, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + ox + T * 0.3, sy + 4);
    ctx.lineTo(sx + ox + T * 0.45, sy + T * 0.5);
    ctx.lineTo(sx + ox + T * 0.28, sy + T);
    ctx.stroke();
  },

  spikes(ctx, sx, sy) {
    const T = TILE;
    ctx.fillStyle = '#6f7a9c';
    for (let i = 0; i < 3; i++) {
      const bx = sx + i * (T / 3);
      ctx.beginPath();
      ctx.moveTo(bx + 1, sy + T);
      ctx.lineTo(bx + T / 6, sy + 6);
      ctx.lineTo(bx + T / 3 - 1, sy + T);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 3; i++) {
      const bx = sx + i * (T / 3) + T / 6;
      ctx.fillRect(bx - 1, sy + 9, 1.5, 10);
    }
  },

  water(ctx, world, tx, ty, sx, sy) {
    const T = TILE;
    const surface = world.tileAt(tx, ty - 1) !== '~';
    ctx.fillStyle = PAL.water;
    ctx.fillRect(sx, sy, T, T);

    if (surface) {
      const wave = Math.sin(this.t * 2 + tx * 0.6) * 2.5;
      ctx.fillStyle = PAL.waterLite;
      ctx.fillRect(sx, sy + 2 + wave, T, 3);
      ctx.fillStyle = 'rgba(140,200,230,0.16)';
      ctx.fillRect(sx, sy + 5 + wave, T, 1.5);
    }
  },

  drawEntities(ctx, world, cam, time) {
    const t = this.t;

    // embers
    for (const e of world.embers) {
      if (e.taken) continue;
      const x = e.x - cam.x;
      const y = e.y - cam.y + Math.sin(t * 2 + e.phase) * 3;
      if (x < -40 || x > CONFIG.VW + 40) continue;

      const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
      g.addColorStop(0, 'rgba(255,190,110,0.55)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 18, y - 18, 36, 36);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 1.2 + e.phase);
      ctx.fillStyle = PAL.emberHot;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // lanterns (checkpoints)
    for (const l of world.lanterns) {
      const x = l.x - cam.x;
      const y = l.y - cam.y;
      if (x < -60 || x > CONFIG.VW + 60) continue;

      // post
      ctx.fillStyle = '#2b2f45';
      ctx.fillRect(x - 2, y - 26, 4, 26);
      ctx.fillRect(x - 8, y - 2, 16, 3);

      if (l.lit) {
        const glow = ctx.createRadialGradient(x, y - 32, 0, x, y - 32, 46);
        glow.addColorStop(0, 'rgba(255,190,120,0.55)');
        glow.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 46, y - 78, 92, 92);
      }

      ctx.fillStyle = l.lit ? PAL.emberHot : '#3c4058';
      ctx.beginPath();
      ctx.arc(x, y - 34, 6, 0, 6.28);
      ctx.fill();
      ctx.strokeStyle = '#2b2f45';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // braziers
    for (const b of world.braziers) {
      const x = b.x - cam.x;
      const y = b.y - cam.y;
      if (x < -80 || x > CONFIG.VW + 80) continue;

      ctx.fillStyle = '#33384f';
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 20);
      ctx.lineTo(x + 14, y - 20);
      ctx.lineTo(x + 9, y - 2);
      ctx.lineTo(x - 9, y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#22263a';
      ctx.fillRect(x - 4, y - 2, 8, 4);

      const flick = 1 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.06;
      const fh = (b.lit ? 30 : 9) * flick;
      const grad = ctx.createLinearGradient(x, y - 20 - fh, x, y - 20);
      grad.addColorStop(0, b.lit ? PAL.emberHot : '#4a4a5e');
      grad.addColorStop(1, b.lit ? PAL.flame : '#2c2c3c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y - 20 - fh);
      ctx.quadraticCurveTo(x + 12, y - 18 - fh * 0.3, x, y - 18);
      ctx.quadraticCurveTo(x - 12, y - 18 - fh * 0.3, x, y - 20 - fh);
      ctx.fill();
    }

    // tablets
    for (const s of world.tablets) {
      const x = s.x - cam.x;
      const y = s.y - cam.y;
      if (x < -60 || x > CONFIG.VW + 60) continue;
      ctx.fillStyle = '#3a4160';
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x - 7, y - 26);
      ctx.lineTo(x, y - 31);
      ctx.lineTo(x + 7, y - 26);
      ctx.lineTo(x + 9, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = s.read ? 'rgba(255,216,150,0.35)' : 'rgba(255,216,150,0.75)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - 5, y - 22 + i * 5, 10 - (i % 2) * 3, 1.4);
      }
    }

    // enemies
    for (const e of world.enemies) {
      if (!e.alive && e.squash <= 0) continue;
      const x = e.x - cam.x;
      const y = e.y - cam.y;
      if (x < -80 || x > CONFIG.VW + 80) continue;

      if (e.kind === 'crawler') {
        const sq = e.squash > 0 ? 0.35 : 1;
        ctx.fillStyle = e.squash > 0 ? '#3f3a4a' : '#4b4359';
        ctx.beginPath();
        ctx.ellipse(x + e.w / 2, y + e.h - 6 * sq, 11, 9 * sq, 0, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = '#14121c';
        for (let i = 0; i < 3; i++) {
          const lx = x + 4 + i * 6;
          ctx.fillRect(lx, y + e.h - 4, 2, 4 + Math.sin(t * 8 + i) * 1.5);
        }
        if (e.squash <= 0) {
          ctx.fillStyle = PAL.ember;
          ctx.fillRect(x + (e.dir > 0 ? 13 : 5), y + e.h - 12, 3, 2);
        }
      } else {
        // drifter: a pale wisp
        const wob = Math.sin(t * 3 + e.phase);
        ctx.fillStyle = 'rgba(150,180,230,0.30)';
        ctx.beginPath();
        ctx.arc(x + 11, y + 11, 13 + wob, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,220,255,0.55)';
        ctx.beginPath();
        ctx.arc(x + 8, y + 10, 4, 0, 6.28);
        ctx.arc(x + 14, y + 13, 3, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(x + 7, y + 8, 2, 2);
        ctx.fillRect(x + 13, y + 11, 2, 2);
      }
    }

    // moving platforms
    for (const m of world.movers) {
      const x = m.x - cam.x;
      const y = m.y - cam.y;
      ctx.fillStyle = '#3a4160';
      ctx.fillRect(x, y, m.w, 10);
      ctx.fillStyle = PAL.stoneEdge;
      ctx.fillRect(x, y, m.w, 2);
      ctx.fillStyle = 'rgba(255,180,100,0.25)';
      ctx.fillRect(x + 4, y + 11, m.w - 8, 2);
    }
  },

  lanternPos(p, cam) {
    const swing = clamp(p.vx / 400, -1, 1) * 0.5 + Math.sin(this.t * 3) * 0.06;
    const ax = p.x + p.w / 2 + p.face * 9 - cam.x;
    const ay = p.y + 12 - cam.y;
    return { x: ax + Math.sin(swing) * 8, y: ay + Math.cos(swing) * 8, swing };
  },

  drawPlayer(ctx, p, cam) {
    if (p.dead) return;
    if (p.iframes > 0 && Math.floor(p.iframes * 24) % 2 === 0) return;

    const cx = p.x + p.w / 2 - cam.x;
    const feet = p.y + p.h - cam.y;
    const face = p.face;
    const speed = Math.abs(p.vx);
    const running = speed > 25 && p.onGround;
    const bob = running ? Math.sin(p.walk * 2.4) * 1.6 : Math.sin(this.t * 2) * 0.6;
    const sq = 1 - p.squash * 0.05;

    ctx.save();
    ctx.translate(cx, feet);

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 3.5, 0, 0, 6.28);
    ctx.fill();

    // legs
    const swing = running ? Math.sin(p.walk * 3.2) * 4 : 0;
    ctx.strokeStyle = '#241d2b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -9 * sq);
    ctx.lineTo(-4 + swing, -1);
    ctx.moveTo(3, -9 * sq);
    ctx.lineTo(4 - swing, -1);
    ctx.stroke();

    // cloak
    const sway = clamp(-p.vx / 900, -3, 3);
    ctx.fillStyle = PAL.cloak;
    ctx.beginPath();
    ctx.moveTo(-7, -28 + bob);
    ctx.quadraticCurveTo(-11, -14, -10 + sway, -1);
    ctx.lineTo(9 + sway, -1);
    ctx.quadraticCurveTo(11, -14, 7, -28 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = PAL.cloakDark;
    ctx.beginPath();
    ctx.moveTo(-7, -28 + bob);
    ctx.quadraticCurveTo(-11, -14, -10 + sway, -1);
    ctx.lineTo(-4 + sway, -1);
    ctx.quadraticCurveTo(-6, -14, -3, -27 + bob);
    ctx.closePath();
    ctx.fill();

    // hood + face
    ctx.fillStyle = PAL.cloakDark;
    ctx.beginPath();
    ctx.arc(0, -31 + bob, 7.5, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    ctx.fillStyle = PAL.skin;
    ctx.beginPath();
    ctx.arc(face * 1.5, -30 + bob, 4.6, 0, 6.28);
    ctx.fill();

    ctx.fillStyle = '#2a1f28';
    ctx.fillRect(face * 3 - 0.8, -31 + bob, 1.6, 1.6);

    // arm holding the lantern
    const lp = this.lanternPos(p, cam);
    const lx = lp.x - cx;
    const ly = lp.y - feet;

    ctx.strokeStyle = PAL.cloakDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(face * 4, -22 + bob);
    ctx.lineTo(lx, ly - 2);
    ctx.stroke();

    // the lantern itself
    ctx.strokeStyle = '#3a3f58';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 6);
    ctx.lineTo(lx, ly - 2);
    ctx.stroke();

    const flick = 1 + Math.sin(this.t * 11) * 0.1;
    ctx.fillStyle = PAL.emberHot;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 4.2 * flick, 5.2 * flick, 0, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,60,0.9)';
    ctx.beginPath();
    ctx.ellipse(lx, ly, 2.4, 3.2, 0, 0, 6.28);
    ctx.fill();

    ctx.strokeStyle = '#4a3a30';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx - 4.6, ly - 6.6, 9.2, 13);

    ctx.restore();
  },

  drawLights(ctx, world, player, cam) {
    const lc = this.lightCtx;
    const dark = world.def.darkness;

    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, CONFIG.VW, CONFIG.VH);
    lc.fillStyle = 'rgba(3,5,12,' + dark + ')';
    lc.fillRect(0, 0, CONFIG.VW, CONFIG.VH);

    lc.globalCompositeOperation = 'destination-out';

    const hole = (x, y, r, strength) => {
      if (x < -r || x > CONFIG.VW + r || y < -r || y > CONFIG.VH + r) return;
      const g = lc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,' + strength + ')');
      g.addColorStop(0.55, 'rgba(255,255,255,' + strength * 0.72 + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lc.fillStyle = g;
      lc.fillRect(x - r, y - r, r * 2, r * 2);
    };

    // the lamplighter's lantern
    if (!player.dead) {
      const lp = this.lanternPos(player, cam);
      const flick = 1 + Math.sin(this.t * 9) * 0.03 + Math.sin(this.t * 21) * 0.015;
      hole(lp.x, lp.y, CONFIG.LIGHT_R * flick, 0.97);
      // a much wider, much fainter halo so you can still read the
      // ground a few tiles beyond the lantern
      hole(lp.x, lp.y, 700, 0.50);
    }

    for (const l of world.lanterns) {
      if (!l.lit) continue;
      hole(l.x - cam.x, l.y - cam.y - 20, 150, 0.75);
    }
    for (const b of world.braziers) {
      hole(b.x - cam.x, b.y - cam.y - 26, b.lit ? 260 : 60, b.lit ? 0.95 : 0.3);
    }
    for (const e of world.embers) {
      if (e.taken) continue;
      hole(e.x - cam.x, e.y - cam.y, 40, 0.5);
    }
    for (const p of FX.list) {
      if (!p.add) continue;
      hole(p.x - cam.x, p.y - cam.y, 16, 0.3 * (p.life / p.max));
    }

    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightCv, 0, 0);

    // warm additive glow around the lantern
    if (!player.dead) {
      const lp = this.lanternPos(player, cam);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 210);
      g.addColorStop(0, 'rgba(255,150,70,0.20)');
      g.addColorStop(0.5, 'rgba(255,120,50,0.06)');
      g.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lp.x - 210, lp.y - 210, 420, 420);
      ctx.restore();
    }
  },

  drawVignette(ctx) {
    const g = ctx.createRadialGradient(
      CONFIG.VW / 2, CONFIG.VH / 2, CONFIG.VH * 0.35,
      CONFIG.VW / 2, CONFIG.VH / 2, CONFIG.VH * 0.85
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
  },

  // ==========================================================
  //  HUD
  // ==========================================================
  drawHUD(ctx, world, player) {
    const t = this.t;
    ctx.save();

    // hearts
    for (let i = 0; i < CONFIG.MAX_HEARTS; i++) {
      const x = 30 + i * 26;
      const y = 34;
      const on = i < player.hearts;
      if (on) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, 'rgba(255,180,100,0.55)');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 14, y - 14, 28, 28);
      }
      ctx.fillStyle = on ? PAL.ember : 'rgba(120,130,165,0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.bezierCurveTo(x + 8, y - 2, x + 6, y + 7, x, y + 9);
      ctx.bezierCurveTo(x - 6, y + 7, x - 8, y - 2, x, y - 7);
      ctx.fill();
    }

    // dash readiness
    if (Game.has('dash')) {
      const ready = player.dashCd <= 0;
      const w = 100 * (1 - clamp(player.dashCd / CONFIG.DASH_CD, 0, 1));
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(18, 50, 100, 3);
      ctx.fillStyle = ready ? PAL.ember : 'rgba(150,165,200,0.35)';
      ctx.fillRect(18, 50, w, 3);
      ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(200,210,235,0.45)';
      ctx.fillText('DASH', 18, 70);
    }

    // embers
    const ex = CONFIG.VW - 118;
    ctx.save();
    ctx.translate(ex, 32);
    ctx.rotate(t * 0.8);
    ctx.fillStyle = PAL.ember;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PAL.pale;
    ctx.textAlign = 'left';
    ctx.fillText(player.embers + ' / ' + world.emberTotal, ex + 14, 38);

    // chapter name
    ctx.textAlign = 'right';
    ctx.font = '500 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(190,200,230,0.4)';
    ctx.fillText('CHAPTER ' + STORY.chapter(Game.chapter).name + '  ·  ' + STORY.chapter(Game.chapter).title.toUpperCase(), CONFIG.VW - 18, CONFIG.VH - 18);

    ctx.restore();
  },

  // ==========================================================
  //  text helpers
  // ==========================================================
  wrap(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  card(ctx, title, subtitle, lines, hint) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,13,0.92)';
    ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);

    const cx = CONFIG.VW / 2;
    let y = 150;

    if (title) {
      ctx.textAlign = 'center';
      ctx.font = '300 46px Georgia, "Times New Roman", serif';
      ctx.fillStyle = PAL.bone;
      ctx.fillText(title, cx, y);
      y += 26;
    }
    if (subtitle) {
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillStyle = 'rgba(200,190,170,0.55)';
      ctx.fillText(subtitle, cx, y);
      y += 22;
    }

    y += 28;
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = 'rgba(225,220,210,0.86)';
    for (const line of lines) {
      for (const wrapped of this.wrap(ctx, line, 620)) {
        ctx.fillText(wrapped, cx, y);
        y += 32;
      }
      y += 6;
    }

    if (hint) {
      ctx.font = '500 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,180,100,' + (0.45 + Math.sin(this.t * 4) * 0.3) + ')';
      ctx.fillText(hint, cx, CONFIG.VH - 60);
    }
    ctx.restore();
  },

  dialogue(ctx, text) {
    const h = 96;
    const y = CONFIG.VH - h - 40;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,16,0.9)';
    ctx.fillRect(70, y, CONFIG.VW - 140, h);
    ctx.strokeStyle = 'rgba(255,180,110,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(70.5, y + 0.5, CONFIG.VW - 141, h - 1);

    ctx.textAlign = 'center';
    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillStyle = 'rgba(230,220,200,0.9)';
    const lines = this.wrap(ctx, text, CONFIG.VW - 220);
    const startY = y + h / 2 - (lines.length - 1) * 12;
    lines.forEach((l, i) => ctx.fillText(l, CONFIG.VW / 2, startY + i * 24 + 6));
    ctx.restore();
  },
};
