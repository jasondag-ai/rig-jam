#!/usr/bin/env python3
"""App icons from Jay's chosen art (tools/icon-art/roughneck_close.png: a tight crop of the cover,
the roughneck's face and white hard hat). Writes public/icons/: apple-touch-icon (180), 192, 512,
favicon (48) and a maskable 512 (the art inside the safe zone, padded with the cover's sky colour).
The files carry a version in their names (V): phones and browsers cache icons hard, so a new look
needs new names. Bump V, run this, and update index.html and manifest.webmanifest to match.
Run: python3 tools/app-icons.py"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
V = 'v2'
# The cover's sky, sampled from public/cover.webp: the maskable icon's padding.
SKY = (75, 168, 253)
# A phone's icon mask always keeps the middle 80%: the art is drawn that size.
SAFE = 0.8


def small(im: Image.Image) -> Image.Image:
    """256 colours with dithering: a third of the bytes, no visible change at icon size."""
    return im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)


def main() -> None:
    art = Image.open(ROOT / 'tools/icon-art/roughneck_close.png').convert('RGB')
    out = ROOT / 'public/icons'
    for old in out.glob('*.png'):
        old.unlink()
    size = lambda n: art.resize((n, n), Image.LANCZOS)
    size(180).save(out / f'apple-touch-icon-{V}.png', optimize=True)
    size(192).save(out / f'icon-{V}-192.png', optimize=True)
    small(size(512)).save(out / f'icon-{V}-512.png', optimize=True)
    size(48).save(out / f'favicon-{V}-48.png', optimize=True)
    inner = round(512 * SAFE)
    mask = Image.new('RGB', (512, 512), SKY)
    mask.paste(size(inner), ((512 - inner) // 2, (512 - inner) // 2))
    small(mask).save(out / f'icon-{V}-maskable-512.png', optimize=True)


if __name__ == '__main__':
    main()
