import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { OBSTACLE_KINDS } from '../engine/index.ts';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { OVER, PJ, STROKES_PER_MIN, STROKE_MS, equipFit, equipmentSvg, phaseFor, pumpjackPose } from './obstacles.ts';

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
    expect((svg.match(/class="eq-wheel"/g) ?? []).length).toBe(3);
    expect(svg).toContain('eq-gauge');
    expect((svg.match(/eq-guardpost/g) ?? []).length).toBe(4);
  });

  it('the flare stack has a ladder, guy wires, a knockout drum and a pilot flame', () => {
    const svg = equipmentSvg('flare');
    for (const part of ['eq-rung', 'eq-guy', 'eq-drum', 'fl-flame']) expect(svg).toContain(part);
  });

  it('tall pieces stick up above their cell, except in the top row where they shrink to fit', () => {
    expect(OVER.flare).toBeGreaterThan(OVER.tank);
    for (const kind of OBSTACLE_KINDS) {
      const low = equipFit(kind, 3);
      expect(low.scale).toBe(1);
      expect(low.over).toBeCloseTo(OVER[kind] / (100 + OVER[kind]), 9);
      const top = equipFit(kind, 0);
      expect(top.over).toBe(0);
      expect((100 + OVER[kind]) * top.scale, kind).toBeCloseTo(100, 9);
    }
  });
});

describe('pumpjack linkage (GAME_BIBLE 7)', () => {
  it('runs at 6 to 8 strokes per minute', () => {
    expect(STROKES_PER_MIN).toBeGreaterThanOrEqual(6);
    expect(STROKES_PER_MIN).toBeLessThanOrEqual(8);
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
