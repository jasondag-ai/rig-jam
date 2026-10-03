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
- Tire tracks: every level starts clean. The path a truck actually drives during a drag is written
  into the ground, live under the finger: `DragPath` (`src/ui/tracks.ts`) splits a drag into sweeps
  at each reversal (> `REVERSE` cells; snap-backs don't count), and every sweep wears the lane cells
  it covers at least halfway (w1..w4, `WEAR_CAP`). `src/ui/track-layer.ts` draws by moving line
  endpoints on every pointer move and animation frame (drag, snap, drive-out). Never use SVG clip
  paths for this: iOS Safari doesn't reliably repaint them mid-drag. Undo removes every mark and the
  wear from the last drag that moved a truck; drags that end where they started stay as decoration.
  Restart clears. Older drags fade (`FADE_STEP`) to `FADE_FLOOR`. Styles per ground ("Tire tracks").
- Wheel spray (`src/ui/spray.ts`): rear wheels flick particles opposite the direction of travel,
  scaled to speed (measured between actual movements). Mud: clumps plus splats that sit on the pad
  ~2 s; gravel: dust; snow: powder. Capped (`MAX_PARTICLES`, `MAX_PER_FRAME`); none with reduced motion.
- Tap targets: every button/link is at least 48px (44px absolute minimum) with
  `touch-action: manipulation`. Screen-changing controls (win-card buttons, "‹ Levels", gear, region
  tabs) use `onTap` (`src/ui/tap.ts`): act on pointerup under 10px movement, click as fallback, once
  per tap, and swallow only the browser's echo click (same spot, <450ms, no new touch) so it can't
  ghost-click the next screen. The win card must fit an iPhone with no scrolling (iOS can swallow the
  first tap after a scroll): "Play again" and "All levels" share a row; short screens (max-height
  700px) get a compact card. `npm run test:e2e` (Playwright, Chromium + WebKit, 375x667, 375x553,
  390x844, 390x664; needs a running dev server or `URL=…`) checks no-scroll, the button row, one-tap
  actions with no ghost click, and tap-target sizes. Not run in CI.
- Touch tests: `setPointerCapture` is wrapped in try/catch so synthetic/edge-case pointers can't
  kill a drag. Playwright iPhone emulation: Chromium with real touch events (CDP
  `Input.dispatchTouchEvent`); WebKit with touch-type PointerEvents (its build has no touch drag API).
- Ground textures: `public/sprites/ground/pad-<season>.webp` (summer gravel, spring mud, winter
  snow) and `grass-<season>.webp` (outside the fence), 512px seamless tiles made by `python3
  tools/ground-tiles.py` from `tools/ground-art/` (mud puddle highlights toned down so they never
  read as objects; spring grass is a stand-in shifted from summer until a real one is added). Writes
  `src/ui/ground-tiles.json`; each theme's `--pad`/`--ground` colors match the textures' tones.
  `applyTheme` loads both tiles and adds `.ground-tex` once they're in (until then, or if they
  fail, the flat colors and `pad-decor.ts` detail show). The pad tile is 3 cells square; drawn pad
  decor is hidden over it. Tire tracks have `.ground-tex` overrides tuned for the photos.
- Puddles are flat, low-contrast stains (no outline, rim, glint or shadow) centred on grid corners,
  never on a cell, and drawn under the `.pad-grid` cell lines. If they ever read as objects, remove them.
- `src/ui/scenery.ts` (border trees) and `src/ui/pad-decor.ts` (gravel/mud/snow detail) are seeded,
  cosmetic, and never affect play. `--fence` is the fence thickness in px; its color is `--fence-color`.

## Cover (title screen)
- `src/ui/cover.ts`: shown on every app open (never between levels). Hero image `public/cover.webp`
  (1080x1920, under 300 KB, preloaded in index.html) fills the screen (`object-fit: cover`);
  "RUSH HOUR RIGS" slams down into the sky with a bounce and a dust puff; 8s push-in; two clouds
  drift; TAP TO START pulses. One tap anywhere (`onTap`, no ghost click) opens the level list. If the
  image isn't loaded within 1s (`IMAGE_WAIT_MS`) the title shows over a sky gradient. Reduced motion:
  all still. Skipped for `?gag=` links and automated browsers (`navigator.webdriver`) unless
  `?cover=1`; `?cover=0` skips it. `npm run test:e2e:cover` tests it.

## Progression
- Levels open in order within a region (clear one to open the next). A region opens after clearing
  5 of the previous region's 10 (`REGION_UNLOCK` in `src/ui/unlocks.ts`). Cardium is always open;
  the Daily Pad is never locked. Locked items show a padlock and "Clear … to unlock"; tapping
  only shakes. A region earned for real shows a one-time "NEW LEASE OPEN" banner (`announced`).
- Settings → "Unlock everything (demo mode)": a flag in progress that opens everything without
  touching scores or streak. Off restores normal locks. Reset progress turns it off.

## Characters and gags (M4)
- `src/ui/gags.ts` (pure, tested): idle timing, Company Man line by tier, biffy spot, cord geometry.
  `src/ui/cast.ts`: SVG art. `src/ui/gag-layer.ts`: runs them on the board. Lines in `lines.ts`.
- Rules: gags never take touches (`pointer-events: none`) and stay outside the 6x6 grid or on truck
  roofs (block heater cords lie on the ground in the truck's own lane, under the trucks). Reduced
  motion: shown as still frames, no animation.
- Magpie: 10s with no touch or move: lands on a random truck's roof, leaves 2-3 small droppings
  (white blob, dark centre, drip; they ride on that truck until it exits), driver says
  "Seriously?", flies off. Once per level (a cancelled one may retry).
- Spotter: 20s idle: walks on below the fence carrying a pail, sits on it and dozes ("Zzz"). A
  touch while he's walking cancels him; a touch while he's asleep startles him: he falls off the
  pail and scrambles off. Once per idle stretch.
- Any touch cancels the magpie instantly and restarts the idle clock.
- Company Man on the win card: line by tier (par / +1..+3 / worse), 3 per tier, no repeats in a row.
- Biffy: just outside the fence directly behind one truck's tailgate, where that fence has no gate
  (`biffySpot`: bottom preferred, then top, then the sides, sized to fit the screen margin). When
  that truck reverses toward it (a move) or backs into the fence (a bump), the door bangs open and a
  worker hops out and shuffles off screen with tiny quick steps. Strict side profile, one connected
  body: shirt, a round bare cartoon cheek at the back (intended, no detail), coveralls bunched round
  his knees, a toilet paper streamer trailing from his hand. Puppet rig (`WORKER_RIG`). He doesn't go
  back in. Once per level.
- Block heater cords (Duvernay): each truck plugged into a post in the fence behind it; first move
  rips the cord out (whip + sparks); the post keeps a dangling plug. Restart re-plugs.
- Landowner (Montney): first time any lane wears to `WEAR_CAP`, he rides along below the board on
  his quad, shakes his fist, "Who's paying for these ruts?", rides off. Once per level.
- Character animation: GSAP on puppet rigs. `src/ui/rig.ts`: each part of a drawing is a group with
  `data-j` (joint name) and `data-p` (pivot); GSAP tweens plain numbers on the joints and the rig
  writes SVG transforms about each pivot every frame; `data-alt` groups swap (eyes open/shut/pop).
  Drawings in `src/ui/rigs.ts` (bear, rabbit, worker, moose). Use anticipation, squash and stretch,
  easing, overshoot, overlapping action and holds. Big scenes go on screen-level layers outside the
  board (`sceneLayer`: the board's drop-shadow filter would force a redraw every frame); no CSS
  filters on them (ground-shadow ellipses instead). Must hold 60fps (checked with 4x CPU throttle).
- Wildlife and traffic. Touches never cancel them; each waits while another gag is on stage (and the
  landowner or biffy wait for them; a sleeping spotter holds them up until he's woken). Reduced
  motion: skipped entirely.
- Rarity (`gags.ts`, tested): each level visit plays `WILD_SLOTS` (2) scenes drawn without repeats
  from the level's pool (`wildPool`: Cardium gopher, Duvernay moose, plus hot shot, geese, pumper
  anywhere). Unfound Wildlife Log entries weigh `UNFOUND_WEIGHT` (3x) found ones (`weightedPick`).
  The first comes after 15s idle or 10-30s in; the second 12-30s after that.
- The Bear is legendary: eligible only in Duvernay levels 8-10 (`bearEligible`), rolled once per
  level visit at `BEAR_CHANCE` (1 in 3; restarts don't re-roll); when he comes he takes the first
  slot. A bush stands in every eligible level whether he comes or not. Not in Montney any more.
- Demo mode (Settings → Unlock everything): `tickDemo` plays a gag about 5s in, then about every
  15s (`DEMO_FIRST_MS`, `DEMO_EVERY_MS`), unfound first (`demoNext`), from `demoPool` (magpie,
  spotter, biffy, Montney's landowner, the Bear in ANY level, plus the level's pool). The spotter
  wakes himself after a short doze. Demo sightings go to a separate demo log (see Wildlife Log).
  E2E tests therefore use `e2e/progress.mjs` (`UNLOCKED`: all levels cleared, demo off).
- The scenes:
  - Bear (`bear-scene.ts`): a bush stands at
    the bottom from level start (placed clear of the biffy). A background gag: 90% of the strip's
    height at his tallest (sitting, ear tips to paws), never over the board or the buttons (checked
    at 375px wide too). Beats (`data-beat`): walk (alternating
    legs) > squat > strain (quiver, eyes shut, sweat) > rabbit hops in > sniff > notice (eyes pop,
    slow head turn, hold) > windup > grab (jointed shoulder/elbow/wrist; rabbit squashed in his
    paw, held by the scruff) > wipe (up into a half-squat, rump pushed back, tail showing; the arm
    is redrawn over his thigh and stretched to his rump (`reachFor`); the rabbit is held flat under
    the tail and given two short strokes along the rump's curve (`rumpPoint`), ears flopping; rabbit
    deadpan, bear relieved) > setdown >
    freeze > shake (wet dog) > bolt (rabbit right with flat ears and speed lines, bear left after a
    satisfied hop). The hint line fades while he's on.
  - Moose (Duvernay, `moose-scene.ts`). A small, quick peekaboo behind the board: only
    his head and antlers pop up over the top fence (chin hidden behind it). Up > chew (blinks, chews
    once) > stare (short, + groan) > down, under 3 seconds (`PEEK`).
  - Hot shot (all regions). Pickup screams across the bottom in <1s in
    dust/mud/snow.
  - Gopher (Cardium, `visitor-scenes.ts`). A hole opens by
    the bottom fence (clear of the biffy); he peeks, looks around, pops up, whistles twice, drops back.
  - Canada geese and the pumper (any region):
    Canada geese (a V of 7 across the sky above the board, behind the HUD, a straggler flapping hard
    and honking to catch up) or the pumper (his pickup rolls up in the bottom strip, he checks a
    gauge, writes on his clipboard, drives off). Mirror figures via their inner svg (GSAP owns the
    element's transform and resets the CSS `scale` property).
- Preview/test hooks: `?gag=bear` (opens Duvernay 8), `?gag=moose`, `?gag=biffy`, `?gag=gopher`,
  `?gag=geese`, `?gag=pumper`, `?gag=hotshot` open a suitable level and play that
  scene at once, then again 1.5s after it ends (nothing else plays). `?idle=0.1` makes idle gags
  (and wildlife) come 10x sooner; `?wild=0` turns wildlife off. `npm run test:e2e:gags` tests them.

## Sound (M4)

- `src/audio`, Web Audio only, no audio files. `synth.ts` (tone/noise building blocks), `sfx.ts` (every
  effect as a recipe; diesel and quad are held sounds), `music.ts` (80s Synth, Chill Lo-fi
  as 16-step patterns + a lookahead Sequencer), `cues.ts` (pure timing rules: exit chain, win jingle),
  `settings.ts` (localStorage `rush-hour-rigs-audio`, separate so Reset progress keeps it), `engine.ts`.
- `engine.ts`: the AudioContext is made on the first tap (iOS rule); `navigator.audioSession.type =
  'ambient'` where supported so the iPhone silent switch mutes it. Music bus sits under effects.
  The UI only calls `sound.*` cues. `sound.quiet()` when leaving the game screen.
- Defaults: effects ON, music OFF, 80s Synth. Settings panel has both switches and the style picker.
- Test hook: `?audiolog` exposes `window.__rhrAudio` (its `log` lists cues as they fire).

## Wildlife Log
- `src/ui/wildlife-log.ts` (pure + storage, tested): 10 entries (Magpie, Sleeping Spotter, Biffy
  Surprise, Angry Landowner, Bear, Moose, Hot Shot, Gopher, Canada Geese, The Pumper) with captions
  and hints. An entry unlocks the
  first time its gag fully plays (`GagLayer.onSeen`; the spotter counts once he's asleep). Saved in
  `rush-hour-rigs:log`, so Reset progress clears it.
- New sighting: a toast at the very top (`toast.ts`, 2s, one at a time, never over the board):
  "New sighting! Bear (3/10)". The 10th adds a celebration toast and turns on camo pickups.
- Camo is earned (`camoEarned`) by finding all 10; a log saved before entries 8-10 existed (no `v`)
  that had all of the original 7 keeps its camo. Saved logs carry `v: 2`.
- Log page: binoculars button beside the gear on the level list. Found cards: art + caption;
  unfound: dark silhouette (CSS brightness(0)) + hint.
- Camo pickups: `.v-camo` blotches in the pickup SVG over the truck's own paint (color stays
  readable, badge on top), shown by `body.camo-pickups`. On once earned; switch in Settings
  (locked until then).
- The Bear's entry is `legendary`: gold frame and LEGENDARY tag on its card, found or not; hint
  "Only deep in the Duvernay."
- Demo log: with demo mode on, sightings are saved to `rush-hour-rigs:demo-log` instead, toasts say
  "Demo sighting!", and the log page shows the demo log (DEMO tag). It never counts toward the real
  log or camo. Demo off shows the real log again (the demo log is kept); Reset clears both.
- `?log=all` previews a full log and camo without changing the saved log.
  `npm run test:e2e:log` tests it all.

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
- TypeScript + Vite, DOM + CSS transforms, Pointer Events. No game engine, no frameworks. GSAP (free
  standard license) for character animation only.
- Portrait, one-thumb layout. Main controls live at the bottom of the screen.

## Structure
- `src/engine/` – pure rules. No DOM, no `window`, no `localStorage`. Every rule has a Vitest test
  next to it (`*.test.ts`).
- `src/ui/` – DOM rendering, drag input, screens, local progress.
- Truck sprites: `public/sprites/trucks/<kind>-<color>(@2x).webp`, made by `python3
  tools/truck-sprites.py` from the sources in `tools/truck-art/` (top-down, cab at the top, white).
  The script trims, turns each cab-right, tints ONLY the paint (cab; whole body on pickup and
  picker) by multiplying a light/neutral-pixel mask inside each kind's paint rows with the gate
  color, bakes the dark toy outline, and writes `src/ui/truck-sprites.json` (measured paint color;
  `sprites.test.ts` checks it matches its gate, colors stay apart, and each stands out from every
  season's pad). `sprites.ts` adds the `<img>` in the truck's `.art` (rotated like the SVG) and the
  SVG stays as the fallback until it loads (`.sprite-on`) or if it fails. Roof snow on sprites is a
  soft drift placed per kind (`--roof-at`, `--roof-len`). Soft `.ground-shadow` under every truck.
  Sprites preload per level and all in idle time. `npm run test:e2e:sprites`.
- Obstacle sprites: `public/sprites/obstacles/<kind>(@2x).webp` from `tools/obstacle-art/` (3/4
  high-angle on a concrete slab, intentionally unlike the top-down trucks), made by `python3
  tools/obstacle-sprites.py` (trim, outline, writes `src/ui/obstacle-sprites.json` aspect ratios).
  The slab stands on its cell (bottom edge on the cell's bottom); tank and wellhead stick up above
  it, except in the top row where they're shrunk to fit (`obstacleFit`) so nothing covers the fence
  or a gate. Obstacles stack by row (`z-index: 1 + row`; trucks 0, dragging 10). The part sticking
  up is a second clipped layer (`.ob-top`) that fades to 45% when a truck is in the cell above
  (`.under-truck`, set in `sync`). Same ground shadow as trucks. SVG fallback. The pumpjack stays
  still: the source art can't be cleanly split into beam and frame.
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
- `npm run test:e2e` – iPhone tap test (Playwright; start the dev server first)
- `npm run test:e2e:gags` – gags test (Playwright; start the dev server first)
- `npm run test:e2e:sprites` – truck sprites, fallback, drag frame rate (start the dev server first)
- `npm run test:e2e:cover` – cover screen (start the dev server first)
- `npm run test:e2e:log` – Wildlife Log, toasts, camo pickups (start the dev server first)
- `npm run test:e2e:audio` – sound cues, settings and music-style distinctness (start the dev server first)

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
