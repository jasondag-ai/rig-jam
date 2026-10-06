import { describe, expect, it } from 'vitest';
import { GAG_TRIGGERS, PREVIEWS } from './gag-triggers.ts';
import { ASPEN_BOX, BIG_PUDDLE, LANE_ASPEN, MANN_SIGN_X, MANN_TREES, SCENE, SCENE_MIN, mannFront, mannScene, sceneDef, sceneGeom, skyGeom, tapBox, toScreen, wave3Still } from './scene-stage.ts';
import { WAVE3 } from './wave3.ts';
import { LOG_ENTRIES } from './wildlife-log.ts';

type Gag = { name: string; dur: number; still: number; beats: [number, string, string][]; lead: (E: number) => number; tail: (E: number) => number; render: (t: number, E: number) => string; over?: (t: number, E: number) => string };
const gags = WAVE3 as unknown as Record<string, Gag>;
const MANN = ['muskeg', 'catTrain', 'beaver', 'aurora'];
// The bottom strip at 390x844, in Safari with its toolbars, at 375x667, and on a 430 wide phone.
const STRIPS: [number, { top: number; bottom: number }][] = [[390, { top: 587, bottom: 737 }], [390, { top: 537, bottom: 637 }], [375, { top: 489, bottom: 560 }], [430, { top: 652, bottom: 825 }]];

describe('the stage for gag wave 3', () => {
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
    expect(MANN_TREES.map((t) => t.x)).toEqual([80, 110, 138, 238, 334, 366]);
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
