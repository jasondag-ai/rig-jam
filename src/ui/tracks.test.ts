import { describe, expect, it } from 'vitest';
import type { Truck } from '../engine/index.ts';
import { FADE_FLOOR, WHEEL_OFFSET, trackLines, trackOpacity } from './tracks.ts';

const h: Truck = { id: 'A', color: 'red', row: 2, col: 1, length: 2, orient: 'h' };
const v: Truck = { id: 'B', color: 'blue', row: 1, col: 4, length: 3, orient: 'v' };

describe('tire tracks', () => {
  it('lays two wheel lines over the ground a truck rolled across', () => {
    const [a, b] = trackLines(h, 2, false); // cols 1-2 -> 3-4
    expect(a).toEqual({ x1: 1.15, y1: 2.5 - WHEEL_OFFSET, x2: 4.85, y2: 2.5 - WHEEL_OFFSET });
    expect(b.y1).toBeCloseTo(2.5 + WHEEL_OFFSET);
  });

  it('works backwards and vertically', () => {
    const [a] = trackLines(v, -1, false); // rows 1-3 -> 0-2
    expect(a).toEqual({ x1: 4.5 - WHEEL_OFFSET, y1: 0.15, x2: 4.5 - WHEEL_OFFSET, y2: 3.85 });
  });

  it('runs to the fence when the truck drives out', () => {
    expect(trackLines(h, 3, true)[0].x2).toBe(6);
    expect(trackLines(v, -1, true)[0].y1).toBe(0);
  });

  it('fades older tracks, but never below the floor', () => {
    expect(trackOpacity(0)).toBe(1);
    expect(trackOpacity(1)).toBeCloseTo(0.9);
    expect(trackOpacity(50)).toBe(FADE_FLOOR);
  });
});
