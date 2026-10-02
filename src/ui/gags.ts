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

// ---------- Biffy ----------

/**
 * The biffy stands just outside the bottom fence, by a column with no gate there (a corner if it
 * can). Returns that column.
 */
export function biffyColumn(level: Level): number {
  const gated = new Set(level.gates.filter((g) => g.side === 'bottom').map((g) => g.index));
  for (const col of [5, 0, 4, 1, 3, 2]) if (!gated.has(col)) return col;
  return 5;
}

/** A bump counts as "next to the biffy" when the truck is touching the cells beside it. */
export function nearBiffy(cells: readonly [number, number][], col: number): boolean {
  return cells.some(([r, c]) => r >= SIZE - 2 && Math.abs(c - col) <= 1);
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

const opposite: Record<Side, Side> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

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
