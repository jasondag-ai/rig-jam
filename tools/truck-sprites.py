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
a crisp flat snow cap on the cab roof and the tank's crest, blue-grey at its rim) and mud-<kind>.webp (spring: spatter along the sides and back),
both clipped inside the truck's own shape with soft edges. The game lays one over the sprite.

Also writes src/ui/truck-sprites.json: the measured paint color and painted share of every sprite
(tests check each reads as its gate color on every season).
Run: python3 tools/truck-sprites.py  (needs Pillow)."""
import json, os, random
from PIL import Image, ImageChops, ImageDraw, ImageFilter

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
# Camo pickups: which kind wears it, and where the blotch field is cut into deep and pale patches.
CAMO_KIND = 'pickup'
CAMO_DARK, CAMO_LIGHT = 160, 94
# Box per scale: along x across (CSS px at 1x), the same shape as the truck element.
ACROSS = 52
# Room round the truck inside its box (CSS px), the outline's width (CSS px), and how much larger
# than the final sprite it is drawn before scaling down.
MARGIN = 2
OUTLINE_PX = 1.5
SUPER = 4
ALONG = {2: 112, 3: 168}
SCALES = {'': 1, '@2x': 2}

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'truck-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'trucks')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'truck-sprites.json')


def clean(img: Image.Image) -> Image.Image:
    """A clean silhouette: the source's faint outer pixels (soft shadow, glow) are dropped by
    steepening its alpha, which keeps a smooth anti-aliased edge and nothing beyond it. The game
    casts the only shadow, in CSS."""
    img = img.copy()
    img.putalpha(img.getchannel('A').point(lambda v: max(0, min(255, (v - 120) * 255 // 90))))
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
    ol = MARGIN * scale
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(img.resize((w - ol * 2, h - ol * 2), Image.Resampling.LANCZOS), (ol, ol))
    return canvas


def sprite(img: Image.Image, bbox, cells: int, scale: int) -> Image.Image:
    """The truck in its box with ONE crisp dark toy outline. Drawn at SUPER times the size and
    scaled down, so both the truck's edge and the outline come out smooth: no fringe, no halo."""
    big = fit(img, bbox, cells, scale * SUPER)
    solid = big.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    r = round(OUTLINE_PX * scale * SUPER)
    ring = solid.filter(ImageFilter.MaxFilter(r * 2 + 1)).filter(ImageFilter.GaussianBlur(SUPER * 0.35)).point(lambda v: max(0, min(255, (v - 96) * 4)))
    out = Image.new('RGBA', big.size, OUTLINE + (0,))
    out.putalpha(ring)
    # The truck over its outline; its own soft edge pixels sit on the dark ring, never on nothing.
    out.alpha_composite(big)
    return out.resize((ALONG[cells] * scale, ACROSS * scale), Image.Resampling.LANCZOS)


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


# Where snow sits on each kind (source pixels, cab at the top): the cab roof, and the crest of the
# tank (or, on the frac unit, the top of the pump). Each cap is a rounded patch with a wavy edge.
SNOW = {
    'pickup': [(128, 300, 384, 560)],
    'picker': [(130, 250, 382, 392)],
    'vac': [(118, 292, 372, 448), (182, 520, 312, 1190)],
    'frac': [(112, 300, 400, 470), (140, 1118, 318, 1246)],
    'water': [(118, 296, 392, 452), (176, 498, 320, 1296)],
}


def snow_coat(src: Image.Image, kind: str) -> Image.Image:
    """Winter: a crisp cap of snow on the cab roof and along the top of the tank, as its own layer.
    Flat white with a clean wavy edge, and a soft blue-grey rim all round that reads as the cap's
    underside (the same from any side, since trucks turn). Clipped inside the truck's own shape."""
    rng = random.Random(f'snow-{kind}')
    w, h = src.size
    shape = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(shape)
    for x0, y0, x1, y1 in SNOW[kind]:
        draw.rounded_rectangle((x0, y0, x1, y1), radius=min(x1 - x0, y1 - y0) * 0.3, fill=255)
    # Wavy edge: blur the patch, wobble the level it is cut at, then cut it crisp.
    soft = shape.filter(ImageFilter.GaussianBlur(14))
    wobble = blobs(rng, (w, h), 16).point(lambda v: 96 + v * 64 // 255)
    cap = ImageChops.subtract(soft, wobble).point(lambda v: min(255, v * 24)).filter(ImageFilter.GaussianBlur(1.6))
    cap = ImageChops.multiply(cap, inside(src, 5, 1.5))
    core = cap.filter(ImageFilter.MinFilter(23)).filter(ImageFilter.GaussianBlur(5))
    coat = Image.composite(Image.new('RGB', (w, h), (251, 253, 255)), Image.new("RGB", (w, h), (158, 180, 214)), core).convert('RGBA')
    coat.putalpha(cap)
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


def camo(tinted: Image.Image, mask: Image.Image, color) -> Image.Image:
    """Camo pickups (the Wildlife Log's reward): crisp blotches in the truck's OWN gate colour, a
    deep shade and a pale tint of it over the paint, so the colour still says which gate is its
    own. The two are balanced so the paint's average stays the gate colour (sprites.test.ts)."""
    rng = random.Random(7)
    w, h = tinted.size
    field = blobs(rng, (w, h), 5).filter(ImageFilter.GaussianBlur(10))
    fine = blobs(rng, (w, h), 9).filter(ImageFilter.GaussianBlur(8))
    field = ImageChops.add(field, fine, scale=2)
    crisp = lambda im: im.filter(ImageFilter.GaussianBlur(1.5))
    dark = crisp(field.point(lambda v: 255 if v > CAMO_DARK else 0))
    light = crisp(field.point(lambda v: 255 if v < CAMO_LIGHT else 0))
    rgb = tinted.convert('RGB')
    deep = ImageChops.multiply(rgb, Image.new('RGB', (w, h), tuple(round(255 * (0.62 + 0.2 * c / 255)) for c in color)))
    pale = Image.blend(rgb, Image.new('RGB', (w, h), tuple(round(c + (255 - c) * 0.7) for c in color)), 0.4)
    out = Image.composite(deep, rgb, ImageChops.multiply(dark, mask))
    out = Image.composite(pale, out, ImageChops.multiply(light, mask)).convert('RGBA')
    out.putalpha(tinted.getchannel('A'))
    return out


def measure(img: Image.Image, mask: Image.Image, src: Image.Image):
    """The paint as a player sees it: the mean of the clearly painted pixels, and how much of the
    sprite's canvas they cover."""
    data = lambda im: im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()
    px = [p for p, m in zip(data(img), data(mask)) if m > 200]
    mean = [round(sum(p[i] for p in px) / len(px)) for i in range(3)]
    return {'mean': '#%02x%02x%02x' % tuple(mean), 'share': round(len(px) / (src.width * src.height), 3)}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {'across': ACROSS, 'along': ALONG, 'paint': {}, 'camo': {}}
    for kind, cells in KINDS.items():
        src = clean(Image.open(os.path.join(SRC, f'{kind}.png')).convert('RGBA'))
        bbox = src.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        manifest['paint'][kind] = {}
        for name, rgb in COLORS.items():
            tinted, mask = paint(src, kind, rgb)
            for suffix, scale in SCALES.items():
                sprite(tinted, bbox, cells, scale).save(os.path.join(OUT, f'{kind}-{name}{suffix}.webp'), 'WEBP', quality=86, method=6)
            manifest['paint'][kind][name] = measure(tinted, mask, src)
            if kind == CAMO_KIND:
                hidden = camo(tinted, mask, rgb)
                for suffix, scale in SCALES.items():
                    sprite(hidden, bbox, cells, scale).save(os.path.join(OUT, f'{kind}-{name}-camo{suffix}.webp'), 'WEBP', quality=86, method=6)
                manifest['camo'][name] = measure(hidden, mask, src)
        # Season coats: one snow layer and one mud layer per kind (any color), drawn over the sprite.
        for coat_name, coat in (('snow', snow_coat(src, kind)), ('mud', mud_coat(src, kind))):
            for suffix, scale in SCALES.items():
                fit(coat, bbox, cells, scale).save(os.path.join(OUT, f'{coat_name}-{kind}{suffix}.webp'), 'WEBP', quality=84, method=6)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
