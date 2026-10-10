// The stage for gag wave 3 (wave3.ts: Mannville and Bakken). The reference draws each gag on a
// 390 x 190 strip in its own coordinates (the bottom berm's foot at y 30, the walking lane's ground
// line at y 150, the scenery ending about y 168). The game shows that same world in its real bottom
// strip: at the scale the strip's height allows, centred across the screen, standing on the strip's
// floor. Where the strip is short the scale is small and the screen is wider than the world's 390:
// `E` units more on each side, which the gags walk in and out through (wave3.ts).
//
// Here: the geometry (pure), the STANDARD MANNVILLE SCENE as permanent scenery (the reference's
// trees in the board's own tree drawings, its three muskeg puddles, and the lane aspen drawn IN
// FRONT of every strip gag's characters), and the timeline definitions that play the ported gags.
import type { EggHost } from './egg-gags.ts';
import { setGround } from './puppet-stage.ts';
import type { Season } from './trees.ts';
import { BOX, sizeFor, treeArt, type Species } from './trees.ts';
import type { TimelineDef } from './strip-gags.ts';
import { BALE_AT, CW, MUSKEG, WAVE3, baleAtRest, cardMode, rng, tuft } from './wave3.ts';
import * as BD from './bald-art.ts';
import { BALD } from './bald-gags.ts';

/** The reference's strip, in its own units. */
export const SCENE = { w: 390, top: 30, floor: 168, ground: 150 } as const;
const WAVE3_SCENE = SCENE;
/**
 * Mannville's strip is a little tighter than the reference's (Jay, Oct 8: characters stay readable in Safari): it
 * starts at y 44, just over the lane aspen's crown (the tallest thing in it), not at the reference's berm foot (y 30).
 */
export const MANN_SCENE = { w: 390, top: 44, floor: 168, ground: 150 } as const;
/**
 * Clearwater's strip: from y 47 (just over its tallest tree) to y 170 (just under the sandy two-track, whose near rut
 * holds the mud puddle and is the front lane). 123 units tall where the reference's own strip is 154: Jay asked for
 * everything a quarter bigger on a phone (Oct 8), taking the empty band under the lane first.
 */
export const CW_SCENE = { w: 390, top: 47, floor: 170, ground: 150 } as const;
/** Below this scale the strip is too short for these gags: they do not play there. */
/**
 * Baldonnel's strip (bald-art.ts): cropped exactly as tight as Clearwater's (123 units; the reference's is 154), so its
 * characters stand at Clearwater's in-game size. Its trees and props are stood inside it (see `BD_TREES`, bald-art.ts).
 */
export const BD_SCENE = { w: 390, top: 47, floor: 170, ground: 150 } as const;
export const SCENE_MIN = 0.45;

export interface SceneGeom {
  /** Screen px per world unit. */
  s: number;
  /** The world x at the screen's left edge, the world's width and height on screen, the world y at the strip's top. */
  left: number;
  worldW: number;
  worldH: number;
  top: number;
  /** How much wider than the reference's 390 the screen is, on each side (world units, 0 or more). */
  E: number;
  /** The strip on screen (px). */
  strip: { top: number; bottom: number };
  screenW: number;
  /** Room enough for the gags. */
  fits: boolean;
}

/** How the reference's strip lies in the game's bottom strip (see the top of this file). */
export function sceneGeom(screenW: number, strip: { top: number; bottom: number }, SCENE: { w: number; top: number; floor: number } = WAVE3_SCENE): SceneGeom {
  // A screen that is not laid out yet (0 wide, or a strip nobody has measured): the reference's own
  // view at scale 1, which does not fit, so nothing plays and NO NaN is ever written to a viewBox.
  if (!(screenW > 0) || !Number.isFinite(strip.top) || !Number.isFinite(strip.bottom)) {
    const worldH = SCENE.floor - SCENE.top;
    return { s: 1, left: 0, worldW: SCENE.w, worldH, top: SCENE.top, E: 0, strip: { top: 0, bottom: 0 }, screenW: 0, fits: false };
  }
  const h = Math.max(1, strip.bottom - strip.top);
  const s = Math.min(screenW / SCENE.w, h / (SCENE.floor - SCENE.top));
  const worldW = screenW / s, worldH = h / s;
  const left = SCENE.w / 2 - worldW / 2;
  return { s, left, worldW, worldH, top: SCENE.floor - worldH, E: Math.max(0, -left), strip, screenW, fits: s >= SCENE_MIN };
}

/** A world point on the screen (px from the screen's left and top). */
export const toScreen = (g: SceneGeom, x: number, y: number): { x: number; y: number } => ({ x: (x - g.left) * g.s, y: g.strip.top + (y - g.top) * g.s });
/** A world box on the screen, grown to a tap target of at least `min` px each way. */
export function tapBox(g: SceneGeom, box: { x: number; y: number; w: number; h: number }, min = 44): { left: number; top: number; right: number; bottom: number } {
  const a = toScreen(g, box.x, box.y), w = box.w * g.s, h = box.h * g.s;
  const gx = Math.max(0, (min - w) / 2), gy = Math.max(0, (min - h) / 2);
  return { left: a.x - gx, top: a.y - gy, right: a.x + w + gx, bottom: a.y + h + gy };
}
const viewBox = (g: SceneGeom) => `${g.left.toFixed(2)} ${g.top.toFixed(2)} ${g.worldW.toFixed(2)} ${g.worldH.toFixed(2)}`;

// ---------- The standard Mannville scene ----------

/**
 * The reference's Mannville trees (species, x, base y, height), in the board's own drawings. The
 * left grove stands 56 further right than in the reference, clear of the biffy in the corner.
 */
export const MANN_TREES: { species: Species; x: number; base: number; h: number }[] = [
  { species: 'spruce', x: 80, base: 124, h: 62 },
  { species: 'aspen', x: 110, base: 126, h: 58 },
  { species: 'willow', x: 138, base: 128, h: 24 },
  // (The reference stands this willow at x 238, where the landowner stops his quad: it stands right of that here, clear of the stage.)
  { species: 'willow', x: 268, base: 128, h: 22 },
  { species: 'aspen', x: 334, base: 126, h: 56 },
  { species: 'spruce', x: 366, base: 124, h: 64 },
];
/** The lane aspen: the one tree IN FRONT of the strip's characters (the beaver's tree). It stands on the strip's floor. */
export const LANE_ASPEN = { species: 'aspen' as Species, x: 288, base: 167, h: 122 };
/** The big muskeg puddle (the Muskeg Boots gag's): its box in the world. */
export const BIG_PUDDLE = { x: 108, y: 142, w: 84, h: 20 };
/** Where the lease sign stands on a Mannville level (a share of the screen's width): left of the lane aspen, whose crown would hide its visitors. */
export const MANN_SIGN_X = 0.44;

const tree = (t: { species: Species; x: number; base: number; h: number }, season: Season): string => {
  const [bw, bh] = BOX[t.species];
  const w = (t.h * bw) / bh;
  return `<svg x="${(t.x - w / 2).toFixed(2)}" y="${(t.base - t.h).toFixed(2)}" width="${w.toFixed(2)}" height="${t.h}" viewBox="0 0 ${bw} ${bh}" overflow="visible">${treeArt(t.species, season, sizeFor(t.species, t.h))}</svg>`;
};

/** The permanent Mannville scenery behind the characters: grass tufts, the trees, the three puddles with their cattails. */
export function mannScene(g: SceneGeom, season: Season = 'fall'): string {
  // Tufts across the whole screen, however wide (seeded: always the same), none under a puddle.
  const R = rng(7);
  let tufts = '';
  for (let x = -200; x < SCENE.w + 200; x += 11.5) {
    const tx = Math.round(x + R() * 9), ty = Math.round(52 + R() * 112), light = R() < 0.4;
    if (tx < g.left || tx > g.left + g.worldW || ty < g.top + 8) continue;
    if ((tx > 100 && tx < 200 && ty > 136 && ty < 166) || (tx > 70 && tx < 114 && ty > 150) || (tx > 334 && tx < 370 && ty > 138 && ty < 156)) continue;
    tufts += tuft(tx, ty, light ? '#c6b97c' : '#8a7c43');
  }
  return tufts + MANN_TREES.map((t) => tree(t, season)).join('') + MUSKEG;
}
/** The lane aspen, alone: drawn over the strip's gags. */
export const mannFront = (season: Season = 'fall'): string => tree(LANE_ASPEN, season);
/** Where a tap counts as the lane aspen: its trunk and crown. */
export const ASPEN_BOX = { x: LANE_ASPEN.x - 24, y: LANE_ASPEN.base - LANE_ASPEN.h, w: 48, h: LANE_ASPEN.h };

/**
 * THE STANDARD MANNVILLE SCENE: permanent scenery on every Mannville level. Two layers that take
 * no touches: the scenery behind the strip's gags, and the lane aspen in front of them
 * (`front`, which the game keeps above every gag layer).
 */
export class MannProp {
  readonly layer: HTMLElement;
  readonly front: HTMLElement;
  private host: EggHost;
  private season: Season;
  private drawn = '';
  private g: SceneGeom | null = null;

  constructor(host: EggHost, season: Season) {
    this.host = host;
    this.season = season;
    const make = (cls: string) => {
      const el = document.createElement('div');
      el.className = `scene-layer puppet-layer scene-prop ${cls}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg class="scene-svg" preserveAspectRatio="none"></svg>';
      return el;
    };
    this.layer = make('mann-layer');
    this.front = make('mann-front scene-front');
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.front);
    this.layout();
  }

  /** How the scene lies on the screen now. */
  geom(): SceneGeom {
    return (this.g ??= sceneGeom(this.host.screen.clientWidth, this.host.strip(), MANN_SCENE));
  }

  /** Call when the screen changes size. */
  layout(): void {
    const g = (this.g = sceneGeom(this.host.screen.clientWidth, this.host.strip(), MANN_SCENE));
    for (const el of [this.layer, this.front]) place(el.firstElementChild as SVGSVGElement, g);
    // DEPTH: the back trees stand behind the walking lane (their bases are higher up the screen),
    // the lane aspen in front of it (its base is the strip's floor).
    setGround(this.layer, toScreen(g, 0, Math.max(...MANN_TREES.map((t) => t.base))).y, 'set');
    setGround(this.front, toScreen(g, 0, LANE_ASPEN.base).y, 'set');
    const key = viewBox(g);
    if (key === this.drawn) return;
    this.drawn = key;
    this.layer.firstElementChild!.innerHTML = mannScene(g, this.season);
    this.front.firstElementChild!.innerHTML = mannFront(this.season);
  }

  private hit(box: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
    const screen = this.host.screen.getBoundingClientRect();
    const b = tapBox(this.geom(), box);
    return x - screen.left >= b.left && x - screen.left <= b.right && y - screen.top >= b.top && y - screen.top <= b.bottom;
  }
  /** Is a tap at (x, y) on the big muskeg puddle? On the lane aspen? (Tap targets of at least 44 px.) */
  hitPuddle(x: number, y: number): boolean {
    return this.hit(BIG_PUDDLE, x, y);
  }
  hitAspen(x: number, y: number): boolean {
    return this.hit(ASPEN_BOX, x, y) && !this.hitPuddle(x, y);
  }
  /** A tap that does not bring the gag yet: the aspen gives a small shake (none with reduced motion: style.css). */
  shake(): void {
    const svg = this.front.firstElementChild!;
    svg.classList.remove('shake');
    void (svg as unknown as HTMLElement).getBoundingClientRect();
    svg.classList.add('shake');
  }
}

// ---------- The standard Bakken scene ----------

/** The round bale's box in the world (the reference's spot: x 352, standing on the lane's ground line). */
export const BALE_BOX = { x: BALE_AT.x - BALE_AT.r, y: BALE_AT.y - BALE_AT.r, w: BALE_AT.r * 2, h: BALE_AT.r * 2 };

/**
 * THE STANDARD BAKKEN SCENE: the round bale, permanent scenery in the same spot of every Bakken
 * level's bottom strip. One layer that takes no touches. The Runaway Bale gag draws the bale
 * itself while it plays (`show(false)` meanwhile), and leaves it exactly where it stood.
 */
export class BakkenProp {
  readonly layer: HTMLElement;
  private host: EggHost;
  private g: SceneGeom | null = null;

  constructor(host: EggHost) {
    this.host = host;
    this.layer = document.createElement('div');
    this.layer.className = 'scene-layer puppet-layer scene-prop bakken-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    this.layer.innerHTML = `<svg class="scene-svg" preserveAspectRatio="none">${baleAtRest()}</svg>`;
    (host.mount ?? ((el: HTMLElement) => host.screen.append(el)))(this.layer);
    this.layout();
  }

  geom(): SceneGeom {
    return (this.g ??= sceneGeom(this.host.screen.clientWidth, this.host.strip()));
  }

  layout(): void {
    this.g = sceneGeom(this.host.screen.clientWidth, this.host.strip());
    place(this.layer.firstElementChild as SVGSVGElement, this.g);
    // DEPTH: the bale stands on the walking lane's ground line.
    setGround(this.layer, toScreen(this.g, 0, SCENE.ground).y, 'set');
    // (On a strip with no room for the scene there is no bale: it would stand on the berm.)
    this.layer.style.display = this.g.s >= 0.3 ? '' : 'none';
  }

  /** The bale's box on the screen (px from the screen's left and top). */
  box(): { x: number; y: number; width: number; height: number } {
    const g = this.geom(), a = toScreen(g, BALE_BOX.x, BALE_BOX.y);
    return { x: a.x, y: a.y, width: BALE_BOX.w * g.s, height: BALE_BOX.h * g.s };
  }

  /** The walking lane across the strip (screen px): the scenery keeps its trees out of it, so nobody walks through one. */
  lane(): { x: number; y: number; width: number; height: number } {
    const g = this.geom(), top = toScreen(g, 0, SCENE.ground - 62).y;
    return { x: 0, y: top, width: g.screenW, height: g.strip.bottom - top };
  }

  /** The scenery's own bale, shown or (while the gag draws it) hidden. */
  show(on: boolean): void {
    (this.layer.firstElementChild as SVGSVGElement).style.visibility = on ? '' : 'hidden';
  }
}

// ---------- The standard Clearwater scene ----------

/**
 * Clearwater's trees, from its reference (`bgClear`), in the board's own drawings. The left group
 * (two spruce, the fireweed, a blueberry bush) stands 44 further right than in the reference,
 * clear of the biffy in the corner. The gold aspen at x 222 is the one the ball pings off.
 */
export const CW_TREES: { species: Species; x: number; base: number; h: number }[] = [
  { species: 'spruce', x: 64, base: 124, h: 66 },
  { species: 'spruce', x: 94, base: 120, h: 50 },
  // (The reference stands this spruce at x 290, right behind where the cook rings his triangle (x 286): by the depth rule
  // nobody parks on a prop, so it stands at 306.)
  { species: 'spruce', x: 306, base: 118, h: 56 },
  // (66 tall, not the reference's 70: its tip stays inside the tighter strip.)
  { species: 'spruce', x: 372, base: 114, h: 66 },
];
// (The reference's aspen is 118 tall and its crown runs up over the berm. The strip's scenery stops at the berm's foot, so it is 84 here (the tallest thing in the scene, just inside the strip's top): its trunk, where the ball pings, is where it was.)
export const CW_ASPEN = { species: 'aspen' as Species, x: CW.ASP.x, base: CW.ASP.b, h: 84 };
/** Fireweed [x, base, size] and red fall blueberry bushes [x, base, size] (the reference's own drawings). */
// (The reference's second fireweed stands at x 262, where Moe admires his truck and stands with his one pea: it stands at
// 352 here, between the blueberry bush and the last spruce, over the rig mats, where nobody stops.)
export const CW_FIREWEED: [number, number, number][] = [[122, 126, 1], [352, 124, 0.9]];
export const CW_BUSHES: [number, number, number][] = [[154, 126, 0.72], [340, 122, 0.66]];
/** How much strip a wave 3 scene wants on a screen `screenW` wide to stand at its full size (px). */
export const sceneStripWanted = (screenW: number, scene: { top: number; floor: number } = SCENE): number => Math.ceil((scene.floor - scene.top) * Math.min(1, screenW / SCENE.w));
/** How much strip the scene wants on a screen `screenW` wide to stand at its full size (px): the Big Pad gives its strip that first (GameView.fit). */
export const clearStripWanted = (screenW: number): number => Math.ceil((CW_SCENE.floor - CW_SCENE.top) * Math.min(1, screenW / CW_SCENE.w));
/** The mud puddle's box in the world (the Fresh Wash gag's). */
export const CW_PUDDLE_BOX = { x: CW.PUD.x - 36, y: CW.PUD.y - 7, w: 72, h: 14 };

/** Clearwater's ground, flat under everything: lichen bands, the sandy two-track, the puddle, tufts. */
export function clearGround(g: SceneGeom): string {
  const x0 = Math.min(0, g.left) - 2, x1 = Math.max(SCENE.w, g.left + g.worldW) + 2;
  // Tufts across the whole screen, however wide (seeded: always the same), none on the lane or the puddle.
  const R = rng(21);
  let tufts = '';
  for (let x = -200; x < SCENE.w + 200; x += 13) {
    const tx = Math.round(x + R() * 10), ty = Math.round(46 + R() * 136), light = R() < 0.45;
    if (tx < g.left || tx > g.left + g.worldW || ty < g.top + 8 || ty > CW_SCENE.floor - 3) continue;
    if (ty > 132) continue;
    tufts += tuft(tx, ty, light ? '#cfd2a4' : '#858c58');
  }
  return CW.bands(x0, x1) + CW.lane(x0, x1) + CW.puddle() + tufts;
}
/** What stands behind the walking lane: the trees, the fireweed, the blueberry bushes. */
export function clearScene(season: Season = 'fall'): string {
  const back = [...CW_TREES.map((t) => ({ base: t.base, svg: tree(t, season) })), ...CW_FIREWEED.map(([x, b, s]) => ({ base: b, svg: CW.fireweed(x, b, s) })), ...CW_BUSHES.map(([x, b, s]) => ({ base: b, svg: CW.bush(x, b, s, '#9b4a3a', '#c0634c') }))];
  // (Each stands in front of whatever has its foot higher up the screen.)
  back.push({ base: CW_ASPEN.base, svg: `<g class="cw-aspen">${tree(CW_ASPEN, season)}</g>` });
  back.sort((a, b) => a.base - b.base);
  return back.map((t) => t.svg).join('');
}

/**
 * THE STANDARD CLEARWATER SCENE: permanent scenery on every Clearwater level. Three layers that
 * take no touches: the flat GROUND under everything (lichen bands, the sandy two-track, the mud
 * puddle in the front lane), what STANDS behind the walking lane (trees, fireweed, bushes), and
 * the RIG MAT STACK (end view) at the lane's right end, on its own ground line just behind the lane.
 */
export class ClearProp {
  readonly ground: HTMLElement;
  readonly layer: HTMLElement;
  readonly mats: HTMLElement;
  private host: EggHost;
  private season: Season;
  private drawn = '';
  private g: SceneGeom | null = null;

  constructor(host: EggHost, season: Season) {
    this.host = host;
    this.season = season;
    const make = (cls: string) => {
      const el = document.createElement('div');
      el.className = `scene-layer puppet-layer scene-prop ${cls}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg class="scene-svg" preserveAspectRatio="none"></svg>';
      (host.mount ?? ((x: HTMLElement) => host.screen.append(x)))(el);
      return el;
    };
    this.ground = make('clear-ground');
    this.layer = make('clear-layer');
    this.mats = make('clear-mats');
    this.layout();
  }

  geom(): SceneGeom {
    return (this.g ??= sceneGeom(this.host.screen.clientWidth, this.host.strip(), CW_SCENE));
  }

  /** Call when the screen changes size. */
  layout(): void {
    const g = (this.g = sceneGeom(this.host.screen.clientWidth, this.host.strip(), CW_SCENE));
    for (const el of [this.ground, this.layer, this.mats]) place(el.firstElementChild as SVGSVGElement, g);
    // DEPTH: the ground lies under everything in the strip (the biffy and the sign up by the berm too); the trees, bushes
    // and fireweed stand behind the walking lane; the mat stack just behind it (in front of them).
    setGround(this.ground, g.strip.top - 1, 'set');
    setGround(this.layer, toScreen(g, 0, CW_ASPEN.base).y, 'set');
    setGround(this.mats, toScreen(g, 0, CW.MATS_FOOT).y, 'set');
    const key = viewBox(g);
    if (key === this.drawn) return;
    this.drawn = key;
    this.ground.firstElementChild!.innerHTML = clearGround(g);
    this.layer.firstElementChild!.innerHTML = clearScene(this.season);
    this.mats.firstElementChild!.innerHTML = `<g class="cw-mats">${CW.mats()}</g>`;
  }

  /** Is a tap at (x, y) on the rig mat stack? (A tap target of at least 44 px.) */
  hitMats(x: number, y: number): boolean {
    const screen = this.host.screen.getBoundingClientRect();
    const b = tapBox(this.geom(), CW.MAT_BOX);
    return x - screen.left >= b.left && x - screen.left <= b.right && y - screen.top >= b.top && y - screen.top <= b.bottom;
  }
  /** Is a tap at (x, y) on the mud puddle? (A tap target of at least 44 px; the mat stack comes first.) */
  hitPuddle(x: number, y: number): boolean {
    const screen = this.host.screen.getBoundingClientRect();
    const b = tapBox(this.geom(), CW_PUDDLE_BOX);
    return !this.hitMats(x, y) && x - screen.left >= b.left && x - screen.left <= b.right && y - screen.top >= b.top && y - screen.top <= b.bottom;
  }
  /** The mat stack's box on the screen (px from the screen's left and top). */
  matsBox(): { x: number; y: number; width: number; height: number } {
    const g = this.geom(), a = toScreen(g, CW.MAT_BOX.x, CW.MAT_BOX.y);
    return { x: a.x, y: a.y, width: CW.MAT_BOX.w * g.s, height: CW.MAT_BOX.h * g.s };
  }
  /** A tap that does not bring the gag yet: the stack gives a small knock (none with reduced motion: style.css). */
  shake(): void {
    const svg = this.mats.firstElementChild!;
    svg.classList.remove('shake');
    void (svg as unknown as HTMLElement).getBoundingClientRect();
    svg.classList.add('shake');
  }
  /** The gold aspen turned about its foot by `deg` (the ball pings off it in Out Cold); 0 puts it back. */
  aspen(deg: number): void {
    const el = this.layer.querySelector<SVGGElement>('.cw-aspen');
    if (!el) return;
    if (deg) el.setAttribute('transform', `rotate(${deg.toFixed(2)} ${CW_ASPEN.x} ${CW_ASPEN.base})`);
    else el.removeAttribute('transform');
  }
}

// ---------- The standard Baldonnel scene ----------

/**
 * Baldonnel's black spruce, from its reference (`bgBald`), in the board's own spruce drawing (ONE ART STYLE, as in
 * Mannville and Clearwater), dark in the thaw theme's tones. THE REFERENCE'S LEFT PAIR (x 10 and 26, by the sign)
 * STANDS ON THE POND'S FAR BANK AT THE RIGHT (x 344 and 360), with the one already there: at the left it would
 * stand under the biffy, and anywhere else on the left Right of Way parks Moe's pickup in front of it for five
 * seconds (nobody parks on a prop). The tallest are a little shorter, so their tips stay inside the strip.
 */
export const BD_TREES: { species: Species; x: number; base: number; h: number }[] = [
  { species: 'spruce', x: 150, base: 96, h: 46 },
  { species: 'spruce', x: 166, base: 100, h: 52 },
  { species: 'spruce', x: 186, base: 96, h: 40 },
  { species: 'spruce', x: 344, base: 96, h: 44 },
  { species: 'spruce', x: 360, base: 94, h: 40 },
  { species: 'spruce', x: 378, base: 94, h: 46 },
];
/** How much strip Baldonnel's scene wants on a screen `screenW` wide to stand at its full size (px). */
export const baldStripWanted = (screenW: number): number => Math.ceil((BD_SCENE.floor - BD_SCENE.top) * Math.min(1, screenW / BD_SCENE.w));
/** The props a tap can land on, in the world: [its class in the scene, its box]. The first that holds the tap wins. */
export const BD_PROPS: { cls: string; box: { x: number; y: number; w: number; h: number } }[] = [
  { cls: 'bd-scale', box: { x: BD.PAD.x0 - 7, y: BD.DIAL.y - BD.DIAL.r - 3, w: BD.DIAL.x + BD.DIAL.r + 3 - (BD.PAD.x0 - 7), h: BD.GY_FOOT - (BD.DIAL.y - BD.DIAL.r - 3) } },
  { cls: 'bd-snowbank', box: { x: BD.SB.x0 - 6, y: BD.SB.top - 3, w: BD.SB.x1 - BD.SB.x0 + 12, h: BD.SB.base - BD.SB.top + 3 } },
  { cls: 'bd-sign', box: { x: BD.SIGN.x - 14, y: BD.SIGN.b - 44, w: 28, h: 44 } },
  { cls: 'bd-puddle', box: { x: BD.PUD2.x - BD.PUD2.rx, y: BD.PUD2.y - 6, w: BD.PUD2.rx * 2, h: 12 } },
  { cls: 'bd-pond', box: { x: BD.POND.x0, y: BD.POND.far - 4, w: 390 - BD.POND.x0, h: BD.POND.near - BD.POND.far + 6 } },
];

/**
 * THE STANDARD BALDONNEL SCENE: permanent scenery on every Baldonnel level (the generic scenery puts no trees below
 * the board there, and there is no lease sign: the bison crossing sign stands in the back row instead, and the pond
 * lies where the lease sign's visitors would walk). Five layers that take no touches, each on its own ground line:
 * the flat GROUND under everything (grass bands, the muddy two-track, snow patches, the thaw POND and its ice pans,
 * the meltwater PUDDLE on the lane's near rut); the BACK ROW (black spruce, red willow); the BISON SIGN; and, just
 * behind the walking lane so that everybody who walks it passes in front of them, the old SNOWBANK and the portable
 * TRUCK SCALE with its dial. No sightings yet: a tap on a prop gives it the usual small knock (`propAt`).
 */
export class BaldProp {
  readonly ground: HTMLElement;
  readonly layer: HTMLElement;
  readonly sign: HTMLElement;
  readonly snowbank: HTMLElement;
  readonly scale: HTMLElement;
  private host: EggHost;
  private season: Season;
  private drawn = '';
  private needleAt: number = BD.NEEDLE_REST;
  private g: SceneGeom | null = null;

  constructor(host: EggHost, season: Season) {
    this.host = host;
    this.season = season;
    const make = (cls: string) => {
      const el = document.createElement('div');
      el.className = `scene-layer puppet-layer scene-prop ${cls}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg class="scene-svg" preserveAspectRatio="none"></svg>';
      (host.mount ?? ((x: HTMLElement) => host.screen.append(x)))(el);
      return el;
    };
    this.ground = make('bald-ground');
    this.layer = make('bald-layer');
    this.sign = make('bald-sign');
    this.snowbank = make('bald-snowbank');
    this.scale = make('bald-scale');
    this.layout();
  }

  geom(): SceneGeom {
    return (this.g ??= sceneGeom(this.host.screen.clientWidth, this.host.strip(), BD_SCENE));
  }

  /** Call when the screen changes size. */
  layout(): void {
    const g = (this.g = sceneGeom(this.host.screen.clientWidth, this.host.strip(), BD_SCENE));
    const layers = [this.ground, this.layer, this.sign, this.snowbank, this.scale];
    for (const el of layers) place(el.firstElementChild as SVGSVGElement, g);
    // DEPTH: the ground lies under everything in the strip (the biffy up by the berm too); then, by their feet, the
    // back row, the bison sign, the snowbank and the scale, all of them behind the walking lane.
    setGround(this.ground, g.strip.top - 1, 'set');
    setGround(this.layer, toScreen(g, 0, Math.max(...BD_TREES.map((t) => t.base), ...BD.WILLOWS.map((w) => w[1]))).y, 'set');
    setGround(this.sign, toScreen(g, 0, BD.SIGN.b).y, 'set');
    setGround(this.snowbank, toScreen(g, 0, BD.SB.base).y, 'set');
    setGround(this.scale, toScreen(g, 0, BD.SCALE_FOOT).y, 'set');
    const key = viewBox(g);
    if (key === this.drawn) return;
    this.drawn = key;
    const x0 = Math.min(0, g.left) - 2, x1 = Math.max(BD_SCENE.w, g.left + g.worldW) + 2;
    this.ground.firstElementChild!.innerHTML =
      BD.ground(x0, x1, BD_SCENE.floor) + BD.tufts(g.left, g.worldW, g.top, BD_SCENE.floor) + BD.SNOW_BACK.map((p) => BD.snowPatch(...p)).join('') +
      `<g class="bd-pond">${BD.pond(x1)}</g><g class="bd-puddle">${BD.puddle()}</g>` + BD.SNOW_FRONT.map((p) => BD.snowPatch(...p)).join('');
    const back = [...BD_TREES.map((t) => ({ base: t.base, svg: tree(t, this.season) })), ...BD.WILLOWS.map(([x, b, s]) => ({ base: b, svg: BD.willow(x, b, s) }))].sort((a, b) => a.base - b.base);
    this.layer.firstElementChild!.innerHTML = back.map((t) => t.svg).join('');
    this.sign.firstElementChild!.innerHTML = `<g class="bd-sign">${BD.bisonSign()}</g>`;
    this.snowbank.firstElementChild!.innerHTML = `<g class="bd-snowbank">${BD.snowbank()}</g>`;
    this.scale.firstElementChild!.innerHTML = `<g class="bd-scale">${BD.scaleProp(this.needleAt)}</g>`;
  }

  /** The scale's needle (degrees; Overweight swings it), or null to put it back at rest. Only the scale is drawn again. */
  needle(ang: number | null): void {
    const a = Math.round((ang ?? BD.NEEDLE_REST) * 10) / 10;
    if (a === this.needleAt) return;
    this.needleAt = a;
    this.scale.firstElementChild!.innerHTML = `<g class="bd-scale">${BD.scaleProp(a)}</g>`;
  }

  /** The prop a tap at (x, y) lands on (a tap target of at least 44 px; the first of `BD_PROPS` that holds it), or null. */
  propAt(x: number, y: number): SVGGElement | null {
    const screen = this.host.screen.getBoundingClientRect(), g = this.geom();
    for (const p of BD_PROPS) {
      // (The pond runs off the right edge of the screen, however wide the screen is.)
      const b = tapBox(g, p.cls === 'bd-pond' ? { ...p.box, w: Math.max(p.box.w, g.left + g.worldW - p.box.x) } : p.box);
      if (x - screen.left >= b.left && x - screen.left <= b.right && y - screen.top >= b.top && y - screen.top <= b.bottom) return this.host.screen.querySelector<SVGGElement>(`.${p.cls}`);
    }
    return null;
  }
}

/** Puts a scene's SVG over the strip, showing the world at the strip's scale. */
function place(svg: SVGSVGElement, g: SceneGeom): void {
  Object.assign(svg.style, { position: 'absolute', left: '0px', top: `${g.strip.top}px`, width: `${g.screenW}px`, height: `${g.strip.bottom - g.strip.top}px` });
  // (Never a NaN or an empty view: a scene with no screen yet keeps the view it had.)
  if ([g.left, g.top, g.worldW, g.worldH].every(Number.isFinite) && g.worldW > 0 && g.worldH > 0) svg.setAttribute('viewBox', viewBox(g));
}

// ---------- Playing a ported gag ----------

type Wave3 = {
  name: string; dur: number; still: number; beats: [number, string, string][]; lead: (E: number) => number; tail: (E: number) => number;
  render: (t: number, E: number) => string; over?: (t: number, E: number) => string;
  /** Clearwater: what is drawn on a lane BEHIND the walking lane (behind the rig mat stack) and on one IN FRONT of it, and those lanes' ground lines (world y). */
  back?: (t: number, E: number) => string; front?: (t: number, E: number) => string; backY?: number; frontY?: number;
  /** Lines said in the game's own bubble: when, and where the speaker's mouth is. */
  lines?: { key: string; from: number; to: number; mouth: (t: number) => { x: number; y: number } }[];
};
// (Baldonnel's seven are in a module of their own, bald-gags.ts, in the same shape.)
const gagOf = (key: string) => (WAVE3 as Record<string, Wave3>)[key] ?? (BALD as Record<string, Wave3>)[key];

/**
 * A strip gag of wave 3 as a timeline: one layer with the moving part of the scene (behind the
 * lane aspen) and, where the gag has sound words or Zs, one more over the aspen. Both take no
 * touches. The clock runs from `lead` seconds before the reference's t = 0 (its walk-in from the
 * screen's real edge) to `tail` seconds after its end; every beat keeps the reference's time.
 */
export function sceneDef(name: string, key: string, geom: () => SceneGeom | null, opts: { prop?: { show: (on: boolean) => void }; line?: string; lines?: Record<string, string>; overLease?: boolean; frame?: (t: number) => void; reset?: () => void } = {}): TimelineDef {
  const gag = gagOf(key);
  const lead = () => gag.lead(geom()?.E ?? 0);
  return {
    name,
    get beats() {
      const l = lead();
      return gag.beats.map(([t, id, text], i): [number, string, string] => [i === 0 ? 0 : t + l, id, text]);
    },
    get end() {
      return lead() + gag.dur + gag.tail(geom()?.E ?? 0);
    },
    get stillAt() {
      return lead() + gag.still;
    },
    build(layer) {
      const g = geom();
      if (!g || !g.fits) return null;
      const E = g.E, l = gag.lead(E);
      const svgIn = (el: HTMLElement) => {
        el.innerHTML = '<svg class="scene-svg" preserveAspectRatio="none"><g class="pup"></g></svg>';
        place(el.firstElementChild as SVGSVGElement, g);
        return el.querySelector('g')!;
      };
      // A lane BEHIND the walking lane (Clearwater: runners passing behind the rig mat stack), on its own ground line.
      const back = gag.back ? svgIn(layer('scene-gag scene-back')) : null;
      if (back) setGround(back, toScreen(g, 0, gag.backY ?? SCENE.ground - 7).y, 'set');
      // `overLease`: drawn over the board and its berm (the personal cloud floats up at the berm; it must never go behind it).
      const main = svgIn(layer(opts.overLease ? 'scene-gag over-lease' : 'scene-gag'));
      // DEPTH: its characters walk the lane's ground line (in front of the back trees, behind the lane aspen).
      setGround(main, toScreen(g, 0, SCENE.ground).y, 'set');
      // A lane IN FRONT of it (Clearwater: the water hauler, the front runners), on its own ground line.
      const front = gag.front ? svgIn(layer('scene-gag scene-near')) : null;
      if (front) setGround(front, toScreen(g, 0, gag.frontY ?? SCENE.ground + 18).y, 'set');
      const over = gag.over ? svgIn(layer('scene-gag scene-over')) : null;
      let last = '', lastOver = '', lastBack = '', lastFront = '';
      // A prop the gag takes over (the bale): the gag draws it while it plays, in the very same place.
      opts.prop?.show(false);
      // A line said in the game's own bubble: its tail follows the speaker (an anchor moved every frame).
      const said = (gag as Wave3 & { line?: { from: number; to: number }; mouth?: (t: number, E: number) => { x: number; y: number } }).line;
      const mouth = (gag as Wave3 & { mouth?: (t: number, E: number) => { x: number; y: number } }).mouth?.bind(gag);
      let anchor: HTMLElement | null = null;
      if (opts.line && said && mouth) {
        anchor = document.createElement('i');
        Object.assign(anchor.style, { position: 'absolute', width: '0', height: '0' });
        main.ownerSVGElement!.parentElement!.append(anchor);
      }
      // Several lines, each with its own speaker (Clearwater): an anchor each, moved every frame.
      const spoken = (opts.lines ? gag.lines ?? [] : []).filter((x) => opts.lines![x.key]).map((line) => {
        const a = document.createElement('i');
        Object.assign(a.style, { position: 'absolute', width: '0', height: '0' });
        (front ?? main).ownerSVGElement!.parentElement!.append(a);
        return { line, anchor: a };
      });
      return {
        apply(t) {
          const now = gag.render(t - l, E);
          if (now !== last) main.innerHTML = last = now;
          if (back) { const b = gag.back!(t - l, E); if (b !== lastBack) back.innerHTML = lastBack = b; }
          if (front) { const f = gag.front!(t - l, E); if (f !== lastFront) front.innerHTML = lastFront = f; }
          // (Scenery the gag moves without drawing it: Clearwater's aspen shivers when the ball pings off it.)
          opts.frame?.(t - l);
          if (over) {
            const o = gag.over!(t - l, E);
            if (o !== lastOver) over.innerHTML = lastOver = o;
          }
          if (anchor && mouth) {
            const at = toScreen(g, mouth(t - l, E).x, mouth(t - l, E).y);
            anchor.style.left = `${at.x}px`;
            anchor.style.top = `${at.y}px`;
          }
          for (const s of spoken) {
            const at = toScreen(g, s.line.mouth(t - l).x, s.line.mouth(t - l).y);
            s.anchor.style.left = `${at.x}px`;
            s.anchor.style.top = `${at.y}px`;
          }
        },
        ...(spoken.length ? { lines: spoken.map((s) => ({ from: l + s.line.from, to: l + s.line.to, text: opts.lines![s.line.key], at: () => toScreen(g, s.line.mouth(s.line.from).x, s.line.mouth(s.line.from).y), who: () => s.anchor })) } : {}),
        ...(anchor && said ? { bubble: { from: l + said.from, to: l + said.to, text: opts.line!, at: () => toScreen(g, mouth!(said.from, E).x, mouth!(said.from, E).y), who: () => anchor } } : {}),
        done: () => { opts.prop?.show(true); opts.reset?.(); },
      };
    },
  };
}

// ---------- The sky band (Aurora Howl) ----------

/** The reference's sky band: the ridge's ground line at y 124, the lease's top berm at y 144, the lights from y 8. */
export const SKY_SCENE = { w: 390, top: 8, floor: 144 } as const;

/** How the reference's sky band lies in the game's (HUD's foot to the board's top). */
export function skyGeom(screenW: number, sky: { top: number; height: number }): SceneGeom {
  if (!(screenW > 0) || !Number.isFinite(sky.top) || !Number.isFinite(sky.height)) {
    const worldH = SKY_SCENE.floor - SKY_SCENE.top;
    return { s: 1, left: 0, worldW: SKY_SCENE.w, worldH, top: SKY_SCENE.top, E: 0, strip: { top: 0, bottom: 0 }, screenW: 0, fits: false };
  }
  const h = Math.max(1, sky.height);
  const s = Math.min(screenW / SKY_SCENE.w, h / (SKY_SCENE.floor - SKY_SCENE.top));
  const worldW = screenW / s, worldH = h / s;
  const left = SKY_SCENE.w / 2 - worldW / 2;
  return { s, left, worldW, worldH, top: SKY_SCENE.floor - worldH, E: Math.max(0, -left), strip: { top: sky.top, bottom: sky.top + h }, screenW, fits: s >= SCENE_MIN };
}

/**
 * AURORA HOWL: in the sky band, at night only. Its layer goes on the screen with `mountSky` (over
 * the night's shade, under the lease) and fades with the night (style.css `.aurora-layer`), so if
 * the day comes back the lights and the coyote go with the dark.
 */
export function auroraDef(host: EggHost, night: () => boolean, mountSky: (el: HTMLElement) => void): TimelineDef {
  const gag = gagOf('aurora') as Wave3 & { lights: (t: number, x0: number, x1: number) => string };
  // THE LIGHTS RUN ON BEHIND THE HUD: the aurora's sky is measured from the screen's top, not from under the HUD's row
  // (the HUD is lettering over open sky). So on a short screen, where the lease has moved up for its strip, there is
  // still sky enough for the lights, and the coyote sits on the ridge in the band that is left under the HUD.
  const geom = () => { const sky = host.sky!(); return skyGeom(host.screen.clientWidth, { top: 0, height: sky.top + sky.height }); };
  return {
    name: 'aurora',
    get beats() {
      const l = gag.lead(geom().E);
      return gag.beats.map(([t, id, text], i): [number, string, string] => [i === 0 ? 0 : t + l, id, text]);
    },
    get end() {
      const g = geom();
      return gag.lead(g.E) + gag.dur + gag.tail(g.E);
    },
    get stillAt() {
      return gag.lead(geom().E) + gag.still;
    },
    build(layer) {
      const g = geom();
      if (!night() || !g.fits) return null;
      const el = layer('scene-gag aurora-layer');
      mountSky(el);
      el.innerHTML = '<svg class="scene-svg" preserveAspectRatio="none"><g class="lights"></g><g class="pup"></g></svg>';
      place(el.firstElementChild as SVGSVGElement, g);
      const lights = el.querySelector('.lights')!, pup = el.querySelector('.pup')!;
      const E = g.E, l = gag.lead(E), x0 = Math.floor(g.left / 20) * 20 - 20, x1 = g.left + g.worldW + 20;
      // HIS WAY OUT IS BEHIND THE FRONT TREE LINE. A second drawing of him lies in the scenery
      // itself, just under its front row of trees (so it is dimmed by the night like them), and
      // as he turns to go the one over the trees fades into it: no pop, even behind a tree.
      const under = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      under.setAttribute('class', 'scene-svg aurora-under');
      under.setAttribute('preserveAspectRatio', 'none');
      place(under, g);
      under.style.pointerEvents = 'none';
      const behind = (gag as unknown as { behind: (t: number) => number }).behind.bind(gag);
      let last = '', lastUnder = '';
      return {
        apply(t) {
          lights.innerHTML = gag.lights(t - l, x0, x1);
          const now = gag.render(t - l, E), k = behind(t - l);
          if (now !== last) pup.innerHTML = last = now;
          (pup as SVGGElement).style.opacity = String(1 - k);
          if (k > 0 && !under.isConnected) host.screen.querySelector('.scenery .trees .sc.front')?.before(under);
          const below = k > 0 ? now : '';
          if (below !== lastUnder) under.innerHTML = lastUnder = below;
        },
        done: () => under.remove(),
      };
    },
  };
}

// ---------- Wildlife Log stills ----------

/** A flat still of a wave 3 gag for its log card: the puppets at one moment, cut close. */
export function wave3Still(key: string, t: number, view: [number, number, number, number], back = ''): string {
  const gag = gagOf(key);
  cardMode(true); // (no loose specks on a card: wave3.ts)
  try {
    return `<svg class="egg-still wave3-still" viewBox="${view.join(' ')}" aria-hidden="true">${back}${gag.back ? gag.back(t, 0) : ''}${gag.render(t, 0)}${gag.front ? gag.front(t, 0) : ''}${gag.over ? gag.over(t, 0) : ''}</svg>`;
  } finally {
    cardMode(false);
  }
}
