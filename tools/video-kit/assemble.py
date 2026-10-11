#!/usr/bin/env python3
"""THE VIDEO KIT, PUT TOGETHER (job U11): what the tools in this folder made (qc-out/video-kit/kit/) is copied into
~/Desktop/RHR Art Inbox/video_kit/, the music and its credits are added, CLIPS.md is written, the evolution contact
sheet gets build 11's column, and the kit is zipped into ../video_kit_zips/ in parts of under 50 MB.

Run: python3 tools/video-kit/assemble.py      (after record.mjs, cut.mjs, stills.mjs and brand.mjs)
"""
import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
MADE = ROOT / 'qc-out' / 'video-kit' / 'kit'
INBOX = Path.home() / 'Desktop' / 'RHR Art Inbox'
KIT = INBOX / 'video_kit'
ZIPS = INBOX / 'video_kit_zips'
LIVE = 'https://jasondag-ai.github.io/rig-jam/'
VERSION = json.loads((ROOT / 'package.json').read_text())['version']

# What each phone clip shows (the order is the brief's).
CLIPS = [
    ('cover_first_drag', "The cover as the game opens (the roughneck, RIG JAM, TAP TO START), one tap, and level 1: the ghost finger shows the first move, then both trucks are dragged out through their gates and the win card comes."),
    ('solves_cardium', "Cardium 8 (summer): seven moves near the end of the solve, trucks dragged clear and driven out through their gates."),
    ('solves_montney', "Montney 7 (spring mud, lease equipment in the way; the cow in the strip): six moves near the end of the solve."),
    ('solves_duvernay', "Duvernay 6 (winter; its two convoy trucks carry their numbers): six moves near the end of the solve."),
    ('solves_bigpad', "Clearwater 4, the 8 x 8 Big Pad: six moves near the end of the solve, one truck after another out."),
    ('solves_baldonnel', "Baldonnel 1: a frac unit is pushed at a soft road ban patch and cannot go (its driver: \"Road ban. I'm too heavy for that.\"); then a pickup drives over the other patch and out, and the pad goes on."),
    ('fling', "Fling: four quick flicks on Cardium 6, each sending a truck all the way down its lane and out through its gate."),
    ('perfect_solve', "Cardium 7 at par: the last three moves, the last truck out, hard-hat confetti, the win card with three hard hats and the Zero Incident medal."),
    ('daily_pad_share', "Today's Daily Pad (#11, named in the HUD): its last three trucks out, the win card with the days-without-incident sign, and a tap on Share (\"Copied! Paste it anywhere.\")."),
    ('sunday_turnaround', "The home page (Daily Pad and Sunday Turnaround buttons), a tap on Sunday Turnaround #1, and the first five moves of the week's 8 x 8 pad."),
    ('region_swipe', "The home page: the region bar swiped along and each of the seven regions tapped in turn (Cardium, Montney, Duvernay, Mannville, Bakken, Clearwater, Baldonnel), the list changing season each time."),
    ('gag_magpie', "Sighting, Magpie (Cardium): he lands on a truck's cab, strains, leaves his mark, looks smug and flies off; the driver: \"Somebody get the pressure washer.\""),
    ('gag_moose', "Sighting, Moose (Duvernay): he rises from behind the top berm, blinks, chews, stares, \"Mmrrph\", and ducks. The whole of it."),
    ('gag_beaver', "Sighting, Beaver (Mannville): BONK, his pipe will not pass the aspen; BONK again; an idea; he tilts it upright, squeezes past, and is proud."),
    ('gag_personal_cloud', "Sighting, Personal Cloud (Bakken): a small cloud rains on Slow Moe alone; he sidesteps, it follows; umbrella, smug; he closes it, DOWNPOUR."),
    ('gag_out_cold', "Sighting, Out Cold (Clearwater): one mighty swing, CRACK, TOK off the rig mats, PING off the aspen, BONK on Moe's hard hat, timber; the bearded worker: \"Fore.\", and drags him off by the ankles."),
    ('gag_runaway_roll', "Sighting, The Runaway Roll (Cardium), on its real trigger: a truck bumps the bottom berm twice, the biffy's door bangs open, the roll runs off, a glove gropes for it, and Moe shuffles after it."),
    ('gag_right_of_way', "Sighting, Right of Way (Baldonnel): a bison lies down on the lane; Moe honks (BEEP BEEP), gets out, \"Shoo!\", claps, gives up and backs away; the bison giggles."),
    ('gag_last_ice', "Sighting, Last Ice (Baldonnel): Moe on an ice pan catches one tiny fish, \"Got one!\", jumps up, the pan tips, SPLASH; the fish flips away and a big pike takes it, CHOMP."),
    ('gag_overweight', "SPARE. Sighting, Overweight (Baldonnel): Moe on the truck scale is in the red; off come the hard hat, the lunch kit, the boots; still red; a magpie lands on it: ding, green."),
    ('gag_late_croak', "SPARE. Sighting, Late Croak (Baldonnel): three wood frogs sing in a round, freeze as the bearded worker walks by, and the little one lets out one late CREEK."),
    ('gag_near_miss', "SPARE. Sighting, Near Miss (Cardium): the gopher pops up, the hotshot truck tears across the strip, and he comes back up dusty: \"Near miss!\""),
    ('gag_runaway_bale', "SPARE. Sighting, Runaway Bale (Bakken): the round bale rolls away, the rancher (\"Hey!\") chases it and pushes it back; it rolls one more inch."),
    ('dig_kerguelen', "The Wildlife Log (40/40) opened from the home page, then one long fast scroll down through the Earth to the far side: the Kerguelen Islands upside down, the penguin (\"You're upside down.\"), the seal (\"No, YOU are.\"), and the Dug Through card."),
    ('finale', "The whole ending for a perfect game: the Perfect Game card (70 of 70, 40 of 40, \"Huh. Not bad.\"), the crew photo (\"Squeeze in!\", the self-timer, the magpie, SPLAT and FLASH, \"Seriously?\", the Polaroid), the credits, Still Here (Moe at the biffy: \"You're still here?\", \"Shift's over. Go home.\") and the cover. Sound effects AND music: the Classic Rock menu loop under the card, then the graduation march from the photo through the credits."),
]
SHOTS = [
    ('shot1_cover', 'The cover: the roughneck with his wrench, RIG JAM, TAP TO START.'),
    ('shot2_board', 'A busy, colourful board mid-solve: Bakken 6 (Tank Battery), four moves in.'),
    ('shot3_perfect', 'The win card at par (Cardium 8): three hard hats, the Zero Incident medal, confetti falling behind the card.'),
    ('shot4_sighting', "A sighting on its punchline: Out Cold (Clearwater), BONK on Moe's hard hat."),
    ('shot5_polaroid', "Spare: the finale's crew photo, the Polaroid on the lease (\"The crew. Zero incidents.* *almost\")."),
]


def probe(f: Path) -> dict:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height,r_frame_rate', '-of', 'json', str(f)], capture_output=True, text=True).stdout
    j = json.loads(out)
    v = next(s for s in j['streams'] if s.get('width'))
    return {'secs': float(j['format']['duration']), 'w': v['width'], 'h': v['height'], 'fps': v['r_frame_rate'], 'codecs': [s['codec_name'] for s in j['streams']]}


def copy_made() -> None:
    for sub in ('01_evolution', '02_phone_clips', '04_brand', '06_screenshots'):
        (KIT / sub).mkdir(parents=True, exist_ok=True)
        for f in sorted((MADE / sub).iterdir()):
            if f.suffix in ('.mp4', '.png'):
                shutil.copyfile(f, KIT / sub / f.name)
    # Only the clips CLIPS.md names are in the kit.
    names = {f'{n}.mp4' for n, _ in CLIPS}
    for f in (KIT / '02_phone_clips').glob('*.mp4'):
        if f.name not in names:
            f.unlink()


def music() -> None:
    src = INBOX / 'Sound files' / 'classic_rock' / 'public_audio_music' / 'classic_menu.mp3'
    shutil.copyfile(src, KIT / '05_music' / 'stylish_upbeat_rock.mp3')
    (KIT / '05_music' / 'credits.txt').write_text('''Music in Rig Jam: the two menu tracks in this folder

USE THIS ONE FOR THE VIDEOS (Classic Rock style, menu track)
Title:    Stylish Upbeat Rock
Artist:   Audioknap
Source:   Pixabay Music
URL:      https://pixabay.com/music/rock-stylish-upbeat-rock-615339/
Licence:  Pixabay Content License (https://pixabay.com/service/license-summary/)
File:     stylish_upbeat_rock.mp3 (the game's own menu loop, 1:54, seamless: it can be repeated end to start)

Credit line (attribution is not required by this licence, but this is the line to use):
Music: "Stylish Upbeat Rock" by Audioknap, from Pixabay (Pixabay Content License)

SPARE (Country style, menu track)
Title:    Fun On The Farm
Artist:   geoffharvey
Source:   Pixabay Music
URL:      https://pixabay.com/music/cartoons-fun-on-the-farm-377651/
Licence:  Pixabay Content License (https://pixabay.com/service/license-summary/)
File:     fun_on_the_farm.mp3 (the full track as downloaded, about 1:37)

Credit line (attribution is not required by this licence, but this is the line to use):
Music: "Fun On The Farm" by geoffharvey, from Pixabay (Pixabay Content License)

IN THE FINALE CLIP ONLY (02_phone_clips/finale.mp4 carries it already; there is no separate file)
The graduation march: the trio of Elgar's "Pomp and Circumstance" March No. 1, played by the United States Marine Band.
Public domain (the composition by age, the recording as a work of the United States government). No credit needed.
''')


def contact_sheet() -> None:
    """Build 11's column is added to the right of the sheet, laid out as the ten before it."""
    sheet_path = KIT / '01_evolution' / 'evolution_contact_sheet.png'
    old = Image.open(sheet_path).convert('RGB')
    cols = 10 if old.width < 4300 else 11
    if cols == 11:
        old = old.crop((0, 0, round(old.width * 10 / 11), old.height))
    col = old.width / 10
    new = Image.new('RGB', (round(col * 11), old.height), old.getpixel((2, 2)))
    new.paste(old, (0, 0))
    # Where a column's three pictures sit: measured on the last column of the old sheet (not the background colour).
    bg = old.getpixel((2, 2))
    x0 = round(col * 9)
    strip = old.crop((x0, 0, old.width, old.height))
    rows = [any(abs(a - b) > 14 for px in [strip.getpixel((x, y)) for x in range(20, strip.width - 20, 23)] for a, b in zip(px, bg)) for y in range(strip.height)]
    runs, start = [], None
    for y, on in enumerate(rows + [False]):
        if on and start is None: start = y
        if not on and start is not None:
            if y - start > 300: runs.append((start, y))
            start = None
    colsx = [any(abs(a - b) > 14 for a, b in zip(strip.getpixel((x, (runs[0][0] + runs[0][1]) // 2)), bg)) for x in range(strip.width)]
    left, right = colsx.index(True), len(colsx) - 1 - colsx[::-1].index(True)
    pre = '11_2026-10-10_rig_jam_1_0_1'
    for (y0, y1), part in zip(runs[-3:], ('1_level_select', '2_board', '3_win_card')):
        im = Image.open(KIT / '01_evolution' / f'{pre}_{part}.png').convert('RGB')
        w = right - left + 1
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).crop((0, 0, w, y1 - y0))
        new.paste(im, (round(col * 10) + left, y0))
    d = ImageDraw.Draw(new)
    try:
        f1, f2 = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 34), ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 24)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    d.text((round(col * 10) + left, 18), '2026-10-10', fill=(235, 235, 235), font=f1)
    d.text((round(col * 10) + left, 62), f'rig jam {VERSION}', fill=(170, 170, 170), font=f2)
    new.save(sheet_path)


def clips_md() -> None:
    rows = []
    for name, what in CLIPS:
        p = probe(KIT / '02_phone_clips' / f'{name}.mp4')
        assert (p['w'], p['h'], p['fps']) == (1080, 1920, '30/1') and p['codecs'] == ['h264', 'aac'], (name, p)
        rows.append(f'| `{name}.mp4` | {p["secs"]:.1f} s | {what} |')
    evo = probe(KIT / '01_evolution' / '11_2026-10-10_rig_jam_1_0_1_4_play.mp4')
    shots = '\n'.join(f'| `{n}.png` | {w} |' for n, w in SHOTS)
    (KIT / 'CLIPS.md').write_text(f'''# Rig Jam video kit: what is in it (Oct 10, 2026)

Everything here was recorded from the live game, version {VERSION}, at {LIVE} (nothing is generated or mocked up).
The game was called Rush Hour Rigs until Oct 9: builds 01 to 10 in `01_evolution` still show that name on their
level lists (`_1_level_select.png`); the brief uses only their boards. Nothing else in the kit shows it.

## 02_phone_clips

All are vertical 1080 x 1920, 30 fps, H.264 with AAC sound: THE GAME'S OWN SOUND EFFECTS, MUSIC OFF, except
`finale.mp4`, which has its music too. Real drags and flicks on the live game. No finger is drawn (as on a phone's
own screen recording). Each starts and ends on a still or settled moment, so it can be trimmed freely.

| File | Length | What it shows |
|---|---|---|
{chr(10).join(rows)}

Notes for the edit:
- The sightings play in the strip under the lease at the size they have in the game: crop in on the bottom third for
  a close shot. Eight are the kit's picks (two from Baldonnel: Right of Way and Last Ice); the four marked SPARE
  include two more from Baldonnel.
- `finale.mp4`: the crew photo's SPLAT and FLASH are at about 0:11.2 and the Polaroid drops at about 0:11.4; the
  credits roll from about 0:15 to 0:26; "You're still here?" is at about 0:32 and "Shift's over. Go home." at about
  0:34; the cover is back at about 0:39.
- `dig_kerguelen.mp4`: the scroll is one continuous fast swipe (about 5 s for the whole Earth), so the layers blur
  past; the far side holds for about 2.5 s at the end.
- `solves_*`, `fling`, `perfect_solve`: every truck's drive out through its gate is a clean place to cut.

## 01_evolution

Build 11 is added: `11_2026-10-10_rig_jam_1_0_1_1_level_select.png`, `_2_board.png`, `_3_win_card.png` (1170 x 2532,
framed exactly like builds 01 to 10: the list with Cardium 1 to 4 cleared, Cardium 5 three moves in with one near
miss, its win card) and `_4_play.mp4` ({evo['w']} x {evo['h']}, {evo['secs']:.1f} s, no sound, like the others: Cardium 6, a bump
and its driver's line, then the first moves). `evolution_contact_sheet.png` has its column.

## 04_brand

- `end_card.png` (1080 x 1920): the cover, RIG JAM, and the link ({LIVE}). The title sits a little higher and
  smaller than on the game's cover, so a caption fits under it in the top third (between about y 460 and y 600).
- `title_logo.png` (transparent): RIG JAM in the game's own title type, colours and outline.
- `rig_jam_title_2048.png`, `rig_jam_title_1024sq.png`, `cover_hero_1080x1920.png`, `cover_hero_original.webp`,
  `app_icon_512.png`: as before.

## 05_music

- `stylish_upbeat_rock.mp3`: the Classic Rock menu track (USE THIS). `fun_on_the_farm.mp3`: the Country one (spare).
- `credits.txt`: the credit line for each.

## 06_screenshots (for Jay's post, not for the videos): 1170 x 2532 PNG

| File | What it shows |
|---|---|
{shots}

## 03_mac_clips

Unchanged: the screen recordings of the AI tools at work.
''')


def zips() -> None:
    ZIPS.mkdir(exist_ok=True)
    for old in ZIPS.glob('rig_jam_video_kit_*.zip'):
        old.unlink()
    files = sorted(f for f in KIT.rglob('*') if f.is_file() and f.name != '.DS_Store')
    LIMIT = 46_000_000
    parts, cur, size = [], [], 0
    # (Whole folders stay together where they fit; a folder too big for one part runs on into the next.)
    for f in files:
        s = f.stat().st_size
        if cur and size + s > LIMIT:
            parts.append(cur); cur, size = [], 0
        cur.append(f); size += s
    if cur: parts.append(cur)
    for i, part in enumerate(parts, 1):
        z = ZIPS / f'rig_jam_video_kit_{i}_of_{len(parts)}.zip'
        with zipfile.ZipFile(z, 'w', zipfile.ZIP_STORED) as zf:
            for f in part:
                zf.write(f, Path('video_kit') / f.relative_to(KIT))
        with zipfile.ZipFile(z) as zf:
            assert zf.testzip() is None
        folders = sorted({f.relative_to(KIT).parts[0] for f in part})
        print(f'{z.name}: {z.stat().st_size / 1e6:.1f} MB, {len(part)} files ({", ".join(folders)})')
        assert z.stat().st_size < 50_000_000


if __name__ == '__main__':
    copy_made()
    music()
    contact_sheet()
    clips_md()
    zips()
