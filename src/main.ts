import './ui/style.css';
import { DAILY_LEVELS, REGIONS, dailyTheme } from './levels/regions.ts';
import { dayKey, padLevelIndex, padNumber, streak } from './ui/daily.ts';
import { GameView } from './ui/game-view.ts';
import { streakSignHtml } from './ui/sign.ts';
import { hatsHtml } from './ui/hats.ts';
import { hardHats, loadProgress } from './ui/progress.ts';
import { sceneryHtml } from './ui/scenery.ts';
import { THEMES, applyTheme, themeOverride } from './ui/themes.ts';

/** The region's season, unless ?theme=… overrides it for previewing. */
const themeFor = (regionIndex: number) => THEMES[themeOverride(location.search) ?? REGIONS[regionIndex].theme];

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
  applyTheme(screen, themeFor(regionIndex));
  screen.innerHTML = `
    <div class="scenery" aria-hidden="true"></div>
    <header class="brand">
      <h1>Rush Hour Rigs</h1>
      <p>Slide each truck out through the gate of its color. Trucks slide only along their length. One drag is one move.</p>
    </header>
    <div class="daily-block"></div>
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

  // Today's Daily Pad and the streak sign, above the regions.
  const today = dayKey(new Date());
  const pad = padNumber(today);
  const daily = DAILY_LEVELS[padLevelIndex(pad, DAILY_LEVELS.length)];
  const s = streak(progress.dailyCleared, today);
  const block = screen.querySelector('.daily-block')!;
  block.innerHTML = `
    ${streakSignHtml(s)}
    <button class="daily-btn${s.clearedToday ? ' done' : ''}">
      <span class="daily-title">Daily Pad #${pad}</span>
      <span class="daily-sub">${s.clearedToday ? 'Cleared today ✓ Come back tomorrow' : `Today's pad · par ${daily.par} · same for everyone`}</span>
    </button>`;
  block.querySelector('.daily-btn')!.addEventListener('click', () => showDaily());

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

  // A tree line along the horizon under the title.
  const rect = screen.getBoundingClientRect();
  const horizon = screen.querySelector('.brand')!.getBoundingClientRect().bottom - rect.top + 8;
  screen.style.setProperty('--horizon', `${Math.round(horizon)}px`);
  screen.querySelector('.scenery')!.innerHTML = sceneryHtml(themeFor(regionIndex), rect.width, horizon + 40, {
    x: 0,
    y: horizon,
    width: rect.width,
    height: 0,
  }, false, 64);
}

function showGame(regionIndex: number, index: number): void {
  const region = REGIONS[regionIndex];
  const hasNext = index + 1 < region.levels.length;
  game = new GameView(region.levels[index], `${region.name} ${index + 1}`, themeFor(regionIndex), {
    onLevels: () => showLevels(regionIndex),
    onNext: hasNext ? () => showGame(regionIndex, index + 1) : null,
  });
  app.replaceChildren(game.el);
  game.fit();
}

/** Today's Daily Pad, picked by the phone's local date. */
function showDaily(): void {
  const day = dayKey(new Date());
  const pad = padNumber(day);
  const level = { ...DAILY_LEVELS[padLevelIndex(pad, DAILY_LEVELS.length)], name: `Daily Pad #${pad}` };
  const theme = THEMES[themeOverride(location.search) ?? dailyTheme(pad)];
  game = new GameView(level, "Today's pad", theme, { onLevels: () => showLevels(), onNext: null }, { pad, day });
  app.replaceChildren(game.el);
  game.fit();
}

window.addEventListener('resize', () => game?.fit());
document.fonts?.ready.then(() => game?.fit());

// Offline play and Add to Home Screen. Only in the built site, so dev reloads stay simple.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'));
}
showLevels();
