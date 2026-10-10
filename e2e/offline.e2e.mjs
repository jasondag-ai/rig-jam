// OFFLINE (Job U): the built site, served under the GitHub Pages base path (/rig-jam/), by a
// little server of its own that can be made to turn requests away.
//  - the service worker registers, with its scope on the base path, in Chromium and in WebKit
//  - it fills its cache even when the host turns a burst of requests away (503s): the install is
//    not sunk by one bad fetch
//  - after ONE visit the game loads and plays with the network gone
// Builds the site first (npm run build). Needs no dev server.
import { chromium, webkit } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const BASE = '/rig-jam/';
const DIST = join(process.cwd(), 'dist');
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
if (!process.env.NO_BUILD) execSync('npm run build', { stdio: 'ignore' });

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
/** `flaky`: every file under sprites/ is turned away (503) the first time it is asked for, like a host shedding a burst. */
const state = { flaky: false, seen: new Set(), turnedAway: 0, down: false };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (state.down) return void req.socket.destroy();
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); return void res.end('not under the base path'); }
  let rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))) || 'index.html';
  if (rel.endsWith('/') || rel === '.') rel = 'index.html';
  const file = join(DIST, rel);
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return void res.end('no such file'); }
  if (state.flaky && rel.startsWith('sprites/') && !state.seen.has(rel)) { state.seen.add(rel); state.turnedAway++; res.writeHead(503); return void res.end('busy'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ROOT = `http://127.0.0.1:${server.address().port}${BASE}`;
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
const count = (name) => JSON.parse(new RegExp(`const ${name} = (\\[.*?\\]);`).exec(sw)[1]).length;
const WANT = count('CORE') + count('REST');
console.log(`the built site at ${ROOT} (${WANT} files to keep: ${count('CORE')} core, ${count('REST')} more)`);

const ready = (page) => page.evaluate(async (want) => {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 60000))]);
  if (!reg) return { ok: false };
  // (Active, and its cache filled.)
  for (let i = 0; i < 200 && reg.active?.state !== 'activated'; i++) await new Promise((r) => setTimeout(r, 100));
  const keys = await caches.keys();
  const n = keys.length ? (await (await caches.open(keys[0])).keys()).length : 0;
  return { ok: true, scope: new URL(reg.scope).pathname, script: new URL(reg.active.scriptURL).pathname, state: reg.active.state, caches: keys.length, n, want };
}, WANT);

for (const [name, engine, flaky] of [['chromium', chromium, false], ['chromium, with the host turning the first request for every sprite away', chromium, true], ['webkit (iPhone size, DPR 3)', webkit, false]]) {
  console.log(`\n${name}`);
  Object.assign(state, { flaky, seen: new Set(), turnedAway: 0, down: false });
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'load' });
  const r = await ready(page);
  check(r.ok && r.scope === BASE && r.script === `${BASE}sw.js` && r.state === 'activated', `the service worker registers and takes over: ${r.script}, scope ${r.scope}${r.ok ? '' : ' (NOT READY after 60 s)'}`);
  check(r.caches === 1 && r.n === r.want, `after one visit its cache holds all ${r.want} files (${r.n})${flaky ? `, though ${state.turnedAway} requests were turned away with a 503` : ''}`);
  if (flaky) check(state.turnedAway > 50, `(the host really did turn ${state.turnedAway} requests away)`);
  check(errors.filter((e) => !/503/.test(e)).length === 0, `no errors on the page${errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''}`);
  // THE NETWORK GOES: the server stops answering altogether. A fresh page must still load and play.
  state.down = true;
  let offline = null;
  try {
    const again = await context.newPage();
    await again.goto(`${ROOT}?cover=0`, { waitUntil: 'load', timeout: 20000 });
    await again.waitForSelector('.screen', { timeout: 10000 });
    // Into a level: its trucks' sprites come from the cache.
    const btn = again.locator('.level-btn').first();
    if (await btn.count()) await btn.click();
    await again.waitForSelector('.board .truck.sprite-on', { timeout: 10000 });
    offline = await again.evaluate(() => ({ trucks: document.querySelectorAll('.board .truck.sprite-on').length, ctrl: !!navigator.serviceWorker.controller, ground: getComputedStyle(document.querySelector('.screen.game')).backgroundImage.length > 10 || document.querySelector('.screen.game').classList.contains('ground-tex') }));
  } catch (e) {
    offline = { error: e.message.split('\n')[0] };
  }
  check(!!offline && !offline.error && offline.trucks > 0 && offline.ctrl, `with the network gone, a fresh page loads from the cache and a level opens with its truck sprites (${offline?.error ?? offline?.trucks + ' trucks'})`);
  // DAILY PADS FOREVER (job U2): a pad after the 60th is not in the game's script but in a file beside the page, which
  // the worker keeps. With the network still gone and the phone's date at Dec 1, 2026, that day's pad (63) opens.
  let pad = null;
  try {
    const later = await context.newPage();
    await later.clock.setFixedTime(new Date(2026, 11, 1, 12, 0, 0));
    await later.goto(`${ROOT}?cover=0`, { waitUntil: 'load', timeout: 20000 });
    await later.waitForSelector('.daily-btn', { timeout: 10000 });
    const title = await later.locator('.daily-title').textContent();
    await later.locator('.daily-btn').click();
    await later.waitForSelector('.board .truck.sprite-on', { timeout: 10000 });
    pad = { title, hud: (await later.evaluate(() => document.querySelector('.hud').textContent)).replace(/\s+/g, ' '), trucks: await later.locator('.board .truck').count() };
  } catch (e) {
    pad = { error: e.message.split('\n')[0] };
  }
  check(!!pad && !pad.error && pad.title === 'Daily Pad #63' && pad.hud.includes('Daily Pad #63') && pad.trucks >= 5, `still with no network, on Dec 1, 2026: "${pad?.title}" opens from the cache with its ${pad?.trucks} trucks${pad?.error ? ' (' + pad.error + ')' : ''}`);
  // SUNDAY TURNAROUND (job U3): its pads are files beside the page too. Still with no network, on Dec 1, 2026 (week 8),
  // with demo mode opening it: the week's big pad opens from the cache.
  let turn = null;
  try {
    const later = await context.newPage();
    await later.clock.setFixedTime(new Date(2026, 11, 1, 12, 0, 0));
    await later.addInitScript(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], demo: true, announced: [], standDowns: [] })));
    await later.goto(`${ROOT}?cover=0`, { waitUntil: 'load', timeout: 20000 });
    await later.waitForSelector('.turn-btn', { timeout: 10000 });
    const title = await later.locator('.turn-title').textContent();
    await later.locator('.turn-btn').click();
    await later.waitForSelector('.board.big-pad .truck.sprite-on', { timeout: 10000 });
    turn = { title, hud: (await later.evaluate(() => document.querySelector('.hud').textContent)).replace(/\s+/g, ' '), trucks: await later.locator('.board .truck').count() };
  } catch (e) {
    turn = { error: e.message.split('\n')[0] };
  }
  check(!!turn && !turn.error && turn.title === 'Sunday Turnaround #8' && turn.hud.includes('Turnaround #8') && turn.trucks >= 14, `still with no network: "${turn?.title}" opens from the cache with its ${turn?.trucks} trucks${turn?.error ? ' (' + turn.error + ')' : ''}`);
  await browser.close();
}
server.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
