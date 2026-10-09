#!/usr/bin/env python3
"""Judges a win card screenshot by its pixels (what the eye sees), not by element boxes.
Usage: python3 tools/card-check.py shot.png <scale> <cardLeft> <cardTop> <cardWidth> <cardHeight> <f>
(card box in CSS px; f = CSS px per px of the @2x frame art). Prints JSON, all in CSS px:
  gapTop / gapBottom: blue ribbon showing above and below the banner lettering (outline included),
                      at the text's horizontal centre
  side / bottom:      frame thickness outside the cream box's gold trim, at the sides and the bottom"""
import json, sys
from PIL import Image

path, scale, left, top, width, height, f = sys.argv[1], *map(float, sys.argv[2:8])
im = Image.open(path).convert('RGB')
px = im.load()
S = lambda v: int(round(v * scale))
blue = lambda p: p[2] > 150 and p[0] < 120 and p[1] < 190
gold = lambda p: p[0] > 170 and p[1] > 120 and p[2] < 130 and p[0] - p[2] > 80
cream = lambda p: p[0] > 235 and p[1] > 225 and p[2] > 195

cx = S(left + width / 2)
# Ribbon: blue pixels in the columns round the centre (wherever the letters leave it showing),
# within the rows the ribbon can occupy (the frame's top slice above the cream box's blue band).
cols = range(cx - S(60), cx + S(60), 3)
bs = [y for y in range(S(top + 26 * f), S(top + 134 * f)) for x in cols if blue(px[x, y])]
ribbon_top, ribbon_bottom = min(bs), max(bs)
# Letters: pixels of the lettering's own flat yellow (--accent, #ffc21a) inside the ribbon. The gold
# trim is shaded, never this exact flat colour for more than a stray pixel, so whole rows are needed.
# The lettering is judged as the block the eye sees: yellow letters with their dark outline and lip.
ink = lambda p: (p[0] > 248 and 186 <= p[1] <= 202 and p[2] < 45) or (abs(p[0] - 42) < 5 and abs(p[1] - 26) < 5 and abs(p[2] - 12) < 5)
# ONLY WHAT LIES ON THE RIBBON COUNTS: the banner is an arc, so beside its crown a row of the screenshot is still the
# scenery behind the card, and a tree's dark outline there is the very colour of the lettering's outline. (On a day
# whose Daily Pad had trees behind the banner's shoulders, they were read as letters touching the ribbon's top.) In
# each row the letters are looked for between that row's own leftmost and rightmost blue.
def inked(y):
    xs = [x for x in range(S(left + width * 0.1), S(left + width * 0.9)) if blue(px[x, y])]
    return len(xs) > 0 and sum(1 for x in range(min(xs), max(xs) + 1) if ink(px[x, y])) >= S(4)
rows = [y for y in range(ribbon_top, ribbon_bottom + 1) if inked(y)]
text_top, text_bottom = min(rows), max(rows)

# Frame: from the card's outer edge in to the gold trim round the cream box.
my = S(top + height * 0.6)
side = next(x for x in range(S(left), S(left + width / 2)) if cream(px[x, my])) - S(left)
side_r = S(left + width) - next(x for x in range(S(left + width) - 1, S(left + width / 2), -1) if cream(px[x, my]))
bottom = S(top + height) - next(y for y in range(S(top + height) - 1, S(top + height / 2), -1) if cream(px[cx, y]))
print(json.dumps({'gapTop': (text_top - ribbon_top) / scale, 'gapBottom': (ribbon_bottom - text_bottom) / scale, 'side': side / scale, 'sideRight': side_r / scale, 'bottom': bottom / scale}))
