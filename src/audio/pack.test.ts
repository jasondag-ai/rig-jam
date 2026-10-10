import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CREDITS, musicCredits, sfxCredits } from './credits.ts';
import { FINALE_SOUNDS, GAG_LOOPS, GAG_SOUNDS, finaleKeys, gagKeys, parseCue } from './gag-sounds.ts';
import { BALD } from '../ui/bald-gags.ts';
import { FINALE_BEATS } from '../ui/finale.ts';
import { WAVE3 } from '../ui/wave3.ts';
import { CORE_KEYS, LAZY_KEYS, MAX_TRIM, MUSIC_STYLES, MUSIC_TARGET_MEAN, MUSIC_VOLUME, PLAY_TIER, SFX_KEYS, TARGET_MEAN, VOLUME, gainFor, loopPoints, musicGain, musicInfo, musicKey, pickFormat, playTier, sfxInfo, type SfxKey } from './pack.ts';
import { GAG_TRIGGERS, type GagId } from '../ui/gag-triggers.ts';

/** Baldonnel's seven sightings, and the nine files made for them and for the finale (job U10). */
const BALD_IDS: GagId[] = ['overweight', 'cranes', 'bison', 'hare', 'ice', 'frogs', 'mosquito'];
const NINE: SfxKey[] = ['crane_call', 'frog_chorus', 'frog_late', 'bison_snort', 'chuckle', 'timer_beep', 'scrub', 'creak', 'polaroid'];
const pub = (f: string) => new URL(`../../public/audio/${f}`, import.meta.url);

describe("the sound pack: Jay's picks, as files", () => {
  it('has one file for every cue, and nothing in public/audio that is not used', () => {
    expect(SFX_KEYS.length).toBe(74);
    // The old dingle, the old win and the old gate (with its whoosh) are gone, files and all.
    for (const old of ['rattle', 'win', 'gate', 'exit']) { expect(SFX_KEYS).not.toContain(old); expect(existsSync(pub(`sfx/${old}.mp3`)), old).toBe(false); }
    for (const key of SFX_KEYS) expect(existsSync(pub(`sfx/${key}.mp3`)), key).toBe(true);
    expect(readdirSync(pub('sfx')).sort()).toEqual(SFX_KEYS.map((k) => `${k}.mp3`).sort());
    // (Every style's menu loop and its in-play loops: one for most, one a tier for Classic Rock.)
    const keys = new Set(MUSIC_STYLES.flatMap((s) => [musicKey(s.id, 'menu'), ...[1, 2, 3, 4].map((tier) => musicKey(s.id, 'play', tier))]));
    const music = [...keys].flatMap((k) => musicInfo(k).formats.map((f) => f.file));
    expect(readdirSync(pub('music')).sort()).toEqual(music.sort());
  });

  it('every button has ONE click, a notch under the truck\'s own sounds', () => {
    expect(SFX_KEYS).toContain('click');
    expect(SFX_KEYS).not.toContain('back');
    for (const truck of ['drag', 'clack', 'bump'] as const) expect(gainFor('click'), truck).toBeLessThan(gainFor(truck));
    expect(gainFor('click')).toBeGreaterThan(0.25);
  });

  it('nothing ends abruptly: every one-shot was given a fade, and the long ones were cut to what the game uses', () => {
    for (const key of SFX_KEYS) {
      const i = sfxInfo(key);
      // (The buttons' click is the one short one: under 80 ms, by Jay's order.)
      if (key === 'click') expect(i.seconds, key).toBeLessThan(0.08);
      else expect(i.seconds, key).toBeGreaterThan(0.1);
      if (!i.loop) expect(i.seconds, key).toBeLessThan(3.5);
    }
    // The 7 s cartoon drive is only its first rev; the goose is one honk.
    expect(sfxInfo('drag').seconds).toBeLessThan(1);
    expect(sfxInfo('geese').seconds).toBeLessThan(1.7);
    expect(SFX_KEYS.filter((k) => sfxInfo(k).loop).sort()).toEqual(['mosquito', 'motor', 'quad_idle', 'quad_rev', 'scrub']);
  });

  it('the effects stay small: what loads when Sound effects is turned on, and what each wave 3 level adds', () => {
    const size = (keys: readonly SfxKey[]) => keys.reduce((n, k) => n + statSync(pub(`sfx/${k}.mp3`)).size, 0);
    expect(size(CORE_KEYS)).toBeLessThan(1_000_000);
    // (Never all at once: a level fetches only what its own gags use. Wave 3's nineteen, and Clearwater's five.)
    const clearwater: SfxKey[] = ['whoosh', 'boing', 'crack', 'splash', 'triangle'];
    expect(size(LAZY_KEYS.filter((k) => !clearwater.includes(k) && !NINE.includes(k)))).toBeLessThan(400_000);
    // (And the nine for Baldonnel's sightings and the finale: Manus's finished files, copied as they are.)
    expect(size(NINE)).toBeLessThan(230_000);
    expect(size(clearwater)).toBeLessThan(90_000);
  });

  it('LAZY: the sounds only gag wave 3 uses are not fetched with the rest; a level fetches its own gags\' sounds', () => {
    expect([...CORE_KEYS, ...LAZY_KEYS].sort()).toEqual([...SFX_KEYS].sort());
    expect(CORE_KEYS).toEqual(expect.arrayContaining(['knock', 'tada', 'clack', 'bump', 'tap', 'step', 'sigh'].filter((k) => k !== 'sigh')));
    // (And Clearwater's five, which bring five sounds of their own.)
    const wave3: GagId[] = ['muskeg', 'catTrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'golf', 'cold', 'wash', 'bell', 'pea', ...BALD_IDS];
    const older = (Object.keys(GAG_SOUNDS) as GagId[]).filter((g) => !wave3.includes(g));
    // No older gag and no game cue needs a lazy sound; every lazy sound is used by a wave 3 gag.
    for (const g of older) for (const k of gagKeys(g)) expect(LAZY_KEYS, `${g} ${k}`).not.toContain(k);
    // (The finale is no gag: it fetches its own, `finaleKeys`.)
    expect([...new Set([...wave3.flatMap(gagKeys), ...finaleKeys()].filter((k) => LAZY_KEYS.includes(k)))].sort()).toEqual([...LAZY_KEYS].sort());
    // What a Mannville level warms, and a Bakken one.
    expect(gagKeys('beaver').sort()).toEqual(['bonk', 'pats', 'poke', 'tailslap']);
    expect(gagKeys('cloud').sort()).toEqual(['downpour', 'rain', 'step', 'umbrella']);
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
    expect(VOLUME.tada).toBeGreaterThan(VOLUME.tap);
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
  it('four styles, each with a menu loop and an in-play loop for every tier, gapless first and MP3 as the fallback', () => {
    expect(MUSIC_STYLES.map((s) => s.id)).toEqual(['country', 'retro', 'chill', 'classic']);
    for (const s of MUSIC_STYLES) for (const [scene, tier] of [['menu', 1], ['play', 1], ['play', 2], ['play', 3], ['play', 4]] as const) {
      const info = musicInfo(musicKey(s.id, scene, tier));
      expect(info.formats.map((f) => f.type)).toEqual([expect.stringMatching(/^audio\/ogg; codecs=(vorbis|opus)$/), 'audio/mpeg']);
      for (const f of info.formats) expect(existsSync(pub(`music/${f.file}`)), f.file).toBe(true);
      expect(info.seconds).toBeGreaterThan(55);
      expect(info.seconds).toBeLessThan(150);
    }
  });

  it('Classic Rock gets heavier up the regions: one table of tiers, and the older styles keep their one in-play loop', () => {
    // The table (pack.ts `PLAY_TIER`): Cardium 1, Montney 2, Duvernay 3, Mannville, Bakken and Clearwater and Baldonnel 4, the Daily Pad 3, the Sunday Turnaround 4, anything else 1.
    expect(PLAY_TIER).toEqual({ cardium: 1, montney: 2, duvernay: 3, mannville: 4, bakken: 4, clearwater: 4, baldonnel: 4, daily: 3, turnaround: 4 });
    expect(['cardium', 'montney', 'duvernay', 'mannville', 'bakken', 'clearwater', 'daily', 'somewhere-new'].map(playTier)).toEqual([1, 2, 3, 4, 4, 4, 3, 1]);
    expect([1, 2, 3, 4].map((tier) => musicKey('classic', 'play', tier))).toEqual(['classic_play1', 'classic_play2', 'classic_play3', 'classic_play4']);
    expect(musicKey('classic', 'play')).toBe('classic_play1');
    expect(musicKey('classic', 'play', 9)).toBe('classic_play1');
    expect(musicKey('classic', 'menu', 4)).toBe('classic_menu');
    // THE FALLBACK: Country, 80s Retro and Chill play their one loop whatever the tier, exactly as before.
    for (const tier of [1, 2, 3, 4]) {
      expect(musicKey('country', 'play', tier)).toBe('country_play');
      expect(musicKey('retro', 'play', tier)).toBe('retro_play');
      expect(musicKey('chill', 'play', tier)).toBe('chill_play');
    }
    expect(musicKey('country', 'play')).toBe('country_play');
    expect(musicKey('country', 'menu', 3)).toBe('country_menu');
    // The five loops as shipped: encoded like the rest (Ogg Opus first, MP3 behind), one seamless loop each, the lengths Manus cut.
    const want = { classic_menu: 114.28, classic_play1: 124.8, classic_play2: 131.67, classic_play3: 99.69, classic_play4: 132.92 } as const;
    for (const [key, seconds] of Object.entries(want)) {
      const info = musicInfo(key as keyof typeof want);
      expect(info.seconds, key).toBeCloseTo(seconds, 1);
      expect(info.crossfaded, key).toBe(true);
      expect(info.formats, key).toEqual([{ file: `${key}.opus`, type: 'audio/ogg; codecs=opus' }, { file: `${key}.mp3`, type: 'audio/mpeg' }]);
      // No bigger than the other loops for its length: about 112 kb/s and 128 kb/s (they came at 190 and 320).
      for (const f of info.formats) expect(statSync(pub(`music/${f.file}`)).size / info.seconds, f.file).toBeLessThan(17_500);
      // All five within a decibel of one another and of the target, so a change of region is no jump in loudness; in play, quieter than the menu.
      expect(Math.abs(info.mean - MUSIC_TARGET_MEAN), key).toBeLessThan(1.5);
      expect(musicGain(key as keyof typeof want)).toBeCloseTo((key.endsWith('_menu') ? MUSIC_VOLUME.menu : MUSIC_VOLUME.play) * 10 ** ((MUSIC_TARGET_MEAN - info.mean) / 20), 3);
    }
    // masters/ (the uncut songs) is not shipped.
    expect(existsSync(pub('music/masters'))).toBe(false);
    expect(readdirSync(pub('music')).some((f) => /full|master/i.test(f))).toBe(false);
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
    expect(parseCue('poke')).toEqual({ op: 'play', name: 'poke', delay: 0, semis: 0 });
    expect(parseCue('chomp@0.45')).toEqual({ op: 'play', name: 'chomp', delay: 0.45, semis: 0 });
    expect(parseCue('+steps')).toEqual({ op: 'start', name: 'steps', delay: 0, semis: 0 });
    expect(parseCue('-snore')).toEqual({ op: 'stop', name: 'snore', delay: 0, semis: 0 });
    expect(parseCue('+mosquito@0.15')).toEqual({ op: 'start', name: 'mosquito', delay: 0.15, semis: 0 });
    // Higher or lower by semitones.
    expect(parseCue('squeak^3')).toEqual({ op: 'play', name: 'squeak', delay: 0, semis: 3 });
    expect(parseCue('squeak@0.5^-2')).toEqual({ op: 'play', name: 'squeak', delay: 0.5, semis: -2 });
  });

  it("uses the gag sounds Jay picked where they belong", () => {
    const all = (id: GagId) => Object.values(GAG_SOUNDS[id]).flat().map((c) => parseCue(c).name);
    expect(all('biffyA')).toContain('outhouse');
    expect(all('biffyB')).toContain('outhouse');
    expect(all('gopherLunch')).toEqual(expect.arrayContaining(['chomp', 'burp', 'thwip']));
    expect(all('tourists')).toEqual(expect.arrayContaining(['camera', 'mosquito', 'slap']));
    expect(all('tongue')).toEqual(expect.arrayContaining(['slurp', 'thwip', 'camera', 'twinkle']));
    expect(all('porcupine')).toEqual(expect.arrayContaining(['poke', 'scurry', 'hop']));
    expect(all('deer')).toContain('knock'); // the sign's wooden knock-and-wobble
    expect(all('landowner')).toEqual(expect.arrayContaining(['quad_start', 'quad_idle', 'quad_rev']));
    expect(all('worker')).toEqual(expect.arrayContaining(['steps', 'snore']));
    expect(all('moose')).toContain('moose');
    expect(all('geese')).toContain('geese');
    expect(all('bull')).toEqual(expect.arrayContaining(['bull', 'cow', 'twinkle']));
    expect(all('nearMiss')).toContain('gopher');
    expect(all('magpie')).toContain('wind');
  });
});

describe("the sound pass: Jay's picks, each on its beat, levelled alike", () => {
  const cues = (id: GagId, beat: string) => (GAG_SOUNDS[id][beat] ?? []).map(parseCue);
  const beatAt = (key: string, beat: string) => (WAVE3 as unknown as Record<string, { beats: [number, string, string][] }>)[key].beats.find((b) => b[1] === beat)![0];

  it('the sign rattle replaces the dingle in all six gags (eleven times), and nothing names the old sounds', () => {
    const uses = Object.entries(GAG_SOUNDS).flatMap(([id, beats]) => Object.values(beats).flat().filter((c) => parseCue(c).name === 'knock').map(() => id));
    // (Eleven in the six older gags; Clearwater's Out Cold uses the same knock twice, for the ball's TOK off the rig mats and its PING off the aspen.)
    // (And Baldonnel's: the hat's thud and the two boots' clonks in Overweight, the ice pan's bump in Last Ice.)
    expect(uses.filter((u) => u !== 'cold' && u !== 'overweight' && u !== 'ice').length).toBe(11);
    expect(uses.filter((u) => u === 'overweight' || u === 'ice').length).toBe(4);
    expect([...new Set(uses)].sort()).toEqual(['biffyA', 'biffyB', 'cold', 'deer', 'sam', 'surveyor', 'worker']);
    const names = Object.values(GAG_SOUNDS).flatMap((b) => Object.values(b).flat()).map((c) => parseCue(c).name);
    for (const old of ['rattle', 'win', 'gate', 'exit']) expect(names).not.toContain(old);
  });

  it('every wave 3 gag has sound, and every beat it names is one of the gag\'s own beats', () => {
    for (const [id, key] of [['muskeg', 'muskeg'], ['catTrain', 'catTrain'], ['beaver', 'beaver'], ['aurora', 'aurora'], ['tumbleweed', 'tumbleweed'], ['pdogs', 'pdogs'], ['bale', 'bale'], ['cloud', 'cloud']] as [GagId, string][]) {
      const beats = (WAVE3 as unknown as Record<string, { beats: [number, string, string][] }>)[key].beats.map((b) => b[1]);
      expect(Object.keys(GAG_SOUNDS[id]).length, id).toBeGreaterThanOrEqual(3);
      for (const beat of Object.keys(GAG_SOUNDS[id])) expect(beats, `${id} ${beat}`).toContain(beat);
      // Every loop a gag starts is one it could stop (or the gag's end stops it).
      for (const c of Object.values(GAG_SOUNDS[id]).flat().map(parseCue)) if (c.op !== 'play') expect(Object.keys(GAG_LOOPS), `${id} ${c.name}`).toContain(c.name);
    }
  });

  it('Clearwater: Jay\'s five new sounds, each on the moment the reference draws its sound word; every beat named is the gag\'s own', () => {
    for (const id of ['golf', 'cold', 'wash', 'bell', 'pea'] as GagId[]) {
      const beats = (WAVE3 as unknown as Record<string, { beats: [number, string, string][] }>)[id].beats.map((b) => b[1]);
      for (const beat of Object.keys(GAG_SOUNDS[id])) expect(beats, `${id} ${beat}`).toContain(beat);
      for (const c of Object.values(GAG_SOUNDS[id]).flat().map(parseCue)) if (c.op !== 'play') expect(Object.keys(GAG_LOOPS), `${id} ${c.name}`).toContain(c.name);
    }
    // Three Swings: a whoosh 0.45 s into each miss (the reference's "whoosh" at 3.75 and 5.05), the second higher; BOING 0.55 s into the third (6.45).
    expect(cues('golf', 'swing-one')).toEqual([expect.objectContaining({ name: 'whoosh', delay: 0.45 })]);
    expect(cues('golf', 'swing-two')[0]).toMatchObject({ name: 'whoosh', delay: 0.45 });
    expect(cues('golf', 'swing-two')[0].semis).toBeGreaterThan(0);
    expect(cues('golf', 'swing-three')[0]).toMatchObject({ name: 'boing', delay: 0.55 });
    // Out Cold: CRACK at 3.95; Fresh Wash: the splash on the SPLOOSH; Dinner Bell: the triangle on the first strike.
    expect(cues('cold', 'crack')[0]).toMatchObject({ name: 'crack', delay: 0.55 });
    expect(cues('wash', 'sploosh')[0]).toMatchObject({ name: 'splash', delay: 0 });
    expect(cues('bell', 'ding').some((c) => c.name === 'triangle' && c.delay === 0)).toBe(true);
    // The five are fetched only by a Clearwater level, and levelled like the rest of the sound pass.
    for (const k of ['whoosh', 'boing', 'crack', 'splash', 'triangle'] as const) {
      expect(LAZY_KEYS).toContain(k);
      expect(sfxInfo(k).peak).toBeLessThanOrEqual(-1.4);
      expect(VOLUME[k]).toBeLessThan(VOLUME.bump);
    }
    expect(sfxInfo('triangle').seconds).toBeGreaterThan(1.5);
  });

  it('the BONK lands on each hit, the tail slaps where the tail comes down', () => {
    expect(cues('beaver', 'bonk').find((c) => c.name === 'bonk')!.delay).toBe(0);
    // The second hit is at 3.6 s (the reference's own BONK!), 0.3 s into its beat.
    expect(beatAt('beaver', 'bonk-again') + cues('beaver', 'bonk-again')[0].delay).toBeCloseTo(3.6, 5);
    expect(cues('beaver', 'proud').map((c) => beatAt('beaver', 'proud') + c.delay)).toEqual([9.12, 9.36]);
  });

  it('one squeak a prairie dog, rising along the wave as each pops up; the sad one is the late one', () => {
    const wave = cues('pdogs', 'wave');
    expect(wave.length).toBe(5);
    expect(wave.every((c) => c.name === 'squeak')).toBe(true);
    for (let i = 1; i < wave.length; i++) { expect(wave[i].semis).toBeGreaterThan(wave[i - 1].semis); expect(wave[i].delay - wave[i - 1].delay).toBeGreaterThan(0.1); }
    // Dogs 1 to 4 are up at 2.1, 2.4, 2.7 and 3.0 s: each squeak comes while its dog is rising (the quarter second before).
    wave.slice(1).forEach((c, i) => { const up = 1.8 + 0.3 * (i + 1); expect(1.8 + c.delay).toBeGreaterThanOrEqual(up - 0.25 - 0.001); expect(1.8 + c.delay).toBeLessThanOrEqual(up); });
    expect(cues('pdogs', 'late').map((c) => c.name)).toEqual(['aww']);
    expect(cues('pdogs', 'missed-cue')).toEqual([]);
  });

  it('the howl cracks on the squeak beat; the downpour comes when the umbrella is closed; the rain stops under it', () => {
    // The howl (1.5 s) breaks 70% of the way through: 1.05 s after it starts, and "squeak" is 1.1 s after "howls".
    expect(sfxInfo('howl').seconds * 0.7).toBeCloseTo(beatAt('aurora', 'squeak') - beatAt('aurora', 'howls'), 0);
    expect(cues('cloud', 'downpour')).toEqual([{ op: 'start', name: 'downpour', delay: 0, semis: 0 }]);
    expect(beatAt('cloud', 'downpour')).toBeGreaterThan(beatAt('cloud', 'closes-it'));
    expect(cues('cloud', 'umbrella').map((c) => `${c.op} ${c.name}`)).toEqual(['play umbrella', 'stop rain']);
    expect(cues('cloud', 'opens-again').map((c) => `${c.op} ${c.name}`)).toEqual(['stop downpour', 'play umbrella', 'start rain']);
    expect(cues('muskeg', 'shluck')).toEqual([{ op: 'play', name: 'shluck', delay: 0, semis: 0 }]);
    expect(cues('muskeg', 'blup').map((c) => c.name)).toContain('blup');
    expect(cues('bale', 'sigh')[0].name).toBe('sigh');
    expect(cues('catTrain', 'yawn')[0].name).toBe('yawn');
  });

  it('levelled alike: every new file sits at the mix\'s own level, none hot, and gag sounds sit under the truck and the win', () => {
    const fresh: SfxKey[] = ['knock', 'tada', 'clack', ...LAZY_KEYS];
    for (const k of fresh) {
      const i = sfxInfo(k);
      // Brought to about -19 dB average (less where its peak would have passed -1.5 dB), never clipping.
      expect(i.mean, k).toBeLessThanOrEqual(TARGET_MEAN + 0.6);
      expect(i.mean, k).toBeGreaterThan(TARGET_MEAN - 7);
      expect(i.peak, k).toBeLessThanOrEqual(-1.4);
      // So the mix has little left to correct.
      expect(gainFor(k) / VOLUME[k], k).toBeLessThan(MAX_TRIM + 0.001);
      expect(gainFor(k) / VOLUME[k], k).toBeGreaterThan(0.9);
    }
    const loud = Math.min(gainFor('bump'), gainFor('tada'));
    for (const k of [...LAZY_KEYS, 'knock'] as SfxKey[]) { expect(VOLUME[k], k).toBeLessThan(Math.min(VOLUME.bump, VOLUME.tada)); expect(gainFor(k) * 10 ** (sfxInfo(k).peak / 20), k).toBeLessThan(0.75); }
    expect(loud).toBeGreaterThan(0.5);
    // What runs on lies lowest.
    for (const bed of ['rain', 'rumble', 'rustle', 'shimmer', 'whistle', 'pats'] as SfxKey[]) expect(VOLUME[bed], bed).toBeLessThan(0.4);
    expect(VOLUME.tada).toBe(0.8);
    expect(sfxInfo('tada').seconds).toBeLessThan(1.5);
  });
});

describe("Baldonnel's sightings and the finale (job U10)", () => {
  const cues = (table: Record<string, string[]>, beat: string) => (table[beat] ?? []).map(parseCue);
  it("Jay's nine picks are in the pack exactly as delivered: the same bytes, never re-cut or re-levelled", () => {
    for (const k of NINE) {
      const built = readFileSync(pub(`sfx/${k}.mp3`)), source = readFileSync(new URL(`../../tools/sfx-art/${k}.mp3`, import.meta.url));
      expect(built.equals(source), k).toBe(true);
      expect(LAZY_KEYS, k).toContain(k);
      expect(sfxInfo(k).peak, k).toBeLessThanOrEqual(-1.4);
      expect(CREDITS.find((c) => c.use === k), k).toMatchObject({ kind: 'sfx', licence: 'Pixabay Content License' });
    }
    // The takes Jay picked (they override the handoff's own column): crane_call B, bison_snort A, chuckle B, scrub B; the rest as named.
    const take = (k: string) => CREDITS.find((c) => c.use === k)!.file.match(/_([AB])\.mp3$/)![1];
    expect(Object.fromEntries(NINE.map((k) => [k, take(k)]))).toEqual({ crane_call: 'B', frog_chorus: 'A', frog_late: 'B', bison_snort: 'A', chuckle: 'B', timer_beep: 'A', scrub: 'B', creak: 'A', polaroid: 'A' });
    expect(sfxInfo('scrub').loop).toBe(true);
  });
  it('every one of the seven has sound; every beat named is the gag\'s own, every sound is in the pack, every loop is known and stopped or left to the end', () => {
    for (const id of BALD_IDS) {
      const beats = (BALD as unknown as Record<string, { beats: [number, string, string][] }>)[id].beats.map((b) => b[1]);
      expect(Object.keys(GAG_SOUNDS[id]).length, id).toBeGreaterThan(2);
      for (const beat of Object.keys(GAG_SOUNDS[id])) expect(beats, `${id} ${beat}`).toContain(beat);
      for (const c of Object.values(GAG_SOUNDS[id]).flat().map(parseCue)) {
        if (c.op === 'play') expect(SFX_KEYS, `${id} ${c.name}`).toContain(c.name);
        else expect(Object.keys(GAG_LOOPS), `${id} ${c.name}`).toContain(c.name);
      }
    }
  });
  it('the new files where they fit, on the moment the page draws the sound word', () => {
    // Two Left Feet: "garooo" at 0.1 s, "garoo" at 2.7 s.
    expect(cues(GAG_SOUNDS.cranes, 'a-rattling-call')).toEqual([expect.objectContaining({ name: 'crane_call', delay: 0.1 })]);
    expect(cues(GAG_SOUNDS.cranes, 'the-dance-leaps')[0].name).toBe('crane_call');
    // Late Croak: the chorus for the round (1.8 s; over before the silence at 4.9), the one late CREEK at 7.6.
    expect(cues(GAG_SOUNDS.frogs, 'they-sing-in')[0]).toMatchObject({ name: 'frog_chorus', delay: 0 });
    expect(1.8 + sfxInfo('frog_chorus').seconds).toBeLessThan(4.9);
    expect(cues(GAG_SOUNDS.frogs, 'the-little-one').map((c) => c.name)).toContain('frog_late');
    // Right of Way: BEEP BEEP is the horn twice, the snort, the backup beeper, "heh heh heh" the chuckle.
    expect(cues(GAG_SOUNDS.bison, 'beep-beep').map((c) => c.name)).toEqual(['horn', 'horn']);
    expect(cues(GAG_SOUNDS.bison, 'the-bison-yawns')[0].name).toBe('bison_snort');
    expect(cues(GAG_SOUNDS.bison, 'backs-up-the')[0].name).toBe('reverse');
    expect(cues(GAG_SOUNDS.bison, 'and-giggles-heh')[0].name).toBe('chuckle');
    // The pack's own: the magpie on the scale, SPLASH and CHOMP on the ice, the mosquito's BZZZ.
    expect(gagKeys('overweight')).toEqual(expect.arrayContaining(['clack', 'knock', 'twinkle', 'magpie', 'step']));
    expect(gagKeys('ice')).toEqual(expect.arrayContaining(['splash', 'chomp', 'knock']));
    expect(cues(GAG_SOUNDS.mosquito, 'bzzz-a-big')[0]).toMatchObject({ op: 'start', name: 'mosquito' });
    expect(gagKeys('hare')).toEqual(expect.arrayContaining(['rustle', 'step']));
  });
  it("the finale: every beat named is its part's own; the beeps slow then fast where the page draws them; splat with the flash; the scrub starts and stops", () => {
    for (const [part, table] of Object.entries(FINALE_SOUNDS)) {
      const beats = FINALE_BEATS[part as keyof typeof FINALE_BEATS].map((b) => b[1]);
      for (const beat of Object.keys(table)) expect(beats, `${part} ${beat}`).toContain(beat);
    }
    const at = (part: 'photo' | 'still' | 'card', beat: string) => FINALE_BEATS[part].find((b) => b[1] === beat)![0];
    // The card's usual win sounds: a pop a hard hat as it pops in, each higher, then the ta-da.
    expect(cues(FINALE_SOUNDS.card, 'the-last-truck').map((c) => [c.name, c.delay])).toEqual([['tap', 0.9], ['tap', 1.15], ['tap', 1.4], ['tada', 1.7]]);
    // Slow: every 0.6 s from 1.65 s to the fast ones at 5.0 s; fast: every 0.18 s until the snap at 5.86 s.
    const slow = cues(FINALE_SOUNDS.photo, 'he-sets-the').map((c) => +(at('photo', 'he-sets-the') + c.delay).toFixed(2));
    const fast = cues(FINALE_SOUNDS.photo, 'beepbeepbeepbeep').map((c) => +(at('photo', 'beepbeepbeepbeep') + c.delay).toFixed(2));
    expect(slow).toEqual([1.65, 2.25, 2.85, 3.45, 4.05, 4.65]);
    expect(fast).toEqual([5, 5.18, 5.36, 5.54, 5.72]);
    expect(Math.max(...fast)).toBeLessThan(at('photo', 'splat-flash-at'));
    expect(cues(FINALE_SOUNDS.photo, 'splat-flash-at').map((c) => c.name).sort()).toEqual(['camera', 'splat']);
    expect(cues(FINALE_SOUNDS.photo, 'the-photo-drops')[0].name).toBe('polaroid');
    expect(cues(FINALE_SOUNDS.photo, 'heh-heh-the')[0].name).toBe('chuckle');
    // Still Here: the creak as the door opens and as it shuts; every start of the scrub has its stop.
    expect(cues(FINALE_SOUNDS.still, 'creeeak-the-door')[0].name).toBe('creak');
    expect(cues(FINALE_SOUNDS.still, 'creeeak-the-door-2')[0].name).toBe('creak');
    const scrub = Object.values(FINALE_SOUNDS.still).flat().map(parseCue).filter((c) => c.name === 'scrub').map((c) => c.op);
    expect(scrub).toEqual(['start', 'stop', 'start', 'stop']);
    expect(Object.keys(FINALE_SOUNDS.credits)).toEqual([]);
    expect(finaleKeys().sort()).toEqual(['camera', 'chuckle', 'creak', 'polaroid', 'scrub', 'splat', 'tada', 'tap', 'timer_beep']);
  });
});

describe('credits', () => {
  it('every file in the game has a row, from the packs\' own CREDITS', () => {
    expect(CREDITS.filter((c) => c.kind === 'sfx').length).toBe(74);
    expect(musicCredits().map((c) => c.title)).toEqual(['Fun On The Farm', 'Tap Room Rag', '50 Over The Speed Limit', 'BITSTREAM DREAMS', 'Chill Beat', 'Chillhop mix', 'Stylish Upbeat Rock', 'Keep It Moving (This Classic Rock)', 'Energy Action Sport Rock', 'Groove Rock and Roll', 'Vintage Rock']);
    for (const c of CREDITS.filter((x) => x.use.startsWith('classic_'))) expect(c).toMatchObject({ kind: 'music', licence: 'Pixabay Content License', file: `music/${c.use}.opus` });
    for (const c of CREDITS) {
      expect(c.author, c.file).toBeTruthy();
      expect(c.licence, c.file).toBeTruthy();
    }
    const groups = sfxCredits();
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(74);
    // (The outhouse door, the pumpjack, and the seventeen synthesized picks of the sound pass, and the buttons' click.)
    expect(groups.find((g) => g.author === 'Synthesized for Rig Jam')?.count).toBe(25);
    // Nothing picked needs an attribution licence (no CC BY track): Pixabay, Mixkit, CC0 and our own.
    for (const c of CREDITS) expect(c.licence, c.file).toMatch(/Pixabay|Mixkit|CC0|Original/);
  });
});
