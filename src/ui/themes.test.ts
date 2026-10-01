import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { THEME_VARS, THEMES, themeOverride } from './themes.ts';

// Gate fills, kept in sync with :root in style.css.
const GATE_COLORS = {
  red: '#ff4747',
  blue: '#2f8bff',
  yellow: '#ffd21f',
  green: '#22c55e',
  orange: '#ff8a00',
  purple: '#a55cff',
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('themes', () => {
  it.each(Object.values(THEMES))('$id sets every theme variable', (theme) => {
    expect(Object.keys(theme.vars).sort()).toEqual([...THEME_VARS].sort());
    for (const v of Object.values(theme.vars)) expect(v).not.toBe('');
  });

  it('gives Cardium summer and Montney spring mud, with winter ready but unused', () => {
    expect(REGIONS.map((r) => [r.id, r.theme])).toEqual([
      ['cardium', 'summer'],
      ['montney', 'spring'],
    ]);
    expect(THEMES.winter).toBeDefined();
  });

  it.each(Object.values(THEMES))('$id: every gate color stands out from the fence', (theme) => {
    for (const [color, hex] of Object.entries(GATE_COLORS)) {
      const ratio = contrast(hex, theme.vars['--fence-color']);
      expect(ratio, `${color} gate on ${theme.id} fence`).toBeGreaterThanOrEqual(1.8);
    }
  });

  it('accepts only known themes from the URL override', () => {
    expect(themeOverride('?theme=winter')).toBe('winter');
    expect(themeOverride('?theme=disco')).toBeNull();
    expect(themeOverride('')).toBeNull();
  });
});
