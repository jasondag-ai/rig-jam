#!/usr/bin/env python3
"""Ground tiles: tools/ground-art/*.png (seamless 1024px squares) -> public/sprites/ground/*.webp
at 512px (still seamless: a whole-image resize keeps the wrap). Pad: pad-summer (gravel),
pad-spring (mud), pad-winter (snow). Outside the fence: grass-summer, grass-spring, grass-winter.
Mud puddles are toned down (highlights pulled toward the mud) so they never read as objects.
Spring grass has no source yet: it's the summer grass shifted toward Montney's dry spring green;
drop a grass_border_spring_v1.png in tools/ground-art/ and rerun to use a real one.
Writes src/ui/ground-tiles.json (mean, dark and light tones of each tile; themes use them).
Run: python3 tools/ground-tiles.py"""
import json, os
from PIL import Image, ImageChops, ImageEnhance, ImageStat

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
    toned = Image.blend(im, flat, 0.65)
    return Image.composite(toned, im, over.point(lambda v: v * 3 // 4))


def spring_grass(summer: Image.Image) -> Image.Image:
    """Stand-in: summer grass tinted slightly toward early spring (a little paler and yellower)."""
    warm = ImageChops.multiply(ImageEnhance.Brightness(summer).enhance(1.25), Image.new('RGB', summer.size, (236, 232, 168)))
    return Image.blend(summer, warm, 0.4)


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
        im = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=78, method=6)
        manifest[name] = tones(im)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
