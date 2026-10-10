// BIG PAD SPIKE (region 6): can we make 8 x 8 levels that play hard? Hardness here is EXTRA MOVES:
// par minus the number of trucks, i.e. the moves that are not a truck's own drive out.
//
// REVERSE GENERATION. A pad is built backwards from its end:
//  1. LANES AND GATES. Trucks are dealt to lanes with a gate at one end of each lane used.
//  2. INTERLOCKS ON PURPOSE. First a PINWHEEL is laid down: four trucks round a small box, each
//     standing in the next one's way out (A in B's, B in C's, C in D's, D in A's), so none of them
//     can be the first to leave. (One horizontal and one vertical truck can never each stand in
//     the other's way out: the cell where their lanes cross would have to hold both. The smallest
//     knot of that kind is this ring of four.) Then TAILS are hung on it, each new truck standing
//     across the way out of the one before, until the chain is 3 to 5 trucks deep.
//  3. EVERYTHING ELSE STARTS AT ITS GATE END (the solved end of the game: each of those is one
//     move from out), and the pad is SCRAMBLED WITH BACKWARD MOVES: one truck slid along its lane
//     at a time. A scramble is kept only if the pad's forward par (A*, the game's own rules) grew,
//     or held (so the layout can drift), never if it fell.
//  4. WHAT THE SPIKE FOUND: backward slides alone are not enough on a pad of 8. A spread-out pad
//     has room for everybody to step aside, and hundreds of thousands of slides of one layout
//     never passed 4 extra moves. So between slides ONE TRUCK IS RE-DEALT now and then (another
//     lane, turned to leave by the other end, a cell longer or shorter), kept by the same rule.
//     With that, a pad passes 10 extra moves in well under a minute. The table says how many of
//     each pad's extra moves came from slides and how many from re-deals.
// A pad is a candidate once no truck touches its gate (the game's rule for a start) and it has 14
// to 18 trucks and 6 to 15 extra moves.
//
//   node tools/gen-bigpad.ts [minutes, 10 at most] [seed] [workers] [--trucks=12-15] [--extra=6-10] [--keep=10] [--append]
// (--append ADDS a batch to the file, spread evenly across its range of extra moves, and keeps what is there.)
// writes levels/bigpad-candidates.json (the best 20, by extra moves) and prints them as a table.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { COLORS, SolverLimitError, isWon, newGame, parseLevel, searchAStar, solve, tryMove } from '../src/engine/index.ts';
import type { Color, Gate, Level, Move, Side, Truck } from '../src/engine/index.ts';
import { mulberry32 } from '../src/engine/rng.ts';

export const N = 8;
/** The first batch's targets (Job 1). A later batch names its own: `--trucks=12-15 --extra=6-10`. */
export const TARGET: Target = { trucks: [14, 18], extra: [6, 15] };
export interface Target { trucks: [number, number]; extra: [number, number] }
/** No run is longer than this (Jay). */
export const MAX_MINUTES = 10;
/** A* gives up on one position past this many found; that scramble is then simply not kept. */
const SOLVE_CAP = 600_000;
const KEEP = 20;
/** The packed breadth-first search holds this many trucks (3 bits each in one number). */
export const BFS_TRUCKS = 17;

type T = { orient: 'h' | 'v'; lane: number; pos: number; len: 2 | 3; fwd: boolean };
export interface Candidate {
  id: string;
  size: 8;
  par: number;
  trucks: number;
  extraMoves: number;
  /** The longest chain of trucks each standing in the next one's way out, at the start. */
  chain: number;
  /** Rings (trucks in each other's way out, round in a circle) that share no truck, at the start. */
  rings: number;
  /** Extra moves won by backward slides, and by re-dealing a truck (another lane, turned round, another length). */
  wonBy: { slides: number; redeals: number };
  /** What else agreed on the par: A* with the plain heuristic (trucks left), the breadth-first solver. Left out where it ran past its limit. */
  parAlsoBy: string[];
  solveMs: number;
  /** Positions A* looked at to prove the par. */
  lookedAt: number;
  hintPath: Move[];
  level: { id: string; name: string; par: number; size: 8; trucks: Truck[]; gates: Gate[] };
}

// ---------- the pad as numbers ----------

const cellsOf = (t: T, pos = t.pos): number[] => Array.from({ length: t.len }, (_, k) => (t.orient === 'h' ? t.lane * N + pos + k : (pos + k) * N + t.lane));
const sideOf = (t: T): Side => (t.orient === 'h' ? (t.fwd ? 'right' : 'left') : t.fwd ? 'bottom' : 'top');
const touching = (t: T) => (t.fwd ? t.pos + t.len === N : t.pos === 0);
const gridOf = (ts: T[], skip = -1): Int8Array => {
  const g = new Int8Array(N * N).fill(-1);
  ts.forEach((t, i) => { if (i !== skip) for (const c of cellsOf(t)) g[c] = i; });
  return g;
};
/** How far truck `i` may slide each way without leaving the pad. */
function range(ts: T[], i: number): [number, number] {
  const g = gridOf(ts, i), t = ts[i];
  const at = (p: number) => g[t.orient === 'h' ? t.lane * N + p : p * N + t.lane];
  let lo = t.pos, hi = t.pos;
  while (lo > 0 && at(lo - 1) < 0) lo--;
  while (hi + t.len < N && at(hi + t.len) < 0) hi++;
  return [lo - t.pos, hi - t.pos];
}
/** For each truck, the trucks standing between it and its gate. */
export function inWay(ts: T[]): number[][] {
  const g = gridOf(ts);
  return ts.map((t) => {
    const out = new Set<number>();
    for (let p = t.fwd ? t.pos + t.len : 0; p < (t.fwd ? N : t.pos); p++) {
      const w = g[t.orient === 'h' ? t.lane * N + p : p * N + t.lane];
      if (w >= 0) out.add(w);
    }
    return [...out];
  });
}
/** `chainDepth` counts no further than this. */
export const CHAIN_MOST = 8;
/** The longest chain (A's way out crossed by B, B's by C, ...), counted in trucks; a ring counts once round. */
export function chainDepth(ts: T[]): number {
  const way = inWay(ts);
  let best = 0;
  const walk = (i: number, seen: number, depth: number) => {
    if (depth > best) best = depth;
    if (depth >= CHAIN_MOST) return;
    for (const j of way[i]) if (!(seen & (1 << j))) walk(j, seen | (1 << j), depth + 1);
  };
  for (let i = 0; i < ts.length; i++) walk(i, 1 << i, 1);
  return best;
}
/** Rings that share no truck (greedy, the shortest first). */
export function ringCount(ts: T[]): number {
  const way = inWay(ts);
  const free = new Set(ts.map((_, i) => i));
  let rings = 0;
  for (let i = 0; i < ts.length; i++) {
    if (!free.has(i)) continue;
    const from = new Map<number, number>([[i, -1]]);
    const queue = [i];
    let hit = -1;
    for (let h = 0; h < queue.length && hit < 0; h++) {
      for (const y of way[queue[h]]) {
        if (!free.has(y)) continue;
        if (y === i) { hit = queue[h]; break; }
        if (!from.has(y)) { from.set(y, queue[h]); queue.push(y); }
      }
    }
    if (hit < 0) continue;
    rings++;
    for (let x = hit; x >= 0; x = from.get(x)!) free.delete(x);
  }
  return rings;
}

// ---------- to the game's own level ----------

/**
 * Gate colours: one colour a lane end; the two ends of one lane never the same (a truck must have
 * exactly one gate of its colour in line with it). Six colours, dealt out evenly.
 */
export function colourGates(ts: T[], rng: () => number): Map<string, Color> | null {
  const ends = [...new Set(ts.map((t) => `${sideOf(t)}${t.lane}`))];
  const opposite = (e: string) => e.replace(/^(left|right|top|bottom)/, (s) => ({ left: 'right', right: 'left', top: 'bottom', bottom: 'top' })[s]!);
  const used = new Map<Color, number>(COLORS.map((c) => [c, 0]));
  const out = new Map<string, Color>();
  for (const e of ends.sort(() => rng() - 0.5)) {
    const no = out.get(opposite(e));
    const pick = [...COLORS].filter((c) => c !== no).sort((a, b) => used.get(a)! - used.get(b)! || rng() - 0.5)[0];
    if (!pick) return null;
    out.set(e, pick);
    used.set(pick, used.get(pick)! + 1);
  }
  return out;
}
const idOf = (i: number) => String.fromCharCode(65 + i);
export function toLevel(ts: T[], colours: Map<string, Color>, id: string, par = 1): Level {
  const trucks = ts.map((t, i) => ({ id: idOf(i), color: colours.get(`${sideOf(t)}${t.lane}`)!, row: t.orient === 'h' ? t.lane : t.pos, col: t.orient === 'h' ? t.pos : t.lane, length: t.len, orient: t.orient }));
  const gates = [...colours].map(([end, color]) => ({ color, side: end.replace(/\d+$/, '') as Side, index: Number(end.match(/\d+$/)![0]) }));
  // (Mid-scramble a truck may still stand at its gate: the game's parser would refuse that start, so the level is built by hand here.)
  return { id, name: 'Big Pad', par, size: 8, trucks: trucks as Truck[], gates: gates as Gate[], obstacles: [], muskeg: [], racks: [] };
}

// ---------- 1 and 2: lanes, gates, the interlock seed ----------

type Rng = () => number;
const int = (rng: Rng, n: number) => Math.floor(rng() * n);
const one = <X>(rng: Rng, a: readonly X[]): X => a[int(rng, a.length)];

/** Can `t` be added? Its cells free; and whoever shares its lane must not drive out THROUGH it or need the other end's gate twice. */
function fits(ts: T[], t: T): boolean {
  if (t.pos < 0 || t.pos + t.len > N) return false;
  const g = gridOf(ts);
  if (cellsOf(t).some((c) => g[c] >= 0)) return false;
  for (const o of ts) {
    if (o.orient !== t.orient || o.lane !== t.lane) continue;
    // Two in one lane: they must leave by the same end (one behind the other), or back to back by their own ends.
    // Facing each other, neither could ever leave.
    const first = o.pos < t.pos ? o : t, second = first === o ? t : o;
    if (first.fwd && !second.fwd) return false;
  }
  return true;
}

/**
 * The pinwheel: four trucks round a box of `w` x `h` cells with its corner at (r, c), each in the
 * next one's way out. Returns null if it does not fit on the pad.
 *     A A A B        A drives out right (B stands in its way)
 *     D . . B        B drives out down  (C)
 *     D . . B        C drives out left  (D)
 *     D C C C        D drives out up    (A)
 */
export function pinwheel(r: number, c: number, w: 2 | 3, h: 2 | 3, mirror: boolean): T[] | null {
  if (r < 0 || c < 0 || r + h >= N || c + w >= N) return null;
  const ts: T[] = mirror
    ? [
        // The same knot turned the other way round: A drives out left, D down, C right, B up.
        { orient: 'h', lane: r, pos: c + 1, len: w, fwd: false },
        { orient: 'v', lane: c + w, pos: r + 1, len: h, fwd: false },
        { orient: 'h', lane: r + h, pos: c, len: w, fwd: true },
        { orient: 'v', lane: c, pos: r, len: h, fwd: true },
      ]
    : [
        { orient: 'h', lane: r, pos: c, len: w, fwd: true },
        { orient: 'v', lane: c + w, pos: r, len: h, fwd: true },
        { orient: 'h', lane: r + h, pos: c + 1, len: w, fwd: false },
        { orient: 'v', lane: c, pos: r + 1, len: h, fwd: false },
      ];
  return ts;
}

/** A truck across `of`'s way out, itself with its way out still open (so the chain can go on from it). */
function tail(ts: T[], of: number, rng: Rng): T | null {
  const t = ts[of];
  const g = gridOf(ts);
  // The free cells between it and its gate.
  const free: number[] = [];
  for (let p = t.fwd ? t.pos + t.len : t.pos - 1; t.fwd ? p < N : p >= 0; p += t.fwd ? 1 : -1) {
    if (g[t.orient === 'h' ? t.lane * N + p : p * N + t.lane] >= 0) break;
    free.push(p);
  }
  for (let tries = 0; tries < 30 && free.length; tries++) {
    const at = one(rng, free), len = one(rng, [2, 3, 3] as const);
    // It crosses `of`'s lane at `at`, standing in the lane `at` of the other kind, covering `t.lane`.
    const pos = t.lane - int(rng, len);
    const cand: T = { orient: t.orient === 'h' ? 'v' : 'h', lane: at, pos, len, fwd: rng() < 0.5 };
    if (fits(ts, cand) && !touching(cand)) return cand;
  }
  return null;
}

/** A seeded start: a pinwheel, tails hung on it until the chain is `depth` deep, then trucks at their gate ends up to `count`. */
export function seedPad(rng: Rng, count: number, depth: number, long = 0.34): T[] | null {
  let ts: T[] | null = null;
  for (let tries = 0; tries < 40 && !ts; tries++) ts = pinwheel(1 + int(rng, 4), 1 + int(rng, 4), one(rng, [2, 3, 3] as const), one(rng, [2, 3, 3] as const), rng() < 0.5);
  if (!ts) return null;
  // A second pinwheel where there is room (two rings that share no truck: a move each, at least).
  if (rng() < 0.6) {
    for (let tries = 0; tries < 30; tries++) {
      const more = pinwheel(int(rng, 6), int(rng, 6), one(rng, [2, 2, 3] as const), one(rng, [2, 2, 3] as const), rng() < 0.5);
      if (!more) continue;
      const all = [...ts];
      if (more.every((t) => (fits(all, t) ? (all.push(t), true) : false))) { ts = all; break; }
    }
  }
  // Tails: each across the way out of the last one hung, so the chain runs `depth` trucks deep beyond the ring's own.
  let last = int(rng, ts.length);
  for (let hung = 0, tries = 0; hung < depth - 2 && tries < 12 && ts.length < count; tries++) {
    const t = tail(ts, last, rng);
    if (!t) { last = int(rng, ts.length); continue; }
    ts.push(t);
    last = ts.length - 1;
    hung++;
  }
  // Everything else at its gate end (or as near it as there is room): the solved end of the game, to be scrambled backwards from.
  for (let tries = 0; tries < 600 && ts.length < count; tries++) {
    const orient = rng() < 0.5 ? 'h' : 'v', lane = int(rng, N), len = rng() < long ? 3 : 2, fwd = rng() < 0.5;
    const cand: T = { orient, lane, pos: fwd ? N - len : 0, len, fwd };
    for (let back = 0; back < 4 && !fits(ts, cand); back++) cand.pos += fwd ? -1 : 1;
    if (fits(ts, cand)) ts.push(cand);
  }
  return ts.length === count ? ts : null;
}

// ---------- 3: the backward scramble ----------

interface Solved { par: number; moves: Move[]; ms: number; lookedAt: number }
export function forward(level: Level, ts: T[], cap = SOLVE_CAP): Solved | null {
  const trucks = level.trucks.map((t, i) => (ts[i].orient === 'h' ? { ...t, col: ts[i].pos } : { ...t, row: ts[i].pos }));
  const t0 = performance.now();
  try {
    const r = searchAStar(level, cap, trucks, 0, 'rings');
    return r.moves ? { par: r.moves.length, moves: r.moves, ms: performance.now() - t0, lookedAt: r.expanded } : null;
  } catch (e) {
    if (e instanceof SolverLimitError) return null;
    throw e;
  }
}

export interface Found { ts: T[]; colours: [string, Color][]; par: number; extra: number }

/**
 * One pad, start to finish: seed it, then scramble backwards until the extra moves stop growing
 * (or reach the target's top, or time is up). Reports the best start it passed through that the
 * game would accept (no truck touching its gate).
 */
/** A whole pad in order: on the pad, no overlap, nobody touching its gate, no two in one lane facing each other. */
function sound(ts: T[]): boolean {
  const g = new Int8Array(N * N).fill(-1);
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.pos < 0 || t.pos + t.len > N || touching(t)) return false;
    for (const c of cellsOf(t)) { if (g[c] >= 0) return false; g[c] = i; }
  }
  for (const a of ts) for (const b of ts) if (a !== b && a.orient === b.orient && a.lane === b.lane && a.pos < b.pos && a.fwd && !b.fwd) return false;
  return true;
}

/** The kinds of change tried, and how often. A SLIDE is a backward move; the rest RE-DEAL one truck. */
const CHANGES = ['slide', 'slide', 'slide', 'slide', 'slide', 'lane', 'lane', 'turn', 'length'] as const;
type Change = (typeof CHANGES)[number];
export interface Grown extends Found { gains: Record<Change, number>; tried: number }

/**
 * One pad, start to finish.
 *  - SEED: a pinwheel, tails, the rest at their gate ends (`seedPad`); every truck then backs a cell
 *    or two off its gate (the game takes no start with a truck touching its gate).
 *  - SCRAMBLE BACKWARDS: one truck slid along its lane to somewhere it can reach, kept if the
 *    forward par did not fall. On their own, slides stall early (a spread-out pad of 8 has room
 *    for everybody to get out of the way: measured, hundreds of thousands of scrambles of one
 *    layout never passed 4 extra moves), so now and then ONE TRUCK IS RE-DEALT instead: put in
 *    another lane, turned to leave by the other end, or made a cell longer or shorter. The same
 *    rule keeps it or not.
 * It stops at `want` extra moves (a pad's own target inside the range), when nothing has been
 * kept for `stale` tries, or when time is up.
 */
export function growPad(rng: Rng, until: number, want: number, target: Target = TARGET, stale = 2500, cap = SOLVE_CAP): Grown | null {
  const count = target.trucks[0] + int(rng, target.trucks[1] - target.trucks[0] + 1);
  const seeded = seedPad(rng, count, 3 + int(rng, 3), 0.3 + rng() * 0.7);
  if (!seeded) return null;
  let ts: T[] = seeded;
  for (const t of ts) if (touching(t)) t.pos += (t.fwd ? -1 : 1) * (1 + int(rng, 2));
  if (!sound(ts)) return null;
  const solveIt = (pad: T[]): { solved: Solved; colours: Map<string, Color> } | null => {
    const colours = colourGates(pad, rng);
    // (`cap`: how many positions a solve may look at. A pad past it is passed over: a smaller cap fails faster, and keeps to pads a phone's hint solves quickly.)
    const solved = colours && forward(toLevel(pad, colours, 'pad'), pad, cap);
    return solved ? { solved, colours: colours! } : null;
  };
  let now = solveIt(ts);
  if (!now) return null;
  const gains: Record<Change, number> = { slide: 0, lane: 0, turn: 0, length: 0 };
  let tried = 0;
  for (let idle = 0; idle < stale && performance.now() < until && now.solved.par - ts.length < want; idle++) {
    const next: T[] = ts.map((t) => ({ ...t }));
    const change = one(rng, CHANGES), i = int(rng, next.length), t = next[i];
    if (change === 'slide') {
      // A backward move: along its lane to anywhere it can reach.
      const [lo, hi] = range(next, i);
      if (lo === 0 && hi === 0) continue;
      let d = 0;
      while (d === 0) d = lo + int(rng, hi - lo + 1);
      t.pos += d;
    } else if (change === 'lane') {
      t.lane = int(rng, N);
      if (rng() < 0.3) t.orient = t.orient === 'h' ? 'v' : 'h';
      t.pos = int(rng, N - t.len + 1);
    } else if (change === 'turn') t.fwd = !t.fwd;
    else {
      t.len = t.len === 2 ? 3 : 2;
      if (rng() < 0.5) t.pos += t.len === 3 ? -1 : 1;
    }
    if (!sound(next)) continue;
    tried++;
    const then = solveIt(next);
    if (!then) continue;
    const extra = then.solved.par - next.length, had = now.solved.par - ts.length;
    if (extra < had || extra > target.extra[1]) continue;
    if (extra > had) { gains[change] += extra - had; idle = 0; }
    ts = next;
    now = then;
  }
  return { ts, colours: [...now.colours], par: now.solved.par, extra: now.solved.par - ts.length, gains, tried };
}

// ---------- a run ----------

export function candidate(f: Grown, id: string): Candidate {
  const colours = new Map(f.colours);
  const built = toLevel(f.ts, colours, id, f.par);
  // Through the game's own parser (it refuses an overlap, a truck off the pad, a truck with no gate or two, a truck touching its gate).
  const level = parseLevel({ id, name: `Big Pad ${id}`, par: f.par, size: 8, trucks: built.trucks, gates: built.gates });
  const t0 = performance.now();
  const strong = searchAStar(level, 4_000_000, level.trucks, 0, 'rings');
  const solveMs = performance.now() - t0;
  if (!strong.moves) throw new Error(`${id}: no solution`);
  const par = strong.moves.length;
  // The moves must clear the pad in the game itself.
  let s = newGame(level);
  for (const m of strong.moves) {
    const r = tryMove(s, m.id, m.delta);
    if (!r) throw new Error(`${id}: its hint path has an illegal move`);
    s = r.state;
  }
  if (!isWon(s)) throw new Error(`${id}: its hint path does not clear the pad`);
  return {
    id, size: 8, par, trucks: level.trucks.length, extraMoves: par - level.trucks.length,
    chain: chainDepth(f.ts), rings: ringCount(f.ts),
    wonBy: { slides: f.gains.slide, redeals: f.gains.lane + f.gains.turn + f.gains.length }, parAlsoBy: [],
    solveMs: Math.round(solveMs), lookedAt: strong.expanded, hintPath: strong.moves,
    level: { id, name: `Big Pad ${id}`, par, size: 8, trucks: level.trucks, gates: level.gates },
  };
}
/** The par proved again another way, if it can be done inside its limit: `how` is 'left' (A*, trucks left) or 'bfs'. Throws if it disagrees. */
function proveAgain(c: Candidate, how: 'left' | 'bfs'): void {
  const level = parseLevel(c.level);
  try {
    // (18 trucks are past what the packed breadth-first search holds: `solve` would hand them to A*, which proves nothing new.)
    if (how === 'bfs' && level.trucks.length > BFS_TRUCKS) return;
    const got = how === 'left' ? searchAStar(level, 2_500_000, level.trucks, 0, 'left').moves : solve(level, 1_200_000);
    if (!got || got.length !== c.par) throw new Error(`${c.id}: ${how} says par ${got?.length}, A* says ${c.par}`);
    c.parAlsoBy.push(how === 'left' ? 'A* (trucks left)' : 'breadth-first');
  } catch (e) {
    if (!(e instanceof SolverLimitError)) throw e;
  }
}
/** How many trucks of `a` stand where no truck of `b` stands. */
const differs = (a: Found, b: Found) => { const k = (t: T) => `${t.orient}${t.lane},${t.pos},${t.len}`; const have = new Set(b.ts.map(k)); return a.ts.filter((t) => !have.has(k(t))).length; };

export function table(cs: Candidate[]): string {
  const rows = [['#', 'id', 'trucks', 'par', 'extra', 'chain', 'rings', 'by slides', 'by re-deals', 'solve ms', 'looked at', 'par also by'], ...cs.map((c, i) => [i + 1, c.id, c.trucks, c.par, c.extraMoves, c.chain >= CHAIN_MOST ? `${CHAIN_MOST}+` : c.chain, c.rings, c.wonBy.slides, c.wonBy.redeals, c.solveMs, c.lookedAt, c.parAlsoBy.join(' + ') || '-'].map(String))];
  const w = rows[0].map((_, k) => Math.max(...rows.map((r) => r[k].length)));
  return rows.map((r, i) => r.map((x, k) => (k === 1 || k === 11 ? x.padEnd(w[k]) : x.padStart(w[k]))).join('  ') + (i === 0 ? `\n${w.map((n) => '-'.repeat(n)).join('  ')}` : '')).join('\n');
}

const FILE = new URL('../levels/bigpad-candidates.json', import.meta.url);

async function main() {
  const args = process.argv.slice(2), plain = args.filter((a) => !a.startsWith('--'));
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}`))?.split('=')[1];
  const pair = (text: string | undefined, or: [number, number]): [number, number] => (text ? (text.split('-').map(Number) as [number, number]) : or);
  const minutes = Math.min(MAX_MINUTES, Number(plain[0] ?? MAX_MINUTES));
  const seed = Number(plain[1] ?? 1);
  const workers = Math.max(1, Number(plain[2] ?? Math.max(1, cpus().length - 2)));
  // A batch's own targets, how many it keeps, and whether it is ADDED to the file (the pads already there are kept as they are).
  const target: Target = { trucks: pair(flag('trucks'), TARGET.trucks), extra: pair(flag('extra'), TARGET.extra) };
  const keep = Number(flag('keep') ?? KEEP), append = args.includes('--append');
  const before: { candidates: Candidate[]; batches?: unknown[] } & Record<string, unknown> = append ? JSON.parse(readFileSync(FILE, 'utf8')) : { candidates: [] };
  const start = Date.now();
  // THE WHOLE RUN keeps inside `minutes`: the scramble gets most of it, the rest is kept back to prove the candidates.
  const deadline = start + minutes * 60_000 - 4000;
  const scrambleMs = minutes * 60_000 * 0.78;
  console.log(`Big Pad: ${minutes} min at most, seed ${seed}, ${workers} workers, ${target.trucks.join(' to ')} trucks, ${target.extra.join(' to ')} extra moves${append ? ', added to the file' : ''}`);
  const found: Grown[] = [];
  let seeds = 0;
  await Promise.all(Array.from({ length: workers }, (_, k) => new Promise<void>((done, fail) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { seed: seed * 1000 + k, ms: scrambleMs, target, even: append } });
    w.on('message', (m: Grown | 'seed') => { if (m === 'seed') seeds++; else found.push(m); });
    w.on('error', fail);
    w.on('exit', () => done());
  })));
  found.sort((a, b) => b.extra - a.extra || b.ts.length - a.ts.length);
  const inTarget = found.filter((f) => f.extra >= target.extra[0]);
  const picked: Grown[] = [];
  const alike = (f: Grown) => picked.some((p) => differs(f, p) < 5);
  if (append) {
    // An added batch is kept EVEN ACROSS ITS RANGE (one of each number of extra moves in turn), not the hardest only.
    for (let round = 0; picked.length < keep && round < keep; round++) {
      for (let e = target.extra[1]; e >= target.extra[0] && picked.length < keep; e--) {
        const f = inTarget.find((x) => x.extra === e && !picked.includes(x) && !alike(x));
        if (f) picked.push(f);
      }
    }
  } else {
    // The best, by extra moves, no two alike (at least 5 trucks standing differently).
    for (const f of inTarget) {
      if (!alike(f)) picked.push(f);
      if (picked.length === keep) break;
    }
  }
  const first = before.candidates.length;
  const name = (i: number) => `bp${String(first + i + 1).padStart(2, '0')}`;
  const out = picked.map((f, i) => candidate(f, name(i)));
  out.sort((a, b) => b.extraMoves - a.extraMoves || b.par - a.par);
  out.forEach((c, i) => { c.id = c.level.id = name(i); c.level.name = `Big Pad ${first + i + 1}`; });
  // Each par proved again, another way, for as long as there is time (the plain heuristic first, then breadth-first).
  for (const how of ['left', 'bfs'] as const) for (const c of out) if (Date.now() < deadline - 12_000) proveAgain(c, how);
  mkdirSync(new URL('../levels/', import.meta.url), { recursive: true });
  const tally = (pick: (f: Grown) => number) => found.reduce((n, f) => n + pick(f), 0);
  const seconds = Math.round((Date.now() - start) / 1000);
  const batch = {
    target, seed, minutes, seconds, workers, seedsTried: seeds, padsGrown: found.length, padsInTarget: inTarget.length,
    padsWith10OrMore: found.filter((f) => f.extra >= 10).length,
    extraMovesWonBy: { slides: tally((f) => f.gains.slide), redeals: tally((f) => f.gains.lane + f.gains.turn + f.gains.length) },
  };
  // The file: every batch's own numbers, and all the candidates together, the hardest first.
  const all = [...before.candidates, ...out].sort((a, b) => b.extraMoves - a.extraMoves || b.par - a.par);
  const earlier = before.batches ?? (append ? [{ target: before.target, seed: before.seed, minutes: before.minutes, seconds: before.seconds, workers: before.workers, seedsTried: before.seedsTried, padsGrown: before.padsGrown, padsInTarget: before.padsInTarget, padsWith10OrMore: before.padsWith10OrMore, extraMovesWonBy: before.extraMovesWonBy }] : []);
  writeFileSync(FILE, JSON.stringify({ size: 8, batches: [...earlier, batch], candidates: all }, null, 1) + '\n');
  console.log(`${seeds} seeds, ${found.length} pads grown in ${seconds} s; ${inTarget.length} reached ${target.extra[0]} extra moves or more, ${batch.padsWith10OrMore} of them 10 or more.`);
  console.log(`Extra moves won, all pads together: ${batch.extraMovesWonBy.slides} by backward slides, ${batch.extraMovesWonBy.redeals} by re-dealing a truck.\nThis batch's ${out.length}, by extra moves:\n`);
  console.log(table(out));
  console.log(`\n${all.length} candidates in levels/bigpad-candidates.json, ${all.filter((c) => c.extraMoves >= 10).length} of them with 10 or more extra moves.`);
}

function work() {
  const { seed, ms, target, even } = workerData as { seed: number; ms: number; target: Target; even: boolean };
  const rng = mulberry32(seed);
  const until = performance.now() + ms;
  const [lo, hi] = target.extra;
  while (performance.now() < until) {
    // Each pad has its own target inside the range: spread evenly for an added batch; for the first, most of them 10 or more.
    const want = even || hi < 10 ? lo + int(rng, hi - lo + 1) : rng() < 0.7 ? 10 + int(rng, hi - 9) : lo + int(rng, 4);
    const f = growPad(rng, until, want, target);
    parentPort!.postMessage('seed');
    if (f && f.extra >= 3) parentPort!.postMessage(f);
  }
}

if (isMainThread) {
  if (process.argv[1]?.endsWith('gen-bigpad.ts')) await main();
} else if ((workerData as { ms?: number } | null)?.ms !== undefined) work(); // (its own worker; another tool's worker that imports this file does nothing here)
