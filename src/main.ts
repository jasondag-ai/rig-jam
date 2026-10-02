import './ui/style.css';
import { DAILY_LEVELS, REGIONS, dailyTheme } from './levels/regions.ts';
import { dayKey, padLevelIndex, padNumber, streak } from './ui/daily.ts';
import { GameView } from './ui/game-view.ts';
import { streakSignHtml } from './ui/sign.ts';
import { hatsHtml } from './ui/hats.ts';
import { hardHats, loadProgress, resetProgress, saveProgress } from './ui/progress.ts';
import { levelLockText, levelOpen, newlyOpened, regionLockText, regionOpen } from './ui/unlocks.ts';
import { onTap } from './ui/tap.ts';
import { sceneryHtml } from './ui/scenery.ts';
import { THEMES, applyTheme, themeOverride } from './ui/themes.ts';
import { audio, sound } from './audio/engine.ts';
import { MUSIC_STYLES, type MusicStyle } from './audio/settings.ts';

// Sound starts on the first tap anywhere (iOS won't play audio before a gesture).
audio.install();

/** The region's season, unless ?theme=… overrides it for previewing. */
const themeFor = (regionIndex: number) => THEMES[themeOverride(location.search) ?? REGIONS[regionIndex].theme];

const app = document.querySelector<HTMLElement>('#app')!;

const PADLOCK = `<svg class="padlock" viewBox="0 0 20 24" aria-hidden="true"><path d="M5 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="2" y="10" width="16" height="12" rx="3"/><circle cx="10" cy="16" r="2" class="keyhole"/></svg>`;

/** Locked things just shake when tapped. */
function shake(el: HTMLElement): void {
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}
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

function showLevels(requested = savedRegion()): void {
  game = null;
  sound.quiet();
  const progress = loadProgress();
  // A remembered region that's locked (after a reset, or demo mode off) falls back to Cardium.
  const regionIndex = regionOpen(REGIONS, requested, progress.best, progress.demo) ? requested : 0;
  try {
    localStorage.setItem(REGION_KEY, REGIONS[regionIndex].id);
  } catch {
    // Not remembered; fine.
  }
  const region = REGIONS[regionIndex];
  const screen = document.createElement('div');
  screen.className = 'screen levels';
  applyTheme(screen, themeFor(regionIndex));
  screen.innerHTML = `
    <div class="scenery" aria-hidden="true"></div>
    <header class="brand">
      <button class="gear" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.7c.1.6.1 1.2 0 1.8l2 1.7-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.7c-.1-.6-.1-1.2 0-1.8l-2-1.7 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9z"/><circle cx="12" cy="10.8" r="3"/></svg></button>
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
    const open = regionOpen(REGIONS, i, progress.best, progress.demo);
    const tab = document.createElement('button');
    tab.className = `region-tab${open ? '' : ' locked'}`;
    tab.dataset.index = String(i);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(i === regionIndex));
    tab.innerHTML =
      `<span class="rname">${open ? '' : PADLOCK}<span class="rtext"></span></span>` +
      (open ? `<span class="rdone">${done}/${r.levels.length}</span>` : '<span class="rlock"></span>');
    tab.querySelector('.rtext')!.textContent = r.name;
    if (!open) {
      tab.querySelector('.rlock')!.textContent = regionLockText(REGIONS, i, progress.best);
      tab.setAttribute('aria-disabled', 'true');
    }
    tabs.append(tab);
  });
  // Tabs and the gear act on the first tap, even on iOS (see tap.ts).
  onTap(tabs as HTMLElement, '.region-tab', (tab) => {
    const i = Number(tab.dataset.index);
    if (tab.classList.contains('locked')) shake(tab);
    else showLevels(i);
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
  onTap(screen.querySelector('.brand')!, '.gear', () => showSettings(screen));

  const list = screen.querySelector('.level-list')!;
  region.levels.forEach((level, i) => {
    const best = progress.best[level.id];
    const open = levelOpen(REGIONS, regionIndex, i, progress.best, progress.demo);
    const li = document.createElement('li');
    li.innerHTML = open
      ? `<button class="level-btn" data-index="${i}">
          <span class="n">${i + 1}</span>
          <span class="label"></span>
          <span class="hats">${best === undefined ? '' : hatsHtml(hardHats(best, level.par))}</span>
        </button>`
      : `<button class="level-btn locked" data-index="${i}" aria-disabled="true">
          <span class="n">${PADLOCK}</span>
          <span class="label"><span class="lname"></span><span class="lock-text"></span></span>
        </button>`;
    if (open) li.querySelector('.label')!.textContent = level.name;
    else {
      li.querySelector('.lname')!.textContent = level.name;
      li.querySelector('.lock-text')!.textContent = levelLockText(REGIONS, regionIndex, i, progress.best);
    }
    list.append(li);
  });
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.level-btn');
    if (!btn) return;
    if (btn.classList.contains('locked')) shake(btn);
    else showGame(regionIndex, Number(btn.dataset.index));
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

  // A region earned for real gets a one-time "NEW LEASE OPEN" banner.
  const fresh = newlyOpened(REGIONS, progress.best, progress.announced);
  if (fresh.length) {
    saveProgress({ ...loadProgress(), announced: [...progress.announced, ...fresh.map((r) => r.id)] });
    const banner = document.createElement('div');
    banner.className = 'lease-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `<span class="lb-top">NEW LEASE OPEN</span><span class="lb-name"></span>`;
    banner.querySelector('.lb-name')!.textContent = fresh.at(-1)!.name;
    document.body.append(banner); // outside the scrolling list so it stays pinned to the top
    setTimeout(() => banner.remove(), 3200);
  }
}

function showGame(regionIndex: number, index: number): void {
  const region = REGIONS[regionIndex];
  const hasNext = index + 1 < region.levels.length;
  game = new GameView(
    region.levels[index],
    `${region.name} ${index + 1}`,
    themeFor(regionIndex),
    {
      onLevels: () => showLevels(regionIndex),
      onNext: hasNext ? () => showGame(regionIndex, index + 1) : null,
    },
    null,
    // Block heater cords in Duvernay's cold; the landowner minds his Montney mud.
    { cords: region.id === 'duvernay', landowner: region.id === 'montney' },
  );
  app.replaceChildren(game.el);
  game.fit();
}

/** Settings panel over the level list: Reset progress, with a confirm step. */
function showSettings(screen: HTMLElement): void {
  const panel = document.createElement('div');
  panel.className = 'overlay settings';
  panel.innerHTML = `
    <div class="card" role="dialog" aria-label="Settings">
      <h2>Settings</h2>
      <div class="step ask">
        <label class="switch">
          <input type="checkbox" role="switch" data-act="sfx" ${audio.settings.sfx ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Sound effects</span>
        </label>
        <label class="switch">
          <input type="checkbox" role="switch" data-act="music" ${audio.settings.music ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Music</span>
        </label>
        <div class="music-styles" role="radiogroup" aria-label="Music style">
          ${MUSIC_STYLES.map(
            (m) => `<button class="btn style-pick" role="radio" data-style="${m.id}" aria-checked="${audio.settings.style === m.id}">${m.name}</button>`,
          ).join('')}
        </div>
        <label class="switch">
          <input type="checkbox" role="switch" data-act="demo" ${loadProgress().demo ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Unlock everything (demo mode)</span>
        </label>
        <button class="btn danger" data-act="reset">Reset progress</button>
        <button class="btn" data-act="close">Done</button>
      </div>
      <div class="step confirm" hidden>
        <p class="warn">This wipes your levels, hard hats and streak. Sure?</p>
        <button class="btn danger" data-act="wipe">Yes, wipe it</button>
        <button class="btn" data-act="cancel">Cancel</button>
      </div>
    </div>`;
  const ask = panel.querySelector<HTMLElement>('.ask')!;
  const confirm = panel.querySelector<HTMLElement>('.confirm')!;
  panel.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'reset') [ask.hidden, confirm.hidden] = [true, false];
    if (act === 'cancel') [ask.hidden, confirm.hidden] = [false, true];
    if (act === 'close' || e.target === panel) {
      panel.remove();
      showLevels(); // redraw with the current locks
    }
    if (act === 'wipe') {
      resetProgress();
      showLevels(0); // a brand-new player
    }
  });
  // Demo mode only flips a flag: scores, hard hats and streak stay exactly as they are.
  panel.querySelector<HTMLInputElement>('[data-act="demo"]')!.addEventListener('change', (e) => {
    saveProgress({ ...loadProgress(), demo: (e.target as HTMLInputElement).checked });
  });
  panel.querySelector<HTMLInputElement>('[data-act="sfx"]')!.addEventListener('change', (e) => {
    audio.setSettings({ sfx: (e.target as HTMLInputElement).checked });
  });
  panel.querySelector<HTMLInputElement>('[data-act="music"]')!.addEventListener('change', (e) => {
    audio.setSettings({ music: (e.target as HTMLInputElement).checked });
  });
  // Picking a style also turns the music on, so you hear what you picked.
  onTap(panel.querySelector<HTMLElement>('.music-styles')!, '.style-pick', (btn) => {
    const style = btn.dataset.style as MusicStyle;
    audio.setSettings({ style, music: true });
    panel.querySelector<HTMLInputElement>('[data-act="music"]')!.checked = true;
    panel.querySelectorAll('.style-pick').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
  });
  screen.append(panel);
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
