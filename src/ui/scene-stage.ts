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
import type { Season } from './trees.ts';
import { BOX, sizeFor, treeArt, type Species } from './trees.ts';
import type { TimelineDef } from './strip-gags.ts';
import { BALE_AT, MUSKEG, WAVE3, baleAtRest, rng, tuft } from './wave3.ts';

/** The reference's strip, in its own units. */
export const SCENE = { w: 390, top: 30, floor: 168, ground: 150 } as const;
/** Below this scale the strip is too short for these gags: they do not play there. */
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
export function sceneGeom(screenW: number, strip: { top: number; bottom: number }): SceneGeom {
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
  { species: 'willow', x: 238, base: 128, h: 22 },
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
    return (this.g ??= sceneGeom(this.host.screen.clientWidth, this.host.strip()));
  }

  /** Call when the screen changes size. */
  layout(): void {
    const g = (this.g = sceneGeom(this.host.screen.clientWidth, this.host.strip()));
    for (const el of [this.layer, this.front]) place(el.firstElementChild as SVGSVGElement, g);
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

/** Puts a scene's SVG over the strip, showing the world at the strip's scale. */
function place(svg: SVGSVGElement, g: SceneGeom): void {
  Object.assign(svg.style, { position: 'absolute', left: '0px', top: `${g.strip.top}px`, width: `${g.screenW}px`, height: `${g.strip.bottom - g.strip.top}px` });
  // (Never a NaN or an empty view: a scene with no screen yet keeps the view it had.)
  if ([g.left, g.top, g.worldW, g.worldH].every(Number.isFinite) && g.worldW > 0 && g.worldH > 0) svg.setAttribute('viewBox', viewBox(g));
}

// ---------- Playing a ported gag ----------

type Wave3 = { name: string; dur: number; still: number; beats: [number, string, string][]; lead: (E: number) => number; tail: (E: number) => number; render: (t: number, E: number) => string; over?: (t: number, E: number) => string };
const gagOf = (key: string) => (WAVE3 as Record<string, Wave3>)[key];

/**
 * A strip gag of wave 3 as a timeline: one layer with the moving part of the scene (behind the
 * lane aspen) and, where the gag has sound words or Zs, one more over the aspen. Both take no
 * touches. The clock runs from `lead` seconds before the reference's t = 0 (its walk-in from the
 * screen's real edge) to `tail` seconds after its end; every beat keeps the reference's time.
 */
export function sceneDef(name: string, key: string, geom: () => SceneGeom | null, opts: { prop?: { show: (on: boolean) => void }; line?: string; overLease?: boolean } = {}): TimelineDef {
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
      // `overLease`: drawn over the board and its berm (the personal cloud floats up at the berm; it must never go behind it).
      const main = svgIn(layer(opts.overLease ? 'scene-gag over-lease' : 'scene-gag'));
      const over = gag.over ? svgIn(layer('scene-gag scene-over')) : null;
      let last = '', lastOver = '';
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
      return {
        apply(t) {
          const now = gag.render(t - l, E);
          if (now !== last) main.innerHTML = last = now;
          if (over) {
            const o = gag.over!(t - l, E);
            if (o !== lastOver) over.innerHTML = lastOver = o;
          }
          if (anchor && mouth) {
            const at = toScreen(g, mouth(t - l, E).x, mouth(t - l, E).y);
            anchor.style.left = `${at.x}px`;
            anchor.style.top = `${at.y}px`;
          }
        },
        ...(anchor && said ? { bubble: { from: l + said.from, to: l + said.to, text: opts.line!, at: () => toScreen(g, mouth!(said.from, E).x, mouth!(said.from, E).y), who: () => anchor } } : {}),
        done: () => opts.prop?.show(true),
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
  const geom = () => skyGeom(host.screen.clientWidth, host.sky!());
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
  return `<svg class="egg-still wave3-still" viewBox="${view.join(' ')}" aria-hidden="true">${back}${gag.render(t, 0)}${gag.over ? gag.over(t, 0) : ''}</svg>`;
}
