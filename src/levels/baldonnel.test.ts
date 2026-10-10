import { describe, expect, it } from 'vitest';
import { getMoveRange, newGame, solve, solveAStar, tryMove } from '../engine/index.ts';
import { convoyRaisesPar, everyPumpjackInTheWay } from '../../tools/generator.ts';
import { NAMES, SLOTS, pickupCrossesSoft, withoutSoft } from '../../tools/gen-baldonnel.ts';
import { bumpTarget } from '../ui/bump.ts';
import { flingDelta } from '../ui/fling.ts';
import { BUMP_LINES, bumpLine, linesFor } from '../ui/lines.ts';
import { REGIONS } from './regions.ts';

const region = REGIONS.find((r) => r.id === 'baldonnel')!;

describe('Baldonnel, region 7: road ban patches (job U6)', () => {
  it('is the seventh region, after Clearwater, with its blurb and the thaw theme', () => {
    expect(REGIONS.map((r) => r.id).indexOf('baldonnel')).toBe(6);
    expect(REGIONS[5].id).toBe('clearwater');
    expect(region.blurb).toBe("Spring breakup. Rigs can't cross soft ground. Pickups can.");
    expect(region.theme).toBe('thaw');
  });

  it("ten levels of 6 x 6 with Jay's names in order, ids b01 to b10, par 16 to 24 rising", () => {
    expect(region.levels.map((l) => l.name)).toEqual(['Spring Breakup', 'Load Limits', 'Half Loads', 'Soft Spot', 'Frost Heave', 'Critical Sour', 'Gravel Haul', 'Scale House', 'Overweight Permit', 'Ban Lifted']);
    expect(region.levels.map((l) => l.name)).toEqual(NAMES);
    expect(region.levels.map((l) => l.id)).toEqual(Array.from({ length: 10 }, (_, i) => `b${String(i + 1).padStart(2, '0')}`));
    for (const l of region.levels) expect(l.size, l.id).toBeUndefined();
    expect(region.levels.map((l) => l.par)).toEqual(SLOTS.map((s) => s.par));
    expect(region.levels[0].par).toBe(16);
    expect(region.levels.at(-1)!.par).toBe(24);
    for (const l of region.levels) { expect(l.par).toBeGreaterThanOrEqual(16); expect(l.par).toBeLessThanOrEqual(24); }
    for (let i = 1; i < 10; i++) expect(region.levels[i].par, region.levels[i].id).toBeGreaterThanOrEqual(region.levels[i - 1].par);
  });

  it('every level has patches, none under a truck at the start, each in some rig\'s lane; none of the older regions\' floor', () => {
    for (const l of region.levels) {
      expect(l.soft.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.muskeg, l.id).toEqual([]);
      expect(l.racks, l.id).toEqual([]);
      expect(l.gates.some((g) => g.shift), l.id).toBe(false);
      expect(l.trucks.some((t) => t.load), l.id).toBe(false);
      const taken = new Set(l.trucks.flatMap((t) => Array.from({ length: t.length }, (_, k) => (t.orient === 'h' ? `${t.row},${t.col + k}` : `${t.row + k},${t.col}`))));
      for (const c of l.soft) {
        expect(taken.has(`${c.row},${c.col}`), `${l.id} patch ${c.row},${c.col}`).toBe(false);
        expect(l.trucks.some((t) => t.length === 3 && (t.orient === 'h' ? t.row === c.row : t.col === c.col)), `${l.id} patch ${c.row},${c.col}`).toBe(true);
      }
    }
  });

  it('level 1 adds patches only: no equipment, no convoy', () => {
    expect(region.levels[0].obstacles).toEqual([]);
    expect(region.levels[0].trucks.some((t) => t.convoy)).toBe(false);
    expect(region.levels[0].hint).toBe("Rigs can't cross soft ground. Pickups can.");
  });

  it("EVERY LEVEL'S PATCHES RAISE ITS PAR: without them it solves in fewer moves", () => {
    for (const l of region.levels) {
      const plain = solve(withoutSoft(l));
      expect(plain, l.id).not.toBeNull();
      expect(plain!.length, `${l.id}: par ${l.par} with its patches`).toBeLessThan(l.par);
    }
  });

  it('par is the proven best by both solvers; on level 1 a pickup drives over a patch in the best line (the rule is seen)', () => {
    for (const l of region.levels) {
      const moves = solve(l)!;
      expect(moves.length, l.id).toBe(l.par);
      expect(solveAStar(l)!.length, l.id).toBe(l.par);
    }
    expect(pickupCrossesSoft(region.levels[0], solve(region.levels[0])!)).toBe(true);
  });

  it('any equipment is in the way of the best line, and any convoy raises par (the older regions\' rules)', () => {
    for (const [i, l] of region.levels.entries()) {
      expect(l.obstacles.length, l.id).toBeLessThanOrEqual(SLOTS[i].gear);
      if (l.obstacles.length) expect(everyPumpjackInTheWay(l, solve(l)!), l.id).toBe(true);
      if (l.trucks.some((t) => t.convoy)) expect(convoyRaisesPar(l, l.par, 2_000_000), l.id).toBe(true);
    }
  });

  it('along every best line no rig is ever on a patch, a rig stopped by one says so in its own words, and a fling stops at it', () => {
    let stops = 0;
    for (const l of region.levels) {
      let s = newGame(l);
      for (const m of [...solve(l)!, null]) {
        for (const t of s.trucks.filter((x) => x.length === 3)) {
          for (let k = 0; k < 3; k++) expect(l.soft.some((c) => c.row === (t.orient === 'h' ? t.row : t.row + k) && c.col === (t.orient === 'h' ? t.col + k : t.col)), `${l.id} rig ${t.id}`).toBe(false);
          const range = getMoveRange(s, t.id)!;
          for (const dir of [1, -1] as const) {
            const hit = bumpTarget(s, t.id, range, dir);
            if (hit.hit !== 'soft') continue;
            stops++;
            expect(hit.truckId).toBe(t.id);
            // Flung that way it goes to the patch's edge and no further (or nowhere).
            const d = flingDelta(range, dir);
            if (d !== 0) { const r = tryMove(s, t.id, d)!; expect(r.exited).toBe(false); expect(bumpTarget(r.state, t.id, getMoveRange(r.state, t.id)!, dir).hit).toBe('soft'); }
          }
        }
        if (m) s = tryMove(s, m.id, m.delta)!.state;
      }
    }
    expect(stops).toBeGreaterThan(20);
    // Its pool is its own (the line is the rule), short, and never an em dash.
    expect(linesFor('soft')).toEqual(BUMP_LINES.soft);
    expect(BUMP_LINES.soft.length).toBeGreaterThanOrEqual(3);
    for (const line of [...BUMP_LINES.soft, bumpLine('soft', 2, null), bumpLine('soft', 3, null)]) { expect(line.length).toBeLessThanOrEqual(44); expect(line).not.toMatch(/—/); }
    expect(bumpLine('soft', 2, null)).toBe('Still too soft for me.');
  });

  it('a pickup pushed at a patch is not stopped by it', () => {
    for (const l of region.levels) {
      const s = newGame(l);
      for (const t of s.trucks.filter((x) => x.length === 2)) for (const dir of [1, -1] as const) expect(bumpTarget(s, t.id, getMoveRange(s, t.id)!, dir).hit, `${l.id} ${t.id}`).not.toBe('soft');
    }
  });
});
