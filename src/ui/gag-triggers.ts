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
  /** Gag 8, the marshmallow: this many taps on a flare stack in one level. Levels with a flare. */
  marshmallow: { flareTaps: 3 },
  /** Gag 9, the geese and the lost goose: Undo pressed this many times in a row (a move in between starts the count again). Any region. */
  geese: { undosInARow: 3 },
  /**
   * Gag 10, the bear and the hare (LEGENDARY): a perfect solve (at par) on one of these levels of
   * the region, with this chance. It plays before the win card. Demo mode: every time.
   */
  bear: { region: 'duvernay', levels: [8, 9, 10], perfectSolve: true, chance: 1 / 3 },
  /** Gag 11, the bull and the cow: this many taps on the cow grazing in the bottom strip. */
  bull: { region: 'montney', cowTaps: 1 },
  /**
   * Gag 12, the porcupine (Cardium, at the bush): its trigger is TBD until Jay has played it, so in
   * the game nothing sets it off yet. In DEMO MODE only, a tap on the bush plays it.
   */
  porcupine: { region: 'cardium', trigger: 'TBD', demoTapBush: true },
  /** Gag 13, gopher lunch (Cardium, at the gopher mound): this long with no moves (after the magpie and the worker have had their turns). */
  gopherLunch: { region: 'cardium', idleMs: 30_000 },
  /** Not a gag: on a night level, this long with no move and a truck says "While we're young, Sonny...". Once per level. */
  nightNudge: { idleMs: 25_000 },
} as const;

/**
 * RULES FOR EVERY GAG: one at a time; none while a truck is being dragged or moving, or once the
 * level is won; and after one ends, none starts for `cooldownMs`. A trigger that fires while a gag
 * is on or during the cooldown is ignored (the player can set it off again later). Demo mode and
 * `?gag=` previews have no cooldown; `?cooldown=0.1` scales it (tests).
 */
export const GAG_RULES = { cooldownMs: 60_000 } as const;

export type GagId = 'magpie' | 'worker' | 'moose' | 'nearMiss' | 'landowner' | 'biffyA' | 'biffyB' | 'marshmallow' | 'geese' | 'bear' | 'bull' | 'porcupine' | 'gopherLunch';

/** Is this one of the bear's levels (`level` counts from 1)? */
export const bearLevel = (regionId: string, level: number): boolean => regionId === GAG_TRIGGERS.bear.region && (GAG_TRIGGERS.bear.levels as readonly number[]).includes(level);
/** Does the bear come after this win? */
export const bearComesNow = (moves: number, par: number, demo: boolean, random: () => number = Math.random): boolean =>
  (!GAG_TRIGGERS.bear.perfectSolve || moves <= par) && (demo || random() < GAG_TRIGGERS.bear.chance);

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
