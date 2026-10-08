// A truck's drive out through its gate (pure; the board animates it: board-view.ts driveOut).
//
// THE TAIL CLEARS THE GATE FIRST, THEN IT FADES (Jay, Oct 6). The truck ROLLS, solid, until its
// tail is right through the gate and clear of the berm's outer edge; only then does it fade, over
// a short coast. There is no fading while any of it is still in the gate. (Before: it stopped a
// cell past the gate and began to fade half way there, its tail still on the pad.)
import { SIZE } from '../engine/index.ts';
import type { Side } from '../engine/index.ts';

/** How far past the berm's outer edge the TAIL is when the roll ends and the fade begins (cells): just clear. */
export const EXIT_CLEAR = 0.12;
/** While it fades it coasts this much further (cells), over `EXIT_FADE_MS`. */
export const EXIT_COAST = 0.45;
export const EXIT_FADE_MS = 240;
/** The roll takes this long for its distance (ms): a steady pace, never slower than the first figure nor longer than the second. */
export const ROLL_MS = { least: 460, most: 760, base: 300, perCell: 90 } as const;

export interface ExitPlan {
  /** The roll, solid: from where the truck is to its tail just clear of the gate (px). */
  roll: number;
  rollMs: number;
  /** The coast it fades over (px, ms). */
  coast: number;
  fadeMs: number;
}

/**
 * A truck's way out: `from` is its top-left corner on the pad (px), `w` x `h` its size, `cell` a
 * cell's size and `fence` the berm band's thickness. The roll takes its tail to `EXIT_CLEAR`
 * cells past the berm's outer edge, whatever its length and wherever it was let go.
 */
export function exitPlan(side: Side, from: { x: number; y: number }, w: number, h: number, cell: number, fence: number, size: number = SIZE): ExitPlan {
  const pad = cell * size;
  const horizontal = side === 'left' || side === 'right';
  const length = horizontal ? w : h;
  // From its leading edge to the pad's edge (less if it was let go already nosing into the gate's gap).
  const toEdge = side === 'left' ? from.x : side === 'right' ? pad - (from.x + w) : side === 'top' ? from.y : pad - (from.y + h);
  const roll = Math.max(cell * 0.25, toEdge + length + fence + cell * EXIT_CLEAR);
  const rollMs = Math.round(Math.min(ROLL_MS.most, Math.max(ROLL_MS.least, ROLL_MS.base + (ROLL_MS.perCell * roll) / cell)));
  return { roll, rollMs, coast: cell * EXIT_COAST, fadeMs: EXIT_FADE_MS };
}

/** The longest a drive out can take, roll and fade (ms): what waits for a truck to be gone waits this long. */
export const EXIT_MOST_MS = ROLL_MS.most + EXIT_FADE_MS;

/** Is the truck's tail through the gate? `box` is the truck on the pad (px): true once no part of it is on the pad or in the berm's band. */
export function tailClear(side: Side, box: { x: number; y: number; w: number; h: number }, cell: number, fence: number, size: number = SIZE): boolean {
  const pad = cell * size;
  return side === 'left' ? box.x + box.w <= -fence : side === 'right' ? box.x >= pad + fence : side === 'top' ? box.y + box.h <= -fence : box.y >= pad + fence;
}
