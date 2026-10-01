import { SolverLimitError, canUndo, getMoveRange, isWon, newGame, nextMove, tryMove, undo, type GameState, type Level, type Move } from '../engine/index.ts';
import { BoardView } from './board-view.ts';
import { hatsHtml } from './hats.ts';
import { hardHats, loadProgress, recordWin, saveProgress, spendHint } from './progress.ts';

const WIN_DELAY_MS = 900;
const NOTE_MS = 2600;

export interface GameViewHandlers {
  onLevels: () => void;
  onNext: (() => void) | null;
}

/** One level in play: HUD, board, undo/hint/restart, and the win screen. */
export class GameView {
  readonly el: HTMLElement;
  private state: GameState;
  private board: BoardView;
  private movesEl: HTMLElement;
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

  constructor(level: Level, regionName: string, index: number, handlers: GameViewHandlers) {
    this.level = level;
    this.handlers = handlers;
    this.state = newGame(level);
    this.board = new BoardView(
      () => this.state,
      (id, delta) => this.move(id, delta),
    );

    this.el = document.createElement('div');
    this.el.className = 'screen game';
    this.el.innerHTML = `
      <header class="hud">
        <button class="link" data-act="levels" aria-label="Back to levels">‹ Levels</button>
        <div class="title"><span class="num"></span><span class="name"></span></div>
        <div class="score"><span class="moves">0</span><span class="par">par ${level.par}</span></div>
      </header>
      <main class="stage"></main>
      <p class="note" aria-live="polite"></p>
      <footer class="controls">
        <button class="btn" data-act="undo">Undo</button>
        <button class="btn hint-btn" data-act="hint"></button>
        <button class="btn" data-act="restart">Restart</button>
      </footer>
      <div class="overlay win" hidden></div>`;
    this.el.querySelector('.num')!.textContent = `${regionName} ${index + 1}`;
    this.el.querySelector('.name')!.textContent = level.name;
    this.movesEl = this.el.querySelector('.moves')!;
    this.undoBtn = this.el.querySelector('[data-act="undo"]')!;
    this.hintBtn = this.el.querySelector('[data-act="hint"]')!;
    this.noteEl = this.el.querySelector('.note')!;
    this.winEl = this.el.querySelector('.win')!;
    this.stage = this.el.querySelector('.stage')!;
    this.stage.append(this.board.el);
    this.board.setLevel(level);
    this.showLevelHint();

    this.el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'levels') this.handlers.onLevels();
      if (act === 'undo') this.undo();
      if (act === 'hint') this.onHint();
      if (act === 'restart') this.restart();
      if (act === 'next') this.handlers.onNext?.();
    });
    this.updateHud();
  }

  /** Call after the element is in the document and on every resize. */
  fit(): void {
    const r = this.stage.getBoundingClientRect();
    this.board.resize(r.width, r.height);
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
    this.resetHint();
    this.showLevelHint();
    this.board.sync(this.state);
    this.updateHud();
  }

  private restart(): void {
    this.state = newGame(this.level);
    this.resetHint();
    this.board.setLevel(this.level);
    this.winEl.hidden = true;
    this.showLevelHint();
    this.updateHud();
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
    const { progress, earnedHint } = recordWin(loadProgress(), this.level.id, moves, par);
    saveProgress(progress);
    this.updateHud();
    const hats = hardHats(moves, par);
    const verdict = moves === par ? 'Right on par. Textbook.' : `${moves - par} over par`;
    this.winEl.innerHTML = `
      <div class="card">
        <h2>Pad cleared!</h2>
        <div class="hats big" aria-label="${hats} of 3 hard hats">${hatsHtml(hats)}</div>
        <p class="result">${moves} moves · par ${par}</p>
        <p class="verdict">${verdict}</p>
        ${earnedHint ? '<p class="earned">+1 hint for a perfect solve</p>' : ''}
        ${this.handlers.onNext ? '<button class="btn primary" data-act="next">Next level ›</button>' : '<p class="verdict">That was the last level in this field. Nice work!</p>'}
        <button class="btn" data-act="restart">Play again</button>
        <button class="link" data-act="levels">All levels</button>
      </div>`;
    this.winEl.hidden = false;
  }
}
