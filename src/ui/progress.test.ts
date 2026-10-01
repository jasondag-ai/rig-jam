import { describe, expect, it } from 'vitest';
import { freshProgress, hardHats, recordDailyClear, recordWin, spendHint, START_HINTS } from './progress.ts';

describe('hard hats', () => {
  it('gives 3 at par, 2 up to par + 3, otherwise 1', () => {
    expect(hardHats(5, 5)).toBe(3);
    expect(hardHats(6, 5)).toBe(2);
    expect(hardHats(8, 5)).toBe(2);
    expect(hardHats(9, 5)).toBe(1);
  });
});

describe('hints', () => {
  it('starts with 3 free hints', () => {
    expect(freshProgress().hints).toBe(START_HINTS);
    expect(START_HINTS).toBe(3);
  });

  it('spends one hint at a time and stops at zero', () => {
    let p: ReturnType<typeof freshProgress> | null = freshProgress();
    for (let i = 0; i < 3; i++) p = spendHint(p!);
    expect(p!.hints).toBe(0);
    expect(spendHint(p!)).toBeNull();
  });

  it('earns one hint for a perfect solve, once per level', () => {
    const first = recordWin(freshProgress(), 'c01', 2, 2);
    expect(first.earnedHint).toBe(true);
    expect(first.progress.hints).toBe(4);
    const again = recordWin(first.progress, 'c01', 2, 2);
    expect(again.earnedHint).toBe(false);
    expect(again.progress.hints).toBe(4);
  });

  it('earns nothing over par', () => {
    const r = recordWin(freshProgress(), 'c01', 3, 2);
    expect(r.earnedHint).toBe(false);
    expect(r.progress.hints).toBe(3);
  });
});

describe('best scores', () => {
  it('keeps the lowest move count', () => {
    let p = recordWin(freshProgress(), 'c01', 6, 2).progress;
    p = recordWin(p, 'c01', 4, 2).progress;
    p = recordWin(p, 'c01', 5, 2).progress;
    expect(p.best.c01).toBe(4);
  });
});

describe('daily record', () => {
  it('records each day once and survives other progress updates', () => {
    let p = recordDailyClear(freshProgress(), '2026-09-30');
    p = recordDailyClear(p, '2026-09-30');
    expect(p.dailyCleared).toEqual(['2026-09-30']);
    p = recordWin(p, 'd01', 8, 8).progress;
    expect(p.dailyCleared).toEqual(['2026-09-30']);
  });
});

describe('reset progress', () => {
  it('wipes everything the game saved and leaves other sites\' data alone', async () => {
    const store = new Map<string, string>();
    const fake = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const g = globalThis as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = fake;
    try {
      const { loadProgress, resetProgress, saveProgress } = await import('./progress.ts');
      let p = recordWin(freshProgress(), 'c01', 2, 2).progress;
      p = recordDailyClear(p, '2026-09-30');
      saveProgress(spendHint(p)!);
      store.set('rush-hour-rigs:region', 'montney');
      store.set('someone-else', 'keep');
      expect(loadProgress().dailyCleared).toEqual(['2026-09-30']);

      resetProgress();

      expect(loadProgress()).toEqual(freshProgress());
      expect([...store.keys()]).toEqual(['someone-else']);
    } finally {
      g.localStorage = before;
    }
  });
});
