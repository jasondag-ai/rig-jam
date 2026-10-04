// Border scenery: illustrated spruce, aspen and willow (public/sprites/world, from the art inbox)
// standing in scattered groves on the ground around the bermed pad, season-matched, with the odd
// cattail clump and a blank lease sign as accents. Seeded (per level in the game), so a level always
// looks the same.
import { mulberry32 } from '../engine/rng.ts';
import type { Theme } from './themes.ts';

type Rng = () => number;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Sprite name and its width / height (trimmed art). */
const ART = {
  tree_spruce_summer: 251 / 466,
  tree_spruce_winter: 274 / 471,
  tree_aspen_summer: 357 / 491,
  tree_aspen_spring: 288 / 492,
  bush_willow: 485 / 427,
  cattails: 334 / 481,
  lease_sign_blank: 322 / 465,
} as const;
export type WorldArt = keyof typeof ART;

/** Which sprites a season uses: winter is all snowy spruce; spring has the young aspen. */
export function seasonArt(id: string): { spruce: WorldArt; aspen: WorldArt | null; bush: WorldArt | null; accents: WorldArt[] } {
  if (id === 'winter') return { spruce: 'tree_spruce_winter', aspen: null, bush: null, accents: ['lease_sign_blank'] };
  if (id === 'spring') return { spruce: 'tree_spruce_summer', aspen: 'tree_aspen_spring', bush: 'bush_willow', accents: ['cattails', 'lease_sign_blank'] };
  return { spruce: 'tree_spruce_summer', aspen: 'tree_aspen_summer', bush: 'bush_willow', accents: ['cattails', 'lease_sign_blank'] };
}

interface Item {
  x: number; // base centre
  y: number; // ground line
  h: number;
  art: WorldArt;
  flip: boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const src = (art: WorldArt) => `./sprites/world/${art}.webp`;
const img = ({ x, y, h, art, flip }: Item) => {
  const w = h * ART[art];
  return (
    `<img class="sc ${art}" alt="" draggable="false" decoding="async" src="${src(art)}" srcset="${src(art)} 1x, ./sprites/world/${art}@2x.webp 2x"` +
    ` style="left:${r1(x - w / 2)}px;top:${r1(y - h)}px;width:${r1(w)}px;height:${r1(h)}px${flip ? ';transform:scaleX(-1)' : ''}" />`
  );
};

export interface SceneryOptions {
  /** Trees below the box too (the game's bottom strip). */
  below?: boolean;
  /** Tallest tree, px. */
  maxTree?: number;
  /** Seeds the layout: a level id's seed gives every level its own groves; the same seed, the same trees. */
  seed?: number;
  /** Depth of the ground the top groves stand on, px: the back row's feet are this far above the box's top. */
  depth?: number;
}

/**
 * A grove row: trees standing in loose clusters with gaps between, from `from` to `to` px. `h` is
 * the row's tree height, `baseY` its ground line, `wobble` how much each tree's feet stray (px).
 * `gap` scales the clearings between clusters (0 = an unbroken tree line).
 */
function groveRow(rng: Rng, from: number, to: number, baseY: number, h: number, wobble: number, gap: number, pick: (lean: WorldArt | null) => WorldArt, bush: WorldArt | null): Item[] {
  const row: Item[] = [];
  let x = from + rng() * h * 0.6;
  while (x < to) {
    // One cluster: a few trees of mostly one kind, crowding each other a little.
    const lean = pick(null);
    const count = 1 + Math.floor(rng() * 4.4);
    for (let i = 0; i < count && x < to; i++) {
      const art = rng() < 0.72 ? lean : pick(null);
      const size = h * (0.72 + rng() * 0.5);
      row.push({ x, y: baseY + (rng() - 0.5) * wobble, h: size, art, flip: rng() < 0.5 });
      x += size * ART[art] * (0.42 + rng() * 0.42);
    }
    // Now and then a bush at the edge of the cluster.
    if (bush && rng() < 0.3) row.push({ x: x + h * 0.1, y: baseY + wobble * 0.5, h: h * (0.34 + rng() * 0.14), art: bush, flip: rng() < 0.5 });
    x += h * gap * (0.35 + rng() * 1.5);
  }
  return row;
}

/** Dry grass stalks in the snow: small clumps of thin tan stems with seed heads, in loose scatters. */
function winterStalks(rng: Rng, width: number, from: number, to: number): string {
  const tan = ['#b99a5c', '#9c7f48', '#c8ad6c', '#8a6f3e'];
  let out = '';
  const count = Math.round(((to - from) * width) / 9000);
  for (let i = 0; i < count; i++) {
    const x = rng() * width;
    const y = from + rng() * Math.max(1, to - from);
    const h = 9 + rng() * 9;
    const stems = 2 + Math.floor(rng() * 3);
    let paths = '';
    for (let k = 0; k < stems; k++) {
      const lean = (k / Math.max(1, stems - 1) - 0.5) * 9 + (rng() - 0.5) * 5;
      const len = 14 + rng() * 9;
      const c = tan[Math.floor(rng() * tan.length)];
      paths += `<path d="M10 24 Q${r1(10 + lean * 0.3)} ${r1(24 - len * 0.6)} ${r1(10 + lean)} ${r1(24 - len)}" stroke="${c}" stroke-width="1.1"/>` + `<ellipse cx="${r1(10 + lean)}" cy="${r1(24 - len)}" rx="1.1" ry="1.9" fill="${c}"/>`;
    }
    out += `<svg class="stalk" viewBox="0 0 20 24" style="left:${r1(x - h * 0.42)}px;top:${r1(y - h)}px;width:${r1(h * 0.84)}px;height:${r1(h)}px"><ellipse cx="10" cy="23.4" rx="5" ry="1.4" fill="rgba(90,120,170,0.25)"/>${paths}</svg>`;
  }
  return out;
}

/**
 * Trees around a box (the board, or the level list), in a layer `width` x `height` px, as natural
 * scattered groves: staggered rows in depth (smaller toward the back), loose clusters with random
 * spacing and clearings, mixed species for the season, slight overlaps. Above the box they stand on
 * a strip of ground `depth` px deep; below it they fill the strip down to `height`. Everything sits
 * under the board, gates and buttons (the scenery layer is behind them).
 */
export function sceneryHtml(theme: Theme, width: number, height: number, box: Box, options: SceneryOptions = {}): string {
  const { below = true, maxTree = 96, depth = 0 } = options;
  const rng: Rng = mulberry32((options.seed ?? 0) ^ (theme.id.length * 7919 + 13));
  const art = seasonArt(theme.id);
  const items: Item[] = [];
  const pick = (): WorldArt => (art.aspen && rng() >= theme.spruceShare ? art.aspen : art.spruce);
  const top = box.y;
  const bandAbove = Math.max(0, top);

  // Above: three rows in depth. The back row is a nearly unbroken, small tree line on the horizon;
  // the nearer rows are bigger and stand in clusters with clearings.
  const tall = Math.min(maxTree, Math.max(34, (bandAbove - depth) * 0.82));
  items.push(...groveRow(rng, -20, width + 20, top - depth, tall * 0.5, depth * 0.12, 0.25, pick, null));
  items.push(...groveRow(rng, -30, width + 20, top - depth * 0.5, tall * 0.72, depth * 0.25, 0.8, pick, bandAbove > 40 ? art.bush : null));
  items.push(...groveRow(rng, -24, width + 20, top + 6, tall * 0.95, Math.min(8, depth * 0.3), 1.5, pick, bandAbove > 40 ? art.bush : null));

  // Sides: trees peeking out from behind the berm (under the board), unevenly spaced.
  for (let y = top + 30 + rng() * 40; y < box.y + box.height; y += 34 + rng() * 60) {
    const h = 40 + rng() * 34;
    if (rng() < 0.8) items.push({ x: box.x - 2 + rng() * 6, y, h, art: pick(), flip: rng() < 0.5 });
    if (rng() < 0.8) items.push({ x: box.x + box.width + 2 - rng() * 6, y: y + rng() * 30, h: 40 + rng() * 34, art: pick(), flip: rng() < 0.5 });
  }

  // Below: the same groves, sized to the strip so they never reach the buttons. Rows step down the
  // strip from the back (near the board, small) to the front (bigger).
  const bandBelow = height - (box.y + box.height);
  if (below && bandBelow > 26) {
    const floor = box.y + box.height;
    const h = Math.min(74, bandBelow * 0.9);
    const rows = bandBelow > 120 ? 3 : bandBelow > 64 ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      const back = rows === 1 ? 1 : r / (rows - 1); // 0 = back row, 1 = front
      const baseY = floor + bandBelow * (rows === 1 ? 1 : 0.42 + 0.58 * back) - 2;
      const size = h * (rows === 1 ? 0.85 : 0.5 + 0.42 * back);
      items.push(...groveRow(rng, -10, width + 20, baseY, size, Math.min(10, bandBelow * 0.06), 2.2 + back * 1.2, pick, art.bush));
    }
    // Accents: a cattail clump and (now and then) the blank lease sign.
    for (const a of art.accents) {
      if (rng() < (a === 'cattails' ? 0.8 : 0.5)) items.push({ x: width * (0.2 + rng() * 0.6), y: floor + bandBelow - 2, h: h * (a === 'cattails' ? 0.5 : 0.62), art: a, flip: a === 'cattails' && rng() < 0.5 });
    }
    // Nothing below may stand lower than the strip's floor line (the buttons start there).
    for (const it of items) if (it.y > height - 1) it.y = height - 1;
  }

  items.sort((a, b) => a.y - b.y); // nearer (lower on screen) in front
  // Winter: a few dry tan grass stalks poke through the snow, here and there, never in a row.
  const stalks = theme.id === 'winter' ? winterStalks(rng, width, top - depth + 4, height) : '';
  return `<div class="trees" style="width:${r1(width)}px;height:${r1(height)}px" aria-hidden="true">${stalks}${items.map(img).join('')}</div>`;
}
