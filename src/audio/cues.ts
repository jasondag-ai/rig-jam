// When the game's musical cues fire. Pure, so it can be tested without any audio.

/** Exits closer together than this count as back-to-back. */
export const CHAIN_MS = 3500;

/**
 * Back-to-back exits: returns the new chain length. 0 = a lone exit; 1 = second exit in a row
 * (the horn chord starts); each further quick exit raises the chord.
 */
export function nextChain(lastExitAt: number | null, now: number, chain: number): number {
  return lastExitAt !== null && now - lastExitAt <= CHAIN_MS ? chain + 1 : 0;
}

/** Semitones the horn chord is raised for a chain: two per exit, so it climbs. */
export const chordLift = (chain: number) => Math.min(12, (chain - 1) * 2);

/** The win jingle: a ditty at par, the sad trombone at par +4 or worse, nothing in between. */
export function winCue(moves: number, par: number): 'ditty' | 'trombone' | null {
  if (moves <= par) return 'ditty';
  if (moves >= par + 4) return 'trombone';
  return null;
}

/** Ground underfoot makes a sound every this many cells of travel (mud squelch, snow crunch). */
export const STEP_CELLS = 0.7;
