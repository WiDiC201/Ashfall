// ============================================================
//  ASHFALL — config.js
//  Every tunable number in the game lives here. If a jump
//  feels wrong, change it here and nothing else.
// ============================================================
'use strict';

const CONFIG = {
  VW: 960,              // canvas width  (pixels)
  VH: 540,              // canvas height (pixels)
  TILE: 32,             // one map tile is 32x32 pixels

  FIXED: 1 / 120,       // physics runs at a fixed 120 steps per second
  MAX_FRAME: 1 / 20,    // never step more than 1/20s at a time

  // --- gravity & running -----------------------------------
  GRAVITY: 2200,
  MAX_FALL: 950,
  RUN_MAX: 238,
  GROUND_ACCEL: 3000,
  AIR_ACCEL: 2100,
  GROUND_FRICTION: 2600,
  AIR_DRAG: 300,

  // --- jumping ---------------------------------------------
  JUMP_VEL: -700,       // negative because up is negative
  JUMP_CUT: -600,       // let go early -> shorter hop (~2.5 tiles)
  HOLD_GRAV: 0.70,      // gravity while still holding a rising jump
  COYOTE: 0.10,         // grace after walking off a ledge
  BUFFER: 0.12,         // grace for pressing jump before landing
  DOUBLE_VEL: -570,

  // --- walls -----------------------------------------------
  WALL_SLIDE: 165,
  WALL_JUMP_X: 345,
  WALL_JUMP_Y: -640,
  WALL_LOCK: 0.16,

  // --- dash ------------------------------------------------
  DASH_SPEED: 585,
  DASH_TIME: 0.14,
  DASH_CD: 0.55,

  // --- player ----------------------------------------------
  PLAYER_W: 20,
  PLAYER_H: 30,
  MAX_HEARTS: 3,
  IFRAMES: 1.0,
  HURT_KNOCK_X: 300,
  HURT_KNOCK_Y: -350,
  LIGHT_R: 260,

  DEV: true,            // number keys 1-5 warp between chapters
};

// --- colour palette -----------------------------------------
// One place for the mood. Everything is cold blue except
// anything that belongs to fire.
const PAL = {
  ink:       '#04050b',
  deep:      '#0a0e1a',
  night:     '#121829',
  mist:      '#1b2338',
  fog:       '#232c45',

  stone:     '#3b4468',
  stoneLite: '#525d85',
  stoneEdge: '#7b88b3',
  moss:      '#2f4a45',
  mossLite:  '#3f6159',
  bone:      '#d9cbb2',

  ember:     '#ffb45e',
  emberHot:  '#fff0c8',
  flame:     '#ff8a3c',
  blood:     '#c9483f',

  water:     '#0b1f2b',
  waterLite: '#1b4a5c',

  gold:      '#ffd98a',
  pale:      '#cfd8ee',

  cloak:     '#8d3b34',
  cloakDark: '#5c2521',
  skin:      '#e8c9a8',
};

// --- tiny helpers -------------------------------------------
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function invLerp(a, b, v) { return (v - a) / (b - a); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(list) { return list[(Math.random() * list.length) | 0]; }

// move `v` towards `target` by at most `step`
function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  return Math.max(v - step, target);
}

function aabb(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// smooth 0..1 curve, used for fades and easing
function smooth(t) { return t * t * (3 - 2 * t); }

// deterministic pseudo random — same level always grows the
// same background hills
function seeded(seed) {
  let s = seed * 9301 + 49297;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
