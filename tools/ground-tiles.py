#!/usr/bin/env python3
"""Ground: tools/ground-art/*.png (seamless 1024px squares) -> public/sprites/ground/*.webp.
The lease (lease-summer gravel, lease-spring mud, lease-winter snow) is ONE continuous 1024px
surface that covers the whole pad and the berm band, never tiled: four differently shifted copies of the source are blended through soft random masks, so no patch repeats and there
are no tile edges, then given a gentle large-scale tone drift.
Outside the berm: grass-summer, grass-spring, grass-winter, 512px seamless tiles.
Mud puddles are toned down (highlights pulled toward the mud) so they never read as objects.
Spring grass has no source yet: it's the summer grass shifted toward Montney's dry spring green;
drop a grass_border_spring_v1.png in tools/ground-art/ and rerun to use a real one.
Writes src/ui/ground-tiles.json (mean, dark and light tones of each tile; themes use them).
Run: python3 tools/ground-tiles.py"""
import json, os, random
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ground-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'ground')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'ground-tiles.json')
SIZE = 512
TILES = {
    'pad-summer': 'ground_summer_gravel_v1',
    'pad-spring': 'ground_spring_mud_v1',
    'pad-winter': 'ground_winter_snow_v1',
    'grass-summer': 'grass_border_summer_v1',
    'grass-spring': 'grass_border_spring_v1',
    'grass-winter': 'grass_border_winter_v1',
}


def soften_puddles(im: Image.Image) -> Image.Image:
    """Mud: anything much lighter than the mud (wet puddle sheen) is pulled most of the way back."""
    mean = ImageStat.Stat(im.convert('L')).mean[0]
    lum = im.convert('L')
    # Weight 0..1: how far above the mud's own tone a pixel is.
    over = lum.point(lambda v: max(0, min(255, int((v - mean - 8) * 255 / 40))))
    flat = Image.new('RGB', im.size, tuple(int(c) for c in ImageStat.Stat(im).mean))
    toned = Image.blend(im, flat, 0.85)
    return Image.composite(toned, im, over)


def spring_grass(summer: Image.Image) -> Image.Image:
    """Stand-in: summer grass tinted slightly toward early spring (a little paler and yellower)."""
    warm = ImageChops.multiply(ImageEnhance.Brightness(summer).enhance(1.25), Image.new('RGB', summer.size, (236, 232, 168)))
    return Image.blend(summer, warm, 0.4)


LEASE = 1024
# The source square spans this many pixels of the lease image (about three cells of the 6.84-cell board).
LEASE_TILE = 450


def tiled(tile: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new('RGB', (LEASE, LEASE))
    for x in range(-dx, LEASE, tile.width):
        for y in range(-dy, LEASE, tile.height):
            out.paste(tile, (x, y))
    return out


def blobs(rng: random.Random, cells: int, edge: float) -> Image.Image:
    """A soft random mask: `cells` blobs across, with transitions sharpened by `edge`."""
    small = Image.new('L', (cells, cells))
    small.putdata([rng.randrange(256) for _ in range(cells * cells)])
    big = small.resize((LEASE, LEASE), Image.Resampling.BICUBIC)
    return big.point(lambda v: max(0, min(255, int((v - 128) * edge + 128))))


def lease(src: Image.Image, seed: int) -> Image.Image:
    """One non-repeating surface from a seamless source."""
    rng = random.Random(seed)
    tile = src.resize((LEASE_TILE, LEASE_TILE), Image.Resampling.LANCZOS)
    # Only half turns: any grain in the source (old ruts in the mud, drifts in the snow) keeps one direction.
    half = tile.transpose(Image.Transpose.ROTATE_180)
    turns = [tile, half, tile, half]
    out = tiled(turns[0], rng.randrange(LEASE_TILE), rng.randrange(LEASE_TILE))
    for i, cells in ((1, 5), (2, 7), (3, 4)):
        layer = tiled(turns[i], rng.randrange(LEASE_TILE), rng.randrange(LEASE_TILE))
        out = Image.composite(layer, out, blobs(rng, cells, 5.0))
    # Slow drift in tone, a few percent, so the surface reads as one big piece of ground.
    drift = blobs(rng, 3, 1.0).filter(ImageFilter.GaussianBlur(40)).point(lambda v: 120 + v * 16 // 255)
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
            im = soften_puddles(im)
        if name.startswith('pad-'):
            big = lease(im, len(manifest) + 7)
            # Gravel is all fine grain: it compresses poorly and hides compression well.
            big.save(os.path.join(OUT, f'lease-{name[4:]}.webp'), 'WEBP', quality=50 if name == 'pad-summer' else 70, method=6)
            manifest[name] = tones(big)
            continue
        im = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=78, method=6)
        manifest[name] = tones(im)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
