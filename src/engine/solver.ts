import { getMoveRange, tryMove } from './game.ts';
import { gateFor } from './level.ts';
import { SIZE, sizeOf, type GameState, type Level, type Move, type Truck } from './types.ts';

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
 * A level's rules on numbers, worked out once: each truck's lane, gate and what lies along its
 * lane, and `expand`, which calls `emit` for every move from one position. `solve` (breadth-first)
 * and `solveAStar` both search with it, so the two can only differ in the order they look.
 * A truck's place is where it stands along its own lane (0 to size - 2; `GONE` = driven out), so
 * three bits a truck hold it on a pad of 6 or of 8.
 */
interface Model {
  n: number;
  /** The pad's side in cells. */
  N: number;
  shifts: boolean;
  /** How many tankers there are (a loaded bit each). */
  bits: number;
  start: Uint8Array;
  startLoaded: number;
  horiz: Uint8Array;
  line: Uint8Array;
  len: Uint8Array;
  fwd: Uint8Array;
  loadBit: Int8Array;
  fixed: Uint8Array;
  /**
   * Every move from the position at `P[at .. at + n]` with `loaded`, the move about to be made
   * being an even one or not: `emit(truck, its new place, the new loaded bits, how far it really
   * went, whether it drove out)`.
   */
  expand(P: Uint8Array, at: number, loaded: number, even: boolean, emit: (i: number, np: number, nl: number, end: number, out: boolean) => void): void;
}

function compile(level: Level, trucks: readonly Truck[]): Model {
  const n = trucks.length, SIZE = sizeOf(level);
  const shifts = level.gates.some((g) => g.shift);
  // Each truck, once: its lane, its gate, what lies along its lane.
  const horiz = new Uint8Array(n), line = new Uint8Array(n), len = new Uint8Array(n), fwd = new Uint8Array(n);
  const shiftGate = new Uint8Array(n), convoy = new Uint8Array(n), color = new Uint8Array(n), loadBit = new Int8Array(n).fill(-1);
  const muskeg = new Uint8Array(n * SIZE), rackAt = new Uint8Array(n * SIZE);
  // Soft ground along a rig's lane (a wall for it; 2-cell trucks have none).
  const softAt = new Uint8Array(n * SIZE);
  const anySoft = (level.soft ?? []).length > 0;
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
    if (t.length === 3) for (const c of level.soft ?? []) if ((t.orient === 'h' ? c.row : c.col) === line[i]) softAt[i * SIZE + (t.orient === 'h' ? c.col : c.row)] = 1;
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
  const grid = new Uint8Array(SIZE * SIZE);

  const expand: Model['expand'] = (P, at, loaded, even, emit) => {
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
      while (p >= 0 && !grid[h ? ln * SIZE + p : p * SIZE + ln] && !(anySoft && softAt[i * SIZE + p])) p--;
      let min = p + 1 - pos;
      p = pos + length;
      while (p < SIZE && !grid[h ? ln * SIZE + p : p * SIZE + ln] && !(anySoft && softAt[i * SIZE + p])) p++;
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
        emit(i, np, nl, end, out);
      }
    }
  };
  return { n, N: SIZE, shifts, bits, start, startLoaded, horiz, line, len, fwd, loadBit, fixed, expand };
}

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
  // A BIG PAD (8 x 8) GOES TO A*: breadth-first would look at millions of positions there (seconds on a laptop, far too long
  // for a hint on a phone), A* at thousands, and it gives the same par. So does anything past what fits one number (18 trucks).
  if (sizeOf(level) > SIZE || 3 * n + loaders + 1 > 52) return solveAStar(level, Math.max(maxStates, 4_000_000), trucks, moves);
  const m = compile(level, trucks);
  const { shifts, bits } = m;

  // Every position found, in the order found: places, loaded bits, and how it was reached.
  let cap = Math.min(maxStates + 1, 1 << 14);
  let P = new Uint8Array(cap * n), L = new Uint16Array(cap), parent = new Int32Array(cap), by = new Int8Array(cap), how = new Int8Array(cap);
  const grow = () => {
    cap = Math.min(maxStates + 1, cap * 2);
    P = copyTo(P, cap * n); L = copyTo(L, cap); parent = copyTo(parent, cap); by = copyTo(by, cap); how = copyTo(how, cap);
  };
  const keyOf = (at: number, loaded: number, odd: number): number => {
    let k = shifts ? odd : 0;
    k = k * (1 << bits) + loaded;
    for (let i = 0; i < n; i++) k = k * 8 + P[at + i];
    return k;
  };
  P.set(m.start, 0);
  L[0] = m.startLoaded;
  parent[0] = -1;
  let count = 1;
  const seen = new Set<number>([keyOf(0, m.startLoaded, moves % 2)]);
  const path = (last: number): Move[] => {
    const out: Move[] = [];
    for (let s = last; parent[s] >= 0; s = parent[s]) out.push({ id: trucks[by[s]].id, delta: how[s] });
    return out.reverse();
  };

  let from = 0, to = 1;
  let s = 0, at = 0, odd = 0, won = -1;
  const emit = (i: number, np: number, nl: number, end: number, out: boolean) => {
    if (won >= 0) return;
    if (count === cap) {
      if (cap > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
      grow();
    }
    const child = count * n;
    P.copyWithin(child, at, at + n);
    P[child + i] = np;
    const k = keyOf(child, nl, odd);
    if (seen.has(k)) return;
    seen.add(k);
    L[count] = nl;
    parent[count] = s;
    by[count] = i;
    how[count] = end;
    count++;
    if (out) {
      let all = true;
      for (let j = 0; j < n; j++) if (P[child + j] !== GONE) { all = false; break; }
      if (all) { won = count - 1; return; }
    }
    if (seen.size > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
  };
  for (let depth = moves; from < to; depth++) {
    const even = (depth + 1) % 2 === 0; // is the move about to be made an even one?
    odd = (depth + 1) % 2;
    for (s = from; s < to; s++) {
      at = s * n;
      m.expand(P, at, L[s], even, emit);
      if (won >= 0) return path(won);
    }
    from = to;
    to = count;
  }
  return null;
}

function copyTo<T extends Uint8Array | Uint16Array | Int32Array | Int8Array | Uint32Array>(old: T, size: number): T {
  const next = new (old.constructor as new (n: number) => T)(size);
  next.set(old);
  return next;
}

// ---------- A* ----------

/**
 * What A* reckons is still to do, never more than the truth:
 * - `left`: the trucks still on the pad (each needs at least its own drive out).
 * - `rings`: that, plus one move for every RING of trucks standing in each other's way out (A in
 *   B's way, B in C's, ... back to A: none of them can be the first out, so one of them has to
 *   make a move that is not its drive out; rings that share no truck need a move each), or one
 *   for every tanker not yet loaded (it must stop on a rack first), whichever is more.
 */
export type Heuristic = 'left' | 'rings';

export interface AStarResult {
  /** The shortest solution, or null if there is none. */
  moves: Move[] | null;
  /** Positions looked at (taken off the queue) and positions found. */
  expanded: number;
  found: number;
}

/** A* can hold a position of this many trucks (three 30-bit words; tankers and the move's parity share the last). */
const ASTAR_TRUCKS = 26;

/**
 * A* for the shortest solution: the same rules and the same answer's length as `solve`, looking
 * first where `heuristic` says the end is nearest. It is what a Big Pad needs (8 x 8, 14 to 18
 * trucks: far too many positions to look at them all). A position may be reached again by a
 * shorter way and is then looked at again, so the answer is the shortest whatever the heuristic,
 * as long as it never overestimates. Throws SolverLimitError past `maxStates` positions found.
 */
export function searchAStar(level: Level, maxStates = 2_000_000, trucks: Truck[] = level.trucks, moves = 0, heuristic: Heuristic = 'rings'): AStarResult {
  const n = trucks.length;
  if (n === 0) return { moves: [], expanded: 0, found: 0 };
  const m = compile(level, trucks);
  const { N, bits, shifts, horiz, line, len, fwd, loadBit } = m;
  if (n > ASTAR_TRUCKS || bits > 5) return { moves: solveSlow(level, maxStates, trucks, moves), expanded: 0, found: 0 };

  // ---- what is still to do ----
  const who = new Int8Array(N * N); // which truck stands on each cell (-1: nobody)
  const inWay = new Int32Array(n); // for each truck, the trucks standing between it and its gate (a bit each)
  const estimate = (P: Uint8Array, at: number, loaded: number): number => {
    let left = 0;
    for (let i = 0; i < n; i++) if (P[at + i] !== GONE) left++;
    if (heuristic === 'left' || left === 0) return left;
    let unloaded = 0;
    for (let i = 0; i < n; i++) if (loadBit[i] >= 0 && P[at + i] !== GONE && !(loaded & (1 << loadBit[i]))) unloaded++;
    who.fill(-1);
    for (let i = 0; i < n; i++) {
      const p = P[at + i];
      if (p === GONE) continue;
      for (let k = 0; k < len[i]; k++) who[horiz[i] ? line[i] * N + p + k : (p + k) * N + line[i]] = i;
    }
    let any = 0;
    for (let i = 0; i < n; i++) {
      inWay[i] = 0;
      const p = P[at + i];
      if (p === GONE) continue;
      const a = fwd[i] ? p + len[i] : 0, b = fwd[i] ? N : p;
      let mask = 0;
      for (let q = a; q < b; q++) {
        const w = who[horiz[i] ? line[i] * N + q : q * N + line[i]];
        if (w >= 0) mask |= 1 << w;
      }
      inWay[i] = mask;
      any |= mask;
    }
    if (!any) return left + unloaded;
    // Rings that share no truck, the shortest first from each truck in turn (breadth-first back to itself).
    let rings = 0, free = 0;
    for (let i = 0; i < n; i++) if (inWay[i]) free |= 1 << i;
    for (let i = 0; i < n; i++) {
      if (!(free & (1 << i))) continue;
      let head = 0, tail = 0, seen = 1 << i, hit = -1;
      queue[tail++] = i;
      from[i] = -1;
      while (head < tail && hit < 0) {
        const x = queue[head++];
        let next = inWay[x] & free;
        while (next) {
          const bit = next & -next;
          next ^= bit;
          const y = 31 - Math.clz32(bit);
          if (y === i) { hit = x; break; }
          if (seen & bit) continue;
          seen |= bit;
          from[y] = x;
          queue[tail++] = y;
        }
      }
      if (hit < 0) continue;
      rings++;
      for (let x = hit; x >= 0; x = from[x]) free &= ~(1 << x);
    }
    return left + Math.max(rings, unloaded);
  };
  const queue = new Int8Array(n), from = new Int8Array(n);

  // ---- every position found ----
  let cap = Math.min(maxStates + 1, 1 << 14);
  let P = new Uint8Array(cap * n), L = new Uint8Array(cap), parent = new Int32Array(cap), by = new Int8Array(cap), how = new Int8Array(cap);
  let G = new Uint16Array(cap), H = new Uint8Array(cap), W0 = new Uint32Array(cap), W1 = new Uint32Array(cap), W2 = new Uint32Array(cap);
  const grow = () => {
    cap = Math.min(maxStates + 1, cap * 2);
    P = copyTo(P, cap * n); L = copyTo(L, cap); parent = copyTo(parent, cap); by = copyTo(by, cap); how = copyTo(how, cap);
    G = copyTo(G, cap); H = copyTo(H, cap); W0 = copyTo(W0, cap); W1 = copyTo(W1, cap); W2 = copyTo(W2, cap);
  };
  // A position's three words: ten trucks in each of the first two, the rest with the loaded bits and the parity in the third.
  let k0 = 0, k1 = 0, k2 = 0;
  const words = (at: number, loaded: number, odd: number) => {
    k0 = 0; k1 = 0; k2 = (shifts ? odd : 0) * 32 + loaded;
    for (let i = 0; i < n; i++) {
      if (i < 10) k0 = k0 * 8 + P[at + i];
      else if (i < 20) k1 = k1 * 8 + P[at + i];
      else k2 = k2 * 8 + P[at + i];
    }
  };
  // The table: open addressing, a slot holds a position's number + 1.
  let slots = 1 << 15, table = new Int32Array(slots);
  const slotOf = (a: number, b: number, c: number, mask: number) => {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15) ^ b, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 13) ^ c, 0x27d4eb2f);
    return (h ^ (h >>> 16)) & mask;
  };
  const lookup = (): number => {
    const mask = slots - 1;
    for (let s = slotOf(k0, k1, k2, mask); ; s = (s + 1) & mask) {
      const e = table[s];
      if (e === 0) return -s - 1; // not there: it would go in slot s
      const idx = e - 1;
      if (W0[idx] === k0 && W1[idx] === k1 && W2[idx] === k2) return idx;
    }
  };
  const rehash = () => {
    slots *= 2;
    table = new Int32Array(slots);
    const mask = slots - 1;
    for (let idx = 0; idx < count; idx++) {
      let s = slotOf(W0[idx], W1[idx], W2[idx], mask);
      while (table[s] !== 0) s = (s + 1) & mask;
      table[s] = idx + 1;
    }
  };

  // ---- the queue: a stack of positions for each f = g + h (the newest first, so it dives) ----
  const buckets: number[][] = [];
  const push = (f: number, idx: number) => (buckets[f] ??= []).push(idx);

  let count = 1, expanded = 0;
  P.set(m.start, 0);
  L[0] = m.startLoaded;
  parent[0] = -1;
  G[0] = 0;
  H[0] = estimate(P, 0, m.startLoaded);
  words(0, m.startLoaded, moves % 2);
  W0[0] = k0; W1[0] = k1; W2[0] = k2;
  table[-lookup() - 1] = 1;
  push(H[0], 0);

  let s = 0, at = 0, g = 0, odd = 0, lowest = H[0];
  const emit = (i: number, np: number, nl: number, end: number) => {
    if (count === cap) {
      if (cap > maxStates) throw new SolverLimitError(`solver gave up on level ${level.id}`);
      grow();
    }
    const child = count * n;
    P.copyWithin(child, at, at + n);
    P[child + i] = np;
    words(child, nl, odd);
    const found = lookup();
    if (found >= 0) {
      // Reached before: only a shorter way matters, and then it is looked at again.
      if (G[found] <= g + 1) return;
      G[found] = g + 1;
      parent[found] = s;
      by[found] = i;
      how[found] = end;
      const f = g + 1 + H[found];
      push(f, found);
      if (f < lowest) lowest = f;
      return;
    }
    L[count] = nl;
    parent[count] = s;
    by[count] = i;
    how[count] = end;
    G[count] = g + 1;
    H[count] = estimate(P, child, nl);
    W0[count] = k0; W1[count] = k1; W2[count] = k2;
    table[-found - 1] = count + 1;
    const f = g + 1 + H[count];
    push(f, count);
    if (f < lowest) lowest = f;
    count++;
    if (count * 2 > slots) rehash();
  };
  const path = (last: number): Move[] => {
    const out: Move[] = [];
    for (let x = last; parent[x] >= 0; x = parent[x]) out.push({ id: trucks[by[x]].id, delta: how[x] });
    return out.reverse();
  };

  for (;;) {
    while (lowest < buckets.length && !(buckets[lowest]?.length)) lowest++;
    if (lowest >= buckets.length) return { moves: null, expanded, found: count };
    s = buckets[lowest].pop()!;
    g = G[s];
    if (g + H[s] !== lowest) continue; // a way to it since bettered: its newer entry stands in another stack
    if (H[s] === 0) return { moves: path(s), expanded, found: count };
    expanded++;
    at = s * n;
    odd = (moves + g + 1) % 2;
    m.expand(P, at, L[s], odd === 0, emit);
  }
}

/** The shortest solution by A* (see `searchAStar`), or null if there is none. */
export function solveAStar(level: Level, maxStates = 2_000_000, trucks: Truck[] = level.trucks, moves = 0, heuristic: Heuristic = 'rings'): Move[] | null {
  return searchAStar(level, maxStates, trucks, moves, heuristic).moves;
}

/** The first move of a shortest solution from the current position, or null if already won. */
export function nextMove(state: GameState): Move | null {
  return solve(state.level, 500_000, state.trucks, state.moves)?.[0] ?? null;
}
