// THE BEST SCORE STILL POSSIBLE (job U12). A small line under the moves and par in the HUD: "Best from here: N",
// N being the moves already made plus the best line from where the pad stands; once that is over par,
// "Par out of reach: best N" in the warning colour.
//   NORMAL PLAY: only while a hint shows, from the hint's own solve (hint-line.ts keeps that line, and it starts at
//     the hinted move). A hint costs a hint, so free Undo cannot be used to test moves for nothing.
//   THE HIDDEN `?demo=1` LINK (demo-link.ts; nothing is saved there): always on, worked out again after every move,
//     Undo and Restart, in a Web Worker (best-worker.ts) so the board and a drag never wait for it; nothing shows
//     until the answer is in. Settings' own demo switch does not turn it on.
import type { GameState } from '../engine/index.ts';

/** N: the moves made so far plus the length of the best line from here. Null where there is no line (none known, or none exists). */
export const bestFrom = (made: number, line: readonly unknown[] | null | undefined): number | null => (line ? made + line.length : null);

/** What the line says for N on a pad of this par, and whether par is out of reach. */
export function bestLine(n: number, par: number): { text: string; over: boolean } {
  return n <= par ? { text: `Best from here: ${n}`, over: false } : { text: `Par out of reach: best ${n}`, over: true };
}

/** A position as text: the moves made and where every truck still on the pad stands (and whether a tanker has loaded). The same key = the same answer. */
export function positionKey(state: GameState): string {
  return `${state.moves}|${state.trucks.map((t) => `${t.id}:${t.row},${t.col}${(t as { loaded?: boolean }).loaded ? 'L' : ''}`).join(' ')}`;
}
