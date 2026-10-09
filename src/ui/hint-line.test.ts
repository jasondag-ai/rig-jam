import { describe, expect, it } from 'vitest';
import { getMoveRange, isWon, newGame, solve, tryMove, undo, type GameState, type Move } from '../engine/index.ts';
import { REGIONS } from '../levels/regions.ts';
import { hintOf, lineAfter, lineFrom } from './hint-line.ts';

const level = (region: string, n: number) => REGIONS.find((r) => r.id === region)!.levels[n - 1];

/** The game's own hint, as GameView takes it: the kept line's first move, or a fresh solve from where the pad stands. */
function hintFor(state: GameState, line: Move[] | null, count: { solves: number }): { hint: Move; line: Move[] } {
  let kept = line;
  if (!hintOf(kept)) {
    count.solves++;
    kept = lineFrom(solve(state.level, 500_000, state.trucks, state.moves));
  }
  return { hint: hintOf(kept)!, line: kept! };
}

describe('hints in a row (Job X): every hint is the next move of a best line', () => {
  for (const [region, n] of [['cardium', 9], ['bakken', 7], ['clearwater', 10]] as const) {
    it(`${region} ${n}: take a hint, play it, again and again: every hint is legal and the level ends in exactly par moves`, () => {
      const lv = level(region, n);
      let state = newGame(lv);
      let line: Move[] | null = null;
      const count = { solves: 0 };
      const hinted: Move[] = [];
      while (!isWon(state)) {
        const h = hintFor(state, line, count);
        line = h.line;
        hinted.push(h.hint);
        // Legal: inside what the truck can really do from here.
        const range = getMoveRange(state, h.hint.id)!;
        expect(range, `move ${hinted.length}: truck ${h.hint.id} is on the pad`).not.toBeNull();
        expect(h.hint.delta).toBeGreaterThanOrEqual(range.min);
        expect(h.hint.delta).toBeLessThanOrEqual(range.max);
        const result = tryMove(state, h.hint.id, h.hint.delta);
        expect(result, `move ${hinted.length} (${h.hint.id} by ${h.hint.delta}) is legal`).not.toBeNull();
        state = result!.state;
        // The player played exactly the hint: the line moves on (what GameView.resetHint does).
        line = lineAfter(line, h.hint, { id: h.hint.id, delta: result!.delta });
        expect(hinted.length).toBeLessThanOrEqual(lv.par);
      }
      expect(state.moves).toBe(lv.par);
      expect(hinted.length).toBe(lv.par);
      // One solve served the whole run, and no hint undid the one before it (the bug: "move B", then "move B back").
      expect(count.solves).toBe(1);
      for (let i = 1; i < hinted.length; i++) expect(hinted[i].id === hinted[i - 1].id && hinted[i].delta === -hinted[i - 1].delta).toBe(false);
    }, 60_000);
  }

  it('the kept line starts at the move being hinted, and moves on one move at a time', () => {
    const path: Move[] = [{ id: 'A', delta: 2 }, { id: 'B', delta: -1 }, { id: 'A', delta: 3 }];
    const line = lineFrom(path);
    expect(hintOf(line)).toEqual({ id: 'A', delta: 2 });
    const second = lineAfter(line, hintOf(line), { id: 'A', delta: 2 });
    expect(hintOf(second)).toEqual({ id: 'B', delta: -1 });
    const third = lineAfter(second, hintOf(second), { id: 'B', delta: -1 });
    expect(hintOf(third)).toEqual({ id: 'A', delta: 3 });
    expect(lineAfter(third, hintOf(third), { id: 'A', delta: 3 })).toBeNull();
    expect(lineFrom(null)).toBeNull();
    expect(lineFrom([])).toBeNull();
  });

  it('a move that is not the hint, Undo and Restart each clear the kept line', () => {
    const lv = level('cardium', 9);
    const start = newGame(lv);
    const line = lineFrom(solve(lv, 500_000, start.trucks, start.moves))!;
    const hint = hintOf(line)!;
    // Another truck, or the hinted truck by another distance.
    expect(lineAfter(line, hint, { id: hint.id === 'A' ? 'B' : 'A', delta: 1 })).toBeNull();
    expect(lineAfter(line, hint, { id: hint.id, delta: hint.delta + (hint.delta > 0 ? -1 : 1) || -hint.delta })).toBeNull();
    // Undo and Restart: the pad changed with no move played (GameView calls resetHint with nothing).
    expect(lineAfter(line, hint)).toBeNull();
    expect(lineAfter(line, hint, undefined)).toBeNull();
    // A move played with no hint showing drops it too, even if it happens to be the line's own first move.
    expect(lineAfter(line, null, { id: hint.id, delta: hint.delta })).toBeNull();
    // And after any of them the next hint is a fresh best line from where the pad now stands: a detour, an Undo
    // back, then hints all the way still end at par.
    const count = { solves: 0 };
    let state = start;
    const other = start.trucks.map((t) => ({ t, r: getMoveRange(start, t.id)! })).find(({ t, r }) => t.id !== hint.id && (r.max >= 1 || r.min <= -1))!;
    const detour = tryMove(state, other.t.id, other.r.max >= 1 ? 1 : -1)!;
    let kept = lineAfter(line, hint, { id: other.t.id, delta: detour.delta });
    expect(kept).toBeNull();
    state = undo(detour.state);
    kept = lineAfter(kept, null);
    while (!isWon(state)) {
      const h = hintFor(state, kept, count);
      const result = tryMove(state, h.hint.id, h.hint.delta)!;
      expect(result).not.toBeNull();
      state = result.state;
      kept = lineAfter(h.line, h.hint, { id: h.hint.id, delta: result.delta });
    }
    expect(count.solves).toBe(1);
    expect(state.moves).toBe(lv.par);
  }, 60_000);
});
