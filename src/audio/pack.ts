// The sound pack: Jay's picked cartoon sounds and music (public/audio, built by tools/audio-pack.py,
// which also writes pack.json: each file's length and measured loudness) and THE MIX: one volume
// per sound, so nothing jumps out. Pure (tested); engine.ts plays them.
import pack from './pack.json' with { type: 'json' };

export type SfxKey = keyof typeof pack.sfx;
export const SFX_KEYS = Object.keys(pack.sfx) as SfxKey[];
export const sfxInfo = (key: SfxKey): { seconds: number; mean: number; peak: number; loop: boolean } => pack.sfx[key];

/**
 * THE MIX TABLE: how loud each sound should SEEM, 0 to 1, against the others. (The files differ in
 * loudness; `gainFor` evens that out first, from each file's measured level, so these numbers are
 * about the sound's place in the game, not about the file.) The player's own actions sit on top;
 * engines and loops sit low; gag sounds are a notch under the game's own.
 */
export const VOLUME: Record<SfxKey, number> = {
  // The player's truck
  drag: 0.45, motor: 0.22, reverse: 0.3, bump: 0.8, clack: 0.55, horn: 0.5, radio: 0.3,
  // Results and menus
  tada: 0.8, lose: 0.7, streak: 0.7, tap: 0.4, back: 0.4,
  // People and engines in the gags
  step: 0.3, quad_start: 0.4, quad_idle: 0.3, quad_rev: 0.36, snore: 0.5, cord: 0.5,
  // Animals
  magpie: 0.55, geese: 0.55, moose: 0.7, gopher: 0.5, cow: 0.6, bull: 0.6, mosquito: 0.32,
  // Things
  outhouse: 0.6, pumpjack: 0.16, camera: 0.5, wind: 0.5, knock: 0.5,
  // Cartoon effects
  splat: 0.7, chomp: 0.55, burp: 0.6, slap: 0.7, poke: 0.55, thwip: 0.6, slurp: 0.6, puff: 0.45, twinkle: 0.45, scurry: 0.5, hop: 0.5,
  // Gag wave 3 (the sound pass, Jay's picks). Their files are levelled alike (audio-pack.py), so
  // these are their places only: one-shots a notch under the truck's bump and the win; anything
  // that runs on (rain, rumble, rustle, the lights) lower still, so it lies under the action.
  squelch: 0.3, shluck: 0.4, blup: 0.45, mew: 0.42, yawn: 0.42, pats: 0.34, bonk: 0.6, tailslap: 0.55, shimmer: 0.28, howl: 0.5,
  rustle: 0.32, whistle: 0.3, squeak: 0.42, aww: 0.45, rumble: 0.36, sigh: 0.36, rain: 0.26, umbrella: 0.5, downpour: 0.42,
};
/**
 * LAZY: the sounds only gag wave 3 uses (Mannville and Bakken). They are NOT fetched with the
 * rest when Sound effects is switched on: a level fetches the ones its own gags can play as it
 * opens (`sound.warm`), and any other is fetched the first time it is asked for.
 */
export const LAZY_KEYS: SfxKey[] = ['squelch', 'shluck', 'blup', 'mew', 'yawn', 'pats', 'bonk', 'tailslap', 'shimmer', 'howl', 'rustle', 'whistle', 'squeak', 'aww', 'rumble', 'sigh', 'rain', 'umbrella', 'downpour'];
/** Fetched as soon as Sound effects is on: everything else. */
export const CORE_KEYS: SfxKey[] = SFX_KEYS.filter((k) => !LAZY_KEYS.includes(k));
/** Every file is first brought to about this average level (dB), then given its place from VOLUME. */
export const TARGET_MEAN = -19;
/** How far a file's own level may be corrected, either way (a very short click's average says little). */
export const MAX_TRIM = 2.2;

const db = (x: number) => 10 ** (x / 20);
/** The gain a sound is played at: its file evened out to the target level, times its place in the mix. Never above 1. */
export function gainFor(key: SfxKey): number {
  const trim = Math.max(1 / MAX_TRIM, Math.min(MAX_TRIM, db(TARGET_MEAN - pack.sfx[key].mean)));
  return Math.min(1, VOLUME[key] * trim);
}

// ---------- Music ----------

export type MusicStyle = 'country' | 'retro' | 'chill';
export const MUSIC_STYLES: { id: MusicStyle; name: string }[] = [
  { id: 'country', name: 'Country' },
  { id: 'retro', name: '80s Retro' },
  { id: 'chill', name: 'Chill' },
];
/** Where the player is: the menus (cover, level list, log) or a level. Each style has a loop for each. */
export type Scene = 'menu' | 'play';
export type MusicKey = keyof typeof pack.music;
export const musicKey = (style: MusicStyle, scene: Scene): MusicKey => `${style}_${scene}` as MusicKey;
export const musicInfo = (key: MusicKey): { seconds: number; mean: number; formats: { file: string; type: string }[]; crossfaded: boolean } => pack.music[key];

/**
 * Music sits WELL UNDER the effects, and the in-play loop is quieter than the menu loop (it plays
 * under thinking). These are the music's levels against an effect at full volume.
 */
export const MUSIC_VOLUME: Record<Scene, number> = { menu: 0.3, play: 0.17 };
/** Every loop is first brought to about this average level (dB). */
export const MUSIC_TARGET_MEAN = -18.5;
export function musicGain(key: MusicKey): number {
  const scene = key.endsWith('_menu') ? 'menu' : 'play';
  return MUSIC_VOLUME[scene] * Math.max(0.6, Math.min(1.6, db(MUSIC_TARGET_MEAN - pack.music[key].mean)));
}
/** Changing loops (menu to level, one style to another): the old one fades out and the new one in over this long (s). */
export const MUSIC_FADE = 0.7;

/**
 * Where a decoded loop really starts and ends. An MP3 carries a little silence at its head and tail
 * (encoder padding) that some decoders leave in: looping over it would click or gap. This finds the
 * run of true silence at each end (no more than `maxSeconds` of it) so the loop can skip it.
 */
export function loopPoints(samples: ArrayLike<number>, sampleRate: number, maxSeconds = 0.08, floor = 0.0008): { start: number; end: number } {
  const max = Math.floor(maxSeconds * sampleRate);
  let a = 0;
  while (a < max && a < samples.length && Math.abs(samples[a]) <= floor) a++;
  let b = samples.length;
  while (samples.length - b < max && b > a && Math.abs(samples[b - 1]) <= floor) b--;
  return { start: a / sampleRate, end: b / sampleRate };
}

/** The first format in a loop's list that this browser says it can play (`canPlay`: an audio element's canPlayType). */
export function pickFormat(formats: readonly { file: string; type: string }[], canPlay: (type: string) => string): { file: string; type: string }[] {
  const ok = formats.filter((f) => canPlay(f.type) !== '');
  // Tried in order; the MP3 last, as the fallback when a gapless format will not decode after all.
  return ok.length ? ok : [...formats].reverse();
}
