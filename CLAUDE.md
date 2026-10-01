# Rush Hour Rigs

Mobile-first web puzzle game (hackathon, due Nov 1). Owner is a beginner: when they need to do
something, give exact clicks and one command at a time.

## Game rules (source of truth)
- 6x6 top-down oilfield lease pad, surrounded by a fence.
- Trucks are 2 or 3 cells long and slide only along their length (horizontal or vertical).
- One drag = one move. A drag slides a truck any distance until it is blocked.
- Colored gates sit in the fence. A truck exits when it slides into a gate of its own color.
  Wrong-color gates act as walls, same as the fence.
- Each truck has exactly one gate of its color in line with it. The cab faces that gate.
- Trucks have a cosmetic `kind` that must suit their length: 2-cell `pickup`/`picker`, 3-cell
  `vac`/`frac`/`water` (missing = pickup or vac). The engine and solver never read it.
- Obstacles are fixed 1-cell lease equipment. Nothing moves through them. Each has a cosmetic
  `kind` (pumpjack, tank, wellhead; missing = pumpjack). The engine and solver never read it.
- Convoys (Duvernay): a convoy is the two trucks of one color, numbered 1 and 2, each with its own
  gate of that color. Every gate of that color only accepts the lowest number still on the pad; for
  the other truck it's a wall. A truck parked against its gate while it was closed drives out with
  one more cell once it opens. (Partners can't share one physical gate: the truck in front would
  always leave first, so the order would never matter.) Convoy gates show the number they're
  waiting for; convoy trucks carry a big number plate. Generator rule: the convoy order must raise
  par (`convoyRaisesPar`). Out-of-order bumps use only the `convoy` line pool; truck 1 speaks.
- Clear all trucks to win. Score = moves vs par (par = optimal move count from the solver).
- Rating is hard hats: at par = 3, up to par + 3 = 2, otherwise 1.
- Hints: first tap highlights the truck to move, second tap shows where it goes. 3 free hints;
  +1 the first time each level is cleared at par. One tap-pair costs one hint.

## Regions
- Cardium: 10 levels, trucks and gates only. Theme: summer.
- Montney: 10 levels, adds obstacles (pumpjacks, 400 bbl tanks, wellheads). Theme: spring mud.
- Duvernay: 10 levels, adds convoys. Theme: winter. Preview any theme with `?theme=winter` etc.

## Look
- Bright, chunky toy style: dark outlines (`--outline`), light top edge, darker bottom lip, soft
  drop shadow. Fredoka (bundled via @fontsource) with outlined white text for titles and buttons.
- `src/ui/themes.ts` – each theme sets every variable in `THEME_VARS` (sky, ground, fence, pad,
  trees, truck grime/roof snow) plus a pad ground style. A region picks its theme in
  `src/levels/regions.ts`. Tests check every theme is complete and every gate color has at least
  1.8:1 contrast with every fence.
- Tire tracks: every level starts clean; each move lays a pair of wheel marks along the path
  travelled (to the fence on an exit), under obstacles and trucks. `src/ui/tracks.ts` is the pure
  geometry and wear; `src/ui/track-layer.ts` draws it. Marks are revealed behind the wheels by a clip
  that follows the truck element's real position each frame (drag, snap, drive-out); only the track
  being laid updates, finished ones are static. Wear: each lane cell counts passes; repeated passes
  draw wider/darker (w1..w4, `WEAR_CAP`). Older moves fade (`FADE_STEP`) to `FADE_FLOOR`. Undo
  removes that move's marks and wear; Restart clears. Styles per ground in style.css ("Tire tracks").
- Puddles are flat, low-contrast stains (no outline, rim, glint or shadow) centred on grid corners,
  never on a cell, and drawn under the `.pad-grid` cell lines. If they ever read as objects, remove them.
- `src/ui/scenery.ts` (border trees) and `src/ui/pad-decor.ts` (gravel/mud/snow detail) are seeded,
  cosmetic, and never affect play. `--fence` is the fence thickness in px; its color is `--fence-color`.

## Progression
- Levels open in order within a region (clear one to open the next). A region opens after clearing
  5 of the previous region's 10 (`REGION_UNLOCK` in `src/ui/unlocks.ts`). Cardium is always open;
  the Daily Pad is never locked. Locked items show a padlock and "Clear … to unlock"; tapping
  only shakes. A region earned for real shows a one-time "NEW LEASE OPEN" banner (`announced`).
- Settings → "Unlock everything (demo mode)": a flag in progress that opens everything without
  touching scores or streak. Off restores normal locks. Reset progress turns it off.

## Daily Pad (M3)
- 60 pre-generated medium pads in `src/levels/daily.json` (generated like the regions; par 6-8, 5-6
  trucks, 1-2 obstacles). Pad #1 is 2026-09-30 (`DAILY_EPOCH` in `src/ui/daily.ts`); the pad is
  picked by the phone's local date and wraps after 60. Odd pads use summer, even pads spring mud.
- Streak "DAYS WITHOUT INCIDENT" = Daily Pads cleared in an unbroken run. Today doesn't break it
  until the day is over. One Safety Stand-Down per Monday-Sunday week covers a missed day
  automatically (only if there's an earlier cleared day to bridge to). Logic in `streak()`.
- Near misses = bumps this attempt (reset on Restart, not on Undo). ZERO INCIDENT = at par, no bumps.
- Share (Daily win screen) copies spoiler-free text: pad, hats, moves vs par, badge, streak, link.
- All progress is in localStorage (`rush-hour-rigs:v2`); no accounts.
- PWA: `public/manifest.webmanifest`, icons in `public/icons/` (rendered from `icon.svg`), and a
  service worker generated at build time by the plugin in `vite.config.ts`
  (`tools/service-worker.ts`). It precaches every built file; pages load network-first. Not
  registered in dev.

## Stack
- TypeScript + Vite, DOM + CSS transforms, Pointer Events. No game engine, no frameworks.
- Portrait, one-thumb layout. Main controls live at the bottom of the screen.

## Structure
- `src/engine/` – pure rules. No DOM, no `window`, no `localStorage`. Every rule has a Vitest test
  next to it (`*.test.ts`).
- `src/ui/` – DOM rendering, drag input, screens, local progress.
- `src/ui/obstacles.ts` – SVG art for each obstacle kind (colors and nod/crank motion in style.css).
- `src/ui/vehicles.ts` – top-down SVG art per truck kind, drawn cab-right and rotated by CSS to face
  the gate. Body panels use the truck color; the gate symbol sits on an upright color badge.
- `src/ui/lines.ts` – driver bump lines. Owner edits these freely. A bump shows only the speech
  bubble plus a tick (with a shake) on the hazard near-miss counter next to the move counter.
  Pools by trigger: `any` (every bump; tanks and wellheads use only this), `truck`, `wall` (fence or
  wrong-color gate), `pumpjack`. A bump draws from its pool plus `any`, never repeating the last line.
  Who speaks (`src/ui/bump.ts`): the truck that got hit; for a fence, wrong gate or obstacle, a random
  other truck still on the pad; the dragged truck only when it is the last one. Bubbles stay on screen.
- `src/levels/cardium.json`, `montney.json` – GENERATED. Never hand-edit; `src/levels/regions.ts`
  loads them.
- `tools/generator.ts` – generator core (random layouts hill-climbed toward a target par, proven by
  the solver). `tools/gen-levels.ts` – slot targets per region (trucks, pumpjacks, par window,
  forced extra moves, decoy gates, seed), names and hints. To change levels, tune the slots and run
  `npm run gen-levels`. Finished slots are cached in `tools/.gen-cache/` (gitignored). Obstacle
  kinds and truck kinds are assigned at write time from each region's fixed `kindSeed` and
  `truckKindSeed`, so they never touch layouts.
- `tools/check-levels.ts` – prints every level with its optimal solution.
- `public/` – static files copied as-is.

## Level JSON format
```json
{
  "id": "01", "name": "First Load", "par": 2, "hint": "optional one-line tip",
  "trucks": [{ "id": "A", "color": "red", "row": 2, "col": 0, "length": 2, "orient": "h", "kind": "pickup" }],
  "gates":  [{ "color": "red", "side": "right", "index": 2 }],
  "obstacles": [{ "row": 4, "col": 4, "kind": "tank" }]
}
```
- `row`/`col` are 0-5 and mark the truck's top-left cell. `orient` is `h` or `v`.
- Gate `index` is the row for `left`/`right` gates and the column for `top`/`bottom` gates.
- Colors: red, blue, yellow, green, orange, purple.
- `parseLevel` rejects: overlaps, out of bounds, duplicate ids, a truck with zero or two aligned
  gates of its color, and a truck already touching its gate.
- Tests assert every shipped level is solvable, `par` equals the solver's optimum, par and truck
  count never drop within a region, every Montney obstacle gets in the way of the best solution, and
  obstacle kind and truck kind never change solver results.

## Conventions
- Imports use explicit `.ts` extensions (lets Node run `tools/*.ts` directly).
- Every animation must be disabled under `prefers-reduced-motion` (see the end of `style.css`).
- Engine functions are pure: they return new state and never mutate inputs.
- Keep commits small; run `npm test` and `npm run build` before committing.
- Deploy: push to `main` → GitHub Action tests, builds and publishes to GitHub Pages.

## Commands
- `npm run dev -- --host` – dev server reachable from a phone on the same Wi-Fi
- `npm test` – unit tests
- `npm run build` – type-check + production build into `dist/`
- `npm run gen-levels [-- c05 m08]` – regenerate levels (named slots are forced to rerun)
- `npm run check-levels` – print levels and solutions

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
