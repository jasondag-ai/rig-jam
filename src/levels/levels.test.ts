import { describe, expect, it } from 'vitest';
import { parseLevels, solve } from '../engine/index.ts';
import raw from './levels.json';

const levels = parseLevels(raw);

describe('shipped levels', () => {
  it('has 10 levels', () => {
    expect(levels).toHaveLength(10);
  });

  it.each(levels.map((l) => [l.id, l] as const))('level %s is solvable and par is the optimum', (_id, level) => {
    const solution = solve(level);
    expect(solution).not.toBeNull();
    expect(solution!.length).toBe(level.par);
  });

  it('gets harder (par never drops)', () => {
    for (let i = 1; i < levels.length; i++) expect(levels[i].par).toBeGreaterThanOrEqual(levels[i - 1].par);
  });
});
