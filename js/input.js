// ============================================================
//  ASHFALL - input.js
//  Keyboard state. Tracks both "is it held" and "was it
//  pressed this frame", because a platformer needs both.
// ============================================================
'use strict';

const Input = (() => {
const down = new Set();      // keys currently held
const hit = new Set();       // keys pressed since last frame

// action -> list of keyboard codes
const BINDS = {
left:    ['ArrowLeft', 'KeyA'],
right:   ['ArrowRight', 'KeyD'],
up:      ['ArrowUp', 'KeyW'],
down:    ['ArrowDown', 'KeyS'],
jump:    ['Space', 'KeyZ', 'KeyW', 'ArrowUp'],
dash:    ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'],
pause:   ['Escape', 'KeyP'],
restart: ['KeyR'],
confirm: ['Enter', 'NumpadEnter', 'Space'],
mute:    ['KeyM'],
};

const BLOCK = new Set([
'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
]);

function held(action) {
const list = BINDS[action];
if (!list) return false;
for (const k of list) if (down.has(k)) return true;
return false;
}

function pressed(action) {
const list = BINDS[action];
if (!list) return false;
for (const k of list) if (hit.has(k)) return true;
return false;
}

function pressedCode() {
// used for the 1-5 dev warps
for (const k of hit) {
if (k.startsWith('Digit')) return parseInt(k.slice(5), 10);
}
return 0;
}

function anyPressed() { return hit.size > 0; }

function endFrame() { hit.clear(); }

function clear() { down.clear(); hit.clear(); }

function onKeyDown(e) {
if (BLOCK.has(e.code)) e.preventDefault();
if (e.repeat) return;
down.add(e.code);
hit.add(e.code);
// first keystroke is what unlocks the browser's audio engine
Audio.init();
}

function onKeyUp(e) {
if (BLOCK.has(e.code)) e.preventDefault();
down.delete(e.code);
}

function attach() {
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', clear);
}

return { held, pressed, pressedCode, anyPressed, endFrame, clear, attach };
})();   
