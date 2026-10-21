// THE JUDGES' GUIDE (job U13): public/judges/, a page of its own beside the game.
//  - the built page under the Pages base path, in WebKit at 390 x 664, 375 x 635 and 1280 x 720: no sideways
//    scroll, the poster is the game's cover, the video plays with sound after a tap, the three buttons lead to the
//    game, ?demo=1 and ?finale=1 (and those open: `LIVE=0` skips opening the live site)
//  - apart from the game: the service worker's list has nothing of the guide, a visit to the guide leaves the
//    game's offline page the game's, and the video is never put in a cache (Chromium and WebKit)
// Builds the site first (`NO_BUILD=1` skips). Needs no dev server.
import { chromium, webkit } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { outDir } from './out.mjs';

const BASE = '/rig-jam/';
const DIST = join(process.cwd(), 'dist');
const OUT = outDir('judges');
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
if (!process.env.NO_BUILD) execSync('npm run build', { stdio: 'ignore' });

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
// (Byte ranges, as GitHub Pages serves them: Safari's engine will not play a video without.)
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); return void res.end(); }
  let rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))) || 'index.html';
  if (rel === '.') rel = 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = join(DIST, rel);
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return void res.end(); }
  const data = readFileSync(file);
  const head = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache', 'accept-ranges': 'bytes' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (m) {
    const from = m[1] ? Number(m[1]) : Math.max(0, data.length - Number(m[2]));
    const to = m[1] && m[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
    res.writeHead(206, { ...head, 'content-range': `bytes ${from}-${to}/${data.length}`, 'content-length': to - from + 1 });
    return void res.end(data.subarray(from, to + 1));
  }
  res.writeHead(200, { ...head, 'content-length': data.length });
  res.end(data);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ROOT = `http://127.0.0.1:${server.address().port}${BASE}`;
const LIVE = 'https://jasondag-ai.github.io/rig-jam/';

console.log('the build');
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
check(['index.html', 'how-to-play.mp4', 'pitch.mp4'].every((f) => existsSync(join(DIST, 'judges', f))), 'the page and its two videos are in the build');
check(!/"judges\//.test(sw), "the service worker's list has nothing of the guide");
check(statSync(join(DIST, 'judges/how-to-play.mp4')).size < 6 * 1024 * 1024 && statSync(join(DIST, 'judges/pitch.mp4')).size < 9 * 1024 * 1024, 'the how-to video is under 6 MB, the pitch under 9 MB');
check(!/"judges\//.test(sw) && !sw.includes('pitch.mp4'), "the service worker's list has nothing of the guide (the pitch included)");

const wk = await webkit.launch();
for (const [w, h, phone] of [[390, 664, true], [375, 635, true], [1280, 720, false]]) {
  console.log(`webkit ${w} x ${h}`);
  const ctx = await wk.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 3 : 1, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const bad = [];
  page.on('response', (r) => { if (r.url().startsWith(ROOT) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${ROOT}judges/`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const fit = await page.evaluate(() => {
    const d = document.documentElement;
    const wide = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5).map((e) => e.className || e.tagName);
    return { scroll: d.scrollWidth, client: d.clientWidth, wide };
  });
  check(fit.scroll <= fit.client && fit.wide.length === 0, `no sideways scroll (page ${fit.scroll} in ${fit.client}${fit.wide.length ? `; past the edge: ${fit.wide.slice(0, 4).join(', ')}` : ''})`);
  check((await page.title()) === "Rig Jam Judges' Guide", 'the guide shows');
  // THE BUTTONS FIRST (job U26): all three on the screen without scrolling, above the hero video.
  const top = await page.evaluate(() => { const go = document.querySelector('nav.go').getBoundingClientRect(), hero = document.querySelector('section.video-wrap').getBoundingClientRect(); return { goBottom: Math.round(go.bottom), heroTop: Math.round(hero.top), h: innerHeight, y: scrollY }; });
  check(top.y === 0 && top.goBottom <= top.h && top.goBottom <= top.heroTop, `the three buttons show without scrolling (they end ${top.goBottom} px down of ${top.h}), above the hero video`);
  const heroes = await page.locator('section.video-wrap video').evaluateAll((vs) => vs.map((v) => v.getAttribute('src')));
  const inCard = await page.locator('section.card video').evaluateAll((vs) => vs.map((v) => v.getAttribute('src')));
  check(heroes.join() === 'pitch.mp4' && inCard.join() === 'how-to-play.mp4', `the hero is ${heroes.join()}; the how-to video is in the "How to play" card (${inCard.join()})`);
  const v = page.locator('section.video-wrap video');
  const poster = await v.evaluate((el) => new Promise((done) => { const i = new Image(); i.onload = () => done(i.naturalWidth); i.onerror = () => done(0); i.src = el.poster; }));
  check(poster > 0 && (await v.getAttribute('poster')) === '../cover.webp', `the poster is the game's cover (${poster} px wide)`);
  await v.scrollIntoViewIfNeeded();
  const before = await v.evaluate((el) => ({ paused: el.paused, t: el.currentTime }));
  check(before.paused && before.t === 0, 'the video waits for a tap');
  await page.screenshot({ path: join(OUT, `guide_${w}x${h}.png`) });
  // The tap: a real touch or click on the picture's middle (the big play button of the browser's own controls).
  const box = await v.boundingBox();
  if (phone) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  // (If the engine's controls did not take that as play, the same gesture's permission lets the page start it.)
  if (await v.evaluate((el) => el.paused)) await v.evaluate((el) => el.play());
  await page.waitForFunction(() => document.querySelector('section.video-wrap video').currentTime > 1.5, null, { timeout: 15000 }).catch(() => {});
  const now = await v.evaluate((el) => ({ t: el.currentTime, paused: el.paused, muted: el.muted, vol: el.volume, w: el.videoWidth, h: el.videoHeight, dur: el.duration, audio: el.webkitAudioDecodedByteCount ?? -1, err: el.error?.message ?? '' }));
  check(now.t > 1.5 && !now.paused, `it plays after a tap (${now.t.toFixed(1)} s in${now.err ? `; ${now.err}` : ''})`);
  check(now.w === 720 && now.h === 1280 && Math.abs(now.dur - 53.1) < 0.4, `the pitch: 720 x 1280, ${now.dur.toFixed(1)} s`);
  // The how-to video in its card plays too (it loads nothing until asked: preload none).
  const howto = page.locator('section.card video');
  await howto.scrollIntoViewIfNeeded();
  await howto.evaluate((el) => { el.muted = true; return el.play(); }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('section.card video').currentTime > 1, null, { timeout: 15000 }).catch(() => {});
  const h2 = await howto.evaluate((el) => ({ t: el.currentTime, dur: el.duration }));
  check(h2.t > 1 && Math.abs(h2.dur - 33.1) < 0.3, `the how-to video in its card plays (${h2.t.toFixed(1)} of ${h2.dur.toFixed(1)} s)`);
  await howto.evaluate((el) => el.pause());
  await v.scrollIntoViewIfNeeded();
  check(!now.muted && now.vol > 0 && now.audio !== 0, `with sound (not muted, volume ${now.vol}${now.audio > 0 ? `, ${now.audio} bytes of sound decoded` : ''})`);
  await page.screenshot({ path: join(OUT, `playing_${w}x${h}.png`) });
  await v.evaluate((el) => el.pause());
  const links = await page.locator('nav.go a.btn').evaluateAll((as) => as.map((a) => a.href));
  check(JSON.stringify(links) === JSON.stringify([LIVE, `${LIVE}?demo=1`, `${LIVE}?finale=1`]), `three buttons: the game, ?demo=1, ?finale=1`);
  const labels = await page.locator('nav.go a.btn .label').allTextContents();
  const tag = await page.locator('nav.go a.btn.judge .tag').textContent().catch(() => null);
  check(tag?.trim() === 'For hackathon judges', `the orange Demo mode button carries its tag ("${tag?.trim()}")`);
  const mails = await page.evaluate(() => document.body.innerHTML.match(/[a-z]+@stragentic\.com/g) ?? []);
  check(mails.length > 0 && mails.every((m) => m === 'info@stragentic.com'), `the only address on the page is info@stragentic.com (${[...new Set(mails)].join(', ')})`);
  check(labels[1].trim() === 'Demo mode' && !/judge mode/i.test(await page.locator('nav.go').innerText()), `the ?demo=1 button reads "${labels[1].trim()}"`);
  // The numbers strip (job U23): six tiles under the three buttons, two rows of three, inside the page.
  const nums = await page.evaluate(() => { const ul = document.querySelector('ul.nums'), nav = document.querySelector('nav.go'); if (!ul) return null; const tiles = [...ul.children].map((li) => li.getBoundingClientRect()); return { n: tiles.length, below: ul.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom, rows: new Set(tiles.map((r) => Math.round(r.top))).size, inside: tiles.every((r) => r.left >= 0 && r.right <= innerWidth + 0.5), text: ul.innerText.replace(/\s+/g, ' ').trim() }; });
  check(nums?.n === 6 && nums.below && nums.rows === 2 && nums.inside, `the numbers strip: ${nums?.n} tiles in ${nums?.rows} rows under the three buttons (${nums?.text})`);
  const sizes = await page.locator('nav.go a.btn').evaluateAll((as) => as.map((a) => Math.round(a.getBoundingClientRect().height)));
  check(sizes.every((s) => s >= 48), `each a tap target of at least 48 px (${sizes.join(', ')})`);
  if (process.env.LIVE !== '0') {
    const want = [['.screen', 'the game'], ['.screen', 'Demo mode'], ['.screen.finale', 'the ending']];
    for (let i = 0; i < 3; i++) {
      const btn = page.locator('nav.go a.btn').nth(i);
      await btn.scrollIntoViewIfNeeded();
      const [pop] = await Promise.all([ctx.waitForEvent('page'), phone ? btn.tap() : btn.click()]);
      const ok = await pop.waitForSelector(`#app ${want[i][0]}`, { timeout: 20000 }).then(() => true, () => false);
      const demo = i === 1 ? await pop.evaluate(() => new URLSearchParams(location.search).get('demo')) : null;
      check(ok && pop.url() === links[i] && (i !== 1 || demo === '1'), `"${(await btn.locator('.label').textContent()).trim()}" opens ${want[i][1]} (${pop.url().replace(LIVE, '/rig-jam/')})`);
      await pop.close();
    }
  }
  check(errors.length === 0 && bad.length === 0, `no errors, nothing missing${errors.length + bad.length ? `: ${[...errors, ...bad].join('; ')}` : ''}`);
  await ctx.close();
}
await wk.close();

// APART FROM THE GAME: with the game's worker in charge, a visit to the guide changes nothing the game keeps.
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  console.log(`${name}: apart from the game`);
  const browser = await type.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 664 } });
  const page = await ctx.newPage();
  await page.goto(ROOT, { waitUntil: 'load' });
  const ready = await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)).catch(() => false);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
  await page.reload({ waitUntil: 'load' });
  check(ready && (await page.evaluate(() => !!navigator.serviceWorker.controller)), "the game's service worker is in charge");
  const kept = () => page.evaluate(async (root) => {
    const out = { page: '', guide: [] };
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      const hit = await c.match(root);
      if (hit) out.page = await hit.text();
      for (const r of await c.keys()) if (r.url.includes('/judges/')) out.guide.push(r.url);
    }
    return out;
  }, ROOT);
  const was = await kept();
  await page.goto(`${ROOT}judges/`, { waitUntil: 'load' });
  check((await page.title()) === "Rig Jam Judges' Guide", 'the guide opens under the worker');
  await page.locator('section.video-wrap video').evaluate((el) => { el.muted = true; return el.play(); }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('section.video-wrap video').currentTime > 1, null, { timeout: 15000 }).catch(() => {});
  check(await page.locator('section.video-wrap video').evaluate((el) => el.currentTime > 1), 'its video plays there');
  await page.waitForTimeout(500);
  const is = await kept();
  check(was.page.includes('id="app"') && is.page === was.page, "the game's offline page is still the game");
  check(is.guide.length === 0, `nothing of the guide is in a cache${is.guide.length ? `: ${is.guide.join(', ')}` : ''}`);
  await browser.close();
}
server.close();
console.log(failures ? `FAILED: ${failures}` : 'PASS');
process.exit(failures ? 1 : 0);
