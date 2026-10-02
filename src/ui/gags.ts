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

/** Cardium has a gopher, Montney a bear, Duvernay a moose; every region gets the hot shot and a visitor. */
export type Animal = 'gopher' | 'bear' | 'moose';
export const animalFor = (regionId: string): Animal | null =>
  regionId === 'cardium' ? 'gopher' : regionId === 'montney' ? 'bear' : regionId === 'duvernay' ? 'moose' : null;

/** Once per level, one of these drops by (any region): geese overhead, or the pumper on his rounds. */
export type Visitor = 'geese' | 'pumper';

/** The animal comes after this long with no touch or move, or at its random moment, whichever is first. */
export const ANIMAL_IDLE_MS = 15_000;
/** At least this far apart, so nothing crowds anything else. */
export const WILD_GAP_MS = 8_000;

export interface WildState {
  /** Level time (ms) when the animal shows up even if you're busy playing, the hot shot, the visitor. */
  animalAt: number;
  hotshotAt: number;
  visitorAt: number;
  visitor: Visitor;
  animalDone: boolean;
  hotshotDone: boolean;
  visitorDone: boolean;
}

/** This level's random moments: animal 20-50s in, hot shot 8-45s, visitor 12-55s, kept apart. */
export function planWildlife(random: () => number = Math.random): WildState {
  const animalAt = 20_000 + random() * 30_000;
  const apart = (at: number, taken: number[], lo: number) => {
    // Nudge forward past anything too close (then it's never earlier than `lo`).
    let t = Math.max(lo, at);
    for (let i = 0; i < 4; i++) {
      const clash = taken.find((x) => Math.abs(t - x) < WILD_GAP_MS);
      if (clash === undefined) break;
      t = clash + WILD_GAP_MS;
    }
    return t;
  };
  const hotshotAt = apart(8_000 + random() * 37_000, [animalAt], 8_000);
  const visitorAt = apart(12_000 + random() * 43_000, [animalAt, hotshotAt], 12_000);
  const visitor: Visitor = random() < 0.5 ? 'geese' : 'pumper';
  return { animalAt, hotshotAt, visitorAt, visitor, animalDone: false, hotshotDone: false, visitorDone: false };
}

/**
 * Which outside gag is due, `levelMs` into the level with `idleMs` since the last touch.
 * The caller only asks when nothing else is playing; each one runs once per level.
 */
export function dueWildlife(levelMs: number, idleMs: number, s: WildState, animal: Animal | null): 'animal' | 'hotshot' | 'visitor' | null {
  if (animal && !s.animalDone && (idleMs >= ANIMAL_IDLE_MS || levelMs >= s.animalAt)) return 'animal';
  if (!s.hotshotDone && levelMs >= s.hotshotAt) return 'hotshot';
  if (!s.visitorDone && levelMs >= s.visitorAt) return 'visitor';
  return null;
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
