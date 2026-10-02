import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX } from './progress.ts';
import { LOG_ENTRIES, LOG_KEY, camoOn, complete, parseLog, previewAll, record, sightingToast } from './wildlife-log.ts';

describe('Wildlife Log', () => {
  it('ten entries, each with a name, caption and hint', () => {
    expect(LOG_ENTRIES.map((e) => e.name)).toEqual(['Magpie', 'Sleeping Spotter', 'Biffy Surprise', 'Angry Landowner', 'Bear', 'Moose', 'Hot Shot', 'Gopher', 'Canada Geese', 'The Pumper']);
    expect(LOG_ENTRIES.find((e) => e.id === 'gopher')!.hint).toBe('Seen in Cardium');
    expect(LOG_ENTRIES.find((e) => e.id === 'geese')!.hint).toBe('Look up');
    expect(LOG_ENTRIES.find((e) => e.id === 'pumper')!.hint).toBe('Making his rounds');
    expect(LOG_ENTRIES.find((e) => e.id === 'bear')!.caption).toBe('Does what bears do in the woods.');
    expect(LOG_ENTRIES.find((e) => e.id === 'magpie')!.caption).toBe('Never park under a tree.');
    for (const e of LOG_ENTRIES) expect(e.caption && e.hint).toBeTruthy();
  });

  it('starts empty, and repairs odd saved data', () => {
    expect(parseLog(null)).toEqual({ found: [], camo: true, camoEarned: false });
    expect(parseLog('not json')).toEqual({ found: [], camo: true, camoEarned: false });
    expect(parseLog(JSON.stringify({ v: 2, found: ['bear', 'unicorn', 'bear'], camo: false }))).toEqual({ found: ['bear'], camo: false, camoEarned: false });
  });

  it('a sighting counts once', () => {
    let r = record(parseLog(null), 'bear');
    expect(r.isNew).toBe(true);
    expect(r.count).toBe(1);
    expect(sightingToast('bear', r.count)).toBe('New sighting! Bear (1/10)');
    r = record(r.log, 'bear');
    expect(r.isNew).toBe(false);
    expect(r.log.found).toEqual(['bear']);
  });

  it('the tenth sighting completes the log and turns on camo pickups', () => {
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

  it('a log that had all seven before 8 to 10 arrived keeps its camo; a new one needs all ten', () => {
    const seven = ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'hotshot'];
    const old = parseLog(JSON.stringify({ found: seven, camo: true }));
    expect(old.camoEarned).toBe(true);
    expect(camoOn(old)).toBe(true);
    expect(complete(old)).toBe(false);
    // Saved after the update with the same seven: not enough any more.
    const now = parseLog(JSON.stringify({ v: 2, found: seven, camo: true, camoEarned: false }));
    expect(camoOn(now)).toBe(false);
    // And an old log with only six stays without.
    expect(parseLog(JSON.stringify({ found: seven.slice(1), camo: true })).camoEarned).toBe(false);
  });

  it('lives under the progress prefix, so Reset progress clears it', () => {
    expect(LOG_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
  });

  it('?log=all previews a full log', () => {
    expect(previewAll('?log=all')).toBe(true);
    expect(previewAll('?gag=bear')).toBe(false);
  });
});
