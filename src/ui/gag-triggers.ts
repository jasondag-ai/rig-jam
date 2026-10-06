// EVERY GAG TRIGGER IN ONE PLACE, so they can be tuned after playing (GAME_BIBLE, Oct 4). Gags are
// Easter eggs: each is set off by something the player does, never by waiting. Times are in
// milliseconds. `?idle=0.1` makes the night's idle time 10x shorter (tests).
export const GAG_TRIGGERS = {
  /** Gag 1, the magpie: the player taps a truck without dragging it, with this chance each tap. Any region. Demo mode: every time. */
  magpie: { truckTap: true, chance: 1 / 2 },
  /** Gag 2, the sleepy worker: a truck slides into ANOTHER TRUCK (a bump), with this chance each time. Any region. Demo mode: every time. */
  worker: { truckBump: true, chance: 1 / 2 },
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
  /** Gag 12, the porcupine (Cardium, at the bush): tap the bush this many times (the same pattern as the bear's bush). */
  porcupine: { region: 'cardium', bushTaps: 3 },
  /** Gag 13, gopher lunch (Cardium, at the gopher mound): a press of the Hint button, with this chance each press. Demo mode: every time. */
  gopherLunch: { region: 'cardium', onHint: true, chance: 1 / 2 },
  /**
   * Gag 14, Safety Sam (any region): this many blocked moves (bumps) in a row with no move made in
   * between, OR one push at a wrong-colour gate. Once per level.
   */
  sam: { bumpsInARow: 3, wrongGate: true },
  /** Gag 15, the frozen tongue (winter levels, at the frosty riser): this many taps on the riser. */
  tongue: { theme: 'winter', riserTaps: 3 },
  /** Gag 16, the surveyor (any region, at the lease sign): the Restart button, with this chance each press. Demo mode: every time. */
  surveyor: { onRestart: true, chance: 1 / 2 },
  /** Gag 17, the back scratcher (a mule deer at the lease sign): this many taps on the sign. Not on these themes' levels. */
  deer: { signTaps: 1, notThemes: ['winter'] },
  /** Gag 18, the tourists (at the lease sign): the first move on the Daily Pad, with this chance. Not on these themes' levels. Demo mode: every time. */
  tourists: { firstDailyMove: true, chance: 1 / 3, notThemes: ['winter'] },
  /**
   * Not a gag. NIGHT: no level starts at night. After `idleMs` with no moves the lease fades to
   * night over `fadeInMs`; the next move brings the day back over `fadeOutMs`. Only where the
   * season is one of `themes`: Montney (spring) and Duvernay (winter). Cardium (summer) never goes dark.
   */
  night: { idleMs: 30_000, fadeInMs: 4000, fadeOutMs: 2000, themes: ['spring', 'winter'] },
  /** Not a gag: this long after night has fully fallen, a truck says "While we're young, Sonny...". Once per level. */
  nightNudge: { afterNightMs: 15_000 },
} as const;

/**
 * RULES FOR EVERY GAG (GAME_BIBLE, Oct 5): gags run AT THE SAME TIME. When a trigger fires its gag
 * plays right away, even if another is playing; it waits only if it shares a character or a prop
 * with one that is on (`SHARES`), and then it plays as soon as that one has left. None starts once
 * the level is won. NO GAG COMES FROM WAITING (Jay, Oct 5): every one is set off by something the
 * player does. Sitting idle only brings the night (and its nudge).
 */
export type GagId = 'magpie' | 'worker' | 'moose' | 'nearMiss' | 'landowner' | 'biffyA' | 'biffyB' | 'marshmallow' | 'geese' | 'bear' | 'bull' | 'porcupine' | 'gopherLunch' | 'sam' | 'tongue' | 'surveyor' | 'deer' | 'tourists';

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

/** `?gag=<name>` previews: the gag each name plays (again and again), and the level it opens on. */
export const PREVIEWS: Record<string, { gag: GagId; region: string; level: number }> = {
  magpie: { gag: 'magpie', region: 'cardium', level: 6 },
  worker: { gag: 'worker', region: 'cardium', level: 6 },
  moose: { gag: 'moose', region: 'duvernay', level: 1 },
  nearmiss: { gag: 'nearMiss', region: 'cardium', level: 6 },
  landowner: { gag: 'landowner', region: 'montney', level: 6 },
  biffya: { gag: 'biffyA', region: 'cardium', level: 6 },
  biffyb: { gag: 'biffyB', region: 'cardium', level: 6 },
  marshmallow: { gag: 'marshmallow', region: 'montney', level: 2 },
  geese: { gag: 'geese', region: 'cardium', level: 6 },
  bear: { gag: 'bear', region: 'duvernay', level: 8 },
  bull: { gag: 'bull', region: 'montney', level: 6 },
  porcupine: { gag: 'porcupine', region: 'cardium', level: 6 },
  lunch: { gag: 'gopherLunch', region: 'cardium', level: 6 },
  sam: { gag: 'sam', region: 'cardium', level: 6 },
  tongue: { gag: 'tongue', region: 'duvernay', level: 2 },
  surveyor: { gag: 'surveyor', region: 'cardium', level: 6 },
  deer: { gag: 'deer', region: 'cardium', level: 6 },
  tourists: { gag: 'tourists', region: 'cardium', level: 6 },
};

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
  // The three sign gags share the lease sign.
  surveyor: ['sign'],
  deer: ['sign'],
  tourists: ['sign'],
};
/** Must this gag wait for one of those playing? */
export const mustWait = (id: GagId, playing: Iterable<GagId>): boolean => [...playing].some((p) => p === id || SHARES[p].some((x) => SHARES[id].includes(x)));

/** A roll for a gag that comes only some of the time (`chance`): always in demo mode. */
export const rollComes = (chance: number, demo: boolean, random: () => number = Math.random): boolean => demo || random() < chance;

/** Does the worker come for his lunch on this press of Hint? Always in demo mode. */
export const lunchComes = (demo: boolean, random: () => number = Math.random): boolean => demo || random() < GAG_TRIGGERS.gopherLunch.chance;

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
