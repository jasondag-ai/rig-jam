import { SolverLimitError, canUndo, getMoveRange, isWon, newGame, nextMove, tryMove, undo, type GameState, type Level, type Move } from '../engine/index.ts';
import { seedFrom } from '../engine/rng.ts';
import { BoardView } from './board-view.ts';
import { padDecor } from './pad-decor.ts';
import { sceneryHtml } from './scenery.ts';
import { applyTheme, type Theme } from './themes.ts';
import { hatsHtml } from './hats.ts';
import { copyText } from './clipboard.ts';
import { shareText, streak, zeroIncident } from './daily.ts';
import { hardHats, loadProgress, recordDailyClear, recordWin, saveProgress, spendHint } from './progress.ts';
import { streakSignHtml } from './sign.ts';

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

  constructor(level: Level, label: string, theme: Theme, handlers: GameViewHandlers, daily: DailyInfo | null = null) {
    this.level = level;
    this.theme = theme;
    this.daily = daily;
    this.handlers = handlers;
    this.state = newGame(level);
    this.board = new BoardView(
      () => this.state,
      (id, delta) => this.move(id, delta),
      () => this.onBump(),
    );

    this.el = document.createElement('div');
    this.el.className = 'screen game';
    this.el.innerHTML = `
      <div class="scenery" aria-hidden="true"></div>
      <header class="hud">
        <button class="link" data-act="levels" aria-label="Back to levels">‹ Levels</button>
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
    this.board.setDecor(padDecor(theme.ground, seedFrom(level.id)), theme.ground);
    this.showLevelHint();

    this.el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'levels') this.handlers.onLevels();
      if (act === 'undo') this.undo();
      if (act === 'hint') this.onHint();
      if (act === 'restart') this.restart();
      if (act === 'next') this.handlers.onNext?.();
      if (act === 'share') void this.share(e.target as HTMLElement);
    });
    this.updateHud();
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
    this.el.style.setProperty('--horizon', `${Math.round(box.y - 4)}px`);
    this.scenery.innerHTML = sceneryHtml(this.theme, screen.width, controlsTop, box);
  }

  private move(id: string, delta: number): void {
    const result = tryMove(this.state, id, delta);
    if (!result) {
      this.board.sync(this.state);
      return;
    }
    this.state = result.state;
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state, true, result.exited ? id : undefined);
    this.updateHud();
    if (isWon(this.state)) setTimeout(() => this.showWin(), WIN_DELAY_MS);
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
    this.winEl.hidden = true;
    this.showLevelHint();
    this.updateHud();
  }

  /** A bump: count it and give the hazard counter a quick shake. */
  private onBump(): void {
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
    let { progress, earnedHint } = recordWin(loadProgress(), this.level.id, moves, par);
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
      this.shareMessage = shareText({ pad: this.daily.pad, moves, par, hats, zeroIncident: clean, streak: s.days });
      daily = `${streakSignHtml(s, true)}<button class="btn primary share" data-act="share">Share result</button>`;
    }
    const next = this.daily
      ? ''
      : this.handlers.onNext
        ? '<button class="btn primary" data-act="next">Next level ›</button>'
        : '<p class="verdict">That was the last level in this field. Nice work!</p>';

    this.winEl.innerHTML = `
      <div class="card">
        <h2>Pad cleared!</h2>
        <div class="hats big" aria-label="${hats} of 3 hard hats">${hatsHtml(hats)}</div>
        ${clean ? '<div class="zero-incident">ZERO INCIDENT</div>' : ''}
        <p class="result">${moves} moves · par ${par}</p>
        <p class="verdict">${verdict} · ${misses}</p>
        ${earnedHint ? '<p class="earned">+1 hint for a perfect solve</p>' : ''}
        ${daily}
        ${next}
        <button class="btn" data-act="restart">Play again</button>
        <button class="btn quiet" data-act="levels">All levels</button>
      </div>`;
    this.winEl.hidden = false;
  }

  /** One tap: copy the spoiler-free result, ready to paste into Messages. */
  private async share(button: HTMLElement): Promise<void> {
    const ok = await copyText(this.shareMessage);
    button.textContent = ok ? 'Copied! Paste it in Messages' : 'Could not copy';
    button.classList.toggle('done', ok);
  }
}
