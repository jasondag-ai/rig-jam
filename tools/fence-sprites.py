#!/usr/bin/env python3
"""Pipe swing gates: tools/fence-art/gate_open_v2.png -> public/sprites/fence/ (hinge post, latch
post, and the leaf tinted per gate color). The lease itself is bermed, not fenced (ART_BIBLE 3):
the berm is drawn in code (src/ui/berm.ts), so there are no rail or corner pieces any more.
Run: python3 tools/fence-sprites.py"""
import os
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'fence-art')
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'fence')
COLORS = {  # kept in sync with :root in style.css
    'red': (0xFF, 0x47, 0x47), 'blue': (0x2F, 0x8B, 0xFF), 'yellow': (0xFF, 0xD2, 0x1F),
    'green': (0x22, 0xC5, 0x5E), 'orange': (0xFF, 0x8A, 0x00), 'purple': (0xA5, 0x5C, 0xFF),
}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    # Gate (gate_open_v2): hinge post with its hinges, the leaf (plain white frame, tinted per gate
    # color here, same colors as the trucks), and the latch post with its chain.
    gate = Image.open(os.path.join(SRC, 'gate_open_v2.png')).convert('RGBA')
    gate.crop((0, 22, 44, 103)).save(os.path.join(OUT, 'gate-hinge.webp'), 'WEBP', quality=88, method=6)
    gate.crop((453, 22, 512, 105)).save(os.path.join(OUT, 'gate-latch.webp'), 'WEBP', quality=88, method=6)
    leaf = gate.crop((43, 30, 331, 93))
    for name, rgb in COLORS.items():
        painted = ImageChops.multiply(leaf, Image.new('RGBA', leaf.size, rgb + (255,)))
        painted.putalpha(leaf.getchannel('A'))
        painted.save(os.path.join(OUT, f'gate-leaf-{name}.webp'), 'WEBP', quality=88, method=6)


if __name__ == '__main__':
    main()
