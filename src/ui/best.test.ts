import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../engine/index.ts';
import { bestFrom, bestLine, positionKey } from './best.ts';

describe('the best score still possible', () => {
  it('N is the moves made plus the best line from here; no line, no N', () => {
    expect(bestFrom(0, [1, 2, 3])).toBe(3);
    expect(bestFrom(4, [1, 2])).toBe(6);
    expect(bestFrom(7, [])).toBe(7);
    expect(bestFrom(3, null)).toBeNull();
    expect(bestFrom(3, undefined)).toBeNull();
  });

  it('the words: "Best from here: N" up to par, "Par out of reach: best N" over it', () => {
    expect(bestLine(6, 6)).toEqual({ text: 'Best from here: 6', over: false });
    expect(bestLine(5, 6)).toEqual({ text: 'Best from here: 5', over: false });
    expect(bestLine(7, 6)).toEqual({ text: 'Par out of reach: best 7', over: true });
    expect(bestLine(31, 24)).toEqual({ text: 'Par out of reach: best 31', over: true });
    for (const n of [1, 9, 24, 40]) for (const s of [bestLine(n, 20).text]) expect(s).not.toMatch(/—|–/);
  });

  it('along the best line of a level N stays at par, move after move, on a pad of every kind', () => {
    // (Cardium 9, Montney 6 with equipment, Duvernay 5 with a convoy, Mannville 3 with muskeg, Bakken 7 with racks and
    // a clock gate, Clearwater 2 on the Big Pad, Baldonnel 4 with road ban patches.)
    for (const [ri, li] of [[0, 8], [1, 5], [2, 4], [3, 2], [4, 6], [5, 1], [6, 3]]) {
      const level = REGIONS[ri].levels[li];
      let state = newGame(level);
      const line = solve(level)!;
      expect(bestFrom(state.moves, line), level.id).toBe(level.par);
      for (let i = 0; i < line.length; i++) {
        state = tryMove(state, line[i].id, line[i].delta)!.state;
        // (The rest of the line is still a best line from here: a shorter one would have made the whole shorter.)
        expect(bestFrom(state.moves, line.slice(i + 1)), `${level.id} after move ${i + 1}`).toBe(level.par);
        if (i === 1 || i === line.length - 3) expect(bestFrom(state.moves, solve(level, 2_000_000, state.trucks, state.moves)), `${level.id} solved afresh after move ${i + 1}`).toBe(level.par);
      }
    }
  });

  it('a wasted move puts par out of reach: a truck moved and moved back costs two', () => {
    const level = REGIONS[0].levels[4];
    let state = newGame(level);
    const t = state.trucks.map((x) => ({ x, r: getMoveRange(state, x.id)! })).find(({ r }) => (r.max > 0 && r.exitDelta !== r.max) || (r.min < 0 && r.exitDelta !== r.min))!;
    const d = t.r.max > 0 && t.r.exitDelta !== t.r.max ? 1 : -1;
    state = tryMove(state, t.x.id, d)!.state;
    state = tryMove(state, t.x.id, -d)!.state;
    expect(state.moves).toBe(2);
    const n = bestFrom(state.moves, solve(level, 500_000, state.trucks, state.moves))!;
    expect(n).toBe(level.par + 2);
    expect(bestLine(n, level.par)).toEqual({ text: `Par out of reach: best ${level.par + 2}`, over: true });
  });

  it('a position has one key: the same after a move and its Undo is NOT the same as before (the moves differ), the same pad at the same count is', () => {
    const level = REGIONS[0].levels[4];
    const a = newGame(level), line = solve(level)!;
    const b = tryMove(a, line[0].id, line[0].delta)!.state;
    expect(positionKey(a)).toBe(positionKey(newGame(level)));
    expect(positionKey(b)).not.toBe(positionKey(a));
    expect(positionKey(b)).toContain(`${b.moves}|`);
  });
});
