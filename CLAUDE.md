# Rush Hour Rigs

Mobile-first web puzzle game (hackathon, due Nov 1). Owner is a beginner: when they need to do
something, give exact clicks and one command at a time.

## Art inbox (ART_BIBLE.md is the authority for all art)
- `ART_BIBLE.md` (project root) sets the style, camera, accuracy spec, never-draw list and batch
  list for every image. New art arrives in `art-inbox/`.
- When the owner says "process art inbox": FIRST copy every file from `~/Desktop/RHR Art Inbox/`
  (top level only, not `done/`) into `art-inbox/` and unzip any zips there. If the folder is
  missing or empty, say so. Then check EVERY image in
  `art-inbox/` against ART_BIBLE.md
  before using any of it: style (Pixar-like 3D matching the cover), technical rules (transparent PNG
  except tiles, no shadow/glow/halo, no text or logos, exact file name, size), camera (top-down vs
  3/4 for that item), the accuracy spec for that item, and the never-draw list. Look at each image;
  don't trust file names.
- Accepted images go through the matching `tools/*.py` pipeline into `public/sprites/`. Batches
  A to C: `python3 tools/inbox-sprites.py art-inbox` (world/ui statics at 1x and 2x, animation sheets
  as 256px-frame WebPs + `src/ui/anim-sprites.json`; add rejected items to its `REJECTED` set). Big
  originals stay out of git (`art-inbox/` is gitignored except REJECTS.md); small single sources
  go in `tools/<kind>-art/`. Rejected ones are not used: write `art-inbox/REJECTS.md` with one
  ready-to-paste Manus re-prompt per rejected item that names the exact file, the exact problem
  seen, and the ART_BIBLE.md section/spec it broke, and restates the correct spec and file name.
- After processing, move the files that were USED from that Desktop folder into its `done/`
  subfolder (create it if needed). Rejected files stay where they are so they're easy to find.
- Tell the owner what was accepted, what was rejected, and that REJECTS.md is ready to paste.

## Game rules (source of truth)
- 6x6 top-down oilfield lease pad, surrounded by a dirt berm (the wall; it blocks trucks).
- Trucks are 2 or 3 cells long and slide only along their length (horizontal or vertical).
- One drag = one move. A drag slides a truck any distance until it is blocked.
- Colored gates sit in gaps in the berm. A truck exits when it slides into a gate of its own color.
  Wrong-color gates act as walls, same as the berm.
- Each truck has exactly one gate of its color in line with it. The cab faces that gate.
- Trucks have a cosmetic `kind` that must suit their length: 2-cell `pickup`/`picker`, 3-cell
  `vac`/`frac`/`water` (missing = pickup or vac). The engine and solver never read it.
- Obstacles are fixed 1-cell lease equipment. Nothing moves through them. Each has a cosmetic
  `kind` (pumpjack, tank, wellhead, flare; missing = pumpjack). `flare` is drawn and blocks like
  the rest but isn't placed in levels yet (`LEVEL_OBSTACLE_KINDS` is what the generator uses). The engine and solver never read it.
- Convoys (Duvernay): a convoy is the two trucks of one color, numbered 1 and 2, each with its own
  gate of that color. Every gate of that color only accepts the lowest number still on the pad; for
  the other truck it's a wall. A truck parked against its gate while it was closed drives out with
  one more cell once it opens. (Partners can't share one physical gate: the truck in front would
  always leave first, so the order would never matter.) Convoy gates show the number they're
  waiting for; convoy trucks carry a small number tag on the cab. Generator rule: the convoy order must raise
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
  trees) plus a pad ground style. A region picks its theme in
  `src/levels/regions.ts`. Tests check every theme is complete and every gate color has at least
  1.8:1 contrast with the dark ring round its badge (what sets it apart on any ground, snow included).
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
- GAGS ARE OFF (`src/ui/flags.ts`, `GAGS_ON = false`, the one switch): no magpie, spotter, biffy,
  landowner, wildlife, traffic, cords or reactions, no Wildlife Log button or toasts (the saved log
  is untouched). `GameView.gags` is null. `?gags=1` turns them on for one page load (the gag and log
  e2e suites use it). Build order is GAME_BIBLE 9b: fundamentals first, then gags one at a time.
- Fit: `#app` is `100dvh`; `--safe-top/-bottom/-left/-right` (style.css `:root`) carry the safe-area
  insets and every screen pads with them. The game screen is HUD, stage (flex), note, controls; the
  lease is the largest square that fits the stage, so the sky band and bottom strip give way first.
  `GameView` refits on window resize and whenever the stage changes size (ResizeObserver).
  `npm run test:e2e:fit` checks 375x667, 390x844, 393x852 and 430x932, each with Safari's toolbars
  (100px less) and as a home-screen app (insets faked through the variables), and saves screenshots.
- Lease ground (board toy look, ART_BIBLE 1): the pad has NO image and NO gradient. `.lease-ground`
  (pad and berm band alike, so it also shows through each gate's gap) is the theme's flat `--pad`
  colour; everything else is drawn in code on `canvas.lease-detail` by `src/ui/lease-detail.ts`
  (tested). NO GRID: there are no cell lines; trucks still snap to cells. `planDetail(level, ground,
  seed)` is pure and seeded by level id, so every level differs and a level always looks the same:
  9-12 large soft colour fields; one or two worn lanes running straight in from a gate; a stain
  beside each piece of equipment (two at most); then pebbles (gravel), 2-4 shallow puddles (mud:
  flat, low contrast, never touching a gate's cell or an obstacle, `keepDry`) or wind drifts lying
  one way (snow). Gravel and mud also get fine texture drawn at device resolution at paint time
  (`paintGrain`, seeded by `Detail.seed`): hundreds of small specks per cell in several tones
  (`GRAIN`), plus small stones or clods with a highlight and shadow (`LUMPS`), and on mud a few faint
  wet streaks. Low contrast, so trucks and tracks stand out. Snow has none (approved as is). It is
  painted once per level and size, never per frame. No stretched image, no hard value step. If
  puddles ever read as objects, tone them down.
- Outside ground: `public/sprites/ground/grass-<season>.webp` from `python3 tools/ground-tiles.py`:
  a 768px field that wraps, drawn at 384px, built by `field()` (shifted copies of the seamless source
  blended through soft random masks; spring grass is a stand-in tinted from summer). Winter's is a
  SNOW field (`snow_field` + `drifts`, from the snow source with its ruts smoothed away): cool and a
  step darker than the pad. Writes `src/ui/ground-tiles.json`; each theme's `--ground` matches it.
  `applyTheme` adds `.ground-tex` once the image is in (flat colour until then).
- Dirt berm (`src/ui/berm.ts`, tested): no fence. `bermHeight` is a rounded mound across the band
  (crest toward the pad, outer slope running `BERM_OVER` past the board) that slopes to nothing at
  each gate's gap; `paintBerm` shades it on a canvas (`canvas.berm`, under the yard) from a height
  map with seeded lumps, lit from the top left, soft shadow down-right onto the pad, grass creeping
  up the outer slope and tufts. Looks per ground (`BERM_LOOKS`): brown dirt (gravel), wet dark mud
  with shine (mud), snow (its shaded side and its shadow on the pad are a soft blue-grey, never
  charcoal: `ambient`/`sun`). The outer foot is ragged (slow noise along the berm), not a smooth
  tube; the crest takes a bright highlight; two soft shadows sit under it (a wide faint one all
  round that bleeds onto the pad, and the cast one down-right). Tufts are never stamped at even steps: loose
  clumps with gaps, three shapes (fan, stalks with seed heads, rosette), varied size and lean; dry
  tan stalks in winter. Repainted only when size, level or season changes.
  Picture only: the engine's walls block trucks. `--fence` is still the band's thickness in px.
- Pipe swing gates (`.gate-art`, set by `gateArt` once the pieces from `gate_open_v2.png` load, cut
  by `tools/fence-sprites.py`): each sits in its gap in the berm: hinge post, leaf (white frame
  tinted per gate color + a translucent color panel) carrying the symbol badge, latch post. Drawn
  lying along the top side and turned per side (`--turn`); the badge counter-rotates to stay upright.
  Gates live on the board (not the clipping yard) so the leaf can swing past it. On exit (`.open`)
  the leaf swings 90 degrees (260ms ease-out): outward on top/bottom, inward on the sides; none with
  reduced motion. Wrong-color gates simply stay shut. Convoy gates keep the badge centred and put the
  waiting-number chip (gate color, white numeral) on the latch post, clear of it. Fallback: the colored tabs (`.sym` + `.boom`).
- Winter: the pad (`--pad` #edf2fa) is the brightest surface on screen (tested). `scenery.ts`
  scatters a few dry tan grass stalks in the snow (`winterStalks`, seeded per level).
- Light: ONE soft neutral vignette at the outer screen edges (`.vignette`, z 0: over the scenery,
  under the board, HUD and buttons) and nothing else: no hotspot or diagonal shade on the pad (it
  reads as a stain), no warm wash outside. Soft down-right drop shadows on gates, trees and HUD.
  Nothing that changes color may sit on a truck or gate (tested in sprites e2e).
- Illustrated UI (`src/ui/ui-art.ts`, Batch B art in `public/sprites/ui/`): `uiImg()` for icons
  (gear, binoculars, back arrow, padlock, full/empty hard hats, speaker on/off on the Sound effects
  switch); `applyUiArt()` sets `--ui-*` CSS variables for art used as backgrounds: Undo/Hint/Restart,
  the win card's Play again and the Daily Pad button (border-image, stretched through the middle so
  the round ends keep their shape), the win panel (border-image frame, title on its banner, medal
  pinned to the corner), the days-without-incident sign (label and count live in its white field),
  and the Zero Incident medal (words live on its ribbon). All text and numbers stay live.
- Main page (the level list screen): everything stays inside the screen width with 16px side
  margins at 375 to 430px (`.daily-block` is one `minmax(0, 1fr)` column; the sign is `width: 100%`,
  never sized from its height). The intro paragraph shows only until the first level is cleared.
  `.levels` scrolls up and down only (`overflow-x: hidden`; `.scenery` clips its trees).
- Level list: compact rows 54px tall (`.level-btn`, the whole row is the button): number chip,
  name, three small hard hats (empty until earned), or for a locked level a padlock and "Clear level
  N to unlock". All 10 need under 200px of scroll at 390x844. The big level-card art is not used.
- Win card (level and Daily Pad; `npm run test:e2e:card`): one centered panel. The frame is a
  9-slice border image, `frame_win(@2x).webp`, made by `python3 tools/win-frame.py` from the panel
  art with its two drawn button slots cut out, so it grows with its content and the gold trim shows
  all the way round; the cream is the frame's own (`fill`), never a box drawn over it. Every frame
  size hangs off `--f` (CSS px per @2x art px: 0.3, 0.26 on short screens); corner slices (200) are
  wider than the walls (118) so the banner's laurels never stretch. Content is ONE column: score row
  (the roughneck and the three hard hats centered as one group, his boots on the hats' bottom
  line), moves line, Company Man line, then for the Daily Pad the compact streak sign and Share,
  then Next level, then Play again and All levels: all the same width, same centre, inside the
  cream with even margins. The Zero Incident medal overlaps the top-right shoulder on purpose,
  drawn on top, never clipped. Fits 375x553 with no scroll.
- Confetti (`GameView.confetti`): on a perfect solve, 40 small hard hats and orange/yellow scraps
  fall for about 1.5 s in a layer UNDER the card (never over its buttons), then the layer is
  removed. Not made under reduced motion.
- Win card characters: ONE still image each (`animStill`), never sprite-frame cycles (the
  frames don't line up and jitter), moved only by GSAP about a fixed origin: the roughneck (wrench-up
  still on a perfect solve, else standing) does one squash-and-stretch bounce on a perfect solve and
  then breathes; the Company Man (scowl still when well over, else his usual look) gives one slow
  small nod, then holds still. Reduced motion: no movement. `npm run test:e2e:menus` checks this.
- The Daily Pad button turns green once today's pad is cleared (a hue shift of the orange art); it
  must have no background fill of its own (a fill shows as a colored box round the button).
- Scenery (`src/ui/scenery.ts`, tested; Batch A art in `public/sprites/world/`): spruce, aspen and
  willow in natural scattered groves (`groveRow`: loose clusters of mostly one species, random
  spacing, clearings, slight overlaps, varied sizes). Above the lease: three staggered rows in
  depth, small on the horizon to large at the berm, standing on a strip of ground (`depth`;
  `--horizon` sits that far above the board). Below: one to three rows down the bottom strip, sized
  to it. NONE beside the board: any tree that would come within `BERM_CLEAR` (10px) of the berm's
  sides or bottom is left out, so the berm always has clear grass round it. Seeded per level
  (`seed`), season-matched (`seasonArt`), with cattails and the blank lease sign as accents. The
  whole layer is under the board, gates and buttons.
- Gag anchors (permanent, gags on or off; `anchors` option, `data-anchor`): a willow bush on the
  grass just below the berm toward the left, where the bear will stop (every region), and in
  Cardium the gopher's dirt mound toward the right (an SVG drawn to sit with the illustrated trees:
  shaded from the top left, soil clumps, a hole with depth, grass tufts, soft contact shadow). Sized to the bottom strip, clear of
  the board, gates and buttons; trees give them room. (The side margins are only 16px, so "beside
  the berm" is below it.) When the bear and gopher come back, play them at these anchors.

## Cover (title screen)
- `src/ui/cover.ts`: shown on every app open (never between levels). Hero image `public/cover.webp`
  (1080x1920, under 300 KB, preloaded in index.html) fills the screen (`object-fit: cover`);
  "RUSH HOUR RIGS" slams down into the sky with a bounce and a dust puff; 8s push-in; two soft
  clouds drift (blurred white puffs with a pale blue underside at about half opacity, matched to the
  image's own clouds; on wide screens they sit up in the thin strip of sky); TAP TO START pulses. One tap anywhere (`onTap`, no ghost click) opens the level list. If the
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
- Block heater cords (Duvernay): each truck plugged into a post on the berm's inner slope behind
  it; the cord is a cable (thick dark jacket, lighter line along it, orange plug at the truck) with
  a coil of slack on the ground, all inside the pad and berm. First move rips it out (whip +
  sparks); the post keeps a dangling plug. Restart re-plugs.
- Landowner (Montney): first time any lane wears to `WEAR_CAP`, he rides along below the board on
  his quad, shakes his fist, "Who's paying for these ruts?", rides off. Once per level.
- Character animation: GSAP on puppet rigs. `src/ui/rig.ts`: each part of a drawing is a group with
  `data-j` (joint name) and `data-p` (pivot); GSAP tweens plain numbers on the joints and the rig
  writes SVG transforms about each pivot every frame; `data-alt` groups swap (eyes open/shut/pop).
  Drawings in `src/ui/rigs.ts` (bear, rabbit, worker, moose). Use anticipation, squash and stretch,
  easing, overshoot, overlapping action and holds. Big scenes go on screen-level layers outside the
  board (`sceneLayer`: the board's drop-shadow filter would force a redraw every frame); no CSS
  filters on them (ground-shadow ellipses instead). Must hold 60fps (checked with 4x CPU throttle).
- Batch C character animation (`src/ui/anim.ts`): `Sprite` plays sprite-sheet actions from
  `public/sprites/anim/` (`anim-sprites.json`: frames, frame size, character box), origin at the
  feet, GSAP-driven (abortable with the scene). Gags keep their timing, triggers and sizes; each
  wraps its figure with `withSprite` and the old drawing stays inside for beats whose new art was
  rejected (`.drawn` shows it): bear wipe/rabbit beats (rig), magpie hop/poop, moose chew, spotter
  sleep/wake, pumper truck/get-in/out/write, hot shot (old). New art: gopher (all), moose rise/
  stare/duck, magpie fly/land/take-off, spotter jog/sit, biffy door, landowner (now on foot: walk,
  finger wag, head shake), bear walk/sit/walk-off, geese, pumper walk/check-gauge, gauge post.
  Win card and log cards use stills (`animStill`); see "Win card" under Look.
  When redone art arrives, add it to `inbox-sprites.py` (drop it from REJECTED) and swap the beat.
- Wildlife and traffic. Touches never cancel them; each waits while another gag is on stage (and the
  landowner or biffy wait for them; a sleeping spotter holds them up until he's woken). Reduced
  motion: skipped entirely.
- GAG PACING RULES (enforced in `GagLayer.tick`, pure logic in `gags.ts`, tested):
  1. Only one gag plays at a time, anywhere on screen (`busy()` covers every gag and reaction).
     Gags the player sets off (biffy, landowner) and reactions queue in `pending` and start when the
     stage is free.
  2. No gag starts while a truck is being dragged or moving (`host.moving()`: drag, snap, drive-out).
  3. Perimeter gags (the scheduled scenes outside the fence: gopher, moose, bear, hot shot, geese,
     pumper): at most one every 30 to 45 seconds (`PERIMETER_GAP_MS`, counted from the last one
     ending; the first 30-45s into the level), random order, no repeats until every enabled one has
     played (`perimeterBag`; unfound Wildlife Log entries are `UNFOUND_WEIGHT` 3x as likely to be
     drawn earlier; a refill never starts with the one that just played). The biffy and landowner
     also push the next one back 30-45s. The spotter (20s idle) and magpie (10s idle) are idle gags:
     they obey rules 1 and 2, and the spotter doesn't return until a perimeter gag has played since.
  4. In-lease reaction slots, reserved for upcoming art and EMPTY for now (`GagLayer.reactions`):
     `great-move` (two trucks exit within `GREAT_MOVE_MS` 3.5s) and `stuck` (no move for `STUCK_MS`
     20s). When due they only set `data-reaction` on the board. Register a player to fill one.
  Demo mode and `?gag=` links keep their own faster schedules but obey rules 1 and 2.
- The Bear is legendary: eligible only in Duvernay levels 8-10 (`bearEligible`), rolled once per
  level visit at `BEAR_CHANCE` (1 in 3; restarts don't re-roll); when he comes he joins that
  visit's perimeter bag. A bush stands in every eligible level whether he comes or not. Not in Montney any more.
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
  The script cleans the silhouette (steepened alpha: no soft shadow, no fringe), trims, turns each cab-right, and repaints the
  gate color through per-kind regions (`PAINT`): the cab on every truck, the whole body on pickup
  and picker, the tank shell on vac and water (plus water's rear fenders), and the engine housing
  and deck on the frac unit (it has no tank). Chrome, tires, walkways, hatches, hose reels and the
  pump's fluid end stay neutral. It bakes ONE crisp dark toy outline (drawn 4x oversize and scaled down, so the
  edge is clean and anti-aliased) and writes
  `src/ui/truck-sprites.json` (measured paint color and painted share; `sprites.test.ts` checks the
  color matches its gate, colors stay apart, each stands out from every season's pad, and the
  share is at least 0.40 for every kind). `sprites.ts` adds the `<img>` in the truck's `.art`
  (rotated like the SVG) and the SVG stays as the fallback until it loads (`.sprite-on`) or fails.
  Sprites preload per level and all in idle time. `npm run test:e2e:sprites`.
- Season coats: the same script bakes `snow-<kind>(@2x).webp` (winter: a crisp flat snow cap on the
  cab roof and the tank's crest, `SNOW` boxes per kind, blue-grey at its rim) and `mud-<kind>(@2x).webp` (spring: spatter along the sides and back), one layer per
  kind for every color, clipped inside the truck's own shape with soft edges. The truck's `.coat`
  element (in `.art`, so it turns with the sprite) shows one by theme. No CSS-drawn snow or grime.
- ONE shadow per truck: the soft `.ground-shadow` (it spreads while dragging). No filter shadows on
  trucks and none in the sprites.
- Truck markings: the symbol badge (`.sym`) is a small disc (0.37 cell) in the truck's color with a
  thin white keyline inside a hairline dark edge, centred on the body clear of the cab. A convoy
  truck's number is a small tag on the cab roof (`.convoy-no`, in `.cab`): the truck's color a shade
  deeper, white numeral, fine dark keyline. `node e2e/board-shots.mjs` saves judging screenshots.
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
- `npm run test:e2e:fit` – every iPhone size, Safari and home-screen app, with screenshots (start the dev server first)
- `npm run test:e2e:menus` – main page, level rows, win card fit and character motion, with screenshots (start the dev server first)
- `npm run test:e2e:card` – win card frame, column, medal, confetti, with screenshots (start the dev server first)
- `npm run test:e2e:sprites` – truck sprites, lease ground, berm, gates, fallback, drag frame rate (start the dev server first)
- `npm run test:e2e:cover` – cover screen (start the dev server first)
- `npm run test:e2e:log` – Wildlife Log, toasts, camo pickups (start the dev server first)
- `npm run test:e2e:audio` – sound cues, settings and music-style distinctness (start the dev server first)

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
