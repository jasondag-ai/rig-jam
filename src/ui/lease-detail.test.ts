import { describe, expect, it } from 'vitest';
import { seedFrom } from '../engine/rng.ts';
import { REGIONS } from '../levels/regions.ts';
import { GRAIN, LUMPS, PUDDLE_REACH, keepDry, planDetail, puddleCells } from './lease-detail.ts';

const LEVELS = REGIONS.flatMap((r) => r.levels.map((l) => [`${r.id} ${l.id}`, l] as const));

describe('lease ground detail', () => {
  it('a level always gets the same ground', () => {
    const [, level] = LEVELS[3];
    for (const ground of ['gravel', 'mud', 'snow'] as const) expect(planDetail(level, ground, seedFrom(level.id))).toEqual(planDetail(level, ground, seedFrom(level.id)));
  });

  it('every level gets its own', () => {
    const seen = new Set(LEVELS.map(([, l]) => JSON.stringify(planDetail(l, 'mud', seedFrom(l.id)).patches)));
    expect(seen.size).toBe(LEVELS.length);
  });

  it('each ground has its own detail: pebbles on gravel, puddles on mud, drifts on snow', () => {
    const [, level] = LEVELS[0];
    const seed = seedFrom(level.id);
    const g = planDetail(level, 'gravel', seed);
    const m = planDetail(level, 'mud', seed);
    const s = planDetail(level, 'snow', seed);
    expect([g.pebbles.length > 50, g.puddles.length, g.drifts.length]).toEqual([true, 0, 0]);
    expect([m.pebbles.length, m.puddles.length > 0, m.drifts.length]).toEqual([0, true, 0]);
    expect([s.pebbles.length, s.puddles.length, s.drifts.length > 5]).toEqual([0, 0, true]);
    for (const d of [g, m, s]) expect(d.patches.length).toBeGreaterThanOrEqual(9);
    // Patches go both ways (light and dark), and drifts all lie with one wind.
    expect(g.patches.some((p) => p.tone > 0) && g.patches.some((p) => p.tone < 0)).toBe(true);
    const turns = s.drifts.map((d) => d.rot);
    expect(Math.max(...turns) - Math.min(...turns)).toBeLessThan(0.3);
  });

  it.each(LEVELS)('%s: a few puddles, never on a gate cell or an obstacle, each within its reach', (_name, level) => {
    const d = planDetail(level, 'mud', seedFrom(level.id));
    const dry = keepDry(level);
    expect(d.puddles.length).toBeLessThanOrEqual(4);
    for (const p of d.puddles) {
      for (const c of puddleCells(p.x, p.y)) expect(dry.has(c), `puddle at ${p.x.toFixed(1)},${p.y.toFixed(1)} on ${c}`).toBe(false);
      for (const l of p.lobes) expect(Math.hypot(l.dx, l.dy) + l.rx).toBeLessThanOrEqual(PUDDLE_REACH + 1e-9);
      expect(p.x - PUDDLE_REACH).toBeGreaterThanOrEqual(0);
      expect(p.y + PUDDLE_REACH).toBeLessThanOrEqual(6);
    }
  });

  it.each(LEVELS)('%s: a worn lane runs straight in from a gate; a stain sits beside equipment', (_name, level) => {
    const d = planDetail(level, 'gravel', seedFrom(level.id));
    expect(d.lanes.length).toBeGreaterThanOrEqual(1);
    expect(d.lanes.length).toBeLessThanOrEqual(2);
    for (const l of d.lanes) {
      const upright = Math.abs(l.rot - Math.PI / 2) < 1e-9;
      // Lined up with a gate's row or column, and long and thin.
      const lined = level.gates.some((g) => ((g.side === 'top' || g.side === 'bottom') === upright ? Math.abs((upright ? l.x : l.y) - (g.index + 0.5)) < 0.07 : false));
      expect(lined, 'lane lines up with a gate').toBe(true);
      expect(l.rx).toBeGreaterThan(l.ry * 3);
    }
    expect(d.stains.length).toBe(Math.min(2, level.obstacles.length));
    d.stains.forEach((t, i) => expect(Math.hypot(t.x - level.obstacles[i].col - 0.5, t.y - level.obstacles[i].row - 0.5)).toBeLessThan(0.5));
  });

  it('fine texture: gravel and mud have specks and lumps in several tones, seeded per level; snow has none', () => {
    expect(GRAIN.snow).toBeNull();
    expect(LUMPS.snow).toBeNull();
    expect(GRAIN.gravel!.tones.length).toBeGreaterThanOrEqual(4);
    expect(GRAIN.mud!.tones.length).toBeGreaterThanOrEqual(3);
    for (const g of ['gravel', 'mud'] as const) {
      expect(GRAIN[g]!.perCell).toBeGreaterThan(300);
      // Subtle: no speck is fully opaque, and lumps stay small next to a truck (under a tenth of a cell).
      expect(GRAIN[g]!.alpha[1]).toBeLessThanOrEqual(0.6);
      expect(LUMPS[g]!.size[1]).toBeLessThan(0.1);
    }
    const [, a] = LEVELS[0];
    const [, b] = LEVELS[1];
    expect(planDetail(a, 'gravel', seedFrom(a.id)).seed).not.toBe(planDetail(b, 'gravel', seedFrom(b.id)).seed);
  });

  it('keeps dry the cell in front of every gate and under every obstacle', () => {
    const dry = keepDry({ gates: [{ color: 'red', side: 'top', index: 2 }, { color: 'blue', side: 'right', index: 4 }, { color: 'green', side: 'bottom', index: 0 }, { color: 'red', side: 'left', index: 5 }], obstacles: [{ row: 3, col: 3 }] });
    expect([...dry].sort()).toEqual(['0,2', '3,3', '4,5', '5,0'].sort());
  });
});
