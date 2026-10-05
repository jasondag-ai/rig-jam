// Puts the sleepy worker (worker.ts) and the moose (moose.ts) on screen, the way magpie-gag.ts does
// the magpie: each on a layer over the whole game screen that takes no touches. The worker walks in
// from past the screen's left edge and leaves past it. The moose's layer sits UNDER the board and is
// cut off at the board's top line, so he rises from behind the top berm and nothing else clips him.
import type { BubbleSide } from './bubble.ts';
import { SIZE, type GameState } from '../engine/index.ts';
import { MOOSE, MOOSE_FRAC, MOOSE_LINE, M_END, T_STARE, mBeatAt, mPose, mooseColumn, mooseFrame, snowChunks } from './moose.ts';
import { CANCEL, T_ASLEEP, T_DOZE, WORKER, W_END, cancelPose, wBeatAt, wPose, workerFrame, workerOff, workerSpot, type WorkerPose } from './worker.ts';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface EggHost {
  /** The game screen: the layers cover all of it. */
  screen: HTMLElement;
  board: HTMLElement;
  cellPx(): number;
  bandPx(): number;
  /** The bottom strip in screen px: from the berm's bottom edge down to the tip line. */
  strip(): { top: number; bottom: number };
  /** Room above the board, below the HUD, in px. */
  above(): number;
  /** The sky band over the lease in screen px: from under the HUD's row down to the top berm. */
  sky(): { top: number; height: number };
  state(): GameState;
  /** A speech bubble whose tail touches `anchor` and follows it (bubble.ts); `prefer`: the sides to try first. */
  say(anchor: Element, text: string, prefer?: readonly BubbleSide[]): HTMLElement;
  /** Puts a gag's layer on the screen, under the night's shade, so the strip's gags dim exactly like the scenery. */
  mount?(el: HTMLElement): void;
}

/** A played gag resolves 'seen' (it counts as a sighting), 'cancelled', or 'none' (it could not play). */
export type EggResult = 'seen' | 'cancelled' | 'none';

interface WorkerRun {
  layer: HTMLElement;
  svg: SVGSVGElement;
  z: HTMLElement;
  spot: { x: number; y: number; w: number };
  edge: number;
  start: number;
  frame: number;
  cancel: { at: number; t0: number } | null;
  asleep: boolean;
  done: (r: EggResult) => void;
}

export class WorkerGag {
  private host: EggHost;
  private run: WorkerRun | null = null;

  constructor(host: EggHost) {
    this.host = host;
  }

  get playing(): boolean {
    return this.run !== null;
  }

  /** Is there room for him in the bottom strip on this screen? */
  canPlay(): boolean {
    return workerSpot(this.host.screen.getBoundingClientRect().width, this.host.strip()) !== null;
  }

  play(): Promise<EggResult> {
    if (this.run) return Promise.resolve('none');
    const spot = workerSpot(this.host.screen.getBoundingClientRect().width, this.host.strip());
    if (!spot) return Promise.resolve('none');
    const layer = document.createElement('div');
    layer.className = 'scene-layer puppet-layer worker-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `<svg class="pup worker" viewBox="0 0 120 120">${WORKER}</svg><div class="pup-z">z Z z</div>`;
    (this.host.mount ?? ((el: HTMLElement) => this.host.screen.append(el)))(layer);
    const svg = layer.querySelector<SVGSVGElement>('svg.pup')!;
    Object.assign(svg.style, { width: `${spot.w}px`, height: `${spot.w}px`, left: `${spot.x - 0.5 * spot.w}px`, top: `${spot.y - 0.9 * spot.w}px` });
    return new Promise((resolve) => {
      // The screen's left edge, in puppet units.
      const run: WorkerRun = { layer, svg, z: layer.querySelector<HTMLElement>('.pup-z')!, spot, edge: 60 - spot.x / (spot.w / 120), start: performance.now(), frame: 0, cancel: null, asleep: false, done: resolve };
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

  /** The player made a move: he jolts and runs off with the pail (unless he is already leaving). */
  cancel(): void {
    const run = this.run;
    if (!run || run.cancel || reducedMotion()) return;
    const t0 = (performance.now() - run.start) / 1000;
    if (cancelPose(0, t0)) run.cancel = { at: t0, t0 };
  }

  /** The level was rebuilt or left: gone at once. */
  clear(): void {
    if (this.run) this.finish(this.run, 'none');
  }

  private draw(run: WorkerRun, t: number): void {
    const c = run.cancel;
    const p = c ? cancelPose(t - c.at, c.t0)! : wPose(t);
    this.apply(run, p);
    run.layer.dataset.beat = c ? 'cancel' : wBeatAt(t);
    run.layer.dataset.off = String(workerOff(p, run.edge));
    if (!c && t >= T_ASLEEP) run.asleep = true;
    if (c ? t - c.at >= CANCEL.gone : t >= W_END) this.finish(run, c ? 'cancelled' : 'seen');
  }

  /** Reduced motion: he fades in dozing on his pail, then fades out. */
  private still(run: WorkerRun): void {
    run.layer.dataset.beat = 'still';
    run.layer.style.opacity = '0';
    run.layer.style.transition = 'opacity 0.35s';
    this.apply(run, wPose(T_DOZE));
    void run.layer.offsetWidth;
    run.layer.style.opacity = '1';
    const later = (ms: number, f: () => void) => window.setTimeout(() => this.run === run && f(), ms);
    later(2400, () => (run.layer.style.opacity = '0'));
    later(2800, () => this.finish(run, 'seen'));
  }

  private apply(run: WorkerRun, pose: WorkerPose): void {
    const f = workerFrame(pose, run.edge);
    const q = (s: string) => run.svg.querySelector<SVGElement>(s)!;
    q('.flip').style.visibility = f.show ? 'visible' : 'hidden';
    q('.flip').setAttribute('transform', f.flip);
    for (const [k, v] of Object.entries(f.parts)) q(`.${k}`).setAttribute('transform', v);
    q('.legB .shin').setAttribute('transform', f.shinB);
    q('.legF .shin').setAttribute('transform', f.shinF);
    q('.armB .fore').setAttribute('transform', f.foreB);
    q('.armF .fore').setAttribute('transform', f.foreF);
    q('.hat').setAttribute('transform', f.hat);
    q('.pupil').setAttribute('cx', String(f.px));
    q('.pupil').setAttribute('cy', String(f.py));
    q('.lid').setAttribute('d', f.lid);
    q('.brow').setAttribute('d', f.brow);
    q('.mouth').setAttribute('d', f.mouth);
    q('.mouth').setAttribute('fill', f.mouthFill);
    q('.pail').setAttribute('transform', f.pail);
    q('.blush').setAttribute('opacity', String(f.blush));
    q('.armF').style.opacity = q('.armB').style.opacity = String(f.armOpacity);
    const reach = q('.reach');
    if (f.reach) {
      reach.style.display = '';
      reach.setAttribute('transform', f.reach.transform);
      q('.grip').setAttribute('transform', f.reach.grip);
    } else reach.style.display = 'none';
    // Floating Zs while he dozes.
    const { x, y, w } = run.spot;
    run.z.style.opacity = String(f.z);
    if (f.z) {
      const zt = (performance.now() / 1000) % 2;
      Object.assign(run.z.style, { left: `${x + 0.05 * w + zt * 0.08 * w}px`, top: `${y - 0.78 * w - zt * 0.12 * w}px`, fontSize: `${Math.max(11, w * 0.16)}px` });
    }
  }

  private finish(run: WorkerRun, result: EggResult): void {
    cancelAnimationFrame(run.frame);
    run.layer.remove();
    if (this.run === run) this.run = null;
    // Cancelled after he had nodded off still counts: you saw him asleep on the job.
    run.done(result === 'cancelled' && run.asleep ? 'seen' : result);
  }
}

interface MooseRun {
  layer: HTMLElement;
  svg: SVGSVGElement;
  puffs: HTMLElement[];
  spot: { x: number; y: number; w: number };
  start: number;
  frame: number;
  bubble: HTMLElement | null;
  spoke: boolean;
  done: (r: EggResult) => void;
}

export class MooseGag {
  private host: EggHost;
  private run: MooseRun | null = null;

  constructor(host: EggHost) {
    this.host = host;
  }

  get playing(): boolean {
    return this.run !== null;
  }

  play(): Promise<EggResult> {
    if (this.run) return Promise.resolve('none');
    const screen = this.host.screen.getBoundingClientRect();
    const board = this.host.board.getBoundingClientRect();
    // A little smaller where there is little room above the board; not at all if there is none.
    const full = MOOSE_FRAC * screen.width;
    const scale = Math.min(1, (this.host.above() - 2) / (full * 0.82));
    if (scale < 0.6) return Promise.resolve('none');
    const w = full * scale;
    const col = mooseColumn(this.host.state().level.gates);
    // He stands behind the berm: cut off at the board's top line (the berm's own outer slope, drawn
    // above that line on the board, covers the cut).
    const spot = { x: board.left - screen.left + this.host.bandPx() + (col + 0.5) * this.host.cellPx(), y: board.top - screen.top + 1, w };
    const layer = document.createElement('div');
    layer.className = 'scene-layer puppet-layer moose-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.height = `${spot.y}px`;
    layer.innerHTML = `<svg class="pup moose" viewBox="0 0 120 120">${MOOSE}</svg><i class="pup-puff"></i><i class="pup-puff"></i><i class="pup-puff"></i>`;
    (this.host.mount ?? ((el: HTMLElement) => this.host.screen.append(el)))(layer);
    const svg = layer.querySelector<SVGSVGElement>('svg.pup')!;
    Object.assign(svg.style, { width: `${w}px`, height: `${w}px`, left: `${spot.x - 0.5 * w}px`, top: `${spot.y - 0.9 * w}px` });
    return new Promise((resolve) => {
      const run: MooseRun = { layer, svg, puffs: [...layer.querySelectorAll<HTMLElement>('.pup-puff')], spot, start: performance.now(), frame: 0, bubble: null, spoke: false, done: resolve };
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

  clear(): void {
    if (this.run) this.finish(this.run, 'none');
  }

  private draw(run: MooseRun, t: number): void {
    const p = mPose(t);
    this.apply(run, t);
    run.layer.dataset.beat = mBeatAt(t);
    // Hidden behind the berm: his antler tips (12 units down his box) are below the cut.
    run.layer.dataset.off = String(p.y >= 97);
    if (p.bub && !run.spoke) {
      run.spoke = true;
      run.bubble = this.speak(run);
    }
    if (!p.bub && run.bubble) {
      run.bubble.remove();
      run.bubble = null;
    }
    if (t >= M_END) this.finish(run, 'seen');
  }

  /** Reduced motion: he fades in staring over the berm, then fades out. */
  private still(run: MooseRun): void {
    run.layer.dataset.beat = 'still';
    run.layer.style.opacity = '0';
    run.layer.style.transition = 'opacity 0.35s';
    this.apply(run, T_STARE);
    void run.layer.offsetWidth;
    run.layer.style.opacity = '1';
    const later = (ms: number, f: () => void) => window.setTimeout(() => this.run === run && f(), ms);
    later(500, () => (run.bubble = this.speak(run)));
    later(2200, () => (run.layer.style.opacity = '0'));
    later(2600, () => this.finish(run, 'seen'));
  }

  /** His groan: a bubble at his mouth, its tail on his muzzle, on the side with more room (it follows him as he ducks). */
  private speak(run: MooseRun): HTMLElement {
    const muzzle = run.svg.querySelector('.muzzle')!;
    const r = muzzle.getBoundingClientRect();
    const screenW = this.host.screen.getBoundingClientRect().width;
    const sides: BubbleSide[] = r.left + r.width / 2 < screenW / 2 ? ['right', 'left'] : ['left', 'right'];
    const bubble = this.host.say(muzzle, MOOSE_LINE, [...sides, 'below']);
    bubble.dataset.moose = 'true';
    return bubble;
  }

  private apply(run: MooseRun, t: number): void {
    const p = mPose(t);
    const f = mooseFrame(p);
    const q = (s: string) => run.svg.querySelector<SVGElement>(s)!;
    q('.root').setAttribute('transform', f.root);
    q('.jaw').setAttribute('transform', f.jaw);
    q('.muzzle').setAttribute('transform', f.muzzle);
    q('.lip').setAttribute('d', f.lip);
    q('.lip').setAttribute('fill', f.lipFill);
    q('.lidL').setAttribute('d', f.lidL);
    q('.lidR').setAttribute('d', f.lidR);
    q('.earL').setAttribute('transform', f.earL);
    // Snow off an antler, dropping behind the berm.
    const { x, y, w } = run.spot;
    const chunks = p.puff < 0 ? null : snowChunks(p.puff);
    run.puffs.forEach((d, i) => {
      if (!chunks) return void (d.style.opacity = '0');
      const size = Math.max(4, w * 0.06);
      Object.assign(d.style, { width: `${size}px`, height: `${size}px`, left: `${x + chunks[i].x * w}px`, top: `${y + chunks[i].y * w}px`, opacity: String(chunks[i].opacity) });
    });
  }

  private finish(run: MooseRun, result: EggResult): void {
    cancelAnimationFrame(run.frame);
    run.bubble?.remove();
    run.layer.remove();
    if (this.run === run) this.run = null;
    run.done(result);
  }
}

/** Where the worker's clearing is on this screen (scenery keeps trees out of it), or null if he has no room. */
export const workerClearing = (screenW: number, strip: { top: number; bottom: number }) => workerSpot(screenW, strip)?.clearing ?? null;
/** Columns across the top berm. */
export const TOP_COLUMNS = SIZE;
