// The packed solver against the reference one: the same answers on every shipped level and on the
// new rules, and its moves replay through the game's own rules to a win.
import { describe, expect, it } from 'vitest';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { isWon, newGame, parseLevel, solve, solveSlow, tryMove, type Level, type Move } from './index.ts';

const replays = (level: Level, moves: Move[]) => {
  let s = newGame(level);
  for (const m of moves) {
    const r = tryMove(s, m.id, m.delta);
    if (!r || r.delta !== m.delta) return false;
    s = r.state;
  }
  return isWon(s);
};

describe('the fast solver', () => {
  it('finds a shortest solution of the same length as the reference search, on every shipped level', () => {
    // (Pads of 6: the packed breadth-first search is theirs. A Big Pad goes to A*, see solver-astar.test.ts.)
    for (const level of [...REGIONS.filter((r) => r.id !== 'clearwater').flatMap((r) => r.levels), ...DAILY_LEVELS.slice(0, 20)]) {
      const fast = solve(level)!;
      expect(fast.length, level.id).toBe(level.par);
      if (level.par <= 12) expect(fast.length, level.id).toBe(solveSlow(level)!.length);
      expect(replays(level, fast), level.id).toBe(true);
    }
  });

  it('agrees with it on muskeg, load racks and shift-change gates, from the start and mid-game', () => {
    const level = parseLevel({
      id: 'x', name: 'x', par: 1,
      trucks: [
        { id: 'A', color: 'red', row: 1, col: 0, length: 3, orient: 'h', load: true },
        { id: 'B', color: 'blue', row: 0, col: 4, length: 3, orient: 'v' },
        { id: 'C', color: 'green', row: 3, col: 1, length: 2, orient: 'h' },
        { id: 'D', color: 'yellow', row: 4, col: 3, length: 2, orient: 'v' },
        { id: 'E', color: 'orange', row: 3, col: 5, length: 3, orient: 'v', convoy: 2 },
        { id: 'F', color: 'orange', row: 5, col: 0, length: 2, orient: 'h', convoy: 1 },
      ],
      gates: [
        { color: 'red', side: 'right', index: 1 },
        { color: 'blue', side: 'bottom', index: 4, shift: true },
        { color: 'green', side: 'right', index: 3 },
        { color: 'yellow', side: 'top', index: 3, shift: true },
        { color: 'orange', side: 'top', index: 5 },
        { color: 'orange', side: 'right', index: 5 },
      ],
      obstacles: [{ row: 2, col: 2 }],
      muskeg: [{ row: 3, col: 3 }, { row: 2, col: 3 }],
      racks: [{ row: 1, col: 3 }],
    });
    const slow = solveSlow(level)!;
    const fast = solve(level)!;
    expect(fast.length).toBe(slow.length);
    expect(replays(level, fast)).toBe(true);
    // From every position along the way, with the moves already made counted.
    let s = newGame(level);
    for (const m of fast) {
      expect(solve(level, 500_000, s.trucks, s.moves)!.length).toBe(solveSlow(level, 500_000, s.trucks, s.moves)!.length);
      s = tryMove(s, m.id, m.delta)!.state;
    }
  });

  it('says so when a position cannot be cleared, and gives up past its limit', () => {
    const stuck = parseLevel({ id: 's', name: 's', par: 1, trucks: [{ id: 'A', color: 'red', row: 0, col: 0, length: 2, orient: 'h' }], gates: [{ color: 'red', side: 'right', index: 0 }], obstacles: [{ row: 0, col: 4 }] });
    expect(solve(stuck)).toBeNull();
    expect(() => solve(REGIONS[2].levels[9], 50)).toThrow();
  });
});
