#!/usr/bin/env python3
"""Pipe swing gates: tools/fence-art/gate_open_v2.png -> public/sprites/fence/ (hinge post, latch
post, and the leaf painted per gate color). Posts are one darker neutral steel; every piece
gets the game's dark toy outline. The lease itself is bermed, not fenced (ART_BIBLE 3):
the berm is drawn in code (src/ui/berm.ts), so there are no rail or corner pieces any more.
Run: python3 tools/fence-sprites.py"""
import os
from PIL import Image, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'fence-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'fence')
COLORS = {  # kept in sync with :root in style.css
    'red': (0xFF, 0x47, 0x47), 'blue': (0x2F, 0x8B, 0xFF), 'yellow': (0xFF, 0xD2, 0x1F),
    'green': (0x22, 0xC5, 0x5E), 'orange': (0xFF, 0x8A, 0x00), 'purple': (0xA5, 0x5C, 0xFF),
}


OUTLINE = (0x2A, 0x1A, 0x0C)
STEEL = (0x6C, 0x73, 0x7E)  # one darker neutral tone for the hinge and latch posts
PAD = 5  # room round each piece for its outline, source px


def outlined(img: Image.Image) -> Image.Image:
    """The piece with the game's dark toy outline round it (like the trucks), drawn at 3x and
    scaled back so the edge is clean."""
    k = 3
    big = Image.new('RGBA', ((img.width + PAD * 2) * k, (img.height + PAD * 2) * k), (0, 0, 0, 0))
    big.paste(img.resize((img.width * k, img.height * k), Image.Resampling.LANCZOS), (PAD * k, PAD * k))
    solid = big.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    r = 3 * k
    ring = solid.filter(ImageFilter.MaxFilter(r * 2 + 1)).filter(ImageFilter.GaussianBlur(k * 0.4)).point(lambda v: max(0, min(255, (v - 96) * 4)))
    out = Image.new('RGBA', big.size, OUTLINE + (0,))
    out.putalpha(ring)
    out.alpha_composite(big)
    return out.resize((img.width + PAD * 2, img.height + PAD * 2), Image.Resampling.LANCZOS)


def steel(img: Image.Image) -> Image.Image:
    """Posts in one darker neutral steel: the art's light and shade kept, but pulled most of the way
    to a single tone so the hardware sits back and the gate's color reads first."""
    shaded = ImageChops.multiply(img.convert('RGB'), Image.new('RGB', img.size, (150, 156, 168)))
    flat = Image.blend(shaded, Image.new('RGB', img.size, STEEL), 0.55).convert('RGBA')
    flat.putalpha(img.getchannel('A'))
    return flat


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    # Gate (gate_open_v2): hinge post with its hinges, the leaf (plain white frame, painted per gate
    # color here, same colors as the trucks), and the latch post with its chain.
    gate = Image.open(os.path.join(SRC, 'gate_open_v2.png')).convert('RGBA')
    outlined(steel(gate.crop((0, 22, 44, 103)))).save(os.path.join(OUT, 'gate-hinge.webp'), 'WEBP', quality=90, method=6)
    outlined(steel(gate.crop((453, 22, 512, 105)))).save(os.path.join(OUT, 'gate-latch.webp'), 'WEBP', quality=90, method=6)
    leaf = gate.crop((43, 30, 331, 93))
    # The rails' own shading, lifted so the color stays bright (a plain multiply dulls it).
    shade = leaf.convert('L').point(lambda v: min(255, 150 + v * 105 // 255))
    for name, rgb in COLORS.items():
        painted = ImageChops.multiply(Image.new('RGB', leaf.size, rgb), Image.merge('RGB', [shade] * 3)).convert('RGBA')
        painted.putalpha(leaf.getchannel('A'))
        outlined(painted).save(os.path.join(OUT, f'gate-leaf-{name}.webp'), 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    main()
