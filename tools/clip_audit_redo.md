## The 3 biggest problems

1. **No hand-off matches.** All 11 clip-to-clip hand-offs fail (best 2.2x, worst 161x). Clips were made one at a time with no shared start and end pose, so every cut would pop.
2. **Characters travel.** 20 of 23 clips move the character across the frame, cut it at an edge, or have it enter or leave. The game is supposed to do the travelling.
3. **Camera and scale change inside a gag.** Magpie (34% size change), bear (25%), goose (61%) and biffy (11%) are framed differently from clip to clip; several are off spec (rabbit and goose double-take face the camera, near-miss is one 720p clip, the landowner walks instead of riding his quad).

## Manus redo list

One task per gag (GAME_BIBLE section 8). Each prompt is complete on its own. Attach the named model sheet(s).

### 1. Magpie (replaces magpie_land, magpie_poop, magpie_fly_off)

Rig Jam, magpie gag. Stylized Pixar-like 3D, soft warm light from the top left, match the attached magpie model sheet exactly. ONE locked camera for all three clips: pure side view, bird facing right, 1080 x 1080, 24 fps, solid #00FF00 background, no ground, no shadow, no text. The magpie stays IN PLACE in every clip: body centred at frame centre, feet line at 70% of frame height, the whole bird (tail included) inside the frame with a 10% margin, same size in all three (bird about 40% of frame width). It never enters, leaves or crosses the frame; the game moves it.
Pose A = standing side-on, wings folded, tail level. Pose F = mid-flap in flight, wings level, feet tucked.
- `magpie_land.mp4` (2 s): starts in Pose F flapping in place, flares its wings, feet come down, ends in Pose A.
- `magpie_poop.mp4` (3 s): starts in Pose A, small hop in place, cheeky look at the camera, tail lifts, a small white dropping falls, tail settles, ends in Pose A.
- `magpie_fly_off.mp4` (2 s): starts in Pose A, crouches, springs up, ends flapping in Pose F.
The last frame of each clip must be identical to the first frame of the next. Also deliver `magpie_fly_loop.mp4` (1 s): Pose F flap cycle in place, last frame identical to the first.

### 2. Sleeping spotter (replaces spotter_sit, spotter_sleep_loop, spotter_wake)

Rig Jam, sleeping spotter gag. Stylized Pixar-like 3D, match the attached spotter model sheet exactly: red FR coveralls with reflective stripes, hi-vis vest, white hard hat, safety glasses, gloves, boots, gas monitor at the chest. NO flags. ONE locked camera for every clip: front 3/4 view at ground level, 1080 x 1080, 24 fps, #00FF00 background, ground line at 80% of frame height, no shadow, no text, no Zs. He stays IN PLACE: feet centred on the ground line, whole body and the orange pail inside the frame with a 10% margin, same size in every clip.
Pose S = sitting on the upturned orange pail, hands on knees, head up. Pose Z = same seat, head dropped forward, asleep.
- `spotter_walk_loop.mp4` (1 s): walking in place carrying the pail by its handle; last frame identical to the first.
- `spotter_sit.mp4` (3 s): starts standing with the pail, sets it down upside down, sits, settles into Pose S, nods off, ends in Pose Z.
- `spotter_sleep_loop.mp4` (4 s): Pose Z, slow breathing, head bobs; last frame identical to the first (Pose Z).
- `spotter_wake.mp4` (2 s): starts in Pose Z, jolts awake eyes wide, topples backward off the pail onto the ground (the pail stays put), scrambles to his feet, ends standing in a startled run-ready pose, still in place.
- `spotter_run_loop.mp4` (1 s): panicked run in place; last frame identical to the first.

### 3. Biffy (replaces biffy_bump; biffy_shuffle was rescued as a loop but a matched pair is better)

Rig Jam, biffy gag. Stylized Pixar-like 3D, match the attached biffy_worker model sheet. ONE locked camera for both clips: pure side view at ground level, 1080 x 1080, 24 fps, #00FF00 background, ground line at 80% of frame height, no shadow, no text. The blue portable toilet with white roof stands with its door facing right; the unseen fence and truck are to its LEFT (behind it). Biffy the same size and position in both clips (about 45% of frame height, base on the ground line, centred at 35% of frame width).
- `biffy_bump.mp4` (2 s): starts with the biffy still, door shut. It is hit from BEHIND (from the left): it jolts and rocks toward the right twice, the door bangs open to the right. Ends with the door open, biffy still.
- `biffy_worker_shuffle_loop.mp4` (1 s): the worker alone, no biffy, IN PLACE, strict side profile facing right, never facing the camera: bent over, pants round his ankles, trying to pull them up, tiny quick shuffling steps, the side of one round bare cartoon cheek (no detail), toilet paper stuck to his boot trailing behind, mortified face. Feet centred on the ground line; last frame identical to the first.
- `biffy_worker_step_out.mp4` (2 s): starts on the last frame of biffy_bump (door open, biffy included); the worker steps out through the door in that same side profile; ends with him just clear of the door in the first pose of the shuffle loop.

### 4. Landowner on his quad (replaces landowner_scold)

Rig Jam, landowner gag. Stylized Pixar-like 3D, match the attached landowner model sheet: older rancher, cowboy hat, plaid shirt, jeans, work boots, grey moustache. He rides a red utility quad (ATV), no brand marks. ONE locked camera: pure side view at ground level, quad facing LEFT, 1080 x 1080, 24 fps, #00FF00 background, ground line at 80% of frame height, no shadow, no text. Quad and rider stay IN PLACE, centred, whole quad inside the frame with a 10% margin, same size in every clip.
Pose R = seated, both hands on the bars.
- `landowner_quad_ride_loop.mp4` (1 s): riding in place in Pose R, wheels turning, body bouncing; last frame identical to the first.
- `landowner_quad_scold.mp4` (3 s): starts in Pose R with the wheels stopped, he rises a little, shakes his fist toward the upper left three times, scowling, sits back; ends in Pose R.

### 5. Bear and rabbit (replaces bear_enter, bear_wipe, bear_exit, rabbit_deadpan)

Rig Jam, legendary bear gag. Stylized Pixar-like 3D, match the attached bear and rabbit model sheets. ONE locked camera for every clip: pure side view at ground level, bear facing RIGHT, 1080 x 1080, 24 fps, #00FF00 background, ground line at 80% of frame height, no shadow, no bush, no text. The bear stays IN PLACE, feet centred on the ground line, whole body inside the frame with a 10% margin, same size in every clip (standing on all fours he is about 45% of frame height).
Pose W = standing on all fours, side-on. Pose Q = squatting side-on, rump back.
- `bear_walk_loop.mp4` (1 s): walk cycle in place from Pose W; last frame identical to the first.
- `bear_squat.mp4` (4 s): starts in Pose W, turns his rump back and squats into Pose Q, strains with eyes squeezed shut; ends in Pose Q, eyes open, head turned down to the right as if noticing something small.
- `bear_wipe.mp4` (4 s): starts on the last frame of bear_squat. His near paw reaches forward and down to the right, lifts a small grey-brown rabbit, swings it behind him, holds it flat against his rump under the stubby tail, two short up-and-down wipes, relieved face, then sets it back down in front of him; ends in Pose Q with the paw back on his knee. The rabbit is part of this clip only between pick-up and set-down, and appears and disappears at the bear's front paw, low right, at 75% of frame width on the ground line.
- `bear_stand.mp4` (1 s): starts in Pose Q, stands, ends in Pose W.
- `rabbit_deadpan.mp4` (3 s), the rabbit alone, same camera, PURE SIDE VIEW facing left, feet centred on the ground line, about 15% of frame height, IN PLACE: frozen stiff with fur frazzled and a flat unimpressed face for 1.5 s, then shakes off like a wet dog; ends sitting side-on, fur smooth.
- `rabbit_hop_loop.mp4` (1 s): hop cycle in place, side view; last frame identical to the first.

### 6. Near miss: gopher and hotshot (replaces gopher_hotshot)

Rig Jam, near-miss gag. Stylized Pixar-like 3D, match the attached gopher and hotshot model sheets. Two clips on ONE locked camera: pure side view at ground level, 1920 x 1080, 24 fps, #00FF00 background, ground line at 80% of frame height, no shadow, no text.
- `gopher_peek.mp4` (5 s): a Richardson's ground squirrel and its dirt mound, IN PLACE at the centre of the frame, mound base on the ground line, gopher about 12% of frame height. Starts with the empty hole; he pops up, smug, looks right, eyes go wide, dives in; 1 s of the empty hole; he pokes back up covered in dust and blinks twice; ends with him looking out, dusty.
- `hotshot_drive_loop.mp4` (1 s): a generic white 1-ton crew cab DUALLY pickup (made-up grille, light bar, buggy whip flag) towing a black gooseneck flatdeck trailer, facing LEFT, IN PLACE and centred, wheels on the ground line, truck and trailer together about 80% of frame width (about 6x the gopher's height), wheels spinning fast, body shaking; last frame identical to the first. No dust (the game adds it).

### 7. Lost goose (replaces goose_lost_double_take; the three loops are usable after re-centring)

Rig Jam, lost goose gag. Stylized Pixar-like 3D, match the attached goose model sheet. ONE locked camera for all clips: PURE SIDE VIEW, 720 x 720, 24 fps, #00FF00 background, no text. The goose stays IN PLACE with its body centred at frame centre, the same size in every clip (wingspan about 40% of frame width), never facing the camera.
Pose L = mid-flap flying LEFT, clumsy and wobbly. Pose R = mid-flap flying RIGHT, neck stretched, determined.
- `goose_lost_flap_loop.mp4` (2 s): Pose L wobbling flap cycle; last frame identical to the first.
- `goose_lost_double_take.mp4` (3 s): starts in Pose L, glances back over his shoulder to the right, snaps his head round in a double take, flips to face right in place, honks; ends in Pose R.
- `goose_lost_chase_loop.mp4` (2 s): Pose R frantic flap cycle; last frame identical to the first.
- `goose_lead_flap_loop.mp4` (2 s): a calm, proper goose flying right, steady flap cycle, same size and position; last frame identical to the first.

### No redo needed

`spotter_wave` (flag dance cut), `biffy_rock`, `biffy_door_close`, `biffy_exit` (superseded), and the moose (usable; ask for a 3 s version only if speeding it up in the game looks wrong).
