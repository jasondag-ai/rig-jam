// Regions 4 and 5: MUSKEG (Mannville), LOAD RACKS and SHIFT-CHANGE GATES (Bakken).
import { describe, expect, it } from 'vitest';
import { LevelError, canUndo, gateOpen, getMoveRange, isWon, newGame, nextMove, onRack, parseLevel, shiftOpen, slideEnd, solve, tryMove, undo } from './index.ts';

const base = { id: 't', name: 'Test', par: 1 };
const play = (level: ReturnType<typeof parseLevel>, moves: [string, number][]) => moves.reduce((s, [id, d]) => tryMove(s, id, d)!.state, newGame(level));

describe('muskeg: a truck that drives onto it keeps sliding until it hits something', () => {
  // Row 2: A at cols 1-2, muskeg at col 4, the berm beyond col 5. Its gate is on the left (behind it).
  const level = parseLevel({
    ...base,
    trucks: [{ id: 'A', color: 'red', row: 2, col: 1, length: 2, orient: 'h' }, { id: 'B', color: 'blue', row: 4, col: 2, length: 2, orient: 'h' }],
    gates: [{ color: 'red', side: 'left', index: 2 }, { color: 'blue', side: 'right', index: 4 }],
    muskeg: [{ row: 2, col: 4 }],
  });

  it('a move that stops short of the muskeg is an ordinary move', () => {
    const r = tryMove(newGame(level), 'A', 1)!;
    expect(r.delta).toBe(1);
    expect(r.state.trucks[0].col).toBe(2);
  });

  it('a move onto the muskeg slides on to the end of the lane (here: the berm)', () => {
    const s = newGame(level);
    expect(getMoveRange(s, 'A')).toMatchObject({ max: 3 });
    const r = tryMove(s, 'A', 2)!; // its nose would stop on the muskeg cell
    expect(r.delta).toBe(3);
    expect(r.state.trucks[0].col).toBe(4);
    expect(r.exited).toBe(false);
    expect(r.state.moves).toBe(1); // one drag, one move
    // Asking for the whole way is the same move.
    expect(tryMove(s, 'A', 3)!.state.trucks[0].col).toBe(4);
    expect(slideEnd(s, s.trucks[0], 2, getMoveRange(s, 'A')!)).toBe(3);
  });

  it('driving OFF muskeg it is parked on is an ordinary move, and it can stop where it likes', () => {
    const parked = play(level, [['A', 3]]); // now on cols 4-5, over the muskeg
    const back = tryMove(parked, 'A', -1)!;
    expect(back.delta).toBe(-1);
    expect(back.state.trucks[0].col).toBe(3);
    // Backing right off it too: one cell, two cells, as asked.
    expect(tryMove(parked, 'A', -2)!.delta).toBe(-2);
  });

  it('a slide that ends at its open gate drives it out', () => {
    const out = parseLevel({
      ...base,
      trucks: [{ id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' }],
      gates: [{ color: 'red', side: 'right', index: 2 }],
      muskeg: [{ row: 2, col: 2 }],
    });
    const r = tryMove(newGame(out), 'A', 1)!;
    expect(r.exited).toBe(true);
    expect(isWon(r.state)).toBe(true);
  });

  it('a slide stops against another truck, and undo takes back the whole slide', () => {
    const lv = parseLevel({
      ...base,
      trucks: [{ id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' }, { id: 'B', color: 'blue', row: 1, col: 5, length: 2, orient: 'v' }],
      gates: [{ color: 'red', side: 'right', index: 2 }, { color: 'blue', side: 'top', index: 5 }],
      muskeg: [{ row: 2, col: 2 }, { row: 2, col: 3 }],
    });
    const r = tryMove(newGame(lv), 'A', 1)!;
    expect(r.state.trucks[0].col).toBe(3); // stopped by B at col 5
    expect(canUndo(r.state)).toBe(true);
    expect(undo(r.state).trucks[0].col).toBe(0);
    expect(undo(r.state).moves).toBe(0);
  });

  it('the solver knows the rule: its moves carry the distance really travelled', () => {
    const sol = solve(level)!;
    let s = newGame(level);
    for (const m of sol) {
      const r = tryMove(s, m.id, m.delta)!;
      expect(r.delta).toBe(m.delta);
      s = r.state;
    }
    expect(isWon(s)).toBe(true);
  });

  it('muskeg is floor: not under equipment, one thing per cell', () => {
    expect(() => parseLevel({ ...base, trucks: level.trucks, gates: level.gates, obstacles: [{ row: 0, col: 0 }], muskeg: [{ row: 0, col: 0 }] })).toThrow(LevelError);
    expect(() => parseLevel({ ...base, trucks: level.trucks, gates: level.gates, muskeg: [{ row: 0, col: 0 }, { row: 0, col: 0 }] })).toThrow(LevelError);
    expect(() => parseLevel({ ...base, trucks: level.trucks, gates: level.gates, muskeg: [{ row: 0, col: 0 }], racks: [{ row: 0, col: 0 }] })).toThrow(LevelError);
    expect(() => parseLevel({ ...base, trucks: level.trucks, gates: level.gates, muskeg: [{ row: 6, col: 0 }] })).toThrow(LevelError);
    // A truck may start on it.
    expect(parseLevel({ ...base, trucks: level.trucks, gates: level.gates, muskeg: [{ row: 2, col: 0 }] }).muskeg).toHaveLength(1);
    // Old levels have none.
    expect(parseLevel({ ...base, trucks: level.trucks, gates: level.gates })).toMatchObject({ muskeg: [], racks: [] });
  });
});

describe('load racks: a tanker must stop on one before its gate will take it', () => {
  // Row 1: tanker T at cols 0-2, rack at col 4, its gate on the right. A pickup P beside it for a spare move.
  const level = parseLevel({
    ...base,
    trucks: [{ id: 'T', color: 'red', row: 1, col: 0, length: 3, orient: 'h', load: true }, { id: 'P', color: 'blue', row: 4, col: 0, length: 2, orient: 'h' }],
    gates: [{ color: 'red', side: 'right', index: 1 }, { color: 'blue', side: 'right', index: 4 }],
    racks: [{ row: 1, col: 4 }],
  });

  it('unloaded, its gate is a wall: it can reach the end of its lane but not drive out', () => {
    const s = newGame(level);
    expect(gateOpen(s, s.trucks[0])).toBe(false);
    expect(getMoveRange(s, 'T')).toEqual({ min: 0, max: 3, exitDelta: null });
    // Another truck's gate is not affected.
    expect(getMoveRange(s, 'P')!.exitDelta).toBe(4);
  });

  it('stopping with any part of it on the rack loads it, for good', () => {
    const s = tryMove(newGame(level), 'T', 2)!.state; // cols 2-4: its nose on the rack
    expect(onRack(level, s.trucks[0])).toBe(true);
    expect(s.trucks[0].loaded).toBe(true);
    expect(gateOpen(s, s.trucks[0])).toBe(true);
    // It stays loaded after it drives off the rack.
    const off = tryMove(s, 'T', -2)!.state;
    expect(off.trucks[0].loaded).toBe(true);
    expect(getMoveRange(off, 'T')!.exitDelta).toBe(3);
  });

  it('a move that does not end on the rack does not load it', () => {
    const s = tryMove(newGame(level), 'T', 1)!.state; // cols 1-3
    expect(s.trucks[0].loaded).toBeUndefined();
    expect(getMoveRange(s, 'T')!.exitDelta).toBeNull();
  });

  it('parked against its gate while unloaded, then loaded: it drives out with one more cell', () => {
    // Slides to the end (cols 3-5: over the rack at col 4, so it loads there), parked at the gate.
    const s = tryMove(newGame(level), 'T', 3)!.state;
    expect(s.trucks[0].loaded).toBe(true);
    expect(getMoveRange(s, 'T')).toMatchObject({ max: 1, exitDelta: 1 });
    expect(tryMove(s, 'T', 1)!.exited).toBe(true);
  });

  it('undo unloads it again', () => {
    const s = tryMove(newGame(level), 'T', 2)!.state;
    expect(undo(s).trucks[0].loaded).toBeUndefined();
  });

  it('the solver loads first: two moves for the tanker, never one', () => {
    const sol = solve(level)!;
    expect(sol.filter((m) => m.id === 'T')).toHaveLength(2);
    expect(sol).toHaveLength(3);
    // Mid-game it still knows: from a loaded position the next move may be the exit.
    const loaded = play(level, [['T', 2]]);
    expect(solve(level, 500_000, loaded.trucks, loaded.moves)).toHaveLength(2);
  });

  it('a tanker needs a rack in its own lane, must be 3 long, and may not start on one', () => {
    const t = (over: object) => ({ ...base, trucks: [{ id: 'T', color: 'red', row: 1, col: 0, length: 3, orient: 'h', load: true, ...over }], gates: [{ color: 'red', side: 'right', index: 1 }] });
    expect(() => parseLevel({ ...t({}), racks: [{ row: 2, col: 4 }] })).toThrow(/no load rack in its lane/);
    expect(() => parseLevel({ ...t({}), racks: [{ row: 1, col: 1 }] })).toThrow(/starts on a load rack/);
    expect(() => parseLevel({ ...t({ length: 2 }), racks: [{ row: 1, col: 4 }] })).toThrow(/3 cells long/);
    expect(() => parseLevel({ ...t({ loaded: true }), racks: [{ row: 1, col: 4 }] })).toThrow(/set during play/);
  });
});

describe('shift-change gates: open only on even move numbers', () => {
  const level = parseLevel({
    ...base,
    trucks: [{ id: 'A', color: 'red', row: 2, col: 1, length: 2, orient: 'h' }, { id: 'B', color: 'blue', row: 4, col: 0, length: 2, orient: 'h' }],
    gates: [{ color: 'red', side: 'right', index: 2, shift: true }, { color: 'blue', side: 'right', index: 4 }],
  });

  it('the first move is move 1, odd: the gate is a wall', () => {
    const s = newGame(level);
    expect(shiftOpen(s)).toBe(false);
    expect(getMoveRange(s, 'A')).toEqual({ min: -1, max: 3, exitDelta: null });
    // An ordinary gate does not care.
    expect(getMoveRange(s, 'B')!.exitDelta).toBe(4);
  });

  it('after any one move, the next is move 2, even: it opens', () => {
    const s = tryMove(newGame(level), 'B', 1)!.state;
    expect(shiftOpen(s)).toBe(true);
    expect(getMoveRange(s, 'A')!.exitDelta).toBe(3);
    const out = tryMove(s, 'A', 3)!;
    expect(out.exited).toBe(true);
    expect(out.state.moves).toBe(2);
  });

  it('and shut again on move 3; undo steps the clock back', () => {
    const s = play(level, [['B', 1], ['B', 1]]);
    expect(s.moves).toBe(2);
    expect(getMoveRange(s, 'A')!.exitDelta).toBeNull();
    expect(getMoveRange(undo(s), 'A')!.exitDelta).toBe(3);
  });

  it('parked against it on an odd move, it drives out on the even one with one more cell', () => {
    const s = tryMove(newGame(level), 'A', 3)!.state; // move 1: up against the shut gate
    expect(getMoveRange(s, 'A')).toMatchObject({ max: 1, exitDelta: 1 });
    expect(tryMove(s, 'A', 1)!.exited).toBe(true);
  });

  it('the solver counts the clock: par includes the move spent waiting, and a hint knows whose move it is', () => {
    // A alone could never leave on move 1; with B there are spare moves. Best: B out (1), A out (2).
    expect(solve(level)).toHaveLength(2);
    const lone = parseLevel({ ...base, trucks: [level.trucks[0]], gates: [level.gates[0]] });
    expect(solve(lone)).toEqual([{ id: 'A', delta: expect.any(Number) }, { id: 'A', delta: expect.any(Number) }]);
    // The same layout asks for different moves on an odd and on an even move.
    const even = tryMove(newGame(level), 'B', 1)!.state;
    expect(nextMove(even)).toEqual({ id: 'A', delta: 3 });
    expect(nextMove(newGame(level))!.id).toBe('B');
  });

  it('a gate carries the flag through the parser', () => {
    expect(level.gates[0].shift).toBe(true);
    expect(level.gates[1].shift).toBeUndefined();
    expect(() => parseLevel({ ...base, trucks: level.trucks, gates: [{ ...level.gates[0], shift: 'yes' }, level.gates[1]] })).toThrow(LevelError);
  });
});
