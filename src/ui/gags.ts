// Oilfield gags: when they fire and where they go. Pure logic; gag-layer.ts draws and animates.
import { SIZE, gateFor, type Level, type Side, type Truck } from '../engine/index.ts';
import { COMPANY_LINES } from './lines.ts';

/** Idle time (no touch, no move) before the magpie, then the spotter, show up. */
export const MAGPIE_IDLE_MS = 10_000;
export const SPOTTER_IDLE_MS = 20_000;

export interface IdleState {
  /** The magpie got its business done this level (it only ever does once). */
  magpieDone: boolean;
  /** Already tried during this idle stretch (a touch starts a new stretch). */
  magpieThisIdle: boolean;
  spotterThisIdle: boolean;
}

export const freshIdle = (): IdleState => ({ magpieDone: false, magpieThisIdle: false, spotterThisIdle: false });

/** Which gag (if any) is due after `idleMs` with nothing happening. */
export function dueGag(idleMs: number, s: IdleState): 'magpie' | 'spotter' | null {
  if (idleMs >= SPOTTER_IDLE_MS && !s.spotterThisIdle) return 'spotter';
  if (idleMs >= MAGPIE_IDLE_MS && !s.magpieDone && !s.magpieThisIdle) return 'magpie';
  return null;
}

/** A touch: the current idle stretch is over (a cancelled magpie may try again later). */
export const touched = (s: IdleState): IdleState => ({ ...s, magpieThisIdle: false, spotterThisIdle: false });

// ---------- Company Man ----------

export type Tier = keyof typeof COMPANY_LINES;

export function tierFor(moves: number, par: number): Tier {
  if (moves <= par) return 'par';
  if (moves <= par + 3) return 'close';
  return 'over';
}

const lastCompany: Partial<Record<Tier, string>> = {};

/** Company Man's line for a result: never the same line twice in a row for that tier. */
export function companyLine(moves: number, par: number, random: () => number = Math.random): string {
  const tier = tierFor(moves, par);
  const pool = COMPANY_LINES[tier].filter((l) => l !== lastCompany[tier]);
  const line = pool[Math.floor(random() * pool.length)];
  lastCompany[tier] = line;
  return line;
}

const opposite: Record<Side, Side> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

// ---------- Biffy ----------

export interface BiffySpot {
  /** The truck whose tailgate the biffy stands behind. */
  truckId: string;
  /** Fence side behind that truck's rear, and the row/column there. */
  side: Side;
  index: number;
}

/** Below the board has the most room, then above; the side gutters are tight on a phone. */
const SIDE_PREFERENCE: Side[] = ['bottom', 'top', 'left', 'right'];

/**
 * Where the biffy goes this level: just outside the fence directly behind one truck's rear
 * (tailgate end), where that fence has no gate. Null if every rear faces a gate.
 */
export function biffySpot(level: Level): BiffySpot | null {
  const spots = level.trucks
    .map((t) => {
      const side = opposite[gateFor(level, t).side];
      const index = t.orient === 'h' ? t.row : t.col;
      return { truckId: t.id, side, index };
    })
    .filter((s) => !level.gates.some((g) => g.side === s.side && g.index === s.index));
  spots.sort((a, b) => SIDE_PREFERENCE.indexOf(a.side) - SIDE_PREFERENCE.indexOf(b.side));
  return spots[0] ?? null;
}

/** +1 or -1: the direction (along its lane) a truck backs up in, away from its gate. */
export function reverseDirection(level: Level, t: Truck): 1 | -1 {
  const side = gateFor(level, t).side;
  return side === 'right' || side === 'bottom' ? -1 : 1;
}

// ---------- Block heater cords (Duvernay) ----------

export interface Cord {
  /** Fence side the plug-in post is on: behind the truck, opposite its gate. */
  side: Side;
  /** Row (left/right) or column (top/bottom) of the post. */
  index: number;
  /** Cord ends in pad cell units: at the pad edge by the post, and at the truck's rear. */
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/** Where a truck's block heater cord runs: from a post in the fence behind it to its rear. */
export function cordFor(level: Level, t: Truck): Cord {
  const side = opposite[gateFor(level, t).side];
  const h = t.orient === 'h';
  const index = h ? t.row : t.col;
  const across = index + 0.5;
  const edge = side === 'left' || side === 'top' ? 0 : SIZE;
  const rear = side === 'left' ? t.col : side === 'top' ? t.row : (h ? t.col : t.row) + t.length;
  return h
    ? { side, index, from: { x: edge, y: across }, to: { x: rear, y: across } }
    : { side, index, from: { x: across, y: edge }, to: { x: across, y: rear } };
}

// ---------- Magpie ----------

/** The truck the magpie lands on: any truck still on the pad (random), or none. */
export function magpieTarget(trucks: readonly Truck[], random: () => number = Math.random): Truck | null {
  return trucks.length ? trucks[Math.floor(random() * trucks.length)] : null;
}

// ---------- Wildlife and traffic (outside the fence, along the bottom) ----------

/** The scenes that drop by on their own: region animals, the legendary bear, traffic and visitors. */
export type WildGag = 'gopher' | 'moose' | 'bear' | 'hotshot' | 'geese' | 'pumper';

/** Unfound Wildlife Log entries are this much more likely to be picked than found ones. */
export const UNFOUND_WEIGHT = 3;
/** Scenes per level visit (drawn from the pool, so found ones turn up less and less). */
export const WILD_SLOTS = 2;
/** The first one comes after this long with no touch or move, or at its random moment, whichever is first. */
export const ANIMAL_IDLE_MS = 15_000;
/** At least this far apart, so nothing crowds anything else. */
export const WILD_GAP_MS = 12_000;
/** The bear is legendary: only Duvernay levels 8 to 10, and only about one visit in three. */
export const BEAR_CHANCE = 1 / 3;

export interface Where {
  regionId: string;
  /** 0-based level number within its region. */
  levelIndex: number;
  /** Demo mode: the bear may turn up anywhere. */
  demo: boolean;
}

/** Where the bear may appear at all (a bush stands waiting there). */
export const bearEligible = (w: Where) => w.demo || (w.regionId === 'duvernay' && w.levelIndex >= 7 && w.levelIndex <= 9);
/** Rolled once per level visit. */
export const bearComes = (w: Where, random: () => number = Math.random) => bearEligible(w) && random() < BEAR_CHANCE;

/** What can drop by here, not counting the bear: Cardium's gopher, Duvernay's moose, and the rest anywhere. */
export function wildPool(regionId: string): WildGag[] {
  const pool: WildGag[] = ['hotshot', 'geese', 'pumper'];
  if (regionId === 'cardium') pool.unshift('gopher');
  if (regionId === 'duvernay') pool.unshift('moose');
  return pool;
}

/** One pick: every unfound entry is UNFOUND_WEIGHT times as likely as a found one. */
export function weightedPick<T extends string>(candidates: readonly T[], found: ReadonlySet<string>, random: () => number = Math.random): T {
  const weights = candidates.map((c) => (found.has(c) ? 1 : UNFOUND_WEIGHT));
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (const [i, w] of weights.entries()) {
    r -= w;
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export interface WildState {
  /** This visit's scenes, in order, with the level time (ms) each is due. */
  queue: { gag: WildGag; at: number }[];
  /** How many have played. */
  next: number;
}

/**
 * This visit's scenes: WILD_SLOTS weighted picks (no repeats) from the pool, the bear first if he's
 * coming. The first is due 10-30s in, each later one 12-30s after the one before.
 */
export function planWildlife(pool: readonly WildGag[], found: ReadonlySet<string>, bear: boolean, random: () => number = Math.random): WildState {
  const picks: WildGag[] = bear ? ['bear'] : [];
  let left = pool.filter((g) => g !== 'bear');
  while (picks.length < WILD_SLOTS && left.length) {
    const g = weightedPick(left, found, random);
    picks.push(g);
    left = left.filter((x) => x !== g);
  }
  let at = 10_000 + random() * 20_000;
  const queue = picks.map((gag) => {
    const item = { gag, at };
    at += WILD_GAP_MS + random() * 18_000;
    return item;
  });
  return { queue, next: 0 };
}

/**
 * The scene that's due, `levelMs` into the level with `idleMs` since the last touch (or null).
 * The caller only asks when nothing else is playing.
 */
export function dueWildlife(levelMs: number, idleMs: number, s: WildState): WildGag | null {
  const item = s.queue[s.next];
  if (!item) return null;
  return levelMs >= item.at || (s.next === 0 && idleMs >= ANIMAL_IDLE_MS) ? item.gag : null;
}

// ---------- Demo mode: everything turns up fast, unfound first ----------

/** Demo mode: the first gag about 5s in, then one about every 15s. */
export const DEMO_FIRST_MS = 5_000;
export const DEMO_EVERY_MS = 15_000;

/** Any gag the demo can set off: the Wildlife Log's ten. */
export type DemoGag = WildGag | 'magpie' | 'spotter' | 'biffy' | 'landowner';

/** What demo mode can play on this level (the bear anywhere; the others where they live). */
export function demoPool(regionId: string, hasBiffy: boolean): DemoGag[] {
  const pool: DemoGag[] = ['magpie', 'spotter'];
  if (hasBiffy) pool.push('biffy');
  if (regionId === 'montney') pool.push('landowner');
  return [...pool, 'bear', ...wildPool(regionId)];
}

/**
 * Demo mode's next gag: unfound ones first (ones not yet tried this visit before ones that were
 * tried and cut short), then found ones at random, never the same twice running.
 */
export function demoNext(pool: readonly DemoGag[], found: ReadonlySet<string>, tried: readonly DemoGag[], random: () => number = Math.random): DemoGag | null {
  if (!pool.length) return null;
  const unfound = pool.filter((g) => !found.has(g));
  const fresh = unfound.filter((g) => !tried.includes(g));
  if (fresh.length) return fresh[0];
  const last = tried[tried.length - 1];
  const again = unfound.filter((g) => g !== last);
  if (again.length) return again[0];
  if (unfound.length) return unfound[0];
  const rest = pool.filter((g) => g !== last);
  return (rest.length ? rest : pool)[Math.floor(random() * (rest.length || pool.length))];
}

/**
 * Where a scene `span` px wide goes between `lo` and `hi` (left edge returned), keeping clear of
 * the biffy if it stands below the board: centred in the wider stretch beside it. Without a biffy,
 * a bit left of centre. Null if it can't fit beside the biffy at that size.
 */
export function fitSpan(lo: number, hi: number, span: number, biffy: { left: number; right: number } | null): number | null {
  if (!biffy) return span <= hi - lo ? lo + (hi - lo - span) * 0.35 : null;
  const a = { from: lo, to: biffy.left - 8 };
  const b = { from: biffy.right + 8, to: hi };
  const best = a.to - a.from >= b.to - b.from ? a : b;
  return best.to - best.from >= span ? best.from + (best.to - best.from - span) / 2 : null;
}

/**
 * Room for something `span` px wide between `lo` and `hi`, clear of things already standing along
 * the bottom (the biffy, the bush): the widest free stretch, `pick` 0..1 along it. Null if none fits.
 */
export function freeSpot(lo: number, hi: number, span: number, avoid: { left: number; right: number }[], pick = 0.5): number | null {
  const gaps: { from: number; to: number }[] = [];
  let from = lo;
  for (const a of [...avoid].sort((x, y) => x.left - y.left)) {
    if (a.left - 8 - from >= span) gaps.push({ from, to: a.left - 8 });
    from = Math.max(from, a.right + 8);
  }
  if (hi - from >= span) gaps.push({ from, to: hi });
  if (!gaps.length) return null;
  const g = gaps.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  return g.from + (g.to - g.from - span) * Math.min(1, Math.max(0, pick));
}
