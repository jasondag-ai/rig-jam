#!/usr/bin/env python3
"""Clip audit and salvage for Manus video clips (GAME_BIBLE.md sections 4 and 6).

Reads copies of the clips (never the originals), keys out the #00FF00 background, and measures:
  travel     foreground bottom-centre track; TRAVELING if it moves > 10% of frame width or the
             character touches a frame edge
  loop seam  alpha-weighted mean abs difference last vs first frame, against the median difference
             between consecutive frames; PASS if seam <= 1.5 x median
  hand-off   A's last frame vs B's first frame (same metric, plus bounding-box overlap >= 90%)
  camera     ground line and character height across a gag's clips; flag > 10% apart
Salvage (copies only): re-centre travelling cycles on the feet anchor and search for the best loop;
trim near-miss loops to a better loop point. Rescued clips are re-measured and only kept if they pass.

Writes previews, rescued loops (PNG frames + GIF) and results.json into the audit folder.
Needs ffmpeg, numpy, Pillow.  Run:  python tools/clip_audit.py "<clips_raw>" "<clip_audit>"
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

W = 360  # measurement width (frames are scaled to this; fps kept)
TRAVEL_LIMIT = 0.10
SEAM_LIMIT = 1.5
EDGE = 2  # px at measurement scale
MIN_LOOP = 12  # frames (half a second at 24 fps): at least one full stride or wingbeat

# Gag sequences from GAME_BIBLE.md section 6 (order = hand-off order). `loop`: must loop.
# `cycle`: contains a walk / shuffle / waddle / fly / drive cycle worth salvaging if it travels.
GAGS = {
    'magpie': ['magpie_land', 'magpie_poop', 'magpie_fly_off'],
    'spotter': ['spotter_sit', 'spotter_sleep_loop', 'spotter_wake'],
    'biffy': ['biffy_bump', 'biffy_shuffle'],
    'bear': ['bear_enter', 'bear_wipe', 'bear_exit'],
    'rabbit': ['rabbit_deadpan'],
    'moose': ['moose_peek'],
    'goose': ['goose_lost_flap_loop', 'goose_lost_double_take', 'goose_lost_chase_loop'],
    'goose_lead': ['goose_lead_flap_loop'],
    # Not in the Bible's clip list (older or off-spec deliveries):
    'biffy_old': ['biffy_rock', 'biffy_door_close', 'biffy_exit'],
    'landowner_offspec': ['landowner_scold'],
    'near_miss_offspec': ['gopher_hotshot'],
    'spotter_cut': ['spotter_wave'],
}
LOOPS = {'spotter_sleep_loop', 'goose_lead_flap_loop', 'goose_lost_flap_loop', 'goose_lost_chase_loop', 'biffy_shuffle'}
# Flyers have no feet on the ground: their anchor is the centre of mass, not the lowest point
# (a wing tip dipping below the body is not travel).
FLYERS = {'goose_lead_flap_loop', 'goose_lost_flap_loop', 'goose_lost_chase_loop', 'goose_lost_double_take', 'magpie_land', 'magpie_fly_off'}
XFADE = 3  # longest crossfade allowed when closing a loop (frames)
CYCLES = LOOPS | {'bear_enter', 'bear_exit', 'biffy_exit', 'magpie_fly_off', 'magpie_land', 'landowner_scold', 'biffy_rock'}


def frames(path):
    """All frames as float RGB arrays (h, w, 3) at measurement scale."""
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:-2:flags=area', os.path.join(d, '%04d.png')], check=True)
        return [np.asarray(Image.open(os.path.join(d, f)).convert('RGB'), dtype=np.float32) for f in sorted(os.listdir(d))]


def key(rgb):
    """Chroma key #00FF00: soft alpha (0..1) and despilled RGB."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = g - np.maximum(r, b)  # how much greener than anything else
    alpha = 1 - np.clip((green - 40) / 60, 0, 1)  # soft edge between 40 and 100
    out = rgb.copy()
    out[..., 1] = np.minimum(g, np.maximum(r, b) + 8)  # remove green spill
    return alpha, out


def bbox(alpha):
    ys, xs = np.where(alpha > 0.5)
    if len(xs) < 20:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def diff(a, b):
    """Alpha-weighted mean abs difference between two keyed frames (0..255)."""
    (aa, ar), (ba, br) = a, b
    w = np.maximum(aa, ba)
    if w.sum() < 1:
        return 0.0
    d = np.abs(ar * aa[..., None] - br * ba[..., None]).mean(axis=2)
    return float((d * w).sum() / w.sum())


def overlap(a, b):
    if not a or not b:
        return 0.0
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / union if union else 0.0


def anchor(alpha, box, flyer):
    """Feet anchor (bbox bottom-centre), or the centre of mass for a flyer."""
    if flyer:
        ys, xs = np.nonzero(alpha > 0.5)
        return float(xs.mean()), float(ys.mean())
    return (box[0] + box[2]) / 2, float(box[3])


def crossfade(seq, i, j, k):
    """Loop seq[i:j] with its last k frames blended toward the k frames before i (k <= XFADE)."""
    loop = list(seq[i:j])
    for t in range(k):
        w = (t + 1) / (k + 1)
        (a1, r1), (a2, r2) = seq[j - k + t], seq[i - k + t]
        loop[len(loop) - k + t] = (a1 * (1 - w) + a2 * w, r1 * (1 - w) + r2 * w)
    return loop


def seam_ratio(loop):
    med = float(np.median([diff(loop[k], loop[k + 1]) for k in range(len(loop) - 1)])) or 1e-6
    return diff(loop[-1], loop[0]) / med


def recenter(keyed, boxes, flyer=False):
    """Every frame shifted so its feet anchor (bbox bottom-centre) sits at a fixed point."""
    h, w = keyed[0][0].shape
    # Centred left to right; kept at the height the character already stands (so nothing is cut off).
    ax = w // 2
    ay = int(round(float(np.median([anchor(a, bx, flyer)[1] for (a, _), bx in zip(keyed, boxes)]))))
    out = []
    for (a, rgb), bx in zip(keyed, boxes):
        px, py = anchor(a, bx, flyer)
        dx, dy = int(round(ax - px)), int(round(ay - py))
        na = np.zeros_like(a)
        nr = np.zeros_like(rgb)
        ys, xs = slice(max(0, dy), min(h, h + dy)), slice(max(0, dx), min(w, w + dx))
        yo, xo = slice(max(0, -dy), min(h, h - dy)), slice(max(0, -dx), min(w, w - dx))
        na[ys, xs] = a[yo, xo]
        nr[ys, xs] = rgb[yo, xo]
        out.append((na, nr))
    return out


def best_loop(keyed, lo=0, hi=None):
    """(seam/median ratio, i, j): the frame pair at least MIN_LOOP apart with the smallest seam."""
    hi = len(keyed) if hi is None else hi
    consec = [diff(keyed[i], keyed[i + 1]) for i in range(lo, hi - 1)]
    if not consec:
        return None
    med = float(np.median(consec)) or 1e-6
    best = None
    for i in range(lo, hi - MIN_LOOP):
        for j in range(i + MIN_LOOP, hi):
            # Playing i..j-1 then back to i: the seam is frame j-1 -> i, so compare j with i.
            s = diff(keyed[j], keyed[i])
            if best is None or s < best[0]:
                best = (s, i, j)
    return (best[0] / med, best[1], best[2], med) if best else None


def comp(k, bg=(46, 52, 64)):
    a, rgb = k
    out = rgb * a[..., None] + np.array(bg, dtype=np.float32) * (1 - a[..., None])
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def gif(keyed, path, times=3, fps=24):
    ims = [comp(k) for k in keyed] * times
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0)


def measure(name, keyed, fps):
    boxes = [bbox(a) for a, _ in keyed]
    h, w = keyed[0][0].shape
    seen = [b for b in boxes if b]
    r = {'frames': len(keyed), 'empty_frames': len(boxes) - len(seen)}
    if not seen:
        return r | {'travel': 'EMPTY'}, boxes
    pts = [anchor(a, b, name.replace('_rescued', '') in FLYERS) for (a, _), b in zip(keyed, boxes) if b]
    cx = [p[0] for p in pts]
    by = [p[1] for p in pts]
    touch = sum(1 for b in seen if b[0] <= EDGE or b[2] >= w - EDGE or b[1] <= EDGE)
    r['travel_x'] = round((max(cx) - min(cx)) / w, 3)
    r['travel_y'] = round((max(by) - min(by)) / w, 3)
    r['edge_frames'] = touch
    r['leaves_frame'] = r['empty_frames'] > 0
    r['traveling'] = bool(max(r['travel_x'], r['travel_y']) > TRAVEL_LIMIT or touch > 0 or r['empty_frames'] > 0)
    consec = [diff(keyed[i], keyed[i + 1]) for i in range(len(keyed) - 1)]
    med = float(np.median(consec)) or 1e-6
    r['seam'] = round(diff(keyed[-1], keyed[0]) / med, 2)
    r['loop_pass'] = bool(r['seam'] <= SEAM_LIMIT)
    r['ground'] = round(float(np.median([b[3] for b in seen])) / h, 3)
    r['height'] = round(float(np.median([b[3] - b[1] for b in seen])) / h, 3)
    return r, boxes


def main(src, out):
    prev = os.path.join(out, 'previews')
    resc = os.path.join(out, 'rescued')
    os.makedirs(prev, exist_ok=True)
    os.makedirs(resc, exist_ok=True)
    results, cache = {}, {}
    gag_of = {c: g for g, cs in GAGS.items() for c in cs}
    for f in sorted(os.listdir(src)):
        if not f.endswith('.mp4'):
            continue
        name = f[:-4]
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,duration', '-of', 'csv=p=0', os.path.join(src, f)], capture_output=True, text=True).stdout.strip().split(',')
        fps = eval(probe[2])
        raw = frames(os.path.join(src, f))
        corner = raw[0][:6, :6].mean(axis=(0, 1))
        keyed = [key(x) for x in raw]
        r, boxes = measure(name, keyed, fps)
        r |= {'file': f, 'gag': gag_of.get(name, 'UNKNOWN'), 'res': f'{probe[0]}x{probe[1]}', 'fps': fps, 'duration': float(probe[3]), 'green_bg': bool(corner[1] > 200 and corner[0] < 60 and corner[2] < 60), 'is_loop': name in LOOPS}
        cache[name] = (keyed, boxes)
        # Preview: first, last, seam difference.
        first, last = comp(keyed[0]), comp(keyed[-1])
        d = np.abs(np.asarray(first, dtype=np.float32) - np.asarray(last, dtype=np.float32)).mean(axis=2)
        dimg = Image.fromarray(np.clip(d * 3, 0, 255).astype(np.uint8)).convert('RGB')
        sheet = Image.new('RGB', (first.width * 3 + 8, first.height), 'white')
        for i, im in enumerate((first, last, dimg)):
            sheet.paste(im, (i * (first.width + 4), 0))
        sheet.save(os.path.join(prev, f'{name}_first_last_seam.png'))
        if name in LOOPS:
            gif(keyed, os.path.join(prev, f'{name}_loop_x3.gif'), fps=fps)

        # Salvage.
        r['rescue'] = None
        full = [i for i, b in enumerate(boxes) if b and not (b[0] <= EDGE or b[2] >= keyed[0][0].shape[1] - EDGE or b[1] <= EDGE)]
        if name in CYCLES and full and (r.get('traveling') or (name in LOOPS and not r['loop_pass'])):
            # Longest run of frames with the whole character in frame.
            runs, start = [], full[0]
            for a, b in zip(full, full[1:] + [None]):
                if b != a + 1:
                    runs.append((start, a + 1))
                    start = b
            lo, hi = max(runs, key=lambda x: x[1] - x[0])
            fixed = recenter([keyed[i] for i in range(lo, hi)], [boxes[i] for i in range(lo, hi)], name in FLYERS) if r.get('traveling') else [keyed[i] for i in range(lo, hi)]
            bl = best_loop(fixed)
            if bl:
                ratio, i, j, med = bl
                # Plain trim first; if the seam still shows, a crossfade of up to XFADE frames.
                loop, fade = fixed[i:j], 0
                seam = seam_ratio(loop)
                for k in range(1, XFADE + 1):
                    if seam <= SEAM_LIMIT or i < k:
                        break
                    cand = crossfade(fixed, i, j, k)
                    if seam_ratio(cand) < seam:
                        loop, fade, seam = cand, k, seam_ratio(cand)
                rr, _ = measure(name + '_rescued', loop, fps)
                ok = bool(seam <= SEAM_LIMIT and not rr.get('traveling'))
                r['rescue'] = {'from_frame': lo + i, 'to_frame': lo + j, 'frames': j - i, 'seam': round(seam, 2), 'crossfade': fade, 'travel_x': rr.get('travel_x'), 'travel_y': rr.get('travel_y'), 'recentered': bool(r.get('traveling')), 'pass': ok}
                gif(loop, os.path.join(prev, f'{name}_RESCUE_{"pass" if ok else "fail"}_x3.gif'), fps=fps)
                if ok:
                    d2 = os.path.join(resc, f'{name}_inplace_loop')
                    os.makedirs(d2, exist_ok=True)
                    for n, (a, rgb) in enumerate(loop):
                        Image.fromarray(np.dstack([rgb.clip(0, 255), a * 255]).astype(np.uint8), 'RGBA').save(os.path.join(d2, f'{n:03d}.png'))
        results[name] = r
        print(name, {k: r[k] for k in ('travel_x', 'travel_y', 'edge_frames', 'empty_frames', 'traveling', 'seam', 'loop_pass', 'ground', 'height') if k in r}, r['rescue'])

    # Hand-offs and camera per gag.
    handoffs, camera = {}, {}
    for gag, clips in GAGS.items():
        have = [c for c in clips if c in cache]
        strip = []
        for a, b in zip(have, have[1:]):
            ka, ba = cache[a][0][-1], cache[a][1][-1]
            kb, bb = cache[b][0][0], cache[b][1][0]
            # Compare at a common size (clips of one gag may differ in resolution).
            if ka[0].shape != kb[0].shape:
                handoffs[f'{a}->{b}'] = {'pass': False, 'reason': 'different resolution'}
            else:
                med = float(np.median([diff(cache[b][0][i], cache[b][0][i + 1]) for i in range(len(cache[b][0]) - 1)])) or 1e-6
                ratio, ov = diff(ka, kb) / med, overlap(ba, bb)
                handoffs[f'{a}->{b}'] = {'ratio': round(ratio, 2), 'overlap': round(ov, 2), 'pass': bool(ratio <= SEAM_LIMIT and ov >= 0.9)}
            strip += [comp(ka), comp(kb)]
        if strip:
            hh = min(s.height for s in strip)
            strip = [s.resize((int(s.width * hh / s.height), hh)) for s in strip]
            sheet = Image.new('RGB', (sum(s.width for s in strip) + 6 * len(strip), hh), 'white')
            x = 0
            for n, s in enumerate(strip):
                sheet.paste(s, (x, 0))
                x += s.width + (4 if n % 2 == 0 else 8)
            sheet.save(os.path.join(prev, f'gag_{gag}_handoffs.png'))
        gs = [results[c]['ground'] for c in have if 'ground' in results[c]]
        hs = [results[c]['height'] for c in have if 'height' in results[c]]
        res = {results[c]['res'] for c in have}
        if len(have) > 1 and gs:
            camera[gag] = {'ground_spread': round(max(gs) - min(gs), 3), 'height_spread': round((max(hs) - min(hs)) / max(hs), 3), 'resolutions': sorted(res),
                           'match': bool(max(gs) - min(gs) <= 0.10 and (max(hs) - min(hs)) / max(hs) <= 0.10 and len(res) == 1)}
    json.dump({'clips': results, 'handoffs': handoffs, 'camera': camera}, open(os.path.join(out, 'results.json'), 'w'), indent=1)
    print(json.dumps(handoffs, indent=1))
    print(json.dumps(camera, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
