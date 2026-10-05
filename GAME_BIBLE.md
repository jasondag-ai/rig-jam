# Rush Hour Rigs: Game Bible

The master reference for Rush Hour Rigs. Every Manus and Claude Code prompt is built from this file. It covers the vision, the screen, the camera rules, every gag and every decision made. Art rules (style, accuracy, never-draw list) live in ART_BIBLE.md. Update this file whenever Jay changes a decision.

Last updated: Oct 3, 2026. Built from all project conversations and the live repo.

---

## 1. The game in one breath

Clear every truck off an Alberta oilfield lease pad through the gate that matches its color, in as few moves as possible. A daily puzzle, Wordle-style, set on a lease, with a living, funny world around the board.

- **Audience:** anyone. Judges and the general public first, oilfield workers second. Every gag must be funny without industry knowledge. Terminology stays industry-accurate (see section 8).
- **Hook for the post:** a P.Eng with zero game-dev experience shipped this by directing AI.
- **Deadline:** hackathon post by Oct 30, 2026 (due Nov 1). Beta with friends and family next.
- **Live:** https://jasondag-ai.github.io/rush-hour-rigs/
- **Art direction:** stylized Pixar-like 3D (locked Oct 3). See ART_BIBLE.md.

## 2. What's built (as of Oct 3)

- 30 levels in 3 regions: **Cardium** (summer gravel), **Montney** (spring mud), **Duvernay** (winter snow, convoys). Solver-proven par, hints, undo, hard hats.
- Daily Pad, Days Without Incident streak sign, Safety Stand-Down, share text, near-miss counter, Zero Incident badge, PWA.
- Progression locks plus demo mode for judges. Reset progress in Settings.
- Live tire tracks with lane wear and mud spray. Swing gates, pipe fence, illustrated trucks and equipment, season ground textures.
- Cover screen (roughneck hero shot), sound (effects on, music off, 80s Synth and Chill Lo-fi; Country Twang cut).
- Bump bubbles (20 lines by trigger). Company Man and roughneck mascot on the win card.
- Wildlife Log with camo pickup reward. Gag pacing rules enforced in code.

## 3. The screen (reference phone: 390 x 844, portrait)

See SCREEN_MAP.png. Measured from the live build.

| Zone | Screen area | What lives there |
|---|---|---|
| **A. HUD** | top, 12 to 64 px | Back, level name, near-miss counter, moves vs par |
| **B. Sky band** | 64 to 200 px | Season sky and tree line. Geese fly across here |
| **C. Top fence edge** | about 190 to 215 px | Moose peeks over the top fence |
| **D. Board (the lease)** | 358 x 358 px square, cell about 55 px | Trucks, gates, equipment (pumpjack, tank, wellhead, flare stack), tire tracks. In-lease gags: magpie on a truck roof, porcupine at a tire, marshmallow at the flare stack, block heater cords |
| **E. Bottom strip** | about 570 to 760 px (190 px tall) | Grass, trees, bush. Bear, gopher and hotshot, landowner, spotter on his pail. Biffy usually sits here behind a truck's tailgate. The level tip text also sits here on early levels |
| **F. Controls** | 770 to 832 px | Undo, Hint, Restart |

Side margins are only about 16 px. Nothing plays there.

## 4. Camera and size rules (the fix for mismatched clips)

Every gag belongs to ONE zone, and the zone sets the camera. All clips for a gag use the same camera, canvas and ground line.

| Zone | Camera | On-screen size | Clip framing |
|---|---|---|---|
| B. Sky | Pure side view | Each bird about 20 to 30 px | 720 x 720, bird centered, about 40% of frame |
| C. Top fence | Front view, fence line = bottom edge of frame | Head and antlers about 45 px | 1080 x 1080, rises from below the bottom edge |
| D. Board | 3/4 high angle, matching the equipment sprites | People about 0.6 to 1.2 cells (35 to 65 px) | 1080 x 1080 |
| E. Bottom strip | Pure side view at ground level, ground line at 80% of frame height | Characters 40 to 90 px tall; trucks about 6x a gopher | 1080 x 1080, or 1920 x 1080 for vehicles crossing the strip |

**IN-PLACE RULE (most important):** a clip never moves a character across its frame, and never has him walk or fly in or out of frame. All travel across the phone screen is done by Code, which slides the clip layer along the screen at a speed matched to the stride so feet don't skate, and mirrors it for direction. Clips come in two kinds only:
- **In-place loops:** walk, shuffle, waddle, fly or drive cycles, on the spot, as if the camera tracks the character. 1 to 2 s, the last frame matches the first.
- **Stationary actions:** the character stays on one spot (door bangs open, sits, sleeps, wipes, rises over the fence, eats the marshmallow).
**CONTINUITY RULE:** every clip starts and ends on a defined hand-off pose. A loop's last frame matches its first frame exactly. In a sequence, each clip's first frame matches the previous clip's last frame (same pose, position, scale and facing), so clips chain with no jump. Every Manus prompt names the hand-off pose for each clip. Every delivered clip is checked frame by frame for this before Code touches it.
A gag is a sequence Code assembles: stationary action > loop while Code moves it > stationary action > loop off screen.

**Readability rule:** at these sizes, fine detail disappears. Characters need bold silhouettes, big gestures and clear expressions. Jay's rule: "If it's subtle, it works. If it's oversized, we're trying too hard."

**Manus never draws text.** Speech bubbles, Zs and "Near miss!" are added by Code.

## 5. Game rules for gags (enforced by Code)

1. Only one gag plays at a time, anywhere.
2. No gag starts while a truck is being dragged or moving.
3. Perimeter gags: at most one every 30 to 45 s, random order, no repeats until all have played. Unfound Wildlife Log entries come up more often.
4. Idle gags: magpie at **10 s** idle, spotter at **20 s** idle. Any touch cancels them (except a sleeping spotter, which a touch wakes).
5. No scene ever mixes old drawings, sprites and video. A gag missing any clip stays switched off.
6. Gags never cover the board, gates or buttons at 375 px wide. Gags never take touches.
7. Reduced motion: still frames or skipped.
8. Gags are easter eggs, never points. Finding them fills the Wildlife Log.

## 6. The gags

| # | Gag | Zone and trigger | Beats (the full story) | Clips | Status |
|---|---|---|---|---|---|
| 1 | **Magpie** | D. 10 s idle. Once per level | Flies in, lands on a random truck's roof, hops, cheeky look, drops 2 to 3 small droppings clustered at roof center (white blob, dark center, small drip). They ride on that truck until it exits. Driver bubble: "Seriously?" Flies off | magpie_land, magpie_poop, magpie_fly_off (side view) | Clips delivered. Wire in |
| 2 | **Sleeping spotter** | E. 20 s idle | Walks on below the fence carrying a pail, sits on it, dozes (Zs by Code). Touch while asleep: jolts awake, topples off the pail (pail stays), scrambles off. Never points at trucks. The flag dance was cut | spotter_sit, spotter_sleep_loop, spotter_wake (front 3/4) | Clips delivered. Wire in. spotter_wave not used |
| 3 | **Biffy** (CONFIRMED BY JAY, Oct 3) | E (or top/sides), standing quietly from level start just outside the fence, directly behind one truck's tailgate, on fence with no gate. Trigger: the player backs that truck into the fence at the biffy. Nothing else triggers it. Once per level | The tailgate hits the fence: the biffy jolts and rocks from BEHIND (the fence and truck side), door bangs open. The worker, caught mid-business, steps out bent over with his pants down round his ankles, trying to pull them up. Strict side profile only, never facing the camera. Tiny quick shuffling steps because of the pants, side of a round bare cartoon cheek showing (no detail), toilet paper stuck to his boot trailing behind, mortified face. Shuffles off the edge of the screen and never comes back | biffy_bump (stationary), worker_step_out (stationary: steps out of the door, bent over, turns to side profile, stays on the spot), worker_shuffle_loop (in place). Code slides him from the door to the screen edge | Redo pending. The Oct 3 redo task had the hit from the wrong side; cancel it |
| 4 | **Landowner** | E. Montney only. Trigger: the first time any lane wears to the deepest rut. Once per level | Rides in along the bottom on his **quad**, stops, shakes his fist. Bubble: "Who's paying for these ruts?" Rides off | landowner_quad (side view) | **Needs a corrected task.** The Oct 3 prompt asked for a walking scold, which doesn't match the spec |
| 5 | **Bear + rabbit** (LEGENDARY) | E. Duvernay 8 to 10 only, 1 in 3 level visits. A bush stands at the bottom from level start | Walks in, squats side-on beside the bush, strains. Rabbit hops in. Bear notices, grabs it, half-squat, rump back, holds rabbit flat on rump under the tail, two wipes, relieved. Sets it down; rabbit frozen, deadpan, shakes off. Both bolt opposite ways | bear_enter, bear_wipe, rabbit_deadpan, bear_exit (side view facing right) | Clips delivered. Wire in |
| 6 | **Moose** | C. Duvernay only. Perimeter | Small peekaboo: head and antlers rise over the top fence, slow blink, chews once, stares about 2 s, groans, ducks down. Under 3 s | moose_peek (front view) | Clip delivered. Wire in |
| 7 | **Near miss** (gopher + hotshot) | E. Cardium for the gopher; perimeter | Gopher pops up from a hole by the bottom fence, smug, looks right, panics, dives in. Hotshot roars across right to left over the hole in dust (snow in Duvernay). Gopher pokes up dusty, blinks twice. Bubble from the hole: "Near miss!" | gopher_peek, hotshot_pass (two clips, same side-view camera, 1920 x 1080) | Redo task sent Oct 3 |
| 8 | **Lost goose** | B. Any region, perimeter | One lost goose wobbles left, clumsy. A proper V passes going right (Code builds the V from copies). He double-takes, honks "wait for me", chases right | goose_lead_flap_loop, goose_lost_flap_loop, goose_lost_double_take, goose_lost_chase_loop (side view) | Sent Oct 3. Check all 4 share one camera |
| 9 | **Pumpjack** (equipment, always on) | D. Montney and up | Always nods slowly, mechanically correct. Reaction: two trucks exit back to back, radio rock bursts, every pumpjack headbangs 2 s, then a calm nod | Layered PNGs + pivots (see section 7) | Prompt ready, not sent |
| 10 | **Flare stack + marshmallow** | D. Flare is a cosmetic obstacle. Gag plays beside it occasionally | Spotter walks up with a very long stick and a marshmallow, holds it to the flame; it instantly bursts and chars; he blows it out, sniffs, shrugs, eats it happily, walks off | flare_stack.png, flare_flame_loop, flare_flame_burst, marshmallow (3/4 view) | Prompt ready, not sent |
| 11 | **Porcupine** | D. "Stuck" reaction: no move for 20 s | Waddles in through the fence to the truck that has sat longest, chews its tire, the tire sags. Move that truck: he puffs up, tumbles off, waddles away offended | porcupine_waddle_loop, porcupine_chew_loop, porcupine_tumble (3/4 view) | Prompt ready, not sent |
| 12 | **Block heater cords** | D. Duvernay. Built in code, no art needed | Each truck starts plugged into a post; its first move rips the cord out, whip and sparks | none | Live |
| 13 | **Company Man + mascot** | Win card | Company Man line by result (par / +1 to +3 / worse, 3 lines each). Mascot celebrates on a perfect solve | Sprites | Live |

**Proposed Wildlife Log (10):** Magpie, Sleeping Spotter, Biffy, Landowner, Bear (legendary), Moose, Near Miss, Lost Goose, Porcupine, Marshmallow. Pending Jay's OK.

**Cut:** pumper and his truck, company man fist pump, spotter flag dance, H2S sandwich, JSA scroll, mosquitoes, Alberta weather, Greenhorn, One Bar, Country Twang music. **Parked:** tumbleweed (future Bakken region), Company Man solve replay, BC and Saskatchewan regions.

## 7. Pumpjack motion spec (must be mechanically correct)

Conventional beam pumping unit. The motor drives the gearbox by belt; the cranks and counterweights rotate continuously at constant speed (about 6 to 8 strokes per minute). Pitman arms link the crank pins to the equalizer at the tail of the walking beam. The beam rocks on the saddle bearing on the samson post. The bridle hangs straight down from the horsehead arc. The carrier bar and polished rod move straight up and down through the stuffing box, never swinging. Manus supplies separate layers plus pivot points; Code moves them with linkage math. Reference: https://en.wikipedia.org/wiki/Pumpjack

## 8. Standing rules

- **Fun first.** Anything that doesn't make the game more fun or easier to start gets cut.
- **Universal humor.** Funny to the general public, not oilfield in-jokes. Don't overdo safety jokes.
- **Accurate terminology.** Level names, lines and terms use real Canadian (Alberta) drilling, completions and field operations language. Flag anything uncertain.
- **Accurate equipment.** Real oilfield gear only (a wellhead is never a fire hydrant).
- **Subtle, not oversized.** Gags are small background moments.
- **One Manus task per gag**, with a complete, self-contained prompt built from this file. Attach the model sheets. Every prompt states zone, camera, canvas and ground line.
- **Jay approves model sheets before any clip counts.**
- **Claude Code** processes art from the Desktop folder "RHR Art Inbox" with "process art inbox", checks it against ART_BIBLE.md, and deletes originals after they're committed.
- No em dashes in anything Jay posts or sends.

## 9. Approved assets

- Model sheets approved Oct 3: spotter, bear, rabbit, magpie, moose.
- Style references: ref_spotter, ref_landowner, ref_mascot, ref_company_man (Desktop > RHR Art Inbox > _audit > style_refs).
- Equipment style: pumpjack_topdown_v1 and oilfield_tank_v2 (3/4 view).
- Cover: front power stance roughneck.

## 9b. Build order (Jay, Oct 3, after the clip audit)

Fundamentals first, then gags ONE AT A TIME. Each step is its own Claude Code job and Jay checks it on his phone before the next one starts.

1. Fundamentals job: all gags off (code kept), fit every iPhone screen with nothing cut off, one seamless pad surface, and the pipe fence replaced by a DIRT BERM with color-coded pipe gates at the entrances and exits (Jay, Oct 3: drilling leases are bermed, not fenced).
   Done Oct 3 (gags off, fit, berm, gates in berm gaps).
2. Fundamentals job 2 (lease visuals): no grid lines at all; one seamless pad per season with seeded soft variation (pebbles, low-contrast puddles, snow drifts; no baked ruts); trees in natural staggered groves, not a copy-paste row; finer grass (Montney blades half size); gates about 30% thinner.
2b. Fundamentals job 3 (screens): main page sign and Daily Pad must not run off the right edge; level list as compact rows instead of big square cards; slimmer "Pad cleared" panel; win screen roughneck and Company Man use ONE still image each with smooth code motion (no sprite frame cycling, which jitters).
   Job 3 done Oct 3. Jay: main page fixed. Foreman nod animation dropped, fine. Roughneck sits too high on the win panel: lower him level with the hard hat score.
2c. Surroundings rework (Jay, Oct 3): trees and berm still read as layered cut-outs. Proposal: one painted surround per season (berm, grass, trees, scrub as ONE image, pad area left open), with permanent gag anchors painted in: a bush on the side berm for the bear, a dirt mound with a hole for the gopher (Cardium). The hero page's two overlay clouds look pasted on desktop: match them to the sky or remove.
2d. Manus graphics review (Oct 4, Project doc claude/MANUS_GRAPHICS_REVIEW.md): the board mixes three art styles (photo textures and trees, flat toy trucks, photoreal 3/4 equipment). Recommends Direction A: the board is a flat-shaded, dark-outlined chunky toy (trucks are the reference); the cover stays Pixar. PENDING Jay's decision. Work order: trucks (colour on 3-cell bodies, smaller badges, convoy tags, one shadow, baked roof snow and grime) > winter fixes > ground, berm, vignette > gates and hints > obstacles, trees, icons > characters (with gags) > polish.
2e. Oct 4: truck art pass done (colour share 0.40+, small badges, convoy tags). Win card still broken: content overflows a fixed-size frame image (cream box covers the frame trim), score row off-center, medal clipped. Fix: frame that grows with content, one centered column, hard-hat confetti on a perfect solve, remove the blue background behind the Daily Pad #N label. Truck follow-ups: dark jagged fringe around sprites, winter snow dusting reads as white blotches.
2f. DECIDED Oct 4: board uses the table-top toy look (Manus Direction A). Board jobs in order: win card > winter + truck follow-ups > ground, berm, vignette > gates and hints > equipment, trees, icons > polish.
Oct 4: win card rebuilt and approved by Jay. Later polish (with haptics): confetti is a brief rain from the top; make it a fuller burst.
Equipment job includes ALWAYS-ON ambient motion (base, not gags): pumpjack drawn as toy layers and pumping per section 7; flare stack with a small flickering flame. The pumpjack headbang and the marshmallow stay as gags. Order after the base: Manus review #1, then gags one at a time.
Oct 4: winter job done; Jay OK with heater posts and snow caps. Fix next: side trees overlap the berm and get cut in half (all regions); keep trees clear of the berm on the left and right sides.
Oct 4: ground job done; Jay OK with berms, side trees and Duvernay snow. Fix: mud and gravel too plain (add fine code-drawn grain, gravel specks, clods); gopher mound looks out of place (render to match the scenery). Job 4 adds a snowy winter willow and redraws bush and mound with the trees. Gags must point the bear and gopher at the new anchors (bush and mound below the berm in the bottom strip).
Oct 4: texture job done, approved by Jay. Next: job 3 gates and hints.
Oct 4: gates and hints done; Jay OK with gate posts and colours. Win card still off on his iPhone: banner text low, frame bottom cut short. Rule: check visual fixes in Playwright WebKit (Safari) at iPhone DPR 3, not only Chromium.
Oct 4: level list backgrounds: Cardium and Montney look almost identical. Montney's list screen must read as spring breakup (mud, puddles, spring aspens) to match its levels; Duvernay winter already matches.
Oct 4: Safari win card fix, CLAUDE.md standing rule (read the bibles from the Desktop inbox before every job) and Montney list all done, approved. Remaining before Manus review #1: job 4a equipment in toy look plus pumpjack and flare motion; job 4b trees, bush (incl. winter willow), mound match, icons, list polish (P1-1, P1-2, P2-1, P2-2).
RULE (Jay, Oct 4): equipment (flare stack, pumpjack, tank, wellhead) is ALWAYS fully visible: drawn above trucks and above the berm, never clipped. Overhang into the next cell stays small so trucks stay readable. Flare flame never cut off by the berm or board edge.
Oct 4: BASE DONE (job 4b approved by Jay). Next: Manus review #1, which also judges how gag characters should look on the toy board (Pixar clips vs toy-look) before any gag credits are spent.
Oct 4 MANUS REVIEW #1 (claude/MANUS_REVIEW_2026-10-04.md; PDFs in the Desktop inbox): board passes as one finished game. Pixar/green-screen gag clips WILL clash with the toy board. GREEN-SCREEN CLIP PLAN FROZEN: no new gag clips or 3D renders. Gag art route PENDING Jay: proposed toy-look cut-out puppets (Manus draws one flat outlined still per character, split into parts; Code animates the parts; no frame drift). Next Code job: live shell fixes (Zero Incident ribbon clipped, wear-lane lattice, equipment-gate gap, near-miss label, quiet Reset, neutral Undo colour).
DECIDED Oct 4 (Jay): gags use the TOY LOOK, never Pixar ("looks like Wonder Pets, and then it's not funny"). Who does what: Manus draws the characters flat and outlined (from the approved model sheets); Claude Code animates and wires them; COO writes specs and previews motion before Code builds. Jay is having Manus produce an option C (frame-by-frame toy look) sample; if frames drift, fall back to puppets (Manus stills in parts, Code moves them). Magpie: a little smaller than the first mock (about 0.15 of board width, smaller than a pickup). Keep the Pixar clip's SLOW DRIP: the dropping swells slowly under the lifted tail, lets go, splats on the roof, then a thin drip runs slowly down the windshield.
DECIDED Oct 4: gag route = option C (Manus frame-by-frame, flat toy look). MAGPIE BEATS CONFIRMED BY JAY: fly in (loop, Code moves) > land > cheeky look at player + blink > slow tail lift > dropping swells slowly, lets go, splats on roof (splat stays) > thin drip runs slowly down the windshield > smug hold > "Seriously?" bubble (Code) > take off. Bird about 40 px wide. Thinner outline than Manus's test, big white belly, white shoulder patch, long blue-green tail, forward eye. Manus prompt: Desktop inbox MANUS_MAGPIE_PROMPT.md (two steps: pose approval, then all frames).
Oct 4: Jay found Manus's step 1 magpie underwhelming; he preferred the COO's toy puppet but wants it more comical. Asked Manus for 3 character options (chunky toy, cocky troublemaker, Manus's pick). COO built "Magpie, take two" puppet preview (artifact) as the bar to beat.
ANIMATION QUALITY RULES (Jay, Oct 4: no lazy animation, e.g. never just float away backwards): characters always face the way they travel (turn first, with a hop-turn); anticipation before every big move (crouch before take-off, crouch before tail lift); squash and stretch on landing and launch; moves follow arcs, never straight slides; follow-through on tail and wings; ease in and out; secondary acting (glances, blinks, chuckles); a small comic payoff where possible (e.g. a feather left behind). Every gag is acted, not just moved.
EVOLUTION REEL (Jay, Oct 4; do at the very END, before submission): Code rebuilds old commits in a separate worktree and captures the same screens at phone size, to show how far the game came (M1 to now). Output: ~/Desktop/RHR Art Inbox/evolution/. Used in the submission video and post.
MANUS REVIEW CHECKPOINTS (Jay, Oct 4): at each critical crossroad, Jay has Manus play every screen of the live build and write a ranked graphics and gameplay review (like MANUS_GRAPHICS_REVIEW.md); findings feed the next Code jobs. Checkpoints: (1) after the board toy-look jobs, before gags start; (2) after the gags are wired in; (3) about Oct 26, before the submission video. Review prompt: Project doc claude/MANUS_REVIEW_PROMPT.md.
3. Then gags, one at a time, each through: beats confirmed by Jay > Manus clips (in-place, hand-off poses) > audit > wire in > phone check.
4. After gags and graphics are done (Jay, Oct 3): sound pass with Manus. Generate new sound bites and music to replace the current Claude Code synthesized sounds and music (diesel idle, air-brake hiss, horn chord, exits, win, gag sounds, menu music). Sound stays off by default with one tap to turn on.

Gag notes from the audit: landowner must drive in and out on his quad (in-place drive loop slid by Code, then a stationary fist shake); lost goose needs a more erratic flight path (Code's path wobble plus a clumsier flap loop); biffy needs biffy_bump to hand off to the open door before the worker clip. Clip audit report: Desktop > RHR Art Inbox > clip_audit > CLIP_AUDIT.md.

## 10. Decisions log

| Date | Decision |
|---|---|
| Sep 29 | Game picked: Rush Hour Rigs, oilfield theme |
| Sep 30 | M1 shipped. Fun gate passed. Bump bubbles from the truck that got hit |
| Oct 1 | Keep the name Rush Hour Rigs. Progression locks plus demo mode. Accelerate to a friends and family beta. Expand regions by province later |
| Oct 2 | Gags small and subtle. Wildlife Log as easter eggs, not points. Magpie 10 s, spotter 20 s. Biffy behind a tailgate, side profile. Landowner on a quad at the bottom. Moose at the top. Country Twang cut |
| Oct 3 | Pixar-style art direction. Equipment must be accurate. Gags move to video clips from approved model sheets. No mixing old and new art in a scene. Living lease: pumpjack headbang on great moves, porcupine when stuck, flare stack marshmallow. Gopher and hotshot combined into Near Miss as two clips. Lost goose story. One Manus task per gag. Camera locked per zone |
