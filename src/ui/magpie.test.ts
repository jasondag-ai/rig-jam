import { describe, expect, it } from 'vitest';
import { newGame } from '../engine/index.ts';
import { DAILY_LEVELS, REGIONS } from '../levels/regions.ts';
import { BEATS, BIRD, BIRD_FRAC, END, GONE, REFERENCE_TRAVEL, STARTLE, T_SMUG, T_SPLAT, beatAt, dripTurn, fxAt, magpieStill, offScreen, pickTruck, pose, roofSpot, startlePose, travelFor } from './magpie.ts';

const frames = (from: number, to: number, step = 1 / 60) => Array.from({ length: Math.round((to - from) / step) }, (_, i) => from + i * step);

describe('magpie puppet: the reference, as approved', () => {
  it('has the reference parts, and is about 40 px of bird at 390 px', () => {
    for (const part of ['flip', 'root', 'tail', 'legs', 'body', 'wing', 'head', 'beak', 'pupil', 'glint', 'lid']) expect(BIRD).toContain(`class="${part}"`);
    // The bird fills about 100 of its 120-unit box.
    expect(BIRD_FRAC * 390 * (100 / 120)).toBeGreaterThan(40);
    expect(BIRD_FRAC * 390 * (100 / 120)).toBeLessThan(56);
  });

  it('plays the reference beats at the reference times', () => {
    expect(BEATS.map((b) => b[0])).toEqual([0, 1.7, 2.5, 3.0, 4.2, 5.0, 5.4, 7.0, 7.3, 8.0, 9.6, 9.9, 11.8]);
    expect(BEATS.map((b) => b[1])).toEqual(['fly-in', 'land', 'hop-turn', 'look', 'glance', 'crouch', 'strain', 'relief', 'peek', 'smug', 'wind-up', 'launch', 'gone']);
    expect(beatAt(6)).toBe('strain');
    expect(beatAt(8.6)).toBe('smug');
  });

  it('faces the way he travels: left flying in, right flying out', () => {
    for (const t of frames(0, 1.7)) expect(pose(t).face).toBe(-1);
    for (const t of frames(9.9, GONE)) expect(pose(t).face).toBe(1);
    // In: from the right, moving left. Out: moving right.
    expect(pose(0.2).x).toBeGreaterThan(pose(1.2).x);
    expect(pose(11).x).toBeGreaterThan(pose(10.2).x);
  });

  it('the hop-turn never goes paper-thin, and he leaves the roof to do it', () => {
    const turn = frames(2.5, 3.0).map((t) => pose(t));
    expect(Math.min(...turn.map((p) => Math.abs(p.face)))).toBeGreaterThan(0.8);
    expect(Math.min(...turn.map((p) => p.y))).toBeLessThan(-12);
    expect(turn[0].face).toBeLessThan(0);
    expect(turn.at(-1)!.face).toBeGreaterThan(0);
  });

  it('anticipation before the big moves; squash on landing; stretch on launch', () => {
    expect(pose(5.39).sy).toBeLessThan(0.92); // crouch before the tail lift
    expect(pose(5.39).tail).toBeLessThan(-30);
    expect(pose(9.89).sy).toBeLessThan(0.82); // crouch before take-off
    expect(Math.min(...frames(1.7, 2.5).map((t) => pose(t).sy))).toBeLessThan(0.82);
    expect(pose(9.92).sy).toBeGreaterThan(1.05);
  });

  it('moves on arcs, never in a straight slide, and stands on the roof in between', () => {
    // The flight path bulges above the straight line between its ends.
    const mid = pose(0.85);
    const [a, b] = [pose(0), pose(1.69)];
    expect(mid.y).toBeLessThan((a.y + b.y) / 2 - 10);
    for (const t of frames(3.0, 8.0)) expect(Math.abs(pose(t).y)).toBeLessThan(0.01);
  });

  it('acts: a blink, glances both ways, squeezed eyes while straining, two chuckle bounces', () => {
    expect(pose(3.75).lid).not.toBe(pose(3.5).lid);
    expect(pose(4.3).px).toBeLessThan(78);
    expect(pose(4.9).px).toBeGreaterThan(81);
    expect(pose(6.5).lid).toBe('M68 34 L90 34 L90 46 L68 46 Z');
    const bounce = frames(8.0, 9.6).map((t) => pose(t).y);
    let peaks = 0;
    for (let i = 1; i < bounce.length - 1; i++) if (bounce[i] < bounce[i - 1] && bounce[i] <= bounce[i + 1] && bounce[i] < -3) peaks++;
    expect(peaks).toBe(2);
  });

  it('the dropping swells slowly, lets go, splats; the drip keeps running; a feather drifts down', () => {
    expect(fxAt(5.4).drop).toBeNull();
    expect(fxAt(6.9).drop!.len).toBeGreaterThan(fxAt(5.8).drop!.len * 1.8);
    expect(fxAt(7.1).drop!.fall).toBeGreaterThan(0.5);
    expect(fxAt(T_SPLAT - 0.05).splat).toBe(false);
    expect(fxAt(T_SPLAT + 0.05).splat).toBe(true);
    expect(fxAt(10.9).drip!).toBeGreaterThan(fxAt(7.6).drip! * 2);
    expect(fxAt(9.9).feather).toBeNull();
    expect(fxAt(12.0).feather!.y).toBeGreaterThan(fxAt(10.2).feather!.y);
    expect(fxAt(END).feather).toBeNull();
  });

  it('the smug still (the log card and reduced motion) is the smug pose', () => {
    const svg = magpieStill();
    expect(svg).toContain('class="magpie-still"');
    expect(svg).toContain(pose(T_SMUG).lid);
    expect(svg).toContain('rotate(10 64 64)');
  });
});

describe('magpie: fully off screen, in and out', () => {
  // The whole board of each phone size: every roof spot a truck could offer.
  const SCREENS = [[375, 667, 86], [390, 844, 190], [430, 932, 214]];
  it('starts and ends with his whole box past the screen edge, from any roof on any phone', () => {
    for (const [sw, , top] of SCREENS) {
      const w = BIRD_FRAC * sw;
      const cell = (sw - 32) / 6.84;
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          const spot = { x: 16 + cell * 0.42 + (c + 0.5) * cell, y: top + cell * 0.42 + (r + 0.5) * cell };
          const travel = travelFor(spot, w, sw);
          expect(offScreen(pose(0, travel), spot, w, sw), `in ${sw} ${r},${c}`).toBe(true);
          expect(offScreen(pose(GONE - 0.001, travel), spot, w, sw), `out ${sw} ${r},${c}`).toBe(true);
          // And he is on screen in between, landing exactly on his spot.
          expect(offScreen(pose(1.6, travel), spot, w, sw)).toBe(false);
          expect(pose(1.7, travel).x).toBe(0);
          // Never shorter than the reference's own flight.
          expect(travel.inX).toBeGreaterThanOrEqual(REFERENCE_TRAVEL.inX);
          expect(travel.outX).toBeGreaterThanOrEqual(REFERENCE_TRAVEL.outX);
        }
    }
  });

  it('never stops or vanishes mid-screen: the flight out keeps moving until he is past the edge', () => {
    const spot = { x: 120, y: 380 };
    const w = BIRD_FRAC * 390;
    const travel = travelFor(spot, w, 390);
    const out = frames(9.9, GONE).map((t) => pose(t, travel));
    for (let i = 1; i < out.length; i++) expect(out[i].x).toBeGreaterThanOrEqual(out[i - 1].x);
    expect(out.every((p) => p.show)).toBe(true);
    expect(pose(GONE, travel).show).toBe(false);
  });

  it('startled, he jumps (feathers up), turns to face forward and flies off, also fully off screen', () => {
    const spot = { x: 120, y: 380 };
    const w = BIRD_FRAC * 390;
    for (const at of [2.0, 3.5, 6.2, 8.5]) {
      const from = pose(at);
      const t = travelFor(spot, w, 390);
      const out = { x: t.outX, y: t.outY };
      const jump = startlePose(STARTLE.jump * 0.9, from, out);
      expect(jump.wing).toBeLessThan(-60);
      expect(jump.tail).toBeLessThan(-30);
      expect(jump.y).toBeLessThan(from.y - 8);
      // Never paper-thin, and facing right (forward) by the time he flies.
      for (const u of frames(0, STARTLE.gone)) expect(Math.abs(startlePose(u, from, out).face)).toBeGreaterThan(0.8);
      expect(startlePose(STARTLE.hop + 0.01, from, out).face).toBe(1);
      expect(offScreen(startlePose(STARTLE.gone - 0.001, from, out), spot, w, 390), `startled at ${at}`).toBe(true);
      expect(startlePose(STARTLE.gone, from, out).show).toBe(false);
    }
  });
});

describe('magpie: which truck, and which way the drip runs', () => {
  const ALL = [...REGIONS.flatMap((r) => r.levels), ...DAILY_LEVELS];
  it('lands on the cab roof of a parked truck, a full cell in from the board edge whenever one is', () => {
    for (const level of ALL) {
      const state = newGame(level);
      const inFrom = (t: (typeof state.trucks)[number]) => {
        const s = roofSpot(level, t);
        return Math.min(s.x, s.y, 6 - s.x, 6 - s.y);
      };
      const some = state.trucks.some((t) => inFrom(t) >= 1);
      for (const r of [0, 0.3, 0.6, 0.99]) {
        const t = pickTruck(state, () => r)!;
        expect(state.trucks).toContain(t);
        if (some) expect(inFrom(t), level.id).toBeGreaterThanOrEqual(1);
        // On the truck itself.
        const s = roofSpot(level, t);
        expect(s.x).toBeGreaterThan(t.col);
        expect(s.y).toBeGreaterThan(t.row);
      }
    }
    expect(pickTruck({ ...newGame(ALL[0]), trucks: [] })).toBeNull();
  });

  it('the drip runs toward the front of the truck, whichever way it faces', () => {
    expect([dripTurn('bottom'), dripTurn('left'), dripTurn('top'), dripTurn('right')]).toEqual([0, 90, 180, -90]);
  });
});
