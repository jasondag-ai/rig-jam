// THE DEV LANE (October upgrade, job U1), in WebKit at iPhone DPR 3, 375 and 390 wide:
//  1. THE DEV LABEL: the dev copy says DEV in Settings' version line and in a corner of the home page; the live
//     game says it nowhere.
//  2. SAVES: a save written by the dev build (levels cleared, a Daily Pad, sightings, settings) is handed to the
//     LIVE build as a phone would hand it (they share one web origin, so one storage) and the live build shows
//     all of it; the live build then plays on, and the dev build reads that back whole.
//  3. "You can come back tomorrow." is said only on a Daily Pad's win card.
//  4. The Wildlife Log's depth gauge never lies over a card's picture or its words.
// DEV = the dev build (default the dev server of ~/Rig-Jam-next on 5181, started with RIG_CHANNEL=dev; or the dev
// site), LIVE = the live build (default the live site). `ONLY=label|saves|line|pill|pads`.
import { webkit } from 'playwright';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { newGame, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';

const DEV = process.env.DEV ?? 'http://localhost:5181/';
const LIVE = process.env.LIVE ?? 'https://jasondag-ai.github.io/rig-jam/';
const ONLY = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = 'cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0&off=sam,nearmiss,landowner,biffya,biffyb';
const plan = (level) => { let s = newGame(level); return solve(level).map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return { ...m, out: r.exited }; }); };
const drag = (page, m) => page.evaluate(async ([id, n, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), r = el.getBoundingClientRect(), h = el.classList.contains('horiz');
  const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 91, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => setTimeout(q, 17)); }
  ev('pointerup');
  await new Promise((q) => setTimeout(q, ms));
}, [m.id, m.delta + (m.out ? Math.sign(m.delta) * 0.4 : 0), m.out ? 900 : 380]);
const clear = async (page, level) => { for (const m of plan(level)) await drag(page, m); await page.waitForSelector('button:has-text("Play again")', { timeout: 8000 }); await wait(700); };
const browser = await webkit.launch();
const phone = (w) => browser.newContext({ viewport: { width: w, height: w === 375 ? 667 : 844 }, deviceScaleFactor: 3, hasTouch: true });
const daily = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)];

// ---------- 1. The DEV label ----------
if (!ONLY || ONLY === 'label') {
  for (const [name, url, dev] of [['the dev build', DEV, true], ['the live build', LIVE, false]]) {
    console.log(`\n${name} (${url}), webkit 375 wide: the DEV label`);
    const context = await phone(375), page = await context.newPage();
    await page.goto(`${url}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.screen.levels');
    const chip = await page.evaluate(() => { const e = document.querySelector('.dev-chip'); if (!e) return null; const r = e.getBoundingClientRect(), t = document.querySelector('.brand h1').getBoundingClientRect(), g = document.querySelector('.brand .help').getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(document.querySelector('.brand h1')); const words = range.getBoundingClientRect(); return { text: e.textContent, on: r.width > 0 && r.left >= 0 && r.top >= 0, clear: r.bottom <= words.top + 6 && r.right < g.left, small: r.height <= 24, h1: t.top }; });
    await page.locator('.gear').click();
    await page.waitForSelector('.settings');
    const version = await page.evaluate(() => document.querySelector('.settings .app-version').textContent);
    const anywhere = await page.evaluate(() => /\bDEV\b/.test(document.body.innerText));
    if (dev) check(chip?.text === 'DEV' && chip.on && chip.clear && chip.small && /^Version \d+\.\d+\.\d+ \([0-9a-f]{7}|dev\) DEV$/.test(version) && version.endsWith(' DEV'), `a small DEV label in the home page's corner, clear of the title and the buttons, and "${version}" in Settings`);
    else check(!chip && !version.includes('DEV') && !anywhere, `no DEV label anywhere ("${version}")`);
    await context.close();
  }
}

// ---------- 2. One save, two builds ----------
if (!ONLY || ONLY === 'saves') {
  for (const w of [375, 390]) {
    console.log(`\nwebkit ${w} wide: a save written by the dev build, loaded by the live build, and back`);
    const context = await phone(w);
    const store = (page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('rush-hour-rigs'))));
    const give = async (page, url, saved) => { await page.goto(`${url}?${QUIET}`, { waitUntil: 'networkidle' }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, saved); await page.goto(`${url}?${QUIET}`, { waitUntil: 'networkidle' }); await page.waitForSelector('.screen.levels'); };
    const shown = (page) => page.evaluate(() => ({ hats: [...document.querySelectorAll('.level-btn')].map((b) => b.querySelectorAll('.hat.full, .hat:not(.empty)').length), open: [...document.querySelectorAll('.level-btn')].filter((b) => !b.classList.contains('locked')).length, streak: document.querySelector('.safety-sign .sign-count, .sign-count')?.textContent?.trim() ?? '', dailyDone: !!document.querySelector('.daily-btn.done, .daily-btn.cleared') || /cleared|done|✓/i.test(document.querySelector('.daily-btn')?.textContent ?? '') }));
    // The dev build writes it: Cardium 1 and 2 at par, today's Daily Pad, Sound effects on, one sighting (the knock of a tapped sign does not count: the deer does).
    const dev = await context.newPage();
    await dev.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
    await dev.evaluate(() => localStorage.clear());
    await dev.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
    await dev.waitForSelector('.screen.levels');
    for (const li of [0, 1]) { await dev.locator('.level-btn').nth(li).click(); await dev.waitForSelector('.board .truck.sprite-on'); await wait(400); await clear(dev, REGIONS[0].levels[li]); await dev.locator('button:has-text("All levels")').click(); await dev.waitForSelector('.screen.levels'); }
    await dev.locator('.daily-btn').click(); await dev.waitForSelector('.board .truck.sprite-on'); await wait(400); await clear(dev, daily); await dev.locator('button:has-text("All levels")').click(); await dev.waitForSelector('.screen.levels');
    await dev.locator('.gear').click(); await dev.waitForSelector('.settings'); await dev.locator('.settings [data-act="sfx"]').evaluate((e) => e.click()); await dev.locator('.settings [data-act="close"]').click();
    await dev.locator('.level-btn').nth(2).click(); await dev.waitForSelector('.board .truck.sprite-on'); await wait(500);
    const sign = await dev.evaluate(() => { const r = document.querySelector('.sign-layer svg').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await dev.mouse.click(sign.x, sign.y);
    await dev.waitForFunction(() => (JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{}').found ?? []).includes('deer'), null, { timeout: 30000 }).catch(() => {});
    await dev.locator('.hud [data-act="levels"]').click(); await dev.waitForSelector('.screen.levels');
    const saved = await store(dev), devShows = await shown(dev);
    const p = JSON.parse(saved['rush-hour-rigs:v2']), log = JSON.parse(saved['rush-hour-rigs:log'] ?? '{}');
    check(Object.keys(p.best).length === 3 && p.dailyCleared.length === 1 && (log.found ?? []).includes('deer') && JSON.parse(saved['rush-hour-rigs-audio']).sfx === true, `the dev build wrote a save: ${Object.keys(p.best).join(', ')} cleared, ${p.hints} hints, a Daily Pad, the log ${JSON.stringify(log.found)}, sound effects on (${Object.keys(saved).length} keys)`);
    // The live build is handed that very storage.
    const live = await context.newPage();
    await give(live, LIVE, saved);
    const liveShows = await shown(live), liveStore = await store(live);
    check(JSON.stringify(liveShows.hats) === JSON.stringify(devShows.hats) && liveShows.open === devShows.open && liveShows.streak === devShows.streak, `the live build shows it whole: the same hard hats (${liveShows.hats.slice(0, 4).join(', ')}...), ${liveShows.open} levels open, the streak "${liveShows.streak}"`);
    check(liveStore['rush-hour-rigs:v2'] === saved['rush-hour-rigs:v2'] && liveStore['rush-hour-rigs:log'] === saved['rush-hour-rigs:log'] && liveStore['rush-hour-rigs-audio'] === saved['rush-hour-rigs-audio'], 'and loading it changed nothing in the storage: scores, the log and the settings are byte for byte what the dev build wrote');
    await live.locator('.binoculars').click(); await live.waitForSelector('.log-card');
    const liveLog = await live.evaluate(() => [...document.querySelectorAll('.log-card.found')].map((c) => (c.querySelector('h3, h2, b, strong') ?? c).textContent.trim()));
    check(liveLog.includes('Back Scratcher'), `its Wildlife Log has the sighting (${liveLog.join(', ')})`);
    await live.goto(`${LIVE}?${QUIET}`, { waitUntil: 'networkidle' }); await live.waitForSelector('.screen.levels');
    await live.locator('.gear').click(); await live.waitForSelector('.settings');
    check(await live.locator('.settings [data-act="sfx"]').evaluate((e) => e.checked), 'and Sound effects is on, as set');
    await live.locator('.settings [data-act="close"]').click();
    // The live build plays on (Cardium 3), and the dev build reads what it wrote.
    await live.locator('.level-btn').nth(2).click(); await live.waitForSelector('.board .truck.sprite-on'); await wait(400); await clear(live, REGIONS[0].levels[2]);
    const after = await store(live);
    await give(dev, DEV, after);
    const back = await shown(dev), pp = JSON.parse(after['rush-hour-rigs:v2']);
    check(Object.keys(pp.best).length === 4 && Object.entries(p.best).every(([k, v]) => pp.best[k] === v) && pp.dailyCleared.length === 1 && back.hats.slice(0, 3).every((h) => h === 3) && back.open === devShows.open + 1 && (JSON.parse(after['rush-hour-rigs:log']).found ?? []).includes('deer'), `the live build played Cardium 3 on that save, and the dev build reads it back whole: ${Object.keys(pp.best).length} scores, three levels at three hard hats, ${back.open} open, the sighting kept`);
    await context.close();
  }
}

// ---------- 3. "You can come back tomorrow." ----------
if (!ONLY || ONLY === 'line') {
  for (const w of [375, 390]) {
    console.log(`\nwebkit ${w} wide: "You can come back tomorrow." only on a Daily Pad's win card`);
    const context = await phone(w), page = await context.newPage();
    // (The dice are loaded: Math.random walks evenly through 0..1, so every line of the pool comes up within a few cards.)
    // (`'top'`: always the top of the range, which picks the LAST line of his pool: the one about tomorrow, where it is allowed.)
    await page.addInitScript(() => { let k = 0; const real = Math.random; window.__sweep = (on) => { Math.random = on === 'top' ? () => 0.999 : on ? () => ((k++ * 0.0731) % 1) : real; }; });
    const cards = async (start, level, n, how = true) => {
      const said = [];
      await start();
      await page.waitForSelector('.board .truck.sprite-on'); await wait(400);
      for (let i = 0; i < n; i++) {
        await page.evaluate((h) => window.__sweep(h), how);
        await clear(page, level);
        said.push(await page.evaluate(() => document.querySelector('.company-says').textContent));
        await page.evaluate(() => window.__sweep(false));
        await page.locator('button:has-text("Play again")').click();
        await page.waitForSelector('.board .truck.sprite-on'); await wait(350);
      }
      return said;
    };
    await page.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.screen.levels');
    const onLevel = [...(await cards(() => page.locator('.level-btn').nth(0).click(), REGIONS[0].levels[0], 14)), ...(await cards(async () => {}, REGIONS[0].levels[0], 4, 'top'))];
    check(new Set(onLevel).size >= 5 && !onLevel.includes('You can come back tomorrow.'), `${onLevel.length} perfect clears of Cardium 1, the dice walked through and then held at the top: ${new Set(onLevel).size} different lines, never "You can come back tomorrow."`);
    await page.locator('button:has-text("All levels")').click().catch(() => {});
    await page.locator('.hud [data-act="levels"]').click().catch(() => {});
    await page.waitForSelector('.screen.levels');
    const onDaily = await cards(() => page.locator('.daily-btn').click(), daily, 4, 'top');
    check(onDaily.includes('You can come back tomorrow.'), `4 perfect clears of the Daily Pad with the dice held at the top: he says it there (${onDaily.filter((l) => l === 'You can come back tomorrow.').length} times in ${onDaily.length}; never twice running)`);
    await context.close();
  }
}

// ---------- 4. The depth gauge and the cards ----------
if (!ONLY || ONLY === 'pill') {
  for (const w of [375, 390]) {
    console.log(`\nwebkit ${w} wide, DPR 3: the Wildlife Log's depth gauge and the cards`);
    const context = await phone(w), page = await context.newPage();
    await page.goto(`${DEV}?${QUIET}&log=all`, { waitUntil: 'networkidle' });
    await page.locator('.binoculars').click();
    await page.waitForSelector('.log-card');
    await wait(400);
    const end = await page.evaluate(() => { const s = document.querySelector('.screen.log'); return [...document.querySelectorAll('.log-card')].at(-1).getBoundingClientRect().bottom + s.scrollTop; });
    let art = 0, text = 0, slim = 0, steps = 0, off = 0;
    for (let y = 0; y < end + 200; y += 29) {
      const r = await page.evaluate((y) => { const s = document.querySelector('.screen.log'); s.scrollTop = y; s.dispatchEvent(new Event('scroll')); return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const pill = document.querySelector('.dig-gauge-pill').getBoundingClientRect();
        const over = (q) => Math.max(0, Math.min(pill.right, q.right) - Math.max(pill.left, q.left)) * Math.max(0, Math.min(pill.bottom, q.bottom) - Math.max(pill.top, q.top));
        let art = 0, text = 0;
        for (const c of document.querySelectorAll('.log-card')) {
          // (The picture itself: what is drawn, cut to its box.)
          const box = c.querySelector('.art').getBoundingClientRect(), svg = c.querySelector('.art svg')?.getBoundingClientRect();
          if (svg) art = Math.max(art, over({ left: Math.max(svg.left, box.left), right: Math.min(svg.right, box.right), top: Math.max(svg.top, box.top), bottom: Math.min(svg.bottom, box.bottom) }));
          for (const t of c.querySelectorAll('h2, p, .legend-tag')) { const range = document.createRange(); range.selectNodeContents(t); for (const q of range.getClientRects()) text = Math.max(text, over(q)); }
        }
        res({ art, text, slim: document.querySelector('.dig-gauge').classList.contains('slim'), off: Math.max(0, pill.right - innerWidth), seen: pill.width > 0 && pill.height > 0 && document.querySelector('.dig-depth').textContent.includes('km') });
      }))); }, y);
      art = Math.max(art, r.art); text = Math.max(text, r.text); slim += r.slim ? 1 : 0; off = Math.max(off, r.off); steps++;
      if (!r.seen) art = Infinity;
    }
    check(art === 0 && text === 0 && off <= 0.5 && slim > steps * 0.6, `scrolled past every card in ${steps} steps: the gauge never lies over a card's picture (${art} px²) or its words (${text} px²); beside the cards it is the slim tab on the screen's edge, always showing its km`);
    await page.evaluate((y) => { const s = document.querySelector('.screen.log'); s.scrollTop = y + 2500; s.dispatchEvent(new Event('scroll')); }, end);
    await wait(300);
    const below = await page.evaluate(() => { const r = document.querySelector('.dig-gauge-pill').getBoundingClientRect(); return { slim: document.querySelector('.dig-gauge').classList.contains('slim'), w: r.width, text: document.querySelector('.dig-depth').textContent }; });
    check(!below.slim && below.w >= 70, `below the last card it is the pill again (${Math.round(below.w)} px wide, "${below.text}")`);
    await context.close();
  }
}

// ---------- 5. Daily Pads forever (job U2): ?pad=N on the dev copy, and a day after pad 60 ----------
if (!ONLY || ONLY === 'pads') {
  const { readFileSync } = await import('node:fs');
  const { parseLevel } = await import('../src/engine/index.ts');
  const { blockOf, padSlot } = await import('../src/ui/daily-pads.ts');
  const padFromDisk = (pad) => { const b = blockOf(padSlot(pad)); return parseLevel(JSON.parse(readFileSync(new URL(`../public/${b.file}`, import.meta.url), 'utf8'))[padSlot(pad) - b.from]); };
  for (const w of [375, 390]) {
    console.log(`\nwebkit ${w} wide: the dev copy's ?pad=N opens that Daily Pad, it plays, and nothing is saved`);
    for (const pad of [61, 200, 790, 791]) {
      const context = await phone(w), page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${DEV}?${QUIET}&pad=${pad}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.board .truck.sprite-on', { timeout: 10000 }).catch(() => {});
      await wait(400);
      const level = padFromDisk(pad);
      const hud = ((await page.evaluate(() => document.querySelector('.hud')?.textContent)) ?? '').replace(/\s+/g, ' ');
      const onPad = await page.evaluate(() => [...document.querySelectorAll('.board .truck')].map((t) => t.dataset.id).sort().join(''));
      const theme = await page.evaluate(() => document.querySelector('.screen.game')?.dataset.theme ?? document.querySelector('.screen.game')?.className ?? '');
      await clear(page, level).catch(() => {});
      const won = (await page.locator('button:has-text("Play again")').count()) === 1;
      const stored = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('rush-hour-rigs:v2') ?? '{}'); return Object.keys(p.best ?? {}).length; });
      // What the phone REALLY holds afterwards: a second page of the same browser, without the link.
      const other = await context.newPage();
      await other.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
      const real = await other.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('rush-hour-rigs') && k !== 'rush-hour-rigs:region'));
      const streak = await other.evaluate(() => document.querySelector('.daily-btn')?.classList.contains('done'));
      check(hud.includes(`Daily Pad #${pad}`) && onPad === level.trucks.map((t) => t.id).sort().join('') && won && stored === 1 && real.length === 0 && !streak && errors.length === 0, `?pad=${pad}: "Daily Pad #${pad}" opens${pad > 790 ? ` (the level of pad ${padSlot(pad)}, round again)` : ''}, its ${level.trucks.length} trucks are cleared at par ${level.par} (theme ${String(theme).match(/summer|spring/)?.[0] ?? '?'}), and nothing is saved: ${real.length} keys, today's pad not marked done${errors.length ? ' ERR ' + errors[0] : ''}`);
      await context.close();
    }
  }
  // The live build does not read the link (on the live site it simply is not there).
  {
    const context = await phone(390), page = await context.newPage();
    await page.goto(`${LIVE}?${QUIET}&pad=200`, { waitUntil: 'networkidle' });
    await wait(600);
    check(!!(await page.$('.screen.levels')) && !(await page.$('.board')), 'the live build ignores ?pad=200: its level list opens as ever');
    await context.close();
  }
  // A day after pad 60 (the clock set to Dec 1, 2026: pad 63): the home page names it, its par comes in, and it plays.
  for (const w of [375, 390]) {
    const context = await phone(w), page = await context.newPage();
    await page.clock.setFixedTime(new Date(2026, 11, 1, 12, 0, 0));
    await page.goto(`${DEV}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.daily-btn');
    await page.waitForFunction(() => /par \d/.test(document.querySelector('.daily-sub')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
    const btn = await page.evaluate(() => ({ title: document.querySelector('.daily-title').textContent, sub: document.querySelector('.daily-sub').textContent }));
    const level = padFromDisk(63);
    await page.locator('.daily-btn').click();
    await page.waitForSelector('.board .truck.sprite-on', { timeout: 8000 }).catch(() => {});
    await wait(400);
    const hud = ((await page.evaluate(() => document.querySelector('.hud')?.textContent)) ?? '').replace(/\s+/g, ' ');
    await clear(page, level).catch(() => {});
    const won = (await page.locator('button:has-text("Play again")').count()) === 1;
    const saved = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('rush-hour-rigs:v2') ?? '{}'); return { best: p.best ?? {}, days: p.dailyCleared ?? [] }; });
    check(btn.title === 'Daily Pad #63' && btn.sub.includes(`par ${level.par}`) && hud.includes('Daily Pad #63') && won && saved.best.d63 === level.par && saved.days.includes('2026-12-01'), `webkit ${w} wide, the phone's date Dec 1, 2026: the home page says "${btn.title}" and "${btn.sub}", it opens and is cleared at par ${level.par}, and that day counts (${JSON.stringify(saved.days)})`);
    await context.close();
  }
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
