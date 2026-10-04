// Runs the oilfield gags on the board: the magpie and the sleepy spotter when nobody's touched
// anything for a while, the biffy when its truck backs up toward it, block heater cords ripping out
// (Duvernay), and the landowner when the mud gets rutted (Montney). Nothing here takes touches
// (pointer-events: none), and everything sits outside the 6x6 grid or on a truck roof.
// Reduced motion: still frames only.
import { sound } from '../audio/engine.ts';
import { SIZE, type GameState, type Level, type Side } from '../engine/index.ts';
import { gsap } from 'gsap';
import { BIFFY, DROPPING, HOTSHOT, LANDOWNER, MAGPIE, PLUG_POST, SPOTTER_SIT, SPOTTER_WALK } from './cast.ts';
import { Rig } from './rig.ts';
import { Sprite } from './anim.ts';
import { WORKER_RIG } from './rigs.ts';
import { bearLayout, playBear, type BearLayout } from './bear-scene.ts';
import { MOOSE_H, playMoose } from './moose-scene.ts';
import { playGeese, playGopher, playPumper, type Strip } from './visitor-scenes.ts';
import {
  biffySpot,
  cordFor,
  dueGag,
  isGreatMove,
  isStuck,
  nextPerimeter,
  perimeterDone,
  planWildlife,
  freshIdle,
  magpieTarget,
  reverseDirection,
  touched,
  DEMO_EVERY_MS,
  DEMO_FIRST_MS,
  bearComes,
  bearEligible,
  demoNext,
  demoPool,
  wildPool,
  type BiffySpot,
  type DemoGag,
  type Reaction,
  type WildGag,
  type Cord,
  type IdleState,
  type WildState,
} from './gags.ts';
import { LANDOWNER_LINE, MAGPIE_LINE, type BumpHit } from './lines.ts';
import { WEAR_CAP } from './tracks.ts';
import type { Sighting } from './wildlife-log.ts';

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
  /** A truck is being dragged, or is still snapping into place or driving out. */
  moving(): boolean;
}

export interface GagOptions {
  /** Duvernay: every truck starts plugged into a block heater post. */
  cords: boolean;
  /** Montney: the landowner shows up once a lane wears to the deepest rut. */
  landowner: boolean;
  /** Region and level: decides which wildlife lives here, and whether the bear might come. */
  regionId: string;
  levelIndex: number;
  /** Demo mode: gags come fast, unfound first, and the bear may appear anywhere. */
  demo: boolean;
  /** Wildlife Log entries found so far (unfound ones are picked more often). */
  found: () => ReadonlySet<string>;
  /** What the hot shot kicks up: dust, mud or snow. */
  ground: 'gravel' | 'mud' | 'snow';
  /** Multiplies the idle times (tests and previews use ?idle=0.1). */
  idleScale: number;
  /** Bear, moose and hot shot on (tests of the other gags turn them off with ?wild=0). */
  wildlife: boolean;
  /** ?gag=bear|biffy|moose: play that scene straight away, again and again, and nothing else. */
  force?: ForcedGag | null;
}

export type ForcedGag = 'bear' | 'biffy' | 'moose' | 'gopher' | 'geese' | 'pumper' | 'hotshot';

/** Free space above and below the board, in px, for characters outside the fence. */
export interface Bands {
  above: number;
  below: number;
  /** From the board's bottom edge down to the buttons (the hint line in between fades for wildlife). */
  ground: number;
}

/** How far beside its lane's centre line a block heater post stands, in cells. */
const POST_ASIDE = 0.32;
const PUFF: Record<GagOptions['ground'], string> = { gravel: '#dcc9a0', mud: '#7a5532', snow: '#ffffff' };

type SpotterState = 'walking' | 'asleep' | 'waking';
/** The animated spotter riding in each spotter figure (destroyed with it). */
const spotterSprites = new WeakMap<HTMLElement, Sprite>();

export class GagLayer {
  private host: GagHost;
  private opts: GagOptions;
  private level: Level | null = null;
  private idle: IdleState = freshIdle();
  private lastActivity = performance.now();
  private timer = 0;
  private stopped = false;
  private bands: Bands = { above: 60, below: 60, ground: 100 };
  private wild: WildState = { bag: [], nextAt: Infinity, last: null };
  /** The bear's roll for this visit (once, however often the level restarts), and whether he's been.
   */
  private bearVisit: boolean;
  private bearDone = false;
  /** Demo mode: when the next gag may start, what's been tried this visit, when the spotter dozed off. */
  private demoAt = 0;
  private demoTried: DemoGag[] = [];
  private asleepAt = 0;
  private levelStart = performance.now();
  /** The bear, moose or hot shot playing right now. Touches never cancel it; a new level does. */
  private wildGag: AbortController | null = null;
  private landownerPlaying = false;
  private biffyPlaying = false;
  /** Waiting for the wildlife to finish before they go. */
  /** Gags set off by the player (or a reaction) that are waiting for the stage to be free. */
  private pending: ('landowner' | 'biffy' | Reaction)[] = [];
  private reactionPlaying = false;
  private lastMoveAt = performance.now();
  private lastExitAt: number | null = null;
  private stuckFired = false;
  /** The spotter has had his turn: he doesn't come back until a perimeter gag has played since. */
  private spotterTurnTaken = false;
  /**
   * In-lease reaction slots, reserved for upcoming art: "great-move" (two trucks exit back to back)
   * and "stuck" (no move for 20 seconds). Empty for now: when one comes due it's only noted on the
   * board (`data-reaction`). Register a player here to make it show.
   */
  reactions: Partial<Record<Reaction, (signal: AbortSignal) => Promise<void>>> = {};
  /** The magpie (or the spotter walking on) right now; a touch cancels it. */
  private idleGag: AbortController | null = null;
  private spotter: { el: HTMLElement; state: SpotterState; x: number; y: number; w: number; h: number } | null = null;
  private biffy: { el: HTMLElement; spot: BiffySpot; done: boolean } | null = null;
  private biffySprite: Sprite | null = null;
  private cords = new Map<string, { cord: Cord; post: HTMLElement; line: SVGGElement | null }>();
  private cordLayer: SVGSVGElement | null = null;
  private landownerDone = false;
  /** The bush the bear would squat beside stands there from the start of the level. */
  private bush: HTMLElement | null = null;
  private bearPlan: BearLayout | null = null;
  /** ?gag=: when the forced scene may play next. */
  private forceAt = 0;
  /** A gag just played all the way through (the Wildlife Log collects it). */
  onSeen: (id: Sighting) => void = () => {};

  constructor(host: GagHost, opts: GagOptions) {
    this.host = host;
    this.opts = opts;
    this.bearVisit = bearComes(opts);
  }

  /** New level (or restart): plug the trucks in, put the biffy out, restart the idle clock. */
  setLevel(level: Level): void {
    this.level = level;
    this.clearIdleGags();
    this.idle = freshIdle();
    this.landownerDone = false;
    this.wildGag?.abort();
    this.wildGag = null;
    this.wild = planWildlife(this.perimeterPool(), this.opts.found());
    this.demoAt = performance.now() + DEMO_FIRST_MS * this.opts.idleScale;
    this.demoTried = [];
    this.levelStart = performance.now();
    this.pending = [];
    this.lastMoveAt = performance.now();
    this.lastExitAt = null;
    this.stuckFired = false;
    this.spotterTurnTaken = false;
    delete this.host.el.dataset.reaction;
    this.lastActivity = performance.now();
    this.stopped = false;
    this.host.el.querySelectorAll('.gag').forEach((n) => n.remove());
    this.cordLayer?.remove();
    this.cords.clear();
    const spot = biffySpot(level);
    this.biffy = spot ? { el: this.figure('gag biffy', BIFFY), spot, done: false } : null;
    // A bush stands waiting wherever the bear might come (so it never gives away whether he will).
    this.bush = bearEligible(this.opts) || this.opts.force === 'bear' ? this.figure('gag bush', '<img alt="" draggable="false" src="./sprites/world/bush_willow.webp" srcset="./sprites/world/bush_willow.webp 1x, ./sprites/world/bush_willow@2x.webp 2x" />') : null;
    this.forceAt = performance.now() + 600;
    if (this.opts.cords) this.plugIn(level);
    this.layout(this.bands);
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  /** Board resized: put the static pieces back in place. */
  layout(bands: Bands): void {
    this.bands = bands;
    if (this.biffy) this.placeBiffy(this.biffy.el, this.biffy.spot);
    if (this.bush) this.placeBush(this.bush);
    for (const { cord, post, line } of this.cords.values()) {
      this.placePost(post, cord);
      if (line) this.drawCord(line, this.cordPath(cord), cord.to);
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
    if (this.biffyTruckReversing(truckId, Math.sign(delta))) this.queueBiffy();
    this.lastMoveAt = performance.now();
    this.stuckFired = false;
    // Whatever this move set off starts as soon as the truck has settled.
    setTimeout(() => this.tick(), 300);
  }

  /** A truck drove out. Two exits back to back are a "great move" (reaction slot). */
  exited(): void {
    const now = performance.now();
    if (isGreatMove(this.lastExitAt, now)) this.pending.push('great-move');
    this.lastExitAt = now;
  }

  /** A bump: the biffy's truck backing into the fence sets it off. */
  bumped(truckId: string, direction: 1 | -1, hit: BumpHit): void {
    if (hit === 'wall' && this.biffyTruckReversing(truckId, direction)) this.queueBiffy();
  }

  /** Lane wear: the landowner shows up the first time any lane wears to the deepest rut. */
  worn(level: number): void {
    if (this.opts.landowner && !this.landownerDone && level >= WEAR_CAP && !this.stopped) {
      this.landownerDone = true;
      this.pending.push('landowner');
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
    if (this.stopped || document.hidden) return;
    // Pacing rules: one gag at a time, anywhere on screen; none starts while a truck is moving.
    if (this.host.moving()) return;
    if (!this.stuckFired && isStuck((performance.now() - this.lastMoveAt) / this.opts.idleScale)) {
      this.stuckFired = true;
      this.pending.push('stuck');
    }
    if (this.busy()) {
      if (this.opts.demo) this.demoBusy();
      return;
    }
    if (this.startPending()) return;
    if (this.opts.force) return this.tickForced(this.opts.force);
    if (this.opts.demo && !reducedMotion()) return this.tickDemo();
    this.tickWild();
    if (this.busy()) return;
    const due = dueGag((performance.now() - this.lastActivity) / this.opts.idleScale, this.idle);
    if (due === 'magpie') {
      this.idle = { ...this.idle, magpieThisIdle: true };
      this.runIdleGag((s) => this.magpie(s));
    } else if (due === 'spotter' && (!this.spotterTurnTaken || !this.opts.wildlife)) {
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
    // The animated magpie (Batch C); the old drawing still does the hops and the poop until those are redone.
    const pie = this.withSprite(bird, 'magpie', (s * 1.3) / 256, s / 2, s * 0.69);
    signal.addEventListener('abort', () => (pie.destroy(), bird.remove()), { once: true });
    const board = this.host.el.getBoundingClientRect();
    const roof = truckEl.getBoundingClientRect();
    const land = { x: roof.left + roof.width / 2 - board.left - s / 2, y: roof.top + roof.height / 2 - board.top - s * 0.62 };
    const from = { x: -s * 1.5, y: -cell * 1.6 };
    const away = { x: board.width + s, y: -cell * 2 };
    const at = (p: { x: number; y: number }) => `translate(${p.x}px, ${p.y}px)`;

    if (reducedMotion()) {
      bird.classList.remove('flying');
      bird.style.transform = at(land);
      pie.show('magpie_land', 7);
      sound.squawk();
      await sleep(500, signal);
      this.droppings(truckEl, s);
      sound.grunt();
      this.host.say(truckEl.querySelector('.cab') ?? truckEl, MAGPIE_LINE);
      await sleep(1600, signal);
      bird.remove();
      this.onSeen('magpie');
      return;
    }
    pie.play('magpie_fly', { fps: 14, loop: -1 });
    const landing = gsap.delayedCall(0.6, () => pie.play('magpie_land', { fps: 16 }));
    signal.addEventListener('abort', () => landing.kill(), { once: true });
    await this.animate(bird, [{ transform: at(from) }, { transform: at(land) }], 1100, 'cubic-bezier(0.3, 0.6, 0.4, 1)', signal);
    bird.classList.remove('flying');
    sound.squawk();
    bird.classList.add('drawn');
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
    bird.classList.remove('drawn');
    bird.classList.add('flying');
    pie.play('magpie_take_off', { fps: 16 }).eventCallback('onComplete', () => pie.play('magpie_fly', { fps: 14, loop: -1 }));
    await this.animate(bird, [{ transform: at(land) }, { transform: at(away) }], 900, 'cubic-bezier(0.5, 0, 0.8, 0.6)', signal);
    pie.destroy();
    bird.remove();
    this.onSeen('magpie');
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
    // The animated spotter (Batch C) jogs on and sits on his bucket; the old drawing still does the
    // sleeping and the startled wake-up until those are redone.
    const guy = this.withSprite(el, 'spotter', (h * 1.12) / 225, w / 2, h);
    spotterSprites.set(el, guy);
    const at = (px: number) => `translate(${px}px, ${y}px)`;
    el.style.transform = at(-w * 1.5);
    if (!reducedMotion()) {
      guy.play('spotter_jog', { fps: 12, loop: -1 });
      await this.animate(el, [{ transform: at(-w * 1.5) }, { transform: at(x) }], 1800, 'linear', signal);
      el.getAnimations().forEach((a) => a.cancel());
      el.style.transform = at(x);
      await new Promise<void>((resolve, reject) => {
        guy.play('spotter_sit_on_bucket', { fps: 13 }).eventCallback('onComplete', () => resolve());
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }
    // He's on the pail and nods off. From here a touch wakes him instead of cancelling him.
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transform = at(x);
    el.classList.add('drawn');
    el.classList.replace('walking', 'asleep');
    if (this.spotter?.el === el) {
      this.spotter.state = 'asleep';
      this.spotterTurnTaken = true;
      this.onSeen('spotter');
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
      spotterSprites.get(sp.el)?.destroy();
      sp.el.remove();
      if (this.spotter === sp) this.spotter = null;
    }
  }

  private removeSpotter(): void {
    sound.snore(false);
    if (this.spotter) spotterSprites.get(this.spotter.el)?.destroy();
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
    // The animated biffy (Batch C), sized to fit the same box, standing on its bottom edge.
    this.biffySprite?.destroy();
    this.biffySprite = this.withSprite(el, 'biffy-art', Math.min(h / 225, (w * 1.15) / 178), w / 2, h);
    this.biffySprite.show('biffy_door_open', this.biffy?.el === el && el.classList.contains('open') ? 7 : 0);
    el.dataset.side = spot.side;
    el.dataset.truck = spot.truckId;
  }

  /** The door bangs open; a worker shuffles out bent over, hauling his coveralls up, and off screen. Once per level. */
  private async biffyGag(): Promise<void> {
    const b = this.biffy!;
    b.done = true;
    this.biffyPlaying = true;
    const { el } = b;
    el.classList.add('open');
    this.biffySprite?.play('biffy_door_open', { fps: 28 });
    sound.doorBang();
    const r = { left: parseFloat(el.style.left), top: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height) };
    const wh = r.h * 1.4;
    const ww = (wh * 92) / 84;
    const guy = this.figure('gag worker-bent', WORKER_RIG, ww, wh);
    const rig = new Rig(guy);
    const shuffle = this.shuffle(guy, rig);
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
        this.onSeen('biffy');
      } else {
        // Out of the door with a little hop (squash, stretch, land), then tiny quick steps off screen.
        const hopOut = gsap.timeline();
        hopOut.to(rig.get('root'), { sy: 0.88, sx: 1.08, duration: 0.08, ease: 'power2.out' });
        hopOut.to(rig.get('root'), { sy: 1.08, sx: 0.95, duration: 0.12, ease: 'power2.out' });
        hopOut.to(rig.get('root'), { sy: 1, sx: 1, duration: 0.25, ease: 'back.out(3)' });
        await this.animate(guy, [{ transform: at(start.x, start.y), opacity: 0 }, { transform: at(start.x, outY - r.h * 0.06), opacity: 1, offset: 0.6 }, { transform: at(start.x, outY), opacity: 1 }], 320, 'ease-out');
        shuffle.play();
        sound.feet(true);
        await this.animate(guy, [{ transform: at(start.x, outY) }, { transform: at(offX, outY) }], 3200, 'linear');
        this.onSeen('biffy');
      }
    } catch {
      // Stage cleared.
    } finally {
      sound.feet(false);
      this.biffySprite?.play('biffy_door_close', { fps: 20 });
      shuffle.kill();
      rig.destroy();
      guy.remove();
      el.classList.remove('open');
      this.biffyPlaying = false;
      this.perimeterEnded();
    }
  }

  /**
   * The worker's shuffle: tiny quick alternating steps (his coveralls hobble him), a bob on every
   * step, a little sway, and the toilet paper streamer fluttering out behind. Paused until played.
   */
  private shuffle(guy: HTMLElement, rig: Rig): gsap.core.Timeline {
    const step = 0.12;
    const tl = gsap.timeline({ repeat: -1, paused: true });
    for (const [n, a] of [
      ['legN', 1],
      ['legF', -1],
    ] as const) {
      tl.to(rig.get(n), { rot: -10 * a, duration: step, ease: 'sine.inOut' }, 0);
      tl.to(rig.get(n), { rot: 10 * a, duration: step, ease: 'sine.inOut' }, step);
    }
    tl.to(rig.get('root'), { y: -1.6, duration: step / 2, repeat: 3, yoyo: true, ease: 'sine.out' }, 0);
    tl.to(rig.get('upper'), { rot: 3, duration: step, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0);
    tl.to(rig.get('head'), { rot: -4, duration: step, repeat: 1, yoyo: true, ease: 'sine.inOut' }, step * 0.3);
    // Streamer: a wave travelling along it, wider towards the loose end.
    const tp = guy.querySelectorAll<SVGPathElement>('.tp, .tp-edge');
    const flutter = () => {
      const t = performance.now() / 1000;
      const pts = Array.from({ length: 7 }, (_, i) => [45 - i * 11, 47 + i * 1.2 + Math.sin(t * 13 - i * 0.9) * i * 0.9]);
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) d += ` Q${pts[i][0]} ${pts[i][1]} ${(pts[i][0] + pts[i + 1][0]) / 2} ${(pts[i][1] + pts[i + 1][1]) / 2}`;
      d += ` L${pts.at(-1)![0]} ${pts.at(-1)![1]}`;
      tp.forEach((p) => p.setAttribute('d', d));
    };
    tl.eventCallback('onUpdate', flutter);
    flutter();
    return tl;
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
      // The cable: a dark jacket, a lighter line along it, and the plug at the truck's end.
      let line: SVGGElement | null = null;
      if (Math.hypot(cord.to.x - cord.from.x, cord.to.y - cord.from.y) > 0.01) {
        line = document.createElementNS(NS, 'g');
        line.setAttribute('class', 'cord');
        line.innerHTML = '<path class="cord-core"/><path class="cord-hi"/><rect class="cord-plug" width="13" height="10" rx="2.5"/>';
        this.cordLayer.append(line);
      }
      this.cords.set(t.id, { cord, post, line });
    }
  }

  private placePost(post: HTMLElement, cord: Cord): void {
    const { cellPx: cell, fencePx: fence } = this.host;
    // On the berm's inner slope, right at the pad's edge, so the cord plugs straight into it and
    // nothing (post, cord or dangling plug) reaches outside the berm.
    const h = fence * 0.78;
    const w = h * 0.67;
    const along = fence + (cord.index + 0.5) * cell;
    const across = cord.side === 'left' || cord.side === 'top' ? fence * 0.68 : fence * 1.32 + cell * SIZE;
    const vertical = cord.side === 'left' || cord.side === 'right';
    Object.assign(post.style, {
      width: `${w}px`,
      height: `${h}px`,
      // Beside the lane, so it never covers a gate in the same spot.
      left: `${(vertical ? across : along + cell * POST_ASIDE) - w / 2}px`,
      top: `${(vertical ? along - cell * POST_ASIDE : across) - h / 2}px`,
    });
  }

  /**
   * The cord's path (pad units: 100 per cell): out of its post at the pad's edge, a coil of slack
   * lying on the ground, then a slightly sagging run to the truck's rear.
   */
  private cordPath(c: Cord): string {
    const [x1, y1, x2, y2] = [c.from.x * 100, c.from.y * 100, c.to.x * 100, c.to.y * 100];
    const horizontal = Math.abs(y2 - y1) < 1;
    // The post stands beside the lane: start there, at the pad's edge.
    const sx = horizontal ? x1 : x1 + POST_ASIDE * 100;
    const sy = horizontal ? y1 - POST_ASIDE * 100 : y1;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dir = horizontal ? Math.sign(x2 - x1) : Math.sign(y2 - y1);
    // Too short for a coil: just a curve from the post to the truck.
    if (len < 55) return horizontal ? `M${sx} ${sy} Q${sx + dir * 12} ${y1} ${x2} ${y2}` : `M${sx} ${sy} Q${x1} ${sy + dir * 12} ${x2} ${y2}`;
    // Join the lane's centre line a little way in, loop once, carry on to the truck with a sag.
    const join = Math.min(32, len * 0.3);
    const r = 11;
    const sag = 7;
    if (horizontal) {
      const jx = x1 + dir * join;
      const mx = (jx + x2) / 2;
      return `M${sx} ${sy} C${sx + dir * 14} ${sy} ${jx - dir * 12} ${y1} ${jx} ${y1} c${dir * r * 2.4} ${r * 2.6} ${-dir * r * 2.4} ${r * 2.6} ${dir * 6} 0 Q${mx} ${y1 + sag} ${x2} ${y2}`;
    }
    const jy = y1 + dir * join;
    const my = (jy + y2) / 2;
    return `M${sx} ${sy} C${sx} ${sy + dir * 14} ${x1} ${jy - dir * 12} ${x1} ${jy} c${-r * 2.6} ${dir * r * 2.4} ${-r * 2.6} ${-dir * r * 2.4} 0 ${dir * 6} Q${x1 + sag} ${my} ${x2} ${y2}`;
  }

  /** Puts a path on both layers of a cord and its plug at the loose end. */
  private drawCord(line: SVGGElement, d: string, end: { x: number; y: number }, plug = true): void {
    line.querySelectorAll('path').forEach((p) => p.setAttribute('d', d));
    const rect = line.querySelector('rect');
    if (!rect) return;
    if (!plug) return rect.remove();
    rect.setAttribute('x', String(end.x * 100 - 6.5));
    rect.setAttribute('y', String(end.y * 100 - 5));
  }

  private rip(id: string, c: { cord: Cord; post: HTMLElement; line: SVGGElement | null }): void {
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
      this.drawCord(line, `M${from.x * 100} ${from.y * 100} Q${mx} ${my} ${ex * 100} ${ey * 100}`, { x: ex, y: ey }, false);
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
    this.landownerPlaying = true;
    try {
      await this.landownerRide();
    } finally {
      this.landownerPlaying = false;
      this.perimeterEnded();
    }
  }

  private async landownerRide(): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    const h = Math.max(cell * 0.9, Math.min(cell * 1.3, this.bands.below - 6));
    const w = h * 0.6;
    const y = this.belowBand(h);
    // The animated landowner (Batch C) walks in on foot, wags his finger, shakes his head, walks off.
    const man = this.figure('gag landowner', LANDOWNER, w, h);
    const rancher = this.withSprite(man, 'landowner-art', (h * 1.08) / 225, w / 2, h);
    const at = (x: number) => `translate(${x}px, ${y}px)`;
    const stopAt = size - w - cell * 0.4;
    const facing = (left: boolean) => rancher.el.classList.toggle('flip', left);
    try {
      if (reducedMotion()) {
        man.style.transform = at(stopAt);
        rancher.show('landowner_finger_wag', 4);
        this.host.say(rancher.el.querySelector('.sheet') ?? man, LANDOWNER_LINE);
        await sleep(2600);
        this.onSeen('landowner');
        return;
      }
      facing(true);
      rancher.play('landowner_walk', { fps: 12, loop: -1 });
      sound.feet(true);
      await this.animate(man, [{ transform: at(size + w) }, { transform: at(stopAt) }], 1300, 'cubic-bezier(0.2, 0.7, 0.3, 1)');
      sound.feet(false);
      // The bubble points at the top of his frame, above his hat.
      this.host.say(rancher.el.querySelector('.sheet') ?? man, LANDOWNER_LINE);
      rancher.play('landowner_finger_wag', { fps: 8 }).eventCallback('onComplete', () => rancher.play('landowner_head_shake', { fps: 8 }));
      await sleep(2200);
      facing(false);
      rancher.play('landowner_walk', { fps: 14, loop: -1 });
      sound.feet(true);
      await this.animate(man, [{ transform: at(stopAt) }, { transform: at(size + w * 1.5) }], 1100, 'cubic-bezier(0.5, 0, 0.8, 0.5)');
      this.onSeen('landowner');
    } catch {
      // Interrupted by a new level.
    } finally {
      sound.feet(false);
      rancher.destroy();
      man.remove();
    }
  }

  // ---------- Wildlife and traffic: along the bottom, between the board and the buttons ----------

  /** Anything else on stage right now? The bear, moose and hot shot wait for it to finish. */
  private busy(): boolean {
    return !!(this.idleGag || this.spotter || this.wildGag || this.landownerPlaying || this.biffyPlaying || this.reactionPlaying);
  }

  /** The biffy's truck backed up: the gag is queued (once per level) and starts when the stage is free. */
  private queueBiffy(): void {
    this.biffy!.done = true;
    if (!this.pending.includes('biffy')) this.pending.push('biffy');
  }

  /** Starts the next waiting gag or reaction, if any. The caller has checked the stage is free. */
  private startPending(): boolean {
    const next = this.pending.shift();
    if (!next) return false;
    if (next === 'landowner') void this.landowner();
    else if (next === 'biffy') void this.biffyGag();
    else void this.react(next);
    return true;
  }

  /** Plays a reaction slot's art if any is registered; otherwise just notes it on the board. */
  private async react(kind: Reaction): Promise<void> {
    this.host.el.dataset.reaction = kind;
    const play = this.reactions[kind];
    if (!play || reducedMotion()) return;
    const ctl = new AbortController();
    this.reactionPlaying = true;
    try {
      await play(ctl.signal);
    } catch {
      // Cleared by a new level.
    } finally {
      this.reactionPlaying = false;
    }
  }

  /** Perimeter gags enabled on this level: the region's pool, plus the bear on a visit he's coming. */
  private perimeterPool(): WildGag[] {
    return [...wildPool(this.opts.regionId), ...(this.bearVisit && !this.bearDone ? (['bear'] as const) : [])];
  }

  private levelMs(): number {
    return (performance.now() - this.levelStart) / this.opts.idleScale;
  }

  /** A perimeter gag just ended (scheduled or set off by the player): the next waits 30 to 45 seconds. */
  private perimeterEnded(): void {
    this.spotterTurnTaken = false;
    this.wild = perimeterDone(this.levelMs(), this.wild);
  }

  private tickWild(): void {
    if (!this.opts.wildlife || reducedMotion() || this.busy()) return;
    const due = nextPerimeter(this.levelMs(), this.wild, this.perimeterPool(), this.opts.found());
    if (!due) return;
    this.wild = due.state;
    this.startWild(due.gag);
  }

  /**
   * Demo mode: a gag about every 15 seconds (the first about 5 seconds in), unfound ones first.
   * It sets off the idle and triggered gags too (magpie, spotter, biffy, landowner).
   */
  private tickDemo(): void {
    const now = performance.now();
    const scale = this.opts.idleScale;
    if (now < this.demoAt) return;
    const pool = demoPool(this.opts.regionId, !!this.biffy).filter((g) => g !== 'magpie' || this.host.state().trucks.length > 0);
    const gag = demoNext(pool, this.opts.found(), this.demoTried);
    if (!gag) return;
    this.demoTried.push(gag);
    this.demoAt = now + DEMO_EVERY_MS * scale;
    if (gag === 'magpie') this.runIdleGag((s) => this.magpie(s));
    else if (gag === 'spotter') this.runIdleGag((s) => this.spotterWalksOn(s));
    else if (gag === 'landowner') void this.landowner();
    else if (gag === 'biffy') {
      this.biffy!.done = false;
      void this.biffyGag();
    } else this.startWild(gag);
  }

  /** Demo mode while something's on stage: wake a dozing spotter, and leave a breath before the next gag. */
  private demoBusy(): void {
    const now = performance.now();
    const scale = this.opts.idleScale;
    // Nobody's going to wake the spotter in a demo: after a short doze he startles himself.
    if (this.spotter?.state === 'asleep') {
      if (!this.asleepAt) this.asleepAt = now;
      else if (now - this.asleepAt > 2500 * scale) void this.wakeSpotter();
    } else this.asleepAt = 0;
    this.demoAt = Math.max(this.demoAt, now + 1500 * scale);
  }

  private startWild(gag: WildGag): void {
    const ctl = new AbortController();
    this.wildGag = ctl;
    const play = this.play(gag, ctl.signal);
    play
      .catch(() => {})
      .finally(() => {
        if (this.wildGag !== ctl) return;
        this.wildGag = null;
        this.perimeterEnded();
      });
  }

  /** Plays one of the outside scenes. */
  private play(gag: WildGag, signal: AbortSignal): Promise<void> {
    if (gag === 'hotshot') return this.hotshot(signal);
    if (gag === 'bear') return this.bear(signal);
    if (gag === 'moose') return this.moose(signal);
    if (gag === 'gopher') return this.gopher(signal);
    if (gag === 'geese') return this.geese(signal);
    return this.pumper(signal);
  }

  /** The bottom strip, with what already stands in it (biffy, bush), for the gopher and the pumper. */
  private strip(): Strip {
    const s = this.groundStrip();
    const e = this.screenEdges();
    const avoid = [this.biffyBelow(), this.bush && this.bearPlan ? { left: this.bearPlan.bushX, right: this.bearPlan.bushX + this.bearPlan.bushW } : null];
    return { base: s.base, h: s.h, screenL: e.left, screenR: e.right, cell: this.host.cellPx, avoid: avoid.filter((a) => a !== null) };
  }

  /** Gopher (Cardium): pops out of a hole by the bottom fence, whistles, drops back down. */
  private async gopher(signal: AbortSignal): Promise<void> {
    await playGopher(this.sceneLayer('front'), this.strip(), signal);
    this.onSeen('gopher');
  }

  /** Canada geese (any region): a V across the sky above the board, behind the HUD. */
  private async geese(signal: AbortSignal): Promise<void> {
    const board = this.host.el.getBoundingClientRect();
    const e = this.screenEdges();
    // From just under the top of the screen (board px are negative up there) to just above the fence.
    const top = -board.top + Math.max(6, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 6);
    await playGeese(this.sceneLayer('back'), { top, bottom: -4, screenL: e.left, screenR: e.right, cell: this.host.cellPx }, signal);
    this.onSeen('geese');
  }

  /** The pumper (any region): drives up outside the fence, checks a gauge, writes it down, drives off. */
  private async pumper(signal: AbortSignal): Promise<void> {
    await playPumper(this.sceneLayer('front'), this.strip(), signal);
    this.onSeen('pumper');
  }

  /** The strip between the board and the buttons, in board px: top edge and the ground line. */
  private groundStrip(): { top: number; base: number; h: number } {
    const size = this.host.cellPx * SIZE + this.host.fencePx * 2;
    const h = Math.max(30, this.bands.ground - 6);
    return { top: size + 3, base: size + 3 + h, h };
  }

  /** Screen edges in board px (characters come in and leave from off screen). */
  private screenEdges(): { left: number; right: number } {
    const board = this.host.el.getBoundingClientRect();
    return { left: -board.left, right: document.documentElement.clientWidth - board.left };
  }

  /** The biffy's span if it stands below the board, so nothing stops in front of it. */
  private biffyBelow(): { left: number; right: number } | null {
    if (!this.biffy || this.biffy.spot.side !== 'bottom') return null;
    const l = parseFloat(this.biffy.el.style.left);
    return { left: l, right: l + parseFloat(this.biffy.el.style.width) };
  }

  /** ?gag=…: play that scene now, and again 1.5s after it ends, with nothing else on stage. */
  private tickForced(gag: ForcedGag): void {
    if (reducedMotion() || this.wildGag || this.biffyPlaying || performance.now() < this.forceAt) return;
    const ctl = new AbortController();
    this.wildGag = ctl;
    let play: Promise<void>;
    if (gag === 'biffy') {
      if (!this.biffy) return void (this.wildGag = null);
      this.biffy.done = false;
      this.wildGag = null; // the biffy guards itself with biffyPlaying
      play = this.biffyGag();
    } else play = this.play(gag, ctl.signal);
    play
      .catch(() => {})
      .finally(() => {
        if (this.wildGag === ctl) this.wildGag = null;
        this.forceAt = performance.now() + 1500;
      });
    this.forceAt = Infinity;
  }

  /**
   * A layer on the game screen lined up with the board, for the big animated scenes. They live
   * outside the board (its drop-shadow filter would make the phone redraw it every frame):
   * 'back' sits behind the HUD and the board (the moose, peeking over the fence), 'front' over
   * the board (the bear). Positions inside are in board px, like everything else here.
   */
  private sceneLayer(z: 'front' | 'back'): HTMLElement {
    const screen = this.host.el.closest<HTMLElement>('.screen') ?? this.host.el.parentElement!;
    let layer = screen.querySelector<HTMLElement>(`:scope > .scene-${z}`);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = `scene-layer scene-${z}`;
      screen.append(layer);
    }
    const b = this.host.el.getBoundingClientRect();
    const s = screen.getBoundingClientRect();
    layer.style.transform = `translate(${b.left - s.left}px, ${b.top - s.top}px)`;
    return layer;
  }

  /** Where the Montney bush stands (and so where the bear will squat), worked out from the screen. */
  private placeBush(el: HTMLElement): void {
    const strip = this.groundStrip();
    const edges = this.screenEdges();
    this.bearPlan = bearLayout({ screenL: edges.left, screenR: edges.right, cell: this.host.cellPx, stripH: strip.h, biffy: this.biffyBelow() });
    const { bushX, bushW, bushH } = this.bearPlan;
    Object.assign(el.style, { width: `${bushW}px`, height: `${bushH}px`, transform: `translate(${bushX}px, ${strip.base - bushH}px)` });
  }

  /** The legendary bear: the full puppet-rig scene beside the bush (bear-scene.ts). */
  private async bear(signal: AbortSignal): Promise<void> {
    if (!this.bush || !this.bearPlan) return;
    this.bearDone = true;
    const edges = this.screenEdges();
    await playBear(this.sceneLayer('front'), this.bearPlan, { ground: this.groundStrip().base, screenL: edges.left, screenR: edges.right }, signal);
    this.onSeen('bear');
  }

  /** Moose (Duvernay): peeks in over the top fence, chews, stares at you, pulls back (moose-scene.ts). */
  private async moose(signal: AbortSignal): Promise<void> {
    const { cellPx: cell, fencePx: fence } = this.host;
    const size = cell * SIZE + fence * 2;
    // A small background peek behind the board: head and antlers in the gap above the top fence,
    // chin hidden behind it. Half the size he was (when he filled the gap up to the HUD).
    const clipY = fence * 0.5;
    const before = Math.max(0.5, Math.min((cell * 2.2) / 126, (this.bands.above + clipY - 10) / 80));
    const h = MOOSE_H * before * 0.5;
    await playMoose(this.sceneLayer('back'), { cx: size * 0.5, clipY, h }, signal);
    this.onSeen('moose');
  }

  /** Hot shot (every region): a pickup screams across the bottom in a cloud of dust, mud or snow. Under a second. */
  private async hotshot(signal: AbortSignal): Promise<void> {
    const { cellPx: cell } = this.host;
    const strip = this.groundStrip();
    const h = Math.max(cell * 0.6, Math.min(cell * 1.1, strip.h * 0.62));
    const w = (h * 120) / 52;
    const edges = this.screenEdges();
    const ltr = Math.random() < 0.5;
    const x0 = ltr ? edges.left - w * 1.2 : edges.right + w * 0.2;
    const x1 = ltr ? edges.right + w * 0.2 : edges.left - w * 1.2;
    const y = strip.base - h;
    const ms = 760;
    const truck = this.figure(`gag wild hotshot${ltr ? '' : ' facing-left'}`, HOTSHOT, w, h);
    truck.style.transform = `translate(${x0}px, ${y}px)`;
    signal.addEventListener('abort', () => truck.remove(), { once: true });
    sound.hotshot(ms / 1000, ltr);
    const start = performance.now();
    // A puff off the back wheels every few frames, left hanging behind as it goes.
    const puffs = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      const x = x0 + (x1 - x0) * k + (ltr ? w * 0.05 : w * 0.95);
      this.puff(x + (Math.random() - 0.5) * h * 0.3, strip.base - h * (0.15 + Math.random() * 0.25), h);
    }, 45);
    try {
      await this.animate(truck, [{ transform: `translate(${x0}px, ${y}px)` }, { transform: `translate(${x1}px, ${y}px)` }], ms, 'linear', signal);
      this.onSeen('hotshot');
    } finally {
      clearInterval(puffs);
      truck.remove();
    }
  }

  private puff(x: number, y: number, h: number): void {
    const p = document.createElement('div');
    p.className = 'gag wild-puff';
    const s = h * (0.45 + Math.random() * 0.35);
    Object.assign(p.style, { width: `${s}px`, height: `${s}px`, background: PUFF[this.opts.ground], left: `${x - s / 2}px`, top: `${y - s / 2}px` });
    this.host.el.append(p);
    p.animate(
      [
        { transform: 'scale(0.4)', opacity: 0.85 },
        { transform: `translate(${(Math.random() - 0.5) * h * 0.4}px, ${-h * (0.2 + Math.random() * 0.3)}px) scale(${1.4 + Math.random() * 0.6})`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 250, easing: 'ease-out' },
    ).onfinish = () => p.remove();
  }

  // ---------- helpers ----------

  /**
   * Gives a gag figure its Batch C animated sprite, with feet at (x, y) inside the figure. The old
   * drawing stays in the figure for beats whose new art isn't in yet: add `.drawn` to show it.
   */
  private withSprite(figure: HTMLElement, cls: string, scale: number, x: number, y: number): Sprite {
    const sprite = new Sprite(cls, scale);
    sprite.el.style.transform = `translate(${x}px, ${y}px)`;
    figure.classList.add('uses-sprite');
    figure.append(sprite.el);
    return sprite;
  }

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
