import { describe, expect, it } from 'vitest';
import { dayKey, dayNumber, keyFromNumber, padLevelIndex, padNumber, shareText, streak, weekOf, zeroIncident } from './daily.ts';

describe('dates', () => {
  it('uses the local calendar date', () => {
    expect(dayKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
    expect(dayKey(new Date(2026, 9, 1, 0, 1))).toBe('2026-10-01');
  });

  it('round-trips day numbers and finds Monday-based weeks', () => {
    expect(keyFromNumber(dayNumber('2026-10-04'))).toBe('2026-10-04');
    expect(weekOf('2026-09-28')).toBe(weekOf('2026-10-04')); // Mon..Sun
    expect(weekOf('2026-10-05')).toBe(weekOf('2026-10-04') + 1); // next Monday
  });
});

describe('pad number', () => {
  it('is #1 today (2026-09-30) and counts up by local date', () => {
    expect(padNumber('2026-09-30')).toBe(1);
    expect(padNumber('2026-10-01')).toBe(2);
    expect(padNumber('2026-11-28')).toBe(60);
    expect(padNumber('2026-09-01')).toBe(1);
  });

  it('wraps around the 60 pre-generated levels', () => {
    expect(padLevelIndex(1, 60)).toBe(0);
    expect(padLevelIndex(60, 60)).toBe(59);
    expect(padLevelIndex(61, 60)).toBe(0);
  });
});

describe('streak: days without incident', () => {
  it('is 0 with nothing cleared, and 1 after clearing today', () => {
    expect(streak([], '2026-09-30').days).toBe(0);
    expect(streak(['2026-09-30'], '2026-09-30')).toMatchObject({ days: 1, clearedToday: true, standDownReady: true });
  });

  it('counts consecutive days, and stays alive until today is over', () => {
    const run = ['2026-09-30', '2026-10-01', '2026-10-02'];
    expect(streak(run, '2026-10-02').days).toBe(3);
    expect(streak(run, '2026-10-03')).toMatchObject({ days: 3, clearedToday: false, savedDays: [] });
  });

  it('uses one Safety Stand-Down per week to cover a missed day', () => {
    // Wed 30, Thu 1 cleared; Fri 2 missed; Sat 3 cleared.
    const s = streak(['2026-09-30', '2026-10-01', '2026-10-03'], '2026-10-03');
    expect(s).toMatchObject({ days: 3, savedDays: ['2026-10-02'], standDownReady: false });
  });

  it('breaks on a second miss in the same week', () => {
    // Mon 28 cleared; Tue 29 and Thu 1 missed; Wed 30 and Fri 2 cleared.
    const s = streak(['2026-09-28', '2026-09-30', '2026-10-02'], '2026-10-02');
    expect(s.days).toBe(2); // Fri + Wed; Thu used the save, Tue breaks it
    expect(s.savedDays).toEqual(['2026-10-01']);
  });

  it('gives a fresh stand-down each Monday', () => {
    // Fri 2 missed (week 1), Tue 6 missed (week 2): both covered.
    const cleared = ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-07'];
    const s = streak(cleared, '2026-10-07');
    expect(s.days).toBe(5);
    expect(s.savedDays).toEqual(['2026-10-06', '2026-10-02']);
  });

  it('covers yesterday while today is still open, but never bridges to nothing', () => {
    expect(streak(['2026-09-30'], '2026-10-02')).toMatchObject({ days: 1, savedDays: ['2026-10-01'] });
    expect(streak(['2026-09-30'], '2026-10-03').days).toBe(0); // Thu and Fri both missed, same week
  });
});

describe('near misses', () => {
  it('awards ZERO INCIDENT only at par with no bumps', () => {
    expect(zeroIncident(8, 8, 0)).toBe(true);
    expect(zeroIncident(8, 8, 1)).toBe(false);
    expect(zeroIncident(9, 8, 0)).toBe(false);
  });
});

describe('share text', () => {
  const base = { pad: 3, moves: 8, par: 8, hats: 3, zeroIncident: true, streak: 3 };

  it('has pad, moves vs par, hats, badge, streak and link', () => {
    expect(shareText(base)).toBe(
      [
        'Rush Hour Rigs 🚛 Daily Pad #3',
        '👷👷👷 8 moves · par 8',
        '🦺 ZERO INCIDENT',
        '🚧 Days without incident: 3',
        'https://jasondag-ai.github.io/rush-hour-rigs/',
      ].join('\n'),
    );
  });

  it('drops the badge when not earned and shows missing hats', () => {
    const text = shareText({ ...base, moves: 10, hats: 2, zeroIncident: false });
    expect(text).not.toContain('ZERO INCIDENT');
    expect(text).toContain('👷👷▫️ 10 moves · par 8');
  });
});
