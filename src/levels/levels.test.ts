import { describe, expect, it } from 'vitest';
import { OBSTACLE_KINDS, TRUCK_KINDS, solve } from '../engine/index.ts';
import { convoyRaisesPar, everyPumpjackInTheWay, withoutConvoys } from '../../tools/generator.ts';
import { DAILY_LEVELS, REGIONS } from './regions.ts';

describe('shipped levels', () => {
  it('has three regions of 10 levels with unique ids', () => {
    expect(REGIONS.map((r) => [r.id, r.levels.length])).toEqual([
      ['cardium', 10],
      ['montney', 10],
      ['duvernay', 10],
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

describe('vehicle types', () => {
  const all = REGIONS.flatMap((r) => r.levels);

  it.each(all.map((l) => [l.id, l] as const))('%s: truck kind never changes solver results', (_id, level) => {
    const expected = solve(level);
    const stripped = level.trucks.map(({ kind: _k, ...t }) => t);
    expect(solve({ ...level, trucks: stripped })).toEqual(expected);
    const swapped = level.trucks.map((t) => ({ ...t, kind: TRUCK_KINDS[t.length].at(-1)! }));
    expect(solve({ ...level, trucks: swapped })).toEqual(expected);
  });

  it('shows a mix in every level and all five types in every region', () => {
    for (const l of all) expect(new Set(l.trucks.map((t) => t.kind)).size).toBeGreaterThanOrEqual(2);
    for (const r of REGIONS) {
      expect(new Set(r.levels.flatMap((l) => l.trucks.map((t) => t.kind)))).toEqual(
        new Set([...TRUCK_KINDS[2], ...TRUCK_KINDS[3]]),
      );
    }
  });
});

describe('Daily Pads', () => {
  it('has 60 medium pads with unique ids', () => {
    expect(DAILY_LEVELS).toHaveLength(60);
    const ids = [...REGIONS.flatMap((r) => r.levels), ...DAILY_LEVELS].map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of DAILY_LEVELS) {
      expect(l.par).toBeGreaterThanOrEqual(6);
      expect(l.par).toBeLessThanOrEqual(8);
    }
  });

  it.each(DAILY_LEVELS.map((l) => [l.id, l] as const))('%s is solvable at its proven par, with obstacles in the way', (_id, level) => {
    const solution = solve(level);
    expect(solution?.length).toBe(level.par);
    expect(level.obstacles.length).toBeGreaterThan(0);
    expect(everyPumpjackInTheWay(level, solution!)).toBe(true);
  });

  it('mixes obstacle looks and vehicle types', () => {
    const obstacleKinds = new Set(DAILY_LEVELS.flatMap((l) => l.obstacles.map((o) => o.kind)));
    const truckKinds = new Set(DAILY_LEVELS.flatMap((l) => l.trucks.map((t) => t.kind)));
    expect(obstacleKinds).toEqual(new Set(OBSTACLE_KINDS));
    expect(truckKinds).toEqual(new Set([...TRUCK_KINDS[2], ...TRUCK_KINDS[3]]));
    for (const l of DAILY_LEVELS) expect(new Set(l.trucks.map((t) => t.kind)).size).toBeGreaterThanOrEqual(2);
  });
});

describe('Duvernay convoys', () => {
  const duvernay = REGIONS.find((r) => r.id === 'duvernay')!.levels;

  it('opens with the convoy tip', () => {
    expect(duvernay[0].hint).toBe('Convoys leave in order. Number 1 first.');
  });

  it.each(duvernay.map((l) => [l.id, l] as const))('%s has a convoy whose order changes the best solution', (_id, level) => {
    expect(level.trucks.some((t) => t.convoy === 1)).toBe(true);
    expect(level.trucks.some((t) => t.convoy === 2)).toBe(true);
    expect(convoyRaisesPar(level, level.par)).toBe(true);
    expect(solve(withoutConvoys(level))!.length).toBeLessThan(level.par);
  });

  it('mixes in obstacles, and every one gets in the way', () => {
    const withObstacles = duvernay.filter((l) => l.obstacles.length > 0);
    expect(withObstacles.length).toBeGreaterThanOrEqual(5);
    for (const l of withObstacles) expect(everyPumpjackInTheWay(l, solve(l)!)).toBe(true);
  });
});
