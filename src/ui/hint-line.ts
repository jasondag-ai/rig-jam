// THE LINE OF HINTS (Job X). One solve gives the whole best line from where the pad stands; it is kept so the
// next hints are instant. THE KEPT LINE ALWAYS STARTS AT THE MOVE BEING HINTED: a hint is its first move, and when
// the player plays exactly that move the line loses it and now starts at the next. Anything else (another move,
// Undo, Restart) throws the line away, and the next hint solves afresh.
// (The bug this replaces: the line was kept from its SECOND move after a solve and then cut again when the hinted
// move was played, so the second hint in a row skipped a move: on Cardium 9, "move B" and then "move B back".)
import type { Move } from '../engine/index.ts';

/** What to keep after a solve: the whole line (the hint is its first move), or nothing if there is none. */
export const lineFrom = (path: Move[] | null | undefined): Move[] | null => (path && path.length > 0 ? path : null);

/** The hint a kept line gives: its first move. */
export const hintOf = (line: Move[] | null): Move | null => line?.[0] ?? null;

/**
 * What to keep after the pad changed. `played` is the move the player made (none for Undo and Restart); `hint` is
 * the hint that was showing (none if no hint was up). Only the hinted move itself carries the line on.
 */
export function lineAfter(line: Move[] | null, hint: Move | null, played?: { id: string; delta: number }): Move[] | null {
  if (!line || !hint || !played || played.id !== hint.id || played.delta !== hint.delta) return null;
  // (The line starts at the hint: so that is the move just played.)
  if (line[0].id !== hint.id || line[0].delta !== hint.delta) return null;
  return line.length > 1 ? line.slice(1) : null;
}
