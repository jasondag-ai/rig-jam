import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { SETTLE_MS, TABS_IN_VIEW, barScroll, fakeRegions, furthestOpen, moreEdges, TAB_MIN, allFit } from './region-bar.ts';

// A bar like the real one at 390: a 348 px strip, tabs 144 wide with 6 px between them.
const W = 144, GAP = 6, VIEW = 348;
const lefts = (n: number) => Array.from({ length: n }, (_, i) => i * (W + GAP));
const max = (n: number) => n * W + (n - 1) * GAP - VIEW;

describe('the region bar', () => {
  it('shows two whole tabs and about a third of the next: the peek', () => {
    expect(TABS_IN_VIEW).toBeGreaterThan(2.25);
    expect(TABS_IN_VIEW).toBeLessThan(2.45);
    // With a tab at the left edge, the third one shows by about a third of its width.
    const peek = (VIEW - 2 * (W + GAP)) / W;
    expect(peek).toBeGreaterThan(0.25);
    expect(peek).toBeLessThan(0.45);
  });

  it('knows the furthest region the player has unlocked (where the bar opens when no region is remembered yet)', () => {
    expect(furthestOpen(REGIONS, {}, false)).toBe(0);
    const five = (ri: number) => Object.fromEntries(REGIONS[ri].levels.slice(0, 5).map((l) => [l.id, l.par]));
    expect(furthestOpen(REGIONS, five(0), false)).toBe(1);
    expect(furthestOpen(REGIONS, { ...five(0), ...five(1) }, false)).toBe(2);
    // (Four of Montney is not enough for Duvernay.)
    expect(furthestOpen(REGIONS, { ...five(0), ...Object.fromEntries(REGIONS[1].levels.slice(0, 4).map((l) => [l.id, l.par])) }, false)).toBe(1);
    expect(furthestOpen(REGIONS, {}, true)).toBe(REGIONS.length - 1);
  });

  it('scrolls so the active tab is wholly in view, and stays put if it already is', () => {
    for (const n of [5, 8]) {
      const L = lefts(n), M = max(n);
      for (let active = 0; active < n; active++) {
        const at = barScroll(L, W, VIEW, M, active);
        expect(at, `${n} tabs, tab ${active}`).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThanOrEqual(M);
        expect(L[active]).toBeGreaterThanOrEqual(at - 0.5);
        expect(L[active] + W).toBeLessThanOrEqual(at + VIEW + 0.5);
      }
      // The first two show without scrolling; the third brings itself to the left edge; the last is flush right.
      expect(barScroll(L, W, VIEW, M, 0)).toBe(0);
      expect(barScroll(L, W, VIEW, M, 1)).toBe(0);
      expect(barScroll(L, W, VIEW, M, 2)).toBe(Math.min(M, L[2]));
      expect(barScroll(L, W, VIEW, M, n - 1)).toBe(M);
      // Already showing where the bar was left: it does not jump.
      expect(barScroll(L, W, VIEW, M, 2, 200)).toBe(200);
      expect(barScroll(L, W, VIEW, M, 0, 200)).toBe(0);
    }
  });

  it('fades an edge only where there is more that way', () => {
    expect(moreEdges(0, 400)).toEqual({ left: false, right: true });
    expect(moreEdges(150, 400)).toEqual({ left: true, right: true });
    expect(moreEdges(400, 400)).toEqual({ left: true, right: false });
    expect(moreEdges(0, 0)).toEqual({ left: false, right: false });
  });

  it('`?tabs=8` pads the bar with made-up locked regions (tests and previews); otherwise none', () => {
    expect(fakeRegions(5, '')).toEqual([]);
    expect(fakeRegions(5, '?tabs=5')).toEqual([]);
    expect(fakeRegions(5, '?tabs=8')).toEqual(['Viking', 'Leduc', 'Nisku']);
    expect(fakeRegions(5, '?tabs=99')).toHaveLength(7);
    expect(SETTLE_MS).toBeGreaterThanOrEqual(100);
  });

  it('shows every tab with no swipe only where they all fit at full size (a desktop window), never on a phone', () => {
    expect(TAB_MIN).toBeGreaterThanOrEqual(96);
    // The level list is at most 560 px wide with 16 px margins: 528 px of bar.
    expect(allFit(5, 528)).toBe(true);
    expect(allFit(6, 528)).toBe(false);
    expect(allFit(8, 528)).toBe(false);
    for (const phone of [360, 375, 390, 430]) expect(allFit(5, phone - 32), `${phone}`).toBe(false);
    expect(allFit(0, 528)).toBe(false);
    expect(allFit(3, 343)).toBe(true);
  });
});
