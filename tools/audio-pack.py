#!/usr/bin/env python3
"""Builds public/audio/ from Jay's picked sounds (needs ffmpeg).

Sources (not in the repo): the folders rhr_cartoon_sounds and rhr_music_styles, in
~/Desktop/RHR Art Inbox/Sound files/ (or loose on the Desktop). Only the PICKED files are copied:

  public/audio/sfx/<key>.mp3      one per cue (mono, 44.1 kHz): leading silence trimmed, cut to
                                  the part the game uses, a short fade at the end so nothing stops
                                  abruptly. Loops (the motors, the mosquito) are cut to a whole
                                  number of their own cycles and left unfaded.
  public/audio/music/<style>_<menu|play>.{ogg|opus,mp3}
                                  the six music loops. Each is offered gapless first (Ogg Vorbis as
                                  delivered, or Ogg Opus where this script had to re-cut the loop)
                                  and as MP3 for phones that cannot decode Ogg. Tracks whose loop
                                  point was weak, and the Country tracks (full songs, not loops),
                                  get a 2 s crossfade of their tail into their head baked in.
  src/audio/pack.json             what the game needs to know about each file: length, measured
                                  loudness (the mix table in src/audio/pack.ts evens them out), and
                                  the music files' formats.
  src/audio/credits.json          the Credits screen: one row per file used, from the packs' CREDITS.md.

Run: python3 tools/audio-pack.py [out_dir]   (default: the repo's public/audio)
     python3 tools/audio-pack.py --finale-music  (only the finale's credits music, once Jay's pick is named in FINALE_MUSIC)
     python3 tools/audio-pack.py --finished  (only the FINISHED files, copied as they are; nothing else is rebuilt)
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def source(name: str) -> Path:
    """The pack folder: in the art inbox's "Sound files", or loose on the Desktop."""
    desk = Path.home() / 'Desktop'
    inbox = desk / 'RHR Art Inbox' / 'Sound files' / name
    return inbox if inbox.exists() else desk / name


SFX_SRC = source('rhr_cartoon_sounds')
MUSIC_SRC = source('rhr_music_styles')
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public' / 'audio'

# key: (source file under rhr_cartoon_sounds, seconds to keep (None = all), loop)
SFX = {
    'drag': ('sfx/01_truck_drag_start_cartoon_drive_a.mp3', 0.9, False),
    'motor': ('sfx/02_truck_moving_motor_seamless_01_a.mp3', None, True),
    'reverse': ('sfx/03_reversing_truck_reverse_beeps_a.mp3', None, False),
    'bump': ('sfx/04_bump_soft_quick_punch_c.mp3', None, False),
    'horn': ('sfx/06_horn_chord_toy_horn_high_c.mp3', None, False),
    'lose': ('sfx/08_win_over_par_wah_wah_horn_c.mp3', None, False),
    'streak': ('sfx/09_streak_up_winning_chimes_b.mp3', None, False),
    'tap': ('sfx/10_button_tap_oga_pop1_c.mp3', None, False),
    'click': ('art/click.wav', None, False),        # EVERY button's tap: one wooden toy click (the soap-bubble Back pop is gone)
    'step': ('sfx/13_footsteps_kenney_wood_000_c.mp3', None, False),
    'quad_start': ('sfx/14_quad_start_motor_seamless_03_a.mp3', 1.2, False),
    'quad_idle': ('sfx/14_quad_idle_motor_seamless_04_a.mp3', None, True),
    'quad_rev': ('sfx/14_quad_rev_motor_seamless_08_a.mp3', None, True),
    'snore': ('sfx/15_snore_funny_snore_c.mp3', None, False),
    'cord': ('sfx/16_cord_snap_oga_bung_c.mp3', None, False),
    'radio': ('sfx/17_radio_walkie_c.mp3', None, False),
    'magpie': ('sfx/18_magpie_raven_call_b.mp3', None, False),
    'geese': ('sfx/19_geese_goose_honking_c.mp3', 1.6, False),
    'moose': ('sfx/20_moose_oga_grunt_01_a.mp3', None, False),
    'gopher': ('sfx/21_gopher_double_bird_chirp_a.mp3', None, False),
    'cow': ('sfx/22_cow_cow_moo_pix_c.mp3', None, False),
    'bull': ('sfx/23_bull_oga_nose_b.mp3', None, False),
    'outhouse': ('custom/24_outhouse_squeak_bonk_y.mp3', None, False),
    'pumpjack': ('custom/25_pumpjack_squeak_clunk_y.mp3', None, False),
    'mosquito': ('sfx/26_mosquito_mosquito_buzz_a.mp3', None, True),
    'camera': ('sfx/27_camera_shutter_click_a.mp3', None, False),
    'wind': ('sfx/28_wind_gust_air_woosh_a.mp3', None, False),
    'splat': ('sfx/29_splat_funny_fast_splat_a.mp3', None, False),
    'chomp': ('sfx/30_chomp_chip_crunch_c.mp3', None, False),
    'burp': ('sfx/31_burp_ed_burp_pop_c.mp3', None, False),
    'slap': ('sfx/32_slap_soft_punch_c.mp3', None, False),
    'poke': ('sfx/33_poke_oga_bing_01_b.mp3', None, False),
    'thwip': ('sfx/34_tongue_quick_kiss_a.mp3', None, False),
    'slurp': ('sfx/35_slurp_cartoon_slurp_a.mp3', None, False),
    'puff': ('sfx/36_dust_puff_air_whoosh_whistle_c.mp3', None, False),
    'twinkle': ('sfx/37_twinkle_sparkling_fairy_a.mp3', 1.8, False),
    'scurry': ('sfx/38_scurry_cartoony_whoosh_c.mp3', 1.1, False),
    'hop': ('sfx/40_spring_boing_hit_b.mp3', None, False),
    # ---- The sound pass (Job S, Jay's picks of Oct 6). 'art/<key>.wav' is a synthesized pick, made
    # by tools/sound-picks.py --export into tools/sfx-art/; the rest are alternates from the pack.
    # All of these are LEVELLED (see LEVELLED below), so none jumps out.
    # CLEARWATER (the Big Pad's sightings): Jay's five new sounds, his picks of Oct 7 21:11 (BIG_PAD_BRIEF.md): the B take
    # of whoosh, boing and crack, the A take of triangle and splash
    # (`~/Desktop/RHR Art Inbox/Sound files/clearwater/<name>_<A|B>.wav`, copied to tools/sfx-art/<name>.wav).
    'whoosh': ('art/whoosh.wav', None, False),      # Three Swings: the shovel's two clean misses
    'boing': ('art/boing.wav', None, False),        # Three Swings: the shovel bites the dirt
    'crack': ('art/crack.wav', None, False),        # Out Cold: the one mighty swing connects
    'splash': ('art/splash.wav', None, False),      # Fresh Wash: the hauler through the puddle
    'triangle': ('art/triangle.wav', None, False),  # Dinner Bell: DING DING DING (three strikes, 0.3 s apart, and their ring)
    'knock': ('art/knock.wav', None, False),        # sign rattle: replaces the old "dingle" everywhere
    'tada': ('art/tada.wav', None, False),          # level complete: replaces the toy whistle
    'clack': ('art/clack.wav', None, False),        # gate exit: replaces the ratchet-and-ding and its whoosh
    'squelch': ('sfx/35_slurp_oga_slime_01_c.mp3', 1.2, False),
    'shluck': ('sfx/34_tongue_cartoon_slurp_b.mp3', 1.0, False),
    'blup': ('sfx/35_slurp_oga_burble_01_b.mp3', 1.0, False),
    'mew': ('art/mew.wav', None, False),
    'yawn': ('art/yawn.wav', None, False),
    'pats': ('art/pats.wav', None, False),
    'bonk': ('art/bonk.wav', None, False),
    'tailslap': ('sfx/32_slap_cartoon_slap_2_b.mp3', 0.6, False),
    'shimmer': ('art/shimmer.wav', None, False),
    'howl': ('art/howl.wav', None, False),
    'rustle': ('art/rustle.wav', None, False),
    'whistle': ('art/whistle.wav', None, False),
    'squeak': ('art/squeak.wav', None, False),
    'aww': ('art/aww.wav', None, False),
    'rumble': ('art/rumble.wav', None, False),
    'sigh': ('art/sigh.wav', None, False),
    'rain': ('art/rain.wav', None, False),
    'umbrella': ('sfx/10_button_tap_light_bubble_pop_b.mp3', 0.5, False),
    'downpour': ('art/downpour.wav', None, False),
}
ART_SRC = ROOT / 'tools' / 'sfx-art'
# FINISHED FILES (Manus's pack for Baldonnel's sightings and the finale, Oct 10; Jay's picks of the takes): cut, faded
# and levelled already (mean about -19 dB, peak never past -1.5 dB), so they are COPIED AS THEY ARE, byte for byte:
# never re-cut, never re-levelled, never re-encoded. Only measured, for pack.json. Sources: the picked take's own MP3,
# `~/Desktop/RHR Art Inbox/Sound files/baldonnel_finale/<name>_<A|B>.mp3`, copied to tools/sfx-art/<name>.mp3.
# key: (take, loop, title, author, source page). All Pixabay Content License (no attribution needed).
FINISHED = {
    'crane_call': ('B', False, 'Sand Hill Cranes', 'EELLC (Freesound)', 'https://pixabay.com/sound-effects/nature-sand-hill-cranes-61016/'),
    'frog_chorus': ('A', False, 'Frog Croaking Sound Effect', 'DRAGON-STUDIO', 'https://pixabay.com/sound-effects/nature-frog-croaking-sound-effect-322956/'),
    'frog_late': ('B', False, 'Green Frog Single Croak Loud', 'ejah_music', 'https://pixabay.com/sound-effects/nature-green-frog-single-croak-loud-426273/'),
    'bison_snort': ('A', False, 'Animals Buffalo Sound', 'CoffeeBagAudioLab', 'https://pixabay.com/sound-effects/nature-animals-buffalo-sound-232390/'),
    'chuckle': ('B', False, 'Mischievous Laugh', 'Universfield', 'https://pixabay.com/sound-effects/horror-mischievous-laugh-140131/'),
    'timer_beep': ('A', False, 'beep', 'athenspublic (Freesound)', 'https://pixabay.com/sound-effects/technology-beep-104060/'),
    'scrub': ('B', True, 'Brushing Teeth Noise', 'Alex_Jauk', 'https://pixabay.com/sound-effects/film-special-effects-brushing-teeth-noise-447647/'),  # the only loop
    'creak': ('A', False, 'plastic squeak', 'Reitanna (Freesound)', 'https://pixabay.com/sound-effects/film-special-effects-plastic-squeak-103382/'),
    'polaroid': ('A', False, 'polaroid_600', 'tomschuetz (Freesound)', 'https://pixabay.com/sound-effects/technology-polaroid-600-83252/'),
}
# THE SOUND PASS'S FILES ARE LEVELLED as they are built: each is brought to the same average level
# (LEVEL_MEAN, the mix's own target in src/audio/pack.ts), but never so far that its peak passes
# LEVEL_PEAK. The mix table then only has to give each its place.
LEVELLED = {'whoosh', 'boing', 'crack', 'splash', 'triangle', 'knock', 'tada', 'clack', 'click', 'squelch', 'shluck', 'blup', 'mew', 'yawn', 'pats', 'bonk', 'tailslap', 'shimmer', 'howl', 'rustle', 'whistle', 'squeak',
            'aww', 'rumble', 'sigh', 'rain', 'umbrella', 'downpour'}
LEVEL_MEAN = -19.0
LEVEL_PEAK = -1.5
# style_scene: (source dir, file stem, the delivered gapless Ogg (or None), bake a 2 s crossfade)
MUSIC = {
    'country_menu': (SFX_SRC / 'music', 'A_menu_fun_on_the_farm_b', None, True),
    'country_play': (SFX_SRC / 'music', 'B_inplay_tap_room_rag_c', None, True),
    'retro_menu': (MUSIC_SRC / 'retro', 'retro_menu_50_over_the_speed_limit_b', MUSIC_SRC / 'ogg_gapless/retro', False),
    'retro_play': (MUSIC_SRC / 'retro', 'retro_inplay_bitstream_dreams_c', None, True),
    'chill_menu': (MUSIC_SRC / 'chill', 'chill_menu_chill_beat_b', None, True),
    'chill_play': (MUSIC_SRC / 'chill', 'chill_inplay_chillhop_mix_a', MUSIC_SRC / 'ogg_gapless/chill', False),
}
XFADE = 2.0
FADE_OUT = 0.04


def run(*args: str) -> str:
    r = subprocess.run(['ffmpeg', '-hide_banner', '-y', *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    return r.stderr


def measure(path: Path) -> dict:
    err = run('-i', str(path), '-af', 'volumedetect', '-f', 'null', '-')
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err)
    return {
        'seconds': round(int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)), 3),
        'mean': float(re.search(r'mean_volume: ([-\d.]+)', err).group(1)),
        'peak': float(re.search(r'max_volume: ([-\d.]+)', err).group(1)),
    }


def credits_table(path: Path) -> dict:
    """file -> {title, author, licence, url} from a pack's CREDITS.md table."""
    rows = {}
    for line in path.read_text().splitlines():
        cells = [c.strip().strip('`') for c in line.strip().strip('|').split('|')]
        if len(cells) < 4 or not re.search(r'\.mp3$', cells[0]):
            continue
        if cells[2].startswith('http') or 'Licen' in cells[3] or 'CC' in cells[3]:
            # music pack: file, title, author, licence, url
            title, author, licence, url = cells[1], cells[2], cells[3], cells[4]
        else:
            # sfx pack: file, author, licence, url, ...
            title, author, licence, url = '', cells[1], cells[2], cells[3]
        rows[cells[0]] = {'title': title, 'author': author, 'licence': licence, 'url': url}
    return rows


# THE FINALE'S CREDITS MUSIC (job U9b): graduation music under the credits, Elgar's "Pomp and Circumstance" March
# No. 1. Manus is sourcing it into `~/Desktop/RHR Art Inbox/Sound files/finale_music/`. WHEN IT ARRIVES: name Jay's
# pick here (`file`, in that folder), the part to play (`start`, `seconds`: the credits last 13 s and a tap skips
# them; the game fades it out as they lift) and its Credits row, then run `python3 tools/audio-pack.py
# --finale-music`. It writes public/audio/music/finale_credits.{opus,mp3} and its rows; the game plays it under the
# credits from then on (src/audio/pack.ts `finaleTrack`). Until then `file` is None and the menu loop plays there.
FINALE_MUSIC_SRC = Path.home() / 'Desktop' / 'RHR Art Inbox' / 'Sound files' / 'finale_music'
FINALE_MUSIC = {'file': None, 'start': 0.0, 'seconds': None, 'title': 'Pomp and Circumstance March No. 1', 'author': '', 'licence': '', 'url': ''}


def finale_music() -> None:
    """`--finale-music`: builds the one track, touching nothing else in the pack."""
    m = FINALE_MUSIC
    if not m['file']:
        found = sorted(f.name for f in FINALE_MUSIC_SRC.iterdir()) if FINALE_MUSIC_SRC.exists() else []
        sys.exit(f'no finale music picked yet: name the file in FINALE_MUSIC (in {FINALE_MUSIC_SRC}: {", ".join(found) or "nothing there"})')
    src = FINALE_MUSIC_SRC / m['file']
    if not src.exists():
        sys.exit(f'missing {src}')
    if not (m['author'] and m['licence']):
        sys.exit('FINALE_MUSIC needs its author and licence (the Credits screen lists every file)')
    out, tmp = ROOT / 'public' / 'audio' / 'music', ROOT / 'public' / 'audio' / '_tmp.wav'
    cut = ['-ss', str(m['start'])] + (['-t', str(m['seconds'])] if m['seconds'] else [])
    # (A short fade at each end of the cut, so it neither starts nor loops on a click.)
    run(*cut, '-i', str(src), '-af', 'afade=t=in:d=0.05', '-ar', '44100', '-ac', '2', str(tmp))
    seconds = measure(tmp)['seconds']
    run('-i', str(tmp), '-af', f'afade=t=out:st={max(0, seconds - 0.4):.3f}:d=0.4', '-c:a', 'libopus', '-b:a', '112k', str(out / 'finale_credits.opus'))
    run('-i', str(tmp), '-af', f'afade=t=out:st={max(0, seconds - 0.4):.3f}:d=0.4', '-c:a', 'libmp3lame', '-b:a', '128k', str(out / 'finale_credits.mp3'))
    tmp.unlink(missing_ok=True)
    pack_path, credits_path = ROOT / 'src/audio/pack.json', ROOT / 'src/audio/credits.json'
    pack, credits = json.loads(pack_path.read_text()), json.loads(credits_path.read_text())
    pack['music']['finale_credits'] = {'seconds': round(seconds, 3), 'mean': measure(out / 'finale_credits.mp3')['mean'],
                                       'formats': [{'file': 'finale_credits.opus', 'type': 'audio/ogg; codecs=opus'}, {'file': 'finale_credits.mp3', 'type': 'audio/mpeg'}], 'crossfaded': False}
    credits = [c for c in credits if c['use'] != 'finale_credits']
    credits.append({'use': 'finale_credits', 'kind': 'music', 'file': f'finale_music/{m["file"]}', 'title': m['title'], 'author': m['author'], 'licence': m['licence'], 'url': m['url']})
    pack_path.write_text(json.dumps(pack, indent=1) + '\n')
    credits_path.write_text(json.dumps(credits, indent=1) + '\n')
    print(f'finale_credits: {seconds:.1f} s from {src.name}')


def finished(pack: dict, credits: list) -> None:
    """The finished files: copied as they are, measured, and given their rows."""
    for key, (take, loop, title, author, url) in FINISHED.items():
        source = ART_SRC / f'{key}.mp3'
        if not source.exists():
            sys.exit(f'missing {source}')
        out = OUT / 'sfx' / f'{key}.mp3'
        shutil.copyfile(source, out)
        m = measure(out)
        pack['sfx'][key] = {'seconds': m['seconds'], 'mean': m['mean'], 'peak': m['peak'], 'loop': loop}
        credits[:] = [c for c in credits if c['use'] != key]
        credits.append({'use': key, 'kind': 'sfx', 'file': f'baldonnel_finale/{key}_{take}.mp3', 'title': title, 'author': author, 'licence': 'Pixabay Content License', 'url': url})


def only_finished() -> None:
    """`--finished`: adds (or refreshes) ONLY the finished files, touching nothing else in the pack. It needs no
    Desktop sources and no rebuild of the music (a full run re-encodes the Opus loops it builds itself; it keeps
    Classic Rock and these files too)."""
    pack_path, credits_path = ROOT / 'src/audio/pack.json', ROOT / 'src/audio/credits.json'
    pack, credits = json.loads(pack_path.read_text()), json.loads(credits_path.read_text())
    finished(pack, credits)
    # (Effects' rows stay together, before the music's.)
    credits.sort(key=lambda c: c['kind'] != 'sfx')
    pack_path.write_text(json.dumps(pack, indent=1) + '\n')
    credits_path.write_text(json.dumps(credits, indent=1) + '\n')
    print(f'{len(FINISHED)} finished effects copied; {len(pack["sfx"])} effects in the pack')


def main() -> None:
    for d in (SFX_SRC, MUSIC_SRC):
        if not d.exists():
            sys.exit(f'missing {d}')
    # MUSIC THIS SCRIPT DOES NOT BUILD IS KEPT (Classic Rock: tools/music-classic.py makes its five loops, and any
    # other loop a later script adds): its files are set aside before the folder is cleared and put back after, and
    # its rows in pack.json and credits.json are carried over as they are.
    kept_music, kept_credits, aside = {}, [], None
    if OUT == ROOT / 'public' / 'audio' and (ROOT / 'src/audio/pack.json').exists():
        old_pack = json.loads((ROOT / 'src/audio/pack.json').read_text())
        kept_music = {k: v for k, v in old_pack.get('music', {}).items() if k not in MUSIC}
        kept_credits = [c for c in json.loads((ROOT / 'src/audio/credits.json').read_text()) if c['use'] in kept_music]
        aside = Path(tempfile.mkdtemp(prefix='rig-jam-music-'))
        for v in kept_music.values():
            for f in v['formats']:
                if not (OUT / 'music' / f['file']).exists():
                    sys.exit(f'missing {OUT / "music" / f["file"]} (named in pack.json): restore it before a full run')
                shutil.copy2(OUT / 'music' / f['file'], aside / f['file'])
    shutil.rmtree(OUT, ignore_errors=True)
    (OUT / 'sfx').mkdir(parents=True)
    (OUT / 'music').mkdir(parents=True)
    if aside:
        for f in aside.iterdir():
            shutil.copy2(f, OUT / 'music' / f.name)
        shutil.rmtree(aside)
    pack = {'sfx': {}, 'music': {}}
    sfx_credits = credits_table(SFX_SRC / 'CREDITS.md')
    music_credits = credits_table(MUSIC_SRC / 'CREDITS.md')
    credits = []
    tmp = OUT / '_tmp.wav'

    for key, (src, keep, loop) in SFX.items():
        source = ART_SRC / src[4:] if src.startswith('art/') else SFX_SRC / src
        if not source.exists():
            sys.exit(f'missing {source}')
        # Leading silence off (so a sound starts when it is asked for), then the part the game uses.
        chain = ['silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.005']
        if keep:
            chain.append(f'atrim=0:{keep}')
        run('-i', str(source), '-af', ','.join(chain), '-ac', '1', '-ar', '44100', str(tmp))
        if key in LEVELLED:
            # (Measured as it will sound, with its end faded; then one clean gain.)
            lvl = OUT / '_lvl.wav'
            was = measure(tmp)
            fade = 0.12 if keep else FADE_OUT
            run('-i', str(tmp), '-af', f'afade=t=out:st={max(0, was["seconds"] - fade):.3f}:d={fade}', str(lvl))
            was = measure(lvl)
            # (A very short crack keeps another dB of room: MP3 coding lifts so sharp a peak a little.)
            gain = min(LEVEL_MEAN - was['mean'], LEVEL_PEAK - (1.0 if was['seconds'] < 0.3 else 0.0) - was['peak'])
            run('-i', str(tmp), '-af', f'volume={gain:.2f}dB', '-ac', '1', '-ar', '44100', str(lvl))
            lvl.replace(tmp)
        seconds = measure(tmp)['seconds']
        out = OUT / 'sfx' / f'{key}.mp3'
        if loop:
            run('-i', str(tmp), '-ac', '1', '-ar', '44100', '-b:a', '128k', str(out))
        else:
            # A short fade so nothing ends on a click; longer where the sound was cut short.
            fade = 0.12 if keep else FADE_OUT
            run('-i', str(tmp), '-af', f'afade=t=in:d=0.003,afade=t=out:st={max(0, seconds - fade):.3f}:d={fade}', '-ac', '1', '-ar', '44100', '-b:a', '128k', str(out))
        m = measure(out)
        pack['sfx'][key] = {'seconds': m['seconds'], 'mean': m['mean'], 'peak': m['peak'], 'loop': loop}
        c = sfx_credits.get(src) or {'title': '', 'author': 'Synthesized for Rig Jam', 'licence': 'Original', 'url': ''}
        credits.append({'use': key, 'kind': 'sfx', 'file': src, **c})

    finished(pack, credits)

    for key, (folder, stem, ogg_dir, bake) in MUSIC.items():
        source = folder / f'{stem}.mp3'
        if not source.exists():
            sys.exit(f'missing {source}')
        formats = []
        if bake:
            # The loop re-cut: its last XFADE seconds fade out over its first XFADE seconds fading
            # in, and that blend becomes the END of the loop, which then runs straight on into what
            # followed the head. Seamless at any loop point, 2 s shorter.
            total = measure(source)['seconds']
            body_end = total - XFADE
            graph = (
                f'[0:a]atrim={XFADE}:{body_end},asetpts=PTS-STARTPTS[body];'
                f'[0:a]atrim={body_end}:{total},asetpts=PTS-STARTPTS,afade=t=out:d={XFADE}:curve=qsin[tail];'
                f'[0:a]atrim=0:{XFADE},asetpts=PTS-STARTPTS,afade=t=in:d={XFADE}:curve=qsin[head];'
                f'[tail][head]amix=inputs=2:normalize=0[seam];[body][seam]concat=n=2:v=0:a=1[out]'
            )
            run('-i', str(source), '-filter_complex', graph, '-map', '[out]', '-ar', '44100', '-ac', '2', str(tmp))
            run('-i', str(tmp), '-c:a', 'libopus', '-b:a', '112k', str(OUT / 'music' / f'{key}.opus'))
            run('-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '128k', str(OUT / 'music' / f'{key}.mp3'))
            formats = [{'file': f'{key}.opus', 'type': 'audio/ogg; codecs=opus'}, {'file': f'{key}.mp3', 'type': 'audio/mpeg'}]
            seconds = measure(tmp)['seconds']
        else:
            shutil.copy(ogg_dir / f'{stem}.ogg', OUT / 'music' / f'{key}.ogg')
            run('-i', str(source), '-c:a', 'libmp3lame', '-b:a', '128k', str(OUT / 'music' / f'{key}.mp3'))
            formats = [{'file': f'{key}.ogg', 'type': 'audio/ogg; codecs=vorbis'}, {'file': f'{key}.mp3', 'type': 'audio/mpeg'}]
            seconds = measure(source)['seconds']
        m = measure(OUT / 'music' / f'{key}.mp3')
        pack['music'][key] = {'seconds': round(seconds, 3), 'mean': m['mean'], 'formats': formats, 'crossfaded': bake}
        rel = f'{folder.name}/{stem}.mp3'
        c = (music_credits if folder.parent == MUSIC_SRC else sfx_credits).get(rel) or {}
        if not c.get('title'):
            c = {**c, 'title': ' '.join(w.capitalize() for w in re.sub(r'^(A_menu|B_inplay)_|_[abc]$', '', stem).split('_'))}
        credits.append({'use': key, 'kind': 'music', 'file': rel, **c})

    pack['music'].update(kept_music)
    credits.extend(kept_credits)
    tmp.unlink(missing_ok=True)
    if OUT == ROOT / 'public' / 'audio':
        (ROOT / 'src/audio/pack.json').write_text(json.dumps(pack, indent=1) + '\n')
        (ROOT / 'src/audio/credits.json').write_text(json.dumps(credits, indent=1) + '\n')
    else:
        (OUT / 'pack.json').write_text(json.dumps(pack, indent=1) + '\n')
        (OUT / 'credits.json').write_text(json.dumps(credits, indent=1) + '\n')
    size = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    print(f'{len(pack["sfx"])} effects, {len(pack["music"])} music loops, {size / 1e6:.1f} MB in {OUT}')


if __name__ == '__main__':
    if '--finale-music' in sys.argv:
        finale_music()
    elif '--finished' in sys.argv:
        OUT = ROOT / 'public' / 'audio'
        only_finished()
    else:
        main()
