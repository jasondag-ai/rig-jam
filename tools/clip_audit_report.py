#!/usr/bin/env python3
"""Writes CLIP_AUDIT.md from clip_audit.py's results.json plus the reviewer's verdict notes below.
Run: python tools/clip_audit_report.py "<clip_audit folder>" """
import json, os, sys

# Reviewer notes per clip: (on-model, verdict, exact reason). Measured numbers come from results.json.
NOTES = {
 'bear_enter': ('yes', 'REJECT', 'Walks in from off frame (travel 56% of width, out of frame 6 frames); best in-place walk loop still has a visible seam (4.0x); ends 25% bigger than bear_wipe starts'),
 'bear_wipe': ('yes', 'REJECT', 'Bear is cut by the frame edge for 71 frames; does not start where bear_enter ends (hand-off 5.2x, overlap 68%) or end where bear_exit starts (2.2x, 69%)'),
 'bear_exit': ('yes', 'REJECT', 'Walks out of frame (travel 61%); best in-place loop seam 2.7x even with a 3-frame crossfade'),
 'rabbit_deadpan': ('no: front view, Bible says side view', 'REJECT', 'Faces the camera instead of side-on; moves 16% and is gone from the last frame (leaves frame)'),
 'biffy_bump': ('yes', 'REJECT', 'In place, but biffy_shuffle does not start where it ends (hand-off 22x, overlap 63%: the biffy is a different size and the door is already open)'),
 'biffy_shuffle': ('worker partly faces the camera at the start; Bible says strict side profile', 'RESCUED', 'Original walks 18% and is cut by the edge; rescued as a 19-frame in-place shuffle loop (frames 24-42, 1-frame crossfade, seam 1.27x). Usable only as the shuffle cycle; still needs a matching biffy_bump'),
 'biffy_rock': ('yes', 'REJECT', 'Not in the Bible clip list (superseded by biffy_bump); 720px, older camera'),
 'biffy_door_close': ('yes', 'REJECT', 'Not in the Bible clip list; door swing moves the bounding box 11%'),
 'biffy_exit': ('yes', 'REJECT', 'Not in the Bible clip list (superseded by biffy_shuffle); touches the frame edge in every frame'),
 'goose_lead_flap_loop': ('yes', 'RESCUED', 'Loop seam passes (0.11x) but the body bobs 20% of the frame; re-centred on the body, 47 frames, seam 1.22x, travel 0'),
 'goose_lost_flap_loop': ('yes', 'USE AS IS', 'In place (4% / 8%), seam 0.23x. Note: drawn 2.5x bigger in frame than the chase loop, so the game must scale it'),
 'goose_lost_double_take': ('faces the camera; Bible says side view', 'REJECT', 'Travels 29% and touches the edge; does not match the flap loop before it (7.2x, overlap 43%) or the chase loop after it (3.3x, 36%)'),
 'goose_lost_chase_loop': ('yes', 'RESCUED', 'Loop seam passes (0.09x) but bobs 11%; re-centred, 47 frames, seam 1.31x, travel 0'),
 'gopher_hotshot': ('yes', 'REJECT', 'One combined 1280x720 clip; the Bible wants two clips (gopher_peek, hotshot_pass) at 1920x1080 on one camera. The hotshot crosses the frame (82 edge frames) and the ground is at 98%, not 80%'),
 'landowner_scold': ('yes', 'REJECT', 'Off spec: the Bible gag is the landowner on his quad, not a walking scold. He also walks through the frame (53%, gone for 12 frames). A 13-frame in-place walk loop was salvaged (seam 0.97x) but the gag has no use for it'),
 'magpie_land': ('yes', 'REJECT', 'Flies in from off frame (73%, out of frame 2 frames); ends 34% smaller than magpie_poop starts (hand-off 161x, overlap 58%)'),
 'magpie_poop': ('yes', 'REJECT', 'Tail is cut by the left edge for 13 frames; drawn much bigger than the other two magpie clips; next clip does not match (10x, overlap 81%)'),
 'magpie_fly_off': ('yes', 'REJECT', 'Flies out of frame (25% / 28%, edge 26 frames); best in-place flap loop seam 2.1x'),
 'moose_peek': ('yes', 'USE AS IS', 'In place (0%). Touches the bottom edge in every frame by design (zone C: the fence line is the bottom edge). 7 s long; the Bible wants under 3 s, so the game must play it faster or trim it'),
 'spotter_sit': ('yes, but he carries two flags and no pail in hand (flags were cut)', 'REJECT', 'Walks in (25%, edge 30 frames); spotter_sleep_loop does not start where it ends (hand-off 95x, overlap 67%)'),
 'spotter_sleep_loop': ('yes', 'REJECT', 'In place, but the loop seam shows: 2.95x; best trim plus a 3-frame crossfade still 1.84x (limit 1.5x)'),
 'spotter_wake': ('yes', 'REJECT', 'Does not start where the sleep loop ends (18x) and ends sitting on the pail; the Bible has him topple off the pail and scramble away'),
 'spotter_wave': ('yes', 'REJECT', 'The flag dance was cut (Bible section 6); not used'),
}


def main(out):
    r = json.load(open(os.path.join(out, 'results.json')))
    clips, hand, cam = r['clips'], r['handoffs'], r['camera']
    rows = []
    counts = {}
    for name, c in clips.items():
        om, verdict, reason = NOTES[name]
        counts[verdict] = counts.get(verdict, 0) + 1
        travel = f"{'TRAVELING' if c.get('traveling') else 'in place'} (x {c.get('travel_x', 0):.0%}, y {c.get('travel_y', 0):.0%}, edge {c.get('edge_frames', 0)}f, empty {c['empty_frames']}f)"
        seam = f"{c.get('seam')}x {'PASS' if c.get('loop_pass') else 'FAIL'}" + ('' if c['is_loop'] else ' (not a loop)')
        hs = [f"{k.replace(name, '·')}: {'PASS' if v['pass'] else 'FAIL'} ({v.get('ratio', '-')}x, {int(v.get('overlap', 0) * 100)}%)" for k, v in hand.items() if name in k.split('->')]
        g = cam.get(c['gag'])
        camera = 'single clip' if not g else ('match' if g['match'] else f"MISMATCH (ground {g['ground_spread']:.0%}, height {g['height_spread']:.0%})")
        rows.append(f"| {c['file']} | {c['gag']} | {c['res']}, {c['fps']} fps, {c['duration']:.0f} s, {c['frames']} f | {travel} | {seam} | {'<br>'.join(hs) or 'n/a'} | {camera} | {om} | **{verdict}** | {reason} |")
    body = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clip_audit_redo.md')).read()
    with open(os.path.join(out, 'CLIP_AUDIT.md'), 'w') as f:
        f.write(f"""# Rig Jam: clip audit ({len(clips)} clips)

Measured by `tools/clip_audit.py` on copies in `clips_raw/` (originals untouched), against
GAME_BIBLE.md sections 4 and 6. Green screen keyed out on every frame; all numbers use the foreground.

**Verdicts: {counts.get('USE AS IS', 0)} USE AS IS, {counts.get('RESCUED', 0)} RESCUED, {counts.get('REJECT', 0)} REJECT.**

How to read it: travel = how far the feet anchor (centre of mass for birds) moves, as a share of
frame width, plus frames touching an edge or empty. Loop seam = last-to-first frame difference
divided by the median frame-to-frame difference (PASS at 1.5x or less). Hand-off = previous clip's
last frame vs this clip's first (PASS at 1.5x or less AND 90% bounding-box overlap). Camera = ground
line and character height across the gag's clips (MISMATCH over 10%).

Previews: `previews/<clip>_first_last_seam.png` (first, last, difference), `previews/<clip>_loop_x3.gif`,
`previews/<clip>_RESCUE_pass_x3.gif`, `previews/gag_<gag>_handoffs.png`. Rescued loops (transparent
PNG frames, 360 px): `rescued/`.

| File | Gag | Resolution, fps, length | Travel | Loop seam | Hand-off | Camera | On-model | Verdict | Exact reason |
|---|---|---|---|---|---|---|---|---|---|
""" + '\n'.join(rows) + '\n\n' + body)
    print(counts)


if __name__ == '__main__':
    main(sys.argv[1])
