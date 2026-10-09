// Puts the bottom-strip gags on screen: Near Miss (near-miss.ts), the landowner (landowner.ts) and
// the two biffy gags (biffy.ts), plus the biffy itself, which is PERMANENT scenery on every level.
// Each gag is a timeline ported from its approved reference; `TimelineGag` runs one: its layers
// cover the whole game screen and take no touches, so characters enter from fully off screen and
// leave until fully off screen, never clipped (the gopher alone is cut off at his hole).
import { setGround } from './puppet-stage.ts';
import { LANE_UP } from './scenery.ts';
import { markBeat } from './gag-beat.ts';
import { sound } from '../audio/engine.ts';
import type { GagId } from './gag-triggers.ts';
import { BEAR_BEATS, BEAR_END, BEAR_FRAC, BEAR_GAP, bPose, bearApply, bearScene } from './bear.ts';
import { BUSH_BOX, BUSH_FRAC, bushMarkup } from './gag-bush.ts';
import { LIP, LUNCH_BEATS, LUNCH_END, LUNCH_GAP, MOUND_BOX, lunchApply, lunchPose, lunchScene, moundWidthFor } from './gopher-lunch.ts';
import { BUDDY_STOP, RISER_FRAC, TONGUE_BEATS, TONGUE_END, TONGUE_LINE, riserPup, tongueApply, tonguePose, tongueScene } from './frozen-tongue.ts';
import { SAM_BEATS, SAM_END, SAM_X, samFrame, samPose, samScene } from './sam.ts';
import { PC_BEATS, PC_END, PORC_FRAC, QUILL_SHUFFLER_FRAC, SHIFT, pcApply, pcPose, porcupineScene } from './porcupine.ts';
import { DEER_BEATS, DEER_END, SIGN_FRAC, SURVEY_BEATS, SURVEY_END, SURVEY_LINES, TOUR_BEATS, TOUR_END, TOUR_LINE, VISITOR_FRAC, deerApply, deerPose, deerScene, signPup, surveyApply, surveyPose, surveyScene, tourApply, tourPose, tourScene } from './sign-gags.ts';
import type { Season } from './trees.ts';
import { BULL_BEATS, BULL_END, BULL_FRAC, BULL_GAP, COW_FRAC, COW_REST, bullApply, bullPose, bullScene, cowApply, cowPup } from './bull.ts';
import { A_BEATS, A_END, BIFFY_FRAC, BIFFY_SIZE, B_BEATS, B_END, SHUFFLER_FRAC, aApply, bApply, biffyPup, biffyRest, runawayScene } from './biffy.ts';
import type { EggHost, EggResult } from './egg-gags.ts';
import { GEESE_LINE, GOOSE_FRAC, G_BEATS, G_END, SKY, gApply, geeseScene } from './geese.ts';
import { LANDOWNER_FRAC, L_BEATS, L_END, lApply, lPose, landownerScene } from './landowner.ts';
import { LANDOWNER_LINES, fromPool } from './lines.ts';
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
  return { ground: strip.bottom - LANE_UP, scale: Math.max(0.36, Math.min(1, (strip.bottom - strip.top - 12) / full)) };
}
/** How much strip the older strip gags want on a screen `screenW` wide to stand at their full size (px): see `stripGeom`. */
export const stripWanted = (screenW: number): number => Math.ceil(BIFFY_FRAC * screenW * 1.34 + 12);
/**
 * THE STRIP'S DEPTH LINES (STANDING_RULES 1: lower on the screen is nearer, and draws in front).
 * From the back: the BACK ROW up by the berm (the biffy, the lease sign and its visitors);
 * PROP ROW 2 (the riser, the gopher's mound) and PROP ROW 1 (the gag bushes, the cow), each
 * `propBack` behind the next; then the WALKING LANE (`stripGeom().ground`), where everybody who
 * crosses the strip walks, clearly in front of every prop; and the scenery's front trees on the
 * strip's floor, in front of the lane. A gag about a prop plays on that prop's own row, and the
 * two rows are apart so that it passes the other row's prop clearly in front of it (the bear and
 * the riser, the porcupine and the mound) or clearly behind it (the frozen worker's buddy and
 * the bear's bush).
 */
export const propBack = (screenW: number, scale: number): number => Math.max(4, Math.round((8 * scale * screenW) / 390));
/** The ground line of a prop row (screen px): row 1 is just behind the walking lane, row 2 behind that. */
export function propLine(screenW: number, strip: { top: number; bottom: number }, row: 1 | 2): number {
  const { ground, scale } = stripGeom(screenW, strip);
  return ground - row * propBack(screenW, scale);
}
/** Where the biffy stands across the screen (a share of its width): in the corner of the bottom strip. */
export const BIFFY_X = 0.08;
/** The biffy stands right up at the berm: this much grass (px) between the berm's foot and its roof. */
export const BIFFY_GAP = 2;
/** How wide the biffy is drawn (px), and the line it stands on: up by the berm, never below the strip's own ground line. */
export function biffyStand(screenW: number, strip: { top: number; bottom: number }): { ground: number; scale: number; width: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const width = BIFFY_FRAC * BIFFY_SIZE * screenW * scale;
  return { ground: Math.min(ground, strip.top + BIFFY_GAP + width * 1.26), scale, width };
}
/** The patch of the strip the biffy stands on (scenery keeps trees off it). */
export function biffyBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, width: w } = biffyStand(screenW, strip);
  // (Its door swings open to the right: that side is kept clear of trees too, a door's width.)
  return { x: BIFFY_X * screenW - w * 0.5, y: ground - w * 1.3, width: w * 2, height: w * 1.3 };
}

/** The lane from the biffy to the screen edge nearest it, where the roll and the shuffler leave (scenery keeps trees off it). */
export function biffyLane(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = biffyStand(screenW, strip);
  const h = SHUFFLER_FRAC * scale * screenW * 0.72;
  const [left, right] = BIFFY_X < 0.5 ? [0, BIFFY_X * screenW] : [BIFFY_X * screenW, screenW];
  return { x: left, y: ground - h, width: right - left, height: h + 2 };
}

/** The permanent biffy: always on screen in the bottom strip, door shut, until a gag opens it. */
export class BiffyProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer biffy-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.pup = biffyPup(this.layer, { x: BIFFY_X, y: 0.8 }, 1);
    this.layout();
  }

  /** The screen or the board changed size: stand him back on the strip's ground line. */
  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const strip = this.host.strip();
    const { scale, width } = biffyStand(screen.width, strip);
    // Right up at the berm, but never on a gate: where a bottom gate hangs over its corner, it
    // stands just under that gate's posts instead.
    const [left, right] = [BIFFY_X * screen.width - width / 2, BIFFY_X * screen.width + width / 2];
    const under = [...this.host.board.querySelectorAll('.gate')].map((g) => g.getBoundingClientRect()).filter((g) => g.right - screen.left > left && g.left - screen.left < right && g.bottom - screen.top > strip.top - 2);
    const top = Math.max(strip.top, ...under.map((g) => g.bottom - screen.top));
    const ground = Math.min(stripGeom(screen.width, strip).ground, top + BIFFY_GAP + width * 1.26);
    this.pup.frac = BIFFY_FRAC * BIFFY_SIZE * scale;
    this.pup.spot = { x: BIFFY_X, y: ground / screen.height };
    this.rest();
  }

  rest(): void {
    biffyRest(this.pup, false);
  }

  /** A fresh level: door shut, indicator green. */
  reset(): void {
    this.rest();
  }
}

/** Where the bear's bush stands across the screen (a share of its width): right of the biffy, with room for the bear to sit between them. */
export const BUSH_X = 0.76;
/** The patch of the strip kept clear of trees for the bush, the hare's spot and the sitting bear. */
export function bearBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const left = (BUSH_X - BEAR_GAP * scale - BEAR_FRAC * scale * 0.3) * screenW, right = (BUSH_X + BUSH_FRAC * scale * 0.5) * screenW;
  const h = BUSH_FRAC * scale * screenW * 1.1;
  return { x: left, y: ground - h, width: right - left, height: h };
}

/**
 * A gag bush: permanent scenery where a gag needs one (the bear's levels; Cardium, for the
 * porcupine), drawn as the board's own bush (gag-bush.ts). It takes the place of the scenery's bush there.
 */
export class BushProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;
  /** Where it stands across the screen (a share of its width). */
  readonly x: number;
  readonly season: Season;

  constructor(host: EggHost, x: number, season: Season) {
    this.host = host;
    this.x = x;
    this.season = season;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer prop-layer bush-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.pup = makePup(this.layer, bushMarkup(season), { ...BUSH_BOX, frac: BUSH_FRAC, spot: { x, y: 0.8 } });
    this.layout();
  }

  /** Where it stands (shares of the screen) and how big the scene is. */
  spot(): { x: number; y: number; scale: number } {
    const screen = this.host.screen.getBoundingClientRect();
    const { scale } = stripGeom(screen.width, this.host.strip());
    // (Prop row 1: everybody crossing the strip passes in front of it.)
    return { x: this.x, y: propLine(screen.width, this.host.strip(), 1) / (screen.height || 1), scale };
  }

  layout(): void {
    if (!this.host.screen.getBoundingClientRect().height) return;
    const { x, y, scale } = this.spot();
    this.pup.frac = BUSH_FRAC * scale;
    this.pup.spot = { x, y };
    place(this.pup);
  }

  /** Is this point (client px) on the bush? */
  hit(x: number, y: number): boolean {
    const r = this.pup.svg.getBoundingClientRect();
    return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
  }

  /** A tap that brings nobody: the bush shakes and, in winter, drops a small puff of snow. */
  shake(): void {
    const svg = this.pup.svg;
    svg.classList.remove('shake');
    void svg.getBoundingClientRect();
    svg.classList.add('shake');
    this.layer.querySelectorAll('.bush-puff').forEach((p) => p.remove());
    if (this.season !== 'winter') return;
    const r = svg.getBoundingClientRect(), host = this.layer.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const puff = document.createElement('i');
      puff.className = 'bush-puff';
      const size = r.width * (0.1 + 0.05 * (i % 3));
      Object.assign(puff.style, { left: `${r.left - host.left + r.width * (0.2 + 0.15 * i) - size / 2}px`, top: `${r.top - host.top + r.height * (0.25 + 0.08 * (i % 2))}px`, width: `${size}px`, height: `${size}px`, animationDelay: `${i * 40}ms` });
      this.layer.append(puff);
      puff.addEventListener('animationend', () => puff.remove());
    }
  }

  /** The gag draws its own bush in the same place (the hare goes behind it), so this one steps aside meanwhile. */
  show(on: boolean): void {
    this.layer.style.visibility = on ? '' : 'hidden';
  }
}

/** Where the porcupine's bush stands in Cardium: left of the stage (see `STAGE`), right of the sleepy worker's spot. (The reference: 0.52.) */
export const PORC_BUSH_X = 0.31;
/**
 * THE STAGE (depth rule): the middle of the strip is where the walkers stop and act (the landowner
 * on his quad, Safety Sam, the sitting bear). No prop stands there and the scenery keeps its
 * trees out of it, so nobody ever stands parked in front of one (a pipe sticking up behind the
 * bear's head). Props stand to its left or its right.
 */
export const STAGE = { from: 0.34, to: 0.67 } as const;
export function stageBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  return { x: STAGE.from * screenW, y: strip.top, width: (STAGE.to - STAGE.from) * screenW, height: strip.bottom - strip.top };
}
/** Where the lease sign stands on a Duvernay level: left of the stage (the sitting bear would cover it at its usual spot). */
export const WINTER_SIGN_X = 0.345;
/** The patch of the strip a gag bush stands on (scenery keeps trees off it). */
export function bushBox(x: number, screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const w = BUSH_FRAC * scale * screenW;
  // (Tall enough that no tree stands close behind the bush, where the bush would cover it.)
  return { x: x * screenW - w / 2, y: ground - w * 1.1, width: w, height: w * 1.1 };
}
/** Where the Cardium mound stands for the gags: on the strip's ground line, its heap the size of the reference's. */
export function moundSpot(screenW: number, strip: { top: number; bottom: number }): { baseY: number; w: number } {
  const { scale } = stripGeom(screenW, strip);
  // (Prop row 2: the porcupine, bolting off along the bush's row, passes in front of it.)
  return { baseY: propLine(screenW, strip, 2), w: moundWidthFor(screenW, scale) };
}

/**
 * Where the frosty riser stands on winter levels (a share of the screen's width): left of the stage
 * (see `STAGE`: the bear sits in the middle), with room on both sides of it (the buddy comes back on its far side).
 */
export const RISER_X = 0.24;
/** The patch of the strip the riser and the stuck worker stand on (scenery keeps trees off it). */
export function riserBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const u = (WORKER_FRAC * scale * screenW) / 120;
  // From where his buddy stops to the riser's far side.
  return { x: RISER_X * screenW + (BUDDY_STOP - 20) * u, y: ground - 40 * u, width: (20 - BUDDY_STOP + 20) * u, height: 40 * u };
}
/** How tall the riser stands (px), for a strip. */
export const riserHeight = (screenW: number, strip: { top: number; bottom: number }): number => (RISER_FRAC * stripGeom(screenW, strip).scale * screenW * 104) / 40;

/** The frosty pipeline riser: permanent scenery on winter levels. It stands off the lease, never on the berm. */
export class RiserProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer prop-layer riser-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.pup = riserPup(this.layer, { x: RISER_X, y: 0.8 }, 1);
    this.layout();
  }

  scale(): number {
    return stripGeom(this.host.screen.getBoundingClientRect().width, this.host.strip()).scale;
  }

  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const strip = this.host.strip();
    const { scale } = stripGeom(screen.width, strip);
    this.pup.frac = RISER_FRAC * scale;
    // (Prop row 2: the bear, walking in along his bush's row, passes in front of it.)
    this.pup.spot = { x: RISER_X, y: propLine(screen.width, strip, 2) / screen.height };
    place(this.pup);
    // No room under the berm for it (a very short strip): it is left out rather than drawn over the lease.
    const berm = this.host.board.querySelector('canvas.berm')?.getBoundingClientRect();
    const clear = Math.max(strip.top, berm ? berm.bottom - screen.top : 0);
    // (Measured on the riser's own drawing, not on its picture's box, which has empty room over the pipe's cap.)
    this.layer.style.visibility = (this.pup.svg.querySelector('g') ?? this.pup.svg).getBoundingClientRect().top - screen.top < clear ? 'hidden' : '';
  }

  get fits(): boolean {
    return this.layer.style.visibility !== 'hidden';
  }

  /** Is this point (client px) on the riser? Its tap target is at least `RISER_TAP` px each way, about its middle. */
  hit(x: number, y: number): boolean {
    const r = (this.pup.svg.querySelector('g') ?? this.pup.svg).getBoundingClientRect();
    const w = Math.max(RISER_TAP, r.width + 8), h = Math.max(RISER_TAP, r.height + 8);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2;
  }
}
/** The riser's tap target is at least this big (px). */
export const RISER_TAP = 44;

/** Where the cow grazes across the screen (a share of its width): the right of the strip, the bull stopping between her and the biffy. */
export const COW_X = 0.79;
/** The patch of the strip kept clear of trees for the cow and the bull's stop. */
export function cowBox(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  const left = (COW_X - BULL_GAP * scale - BULL_FRAC * scale * 0.2) * screenW, right = Math.min(screenW, (COW_X + COW_FRAC * scale * 0.5) * screenW);
  const h = COW_FRAC * scale * screenW * 0.5;
  return { x: left, y: ground - h, width: right - left, height: h };
}

/** The Holstein cow: permanent scenery in the Montney strip, grazing. She only moves during the gag, and ends it back in her spot. */
export class CowProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer prop-layer cow-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.pup = cowPup(this.layer, { x: COW_X, y: 0.8 }, 1);
    this.layout();
  }

  scale(): number {
    return stripGeom(this.host.screen.getBoundingClientRect().width, this.host.strip()).scale;
  }

  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const { scale } = stripGeom(screen.width, this.host.strip());
    this.pup.frac = COW_FRAC * scale;
    // (Prop row 1: the landowner's quad and everybody else on the walking lane pass in front of her.)
    this.pup.spot = { x: COW_X, y: propLine(screen.width, this.host.strip(), 1) / screen.height };
    this.rest();
  }

  rest(): void {
    cowApply(this.pup, COW_REST);
  }

  /** Is this point (client px) on her? */
  hit(x: number, y: number): boolean {
    const r = (this.pup.q('.root') as SVGGElement).getBoundingClientRect();
    return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
  }

  /** Back to grazing. */
  reset(): void {
    this.rest();
  }
}

interface Bubble {
  from: number;
  to: number;
  text: string;
  /** Where the speaker is, in screen px (used if the speaker's own element is not to be found). */
  at: () => { x: number; y: number };
  /** The speaker's head: the bubble's tail touches it and follows it. */
  who?: () => Element | null;
}
interface Built {
  apply: (t: number) => void;
  bubble?: Bubble;
  /** More lines, said at their own times (one bubble at a time). */
  lines?: Bubble[];
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
  private run: { layers: HTMLElement[]; built: Built; frame: number; bubble: HTMLElement | null; said: Bubble | null; timers: number[]; done: (r: EggResult) => void } | null = null;

  private held: { layers: HTMLElement[]; built: Built } | null = null;

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
      (this.host.mount ?? ((x: HTMLElement) => this.host.screen.append(x)))(el);
      layers.push(el);
      return el;
    };
    const built = this.def.build(layer, this.host);
    if (!built) {
      layers.forEach((l) => l.remove());
      return Promise.resolve('none');
    }
    return new Promise((resolve) => {
      const run = { layers, built, frame: 0, bubble: null as HTMLElement | null, said: null as Bubble | null, timers: [] as number[], done: resolve };
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
        const line = built.bubble ?? built.lines?.find((x) => this.def.stillAt >= x.from - 0.6) ?? null;
        if (line) later(450, () => (run.bubble = this.speak(mark, line)));
        later(2300, () => layers.forEach((l) => (l.style.opacity = '0')));
        later(2700, () => this.finish('seen'));
        return;
      }
      const start = performance.now();
      const tick = () => {
        if (this.run !== run) return;
        const t = (performance.now() - start) / 1000;
        built.apply(t);
        markBeat(mark, this.def.name as GagId, beatAt(this.def.beats, t));
        const b = [...(built.bubble ? [built.bubble] : []), ...(built.lines ?? [])].find((x) => t >= x.from && t < x.to) ?? null;
        if (b !== run.said) {
          run.bubble?.remove();
          run.bubble = b ? this.speak(mark, b) : null;
          run.said = b;
        }
        if (t >= this.def.end) return this.finish('seen');
        run.frame = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  clear(): void {
    if (this.run) this.finish('none');
    this.release();
  }

  /** How long the gag runs (s). */
  get end(): number {
    return this.def.end;
  }

  /** Its beats on its own clock: [time, id, what happens]. */
  get beats(): [number, string, string][] {
    return this.def.beats;
  }

  /**
   * Tests (`?gagtest=1`): sets the gag's scene and holds it at time `t`, with no clock running, so
   * a frame can be looked at. `release()` ends it the way a finished gag ends.
   */
  hold(t: number): boolean {
    if (this.run) return false;
    if (!this.held) {
      const layers: HTMLElement[] = [];
      const built = this.def.build((cls) => {
        const el = document.createElement('div');
        el.className = `scene-layer puppet-layer strip-layer ${cls}`;
        el.setAttribute('aria-hidden', 'true');
        el.dataset.gag = this.def.name;
        (this.host.mount ?? ((x: HTMLElement) => this.host.screen.append(x)))(el);
        layers.push(el);
        return el;
      }, this.host);
      if (!built) {
        layers.forEach((l) => l.remove());
        return false;
      }
      this.held = { layers, built };
    }
    this.held.built.apply(t);
    return true;
  }

  release(): void {
    if (!this.held) return;
    this.held.built.done?.('seen');
    this.held.layers.forEach((l) => l.remove());
    this.held = null;
  }

  private speak(layer: HTMLElement, b: Bubble): HTMLElement {
    let anchor = b.who?.() ?? null;
    if (!anchor) {
      const at = b.at();
      anchor = document.createElement('i');
      Object.assign((anchor as HTMLElement).style, { position: 'absolute', left: `${at.x}px`, top: `${at.y}px`, width: '0', height: '0' });
      layer.append(anchor);
    }
    // Over the speaker's head; beside it where there is no room above.
    const bubble = this.host.say(anchor, b.text, ['above', 'right', 'left', 'below']);
    bubble.dataset.gag = this.def.name;
    return bubble;
  }

  private finish(result: EggResult): void {
    sound.gagEnd(this.def.name as GagId);
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
    const mound = host.screen.querySelector<SVGElement>('[data-anchor="mound"]');
    if (!mound) return null;
    const screen = host.screen.getBoundingClientRect();
    const m = mound.getBoundingClientRect();
    // The hole, as drawn on the mound (33, 17.5 of its 64 x 34 box).
    const hole = { x: m.left - screen.left + (33 / 64) * m.width, y: m.top - screen.top + (17.5 / 34) * m.height };
    const scale = Math.min(1, m.width / (GOPHER_FRAC * screen.width * 1.25));
    // The gopher lives in a layer that ends at the hole line, so he comes up out of the hole.
    const under = layer('gopher-layer');
    under.style.height = `${hole.y}px`;
    // HE COMES UP OUT OF THE HOLE, IN FRONT OF THE MOUND (Job Y). His layer ends at the hole line, and a line worked
    // out from that stood ABOVE the mound's own (530 against 539 at 390 x 664), so the whole mound was drawn over
    // him and he rose BEHIND it. His layer stands on the mound's own ground line (put on after it: drawn over it),
    // and the hole's near lip is drawn over him on that same line, as in Gopher Lunch.
    const moundLine = Number(mound.dataset.ground);
    const lips = layer('gopher-lip-layer');
    if (Number.isFinite(moundLine)) { setGround(under, moundLine, 'set'); setGround(lips, moundLine, 'set'); }
    const frame = lips.getBoundingClientRect();
    const lip = makePup(lips, LIP, { vw: MOUND_BOX.vw, vh: MOUND_BOX.vh, ax: 0, ay: 0, frac: m.width / (frame.width || screen.width), spot: { x: (m.left - frame.left) / (frame.width || screen.width), y: (m.top - frame.top) / (frame.height || screen.height) } });
    place(lip);
    const over = layer('hotshot-layer');
    const scene = nearMissScene(under, over, { x: hole.x / screen.width, y: 1 }, stripGeom(screen.width, host.strip()).ground / screen.height, scale);
    scene.holeY = hole.y;
    const w = GOPHER_FRAC * scale * screen.width;
    return { apply: (t) => nApply(scene, nPose(t), t), bubble: { from: 6.0, to: 7.8, text: NEAR_MISS_LINE, who: () => scene.g.q('.head'), at: () => ({ x: hole.x + (hole.x > screen.width * 0.6 ? -1 : 1) * w * 1.6, y: hole.y - w * 0.7 }) } };
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
    return { apply: (t) => lApply(scene, lPose(t), t), bubble: { from: 4.0, to: 6.1, text: fromPool(LANDOWNER_LINES), who: () => scene.p.q('.head'), at: () => ({ x: screen.width / 2 + w * 0.05, y: ground - w * 0.74 }) } };
  },
};

/** Gag 6: "Occupied", on the permanent biffy. He shuts himself in, so the indicator stays red. */
export const biffyADef = (biffy: BiffyProp): TimelineDef => ({
  name: 'biffyA',
  beats: A_BEATS,
  end: A_END,
  stillAt: 2.2,
  build(layer) {
    // (An empty layer that marks the gag; it stands with the biffy.)
    setGround(layer('biffy-mark'), Number(biffy.layer.dataset.ground), 'set');
    const scene = { p: biffy.pup };
    return {
      apply: (t) => aApply(scene, t),
      done: () => {
        biffy.rest();
      },
    };
  },
});

/** Gag 7: "The runaway roll". The shuffler and the roll leave past the screen edge nearest the biffy; the indicator ends green. */
export const biffyBDef = (biffy: BiffyProp): TimelineDef => ({
  name: 'biffyB',
  beats: B_BEATS,
  end: B_END,
  stillAt: 3.6,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { scale } = stripGeom(screen.width, host.strip());
    const occ = biffy.pup.q('.occ') as SVGElement;
    // Nobody is seen through the doorway: he is in the dark until he shuffles out.
    occ.style.display = 'none';
    const over = layer('shuffler-layer');
    // The roll and the shuffler stand on the biffy's OWN ground line, to the pixel, so their layer (put on after it)
    // is drawn over it: a line worked out again came a pixel short on some screens, and both played BEHIND the biffy.
    setGround(over, Number(biffy.layer.dataset.ground), 'set');
    const scene = runawayScene(biffy.pup, over, scale);
    return {
      apply: (t) => bApply(scene, t),
      done: () => {
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
    // He stands in the strip (under the night's shade, like every strip gag); only his stick lies over the lease.
    const scene = marshmallowScene(layer('marshmallow-layer'), layer('marshmallow-layer over-lease'), { x: x / screen.width, y: ground / screen.height }, scale, pick.tip, pick.f);
    // In from past the left edge, out past the right one (in his drawing's units).
    const u = w / 120;
    const from = -(x + w) / u, to = (screen.width - x + w) / u;
    return {
      apply: (t) => mmApply(scene, mmPose(t, from, to), t),
      bubble: { from: 7.27, to: 8.0, text: MM_LINE, who: () => scene.w.q('.head'), at: () => ({ x: x + w * 0.3, y: ground - w * 0.8 }) },
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
    return { apply: (t) => gApply(scene, t), bubble: { from: 3.7, to: 4.6, text: GEESE_LINE, who: () => scene.lost.q('.head'), at: () => ({ x: scene.at.x, y: scene.at.y - gw * 0.3 }) } };
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

/**
 * Gag 12: the porcupine, at the gag bush. One layer holds the porcupine and the squatting worker
 * (behind the bush), the bush, the shuffler and the roll, stacked as in the reference.
 */
export const porcupineDef = (bush: BushProp): TimelineDef => ({
  name: 'porcupine',
  beats: PC_BEATS,
  end: PC_END,
  stillAt: 6.2,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { x, y, scale } = bush.spot();
    const scene = porcupineScene(layer('porcupine-layer'), { x, y }, scale, bush.season);
    bush.show(false);
    // The worker in from past the left edge and off past it again; the porcupine out past the right one (each in its own units).
    const at = x * screen.width;
    const unit = (frac: number, box: number) => (frac * scale * screen.width) / box;
    const from = -(at + 0.19 * scale * screen.width) / unit(0.19, 120);
    const out = -(at + QUILL_SHUFFLER_FRAC * scale * screen.width) / unit(QUILL_SHUFFLER_FRAC, 120);
    const bolt = (screen.width - at + PORC_FRAC * scale * screen.width) / unit(PORC_FRAC, 100);
    return { apply: (t) => pcApply(scene, pcPose(t + SHIFT, from, out, bolt), t + SHIFT), done: () => bush.show(true) };
  },
});

/** Gag 13: gopher lunch, at the board's own gopher mound (Cardium). */
export const lunchDef: TimelineDef = {
  name: 'gopherLunch',
  beats: LUNCH_BEATS,
  end: LUNCH_END,
  stillAt: 10.9,
  build(layer, host) {
    const moundEl = host.screen.querySelector<SVGElement>('[data-anchor="mound"]');
    if (!moundEl) return null;
    const screen = host.screen.getBoundingClientRect();
    const m = moundEl.getBoundingClientRect();
    const { scale } = stripGeom(screen.width, host.strip());
    const scene = lunchScene(layer('lunch-layer'), { left: m.left - screen.left, top: m.top - screen.top, width: m.width, height: m.height }, scale, moundEl);
    // In from past the NEAR edge (the right one: the mound is on that side), past the mound, and
    // off the same way at the end (in his drawing's units; his box is 120 wide about his middle).
    const w = 0.19 * scale * screen.width, u = w / 120, at = scene.moundX - LUNCH_GAP * scale * screen.width;
    const from = (screen.width - at) / u + 66;
    return { apply: (t) => lunchApply(scene, lunchPose(t, from, from), t), done: () => (moundEl.style.transform = '') };
  },
};

/** Gag 14: Safety Sam, in the middle of the bottom strip. No speech bubble: "tsk" and SEE ME are drawn. */
export const samDef: TimelineDef = {
  name: 'sam',
  beats: SAM_BEATS,
  end: SAM_END,
  stillAt: 5.8,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const { ground, scale } = stripGeom(screen.width, host.strip());
    const scene = samScene(layer('sam-layer'), { x: SAM_X, y: ground / screen.height }, scale);
    // In from past the left edge, and backing off past it again (in his drawing's units).
    const w = WORKER_FRAC * scale * screen.width, from = -(SAM_X * screen.width + w) / (w / 120);
    return { apply: (t) => samFrame(scene, samPose(t, from, from), t) };
  },
};

/**
 * THE LEASE SIGN: permanent scenery at one fixed spot in the bottom strip of every level (not
 * random any more). `SIGN_X`: right of the middle, in the open row up by the berm (the biffy's row,
 * a little nearer the buttons so its visitors pass in front of the biffy), with a clear lane to the
 * NEAR screen edge (the right), where its visitors come from.
 */
export const SIGN_X = 0.62;
/** Where the sign stands on THIS level (Mannville stands it left of its lane aspen: scene-stage.ts). Set before the level's SignProp is made. */
let signX: number = SIGN_X;
export const setSignX = (x: number = SIGN_X): void => void (signX = x);
/** The line the sign and its visitors stand on (screen px), and the strip's scale. */
export function signStand(screenW: number, strip: { top: number; bottom: number }): { ground: number; scale: number } {
  const { ground, scale } = stripGeom(screenW, strip);
  return { ground: Math.min(ground, biffyStand(screenW, strip).ground + 0.035 * screenW * scale), scale };
}
/** The lane kept clear of trees: from where the surveyor works (left of the sign) to the near screen edge. */
export function signLane(screenW: number, strip: { top: number; bottom: number }): { x: number; y: number; width: number; height: number } {
  const { ground, scale } = signStand(screenW, strip);
  const u = (VISITOR_FRAC * scale * screenW) / 120;
  const left = signX * screenW - 112 * u;
  return { x: left, y: ground - 60 * u, width: screenW - left, height: 60 * u + 2 };
}
export class SignProp {
  readonly layer: HTMLElement;
  pup: Pup;
  private host: EggHost;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer prop-layer sign-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.pup = signPup(this.layer, 1, { x: signX, y: 0.8 });
    this.layout();
  }

  scale(): number {
    return signStand(this.host.screen.getBoundingClientRect().width, this.host.strip()).scale;
  }

  layout(): void {
    const screen = this.host.screen.getBoundingClientRect();
    if (!screen.height) return;
    const { ground, scale } = signStand(screen.width, this.host.strip());
    this.pup.frac = SIGN_FRAC * scale;
    this.pup.spot = { x: signX, y: ground / screen.height };
    this.rest();
  }

  /** Standing where it always stands, upright. */
  rest(): void {
    place(this.pup);
    this.pup.svg.style.transform = '';
  }

  /** Is this point (client px) on the sign? */
  hit(x: number, y: number): boolean {
    const r = (this.pup.q('.sg') as SVGGElement).getBoundingClientRect();
    return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
  }
}

/** A sign gag's stage: one layer; its visitors live in a holder mirrored about the sign, because they come from the right (the near edge) and the reference brings them from the left. */
function signStage(layer: (cls: string) => HTMLElement, host: EggHost, cls: string) {
  const screen = host.screen.getBoundingClientRect();
  const { ground, scale } = signStand(screen.width, host.strip());
  const frame = layer(cls);
  const stage = document.createElement('div');
  stage.className = 'sign-stage';
  stage.style.transformOrigin = `${signX * screen.width}px 50%`;
  stage.style.transform = 'scaleX(-1)';
  frame.append(stage);
  const u = (VISITOR_FRAC * scale * screen.width) / 120;
  const spot = { x: signX, y: ground / screen.height };
  // How far from the sign (their units) a visitor is fully off the near edge, and off the far one.
  const near = ((1 - signX) * screen.width) / u + 72, far = (signX * screen.width) / u + 80;
  return { screen, frame, stage, scale, spot, near, far, strip: host.strip() };
}

/** Gag 16: the surveyor moves the lease sign a metre, and moves it back. */
export const surveyorDef = (sign: SignProp): TimelineDef => ({
  name: 'surveyor',
  beats: SURVEY_BEATS as [number, string, string][],
  end: SURVEY_END,
  stillAt: 3.4,
  build(layer, host) {
    const s = signStage(layer, host, 'surveyor-layer');
    const scene: any = surveyScene(s.stage, s.frame, sign.pup, s.scale, s.spot, true);
    const off = Math.max(330, s.near);
    const who = () => scene.man.q('.head') as Element;
    return {
      apply: (t) => surveyApply(scene, surveyPose(t, off), t),
      lines: SURVEY_LINES.map((l) => ({ ...l, who, at: () => ({ x: 0, y: 0 }) })),
      done: () => sign.rest(),
    };
  },
});

/** Gag 17: the back scratcher. A mule deer rubs its cheek and neck on the sign's near post. Not on winter levels. */
export const deerDef = (sign: SignProp): TimelineDef => ({
  name: 'deer',
  beats: DEER_BEATS as [number, string, string][],
  end: DEER_END,
  stillAt: 4.2,
  build(layer, host) {
    const s = signStage(layer, host, 'deer-layer');
    const scene: any = deerScene(s.stage, s.frame, sign.pup, s.scale, s.spot, true);
    const off = Math.max(330, s.near + 12), far = Math.max(460, s.far + 12);
    return { apply: (t) => deerApply(scene, deerPose(t, off, far), t), done: () => sign.rest() };
  },
});

/** Gag 18: the tourists. She photographs him posing by the sign; then the mosquitoes. Not on winter levels. */
export const touristsDef = (sign: SignProp): TimelineDef => ({
  name: 'tourists',
  beats: TOUR_BEATS as [number, string, string][],
  end: TOUR_END,
  stillAt: 3.45,
  build(layer, host) {
    // (The flash's own layer, over the lease, is made first: the gag's last layer stays the one its beats are marked on.)
    const flashOn = layer('flash-layer over-lease');
    const s = signStage(layer, host, 'tourists-layer');
    const scr = host.screen.getBoundingClientRect();
    const scene: any = tourScene(s.stage, s.frame, sign.pup, s.scale, s.spot, true, flashOn, { x: s.spot.x * scr.width, y: (s.strip.top + s.strip.bottom) / 2 });
    const off = Math.max(360, s.near + 10);
    return {
      apply: (t) => tourApply(scene, tourPose(t, off), t),
      lines: [{ ...TOUR_LINE, who: () => scene.him.q('.head') as Element, at: () => ({ x: 0, y: 0 }) }],
      done: () => sign.rest(),
    };
  },
});

/** Gag 15: the frozen tongue, at the (permanent) frosty riser. */
export const tongueDef = (riser: RiserProp): TimelineDef => ({
  name: 'tongue',
  beats: TONGUE_BEATS,
  end: TONGUE_END,
  stillAt: 8.3,
  build(layer, host) {
    if (!riser.fits) return null;
    const screen = host.screen.getBoundingClientRect();
    const strip = host.strip();
    const scale = riser.scale();
    // (The flash's own layer, over the lease, is made first: the gag's last layer stays the one its beats are marked on.)
    const flashOn = layer('flash-layer over-lease');
    const scene = tongueScene(layer('tongue-layer'), riser.pup, scale, flashOn, { x: RISER_X * screen.width, y: (strip.top + strip.bottom) / 2 });
    // In from past the left edge; the worker leaves that way, his buddy comes back from past the right edge and leaves that way (their drawing's units, from the riser).
    const w = WORKER_FRAC * scale * screen.width, u = w / 120, from = -(RISER_X * screen.width + w) / u, far = ((1 - RISER_X) * screen.width + w) / u;
    return {
      apply: (t) => tongueApply(scene, tonguePose(t, from, from, BUDDY_STOP, far, far), t),
      bubble: { from: 5.0, to: 6.4, text: TONGUE_LINE, who: () => scene.worker.q('.head'), at: () => ({ x: scene.head.x, y: scene.head.y }) },
    };
  },
});

/** Gag 11: the bull and the (permanent) cow. No speech, just hearts. She bolts, and at the end wanders back to her spot. */
export const bullDef = (cow: CowProp): TimelineDef => ({
  name: 'bull',
  beats: BULL_BEATS,
  end: BULL_END,
  stillAt: 5.2,
  build(layer, host) {
    const screen = host.screen.getBoundingClientRect();
    const scale = cow.scale();
    const scene = bullScene(layer('bull-layer'), cow.pup, scale);
    // The bull in from past the left edge; both of them out past the right one, and she back in from there (each in its own units).
    const wB = BULL_FRAC * scale * screen.width, uB = wB / 170, xB = scene.bull.spot.x * screen.width;
    const wC = COW_FRAC * scale * screen.width, uC = wC / 170, xC = cow.pup.spot.x * screen.width;
    const from = -(xB + wB) / uB, charge = (screen.width - xB + wB) / uB, to = (screen.width - xC + wC) / uC;
    return { apply: (t) => bullApply(scene, bullPose(t, from, to, charge), t), done: () => cow.rest() };
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
/** Occupied: the biffy with its door open on him, framed on the biffy itself (its true shape: taller than wide). */
export const biffyAStill = () => still((h) => {
  const p = biffyPup(h, { x: 0.5, y: 1 }, 1);
  return () => aApply({ p }, 2.2);
}, 'svg.pup', 'biffy-still', '-10 2 106 136');
/** The Runaway Roll: one big toilet paper roll, a short tail of paper trailing from it. */
export const biffyBStill = () =>
  '<svg class="egg-still roll-still" viewBox="0 0 120 84" aria-hidden="true">' +
  '<ellipse cx="62" cy="76" rx="40" ry="5" fill="rgba(40,60,20,.2)"/>' +
  // The tail of paper, lying behind the roll and curling at its end.
  '<path d="M52 66 Q30 70 14 62 Q6 58 8 50" fill="none" stroke="#2b1e16" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M52 66 Q30 70 14 62 Q6 58 8 50" fill="none" stroke="#fbfbf6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M40 68.5 L40 64 M28 67.5 L28 62.5" stroke="#d9d6cc" stroke-width="1.6" stroke-dasharray="1.5 2"/>' +
  // The roll, seen a little from the side: its face and the tube in the middle.
  '<circle cx="70" cy="40" r="32" fill="#fbfbf6" stroke="#2b1e16" stroke-width="3.4"/>' +
  '<path d="M48 22 Q58 12 72 11" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>' +
  '<circle cx="70" cy="40" r="22" fill="none" stroke="#e4e1d6" stroke-width="2"/><circle cx="70" cy="40" r="27" fill="none" stroke="#e4e1d6" stroke-width="1.6"/>' +
  '<circle cx="70" cy="40" r="11.5" fill="#b9a98a" stroke="#2b1e16" stroke-width="2.8"/><circle cx="70" cy="40" r="6.5" fill="#6f6250"/>' +
  // Speed lines: it is getting away.
  '<path d="M106 26 L116 26 M108 40 L118 40 M106 54 L114 54" stroke="#2b1e16" stroke-width="3" stroke-linecap="round"/>' +
  '</svg>';
