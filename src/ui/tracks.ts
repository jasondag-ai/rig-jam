// Tire tracks: every move lays a pair of wheel marks along the path the truck travelled, so a
// finished pad shows the history of the solve. Pure geometry here; board-view draws it.
import { SIZE, type Truck } from '../engine/index.ts';

/** Wheel marks sit this far either side of the truck's center line (in cells). */
export const WHEEL_OFFSET = 0.27;
/** Newest tracks are fully drawn; each later move fades older ones by this much... */
export const FADE_STEP = 0.1;
/** ...down to this floor, so the history never disappears. */
export const FADE_FLOOR = 0.3;

export interface TrackLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The two wheel lines (in cell units, 0..SIZE) for `truck` sliding `delta` cells, covering the
 * stretch of ground it rolled over: from its starting footprint to its end, or to the gate on an exit.
 */
export function trackLines(truck: Truck, delta: number, exited: boolean): [TrackLine, TrackLine] {
  const h = truck.orient === 'h';
  const pos = h ? truck.col : truck.row;
  const center = (h ? truck.row : truck.col) + 0.5;
  let from = Math.min(pos, pos + delta) + 0.15;
  let to = Math.max(pos, pos + delta) + truck.length - 0.15;
  // Driving out: the marks run right up to the fence.
  if (exited) {
    if (delta < 0) from = 0;
    else to = SIZE;
  }
  const line = (offset: number): TrackLine =>
    h
      ? { x1: from, y1: center + offset, x2: to, y2: center + offset }
      : { x1: center + offset, y1: from, x2: center + offset, y2: to };
  return [line(-WHEEL_OFFSET), line(WHEEL_OFFSET)];
}

/** Opacity of a track laid `age` moves ago (0 = the newest). */
export function trackOpacity(age: number): number {
  return Math.max(FADE_FLOOR, 1 - age * FADE_STEP);
}
