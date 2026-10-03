# Rush Hour Rigs: Art Bible

Every image for the game follows this file. If an image breaks a rule here, it is rejected.

## 1. Style

- Stylized Pixar-like 3D. Match the cover image (the roughneck with the pipe wrench): exaggerated proportions, expressive comedic faces, realistic materials (FR cotton, hi-vis fabric, weathered steel, rubber, fur), soft warm cinematic lighting from the top left.
- Light weathering: dust, a little mud, worn paint edges. Never heavy rust or junk.
- Colors bright and saturated, but believable. Equipment colors follow the specs below.

## 2. Technical rules (every file)

- Transparent PNG background, except ground and grass tiles.
- No ground shadow, no glow, no halo. The game adds shadows.
- No text, numbers, logos, brand names or real grille designs anywhere. Signs are blank.
- Camera:
  - **Top-down** (straight down, no perspective): trucks, ground tiles, grass tiles, fence, gates.
  - **3/4 high angle**: everything that stands up (equipment, scenery, characters, props).
- One version per item. Use the exact file names given in the batch list.
- Animations: frame sequences, all frames the same canvas, subject locked in the same spot. Deliver individual frames and one horizontal sprite sheet: `<name>_<action>_01.png` and `<name>_<action>_sheet.png`.

## 3. Accuracy spec: Alberta oilfield

### Equipment
- **Wellhead (production tree):** casing head flange at ground level, stacked master valve(s) with round handwheels, a tee or cross with one wing valve leading to a short flowline, a pressure gauge on top. Usually red or grey. Sits on gravel, often with yellow guard posts. **It is NOT a fire hydrant.**
- **Pumpjack (beam pumping unit):** skid base, A-frame samson post, walking beam, horsehead on the well end with a wireline bridle, carrier bar and polished rod going down into a stuffing box on the wellhead, pitman arms, crank arms with counterweights, gearbox, electric motor with belt guard. Common colors: grey beam, orange or red horsehead.
- **400 bbl tank:** vertical welded steel tank, about as tall as it is wide, shallow cone roof, thief hatch and vent on the roof, ladder or stairs with a small railed walkway, load line valve near the bottom. Tan, grey or green paint. Welded seams, no rivets.
- **Lease fence:** steel pipe rail on round pipe posts, welded. No wood boards, no chain link.
- **Gate:** pipe swing gate on welded hinges, chain latch on the far post.

### Vehicles (top-down, cab facing up, cab body painted plain WHITE so the game can tint it)
- **Pickup:** 3/4 or 1-ton crew cab, open box, toolbox across the front of the box, light bar, buggy whip flag mount, mud flaps.
- **Picker truck:** straight truck with flat deck and a folded knuckle-boom crane behind the cab, outriggers stowed.
- **Vac truck:** round tank with rear dome hatch, hose trays down the sides, vacuum pump behind the cab.
- **Frac pump truck:** tractor or straight truck carrying a large triplex or quintuplex pump and diesel engine with radiator, discharge iron on the side.
- **Water hauler:** smooth oval tank, top walkway with hatches, side ladder, rear valves and hose.
- **Hotshot:** 1-ton dually pickup towing a gooseneck flatdeck trailer.
- **Pumper's truck:** white company pickup, light bar, buggy whip flag.

### People (PPE is never optional)
- **All field workers:** FR coveralls (red or navy) with reflective stripes, hard hat, safety glasses, gloves, steel-toe boots, a small gas monitor clipped at the chest.
- **Spotter:** same, plus a hi-vis vest and two orange flags.
- **Company man:** white hard hat, FR shirt and jeans or coveralls, clipboard, grumpy.
- **Pumper (lease operator):** coveralls, gas monitor, clipboard or tablet.
- **Landowner:** older rancher, cowboy hat, plaid shirt, jeans, work boots. Not a cartoon oil baron.

### Wildlife and scenery
- **Black bear, moose, magpie, Richardson's ground squirrel, Canada goose:** true to the real Alberta animal, stylized.
- **Trees:** white spruce, trembling aspen (white bark), willow shrubs. Prairie grass and slough cattails are allowed.
- **Biffy:** blue portable toilet with white roof.

## 4. Never draw

Fire hydrants, traffic cones, construction barrels, concrete culvert pipes, excavators, tower cranes, hard-hat-less workers, oil gushers, wooden derricks, cartoon oil barons, red oil drums as main props, palm trees, desert, cacti, any text or logo.

## 5. Batch list

**Batch A: World**
`tree_spruce_summer`, `tree_spruce_winter`, `tree_aspen_summer`, `tree_aspen_spring`, `bush_willow`, `cattails`, `lease_sign_blank` (all 3/4 view, 512 x 512).

**Batch B: UI** (front view, chunky Pixar-style)
`btn_undo` (blue), `btn_hint` (yellow), `btn_restart` (orange): 512 x 192, blank faces. `icon_gear`, `icon_binoculars`, `icon_speaker_on`, `icon_speaker_off`, `icon_back`, `icon_padlock`, `icon_hardhat_full`, `icon_hardhat_empty`: 256 x 256. `badge_zero_incident`: 512 x 512. `sign_days_without_incident`: 1024 x 512, green and white, blank number space. `panel_win`: 1024 x 1280, blank interior. `card_level`, `card_level_locked`: 512 x 512.

**Batch C: Characters and gags** (animations, canvas 512 x 512 unless noted, 8 frames per action unless noted)
1. `magpie`: hop, take_off, fly (loop), land, poop. Plus `magpie_splat.png`.
2. `spotter`: jog (loop), flag_wave (12), shrug, sit_on_bucket, sleep (12, loop, Zs), wake_startle.
3. `biffy`: door_open, door_close, rock_shake (loop). `biffy_worker`: step_out (12), stretch, walk (loop).
4. `landowner`: walk (loop), arms_cross, finger_wag, head_shake.
5. `hotshot` (1024 x 512, side 3/4 view): drive (loop), brake, dust_puff.
6. `bear`: walk (loop), sit, sniff, half_squat, wipe (12: holds a rabbit flat on his rump under the tail, two strokes, relieved face), set_down. `rabbit`: deadpan_idle (ears flop), hop_away.
7. `moose` (head, antlers and neck peeking over a pipe fence): rise, blink (6), chew, stare (6), duck.
8. `gopher`: hole_open (6), peek, look_left_right, stand_tall (6), whistle (with a small music note), drop_down (6), hole_close (6).
9. `canada_goose` (256 x 256): flap (loop), glide (4), honk (6).
10. `pumper`: get_out, walk (loop), check_gauge, write_clipboard, get_in. `pumper_truck` (1024 x 512): drive (loop), door_open (6), door_close (6). `gauge_post`: needle_wiggle.
11. `company_man` (chest-up portrait): idle (loop), scowl (6), nod (6), shock (6), fist_pump.
12. `roughneck_mascot` (match the cover character exactly, full body): idle (loop), celebrate (12), facepalm.

**Batch D: Equipment refresh** (only if Batch A to C look better than the current equipment)
`pumpjack` (with `pumpjack_beam` as a separate layer so it can nod), `tank_400bbl`, `wellhead`: 3/4 view, 512 x 512.
