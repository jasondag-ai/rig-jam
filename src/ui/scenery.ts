// Border scenery: illustrated spruce, aspen and willow (public/sprites/world, from the art inbox)
// standing on the ground around the fenced pad, season-matched, with the odd cattail clump and a
// blank lease sign as accents. Seeded per theme, so a season always looks the same.
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

/**
 * Trees around a box (the board, or the level list), in a layer `width` x `height` px. Rows stand
 * along the top edge (bigger toward the screen edges), peek out at the sides, and fill the space
 * below if there is room. Everything sits under the board, gates and buttons.
 */
export function sceneryHtml(theme: Theme, width: number, height: number, box: Box, below = true, maxTree = 96): string {
  const rng: Rng = mulberry32(theme.id.length * 7919 + 13);
  const art = seasonArt(theme.id);
  const items: Item[] = [];
  const pick = (): WorldArt => (art.aspen && rng() >= theme.spruceShare ? art.aspen : art.spruce);
  const flip = () => rng() < 0.5;
  // Bigger toward the screen edges, smaller in the middle (as if the clearing curves away).
  const edge = (x: number) => 0.82 + 0.4 * Math.abs(x / width - 0.5) * 2;
  const top = box.y;
  const bandAbove = Math.max(0, top);

  const backH = Math.min(maxTree * 0.78, Math.max(30, bandAbove * 0.62));
  for (let x = -10; x < width + 20; x += backH * 0.42 + rng() * 10) {
    items.push({ x, y: top + 4, h: backH * (0.8 + rng() * 0.3) * edge(x), art: pick(), flip: flip() });
  }
  const frontH = Math.min(maxTree, Math.max(36, bandAbove * 0.86));
  for (let x = rng() * 20; x < width + 20; x += frontH * 0.55 + rng() * 22) {
    items.push({ x, y: top + 10 + rng() * 6, h: frontH * (0.82 + rng() * 0.3) * edge(x), art: pick(), flip: flip() });
  }
  // A willow or two along the front of the top row.
  if (art.bush && bandAbove > 40) {
    for (const fx of [0.12 + rng() * 0.1, 0.72 + rng() * 0.15]) items.push({ x: width * fx, y: top + 14, h: frontH * 0.42, art: art.bush, flip: flip() });
  }
  // Sides: trees peeking out from behind the fence (under the board).
  for (let y = top + 50; y < box.y + box.height; y += 55 + rng() * 30) {
    const h = 48 + rng() * 24;
    items.push({ x: box.x - 4 + rng() * 4, y, h, art: pick(), flip: flip() });
    items.push({ x: box.x + box.width + 4 - rng() * 4, y: y + 20, h, art: pick(), flip: flip() });
  }
  // Below the board, sized to the gap so they never reach the buttons.
  const bandBelow = height - (box.y + box.height);
  if (below && bandBelow > 26) {
    const h = Math.min(72, bandBelow * 0.92);
    const ground = box.y + box.height + bandBelow - 2;
    for (let x = rng() * 30; x < width + 20; x += h * 0.72 + rng() * 26) {
      const scale = (0.7 + rng() * 0.25) * edge(x);
      const roll = rng();
      const kind: WorldArt = roll < 0.22 && art.bush ? art.bush : pick();
      items.push({ x, y: ground - rng() * 4, h: Math.min(h, h * scale) * (kind === art.bush ? 0.6 : 1), art: kind, flip: flip() });
    }
    // Accents: a cattail clump and (now and then) the blank lease sign.
    for (const a of art.accents) {
      if (rng() < (a === 'cattails' ? 0.8 : 0.5)) items.push({ x: width * (0.2 + rng() * 0.6), y: ground, h: h * (a === 'cattails' ? 0.5 : 0.62), art: a, flip: a === 'cattails' && flip() });
    }
  }

  items.sort((a, b) => a.y - b.y); // nearer (lower on screen) in front
  return `<div class="trees" style="width:${r1(width)}px;height:${r1(height)}px" aria-hidden="true">${items.map(img).join('')}</div>`;
}
