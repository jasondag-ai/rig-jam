// Border scenery: spruce and aspen trees standing on the ground around the fenced pad.
// Colors come from the theme's --tree-* variables, so the same trees work in every season.
import { mulberry32 } from '../engine/rng.ts';
import type { Theme } from './themes.ts';

type Rng = () => number;
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Tree {
  x: number; // base center
  y: number; // base (ground line)
  h: number; // height
  spruce: boolean;
}

/** A three-tier spruce with a shaded right side and (in winter) snow on each tier. */
function spruce({ x, y, h }: Tree): string {
  const w = h * 0.56;
  const trunkH = h * 0.12;
  let tiers = '';
  let shade = '';
  let frost = '';
  const tops = [0.0, 0.26, 0.5];
  const bottoms = [0.42, 0.68, 0.9];
  const widths = [0.5, 0.78, 1];
  for (let i = 0; i < 3; i++) {
    const top = y - trunkH - h * (1 - tops[i]) + trunkH;
    const bot = y - trunkH - h * (1 - bottoms[i]) + trunkH;
    const half = (w * widths[i]) / 2;
    const sag = h * 0.04;
    tiers += `<path class="tr-spruce" d="M${r1(x)} ${r1(top)} L${r1(x + half)} ${r1(bot)} Q${r1(x)} ${r1(bot + sag)} ${r1(x - half)} ${r1(bot)} Z"/>`;
    shade += `<path class="tr-spruce-dark" d="M${r1(x)} ${r1(top + 2)} L${r1(x + half - 2)} ${r1(bot - 1)} Q${r1(x + half * 0.4)} ${r1(bot + sag * 0.6)} ${r1(x + 1)} ${r1(bot + sag * 0.6)} Z"/>`;
    frost += `<path class="tr-frost" d="M${r1(x)} ${r1(top)} L${r1(x + half * 0.55)} ${r1(top + (bot - top) * 0.55)} Q${r1(x)} ${r1(top + (bot - top) * 0.4)} ${r1(x - half * 0.55)} ${r1(top + (bot - top) * 0.55)} Z"/>`;
  }
  const trunk = `<rect class="tr-trunk" x="${r1(x - h * 0.05)}" y="${r1(y - trunkH - 2)}" width="${r1(h * 0.1)}" height="${r1(trunkH + 2)}" rx="1.5"/>`;
  return `<g>${trunk}${tiers}${shade}${frost}</g>`;
}

/** A white-barked aspen with a lumpy rounded canopy. */
function aspen({ x, y, h }: Tree, rng: Rng): string {
  const cr = h * 0.27;
  const cy = y - h + cr * 1.05;
  const trunk =
    `<rect class="tr-bark" x="${r1(x - h * 0.045)}" y="${r1(cy)}" width="${r1(h * 0.09)}" height="${r1(y - cy)}" rx="2"/>` +
    `<path class="tr-bark-mark" d="M${r1(x - h * 0.045)} ${r1(y - h * 0.22)} h${r1(h * 0.05)} M${r1(x)} ${r1(y - h * 0.32)} h${r1(h * 0.045)}"/>`;
  const blobs = [
    [0, 0, 1],
    [-0.62, 0.32, 0.72],
    [0.62, 0.3, 0.74],
    [0, 0.5, 0.78],
  ]
    .map(([dx, dy, s]) => `<circle class="tr-aspen" cx="${r1(x + dx * cr + (rng() - 0.5) * 3)}" cy="${r1(cy + dy * cr)}" r="${r1(cr * s)}"/>`)
    .join('');
  const shade = `<path class="tr-aspen-dark" d="M${r1(x + cr * 1.2)} ${r1(cy + cr * 0.3)} A${r1(cr * 1.2)} ${r1(cr * 0.9)} 0 0 1 ${r1(x - cr * 0.6)} ${r1(cy + cr * 1.15)} Q${r1(x + cr * 0.7)} ${r1(cy + cr * 0.9)} ${r1(x + cr * 1.2)} ${r1(cy + cr * 0.3)} Z"/>`;
  const frost = `<ellipse class="tr-frost" cx="${r1(x - cr * 0.15)}" cy="${r1(cy - cr * 0.55)}" rx="${r1(cr * 0.6)}" ry="${r1(cr * 0.28)}"/>`;
  return `<g>${trunk}${blobs}${shade}${frost}</g>`;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Trees around a box (the board, or the level list), in a layer `width` x `height` px.
 * Rows stand along the top edge, peek out at the sides, and fill the space below if there is room.
 */
export function sceneryHtml(theme: Theme, width: number, height: number, box: Box, below = true, maxTree = 96): string {
  const rng = mulberry32(theme.id.length * 7919 + 13);
  const trees: Tree[] = [];
  const isSpruce = () => rng() < theme.spruceShare;
  const top = box.y;
  const bandAbove = Math.max(0, top);

  // Back row (smaller, further away) and front row along the top edge, bases tucked behind the fence.
  const backH = Math.min(maxTree * 0.73, Math.max(28, bandAbove * 0.6));
  for (let x = -10; x < width + 20; x += backH * 0.45 + rng() * 10) {
    trees.push({ x, y: top + 4, h: backH * (0.75 + rng() * 0.35), spruce: isSpruce() });
  }
  const frontH = Math.min(maxTree, Math.max(34, bandAbove * 0.85));
  for (let x = rng() * 20; x < width + 20; x += frontH * 0.6 + rng() * 22) {
    trees.push({ x, y: top + 10 + rng() * 6, h: frontH * (0.8 + rng() * 0.35), spruce: isSpruce() });
  }
  // Sides: trees peeking out from behind the fence.
  for (let y = top + 50; y < box.y + box.height; y += 55 + rng() * 30) {
    const h = 44 + rng() * 22;
    trees.push({ x: box.x - 6 + rng() * 4, y, h, spruce: isSpruce() });
    trees.push({ x: box.x + box.width + 6 - rng() * 4, y: y + 20, h, spruce: isSpruce() });
  }
  // Below the board, sized to the gap so they never cover the buttons.
  const bandBelow = height - (box.y + box.height);
  if (below && bandBelow > 26) {
    const h = Math.min(70, bandBelow * 0.9);
    for (let x = rng() * 30; x < width + 20; x += h * 0.75 + rng() * 26) {
      trees.push({ x, y: box.y + box.height + h * 0.85 + rng() * 4, h: h * (0.7 + rng() * 0.3), spruce: isSpruce() });
    }
  }

  trees.sort((a, b) => a.y - b.y); // nearer trees (lower on screen) draw on top
  const body = trees.map((t) => (t.spruce ? spruce(t) : aspen(t, rng))).join('');
  return `<svg class="trees" width="${width}" height="${height}" viewBox="0 0 ${r1(width)} ${r1(height)}" aria-hidden="true">${body}</svg>`;
}
