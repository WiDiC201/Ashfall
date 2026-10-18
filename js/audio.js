// ============================================================
//  ASHFALL - audio.js
//  All sound is synthesised at runtime with the Web Audio API.
//  That means no .mp3 files to hunt down: every noise in this
//  game is made of maths.
// ============================================================
'use strict';

const Audio = (() => {
let ctx = null;
let master = null;
let muted = false;

let musicTimer = null;
let drone = [];
let playing = -1;

// ----------------------------------------------------------
//  setup
// ----------------------------------------------------------
function init() {
if (ctx) {
if (ctx.state === 'suspended') ctx.resume();
return ctx;
}
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return null;
ctx = new AC();
master = ctx.createGain();
master.gain.value = 0.85;
master.connect(ctx.destination);
return ctx;
}

// A single shaped note.
// freq -> to : pitch slide, dur : seconds, gain : volume
function tone(o) {
if (!ctx || muted) return;
const t = ctx.currentTime + (o.delay || 0);
const osc = ctx.createOscillator();
osc.type = o.type || 'sine';
osc.frequency.setValueAtTime(o.freq, t);
if (o.to) {
osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
}

const g = ctx.createGain();
const peak = o.gain === undefined ? 0.18 : o.gain;
const atk = o.attack === undefined ? 0.008 : o.attack;
g.gain.setValueAtTime(0.0001, t);
g.gain.exponentialRampToValueAtTime(peak, t + atk);
g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

let node = osc;
if (o.filter) {
const f = ctx.createBiquadFilter();
f.type = 'lowpass';
f.frequency.setValueAtTime(o.filter, t);
if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, t + o.dur);
osc.connect(f);
node = f;
}
node.connect(g);
g.connect(master);
osc.start(t);
osc.stop(t + o.dur + 0.03);
}

// Filtered white noise - used for impacts and dashes.
function noise(o) {
if (!ctx || muted) return;
const t = ctx.currentTime + (o.delay || 0);
const dur = o.dur || 0.12;
const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
const buf = ctx.createBuffer(1, len, ctx.sampleRate);
const data = buf.getChannelData(0);
for (let i = 0; i < len; i++) {
// fade the noise out so it does not click
const k = 1 - i / len;
data[i] = (Math.random() * 2 - 1) * k * k;
}
const src = ctx.createBufferSource();
src.buffer = buf;

const bp = ctx.createBiquadFilter();
bp.type = o.type || 'bandpass';
bp.frequency.setValueAtTime(o.freq || 900, t);
if (o.to) bp.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + dur);
bp.Q.value = o.q || 1.2;

const g = ctx.createGain();
g.gain.setValueAtTime(o.gain === undefined ? 0.25 : o.gain, t);
g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

src.connect(bp); bp.connect(g); g.connect(master);
src.start(t);
}

// ----------------------------------------------------------
//  sound effects
// ----------------------------------------------------------
const SFX = {
jump() {
tone({ freq: 300, to: 540, dur: 0.13, type: 'sine', gain: 0.10 });
noise({ freq: 1400, to: 400, dur: 0.07, gain: 0.05 });
},
double() {
tone({ freq: 460, to: 780, dur: 0.16, type: 'triangle', gain: 0.10 });
tone({ freq: 690, to: 1050, dur: 0.16, type: 'sine', gain: 0.05, delay: 0.03 });
},
land() {
noise({ freq: 420, to: 120, dur: 0.11, gain: 0.16 });
tone({ freq: 130, to: 70, dur: 0.10, type: 'sine', gain: 0.10 });
},
wall() {
tone({ freq: 380, to: 620, dur: 0.14, type: 'square', gain: 0.05, filter: 1800 });
noise({ freq: 900, to: 300, dur: 0.09, gain: 0.06 });
},
dash() {
noise({ freq: 1800, to: 260, dur: 0.22, gain: 0.18, q: 0.8 });
tone({ freq: 700, to: 200, dur: 0.20, type: 'sawtooth', gain: 0.04, filter: 1200 });
},
ember() {
tone({ freq: 880, dur: 0.09, type: 'triangle', gain: 0.10 });
tone({ freq: 1320, dur: 0.14, type: 'sine', gain: 0.07, delay: 0.05 });
tone({ freq: 1760, dur: 0.20, type: 'sine', gain: 0.04, delay: 0.09 });
},
hurt() {
tone({ freq: 240, to: 70, dur: 0.30, type: 'sawtooth', gain: 0.13, filter: 900 });
noise({ freq: 600, to: 90, dur: 0.20, gain: 0.16 });
},
stomp() {
tone({ freq: 190, to: 60, dur: 0.16, type: 'square', gain: 0.11, filter: 700 });
noise({ freq: 700, to: 140, dur: 0.13, gain: 0.14 });
},
checkpoint() {
[523, 659, 784].forEach((f, i) => {
tone({ freq: f, dur: 0.55, type: 'sine', gain: 0.07, delay: i * 0.10, attack: 0.02 });
});
},
brazier() {
[261, 392, 523, 659].forEach((f, i) => {
tone({ freq: f, dur: 1.6, type: 'triangle', gain: 0.06, delay: i * 0.08, attack: 0.05 });
});
noise({ freq: 800, to: 120, dur: 1.1, gain: 0.10, type: 'lowpass' });
},
die() {
tone({ freq: 380, to: 90, dur: 0.7, type: 'triangle', gain: 0.11 });
tone({ freq: 190, to: 45, dur: 0.9, type: 'sine', gain: 0.09 });
},
ui() {
tone({ freq: 620, dur: 0.06, type: 'sine', gain: 0.07 });
},
tablet() {
tone({ freq: 330, dur: 0.5, type: 'sine', gain: 0.05, attack: 0.06 });
tone({ freq: 495, dur: 0.7, type: 'sine', gain: 0.03, attack: 0.10 });
},
unlock() {
[392, 523, 659, 784, 1046].forEach((f, i) => {
tone({ freq: f, dur: 0.8, type: 'triangle', gain: 0.06, delay: i * 0.07 });
});
},
crumble() {
noise({ freq: 500, to: 90, dur: 0.40, gain: 0.13, q: 0.6 });
},
};

function sfx(name) {
if (!ctx || muted) return;
const fn = SFX[name];
if (fn) fn();
}

// ----------------------------------------------------------
//  music - a slow, drifting pentatonic pad
// ----------------------------------------------------------
const MINOR_PENTA = [0, 3, 5, 7, 10];

// pattern of scale degrees; -1 is a rest
const PATTERN = [0, 4, 2, -1, 3, 1, 4, -1, 2, 0, -1, 3, 1, 4, 0, -1];

function noteHz(root, degree, octave) {
const semis = MINOR_PENTA[((degree % 5) + 5) % 5] + 12 * (octave || 0);
return root * Math.pow(2, semis / 12);
}

function stopMusic() {
if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
drone.forEach((d) => {
try { d.g.gain.cancelScheduledValues(ctx.currentTime); d.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); } catch (e) {}
try { d.osc.stop(ctx.currentTime + 2); } catch (e) {}
});
drone = [];
playing = -1;
}

// chapter 0..4 - each one a little lower and stranger
function music(chapter) {
if (!ctx || muted) return;
if (playing === chapter) return;
stopMusic();
playing = chapter;

const roots = [220, 196, 174.6, 164.8, 146.8];
const tempos = [46, 50, 54, 58, 40];
const root = roots[chapter % roots.length];
const bpm = tempos[chapter % tempos.length];
const step = 60 / bpm / 2;   // eighth notes

// low drone, two detuned voices
[1, 1.005].forEach((det, i) => {
const osc = ctx.createOscillator();
osc.type = 'sawtooth';
osc.frequency.value = root / 2 * det;
const f = ctx.createBiquadFilter();
f.type = 'lowpass';
f.frequency.value = 260;
const g = ctx.createGain();
g.gain.value = 0.0001;
g.gain.setTargetAtTime(0.020, ctx.currentTime, 2.0);
osc.connect(f); f.connect(g); g.connect(master);
osc.start();
drone.push({ osc, g });
});

let i = 0;
musicTimer = setInterval(() => {
if (!ctx || muted) return;
const deg = PATTERN[i % PATTERN.length];
i++;
if (deg < 0) return;

const hz = noteHz(root, deg, 0);
tone({
freq: hz, dur: 1.9, type: 'triangle', gain: 0.028,
attack: 0.35, filter: 1400,
});
if (i % 4 === 1) {
tone({
freq: noteHz(root, deg, 1), dur: 1.4, type: 'sine',
gain: 0.014, attack: 0.25,
});
}
if (i % 8 === 0) {
tone({ freq: root / 2, dur: 3.2, type: 'sine', gain: 0.030, attack: 0.5 });
}
}, step * 1000);
}

function toggleMute() {
muted = !muted;
if (master) master.gain.value = muted ? 0 : 0.85;
return muted;
}

function isMuted() { return muted; }

return { init, sfx, music, stopMusic, toggleMute, isMuted };
})();
