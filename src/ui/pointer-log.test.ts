import { describe, expect, it } from 'vitest';
import { POINTER_LOG_ROWS, addRow, pointerLogOn, rowText, type PointerRow } from './pointer-log.ts';

const row = (type: string, over: Partial<PointerRow> = {}): PointerRow => ({ type, kind: 'mouse', id: 1, buttons: 1, x: 640.4, y: 360.6, on: 'truck B', n: 1, ...over });

describe('the pointer log (?pointerlog=1)', () => {
  it('is hidden unless asked for', () => {
    expect(pointerLogOn('')).toBe(false);
    expect(pointerLogOn('?pointerlog=0')).toBe(false);
    expect(pointerLogOn('?demo=1&pointerlog=1')).toBe(true);
  });
  it('keeps the last 15 events; a run of moves is one row with a count', () => {
    let rows: PointerRow[] = [];
    rows = addRow(rows, row('down'));
    for (let i = 0; i < 40; i++) rows = addRow(rows, row('move', { x: 640 + i }));
    rows = addRow(rows, row('up', { buttons: 0 }));
    expect(rows.map((r) => r.type)).toEqual(['down', 'move', 'up']);
    expect(rows[1]).toMatchObject({ n: 40, x: 679 });
    // A move over something else, or with another button state, starts a new row.
    rows = addRow(addRow(rows, row('move', { buttons: 0, on: 'board' })), row('move', { buttons: 0, on: 'HUD' }));
    expect(rows.length).toBe(5);
    for (let i = 0; i < 30; i++) rows = addRow(rows, row(i % 2 ? 'down' : 'up'));
    expect(rows.length).toBe(POINTER_LOG_ROWS);
    expect(POINTER_LOG_ROWS).toBe(15);
  });
  it('writes an event as one short line', () => {
    expect(rowText(row('down'))).toBe('down mouse#1 b1 (640,361) truck B');
    expect(rowText(row('move', { n: 12, buttons: 0, on: 'board' }))).toBe('move mouse#1 b0 (640,361) board x12');
    expect(rowText(row('blur', { kind: '', id: 0, buttons: 0, x: 0, y: 0, on: 'window' }))).toBe('blur b0 (0,0) window');
  });
});
