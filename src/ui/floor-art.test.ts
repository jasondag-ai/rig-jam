import { describe, expect, it } from 'vitest';
import { SOFT_INSET, softSvg } from './floor-art.ts';

describe('the road ban patch (soft ground), as drawn', () => {
  it('lies wholly inside its own cell, whatever its seed: nothing for the yard\'s clip to cut off beside the berm', () => {
    for (let seed = 0; seed < 400; seed++) {
      const svg = softSvg(seed);
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).not.toMatch(/transform=|NaN|undefined/);
      // Every point of every path and every clod, with half its stroke, stays inside the cell by SOFT_INSET.
      for (const path of svg.matchAll(/<path d="([^"]*)"([^>]*)>/g)) {
        const half = Number(/stroke-width="([\d.]+)"/.exec(path[2])?.[1] ?? 0) / 2;
        for (const n of path[1].match(/-?\d+(\.\d+)?/g)!.map(Number)) {
          expect(n - half, `seed ${seed}: ${path[1].slice(0, 30)}`).toBeGreaterThanOrEqual(SOFT_INSET - 0.01);
          expect(n + half, `seed ${seed}`).toBeLessThanOrEqual(100 - SOFT_INSET + 0.01);
        }
      }
      for (const c of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) for (const v of [c[1], c[2]]) { expect(Number(v) - Number(c[3])).toBeGreaterThan(10); expect(Number(v) + Number(c[3])).toBeLessThan(90); }
    }
  });

  it('is simple: a snow rim, mud, two water-filled ruts; the same patch for the same seed, another for another', () => {
    const a = softSvg(17);
    expect(softSvg(17)).toBe(a);
    expect(softSvg(18)).not.toBe(a);
    expect((a.match(/<path/g) ?? []).length).toBe(4 + 2 * 3);
    expect(a).toContain('#f2f6f9'); // the snow
    expect(a).toContain('#4a3a26'); // the mud
    expect(a).toContain('#6f7d86'); // water in the ruts
    expect(a).not.toContain('<ellipse');
  });
});
