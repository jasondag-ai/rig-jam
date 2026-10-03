#!/usr/bin/env python3
"""Accepted art-inbox images -> public/sprites/{world,ui,anim}/ as WebP (with transparency).

Static images (Batch A world, Batch B UI): trimmed of empty margin, 1x (half size) and @2x
(source size). Animations (Batch C): each accepted `<name>_<action>_sheet.png` becomes a WebP
sheet with 256px frames (128px for the 256px goose), frames side by side, plus a manifest
(src/ui/anim-sprites.json: frame count and frame size per animation) the game reads.

Sources are the originals, kept out of git (too big): pass the folder they're in (art-inbox/ while
processing; ~/Desktop/RHR Art Inbox/done/ after). REJECTED lists items that failed ART_BIBLE.md
(see art-inbox/REJECTS.md); they're skipped. Run: python3 tools/inbox-sprites.py art-inbox"""
import json, os, re, sys
from PIL import Image

REJECTED = {
    'bear_wipe', 'rabbit_deadpan_idle', 'rabbit_hop_away', 'magpie_poop', 'magpie_hop', 'moose_chew',
    'company_man_fist_pump', 'spotter_sleep', 'spotter_wake_startle', 'pumper_write_clipboard',
    'hotshot_drive', 'hotshot_brake', 'pumper_truck_drive', 'pumper_truck_door_open',
    'pumper_truck_door_close', 'pumper_get_in', 'pumper_get_out',
}
HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', 'public', 'sprites')
MANIFEST = os.path.join(HERE, '..', 'src', 'ui', 'anim-sprites.json')


def static(src: str, out: str, name: str) -> None:
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    os.makedirs(out, exist_ok=True)
    im.save(os.path.join(out, f'{name}@2x.webp'), 'WEBP', quality=84, method=6)
    im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.Resampling.LANCZOS).save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=84, method=6)


def main(root: str) -> None:
    for batch, kind in (('batch_a', 'world'), ('batch_b', 'ui')):
        d = os.path.join(root, batch)
        for f in sorted(os.listdir(d)):
            if f.endswith('.png'):
                static(os.path.join(d, f), os.path.join(PUB, kind), f[:-4])
    d = os.path.join(root, 'batch_c')
    out = os.path.join(PUB, 'anim')
    os.makedirs(out, exist_ok=True)
    manifest = {}
    for f in sorted(os.listdir(d)):
        if f == 'magpie_splat.png':
            static(os.path.join(d, f), os.path.join(PUB, 'anim'), 'magpie_splat')
            continue
        m = re.match(r'(.+)_sheet\.png$', f)
        if not m or m.group(1) in REJECTED:
            continue
        name = m.group(1)
        sheet = Image.open(os.path.join(d, f)).convert('RGBA')
        # Frame count from the sheet's own layout: frames are as tall as the sheet and as wide as
        # the delivered single frame (512 or 1024 wide; 256 for the goose).
        single = Image.open(os.path.join(d, f'{name}_01.png'))
        frames = round(sheet.width / single.width)
        h = 128 if single.height <= 256 else 256
        w = round(single.width * h / single.height)
        sheet.resize((w * frames, h), Image.Resampling.LANCZOS).save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=80, method=6)
        manifest[name] = {'frames': frames, 'w': w, 'h': h}
    with open(MANIFEST, 'w') as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
        fh.write('\n')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'art-inbox')
