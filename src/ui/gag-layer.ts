// Runs the oilfield gags on the board: the magpie and spotter when nobody's touched anything for a
// while, the biffy when a bump lands next to it, block heater cords ripping out (Duvernay), and the
// landowner when the mud gets rutted (Montney). Nothing here takes touches (pointer-events: none),
// and everything sits outside the 6x6 grid or on a truck roof. Reduced motion: still frames only.
import { SIZE, truckCells, type GameState, type Level } from '../engine/index.ts';
import { BIFFY, LANDOWNER, MAGPIE, PLUG_POST, SPLAT, SPOTTER, WORKER } from './cast.ts';
import {
  biffyColumn,
  cordFor,
  dueGag,
  freshIdle,
  magpieTarget,
  nearBiffy,
  touched,
  type Cord,
  type IdleState,
} from './gags.ts';
import { LANDOWNER_LINE, MAGPIE_LINE } from './lines.ts';
import { WEAR_CAP } from './tracks.ts';

const NS = 'http://www.w3.org/2000/svg';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

/** What the gags need from the board. */
export interface GagHost {
  /** The board element (fence + pad); gags are positioned in its coordinates. */
  el: HTMLElement;
  cellPx: number;
  fencePx: number;
  truckElement(id: string): HTMLElement | undefined;
  say(anchor: Element, text: string): HTMLElement;
  addGround(el: Element): void;
  state(): GameState;
}

export interface GagOptions {
  /** Duvernay: every truck starts plugged into a block heater post. */
  cords: boolean;
  /** Montney: the landowner shows up once a lane wears to the deepest rut. */
  landowner: boolean;
  /** Multiplies the idle times (tests and previews use ?idle=0.1). */
  idleScale: number;
}

/** Free space above and below the board, in px, for characters outside the fence. */
export interface Bands {
  above: number;
  below: number;
}

export class GagLayer {
  private host: GagHost;
  private opts: GagOptions;
  private idle: IdleState = freshIdle();
  private lastActivity = performance.now();
  private timer = 0;
  private stopped = false;
  private bands: Bands = { above: 60, below: 60 };
  /** The magpie or spotter on stage right now (any touch cancels it). */
  private idleGag: AbortController | null = null;
  private biffyEl: HTMLElement | null = null;
  private biffyCol = 5;
  private biffyBusy = false;
  private cords = new Map<string, { cord: Cord; post: HTMLElement; line: SVGPathElement | null }>();
  private cordLayer: SVGSVGElement | null = null;
  private landownerDone = false;

  constructor(host: GagHost, opts: GagOptions) {
    this.host = host;
    this.opts = opts;
  }

  /** New level (or restart): plug the trucks in, put the biffy out, restart the idle clock. */
  setLevel(level: Level): void {
    this.cancelIdleGag();
    this.idle = freshIdle();
    this.landownerDone = false;
    this.lastActivity = performance.now();
    this.stopped = false;
    this.host.el.querySelectorAll('.gag').forEach((n) => n.remove());
    this.cordLayer?.remove();
    this.cords.clear();
    this.biffyCol = biffyColumn(level);
    this.biffyEl = this.figure('gag biffy', BIFFY);
    this.biffyEl.insertAdjacentHTML('beforeend', `<div class="gag-worker">${WORKER}</div>`);
    if (this.opts.cords) this.plugIn(level);
    this.layout(this.bands);
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  /** Board resized: put the static pieces back in place. */
  layout(bands: Bands): void {
    this.bands = bands;
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    if (this.biffyEl) {
      const h = Math.min(cell * 1.15, Math.max(cell * 0.7, bands.below - 4));
      Object.assign(this.biffyEl.style, {
        width: `${h * 0.63}px`,
        height: `${h}px`,
        left: `${fence + (this.biffyCol + 0.5) * cell - h * 0.315}px`,
        top: `${size - fence * 0.35}px`,
      });
    }
    for (const { cord, post, line } of this.cords.values()) {
      this.placePost(post, cord);
      if (line) line.setAttribute('d', this.cordPath(cord));
    }
  }

  /** Any touch on the screen: cancel the magpie or spotter, and start the idle clock again. */
  touch(): void {
    this.lastActivity = performance.now();
    this.idle = touched(this.idle);
    this.cancelIdleGag();
  }

  /** A truck moved: reset the idle clock, and rip its block heater cord out on its first move. */
  moved(truckId: string): void {
    this.touch();
    const c = this.cords.get(truckId);
    if (c) this.rip(truckId, c);
  }

  /** A bump: if it's next to the biffy, someone gets a fright. */
  bumped(truckId: string): void {
    const t = this.host.state().trucks.find((x) => x.id === truckId);
    if (t && this.biffyEl && !this.biffyBusy && nearBiffy(truckCells(t), this.biffyCol)) void this.biffy();
  }

  /** Lane wear: the landowner shows up the first time any lane wears to the deepest rut. */
  worn(level: number): void {
    if (this.opts.landowner && !this.landownerDone && level >= WEAR_CAP && !this.stopped) {
      this.landownerDone = true;
      void this.landowner();
    }
  }

  /** Level won (or screen left): everything clears off. */
  stop(): void {
    this.stopped = true;
    clearInterval(this.timer);
    this.cancelIdleGag();
  }

  // ---------- Idle gags ----------

  private tick(): void {
    if (!this.host.el.isConnected) return this.stop();
    if (this.stopped || this.idleGag || document.hidden) return;
    const idleMs = (performance.now() - this.lastActivity) / this.opts.idleScale;
    const due = dueGag(idleMs, this.idle);
    if (due === 'magpie') {
      this.idle = { ...this.idle, magpieThisIdle: true };
      this.runIdleGag((s) => this.magpie(s));
    } else if (due === 'spotter') {
      this.idle = { ...this.idle, spotterThisIdle: true };
      this.runIdleGag((s) => this.spotter(s));
    }
  }

  private runIdleGag(play: (signal: AbortSignal) => Promise<void>): void {
    const ctl = new AbortController();
    this.idleGag = ctl;
    play(ctl.signal)
      .catch(() => {})
      .finally(() => {
        if (this.idleGag === ctl) this.idleGag = null;
      });
  }

  private cancelIdleGag(): void {
    this.idleGag?.abort();
    this.idleGag = null;
  }

  private async magpie(signal: AbortSignal): Promise<void> {
    const target = magpieTarget(this.host.state().trucks);
    const truckEl = target && this.host.truckElement(target.id);
    if (!target || !truckEl) return;
    const { cellPx: cell } = this.host;
    const s = cell * 0.82;
    const bird = this.figure('gag magpie flying', MAGPIE, s, s * 0.69);
    signal.addEventListener('abort', () => bird.remove(), { once: true });
    const board = this.host.el.getBoundingClientRect();
    const roof = truckEl.getBoundingClientRect();
    const land = { x: roof.left + roof.width / 2 - board.left - s / 2, y: roof.top + roof.height / 2 - board.top - s * 0.62 };
    const from = { x: -s * 1.5, y: -cell * 1.6 };
    const away = { x: board.width + s, y: -cell * 2 };
    const at = (p: { x: number; y: number }, extra = '') => `translate(${p.x}px, ${p.y}px) ${extra}`;

    if (reducedMotion()) {
      bird.classList.remove('flying');
      bird.style.transform = at(land);
      await sleep(500, signal);
      this.splat(truckEl, land, board, s);
      this.idle = { ...this.idle, magpieDone: true };
      this.host.say(truckEl.querySelector('.cab') ?? truckEl, MAGPIE_LINE);
      await sleep(1600, signal);
      bird.remove();
      return;
    }
    await this.animate(bird, [{ transform: at(from) }, { transform: at(land) }], 1100, 'cubic-bezier(0.3, 0.6, 0.4, 1)', signal);
    bird.classList.remove('flying');
    for (let i = 0; i < 2; i++) {
      await this.animate(bird, [{ transform: at(land) }, { transform: at({ x: land.x + s * 0.12, y: land.y - s * 0.3 }) }, { transform: at({ x: land.x + s * 0.2, y: land.y }) }], 280, 'ease-out', signal);
      land.x += s * 0.2;
    }
    await sleep(350, signal);
    this.splat(truckEl, land, board, s);
    this.idle = { ...this.idle, magpieDone: true };
    this.host.say(truckEl.querySelector('.cab') ?? truckEl, MAGPIE_LINE);
    await sleep(500, signal);
    bird.classList.add('flying');
    await this.animate(bird, [{ transform: at(land) }, { transform: at(away) }], 900, 'cubic-bezier(0.5, 0, 0.8, 0.6)', signal);
    bird.remove();
  }

  /** The splat rides on the truck's roof until that truck leaves the pad. */
  private splat(truckEl: HTMLElement, land: { x: number; y: number }, board: DOMRect, s: number): void {
    const truck = truckEl.getBoundingClientRect();
    const sp = document.createElement('div');
    sp.className = 'roof-splat';
    sp.innerHTML = SPLAT;
    const w = s * 0.75;
    Object.assign(sp.style, {
      width: `${w}px`,
      height: `${w * 0.8}px`,
      left: `${land.x + board.left - truck.left + s * 0.15}px`,
      top: `${land.y + board.top - truck.top + s * 0.55}px`,
    });
    truckEl.querySelector('.body')?.append(sp);
  }

  private async spotter(signal: AbortSignal): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const useBelow = this.bands.below >= cell * 0.9 || this.bands.below >= this.bands.above;
    const band = useBelow ? this.bands.below : this.bands.above;
    const h = Math.max(cell * 0.9, Math.min(cell * 1.35, band - 6));
    const w = h * 0.78;
    const y = useBelow ? size + Math.max(2, (band - h) / 2) : -Math.max(h + 2, (band + h) / 2);
    const guy = this.figure('gag spotter jogging', SPOTTER, w, h);
    signal.addEventListener('abort', () => guy.remove(), { once: true });
    const at = (x: number) => `translate(${x}px, ${y}px)`;
    const mid = size / 2 - w / 2;
    if (reducedMotion()) {
      guy.classList.remove('jogging');
      guy.style.transform = at(mid);
      await sleep(2500, signal);
      guy.remove();
      return;
    }
    await this.animate(guy, [{ transform: at(-w * 1.5) }, { transform: at(mid) }], 1400, 'linear', signal);
    guy.classList.replace('jogging', 'dancing');
    await sleep(2600, signal);
    guy.classList.replace('dancing', 'jogging');
    await this.animate(guy, [{ transform: at(mid) }, { transform: at(size + w * 0.5) }], 1300, 'linear', signal);
    guy.remove();
  }

  // ---------- Biffy ----------

  private async biffy(): Promise<void> {
    const el = this.biffyEl!;
    this.biffyBusy = true;
    el.classList.add('open');
    await new Promise((r) => setTimeout(r, reducedMotion() ? 1800 : 1900));
    el.classList.remove('open');
    await new Promise((r) => setTimeout(r, 600));
    this.biffyBusy = false;
  }

  // ---------- Block heater cords ----------

  private plugIn(level: Level): void {
    this.cordLayer = document.createElementNS(NS, 'svg');
    this.cordLayer.setAttribute('class', 'cords');
    this.cordLayer.setAttribute('viewBox', `0 0 ${SIZE * 100} ${SIZE * 100}`);
    this.cordLayer.setAttribute('preserveAspectRatio', 'none');
    this.host.addGround(this.cordLayer);
    for (const t of level.trucks) {
      const cord = cordFor(level, t);
      const post = this.figure('gag plug-post', PLUG_POST);
      let line: SVGPathElement | null = null;
      if (Math.hypot(cord.to.x - cord.from.x, cord.to.y - cord.from.y) > 0.01) {
        line = document.createElementNS(NS, 'path');
        line.setAttribute('class', 'cord');
        this.cordLayer.append(line);
      }
      this.cords.set(t.id, { cord, post, line });
    }
  }

  private placePost(post: HTMLElement, cord: Cord): void {
    const { cellPx: cell, fencePx: fence } = this.host;
    // Sized to sit inside the fence band with a little room either side.
    const h = fence * 0.78;
    const w = h * 0.67;
    const along = fence + (cord.index + 0.5) * cell;
    const across = cord.side === 'left' || cord.side === 'top' ? fence * 0.5 : fence * 1.5 + cell * SIZE;
    const vertical = cord.side === 'left' || cord.side === 'right';
    Object.assign(post.style, {
      width: `${w}px`,
      height: `${h}px`,
      // Beside the lane, so it never covers a gate in the same spot.
      left: `${(vertical ? across : along + cell * 0.32) - w / 2}px`,
      top: `${(vertical ? along - cell * 0.32 : across) - h / 2}px`,
    });
  }

  /** A slightly sagging cord from the pad edge to the truck's rear (pad units: 100 per cell). */
  private cordPath(c: Cord): string {
    const [x1, y1, x2, y2] = [c.from.x * 100, c.from.y * 100, c.to.x * 100, c.to.y * 100];
    const sag = 9;
    const horizontal = Math.abs(y2 - y1) < 1;
    const mx = (x1 + x2) / 2 + (horizontal ? 0 : sag);
    const my = (y1 + y2) / 2 + (horizontal ? sag : 0);
    return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
  }

  private rip(id: string, c: { cord: Cord; post: HTMLElement; line: SVGPathElement | null }): void {
    this.cords.delete(id);
    c.post.classList.add('ripped');
    this.sparks(c.cord);
    const line = c.line;
    if (!line) return;
    if (reducedMotion()) return line.remove();
    // Whip: the loose end snaps back toward the post in a decaying wave, then the cord is gone.
    const { from, to } = c.cord;
    const start = performance.now();
    const dur = 450;
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / dur);
      const len = 1 - k; // fraction of the cord still reaching out
      const ex = from.x + (to.x - from.x) * len;
      const ey = from.y + (to.y - from.y) * len;
      const amp = 40 * (1 - k) * Math.sin(k * Math.PI * 5);
      const horizontal = Math.abs(to.y - from.y) < 0.01;
      const mx = ((from.x + ex) / 2) * 100 + (horizontal ? 0 : amp);
      const my = ((from.y + ey) / 2) * 100 + (horizontal ? amp : 0);
      line.setAttribute('d', `M${from.x * 100} ${from.y * 100} Q${mx} ${my} ${ex * 100} ${ey * 100}`);
      if (k < 1) requestAnimationFrame(step);
      else line.remove();
    };
    requestAnimationFrame(step);
  }

  /** Sparks where the plug tore out of the truck. */
  private sparks(c: Cord): void {
    const { cellPx: cell, fencePx: fence } = this.host;
    const x = fence + c.to.x * cell;
    const y = fence + c.to.y * cell;
    const n = reducedMotion() ? 1 : 7;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'gag spark';
      const size = cell * 0.16;
      Object.assign(s.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` });
      this.host.el.append(s);
      if (reducedMotion()) {
        setTimeout(() => s.remove(), 600);
        continue;
      }
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const r = cell * (0.25 + Math.random() * 0.3);
      s.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(0.3)`, opacity: 0 },
        ],
        { duration: 380 + Math.random() * 200, easing: 'ease-out' },
      ).onfinish = () => s.remove();
    }
  }

  // ---------- Landowner ----------

  private async landowner(): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const useAbove = this.bands.above >= cell * 0.9 || this.bands.above >= this.bands.below;
    const band = useAbove ? this.bands.above : this.bands.below;
    const h = Math.max(cell * 0.9, Math.min(cell * 1.3, band - 6));
    const w = h * 1.04;
    const y = useAbove ? -Math.max(h + 2, (band + h) / 2) : size + Math.max(2, (band - h) / 2);
    const quad = this.figure('gag landowner', LANDOWNER, w, h);
    const at = (x: number) => `translate(${x}px, ${y}px)`;
    const stopAt = size - w - cell * 0.4;
    try {
      if (reducedMotion()) {
        quad.style.transform = at(stopAt);
        this.host.say(quad, LANDOWNER_LINE);
        await new Promise((r) => setTimeout(r, 2600));
        return;
      }
      await this.animate(quad, [{ transform: at(size + w) }, { transform: at(stopAt) }], 1300, 'cubic-bezier(0.2, 0.7, 0.3, 1)');
      quad.classList.add('shaking');
      this.host.say(quad, LANDOWNER_LINE);
      await new Promise((r) => setTimeout(r, 2200));
      quad.classList.remove('shaking');
      await this.animate(quad, [{ transform: at(stopAt) }, { transform: at(size + w * 1.5) }], 1100, 'cubic-bezier(0.5, 0, 0.8, 0.5)');
    } catch {
      // Interrupted by a new level: nothing to clean up beyond the element.
    } finally {
      quad.remove();
    }
  }

  // ---------- helpers ----------

  /** A character element on the board (positioned by transform unless sized/placed here). */
  private figure(className: string, svg: string, w?: number, h?: number): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.innerHTML = svg;
    if (w !== undefined) Object.assign(el.style, { width: `${w}px`, height: `${h}px` });
    this.host.el.append(el);
    return el;
  }

  private animate(el: HTMLElement, frames: Keyframe[], duration: number, easing: string, signal?: AbortSignal): Promise<void> {
    const anim = el.animate(frames, { duration, easing, fill: 'forwards' });
    return new Promise((resolve, reject) => {
      anim.onfinish = () => resolve();
      anim.oncancel = () => reject(new Error('cancelled'));
      signal?.addEventListener('abort', () => anim.cancel(), { once: true });
      if (!el.isConnected) anim.cancel();
    });
  }
}

