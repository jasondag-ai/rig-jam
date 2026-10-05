#!/usr/bin/env python3
"""App icons from the cover's hero art: a square crop of the roughneck's face, hard hat and wrench,
readable at 48 px. Writes public/icons/ (192, 512, maskable 512, apple-touch 180, favicon 48) and
public/favicon.svg (the same crop with rounded corners). Run: python3 tools/app-icons.py"""
import base64
import io
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# The crop's centre and half-size in the 1080x1920 cover. The maskable icon is cut wider, so the
# same picture sits inside the middle 80% that a phone's icon mask always keeps.
CX, CY, HALF = 630, 880, 300
MASK_HALF = 375


def crop(im: Image.Image, half: int, size: int) -> Image.Image:
    return im.crop((CX - half, CY - half, CX + half, CY + half)).resize((size, size), Image.LANCZOS)


def small(im: Image.Image) -> Image.Image:
    """256 colours with dithering: a third of the bytes, no visible change at icon size."""
    return im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)


def main() -> None:
    im = Image.open(ROOT / 'public/cover.webp').convert('RGB')
    out = ROOT / 'public/icons'
    crop(im, HALF, 192).save(out / 'icon-192.png', optimize=True)
    small(crop(im, HALF, 512)).save(out / 'icon-512.png', optimize=True)
    small(crop(im, MASK_HALF, 512)).save(out / 'icon-maskable-512.png', optimize=True)
    crop(im, HALF, 180).save(out / 'apple-touch-icon.png', optimize=True)
    crop(im, HALF, 48).save(out / 'favicon-48.png', optimize=True)
    buf = io.BytesIO()
    crop(im, HALF, 64).save(buf, 'PNG', optimize=True)
    data = base64.b64encode(buf.getvalue()).decode()
    (ROOT / 'public/favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="r"><rect width="64" height="64" rx="12"/></clipPath></defs>'
        f'<image width="64" height="64" clip-path="url(#r)" href="data:image/png;base64,{data}"/></svg>\n'
    )


if __name__ == '__main__':
    main()
