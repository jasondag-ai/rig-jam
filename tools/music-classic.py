#!/usr/bin/env python3
"""The Classic Rock music style (October upgrade, job U7): five loops from Manus's pack.

  python3 tools/music-classic.py ["~/Desktop/RHR Art Inbox/Sound files/classic_rock"]

The loops arrive FINISHED: each file is one loop, seamless (a 50 ms crossfade baked in at the wrap), at -16 LUFS. So
this does NOT re-cut or re-level them, and tools/audio-pack.py is not run over them. But they arrive two to three
times the size of the game's other music (Ogg Vorbis about 190 kb/s, MP3 320), so each is ENCODED AGAIN the way
audio-pack.py encodes a loop it has cut: decoded once to 44.1 kHz stereo, then Ogg Opus at 112 kb/s (gapless, played
first) and MP3 at 128 kb/s (the fallback). `seconds` is measured from that decoded loop and `mean` from the MP3 that
ships, as audio-pack.py does, and written into src/audio/pack.json with the Credits rows (src/audio/credits.json).
masters/ (the uncut full-length songs) is never shipped.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / 'Desktop' / 'RHR Art Inbox' / 'Sound files' / 'classic_rock'
OUT = ROOT / 'public' / 'audio' / 'music'
KEYS = ['classic_menu', 'classic_play1', 'classic_play2', 'classic_play3', 'classic_play4']


def run(*args: str) -> str:
    r = subprocess.run(['ffmpeg', '-hide_banner', '-y', *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    return r.stderr


def measure(path: Path) -> dict:
    err = run('-i', str(path), '-af', 'volumedetect', '-f', 'null', '-')
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err)
    return {'seconds': round(int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)), 3), 'mean': float(re.search(r'mean_volume: ([-\d.]+)', err).group(1)), 'peak': float(re.search(r'max_volume: ([-\d.]+)', err).group(1))}


pack_path, credits_path = ROOT / 'src' / 'audio' / 'pack.json', ROOT / 'src' / 'audio' / 'credits.json'
pack, credits = json.loads(pack_path.read_text()), json.loads(credits_path.read_text())
rows = {r['use']: r for r in json.loads((SRC / 'credits_music_rows.json').read_text())}
with tempfile.TemporaryDirectory() as tmpdir:
    for key in KEYS:
        source = SRC / 'public_audio_music' / f'{key}.ogg'
        if not source.exists():
            sys.exit(f'missing {source}')
        tmp = Path(tmpdir) / f'{key}.wav'
        # (Decoded as it is: no filter, no trim, no gain.)
        run('-i', str(source), '-ar', '44100', '-ac', '2', str(tmp))
        run('-i', str(tmp), '-c:a', 'libopus', '-b:a', '112k', str(OUT / f'{key}.opus'))
        run('-i', str(tmp), '-c:a', 'libmp3lame', '-b:a', '128k', str(OUT / f'{key}.mp3'))
        loop, mp3 = measure(tmp), measure(OUT / f'{key}.mp3')
        pack['music'][key] = {'seconds': loop['seconds'], 'mean': mp3['mean'], 'formats': [{'file': f'{key}.opus', 'type': 'audio/ogg; codecs=opus'}, {'file': f'{key}.mp3', 'type': 'audio/mpeg'}], 'crossfaded': True}
        row = {**rows[key], 'file': f'music/{key}.opus'}
        credits[:] = [c for c in credits if c.get('use') != key] + [row]
        sizes = ', '.join(f'{(OUT / f"{key}.{ext}").stat().st_size // 1024} KB {ext}' for ext in ('opus', 'mp3'))
        print(f'{key}: {loop["seconds"]} s, mean {mp3["mean"]} dB (source {measure(source)["mean"]} dB), {sizes}; was {source.stat().st_size // 1024} KB ogg, {(SRC / "public_audio_music" / f"{key}.mp3").stat().st_size // 1024} KB mp3')
pack_path.write_text(json.dumps(pack, indent=1) + '\n')
credits_path.write_text(json.dumps(credits, indent=1) + '\n')
