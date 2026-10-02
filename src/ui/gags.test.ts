import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import {
  MAGPIE_IDLE_MS,
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
