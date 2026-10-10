import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { REGIONS } from '../levels/regions.ts';
import { BALD } from './bald-gags.ts';
import { PAD, POND, PUD2, SB } from './bald-art.ts';
import { GAG_TRIGGERS, PREVIEWS, SHARES, drivesOnSoft } from './gag-triggers.ts';
import { BALD_LINES, WITNESS_LINES } from './lines.ts';
import { BD_SCENE, CW_SCENE } from './scene-stage.ts';
import { LOG_ENTRIES, parseLog } from './wildlife-log.ts';

type Gag = { name: string; dur: number; still: number; beats: [number, string, string][]; lead: (E: number) => number; tail: (E: number) => number; render: (t: number, E: number) => string; back?: (t: number, E: number) => string; front?: (t: number, E: number) => string; over: (t: number, E: number) => string; backY?: number; frontY?: number; lines?: { key: string; from: number; to: number; mouth: (t: number) => { x: number; y: number } }[] };
const gags = BALD as unknown as Record<string, Gag>;
const IDS = ['overweight', 'cranes', 'bison', 'hare', 'ice', 'frogs', 'mosquito'];
const all = (g: Gag, t: number, E: number) => g.render(t, E) + (g.back?.(t, E) ?? '') + (g.front?.(t, E) ?? '') + g.over(t, E);
/** A puppet's own place: its outermost group (the magpie's inner flips are `translate(...) scale(...) translate(...)`). */
const PUPPET = /<g transform="translate\((-?[\d.]+) (-?[\d.]+)\) scale\((?:-?0\.\d+)(?: -?0\.\d+)?\)">/g;
const moving = (g: Gag, t: number, E: number) => g.render(t, E) + (g.back?.(t, E) ?? '') + (g.front?.(t, E) ?? '');

describe("Baldonnel's seven sightings (job U6b)", () => {
  it('the seven of the reference page, by name, length and still', () => {
    expect(Object.keys(gags)).toEqual(IDS);
    expect(IDS.map((id) => [gags[id].name, gags[id].dur, gags[id].still])).toEqual([
      ['Overweight', 13.2, 6.9], ['Two Left Feet', 12.8, 7.9], ['Right of Way', 14.4, 10.8], ['Half Dressed', 11.4, 6.6], ['Last Ice', 12.6, 8.4], ['Late Croak', 10.8, 7.8], ['Lunch to Go', 8.0, 4.9],
    ]);
  });

  it("every beat of the page, in order, at the page's own time", () => {
    const page = readFileSync(`${process.env.HOME}/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html`, 'utf8');
    for (const id of IDS) {
      const m = page.match(new RegExp(`GAGS\\.push\\(\\{id:'${id}'[^\\n]*\\n notes:[^\\n]*\\n beats:(\\[.*\\]),\\n`))!;
      const theirs = [...m[1].matchAll(/\[([\d.]+),'((?:[^'\\]|\\.)*)'\]/g)].map((b) => [Number(b[1]), b[2]]);
      expect(gags[id].beats.map(([t, , text]) => [t, text]), id).toEqual(theirs);
      const names = gags[id].beats.map((b) => b[1]);
      expect(new Set(names).size, id).toBe(names.length);
      for (const n of names) expect(n).toMatch(/^[a-z0-9-]+$/);
      for (let i = 1; i < theirs.length; i++) expect(gags[id].beats[i][0]).toBeGreaterThanOrEqual(gags[id].beats[i - 1][0]);
    }
  });

  it('SAME START, SAME END: nothing is drawn at the start of its clock or at its end, on the page\'s width and on wider screens', () => {
    for (const id of IDS) for (const E of [0, 60, 97, 160, 240]) {
      const g = gags[id], t0 = -g.lead(E), t1 = g.dur + g.tail(E);
      // What it draws at both ends lies wholly outside the screen (the world from -E to 390 + E), or is nothing.
      for (const t of [t0, t1]) {
        const xs = [...moving(g, t, E).matchAll(PUPPET)].map((m) => Number(m[1]));
        for (const x of xs) expect(x < -E - 20 || x > 390 + E + 20, `${id} at ${t.toFixed(2)} (E ${E}): something stands at x ${x}`).toBe(true);
      }
      // In the middle it is on the screen.
      expect(moving(g, g.still, E).length, id).toBeGreaterThan(200);
    }
  });

  it('never a bad number in a frame, at any width', () => {
    for (const id of IDS) for (const E of [0, 97, 240]) {
      const g = gags[id];
      for (let t = -g.lead(E); t <= g.dur + g.tail(E); t += 0.04) expect(/NaN|undefined|Infinity/.test(all(g, t, E)), `${id} at ${t.toFixed(2)}`).toBe(false);
    }
  });

  it('whoever comes in arrives at the page\'s first place at the page\'s time: the wider screen only adds road outside it', () => {
    const g = gags as unknown as Record<string, Record<string, (t: number) => number>>;
    expect(g.overweight.mx(0)).toBeCloseTo(-40);
    expect(g.overweight.mx(2.0)).toBeCloseTo(128);
    expect(g.overweight.mx(-0.5)).toBeLessThan(-100);
    expect(g.cranes.mx(4.4)).toBeCloseTo(430);
    expect(g.cranes.mx(3.9)).toBeGreaterThan(500);
    expect(g.bison.bx(0)).toBeCloseTo(-120);
    expect(g.bison.tx(2.2)).toBeCloseTo(-90);
    expect(g.bison.tx(3.6)).toBeCloseTo(80);
    expect(g.bison.tx(11)).toBeLessThan(-150);
    expect(g.hare.hx(0)).toBeCloseTo(430);
    expect(g.hare.wkx(5.6)).toBeCloseTo(-40);
    expect(g.hare.wkx(9.9)).toBeCloseTo(440);
    expect(g.ice.px(2.6)).toBeCloseTo(290);
    expect(g.frogs.wx(5.5)).toBeCloseTo(PUD2.x + 10);
    expect(g.mosquito.mx(1.8)).toBeCloseTo(262);
  });

  it('NOTHING ABOVE THE STRIP: the flyers come and go low, inside the strip, at any width', () => {
    // (The strip's layers lie under the board: what is above the strip's top would be cut off by the berm. The page's
    // cranes and magpie come down out of the sky above its picture; here they glide in from the screen's edge.)
    const g = gags as unknown as { cranes: { cr: (i: number, t: number, E: number) => { x: number; y: number } }; overweight: { bird: (t: number, E: number) => { x: number; y: number } | null }; mosquito: { bug: (t: number, E: number) => { x: number; y: number } | null } };
    for (const E of [0, 97, 240]) {
      for (let t = 0; t <= 12.8; t += 0.05) for (const i of [0, 1]) {
        const c = g.cranes.cr(i, t, E);
        // A crane is about 48 units tall: with its feet at 96 or lower its head is under the strip's top.
        if (c.x > -E - 30 && c.x < 390 + E + 30) expect(c.y, `crane ${i} at ${t.toFixed(2)} (E ${E})`).toBeGreaterThanOrEqual(BD_SCENE.top + 44);
      }
      for (let t = 8.1; t <= 13; t += 0.05) { const b = g.overweight.bird(t, E); if (b && b.x > -E && b.x < 390 + E) expect(b.y, `the magpie at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(BD_SCENE.top + 39); }
      for (let t = 2.8; t <= 8; t += 0.05) { const b = g.mosquito.bug(t, E); if (b && b.x < 390 + E) expect(b.y).toBeGreaterThanOrEqual(BD_SCENE.top + 8); }
      // They start and end beyond the screen's edge, however wide it is.
      expect(g.cranes.cr(0, 0.21, E).x).toBeLessThan(-E - 40);
      expect(g.overweight.bird(8.1, E)!.x).toBeGreaterThan(390 + E + 30);
      expect(g.mosquito.bug(2.8, E)!.x).toBeGreaterThan(390 + E + 20);
    }
  });

  it("the scene is cropped to Clearwater's height, so the characters stand at Clearwater's in-game size", () => {
    expect(BD_SCENE.floor - BD_SCENE.top).toBe(CW_SCENE.floor - CW_SCENE.top);
  });

  it('the lanes: Right of Way behind and in front of the lane, Last Ice on the pond, the frogs in the puddle', () => {
    expect(gags.bison.backY).toBeLessThan(150);
    expect(gags.bison.frontY).toBeGreaterThan(150);
    // Moe is behind his truck while he walks its far side, in front once he is round it.
    expect(gags.bison.back!(5.3, 0)).toContain('<g');
    expect(gags.bison.front!(5.3, 0)).toBe('');
    expect(gags.bison.front!(6.4, 0)).toContain('<g');
    expect(gags.bison.back!(6.4, 0)).toBe('');
    // Last Ice: nothing on the walking lane at all; its line is the pond's.
    expect(gags.ice.render(6, 0)).toBe('');
    expect(gags.ice.back!(6, 0).length).toBeGreaterThan(500);
    expect(gags.ice.backY).toBe(POND.surf + 3);
    expect(gags.frogs.frontY).toBe(PUD2.y + 5);
    expect(gags.frogs.front!(3, 0)).toContain('pudclip');
    // The hare's places are against the snowbank where the reference has it, and Moe's against the scale.
    expect(SB).toEqual({ x0: 38, x1: 98, top: 118, base: 147 });
    expect(PAD).toEqual({ x0: 150, x1: 200, y: 145 });
  });

  it('sound words are on the layer over everything; the three lines are the game\'s own bubbles, not drawn', () => {
    for (const id of IDS) {
      const g = gags[id];
      for (let t = 0; t <= g.dur; t += 0.1) expect(/<text/.test(moving(g, t, 0)), `${id} at ${t.toFixed(1)}`).toBe(false);
    }
    expect(gags.overweight.over(2.9, 0)).toContain('clank');
    expect(gags.bison.over(4.0, 0)).toContain('BEEP BEEP');
    expect(gags.frogs.over(7.8, 0)).toContain('CREEK');
    expect(BALD_LINES).toEqual({ shoo: 'Shoo!', got: 'Got one!', hey: 'Hey!' });
    expect(IDS.flatMap((id) => (gags[id].lines ?? []).map((l) => [id, l.key, l.from, l.to]))).toEqual([['bison', 'shoo', 6.0, 6.8], ['ice', 'got', 4.4, 5.2], ['mosquito', 'hey', 5.1, 6.0]]);
    for (const id of IDS) for (const l of gags[id].lines ?? []) { const m = l.mouth(l.from); expect(Number.isFinite(m.x) && Number.isFinite(m.y)).toBe(true); expect(all(gags[id], l.from + 0.1, 0)).not.toContain(BALD_LINES[l.key]); }
  });

  it('the scale\'s needle: at rest before and after, deep in the red while Moe is on it, green for the magpie', () => {
    const needle = (gags.overweight as unknown as { needle: (t: number) => number }).needle;
    expect(needle(0)).toBe(-70);
    expect(needle(13.2)).toBe(-70);
    expect(needle(3.5)).toBeGreaterThan(18);
    expect(needle(9.5)).toBeLessThan(-8);
    expect(needle(9.5)).toBeGreaterThan(-62);
  });

  it('triggers: Baldonnel only, as Jay set them; a preview and a witness line each; who shares what', () => {
    const T = GAG_TRIGGERS;
    expect([T.overweight, T.cranes, T.bison, T.hare, T.ice, T.frogs, T.mosquito]).toEqual([
      { region: 'baldonnel', patchPushes: 3 }, { region: 'baldonnel', skyTaps: 3 }, { region: 'baldonnel', signTaps: 1 }, { region: 'baldonnel', snowbankTaps: 3 },
      { region: 'baldonnel', pondTaps: 1 }, { region: 'baldonnel', puddleTaps: 1 }, { region: 'baldonnel', patchDrives: 3 },
    ]);
    for (const id of IDS) {
      expect(PREVIEWS[id]).toEqual({ gag: id, region: 'baldonnel', level: 1 });
      expect((WITNESS_LINES as Record<string, string>)[id].length).toBeGreaterThan(5);
      expect((SHARES as Record<string, string[]>)[id].length).toBeGreaterThan(0);
    }
  });

  it('Lunch to Go counts a pickup driven across or onto a patch: never a rig, never one that only drives off', () => {
    const soft = [{ row: 2, col: 3 }];
    const pickup = { orient: 'h' as const, row: 2, col: 0, length: 2 };
    expect(drivesOnSoft(soft, pickup, 1)).toBe(false);
    expect(drivesOnSoft(soft, pickup, 2)).toBe(true);
    expect(drivesOnSoft(soft, pickup, 4)).toBe(true);
    expect(drivesOnSoft(soft, { ...pickup, col: 4 }, -1)).toBe(true);
    expect(drivesOnSoft(soft, { ...pickup, col: 4 }, -4)).toBe(true);
    // Standing on it and driving off, either way: not counted.
    expect(drivesOnSoft(soft, { ...pickup, col: 2 }, 2)).toBe(false);
    expect(drivesOnSoft(soft, { ...pickup, col: 3 }, -2)).toBe(false);
    expect(drivesOnSoft(soft, { ...pickup, row: 3 }, 4)).toBe(false);
    expect(drivesOnSoft(soft, { orient: 'v', row: 0, col: 3, length: 2 }, 1)).toBe(true);
    expect(drivesOnSoft(soft, { ...pickup, length: 3 }, 1)).toBe(false);
    expect(drivesOnSoft([], pickup, 4)).toBe(false);
    // WHERE IT CAN BE DONE, on the ten levels as job U6 left them: on levels 1, 5, 6, 7 and 8 one pickup has a patch in its
    // lane, and that patch lies in its gate's own cell, so it crosses the patch only on its way OUT (once; three times
    // means driving out, Undo, and again). On 2, 3, 4, 9 and 10 no pickup can reach a patch at all. (The levels are not
    // this job's to change: Jay has been told.)
    const can = REGIONS.find((r) => r.id === 'baldonnel')!.levels.map((l) => l.trucks.some((t) => t.length === 2 && l.soft.some((c) => (t.orient === 'h' ? c.row === t.row : c.col === t.col))));
    expect(can).toEqual([true, false, false, false, true, true, true, true, false, false]);
  });

  it("the Wildlife Log: seven cards with the page's log lines, riddles and plain hints; camo earned before them stays", () => {
    const want: Record<string, [string, string, string, string]> = {
      overweight: ['Overweight', 'Overweight. Again.', "Spring roads can't take the weight. Neither can the scale.", 'In Baldonnel, push a 3-cell rig into a road ban patch 3 times.'],
      cranes: ['Two Left Feet', 'Not his best move.', 'Something tall is dancing up there. Ask it down.', 'In Baldonnel, tap the sky 3 times.'],
      bison: ['Right of Way', 'Bison always win.', 'That sign is not a suggestion.', 'In Baldonnel, tap the bison sign.'],
      hare: ['Half Dressed', 'Half ready for spring.', 'Someone is changing behind the snowbank.', 'In Baldonnel, tap the snowbank 3 times.'],
      ice: ['Last Ice', 'Always a bigger fish.', 'One more cast before breakup.', 'In Baldonnel, tap the ice on the pond.'],
      frogs: ['Late Croak', 'Missed the cue.', 'The puddle has a choir. One member is late.', 'In Baldonnel, tap the puddle.'],
      mosquito: ['Lunch to Go', 'Takeout.', 'Soft ground, wet ground, hungry ground.', 'In Baldonnel, drive a pickup over a road ban patch 3 times.'],
    };
    const page = readFileSync(`${process.env.HOME}/Desktop/RHR Art Inbox/baldonnel_sightings_reference.html`, 'utf8').replace(/’/g, "'");
    for (const id of IDS) {
      const e = LOG_ENTRIES.find((x) => x.id === id)!;
      expect([e.name, e.caption, e.riddle, e.hint], id).toEqual(want[id]);
      // Word for word the page's (its typographic apostrophes aside).
      expect(page).toContain(`Log card: “${e.caption}” Riddle: “${e.riddle}” Plain hint: “${e.hint}”`);
    }
    expect(LOG_ENTRIES).toHaveLength(40);
    // A log that had every sighting before Baldonnel, with its camo earned: still earned, though seven are now unfound.
    const before = LOG_ENTRIES.filter((e) => !IDS.includes(e.id)).map((e) => e.id);
    const old = parseLog(JSON.stringify({ v: 3, found: before, camo: true, camoEarned: true }));
    expect(old.camoEarned).toBe(true);
    expect(old.found).toHaveLength(33);
    // A new player needs all forty.
    expect(parseLog(JSON.stringify({ v: 3, found: before, camo: true })).camoEarned).toBe(false);
    expect(parseLog(JSON.stringify({ v: 3, found: LOG_ENTRIES.map((e) => e.id), camo: true })).camoEarned).toBe(true);
  });
});
