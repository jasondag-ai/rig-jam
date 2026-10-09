import { EXIT_MOST_MS } from './exit.ts';
import { SolverLimitError, canUndo, getMoveRange, isWon, newGame, nextMove, solve, tryMove, undo, type GameState, type Level, type Move, SIZE, sizeOf } from '../engine/index.ts';
import { seedFrom } from '../engine/rng.ts';
import { BoardView } from './board-view.ts';
import { sceneryHtml } from './scenery.ts';
import { applyTheme, type Theme, type ThemeId } from './themes.ts';
import { WITNESS_REACH, nearestWitness } from './bubble.ts';
import { ghostFinger } from './tutorial.ts';
import { NUDGE_LINE, nightComes, nightForced, nightRgba, nightSky } from './night.ts';
import { WITNESS_LINES } from './lines.ts';
import { hatsHtml } from './hats.ts';
import { copyText } from './clipboard.ts';
import { hintOf, lineAfter, lineFrom } from './hint-line.ts';
import { shareText, streak, zeroIncident } from './daily.ts';
import { hardHats, loadProgress, type Progress, recordDailyClear, recordWin, saveProgress, spendHint } from './progress.ts';
import { streakSignHtml } from './sign.ts';
import { audio, sound } from '../audio/engine.ts';
import { NUDGE_TEXT, markNudgeOffered, nudgeDue, nudgeOffered } from '../audio/sound-nudge.ts';
import { toast } from './toast.ts';
import { uiImg } from './ui-art.ts';
import { preloadSprites } from './sprites.ts';
import { defaultKind } from './vehicles.ts';
import { applyCamo, loadLog, record, saveLog, sightingToast, type Sighting } from './wildlife-log.ts';
import { bearAlways, bearNever, eggOff, gagTest, lunchAlways, lunchNever, rollPinned, magpieOn, mooseOn, workerOn } from './flags.ts';
import { MooseGag, WorkerGag, workerClearing, type EggHost } from './egg-gags.ts';
import { BackAndForth, CHANCES, GAG_TRIGGERS, Wiggle, bermBump, mustWait, wrongGateBump, type GagId } from './gag-triggers.ts';
import { BakkenProp, ClearProp, MANN_SCENE, SCENE, SCENE_MIN, clearStripWanted, sceneStripWanted, MANN_SIGN_X, MannProp, auroraDef, sceneDef } from './scene-stage.ts';
import { BALE_LINE, BELL_LINES, FORE_LINE, PEA_LINES } from './lines.ts';
import { WAVE3 } from './wave3.ts';
import { setSignX, stageBox, stripWanted, WINTER_SIGN_X, BiffyProp, TimelineGag, biffyADef, biffyBDef, biffyBox, biffyLane, SignProp, deerDef, signLane, surveyorDef, touristsDef, BUSH_X, BushProp, CowProp, PORC_BUSH_X, RiserProp, bushBox, lunchDef, moundSpot, porcupineDef, riserBox, samDef, tongueDef, bearBox, bearDef, bullDef, cowBox, geeseDef, landownerDef, marshmallowDef, nearMissDef } from './strip-gags.ts';
import type { EggResult } from './egg-gags.ts';
import { MagpieGag } from './magpie-gag.ts';
import { companyLine, tierFor } from './company.ts';
import { companyStill, mascotStill } from './win-cast.ts';
import { gsap } from 'gsap';
import { TAP_SLOP, onTap } from './tap.ts';
import type { BumpHit } from './lines.ts';
import { confettiBurst } from './confetti.ts';

/** Screen-changing buttons: act on the first tap, even on iOS (see tap.ts). */
/** The level whose board shows the ghost finger until the first drag: Cardium 1. */
const COACH_LEVEL = 'c01';
const TAPPED = '.win [data-act], .hud [data-act="levels"]';

const WIN_DELAY_MS = 900;
/** The gate's arm lifts and the driver waves for this long before the truck pulls out (board-view.ts `WAVE_MS`). */
const EXIT_WAVE_MS = 260;
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
/** The least sky band (px, HUD's foot to the board) in which Mannville's moon is always shown: about what Aurora Howl needs. */
const AURORA_SKY = 40;
/** The hint button's count: up to 9, then "9+" (it has room for one figure). */
export const hintCountText = (hints: number): string => (hints > 9 ? '9+' : String(Math.max(0, hints)));

/** Layers `mount` leaves out of the depth strip: they do not stand in the bottom strip. */
const SKY_LAYERS = ['over-lease', 'magpie-layer', 'geese-layer', 'moose-layer', 'aurora-layer'];

/** The perfect-solve confetti: how long the whole burst lasts, and how many pieces. */

export interface GameViewHandlers {
  onLevels: () => void;
  onNext: (() => void) | null;
  /** Only on the last level of a field: where the win card points next (a button to the next field, or what would open it). */
  onNextField?: (() => { label: string; go: () => void } | { note: string } | null) | null;
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
  /** Cached solve path so subsequent hints on the same line are instant. */
  private hintPath: Move[] | null = null;
  private hintSolving = false;
  private noteTimer = 0;
  private theme: Theme;
  private daily: DailyInfo | null;
  /** Bumps (near misses) this attempt. */
  private bumps = 0;
  private shareMessage = '';
  private scenery: HTMLElement;
  /** Which region this level is in ('daily' for the Daily Pad): the gopher's mound is Cardium's. */
  private regionId: string;
  private bigPad = false;

  /** Null while gags are switched off (flags.ts). */
  /**
   * The gags (sightings) that are live, each its own code puppet, each null if switched off:
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
  private nightSeen = false;
  private nudged = false;
  private nightShade: HTMLElement | null = null;
  private depth: HTMLElement | null = null;
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
  /** Gags that have come on in this level (the Company Man may mention it), and the ones a driver has already remarked on. */
  private gagsThisLevel = new Set<GagId>();
  private witnessed = new Set<GagId>();
  private bushTaps = 0;
  /** When night began to fall (0 by day). */
  private nightAt = 0;
  /** Trigger bookkeeping (gag-triggers.ts): bumps into the top berm, the last exit, back-and-forth moves, a first bump into the bottom berm waiting to see if it becomes a double. */
  /** Level 1's ghost finger, until the first drag. */
  private finger: HTMLElement | null = null;
  private coached = false;
  private topBumps = 0;
  private riserTaps = 0;
  private lastExitAt = -Infinity;
  private undos = 0;
  private bush: BushProp | null = null;
  private riser: RiserProp | null = null;
  /** Blocked moves in a row (Safety Sam). */
  private bumpRun = 0;
  private cow: CowProp | null = null;
  private cowTaps = 0;
  /** The lease sign: permanent scenery in the bottom strip of every level. */
  private sign: SignProp | null = null;
  private signTaps = 0;
  /** The standard Mannville scene (scene-stage.ts), and taps on its big puddle and its lane aspen. */
  private mann: MannProp | null = null;
  /** The standard Bakken scene (the round bale), and taps on the prairie and on the sky. */
  private bakken: BakkenProp | null = null;
  /** Clearwater's standard scene (the Big Pad), and taps on its rig mat stack. */
  private clear: ClearProp | null = null;
  private matTaps = 0;
  /** Trucks driven out one move after another (Dinner Bell, One Pea). */
  private exitRun = 0;
  private prairieTaps: { x: number; y: number; n: number } | null = null;
  private skyTaps = 0;
  private puddleTaps = 0;
  private aspenTaps = 0;
  /** The convoy truck 1 that drove out on the last move (its colour), for the Cat Train. */
  private convoyOut: string | null = null;
  /** The surveyor has been this visit (Restart starts everything else afresh, but not him). */
  private surveyed = false;
  /** The Daily Pad's first move has had its roll for the tourists. */
  private toured = false;
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
    // A BIG PAD (8 x 8, Clearwater): the board takes nearly the whole width, and no gag plays yet (they are drawn for a pad of 6).
    this.bigPad = sizeOf(level) > SIZE;
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
    this.el.className = `screen game${this.bigPad ? ' big-pad' : ''}`;
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
    this.board.setGround(theme.ground, theme.berm === 'sand');
    sound.setGround(theme.ground);
    // The depth strip: every prop, every bottom-strip tree and every strip gag is a child of it, drawn by its ground line. Under the night's shade.
    this.depth = document.createElement('div');
    this.depth.className = 'scene-layer puppet-layer depth-strip';
    this.depth.setAttribute('aria-hidden', 'true');
    this.el.append(this.depth);
    if (magpieOn() || this.eggForced === 'magpie') this.magpie = new MagpieGag({ mount: (el) => this.mount(el), screen: this.el, truckElement: (id) => board.truckElement(id), state: () => this.state, say: (anchor, text, prefer) => board.say(anchor, text, prefer) });
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
        say: (anchor, text, prefer) => board.say(anchor, text, prefer),
        mount: (el) => this.mount(el),
      };
      if (workerOn() || this.eggForced === 'worker') this.worker = new WorkerGag(egg);
      if ((mooseOn() && this.regionId === GAG_TRIGGERS.moose.region) || this.eggForced === 'moose') this.moose = new MooseGag(egg);
      // Mannville: the standard scene (its own trees, three muskeg puddles, the lane aspen in front of
      // every strip gag's characters) and the four gags that play on it.
      const mannGag = (['muskeg', 'catTrain', 'beaver', 'aurora'] as GagId[]).includes(this.eggForced as GagId);
      const inMann = this.regionId === GAG_TRIGGERS.muskeg.region || mannGag;
      // (Mannville's sign stands left of the lane aspen; Duvernay's left of the stage, clear of the sitting bear.)
      // Clearwater: its own standard scene (the sandy two-track, the gold aspen, the rig mat stack, the puddle) and the golf pair.
      const inClear = this.regionId === GAG_TRIGGERS.golf.region || BIG_PAD_GAGS.includes(this.eggForced as GagId);
      setSignX(inMann ? MANN_SIGN_X : theme.season === 'winter' ? WINTER_SIGN_X : undefined);
      if (inClear) this.clear = new ClearProp(egg, theme.season);
      if (inMann) this.mann = new MannProp(egg, theme.season);
      // Bakken: the round bale, in the same spot of every level's bottom strip, and its four gags.
      const bakkenGag = (['tumbleweed', 'pdogs', 'bale', 'cloud'] as GagId[]).includes(this.eggForced as GagId);
      if (this.regionId === GAG_TRIGGERS.bale.region || bakkenGag) this.bakken = new BakkenProp(egg);
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
          this.bush = new BushProp(egg, PORC_BUSH_X, theme.season);
          this.strips.porcupine = new TimelineGag(egg, porcupineDef(this.bush));
        }
        if (!eggOff('lunch')) this.strips.gopherLunch = new TimelineGag(egg, lunchDef);
      }
      // The lease sign: permanent scenery on every level, and three gags at it (the deer and the
      // tourists keep away from winter levels).
      // CLEARWATER HAS NO LEASE SIGN (Jay, Oct 8: no dead props): its visitors would have to work among the scene's own
      // spruce, fireweed and rig mats, with no clean lane to it, so the sign is not stood there at all.
      const signOn = (name: 'surveyor' | 'deer' | 'tourists') => !eggOff(name) && (this.eggForced === name || !(GAG_TRIGGERS[name] as { notThemes?: readonly string[] }).notThemes?.includes(theme.id));
      if (!inClear) {
        const sign = (this.sign = new SignProp(egg));
        if (signOn('surveyor')) this.strips.surveyor = new TimelineGag(egg, surveyorDef(sign));
        if (signOn('deer')) this.strips.deer = new TimelineGag(egg, deerDef(sign));
        if (signOn('tourists')) this.strips.tourists = new TimelineGag(egg, touristsDef(sign));
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
      if (this.mann) {
        const mann = this.mann;
        for (const [id, key] of [['muskeg', 'muskeg'], ['catTrain', 'catTrain'], ['beaver', 'beaver']] as [GagId, string][]) if (!eggOff(id.toLowerCase())) this.strips[id] = new TimelineGag(egg, sceneDef(id, key, () => mann.geom()));
        if (!eggOff('aurora')) this.strips.aurora = new TimelineGag(egg, auroraDef(egg, () => this.night, (el) => this.nightShade?.after(el)));
      }
      if (this.bakken) {
        const bakken = this.bakken;
        for (const id of ['tumbleweed', 'pdogs', 'cloud'] as GagId[]) if (!eggOff(id)) this.strips[id] = new TimelineGag(egg, sceneDef(id, id, () => bakken.geom(), { overLease: id === 'cloud' }));
        if (!eggOff('bale')) this.strips.bale = new TimelineGag(egg, sceneDef('bale', 'bale', () => bakken.geom(), { prop: bakken, line: BALE_LINE }));
      }
      if (this.clear) {
        const clear = this.clear;
        if (!eggOff('golf')) this.strips.golf = new TimelineGag(egg, sceneDef('golf', 'golf', () => clear.geom()));
        // (Out Cold's ball pings off the scenery's own aspen, which shivers; "Fore." is said in the game's bubble.)
        if (!eggOff('cold')) this.strips.cold = new TimelineGag(egg, sceneDef('cold', 'cold', () => clear.geom(), { line: FORE_LINE, frame: (t) => clear.aspen((WAVE3 as unknown as { cold: { aspen: (t: number) => number } }).cold.aspen(t)), reset: () => clear.aspen(0) }));
        if (!eggOff('wash')) this.strips.wash = new TimelineGag(egg, sceneDef('wash', 'wash', () => clear.geom()));
        if (!eggOff('bell')) this.strips.bell = new TimelineGag(egg, sceneDef('bell', 'bell', () => clear.geom(), { lines: BELL_LINES }));
        if (!eggOff('pea')) this.strips.pea = new TimelineGag(egg, sceneDef('pea', 'pea', () => clear.geom(), { lines: PEA_LINES }));
      }
      // A BIG PAD HAS ONLY ITS OWN GAGS so far (the golf pair): the older ones are drawn for a pad of 6 and its scene, and are
      // not built here at all. (The biffy and the lease sign still stand, as on every level.)
      if (this.bigPad && !this.eggForced) {
        for (const id of Object.keys(this.strips) as GagId[]) if (!BIG_PAD_GAGS.includes(id)) delete this.strips[id];
        this.magpie = null;
        this.worker = null;
        this.moose = null;
      }
      // The sounds only this level's gags use are fetched now (the rest came with the switch): audio/pack.ts `LAZY_KEYS`.
      sound.warm(Object.keys(this.strips) as GagId[]);
      // Taps on a flare stack (gag-triggers.ts): a touch that lifts where it landed, on a flare's picture.
      let down: { x: number; y: number; truck: boolean } | null = null;
      this.el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, truck: !!(e.target as Element | null)?.closest?.('.truck') }), { capture: true });
      this.el.addEventListener(
        'pointerup',
        (e) => {
          const tap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < TAP_SLOP;
          const onTruck = !!down?.truck;
          down = null;
          if (!tap) return;
          // A truck tapped, not dragged: the magpie comes (always until he is in the log; then one time in two, never two misses running: `chance`). Once a level.
          if (onTruck && this.magpie && !this.eggDone.has('magpie') && !this.eggsOn.has('magpie') && this.chance('magpie', GAG_TRIGGERS.magpie.chance, rollPinned('bird'))) this.fire('magpie');
          // The frosty riser, tapped three times: the frozen tongue.
          if (this.riser?.fits && this.riser.hit(e.clientX, e.clientY) && ++this.riserTaps >= GAG_TRIGGERS.tongue.riserTaps) {
            this.riserTaps = 0;
            this.fire('tongue');
          }
          const onBush = !!this.bush?.hit(e.clientX, e.clientY);
          // The bush: every so many taps and somebody may come out of it. In Duvernay the bear (he may
          // not: then it shakes and drops a puff of snow); in Cardium the porcupine's gag. Once they
          // have been, it only shakes.
          if (onBush && this.strips.bear && !this.eggsOn.has('bear') && ++this.bushTaps >= GAG_TRIGGERS.bear.bushTaps) {
            this.bushTaps = 0;
            if (!this.eggDone.has('bear') && this.chance('bear', GAG_TRIGGERS.bear.chance, bearNever() ? false : bearAlways() ? true : null)) this.fire('bear');
            else this.bush!.shake();
          } else if (onBush && this.strips.porcupine && !this.eggsOn.has('porcupine') && ++this.bushTaps >= GAG_TRIGGERS.porcupine.bushTaps) {
            this.bushTaps = 0;
            if (!this.eggDone.has('porcupine')) this.fire('porcupine');
            else this.bush!.shake();
          }
          if (this.cow?.hit(e.clientX, e.clientY) && ++this.cowTaps >= GAG_TRIGGERS.bull.cowTaps) this.fire('bull');
          // Mannville: the big muskeg puddle and the lane aspen, each tapped three times; the moon at night.
          if (this.mann) {
            if (this.mann.hitPuddle(e.clientX, e.clientY) && ++this.puddleTaps >= GAG_TRIGGERS.muskeg.puddleTaps) {
              this.puddleTaps = 0;
    this.matTaps = 0;
    this.exitRun = 0;
              this.fire('muskeg');
            } else if (this.mann.hitAspen(e.clientX, e.clientY) && !this.eggsOn.has('beaver')) {
              if (++this.aspenTaps >= GAG_TRIGGERS.beaver.aspenTaps) {
                this.aspenTaps = 0;
                if (!this.eggDone.has('beaver')) this.fire('beaver');
                else this.mann.shake();
              } else this.mann.shake();
            }
            if (this.night && this.onMoon(e.clientX, e.clientY)) this.fire('aurora');
          }
          // Clearwater: the rig mat stack tapped three times. A STACKED PAIR: Three Swings, and once that is in the Wildlife Log, Out Cold.
          if (this.clear?.hitMats(e.clientX, e.clientY) && !this.eggsOn.has('golf') && !this.eggsOn.has('cold')) {
            if (++this.matTaps >= GAG_TRIGGERS.golf.matTaps) {
              this.matTaps = 0;
              const next: GagId = loadLog(loadProgress().demo).found.includes('swings') ? 'cold' : 'golf';
              if (this.strips[next] && !this.eggDone.has(next)) this.fire(next);
              else this.clear.shake();
            } else this.clear.shake();
          }
          // Clearwater: a tap on the mud puddle (Fresh Wash).
          if (this.clear?.hitPuddle(e.clientX, e.clientY) && !(e.target as Element | null)?.closest?.('button')) this.fire('wash');
          // Bakken: the same spot on the prairie tapped three times (the prairie dogs); the sky tapped three times (the cloud).
          if (this.bakken && !(e.target as Element | null)?.closest?.('button, .truck, .board')) {
            const screen = this.el.getBoundingClientRect(), strip = this.strip(), x = e.clientX - screen.left, y = e.clientY - screen.top;
            const hud = this.el.querySelector('.hud')!.getBoundingClientRect().bottom - screen.top, boardTop = board.el.getBoundingClientRect().top - screen.top;
            if (y > strip.top && y < strip.bottom) {
              const last = this.prairieTaps;
              this.prairieTaps = last && Math.hypot(x - last.x, y - last.y) <= GAG_TRIGGERS.pdogs.withinPx ? { x: last.x, y: last.y, n: last.n + 1 } : { x, y, n: 1 };
              if (this.prairieTaps.n >= GAG_TRIGGERS.pdogs.sameSpotTaps) {
                this.prairieTaps = null;
                this.fire('pdogs');
              }
            } else if (y > hud && y < boardTop && ++this.skyTaps >= GAG_TRIGGERS.cloud.skyTaps) {
              this.skyTaps = 0;
              this.fire('cloud');
            }
          }
          // The lease sign, tapped: the back scratcher.
          if (this.sign?.hit(e.clientX, e.clientY)) {
            // (Where no deer comes for a tap, in winter or once he has been, the sign gives a small knock: no dead props.)
            if (this.strips.deer && !this.eggDone.has('deer') && !this.eggsOn.has('deer')) { if (++this.signTaps >= GAG_TRIGGERS.deer.signTaps) this.fire('deer'); }
            else if (!this.eggsOn.has('surveyor') && !this.eggsOn.has('tourists') && !this.eggsOn.has('deer')) this.knock(this.sign.layer.querySelector('svg'));
          }
          // NO DEAD PROPS (Jay, Oct 8): the biffy, the gopher's mound and the round bale have no tap of their own (their
          // sightings come from bumps, Hint and near misses), so a tap gives each a small knock to show it is alive.
          {
            const within = (el: Element | null | undefined) => { const r = el?.getBoundingClientRect(); return !!r && r.width > 0 && e.clientX >= r.left - 4 && e.clientX <= r.right + 4 && e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4; };
            const biffy = this.biffy?.layer.querySelector('svg');
            if (within(biffy) && !this.eggsOn.has('biffyA') && !this.eggsOn.has('biffyB')) this.knock(biffy!);
            const mound = this.el.querySelector('[data-anchor="mound"]');
            if (within(mound) && !this.eggsOn.has('nearMiss') && !this.eggsOn.has('gopherLunch')) this.knock(mound!);
            const bale = this.bakken?.layer.querySelector('svg > *') ?? null;
            if (within(bale) && !this.eggsOn.has('bale')) this.knock(this.bakken!.layer.querySelector('svg')!);
          }
          if (!this.strips.marshmallow) return;
          const onFlare = [...board.el.querySelectorAll('.obstacle.flare')].some((ob) => {
            const r = (ob.querySelector('svg') ?? ob).getBoundingClientRect();
            return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6;
          });
          if (onFlare && ++this.flareTaps >= GAG_TRIGGERS.marshmallow.flareTaps) this.fire('marshmallow');
        },
        { capture: true },
      );
      // Tests: `?gagtest=1` starts nothing; a strip gag can be held at any time of its run and let go.
      if (gagTest()) {
        const strips = this.strips;
        (window as unknown as { __rhrGag: unknown }).__rhrGag = {
          names: () => Object.keys(strips),
          end: (id: GagId) => strips[id]?.end ?? 0,
          beats: (id: GagId) => strips[id]?.beats ?? [],
          hold: (id: GagId, t: number) => strips[id]?.hold(t) ?? false,
          release: (id: GagId) => strips[id]?.release(),
        };
      } else this.eggTimer = window.setInterval(() => this.tickEggs(), 250);
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
    // (The Aurora Howl's preview needs the night.)
    const nightPin = this.eggForced === 'aurora' ? true : nightForced();
    if (nightPin === true) this.setNight(true);
    if (nightPin !== false) {
      const timer = window.setInterval(() => {
        if (!this.el.isConnected) return void window.clearInterval(timer);
        if (isWon(this.state) || document.hidden) return;
        const now = performance.now();
        // Night falls after a quiet spell; the next thing the player does brings the day back (`played`).
        if (!this.night && nightComes(this.theme.id) && !this.board.moving && now - this.lastPlayAt >= GAG_TRIGGERS.night.idleMs * this.idleScale) this.setNight(true);
        // NIGHT SHIFT (a sighting in the Wildlife Log): found once the lease has gone fully dark from sitting idle.
        if (this.night && !this.nightSeen && nightPin !== true && now - this.nightAt >= GAG_TRIGGERS.night.fadeInMs) {
          this.nightSeen = true;
          this.seen('night');
        }
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
    document.addEventListener('visibilitychange', this.onVisibility);

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

  /**
   * The one-time "Tap for sound" chip (sound-nudge.ts): on the first win card of a player whose
   * sound is all off, in the overlay's top corner (never in the card's column, which must fit a
   * short phone with no scroll). A tap turns the effects and the music on; it is never offered again.
   */
  private soundNudge(): void {
    if (!nudgeDue(audio.settings, nudgeOffered(), location.search, navigator.webdriver)) return;
    markNudgeOffered();
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'sound-nudge';
    chip.innerHTML = `${uiImg('icon_speaker_off', 'spk')}<span>${NUDGE_TEXT}</span>`;
    this.winEl.append(chip);
    onTap(this.winEl, '.sound-nudge', () => {
      audio.setSettings({ sfx: true, music: true });
      chip.remove();
    });
  }

  private nextFieldGo: (() => void) | null = null;
  /** The win card's last line on a field's last level: "Next field: <name>", or what would open it, or a plain well done. */
  private lastOfField(): string {
    const to = this.handlers.onNextField?.() ?? null;
    this.nextFieldGo = to && 'go' in to ? to.go : null;
    if (to && 'go' in to) return `<button class="btn primary next-field" data-act="field">${to.label} ›</button>`;
    if (to) return `<p class="verdict next-field-note">${to.note}</p>`;
    return '<p class="verdict">That was the last level in this field. Nice work!</p>';
  }

  private act(el: HTMLElement): void {
    const act = el.dataset.act;
    if (act === 'levels') this.handlers.onLevels();
    if (act === 'undo') this.undo();
    if (act === 'hint') this.onHint();
    if (act === 'restart') this.restart();
    if (act === 'next') this.handlers.onNext?.();
    if (act === 'field') this.nextFieldGo?.();
    if (act === 'share') void this.share(el);
  }

  /**
   * THE BOTTOM STRIP GETS THE SPARE HEIGHT FIRST, IN EVERY REGION (Jay, Oct 8; first on the Big Pad). In Safari with
   * its toolbars showing the lease sat centred between a sky band and a strip of about 55 px each: too short for
   * Mannville's and Bakken's scenes to play at all, and the rest played small. The lease is moved UP until the strip is
   * as tall as the region's scene wants at full size (`stripWanted`), leaving the sky this region's own sky sightings
   * need (`SKY_WANT`: the moose behind the top berm, the aurora, the cloud's sky to tap); never down, and never while a
   * level is played (only when the screen is laid out). It stays inside the stage, so it never covers the HUD, the tip
   * line or the buttons. On a tall screen (a home-screen app) there is room for both and nothing moves.
   */
  private liftPad(stage: DOMRect): void {
    const el = this.board.el;
    const pad = parseFloat(getComputedStyle(this.stage).paddingTop) || 0;
    const spare = stage.height - 2 * pad - el.offsetHeight;
    const k = Math.min(1, stage.width / 390);
    const want = (this.clear ? clearStripWanted(stage.width) : this.mann || this.bakken ? sceneStripWanted(stage.width, this.mann ? MANN_SCENE : SCENE) : stripWanted(stage.width)) - pad;
    // The sky keeps what its sightings need, unless that would leave the strip too short for its own to play at all.
    const least = (this.clear ? clearStripWanted(stage.width) * SCENE_MIN : this.mann || this.bakken ? sceneStripWanted(stage.width, this.mann ? MANN_SCENE : SCENE) * (SCENE_MIN + 0.1) : 0) - pad;
    const sky = Math.max(SKY_LEAST, Math.min(SKY_WANT[this.theme.id] * k - pad, spare - least));
    const below = Math.max(spare / 2, Math.min(spare - sky, want));
    // (Centred in the stage, a bottom margin of m moves it up by m / 2.)
    el.style.marginBottom = `${Math.max(0, Math.round(2 * below - spare))}px`;
  }

  /** A prop tapped that has no sighting to give for it: a small knock (none with reduced motion). */
  private knock(el: Element | null | undefined): void {
    if (!el) return;
    el.classList.remove('prop-knock');
    void el.getBoundingClientRect();
    el.classList.add('prop-knock');
    (el as HTMLElement | SVGElement).dataset.knocked = String(Number((el as HTMLElement).dataset.knocked ?? 0) + 1);
  }

  /** Call after the element is in the document and on every resize. */
  fit(): void {
    // (The tip line's room is pinned once it is on the page and has a height: see `showLevelHint`.)
    // (On the next frame: changing a size from inside the resize watcher's own callback makes the browser complain.)
    if (!this.noteEl.style.minHeight && this.noteEl.textContent) requestAnimationFrame(() => { if (!this.noteEl.style.minHeight && this.noteEl.textContent && this.noteEl.offsetHeight > 0) this.noteEl.style.minHeight = `${this.noteEl.offsetHeight}px`; });
    const r = this.stage.getBoundingClientRect();
    this.board.resize(r.width, deskHeight(r.width, r.height));
    this.liftPad(r);
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
      let gap = box.y - 4 - depth - TREE_RISE - hudBottom;
      // Mannville's moon can be tapped (Aurora Howl), so it is always there where the sky band has
      // room for the gag, even low over the treetops under a tall HUD.
      if (this.strips.aurora && box.y - hudBottom >= AURORA_SKY) gap = Math.max(gap, MOON_ROOM);
      // (The moon never sinks behind the lease: where the sky band is short it hangs just over the berm.)
      this.nightShade.innerHTML = nightSky(screen.width, Math.round(Math.min(box.y - 18, hudBottom + Math.max(0, gap) * 0.5 + 22)), gap >= MOON_ROOM);
    }
    // Kept clear of trees: the sleepy worker's spot by the left edge, and the biffy's.
    const strip = { top: box.y + box.height, bottom: controlsTop };
    const clearings = [this.bakken ? this.bakken.box() : null, this.bakken ? this.bakken.lane() : null, this.worker ? workerClearing(screen.width, strip) : null, this.biffy ? biffyBox(screen.width, strip) : null, this.biffy ? biffyLane(screen.width, strip) : null, this.sign ? signLane(screen.width, strip) : null, this.bush ? (this.bush.x === BUSH_X ? bearBox(screen.width, strip) : bushBox(this.bush.x, screen.width, strip)) : null, this.cow ? cowBox(screen.width, strip) : null, this.riser ? riserBox(screen.width, strip) : null, stageBox(screen.width, strip)].filter((c) => c !== null);
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, controlsTop, box, { seed: seedFrom(this.level.id), depth, below: !this.mann && !this.clear, anchors: { bush: !this.bush && !this.mann && !this.clear, mound: this.regionId === 'cardium' }, moundAt: this.strips.gopherLunch || this.strips.nearMiss ? moundSpot(screen.width, strip) : undefined, clearings });
    this.depthTrees(box.y + box.height);
    this.mann?.layout();
    this.clear?.layout();
    // (Clearwater's sign has its place in the scene's own world, wherever that lies on this screen.)
    // MONTNEY ON A SHORT STRIP: the sign stands LEFT of the stage (where Duvernay's does), not beside the cow. On a tall
    // strip its visitors stand well behind and above her; on a short one the rows close up and she would hide them.
    if (this.cow) setSignX(controlsTop - (box.y + box.height) < SHORT_STRIP * Math.min(1, screen.width / 390) ? WINTER_SIGN_X : undefined);
    this.bakken?.layout();
    this.biffy?.layout();
    if (!this.eggsOn.has('surveyor') && !this.eggsOn.has('deer') && !this.eggsOn.has('tourists')) this.sign?.layout();
    this.bush?.layout();
    this.riser?.layout();
    if (!this.strips.bull?.playing) this.cow?.layout();
    this.coach();
  }

  private move(id: string, delta: number): void {
    const mover = this.state.trucks.find((t) => t.id === id);
    const result = tryMove(this.state, id, delta);
    if (!result) {
      this.board.sync(this.state);
      return;
    }
    this.state = result.state;
    this.played();
    this.undos = 0;
    this.bumpRun = 0;
    // The tourists: the first move on the Daily Pad may bring them to the sign.
    if (this.daily && !this.toured && this.strips.tourists) {
      this.toured = true;
      if (this.chance('tourists', GAG_TRIGGERS.tourists.chance, rollPinned('tourists'))) this.fire('tourists');
    }
    // Gag triggers (gag-triggers.ts): the same truck back and forth; two exits back to back.
    if (this.backForth.moved(id, delta) >= GAG_TRIGGERS.landowner.backAndForth) this.fire('landowner');
    // The Cat Train: a convoy drives out in order, back to back (truck 1, then truck 2 on the next move).
    {
      if (result.exited && mover?.convoy === 2 && this.convoyOut === mover.color) this.fire('catTrain');
      this.convoyOut = result.exited && mover?.convoy === 1 ? mover.color : null;
    }
    // Clearwater: trucks driven out one move after another (Dinner Bell; once that is in the log, One Pea).
    this.exitRun = result.exited ? this.exitRun + 1 : 0;
    if (this.clear && this.exitRun >= GAG_TRIGGERS.bell.exitsInARow) {
      const next: GagId = loadLog(loadProgress().demo).found.includes('bell') ? 'pea' : 'bell';
      if (!this.eggDone.has(next) && !this.eggsOn.has(next)) { this.exitRun = 0; this.fire(next); }
    }
    // The tumbleweed: a truck dragged the full length of the board in one move.
    if (this.bakken && mover && (result.exited ? Math.abs(delta) >= SIZE - mover.length : Math.abs(result.delta ?? delta) === SIZE - mover.length)) this.fire('tumbleweed');
    if (result.exited) {
      const now = performance.now();
      if (now - this.lastExitAt <= GAG_TRIGGERS.nearMiss.backToBackMs) this.fire('nearMiss');
      this.lastExitAt = now;
    }
    this.resetHint({ id, delta: result.delta });
    this.showLevelHint();
    this.board.sync(this.state, true, result.exited ? id : undefined);
    // A witness line: with a gag on screen, the player's move makes a driver remark on it. Only
    // the driver of the truck NEAREST the gag, and only if he is within reach of it (bubble.ts);
    // otherwise nobody does. Once per gag per level.
    const watching = [...this.eggsOn].find((g) => !this.witnessed.has(g));
    if (watching && !this.eggForced) {
      // (Once the truck just driven has settled.)
      window.setTimeout(() => {
        if (!this.el.isConnected || isWon(this.state) || this.witnessed.has(watching) || !this.eggsOn.has(watching)) return;
        const witness = this.witnessFor(watching);
        if (!witness) return;
        this.witnessed.add(watching);
        const b = this.board.say(witness.querySelector('.cab') ?? witness, WITNESS_LINES[watching]);
        b.dataset.witness = watching;
        b.dataset.speaker = witness.dataset.id ?? '';
      }, 320);
    }
    this.updateHud();
    if (isWon(this.state)) {
      // Won: the lease falls quiet (no pumpjack squeak under the win card).
      this.board.stopAmbient();
      window.clearInterval(this.eggTimer);
      this.clearEggs();
      // (Not before the last truck has rolled right out and faded: exit.ts.)
      setTimeout(() => this.showWin(), Math.max(WIN_DELAY_MS, EXIT_WAVE_MS + EXIT_MOST_MS + 60));
    }
  }

  private undo(): void {
    if (!canUndo(this.state) || isWon(this.state)) return;
    this.state = undo(this.state);
    this.played();
    this.exitRun = 0;
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
    // The surveyor: the Restart button may bring him to check the sign (once a visit).
    if (!this.surveyed && this.strips.surveyor && this.chance('surveyor', GAG_TRIGGERS.surveyor.chance, rollPinned('surveyor'))) this.fire('surveyor');
  }

  /**
   * Does a chance sighting come on this try (gag-triggers.ts `Chances`)? ALWAYS until it is in the player's Wildlife
   * Log; after that on its `chance`, but never two misses in a row. Always in demo mode. `pin`: a test's switch
   * (`?bird=1`, `?bear=0`...), which settles it either way.
   */
  private chance(gag: GagId, chance: number, pin: boolean | null): boolean {
    if (pin !== null) return pin;
    if (loadProgress().demo) return true;
    return CHANCES.comes(gag, chance, loadLog(false).found.includes(EGG_SIGHTING[gag]));
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

  /** The player has left this level: every gag stops where it is (and its sounds with it). */
  leave(): void {
    this.clearEggs();
    window.clearInterval(this.eggTimer);
    this.board.stopAmbient();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** The app hidden: the lease's ambient motion and sound stop; back in front (and not won): they start again. */
  private onVisibility = (): void => {
    if (!this.el.isConnected) return void document.removeEventListener('visibilitychange', this.onVisibility);
    if (document.hidden || isWon(this.state)) this.board.stopAmbient();
    else this.board.startAmbient();
  };

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
    this.gagsThisLevel.clear();
    this.witnessed.clear();
    this.bushTaps = 0;
    this.topBumps = 0;
    this.riserTaps = 0;
    this.undos = 0;
    this.signTaps = 0;
    this.bumpRun = 0;
    this.flareTaps = 0;
    this.cowTaps = 0;
    this.puddleTaps = 0;
    this.aspenTaps = 0;
    this.prairieTaps = null;
    this.skyTaps = 0;
    this.convoyOut = null;
    this.lastExitAt = -Infinity;
    this.backForth.reset();
    this.biffy?.reset();
  }

  /**
   * A gag's trigger fired: it plays right away, even if others are playing (GAG_RULES). It waits
   * only for a gag that shares its character or prop, and then follows it on. Once per level.
   */
  private fire(id: GagId): void {
    // (A Big Pad has only its own gags so far: the others are drawn for a pad of 6.)
    if (this.bigPad && !this.eggForced && !BIG_PAD_GAGS.includes(id)) return;
    if (this.eggForced || isWon(this.state) || this.eggDone.has(id) || this.eggsOn.has(id) || this.eggQueue.includes(id)) return;
    if (id === 'magpie' ? !this.magpie : id === 'worker' ? !this.worker : id === 'moose' ? !this.moose : !this.strips[id]) return;
    if (mustWait(id, this.eggsOn)) this.eggQueue.push(id);
    else this.startEgg(id);
  }

  private startEgg(id: GagId): void {
    this.eggsOn.add(id);
    this.gagsThisLevel.add(id);
    void this.playEgg(id).then((r) => {
      this.eggsOn.delete(id);
      if (this.eggForced) this.lastMoveAt = performance.now() + 900;
      else if (r === 'seen') {
        this.eggDone.add(id);
        if (id === 'surveyor') this.surveyed = true;
        this.seen(EGG_SIGHTING[id]);
      }
      // Whoever was waiting for this one's character or prop may come on now.
      const waiting = this.eggQueue;
      this.eggQueue = [];
      for (const next of waiting) if (this.el.isConnected && !isWon(this.state)) this.fire(next);
    });
  }

  /**
   * Level 1's ghost finger: it shows the first move of the solution (which truck, which way, how
   * far) on the board until the player's first drag (re-placed on every refit).
   */
  private coach(): void {
    this.finger?.remove();
    this.finger = null;
    if (this.level.id !== COACH_LEVEL || this.coached || isWon(this.state)) return;
    let move: Move | null = null;
    try {
      move = nextMove(this.state);
    } catch {
      move = null;
    }
    const truck = move && this.state.trucks.find((t) => t.id === move.id);
    const el = truck && this.board.truckElement(truck.id);
    if (!move || !truck || !el) return;
    const far = move.delta * this.board.cellPx;
    this.finger = ghostFinger(this.board.el, el, truck.orient === 'h' ? far : 0, truck.orient === 'v' ? far : 0);
  }

  /** Something the player did: the idle clocks start again, and if night had fallen the day comes back. */
  private played(): void {
    if (this.finger) {
      this.coached = true;
      this.coach();
    }
    this.lastMoveAt = this.lastPlayAt = performance.now();
    if (this.night && nightForced() !== true && this.eggForced !== 'aurora') this.setNight(false);
  }

  /** Night falls (a slow fade) or the day comes back (a quicker one): style.css "Night". */
  private setNight(on: boolean): void {
    if (this.night === on) return;
    this.night = on;
    this.nightAt = on ? performance.now() : 0;
    this.el.classList.toggle('night', on);
    this.board.setNight(on);
  }

  /** What is on screen of a gag right now: the boxes of its characters and props (screen px). */
  private gagBoxes(id: GagId): DOMRect[] {
    const where = id === 'magpie' ? '.magpie-layer svg.magpie' : id === 'worker' ? '.worker-layer svg.pup' : id === 'moose' ? '.moose-layer svg' : `.strip-layer[data-gag="${id}"] g.pup, .strip-layer[data-gag="${id}"] svg.pup${id === 'biffyA' || id === 'biffyB' ? ', .biffy-layer svg.pup' : ''}`;
    const view = this.el.getBoundingClientRect();
    return [...this.el.querySelectorAll<HTMLElement>(where)]
      .filter((el) => getComputedStyle(el).visibility !== 'hidden')
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 2 && r.height > 2 && r.right > view.left && r.left < view.right && r.bottom > view.top && r.top < view.bottom);
  }

  /** The truck whose driver remarks on a gag: the one nearest it, if within reach; else none. */
  private witnessFor(id: GagId): HTMLElement | null {
    const trucks = this.state.trucks.map((t) => this.board.truckElement(t.id)).filter((el): el is HTMLElement => !!el && !el.classList.contains('exiting'));
    const i = nearestWitness(trucks.map((el) => el.getBoundingClientRect()), this.gagBoxes(id), WITNESS_REACH * this.board.cellPx);
    return i < 0 ? null : trucks[i];
  }

  /**
   * THE DEPTH RULE for the scenery: every tree, bush and mound standing BELOW the lease (its base
   * under the board's foot) leaves the scenery's own layer and becomes a unit of the depth strip,
   * at its own ground line, so a character walking the strip passes in front of the ones behind
   * his lane and behind the ones in front of it. (Trees above the lease stay where they are.)
   */
  private depthTrees(floor: number): void {
    if (!this.depth) return;
    this.depth.querySelectorAll(':scope > .depth-tree').forEach((el) => el.remove());
    for (const el of this.scenery.querySelectorAll<SVGElement>('.trees > svg.sc, .trees > svg.mound')) {
      const top = parseFloat(el.style.top), h = parseFloat(el.style.height);
      if (!(top + h > floor)) continue;
      // (A tree stands on the foot of its box; the mound's base line is 29.5 of its drawing's 34 units down.)
      const ground = Math.round(el.classList.contains('mound') ? top + (h * 29.5) / 34 : top + h);
      el.classList.add('depth-tree');
      el.dataset.ground = String(ground);
      el.style.zIndex = String(ground);
      this.depth.append(el);
    }
  }

  /** Puts a gag's layer on the screen UNDER the night's shade, so the strip's gags dim exactly like the scenery. */
  private mount(el: HTMLElement): void {
    // What is not standing in the bottom strip keeps its own place: the sky's layers (geese, the
    // moose behind the top berm) and what must lie over the lease itself (the magpie, `over-lease`).
    if (!this.depth || SKY_LAYERS.some((c) => el.classList.contains(c))) return void this.el.insertBefore(el, this.nightShade);
    // THE DEPTH RULE: everything else is a unit of the depth strip, drawn in the order of its
    // ground line (puppet-stage.ts `setGround`). A gag's own sound words go over them all.
    this.depth.append(el);
    if (el.classList.contains('scene-over')) el.style.zIndex = '100000';
  }

  /** Is a tap at (x, y) on the night sky's moon? (A tap target of at least 44 px.) */
  private onMoon(x: number, y: number): boolean {
    const moon = this.nightShade?.querySelector('.night-sky circle[stroke]')?.getBoundingClientRect();
    return !!moon && Math.abs(x - (moon.left + moon.width / 2)) <= Math.max(22, moon.width / 2) && Math.abs(y - (moon.top + moon.height / 2)) <= Math.max(22, moon.height / 2);
  }

  /** Plays a gag by id. Resolves 'seen' if it counts as a sighting. */
  private playEgg(id: GagId): Promise<EggResult> {
    if (id === 'magpie') return this.magpie?.play().then((ok): EggResult => (ok ? 'seen' : 'cancelled')) ?? Promise.resolve('none');
    if (id === 'worker') return this.worker?.play() ?? Promise.resolve('none');
    if (id === 'moose') return this.moose?.play() ?? Promise.resolve('none');
    return this.strips[id]?.play() ?? Promise.resolve('none');
  }

  /**
   * NO GAG COMES FROM WAITING: every gag is set off by something the player does (`fire`). This
   * clock only keeps a `?gag=` preview playing, again and again.
   */
  private tickEggs(): void {
    if (!this.el.isConnected) return void window.clearInterval(this.eggTimer);
    if (document.hidden || isWon(this.state) || !this.eggForced) return;
    const idle = performance.now() - this.lastMoveAt;
    if (this.eggsOn.size || idle < 600 || this.board.moving) return;
    // A preview plays again and again: the cow comes back for each one.
    if (this.eggForced === 'bull') this.cow?.reset();
    this.startEgg(this.eggForced);
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
    // The sleepy worker: a truck slides into another truck, and he may come (one time in two).
    if (hit === 'truck' && this.worker?.canPlay() && !this.eggDone.has('worker') && !this.eggsOn.has('worker') && this.chance('worker', GAG_TRIGGERS.worker.chance, rollPinned('nap'))) this.fire('worker');
    if (berm === 'top' && ++this.topBumps >= GAG_TRIGGERS.moose.topBermBumps) this.fire('moose');
    // The runaway bale: a bump into the bottom berm next to the bale (the truck's lane within a cell of it).
    if (berm === 'bottom' && this.bakken && bumped) {
      const el = this.board.truckElement(truckId)?.getBoundingClientRect(), bale = this.bakken.box(), screen = this.el.getBoundingClientRect();
      if (el && Math.abs(el.left + el.width / 2 - screen.left - (bale.x + bale.width / 2)) <= (GAG_TRIGGERS.bale.withinCells + 0.5) * this.board.cellPx) this.fire('bale');
    }
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
    this.hintPressed();
    // Gopher lunch (Cardium): any press of Hint may bring the worker in with his sandwich. AFTER the hint's own
    // message is up: a message of two lines takes its room first (`note`), so he is placed for the lease as it stands.
    if (this.strips.gopherLunch && !this.eggDone.has('gopherLunch') && this.chance('gopherLunch', GAG_TRIGGERS.gopherLunch.chance, lunchNever() ? false : lunchAlways() ? true : null)) this.fire('gopherLunch');
  }

  private async hintPressed(): Promise<void> {
    if (this.hintStep === 1 && this.hint) {
      const range = getMoveRange(this.state, this.hint.id);
      this.board.showHintTarget(this.hint, this.state, range?.exitDelta === this.hint.delta);
      this.hintStep = 2;
      this.note(range?.exitDelta === this.hint.delta ? 'Drive it out through its gate.' : 'Drag it onto its ghost.', true);
      this.updateHud();
      return;
    }
    if (this.hintStep !== 0 || this.hintSolving) return;

    const spent = spendHint(loadProgress());
    if (!spent) {
      this.note('Out of hints. Clear a level at par to earn one.');
      return;
    }
    // (The kept line starts at the move being hinted: hint-line.ts.)
    let move: Move | null = hintOf(this.hintPath);
    if (!move) {
      // Show a message and let it paint before the solver blocks.
      this.note('Calling the dispatcher\u2026', true);
      this.hintSolving = true;
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (!this.el.isConnected) return; // left the screen while waiting
      this.hintSolving = false;
      let path: Move[] | null;
      try {
        path = solve(this.state.level, 500_000, this.state.trucks, this.state.moves);
      } catch (e) {
        if (!(e instanceof SolverLimitError)) throw e;
        path = null;
      }
      this.hintPath = lineFrom(path);
      move = hintOf(this.hintPath);
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

  private resetHint(played?: { id: string; delta: number }): void {
    // If the player played the hinted move, the kept line moves on to the next; anything else drops it.
    this.hintPath = lineAfter(this.hintPath, this.hint, played);
    this.hint = null;
    this.hintStep = 0;
    this.board.clearHint();
  }

  /** A short message above the buttons. Non-sticky ones fade back to the level tip. */
  private note(text: string, sticky = false): void {
    clearTimeout(this.noteTimer);
    const was = this.noteEl.offsetHeight;
    this.noteEl.textContent = text;
    if (!sticky) this.noteTimer = window.setTimeout(() => this.showLevelHint(), NOTE_MS);
    // A message taller than the tip line's room takes that room ONCE, at once, and keeps it for the level (the
    // lease is refitted here and now, never a frame later under a gag that has just been placed, and never back).
    const h = this.noteEl.offsetHeight;
    if (h > was + 0.5) {
      this.noteEl.style.minHeight = `${h}px`;
      if (this.el.isConnected) this.fit();
    }
  }

  private showLevelHint(): void {
    clearTimeout(this.noteTimer);
    const tip = this.state.moves === 0 ? (this.level.hint ?? '') : '';
    this.noteEl.textContent = tip;
    // THE TIP LINE KEEPS ITS ROOM FOR THE WHOLE LEVEL. A tip that runs to two lines used to give
    // its second line back when it went (on the first move), and the lease re-centred a moment
    // later: a gag set off by that same drag (a bump, the tumbleweed, the tourists) was placed for
    // the old layout and played its whole run a line too high. Now nothing moves when the tip goes.
    if (tip) {
      const had = parseFloat(this.noteEl.style.minHeight) || 0; // (room a taller message took is kept: `note`)
      this.noteEl.style.minHeight = '';
      const h = Math.max(had, this.noteEl.offsetHeight);
      if (h > 0) this.noteEl.style.minHeight = `${h}px`;
    }
  }

  private updateHud(): void {
    this.movesEl.textContent = `${this.state.moves} ${this.state.moves === 1 ? 'move' : 'moves'}`;
    const won = isWon(this.state);
    this.undoBtn.disabled = !canUndo(this.state) || won;
    const hints = loadProgress().hints;
    if (this.hintStep === 1) this.hintBtn.textContent = 'Where?';
    // (The count never grows past one figure: more than nine reads "9+".)
    else this.hintBtn.innerHTML = `Hint <span class="count" aria-label="${hints} left">${hintCountText(hints)}</span>`;
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
        : this.lastOfField();

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
    this.winEl.querySelector('.company-says')!.textContent = companyLine(moves, par, Math.random, this.gagsThisLevel.size > 0);
    setBannerCap(this.winEl.querySelector<HTMLElement>('.card h2')!);
    // The characters are flat puppet stills in the worker's build (win-cast.ts), one expression per
    // result (par, close, over), moved only by the little GSAP motion below.
    const tier = tierFor(moves, par);
    const perfect = moves <= par;
    this.winEl.hidden = false;
    this.soundNudge();
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
    confettiBurst(this.winEl, this.winEl.clientHeight);
  }

  /** One tap: copy the spoiler-free result, ready to paste anywhere. */
  private async share(button: HTMLElement): Promise<void> {
    const ok = await copyText(this.shareMessage);
    button.textContent = ok ? 'Copied! Paste it anywhere.' : 'Could not copy';
    button.classList.toggle('done', ok);
  }
}

/**
 * A SHORT DESKTOP WINDOW (1280 x 720 and the like; Jay, Oct 8): the game's column is as wide there as it gets, and
 * a lease as big as the stage is tall leaves nothing under it, so the bottom strip and all its sightings were gone.
 * There the lease is made just small enough to leave `DESK_ROOM` of spare height, which `liftPad` shares out: a
 * strip about as tall as a phone's in Safari, and a little sky. Never under `DESK_LEAST`. A taller window already
 * has that room and is not touched; A PHONE IS NEVER TOUCHED (a mouse, and the column at its desktop width).
 */
export const DESK_ROOM = 114, DESK_LEAST = 340, DESK_WIDTH = 500;
export function deskHeight(width: number, height: number, desktop: boolean = isDesktop()): number {
  if (!desktop || width < DESK_WIDTH) return height;
  return Math.min(height, Math.max(height - DESK_ROOM, DESK_LEAST));
}
const isDesktop = (): boolean => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

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
/** A strip shorter than this (px at 390 wide) is SHORT: its rows (the back row by the berm, the prop rows, the walking lane) stand almost on one line. */
const SHORT_STRIP = 130;
/** The least sky left between the HUD and the lease when the lease is moved up for its strip (px, besides the stage's own padding). */
const SKY_LEAST = 6;
/**
 * The sky each region keeps under the HUD when its lease moves up (px at 390 wide, the stage's padding included): room
 * for the trees on the horizon and the geese everywhere; in Duvernay for the moose rising behind the top berm; in
 * Mannville for the coyote on the ridge (the aurora's lights run on behind the HUD); in Bakken a sky band to tap for
 * the cloud. Clearwater has no sky sighting.
 */
const SKY_WANT: Record<ThemeId, number> = { summer: 30, spring: 30, winter: 40, fall: 56, prairie: 54, boreal: 16 };
/** The gags a Big Pad (Clearwater) plays. */
const BIG_PAD_GAGS: GagId[] = ['golf', 'cold', 'wash', 'bell', 'pea', 'biffyA', 'biffyB'];
const EGG_SIGHTING: Record<GagId, Sighting> = { magpie: 'magpie', worker: 'spotter', moose: 'moose', nearMiss: 'nearmiss', landowner: 'landowner', biffyA: 'biffy', biffyB: 'biffyB', marshmallow: 'marshmallow', geese: 'geese', bear: 'bear', bull: 'bull', porcupine: 'porcupine', gopherLunch: 'lunch', sam: 'sam', tongue: 'tongue', surveyor: 'surveyor', deer: 'deer', tourists: 'tourists', muskeg: 'muskeg', catTrain: 'cattrain', beaver: 'beaver', aurora: 'aurora', tumbleweed: 'tumbleweed', pdogs: 'pdogs', bale: 'bale', cloud: 'cloud', golf: 'swings', cold: 'cold', wash: 'wash', bell: 'bell', pea: 'pea' };
