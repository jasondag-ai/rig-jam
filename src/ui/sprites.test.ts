import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { THEMES } from './themes.ts';
import manifest from './truck-sprites.json' with { type: 'json' };
import GROUND from './ground-tiles.json' with { type: 'json' };

// Gate fills, kept in sync with :root in style.css (and tools/truck-sprites.py).
const GATES: Record<string, string> = { red: '#ff4747', blue: '#2f8bff', yellow: '#ffd21f', green: '#22c55e', orange: '#ff8a00', purple: '#a55cff' };
const KINDS = ['pickup', 'picker', 'vac', 'frac', 'water'];

/** CIE Lab from sRGB hex, and the plain distance between two colors in it (Delta E 1976). */
function lab(hex: string): [number, number, number] {
  const lin = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [
    (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047,
    0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2],
    (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883,
  ].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}
const dE = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const paint = (kind: string, color: string) => (manifest.paint as Record<string, Record<string, { mean: string; share: number }>>)[kind][color];

describe('truck sprites', () => {
  it('every kind in every gate color, at 1x and 2x, as WebP', () => {
    for (const kind of KINDS)
      for (const color of Object.keys(GATES))
        for (const suffix of ['', '@2x']) {
          const file = `public/sprites/trucks/${kind}-${color}${suffix}.webp`;
          expect(existsSync(file), file).toBe(true);
          expect(statSync(file).size, file).toBeLessThan(40_000);
        }
  });

  it('the paint reads as its gate color', () => {
    for (const kind of KINDS)
      for (const [color, hex] of Object.entries(GATES)) expect(dE(paint(kind, color).mean, hex), `${kind} ${color}`).toBeLessThan(12);
  });

  it('no two gate colors look alike on any truck', () => {
    for (const kind of KINDS) {
      const colors = Object.keys(GATES);
      for (let i = 0; i < colors.length; i++)
        for (let j = i + 1; j < colors.length; j++)
          expect(dE(paint(kind, colors[i]).mean, paint(kind, colors[j]).mean), `${kind}: ${colors[i]} vs ${colors[j]}`).toBeGreaterThan(30);
    }
  });

  it.each(Object.values(THEMES))('$id: every painted cab stands out from the pad', (theme) => {
    for (const kind of KINDS)
      for (const color of Object.keys(GATES)) expect(dE(paint(kind, color).mean, theme.vars['--pad']), `${kind} ${color} on ${theme.id}`).toBeGreaterThan(25);
  });

  it('at least 40% of every truck carries its gate color (tank shells and the frac unit included)', () => {
    for (const kind of KINDS) for (const color of Object.keys(GATES)) expect(paint(kind, color).share, `${kind} ${color}`).toBeGreaterThanOrEqual(0.4);
  });

  it('a snow coat and a mud coat for every kind, at 1x and 2x (one layer for every color)', () => {
    for (const kind of KINDS)
      for (const coat of ['snow', 'mud'])
        for (const suffix of ['', '@2x']) {
          const file = `public/sprites/trucks/${coat}-${kind}${suffix}.webp`;
          expect(existsSync(file), file).toBe(true);
          expect(statSync(file).size, file).toBeLessThan(12_000);
        }
  });
});

describe('ground tiles', () => {
  it('a field for outside the berm in every season, as WebP; the pad has no image', () => {
    for (const id of ['summer', 'spring', 'winter']) {
      const file = `public/sprites/ground/grass-${id}.webp`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeLessThan(200_000);
      expect(existsSync(`public/sprites/ground/lease-${id}.webp`), 'no stretched photo pad').toBe(false);
    }
  });

  it("each theme's outside color is its field's average tone", () => {
    for (const t of Object.values(THEMES)) expect(dE(t.vars['--ground'], (GROUND as Record<string, { mean: string }>)[`grass-${t.id}`].mean), t.id).toBeLessThan(6);
  });

  it('winter: the pad is the brightest surface, lighter than the snow outside it', () => {
    expect(lab(THEMES.winter.vars['--pad'])[0]).toBeGreaterThan(lab(THEMES.winter.vars['--ground'])[0] + 8);
    expect(lab(THEMES.winter.vars['--pad'])[0]).toBeGreaterThan(93);
  });
});

describe('art inbox sprites', () => {
  it('every accepted animation has its sheet, and no rejected one slipped in', async () => {
    const anim = (await import('./anim-sprites.json', { with: { type: 'json' } })).default as Record<string, { frames: number; w: number; h: number }>;
    for (const [name, a] of Object.entries(anim)) {
      expect(existsSync(`public/sprites/anim/${name}.webp`), name).toBe(true);
      expect(a.frames, name).toBeGreaterThanOrEqual(4);
    }
    for (const rejected of ['bear_wipe', 'magpie_hop', 'moose_chew', 'spotter_sleep', 'hotshot_drive', 'pumper_truck_drive'])
      expect(anim[rejected], rejected).toBeUndefined();
  });

  it('batch B UI at 1x and 2x; scenery is drawn in code, so no world photo sprites', () => {
    expect(existsSync('public/sprites/world')).toBe(false);
    for (const f of ['ui/btn_hint', 'ui/icon_gear', 'ui/panel_win'])
      for (const s of ['', '@2x']) expect(existsSync(`public/sprites/${f}${s}.webp`), f + s).toBe(true);
  });
});
