import { gateFor } from './level.ts';
import { SIZE, type GameState, type Level, type Truck } from './types.ts';

export interface MoveRange {
  /** Most negative legal delta (0 if blocked), toward the left or top. */
  min: number;
  /** Most positive legal delta (0 if blocked), toward the right or bottom. */
  max: number;
  /** The delta that drives the truck out through its gate, or null if the way is blocked. */
  exitDelta: number | null;
}

export interface MoveResult {
  state: GameState;
  exited: boolean;
}

export function newGame(level: Level): GameState {
  return { level, trucks: level.trucks.map((t) => ({ ...t })), moves: 0, history: [] };
}

function occupancy(trucks: readonly Truck[]): (string | null)[] {
  const grid: (string | null)[] = new Array(SIZE * SIZE).fill(null);
  for (const t of trucks) {
    for (let i = 0; i < t.length; i++) {
      const r = t.orient === 'h' ? t.row : t.row + i;
      const c = t.orient === 'h' ? t.col + i : t.col;
      grid[r * SIZE + c] = t.id;
    }
  }
  return grid;
}

/** How far a truck can slide each way, and whether it can reach its gate. */
export function getMoveRange(state: GameState, id: string): MoveRange | null {
  const truck = state.trucks.find((t) => t.id === id);
  if (!truck) return null;
  const grid = occupancy(state.trucks);
  const h = truck.orient === 'h';
  const pos = h ? truck.col : truck.row;
  const empty = (p: number) => grid[h ? truck.row * SIZE + p : p * SIZE + truck.col] === null;

  let p = pos - 1;
  while (p >= 0 && empty(p)) p--;
  const min = p + 1 - pos;

  p = pos + truck.length;
  while (p < SIZE && empty(p)) p++;
  const max = p - pos - truck.length;

  const side = gateFor(state.level, truck).side;
  let exitDelta: number | null = null;
  if ((side === 'left' || side === 'top') && pos + min === 0) exitDelta = min;
  if ((side === 'right' || side === 'bottom') && pos + truck.length - 1 + max === SIZE - 1) exitDelta = max;

  return { min, max, exitDelta };
}

/** Slides a truck by delta cells. Returns null if the move is illegal or zero. */
export function tryMove(state: GameState, id: string, delta: number): MoveResult | null {
  const range = getMoveRange(state, id);
  if (!range || !Number.isInteger(delta) || delta === 0 || delta < range.min || delta > range.max) return null;

  const exited = delta === range.exitDelta;
  const trucks = exited
    ? state.trucks.filter((t) => t.id !== id)
    : state.trucks.map((t) =>
        t.id !== id ? t : t.orient === 'h' ? { ...t, col: t.col + delta } : { ...t, row: t.row + delta },
      );

  return {
    state: { ...state, trucks, moves: state.moves + 1, history: [...state.history, state.trucks] },
    exited,
  };
}

export function undo(state: GameState): GameState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { ...state, trucks: previous, moves: state.moves - 1, history: state.history.slice(0, -1) };
}

export function canUndo(state: GameState): boolean {
  return state.history.length > 0;
}

export function isWon(state: GameState): boolean {
  return state.trucks.length === 0;
}

/** Side of the truck the cab is drawn on (the side its gate is on). */
export function cabSide(level: Level, truck: Truck) {
  return gateFor(level, truck).side;
}
