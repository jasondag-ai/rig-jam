// The lease's ground, drawn in code in the board's toy look and seeded by level id: every level
// looks different, and a level always looks the same. Over the season's flat pad colour (themes.ts)
// go large soft colour fields, then a few deliberate marks: a worn lane leading in from a gate, a
// stain beside equipment, and the season's own detail (scattered pebbles on gravel, a few shallow
// puddles on mud, gentle wind drifts on snow). No photo texture, no grain, no hard value step: all
// of it is flat, soft and low in contrast, ground and never something sitting in a cell. Tire
// tracks draw on top (tracks.ts).
import { SIZE, sizeOf, type Level } from '../engine/index.ts';
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
  /** Worn lanes: long soft bands where trucks have driven in from a gate, straight along a row or column. */
  lanes: Patch[];
  /** Stains on the ground beside equipment (a soft dark patch, off to one side of its cell). */
  stains: Patch[];
  /** Seeds the fine texture (gravel specks and stones, mud specks, clods and streaks), drawn at paint time. */
  seed: number;
  /** The pad's side in cells (6; 8 on a Big Pad). Missing means 6. */
  size?: number;
}

/** How far a puddle may reach from its centre, in cells (it stays inside its own cell block). */
export const PUDDLE_REACH = 0.62;

/** Cells a puddle must keep off: the cell in front of every gate, and every obstacle. */
export function keepDry(level: Pick<Level, 'gates' | 'obstacles' | 'size'>): Set<string> {
  const SIZE = sizeOf(level);
  const dry = new Set<string>();
  for (const g of level.gates) {
    const last = SIZE - 1;
    dry.add(g.side === 'top' ? `0,${g.index}` : g.side === 'bottom' ? `${last},${g.index}` : g.side === 'left' ? `${g.index},0` : `${g.index},${last}`);
  }
  for (const o of level.obstacles) dry.add(`${o.row},${o.col}`);
  return dry;
}

/** The cells a puddle centred at (x, y) can touch. */
export function puddleCells(x: number, y: number, SIZE = 6): string[] {
  const cells: string[] = [];
  for (let r = Math.floor(y - PUDDLE_REACH); r <= Math.floor(y + PUDDLE_REACH); r++)
    for (let c = Math.floor(x - PUDDLE_REACH); c <= Math.floor(x + PUDDLE_REACH); c++) if (r >= 0 && c >= 0 && r < SIZE && c < SIZE) cells.push(`${r},${c}`);
  return cells;
}

/** What goes on a level's ground. Pure: the same level and ground always give the same detail. */
export function planDetail(level: Pick<Level, 'gates' | 'obstacles' | 'size'>, ground: Ground, seed: number): Detail {
  const SIZE = sizeOf(level);
  const rng = mulberry32(seed ^ 0x51ed270b);
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const detail: Detail = { ground, patches: [], pebbles: [], puddles: [], drifts: [], lanes: [], stains: [], seed, ...(SIZE === 6 ? {} : { size: SIZE }) };

  // Large soft colour fields, lighter and darker, over the pad and out under the berm.
  const patches = 9 + Math.floor(rng() * 4);
  for (let i = 0; i < patches; i++) {
    const rx = between(1.2, 2.8);
    detail.patches.push({ x: between(-0.5, SIZE + 0.5), y: between(-0.5, SIZE + 0.5), rx, ry: rx * between(0.45, 0.9), rot: between(0, Math.PI), tone: (i % 2 ? 1 : -1) * between(0.45, 1) });
  }

  // Worn lanes: one or two gates (picked by the seed) have a packed-down band running in from them.
  const gates = [...level.gates];
  const lanes = Math.min(gates.length, 1 + Math.floor(rng() * 2));
  for (let i = 0; i < lanes; i++) {
    const g = gates.splice(Math.floor(rng() * gates.length), 1)[0];
    const across = g.index + 0.5 + between(-0.06, 0.06);
    const len = between(2.2, 4.2);
    const upright = g.side === 'top' || g.side === 'bottom';
    const from = g.side === 'top' || g.side === 'left' ? -0.4 : SIZE + 0.4;
    const mid = from + (g.side === 'top' || g.side === 'left' ? len / 2 : -len / 2);
    detail.lanes.push({ x: upright ? across : mid, y: upright ? mid : across, rx: len / 2, ry: between(0.26, 0.36), rot: upright ? Math.PI / 2 : 0, tone: between(0.6, 1) });
  }

  // A stain beside each piece of equipment (two at most): leaked or tracked off to one side.
  for (const o of level.obstacles.slice(0, 2)) {
    const at = between(0, Math.PI * 2);
    const rx = between(0.45, 0.7);
    detail.stains.push({ x: o.col + 0.5 + Math.cos(at) * 0.35, y: o.row + 0.5 + Math.sin(at) * 0.35, rx, ry: rx * between(0.6, 0.85), rot: between(0, Math.PI), tone: between(0.6, 1) });
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
      if (puddleCells(x, y, SIZE).some((c) => dry.has(c))) continue;
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
  gravel: { light: '236, 218, 190', dark: '132, 108, 82', amount: 0.42 },
  mud: { light: '128, 96, 70', dark: '48, 31, 20', amount: 0.5 },
  snow: { light: '255, 255, 255', dark: '176, 198, 232', amount: 0.42 },
};
/** Worn lanes (packed ground) and equipment stains, per ground: colour and strongest opacity. */
const LANES: Record<Ground, [string, number]> = { gravel: ['214, 200, 178', 0.5], mud: ['58, 38, 24', 0.5], snow: ['192, 208, 234', 0.42] };
const STAINS: Record<Ground, [string, number]> = { gravel: ['74, 58, 44', 0.24], mud: ['30, 18, 10', 0.36], snow: ['150, 168, 196', 0.3] };
const PEBBLES = ['#8f8375', '#a59a8b', '#c9bba6', '#6f665d', '#b4a48d', '#dccfb9'];

/**
 * Fine texture, drawn straight onto the canvas at device resolution (so it is crisp on any phone,
 * unlike a stretched image) and scattered by the level's seed (so nothing repeats). Kept low in
 * contrast and close to the pad's own colour: it reads as ground at arm's length, and trucks and
 * tire tracks still stand out. Snow has none.
 */
export const GRAIN: Record<Ground, { perCell: number; tones: string[]; alpha: [number, number]; size: [number, number] } | null> = {
  // Gravel: grey, tan, rust and near-white specks, mixed sizes.
  gravel: { perCell: 520, tones: ['#8a8378', '#a8977c', '#cdbb9d', '#9a6a48', '#efe6d6', '#74695c', '#d9c8ab'], alpha: [0.28, 0.6], size: [0.012, 0.034] },
  // Mud: dense small specks in three mud tones.
  mud: { perCell: 420, tones: ['#3a2618', '#6f5038', '#8a684a', '#2c1b10'], alpha: [0.22, 0.5], size: [0.012, 0.03] },
  snow: null,
};
/** Larger pieces per cell: stones on gravel, clods on mud, each with a tiny highlight and shadow. */
export const LUMPS: Record<Ground, { perCell: number; tones: string[]; size: [number, number] } | null> = {
  gravel: { perCell: 7, tones: ['#9a9186', '#b9a98f', '#7d7266', '#d8cab2', '#a5774f'], size: [0.03, 0.062] },
  mud: { perCell: 9, tones: ['#4a3222', '#6a4c34', '#3a2516'], size: [0.026, 0.055] },
  snow: null,
};

function paintGrain(ctx: CanvasRenderingContext2D, detail: Detail, cell: number, band: number): void {
  const grain = GRAIN[detail.ground];
  const lumps = LUMPS[detail.ground];
  if (!grain || !lumps) return;
  const rng = mulberry32(detail.seed ^ 0x7e57a11);
  const lo = -band;
  const span = cell * (detail.size ?? SIZE) + band * 2;
  const cells = (span / cell) ** 2;

  // Mud: a few faint wet streaks first, under the specks.
  if (detail.ground === 'mud') {
    const lean = (rng() - 0.5) * 0.5;
    for (let i = 0; i < 14; i++) softEllipse(ctx, lo + rng() * span, lo + rng() * span, cell * (0.5 + rng() * 0.9), cell * (0.035 + rng() * 0.03), lean + (rng() - 0.5) * 0.2, i % 3 ? '150, 120, 96' : '24, 14, 8', 0.1 + rng() * 0.08);
  }

  // Specks: small flat flecks, some round and some angular.
  const count = Math.round(cells * grain.perCell);
  for (let i = 0; i < count; i++) {
    const x = lo + rng() * span;
    const y = lo + rng() * span;
    const r = cell * (grain.size[0] + rng() * rng() * (grain.size[1] - grain.size[0]));
    ctx.globalAlpha = grain.alpha[0] + rng() * (grain.alpha[1] - grain.alpha[0]);
    ctx.fillStyle = grain.tones[Math.floor(rng() * grain.tones.length)];
    if (rng() < 0.5) ctx.fillRect(x - r, y - r * 0.8, r * 2, r * 1.6);
    else {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Lumps: a soft shadow down-right, the piece, a small highlight up-left.
  const big = Math.round(cells * lumps.perCell);
  for (let i = 0; i < big; i++) {
    const x = lo + rng() * span;
    const y = lo + rng() * span;
    const rx = cell * (lumps.size[0] + rng() * rng() * (lumps.size[1] - lumps.size[0]));
    const ry = rx * (0.62 + rng() * 0.3);
    const rot = rng() * Math.PI;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#1e140a';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = lumps.tones[Math.floor(rng() * lumps.tones.length)];
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = detail.ground === 'mud' ? 0.3 : 0.45;
    ctx.fillStyle = '#fff6e6';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.28, y - ry * 0.3, rx * 0.45, ry * 0.36, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

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
  const css = cell * (detail.size ?? SIZE) + band * 2;
  canvas.width = canvas.height = Math.max(1, Math.round(css * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, css, css);
  ctx.translate(band, band);
  const tint = TINTS[detail.ground];

  for (const p of detail.patches) softEllipse(ctx, p.x * cell, p.y * cell, p.rx * cell, p.ry * cell, p.rot, p.tone > 0 ? tint.light : tint.dark, Math.abs(p.tone) * tint.amount);

  paintGrain(ctx, detail, cell, band);

  const [laneRgb, laneAmount] = LANES[detail.ground];
  for (const l of detail.lanes) softEllipse(ctx, l.x * cell, l.y * cell, l.rx * cell, l.ry * cell, l.rot, laneRgb, l.tone * laneAmount, 0.35);
  const [stainRgb, stainAmount] = STAINS[detail.ground];
  for (const t of detail.stains) softEllipse(ctx, t.x * cell, t.y * cell, t.rx * cell, t.ry * cell, t.rot, stainRgb, t.tone * stainAmount);

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
