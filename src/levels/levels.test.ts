import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PICKS } from '../../tools/pick-clearwater.ts';
import { LEVEL_OBSTACLE_KINDS, OBSTACLE_KINDS, TRUCK_KINDS, isWon, newGame, solve, tryMove } from '../engine/index.ts';
import { convoyRaisesPar, everyPumpjackInTheWay, slidesIn, withoutConvoys, withoutShifts } from '../../tools/generator.ts';
import { DAILY_LEVELS, REGIONS } from './regions.ts';

describe('shipped levels', () => {
  it('has six regions of 10 levels with unique ids', () => {
    expect(REGIONS.map((r) => [r.id, r.levels.length])).toEqual([
      ['cardium', 10],
      ['montney', 10],
      ['duvernay', 10],
      ['mannville', 10],
      ['bakken', 10],
      ['clearwater', 10],
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

  it('Clearwater is the Big Pad: 8 x 8, trucks and gates only, 16 trucks at most, Jay\'s names, and a smooth ramp of extra moves', () => {
    const cw = REGIONS.find((r) => r.id === 'clearwater')!;
    expect(REGIONS.indexOf(cw)).toBe(5); // after Bakken
    expect(cw.levels.map((l) => l.name)).toEqual(['Rig Mats', 'Rig Move', 'Set Surface', 'Walking Rig', 'Batch Drilling', 'Sim Ops', 'Plug and Perf', 'Drill Out', 'Sand Haul', 'Road Ban']);
    const extra = cw.levels.map((l) => l.par - l.trucks.length);
    cw.levels.forEach((l, i) => {
      expect(l.size, l.id).toBe(8);
      expect(l.trucks.length, l.id).toBeLessThanOrEqual(16);
      expect(l.obstacles.length + l.muskeg.length + l.racks.length, l.id).toBe(0);
      expect(l.trucks.some((t) => t.convoy || t.load) || l.gates.some((g) => g.shift), l.id).toBe(false);
      // Levels 1 to 3: 6 to 8 extra moves; 4 to 6: 9 to 11; 7 to 10: 12 to 15.
      const [lo, hi] = i < 3 ? [6, 8] : i < 6 ? [9, 11] : [12, 15];
      expect(extra[i], l.id).toBeGreaterThanOrEqual(lo);
      expect(extra[i], l.id).toBeLessThanOrEqual(hi);
      if (i) {
        expect(extra[i], l.id).toBeGreaterThanOrEqual(extra[i - 1]);
        expect(l.par - cw.levels[i - 1].par, l.id).toBeLessThanOrEqual(2);
      }
    });
  });

  it('every Clearwater level is cleared at par by its own HINT PATH (the one kept with its candidate), move for move through the game', () => {
    const file = JSON.parse(readFileSync(new URL('../../levels/bigpad-candidates.json', import.meta.url), 'utf8')) as { candidates: { id: string; par: number; hintPath: { id: string; delta: number }[] }[] };
    const cw = REGIONS.find((r) => r.id === 'clearwater')!;
    expect(PICKS.map(([, name]) => name)).toEqual(cw.levels.map((l) => l.name));
    cw.levels.forEach((level, i) => {
      const from = file.candidates.find((c) => c.id === PICKS[i][0])!;
      expect(from.hintPath.length, level.id).toBe(level.par);
      let s = newGame(level);
      for (const m of from.hintPath) {
        const r = tryMove(s, m.id, m.delta);
        expect(r, `${level.id} ${m.id} ${m.delta}`).not.toBeNull();
        s = r!.state;
      }
      expect(isWon(s), level.id).toBe(true);
      expect(s.moves, level.id).toBe(level.par);
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

  it('gives Montney a mix of pumpjacks, tanks and wellheads, with some tanks shown as flare stacks', () => {
    const kinds = montney.flatMap((l) => l.obstacles.map((o) => o.kind));
    expect(new Set(kinds)).toEqual(new Set([...LEVEL_OBSTACLE_KINDS, 'flare']));
    for (const l of montney) {
      const own = l.obstacles.map((o) => o.kind);
      expect(new Set(own).size).toBe(Math.min(own.length, LEVEL_OBSTACLE_KINDS.length));
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
    expect(obstacleKinds).toEqual(new Set(LEVEL_OBSTACLE_KINDS));
    expect(obstacleKinds.has('flare')).toBe(false); // ready, not placed yet
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

describe('Mannville (region 4): muskeg', () => {
  const levels = REGIONS.find((r) => r.id === 'mannville')!.levels;

  it('level 1 brings in muskeg and nothing else: no equipment, no convoy, and its tip says the rule', () => {
    expect(levels[0].hint).toMatch(/[Mm]uskeg/);
    expect(levels[0].obstacles).toHaveLength(0);
    expect(levels[0].trucks.some((t) => t.convoy)).toBe(false);
  });

  it.each(levels.map((l) => [l.id, l] as const))('%s has muskeg in a truck lane, and its best solution slides on it', (_id, level) => {
    expect(level.muskeg.length).toBeGreaterThan(0);
    for (const c of level.muskeg) expect(level.trucks.some((t) => (t.orient === 'h' ? t.row === c.row : t.col === c.col))).toBe(true);
    expect(slidesIn(level, solve(level)!)).toBeGreaterThan(0);
    expect(level.racks).toHaveLength(0);
    expect(level.gates.some((g) => g.shift)).toBe(false);
  });

  it('EVERY level is par 14 to 20, the first included', () => {
    for (const l of levels) {
      expect(l.par, l.id).toBeGreaterThanOrEqual(14);
      expect(l.par, l.id).toBeLessThanOrEqual(20);
    }
    expect(levels.at(-1)!.par).toBe(20);
  });
});

describe('Bakken (region 5): load racks and shift-change gates', () => {
  const levels = REGIONS.find((r) => r.id === 'bakken')!.levels;
  const tankers = (l: (typeof levels)[number]) => l.trucks.filter((t) => t.load);

  it('level 1 has load racks and no clock gate; level 2 brings in the shift-change gate', () => {
    expect(tankers(levels[0]).length).toBeGreaterThan(0);
    expect(levels[0].gates.some((g) => g.shift)).toBe(false);
    expect(levels[0].hint).toMatch(/rack/);
    // (The one-clock level would not come down to par 18, so it is level 3, at par 19: Jay, Oct 6.)
    expect(levels[1].gates.filter((g) => g.shift).length).toBeGreaterThanOrEqual(1);
    expect(levels[2].gates.filter((g) => g.shift)).toHaveLength(1);
    expect(levels[1].hint).toMatch(/even/);
  });

  it.each(levels.map((l) => [l.id, l] as const))('%s: every tanker has a rack in its lane, and looks like a tanker; nothing else does', (_id, level) => {
    expect(tankers(level).length).toBeGreaterThan(0);
    expect(level.racks.length).toBe(tankers(level).length);
    for (const t of tankers(level)) {
      expect(t.length).toBe(3);
      expect(['water', 'vac']).toContain(t.kind);
      expect(level.racks.some((r) => (t.orient === 'h' ? r.row === t.row : r.col === t.col))).toBe(true);
    }
    for (const t of level.trucks.filter((x) => !x.load)) expect(['water', 'vac']).not.toContain(t.kind);
    expect(level.muskeg).toHaveLength(0);
  });

  it.each(levels.slice(1).map((l) => [l.id, l] as const))('%s: the clock matters (without it the level is shorter)', (_id, level) => {
    expect(level.gates.some((g) => g.shift)).toBe(true);
    expect(solve(withoutShifts(level))!.length).toBeLessThan(level.par);
  });

  it('EVERY level is par 18 to 24, the first included', () => {
    for (const l of levels) {
      expect(l.par, l.id).toBeGreaterThanOrEqual(18);
      expect(l.par, l.id).toBeLessThanOrEqual(24);
    }
  });
});

describe('regions 4 and 5: more 3-cell rigs', () => {
  const share = (id: string) => {
    const trucks = REGIONS.find((r) => r.id === id)!.levels.flatMap((l) => l.trucks);
    return trucks.filter((t) => t.length === 3).length / trucks.length;
  };
  it('a bigger share of long trucks than any region before them', () => {
    const before = Math.max(share('cardium'), share('montney'), share('duvernay'));
    expect(share('mannville')).toBeGreaterThan(before);
    expect(share('bakken')).toBeGreaterThan(before);
  });
});
