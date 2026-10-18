# ASHFALL

*a lantern in the hollow*

A hand-drawn-feeling 2D platformer that runs in a browser. Five chapters, a
small story, no images and no audio files — every sound is synthesised live
and every shape is drawn with canvas code.

The sun closed four hundred years ago. You are the last Lamplighter, carrying
a stolen spark up through the Hollow to the place where the sun used to be.

---

## Running it

No build step, no npm, no server required.

1. Open the folder in VS Code (`File → Open Folder`).
2. Double-click `index.html`, or right-click it → *Reveal in File Explorer* → double-click.

That's it. If you would rather use a local server (optional, and closer to how
real sites are tested):

OR you can visit the github pages URL.

```
cd ashfall
python -m http.server 8000
```

then visit `http://localhost:8000`.

**Press ENTER on the title screen.** Browsers only allow sound after a key
press, which is why the game waits for one.

---

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or arrows | walk |
| `SPACE` | jump — hold longer to jump higher |
| `SHIFT` | dash (unlocked in chapter II) |
| `R` | restart the current chapter |
| `ESC` | pause |
| `M` | mute |
| `ENTER` | confirm / advance text |

Wall jumping (chapter III) is automatic once you unlock it: slide down a wall,
then press jump to kick away from it.

---

## What is in the box

```
ashfall/
├── index.html            the page: one canvas and nine script tags
├── style.css             page frame, letterboxing, vignette
├── README.md             this file
├── js/
│   ├── config.js         every number that affects how the game feels
│   ├── audio.js          Web Audio synth — all sfx and music
│   ├── input.js          keyboard state (held vs pressed)
│   ├── story.js          all of the writing
│   ├── levels.js         five ASCII maps
│   ├── entities.js       World, enemies, pickups, crumbling floors
│   ├── player.js         movement, jumping, wall jumps, dashing
│   ├── render.js         camera, particles, lighting, drawing, HUD
│   └── game.js           state machine, loop, chapter flow
└── tools/
    └── check_levels.js   dev helper: validates the maps
```

Roughly **2,900 lines** of typed-out code. Load order matters: `index.html`
loads them in dependency order, because these are plain scripts, not modules.

---

## How it fits together

**The loop.** `game.js` runs `requestAnimationFrame`. Each frame it calls
`tick()` (logic) and `draw()` (pixels). Physics steps at a fixed 1/120th of a
second, so a slow frame can never make you fall through the floor.

**The player.** `player.js` is a small state machine with a few tricks that
make platformers feel good:

- *coyote time* — you can still jump for 0.1s after walking off a ledge
- *jump buffering* — pressing jump just before landing still works
- *variable jump* — releasing early cuts the jump short
- *wall slide* — falling against a wall is slowed
- *dash with i-frames* — the dash window is briefly invulnerable

**The world.** `levels.js` holds ASCII maps. `entities.js` reads them once at
load: `#` becomes stone, `o` becomes an ember, `e` becomes a crawler, and so
on. Collision is plain AABB against the tile grid, resolved one axis at a time.

**The light.** The game looks lit because the renderer draws the world, then
lays a near-black sheet over it, then *punches soft holes* in that sheet with
`globalCompositeOperation = 'destination-out'`. Your lantern is one hole. Lit
lanterns and braziers are others. No shaders, no lighting engine.

---

## Editing the maps

Open `js/levels.js`. Each chapter is a list of strings. One character = one
32×32 tile.

```
.  air            #  stone          =  one-way platform
-  crumbling      ^  spikes         ~  deep water
o  ember          L  lantern        B  brazier (ends the chapter)
T  tablet         @  start          e  crawler (stompable)
w  drifter        h  moving platform (horizontal)
v  moving platform (vertical)
```

Rows do not need to be the same length — short rows are padded with air.

After editing, run the checker to catch floating pickups or a missing brazier:

```
node tools/check_levels.js          # summary
node tools/check_levels.js --print  # full map with a column ruler
```

---

## Making it feel different

Almost everything worth tuning is in `config.js`:

| Setting | What it changes |
| --- | --- |
| `GRAVITY`, `JUMP_VEL` | how floaty the jump is (height ≈ `JUMP_VEL² / (2·GRAVITY)`) |
| `RUN_MAX`, `GROUND_ACCEL` | top speed and how quickly you get there |
| `COYOTE`, `BUFFER` | how forgiving jumps feel |
| `DASH_SPEED`, `DASH_CD` | dash distance and cooldown |
| `LIGHT_R` | radius of the lantern |

In `levels.js`, each chapter also has a `darkness` value from 0 to 1. Lower it
if a chapter feels too black to read.

---

## Notes

- Everything is procedural: change a colour in `PAL` and the whole mood moves.
- `CONFIG.DEV` enables keys `1`–`5` on the title screen to jump straight to a
  chapter. Set it to `false` before showing the game to anyone.
- Ember counts are per chapter. Nothing is saved between sessions — no
  `localStorage`, no accounts, no network calls at all.
