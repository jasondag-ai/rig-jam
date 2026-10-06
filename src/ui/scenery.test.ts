import { describe, expect, it } from 'vitest';
import { seedFrom } from '../engine/rng.ts';
import { REGIONS } from '../levels/regions.ts';
import { BERM_CLEAR, sceneryItems, treeBox } from './scenery.ts';
import { THEMES } from './themes.ts';

// The game screen at each phone size: [screen width, strip floor (top of the hint line), board box].
const SCREENS = [
  { w: 375, floor: 480, box: { x: 16, y: 86, width: 342, height: 342 } },
  { w: 390, floor: 730, box: { x: 16, y: 190, width: 358, height: 358 } },
  { w: 430, floor: 810, box: { x: 16, y: 214, width: 398, height: 398 } },
];
const LEVELS = REGIONS.flatMap((r) => r.levels.map((l) => ({ region: r.id, theme: THEMES[r.theme], seed: seedFrom(l.id) })));

describe('scenery', () => {
  it('no tree touches the berm: clear grass on both sides and below, in every level and size', () => {
    for (const s of SCREENS)
      for (const l of LEVELS) {
        const { items } = sceneryItems(l.theme, s.w, s.floor, s.box, { seed: l.seed, depth: 20, anchors: { bush: true, mound: l.region === 'cardium' } });
        // (The Bakken's prairie has hardly a tree, by design: `Theme.trees`.)
        expect(items.length).toBeGreaterThan(l.theme.trees < 0.5 ? 2 : 10);
        for (const it of items) {
          const b = treeBox(it);
          const beside = b.bottom > s.box.y + 2 && b.top < s.box.y + s.box.height + BERM_CLEAR;
          if (beside) expect(b.right <= s.box.x - BERM_CLEAR || b.left >= s.box.x + s.box.width + BERM_CLEAR, `${l.region} ${it.art} at ${Math.round(it.x)},${Math.round(it.y)} on ${s.w}`).toBe(true);
        }
      }
  });

  it('a level always gets the same groves; different levels differ', () => {
    const s = SCREENS[1];
    const of = (seed: number) => JSON.stringify(sceneryItems(THEMES.summer, s.w, s.floor, s.box, { seed, depth: 20 }).items);
    expect(of(LEVELS[0].seed)).toBe(of(LEVELS[0].seed));
    expect(of(LEVELS[0].seed)).not.toBe(of(LEVELS[1].seed));
  });

  it('the mound can be stood on a given line at a given size (for the gags that play at it)', () => {
    const l = LEVELS.find((x) => x.region === 'cardium')!, sc = SCREENS[0];
    const { anchors } = sceneryItems(l.theme, sc.w, sc.floor, sc.box, { seed: l.seed, depth: 20, anchors: { bush: false, mound: true }, moundAt: { baseY: sc.floor - 6, w: 44 } });
    const m = anchors.find((a) => a.kind === 'mound')!;
    expect(anchors.length).toBe(1);
    expect(m.w).toBe(44);
    expect(m.h).toBeCloseTo((44 * 34) / 64);
    // Its base line (29.5 of 34 units down) is on the line asked for.
    expect(m.y - (m.h * 4.5) / 34).toBeCloseTo(sc.floor - 6);
  });

  it('gag anchors: a willow bush in every region, a dirt mound in Cardium only, clear of the board and the buttons', () => {
    for (const s of SCREENS)
      for (const l of LEVELS) {
        const { anchors, items } = sceneryItems(l.theme, s.w, s.floor, s.box, { seed: l.seed, depth: 20, anchors: { bush: true, mound: l.region === 'cardium' } });
        expect(anchors.map((a) => a.kind).sort()).toEqual(l.region === 'cardium' ? ['bush', 'mound'] : ['bush']);
        for (const a of anchors) {
          expect(a.y - a.h, 'below the berm, with clear grass').toBeGreaterThanOrEqual(s.box.y + s.box.height + BERM_CLEAR);
          expect(a.y, 'above the buttons').toBeLessThanOrEqual(s.floor);
          expect(a.x - a.w / 2).toBeGreaterThanOrEqual(0);
          expect(a.x + a.w / 2).toBeLessThanOrEqual(s.w);
          // No tree stands on an anchor.
          for (const it of items) {
            if (it.art === 'willow' && it.x === a.x && it.y === a.y) continue;
            const b = treeBox(it);
            expect(b.right > a.x - a.w / 2 && b.left < a.x + a.w / 2 && b.bottom > a.y - a.h && b.top < a.y).toBe(false);
          }
        }
      }
  });

  it('the level list (no board) keeps its tree line and has no anchors', () => {
    const { items, anchors } = sceneryItems(THEMES.summer, 390, 200, { x: 0, y: 160, width: 390, height: 0 }, { below: false, maxTree: 64 });
    expect(items.length).toBeGreaterThan(8);
    expect(anchors).toEqual([]);
  });
});
