import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng.ts';
import { companyLine, tierFor } from './company.ts';
import { COMPANY_LINES, DAILY_ONLY_LINES, FOURTH_WALL_LINES } from './lines.ts';

describe('Company Man', () => {
  it('picks the tier by result', () => {
    expect(tierFor(8, 8)).toBe('par');
    expect(tierFor(9, 8)).toBe('close');
    expect(tierFor(11, 8)).toBe('close');
    expect(tierFor(12, 8)).toBe('over');
  });

  it('has eight lines per tier: the first three as before, then the five new ones', () => {
    expect(COMPANY_LINES.par[0]).toBe("Textbook. I'll tell head office.");
    expect(COMPANY_LINES.close[0]).toBe('Good enough for government work.');
    expect(COMPANY_LINES.over[0]).toBe("We'll talk about this at the safety meeting.");
    expect(COMPANY_LINES.par.slice(3)).toEqual(["That's how we do it in the patch.", 'Zero incidents. Zero excuses.', 'Head office wants your number.', 'Smooth as a new rig floor.', 'You can come back tomorrow.']);
    expect(COMPANY_LINES.close.slice(3)).toEqual(["Close enough. Don't tell anyone.", "I've seen worse. Mostly from me.", "Trucks are out. I'm not asking how.", "Coffee's on you next time.", 'Fine. Go get lunch.']);
    expect(COMPANY_LINES.over.slice(3)).toEqual(['Did you plan that or just wing it?', 'I need a coffee after that.', "I'm getting too old for this lease.", 'Next time, try reading the map.', 'That took longer than a turnaround.']);
    for (const lines of Object.values(COMPANY_LINES)) expect(lines).toHaveLength(8);
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

  it('if a gag played this level, about one time in three he says a fourth-wall line instead; never otherwise', () => {
    const rand = mulberry32(7);
    let wall = 0;
    for (let i = 0; i < 3000; i++) if (FOURTH_WALL_LINES.includes(companyLine(8, 8, rand, true))) wall++;
    expect(wall / 3000).toBeGreaterThan(0.28);
    expect(wall / 3000).toBeLessThan(0.39);
    for (let i = 0; i < 500; i++) expect(FOURTH_WALL_LINES).not.toContain(companyLine(8, 8, rand, false));
    expect(FOURTH_WALL_LINES).toEqual(['I saw it too. Get back to work.', 'Quit watching the wildlife. Watch the trucks.']);
    // Any result: over par too.
    expect(FOURTH_WALL_LINES).toContain(companyLine(20, 8, () => 0, true));
  });

  it('"You can come back tomorrow." is said only on a Daily Pad\'s win card', () => {
    expect(DAILY_ONLY_LINES).toEqual(['You can come back tomorrow.']);
    expect(COMPANY_LINES.par).toContain('You can come back tomorrow.');
    // A level's card: never, however the dice fall.
    for (let i = 0; i < 400; i++) expect(DAILY_ONLY_LINES).not.toContain(companyLine(8, 8, () => (i % 97) / 97));
    for (let i = 0; i < 400; i++) expect(DAILY_ONLY_LINES).not.toContain(companyLine(8, 8, Math.random, false, false));
    // The Daily Pad's card: it can come up.
    const said = new Set<string>();
    for (let i = 0; i < 400; i++) said.add(companyLine(8, 8, () => (i % 97) / 97, false, true));
    expect(said.has('You can come back tomorrow.')).toBe(true);
    // And there is always something else to say on a level's card.
    expect(COMPANY_LINES.par.filter((l) => !DAILY_ONLY_LINES.includes(l)).length).toBeGreaterThan(2);
  });
});
