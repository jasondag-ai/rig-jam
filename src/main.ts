import './ui/style.css';
import { REGIONS } from './levels/regions.ts';
import { GameView } from './ui/game-view.ts';
import { hatsHtml } from './ui/hats.ts';
import { hardHats, loadProgress } from './ui/progress.ts';

const app = document.querySelector<HTMLElement>('#app')!;
const REGION_KEY = 'rush-hour-rigs:region';
let game: GameView | null = null;

function savedRegion(): number {
  try {
    const i = REGIONS.findIndex((r) => r.id === localStorage.getItem(REGION_KEY));
    return i >= 0 ? i : 0;
  } catch {
    return 0;
  }
}

function showLevels(regionIndex = savedRegion()): void {
  game = null;
  try {
    localStorage.setItem(REGION_KEY, REGIONS[regionIndex].id);
  } catch {
    // Not remembered; fine.
  }
  const region = REGIONS[regionIndex];
  const progress = loadProgress();
  const screen = document.createElement('div');
  screen.className = 'screen levels';
  screen.innerHTML = `
    <header class="brand">
      <h1>Rush Hour Rigs</h1>
      <p>Slide each truck out through the gate of its color. Trucks slide only along their length. One drag is one move.</p>
    </header>
    <div class="regions" role="tablist"></div>
    <p class="region-blurb"></p>
    <ol class="level-list"></ol>
    <p class="hint-balance">Hints left: <strong>${progress.hints}</strong> · clear a level at par to earn one</p>`;

  const tabs = screen.querySelector('.regions')!;
  REGIONS.forEach((r, i) => {
    const done = r.levels.filter((l) => progress.best[l.id] !== undefined).length;
    const tab = document.createElement('button');
    tab.className = 'region-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(i === regionIndex));
    tab.innerHTML = `<span class="rname"></span><span class="rdone">${done}/${r.levels.length}</span>`;
    tab.querySelector('.rname')!.textContent = r.name;
    tab.addEventListener('click', () => showLevels(i));
    tabs.append(tab);
  });
  screen.querySelector('.region-blurb')!.textContent = region.blurb;

  const list = screen.querySelector('.level-list')!;
  region.levels.forEach((level, i) => {
    const best = progress.best[level.id];
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="level-btn" data-index="${i}">
        <span class="n">${i + 1}</span>
        <span class="label"></span>
        <span class="hats">${best === undefined ? '' : hatsHtml(hardHats(best, level.par))}</span>
      </button>`;
    li.querySelector('.label')!.textContent = level.name;
    list.append(li);
  });
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.level-btn');
    if (btn) showGame(regionIndex, Number(btn.dataset.index));
  });
  app.replaceChildren(screen);
}

function showGame(regionIndex: number, index: number): void {
  const region = REGIONS[regionIndex];
  const hasNext = index + 1 < region.levels.length;
  game = new GameView(region.levels[index], region.name, index, {
    onLevels: () => showLevels(regionIndex),
    onNext: hasNext ? () => showGame(regionIndex, index + 1) : null,
  });
  app.replaceChildren(game.el);
  game.fit();
}

window.addEventListener('resize', () => game?.fit());
showLevels();
