import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { BETWEEN, BORE_CLEAR, BURIED, FORMATIONS, GLINTS, GRASS, GROUP, buriedArt, buriedBox, layersFrom, pillLocked, strataSvg, tunnelSvg, type FormationId } from './log-dig.ts';
import { BURIED_LINES } from './lines.ts';
import { LOG_ENTRIES } from './wildlife-log.ts';
import { DIG_FINDS } from './dig-finds.ts';

const WIDTHS = [343, 358, 398]; // the cards' column at 375, 390 and 430 px
const ends = () => {
  // A page like the real one: groups of cards about 342 px tall, each formation's window after its group.
  const out = {} as Record<Exclude<FormationId, 'grass'>, number>;
  let y = 34, groups = 0;
  for (const f of FORMATIONS.slice(1)) {
    while (groups < Math.min(f.after, 7)) { y += 342; groups++; }
    y += f.window;
    out[f.id as Exclude<FormationId, 'grass'>] = y;
  }
  return out;
};

describe('the dig: formations', () => {
  it('ONE REAL WELL COLUMN near Fox Creek, top to bottom', () => {
    expect(FORMATIONS.map((f) => f.name)).toEqual([
      'Grass', 'Topsoil', 'Glacial till', 'Wapiti Fm', 'Puskwaskau shale', 'Cardium Fm', 'Colorado Group shale', 'Mannville Group', 'Fernie Fm', 'Montney Fm',
      'Belloy / Debolt', 'Exshaw (Alberta Bakken)', 'Wabamun Group', 'Ireton shale', 'Duvernay shale', 'Leduc reef', 'Beaverhill Lake', 'Elk Point Group', 'Cambrian sandstone',
    ]);
    expect(GROUP).toBe(4);
    // Windows open after one group of cards, then two, up to six; the rest lie below every card.
    expect(BETWEEN).toBe(6);
    expect(FORMATIONS.map((f) => f.after)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
    for (const f of FORMATIONS.slice(1)) expect(f.window, f.id).toBeGreaterThanOrEqual(84);
    // Real depths, always deeper: the Cardium above the Mannville above the Montney above the Exshaw above the Duvernay.
    for (let i = 1; i < FORMATIONS.length; i++) expect(FORMATIONS[i].km, FORMATIONS[i].id).toBeGreaterThan(FORMATIONS[i - 1].km);
    expect(FORMATIONS.at(-1)!.km).toBeLessThan(5);
    // The Leduc reef lies in the Duvernay, under the Ireton and over the Beaverhill Lake.
    const ids = FORMATIONS.map((f) => f.id);
    expect(ids.slice(ids.indexOf('ireton'), ids.indexOf('ireton') + 4)).toEqual(['ireton', 'duvernay', 'reef', 'beaverhill']);
  });

  it("every region has its formation, and its pill is greyed until the region is unlocked", () => {
    // (Clearwater has no pill in the dig yet: the log and its sightings are a later job.)
    expect(FORMATIONS.filter((f) => f.region).map((f) => f.region).sort()).toEqual(REGIONS.map((r) => r.id).filter((id) => id !== 'clearwater').sort());
    const open = (id: string) => id === 'cardium' || id === 'montney';
    expect(FORMATIONS.filter((f) => pillLocked(f, open)).map((f) => f.id)).toEqual(['mannville', 'exshaw', 'duvernay']);
    expect(FORMATIONS.filter((f) => pillLocked(f, () => true))).toEqual([]);
    // Rock that is not a region is never greyed.
    for (const f of FORMATIONS.filter((x) => !x.region)) expect(pillLocked(f, () => false), f.id).toBe(false);
  });

  it('the layers are one continuous section: each starts where the one above ends', () => {
    const layers = layersFrom(ends());
    expect(layers.map((l) => l.id)).toEqual(FORMATIONS.map((f) => f.id));
    expect(layers[0]).toEqual({ id: 'grass', top: 0, bottom: GRASS });
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i].top).toBe(layers[i - 1].bottom);
      expect(layers[i].bottom).toBeGreaterThan(layers[i].top);
    }
  });

  it('drawn as ONE svg, every layer in order, with a wellbore from the surface into the reservoir', () => {
    const layers = layersFrom(ends());
    const svg = strataSvg(375, layers, 187, GRASS - 6);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect([...svg.matchAll(/data-layer="(\w+)"/g)].map((m) => m[1])).toEqual(FORMATIONS.map((f) => f.id));
    const reef = layers.find((l) => l.id === 'reef')!;
    const td = Number(/data-td="(\d+)"/.exec(svg)![1]), top = Number(/data-top="(\d+)"/.exec(svg)![1]);
    expect(top).toBeLessThanOrEqual(GRASS);
    expect(td).toBeGreaterThan(reef.top + 40);
    expect(td).toBeLessThan(reef.bottom);
    expect(svg).toContain('class="wellhead"');
    // The same every time, and light enough to scroll: no filters, no gradients, no masks, under 1,200 shapes.
    expect(strataSvg(375, layers, 187, GRASS - 6)).toBe(svg);
    expect(svg).not.toMatch(/filter|Gradient|mask|clip-path|<image/);
    expect(svg.match(/<(path|ellipse|circle|rect)/g)!.length).toBeLessThan(2000);
    expect(GLINTS.length).toBeGreaterThanOrEqual(6);
  });
});

describe('the dig: buried things', () => {
  it('fifteen of them, each in its formation', () => {
    expect(BURIED.map((b) => b.id).sort()).toEqual(['ammonite', 'bit', 'chest', 'den', 'dino', 'egg', 'golf', 'keys', 'phone', 'plane', 'plesiosaur', 'remote', 'sock', 'trilobite', 'tusk']);
    const where = Object.fromEntries(BURIED.map((b) => [b.id, b.in]));
    expect(where).toMatchObject({ den: 'topsoil', phone: 'topsoil', chest: 'till', tusk: 'till', plane: 'till', egg: 'wapiti', dino: 'wapiti', ammonite: 'puskwaskau', plesiosaur: 'cardium', bit: 'exshaw', trilobite: 'cambrian' });
    for (const b of BURIED) expect(FORMATIONS.find((f) => f.id === b.in)!.window, b.id).toBeGreaterThan(0);
  });

  it('they are not log entries', () => {
    const ids = new Set<string>(LOG_ENTRIES.map((e) => e.id));
    for (const b of BURIED) expect(ids.has(b.id), b.id).toBe(false);
  });

  it('each has a drawing with the toy outline and one short line, with no em dash', () => {
    // (Besides the buried things: the oil's own line, and the finds deeper down, log-deep.ts.)
    expect(Object.keys(BURIED_LINES).sort()).toEqual([...BURIED.map((b) => b.id), 'reservoir', ...DIG_FINDS.map((f) => f.id)].sort());
    expect(BURIED_LINES.reservoir).toBe('You made it. The pumpjack says hi.');
    expect(BURIED_LINES.reservoir.length).toBeLessThanOrEqual(40);
    for (const b of BURIED) {
      expect(buriedArt(b.id), b.id).toContain('#2a1a0c');
      expect(buriedArt(b.id), b.id).toContain(`viewBox="0 0 ${b.w} ${b.h}"`);
      const line = BURIED_LINES[b.id];
      expect(line.length, b.id).toBeGreaterThan(3);
      expect(line.length, b.id).toBeLessThanOrEqual(40);
      expect(line, b.id).not.toMatch(/[—–\n]/);
    }
    // The egg can crack, peek and close.
    for (const part of ['egg-shell', 'egg-crack', 'egg-peek', 'egg-eye']) expect(buriedArt('egg')).toContain(part);
  });

  it.each(WIDTHS)('at %i px: each is a full tap target inside its window, clear of the pill, the wellbore and the others', (width) => {
    const boxes = BURIED.map((b) => ({ b, ...buriedBox(b, width), win: FORMATIONS.find((f) => f.id === b.in)!.window }));
    for (const x of boxes) {
      expect(Math.min(x.hitW, x.hitH), x.b.id).toBeGreaterThanOrEqual(44);
      expect(x.left, x.b.id).toBeGreaterThanOrEqual(0);
      expect(x.left + x.hitW, x.b.id).toBeLessThanOrEqual(width);
      expect(x.top, x.b.id).toBeGreaterThanOrEqual(0);
      expect(x.top + x.hitH, x.b.id).toBeLessThanOrEqual(x.win);
      // Clear of the wellbore down the middle.
      const clear = x.left + x.hitW <= width / 2 - BORE_CLEAR + 1 || x.left >= width / 2 + BORE_CLEAR - 1;
      expect(clear, `${x.b.id} at ${x.left}..${x.left + x.hitW} of ${width}`).toBe(true);
      // Clear of its formation's pill (top left, 36 px tall; 140 px wide at most, the long Exshaw one 215).
      expect(x.left >= (x.b.in === 'exshaw' ? 215 : 140) || x.top >= 36, x.b.id).toBe(true);
    }
    for (const a of boxes) for (const c of boxes) {
      if (a === c || a.b.in !== c.b.in) continue;
      const apart = a.left + a.hitW <= c.left || c.left + c.hitW <= a.left || a.top + a.hitH <= c.top || c.top + c.hitH <= a.top;
      expect(apart, `${a.b.id} and ${c.b.id}`).toBe(true);
    }
    expect(tunnelSvg(width)).toContain('class="dig-tunnel"');
  });
});
