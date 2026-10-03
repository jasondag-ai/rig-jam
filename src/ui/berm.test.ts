import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { BERM_LOOKS, BERM_OVER, bermHeight, type BermGeometry } from './berm.ts';

const cell = 55;
const band = 23;
const geo = (gates: BermGeometry['gates']): BermGeometry => ({ cell, band, over: Math.round(band * BERM_OVER), gates });
const pad = cell * 6;
/** The middle of the berm band beside cell `i` of a side. */
const mid = (side: string, i: number): [number, number] => {
  const along = (i + 0.5) * cell;
  if (side === 'top') return [along, -band / 2];
  if (side === 'bottom') return [along, pad + band / 2];
  return side === 'left' ? [-band / 2, along] : [pad + band / 2, along];
};

describe('berm', () => {
  it('is never on the pad, and ends at its outer foot', () => {
    const g = geo([]);
    for (const [x, y] of [[0, 0], [pad / 2, pad / 2], [pad, pad], [1, pad - 1]]) expect(bermHeight(g, x, y)).toBe(0);
    expect(bermHeight(g, pad / 2, -(band + g.over))).toBe(0);
    expect(bermHeight(g, pad / 2, pad + band + g.over + 5)).toBe(0);
  });

  it('runs unbroken round all four sides and the corners when there are no gates', () => {
    const g = geo([]);
    for (const side of ['top', 'bottom', 'left', 'right']) for (let i = 0; i < 6; i++) expect(bermHeight(g, ...mid(side, i)), `${side} ${i}`).toBeGreaterThan(0.6);
    for (const [x, y] of [[-8, -8], [pad + 8, -8], [pad + 8, pad + 8], [-8, pad + 8]]) expect(bermHeight(g, x, y)).toBeGreaterThan(0.5);
  });

  it.each(REGIONS.flatMap((r) => r.levels.map((l) => [`${r.id} ${l.id}`, l] as const)))('%s: a gap at every gate, berm everywhere else', (_name, level) => {
    const g = geo(level.gates);
    const gated = new Set(level.gates.map((x) => `${x.side}${x.index}`));
    for (const side of ['top', 'bottom', 'left', 'right'] as const)
      for (let i = 0; i < 6; i++) {
        const h = bermHeight(g, ...mid(side, i));
        if (gated.has(`${side}${i}`)) expect(h, `${side} ${i} gap`).toBe(0);
        else expect(h, `${side} ${i} wall`).toBeGreaterThan(0.25);
      }
  });

  it('has a look for every ground: dirt and mud with grass, snow without', () => {
    expect(Object.keys(BERM_LOOKS).sort()).toEqual(['gravel', 'mud', 'snow']);
    expect(BERM_LOOKS.gravel.turf && BERM_LOOKS.mud.turf).toBeTruthy();
    expect(BERM_LOOKS.snow.turf).toBeNull();
    // Mud is the darkest and wettest; snow the lightest.
    const lum = (c: number[]) => c[0] + c[1] + c[2];
    expect(lum(BERM_LOOKS.mud.light)).toBeLessThan(lum(BERM_LOOKS.gravel.light));
    expect(lum(BERM_LOOKS.snow.dark)).toBeGreaterThan(lum(BERM_LOOKS.gravel.light));
    expect(BERM_LOOKS.mud.gloss).toBeGreaterThan(BERM_LOOKS.gravel.gloss);
  });
});
