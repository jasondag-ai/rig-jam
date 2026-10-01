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
- Clear all trucks to win. Score = moves vs par (par = optimal move count from the solver).
- Rating is hard hats: at par = 3, up to par + 3 = 2, otherwise 1.
- Hints: first tap highlights the truck to move, second tap shows where it goes. 3 free hints;
  +1 the first time each level is cleared at par. One tap-pair costs one hint.

## Regions
- Cardium: 10 levels, trucks and gates only. Theme: summer.
- Montney: 10 levels, adds obstacles (pumpjacks, 400 bbl tanks, wellheads). Theme: spring mud.
- Winter theme is ready for region 3. Preview any theme with `?theme=winter` (or summer/spring).

## Look
- Bright, chunky toy style: dark outlines (`--outline`), light top edge, darker bottom lip, soft
  drop shadow. Fredoka (bundled via @fontsource) with outlined white text for titles and buttons.
- `src/ui/themes.ts` – each theme sets every variable in `THEME_VARS` (sky, ground, fence, pad,
  trees, truck grime/roof snow) plus a pad ground style. A region picks its theme in
  `src/levels/regions.ts`. Tests check every theme is complete and every gate color has at least
  1.8:1 contrast with every fence.
- `src/ui/scenery.ts` (border trees) and `src/ui/pad-decor.ts` (gravel/mud/snow detail) are seeded,
  cosmetic, and never affect play. `--fence` is the fence thickness in px; its color is `--fence-color`.

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
- `src/ui/lines.ts` – driver bump lines and the NEAR MISS stamp text. Owner edits these freely.
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
