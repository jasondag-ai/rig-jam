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
  /** Permanent gag anchors below the box: the bear's willow bush (every region), the gopher's dirt mound (Cardium). */
  anchors?: { bush?: boolean; mound?: boolean };
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
    // Accents: a cattail clump and (now and then) the blank lease sign.
    for (const a of art.accents) {
      if (rng() < (a === 'cattails' ? 0.8 : 0.5)) items.push({ x: width * (0.2 + rng() * 0.6), y: floor + bandBelow - 2, h: h * (a === 'cattails' ? 0.5 : 0.62), art: a, flip: a === 'cattails' && rng() < 0.5 });
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

  // Gag anchors, always there (gags on or off), on the grass just below the berm: the willow bush
  // the bear stops at (toward the left), and in Cardium the gopher's dirt mound (toward the right).
  // Sized to the strip so they never reach the board, a gate's swing or the buttons.
  if (below && options.anchors && bandBelow > 20) {
    const floor = box.y + box.height;
    const size = Math.max(14, Math.min(34, bandBelow - BERM_CLEAR - 6));
    const y = Math.min(height - 2, floor + BERM_CLEAR + size + 2);
    if (options.anchors.bush) anchors.push({ kind: 'bush', x: box.x + box.width * 0.2, y, w: size * ART.bush_willow, h: size });
    if (options.anchors.mound) anchors.push({ kind: 'mound', x: box.x + box.width * 0.78, y, w: size * 1.5, h: size * 0.8 });
    // Trees give the anchors room.
    items = items.filter((it) => {
      const b = treeBox(it);
      return !anchors.some((a) => b.right > a.x - a.w / 2 - 4 && b.left < a.x + a.w / 2 + 4 && b.bottom > a.y - a.h - 4 && b.top < a.y + 4);
    });
    for (const a of anchors) if (a.kind === 'bush') items.push({ x: a.x, y: a.y, h: a.h, art: 'bush_willow', flip: false });
  }

  items.sort((a, b) => a.y - b.y); // nearer (lower on screen) in front
  return { items, anchors };
}

/**
 * The gopher's mound, drawn to sit with the illustrated trees: a rounded heap of loose dirt lit from
 * the top left (shaded gradient, no outline), soil clumps on it, a dark hole with depth, grass tufts
 * round the base and a soft contact shadow.
 */
const mound = (a: Anchor) =>
  `<svg class="mound" data-anchor="mound" viewBox="0 0 64 34" style="left:${r1(a.x - a.w / 2)}px;top:${r1(a.y - a.h)}px;width:${r1(a.w)}px;height:${r1(a.h)}px">` +
  '<defs>' +
  '<radialGradient id="md-dirt" cx="34%" cy="22%" r="85%"><stop offset="0" stop-color="#c79b68"/><stop offset="0.45" stop-color="#9a6c42"/><stop offset="1" stop-color="#5c3d24"/></radialGradient>' +
  '<radialGradient id="md-hole" cx="50%" cy="68%" r="62%"><stop offset="0" stop-color="#050302"/><stop offset="0.7" stop-color="#1c110a"/><stop offset="1" stop-color="#4a3120"/></radialGradient>' +
  '<radialGradient id="md-shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(20,14,6,0.5)"/><stop offset="1" stop-color="rgba(20,14,6,0)"/></radialGradient>' +
  '</defs>' +
  '<ellipse cx="35" cy="30" rx="30" ry="4.6" fill="url(#md-shadow)"/>' +
  // The heap: a lumpy outline, not a smooth dome.
  '<path d="M4 29 Q3 22 9 19 Q11 12 19 10 Q24 4 33 5 Q42 3 47 9 Q55 11 56 18 Q62 22 60 29 Q46 32 32 31 Q16 32 4 29 Z" fill="url(#md-dirt)"/>' +
  // Shaded side (down-right) and a lit rim (up-left).
  '<path d="M47 9 Q55 11 56 18 Q62 22 60 29 Q50 31 42 31 Q52 24 47 9 Z" fill="rgba(40,24,10,0.3)"/>' +
  '<path d="M9 19 Q11 12 19 10 Q24 4 33 5" fill="none" stroke="rgba(255,232,196,0.5)" stroke-width="1.6" stroke-linecap="round"/>' +
  // The hole, with a lip of thrown dirt catching the light above it and darkness below.
  '<ellipse cx="32" cy="16.5" rx="11.5" ry="6.4" fill="#6f4c2e"/>' +
  '<ellipse cx="32" cy="17.4" rx="10" ry="5.2" fill="url(#md-hole)"/>' +
  '<path d="M21.6 15.4 Q32 9.6 42.4 15.4" fill="none" stroke="rgba(255,226,184,0.55)" stroke-width="1.3" stroke-linecap="round"/>' +
  // Loose clumps of soil, each with a shadow and a highlight.
  [[12, 23, 2.6], [20, 26.5, 2], [44, 25, 2.8], [52, 22, 2], [27, 8.5, 1.8], [40, 8, 1.5], [15, 15.5, 1.7], [50, 15, 1.6], [34, 27.5, 2.2], [57, 27, 1.5]]
    .map(([x, y, r]) => `<ellipse cx="${x + r * 0.3}" cy="${y + r * 0.35}" rx="${r}" ry="${r * 0.75}" fill="rgba(30,18,8,0.4)"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.75}" fill="#8a5f3a"/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.28}" rx="${r * 0.5}" ry="${r * 0.32}" fill="#d3aa78"/>`)
    .join('') +
  // Grass tufts round the base.
  [[5, 30, -0.5], [9, 31.5, 0.2], [24, 32, -0.2], [41, 32.5, 0.3], [56, 31, 0.5], [61, 29.5, 0.2]]
    .map(([x, y, lean]) =>
      [-1, 0, 1]
        .map((k) => `<path d="M${x} ${y} q${(lean + k * 0.5) * 2} -3.4 ${(lean + k * 0.8) * 3.4} -6.4" fill="none" stroke="${k ? '#4f8a1e' : '#7fb433'}" stroke-width="1.1" stroke-linecap="round"/>`)
        .join(''),
    )
    .join('') +
  '</svg>';

/** The scenery layer as HTML (see sceneryItems). */
export function sceneryHtml(theme: Theme, width: number, height: number, box: Box, options: SceneryOptions = {}): string {
  const { items, anchors } = sceneryItems(theme, width, height, box, options);
  const depth = options.depth ?? 0;
  // Winter: a few dry tan grass stalks poke through the snow, here and there, never in a row.
  const stalks = theme.id === 'winter' ? winterStalks(mulberry32((options.seed ?? 0) ^ 0x5a17), width, box.y - depth + 4, height) : '';
  const anchorHtml = anchors.filter((a) => a.kind === 'mound').map(mound).join('');
  const html = items.map((it) => (it.art === 'bush_willow' && anchors.some((a) => a.kind === 'bush' && a.x === it.x && a.y === it.y) ? img(it).replace('class="sc ', 'data-anchor="bush" class="sc ') : img(it))).join('');
  return `<div class="trees" style="width:${r1(width)}px;height:${r1(height)}px" aria-hidden="true">${stalks}${html}${anchorHtml}</div>`;
}
