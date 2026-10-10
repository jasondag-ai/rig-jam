#!/usr/bin/env python3
"""Outside ground: tools/ground-art/*.png (seamless 1024px squares) -> public/sprites/ground/*.webp.

Each season has a field for outside the berm (grass-summer, grass-spring, and for winter a snow
field with gentle drifts, still named grass-winter): a 768px square that wraps, shown at 384px on
screen, with the grass blades at a fine, matching scale. Built by `field`: several differently
shifted copies of the source blended through soft random masks, so no patch repeats and there are
no tile edges, then given a slow drift in tone. The winter field is made from the snow source with
its tire ruts smoothed away, cooler and a step darker than the pad.

The PAD has no image any more: it is a flat colour plus code-drawn fields and marks, in the
board's toy look (src/ui/lease-detail.ts, themes.ts). The pad sources in ground-art/ are kept only
for the winter field.

Spring grass has no source yet: it's the summer grass shifted toward Montney's dry spring green;
drop a grass_border_spring_v1.png in tools/ground-art/ and rerun to use a real one.
Writes src/ui/ground-tiles.json (mean, dark and light tones of each image; themes use them).
Run: python3 tools/ground-tiles.py"""
import json, os, random
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ground-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'ground')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'ground-tiles.json')
TILES = {
    'grass-summer': 'grass_border_summer_v1',
    'grass-spring': 'grass_border_spring_v1',
    'grass-winter': 'grass_border_winter_v1',
    # Regions 4 and 5 (no sources of their own: made from the summer grass).
    'grass-fall': 'grass_border_fall_v1',
    'grass-prairie': 'grass_border_prairie_v1',
    # Region 6, Clearwater (the Big Pad): boreal lichen ground, made from the summer grass.
    'grass-boreal': 'grass_border_boreal_v1',
    # Region 7, Baldonnel: spring breakup, last year's dead grass with the last of the snow lying in it.
    'grass-thaw': 'grass_border_thaw_v1',
}
SNOW_SRC = 'ground_winter_snow_v1'
# Grass field: image size, and how many pixels of it one source square spans (must divide the size so
# the field wraps). On screen the field is drawn at half its size (GRASS_CSS in themes.ts), so the
# sources repeat every 96px (they were 180px: blades about half the size), the same in every season.
GRASS = 768
GRASS_TILE = {'grass-summer': 192, 'grass-spring': 192, 'grass-winter': 384, 'grass-fall': 192, 'grass-prairie': 192, 'grass-boreal': 192, 'grass-thaw': 192}


def smooth_snow(im: Image.Image) -> Image.Image:
    """Snow: the source has tire ruts pressed into it. Keep only its broad, soft light and shade
    (a heavy blur wipes the ruts), then put back a fine, even snow grain."""
    soft = im.filter(ImageFilter.GaussianBlur(26))
    # Flatten what's left of the diagonal banding, keeping the snow's own color.
    flat = Image.new('RGB', im.size, tuple(int(c) for c in ImageStat.Stat(im).mean))
    soft = Image.blend(soft, flat, 0.6)
    random.seed(11)
    grain = Image.effect_noise(im.size, 40).filter(ImageFilter.GaussianBlur(1.1))
    grain = grain.point(lambda v: max(96, min(140, 118 + (v - 128) * 3 // 4)))
    return ImageChops.multiply(soft, Image.merge('RGB', [grain] * 3)).point(lambda v: min(255, v * 255 // 118))


def snow_field(pad_snow: Image.Image) -> Image.Image:
    """Winter outside the berm: open snow, cooler and a step darker than the packed snow of the pad
    (the pad stays the brightest thing on screen), from the pad's own cleaned snow."""
    return ImageChops.multiply(pad_snow, Image.new('RGB', pad_snow.size, (232, 238, 250)))


def drifts(im: Image.Image, seed: int) -> Image.Image:
    """Gentle wind drifts: long soft bands of lighter and bluer snow lying one way. Wraps."""
    rng = random.Random(seed)
    size = im.width
    band = blobs(rng, size, 7, 1.0)
    # Squash the blobs flat so they become long streaks lying across the wind.
    band = band.filter(ImageFilter.BoxBlur(1)).resize((size, size // 5)).resize((size, size), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(14))
    light = band.point(lambda v: max(0, min(255, (v - 132) * 4)))
    out = Image.composite(Image.new('RGB', im.size, (236, 243, 252)), im, light.point(lambda v: v * 70 // 255))
    shade = band.point(lambda v: max(0, min(255, (118 - v) * 4)))
    return Image.composite(Image.new('RGB', im.size, (158, 178, 212)), out, shade.point(lambda v: v * 45 // 255))


def spring_grass(summer: Image.Image) -> Image.Image:
    """Stand-in for spring breakup: last year's grass only just greening. The summer grass, duller
    (half its saturation), darker and pulled toward a wet olive-brown."""
    dull = ImageEnhance.Color(summer).enhance(0.5)
    wet = ImageChops.multiply(dull, Image.new('RGB', summer.size, (196, 190, 150)))
    return ImageEnhance.Brightness(wet).enhance(0.95)


def fall_grass(summer: Image.Image) -> Image.Image:
    """Mannville in late fall: the summer grass gone dry and frost-bitten, a dull tan with a little
    olive left in it (a third of its saturation, pulled toward straw-brown)."""
    dull = ImageEnhance.Color(summer).enhance(0.16)
    dry = ImageChops.multiply(dull, Image.new('RGB', summer.size, (255, 208, 138)))
    return ImageEnhance.Brightness(dry).enhance(1.28)


def boreal_lichen(summer: Image.Image) -> Image.Image:
    """Clearwater's boreal ground: pale reindeer lichen and moss over sand, a soft sage (the
    reference strip's #aeb486). The grass's own blades, nearly drained of colour and lifted."""
    grey = ImageEnhance.Color(summer).enhance(0.2)
    sage = ImageChops.multiply(grey, Image.new('RGB', summer.size, (246, 248, 180)))
    return ImageEnhance.Contrast(ImageEnhance.Brightness(sage).enhance(1.86)).enhance(0.62)


def thaw_grass(summer: Image.Image) -> Image.Image:
    """Baldonnel at spring breakup: last year's grass, dead and flattened, a dull khaki (the reference
    strip's #9a8c5e). (The snow that still lies in it is laid on the finished field by `thaw_snow`.)"""
    grey = ImageEnhance.Color(summer).enhance(0.14)
    khaki = ImageChops.multiply(grey, Image.new('RGB', summer.size, (255, 226, 150)))
    return ImageEnhance.Contrast(ImageEnhance.Brightness(khaki).enhance(1.5)).enhance(0.8)


def thaw_snow(im: Image.Image, seed: int) -> Image.Image:
    """The last of the snow: a few soft-edged patches lying in the grass, blue-grey at their rims. Wraps."""
    rng = random.Random(seed)
    size = im.width
    mask = blobs(rng, size, 13, 1.0).filter(ImageFilter.GaussianBlur(5))
    rim = mask.point(lambda v: max(0, min(255, (v - 186) * 14)))
    core = mask.point(lambda v: max(0, min(255, (v - 194) * 18)))
    out = Image.composite(Image.new('RGB', im.size, (196, 208, 220)), im, rim)
    return Image.composite(Image.new('RGB', im.size, (236, 241, 246)), out, core)


def prairie_stubble(summer: Image.Image) -> Image.Image:
    """Bakken's flat prairie: canola stubble, pale straw. The grass's own blades, bleached to straw.
    (The seeding rows are drawn by `stubble_rows` on the finished field.)"""
    grey = ImageEnhance.Color(summer).enhance(0.12)
    straw = ImageChops.multiply(grey, Image.new('RGB', summer.size, (255, 224, 132)))
    return ImageEnhance.Contrast(ImageEnhance.Brightness(straw).enhance(1.75)).enhance(0.8)


def stubble_rows(im: Image.Image, every: int = 24) -> Image.Image:
    """The drill rows of a harvested field: thin darker lines running across, a soft lighter band
    of cut stalks between them. `every` divides the image's height, so the field still wraps."""
    rows = Image.new('L', im.size, 0)
    px = rows.load()
    for y in range(im.height):
        k = y % every
        v = 150 if k < 3 else (60 if k < 6 else 0)
        for x in range(im.width):
            px[x, y] = v
    rows = rows.filter(ImageFilter.GaussianBlur(1.4))
    dark = Image.new('RGB', im.size, (128, 100, 52))
    return Image.composite(dark, im, rows.point(lambda v: v * 160 // 255))


def tiled(tile: Image.Image, size: int, dx: int, dy: int) -> Image.Image:
    out = Image.new('RGB', (size, size))
    for x in range(-dx, size, tile.width):
        for y in range(-dy, size, tile.height):
            out.paste(tile, (x, y))
    return out


def blobs(rng: random.Random, size: int, cells: int, edge: float) -> Image.Image:
    """A soft random mask that wraps: `cells` blobs across, with transitions sharpened by `edge`."""
    small = Image.new('L', (cells, cells))
    small.putdata([rng.randrange(256) for _ in range(cells * cells)])
    wrap = Image.new('L', (cells * 3, cells * 3))
    for i in range(3):
        for j in range(3):
            wrap.paste(small, (i * cells, j * cells))
    big = wrap.resize((size * 3, size * 3), Image.Resampling.BICUBIC).crop((size, size, size * 2, size * 2))
    return big.point(lambda v: max(0, min(255, int((v - 128) * edge + 128))))


def field(src: Image.Image, size: int, tile_px: int, seed: int, quarter_turns: bool = False) -> Image.Image:
    """One non-repeating surface from a seamless source. It wraps when `tile_px` divides `size`."""
    rng = random.Random(seed)
    tile = src.resize((tile_px, tile_px), Image.Resampling.LANCZOS)
    # Only half turns: any grain in the source keeps one direction (and the light stays on one side).
    half = tile.transpose(Image.Transpose.ROTATE_180)
    turns = [tile, half, tile, half]
    if quarter_turns:
        # A source with a strong weave of its own (winter's rows of dry tufts) is also turned a quarter,
        # so the rows cross and stop reading as a pattern.
        turns = [tile, tile.transpose(Image.Transpose.ROTATE_90), half, tile.transpose(Image.Transpose.ROTATE_270)]
    out = tiled(turns[0], size, rng.randrange(tile_px), rng.randrange(tile_px))
    for i, cells in ((1, 5), (2, 7), (3, 4)):
        layer = tiled(turns[i], size, rng.randrange(tile_px), rng.randrange(tile_px))
        out = Image.composite(layer, out, blobs(rng, size, cells, 5.0))
    # Slow drift in tone, a few percent, so the surface reads as one big piece of ground.
    drift = blobs(rng, size, 3, 1.0).filter(ImageFilter.GaussianBlur(size // 26)).point(lambda v: 120 + v * 16 // 255)
    return ImageChops.multiply(out, Image.merge('RGB', [drift] * 3).point(lambda v: min(255, v * 2)))


def tones(im: Image.Image) -> dict:
    small = im.resize((128, 128))
    px = sorted(small.get_flattened_data() if hasattr(small, 'get_flattened_data') else small.getdata(), key=sum)
    tenth = len(px) // 10
    avg = lambda ps: '#%02x%02x%02x' % tuple(round(sum(p[i] for p in ps) / len(ps)) for i in range(3))
    return {'mean': avg(px), 'dark': avg(px[:tenth]), 'light': avg(px[-tenth:])}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for name, src in TILES.items():
        path = os.path.join(SRC, f'{src}.png')
        if name == 'grass-winter':
            # No grass in winter: a snow field made from the pad's snow source (dry stalks are drawn
            # by the game, scenery.ts, so they never repeat).
            im = snow_field(smooth_snow(Image.open(os.path.join(SRC, f'{SNOW_SRC}.png')).convert('RGB')))
        elif os.path.exists(path):
            im = Image.open(path).convert('RGB')
        elif name == 'grass-spring':
            im = spring_grass(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        elif name == 'grass-fall':
            im = fall_grass(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        elif name == 'grass-prairie':
            im = prairie_stubble(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        elif name == 'grass-boreal':
            im = boreal_lichen(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        elif name == 'grass-thaw':
            im = thaw_grass(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        else:
            raise SystemExit(f'missing {path}')
        big = field(im, GRASS, GRASS_TILE[name], len(manifest) + 34)
        if name == 'grass-winter':
            big = drifts(big, 5)
        if name == 'grass-prairie':
            big = stubble_rows(big)
        if name == 'grass-thaw':
            # (Its tones are the GRASS's own, measured before the snow goes on: the theme's --ground is the grass.)
            manifest[name] = tones(big)
            big = thaw_snow(big, 9)
        big.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=62, method=6)
        manifest.setdefault(name, tones(big))
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
