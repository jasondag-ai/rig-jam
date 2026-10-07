// Sound test (Playwright). Chromium as an iPhone 13 with real touch events, using ?audiolog to read
// which cues fired; WebKit for what Safari decodes.
//  - sound is OFF by default and NOTHING is fetched from /audio/ until a switch is turned on, and
//    never before the first tap; the effects load when Sound effects goes on, one music loop only
//    when Music goes on
//  - each game event plays its picked sound: drag and motor, the beeper backing up, bump then radio,
//    gate and whoosh on an exit, the horn chord on a chain (three pitches), win and lose, UI pops
//  - gag sounds come from the gag's beats, and its loops stop when it ends
//  - music: three styles, a menu loop and a quieter in-play loop, remembered; every loop file
//    decodes to exactly its loop's length (no padding left in the loop) and meets itself at the seam
//  - the Credits screen
// Run with the dev server up: npm run test:e2e:audio
import { CORE_KEYS, LAZY_KEYS } from '../src/audio/pack.ts';
import { UNLOCKED } from './progress.mjs';
import { chromium, devices, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { cabSide, getMoveRange, newGame, solve } from '../src/engine/index.ts';
import pack from '../src/audio/pack.json' with { type: 'json' };

const BASE = process.env.URL ?? 'http://localhost:5173/';
const Q = '?audiolog&cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const browser = await chromium.launch();
async function open({ query = Q, audio = null } = {}) {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  const fetched = [];
  // (The game's own sound files, not the code under src/audio/.)
  page.on('request', (r) => { const m = r.url().match(/\/audio\/((?:sfx|music)\/[^?]+)/); if (m && !r.url().includes('/src/')) fetched.push(m[1]); });
  await page.goto(BASE + query, { waitUntil: 'networkidle' });
  await page.evaluate(([p, a]) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
    if (a) localStorage.setItem('rush-hour-rigs-audio', a);
  }, [UNLOCKED, audio && JSON.stringify(audio)]);
  fetched.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp, fetched };
}
const tp = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
const touch = async (cdp, x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const tapOn = async (page, cdp, sel) => {
  const b = await (await page.$(sel)).boundingBox();
  await touch(cdp, b.x + b.width / 2, b.y + b.height / 2);
  await wait(250);
};
async function drag(page, cdp, id, cells) {
  const el = await page.$(`.truck[data-id="${id}"]:not(.exiting)`);
  const b = await el.boundingBox();
  const h = b.width > b.height;
  const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
  let x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
  for (let k = 0; k < 8; k++) {
    if (h) x += (cells * cell) / 8;
    else y += (cells * cell) / 8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x, y) });
    await wait(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(450);
}
/** Cues played since the last call (loads left out), then clears the log. */
const heard = (page) => page.evaluate(() => { const a = window.__rhrAudio; const l = a ? a.log.filter((n) => !n.startsWith('loaded:')) : []; if (a) a.log.length = 0; return l; });
const count = (log, name) => log.filter((n) => n === name).length;
const list = (log) => [...new Set(log)].join(' ');
const enter = async (page, tab, index) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await wait(200);
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await wait(150);
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await page.waitForSelector('.board .truck');
  await wait(400);
};
const ON = { sfx: true, music: false, style: 'country' };

// ---------- 1. Off by default; nothing fetched; nothing before the first tap ----------
console.log('\nchromium iPhone 13: sound is off until asked for');
{
  const { context, page, cdp, fetched } = await open();
  check(await page.evaluate(() => window.__rhrAudio && window.__rhrAudio.ctx === null), 'no audio before the first tap');
  const defaults = await page.evaluate(() => window.__rhrAudio.settings);
  check(defaults.sfx === false && defaults.music === false && defaults.style === 'country', `defaults: effects off, music off, Country (${JSON.stringify(defaults)})`);
  await touch(cdp, 5, 5);
  await wait(300);
  check((await page.evaluate(() => window.__rhrAudio.ctx?.state)) === 'running', 'the first tap starts the audio');
  await enter(page, 1, 0);
  const lv = REGIONS[0].levels[0];
  const first = solve(lv)[0];
  await drag(page, cdp, first.id, first.delta);
  await wait(400);
  const log = await heard(page);
  check(fetched.length === 0 && log.filter((n) => n !== 'unlock').length === 0, `with both switches off, a drag plays nothing and nothing is fetched from /audio/ (${fetched.length} requests)`);

  // Sound effects on: the game's own effects load (not the wave 3 gags' own: a level fetches those), and no music.
  await page.evaluate(() => document.querySelector('.hud [data-act="levels"]').click());
  await wait(200);
  await tapOn(page, cdp, '.brand .gear');
  await page.$eval('[data-act="sfx"]', (i) => i.click());
  await page.waitForFunction((n) => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:sfx/')).length >= n, CORE_KEYS.length, { timeout: 15000 }).catch(() => {});
  const loaded = await page.evaluate(() => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:')).length);
  check(loaded === CORE_KEYS.length && fetched.every((f) => f.startsWith('sfx/')), `Sound effects on: its ${loaded} files load, and no music (${fetched.filter((f) => f.startsWith('music/')).length} music requests)`);

  // Music on: ONE loop is fetched (Country's menu loop), and it plays.
  await page.$eval('[data-act="music"]', (i) => i.click());
  await page.waitForFunction(() => window.__rhrAudio.musicState(), null, { timeout: 15000 }).catch(() => {});
  let music = await page.evaluate(() => window.__rhrAudio.musicState());
  const musicFiles = () => fetched.filter((f) => f.startsWith('music/'));
  check(music?.key === 'country_menu' && musicFiles().length === 1, `Music on: one loop is fetched and plays, Country's menu loop (${musicFiles().join(', ')})`);
  check(Math.abs(music.loopEnd - music.loopStart - pack.music.country_menu.seconds) < 0.03, `it loops over exactly its ${pack.music.country_menu.seconds} s (${(music.loopEnd - music.loopStart).toFixed(3)} s between its loop points)`);

  // The three styles switch in Settings; each has its own menu loop.
  const names = await page.$$eval('.style-pick', (bs) => bs.map((b) => b.textContent));
  check(names.join() === 'Country,80s Retro,Chill', `Settings offers a Music style: ${names.join(', ')}`);
  for (const [style, key] of [['retro', 'retro_menu'], ['chill', 'chill_menu']]) {
    await tapOn(page, cdp, `.style-pick[data-style="${style}"]`);
    await page.waitForFunction((k) => window.__rhrAudio.musicState()?.key === k, key, { timeout: 15000 }).catch(() => {});
    music = await page.evaluate(() => window.__rhrAudio.musicState());
    check(music?.key === key && (await page.$eval(`.style-pick[data-style="${style}"]`, (b) => b.getAttribute('aria-checked'))) === 'true', `${style}: its menu loop plays (${music?.key})`);
  }
  // Credits.
  await tapOn(page, cdp, '[data-act="credits"]');
  const credits = await page.evaluate(() => { const c = document.querySelector('.step.credits'); return { shown: !c.hidden, music: [...c.querySelectorAll('ul')][0].children.length, sfx: [...c.querySelectorAll('ul')][1].children.length, text: c.textContent }; });
  check(credits.shown && credits.music === 6 && credits.sfx >= 5 && /Chill Beat/.test(credits.text) && /Pixabay Content License/.test(credits.text) && /Mixkit/.test(credits.text) && /CC0/.test(credits.text), `Credits lists the ${credits.music} music loops and the effects' ${credits.sfx} sources, with their licences`);
  await tapOn(page, cdp, '.step.credits [data-act="cancel"]');
  await tapOn(page, cdp, '.settings [data-act="close"]');
  // Into a level: the same style's in-play loop, quieter than the menu's.
  const menuGain = music.gain;
  await enter(page, 1, 1);
  await page.waitForFunction(() => window.__rhrAudio.musicState()?.key === 'chill_play', null, { timeout: 15000 }).catch(() => {});
  music = await page.evaluate(() => window.__rhrAudio.musicState());
  check(music?.key === 'chill_play' && music.gain < menuGain * 0.8, `in a level the in-play loop takes over, quieter than the menu loop (${music?.gain.toFixed(3)} against ${menuGain.toFixed(3)})`);
  await page.evaluate(() => document.querySelector('.hud [data-act="levels"]').click());
  await page.waitForFunction(() => window.__rhrAudio.musicState()?.key === 'chill_menu', null, { timeout: 8000 }).catch(() => {});
  check((await page.evaluate(() => window.__rhrAudio.musicState()?.key)) === 'chill_menu', 'back on the level list the menu loop returns');
  // Remembered.
  await page.reload({ waitUntil: 'networkidle' });
  const saved = await page.evaluate(() => window.__rhrAudio.settings);
  check(saved.sfx && saved.music && saved.style === 'chill' && (await page.evaluate(() => window.__rhrAudio.ctx === null)), `the choices are remembered (${JSON.stringify(saved)}), and after a reload nothing plays or loads until the first tap`);
  await context.close();
}

// ---------- 2. Each game event plays its picked sound ----------
console.log('\nchromium iPhone 13: every cue, at its moment (Sound effects on)');
{
  const { context, page, cdp } = await open({ audio: ON });
  await touch(cdp, 5, 5);
  await page.waitForFunction((n) => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:sfx/')).length >= n, CORE_KEYS.length, { timeout: 15000 });
  await heard(page);
  // UI pops.
  await tapOn(page, cdp, '.brand .help');
  await tapOn(page, cdp, '.tutorial [data-t="next"]');
  await tapOn(page, cdp, '.tutorial [data-t="close"]');
  let log = await heard(page);
  check(count(log, 'click') === 3 && count(log, 'tap') === 0, `every button, Close included, has the one click (${list(log)})`);

  // A level where a truck can back up, and one that is blocked.
  let pick = null;
  for (let i = 0; !pick && i < REGIONS[0].levels.length; i++) {
    const lv = REGIONS[0].levels[i];
    const s0 = newGame(lv);
    let reverse = null, blocked = null;
    for (const t of s0.trucks) {
      const r = getMoveRange(s0, t.id);
      const fwd = cabSide(lv, t) === 'right' || cabSide(lv, t) === 'bottom';
      const back = fwd ? r.min : r.max;
      if (!reverse && back !== 0) reverse = { id: t.id, back };
      if (!blocked && r.max === 0 && r.exitDelta !== 1) blocked = { id: t.id, push: 1.2 };
      else if (!blocked && r.min === 0 && r.exitDelta !== -1) blocked = { id: t.id, push: -1.2 };
    }
    if (reverse && blocked) pick = { i, reverse, blocked };
  }
  await enter(page, 1, pick.i);
  await heard(page);
  await drag(page, cdp, pick.reverse.id, pick.reverse.back);
  log = await heard(page);
  check(log.includes('drag') && log.includes('motor') && log.includes('beeper'), `a drag: the engine starts and runs, and backing up sets off the beeper (${list(log)})`);
  check((await page.evaluate(() => window.__rhrAudio.loopRunning('motor') || window.__rhrAudio.loopRunning('beeper'))) === false, 'the truck let go: the engine and the beeper stop');
  await drag(page, cdp, pick.reverse.id, -pick.reverse.back);
  log = await heard(page);
  check(log.includes('motor') && !log.includes('beeper'), 'driving forward: no beeper');
  await drag(page, cdp, pick.blocked.id, pick.blocked.push);
  await wait(500);
  log = await heard(page);
  check(log.includes('bump') && log.indexOf('radio') > log.indexOf('bump') && !!(await page.$('.bubble')), `a bump: the thud, then the radio squelch with the driver's line (${list(log)})`);

  // Exits: the gate and the whoosh; a chain of exits adds the horn chord, at three pitches.
  const lv = REGIONS[0].levels[0];
  await enter(page, 1, 0);
  await heard(page);
  const sol = solve(lv);
  for (const m of sol) await drag(page, cdp, m.id, m.delta + Math.sign(m.delta) * 0.4);
  await wait(1500);
  log = await heard(page);
  check(count(log, 'clack') === lv.trucks.length && count(log, 'gate') === 0 && count(log, 'exit') === 0, `each truck out: one light wooden clack at the gate (${count(log, 'clack')}), and nothing of the old ratchet or whoosh`);
  check(count(log, 'horn') >= 1 && count(log, 'horn-chord') === count(log, 'horn') * 2, `back-to-back exits sound the toy horn as a chord, three pitches at once (${count(log, 'horn') + count(log, 'horn-chord')} horns)`);
  check(count(log, 'hat') === 3 && log.includes('tada') && !log.includes('win') && !log.includes('lose'), `cleared at par: a pop for each of the three hard hats, then the xylophone ta-da (${list(log)})`);

  // Well over par: the wah-wah horn.
  await page.evaluate(() => document.querySelector('.win [data-act="restart"], .win [data-act="again"]')?.click());
  await wait(500);
  await heard(page);
  {
    const t = lv.trucks[0], r = getMoveRange(newGame(lv), t.id);
    // Waste four moves (two trucks back and forth), then solve.
    const idle = newGame(lv).trucks.map((x) => ({ x, r: getMoveRange(newGame(lv), x.id) })).find(({ r: q }) => (q.max > 0 && q.exitDelta !== q.max) || (q.min < 0 && q.exitDelta !== q.min));
    if (idle) {
      const by = idle.r.max > 0 && idle.r.exitDelta !== idle.r.max ? 1 : -1;
      for (const d of [by, -by, by, -by]) await drag(page, cdp, idle.x.id, d);
      for (const m of sol) await drag(page, cdp, m.id, m.delta + Math.sign(m.delta) * 0.4);
      await wait(1500);
      log = await heard(page);
      check(log.includes('lose') && !log.includes('tada'), `cleared four over par: the wah-wah horn (${list(log.filter((n) => ['tada', 'lose', 'hat'].includes(n)))})`);
    } else console.log(`   (no spare move on ${lv.name} from the start: over-par sound not checked here; ${t.id} ${r.min}..${r.max})`);
  }
  // Effects off: silence, and the running sounds stop.
  await page.evaluate(() => window.__rhrAudio.setSettings({ sfx: false }));
  await heard(page);
  await page.evaluate(() => document.querySelector('.win:not([hidden]) [data-act="levels"]')?.click());
  await wait(300);
  log = await heard(page);
  check(log.length === 0, 'Sound effects off: nothing plays');
  await context.close();
}

// ---------- 3. Gag sounds follow the gag's beats ----------
console.log('\nchromium iPhone 13: gag sounds');
for (const [gag, want, loops, secs] of [
  ['biffya', ['knock', 'outhouse', 'poke', 'camera'], [], 6.5],
  ['tourists', ['camera', 'slap', 'scurry', 'wind'], ['tourists:steps', 'tourists:mosquito'], 10.5],
  ['landowner', ['quad_start', 'scurry', 'hop', 'wind', 'poke'], ['landowner:quad_idle', 'landowner:quad_rev'], 9.8],
  ['lunch', ['gopher', 'thwip', 'chomp', 'poke', 'burp'], ['gopherLunch:steps'], 19],
]) {
  const { context, page, cdp } = await open({ query: `?audiolog&gag=${gag}&night=0`, audio: ON });
  // (The first tap, somewhere that is not a button: low in the sky above the lease.)
  await touch(cdp, 195, 150);
  await page.waitForFunction((n) => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:sfx/')).length >= n, CORE_KEYS.length, { timeout: 15000 });
  // The preview plays again and again: listen to one whole run from its start.
  await page.waitForSelector('.strip-layer', { state: 'detached', timeout: 30000 });
  await heard(page);
  await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 10000 });
  await wait(secs * 1000);
  const log = await heard(page);
  const missing = [...want, ...loops].filter((n) => !log.includes(n));
  check(missing.length === 0, `${gag}: ${[...want, ...loops].join(', ')}${missing.length ? ` (missing: ${missing.join(', ')}; heard ${list(log)})` : ''}`);
  if (loops.length) {
    await page.waitForSelector('.strip-layer', { state: 'detached', timeout: 15000 }).catch(() => {});
    const running = await page.evaluate((ls) => ls.filter((l) => window.__rhrAudio.loopRunning(l)), loops);
    check(running.length === 0, `${gag}: its loops stop when it ends`);
  }
  await context.close();
}
// ---------- 3b. The pumpjack is only heard while a level is being played ----------
console.log('\nchromium iPhone 13: the pumpjack stops with the level');
{
  const montney = REGIONS.findIndex((r) => r.id === 'montney');
  const li = REGIONS[montney].levels.findIndex((l) => (l.obstacles ?? []).some((o) => (o.kind ?? 'pumpjack') === 'pumpjack'));
  const lv = REGIONS[montney].levels[li];
  const { context, page, cdp } = await open({ audio: ON });
  await touch(cdp, 195, 150);
  await page.waitForFunction((n) => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:sfx/')).length >= n, CORE_KEYS.length, { timeout: 15000 });
  await enter(page, montney + 1, li);
  await heard(page);
  // (A stroke takes about 8.6 s, so 10 s always holds one.)
  await wait(10000);
  check(count(await heard(page), 'pumpjack') >= 1, `${lv.name}: the pumpjack's stroke is heard while the level is played`);
  // The app is hidden: nothing. Shown again: it pumps.
  const hide = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await hide(true);
  await heard(page);
  await wait(10000);
  check(count(await heard(page), 'pumpjack') === 0, 'the app hidden for 10 s: no pumpjack');
  await hide(false);
  await wait(10000);
  check(count(await heard(page), 'pumpjack') >= 1, 'shown again: it pumps again');
  for (const m of solve(lv)) await drag(page, cdp, m.id, m.delta + Math.sign(m.delta) * 0.4);
  await page.waitForSelector('.win:not([hidden])', { timeout: 8000 }).catch(() => {});
  await wait(1500);
  await heard(page);
  await wait(10000);
  let log = await heard(page);
  check(!!(await page.$('.win:not([hidden])')) && count(log, 'pumpjack') === 0, `10 s on the win card: no pumpjack (${list(log) || 'silence'})`);
  await page.evaluate(() => document.querySelector('.win:not([hidden]) [data-act="levels"]').click());
  await wait(400);
  await heard(page);
  await wait(10000);
  log = await heard(page);
  check(!!(await page.$('.level-btn')) && count(log, 'pumpjack') === 0, `10 s on the level list: no pumpjack (${list(log) || 'silence'})`);
  await page.$eval('.binoculars', (b) => b.click());
  await wait(10000);
  log = await heard(page);
  check(!!(await page.$('.log-card')) && count(log, 'pumpjack') === 0, '10 s in the Wildlife Log: no pumpjack');
  await page.$eval('.log-head .back', (b) => b.click());
  await wait(200);
  await page.$eval(`.level-btn[data-index="${li}"]`, (b) => b.click());
  await page.waitForSelector('.board .truck');
  await heard(page);
  await wait(10000);
  check(count(await heard(page), 'pumpjack') >= 1, 'back on the level: it pumps again');
  await context.close();
}
await browser.close();

// ---------- 4. Every loop file decodes to exactly its loop: no gap, no click ----------
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  console.log(`\n${engine}: the music loops, as this browser decodes them`);
  const b = await type.launch();
  const page = await (await b.newContext()).newPage();
  await page.goto(BASE + '?cover=0', { waitUntil: 'networkidle' });
  for (const [key, info] of Object.entries(pack.music)) {
    const out = await page.evaluate(async ([formats, maxPad]) => {
      const ctx = new (window.AudioContext ?? window.webkitAudioContext)();
      const results = [];
      for (const f of formats) {
        const can = new Audio().canPlayType(f.type);
        try {
          const data = await (await fetch(`./audio/music/${f.file}`)).arrayBuffer();
          const buf = await new Promise((ok, no) => { const p = ctx.decodeAudioData(data, ok, no); if (p) p.then(ok, no); });
          const x = buf.getChannelData(0), rate = buf.sampleRate, max = Math.floor(maxPad * rate);
          // The game's own rule (pack.ts loopPoints): true silence at the head and tail is skipped.
          let a = 0; while (a < max && Math.abs(x[a]) <= 0.0008) a++;
          let z = x.length; while (x.length - z < max && z > a && Math.abs(x[z - 1]) <= 0.0008) z--;
          // The seam: the loop's last sample against its first, and against the steps just before and after.
          const jump = Math.abs(x[z - 1] - x[a]);
          let step = 0; for (let i = 1; i < 400; i++) step = Math.max(step, Math.abs(x[a + i] - x[a + i - 1]), Math.abs(x[z - i] - x[z - i - 1]));
          results.push({ file: f.file, can, seconds: (z - a) / rate, raw: x.length / rate, jump, step });
        } catch (e) {
          results.push({ file: f.file, can, error: String(e).slice(0, 60) });
        }
      }
      await ctx.close();
      return results;
    }, [info.formats, 0.08]);
    for (const r of out) {
      if (r.error) {
        // A format this browser says it cannot play is never asked for (the MP3 is); one it claims but cannot decode falls back to the MP3.
        check(r.file.endsWith('.mp3') === false, `${key}: ${r.file} does not decode here (canPlayType "${r.can}"): the game falls back to the MP3`);
        continue;
      }
      check(Math.abs(r.seconds - info.seconds) < 0.03 && r.jump <= Math.max(0.12, r.step * 2.5), `${key}: ${r.file} loops over ${r.seconds.toFixed(3)} s of its ${r.raw.toFixed(3)} s (the loop is ${info.seconds} s); at the seam the wave steps ${r.jump.toFixed(3)} (its own steps there: up to ${r.step.toFixed(3)})`);
    }
    check(out.some((r) => !r.error), `${key}: at least one format plays in ${engine}`);
  }
  await b.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
