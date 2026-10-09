import { describe, expect, it } from 'vitest';
import { DESK_LEAST, DESK_ROOM, DESK_WIDTH, deskHeight } from './game-view.ts';

describe('a short desktop window keeps its bottom strip (deskHeight)', () => {
  it('never touches a phone: no mouse, or a column narrower than the desktop one', () => {
    for (const [w, h] of [[358, 430], [343, 400], [358, 610], [398, 700]]) {
      expect(deskHeight(w, h, false)).toBe(h);
      expect(deskHeight(w, h, true)).toBe(h); // (a mouse on a narrow window: still the phone layout)
    }
    expect(deskHeight(DESK_WIDTH - 1, 500, true)).toBe(500);
    expect(deskHeight(560, 528, false)).toBe(528); // (a tablet: touch)
  });

  it('on a desktop it leaves DESK_ROOM of the stage for the strip and the sky, never going under DESK_LEAST', () => {
    expect(deskHeight(560, 548, true)).toBe(548 - DESK_ROOM);
    expect(deskHeight(560, 420, true)).toBe(DESK_LEAST);
    expect(deskHeight(560, 300, true)).toBe(300);
  });

  it('a tall window is as it was: the lease is still as wide as the column', () => {
    // 1440 x 900: the stage is about 708 px tall and 560 wide; the lease is the smaller of the two.
    expect(Math.min(560, deskHeight(560, 708, true))).toBe(560);
  });
});
