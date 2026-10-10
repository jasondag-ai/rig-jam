// FLING (October upgrade, job U4). A quick flick sends a truck all the way down its lane, and out through its gate
// if the rules let it leave; a slow drag is exactly what it was. Pure: the board (board-view.ts) feeds it the
// finger's places along the truck's lane and asks, at the release, whether that was a flick and where it ends.
//   - THE DECISION: over the last `FLING_WINDOW_MS` before the finger lifted, it was still moving (its last place
//     is no older than `FLING_STALE_MS`), it covered at least `FLING_TRAVEL` of a cell, and its speed along the
//     lane was `FLING_SPEED` cells a second or more. A finger that slows down or stops before it lifts never flings.
//   - THE END: the far end of the engine's own move range that way (`getMoveRange`): up against whatever is in the
//     way, or out through the gate where that end is the truck's way out. One move; Undo takes it back.
//   - NOT A BUMP: a fling that stops against something is no near miss. And a fast finger that runs on past the
//     truck's stop is not "pushing" yet: the board holds that bump back for `PUSH_HOLD_MS`, and only a finger still
//     down and still past the stop by then (or one that has slowed down there) bumps.
// TO TUNE: `FLING_SPEED` is the one number. Higher = harder to fling.
import type { MoveRange } from '../engine/index.ts';

/** How fast the finger must be going along the lane when it lifts, in cells a second. THE ONE NUMBER TO TUNE. */
export const FLING_SPEED = 11;
/** The stretch of the drag the speed is measured over, just before the finger lifts (ms). */
export const FLING_WINDOW_MS = 90;
/** A finger whose last movement is older than this had stopped before it lifted: no fling (ms). */
export const FLING_STALE_MS = 45;
/** The least the finger must have covered inside the window, in cells (a twitch is not a flick). */
export const FLING_TRAVEL = 0.4;
/** The least time the window's samples must span for a speed to mean anything (ms). */
export const FLING_SPAN_MS = 12;
/** A fast finger past the truck's stop bumps only if it is still there after this long (ms). */
export const PUSH_HOLD_MS = 130;

/** One place of the finger along the truck's lane: when (ms, the event's own clock) and where (px). */
export interface Sample { t: number; at: number }

/** Keeps the samples a decision can need: those inside the window before the newest. */
export function addSample(samples: Sample[], s: Sample): Sample[] {
  const from = s.t - FLING_WINDOW_MS * 2;
  const kept = samples.filter((p) => p.t >= from && p.t <= s.t);
  kept.push(s);
  return kept;
}

/**
 * The finger's speed along the lane at time `now`, in cells a second (signed: + is right or down). 0 if it had
 * stopped (its last sample is stale) or the window holds too little to tell.
 */
export function fingerSpeed(samples: readonly Sample[], now: number, cell: number): number {
  const last = samples.at(-1);
  if (!last || cell <= 0 || now - last.t > FLING_STALE_MS) return 0;
  const first = samples.find((p) => p.t >= last.t - FLING_WINDOW_MS)!;
  const dt = last.t - first.t;
  if (dt < FLING_SPAN_MS) return 0;
  return ((last.at - first.at) / cell / dt) * 1000;
}

/** Which way a release flings the truck: 1 (right or down), -1 (left or up), or 0 (an ordinary release). */
export function flingDir(samples: readonly Sample[], now: number, cell: number): 1 | -1 | 0 {
  const speed = fingerSpeed(samples, now, cell);
  if (Math.abs(speed) < FLING_SPEED) return 0;
  const last = samples.at(-1)!;
  const first = samples.find((p) => p.t >= last.t - FLING_WINDOW_MS)!;
  if (Math.abs(last.at - first.at) < FLING_TRAVEL * cell) return 0;
  return speed > 0 ? 1 : -1;
}

/**
 * Where a fling that way ends, as the move's delta in cells: the far end of the truck's range that way. 0 = it
 * cannot go that way at all (no move). It drives out exactly when this is the range's `exitDelta`.
 */
export const flingDelta = (range: MoveRange, dir: 1 | -1): number => (dir > 0 ? range.max : range.min) + 0;

/** How long the slide to a fling's end takes (ms), for `cells` cells to go: quick, and a little longer for a long way. */
export const flingMs = (cells: number): number => Math.round(Math.min(380, 130 + 42 * Math.abs(cells)));
/** Its easing: off fast, settling in. */
export const FLING_EASE = 'cubic-bezier(0.22, 0.68, 0.3, 1)';

/**
 * `?fling=0` turns flinging off for a page load and `?fling=1` on. With neither, it is on for people and OFF IN AN
 * AUTOMATED BROWSER (`navigator.webdriver`): the test suites' scripted drags move at a steady clip and lift at
 * once, which is a flick, and they mean an ordinary drag. The fling's own tests ask for it with `?fling=1`.
 */
export function flingOn(search: string = typeof location === 'undefined' ? '' : location.search, automated: boolean = typeof navigator !== 'undefined' && !!navigator.webdriver): boolean {
  const v = new URLSearchParams(search).get('fling');
  return v === '1' ? true : v === '0' ? false : !automated;
}
