#!/usr/bin/env python3
"""Truck sprites: tools/truck-art/<kind>.png (top-down, cab at the top, white paint) ->
public/sprites/trucks/<kind>-<color>.webp and @2x, turned cab-right like the SVG art, with ONLY the
paint tinted the gate color (the cab; on the pickup and picker the whole body) through a mask:
light, neutral pixels inside each kind's paint region. Tanks, chrome, tires and equipment keep
their own colors. Each sprite gets the game's dark toy outline. Also writes
src/ui/truck-sprites.json: the measured paint color of every sprite (tests check it reads as its
gate color on every season). Run: python3 tools/truck-sprites.py  (needs Pillow)."""
import json, os
from PIL import Image, ImageChops, ImageFilter

KINDS = {
    # kind: (cells, paint region: rows from the front, in source pixels)
    'pickup': (2, 1024),
    'picker': (2, 1024),
    'vac': (3, 468),
    'frac': (3, 535),
    'water': (3, 488),
}
COLORS = {  # kept in sync with :root in style.css
    'red': (0xFF, 0x47, 0x47), 'blue': (0x2F, 0x8B, 0xFF), 'yellow': (0xFF, 0xD2, 0x1F),
    'green': (0x22, 0xC5, 0x5E), 'orange': (0xFF, 0x8A, 0x00), 'purple': (0xA5, 0x5C, 0xFF),
}
OUTLINE = (0x2A, 0x1A, 0x0C)
# Box per scale: along x across (CSS px at 1x), the same shape as the truck element.
ACROSS = 52
ALONG = {2: 112, 3: 168}
SCALES = {'': 1, '@2x': 2}

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'truck-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'trucks')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'truck-sprites.json')


def paint_mask(img: Image.Image, rows: int) -> Image.Image:
    """Weight 0..255: how much a pixel is body paint (light and colorless), inside the paint rows."""
    r, g, b, a = img.split()
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    lo = ImageChops.darker(ImageChops.darker(r, g), b)
    sat = ImageChops.subtract(hi, lo)
    # Bright: ramps in from 150 to 190. Colorless: full under 16 of spread, gone by 40.
    bright = hi.point(lambda v: max(0, min(255, (v - 150) * 255 // 40)))
    grey = sat.point(lambda v: max(0, min(255, (40 - v) * 255 // 24)))
    m = ImageChops.multiply(ImageChops.multiply(bright, grey), a)
    region = Image.new('L', img.size, 0)
    region.paste(255, (0, 0, img.width, rows))
    return ImageChops.multiply(m, region).filter(ImageFilter.GaussianBlur(1.2))


def tint(img: Image.Image, mask: Image.Image, color) -> Image.Image:
    """Multiply the paint by the color (white turns the gate color, shading stays)."""
    solid = Image.new('RGBA', img.size, color + (255,))
    painted = ImageChops.multiply(img, solid)
    painted.putalpha(img.getchannel('A'))
    return Image.composite(painted, img, mask)


def sprite(img: Image.Image, cells: int, scale: int) -> Image.Image:
    """Trim, turn cab-right, fit the truck box, outline."""
    img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
    img = img.transpose(Image.Transpose.ROTATE_270)  # cab (top) -> right
    w, h = ALONG[cells] * scale, ACROSS * scale
    ol = 2 * scale
    body = img.resize((w - ol * 2, h - ol * 2), Image.Resampling.LANCZOS)
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
    manifest = {'across': ACROSS, 'along': ALONG, 'paint': {}}
    for kind, (cells, rows) in KINDS.items():
        src = Image.open(os.path.join(SRC, f'{kind}.png')).convert('RGBA')
        mask = paint_mask(src, rows)
        manifest['paint'][kind] = {}
        for name, rgb in COLORS.items():
            tinted = tint(src, mask, rgb)
            for suffix, scale in SCALES.items():
                sprite(tinted, cells, scale).save(os.path.join(OUT, f'{kind}-{name}{suffix}.webp'), 'WEBP', quality=86, method=6)
            # The paint as a player sees it: the mean of the clearly painted pixels.
            px = [p for p, m in zip(tinted.getdata(), mask.getdata()) if m > 200]
            mean = [round(sum(p[i] for p in px) / len(px)) for i in range(3)]
            manifest['paint'][kind][name] = {'mean': '#%02x%02x%02x' % tuple(mean), 'share': round(len(px) / (src.width * src.height), 3)}
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
