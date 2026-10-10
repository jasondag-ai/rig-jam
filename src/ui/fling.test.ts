import { describe, expect, it } from 'vitest';
import { cabSide, gateOpen, getMoveRange, newGame, sizeOf, solve, tryMove, undo, type GameState } from '../engine/index.ts';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { FLING_SPEED, FLING_STALE_MS, FLING_TRAVEL, FLING_WINDOW_MS, PUSH_HOLD_MS, addSample, fingerSpeed, flingDelta, flingDir, flingMs, flingOn, type Sample } from './fling.ts';
import { lineAfter, lineFrom, hintOf } from './hint-line.ts';

const CELL = 54;
/** A finger moving at a steady `speed` cells a second for `ms`, a sample every 8 ms, ending at time `end`. */
const steady = (speed: number, ms: number, end = 1000, cell = CELL): Sample[] => {
  let s: Sample[] = [];
  for (let t = end - ms; t <= end; t += 8) s = addSample(s, { t, at: 200 + ((t - (end - ms)) / 1000) * speed * cell });
  return s;
};

describe('fling: the decision (job U4)', () => {
  it('one number to tune, in cells a second, over a short window', () => {
    expect(FLING_SPEED).toBeGreaterThanOrEqual(8);
    expect(FLING_SPEED).toBeLessThanOrEqual(16);
    expect(FLING_WINDOW_MS).toBeLessThanOrEqual(120);
    expect(PUSH_HOLD_MS).toBeGreaterThan(FLING_STALE_MS);
  });

  it('a fast finger still moving when it lifts is a fling, the way it was going', () => {
    expect(flingDir(steady(FLING_SPEED * 2, 120), 1004, CELL)).toBe(1);
    expect(flingDir(steady(-FLING_SPEED * 2, 120), 1004, CELL)).toBe(-1);
    expect(flingDir(steady(FLING_SPEED * 1.1, 120), 1010, CELL)).toBe(1);
    expect(fingerSpeed(steady(20, 120), 1004, CELL)).toBeCloseTo(20, 0);
  });

  it('a normal drag never flings: a slower finger, at any length of drag', () => {
    for (const speed of [1, 3, 6, FLING_SPEED * 0.9]) for (const ms of [80, 200, 600]) {
      expect(flingDir(steady(speed, ms), 1004, CELL), `${speed} cells/s for ${ms} ms`).toBe(0);
      expect(flingDir(steady(-speed, ms), 1004, CELL)).toBe(0);
    }
  });

  it('a finger that stops before it lifts never flings, however fast it came', () => {
    const fast = steady(30, 150);
    expect(flingDir(fast, 1000 + FLING_STALE_MS + 1, CELL)).toBe(0);
    expect(flingDir(fast, 1300, CELL)).toBe(0);
    // Fast, then slowing to a stop under the finger: the last window is slow.
    let s = fast;
    for (let t = 1008; t <= 1120; t += 8) s = addSample(s, { t, at: s.at(-1)!.at + 1 });
    expect(flingDir(s, 1124, CELL)).toBe(0);
  });

  it('a twitch is not a flick: too short a way, or too short a time to tell', () => {
    // 12 px in 16 ms is fast, but it is under FLING_TRAVEL of a cell.
    expect(12 / CELL).toBeLessThan(FLING_TRAVEL);
    expect(flingDir([{ t: 984, at: 100 }, { t: 992, at: 106 }, { t: 1000, at: 112 }], 1002, CELL)).toBe(0);
    expect(flingDir([{ t: 1000, at: 100 }], 1001, CELL)).toBe(0);
    expect(flingDir([{ t: 996, at: 100 }, { t: 1000, at: 180 }], 1001, CELL)).toBe(0);
    expect(flingDir([], 1000, CELL)).toBe(0);
  });

  it('only the last stretch counts: a slow drag that ends in a flick flings, and back the other way too', () => {
    let s = steady(2, 400, 800);
    for (let t = 808; t <= 900; t += 8) s = addSample(s, { t, at: s.at(-1)!.at - 16 });
    expect(flingDir(s, 904, CELL)).toBe(-1);
  });

  it('the same flick is a fling on a pad of 8 at 375 wide and on a pad of 6 at 430', () => {
    for (const cell of [42, 44, 54, 62]) {
      expect(flingDir(steady(FLING_SPEED * 1.5, 100, 1000, cell), 1004, cell), `cell ${cell}`).toBe(1);
      expect(flingDir(steady(FLING_SPEED * 0.7, 100, 1000, cell), 1004, cell), `cell ${cell}`).toBe(0);
    }
  });

  it('the slide is quick, and a little longer for a long way', () => {
    expect(flingMs(1)).toBeGreaterThanOrEqual(150);
    expect(flingMs(4)).toBeGreaterThan(flingMs(1));
    expect(flingMs(7)).toBeLessThanOrEqual(430);
    expect(flingMs(-3)).toBe(flingMs(3));
  });

  it('it is on for people and off in an automated browser unless asked for', () => {
    expect(flingOn('', false)).toBe(true);
    expect(flingOn('', true)).toBe(false);
    expect(flingOn('?fling=1', true)).toBe(true);
    expect(flingOn('?fling=0', false)).toBe(false);
  });
});

describe('fling: where it ends, under every region\'s rules', () => {
  /** Every position along a level's own best line (its start and after each move). */
  const along = (level: (typeof REGIONS)[number]['levels'][number]): GameState[] => {
    let s = newGame(level);
    const out = [s];
    for (const m of solve(level)!) { s = tryMove(s, m.id, m.delta)!.state; out.push(s); }
    return out;
  };
  const places = (s: GameState) => s.trucks.map((t) => `${t.id}@${t.row},${t.col}${t.loaded ? 'L' : ''}`).join(' ');

  for (const region of [...REGIONS, { id: 'daily', name: 'Daily Pad', levels: DAILY_LEVELS.slice(0, 12) }]) {
    it(`${region.name}: every truck flung either way goes to the end of its range, out only where its gate takes it, in one move that Undo takes back`, () => {
      let flings = 0, outs = 0, shut = 0;
      for (const level of region.levels) for (const state of along(level)) for (const truck of state.trucks) {
        const range = getMoveRange(state, truck.id)!;
        for (const dir of [1, -1] as const) {
          const delta = flingDelta(range, dir);
          expect(delta, 'the far end that way').toBe(dir > 0 ? range.max : range.min);
          expect(Object.is(delta, -0)).toBe(false);
          if (delta === 0) continue;
          flings++;
          const r = tryMove(state, truck.id, delta);
          expect(r, `${level.id} ${truck.id} ${delta}`).not.toBeNull();
          expect(r!.state.moves).toBe(state.moves + 1);
          expect(places(undo(r!.state))).toBe(places(state));
          // Out exactly when that end is its way out, and only by a gate open to it now.
          expect(r!.exited, `${level.id} ${truck.id} ${delta}`).toBe(delta === range.exitDelta);
          if (r!.exited) {
            outs++;
            expect(gateOpen(state, truck)).toBe(true);
            expect(r!.state.trucks.some((t) => t.id === truck.id)).toBe(false);
            continue;
          }
          // Still on the pad: it can go no further that way (it is against something, a shut gate included).
          const after = getMoveRange(r!.state, truck.id)!;
          const more = dir > 0 ? after.max : after.min;
          const side = cabSide(level, truck), toGate = (side === 'right' || side === 'bottom') === dir > 0;
          const me = r!.state.trucks.find((t) => t.id === truck.id)!, pos = truck.orient === 'h' ? me.col : me.row;
          const atGate = toGate && (dir > 0 ? pos + truck.length === sizeOf(level) : pos === 0);
          if (atGate && gateOpen(r!.state, me)) expect(Math.abs(more), 'parked at an open gate: one more cell drives out').toBe(1);
          else expect(more + 0, `${level.id} ${truck.id} stops at the end`).toBe(0);
          if (atGate && !gateOpen(state, truck)) shut++;
          // The engine says how far it really went (a slide over muskeg runs on): never short of the fling.
          expect(Math.abs(r!.delta)).toBeGreaterThanOrEqual(Math.abs(delta));
        }
      }
      expect(flings).toBeGreaterThan(50);
      expect(outs).toBeGreaterThan(5);
      // Duvernay's convoys, Bakken's racks and clock gates: flung at a gate that is shut for it, a truck stops there.
      if (['duvernay', 'mannville', 'bakken'].includes(region.id)) expect(shut, 'stopped at a shut gate').toBeGreaterThan(0);
    });
  }

  it('hints in a row: flinging the hinted move carries the line on; a fling that goes further starts a fresh one', () => {
    let carried = 0, fresh = 0;
    for (const level of [REGIONS[0].levels[8], REGIONS[4].levels[6], REGIONS[5].levels[9]]) {
      let state = newGame(level), line = lineFrom(solve(level));
      while (line) {
        const hint = hintOf(line)!;
        const range = getMoveRange(state, hint.id)!;
        const flung = flingDelta(range, hint.delta > 0 ? 1 : -1);
        const r = tryMove(state, hint.id, flung)!;
        const next = lineAfter(line, hint, { id: hint.id, delta: r.delta });
        if (r.delta === hint.delta) { carried++; expect(next).toEqual(line.length > 1 ? line.slice(1) : null); }
        else { fresh++; expect(next).toBeNull(); }
        // Either way the next hint is a legal move from where the pad now stands.
        state = r.state;
        line = next ?? lineFrom(state.trucks.length ? solve({ ...level, trucks: state.trucks.map(({ loaded: _l, ...t }) => t) } as typeof level) : null);
        if (fresh > 40) break;
        if (line) expect(getMoveRange(state, hintOf(line)!.id)).not.toBeNull();
      }
    }
    expect(carried).toBeGreaterThan(10);
  });
});
