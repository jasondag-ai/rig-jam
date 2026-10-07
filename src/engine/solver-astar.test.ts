// A* against the breadth-first solver: the same par on every level in the game (all 50 and all 60
// Daily Pads), with the plain heuristic (trucks left) and with the stronger one (rings), from the
// start and from positions along the way; and on small random pads of 6 and of 8.
import { describe, expect, it } from 'vitest';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { mulberry32 } from './rng.ts';
import { isWon, newGame, parseLevel, searchAStar, solve, solveAStar, solveSlow, tryMove, type Level, type Move } from './index.ts';

const replays = (level: Level, moves: Move[]) => {
  let s = newGame(level);
  for (const m of moves) {
    const r = tryMove(s, m.id, m.delta);
    if (!r || r.delta !== m.delta) return false;
    s = r.state;
  }
  return isWon(s);
};
const ALL = [...REGIONS.flatMap((r) => r.levels), ...DAILY_LEVELS];

describe('A*', () => {
  it('h = trucks left: the same par as breadth-first on EVERY current level, and its moves win', () => {
    for (const level of ALL) {
      const bfs = solve(level, 2_000_000)!;
      const a = solveAStar(level, 2_000_000, level.trucks, 0, 'left')!;
      expect(bfs.length, level.id).toBe(level.par);
      expect(a.length, level.id).toBe(bfs.length);
      expect(replays(level, a), level.id).toBe(true);
    }
  });

  it('the stronger heuristic (rings): the same par as breadth-first on EVERY current level, and its moves win', () => {
    for (const level of ALL) {
      const a = solveAStar(level, 2_000_000, level.trucks, 0, 'rings')!;
      expect(a.length, level.id).toBe(level.par);
      expect(replays(level, a), level.id).toBe(true);
    }
  });

  it('and mid-game, with the moves already made counted (clock gates), on the hardest level of every region', () => {
    for (const region of REGIONS) {
      const level = region.levels[region.levels.length - 1];
      let s = newGame(level);
      for (const m of solve(level, 2_000_000)!) {
        const want = solve(level, 2_000_000, s.trucks, s.moves)!.length;
        expect(solveAStar(level, 2_000_000, s.trucks, s.moves, 'left')!.length, level.id).toBe(want);
        expect(solveAStar(level, 2_000_000, s.trucks, s.moves, 'rings')!.length, level.id).toBe(want);
        s = tryMove(s, m.id, m.delta)!.state;
      }
    }
  });

  it('the stronger heuristic never looks at more positions than the plain one finds, over the whole game', () => {
    let left = 0, rings = 0;
    for (const level of REGIONS.flatMap((r) => r.levels)) {
      left += searchAStar(level, 2_000_000, level.trucks, 0, 'left').expanded;
      rings += searchAStar(level, 2_000_000, level.trucks, 0, 'rings').expanded;
    }
    expect(rings).toBeLessThanOrEqual(left);
  });

  // Random pads: trucks dropped anywhere, a gate at one end of each lane used. Many cannot be cleared; those must say so too.
  const randomPad = (seed: number, size: 6 | 8, count: number): Level | null => {
    const rng = mulberry32(seed);
    const pick = (k: number) => Math.floor(rng() * k);
    const COLORS = ['red', 'blue', 'yellow', 'green', 'orange', 'purple'] as const;
    const taken = new Set<number>();
    const trucks: Record<string, unknown>[] = [];
    const gates = new Map<string, { color: string; side: string; index: number }>();
    for (let tries = 0; trucks.length < count && tries < 400; tries++) {
      const orient = pick(2) ? 'h' : 'v', length = 2 + pick(2), lane = pick(size), pos = 1 + pick(size - length - 1);
      const cells = Array.from({ length }, (_, k) => (orient === 'h' ? lane * size + pos + k : (pos + k) * size + lane));
      if (cells.some((c) => taken.has(c))) continue;
      const side = orient === 'h' ? (pick(2) ? 'left' : 'right') : pick(2) ? 'top' : 'bottom';
      const other = orient === 'h' ? (side === 'left' ? 'right' : 'left') : side === 'top' ? 'bottom' : 'top';
      // One colour a lane end; the two ends of a lane never the same colour.
      const mine = gates.get(`${side}${lane}`), across = gates.get(`${other}${lane}`);
      const color = mine?.color ?? COLORS.filter((c) => c !== across?.color)[pick(across ? 5 : 6)];
      if (across?.color === color) continue;
      gates.set(`${side}${lane}`, { color, side, index: lane });
      cells.forEach((c) => taken.add(c));
      trucks.push({ id: String.fromCharCode(65 + trucks.length), color, row: orient === 'h' ? lane : pos, col: orient === 'h' ? pos : lane, length, orient });
    }
    try {
      return parseLevel({ id: `r${seed}`, name: 'random', par: 1, ...(size === 8 ? { size } : {}), trucks, gates: [...gates.values()] });
    } catch {
      return null;
    }
  };

  it('agrees with the reference search on random pads of 6 and of 8, solvable or not', () => {
    let solved = 0, stuck = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const size = seed % 2 ? 6 : 8;
      const level = randomPad(seed, size, size === 6 ? 6 : 7);
      if (!level) continue;
      let want: Move[] | null;
      try { want = solveSlow(level, 5_000); } catch { continue; }
      for (const h of ['left', 'rings'] as const) {
        const got = solveAStar(level, 2_000_000, level.trucks, 0, h);
        expect(got === null, `${level.id} ${h}`).toBe(want === null);
        if (want && got) { expect(got.length, `${level.id} ${h}`).toBe(want.length); expect(replays(level, got), level.id).toBe(true); }
      }
      // (The packed breadth-first search too: it is the same on a pad of 8.)
      expect(solve(level, 2_000_000)?.length ?? null, level.id).toBe(want?.length ?? null);
      if (want) solved++; else stuck++;
    }
    expect(solved).toBeGreaterThan(12);
    expect(stuck).toBeGreaterThan(0);
    }, 30_000);

  it('a pad too wide for the packed breadth-first search (18 trucks) is solved by A* through `solve`', () => {
    const trucks = [], gates = [];
    const COLORS = ['red', 'blue', 'yellow', 'green', 'orange', 'purple'];
    // Eight rows of two pickups each driving out its own end, and two more in the columns between them.
    for (let r = 0; r < 8; r++) {
      trucks.push({ id: `L${r}`, color: COLORS[r % 6], row: r, col: 1, length: 2, orient: 'h' }, { id: `R${r}`, color: COLORS[(r + 1) % 6], row: r, col: 5, length: 2, orient: 'h' });
      gates.push({ color: COLORS[r % 6], side: 'left', index: r }, { color: COLORS[(r + 1) % 6], side: 'right', index: r });
    }
    trucks.push({ id: 'V1', color: 'red', row: 1, col: 3, length: 2, orient: 'v' }, { id: 'V2', color: 'blue', row: 4, col: 4, length: 2, orient: 'v' });
    gates.push({ color: 'red', side: 'top', index: 3 }, { color: 'blue', side: 'bottom', index: 4 });
    const level = parseLevel({ id: 'wide', name: 'wide', par: 18, size: 8, trucks, gates });
    expect(level.trucks.length).toBe(18);
    const moves = solve(level)!;
    expect(moves.length).toBe(18);
    expect(replays(level, moves)).toBe(true);
  });
});
