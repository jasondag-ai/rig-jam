import { getMoveRange, tryMove } from './game.ts';
import type { GameState, Level, Move, Truck } from './types.ts';

function key(trucks: readonly Truck[]): string {
  return trucks
    .map((t) => `${t.id}${t.row}${t.col}`)
    .sort()
    .join('|');
}

/** Breadth-first search for the shortest solution. Returns null if the level can't be cleared. */
export function solve(level: Level, maxStates = 500_000): Move[] | null {
  const start: GameState = { level, trucks: level.trucks, moves: 0, history: [] };
  const seen = new Set([key(start.trucks)]);
  let frontier: { state: GameState; path: Move[] }[] = [{ state: start, path: [] }];

  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { state, path } of frontier) {
      for (const t of state.trucks) {
        const range = getMoveRange(state, t.id)!;
        for (let delta = range.min; delta <= range.max; delta++) {
          const result = tryMove(state, t.id, delta);
          if (!result) continue;
          const nextPath = [...path, { id: t.id, delta }];
          if (result.state.trucks.length === 0) return nextPath;
          const k = key(result.state.trucks);
          if (seen.has(k)) continue;
          seen.add(k);
          if (seen.size > maxStates) throw new Error(`solver gave up on level ${level.id}`);
          next.push({ state: { ...result.state, history: [] }, path: nextPath });
        }
      }
    }
    frontier = next;
  }
  return null;
}
