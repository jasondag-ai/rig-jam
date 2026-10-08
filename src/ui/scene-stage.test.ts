import { describe, expect, it } from 'vitest';
import { GAG_TRIGGERS, PREVIEWS } from './gag-triggers.ts';
import { BALE_BOX, ASPEN_BOX, BIG_PUDDLE, LANE_ASPEN, MANN_SIGN_X, MANN_TREES, SCENE, SCENE_MIN, mannFront, mannScene, sceneDef, sceneGeom, skyGeom, tapBox, toScreen, wave3Still } from './scene-stage.ts';
import { BALE_AT, WAVE3, baleAtRest } from './wave3.ts';
import { LOG_ENTRIES } from './wildlife-log.ts';

type Gag = { name: string; dur: number; still: number; beats: [number, string, string][]; lead: (E: number) => number; tail: (E: number) => number; render: (t: number, E: number) => string; over?: (t: number, E: number) => string };
const gags = WAVE3 as unknown as Record<string, Gag>;
const MANN = ['muskeg', 'catTrain', 'beaver', 'aurora'];
// The bottom strip at 390x844, in Safari with its toolbars, at 375x667, and on a 430 wide phone.
const STRIPS: [number, { top: number; bottom: number }][] = [[390, { top: 587, bottom: 737 }], [390, { top: 537, bottom: 637 }], [375, { top: 489, bottom: 560 }], [430, { top: 652, bottom: 825 }]];

describe('the stage for gag wave 3', () => {
  it('a screen that is not laid out yet (0 wide) gives a plain view that does not fit: never a NaN', () => {
    for (const g of [sceneGeom(0, { top: 0, bottom: 0 }), sceneGeom(0, { top: 500, bottom: 600 }), sceneGeom(NaN, { top: 0, bottom: 100 }), sceneGeom(390, { top: NaN, bottom: NaN }), skyGeom(0, { top: 0, height: 0 }), skyGeom(0, { top: 60, height: 120 }), skyGeom(390, { top: NaN, height: NaN })]) {
      expect(g.fits).toBe(false);
      for (const v of [g.s, g.left, g.top, g.worldW, g.worldH, g.E]) expect(Number.isFinite(v)).toBe(true);
      expect(g.worldW).toBeGreaterThan(0);
      expect(g.worldH).toBeGreaterThan(0);
      expect(JSON.stringify(toScreen(g, 100, 100))).not.toMatch(/NaN|null/);
    }
  });

  it('shows the reference strip at the scale the strip allows, centred, standing on the strip floor', () => {
    const g = sceneGeom(390, { top: 587, bottom: 737 });
    expect(g.s).toBe(1);
    expect(g.E).toBe(0);
    expect(toScreen(g, 0, SCENE.floor)).toEqual({ x: 0, y: 737 });
    expect(toScreen(g, 390, SCENE.ground).y).toBe(737 - 18);
    // A shorter strip: smaller, and the screen is wider than the world by E on each side.
    const short = sceneGeom(390, { top: 537, bottom: 637 });
    expect(short.s).toBeCloseTo(100 / 138, 5);
    expect(short.E).toBeCloseTo((390 / short.s - 390) / 2, 5);
    expect(toScreen(short, 195, SCENE.floor).x).toBeCloseTo(195, 6);
    expect(toScreen(short, 195, SCENE.floor).y).toBe(637);
    expect(toScreen(short, -short.E, SCENE.top).x).toBeCloseTo(0, 5);
    expect(toScreen(short, 0, SCENE.top).y).toBeCloseTo(537, 5);
    for (const [w, strip] of STRIPS) expect(sceneGeom(w, strip).fits, `${w} ${strip.bottom - strip.top}`).toBe(true);
    // No room: the gags do not play.
    expect(sceneGeom(375, { top: 439, bottom: 460 }).fits).toBe(false);
    expect(SCENE_MIN).toBeGreaterThan(0.4);
  });

  it('the sky band stands on the top berm', () => {
    const g = skyGeom(390, { top: 64, height: 158 });
    expect(g.s).toBe(1);
    expect(toScreen(g, 195, 144)).toEqual({ x: 195, y: 222 });
    expect(skyGeom(375, { top: 64, height: 77 }).fits).toBe(true);
    expect(skyGeom(375, { top: 64, height: 27 }).fits).toBe(false);
  });
});

describe('the standard Mannville scene', () => {
  it("has the reference's six trees (in the board's own drawings), three muskeg puddles, and the lane aspen apart, in front", () => {
    expect(MANN_TREES.map((t) => t.species)).toEqual(['spruce', 'aspen', 'willow', 'willow', 'aspen', 'spruce']);
    // The right grove and the bush are where the reference has them; the left grove is 56 right, clear of the biffy.
    expect(MANN_TREES.map((t) => t.x)).toEqual([80, 110, 138, 268, 334, 366]);
    for (const [w, strip] of STRIPS) {
      const g = sceneGeom(w, strip);
      const back = mannScene(g), front = mannFront();
      expect(back.match(/<svg /g)).toHaveLength(6);
      expect(back.match(/fill="#4f4a2c"/g)).toHaveLength(3);
      expect(front.match(/<svg /g)).toHaveLength(1);
      expect(mannScene(g)).toBe(back);
      // The biffy (the screen's left 60 px, up by the berm) has no tree in front of it.
      for (const t of MANN_TREES) expect(toScreen(g, t.x - t.h * 0.3, 0).x, `${t.species} at ${w}`).toBeGreaterThan(60 * Math.min(1, g.s) - 1);
    }
    expect(LANE_ASPEN).toMatchObject({ x: 288, h: 122 });
    expect(LANE_ASPEN.base).toBeGreaterThan(SCENE.ground);
    // The sign stands left of the lane aspen's crown.
    expect(MANN_SIGN_X * 390 + 40).toBeLessThan(LANE_ASPEN.x - 30);
  });

  it('the big puddle and the lane aspen are tap targets of at least 44 px, apart from each other', () => {
    for (const [w, strip] of STRIPS) {
      const g = sceneGeom(w, strip);
      const p = tapBox(g, BIG_PUDDLE), a = tapBox(g, ASPEN_BOX);
      for (const b of [p, a]) {
        expect(b.right - b.left).toBeGreaterThanOrEqual(44 - 1e-6);
        expect(b.bottom - b.top).toBeGreaterThanOrEqual(44 - 1e-6);
      }
      expect(p.right, `${w}`).toBeLessThan(a.left);
    }
  });
});

describe('the four Mannville gags (ported: wave3.ts)', () => {
  it("keep the reference's beats and lengths", () => {
    expect(MANN.map((k) => [gags[k].name, gags[k].dur, gags[k].beats.length])).toEqual([['Muskeg Boots', 9.6, 9], ['Cat Train', 12.4, 10], ['Beaver', 11.4, 11], ['Aurora Howl', 11.6, 10]]);
    expect(gags.muskeg.beats.map((b) => b[0])).toEqual([0, 2.0, 2.8, 3.2, 3.6, 4.3, 4.9, 5.0, 8.7]);
    expect(gags.catTrain.beats.map((b) => b[0])).toEqual([0, 4.05, 4.6, 5.2, 6.6, 8.0, 8.5, 9.3, 10.3, 10.6]);
    expect(gags.beaver.beats.map((b) => b[0])).toEqual([0, 2.2, 2.5, 3.3, 4.2, 4.6, 4.8, 6.2, 8.4, 9.0, 9.6]);
    expect(gags.aurora.beats.map((b) => b[0])).toEqual([0, 0.8, 2.8, 3.3, 3.9, 5.0, 5.4, 6.4, 6.8, 10.2]);
    for (const k of MANN) for (const [, id] of gags[k].beats) expect(id).toMatch(/^[a-z-]+$/);
  });

  // Where anything is drawn: every x that a translate() puts a puppet at.
  // (A puppet is `translate(x y) scale(..)`; the beaver's pipe is `translate(x y) rotate(..)` and 65 long each way.)
  const xs = (svg: string) => [
    ...[...svg.matchAll(/translate\((-?[\d.]+) -?[\d.]+\) scale\(/g)].map((m) => Number(m[1])),
    ...[...svg.matchAll(/translate\((-?[\d.]+) -?[\d.]+\) rotate\([^)]*\)"><rect x="-65"/g)].flatMap((m) => [Number(m[1]) - 53, Number(m[1]) + 53]),
  ];
  const drawn = (k: string, t: number, E: number) => gags[k].render(t, E) + (gags[k].over?.(t, E) ?? '');

  it.each(MANN)('%s: same start, same end, at every strip size: nothing is in view on its first or its last frame', (k) => {
    for (const E of [0, 75, 172]) {
      const g = gags[k], t0 = -g.lead(E), t1 = g.dur + g.tail(E);
      for (const t of [t0, t1]) {
        const s = drawn(k, t, E);
        expect(s, `${k} E ${E} t ${t}`).not.toMatch(/NaN|undefined/);
        // Whatever is still drawn stands outside the screen: left of -E or right of 390 + E, by more than its own half width.
        for (const x of xs(s)) expect(x <= -E - 12 || x >= 390 + E + 12, `${k} E ${E} t ${t.toFixed(2)}: something at x ${x}`).toBe(true);
        expect(s).not.toMatch(/<text/);
      }
      // No lights at either end.
      if (k === 'aurora') for (const t of [t0, t1]) expect((g as unknown as { lights: (t: number) => string }).lights(t)).toBe('');
    }
  });

  it("the beaver's pipe makes ONE simple twist: up to upright, carried upright past the aspen, back down (no spin)", () => {
    const angle = (t: number) => +/translate\([-\d. ]+\) rotate\(([-\d.]+)\)/.exec(gags.beaver.render(t, 0))![1];
    for (let t = 0; t <= 11.4; t += 0.05) expect(angle(t), `t ${t.toFixed(2)}`).toBeGreaterThanOrEqual(-90.01);
    for (let t = 0; t <= 11.4; t += 0.05) expect(angle(t), `t ${t.toFixed(2)}`).toBeLessThan(8);
    for (const t of [5.8, 6.2, 7, 8.4]) expect(angle(t)).toBe(-90);
    for (const t of [1, 4.8, 9.0, 10.5]) expect(angle(t)).toBeCloseTo(0, 5);
    // Up once, down once.
    let turns = 0, dir = 0;
    for (let t = 4.8; t <= 9.0; t += 0.02) { const d = Math.sign(Math.round((angle(t + 0.02) - angle(t)) * 100)); if (d && d !== dir) { turns++; dir = d; } }
    expect(turns).toBe(2);
    expect(gags.beaver.beats.map((b) => b[1])).toContain('tilts-pipe');
  });

  it('the coyote slows to his stop and gets going again; his sit is one smooth fold; he leaves behind the trees', () => {
    const a = gags.aurora as unknown as Gag & { cx: (t: number) => number; pace: (t: number) => number; behind: (t: number) => number };
    // No jump in his place or his speed at the stop and the start.
    for (const t of [2.3, 2.8, 7.0, 7.5]) {
      const v0 = (a.cx(t) - a.cx(t - 0.01)) / 0.01, v1 = (a.cx(t + 0.01) - a.cx(t)) / 0.01;
      expect(Math.abs(v1 - v0), `speed at ${t}`).toBeLessThan(6);
    }
    expect(a.cx(2.8)).toBe(190);
    expect(a.cx(5)).toBe(190);
    expect(a.pace(1)).toBe(1);
    expect(a.pace(2.8)).toBe(0);
    expect(a.pace(5)).toBe(0);
    expect(a.pace(8)).toBe(1);
    // Every number of his drawing moves a little at a time through the sit (nothing switches halfway).
    const nums = (t: number) => (a.render(t, 0).match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    // (The haunch grows out from nothing once, right at the start; no part comes or goes after that.)
    let changes = 0;
    for (let t = 3.3; t < 3.7; t += 0.01) if (nums(t).length !== nums(t + 0.01).length) changes++;
    expect(changes).toBeLessThanOrEqual(1);
    for (let t = 3.36; t < 3.7; t += 0.01) {
      const p = nums(t), q = nums(t + 0.01);
      expect(Math.max(...p.map((v, i) => Math.abs(v - q[i]))), `step at ${t.toFixed(2)}`).toBeLessThan(6);
    }
    expect(a.behind(6.7)).toBe(0);
    expect(a.behind(7.1)).toBe(1);
    // Off the screen at both ends, however wide.
    for (const E of [0, 60, 200]) { expect(a.cx(-a.lead(E))).toBeLessThanOrEqual(-45 - E + 0.01 + (a.lead(E) === 0 ? 400 : 0)); expect(a.cx(a.dur + a.tail(E))).toBeGreaterThan(440 + E); }
  });

  it.each(MANN)("%s: between its first beat and its last it keeps the reference's clock whatever the strip (only the walk in and the walk off grow)", (k) => {
    const g = gags[k];
    expect(g.lead(0)).toBe(0);
    expect(g.tail(0)).toBe(0);
    expect(g.lead(100)).toBeGreaterThanOrEqual(0);
    expect(g.tail(100)).toBeGreaterThanOrEqual(0);
    // In the middle of the gag the picture does not depend on E at all (but for the mud's wider clip).
    const mid = g.still;
    const strip = (s: string) => s.replace(/<defs>.*?<\/defs>/, '');
    expect(strip(g.render(mid, 100))).toBe(strip(g.render(mid, 0)));
  });

  it('a walk-in from the wider screen edge is at the reference speed: at t = 0 everyone is where the reference starts them', () => {
    const m = gags.muskeg as unknown as { x: (t: number) => number };
    expect(m.x(0)).toBe(-40);
    expect(m.x(-1)).toBeCloseTo(-40 - 75, 5);
    expect(m.x(2.0)).toBe(110);
    expect(m.x(8.3)).toBeCloseTo(440, 5);
    const b = gags.beaver as unknown as { bx: (t: number) => number };
    expect(b.bx(0)).toBe(-80);
    expect(b.bx(2.2)).toBe(213);
    expect(b.bx(-0.5)).toBeLessThan(-80);
    const c = gags.catTrain as unknown as { train: (t: number) => number; mom: (t: number, E: number) => number };
    expect(c.train(0)).toBe(-40);
    expect(c.train(7)).toBeCloseTo(612, 5);
    expect(c.mom(8.0, 0)).toBe(252);
    expect(c.mom(8.0, 172)).toBe(252);
    expect(c.mom(6.6, 172)).toBeCloseTo(430, 5);
  });

  it('as timelines: the clock starts `lead` early, every later beat is that much later, and it will not play where there is no room', () => {
    const wide = sceneGeom(390, { top: 537, bottom: 637 });
    const def = sceneDef('beaver', 'beaver', () => wide);
    const lead = gags.beaver.lead(wide.E);
    expect(lead).toBeGreaterThan(0.3);
    expect(def.beats[0][0]).toBe(0);
    expect(def.beats[1][0]).toBeCloseTo(2.2 + lead, 6);
    expect(def.end).toBeCloseTo(lead + 11.4 + gags.beaver.tail(wide.E), 6);
    expect(def.stillAt).toBeCloseTo(lead + 5.6, 6);
    const none = sceneDef('beaver', 'beaver', () => sceneGeom(375, { top: 439, bottom: 460 }));
    expect(none.build(() => { throw new Error('no layer should be made'); }, {} as never)).toBeNull();
  });
});

describe('Mannville gags: triggers, previews and the log', () => {
  it('their triggers are in the settings file', () => {
    expect(GAG_TRIGGERS.muskeg).toEqual({ region: 'mannville', puddleTaps: 3 });
    expect(GAG_TRIGGERS.catTrain).toEqual({ region: 'mannville', convoyInOrder: true });
    expect(GAG_TRIGGERS.beaver).toEqual({ region: 'mannville', aspenTaps: 3 });
    expect(GAG_TRIGGERS.aurora).toEqual({ region: 'mannville', moonTaps: 1, night: true });
    for (const name of ['muskeg', 'cattrain', 'beaver', 'aurora']) expect(PREVIEWS[name].region).toBe('mannville');
  });

  it('each has a log card with a flat still of its puppets and a plain hint', () => {
    const by = Object.fromEntries(LOG_ENTRIES.map((e) => [e.id, e]));
    expect(by.muskeg.hint).toBe('In Mannville, tap the big muskeg puddle three times.');
    expect(by.cattrain.hint).toBe('In Mannville, drive a convoy out in order, one right after the other.');
    expect(by.beaver.hint).toBe('In Mannville, tap the tall aspen three times.');
    expect(by.aurora.hint).toBe('In Mannville, wait for night, then tap the moon.');
    for (const [k, t] of [['muskeg', 3.1], ['catTrain', 9.4], ['beaver', 1.6], ['aurora', 4.4]] as const) {
      const still = wave3Still(k, t, [0, 0, 100, 80]);
      expect(still).toContain('class="egg-still wave3-still"');
      expect(still.length).toBeGreaterThan(1500);
      expect(still).not.toMatch(/Gradient|filter=/);
    }
  });
});

describe('the four Bakken gags (ported: wave3.ts) and the standard Bakken scene', () => {
  const BAKKEN = ['tumbleweed', 'pdogs', 'bale', 'cloud'];
  const xs = (svg: string) => [...svg.matchAll(/translate\((-?[\d.]+) -?[\d.]+\) scale\(/g)].map((m) => Number(m[1]));

  it("keep the reference's beats and lengths", () => {
    expect(BAKKEN.map((k) => [gags[k].name, gags[k].dur, gags[k].beats.length])).toEqual([['Tumbleweed', 11.2, 8], ['Prairie Dog Wave', 10.2, 12], ['Runaway Bale', 11.8, 10], ['Personal Cloud', 12.4, 11]]);
    expect(gags.tumbleweed.beats.map((b) => b[0])).toEqual([0, 2.2, 3.2, 4.2, 5.0, 6.0, 7.8, 9.5]);
    expect(gags.pdogs.beats.map((b) => b[0])).toEqual([0, 0.6, 1.6, 1.8, 3.3, 4.2, 5.0, 5.5, 6.8, 7.3, 7.8, 8.4]);
    expect(gags.bale.beats.map((b) => b[0])).toEqual([0, 0.5, 1.0, 3.4, 4.0, 6.6, 7.2, 7.6, 8.2, 9.0]);
    expect(gags.cloud.beats.map((b) => b[0])).toEqual([0, 2.3, 3.4, 4.4, 5.2, 6.0, 6.4, 8.0, 8.6, 9.8, 10.2]);
  });

  it('the round bale is permanent scenery where the reference has it, and the Runaway Bale starts and ends with it exactly there', () => {
    expect(BALE_AT).toEqual({ x: 352, y: 124, r: 27 });
    expect(BALE_BOX).toEqual({ x: 325, y: 97, w: 54, h: 54 });
    for (const E of [0, 75, 172]) {
      const g = gags.bale;
      // Its first and last frames draw the bale just as the scenery does, and nobody else.
      expect(g.render(0, E)).toBe(baleAtRest());
      expect(g.render(g.dur + g.tail(E), E)).toBe(baleAtRest());
      expect(g.lead(E)).toBe(0);
    }
    const b = gags.bale as unknown as { bx: (t: number, E: number) => number; rx: (t: number, E: number) => number; swap: (E: number) => number };
    // The two of them are out of sight on the right before they come back in on the left, however wide the screen.
    for (const E of [0, 60]) {
      const t = b.swap(E);
      expect(b.bx(t - 0.03, E)).toBeGreaterThan(390 + E + 27);
      expect(b.rx(t - 0.03, E)).toBeGreaterThan(390 + E + 12);
      expect(b.bx(t + 0.001, E)).toBeLessThan(-E - 27);
    }
    expect(b.bx(6.6, 0)).toBe(344);
    expect(b.bx(9, 0)).toBe(352);
  });

  it.each(BAKKEN.filter((k) => k !== 'bale'))('%s: nothing is in view on its first or its last frame, at every strip size', (k) => {
    for (const E of [0, 75, 172]) {
      const g = gags[k];
      for (const t of [-g.lead(E), g.dur + g.tail(E)]) {
        const s = g.render(t, E);
        expect(s, `${k} ${E} ${t}`).not.toMatch(/NaN|undefined|<text/);
        for (const x of xs(s)) expect(x <= -E - 12 || x >= 390 + E + 12, `${k} E ${E} t ${t.toFixed(2)}: something at x ${x}`).toBe(true);
      }
    }
  });

  it('the prairie dogs leave plain prairie: no mound before the first dog digs or after the last one has gone', () => {
    expect(gags.pdogs.render(0, 0)).toBe('');
    expect(gags.pdogs.render(0.3, 0)).toBe('');
    expect(gags.pdogs.render(10.2, 0)).toBe('');
    expect(gags.pdogs.render(2.4, 0)).toContain('clip-path="url(#pd0)"');
    expect(gags.pdogs.lead(100) + gags.pdogs.tail(100)).toBe(0);
  });

  it('triggers, previews, log cards', () => {
    expect(GAG_TRIGGERS.tumbleweed).toEqual({ region: 'bakken', fullLength: true });
    expect(GAG_TRIGGERS.pdogs).toEqual({ region: 'bakken', sameSpotTaps: 3, withinPx: 24 });
    expect(GAG_TRIGGERS.bale).toEqual({ region: 'bakken', bottomBermBump: true, withinCells: 1 });
    expect(GAG_TRIGGERS.cloud).toEqual({ region: 'bakken', skyTaps: 3 });
    for (const name of BAKKEN) expect(PREVIEWS[name]).toMatchObject({ gag: name, region: 'bakken' });
    const by = Object.fromEntries(LOG_ENTRIES.map((e) => [e.id, e]));
    expect(BAKKEN.map((k) => by[k].name)).toEqual(['Tumbleweed', 'Prairie Dog Wave', 'Runaway Bale', 'Personal Cloud']);
    for (const [k, t] of [['tumbleweed', 7.4], ['pdogs', 7.4], ['bale', 5.4], ['cloud', 9.0]] as const) expect(wave3Still(k, t, [0, 0, 100, 80]).length).toBeGreaterThan(1500);
  });
});

// ---------- Clearwater (the Big Pad): the standard scene and the golf pair ----------
import { CW_ASPEN, CW_BUSHES, CW_FIREWEED, CW_SCENE, CW_SIGN_AT, CW_TREES, clearGround, clearScene, clearStripWanted } from './scene-stage.ts';
import { CW } from './wave3.ts';
import { SHARES } from './gag-triggers.ts';

describe('Clearwater: the standard scene', () => {
  // The Big Pad's bottom strip at 390 x 844 and at 375 x 812.
  const strips: [number, { top: number; bottom: number }][] = [[390, { top: 582, bottom: 705 }], [375, { top: 558, bottom: 673 }]];

  it('its strip is tighter than the reference\'s (everything a quarter bigger): 123 units from just over the tallest tree to just under the two-track, on the same walking lane', () => {
    expect(CW_SCENE.floor - CW_SCENE.top).toBe(123);
    expect(CW.FLOOR).toBe(CW_SCENE.floor);
    expect(Math.round((154 / 123) * 100)).toBe(125);
    expect(clearStripWanted(390)).toBe(123);
    expect(clearStripWanted(375)).toBe(119);
    expect(clearStripWanted(430)).toBe(123);
    expect(CW_SCENE.floor).toBeGreaterThan(SCENE.floor);
    expect(CW_SCENE.ground).toBe(SCENE.ground);
    for (const [w, strip] of strips) {
      const g = sceneGeom(w, strip, CW_SCENE);
      expect(g.fits).toBe(true);
      expect(g.s).toBeGreaterThan(0.9);
      // The world stands on the strip's floor and its top is the berm's foot.
      expect(toScreen(g, 0, CW_SCENE.floor).y).toBeCloseTo(strip.bottom, 5);
      expect(g.top).toBeCloseTo(CW_SCENE.top, 5);
      // The puddle is whole inside the strip; so is the mat stack; so is the gold aspen (its crown is not cut at the berm).
      expect(toScreen(g, 0, CW.PUD.y + 8).y).toBeLessThanOrEqual(strip.bottom);
      expect(toScreen(g, CW.MAT_BOX.x + CW.MAT_BOX.w, 0).x).toBeLessThanOrEqual(w);
      expect(toScreen(g, 0, CW_ASPEN.base - CW_ASPEN.h).y).toBeGreaterThanOrEqual(strip.top);
    }
    // Safari with its toolbars showing (the lease moved up for the strip: 72 px at 390 x 664): the scene fits and the gags play.
    expect(sceneGeom(390, { top: 480, bottom: 552 }, CW_SCENE).fits).toBe(true);
    expect(sceneGeom(390, { top: 480, bottom: 552 }, CW_SCENE).s).toBeGreaterThan(0.55);
    // A strip of 50 px is too short for them.
    expect(sceneGeom(375, { top: 486, bottom: 536 }, CW_SCENE).fits).toBe(false);
  });

  it('the ground: lichen bands, the sandy two-track run on to both screen edges, the mud puddle, tufts kept off the lane', () => {
    // (Safari with its toolbars showing: a strip of 72 px under the Big Pad, so the screen is wider than the scene's 390.)
    const g = sceneGeom(390, { top: 480, bottom: 552 }, CW_SCENE);
    const ground = clearGround(g);
    expect(g.E).toBeGreaterThan(20);
    expect(ground).toContain('fill="#d4c28c"'); // the lane's sand
    // (It starts past the left edge of this wider screen.)
    expect(+ground.match(/<path d="M(-?[\d.]+) 138/)![1]).toBeLessThan(g.left);
    expect(ground).toContain('fill="#6b5a3a"'); // the puddle
    const tufts = [...ground.matchAll(/<path d="M(-?[\d.]+) (-?[\d.]+) l2 -6/g)].map((m) => +m[2]);
    expect(tufts.length).toBeGreaterThan(12);
    for (const y of tufts) expect(y).toBeLessThanOrEqual(132);
    // Always the same ground for the same screen.
    expect(clearGround(g)).toBe(ground);
  });

  it('what stands behind the lane: four spruce and the gold aspen in the board\'s own drawings, fireweed, red blueberry bushes; all behind the walking lane', () => {
    const scene = clearScene('fall');
    expect(CW_TREES.every((t) => t.species === 'spruce')).toBe(true);
    expect(CW_TREES).toHaveLength(4);
    expect(scene.match(/<svg /g)).toHaveLength(5);
    expect(scene).toContain('class="cw-aspen"');
    expect(scene).toContain('#c8417e'); // fireweed
    expect(scene).toContain('#9b4a3a'); // blueberry leaves in fall
    for (const base of [...CW_TREES.map((t) => t.base), CW_ASPEN.base, ...CW_FIREWEED.map((f) => f[1]), ...CW_BUSHES.map((b) => b[1])]) expect(base).toBeLessThan(CW.MATS_FOOT);
    // The aspen is where the reference has it (the ball pings off its trunk at x 227, y 96).
    expect(CW_ASPEN.x).toBe(222);
    expect(CW_ASPEN.base).toBe(132);
    expect(CW_ASPEN.base - CW_ASPEN.h).toBeLessThan(96 - 10);
    // Nothing stands where the biffy does (the screen's left corner), nor where Moe swings (x 120).
    for (const t of CW_TREES) expect(t.x).toBeGreaterThan(55);
  });

  it('the rig mat stack: three by three in end view at the lane\'s right end, just behind the lane (so everybody passes in front of it)', () => {
    const mats = CW.mats();
    expect(mats.match(/<rect /g)).toHaveLength(9);
    expect(CW.MAT_BOX.x).toBe(318);
    expect(CW.MAT_BOX.x + CW.MAT_BOX.w).toBeLessThanOrEqual(390);
    expect(CW.MATS_FOOT).toBeLessThan(SCENE.ground);
    expect(SCENE.ground - CW.MATS_FOOT).toBeLessThanOrEqual(4);
    // A tap target of 44 px or more on a phone.
    const g = sceneGeom(390, strips[0][1], CW_SCENE), b = tapBox(g, CW.MAT_BOX);
    expect(b.right - b.left).toBeGreaterThan(43.99);
    expect(b.bottom - b.top).toBeGreaterThan(43.99);
    // The lease sign stands up by the berm over the stack, clear of Moe (x 120) and the bearded worker (x 160).
    expect(CW_SIGN_AT).toBeGreaterThan(290);
  });
});

describe('Clearwater: Three Swings and Out Cold, as the reference has them', () => {
  const golf = gags.golf as Gag & { wx: (t: number) => number; ball: (t: number) => unknown };
  const cold = gags.cold as Gag & { mx: (t: number) => number; bx: (t: number) => number; aspen: (t: number) => number; mouth: (t: number) => { x: number; y: number }; line: { from: number; to: number } };

  it('the reference\'s beats, at the reference\'s times', () => {
    expect(golf.dur).toBe(12.0);
    expect(golf.still).toBe(6.7);
    expect(golf.beats.map((b) => b[0])).toEqual([0, 2.0, 2.7, 3.3, 4.05, 4.6, 5.4, 5.9, 7.3, 7.6, 8.0, 8.3, 9.1, 9.6, 9.9]);
    expect(golf.beats[7][2]).toBe('Swing three. The shovel bites the dirt. BOING.');
    expect(cold.dur).toBe(13.2);
    expect(cold.still).toBe(8.4);
    expect(cold.beats.map((b) => b[0])).toEqual([0, 2.0, 3.4, 4.45, 5.05, 5.35, 5.8, 6.0, 6.6, 7.4, 9.0, 9.5, 10.3, 10.85]);
    expect(cold.beats[13][2]).toBe('Drags him off, ankles in hand. Moe gives a dazed thumbs up.');
    for (const g of [golf, cold]) expect(new Set(g.beats.map((b) => b[1])).size).toBe(g.beats.length);
  });

  it('everybody is where the reference puts them', () => {
    // Moe: in from the left to x 120, and (Three Swings) off the way he came.
    for (const x of [golf.wx, cold.mx]) {
      expect(x.call(x === golf.wx ? golf : cold, 0)).toBe(-40);
      expect(x.call(x === golf.wx ? golf : cold, 2.0)).toBe(120);
      expect(x.call(x === golf.wx ? golf : cold, 5)).toBe(120);
    }
    expect(golf.wx(11.8)).toBeCloseTo(-45, 6);
    // The bearded worker: in from the right to x 160, off the right dragging Moe.
    expect(cold.bx(7.4)).toBe(430);
    expect(cold.bx(9.0)).toBe(160);
    expect(cold.bx(10)).toBe(160);
    expect(cold.bx(13.0)).toBeCloseTo(470, 6);
    // The ball: teed at x 134, off the rig mats, off the aspen, and back onto his hard hat.
    expect(golf.ball(1.9)).toBeNull();
    expect(golf.ball(5)).toEqual([134, 147.4]);
    expect(cold.aspen(5.0)).toBe(0);
    expect(Math.abs(cold.aspen(5.1))).toBeGreaterThan(0.5);
    expect(cold.aspen(5.95)).toBe(0);
    // "Fore." while he looks down at Moe, said beside his face.
    expect(cold.line).toEqual({ from: 9.05, to: 9.8 });
    expect(cold.mouth(9.2)).toEqual({ x: 152, y: 80 });
  });

  it('nobody pops in or out on a wider screen: they come from past its edge at the speed the reference has there, and are gone before the end', () => {
    for (const E of [0, 49, 120]) {
      // At the very start Moe is past the left edge, and walks on at the reference's speed (160 units a second there).
      expect(golf.wx(-golf.lead(E))).toBeCloseTo(-40 - E, 6);
      expect(golf.wx(-0.5) - golf.wx(-1)).toBeCloseTo(80, 6);
      expect(cold.mx(-cold.lead(E))).toBeCloseTo(-40 - E, 6);
      // At the very end of Three Swings he is past the left edge again.
      expect(golf.wx(golf.dur + golf.tail(E))).toBeLessThanOrEqual(-45 - E + 1e-6);
      // The bearded worker comes from past the right edge, and by the end has dragged Moe's head and its dust past it.
      expect(cold.bx(7.4 - E / 337.5)).toBeCloseTo(430 + E, 6);
      expect(cold.bx(cold.dur + cold.tail(E)) - 12 - 51 - 36).toBeGreaterThanOrEqual(390 + E - 30);
      // The first frame and the last draw nobody on the screen (0 to 390, and E beyond each side): the worker's own place
      // (the first thing drawn) is past the edge, or nothing is drawn at all.
      for (const [g, t] of [[golf, -golf.lead(E)], [golf, golf.dur + golf.tail(E)], [cold, -cold.lead(E)]] as [Gag, number][]) {
        const at = g.render(t, E).match(/translate\((-?[\d.]+) /);
        if (at) expect(+at[1] < -20 - E || +at[1] > 410 + E, `${g.name} at ${t.toFixed(2)} draws at x ${at[1]}`).toBe(true);
      }
    }
  });

  it('as timelines on the Big Pad\'s strip: the clock starts `lead` early and every beat keeps the reference\'s time', () => {
    const g = sceneGeom(390, { top: 480, bottom: 552 }, CW_SCENE);
    for (const [id, gag] of [['golf', golf], ['cold', cold]] as [string, Gag][]) {
      const def = sceneDef(id, id, () => g);
      const lead = gag.lead(g.E);
      expect(lead).toBeGreaterThan(0.1);
      expect(def.beats[0][0]).toBe(0);
      gag.beats.forEach((b, i) => { if (i) expect(def.beats[i][0]).toBeCloseTo(b[0] + lead, 6); });
      expect(def.end).toBeCloseTo(lead + gag.dur + gag.tail(g.E), 6);
    }
  });

  it('a stacked pair: one trigger, Out Cold only once Three Swings has been seen; previews, log cards with stills and plain hints', () => {
    expect(GAG_TRIGGERS.golf).toEqual({ region: 'clearwater', matTaps: 3 });
    expect(GAG_TRIGGERS.cold).toEqual({ region: 'clearwater', sameAs: 'golf', onceSeen: 'swings' });
    expect(PREVIEWS.golf).toEqual({ gag: 'golf', region: 'clearwater', level: 1 });
    expect(PREVIEWS.cold.gag).toBe('cold');
    // They never play together: both need Moe and the rig mats.
    expect(SHARES.golf.some((x) => SHARES.cold.includes(x))).toBe(true);
    const swings = LOG_ENTRIES.find((e) => e.id === 'swings')!, out = LOG_ENTRIES.find((e) => e.id === 'cold')!;
    expect(swings.name).toBe('Three Swings');
    expect(out.name).toBe('Out Cold');
    expect(LOG_ENTRIES.indexOf(out)).toBe(LOG_ENTRIES.indexOf(swings) + 1);
    // Jay's own riddles and plain hints (BIG_PAD_BRIEF.md).
    expect(swings.hint).toBe('Tap the rig mat stack 3 times.');
    expect(swings.riddle).toBe('Someone wants to tee off the rig mats.');
    expect(out.hint).toBe('After Three Swings, tap the rig mats 3 times again.');
    expect(out.riddle).toBe('Moe never quits. Give him another shot.');
    expect(LOG_ENTRIES.filter((e) => ['wash', 'bell', 'pea'].includes(e.id)).map((e) => [e.name, e.riddle, e.hint])).toEqual([
      ['Fresh Wash', 'Nothing stays clean near that puddle.', 'Tap the mud puddle.'],
      ['Dinner Bell', 'Work hard, eat first.', 'Clear 5 trucks in a row without Undo.'],
      ['One Pea', 'Somebody always misses supper.', 'After Dinner Bell, clear 5 in a row again.'],
    ]);
    for (const [key, t] of [['golf', 6.7], ['cold', 8.4]] as [string, number][]) {
      const still = wave3Still(key, t, [60, 70, 170, 84]);
      expect(still).toContain('egg-still');
      expect(still).toContain('#e8862e'); // Moe's orange coveralls
    }
    expect(wave3Still('cold', 8.4, [60, 70, 170, 84])).toContain('#7a4f2e'); // the bearded worker's beard
  });
});
