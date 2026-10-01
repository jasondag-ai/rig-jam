import { describe, expect, it } from 'vitest';
import { convoyWaitingFor, gateOpen, getMoveRange, newGame, tryMove, undo } from './game.ts';
import { parseLevel } from './level.ts';
import { nextMove, solve } from './solver.ts';

// Orange convoy: truck 1 (A) in row 1, truck 2 (B) in row 3, each with an orange gate on the right.
// . . . . . .
// A A . . . . o   <- A is convoy 1
// . . . . . .
// . . . B B . o   <- B is convoy 2 (two cells from its gate)
// C C . . . . r   <- red, no convoy
const make = (extra: object = {}) =>
  parseLevel({
    id: 'cv',
    name: 'Convoy',
    par: 1,
    trucks: [
      { id: 'A', color: 'orange', row: 1, col: 0, length: 2, orient: 'h', convoy: 1 },
      { id: 'B', color: 'orange', row: 3, col: 2, length: 2, orient: 'h', convoy: 2 },
      { id: 'C', color: 'red', row: 4, col: 0, length: 2, orient: 'h' },
    ],
    gates: [
      { color: 'orange', side: 'right', index: 1 },
      { color: 'orange', side: 'right', index: 3 },
      { color: 'red', side: 'right', index: 4 },
    ],
    ...extra,
  });

describe('convoy rule', () => {
  it('lets number 1 out first', () => {
    const game = newGame(make());
    expect(convoyWaitingFor(game, 'orange')).toBe(1);
    expect(getMoveRange(game, 'A')).toEqual({ min: 0, max: 4, exitDelta: 4 });
    expect(tryMove(game, 'A', 4)!.exited).toBe(true);
  });

  it('treats the gate as a wall for number 2 while number 1 is still on the pad', () => {
    const game = newGame(make());
    expect(gateOpen(game, game.trucks[1])).toBe(false);
    expect(getMoveRange(game, 'B')).toEqual({ min: -2, max: 2, exitDelta: null });
    const parked = tryMove(game, 'B', 2)!;
    expect(parked.exited).toBe(false);
    expect(parked.state.trucks.find((t) => t.id === 'B')!.col).toBe(4);
  });

  it('opens for number 2 once number 1 has left', () => {
    const game = tryMove(newGame(make()), 'A', 4)!.state;
    expect(convoyWaitingFor(game, 'orange')).toBe(2);
    expect(getMoveRange(game, 'B')).toEqual({ min: -2, max: 2, exitDelta: 2 });
    expect(tryMove(game, 'B', 2)!.exited).toBe(true);
  });

  it('lets a truck that parked at its closed gate drive out with one more cell once it opens', () => {
    let game = tryMove(newGame(make()), 'B', 2)!.state; // B waits against its gate
    game = tryMove(game, 'A', 4)!.state; // number 1 leaves
    expect(getMoveRange(game, 'B')).toEqual({ min: -4, max: 1, exitDelta: 1 });
    expect(tryMove(game, 'B', 1)!.exited).toBe(true);
  });

  it('closes the gate again on undo', () => {
    const left = tryMove(newGame(make()), 'A', 4)!.state;
    expect(gateOpen(undo(left), undo(left).trucks[1])).toBe(false);
  });

  it('leaves trucks outside the convoy alone', () => {
    const game = newGame(make());
    expect(gateOpen(game, game.trucks[2])).toBe(true);
    expect(getMoveRange(game, 'C')!.exitDelta).toBe(4);
  });

  it('is followed by the solver and the hints', () => {
    const solution = solve(make())!;
    const order = solution.filter((m) => m.id !== 'C').map((m) => m.id);
    expect(order).toEqual(['A', 'B']);
    expect(nextMove(newGame(make()))).not.toEqual({ id: 'B', delta: 2 });
  });

  it('makes the solver wait when number 2 blocks number 1', () => {
    // B (convoy 2, vertical) stands in A's row. Without the rule B would just drive out the top;
    // with it, B must step aside for A and then come back up: one extra move.
    const blocking = {
      trucks: [
        { id: 'A', color: 'orange', row: 2, col: 0, length: 2, orient: 'h', convoy: 1 },
        { id: 'B', color: 'orange', row: 1, col: 3, length: 2, orient: 'v', convoy: 2 },
      ],
      gates: [
        { color: 'orange', side: 'right', index: 2 },
        { color: 'orange', side: 'top', index: 3 },
      ],
    };
    const withRule = solve(make(blocking))!;
    const free = solve(parseLevel({ ...make(blocking), trucks: make(blocking).trucks.map(({ convoy: _c, ...t }) => t) }))!;
    expect(free.length).toBe(2);
    expect(withRule.length).toBe(3);
    expect(withRule.map((m) => m.id)).toEqual(['B', 'A', 'B']);
  });
});

describe('convoy validation', () => {
  it('rejects bad numbers and incomplete convoys', () => {
    const base = make();
    const t = (changes: object[]) => ({ ...base, trucks: base.trucks.map((x, i) => ({ ...x, ...changes[i] })) });
    expect(() => parseLevel(t([{ convoy: 3 }, {}, {}]))).toThrow(/convoy must be 1 or 2/);
    expect(() => parseLevel(t([{}, { convoy: 1 }, {}]))).toThrow(/exactly one truck 1 and one truck 2/);
    expect(() => parseLevel(t([{}, { convoy: undefined }, {}]))).toThrow(/exactly one truck 1 and one truck 2/);
  });
});
