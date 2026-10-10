import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { MOUNTAIN_MIN, MOUNTAIN_SHARE, mountainsSvg, peaks } from './mountains.ts';
import { sceneryHtml } from './scenery.ts';
import { THEMES } from './themes.ts';

describe("Baldonnel's mountains (job U6c)", () => {
  it('the same range every visit: one fixed seed, in shares of the width', () => {
    expect(peaks()).toEqual(peaks());
    expect(mountainsSvg(390, 6, 120)).toBe(mountainsSvg(390, 6, 120));
    expect(peaks().far).toHaveLength(6);
    expect(peaks().near).toHaveLength(5);
    for (const p of [...peaks().far, ...peaks().near]) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1.1); expect(p.h).toBeGreaterThan(0.4); expect(p.h).toBeLessThanOrEqual(1); }
    // Peaks right across the screen, the tallest a full range high.
    const xs = peaks().near.map((p) => p.x).sort();
    expect(xs[0]).toBeLessThan(0.25);
    expect(xs.at(-1)!).toBeGreaterThan(0.75);
  });

  it('stands on the horizon and never above its top line; as tall as its sky, at most a share of the width', () => {
    for (const [w, top, base] of [[390, 6, 200], [390, 6, 79], [375, 6, 76], [430, 64, 140], [390, 100, 124]]) {
      const svg = mountainsSvg(w, top, base);
      const H = Number(/height="([\d.]+)"/.exec(svg)![1]), at = Number(/top:([\d.]+)px/.exec(svg)![1]);
      expect(H).toBeCloseTo(Math.min(base - top, w * MOUNTAIN_SHARE), 0);
      expect(at).toBeGreaterThanOrEqual(top - 0.06);
      expect(at + H).toBeCloseTo(base, 0);
      // Nothing is drawn outside its own box (it is cut there), and every number is a number.
      expect(svg).toContain('overflow="hidden"');
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      for (const m of svg.matchAll(/ d="([^"]*)"/g)) for (const [, , y] of m[1].matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) { expect(Number(y)).toBeGreaterThanOrEqual(-0.1); expect(Number(y)).toBeLessThanOrEqual(H * 1.2); }
    }
    expect(MOUNTAIN_SHARE * 390).toBeCloseTo(74.1, 1);
  });

  it('no room, no range', () => {
    expect(mountainsSvg(390, 70, 70 + MOUNTAIN_MIN - 1)).toBe('');
    expect(mountainsSvg(0, 6, 120)).toBe('');
    expect(mountainsSvg(390, 120, 100)).toBe('');
    expect(mountainsSvg(390, 70, 70 + MOUNTAIN_MIN)).not.toBe('');
  });

  it('flat toy style: blue-grey rock, snow caps, one soft outline; no gradients, filters or text', () => {
    const svg = mountainsSvg(390, 6, 120);
    expect(svg).toContain('#8399b1');
    expect(svg).toContain('#a9bccd');
    expect(svg).toContain('#f4f8fb');
    expect(svg).not.toMatch(/gradient|filter|<text|<image/i);
    expect(svg).toContain('class="mountains"');
    // A cap on every peak.
    expect((svg.match(/fill="#f4f8fb"/g) ?? []).length).toBe(11);
  });

  it("ONLY Baldonnel's thaw theme has them: behind the trees in the scenery, first in its layer", () => {
    const box = { x: 16, y: 180, width: 358, height: 358 }, opts = { seed: 5, depth: 20, mountains: { top: 6, base: 156 } };
    for (const theme of Object.values(THEMES)) {
      const html = sceneryHtml(theme, 390, 600, box, opts);
      expect(html.includes('class="mountains"'), theme.id).toBe(theme.id === 'thaw');
    }
    const html = sceneryHtml(THEMES.thaw, 390, 600, box, opts);
    // Before every tree in the layer: so behind the farthest of them.
    expect(html.indexOf('class="mountains"')).toBeLessThan(html.indexOf('class="sc'));
    expect(html.indexOf('class="mountains"')).toBeGreaterThan(0);
    // And no theme draws them unasked.
    expect(sceneryHtml(THEMES.thaw, 390, 600, box, { seed: 5, depth: 20 })).not.toContain('class="mountains"');
    expect(REGIONS.filter((r) => r.theme === 'thaw').map((r) => r.id)).toEqual(['baldonnel']);
  });
});
