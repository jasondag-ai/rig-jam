import { describe, expect, it } from 'vitest';
import { canUndo, cabSide, getMoveRange, isWon, newGame, tryMove, undo } from './game.ts';
import { parseLevel } from './level.ts';
import { SolverLimitError, nextMove, solve } from './solver.ts';

// . . . . . .
// . . . B . .
// A A . B . .    red gate on right of row 2
// . . . . . .
// . . . . . .
// . . . . . .    blue gate on bottom of col 3
const level = parseLevel({
  id: 't',
  name: 'Test',
  par: 2,
  trucks: [
    { id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' },
    { id: 'B', color: 'blue', row: 1, col: 3, length: 2, orient: 'v' },
  ],
  gates: [
    { color: 'red', side: 'right', index: 2 },
    { color: 'blue', side: 'bottom', index: 3 },
    { color: 'green', side: 'top', index: 3 },
  ],
});

describe('move validation', () => {
  it('computes how far a truck can slide', () => {
    const game = newGame(level);
    expect(getMoveRange(game, 'A')).toEqual({ min: 0, max: 1, exitDelta: null });
    expect(getMoveRange(game, 'B')).toEqual({ min: -1, max: 3, exitDelta: 3 });
  });

  it('moves a truck any distance until blocked', () => {
    const result = tryMove(newGame(level), 'B', -1)!;
    expect(result.exited).toBe(false);
    expect(result.state.trucks.find((t) => t.id === 'B')!.row).toBe(0);
    expect(result.state.moves).toBe(1);
  });

  it('rejects moves through other trucks, off the pad, zero and fractional moves', () => {
    const game = newGame(level);
    expect(tryMove(game, 'A', 2)).toBeNull();
    expect(tryMove(game, 'A', -1)).toBeNull();
    expect(tryMove(game, 'B', -2)).toBeNull();
    expect(tryMove(game, 'B', 0)).toBeNull();
    expect(tryMove(game, 'B', 0.5)).toBeNull();
    expect(tryMove(game, 'Z', 1)).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const game = newGame(level);
    tryMove(game, 'B', -1);
    expect(game.trucks.find((t) => t.id === 'B')!.row).toBe(1);
    expect(game.moves).toBe(0);
  });
});

describe('exit logic', () => {
  it('removes a truck that slides into its own gate', () => {
    const result = tryMove(newGame(level), 'B', 3)!;
    expect(result.exited).toBe(true);
    expect(result.state.trucks.map((t) => t.id)).toEqual(['A']);
  });

  it('treats a wrong-color gate as a wall', () => {
    // B's up direction ends at a green gate: it can reach the fence but not exit.
    const range = getMoveRange(newGame(level), 'B')!;
    expect(range.min).toBe(-1);
    const result = tryMove(newGame(level), 'B', -1)!;
    expect(result.exited).toBe(false);
  });

  it('only allows exit once the path to the gate is clear', () => {
    const game = tryMove(newGame(level), 'B', 3)!.state;
    expect(getMoveRange(game, 'A')).toEqual({ min: 0, max: 4, exitDelta: 4 });
    expect(tryMove(game, 'A', 3)!.exited).toBe(false);
  });

  it('puts the cab on the gate side', () => {
    expect(cabSide(level, level.trucks[0])).toBe('right');
    expect(cabSide(level, level.trucks[1])).toBe('bottom');
  });
});

describe('win check', () => {
  it('is won only when every truck has exited', () => {
    let game = newGame(level);
    expect(isWon(game)).toBe(false);
    game = tryMove(game, 'B', 3)!.state;
    expect(isWon(game)).toBe(false);
    game = tryMove(game, 'A', 4)!.state;
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(2);
  });
});

describe('undo stack', () => {
  it('steps back one move at a time, including exits', () => {
    const start = newGame(level);
    expect(canUndo(start)).toBe(false);
    const a = tryMove(start, 'B', -1)!.state;
    const b = tryMove(a, 'B', 4)!.state;
    expect(b.trucks).toHaveLength(1);

    const back1 = undo(b);
    expect(back1.trucks).toEqual(a.trucks);
    expect(back1.moves).toBe(1);

    const back2 = undo(back1);
    expect(back2.trucks).toEqual(start.trucks);
    expect(back2.moves).toBe(0);
    expect(canUndo(back2)).toBe(false);
  });

  it('does nothing when there is nothing to undo', () => {
    const start = newGame(level);
    expect(undo(start)).toBe(start);
  });
});

describe('solver', () => {
  it('finds the shortest solution', () => {
    expect(solve(level)).toEqual([
      { id: 'B', delta: 3 },
      { id: 'A', delta: 4 },
    ]);
  });

  it('returns null for an unsolvable level', () => {
    // A 4-truck deadlock: A waits on B, B on C, C on D, and D can never reach its gate past A.
    // A A A B . .
    // . . . B . .
    // . . . B . .
    // . . D C C C
    // . . D . . .
    // . . D . . .
    const stuck = parseLevel({
      id: 's',
      name: 'Stuck',
      par: 1,
      trucks: [
        { id: 'A', color: 'red', row: 0, col: 0, length: 3, orient: 'h' },
        { id: 'B', color: 'yellow', row: 0, col: 3, length: 3, orient: 'v' },
        { id: 'C', color: 'blue', row: 3, col: 3, length: 3, orient: 'h' },
        { id: 'D', color: 'green', row: 3, col: 2, length: 3, orient: 'v' },
      ],
      gates: [
        { color: 'red', side: 'right', index: 0 },
        { color: 'yellow', side: 'bottom', index: 3 },
        { color: 'blue', side: 'left', index: 3 },
        { color: 'green', side: 'top', index: 2 },
      ],
    });
    expect(solve(stuck)).toBeNull();
  });
});

describe('pumpjacks', () => {
  // A A . P . .   pumpjack at 2,3 blocks red for good; red must use its left gate instead.
  const withPumpjack = parseLevel({
    id: 'pj',
    name: 'Pumpjack',
    par: 1,
    trucks: [{ id: 'A', color: 'red', row: 2, col: 1, length: 2, orient: 'h' }],
    gates: [{ color: 'red', side: 'left', index: 2 }],
    obstacles: [{ row: 2, col: 3 }],
  });

  it('blocks trucks like a wall', () => {
    expect(getMoveRange(newGame(withPumpjack), 'A')).toEqual({ min: -1, max: 0, exitDelta: -1 });
  });

  it('defaults to no obstacles', () => {
    expect(level.obstacles).toEqual([]);
  });
});

describe('hints', () => {
  it('solves from the current position, not the start', () => {
    const moved = tryMove(newGame(level), 'B', -1)!.state;
    // B moved up out of row 2, so A now drives straight out first.
    expect(solve(level, 1000, moved.trucks)).toEqual([
      { id: 'A', delta: 4 },
      { id: 'B', delta: 4 },
    ]);
  });

  it('suggests the first move of a shortest solution', () => {
    expect(nextMove(newGame(level))).toEqual({ id: 'B', delta: 3 });
  });

  it('suggests nothing once the pad is clear', () => {
    let game = tryMove(newGame(level), 'B', 3)!.state;
    game = tryMove(game, 'A', 4)!.state;
    expect(nextMove(game)).toBeNull();
  });

  it('stops at the state limit', () => {
    expect(() => solve(level, 1)).toThrow(SolverLimitError);
  });
});
