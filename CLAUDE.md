# Rig Jam

Renamed from Rush Hour Rigs on Oct 9, 2026 (trademark).

DEV LANE (October upgrade, job U1; Oct 9): UPGRADE WORK GOES TO BRANCH `next`; `main` GETS BUG FIXES
ONLY UNTIL THE MERGE. `next` is worked in its own folder, `~/Rig-Jam-next` (a git worktree with its own
`npm ci`: never link `node_modules`), and is published as the DEV COPY at
https://jasondag-ai.github.io/rig-jam-next/ by `sh tools/push-dev.sh` (it pushes `next` to the repo
`jasondag-ai/rig-jam-next` as its main, where the same Action builds it, and waits for the dev build
id). The live game (/rig-jam/, this repo's `main`, `sh tools/check-live.sh`) is not touched by it.
See "The dev lane" below for the DEV label, the shared saves and the caches.

STANDING RULE, BEFORE EVERY JOB: read `GAME_BIBLE.md`, `ART_BIBLE.md` and `STANDING_RULES.md` from
`~/Desktop/RHR Art Inbox/` (those are the latest versions). If any differs from the copy in the
repo root, copy it over the repo copy and commit that change before starting the job.

EVERY JOB MUST PASS `STANDING_RULES.md` (Jay, Oct 6; it overrides anything older in the Game
Bible). Every gag, prop and scene change is checked against all ten before it ships: 1 the DEPTH
rule (below, "THE DEPTH RULE"; `npm run test:e2e:depth`), 2 same start, same end
(`test:e2e:frames`), 3 one standard scene a region, and a gag never adds or removes scenery, 4
true side profile for every strip character, 5 no size change between poses, 6 acting (face the
way you travel, anticipation, squash and stretch, arcs, eases, follow-through, a payoff), 7
"sightings", never "Easter eggs", 8 no new bathroom humour, accurate oilfield terms and geology,
9 no time-based gag triggers (only the night is idle-based), 10 visual fixes are checked in WebKit
at iPhone DPR 3 plus Galaxy and Pixel sizes, never only in Chromium, 11 SLOW MOE: any worker who
gets into trouble is Slow Moe (orange FR coveralls with stripes, stubble, droopy lids, hat tipped
back, same size); the bearded worker in red is the lucky one, 12 trucks in the strip face right and
no near door ever opens; check Safari's visible sizes (390 x 664, 375 x 635) too.

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
- MUSKEG (Mannville; level `muskeg` cells; `slideEnd`): floor a truck may stand on. A truck that
  drives ONTO muskeg (its leading end enters a muskeg cell it did not cover) cannot stop: it slides
  on the same way until it hits something (the end of its range that way), out through its gate if
  that is where the slide ends and the gate is open to it. One drag, one move. Driving off muskeg it
  is parked on is an ordinary move.
- LOAD RACKS (Bakken; level `racks` cells, truck `load: true`; `onRack`): a tanker (3 cells) must
  STOP on a load rack (end a move with any part of it over one) before its gate will take it;
  until then its gate is a wall for it. `loaded` is play state (never in a level file); Undo
  unloads. A tanker has a rack in its own lane and never starts on one. On a level with tankers
  the trucks that must load are the water hauler and the vac truck, and every other 3-cell truck
  is a frac unit (`tankerKinds` in gen-levels), so nothing that looks like a tanker leaves empty.
- SHIFT-CHANGE GATES (Bakken; gate `shift: true`; `shiftOpen`): open only on EVEN move numbers:
  the move that drives out must be the 2nd, 4th, 6th... of the game. On an odd move the gate is a
  wall. The gate's clock shows whether the NEXT move may leave by it.
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
- Clearwater: 10 levels on a pad of 8 x 8 (the Big Pad), trucks and gates only. Theme: `boreal`. Opens after 5 of Bakken. See "Clearwater, region 6".
- Montney: 10 levels, adds obstacles (pumpjacks, 400 bbl tanks, wellheads). Theme: spring mud.
- Duvernay: 10 levels, adds convoys. Theme: winter. Preview any theme with `?theme=winter` etc.
- Mannville: 10 levels, adds MUSKEG (with obstacles and convoys). EVERY level is par 14 to 20, the
  first included (Jay, Oct 5: nothing below the floor); level 1 has muskeg and nothing else new.
  8 to 9 trucks. Theme: `fall` (late fall: dry tan grass, gold aspen
  thinning among the spruce, pale overcast sky). Opens after 5 of Duvernay.
- Bakken: 10 levels, adds LOAD RACKS and SHIFT-CHANGE GATES. EVERY level is par 18 to 24, the
  first included; level 1 has racks and no clock gate, level 2 brings in the clock (two gates; the one-clock level would not come down to par 18, so it is level 3 at par 19: Jay, Oct 6). Pars 18, 18, 19, 19, 20, 21, 21, 22, 23, 24. Levels 1, 3, 7 to 10 were hill-climbed (`tools/climb.ts`), the rest accepted from the random search. 8 to 9 trucks. Theme: `prairie` (canola stubble in rows to a flat
  horizon, a big blue sky, hardly a tree: `Theme.trees` 0.14). Opens after 5 of Mannville.
- LEVELS OF REGIONS 4 AND 5 ARE NOT SEARCHED FOR AT RANDOM (it took 6 hours): the accepted ones
  live in `tools/fixed-levels/<id>.json` and `gen-levels` reads them first. A missing slot is
  hill-climbed from an accepted level by `node tools/climb.ts <id> <minutes> <out dir>` (`JOBS`:
  one piece changed at a time, kept if still sound and par did not drop, solver capped at
  `MAX_STATES` 2 million, done when par is in the window and it stands at least 4 trucks apart
  from the others). Mannville 1 was climbed from Mannville 2 (convoy and equipment taken off).
- Both go dark after 30 s idle like Montney and Duvernay (`GAG_TRIGGERS.night.themes`). A theme
  has a `season` (which drawing of the trees: `fall` is new in trees.ts) and a `trees` density.
  Their outside ground tiles (`grass-fall`, `grass-prairie`) are made from the summer grass by
  `tools/ground-tiles.py` (`fall_grass`, `prairie_stubble` + `stubble_rows`).

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
- GAGS: every gag is a CODE PUPPET (GAME_BIBLE 9b; `claude/GAG_STYLE_GUIDE.md` is the rulebook),
  ported from an approved reference page and set off by what the player does. The old sprite gag
  system (the gag layer, its scenes, rigs, sprite sheets and the `?gags=1` switch) has been DELETED;
  do not bring any of it back. ONE ART STYLE in play: the board's flat toy look and the puppets.
  Switches for tests (`src/ui/flags.ts`): `?magpie=0`, `?worker=0`, `?moose=0`, `?off=...`.
- TRIGGER SETTINGS: every gag's trigger lives in ONE file, `src/ui/gag-triggers.ts` (`GAG_TRIGGERS`),
  for Jay to tune after playing. NO GAG COMES FROM WAITING (Jay, Oct 5): idle only brings the
  night. Now: magpie = a truck TAPPED without being dragged, 1 in 2 (`?bird=1/0`); worker = a truck
  slides into another truck, 1 in 2 (`?nap=1/0`); moose = 2 bumps up into
  the top berm (Duvernay); Near Miss = two exits within 3.5 s (Cardium); landowner = the same truck
  driven back and forth 4 times (`BackAndForth`), OR a fast wiggle: 4 reversals of one truck inside
  ONE drag within 2 s (`Wiggle`; the board reports each turn of the finger, `onReverse`, a quarter
  cell back, so a boxed-in truck can be wiggled too); Biffy A = one bump down into the bottom berm;
  Biffy B = a second one within 1.4 s; marshmallow = 3 taps on a flare; geese = Undo 3 times in a
  row; bear = 3 taps on his bush on any Duvernay level, 1 in 3 (`bearComes`; else the bush shakes
  and drops a snow puff, `BushProp.shake`; demo mode always); bull = tap the cow (Montney);
  porcupine = 3 taps on the Cardium bush (the bear's pattern, every time); gopher lunch = a press of Hint in Cardium, 1 time in 2
  (`lunchComes`; demo mode always; `?lunch=1` / `?lunch=0` for tests); Sam = 3 bumps in a row
  or a wrong-colour gate; frozen tongue = 3 taps on the frosty riser (winter; tap target at least 44 px, `RiserProp.hit`);
  night = 30 s idle in Montney and Duvernay only, nudge 15 s after.
- GAG RULES (GAME_BIBLE Oct 5; `GAG_RULES`, `SHARES`, `mustWait` in gag-triggers.ts; enforced in
  `GameView.fire`/`startEgg`/`tickEggs`): gags play AT THE SAME TIME. A trigger plays its gag right
  away, even during a drag and even if others are on; it waits (in `eggQueue`) only for a gag that
  shares its character or prop (`SHARES`: the biffy, the gopher, the bush, the worker in red) and
  then follows it on. Once per level; none once the level is won (a win clears them). There are
  no idle gags and no cooldown any more (`IDLE_GAGS`, `GAG_RULES` and `?cooldown=` are gone);
  `tickEggs` only keeps a `?gag=` preview playing. Tests: `?off=lunch,porcupine,sam,tongue` leaves
  gags out, `?bear=1` / `?bear=0`, and the rolls' pins (`rollPinned`).
- SAME START, SAME END (GAME_BIBLE Oct 5): a gag's last frame looks exactly like its first.
  Characters walk in and out fully off screen; nothing appears or disappears by magic; any prop a
  gag uses is permanent scenery, and every prop is back as it began (the cow grazing in her spot,
  the biffy's indicator its starting green).
- THE DEPTH RULE (STANDING_RULES 1; Job T): the bottom strip has ONE front-to-back order, by
  ground line: what stands lower on the screen draws in front.
  - `.depth-strip` (GameView, under the night's shade): every prop layer, every strip gag layer
    and every tree, bush and mound standing below the lease (`depthTrees` moves those out of the
    scenery's layer) is ONE CHILD of it, a UNIT, and a unit's `z-index` IS its ground line in px
    (`data-ground`; puppet-stage.ts `setGround`). `place()` sets it from a puppet's anchor (the
    lowest foot in a layer); the wave 3 scenes set theirs from the reference's lane. Equal lines
    keep the order they were put on screen (a gag over a prop). Sky layers, the magpie and
    `over-lease` are not in the strip (`SKY_LAYERS`).
  - THE STRIP'S LINES (strip-gags.ts `stripGeom`, `propLine`, `propBack`; scenery.ts `LANE_UP`),
    from the back: the BACK ROW up by the berm (the biffy; the lease sign and its visitors, so
    the surveyor walks BEHIND the cow, the bushes and everything else); PROP ROW 2 (the riser,
    the gopher's mound); PROP ROW 1 (the gag bushes, the cow), each `propBack` (8 px at 390)
    behind the next; the WALKING LANE (`stripGeom().ground`: the landowner, Sam, the hotshot, the
    worker in most gags), in front of every prop; and the scenery's front trees on the strip's
    floor, in front of the lane (a tree that would stand on the lane is stood on the floor). A
    gag about a prop plays on that prop's row; the two prop rows are apart so it passes the other
    row's prop clearly in front (the bear and the riser, the porcupine and the mound) or clearly
    behind (the frozen worker's buddy and the bear's bush). Mannville and Bakken: the reference's
    own lane (back trees behind it, the lane aspen in front, the bale on it).
  - WHEN A LANE AND A PROP FIGHT, MOVE ONE OF THEM (never accept the overlap): a new prop goes on
    a row, a new walker on the lane, and scenery keeps trees off a gag's path with a clearing.
  - `npm run test:e2e:depth` (WebKit at iPhone DPR 3, Galaxy S23 and Pixel sizes; every region):
    each strip gag is held every 0.25 s and each character compared with every prop and tree it
    overlaps: ORDER (lower draws in front), ONE LANE (a gag layer keeps one ground line), NO TIES
    (no overlap with a prop on his own ground line, unless the gag is about that prop: `OWN`),
    NOT LOST (never standing still mostly hidden). The sleepy worker, the magpie, the moose, the
    geese and the aurora are not strip-held gags and are not in it.
- GAG LAYERS AND THE NIGHT: every gag layer is put on the screen with `host.mount`, which inserts
  it UNDER the night's shade. Strip layers (`.strip-layer`, `.worker-layer`) are z 0, so at night
  they dim exactly like the scenery and the props, with no filters. Only what must lie over the
  lease itself stays above the board and undimmed, like the trucks: `.strip-layer.over-lease`
  (the marshmallow stick; the worker himself is on an ordinary strip layer) and the magpie.
- EGG SCHEDULING: `fire(id)` starts a player-triggered gag at once (see GAG RULES). Nothing is
  scheduled by the clock.
  `?gag=magpie|worker|moose|nearmiss|landowner|biffya|biffyb|marshmallow|geese|bear|bull|porcupine|lunch|sam|tongue` plays one at once, again and again;
  `?idle=0.1` makes the night's idle time 10x shorter.
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
    every level at `BIFFY_X`, about 60 px tall at 390 (`BIFFY_SIZE` 0.8 of the reference, after
    playing on a phone; the shuffler is the WORKER'S size, `SHUFFLER_FRAC` 0.243, as in the porcupine gag; smaller on a short strip), standing up by the
    berm IN THE CORNER of the strip (`BIFFY_X` 0.08, `biffyStand`: `BIFFY_GAP` 2 px under the
    berm's foot; where a bottom gate hangs over that corner it stands just under the gate's
    posts, `BiffyProp.layout`; on a strip so short that the sleepy worker would sit on it he sits
    just to its right, `workerPlace`), in its own clearing
    (scenery `clearings`, plus `biffyLane`, a tree-free lane to the near screen edge), clear of
    the board, tip line and buttons. No biffy appears and
    disappears any more. `npm run test:e2e:strip` checks there is exactly ONE on every level.
  - BIFFY SHAKES (Jay, Oct 5): the truck's bump shakes the biffy before the door opens: one small
    shake for A (`A_SHAKE`), two bigger ones for B (`B_SHAKE`).
  - BIFFY A "Occupied": his embarrassment flushes his WHOLE face dark pink (`.headTurn .skin`), no
    cheek blush. Door bangs open, the occupant looks back wide-eyed, nods, reaches, pulls it
    shut; the indicator is red while he is caught (3.55 to 5.0 s), then clicks back to green
    (`unlocked`). BIFFY B "The Runaway Roll": the roll JUST ROLLS OUT: it waits on the floor
    behind the shut door from the first frame (no fade; the door is drawn again over it,
    `runawayScene` `front`, and the biffy's own door hidden meanwhile), the door bangs open on it,
    and it rolls flat along the ground at ONE constant speed, no easing, behind the open door and
    off the near edge. THE ROLL'S BOUNCE (root cause, Oct 5): `.pup-roll`'s inline SVG sat on the
    text line about 6 px off the centre of its turning box, so it orbited once a turn; `.pup-roll`
    now has no line box and its SVG is a block (the porcupine's roll too). The arm gropes, he
    shuffles after it with paper on his boot, the door creaks shut; red from the first bump until
    the door is shut, then green. Both leave by the screen edge NEAREST the biffy (the left: a few
    steps, in the corner), so B is short (`B_ROLL_OFF`, `B_OFF`, `B_SHUT`). `test:e2e:strip` fails
    if the roll's drawing is more than 0.5 px off its box's centre or its centre moves more than
    0.5 px up or down while it rolls.
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
    `bear_rabbit_reference.html`). EVERY Duvernay level has his bush as permanent scenery
    (`BushProp`, `.bush-layer`, at `BUSH_X`, right of the riser; the scenery's own willow anchor is
    left out there and `bearBox` keeps trees off). Trigger (`GAG_TRIGGERS.bear`): 3 taps on the
    bush; 1 time in 3 he comes, otherwise the bush shakes and drops a small puff of snow and the
    count starts again; once he has been, it only shakes. No longer tied to solving the level. One
    layer holds hare (z 2 behind the bush, z 5 in his paw or on the snow), bush (3), bear (4) and
    the overlay (sweat, speed lines, the hare's "ugh" scribble). The hare goes behind the bush only
    when its leading foot reaches the bush's edge, and stays hidden there. The bush is the board's
    own with a snow dusting (see THE GAG BUSH). Log card: legendary gold frame.
  - THE BULL AND THE COW (gag 11, Montney; `bull.ts`, ported from `bull_cow_reference.html`). The
    Holstein cow is permanent scenery grazing in the Montney strip (`CowProp`, `.cow-layer`, at
    `COW_X`; quite still until the gag; `cowBox` keeps trees off). Trigger: tap the cow
    (`GAG_TRIGGERS.bull`). The Hereford bull walks in from off the left, freezes, PRIMPS (licks a
    hoof, a rubber-stretched leg slicks his curly forelock back and it stays slicked, chest puff
    with a sparkle), dreamy eyes and floating red hearts (NO speech bubble); her eyes go huge,
    hop-turn, she bolts off the right; eyebrow waggle, snort, paws the ground, charges after her
    trailing hearts; a last heart pops. HIS HEAD IS A TRUE SIDE PROFILE (Jay, Oct 6; it read as a front view with one eye): the eye on the side of the head, the muzzle forward with one nostril, the near horn in front of the far one, the nose ring edge on at the muzzle's tip, the forelock kept; the reference's eye, lid, brow and forelock paths are untouched and its mouth and tongue paths are moved forward 14 units to the muzzle. The primp is the reference's own (re-sent Oct 5; it
    takes `SHIFT` 1.6 s, the later beats are that much later). THE COW COMES BACK (authored, not in
    the reference): from `T_BACK` she wanders in from the right edge, the one she left by, a little
    out of breath (puffs at her muzzle), and from `T_GRAZE` grazes in her spot exactly as at the
    start (`COW_REST`). The bull stays gone.
  - THE GAG BUSH (`gag-bush.ts`): BUSH RULE, every gag bush is the board's own willow drawing
    (`treeArt('willow', …)`), never a reference page's blob; in winter in leaf with a snow dusting.
    `BushProp(host, x, season)` is the permanent one (bear levels at `BUSH_X`; all of Cardium at
    `PORC_BUSH_X`, where it stands in for the scenery's anchor bush). It stands on bare stems, so
    anything behind it is cut off under the leaves across its width (`behindBush`).
  - THE PORCUPINE (gag 12, Cardium; `porcupine.ts`, ported from `porcupine_reference.html`; the
    reference starts its clock at `SHIFT` 2.4, so `pcPose(t + SHIFT)`). The porcupine is behind
    the bush from the first frame. The worker strolls in from the left with a roll, looks about,
    squats behind the bush, POKE (hat pops, the roll pops up over the bush and drops back), springs
    out and scurries off left with quills in his bum; the porcupine bolts off the right, quills up.
    Trigger: tap the Cardium bush 3 times (`GAG_TRIGGERS.porcupine`), in the game and in demo mode.
  - GOPHER LUNCH (gag 13, Cardium; `gopher-lunch.ts`, ported from `gopher_lunch_reference.html`):
    played at the BOARD'S OWN mound, not a second drawing: with these gags the scenery stands the
    mound on the strip's ground line at the reference's size (`moundSpot`, scenery `moundAt`), the
    gopher's box ends at its hole line and `LIP` (the hole's near half) lies over it so the arm
    comes out of the hole. Every reference distance is in `um` (reference mound units). Trigger:
    a press of Hint, 1 time in 2 (not idle any more). Reference of Oct 5 11:50: he walks in from
    the NEAR edge (the right), past the mound, eyes the spot and plops down; the sandwich lands
    where his hand sets it (`dropX`); his whole face flushes when he boils over (no blush spot);
    he hurls the crust down the hole, hop-turns and stomps off the way he came, glaring down at
    the hole; the gopher pops up chewing it, burp, gone; the quiet mound again (`LUNCH_END` 17.9).
    The arm is 1.5x thicker with a bigger paw (`ARM`) and the sandwich is TRIANGLE-CUT (`FOOD`
    makes it a little bigger): both built from Jay's description, because the "12:10" reference
    never reached the Desktop (the file there is still Oct 5 11:50, round sandwich). If it
    arrives, port its drawings over these.
  - SAFETY SAM (gag 14, any region; `sam.ts`, ported from `safety_sam_reference.html`): the
    worker's build recoloured (white hat, navy, hi-vis vest, moustache) with a clipboard. Marches
    in from the left to the middle of the strip, looks up, slow head shake ("tsk" is drawn), scribbles,
    turns the clipboard (SEE ME), two fingers to his eyes, points, and BACKS off the left still
    pointing (the one intended exception to "face the way you travel"). The clipboard hangs from
    his back glove (`backGlove`, by arithmetic). Trigger (`GAG_TRIGGERS.sam`): 3 bumps in a row with
    no move between (`bumpRun`), or one push at a wrong-colour gate (`wrongGateBump`). Once per level.
  - THE FROZEN TONGUE (gag 15, winter levels; `frozen-tongue.ts`, ported from
    `frozen_tongue_reference.html`). The frosty riser is permanent scenery on winter levels
    (`RiserProp`, `.riser-layer`, at `RISER_X`, between the biffy and the bear's bush with room on
    both sides; left out where a very short strip would put it on the berm: `fits`). The worker
    licks it and sticks, the tongue stretches to the REAL riser, "HEWP!", his buddy (blue, orange
    hat) takes a photo (the flash lights the bottom strip only), cracks up and leaves, a snowflake
    lands on his nose. Ending (reference, Oct 5): the buddy comes back from the FAR side with a
    steaming thermos, sighs, pours hot coffee on the pipe, THWIP, the tongue frees; both hop-turn
    and walk off their own ways; the empty riser again. Trigger: three taps on the riser.
  - THE LEASE SIGN AND ITS THREE GAGS (16 to 18; `sign-gags.ts`, ported from
    `sign_gags_reference.html`, saved Oct 5 13:22). The blank lease sign is PERMANENT scenery at
    one fixed spot on every level (`SignProp`, `.sign-layer`, `SIGN_X` 0.62, in the open row up by
    the berm, a little nearer the buttons than the biffy: `signStand`; `signLane` keeps trees off
    its visitors' way; the scenery no longer scatters a sign). The reference brings visitors from
    the left; in the game the near edge is the right, so their stage (`.sign-stage`) is MIRRORED
    about the sign (`signStage`); the sign itself is the prop's own puppet, and BZZZZ is turned back.
    16 SURVEYOR (approved as it is): sights the sign, "Off a metre.", yanks it up, moves it a
    metre, sights again, "Huh.", carries it back exactly, stamps it in, "Perfect.", folds the
    tripod, leaves. Trigger: the Restart button, 1 in 2, once a visit. Any region. THE TRIPOD
    IS PART OF HIS HAND (Job P, root cause fixed): carried, it is drawn INSIDE his front forearm's
    group (`.armF .fore > .held`, kept upright by taking the arm's own turn back out), so it goes
    wherever the glove goes; it is never an element placed or tweened on its own. Standing, it is
    one drawing put on `TRI_AT` once and never moved. The two change places only at `T_PLANT` and
    `T_PICKUP`, when he stands in the `HOLD` pose and the folded tripod in his hand is, by
    arithmetic (`gloveAt`, `GRIP`, `PLANT_DX`, `PICK_DX`, `heldTripod`), exactly on the standing
    one. Folded while carried; its legs unfold and fold only on the spot. (The old way measured
    his hand on screen with `getScreenCTM` through a mirrored stage, took the walk's bob out and
    blended the tripod between hand and ground by itself, so it slid against the glove.)
    17 BACK SCRATCHER (mule deer) and 18 TOURISTS were REVISED by Jay (bible, Oct 5) after the file
    was saved and no newer file has arrived, so their revised beats are AUTHORED from his words on
    the reference's drawings and clock: the deer rubs its CHEEK AND NECK on the sign's near corner
    and post (never its rump), eyes roll back, tongue out, a hind leg thumps, and it ambles off
    PAST the sign; SHE PHOTOGRAPHS HIM posing by the sign (he spins round, elbow on the sign,
    thumbs up), flash, one mosquito, slap, the swarm, both run off, a straggler lands on the sign.
    If a newer reference arrives, port it over those two. Triggers: deer = tap the sign; tourists
    = the first move on the Daily Pad, 1 in 3 (`rollComes`; `?surveyor=1/0`, `?tourists=1/0` pin a
    roll, `rollPinned`). No deer or tourists on winter levels. A gag may say several lines
    (`Built.lines`). `npm run test:e2e:signs` checks all of it and saves `gag16..18_*.webm`.
  - `npm run test:e2e:eggs2` checks gags 8 and up the same way and saves their clips.
  - `npm run test:e2e:strip` checks all of it in WebKit (beats, real triggers, off-screen entry and
    exit, hole clip, biffy placement, reduced motion, log), 60 fps at 4x throttle in Chromium, and
    saves `gag47_*.webm` clips.
- GAG WAVE 3 (Mannville and Bakken; Jay, Oct 6): ported from
  `~/Desktop/RHR Art Inbox/mannville_bakken_gags_reference.html` (saved Oct 6 03:41). That page
  draws each gag as ONE SVG string per frame on a 390 x 190 strip in its own coordinates (berm's
  foot y 30, walking lane's ground `GY` 150), and so does the game:
  - `src/ui/wave3.ts` (@ts-nocheck): the reference's helpers and puppets copied as written
    (worker, cat, beaver, coyote, prairie dog, pipe, bale, tumbleweed, cloud, umbrella, `sfx` sound
    words) and each gag as `WAVE3.<key>`: `beats`, `dur`, `still`, `render(t, E)` (the MOVING part
    only), `over(t, E)` (sound words and Zs, drawn over the lane aspen), `lead(E)`, `tail(E)`.
  - `src/ui/scene-stage.ts` (typed, tested): `sceneGeom` shows that world in the game's real
    bottom strip at the scale the strip's HEIGHT allows (`s = min(W/390, stripH/138)`), centred,
    standing on the strip's floor. On a short strip the screen is wider than the world by `E`
    units a side, so every walk-in starts `E` further out and every walk-off goes `E` further AT
    THE REFERENCE'S SPEED: the gag's clock starts `lead(E)` early and ends `tail(E)` late; every
    beat between keeps the reference's time (`sceneDef` shifts the beats). Under `SCENE_MIN`
    (0.45: about 62 px of strip) the gags do not play. `skyGeom` does the same for the sky band.
  - THE STANDARD MANNVILLE SCENE (`MannProp`, every Mannville level; the generic scenery puts no
    trees below the board there): `.mann-layer` = the reference's six trees IN THE BOARD'S OWN
    DRAWINGS (`MANN_TREES`; the left grove 56 right of the reference, clear of the biffy), tufts,
    and the three muskeg puddles with cattails (`MUSKEG`, the reference's drawing; the small left
    one 54 right, clear of the sleepy worker's spot); `.mann-front` = the LANE ASPEN (`LANE_ASPEN`,
    x 288), which `GameView.mount` keeps OVER every strip gag layer (`.scene-front`), with a gag's
    own sound words over that (`.scene-over`). The lease sign stands at `MANN_SIGN_X` (0.44) on
    Mannville, left of the aspen's crown (`setSignX`).
  - MUSKEG BOOTS (3 taps on the big puddle, `hitPuddle`), CAT TRAIN (a convoy out in order, back
    to back: truck 1 then truck 2 on the very next move, `convoyOut`), BEAVER (3 taps on the lane
    aspen, `hitAspen`; it shakes on the other taps), AURORA HOWL (a tap on the moon once night has
    fallen, `onMoon`; in the sky band: its layer goes OVER the night's shade, `.aurora-layer`, and
    fades with the night; Mannville's moon is always shown where the sky band has room,
    `AURORA_SKY`). The coyote slows to his stop and starts off again (`COY_EASE`, `pace`), sits in
    one smooth fold, and LEAVES BEHIND THE FRONT TREE LINE: the scenery's front row above the lease
    is `.sc.front`, a second drawing of him (`svg.aurora-under`) lies in `.trees` just under it,
    and the one over the trees fades into it as he goes (`behind(t)`); there he is dimmed by the
    night like the trees. The beaver's pipe makes ONE simple twist (tilt upright, carry it upright
    past the aspen, tilt back down; no spin). `?gag=muskeg|cattrain|beaver|aurora` (the aurora's preview pins the night).
    Log cards: `wave3Still`. No sounds yet (`GAG_SOUNDS` rows are empty). Witness lines are Jay's own.
  - THE STANDARD BAKKEN SCENE (`BakkenProp`, every Bakken level): the round bale at the reference's
    spot (`BALE_AT`, world x 352, on the lane's ground line), `.bakken-layer`. The generic prairie
    scenery stays, with the bale's box and the walking lane (`lane()`) kept clear of trees.
  - TUMBLEWEED (a truck driven the full length of the board in one move: from one end of its lane
    to the other, or out through a gate from at least that far), PRAIRIE DOG WAVE (3 taps on the
    same spot of the bottom strip, each within 24 px of the last; the mounds push up fresh and
    settle flat: they are drawn by the gag, never scenery), RUNAWAY BALE (a bump down into the
    bottom berm in a lane within a cell of the bale; the gag hides the scenery's bale and draws it
    itself, ending exactly where it stood; the rancher is the reference's own drawing of the
    landowner on foot, not the quad puppet; he shouts `BALE_LINE` "Hey!" in the game's bubble,
    whose tail follows him), PERSONAL CLOUD (3 taps on the sky band; it plays in the bottom
    strip, as in the reference, on a layer OVER the lease, `sceneDef` `overLease`, so the cloud is
    never behind the berm). `?gag=tumbleweed|pdogs|bale|cloud`.
  - A SHUT GATE COUNTS AS BERM for bump triggers (`bermBump`): a wrong-colour gate, a convoy gate
    waiting, a tanker's gate before it has loaded, a clock gate on the wrong move.
  - `npm run test:e2e:wave3` (WebKit at DPR 3; Chromium 4x throttle): the scene on all 10 levels,
    first and last frames against the empty scene by pixels at 390x844 and 375x667, the real
    triggers, beats, touches never blocked, log, reduced motion, a 22 px strip, 60 fps.
- THE SLEEPY WORKER (gag 2; trigger: a truck slides into another truck, 1 in 2, no idle timer; `src/ui/worker.ts` pure and tested, runner `WorkerGag` in
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
  parts, colours, outline, expressions, beats and timing). A code puppet, no sprites. When a truck
  is tapped without being dragged (1 in 2; no idle timer any more), once per level:
  fly in facing travel > wobble landing > hop-turn (never paper-thin) > sly look and blink > glance
  left and right > crouch, tail up > strain while the drop slowly swells > relief > peek down > smug
  puff and two chuckles > crouch > launch forward and up, a feather drifts down (`BEATS`; the
  layer's `data-beat` names the current one). `pose(t, travel)` gives every part's place;
  `travelFor` stretches the reference's flight so he starts and ends with his whole box past the
  screen's edge (`offScreen`, `data-off`). He is drawn on `.magpie-layer`, over the WHOLE game screen
  (never clipped by the board, berm or any container), which takes no touches. About 37 px of bird
  (`BIRD_FRAC`, a quarter smaller than the reference after playing on a phone; his splat and drip
  keep the reference's size, `MARK_FRAC`). He picks a parked truck whose cab roof is a full cell in from the board's edge
  (`pickTruck`). The splat and drip become part of that truck (`.magpie-splat`, `.magpie-drip` in
  its `.body`), so they ride with it; the drip runs toward the truck's front (`dripTurn`); restart or
  a new level clears them. "Seriously?" is said beside him, on the side with more room. Grab his
  truck mid-gag and he startles (`startlePose`: feathers up, a hop, off forward, fully off screen)
  and leaves no mark; he may try again after another idle stretch. Reduced motion: the bird fades in
  smug, the splat appears, the bird fades out. Wildlife Log card: the smug pose (`magpieStill`).
  `?gag=magpie` plays him at once on Cardium 6, again and again. `npm run test:e2e:magpie` checks all
  of it in WebKit (frame rate in Chromium under 4x throttle) and saves clips.
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
- GATE EXITS (`src/ui/exit.ts` pure and tested, `BoardView.driveOut`): THE TAIL CLEARS THE GATE,
  THEN IT FADES (Jay, Oct 6). The yard's clip is lifted while a truck leaves (`.yard.letting-out`,
  until its dust has cleared); it ROLLS, solid, until its tail is `EXIT_CLEAR` (0.12 cell) past the
  berm's outer edge (`exitPlan`: `roll`, `rollMs` at a steady pace, 460 to 760 ms), kicking up dust
  at the gate as it goes through (`gateDust`); only then does it fade, over `EXIT_FADE_MS` (240)
  and a short coast (`EXIT_COAST`). The fade is begun by the END OF THE ROLL ITSELF
  (`transitionend`), never by a timer beside it (a timer ran a frame or two ahead and it faded
  with its tail still in the gate). NOT A FRAME OF FADING WHILE ANY OF IT IS IN THE GATE. Outside
  the lease it passes UNDER the HUD, the tip line and the buttons (they are z 2). The gate's arm
  comes down once it has gone; the win card waits for the last truck (`EXIT_MOST_MS`). Plain
  opacity only: NO mask-image or clip-path (iPhone Safari). Reduced motion: the truck is simply
  removed. `npm run test:e2e:exits` checks all four sides in WebKit, frame by frame and by the
  pixels of a screenshot half way through the gate.
- THE DRIVER'S ARM (Jay, Oct 6; `.driver-arm` in the truck's `.cab`, styles under "Drive-out"): a
  leaving truck's driver waves a NORMAL ARM OUT THE WINDOW, about 40% of the first one's size: the
  upper arm (`.upper`) rests on the door sill, the forearm (`.fore`) with a small hand waves from
  the elbow (`wave`). Skin `#f0c09a` and outline `#2b1e16` are the worker puppets' own. Sized in
  shares of a cell, so it is the same arm on every truck; `--sill` is how far in from the truck's
  box its door lies (0.115 pickup and picker, 0.175 the 3-cell rigs, whose cabs are narrower).
  The whole arm is under half the cab's width. Checked in `test:e2e:exits`.
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
- REGION BAR (Job N; `src/ui/region-bar.ts` pure and tested, styles under "Region bar"): the region
  tabs are ONE row of FULL-SIZE tabs (18 px names, the padlock beside the name) in a strip the
  player swipes left and right, so regions can be added without shrinking anything: `.regions`
  is the cream frame, `.regions-track` the scroller (native momentum, `scroll-snap-type: x
  mandatory`, a snap at each tab, no scrollbar, `touch-action: pan-x` so a swipe on it never
  moves the page). `TABS_IN_VIEW` (2.34, `--tabs`): two tabs show whole and the next peeks about
  a third in at the right edge; an edge fades (`.more-left` / `.more-right`) where there is more
  that way. On open the bar is scrolled so the region the player was last on is wholly in view
  (with none remembered yet, the furthest one unlocked: `furthestOpen`), and it stays where it
  was if that already shows it (`barScroll`). Locked tabs keep the padlock and can be swiped to;
  a tap only shakes them. A SWIPE IS NEVER A TAP: `runRegionBar(...).tapped()` refuses a touch
  if the bar moved under it, or was still moving when the finger went down (`SETTLE_MS`); a
  keyboard or scripted press (no pointerdown) always counts. `?tabs=8` pads the bar with made-up
  locked regions (`fakeRegions`) for tests and previews. `npm run test:e2e:tabs` (WebKit, DPR 3,
  375 and 390, 5 and 8 tabs).
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
  (The checker looks for the letters only between each row's own blue: beside the banner's
  crown a row is still the scenery behind the card, and a tree's dark outline there was once read
  as lettering touching the ribbon's top. Oct 9: the card was right, the checker was not.)
- Confetti (`GameView.confetti`): on a perfect solve, 40 small hard hats and orange/yellow scraps
  fall for about 1.5 s in a layer UNDER the card (never over its buttons), then the layer is
  removed. Not made under reduced motion.
- Win card characters (`src/ui/win-cast.ts`): flat puppet stills in the worker's build and outline,
  never sprites, one expression per result (`Tier`: par, close, over; `data-tier`). The mascot is
  the worker himself (`mascotStill`: arms up at par, a thumbs-up when close, sheepish with a bead
  of sweat when over). The Company Man (`companyStill`, head and shoulders) is the same build in a
  white hard hat, a light blue button shirt and khaki pants with a travel mug and no vest (pleased,
  unmoved, scowling). Moved only by GSAP about a fixed origin: the mascot does one squash-and-stretch
  bounce on a perfect solve and then breathes; the Company Man gives one slow small nod, then holds
  still. Reduced motion: no movement. `npm run test:e2e:menus` checks this.
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

## Speech bubbles
- ONE rule for every bubble (`src/ui/bubble.ts`, pure and tested; `BoardView.say(anchor, text,
  prefer)` puts it on screen): its tail's TIP TOUCHES ITS SPEAKER, and the bubble FOLLOWS the
  speaker every frame while it moves (asked for after the frame's other callbacks, so it is never
  a frame behind). It stays below the HUD, above the buttons and inside the screen's side margins
  (`placeBubble`: the first preferred side that fits, else the nearest fit). Four sides: above
  (default), `.below`, `.beside-left`, `.beside-right`; `--tail` is the tail's place along the
  edge; it pops out of the tail's tip. `data-side`, `data-tip`, `data-fits` are for tests.
- Who the speaker is: a driver's line (bump, witness, nudge) = that truck's `.cab`, above it, else
  below. The moose = his `.muzzle`, beside it. The magpie gag's line is the DRIVER's ("Not the
  windshield!"), so its tail is on the cab the bird stands on, beside the cab, never over the bird.
  Strip gags name the speaker's own element (`Bubble.who`: the `.head` of the gopher, landowner,
  marshmallow worker, lost goose, frozen worker); the bubble sits over the head.
- WITNESS LINES come only from the truck NEAREST the gag (`GameView.witnessFor`, `nearestWitness`;
  the gag = the boxes of its characters on screen, `gagBoxes`), and only if it is within
  `WITNESS_REACH` (2 cells); otherwise nobody speaks and the next move may try again.
- `npm run test:e2e:bubbles` (WebKit) measures the laid-out tail tip against the speaker's box on
  the first frame and while it moves, for every speaker.

## Tutorial
- `src/ui/tutorial.ts`: the "?" button in the HOME page's top bar (left of the binoculars and the
  gear; the game's HUD has no room for it at 375 px) opens three how-to cards with a ghost finger
  (`TUTORIAL_CARDS`: drag along the length; the matching gate; fewer moves, more hard hats). Next
  or a swipe (`swipeTo`, pointer events, never a scroll) turns the card; Got it, Close or the X
  leave. Buttons use `onTap`.
- Level 1 (`COACH_LEVEL` c01) shows the ghost finger on the board (`ghostFinger`, `GameView.coach`):
  the solution's first move, over and over, until the player's first drag. It takes no touches.
  Reduced motion: stills. `npm run test:e2e:tutorial`.

## Night
- NO level starts at night and no level carries a night flag. ONLY MONTNEY AND DUVERNAY GO DARK
  (`GAG_TRIGGERS.night.themes`: spring and winter; `nightComes`); Cardium (summer) never does,
  and a summer Daily Pad never does. On those levels, after
  `GAG_TRIGGERS.night.idleMs` (30 s) with nothing done by the player (`lastPlayAt`; gags do not
  count), the lease fades to night over `fadeInMs` (4 s); the next thing the player does (a truck
  picked up, a move, Undo, Restart: `played`) fades it back to day over `fadeOutMs` (2 s).
  `GameView.setNight` puts `.night` on the screen and the board; the board wears `.dawn` while the
  day comes back. Rules in `src/ui/night.ts` (pure, tested); look and fades in style.css "Night".
  `?night=1` pins night on, `?night=0` keeps it away (previews, screenshots, tests).
- Everything night adds is always in the page and CLEAR by day, and fades by opacity (or a filter):
  `.night-skyfill` (the sky's own night, the first thing on the screen, behind the trees),
  `.night-shade` (`--night` from `nightRgba(ground)`: deeper on mud, stronger on snow; over the
  scenery, vignette, strip props and strip gags, under the lease, HUD and buttons; it holds the
  stars and the moon, `nightSky`), `.night-pad` inside `.lease-ground`, and `canvas.berm-night`
  (the day's berm canvas copied under the shade, `paintNightBerm`). Equipment is dimmed with a
  filter (0.7; the flare 0.92). Trucks keep 0.9 and gates 0.92; symbol badges, convoy tags, hints
  (the hinted truck is left alone), the HUD, buttons and win card are untouched.
- Flare glow: `.flare-glow` inside the flare's obstacle (behind its drawing, over the ground and the
  trucks near it), 2.5 cells across; the element fades in with the night and its `::before`
  flickers in step with the flame (same period and `--eq-delay`). Headlights: `.lamps` in every
  truck, two soft glows at the cab end (`data-cab`). Reduced motion: night comes without the fade,
  the flicker or the twinkle.
- The nudge: `GAG_TRIGGERS.nightNudge.afterNightMs` (15 s) after night has fully fallen, a random
  truck says `NUDGE_LINE`. Once per level visit. Never a fail state.
- Tests: `night.test.ts` (no level has a night flag, settings, shade about half brightness and
  cooler, every truck and gate colour clear of the night pad); `npm run test:e2e:night` (WebKit:
  every level starts by day, the idle fade in and out, the nudge, pixels against the same level by
  day, gag layers as dim as the scenery, glow, headlights; 60 fps at 4x throttle in Chromium,
  the fade included); `node e2e/night-shots.mjs` saves `night_*.png`.

## Cover (title screen)
- `src/ui/cover.ts`: shown on every app open (never between levels). Hero image `public/cover.webp`
  (1080x1920, under 300 KB; NOT preloaded in index.html any more: the preload went unused whenever the cover is skipped, and the browser warned) fills the screen (`object-fit: cover`);
  "RIG JAM" slams down into the sky with a bounce and a dust puff; 8s push-in; two soft
  clouds drift (blurred white puffs with a pale blue underside at about half opacity, matched to the
  image's own clouds; on wide screens they sit up in the thin strip of sky); TAP TO START pulses. One tap anywhere (`onTap`, no ghost click) opens the level list. If the
  image isn't loaded within 1s (`IMAGE_WAIT_MS`) the title shows over a sky gradient. Reduced motion:
  all still. Skipped for `?gag=` links and automated browsers (`navigator.webdriver`) unless
  `?cover=1`; `?cover=0` skips it. `npm run test:e2e:cover` tests it.

## Beta readiness (Job O)
- VERSION: `package.json` `version` (0.9.0) and a BUILD id (the first 7 of the commit's hash:
  `GITHUB_SHA` in the deploy, `git rev-parse` locally, else 'dev') are set at build time
  (vite.config.ts `define`: `__APP_VERSION__`, `__APP_BUILD__`; `src/ui/version.ts` `APP`,
  `versionText`). Shown at the very bottom of Settings ("Version 0.9.0 (a1b2c3d)") and copied into
  feedback. The build also writes `version.json`.
- UPDATES (`src/ui/update.ts`, tested): an open or installed copy asks the server for
  `version.json` (never from a cache: the service worker lets that file through) when it opens,
  whenever it comes back to the front, and every 15 minutes (`CHECK_MS`). A different build id
  (`isNewer`), or a new service worker taking the page over, shows ONE bar across the top,
  "New version, tap to update" (`showUpdateBar`, `.update-bar`): it never reloads by itself, it
  keeps off a level being played and the cover (it waits on the level list), and a tap reloads
  the page. A reload never touches progress (localStorage). Production builds only;
  `?update=test` shows the bar anywhere, for tests.
- FEEDBACK (`src/ui/feedback.ts`, tested): a "Send feedback" row in Settings: a plain address to
  copy, and a Copy button that copies the address with the app version, the phone
  (`phoneModel`, from the user agent) with its screen size, and the level last opened
  (`rememberLevel`, its own storage key). No accounts, no links, no forms. THE ADDRESS IS ONE
  CONSTANT, `FEEDBACK_EMAIL` (jason@stragentic.com): if it is empty the row is not shown. `?feedback=a@b.c` shows it
  with that address (tests).
- FIRST RUN: a brand-new player (no level cleared, no Daily Pad, demo off) goes from the cover's
  one tap STRAIGHT INTO LEVEL 1, which teaches itself with the ghost finger; everyone else gets
  the level list. Playable well inside 3 s of opening.
- SMALL PHONES: `npm run test:e2e:beta` walks a fresh install on an iPhone SE (WebKit 375x667) and
  a mid Android (Chromium 360x800, a Pixel's user agent): nothing cut off, no sideways scroll,
  no tap target under 44 px on the level, win card, list, Settings and the log. Fixed on the way:
  the home page's title and how-to paragraph ran under the three round buttons at 360 to 375
  (the title now keeps to its own part of the top row, which is as tall as the buttons), and
  the Credits list showed under Settings without being asked for (`.settings .step[hidden]`).

## Progression
- Levels open in order within a region (clear one to open the next). A region opens after clearing
  5 of the previous region's 10 (`REGION_UNLOCK` in `src/ui/unlocks.ts`). Cardium is always open;
  the Daily Pad is never locked. Locked items show a padlock and "Clear … to unlock"; tapping
  only shakes. A region earned for real shows a one-time "NEW LEASE OPEN" banner (`announced`).
- Settings → "Unlock everything (demo mode)": a flag in progress that opens everything without
  touching scores or streak. Off restores normal locks. Reset progress turns it off.

## Characters and lines
- The Company Man on the win card: a line by result (`src/ui/company.ts`: `tierFor`, `companyLine`;
  lines in `lines.ts`), never the same twice in a row. His picture: `win-cast.ts`.
- Driver bump lines: `lines.ts` and `bump.ts` (see Structure).
- Every gag: see "Look" (GAGS, GAG RULES, and each gag's entry). SAME START, SAME END is tested by
  pixels for every strip gag (`npm run test:e2e:frames`: held at t = 0 and at its end with
  `?gagtest=1` / `window.__rhrGag`, the first frame must equal the level just before and the last
  frame the level just after) and by pose for the magpie, the worker and the moose (unit tests).
- `?gag=<name>` previews (`PREVIEWS` in gag-triggers.ts) open a suitable level and play that gag at
  once, again and again. `?idle=0.1` makes idle times 10x shorter.

## Sound

- REAL FILES, no synth (the old synth engine, `synth.ts` / `sfx.ts` / `music.ts`, is DELETED: do not
  bring it back). Jay's picked cartoon sounds and music live in `public/audio/` (`sfx/<key>.mp3`, 42
  of them; `music/<style>_<menu|play>.{ogg|opus,mp3}`, six loops), built by
  `python3 tools/audio-pack.py` (it re-encodes the music's Opus files a little differently each run: `git checkout public/audio/music` if only effects changed) from the packs in `~/Desktop/RHR Art Inbox/Sound files/`
  (`rhr_cartoon_sounds`, `rhr_music_styles`; needs ffmpeg). The script copies ONLY the picks, trims
  leading silence, cuts long files to the part the game uses, fades every one-shot's end, and writes
  `src/audio/pack.json` (length and measured loudness of each file) and `credits.json`. To change a
  pick, edit its `SFX` / `MUSIC` table and run it again.
- `src/audio/pack.ts` (pure, tested): THE MIX. `VOLUME` is one number per sound (its place in the
  game: the player's own sounds on top, engines and loops low, the pumpjack lowest); `gainFor`
  first evens out each file's own loudness from `pack.json`, so nothing jumps out. Music sits well
  under the effects and the in-play loop is quieter than the menu loop (`MUSIC_VOLUME`).
- `src/audio/engine.ts`: the AudioContext is made on the first tap (iOS rule); `navigator.
  audioSession.type = 'ambient'` where supported, so the iPhone's silent switch mutes it. NOTHING is
  fetched before that tap, nor while its switch is off: the game's own effects (0.9 MB; not gag wave 3's, see LAZY below) load when Sound
  effects is on, ONE music loop only when Music is on. The UI only calls `sound.*` cues; every
  button clicks by itself (`click`: a pointer listener in `install`, see THE BUTTONS' CLICK).
  `sound.quiet()` when leaving the game screen; `GameView.leave()` stops its gags (and their sounds).
- Cues: drag (`drag` + the `motor` loop, pitched with speed), backing up (`reverse` loop), bump then
  `radio` before the bubble, an exit (`clack`; exits within `CHAIN_MS` add the toy `horn` as
  a three-pitch chord, `HORN_CHORD`, two semitones higher per exit in the chain, `chordLift`), win
  (a pop per hard hat, then `tada` at par or `lose` at par + 4 or worse, `winCue`), `streak`, a
  pumpjack's stroke (`pumpjack`, once a stroke for the lease, very quiet).
- GAG SOUNDS: one table, `src/audio/gag-sounds.ts` (`GAG_SOUNDS`: gag > beat > cues; `'poke'`,
  `'poke@0.4'` delayed, `'+steps'` / `'-steps'` start and stop a loop: steps, snore, mosquito,
  quad_idle, quad_rev). Every gag runner marks its beats through `markBeat` (`src/ui/gag-beat.ts`),
  which sets `data-beat` and plays that beat's cues; a gag's loops stop when it ends (`gagEnd`). To
  move or change a gag's sound, edit the table only.
- Music: three styles, Country (default), 80s Retro, Chill (`MUSIC_STYLES`), each with a menu loop
  and an in-play loop (`Scene`); changing scene or style fades over `MUSIC_FADE`. Loops are played
  as decoded buffers with their loop points set past any MP3 padding (`loopPoints`), gapless format
  first (`pickFormat`: the delivered Ogg Vorbis, or Ogg Opus where the script re-cut the loop), MP3
  as the fallback. Bitstream Dreams, Chill Beat and the two Country songs have a 2 s crossfade of
  tail into head baked in by the script (`crossfaded`). Music files are NOT in the service worker's
  precache (vite.config.ts).
- Settings (`settings.ts`, localStorage `rush-hour-rigs-audio`, separate so Reset progress keeps
  it): SOUND IS OFF BY DEFAULT (effects off, music off), style Country; a style saved under the old
  engine maps to its nearest (`synth` > retro, `lofi` > chill). Settings has both switches, the
  style picker and a CREDITS screen (`src/audio/credits.ts`: the six loops by title, the effects
  gathered by source and licence; nothing picked needs an attribution licence).
- SOUND PASS (Job S, Oct 6): JAY PICKED BY EAR, AND HIS PICKS ARE WIRED. The picks board
  (`python3 tools/sound-picks.py`: 22 cues, three options each, written to
  `~/Desktop/RHR Art Inbox/sound_picks.html` only; it is NOT on the live site) is how the next
  round would be picked too. His picks: the synthesized ones are exported as WAV sources by
  `tools/sound-picks.py --export` (`PICKED`) into `tools/sfx-art/`, the pack ones are named in
  `audio-pack.py`'s `SFX` table; `audio-pack.py` builds both and LEVELS them (`LEVELLED`: each
  brought to about -19 dB average, peak never past -1.5 dB), so the mix table only gives each
  its place. 60 effects now.
  - REPLACED, files and code gone: the old "dingle" (`rattle`) is `knock`, a wooden
    knock-and-wobble, in all its 11 uses (deer 4, surveyor 2, Runaway Roll 2, Occupied, the
    worker's pail, Sam's scribble); the old win whistle is `tada` (a xylophone flourish); the
    gate's ratchet-and-ding and its whoosh (`gate`, `exit`) are ONE light wooden `clack`.
  - GAG WAVE 3 HAS SOUND, each cue on its beat (`GAG_SOUNDS`, with the reasons beside each gag):
    a cue may be delayed (`@0.3`) and pitched by semitones (`squeak^3`); the BONKs land on the
    hits, one squeak a prairie dog rises along the wave, the howl cracks on the squeak beat, the
    downpour starts when the umbrella is closed. What runs on (`GAG_LOOPS`: squelch, pats,
    rustle, rumble, rain, downpour) is its file played again before the last has died away, and
    stopping it FADES what is still sounding (`repeatOff`).
  - THE MIX (`VOLUME`): gag sounds sit under the truck's bump and the win; what runs on (rain,
    rumble, rustle, the shimmer) lies lowest.
  - LAZY (`LAZY_KEYS`, `CORE_KEYS`): the 19 sounds only wave 3 uses are NOT fetched with the
    rest when Sound effects goes on; a level fetches its own gags' sounds as it opens
    (`sound.warm`, `gagKeys`). Sound stays off by default.
  - `npm run test:e2e:gagsounds` plays ALL 26 gags through `?gag=` with sound on in WebKit at
    iPhone DPR 3: cues fire, files are loaded, sound really goes out and never clips (a meter on
    the output under `?audiolog`: `__rhrAudio.peak()`), the new cues land on their beats, the
    lazy loading holds. NOBODY HAS LISTENED in these tests: the levels are measured, not heard.
  - The bear's business uses the magpie's dropping sound (`bear.relief`: `splat`, then `puff`).
- THE BUTTONS' CLICK (Jay, Oct 6): EVERY button tap plays ONE sound, `click`, the same everywhere
  (menus, Settings, Undo, Hint, Restart, region tabs, level rows, the log and its cards, the win
  card, Back and Close): a soft wooden toy click, 60 ms (`ui_click` in `tools/sound-picks.py`,
  exported to `tools/sfx-art/click.wav`), a notch under the truck's own sounds in the mix
  (`VOLUME.click`; a unit test holds it under drag, clack and bump). The old soap-bubble `back`
  pop is gone, file and code; `tap` (the pop) is kept only for the win card's hard hats and three
  gags. One listener in `engine.ts` `install`: a touch that lifts on the button it landed on
  (`BUTTONS`), within `TAP_SLOP` 10 px (a swipe of the region bar is silent), NEVER anything on
  the lease (`NOT_BUTTONS` `.board`: a truck drag has its own sounds). It respects the Sound
  effects switch like every cue.
- HAPTICS (`src/audio/haptics.ts`): one light tick on every button tap and on each truck's exit
  (`sound.exit`). THEY FOLLOW THE SOUND EFFECTS SWITCH (no toggle of their own), so they are off
  by default. Android: `navigator.vibrate(TICK_MS)` (8 ms). iPhone: Safari has no vibration, so
  the iOS 18 workaround: ONE hidden `<input type="checkbox" switch>` in a label
  (`label.haptic-switch`: in the page, unseen, never touchable) whose label is clicked. WHETHER
  AN IPHONE REALLY TICKS CANNOT BE TESTED BY A SCRIPT: Jay tries it in Safari and as the
  home-screen app; if it is not dependable, delete `iosTick` and leave the iPhone without.
  `?haptics=0` turns them off; `?hapticlog` records ticks in `window.__rhrHaptics`.
  `npm run test:e2e:click` (Chromium as a Pixel 7, WebKit as an iPhone 13) checks every kind of
  button, the click's length, no click on a drag, a tick per exit, and silence with the switch off.
- Test hook: `?audiolog` exposes `window.__rhrAudio` (its `log` lists cues as they fire and files as
  they load; `musicState()`, `loopRunning(name)`). `npm run test:e2e:audio` checks the lazy loading,
  every cue, gag sounds, the styles, and that every loop file decodes (Chromium and WebKit) to
  exactly its loop's length with a clean seam. Nobody has LISTENED in these tests: the mix and the
  crossfades want an ear check on a phone.

## Wildlife Log
- THE WORD IS "SIGHTING" (Jay, Oct 6): never "Easter egg" or "egg" in anything the player reads
  (the dinosaur egg in the dig is a real egg). The log's footer: "Sightings. Find all N to unlock
  camo pickups.", N being the real number of entries.
- `src/ui/wildlife-log.ts` (pure + storage, tested): `LOG_ENTRIES`, one per gag in the game plus Night Shift (28: the four Mannville gags and the four Bakken gags of wave 3 come after Tourists, and Dug Through, which is not a gag, comes before the Bear;
  Magpie, Sleepy Worker, Moose, Near Miss, Angry Landowner, Occupied, The Runaway Roll,
  Marshmallow, Lost Goose, Porcupine, Gopher Lunch, Safety Sam, Frozen Tongue, Surveyor, Back
  Scratcher, Tourists, Night Shift, Bull and Cow, Bear),
  each with a caption and a hint. No entries for gags that are gone (the pumper, the old hot shot
  and gopher); their ids are dropped from a saved log on load. An entry unlocks the first time its
  gag plays right through (`GameView.seen`; the worker counts once he is asleep). Saved in
  `rush-hour-rigs:log` (`v: 3`), so Reset progress clears it.
- HINTS are plain and short and say where and what to do ("In Cardium, tap the bush three
  times."); never "may" and never odds (Job Y: an unfound sighting always comes). No em dashes. A test holds them to it.
- NIGHT SHIFT (`night`): not a gag. Found when the lease has gone fully dark (the idle fade has
  finished: `GameView.nightSeen`, once a visit; not when night is pinned with `?night=1`). Same
  toast and card as a gag. Its art is `nightStill()` (night.ts): the pad at night, the flare glowing.
- Every card's art is a still of the gag's own PUPPET (`LOG_ART` in main.ts: `magpieStill`,
  `workerStill`, `mooseStill`, `nearMissStill`, ...). No sprites. Found: in colour with its caption;
  unfound: a dark silhouette (CSS brightness(0)) and a RIDDLE (`LogEntry.riddle`: a nudge that
  points the way without giving it away); a tap turns the card over to the plain hint and back
  (`.log-card.riddle` / `.plain`, `cardHint(e, plain)`); DEMO mode shows the plain hint at once.
  EVERY STILL IS CUT TO ITS CARD: `.log-card .art` is `overflow: hidden`, and a wave 3 still is
  cut at its own view (`.wave3-still`), which must hold whole figures. NO STRETCH: `fitArt` (main.ts) gives every card's
  picture a px width and height from its own viewBox, inside `ART_BOX` (104 x 84), so a tall
  drawing (the biffy) is never squeezed. Occupied is the biffy at its true shape; The Runaway Roll
  is one big toilet roll with a short tail of paper (`biffyBStill`, drawn for the card). The
  moose's still is cut off at its picture's edge (his neck runs on below it).
- New sighting: a toast at the very top (`toast.ts`, 2s, one at a time, never over the board):
  "New sighting! Bear (3/15)". The last one adds a celebration toast and turns on camo pickups.
- Camo is earned (`camoEarned`) by finding every entry; camo earned under an earlier, shorter log is
  kept. Camo pickups: `.v-camo` blotches in the pickup SVG over the truck's own paint, shown by
  `body.camo-pickups`. On once earned; switch in Settings (locked until then).
- THE DIG (Log v2, Jay Oct 6; `src/ui/log-dig.ts` pure and tested, `log-dig-view.ts` on the page,
  styles under "The dig"): the log is a deep dig. Behind the cards lies ONE continuous
  cross-section drawn in code (`strataSvg`, one static SVG, seeded, no filters or gradients):
  ONE REAL WELL COLUMN, west-central Alberta near Fox Creek (Jay, Oct 6; `FORMATIONS`, top down,
  each with the real depth at its foot, `km`): grass, topsoil, glacial till, Wapiti Fm,
  Puskwaskau marine shale, Cardium Fm sandstone, Colorado Group shale, Mannville Group (coal
  seams), Fernie Fm, Montney Fm, Belloy / Debolt carbonates, Exshaw Fm (pill "Exshaw (Alberta
  Bakken)"), Wabamun Group, Ireton shale, Duvernay shale wrapped round a LEDUC REEF (the
  glistening oil reservoir, `reef`), Beaverhill Lake, Elk Point Group with salt, Cambrian
  sandstone; then the Precambrian crystalline basement (the first deep layer, Log v3). Region
  pills: Cardium, Mannville, Montney, Exshaw (region `bakken`) and Duvernay. The cards stand in groups
  of four (`GROUP`); after each of the first six groups (`BETWEEN`) a WINDOW (`.dig-window`) opens on the formation at that depth,
  and below the last card the section keeps going down through the rest (and on through the Earth: Log v3 below). A
  wellbore runs from a wellhead on the grass, down the gutter between the two columns of cards,
  into the reservoir. `mountDig` measures where each window ends and draws the layers to match
  (again whenever the column changes size). Each formation has a pill (`.dig-pill`); a region's
  pill is greyed (`.locked`, `pillLocked`) until that region is unlocked.
  BURIED THINGS (`BURIED`, 15; NOT log entries: no count, no toast, nothing saved): car keys, TV
  remote, one sock, golf ball, the gopher's den with the crust on a plate, a dropped phone in his
  tunnel (topsoil; a framed gopher family portrait hangs on the den's wall); pirate chest, mammoth tusk, vintage silver plane (till); dinosaur egg and
  skeleton (Wapiti); ammonite (Puskwaskau marine shale); plesiosaur (Cardium); the lost drill bit and fishing
  tool (Exshaw); trilobite (Cambrian). A find lies in rock of its own age: keep it so. Each is a button of at least 44 px in its own half of its
  window, clear of the wellbore and the pill (unit-tested at 375, 390 and 430). A tap wiggles it
  and shows its ONE line (`BURIED_LINES` in lines.ts, 40 characters at most) in `.dig-bubble`
  above it, one bubble at a time; the egg cracks, one eye peeks and blinks, and it closes
  (`.peek`). ONLY small elements ever animate here (the tapped thing, the bubble, `.oil-glint`
  opacity): never the strata, so scrolling stays at 60 fps. Reduced motion: nothing moves.
  `npm run test:e2e:dig` checks it in WebKit (pixels of the margin at every depth included) and the
  frame rate in Chromium at 4x throttle, 390 and 375 wide. The lines are Jay's own (Oct 6). The oil pool itself is a
  tap target too (`.dig-oil`): it says `BURIED_LINES.reservoir`.
- LOG v3, "DUG THROUGH" (Jay, Oct 6, revised the same day; `src/ui/log-deep.ts` pure and tested,
  `dig-finds.ts` data, put on the page by `log-dig-view.ts`): below the reef the player can keep
  scrolling through the whole Earth and out at Alberta's opposite point, like the long dig in
  Plants vs Zombies.
  - LENGTH IS ONE SETTING: `DIG` (`screens` 60 phone screens of `screenPx` 844: about 51,000 px of
    dirt; the log is about 55,000 px tall). `PLAN` gives each layer its share: basement granite,
    mantle, outer core, inner core (the CENTRE OF THE EARTH is the dashed line across its middle),
    then mirrored back up: outer core, mantle, ocean crust, seafloor, the Southern Ocean (ten screens deep); then the
    surface at the Kerguelen Islands (`SURFACE_PX`, one picture, `kerguelenSvg`). THE FAR SIDE IS
    UPSIDE DOWN (we come up underneath it; the penguin says "You're upside down." and the seal "No, YOU are.", `KERGUELEN_SAYS`, in bubbles drawn the right way up for us): the seabed is above the sea, the island hangs from
    the waterline with a king penguin and an elephant seal on it, sky and clouds below.
  - THE DIRT IS PROCEDURAL AND ONLY NEAR THE SCREEN: each layer is a block in its own slowly
    changing colour (`layerBackground`, one long CSS gradient: the only gradient in the dig); its
    texture is `tileSvg(layer, k, width)`, one seeded tile of `DIG.tile` px at a time (always the
    same tile, no two alike, no background, under 130 shapes; the mirrored layers draw their
    twin's tiles in reverse, turned over). `showTiles` (on scroll) keeps only the tiles within a
    screen of what shows (`tilesNear`): never more than about 8 on the page. Mantle and outer
    core tiles carry one `.deep-glow` light (opacity only).
  - FINDS (`dig-finds.ts`, a data file for Jay): `DIG_FINDS`, SEVENTEEN, tapped like buried things
    (wiggle, one line from `BURIED_LINES`; drawings in `FIND_ART`): a gold nugget in a quartz vein,
    a lost hard hat and a wooden core box (the basement); a toasted marshmallow on a stick (upper
    mantle), a frozen burrito, a diamond and the magpie's stolen spoon (mantle); the sleepy
    worker's pail and the lost lunchbox dead on the centre (inner core); a compass whose needle
    spins (`.find-spin`; outer core, on the way back up); a mole in a headlamp and a rubber duck
    (mantle, on the way back up); a black smoker with tube worms and a message in a bottle (the
    seafloor); a whale, a giant squid and a sunk pickup (the ocean; the far side is upside down).
    Each is placed by `screen` (phone screens below the reservoir). THE RHYTHM (Jay, Oct 6): A
    FIND every 3 to 4 screens, EMPTY SLOTS NOT COUNTED, slightly uneven, never two on one screen,
    and NOTHING in the last `QUIET_SCREENS` (5) before the island. THE LAYERS ARE CUT TO FIT IT
    (`PLAN`, in tiles, 120 = 60 screens): 9.5 screens of basement for its three finds, 5 of
    seafloor for its two, the mantle shorter on the way back up than on the way down (its tiles
    are the twin's, mirrored from the twin's foot). `DIG_SLOTS`: 4 EMPTY marked slots for future
    gag finds (keep at least 3), each a screen and a half or more from the finds beside it. A find
    gives a tiny wiggle by itself as it slides into view (`.glance`; not with reduced motion).
  - DEPTH PILL (`.dig-gauge`, a sticky rail in the column, the pill on the right): real km at a
    line that moves from the screen's top (page top) to its foot (page end) as the page scrolls
    (`gaugeLine`), read off marks at every layer's end (`marksFrom`, `depthKm`; `UPPER_KM` for the
    upper formations): 0 at the grass, 6,371 at the centre, 12,742 at the island (`kmText`).
  - DUG THROUGH is a HIDDEN log entry (`hidden: true`; `shownEntries`): no card at all until it
    is earned, though the count reads x/28 and it counts toward the camo like any entry (when
    every card is found but it, the log's closing line says one sighting is hidden). A stopwatch
    (`.dig-clock`, under the depth) starts on the first scroll down past the grass; SWIPES are
    counted from then (a finger put down on the page, or a burst of the mouse wheel). Reaching
    the end of the page stops it: `arrived` (main.ts) calls `recordDig`, which finds the entry and
    keeps the BESTS in the log (`dug` ms, `dugSwipes`: the shortest time and the fewest swipes,
    each on its own; the demo log has its own), and the ARRIVAL CARD (`.dig-arrival`, in the far
    side's sky) leads with "New sighting!" / "Dug Through added to your Wildlife Log." the first
    time, then "n swipes in m:ss.t", then the bests, in a burst of hard-hat confetti
    (`confetti.ts` `confettiBurst`, shared with the win card; again whenever a best is beaten). Back at the very top the stopwatch is
    ready again. Its log card (once earned) reads "Best: n swipes, m:ss.t".
- CAMO PICKUPS keep their gate colour (Log v2): the reward is the pickup's own sprite in camo,
  `pickup-<colour>-camo(@2x).webp`, blotches of a deep shade and a pale tint of ITS OWN gate colour
  baked by `tools/truck-sprites.py` (`camo`, `CAMO_DARK` / `CAMO_LIGHT`), measured into
  `truck-sprites.json` (`camo`) and held to the same tests as plain trucks (reads as its gate
  colour, colours stay apart, stands out from every pad). `spriteSrc` picks it while
  `body.camo-pickups` is on; `dressCamo` swaps pickups already on the page. (The old blotches lived
  on the hidden SVG fallback and never showed on the sprites.)
- The Bear's entry is `legendary`: gold frame and LEGENDARY tag on its card, found or not.
- Demo log: with demo mode on, sightings are saved to `rush-hour-rigs:demo-log` instead, toasts say
  "Demo sighting!", and the log page shows the demo log (DEMO tag). It never counts toward the real
  log or camo. Demo off shows the real log again (the demo log is kept); Reset clears both.
- `?log=all` previews a full log and camo without changing the saved log.
  `npm run test:e2e:log` tests it all, on the puppet gags.

## Daily Pad (M3)
- 60 pre-generated medium pads in `src/levels/daily.json` (generated like the regions; par 6-8, 5-6
  trucks, 1-2 obstacles). Pad #1 is 2026-09-30 (`DAILY_EPOCH` in `src/ui/daily.ts`); the pad is
  picked by the phone's local date and wraps after 60. Odd pads use summer, even pads spring mud.
- Streak "DAYS WITHOUT INCIDENT" = Daily Pads cleared in an unbroken run. Today doesn't break it
  until the day is over. One Safety Stand-Down per Monday-Sunday week covers a missed day
  automatically (only if there's an earlier cleared day to bridge to). Logic in `streak()`. The
  sign shows only the count: no stand-down line. When a stand-down saves a streak the home page
  shows a toast once, "Safety Stand-Down saved your streak." (`newlySaved`, `progress.standDowns`).
- Near misses = bumps this attempt (reset on Restart, not on Undo). ZERO INCIDENT = at par, no bumps.
- Share (Daily win screen) copies spoiler-free text: pad, hats, moves vs par, badge, streak, link.
- All progress is in localStorage (`rush-hour-rigs:v2`); no accounts.
- PWA: `public/manifest.webmanifest`, icons in `public/icons/` (Jay's chosen art, `tools/icon-art/roughneck_close.png`: the roughneck's face and white hard hat; made by `python3 tools/app-icons.py`; the maskable one is padded with the cover's sky; file names carry a version, `v2`, because phones cache icons hard: bump it for a new look; the favicon is the 48 px PNG, there is no favicon.svg), and a
  service worker generated at build time by the plugin in `vite.config.ts`
  (`tools/service-worker.ts`). It precaches every built file; pages load network-first. The cache's name carries a hash of the
  built files (a new build replaces the old by itself) and `CACHE_GENERATION` (bump it to make
  every phone drop its cache). Not
  registered in dev.

## Playthrough quick wins (Job R, Oct 6)
- SETTINGS: a hidden step stays hidden because the rule that lays the steps out is
  `.settings .step:not(.confirm):not([hidden])` (Credits used to show on every visit). The whole
  panel, down to the version line, is on a 390x844 screen without scrolling (8 px between rows; the
  feedback row is compact): keep it so when adding a row. A small "Music style" label
  (`.styles-label`) sits over the three style buttons.
- `sceneGeom` / `skyGeom` (scene-stage.ts) return a plain view that does not fit when the screen is
  not laid out yet (0 wide, or a strip nobody measured), and `place` never writes a viewBox that
  is not finite: NO NaN viewBox, a clean console on all 50 levels.
- A FIELD'S LAST LEVEL (`nextField` in unlocks.ts, `GameViewHandlers.onNextField`): the win card's
  primary button is "Next field: <name>" (it opens that field's level list) when the next region
  is open; if it is not, the card says "Clear N more in <region> to open <next>"; after the last
  region, the old "That was the last level in this field."
- THE HOW-TO closes with Escape and with a tap on its dimmed backdrop (never one on its card).
- REGION TABS: where every tab fits side by side at full size (`allFit`, `TAB_MIN` 96 px: a
  desktop window, five tabs in the 528 px bar) they are all shown and nothing swipes
  (`.regions.all-fit`); on phones the bar stays the swipeable strip.
- "TAP FOR SOUND" (`src/audio/sound-nudge.ts`, `GameView.soundNudge`): one small chip in the top
  corner of the FIRST win card of a player whose sound is all off (never in the card's column); a
  tap turns effects and music on. Offered once per phone (`rush-hour-rigs-sound-nudge`). Automated
  browsers skip it unless `?soundnudge=1`; `?soundnudge=0` never.
- The Hint button's count reads up to 9, then "9+" (`hintCountText`).
- `npm run test:e2e:quick` checks all of the above (start the dev server first).

## Final-pass fixes (Job U, Oct 6)
- THE TIP LINE KEEPS ITS ROOM FOR THE WHOLE LEVEL (`GameView.showLevelHint` pins the note's
  `min-height` to the tip's own height). A two-line tip used to give a line back when it went on
  the first move and the lease re-centred a moment later, so a gag set off by that same drag (a
  bump for the bale, the tumbleweed, the tourists) was placed for the old layout and played its
  whole run about 21 px too high. NOTHING MAY SHIFT THE LEASE WHILE A LEVEL IS PLAYED.
  `test:e2e:wave3` checks a really-triggered gag is drawn in the scenery's own box.
- THE UPDATE BAR HAS ITS OWN ROOM: while it shows, `--bar-room` (66 px) is added to the top
  padding of every screen it shows over and of any overlay open there (and toasts drop below it),
  so it never lies over the header's buttons. Never give it a z-index fight instead.
- THE SERVICE WORKER (`tools/service-worker.ts`): every path comes from its own scope
  (`self.registration.scope`), so it serves the site at `/` and under `/rig-jam/` alike;
  main.ts registers `sw.js` beside the page with that scope. ITS INSTALL CANNOT BE SUNK BY ONE BAD
  FETCH: the core (the page, its script, its styles) first, then the rest `PRECACHE_BATCH` at a
  time, each file tried `PRECACHE_TRIES` times; what still will not come is cached when the game
  first asks for it. (It used to `addAll` two hundred files at once: one 503 and the worker never
  installed.) Only a good page is kept as the offline copy. `npm run test:e2e:offline` builds the
  site, serves it under the Pages base path, turns requests away, cuts the network and plays.
- REGION BAR: where the next tab is cut off the right edge fades out (46 px) under a small
  chevron (`.regions-more`): "more this way". Gone at the bar's end and where all tabs fit.
- THE DIG COUNTS SWIPES HONESTLY (`SwipeCount`, log-deep.ts): a gesture is a swipe only once it
  has moved the page a quarter of a screen (`SWIPE_SHARE`), its fling included; taps never count.
- SURVEYOR: NOTHING DRAWS BEFORE HE WALKS IN. Folded, the tripod is COLLAPSED (`TRI_SHORT`: its
  legs half length) and carried against his belly, leaning back a little, so it never leads him
  onto the screen and never covers his face; set down, it spreads its legs and runs them out
  together and the instrument rises. Both his drawing and the standing tripod start hidden.
- The Wildlife Log's one LEGENDARY card is the Bear (tested, found and unfound).

## Big Pad spike (region 6; built on branch `big-pad`, merged to main and shipped Oct 8)
- THE QUESTION: can we generate 8 x 8 levels that play hard? Hardness = EXTRA MOVES, par minus the
  number of trucks (the moves that are not a truck's own drive out). Answer: yes. No UI, art or
  sightings for it; the game still only shows pads of 6.
- PAD SIZE (`src/engine/types.ts`): `SIZE` is still 6; a level may carry `size: 8` (`SIZES`,
  `sizeOf(level)`; no level file of the game names a size). `parseLevel`, `getMoveRange`,
  `slideEnd`, `touchesGate(t, side, size)` and both solvers work along the level's own side.
  `size.test.ts`. The UI still imports `SIZE` and draws 6.
- THE SOLVER HAS A* (`searchAStar`, `solveAStar` in solver.ts): the same rules as `solve` (both
  search through one `compile(level, trucks).expand`), looking first where the end seems nearest.
  A position reached again by a shorter way is looked at again, so the answer is the shortest for
  any estimate that never overshoots. Estimates (`Heuristic`): `'left'` = trucks left;
  `'rings'` (the default) = that plus one for every RING of trucks in each other's way out that
  shares no truck with another ring (none of a ring can be first out, so one of them makes a move
  that is not its drive out), or one for every tanker not yet loaded, whichever is more.
  `solver-astar.test.ts` holds BOTH to breadth-first's par on every level in the game (50 + 60
  Daily Pads), mid-game too, and on random pads of 6 and of 8. `solve` hands a pad of 18 trucks or
  more to A* (its packed number holds 17). `node tools/bench-astar.ts` compares them.
  TRIED AND DROPPED: per-group tables (each small group of trucks solved alone, added up). They
  were sound and matched every par, but on a pad of 8 a few trucks alone always have room, so the
  tables said nothing the rings did not, and A* looked at exactly as many positions.
- `tools/gen-bigpad.ts` (`node tools/gen-bigpad.ts [minutes <= 10] [seed] [workers]`): REVERSE
  GENERATION. A PINWHEEL is laid down on purpose (four trucks round a box, each in the next one's
  way out: `pinwheel`; one horizontal and one vertical truck can never each be in the other's way
  out, the cell where their lanes cross would have to hold both, so a ring of four is the smallest
  knot), TAILS are hung on it (`tail`, 1 to 3: the chain 3 to 5 deep beyond the ring), every other
  truck starts AT ITS GATE END, and the pad is scrambled with BACKWARD MOVES (one truck slid along
  its lane), kept if the forward par (A*) did not fall. WHAT THE SPIKE FOUND: slides alone stall
  (hundreds of thousands of slides of one layout never passed 4 extra moves: on a pad of 8
  everybody has room to step aside), so now and then ONE TRUCK IS RE-DEALT (another lane, turned
  to leave by the other end, a cell longer or shorter), kept by the same rule. Each pad climbs to
  its own target inside 6 to 15 extra moves. The whole run keeps inside its minutes (78% scramble,
  the rest proves the candidates). Six gate colours are dealt to the lane ends (the two ends of a
  lane never the same), so with 14 to 18 trucks COLOURS REPEAT: a UI question for later.
- `levels/bigpad-candidates.json`: the best 20 by extra moves (id, size, par, trucks, extraMoves,
  chain, rings, wonBy, parAlsoBy, solveMs, lookedAt, hintPath, level). `node
  --max-old-space-size=8000 tools/check-bigpad.ts` proves each again (A* both ways, the hint path
  in the game itself, breadth-first where it gets through 12 million positions) and reprints the
  table. `tools/gen-bigpad.test.ts` holds the file to the targets.

## Clearwater, region 6: the Big Pad you can play (merged to main and shipped Oct 8)
- `src/levels/clearwater.json`: TEN LEVELS OF 8 x 8 (`size: 8`), trucks and gates only, after Bakken
  in `REGIONS` (opens after 5 of Bakken like the others; demo mode opens it). Jay's names, in
  order: Rig Mats, Rig Move, Set Surface, Walking Rig, Batch Drilling, Sim Ops, Plug and Perf, Drill
  Out, Sand Haul, Road Ban. Ids `w01` to `w10`. Trucks 14, 14, 15, 15, 15, 15, 15, 15, 15, 16 (16
  at most: Jay); par 20, 21, 23, 24, 25, 26, 27, 28, 29, 30; EXTRA MOVES 6, 7, 8, 9, 10, 11, 12,
  13, 14, 14 (levels 1 to 3: 6 to 8; 4 to 6: 9 to 11; 7 to 10: 12 to 15). NEVER HAND-EDIT: `node
  tools/pick-clearwater.ts` writes it from `levels/bigpad-candidates.json` (`PICKS`: which
  candidate is which level), proving each again and dealing the truck kinds from a fixed seed.
- SIX COLOURS AND THEIR SYMBOLS, REPEATED (Jay): with 14 to 16 trucks a colour is on two or three
  trucks, each with its own gate of that colour at an end of its own lane (the two ends of a lane
  are never the same colour).
- MORE CANDIDATES: `gen-bigpad.ts` takes a batch's own targets and adds it to the file
  (`--trucks=12-15 --extra=6-10 --keep=10 --append`: spread evenly across its range). The file now
  holds 36: the first 20, the easier 10, and 6 of 15 to 16 trucks at 11 to 14 extra moves (made so
  the ramp can end on its hardest pads without the truck count dropping).
- A PAD OF 8 IS SOLVED BY A* (`solve` hands it over: breadth-first would look at millions of
  positions), so Hint works there. On a laptop the worst of the ten takes about half a second from
  its start; ON A PHONE THE FIRST HINT OF A LATE LEVEL MAY TAKE A SECOND OR TWO (not measured on
  one yet).
- THE BOARD DRAWS ITS LEVEL'S OWN SIZE (`BoardView.size` from `sizeOf(level)`; the board wears
  `.big-pad`): the pad, gates, berm (`BermGeometry.size`), ground (`Detail.size`), tire tracks
  (`TrackLayer.setSize`, `setPadSize`), exits (`exitPlan(..., size)`) and bumps all work in cells
  of it. On a Big Pad the berm band is thinner (`BIG_FENCE_RATIO` 0.34) and the stage runs to 3 px
  from the screen's sides (`.screen.game.big-pad .stage`), so A CELL IS 44 PX AT 390 WIDE (42 at
  375). Trucks, symbols and tags are sized in cells and follow. Still 6 only: equipment
  (`obstacles.ts`), the magpie's truck pick, the moose's column: nothing of theirs is on a Big Pad.
- CLEARWATER'S LOOK (Job 3; brief: `~/Desktop/RHR Art Inbox/BIG_PAD_BRIEF.md`): theme `boreal`
  (themes.ts: pale packed sand for the pad, lichen ground `grass-boreal.webp` from
  `tools/ground-tiles.py` `boreal_lichen`, gold aspen among spruce, season `fall`) and a SANDY
  BERM (`Theme.berm: 'sand'`, berm.ts `SAND_BERM`). No night there (not on the night's list), no
  pill in the dig yet.
- THE STANDARD CLEARWATER SCENE (`ClearProp`, scene-stage.ts; every Clearwater level; the generic
  scenery puts no trees below the board there), from `clearwater_sightings_reference.html`
  (`bgClear`; saved Oct 7 19:26). Its strip is its own (`CW_SCENE`: see below, "a quarter bigger"). Three layers, none takes a touch: `.clear-ground` (under
  everything in the strip, the biffy and sign too: lichen bands, the SANDY TWO-TRACK run on to both
  screen edges, the MUD PUDDLE, tufts), `.clear-layer` (behind the walking lane: four spruce and
  the GOLD ASPEN in the board's own drawings, `CW_TREES`, `CW_ASPEN`; FIREWEED and RED FALL
  BLUEBERRY BUSHES in the reference's drawings) and `.clear-mats` (the RIG MAT STACK, end view,
  three by three, at the lane's right end). MOVED FROM THE REFERENCE, each for a rule: the mat
  stack's foot is 4 units further back (`MATS_FOOT` GY-2: by the depth rule it is clearly behind
  the lane, so everybody passes in front of it, drawn as the reference draws them); the left group
  of trees stands 44 further right (clear of the biffy); the aspen is 96 tall, not 118 (its crown
  would run up over the berm; its trunk, where the ball pings, is where it was); the spruce
  at x 290 stands at 306 and the second fireweed at 352 (nobody parks on a prop: the cook rings
  at 286, Moe stands at 250 to 276); the lease sign stands at world x 330 (`CW_SIGN_AT`,
  `ClearProp.signX`), over the mats, clear of the action.
- THE GOLF PAIR (wave3.ts `WAVE3.golf`, `WAVE3.cold`: the reference's `render` as written, with the
  game's `E`; the worker drawing is now that reference's, which adds a beard, stubble, dizzy eyes,
  a toque and an apron and changes nothing an older gag uses). SLOW MOE (orange, stubble, droopy
  lids, hat tipped back: `MOE`) and the BEARDED WORKER (red, beard: `BEARD`); the shovel; the ball.
  THREE SWINGS: Moe tees up, misses twice, digs the third (BOING), the ball rolls off by itself,
  he pockets it and stomps off the way he came. OUT COLD: one mighty swing, TOK off the rig mats,
  PING off the aspen (the scenery's own aspen shivers: `ClearProp.aspen`, `sceneDef` `frame`),
  BONK on his hard hat, timber; the bearded worker strolls in, "Fore." (the game's own bubble,
  `FORE_LINE`), pockets the ball and drags Moe off by the ankles (his hands stay on them).
  A STACKED PAIR ON ONE TRIGGER (`GAG_TRIGGERS.golf` / `.cold`): three taps on the mat stack
  (`ClearProp.hitMats`; other taps give it a small knock) play Three Swings; once that is in the
  Wildlife Log (`swings`) the same taps play Out Cold. Each once a level. `?gag=golf|cold`.
  On a strip too short for the scene (under about 56 px) it is drawn and the gags do not play (`SCENE_MIN`).
- THE OTHER THREE (same reference, same port). A Clearwater gag may draw on THREE LANES, each a
  layer on its own ground line (`sceneDef`: `back`/`backY` behind the rig mat stack, `render` on
  the walking lane, `front`/`frontY` between us and the lane), and may say SEVERAL LINES in the
  game's own bubble (`lines`, each with its speaker's `mouth`; texts in lines.ts).
  FRESH WASH (`WAVE3.wash`; one tap on the mud puddle, `ClearProp.hitPuddle`): Moe parks his
  pickup, gets out ON THE FAR SIDE (VEHICLE RULE: trucks face right, the driver's door is out of
  sight, no near door ever opens: a clunk and a small rock of the cab), walks round the front,
  wipes the last smudge off the hood, admires it; a water hauler crosses in the FRONT lane and
  hides the splash; he and the truck are mud; a blob slides off his hat; he trudges back, wipes a
  peephole and drives off. DINNER BELL (`WAVE3.bell`): the camp cook rings his triangle,
  "Supper!", four workers stampede past (two behind the rig mats, two in front), he spins in the
  dust, straightens his toque and follows; then Slow Moe, late, "Save me some!". ONE PEA
  (`WAVE3.pea`): the crew strolls back with heaped plates, Moe behind with one pea; the bearded
  worker: "Watching your carbs, Moe?"; the pea rolls off his plate, across the sand and into the
  puddle. THE SECOND STACKED PAIR (`GAG_TRIGGERS.bell` / `.pea`): FIVE TRUCKS DRIVEN OUT IN A ROW
  (move after move, each one a truck leaving; any other move or an Undo starts the count again:
  `GameView.exitRun`) play Dinner Bell; once that is in the log, One Pea. (Every Clearwater level's
  solution ends with a run of at least nine.) `?gag=wash|bell|pea`.
- CLEARWATER'S CHARACTERS ARE A QUARTER BIGGER, AND THE BIG PAD'S STRIP COMES FIRST (Jay, Oct 8, on
  his iPhone in Safari: they were tiny). Two things, and nothing is scaled by hand:
  (1) THE SCENE IS TIGHTER THAN THE REFERENCE'S: `CW_SCENE` runs from y 47 to y 170 (123 units,
  where the reference's strip is 154), so the same strip shows everything 25% bigger. The empty
  band under the lane went first: the mud puddle lies on the two-track's own near rut (`PUD.y`
  162, not 175) and the water hauler drives at `FRONT_Y` GY+16 (not GY+28). Then the top: the
  aspen is 84 tall and the last spruce 66, just inside the strip. The mud wave is cut off at the
  strip's floor (`cwFloor`), as the reference's is at the foot of its own picture.
  (2) THE LEASE MOVES UP FOR THE STRIP (`GameView.liftPad`, `clearStripWanted`; every region since, see "Every sighting plays in Safari"): on a Big Pad
  the spare height goes to the bottom strip until its scene stands at full size, leaving at
  least `SKY_LEAST` (6 px) of sky under the HUD; never down. In Safari with its toolbars showing
  (390 x 664) the strip was 55 px, too short for the gags at all; it is 72 to 85 px now and they
  play. The lease stays inside the stage: nothing covers the HUD, the tip line or the buttons
  (`test:e2e:clearwater-gags` holds every gag through its run at 390 x 844, 375 x 812, 390 x 664
  and 375 x 635 and measures it). `test:e2e:depth` has Safari's two sizes too; `VIEW=390x664 npm
  run test:e2e:frames` checks first and last frames there.
- A BIG PAD BUILDS ONLY ITS OWN GAGS AND THE BIFFY'S TWO (`BIG_PAD_GAGS`: the five, Occupied and The
  Runaway Roll on their usual bumps into the bottom berm): the other older ones are drawn for a pad
  of 6 and are not made there. NO LEASE SIGN ON CLEARWATER (Jay, Oct 8: a prop with no sighting is
  a dead prop, and the sign's three visitors have no clear ground among Clearwater's lanes).
- CLEARWATER'S SOUNDS: Jay's five new files (`~/Desktop/RHR Art Inbox/Sound files/clearwater/`,
  his picks in the brief: the B take of whoosh, boing and crack, the A take of triangle and splash; copied to `tools/sfx-art/`): `whoosh` (the two misses), `boing` (the shovel
  bites), `crack` (the one hit), `splash` (the hauler through the puddle), `triangle` (three dings
  0.3 s apart, on the cook's first three strikes). Levelled by `audio-pack.py` like the sound
  pass's (`LEVELLED`), given their places in `VOLUME`, and LAZY (fetched only by a Clearwater
  level). The rest come from the pack: steps, the wooden `knock` (TOK), `bonk`, `twinkle` (stars,
  the ting), the same knock pitched up (PING), `squeak` (the rag), `rumble` (the hauler, the stampede),
  `blup` (plop, plip), `clack` (the door's clunk). 65 effects. NOBODY HAS LISTENED YET.
- Log: `swings` "Three Swings", `cold` "Out Cold", `wash` "Fresh Wash", `bell` "Dinner Bell", `pea`
  "One Pea" after Personal Cloud (33 entries; the first is `swings`, since the dig already has a
  buried `golf` ball). RIDDLES AND PLAIN HINTS ARE JAY'S OWN, word for word (the brief's table,
  Oct 7 20:22). Witness lines: Jay's own (Oct 8).
- `npm run test:e2e:clearwater-gags` (WebKit at DPR 3, 390 x 844 and 375 x 812): the scene on all
  ten levels, all five on their real triggers (beats in order, the lines said, the aspen, the log,
  the strip's pixels the same before and after, an Undo breaking the run of five), the short strip. `test:e2e:depth` and
  `test:e2e:frames` cover all five. FOR JAY'S EYE: `node tools/qc-beatsheet.mjs <gag> <reference
  id> <reference.html> <folder> [iphone|iphone375]` puts the reference's own drawing of every beat
  beside the game's; `tools/qc-filmstrip.mjs` takes `iphone375` too. Sheets:
  `~/Desktop/RHR Art Inbox/qc/clearwater/`.
- `npm run test:e2e:clearwater` (WebKit at iPhone DPR 3, 390 and 375 wide): the tab and its
  locks, the 8 x 8 board whole on the screen, drag, Undo, Hint, and ALL TEN LEVELS cleared at par
  by dragging; screenshots in `~/Desktop/RHR Art Inbox/qc/clearwater/`.
- THE WORKTREE NEEDS ITS OWN `npm ci` (`~/Rush-Hour-Rigs-bigpad`): with `node_modules` linked to
  the main checkout, Vite refuses the bundled fonts (403: outside its root) and the game shows in
  a fallback font.

## Every sighting plays in Safari, and no dead props (Oct 8)
- THE PROBLEM: in Safari with its toolbars showing (about 390 x 664, 375 x 635) the older regions'
  bottom strip was about 20 to 55 px: under `SCENE_MIN` the Mannville and Bakken gags never
  played, the riser was left out, and the others were tiny.
- THE LEASE MOVES UP FOR THE STRIP ON EVERY LEVEL (`GameView.liftPad`, was `liftBigPad`): the spare
  height of the stage goes to the bottom strip first, until it has what its region wants
  (`stripWanted` for the old strip gags, `sceneStripWanted` for Mannville and Bakken,
  `clearStripWanted` for Clearwater), leaving the sky its `SKY_WANT` for the theme where there is
  room and never less than `SKY_LEAST`. Never down: a tall screen looks as it did. At 390 x 664
  the strip is now about 84 px in the older regions.
- MANNVILLE'S SCENE IS CROPPED TIGHTER (`MANN_SCENE`, top 44): the same strip shows it bigger.
- THE AURORA with little sky: its geometry is measured from the screen's top (the lights run up
  behind the HUD), `AURORA_SKY` is 40, and the moon is kept at least 18 px above the lease.
- THE RISER'S FIT is measured on its DRAWING, not its svg box (the box has about 29 px of empty
  room over the pipe, which left it out of every short strip, and the Frozen Tongue with it).
- MONTNEY ON A SHORT STRIP (`SHORT_STRIP` 130 px): the lease sign stands at `WINTER_SIGN_X`, left
  of the stage, so its visitors are never lost behind the cow.
- A TALL MESSAGE TAKES ITS ROOM AT ONCE (`GameView.note`): the Hint's two-line message used to
  grow the tip line a frame AFTER Gopher Lunch had been placed, and he played 12 px into the
  words. Now the tip line grows there and then, the lease is refitted in the same call, the room
  is kept for the level (never given back), and the lunch is fired after the message is up.
- NO DEAD PROPS: a prop with no tap of its own answers a tap with a small knock (`GameView.knock`,
  `.prop-knock`, `data-knocked`): the biffy, the gopher's mound, the round bale, and the lease
  sign where the deer does not come (winter, or once he has been).
- THE SHORT STRIP AND THE DEPTH RULE: on an 84 px strip the rows collapse, and a 62 px character
  on the walking lane cannot help standing in front of a back-row prop. `test:e2e:depth` holds
  ORDER, ONE LANE, NO TIES and NOT LOST at Safari's sizes in every region; "not parked on a prop"
  is held there for Clearwater only and listed for the rest (`ALLSIZES=1`).
- `npm run test:e2e:sightings` (`e2e/every-sighting.e2e.mjs`; WebKit, DPR 3, `VIEW=390x664` by
  default, `URL=` runs it against the live site): every sighting on its REAL trigger in its own
  region (33 cases), each seen on the screen and never over the pad, the tip line or the buttons;
  then every tappable prop in every region answers a tap, and no other prop stands there.

## Slow Moe everywhere, and the polish pass (Oct 8; STANDING_RULES 11)
- SLOW MOE IS A DRESSING OF THE SAME DRAWINGS, never a second build: `asMoe(drawing)` in worker.ts
  (`MOE_WORKER`: the shared worker's suit colours swapped for `MOE_SUIT` / `MOE_SUIT2`, the beard
  replaced by stubble, a `.droop` half lid under the blinking `.lid`, the hat's drawing turned
  back inside its own `.hat` group so gags still move the group) and `asMoe(p)` in wave3.ts (a
  pose dressed at the moment it is drawn: Moe's suit, stubble, hat, and 'half' eyes where they
  were plain). Every pose, joint and size is the worker's own.
- WHO IS MOE NOW: the sleepy worker, Occupied and The Runaway Roll (the man in the biffy), the
  porcupine's worker (walking and scurrying), Gopher Lunch, the one stuck to the riser in Frozen
  Tongue (his buddy in blue is not), Muskeg Boots, Personal Cloud, and the Clearwater five as
  before. THE MARSHMALLOW WORKER AND THE WIN CARD'S MASCOT STAY RED (Jay, Oct 8: not in trouble); so do
  Safety Sam and the surveyor.
- THE SUITCASE CARRY (Three Swings, Out Cold; wave3.ts `held(k)`, `CARRY`, `carry`): walking in
  and off, Moe's arm hangs with a small swing, his hand round the middle of the shaft, the shovel
  level, blade forward. At tee-up it turns up into the upright `SHOVEL` grip (`teeUp`), and back
  at the hop-turn. BUILT FROM JAY'S WORDS: the reference on the Desktop (saved Oct 7 19:26) has
  no CARRY item in it. If a newer file arrives, port its drawing over `held`.
- BIFFY B (biffy.ts): THE ROLL ROLLS IN FRONT OF THE DOOR. It waits behind the shut door (the
  door's copy on the gag layer), and once the door has swung clear of the doorway (`ROLL_CLEAR`)
  it is stacked over that door for good. THE SHUFFLER IS REDRAWN (`shuffler()`: Slow Moe in true
  side profile, bent forward, near hand on the waistband of the pants bunched at his ankles as
  one dark band, far arm out after the roll, whole face flushed, an O mouth, paper trailing from
  his back boot) on the reference's own skeleton; the porcupine's worker is the same drawing with
  quills and his near hand on his bum (`shuffler(quills, true)`). He dithers in the doorway for a
  moment (`B_DITHER`), then goes in tiny fast steps with a small bob (`SHUFFLE`); slower than
  before, so `B_OFF` 5.5, `B_SHUT` 5.8, `B_END` 6.9.
- ROOT CAUSE FOUND ON THE WAY: on some screens (390 x 664, the live build too) the shuffler's
  layer worked its ground line out a pixel short of the biffy's, so the roll and the shuffler
  played BEHIND the biffy and seemed to come from behind it. The layer now takes the biffy's own
  line (`setGround(over, biffy.layer.dataset.ground, 'set')` in `biffyBDef`).
- THE TWO GAGS AS JAY APPROVED THEM (Oct 8, written into biffy.ts and porcupine.ts by the COO; keep
  them exactly). BIFFY B: the roll (a loose paper end on its rim, a contact shadow; the box only
  moves and the drawing inside turns) is gone by `B_ROLL_OFF` 2.0; a work GLOVE comes out of the
  dark and pats the floor at 1.80, then 2.94 and 3.08 (a `tap` each: `GAG_SOUNDS.biffyB` `reach`,
  `panic`); Moe, at the BIFFY'S scale (`BIFFY_SHUFFLER_FRAC`), comes out of the dark at `B_OUT` 3.5
  in the porcupine's clutch pose and shuffles straight off the near edge (no dither); `B_OFF` 5.6,
  `B_SHUT` 5.9, `B_END` 7.0. Beats: reach, pause, panic, withdraw, out, chase. PORCUPINE: Moe holds
  the roll in his glove; at the poke it goes straight up and straight down onto the hidden
  porcupine; Moe leaves; then the porcupine bolts with the roll on its top quills (`PC_BOLT` 10.2
  reference time = 7.8 gag time, where its `scurry` plays; `PC_END` 9.7). (The notes above this
  on Biffy B's dither, pace and timings are superseded by this.)
- LOG CARDS HAVE NO LOOSE SPECKS (`cardMode` in wave3.ts, set by `wave3Still`): a card's still
  leaves out the sweat drop (Dinner Bell), the ball on the sand and the whistled notes (Out
  Cold) and the dust puffs (Three Swings). Cards of the gags that now star Moe show him.
- `tools/qc-filmstrip.mjs` takes `safari` (WebKit 390 x 664). Before and after sheets of this
  pass: `~/Desktop/RHR Art Inbox/qc/polish/before/` and `after/`.

## Judge-proofing (Oct 8)
- A judge opening the link cold, on a laptop or a phone, gets it in ten seconds. ON A DESKTOP the
  game is the same 560 px column, centred (`#app` `max-width`), the lease the largest square that
  fits; the mouse drags through the same pointer code as a finger (grab cursor). Nothing was
  changed for it: `test:e2e:judge` holds it at 1440 x 900 and 1280 x 720 in both engines.
- A SHORT DESKTOP WINDOW KEEPS ITS BOTTOM STRIP (`deskHeight` in game-view.ts, used by `fit`): at
  1280 x 720 the lease filled the stage's whole height, so there was no strip and none of its
  sightings. With a mouse (`(hover: hover) and (pointer: fine)`) and the column at its desktop
  width (`DESK_WIDTH` 500), the lease is made just small enough to leave `DESK_ROOM` (114 px),
  which `liftPad` shares out between the strip and the sky; never under `DESK_LEAST` (340). At
  1280 x 720 the lease is 434 px over a strip of 68 to 99 px, and the strip's sightings play. A
  taller window (1440 x 900) has that room already and is as it was. A PHONE IS NEVER TOUCHED:
  21 phone screenshots (390 x 664, 375 x 635, 390 x 844; the list and a level of every region)
  were the same pixel for pixel before and after.
- NEVER A WHITE SCREEN (index.html): `#app` starts with `#boot`, a loading page styled inline (the
  game's blue, its name, "Loading…"), which the first screen replaces. If the game's script or
  stylesheet fails to load, or the game throws while starting, or nothing is up after 12 s, it
  says so and shows a Reload button. Nothing of it is left once the game is up.
- `?demo=1`, THE HIDDEN LINK FOR RECORDING VIDEO (`src/ui/demo-link.ts`, the FIRST import of
  main.ts): for that page load every region and level is open (`loadProgress().demo` is true),
  the Wildlife Log is shown complete with no DEMO label (`loadLog`; camo is not handed out, the
  trucks keep their paint), and NOTHING IS SAVED: `keepInMemory` lays a copy in memory over
  `localStorage`, so every write (scores, hints, the log, settings, the region) lasts for the
  page and never reaches the phone. No button or label names it. It is not Settings' own "demo
  mode" switch, which is saved and has its own demo log.
- CREDIT: Settings ends with "Built by Jay Dagenais, directing AI (Claude)" (`.app-credit`) over
  the version line. The panel still fits 390 x 844 without scrolling.
- SHARE: its button says "Copied! Paste it anywhere." (Jay, Oct 8). The Daily Pad's result is copied exactly and pastes as five
  plain lines, the link last (read back from the clipboard and pasted into a text box in
  Chrome's engine, desktop and phone; Safari's engine lets no script read the clipboard, so
  there only the button's "Copied!" is checked).
- `npm run test:e2e:judge` checks all of it and saves screenshots of every step at both desktop
  sizes in both engines to `~/Desktop/RHR Art Inbox/qc/judge/` (`OUT=` another folder).

## The dev lane (October upgrade, job U1; Oct 9)
- TWO SITES, ONE WEB ORIGIN: the live game https://jasondag-ai.github.io/rig-jam/ (repo `rig-jam`,
  branch `main`) and the dev copy https://jasondag-ai.github.io/rig-jam-next/ (repo `rig-jam-next`,
  whose main is this repo's branch `next`). The same Action builds both; `base: './'` serves either
  path. `sh tools/push-dev.sh` (from `~/Rig-Jam-next`, branch `next` only) pushes and waits for the
  dev build id; `sh tools/check-live.sh` is for main. NO COMMITS TO MAIN FROM UPGRADE WORK.
- THE CHANNEL (vite.config.ts `CHANNEL`; `APP.channel`, `isDev()` in version.ts): 'dev' when the
  build runs in a repo whose name ends in `-next` (or `RIG_CHANNEL=dev`, e.g. `RIG_CHANNEL=dev npx
  vite --port 5181` in `~/Rig-Jam-next`), else 'live'. A dev build's `version.json` carries
  `"channel":"dev"`. Unit tests also run in the dev repo's Action, where the channel IS dev: a
  test must hold on either.
- THE DEV LABEL, dev builds only: "DEV" after Settings' version line (`versionText`) and a small
  chip in the home page's top left corner (`.dev-chip`). The live build says it nowhere.
- THE DEV COPY KEEPS ITS OWN OFFLINE CACHES (service-worker.ts `cachePrefix`): an origin's caches
  are shared, and a worker taking over deletes every cache with its prefix but its own. Live's
  are `rhr-*`, dev's `next-rhr-*`, so neither wipes the other's offline copy.
- ONE SAVE FOR BOTH (they share `localStorage` on a phone that has opened both), SO THE DEV BUILD
  MAY ONLY ADD. `e2e/fixtures/live-contract-<build>.json` is what the live build reads (keys,
  fields, types, the sightings, styles, regions and levels it knows), made from main's own
  modules; `save-compat.test.ts` holds everything this build writes to it, and a round trip
  through the live build. WHAT THE LIVE BUILD DOES WITH WHAT IT DOES NOT KNOW: a sighting id it
  does not know is dropped when it next saves the log; an unknown music style falls back to its
  default; a field added to `rush-hour-rigs:v2` is lost when it saves progress. So: new data that
  must survive goes in a NEW KEY (declare it in the test's `DEV_ADDS.keys`); a new sighting, style
  or region must be declared in `DEV_ADDS`, on purpose. (Reset progress on either build clears
  every `rush-hour-rigs:` key.) WHEN MAIN CHANGES WHAT IT SAVES, make a new contract file from it.
- `npm run test:e2e:devlane` (WebKit, DPR 3, 375 and 390; `DEV=` the dev build, default the dev
  server on 5181; `LIVE=` the live build, default the live site): the label on dev and not on
  live; a save written by the dev build shown whole by the live build, byte for byte untouched,
  played on there and read back by the dev build; the two polish items below.
- POLISH: "You can come back tomorrow." is a Daily Pad line only (`DAILY_ONLY_LINES` in lines.ts,
  `companyLine(..., daily)`). THE DEPTH GAUGE BESIDE THE CARDS IS A SLIM TAB (`.dig-gauge.slim`,
  set in log-dig-view.ts from the first card's top to the last card's foot): flush with the
  screen's right edge, in the page's margin, its reading turned on its side, so it covers no
  card's picture and no caption (there is no place over two columns of cards where the full pill
  covers neither). Below the cards it is the pill again.

## Classic Rock music (October upgrade, job U7; Oct 9; on `next`)
- A FOURTH MUSIC STYLE, "Classic Rock" (`MUSIC_STYLES`, id `classic`; Country stays the default),
  whose in-play loop GETS HEAVIER AS THE PLAYER MOVES UP THE REGIONS: `classic_menu` and four
  in-play loops, `classic_play1` (the calmest, 100 BPM) to `classic_play4` (the heaviest).
- THE TABLE, ONE PLACE: `PLAY_TIER` in `src/audio/pack.ts` (a region's id to its tier; `playTier`
  gives 1 for anything not named): Cardium 1, Montney 2, Duvernay 3, Mannville, Bakken and
  Clearwater 4, the Daily Pad (`daily`) 3. **SUNDAY TURNAROUND (U3) AND BALDONNEL (U6) USE TIER
  4: add their ids to the table when they come.** `GameView` passes `playTier(regionId)` with
  `sound.setGround`; the engine keeps it with the scene (`setScene(scene, tier)`) and
  `musicKey(style, scene, tier)` picks the loop. Country, 80s Retro and Chill have ONE in-play
  loop each and play it whatever the tier (the fallback; tested), exactly as before.
- THE FILES are Manus's pack (`~/Desktop/RHR Art Inbox/Sound files/classic_rock/`, notes in its
  `RIGJAM_MUSIC_HANDOFF.md`): five finished loops, seamless, at -16 LUFS. They are NOT re-cut and
  NOT re-levelled, and `tools/audio-pack.py` is NOT run over them; but they came two to three
  times the size of the other music, so `python3 tools/music-classic.py` encodes each again as
  the others are (decoded once, then Ogg Opus 112 kb/s first and MP3 128 kb/s behind: 1.4 to 2
  MB each, 18 MB for the ten files), measures `seconds` (from the decoded loop) and `mean` (from
  the MP3 that ships) into pack.json, and adds the five Credits rows (Pixabay Content License;
  no attribution needed). `masters/` is never shipped. Like all music they are fetched only when
  wanted and are not in the service worker's precache.
- A CHANGE OF LOOP IS A CROSSFADE WITH NO GAP (engine.ts `syncMusic`, every style): the loop that
  is playing plays on until the next one is fetched and decoded, and only then fades out as the
  new one fades in (`MUSIC_FADE`). It used to fade out at once, so the first time a loop was
  wanted there was silence while its file came. Another level of the same tier does not disturb
  the loop.
- SETTINGS: the four style buttons are on ONE row (`.music-styles`, four columns): a second row
  would push the panel past a phone's screen.
- SAVES: nothing new. The live build does not know `classic`: it plays Country, and saves Country
  if a sound setting is changed there (Jay: fine; `DEV_ADDS.styles` in save-compat.test.ts).
- Tests: pack.test.ts (the table, the keys, the fallback, the files' sizes and levels, no
  masters); `test:e2e:audio` (each region's loop, the Daily Pad's, every change a crossfade with
  sound going out throughout, Country still `country_play`, and every loop's join in Chromium
  and WebKit). NOBODY HAS LISTENED: the levels and joins are measured, not heard.

## Daily Pads forever (October upgrade, job U2; Oct 9; on `next`)
- A FRESH DAILY PAD EVERY DAY UNTIL NOV 27, 2028, THE SAME FOR EVERYONE. Pads 1 to 60 (Sep 30 to
  Nov 28, 2026) are `src/levels/daily.json`, in the game's script, EXACTLY AS THEY WERE (a test
  pins the file's hash). Pads 61 to 790 (Nov 29, 2026 to Nov 27, 2028; 730 pads) are made once
  and fixed: `public/daily/pads-<from>-<to>.json`, blocks of `DAILY_BLOCK` (30) pads, 25 files,
  about 26 KB each, NOT in the game's script (the main bundle grew 2 KB).
- **REGENERATE BEFORE NOV 2028.** After pad 790 the pads repeat from pad 61 (`padSlot`; never from
  pad 1). To add years: raise `DAILY_LAST` in `src/ui/daily-pads.ts`, run `node
  tools/gen-daily.ts` (about 12 minutes for 730; finished pads come from `tools/.gen-cache/daily/`
  or are made again the same), commit the new files. Never regenerate a pad that has been live.
- `tools/gen-daily.ts` MAKES THEM BY THE SAME ROAD AS PADS 1 TO 60: `dailySlot(i)` of gen-levels.ts
  (odd pads 5 trucks and 1 piece of equipment, even pads 6 and 2; par 6 to 8), the same search in
  the same shards run by gen-levels.ts's own worker, the looks dealt from the same seeds
  (`dressDaily`), the seed the pad's place (5000 + pad - 1). `--check 6` makes pads 1 to 6 again
  and compares them with daily.json (they come out the same). NO PAD REPEATS (`layoutKey`: the
  layout whatever the paint): a pad whose seed gave no level in the band, or the layout of a
  region's level or an earlier pad, is made from its next seed (`SEED_STEP`), in pad order. Each
  is parsed and solved before it is written. Pars: 102 at 6, 336 at 7, 292 at 8.
- THE GAME (`src/ui/daily-pads.ts`, pure and tested; main.ts `showDaily`): `dailyLevel(pad)` gives
  pads 1 to 60 at once and fetches the one block a later pad lies in (kept for the visit; a failed
  fetch is asked for again). The home page fetches today's and tomorrow's ahead (`warmDaily`) and
  writes the par in when it comes; if a block cannot be had, a toast says so. THE SERVICE WORKER
  KEEPS EVERY BLOCK (they are public files), so any day's pad plays offline once the game has
  been opened (`test:e2e:offline` opens Dec 1, 2026's with the network gone). The theme rule is
  the old one (`dailyTheme`: odd summer, even spring). The live build until the merge still
  wraps after pad 60, so from Nov 29 dev and live show different pads.
- `?pad=N`, THE DEV COPY ONLY (`isDev()`; `padLink`): opens Daily Pad N to try it, AND SAVES
  NOTHING (no streak, hard hats or log: the page's storage is the in-memory copy of demo-link.ts).
  The live build does not read it.
- NOTHING NEW IS SAVED. (A new pad's best score is saved under its id, `d61`...: the live build
  keeps ids it does not know.)
- Tests: `daily-pads.test.ts` (pads 1 to 60 unchanged, the calendar, every new pad solved at its
  par inside the band, no repeats, the repeat from 61, fetching); `test:e2e:devlane` `ONLY=pads`
  (`?pad=61|200|790|791` open, play and save nothing; the phone's date set to Dec 1, 2026).

## Baldonnel, region 7: road ban patches (October upgrade, job U6; Oct 9; on `next`)
- THE RULE (engine, `Level.soft`): SOFT cells are thawed ground. A 2-cell truck drives over one like any
  floor; A 3-CELL TRUCK (a rig) CANNOT ENTER ONE: for it the cell is a wall (`getMoveRange`; the
  solver's `softAt`). No rig starts on one (`parseLevel`); a cell is soft, muskeg, a rack or under
  equipment, never two of them. Both solvers, hints and fling follow from the move range
  (`soft.test.ts`; A*'s estimate still never overshoots: patches only take moves away).
- `src/levels/baldonnel.json`: TEN LEVELS OF 6 x 6, ids `b01` to `b10`, Jay's names in order: Spring
  Breakup, Load Limits, Half Loads, Soft Spot, Frost Heave, Critical Sour, Gravel Haul, Scale
  House, Overweight Permit, Ban Lifted. Par 16, 17, 18, 19, 20, 21, 22, 22, 23, 24; 8 trucks on
  levels 1 and 2, then 9; two patches a level (level 4: three); one piece of equipment on levels
  5 to 8; no convoys (the slots that may keep one did not). Level 1: patches only, and its tip is the rule. EVERY LEVEL'S PATCHES RAISE ITS
  PAR (without them it solves in fewer moves); every patch lies in some rig's lane and none is
  under a truck at the start; on level 1 a pickup is seen to drive over one in the best line.
  Equipment is in the way of the best line.
  `baldonnel.test.ts` holds all of it.
- NEVER HAND-EDIT, AND NOT SEARCHED FOR TWICE: `node tools/gen-baldonnel.ts [minutes a slot]
  [chain]` hill-climbs each slot (as tools/climb.ts does) from a hard level the game already has
  with its own region's rules taken off, nine seeds racing, and keeps the accepted level in
  `tools/fixed-levels/b01..b10.json`; `node tools/gen-baldonnel.ts write` writes the level file
  from those (truck and equipment looks dealt from fixed seeds). Delete a slot's file to climb it
  again. A slot is climbed three ways at once: from its own base, up from the nearest accepted slot
  below it, and DOWN from the nearest one above it (the late slots came home first); `bases`
  races nine other bases instead. Each stands at least 3 trucks apart from every other (`DIFF`; 4
  was asked first and levels 5, 6 and 9 stuck at 3). LEVEL 6 IS KEPT MIRRORED (`flip`): it would
  not walk further than 2 trucks from its neighbour in half an hour, and a level turned over is
  the same puzzle on what looks like another pad. The whole region took about 80 minutes of
  climbing, most of it finding out the above. WHAT THE CLIMB TAUGHT: reaching the par is easy; keeping the rules at that par is the
  work, so once at par a change that keeps fewer of the slot's rules is not taken (`soundness`).
- A PATCH ON THE BOARD (`floor-art.ts` `softSvg`, `.floor.soft`, under the tracks and trucks like
  muskeg): dark wet mud filling its cell and running a little past its edges, two water-filled
  ruts, the last snow along its rim. Browner and wetter than muskeg's black peat, and no sedge.
- A RIG PUSHED AT A PATCH: a bump like any other (near-miss tick), and ITS OWN DRIVER says why
  (`BumpHit` `soft`, `BUMP_LINES.soft`, used alone like `convoy`; escalation "Still too soft for
  me."). The lines are Claude's stand-ins: Jay, write your own in lines.ts.
- THE REGION: after Clearwater in `REGIONS`, opens after 5 of Clearwater like the others. Blurb:
  "Spring breakup. Rigs can't cross soft ground. Pickups can." Music tier 4 (`PLAY_TIER`). No
  night, no pill in the dig. Its seven sightings: "Baldonnel's seven sightings" below.
- THE THAW THEME (`thaw`, themes.ts; season `thaw` in trees.ts): last year's dead khaki grass with
  the last snow lying in it (`grass-thaw.webp`, `tools/ground-tiles.py` `thaw_grass` +
  `thaw_snow`), BLACK SPRUCE (the board's own spruce drawing in dark dull tones) with aspen and
  willow only in bud, a pale washed sky, and a pad of frost-firm grey gravel (ground `gravel`),
  cold and light so the dark patches read at a glance. Montney's spring is wet mud and green.
- THE STANDARD BALDONNEL SCENE (`BaldProp`, scene-stage.ts; drawings in `bald-art.ts`, ported as
  written from `~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html`, saved Oct 9 17:36,
  its `bgBald`). On every Baldonnel level; the generic scenery puts no trees below the board
  there. FIVE LAYERS, none takes a touch, each a unit of the depth strip on its own ground line:
  `.bald-ground` (under everything: grass bands, the muddy two-track run on to both screen edges,
  snow patches, the THAW POND with its three ICE PANS running off the right edge, the MELTWATER
  PUDDLE), `.bald-layer` (the back row: six black spruce, `BD_TREES`, and two red willows),
  `.bald-sign` (the BISON CROSSING SIGN), `.bald-snowbank` (the old SNOWBANK) and `.bald-scale`
  (the portable TRUCK SCALE and its DIAL, needle at rest in the green). `BD_SCENE` crops the
  reference's strip to y 44 to 170 (126 units, as tight as Mannville's), so it shows bigger.
- MOVED FROM THE REFERENCE, each for a rule: the bison sign stands 56 further right (clear of the
  biffy), and the two spruce that stood beside it stand at the right, on the pond's far bank
  (at the left Right of Way would park Moe's pickup in front of them); the puddle lies on the two-track's near rut (y 163, not 174)
  and the three front snow patches on the lane's near edge (the tighter crop); the three tallest
  spruce are a little shorter (inside the strip); the scale is drawn on the lane's line but STANDS
  2 units behind it (`SCALE_FOOT`, as Clearwater's rig mats do), so everybody who walks the lane
  passes in front of it. THE SNOWBANK IS WHERE THE REFERENCE HAS IT (x 38 to 98): U6 stood it 34
  further right for the sleepy worker's spot and U6b put it back, because Half Dressed and
  Overweight play on the ground between the snowbank and the scale. `BD_SCENE` is y 47 to 170:
  123 units, exactly Clearwater's, so its characters stand at Clearwater's in-game size.
- NO LEASE SIGN ON BALDONNEL (as on Clearwater): the pond lies where its visitors would walk, and
  the bison sign stands in the back row. So no surveyor or deer there. The biffy, the landowner,
  Safety Sam, the geese, the magpie and the sleepy worker play as on any pad of 6.
- NO DEAD PROPS (`BaldProp.propAt`, `BD_PROPS`: tap targets of at least 44 px; the pond's runs to
  the screen's right edge): the sign, the snowbank, the pond and the puddle bring their sightings
  (below); the scale, and any of them whose sighting has been or is on, answer with the usual knock.
- SAVES: nothing new is saved. Baldonnel's scores are ordinary `best` entries under ids the live
  build does not know; it keeps them untouched and shows no seventh tab (`DEV_ADDS.regions`).
- `npm run test:e2e:baldonnel` (WebKit at DPR 3, 390 and 375; `ONLY=tab|rule|scene|levels`): the
  tab and its lock, the patches where the level says, a rig stopped at one and its driver's line,
  a flung rig stopping there with no near miss, the scene and a knock on each prop, and ALL TEN
  LEVELS cleared at par by dragging. `REGION=6 npm run test:e2e:depth` and `REGION=baldonnel npm
  run test:e2e:frames` (also `VIEW=390x664`) hold the depth rule and same start, same end on the
  new scene with the strip gags every region shares. Screenshots: `~/Desktop/RHR Art Inbox/qc/baldonnel/`.

## Baldonnel's seven sightings (October upgrade, job U6b; Oct 10; on `next`)
- `src/ui/bald-gags.ts` (@ts-nocheck): PORTED BY A SCRIPT from
  `~/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html` (saved Oct 9 17:36), as the
  Clearwater ones were: the page's new puppets (sandhill crane, bison, snowshoe hare in its spring
  coat, wood frog, mosquito, pike, the magpie, Moe's hat, kit, boots and sandwich) and its seven
  gags copied as written, each as `BALD.<key>` in wave3's shape (`beats` [time, id, text], `dur`,
  `still`, `lead(E)`, `tail(E)`, `render`, `back`, `front`, `over`). The worker, the pickup, Moe,
  the bearded worker and every helper are wave3.ts's own (the same drawings, character for
  character; `worker` gained the page's two additions, `hatItem` and `noseC`). `sceneDef`
  (scene-stage.ts `gagOf`) plays either module's. `bald-gags.test.ts` holds every beat to the
  page's own time and text.
- CHANGED FROM THE PAGE, each for a rule (the file's header says the same):
  - A WIDER SCREEN: whoever walks or drives in starts `E` further out and goes `E` further at the
    page's own speed at its edge (`OW_IN`, `BI_OUT`...); the flyers cover the extra way in the same time.
  - NOTHING OVER THE LEASE: the strip's layers lie under the board, so the page's flyers, which
    come down out of the sky above its picture, GLIDE IN LOW from the screen's edge inside the
    strip and leave the same way (`CRANE_IN_Y`, `BIRD_IN_Y`...). The feather starts its fall inside
    the strip; "garooo" is written a little lower.
  - LANES: Right of Way: Moe walks BEHIND his truck (`back`, GY-8) and round its front to the
    bison (`front`, GY+12); truck and bison on the walking lane. Last Ice: all of it on the pond's
    line, behind the lane (`onPond`). Late Croak: the frogs in the puddle, in front of the lane.
  - SOUND WORDS and whistled notes are drawn on the layer over everything (`over`). "Shoo!", "Got
    one!" and "Hey!" are said in the game's own bubble (`lines`, `BALD_LINES`).
  - THE SCALE'S NEEDLE is the scenery's own: Overweight says where it points
    (`BALD.overweight.needle`, `BaldProp.needle`), and it is back at rest when the gag ends.
- AS THE PAGE HAS IT, AND WORTH KNOWING: Right of Way parks Moe's pickup in front of the snowbank
  (the lane has no other room: snowbank, scale, bison). The pickup faces right and no near door
  opens (rule 12). Any worker in trouble is Slow Moe (rule 11); the bearded worker strolls
  through Half Dressed and Late Croak.
- TRIGGERS (`GAG_TRIGGERS`, Baldonnel only, each once a level; `GameView`): OVERWEIGHT = a rig
  pushed at a road ban patch 3 times in the level (`patchPushes`; `onBump` hit `soft`, WHICH DOES
  NOT COUNT toward Safety Sam's three in a row). TWO LEFT FEET = 3 taps on the sky above the lease.
  RIGHT OF WAY = a tap on the bison sign. HALF DRESSED = 3 taps on the snowbank. LAST ICE = a tap
  on the pond. LATE CROAK = a tap on the puddle. LUNCH TO GO = a pickup driven across or onto a
  patch, ONCE (`patchDrives` 1; `drivesOnSoft`: the cells it newly covers; a fling is a move).
  `?gag=overweight|cranes|bison|hare|ice|frogs|mosquito`.
- LUNCH TO GO AND THE LEVELS AS THEY STAND (Jay, Oct 10: the trigger is ONE drive, the levels are
  not changed, and its plain hint is his: "In Baldonnel, drive a pickup over a road ban patch."):
  on levels 1, 5, 6, 7 and 8 one pickup has a patch in its lane, in that pickup's own gate cell,
  so it crosses the patch on its way OUT. On levels 2, 3, 4, 9 and 10 no pickup can reach a patch
  at all, so Lunch to Go does not come there.
- LOG: `overweight`, `cranes` "Two Left Feet", `bison` "Right of Way", `hare` "Half Dressed", `ice`
  "Last Ice", `frogs` "Late Croak", `mosquito` "Lunch to Go", after One Pea (40 entries). Captions,
  riddles and plain hints are the page's own, word for word (a test holds them to it), Lunch to
  Go's plain hint aside.
  Camo earned before them stays earned (`camoEarned` is saved); a new player needs all 40. Cards:
  the page's own still of each, with its prop drawn behind (`LOG_ART`). Declared in
  `DEV_ADDS.sightings`: the live build drops them from a log it saves, until the merge.
- WITNESS LINES for the seven are Claude's stand-ins (lines.ts): Jay, write your own. NO SOUNDS
  YET (`GAG_SOUNDS` rows are empty).
- `test:e2e:sightings` has the seven on their real actions on a fresh log (`VIEW=390x664`, the
  default, and `VIEW=375x635`) and Baldonnel's props; `REGION=baldonnel npm run test:e2e:frames`
  (also `VIEW=390x664`, `VIEW=375x635`) and `REGION=6 npm run test:e2e:depth` hold them.
  Filmstrips: `node tools/qc-filmstrip.mjs <gag> safari <folder> 6 1`.

## Fling (October upgrade, job U4; Oct 9; on `next`)
- A QUICK FLICK SENDS A TRUCK ALL THE WAY DOWN ITS LANE, out through its gate if the rules let it
  leave; a slow drag is exactly what it was. Rules in `src/ui/fling.ts` (pure, tested); the board
  (`BoardView.onPointerUp`, `flingTo`) feeds it the finger's places along the lane.
- THE ONE NUMBER TO TUNE: `FLING_SPEED` (11 cells a second), measured over the last
  `FLING_WINDOW_MS` (90 ms) before the finger lifts. Higher = harder to fling. A release is a
  fling only if the finger was STILL MOVING when it lifted (its last movement no older than
  `FLING_STALE_MS` 45 ms) and covered `FLING_TRAVEL` (0.4 cell) in that window: a drag that slows
  or rests before lifting never flings, however fast it began.
- WHERE IT ENDS (`flingDelta`): the far end of the engine's own `getMoveRange` that way: against
  whatever is there, or out through the gate where that end is the truck's `exitDelta` (so a
  convoy gate still waiting, a tanker not loaded and a clock gate on the wrong move stop it at
  the gate). One move; Undo takes it back. Blocked that way already: no move.
- THE SLIDE (`flingMs`, `FLING_EASE`): 130 ms plus 42 a cell (380 at most), easing out, with the
  drag's own sounds and tire tracks. Out through a gate: it slides to the gate first
  (`BoardView.flinging`: no other truck can be picked up for that moment), then the move is made
  and it drives out as ever. Reduced motion: no slide.
- NOT A BUMP: a fling that stops against something makes no near-miss tick and no line. And a
  fast finger running on past the truck's stop is not pushing yet: the board holds that bump back
  (`Drag.held`, `PUSH_HOLD_MS` 130) and it comes only if the finger is still down and still past
  the stop by then, or slows down there. Slow pushing bumps at once, as before.
- A FLING IS A MOVE LIKE ANY OTHER for gags, hints and the score. Flinging the hinted move carries
  the hint line on when it ends where the hint said; if it runs further the next hint solves afresh.
- OFF IN AN AUTOMATED BROWSER (`flingOn`: `navigator.webdriver`) unless `?fling=1`; `?fling=0`
  turns it off for anyone. The suites' scripted drags move at a steady clip and lift at once,
  which is a flick, and they mean a drag. With it off the board is exactly the old one (no held bumps).
- The first how-to card ends "Flick a truck to send it all the way."
- `node tools/gen-baldonnel.ts [minutes] [chain]` / `node tools/gen-baldonnel.ts write` – Baldonnel's ten levels: climbs the slots not yet in `tools/fixed-levels/`, then writes `src/levels/baldonnel.json`
- `npm run test:e2e:baldonnel` – Baldonnel on a phone: the tab, road ban patches, the standard scene, all ten levels at par (start the dev server first)
- `npm run test:e2e:fling` (WebKit touch at 375 and 390, Chromium as a Pixel; real-time
  gestures): a flick against a truck, into the berm and out a gate, Undo, four kinds of ordinary
  drag, both kinds of push, a level at par with ZERO INCIDENT on flung moves, hints in a row.
  NOBODY HAS FLICKED A REAL PHONE YET: the speed wants Jay's thumb.

## Sunday Turnaround (October upgrade, job U3; Oct 9; on `next`)
- EVERY SUNDAY A NEW HARD PAD OF 8 x 8, the same for everyone, playable all week. Rules in
  `src/ui/turnaround.ts` (pure, tested). Turnaround #1 is the week of Sunday Oct 11, 2026
  (`TURN_EPOCH`, the phone's local date; `turnaroundNumber`); before that Sunday the button shows
  #1 too. `TURN_LAST` 112 are made: the last is Sunday Nov 26, 2028. AFTER THE LAST THEY COME
  ROUND AGAIN FROM #1 (`turnSlot`). REGENERATE BEFORE DEC 2028: raise `TURN_LAST` and run `node
  tools/gen-turnaround.ts` (earlier ones come from `tools/.gen-cache/turnaround/` or are made the
  same again: each week's seeds are its own, `turnSeed`).
- `tools/gen-turnaround.ts` makes them on the Big Pad generator's own road (`growPad`, `candidate`
  of gen-bigpad.ts): 14 to 16 trucks, 12 to 14 EXTRA MOVES (the target turns with the week), trucks
  and gates only. A week walks its seeds until one gives a pad in the band; weeks run side by side
  on the machine's cores. While it grows a pad its solver is capped at 40,000 positions
  (`GROW_CAP`: without it one pad took about 12 core-minutes; the finished pad is proven again in
  full). All 112 took 11 minutes. No pad is the layout of a Clearwater level or of an earlier week
  (`layoutKey`). They lie in `public/turnaround/weeks-<from>-<to>.json`, 8 to a file
  (`TURN_BLOCK`), NOT in the game's script (the main script grew 3.2 KB); the one file a week needs
  is fetched when needed (`turnaroundLevel`, warmed from the home page), and the service worker
  keeps them all, so it plays offline.
- THE BUTTON (`.turn-btn`, main.ts, under the Daily Pad): "Sunday Turnaround #N". It opens once
  the player has cleared 10 levels in all (`TURN_UNLOCK`, `levelsCleared`: the regions' levels; a
  Daily Pad is not one); demo mode opens it. Locked: grey, a padlock and "Clear 10 levels to
  unlock (x of 10)"; a tap only shakes it. Cleared this week: green, "Cleared in M moves".
  It is kept slim (56 px), and it still moves the level list down: all 10 rows now need about 260
  to 280 px of scroll at 390x844 (`test:e2e:menus` allows 285; it was 220).
- IT PLAYS AS A CLEARWATER LEVEL (`GameView` `where.turnaround`; region `clearwater`, theme
  `boreal`): the standard Clearwater scene and its five sightings, hints (A*), music tier 4
  (`PLAY_TIER.turnaround`). HUD: "Sunday" over "Turnaround #N".
- ITS WIN CARD: the result line "Turnaround #N" (`.turn-result`), the hard hats against par,
  Share, Play again and All levels. No Next, no streak, no "come back tomorrow". Share copies
  `turnShareText`: "Rig Jam 🚛 Sunday Turnaround #N", the hats with moves and par, the link.
- RESULTS ARE SAVED UNDER THEIR OWN KEY, `rush-hour-rigs:turnaround` (`{ v: 1, best: { week:
  moves } }`), declared in save-compat's `DEV_ADDS.keys`. NOTHING of a Turnaround goes into
  `rush-hour-rigs:v2`: no score there, and no hint for a par clear (that would be a change to
  the progress the live build reads).
- `?week=N` (the dev copy only) opens Turnaround N, locked or not, and saves nothing
  (demo-link.ts). The live build does not read it.
- `ONLY=turnaround node e2e/dev-lane.e2e.mjs` (WebKit at DPR 3, 375 and 390): the button locked
  and open, the pad on Clearwater's scene, a sighting, Hint, tier 4, the card, the share line, the
  key, the next Sunday, `?week=1`, `60` and `113`, and the live build untouched.

## Sighting fixes (Job Y, Oct 9)
- NEAR MISS: THE GOPHER COMES UP IN FRONT OF THE MOUND. His layer ends at the hole line, and a
  ground line worked out from that stood above the mound's own, so the mound was drawn over him
  and he rose behind it. `nearMissDef` now stands his layer on the mound's own line
  (`mound.dataset.ground`, `setGround(..., 'set')`) and draws the hole's near lip over him on a
  layer of its own (`gopher-lip-layer`, Gopher Lunch's `LIP`), made before the hotshot's layer.
- CAMERA FLASHES (Frozen Tongue, Tourists; puppet-stage.ts `camFlash`, `FLASH_S` 0.15): a quick
  soft burst of white over the WHOLE game screen, brightest at the camera, on a layer of its own
  over the lease (strip-gags.ts `flashLayer`: made by the gag's own `layer`, so it goes with the
  gag, but not one of its strip layers, so the beat's mark, the depth rule and the tests do not
  see it). It used to light the bottom strip only: a hard-edged box. None with
  reduced motion (`display: none`).
- CHANCE SIGHTINGS NEVER FEEL BROKEN (gag-triggers.ts `Chances`, `CHANCES`; `GameView.chance`):
  the magpie, the sleepy worker, the bear, Gopher Lunch, the surveyor and the tourists. UNTIL A
  SIGHTING IS IN THE PLAYER'S WILDLIFE LOG ITS TRIGGER ALWAYS WORKS; after that its chance
  applies, BUT NEVER TWO MISSES IN A ROW (after a miss the next try always works; the miss is
  remembered while the page is open, across levels, and is not saved). Demo mode: always. The
  tests' pins (`?bird=`, `?nap=`, `?bear=`, `?lunch=`, `?surveyor=`, `?tourists=`) still settle
  it either way. (Where the notes above say "1 in 2" or "1 in 3" for these six, read it with
  this rule.)
- GOPHER LUNCH WAITS FOR THE HINT'S MESSAGE (`GameView.onHint` > `lunchOnHint`): since the hint
  is worked out a frame or two after the press ("Calling the dispatcher..."), the lunch fired
  straight after the press was placed before the two-line message took its room, and played a
  line too low (the fault of "A TALL MESSAGE TAKES ITS ROOM AT ONCE", back again). He is fired
  once `hintPressed` has finished.
- HINTS NEVER SAY "MAY" OR QUOTE ODDS (a test holds them to it): a hint shows only while its
  sighting is unfound, and then following it always works. Changed: Magpie, Sleepy Worker,
  Gopher Lunch, Surveyor, Tourists ("They show up on your first move"), and the Bear (its "He
  comes one time in three." is gone).
- `test:e2e:sightings` has a third part (`ONLY=chance`): with the dice left alone, a fresh log
  and then a full one, one tap on a parked truck brings the magpie in each region of 6 x 6, three
  taps on the Duvernay bush the bear, the Daily Pad's first move the tourists (first try with a
  fresh log; the second at the latest with a full one). `tools/qc-filmstrip.mjs` takes `safari375`.

## Hints in a row (Job X, Oct 9)
- THE KEPT LINE ALWAYS STARTS AT THE MOVE BEING HINTED (`src/ui/hint-line.ts`, pure and tested;
  `GameView.hintPath`): one solve gives the whole best line and it is kept so the next hints are
  instant; a hint is the line's first move (`hintOf`), and when the player plays exactly that
  move the line moves on by one (`lineAfter`). Any other move, Undo and Restart drop it, and the
  next hint solves afresh. THE BUG: the line was kept from its second move after a solve and cut
  again when the hinted move was played, so the second hint in a row skipped a move (Cardium 9:
  "move B", then "move B back").
- `hint-line.test.ts` follows hints from the start to the end on Cardium 9, Bakken 7 and
  Clearwater 10 (every hint legal, exactly par moves, one solve); `npm run test:e2e:hints` does
  the same in the game itself, and after a move that is not the hint, after Undo and after Restart.

## An old save keeps everything (the Clearwater ship, Oct 8)
- A NEW REGION, NEW LOG ENTRIES AND NEW SOUNDS ARE ADDED BESIDE WHAT A PHONE HAS SAVED. Never rename
  or drop a level id, a sighting id or a storage key, and never change a level's par downward so
  that earned hard hats would be lost. A player's phone holds `rush-hour-rigs:v2` (best scores,
  hints, perfect clears, Daily Pads, stand-downs, announced regions, demo), `rush-hour-rigs:log`
  (and `:demo-log`), `rush-hour-rigs-audio`, `rush-hour-rigs:region`, `rush-hour-rigs:last-level`.
- `e2e/fixtures/live-save-de534ad.json` is A REAL SAVE, made by playing the live build before
  Clearwater shipped (Cardium 1 to 6, two sightings, a Daily Pad, sound and music on, 80s Retro).
  `src/ui/save-compat.test.ts` (in `npm test`, so the deploy checks it) reads it with the game's
  own loaders: every score, hint, the streak, the open regions and levels, the log, the settings;
  Clearwater simply locked, nothing announced; a full old log of 28 keeps its camo pickups.
  `npm run test:e2e:save` puts it into the running game at four phone sizes (WebKit at iPhone DPR
  3, 390 and 375; Galaxy and Pixel sizes) and checks the screens show it, storage is untouched,
  and the update bar shows and reloads with the save whole. BEFORE SHIPPING ANYTHING THAT TOUCHES
  SAVED DATA, make a new fixture from the live build the same way and add it beside this one.

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
  The loop (and so the pumpjack's sound) runs ONLY while a level is being played:
  `BoardView.startAmbient` / `stopAmbient`; `GameView` stops it on a win, in `leave()` and when the
  app is hidden (`visibilitychange`), and starts it when the board shows again. `sound.pumpjack()`
  also plays only in the 'play' scene. `npm run test:e2e:audio` listens for 10 s in each place.
- Flare stacks in levels: an alternate look for some tanks. `tools/gen-levels.ts` `withFlares` turns
  the first tank of every second Montney and Duvernay level into `kind: 'flare'` at write time.
  Cosmetic only: layouts, par and the solver are untouched. `node e2e/equip-shots.mjs` saves
  screenshots, close-ups and a clip.
- `src/ui/vehicles.ts` – top-down SVG art per truck kind, drawn cab-right and rotated by CSS to face
  the gate. Body panels use the truck color; the gate symbol sits on an upright color badge.
- `src/ui/lines.ts` – EVERYTHING ANYBODY SAYS (v2: `~/Desktop/RHR Art Inbox/LINES_v2.md`, used exactly
  as written; older lines all kept). Owner edits these freely. No em dashes.
  - Bump lines: a bump shows only the speech bubble plus a tick (with a shake) on the hazard
    near-miss counter. Pools (`BUMP_LINES`): `any` (every bump), `truck`, `wall` (berm or
    wrong-colour gate), `pumpjack`, `tank`, `wellhead`, `flare`, and `convoy` (used alone, so the
    line always explains the rule). A bump draws from its pool plus `any` (`linesFor`), never
    repeating the last line (`pickLine`).
  - Escalation (`ESCALATION`, `bumpLine`): the SAME truck hitting the SAME kind of thing again in
    one level says the table's 2nd line, then its 3rd from then on (a wall: "It's still a wall.",
    then "..."). The board counts per truck and kind (`hitCounts`); a new level or Restart starts over.
  - Witness lines (`WITNESS_LINES`, one per gag id): while a gag is on screen, the player's next
    move makes the driver of the truck NEAREST the gag say the gag's line, if one is within reach
    (see Speech bubbles; bubble `data-witness`). Once per gag per level.
  - Gag lines: the magpie and the landowner each have a pool (`MAGPIE_LINES`, `LANDOWNER_LINES`);
    `fromPool` never gives the same line twice in a row.
  - Company Man (`COMPANY_LINES`, 8 per result; `company.ts`): a line by result, never the same
    twice in a row; if a gag played this level (`gagsThisLevel`), about 1 time in 3
    (`FOURTH_WALL_ODDS`) one of `FOURTH_WALL_LINES` instead.
  - Who speaks on a bump (`src/ui/bump.ts`): the truck that got hit; for the berm, a wrong gate or
    equipment, a random other truck still on the pad; the dragged truck only when it is the last
    one. Bubbles stay on screen; there is one bubble at a time.
  - `npm run test:e2e:lines` checks own lines for tank, wellhead and flare, escalation, a witness
    line and the Company Man in WebKit.
- Regions 4 and 5 on the board (`src/ui/floor-art.ts`, drawn in code; styles under "Regions 4 and
  5" in style.css): `.floor.muskeg` (a ragged patch of dark peat with a wet sheen and sedge tufts,
  seeded by its cell, filling the cell so neighbours read as one bog) and `.floor.rack` (a steel
  platform with a yellow safety edge, a riser with a red valve and a hose, lying across its
  tanker's lane) sit in the pad UNDER the tracks and trucks and take no touches. A shift-change
  gate (`.shift-gate`) wears a `.clock` on its latch post: ring green (`.shift-open`) when the
  next move may leave, red when not. A tanker (`.truck.tanker`) wears a `.load-tag` beside its
  symbol badge: a hollow dashed drop on a dark chip until loaded, then a full blue drop
  (`.loaded`). Pushing at a gate that is shut for one of these reasons makes the truck's own
  driver say why (`BumpHit` `load` / `shift`, pools used alone like `convoy`).
- THE SOLVER (`src/engine/solver.ts`): `solve` is a breadth-first search on packed numbers (each
  truck's place along its lane, a bit per loaded tanker, the move's parity where a shift gate
  cares): about 13x faster than the plain search on the game's own rules, which is kept as
  `solveSlow`, the reference the tests hold it to. Its moves carry the delta really travelled (a
  slide included). `nextMove(state)` counts the moves already made.
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
- Optional, regions 4 and 5: `"muskeg": [{row, col}]`, `"racks": [{row, col}]`, a truck's
  `"load": true` (3 cells long), a gate's `"shift": true`.
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
- NEVER SAY "LIVE" WITHOUT CHECKING: after every push run `sh tools/check-live.sh` (it compares the
  live `version.json` build id with `origin/main`, waiting for the deploy). On Oct 6 the sound
  pass sat pushed but NOT deployed for two and a half hours (the Action's deploy job stuck
  "waiting") while Jay was told it was live. A stuck run: `gh run cancel <id>`, then
  `gh run rerun <id>`.
- NEW FILES ALWAYS REPLACE OLD ONES ON A PHONE without hashed file names: the service worker's
  cache name carries a hash of every built and public file (sounds included), so any change makes
  a new worker with a new cache (filled with `cache: 'no-cache'` fetches, past the browser's own
  cache), and the build id in `version.json` changes with every commit, which is what brings the
  "New version, tap to update" bar.

## Commands
- `npm run dev -- --host` – dev server reachable from a phone on the same Wi-Fi
- `npm test` – unit tests
- `npm run build` – type-check + production build into `dist/`
- `npm run gen-levels [-- c05 m08]` – regenerate levels (named slots are forced to rerun)
- `npm run check-levels` – print levels and solutions
- `node tools/pick-clearwater.ts` – writes `src/levels/clearwater.json` (the ten Clearwater levels) from the Big Pad candidates
- `npm run test:e2e:clearwater-gags` – Clearwater's standard scene and its gag pair: Three Swings, then Out Cold on the same trigger (start the dev server first)
- `node tools/qc-beatsheet.mjs <gag> <reference id> <reference.html> <folder> [iphone|iphone375]` – every beat of a wave-3-format gag, the reference's drawing beside the game's
- `npm run test:e2e:clearwater` – Clearwater on a phone: the tab, the 8 x 8 board whole on the screen at 390 and 375, drag, Undo, Hint, all ten levels at par (start the dev server first)
- `node tools/gen-bigpad.ts [minutes] [seed] [workers]` – Big Pad spike: 20 candidates of 8 x 8 into `levels/bigpad-candidates.json` and a table, 10 minutes at most
- `node --max-old-space-size=8000 tools/check-bigpad.ts` – proves every Big Pad candidate again (breadth-first too, where it gets through) and reprints the table
- `npm run test:e2e` – iPhone tap test (Playwright; start the dev server first)
- `npm run test:e2e:gags` – every puppet gag suite in turn: magpie, eggs, strip, eggs2 (start the dev server first)
- `npm run test:e2e:bubbles` – every speech bubble's tail on its speaker, following it, clear of the HUD and buttons; witness lines (start the dev server first)
- `npm run test:e2e:regions` – Mannville and Bakken: the tabs, the three new rules taught by doing, and all 20 levels cleared at par by dragging (start the dev server first)
- `npm run test:e2e:signs` – the permanent lease sign and gags 16 to 18: surveyor, back scratcher, tourists (start the dev server first)
- `npm run test:e2e:exits` – a truck leaving by each of the four sides: no clip, the short drive, the fade, the gate's dust, the arm, reduced motion (start the dev server first)
- `npm run test:e2e:tutorial` – the "?" button, the three how-to cards, level 1's ghost finger (start the dev server first)
- `npm run test:e2e:lines` – bump lines by kind, escalation, witness lines, the Company Man (start the dev server first)
- `npm run test:e2e:frames` – SAME START, SAME END: every strip gag's first and last frames show no character (start the dev server first)
- `npm run test:e2e:fit` – every iPhone size, Safari and home-screen app, with screenshots (start the dev server first)
- `npm run test:e2e:menus` – main page, level rows, win card fit and character motion, with screenshots (start the dev server first)
- `npm run test:e2e:card` – win card frame, column, medal, confetti, with screenshots (start the dev server first)
- `npm run test:e2e:magpie` – the magpie gag: beats, off-screen entry and exit, splat, startle, reduced motion, frame rate, clips (start the dev server first)
- `npm run test:e2e:eggs` – the sleepy worker and the moose: beats, entry and exit, cancel, triggers, reduced motion, log, frame rate, clips (start the dev server first)
- `npm run test:e2e:strip` – Near Miss, landowner, Biffy A and B and the permanent biffy (start the dev server first)
- `npm run test:e2e:night` – night: every level starts by day, the idle fade, nudge, look, gag dimming, glow, headlights, frame rate (start the dev server first)
- `npm run test:e2e:eggs2` – gags 8 and up: marshmallow, geese, bear, bull and cow, porcupine, gopher lunch, Safety Sam, the riser and the frozen tongue, two gags at once, the landowner's wiggle (`ONLY=geese` runs one; start the dev server first)
- `npm run test:e2e:sprites` – truck sprites, lease ground, berm, gates, fallback, drag frame rate (start the dev server first)
- `npm run test:e2e:cover` – cover screen (start the dev server first)
- `node tools/qc-filmstrip.mjs <gag> <iphone|s23|pixel> <folder> [region tab] [level] [query] [sky]` – a sheet with a frame every 0.25 s of one gag, for Jay to check by eye (WebKit at iPhone DPR 3, Chromium at Galaxy S23 and Pixel sizes; `PYTHON=` a python with Pillow). Jay's copies: `~/Desktop/RHR Art Inbox/qc/`
- `npm run test:e2e:log` – Wildlife Log, toasts, camo pickups (start the dev server first)
- `npm run test:e2e:dig` – the Wildlife Log's dig: the cross-section, pills, buried things and their bubbles, reduced motion, scroll frame rate (start the dev server first)
- `npm run test:e2e:wave3` – gag wave 3: the standard Mannville scene and its four gags (`ONLY=beaver` runs one; start the dev server first)
- `npm run test:e2e:tabs` – the region bar: full-size text, the peek, the fades, the active tab in view, swipes never tap, 5 tabs and a made-up 8 (start the dev server first)
- `npm run test:e2e:beta` – beta readiness: first run, small phones (iPhone SE, 360x800 Android), Settings version and feedback, the update bar (start the dev server first)
- `npm run test:e2e:depth` – the depth rule on every region's standard scene at three phone sizes: order, one lane, no ties, nobody lost behind a prop (`ONLY=surveyor`, `REGION=1`, `SIZE=iPhone` narrow it; start the dev server first)
- `npm run test:e2e:gagsounds` – every gag (all 26) with sound on in WebKit: cues, timing, output level, lazy loading (`ONLY=beaver` runs one; start the dev server first)
- `npm run test:e2e:offline` – the built site under the Pages base path: the service worker registers, fills its cache through 503s, and the game plays with the network gone (builds first; needs no dev server)
- `npm run test:e2e:click` – the buttons' one click and the haptic tick: every kind of button, never on a drag, a tick per truck out, nothing with the switch off (start the dev server first)
- `npm run test:e2e:devlane` – the dev lane: the DEV label on dev and not on live, one save read by both builds, the Daily-only line, the depth gauge clear of the cards (`DEV=`, `LIVE=`, `ONLY=label|saves|line|pill`)
- `python3 tools/music-classic.py [folder]` – encodes Manus's five Classic Rock loops like the game's other music and writes their pack.json and Credits entries (needs ffmpeg)
- `npm run test:e2e:fling` – fling: flicks, ordinary drags, pushes, Zero Incident, hints, at three phone sizes (start the dev server first)
- `node tools/gen-turnaround.ts` – the 112 Sunday Turnarounds into `public/turnaround/` (REGENERATE BEFORE DEC 2028; about 11 minutes from nothing)
- `node tools/gen-daily.ts [--check n]` – Daily Pads 61 to 790 into `public/daily/` (REGENERATE BEFORE NOV 2028); `--check` remakes pads 1..n and compares them with daily.json
- `sh tools/push-dev.sh` – push branch `next` to the dev repo and wait for the dev site's build id
- `npm run test:e2e:judge` – judge-proofing: a fresh visitor with a mouse at 1440 x 900 and 1280 x 720 in both engines, Share, the credit line, `?demo=1`, the load-error page; screenshots (start the dev server first)
- `npm run test:e2e:sightings` – every sighting on its real trigger at Safari's visible size, and every tappable prop answers a tap (`VIEW=375x635`, `ONLY=beaver`, `URL=` the live site; start the dev server first)
- `npm run test:e2e:save` – a real save from the live build before Clearwater, loaded into this build at four phone sizes: everything kept, the update bar (start the dev server first)
- `npm run test:e2e:audio` – sound: lazy loading, every cue, gag sounds, the three music styles, gapless loops, Credits (start the dev server first)

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
