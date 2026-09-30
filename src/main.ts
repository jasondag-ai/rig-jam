import './ui/style.css';
import rawLevels from './levels/levels.json';
import { parseLevels, type Level } from './engine/index.ts';
import { GameView } from './ui/game-view.ts';
import { loadBest, stars } from './ui/progress.ts';

const levels: Level[] = parseLevels(rawLevels);
const app = document.querySelector<HTMLElement>('#app')!;
let game: GameView | null = null;

function showLevels(): void {
  game = null;
  const best = loadBest();
  const screen = document.createElement('div');
  screen.className = 'screen levels';
  screen.innerHTML = `
    <header class="brand">
      <h1>Rush Hour Rigs</h1>
      <p>Slide each truck out through the gate of its color. Trucks only move the way they face.</p>
    </header>
    <ol class="level-list"></ol>`;
  const list = screen.querySelector('.level-list')!;
  levels.forEach((level, i) => {
    const b = best[level.id];
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="level-btn" data-index="${i}">
        <span class="n">${i + 1}</span>
        <span class="label"></span>
        <span class="stars">${b === undefined ? '' : '★'.repeat(stars(b, level.par))}</span>
      </button>`;
    li.querySelector('.label')!.textContent = level.name;
    list.append(li);
  });
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.level-btn');
    if (btn) showGame(Number(btn.dataset.index));
  });
  app.replaceChildren(screen);
}

function showGame(index: number): void {
  const level = levels[index];
  const hasNext = index + 1 < levels.length;
  game = new GameView(level, index, {
    onLevels: showLevels,
    onNext: hasNext ? () => showGame(index + 1) : null,
  });
  app.replaceChildren(game.el);
  game.fit();
}

window.addEventListener('resize', () => game?.fit());
showLevels();
