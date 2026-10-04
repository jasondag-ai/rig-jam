#!/usr/bin/env python3
"""Truck sprites: tools/truck-art/<kind>.png (top-down, cab at the top, white paint) ->
public/sprites/trucks/<kind>-<color>.webp and @2x, turned cab-right like the SVG art.

The gate color is painted on through masks (PAINT below): the cab on every truck, the whole body on
the pickup and picker, the tank shell (and the water hauler's rear fenders) on the vac and water
trucks, and the engine housing and deck on the frac unit (it has no tank). Chrome, tires, walkways,
hatches, hose reels and the pump's fluid end keep their own colors. At least 40% of every sprite's
canvas is gate color. Any soft shadow in the source is dropped (the game's CSS casts the only one),
and each sprite gets the game's dark toy outline.

Season coats are baked here too, one layer per kind (not per color): snow-<kind>.webp (winter:
settled snow on the top surfaces) and mud-<kind>.webp (spring: spatter along the sides and back),
both clipped inside the truck's own shape with soft edges. The game lays one over the sprite.

Also writes src/ui/truck-sprites.json: the measured paint color and painted share of every sprite
(tests check each reads as its gate color on every season).
Run: python3 tools/truck-sprites.py  (needs Pillow)."""
import json, os, random
from PIL import Image, ImageChops, ImageFilter

KINDS = {'pickup': 2, 'picker': 2, 'vac': 3, 'frac': 3, 'water': 3}
# What carries the gate color on each kind, in source pixels (cab at the top). Each region is
# (box, lum range that counts as paint, ref): pixels in the box that are colorless and inside the
# lum range are repainted, with `ref` the brightness that becomes the full gate color (brighter goes
# toward a highlight, darker stays shaded). `skip` boxes inside a region stay as drawn.
#   cab paint is white (ref 245); tank shells and fenders are silver (ref about 205); the frac
#   unit has no tank, so its engine housing (dark grey, ref 105) and deck plates carry the color.
# Chrome trim, tires, walkways, hatches, hose reels and the frac pump's fluid end stay neutral.
WHITE = (150, 190, 256, 245)   # ramps in from 150 to 190; no upper limit
SILVER = (70, 105, 256, 205)
PAINT = {
    'pickup': [((0, 0, 512, 1024), WHITE, [])],
    'picker': [((0, 0, 512, 1024), (120, 165, 256, 240), [])],
    'vac': [
        ((0, 0, 512, 468), WHITE, []),
        ((62, 455, 440, 1350), SILVER, [(194, 500, 300, 1200)]),
    ],
    'frac': [
        ((0, 0, 512, 535), WHITE, []),
        ((85, 535, 432, 1095), (26, 46, 215, 98), []),
        ((85, 1040, 432, 1536), SILVER, [(104, 1262, 432, 1440)]),
    ],
    'water': [
        ((0, 0, 512, 488), WHITE, []),
        ((52, 468, 432, 1385), SILVER, [(184, 470, 312, 1312)]),
        ((0, 860, 72, 1295), SILVER, []),
        ((420, 860, 512, 1295), SILVER, []),
    ],
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


def clean(img: Image.Image) -> Image.Image:
    """Drops any soft shadow drawn into the source (faint, dark pixels round the truck): the game
    casts the only shadow, in CSS."""
    r, g, b, a = img.split()
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    faint = a.point(lambda v: 255 if v < 170 else 0)
    dark = hi.point(lambda v: 255 if v < 90 else 0)
    img = img.copy()
    img.putalpha(ImageChops.multiply(a, ImageChops.invert(ImageChops.multiply(faint, dark))))
    return img


def region_mask(img: Image.Image, box, lum, skip) -> Image.Image:
    """Weight 0..255: how much a pixel is body paint (colorless, in the lum range) inside the box."""
    lo0, lo1, top, _ref = lum
    r, g, b, a = img.split()
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    sat = ImageChops.subtract(hi, ImageChops.darker(ImageChops.darker(r, g), b))
    bright = hi.point(lambda v: 0 if v >= top + 14 else max(0, min(255, (v - lo0) * 255 // (lo1 - lo0), (top + 14 - v) * 255 // 14 if top < 256 else 255)))
    # Colorless: full under 16 of spread, gone by 40.
    grey = sat.point(lambda v: max(0, min(255, (40 - v) * 255 // 24)))
    m = ImageChops.multiply(ImageChops.multiply(bright, grey), a)
    region = Image.new('L', img.size, 0)
    region.paste(255, box)
    for s in skip:
        region.paste(0, s)
    return ImageChops.multiply(m, region).filter(ImageFilter.GaussianBlur(1.2))


def repaint(img: Image.Image, mask: Image.Image, color, ref: int) -> Image.Image:
    """The gate color with the art's own shading: `ref` brightness becomes the full color, darker
    stays shaded, brighter picks up a soft highlight."""
    r, g, b, _a = img.split()
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    shade = hi.point(lambda v: min(255, v * 255 // ref))
    painted = ImageChops.multiply(Image.new('RGB', img.size, color), Image.merge('RGB', [shade] * 3))
    if ref < 230:  # white cab paint keeps its plain shading; silver and dark parts get a highlight
        glint = hi.point(lambda v: max(0, v - ref) * 90 // (255 - ref))
        painted = Image.composite(Image.new('RGB', img.size, (255, 255, 255)), painted, glint)
    painted = painted.convert('RGBA')
    painted.putalpha(img.getchannel('A'))
    return Image.composite(painted, img, mask)


def paint(img: Image.Image, kind: str, color):
    """Paints every region of a kind. Returns the painted image and the combined paint mask."""
    out = img
    total = Image.new('L', img.size, 0)
    for box, lum, skip in PAINT[kind]:
        mask = region_mask(img, box, lum, skip)
        out = repaint(out, ImageChops.subtract(mask, total), color, lum[3])
        total = ImageChops.lighter(total, mask)
    return out, total


def fit(img: Image.Image, bbox, cells: int, scale: int) -> Image.Image:
    """Crops to the truck, turns it cab-right and fits the truck box (inside the outline's margin)."""
    img = img.crop(bbox).transpose(Image.Transpose.ROTATE_270)  # cab (top) -> right
    w, h = ALONG[cells] * scale, ACROSS * scale
    ol = 2 * scale
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(img.resize((w - ol * 2, h - ol * 2), Image.Resampling.LANCZOS), (ol, ol))
    return canvas


def sprite(img: Image.Image, bbox, cells: int, scale: int) -> Image.Image:
    """The truck in its box with the game's dark toy outline."""
    canvas = fit(img, bbox, cells, scale)
    ol = 2 * scale
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    ring = alpha.filter(ImageFilter.MaxFilter(ol * 2 + 1)).filter(ImageFilter.GaussianBlur(0.6 * scale))
    out = Image.new('RGBA', canvas.size, OUTLINE + (0,))
    out.putalpha(ring)
    out.alpha_composite(canvas)
    return out


def blobs(rng: random.Random, size, cells: int) -> Image.Image:
    """Soft random field 0..255, about `cells` blobs across the short side."""
    w, h = size
    cw, ch = cells, max(1, round(cells * h / w))
    small = Image.new('L', (cw, ch))
    small.putdata([rng.randrange(256) for _ in range(cw * ch)])
    return small.resize(size, Image.Resampling.BICUBIC)


def inside(src: Image.Image, shrink: int, soft: float) -> Image.Image:
    """The truck's silhouette pulled in from its edge by `shrink` px, with a soft edge."""
    solid = src.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    return solid.filter(ImageFilter.MinFilter(shrink * 2 + 1)).filter(ImageFilter.GaussianBlur(soft))


def snow_coat(src: Image.Image, kind: str) -> Image.Image:
    """Winter: settled snow on the truck's top surfaces, as its own layer. Soft drifts down the
    middle (roof, hood, bed, tank top), thinning toward the sides so the paint still shows, clipped
    inside the truck's own shape with soft edges, with a faint blue shade at the drifts' rims."""
    rng = random.Random(f'snow-{kind}')
    w, h = src.size
    # Drifts: where a broad random field is high. Favor the centre line; none at the very sides.
    field = ImageChops.add(blobs(rng, (w, h), 4), blobs(rng, (w, h), 9), scale=2)
    across = Image.new('L', (w, 1))
    across.putdata([max(0, 255 - int(abs(x / w - 0.5) * 2 * 420)) for x in range(w)])
    field = ImageChops.multiply(field, across.resize((w, h)).point(lambda v: min(255, v * 2)))
    drift = field.point(lambda v: max(0, min(255, (v - 138) * 5))).filter(ImageFilter.GaussianBlur(7))
    mask = ImageChops.multiply(drift, inside(src, 16, 7))
    # White in the thick of a drift, a cool shade where it thins out.
    coat = Image.composite(Image.new('RGB', (w, h), (255, 255, 255)), Image.new('RGB', (w, h), (196, 214, 240)), mask.point(lambda v: max(0, min(255, (v - 110) * 3)))).convert('RGBA')
    coat.putalpha(mask.point(lambda v: v * 215 // 255))
    return coat


def mud_coat(src: Image.Image, kind: str) -> Image.Image:
    """Spring: mud thrown up along both sides and across the back, as its own layer. Heaviest low
    on the sides by the wheels and at the rear, breaking into spatter toward the middle, clipped to
    the truck's shape with soft edges. Never a solid band."""
    rng = random.Random(f'mud-{kind}')
    w, h = src.size
    bbox = src.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    half = (x1 - x0) / 2
    # How muddy a spot can get: 1 at the sides, 0 by 45% of the way in; more toward the rear.
    reach = Image.new('L', (w, h), 0)
    px = []
    for y in range(h):
        back = 0.55 + 0.45 * max(0.0, min(1.0, (y - y0) / max(1, y1 - y0)))
        rear = max(0.0, 1 - (y1 - y) / (half * 0.5))
        for x in range(w):
            side = max(0.0, 1 - min(x - x0, x1 - x) / (half * 0.45))
            px.append(int(255 * min(1.0, max(side * back, rear * 0.8))))
    reach.putdata(px)
    spatter = ImageChops.add(blobs(rng, (w, h), 22), blobs(rng, (w, h), 60), scale=2)
    # Thresholded against the reach: solid-ish clumps at the edge, lone flecks further in.
    need = reach.point(lambda v: 255 - v * 205 // 255)
    mud = ImageChops.subtract(spatter, need).point(lambda v: min(255, v * 9)).filter(ImageFilter.GaussianBlur(1.6))
    mask = ImageChops.multiply(mud, inside(src, 2, 2.5))
    tone = blobs(rng, (w, h), 12).point(lambda v: 150 + v * 105 // 255)
    coat = ImageChops.multiply(Image.new('RGB', (w, h), (104, 66, 38)), Image.merge('RGB', [tone] * 3)).convert('RGBA')
    coat.putalpha(mask.point(lambda v: v * 215 // 255))
    return coat


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {'across': ACROSS, 'along': ALONG, 'paint': {}}
    for kind, cells in KINDS.items():
        src = clean(Image.open(os.path.join(SRC, f'{kind}.png')).convert('RGBA'))
        bbox = src.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        manifest['paint'][kind] = {}
        for name, rgb in COLORS.items():
            tinted, mask = paint(src, kind, rgb)
            for suffix, scale in SCALES.items():
                sprite(tinted, bbox, cells, scale).save(os.path.join(OUT, f'{kind}-{name}{suffix}.webp'), 'WEBP', quality=86, method=6)
            # The paint as a player sees it: the mean of the clearly painted pixels, and how much
            # of the sprite's canvas they cover.
            data = lambda im: im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()
            px = [p for p, m in zip(data(tinted), data(mask)) if m > 200]
            mean = [round(sum(p[i] for p in px) / len(px)) for i in range(3)]
            manifest['paint'][kind][name] = {'mean': '#%02x%02x%02x' % tuple(mean), 'share': round(len(px) / (src.width * src.height), 3)}
        # Season coats: one snow layer and one mud layer per kind (any color), drawn over the sprite.
        for coat_name, coat in (('snow', snow_coat(src, kind)), ('mud', mud_coat(src, kind))):
            for suffix, scale in SCALES.items():
                fit(coat, bbox, cells, scale).save(os.path.join(OUT, f'{coat_name}-{kind}{suffix}.webp'), 'WEBP', quality=84, method=6)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
