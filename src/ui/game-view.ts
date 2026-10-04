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
import { preloadObstacles, preloadSprites } from './sprites.ts';
import { defaultKind } from './vehicles.ts';
import { applyCamo, loadLog, record, saveLog, sightingToast } from './wildlife-log.ts';
import { GagLayer, type GagOptions } from './gag-layer.ts';
import { gagsOn } from './flags.ts';
import { companyLine, tierFor } from './gags.ts';
import { animStill } from './anim.ts';
import { gsap } from 'gsap';
import { onTap } from './tap.ts';
import type { BumpHit } from './lines.ts';

/** Screen-changing buttons: act on the first tap, even on iOS (see tap.ts). */
const TAPPED = '.win [data-act], .hud [data-act="levels"]';

const WIN_DELAY_MS = 900;
const NOTE_MS = 2600;

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

  /** Null while gags are switched off (flags.ts). */
  private gags: GagLayer | null;

  constructor(
    level: Level,
    label: string,
    theme: Theme,
    handlers: GameViewHandlers,
    daily: DailyInfo | null = null,
    gagOptions: Omit<GagOptions, 'idleScale' | 'ground' | 'wildlife' | 'demo' | 'found'> = { cords: false, landowner: false, regionId: 'daily', levelIndex: 0 },
  ) {
    this.level = level;
    this.theme = theme;
    this.daily = daily;
    this.handlers = handlers;
    this.state = newGame(level);
    preloadObstacles(level.obstacles.map((o) => o.kind ?? 'pumpjack'));
    preloadSprites(level.trucks.map((t) => ({ kind: t.kind ?? defaultKind(t.length), color: t.color })));
    this.board = new BoardView(
      () => this.state,
      (id, delta) => this.move(id, delta),
      (id, direction, hit) => this.onBump(id, direction, hit),
    );
    const board = this.board;
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
    if (this.gags) this.gags.onSeen = (id) => {
      // A scene still finishing after you've left the level (or reset) doesn't count.
      if (!this.el.isConnected) return;
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
            <span class="misses" aria-label="Near misses"><svg class="hazard" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2 L22.5 20 H1.5 Z"/><rect x="11" y="8" width="2" height="6.5" rx="1"/><circle cx="12" cy="17" r="1.3"/></svg><b>0</b></span>
            <span class="moves">0</span>
          </span>
          <span class="par">par ${level.par}</span>
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
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, controlsTop, box, { seed: seedFrom(this.level.id), depth });
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
    this.gags?.moved(id, delta);
    if (result.exited) this.gags?.exited();
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state, true, result.exited ? id : undefined);
    this.updateHud();
    if (isWon(this.state)) {
      this.gags?.stop();
      setTimeout(() => this.showWin(), WIN_DELAY_MS);
    }
  }

  private undo(): void {
    if (!canUndo(this.state) || isWon(this.state)) return;
    this.state = undo(this.state);
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
    this.board.setLevel(this.level);
    this.gags?.setLevel(this.level);
    this.winEl.hidden = true;
    this.showLevelHint();
    this.updateHud();
  }

  /** A bump: count it and give the hazard counter a quick shake. */
  private onBump(truckId: string, direction: 1 | -1, hit: BumpHit): void {
    this.gags?.bumped(truckId, direction, hit);
    this.bumps++;
    this.showMisses();
    this.missesEl.classList.remove('tick');
    void this.missesEl.offsetWidth; // restart the shake
    this.missesEl.classList.add('tick');
  }

  private showMisses(): void {
    this.missesEl.querySelector('b')!.textContent = String(this.bumps);
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
      this.note('Drag it to the outline.', true);
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
    this.note('Move the glowing truck. Tap Where? to see where.', true);
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
        <h2>Pad cleared!</h2>
        <div class="score-row">
          <div class="mascot" aria-hidden="true"></div>
          <div class="hats big" aria-label="${hats} of 3 hard hats">${hatsHtml(hats)}</div>
        </div>
        ${clean ? `<div class="zero-incident" role="img" aria-label="Zero incident"><span>ZERO INCIDENT</span></div>` : ''}
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
    // The characters are ONE still image each, moved only in code (cycling their sprite frames
    // jittered: the frames don't line up). Company Man: his usual look, or the scowl when it's well
    // over. Roughneck: wrench up on a perfect solve, otherwise standing.
    const tier = tierFor(moves, par);
    const perfect = moves <= par;
    this.winEl.hidden = false;
    // Each still is sized to its box on the card (the boxes are smaller on short screens).
    const bossBox = this.winEl.querySelector<HTMLElement>('.company-man')!;
    const boss = animStill(tier === 'over' ? 'company_man_scowl' : 'company_man_idle', bossBox.clientHeight || 58, tier === 'over' ? 3 : 0);
    bossBox.append(boss);
    const mascotBox = this.winEl.querySelector<HTMLElement>('.mascot')!;
    const mascot = animStill(perfect ? 'roughneck_mascot_celebrate' : 'roughneck_mascot_idle', mascotBox.clientHeight || 80, perfect ? 9 : 0);
    mascotBox.append(mascot);
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
