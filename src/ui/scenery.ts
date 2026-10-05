// Border scenery in the board's toy look (art drawn in code: trees.ts): white spruce, trembling
// aspen and willow standing in scattered groves round the bermed pad, in the season's dress, with
// the odd cattail clump and a blank lease sign as accents. Seeded (per level in the game), so a
// level always looks the same.
import { mulberry32 } from '../engine/rng.ts';
import type { Theme } from './themes.ts';
import { aspect, seasonSymbols, sizeFor, symbolId, type Season, type Species } from './trees.ts';

type Rng = () => number;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A scenery piece's species (the season and size pick its drawing). */
export type WorldArt = Species;
const ART = { spruce: aspect('spruce'), aspen: aspect('aspen'), willow: aspect('willow'), cattails: aspect('cattails'), sign: aspect('sign') } as const;

/** What stands in a season: spruce, aspen and willow all year (bare aspen and willow under snow in winter); cattails only when the sloughs are open. */
export function seasonArt(id: string): { spruce: WorldArt; aspen: WorldArt | null; bush: WorldArt | null; accents: WorldArt[] } {
  return { spruce: 'spruce', aspen: 'aspen', bush: 'willow', accents: id === 'winter' ? [] : ['cattails'] };
}

export interface Item {
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

/** One piece: a small <svg> that uses the season's symbol for its species and size. */
const piece = (season: Season, { x, y, h, art, flip }: Item, anchor = '') => {
  const w = h * ART[art];
  return (
    `<svg class="sc tree_${art}_${season}"${anchor} style="left:${r1(x - w / 2)}px;top:${r1(y - h)}px;width:${r1(w)}px;height:${r1(h)}px${flip ? ';transform:scaleX(-1)' : ''}">` +
    `<use href="#${symbolId(art, season, sizeFor(art, h))}"/></svg>`
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
  /** Permanent gag anchors below the box: the bear's willow bush (every region), the gopher's dirt mound (Cardium). */
  anchors?: { bush?: boolean; mound?: boolean };
  /**
   * Stands the mound on a given line at a given size instead (the strip's ground line, at the gags'
   * size: gopher lunch has the worker sit beside it): `baseY` is where its base stands, `w` its box width.
   */
  moundAt?: { baseY: number; w: number };
  /** Patches kept clear of trees (the sleepy worker's spot, the biffy). */
  clearings?: Box[];
}

/** Clear grass kept between the berm and any tree, px. */
export const BERM_CLEAR = 10;

/** Where a tree stands on screen: its box, a little narrower than the sprite (the art has soft edges). */
export const treeBox = (it: { x: number; y: number; h: number; art: WorldArt }) => {
  const w = it.h * ART[it.art] * 0.8;
  return { left: it.x - w / 2, right: it.x + w / 2, top: it.y - it.h, bottom: it.y };
};

/** Gag anchors placed by the last `sceneryItems` call are returned with it, in layer px. */
export interface Anchor {
  kind: 'bush' | 'mound';
  x: number;
  y: number;
  w: number;
  h: number;
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
    if (bush && rng() < 0.3) row.push({ x: x + h * 0.1, y: baseY + wobble * 0.5, h: h * (0.3 + rng() * 0.12), art: bush, flip: rng() < 0.5 });
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
 * a strip of ground `depth` px deep; below it they fill the strip down to `height`. Beside the box
 * there are none: any tree that would come within BERM_CLEAR of the box's sides is left out, so the
 * berm always has clear grass beside it. Everything sits under the board, gates and buttons.
 */
export function sceneryItems(theme: Theme, width: number, height: number, box: Box, options: SceneryOptions = {}): { items: Item[]; anchors: Anchor[] } {
  const { below = true, maxTree = 96, depth = 0 } = options;
  const rng: Rng = mulberry32((options.seed ?? 0) ^ (theme.id.length * 7919 + 13));
  const art = seasonArt(theme.id);
  let items: Item[] = [];
  const anchors: Anchor[] = [];
  const pick = (): WorldArt => (art.aspen && rng() >= theme.spruceShare ? art.aspen : art.spruce);
  const top = box.y;
  const bandAbove = Math.max(0, top);

  // Above: three rows in depth. The back row is a nearly unbroken, small tree line on the horizon;
  // the nearer rows are bigger and stand in clusters with clearings.
  const tall = Math.min(maxTree, Math.max(34, (bandAbove - depth) * 0.82));
  items.push(...groveRow(rng, -20, width + 20, top - depth, tall * 0.5, depth * 0.12, 0.25, pick, null));
  items.push(...groveRow(rng, -30, width + 20, top - depth * 0.5, tall * 0.72, depth * 0.25, 0.8, pick, bandAbove > 40 ? art.bush : null));
  items.push(...groveRow(rng, -24, width + 20, top - 2, tall * 0.95, Math.min(6, depth * 0.3), 1.5, pick, bandAbove > 40 ? art.bush : null));

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
    // Accents: a cattail clump. (The lease sign is permanent scenery now, at its own fixed spot: strip-gags.ts `SignProp`.)
    for (const a of art.accents) {
      if (rng() < (a === 'cattails' ? 0.8 : 0.5)) items.push({ x: width * (0.2 + rng() * 0.6), y: floor + bandBelow - 2, h: h * (a === 'cattails' ? 0.42 : 0.5), art: a, flip: a === 'cattails' && rng() < 0.5 });
    }
    // Nothing below may stand lower than the strip's floor line (the buttons start there).
    for (const it of items) if (it.y > height - 1) it.y = height - 1;
  }

  // The berm keeps clear grass round it: no tree may reach into the box (grown by BERM_CLEAR)
  // anywhere along its sides. Trees above stand behind the top berm with their feet at its edge.
  const keepOut = { left: box.x - BERM_CLEAR, right: box.x + box.width + BERM_CLEAR, top: box.y + 2, bottom: box.y + box.height + BERM_CLEAR };
  if (box.height > 0)
    items = items.filter((it) => {
      const b = treeBox(it);
      return !(b.right > keepOut.left && b.left < keepOut.right && b.bottom > keepOut.top && b.top < keepOut.bottom);
    });

  for (const gap of options.clearings ?? [])
    items = items.filter((it) => {
      const b = treeBox(it);
      return !(b.right > gap.x && b.left < gap.x + gap.width && b.bottom > gap.y && b.top < gap.y + gap.height + 6);
    });

  // Gag anchors, always there (gags on or off), on the grass just below the berm: the willow bush
  // the bear stops at (toward the left), and in Cardium the gopher's dirt mound (toward the right).
  // Sized to the strip so they never reach the board, a gate's swing or the buttons.
  if (below && options.anchors && bandBelow > 20) {
    const floor = box.y + box.height;
    const size = Math.max(14, Math.min(34, bandBelow - BERM_CLEAR - 6));
    const y = Math.min(height - 2, floor + BERM_CLEAR + size + 2);
    if (options.anchors.bush) anchors.push({ kind: 'bush', x: box.x + box.width * 0.54, y, w: size * 0.8 * ART.willow, h: size * 0.8 });
    if (options.anchors.mound) {
      const at = options.moundAt;
      const w = at ? at.w : size * 1.5, h = at ? (at.w * 34) / 64 : size * 0.8;
      // Its base line is 29.5 of the drawing's 34 units down; the rest is shadow and grass.
      anchors.push({ kind: 'mound', x: box.x + box.width * 0.78, y: at ? at.baseY + (h * 4.5) / 34 : y, w, h });
    }
    // Trees give the anchors room.
    items = items.filter((it) => {
      const b = treeBox(it);
      return !anchors.some((a) => b.right > a.x - a.w / 2 - 4 && b.left < a.x + a.w / 2 + 4 && b.bottom > a.y - a.h - 4 && b.top < a.y + 4);
    });
    for (const a of anchors) if (a.kind === 'bush') items.push({ x: a.x, y: a.y, h: a.h, art: 'willow', flip: false });
  }

  items.sort((a, b) => a.y - b.y); // nearer (lower on screen) in front
  return { items, anchors };
}

/**
 * The gopher's mound, in the same toy look as the trees: a heap of fresh dirt in two flat tones (lit
 * left side), a dark hole with a darker throat, a few soil clumps and grass blades, a soft contact
 * shadow, and the dark outline at the trees' weight.
 */
const INK = 'stroke="#2a1a0c" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"';
const mound = (a: Anchor, season: Season) => {
  const dirt = season === 'winter' ? ['#a9805a', '#c9a57c'] : ['#9a6c42', '#c0935f'];
  return (
    `<svg class="mound" data-anchor="mound" viewBox="0 0 64 34" style="left:${r1(a.x - a.w / 2)}px;top:${r1(a.y - a.h)}px;width:${r1(a.w)}px;height:${r1(a.h)}px">` +
    '<ellipse cx="35" cy="30.5" rx="29" ry="3.6" fill="rgba(20,14,6,0.3)"/>' +
    `<path d="M4 29 Q3 21 10 18 Q13 9 23 8 Q31 3 41 7 Q52 9 55 18 Q62 21 60 29 Q32 33 4 29 Z" fill="${dirt[0]}" ${INK}/>` +
    `<path d="M7 27 Q6 21 12 19.5 Q15 11 24 10 Q29 7 34 7.5 Q24 13 22 22 Q20 27 7 27 Z" fill="${dirt[1]}"/>` +
    `<ellipse cx="33" cy="17" rx="11" ry="6" fill="#3a2414" ${INK}/><ellipse cx="33" cy="18.4" rx="8" ry="3.6" fill="#120a04"/>` +
    [[13, 24, 2.4], [47, 24, 2.6], [53, 19, 1.8], [22, 28.5, 1.8]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.75}" fill="${dirt[1]}" ${INK}/>`).join('') +
    (season === 'winter' ? '' : [[5, 30], [58, 30], [40, 32]].map(([x, y]) => `<path d="M${x} ${y} l-2 -6 M${x} ${y} l0.6 -7 M${x} ${y} l2.6 -5.4" fill="none" stroke="#4f8a1e" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('')) +
    '</svg>'
  );
};

/** The scenery layer as HTML (see sceneryItems). */
export function sceneryHtml(theme: Theme, width: number, height: number, box: Box, options: SceneryOptions = {}): string {
  const { items, anchors } = sceneryItems(theme, width, height, box, options);
  const season = theme.id as Season;
  const depth = options.depth ?? 0;
  // Winter: a few dry tan grass stalks poke through the snow, here and there, never in a row.
  const stalks = season === 'winter' ? winterStalks(mulberry32((options.seed ?? 0) ^ 0x5a17), width, box.y - depth + 4, height) : '';
  const isAnchor = (it: Item) => it.art === 'willow' && anchors.some((a) => a.kind === 'bush' && a.x === it.x && a.y === it.y);
  const html = items.map((it) => piece(season, it, isAnchor(it) ? ' data-anchor="bush"' : '')).join('');
  const mounds = anchors.filter((a) => a.kind === 'mound').map((a) => mound(a, season)).join('');
  return `<div class="trees" style="width:${r1(width)}px;height:${r1(height)}px" aria-hidden="true"><svg class="tree-defs" width="0" height="0" aria-hidden="true"><defs>${seasonSymbols(season)}</defs></svg>${stalks}${html}${mounds}</div>`;
}
