import { describe, expect, it } from 'vitest';
import { AIM, TAIL, WITNESS_REACH, gapBetween, nearestWitness, onSide, placeBubble, roomierSide, type Box } from './bubble.ts';

// A phone's game screen: the HUD ends at 96, the buttons start at 760, 8 px side margins.
const BOUNDS: Box = { left: 8, top: 100, right: 382, bottom: 756 };
const SIZE = { w: 150, h: 42 };
const cab = (x: number, y: number): Box => ({ left: x, top: y, right: x + 52, bottom: y + 52 });
const mid = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
const inside = (p: { left: number; top: number }) => p.left >= BOUNDS.left && p.top >= BOUNDS.top && p.left + SIZE.w <= BOUNDS.right && p.top + SIZE.h <= BOUNDS.bottom;

describe('speech bubbles: the tail is on the speaker', () => {
  it("sits above a truck's cab with its tail tip on the cab's top edge, straight over its middle", () => {
    const c = cab(170, 400);
    const p = placeBubble(c, SIZE, BOUNDS);
    expect(p.side).toBe('above');
    expect(p.fits).toBe(true);
    expect(p.top + SIZE.h + TAIL).toBeCloseTo(c.top, 6);
    expect(p.tip).toEqual({ x: mid(c).x, y: c.top });
    expect(p.left + p.tail).toBeCloseTo(mid(c).x, 6);
  });

  it('a cab by the screen edge: the bubble slides in, the tail stays on the cab', () => {
    for (const x of [16, 322]) {
      const c = cab(x, 400);
      const p = placeBubble(c, SIZE, BOUNDS);
      expect(inside(p)).toBe(true);
      expect(Math.abs(p.tip.x - mid(c).x)).toBeLessThanOrEqual(AIM);
      expect(p.tip.y).toBe(c.top);
    }
  });

  it('never covers the HUD: a cab in the top row gets its bubble below, tail pointing up at it', () => {
    const c = cab(170, 118);
    const p = placeBubble(c, SIZE, BOUNDS);
    expect(p.side).toBe('below');
    expect(p.top).toBeCloseTo(c.bottom + TAIL, 6);
    expect(p.tip).toEqual({ x: mid(c).x, y: c.bottom });
    expect(inside(p)).toBe(true);
  });

  it('never covers the buttons: a speaker low in the bottom strip gets its bubble above', () => {
    const head: Box = { left: 180, top: 700, right: 200, bottom: 722 };
    const p = placeBubble(head, SIZE, BOUNDS, ['below', 'above']);
    expect(p.side).toBe('above');
    expect(p.top + SIZE.h).toBeLessThanOrEqual(BOUNDS.bottom);
  });

  it('beside a speaker (the moose at the berm, a truck the magpie stands on): a side tail at its middle', () => {
    const muzzle: Box = { left: 110, top: 150, right: 140, bottom: 174 };
    expect(roomierSide(muzzle, BOUNDS)).toEqual(['right', 'left']);
    const p = placeBubble(muzzle, SIZE, BOUNDS, roomierSide(muzzle, BOUNDS));
    expect(p.side).toBe('right');
    expect(p.left).toBeCloseTo(muzzle.right + TAIL, 6);
    expect(p.tip).toEqual({ x: muzzle.right, y: mid(muzzle).y });
    expect(p.top + p.tail).toBeCloseTo(mid(muzzle).y, 6);
    // Too near the right edge for that: it goes to the left of him.
    const far: Box = { left: 300, top: 150, right: 330, bottom: 174 };
    expect(roomierSide(far, BOUNDS)).toEqual(['left', 'right']);
    const q = placeBubble(far, SIZE, BOUNDS, roomierSide(far, BOUNDS));
    expect(q.side).toBe('left');
    expect(q.left + SIZE.w + TAIL).toBeCloseTo(far.left, 6);
    expect(q.tip).toEqual({ x: far.left, y: mid(far).y });
  });

  it('a side bubble by the HUD slides down, its tail still at the speaker', () => {
    const muzzle: Box = { left: 110, top: 104, right: 140, bottom: 120 };
    const p = onSide('right', muzzle, SIZE, BOUNDS);
    expect(p.top).toBe(BOUNDS.top);
    expect(Math.abs(p.tip.y - mid(muzzle).y)).toBeLessThanOrEqual(8);
    expect(p.fits).toBe(true);
  });

  it('always stays in bounds, wherever the speaker is, and says when the tail cannot reach', () => {
    for (let x = -40; x <= 400; x += 44) for (let y = 60; y <= 780; y += 60) {
      const p = placeBubble(cab(x, y), SIZE, BOUNDS);
      expect(inside(p), `${x},${y}`).toBe(true);
      if (p.fits) expect(gapBetween({ left: p.tip.x, right: p.tip.x, top: p.tip.y, bottom: p.tip.y }, cab(x, y))).toBe(0);
    }
  });
});

describe('witness lines: only the truck nearest the gag, and only within reach', () => {
  const cell = 52;
  const trucks = [cab(40, 500), cab(200, 300), cab(300, 520)];
  it('the nearest truck speaks', () => {
    const gag = [{ left: 280, top: 600, right: 340, bottom: 660 }];
    expect(nearestWitness(trucks, gag, WITNESS_REACH * cell)).toBe(2);
    expect(nearestWitness(trucks, [{ left: 20, top: 590, right: 60, bottom: 650 }], WITNESS_REACH * cell)).toBe(0);
  });
  it('nobody speaks when no truck is within reach', () => {
    expect(WITNESS_REACH).toBe(2);
    const sky = [{ left: 100, top: 20, right: 300, bottom: 60 }];
    expect(nearestWitness(trucks, sky, WITNESS_REACH * cell)).toBe(-1);
    expect(nearestWitness([], sky, 1000)).toBe(-1);
    expect(nearestWitness(trucks, [], 1000)).toBe(-1);
  });
});
