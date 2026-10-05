import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { OBSTACLE_KINDS } from '../engine/index.ts';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { GATE_GAP, MIN_SCALE, OVER, PJ, STROKES_PER_MIN, STROKE_MS, equipFit, equipmentSvg, flowlineLeft, gateClearance, phaseFor, pumpjackPose } from './obstacles.ts';

const TURN = Array.from({ length: 360 }, (_, i) => (i * Math.PI) / 180);

describe('equipment drawings', () => {
  it('every kind is drawn in code, in the toy look: no photo sprites, no slab, a ground patch and contact shadow', () => {
    for (const kind of OBSTACLE_KINDS) {
      const svg = equipmentSvg(kind, 3);
      expect(svg, kind).toContain('class="equip"');
      expect(svg, kind).toContain('eq-patch');
      expect(svg, kind).toContain('eq-shadow');
      expect(svg, kind).not.toMatch(/<img|ob-concrete|ob-ground/);
    }
    expect(existsSync('public/sprites/obstacles')).toBe(false);
  });

  it('the wellhead is a production tree: valves with handwheels, a wing valve, a gauge, guard posts', () => {
    const svg = equipmentSvg('wellhead');
    expect((svg.match(/class="eq-redwheel"/g) ?? []).length).toBe(3);
    expect(svg).toContain('eq-gauge');
    expect((svg.match(/eq-guardpost/g) ?? []).length).toBe(3);
  });

  it('the flare stack has a ladder, guy wires, a knockout drum and a pilot flame', () => {
    const svg = equipmentSvg('flare');
    for (const part of ['eq-rung', 'eq-guy', 'eq-drum', 'fl-flame']) expect(svg).toContain(part);
  });

  it('equipment is always fully visible: never shrunk, and every overhang is under half a cell', () => {
    for (const kind of OBSTACLE_KINDS) {
      expect(equipFit(kind).height, kind).toBe(100 + OVER[kind]);
      expect(OVER[kind], kind).toBeLessThan(50);
    }
    expect(OVER.flare).toBeGreaterThan(OVER.tank);
  });

  it('the wellhead is grey steel with red handwheels and a flowline running sideways', () => {
    const svg = equipmentSvg('wellhead');
    expect((svg.match(/class="eq-redrim"/g) ?? []).length).toBe(3);
    expect(svg).toContain('eq-flowline');
    expect(svg).not.toContain('eq-red"');
    // The flowline's run is horizontal.
    expect(svg).toMatch(/eq-flowline" d="M\d+ (\d+) L\d+ \1"/);
  });
});

describe('equipment beside a gate', () => {
  it('steps away from a gate at its side or below it; no gate, no change', () => {
    expect(gateClearance('tank', 2, 3, [{ side: 'right', index: 2 }])).toEqual({ dx: 0, dy: 0, scale: 1 });
    expect(gateClearance('wellhead', 2, 5, [{ side: 'right', index: 2 }]).dx).toBe(-GATE_GAP);
    expect(gateClearance('wellhead', 2, 0, [{ side: 'left', index: 2 }]).dx).toBe(GATE_GAP);
    expect(gateClearance('flare', 5, 3, [{ side: 'bottom', index: 3 }]).dy).toBe(-GATE_GAP);
    expect(gateClearance('flare', 5, 3, [{ side: 'bottom', index: 2 }])).toEqual({ dx: 0, dy: 0, scale: 1 });
  });

  it('under a top gate its overhang stops short of the gate, and it is never shrunk much', () => {
    const c = gateClearance('wellhead', 0, 2, [{ side: 'top', index: 2 }]);
    expect((100 + OVER.wellhead) * c.scale).toBeLessThanOrEqual(100 + 1e-9);
    for (const kind of OBSTACLE_KINDS) expect(gateClearance(kind, 0, 2, [{ side: 'top', index: 2 }]).scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });

  it("the wellhead's flowline always points toward the middle of the pad", () => {
    expect([0, 1, 2].map(flowlineLeft)).toEqual([false, false, false]);
    expect([3, 4, 5].map(flowlineLeft)).toEqual([true, true, true]);
    expect(equipmentSvg('wellhead', 5)).toContain('scale(-1 1)');
    expect(equipmentSvg('wellhead', 6)).not.toContain('scale(-1 1)');
  });

  it('every shipped level: no piece touches a gate beside it', () => {
    for (const levels of [...REGIONS.map((r) => r.levels), DAILY_LEVELS])
      for (const l of levels)
        for (const o of l.obstacles) {
          const c = gateClearance(o.kind ?? 'pumpjack', o.row, o.col, l.gates);
          const beside = l.gates.some((g) => (g.side === 'left' && o.col === 0 && g.index === o.row) || (g.side === 'right' && o.col === 5 && g.index === o.row) || (g.side === 'bottom' && o.row === 5 && g.index === o.col) || (g.side === 'top' && o.row === 0 && g.index === o.col));
          expect(beside ? c.dx !== 0 || c.dy !== 0 || c.scale < 1 : c.dx === 0 && c.dy === 0 && c.scale === 1, `${l.id} ${o.kind}`).toBe(true);
        }
  });
});

describe('pumpjack linkage (GAME_BIBLE 7)', () => {
  it('runs at 12 strokes per minute', () => {
    expect(STROKES_PER_MIN).toBe(12);
    expect(STROKE_MS).toBeCloseTo(60_000 / STROKES_PER_MIN, 6);
  });

  it('the crank turns at a constant rate, its pin on a circle round the shaft', () => {
    for (const a of TURN) {
      const p = pumpjackPose(a);
      expect(p.crank).toBeCloseTo((a * 180) / Math.PI, 9);
      expect(Math.hypot(p.pin.x - PJ.shaft.x, p.pin.y - PJ.shaft.y)).toBeCloseTo(PJ.crank, 9);
    }
  });

  it('the pitman arm never changes length, and the equalizer stays on the beam', () => {
    for (const a of TURN) {
      const p = pumpjackPose(a);
      expect(Math.hypot(p.equalizer.x - p.pin.x, p.equalizer.y - p.pin.y)).toBeCloseTo(PJ.pitman, 9);
      expect(Math.hypot(p.equalizer.x - PJ.saddle.x, p.equalizer.y - PJ.saddle.y)).toBeCloseTo(PJ.tail, 9);
      // The beam's tilt is the angle of that tail.
      expect(Math.atan2(p.equalizer.y - PJ.saddle.y, p.equalizer.x - PJ.saddle.x)).toBeCloseTo((p.beam * Math.PI) / 180, 9);
    }
  });

  it('the beam rocks gently both ways about the saddle, once per crank turn', () => {
    const tilt = TURN.map((a) => pumpjackPose(a).beam);
    expect(Math.max(...tilt)).toBeGreaterThan(8);
    expect(Math.min(...tilt)).toBeLessThan(-8);
    expect(Math.max(...tilt.map(Math.abs))).toBeLessThan(25);
    // One up and one down per turn: the tilt changes direction exactly twice.
    let turns = 0;
    for (let i = 0; i < 360; i++) {
      const [a, b, c] = [tilt[i], tilt[(i + 1) % 360], tilt[(i + 2) % 360]];
      if ((b - a) * (c - b) < 0) turns++;
    }
    expect(turns).toBe(2);
  });

  it('the polished rod moves straight up and down only, by the arc the horsehead turns through', () => {
    for (const a of TURN) {
      const p = pumpjackPose(a);
      expect(p.rodX).toBe(PJ.saddle.x - PJ.head);
      expect(p.carrierY).toBeCloseTo(PJ.carrier - PJ.head * ((p.beam * Math.PI) / 180), 9);
      // The carrier bar stays between the horsehead and the stuffing box.
      expect(p.carrierY).toBeGreaterThan(PJ.saddle.y + 4);
      expect(p.carrierY).toBeLessThan(PJ.box - 2);
    }
  });

  it('two pumpjacks on one pad are out of step', () => {
    expect(phaseFor(7)).not.toBeCloseTo(phaseFor(8), 2);
    expect(equipmentSvg('pumpjack', 7)).not.toBe(equipmentSvg('pumpjack', 8));
  });
});

describe('flare stacks in levels', () => {
  it('Montney and Duvernay show some tanks as flare stacks; Cardium and the Daily Pad have none', () => {
    const count = (levels: readonly { obstacles: readonly { kind?: string }[] }[]) => levels.flatMap((l) => l.obstacles).filter((o) => o.kind === 'flare').length;
    const by = Object.fromEntries(REGIONS.map((r) => [r.id, count(r.levels)]));
    expect(by.montney).toBeGreaterThanOrEqual(2);
    expect(by.duvernay).toBeGreaterThanOrEqual(2);
    expect(by.cardium).toBe(0);
    expect(count(DAILY_LEVELS)).toBe(0);
  });
});
