import { SIZE, cabSide, getMoveRange, type GameState, type Level, type Move, type MoveRange, type Side, type Truck } from '../engine/index.ts';
import { BUMP_LINES, BUMP_STAMP } from './lines.ts';
import { OBSTACLE_SVG } from './obstacles.ts';
import { SYMBOL } from './palette.ts';

const FENCE_RATIO = 0.42;
const GAP = 3; // px between a truck and its cell edge
const WAVE_MS = 260; // gate arm lifts and the driver waves before pulling out
const DRIVE_MS = 460;
const BUMP_PUSH = 0.25; // cells of push past a blocker before it counts as a bump
const BUBBLE_MS = 2200;
const STAMP_MS = 900;

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
}

/** Renders the pad, gates, obstacles and trucks, and turns drags into (truckId, delta) move requests. */
export class BoardView {
  readonly el: HTMLElement;
  private yard: HTMLElement;
  private pad: HTMLElement;
  private level: Level | null = null;
  private trucks = new Map<string, HTMLElement>();
  private cell = 48;
  private fence = 20;
  private drag: Drag | null = null;
  private lastLine = -1;
  private getState: () => GameState;
  private onMove: (id: string, delta: number) => void;

  constructor(getState: () => GameState, onMove: (id: string, delta: number) => void) {
    this.getState = getState;
    this.onMove = onMove;
    this.el = document.createElement('div');
    this.el.className = 'board';
    // The yard clips trucks driving out; bubbles and stamps sit on the board so they can overhang.
    this.yard = document.createElement('div');
    this.yard.className = 'yard';
    this.pad = document.createElement('div');
    this.pad.className = 'pad';
    this.yard.append(this.pad);
    this.el.append(this.yard);
  }

  setLevel(level: Level): void {
    this.level = level;
    this.drag = null;
    this.el.querySelectorAll('.gate, .obstacle, .ghost, .bubble, .stamp, .dust').forEach((n) => n.remove());
    this.trucks.forEach((t) => t.remove());
    this.trucks.clear();
    for (const gate of level.gates) {
      const g = document.createElement('div');
      g.className = `gate c-${gate.color}`;
      g.dataset.side = gate.side;
      g.dataset.index = String(gate.index);
      g.innerHTML = `<span class="sym">${SYMBOL[gate.color]}</span><span class="boom"></span>`;
      this.yard.append(g);
    }
    for (const o of level.obstacles) {
      const kind = o.kind ?? 'pumpjack';
      const ob = document.createElement('div');
      ob.className = `obstacle ${kind}`;
      ob.dataset.row = String(o.row);
      ob.dataset.col = String(o.col);
      ob.innerHTML = OBSTACLE_SVG[kind];
      this.pad.append(ob);
    }
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

  /** Brings truck elements in line with the game state. */
  sync(state: GameState, animate = true, exitedId?: string): void {
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
    el.innerHTML = `<div class="body"><div class="bed"><span class="sym">${SYMBOL[t.color]}</span></div><div class="cab"><span class="driver-arm"></span></div></div>`;
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

  // ---------- Bumps: jolt, NEAR MISS stamp, and a word from the driver ----------

  private bump(d: Drag, direction: 1 | -1): void {
    const body = d.el.querySelector<HTMLElement>('.body')!;
    body.style.setProperty('--jx', d.horizontal ? `${direction * 5}px` : '0px');
    body.style.setProperty('--jy', d.horizontal ? '0px' : `${direction * 5}px`);
    body.classList.remove('jolt');
    void body.offsetWidth; // restart the animation
    body.classList.add('jolt');
    this.stamp(d.el);
    this.speak(d.el);
  }

  /** Flashes the stamp on the half of the board away from the truck, so it doesn't cover the bubble. */
  private stamp(truckEl: HTMLElement): void {
    this.el.querySelector('.stamp')?.remove();
    const s = document.createElement('div');
    s.className = 'stamp';
    const board = this.el.getBoundingClientRect();
    const truck = truckEl.getBoundingClientRect();
    const truckInTopHalf = truck.top + truck.height / 2 - board.top < board.height / 2;
    s.style.top = truckInTopHalf ? '74%' : '26%';
    s.textContent = BUMP_STAMP;
    this.el.append(s);
    setTimeout(() => s.remove(), STAMP_MS);
  }

  private speak(truckEl: HTMLElement): void {
    if (BUMP_LINES.length === 0) return;
    let i = Math.floor(Math.random() * BUMP_LINES.length);
    if (BUMP_LINES.length > 1 && i === this.lastLine) i = (i + 1) % BUMP_LINES.length;
    this.lastLine = i;

    this.el.querySelector('.bubble')?.remove();
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = BUMP_LINES[i];
    this.el.append(b);

    // Point the bubble at the cab, above it (or below if the truck is on the top row).
    const board = this.el.getBoundingClientRect();
    const cab = (truckEl.querySelector('.cab') ?? truckEl).getBoundingClientRect();
    const cx = cab.left + cab.width / 2 - board.left;
    const below = cab.top - board.top < this.cell * 1.3;
    const maxW = Math.min(board.width - 16, 240);
    b.style.maxWidth = `${maxW}px`;
    const bw = b.offsetWidth;
    const left = Math.max(8, Math.min(board.width - bw - 8, cx - bw / 2));
    b.style.left = `${left}px`;
    b.style.setProperty('--tail', `${cx - left}px`);
    if (below) {
      b.classList.add('below');
      b.style.top = `${cab.bottom - board.top + 10}px`;
    } else {
      b.style.top = `${cab.top - board.top - b.offsetHeight - 10}px`;
    }
    setTimeout(() => b.remove(), BUBBLE_MS);
  }

  // ---------- Hints ----------

  /** Step 1: highlight the truck to move. */
  showHintTruck(id: string): void {
    this.clearHint();
    this.trucks.get(id)?.classList.add('hinted');
  }

  /** Step 2: show a ghost where that truck should end up (or an arrow out of its gate). */
  showHintTarget(move: Move, state: GameState, exits: boolean): void {
    const t = state.trucks.find((x) => x.id === move.id);
    if (!t) return;
    this.pad.querySelector('.ghost')?.remove();
    const target = t.orient === 'h' ? { ...t, col: t.col + move.delta } : { ...t, row: t.row + move.delta };
    const g = document.createElement('div');
    g.className = `ghost c-${t.color}${exits ? ' exit' : ''}`;
    g.dataset.cab = cabSide(this.level!, t);
    g.textContent = exits ? 'OUT' : '';
    this.pad.append(g);
    this.place(g, target);
  }

  clearHint(): void {
    this.pad.querySelector('.ghost')?.remove();
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
    el.setPointerCapture(e.pointerId);
    const horizontal = truck.orient === 'h';
    this.drag = { id, el, pointerId: e.pointerId, start: horizontal ? e.clientX : e.clientY, range, horizontal, offset: 0, pressing: false };
    el.classList.add('dragging');
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
    d.offset = Math.max(lo, Math.min(hi, raw));
    const truck = this.truckById(d.id);
    if (truck) this.place(d.el, truck, d.offset);

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
    if (delta !== 0) this.onMove(d.id, delta);
    else this.sync(this.getState());
  }

  private onPointerCancel(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.endDrag();
    this.sync(this.getState());
  }

  private endDrag(): void {
    this.drag?.el.classList.remove('dragging');
    this.drag = null;
  }
}
