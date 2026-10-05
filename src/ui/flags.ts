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
