#!/usr/bin/env python3
"""Win card frame: public/sprites/ui/panel_win@2x.webp -> public/sprites/ui/frame_win(@2x).webp.

The panel art is a fixed-size card: banner, a cream box with gold trim, and two button slots drawn
into its bottom. The game's win card has to grow with its content, so the frame is used as a
9-slice border image, and its buttons sit inside the cream box like every other row. The art's own
bottom (slots, a thinner rim, tighter corners) is replaced with one rebuilt from the side walls'
cross-section, so the frame is symmetrical: the same blue wall, gold trim and fillet at the bottom
as at the sides.

Prints the slice sizes (in @2x pixels) that style.css uses.
Run: python3 tools/win-frame.py"""
import math, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(HERE, '..', 'public', 'sprites', 'ui')
# The art is kept as drawn down to this row (plain walls and cream above the button slots).
BODY_TO = 960
# Where the walls' cross-section is read (the last row kept, so the join is seamless), how far the outer edge is in from
# the image's side, and how deep the section goes before it is plain cream.
PROFILE_ROW = 959
EDGE = 5
DEPTH = 96
# The bottom corners' fillet at the outer edge (so the gold trim turns on RADIUS - 66).
RADIUS = 112
# 9-slice (in @2x pixels of the output): banner + top trim corner, side walls + trim corner, bottom.
SLICE = {'top': 262, 'side': 118}


def main() -> None:
    art = Image.open(os.path.join(UI, 'panel_win@2x.webp')).convert('RGBA')
    w, h = art.size
    px = art.load()
    # The frame's cross-section, read off the art's own side walls half way down: from the outer
    # edge inward it is blue wall, gold trim, then the cream box's lip. One profile for the left
    # wall and one for the right (the light falls a little differently on each).
    left = [px[EDGE + d, PROFILE_ROW] for d in range(DEPTH)]
    right = [px[w - 1 - EDGE - d, PROFILE_ROW] for d in range(DEPTH)]
    cream = px[w // 2, PROFILE_ROW]

    # Everything above BODY_TO is the art as drawn (banner, walls, cream). Below it the art has two
    # button slots and a thinner, differently rounded rim, so the bottom is REBUILT from the walls'
    # own cross-section: the same blue wall, gold trim and lip, turned round both bottom corners on
    # one fillet (radius RADIUS at the outer edge) and run along the bottom. Sides and bottom are
    # then the same thickness, pattern and corner, by construction.
    out = Image.new('RGBA', (w, BODY_TO + RADIUS), (0, 0, 0, 0))
    out.paste(art.crop((0, 0, w, BODY_TO)), (0, 0))
    o = out.load()
    xl, xr = EDGE, w - 1 - EDGE
    for y in range(RADIUS):
        b = RADIUS - 1 - y + 0.5  # distance up from the frame's bottom edge
        for x in range(w):
            dx = min(x - xl, xr - x) + 0.5
            if dx < 0:
                continue
            if dx < RADIUS and b < RADIUS:
                d = RADIUS - math.hypot(RADIUS - dx, RADIUS - b)  # round the corner
            else:
                d = min(dx, b)
            if d <= -0.5:
                continue
            t = x / (w - 1)
            if d >= DEPTH - 1:
                c = cream
            else:
                i = max(0, int(d))
                fr = max(0.0, d) - i
                c = tuple(round((left[i][k] * (1 - fr) + left[i + 1][k] * fr) * (1 - t) + (right[i][k] * (1 - fr) + right[i + 1][k] * fr) * t) for k in range(3)) + (255,)
            alpha = round(255 * min(1.0, d + 0.5))
            o[x, BODY_TO + y] = (c[0], c[1], c[2], alpha)
    out.save(os.path.join(UI, 'frame_win@2x.webp'), 'WEBP', quality=92, method=6)
    out.resize((w // 2, out.height // 2), Image.Resampling.LANCZOS).save(os.path.join(UI, 'frame_win.webp'), 'WEBP', quality=92, method=6)
    print('frame', out.size, 'slices (@2x px): top', SLICE['top'], 'side', SLICE['side'], 'bottom', RADIUS)


if __name__ == '__main__':
    main()
