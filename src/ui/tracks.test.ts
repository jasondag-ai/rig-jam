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
  sweepVary,
  FADE_STEP,
  VARY_OFFSET,
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
    expect(trackOpacity(1)).toBeCloseTo(1 - FADE_STEP);
    // Old wear sinks fast: four drags on, a lane is at the floor, a faint trace.
    expect(trackOpacity(4)).toBe(FADE_FLOOR);
    expect(FADE_FLOOR).toBeLessThan(0.2);
    expect(trackOpacity(50)).toBe(FADE_FLOOR);
  });
});

describe('no grid from worn lanes', () => {
  const sweeps = Array.from({ length: 40 }, (_, i) => sweepVary(i * 101 + 7));

  it('every sweep sits a little off the lane centre line, in its own width, the same every time', () => {
    expect(sweepVary(5)).toEqual(sweepVary(5));
    expect(new Set(sweeps.map((v) => v.offset.toFixed(3))).size).toBeGreaterThan(24);
    expect(new Set(sweeps.map((v) => v.width.toFixed(2))).size).toBeGreaterThan(15);
    for (const v of sweeps) {
      expect(Math.abs(v.offset)).toBeLessThanOrEqual(VARY_OFFSET);
      expect(v.width).toBeGreaterThan(0.75);
      expect(v.width).toBeLessThan(1.25);
    }
  });

  it('wheel marks of repeated passes do not stack on one line, and stay inside their lane', () => {
    const wear = new Map<string, number>();
    const ys = sweeps.map((v) => sweepSegments('h', 2, { lo: 0, hi: 6 }, wear, 1, v)[0].y1);
    expect(new Set(ys.map((y) => y.toFixed(3))).size).toBeGreaterThan(24);
    for (const y of ys) {
      expect(y).toBeGreaterThan(2);
      expect(y).toBeLessThan(3);
    }
  });

  it('steps between wear levels fall off the cell edges', () => {
    const wear = new Map<string, number>([['h2:0', 3], ['h2:1', 3], ['h2:2', 1], ['h2:3', 1]]);
    const edges = sweeps.flatMap((v) => sweepSegments('h', 2, { lo: 0, hi: 4 }, wear, 0, v).map((s) => s.x2)).filter((x) => x > 0.2 && x < 3.8);
    expect(edges.length).toBeGreaterThan(20);
    // Hardly any land on a whole cell.
    expect(edges.filter((x) => Math.abs(x - Math.round(x)) < 0.02).length).toBeLessThan(edges.length * 0.2);
    // A sweep's own ends never move.
    for (const v of sweeps) {
      const segs = sweepSegments('h', 2, { lo: 0, hi: 4 }, wear, 0, v);
      expect(Math.min(...segs.map((s) => s.x1))).toBe(0);
      expect(Math.max(...segs.map((s) => s.x2))).toBeCloseTo(4 - 0.15, 9);
    }
  });
});
