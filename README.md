# Lanterns of Bengal

Carry a small light through a very old night.

Lanterns of Bengal is a single-page landing + playable canvas prototype inspired by rural Bangladesh nightlife: lanterns, ghost stories, boat rides, and ambient nature. It’s designer-led, intentionally simple, and built to be readable and remixable.

Vibe coded with ♥ by https://tanziro.com

## What’s in this repo

- `index.html` — the landing page + the game canvas + a lightweight in-browser editor UI
- `style.css` — page + UI styling (minimal, calm, indie)
- `game.js` — the game loop, rendering, input, audio, persistence, and editor logic
- `assets/` — sprites and audio used by the prototype

## Run locally

Any static server works.

```bash
python -m http.server 5173
```

Then open:

- http://localhost:5173/

Note: browsers may block autoplay audio until you interact with the page.

## How the code is structured (game.js)

This project is intentionally “one file you can read”. `game.js` contains the whole prototype: a canvas loop, input, a small set of entities, an audio layer, and an in-browser editor for rapid iteration.

### 1) Boot + loading

- `imagePaths` lists the reference sprite sheets.
- `start()` loads images, waits for fonts, initializes sprites and audio, then starts the main loop.

If you want to reskin the game, start by swapping `assets/*.png` and updating `imagePaths`.

### 2) The main loop (the heartbeat)

The runtime is classic `requestAnimationFrame`:

- `loop(now)` computes `dt`
- `update(dt, t)` advances gameplay state
- `updateAudioState()` reconciles what should be playing
- `draw(t)` renders the frame

This is the most important concept in the whole repo: the game is just an update step plus a draw step, repeated.

### 3) Game state + world model

The “world” is intentionally lightweight:

- Global constants define world dimensions and key planes (ground, water).
- Plain objects/arrays represent entities:
  - `player` (position, velocity, hp, state flags)
  - `boats` (position, steering, boarding rules)
  - `ghosts` + `ambientGhosts` (movement + spawn cadence)
  - `platforms`, `props`, `collectibles` (level-authored geometry and pickups)

### 4) Input

- `keys` is the held-key set.
- `pressed` is a “just pressed this frame” set used for actions like jump/attack.

This split is why movement feels stable: continuous movement reads from `keys`, while one-shot actions read from `pressed`.

### 5) Movement, collisions, and “feel”

The player controller is built from a few readable ingredients:

- horizontal acceleration + damping (`approach(...)`)
- gravity + jump impulses
- collision/landing checks for platforms
- special-case boating: you can board, steer, disembark, and jump off

To tune the feel:

- search for player speeds, gravity, and jump strength in `update(...)`
- search for boat steering in the `player.onBoat` branch
- search for ghost cadence under `GHOST_SPAWN`

### 6) Rendering (draw pipeline)

Rendering is layered on purpose:

1. `drawBackground(t)` (sky, mist, parallax shapes)
2. `drawWorld(t)` (ground, water, platforms, props)
3. entities: collectibles → ghosts → boats → player
4. HUD / overlays

Everything is drawn into a single `<canvas>` using 2D context calls and sprites cut from sprite sheets.

### 7) Audio

Audio is built to be tweakable in-prototype:

- sounds are declared in `soundDefinitions`
- audio waits for user interaction to unlock (browser policies)
- volumes/speeds can be adjusted and persisted
- one-shot effects are played via cloned audio nodes

If audio is “silent” on load, click or press a key once to unlock playback.

### 8) Levels + persistence (why it’s remixable)

This repo stores iteration data locally so you can prototype without a build step:

- Levels and editor state are saved in localStorage (search `LEVELS_KEY` / `STORAGE_KEY`).
- Custom sprites and replaced audio files are stored in IndexedDB (search `ASSET_DB_NAME` / `SOUND_DB_NAME`).
- Export/import lets you move level JSON between machines or versions.

### 9) The in-browser editor

The editor exists so you can “design while playing”:

- toggle via the Editor button
- adjust platforms/props, water bounds, and audio settings
- crop/replace sprites and create new asset variants

Treat it like a sketchbook: fast changes, quick saves, and iterative improvements.

## How to repurpose this prototype

- Build a new game on the same structure: keep the loop, replace the world rules.
- Turn `game.js` into modules later (input, simulation, renderer, audio, editor, persistence) once the design stabilizes.
- Add content first, architecture second: new levels/scenes will teach you what abstractions you actually need.

