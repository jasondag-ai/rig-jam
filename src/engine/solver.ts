import { getMoveRange, tryMove } from './game.ts';
import type { GameState, Level, Move, Truck } from './types.ts';

/** Truck order never changes during play (moves map, exits filter), so no sort is needed. */
function key(trucks: readonly Truck[]): string {
  let k = '';
  for (const t of trucks) k += `${t.id}${t.row}${t.col}|`;
  return k;
}

interface Node {
  trucks: Truck[];
  parent: Node | null;
  move: Move | null;
}

function pathTo(node: Node): Move[] {
  const path: Move[] = [];
  for (let n: Node | null = node; n?.move; n = n.parent) path.push(n.move);
  return path.reverse();
}

export class SolverLimitError extends Error {}

/**
 * Breadth-first search for the shortest solution from `trucks` (default: the level's start).
 * Returns null if the position can't be cleared. Throws SolverLimitError past `maxStates`.
 */
export function solve(level: Level, maxStates = 500_000, trucks: Truck[] = level.trucks): Move[] | null {
  if (trucks.length === 0) return [];
  const seen = new Set([key(trucks)]);
  let frontier: Node[] = [{ trucks, parent: null, move: null }];
  const scratch: GameState = { level, trucks, moves: 0, history: [] };

  while (frontier.length > 0) {
    const next: Node[] = [];
    for (const node of frontier) {
      scratch.trucks = node.trucks;
      for (const t of node.trucks) {
        const range = getMoveRange(scratch, t.id)!;
        for (let delta = range.min; delta <= range.max; delta++) {
          const result = tryMove(scratch, t.id, delta);
          if (!result) continue;
          const child: Node = { trucks: result.state.trucks, parent: node, move: { id: t.id, delta } };
          if (child.trucks.length === 0) return pathTo(child);
          const k = key(child.trucks);
          if (seen.has(k)) continue;
          seen.add(k);
          if (seen.size > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
          next.push(child);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** The first move of a shortest solution from the current position, or null if already won. */
export function nextMove(state: GameState): Move | null {
  return solve(state.level, 500_000, state.trucks)?.[0] ?? null;
}
