import { describe, expect, it } from 'vitest';
import { getMoveRange, newGame, parseLevel, solve, solveAStar, solveSlow, tryMove, undo } from './index.ts';

// SOFT GROUND, road ban patches (Baldonnel): a 2-cell truck drives over a soft cell; a 3-cell truck (a rig)
// cannot enter one. No rig starts on one.
const level = (extra: Record<string, unknown> = {}) => parseLevel({
  id: 's', name: 'soft', par: 1,
  trucks: [
    { id: 'P', color: 'red', row: 0, col: 0, length: 2, orient: 'h' },
    { id: 'R', color: 'blue', row: 2, col: 0, length: 3, orient: 'h' },
    { id: 'V', color: 'green', row: 3, col: 5, length: 3, orient: 'v' },
  ],
  gates: [{ color: 'red', side: 'right', index: 0 }, { color: 'blue', side: 'right', index: 2 }, { color: 'green', side: 'top', index: 5 }],
  soft: [{ row: 0, col: 3 }, { row: 2, col: 4 }, { row: 1, col: 5 }],
  ...extra,
});

describe('soft ground (road ban patches)', () => {
  it('a level without the field has none; the field is read, cell by cell', () => {
    expect(parseLevel({ id: 'x', name: 'x', par: 1, trucks: [{ id: 'A', color: 'red', row: 0, col: 0, length: 2, orient: 'h' }], gates: [{ color: 'red', side: 'right', index: 0 }] }).soft).toEqual([]);
    expect(level().soft).toEqual([{ row: 0, col: 3 }, { row: 2, col: 4 }, { row: 1, col: 5 }]);
  });

  it('a pickup drives over it and out; a rig stops at its edge, either way along its lane', () => {
    const s = newGame(level());
    expect(getMoveRange(s, 'P')).toEqual({ min: 0, max: 4, exitDelta: 4 });
    // The rig: cols 0 to 2, soft ground at col 4: one cell and no more, and no way out.
    expect(getMoveRange(s, 'R')).toEqual({ min: 0, max: 1, exitDelta: null });
    // The vertical rig at rows 3 to 5, soft ground at row 1 of its lane: up one, never to its gate.
    expect(getMoveRange(s, 'V')).toEqual({ min: -1, max: 0, exitDelta: null });
    expect(tryMove(s, 'R', 2)).toBeNull();
    const r = tryMove(s, 'P', 3)!;
    expect(r.exited).toBe(false);
    expect(r.state.trucks.find((t) => t.id === 'P')!.col).toBe(3);
    expect(undo(r.state).trucks.find((t) => t.id === 'P')!.col).toBe(0);
  });

  it('a pickup parked on soft ground is still just a truck in the way', () => {
    let s = newGame(level({ soft: [{ row: 0, col: 3 }] }));
    s = tryMove(s, 'P', 2)!.state;
    expect(getMoveRange(s, 'R')).toEqual({ min: 0, max: 3, exitDelta: 3 });
  });

  it('no rig starts on one; a pickup may; it shares no cell with other floor or equipment', () => {
    expect(() => level({ soft: [{ row: 2, col: 1 }] })).toThrow(/rig R starts on soft ground/);
    expect(() => level({ soft: [{ row: 0, col: 1 }] })).not.toThrow();
    expect(() => level({ soft: [{ row: 4, col: 0 }, { row: 4, col: 0 }] })).toThrow(/soft ground/);
    expect(() => level({ soft: [{ row: 4, col: 0 }], muskeg: [{ row: 4, col: 0 }] })).toThrow();
    expect(() => level({ soft: [{ row: 4, col: 0 }], obstacles: [{ row: 4, col: 0 }] })).toThrow(/under equipment/);
    expect(() => level({ soft: [{ row: 9, col: 0 }] })).toThrow();
    expect(() => level({ soft: 'x' })).toThrow(/soft must be an array/);
  });

  it('the solvers agree, and know a rig cut off from its gate cannot leave', () => {
    expect(solve(level())).toBeNull();
    expect(solveSlow(level())).toBeNull();
    expect(solveAStar(level())).toBeNull();
    // A rig that must wait: its lane is clear but a pickup has to cross the soft ground a rig could not.
    const l = parseLevel({
      id: 't', name: 't', par: 1,
      trucks: [
        { id: 'R', color: 'blue', row: 2, col: 0, length: 3, orient: 'h' },
        { id: 'P', color: 'red', row: 1, col: 4, length: 2, orient: 'v' },
        { id: 'Q', color: 'green', row: 0, col: 0, length: 3, orient: 'h' },
      ],
      gates: [{ color: 'blue', side: 'right', index: 2 }, { color: 'red', side: 'bottom', index: 4 }, { color: 'green', side: 'right', index: 0 }],
      soft: [{ row: 4, col: 4 }, { row: 0, col: 4 }],
    });
    const a = solve(l), b = solveSlow(l), c = solveAStar(l);
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(c).toBeNull();
    const m = parseLevel({ ...JSON.parse(JSON.stringify(l)), par: 1, soft: [{ row: 4, col: 4 }] });
    expect(solve(m)!.length).toBe(solveSlow(m)!.length);
    expect(solveAStar(m)!.length).toBe(solve(m)!.length);
    expect(solve(m)!.length).toBe(3);
  });
});
