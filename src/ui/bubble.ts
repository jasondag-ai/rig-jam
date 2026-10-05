// Where a speech bubble goes. Every bubble has a tail whose tip touches its speaker (a truck's cab,
// a character's head, the moose's muzzle), and the bubble follows the speaker while it moves. It
// never leaves the room it is given (on the game screen: below the HUD, above the buttons, inside
// the screen's side margins). Pure geometry here (tested); board-view.ts puts it on screen.

/** Where the bubble sits, seen from its speaker. */
export type BubbleSide = 'above' | 'below' | 'left' | 'right';
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** How long the tail is (px): the bubble stands this far off its speaker. Matches style.css. */
export const TAIL = 11;
/** The tail keeps this far from the bubble's corners (its rounded ends). */
export const TAIL_INSET = 16;
/** A tail may miss the middle of its speaker by this much (px) and still count as pointing at it. */
export const AIM = 3;

export interface Placed {
  left: number;
  top: number;
  side: BubbleSide;
  /** The tail's place along the bubble's edge (px from its left, or from its top for a side tail). */
  tail: number;
  /** The tail's tip. */
  tip: { x: number; y: number };
  /** The whole bubble is inside the bounds and its tail points at the speaker. */
  fits: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The bubble on one side of its speaker, slid along that side to stay in bounds. */
export function onSide(side: BubbleSide, speaker: Box, size: { w: number; h: number }, bounds: Box): Placed {
  const cx = (speaker.left + speaker.right) / 2, cy = (speaker.top + speaker.bottom) / 2;
  const { w, h } = size;
  if (side === 'above' || side === 'below') {
    const top = side === 'above' ? speaker.top - TAIL - h : speaker.bottom + TAIL;
    const left = clamp(cx - w / 2, bounds.left, Math.max(bounds.left, bounds.right - w));
    const tail = clamp(cx - left, Math.min(TAIL_INSET, w / 2), Math.max(w / 2, w - TAIL_INSET));
    const tip = { x: left + tail, y: side === 'above' ? speaker.top : speaker.bottom };
    const fits = top >= bounds.top && top + h <= bounds.bottom && left + w <= bounds.right && Math.abs(tip.x - cx) <= Math.max(AIM, (speaker.right - speaker.left) / 2);
    return { left, top, side, tail, tip, fits };
  }
  const left = side === 'left' ? speaker.left - TAIL - w : speaker.right + TAIL;
  const top = clamp(cy - h / 2, bounds.top, Math.max(bounds.top, bounds.bottom - h));
  const inset = Math.min(TAIL_INSET, h / 2);
  const tail = clamp(cy - top, inset, Math.max(h / 2, h - inset));
  const tip = { x: side === 'left' ? speaker.left : speaker.right, y: top + tail };
  const fits = left >= bounds.left && left + w <= bounds.right && top + h <= bounds.bottom && Math.abs(tip.y - cy) <= Math.max(AIM, (speaker.bottom - speaker.top) / 2);
  return { left, top, side, tail, tip, fits };
}

/**
 * Places a bubble of `size` for a speaker: the first side in `prefer` where the whole bubble fits
 * in `bounds` with its tail on the speaker. If none fits (a speaker off in a corner, a very long
 * line), the side that needs the least pushing back in, pushed back in: the tail then still starts
 * from the speaker's side of the bubble.
 */
export function placeBubble(speaker: Box, size: { w: number; h: number }, bounds: Box, prefer: readonly BubbleSide[] = ['above', 'below', 'right', 'left']): Placed {
  const order = [...prefer, ...(['above', 'below', 'right', 'left'] as BubbleSide[]).filter((s) => !prefer.includes(s))];
  const tries = order.map((s) => onSide(s, speaker, size, bounds));
  const hit = tries.find((p) => p.fits);
  if (hit) return hit;
  const over = (p: Placed) => Math.max(0, bounds.left - p.left) + Math.max(0, p.left + size.w - bounds.right) + Math.max(0, bounds.top - p.top) + Math.max(0, p.top + size.h - bounds.bottom);
  const best = tries.reduce((a, b) => (over(b) < over(a) ? b : a));
  const left = clamp(best.left, bounds.left, Math.max(bounds.left, bounds.right - size.w));
  const top = clamp(best.top, bounds.top, Math.max(bounds.top, bounds.bottom - size.h));
  return { ...best, left, top, fits: false };
}

/** The sides to try for a speaker with something to keep clear of beside it: the roomier side first. */
export const roomierSide = (speaker: Box, bounds: Box): BubbleSide[] => {
  const cx = (speaker.left + speaker.right) / 2;
  return bounds.right - cx >= cx - bounds.left ? ['right', 'left'] : ['left', 'right'];
};

/** How far apart two boxes are (0 if they touch or overlap). */
export const gapBetween = (a: Box, b: Box): number => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));

/**
 * WITNESS LINES: who remarks on a gag. Only the truck nearest the gag (`gag`: the boxes of what is
 * on screen of it), and only if it is within `reach` px; otherwise nobody (-1).
 */
export function nearestWitness(trucks: readonly Box[], gag: readonly Box[], reach: number): number {
  let best = -1, bestGap = Infinity;
  trucks.forEach((t, i) => {
    const gap = Math.min(...gag.map((g) => gapBetween(t, g)));
    if (gap < bestGap) [best, bestGap] = [i, gap];
  });
  return bestGap <= reach ? best : -1;
}
/** A truck must be within this many cells of a gag to remark on it. */
export const WITNESS_REACH = 2;
