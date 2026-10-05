# Rush Hour Rigs

STANDING RULE, BEFORE EVERY JOB: read `GAME_BIBLE.md` and `ART_BIBLE.md` from
`~/Desktop/RHR Art Inbox/` (those are the latest versions). If either differs from the copy in the
repo root, copy it over the repo copy and commit that change before starting the job.

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
  `kind` (pumpjack, tank, wellhead, flare; missing = pumpjack). The generator deals out the first
  three (`LEVEL_OBSTACLE_KINDS`); some tanks are then shown as flare stacks. The engine and solver never read it.
- Convoys (Duvernay): a convoy is the two trucks of one color, numbered 1 and 2, each with its own
  gate of that color. Every gate of that color only accepts the lowest number still on the pad; for
  the other truck it's a wall. A truck parked against its gate while it was closed drives out with
  one more cell once it opens. (Partners can't share one physical gate: the truck in front would
  always leave first, so the order would never matter.) Convoy gates show the number they're
  waiting for; convoy trucks carry a small number tag on the cab. Generator rule: the convoy order must raise
  par (`convoyRaisesPar`). Out-of-order bumps use only the `convoy` line pool; truck 1 speaks.
- Clear all trucks to win. Score = moves vs par (par = optimal move count from the solver).
- Rating is hard hats: at par = 3, up to par + 3 = 2, otherwise 1.
- Hints: first tap marks the truck to move (`.hinted`: a bright rim in its own colour hugging the
  sprite, a small lift with a stronger ground shadow, a slow pulse); second tap shows where it goes
  (`.ghost`: the truck's own sprite at 35% with a dashed keyline in its colour, slow pulse; for a
  move out through the gate, an OUT badge on that gate instead). Reduced motion: static, no pulse.
  `npm run test:e2e:hints` checks gates and hints and saves screenshots. 3 free hints;
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
- GAGS: the old gag layer is OFF (`src/ui/flags.ts`: `GAGS_ON = false`: no biffy, landowner,
  wildlife, traffic, cords or reactions; `GameView.gags` is null; `?gags=1` turns it on for one page
  load, for the old gag and log e2e suites). Gags come back ONE AT A TIME as code puppets
  (GAME_BIBLE 9b; `claude/GAG_STYLE_GUIDE.md` is the rulebook), each behind its own flag and each an
  EASTER EGG set off by what the player does: `MAGPIE_ON`, `WORKER_ON`, `MOOSE_ON` (`?magpie=0`,
  `?worker=0`, `?moose=0` turn one off for a page load).
- TRIGGER SETTINGS: every gag's trigger lives in ONE file, `src/ui/gag-triggers.ts` (`GAG_TRIGGERS`),
  for Jay to tune after playing. Placeholders now: magpie 10 s idle; worker 20 s idle; moose = 2
  bumps up into the top berm (Duvernay); Near Miss = two exits within 3.5 s (Cardium); landowner =
  the same truck driven back and forth 4 times (`BackAndForth`: 4 direction changes in a row, any
  other truck resets it); Biffy A = one bump down into the bottom berm; Biffy B = a second one
  within 1.4 s (so A waits that long before it plays; once one of the two has played in a level, any
  bottom bump brings the other). `bermBump` says which berm a bump hit.
- EGG SCHEDULING (`GameView.tickEggs`): ONE gag at a time, none while a truck is moving or once
  the level is won. A gag the player set off waits in `eggQueue` and plays as soon as the stage is
  free. The magpie comes after his idle time with no moves and the worker after his, each
  counted from the last move or the last gag leaving (the worker waits until the magpie has been),
  each once per level; one that was scared off or cancelled may try again.
  `?gag=magpie|worker|moose|nearmiss|landowner|biffya|biffyb|marshmallow|geese|bear` plays one at once, again and again;
  `?idle=0.1` makes the idle times 10x shorter.
- STRIP GAGS (gags 4 to 7; `src/ui/strip-gags.ts` runner `TimelineGag`, placement `stripGeom`;
  puppets and timelines ported as written from `near_miss_landowner_reference.html` and
  `biffy_reference.html` into `near-miss.ts`, `landowner.ts`, `biffy.ts`, helpers `puppet-stage.ts`).
  Each is a `TimelineDef`: full-screen layers that take no touches, `apply(t)` per frame, `data-beat`
  on the last layer, its line said through `host.say`. Reduced motion: a still fades in and out.
  - NEAR MISS (Cardium): the gopher comes up out of the scenery's mound (`[data-anchor="mound"]`),
    his layer cut off at the hole line; double take, ducks; the hotshot crosses the bottom strip
    right to left, off screen to off screen, in dust; the gopher comes back dusty, "Near miss!",
    coughs, sinks.
  - LANDOWNER (any region): rides in on the quad from off screen, skids, shakes his head, fist with
    "Who's paying for these ruts?", wheelie, hat blows off and is caught, out the far side.
  - THE BIFFY is permanent scenery (`BiffyProp`, `.biffy-layer`, under the board): bottom strip of
    every level at `BIFFY_X`, about 80 px tall at 390 (smaller on a short strip), in its own
    clearing (scenery `clearings`), clear of the board, tip line and buttons. No biffy appears and
    disappears any more (the old one lives only in `?gags=1`).
  - BIFFY A "Occupied": door bangs open, the occupant looks back wide-eyed, nods, reaches, pulls it
    shut; the indicator ends red. BIFFY B "The Runaway Roll": the roll rolls out and away, the arm
    gropes, he shuffles after it off screen with paper on his boot, the door creaks shut; green.
  - MARSHMALLOW (gag 8, levels with a flare stack; `marshmallow.ts`, ported from
    `marshmallow_geese_reference.html`): the sleepy worker's drawing walks in from off the left,
    telescopes a stick in three clicks from his glove to the nearest REAL flare's pilot flame
    (`marshmallowDef` reads `.obstacle.flare .fl-flame`; he stands left of it), FWOOMP (the real
    flame flares up too), yanks it back, blows it out, sniffs, shrugs, "Mmm. Crispy.", ear smoke,
    strolls off the right. The stick is an SVG overlay (`.pup-overlay`) over the lease that takes
    no touches. Trigger: 3 taps on a flare stack (`flareTaps`; a tap = a touch that lifts where it
    landed, on a flare's picture).
  - GEESE (gag 9, any region; `geese.ts`): a V of 7 crosses left to right behind the HUD and the
    lease (`.geese-layer`, z 0), hung just under the HUD's row (`host.sky()`); the lost goose flaps
    the wrong way, passes them, stalls, double take, "Honk?!", snaps around (never thinner than
    0.8), chases and leaves last; a feather drifts down. The reference stops the V at 9.0 with the
    straggler on the edge, so the game flies on to `G_END` 9.7 at the same speed. Trigger: Undo 3
    times in a row (`undosInARow`; a move starts the count again). On short screens there is little
    sky and they fly over the treetops, smaller.
  - THE BEAR AND THE SNOWSHOE HARE (gag 10, LEGENDARY; `bear.ts`, ported from
    `bear_rabbit_reference.html`). Duvernay 8 to 10 have his snowy bush as permanent scenery
    (`BushProp`, `.bush-layer`, at `BUSH_X`, right of the biffy; the scenery's own willow anchor is
    left out there and `bearBox` keeps trees off). Trigger (`GAG_TRIGGERS.bear`, `bearComesNow`): a
    perfect solve (at par) on one of those levels, 1 time in 3 (every time in demo mode or with
    `?bear=1`). The win is saved at once (`recordWinOnce`) and the win card waits until he has
    gone. One layer holds hare (z 2 behind the bush, z 5 in his paw or on the snow), bush (3), bear
    (4) and the overlay (sweat, speed lines, the hare's storm cloud). The hare goes behind the bush
    only when its leading foot reaches the bush's edge, sinks, and is hidden only once covered.
    Log card: legendary gold frame.
  - `npm run test:e2e:eggs2` checks gags 8 and up the same way and saves their clips.
  - `npm run test:e2e:strip` checks all of it in WebKit (beats, real triggers, off-screen entry and
    exit, hole clip, biffy placement, reduced motion, log), 60 fps at 4x throttle in Chromium, and
    saves `gag47_*.webm` clips.
- THE SLEEPY WORKER (gag 2; `src/ui/worker.ts` pure and tested, runner `WorkerGag` in
  `src/ui/egg-gags.ts`; spec: `~/Desktop/RHR Art Inbox/worker_moose_puppet_reference.html`, ported as
  written). He has a clearing in the bottom strip by the screen's LEFT edge (`workerSpot`; scenery
  keeps trees out of it; a little smaller on a short strip, and he does not come if there is no
  room). Beats (`W_BEATS`, `data-beat`): walks in from off screen with his pail > flips it over >
  sits > yawn > dozes (Zs) > nod > jolt, hard hat pops > guilty glances > springs up, hop-turns and
  bolts off the edge, forgetting the pail > the pail alone > he peeks back in, red-faced, his arm
  grabs it > yank, both gone. `workerFrame(pose, edge)` measures the peek, arm and yank from the
  screen's edge. ANY move (a truck picked up) cancels him (`cancelPose`): a jolt, then he runs off
  the edge WITH the pail. The sighting counts once he has nodded off. About 62 px tall.
- THE MOOSE (gag 3; `src/ui/moose.ts` pure and tested, runner `MooseGag`): Duvernay only, on the
  second bump of a truck up into the top berm in one level (`isTopBermBump`, `MOOSE_BUMPS`). His
  layer sits UNDER the board and is cut off at the board's top line, so he rises from BEHIND the top
  berm (nothing else ever clips a gag). Beats (`M_BEATS`): antler tips > head rises > slow blink >
  chews > deadpan stare, an ear flick > "Mmrrph" > a tiny lift, ducks; snow drops off an antler
  behind the berm. He picks a top column with no gate (`mooseColumn`). About 45 px of antler span;
  a little smaller where there is little room under the HUD.
- Reduced motion, all three: a simple fade in of a still, then out. None of their layers takes a
  touch. `npm run test:e2e:eggs` checks the worker and the moose in WebKit and saves clips.
- THE MAGPIE (gag 1; `src/ui/magpie.ts` pure and tested, `src/ui/magpie-gag.ts` runner; spec: the
  approved reference `~/Desktop/RHR Art Inbox/magpie_puppet_reference.html`, ported as written: same
  parts, colours, outline, expressions, beats and timing). A code puppet, no sprites. After 10 s
  with no moves (`MAGPIE_IDLE_MS`; a drag or a move restarts the clock), once per level:
  fly in facing travel > wobble landing > hop-turn (never paper-thin) > sly look and blink > glance
  left and right > crouch, tail up > strain while the drop slowly swells > relief > peek down > smug
  puff and two chuckles > crouch > launch forward and up, a feather drifts down (`BEATS`; the
  layer's `data-beat` names the current one). `pose(t, travel)` gives every part's place;
  `travelFor` stretches the reference's flight so he starts and ends with his whole box past the
  screen's edge (`offScreen`, `data-off`). He is drawn on `.magpie-layer`, over the WHOLE game screen
  (never clipped by the board, berm or any container), which takes no touches. About 40 px of bird
  (`BIRD_FRAC`). He picks a parked truck whose cab roof is a full cell in from the board's edge
  (`pickTruck`). The splat and drip become part of that truck (`.magpie-splat`, `.magpie-drip` in
  its `.body`), so they ride with it; the drip runs toward the truck's front (`dripTurn`); restart or
  a new level clears them. "Seriously?" is said beside him, on the side with more room. Grab his
  truck mid-gag and he startles (`startlePose`: feathers up, a hop, off forward, fully off screen)
  and leaves no mark; he may try again after another idle stretch. Reduced motion: the bird fades in
  smug, the splat appears, the bird fades out. Wildlife Log card: the smug pose (`magpieStill`).
  `?gag=magpie` plays him at once on Cardium 6, again and again. `npm run test:e2e:magpie` checks all
  of it in WebKit (frame rate in Chromium under 4x throttle) and saves clips. With `?gags=1` the gag
  layer's pacing decides when he plays (`GagHost.playMagpie`).
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
  by `tools/fence-sprites.py`): each sits in its gap in the berm: hinge post, leaf, latch post. The
  COLOUR reads first: the leaf's pipe rails are painted the gate colour with a panel of the same
  colour behind them; the posts are one darker neutral steel; every piece has the dark toy outline.
  Each gate's posts stand inside its own cell and the berm's gap stops `GAP_INSET` short of the
  cell's ends, so two neighbouring gates keep a nub of berm between them and never join into one
  run. The symbol badge (0.96 x band) rides on the leaf, secondary. Drawn lying along the top side
  and turned per side (`--turn`); the badge counter-rotates to stay upright. Gates live on the board
  (not the clipping yard) so the leaf can swing past it. On exit (`.open`) the leaf swings 90
  degrees (260ms ease-out): outward on top/bottom, inward on the sides; none with reduced motion.
  Wrong-color gates simply stay shut. Convoy gates shift the badge toward the hinge and put the
  waiting-number chip (gate color, white numeral) on the latch post. Fallback: the colored tabs.
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
- Region look on the level list: each region's list wears its season, the same place as its
  levels. Cardium: dry summer (bright grass, summer trees, warm blue sky). Montney: spring breakup
  (the spring theme's cooler grey sky and dull wet grass, spring aspens, plus soft patches of the
  pad's mud and a few low-contrast puddles in the grass: `.screen.levels[data-theme='spring']`).
  Duvernay: snow. `node e2e/region-shots.mjs` checks and saves all three side by side.
- Main page (the level list screen): everything stays inside the screen width with 16px side
  margins at 375 to 430px (`.daily-block` is one `minmax(0, 1fr)` column; the sign is `width: 100%`,
  never sized from its height). The intro paragraph shows only until the first level is cleared.
  `.levels` scrolls up and down only (`overflow-x: hidden`; `.scenery` clips its trees).
- Level list: compact rows 54px tall (`.level-btn`, the whole row is the button): number chip,
  name, three small hard hats (empty until earned), or for a locked level a padlock and "Clear level
  N to unlock". All 10 need about 200px of scroll at 390x844 (under 220). The big level-card art is not used.
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
- "Pad cleared!" is SVG text on a shallow arc (`BANNER_TEXT`), so its baseline sits on the arc in
  every browser whatever the font's line box. Its visible letters (cap top to baseline) are centred
  on the ribbon's visible blue (80 art px down the frame): `setBannerCap` measures the capitals'
  height from the font at run time (`--cap`); `--t` scales the lettering on short screens.
- The frame is symmetrical: `tools/win-frame.py` rebuilds its bottom from the side walls' own
  cross-section (same blue wall, gold trim and fillet as the sides; bottom slice 112). The banner
  lettering is centred as the block the eye sees (outline and lower lip included).
- VISUAL CHECKS ARE JUDGED IN WEBKIT (Safari's engine), by the pixels of a screenshot, not by
  element boxes: `tools/card-check.py` (called from `e2e/card.e2e.mjs`) measures the blue showing
  above and below the banner's letters and the frame's thickness at the sides and bottom. A fix
  that only measures right in Chromium does not count.
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
- Magpie: see THE MAGPIE above (the code puppet replaced the old drawing and sprite sheets).
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
- LIVE NOW: the log's button is back on the level list and the page lists only the gags that are in
  the game (`EGGS`: magpie, sleepy worker, moose, Near Miss, Angry Landowner, Occupied, The Runaway Roll, Marshmallow, Lost Goose, Bear (legendary);
  the old ten with `?gags=1`), with card art from their puppets (`magpieStill`, `workerStill`,
  `mooseStill`, `nearMissStill`, `landownerStill`, `biffyAStill`, `biffyBStill`), the count and toasts out of that number.
  An unfound card shows the gag's hint in DEMO mode only (`cardHint`); the game says "Not seen yet."
  Camo still needs all ten, so it cannot be earned yet.
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
- Equipment (`src/ui/obstacles.ts`, tested; styles under "Equipment" in style.css): the 1-cell
  obstacles are drawn in CODE in the board's toy look: 3/4 view, flat shading, one light from the
  top left, the trucks' dark outline, no photo materials, no sprites. No slab: each stands on a patch
  of worked ground in the pad's colours (`.eq-patch`) with a soft contact shadow. Kinds: 400 bbl tank
  (cone roof, hatch, vent, ladder and landing, load line valve), pumpjack, wellhead (a production
  tree: two master valves with handwheels, flow cross, wing valve and flowline, gauge, guard posts;
  never a hydrant), flare stack (ladder, guy wires, knockout drum, pilot flame). Each stands on its
  cell; tall ones stick up above it by `OVER`; `equipFit` shrinks them in the top row so nothing
  covers the berm or a gate. Obstacles stack by row (`z-index: 1 + row`; trucks 0, dragging 10); the
  part sticking up is masked to 40% when a truck is in the cell above (`.under-truck`).
- AMBIENT MOTION (always on, not a gag): pumpjacks pump by real linkage math (GAME_BIBLE 7).
  `pumpjackPose(phase)`: the crank turns at a constant `STROKES_PER_MIN` (7); the pitman (fixed
  length) links the crank pin to the equalizer at the beam's tail; the beam rocks on the saddle;
  the bridle leaves the horsehead's arc straight down, so the carrier bar and polished rod move
  straight up and down only. Layers: `.pj-crank`, `.pj-pitman`, `.pj-beam`, `.pj-bridle`,
  `.pj-carrier`, `.pj-polished`; `runPumpjacks` drives every pumpjack on the board from one
  animation frame loop, each starting at its own phase (`phaseFor`, from its cell). Flare flames
  flicker in CSS (`flare-flicker`, staggered by `--eq-delay`). Reduced motion: both hold still.
  The frame-rate e2e check (4x CPU throttle) runs on a level with a pumpjack and a flare.
- Flare stacks in levels: an alternate look for some tanks. `tools/gen-levels.ts` `withFlares` turns
  the first tank of every second Montney and Duvernay level into `kind: 'flare'` at write time.
  Cosmetic only: layouts, par and the solver are untouched. `node e2e/equip-shots.mjs` saves
  screenshots, close-ups and a clip.
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
- `npm run test:e2e:magpie` – the magpie gag: beats, off-screen entry and exit, splat, startle, reduced motion, frame rate, clips (start the dev server first)
- `npm run test:e2e:eggs` – the sleepy worker and the moose: beats, entry and exit, cancel, triggers, reduced motion, log, frame rate, clips (start the dev server first)
- `npm run test:e2e:strip` – Near Miss, landowner, Biffy A and B and the permanent biffy (start the dev server first)
- `npm run test:e2e:eggs2` – gags 8 and up: marshmallow, geese, bear (`ONLY=geese` runs one; start the dev server first)
- `npm run test:e2e:sprites` – truck sprites, lease ground, berm, gates, fallback, drag frame rate (start the dev server first)
- `npm run test:e2e:cover` – cover screen (start the dev server first)
- `npm run test:e2e:log` – Wildlife Log, toasts, camo pickups (start the dev server first)
- `npm run test:e2e:audio` – sound cues, settings and music-style distinctness (start the dev server first)

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
