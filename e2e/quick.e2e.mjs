// Job R, playthrough quick wins (Manus's review), in real browsers:
//  1. Settings: Credits is hidden until asked for, on every visit; Settings fits 844 px with no scroll
//  2. the console is clean on all 50 levels, and no SVG ever carries a NaN viewBox
//  3. a field's last level: the win card's primary button is "Next field: <name>"
//  4. the how-to closes with Escape and with a tap on its backdrop (not with a tap on its card)
//  5. region tabs: all of them, no swipe, where they fit (a desktop window); the swipe stays on phones
//  6. the one-time "Tap for sound" chip on the first win card; the "Music style" label; the hint
//     count reads "9+" past nine; no cover.webp preload
// Needs a running dev server (or URL=…).
import { chromium, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';
import { UNLOCKED } from './progress.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = 'cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam,nearmiss,landowner';
const progress = (p) => JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: REGIONS.map((r) => r.id), demo: false, ...p });
async function open(browser, { width = 390, height = 844, query = QUIET, saved = UNLOCKED, touch = true, clear = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: touch });
  const page = await context.newPage();
  const noise = [];
  page.on('pageerror', (e) => noise.push(`error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') noise.push(`${m.type()}: ${m.text()}`); });
  await page.goto(`${ROOT}?${query}`, { waitUntil: 'networkidle' });
  await page.evaluate(([p, clear]) => { if (clear) localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, [saved, clear]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.levels');
  return { context, page, noise };
}
const drag = (page, id, cells) => page.evaluate(async ([id, cells]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
  const h = el.classList.contains('horiz'); const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown'); for (let k = 0; k < 6; k++) { if (h) x += (cells * cell) / 6; else y += (cells * cell) / 6; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
  await new Promise((q) => setTimeout(q, 420));
}, [id, cells]);
const play = async (page, region, level) => {
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(level).click();
  await page.waitForSelector('.board .truck');
  await wait(350);
};
const winIt = async (page, lv) => {
  for (const m of solve(lv)) await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
  await page.waitForSelector('.win:not([hidden]) .card', { timeout: 8000 });
  await wait(500);
};

const wk = await webkit.launch();

console.log('webkit 390x844: Settings');
{
  const { context, page } = await open(wk);
  for (const visit of [1, 2]) {
    await page.locator('.gear').click();
    await page.waitForSelector('.overlay.settings');
    await wait(250);
    const s = await page.evaluate(() => {
      const o = document.querySelector('.overlay.settings'), card = o.querySelector('.card') ?? o.firstElementChild, r = card.getBoundingClientRect();
      const seen = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const label = o.querySelector('.styles-label'), styles = o.querySelector('.music-styles');
      return { credits: [...o.querySelectorAll('.credits-list')].some(seen), top: r.top, bottom: r.bottom, scrolls: o.scrollHeight > o.clientHeight + 1, vh: innerHeight,
        label: label?.textContent, above: !!label && label.getBoundingClientRect().bottom <= styles.getBoundingClientRect().top + 1 && seen(label), version: (() => { const v = o.querySelector('.app-version')?.getBoundingClientRect(); return !!v && v.height > 0 && v.bottom <= innerHeight; })() };
    });
    check(!s.credits, `visit ${visit}: the Credits list is not shown until Credits is tapped`);
    // (The overlay keeps its spare room under the panel for Safari's toolbar, so it can still be nudged; the panel itself is all on screen.)
    check(s.top >= 0 && s.bottom <= s.vh && s.version, `visit ${visit}: the whole Settings panel, down to the version line, is on the 844 px screen without scrolling (${Math.round(s.top)} to ${Math.round(s.bottom)} of ${s.vh})`);
    if (visit === 1) {
      check(s.label === 'Music style' && s.above, 'a small "Music style" label sits above the three style buttons');
      await page.locator('.overlay.settings [data-act="credits"]').click();
      await wait(250);
      check(await page.evaluate(() => { const l = document.querySelector('.overlay.settings .credits-list')?.getBoundingClientRect(); return !!l && l.height > 40; }), 'a tap on Credits shows the list');
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.screen.levels');
  }
  check(await page.evaluate(() => !document.querySelector('link[rel="preload"][href*="cover"]')), 'index.html no longer preloads cover.webp');
  await context.close();
}

console.log('\nwebkit: the how-to closes with Escape and a backdrop tap');
{
  const { context, page } = await open(wk, { touch: false });
  const there = () => page.evaluate(() => !!document.querySelector('.overlay.tutorial'));
  await page.locator('.brand .help').click(); await wait(200);
  const opened = await there();
  await page.keyboard.press('Escape'); await wait(150);
  check(opened && !(await there()), 'Escape closes it');
  await page.locator('.brand .help').click(); await wait(200);
  await page.locator('.overlay.tutorial h2').click(); await wait(150);
  const stays = await there();
  await page.mouse.click(6, 6); await wait(150);
  check(stays && !(await there()), 'a tap on its card leaves it open; a tap on the dimmed backdrop closes it');
  await page.locator('.brand .help').click(); await wait(200);
  await page.locator('.overlay.tutorial [data-t="next"]').click(); await wait(200);
  check((await there()) && (await page.evaluate(() => document.querySelector('.overlay.tutorial').dataset.at)) === '1', 'Next still turns the card');
  await context.close();
}

console.log('\nwebkit: region tabs');
{
  const bar = (page) => page.evaluate(() => {
    const f = document.querySelector('.regions'), t = f.querySelector('.regions-track'), fr = f.getBoundingClientRect();
    const tabs = [...t.children].map((e) => e.getBoundingClientRect());
    return { fit: f.classList.contains('all-fit'), n: tabs.length, inside: tabs.every((r) => r.left >= fr.left - 0.5 && r.right <= fr.right + 0.5), scrolls: t.scrollWidth > t.clientWidth + 1, narrowest: Math.round(Math.min(...tabs.map((r) => r.width))),
      clipped: [...t.querySelectorAll('.rname')].some((e) => e.scrollWidth > e.clientWidth + 1), fades: f.classList.contains('more-left') || f.classList.contains('more-right') };
  });
  {
    const { context, page } = await open(wk, { width: 1280, height: 800, touch: false });
    await wait(300);
    const b = await bar(page);
    check(b.fit && b.n === REGIONS.length && b.inside && !b.scrolls && !b.clipped && !b.fades && b.narrowest >= 96, `a desktop window shows all ${b.n} region tabs side by side with nothing to swipe (the narrowest ${b.narrowest} px, no name cut short, no edge fade)`);
    await page.locator('.region-tab').nth(4).click(); await wait(300);
    check((await page.evaluate(() => document.querySelectorAll('.region-tab')[4].getAttribute('aria-selected'))) === 'true', 'a click on the last tab opens that field');
    await context.close();
  }
  for (const [width, query] of [[390, QUIET], [375, QUIET], [1280, `${QUIET}&tabs=8`]]) {
    const { context, page } = await open(wk, { width, height: width > 500 ? 800 : 844, query, touch: width < 500 });
    await wait(300);
    const b = await bar(page);
    check(!b.fit && b.scrolls && b.narrowest >= 100, `${width} px${query.includes('tabs=8') ? ' with 8 tabs' : ''}: they do not all fit, so the bar stays a swipeable strip of full-size tabs (${b.narrowest} px each)`);
    await context.close();
  }
}

console.log('\nwebkit: the last level of a field');
{
  const last = REGIONS[0].levels.length - 1;
  const saved = progress({ best: Object.fromEntries(REGIONS[0].levels.slice(0, last).map((l) => [l.id, l.par])) });
  const { context, page } = await open(wk, { saved });
  await play(page, 0, last);
  await winIt(page, REGIONS[0].levels[last]);
  const card = await page.evaluate(() => { const b = document.querySelector('.win .card .btn.primary'), c = document.querySelector('.win .card').getBoundingClientRect(); return { text: b?.textContent.trim(), h: b?.getBoundingClientRect().height, fits: c.top >= 0 && c.bottom <= innerHeight, verdict: document.querySelector('.win .verdict')?.textContent ?? null }; });
  check(card.text === `Next field: ${REGIONS[1].name} ›` && card.h >= 44 && card.fits, `${REGIONS[0].name} ${last + 1} cleared: the primary button reads "${card.text}" (${Math.round(card.h)} px tall; the card fits)`);
  await page.locator('.win .card .btn.primary').click();
  await page.waitForSelector('.screen.levels');
  await wait(300);
  const at = await page.evaluate(() => [...document.querySelectorAll('.region-tab')].findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  check(at === 1, `a tap opens ${REGIONS[1].name}'s level list`);
  await context.close();
}
{
  const R = REGIONS.length - 1, last = REGIONS[R].levels.length - 1;
  const { context, page } = await open(wk);
  await play(page, R, last);
  await winIt(page, REGIONS[R].levels[last]);
  const card = await page.evaluate(() => ({ field: !!document.querySelector('.win .next-field'), verdict: document.querySelector('.win .verdict')?.textContent ?? '' }));
  check(!card.field && /last level/.test(card.verdict), `the last level of the last field (${REGIONS[R].name}) has no next field: "${card.verdict}"`);
  await context.close();
}

console.log('\nwebkit: the "Tap for sound" chip and the hint count');
{
  const { context, page } = await open(wk, { query: `${QUIET}&soundnudge=1`, saved: progress({ best: { [REGIONS[0].levels[0].id]: 9 }, hints: 12 }) });
  await play(page, 0, 0);
  const many = await page.evaluate(() => document.querySelector('.hint-btn .count').textContent);
  await winIt(page, REGIONS[0].levels[0]);
  const chip = await page.evaluate(() => {
    const c = document.querySelector('.win .sound-nudge'); if (!c) return null;
    const r = c.getBoundingClientRect(), hit = (b) => { const q = b.getBoundingClientRect(); return !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); };
    return { text: c.textContent.trim(), w: r.width, h: r.height, in: r.left >= 0 && r.top >= 0 && r.right <= innerWidth, overButtons: [...document.querySelectorAll('.win .card .btn, .win .card .hat, .win .card h2 text')].some(hit), scroll: document.querySelector('.win').scrollHeight > document.querySelector('.win').clientHeight + 1 };
  });
  check(many === '9+', `12 hints in hand: the Hint button reads "${many}"`);
  check(!!chip && chip.text === 'Tap for sound' && chip.h >= 44 && chip.in && !chip.overButtons && !chip.scroll, `the first win card carries a "Tap for sound" chip (${chip ? Math.round(chip.w) + ' x ' + Math.round(chip.h) : 'none'} px), clear of the card's buttons, and the card still does not scroll`);
  await page.locator('.win .sound-nudge').click();
  await wait(250);
  const on = await page.evaluate(() => ({ s: JSON.parse(localStorage.getItem('rush-hour-rigs-audio') ?? '{}'), gone: !document.querySelector('.sound-nudge'), flag: localStorage.getItem('rush-hour-rigs-sound-nudge') }));
  check(on.s.sfx === true && on.s.music === true && on.gone && on.flag === '1', 'a tap turns sound effects and music on, and the chip goes');
  await context.close();
}
{
  // Offered once: a player who left it alone does not see it again.
  const { context, page } = await open(wk, { query: `${QUIET}&soundnudge=1`, saved: progress({ best: { [REGIONS[0].levels[0].id]: 9 }, hints: 9 }) });
  await play(page, 0, 0);
  const nine = await page.evaluate(() => document.querySelector('.hint-btn .count').textContent);
  await winIt(page, REGIONS[0].levels[0]);
  const first = await page.evaluate(() => !!document.querySelector('.win .sound-nudge'));
  await page.locator('.win [data-act="restart"], .win .btn:has-text("Play again")').first().click();
  await wait(500);
  await winIt(page, REGIONS[0].levels[0]);
  const second = await page.evaluate(() => !!document.querySelector('.win .sound-nudge'));
  check(nine === '9' && first && !second, `9 hints reads "${nine}"; the chip is offered on the first win card only, never again`);
  await context.close();
}
await wk.close();

console.log('\nchromium: a clean console on all 50 levels');
{
  const cr = await chromium.launch();
  const { context, page, noise } = await open(cr, { query: QUIET });
  const bad = [];
  let seen = 0;
  for (let r = 0; r < REGIONS.length; r++) {
    for (let l = 0; l < REGIONS[r].levels.length; l++) {
      await page.locator('.region-tab').nth(r).click();
      await page.locator('.level-btn').nth(l).click();
      await page.waitForSelector('.board .truck');
      await wait(220);
      const nan = await page.evaluate(() => [...document.querySelectorAll('svg[viewBox]')].filter((s) => /NaN|Infinity|undefined/.test(s.getAttribute('viewBox')) || s.getAttribute('viewBox').trim() === '').map((s) => `${s.getAttribute('class')}: "${s.getAttribute('viewBox')}"`));
      if (nan.length) bad.push(`${REGIONS[r].name} ${l + 1}: ${nan.join(', ')}`);
      seen++;
      await page.locator('.hud .back, .hud [data-act="levels"]').first().click();
      await page.waitForSelector('.screen.levels');
    }
  }
  check(seen === 50 && bad.length === 0, `${seen} levels opened: no SVG has a NaN (or empty) viewBox${bad.length ? ' BUT ' + bad.slice(0, 3).join(' | ') : ''}`);
  check(noise.length === 0, `the console stayed clean on all of them${noise.length ? ': ' + [...new Set(noise)].slice(0, 4).join(' | ') : ' (no errors, no warnings)'}`);
  await cr.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
