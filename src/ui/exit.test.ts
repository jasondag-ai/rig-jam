import { describe, expect, it } from 'vitest';
import { EXIT_FADE, EXIT_PAST, exitDistance } from './exit.ts';

describe('the drive out through a gate', () => {
  const cell = 56, fence = 20, pad = cell * 6;

  it('ends with the cab about one cell past the gate, on every side, wherever the truck was', () => {
    expect(EXIT_PAST).toBeGreaterThanOrEqual(0.8);
    expect(EXIT_PAST).toBeLessThanOrEqual(1.2);
    // A 3-cell truck against each gate: the same short drive.
    const reach = fence + cell * EXIT_PAST;
    expect(exitDistance('right', { x: pad - 3 * cell, y: 2 * cell }, 3 * cell, cell, cell, fence)).toBe(reach);
    expect(exitDistance('left', { x: 0, y: 2 * cell }, 3 * cell, cell, cell, fence)).toBe(reach);
    expect(exitDistance('top', { x: cell, y: 0 }, cell, 3 * cell, cell, fence)).toBe(reach);
    expect(exitDistance('bottom', { x: cell, y: pad - 3 * cell }, cell, 3 * cell, cell, fence)).toBe(reach);
    // One let go two cells short of its gate drives those two cells as well.
    expect(exitDistance('right', { x: pad - 4 * cell, y: 0 }, 2 * cell, cell, cell, fence)).toBe(2 * cell + reach);
    expect(exitDistance('top', { x: 0, y: 2 * cell }, cell, 2 * cell, cell, fence)).toBe(2 * cell + reach);
  });

  it('is far shorter than the old drive right across the board, and never backwards', () => {
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      expect(exitDistance(side, { x: 0, y: 0 }, 2 * cell, cell, cell, fence)).toBeLessThan(cell * 7);
      // Already nosing 9 px into the gate's gap: that much less to go, and always forwards.
      expect(exitDistance(side, { x: -9, y: -9 }, pad + 18, pad + 18, cell, fence)).toBe(fence + cell * EXIT_PAST - 9);
      expect(exitDistance(side, { x: -500, y: -500 }, pad + 1000, pad + 1000, cell, fence)).toBe(cell * 0.25);
    }
  });

  it('fades over the last 45% of the drive', () => {
    expect(EXIT_FADE).toBe(0.45);
  });
});
