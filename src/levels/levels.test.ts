import { describe, expect, it } from 'vitest';
import { OBSTACLE_KINDS, solve } from '../engine/index.ts';
import { everyPumpjackInTheWay } from '../../tools/generator.ts';
import { REGIONS } from './regions.ts';

describe('shipped levels', () => {
  it('has two regions of 10 levels with unique ids', () => {
    expect(REGIONS.map((r) => [r.id, r.levels.length])).toEqual([
      ['cardium', 10],
      ['montney', 10],
    ]);
    const ids = REGIONS.flatMap((r) => r.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(REGIONS.map((r) => [r.name, r] as const))('%s', (_name, region) => {
    it.each(region.levels.map((l) => [l.id, l] as const))('%s is solvable and par is the proven optimum', (_id, level) => {
      const solution = solve(level);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBe(level.par);
    });

    it('ramps up: par and truck count never drop', () => {
      for (let i = 1; i < region.levels.length; i++) {
        expect(region.levels[i].par).toBeGreaterThanOrEqual(region.levels[i - 1].par);
        expect(region.levels[i].trucks.length).toBeGreaterThanOrEqual(region.levels[i - 1].trucks.length);
      }
      expect(region.levels.at(-1)!.par).toBeGreaterThan(region.levels[0].par);
    });
  });

  it('keeps Cardium to trucks and gates only', () => {
    expect(REGIONS[0].levels.every((l) => l.obstacles.length === 0)).toBe(true);
  });

  it('gives every Montney level pumpjacks that get in the way', () => {
    for (const level of REGIONS[1].levels) {
      expect(level.obstacles.length).toBeGreaterThan(0);
      expect(everyPumpjackInTheWay(level, solve(level)!)).toBe(true);
    }
  });
});

describe('obstacle looks', () => {
  const montney = REGIONS[1].levels;

  it.each(montney.map((l) => [l.id, l] as const))('%s: kind never changes solver results', (_id, level) => {
    const expected = solve(level);
    const variants = [
      level.obstacles.map(({ row, col }) => ({ row, col })),
      ...OBSTACLE_KINDS.map((kind) => level.obstacles.map(({ row, col }) => ({ row, col, kind }))),
    ];
    for (const obstacles of variants) expect(solve({ ...level, obstacles })).toEqual(expected);
  });

  it('gives Montney a mix of pumpjacks, tanks and wellheads', () => {
    const kinds = montney.flatMap((l) => l.obstacles.map((o) => o.kind));
    expect(new Set(kinds)).toEqual(new Set(OBSTACLE_KINDS));
    for (const l of montney) {
      const own = l.obstacles.map((o) => o.kind);
      expect(new Set(own).size).toBe(Math.min(own.length, OBSTACLE_KINDS.length));
    }
  });
});
