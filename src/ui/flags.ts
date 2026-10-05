// Build switches. One place, so turning a whole feature off (and back on) is a one-line change.

/**
 * Every gag and reaction: magpie, spotter, biffy, landowner, bear, moose, gopher, hot shot, geese,
 * pumper, block heater cords, plus the Wildlife Log button and its toasts. Off while the
 * fundamentals are rebuilt (GAME_BIBLE 9b); the code and any saved log stay untouched.
 */
export const GAGS_ON = false;

/** `?gags=1` turns them on for one page load (previews and the gag/log e2e tests). */
export const gagsOn = (search: string = location.search): boolean => GAGS_ON || new URLSearchParams(search).get('gags') === '1';

/**
 * Gags come back one at a time (GAME_BIBLE 9b). The magpie (magpie.ts: the toy puppet on a truck
 * roof after 10 s with no moves) is on by itself, whatever GAGS_ON says. `?magpie=0` turns it off
 * for one page load (tests of other things that must not be interrupted).
 */
export const MAGPIE_ON = true;
export const magpieOn = (search: string = location.search): boolean => MAGPIE_ON && new URLSearchParams(search).get('magpie') !== '0';

/** Gag 2, the sleepy worker (worker.ts: 20 s with no moves), and gag 3, the moose (moose.ts: Duvernay, two bumps into the top berm). `?worker=0` / `?moose=0` turn one off for a page load. */
export const WORKER_ON = true;
export const MOOSE_ON = true;
export const workerOn = (search: string = location.search): boolean => WORKER_ON && new URLSearchParams(search).get('worker') !== '0';
/** `?cooldown=0` (or any number): scales the cooldown between gags (tests). */
export const cooldownScale = (search: string = location.search): number => {
  const v = new URLSearchParams(search).get('cooldown');
  const n = v === null ? 1 : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 1;
};
/** `?off=lunch,porcupine`: gags left out for one page load (tests), by their `?gag=` names. */
export const eggOff = (name: string, search: string = location.search): boolean => (new URLSearchParams(search).get('off') ?? '').split(',').includes(name);
/** `?bear=1`: the bear comes on every perfect solve of his levels (tests). */
export const bearAlways = (search: string = location.search): boolean => new URLSearchParams(search).get('bear') === '1';
export const mooseOn = (search: string = location.search): boolean => MOOSE_ON && new URLSearchParams(search).get('moose') !== '0';
