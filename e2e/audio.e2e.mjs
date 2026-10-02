// Sound test (Playwright, iPhone 13, Chromium with real touch events). Uses ?audiolog to read which
// cues fired, and checks each one plays at the right moment: first-tap start, diesel, backup beeper,
// bump thud + horn with the radio squelch before the bubble, gate clank + air hiss, exit horn chords,
// win clinks, ditty and sad trombone, the streak stamp, ground sounds, and the Settings switches.
// On the dev server it also renders the three music styles offline and checks they sound different.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:audio
import { UNLOCKED } from './progress.mjs';
import { chromium, devices } from 'playwright';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { cabSide, getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';
import { hardHats } from '../src/ui/progress.ts';

const LIVE = !!process.env.URL;
const BASE = (process.env.URL ?? 'http://localhost:5173/') + '?audiolog&wild=0'; // wildlife sounds are checked in the gags test
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate((p) => {
  localStorage.clear();
  localStorage.setItem('rush-hour-rigs:v2', p);
}, UNLOCKED);
await page.reload({ waitUntil: 'networkidle' });
const cdp = await context.newCDPSession(page);
const tp = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
async function drag(id, cellsPath) {
  const el = await page.$(`.truck[data-id="${id}"]:not(.exiting)`);
  const b = await el.boundingBox();
  const h = b.width > b.height;
  const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
  let x = b.x + b.width / 2;
  let y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
  for (const cells of cellsPath) {
    for (let k = 0; k < 8; k++) {
      if (h) x += (cells * cell) / 8;
      else y += (cells * cell) / 8;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x, y) });
      await wait(16);
    }
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(450);
}
/** Cues played since the last call, then clears the log. */
const heard = () => page.evaluate(() => { const a = window.__rhrAudio; const l = a ? [...a.log] : []; if (a) a.log.length = 0; return l; });
const count = (log, name) => log.filter((n) => n === name).length;
const list = (log) => [...new Set(log)].join(' ');
async function enter(tab, index) {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await wait(200);
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await wait(150);
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await wait(500);
}
async function playOut(level, moves) {
  for (const m of moves) await drag(m.id, [m.delta]);
  await wait(1300); // the win card comes up 900ms after the last exit
}

console.log('\nchromium iPhone 13 (real touch events)');

// 1. Nothing before the first tap (iOS rule); the first tap starts the audio.
check(await page.evaluate(() => window.__rhrAudio && window.__rhrAudio.ctx === null), 'no audio before the first tap');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(5, 5) });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await wait(200);
check((await page.evaluate(() => window.__rhrAudio.ctx?.state)) === 'running', 'the first tap starts it');
const defaults = await page.evaluate(() => window.__rhrAudio.settings);
check(defaults.sfx === true && defaults.music === false && defaults.style === 'synth', `defaults: effects on, music off, 80s Synth (${JSON.stringify(defaults)})`);

// 2. Cardium 1: birds, diesel, beeper, bump with radio before the bubble.
await enter(1, 0);
const card = REGIONS[0].levels[0];
check(count(await heard(), 'birds') >= 1, 'Cardium: birdsong');
let state = newGame(card);
const sol = solve(card);
// Find a truck that can back up (away from its gate) and one that can push into something.
let reverse = null;
let blocked = null;
for (const t of state.trucks) {
  const r = getMoveRange(state, t.id);
  const side = cabSide(card, t);
  const fwd = side === 'right' || side === 'bottom' ? 1 : -1;
  const back = fwd === 1 ? r.min : r.max;
  if (!reverse && back !== 0) reverse = { id: t.id, back };
  const hiBlocked = r.max !== r.exitDelta;
  if (!blocked && hiBlocked) blocked = { id: t.id, push: r.max + 0.8 };
  else if (!blocked && r.min !== r.exitDelta) blocked = { id: t.id, push: r.min - 0.8 };
}
// Cardium 1 may have nothing that can back up yet: look through the next few levels.
for (let i = 1; !reverse && i < REGIONS[0].levels.length; i++) {
  const lv = REGIONS[0].levels[i];
  const s0 = newGame(lv);
  for (const t of s0.trucks) {
    const r = getMoveRange(s0, t.id);
    const back = cabSide(lv, t) === 'right' || cabSide(lv, t) === 'bottom' ? r.min : r.max;
    if (back !== 0) {
      reverse = { id: t.id, back, level: i };
      break;
    }
  }
}
if (reverse) {
  if (reverse.level) await enter(1, reverse.level);
  await heard();
  await drag(reverse.id, [reverse.back]);
  const log = await heard();
  check(log.includes('diesel') && log.includes('beeper'), `drag: diesel, and backing up sets off the beeper (${list(log)})`);
  await drag(reverse.id, [-reverse.back]);
  const fwd = await heard();
  check(fwd.includes('diesel') && !fwd.includes('beeper'), `pulling forward: diesel, no beeper (${list(fwd)})`);
} else check(false, 'found a truck that can back up');
if (blocked) {
  await enter(1, 0);
  await page.evaluate(() => {
    window.__bubbleAt = null;
    window.__radioAt = null;
    const a = window.__rhrAudio;
    const push = a.log.push.bind(a.log);
    a.log.push = (n) => { if (n === 'radio' && !window.__radioAt) window.__radioAt = performance.now(); return push(n); };
    new MutationObserver(() => { if (!window.__bubbleAt && document.querySelector('.bubble')) window.__bubbleAt = performance.now(); }).observe(document.querySelector('.board'), { childList: true });
  });
  await drag(blocked.id, [blocked.push]);
  const log = await heard();
  const gap = await page.evaluate(() => window.__bubbleAt - window.__radioAt);
  check(log.includes('thud') && log.includes('horn'), `bump: thud and horn (${list(log)})`);
  check(log.includes('radio') && gap > 60, `radio squelch first, then the bubble ${Math.round(gap)}ms later`);
} else check(false, 'found a truck to bump');

// 3. Solve at par: clank + hiss per exit, horn chord on quick back-to-back exits, 3 clinks + ditty.
await enter(1, 0);
await heard();
await playOut(card, sol);
let log = await heard();
const exits = card.trucks.length;
check(count(log, 'clank') >= 1 && count(log, 'hiss') === count(log, 'clank'), `every exit: gate clank + air-brake hiss (${count(log, 'clank')} exits)`);
check(count(log, 'clink') === 3 && log.includes('ditty') && !log.includes('trombone'), `at par: 3 hard-hat clinks and the ditty (${list(log)})`);

// Horn chords: some level clears trucks back to back within a few seconds.
let chords = count(log, 'horn-chord');
for (let i = 1; i < 6 && chords === 0; i++) {
  await enter(1, i);
  await heard();
  await playOut(REGIONS[0].levels[i], solve(REGIONS[0].levels[i]));
  chords += count(await heard(), 'horn-chord');
}
check(chords > 0, `back-to-back exits climb a horn chord (${chords} heard)`);

// 4. Par +4: sad trombone, one clink.
await enter(1, 0);
state = newGame(card);
const wiggle = state.trucks.map((t) => ({ t, r: getMoveRange(state, t.id) })).find(({ r }) => (r.max > 0 && r.max !== r.exitDelta) || (r.min < 0 && r.min !== r.exitDelta));
const d = wiggle.r.max > 0 && wiggle.r.max !== wiggle.r.exitDelta ? 1 : -1;
for (let i = 0; i < 2; i++) {
  await drag(wiggle.t.id, [d]);
  await drag(wiggle.t.id, [-d]);
}
await heard();
await playOut(card, sol);
log = await heard();
const hats = hardHats(sol.length + 4, card.par);
check(log.includes('trombone') && !log.includes('ditty') && count(log, 'clink') === hats, `par +4: sad trombone and ${hats} clink (${list(log)})`);

// 5. Ground sounds: mud squelch in Montney, snow crunch in Duvernay, no birds there.
for (const [tab, name, cue] of [[2, 'Montney', 'squelch'], [3, 'Duvernay', 'crunch']]) {
  await enter(tab, 0);
  const lv = REGIONS[tab - 1].levels[0];
  const s0 = newGame(lv);
  const t = s0.trucks.find((x) => { const r = getMoveRange(s0, x.id); return r.max - r.min >= 2 && r.exitDelta !== r.max && r.exitDelta !== r.min; })
    ?? s0.trucks.find((x) => { const r = getMoveRange(s0, x.id); return (r.max > 0 && r.max !== r.exitDelta) || (r.min < 0 && r.min !== r.exitDelta); });
  const r = getMoveRange(s0, t.id);
  const go = r.max > 0 && r.max !== r.exitDelta ? r.max : r.min;
  await heard();
  await drag(t.id, [go, -go, go, -go]);
  const g = await heard();
  check(count(g, cue) >= 2 && !g.includes('birds'), `${name}: ${cue} under the wheels, no birds (${count(g, cue)} ${cue}es)`);
}

// 6. Daily Pad: the streak sign ticks up with a stamp.
await page.evaluate(() => document.querySelector('.hud [data-act="levels"]')?.click());
await wait(300);
const daily = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)];
await page.$eval('.daily-btn', (b) => b.click());
await wait(500);
await heard();
await playOut(daily, solve(daily));
log = await heard();
check(!log.includes('quad'), 'no stray quad engine from an earlier level');
check(log.includes('stamp'), `Daily cleared: the streak sign stamps (${list(log)})`);

// 7. Settings: switches save, effects off silences cues, music styles switch.
await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
await wait(300);
await page.$eval('.gear', (g) => g.click());
await wait(200);
const sw = (act) => page.$eval(`[data-act="${act}"]`, (i) => i.click());
await sw('music');
await wait(200);
log = await heard();
check(log.includes('music:synth'), `Music on: 80s Synth plays (${list(log)})`);
check((await page.$$eval('.style-pick', (b) => b.map((x) => x.textContent))).join(',') === '80s Synth,Chill Lo-fi', 'Settings offers 80s Synth and Chill Lo-fi only (no Country Twang)');
for (const [id, name] of [['lofi', 'Chill Lo-fi']]) {
  const label = await page.$eval(`.style-pick[data-style="${id}"]`, (b) => b.textContent);
  const box = await (await page.$(`.style-pick[data-style="${id}"]`)).boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(box.x + box.width / 2, box.y + box.height / 2) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(200);
  const l = await heard();
  check(label === name && l.includes(`music:${id}`) && (await page.$eval(`.style-pick[data-style="${id}"]`, (b) => b.getAttribute('aria-checked'))) === 'true', `tap "${label}": it plays and is ticked`);
}
await sw('sfx');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs-audio')));
check(saved.sfx === false && saved.music === true && saved.style === 'lofi', `saved: ${JSON.stringify(saved)}`);
await page.$eval('[data-act="close"]', (b) => b.click());
await enter(1, 1);
await heard();
const lv1 = REGIONS[0].levels[1];
await drag(solve(lv1)[0].id, [solve(lv1)[0].delta]);
log = await heard();
check(!log.some((n) => !n.startsWith('music')), `effects off: no effect sounds (${list(log) || 'silence'})`);
await page.reload({ waitUntil: 'networkidle' });
await page.$eval('.gear', (g) => g.click());
const after = await page.evaluate(() => ({
  sfx: document.querySelector('[data-act="sfx"]').checked,
  music: document.querySelector('[data-act="music"]').checked,
  style: document.querySelector('.style-pick[aria-checked="true"]')?.dataset.style,
}));
check(!after.sfx && after.music && after.style === 'lofi', `settings survive a reload (${JSON.stringify(after)})`);
await page.evaluate(() => localStorage.clear());

// 8. The two music styles sound clearly different (rendered offline, dev server only).
if (!LIVE) {
  const feats = await page.evaluate(async () => {
    const m = await import(`${location.origin}/src/audio/music.ts`);
    const out = {};
    for (const id of ['synth', 'lofi']) {
      const rate = 22050;
      const ctx = new OfflineAudioContext(1, rate * 8, rate);
      m.renderStyle(ctx, ctx.destination, m.STYLES[id], 8);
      const d = (await ctx.startRendering()).getChannelData(0);
      let sum = 0, zc = 0, low = 0, lp = 0;
      for (let i = 0; i < d.length; i++) {
        sum += d[i] * d[i];
        if (i && d[i - 1] < 0 !== d[i] < 0) zc++;
        lp += 0.03 * (d[i] - lp); // one-pole lowpass ~100 Hz
        low += lp * lp;
      }
      // Onsets: 20ms frames whose energy jumps well above the previous frame.
      const frame = rate * 0.02;
      let prev = 0, onsets = 0;
      for (let f = 0; f + frame < d.length; f += frame) {
        let e = 0;
        for (let i = f; i < f + frame; i++) e += d[i] * d[i];
        if (e > prev * 2 && e > 0.02) onsets++;
        prev = e;
      }
      out[id] = { rms: Math.sqrt(sum / d.length), zcr: zc / 8, lowShare: low / sum, onsetsPerSec: onsets / 8 };
    }
    return out;
  });
  for (const [id, f] of Object.entries(feats)) console.log(`        ${id.padEnd(8)} rms ${f.rms.toFixed(3)}  crossings/s ${Math.round(f.zcr)}  bass share ${f.lowShare.toFixed(2)}  onsets/s ${f.onsetsPerSec.toFixed(1)}`);
  const ids = Object.keys(feats);
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = feats[ids[i]];
      const b = feats[ids[j]];
      const rel = (x, y) => Math.abs(x - y) / Math.max(x, y);
      const diff = Math.max(rel(a.zcr, b.zcr), rel(a.lowShare, b.lowShare), rel(a.onsetsPerSec, b.onsetsPerSec));
      check(diff > 0.25, `${ids[i]} vs ${ids[j]}: clearly different (${Math.round(diff * 100)}% apart on the biggest feature)`);
    }
  const loudest = Math.max(...Object.values(feats).map((f) => f.rms));
  const quietest = Math.min(...Object.values(feats).map((f) => f.rms));
  check(loudest / quietest < 3, `similar loudness, so no style jumps out (${(loudest / quietest).toFixed(1)}x)`);
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
