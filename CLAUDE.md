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
- Clear all trucks to win. Score = moves vs par (par = optimal move count from the solver).

## Stack
- TypeScript + Vite, DOM + CSS transforms, Pointer Events. No game engine, no frameworks.
- Portrait, one-thumb layout. Main controls live at the bottom of the screen.

## Structure
- `src/engine/` – pure rules. No DOM, no `window`, no `localStorage`. Every rule has a Vitest test
  next to it (`*.test.ts`).
- `src/ui/` – DOM rendering, drag input, screens, local progress.
- `src/levels/levels.json` – level data (format below).
- `public/` – static files copied as-is.
- `scripts/check-levels.ts` – prints each level's optimal solution (run `npm run check-levels`).

## Level JSON format
```json
{
  "id": "01", "name": "First Load", "par": 2,
  "trucks": [{ "id": "A", "color": "red", "row": 2, "col": 0, "length": 2, "orient": "h" }],
  "gates":  [{ "color": "red", "side": "right", "index": 2 }]
}
```
- `row`/`col` are 0-5 and mark the truck's top-left cell. `orient` is `h` or `v`.
- Gate `index` is the row for `left`/`right` gates and the column for `top`/`bottom` gates.
- Colors: red, blue, yellow, green, orange, purple.
- `parseLevel` rejects: overlaps, out of bounds, duplicate ids, a truck with zero or two aligned
  gates of its color, and a truck already touching its gate.
- A test asserts every shipped level is solvable and its `par` equals the solver's optimum.

## Conventions
- Imports use explicit `.ts` extensions (lets Node run `scripts/*.ts` directly).
- Engine functions are pure: they return new state and never mutate inputs.
- Keep commits small; run `npm test` and `npm run build` before committing.
- Deploy: push to `main` → GitHub Action tests, builds and publishes to GitHub Pages.

## Commands
- `npm run dev -- --host` – dev server reachable from a phone on the same Wi-Fi
- `npm test` – unit tests
- `npm run build` – type-check + production build into `dist/`

## Out of scope (M1)
Level generator, sound, daily puzzle, skins.
