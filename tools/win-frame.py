#!/usr/bin/env python3
"""Win card frame: public/sprites/ui/panel_win@2x.webp -> public/sprites/ui/frame_win(@2x).webp.

The panel art is a fixed-size card: banner, a cream box with gold trim, and two button slots drawn
into its bottom. The game's win card has to grow with its content (a level win is short, a Daily
Pad win adds the streak sign and Share), so the frame is used as a 9-slice border image. For that
the two button slots are cut out here (the rows between the cream box's gold trim and the blue
bottom rim), leaving banner, trim all the way round, and rim: corners and edges that stretch
cleanly. The buttons then sit inside the cream box like every other row.

Also prints the slice sizes (in @2x pixels) that style.css uses.
Run: python3 tools/win-frame.py"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(HERE, '..', 'public', 'sprites', 'ui')
# Rows of the @2x art: the blue band under the cream box's trim starts at KEEP_TO; the button slots
# end and the bottom rim resumes at RESUME. FADE rows are cross-faded so the blue joins smoothly.
KEEP_TO = 1046
RESUME = 1196
FADE = 6
# The plain blue band under the cream box's gold trim (rows of the cut image), and how tall to make it.
BAND_FROM = 1043
BAND_TO = 1068
BAND = 39
# 9-slice (in @2x pixels of the output): banner + top trim corner, side walls + trim corner, bottom.
SLICE = {'top': 262, 'side': 118}


def main() -> None:
    art = Image.open(os.path.join(UI, 'panel_win@2x.webp')).convert('RGBA')
    w, h = art.size
    top = art.crop((0, 0, w, KEEP_TO))
    bottom = art.crop((0, RESUME - FADE, w, h))
    out = Image.new('RGBA', (w, KEEP_TO + (h - RESUME)), (0, 0, 0, 0))
    out.paste(top, (0, 0))
    # Cross-fade the last FADE rows of the top part into the first FADE rows of the bottom part.
    for i in range(FADE):
        a = top.crop((0, KEEP_TO - FADE + i, w, KEEP_TO - FADE + i + 1))
        b = bottom.crop((0, i, w, i + 1))
        out.paste(Image.blend(a, b, (i + 1) / (FADE + 1)), (0, KEEP_TO - FADE + i))
    out.paste(bottom.crop((0, FADE, w, bottom.height)), (0, KEEP_TO))
    # The bottom of the frame as thick as its sides: the art's blue band under the trim is thinner
    # (25 rows, plus the 22-row underside lip) than the side walls (61 px), so it is stretched to
    # BAND rows. Trim, band and lip then add up to the same 61 px all round.
    band = out.crop((0, BAND_FROM, w, BAND_TO)).resize((w, BAND), Image.Resampling.BICUBIC)
    tall = Image.new('RGBA', (w, out.height + BAND - (BAND_TO - BAND_FROM)), (0, 0, 0, 0))
    tall.paste(out.crop((0, 0, w, BAND_FROM)), (0, 0))
    tall.paste(band, (0, BAND_FROM))
    tall.paste(out.crop((0, BAND_TO, w, out.height)), (0, BAND_FROM + BAND))
    out = tall
    out.save(os.path.join(UI, 'frame_win@2x.webp'), 'WEBP', quality=90, method=6)
    out.resize((w // 2, out.height // 2), Image.Resampling.LANCZOS).save(os.path.join(UI, 'frame_win.webp'), 'WEBP', quality=90, method=6)
    print('frame', out.size, 'slices (@2x px): top', SLICE['top'], 'side', SLICE['side'], 'bottom', out.height - 990)


if __name__ == '__main__':
    main()
