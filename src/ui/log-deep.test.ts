import { describe, expect, it } from 'vitest';
import { DIG_FINDS, DIG_SLOTS } from './dig-finds.ts';
import { DEEP, DIG, EARTH, ODDITIES, SURFACE_PX, UPPER_KM, clockText, depthKm, dugStill, gaugeLine, kerguelenSvg, kmText, layerBackground, layerEdge, marksFrom, oddityArt, oddityBox, seabedSvg, tileSvg, tilesIn, tilesNear } from './log-deep.ts';
import { FORMATIONS } from './log-dig.ts';
import { BURIED_LINES } from './lines.ts';
import { LOG_ENTRIES, complete, parseLog, record, recordDig, shownEntries, type Sighting } from './wildlife-log.ts';

// A page like the real one: the upper formations end at these heights, the deep layers start at 3,800.
const upper = { grass: 16, topsoil: 560, till: 1040, badlands: 1530, cardium: 2000, mannville: 2900, montney: 3030, bakken: 3180, duvernay: 3310, reef: 3800 };
const marks = marksFrom(upper, 3800);
const deepTop = (id: string) => 3800 + DEEP.slice(0, DEEP.findIndex((l) => l.id === id)).reduce((s, l) => s + l.height, 0);
const DIRT = DEEP.filter((l) => l.id !== 'kerguelen');
type Dirt = Parameters<typeof tileSvg>[0];

describe('the dig through the Earth: how long, and what layers', () => {
  it('ONE setting sets its length: at least 60 phone screens of dirt', () => {
    expect(DIG.screens).toBeGreaterThanOrEqual(60);
    const dirt = DIRT.reduce((s, l) => s + l.height, 0);
    expect(dirt).toBeGreaterThanOrEqual(DIG.screens * DIG.screenPx * 0.99);
    expect(dirt / DIG.screenPx).toBeGreaterThanOrEqual(60);
    // Every layer is a whole number of tiles; the surface is one picture at the very end.
    for (const l of DIRT) expect(l.height % DIG.tile, l.id).toBe(0);
    expect(DEEP.at(-1)).toMatchObject({ id: 'kerguelen', height: SURFACE_PX });
  });

  it('granite, mantle, outer core, inner core, then mirrored back up, ocean crust, seafloor, the Southern Ocean, and the Kerguelen Islands', () => {
    expect(DEEP.map((l) => l.name)).toEqual(['Basement granite', 'Mantle', 'Outer core', 'Inner core', 'Outer core', 'Mantle', 'Ocean crust', 'Seafloor', 'Southern Ocean', 'Kerguelen Islands']);
    // Mirrored: the same heights either side of the inner core.
    expect(DEEP[4].height).toBe(DEEP[2].height);
    expect(DEEP[5].height).toBe(DEEP[1].height);
    // Thick layers: the mantle alone is a dozen screens, each time.
    expect(DEEP[1].height / DIG.screenPx).toBeGreaterThan(10);
    // Real depths: crust 35 km, mantle to 2,890, outer core to 5,150, and the same counted back from the far side.
    expect(DEEP.map((l) => l.km).slice(0, 3)).toEqual([35, 2890, 5150]);
    expect(EARTH).toEqual({ centre: 6371, far: 12742 });
    expect(DEEP[3].km).toBe(12742 - 5150);
    expect(DEEP[4].km).toBe(12742 - 2890);
    for (let i = 1; i < DEEP.length; i++) expect(DEEP[i].km).toBeGreaterThanOrEqual(DEEP[i - 1].km);
    expect(DEEP.at(-1)!.km).toBe(12742);
    expect(Object.keys(UPPER_KM)).toEqual(FORMATIONS.map((f) => f.id));
    expect(UPPER_KM.reef).toBeLessThan(DEEP[0].km);
  });

  it('each layer changes colour slowly from its top to its foot; where two layers mirror each other so do their colours', () => {
    for (const l of DIRT) expect(layerBackground(l.id), l.id).toMatch(/^linear-gradient\(#[0-9a-f]{6}, #[0-9a-f]{6}( 50%, #[0-9a-f]{6})?\)$/);
    const ends = (id: Dirt) => layerBackground(id).match(/#[0-9a-f]{6}/g)!;
    expect(ends('mantleUp')).toEqual([...ends('mantle')].reverse());
    expect(ends('outerCoreUp')).toEqual([...ends('outerCore')].reverse());
    // The inner core is the same at both ends, brightest at its middle: the centre of the Earth.
    expect(ends('innerCore')[0]).toBe(ends('innerCore')[2]);
    expect(layerBackground('kerguelen')).toBe('#bfe3f2');
  });
});

describe('the dirt is procedural, and only drawn near the screen', () => {
  it('a tile is a small seeded drawing: always the same, no two alike, flat and light', () => {
    for (const l of DIRT) {
      const id = l.id as Dirt;
      const a = tileSvg(id, 0, 390), b = tileSvg(id, 1, 390);
      expect(a, id).toContain(`viewBox="0 0 390 ${DIG.tile}"`);
      expect(tileSvg(id, 0, 390), id).toBe(a);
      expect(b, id).not.toBe(a);
      expect(a, id).not.toMatch(/filter|Gradient|mask|<image|<rect|NaN/);
      expect(a.match(/<(path|ellipse|circle)/g)!.length, id).toBeLessThanOrEqual(130);
      expect(tilesIn(id)).toBe(l.height / DIG.tile);
    }
  });

  it("the mirrored layers draw their twin's tiles in reverse order, turned over", () => {
    const body = (id: Dirt, k: number) => tileSvg(id, k, 390).replace(/^<svg[^>]*><g[^>]*>/, '');
    const n = tilesIn('mantle');
    expect(body('mantleUp', 0)).toBe(body('mantle', n - 1));
    expect(body('mantleUp', n - 1)).toBe(body('mantle', 0));
    expect(body('outerCoreUp', 3)).toBe(body('outerCore', tilesIn('outerCore') - 4));
    expect(tileSvg('mantleUp', 0, 390)).toContain('scale(1 -1)');
    expect(tileSvg('mantle', 0, 390)).not.toContain('scale(1 -1)');
  });

  it('only the tiles within a screen of what shows are wanted: a handful, however long the layer', () => {
    const n = tilesIn('mantle');
    expect(n).toBeGreaterThan(20);
    // The screen is 844 px tall, somewhere in the middle of the mantle.
    const mid = tilesNear('mantle', 5000, 5844);
    expect(mid[0]).toBe(Math.floor((5000 - 844) / DIG.tile));
    expect(mid.at(-1)).toBe(Math.floor((5844 + 844) / DIG.tile));
    expect(mid.length).toBeLessThanOrEqual(8);
    // At the layer's ends the range is cut to the layer; far from the layer there is nothing.
    expect(tilesNear('mantle', -300, 544)[0]).toBe(0);
    expect(tilesNear('mantle', 10000, 10844).at(-1)).toBe(n - 1);
    expect(tilesNear('mantle', -5000, -4156)).toEqual([]);
    expect(tilesNear('mantle', 20000, 20844)).toEqual([]);
    expect(tilesNear('kerguelen', 0, 400)).toEqual([]);
  });

  it('the fixed pieces: each layer has its top line, the seafloor its seabed, the far surface its island, penguin and seal', () => {
    expect(layerEdge('mantle', 390)).toContain('viewBox="0 0 390 10"');
    expect(seabedSvg(390)).toContain('viewBox="0 0 390 44"');
    const k = kerguelenSvg(390);
    expect(k).toContain(`viewBox="0 0 390 ${SURFACE_PX}"`);
    // Everything on the far side is drawn upside down: we come up underneath it.
    expect(k.match(/scale\([\d.]+ -[\d.]+\)/g)!.length).toBeGreaterThanOrEqual(5);
    expect(kerguelenSvg(390)).toBe(k);
  });
});

describe('the depth pill, in real km', () => {
  it('0 at the grass, 6,371 at the centre, 12,742 at the island', () => {
    expect(depthKm(0, marks)).toBe(0);
    expect(depthKm(16, marks)).toBe(0);
    expect(depthKm(deepTop('innerCore') + DEEP[3].height / 2, marks)).toBe(6371);
    expect(depthKm(deepTop('kerguelen'), marks)).toBe(12742);
    expect(depthKm(999999, marks)).toBe(12742);
    // Layer boundaries read their real depths.
    expect(depthKm(3800, marks)).toBe(4);
    expect(depthKm(deepTop('mantle'), marks)).toBe(35);
    expect(depthKm(deepTop('outerCore'), marks)).toBe(2890);
    expect(depthKm(deepTop('innerCore'), marks)).toBe(5150);
    expect(depthKm(deepTop('outerCoreUp'), marks)).toBe(7592);
    expect(depthKm(deepTop('mantleUp'), marks)).toBe(9852);
    // It only ever goes up as the page goes down.
    let last = -1;
    for (let y = 0; y < 60000; y += 137) { const km = depthKm(y, marks); expect(km).toBeGreaterThanOrEqual(last); last = km; }
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

describe('Dug Through: a hidden entry, the stopwatch and the swipes', () => {
  it('the stopwatch reads minutes, seconds and tenths', () => {
    expect([0, 99, 7400, 59999, 60000, 723900].map(clockText)).toEqual(['0:00.0', '0:00.0', '0:07.4', '0:59.9', '1:00.0', '12:03.9']);
  });

  it('Dug Through stays hidden until it is earned: no card for it before, a card after', () => {
    const entry = LOG_ENTRIES.find((e) => e.id === 'dug')!;
    expect(entry).toMatchObject({ name: 'Dug Through', hidden: true });
    expect(LOG_ENTRIES.filter((e) => e.hidden).map((e) => e.id)).toEqual(['dug']);
    expect(LOG_ENTRIES).toHaveLength(28);
    const fresh = parseLog(null);
    expect(shownEntries(fresh)).toHaveLength(27);
    expect(shownEntries(fresh).some((e) => e.id === 'dug')).toBe(false);
    const dug = recordDig(fresh, 60000, 40).log;
    expect(shownEntries(dug)).toHaveLength(28);
    expect(dugStill()).toContain('class="egg-still dug-still"');
  });

  it('reaching the island finds it and keeps the bests: the shortest time and the fewest swipes, each on its own', () => {
    const first = recordDig(parseLog(null), 72400, 37);
    expect(first).toMatchObject({ isNew: true, count: 1, best: 72400, bestSwipes: 37, newBest: true, fewest: true, completed: false });
    expect(first.log).toMatchObject({ found: ['dug'], dug: 72400, dugSwipes: 37 });
    // Slower, with more swipes: nothing changes. Found only once.
    const worse = recordDig(first.log, 90000, 50);
    expect(worse).toMatchObject({ isNew: false, best: 72400, bestSwipes: 37, newBest: false, fewest: false });
    // Fewer swipes but slower: only the swipes improve. Then quicker with more swipes: only the time.
    const fewer = recordDig(worse.log, 80000, 31);
    expect(fewer).toMatchObject({ best: 72400, bestSwipes: 31, newBest: false, fewest: true });
    const quicker = recordDig(fewer.log, 58000, 44);
    expect(quicker).toMatchObject({ best: 58000, bestSwipes: 31, newBest: true, fewest: false });
    expect(quicker.log.found).toEqual(['dug']);
    // Saved and read back; nonsense is dropped.
    expect(parseLog(JSON.stringify({ v: 3, ...quicker.log }))).toMatchObject({ dug: 58000, dugSwipes: 31 });
    expect(parseLog(JSON.stringify({ v: 3, found: ['dug'], dug: -5, dugSwipes: 3 })).dug).toBeUndefined();
    expect(parseLog(JSON.stringify({ v: 3, found: ['dug'], dug: 5000, dugSwipes: 2.5 })).dugSwipes).toBeUndefined();
  });

  it('it counts toward the camo unlock: every other entry is not enough, and the dig can be the one that completes the log', () => {
    let log = parseLog(null);
    for (const e of LOG_ENTRIES.filter((x) => x.id !== 'dug')) log = record(log, e.id as Sighting).log;
    expect(complete(log)).toBe(false);
    expect(log.camoEarned).toBe(false);
    const done = recordDig(log, 60000, 30);
    expect(done.completed).toBe(true);
    expect(done.log.camoEarned).toBe(true);
  });
});

describe('finds in the dirt (dig-finds.ts)', () => {
  it('sparse: a diamond in the mantle, a lunchbox dead on the centre, a whale in the ocean, with their lines', () => {
    expect(ODDITIES).toBe(DIG_FINDS);
    expect(DIG_FINDS.map((o) => [o.id, o.layer])).toEqual([['diamond', 'mantle'], ['lunchbox', 'innerCore'], ['whale', 'ocean']]);
    expect(BURIED_LINES.diamond).toBe('Pressure makes diamonds.');
    expect(BURIED_LINES.lunchbox).toBe('Halfway. Snack break.');
    expect(BURIED_LINES.whale).toBe('Long way from Alberta.');
    expect(DIG_FINDS.find((o) => o.id === 'lunchbox')!.at).toBe(0.5);
    for (const o of DIG_FINDS) {
      expect(oddityArt(o.id)).toContain(`viewBox="0 0 ${o.w} ${o.h}"`);
      for (const w of [343, 358, 398]) {
        const layer = DEEP.find((l) => l.id === o.layer)!, b = oddityBox(o, w, layer.height);
        expect(Math.min(b.hitW, b.hitH)).toBeGreaterThanOrEqual(44);
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.left + b.hitW).toBeLessThanOrEqual(w - 60); // clear of the depth pill on the right
        expect(b.top).toBeGreaterThan(40);
        expect(b.top + b.hitH).toBeLessThan(layer.height);
      }
    }
  });

  it('empty slots are marked for future gag finds: spread through the dirt, clear of the finds and of each other', () => {
    expect(DIG_SLOTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(DIG_SLOTS.map((s) => s.slot)).size).toBe(DIG_SLOTS.length);
    const y = (layer: string, at: number) => deepTop(layer) + at * DEEP.find((l) => l.id === layer)!.height;
    const places = [...DIG_SLOTS.map((s) => ({ name: s.slot, y: y(s.layer, s.at), x: s.x })), ...DIG_FINDS.map((f) => ({ name: f.id, y: y(f.layer, f.at), x: f.x }))].sort((a, b) => a.y - b.y);
    for (const s of DIG_SLOTS) {
      expect(DIRT.some((l) => l.id === s.layer), s.slot).toBe(true);
      expect(s.at).toBeGreaterThan(0.05);
      expect(s.at).toBeLessThan(0.95);
      expect(s.x).toBeGreaterThanOrEqual(0.2);
      expect(s.x).toBeLessThanOrEqual(0.82);
    }
    // At least half a screen of dirt between any two places.
    for (let i = 1; i < places.length; i++) expect(places[i].y - places[i - 1].y, `${places[i - 1].name} and ${places[i].name}`).toBeGreaterThan(DIG.screenPx / 2);
    // And they reach from the granite to the ocean.
    expect(new Set(DIG_SLOTS.map((s) => s.layer)).size).toBeGreaterThanOrEqual(7);
  });
});
