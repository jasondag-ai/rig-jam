import { describe, expect, it } from 'vitest';
import { BackAndForth, GAG_RULES, GAG_TRIGGERS, IDLE_GAGS, SHARES, Wiggle, bearComes, bermBump, mustWait, wrongGateBump } from './gag-triggers.ts';
import { BEAR_BEATS, BEAR_END, bPose } from './bear.ts';
import { BUSH_X, COW_X, PORC_BUSH_X, bearBox, bushBox, cowBox, moundSpot } from './strip-gags.ts';
import { BUSH_BOX, BUSH_FRAC, bushMarkup } from './gag-bush.ts';
import { LUNCH_BEATS, LUNCH_END, MOUND_DRAWN, lunchPose, moundWidthFor } from './gopher-lunch.ts';
import { PC_BEATS, PC_END, SHIFT, pcPose } from './porcupine.ts';
import { SAM, SAM_BEATS, SAM_END, backGlove, samPose } from './sam.ts';
import { BUDDY, BUDDY_FAR, BUDDY_STOP, STAND, TONGUE_BEATS, TONGUE_END, tonguePose } from './frozen-tongue.ts';
import { RISER_X, riserBox, riserHeight } from './strip-gags.ts';
import { treeArt } from './trees.ts';
import { cooldownScale, eggOff } from './flags.ts';
import { BULL_BEATS, BULL_END, COW_REST, SHIFT as PRIMP_SHIFT, T_BACK, T_GRAZE, T_HOME, bullPose } from './bull.ts';
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
    // (A's last beat is the game's: the indicator clicks back to the green it began with.)
    expect(A_BEATS.map((b) => b[0])).toEqual([0, 0.3, 0.5, 0.75, 1.7, 1.95, 2.3, 2.7, 3.1, 3.55, 4.5, 5.0]);
    expect(B_BEATS.map((b) => b[0])).toEqual([0, 0.3, 0.5, 0.8, 1.1, 1.4, 2.9, 8.9, 9.2]);
    expect(A_END).toBeGreaterThan(5.0);
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

describe('the bear and the hare (legendary)', () => {
  it('is set off by three taps on his bush, on any Duvernay level: one time in three he comes (every time in demo mode)', () => {
    expect(GAG_TRIGGERS.bear).toEqual({ region: 'duvernay', bushTaps: 3, chance: 1 / 3 });
    expect(bearComes(false, () => 0.2)).toBe(true);
    expect(bearComes(false, () => 0.5)).toBe(false);
    expect(bearComes(true, () => 0.99)).toBe(true);
  });
  it('plays the reference beats: in on all fours, sits, strains, snatch, the long look, the wipe, set down, strolls off; the hare trudges back', () => {
    expect(BEAR_BEATS.map((b) => b[0])).toEqual([0, 0.2, 3.0, 3.5, 4.0, 4.8, 6.4, 6.9, 7.4, 7.9, 8.9, 9.15, 10.7, 11.3, 12.0, 12.4, 14.4, 15.8]);
    expect(BEAR_END).toBeGreaterThanOrEqual(15.8);
    expect(bPose(0)).toMatchObject({ mode: 'walk', x: -400, hare: 'bush' });
    expect(bPose(0, -700).x).toBe(-700);
    expect(bPose(4.4).mode).toBe('sit');
    expect(bPose(5.5).sweat).toBeGreaterThanOrEqual(0);
    expect(bPose(7.7).hare).toBe('paw');
    expect(bPose(8.8).hShock).toBeCloseTo(1, 1);
    expect(bPose(9.5)).toMatchObject({ wipeLines: true, hare: 'paw' });
    expect(bPose(12.2)).toMatchObject({ hare: 'ground', hViolated: true });
    expect(bPose(12.2).cloud).toBeGreaterThan(0);
    expect(bPose(13).mode).toBe('walk');
    expect(bPose(15.39, -400, 900).x).toBeGreaterThan(880);
    expect(bPose(15.5).mode).toBe('gone');
    expect(bPose(15).hare).toBe('back');
    expect(bPose(15.9).hareShow).toBe(false);
  });

  it('his bush stands right of the biffy with room for him to sit between them', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }]] as const) {
      const bear = bearBox(w, strip), biffy = biffyBox(w, strip);
      expect(bear.x).toBeGreaterThan(biffy.x + biffy.width);
      expect(bear.x + bear.width).toBeLessThan(w);
      expect(BUSH_X * w).toBeLessThan(bear.x + bear.width);
    }
  });
});

describe('the bull and the cow', () => {
  it('is set off by one tap on the cow, in Montney', () => {
    expect(GAG_TRIGGERS.bull).toEqual({ region: 'montney', cowTaps: 1 });
  });

  it('plays the reference beats, the primp between the freeze and the hearts, then the cow comes home', () => {
    expect(PRIMP_SHIFT).toBe(1.6);
    expect(BULL_BEATS.map((b) => b[0]).slice(0, 14)).toEqual([0, 0.3, 2.4, 2.8, 3.3, 3.9, 4.4, 6.0, 6.5, 6.9, 7.2, 8.2, 8.5, 10.6]);
    expect(BULL_BEATS.slice(14).map((b) => b[0])).toEqual([T_BACK, T_HOME, T_GRAZE]);
    expect(T_BACK).toBeGreaterThan(9.9 + PRIMP_SHIFT); // after the last heart has popped
    expect(BULL_END).toBeGreaterThan(T_GRAZE);
  });

  it('the bull: in from off screen, primps (licks a hoof, a stretched leg slicks his forelock, chest out with a sparkle), hearts, waggle, snort, paws, charges', () => {
    expect(bullPose(0).b.x).toBe(-420);
    expect(bullPose(0, -900).b.x).toBe(-900);
    expect(bullPose(2.6).b).toMatchObject({ x: 0, hearts: 0 });
    expect(bullPose(2.6).b.primp).toBeUndefined();
    // Lick: the leg comes up to his mouth, the tongue flicks.
    expect(bullPose(3.1).b.primp.leg).toBeLessThan(-100);
    expect([2.85, 2.9, 3.0, 3.1, 3.2].some((t) => bullPose(t).b.primp.tongue)).toBe(true);
    // Slick: the leg stretches (1.55x) right up; the forelock is slicked from 3.6 and stays so.
    expect(bullPose(3.5).b.primp).toMatchObject({ stretch: 1.55, slick: false });
    expect(bullPose(3.7).b.primp.slick).toBe(true);
    expect(bullPose(4.3).b.primp).toMatchObject({ slick: true, shine: true });
    expect(bullPose(4.3).b.primp.puff).toBeGreaterThan(0.8);
    // Then the reference as it was, 1.6 s later.
    expect(bullPose(3.6 + PRIMP_SHIFT).b.hearts).toBe(1);
    expect(bullPose(6.3 + PRIMP_SHIFT).b.snort).toBeGreaterThan(0);
    expect(bullPose(6.75 + PRIMP_SHIFT).b.scrape).not.toBe(0);
    expect(bullPose(8 + PRIMP_SHIFT).b).toMatchObject({ gallop: true, hearts: 2 });
    expect(bullPose(9.19 + PRIMP_SHIFT, -420, 520, 800).b.x).toBeGreaterThan(790);
    // He stays gone.
    for (const t of [9.3 + PRIMP_SHIFT, T_BACK + 1, BULL_END]) expect(bullPose(t).b.show).toBe(false);
  });

  it('the cow: grazes through the primp, looks up, eyes huge, hop-turns (never paper-thin) and bolts', () => {
    expect(bullPose(4).c).toMatchObject({ head: -32, face: -1, x: 0 });
    expect(bullPose(5.2 + PRIMP_SHIFT).c.eye).toBeCloseTo(7.6);
    for (let t = 5.3; t < 5.6; t += 0.02) expect(Math.abs(bullPose(t + PRIMP_SHIFT).c.face)).toBeGreaterThanOrEqual(0.8);
    expect(bullPose(7 + PRIMP_SHIFT).c).toMatchObject({ gallop: true, face: 1 });
    expect(bullPose(7.79 + PRIMP_SHIFT, -420, 700).c.x).toBeGreaterThan(690);
    expect(bullPose(7.9 + PRIMP_SHIFT).c.show).toBe(false);
  });

  it('SAME START, SAME END: she wanders back in from the edge she left by, out of breath, and grazes again in her spot', () => {
    // Off the same edge she bolted to, walking (not galloping), facing the way she goes.
    const back = bullPose(T_BACK, -420, 700);
    expect(back.c).toMatchObject({ show: true, face: -1, gallop: false });
    expect(back.c.x).toBeCloseTo(700);
    expect(bullPose(T_BACK + 1.5, -420, 700).c.x).toBeLessThan(500);
    expect(bullPose(T_BACK + 1.5, -420, 700).breath).toBeGreaterThanOrEqual(0); // puffing
    expect(bullPose(T_HOME, -420, 700).c.x).toBe(0);
    expect(bullPose(T_HOME + 0.2).c.sy).not.toBe(1); // sides heaving
    // The first frame and the last frame are the cow exactly as she stands at rest.
    expect(bullPose(0).c).toEqual(COW_REST);
    expect(bullPose(BULL_END).c).toEqual(COW_REST);
    expect(bullPose(BULL_END).breath).toBe(-1);
  });

  it('she grazes right of the biffy, with room for the bull to stop between them', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }]] as const) {
      const cow = cowBox(w, strip), biffy = biffyBox(w, strip);
      expect(cow.x + cow.width).toBeLessThanOrEqual(w);
      expect(COW_X * w).toBeGreaterThan(biffy.x + biffy.width + 60);
    }
  });
});

describe('gag rules and the gag bush', () => {
  it('gags play at the same time; only gags that share a character or a prop wait for each other', () => {
    // Every gag has an entry.
    expect(Object.keys(SHARES).sort()).toEqual(['bear', 'biffyA', 'biffyB', 'bull', 'geese', 'gopherLunch', 'landowner', 'magpie', 'marshmallow', 'moose', 'nearMiss', 'porcupine', 'sam', 'tongue', 'worker']);
    // The two biffy gags share the biffy; the two gopher gags share the gopher.
    expect(mustWait('biffyB', ['biffyA'])).toBe(true);
    expect(mustWait('biffyA', ['biffyB'])).toBe(true);
    expect(mustWait('gopherLunch', ['nearMiss'])).toBe(true);
    expect(mustWait('nearMiss', ['gopherLunch'])).toBe(true);
    // The worker in red is one man.
    expect(mustWait('marshmallow', ['worker'])).toBe(true);
    expect(mustWait('gopherLunch', ['porcupine'])).toBe(true);
    // Everything else plays right away, whatever is on.
    expect(mustWait('landowner', ['biffyA', 'geese', 'magpie'])).toBe(false);
    expect(mustWait('geese', ['landowner'])).toBe(false);
    expect(mustWait('sam', ['worker', 'biffyB', 'nearMiss'])).toBe(false);
    expect(mustWait('biffyA', ['sam', 'geese', 'gopherLunch'])).toBe(false);
    expect(mustWait('bear', [])).toBe(false);
    // And never two of the same.
    expect(mustWait('geese', ['geese'])).toBe(true);
  });

  it('the idle gags still take turns, with a cooldown between them; tests can scale it and leave gags out', () => {
    expect(IDLE_GAGS).toEqual(['magpie', 'worker', 'gopherLunch', 'tongue']);
    expect(GAG_RULES.idleCooldownMs).toBe(60_000);
    expect(cooldownScale('')).toBe(1);
    expect(cooldownScale('?cooldown=0')).toBe(0);
    expect(cooldownScale('?cooldown=0.05')).toBe(0.05);
    expect(cooldownScale('?cooldown=x')).toBe(1);
    expect(eggOff('lunch', '?off=lunch,porcupine')).toBe(true);
    expect(eggOff('lunch', '')).toBe(false);
  });

  it("the landowner's fast wiggle: four reversals inside one drag, all within two seconds", () => {
    expect(GAG_TRIGGERS.landowner).toEqual({ backAndForth: 4, wiggle: { reversals: 4, withinMs: 2000 } });
    const w = new Wiggle();
    w.start();
    expect([0, 300, 600].map((t) => w.reversal(t))).toEqual([false, false, false]);
    expect(w.reversal(900)).toBe(true);
    // Too slow: the early ones have dropped out of the window.
    w.start();
    expect([0, 900, 1800, 2700, 3600].map((t) => w.reversal(t))).toEqual([false, false, false, false, false]);
    // Lifting the finger starts the count again.
    w.start();
    expect([0, 100, 200].map((t) => w.reversal(t))).toEqual([false, false, false]);
    w.start();
    expect(w.reversal(300)).toBe(false);
  });
  it("BUSH RULE: the gag bush is the board's own willow drawing; in winter it keeps its leaves under a snow dusting", () => {
    const board = treeArt('willow', 'summer', 2);
    expect(bushMarkup('summer')).toContain(board);
    expect(bushMarkup('winter')).toContain(board);
    expect(bushMarkup('summer')).not.toContain('#ffffff');
    expect((bushMarkup('winter').match(/fill="#ffffff"/g) ?? []).length).toBe(4);
    expect(bushMarkup('spring')).toContain(treeArt('willow', 'spring', 2));
    // About the size of the references' bush (62 px of leaves at 390).
    expect((BUSH_FRAC * 390 * 76) / BUSH_BOX.vw).toBeGreaterThan(60);
    expect((BUSH_FRAC * 390 * 76) / BUSH_BOX.vw).toBeLessThan(72);
  });
});

describe('the porcupine (gag 12)', () => {
  it('is set off by three taps on the Cardium bush (the same pattern as the bear)', () => {
    expect(GAG_TRIGGERS.porcupine).toEqual({ region: 'cardium', bushTaps: 3 });
  });

  it('plays the reference with its clock started at SHIFT: the porcupine is behind the bush from the first frame', () => {
    expect(SHIFT).toBe(2.4);
    expect(PC_BEATS.map((b) => b[0])).toEqual([0, 1.0, 3.0, 3.7, 5.1, 5.2, 5.5, 5.6, 5.8]);
    for (let t = 0; t < 5.5; t += 0.25) expect(pcPose(t + SHIFT).pc).toMatchObject({ x: 0, show: true });
    // The worker: not there, strolls in, looks about, squats behind the bush, POKE.
    expect(pcPose(0.5 + SHIFT).w.show).toBe(false);
    expect(pcPose(1.0 + SHIFT, -700).w.x).toBe(-700);
    expect(pcPose(3.3 + SHIFT).w).toMatchObject({ x: -98, behind: false });
    expect(pcPose(4.8 + SHIFT).w).toMatchObject({ behind: true, roll: 'none' });
    expect(pcPose(4.8 + SHIFT).w.y).toBeGreaterThan(13);
    expect(pcPose(5.2 + SHIFT).w.starburst).toBeGreaterThan(0);
    expect(pcPose(5.2 + SHIFT).w.hatY).toBeLessThan(-5);
    // Then the shuffler off one way and the porcupine, quills up, off the other.
    expect(pcPose(6 + SHIFT).w.show).toBe(false);
    expect(pcPose(6 + SHIFT).s).toMatchObject({ show: true });
    expect(pcPose(7.89 + SHIFT, -320, -900).s.x).toBeLessThan(-880);
    expect(pcPose(6.5 + SHIFT).pc).toMatchObject({ face: 1, puff: 1 });
    expect(pcPose(7.59 + SHIFT, -320, -300, 800).pc.x).toBeGreaterThan(780);
    expect(pcPose(PC_END + SHIFT).pc.show).toBe(false);
    expect(pcPose(PC_END + SHIFT).s.show).toBe(false);
  });

  it('its bush stands between the biffy and the mound', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }]] as const) {
      const bush = bushBox(PORC_BUSH_X, w, strip), biffy = biffyBox(w, strip);
      expect(bush.x).toBeGreaterThan(biffy.x + biffy.width);
      expect(bush.x + bush.width).toBeLessThan(w * 0.66);
    }
  });
});

describe('gopher lunch (gag 13)', () => {
  it('is set off by 30 s with no moves, in Cardium', () => {
    expect(GAG_TRIGGERS.gopherLunch).toEqual({ region: 'cardium', idleMs: 30_000 });
  });

  it('plays the reference beats, ending as it began: he boils over, hurls the crust down the hole and stomps off; a last burp; the quiet mound', () => {
    expect(LUNCH_BEATS.map((b) => b[0])).toEqual([0, 0.5, 3.0, 4.0, 4.8, 5.2, 5.7, 6.9, 7.2, 8.6, 9.6, 10.3, 10.8, 11.5, 12.0, 12.8, 13.6, 14.3, 15.0, 16.2]);
    expect(lunchPose(0.4).w.show).toBe(false);
    expect(lunchPose(0.5, -640).w.dx).toBe(-640);
    expect(lunchPose(3.5).w.face).toBe(-1);
    expect(lunchPose(4.3).food).toBe('hand');
    expect(lunchPose(5).w.phone).toBe(true);
    expect(lunchPose(5).food).toBe('ground');
    expect(lunchPose(6.8).a).toMatchObject({ show: true, k: 1, grab: true });
    expect(lunchPose(7).food).toBe('paw');
    expect(lunchPose(8).food).toBe('gone');
    expect(lunchPose(9.3).food).toBe('crust');
    expect(lunchPose(10.5).food).toBe('crustHand');
    expect(lunchPose(11.2).g).toMatchObject({ dy: 24, cheeks: true });
    expect(lunchPose(11.8).g.dy).toBe(80);
    // Boils over (red face, steam), up on his feet, the crust goes down the hole, and he stomps off to wherever the edge is.
    expect(lunchPose(13.2).w).toMatchObject({ steam: true, blush: 1 });
    expect(Math.abs(lunchPose(13.59).w.y)).toBeLessThan(0.5);
    expect(lunchPose(14).food).toBe('thrown');
    expect(lunchPose(14.5).food).toBe('gone');
    expect(lunchPose(16.59, -300, -700).w.dx).toBeLessThan(-690);
    expect(lunchPose(16.6).w.show).toBe(false);
    // The gopher's last word, then SAME START, SAME END: nobody there, the gopher down his hole, no food.
    expect(lunchPose(15.6).g.burp).toBe(true);
    const start = lunchPose(0.2), end = lunchPose(LUNCH_END);
    expect(end.w.show).toBe(false);
    expect(end.g.dy).toBe(start.g.dy);
    expect(end.a.show).toBe(false);
    expect(end.food).toBe('gone');
  });
  it("the board's mound is set on the strip's ground line with its heap the size of the reference's", () => {
    const strip = { top: 600, bottom: 700 };
    const spot = moundSpot(390, strip);
    expect(spot.baseY).toBe(stripGeom(390, strip).ground);
    expect((spot.w * MOUND_DRAWN) / 64).toBeCloseTo(0.113 * 390 * 0.92, 1);
    expect(moundWidthFor(390, 0.5)).toBeCloseTo(spot.w / 2, 5);
  });
});

describe('Safety Sam (gag 14)', () => {
  it('is set off by three blocked moves in a row, or one push at a wrong-colour gate', () => {
    expect(GAG_TRIGGERS.sam).toEqual({ bumpsInARow: 3, wrongGate: true });
    const gates = [{ color: 'red', side: 'right', index: 2 }, { color: 'blue', side: 'top', index: 4 }];
    const red = { orient: 'h' as const, row: 2, col: 1, color: 'red' }, green = { orient: 'h' as const, row: 2, col: 1, color: 'green' }, up = { orient: 'v' as const, row: 1, col: 4, color: 'green' };
    expect(wrongGateBump(green, 1, 'wall', gates)).toBe(true); // a green truck pushed at the red gate
    expect(wrongGateBump(red, 1, 'wall', gates)).toBe(false); // its own gate
    expect(wrongGateBump(green, -1, 'wall', gates)).toBe(false); // plain berm on that side
    expect(wrongGateBump(green, 1, 'truck', gates)).toBe(false); // it ran into a truck, not the gate
    expect(wrongGateBump(up, -1, 'wall', gates)).toBe(true);
    expect(wrongGateBump(up, 1, 'wall', gates)).toBe(false);
  });

  it("is the worker's build in the safety advisor's kit: white hat, navy, hi-vis vest, moustache, clipboard", () => {
    expect(SAM).toContain('#35507a'); // navy
    expect(SAM).toContain('#c9e24a'); // vest
    expect(SAM).toContain('#f3f5f7'); // white hat
    expect(SAM).not.toContain('#c8352b'); // no red coveralls left
    expect(SAM).toContain('M60 46 Q63 41.5 69 42.5'); // the moustache
    expect(SAM).toContain('class="clipboard"');
    expect(SAM.startsWith('<g class="flip">')).toBe(true); // no pail, no long reach
  });

  it('plays the reference beats: march in, look up, tsk, scribble, SEE ME, fingers to eyes, point, back off', () => {
    expect(SAM_BEATS.map((b) => b[0])).toEqual([0, 0.3, 2.0, 2.5, 3.8, 5.2, 6.5, 7.1, 7.8]);
    expect(samPose(0.2).w.show).toBe(false);
    expect(samPose(0.3, -700).w.dx).toBe(-700);
    expect(samPose(3).w.tsk).toBe(true);
    expect(samPose(4.5).w.board).toBe('write');
    expect(samPose(5.8).w.board).toBe('show');
    expect(samPose(6.9).w).toMatchObject({ vee: true, pen: false });
    expect(samPose(6.9).w.arF).toBeLessThan(-140);
    expect(samPose(7.5).w.arF).toBeCloseTo(-95);
    // Backing off: still pointing, moving left, to wherever the edge is.
    expect(samPose(9).w).toMatchObject({ vee: true, arF: -95 });
    expect(samPose(10.59, -260, -900).w.dx).toBeLessThan(-880);
    expect(samPose(SAM_END).w.show).toBe(false);
    // His back glove (where the clipboard hangs) by arithmetic: straight down at rest, forward when raised.
    expect(backGlove({ arB: 0, foB: 0, rot: 0, x: 0, y: 0 })).toEqual({ x: 52, y: 81 });
    expect(backGlove(samPose(5.8).w).x).toBeGreaterThan(60);
  });
});

describe('the frozen tongue (gag 15)', () => {
  it('is set off by 30 s with no moves, on winter levels', () => {
    expect(GAG_TRIGGERS.tongue).toEqual({ theme: 'winter', idleMs: 30_000 });
  });

  it('plays the reference beats, ending as it began: the buddy comes back with hot coffee, THWIP, and both walk off their own ways', () => {
    expect(TONGUE_BEATS.map((b) => b[0])).toEqual([0, 0.3, 2.2, 2.7, 3.0, 3.3, 3.5, 5.0, 5.6, 7.0, 7.4, 7.9, 8.1, 8.6, 9.6, 11.0, 12.2, 13.4, 13.7, 14.6, 14.8, 15.4, 17.5]);
    const at = (t: number) => tonguePose(t);
    expect(at(0.2).w.show).toBe(false);
    expect(tonguePose(0.3, -640).w.dx).toBe(-640);
    expect(at(2.5).w.dx).toBe(STAND);
    expect(at(2.9).tongue).toBe(0);
    expect(at(3.4).tongue).toBe(1);
    expect(at(4).w.arF).toBeLessThan(-70); // flailing
    expect(at(5.5).bubble).toBe(true);
    expect(at(6.5).bubble).toBe(false);
    // The buddy: in from the left, stops short of him, photo with a flash, cracks up, hop-turns and leaves.
    expect(at(5).b.show).toBe(false);
    expect(at(7.2).b.dx).toBe(BUDDY_STOP);
    expect(at(8).flash).toBeGreaterThan(0);
    expect(at(8).b.phone).toBe(true);
    expect(at(10.5).b.face).toBe(-1);
    expect(tonguePose(11.19, -300, -800).b.dx).toBeLessThan(-780);
    expect(at(11.5).flake).toBeGreaterThan(0);
    // He comes back from the FAR side with a thermos, pours, and the tongue comes free.
    expect(tonguePose(12.2, -300, -330, BUDDY_STOP, 700).b).toMatchObject({ show: true, dx: 700, thermos: true, face: -1 });
    expect(at(13.5).b.dx).toBe(BUDDY_FAR);
    expect(at(14.2).pour).toBeGreaterThan(0.6);
    expect(at(14.5).tongue).toBe(1);
    expect(at(14.7).thwip).toBeGreaterThan(0);
    expect(at(15).tongue).toBe(0);
    // Both hop-turn and walk off their own ways: he to the left, the buddy to the right.
    expect(at(16).w.face).toBe(-1);
    expect(at(16).b.face).toBe(1);
    expect(tonguePose(17.59, -300, -900).w.dx).toBeLessThan(-880);
    expect(tonguePose(17.59, -300, -330, BUDDY_STOP, 330, 900).b.dx).toBeGreaterThan(880);
    // SAME START, SAME END: the empty riser.
    expect(at(TONGUE_END).w.show).toBe(false);
    expect(at(TONGUE_END).b.show).toBe(false);
    expect(at(TONGUE_END).tongue).toBe(0);
  });
  it('his buddy is the same build in blue with an orange hat, clean shaven', () => {
    expect(BUDDY).toContain('#4f7fb0');
    expect(BUDDY).toContain('#f08a2a');
    expect(BUDDY).not.toContain('#c8352b');
    expect(BUDDY).not.toContain('M48 39 Q50 54 64 54'); // no beard
  });

  it('the riser stands between the biffy and the bear\'s bush, with room on both sides for the two of them', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }], [430, { top: 660, bottom: 780 }]] as const) {
      const sc = stripGeom(w, strip).scale, u = (0.19 * sc * w) / 120, x = RISER_X * w;
      const biffy = biffyBox(w, strip);
      // The stuck worker stands clear of the biffy; the buddy's far spot is short of the bush; the riser itself is between them.
      expect(x + (STAND - 5 - 18) * u).toBeGreaterThan(biffy.x + biffy.width - 2);
      expect(x + (BUDDY_FAR + 18) * u).toBeLessThan(BUSH_X * w - 0.09 * sc * w + 2);
      expect(riserBox(w, strip).x).toBeLessThan(x - 40 * sc);
      // About the worker's height, and inside a full strip.
      expect(riserHeight(w, strip)).toBeLessThan(strip.bottom - strip.top);
    }
  });
});
