import { describe, expect, it } from 'vitest';
import { EXIT_CLEAR, EXIT_COAST, EXIT_FADE_MS, EXIT_MOST_MS, ROLL_MS, exitPlan, tailClear } from './exit.ts';

describe('the drive out through a gate: the tail clears the gate, then it fades', () => {
  const cell = 56, fence = 20, pad = cell * 6;
  const starts = [
    ['right', { x: pad - 3 * cell, y: 2 * cell }, 3 * cell, cell],
    ['left', { x: 0, y: 2 * cell }, 3 * cell, cell],
    ['top', { x: cell, y: 0 }, cell, 3 * cell],
    ['bottom', { x: cell, y: pad - 3 * cell }, cell, 3 * cell],
    ['right', { x: pad - 4 * cell, y: 0 }, 2 * cell, cell],
    ['top', { x: 0, y: 2 * cell }, cell, 2 * cell],
    ['bottom', { x: 0, y: 0 }, cell, 2 * cell],
    ['left', { x: 3 * cell, y: 0 }, 3 * cell, cell],
  ] as const;

  it('the roll ends with the tail just past the berm, on every side, whatever the length, wherever it was let go', () => {
    for (const [side, from, w, h] of starts) {
      const p = exitPlan(side, from, w, h, cell, fence);
      const dx = side === 'left' ? -p.roll : side === 'right' ? p.roll : 0, dy = side === 'top' ? -p.roll : side === 'bottom' ? p.roll : 0;
      const at = (k: number) => ({ x: from.x + dx * k, y: from.y + dy * k, w, h });
      // At the end of the roll it is right through; a hair before that, it is not.
      expect(tailClear(side, at(1), cell, fence), `${side} at the end`).toBe(true);
      expect(tailClear(side, at(0.9), cell, fence), `${side} nine tenths of the way`).toBe(false);
      expect(tailClear(side, at(0.5), cell, fence)).toBe(false);
      // Just clear, not far: its tail is EXIT_CLEAR cells past the berm.
      const tailPast = p.roll - ((side === 'left' ? from.x : side === 'right' ? pad - from.x - w : side === 'top' ? from.y : pad - from.y - h) + (side === 'left' || side === 'right' ? w : h) + fence);
      expect(tailPast).toBeCloseTo(cell * EXIT_CLEAR, 6);
    }
    expect(EXIT_CLEAR).toBeGreaterThan(0);
    expect(EXIT_CLEAR).toBeLessThan(0.3);
  });

  it('a 3-cell truck against its gate rolls its own three cells, the berm and a little more; a pickup, two', () => {
    expect(exitPlan('right', { x: pad - 3 * cell, y: 0 }, 3 * cell, cell, cell, fence).roll).toBeCloseTo(3 * cell + fence + cell * EXIT_CLEAR, 6);
    expect(exitPlan('top', { x: 0, y: 0 }, cell, 2 * cell, cell, fence).roll).toBeCloseTo(2 * cell + fence + cell * EXIT_CLEAR, 6);
    // Let go already nosing 9 px into the gap: that much less to go; never backwards.
    expect(exitPlan('left', { x: -9, y: 0 }, 2 * cell, cell, cell, fence).roll).toBeCloseTo(2 * cell + fence + cell * EXIT_CLEAR - 9, 6);
    expect(exitPlan('left', { x: -5000, y: 0 }, 2 * cell, cell, cell, fence).roll).toBe(cell * 0.25);
  });

  it('then it fades, over a short coast: no fading is part of the roll', () => {
    for (const [side, from, w, h] of starts) {
      const p = exitPlan(side, from, w, h, cell, fence);
      expect(p.fadeMs).toBe(EXIT_FADE_MS);
      expect(p.coast).toBe(cell * EXIT_COAST);
      expect(p.coast).toBeLessThan(cell);
      // A steady pace: a longer way takes longer, within limits.
      expect(p.rollMs).toBeGreaterThanOrEqual(ROLL_MS.least);
      expect(p.rollMs).toBeLessThanOrEqual(ROLL_MS.most);
      expect(p.rollMs + p.fadeMs).toBeLessThanOrEqual(EXIT_MOST_MS);
    }
    const near = exitPlan('right', { x: pad - 2 * cell, y: 0 }, 2 * cell, cell, cell, fence), far = exitPlan('right', { x: 0, y: 0 }, 3 * cell, cell, cell, fence);
    expect(far.rollMs).toBeGreaterThan(near.rollMs);
    expect(EXIT_FADE_MS).toBeLessThanOrEqual(300);
  });
});
