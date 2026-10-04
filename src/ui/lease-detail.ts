// Variety on the lease's ground, generated in code and seeded by level id: every level looks a
// little different, and a level always looks the same. Over the season's one continuous base image
// (themes.ts) go large soft light and dark patches, plus the season's own detail: scattered pebbles
// on gravel, a few shallow puddles on mud, gentle wind drifts on snow. All of it is flat, soft and
// low in contrast: ground, never something sitting in a cell. Tire tracks draw on top (tracks.ts).
import { SIZE, type Level } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import type { Ground } from './themes.ts';

/** Everything is placed in cells: the pad is 0..SIZE both ways; the berm band lies just outside. */
export interface Patch {
  x: number;
  y: number;
  /** Half-lengths and turn (radians). */
  rx: number;
  ry: number;
  rot: number;
  /** -1..1: darker or lighter than the ground, and how much. */
  tone: number;
}
export interface Pebble {
  x: number;
  y: number;
  /** Half-lengths in cells, turn, and a shade 0..1 from the pebble palette. */
  rx: number;
  ry: number;
  rot: number;
  shade: number;
}
export interface Puddle {
  x: number;
  y: number;
  /** Overlapping lobes that make one irregular pool (offsets and radii in cells). */
  lobes: { dx: number; dy: number; rx: number; ry: number; rot: number }[];
}
export interface Detail {
  ground: Ground;
  patches: Patch[];
  pebbles: Pebble[];
  puddles: Puddle[];
  /** Snow drifts: long soft streaks, all lying with the wind. */
  drifts: Patch[];
}

/** How far a puddle may reach from its centre, in cells (it stays inside its own cell block). */
export const PUDDLE_REACH = 0.62;

/** Cells a puddle must keep off: the cell in front of every gate, and every obstacle. */
export function keepDry(level: Pick<Level, 'gates' | 'obstacles'>): Set<string> {
  const dry = new Set<string>();
  for (const g of level.gates) {
    const last = SIZE - 1;
    dry.add(g.side === 'top' ? `0,${g.index}` : g.side === 'bottom' ? `${last},${g.index}` : g.side === 'left' ? `${g.index},0` : `${g.index},${last}`);
  }
  for (const o of level.obstacles) dry.add(`${o.row},${o.col}`);
  return dry;
}

/** The cells a puddle centred at (x, y) can touch. */
export function puddleCells(x: number, y: number): string[] {
  const cells: string[] = [];
  for (let r = Math.floor(y - PUDDLE_REACH); r <= Math.floor(y + PUDDLE_REACH); r++)
    for (let c = Math.floor(x - PUDDLE_REACH); c <= Math.floor(x + PUDDLE_REACH); c++) if (r >= 0 && c >= 0 && r < SIZE && c < SIZE) cells.push(`${r},${c}`);
  return cells;
}

/** What goes on a level's ground. Pure: the same level and ground always give the same detail. */
export function planDetail(level: Pick<Level, 'gates' | 'obstacles'>, ground: Ground, seed: number): Detail {
  const rng = mulberry32(seed ^ 0x51ed270b);
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const detail: Detail = { ground, patches: [], pebbles: [], puddles: [], drifts: [] };

  // Large soft patches, lighter and darker, over the pad and out under the berm.
  const patches = 9 + Math.floor(rng() * 4);
  for (let i = 0; i < patches; i++) {
    const rx = between(0.9, 2.3);
    detail.patches.push({ x: between(-0.5, SIZE + 0.5), y: between(-0.5, SIZE + 0.5), rx, ry: rx * between(0.45, 0.9), rot: between(0, Math.PI), tone: (i % 2 ? 1 : -1) * between(0.45, 1) });
  }

  if (ground === 'gravel') {
    // Pebbles: loose scatters round a few spots, plus strays.
    const spots = Array.from({ length: 7 }, () => ({ x: between(0, SIZE), y: between(0, SIZE) }));
    const count = 70 + Math.floor(rng() * 30);
    for (let i = 0; i < count; i++) {
      const near = rng() < 0.6 ? spots[Math.floor(rng() * spots.length)] : null;
      const x = near ? near.x + (rng() - 0.5) * 1.3 : between(0, SIZE);
      const y = near ? near.y + (rng() - 0.5) * 1.3 : between(0, SIZE);
      const rx = between(0.018, 0.05);
      detail.pebbles.push({ x, y, rx, ry: rx * between(0.6, 0.95), rot: between(0, Math.PI), shade: rng() });
    }
  }

  if (ground === 'mud') {
    // A few shallow puddles, never where a gate opens or an obstacle stands, and well apart.
    const dry = keepDry(level);
    const want = 2 + Math.floor(rng() * 3);
    for (let tries = 0; detail.puddles.length < want && tries < 120; tries++) {
      const x = between(PUDDLE_REACH, SIZE - PUDDLE_REACH);
      const y = between(PUDDLE_REACH, SIZE - PUDDLE_REACH);
      const lobes = Array.from({ length: 3 + Math.floor(rng() * 3) }, (_, i) => {
        const rx = between(0.2, 0.36);
        const far = i === 0 ? 0 : between(0.08, PUDDLE_REACH - rx - 0.02);
        const at = between(0, Math.PI * 2);
        return { dx: Math.cos(at) * far, dy: Math.sin(at) * far * 0.7, rx, ry: rx * between(0.55, 0.85), rot: between(-0.5, 0.5) };
      });
      if (puddleCells(x, y).some((c) => dry.has(c))) continue;
      if (detail.puddles.some((p) => Math.hypot(p.x - x, p.y - y) < 2.2)) continue;
      detail.puddles.push({ x, y, lobes });
    }
  }

  if (ground === 'snow') {
    // Wind drifts: one wind direction per level, a little wobble per drift.
    const wind = between(-0.5, 0.5);
    const count = 9 + Math.floor(rng() * 5);
    for (let i = 0; i < count; i++) {
      const rx = between(0.8, 1.9);
      detail.drifts.push({ x: between(-0.3, SIZE + 0.3), y: between(-0.3, SIZE + 0.3), rx, ry: rx * between(0.1, 0.18), rot: wind + between(-0.12, 0.12), tone: between(0.6, 1) });
    }
  }
  return detail;
}

interface Tint {
  light: string;
  dark: string;
  /** Strongest patch opacity. */
  amount: number;
}
const TINTS: Record<Ground, Tint> = {
  gravel: { light: '255, 240, 214', dark: '84, 60, 36', amount: 0.17 },
  mud: { light: '150, 112, 80', dark: '22, 12, 5', amount: 0.24 },
  snow: { light: '255, 255, 255', dark: '120, 150, 200', amount: 0.2 },
};
const PEBBLES = ['#8f8375', '#a59a8b', '#c9bba6', '#6f665d', '#b4a48d', '#dccfb9'];

/** A soft-edged ellipse: full strength in the middle, fading to nothing at the rim. */
function softEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, rgb: string, alpha: number, core = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  if (core > 0) g.addColorStop(core, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Paints a level's ground detail. The canvas covers the whole board (pad plus the berm band on every
 * side); `cell` and `band` are in CSS px and `scale` is device px per CSS px.
 */
export function paintDetail(canvas: HTMLCanvasElement, detail: Detail, cell: number, band: number, scale: number): void {
  const css = cell * SIZE + band * 2;
  canvas.width = canvas.height = Math.max(1, Math.round(css * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, css, css);
  ctx.translate(band, band);
  const tint = TINTS[detail.ground];

  for (const p of detail.patches) softEllipse(ctx, p.x * cell, p.y * cell, p.rx * cell, p.ry * cell, p.rot, p.tone > 0 ? tint.light : tint.dark, Math.abs(p.tone) * tint.amount);

  for (const d of detail.drifts) {
    // A drift: a soft white ridge with its blue shade lying on the lee side.
    const nx = -Math.sin(d.rot) * d.ry * cell * 0.9;
    const ny = Math.cos(d.rot) * d.ry * cell * 0.9;
    softEllipse(ctx, d.x * cell + nx, d.y * cell + ny, d.rx * cell, d.ry * cell, d.rot, '112, 144, 196', 0.2 * d.tone);
    softEllipse(ctx, d.x * cell, d.y * cell, d.rx * cell, d.ry * cell, d.rot, '255, 255, 255', 0.7 * d.tone);
  }

  // Puddles: each pool is drawn whole and flat on its own layer, then laid down faintly, so the
  // lobes merge into one shape with no rim, glint or shadow.
  if (detail.puddles.length) {
    const layer = document.createElement('canvas');
    layer.width = layer.height = canvas.width;
    const l = layer.getContext('2d')!;
    l.setTransform(scale, 0, 0, scale, 0, 0);
    l.translate(band, band);
    for (const p of detail.puddles)
      for (const lobe of p.lobes) softEllipse(l, (p.x + lobe.dx) * cell, (p.y + lobe.dy) * cell, lobe.rx * cell, lobe.ry * cell, lobe.rot, '0, 0, 0', 1, 0.72);
    // Keep the shape, set the color: muddy water, a little lighter and greyer than the mud.
    l.globalCompositeOperation = 'source-in';
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.fillStyle = 'rgb(140, 116, 96)';
    l.fillRect(0, 0, layer.width, layer.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  for (const s of detail.pebbles) {
    const x = s.x * cell;
    const y = s.y * cell;
    const rx = Math.max(0.9, s.rx * cell);
    const ry = Math.max(0.7, s.ry * cell);
    ctx.fillStyle = 'rgba(50, 34, 18, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, s.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PEBBLES[Math.floor(s.shade * PEBBLES.length) % PEBBLES.length];
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, s.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 250, 238, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, s.rot, 0, Math.PI * 2);
    ctx.fill();
  }
}
