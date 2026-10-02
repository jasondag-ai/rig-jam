import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX } from './progress.ts';
import { LOG_ENTRIES, LOG_KEY, camoOn, complete, parseLog, previewAll, record, sightingToast } from './wildlife-log.ts';

describe('Wildlife Log', () => {
  it('seven entries, each with a name, caption and hint', () => {
    expect(LOG_ENTRIES.map((e) => e.name)).toEqual(['Magpie', 'Sleeping Spotter', 'Biffy Surprise', 'Angry Landowner', 'Bear', 'Moose', 'Hot Shot']);
    expect(LOG_ENTRIES.find((e) => e.id === 'bear')!.caption).toBe('Does what bears do in the woods.');
    expect(LOG_ENTRIES.find((e) => e.id === 'magpie')!.caption).toBe('Never park under a tree.');
    for (const e of LOG_ENTRIES) expect(e.caption && e.hint).toBeTruthy();
  });

  it('starts empty, and repairs odd saved data', () => {
    expect(parseLog(null)).toEqual({ found: [], camo: true });
    expect(parseLog('not json')).toEqual({ found: [], camo: true });
    expect(parseLog(JSON.stringify({ found: ['bear', 'unicorn', 'bear'], camo: false }))).toEqual({ found: ['bear'], camo: false });
  });

  it('a sighting counts once', () => {
    let r = record(parseLog(null), 'bear');
    expect(r.isNew).toBe(true);
    expect(r.count).toBe(1);
    expect(sightingToast('bear', r.count)).toBe('New sighting! Bear (1/7)');
    r = record(r.log, 'bear');
    expect(r.isNew).toBe(false);
    expect(r.log.found).toEqual(['bear']);
  });

  it('the seventh sighting completes the log and turns on camo pickups', () => {
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

  it('lives under the progress prefix, so Reset progress clears it', () => {
    expect(LOG_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
  });

  it('?log=all previews a full log', () => {
    expect(previewAll('?log=all')).toBe(true);
    expect(previewAll('?gag=bear')).toBe(false);
  });
});
