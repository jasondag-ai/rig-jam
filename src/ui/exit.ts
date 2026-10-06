// A truck's drive out through its gate (pure; the board animates it: board-view.ts driveOut).
// It never meets a hard edge: it drives only a little way past the gate and fades away there, in
// its dust, over the last part of the drive.
import { SIZE } from '../engine/index.ts';
import type { Side } from '../engine/index.ts';

/** Where a truck's drive out ends: its cab this many cells past the gate (the berm's outer edge). */
export const EXIT_PAST = 1;
/** The share of the drive it spends fading away (the last part). */
export const EXIT_FADE = 0.45;
/** How far a truck drives on its way out (px): from where its cab is to EXIT_PAST cells past the gate. */
export function exitDistance(side: Side, from: { x: number; y: number }, w: number, h: number, cell: number, fence: number): number {
  const pad = cell * SIZE;
  const toEdge = side === 'left' ? from.x : side === 'right' ? pad - (from.x + w) : side === 'top' ? from.y : pad - (from.y + h);
  // (Let go already nosing into the gate's gap, it has that much less to go.)
  return Math.max(cell * 0.25, toEdge + fence + cell * EXIT_PAST);
}
