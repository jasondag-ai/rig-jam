// Level generator: random layouts, hill-climbed toward a target par, proven by the solver.
import {
  COLORS,
  LevelError,
  SolverLimitError,
  getMoveRange,
  newGame,
  parseLevel,
  solve,
  type Color,
  type Gate,
  type Level,
  type Move,
  type MoveRange,
  type Side,
  tryMove,
} from '../src/engine/index.ts';

/** What one level slot should look like. */
export interface Slot {
  trucks: number;
  pumpjacks: number;
  /** Accept only levels whose proven par lands in [minPar, maxPar]. */
  minPar: number;
  maxPar: number;
  /** Minimum moves beyond one-per-truck, i.e. how many "make room" moves are forced. */
  minExtra: number;
  /** Wrong-color gates added in line with trucks, as decoys. */
  decoys: number;
}

export interface SearchOptions {
  restarts: number;
  iters: number;
  /** Solver state cap per candidate. Bigger finds harder levels but runs slower. */
  maxStates: number;
}

/** Deterministic PRNG so the same seed always generates the same levels. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Piece {
  orient: 'h' | 'v';
  length: 2 | 3;
  row: number;
  col: number;
  side: Side;
}

interface Layout {
  pieces: Piece[];
  pumpjacks: { row: number; col: number }[];
}

type Rng = () => number;
const pick = (rng: Rng, n: number) => Math.floor(rng() * n);

function randomPiece(rng: Rng): Piece {
  const length = pick(rng, 3) === 0 ? 3 : 2;
  const orient = pick(rng, 2) ? 'h' : 'v';
  return {
    orient,
    length,
    row: pick(rng, orient === 'v' ? 7 - length : 6),
    col: pick(rng, orient === 'h' ? 7 - length : 6),
    side: orient === 'h' ? (pick(rng, 2) ? 'left' : 'right') : pick(rng, 2) ? 'top' : 'bottom',
  };
}

const randomCell = (rng: Rng) => ({ row: pick(rng, 6), col: pick(rng, 6) });

const cellsOf = (p: Piece) =>
  Array.from({ length: p.length }, (_, i) => (p.orient === 'h' ? `${p.row},${p.col + i}` : `${p.row + i},${p.col}`));

/** Cells between a truck and its gate. A pumpjack there would make the level unwinnable. */
function inLane(p: Piece, c: { row: number; col: number }): boolean {
  return p.orient === 'h'
    ? c.row === p.row && (p.side === 'right' ? c.col >= p.col + p.length : c.col < p.col)
    : c.col === p.col && (p.side === 'bottom' ? c.row >= p.row + p.length : c.row < p.row);
}

/** Builds a starting layout piece by piece so crowded slots still get legal layouts. */
function randomLayout(slot: Slot, rng: Rng): Layout | null {
  const taken = new Set<string>();
  const spots = new Set<string>();
  const pieces: Piece[] = [];
  for (let tries = 0; pieces.length < slot.trucks && tries < 400; tries++) {
    const p = randomPiece(rng);
    const cells = cellsOf(p);
    const spot = `${p.side}${gateIndex(p)}`;
    if (spots.has(spot) || cells.some((c) => taken.has(c))) continue;
    pieces.push(p);
    spots.add(spot);
    cells.forEach((c) => taken.add(c));
  }
  if (pieces.length < slot.trucks) return null;
  const free = Array.from({ length: 36 }, (_, i) => ({ row: Math.floor(i / 6), col: i % 6 })).filter(
    (c) => !taken.has(`${c.row},${c.col}`) && !pieces.some((p) => inLane(p, c)),
  );
  const pumpjacks = [];
  for (let i = 0; i < slot.pumpjacks; i++) {
    if (!free.length) return null;
    pumpjacks.push(free.splice(pick(rng, free.length), 1)[0]);
  }
  return { pieces, pumpjacks };
}

function mutate(layout: Layout, rng: Rng): Layout {
  const pieces = layout.pieces.map((p) => ({ ...p }));
  const pumpjacks = layout.pumpjacks.map((c) => ({ ...c }));
  const roll = pick(rng, pumpjacks.length ? 4 : 3);
  const k = pick(rng, pieces.length);
  if (roll === 0) pieces[k] = randomPiece(rng);
  else if (roll === 1) {
    const p = pieces[k];
    p.side = p.orient === 'h' ? (p.side === 'left' ? 'right' : 'left') : p.side === 'top' ? 'bottom' : 'top';
  } else if (roll === 2) {
    // Nudge a truck one cell along or across its axis.
    const p = pieces[k];
    const d = pick(rng, 2) ? 1 : -1;
    if (pick(rng, 2)) p.row += d;
    else p.col += d;
  } else pumpjacks[pick(rng, pumpjacks.length)] = randomCell(rng);
  return { pieces, pumpjacks };
}

const lineOf = (p: Piece) => `${p.orient}${p.orient === 'h' ? p.row : p.col}`;
const gateIndex = (p: Piece) => (p.orient === 'h' ? p.row : p.col);

/** Colors: spread evenly, and never two same-color trucks sharing a lane (that would give one two gates). */
function assignColors(pieces: Piece[]): Color[] | null {
  const used = new Map<Color, number>();
  const colors: Color[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const taken = new Set(colors.filter((_, j) => lineOf(pieces[j]) === lineOf(pieces[i])));
    const options = COLORS.filter((c) => !taken.has(c)).sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0));
    if (!options.length) return null;
    colors.push(options[0]);
    used.set(options[0], (used.get(options[0]) ?? 0) + 1);
  }
  return colors;
}

/** Builds and validates the level JSON for a layout, or returns null if the layout is illegal. */
export function buildLevel(layout: Layout, id = 'gen', name = 'Generated'): Level | null {
  const spots = new Set(layout.pieces.map((p) => `${p.side}${gateIndex(p)}`));
  if (spots.size !== layout.pieces.length) return null; // two trucks sharing one gate
  // A pumpjack between a truck and its gate can never move, so the level could never be won.
  if (layout.pieces.some((p) => layout.pumpjacks.some((c) => inLane(p, c)))) return null;
  const colors = assignColors(layout.pieces);
  if (!colors) return null;
  try {
    return parseLevel({
      id,
      name,
      par: 1,
      trucks: layout.pieces.map((p, i) => ({
        id: String.fromCharCode(65 + i),
        color: colors[i],
        row: p.row,
        col: p.col,
        length: p.length,
        orient: p.orient,
      })),
      gates: layout.pieces.map((p, i) => ({ color: colors[i], side: p.side, index: gateIndex(p) })),
      obstacles: layout.pumpjacks,
    });
  } catch (e) {
    if (e instanceof LevelError) return null;
    throw e;
  }
}

function solution(level: Level, maxStates: number): Move[] | null {
  try {
    return solve(level, maxStates);
  } catch (e) {
    if (e instanceof SolverLimitError) return null;
    throw e;
  }
}

const sameRange = (a: MoveRange, b: MoveRange) => a.min === b.min && a.max === b.max;

/** True if every pumpjack cuts short some truck's slide at some point along the solution. */
export function everyPumpjackInTheWay(level: Level, moves: Move[]): boolean {
  let state = newGame(level);
  const states = [state];
  for (const m of moves) {
    state = tryMove(state, m.id, m.delta)!.state;
    states.push(state);
  }
  return level.obstacles.every((pj) => {
    const without = { ...level, obstacles: level.obstacles.filter((o) => o !== pj) };
    return states.some((st) =>
      st.trucks.some((t) => !sameRange(getMoveRange(st, t.id)!, getMoveRange({ ...st, level: without }, t.id)!)),
    );
  });
}

/** Trucks that can drive straight out on move one. Fewer means a less obvious opening. */
function freeAtStart(level: Level): number {
  const game = newGame(level);
  return level.trucks.filter((t) => getMoveRange(game, t.id)!.exitDelta !== null).length;
}

/** Adds wrong-color gates at the far end of some trucks' lanes. They behave exactly like fence. */
function addDecoys(level: Level, count: number, rng: Rng): Level {
  const gates: Gate[] = [...level.gates];
  const opposite: Record<Side, Side> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  const order = [...level.trucks].sort(() => rng() - 0.5);
  for (const t of order) {
    if (gates.length - level.gates.length >= count) break;
    const own = gates.find((g) => g.color === t.color && g.index === (t.orient === 'h' ? t.row : t.col));
    if (!own) continue;
    const side = opposite[own.side];
    const index = own.index;
    if (gates.some((g) => g.side === side && g.index === index)) continue;
    const lane = level.trucks.filter((o) => o.orient === t.orient && (o.orient === 'h' ? o.row : o.col) === index);
    const color = COLORS.find((c) => lane.every((o) => o.color !== c));
    if (color) gates.push({ color, side, index });
  }
  return parseLevel({ ...level, gates });
}

export interface Generated {
  level: Level;
  par: number;
  /** Pumpjacks make it harder than the same layout without them. */
  raisesPar: boolean;
  /** Trucks that can drive straight out on move one. */
  free: number;
}

/** Ranks candidates for a slot: higher par, then pumpjacks that raise par, then a less obvious opening. */
export function isBetter(a: Omit<Generated, 'level'>, b: Omit<Generated, 'level'> | null): boolean {
  if (!b) return true;
  if (a.par !== b.par) return a.par > b.par;
  if (a.raisesPar !== b.raisesPar) return a.raisesPar;
  return a.free < b.free;
}

/** Searches for a level that fits the slot. Deterministic for a given seed. */
export function generate(slot: Slot, seed: number, opts: SearchOptions): Generated | null {
  const rng = mulberry32(seed);
  let best: Generated | null = null;
  const done = () => best !== null && best.par === slot.maxPar && (slot.pumpjacks === 0 || best.raisesPar);

  // Climb toward higher par. Pumpjacks must each get in the way during the best solution
  // (required), and ideally make the level harder than it would be without them (preferred).
  const score = (layout: Layout) => {
    const level = buildLevel(layout);
    if (!level) return null;
    const moves = solution(level, opts.maxStates);
    if (!moves || moves.length > slot.maxPar) return null;
    const par = moves.length;
    let matters = true;
    let raisesPar = false;
    if (slot.pumpjacks > 0) {
      matters = everyPumpjackInTheWay(level, moves);
      const bare = solution({ ...level, obstacles: [] }, opts.maxStates);
      raisesPar = bare !== null && bare.length < par;
    }
    return { level, par, matters, raisesPar, value: par * 4 + (matters ? 2 : 0) + (raisesPar ? 1 : 0) };
  };

  for (let r = 0; r < opts.restarts && !done(); r++) {
    let cur: Layout | null = null;
    let curScore: ReturnType<typeof score> = null;
    for (let a = 0; a < 2000 && !curScore; a++) {
      cur = randomLayout(slot, rng);
      curScore = cur && score(cur);
    }
    if (!cur || !curScore) continue;

    for (let i = 0; i < opts.iters && !(curScore.par === slot.maxPar && curScore.matters && (slot.pumpjacks === 0 || curScore.raisesPar)); i++) {
      const next = mutate(cur, rng);
      const s = score(next);
      if (s && s.value >= curScore.value) {
        cur = next;
        curScore = s;
      }
    }

    const { level, par, matters, raisesPar } = curScore;
    if (!matters || par < slot.minPar || par - slot.trucks < slot.minExtra) continue;
    const candidate = { level, par, raisesPar, free: freeAtStart(level) };
    if (isBetter(candidate, best)) best = candidate;
  }

  if (!best) return null;
  const level = addDecoys(best.level, slot.decoys, rng);
  return { ...best, level: { ...level, par: best.par } };
}
