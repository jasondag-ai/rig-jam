import { getMoveRange, tryMove } from './game.ts';
import { gateFor } from './level.ts';
import { SIZE, type GameState, type Level, type Move, type Truck } from './types.ts';

/**
 * A position's key. Truck order never changes during play (moves map, exits filter), so no sort is
 * needed. A tanker that has loaded is a different position from one that has not; and where a level
 * has a shift-change gate, so is the same layout on an odd move and on an even one (`parity`).
 */
function key(trucks: readonly Truck[], parity: string): string {
  let k = parity;
  for (const t of trucks) k += `${t.id}${t.row}${t.col}${t.loaded ? 'L' : ''}|`;
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
 * The reference search, written straight on the game's own rules (`getMoveRange`, `tryMove`): slow,
 * and plainly right. `solve` below is the same search on packed numbers; tests hold the two to the
 * same answers.
 */
export function solveSlow(level: Level, maxStates = 500_000, trucks: Truck[] = level.trucks, moves = 0): Move[] | null {
  if (trucks.length === 0) return [];
  const shifts = level.gates.some((g) => g.shift);
  const parity = (n: number) => (shifts ? String(n % 2) : '');
  const seen = new Set([key(trucks, parity(moves))]);
  let frontier: Node[] = [{ trucks, parent: null, move: null }];
  const scratch: GameState = { level, trucks, moves, history: [] };

  for (let depth = moves; frontier.length > 0; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      scratch.trucks = node.trucks;
      scratch.moves = depth;
      for (const t of node.trucks) {
        const range = getMoveRange(scratch, t.id)!;
        for (let delta = range.min; delta <= range.max; delta++) {
          const result = tryMove(scratch, t.id, delta);
          if (!result) continue;
          const child: Node = { trucks: result.state.trucks, parent: node, move: { id: t.id, delta: result.delta } };
          if (child.trucks.length === 0) return pathTo(child);
          const k = key(child.trucks, parity(depth + 1));
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

const GONE = 7;

/**
 * Breadth-first search for the shortest solution from `trucks` (default: the level's start), with
 * `moves` already made (it matters only to shift-change gates). Each move in the answer carries the
 * delta the truck really travels (a slide on muskeg included). Returns null if the position can't
 * be cleared. Throws SolverLimitError past `maxStates`.
 *
 * The same rules as game.ts, on numbers: a position is each truck's place along its own lane (3
 * bits; 7 = driven out), a bit for each tanker that has loaded, and the move's parity where a
 * shift-change gate cares. Many times faster than `solveSlow`, which the levels of regions 4 and 5
 * (par 14 to 24) need, both to be generated and to give a hint on a phone.
 */
export function solve(level: Level, maxStates = 500_000, trucks: Truck[] = level.trucks, moves = 0): Move[] | null {
  const n = trucks.length;
  if (n === 0) return [];
  const loaders = trucks.filter((t) => t.load).length;
  // Past what fits a number exactly (a board this size never gets there), the reference search does it.
  if (3 * n + loaders + 1 > 52) return solveSlow(level, maxStates, trucks, moves);
  const shifts = level.gates.some((g) => g.shift);

  // Each truck, once: its lane, its gate, what lies along its lane.
  const horiz = new Uint8Array(n), line = new Uint8Array(n), len = new Uint8Array(n), fwd = new Uint8Array(n);
  const shiftGate = new Uint8Array(n), convoy = new Uint8Array(n), color = new Uint8Array(n), loadBit = new Int8Array(n).fill(-1);
  const muskeg = new Uint8Array(n * SIZE), rackAt = new Uint8Array(n * SIZE);
  const start = new Uint8Array(n);
  let startLoaded = 0, bits = 0;
  const colors: string[] = [];
  trucks.forEach((t, i) => {
    const gate = gateFor(level, t);
    horiz[i] = t.orient === 'h' ? 1 : 0;
    line[i] = t.orient === 'h' ? t.row : t.col;
    len[i] = t.length;
    fwd[i] = gate.side === 'right' || gate.side === 'bottom' ? 1 : 0;
    shiftGate[i] = gate.shift ? 1 : 0;
    convoy[i] = t.convoy ?? 0;
    if (!colors.includes(t.color)) colors.push(t.color);
    color[i] = colors.indexOf(t.color);
    start[i] = t.orient === 'h' ? t.col : t.row;
    for (const c of level.muskeg) if ((t.orient === 'h' ? c.row : c.col) === line[i]) muskeg[i * SIZE + (t.orient === 'h' ? c.col : c.row)] = 1;
    if (t.load) {
      loadBit[i] = bits++;
      if (t.loaded) startLoaded |= 1 << loadBit[i];
      // The places along its lane where some part of it is over a rack.
      for (const c of level.racks) {
        if ((t.orient === 'h' ? c.row : c.col) !== line[i]) continue;
        const at = t.orient === 'h' ? c.col : c.row;
        for (let p = Math.max(0, at - t.length + 1); p <= Math.min(SIZE - t.length, at); p++) rackAt[i * SIZE + p] = 1;
      }
    }
  });
  const fixed = new Uint8Array(SIZE * SIZE);
  for (const o of level.obstacles) fixed[o.row * SIZE + o.col] = 1;

  // Every position found, in the order found: places, loaded bits, and how it was reached.
  let cap = Math.min(maxStates + 1, 1 << 14);
  let P = new Uint8Array(cap * n), L = new Uint16Array(cap), parent = new Int32Array(cap), by = new Int8Array(cap), how = new Int8Array(cap);
  const grow = () => {
    cap = Math.min(maxStates + 1, cap * 2);
    const copy = <T extends Uint8Array | Uint16Array | Int32Array | Int8Array>(old: T, size: number): T => {
      const next = new (old.constructor as new (n: number) => T)(size);
      next.set(old);
      return next;
    };
    P = copy(P, cap * n); L = copy(L, cap); parent = copy(parent, cap); by = copy(by, cap); how = copy(how, cap);
  };
  const keyOf = (at: number, loaded: number, odd: number): number => {
    let k = shifts ? odd : 0;
    k = k * (1 << bits) + loaded;
    for (let i = 0; i < n; i++) k = k * 8 + P[at + i];
    return k;
  };
  P.set(start, 0);
  L[0] = startLoaded;
  parent[0] = -1;
  let count = 1;
  const seen = new Set<number>([keyOf(0, startLoaded, moves % 2)]);
  const grid = new Uint8Array(SIZE * SIZE);
  const path = (last: number): Move[] => {
    const out: Move[] = [];
    for (let s = last; parent[s] >= 0; s = parent[s]) out.push({ id: trucks[by[s]].id, delta: how[s] });
    return out.reverse();
  };

  let from = 0, to = 1;
  for (let depth = moves; from < to; depth++) {
    const even = (depth + 1) % 2 === 0; // is the move about to be made an even one?
    for (let s = from; s < to; s++) {
      const at = s * n;
      const loaded = L[s];
      // Where everything stands.
      grid.set(fixed);
      for (let i = 0; i < n; i++) {
        const p = P[at + i];
        if (p === GONE) continue;
        for (let k = 0; k < len[i]; k++) grid[horiz[i] ? line[i] * SIZE + p + k : (p + k) * SIZE + line[i]] = 1;
      }
      for (let i = 0; i < n; i++) {
        const pos = P[at + i];
        if (pos === GONE) continue;
        const h = horiz[i], ln = line[i], length = len[i];
        let p = pos - 1;
        while (p >= 0 && !grid[h ? ln * SIZE + p : p * SIZE + ln]) p--;
        let min = p + 1 - pos;
        p = pos + length;
        while (p < SIZE && !grid[h ? ln * SIZE + p : p * SIZE + ln]) p++;
        let max = p - pos - length;
        // Will its gate take it on this move? (Convoy order, a tanker's load, a shift-change gate's clock.)
        let open = true;
        if (convoy[i] === 2) for (let j = 0; j < n; j++) if (j !== i && color[j] === color[i] && convoy[j] === 1 && P[at + j] !== GONE) open = false;
        if (loadBit[i] >= 0 && !(loaded & (1 << loadBit[i]))) open = false;
        if (shiftGate[i] && !even) open = false;
        let exit = 99;
        if (open) {
          if (!fwd[i]) {
            if (pos === 0) exit = min = -1;
            else if (pos + min === 0) exit = min;
          } else if (pos + length === SIZE) exit = max = 1;
          else if (pos + length + max === SIZE) exit = max;
        }
        let lastEnd = 99;
        for (let delta = min; delta <= max; delta++) {
          if (delta === 0) continue;
          // A truck that drives onto muskeg slides on to the end of its range that way.
          let end = delta;
          const dir = delta > 0 ? 1 : -1;
          for (let step = 1; step <= delta * dir; step++) {
            const lead = dir > 0 ? pos + length - 1 + step : pos - step;
            if (lead < 0 || lead >= SIZE) break;
            if (muskeg[i * SIZE + lead]) {
              end = dir > 0 ? max : min;
              break;
            }
          }
          if (end === lastEnd) continue;
          lastEnd = end;
          const out = end === exit;
          const np = out ? GONE : pos + end;
          const nl = !out && loadBit[i] >= 0 && rackAt[i * SIZE + np] ? loaded | (1 << loadBit[i]) : loaded;
          if (count === cap) {
            if (cap > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
            grow();
          }
          const child = count * n;
          P.copyWithin(child, at, at + n);
          P[child + i] = np;
          const k = keyOf(child, nl, (depth + 1) % 2);
          if (seen.has(k)) continue;
          seen.add(k);
          L[count] = nl;
          parent[count] = s;
          by[count] = i;
          how[count] = end;
          count++;
          if (out) {
            let all = true;
            for (let j = 0; j < n; j++) if (P[child + j] !== GONE) { all = false; break; }
            if (all) return path(count - 1);
          }
          if (seen.size > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
        }
      }
    }
    from = to;
    to = count;
  }
  return null;
}

/** The first move of a shortest solution from the current position, or null if already won. */
export function nextMove(state: GameState): Move | null {
  return solve(state.level, 500_000, state.trucks, state.moves)?.[0] ?? null;
}
