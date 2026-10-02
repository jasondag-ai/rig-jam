import { describe, expect, it } from 'vitest';
import { bearLayout } from './bear-scene.ts';
import { jointTransform, jointsIn } from './rig.ts';
import { BEAR_RIG, MOOSE_RIG, RABBIT_RIG, WORKER_RIG } from './rigs.ts';

describe('puppet rigs', () => {
  it('a joint rotates and scales about its own pivot', () => {
    const t = jointTransform({ px: 10, py: 20, x: 3, y: -2, rot: 30, sx: 1.2, sy: 0.8 });
    expect(t).toBe('translate(13 18) rotate(30) scale(1.2 0.8) translate(-10 -20)');
    // At rest it's the identity: translate(p) … translate(-p).
    expect(jointTransform({ px: 5, py: 6, x: 0, y: 0, rot: 0, sx: 1, sy: 1 })).toBe('translate(5 6) rotate(0) scale(1 1) translate(-5 -6)');
  });

  const need: [string, string, string[]][] = [
    ['bear', BEAR_RIG, ['face', 'hips', 'body', 'head', 'jaw', 'ear', 'earF', 'eye', 'belly', 'tail', 'thigh', 'shin', 'thighF', 'shinF', 'armF', 'arm', 'fore', 'paw']],
    ['rabbit', RABBIT_RIG, ['root', 'body', 'head', 'ear', 'earF', 'nose', 'leg', 'paw', 'tail']],
    ['worker', WORKER_RIG, ['root', 'legF', 'legN', 'upper', 'head', 'arm']],
    ['moose', MOOSE_RIG, ['lean', 'head', 'antlerL', 'antlerR', 'earL', 'earR', 'jaw', 'bell', 'grass']],
  ];
  for (const [name, svg, joints] of need) {
    it(`the ${name} has every joint, each once, each with a pivot`, () => {
      const found = jointsIn(svg);
      const names = found.map((j) => j.name);
      for (const j of joints) expect(names, j).toContain(j);
      expect(new Set(names).size).toBe(names.length);
      for (const j of found) expect(Number.isFinite(j.px) && Number.isFinite(j.py), j.name).toBe(true);
    });
  }

  it('the bear: shoulder, elbow and wrist nest, so the grab is a jointed arm', () => {
    const arm = BEAR_RIG.indexOf('data-j="arm"');
    const fore = BEAR_RIG.indexOf('data-j="fore"');
    const paw = BEAR_RIG.indexOf('data-j="paw"');
    const grip = BEAR_RIG.indexOf('class="grip"');
    expect(arm).toBeLessThan(fore);
    expect(fore).toBeLessThan(paw);
    expect(paw).toBeLessThan(grip);
  });

  it('the biffy worker: bare cheek, no long johns, toilet paper', () => {
    expect(WORKER_RIG).not.toContain('#c0392b');
    expect(WORKER_RIG).toContain('class="tp"');
  });
});

describe('bear scene layout', () => {
  const phone = { screenL: -16, screenR: 374, cell: 52, stripH: 99 };
  it('the bear is about 70% bigger than the old one (which filled the strip)', () => {
    const L = bearLayout({ ...phone, biffy: null });
    const oldSitting = Math.min(52 * 2, 99) * 0.95;
    expect((145 * L.k) / oldSitting).toBeCloseTo(1.7, 1);
  });

  it('bush, bear and rabbit fit on screen and clear of a biffy below the board', () => {
    for (const left of [0, 60, 150, 220, 300]) {
      const biffy = { left, right: left + 34 };
      const L = bearLayout({ ...phone, biffy });
      // Bush and bear stay clear of it (the rabbit may hop in front of it when it stands mid-screen).
      const bear = { from: L.bushX, to: L.bushX + L.bushW * 0.7 + (200 - 26) * L.k };
      expect(L.bushX + L.bushW * 0.5).toBeGreaterThanOrEqual(phone.screenL);
      expect(L.bushX + L.bushW * 0.7 + (236 - 26) * L.k).toBeLessThanOrEqual(phone.screenR + 1);
      expect(bear.to <= biffy.left || bear.from >= biffy.right, `biffy at ${left}`).toBe(true);
    }
  });

  it('the bush never reaches up onto the board', () => {
    const L = bearLayout({ ...phone, stripH: 40, biffy: null });
    expect(L.bushH).toBeLessThanOrEqual(36);
  });
});
