import { SolverLimitError, canUndo, getMoveRange, isWon, newGame, nextMove, tryMove, undo, type GameState, type Level, type Move } from '../engine/index.ts';
import { seedFrom } from '../engine/rng.ts';
import { BoardView } from './board-view.ts';
import { sceneryHtml } from './scenery.ts';
import { applyTheme, type Theme } from './themes.ts';
import { hatsHtml } from './hats.ts';
import { copyText } from './clipboard.ts';
import { shareText, streak, zeroIncident } from './daily.ts';
import { hardHats, loadProgress, recordDailyClear, recordWin, saveProgress, spendHint } from './progress.ts';
import { streakSignHtml } from './sign.ts';
import { sound } from '../audio/engine.ts';
import { toast } from './toast.ts';
import { uiImg } from './ui-art.ts';
import { preloadSprites } from './sprites.ts';
import { defaultKind } from './vehicles.ts';
import { applyCamo, liveCount, loadLog, record, saveLog, sightingToast, type Sighting } from './wildlife-log.ts';
import { GagLayer, type GagOptions } from './gag-layer.ts';
import { gagsOn, magpieOn, mooseOn, workerOn } from './flags.ts';
import { MooseGag, WorkerGag, workerClearing, type EggHost } from './egg-gags.ts';
import { MOOSE_BUMPS, isTopBermBump } from './moose.ts';
import { SPOTTER_IDLE_MS } from './gags.ts';
import { MagpieGag } from './magpie-gag.ts';
import { MAGPIE_IDLE_MS } from './gags.ts';
import { companyLine, tierFor } from './gags.ts';
import { animStill } from './anim.ts';
import { gsap } from 'gsap';
import { onTap } from './tap.ts';
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
  private gags: GagLayer | null;
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
  /** Done this level (each plays once; one that was scared off or cancelled may try again). */
  private magpieDone = false;
  private workerDone = false;
  private mooseDone = false;
  /** Bumps into the top berm this level, and whether the moose is due. */
  private topBumps = 0;
  private mooseDue = false;
  private eggTimer = 0;
  /** ?gag=magpie|worker|moose: play that one straight away, again and again. */
  private eggForced: 'magpie' | 'worker' | 'moose' | null = null;
  private idleScale = 1;

  constructor(
    level: Level,
    label: string,
    theme: Theme,
    handlers: GameViewHandlers,
    daily: DailyInfo | null = null,
    gagOptions: Omit<GagOptions, 'idleScale' | 'ground' | 'wildlife' | 'demo' | 'found'> = { cords: false, landowner: false, regionId: 'daily', levelIndex: 0 },
  ) {
    this.level = level;
    this.regionId = gagOptions.regionId;
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
    const f = gagOptions.force;
    this.eggForced = f === 'magpie' || f === 'worker' || (f === 'moose' && !gagsOn()) ? f : null;
    board.onGrab = (id) => {
      this.lastMoveAt = performance.now();
      this.magpie?.grabbed(id);
      // Any move sends the worker running, pail in hand.
      this.worker?.cancel();
    };
    const demo = loadProgress().demo;
    this.gags = !gagsOn() ? null : new GagLayer(
      {
        el: board.el,
        get cellPx() {
          return board.cellPx;
        },
        get fencePx() {
          return board.fencePx;
        },
        truckElement: (id) => board.truckElement(id),
        say: (anchor, text) => board.say(anchor, text),
        addGround: (el) => board.addGround(el),
        state: () => this.state,
        moving: () => board.moving,
        // With the other gags on, their pacing decides when the magpie plays.
        playMagpie: () => this.magpie?.play() ?? Promise.resolve(false),
      },
      {
        ...gagOptions,
        ground: theme.ground,
        idleScale: idleScale(),
        wildlife: new URLSearchParams(location.search).get('wild') !== '0',
        demo,
        found: () => new Set(loadLog(demo).found),
      },
    );
    board.onWear = (lvl) => this.gags?.worn(lvl);
    // The Wildlife Log collects each gag the first time it plays all the way through.
    // In demo mode they go to the separate demo log, never the real one (and never earn camo).
    if (this.gags) this.gags.onSeen = (id) => this.seen(id);

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
    this.stage.append(this.board.el);
    this.board.setLevel(level);
    this.board.setGround(theme.ground);
    sound.setGround(theme.ground);
    this.gags?.setLevel(level);
    if (magpieOn() || this.eggForced === 'magpie') this.magpie = new MagpieGag({ screen: this.el, truckElement: (id) => board.truckElement(id), state: () => this.state, say: (anchor, text) => board.say(anchor, text) });
    // The worker and the moose are the new puppets; with every gag switched on (?gags=1) the old
    // spotter and moose scenes play instead, so these stay out of their way.
    if (!this.gags || this.eggForced) {
      const egg: EggHost = {
        screen: this.el,
        board: board.el,
        cellPx: () => board.cellPx,
        bandPx: () => board.fencePx,
        strip: () => this.strip(),
        above: () => Math.max(0, board.el.getBoundingClientRect().top - this.el.querySelector('.hud')!.getBoundingClientRect().bottom),
        state: () => this.state,
        say: (anchor, text) => board.say(anchor, text),
      };
      if (workerOn() || this.eggForced === 'worker') this.worker = new WorkerGag(egg);
      if ((mooseOn() && this.regionId === 'duvernay') || this.eggForced === 'moose') this.moose = new MooseGag(egg);
      // By themselves (the other gags off), the eggs keep their own clock.
      this.eggTimer = window.setInterval(() => this.tickEggs(), 250);
    }
    // Any touch anywhere on the screen cancels an idle gag and restarts the idle clock.
    this.el.addEventListener('pointerdown', () => this.gags?.touch(), { capture: true });
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
    // The sleepy worker's clearing by the left edge: no trees there.
    const clearing = this.worker ? workerClearing(screen.width, { top: box.y + box.height, bottom: controlsTop }) : null;
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, controlsTop, box, { seed: seedFrom(this.level.id), depth, anchors: { bush: true, mound: this.regionId === 'cardium' }, clearing });
    // Room outside the fence for the characters: between the HUD and the board, and below it.
    const buttonsTop = this.el.querySelector('.controls')!.getBoundingClientRect().top - screen.top;
    this.gags?.layout({
      above: Math.max(0, box.y - hudBottom),
      below: Math.max(0, controlsTop - (box.y + box.height)),
      ground: Math.max(0, buttonsTop - (box.y + box.height)),
    });
  }

  private move(id: string, delta: number): void {
    const result = tryMove(this.state, id, delta);
    if (!result) {
      this.board.sync(this.state);
      return;
    }
    this.state = result.state;
    this.lastMoveAt = performance.now();
    this.gags?.moved(id, delta);
    if (result.exited) this.gags?.exited();
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state, true, result.exited ? id : undefined);
    this.updateHud();
    if (isWon(this.state)) {
      this.gags?.stop();
      window.clearInterval(this.eggTimer);
      this.clearEggs();
      setTimeout(() => this.showWin(), WIN_DELAY_MS);
    }
  }

  private undo(): void {
    if (!canUndo(this.state) || isWon(this.state)) return;
    this.state = undo(this.state);
    this.lastMoveAt = performance.now();
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
    this.gags?.setLevel(this.level);
    // A fresh pad: the splat went with the old trucks, and every egg may come again.
    this.magpieDone = this.workerDone = this.mooseDone = this.mooseDue = false;
    this.topBumps = 0;
    this.lastMoveAt = performance.now();
    if (!this.gags || this.eggForced) {
      window.clearInterval(this.eggTimer);
      this.eggTimer = window.setInterval(() => this.tickEggs(), 250);
    }
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
    void toast(sightingToast(id, liveCount(r.log, gagsOn()), demo, gagsOn()));
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
  }

  /**
   * The eggs' clock (used while the other gags are off). ONE gag at a time, none while a truck is
   * moving or once the level is won. The moose comes as soon as the stage is free after the second
   * bump into the top berm. The magpie comes after MAGPIE_IDLE_MS with no moves and the worker
   * after SPOTTER_IDLE_MS, each counted from the last move or the last gag leaving, each once per
   * level (one that was scared off or cancelled may try again after another idle stretch).
   */
  private tickEggs(): void {
    if (!this.el.isConnected) return void window.clearInterval(this.eggTimer);
    if (this.magpie?.playing || this.worker?.playing || this.moose?.playing) return;
    if (document.hidden || this.board.moving || isWon(this.state)) return;
    const idle = performance.now() - this.lastMoveAt;
    const rest = () => (this.lastMoveAt = performance.now() + (this.eggForced ? 900 : 0));
    if (this.eggForced) {
      if (idle < 600) return;
      const gag = this.eggForced === 'magpie' ? this.magpie?.play().then((ok) => (ok ? 'seen' : 'none')) : this.eggForced === 'worker' ? this.worker?.play() : this.moose?.play();
      return void gag?.then(rest);
    }
    if (this.moose && this.mooseDue && !this.mooseDone) {
      this.mooseDue = false;
      return void this.moose.play().then((r) => {
        rest();
        if (r !== 'seen') return;
        this.mooseDone = true;
        this.seen('moose');
      });
    }
    if (this.magpie && !this.magpieDone && idle >= MAGPIE_IDLE_MS * this.idleScale) {
      return void this.magpie.play().then((splatted) => {
        rest();
        if (!splatted) return;
        this.magpieDone = true;
        this.seen('magpie');
      });
    }
    // The worker waits his turn: the magpie first if he is still to come.
    const magpieFirst = this.magpie && !this.magpieDone;
    if (this.worker && !this.workerDone && !magpieFirst && idle >= SPOTTER_IDLE_MS * this.idleScale && this.worker.canPlay()) {
      return void this.worker.play().then((r) => {
        rest();
        if (r !== 'seen') return;
        this.workerDone = true;
        this.seen('spotter');
      });
    }
  }

  /** A bump: count it and give the hazard counter a quick shake. */
  private onBump(truckId: string, direction: 1 | -1, hit: BumpHit): void {
    // Duvernay: the second bump into the top berm this level brings the moose up.
    const bumped = this.state.trucks.find((t) => t.id === truckId);
    if (this.moose && bumped && isTopBermBump(bumped.orient, direction, hit) && ++this.topBumps === MOOSE_BUMPS) this.mooseDue = true;
    this.gags?.bumped(truckId, direction, hit);
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

  private showWin(): void {
    const { moves } = this.state;
    const { par } = this.level;
    const before = loadProgress();
    let { progress, earnedHint } = recordWin(before, this.level.id, moves, par);
    if (this.daily) progress = recordDailyClear(progress, this.daily.day);
    saveProgress(progress);
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
    // The characters are ONE still image each, moved only in code (cycling their sprite frames
    // jittered: the frames don't line up). Company Man: his usual look, or the scowl when it's well
    // over. Roughneck: wrench up on a perfect solve, otherwise standing.
    const tier = tierFor(moves, par);
    const perfect = moves <= par;
    this.winEl.hidden = false;
    // Once the card is laid out: fit the medal's lettering to its ribbon.
    fitRibbon(this.winEl.querySelector<HTMLElement>('.zero-incident span'));
    // Each still is sized to its box on the card (the boxes are smaller on short screens).
    const bossBox = this.winEl.querySelector<HTMLElement>('.company-man')!;
    const boss = animStill(tier === 'over' ? 'company_man_scowl' : 'company_man_idle', bossBox.clientHeight || 58, tier === 'over' ? 3 : 0);
    bossBox.append(boss);
    const mascotBox = this.winEl.querySelector<HTMLElement>('.mascot')!;
    const mascot = animStill(perfect ? 'roughneck_mascot_celebrate' : 'roughneck_mascot_idle', mascotBox.clientHeight || 80, perfect ? 9 : 0);
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
