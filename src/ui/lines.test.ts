import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng.ts';
import { BUMP_LINES, COMPANY_LINES, ESCALATION, FOURTH_WALL_LINES, LANDOWNER_LINES, MAGPIE_LINES, WITNESS_LINES, bumpLine, fromPool, linesFor, pickLine, type BumpHit } from './lines.ts';
import { SHARES } from './gag-triggers.ts';

describe('bump lines', () => {
  it('keeps every old line and adds the v2 ones, tagged', () => {
    expect(BUMP_LINES.any).toHaveLength(13);
    expect(BUMP_LINES.truck).toHaveLength(4);
    expect(BUMP_LINES.wall).toHaveLength(9);
    expect(BUMP_LINES.wall[0]).toBe("That's a wall, not a gate.");
    expect(BUMP_LINES.wall).toContain('Did the gate move? No. You did.');
    expect(BUMP_LINES.pumpjack).toHaveLength(8);
    expect(BUMP_LINES.pumpjack.slice(0, 2)).toEqual(["Pumpjack's undefeated.", "Pumpjack doesn't have a license."]);
    expect(BUMP_LINES.pumpjack).toContain('Pumpjack 1. You 0.');
    expect(BUMP_LINES.convoy).toHaveLength(8);
    expect(BUMP_LINES.convoy.slice(0, 2)).toEqual(['Wait your turn, Sonny.', "Convoy order! I'm number one."]);
    expect(BUMP_LINES.tank).toEqual(["That tank's full, by the way.", "Tank's not a bumper.", 'You dent it, you strap it.', "Easy. That's a day's production.", 'Smells like a spill report.', 'Hit the tank, fill out the form.']);
    expect(BUMP_LINES.wellhead).toHaveLength(6);
    expect(BUMP_LINES.wellhead[1]).toBe("Christmas tree's not for parking.");
    expect(BUMP_LINES.flare).toHaveLength(6);
    expect(BUMP_LINES.flare[0]).toBe('Hot hot hot!');
  });

  it('no em dashes, and no line twice anywhere', () => {
    const all = [...Object.values(BUMP_LINES).flat(), ...Object.values(COMPANY_LINES).flat(), ...FOURTH_WALL_LINES, ...MAGPIE_LINES, ...LANDOWNER_LINES, ...Object.values(WITNESS_LINES)];
    for (const l of all) expect(l).not.toMatch(/[\u2013\u2014]/);
    expect(new Set(all).size).toBe(all.length);
  });

  it('an out-of-order convoy bump uses only the convoy pool, never the same twice running', () => {
    expect(linesFor('convoy')).toEqual(BUMP_LINES.convoy);
    const first = pickLine('convoy', null, () => 0);
    expect(pickLine('convoy', first, () => 0)).not.toBe(first);
  });

  it.each(['truck', 'wall', 'pumpjack', 'tank', 'wellhead', 'flare'] as const)('a %s bump draws from "any" plus its own pool only', (hit) => {
    expect(BUMP_LINES[hit].length).toBeGreaterThan(0);
    expect(linesFor(hit)).toEqual([...BUMP_LINES.any, ...BUMP_LINES[hit]]);
  });

  it('never picks a line from another trigger', () => {
    const rand = mulberry32(3);
    for (const hit of ['truck', 'wall', 'pumpjack', 'tank', 'wellhead', 'flare', 'convoy'] as BumpHit[]) {
      const allowed = new Set(linesFor(hit));
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const line = pickLine(hit, null, rand);
        expect(allowed.has(line)).toBe(true);
        seen.add(line);
      }
      // Its own lines do come up (tank, wellhead and flare bumps have their own lines now).
      expect(BUMP_LINES[hit].some((l) => seen.has(l)), hit).toBe(true);
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

describe('escalation: the same truck, the same kind of hit, again in the same level', () => {
  it('the first time is a line from the pool; the second and the third are from the table', () => {
    const rand = mulberry32(5);
    expect(linesFor('wall')).toContain(bumpLine('wall', 1, null, rand));
    expect(bumpLine('wall', 2, null, rand)).toBe("It's still a wall.");
    expect(bumpLine('wall', 3, null, rand)).toBe('...');
    expect(bumpLine('wall', 9, null, rand)).toBe('...');
  });

  it('the table, as written', () => {
    expect(ESCALATION).toEqual({
      wall: ["It's still a wall.", '...'],
      truck: ['Again? Really?', "I'm calling dispatch."],
      pumpjack: ['Still undefeated.', '...'],
      convoy: ['Still not your turn.', '...'],
      tank: ['Again?!', "I'm just gonna sit here."],
      wellhead: ['Again?!', "I'm just gonna sit here."],
      flare: ['Again?!', "I'm just gonna sit here."],
    });
  });
});

describe('gag lines', () => {
  it('the magpie and the landowner each have a pool of four, the old line first', () => {
    expect(MAGPIE_LINES).toEqual(['Seriously?', 'Not the windshield!', 'Every. Single. Day.', 'Somebody get the pressure washer.']);
    expect(LANDOWNER_LINES).toEqual(["Who's paying for these ruts?", "That's my hay field!", "I'm calling the land man.", 'Fix these ruts by Friday.']);
  });

  it('a pool never gives the same line twice in a row', () => {
    const rand = mulberry32(11);
    for (const pool of [MAGPIE_LINES, LANDOWNER_LINES]) {
      let last = '';
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const line = fromPool(pool, rand);
        expect(pool).toContain(line);
        expect(line).not.toBe(last);
        last = line;
        seen.add(line);
      }
      expect(seen.size).toBe(pool.length);
    }
  });

  it('a witness line for every gag', () => {
    expect(Object.keys(WITNESS_LINES).sort()).toEqual(Object.keys(SHARES).sort());
    expect(WITNESS_LINES.magpie).toBe('Not that bird again.');
    expect(WITNESS_LINES.nearMiss).toBe("That's my cousin.");
    expect(WITNESS_LINES.bear).toBe('Do NOT make eye contact.');
    expect(WITNESS_LINES.tongue).toBe('Every winter. Every single winter.');
  });
});
