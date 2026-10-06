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
    trailing hearts; a last heart pops. The primp is the reference's own (re-sent Oct 5; it
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
- GATE EXITS (Job J; `src/ui/exit.ts` pure and tested, `BoardView.driveOut`): a leaving truck never
  meets a hard edge. The yard's clip is lifted while it leaves (`.yard.letting-out`, until its dust
  has cleared); it drives only until its cab is `EXIT_PAST` (1) cell past the gate
  (`exitDistance`), in the same `DRIVE_MS`; its opacity eases from 1 to 0 over the last
  `EXIT_FADE` (45%) of the drive; a big puff comes up at the gate early in the drive
  (`gateDust`, `.dust.gate-dust`: 10 puffs of 1.3 to 1.9 cells from the truck's tail to where its
  cab ends, in the ground's colour: dust, mud or powder) and covers it while it fades; the gate's
  arm comes down once it has gone. Plain opacity only: NO mask-image or clip-path (iPhone Safari).
  Reduced motion: the truck is simply removed. `npm run test:e2e:exits` checks all four sides in
  WebKit, frame by frame and by the pixels of a mid-fade screenshot.
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
  "RUSH HOUR RIGS" slams down into the sky with a bounce and a dust puff; 8s push-in; two soft
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
  `python3 tools/audio-pack.py` from the packs in `~/Desktop/RHR Art Inbox/Sound files/`
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
  fetched before that tap, nor while its switch is off: the effects (0.9 MB) load when Sound
  effects is on, ONE music loop only when Music is on. The UI only calls `sound.*` cues; every
  button pops by itself (`tap`, and `back` for Back/Close: a pointer listener in `install`).
  `sound.quiet()` when leaving the game screen; `GameView.leave()` stops its gags (and their sounds).
- Cues: drag (`drag` + the `motor` loop, pitched with speed), backing up (`reverse` loop), bump then
  `radio` before the bubble, an exit (`gate` + `exit`; exits within `CHAIN_MS` add the toy `horn` as
  a three-pitch chord, `HORN_CHORD`, two semitones higher per exit in the chain, `chordLift`), win
  (a pop per hard hat, then `win` at par or `lose` at par + 4 or worse, `winCue`), `streak`, a
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
  times."); a gag that comes on a roll says "He may ...". No em dashes. A test holds them to it.
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
  - FINDS (`dig-finds.ts`, a data file for Jay): `DIG_FINDS`, nine, tapped like buried things
    (wiggle, one line from `BURIED_LINES`; drawings in `FIND_ART`): a gold nugget in a quartz vein
    (granite), a frozen burrito, a diamond and the magpie's stolen spoon (mantle), the sleepy
    worker's pail and the lost lunchbox dead on the centre (inner core), a mole in a headlamp
    (mantle, on the way back up), a whale and a giant squid (the ocean, both belly up to us).
    Each is placed by `screen` (phone screens below the reservoir). THE RHYTHM: a PLACE (a find
    or an empty slot) every 3 to 4 screens, slightly uneven, never two on one screen, and NOTHING
    in the last `QUIET_SCREENS` (5) before the island. `DIG_SLOTS`: 7 EMPTY marked slots for
    future gag finds (keep at least 3): they are the gaps in the rhythm, so until they are
    filled the outer core and the way back up are long quiet stretches. A find gives a tiny
    wiggle by itself as it slides into view (`.glance`, an IntersectionObserver; not with reduced motion).
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

## Commands
- `npm run dev -- --host` – dev server reachable from a phone on the same Wi-Fi
- `npm test` – unit tests
- `npm run build` – type-check + production build into `dist/`
- `npm run gen-levels [-- c05 m08]` – regenerate levels (named slots are forced to rerun)
- `npm run check-levels` – print levels and solutions
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
- `npm run test:e2e:audio` – sound: lazy loading, every cue, gag sounds, the three music styles, gapless loops, Credits (start the dev server first)

## Out of scope (M2)
Daily puzzle, sound, haptics, confetti, skins, Company Man character, magpie.
