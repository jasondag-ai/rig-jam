// Beta readiness (Playwright): what a friend or a parent meets on opening the link.
// An iPhone SE (WebKit, 375x667) and a mid Android (Chromium, 360x800, a Pixel's user agent).
//  - FIRST RUN: a fresh install, demo mode off: the cover, one tap, and level 1 is on screen with
//    its ghost finger, inside 3 seconds of opening; solving it shows the win card; back on the
//    list nothing is locked that should be open; the second visit opens on the level list
//  - SMALL PHONES: on every screen nothing is cut off, nothing scrolls sideways, and no tap target
//    is under 44 px
//  - SETTINGS: the version at the very bottom; the Credits list hidden until asked for; the
//    feedback row (a plain address, and a Copy button that adds the version, the phone and the level)
//  - UPDATES: the "New version, tap to update" bar; it keeps off a level being played; a tap
//    reloads the page and saved progress is exactly as it was
// Run with the dev server up: npm run test:e2e:beta
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';
import { FEEDBACK_EMAIL } from '../src/ui/feedback.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const PHONES = [
  { name: 'iPhone SE', engine: webkit, width: 375, height: 667, extra: {} },
  { name: 'mid Android', engine: chromium, width: 360, height: 800, extra: { isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' } },
];
/** What is wrong on the screen now: anything cut off at the sides, a sideways scroll, a tap target under 44 px. */
const audit = (page) => page.evaluate(() => {
  const vw = innerWidth, seen = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; };
  const inside = (e) => !e.closest('.scenery, .regions-track, .dig-bg, .dig-deep, .scene-layer, .cover, .board, .confetti, svg');
  const cut = [...document.querySelectorAll('.screen *, .overlay:not([hidden]) *')].filter((e) => seen(e) && inside(e) && !e.closest('.overlay[hidden]')).filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1; }).map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
  const clipped = [...document.querySelectorAll('.hud *, .controls *, .level-btn .lname, .region-tab .rtext, .daily-btn *, .card h2, .settings .switch-label, .settings .btn')].filter((e) => seen(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => `${e.className}: "${e.textContent.trim().slice(0, 18)}"`);
  const top = document.querySelector('.overlay:not([hidden])') ?? document.querySelector('.screen');
  const targets = [...top.querySelectorAll('button, a[href], [role="tab"], label.switch')].filter((e) => seen(e) && !e.closest('[hidden]') && !(top.classList.contains('screen') && e.closest('.overlay')));
  const small = targets.map((e) => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 22), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44).map((x) => `"${x.t}" ${x.w}x${x.h}`);
  return { cut: cut.slice(0, 4), clipped: clipped.slice(0, 4), small: small.slice(0, 5), sideways: document.documentElement.scrollWidth > vw + 1 || (document.querySelector('.screen')?.scrollWidth ?? 0) > vw + 1, targets: targets.length };
});
const clean = (a) => a.cut.length === 0 && a.clipped.length === 0 && a.small.length === 0 && !a.sideways;
const say = (a) => (clean(a) ? `${a.targets} tap targets, all 44 px or more` : JSON.stringify(a));
const drag = (page, id, cells) => page.evaluate(async ([id, cells]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
  const h = el.classList.contains('horiz'); const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown'); for (let k = 0; k < 6; k++) { if (h) x += (cells * cell) / 6; else y += (cells * cell) / 6; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
  await new Promise((q) => setTimeout(q, 420));
}, [id, cells]);

for (const phone of PHONES) {
  const browser = await phone.engine.launch();
  const fresh = async (query = '') => {
    const context = await browser.newContext({ viewport: { width: phone.width, height: phone.height }, deviceScaleFactor: 2, hasTouch: true, ...phone.extra });
    const page = await context.newPage();
    page.on('pageerror', (e) => { failures++; console.log('ERR', e.message); });
    return { context, page, go: (q = query) => page.goto(`${ROOT}?${q}`, { waitUntil: 'domcontentloaded' }) };
  };

  // ---------- First run ----------
  console.log(`\n${phone.name} (${phone.width}x${phone.height}): first run, a fresh install`);
  {
    const { context, page, go } = await fresh('cover=1');
    const t0 = Date.now();
    await go();
    await page.waitForSelector('.screen.cover .cover-tap');
    const coverMs = Date.now() - t0;
    await page.mouse.click(phone.width / 2, phone.height * 0.6);
    await page.waitForSelector('.screen.game .board .truck');
    const playMs = Date.now() - t0;
    await wait(700);
    const first = await page.evaluate(() => ({ label: document.querySelector('.hud .name, .hud .label, .hud')?.textContent.replace(/\s+/g, ' ').trim(), finger: !!document.querySelector('.ghost-finger, .finger, [class*="finger"]'), note: document.querySelector('.note').textContent, demo: JSON.parse(localStorage.getItem('rush-hour-rigs:v2') ?? '{}').demo === true, scroll: document.documentElement.scrollHeight > innerHeight + 1 }));
    check(coverMs < 1500 && playMs < 3000 && /CARDIUM 1|Cardium 1/i.test(first.label) && !first.demo, `the cover is up in ${coverMs} ms; one tap and level 1 is on screen, ${playMs} ms after opening (demo mode off): "${first.label.slice(0, 40)}"`);
    check(first.finger && /drag/i.test(first.note) && !first.scroll, `level 1 teaches itself: the ghost finger shows the first move, and the tip reads "${first.note}"`);
    const a1 = await audit(page);
    check(clean(a1), `the level: nothing cut off, ${say(a1)}`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_level1.png`) });
    const lv = REGIONS[0].levels[0];
    for (const m of solve(lv)) await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
    await page.waitForSelector('.win:not([hidden]) .card', { timeout: 6000 }).catch(() => {});
    await wait(900);
    const win = await page.evaluate(() => { const c = document.querySelector('.win:not([hidden]) .card')?.getBoundingClientRect(); return c ? { fits: c.top >= 0 && c.bottom <= innerHeight, next: !!document.querySelector('.win [data-act="next"]') } : null; });
    const a2 = await audit(page);
    check(win?.fits && win.next && clean(a2), `solved by following the finger: the win card fits with no scroll and offers the next level; ${say(a2)}`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_win.png`) });
    await page.evaluate(() => document.querySelector('.win [data-act="levels"]').click());
    await page.waitForSelector('.screen.levels .level-btn');
    await wait(300);
    const list = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.level-btn')].map((b) => b.classList.contains('locked'));
      const range = document.createRange(); range.selectNodeContents(document.querySelector('.brand h1')); const h = range.getBoundingClientRect(), btns = [...document.querySelectorAll('.brand .help, .brand .binoculars, .brand .gear')].map((b) => b.getBoundingClientRect());
      const below = document.querySelector('.daily-block').getBoundingClientRect();
      return { rows, daily: !document.querySelector('.daily-btn').disabled && !document.querySelector('.daily-btn').classList.contains('locked'), intro: !!document.querySelector('.brand p'), hats: document.querySelectorAll('.level-btn[data-index="0"] .hats .on').length,
        titleClear: btns.every((r) => h.right <= r.left + 1 || h.bottom <= r.top || h.top >= r.bottom) && h.left >= 0, underClear: btns.every((r) => below.top >= r.bottom - 1), tabs: [...document.querySelectorAll('.region-tab')].map((t) => t.classList.contains('locked')) };
    });
    check(!list.rows[0] && !list.rows[1] && list.rows.slice(2).every(Boolean) && list.daily && list.hats === 3 && !list.tabs[0] && list.tabs[1], 'back on the list nothing is locked that should be open: level 1 (three hard hats) and level 2 are open, the Daily Pad is open, Cardium is open; the rest wait their turn');
    const a3 = await audit(page);
    check(clean(a3) && list.titleClear && list.underClear && !list.intro, `the level list: the title clear of the three round buttons, nothing under them, ${say(a3)}`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_list.png`) });
    // The second visit: the cover, then the level list (level 1 is done).
    await go();
    await page.waitForSelector('.screen.cover .cover-tap');
    await page.mouse.click(phone.width / 2, phone.height * 0.6);
    await page.waitForSelector('.screen.levels .level-btn');
    check(true, 'the second visit opens on the level list');
    await context.close();
  }
  {
    // Before anything is cleared, the list (reached by "Levels") shows its short how-to under the title, clear of the buttons.
    const { context, page, go } = await fresh('cover=0');
    await go();
    await page.waitForSelector('.screen.levels .level-btn');
    await wait(300);
    const head = await page.evaluate(() => { const p = document.querySelector('.brand p')?.getBoundingClientRect(), btns = [...document.querySelectorAll('.brand .help, .brand .binoculars, .brand .gear')].map((b) => b.getBoundingClientRect()); return p ? btns.every((r) => p.top >= r.bottom - 1 || p.right <= r.left) : null; });
    const a = await audit(page);
    check(head === true && clean(a), `a new player's level list: the how-to paragraph sits under the round buttons, not behind them; ${say(a)}`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_list_new.png`) });

    // ---------- Settings: version, credits, feedback ----------
    console.log(`${phone.name}: Settings`);
    await page.locator('.gear').click();
    await page.waitForSelector('.settings .card');
    await wait(250);
    const set = await page.evaluate(() => { const v = document.querySelector('.settings .app-version'), ask = document.querySelector('.settings .step.ask'), credits = document.querySelector('.settings .step.credits'); const vis = [...ask.children].filter((c) => c !== v && c.getBoundingClientRect().height > 0); return { version: v?.textContent, last: vis.every((c) => c.getBoundingClientRect().bottom <= v.getBoundingClientRect().top + 1), credits: getComputedStyle(credits).display, feedback: !!document.querySelector('.settings .feedback') }; });
    check(/^Version \d+\.\d+\.\d+ \(\w+\)( DEV)?$/.test(set.version ?? '') && set.last, // (" DEV" on the dev lane's copy)
      `the version number is at the bottom of Settings: "${set.version}"`);
    check(set.credits === 'none', 'the Credits list stays hidden until Credits is tapped');
    check(set.feedback === (FEEDBACK_EMAIL !== ''), FEEDBACK_EMAIL ? 'the Send feedback row is there' : 'no feedback address is set yet, so the Send feedback row is not shown');
    const a4 = await audit(page);
    check(clean(a4), `Settings: nothing cut off, ${say(a4)}`);
    await context.close();
  }
  {
    const { context, page, go } = await fresh('cover=0&feedback=beta@example.com');
    await go();
    await page.waitForSelector('.screen.levels .level-btn');
    // (A level is opened first, so the feedback has one to name.)
    await page.locator('.level-btn').first().click();
    await page.waitForSelector('.board .truck');
    await page.evaluate(() => document.querySelector('.hud [data-act="levels"]').click());
    await page.waitForSelector('.screen.levels .level-btn');
    await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } }); });
    await page.locator('.gear').click();
    await page.waitForSelector('.settings .feedback');
    await wait(350); // (the panel pops in: measured once it has settled)
    const row = await page.evaluate(() => { const f = document.querySelector('.settings .feedback'), m = f.querySelector('.feedback-mail'), b = f.querySelector('button').getBoundingClientRect(); return { mail: m.textContent, selectable: /all|text/.test(getComputedStyle(m).userSelect || getComputedStyle(m).webkitUserSelect), btn: [Math.round(b.width), Math.round(b.height)], links: f.querySelectorAll('a, form, iframe').length, title: f.querySelector('b').textContent }; });
    await page.locator('.settings .feedback button').click();
    await wait(200);
    const copied = await page.evaluate(() => ({ text: window.__copied, btn: document.querySelector('.settings .feedback button').textContent }));
    check(row.title === 'Send feedback' && row.mail === 'beta@example.com' && row.selectable && row.btn[1] >= 44 && row.links === 0, `a Send feedback row with a plain address to copy (${row.mail}); no link, no form (its button ${row.btn.join(' x ')} px)`);
    check(typeof copied.text === 'string' && copied.text.startsWith('To: beta@example.com') && /Version \d+\.\d+\.\d+ \(\w+\)/.test(copied.text) && (phone.name === 'iPhone SE' ? /Phone: .+ \(375 x 667\)/ : /Phone: Pixel 7a, Android 14 \(360 x 800\)/).test(copied.text) && /Level: Cardium 1 "Spud In"/.test(copied.text) && /Copied/.test(copied.btn), `the Copy button copies the address with the app version, the phone and the level: ${JSON.stringify(copied.text?.split('\n').filter(Boolean).slice(-3))}`);
    const a = await audit(page);
    check(clean(a), `Settings with the feedback row: nothing cut off, ${say(a)}`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_settings.png`) });
    await context.close();
  }

  // ---------- The Wildlife Log on a small phone ----------
  {
    const { context, page, go } = await fresh('cover=0');
    await go();
    await page.waitForSelector('.screen.levels .level-btn');
    await page.locator('.binoculars').click();
    await page.waitForSelector('.dig-bg svg.strata');
    await wait(300);
    const a = await audit(page);
    check(clean(a), `the Wildlife Log: nothing cut off, ${say(a)}`);
    await context.close();
  }

  // ---------- Updates ----------
  console.log(`${phone.name}: the update bar`);
  {
    const { context, page, go } = await fresh('cover=0&update=test');
    await go();
    await page.waitForSelector('.screen.levels .level-btn');
    // Some progress to keep: Cardium 1 and 2 cleared, a streak day, the last region, a sighting.
    // (Yesterday's pad: a day further back and a Safety Stand-Down would be written into the progress on load.)
    const day = new Date(Date.now() - 86_400_000);
    const YESTERDAY = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const saved = { 'rush-hour-rigs:v2': JSON.stringify({ best: { c01: 2, c02: 5 }, hints: 4, perfect: ['c01'], dailyCleared: [YESTERDAY], announced: [], demo: false }), 'rush-hour-rigs:log': JSON.stringify({ v: 3, found: ['magpie'], camo: true, camoEarned: false }), 'rush-hour-rigs:region': 'cardium' };
    await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, saved);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.update-bar');
    const bar = await page.evaluate(() => { const b = document.querySelector('.update-bar'), r = b.getBoundingClientRect(); return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), in: r.left >= 0 && r.right <= innerWidth && r.top >= 0, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b }; });
    check(bar.text === 'New version, tap to update' && bar.h >= 44 && bar.in && bar.top, `a small bar across the top: "${bar.text}" (${bar.w} x ${bar.h} px)`);
    await page.screenshot({ path: join(OUT, `beta_${phone.width}_update.png`) });
    // It keeps off a level being played, and is back on the list.
    await page.evaluate(() => document.querySelector('.level-btn').click());
    await page.waitForSelector('.board .truck');
    const inGame = await page.evaluate(() => getComputedStyle(document.querySelector('.update-bar')).display);
    await page.evaluate(() => document.querySelector('.hud [data-act="levels"]').click());
    await page.waitForSelector('.screen.levels .level-btn');
    const back = await page.evaluate(() => getComputedStyle(document.querySelector('.update-bar')).display);
    check(inGame === 'none' && back !== 'none', 'it is not shown over a level being played, and is there again on the level list');
    // A tap reloads; nothing saved is touched.
    await page.evaluate(() => { window.__before = performance.timeOrigin; sessionStorage.setItem('was', String(performance.timeOrigin)); });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('.update-bar').click()]);
    await page.waitForSelector('.screen.levels .level-btn');
    const after = await page.evaluate((keys) => ({ reloaded: sessionStorage.getItem('was') !== String(performance.timeOrigin), store: Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), hats: document.querySelectorAll('.level-btn[data-index="0"] .hats .on').length, open: [...document.querySelectorAll('.level-btn')].filter((b) => !b.classList.contains('locked')).length }), Object.keys(saved));
    check(after.reloaded && Object.keys(saved).every((k) => after.store[k] === saved[k]) && after.hats === 3 && after.open === 3, 'a tap reloads the page, and progress is exactly as it was: the same saved levels, hard hats, streak and sightings');
    await context.close();
  }
  await browser.close();
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
