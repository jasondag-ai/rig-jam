// The best line from a position, worked out off the page's own thread (best.ts; the `?demo=1` link only): the same
// solve a hint makes, so the two always agree. Asked with { seq, level, trucks, moves }; answers { seq, n }, n the
// number of moves still needed (null if there is no way out, or the search ran out of room).
import { SolverLimitError, solve, type Level, type Truck } from '../engine/index.ts';

const me = self as unknown as { onmessage: ((e: MessageEvent<{ seq: number; level: Level; trucks: Truck[]; moves: number }>) => void) | null; postMessage: (m: { seq: number; n: number | null }) => void };
me.onmessage = (e) => {
  const { seq, level, trucks, moves } = e.data;
  let n: number | null = null;
  try {
    n = solve(level, 500_000, trucks, moves)?.length ?? null;
  } catch (err) {
    if (!(err instanceof SolverLimitError)) throw err;
  }
  me.postMessage({ seq, n });
};
