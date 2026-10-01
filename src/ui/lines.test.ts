import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng.ts';
import { BUMP_LINES, linesFor, pickLine, type BumpHit } from './lines.ts';

describe('bump lines', () => {
  it('has the 20 lines, tagged', () => {
    expect(BUMP_LINES.any).toHaveLength(13);
    expect(BUMP_LINES.truck).toHaveLength(4);
    expect(BUMP_LINES.wall).toHaveLength(1);
    expect(BUMP_LINES.pumpjack).toHaveLength(2);
    expect(BUMP_LINES.convoy).toEqual(['Wait your turn, Sonny.', "Convoy order! I'm number one."]);
  });

  it('an out-of-order convoy bump uses only the convoy pool, alternating', () => {
    expect(linesFor('convoy')).toEqual(BUMP_LINES.convoy);
    const first = pickLine('convoy', null, () => 0);
    expect(pickLine('convoy', first, () => 0)).not.toBe(first);
  });

  it.each([
    ['truck', BUMP_LINES.truck],
    ['wall', BUMP_LINES.wall],
    ['pumpjack', BUMP_LINES.pumpjack],
    ['tank', []],
    ['wellhead', []],
  ] as const)('a %s bump draws from "any" plus its own pool only', (hit, own) => {
    expect(linesFor(hit)).toEqual([...BUMP_LINES.any, ...own]);
  });

  it('never picks a line from another trigger', () => {
    const rand = mulberry32(3);
    for (const hit of ['truck', 'wall', 'pumpjack', 'tank', 'wellhead', 'convoy'] as BumpHit[]) {
      const allowed = new Set(linesFor(hit));
      for (let i = 0; i < 200; i++) expect(allowed.has(pickLine(hit, null, rand))).toBe(true);
    }
  });

  it('never repeats the previous line', () => {
    const rand = mulberry32(9);
    let last: string | null = null;
    for (let i = 0; i < 500; i++) {
      const line = pickLine('wall', last, rand);
      expect(line).not.toBe(last);
      last = line;
    }
  });
});
