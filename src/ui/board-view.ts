import { SIZE, cabSide, getMoveRange, type GameState, type Level, type MoveRange, type Side, type Truck } from '../engine/index.ts';
import { SYMBOL } from './palette.ts';

const FENCE_RATIO = 0.42;
const GAP = 3; // px between a truck and its cell edge
const EXIT_MS = 380;

interface Drag {
  id: string;
  el: HTMLElement;
  pointerId: number;
  start: number;
  range: MoveRange;
  horizontal: boolean;
  offset: number;
}

/** Renders the pad, gates and trucks, and turns drags into (truckId, delta) move requests. */
export class BoardView {
  readonly el: HTMLElement;
  private pad: HTMLElement;
  private level: Level | null = null;
  private trucks = new Map<string, HTMLElement>();
  private cell = 48;
  private fence = 20;
  private drag: Drag | null = null;
  private getState: () => GameState;
  private onMove: (id: string, delta: number) => void;

  constructor(getState: () => GameState, onMove: (id: string, delta: number) => void) {
    this.getState = getState;
    this.onMove = onMove;
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.pad = document.createElement('div');
    this.pad.className = 'pad';
    this.el.append(this.pad);
  }

  setLevel(level: Level): void {
    this.level = level;
    this.drag = null;
    this.el.querySelectorAll('.gate').forEach((g) => g.remove());
    this.trucks.forEach((t) => t.remove());
    this.trucks.clear();
    for (const gate of level.gates) {
      const g = document.createElement('div');
      g.className = `gate c-${gate.color}`;
      g.dataset.side = gate.side;
      g.dataset.index = String(gate.index);
      g.textContent = SYMBOL[gate.color];
      this.el.append(g);
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
    const state = this.level ? this.getState() : null;
    if (state) this.sync(state, false);
  }

  /** Brings truck elements in line with the game state. */
  sync(state: GameState, animate = true, exitedId?: string): void {
    const alive = new Set(state.trucks.map((t) => t.id));
    for (const [id, el] of this.trucks) {
      if (alive.has(id)) continue;
      this.trucks.delete(id);
      if (id === exitedId) this.animateExit(el);
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
    el.innerHTML = `<div class="bed"><span class="sym">${SYMBOL[t.color]}</span></div><div class="cab"></div>`;
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e, t.id, el));
    el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    el.addEventListener('pointerup', (e) => this.onPointerUp(e));
    el.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
    return el;
  }

  private place(el: HTMLElement, t: Truck, offset = 0): void {
    const { cell } = this;
    const w = (t.orient === 'h' ? t.length : 1) * cell - GAP * 2;
    const h = (t.orient === 'v' ? t.length : 1) * cell - GAP * 2;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const x = t.col * cell + GAP + (t.orient === 'h' ? offset : 0);
    const y = t.row * cell + GAP + (t.orient === 'v' ? offset : 0);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  private animateExit(el: HTMLElement): void {
    const side = el.dataset.cab as Side;
    const dist = this.cell * (SIZE + 1);
    const dx = side === 'left' ? -dist : side === 'right' ? dist : 0;
    const dy = side === 'top' ? -dist : side === 'bottom' ? dist : 0;
    el.classList.add('exiting');
    el.style.transitionDuration = `${EXIT_MS}ms`;
    // The truck sits flush at its gate already; drive it the rest of the way out.
    const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
    const x = m ? Number(m[1]) : 0;
    const y = m ? Number(m[2]) : 0;
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(${x + dx}px, ${y + dy}px, 0)`;
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), EXIT_MS + 50);
  }

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
    this.drag = { id, el, pointerId: e.pointerId, start: horizontal ? e.clientX : e.clientY, range, horizontal, offset: 0 };
    el.classList.add('dragging');
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const raw = (d.horizontal ? e.clientX : e.clientY) - d.start;
    // Axis lock: only the truck's own axis counts. Allow a little overshoot toward an open gate.
    const lo = d.range.min * this.cell - (d.range.exitDelta === d.range.min && d.range.min < 0 ? this.cell * 0.6 : 0);
    const hi = d.range.max * this.cell + (d.range.exitDelta === d.range.max && d.range.max > 0 ? this.cell * 0.6 : 0);
    d.offset = Math.max(lo, Math.min(hi, raw));
    const truck = this.truckById(d.id);
    if (truck) this.place(d.el, truck, d.offset);
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
