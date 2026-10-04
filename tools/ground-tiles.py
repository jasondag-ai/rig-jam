#!/usr/bin/env python3
"""Ground: tools/ground-art/*.png (seamless 1024px squares) -> public/sprites/ground/*.webp.

The lease (lease-summer gravel, lease-spring mud, lease-winter snow) is ONE continuous 1024px
surface that covers the whole pad and the berm band, never tiled. Outside the berm, each season has
a grass field (grass-summer, grass-spring, grass-winter): a 768px square that wraps, shown at 384px
on screen, with the blades at a fine, matching scale in every season.

Both are built the same way (`field`): several differently shifted copies of the source are blended
through soft random masks, so no patch repeats and there are no tile edges, then given a slow drift
in tone. Before that the sources are cleaned: the mud's puddles are filled in with mud from elsewhere
in the image and the snow's tire ruts are smoothed away (the game draws its own puddles, drifts and
tire tracks: src/ui/lease-detail.ts, tracks.ts).

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
    'pad-summer': 'ground_summer_gravel_v1',
    'pad-spring': 'ground_spring_mud_v1',
    'pad-winter': 'ground_winter_snow_v1',
    'grass-summer': 'grass_border_summer_v1',
    'grass-spring': 'grass_border_spring_v1',
    'grass-winter': 'grass_border_winter_v1',
}
LEASE = 1024
# The source square spans this many pixels of the lease image (about three cells of the 6.84-cell board).
LEASE_TILE = 450
# Grass field: image size, and how many pixels of it one source square spans (must divide the size so
# the field wraps). On screen the field is drawn at half its size (GRASS_CSS in themes.ts), so the
# sources repeat every 96px (they were 180px: blades about half the size), the same in every season.
GRASS = 768
GRASS_TILE = {'grass-summer': 192, 'grass-spring': 192, 'grass-winter': 192}


def fill_puddles(im: Image.Image) -> Image.Image:
    """Mud: anything much lighter than the mud (standing water) is replaced with mud from elsewhere
    in the image, so the base is plain mud. Whatever is still pale after that is pulled to the mud's tone."""
    def pale(img: Image.Image) -> Image.Image:
        # Standing water is a broad pale patch; a pale speck is just a clod catching the light.
        lum = img.convert('L').filter(ImageFilter.GaussianBlur(10))
        mean = ImageStat.Stat(lum).mean[0]
        mask = lum.point(lambda v: 255 if v > mean + 9 else 0)
        return mask.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(7))

    out = im
    for dx, dy in ((im.width // 2, im.height // 3), (im.width // 3, im.height * 2 // 3), (im.width * 3 // 4, im.height // 5)):
        out = Image.composite(ImageChops.offset(out, dx, dy), out, pale(out))
    flat = Image.new('RGB', im.size, tuple(int(c) for c in ImageStat.Stat(out).mean))
    return Image.composite(Image.blend(out, flat, 0.6), out, pale(out))


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


def spring_grass(summer: Image.Image) -> Image.Image:
    """Stand-in: summer grass tinted slightly toward early spring (a little paler and yellower)."""
    warm = ImageChops.multiply(ImageEnhance.Brightness(summer).enhance(1.25), Image.new('RGB', summer.size, (236, 232, 168)))
    return Image.blend(summer, warm, 0.4)


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
        if os.path.exists(path):
            im = Image.open(path).convert('RGB')
        elif name == 'grass-spring':
            im = spring_grass(Image.open(os.path.join(SRC, f'{TILES["grass-summer"]}.png')).convert('RGB'))
        else:
            raise SystemExit(f'missing {path}')
        if name == 'pad-spring':
            im = fill_puddles(im)
        if name == 'pad-winter':
            im = smooth_snow(im)
        if name.startswith('pad-'):
            big = field(im, LEASE, LEASE_TILE, len(manifest) + 7)
            # Gravel is all fine grain: it compresses poorly and hides compression well.
            big.save(os.path.join(OUT, f'lease-{name[4:]}.webp'), 'WEBP', quality=50 if name == 'pad-summer' else 70, method=6)
        else:
            big = field(im, GRASS, GRASS_TILE[name], len(manifest) + 31, quarter_turns=name == 'grass-winter')
            big.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=62, method=6)
        manifest[name] = tones(big)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
