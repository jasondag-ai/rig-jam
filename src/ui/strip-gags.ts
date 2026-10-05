// Puts the bottom-strip gags on screen: Near Miss (near-miss.ts), the landowner (landowner.ts) and
// the two biffy gags (biffy.ts), plus the biffy itself, which is PERMANENT scenery on every level.
// Each gag is a timeline ported from its approved reference; `TimelineGag` runs one: its layers
// cover the whole game screen and take no touches, so characters enter from fully off screen and
// leave until fully off screen, never clipped (the gopher alone is cut off at his hole).
import { BEAR_BEATS, BEAR_END, BEAR_FRAC, BEAR_GAP, BUSH, BUSH_FRAC, bPose, bearApply, bearScene } from './bear.ts';
import { BULL_BEATS, BULL_END, BULL_FRAC, BULL_GAP, COW_FRAC, COW_REST, PRIMP, bullApply, bullPose, bullScene, cowApply, cowPup } from './bull.ts';
import { A_BEATS, A_END, BIFFY_FRAC, B_BEATS, B_END, aApply, bApply, biffyPup, biffyRest, runawayScene } from './biffy.ts';
import type { EggHost, EggResult } from './egg-gags.ts';
import { GEESE_LINE, GOOSE_FRAC, G_BEATS, G_END, SKY, gApply, geeseScene } from './geese.ts';
import { LANDOWNER_FRAC, L_BEATS, L_END, lApply, lPose, landownerScene } from './landowner.ts';
import { LANDOWNER_LINE } from './lines.ts';
import { MM_BEATS, MM_END, MM_LINE, marshmallowScene, mmApply, mmPose } from './marshmallow.ts';
import { GOPHER_FRAC, NEAR_MISS_LINE, N_BEATS, N_END, nApply, nPose, nearMissScene } from './near-miss.ts';
import { makePup, place, type Pup } from './puppet-stage.ts';
import { WORKER_FRAC } from './worker.ts';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const beatAt = (beats: [number, string, string][], t: number) => beats.reduce((name, b) => (t >= b[0] ? b[1] : name), beats[0][1]);

/** The bottom strip's ground line (screen px) and how much the strip's gags are scaled to fit it. */
export function stripGeom(screenW: number, strip: { top: number; bottom: number }): { ground: number; scale: number } {
  // Sized so the biffy (the tallest thing here, about 80 px at 390) stands clear of the berm above.
  const full = BIFFY_FRAC * screenW * 1.34;
  return { ground: strip.bottom - 4, scale: Math.max(0.36, Math.min(1, (strip.bottom - strip.top - 12) / full)) };
}
/** Where the biffy stands across the screen (a share of its width): right of the worker's clearing. */
export const BIFFY_X = 0.3;
/** The patch of the strip the biffy stands on (scenery keeps trees off it). */
export function biffyBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const w = BIFFY_FRAC * screenW * scale;
  return { x: BIFFY_X * screenW - w * 0.5, y: ground - w * 1.3, width: w, height: w * 1.3 };
}

/** The permanent biffy: always on screen in the bottom strip, door shut, until a gag opens it. */
export class BiffyProp {
  readonly layer: HTMLElement;
  pup: Pup;
  /** The indicator: red once someone has shut himself in (Biffy A), green again when he has left (Biffy B). */
  red = false;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer biffy-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    host.screen.append(this.layer);
    this.pup = biffyPup(this.layer, { x: BIFFY_X, y: 0.8 }, 1);
    this.layout();
  }

  /** The screen or the board changed size: stand him back on the strip's ground line. */
  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const { ground, scale } = stripGeom(screen.width, this.host.strip());
    this.pup.frac = BIFFY_FRAC * scale;
    this.pup.spot = { x: BIFFY_X, y: ground / screen.height };
    this.rest();
  }

  rest(): void {
    biffyRest(this.pup, this.red);
  }

  /** A fresh level: door shut, indicator green. */
  reset(): void {
    this.red = false;
    this.rest();
  }
}

/** Where the bear's bush stands across the screen (a share of its width): right of the biffy, with room for the bear to sit between them. */
export const BUSH_X = 0.76;
/** The patch of the strip kept clear of trees for the bush, the hare's spot and the sitting bear. */
export function bearBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const left = (BUSH_X - BEAR_GAP * scale - BEAR_FRAC * scale * 0.3) * screenW, right = (BUSH_X + BUSH_FRAC * scale * 0.5) * screenW;
  const h = BUSH_FRAC * scale * screenW * 0.6;
  return { x: left, y: ground - h, width: right - left, height: h };
}

/** The bear's bush: permanent scenery on his levels (the reference's snowy bush), where the hare hides. */
export class BushProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer biffy-layer bush-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    host.screen.append(this.layer);
    this.pup = makePup(this.layer, BUSH, { vw: 100, vh: 70, ax: 50, ay: 66, frac: BUSH_FRAC, spot: { x: BUSH_X, y: 0.8 } });
    this.layout();
  }

  /** Where it stands (shares of the screen) and how big the scene is. */
  spot(): { x: number; y: number; scale: number } {
    const screen = this.host.screen.getBoundingClientRect();
    const { ground, scale } = stripGeom(screen.width, this.host.strip());
    return { x: BUSH_X, y: ground / (screen.height || 1), scale };
  }

  layout(): void {
    if (!this.host.screen.getBoundingClientRect().height) return;
    const { x, y, scale } = this.spot();
    this.pup.frac = BUSH_FRAC * scale;
    this.pup.spot = { x, y };
    place(this.pup);
  }

  /** The gag draws its own bush in the same place (the hare goes behind it), so this one steps aside meanwhile. */
  show(on: boolean): void {
    this.layer.style.visibility = on ? '' : 'hidden';
  }
}

/** Where the cow grazes across the screen (a share of its width): the right of the strip, the bull stopping between her and the biffy. */
export const COW_X = 0.79;
/** The patch of the strip kept clear of trees for the cow and the bull's stop. */
export function cowBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const left = (COW_X - BULL_GAP * scale - BULL_FRAC * scale * 0.2) * screenW, right = Math.min(screenW, (COW_X + COW_FRAC * scale * 0.5) * screenW);
  const h = COW_FRAC * scale * screenW * 0.5;
  return { x: left, y: ground - h, width: right - left, height: h };
}

/** The Holstein cow: permanent scenery in the Montney strip, grazing. She only moves during the gag. */
export class CowProp {
  readonly layer: HTMLElement;
  pup: Pup;
  /** She bolted: gone until the level is loaded again. */
  gone = false;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer biffy-layer cow-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    host.screen.append(this.layer);
    this.pup = cowPup(this.layer, { x: COW_X, y: 0.8 }, 1);
    this.layout();
  }

  scale(): number {
    return stripGeom(this.host.screen.getBoundingClientRect().width, this.host.strip()).scale;
  }

  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const { ground, scale } = stripGeom(screen.width, this.host.strip());
    this.pup.frac = COW_FRAC * scale;
    this.pup.spot = { x: COW_X, y: ground / screen.height };
    this.rest();
  }

  rest(): void {
    cowApply(this.pup, { ...COW_REST, show: !this.gone });
  }

  /** Is this point (client px) on her? */
  hit(x: number, y: number): boolean {
    if (this.gone) return false;
    const r = (this.pup.q('.root') as SVGGElement).getBoundingClientRect();
    return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
  }

  /** Back to grazing. */
  reset(): void {
    this.gone = false;
    this.rest();
  }
}

interface Bubble {
  from: number;
  to: number;
  text: string;
  /** Where the speaker is, in screen px. */
  at: () => { x: number; y: number };
}
interface Built {
  apply: (t: number) => void;
  bubble?: Bubble;
  /** Called when the gag ends, however it ends ('seen': it played right through). */
  done?: (result: EggResult) => void;
}
export interface TimelineDef {
  name: string;
  beats: [number, string, string][];
  end: number;
  /** The moment shown as a still with reduced motion. */
  stillAt: number;
  /** Sets the scene; `layer(cls)` makes a full-screen layer for it. Null: it cannot play here. */
  build: (layer: (cls: string) => HTMLElement, host: EggHost) => Built | null;
}

/** Plays one timeline gag at a time. */
export class TimelineGag {
  private host: EggHost;
  private def: TimelineDef;
  private run: { layers: HTMLElement[]; built: Built; frame: number; bubble: HTMLElement | null; timers: number[]; done: (r: EggResult) => void } | null = null;

  constructor(host: EggHost, def: TimelineDef) {
    this.host = host;
    this.def = def;
  }

  get playing(): boolean {
    return this.run !== null;
  }

  play(): Promise<EggResult> {
    if (this.run) return Promise.resolve('none');
    const layers: HTMLElement[] = [];
    const layer = (cls: string) => {
      const el = document.createElement('div');
      el.className = `scene-layer puppet-layer strip-layer ${cls}`;
      el.setAttribute('aria-hidden', 'true');
      el.dataset.gag = this.def.name;
      this.host.screen.append(el);
      layers.push(el);
      return el;
    };
    const built = this.def.build(layer, this.host);
    if (!built) {
      layers.forEach((l) => l.remove());
      return Promise.resolve('none');
    }
    return new Promise((resolve) => {
      const run = { layers, built, frame: 0, bubble: null as HTMLElement | null, timers: [] as number[], done: resolve };
      this.run = run;
      const mark = layers[layers.length - 1];
      if (reducedMotion()) {
        // A simple fade: the still, the line if there is one, and out.
        layers.forEach((l) => ((l.style.opacity = '0'), (l.style.transition = 'opacity 0.35s')));
        built.apply(this.def.stillAt);
        mark.dataset.beat = 'still';
        void mark.offsetWidth;
        layers.forEach((l) => (l.style.opacity = '1'));
        const later = (ms: number, f: () => void) => run.timers.push(window.setTimeout(() => this.run === run && f(), ms));
        if (built.bubble) later(450, () => (run.bubble = this.speak(mark, built.bubble!)));
        later(2300, () => layers.forEach((l) => (l.style.opacity = '0')));
        later(2700, () => this.finish('seen'));
        return;
      }
      const start = performance.now();
      const tick = () => {
        if (this.run !== run) return;
        const t = (performance.now() - start) / 1000;
        built.apply(t);
        mark.dataset.beat = beatAt(this.def.beats, t);
        const b = built.bubble;
        if (b && t >= b.from && t < b.to && !run.bubble) run.bubble = this.speak(mark, b);
        if (b && t >= b.to && run.bubble) {
          run.bubble.remove();
          run.bubble = null;
        }
        if (t >= this.def.end) return this.finish('seen');
        run.frame = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  clear(): void {
    if (this.run) this.finish('none');
  }

  private speak(layer: HTMLElement, b: Bubble): HTMLElement {
    const at = b.at();
    const anchor = document.createElement('i');
    Object.assign(anchor.style, { position: 'absolute', left: `${at.x}px`, top: `${at.y}px`, width: '0', height: '0' });
    layer.append(anchor);
    const bubble = this.host.say(anchor, b.text);
    bubble.dataset.gag = this.def.name;
    return bubble;
  }

  private finish(result: EggResult): void {
    const run = this.run;
    if (!run) return;
    this.run = null;
    cancelAnimationFrame(run.frame);
    run.timers.forEach((t) => window.clearTimeout(t));
    run.bubble?.remove();
    run.built.done?.(result);
    run.layers.forEach((l) => l.remove());
    run.done(result);
  }
}

// ---------- The four gags ----------

/** Gag 4: needs the permanent gopher mound (Cardium). */
export const nearMissDef: TimelineDef = {
  name: 'nearMiss',
  beats: N_BEATS,
  end: N_END,
  stillAt: 6.6,
  build(layer, host) {
    const mound = host.screen.querySelector<SVGElement>('.scenery [data-anchor="mound"]');
    if (!mound) return null;
    const screen = host.screen.getBoundingClientRect();
    const m = mound.getBoundingClientRect();
    // The hole, as drawn on the mound (33, 17.5 of its 64 x 34 box).
    const hole = { x: m.left - screen.left + (33 / 64) * m.width, y: m.top - screen.top + (17.5 / 34) * m.height };
    const scale = Math.min(1, m.width / (GOPHER_FRAC * screen.width * 1.25));
    // The gopher lives in a layer that ends at the hole line, so he comes up out of the hole.
    const under = layer('gopher-layer');
    under.style.height = `${hole.y}px`;
    const over = layer('hotshot-layer');
    const scene = nearMissScene(under, over, { x: hole.x / screen.width, y: 1 }, (hole.y + 12 * (screen.width / 390)) / screen.height, scale);
    scene.holeY = hole.y;
    const w = GOPHER_FRAC * scale * screen.width;
    return { apply: (t) => nApply(scene, nPose(t), t), bubble: { from: 6.0, to: 7.8, text: NEAR_MISS_LINE, at: () => ({ x: hole.x + (hole.x > screen.width * 0.6 ? -1 : 1) * w * 1.6, y: hole.y - w * 0.7 }) } };
  },
};

/** Gag 5: rides the strip's ground line, stopping in the middle. */
export const landownerDef: TimelineDef = {
  name: 'landowner',
  beats: L_BEATS,
  end: L_END,
  stillAt: 4.6,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { ground, scale } = stripGeom(screen.width, host.strip());
    const scene = landownerScene(layer('landowner-layer'), ground / screen.height, scale);
    const w = LANDOWNER_FRAC * scale * screen.width;
    return { apply: (t) => lApply(scene, lPose(t), t), bubble: { from: 4.0, to: 6.1, text: LANDOWNER_LINE, at: () => ({ x: screen.width / 2 + w * 0.05, y: ground - w * 0.74 }) } };
  },
};

/** Gag 6: "Occupied", on the permanent biffy. He shuts himself in, so the indicator stays red. */
export const biffyADef = (biffy: BiffyProp): TimelineDef => ({
  name: 'biffyA',
  beats: A_BEATS,
  end: A_END,
  stillAt: 2.2,
  build(layer) {
    layer('biffy-mark');
    const scene = { p: biffy.pup };
    return {
      apply: (t) => aApply(scene, t),
      done: () => {
        biffy.red = true;
        biffy.rest();
      },
    };
  },
});

/** Gag 7: "The runaway roll". The shuffler and the roll leave past the screen's right edge; the indicator ends green. */
export const biffyBDef = (biffy: BiffyProp): TimelineDef => ({
  name: 'biffyB',
  beats: B_BEATS,
  end: B_END,
  stillAt: 4.2,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { scale } = stripGeom(screen.width, host.strip());
    const occ = biffy.pup.q('.occ') as SVGElement;
    // Nobody is seen through the doorway: he is in the dark until he shuffles out.
    occ.style.display = 'none';
    const scene = runawayScene(biffy.pup, layer('shuffler-layer'), scale);
    return {
      apply: (t) => bApply(scene, t),
      done: () => {
        biffy.red = false;
        biffy.rest();
      },
    };
  },
});

/**
 * Gag 8: the worker roasts a marshmallow on the nearest REAL flare's pilot flame. He stands in the
 * bottom strip with the flare to his right; the stick lies over the lease but takes no touches.
 */
export const marshmallowDef: TimelineDef = {
  name: 'marshmallow',
  beats: MM_BEATS,
  end: MM_END,
  stillAt: 4.75,
  build(layer, host) {
    const flames = [...host.board.querySelectorAll<SVGElement>('.obstacle.flare .fl-flame')];
    if (!flames.length) return null;
    const screen = host.screen.getBoundingClientRect();
    const { ground, scale } = stripGeom(screen.width, host.strip());
    const w = WORKER_FRAC * scale * screen.width;
    const centre = (f: SVGElement) => {
      const r = f.getBoundingClientRect();
      return { x: r.left - screen.left + r.width / 2, y: r.top - screen.top + r.height * 0.55 };
    };
    // He stands a little left of the flare so the stick leans up and to the right, as in the reference.
    const stand = (tip: { x: number }) => Math.max(w * 0.6, Math.min(screen.width - w * 1.1, tip.x - screen.width * 0.25));
    // The nearest flare: the one with the shortest reach from where he would stand for it.
    const pick = flames.map((f) => ({ f, tip: centre(f) })).sort((a, b) => Math.hypot(a.tip.x - stand(a.tip), a.tip.y - ground) - Math.hypot(b.tip.x - stand(b.tip), b.tip.y - ground))[0];
    const x = stand(pick.tip);
    const scene = marshmallowScene(layer('marshmallow-layer'), { x: x / screen.width, y: ground / screen.height }, scale, pick.tip, pick.f);
    // In from past the left edge, out past the right one (in his drawing's units).
    const u = w / 120;
    const from = -(x + w) / u, to = (screen.width - x + w) / u;
    return {
      apply: (t) => mmApply(scene, mmPose(t, from, to), t),
      bubble: { from: 7.27, to: 8.0, text: MM_LINE, at: () => ({ x: x + w * 0.3, y: ground - w * 0.8 }) },
      done: () => (pick.f.style.scale = ''),
    };
  },
};

/** Gag 9: the geese cross the sky band above the lease; the lost goose goes the wrong way. */
export const geeseDef: TimelineDef = {
  name: 'geese',
  beats: G_BEATS,
  end: G_END,
  stillAt: 4.0,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const sky = host.sky();
    const scale = Math.max(0.6, Math.min(1, sky.height / 150));
    const gw = GOOSE_FRAC * scale * screen.width;
    // The reference's band (the V's lead at 0.36 of it, the lost goose at 0.6), hung so the top of
    // the V clears the HUD: the flock flies in the open sky, behind the HUD's row.
    const height = SKY.height * scale;
    const top = sky.top + 6 + 3 * gw * 1.05 * 0.32 + gw * 0.25 - SKY.lead * height;
    const scene = geeseScene(layer('geese-layer'), { top, height }, scale);
    return { apply: (t) => gApply(scene, t), bubble: { from: 3.7, to: 4.6, text: GEESE_LINE, at: () => ({ x: scene.at.x, y: scene.at.y - gw * 0.3 }) } };
  },
};

/**
 * Gag 10 (LEGENDARY): the bear and the snowshoe hare, at the bear's bush. One layer holds the hare,
 * the bush, the bear and the overlay, stacked as in the reference, so the hare can be behind the
 * bush or in the bear's paw.
 */
export const bearDef = (bush: BushProp): TimelineDef => ({
  name: 'bear',
  beats: BEAR_BEATS,
  end: BEAR_END,
  stillAt: 9.2,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { x, y, scale } = bush.spot();
    const scene = bearScene(layer('bear-layer'), { x, y }, scale);
    bush.show(false);
    // In from past the left edge, out past the right one (in the bear's own units).
    const w = BEAR_FRAC * scale * screen.width, u = w / 160, at = (x - BEAR_GAP * scale) * screen.width;
    const from = -(at + w) / u, to = (screen.width - at + w) / u;
    return { apply: (t) => bearApply(scene, bPose(t, from, to), t), done: () => bush.show(true) };
  },
});

/** Gag 11: the bull and the (permanent) cow. No speech, just hearts. She stays gone once she has bolted. */
export const bullDef = (cow: CowProp): TimelineDef => ({
  name: 'bull',
  beats: BULL_BEATS,
  end: BULL_END,
  stillAt: 3.6 + PRIMP,
  build(layer, host) {
    if (cow.gone) return null;
    const screen = host.screen.getBoundingClientRect();
    const scale = cow.scale();
    const scene = bullScene(layer('bull-layer'), cow.pup, scale);
    // The bull in from past the left edge; both of them out past the right one (each in its own units).
    const wB = BULL_FRAC * scale * screen.width, uB = wB / 170, xB = scene.bull.spot.x * screen.width;
    const wC = COW_FRAC * scale * screen.width, uC = wC / 170, xC = cow.pup.spot.x * screen.width;
    const from = -(xB + wB) / uB, charge = (screen.width - xB + wB) / uB, to = (screen.width - xC + wC) / uC;
    return {
      apply: (t) => bullApply(scene, bullPose(t, from, to, charge), t),
      done: (result) => {
        cow.gone = result === 'seen' && !reducedMotion();
        cow.rest();
      },
    };
  },
});

// ---------- Wildlife Log card art: each puppet in a telling moment ----------

function still(build: (host: HTMLElement) => () => void, pick: string, cls: string, box: string): string {
  const host = document.createElement('div');
  build(host)();
  const svg = host.querySelector<SVGSVGElement>(pick)!;
  svg.removeAttribute('style');
  svg.setAttribute('class', `egg-still ${cls}`);
  svg.setAttribute('viewBox', box);
  return svg.outerHTML;
}
export const nearMissStill = () =>
  still((h) => {
    const s = nearMissScene(h, h, { x: 0.5, y: 1 }, 1, 1);
    s.holeY = 0;
    return () => nApply(s, nPose(2.7), 2.7);
  }, 'svg.pup', 'gopher-still', '14 14 92 96');
export const landownerStill = () => still((h) => {
  const s = landownerScene(h, 1, 1);
  return () => lApply(s, lPose(4.6), 4.6);
}, 'svg.pup', 'landowner-still', '0 0 160 130');
export const biffyAStill = () => still((h) => {
  const p = biffyPup(h, { x: 0.5, y: 1 }, 1);
  return () => aApply({ p }, 2.2);
}, 'svg.pup', 'biffy-still', '-24 0 148 140');
export const biffyBStill = () => still((h) => {
  const p = biffyPup(h, { x: 0.5, y: 1 }, 1);
  (p.q('.occ') as SVGElement).style.display = 'none';
  const s = runawayScene(p, h, 1);
  return () => {
    bApply(s, 4.2);
    place(s.s, 6);
  };
}, 'svg.pup:nth-of-type(2)', 'shuffler-still', '4 26 104 90');
