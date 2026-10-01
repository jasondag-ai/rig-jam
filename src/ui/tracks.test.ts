import { describe, expect, it } from 'vitest';
import type { Truck } from '../engine/index.ts';
import {
  END_INSET,
  FADE_FLOOR,
  WEAR_CAP,
  WHEEL_OFFSET,
  addWear,
  passOf,
  removeWear,
  revealed,
  segments,
  stretchOf,
  trackOpacity,
  type Wear,
} from './tracks.ts';

const h: Truck = { id: 'A', color: 'red', row: 2, col: 1, length: 2, orient: 'h' };
const v: Truck = { id: 'B', color: 'blue', row: 1, col: 4, length: 3, orient: 'v' };

describe('passes', () => {
  it('covers the ground between the start and end footprints', () => {
    expect(passOf(h, 2, false)).toEqual({ orient: 'h', lane: 2, from: 1, to: 4, fenceLow: false, fenceHigh: false });
    expect(passOf(v, -1, false)).toMatchObject({ orient: 'v', lane: 4, from: 0, to: 3 });
  });

  it('runs to the fence when the truck drives out', () => {
    expect(passOf(h, 3, true)).toMatchObject({ from: 1, to: 5, fenceHigh: true });
    expect(passOf(v, -1, true)).toMatchObject({ from: 0, fenceLow: true });
  });

  it('knows the whole stretch a drag could reach', () => {
    expect(stretchOf(h, { min: -1, max: 3, exitDelta: 3 })).toMatchObject({ from: 0, to: 5, fenceHigh: true, fenceLow: false });
  });
});

describe('wheel marks', () => {
  it('draws two wheel lines, inset at the ends', () => {
    const [a, b] = segments(passOf(h, 2, false), new Map(), 1);
    expect(a).toEqual({ x1: 1 + END_INSET, y1: 2.5 - WHEEL_OFFSET, x2: 5 - END_INSET, y2: 2.5 - WHEEL_OFFSET, wear: 1 });
    expect(b.y1).toBeCloseTo(2.5 + WHEEL_OFFSET);
  });

  it('runs exits right to the fence', () => {
    const s = segments(passOf(h, 3, true), new Map(), 1);
    expect(s[0].x2).toBe(6);
  });
});

describe('wear', () => {
  it('makes repeated passes deeper only where they overlap', () => {
    const wear: Wear = new Map();
    addWear(wear, passOf(h, 2, false)); // cols 1-4
    addWear(wear, passOf({ ...h, col: 3 }, 1, false)); // cols 3-5
    const s = segments(passOf({ ...h, col: 3 }, 1, false), wear);
    // cols 3-4 have two passes, col 5 has one: two runs per wheel.
    expect(s.filter((x) => x.y1 < 2.5).map((x) => [x.x1, x.x2, x.wear])).toEqual([
      [3 + END_INSET, 5, 2],
      [5, 6 - END_INSET, 1],
    ]);
  });

  it('stops getting deeper at the cap', () => {
    const wear: Wear = new Map();
    const p = passOf(h, 1, false);
    for (let i = 0; i < 10; i++) addWear(wear, p);
    expect(segments(p, wear).every((s) => s.wear === WEAR_CAP)).toBe(true);
  });

  it('undo takes a pass back off', () => {
    const wear: Wear = new Map();
    const p = passOf(h, 1, false);
    addWear(wear, p);
    addWear(wear, p);
    removeWear(wear, p);
    expect(segments(p, wear)[0].wear).toBe(1);
    removeWear(wear, p);
    expect(wear.size).toBe(0);
  });
});

describe('progressive reveal', () => {
  it('reveals from the start footprint to wherever the truck is now', () => {
    expect(revealed(1, 1, 2)).toEqual([1, 3]);
    expect(revealed(1, 2.4, 2)).toEqual([1, 4.4]);
    expect(revealed(3, 1.5, 2)).toEqual([1.5, 5]);
  });

  it('stops at the fence when the truck drives out', () => {
    expect(revealed(2, 9, 2)).toEqual([2, 6]);
    expect(revealed(2, -4, 2)).toEqual([0, 4]);
  });
});

describe('fading', () => {
  it('fades older tracks, but never below the floor', () => {
    expect(trackOpacity(0)).toBe(1);
    expect(trackOpacity(1)).toBeCloseTo(0.9);
    expect(trackOpacity(50)).toBe(FADE_FLOOR);
  });
});
