import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng.ts';
import { companyLine, tierFor } from './company.ts';
import { COMPANY_LINES } from './lines.ts';

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
