import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { MOOSE, MOOSE_FRAC, M_BEATS, isTopBermBump, mBeatAt, mPose, mooseColumn, mooseStill, snowChunks, M_END } from './moose.ts';
import { CANCEL, T_ASLEEP, WORKER, WORKER_FRAC, W_BEATS, W_END, cancelPose, wBeatAt, wPose, workerFrame, workerOff, workerSpot, workerStill } from './worker.ts';
import { LOG_ENTRIES, cardHint } from './wildlife-log.ts';

const frames = (from: number, to: number, step = 1 / 60) => Array.from({ length: Math.round((to - from) / step) }, (_, i) => from + i * step);
// The screen's left edge in puppet units, for his spot on a 390 px screen.
const EDGE = 60 - (0.1 * 390) / ((WORKER_FRAC * 390) / 120);

describe('sleepy worker: the reference, as approved', () => {
  it('has the reference parts, and is about 62 px tall at 390 px', () => {
    for (const part of ['pail', 'reach', 'flip', 'root', 'legB', 'armB', 'torso', 'legF', 'head', 'armF', 'hat', 'lid', 'brow', 'mouth', 'blush']) expect(WORKER).toContain(`class="${part}"`);
    // Hard hat top (y 9) to boot soles (y 108) of a 120-unit box.
    expect(((108 - 9) / 120) * WORKER_FRAC * 390).toBeGreaterThan(58);
    expect(((108 - 9) / 120) * WORKER_FRAC * 390).toBeLessThan(66);
  });

  it('plays the reference beats at the reference times', () => {
    expect(W_BEATS.map((b) => b[0])).toEqual([0, 3.0, 3.9, 4.6, 6.1, 7.2, 8.7, 9.1, 10.2, 11.4, 12.2, 12.95, 13.3]);
    expect(wBeatAt(5)).toBe('yawn');
    expect(wBeatAt(11.8)).toBe('pail-alone');
  });

  it('walks in from off screen facing the way he walks, and bolts off the same edge facing it', () => {
    expect(workerOff(wPose(0), EDGE)).toBe(true);
    for (const t of frames(0, 3)) expect(wPose(t).face).toBe(1);
    expect(wPose(2.9).x).toBeGreaterThan(wPose(0.5).x);
    for (const t of frames(10.6, 11.4)) expect(wPose(t).face).toBe(-1);
    expect(wPose(11.39).x).toBeLessThan(-200);
  });

  it('the hop-turn is never paper-thin', () => {
    for (const t of frames(10.2, 10.6)) expect(Math.abs(wPose(t).face)).toBeGreaterThan(0.8);
  });

  it('sets the pail down and it stays put while he sits, dozes and bolts without it', () => {
    for (const t of frames(3.9, 12.9)) expect(workerFrame(wPose(t), EDGE).pail).toBe('translate(44 88) rotate(180 0 10)');
    // Forgotten: he is gone, the pail is not.
    expect(wPose(11.8).show).toBe(false);
    expect(workerOff(wPose(11.8), EDGE)).toBe(false);
  });

  it('acts: yawn with arms up, heavy lids and Zs, a jolt with the hard hat popping, guilty glances', () => {
    expect(wPose(5.35).arF).toBeLessThan(-150);
    expect(wPose(8.0).z).toBe(1);
    expect(wPose(8.0).head).toBeGreaterThan(15);
    expect(Math.min(...frames(8.7, 9.1).map((t) => wPose(t).hatY))).toBeLessThan(-7);
    expect(wPose(9.3).px).toBeLessThan(68);
    expect(wPose(10.0).px).toBeGreaterThan(72);
  });

  it('peeks back in at the edge, red-faced, and his arm takes the pail off with it', () => {
    const peek = workerFrame(wPose(12.8), EDGE);
    expect(peek.blush).toBe(1);
    expect(peek.reach).not.toBeNull();
    expect(peek.armOpacity).toBe(0);
    // The yank carries the pail past the edge, and by the end nothing is left on screen.
    const gone = wPose(13.26);
    expect(gone.pail).toBe('yank');
    expect(workerOff(gone, EDGE)).toBe(true);
    expect(workerOff(wPose(W_END), EDGE)).toBe(true);
  });

  it('any move cancels him: a jolt, then he runs off the edge WITH the pail, fully off screen', () => {
    for (const t0 of [1.5, 3.4, 5.0, 7.9, 9.5]) {
      const end = cancelPose(CANCEL.gone - 0.01, t0)!;
      expect(end.pail, `from ${t0}`).toBe('carry');
      expect(end.face).toBe(-1);
      expect(workerOff(end, EDGE), `from ${t0}`).toBe(true);
      expect(cancelPose(CANCEL.gone, t0)!.show).toBe(false);
      for (const u of frames(0, CANCEL.gone)) expect(Math.abs(cancelPose(u, t0)!.face)).toBeGreaterThan(0.8);
      expect(cancelPose(0.1, t0)!.z).toBe(0);
    }
    // Already bolting: the gag just plays out.
    expect(cancelPose(0.1, 10.5)).toBeNull();
  });

  it('gets a clearing by the left edge with room for him; none on a strip too short', () => {
    const spot = workerSpot(390, { top: 560, bottom: 730 })!;
    expect(spot.x).toBeCloseTo(39, 5);
    expect(spot.y).toBeLessThanOrEqual(730);
    expect(spot.y - spot.w * 0.84).toBeGreaterThan(560);
    expect(spot.clearing.x).toBe(0);
    expect(spot.clearing.width).toBeGreaterThan(spot.x + spot.w * 0.4);
    // 375x667: a shorter strip, a slightly smaller worker, still above the tip line.
    const small = workerSpot(375, { top: 428, bottom: 496 })!;
    expect(small.w).toBeLessThan(0.19 * 375);
    expect(small.y - small.w * 0.84).toBeGreaterThanOrEqual(428 + 6);
    expect(workerSpot(375, { top: 428, bottom: 458 })).toBeNull();
    expect(T_ASLEEP).toBeGreaterThan(6.1);
  });

  it('the log card is him dozing on his pail', () => {
    const svg = workerStill();
    expect(svg).toContain('class="worker-still"');
    expect(svg).toContain('translate(44 88) rotate(180 0 10)');
  });
});

describe('moose peekaboo: the reference, as approved', () => {
  it('has the reference parts and about 45 px of antler span at 390 px', () => {
    for (const part of ['root', 'antL', 'antR', 'earL', 'earR', 'muzzle', 'jaw', 'lip', 'lidL', 'lidR']) expect(MOOSE).toContain(`class="${part}"`);
    // Antler tips at x 10 and 110 of a 120-unit box.
    expect((100 / 120) * MOOSE_FRAC * 390).toBeGreaterThan(41);
    expect((100 / 120) * MOOSE_FRAC * 390).toBeLessThan(49);
  });

  it('plays the reference beats: up from behind the berm, blink, chew, stare with an ear flick, groan, duck', () => {
    expect(M_BEATS.map((b) => b[0])).toEqual([0, 0.6, 1.4, 1.9, 2.4, 3.5, 4.3, 4.8]);
    expect(mBeatAt(3.0)).toBe('stare');
    expect(mPose(0).y).toBe(100); // hidden below the cut
    expect(mPose(1.4).y).toBe(0);
    expect(mPose(1.65).lid).toBeGreaterThan(12);
    expect(Math.abs(mPose(2.02).jaw)).toBeGreaterThan(2);
    expect(mPose(3.02).ear).toBeGreaterThan(20);
    expect(mPose(3.8).bub).toBe(true);
    expect(mPose(4.4).y).toBeLessThan(0); // the tiny lift before he ducks
    expect(mPose(4.8).y).toBeGreaterThan(100);
    expect(mPose(5.0).puff).toBeGreaterThan(0);
    expect(snowChunks(0.9)[0].y).toBeGreaterThan(snowChunks(0.1)[0].y);
  });

  it('comes up on two bumps into the top berm, never for a bump into a truck or sideways', () => {
    expect(isTopBermBump('v', -1, 'wall')).toBe(true);
    expect(isTopBermBump('v', 1, 'wall')).toBe(false);
    expect(isTopBermBump('h', -1, 'wall')).toBe(false);
    expect(isTopBermBump('v', -1, 'truck')).toBe(false);
    expect(isTopBermBump('v', -1, 'tank')).toBe(false);
  });

  it('never rises through a gate: in every Duvernay level he picks a top column with no gate', () => {
    for (const l of REGIONS.find((r) => r.id === 'duvernay')!.levels) {
      const col = mooseColumn(l.gates);
      const top = l.gates.filter((g) => g.side === 'top').map((g) => g.index);
      if (top.length < 6) expect(top, l.id).not.toContain(col);
    }
    expect(mooseColumn([])).toBe(1);
  });

  it('SAME START, SAME END: on his first and last frames he is right down behind the berm, out of sight', () => {
    // y is how far down he is, in his drawing's units: 0 is fully up, 100 or more is below the berm's line.
    expect(mPose(0).y).toBeGreaterThanOrEqual(100);
    expect(mPose(M_END).y).toBeGreaterThanOrEqual(100);
    expect(mPose(2).y).toBe(0);
  });

  it('the log card is his stare', () => {
    expect(mooseStill()).toContain('class="moose-still"');
  });
});

describe('Wildlife Log: hints', () => {
  it('demo mode shows each gag hint; the game keeps them secret', () => {
    const [, worker, moose] = LOG_ENTRIES;
    expect(cardHint(worker, true)).toBe('Slide one truck into another.');
    expect(cardHint(moose, true)).toBe('In Duvernay, bump a truck into the top berm twice.');
    expect(cardHint(worker, false)).toBe(worker.riddle);
    expect(cardHint(moose, false)).not.toContain('berm');
  });
});
