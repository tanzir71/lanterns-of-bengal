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

## GitHub Pages (recommended)

This repo includes a GitHub Actions workflow that deploys the repository root to GitHub Pages.

### Deploy steps

1. Push this repo to GitHub (branch: `main`).
2. In GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Go to the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
5. Your site will appear at:
   - `https://<username>.github.io/<repo-name>/`

### Notes for project pages

- This site uses relative paths like `assets/...`, so it works correctly under `/<repo-name>/` on GitHub Pages.
- A `.nojekyll` file is included to ensure GitHub Pages serves files as-is.

## How to extend it (practical ideas)

- Add new scenes by extending the level data and draw/update routines in `game.js`.
- Replace sprites by swapping files in `assets/` (or via the in-browser editor’s asset tools).
- Split `game.js` into modules later (input, renderer, physics, audio, editor, persistence) once the prototype stabilizes.

