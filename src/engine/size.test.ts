// The pad's size: 6 unless a level says 8 (the Big Pad). Every rule works along the level's own side.
import { describe, expect, it } from 'vitest';
import { SIZE, getMoveRange, isWon, newGame, parseLevel, sizeOf, solve, touchesGate, tryMove } from './index.ts';
import { REGIONS } from '../levels/regions.ts';

const big = (extra: Record<string, unknown> = {}) => ({
  id: 'b', name: 'big', par: 2, size: 8,
  trucks: [
    { id: 'A', color: 'red', row: 3, col: 1, length: 2, orient: 'h' },
    { id: 'B', color: 'blue', row: 2, col: 6, length: 3, orient: 'v' },
  ],
  gates: [{ color: 'red', side: 'right', index: 3 }, { color: 'blue', side: 'bottom', index: 6 }],
  ...extra,
});

describe('pad size', () => {
  it('is 6 for every level of the first five regions (no level file of theirs names a size), and 8 for Clearwater', () => {
    expect(SIZE).toBe(6);
    for (const region of REGIONS) for (const level of region.levels) {
      if (region.id === 'clearwater') expect(sizeOf(level), level.id).toBe(8);
      else {
        expect(level.size, level.id).toBeUndefined();
        expect(sizeOf(level), level.id).toBe(6);
      }
    }
  });

  it('a level may say 8; nothing else', () => {
    expect(sizeOf(parseLevel(big()))).toBe(8);
    expect(() => parseLevel(big({ size: 7 }))).toThrow(/size/);
    expect(() => parseLevel(big({ size: 10 }))).toThrow(/size/);
    // Saying 6 is the same as saying nothing.
    expect(parseLevel({ ...big(), size: 6, trucks: [{ id: 'A', color: 'red', row: 3, col: 1, length: 2, orient: 'h' }], gates: [{ color: 'red', side: 'right', index: 3 }] }).size).toBeUndefined();
  });

  it('rows and columns run 0 to 7 on a pad of 8, and still 0 to 5 on a pad of 6', () => {
    expect(() => parseLevel(big({ obstacles: [{ row: 7, col: 0 }] }))).not.toThrow();
    expect(() => parseLevel(big({ obstacles: [{ row: 8, col: 0 }] }))).toThrow();
    const six = { ...big(), size: undefined };
    expect(() => parseLevel(six)).toThrow(/out of range|runs off/); // B at col 6 is off a pad of 6
    expect(() => parseLevel(big({ trucks: [{ id: 'A', color: 'red', row: 3, col: 6, length: 3, orient: 'h' }], gates: [{ color: 'red', side: 'left', index: 3 }] }))).toThrow(/runs off/);
  });

  it('a truck touches its gate at the far side of ITS pad', () => {
    const t = { id: 'A', color: 'red' as const, row: 0, col: 4, length: 2 as const, orient: 'h' as const };
    expect(touchesGate(t, 'right')).toBe(true);
    expect(touchesGate(t, 'right', 8)).toBe(false);
    expect(touchesGate({ ...t, col: 6 }, 'right', 8)).toBe(true);
    expect(() => parseLevel(big({ trucks: [{ id: 'A', color: 'red', row: 3, col: 6, length: 2, orient: 'h' }], gates: [{ color: 'red', side: 'right', index: 3 }] }))).toThrow(/touching/);
  });

  it('slides, blocks and exits work along 8 cells', () => {
    const level = parseLevel(big());
    let s = newGame(level);
    // A is blocked by B, which crosses its row at column 6.
    expect(getMoveRange(s, 'A')).toEqual({ min: -1, max: 3, exitDelta: null });
    expect(getMoveRange(s, 'B')).toEqual({ min: -2, max: 3, exitDelta: 3 });
    s = tryMove(s, 'B', 3)!.state;
    expect(s.trucks.map((t) => t.id)).toEqual(['A']);
    expect(getMoveRange(s, 'A')).toEqual({ min: -1, max: 5, exitDelta: 5 });
    const out = tryMove(s, 'A', 5)!;
    expect(out.exited).toBe(true);
    expect(isWon(out.state)).toBe(true);
    expect(solve(level)!.length).toBe(2);
  });

  it('muskeg and load racks on a pad of 8', () => {
    const level = parseLevel({
      id: 'm', name: 'm', par: 3, size: 8,
      trucks: [{ id: 'A', color: 'red', row: 0, col: 0, length: 3, orient: 'h', load: true }, { id: 'B', color: 'blue', row: 4, col: 2, length: 2, orient: 'h' }],
      gates: [{ color: 'red', side: 'right', index: 0 }, { color: 'blue', side: 'left', index: 4 }],
      muskeg: [{ row: 4, col: 5 }],
      racks: [{ row: 0, col: 6 }],
    });
    const s = newGame(level);
    // B driven one cell right meets muskeg at column 5? No: its lead reaches column 4. Two cells: onto the muskeg, and it slides to the berm.
    expect(tryMove(s, 'B', 1)!.delta).toBe(1);
    expect(tryMove(s, 'B', 2)!.delta).toBe(4);
    // The tanker's gate is a wall until it has stopped on the rack at column 6.
    expect(getMoveRange(s, 'A')!.exitDelta).toBeNull();
    const loaded = tryMove(s, 'A', 4)!.state;
    expect(loaded.trucks[0].loaded).toBe(true);
    expect(getMoveRange(loaded, 'A')!.exitDelta).toBe(1);
    expect(solve(level)!.length).toBe(3);
  });
});
