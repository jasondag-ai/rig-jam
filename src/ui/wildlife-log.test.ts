import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX } from './progress.ts';
import { DEMO_LOG_KEY, LOG_ENTRIES, LOG_KEY, camoOn, complete, foundCount, parseLog, previewAll, record, sightingToast } from './wildlife-log.ts';

describe('Wildlife Log', () => {
  it('one entry per gag in the game, each with a name, caption and hint; none for the retired sprite gags', () => {
    expect(LOG_ENTRIES.map((e) => e.name)).toEqual(['Magpie', 'Sleepy Worker', 'Moose', 'Near Miss', 'Angry Landowner', 'Occupied', 'The Runaway Roll', 'Marshmallow', 'Lost Goose', 'Porcupine', 'Gopher Lunch', 'Safety Sam', 'Frozen Tongue', 'Surveyor', 'Back Scratcher', 'Tourists', 'Muskeg Boots', 'Cat Train', 'Beaver', 'Aurora Howl', 'Tumbleweed', 'Prairie Dog Wave', 'Runaway Bale', 'Personal Cloud', 'Three Swings', 'Out Cold', 'Fresh Wash', 'Dinner Bell', 'One Pea', 'Night Shift', 'Bull and Cow', 'Dug Through', 'Bear']);
    const ids = LOG_ENTRIES.map((e) => e.id as string);
    for (const gone of ['pumper', 'hotshot', 'gopher']) expect(ids).not.toContain(gone);
    expect(LOG_ENTRIES.find((e) => e.id === 'bear')!.caption).toBe('Does what bears do in the woods.');
    expect(LOG_ENTRIES.find((e) => e.id === 'magpie')!.caption).toBe('Never park under a tree.');
    for (const e of LOG_ENTRIES) expect(e.caption && e.hint.length > 10).toBeTruthy();
    expect(foundCount({ found: ['magpie', 'biffyB'], camo: true, camoEarned: false })).toBe(2);
  });

  it('starts empty, and repairs odd saved data', () => {
    expect(parseLog(null)).toEqual({ found: [], camo: true, camoEarned: false });
    expect(parseLog('not json')).toEqual({ found: [], camo: true, camoEarned: false });
    expect(parseLog(JSON.stringify({ v: 2, found: ['bear', 'unicorn', 'bear'], camo: false }))).toEqual({ found: ['bear'], camo: false, camoEarned: false });
    // Sightings of the retired sprite gags are dropped from a saved log.
    expect(parseLog(JSON.stringify({ v: 2, found: ['pumper', 'magpie', 'hotshot', 'gopher'], camo: true })).found).toEqual(['magpie']);
  });

  it('a sighting counts once', () => {
    let r = record(parseLog(null), 'bear');
    expect(r.isNew).toBe(true);
    expect(r.count).toBe(1);
    expect(sightingToast('bear', r.count)).toBe(`New sighting! Bear (1/${LOG_ENTRIES.length})`);
    r = record(r.log, 'bear');
    expect(r.isNew).toBe(false);
    expect(r.log.found).toEqual(['bear']);
  });

  it('the last sighting completes the log and turns on camo pickups', () => {
    let log = parseLog(null);
    const ids = LOG_ENTRIES.map((e) => e.id);
    for (const [i, id] of ids.entries()) {
      const r = record(log, id);
      expect(r.completed).toBe(i === ids.length - 1);
      log = r.log;
      expect(camoOn(log)).toBe(i === ids.length - 1);
    }
    expect(complete(log)).toBe(true);
    expect(camoOn({ ...log, camo: false })).toBe(false);
  });

  it('camo earned under an earlier, shorter log is kept; a new log needs every entry', () => {
    const old = parseLog(JSON.stringify({ v: 2, found: ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose'], camo: true, camoEarned: true }));
    expect(old.camoEarned).toBe(true);
    expect(camoOn(old)).toBe(true);
    expect(complete(old)).toBe(false);
    const fresh = parseLog(JSON.stringify({ v: 3, found: ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose'], camo: true, camoEarned: false }));
    expect(camoOn(fresh)).toBe(false);
  });

  it('the Bear is the one legendary entry', () => {
    expect(LOG_ENTRIES.filter((e) => e.legendary).map((e) => e.id)).toEqual(['bear']);
    expect(LOG_ENTRIES.find((e) => e.id === 'bear')!.hint).toBe('In Duvernay, tap the snowy bush three times. He comes one time in three.');
  });

  it('demo sightings are worded differently', () => {
    expect(sightingToast('bear', 3, true)).toBe(`Demo sighting! Bear (3/${LOG_ENTRIES.length})`);
  });

  it('both logs live under the progress prefix (separate keys), so Reset progress clears both', () => {
    expect(DEMO_LOG_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
    expect(DEMO_LOG_KEY).not.toBe(LOG_KEY);
    expect(LOG_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
  });

  it('?log=all previews a full log', () => {
    expect(previewAll('?log=all')).toBe(true);
    expect(previewAll('?gag=bear')).toBe(false);
  });
});

describe('log hints and Night Shift', () => {
  it('every hint is plain and short, says where and what to do, and has no em dash', () => {
    for (const e of LOG_ENTRIES) {
      expect(e.hint.length, e.id).toBeLessThanOrEqual(76);
      expect(e.hint, e.id).not.toMatch(/[\u2014\u2013]/);
      // (Clearwater's five are Jay's own words from the Big Pad brief: "Clear 5 trucks...", "After Three Swings, ...".)
      expect(e.hint, e.id).toMatch(/^(In |On |Tap |Press |Bump |Slide |Drive |Play |Leave |Scroll |Clear |After )/);
      expect(e.hint, e.id).toMatch(/[.)]$/);
    }
    expect(LOG_ENTRIES.find((e) => e.id === 'tourists')!.hint).toBe('Play the Daily Pad. They may show up on your first move (spring to fall).');
  });

  it('Night Shift is a log entry like any other: found when the lease goes fully dark', () => {
    const night = LOG_ENTRIES.find((e) => e.id === 'night')!;
    expect(night).toMatchObject({ name: 'Night Shift', caption: 'Lights out on the lease.', hint: 'Leave any lease alone until it goes dark.' });
    expect(sightingToast('night', 4)).toBe(`New sighting! Night Shift (4/${LOG_ENTRIES.length})`);
    expect(LOG_ENTRIES).toHaveLength(33);
  });
});
