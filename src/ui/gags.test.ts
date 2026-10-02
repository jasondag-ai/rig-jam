import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import {
  ANIMAL_IDLE_MS,
  WILD_GAP_MS,
  type WildState,
  MAGPIE_IDLE_MS,
  animalFor,
  dueWildlife,
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
  it('gopher in Cardium, bear in Montney, moose in Duvernay, no animal elsewhere', () => {
    expect(animalFor('montney')).toBe('bear');
    expect(animalFor('duvernay')).toBe('moose');
    expect(animalFor('cardium')).toBe('gopher');
    expect(animalFor('daily')).toBeNull();
  });

  it('random moments stay mid-level and well apart', () => {
    const rand = mulberry32(7);
    const visitors = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const p = planWildlife(rand);
      expect(p.animalAt).toBeGreaterThanOrEqual(20_000);
      expect(p.animalAt).toBeLessThanOrEqual(50_000);
      expect(p.hotshotAt).toBeGreaterThanOrEqual(8_000);
      expect(p.hotshotAt).toBeLessThanOrEqual(70_000);
      expect(p.visitorAt).toBeGreaterThanOrEqual(12_000);
      expect(p.visitorAt).toBeLessThanOrEqual(90_000);
      const at = [p.animalAt, p.hotshotAt, p.visitorAt];
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(Math.abs(at[a] - at[b])).toBeGreaterThanOrEqual(WILD_GAP_MS - 1e-6);
      visitors.add(p.visitor);
    }
    expect([...visitors].sort()).toEqual(['geese', 'pumper']);
  });

  const plan = (o: Partial<WildState>): WildState => ({
    animalAt: 30_000,
    hotshotAt: 50_000,
    visitorAt: 70_000,
    visitor: 'geese',
    animalDone: false,
    hotshotDone: false,
    visitorDone: false,
    ...o,
  });

  it('the animal comes after 15s idle, or at its moment even while you play', () => {
    const s = plan({});
    expect(dueWildlife(10_000, 5_000, s, 'bear')).toBeNull();
    expect(dueWildlife(16_000, ANIMAL_IDLE_MS, s, 'gopher')).toBe('animal');
    expect(dueWildlife(30_000, 200, s, 'moose')).toBe('animal');
    expect(dueWildlife(30_000, 200, { ...s, animalDone: true }, 'moose')).toBeNull();
    expect(dueWildlife(30_000, 20_000, s, null)).toBeNull();
  });

  it('the hot shot and the visitor come once each, at their moments, in every region', () => {
    const s = plan({ hotshotAt: 12_000, visitorAt: 24_000 });
    expect(dueWildlife(11_000, 0, s, null)).toBeNull();
    expect(dueWildlife(12_000, 0, s, null)).toBe('hotshot');
    expect(dueWildlife(24_000, 0, { ...s, hotshotDone: true }, null)).toBe('visitor');
    expect(dueWildlife(90_000, 0, { ...s, hotshotDone: true, animalDone: true, visitorDone: true }, 'bear')).toBeNull();
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
