import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { FOOTHILL_SHARE, MOUNTAIN_MIN, MOUNTAIN_SHARE, foothills, mountainsSvg, peaks } from './mountains.ts';
import { BALES, balesSvg, sceneryHtml } from './scenery.ts';
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

  it("ONLY Baldonnel's thaw theme has the range (and Montney's spring its foothills): behind the trees in the scenery, first in its layer", () => {
    const box = { x: 16, y: 180, width: 358, height: 358 }, opts = { seed: 5, depth: 20, mountains: { top: 6, base: 156 } };
    for (const theme of Object.values(THEMES)) {
      const html = sceneryHtml(theme, 390, 600, box, opts);
      expect(html.includes('class="mountains"'), theme.id).toBe(theme.id === 'thaw');
      expect(html.includes('class="mountains foothills"'), theme.id).toBe(theme.id === 'spring');
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

describe("Montney's foothills (Jay, Oct 11)", () => {
  it('are lower than the range, the same every visit, and stand on the horizon', () => {
    expect(FOOTHILL_SHARE).toBeLessThan(MOUNTAIN_SHARE);
    const svg = mountainsSvg(390, 6, 160, 'foothills');
    expect(svg).toBe(mountainsSvg(390, 6, 160, 'foothills'));
    expect(svg).not.toBe(mountainsSvg(390, 6, 160));
    const h = Number(/height="([\d.]+)"/.exec(svg)![1]), top = Number(/top:([\d.]+)px/.exec(svg)![1]);
    expect(h).toBeCloseTo(390 * FOOTHILL_SHARE, 1);
    expect(top + h).toBeCloseTo(160, 1);
    // Squat where the sky is short, never above `top`, and nothing where there is no room.
    expect(Number(/height="([\d.]+)"/.exec(mountainsSvg(390, 60, 90, 'foothills'))![1])).toBe(30);
    expect(mountainsSvg(390, 70, 70 + MOUNTAIN_MIN - 1, 'foothills')).toBe('');
  });

  it('a far ridge of small peaks with a touch of snow, rounded hills with none in front; every peak inside the picture', () => {
    const { far, near } = foothills();
    expect(far.length).toBe(5);
    expect(near.length).toBe(4);
    for (const p of [...far, ...near]) { expect(p.h).toBeGreaterThan(0.3); expect(p.h).toBeLessThanOrEqual(1); }
    // The hills are lower than the peaks behind them, so the peaks show over them.
    expect(Math.max(...near.map((p) => p.h))).toBeLessThan(Math.max(...far.map((p) => p.h)));
    const svg = mountainsSvg(390, 6, 160, 'foothills');
    expect((svg.match(/fill="#f4f8fb"/g) ?? []).length).toBe(far.length);
    expect((svg.match(/ Q/g) ?? []).length).toBeGreaterThanOrEqual(near.length * 2);
    expect(REGIONS.filter((r) => r.theme === 'spring').map((r) => r.id)).toEqual(['montney']);
  });
});

describe('The prairie on the level list (Bakken; Jay, Oct 11)', () => {
  const list = (theme: (typeof THEMES)[keyof typeof THEMES], extra = {}) => sceneryHtml(theme, 390, 200, { x: 0, y: 160, width: 390, height: 0 }, { below: false, maxTree: 26, depth: 4, ...extra });
  const trees = (html: string) => (html.match(/class="sc/g) ?? []).length;
  it('keeps only a shelterbelt of trees there too (it used to stand a full tree line on the list)', () => {
    const full = trees(list(THEMES.summer)), prairie = trees(list(THEMES.prairie));
    expect(full).toBeGreaterThan(30);
    expect(prairie).toBeLessThan(full * 0.3);
    expect(prairie).toBeGreaterThan(0);
    // A level's scenery is thinned exactly as before: once, with the strip's trees in.
    const box = { x: 16, y: 180, width: 358, height: 358 };
    expect(trees(sceneryHtml(THEMES.prairie, 390, 700, box, { seed: 5, depth: 20 }))).toBeLessThan(trees(sceneryHtml(THEMES.summer, 390, 700, box, { seed: 5, depth: 20 })) * 0.3);
  });

  it('has round hay bales standing on the horizon, the same ones every visit, only where asked', () => {
    const html = list(THEMES.prairie, { bales: 159 });
    expect(html).toBe(list(THEMES.prairie, { bales: 159 }));
    expect((html.match(/class="list-bale"/g) ?? []).length).toBe(BALES.length);
    expect(html.indexOf('class="list-bales"')).toBeGreaterThan(html.lastIndexOf('class="sc'));
    expect(list(THEMES.prairie)).not.toContain('list-bale');
    for (const b of BALES) { expect(b.x).toBeGreaterThan(0.04); expect(b.x).toBeLessThan(0.96); }
    expect(balesSvg(390, 159)).toContain('data-bales="5"');
  });
});
