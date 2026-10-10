import { describe, expect, it } from 'vitest';
import { BackAndForth, Chances, GAG_TRIGGERS, SHARES, Wiggle, bearComes, bermBump, lunchComes, mustWait, rollComes, wrongGateBump } from './gag-triggers.ts';
import { BEAR_BEATS, BEAR_END, bPose } from './bear.ts';
import { BUSH_X, COW_X, PORC_BUSH_X, bearBox, bushBox, cowBox, moundSpot } from './strip-gags.ts';
import { STAGE, propBack, propLine, signStand as signStandLine } from './strip-gags.ts';
import { LANE_UP } from './scenery.ts';
import { BUSH_BOX, BUSH_FRAC, bushMarkup } from './gag-bush.ts';
import { LUNCH_BEATS, LUNCH_END, MOUND_DRAWN, lunchPose, moundWidthFor } from './gopher-lunch.ts';
import { PC_BEATS, PC_BOLT, PC_BOLT_END, PC_END, SHIFT, pcPose } from './porcupine.ts';
import { SAM, SAM_BEATS, SAM_END, backGlove, samPose } from './sam.ts';
import { BUDDY, BUDDY_FAR, BUDDY_STOP, STAND, TONGUE_BEATS, TONGUE_END, tonguePose } from './frozen-tongue.ts';
import { RISER_TAP, RISER_X, riserBox, riserHeight } from './strip-gags.ts';
import { treeArt } from './trees.ts';
import { eggOff, lunchAlways, lunchNever, rollPinned } from './flags.ts';
import { DEER_BEATS, DEER_END, DEER_STOP, SURVEY_BEATS, SURVEY_END, SURVEY_LINES, TRI_AT, T_PICKUP, T_PLANT, TOUR_BEATS, TOUR_END, TOUR_HER, TOUR_HIM, deerPose, heldTripod, surveyPose, tourPose } from './sign-gags.ts';
import { BULL_BEATS, BULL_END, COW_REST, SHIFT as PRIMP_SHIFT, T_BACK, T_GRAZE, T_HOME, bullPose } from './bull.ts';
import { A_BEATS, A_END, A_SHAKE, BIFFY_SIZE, B_BEATS, B_END, B_OFF, B_OUT, B_ROLL_OFF, B_SHAKE, B_SHUT, biffy } from './biffy.ts';
import { L_BEATS, L_END, lPose } from './landowner.ts';
import { N_BEATS, N_END, nPose } from './near-miss.ts';
import { BIFFY_GAP, BIFFY_X, SIGN_X, biffyBox, biffyLane, biffyStand, signLane, signStand, stripGeom } from './strip-gags.ts';
import { workerSpot } from './worker.ts';
import { G_BEATS, G_END, leadX } from './geese.ts';
import { MM_BEATS, MM_END, handPos, mmPose } from './marshmallow.ts';

describe('gag triggers: one settings file for every gag', () => {
  it('holds every gag, with the placeholder values', () => {
    expect(Object.keys(GAG_TRIGGERS).slice(0, 9)).toEqual(['magpie', 'worker', 'moose', 'nearMiss', 'landowner', 'biffyA', 'biffyB', 'marshmallow', 'geese']);
    expect(GAG_TRIGGERS.marshmallow.flareTaps).toBe(3);
    expect(GAG_TRIGGERS.geese.undosInARow).toBe(3);
    // No gag comes from waiting: the magpie on a truck tapped (not dragged), the worker on a truck sliding into a truck, each 1 in 2.
    expect(GAG_TRIGGERS.magpie).toEqual({ truckTap: true, chance: 1 / 2 });
    expect(GAG_TRIGGERS.worker).toEqual({ truckBump: true, chance: 1 / 2 });
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

  it("the biffy gags keep the reference timing, but for B's shorter way out by the near edge", () => {
    // (A's last beat is the game's: the indicator clicks back to the green it began with.)
    expect(A_BEATS.map((b) => b[0])).toEqual([0, 0.3, 0.5, 0.75, 1.7, 1.95, 2.3, 2.7, 3.1, 3.55, 4.5, 5.0]);
    // B (Jay's approved version, Oct 8): two bumps, so it shakes from the start; the roll is gone by 2.0; his glove
    // pats the floor once, pauses, pats twice in a panic and whips back in; he comes out of the dark at B_OUT and
    // shuffles straight off the near edge, slower than the reference's pace (about 57 px a second at 390), on
    // screen for a good 2 s.
    expect(B_BEATS.map((b) => b[0])).toEqual([0, 0.05, 0.5, 0.8, 1.1, 1.4, 1.95, 2.85, 3.3, B_OUT, B_OUT + 0.4, B_OFF, B_SHUT]);
    expect(B_BEATS.map((b) => b[1])).toEqual(['sits', 'jolt', 'door-open', 'roll-out', 'roll-away', 'reach', 'pause', 'panic', 'withdraw', 'out', 'chase', 'off-screen', 'door-shut']);
    expect((BIFFY_X * 390 + 70) / (B_OFF - B_OUT)).toBeLessThan((0.7 * 390 + 70) / 6);
    expect(B_OFF - B_OUT).toBeGreaterThan(2);
    expect(B_ROLL_OFF).toBeLessThan(B_OUT);
    expect(B_ROLL_OFF).toBeLessThan(B_OFF);
    expect(A_END).toBeGreaterThan(5.0);
    expect(B_END).toBeGreaterThan(B_SHUT + 0.9);
  });

  it('the truck shakes the biffy before the door opens: a small shake for A, a bigger one for B', () => {
    expect(B_SHAKE.px).toBeGreaterThan(A_SHAKE.px * 1.5);
    expect(B_SHAKE.deg).toBeGreaterThan(A_SHAKE.deg * 1.5);
  });

  it("A's occupant has no cheek blush: his whole face flushes", () => {
    const art = biffy(true);
    expect(art).not.toContain('#f08c80');
    expect(art.match(/class="skin"/g)?.length).toBe(3);
  });
});

describe('the bottom strip: the permanent biffy', () => {
  it('is about 60 px tall at 390 (a fifth smaller than the reference) and stands in the corner, right up at the berm', () => {
    const strip = { top: 548, bottom: 730 };
    const g = biffyStand(390, strip);
    expect(g.scale).toBe(1);
    expect(BIFFY_SIZE).toBe(0.8);
    const tall = g.width * (126 / 100);
    expect(tall).toBeGreaterThan(55);
    expect(tall).toBeLessThan(66);
    // Its roof is BIFFY_GAP below the berm's foot: close to the berm, never on it.
    expect(g.ground - tall).toBeCloseTo(strip.top + BIFFY_GAP, 6);
    expect(BIFFY_GAP).toBe(2);
    expect(BIFFY_X).toBe(0.08);
    // In the corner, but wholly on screen at every width.
    for (const w of [375, 390, 430]) expect(biffyBox(w, strip).x).toBeGreaterThan(4);
    expect(g.ground).toBeLessThan(stripGeom(390, strip).ground - 40);
  });

  it('is drawn smaller on a short strip (375 px), still off the lease and above the tip line', () => {
    const strip = { top: 428, bottom: 496 };
    const g = biffyStand(375, strip);
    expect(g.scale).toBeLessThan(1);
    expect(g.ground - g.width * 1.26).toBeGreaterThanOrEqual(strip.top + BIFFY_GAP);
    expect(g.ground).toBeLessThanOrEqual(strip.bottom);
  });

  it("stands above the sleepy worker's clearing where the strip is tall enough for both", () => {
    for (const [w, strip] of [[390, { top: 548, bottom: 730 }], [430, { top: 612, bottom: 810 }]] as const) {
      const box = biffyBox(w, strip);
      const worker = workerSpot(w, strip)!;
      // (The box runs from the biffy's left side to a door's width past its right: the door swings open that way.)
      expect(box.x).toBeLessThan(BIFFY_X * w);
      expect(box.x + box.width).toBeGreaterThan(BIFFY_X * w + box.width / 4);
      // Both are in the corner: the biffy up at the berm, the worker down by the tip line.
      expect(box.y + box.height).toBeLessThan(worker.clearing.y);
    }
  });

  it('keeps a lane clear of trees from the biffy to the screen edge nearest it, for the roll and the shuffler', () => {
    const strip = { top: 548, bottom: 730 };
    const lane = biffyLane(390, strip);
    expect(lane.x).toBe(0);
    expect(lane.x + lane.width).toBeCloseTo(BIFFY_X * 390, 6);
    expect(lane.y + lane.height).toBeGreaterThanOrEqual(biffyStand(390, strip).ground);
    expect(lane.height).toBeGreaterThan(36);
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
    expect(Object.keys(SHARES).sort()).toEqual(['aurora', 'bale', 'bear', 'beaver', 'bell', 'biffyA', 'biffyB', 'bison', 'bull', 'catTrain', 'cloud', 'cold', 'cranes', 'deer', 'frogs', 'geese', 'golf', 'gopherLunch', 'hare', 'ice', 'landowner', 'magpie', 'marshmallow', 'moose', 'mosquito', 'muskeg', 'nearMiss', 'overweight', 'pdogs', 'pea', 'porcupine', 'sam', 'surveyor', 'tongue', 'tourists', 'tumbleweed', 'wash', 'worker']);
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

  it('NO GAG COMES FROM WAITING: no trigger but the night has an idle time, and nothing queues idle gags any more', () => {
    for (const [name, t] of Object.entries(GAG_TRIGGERS)) if (name !== 'night') expect('idleMs' in t, name).toBe(false);
    expect(GAG_TRIGGERS.night.idleMs).toBe(30_000);
    expect(rollPinned('bird', '?bird=1')).toBe(true);
    expect(rollPinned('nap', '?nap=0')).toBe(false);
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
    expect(PC_BEATS.map((b) => b[0])).toEqual([0, 1.0, 3.0, 3.7, 5.1, 5.2, 5.5, 5.8, 7.5, 7.8]);
    expect(PC_BEATS.at(-1)![1]).toBe('porcupine-bolts');
    expect(PC_BOLT - SHIFT).toBeCloseTo(7.8, 5);
    for (let t = 0; t < 5.5; t += 0.25) expect(pcPose(t + SHIFT).pc).toMatchObject({ x: 0, show: true });
    // The worker: not there, strolls in, looks about, squats behind the bush, POKE.
    expect(pcPose(0.5 + SHIFT).w.show).toBe(false);
    expect(pcPose(1.0 + SHIFT, -700).w.x).toBe(-700);
    expect(pcPose(3.3 + SHIFT).w).toMatchObject({ x: -98, behind: false });
    expect(pcPose(4.8 + SHIFT).w).toMatchObject({ behind: true, roll: 'none' });
    expect(pcPose(4.8 + SHIFT).w.y).toBeGreaterThan(13);
    expect(pcPose(5.2 + SHIFT).w.starburst).toBeGreaterThan(0);
    expect(pcPose(5.2 + SHIFT).w.hatY).toBeLessThan(-5);
    // Then the shuffler off one way; THE PORCUPINE WAITS behind the bush, quills up, until he has gone (Jay, Oct 8),
    // and only then bolts off the other way.
    expect(pcPose(6 + SHIFT).w.show).toBe(false);
    expect(pcPose(6 + SHIFT).s).toMatchObject({ show: true });
    expect(pcPose(7.89 + SHIFT, -320, -900).s.x).toBeLessThan(-880);
    for (let t = 5.5; t < 7.8; t += 0.25) expect(pcPose(t + SHIFT).pc).toMatchObject({ x: 0, show: true, puff: 1 });
    expect(pcPose(8.5 + SHIFT).pc).toMatchObject({ face: 1, puff: 1, show: true });
    expect(pcPose(8.5 + SHIFT).pc.x).toBeGreaterThan(0);
    expect(pcPose(PC_BOLT_END - 0.01, -320, -300, 800).pc.x).toBeGreaterThan(780);
    expect(PC_END).toBeGreaterThan(PC_BOLT_END - SHIFT);
    expect(pcPose(PC_END + SHIFT).pc.show).toBe(false);
    expect(pcPose(PC_END + SHIFT).s.show).toBe(false);
  });

  it('its bush stands right of the biffy and LEFT OF THE STAGE (nobody stops in front of it)', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }]] as const) {
      const bush = bushBox(PORC_BUSH_X, w, strip);
      expect(bush.x).toBeGreaterThan(BIFFY_X * w + biffyStand(w, strip).width / 2);
      // Sam stands at the middle, a worker's width wide: the bush is clear of him.
      expect(bush.x + bush.width).toBeLessThanOrEqual(w * 0.5 - (0.19 * stripGeom(w, strip).scale * w) / 2 + 1);
      expect(PORC_BUSH_X).toBeLessThan(STAGE.from);
    }
  });
});

describe('gopher lunch (gag 13)', () => {
  it('is set off by a press of Hint in Cardium, one time in two (always in demo mode); no longer an idle gag', () => {
    expect(GAG_TRIGGERS.gopherLunch).toEqual({ region: 'cardium', onHint: true, chance: 1 / 2 });
    expect(lunchComes(false, () => 0.49)).toBe(true);
    expect(lunchComes(false, () => 0.5)).toBe(false);
    expect(lunchComes(true, () => 0.99)).toBe(true);
    expect(lunchAlways('?lunch=1')).toBe(true);
    expect(lunchNever('?lunch=0')).toBe(true);
    expect(lunchAlways('')).toBe(false);
    expect(lunchNever('')).toBe(false);
  });

  it('plays the reference beats, ending as it began: he boils over, hurls the crust down the hole and stomps off; a last burp; the quiet mound', () => {
    expect(LUNCH_BEATS.map((b) => b[0])).toEqual([0, 0.5, 3.0, 4.0, 4.8, 5.2, 5.7, 6.9, 7.2, 8.6, 9.6, 10.3, 10.8, 11.5, 12.0, 12.8, 13.6, 14.3, 16.6, 17.7]);
    expect(lunchPose(0.4).w.show).toBe(false);
    // He walks in from the NEAR edge (the right), facing the way he walks, past the mound.
    expect(lunchPose(0.5, 640).w.dx).toBe(640);
    expect(lunchPose(1.5).w.face).toBe(-1);
    expect(lunchPose(1.5).w.dx).toBeGreaterThan(0);
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
    // A hop-turn, then off the way he came, facing the way he walks.
    expect(lunchPose(14.4).w.face).toBe(-1);
    expect(lunchPose(14.5).w.face).toBe(1);
    expect(lunchPose(16.99, 300, 700).w.dx).toBeGreaterThan(690);
    expect(lunchPose(16.99).w.face).toBe(1);
    expect(lunchPose(17.0).w.show).toBe(false);
    // The gopher's last word, then SAME START, SAME END: nobody there, the gopher down his hole, no food.
    expect(lunchPose(17.2).g.burp).toBe(true);
    const start = lunchPose(0.2), end = lunchPose(LUNCH_END);
    expect(end.w.show).toBe(false);
    expect(end.g.dy).toBe(start.g.dy);
    expect(end.a.show).toBe(false);
    expect(end.food).toBe('gone');
  });
  it("the board's mound stands on prop row 2, behind the walking lane, with its heap the size of the reference's", () => {
    const strip = { top: 600, bottom: 700 };
    const spot = moundSpot(390, strip);
    expect(spot.baseY).toBe(propLine(390, strip, 2));
    expect(spot.baseY).toBeLessThan(stripGeom(390, strip).ground - 6);
    expect((spot.w * MOUND_DRAWN) / 64).toBeCloseTo(0.13 * 390 * 0.92, 1);
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
    expect(GAG_TRIGGERS.tongue).toEqual({ theme: 'winter', riserTaps: 3 });
    expect(RISER_TAP).toBeGreaterThanOrEqual(44);
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

  it('the riser stands right of the biffy and left of the stage (clear of the sitting bear), with room on both sides for the two of them', () => {
    for (const [w, strip] of [[390, { top: 600, bottom: 700 }], [375, { top: 470, bottom: 538 }], [430, { top: 660, bottom: 780 }]] as const) {
      const sc = stripGeom(w, strip).scale, u = (0.19 * sc * w) / 120, x = RISER_X * w;
      const biffy = biffyBox(w, strip);
      // The stuck worker stands clear of the biffy; the buddy's far spot is short of the bush; the riser itself is between them.
      void biffy;
      expect(x + (STAND - 5 - 18) * u).toBeGreaterThan(BIFFY_X * w + biffyStand(w, strip).width / 2 - 2);
      expect(RISER_X).toBeLessThan(STAGE.from);
      expect(x + (BUDDY_FAR + 18) * u).toBeLessThan(BUSH_X * w - 0.09 * sc * w + 2);
      expect(riserBox(w, strip).x).toBeLessThan(x - 40 * sc);
      // About the worker's height, and inside a full strip.
      expect(riserHeight(w, strip)).toBeLessThan(strip.bottom - strip.top);
    }
  });
});

describe('the sign gags (16 to 18)', () => {
  it('triggers: the surveyor on Restart (1 in 2), the deer on a tap of the sign, the tourists on the first Daily Pad move (1 in 3); no deer or tourists in winter', () => {
    expect(GAG_TRIGGERS.surveyor).toEqual({ onRestart: true, chance: 1 / 2 });
    expect(GAG_TRIGGERS.deer).toEqual({ signTaps: 1, notThemes: ['winter'] });
    expect(GAG_TRIGGERS.tourists).toEqual({ firstDailyMove: true, chance: 1 / 3, notThemes: ['winter'] });
    expect(rollComes(1 / 2, false, () => 0.49)).toBe(true);
    expect(rollComes(1 / 2, false, () => 0.5)).toBe(false);
    expect(rollComes(1 / 3, false, () => 0.34)).toBe(false);
    expect(rollComes(1 / 3, true, () => 0.99)).toBe(true); // demo mode: every time
    expect(rollPinned('surveyor', '?surveyor=1')).toBe(true);
    expect(rollPinned('tourists', '?tourists=0')).toBe(false);
    expect(rollPinned('surveyor', '')).toBeNull();
    // The three share the sign: one at a time.
    expect(mustWait('deer', ['surveyor'])).toBe(true);
    expect(mustWait('tourists', ['deer'])).toBe(true);
    expect(mustWait('surveyor', ['biffyA', 'magpie'])).toBe(false);
  });

  it('the sign stands at one fixed spot on every level, right of the middle, clear of the biffy, with a lane to the near edge', () => {
    for (const [w, strip] of [[390, { top: 548, bottom: 730 }], [430, { top: 612, bottom: 810 }], [375, { top: 428, bottom: 496 }]] as const) {
      const biffy = biffyBox(w, strip), lane = signLane(w, strip), stand = signStand(w, strip);
      expect(SIGN_X).toBe(0.62);
      expect(lane.x).toBeGreaterThan(biffy.x + biffy.width);
      expect(lane.x + lane.width).toBe(w);
      expect(stand.ground).toBeLessThanOrEqual(stripGeom(w, strip).ground);
      expect(stand.ground).toBeGreaterThanOrEqual(biffyStand(w, strip).ground);
    }
  });

  it('the surveyor keeps the reference: three lines, the sign a metre over and back exactly where it was', () => {
    expect(SURVEY_BEATS.map((b) => b[0])).toEqual([0, 0.3, 2.3, 2.9, 4.0, 4.6, 5.2, 6.4, 6.8, 7.9, 8.9, 9.6, 10.4, 11.3, 12.0, 12.8, 13.4, 14.9]);
    expect(SURVEY_LINES.map((l) => l.text)).toEqual(['Off a metre.', 'Huh.', 'Perfect.']);
    expect(surveyPose(0.2).w.show).toBe(false);
    expect(surveyPose(0.3, 500).w.dx).toBe(-500);
    expect(surveyPose(5).say).toBe('Off a metre.');
    expect(surveyPose(8.5).sg.dx).toBe(-15);
    expect(surveyPose(6.7).sg.lift).toBeGreaterThan(10);
    expect(surveyPose(13).say).toBe('Perfect.');
    // SAME START, SAME END: the sign is back where it was, standing, and he is gone with his tripod.
    const end = surveyPose(SURVEY_END);
    expect(end.sg).toMatchObject({ dx: 0, lift: 0 });
    expect(end.w.show).toBe(false);
    expect(end.tri.mode).toBe('hidden');
    expect(surveyPose(16.89, 500).w.dx).toBeLessThan(-560);
  });

  it("the surveyor's tripod is part of his hand: it changes hands with the ground only where the two are the same", () => {
    // Carried in, folded, in his hand; unfolded only standing on its spot; folded again before he takes it.
    for (const t of [0.4, 1, 2, 2.4]) expect(surveyPose(t).tri).toMatchObject({ mode: 'hand', spread: 0 });
    for (const t of [T_PLANT, 3, 8, 14]) expect(surveyPose(t).tri.mode).toBe('stand');
    expect(surveyPose(T_PLANT).tri.spread).toBe(0);
    expect(surveyPose(4).tri.spread).toBe(1);
    expect(surveyPose(T_PICKUP - 0.01).tri.spread).toBe(0);
    for (const t of [T_PICKUP, 15, 16.5]) expect(surveyPose(t).tri.mode).toBe('hand');
    // The instant before it stands and the instant he has it again: upright, feet on the ground, on the spot.
    for (const t of [T_PLANT - 0.001, T_PICKUP]) {
      const p = surveyPose(t), at = heldTripod(p.w, p.tri.lean);
      expect(p.tri.lean).toBeCloseTo(0, 6);
      expect(p.w.rot).toBe(0);
      expect(at.x).toBeCloseTo(TRI_AT, 6);
      expect(at.foot).toBeCloseTo(0, 6);
    }
    // Carried, its feet are clear of the ground.
    expect(heldTripod(surveyPose(1.5).w, surveyPose(1.5).tri.lean).foot).toBeGreaterThan(4);
  });

  it("the back scratcher (Jay's revision): cheek and neck on the near post, never its rump", () => {
    // It stops SHORT of the sign, facing it (the reference walked past and backed its rump on).
    expect(DEER_STOP).toBeLessThan(-22.5 - 30);
    for (const t of [3.2, 4, 5, 6]) {
      const d = deerPose(t).d;
      expect(Math.abs(d.dx - DEER_STOP)).toBeLessThan(2);
      expect(d.head).toBeGreaterThan(10); // head lowered onto the sign's corner
    }
    expect(deerPose(4).d.tongue).toBe(true);
    expect(deerPose(4).d.lid).toBeGreaterThan(0.5);
    expect(deerPose(5.2).d.thump).toBeGreaterThan(0);
    expect(deerPose(4).rattle).not.toBe(0);
    // It ambles off PAST the sign (the far side), and the sign is still again.
    expect(deerPose(9.2, 330, 600).d.dx).toBeGreaterThan(560);
    const end = deerPose(DEER_END);
    expect(end.d.show).toBe(false);
    expect(end.rattle).toBe(0);
    expect(deerPose(0.2).d.show).toBe(false);
    expect(DEER_BEATS.at(-1)![1]).toBe('ambles-off');
  });

  it("the tourists (Jay's revision): she photographs him posing by the sign, then the mosquitoes", () => {
    // He stands by the sign, she a few steps back with the phone.
    expect(TOUR_HIM).toBeGreaterThan(TOUR_HER + 60);
    const pose = tourPose(3.45);
    expect(pose.m).toMatchObject({ face: -1, thumb: true }); // turned round to face her, thumbs up
    expect(pose.m.arB).toBeGreaterThan(60); // an elbow back on the sign
    expect(pose.h.face).toBe(1); // she faces him
    expect(pose.h.phone).toBe(true);
    expect(tourPose(3.55).flash).toBeGreaterThan(0);
    expect(tourPose(2.6).say).toBe('A real oil sign!');
    expect(tourPose(4.8).swarm).toMatchObject({ phase: 'rise' });
    expect(tourPose(6).swarm).toMatchObject({ phase: 'chase' });
    expect(tourPose(6).m.face).toBe(-1);
    expect(tourPose(6).h.face).toBe(-1);
    const end = tourPose(TOUR_END);
    expect(end.m.show || end.h.show).toBe(false);
    expect(end.swarm).toBeNull();
    expect(end.last).toBe(1);
    expect(TOUR_BEATS.length).toBe(10);
  });
});

describe('the depth rule: the strip has one front-to-back order', () => {
  it('back row, prop row 2, prop row 1, the walking lane, the floor: each clearly apart, at every strip size', () => {
    for (const [w, strip] of [[390, { top: 580, bottom: 737 }], [390, { top: 537, bottom: 637 }], [375, { top: 489, bottom: 560 }], [360, { top: 520, bottom: 673 }], [430, { top: 652, bottom: 825 }]] as const) {
      const lane = stripGeom(w, strip).ground, row1 = propLine(w, strip, 1), row2 = propLine(w, strip, 2);
      expect(lane).toBe(strip.bottom - LANE_UP);
      // Apart by more than the two pixels the depth test calls a tie.
      expect(lane - row1, `${w} ${strip.top}`).toBeGreaterThanOrEqual(4);
      expect(row1 - row2).toBeGreaterThanOrEqual(4);
      expect(row1 - row2).toBe(propBack(w, stripGeom(w, strip).scale));
      // The mound is on row 2; a full-size strip keeps the rows well under the back row's line.
      expect(moundSpot(w, strip).baseY).toBe(row2);
      if (strip.bottom - strip.top > 140) expect(row2).toBeGreaterThan(signStandLine(w, strip).ground + 20);
    }
  });
});

describe('chance sightings never feel broken (Job Y)', () => {
  it('until a sighting is in the Wildlife Log its trigger ALWAYS works, whatever the dice say', () => {
    const c = new Chances();
    for (let i = 0; i < 20; i++) expect(c.comes('magpie', 1 / 2, false, () => 0.999)).toBe(true);
    expect(c.comes('bear', 1 / 3, false, () => 0.999)).toBe(true);
  });

  it('once it is in the log the chance applies, but never two misses in a row: after a miss the next try always works', () => {
    const c = new Chances();
    // A hit on the dice is a hit.
    expect(c.comes('magpie', 1 / 2, true, () => 0.49)).toBe(true);
    // A miss, and the very next try works even on the worst roll; then the dice are back.
    expect(c.comes('magpie', 1 / 2, true, () => 0.5)).toBe(false);
    expect(c.owed('magpie')).toBe(true);
    expect(c.comes('magpie', 1 / 2, true, () => 0.999)).toBe(true);
    expect(c.owed('magpie')).toBe(false);
    expect(c.comes('magpie', 1 / 2, true, () => 0.999)).toBe(false);
    // On the worst dice there is never a second miss running, for any of the six.
    for (const [key, chance] of [['magpie', GAG_TRIGGERS.magpie.chance], ['worker', GAG_TRIGGERS.worker.chance], ['bear', GAG_TRIGGERS.bear.chance], ['gopherLunch', GAG_TRIGGERS.gopherLunch.chance], ['surveyor', GAG_TRIGGERS.surveyor.chance], ['tourists', GAG_TRIGGERS.tourists.chance]] as const) {
      const d = new Chances();
      const tries = Array.from({ length: 40 }, () => d.comes(key, chance, true, () => 0.999));
      expect(tries.some((x, i) => i > 0 && !x && !tries[i - 1]), key).toBe(false);
      expect(tries.filter(Boolean).length, key).toBe(20);
    }
  });

  it('each sighting keeps its own count, and a miss is owed across levels until it is paid', () => {
    const c = new Chances();
    expect(c.comes('bear', 1 / 3, true, () => 0.9)).toBe(false);
    expect(c.comes('magpie', 1 / 2, true, () => 0.9)).toBe(false);
    expect(c.comes('bear', 1 / 3, true, () => 0.9)).toBe(true);
    expect(c.owed('magpie')).toBe(true);
    c.reset();
    expect(c.owed('magpie')).toBe(false);
  });

  it('with random dice it still comes about as often as its chance says, or more (a miss is always made good)', () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const c = new Chances(); let hits = 0;
    for (let i = 0; i < 6000; i++) if (c.comes('bear', 1 / 3, true, rnd)) hits++;
    // One in three on the dice, and every miss followed by a sure thing: 3 in 5 over a long run.
    expect(hits / 6000).toBeGreaterThan(0.55);
    expect(hits / 6000).toBeLessThan(0.65);
  });
});
