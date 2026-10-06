import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CREDITS, musicCredits, sfxCredits } from './credits.ts';
import { GAG_LOOPS, GAG_SOUNDS, parseCue } from './gag-sounds.ts';
import { MAX_TRIM, MUSIC_STYLES, MUSIC_VOLUME, SFX_KEYS, VOLUME, gainFor, loopPoints, musicGain, musicInfo, musicKey, pickFormat, sfxInfo, type SfxKey } from './pack.ts';
import { GAG_TRIGGERS, type GagId } from '../ui/gag-triggers.ts';

const pub = (f: string) => new URL(`../../public/audio/${f}`, import.meta.url);

describe("the sound pack: Jay's picks, as files", () => {
  it('has one file for every cue, and nothing in public/audio that is not used', () => {
    expect(SFX_KEYS.length).toBe(42);
    for (const key of SFX_KEYS) expect(existsSync(pub(`sfx/${key}.mp3`)), key).toBe(true);
    expect(readdirSync(pub('sfx')).sort()).toEqual(SFX_KEYS.map((k) => `${k}.mp3`).sort());
    const music = MUSIC_STYLES.flatMap((s) => (['menu', 'play'] as const).flatMap((scene) => musicInfo(musicKey(s.id, scene)).formats.map((f) => f.file)));
    expect(readdirSync(pub('music')).sort()).toEqual(music.sort());
  });

  it('nothing ends abruptly: every one-shot was given a fade, and the long ones were cut to what the game uses', () => {
    for (const key of SFX_KEYS) {
      const i = sfxInfo(key);
      expect(i.seconds, key).toBeGreaterThan(0.1);
      if (!i.loop) expect(i.seconds, key).toBeLessThan(3.5);
    }
    // The 7 s cartoon drive is only its first rev; the goose is one honk.
    expect(sfxInfo('drag').seconds).toBeLessThan(1);
    expect(sfxInfo('geese').seconds).toBeLessThan(1.7);
    expect(SFX_KEYS.filter((k) => sfxInfo(k).loop).sort()).toEqual(['mosquito', 'motor', 'quad_idle', 'quad_rev']);
  });

  it('the effects stay small (they load together when Sound effects is turned on)', () => {
    const bytes = SFX_KEYS.reduce((n, k) => n + statSync(pub(`sfx/${k}.mp3`)).size, 0);
    expect(bytes).toBeLessThan(1_200_000);
  });
});

describe('the mix: a volume for every sound, so nothing jumps out', () => {
  it('every sound has its place in the table, between 0 and 1', () => {
    expect(Object.keys(VOLUME).sort()).toEqual([...SFX_KEYS].sort());
    for (const key of SFX_KEYS) {
      expect(VOLUME[key], key).toBeGreaterThan(0);
      expect(VOLUME[key], key).toBeLessThanOrEqual(1);
      expect(gainFor(key), key).toBeGreaterThan(0.02);
      expect(gainFor(key), key).toBeLessThanOrEqual(1);
    }
  });

  it("evens out the files' own loudness first: a loud file is turned down, a quiet one up", () => {
    // The walkie squelch is by far the hottest file (about -8.5 dB average) and one of the quietest in the game.
    expect(sfxInfo('radio').mean).toBeGreaterThan(-12);
    expect(gainFor('radio')).toBeLessThan(VOLUME.radio * 0.5);
    expect(sfxInfo('slurp').mean).toBeLessThan(-24);
    expect(gainFor('slurp')).toBeGreaterThan(VOLUME.slurp * 1.5);
    expect(gainFor('slurp')).toBeLessThanOrEqual(Math.min(1, VOLUME.slurp * MAX_TRIM));
  });

  it("the player's own sounds sit on top; engines, loops and the pumpjack sit low", () => {
    for (const low of ['motor', 'quad_idle', 'quad_rev', 'mosquito', 'pumpjack', 'step'] as SfxKey[]) expect(VOLUME[low], low).toBeLessThan(0.4);
    expect(VOLUME.bump).toBeGreaterThan(VOLUME.motor * 2);
    expect(VOLUME.win).toBeGreaterThan(VOLUME.tap);
    expect(VOLUME.pumpjack).toBeLessThan(0.2);
  });

  it('music sits well under the effects, and the in-play loop is quieter than the menu loop', () => {
    expect(MUSIC_VOLUME.menu).toBeLessThan(0.4);
    expect(MUSIC_VOLUME.play).toBeLessThan(MUSIC_VOLUME.menu * 0.7);
    for (const s of MUSIC_STYLES) {
      const [menu, play] = [musicGain(musicKey(s.id, 'menu')), musicGain(musicKey(s.id, 'play'))];
      expect(play, s.id).toBeLessThan(menu);
      expect(menu, s.id).toBeLessThan(Math.max(...SFX_KEYS.map(gainFor)) * 0.6);
    }
  });
});

describe('music loops', () => {
  it('three styles, each with a menu loop and an in-play loop, gapless first and MP3 as the fallback', () => {
    expect(MUSIC_STYLES.map((s) => s.id)).toEqual(['country', 'retro', 'chill']);
    for (const s of MUSIC_STYLES) for (const scene of ['menu', 'play'] as const) {
      const info = musicInfo(musicKey(s.id, scene));
      expect(info.formats.map((f) => f.type)).toEqual([expect.stringMatching(/^audio\/ogg; codecs=(vorbis|opus)$/), 'audio/mpeg']);
      for (const f of info.formats) expect(existsSync(pub(`music/${f.file}`)), f.file).toBe(true);
      expect(info.seconds).toBeGreaterThan(55);
      expect(info.seconds).toBeLessThan(150);
    }
  });

  it('Bitstream Dreams and Chill Beat (weak loop points) and the Country songs have a 2 s crossfade baked into their loop', () => {
    expect(musicInfo('retro_play').crossfaded).toBe(true); // Bitstream Dreams
    expect(musicInfo('chill_menu').crossfaded).toBe(true); // Chill Beat
    expect(musicInfo('country_menu').crossfaded).toBe(true);
    expect(musicInfo('country_play').crossfaded).toBe(true);
    // These two were delivered as clean loops, with gapless Ogg copies: used as they are.
    expect(musicInfo('retro_menu')).toMatchObject({ crossfaded: false, seconds: 89.14 });
    expect(musicInfo('chill_play').crossfaded).toBe(false);
    expect(musicInfo('retro_play').seconds).toBeCloseTo(64 - 2, 1);
    expect(musicInfo('chill_menu').seconds).toBeCloseTo(61.28 - 2, 1);
  });

  it("a loop skips an MP3's padding: the true silence at its head and tail, and no more than that", () => {
    const rate = 1000;
    const padded = [...new Array(25).fill(0), ...Array.from({ length: 900 }, (_, i) => Math.sin(i / 3) * 0.5 + 0.01), ...new Array(40).fill(0)];
    expect(loopPoints(padded, rate)).toEqual({ start: 0.025, end: 0.925 });
    // No padding: the whole buffer.
    const clean = Array.from({ length: 500 }, () => 0.2);
    expect(loopPoints(clean, rate)).toEqual({ start: 0, end: 0.5 });
    // A quiet passage is music, not padding: never more than 80 ms is skipped.
    const quiet = [...new Array(300).fill(0), ...new Array(700).fill(0.3)];
    expect(loopPoints(quiet, rate).start).toBe(0.08);
  });

  it('plays the gapless copy where the browser can, the MP3 where it cannot', () => {
    const formats = musicInfo('retro_menu').formats;
    expect(pickFormat(formats, () => 'probably')[0].file).toBe('retro_menu.ogg');
    expect(pickFormat(formats, (t) => (t === 'audio/mpeg' ? 'maybe' : '')).map((f) => f.file)).toEqual(['retro_menu.mp3']);
    expect(pickFormat(formats, () => '').at(-1)!.type).toContain('ogg');
  });

  it('music files are never part of the first download', () => {
    const config = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
    expect(config).toContain("!f.startsWith('audio/music/')");
  });
});

describe('gag sounds: one table, by beat', () => {
  it('has an entry for every gag, and every sound and loop it names exists', () => {
    const ids = Object.keys(GAG_TRIGGERS).filter((k) => k !== 'night' && k !== 'nightNudge') as GagId[];
    expect(Object.keys(GAG_SOUNDS).sort()).toEqual([...ids].sort());
    const started = new Map<string, number>();
    for (const [id, beats] of Object.entries(GAG_SOUNDS)) for (const cues of Object.values(beats)) for (const cue of cues) {
      const { op, name, delay } = parseCue(cue);
      expect(delay, `${id} ${cue}`).toBeGreaterThanOrEqual(0);
      if (op === 'play') expect(SFX_KEYS, `${id} ${cue}`).toContain(name);
      else expect(Object.keys(GAG_LOOPS), `${id} ${cue}`).toContain(name);
      if (op === 'start') started.set(id, (started.get(id) ?? 0) + 1);
    }
    for (const loop of Object.values(GAG_LOOPS)) expect(SFX_KEYS).toContain(loop.key);
    expect(started.size).toBeGreaterThan(8);
  });

  it('reads a cue: a sound, a delay, a loop to start or stop', () => {
    expect(parseCue('poke')).toEqual({ op: 'play', name: 'poke', delay: 0 });
    expect(parseCue('chomp@0.45')).toEqual({ op: 'play', name: 'chomp', delay: 0.45 });
    expect(parseCue('+steps')).toEqual({ op: 'start', name: 'steps', delay: 0 });
    expect(parseCue('-snore')).toEqual({ op: 'stop', name: 'snore', delay: 0 });
    expect(parseCue('+mosquito@0.15')).toEqual({ op: 'start', name: 'mosquito', delay: 0.15 });
  });

  it("uses the gag sounds Jay picked where they belong", () => {
    const all = (id: GagId) => Object.values(GAG_SOUNDS[id]).flat().map((c) => parseCue(c).name);
    expect(all('biffyA')).toContain('outhouse');
    expect(all('biffyB')).toContain('outhouse');
    expect(all('gopherLunch')).toEqual(expect.arrayContaining(['chomp', 'burp', 'thwip']));
    expect(all('tourists')).toEqual(expect.arrayContaining(['camera', 'mosquito', 'slap']));
    expect(all('tongue')).toEqual(expect.arrayContaining(['slurp', 'thwip', 'camera', 'twinkle']));
    expect(all('porcupine')).toEqual(expect.arrayContaining(['poke', 'scurry', 'hop']));
    expect(all('deer')).toContain('rattle'); // the sign rattles
    expect(all('landowner')).toEqual(expect.arrayContaining(['quad_start', 'quad_idle', 'quad_rev']));
    expect(all('worker')).toEqual(expect.arrayContaining(['steps', 'snore']));
    expect(all('moose')).toContain('moose');
    expect(all('geese')).toContain('geese');
    expect(all('bull')).toEqual(expect.arrayContaining(['bull', 'cow', 'twinkle']));
    expect(all('nearMiss')).toContain('gopher');
    expect(all('magpie')).toContain('wind');
  });
});

describe('credits', () => {
  it('every file in the game has a row, from the packs\' own CREDITS', () => {
    expect(CREDITS.filter((c) => c.kind === 'sfx').length).toBe(42);
    expect(musicCredits().map((c) => c.title)).toEqual(['Fun On The Farm', 'Tap Room Rag', '50 Over The Speed Limit', 'BITSTREAM DREAMS', 'Chill Beat', 'Chillhop mix']);
    for (const c of CREDITS) {
      expect(c.author, c.file).toBeTruthy();
      expect(c.licence, c.file).toBeTruthy();
    }
    const groups = sfxCredits();
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(42);
    expect(groups.find((g) => g.author === 'Synthesized for Rush Hour Rigs')?.count).toBe(3);
    // Nothing picked needs an attribution licence (no CC BY track): Pixabay, Mixkit, CC0 and our own.
    for (const c of CREDITS) expect(c.licence, c.file).toMatch(/Pixabay|Mixkit|CC0|Original/);
  });
});
