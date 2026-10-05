// EVERY GAG TRIGGER IN ONE PLACE, so they can be tuned after playing (GAME_BIBLE, Oct 4). Gags are
// Easter eggs: each is set off by something the player does. These are placeholders until Jay has
// played them. Times are in milliseconds. `?idle=0.1` makes the idle times 10x shorter (tests).
export const GAG_TRIGGERS = {
  /** Gag 1, the magpie: this long with no moves. Any region. */
  magpie: { idleMs: 10_000 },
  /** Gag 2, the sleepy worker: this long with no moves (after the magpie has had his turn). Any region. */
  worker: { idleMs: 20_000 },
  /** Gag 3, the moose: this many bumps of a truck up into the TOP berm in one level. */
  moose: { region: 'duvernay', topBermBumps: 2 },
  /** Gag 4, Near Miss (gopher and hotshot): two trucks driven out within this long of each other. */
  nearMiss: { region: 'cardium', backToBackMs: 3500 },
  /** Gag 5, the landowner: the SAME truck moved this many times in a row, reversing each time. Any region. */
  landowner: { backAndForth: 4 },
  /** Gag 6, Biffy A ("Occupied"): one bump of a truck down into the BOTTOM berm (the biffy's side). Any region. */
  biffyA: { bottomBermBumps: 1 },
  /**
   * Gag 7, Biffy B ("The runaway roll"): a double bump: two bumps into the bottom berm within this
   * long. (After one bump the game waits this long to see if a second is coming before playing A.)
   */
  biffyB: { bottomBermBumps: 2, withinMs: 1400 },
} as const;

export type GagId = 'magpie' | 'worker' | 'moose' | 'nearMiss' | 'landowner' | 'biffyA' | 'biffyB';

/** A bump of a truck up into the top berm, or down into the bottom one (not into a truck or equipment). */
export const bermBump = (orient: 'h' | 'v', direction: 1 | -1, hit: string): 'top' | 'bottom' | null =>
  orient === 'v' && (hit === 'wall' || hit === 'convoy') ? (direction === -1 ? 'top' : 'bottom') : null;

/** Counts the landowner's trigger: the same truck moved again and again, reversing each time. */
export class BackAndForth {
  private id = '';
  private dir = 0;
  private count = 0;

  /** A move was made. Returns how many times in a row this truck has now gone back and forth. */
  moved(truckId: string, delta: number): number {
    const dir = Math.sign(delta);
    if (truckId === this.id && dir === -this.dir) this.count++;
    else this.count = 1;
    this.id = truckId;
    this.dir = dir;
    return this.count;
  }

  reset(): void {
    this.id = '';
    this.dir = 0;
    this.count = 0;
  }
}
