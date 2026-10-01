import { describe, expect, it } from 'vitest';
import { TRUCK_KINDS, solve } from '../src/engine/index.ts';
import { assignKinds, assignTruckKinds, buildLevel, everyPumpjackInTheWay, generate, mulberry32, type Slot } from './generator.ts';

const small = { restarts: 6, iters: 150, maxStates: 20_000 };

describe('generator', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces a level whose par is the proven optimum and fits the slot', () => {
    const slot: Slot = { trucks: 3, pumpjacks: 0, minPar: 3, maxPar: 4, minExtra: 0, decoys: 1 };
    const result = generate(slot, 7, small)!;
    expect(result).not.toBeNull();
    expect(result.level.trucks).toHaveLength(3);
    expect(solve(result.level)!.length).toBe(result.par);
    expect(result.par).toBeGreaterThanOrEqual(3);
    expect(result.par).toBeLessThanOrEqual(4);
  });

  it('only keeps pumpjacks that get in the way of the best solution', () => {
    const slot: Slot = { trucks: 3, pumpjacks: 1, minPar: 3, maxPar: 5, minExtra: 0, decoys: 0 };
    const result = generate(slot, 11, small)!;
    expect(result).not.toBeNull();
    expect(result.level.obstacles).toHaveLength(1);
    expect(everyPumpjackInTheWay(result.level, solve(result.level)!)).toBe(true);
  });

  it('adds decoy gates that do not change par', () => {
    const slot: Slot = { trucks: 3, pumpjacks: 0, minPar: 3, maxPar: 4, minExtra: 0, decoys: 2 };
    const result = generate(slot, 7, small)!;
    expect(result.level.gates.length).toBeGreaterThan(3);
    expect(solve(result.level)!.length).toBe(result.par);
  });

  it('rejects two trucks sharing one gate', () => {
    const piece = { orient: 'h', length: 2, col: 0, side: 'right' } as const;
    expect(buildLevel({ pieces: [{ ...piece, row: 1 }, { ...piece, row: 1, col: 2 }], pumpjacks: [] })).toBeNull();
  });
});

describe('assignKinds', () => {
  const cells = [{ row: 1, col: 2 }, { row: 3, col: 4 }, { row: 5, col: 0 }, { row: 0, col: 5 }];

  it('is fixed by the seed and keeps positions', () => {
    expect(assignKinds(cells, 9)).toEqual(assignKinds(cells, 9));
    expect(assignKinds(cells, 9).map(({ row, col }) => ({ row, col }))).toEqual(cells);
  });

  it('uses all three looks before repeating', () => {
    expect(new Set(assignKinds(cells.slice(0, 3), 9).map((c) => c.kind)).size).toBe(3);
  });
});

describe('assignTruckKinds', () => {
  const t = (id: string, length: 2 | 3) => ({ id, color: 'red' as const, row: 0, col: 0, length, orient: 'h' as const });
  const trucks = [t('A', 2), t('B', 3), t('C', 2), t('D', 3), t('E', 3), t('F', 2)];

  it('is fixed by the seed, suits each length, and keeps everything else', () => {
    const a = assignTruckKinds(trucks, 5);
    expect(a).toEqual(assignTruckKinds(trucks, 5));
    expect(a.map(({ kind: _k, ...rest }) => rest)).toEqual(trucks);
    for (const x of a) expect((TRUCK_KINDS[x.length] as readonly string[]).includes(x.kind!)).toBe(true);
  });

  it('uses every type for a length before repeating', () => {
    const a = assignTruckKinds(trucks, 5);
    expect(new Set(a.filter((x) => x.length === 2).slice(0, 2).map((x) => x.kind)).size).toBe(2);
    expect(new Set(a.filter((x) => x.length === 3).map((x) => x.kind)).size).toBe(3);
  });
});
