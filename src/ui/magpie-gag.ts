// Puts the magpie gag (magpie.ts) on screen. The bird lives on a layer above the WHOLE game screen
// (not inside the board), so he is never clipped by the board, the berm or any container: he flies
// in from fully off screen and out until he is fully off screen. The layer takes no touches. The
// splat and its drip belong to the truck, so they stay on it and move with it.
import type { BubbleSide } from './bubble.ts';
import type { GameState, Side } from '../engine/index.ts';
import { sound } from '../audio/engine.ts';
import { BIRD, BIRD_FRAC, MARK_FRAC, DRIP, DRIP_FULL, END, FEATHER, GONE, MAGPIE_LINES, SPLAT, STARTLE, T_BUBBLE, T_LAND, T_SMUG, T_SPLAT, beatAt, dripTurn, fxAt, offScreen, pickTruck, pose, poseAttrs, roofSpot, startlePose, travelFor, type Pose, type Travel } from './magpie.ts';
import { fromPool } from './lines.ts';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface MagpieHost {
  /** The game screen: the bird's layer covers all of it. */
  screen: HTMLElement;
  truckElement(id: string): HTMLElement | undefined;
  state(): GameState;
  /** A driver's speech bubble (kept on screen by the board). */
  say(anchor: Element, text: string, prefer?: readonly BubbleSide[]): HTMLElement;
  /** Puts a gag's layer on the screen (under the night's shade). */
  mount?(el: HTMLElement): void;
}

/** The splat and drip against the bird's width: he is smaller than the reference, his mark is not. */
const MARK = MARK_FRAC / BIRD_FRAC;

interface Run {
  layer: HTMLElement;
  truckId: string;
  truckEl: HTMLElement;
  /** His spot on the roof, in the truck element's own px. */
  local: { x: number; y: number };
  w: number;
  travel: Travel;
  start: number;
  frame: number;
  /** Set once he's been startled: when (gag seconds), from what pose, at what screen spot, flying how far. */
  startle: { at: number; from: Pose; spot: { x: number; y: number }; out: { x: number; y: number } } | null;
  splat: HTMLElement | null;
  drip: HTMLElement | null;
  landed: boolean;
  spoke: boolean;
  done: (splatted: boolean) => void;
}

export class MagpieGag {
  private host: MagpieHost;
  private run: Run | null = null;

  constructor(host: MagpieHost) {
    this.host = host;
  }

  get playing(): boolean {
    return this.run !== null;
  }

  /**
   * Plays the gag once, on a parked truck whose roof is clear of the board's edge. Resolves when
   * the bird has gone (fully off screen): true if he left his mark, false if he was scared off
   * before he could (or there was no truck to land on).
   */
  play(): Promise<boolean> {
    if (this.run) return Promise.resolve(false);
    const state = this.host.state();
    const truck = pickTruck(state);
    const truckEl = truck && this.host.truckElement(truck.id);
    if (!truck || !truckEl) return Promise.resolve(false);
    const screen = this.host.screen.getBoundingClientRect();
    const w = BIRD_FRAC * screen.width;
    // His spot: the middle of the cab roof, as a share of the truck element.
    const roof = roofSpot(state.level, truck);
    const horizontal = truck.orient === 'h';
    const local = {
      x: ((roof.x - truck.col) / (horizontal ? truck.length : 1)) * truckEl.offsetWidth,
      y: ((roof.y - truck.row) / (horizontal ? 1 : truck.length)) * truckEl.offsetHeight,
    };
    const layer = document.createElement('div');
    layer.className = 'scene-layer magpie-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      `<div class="mp-fx mp-drop"><div></div></div><div class="mp-fx mp-feather">${FEATHER}</div>` + `<svg class="magpie" viewBox="0 0 120 120">${BIRD}</svg>`;
    (this.host.mount ?? ((el: HTMLElement) => this.host.screen.append(el)))(layer);
    return new Promise((resolve) => {
      const run: Run = { layer, truckId: truck.id, truckEl, local, w, travel: travelFor(this.spotOf(truckEl, local), w, screen.width), start: performance.now(), frame: 0, startle: null, splat: null, drip: null, landed: false, spoke: false, done: resolve };
      this.run = run;
      if (reducedMotion()) return void this.still(run);
      const tick = () => {
        if (this.run !== run) return;
        this.draw(run, (performance.now() - run.start) / 1000);
        if (this.run === run) run.frame = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  /** A truck was grabbed: if it is his, he startles and flies off early. */
  grabbed(truckId: string): void {
    const run = this.run;
    if (!run || run.startle || run.truckId !== truckId || reducedMotion()) return;
    this.scare(run, (performance.now() - run.start) / 1000);
  }

  /** The level was rebuilt or left: he is gone at once (the splat goes with the truck). */
  clear(): void {
    const run = this.run;
    if (!run) return;
    this.finish(run, false);
  }

  private spotOf(truckEl: HTMLElement, local: { x: number; y: number }): { x: number; y: number } {
    const screen = this.host.screen.getBoundingClientRect();
    const r = truckEl.getBoundingClientRect();
    return { x: r.left - screen.left + local.x, y: r.top - screen.top + local.y };
  }

  private scare(run: Run, t: number): void {
    if (t >= 9.6) return; // already winding up to leave: let him go
    const spot = this.spotOf(run.truckEl, run.local);
    const from = pose(t, run.travel);
    const unit = run.w / 120;
    const out = travelFor({ x: spot.x + from.x * unit, y: spot.y + Math.min(0, from.y) * unit }, run.w, this.host.screen.getBoundingClientRect().width);
    run.startle = { at: t, from, spot, out: { x: out.outX, y: out.outY } };
    sound.squawk();
  }

  private draw(run: Run, t: number): void {
    // His truck drove out (or was removed) under him: same as being grabbed.
    if (!run.startle && !run.truckEl.isConnected) {
      if (t < 9.6) run.startle = { at: t, from: pose(t, run.travel), spot: run.layer.dataset.spot ? JSON.parse(run.layer.dataset.spot) : { x: 0, y: 0 }, out: { x: run.travel.outX, y: run.travel.outY } };
    }
    const spot = run.startle ? run.startle.spot : this.spotOf(run.truckEl, run.local);
    if (!run.startle) run.layer.dataset.spot = JSON.stringify(spot);
    const p = run.startle ? startlePose(t - run.startle.at, run.startle.from, run.startle.out) : pose(t, run.travel);
    const screenW = this.host.screen.getBoundingClientRect().width;
    this.apply(run, p, spot);
    run.layer.dataset.beat = run.startle ? 'startle' : beatAt(t);
    run.layer.dataset.off = String(!p.show || offScreen(p, spot, run.w, screenW));

    if (!run.startle) {
      if (!run.landed && t >= T_LAND) {
        run.landed = true;
        sound.squawk();
      }
      if (!run.splat && t >= T_SPLAT) this.leaveSplat(run);
      if (!run.spoke && t >= T_BUBBLE && run.truckEl.isConnected) {
        run.spoke = true;
        sound.grunt();
        this.speak(run, spot);
      }
    }
    // The dropping, swelling under the tail and then falling (only while he's still at it).
    const fx = fxAt(t);
    const drop = run.layer.querySelector<HTMLElement>('.mp-drop')!;
    if (fx.drop && !run.startle) {
      this.place(drop, spot, run.w, -0.28, -0.2 + fx.drop.fall * 0.18, 0.05, fx.drop.len);
      drop.style.opacity = '1';
    } else drop.style.opacity = '0';
    // The drip keeps running toward the truck's front, whatever the bird is doing.
    if (run.drip && fx.drip !== null) run.drip.style.height = `${fx.drip * run.w * MARK}px`;
    // A feather left behind on take-off, drifting down.
    const feather = run.layer.querySelector<HTMLElement>('.mp-feather')!;
    const f = run.startle ? fxAt(10.0 + (t - run.startle.at - STARTLE.hop)).feather : fx.feather;
    if (f && (!run.startle || t - run.startle.at > STARTLE.hop)) {
      const base = run.startle ? { x: spot.x + run.startle.from.x * (run.w / 120), y: spot.y } : spot;
      this.place(feather, base, run.w, f.x, f.y, 0.22, 0.09);
      feather.style.transform = `rotate(${f.rot}deg)`;
      feather.style.opacity = '1';
    } else feather.style.opacity = '0';

    const over = run.startle ? t - run.startle.at >= STARTLE.gone + (END - GONE) : t >= END;
    if (over) this.finish(run, !!run.splat);
  }

  /** Reduced motion: the bird fades in (smug), the splat appears, the driver says his line, the bird fades out. */
  private still(run: Run): void {
    const spot = this.spotOf(run.truckEl, run.local);
    run.layer.dataset.beat = 'still';
    run.layer.style.opacity = '0';
    run.layer.style.transition = 'opacity 0.35s';
    this.apply(run, pose(T_SMUG), spot);
    void run.layer.offsetWidth;
    run.layer.style.opacity = '1';
    const later = (ms: number, f: () => void) => window.setTimeout(() => this.run === run && f(), ms);
    later(450, () => {
      this.leaveSplat(run);
      if (run.drip) run.drip.style.height = `${DRIP_FULL * run.w * MARK}px`;
      sound.grunt();
      this.speak(run, spot);
    });
    later(2300, () => (run.layer.style.opacity = '0'));
    later(2700, () => this.finish(run, true));
  }

  /**
   * The DRIVER's line (one of `MAGPIE_LINES`: "Not the windshield!"): a bubble whose tail is on the
   * cab the bird is standing on, beside the cab (never over the bird), on whichever side has more
   * room. It rides with the truck.
   */
  private speak(run: Run, spot: { x: number; y: number }): void {
    const screenW = this.host.screen.getBoundingClientRect().width;
    const cab = run.truckEl.querySelector('.cab') ?? run.truckEl;
    const sides: BubbleSide[] = spot.x < screenW / 2 ? ['right', 'left'] : ['left', 'right'];
    const bubble = this.host.say(cab, fromPool(MAGPIE_LINES), [...sides, 'below']);
    bubble.dataset.speaker = run.truckId;
    bubble.dataset.magpie = 'true';
  }

  private apply(run: Run, p: Pose, spot: { x: number; y: number }): void {
    const svg = run.layer.querySelector<SVGSVGElement>('svg.magpie')!;
    Object.assign(svg.style, { width: `${run.w}px`, height: `${run.w}px`, left: `${spot.x - 0.5 * run.w}px`, top: `${spot.y - 0.9 * run.w}px`, visibility: p.show ? 'visible' : 'hidden' });
    const a = poseAttrs(p);
    const q = (s: string) => svg.querySelector(s)!;
    q('.flip').setAttribute('transform', a.flip);
    q('.root').setAttribute('transform', a.root);
    q('.wing').setAttribute('transform', a.wing);
    q('.tail').setAttribute('transform', a.tail);
    q('.head').setAttribute('transform', a.head);
    q('.lower').setAttribute('transform', a.lower);
    q('.pupil').setAttribute('cx', String(p.px));
    q('.pupil').setAttribute('cy', String(p.py));
    q('.glint').setAttribute('cx', String(p.px + 1.5));
    q('.glint').setAttribute('cy', String(p.py - 1.5));
    q('.lid').setAttribute('d', p.lid);
    (q('.legs') as SVGElement).style.opacity = p.legsUp ? '0' : '1';
  }

  /** Places an effect relative to his spot, in bird widths (the reference's `place`). */
  private place(el: HTMLElement, spot: { x: number; y: number }, w: number, fx: number, fy: number, fw: number, fh: number): void {
    Object.assign(el.style, { left: `${spot.x + fx * w}px`, top: `${spot.y + fy * w}px`, width: `${fw * w}px`, height: `${fh * w}px` });
  }

  /**
   * The splat lands on the roof and stays: it and its drip are part of the truck from here on, so
   * they ride with it. The drip runs toward the truck's front, whichever way the truck faces.
   */
  private leaveSplat(run: Run): void {
    if (run.splat || !run.truckEl.isConnected) return;
    // Where it lands is measured from the bird; how big it is, is the mark's own size (`m`).
    const { w, local } = run;
    const m = w * MARK;
    const [cx, cy] = [local.x - 0.23 * w, local.y + 0.04 * w];
    const home = run.truckEl.querySelector('.body') ?? run.truckEl;
    const before = home.querySelector('.bed');
    const drip = document.createElement('div');
    drip.className = 'magpie-drip';
    drip.innerHTML = DRIP;
    Object.assign(drip.style, { left: `${cx - 0.045 * m}px`, top: `${cy}px`, width: `${0.09 * m}px`, height: `${0.08 * m}px`, transformOrigin: '50% 0', transform: `rotate(${dripTurn(run.truckEl.dataset.cab as Side)}deg)` });
    const splat = document.createElement('div');
    splat.className = 'dropping magpie-splat';
    splat.innerHTML = SPLAT;
    Object.assign(splat.style, { left: `${cx - 0.13 * m}px`, top: `${cy - 0.1 * m}px`, width: `${0.26 * m}px`, height: `${0.2 * m}px` });
    home.insertBefore(drip, before);
    home.insertBefore(splat, before);
    run.splat = splat;
    run.drip = drip;
    sound.plop();
  }

  private finish(run: Run, splatted: boolean): void {
    cancelAnimationFrame(run.frame);
    if (run.drip && splatted) run.drip.style.height = `${DRIP_FULL * run.w * MARK}px`;
    run.layer.remove();
    if (this.run === run) this.run = null;
    run.done(splatted);
  }
}
