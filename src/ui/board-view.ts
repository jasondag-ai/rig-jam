import { SIZE, cabSide, convoyWaitingFor, getMoveRange, type GameState, type Level, type Move, type MoveRange, type Side, type Truck } from '../engine/index.ts';
import { bumpTarget, pickSpeaker } from './bump.ts';
import { bumpLine, type BumpHit } from './lines.ts';
import { equipFit, equipmentSvg, gateClearance, phaseFor, runPumpjacks } from './obstacles.ts';
import { VEHICLE_SVG, defaultKind } from './vehicles.ts';
import { Spray } from './spray.ts';
import { coatSrc, gateArt, spriteImg, wireSprite } from './sprites.ts';
import { BERM_OVER, paintBerm } from './berm.ts';
import { nightRgba } from './night.ts';
import { paintDetail, planDetail } from './lease-detail.ts';
import { seedFrom } from '../engine/rng.ts';
import { TrackLayer } from './track-layer.ts';
import type { Ground } from './themes.ts';
import { SYMBOL } from './palette.ts';
import { sound } from '../audio/engine.ts';

const FENCE_RATIO = 0.42;
const GAP = 3; // px between a truck and its cell edge
const WAVE_MS = 260; // gate arm lifts and the driver waves before pulling out
const DRIVE_MS = 460;
/** How far back (cells) the finger must turn for a reversal to count toward a wiggle. */
const WIGGLE_TURN = 0.25;
const BUMP_PUSH = 0.25; // cells of push past a blocker before it counts as a bump
const BUBBLE_MS = 2200;
const RADIO_MS = 140; // radio squelch, then the driver speaks

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;


interface Drag {
  id: string;
  el: HTMLElement;
  pointerId: number;
  start: number;
  range: MoveRange;
  horizontal: boolean;
  offset: number;
  /** True while the truck is pushed against something; resets when it eases off. */
  pressing: boolean;
  /** The finger's wiggle: which way it is going and how far it has got (px along the lane). */
  wig: { dir: number; ext: number };
}

/** Renders the pad, gates, obstacles and trucks, and turns drags into (truckId, delta) move requests. */
export class BoardView {
  readonly el: HTMLElement;
  private yard: HTMLElement;
  private pad: HTMLElement;
  /** Equipment's own layer (over the trucks and the berm; takes no touches). */
  private equip: HTMLElement;
  private level: Level | null = null;
  private trucks = new Map<string, HTMLElement>();
  private cell = 48;
  private fence = 20;
  private drag: Drag | null = null;
  /** The dirt berm round the pad (berm.ts), repainted when the size, level or season changes. */
  private berm: HTMLCanvasElement;
  /** The level's own ground variety (lease-detail.ts), over the season's base image. */
  private detail: HTMLCanvasElement;
  private ground: Ground = 'gravel';
  private bermKey = '';
  private night = false;
  private bermNight!: HTMLCanvasElement;
  private dawnTimer = 0;
  /** Stops the pumpjacks' ambient motion (obstacles.ts) when the level is rebuilt. */
  private stopPumpjacks: () => void = () => {};
  private lastLine: string | null = null;
  /** How many times each truck has hit each kind of thing in this level (the lines escalate). */
  private hitCounts = new Map<string, number>();
  /** Tire tracks laid by drags, under obstacles and trucks; wheel spray while trucks move. */
  private tracks: TrackLayer;
  private spray: Spray;
  private getState: () => GameState;
  private onMove: (id: string, delta: number) => void;
  private onBump: (truckId: string, direction: 1 | -1, hit: BumpHit) => void;
  private movingUntil = 0;
  /** Called when a truck is picked up (the start of a drag). */
  onGrab: (truckId: string) => void = () => {};
  /** The finger turned back during a drag (a wiggle): called at each reversal. */
  onReverse: (truckId: string) => void = () => {};

  constructor(
    getState: () => GameState,
    onMove: (id: string, delta: number) => void,
    onBump: (truckId: string, direction: 1 | -1, hit: BumpHit) => void = () => {},
  ) {
    this.getState = getState;
    this.onMove = onMove;
    this.onBump = onBump;
    this.el = document.createElement('div');
    this.el.className = 'board';
    // The yard clips trucks driving out; bubbles sit on the board so they can overhang.
    this.yard = document.createElement('div');
    this.yard.className = 'yard';
    // Under everything: the lease's one continuous ground (pad and berm band alike), then the berm.
    this.el.insertAdjacentHTML('afterbegin', '<div class="lease-ground" aria-hidden="true"><canvas class="lease-detail"></canvas><i class="night-pad"></i></div><canvas class="berm" aria-hidden="true"></canvas><canvas class="berm berm-night" aria-hidden="true"></canvas>');
    this.berm = this.el.querySelector('canvas.berm')!;
    this.bermNight = this.el.querySelector('canvas.berm-night')!;
    this.detail = this.el.querySelector('canvas.lease-detail')!;
    gateArt(this.el);
    this.pad = document.createElement('div');
    this.pad.className = 'pad';
    this.yard.append(this.pad);
    this.el.append(this.yard);
    // Equipment stands on its own layer over the yard: above the trucks and the berm, never clipped.
    this.equip = document.createElement('div');
    this.equip.className = 'equip-layer';
    this.el.append(this.equip);
    this.spray = new Spray(this.pad, () => this.pad.querySelector('.truck'));
    this.tracks = new TrackLayer((m) => {
      this.spray.emit(m, this.cell);
      sound.motion(m.speed, m.dt);
    });
  }

  setLevel(level: Level): void {
    this.level = level;
    this.drag = null;
    this.el.querySelectorAll('.gate, .obstacle, .ghost, .bubble, .dust').forEach((n) => n.remove());
    this.hitCounts.clear();
    this.trucks.forEach((t) => t.remove());
    this.trucks.clear();
    // A clean pad: the track layer goes in first so obstacles and trucks sit on top of it.
    this.tracks.clear();
    this.spray.clear();
    this.pad.append(this.tracks.svg);
    for (const gate of level.gates) {
      const g = document.createElement('div');
      g.className = `gate c-${gate.color}`;
      g.dataset.side = gate.side;
      g.dataset.index = String(gate.index);
      // The drawn tab (sym + boom) is the fallback; the pipe gate (.gw) shows once its pieces load.
      g.innerHTML =
        `<span class="sym">${SYMBOL[gate.color]}</span><span class="boom"></span>` +
        `<span class="gw" aria-hidden="true">` +
        `<span class="g-leaf"><img alt="" draggable="false" src="./sprites/fence/gate-leaf-${gate.color}.webp" />` +
        `<span class="g-badge">${SYMBOL[gate.color]}</span></span>` +
        `<img class="g-hinge" alt="" draggable="false" src="./sprites/fence/gate-hinge.webp" />` +
        `<img class="g-latch" alt="" draggable="false" src="./sprites/fence/gate-latch.webp" /></span>`;
      // Convoy gates show the number they're waiting for.
      if (level.trucks.some((t) => t.color === gate.color && t.convoy)) {
        g.classList.add('convoy-gate');
        g.insertAdjacentHTML('beforeend', '<span class="wait" aria-label="waiting for convoy truck"></span>');
      }
      // On the board, not in the yard: the yard clips trucks driving out, and the gate swings out past it.
      this.el.append(g);
    }
    for (const o of level.obstacles) {
      const kind = o.kind ?? 'pumpjack';
      const ob = document.createElement('div');
      ob.className = `obstacle ${kind}`;
      ob.dataset.row = String(o.row);
      ob.dataset.col = String(o.col);
      // Lower rows stand in front of the ones above.
      ob.style.zIndex = String(1 + o.row);
      // Tall pieces stick up above their cell (by less than half a cell), over whatever is there.
      const fit = equipFit(kind);
      const seed = o.row * SIZE + o.col;
      ob.style.setProperty('--eq-h', `${fit.height}%`);
      const clear = gateClearance(kind, o.row, o.col, level.gates);
      ob.style.setProperty('--eq-dx', `${clear.dx}%`);
      ob.style.setProperty('--eq-dy', `${(clear.dy * 100) / fit.height}%`);
      ob.style.setProperty('--eq-s', String(clear.scale));
      ob.style.setProperty('--eq-delay', `${-(seed % 7) * 0.31}s`);
      if (kind === 'pumpjack') ob.dataset.phase = String(phaseFor(seed));
      // At night a flare lights the ground and the trucks round it (style.css, "Night").
      ob.innerHTML = (kind === 'flare' ? '<i class="flare-glow"></i>' : '') + equipmentSvg(kind, seed);
      this.equip.append(ob);
    }
    this.stopPumpjacks();
    this.stopPumpjacks = runPumpjacks(this.equip, reducedMotion());
    this.layout();
  }

  /** Fits the board into the given box and repositions everything. */
  resize(maxWidth: number, maxHeight: number): void {
    const size = Math.max(200, Math.min(maxWidth, maxHeight));
    this.cell = Math.floor(size / (SIZE + 2 * FENCE_RATIO));
    this.fence = Math.floor((size - this.cell * SIZE) / 2);
    this.layout();
  }

  private layout(): void {
    const { cell, fence } = this;
    const total = cell * SIZE + fence * 2;
    this.el.style.width = this.el.style.height = `${total}px`;
    this.el.style.setProperty('--cell', `${cell}px`);
    this.el.style.setProperty('--fence', `${fence}px`);
    this.pad.style.left = this.pad.style.top = `${fence}px`;
    this.equip.style.left = this.equip.style.top = `${fence}px`;
    this.pad.style.width = this.pad.style.height = `${cell * SIZE}px`;
    this.el.querySelectorAll<HTMLElement>('.gate').forEach((g) => {
      const side = g.dataset.side as Side;
      const i = Number(g.dataset.index);
      const along = fence + i * cell;
      const across = side === 'left' || side === 'top' ? 0 : fence + cell * SIZE;
      const vertical = side === 'left' || side === 'right';
      Object.assign(g.style, {
        left: `${vertical ? across : along}px`,
        top: `${vertical ? along : across}px`,
        width: `${vertical ? fence : cell}px`,
        height: `${vertical ? cell : fence}px`,
      });
    });
    this.paintBerm();
    this.el.querySelectorAll<HTMLElement>('.obstacle').forEach((ob) => {
      Object.assign(ob.style, {
        width: `${cell}px`,
        height: `${cell}px`,
        transform: `translate(${Number(ob.dataset.col) * cell}px, ${Number(ob.dataset.row) * cell}px)`,
      });
    });
    const state = this.level ? this.getState() : null;
    if (state) this.sync(state, false);
  }

  /** Draws the berm and the ground detail for this board size, level and season; skipped when nothing changed. */
  private paintBerm(): void {
    if (!this.level) return;
    const { cell, fence, ground } = this;
    const over = Math.round(fence * BERM_OVER);
    const scale = Math.min(3, window.devicePixelRatio || 1);
    const key = [cell, fence, ground, scale, this.level.id, this.level.gates.map((g) => g.side + g.index).join()].join('|');
    if (key === this.bermKey) return;
    this.bermKey = key;
    const size = cell * SIZE + (fence + over) * 2;
    Object.assign(this.berm.style, { left: `${-over}px`, top: `${-over}px`, width: `${size}px`, height: `${size}px` });
    paintBerm(this.berm, { cell, band: fence, over, gates: this.level.gates }, ground, seedFrom(this.level.id), scale);
    if (this.night) this.paintNightBerm();
    paintDetail(this.detail, planDetail(this.level, ground, seedFrom(this.level.id)), cell, fence, scale);
  }

  /** Brings truck elements in line with the game state. */
  sync(state: GameState, animate = true, exitedId?: string): void {
    this.el.querySelectorAll<HTMLElement>('.convoy-gate').forEach((g) => {
      const color = state.level.gates.find((x) => x.side === g.dataset.side && x.index === Number(g.dataset.index))!.color;
      const waiting = convoyWaitingFor(state, color);
      const wait = g.querySelector<HTMLElement>('.wait')!;
      wait.textContent = waiting ? String(waiting) : '';
      wait.setAttribute('aria-label', waiting ? `waiting for convoy truck ${waiting}` : 'convoy gone');
      g.classList.toggle('convoy-done', !waiting);
    });
    const alive = new Set(state.trucks.map((t) => t.id));
    for (const [id, el] of this.trucks) {
      if (alive.has(id)) continue;
      this.trucks.delete(id);
      if (id === exitedId) this.driveOut(el);
      else el.remove();
    }
    for (const t of state.trucks) {
      let el = this.trucks.get(t.id);
      const fresh = !el;
      if (!el) {
        el = this.createTruck(t);
        this.trucks.set(t.id, el);
        this.pad.append(el);
      }
      el.classList.toggle('no-anim', !animate || fresh);
      this.place(el, t);
      if (fresh) void el.offsetWidth; // commit position before transitions resume
      el.classList.remove('no-anim');
    }
  }

  private createTruck(t: Truck): HTMLElement {
    const el = document.createElement('div');
    el.className = `truck c-${t.color} ${t.orient === 'h' ? 'horiz' : 'vert'}`;
    el.dataset.id = t.id;
    el.dataset.cab = cabSide(this.level!, t);
    const kind = t.kind ?? defaultKind(t.length);
    el.dataset.kind = kind;
    // The art is drawn cab-right and rotated by CSS; the symbol badge and cab overlay stay upright.
    // Over the sprite lies the season's coat (snow or mud, baked per kind by truck-sprites.py).
    // A convoy truck carries its number on a small tag on the cab, in its own color.
    const coat = (name: string) => `url("${new URL(coatSrc(name, kind), location.href).href}")`;
    el.style.setProperty('--coat-snow', coat('snow'));
    el.style.setProperty('--coat-mud', coat('mud'));
    el.innerHTML =
      `<div class="ground-shadow"></div>` +
      `<div class="body"><div class="art">${spriteImg(kind, t.color)}${VEHICLE_SVG[kind]}<i class="coat"></i></div>` +
      `<div class="bed"><span class="sym">${SYMBOL[t.color]}</span></div>` +
      `<i class="lamps"></i>` +
      `<div class="cab"><span class="driver-arm"></span>${t.convoy ? `<span class="convoy-no" aria-label="convoy ${t.convoy}">${t.convoy}</span>` : ''}</div></div>`;
    wireSprite(el);
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e, t.id, el));
    el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    el.addEventListener('pointerup', (e) => this.onPointerUp(e));
    el.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
    return el;
  }

  /** Top-left pixel position of a truck within the pad. */
  private origin(t: Truck): { x: number; y: number } {
    return { x: t.col * this.cell + GAP, y: t.row * this.cell + GAP };
  }

  private place(el: HTMLElement, t: Truck, offset = 0): void {
    const { cell } = this;
    el.style.width = `${(t.orient === 'h' ? t.length : 1) * cell - GAP * 2}px`;
    el.style.height = `${(t.orient === 'v' ? t.length : 1) * cell - GAP * 2}px`;
    el.style.setProperty('--along', `${t.length * cell - GAP * 2}px`);
    el.style.setProperty('--across', `${cell - GAP * 2}px`);
    const { x, y } = this.origin(t);
    el.style.transform = `translate3d(${x + (t.orient === 'h' ? offset : 0)}px, ${y + (t.orient === 'v' ? offset : 0)}px, 0)`;
  }

  private currentXY(el: HTMLElement): { x: number; y: number } {
    const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
    return { x: m ? Number(m[1]) : 0, y: m ? Number(m[2]) : 0 };
  }

  // ---------- Drive-out: gate arm lifts, driver waves, truck pulls out in a cloud of dust ----------

  private driveOut(el: HTMLElement): void {
    const side = el.dataset.cab as Side;
    const gate = this.gateEl(side, el);
    el.classList.add('exiting');
    if (reducedMotion()) {
      el.remove();
      return;
    }
    gate?.classList.add('open');
    el.classList.add('waving');
    sound.exit();
    const from = this.currentXY(el);
    const dist = this.cell * (SIZE + 1);
    const dx = side === 'left' ? -dist : side === 'right' ? dist : 0;
    const dy = side === 'top' ? -dist : side === 'bottom' ? dist : 0;
    setTimeout(() => {
      el.style.transitionDuration = `${DRIVE_MS}ms`;
      el.style.transform = `translate3d(${from.x + dx}px, ${from.y + dy}px, 0)`;
      this.kickUpDust(el, from, dx, dy);
    }, WAVE_MS);
    setTimeout(() => el.remove(), WAVE_MS + DRIVE_MS + 40);
    setTimeout(() => gate?.classList.remove('open'), WAVE_MS + DRIVE_MS + 300);
  }

  private gateEl(side: Side, truckEl: HTMLElement): HTMLElement | null {
    const t = this.level?.trucks.find((x) => x.id === truckEl.dataset.id);
    if (!t) return null;
    const index = side === 'left' || side === 'right' ? t.row : t.col;
    return this.el.querySelector<HTMLElement>(`.gate[data-side="${side}"][data-index="${index}"]`);
  }

  private kickUpDust(el: HTMLElement, from: { x: number; y: number }, dx: number, dy: number): void {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Dust comes off the back of the truck, opposite the cab.
    const rearX = dx > 0 ? 0 : dx < 0 ? w : w / 2;
    const rearY = dy > 0 ? 0 : dy < 0 ? h : h / 2;
    const puffs = 6;
    for (let i = 0; i < puffs; i++) {
      setTimeout(() => {
        const t = (i / puffs) * 0.7; // rough position along an ease-in drive
        const puff = document.createElement('div');
        puff.className = 'dust';
        const size = this.cell * (0.35 + Math.random() * 0.2);
        const jitter = (Math.random() - 0.5) * this.cell * 0.3;
        Object.assign(puff.style, {
          width: `${size}px`,
          height: `${size}px`,
          left: `${from.x + rearX + dx * t * t - size / 2 + (dy ? jitter : 0)}px`,
          top: `${from.y + rearY + dy * t * t - size / 2 + (dx ? jitter : 0)}px`,
        });
        this.pad.append(puff);
        setTimeout(() => puff.remove(), 700);
      }, (i * DRIVE_MS) / puffs);
    }
  }

  // ---------- Bumps: jolt, near-miss tick (in the HUD), and a word from the driver ----------

  private bump(d: Drag, direction: 1 | -1): void {
    const body = d.el.querySelector<HTMLElement>('.body')!;
    body.style.setProperty('--jx', d.horizontal ? `${direction * 5}px` : '0px');
    body.style.setProperty('--jy', d.horizontal ? '0px' : `${direction * 5}px`);
    body.classList.remove('jolt');
    void body.offsetWidth; // restart the animation
    body.classList.add('jolt');
    // The driver who'd complain: the truck that got hit, else another truck, else the dragged one.
    const state = this.getState();
    const target = bumpTarget(state, d.id, d.range, direction);
    this.onBump(d.id, direction, target.hit);
    const key = `${d.id}:${target.hit}`;
    const nth = (this.hitCounts.get(key) ?? 0) + 1;
    this.hitCounts.set(key, nth);
    const speakerEl = this.trucks.get(pickSpeaker(state, d.id, target)) ?? d.el;
    sound.bump();
    sound.radio();
    setTimeout(() => {
      if (speakerEl.isConnected) this.speak(speakerEl, target.hit, nth);
    }, RADIO_MS);
  }

  private speak(truckEl: HTMLElement, hit: BumpHit, nth: number): void {
    const line = bumpLine(hit, nth, this.lastLine);
    this.lastLine = line;
    const b = this.say(truckEl.querySelector('.cab') ?? truckEl, line);
    b.dataset.hit = hit;
    b.dataset.nth = String(nth);
    b.dataset.speaker = truckEl.dataset.id ?? '';
  }

  /**
   * A speech bubble pointing at `anchor` (a truck's cab, or a character beside the pad): above it if
   * it fits on screen, otherwise below. Worked out in viewport space so it always stays on screen.
   */
  say(anchor: Element, text: string): HTMLElement {
    this.el.querySelector('.bubble')?.remove();
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    this.el.append(b);

    const margin = 8;
    const gap = 10;
    const board = this.el.getBoundingClientRect();
    const cab = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    b.style.maxWidth = `${Math.min(vw - margin * 2, 240)}px`;
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const cx = cab.left + cab.width / 2;
    const left = Math.max(margin, Math.min(vw - bw - margin, cx - bw / 2));
    const aboveTop = cab.top - bh - gap;
    const belowTop = cab.bottom + gap;
    const below = aboveTop < margin && belowTop + bh <= vh - margin;
    const top = Math.max(margin, Math.min(vh - bh - margin, below ? belowTop : aboveTop));
    b.classList.toggle('below', below);
    b.style.left = `${left - board.left}px`;
    b.style.top = `${top - board.top}px`;
    b.style.setProperty('--tail', `${Math.max(14, Math.min(bw - 14, cx - left))}px`);
    setTimeout(() => b.remove(), BUBBLE_MS);
    return b;
  }

  // ---------- For the gags (gag-layer.ts) ----------

  /** A truck is being dragged, or is still snapping into place or driving out. */
  get moving(): boolean {
    return this.drag !== null || performance.now() < this.movingUntil;
  }

  get cellPx(): number {
    return this.cell;
  }

  get fencePx(): number {
    return this.fence;
  }

  truckElement(id: string): HTMLElement | undefined {
    return this.trucks.get(id);
  }

  /** Puts a ground-level layer (e.g. block heater cords) on the pad, over the tracks, under everything else. */
  addGround(el: Element): void {
    this.tracks.svg.after(el);
  }

  /** Called with the deepest lane wear whenever tracks wear in. */
  set onWear(cb: (level: number) => void) {
    this.tracks.onWear = cb;
  }

  /** The season's ground (gravel, mud, snow): sets the berm, the ground detail, the tracks and the spray. */
  /** Night levels (night.ts): the lease under the night's shade, flare glow and headlights on. */
  setNight(on: boolean): void {
    this.night = on;
    if (on) this.paintNightBerm();
    this.el.classList.toggle('night', on);
    // Coming back to day is a quicker fade than nightfall (style.css "Night").
    this.el.classList.toggle('dawn', !on);
    window.clearTimeout(this.dawnTimer);
    if (!on) this.dawnTimer = window.setTimeout(() => this.el.classList.remove('dawn'), 2600);
  }

  /** The berm as it looks at night: the day's own canvas under the night's shade, on a canvas that fades in over it. */
  private paintNightBerm(): void {
    const day = this.berm, night = this.bermNight;
    if (!day.width) return;
    for (const k of ['left', 'top', 'width', 'height'] as const) night.style[k] = day.style[k];
    night.width = day.width;
    night.height = day.height;
    const ctx = night.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(day, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = nightRgba(this.ground);
    ctx.fillRect(0, 0, night.width, night.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  setGround(ground: Ground): void {
    this.tracks.setGround(ground);
    this.spray.setGround(ground);
    this.ground = ground;
    this.paintBerm();
  }

  /** Undo: every track (and the wear) from the last drag that moved a truck goes away. */
  removeLastTrack(): void {
    this.tracks.undo();
  }

  /** Where a truck element is right now along its lane, in cells (mid-animation too). */
  private positionOf(el: HTMLElement, horizontal: boolean): number {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return ((horizontal ? m.m41 : m.m42) - GAP) / this.cell;
  }

  // ---------- Hints ----------

  /** Step 1: highlight the truck to move. */
  showHintTruck(id: string): void {
    this.clearHint();
    this.trucks.get(id)?.classList.add('hinted');
  }

  /**
   * Step 2: a ghost of the truck itself where it should end up. A move out through its gate puts an
   * OUT badge on that gate instead.
   */
  showHintTarget(move: Move, state: GameState, exits: boolean): void {
    const t = state.trucks.find((x) => x.id === move.id);
    if (!t) return;
    this.clearTarget();
    const cab = cabSide(this.level!, t);
    if (exits) {
      const gate = this.el.querySelector<HTMLElement>(`.gate[data-side="${cab}"][data-index="${t.orient === 'h' ? t.row : t.col}"]`);
      if (gate) {
        gate.classList.add('hint-out');
        gate.insertAdjacentHTML('beforeend', '<span class="out-badge">OUT</span>');
        return;
      }
    }
    const target = t.orient === 'h' ? { ...t, col: t.col + move.delta } : { ...t, row: t.row + move.delta };
    const g = document.createElement('div');
    g.className = `ghost c-${t.color}`;
    g.dataset.cab = cab;
    g.innerHTML = `<div class="art">${spriteImg(t.kind ?? defaultKind(t.length), t.color)}</div>`;
    g.querySelector('img')!.addEventListener('error', () => g.classList.add('plain'));
    this.pad.append(g);
    this.place(g, target);
  }

  private clearTarget(): void {
    this.pad.querySelector('.ghost')?.remove();
    this.el.querySelectorAll('.gate.hint-out').forEach((gate) => {
      gate.classList.remove('hint-out');
      gate.querySelector('.out-badge')?.remove();
    });
  }

  clearHint(): void {
    this.clearTarget();
    this.trucks.forEach((el) => el.classList.remove('hinted'));
  }

  // ---------- Drag input ----------

  private truckById(id: string): Truck | undefined {
    return this.getState().trucks.find((t) => t.id === id);
  }

  private onPointerDown(e: PointerEvent, id: string, el: HTMLElement): void {
    if (this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const truck = this.truckById(id);
    const range = truck && getMoveRange(this.getState(), id);
    if (!truck || !range) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail (e.g. the pointer is already gone); the drag still works without it.
    }
    const horizontal = truck.orient === 'h';
    this.drag = { id, el, pointerId: e.pointerId, start: horizontal ? e.clientX : e.clientY, range, horizontal, offset: 0, pressing: false, wig: { dir: 0, ext: 0 } };
    el.classList.add('dragging');
    this.onGrab(id);
    sound.dragStart();
    this.tracks.begin(truck.orient, horizontal ? truck.row : truck.col, horizontal ? truck.col : truck.row, truck.length, el, () =>
      this.positionOf(el, horizontal),
    );
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const raw = (d.horizontal ? e.clientX : e.clientY) - d.start;
    const { min, max, exitDelta } = d.range;
    const exitLo = exitDelta === min && min < 0;
    const exitHi = exitDelta === max && max > 0;
    // Axis lock: only the truck's own axis counts. Allow a little overshoot toward an open gate.
    const lo = min * this.cell - (exitLo ? this.cell * 0.6 : 0);
    const hi = max * this.cell + (exitHi ? this.cell * 0.6 : 0);
    // Reversals of the finger itself (so a boxed-in truck can be wiggled too): a turn back of a quarter cell.
    const turn = this.cell * WIGGLE_TURN, w = d.wig;
    if (w.dir === 0) {
      if (Math.abs(raw - w.ext) > turn) d.wig = { dir: Math.sign(raw - w.ext), ext: raw };
    } else if ((raw - w.ext) * w.dir > 0) w.ext = raw;
    else if ((w.ext - raw) * w.dir > turn) {
      d.wig = { dir: -w.dir, ext: raw };
      this.onReverse(d.id);
    }
    const before = d.offset;
    d.offset = Math.max(lo, Math.min(hi, raw));
    const truck = this.truckById(d.id);
    // Backing away from its own gate sets off the backup alarm; pulling forward stops it.
    if (truck && Math.abs(d.offset - before) > 0.5) {
      const side = cabSide(this.getState().level, truck);
      const forward = side === 'right' || side === 'bottom' ? 1 : -1;
      sound.reversing(Math.sign(d.offset - before) !== forward);
    }
    if (truck) this.place(d.el, truck, d.offset);
    this.tracks.update(); // draw marks now, under the finger, not on the next frame

    // Pushing into a truck, obstacle, fence or wrong gate is a bump. Open gates never bump.
    const push = this.cell * BUMP_PUSH;
    const bumpLo = !exitLo && raw < lo - push;
    const bumpHi = !exitHi && raw > hi + push;
    if ((bumpLo || bumpHi) && !d.pressing) {
      d.pressing = true;
      this.bump(d, bumpHi ? 1 : -1);
    } else if (!bumpLo && !bumpHi && raw >= lo && raw <= hi) {
      d.pressing = false;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.endDrag();
    const delta = Math.max(d.range.min, Math.min(d.range.max, Math.round(d.offset / this.cell)));
    // Keep laying marks while the truck snaps into place, or all the way out through its gate.
    const settle = delta !== 0 && delta === d.range.exitDelta ? WAVE_MS + DRIVE_MS + 80 : 260;
    this.tracks.release(delta !== 0, settle);
    this.movingUntil = performance.now() + settle;
    sound.reversing(false);
    setTimeout(() => {
      if (!this.drag) sound.dragEnd();
    }, settle);
    if (delta !== 0) this.onMove(d.id, delta);
    else this.sync(this.getState());
  }

  private onPointerCancel(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.endDrag();
    this.tracks.release(false, 260);
    this.movingUntil = performance.now() + 260;
    sound.dragEnd();
    this.sync(this.getState());
  }

  private endDrag(): void {
    this.drag?.el.classList.remove('dragging');
    this.drag = null;
  }
}
