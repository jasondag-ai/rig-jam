import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import {
  BEAR_CHANCE,
  DEMO_EVERY_MS,
  DEMO_FIRST_MS,
  UNFOUND_WEIGHT,
  bearComes,
  bearEligible,
  demoNext,
  demoPool,
  weightedPick,
  wildPool,
  type DemoGag,
  MAGPIE_IDLE_MS,
  GREAT_MOVE_MS,
  PERIMETER_GAP_MS,
  STUCK_MS,
  isGreatMove,
  isStuck,
  nextPerimeter,
  perimeterBag,
  perimeterDone,
  perimeterGap,
  planWildlife,
  fitSpan,
  freeSpot,
  SPOTTER_IDLE_MS,
  biffySpot,
  companyLine,
  cordFor,
  dueGag,
  freshIdle,
  magpieTarget,
  reverseDirection,
  tierFor,
  touched,
} from './gags.ts';
import { COMPANY_LINES } from './lines.ts';

describe('idle gags', () => {
  it('sends the magpie after 10s and the spotter after 20s of nothing', () => {
    const s = freshIdle();
    expect(dueGag(MAGPIE_IDLE_MS - 1, s)).toBeNull();
    expect(dueGag(MAGPIE_IDLE_MS, s)).toBe('magpie');
    expect(dueGag(SPOTTER_IDLE_MS, { ...s, magpieThisIdle: true })).toBe('spotter');
  });

  it('fires each once per idle stretch, and the magpie only once per level', () => {
    expect(dueGag(30_000, { magpieDone: false, magpieThisIdle: true, spotterThisIdle: true })).toBeNull();
    expect(dueGag(12_000, { ...freshIdle(), magpieDone: true })).toBeNull();
  });

  it('a touch starts a new idle stretch, so a cancelled magpie can try again later', () => {
    const after = touched({ magpieDone: false, magpieThisIdle: true, spotterThisIdle: true });
    expect(dueGag(MAGPIE_IDLE_MS, after)).toBe('magpie');
    expect(dueGag(MAGPIE_IDLE_MS, touched({ ...after, magpieDone: true }))).toBeNull();
  });
});

describe('Company Man', () => {
  it('picks the tier by result', () => {
    expect(tierFor(8, 8)).toBe('par');
    expect(tierFor(9, 8)).toBe('close');
    expect(tierFor(11, 8)).toBe('close');
    expect(tierFor(12, 8)).toBe('over');
  });

  it('has three lines per tier, starting with the ones from the brief', () => {
    expect(COMPANY_LINES.par[0]).toBe("Textbook. I'll tell head office.");
    expect(COMPANY_LINES.close[0]).toBe('Good enough for government work.');
    expect(COMPANY_LINES.over[0]).toBe("We'll talk about this at the safety meeting.");
    for (const lines of Object.values(COMPANY_LINES)) expect(lines).toHaveLength(3);
  });

  it('says a line from the right tier and never repeats one twice in a row', () => {
    const rand = mulberry32(3);
    let last = '';
    for (let i = 0; i < 200; i++) {
      const line = companyLine(12, 8, rand);
      expect(COMPANY_LINES.over).toContain(line);
      expect(line).not.toBe(last);
      last = line;
    }
  });
});

// . . . . . .
// . . . . . .
// A A . . . . r     A: red, gate right of row 2 -> plugged in on the left
// . . . . . .
// . . . . B .       B: blue, gate above col 4 -> plugged in at the bottom
// . . . . B .       a green decoy gate sits below col 5
const level = parseLevel({
  id: 't',
  name: 't',
  par: 1,
  trucks: [
    { id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' },
    { id: 'B', color: 'blue', row: 4, col: 4, length: 2, orient: 'v' },
  ],
  gates: [
    { color: 'red', side: 'right', index: 2 },
    { color: 'blue', side: 'top', index: 4 },
    { color: 'green', side: 'bottom', index: 5 },
  ],
});

describe('biffy', () => {
  it('stands just outside the fence behind a truck tailgate that faces plain fence', () => {
    // A's rear faces the left fence (row 2, no gate); B's rear faces the bottom fence (col 4, no
    // gate). Below the board is preferred.
    expect(biffySpot(level)).toEqual({ truckId: 'B', side: 'bottom', index: 4 });
  });

  it('never stands where the fence behind the truck has a gate', () => {
    const gated = { ...level, gates: [...level.gates, { color: 'green' as const, side: 'bottom' as const, index: 4 }] };
    expect(biffySpot(gated)).toEqual({ truckId: 'A', side: 'left', index: 2 });
    const allGated = { ...gated, gates: [...gated.gates, { color: 'green' as const, side: 'left' as const, index: 2 }] };
    expect(biffySpot(allGated)).toBeNull();
  });

  it('knows which way each truck reverses', () => {
    expect(reverseDirection(level, level.trucks[0])).toBe(-1); // gate on the right: backs up left
    expect(reverseDirection(level, level.trucks[1])).toBe(1); // gate on top: backs up down
  });
});

describe('block heater cords', () => {
  it('run from a fence post behind the truck to its rear', () => {
    expect(cordFor(level, level.trucks[0])).toEqual({ side: 'left', index: 2, from: { x: 0, y: 2.5 }, to: { x: 0, y: 2.5 } });
    expect(cordFor(level, level.trucks[1])).toEqual({ side: 'bottom', index: 4, from: { x: 4.5, y: 6 }, to: { x: 4.5, y: 6 } });
    const moved = { ...level.trucks[0], col: 2 };
    expect(cordFor(level, moved).to).toEqual({ x: 2, y: 2.5 });
  });
});

describe('magpie', () => {
  it('lands on a truck still on the pad, or stays away from an empty one', () => {
    expect(level.trucks).toContain(magpieTarget(level.trucks, () => 0.7));
    expect(magpieTarget([])).toBeNull();
  });
});

describe('wildlife and traffic', () => {
  const where = (regionId: string, levelIndex: number, demo = false) => ({ regionId, levelIndex, demo });

  it('gopher in Cardium, moose in Duvernay; hot shot, geese and pumper everywhere; the bear in no pool', () => {
    expect(wildPool('cardium')).toEqual(['gopher', 'hotshot', 'geese', 'pumper']);
    expect(wildPool('montney')).toEqual(['hotshot', 'geese', 'pumper']);
    expect(wildPool('duvernay')).toEqual(['moose', 'hotshot', 'geese', 'pumper']);
    expect(wildPool('daily')).toEqual(['hotshot', 'geese', 'pumper']);
  });

  it('the bear is eligible only in Duvernay levels 8 to 10 (anywhere in demo mode)', () => {
    for (const region of ['cardium', 'montney', 'duvernay', 'daily'])
      for (let i = 0; i < 10; i++) expect(bearEligible(where(region, i)), `${region} ${i + 1}`).toBe(region === 'duvernay' && i >= 7);
    expect(bearEligible(where('cardium', 0, true))).toBe(true);
    expect(bearEligible(where('daily', 0, true))).toBe(true);
    // Never comes where he isn't eligible, whatever the dice say.
    expect(bearComes(where('montney', 8), () => 0)).toBe(false);
    expect(bearComes(where('duvernay', 6), () => 0)).toBe(false);
  });

  it('where eligible, he comes about one visit in three', () => {
    const rand = mulberry32(11);
    let n = 0;
    for (let i = 0; i < 6000; i++) if (bearComes(where('duvernay', 8), rand)) n++;
    expect(n / 6000).toBeGreaterThan(0.3);
    expect(n / 6000).toBeLessThan(0.37);
    expect(BEAR_CHANCE).toBeCloseTo(1 / 3);
  });

  it('an unfound entry is picked about 3x as often as a found one', () => {
    const rand = mulberry32(5);
    const count = { geese: 0, pumper: 0, hotshot: 0 };
    for (let i = 0; i < 10_000; i++) count[weightedPick(['geese', 'pumper', 'hotshot'] as const, new Set(['geese', 'hotshot']), rand)]++;
    expect(count.pumper / count.geese).toBeGreaterThan(2.6);
    expect(count.pumper / count.geese).toBeLessThan(3.4);
    expect(count.pumper / count.hotshot).toBeGreaterThan(2.6);
    expect(count.pumper / count.hotshot).toBeLessThan(3.4);
    expect(UNFOUND_WEIGHT).toBe(3);
    // Found ones still appear.
    expect(count.geese).toBeGreaterThan(1000);
  });

  it('with nothing found, or everything found, the picks are even', () => {
    const rand = mulberry32(9);
    for (const found of [new Set<string>(), new Set(['geese', 'pumper'])]) {
      let geese = 0;
      for (let i = 0; i < 4000; i++) if (weightedPick(['geese', 'pumper'] as const, found, rand) === 'geese') geese++;
      expect(geese / 4000).toBeGreaterThan(0.46);
      expect(geese / 4000).toBeLessThan(0.54);
    }
  });

  it('perimeter gags: every enabled one once before any repeats, in random order', () => {
    const rand = mulberry32(7);
    const pool = [...wildPool('duvernay'), 'bear'] as const;
    const firsts = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const bag = perimeterBag(pool, new Set(), null, rand);
      expect([...bag].sort()).toEqual([...pool].sort());
      firsts.add(bag[0]);
    }
    expect(firsts.size).toBe(pool.length); // any of them can come first
  });

  it('an unfound entry tends to come earlier in the bag; a refill never starts with the last one played', () => {
    const rand = mulberry32(4);
    let gopherFirst = 0;
    for (let i = 0; i < 4000; i++) if (perimeterBag(wildPool('cardium'), new Set(['hotshot', 'geese', 'pumper']), null, rand)[0] === 'gopher') gopherFirst++;
    expect(gopherFirst / 4000).toBeGreaterThan(0.45); // 3 of 6 weights
    expect(gopherFirst / 4000).toBeLessThan(0.55);
    for (let i = 0; i < 200; i++) expect(perimeterBag(wildPool('cardium'), new Set(), 'geese', rand)[0]).not.toBe('geese');
  });

  it('at most one perimeter gag every 30 to 45 seconds, no repeats until all have played', () => {
    const rand = mulberry32(12);
    const pool = wildPool('cardium');
    for (let i = 0; i < 500; i++) {
      const gap = perimeterGap(rand);
      expect(gap).toBeGreaterThanOrEqual(PERIMETER_GAP_MS.min);
      expect(gap).toBeLessThanOrEqual(PERIMETER_GAP_MS.max);
    }
    let s = planWildlife(pool, new Set(), rand);
    expect(s.nextAt).toBeGreaterThanOrEqual(30_000);
    expect(nextPerimeter(s.nextAt - 1, s, pool, new Set(), rand)).toBeNull();
    const played: string[] = [];
    let t = 0;
    for (let i = 0; i < pool.length * 3; i++) {
      t = s.nextAt;
      const n = nextPerimeter(t, s, pool, new Set(), rand)!;
      played.push(n.gag);
      // While it plays, and until the gap after it has passed, nothing else may start.
      expect(nextPerimeter(t + 5_000, n.state, pool, new Set(), rand)).toBeNull();
      s = perimeterDone(t + 5_000, n.state, rand);
      expect(s.nextAt - (t + 5_000)).toBeGreaterThanOrEqual(30_000);
      expect(nextPerimeter(s.nextAt - 1, s, pool, new Set(), rand)).toBeNull();
    }
    for (let r = 0; r < 3; r++) expect(new Set(played.slice(r * pool.length, (r + 1) * pool.length)).size).toBe(pool.length);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });

  it('reaction slots: a great move is two exits back to back; stuck is 20 seconds without a move', () => {
    expect(isGreatMove(null, 1000)).toBe(false);
    expect(isGreatMove(1000, 1000 + GREAT_MOVE_MS)).toBe(true);
    expect(isGreatMove(1000, 1001 + GREAT_MOVE_MS)).toBe(false);
    expect(isStuck(STUCK_MS - 1)).toBe(false);
    expect(isStuck(STUCK_MS)).toBe(true);
    expect(STUCK_MS).toBe(20_000);
  });

  it('demo mode: the bear anywhere, others where they live', () => {
    expect(demoPool('cardium', true)).toEqual(['magpie', 'spotter', 'biffy', 'bear', 'gopher', 'hotshot', 'geese', 'pumper']);
    expect(demoPool('montney', false)).toEqual(['magpie', 'spotter', 'landowner', 'bear', 'hotshot', 'geese', 'pumper']);
    expect(demoPool('duvernay', true)).toContain('moose');
    expect(DEMO_FIRST_MS).toBe(5_000);
    expect(DEMO_EVERY_MS).toBe(15_000);
  });

  it('demo mode plays unfound gags first, then found ones without repeating itself', () => {
    const pool = demoPool('cardium', true);
    const found = new Set<string>(['magpie', 'spotter']);
    const tried: DemoGag[] = [];
    const order: DemoGag[] = [];
    for (let i = 0; i < 6; i++) {
      const g = demoNext(pool, found, tried)!;
      order.push(g);
      tried.push(g);
      found.add(g);
    }
    expect(order).toEqual(['biffy', 'bear', 'gopher', 'hotshot', 'geese', 'pumper']);
    // A gag that was cut short (still unfound) is tried again, after the other unfound ones.
    expect(demoNext(['magpie', 'spotter'], new Set(), ['magpie'])).toBe('spotter');
    expect(demoNext(['magpie', 'spotter'], new Set(), ['magpie', 'spotter'])).toBe('magpie');
    // Everything found: any of them, but not the last one again.
    const rand = mulberry32(2);
    for (let i = 0; i < 50; i++) expect(demoNext(pool, new Set(pool), ['geese'], rand)).not.toBe('geese');
  });

  it('the bear scene fits clear of the biffy', () => {
    const span = 150;
    for (const biffyLeft of [10, 60, 120, 160, 200, 260, 300]) {
      const biffy = { left: biffyLeft, right: biffyLeft + 30 };
      const fit = [1, 0.8, 0.65].map((k) => ({ k, x: fitSpan(-16, 374, span * k, biffy) })).find((f) => f.x !== null)!;
      const x = fit.x!;
      expect(x + span * fit.k <= biffy.left || x >= biffy.right, `biffy at ${biffyLeft}: scene at ${x}`).toBe(true);
      expect(x).toBeGreaterThanOrEqual(-16);
      expect(x + span * fit.k).toBeLessThanOrEqual(374);
    }
    expect(fitSpan(0, 358, span, null)! + span).toBeLessThanOrEqual(358);
    expect(fitSpan(0, 100, span, null)).toBeNull();
  });


  it('free spots along the bottom stay clear of the biffy and the bush', () => {
    const avoid = [
      { left: 150, right: 184 },
      { left: 20, right: 90 },
    ];
    for (const pick of [0, 0.3, 0.7, 1]) {
      const x = freeSpot(0, 358, 60, avoid, pick)!;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + 60).toBeLessThanOrEqual(358);
      for (const a of avoid) expect(x + 60 <= a.left || x >= a.right, `pick ${pick}: ${x}`).toBe(true);
    }
    expect(freeSpot(0, 100, 150, [], 0.5)).toBeNull();
    expect(freeSpot(0, 358, 60, [], 0.5)).toBeCloseTo(149);
  });
});
