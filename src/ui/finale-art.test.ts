// The finale's drawings and words (job U9), held to the reference page (`finale-reference.json`, written by
// tools/port-finale.py from finale_reference.html).
import { describe, expect, it } from 'vitest';
import PAGE from './finale-reference.json' with { type: 'json' };
import { crew, stinger, polaroidSvg } from './finale-art.ts';
import { FINALE_CREDITS, FINALE_LINES } from './lines.ts';

const clean = (s: string) => !/NaN|undefined|Infinity/.test(s);

describe('the finale', () => {
  it("says the page's lines, word for word", () => {
    expect(FINALE_LINES).toEqual(PAGE.lines);
  });
  it("rolls the page's credits, in its order, ending on the thanks", () => {
    expect(FINALE_CREDITS.map(([t, k]) => [t, k])).toEqual(PAGE.credits.rows);
    expect(FINALE_CREDITS.at(-1)![0]).toBe('Thanks for playing');
  });
  it('has no em dash in anything the player reads', () => {
    for (const s of [...Object.values(FINALE_LINES), ...FINALE_CREDITS.map(([t]) => t)]) expect(s).not.toMatch(/—/);
  });
  it('draws every frame of the crew photo, on a wide strip and a narrow one', () => {
    for (const E of [0, 60]) for (let t = 0; t <= PAGE.photo.dur; t += 0.05) {
      const f = crew(t, { light: false, E });
      for (const k of ['back', 'mid', 'front', 'over'] as const) expect(clean(f[k]), `${k} at ${t.toFixed(2)}`).toBe(true);
    }
  });
  it('draws every frame of Still Here, and the Polaroid', () => {
    for (let t = 0; t <= PAGE.still.dur; t += 0.05) expect(clean(String(stinger(t))), `at ${t.toFixed(2)}`).toBe(true);
    expect(clean(polaroidSvg())).toBe(true);
  });
});
