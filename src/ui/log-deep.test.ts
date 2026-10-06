import { describe, expect, it } from 'vitest';
import { DEEP, EARTH, ODDITIES, UPPER_KM, clockText, deepSvg, depthKm, dugStill, gaugeLine, kmText, marksFrom, oddityArt, oddityBox } from './log-deep.ts';
import { FORMATIONS } from './log-dig.ts';
import { BURIED_LINES } from './lines.ts';
import { LOG_ENTRIES, complete, parseLog, record, recordDig, type Sighting } from './wildlife-log.ts';

// A page like the real one: the upper formations end at these heights, the deep layers start at 3,800.
const upper = { grass: 16, topsoil: 560, till: 1040, badlands: 1530, cardium: 2000, mannville: 2900, montney: 3030, bakken: 3180, duvernay: 3310, reef: 3800 };
const marks = marksFrom(upper, 3800);
const deepTop = (id: string) => 3800 + DEEP.slice(0, DEEP.findIndex((l) => l.id === id)).reduce((s, l) => s + l.height, 0);

describe('the dig through the Earth: layers', () => {
  it('past the reservoir: granite, mantle, outer core, inner core, then mirrored back up to the Kerguelen Islands', () => {
    expect(DEEP.map((l) => l.name)).toEqual(['Basement granite', 'Mantle', 'Outer core', 'Inner core', 'Outer core', 'Mantle', 'Ocean crust', 'Seafloor', 'Southern Ocean', 'Kerguelen Islands']);
    // Mirrored: the same heights either side of the inner core.
    expect(DEEP[4].height).toBe(DEEP[2].height);
    expect(DEEP[5].height).toBe(DEEP[1].height);
    // A very long scroll: several screens of mantle alone.
    expect(DEEP.reduce((s, l) => s + l.height, 0)).toBeGreaterThan(7000);
    // Real depths: crust 35 km, mantle to 2,890, outer core to 5,150, and the same counted back from the far side.
    expect(DEEP.map((l) => l.km).slice(0, 3)).toEqual([35, 2890, 5150]);
    expect(EARTH).toEqual({ centre: 6371, far: 12742 });
    expect(DEEP[3].km).toBe(12742 - 5150);
    expect(DEEP[4].km).toBe(12742 - 2890);
    for (let i = 1; i < DEEP.length; i++) expect(DEEP[i].km).toBeGreaterThanOrEqual(DEEP[i - 1].km);
    expect(DEEP.at(-1)!.km).toBe(12742);
    // The upper dig's formations all have a depth, shallow to deep, ending at the reef.
    expect(Object.keys(UPPER_KM)).toEqual(FORMATIONS.map((f) => f.id));
    expect(UPPER_KM.reef).toBeLessThan(DEEP[0].km);
  });

  it('each layer is its own small drawing: flat, seeded, light; the two mirrored layers are the same drawing turned over', () => {
    for (const l of DEEP) {
      const svg = deepSvg(l.id, 390);
      expect(svg, l.id).toContain(`viewBox="0 0 390 ${l.height}"`);
      expect(deepSvg(l.id, 390), l.id).toBe(svg);
      expect(svg, l.id).not.toMatch(/filter|Gradient|mask|<image|NaN/);
      expect(svg.match(/<(path|ellipse|circle|rect)/g)!.length, l.id).toBeLessThan(420);
    }
    const body = (id: 'mantle' | 'mantleUp' | 'outerCore' | 'outerCoreUp') => deepSvg(id, 390).replace(/^<svg[^>]*><g[^>]*>/, '');
    expect(body('mantleUp')).toBe(body('mantle'));
    expect(body('outerCoreUp')).toBe(body('outerCore'));
    expect(deepSvg('mantleUp', 390)).toContain('scale(1 -1)');
    // The centre of the Earth is marked across the inner core's middle.
    expect(deepSvg('innerCore', 390)).toContain(`M0 ${DEEP[3].height / 2} H390`);
  });
});

describe('the depth gauge, in real km', () => {
  it('0 at the grass, 6,371 at the centre, 12,742 at Kerguelen', () => {
    expect(depthKm(0, marks)).toBe(0);
    expect(depthKm(16, marks)).toBe(0);
    expect(depthKm(deepTop('innerCore') + 400, marks)).toBe(6371);
    expect(depthKm(deepTop('kerguelen'), marks)).toBe(12742);
    expect(depthKm(99999, marks)).toBe(12742);
    // Layer boundaries read their real depths.
    expect(depthKm(3800, marks)).toBe(4);
    expect(depthKm(deepTop('mantle'), marks)).toBe(35);
    expect(depthKm(deepTop('outerCore'), marks)).toBe(2890);
    expect(depthKm(deepTop('innerCore'), marks)).toBe(5150);
    expect(depthKm(deepTop('outerCoreUp'), marks)).toBe(7592);
    expect(depthKm(deepTop('mantleUp'), marks)).toBe(9852);
    // It only ever goes up as the page goes down.
    let last = -1;
    for (let y = 0; y < 13000; y += 37) { const km = depthKm(y, marks); expect(km).toBeGreaterThanOrEqual(last); last = km; }
  });

  it('reads at a line that goes from the top of the screen (at the top of the page) to its foot (at the end)', () => {
    expect(gaugeLine(0, 11000, 800)).toBe(0);
    expect(gaugeLine(11000, 11000, 800)).toBe(11800);
    expect(gaugeLine(5500, 11000, 800)).toBe(5900);
    expect(gaugeLine(0, 0, 800)).toBe(0);
  });

  it('writes whole km with a comma, tenths under ten', () => {
    expect([0, 0.002, 0.4, 3.96, 35, 2890, 6371, 12742].map(kmText)).toEqual(['0 km', '0 km', '0.4 km', '4.0 km', '35 km', '2,890 km', '6,371 km', '12,742 km']);
  });
});

describe('the stopwatch and Dug Through', () => {
  it('reads minutes, seconds and tenths', () => {
    expect([0, 99, 7400, 59999, 60000, 723900].map(clockText)).toEqual(['0:00.0', '0:00.0', '0:07.4', '0:59.9', '1:00.0', '12:03.9']);
  });

  it('Dug Through is a log entry: reaching Kerguelen finds it, shows the time and keeps the best', () => {
    const entry = LOG_ENTRIES.find((e) => e.id === 'dug')!;
    expect(entry.name).toBe('Dug Through');
    expect(LOG_ENTRIES).toHaveLength(28);
    let log = parseLog(null);
    const first = recordDig(log, 42300);
    expect(first).toMatchObject({ isNew: true, count: 1, best: 42300, newBest: true, completed: false });
    expect(first.log).toMatchObject({ found: ['dug'], dug: 42300 });
    // Slower: the best stays. Faster: it is the new best. Found only once.
    const slower = recordDig(first.log, 51000);
    expect(slower).toMatchObject({ isNew: false, best: 42300, newBest: false });
    expect(slower.log.dug).toBe(42300);
    const faster = recordDig(slower.log, 38100);
    expect(faster).toMatchObject({ isNew: false, best: 38100, newBest: true });
    expect(faster.log.found).toEqual(['dug']);
    // Saved and read back.
    expect(parseLog(JSON.stringify({ v: 3, ...faster.log })).dug).toBe(38100);
    expect(parseLog(JSON.stringify({ v: 3, found: ['dug'], dug: -5 })).dug).toBeUndefined();
    expect(parseLog(JSON.stringify({ v: 3, found: ['dug'], dug: 'fast' })).dug).toBeUndefined();
  });

  it('it counts toward the camo unlock: every other entry is not enough, and the dig can be the one that completes the log', () => {
    let log = parseLog(null);
    for (const e of LOG_ENTRIES.filter((x) => x.id !== 'dug')) log = record(log, e.id as Sighting).log;
    expect(complete(log)).toBe(false);
    expect(log.camoEarned).toBe(false);
    const done = recordDig(log, 60000);
    expect(done.completed).toBe(true);
    expect(done.log.camoEarned).toBe(true);
  });
});

describe('oddities on the way down', () => {
  it('a diamond in the mantle, a lunchbox at the very centre, a whale in the Southern Ocean, with their lines', () => {
    expect(ODDITIES.map((o) => [o.id, o.in])).toEqual([['diamond', 'mantle'], ['lunchbox', 'innerCore'], ['whale', 'ocean']]);
    expect(BURIED_LINES.diamond).toBe('Pressure makes diamonds.');
    expect(BURIED_LINES.lunchbox).toBe('Halfway. Snack break.');
    expect(BURIED_LINES.whale).toBe('Long way from Alberta.');
    expect(ODDITIES.find((o) => o.id === 'lunchbox')!.y).toBe(0.5);
    for (const o of ODDITIES) {
      expect(oddityArt(o.id)).toContain(`viewBox="0 0 ${o.w} ${o.h}"`);
      for (const w of [343, 358, 398]) {
        const layer = DEEP.find((l) => l.id === o.in)!, b = oddityBox(o, w, layer.height);
        expect(Math.min(b.hitW, b.hitH)).toBeGreaterThanOrEqual(44);
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.left + b.hitW).toBeLessThanOrEqual(w - 60); // clear of the gauge on the right
        expect(b.top).toBeGreaterThan(40);
        expect(b.top + b.hitH).toBeLessThan(layer.height);
      }
    }
    expect(dugStill()).toContain('class="egg-still dug-still"');
  });
});
