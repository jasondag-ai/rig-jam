#!/usr/bin/env python3
"""A neutral stone button from the blue one: public/sprites/ui/btn_undo(@2x).webp ->
btn_neutral(@2x).webp. Same shape, bevel and gloss; the blue is taken out and replaced with a warm
stone grey, so Undo no longer shares a colour with the blue trucks and gates. Not new art: a
recolour of the approved button. Run: python3 tools/button-neutral.py"""
import os
from PIL import Image, ImageChops, ImageOps

UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sprites', 'ui')
STONE_DARK, STONE_LIGHT = (70, 64, 56), (236, 228, 212)

for suffix in ('', '@2x'):
    art = Image.open(os.path.join(UI, f'btn_undo{suffix}.webp')).convert('RGBA')
    # The button's light and shade (its brightest channel keeps the gloss), mapped onto stone.
    r, g, b, a = art.split()
    lum = ImageOps.autocontrast(ImageChops.lighter(ImageChops.lighter(r, g), b), cutoff=1)
    stone = ImageOps.colorize(lum, STONE_DARK, STONE_LIGHT, mid=(150, 141, 126)).convert('RGBA')
    stone.putalpha(a)
    stone.save(os.path.join(UI, f'btn_neutral{suffix}.webp'), 'WEBP', quality=90, method=6)
print('wrote btn_neutral')
