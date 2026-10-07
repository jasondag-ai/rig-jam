import { gateFor } from './level.ts';
import { sizeOf, type Cell, type GameState, type Level, type Truck } from './types.ts';

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
  /** How far the truck really went: the delta asked for, or the whole slide if it drove onto muskeg. */
  delta: number;
}

export function newGame(level: Level): GameState {
  return { level, trucks: level.trucks.map((t) => ({ ...t })), moves: 0, history: [] };
}

function occupancy(trucks: readonly Truck[], obstacles: readonly Cell[], SIZE: number): (string | null)[] {
  const grid: (string | null)[] = new Array(SIZE * SIZE).fill(null);
  for (const o of obstacles) grid[o.row * SIZE + o.col] = '#';
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
  const SIZE = sizeOf(state.level);
  const grid = occupancy(state.trucks, state.level.obstacles, SIZE);
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
  if (!gateOpen(state, truck)) return { min, max, exitDelta: null }; // convoy gate: a wall for now
  // Reaching an open gate drives out. A truck already parked against it (it waited there while
  // its gate was closed) drives out by sliding one more cell into the gate.
  if (side === 'left' || side === 'top') {
    if (pos === 0) return { min: -1, max, exitDelta: -1 };
    return { min, max, exitDelta: pos + min === 0 ? min : null };
  }
  if (pos + truck.length - 1 === SIZE - 1) return { min, max: 1, exitDelta: 1 };
  return { min, max, exitDelta: pos + truck.length - 1 + max === SIZE - 1 ? max : null };
}

/** The convoy number a color's gates are waiting for, or null if that color has no convoy left. */
export function convoyWaitingFor(state: GameState, color: Truck['color']): 1 | 2 | null {
  const numbers = state.trucks.filter((t) => t.color === color && t.convoy).map((t) => t.convoy!);
  return numbers.length ? (Math.min(...numbers) as 1 | 2) : null;
}

/** A shift-change gate is open to the move about to be made only if that move's number is even. */
export function shiftOpen(state: GameState): boolean {
  return (state.moves + 1) % 2 === 0;
}

/**
 * Whether a truck's gate will let it out on the next move. A gate is closed to a convoy truck out
 * of its turn, to a tanker that has not loaded yet, and (a shift-change gate) on odd moves.
 */
export function gateOpen(state: GameState, truck: Truck): boolean {
  if (truck.convoy && convoyWaitingFor(state, truck.color) !== truck.convoy) return false;
  if (truck.load && !truck.loaded) return false;
  if (gateFor(state.level, truck).shift && !shiftOpen(state)) return false;
  return true;
}

const has = (cells: readonly { row: number; col: number }[], row: number, col: number) => cells.some((c) => c.row === row && c.col === col);

/**
 * Where a move of `delta` really ends. Ordinarily at `delta`. But a truck that drives ONTO muskeg
 * (its leading end enters a muskeg cell) cannot stop: it slides on the same way until it hits
 * something, which is the end of its range that way (out through its gate, if that is the end).
 */
export function slideEnd(state: GameState, truck: Truck, delta: number, range: MoveRange): number {
  const muskeg = state.level.muskeg;
  if (!muskeg.length) return delta;
  const SIZE = sizeOf(state.level);
  const h = truck.orient === 'h';
  const dir = Math.sign(delta);
  const pos = h ? truck.col : truck.row;
  for (let step = 1; step <= Math.abs(delta); step++) {
    // The cell its leading end moves onto at this step.
    const lead = dir > 0 ? pos + truck.length - 1 + step : pos - step;
    if (lead < 0 || lead >= SIZE) break; // out through the gate: no cell there
    if (has(muskeg, h ? truck.row : lead, h ? lead : truck.col)) return dir > 0 ? range.max : range.min;
  }
  return delta;
}

/** Is any part of the truck over a load rack? */
export function onRack(level: Level, truck: Truck): boolean {
  if (!level.racks.length) return false;
  for (let i = 0; i < truck.length; i++) if (has(level.racks, truck.orient === 'h' ? truck.row : truck.row + i, truck.orient === 'h' ? truck.col + i : truck.col)) return true;
  return false;
}

/** Slides a truck by delta cells. Returns null if the move is illegal or zero. */
export function tryMove(state: GameState, id: string, delta: number): MoveResult | null {
  const range = getMoveRange(state, id);
  if (!range || !Number.isInteger(delta) || delta === 0 || delta < range.min || delta > range.max) return null;

  const truck = state.trucks.find((t) => t.id === id)!;
  const end = slideEnd(state, truck, delta, range);
  const exited = end === range.exitDelta;
  const trucks = exited
    ? state.trucks.filter((t) => t.id !== id)
    : state.trucks.map((t) => {
        if (t.id !== id) return t;
        const moved: Truck = t.orient === 'h' ? { ...t, col: t.col + end } : { ...t, row: t.row + end };
        // A tanker that comes to rest on a load rack is loaded from then on.
        return moved.load && !moved.loaded && onRack(state.level, moved) ? { ...moved, loaded: true as const } : moved;
      });

  return {
    state: { ...state, trucks, moves: state.moves + 1, history: [...state.history, state.trucks] },
    exited,
    delta: end,
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
