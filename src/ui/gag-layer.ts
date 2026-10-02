// Runs the oilfield gags on the board: the magpie and the sleepy spotter when nobody's touched
// anything for a while, the biffy when its truck backs up toward it, block heater cords ripping out
// (Duvernay), and the landowner when the mud gets rutted (Montney). Nothing here takes touches
// (pointer-events: none), and everything sits outside the 6x6 grid or on a truck roof.
// Reduced motion: still frames only.
import { sound } from '../audio/engine.ts';
import { SIZE, type GameState, type Level, type Side } from '../engine/index.ts';
import { BIFFY, DROPPING, LANDOWNER, MAGPIE, PLUG_POST, SPOTTER_SIT, SPOTTER_WALK, WORKER_BENT } from './cast.ts';
import {
  biffySpot,
  cordFor,
  dueGag,
  freshIdle,
  magpieTarget,
  reverseDirection,
  touched,
  type BiffySpot,
  type Cord,
  type IdleState,
} from './gags.ts';
import { LANDOWNER_LINE, MAGPIE_LINE, type BumpHit } from './lines.ts';
import { WEAR_CAP } from './tracks.ts';

const NS = 'http://www.w3.org/2000/svg';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(signal.reason)), { once: true });
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

type SpotterState = 'walking' | 'asleep' | 'waking';

export class GagLayer {
  private host: GagHost;
  private opts: GagOptions;
  private level: Level | null = null;
  private idle: IdleState = freshIdle();
  private lastActivity = performance.now();
  private timer = 0;
  private stopped = false;
  private bands: Bands = { above: 60, below: 60 };
  /** The magpie (or the spotter walking on) right now; a touch cancels it. */
  private idleGag: AbortController | null = null;
  private spotter: { el: HTMLElement; state: SpotterState; x: number; y: number; w: number; h: number } | null = null;
  private biffy: { el: HTMLElement; spot: BiffySpot; done: boolean } | null = null;
  private cords = new Map<string, { cord: Cord; post: HTMLElement; line: SVGPathElement | null }>();
  private cordLayer: SVGSVGElement | null = null;
  private landownerDone = false;

  constructor(host: GagHost, opts: GagOptions) {
    this.host = host;
    this.opts = opts;
  }

  /** New level (or restart): plug the trucks in, put the biffy out, restart the idle clock. */
  setLevel(level: Level): void {
    this.level = level;
    this.clearIdleGags();
    this.idle = freshIdle();
    this.landownerDone = false;
    this.lastActivity = performance.now();
    this.stopped = false;
    this.host.el.querySelectorAll('.gag').forEach((n) => n.remove());
    this.cordLayer?.remove();
    this.cords.clear();
    const spot = biffySpot(level);
    this.biffy = spot ? { el: this.figure('gag biffy', BIFFY), spot, done: false } : null;
    if (this.opts.cords) this.plugIn(level);
    this.layout(this.bands);
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  /** Board resized: put the static pieces back in place. */
  layout(bands: Bands): void {
    this.bands = bands;
    if (this.biffy) this.placeBiffy(this.biffy.el, this.biffy.spot);
    for (const { cord, post, line } of this.cords.values()) {
      this.placePost(post, cord);
      if (line) line.setAttribute('d', this.cordPath(cord));
    }
  }

  /**
   * Any touch restarts the idle clock and cancels the magpie, or the spotter while he's still
   * walking on. A sleeping spotter instead jolts awake, falls off his pail and scrambles off.
   */
  touch(): void {
    this.lastActivity = performance.now();
    this.idle = touched(this.idle);
    this.idleGag?.abort();
    this.idleGag = null;
    if (this.spotter?.state === 'walking') this.removeSpotter();
    else if (this.spotter?.state === 'asleep') void this.wakeSpotter();
  }

  /** A truck moved: rip its cord out on its first move; reversing toward the biffy sets it off. */
  moved(truckId: string, delta: number): void {
    this.touch();
    const c = this.cords.get(truckId);
    if (c) this.rip(truckId, c);
    if (this.biffyTruckReversing(truckId, Math.sign(delta))) void this.biffyGag();
  }

  /** A bump: the biffy's truck backing into the fence sets it off. */
  bumped(truckId: string, direction: 1 | -1, hit: BumpHit): void {
    if (hit === 'wall' && this.biffyTruckReversing(truckId, direction)) void this.biffyGag();
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
    this.clearIdleGags();
  }

  // ---------- Idle gags ----------

  private tick(): void {
    if (!this.host.el.isConnected) return this.stop();
    if (this.stopped || this.idleGag || this.spotter || document.hidden) return;
    const due = dueGag((performance.now() - this.lastActivity) / this.opts.idleScale, this.idle);
    if (due === 'magpie') {
      this.idle = { ...this.idle, magpieThisIdle: true };
      this.runIdleGag((s) => this.magpie(s));
    } else if (due === 'spotter') {
      this.idle = { ...this.idle, spotterThisIdle: true };
      this.runIdleGag((s) => this.spotterWalksOn(s));
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

  /** New level or win: the magpie and spotter leave at once, whatever they were doing. */
  private clearIdleGags(): void {
    this.idleGag?.abort();
    this.idleGag = null;
    this.removeSpotter();
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
    const at = (p: { x: number; y: number }) => `translate(${p.x}px, ${p.y}px)`;

    if (reducedMotion()) {
      bird.classList.remove('flying');
      bird.style.transform = at(land);
      sound.squawk();
      await sleep(500, signal);
      this.droppings(truckEl, s);
      sound.grunt();
      this.host.say(truckEl.querySelector('.cab') ?? truckEl, MAGPIE_LINE);
      await sleep(1600, signal);
      bird.remove();
      return;
    }
    await this.animate(bird, [{ transform: at(from) }, { transform: at(land) }], 1100, 'cubic-bezier(0.3, 0.6, 0.4, 1)', signal);
    bird.classList.remove('flying');
    sound.squawk();
    for (let i = 0; i < 2; i++) {
      const hop = { x: land.x + s * 0.12, y: land.y - s * 0.3 };
      const next = { x: land.x + s * 0.2, y: land.y };
      await this.animate(bird, [{ transform: at(land) }, { transform: at(hop) }, { transform: at(next) }], 280, 'ease-out', signal);
      land.x = next.x;
    }
    await sleep(350, signal);
    this.droppings(truckEl, s);
    await sleep(380, signal);
    sound.grunt();
    this.host.say(truckEl.querySelector('.cab') ?? truckEl, MAGPIE_LINE);
    await sleep(500, signal);
    bird.classList.add('flying');
    await this.animate(bird, [{ transform: at(land) }, { transform: at(away) }], 900, 'cubic-bezier(0.5, 0, 0.8, 0.6)', signal);
    bird.remove();
  }

  /** Two or three small droppings clustered round the middle of the roof, every one fully on the truck. */
  private droppings(truckEl: HTMLElement, s: number): void {
    this.idle = { ...this.idle, magpieDone: true };
    const body = truckEl.querySelector('.body');
    const tw = truckEl.offsetWidth;
    const th = truckEl.offsetHeight;
    const count = 2 + Math.round(Math.random());
    const spread = Math.min(tw, th) * 0.18;
    const offsets = [
      [-0.6, -0.4],
      [0.7, 0.1],
      [-0.1, 0.8],
    ];
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'dropping';
      d.innerHTML = DROPPING;
      const w = Math.min(s * (0.2 + Math.random() * 0.05), Math.min(tw, th) * 0.32);
      const h = w * 1.2;
      // Centre of the roof, nudged into a little cluster, then clamped inside the truck.
      const m = Math.max(3, w * 0.2); // room for the slight rotation
      const x = Math.max(m, Math.min(tw - w - m, tw / 2 + offsets[i][0] * spread - w / 2));
      const y = Math.max(m, Math.min(th - h - m, th / 2 + offsets[i][1] * spread - h / 2));
      Object.assign(d.style, {
        width: `${w}px`,
        height: `${h}px`,
        left: `${x}px`,
        top: `${y}px`,
        transform: `rotate(${Math.round(Math.random() * 30 - 15)}deg)`,
      });
      body?.append(d);
      sound.plop(i * 0.11);
    }
  }

  // ---------- Spotter: walks on below the fence, sits on his pail, dozes off ----------

  /** Top of a figure `h` px tall, centred in the band below the board. */
  private belowBand(h: number): number {
    const { cellPx: cell, fencePx: fence } = this.host;
    return cell * SIZE + fence * 2 + Math.max(2, (this.bands.below - h) / 2);
  }

  private async spotterWalksOn(signal: AbortSignal): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const h = Math.max(cell * 0.9, Math.min(cell * 1.35, this.bands.below - 6));
    const w = h * 0.78;
    const y = this.belowBand(h);
    const x = size * 0.36 - w / 2;
    const el = this.figure(
      'gag spotter walking',
      `<div class="pose walk">${SPOTTER_WALK}</div><div class="pose sit">${SPOTTER_SIT}</div>` +
        '<div class="zzz" aria-hidden="true"><span>Z</span><span>z</span><span>z</span></div>',
      w,
      h,
    );
    this.spotter = { el, state: 'walking', x, y, w, h };
    const at = (px: number) => `translate(${px}px, ${y}px)`;
    el.style.transform = at(-w * 1.5);
    if (!reducedMotion()) await this.animate(el, [{ transform: at(-w * 1.5) }, { transform: at(x) }], 1800, 'linear', signal);
    // He sits down on the pail and nods off. From here a touch wakes him instead of cancelling him.
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transform = at(x);
    el.classList.replace('walking', 'asleep');
    if (this.spotter?.el === el) {
      this.spotter.state = 'asleep';
      sound.snore(true);
    }
  }

  /** Touched while asleep: jolts awake, falls off the pail, scrambles off. */
  private async wakeSpotter(): Promise<void> {
    const sp = this.spotter!;
    sp.state = 'waking';
    sound.snore(false);
    const at = (px: number, py = sp.y) => `translate(${px}px, ${py}px)`;
    sp.el.classList.replace('asleep', 'startled');
    try {
      if (reducedMotion()) {
        await sleep(900);
      } else {
        // Jolt: a jump straight up off the pail...
        await this.animate(sp.el, [{ transform: at(sp.x) }, { transform: at(sp.x, sp.y - sp.h * 0.22) }, { transform: at(sp.x) }], 260, 'ease-out');
        // ...he topples off it onto the ground (the pail stays put)...
        sp.el.classList.replace('startled', 'fallen');
        sound.clatter();
        await sleep(650);
        // ...and scrambles off.
        sp.el.classList.replace('fallen', 'running');
        const size = this.host.cellPx * SIZE + this.host.fencePx * 2;
        await this.animate(sp.el, [{ transform: at(sp.x) }, { transform: at(size + sp.w * 1.5) }], 900, 'cubic-bezier(0.4, 0, 1, 1)');
      }
    } catch {
      // New level or win cleared the stage.
    } finally {
      sp.el.remove();
      if (this.spotter === sp) this.spotter = null;
    }
  }

  private removeSpotter(): void {
    sound.snore(false);
    this.spotter?.el.remove();
    this.spotter = null;
  }

  // ---------- Biffy: just outside the fence behind one truck's tailgate ----------

  private biffyTruckReversing(truckId: string, direction: number): boolean {
    const b = this.biffy;
    if (!b || b.done || b.spot.truckId !== truckId || !this.level || this.stopped) return false;
    const t = this.level.trucks.find((x) => x.id === truckId)!;
    return direction === reverseDirection(this.level, t);
  }

  private placeBiffy(el: HTMLElement, spot: BiffySpot): void {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const room = spot.side === 'bottom' ? this.bands.below : spot.side === 'top' ? this.bands.above : cell;
    let h = Math.min(cell * 1.15, Math.max(cell * 0.75, room - 4));
    let w = h * 0.63;
    if (spot.side === 'left' || spot.side === 'right') {
      // The side margins are narrow on a phone: fit in the outer half of the fence plus the margin.
      const board = this.host.el.getBoundingClientRect();
      const margin = spot.side === 'right' ? document.documentElement.clientWidth - board.right : board.left;
      w = Math.min(w, fence * 0.55 + margin - 3);
      h = w / 0.63;
    }
    const along = fence + (spot.index + 0.5) * cell;
    const pos: Record<Side, { left: number; top: number }> = {
      bottom: { left: along - w / 2, top: size - fence * 0.35 },
      top: { left: along - w / 2, top: fence * 0.35 - h },
      left: { left: fence * 0.55 - w, top: along - h / 2 },
      right: { left: size - fence * 0.55, top: along - h / 2 },
    };
    const p = pos[spot.side];
    Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${p.left}px`, top: `${p.top}px` });
    el.dataset.side = spot.side;
    el.dataset.truck = spot.truckId;
  }

  /** The door bangs open; a worker shuffles out bent over, hauling his coveralls up, and off screen. Once per level. */
  private async biffyGag(): Promise<void> {
    const b = this.biffy!;
    b.done = true;
    const { el } = b;
    el.classList.add('open');
    sound.doorBang();
    const r = { left: parseFloat(el.style.left), top: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height) };
    const ww = r.h;
    const wh = r.h * 0.88;
    const guy = this.figure('gag worker-bent', WORKER_BENT, ww, wh);
    const start = { x: r.left + r.w / 2 - ww / 2, y: r.top + r.h - wh };
    // He shuffles off whichever screen edge is nearer.
    const board = this.host.el.getBoundingClientRect();
    const toRight = r.left + r.w / 2 > board.width / 2;
    const offX = toRight ? window.innerWidth - board.left + ww : -board.left - ww * 1.2;
    guy.classList.toggle('facing-left', !toRight);
    const at = (x: number, y: number) => `translate(${x}px, ${y}px)`;
    const outY = start.y + r.h * 0.18;
    try {
      if (reducedMotion()) {
        guy.style.transform = at(start.x + (toRight ? r.w : -r.w), outY);
        sound.feet(true);
        await sleep(2200);
      } else {
        await this.animate(guy, [{ transform: at(start.x, start.y), opacity: 0 }, { transform: at(start.x, outY), opacity: 1 }], 280, 'ease-out');
        guy.classList.add('shuffling');
        sound.feet(true);
        await this.animate(guy, [{ transform: at(start.x, outY) }, { transform: at(offX, outY) }], 3000, 'linear');
      }
    } catch {
      // Stage cleared.
    } finally {
      sound.feet(false);
      guy.remove();
      el.classList.remove('open');
    }
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
    sound.cordSnap();
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
      const len = 1 - k;
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

  // ---------- Landowner: rides along below the board ----------

  private async landowner(): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const h = Math.max(cell * 0.9, Math.min(cell * 1.3, this.bands.below - 6));
    const w = h * 1.04;
    const y = this.belowBand(h);
    const quad = this.figure('gag landowner', LANDOWNER, w, h);
    const at = (x: number) => `translate(${x}px, ${y}px)`;
    const stopAt = size - w - cell * 0.4;
    try {
      sound.quad('start');
      if (reducedMotion()) {
        quad.style.transform = at(stopAt);
        sound.quad('idle');
        this.host.say(quad, LANDOWNER_LINE);
        await sleep(2600);
        return;
      }
      await this.animate(quad, [{ transform: at(size + w) }, { transform: at(stopAt) }], 1300, 'cubic-bezier(0.2, 0.7, 0.3, 1)');
      quad.classList.add('shaking');
      sound.quad('idle');
      this.host.say(quad, LANDOWNER_LINE);
      await sleep(2200);
      quad.classList.remove('shaking');
      sound.quad('rev');
      await this.animate(quad, [{ transform: at(stopAt) }, { transform: at(size + w * 1.5) }], 1100, 'cubic-bezier(0.5, 0, 0.8, 0.5)');
    } catch {
      // Interrupted by a new level.
    } finally {
      sound.quad('stop');
      quad.remove();
    }
  }

  // ---------- helpers ----------

  /** A character element on the board. */
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
