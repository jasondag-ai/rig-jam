import { describe, expect, it } from 'vitest';
import { FINGER, SWIPE, TUTORIAL_CARDS, swipeTo } from './tutorial.ts';

describe('the how-to', () => {
  it('has three cards: drag along the length, the matching gate, fewer moves for more hard hats', () => {
    expect(TUTORIAL_CARDS.map((c) => c.id)).toEqual(['drag', 'gate', 'hats']);
    expect(TUTORIAL_CARDS[0].text).toMatch(/along their length/);
    expect(TUTORIAL_CARDS[1].text).toMatch(/gate that matches its colour/);
    expect(TUTORIAL_CARDS[2].title).toBe('Fewer moves, more hard hats');
    for (const c of TUTORIAL_CARDS) expect(c.title + c.text).not.toContain('—');
  });

  it('a swipe turns the card: left for the next, right for the one before, never past the ends', () => {
    expect(swipeTo(0, -SWIPE, 3)).toBe(1);
    expect(swipeTo(1, SWIPE, 3)).toBe(0);
    expect(swipeTo(1, -(SWIPE - 1), 3)).toBe(1); // too short to count
    expect(swipeTo(2, -200, 3)).toBe(2);
    expect(swipeTo(0, 200, 3)).toBe(0);
  });

  it('the ghost finger is drawn in code, in the toy outline', () => {
    expect(FINGER).toContain('<svg');
    expect(FINGER).toContain('#2b1e16');
  });
});
