// The dirt berm round the lease (ART_BIBLE section 3): a low mound of pushed-up soil with a rounded
// top and sloped sides, lit from the top left, with a gap at every gate. Drawn on a canvas from a
// height map, so it is one continuous shape that fits any board size and any level's gates, in each
// season's dress: brown dirt with grass tufts, wet dark mud, or snow. Purely a picture: the engine's
// walls are what block trucks, exactly as with the old fence.
import { SIZE, type Gate, type Side } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import type { Ground } from './themes.ts';

export interface BermGeometry {
  /** Cell and berm band sizes in px (the band is the old fence band). */
  cell: number;
  band: number;
  /** How far the outer slope runs past the board's edge, px. */
  over: number;
  gates: Pick<Gate, 'side' | 'index'>[];
  /** The pad's side in cells (6 unless it is a Big Pad). */
  size?: number;
}

/** How far the outer slope spills past the board, as a share of the band. */
export const BERM_OVER = 0.3;
/** Where across the berm its crest sits (0 = pad edge, 1 = outer foot). */
const CREST = 0.44;
/** The berm's ends slope down to the gate posts over this share of the band. */
const TAPER = 0.34;
/** Each gate's gap stops this far (share of the band) inside its cell, so two neighbouring gates
 * keep a small nub of berm between them and never read as one opening. */
export const GAP_INSET = 0.17;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Berm height (0..1, before lumps) at a point in pad coordinates (px; the pad is 0..cell*SIZE both
 * ways). Zero on the pad, beyond the outer foot, and in every gate's gap.
 */
export function bermHeight(g: BermGeometry, x: number, y: number): number {
  const pad = g.cell * (g.size ?? SIZE);
  const ox = x < 0 ? -x : x > pad ? x - pad : 0;
  const oy = y < 0 ? -y : y > pad ? y - pad : 0;
  const d = Math.hypot(ox, oy);
  const width = g.band + g.over;
  if (d <= 0 || d >= width) return 0;
  // A rounded mound across the band, crest a little to the pad side of the middle.
  const u = Math.pow(d / width, Math.log(0.5) / Math.log(CREST));
  let h = Math.pow(Math.sin(Math.PI * u), 0.8);
  // Gates: the berm slopes down to nothing at each side of the gap.
  const taper = g.band * TAPER;
  for (const gate of g.gates) {
    const on: Record<Side, boolean> = { top: y < 0, bottom: y > pad, left: x < 0, right: x > pad };
    if (!on[gate.side]) continue;
    const along = gate.side === 'top' || gate.side === 'bottom' ? x : y;
    const a = gate.index * g.cell + g.band * GAP_INSET;
    const b = (gate.index + 1) * g.cell - g.band * GAP_INSET;
    const out = along < a ? a - along : along > b ? along - b : 0;
    h *= smooth(0, taper, out);
    if (h === 0) return 0;
  }
  return h;
}

type RGB = [number, number, number];
interface Look {
  /** Soil (or snow) in shade and in light; pixels mix between them with the grain. */
  dark: RGB;
  light: RGB;
  /** Color of the shadowed side (multiplied in). */
  shade: RGB;
  /** Wet shine, 0 = dry. */
  gloss: number;
  /** Light on a surface facing away from the sun (ambient), and how much the sun adds. Snow keeps
   * its shaded side light and blue; dirt goes properly dark. */
  ambient: number;
  sun: number;
  /** Grass creeping up the outer slope (null = none), and how many tufts per band-length of berm. */
  turf: RGB | null;
  tufts: number;
  blades: string[];
  shadow: string;
}

export const BERM_LOOKS: Record<Ground, Look> = {
  // Cardium summer: dry brown dirt, plenty of grass on the outer slope.
  gravel: { dark: [118, 82, 50], light: [176, 132, 88], shade: [150, 120, 120], gloss: 0, ambient: 0.36, sun: 0.98, turf: [92, 128, 40], tufts: 2.2, blades: ['#4f8a1e', '#6fa82c', '#8dbf3a', '#3d6f18'], shadow: 'rgba(45, 25, 8, 0.45)' },
  // Montney spring: wet dark mud, a few new shoots.
  mud: { dark: [50, 33, 21], light: [104, 74, 50], shade: [140, 125, 135], gloss: 0.5, ambient: 0.36, sun: 0.98, turf: [78, 96, 34], tufts: 0.6, blades: ['#6f9a2a', '#8fb53a', '#55801f'], shadow: 'rgba(20, 10, 2, 0.5)' },
  // Duvernay winter: snow over the berm. Its shaded side is a soft blue-grey, never charcoal, and
  // its shadow on the pad is the same cool blue. Dry tan stalks poke through.
  snow: { dark: [224, 233, 246], light: [255, 255, 255], shade: [168, 190, 226], gloss: 0.1, ambient: 0.8, sun: 0.33, turf: null, tufts: 0.7, blades: ['#b99a5c', '#9c7f48', '#c8ad6c', '#8a6f3e'], shadow: 'rgba(70, 105, 160, 0.3)' },
};

/** Repeatable value noise in 0..1. */
function noise2(seed: number): (x: number, y: number) => number {
  const hash = (ix: number, iy: number) => {
    let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Light from the top left, fairly high (toward the light). */
const LIGHT = (() => {
  const v = [-0.52, -0.6, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

/**
 * Paints the berm. The canvas covers the board plus `g.over` on every side; `scale` is device px per
 * CSS px. `seed` keeps a level's lumps and tufts the same every time.
 */
export function paintBerm(canvas: HTMLCanvasElement, g: BermGeometry, ground: Ground, seed: number, scale: number): void {
  const look = BERM_LOOKS[ground];
  const edge = g.band + g.over; // pad origin sits this far into the canvas
  const css = g.cell * (g.size ?? SIZE) + edge * 2;
  const n = Math.max(1, Math.round(css * scale));
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const px = css / n; // CSS px per canvas px
  const noise = noise2(seed);
  const lump = g.band * 0.9;
  const clod = g.band * 0.3;
  const grain = Math.max(1.2, g.band * 0.07);

  // Height map (in px of rise), with lumps and clods so it reads as pushed-up dirt, not a pipe.
  const rise = g.band * 0.62;
  const H = new Float32Array(n * n);
  const base = new Float32Array(n * n);
  const pad = g.cell * (g.size ?? SIZE);
  for (let j = 0; j < n; j++) {
    const y = j * px - edge;
    const inRows = y > 0 && y < pad;
    for (let i = 0; i < n; i++) {
      const x = i * px - edge;
      if (inRows && x > 0 && x < pad) {
        i = Math.floor((pad + edge) / px); // skip across the pad
        continue;
      }
      let h = bermHeight(g, x, y);
      if (h <= 0) continue;
      // A ragged outer foot: the outer slope ends sooner in some places than others (slow noise
      // along the berm), so the outline is pushed-up dirt, not a smooth tube.
      const ox0 = x < 0 ? -x : x > pad ? x - pad : 0;
      const oy0 = y < 0 ? -y : y > pad ? y - pad : 0;
      const out = Math.hypot(ox0, oy0) / edge;
      const foot = 0.78 + 0.22 * noise(x / (g.band * 1.6) + 11, y / (g.band * 1.6) + 11) - 0.08 * noise(x / (g.band * 0.5) + 31, y / (g.band * 0.5) + 31);
      if (out > foot - 0.2) h *= 1 - smooth(foot - 0.2, foot, out);
      if (h <= 0) continue;
      const k = j * n + i;
      base[k] = h;
      const bumps = (noise(x / lump, y / lump) - 0.5) * 0.45 + (noise(x / clod + 40, y / clod + 40) - 0.5) * (ground === 'snow' ? 0.08 : 0.2) + (noise(x / grain + 90, y / grain + 90) - 0.5) * (ground === 'snow' ? 0.01 : 0.05);
      H[k] = rise * h * (1 + bumps * Math.min(1, h * 2.5));
    }
  }

  const img = ctx.createImageData(n, n);
  const out = img.data;
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      const h = base[k];
      if (h <= 0) continue;
      const x = i * px - edge;
      const y = j * px - edge;
      // Surface normal from the height map.
      const nx = -(H[k + 1] - H[k - 1]) / (2 * px);
      const ny = -(H[k + n] - H[k - n]) / (2 * px);
      const len = Math.hypot(nx, ny, 1);
      const lit = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / len;
      const diffuse = Math.max(0, lit);
      // Soil tone: fine grain plus slow patches.
      const tone = Math.max(0, Math.min(1, 0.5 + (noise(x / grain + 7, y / grain + 7) - 0.5) * 0.7 + (noise(x / lump + 20, y / lump + 20) - 0.5) * 0.5));
      let r = look.dark[0] + (look.light[0] - look.dark[0]) * tone;
      let gr = look.dark[1] + (look.light[1] - look.dark[1]) * tone;
      let b = look.dark[2] + (look.light[2] - look.dark[2]) * tone;
      // Grass creeps up the outer slope in ragged patches.
      const ox = x < 0 ? -x : x > pad ? x - pad : 0;
      const oy = y < 0 ? -y : y > pad ? y - pad : 0;
      const across = Math.hypot(ox, oy) / edge;
      if (look.turf) {
        const t = smooth(0.52, 0.95, across + (noise(x / clod + 60, y / clod + 60) - 0.5) * 0.45) * 0.85;
        r += (look.turf[0] - r) * t;
        gr += (look.turf[1] - gr) * t;
        b += (look.turf[2] - b) * t;
      }
      // Light: bright on the slope facing the sun, tinted shade on the far side, darker at the foot.
      // A brighter, harder highlight along the crest where it catches the sun.
      const crest = smooth(0.86, 0.97, h) * smooth(0.5, 0.75, diffuse) * 0.3;
      const bright = look.ambient + look.sun * diffuse + crest;
      const inShade = 1 - smooth(0.25, 0.75, diffuse);
      const foot = 0.82 + 0.18 * smooth(0, 0.35, h);
      const m = bright * foot;
      r *= m * (1 - inShade * (1 - look.shade[0] / 255) * 0.6);
      gr *= m * (1 - inShade * (1 - look.shade[1] / 255) * 0.6);
      b *= m * (1 - inShade * (1 - look.shade[2] / 255) * 0.6);
      if (look.gloss) {
        const spec = Math.pow(Math.max(0, lit), 28) * look.gloss * 150 * noise(x / grain + 3, y / grain + 3);
        r += spec;
        gr += spec;
        b += spec;
      }
      const o = k * 4;
      out[o] = r > 255 ? 255 : r;
      out[o + 1] = gr > 255 ? 255 : gr;
      out[o + 2] = b > 255 ? 255 : b;
      out[o + 3] = 255 * smooth(0, 0.16, h);
    }
  }

  // Composite with a soft shadow falling down-right (onto the pad from the top and left berms).
  const layer = document.createElement('canvas');
  layer.width = layer.height = n;
  const lctx = layer.getContext('2d')!;
  lctx.putImageData(img, 0, 0);
  tufts(lctx, g, look, seed, scale);
  ctx.clearRect(0, 0, n, n);
  // Two soft shadows under the berm: a wide faint one all round that bleeds onto the pad (the berm
  // sits IN the ground, no hard line where they meet), and the cast shadow falling down-right.
  ctx.shadowColor = look.shadow;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = g.band * 0.5 * scale;
  ctx.drawImage(layer, 0, 0);
  ctx.shadowOffsetX = g.band * 0.12 * scale;
  ctx.shadowOffsetY = g.band * 0.16 * scale;
  ctx.shadowBlur = g.band * 0.3 * scale;
  ctx.drawImage(layer, 0, 0);
  ctx.shadowColor = 'transparent';
}

/**
 * Grass on the outer slope (dry tan stalks in winter). Nothing is stamped at even steps: tufts come
 * in loose clumps with gaps between, each one of three shapes (a fan of blades, a few tall stalks
 * with seed heads, a low rosette), in its own size, leaning its own way, mostly away from the pad.
 */
function tufts(ctx: CanvasRenderingContext2D, g: BermGeometry, look: Look, seed: number, scale: number): void {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const pad = g.cell * (g.size ?? SIZE);
  const edge = g.band + g.over;
  const winter = look.turf === null;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(edge, edge);
  ctx.lineCap = 'round';
  const perimeter = pad * 4;
  // Walk round the pad: a clump of 1-4 tufts close together, then a gap of varying length.
  let at = rand() * g.band;
  const mean = g.band / look.tufts;
  while (at < perimeter) {
    const clump = 1 + Math.floor(rand() * rand() * 4);
    for (let c = 0; c < clump; c++) {
      const s = (at + (rand() - 0.5) * g.band * 0.5 + perimeter) % perimeter;
      const side = Math.floor(s / pad);
      const along = s % pad;
      const out = edge * (0.56 + rand() * 0.32);
      const x = side === 0 ? along : side === 1 ? pad + out : side === 2 ? pad - along : -out;
      const y = side === 0 ? -out : side === 1 ? along : side === 2 ? pad + out : pad - along;
      // Pointing away from the pad, give or take; winter stalks lean with the wind a little.
      const outward = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][side];
      const lean = outward + (rand() - 0.5) * 1.5;
      const size = g.band * (0.16 + rand() * rand() * 0.34);
      const kind = winter ? (rand() < 0.75 ? 'stalks' : 'fan') : rand() < 0.5 ? 'fan' : rand() < 0.6 ? 'rosette' : 'stalks';
      const picks = [rand(), rand(), rand(), rand(), rand(), rand(), rand(), rand()];
      at += g.band * (0.18 + rand() * 0.3);
      if (bermHeight(g, x, y) < 0.15) continue;
      drawTuft(ctx, x, y, lean, size, kind, look, picks, g.band);
    }
    at += mean * (0.3 + rand() * 2.2);
  }
  ctx.restore();
}

function drawTuft(ctx: CanvasRenderingContext2D, x: number, y: number, lean: number, size: number, kind: string, look: Look, picks: number[], band: number): void {
  const color = (i: number) => look.blades[Math.floor(picks[i % picks.length] * look.blades.length) % look.blades.length];
  const dir = (a: number, len: number): [number, number] => [x + Math.cos(a) * len, y + Math.sin(a) * len];
  // A soft seat where it meets the ground.
  ctx.fillStyle = look.turf === null ? 'rgba(90, 120, 170, 0.22)' : 'rgba(20, 14, 4, 0.26)';
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.4, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  const blade = (a: number, len: number, width: number, bend: number, i: number, head = false) => {
    const [ex, ey] = dir(a, len);
    const [cx, cy] = dir(a + bend, len * 0.55);
    ctx.strokeStyle = color(i);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    if (head) {
      ctx.fillStyle = color(i + 1);
      ctx.beginPath();
      ctx.ellipse(ex, ey, width * 1.25, width * 0.75, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const w = Math.max(0.9, band * 0.05);
  if (kind === 'fan') {
    const n = 3 + Math.floor(picks[0] * 4);
    for (let i = 0; i < n; i++) blade(lean + (i / (n - 1) - 0.5) * (0.9 + picks[1] * 0.9), size * (0.75 + picks[(i + 2) % 8] * 0.6), w, (picks[(i + 3) % 8] - 0.5) * 0.5, i);
  } else if (kind === 'stalks') {
    const n = 2 + Math.floor(picks[0] * 3);
    for (let i = 0; i < n; i++) blade(lean + (i / Math.max(1, n - 1) - 0.5) * 0.5 + (picks[(i + 1) % 8] - 0.5) * 0.25, size * (1.25 + picks[(i + 2) % 8] * 0.9), w * 0.8, (picks[(i + 4) % 8] - 0.5) * 0.7, i, true);
  } else {
    const n = 5 + Math.floor(picks[0] * 4);
    for (let i = 0; i < n; i++) blade(lean + (i / n - 0.5) * Math.PI * 1.5, size * (0.4 + picks[(i + 2) % 8] * 0.35), w * 1.1, 0.2, i);
  }
}
