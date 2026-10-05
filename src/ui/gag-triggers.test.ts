import { describe, expect, it } from 'vitest';
import { BackAndForth, GAG_TRIGGERS, bermBump } from './gag-triggers.ts';
import { A_BEATS, A_END, BIFFY_FRAC, B_BEATS, B_END } from './biffy.ts';
import { L_BEATS, L_END, lPose } from './landowner.ts';
import { N_BEATS, N_END, nPose } from './near-miss.ts';
import { BIFFY_X, biffyBox, stripGeom } from './strip-gags.ts';
import { workerSpot } from './worker.ts';
import { G_BEATS, G_END, leadX } from './geese.ts';
import { MM_BEATS, MM_END, handPos, mmPose } from './marshmallow.ts';

describe('gag triggers: one settings file for every gag', () => {
  it('holds every gag, with the placeholder values', () => {
    expect(Object.keys(GAG_TRIGGERS).slice(0, 9)).toEqual(['magpie', 'worker', 'moose', 'nearMiss', 'landowner', 'biffyA', 'biffyB', 'marshmallow', 'geese']);
    expect(GAG_TRIGGERS.marshmallow.flareTaps).toBe(3);
    expect(GAG_TRIGGERS.geese.undosInARow).toBe(3);
    expect(GAG_TRIGGERS.magpie.idleMs).toBe(10_000);
    expect(GAG_TRIGGERS.worker.idleMs).toBe(20_000);
    expect(GAG_TRIGGERS.moose).toEqual({ region: 'duvernay', topBermBumps: 2 });
    expect(GAG_TRIGGERS.nearMiss.region).toBe('cardium');
    expect(GAG_TRIGGERS.landowner.backAndForth).toBe(4);
    expect(GAG_TRIGGERS.biffyA.bottomBermBumps).toBe(1);
    expect(GAG_TRIGGERS.biffyB.bottomBermBumps).toBe(2);
  });

  it('tells a bump into the top berm from one into the bottom berm, and ignores trucks and equipment', () => {
    expect(bermBump('v', -1, 'wall')).toBe('top');
    expect(bermBump('v', 1, 'wall')).toBe('bottom');
    expect(bermBump('h', 1, 'wall')).toBeNull();
    expect(bermBump('v', 1, 'truck')).toBeNull();
    expect(bermBump('v', 1, 'tank')).toBeNull();
  });

  it('counts the same truck going back and forth; another truck or the same direction starts over', () => {
    const b = new BackAndForth();
    expect([b.moved('A', 1), b.moved('A', -1), b.moved('A', 2), b.moved('A', -1)]).toEqual([1, 2, 3, 4]);
    expect(b.moved('B', 1)).toBe(1);
    expect(b.moved('B', 1)).toBe(1);
    expect(b.moved('B', -1)).toBe(2);
    b.reset();
    expect(b.moved('B', 1)).toBe(1);
  });
});

describe('Near Miss, landowner and biffy: the references, as approved', () => {
  it('Near Miss plays the reference beats: the double take, the duck, the hotshot right to left, the dusty return', () => {
    expect(N_BEATS.map((b) => b[0])).toEqual([0, 0.6, 1.9, 2.35, 2.55, 2.75, 2.8, 4.4, 5.2, 5.8, 7.8, 8.6]);
    expect(nPose(0).gy).toBe(80); // down the hole
    expect(nPose(1.3).stretch).toBe(true);
    expect(nPose(2.3).pupX).toBeGreaterThan(3); // the slow look right
    expect(nPose(2.44).pupX).toBeLessThan(0.6); // back to centre
    expect(nPose(2.7).eye).toBeGreaterThan(1.5); // eyes go huge
    expect(nPose(2.7).spikes).toBe(true);
    expect(nPose(3).gy).toBe(90); // ducked
    // The hotshot: from +1 (off the right) to -1 (off the left), never on screen outside its pass.
    expect(nPose(2.81).hx).toBeGreaterThan(0.98);
    expect(nPose(4.39).hx).toBeLessThan(-0.98);
    expect(nPose(2.5).hx).toBe(999);
    expect(nPose(6.5).dusty && nPose(6.5).bub).toBe(true);
    expect(nPose(8.0).cough).toBeGreaterThan(0);
    expect(nPose(N_END).gy).toBe(90);
  });

  it('the landowner plays the reference beats: in from off screen, head shake, fist, wheelie, hat off and caught, out', () => {
    expect(L_BEATS.map((b) => b[0])).toEqual([0, 1.9, 2.5, 3.6, 3.8, 6.1, 6.5, 6.9, 7.3, 8.6]);
    expect(lPose(0).x).toBe(-420);
    expect(lPose(1.9).x).toBe(0);
    const shake = [3.0, 3.1, 3.2, 3.3].map((t) => lPose(t).head);
    expect(Math.max(...shake) - Math.min(...shake)).toBeGreaterThan(4);
    expect(lPose(4.5).bub).toBe(true);
    expect(lPose(4.5).arm[0]).toBe(-40);
    expect(lPose(6.8).tilt).toBeLessThan(-6); // the wheelie
    expect(lPose(7.1).hat.on).toBe(false);
    expect(lPose(7.7).hat).toEqual({ x: 0, y: 0, r: 0, on: true });
    expect(lPose(8.59).x).toBeGreaterThan(500);
    expect(lPose(L_END).x).toBe(999);
  });

  it('the biffy gags keep the reference timing', () => {
    expect(A_BEATS.map((b) => b[0])).toEqual([0, 0.3, 0.5, 0.75, 1.7, 1.95, 2.3, 2.7, 3.1, 3.55, 4.5]);
    expect(B_BEATS.map((b) => b[0])).toEqual([0, 0.3, 0.5, 0.8, 1.1, 1.4, 2.9, 8.9, 9.2]);
    expect(A_END).toBeGreaterThan(4.5);
    expect(B_END).toBeGreaterThan(10.1);
  });
});

describe('the bottom strip: the permanent biffy', () => {
  it('is about 80 px tall at 390, clear of the berm above and the tip line below', () => {
    const strip = { top: 548, bottom: 730 };
    const g = stripGeom(390, strip);
    expect(g.scale).toBe(1);
    const tall = BIFFY_FRAC * 390 * (126 / 100);
    expect(tall).toBeGreaterThan(70);
    expect(tall).toBeLessThan(86);
    expect(g.ground).toBeLessThanOrEqual(strip.bottom);
    expect(g.ground - tall).toBeGreaterThan(strip.top + 10);
  });

  it('is drawn smaller on a short strip (375 px), still off the lease and above the tip line', () => {
    const strip = { top: 428, bottom: 496 };
    const g = stripGeom(375, strip);
    expect(g.scale).toBeLessThan(1);
    const tall = BIFFY_FRAC * 375 * g.scale * 1.26;
    expect(g.ground - tall).toBeGreaterThanOrEqual(strip.top + 6);
    expect(g.ground).toBeLessThanOrEqual(strip.bottom);
  });

  it("stands clear of the sleepy worker's clearing", () => {
    for (const [w, strip] of [[390, { top: 548, bottom: 730 }], [375, { top: 428, bottom: 496 }], [430, { top: 612, bottom: 810 }]] as const) {
      const box = biffyBox(w, strip);
      const worker = workerSpot(w, strip);
      expect(Math.abs(box.x + box.width / 2 - BIFFY_X * w)).toBeLessThan(0.01);
      if (worker) expect(box.x).toBeGreaterThan(worker.x + worker.w * 0.3);
    }
  });
});

describe('marshmallow and geese: the reference, as approved', () => {
  it('the marshmallow plays the reference beats, and the stick telescopes in three clicks', () => {
    expect(MM_BEATS.map((b) => b[0])).toEqual([0, 2.0, 2.5, 3.6, 4.5, 4.6, 5.1, 5.8, 6.3, 7.0, 7.9, 10.4]);
    expect(MM_END).toBeGreaterThan(10.4);
    // Folded while he walks; a third longer at each click, with a hold after each; full reach in the flame.
    expect(mmPose(1).ext).toBe(0);
    const ext = (t: number) => mmPose(t).ext;
    expect(ext(2.5 + 0.3)).toBeCloseTo(1 / 3);
    expect(ext(2.5 + 0.36)).toBeCloseTo(1 / 3);
    expect(ext(2.5 + 0.7)).toBeCloseTo(2 / 3);
    expect(ext(3.59)).toBeCloseTo(1);
    expect(ext(4)).toBe(1);
    // FWOOMP: the fire is bigger than a flame, the hat jumps; then burnt, then eaten.
    expect(mmPose(4.6).fire).toBeGreaterThan(1);
    expect(mmPose(4.62).hatY).toBeLessThan(-6);
    expect(mmPose(6.2).char).toBe(true);
    expect(mmPose(7.5)).toMatchObject({ mm: false, bub: true });
    expect(mmPose(10.45).show).toBe(false);
  });

  it('he walks in from, and out to, wherever the screen edge is', () => {
    expect(mmPose(0).x).toBe(-300);
    expect(mmPose(0, -520).x).toBe(-520);
    expect(mmPose(2).x).toBe(0);
    expect(mmPose(10.39, -300, 700).x).toBeGreaterThan(690);
    // His glove moves with him.
    expect(handPos(mmPose(0, -520)).x).toBeLessThan(-400);
  });

  it('the geese play the reference beats; the V goes from fully off the left to fully off the right, straggler and all', () => {
    expect(G_BEATS.map((b) => b[0])).toEqual([0, 0.8, 2.9, 3.3, 3.7, 4.3, 4.6, 7.4, 9.0]);
    const W = 390, gw = 34, sp = gw * 1.05;
    // The lead's centre starts more than half a goose off the left edge.
    expect(leadX(0, W, gw) + gw / 2).toBeLessThan(0);
    // At the end the straggler, one spacing behind the last goose of the V (three back), is past the right edge.
    expect(leadX(G_END, W, gw) - 4 * sp - gw / 2).toBeGreaterThan(W);
    // Same speed as the reference: it reaches the reference's end point at 9.0.
    expect(leadX(9, W, gw)).toBeCloseTo(W + 3.4 * sp + gw * 0.6);
  });
});
