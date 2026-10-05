import { SolverLimitError, canUndo, getMoveRange, isWon, newGame, nextMove, tryMove, undo, type GameState, type Level, type Move } from '../engine/index.ts';
import { seedFrom } from '../engine/rng.ts';
import { BoardView } from './board-view.ts';
import { sceneryHtml } from './scenery.ts';
import { applyTheme, type Theme } from './themes.ts';
import type { Season } from './trees.ts';
import { NUDGE_LINE, nightForced, nightRgba, nightSky } from './night.ts';
import { hatsHtml } from './hats.ts';
import { copyText } from './clipboard.ts';
import { shareText, streak, zeroIncident } from './daily.ts';
import { hardHats, loadProgress, type Progress, recordDailyClear, recordWin, saveProgress, spendHint } from './progress.ts';
import { streakSignHtml } from './sign.ts';
import { sound } from '../audio/engine.ts';
import { toast } from './toast.ts';
import { uiImg } from './ui-art.ts';
import { preloadSprites } from './sprites.ts';
import { defaultKind } from './vehicles.ts';
import { applyCamo, loadLog, record, saveLog, sightingToast, type Sighting } from './wildlife-log.ts';
import { bearAlways, bearNever, cooldownScale, eggOff, magpieOn, mooseOn, workerOn } from './flags.ts';
import { MooseGag, WorkerGag, workerClearing, type EggHost } from './egg-gags.ts';
import { BackAndForth, GAG_RULES, GAG_TRIGGERS, IDLE_GAGS, Wiggle, bearComes, bermBump, mustWait, wrongGateBump, type GagId } from './gag-triggers.ts';
import { BiffyProp, TimelineGag, biffyADef, biffyBDef, biffyBox, BUSH_X, BushProp, CowProp, PORC_BUSH_X, RiserProp, bushBox, lunchDef, moundSpot, porcupineDef, riserBox, samDef, tongueDef, bearBox, bearDef, bullDef, cowBox, geeseDef, landownerDef, marshmallowDef, nearMissDef } from './strip-gags.ts';
import type { EggResult } from './egg-gags.ts';
import { MagpieGag } from './magpie-gag.ts';
import { companyLine, tierFor } from './company.ts';
import { companyStill, mascotStill } from './win-cast.ts';
import { gsap } from 'gsap';
import { TAP_SLOP, onTap } from './tap.ts';
import type { BumpHit } from './lines.ts';

/** Screen-changing buttons: act on the first tap, even on iOS (see tap.ts). */
const TAPPED = '.win [data-act], .hud [data-act="levels"]';

const WIN_DELAY_MS = 900;
const NOTE_MS = 2600;
/**
 * "Pad cleared!" as SVG text on a shallow arc, so it follows the curve of the win card's banner.
 * Two copies: a dark one a little lower (the lettering's bottom lip) and the yellow one on top.
 */
const BANNER_TEXT =
  '<svg viewBox="0 0 220 44" aria-hidden="true"><defs><path id="banner-arc" d="M8 31.5 Q110 21.5 212 31.5"/></defs>' +
  ['lip', 'ink'].map((c) => `<text class="${c}"${c === 'lip' ? ' transform="translate(0 3)"' : ''}><textPath href="#banner-arc" startOffset="50%" text-anchor="middle">Pad cleared!</textPath></text>`).join('') +
  '</svg>';
/** Night sky: about how far the tree tops rise above the horizon line, and the open sky the moon needs (px). */
const TREE_RISE = 70;
const MOON_ROOM = 40;
/** The perfect-solve confetti: how long the whole burst lasts, and how many pieces. */
const CONFETTI_MS = 1600;
const CONFETTI_PIECES = 40;

export interface GameViewHandlers {
  onLevels: () => void;
  onNext: (() => void) | null;
}

/** Set when this game is today's Daily Pad. */
export interface DailyInfo {
  pad: number;
  /** Local date the pad belongs to ('YYYY-MM-DD'). */
  day: string;
}

/** One level in play: HUD, board, undo/hint/restart, and the win screen. */
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class GameView {
  readonly el: HTMLElement;
  private state: GameState;
  private board: BoardView;
  private movesEl: HTMLElement;
  private missesEl: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private hintBtn: HTMLButtonElement;
  private noteEl: HTMLElement;
  private winEl: HTMLElement;
  /** The win card's character motion (killed when the card is replaced). */
  private winMotion: gsap.core.Animation[] = [];
  private stage: HTMLElement;
  private level: Level;
  private handlers: GameViewHandlers;
  /** 0 = no hint showing, 1 = truck highlighted, 2 = destination shown. */
  private hintStep: 0 | 1 | 2 = 0;
  private hint: Move | null = null;
  private noteTimer = 0;
  private theme: Theme;
  private daily: DailyInfo | null;
  /** Bumps (near misses) this attempt. */
  private bumps = 0;
  private shareMessage = '';
  private scenery: HTMLElement;
  /** Which region this level is in ('daily' for the Daily Pad): the gopher's mound is Cardium's. */
  private regionId: string;

  /** Null while gags are switched off (flags.ts). */
  /**
   * The Easter-egg gags that are live, each its own code puppet, each null if switched off:
   * the magpie (10 s with no moves), the sleepy worker (20 s with no moves) and the moose (Duvernay:
   * two bumps into the top berm). One at a time, none while a truck moves (`tickEggs`).
   */
  private magpie: MagpieGag | null = null;
  private worker: WorkerGag | null = null;
  private moose: MooseGag | null = null;
  /** When the player last made or started a move, or the last gag left: the idle gags count from here. */
  private lastMoveAt = performance.now();
  /** The last thing the PLAYER did (gags leaving do not count): the night nudge's clock. */
  private lastPlayAt = performance.now();
  private night = false;
  private nudged = false;
  private nightShade: HTMLElement | null = null;
  /** The bottom-strip gags (strip-gags.ts): Near Miss, the landowner, Biffy A and B. Each null if it cannot play here. */
  private strips: Partial<Record<GagId, TimelineGag>> = {};
  /** The biffy: permanent scenery in the bottom strip of every level. */
  private biffy: BiffyProp | null = null;
  /** Done this level (each gag plays once; one that was scared off or cancelled may try again). */
  private eggDone = new Set<GagId>();
  /** Gags the player has set off, waiting for the stage to be free. */
  /** Gags waiting for a character or prop another gag is using. */
  private eggQueue: GagId[] = [];
  /** Gags on stage right now (several may play at once). */
  private eggsOn = new Set<GagId>();
  private wiggle = new Wiggle();
  private bushTaps = 0;
  /** When night began to fall (0 by day). */
  private nightAt = 0;
  /** Trigger bookkeeping (gag-triggers.ts): bumps into the top berm, the last exit, back-and-forth moves, a first bump into the bottom berm waiting to see if it becomes a double. */
  private topBumps = 0;
  private lastExitAt = -Infinity;
  private undos = 0;
  private lastIdleGagAt = -Infinity;
  private bush: BushProp | null = null;
  private riser: RiserProp | null = null;
  /** Blocked moves in a row (Safety Sam). */
  private bumpRun = 0;
  private cow: CowProp | null = null;
  private cowTaps = 0;
  private won: { before: Progress; progress: Progress; earnedHint: boolean } | null = null;
  private flareTaps = 0;
  private backForth = new BackAndForth();
  private biffyWait = 0;
  private eggTimer = 0;
  /** ?gag=magpie|worker|moose: play that one straight away, again and again. */
  private eggForced: GagId | null = null;
  private idleScale = 1;

  constructor(
    level: Level,
    label: string,
    theme: Theme,
    handlers: GameViewHandlers,
    daily: DailyInfo | null = null,
    where: { regionId: string; levelIndex: number; force?: GagId | null } = { regionId: 'daily', levelIndex: 0 },
  ) {
    this.level = level;
    this.regionId = where.regionId;
    this.theme = theme;
    this.daily = daily;
    this.handlers = handlers;
    this.state = newGame(level);
    preloadSprites(level.trucks.map((t) => ({ kind: t.kind ?? defaultKind(t.length), color: t.color })));
    this.board = new BoardView(
      () => this.state,
      (id, delta) => this.move(id, delta),
      (id, direction, hit) => this.onBump(id, direction, hit),
    );
    const board = this.board;
    this.idleScale = idleScale();
    // A `?gag=` preview: that gag alone, again and again.
    this.eggForced = where.force ?? null;
    board.onGrab = (id) => {
      this.played();
      this.wiggle.start();
      this.magpie?.grabbed(id);
      // Any move sends the worker running, pail in hand.
      this.worker?.cancel();
    };
    // The landowner's fast wiggle: reversals of one truck inside one drag (gag-triggers.ts).
    board.onReverse = () => {
      if (this.wiggle.reversal(performance.now())) this.fire('landowner');
    };
    this.el = document.createElement('div');
    this.el.className = 'screen game';
    this.el.innerHTML = `
      <div class="scenery" aria-hidden="true"></div>
      <div class="vignette" aria-hidden="true"></div>
      <header class="hud">
        <button class="link" data-act="levels" aria-label="Back to levels">${uiImg('icon_back', 'back-icon')}Levels</button>
        <div class="title"><span class="num"></span><span class="name"></span></div>
        <div class="score">
          <span class="score-row">
            <span class="moves">0</span>
            <span class="par">par ${level.par}</span>
          </span>
          <span class="misses" aria-label="0 near misses"><svg class="hazard" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2 L22.5 20 H1.5 Z"/><rect x="11" y="8" width="2" height="6.5" rx="1"/><circle cx="12" cy="17" r="1.3"/></svg><b>0</b><span class="lbl">near misses</span></span>
        </div>
      </header>
      <main class="stage"></main>
      <p class="note" aria-live="polite"></p>
      <footer class="controls">
        <button class="btn" data-act="undo">Undo</button>
        <button class="btn hint-btn" data-act="hint"></button>
        <button class="btn" data-act="restart">Restart</button>
      </footer>
      <div class="overlay win" hidden></div>`;
    this.el.querySelector('.num')!.textContent = label;
    this.el.querySelector('.name')!.textContent = level.name;
    this.movesEl = this.el.querySelector('.moves')!;
    this.missesEl = this.el.querySelector('.misses')!;
    this.undoBtn = this.el.querySelector('[data-act="undo"]')!;
    this.hintBtn = this.el.querySelector('[data-act="hint"]')!;
    this.noteEl = this.el.querySelector('.note')!;
    this.winEl = this.el.querySelector('.win')!;
    this.stage = this.el.querySelector('.stage')!;
    this.scenery = this.el.querySelector('.scenery')!;
    applyTheme(this.el, theme);
    this.el.style.setProperty('--night', nightRgba(theme.ground));
    this.el.style.setProperty('--night-in', `${GAG_TRIGGERS.night.fadeInMs}ms`);
    this.el.style.setProperty('--night-out', `${GAG_TRIGGERS.night.fadeOutMs}ms`);
    this.stage.append(this.board.el);
    this.board.setLevel(level);
    this.board.setGround(theme.ground);
    sound.setGround(theme.ground);
    if (magpieOn() || this.eggForced === 'magpie') this.magpie = new MagpieGag({ mount: (el) => this.mount(el), screen: this.el, truckElement: (id) => board.truckElement(id), state: () => this.state, say: (anchor, text) => board.say(anchor, text) });
    {
      const egg: EggHost = {
        screen: this.el,
        board: board.el,
        cellPx: () => board.cellPx,
        bandPx: () => board.fencePx,
        strip: () => this.strip(),
        above: () => Math.max(0, board.el.getBoundingClientRect().top - this.el.querySelector('.hud')!.getBoundingClientRect().bottom),
        sky: () => {
          const screen = this.el.getBoundingClientRect();
          const top = this.el.querySelector('.hud')!.getBoundingClientRect().bottom - screen.top;
          return { top, height: Math.max(0, board.el.getBoundingClientRect().top - screen.top - top) };
        },
        state: () => this.state,
        say: (anchor, text) => board.say(anchor, text),
        mount: (el) => this.mount(el),
      };
      if (workerOn() || this.eggForced === 'worker') this.worker = new WorkerGag(egg);
      if ((mooseOn() && this.regionId === GAG_TRIGGERS.moose.region) || this.eggForced === 'moose') this.moose = new MooseGag(egg);
      // The bottom strip: the permanent biffy and its two gags, the landowner, and in Cardium the Near Miss.
      this.biffy = new BiffyProp(egg);
      this.strips = { landowner: new TimelineGag(egg, landownerDef), biffyA: new TimelineGag(egg, biffyADef(this.biffy)), biffyB: new TimelineGag(egg, biffyBDef(this.biffy)) };
      if (this.regionId === GAG_TRIGGERS.nearMiss.region) this.strips.nearMiss = new TimelineGag(egg, nearMissDef);
      // The marshmallow needs a flare stack to roast it on; the geese only need sky.
      if (level.obstacles.some((o) => o.kind === 'flare')) this.strips.marshmallow = new TimelineGag(egg, marshmallowDef);
      this.strips.geese = new TimelineGag(egg, geeseDef);
      // Safety Sam watches every lease; winter levels have the frosty riser and the frozen tongue.
      if (!eggOff('sam')) this.strips.sam = new TimelineGag(egg, samDef);
      if (theme.id === GAG_TRIGGERS.tongue.theme || this.eggForced === 'tongue') {
        this.riser = new RiserProp(egg);
        if (!eggOff('tongue')) this.strips.tongue = new TimelineGag(egg, tongueDef(this.riser));
      }
      // Cardium: the porcupine's bush (the board's own bush, at the gags' size) and gopher lunch at the mound.
      if (this.regionId === GAG_TRIGGERS.porcupine.region || this.eggForced === 'porcupine' || this.eggForced === 'gopherLunch') {
        if (!eggOff('porcupine')) {
          this.bush = new BushProp(egg, PORC_BUSH_X, theme.id as Season);
          this.strips.porcupine = new TimelineGag(egg, porcupineDef(this.bush));
        }
        if (!eggOff('lunch')) this.strips.gopherLunch = new TimelineGag(egg, lunchDef);
      }
      // Montney has the cow grazing in the strip; tap her and the bull comes.
      if (this.regionId === GAG_TRIGGERS.bull.region || this.eggForced === 'bull') {
        this.cow = new CowProp(egg);
        this.strips.bull = new TimelineGag(egg, bullDef(this.cow));
      }
      // Every level of the bear's region has his snowy bush, and the hare behind it. Tap it (below).
      if (this.regionId === GAG_TRIGGERS.bear.region || this.eggForced === 'bear') {
        this.bush = new BushProp(egg, BUSH_X, 'winter');
        this.strips.bear = new TimelineGag(egg, bearDef(this.bush));
      }
      // Taps on a flare stack (gag-triggers.ts): a touch that lifts where it landed, on a flare's picture.
      let down: { x: number; y: number } | null = null;
      this.el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }), { capture: true });
      this.el.addEventListener(
        'pointerup',
        (e) => {
          const tap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < TAP_SLOP;
          down = null;
          if (!tap) return;
          // The porcupine's trigger is TBD: in demo mode only, a tap on the bush plays it.
          const onBush = !!this.bush?.hit(e.clientX, e.clientY);
          if (onBush && this.strips.porcupine && GAG_TRIGGERS.porcupine.demoTapBush && loadProgress().demo) this.fire('porcupine');
          // The bear: every so many taps on his bush he may come; otherwise it shakes and drops a puff of snow.
          if (onBush && this.strips.bear && !this.eggsOn.has('bear') && ++this.bushTaps >= GAG_TRIGGERS.bear.bushTaps) {
            this.bushTaps = 0;
            if (!this.eggDone.has('bear') && !bearNever() && bearComes(loadProgress().demo || bearAlways())) this.fire('bear');
            else this.bush!.shake();
          }
          if (this.cow?.hit(e.clientX, e.clientY) && ++this.cowTaps >= GAG_TRIGGERS.bull.cowTaps) this.fire('bull');
          if (!this.strips.marshmallow) return;
          const onFlare = [...board.el.querySelectorAll('.obstacle.flare')].some((ob) => {
            const r = (ob.querySelector('svg') ?? ob).getBoundingClientRect();
            return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6;
          });
          if (onFlare && ++this.flareTaps >= GAG_TRIGGERS.marshmallow.flareTaps) this.fire('marshmallow');
        },
        { capture: true },
      );
      // By themselves (the other gags off), the eggs keep their own clock.
      this.eggTimer = window.setInterval(() => this.tickEggs(), 250);
    }
    // NIGHT (night.ts): its shade lies over the scenery, the strip's props and the strip's gags, under
    // the lease, HUD and buttons; the sky's own night sits behind the trees. Both are clear by day.
    const skyfill = document.createElement('div');
    skyfill.className = 'scene-layer night-skyfill';
    skyfill.setAttribute('aria-hidden', 'true');
    this.el.prepend(skyfill);
    this.nightShade = document.createElement('div');
    this.nightShade.className = 'scene-layer night-shade';
    this.nightShade.setAttribute('aria-hidden', 'true');
    this.el.append(this.nightShade);
    const nightPin = nightForced();
    if (nightPin === true) this.setNight(true);
    if (nightPin !== false) {
      const timer = window.setInterval(() => {
        if (!this.el.isConnected) return void window.clearInterval(timer);
        if (isWon(this.state) || document.hidden) return;
        const now = performance.now();
        // Night falls after a quiet spell; the next thing the player does brings the day back (`played`).
        if (!this.night && !this.board.moving && now - this.lastPlayAt >= GAG_TRIGGERS.night.idleMs * this.idleScale) this.setNight(true);
        // The nudge: a while after night has fully fallen, a truck speaks up. Once per level; never a fail.
        // (Not while a gag is on: its own line may be up, and the bubble is shared.)
        if (this.night && !this.nudged && !this.eggsOn.size && now - this.nightAt >= GAG_TRIGGERS.night.fadeInMs + GAG_TRIGGERS.nightNudge.afterNightMs * this.idleScale) {
          const trucks = this.state.trucks;
          const el = this.board.truckElement(trucks[Math.floor(Math.random() * trucks.length)].id);
          if (!el) return;
          this.nudged = true;
          this.board.say(el.querySelector('.cab') ?? el, NUDGE_LINE).dataset.nudge = '1';
        }
      }, 250);
    }
    this.showLevelHint();

    onTap(this.el, TAPPED, (el) => this.act(el));
    this.el.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (el && !el.matches(TAPPED)) this.act(el); // the rest (Undo, Hint, Restart) use plain clicks
    });
    this.updateHud();
    // Refit whenever the room for the lease changes (Safari's toolbars, rotation, a longer tip line).
    if (typeof ResizeObserver !== 'undefined') {
      let seen = '';
      new ResizeObserver(([entry]) => {
        const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
        if (size !== seen && this.el.isConnected) this.fit();
        seen = size;
      }).observe(this.stage);
    }
  }

  private act(el: HTMLElement): void {
    const act = el.dataset.act;
    if (act === 'levels') this.handlers.onLevels();
    if (act === 'undo') this.undo();
    if (act === 'hint') this.onHint();
    if (act === 'restart') this.restart();
    if (act === 'next') this.handlers.onNext?.();
    if (act === 'share') void this.share(el);
  }

  /** Call after the element is in the document and on every resize. */
  fit(): void {
    const r = this.stage.getBoundingClientRect();
    this.board.resize(r.width, r.height);
    // Sky meets the ground just above the board; trees stand around it.
    const screen = this.el.getBoundingClientRect();
    const b = this.board.el.getBoundingClientRect();
    const box = { x: b.left - screen.left, y: b.top - screen.top, width: b.width, height: b.height };
    const controlsTop = this.el.querySelector('.note')!.getBoundingClientRect().top - screen.top;
    // The groves above the lease stand on a strip of ground: the horizon sits that far above the berm.
    const hudBottom = this.el.querySelector('.hud')!.getBoundingClientRect().bottom - screen.top;
    const depth = Math.round(Math.max(8, Math.min(40, (box.y - hudBottom) * 0.3)));
    this.el.style.setProperty('--horizon', `${Math.round(box.y - 4 - depth)}px`);
    if (this.nightShade) {
      // Stars from the top of the screen down into the open sky; the moon only where there is sky for it above the trees.
      const gap = box.y - 4 - depth - TREE_RISE - hudBottom;
      this.nightShade.innerHTML = nightSky(screen.width, Math.round(hudBottom + Math.max(0, gap) * 0.5 + 22), gap >= MOON_ROOM);
    }
    // Kept clear of trees: the sleepy worker's spot by the left edge, and the biffy's.
    const strip = { top: box.y + box.height, bottom: controlsTop };
    const clearings = [this.worker ? workerClearing(screen.width, strip) : null, this.biffy ? biffyBox(screen.width, strip) : null, this.bush ? (this.bush.x === BUSH_X ? bearBox(screen.width, strip) : bushBox(this.bush.x, screen.width, strip)) : null, this.cow ? cowBox(screen.width, strip) : null, this.riser ? riserBox(screen.width, strip) : null].filter((c) => c !== null);
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, controlsTop, box, { seed: seedFrom(this.level.id), depth, anchors: { bush: !this.bush, mound: this.regionId === 'cardium' }, moundAt: this.strips.gopherLunch || this.strips.nearMiss ? moundSpot(screen.width, strip) : undefined, clearings });
    this.biffy?.layout();
    this.bush?.layout();
    this.riser?.layout();
    if (!this.strips.bull?.playing) this.cow?.layout();
  }

  private move(id: string, delta: number): void {
    const result = tryMove(this.state, id, delta);
    if (!result) {
      this.board.sync(this.state);
      return;
    }
    this.state = result.state;
    this.played();
    this.undos = 0;
    this.bumpRun = 0;
    // Easter-egg triggers (gag-triggers.ts): the same truck back and forth; two exits back to back.
    if (this.backForth.moved(id, delta) >= GAG_TRIGGERS.landowner.backAndForth) this.fire('landowner');
    if (result.exited) {
      const now = performance.now();
      if (now - this.lastExitAt <= GAG_TRIGGERS.nearMiss.backToBackMs) this.fire('nearMiss');
      this.lastExitAt = now;
    }
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state, true, result.exited ? id : undefined);
    this.updateHud();
    if (isWon(this.state)) {
      window.clearInterval(this.eggTimer);
      this.clearEggs();
      setTimeout(() => this.showWin(), WIN_DELAY_MS);
    }
  }

  private undo(): void {
    if (!canUndo(this.state) || isWon(this.state)) return;
    this.state = undo(this.state);
    this.played();
    if (++this.undos >= GAG_TRIGGERS.geese.undosInARow) this.fire('geese');
    this.board.removeLastTrack();
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state);
    this.updateHud();
  }

  private restart(): void {
    this.state = newGame(this.level);
    this.bumps = 0;
    this.showMisses();
    this.resetHint();
    this.clearEggs();
    this.board.setLevel(this.level);
    // A fresh pad: the splat went with the old trucks, and every egg may come again.
    this.resetEggs();
    this.played();
    window.clearInterval(this.eggTimer);
    this.eggTimer = window.setInterval(() => this.tickEggs(), 250);
    this.winEl.hidden = true;
    this.showLevelHint();
    this.updateHud();
  }

  /**
   * A gag played all the way through: the Wildlife Log collects it the first time. In demo mode it
   * goes to the separate demo log, never the real one (and never earns camo). While the Wildlife Log
   * is hidden (gags off) the sighting is still saved, quietly, with no toast.
   */
  private seen(id: Sighting): void {
    // A scene still finishing after you've left the level (or reset) doesn't count.
    if (!this.el.isConnected) return;
    const demo = loadProgress().demo;
    const before = loadLog(demo);
    const r = record(before, id);
    if (!r.isNew) return;
    saveLog(r.log, demo);
    void toast(sightingToast(id, r.count, demo));
    if (demo) {
      if (r.completed) void toast('Demo log complete!', { sub: 'Your real log is unchanged', big: true, ms: 3200 });
    } else if (r.completed) {
      void toast('Wildlife Log complete!', { sub: before.camoEarned ? 'Every sighting found' : 'Camo pickups unlocked', big: true, ms: 3200 });
      applyCamo(r.log);
    }
  }

  /** The bottom strip, in this screen's px: from the berm's bottom edge down to the tip line. */
  private strip(): { top: number; bottom: number } {
    const screen = this.el.getBoundingClientRect();
    return { top: this.board.el.getBoundingClientRect().bottom - screen.top, bottom: this.el.querySelector('.note')!.getBoundingClientRect().top - screen.top };
  }

  private clearEggs(): void {
    this.magpie?.clear();
    this.worker?.clear();
    this.moose?.clear();
    for (const g of Object.values(this.strips)) g?.clear();
    window.clearTimeout(this.biffyWait);
    this.biffyWait = 0;
  }

  /** A fresh pad: every egg may come again, the biffy's door is shut and its indicator green. */
  private resetEggs(): void {
    this.eggDone.clear();
    this.eggQueue = [];
    this.eggsOn.clear();
    this.bushTaps = 0;
    this.topBumps = 0;
    this.undos = 0;
    this.bumpRun = 0;
    this.flareTaps = 0;
    this.cowTaps = 0;
    this.lastExitAt = -Infinity;
    this.backForth.reset();
    this.biffy?.reset();
  }

  /**
   * A gag's trigger fired: it plays right away, even if others are playing (GAG_RULES). It waits
   * only for a gag that shares its character or prop, and then follows it on. Once per level.
   */
  private fire(id: GagId): void {
    if (this.eggForced || isWon(this.state) || this.eggDone.has(id) || this.eggsOn.has(id) || this.eggQueue.includes(id)) return;
    if (id === 'magpie' ? !this.magpie : id === 'worker' ? !this.worker : id === 'moose' ? !this.moose : !this.strips[id]) return;
    if (mustWait(id, this.eggsOn)) this.eggQueue.push(id);
    else this.startEgg(id);
  }

  private startEgg(id: GagId): void {
    this.eggsOn.add(id);
    void this.playEgg(id).then((r) => {
      this.eggsOn.delete(id);
      if (IDLE_GAGS.includes(id) && r !== 'none') this.lastIdleGagAt = performance.now();
      if (this.eggForced) this.lastMoveAt = performance.now() + 900;
      else if (r === 'seen') {
        this.eggDone.add(id);
        this.seen(EGG_SIGHTING[id]);
      }
      // Whoever was waiting for this one's character or prop may come on now.
      const waiting = this.eggQueue;
      this.eggQueue = [];
      for (const next of waiting) if (this.el.isConnected && !isWon(this.state)) this.fire(next);
    });
  }

  /** Something the player did: the idle clocks start again, and if night had fallen the day comes back. */
  private played(): void {
    this.lastMoveAt = this.lastPlayAt = performance.now();
    if (this.night && nightForced() !== true) this.setNight(false);
  }

  /** Night falls (a slow fade) or the day comes back (a quicker one): style.css "Night". */
  private setNight(on: boolean): void {
    if (this.night === on) return;
    this.night = on;
    this.nightAt = on ? performance.now() : 0;
    this.el.classList.toggle('night', on);
    this.board.setNight(on);
  }

  /** Puts a gag's layer on the screen UNDER the night's shade, so the strip's gags dim exactly like the scenery. */
  private mount(el: HTMLElement): void {
    this.el.insertBefore(el, this.nightShade);
  }

  /** The cooldown between the idle gags (GAG_RULES): none in demo mode. */
  private idleCooldownMs(): number {
    return loadProgress().demo ? 0 : GAG_RULES.idleCooldownMs * cooldownScale();
  }

  /** Plays a gag by id. Resolves 'seen' if it counts as a sighting. */
  private playEgg(id: GagId): Promise<EggResult> {
    if (id === 'magpie') return this.magpie?.play().then((ok): EggResult => (ok ? 'seen' : 'cancelled')) ?? Promise.resolve('none');
    if (id === 'worker') return this.worker?.play() ?? Promise.resolve('none');
    if (id === 'moose') return this.moose?.play() ?? Promise.resolve('none');
    return this.strips[id]?.play() ?? Promise.resolve('none');
  }

  /**
   * The idle gags' clock (used while the old gag layer is off). The gags the player sets off play
   * at once (`fire`). The ones that come by themselves when the lease is quiet (IDLE_GAGS: the
   * magpie, the sleepy worker, gopher lunch, the frozen tongue) take turns here: each after its own
   * idle time with no moves, one at a time, with the idle cooldown between them, once per level
   * (one that was scared off or cancelled may try again).
   */
  private tickEggs(): void {
    if (!this.el.isConnected) return void window.clearInterval(this.eggTimer);
    if (document.hidden || isWon(this.state)) return;
    const now = performance.now();
    const idle = now - this.lastMoveAt;
    if (this.eggForced) {
      if (this.eggsOn.size || idle < 600 || this.board.moving) return;
      // A preview plays again and again: the cow comes back for each one.
      if (this.eggForced === 'bull') this.cow?.reset();
      return this.startEgg(this.eggForced);
    }
    if (this.board.moving || IDLE_GAGS.some((g) => this.eggsOn.has(g) || this.eggQueue.includes(g))) return;
    if (now - this.lastIdleGagAt < this.idleCooldownMs()) return;
    const T = GAG_TRIGGERS;
    const due: Record<string, boolean> = {
      magpie: !!this.magpie && idle >= T.magpie.idleMs * this.idleScale,
      worker: !!this.worker && this.worker.canPlay() && idle >= T.worker.idleMs * this.idleScale,
      gopherLunch: !!this.strips.gopherLunch && idle >= T.gopherLunch.idleMs * this.idleScale,
      tongue: !!this.strips.tongue && !!this.riser?.fits && idle >= T.tongue.idleMs * this.idleScale,
    };
    const next = IDLE_GAGS.find((g) => due[g] && !this.eggDone.has(g));
    if (next) this.fire(next);
  }

  /** A bump: count it and give the hazard counter a quick shake. */
  private onBump(truckId: string, direction: 1 | -1, hit: BumpHit): void {
    // Bumps into the berm set gags off (gag-triggers.ts): the top berm for the moose, the bottom
    // one (the biffy's side) for Biffy A, or Biffy B if a second bump follows quickly.
    const bumped = this.state.trucks.find((t) => t.id === truckId);
    const berm = bumped ? bermBump(bumped.orient, direction, hit) : null;
    // Safety Sam: blocked moves piling up, or a push at a wrong-colour gate.
    const wrongGate = GAG_TRIGGERS.sam.wrongGate && !!bumped && wrongGateBump(bumped, direction, hit, this.level.gates);
    if (++this.bumpRun >= GAG_TRIGGERS.sam.bumpsInARow || wrongGate) this.fire('sam');
    if (berm === 'top' && ++this.topBumps >= GAG_TRIGGERS.moose.topBermBumps) this.fire('moose');
    if (berm === 'bottom' && this.biffy) {
      if (this.biffyWait) {
        window.clearTimeout(this.biffyWait);
        this.biffyWait = 0;
        this.fire(this.eggDone.has('biffyB') ? 'biffyA' : 'biffyB');
      } else
        this.biffyWait = window.setTimeout(() => {
          this.biffyWait = 0;
          this.fire(this.eggDone.has('biffyA') ? 'biffyB' : 'biffyA');
        }, GAG_TRIGGERS.biffyB.withinMs);
    }
    this.bumps++;
    this.showMisses();
    this.missesEl.classList.remove('tick');
    void this.missesEl.offsetWidth; // restart the shake
    this.missesEl.classList.add('tick');
  }

  private showMisses(): void {
    this.missesEl.querySelector('b')!.textContent = String(this.bumps);
    this.missesEl.querySelector('.lbl')!.textContent = this.bumps === 1 ? 'near miss' : 'near misses';
    this.missesEl.classList.toggle('some', this.bumps > 0);
    this.missesEl.setAttribute('aria-label', `${this.bumps} near miss${this.bumps === 1 ? '' : 'es'}`);
  }

  // ---------- Hints: tap once for which truck, again for where it goes ----------

  private onHint(): void {
    if (isWon(this.state)) return;
    if (this.hintStep === 1 && this.hint) {
      const range = getMoveRange(this.state, this.hint.id);
      this.board.showHintTarget(this.hint, this.state, range?.exitDelta === this.hint.delta);
      this.hintStep = 2;
      this.note(range?.exitDelta === this.hint.delta ? 'Drive it out through its gate.' : 'Drag it onto its ghost.', true);
      this.updateHud();
      return;
    }
    if (this.hintStep !== 0) return;

    const spent = spendHint(loadProgress());
    if (!spent) {
      this.note('Out of hints. Clear a level at par to earn one.');
      return;
    }
    let move: Move | null;
    try {
      move = nextMove(this.state);
    } catch (e) {
      if (!(e instanceof SolverLimitError)) throw e;
      move = null;
    }
    if (!move) {
      this.note('The dispatcher is stumped too. Try Restart.');
      return;
    }
    saveProgress(spent);
    this.hint = move;
    this.hintStep = 1;
    this.board.showHintTruck(move.id);
    this.note('Move the truck with the bright rim. Tap Where? to see where.', true);
    this.updateHud();
  }

  private resetHint(): void {
    this.hint = null;
    this.hintStep = 0;
    this.board.clearHint();
  }

  /** A short message above the buttons. Non-sticky ones fade back to the level tip. */
  private note(text: string, sticky = false): void {
    clearTimeout(this.noteTimer);
    this.noteEl.textContent = text;
    if (!sticky) this.noteTimer = window.setTimeout(() => this.showLevelHint(), NOTE_MS);
  }

  private showLevelHint(): void {
    clearTimeout(this.noteTimer);
    this.noteEl.textContent = this.state.moves === 0 ? (this.level.hint ?? '') : '';
  }

  private updateHud(): void {
    this.movesEl.textContent = `${this.state.moves} ${this.state.moves === 1 ? 'move' : 'moves'}`;
    const won = isWon(this.state);
    this.undoBtn.disabled = !canUndo(this.state) || won;
    const hints = loadProgress().hints;
    if (this.hintStep === 1) this.hintBtn.textContent = 'Where?';
    else this.hintBtn.innerHTML = `Hint <span class="count">${hints}</span>`;
    this.hintBtn.disabled = won || this.hintStep === 2;
    this.hintBtn.classList.toggle('empty', hints === 0 && this.hintStep === 0);
  }

  /** Saves the win (once, however long the card takes to come) and says what it changed. */
  private recordWinOnce(): NonNullable<GameView['won']> {
    if (this.won) return this.won;
    const before = loadProgress();
    let { progress, earnedHint } = recordWin(before, this.level.id, this.state.moves, this.level.par);
    if (this.daily) progress = recordDailyClear(progress, this.daily.day);
    saveProgress(progress);
    return (this.won = { before, progress, earnedHint });
  }

  private showWin(): void {
    const { moves } = this.state;
    const { par } = this.level;
    const { before, progress, earnedHint } = this.recordWinOnce();
    this.won = null;
    this.updateHud();
    const hats = hardHats(moves, par);
    const clean = zeroIncident(moves, par, this.bumps);
    const verdict = moves === par ? 'Right on par. Textbook.' : `${moves - par} over par`;
    const misses = `${this.bumps} near miss${this.bumps === 1 ? '' : 'es'}`;

    let daily = '';
    if (this.daily) {
      const s = streak(progress.dailyCleared, this.daily.day);
      if (s.days > streak(before.dailyCleared, this.daily.day).days) sound.streakUp();
      this.shareMessage = shareText({ pad: this.daily.pad, moves, par, hats, zeroIncident: clean, streak: s.days });
      daily = `${streakSignHtml(s, true)}<button class="btn primary share" data-act="share">Share result</button>`;
    }
    const next = this.daily
      ? ''
      : this.handlers.onNext
        ? '<button class="btn primary" data-act="next">Next level ›</button>'
        : '<p class="verdict">That was the last level in this field. Nice work!</p>';

    this.winMotion.forEach((t) => t.kill());
    this.winMotion = [];
    this.winEl.innerHTML = `
      <div class="card">
        <h2 aria-label="Pad cleared!">${BANNER_TEXT}</h2>
        ${clean ? `<div class="zero-incident" role="img" aria-label="Zero incident"><span>ZERO INCIDENT</span></div>` : ''}
        <div class="score-row">
          <div class="mascot" aria-hidden="true"></div>
          <div class="hats big" aria-label="${hats} of 3 hard hats">${hatsHtml(hats)}</div>
        </div>
        <p class="result">${moves} moves · par ${par} · ${misses}</p>
        <div class="company" aria-label="${verdict}">
          <div class="company-man"></div>
          <p class="company-says"></p>
        </div>
        ${earnedHint ? '<p class="earned">+1 hint for a perfect solve</p>' : ''}
        ${daily}
        ${next}
        <div class="btn-row">
          <button class="btn" data-act="restart">Play again</button>
          <button class="btn quiet" data-act="levels">All levels</button>
        </div>
      </div>`;
    this.winEl.querySelector('.company-says')!.textContent = companyLine(moves, par);
    setBannerCap(this.winEl.querySelector<HTMLElement>('.card h2')!);
    // The characters are flat puppet stills in the worker's build (win-cast.ts), one expression per
    // result (par, close, over), moved only by the little GSAP motion below.
    const tier = tierFor(moves, par);
    const perfect = moves <= par;
    this.winEl.hidden = false;
    // Once the card is laid out: fit the medal's lettering to its ribbon.
    fitRibbon(this.winEl.querySelector<HTMLElement>('.zero-incident span'));
    const bossBox = this.winEl.querySelector<HTMLElement>('.company-man')!;
    const boss = companyStill(tier);
    bossBox.append(boss);
    const mascotBox = this.winEl.querySelector<HTMLElement>('.mascot')!;
    const mascot = mascotStill(tier);
    mascotBox.append(mascot);
    if (perfect && !reducedMotion()) this.confetti();
    if (!reducedMotion()) {
      // Roughneck: one bounce with squash and stretch (and a small lift of the wrench arm), then he
      // breathes. Everything turns about his boots, so he never shifts on the card.
      gsap.set(mascot, { transformOrigin: '50% 94%' });
      const m = gsap.timeline({ delay: 0.3 });
      if (perfect) {
        m.to(mascot, { scaleY: 0.86, scaleX: 1.1, duration: 0.14, ease: 'power2.out' })
          .to(mascot, { y: -16, scaleY: 1.1, scaleX: 0.94, rotation: -5, duration: 0.24, ease: 'power2.out' })
          .to(mascot, { y: 0, scaleY: 1, scaleX: 1, rotation: 0, duration: 0.2, ease: 'power2.in' })
          .to(mascot, { scaleY: 0.9, scaleX: 1.07, duration: 0.09, ease: 'power1.out' })
          .to(mascot, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
      }
      m.to(mascot, { scaleY: 1.025, scaleX: 0.992, duration: 1.7, ease: 'sine.inOut', repeat: -1, yoyo: true });
      // Company Man: one slow, small nod as his line appears, then he holds still.
      gsap.set(boss, { transformOrigin: '50% 100%' });
      const b = gsap.timeline({ delay: 0.45 });
      b.to(boss, { rotation: 5, y: 2.5, duration: 0.55, ease: 'sine.inOut' }).to(boss, { rotation: 0, y: 0, duration: 0.7, ease: 'sine.inOut' });
      this.winMotion = [m, b];
    }
    sound.win(hats, moves, par);
  }

  /**
   * A perfect solve: a short burst of small hard hats and orange and yellow scraps falling behind
   * the card (the layer sits under it, so nothing ever covers a button). Gone after CONFETTI_MS.
   */
  private confetti(): void {
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.setProperty('--ui-hat', `url("${new URL('./sprites/ui/icon_hardhat_full.webp', location.href).href}")`);
    const colors = ['#ff8a00', '#ffb347', '#ffd21f', '#ff6a2b'];
    const h = this.winEl.clientHeight;
    let html = '';
    for (let i = 0; i < CONFETTI_PIECES; i++) {
      const hat = i % 4 === 0;
      const size = hat ? 16 + Math.random() * 6 : 6 + Math.random() * 5;
      const style = [
        `--x:${(Math.random() * 100).toFixed(1)}%`,
        `--w:${size.toFixed(0)}px`,
        `--h:${(hat ? size : size * (0.5 + Math.random() * 0.7)).toFixed(0)}px`,
        `--bg:${colors[i % colors.length]}`,
        `--d:${(Math.random() * 0.45).toFixed(2)}s`,
        `--t:${(0.85 + Math.random() * 0.25).toFixed(2)}s`,
        `--dx:${((Math.random() - 0.5) * 90).toFixed(0)}px`,
        `--fall:${(h * (0.55 + Math.random() * 0.5)).toFixed(0)}px`,
        `--spin:${((Math.random() - 0.5) * 900).toFixed(0)}deg`,
      ].join(';');
      html += `<i class="${hat ? 'hat' : 'scrap'}" style="${style}"></i>`;
    }
    layer.innerHTML = html;
    this.winEl.prepend(layer);
    setTimeout(() => layer.remove(), CONFETTI_MS);
  }

  /** One tap: copy the spoiler-free result, ready to paste into Messages. */
  private async share(button: HTMLElement): Promise<void> {
    const ok = await copyText(this.shareMessage);
    button.textContent = ok ? 'Copied! Paste it in Messages' : 'Could not copy';
    button.classList.toggle('done', ok);
  }
}

/** Preview/test hook: ?idle=0.1 makes the magpie and spotter turn up 10x sooner. */
function idleScale(): number {
  const v = Number(new URLSearchParams(location.search).get('idle'));
  return v > 0 && v <= 1 ? v : 1;
}

/**
 * Tells the win banner how tall its capitals really are (`--cap`, in the banner SVG's px), measured
 * from the font itself, so the letters can be centred on the ribbon by their own metrics in any
 * browser. Measured again once the font has loaded; the CSS fallback stands in until then.
 */
function setBannerCap(h2: HTMLElement): void {
  const font = `700 ${BANNER_FONT_PX}px ${getComputedStyle(h2).fontFamily}`;
  const measure = () => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.font = font;
    const cap = ctx.measureText('P').actualBoundingBoxAscent;
    if (cap > BANNER_FONT_PX * 0.5 && cap < BANNER_FONT_PX) h2.style.setProperty('--cap', `${cap.toFixed(2)}px`);
  };
  measure();
  void document.fonts?.load(font).then(measure, () => {});
}
/** The banner lettering's font size in its SVG's px (style.css `.win .card h2 text`). */
const BANNER_FONT_PX = 21;

/**
 * Fits the medal's lettering to its ribbon: the text is stepped down until it is no wider than the
 * field (which already keeps 4px clear each side), so no letter is ever cut off. Fitted again once
 * the font has loaded.
 */
function fitRibbon(span: HTMLElement | null): void {
  if (!span) return;
  const fit = () => {
    span.style.fontSize = '';
    const cs = getComputedStyle(span);
    const room = span.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // Measured from the font itself (a probe element inside the ribbon would take the ribbon's own styles).
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const wide = ctx.measureText(span.textContent ?? '').width;
    if (wide > room && wide > 0) span.style.fontSize = `${((parseFloat(cs.fontSize) * room) / wide).toFixed(2)}px`;
  };
  fit();
  void document.fonts?.ready.then(fit, () => {});
}

/** Which Wildlife Log entry each egg fills in. */
const EGG_SIGHTING: Record<GagId, Sighting> = { magpie: 'magpie', worker: 'spotter', moose: 'moose', nearMiss: 'nearmiss', landowner: 'landowner', biffyA: 'biffy', biffyB: 'biffyB', marshmallow: 'marshmallow', geese: 'geese', bear: 'bear', bull: 'bull', porcupine: 'porcupine', gopherLunch: 'lunch', sam: 'sam', tongue: 'tongue' };
