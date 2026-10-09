import { demoLink } from './ui/demo-link.ts'; // FIRST: `?demo=1` keeps every write in memory (see the file)
import { bearStill } from './ui/bear.ts';
import { nightStill } from './ui/night.ts';
import { musicCredits, sfxCredits } from './audio/credits.ts';
import { bullStill } from './ui/bull.ts';
import { tongueStill } from './ui/frozen-tongue.ts';
import { geeseStill } from './ui/geese.ts';
import { samStill } from './ui/sam.ts';
import { lunchStill } from './ui/gopher-lunch.ts';
import { porcupineStill } from './ui/porcupine.ts';
import { marshmallowStill } from './ui/marshmallow.ts';
import { biffyAStill, biffyBStill, landownerStill, nearMissStill } from './ui/strip-gags.ts';
import { magpieStill } from './ui/magpie.ts';
import './ui/style.css';
import { DAILY_LEVELS, REGIONS, dailyTheme } from './levels/regions.ts';
import { STAND_DOWN_TOAST, dayKey, newlySaved, padLevelIndex, padNumber, streak } from './ui/daily.ts';
import { showTutorial } from './ui/tutorial.ts';
import { deerStill, surveyorStill, touristsStill } from './ui/sign-gags.ts';
import { toast } from './ui/toast.ts';
import { GameView } from './ui/game-view.ts';
import { streakSignHtml } from './ui/sign.ts';
import { hatsHtml } from './ui/hats.ts';
import { hardHats, loadProgress, resetProgress, saveProgress } from './ui/progress.ts';
import { levelLockText, levelOpen, newlyOpened, nextField, regionLockText, regionOpen } from './ui/unlocks.ts';
import { onTap } from './ui/tap.ts';
import { copyText } from './ui/clipboard.ts';
import { feedbackEmail, feedbackNow, rememberLevel } from './ui/feedback.ts';
import { showUpdateBar, watchForUpdates } from './ui/update.ts';
import { versionText } from './ui/version.ts';
import { fakeRegions, furthestOpen, runRegionBar } from './ui/region-bar.ts';
import { shouldShowCover, showCover } from './ui/cover.ts';
import { applyUiArt, uiImg } from './ui/ui-art.ts';
import { preloadSprites } from './ui/sprites.ts';
import { LOG_ENTRIES, applyCamo, cardHint, complete, foundCount, loadLog, previewAll, recordDig, saveLog, shownEntries, sightingToast, type Sighting } from './ui/wildlife-log.ts';
import { clockText, dugStill } from './ui/log-deep.ts';
import { PREVIEWS, type GagId } from './ui/gag-triggers.ts';
import { workerStill } from './ui/worker.ts';
import { mountDig } from './ui/log-dig-view.ts';
import { wave3Still } from './ui/scene-stage.ts';
import { MUSKEG, WAVE3 } from './ui/wave3.ts';
import { mooseStill } from './ui/moose.ts';
import { sceneryHtml } from './ui/scenery.ts';
import { THEMES, applyTheme, themeOverride } from './ui/themes.ts';
import { audio, sound } from './audio/engine.ts';
import { MUSIC_STYLES, type MusicStyle } from './audio/settings.ts';

// Sound starts on the first tap anywhere (iOS won't play audio before a gesture).
audio.install();
applyUiArt();
// Camo pickups, if the Wildlife Log is complete (and they're switched on).
applyCamo();

const BINOCULARS = uiImg('icon_binoculars');

/** Card art for each Wildlife Log entry: a still of the gag's own puppet (found: in color; not yet: a dark silhouette). */
const LOG_ART: Record<Sighting, () => string> = {
  dug: () => dugStill(),
  // Wave 3 (wave3.ts): the puppets at one moment, cut close.
  // Clearwater: Moe as the shovel bites the dirt; Moe out cold, seeing stars, the bearded worker strolling in.
  swings: () => wave3Still('golf', 6.7, [84, 70, 104, 84]),
  cold: () => wave3Still('cold', 8.4, [58, 74, 172, 84]),
  // Fresh Wash: Moe and his pickup, mud all over. Dinner Bell: Moe late, hands on his knees. One Pea: the bearded worker asks; Moe and his one pea.
  wash: () => wave3Still('wash', 9.7, [92, 62, 196, 100]),
  bell: () => wave3Still('bell', 9.3, [150, 80, 100, 84]),
  pea: () => wave3Still('pea', 5.8, [176, 70, 132, 86]),
  muskeg: () => wave3Still('muskeg', 3.1, [72, 76, 134, 90], MUSKEG),
  cattrain: () => wave3Still('catTrain', 9.4, [204, 92, 96, 66]),
  beaver: () => wave3Still('beaver', 1.6, [68, 92, 146, 62]),
  tumbleweed: () => wave3Still('tumbleweed', 7.4, [72, 92, 184, 68]),
  pdogs: () => wave3Still('pdogs', 7.4, [66, 96, 208, 62]),
  bale: () => wave3Still('bale', 5.4, [176, 84, 118, 72]),
  cloud: () => wave3Still('cloud', 9.0, [116, 22, 88, 134]),
  aurora: () => wave3Still('aurora', 4.4, [128, 6, 124, 126], `<rect x="128" y="6" width="124" height="126" rx="8" fill="#18213f"/><clipPath id="aur-card"><rect x="128" y="6" width="124" height="126" rx="8"/></clipPath><g clip-path="url(#aur-card)">${(WAVE3 as unknown as { aurora: { lights: (t: number, a: number, b: number) => string } }).aurora.lights(4.4, 120, 260)}<path d="M120 122 Q190 116 260 121 V140 H120 z" fill="#25392f" stroke="#2b1e16" stroke-width="2.4"/></g>`),
  magpie: () => magpieStill(),
  spotter: () => workerStill(),
  moose: () => mooseStill(),
  nearmiss: () => nearMissStill(),
  landowner: () => landownerStill(),
  biffy: () => biffyAStill(),
  biffyB: () => biffyBStill(),
  marshmallow: () => marshmallowStill(),
  geese: () => geeseStill(),
  porcupine: () => porcupineStill(),
  lunch: () => lunchStill(),
  sam: () => samStill(),
  tongue: () => tongueStill(),
  surveyor: () => surveyorStill(),
  deer: () => deerStill(),
  tourists: () => touristsStill(),
  night: () => nightStill(),
  bull: () => bullStill(),
  bear: () => bearStill(),
};

/** A log card's art box: this wide and tall at most (px). */
const ART_BOX = { w: 104, h: 84 };
/**
 * A log card's picture is shown at ITS OWN SHAPE, as big as fits the art box: its width and height
 * are set outright from its viewBox, so no browser has to work out a size (and none can stretch it).
 */
function fitArt(art: HTMLElement): void {
  const svg = art.querySelector<SVGSVGElement>(':scope > svg');
  const vb = svg?.getAttribute('viewBox')?.split(/[ ,]+/).map(Number);
  if (!svg || !vb || vb.length !== 4 || !(vb[2] > 0 && vb[3] > 0)) return;
  const k = Math.min(ART_BOX.w / vb[2], ART_BOX.h / vb[3]);
  svg.style.width = `${Math.round(vb[2] * k * 10) / 10}px`;
  svg.style.height = `${Math.round(vb[3] * k * 10) / 10}px`;
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

/** Text made safe to put in markup. */
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The region's season, unless ?theme=… overrides it for previewing. */
const themeFor = (regionIndex: number) => THEMES[themeOverride(location.search) ?? REGIONS[regionIndex].theme];

const app = document.querySelector<HTMLElement>('#app')!;

const PADLOCK = uiImg('icon_padlock', 'padlock');

/** Locked things just shake when tapped. */
function shake(el: HTMLElement): void {
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}
/** The level list's tree line: how tall its tallest trees are, and so how far under the header the horizon sits. */
const LIST_TREES = 24;
const REGION_KEY = 'rush-hour-rigs:region';
let game: GameView | null = null;

/** The region the player was last on (-1: none is remembered yet). */
function rememberedRegion(): number {
  try {
    return REGIONS.findIndex((r) => r.id === localStorage.getItem(REGION_KEY));
  } catch {
    return -1;
  }
}
const savedRegion = (): number => Math.max(0, rememberedRegion());

function showLevels(requested = savedRegion()): void {
  game?.leave();
  game = null;
  sound.quiet();
  const progress = loadProgress();
  // The region bar opens on the region the player was last on; with none remembered yet, on the furthest one unlocked.
  const barTarget = rememberedRegion() >= 0 ? -1 : furthestOpen(REGIONS, progress.best, progress.demo);
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
      <button class="help" aria-label="How to play">?</button>
      <button class="binoculars" aria-label="Wildlife Log">${BINOCULARS}</button>
      <button class="gear" aria-label="Settings">${uiImg('icon_gear')}</button>
      <h1>Rig Jam</h1>
      ${Object.keys(progress.best).length ? '' : '<p>Slide each truck out through the gate of its color. Trucks slide only along their length. One drag is one move.</p>'}
    </header>
    <div class="daily-block"></div>
    <div class="regions"><div class="regions-track" role="tablist"></div><svg class="regions-more" viewBox="0 0 12 18" aria-hidden="true"><path d="M3 3 L9 9 L3 15"/></svg></div>
    <p class="region-blurb"></p>
    <ol class="level-list"></ol>
    <p class="hint-balance">Hints left: <strong>${progress.hints}</strong> · clear a level at par to earn one</p>`;

  // The region bar: one row of full-size tabs, swiped left and right (region-bar.ts).
  const tabs = screen.querySelector<HTMLElement>('.regions-track')!;
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
  // (`?tabs=8`: made-up locked regions after the real ones, to try the bar with more tabs.)
  for (const name of fakeRegions(REGIONS.length)) {
    const tab = document.createElement('button');
    tab.className = 'region-tab locked fake';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-disabled', 'true');
    tab.innerHTML = `<span class="rname">${PADLOCK}<span class="rtext"></span></span><span class="rlock">Coming soon</span>`;
    tab.querySelector('.rtext')!.textContent = name;
    tabs.append(tab);
  }
  const bar = runRegionBar(screen.querySelector<HTMLElement>('.regions')!, tabs, barTarget >= 0 ? barTarget : regionIndex);
  // Tabs and the gear act on the first tap, even on iOS (see tap.ts). A swipe of the bar is never a tap.
  onTap(tabs, '.region-tab', (tab) => {
    if (!bar.tapped()) return;
    if (tab.classList.contains('locked')) shake(tab);
    else showLevels(Number(tab.dataset.index));
  });
  screen.querySelector('.region-blurb')!.textContent = region.blurb;

  // Today's Daily Pad and the streak sign, above the regions.
  const today = dayKey(new Date());
  const pad = padNumber(today);
  const daily = DAILY_LEVELS[padLevelIndex(pad, DAILY_LEVELS.length)];
  const s = streak(progress.dailyCleared, today);
  // The weekly Safety Stand-Down saves a streak by itself; say so once, the first time it shows.
  const saved = newlySaved(s, progress.standDowns);
  if (saved.length) {
    saveProgress({ ...progress, standDowns: [...progress.standDowns, ...saved] });
    void toast(STAND_DOWN_TOAST, { ms: 3000 });
  }
  const block = screen.querySelector('.daily-block')!;
  block.innerHTML = `
    ${streakSignHtml(s)}
    <button class="daily-btn${s.clearedToday ? ' done' : ''}">
      <span class="daily-title">Daily Pad #${pad}</span>
      <span class="daily-sub">${s.clearedToday ? 'Cleared today ✓ Come back tomorrow' : `Today's pad · par ${daily.par} · same for everyone`}</span>
    </button>`;
  block.querySelector('.daily-btn')!.addEventListener('click', () => showDaily());
  onTap(screen.querySelector('.brand')!, '.gear', () => showSettings(screen));
  onTap(screen.querySelector('.brand')!, '.help', () => void showTutorial(screen));
  onTap(screen.querySelector('.brand')!, '.binoculars', () => showLog(regionIndex));

  const list = screen.querySelector('.level-list')!;
  region.levels.forEach((level, i) => {
    const best = progress.best[level.id];
    const open = levelOpen(REGIONS, regionIndex, i, progress.best, progress.demo);
    const li = document.createElement('li');
    // One compact row per level; the whole row is the button. Three small hats (empty until earned),
    // or a padlock and what opens it.
    li.innerHTML = open
      ? `<button class="level-btn" data-index="${i}">
          <span class="n">${i + 1}</span>
          <span class="label"><span class="lname"></span></span>
          <span class="hats" aria-label="${best === undefined ? 'not cleared' : `${hardHats(best, level.par)} of 3 hard hats`}">${hatsHtml(best === undefined ? 0 : hardHats(best, level.par))}</span>
        </button>`
      : `<button class="level-btn locked" data-index="${i}" aria-disabled="true">
          <span class="n">${i + 1}</span>
          <span class="label"><span class="lname"></span><span class="lock-text"></span></span>
          <span class="lock">${PADLOCK}</span>
        </button>`;
    li.querySelector('.lname')!.textContent = level.name;
    if (!open) li.querySelector('.lock-text')!.textContent = levelLockText(REGIONS, regionIndex, i, progress.best);
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
  // The tree line stands below the title, never across it: the horizon is under the header and
  // the trees are short enough that their tops clear the lettering.
  const horizon = screen.querySelector('.brand')!.getBoundingClientRect().bottom - rect.top + LIST_TREES;
  screen.style.setProperty('--horizon', `${Math.round(horizon)}px`);
  screen.querySelector('.scenery')!.innerHTML = sceneryHtml(themeFor(regionIndex), rect.width, horizon + 40, {
    x: 0,
    y: horizon,
    width: rect.width,
    height: 0,
  }, { below: false, maxTree: LIST_TREES - 2, depth: 4 });

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

function showGame(regionIndex: number, index: number, force: GagId | null = null): void {
  const region = REGIONS[regionIndex];
  const hasNext = index + 1 < region.levels.length;
  game?.leave();
  rememberLevel(`${region.name} ${index + 1} "${region.levels[index].name}"`);
  game = new GameView(
    region.levels[index],
    `${region.name} ${index + 1}`,
    themeFor(regionIndex),
    {
      onLevels: () => showLevels(regionIndex),
      onNext: hasNext ? () => showGame(regionIndex, index + 1) : null,
      // The last level of a field: on to the next field if it is open (asked when the card is made, so this win counts).
      onNextField: hasNext
        ? null
        : () => {
            const p = loadProgress(), to = nextField(REGIONS, regionIndex, p.best, p.demo);
            return !to ? null : to.open ? { label: to.label, go: () => showLevels(to.index) } : { note: to.text };
          },
    },
    null,
    { regionId: region.id, levelIndex: index, force },
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
          <span class="switch-label">${uiImg('icon_speaker_on', 'spk on')}${uiImg('icon_speaker_off', 'spk off')}Sound effects</span>
        </label>
        <label class="switch">
          <input type="checkbox" role="switch" data-act="music" ${audio.settings.music ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Music</span>
        </label>
        <p class="styles-label" id="styles-label">Music style</p>
        <div class="music-styles" role="radiogroup" aria-labelledby="styles-label">
          ${MUSIC_STYLES.map(
            (m) => `<button class="btn style-pick" role="radio" data-style="${m.id}" aria-checked="${audio.settings.style === m.id}">${m.name}</button>`,
          ).join('')}
        </div>
        <label class="switch${loadLog().camoEarned ? '' : ' locked'}">
          <input type="checkbox" role="switch" data-act="camo" ${loadLog().camoEarned ? '' : 'disabled'} ${loadLog().camoEarned && loadLog().camo ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Camo pickups${loadLog().camoEarned ? '' : `<small>Find all ${LOG_ENTRIES.length} in the Wildlife Log</small>`}</span>
        </label>
        <label class="switch">
          <input type="checkbox" role="switch" data-act="demo" ${loadProgress().demo ? 'checked' : ''} />
          <span class="track" aria-hidden="true"><span class="knob"></span></span>
          <span class="switch-label">Unlock everything (demo mode)</span>
        </label>
        <button class="btn quiet" data-act="credits">Credits</button>
        ${feedbackEmail() ? `<div class="feedback"><b>Send feedback</b><span class="feedback-mail">${esc(feedbackEmail())}</span><button class="btn quiet" data-act="copy-feedback">Copy address and details</button><small>Adds your app version, phone and level.</small></div>` : ''}
        <button class="btn danger" data-act="reset">Reset progress</button>
        <button class="btn" data-act="close">Done</button>
        <p class="app-credit">Built by Jay Dagenais, directing AI (Claude)</p>
        <p class="app-version">${esc(versionText())}</p>
      </div>
      <div class="step credits" hidden>
        <div class="credits-list">
          <h3>Music</h3>
          <ul>${musicCredits().map((c) => `<li><b>${esc(c.title)}</b> by ${esc(c.author)}<small>${esc(c.licence)}</small></li>`).join('')}</ul>
          <h3>Sound effects</h3>
          <ul>${sfxCredits().map((c) => `<li><b>${esc(c.author)}</b> (${c.count})<small>${esc(c.licence)}</small></li>`).join('')}</ul>
          <p>Sounds from Pixabay, Mixkit, OpenGameArt and Kenney, trimmed and mixed for the game.</p>
        </div>
        <button class="btn" data-act="cancel">Back</button>
      </div>
      <div class="step confirm" hidden>
        <p class="warn">This wipes your levels, hard hats and streak. Sure?</p>
        <button class="btn danger" data-act="wipe">Yes, wipe it</button>
        <button class="btn" data-act="cancel">Cancel</button>
      </div>
    </div>`;
  const ask = panel.querySelector<HTMLElement>('.ask')!;
  const confirm = panel.querySelector<HTMLElement>('.confirm')!;
  const creditsStep = panel.querySelector<HTMLElement>('.step.credits')!;
  panel.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'reset') [ask.hidden, confirm.hidden] = [true, false];
    if (act === 'credits') [ask.hidden, creditsStep.hidden] = [true, false];
    if (act === 'copy-feedback') {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]')!;
      void copyText(feedbackNow(feedbackEmail())).then((ok) => {
        btn.textContent = ok ? 'Copied! Paste it into an email' : 'Could not copy. Press and hold the address';
        window.setTimeout(() => (btn.textContent = 'Copy address and details'), 2600);
      });
    }
    if (act === 'cancel') [ask.hidden, confirm.hidden, creditsStep.hidden] = [false, true, true];
    if (act === 'close' || e.target === panel) {
      panel.remove();
      showLevels(); // redraw with the current locks
    }
    if (act === 'wipe') {
      resetProgress();
      applyCamo(); // the Wildlife Log went with it
      showLevels(0); // a brand-new player
    }
  });
  panel.querySelector<HTMLInputElement>('[data-act="camo"]')!.addEventListener('change', (e) => {
    const log = { ...loadLog(), camo: (e.target as HTMLInputElement).checked };
    saveLog(log);
    applyCamo(log);
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

const swipesText = (n: number) => `${n} ${n === 1 ? 'swipe' : 'swipes'}`;

/** The Wildlife Log: a card per gag. Found ones show the character and a caption; the rest a silhouette and a hint. */
function showLog(regionIndex: number): void {
  game?.leave();
  game = null;
  sound.quiet();
  // Demo mode shows its own log; the real one comes back when demo mode is switched off.
  // (Under the hidden `?demo=1` link the log is simply shown complete, with no DEMO label: it is for recording video.)
  const demo = loadProgress().demo && !demoLink();
  const log = loadLog(loadProgress().demo);
  const entries = LOG_ENTRIES;
  const have = foundCount(log);
  const screen = document.createElement('div');
  screen.className = `screen log${demo ? ' demo-log' : ''}`;
  applyTheme(screen, themeFor(regionIndex));
  screen.innerHTML = `
    <div class="scenery" aria-hidden="true"></div>
    <header class="log-head">
      <button class="link back">${uiImg('icon_back', 'back-icon')}Levels</button>
      <h1>Wildlife Log${demo ? '<span class="demo-tag">DEMO</span>' : ''}</h1>
      <span class="log-count" aria-label="${have} of ${entries.length} found">${have}/${entries.length}</span>
    </header>
    <p class="log-reward"></p>`;
  const cards: HTMLElement[] = [];
  // (A hidden entry has no card until it is found: Dug Through.)
  for (const e of shownEntries(log)) {
    const found = log.found.includes(e.id);
    const li = document.createElement('li');
    li.className = `log-card ${found ? 'found' : 'unfound'}${e.legendary ? ' legendary' : ''}`;
    li.dataset.id = e.id;
    li.innerHTML = `${e.legendary ? '<span class="legend-tag">LEGENDARY</span>' : ''}<div class="art art-${e.id}" aria-hidden="true">${LOG_ART[e.id]()}</div><h2></h2><p></p>`;
    fitArt(li.querySelector<HTMLElement>('.art')!);
    li.querySelector('h2')!.textContent = found ? e.name : '???';
    // Sightings: a locked card shows a riddle (its plain hint in demo mode).
    // (Dug Through shows the player's best time through the Earth.)
    li.querySelector('p')!.textContent = found ? (e.id === 'dug' && log.dug ? `Best: ${swipesText(log.dugSwipes ?? 1)}, ${clockText(log.dug)}` : e.caption) : cardHint(e, demo);
    // A locked card in the game: a riddle first; a tap turns it over to the plain hint (and back).
    if (!found && !demo) {
      li.classList.add('riddle');
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-pressed', 'false');
      li.insertAdjacentHTML('beforeend', '<small class="hint-more">Tap for the hint</small>');
      const turn = () => {
        const plain = !li.classList.contains('plain');
        li.classList.toggle('plain', plain);
        li.setAttribute('aria-pressed', String(plain));
        li.querySelector('p')!.textContent = cardHint(e, plain);
        li.querySelector('.hint-more')!.textContent = plain ? 'Tap for the riddle' : 'Tap for the hint';
      };
      li.addEventListener('click', turn);
      li.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); turn(); } });
    }
    cards.push(li);
  }
  screen.querySelector('.log-reward')!.textContent = demo
    ? `Demo log: ${have} of ${entries.length}. These sightings don't count toward your real log or camo.`
    : complete(log)
      ? `All ${entries.length} found! Camo pickups unlocked (switch them off in Settings).`
      : log.camoEarned
        ? `Camo pickups unlocked. ${entries.length - have} new sightings to find.`
        : `Sightings. Find all ${entries.length} to unlock camo pickups.`;
  // Every card found but the hidden one: a nudge to keep going down.
  if (!demo && !complete(log) && shownEntries(log).every((e) => log.found.includes(e.id))) screen.querySelector('.log-reward')!.textContent = `Every card found, but the log reads ${have}/${entries.length}. One sighting is hidden. Keep digging.`;
  // The deep dig: the cards stand over one continuous cross-section down to the oil (log-dig.ts).
  const progress = loadProgress();
  // Scrolled from the grass right through the Earth to Kerguelen: Dug Through is found (a hidden
  // entry until then; it counts toward the camo like any other) and the bests are kept. What comes
  // back is the arrival card: this dig's swipes and time, and the best.
  const arrived = (ms: number, swipes: number): { title: string; lines: string[]; confetti?: boolean } => {
    const time = clockText(ms);
    const now = `${swipesText(swipes)} in ${time}`;
    if (previewAll(location.search)) return { title: 'Dug Through!', lines: [now], confetti: true };
    const r = recordDig(loadLog(demo), ms, swipes);
    saveLog(r.log, demo);
    if (r.isNew) {
      const count = screen.querySelector('.log-count')!;
      count.textContent = `${r.count}/${entries.length}`;
      count.setAttribute('aria-label', `${r.count} of ${entries.length} found`);
      void toast(sightingToast('dug', r.count, demo));
      if (r.completed && demo) void toast('Demo log complete!', { sub: 'Your real log is unchanged', big: true, ms: 3200 });
      else if (r.completed) {
        void toast('Wildlife Log complete!', { sub: log.camoEarned ? 'Every sighting found' : 'Camo pickups unlocked', big: true, ms: 3200 });
        applyCamo(r.log);
      }
    }
    // The card leads with the news (the first time), then this dig, then the bests.
    const best = `Best: ${swipesText(r.bestSwipes)}, ${clockText(r.best)}`;
    const beaten = !r.isNew && (r.newBest || r.fewest);
    return r.isNew
      ? { title: 'New sighting!', lines: ['Dug Through added to your Wildlife Log.', now, best], confetti: true }
      : { title: 'Dug Through!', lines: [now, beaten ? `New best! ${best.slice(6)}` : best], confetti: beaten };
  };
  const dig = mountDig(cards, screen.querySelector<HTMLElement>('.log-reward')!, (id) => regionOpen(REGIONS, REGIONS.findIndex((r) => r.id === id), progress.best, progress.demo), arrived);
  screen.append(dig.el);
  onTap(screen.querySelector('.log-head')!, '.back', () => showLevels(regionIndex));
  app.replaceChildren(screen);
  dig.layout();
  void document.fonts?.ready.then(() => dig.layout());
  // A tree line along the horizon under the title, as on the level list.
  const rect = screen.getBoundingClientRect();
  const horizon = screen.querySelector('.log-head')!.getBoundingClientRect().bottom - rect.top + 8;
  screen.style.setProperty('--horizon', `${Math.round(horizon)}px`);
  screen.querySelector('.scenery')!.innerHTML = sceneryHtml(themeFor(regionIndex), rect.width, horizon + 40, { x: 0, y: horizon, width: rect.width, height: 0 }, { below: false, maxTree: 64 });
}

/** Today's Daily Pad, picked by the phone's local date. */
function showDaily(): void {
  const day = dayKey(new Date());
  const pad = padNumber(day);
  const level = { ...DAILY_LEVELS[padLevelIndex(pad, DAILY_LEVELS.length)], name: `Daily Pad #${pad}` };
  const theme = THEMES[themeOverride(location.search) ?? dailyTheme(pad)];
  game?.leave();
  rememberLevel(level.name);
  game = new GameView(level, "Today's pad", theme, { onLevels: () => showLevels(), onNext: null }, { pad, day });
  app.replaceChildren(game.el);
  game.fit();
}

window.addEventListener('resize', () => game?.fit());
document.fonts?.ready.then(() => game?.fit());

// Offline play and Add to Home Screen. Only in the built site, so dev reloads stay simple.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // The worker sits beside the page, wherever the site is served from (the site's root, or
  // /rush-hour-rigs/ on GitHub Pages): its address and its scope are worked out from the page's own.
  const register = () => void navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: new URL('./', document.baseURI).pathname }).catch(() => {});
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
  // A new service worker taking this page over (not the first one ever installed) means a new version is in.
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) showUpdateBar(); });
}
// UPDATES (update.ts): an open or installed copy is told when a new version is live, with a bar to
// tap; nothing reloads by itself. (`?update=test` shows the bar, for tests and previews.)
if (import.meta.env.PROD) watchForUpdates(() => showUpdateBar());
if (new URLSearchParams(location.search).get('update') === 'test') showUpdateBar();
/**
 * Test/preview links: ?gag=bear (Montney), ?gag=moose (Duvernay), ?gag=gopher|geese|pumper (Cardium)
 * or ?gag=biffy (a level with the biffy below the board) opens that level and plays the scene straight away, over and over.
 */
/** `?gag=<name>` opens a suitable level and plays that gag at once, again and again (gag-triggers.ts `PREVIEWS`). */
function forcedGag(): boolean {
  const preview = PREVIEWS[new URLSearchParams(location.search).get('gag') ?? ''];
  if (!preview) return false;
  showGame(REGIONS.findIndex((r) => r.id === preview.region), preview.level - 1, preview.gag);
  return true;
}

if (!forcedGag()) {
  // FIRST RUN (Job O): a brand-new player goes from the cover straight into level 1, which teaches
  // itself with the ghost finger: one tap and they are playing. Everyone else gets the level list.
  const firstRun = (): boolean => {
    const p = loadProgress();
    return !p.demo && Object.keys(p.best).length === 0 && p.dailyCleared.length === 0;
  };
  if (shouldShowCover(location.search, navigator.webdriver === true)) showCover(app, () => (firstRun() ? showGame(0, 0) : showLevels()));
  else showLevels();
}
// Every truck sprite, quietly, once the first screen is up (each level also warms its own first).
const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
idle(() => preloadSprites((['pickup', 'picker', 'vac', 'frac', 'water'] as const).flatMap((kind) => (['red', 'blue', 'yellow', 'green', 'orange', 'purple'] as const).map((color) => ({ kind, color })))));
