#!/usr/bin/env python3
"""Obstacle sprites: tools/obstacle-art/<kind>.png (3/4 high-angle view on a concrete slab) ->
public/sprites/obstacles/<kind>.webp and @2x: trimmed, with the game's dark toy outline, one cell
wide at 1x (taller ones stick up above their cell). Writes src/ui/obstacle-sprites.json with each
sprite's height as a share of its width (layout uses it). Run: python3 tools/obstacle-sprites.py"""
import json, os
from PIL import Image, ImageFilter

KINDS = ['pumpjack', 'tank', 'wellhead']
WIDTH = 64  # px at 1x: a bit more than a cell, scaled down to fit in CSS
OUTLINE = (0x2A, 0x1A, 0x0C)
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'obstacle-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'obstacles')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'obstacle-sprites.json')


def sprite(img: Image.Image, scale: int) -> Image.Image:
    ol = 2 * scale
    w = WIDTH * scale
    h = round((w - 2 * ol) * img.height / img.width) + 2 * ol
    body = img.resize((w - 2 * ol, h - 2 * ol), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(body, (ol, ol))
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    ring = alpha.filter(ImageFilter.MaxFilter(ol * 2 + 1)).filter(ImageFilter.GaussianBlur(0.6 * scale))
    out = Image.new('RGBA', (w, h), OUTLINE + (0,))
    out.putalpha(ring)
    out.alpha_composite(canvas)
    return out


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for kind in KINDS:
        src = Image.open(os.path.join(SRC, f'{kind}.png')).convert('RGBA')
        src = src.crop(src.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
        for suffix, scale in (('', 1), ('@2x', 2)):
            sp = sprite(src, scale)
            sp.save(os.path.join(OUT, f'{kind}{suffix}.webp'), 'WEBP', quality=86, method=6)
        manifest[kind] = {'aspect': round(sp.height / sp.width, 4)}
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
