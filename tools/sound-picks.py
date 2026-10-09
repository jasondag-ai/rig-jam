"""The sound picks board (Job S, step 1): one self-contained page where Jay auditions three options
(A, B, C) for each new or replacement cue on his phone and picks by ear.

Each option is either an alternate from his cartoon sound pack (`rhr_cartoon_sounds`, trimmed and
faded like the game's own picks) or a clean synthesized sound made here (numpy: sines, struck
modes, filtered noise; everything low-passed, with a natural decaying tail). Every option's
loudness is measured the way `tools/audio-pack.py` measures the game's sounds (mean and peak dB),
so the mix can be matched once the picks are in.

The page embeds its audio (no other files), so the same file works from the Desktop and deployed.

Run: python3 tools/sound-picks.py      (needs ffmpeg and numpy)
Writes: ~/Desktop/RHR Art Inbox/sound_picks.html (the board is NOT on the live site any more).

STEP 2 (Jay picked, Oct 6): `python3 tools/sound-picks.py --export` writes the synthesized picks
(`PICKED`) as WAV sources into tools/sfx-art/, which tools/audio-pack.py builds into the game's
sounds. (His pack picks are named in audio-pack.py's own table, like every other pack sound.)
"""
import base64
import html
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DESK = Path.home() / 'Desktop'
PACK = DESK / 'RHR Art Inbox' / 'Sound files' / 'rhr_cartoon_sounds'
if not PACK.exists():
    PACK = DESK / 'rhr_cartoon_sounds'
OUT = [Path(p) for p in sys.argv[1:] if not p.startswith('--')] or [DESK / 'RHR Art Inbox' / 'sound_picks.html']
ART = ROOT / 'tools' / 'sfx-art'
SR = 44100
TMP = Path(tempfile.mkdtemp(prefix='rhr-picks-'))


# ---------- building blocks ----------

def ts(d):
    return np.arange(int(d * SR)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def shape(x, f_lo=None, f_hi=None, order=4):
    """A smooth band (or low or high) pass, done in the frequency domain: no ringing, no harsh edge."""
    n = len(x)
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    if f_hi:
        m *= 1 / (1 + (f / f_hi) ** order)
    if f_lo:
        m *= 1 - 1 / (1 + (f / f_lo) ** order)
    return np.fft.irfft(spec * m, n)


def noise(d, lo=None, hi=None, seed=1, order=4):
    return shape(rng(seed).standard_normal(int(d * SR)), lo, hi, order)


def sweep_noise(d, f0, f1, width=0.5, seed=1, steps=24):
    """Noise whose band glides from f0 to f1 (a swish, a whistle): short overlapping bands, crossfaded."""
    n = int(d * SR)
    out = np.zeros(n)
    raw = rng(seed).standard_normal(n)
    win = np.hanning(2 * n // steps + 2)
    hop = n // steps
    for i in range(steps):
        fc = f0 * (f1 / f0) ** (i / max(1, steps - 1))
        band = shape(raw, fc * (1 - width / 2), fc * (1 + width / 2), 6)
        a = i * hop
        seg = band[a:a + len(win)]
        out[a:a + len(seg)] += seg * win[:len(seg)]
    return out


def tone(freq, harmonics=(1.0,), phase=0.0):
    """A tone that follows `freq` (an array, Hz) with the given strengths of its harmonics."""
    ph = 2 * np.pi * np.cumsum(freq) / SR + phase
    out = np.zeros(len(freq))
    for k, a in enumerate(harmonics, 1):
        if a:
            out += a * np.sin(k * ph) * (freq * k < 9000)
    return out


def glide(d, points):
    """A curve through (time share, value) points, smoothly."""
    n = int(d * SR)
    x = np.linspace(0, 1, n)
    xs, ys = zip(*points)
    y = np.interp(x, xs, ys)
    k = max(3, n // 40) | 1
    return np.convolve(np.pad(y, k // 2, mode='edge'), np.hanning(k) / np.hanning(k).sum(), mode='valid')[:n]


def env(d, attack=0.004, decay=None, hold=0.0, release=None):
    """Up fast, hold, then down: an exponential `decay` (seconds to fall to about a third) or a plain `release`."""
    n = int(d * SR)
    t = ts(d)[:n]
    e = np.minimum(1, t / max(attack, 1e-4))
    if decay:
        e *= np.exp(-np.maximum(0, t - attack - hold) / decay)
    if release:
        e *= np.clip((d - t) / release, 0, 1) ** 1.5
    return e


def struck(d, modes):
    """Something struck: modes of (Hz, strength, seconds of ring)."""
    t = ts(d)
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / r) for f, a, r in modes)


def mix(d, *parts):
    """Lay parts into `d` seconds: each (samples, start seconds, gain)."""
    out = np.zeros(int(d * SR))
    for x, at, g in parts:
        a = int(at * SR)
        x = x[:max(0, len(out) - a)]
        out[a:a + len(x)] += x * g
    return out


def finish(x, peak_db=-6.0, top=8500, tail=0.04):
    """Studio clean: no harsh highs, no rumble below 40 Hz, no click at either end, peak at `peak_db`."""
    x = shape(x, 40, top, 4)
    n = len(x)
    f_in, f_out = int(0.003 * SR), int(tail * SR)
    x[:f_in] *= np.linspace(0, 1, f_in)
    x[n - f_out:] *= np.linspace(1, 0, f_out) ** 2
    return x / max(1e-9, np.abs(x).max()) * 10 ** (peak_db / 20)


def pitched(x, semis):
    """Play it faster or slower (higher or lower), like a tape."""
    r = 2 ** (semis / 12)
    idx = np.arange(0, len(x) - 1, r)
    return np.interp(idx, np.arange(len(x)), x)


# ---------- files ----------

def ffmpeg(*args):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-y', *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-1500:])
    return r.stderr


def load(rel, keep=None, start=0.0):
    """A pack file as samples: leading silence trimmed, cut to `keep` seconds, its end faded."""
    path = PACK / rel
    if not path.exists():
        sys.exit(f'missing pack file: {path}')
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'silenceremove=start_periods=1:start_threshold=-50dB', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)[int(start * SR):]
    if keep and len(x) > keep * SR:
        x = x[:int(keep * SR)].copy()
        f = int(0.12 * SR)
        x[-f:] *= np.linspace(1, 0, f) ** 2
    return x.copy()


def encode(x, name):
    """Samples to a small mono MP3; returns (path, measurements)."""
    wav = TMP / f'{name}.wav'
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    mp3 = TMP / f'{name}.mp3'
    ffmpeg('-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', str(mp3))
    return mp3, measure(mp3)


def measure(path):
    err = ffmpeg('-i', str(path), '-af', 'volumedetect', '-f', 'null', '-')
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err)
    return {
        'seconds': round(int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)), 2),
        'mean': float(re.search(r'mean_volume: ([-\d.]+)', err).group(1)),
        'peak': float(re.search(r'max_volume: ([-\d.]+)', err).group(1)),
    }


# ---------- the synthesized sounds ----------

def knock(f=420, ring=0.07, seed=1):
    """One soft knock on a wooden board."""
    d = 0.3
    body = struck(d, [(f, 1, ring), (f * 2.32, 0.45, ring * 0.6), (f * 4.1, 0.2, ring * 0.35)])
    return body + noise(d, 300, 2500, seed) * env(d, 0.001, 0.008) * 0.5


def sign_rattle_a():
    # knock, then the board wobbles to rest: knocks closer together and quieter
    at, parts, gap, g = 0.0, [], 0.13, 1.0
    for i in range(7):
        parts.append((knock(410 + 14 * (i % 2), 0.06, i), at, g))
        at += gap
        gap *= 0.78
        g *= 0.66
    return finish(mix(0.95, *parts))


def sign_rattle_b():
    # a hollow "tok", then a low wooden wobble that dies away
    d = 0.9
    t = ts(d)
    wob = tone(np.full(len(t), 190.0), (1, 0.3, 0.1)) * (0.5 + 0.5 * np.sin(2 * np.pi * (11 + 9 * t) * t)) * np.exp(-t / 0.2)
    return finish(mix(d, (knock(300, 0.09, 3), 0, 1), (wob, 0.05, 0.55), (knock(330, 0.05, 4), 0.2, 0.35)))


def tada_brass():
    # two warm brass notes, short then held: "ta-DA"
    def note(f, d, vib=0.0):
        t = ts(d)
        fr = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25))
        x = sum(tone(fr * r, (1, 0.6, 0.42, 0.3, 0.2, 0.12, 0.07)) * g for r, g in ((1, 1), (1.26, 0.6), (1.498, 0.55)))
        bright = shape(x, None, 1400, 2) + 0.35 * shape(x, None, 3200, 2) * env(d, 0.02, 0.18)
        return bright * env(d, 0.018, None, 0, min(0.35, d * 0.6))
    return finish(mix(1.35, (note(392, 0.2), 0, 0.8), (note(523.25, 1.1, 0.006), 0.2, 1)), top=6000, tail=0.1)


def tada_xylo():
    # a quick rising xylophone run to a bright, warm top note
    def bar(f, ring):
        return struck(0.9, [(f, 1, ring), (f * 4.0, 0.22, ring * 0.25), (f * 9.2, 0.05, ring * 0.1)]) + noise(0.9, 800, 3000, int(f)) * env(0.9, 0.001, 0.004) * 0.15
    notes = [(523.25, 0.0, 0.16), (659.25, 0.09, 0.16), (783.99, 0.18, 0.18), (1046.5, 0.3, 0.5)]
    parts = [(bar(f, r), at, 0.8 if f < 1000 else 1) for f, at, r in notes] + [(bar(523.25, 0.5), 0.3, 0.45), (bar(783.99, 0.5), 0.3, 0.4)]
    return finish(mix(1.3, *parts), tail=0.15)


def tada_glock():
    # C: a soft three-note music-box "ta-da-daa", gentlest of the three
    def bell(f, ring):
        return struck(1.2, [(f, 1, ring), (f * 2.76, 0.3, ring * 0.45), (f * 5.4, 0.1, ring * 0.2)])
    return finish(mix(1.4, (bell(659.25, 0.2), 0, 0.7), (bell(783.99, 0.22), 0.14, 0.8), (bell(1046.5, 0.45), 0.3, 1), (bell(523.25, 0.45), 0.3, 0.5)), tail=0.2)


def exit_swish():
    d = 0.42
    return finish(sweep_noise(d, 500, 2600, 0.9, 5) * env(d, 0.12, None, 0, 0.26) * np.sin(np.pi * ts(d) / d) ** 1.2, peak_db=-9, top=5000)


def exit_clack():
    return finish(mix(0.3, (knock(620, 0.035, 8), 0, 1), (knock(520, 0.03, 9), 0.065, 0.5)), peak_db=-8)


def ui_click():
    """Every button's tap: one soft wooden toy click, 60 ms from start to silence (Jay: under 80 ms)."""
    x = knock(680, 0.014, 11)[:int(0.06 * SR)]
    return finish(x, peak_db=-8, top=5200, tail=0.03)


def exit_chime():
    d = 0.9
    return finish(struck(d, [(1318.5, 1, 0.28), (1975.5, 0.4, 0.2), (2637, 0.12, 0.1)]) * env(d, 0.006), peak_db=-10, tail=0.2)


def squelch(seed=1, low=180):
    # a boot pressed into wet peat: a soft low thud and a wet, closing "squ"
    d = 0.34
    wet = sweep_noise(d, 1500, 420, 0.8, seed) * env(d, 0.02, 0.09)
    thud = tone(glide(d, [(0, low), (1, low * 0.55)])) * env(d, 0.004, 0.05)
    bub = tone(glide(0.08, [(0, 380), (1, 620)])) * env(0.08, 0.005, 0.03)
    return mix(d, (wet, 0, 0.7), (thud, 0, 1), (bub, 0.12, 0.35), (bub, 0.19, 0.2))


def muskeg_steps():
    return finish(mix(1.25, (squelch(1), 0, 1), (squelch(2, 165), 0.42, 0.9), (squelch(3, 190), 0.84, 1)), top=5000)


def shluck():
    # suction building, then the boot comes free with a round pop
    d = 0.55
    suck = sweep_noise(0.34, 300, 1500, 0.7, 11) * np.linspace(0.15, 1, int(0.34 * SR)) ** 2
    pop = tone(glide(0.16, [(0, 900), (0.25, 420), (1, 170)]), (1, 0.25)) * env(0.16, 0.002, 0.045)
    return finish(mix(d, (suck, 0, 0.55), (pop, 0.33, 1), (noise(0.05, 500, 3000, 12) * env(0.05, 0.001, 0.01), 0.33, 0.4)), top=5500)


def blup(f0=280, f1=720, d=0.11):
    return tone(glide(d, [(0, f0), (1, f1)]), (1, 0.12)) * env(d, 0.012, None, 0, d * 0.55)


def muskeg_blup_a():
    return finish(mix(0.3, (blup(), 0.02, 1)), peak_db=-8, top=4000)


def muskeg_blup_b():
    return finish(mix(0.55, (blup(200, 480, 0.14), 0.0, 1), (blup(260, 640, 0.1), 0.2, 0.7), (blup(330, 800, 0.07), 0.34, 0.4)), peak_db=-8, top=4000)


def mew(f=780, d=0.34, seed=1):
    # a kitten's "mew": the pitch rises, falls away; the mouth opens then closes (the bright band moves)
    fr = glide(d, [(0, f * 0.82), (0.25, f * 1.12), (0.6, f), (1, f * 0.7)])
    src = tone(fr, (1, 0.7, 0.55, 0.4, 0.3, 0.2, 0.12, 0.08))
    n = len(src)
    a, b = shape(src, 700, 1500, 4), shape(src, 1600, 3200, 4)
    open_ = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
    return (a * (1 - 0.5 * open_) + b * open_ * 1.2 + noise(d, 2000, 5000, seed)[:n] * 0.03) * env(d, 0.035, None, 0, d * 0.5)


def cat_mews_a():
    return finish(mix(0.5, (mew(), 0.02, 1)), peak_db=-8, top=6000)


def cat_mews_b():
    return finish(mix(0.95, (mew(900, 0.22, 2), 0.0, 0.8), (mew(1010, 0.2, 3), 0.3, 0.9), (mew(860, 0.26, 4), 0.6, 1)), peak_db=-8, top=6000)


def yawn(f=520, d=1.1, breath=0.25, seed=1):
    fr = glide(d, [(0, f * 0.7), (0.3, f * 1.25), (0.5, f * 1.2), (1, f * 0.55)])
    src = tone(fr, (1, 0.6, 0.4, 0.25, 0.15, 0.1))
    n = len(src)
    wide = np.sin(np.pi * np.linspace(0, 1, n) ** 0.8)
    voiced = shape(src, 500, 1300, 4) * (1 - 0.4 * wide) + shape(src, 1300, 2800, 4) * wide
    air = sweep_noise(d, 900, 2400, 1.0, seed)[:n] * wide * breath
    return (voiced + air) * env(d, 0.12, None, 0, d * 0.45)


def cat_yawn_a():
    return finish(yawn(), peak_db=-9, top=6000, tail=0.1)


def cat_yawn_b():
    # shorter and squeakier, with a tiny "mip" as the mouth shuts
    return finish(mix(0.95, (yawn(700, 0.7, 0.2, 2), 0, 1), (mew(1150, 0.1, 5), 0.78, 0.4)), peak_db=-9, top=6000)


def cat_yawn_c():
    # mostly breath: a sleepy sigh of a yawn
    return finish(yawn(430, 1.2, 0.8, 3), peak_db=-10, top=5000, tail=0.15)


def pat(seed=1, f=120):
    d = 0.16
    return tone(glide(d, [(0, f * 1.5), (1, f)])) * env(d, 0.003, 0.03) + noise(d, 600, 2600, seed) * env(d, 0.001, 0.012) * 0.45


def beaver_pats():
    parts = [(pat(i, 118 + 9 * (i % 2)), i * 0.19, 1 if i % 2 == 0 else 0.8) for i in range(5)]
    return finish(mix(1.05, *parts), peak_db=-9, top=4000)


def pipe_bonk():
    # a hollow steel pipe struck on wood: a round "bonk" with a short tube ring
    d = 0.9
    ring = struck(d, [(246, 1, 0.16), (679, 0.55, 0.22), (1331, 0.32, 0.16), (2200, 0.1, 0.07)])
    hollow = shape(noise(d, 150, 900, 21) * env(d, 0.001, 0.02), None, 700) * 1.5
    return finish(ring + hollow, top=5000, tail=0.12)


def tail_slap():
    d = 0.3
    smack = noise(d, 250, 3200, 31) * env(d, 0.0015, 0.028)
    thud = tone(glide(d, [(0, 210), (1, 95)])) * env(d, 0.002, 0.06)
    return finish(smack + thud * 0.8, top=4500)


def shimmer():
    # the lights: a soft glassy chord swelling in and out, each partial breathing at its own pace
    d = 2.6
    t = ts(d)
    x = np.zeros(len(t))
    for i, f in enumerate([523.25, 783.99, 1046.5, 1318.5, 1568, 2093, 2637]):
        x += np.sin(2 * np.pi * f * t + i) * (0.55 + 0.45 * np.sin(2 * np.pi * (0.9 + 0.37 * i) * t + i * 1.7)) / (1 + i * 0.45)
    return finish(x * np.sin(np.pi * t / d) ** 1.4, peak_db=-12, top=5000, tail=0.3)


def howl(base=330, top=560, d=1.9, crack_at=0.72, squeak=1650, wobble=0.0, seed=1):
    # a coyote's howl: slides up, holds with a little vibrato... then his voice cracks into a squeak
    n = int(d * SR)
    x = np.linspace(0, 1, n)
    f = np.interp(x, [0, 0.22, crack_at], [base, top, top * 1.04])
    f *= 1 + 0.012 * np.sin(2 * np.pi * 5.2 * x * d) * np.clip(x / 0.3, 0, 1)
    if wobble:
        f *= 1 + wobble * np.sin(2 * np.pi * 13 * x * d) * np.clip((x - crack_at + 0.15) / 0.15, 0, 1)
    voice = tone(f, (1, 0.75, 0.5, 0.32, 0.2, 0.12, 0.07))
    voice = shape(voice, 400, 1100, 3) * 0.9 + shape(voice, 1100, 2400, 3) * 0.6
    a = (np.clip(x / 0.08, 0, 1) * (x < crack_at)).astype(float)
    k = int(0.006 * SR)
    a = np.convolve(a, np.ones(k) / k, mode='same')
    sq_d = d * (1 - crack_at) * 0.55
    sq = tone(glide(sq_d, [(0, squeak * 0.9), (0.2, squeak * 1.08), (1, squeak * 0.86)]), (1, 0.2)) * env(sq_d, 0.004, None, 0, sq_d * 0.7)
    return mix(d, (voice * a, 0, 1), (sq, d * crack_at + 0.015, 0.55), (noise(d, 800, 2500, seed) * a * 0.03, 0, 1))


def howl_a():
    return finish(howl(), peak_db=-8, top=6500, tail=0.08)


def howl_b():
    # higher and shorter, his voice wobbling before it goes
    return finish(howl(380, 660, 1.5, 0.7, 1900, 0.03, 2), peak_db=-8, top=6500, tail=0.08)


def howl_c():
    # a long proud note, a yodel flip, then two tiny squeaks
    d = 2.2
    main = howl(300, 500, 1.9, 0.78, 1500, 0.0, 3)
    extra = tone(glide(0.09, [(0, 1750), (1, 1500)]), (1, 0.2)) * env(0.09, 0.004, None, 0, 0.06)
    return finish(mix(d, (main, 0, 1), (extra, 1.86, 0.35)), peak_db=-8, top=6500, tail=0.08)


def rustle(d=1.6, seed=1, rate=26.0, thumps=(0.18, 0.62, 1.0, 1.32), thump_gain=0.8):
    # dry stems scraping: grainy bursts of bright (but not sharp) noise, and the weed's light bounces
    n = int(d * SR)
    r = rng(seed)
    grains = np.zeros(n)
    t = 0.0
    while t < d:
        g = r.uniform(0.012, 0.04)
        seg = shape(r.standard_normal(int(g * SR)), r.uniform(900, 1800), r.uniform(3000, 5200), 4) * np.hanning(int(g * SR))
        a = int(t * SR)
        seg = seg[:n - a]
        grains[a:a + len(seg)] += seg * r.uniform(0.3, 1)
        t += r.exponential(1 / rate)
    parts = [(grains, 0, 0.6)]
    for at in thumps:
        if at < d - 0.15:
            parts.append((tone(glide(0.14, [(0, 150), (1, 80)])) * env(0.14, 0.003, 0.035), at, thump_gain))
            parts.append((noise(0.06, 800, 3500, int(at * 100)) * env(0.06, 0.001, 0.015), at, 0.5))
    return mix(d, *parts) * np.interp(np.linspace(0, 1, n), [0, 0.12, 0.8, 1], [0, 1, 1, 0])


def rustle_a():
    return finish(rustle(), peak_db=-9, top=6000)


def rustle_b():
    # lighter and quicker: a small weed skipping along
    return finish(rustle(1.3, 4, 34.0, (0.1, 0.36, 0.6, 0.82, 1.02), 0.5), peak_db=-10, top=6000)


def whistle(d=1.5, pts=((0, 700), (0.4, 1150), (0.7, 950), (1, 620)), width=0.07, seed=1):
    # wind over the prairie: a narrow band of air whose pitch rises and falls
    n = int(d * SR)
    f = glide(d, list(pts))
    air = rng(seed).standard_normal(n)
    # a resonator that follows the pitch: ring-modulate a tone with slow noise (a breathy whistle)
    slow = shape(air, None, 40, 2)
    slow /= np.abs(slow).max()
    tone_ = np.sin(2 * np.pi * np.cumsum(f * (1 + width * 0.3 * slow)) / SR)
    breath = shape(air, 500, 3000, 2) * 0.12
    return (tone_ * (0.6 + 0.4 * slow) + breath) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.3


def whistle_a():
    return finish(whistle(), peak_db=-11, top=4500, tail=0.2)


def whistle_c():
    # lower and hollower: more of a lonesome moan
    return finish(whistle(1.8, ((0, 380), (0.5, 560), (1, 340)), 0.1, 6), peak_db=-11, top=3500, tail=0.25)


def squeak(f=1300, d=0.085, up=1.45):
    return tone(glide(d, [(0, f), (0.7, f * up), (1, f * up * 0.96)]), (1, 0.22, 0.08)) * env(d, 0.006, None, 0, d * 0.5)


def wave_run(one, n=6, gap=0.13, step=1.6):
    """The wave: `n` pop-up squeaks in a row, each a little higher than the last."""
    parts = [(one(i * step), i * gap, 0.85 + 0.03 * i) for i in range(n)]
    return mix(n * gap + 0.35, *parts)


def pdog_wave_a():
    return finish(wave_run(lambda s: squeak(1150 * 2 ** (s / 12))), peak_db=-9, top=6500)


def pdog_wave_c():
    # rounder "pip" pops, like bubbles going up a scale
    return finish(wave_run(lambda s: blup(520 * 2 ** (s / 12), 1150 * 2 ** (s / 12), 0.07), 6, 0.13, 2.0), peak_db=-9, top=5000)


def pdog_late_a():
    # one late, sad squeak: it droops
    d = 0.36
    return finish(tone(glide(d, [(0, 1500), (0.2, 1560), (1, 880)]), (1, 0.22, 0.08)) * env(d, 0.01, None, 0, d * 0.6), peak_db=-10, top=6000)


def pdog_late_c():
    # two falling notes: "aw-ww"
    one = lambda f, d: tone(glide(d, [(0, f), (1, f * 0.8)]), (1, 0.2)) * env(d, 0.01, None, 0, d * 0.6)
    return finish(mix(0.6, (one(1250, 0.16), 0, 0.9), (one(940, 0.3), 0.2, 1)), peak_db=-10, top=6000)


def rumble(d=2.0, seed=1, bump=5.0, crunch=0.0, accel=False):
    # a heavy round bale rolling: a soft low rumble that pulses as it turns
    n = int(d * SR)
    t = ts(d)[:n]
    low = shape(rng(seed).standard_normal(n), 45, 170, 4)
    rate = bump * (1 + (0.8 * t / d if accel else 0))
    turn = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(rate) / SR) ** 2
    x = low / np.abs(low).max() * turn
    if crunch:
        x = x + rustle(d, seed + 7, 40.0, (), 0)[:n] * crunch
    return x * np.interp(t / d, [0, 0.15, 0.75, 1], [0, 1, 1, 0])


def rumble_a():
    return finish(rumble(), peak_db=-9, top=2500, tail=0.2)


def rumble_b():
    # the same roll with straw crackling over it
    return finish(rumble(2.0, 2, 5.5, 0.35), peak_db=-9, top=6000, tail=0.2)


def rumble_c():
    # a row of soft thumps getting quicker: the bale picking up speed
    parts, at, gap = [], 0.0, 0.3
    while at < 1.7:
        parts.append((tone(glide(0.2, [(0, 120), (1, 62)])) * env(0.2, 0.004, 0.06), at, 1))
        at += gap
        gap = max(0.1, gap * 0.86)
    return finish(mix(2.0, *parts) + rumble(2.0, 3, 6, 0, True) * 0.35, peak_db=-9, top=2500, tail=0.2)


def sigh(d=1.0, f0=950, f1=500, voiced=0.0, seed=1):
    # a tired sigh: breath out, the mouth closing (the band falls), with or without a little voice
    n = int(d * SR)
    air = sweep_noise(d, f0, f1, 0.9, seed)[:n]
    x = air / np.abs(air).max()
    if voiced:
        v = tone(glide(d, [(0, 210), (1, 140)]), (1, 0.5, 0.3, 0.15))[:n]
        x = x * 0.7 + shape(v, 300, 1200, 3) / np.abs(v).max() * voiced
    return x * np.interp(np.linspace(0, 1, n), [0, 0.12, 0.35, 1], [0, 1, 0.8, 0]) ** 1.3


def sigh_a():
    return finish(sigh(), peak_db=-12, top=4500, tail=0.25)


def sigh_c():
    return finish(sigh(1.2, 850, 420, 0.6, 2), peak_db=-11, top=4500, tail=0.25)


def rain(d=2.0, seed=1, drops=55.0, bed=0.25, plink=0.0, lo=1500, hi=4200):
    # rain: many tiny soft drops over a quiet bed of hiss
    n = int(d * SR)
    r = rng(seed)
    x = shape(r.standard_normal(n), 900, 5000, 2) * bed * 0.4
    t = 0.0
    while t < d - 0.05:
        f = r.uniform(lo, hi)
        dd = r.uniform(0.008, 0.022)
        drop = np.sin(2 * np.pi * f * ts(dd) * (1 + r.uniform(-0.2, 0.2) * ts(dd) / dd)) * np.hanning(int(dd * SR))
        a = int(t * SR)
        x[a:a + len(drop)] += drop[:n - a] * r.uniform(0.25, 1)
        if plink and r.random() < plink:
            p = struck(0.12, [(r.uniform(1700, 2300), 1, 0.03)])
            x[a:a + len(p)] += p[:n - a] * 0.9
        t += r.exponential(1 / drops)
    return x * np.interp(np.linspace(0, 1, n), [0, 0.1, 0.85, 1], [0, 1, 1, 0])


def rain_a():
    return finish(rain(), peak_db=-12, top=6000, tail=0.2)


def rain_b():
    # softer: mostly a hush with a few drops
    return finish(rain(2.0, 2, 22.0, 0.9), peak_db=-13, top=5000, tail=0.2)


def rain_c():
    # drops ticking on a hard hat
    return finish(rain(2.0, 3, 30.0, 0.3, 0.3), peak_db=-11, top=6000, tail=0.2)


def umbrella_pop():
    # "fwump": the canopy snapping open
    d = 0.32
    whoosh = sweep_noise(0.1, 500, 1800, 0.9, 41) * np.linspace(0.2, 1, int(0.1 * SR))
    thump = tone(glide(0.2, [(0, 230), (1, 85)])) * env(0.2, 0.002, 0.05)
    snap = noise(0.07, 400, 3000, 42) * env(0.07, 0.001, 0.016)
    return finish(mix(d, (whoosh, 0, 0.35), (thump, 0.09, 1), (snap, 0.09, 0.6)), top=5000)


def downpour(d=2.2, seed=1, thunder=False, swell=False):
    n = int(d * SR)
    r = rng(seed)
    heavy = shape(r.standard_normal(n), 500, 5200, 2)
    heavy = heavy / np.abs(heavy).max() * (0.8 + 0.2 * shape(r.standard_normal(n), None, 6, 2) / 0.02).clip(0.5, 1.2)
    x = heavy * 0.6 + rain(d, seed + 3, 140.0, 0.0)[:n] * 0.7 + shape(r.standard_normal(n), 60, 250, 3) * 6
    shape_ = [0, 0.3 if swell else 0.06, 0.85, 1]
    x = x * np.interp(np.linspace(0, 1, n), shape_, [0, 1, 1, 0])
    if thunder:
        roll = shape(r.standard_normal(n), 35, 140, 4)
        roll = roll / np.abs(roll).max() * np.exp(-np.maximum(0, ts(d)[:n] - 0.25) / 0.6) * np.clip(ts(d)[:n] / 0.2, 0, 1)
        x = x / np.abs(x).max() + roll * 0.9
    return x


def downpour_a():
    return finish(downpour(), peak_db=-10, top=6000, tail=0.25)


def downpour_b():
    return finish(downpour(2.4, 2, False, True), peak_db=-10, top=6000, tail=0.25)


def downpour_c():
    return finish(downpour(2.4, 3, True), peak_db=-9, top=6000, tail=0.25)


def run_of(x, n=6, gap=0.13, step=1.6):
    """A pack sound played as the wave: `n` times, each a little higher."""
    return finish(mix(n * gap + len(x) / SR + 0.1, *[(pitched(x, i * step), i * gap, 0.9) for i in range(n)]), peak_db=-9)


# ---------- the board ----------
# Each cue: id, name, what it is for, where it would play, the sound it replaces (a file in
# public/audio/sfx, or None), and its three options: (label, how it was made, samples).

def P(rel, keep=None, peak=-6.0, start=0.0):
    """A pack alternate, trimmed, faded and brought to the same peak as the rest."""
    return ('pack', rel, lambda: finish(load(rel, keep, start), peak_db=peak, top=9000))


def S(note, fn):
    return ('synth', note, fn)


CUES = [
    ('sign_rattle', 'Sign rattle', 'Replaces the "dingle" everywhere it is used: a soft wooden knock-and-wobble.',
     'Back Scratcher (the deer on the sign, 4 times), Surveyor (plants and folds the tripod), Occupied and The Runaway Roll (the biffy shakes), Sleepy Worker (flips his pail), Safety Sam (scribbles).', ['rattle'],
     [('Knock and wobble', S('a soft knock, then the board wobbles to rest: quicker and quieter knocks', sign_rattle_a)),
      ('Hollow tok and wobble', S('a hollow "tok" and a low wooden wobble that dies away', sign_rattle_b)),
      ('Wood impact (pack)', P('sfx/39_rattle_kenney_impact_wood_c.mp3', 0.8))]),
    ('level_complete', 'Level complete', 'A short, warm "ta-da", under 1.5 s. Replaces the toy whistle on a win at par.', 'The win card, after the hard hats pop.', ['win'],
     [('Brass ta-da', S('two warm brass notes: a short one, then a held chord', tada_brass)),
      ('Xylophone flourish', S('a quick rising xylophone run to a bright top note', tada_xylo)),
      ('Music box ta-da-daa', S('three soft bell notes, the gentlest of the three', tada_glock))]),
    ('gate_exit', 'Gate exit', 'Something gentle as a truck drives out. Replaces the ratchet-and-ding with its whoosh.', 'Every truck that leaves by its gate (the toy horn chord on quick exits stays).', ['gate', 'exit'],
     [('Soft swish', S('a breath of air, rising', exit_swish)),
      ('Light wooden clack', S('two light knocks: the gate\'s leaf touching its post', exit_clack)),
      ('Quiet chime', S('one soft bell, low in level', exit_chime))]),
    ('muskeg_steps', 'Muskeg Boots: squelch steps', 'His boots in the muskeg.', 'Muskeg Boots, each step through the puddle.', None,
     [('Squelch steps', S('three wet steps: a soft thud and a closing "squ"', muskeg_steps)),
      ('Slime (pack)', P('sfx/35_slurp_oga_slime_01_c.mp3', 1.2)),
      ('Wet splat (pack)', P('sfx/29_splat_wet_splat_c.mp3', 1.0))]),
    ('muskeg_shluck', 'Muskeg Boots: SHLUCK pop', 'The boot comes out of the muck (or does not).', 'Muskeg Boots, when the muskeg takes his boot.', None,
     [('Suction and pop', S('suction building, then a round pop', shluck)),
      ('Cartoon slurp (pack)', P('sfx/34_tongue_cartoon_slurp_b.mp3', 1.0)),
      ('Bubble pop (pack)', P('sfx/10_button_tap_cartoon_bubble_pop_a.mp3', 0.6))]),
    ('muskeg_blup', 'Muskeg Boots: blup', 'A bubble comes up after.', 'Muskeg Boots, the last beat: the puddle settles.', None,
     [('One blup', S('a single round bubble', muskeg_blup_a)),
      ('Three blups', S('three bubbles, each smaller and higher', muskeg_blup_b)),
      ('Burble (pack)', P('sfx/35_slurp_oga_burble_01_b.mp3', 1.0))]),
    ('cat_mews', 'Cat Train: tiny mews', 'The kittens following along.', 'Cat Train, as the kittens trot in.', None,
     [('One mew', S('a small kitten "mew"', cat_mews_a)),
      ('Three tiny mews', S('three quick, higher mews', cat_mews_b)),
      ('Cute squeak (pack)', P('sfx/21_gopher_oga_cute_01_c.mp3', 0.9))]),
    ('cat_yawn', 'Cat Train: kitten yawn', 'The one that falls behind.', 'Cat Train, the sleepy kitten.', None,
     [('Kitten yawn', S('up, wide open, and down', cat_yawn_a)),
      ('Squeaky yawn', S('shorter and squeakier, with a tiny "mip" at the end', cat_yawn_b)),
      ('Sleepy sigh of a yawn', S('mostly breath', cat_yawn_c))]),
    ('beaver_pats', 'Beaver: waddle pats', 'His feet as he waddles.', 'Beaver, walking in and off (in place of the worker\'s footsteps).', None,
     [('Soft pats', S('five soft, flat-footed pats', beaver_pats)),
      ('Carpet step (pack)', P('sfx/13_footsteps_kenney_carpet_000_a.mp3', 0.5)),
      ('Carpet step 2 (pack)', P('sfx/13_footsteps_kenney_carpet_001_b.mp3', 0.5))]),
    ('beaver_bonk', 'Beaver: hollow pipe BONK', 'The pipe hits the aspen. Twice.', 'Beaver, both BONKs.', None,
     [('Hollow pipe bonk', S('a round "bonk" with a short tube ring', pipe_bonk)),
      ('Bonk (pack)', P('custom/24_outhouse_bonk_only.mp3', 0.9)),
      ('Metallic boing (pack)', P('sfx/04_bump_metallic_boing_b.mp3', 0.9))]),
    ('beaver_tail', 'Beaver: tail slap', 'Two proud slaps of his tail.', 'Beaver, the payoff.', None,
     [('Flat wet slap', S('a flat smack with a low thud under it', tail_slap)),
      ('Cartoon slap 1 (pack)', P('sfx/32_slap_cartoon_slap_1_a.mp3', 0.6)),
      ('Cartoon slap 2 (pack)', P('sfx/32_slap_cartoon_slap_2_b.mp3', 0.6))]),
    ('aurora_shimmer', 'Aurora Howl: soft shimmer', 'The northern lights rippling in.', 'Aurora Howl, as the lights come up (and perhaps again as they fade).', None,
     [('Glassy shimmer', S('a soft chord of glassy tones breathing in and out', shimmer)),
      ('Ethereal (pack)', P('sfx/37_twinkle_ethereal_win_b.mp3', 2.5, -10)),
      ('Sparkling fairy (pack)', P('sfx/09_streak_up_sparkling_fairy_a.mp3', 2.5, -10))]),
    ('aurora_howl', 'Aurora Howl: the howl that cracks', 'A proud howl that breaks into a squeak.', 'Aurora Howl, the howl and the squeak.', None,
     [('Howl, crack, squeak', S('slides up, holds, cracks into one squeak', howl_a)),
      ('Higher, wobbling', S('higher and shorter, wobbling before it goes', howl_b)),
      ('Long note, two squeaks', S('a long proud note, then two tiny squeaks', howl_c))]),
    ('tumble_rustle', 'Tumbleweed: dry rustle with light thumps', 'The tumbleweeds bouncing across.', 'Tumbleweed, while they roll.', None,
     [('Rustle and bounces', S('dry scraping with four light bounces', rustle_a)),
      ('Small quick weed', S('lighter and quicker, five small bounces', rustle_b)),
      ('Scrape (pack)', P('sfx/38_scurry_insect_scape_b.mp3', 1.6))]),
    ('tumble_wind', 'Tumbleweed: wind whistle', 'The prairie wind that brings them.', 'Tumbleweed, as it starts.', None,
     [('Wind whistle', S('a breathy whistle that rises and falls', whistle_a)),
      ('Swirling whoosh (pack)', P('sfx/28_wind_gust_swirling_whoosh_b.mp3', 1.8, -9)),
      ('Lonesome moan', S('lower and hollower', whistle_c))]),
    ('pdog_wave', 'Prairie Dog Wave: pop-up squeaks', 'One squeak a prairie dog, rising along the wave (played here as six in a row).', 'Prairie Dog Wave, as each one pops up.', None,
     [('Rising squeaks', S('six quick chirps, each a little higher', pdog_wave_a)),
      ('Squeaky toy, rising (pack)', ('pack', 'sfx/21_gopher_squeaky_toy_hits_b.mp3, played six times, each higher', lambda: run_of(load('sfx/21_gopher_squeaky_toy_hits_b.mp3', 0.22)))),
      ('Rising pips', S('rounder "pip" pops going up a scale', pdog_wave_c))]),
    ('pdog_late', 'Prairie Dog Wave: one sad late squeak', 'The one who misses his cue.', 'Prairie Dog Wave, the late one.', None,
     [('Drooping squeak', S('one squeak that droops', pdog_late_a)),
      ('Squeaky toy, low (pack)', ('pack', 'sfx/21_gopher_squeaky_toy_hits_b.mp3, played lower and slower', lambda: finish(pitched(load('sfx/21_gopher_squeaky_toy_hits_b.mp3', 0.3), -7), peak_db=-9))),
      ('Aw-ww', S('two falling notes', pdog_late_c))]),
    ('bale_rumble', 'Runaway Bale: rolling rumble', 'The bale rolling off.', 'Runaway Bale, while it rolls.', None,
     [('Low rolling rumble', S('a soft low rumble that pulses as it turns', rumble_a)),
      ('Rumble with straw', S('the same roll with straw crackling over it', rumble_b)),
      ('Thumps picking up speed', S('soft thumps getting quicker', rumble_c))]),
    ('bale_sigh', 'Runaway Bale: tired sigh', 'The rancher, after it rolls one more inch.', 'Runaway Bale, the last beat.', None,
     [('Breath sigh', S('a long breath out', sigh_a)),
      ('Breath (pack)', P('sfx/23_bull_oga_breath_a.mp3', 1.2, -9)),
      ('Voiced sigh', S('a breath with a little falling voice in it', sigh_c))]),
    ('cloud_rain', 'Personal Cloud: rain patter', 'His own small rain.', 'Personal Cloud, whenever it rains on him (it would loop).', None,
     [('Patter', S('many tiny soft drops over a quiet hush', rain_a)),
      ('Soft hush', S('mostly hush, a few drops', rain_b)),
      ('Drops on a hard hat', S('drops ticking on his hat', rain_c))]),
    ('cloud_umbrella', 'Personal Cloud: umbrella pop', 'The umbrella snaps open.', 'Personal Cloud, both times he opens it.', None,
     [('Fwump', S('the canopy snapping open', umbrella_pop)),
      ('Light bubble pop (pack)', P('sfx/10_button_tap_light_bubble_pop_b.mp3', 0.5)),
      ('Rubber snap (pack)', P('sfx/16_cord_snap_rubber_snap_a.mp3', 0.6))]),
    ('cloud_downpour', 'Personal Cloud: downpour', 'The cloud gets its own back.', 'Personal Cloud, when he closes the umbrella.', None,
     [('Downpour', S('heavy rain, straight in', downpour_a)),
      ('Swelling downpour', S('it builds for a moment first', downpour_b)),
      ('Downpour with a grumble', S('heavy rain with a small roll of thunder', downpour_c))]),
]

# JAY'S PICKS that were synthesized here (Oct 6), by the key the game plays them under. The prairie
# dogs' squeak is ONE squeak: the game plays it once per dog, each a little higher, on that dog's beat.
PICKED = {
    'knock': sign_rattle_a,        # sign_rattle A
    'tada': tada_xylo,             # level_complete B
    'clack': exit_clack,           # gate_exit B
    'click': ui_click,             # every button tap (Oct 6: one click everywhere)
    'mew': cat_mews_a,             # cat_mews A
    'yawn': cat_yawn_a,            # cat_yawn A
    'pats': beaver_pats,           # beaver_pats A
    'bonk': pipe_bonk,             # beaver_bonk A
    'shimmer': shimmer,            # aurora_shimmer A
    'howl': howl_b,                # aurora_howl B
    'rustle': rustle_b,            # tumble_rustle B
    'whistle': whistle_a,          # tumble_wind A
    'squeak': lambda: finish(mix(0.2, (squeak(1150), 0.01, 1)), peak_db=-9, top=6500),   # pdog_wave A, one dog's worth
    'aww': pdog_late_c,            # pdog_late C
    'rumble': rumble_b,            # bale_rumble B
    'sigh': sigh_a,                # bale_sigh A
    'rain': rain_b,                # cloud_rain B
    'downpour': downpour_c,        # cloud_downpour C
}

SILENT_GAGS = ['Muskeg Boots', 'Cat Train', 'Beaver', 'Aurora Howl', 'Tumbleweed', 'Prairie Dog Wave', 'Runaway Bale', 'Personal Cloud']
SILENT_EVENTS = [
    'A win one to three moves over par (the hard hats pop, then nothing)',
    'Hint: the truck lighting up, the ghost showing where it goes, a Hint with none left',
    'Undo and Restart (only the button\'s own pop)',
    'A locked level or region tapped (it shakes in silence)',
    'A new sighting\'s toast, the last sighting, camo pickups unlocked',
    'A new lease opening ("NEW LEASE OPEN"), "Next field"',
    'A hint earned for a win at par, the Zero Incident medal, the confetti',
    'Night falling, day coming back, the night\'s nudge',
    'Muskeg: a truck sliding across it',
    'Load racks: a tanker loading',
    'Shift-change gates: the clock turning green or red',
    'Convoy gates: the gate opening for truck 2',
    'Tire spray (mud, dust, snow)',
    'The dig: a buried thing tapped, the dinosaur egg cracking, the oil, the arrival at Kerguelen',
    'A bush or the tall aspen shaking when tapped; a flare tapped',
    'The how-to cards turning; the "New version" bar',
]
RATTLE_USES = [
    ('Back Scratcher (deer)', 'rubs the sign, 3 times; shakes himself, once'),
    ('Surveyor', 'plants the tripod; folds the tripod'),
    ('Occupied (Biffy A)', 'the truck\'s bump shakes the biffy, once'),
    ('The Runaway Roll (Biffy B)', 'the bump shakes the biffy, twice'),
    ('Sleepy Worker', 'flips his pail over'),
    ('Safety Sam', 'scribbles on his clipboard'),
]


def b64(path):
    return 'data:audio/mpeg;base64,' + base64.b64encode(Path(path).read_bytes()).decode()


def build():
    cues = []
    for cid, name, what, where, replaces, options in CUES:
        opts = []
        for letter, (label, (kind, note, make)) in zip('ABC', options):
            mp3, m = encode(make(), f'{cid}_{letter}')
            opts.append({'letter': letter, 'label': label, 'kind': kind, 'note': note, 'src': b64(mp3), **m})
            print(f'{cid:16} {letter} {label:32} {m["seconds"]:5.2f} s  mean {m["mean"]:6.1f} dB  peak {m["peak"]:5.1f} dB')
        now = []
        for key in replaces or []:
            f = ROOT / 'public' / 'audio' / 'sfx' / f'{key}.mp3'
            now.append({'key': key, 'src': b64(f), **measure(f)})
        cues.append({'id': cid, 'name': name, 'what': what, 'where': where, 'now': now, 'options': opts})
    return cues


PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Rig Jam: sound picks</title>
<style>
  :root { --ink: #2b1e16; --dim: #6f5a47; --cream: #fff7e6; --card: #fffdf6; --line: #2b1e16; --go: #2fb65a; --pick: #ffc93c; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 14px 12px calc(96px + env(safe-area-inset-bottom)); background: #e9dcc0; color: var(--ink); font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-text-size-adjust: 100%; }
  main { max-width: 620px; margin: 0 auto; }
  h1 { margin: 4px 0 6px; font-size: 26px; }
  h2 { margin: 26px 0 8px; font-size: 20px; }
  p { margin: 6px 0; }
  .dim { color: var(--dim); font-size: 14px; }
  .box { margin: 12px 0; padding: 12px 14px; border: 2.5px solid var(--line); border-radius: 14px; background: var(--card); }
  .box ul { margin: 6px 0 0; padding-left: 20px; }
  .box li { margin: 3px 0; }
  .cue h3 { margin: 0 0 2px; font-size: 18px; }
  .opt { display: grid; grid-template-columns: 56px 1fr 56px; gap: 10px; align-items: center; margin-top: 10px; padding: 8px; border: 2px solid #d9cdb4; border-radius: 12px; background: #fff; }
  .opt > div { min-width: 0; overflow-wrap: anywhere; }
  .opt.picked { border-color: var(--line); background: #fff4cf; }
  button { font: inherit; color: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .play { width: 56px; height: 56px; border: 2.5px solid var(--line); border-radius: 50%; background: var(--go); color: #fff; font-size: 22px; font-weight: 700; }
  .play.on { background: #1f7f3e; }
  .play.small { width: 44px; height: 44px; font-size: 16px; background: #8a8f98; }
  .pick { width: 56px; height: 56px; border: 2.5px solid var(--line); border-radius: 12px; background: var(--cream); font-size: 22px; font-weight: 800; }
  .picked .pick { background: var(--pick); }
  .opt b { display: block; }
  .tag { display: inline-block; margin-right: 6px; padding: 0 7px; border-radius: 999px; background: #e7ecf3; font-size: 12px; font-weight: 700; }
  .tag.synth { background: #e3f3e6; }
  .loud { display: block; font-size: 13px; color: var(--dim); font-variant-numeric: tabular-nums; }
  .now { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-top: 8px; font-size: 14px; }
  .now > span { display: flex; gap: 8px; align-items: center; width: 100%; }
  .now .loud { display: inline; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: var(--cream); border-top: 2.5px solid var(--line); }
  .bar div { display: flex; gap: 10px; align-items: center; max-width: 620px; margin: 0 auto; }
  .bar button { flex: 1; min-height: 52px; border: 2.5px solid var(--line); border-radius: 14px; background: var(--pick); font-weight: 800; font-size: 17px; }
  .bar span { font-weight: 700; white-space: nowrap; }
  textarea { width: 100%; max-width: 100%; min-height: 180px; margin-top: 8px; padding: 8px; border: 2px solid var(--line); border-radius: 10px; font: 14px/1.35 ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
<main>
  <h1>Sound picks</h1>
  <p>Rig Jam, sound pass, step 1. Tap the green button to hear an option, tap its letter to pick it. Your picks are kept on this phone. When you are done, tap <b>Copy my picks</b> at the bottom and send them over.</p>
  <p class="dim">Each option shows its loudness (average and peak, in dB: closer to 0 is louder), measured the same way as the sounds already in the game, so the mix can be matched once you have picked. "pack" is an alternate from your cartoon sound pack; "made" is a clean synthesized sound. If your phone is on silent, turn the ringer on.</p>

  <div class="box"><b>The audit</b>
    <p><b>Gags with no sound at all (8 of the 26):</b> __SILENT_GAGS__. The other 18 have sounds on their beats.</p>
    <p><b>Where the sign "dingle" is reused (10 times, in 6 gags):</b></p>
    <ul>__RATTLE__</ul>
    <p><b>Game events with no sound of their own:</b></p>
    <ul>__EVENTS__</ul>
    <p class="dim">Already wired, no pick needed: the bear's business now uses the magpie's dropping sound.</p>
  </div>

  <h2>The cues</h2>
  <div id="cues"></div>

  <div class="box"><b>Your picks</b>
    <p class="dim">A note for any cue is welcome (for example "B but lower", or "none of these").</p>
    <textarea id="out" readonly></textarea>
  </div>
</main>
<div class="bar"><div><span id="count"></span><button id="copy">Copy my picks</button></div></div>
<script>
const CUES = __DATA__;
const KEY = 'rhr-sound-picks';
let picks = {};
try { picks = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch (e) {} };
let playing = null, playingBtn = null;
function play(src, btn) {
  if (playing) { playing.pause(); playingBtn && playingBtn.classList.remove('on'); }
  if (playingBtn === btn && playing && !playing.ended) { playing = playingBtn = null; return; }
  const a = new Audio(src);
  playing = a; playingBtn = btn; btn.classList.add('on');
  a.onended = () => { btn.classList.remove('on'); if (playing === a) playing = playingBtn = null; };
  a.play().catch(() => btn.classList.remove('on'));
}
const db = (v) => (v > 0 ? '+' : '') + v.toFixed(1) + ' dB';
const loud = (o) => `average ${db(o.mean)}, peak ${db(o.peak)}, ${o.seconds.toFixed(2)} s`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = document.getElementById('cues');
for (const c of CUES) {
  const box = document.createElement('section');
  box.className = 'box cue';
  box.innerHTML = `<h3>${esc(c.name)}</h3><p>${esc(c.what)}</p><p class="dim">Where: ${esc(c.where)}</p>` +
    (c.now.length ? `<div class="now"><b>Now in the game:</b>${c.now.map((n, i) => `<span><button class="play small" data-now="${i}" aria-label="Play the current ${esc(n.key)} sound">&#9654;</button>${esc(n.key)} <span class="loud">${loud(n)}</span></span>`).join('')}</div>` : '') +
    c.options.map((o) => `<div class="opt" data-letter="${o.letter}"><button class="play" aria-label="Play option ${o.letter}">&#9654;</button><div><b>${o.letter}. ${esc(o.label)}</b><span class="dim"><span class="tag ${o.kind}">${o.kind === 'pack' ? 'pack' : 'made'}</span>${esc(o.note)}</span><span class="loud">${loud(o)}</span></div><button class="pick" aria-label="Pick option ${o.letter}">${o.letter}</button></div>`).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.now !== undefined) return play(c.now[+b.dataset.now].src, b);
    const opt = b.closest('.opt'), o = c.options.find((x) => x.letter === opt.dataset.letter);
    if (b.classList.contains('play')) return play(o.src, b);
    picks[c.id] = picks[c.id] === o.letter ? undefined : o.letter;
    save(); show();
  });
  host.append(box);
  c.el = box;
}
function text() {
  return 'Rig Jam sound picks\n' + CUES.map((c) => { const o = c.options.find((x) => x.letter === picks[c.id]); return `${c.id}: ${o ? o.letter + ' (' + o.label + ')' : 'no pick yet'}`; }).join('\n');
}
function show() {
  for (const c of CUES) c.el.querySelectorAll('.opt').forEach((el) => el.classList.toggle('picked', picks[c.id] === el.dataset.letter));
  const n = CUES.filter((c) => picks[c.id]).length;
  document.getElementById('count').textContent = `${n} of ${CUES.length} picked`;
  document.getElementById('out').value = text();
}
document.getElementById('copy').addEventListener('click', async (e) => {
  const out = document.getElementById('out');
  let ok = false;
  try { await navigator.clipboard.writeText(text()); ok = true; } catch (err) { out.removeAttribute('readonly'); out.select(); try { ok = document.execCommand('copy'); } catch (e2) {} out.setAttribute('readonly', ''); }
  e.target.textContent = ok ? 'Copied! Paste it to Claude' : 'Press and hold the box above to copy';
  setTimeout(() => (e.target.textContent = 'Copy my picks'), 2600);
});
show();
</script>
</body>
</html>
"""


def export():
    """Jay's synthesized picks as WAV sources for audio-pack.py (the game's key: the sound)."""
    ART.mkdir(parents=True, exist_ok=True)
    for key, make in PICKED.items():
        x = make()
        with wave.open(str(ART / f'{key}.wav'), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
        print(f'{key:10} {len(x) / SR:5.2f} s  peak {20 * np.log10(np.abs(x).max()):5.1f} dB')
    print(f'wrote {len(PICKED)} sources to {ART}')


def main():
    if '--export' in sys.argv:
        return export()
    cues = build()
    page = (PAGE
            .replace('__SILENT_GAGS__', html.escape(', '.join(SILENT_GAGS)))
            .replace('__RATTLE__', ''.join(f'<li><b>{html.escape(g)}</b>: {html.escape(w)}</li>' for g, w in RATTLE_USES))
            .replace('__EVENTS__', ''.join(f'<li>{html.escape(e)}</li>' for e in SILENT_EVENTS))
            .replace('__DATA__', json.dumps(cues)))
    for out in OUT:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page)
        print(f'wrote {out} ({out.stat().st_size / 1e6:.2f} MB, {len(cues)} cues, {sum(len(c["options"]) for c in cues)} options)')


if __name__ == '__main__':
    main()
