import { describe, expect, it } from 'vitest';
import { shouldShowCover } from './cover.ts';

describe('cover', () => {
  it('every app open starts on the cover', () => {
    expect(shouldShowCover('', false)).toBe(true);
    expect(shouldShowCover('?idle=0.1', false)).toBe(true);
  });

  it('?gag= preview links go straight in; automated tests skip it unless they ask', () => {
    expect(shouldShowCover('?gag=bear', false)).toBe(false);
    expect(shouldShowCover('', true)).toBe(false);
    expect(shouldShowCover('?cover=1', true)).toBe(true);
    expect(shouldShowCover('?cover=0', false)).toBe(false);
  });
});
