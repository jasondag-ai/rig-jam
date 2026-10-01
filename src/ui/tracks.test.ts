import { describe, expect, it } from 'vitest';
import {
  DragPath,
  END_INSET,
  FADE_FLOOR,
  WEAR_CAP,
  WHEEL_OFFSET,
  addWear,
  removeWear,
  sweepCells,
  sweepSegments,
  trackOpacity,
  type Wear,
} from './tracks.ts';

describe('drag path', () => {
  it('follows a straight drag as one sweep over both footprints', () => {
    const p = new DragPath(1, 2);
    expect(p.current).toBeNull(); // not moved yet
    for (const x of [1.2, 1.8, 2.6, 3]) p.update(x);
    expect(p.current).toEqual({ lo: 1, hi: 5 });
    expect(p.end()).toEqual({ lo: 1, hi: 5 });
    expect(p.closed).toEqual([{ lo: 1, hi: 5 }]);
  });

  it('splits a back-and-forth drag into a sweep per direction', () => {
    const p = new DragPath(1, 2);
    const reversals: unknown[] = [];
    for (const x of [1.5, 2.5, 3, 2.6, 2, 1.2, 0.5, 0, 0.8, 1]) {
      const done = p.update(x);
      if (done) reversals.push(done);
    }
    p.end();
    expect(reversals).toEqual([{ lo: 1, hi: 5 }, { lo: 0, hi: 5 }]);
    expect(p.closed.at(-1)).toEqual({ lo: 0, hi: 3 });
  });

  it('ignores a small snap-back when the finger lifts', () => {
    const p = new DragPath(1, 2);
    for (const x of [1.8, 2.4, 2.1, 2]) p.update(x);
    expect(p.end()).toEqual({ lo: 1, hi: 4.4 });
    expect(p.closed).toHaveLength(1);
  });

  it('never runs past the fence', () => {
    const p = new DragPath(3, 3);
    for (const x of [4, 6, 9]) p.update(x);
    expect(p.end()).toEqual({ lo: 3, hi: 6 });
  });
});

describe('wear', () => {
  it('wears only cells a sweep covers at least halfway', () => {
    expect(sweepCells({ lo: 1, hi: 4.4 })).toEqual([1, 2, 3]);
    expect(sweepCells({ lo: 0.4, hi: 3 })).toEqual([0, 1, 2]);
  });

  it('counts every pass, so back-and-forth lanes wear in, up to the cap', () => {
    const wear: Wear = new Map();
    for (let i = 0; i < 3; i++) addWear(wear, 'h', 2, [1, 2, 3]);
    const marks = sweepSegments('h', 2, { lo: 1, hi: 4 }, wear);
    expect(marks.every((s) => s.wear === 3)).toBe(true);
    for (let i = 0; i < 9; i++) addWear(wear, 'h', 2, [1, 2, 3]);
    expect(sweepSegments('h', 2, { lo: 1, hi: 4 }, wear).every((s) => s.wear === WEAR_CAP)).toBe(true);
  });

  it('undo takes those passes back off', () => {
    const wear: Wear = new Map();
    addWear(wear, 'v', 4, [0, 1]);
    removeWear(wear, 'v', 4, [0, 1]);
    expect(wear.size).toBe(0);
  });
});

describe('wheel marks', () => {
  it('draws two wheel lines, inset at the truck ends, deeper where the lane is worn', () => {
    const wear: Wear = new Map();
    addWear(wear, 'h', 2, [3, 4]);
    const marks = sweepSegments('h', 2, { lo: 1, hi: 5 }, wear, 1);
    const top = marks.filter((s) => s.y1 < 2.5);
    expect(top.map((s) => [s.x1, s.x2, s.wear])).toEqual([
      [1 + END_INSET, 3, 1],
      [3, 5 - END_INSET, 2],
    ]);
    expect(top[0].y1).toBeCloseTo(2.5 - WHEEL_OFFSET);
  });

  it('runs right to the fence when the truck drives out', () => {
    const marks = sweepSegments('v', 1, { lo: 0, hi: 3 }, new Map(), 1);
    expect(marks[0].y1).toBe(0);
  });
});

describe('fading', () => {
  it('fades older tracks, but never below the floor', () => {
    expect(trackOpacity(0)).toBe(1);
    expect(trackOpacity(1)).toBeCloseTo(0.9);
    expect(trackOpacity(50)).toBe(FADE_FLOOR);
  });
});
