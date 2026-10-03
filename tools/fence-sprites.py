#!/usr/bin/env python3
"""Pipe-rail fence: tools/fence-art/ -> public/sprites/fence/.
rail-h.webp: fence_straight_v1 cropped to a band centred on the pipe (rows 38..98: pipe centre at
the middle); rail-v.webp: the same turned upright. corner-tl/tr/br/bl.webp: fence_corner_v1 (post
centre at 64,64, arms right and down) turned to each corner. Writes src/ui/fence-sprites.json with
the pipe thickness in each source so the board can scale both to the same thickness.
Run: python3 tools/fence-sprites.py"""
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'fence-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'fence')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'fence-sprites.json')
PIPE_CENTRE = 68  # rail pipe rows 57..79
HALF = 30


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    rail = Image.open(os.path.join(SRC, 'fence_straight_v1.png')).convert('RGBA')
    rail = rail.crop((0, PIPE_CENTRE - HALF, rail.width, PIPE_CENTRE + HALF))
    rail.save(os.path.join(OUT, 'rail-h.webp'), 'WEBP', quality=88, method=6)
    rail.transpose(Image.Transpose.ROTATE_90).save(os.path.join(OUT, 'rail-v.webp'), 'WEBP', quality=88, method=6)
    corner = Image.open(os.path.join(SRC, 'fence_corner_v1.png')).convert('RGBA')
    # Arms right and down = top-left. Turning clockwise walks round the board.
    for name, img in {
        'tl': corner,
        'tr': corner.transpose(Image.Transpose.ROTATE_270),
        'br': corner.transpose(Image.Transpose.ROTATE_180),
        'bl': corner.transpose(Image.Transpose.ROTATE_90),
    }.items():
        img.save(os.path.join(OUT, f'corner-{name}.webp'), 'WEBP', quality=88, method=6)
    with open(MANIFEST, 'w') as f:
        json.dump({'rail': {'w': rail.width, 'h': rail.height, 'pipe': 23}, 'corner': {'size': corner.width, 'pipe': 18}}, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
