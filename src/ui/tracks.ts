// Tire tracks: every move lays a pair of wheel marks along the path the truck travelled, so a
// finished pad shows the history of the solve. Lanes that are driven again and again wear in:
// each pass makes those cells' marks wider and darker, up to WEAR_CAP. Pure geometry and wear
// bookkeeping here; board-view draws it and reveals it behind the moving truck.
import { SIZE, type MoveRange, type Truck } from '../engine/index.ts';

/** Wheel marks sit this far either side of the truck's center line (in cells). */
export const WHEEL_OFFSET = 0.27;
/** Marks stop this far short of where the truck's ends were (no inset where they run to the fence). */
export const END_INSET = 0.15;
/** Newest tracks are fully drawn; each later move fades older ones by this much... */
export const FADE_STEP = 0.1;
/** ...down to this floor, so the history never disappears. */
export const FADE_FLOOR = 0.3;
/** Passes after which a lane cell stops getting deeper. */
export const WEAR_CAP = 4;

/** The stretch of one lane a truck rolled over, in whole cells (inclusive). */
export interface Pass {
  orient: 'h' | 'v';
  /** Row for horizontal trucks, column for vertical ones. */
  lane: number;
  from: number;
  to: number;
  /** The marks run right to the fence at this end (the truck drove out). */
  fenceLow: boolean;
  fenceHigh: boolean;
}

const posOf = (t: Truck) => (t.orient === 'h' ? t.col : t.row);
const laneOf = (t: Truck) => (t.orient === 'h' ? t.row : t.col);

/** Ground covered by `truck` sliding `delta` cells (to the fence if it drove out). */
export function passOf(truck: Truck, delta: number, exited: boolean): Pass {
  const pos = posOf(truck);
  let from = Math.min(pos, pos + delta);
  let to = Math.max(pos, pos + delta) + truck.length - 1;
  const fenceLow = exited && delta < 0;
  const fenceHigh = exited && delta > 0;
  if (fenceLow) from = 0;
  if (fenceHigh) to = SIZE - 1;
  return { orient: truck.orient, lane: laneOf(truck), from: Math.max(0, from), to: Math.min(SIZE - 1, to), fenceLow, fenceHigh };
}

/** Everything the truck could reach in this drag: the marks are revealed from this as it moves. */
export function stretchOf(truck: Truck, range: MoveRange): Pass {
  const pos = posOf(truck);
  return {
    orient: truck.orient,
    lane: laneOf(truck),
    from: pos + range.min,
    to: pos + truck.length - 1 + range.max,
    fenceLow: range.exitDelta !== null && range.exitDelta < 0,
    fenceHigh: range.exitDelta !== null && range.exitDelta > 0,
  };
}

const key = (p: Pass, cell: number) => `${p.orient}${p.lane}:${cell}`;

/** Passes over each lane cell so far. */
export type Wear = Map<string, number>;

export function addWear(wear: Wear, p: Pass): void {
  for (let c = p.from; c <= p.to; c++) wear.set(key(p, c), (wear.get(key(p, c)) ?? 0) + 1);
}

export function removeWear(wear: Wear, p: Pass): void {
  for (let c = p.from; c <= p.to; c++) {
    const n = (wear.get(key(p, c)) ?? 0) - 1;
    if (n > 0) wear.set(key(p, c), n);
    else wear.delete(key(p, c));
  }
}

/** How worn a lane cell looks: passes so far (plus `extra` for a pass being drawn), capped. */
export function wearLevel(wear: Wear, p: Pass, cell: number, extra = 0): number {
  return Math.max(1, Math.min(WEAR_CAP, (wear.get(key(p, cell)) ?? 0) + extra));
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 1 (fresh) .. WEAR_CAP (deep rut). */
  wear: number;
}

/**
 * Wheel-mark segments for a pass, in cell units. Neighbouring cells with the same wear merge into
 * one segment, so a move draws a handful of lines, not one per cell.
 */
export function segments(p: Pass, wear: Wear, extra = 0): Segment[] {
  const runs: { from: number; to: number; level: number }[] = [];
  for (let c = p.from; c <= p.to; c++) {
    const level = wearLevel(wear, p, c, extra);
    const last = runs.at(-1);
    if (last && last.level === level) last.to = c;
    else runs.push({ from: c, to: c, level });
  }
  const start = p.from + (p.fenceLow ? 0 : END_INSET);
  const end = p.to + 1 - (p.fenceHigh ? 0 : END_INSET);
  const out: Segment[] = [];
  for (const offset of [-WHEEL_OFFSET, WHEEL_OFFSET]) {
    const across = p.lane + 0.5 + offset;
    for (const r of runs) {
      const a = Math.max(start, r.from);
      const b = Math.min(end, r.to + 1);
      out.push(
        p.orient === 'h'
          ? { x1: a, y1: across, x2: b, y2: across, wear: r.level }
          : { x1: across, y1: a, x2: across, y2: b, wear: r.level },
      );
    }
  }
  return out;
}

/**
 * The part of the lane revealed so far: from where the truck started to where it is now, both
 * footprints included, never past the fence. Positions in cells (may be fractional mid-slide).
 */
export function revealed(startPos: number, currentPos: number, length: number): [number, number] {
  return [Math.max(0, Math.min(startPos, currentPos)), Math.min(SIZE, Math.max(startPos, currentPos) + length)];
}

/** Opacity of a track laid `age` moves ago (0 = the newest). */
export function trackOpacity(age: number): number {
  return Math.max(FADE_FLOOR, 1 - age * FADE_STEP);
}
