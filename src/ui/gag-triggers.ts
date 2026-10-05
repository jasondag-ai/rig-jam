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
  /**
   * Gag 5, the landowner (any region). Either: the SAME truck moved this many times in a row,
   * reversing each time (`backAndForth`); or a fast wiggle: this many direction reversals of one
   * truck within ONE drag (the finger never lifted), all inside `withinMs`.
   */
  landowner: { backAndForth: 4, wiggle: { reversals: 4, withinMs: 2000 } },
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
   * Gag 10, the bear and the hare (LEGENDARY): tap the bear's snowy bush this many times, on any
   * level of the region. Each time the count is reached there is this chance that he comes;
   * otherwise the bush shakes and drops a puff of snow, and the count starts again. Demo mode: every time.
   */
  bear: { region: 'duvernay', bushTaps: 3, chance: 1 / 3 },
  /** Gag 11, the bull and the cow: this many taps on the cow grazing in the bottom strip. */
  bull: { region: 'montney', cowTaps: 1 },
  /**
   * Gag 12, the porcupine (Cardium, at the bush): its trigger is TBD until Jay has played it, so in
   * the game nothing sets it off yet. In DEMO MODE only, a tap on the bush plays it.
   */
  porcupine: { region: 'cardium', trigger: 'TBD', demoTapBush: true },
  /** Gag 13, gopher lunch (Cardium, at the gopher mound): this long with no moves (after the magpie and the worker have had their turns). */
  gopherLunch: { region: 'cardium', idleMs: 30_000 },
  /**
   * Gag 14, Safety Sam (any region): this many blocked moves (bumps) in a row with no move made in
   * between, OR one push at a wrong-colour gate. Once per level.
   */
  sam: { bumpsInARow: 3, wrongGate: true },
  /** Gag 15, the frozen tongue (winter levels, at the frosty riser): this long with no moves (after the magpie and the worker). */
  tongue: { theme: 'winter', idleMs: 30_000 },
  /**
   * Not a gag. NIGHT: no level starts at night. On any level, after `idleMs` with no moves the
   * lease fades to night over `fadeInMs`; the next move brings the day back over `fadeOutMs`.
   */
  night: { idleMs: 30_000, fadeInMs: 4000, fadeOutMs: 2000 },
  /** Not a gag: this long after night has fully fallen, a truck says "While we're young, Sonny...". Once per level. */
  nightNudge: { afterNightMs: 15_000 },
} as const;

/**
 * RULES FOR EVERY GAG (GAME_BIBLE, Oct 5): gags run AT THE SAME TIME. When a trigger fires its gag
 * plays right away, even if another is playing; it waits only if it shares a character or a prop
 * with one that is on (`SHARES`), and then it plays as soon as that one has left. None starts once
 * the level is won. The gags that come by themselves when the player sits idle (the magpie, the
 * sleepy worker, gopher lunch, the frozen tongue) still come one at a time, with `idleCooldownMs`
 * between them, so an idle lease is not a parade. Demo mode and `?gag=` previews have no cooldown;
 * `?cooldown=0.1` scales it (tests).
 */
export const GAG_RULES = { idleCooldownMs: 60_000 } as const;

export type GagId = 'magpie' | 'worker' | 'moose' | 'nearMiss' | 'landowner' | 'biffyA' | 'biffyB' | 'marshmallow' | 'geese' | 'bear' | 'bull' | 'porcupine' | 'gopherLunch' | 'sam' | 'tongue';

/** Is a bump a push at a wrong-colour gate? (A truck in line with a gate that is not its own; `hit` is what it ran into.) */
export const wrongGateBump = (
  truck: { orient: 'h' | 'v'; row: number; col: number; color: string },
  direction: 1 | -1,
  hit: string,
  gates: { color: string; side: string; index: number }[],
): boolean => {
  if (hit !== 'wall') return false;
  const side = truck.orient === 'h' ? (direction === 1 ? 'right' : 'left') : direction === 1 ? 'bottom' : 'top';
  const index = truck.orient === 'h' ? truck.row : truck.col;
  return gates.some((g) => g.side === side && g.index === index && g.color !== truck.color);
};

/** The gags that come by themselves after a quiet spell, in the order they take their turns. */
export const IDLE_GAGS: GagId[] = ['magpie', 'worker', 'gopherLunch', 'tongue'];

/**
 * What each gag uses that another gag might also need: a character or a prop. Two gags that share
 * one never play together. (The worker in red is one man: he cannot doze, roast a marshmallow and
 * eat his lunch at once. Sam, the buddy and the biffy's occupant are other people.)
 */
export const SHARES: Record<GagId, string[]> = {
  magpie: [],
  worker: ['worker'],
  moose: [],
  nearMiss: ['gopher'],
  landowner: [],
  biffyA: ['biffy'],
  biffyB: ['biffy'],
  marshmallow: ['worker'],
  geese: [],
  bear: ['bush'],
  bull: [],
  porcupine: ['worker', 'bush'],
  gopherLunch: ['gopher', 'worker'],
  sam: [],
  tongue: ['worker'],
};
/** Must this gag wait for one of those playing? */
export const mustWait = (id: GagId, playing: Iterable<GagId>): boolean => [...playing].some((p) => p === id || SHARES[p].some((x) => SHARES[id].includes(x)));

/** Does the bear come on this roll (the bush tapped enough times)? Always in demo mode. */
export const bearComes = (demo: boolean, random: () => number = Math.random): boolean => demo || random() < GAG_TRIGGERS.bear.chance;

/**
 * Counts the landowner's fast wiggle: direction reversals of one truck inside ONE drag. `start()`
 * when a truck is picked up; `reversal(now)` each time it turns back, which answers true once
 * enough of them fall inside the time window.
 */
export class Wiggle {
  private times: number[] = [];

  start(): void {
    this.times = [];
  }

  reversal(now: number): boolean {
    const { reversals, withinMs } = GAG_TRIGGERS.landowner.wiggle;
    this.times.push(now);
    this.times = this.times.filter((t) => now - t <= withinMs);
    return this.times.length >= reversals;
  }
}

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
