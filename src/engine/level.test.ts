import { describe, expect, it } from 'vitest';
import { LevelError, gateFor, parseLevel, parseLevels, truckCells } from './level.ts';

const valid = () => ({
  id: 't1',
  name: 'Test',
  par: 2,
  trucks: [
    { id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' },
    { id: 'B', color: 'blue', row: 1, col: 3, length: 2, orient: 'v' },
  ],
  gates: [
    { color: 'red', side: 'right', index: 2 },
    { color: 'blue', side: 'bottom', index: 3 },
  ],
});

describe('parseLevel', () => {
  it('accepts a valid level', () => {
    const level = parseLevel(valid());
    expect(level.trucks).toHaveLength(2);
    expect(level.gates).toHaveLength(2);
  });

  it.each([
    ['non-object', () => 5, /object/],
    ['missing par', () => ({ ...valid(), par: 0 }), /par/],
    ['no trucks', () => ({ ...valid(), trucks: [] }), /at least one truck/],
    ['bad color', () => {
      const l = valid();
      (l.trucks[0] as { color: string }).color = 'pink';
      return l;
    }, /unknown color/],
    ['bad length', () => {
      const l = valid();
      (l.trucks[0] as { length: number }).length = 4;
      return l;
    }, /length/],
    ['off the pad', () => {
      const l = valid();
      l.trucks[0].col = 5;
      return l;
    }, /runs off the pad/],
    ['overlap', () => {
      const l = valid();
      l.trucks.push({ id: 'C', color: 'red', row: 2, col: 1, length: 2, orient: 'h' });
      return l;
    }, /overlap/],
    ['duplicate id', () => {
      const l = valid();
      l.trucks[1].id = 'A';
      return l;
    }, /duplicate truck id/],
    ['no aligned gate', () => {
      const l = valid();
      l.gates[0].index = 3;
      return l;
    }, /no red gate/],
    ['two aligned gates', () => {
      const l = valid();
      l.gates.push({ color: 'red', side: 'left', index: 2 });
      return l;
    }, /two red gates/],
    ['two gates in one spot', () => {
      const l = valid();
      l.gates.push({ color: 'green', side: 'right', index: 2 });
      return l;
    }, /two gates at right 2/],
    ['starts touching gate', () => {
      const l = valid();
      l.trucks[0].col = 4;
      return l;
    }, /starts touching its gate/],
  ])('rejects %s', (_name, make, message) => {
    expect(() => parseLevel(make())).toThrow(LevelError);
    expect(() => parseLevel(make())).toThrow(message);
  });

  it('rejects a wrong-color gate as the only gate in line', () => {
    const l = valid();
    l.gates[0].color = 'green';
    expect(() => parseLevel(l)).toThrow(/no red gate/);
  });
});

describe('parseLevels', () => {
  it('rejects duplicate level ids', () => {
    expect(() => parseLevels([valid(), valid()])).toThrow(/duplicate level ids/);
  });
});

describe('helpers', () => {
  it('lists truck cells', () => {
    expect(truckCells({ id: 'X', color: 'red', row: 1, col: 3, length: 3, orient: 'v' })).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('finds the gate a truck exits through', () => {
    const level = parseLevel(valid());
    expect(gateFor(level, level.trucks[1]).side).toBe('bottom');
  });
});

describe('hint', () => {
  it('keeps an optional hint and rejects a non-string one', () => {
    expect(parseLevel({ ...valid(), hint: 'Try it' }).hint).toBe('Try it');
    expect(parseLevel(valid()).hint).toBeUndefined();
    expect(() => parseLevel({ ...valid(), hint: 3 })).toThrow(/hint/);
  });
});

describe('obstacles', () => {
  it('parses pumpjacks', () => {
    expect(parseLevel({ ...valid(), obstacles: [{ row: 5, col: 5 }] }).obstacles).toEqual([{ row: 5, col: 5 }]);
  });

  it('rejects a pumpjack on a truck or off the pad', () => {
    expect(() => parseLevel({ ...valid(), obstacles: [{ row: 2, col: 1 }] })).toThrow(/overlaps A/);
    expect(() => parseLevel({ ...valid(), obstacles: [{ row: 6, col: 1 }] })).toThrow(/row\/col/);
  });
});

describe('obstacle kind', () => {
  it('keeps a cosmetic kind and rejects unknown ones', () => {
    expect(parseLevel({ ...valid(), obstacles: [{ row: 5, col: 5, kind: 'tank' }] }).obstacles).toEqual([
      { row: 5, col: 5, kind: 'tank' },
    ]);
    expect(() => parseLevel({ ...valid(), obstacles: [{ row: 5, col: 5, kind: 'outhouse' }] })).toThrow(/unknown obstacle kind/);
  });
});
