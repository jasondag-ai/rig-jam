// Build switches. One place, so turning a whole feature off (and back on) is a one-line change.

/**
 * Every gag is a code puppet (GAME_BIBLE 9b); the old sprite gag layer is gone. The magpie
 * (magpie.ts) has its own switch: `?magpie=0` turns it off for one page load (tests of other
 * things that must not be interrupted).
 */
export const MAGPIE_ON = true;
export const magpieOn = (search: string = location.search): boolean => MAGPIE_ON && new URLSearchParams(search).get('magpie') !== '0';

/** Gag 2, the sleepy worker (worker.ts: 20 s with no moves), and gag 3, the moose (moose.ts: Duvernay, two bumps into the top berm). `?worker=0` / `?moose=0` turn one off for a page load. */
export const WORKER_ON = true;
export const MOOSE_ON = true;
export const workerOn = (search: string = location.search): boolean => WORKER_ON && new URLSearchParams(search).get('worker') !== '0';
/** `?off=lunch,porcupine`: gags left out for one page load (tests), by their `?gag=` names. */
export const eggOff = (name: string, search: string = location.search): boolean => (new URLSearchParams(search).get('off') ?? '').split(',').includes(name);
/** `?gagtest=1`: no gag starts by itself; `window.__rhrGag` can hold any strip gag at a time of its run (the first-and-last-frame test). */
export const gagTest = (search: string = location.search): boolean => new URLSearchParams(search).get('gagtest') === '1';
/** `?bear=1`: the bear comes every time his bush has been tapped enough (tests). */
export const bearAlways = (search: string = location.search): boolean => new URLSearchParams(search).get('bear') === '1';
/** `?lunch=1`: a press of Hint always brings gopher lunch; `?lunch=0`: never (tests). */
export const lunchAlways = (search: string = location.search): boolean => new URLSearchParams(search).get('lunch') === '1';
export const lunchNever = (search: string = location.search): boolean => new URLSearchParams(search).get('lunch') === '0';
/** `?surveyor=1`, `?tourists=1`, `?bird=1` (the magpie), `?nap=1` (the sleepy worker): that roll always wins; `=0`: never (tests). Null: roll the dice. */
export const rollPinned = (name: string, search: string = location.search): boolean | null => {
  const v = new URLSearchParams(search).get(name);
  return v === '1' ? true : v === '0' ? false : null;
};
/** `?bear=0`: he never comes (tests of the bush's shake). */
export const bearNever = (search: string = location.search): boolean => new URLSearchParams(search).get('bear') === '0';
export const mooseOn = (search: string = location.search): boolean => MOOSE_ON && new URLSearchParams(search).get('moose') !== '0';
