// The buttons' click and the haptic tick (Playwright; Chromium as a Pixel 7, WebKit as an iPhone 13).
//  - EVERY button tap plays ONE `click`: the home page's round buttons, the how-to, Settings, the
//    log and its cards, region tabs, level rows, Undo, Hint, Restart, the win card, Back and Close
//  - the click is a file under 80 ms, and what can be heard of it is shorter still
//  - never on a truck drag; nothing at all with Sound effects off
//  - haptics follow the same switch: one tick a button tap and one a truck's exit; a Pixel
//    vibrates, an iPhone goes through the hidden switch input (whether an iPhone really ticks
//    cannot be tested here: it wants a hand on a phone)
// Run with the dev server up: npm run test:e2e:click
import { UNLOCKED } from './progress.mjs';
import { chromium, devices, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';

const BASE = process.env.URL ?? 'http://localhost:5173/';
const Q = '?audiolog&hapticlog&cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0&off=sam,nearmiss,landowner';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

async function open(browser, device, sfx) {
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(BASE + Q, { waitUntil: 'networkidle' });
  await page.evaluate(([p, a]) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
    localStorage.setItem('rush-hour-rigs-audio', a);
  }, [UNLOCKED, JSON.stringify({ sfx, music: false, style: 'country' })]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.mouse.click(5, 5);
  if (sfx) await page.waitForFunction(() => window.__rhrAudio.log.includes('loaded:sfx/click.mp3'), null, { timeout: 15000 });
  await wait(200);
  return { context, page };
}
/** What was heard and felt since the last call. */
const since = (page) => page.evaluate(() => {
  const a = window.__rhrAudio, h = (window.__rhrHaptics ??= []);
  const out = { cues: a.log.filter((n) => !n.startsWith('loaded:') && n !== 'unlock'), ticks: [...h] };
  a.log.length = 0; h.length = 0;
  return out;
});
const press = async (page, sel) => {
  await since(page);
  await page.locator(sel).first().click();
  await wait(350);
  return since(page);
};
async function drag(page, id, cells) {
  const b = await (await page.$(`.truck[data-id="${id}"]:not(.exiting)`)).boundingBox();
  const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
  const h = b.width > b.height;
  let x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 0; k < 8; k++) {
    if (h) x += (cells * cell) / 8; else y += (cells * cell) / 8;
    await page.mouse.move(x, y);
    await wait(16);
  }
  await page.mouse.up();
  await wait(500);
}

const BUTTONS = [
  ['the "?" button', '.brand .help'],
  ['the how-to\'s Next', '.tutorial [data-t="next"]'],
  ['the how-to\'s Close', '.tutorial [data-t="close"]'],
  ['the gear', '.brand .gear'],
  ['a music style in Settings', '.settings [role="radio"]'],
  ['Settings\' Done', '.settings [data-act="close"]'],
  ['the binoculars (the log)', '.brand .binoculars'],
  ['a card in the log', '.log-card.riddle'],
  ['the log\'s Back', '.log-head .back'],
  ['a region tab', '.region-tab:nth-child(2)'],
  ['the first region tab', '.region-tab:nth-child(1)'],
  ['a level row', '.level-btn[data-index="0"]'],
  ['Hint', '.controls [data-act="hint"]'],
  ['Restart', '.controls [data-act="restart"]'],
];

for (const [engine, device, way] of [[chromium, 'Pixel 7', 'vibrate'], [webkit, 'iPhone 13', 'switch']]) {
  const browser = await engine.launch();
  console.log(`\n${engine.name()} as ${device}: Sound effects on`);
  {
    const { context, page } = await open(browser, device, true);
    const span = await page.evaluate(async () => {
      const buf = await (await fetch('audio/sfx/click.mp3')).arrayBuffer();
      const a = await window.__rhrAudio.ctx.decodeAudioData(buf);
      const d = a.getChannelData(0), floor = 10 ** (-40 / 20);
      let first = -1, last = -1;
      for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > floor) { if (first < 0) first = i; last = i; }
      return { file: a.duration * 1000, heard: ((last - first) / a.sampleRate) * 1000 };
    });
    check(span.heard > 5 && span.heard < 80 && span.file < 130, `the click: ${span.heard.toFixed(0)} ms of sound (under 80) in a ${span.file.toFixed(0)} ms file`);
    for (const [name, sel] of BUTTONS) {
      const got = await press(page, sel);
      const clicks = got.cues.filter((c) => c === 'click').length;
      check(clicks === 1 && !got.cues.includes('tap') && !got.cues.includes('back') && got.ticks.length === 1 && got.ticks[0] === way,
        `${name}: one click and one tick (${got.cues.join(' ') || 'silence'}; ${got.ticks.join(' ') || 'no tick'})`);
    }
    // The level: drags never click; every exit ticks once.
    const lv = REGIONS[0].levels[0];
    const moves = solve(lv);
    await since(page);
    let exits = 0;
    for (const m of moves) await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
    await page.waitForSelector('.win:not([hidden])', { timeout: 8000 });
    await wait(1200);
    const played = await since(page);
    exits = lv.trucks.length;
    check(!played.cues.includes('click') && played.cues.includes('motor'), `dragging trucks through the whole level: no click (${[...new Set(played.cues)].join(' ')})`);
    check(played.ticks.length === exits && played.ticks.every((t) => t === way), `one tick for each truck that drove out (${played.ticks.length} for ${exits} trucks)`);
    for (const [name, sel] of [['the win card\'s Play again', '.win [data-act="restart"]'], ['Undo', '.controls [data-act="undo"]'], ['"‹ Levels"', '.hud [data-act="levels"]']]) {
      if (name === 'Undo') { await drag(page, moves[0].id, moves[0].delta + Math.sign(moves[0].delta) * 0.4); await wait(900); }
      const got = await press(page, sel);
      check(got.cues.filter((c) => c === 'click').length === 1 && got.ticks.length === 1, `${name}: one click and one tick (${got.cues.join(' ') || 'silence'})`);
    }
    if (way === 'switch') {
      const sw = await page.evaluate(() => { const l = document.querySelector('label.haptic-switch'), i = l?.querySelector('input'); const r = l?.getBoundingClientRect(); return l ? { sw: i.hasAttribute('switch'), shown: r.width > 0 && getComputedStyle(l).display !== 'none', touch: getComputedStyle(l).pointerEvents, hidden: l.getAttribute('aria-hidden') } : null; });
      check(sw && sw.sw && sw.shown && sw.touch === 'none' && sw.hidden === 'true', 'the iPhone\'s tick goes through ONE hidden switch input: in the page, unseen, never touchable');
    }
    await context.close();
  }
  console.log(`${engine.name()} as ${device}: Sound effects off`);
  {
    const { context, page } = await open(browser, device, false);
    let cues = 0, ticks = 0;
    for (const [, sel] of [BUTTONS[0], BUTTONS[2], BUTTONS[9], BUTTONS[11], BUTTONS[12]]) { const got = await press(page, sel); cues += got.cues.length; ticks += got.ticks.length; }
    const m = solve(REGIONS[0].levels[0])[0];
    await page.locator('.controls [data-act="restart"]').click();
    await wait(300);
    await since(page);
    await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
    const got = await since(page);
    check(cues === 0 && ticks === 0 && got.cues.length === 0 && got.ticks.length === 0, 'the switch off: no click, no tick, on buttons or on a truck leaving');
    await context.close();
  }
  await browser.close();
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
