import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CREDITS, musicCredits, sfxCredits } from './credits.ts';
import { GAG_LOOPS, GAG_SOUNDS, gagKeys, parseCue } from './gag-sounds.ts';
import { WAVE3 } from '../ui/wave3.ts';
import { CORE_KEYS, LAZY_KEYS, MAX_TRIM, MUSIC_STYLES, MUSIC_VOLUME, SFX_KEYS, TARGET_MEAN, VOLUME, gainFor, loopPoints, musicGain, musicInfo, musicKey, pickFormat, sfxInfo, type SfxKey } from './pack.ts';
import { GAG_TRIGGERS, type GagId } from '../ui/gag-triggers.ts';

const pub = (f: string) => new URL(`../../public/audio/${f}`, import.meta.url);

describe("the sound pack: Jay's picks, as files", () => {
  it('has one file for every cue, and nothing in public/audio that is not used', () => {
    expect(SFX_KEYS.length).toBe(65);
    // The old dingle, the old win and the old gate (with its whoosh) are gone, files and all.
    for (const old of ['rattle', 'win', 'gate', 'exit']) { expect(SFX_KEYS).not.toContain(old); expect(existsSync(pub(`sfx/${old}.mp3`)), old).toBe(false); }
    for (const key of SFX_KEYS) expect(existsSync(pub(`sfx/${key}.mp3`)), key).toBe(true);
    expect(readdirSync(pub('sfx')).sort()).toEqual(SFX_KEYS.map((k) => `${k}.mp3`).sort());
    const music = MUSIC_STYLES.flatMap((s) => (['menu', 'play'] as const).flatMap((scene) => musicInfo(musicKey(s.id, scene)).formats.map((f) => f.file)));
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
    expect(SFX_KEYS.filter((k) => sfxInfo(k).loop).sort()).toEqual(['mosquito', 'motor', 'quad_idle', 'quad_rev']);
  });

  it('the effects stay small: what loads when Sound effects is turned on, and what each wave 3 level adds', () => {
    const size = (keys: readonly SfxKey[]) => keys.reduce((n, k) => n + statSync(pub(`sfx/${k}.mp3`)).size, 0);
    expect(size(CORE_KEYS)).toBeLessThan(1_000_000);
    // (Never all at once: a level fetches only what its own gags use. Wave 3's nineteen, and Clearwater's five.)
    const clearwater: SfxKey[] = ['whoosh', 'boing', 'crack', 'splash', 'triangle'];
    expect(size(LAZY_KEYS.filter((k) => !clearwater.includes(k)))).toBeLessThan(400_000);
    expect(size(clearwater)).toBeLessThan(90_000);
  });

  it('LAZY: the sounds only gag wave 3 uses are not fetched with the rest; a level fetches its own gags\' sounds', () => {
    expect([...CORE_KEYS, ...LAZY_KEYS].sort()).toEqual([...SFX_KEYS].sort());
    expect(CORE_KEYS).toEqual(expect.arrayContaining(['knock', 'tada', 'clack', 'bump', 'tap', 'step', 'sigh'].filter((k) => k !== 'sigh')));
    // (And Clearwater's five, which bring five sounds of their own.)
    const wave3: GagId[] = ['muskeg', 'catTrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'golf', 'cold', 'wash', 'bell', 'pea'];
    const older = (Object.keys(GAG_SOUNDS) as GagId[]).filter((g) => !wave3.includes(g));
    // No older gag and no game cue needs a lazy sound; every lazy sound is used by a wave 3 gag.
    for (const g of older) for (const k of gagKeys(g)) expect(LAZY_KEYS, `${g} ${k}`).not.toContain(k);
    expect([...new Set(wave3.flatMap(gagKeys).filter((k) => LAZY_KEYS.includes(k)))].sort()).toEqual([...LAZY_KEYS].sort());
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
    // (Eleven in the six older gags; Clearwater's Out Cold uses the same knock once, for the ball's TOK off the rig mats.)
    expect(uses.filter((u) => u !== 'cold').length).toBe(11);
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

describe('credits', () => {
  it('every file in the game has a row, from the packs\' own CREDITS', () => {
    expect(CREDITS.filter((c) => c.kind === 'sfx').length).toBe(65);
    expect(musicCredits().map((c) => c.title)).toEqual(['Fun On The Farm', 'Tap Room Rag', '50 Over The Speed Limit', 'BITSTREAM DREAMS', 'Chill Beat', 'Chillhop mix']);
    for (const c of CREDITS) {
      expect(c.author, c.file).toBeTruthy();
      expect(c.licence, c.file).toBeTruthy();
    }
    const groups = sfxCredits();
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(65);
    // (The outhouse door, the pumpjack, and the seventeen synthesized picks of the sound pass, and the buttons' click.)
    expect(groups.find((g) => g.author === 'Synthesized for Rush Hour Rigs')?.count).toBe(25);
    // Nothing picked needs an attribution licence (no CC BY track): Pixabay, Mixkit, CC0 and our own.
    for (const c of CREDITS) expect(c.licence, c.file).toMatch(/Pixabay|Mixkit|CC0|Original/);
  });
});
