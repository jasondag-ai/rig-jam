// THE FINALE (October upgrade, job U9): the secret ending for a perfect game, ported from
// `~/Desktop/RHR Art Inbox/finale_reference.html` (its art: finale-art.ts; its rules: finale-state.ts).
// FOUR PARTS, with the page's beats, lines and timing, then the game's own opening screen:
//   1. `card`    THE PERFECT GAME CARD: the win card's own frame, with the game's own counts and one button, Crew photo.
//   2. `photo`   THE CREW PHOTO on the strip: Moe sets the self-timer and hurries to his spot, the magpie lands on his
//                hard hat, SPLAT and FLASH together, and the Polaroid (a front-view still) drops onto the lease.
//   3. `credits` The screen goes dark, the photo moves up and the credits roll under it. A tap skips them.
//   4. `still`   STILL HERE: the view closes in on the biffy, Moe leans out in his robe brushing his teeth.
//   Then the cover (cover.ts ITSELF, handed a holder to build in: `onCover`), faded up over the close-up.
// ITS OWN STAGE: an empty Cardium pad (the real board: its pad, berm and gates, every truck gone), the summer sky and
// trees, and a strip with only the biffy (the game's own drawing, at the page's spot, so the close-up can open its
// door). The HUD and the three buttons are the game's own, standing still. NOTHING OF IT COVERS THE HUD OR THE BUTTONS
// BEFORE THE CLOSE-UP, but for the two things that are the page's own: the camera's flash and the dark the credits
// roll on. (The flash and the Polaroid lie under the HUD; the card stands between the HUD and the buttons.)
// THE PHOTO IS A CUT, like a film (the page says so): the crew is lined up when the card goes and gone when the
// credits fade back up. Nobody walks in or out.
// Reduced motion: stills. The card as it ends; the Polaroid already down; "Thanks for playing"; Moe at the door.
import { type GameState, type Level } from '../engine/index.ts';
import { sound } from '../audio/engine.ts';
import { BoardView } from './board-view.ts';
import { placeBubble, type BubbleSide } from './bubble.ts';
import { confettiBurst } from './confetti.ts';
import * as ART from './finale-art.ts';
import { FINALE_PARTS, type FinaleCount, type FinalePart } from './finale-state.ts';
import page from './finale-reference.json' with { type: 'json' };
import { bannerSvg, fitRibbon, hintCountText, setBannerCap } from './game-view.ts';
import { hatsHtml } from './hats.ts';
import { FINALE_CREDITS, FINALE_HUD, FINALE_LINES } from './lines.ts';
import { setGround } from './puppet-stage.ts';
import { sceneGeom, toScreen, tree, type SceneGeom } from './scene-stage.ts';
import { sceneryHtml } from './scenery.ts';
import { onTap } from './tap.ts';
import { applyTheme, type Theme } from './themes.ts';
import type { Species } from './trees.ts';
import { uiImg } from './ui-art.ts';
import { companyStill, mascotStill } from './win-cast.ts';

const A = ART as unknown as {
  FIN_SCENE: { w: number; top: number; floor: number }; FIN_TREES: [Species, number, number, number][]; BIF: { x: number; y: number }; ROWS: { back: number; mid: number; front: number };
  MOE_SPOT: number; MOE_CAM: number; SH: { x: number; y: number }; ZOOM_AT: { s: number; cx: number; cy: number }; T_SNAP: number; T_POL: number; POL: { w: number; h: number };
  finLane: (x0: number, x1: number) => string; finTufts: () => string; closeBack: (x0: number, x1: number) => string; biffyBody: () => string; biffyDoor: (door?: number, red?: boolean) => string;
  crew: (t: number, o: { light: boolean; E: number }) => { back: string; mid: string; front: string; over: string }; crewSounds: (t: number) => string; timerOn: (t: number) => boolean;
  polaroidSvg: () => string; stinger: (t: number) => string; stingerWords: (t: number, W: (x: number, y: number) => [number, number]) => string; backOut: (x: number) => number;
};
const PAGE = page as unknown as Record<FinalePart, { dur: number; beats: [number, string][] }>;
/** Each part's length (s): the page's. */
export const FINALE_DUR: Record<FinalePart, number> = { card: PAGE.card.dur, photo: PAGE.photo.dur, credits: PAGE.credits.dur, still: PAGE.still.dur };
/** When the crew goes and the biffy's light turns red (credits), when the credits end and the lease fades back up, when the cover fades in (still), and how long that takes. */
export const CREW_GONE = 0.8, CREDITS_ROLL: [number, number] = [0.8, 11.0], CREDITS_OUT = 12.0, COVER_AT = 10.6, COVER_FADE = 0.7;
/** The lines, when (s into their part) and whose mouth (the strip's world). */
const PHOTO_LINES: { key: keyof typeof FINALE_LINES; from: number; to: number; at: [number, number]; prefer: BubbleSide[] }[] = [
  { key: 'squeeze', from: 0.45, to: 1.6, at: [A.MOE_CAM - 12, A.ROWS.mid - 62], prefer: ['left', 'above'] },
  { key: 'seriously', from: 7.5, to: 8.8, at: [A.MOE_SPOT + 8, A.ROWS.mid - 64], prefer: ['above', 'right'] },
];
/** Still Here's two (s into the part: the page's stinger clock runs 1 s behind the part's). */
const STILL_LINES: { key: keyof typeof FINALE_LINES; from: number; to: number }[] = [{ key: 'still', from: 4.75, to: 6.6 }, { key: 'home', from: 6.8, to: 8.7 }];
const CR_H = { title: 46, line: 26, head: 30, gap: 18, small: 24, end: 40 } as const;
const CR_FONT = { title: 34, line: 18, head: 13, small: 15, end: 28, gap: 0 } as const;
const SKY_LEAST = 6;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const io = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/).slice(0, 3).join('-');
/** Each part's beats [time, id, text], the page's own. */
export const FINALE_BEATS = Object.fromEntries(FINALE_PARTS.map((p) => { const used = new Set<string>(); return [p, PAGE[p].beats.map(([t, text]): [number, string, string] => { let id = slug(text) || 'beat', k = 2; while (used.has(id)) id = `${slug(text)}-${k++}`; used.add(id); return [t, id, text]; })]; })) as Record<FinalePart, [number, string, string][]>;

export interface FinaleOptions {
  counts: FinaleCount;
  /** The player's hints, for the Hint button's count (the buttons stand still here). */
  hints: number;
  /** Build the game's opening screen in `holder` (cover.ts itself) and answer its screen element. */
  onCover: (holder: HTMLElement) => HTMLElement;
  /** The cover has faded up over the close-up: put its screen where the app's screens go. */
  onEnd: (cover: HTMLElement) => void;
  /** "‹ Levels" tapped: leave. */
  onLeave: () => void;
  /** The empty stage only, held (tests: `?finale=stage`). */
  stageOnly?: boolean;
}

export class FinaleView {
  readonly el: HTMLElement;
  private board: BoardView;
  private stage: HTMLElement;
  private depth: HTMLElement;
  private scenery: HTMLElement;
  private theme: Theme;
  private opts: FinaleOptions;
  private g: SceneGeom | null = null;
  private layers: Record<'ground' | 'trees' | 'biffy' | 'back' | 'mid' | 'front' | 'over', HTMLElement>;
  private part: FinalePart | 'stage' | 'cover' = 'stage';
  private started = 0;
  private raf = 0;
  private held: number | null = null;
  private alive = true;
  private red = false;
  private last: Record<string, string> = {};
  private timers: number[] = [];
  private bubble: { el: HTMLElement; key: string } | null = null;
  private over: Partial<Record<'flash' | 'polaroid' | 'dim' | 'credits' | 'close' | 'cover' | 'card', HTMLElement>> = {};

  constructor(level: Level, theme: Theme, opts: FinaleOptions) {
    this.theme = theme;
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'screen game finale';
    applyTheme(this.el, theme);
    // The game's own screen, standing still: its HUD, an empty stage, the tip line's room, the three buttons.
    this.el.innerHTML = `
      <div class="scenery" aria-hidden="true"></div>
      <div class="vignette" aria-hidden="true"></div>
      <header class="hud">
        <button class="link" data-act="levels" aria-label="Back to levels">${uiImg('icon_back', 'back-icon')}Levels</button>
        <div class="title"><span class="num"></span><span class="name"></span></div>
        <span class="hud-spare" aria-hidden="true"></span>
      </header>
      <main class="stage"></main>
      <p class="note" aria-live="polite"></p>
      <footer class="controls" aria-hidden="true">
        <button class="btn" data-act="undo" tabindex="-1" disabled>Undo</button>
        <button class="btn hint-btn" data-act="hint" tabindex="-1">Hint <span class="count">${hintCountText(opts.hints)}</span></button>
        <button class="btn" data-act="restart" tabindex="-1">Restart</button>
      </footer>`;
    // THE HUD READS AS THE ENDING (Jay, Oct 10): the game's name over "Perfect Game", and no moves, par or near misses.
    this.el.querySelector('.num')!.textContent = FINALE_HUD[0];
    this.el.querySelector('.name')!.textContent = FINALE_HUD[1];
    this.scenery = this.el.querySelector('.scenery')!;
    this.stage = this.el.querySelector('.stage')!;
    // The pad as the last truck left it: every truck gone, every gate shut.
    const state: GameState = { level, trucks: [], moves: level.par, history: [] };
    this.board = new BoardView(() => state, () => {});
    this.board.setLevel(level);
    this.board.setGround(theme.ground);
    this.board.sync(state, false);
    this.stage.append(this.board.el);
    // THE DEPTH STRIP (STANDING_RULES 1): the stage's props and the crew's rows are its units, each on its ground line.
    this.depth = document.createElement('div');
    this.depth.className = 'scene-layer puppet-layer depth-strip';
    this.depth.setAttribute('aria-hidden', 'true');
    this.el.querySelector('.vignette')!.after(this.depth);
    const unit = (cls: string, gag = false) => {
      const el = document.createElement('div');
      el.className = `scene-layer puppet-layer ${gag ? 'strip-layer scene-gag' : 'scene-prop'} ${cls}`;
      el.innerHTML = `<svg class="scene-svg" preserveAspectRatio="none">${gag ? '<g class="pup"></g>' : ''}</svg>`;
      if (gag) el.dataset.gag = 'photo';
      this.depth.append(el);
      return el;
    };
    this.layers = { ground: unit('finale-ground'), trees: unit('finale-trees'), biffy: unit('finale-biffy'), back: unit('finale-back', true), mid: unit('finale-mid', true), front: unit('finale-front', true), over: unit('finale-over scene-over', true) };
    this.layers.over.style.zIndex = '100000';
    onTap(this.el, '.hud [data-act="levels"]', () => { if (this.part !== 'still' && this.part !== 'cover') this.opts.onLeave(); });
    // A tap anywhere skips the credits.
    this.el.addEventListener('pointerup', () => { if (this.part === 'credits' && this.time() > 0.3 && this.time() < CREDITS_OUT) this.started = performance.now() - CREDITS_OUT * 1000; });
    if (new URLSearchParams(location.search).get('gagtest') === '1') this.hook();
  }

  // ---------- layout ----------

  private strip(): { top: number; bottom: number } {
    const screen = this.el.getBoundingClientRect();
    return { top: this.board.el.getBoundingClientRect().bottom - screen.top, bottom: this.el.querySelector('.note')!.getBoundingClientRect().top - screen.top };
  }
  private geom(): SceneGeom {
    return (this.g ??= sceneGeom(this.el.clientWidth, this.strip(), A.FIN_SCENE));
  }
  private place(svg: SVGSVGElement, g: SceneGeom): void {
    Object.assign(svg.style, { position: 'absolute', left: '0px', top: `${g.strip.top}px`, width: `${g.screenW}px`, height: `${g.strip.bottom - g.strip.top}px` });
    if ([g.left, g.top, g.worldW, g.worldH].every(Number.isFinite) && g.worldW > 0 && g.worldH > 0) svg.setAttribute('viewBox', `${g.left.toFixed(2)} ${g.top.toFixed(2)} ${g.worldW.toFixed(2)} ${g.worldH.toFixed(2)}`);
  }
  private trees(): string {
    return A.FIN_TREES.map(([species, x, base, h]) => tree({ species, x, base, h }, this.theme.season)).join('');
  }

  /** Call once the screen is in the page, and whenever it changes size. */
  fit(): void {
    const r = this.stage.getBoundingClientRect();
    this.board.resize(r.width, r.height);
    // The spare height goes to the strip first (the crew stands at full size where there is room), never all of the sky's.
    const el = this.board.el, pad = parseFloat(getComputedStyle(this.stage).paddingTop) || 0;
    const spare = r.height - 2 * pad - el.offsetHeight;
    const want = Math.ceil((A.FIN_SCENE.floor - A.FIN_SCENE.top) * Math.min(1, r.width / A.FIN_SCENE.w)) - pad;
    const below = Math.max(spare / 2, Math.min(spare - SKY_LEAST, want));
    el.style.marginBottom = `${Math.max(0, Math.round(2 * below - spare))}px`;
    const screen = this.el.getBoundingClientRect(), b = el.getBoundingClientRect();
    const box = { x: b.left - screen.left, y: b.top - screen.top, width: b.width, height: b.height };
    const hudBottom = this.el.querySelector('.hud')!.getBoundingClientRect().bottom - screen.top;
    const depth = Math.round(Math.max(8, Math.min(40, (box.y - hudBottom) * 0.3)));
    this.el.style.setProperty('--horizon', `${Math.round(box.y - 4 - depth)}px`);
    // Summer's trees above the lease, none below it: the strip has only the finale's own stage.
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, this.strip().bottom, box, { seed: 19, depth, below: false, anchors: { bush: false, mound: false } });
    this.g = null;
    const g = this.geom();
    for (const l of Object.values(this.layers)) this.place(l.firstElementChild as SVGSVGElement, g);
    const line = (y: number) => toScreen(g, 0, y).y;
    setGround(this.layers.ground, g.strip.top - 1, 'set');
    setGround(this.layers.trees, line(Math.max(...A.FIN_TREES.map((t) => t[2]))), 'set');
    setGround(this.layers.biffy, line(A.BIF.y), 'set');
    setGround(this.layers.back, line(A.ROWS.back), 'set');
    setGround(this.layers.mid, line(A.ROWS.mid), 'set');
    setGround(this.layers.front, line(A.ROWS.front), 'set');
    // (The magpie and the sound words lie over them all, whatever their line.)
    setGround(this.layers.over, line(A.FIN_SCENE.floor), 'set');
    this.layers.over.style.zIndex = '100000';
    const x0 = Math.min(0, g.left) - 2, x1 = Math.max(A.FIN_SCENE.w, g.left + g.worldW) + 2;
    this.layers.ground.firstElementChild!.innerHTML = A.finLane(x0, x1) + A.finTufts();
    this.layers.trees.firstElementChild!.innerHTML = this.trees();
    this.drawBiffy();
    this.last = {};
    if (this.part !== 'stage' && this.part !== 'cover') this.apply(this.part, this.time());
  }
  private drawBiffy(): void {
    this.layers.biffy.firstElementChild!.innerHTML = `<g class="fin-biffy" data-light="${this.red ? 'red' : 'green'}">${A.biffyBody()}${A.biffyDoor(1, this.red)}</g>`;
  }

  // ---------- the clock ----------

  /** Starts the ending (or, `stageOnly`, leaves the empty stage standing). */
  start(): void {
    if (this.opts.stageOnly) return;
    sound.finaleWarm();
    this.go('card');
  }
  private time(): number {
    return this.held ?? (performance.now() - this.started) / 1000;
  }
  private go(part: FinalePart): void {
    this.part = part;
    this.started = performance.now();
    this.el.dataset.part = part;
    this.clearBubble();
    if (part === 'card') this.showCard();
    // (A part's own loops never run on into the next: the credits may be skipped while something is still to come.)
    if (part !== 'photo') sound.finaleEnd();
    if (part === 'card' && !reducedMotion()) sound.finale('card', FINALE_BEATS.card[0][1]);
    if (part === 'credits') sound.finaleCredits();
    if (part === 'still') sound.finaleCreditsOver();
    cancelAnimationFrame(this.raf);
    if (part !== 'card') this.tick();
  }
  private tick = (): void => {
    if (!this.alive || this.part === 'stage' || this.part === 'cover' || this.part === 'card') return;
    const part = this.part, t = this.time(), still = reducedMotion();
    this.apply(part, still ? STILL_AT[part] : t);
    const dur = still ? STILL_HOLD[part] : FINALE_DUR[part];
    if (this.held === null && t >= dur) {
      const next = FINALE_PARTS[FINALE_PARTS.indexOf(part) + 1];
      if (next) this.go(next);
      else return;
    }
    if (this.held === null && part === 'still' && !this.over.cover && t >= (still ? STILL_HOLD.still - COVER_FADE - 0.1 : COVER_AT)) this.toCover();
    this.raf = requestAnimationFrame(this.tick);
  };
  private beat(part: FinalePart, t: number): void {
    const beats = FINALE_BEATS[part];
    let at = 0;
    for (let k = 0; k < beats.length; k++) if (t >= beats[k][0]) at = k;
    if (this.beatPart === part && this.beatAt === at) return;
    // The sounds of EVERY beat reached since the last frame (audio/gag-sounds.ts `FINALE_SOUNDS`), each once, in order: a
    // slow frame may pass two beats at once (the photo drops 0.1 s before the magpie's chuckle), and neither may lose
    // its sound. Not for a still, nor a frame held by a test.
    const from = this.beatPart === part ? this.beatAt + 1 : 0;
    if (this.held === null && !reducedMotion()) for (let k = Math.min(from, at); k <= at; k++) sound.finale(part, beats[k][1]);
    this.el.dataset.beat = beats[at][1];
    this.beatPart = part;
    this.beatAt = at;
  }
  private beatAt = 0;
  private beatPart: FinalePart | null = null;
  private set(layer: HTMLElement, html: string, key: string): void {
    if (this.last[key] === html) return;
    this.last[key] = html;
    (layer.querySelector('g.pup') ?? layer.firstElementChild!).innerHTML = html;
  }
  private crew(t: number | null): void {
    const g = this.geom();
    const c = t === null ? { back: '', mid: '', front: '', over: '' } : A.crew(t, { light: A.timerOn(t), E: g.E });
    this.set(this.layers.back, c.back, 'back');
    this.set(this.layers.mid, c.mid, 'mid');
    this.set(this.layers.front, c.front, 'front');
    this.set(this.layers.over, c.over + (t === null ? '' : A.crewSounds(t)), 'over');
  }
  private light(red: boolean): void {
    if (this.red === red) return;
    this.red = red;
    this.drawBiffy();
  }

  /** One part at one moment. */
  private apply(part: FinalePart, t: number): void {
    this.beat(part, t);
    if (part === 'photo') this.photo(t);
    else if (part === 'credits') this.credits(t);
    else if (part === 'still') this.still(t);
  }

  // ---------- 1. The Perfect Game card ----------

  private showCard(): void {
    const c = this.opts.counts, still = reducedMotion();
    const el = (this.over.card = document.createElement('div'));
    el.className = `overlay win finale-win${still ? ' still' : ''}`;
    el.innerHTML = `
      <div class="card finale-card">
        <h2 aria-label="Perfect Game!">${bannerSvg('Perfect Game!')}</h2>
        <div class="zero-incident" role="img" aria-label="Zero incident"><span>ZERO INCIDENT</span></div>
        <div class="score-row">
          <div class="mascot" aria-hidden="true"></div>
          <div class="hats big" aria-label="3 of 3 hard hats">${hatsHtml(3)}</div>
        </div>
        <p class="fin-count fin-pads"><span>Every pad at par</span><b>${c.pads} of ${c.ofPads}</b></p>
        <p class="fin-count fin-sightings"><span>Every sighting found</span><b>${c.sightings} of ${c.ofSightings}</b></p>
        <div class="company" aria-label="The Company Man"><div class="company-man"></div><p class="company-says">...</p></div>
        <button class="btn primary" data-act="photo">Crew photo</button>
      </div>`;
    this.el.append(el);
    setBannerCap(el.querySelector<HTMLElement>('.card h2')!);
    fitRibbon(el.querySelector<HTMLElement>('.zero-incident span'));
    el.querySelector('.mascot')!.append(mascotStill('par'));
    const boss = el.querySelector<HTMLElement>('.company-man')!, says = el.querySelector<HTMLElement>('.company-says')!;
    // The Company Man, who has never once been pleased: unmoved, "...", and then, for the first time ever, he smiles.
    const smile = () => { boss.replaceChildren(companyStill('par')); says.textContent = FINALE_LINES.company; el.dataset.company = 'smiles'; };
    if (still) smile();
    else {
      boss.append(companyStill('close'));
      confettiBurst(el, el.clientHeight);
      this.timers.push(window.setTimeout(smile, 3000));
    }
    let gone = false;
    onTap(el, '[data-act="photo"]', () => {
      if (gone) return;
      gone = true;
      el.classList.add('leaving');
      // THE CUT: the crew is lined up when the card goes.
      this.timers.push(window.setTimeout(() => { el.remove(); delete this.over.card; if (this.alive) this.go('photo'); }, still ? 0 : 520));
    });
  }

  // ---------- 2. The crew photo ----------

  private layer(key: 'flash' | 'polaroid' | 'dim' | 'credits' | 'close', cls: string): HTMLElement {
    let el = this.over[key];
    if (!el) {
      el = this.over[key] = document.createElement('div');
      el.className = cls;
      el.setAttribute('aria-hidden', 'true');
      this.el.append(el);
    }
    return el;
  }
  /** The Polaroid: its middle at (x, y) px, `scale` of its full size, turned `rot` degrees. */
  private polaroid(y: number, scale: number, rot: number, opacity = 1): void {
    const el = this.layer('polaroid', 'finale-polaroid');
    if (!el.firstElementChild) el.innerHTML = `<svg viewBox="0 0 ${A.POL.w} ${A.POL.h}">${A.polaroidSvg()}</svg>`;
    const w = Math.min(A.POL.w * (this.el.clientWidth / 390), this.board.el.offsetWidth * 0.94), h = (w * A.POL.h) / A.POL.w;
    Object.assign(el.style, { width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px`, left: `${((this.el.clientWidth - w) / 2).toFixed(1)}px`, top: `${(y - h / 2).toFixed(1)}px`, transform: `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`, opacity: opacity.toFixed(2) });
  }
  private leaseMid(): number {
    const screen = this.el.getBoundingClientRect(), b = this.board.el.getBoundingClientRect();
    return b.top - screen.top + b.height / 2;
  }
  private say(lines: { key: keyof typeof FINALE_LINES; from: number; to: number }[], t: number, put: (key: string) => void): void {
    const now = lines.find((l) => t >= l.from && t < l.to);
    if (!now) return this.clearBubble();
    if (this.bubble?.key !== now.key) { this.clearBubble(); put(now.key); }
  }
  private clearBubble(): void {
    this.bubble?.el.remove();
    this.bubble = null;
  }
  private photo(t: number): void {
    this.light(false);
    this.crew(t);
    // SPLAT and FLASH at the same moment: a quick white over the lease and the strip, under the HUD and the buttons.
    const f = t > A.T_SNAP - 0.02 && t < 6.5 ? (t < A.T_SNAP + 0.06 ? 1 : 1 - seg(t, A.T_SNAP + 0.06, 6.5)) : 0;
    const flash = this.layer('flash', 'finale-flash');
    flash.style.opacity = reducedMotion() ? '0' : f.toFixed(2);
    // The photo drops onto the lease, taped at the top.
    if (t >= A.T_POL) { const k = seg(t, A.T_POL, 6.6); this.polaroid(lerp(-this.el.clientHeight * 0.2, this.leaseMid(), A.backOut(k)), 1, lerp(-12, -3, k)); }
    else { this.over.polaroid?.remove(); delete this.over.polaroid; }
    // Moe's two lines, in the game's own bubble, its tail at his mouth.
    this.say(PHOTO_LINES, t, (key) => {
      const l = PHOTO_LINES.find((x) => x.key === key)!, g = this.geom(), at = toScreen(g, l.at[0], l.at[1]);
      const anchor = document.createElement('i');
      Object.assign(anchor.style, { position: 'absolute', left: `${at.x}px`, top: `${at.y}px`, width: '0', height: '0' });
      this.el.append(anchor);
      const el = this.board.say(anchor, FINALE_LINES[l.key], l.prefer);
      el.dataset.line = key;
      this.bubble = { el, key };
      const gone = new MutationObserver(() => { if (!el.isConnected) { anchor.remove(); gone.disconnect(); } });
      gone.observe(el.parentElement!, { childList: true });
    });
  }

  // ---------- 3. The credits ----------

  private credits(t: number): void {
    // The crew has gone by the time the dark is down; the biffy's light is red when the lease comes back.
    if (t >= CREW_GONE) { this.crew(null); this.light(true); } else this.crew(FINALE_DUR.photo);
    this.over.flash?.remove();
    delete this.over.flash;
    const H = this.el.clientHeight, W = this.el.clientWidth, k = Math.min(1, W / 390);
    // (As the credits lift, their music fades out with them.)
    if (t >= CREDITS_OUT && this.held === null) sound.finaleCreditsOver();
    const fo = 1 - seg(t, CREDITS_OUT, FINALE_DUR.credits);
    const dim = this.layer('dim', 'finale-dim');
    dim.style.opacity = (t < CREW_GONE ? 0.86 * seg(t, 0, CREW_GONE) : 0.86 * fo).toFixed(3);
    // The photo slides up to the top, a little smaller, and the credits roll up under it.
    const up = io(seg(t, 0, CREW_GONE)), scale = lerp(1, 0.8, up);
    const polH = (this.over.polaroid?.offsetHeight ?? 150) * 0.8, top = Math.max(H * 0.1, 14);
    this.over.polaroid?.classList.add('lifted');
    this.polaroid(lerp(this.leaseMid(), top + polH / 2, up), scale, -3, fo);
    const box = this.layer('credits', 'finale-credits');
    const winTop = top + polH + 10 * k, winH = H - winTop - 16;
    Object.assign(box.style, { top: `${winTop.toFixed(1)}px`, height: `${winH.toFixed(1)}px`, opacity: fo.toFixed(2) });
    if (!box.firstElementChild) {
      let y = 0;
      box.innerHTML = `<div class="roll">${FINALE_CREDITS.map(([s, kind]) => { const row = s ? `<p class="cr-${kind}" style="top:${(y * k).toFixed(1)}px;font-size:${(CR_FONT[kind] * k).toFixed(1)}px" data-y="${y}">${s}</p>` : ''; y += CR_H[kind]; return row; }).join('')}</div>`;
      box.dataset.rows = String(FINALE_CREDITS.filter(([s]) => s).length);
    }
    // The last line stops a third of the way down the window, and holds.
    const lastY = FINALE_CREDITS.slice(0, -1).reduce((y, [, kind]) => y + CR_H[kind], 0) * k;
    const off = lerp(winH + 20 * k, winH * 0.36 - lastY, reducedMotion() ? 1 : seg(t, CREDITS_ROLL[0], CREDITS_ROLL[1]));
    const roll = box.firstElementChild as HTMLElement;
    roll.style.transform = `translateY(${off.toFixed(1)}px)`;
    // (Each line fades in at the window's foot and out at its top: plain opacity, no masks.)
    for (const p of roll.children as HTMLCollectionOf<HTMLElement>) {
      const yy = off + Number(p.dataset.y) * k;
      p.style.opacity = (clamp((yy - 0) / (30 * k)) * clamp((winH - yy) / (30 * k))).toFixed(2);
    }
  }

  // ---------- 4. Still Here ----------

  private still(t: number): void {
    this.crew(null);
    this.light(true);
    for (const key of ['dim', 'polaroid', 'credits', 'flash'] as const) { this.over[key]?.remove(); delete this.over[key]; }
    const g = this.geom(), W = this.el.clientWidth, H = this.el.clientHeight;
    const st = t - 1.0, z = io(seg(t, 0.6, 1.8));
    // The view closes in on the biffy: the strip's own drawings made bigger, about the page's point of it.
    const S1 = A.ZOOM_AT.s * (W / 390);
    const S = lerp(g.s, S1, z), Ax = lerp(-g.left * g.s, W / 2 - A.ZOOM_AT.cx * S1, z), Ay = lerp(g.strip.top - g.top * g.s, H / 2 - A.ZOOM_AT.cy * S1, z);
    const top = lerp(g.strip.top, 0, z), height = lerp(g.strip.bottom - g.strip.top, H, z);
    const close = this.layer('close', 'finale-close');
    // (It comes up over the strip it matches before it begins to grow.)
    Object.assign(close.style, { top: `${top.toFixed(1)}px`, height: `${height.toFixed(1)}px`, opacity: (reducedMotion() ? 1 : seg(t, 0.3, 0.58)).toFixed(2) });
    const world = (x: number, y: number): [number, number] => [Ax + S * x, Ay + S * y];
    if (!close.firstElementChild) close.innerHTML = '<div class="fc-art"></div>';
    const html = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="top:${(-top).toFixed(1)}px"><g transform="translate(${Ax.toFixed(2)} ${Ay.toFixed(2)}) scale(${S.toFixed(4)})">${this.closeStage()}${A.stinger(st)}</g><g class="words">${A.stingerWords(st, world)}</g></svg>`;
    if (this.last.close !== html) { this.last.close = html; close.firstElementChild!.innerHTML = html; }
    // Moe's two lines, at his mouth, in a bubble like the game's (the board's own is under the close-up).
    const now = z >= 1 ? STILL_LINES.find((l) => t >= l.from && t < l.to) : undefined;
    if (!now) return this.clearBubble();
    if (this.bubble?.key === now.key) return;
    this.clearBubble();
    const [x, y] = world(A.SH.x + 6, A.SH.y - 21);
    const b = document.createElement('div');
    b.className = 'bubble';
    b.dataset.line = now.key;
    b.textContent = FINALE_LINES[now.key];
    close.append(b);
    b.style.maxWidth = `${Math.min(W - 16, 240)}px`;
    const at = placeBubble({ left: x - 6, top: y - 8, right: x + 6, bottom: y + 8 }, { w: b.offsetWidth, h: b.offsetHeight }, { left: 8, top: 8, right: W - 8, bottom: H - 8 }, ['right', 'above']);
    b.dataset.side = at.side;
    b.classList.toggle('below', at.side === 'below');
    b.classList.toggle('beside-left', at.side === 'left');
    b.classList.toggle('beside-right', at.side === 'right');
    Object.assign(b.style, { left: `${at.left}px`, top: `${at.top - top}px` });
    b.style.setProperty('--tail', `${at.tail}px`);
    this.bubble = { el: b, key: now.key };
  }
  private closeBack = '';
  private closeStage(): string {
    return (this.closeBack ||= A.closeBack(-900, 1500) + A.finLane(-900, 1500) + A.finTufts() + this.trees());
  }

  // ---------- then the game's own opening screen ----------

  private toCover(): void {
    const holder = (this.over.cover = document.createElement('div'));
    holder.className = 'finale-cover';
    this.el.append(holder);
    sound.finaleMusicOver();
    const cover = this.opts.onCover(holder);
    this.el.dataset.part = 'cover';
    requestAnimationFrame(() => holder.classList.add('up'));
    this.timers.push(window.setTimeout(() => { if (!this.alive) return; this.part = 'cover'; this.alive = false; cancelAnimationFrame(this.raf); this.opts.onEnd(cover); }, reducedMotion() ? 60 : COVER_FADE * 1000 + 80));
  }

  /** Stops it and lets go of its timers (the screen is being taken away). */
  leave(): void {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.timers.forEach((t) => window.clearTimeout(t));
    this.board.stopAmbient();
    sound.finaleEnd();
    sound.finaleMusicOver();
  }

  /** For the tests (`?gagtest=1`): the photo held like any strip gag (`__rhrGag`), and any part at any time (`__rhrFinale`). */
  private hook(): void {
    const END = FINALE_DUR.photo + 0.1;
    const w = window as unknown as { __rhrGag: unknown; __rhrFinale: unknown };
    const hold = (part: FinalePart, t: number) => { this.held = t; this.part = part; this.el.dataset.part = part; this.over.card?.remove(); delete this.over.card; this.apply(part, t); return true; };
    const empty = () => { this.held = null; this.part = 'stage'; delete this.el.dataset.part; this.clearBubble(); this.crew(null); this.light(false); for (const k of ['flash', 'polaroid', 'dim', 'credits', 'close'] as const) { this.over[k]?.remove(); delete this.over[k]; } return true; };
    // THE PHOTO AS A STRIP GAG: empty before it and after it (it is a cut, in and out), the crew between.
    w.__rhrGag = {
      names: () => ['photo'],
      end: () => END,
      beats: () => FINALE_BEATS.photo,
      hold: (_id: string, t: number) => { if (t <= 0 || t >= END) return empty(); hold('photo', Math.min(t, FINALE_DUR.photo)); this.over.polaroid?.remove(); delete this.over.polaroid; this.over.flash?.remove(); delete this.over.flash; return true; },
      release: () => empty(),
    };
    w.__rhrFinale = { hold, release: empty, part: () => this.part, time: () => this.time(), durations: FINALE_DUR };
  }
}
/** Reduced motion: the moment of each part that is shown as a still, and how long it stands (s). */
const STILL_AT: Record<FinalePart, number> = { card: 5, photo: A.T_POL + 0.9, credits: 11.5, still: 5.6 };
const STILL_HOLD: Record<FinalePart, number> = { card: 0, photo: 4, credits: 3.5, still: 5 };
