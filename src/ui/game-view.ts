import { canUndo, isWon, newGame, tryMove, undo, type GameState, type Level } from '../engine/index.ts';
import { BoardView } from './board-view.ts';
import { saveBest, stars } from './progress.ts';

const WIN_DELAY_MS = 450;

export interface GameViewHandlers {
  onLevels: () => void;
  onNext: (() => void) | null;
}

/** One level in play: HUD, board, undo/restart, and the win screen. */
export class GameView {
  readonly el: HTMLElement;
  private state: GameState;
  private board: BoardView;
  private movesEl: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private winEl: HTMLElement;
  private stage: HTMLElement;
  private level: Level;
  private handlers: GameViewHandlers;

  constructor(level: Level, index: number, handlers: GameViewHandlers) {
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
        <div class="title"><span class="num">Level ${index + 1}</span><span class="name"></span></div>
        <div class="score"><span class="moves">0</span><span class="par">par ${level.par}</span></div>
      </header>
      <main class="stage"></main>
      <p class="hint"></p>
      <footer class="controls">
        <button class="btn" data-act="undo">Undo</button>
        <button class="btn" data-act="restart">Restart</button>
      </footer>
      <div class="overlay win" hidden></div>`;
    this.el.querySelector('.name')!.textContent = level.name;
    this.el.querySelector('.hint')!.textContent = level.hint ?? '';
    this.movesEl = this.el.querySelector('.moves')!;
    this.undoBtn = this.el.querySelector('[data-act="undo"]')!;
    this.winEl = this.el.querySelector('.win')!;
    this.stage = this.el.querySelector('.stage')!;
    this.stage.append(this.board.el);
    this.board.setLevel(level);

    this.el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'levels') this.handlers.onLevels();
      if (act === 'undo') this.undo();
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
    this.board.sync(this.state, true, result.exited ? id : undefined);
    this.updateHud();
    if (isWon(this.state)) {
      saveBest(this.level.id, this.state.moves);
      setTimeout(() => this.showWin(), WIN_DELAY_MS);
    }
  }

  private undo(): void {
    if (!canUndo(this.state) || isWon(this.state)) return;
    this.state = undo(this.state);
    this.board.sync(this.state);
    this.updateHud();
  }

  private restart(): void {
    this.state = newGame(this.level);
    this.board.setLevel(this.level);
    this.winEl.hidden = true;
    this.updateHud();
  }

  private updateHud(): void {
    this.movesEl.textContent = `${this.state.moves} ${this.state.moves === 1 ? 'move' : 'moves'}`;
    this.undoBtn.disabled = !canUndo(this.state) || isWon(this.state);
  }

  private showWin(): void {
    const { moves } = this.state;
    const { par } = this.level;
    const n = stars(moves, par);
    const verdict = moves < par ? 'Under par!' : moves === par ? 'Right on par!' : `${moves - par} over par`;
    this.winEl.innerHTML = `
      <div class="card">
        <h2>Pad cleared!</h2>
        <div class="stars" aria-label="${n} of 3 stars">${'★'.repeat(n)}<span class="dim">${'★'.repeat(3 - n)}</span></div>
        <p class="result">${moves} moves · par ${par}</p>
        <p class="verdict">${verdict}</p>
        ${this.handlers.onNext ? '<button class="btn primary" data-act="next">Next level ›</button>' : '<p class="verdict">That was the last level. Nice work!</p>'}
        <button class="btn" data-act="restart">Play again</button>
        <button class="link" data-act="levels">All levels</button>
      </div>`;
    this.winEl.hidden = false;
  }
}
