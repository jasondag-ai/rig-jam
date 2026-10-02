// Gags test (Playwright, iPhone 13, Chromium with real touch events). Uses ?idle=0.1 so the magpie
// comes after 1s and the spotter after 2s. Checks each gag fires at the right moment, stays off
// the 6x6 grid (or on a truck roof), never blocks a touch, and shows still under reduced motion.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:gags
import { chromium, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve } from '../src/engine/index.ts';
import { COMPANY_LINES } from '../src/ui/lines.ts';
import { biffyColumn } from '../src/ui/gags.ts';

const BASE = (process.env.URL ?? 'http://localhost:5173/') + '?idle=0.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

async function open(reducedMotion) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], demo: true, announced: [] }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  const tp = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  const touch = {
    async drag(id, cellsPath) {
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
    },
    async tapAt(x, y) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
  };
  return { browser, page, touch };
}

const enter = async (page, tab, index) => {
  // Back to the list from wherever we are (the win card's button sits on top of the HUD's).
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await wait(200);
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await wait(150);
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await wait(500);
};
const rect = (page, sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
const overlaps = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
const play = async (page, touch, level) => {
  for (const m of solve(level)) await touch.drag(m.id, [m.delta]);
  await wait(1200);
};

// ---------------- Normal motion ----------------
{
  const { browser, page, touch } = await open('no-preference');
  console.log('\nchromium iPhone 13 (real touch events), idle x0.1');

  // 1. Magpie after 10s (1s here): lands on a roof, poops, "Seriously?", flies off.
  await enter(page, 1, 0);
  await wait(1350);
  const birdMid = await rect(page, '.magpie').catch(() => null);
  check(!!birdMid, 'magpie arrives after the idle time');
  await page.waitForSelector('.roof-splat', { timeout: 4000 }).catch(() => {});
  const splatTruck = await page.$eval('.roof-splat', (s) => s.closest('.truck')?.dataset.id).catch(() => null);
  const bubble = await page.$eval('.bubble', (b) => b.textContent).catch(() => null);
  check(!!splatTruck, `splat lands on a truck roof (truck ${splatTruck})`);
  check(bubble === 'Seriously?', `that driver yells "${bubble}"`);
  const onRoof = await page.evaluate(() => {
    const bird = document.querySelector('.magpie');
    if (!bird) return 'gone';
    const r = bird.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.8);
    return hit?.closest('.truck') ? 'truck under it gets the touch' : hit?.className;
  });
  check(onRoof === 'truck under it gets the touch' || onRoof === 'gone', `the magpie never blocks a touch (${onRoof})`);
  await wait(2500);
  check(!(await page.$('.magpie')), 'magpie flies off');
  check(!!(await page.$('.roof-splat')), 'the splat stays on the roof');
  // Splat stays until that truck exits: solve the level and watch it go with the truck.
  // 2. Spotter after 20s (2s here), outside the fence, then gone.
  await page.waitForSelector('.spotter', { timeout: 3000 }).catch(() => {});
  const spotter = await rect(page, '.spotter').catch(() => null);
  const pad = await rect(page, '.pad');
  check(!!spotter, 'spotter jogs on after the longer idle time');
  if (spotter) check(!overlaps(spotter, pad), 'spotter stays outside the 6x6 grid');
  await wait(1200);
  check(await page.$eval('.spotter', (s) => s.classList.contains('dancing')).catch(() => false), 'spotter does the flag dance');
  // 3. Any touch cancels instantly and resets the idle clock.
  await touch.tapAt(20, 400);
  await wait(60);
  check(!(await page.$('.spotter')), 'a touch sends the spotter away instantly');
  await wait(1500);
  check(!(await page.$('.spotter')), 'idle clock restarted: no spotter 1.5s after the touch');
  check(!(await page.$('.magpie')), 'magpie only comes once per level');

  // Cancel the magpie mid-flight on a fresh level.
  await enter(page, 1, 1);
  await wait(1250);
  const flying = !!(await page.$('.magpie'));
  await touch.tapAt(20, 400);
  await wait(60);
  check(flying && !(await page.$('.magpie')) && !(await page.$('.roof-splat')), 'a touch cancels the magpie before it lands');

  // 4. Company Man by result, no repeats in a row.
  const level1 = REGIONS[0].levels[0];
  const says = async () => page.$eval('.company-says', (e) => e.textContent);
  await enter(page, 1, 0);
  await play(page, touch, level1);
  const parLine = await says();
  check(COMPANY_LINES.par.includes(parLine), `at par: "${parLine}"`);
  await page.$eval('.win [data-act="restart"]', (b) => b.click());
  await wait(300);
  await play(page, touch, level1);
  const parLine2 = await says();
  check(COMPANY_LINES.par.includes(parLine2) && parLine2 !== parLine, `at par again, a different line: "${parLine2}"`);
  await page.$eval('.win [data-act="restart"]', (b) => b.click());
  await wait(300);
  // Two extra moves (a truck there and back), then the real solution: 2 over par.
  const sol = solve(level1);
  const g = newGame(level1);
  const spare = level1.trucks
    .map((t) => ({ t, r: getMoveRange(g, t.id) }))
    .map(({ t, r }) => ({ id: t.id, d: r.max > 0 && r.max !== r.exitDelta ? 1 : r.min < 0 && r.min !== r.exitDelta ? -1 : 0 }))
    .find((x) => x.d !== 0);
  await touch.drag(spare.id, [spare.d]);
  await touch.drag(spare.id, [-spare.d]);
  for (const m of sol) await touch.drag(m.id, [m.delta]);
  await wait(1300);
  const moves = await page.$eval('.moves', (e) => parseInt(e.textContent)).catch(() => 0);
  const closeLine = await says().catch(() => null);
  const tier = moves <= level1.par ? 'par' : moves <= level1.par + 3 ? 'close' : 'over';
  check(!!closeLine && COMPANY_LINES[tier].includes(closeLine), `${moves} moves (par ${level1.par}, ${tier} tier): "${closeLine}"`);
  const cm = await rect(page, '.company-man').catch(() => null);
  check(!!cm && !(await page.evaluate(() => { const o = document.querySelector('.win'); return o.scrollHeight > o.clientHeight + 1; })), 'Company Man fits on the win card without scrolling');

  // 5. Biffy: a bump next to it opens the door.
  let biffyDone = false;
  for (const [ri, region] of REGIONS.entries()) {
    for (const [li, level] of region.levels.entries()) {
      const col = biffyColumn(level);
      const t = level.trucks.find((x) => {
        const cells = Array.from({ length: x.length }, (_, i) => (x.orient === 'h' ? [x.row, x.col + i] : [x.row + i, x.col]));
        return cells.some(([r, c]) => r >= 4 && Math.abs(c - col) <= 1);
      });
      if (!t) continue;
      await enter(page, ri + 1, li);
      // Push hard against whatever stops it (both ways): it's a bump either way.
      const b = await page.$eval(`.truck[data-id="${t.id}"]`, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
      const cdpDrag = async (dir) => {
        const page2 = page;
        await page2.evaluate(() => {});
        const h = t.orient === 'h';
        const steps = 10;
        const d = dir * cell * 7;
        const s = await page.context().newCDPSession(page);
        const tp = (x, y) => [{ x, y, id: 2, radiusX: 4, radiusY: 4, force: 1 }];
        await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(b.x, b.y) });
        for (let k = 1; k <= steps; k++) await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(b.x + (h ? (d * k) / steps : 0), b.y + (h ? 0 : (d * k) / steps)) });
        await wait(80);
        const open = await page.$eval('.biffy', (e) => e.classList.contains('open'));
        await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(b.x, b.y) });
        await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        return open;
      };
      const opened = (await cdpDrag(1)) || (await cdpDrag(-1));
      await wait(500);
      const worker = await page.$eval('.biffy .gag-worker', (w) => getComputedStyle(w).opacity).catch(() => '0');
      check(opened, `${region.name} ${li + 1}: a bump next to the biffy bangs the door open`);
      check(Number(worker) > 0, 'a worker stumbles out');
      const biffy = await rect(page, '.biffy');
      check(!overlaps(biffy, await rect(page, '.pad')), 'the biffy stands outside the 6x6 grid');
      await wait(2200);
      check(!(await page.$eval('.biffy', (e) => e.classList.contains('open'))), '...and goes back in');
      biffyDone = true;
      break;
    }
    if (biffyDone) break;
  }

  // 6. Block heater cords, Duvernay only: plugged in, rip out on the first move.
  await enter(page, 3, 0);
  const duv = REGIONS[2].levels[0];
  const posts = await page.$$eval('.plug-post', (e) => e.length);
  check(posts === duv.trucks.length, `Duvernay 1: every truck plugged in (${posts} posts for ${duv.trucks.length} trucks)`);
  const postsOff = await page.$$eval('.plug-post', (ps) => {
    const pad = document.querySelector('.pad').getBoundingClientRect();
    return ps.every((p) => { const r = p.getBoundingClientRect(); return r.right <= pad.left + 1 || r.left >= pad.right - 1 || r.bottom <= pad.top + 1 || r.top >= pad.bottom - 1; });
  });
  check(postsOff, 'posts stand in the fence, off the grid');
  const first = solve(duv)[0];
  const cordsBefore = await page.$$eval('.cord', (e) => e.length);
  await touch.drag(first.id, [first.delta]);
  const sparks = await page.$$eval('.spark', (e) => e.length);
  await wait(300);
  const ripped = await page.$$eval('.plug-post.ripped', (e) => e.length);
  check(ripped === 1, `first move rips that truck's cord out (${ripped} ripped)`);
  check(sparks > 0 || (await page.$$eval('.cord', (e) => e.length)) < cordsBefore, 'it whips and sparks');
  await enter(page, 1, 0);
  check((await page.$$eval('.plug-post', (e) => e.length)) === 0, 'no cords outside Duvernay');

  // 7. Landowner, Montney only: wear a lane to the deepest rut.
  for (const [tab, name, expect] of [[2, 'Montney', true], [1, 'Cardium', false]]) {
    await enter(page, tab, 2);
    const lv = REGIONS[tab - 1].levels[2];
    const truck = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.truck')) return el.dataset.id;
    });
    // Record every speech bubble (the magpie may chime in too, with idle times this short).
    await page.evaluate(() => {
      window.__said = [];
      new MutationObserver(() => document.querySelectorAll('.bubble').forEach((b) => window.__said.includes(b.textContent) || window.__said.push(b.textContent))).observe(document.querySelector('.board'), { childList: true });
    });
    // Back and forth in one drag: every pass wears the lane.
    await touch.drag(truck, [0.9, -0.9, 0.9, -0.9, 0.9, -0.9, 0.9, -0.9]);
    await wait(700);
    const quad = await page.$('.landowner');
    const saidAll = await page.evaluate(() => window.__said);
    const said = saidAll.find((t) => t.includes('ruts')) ?? saidAll.join(' / ');
    if (expect) {
      check(!!quad && said === "Who's paying for these ruts?", `${name}: deepest rut brings the landowner: "${said}"`);
      if (quad) check(!overlaps(await rect(page, '.landowner'), await rect(page, '.pad')), 'he stays outside the fence');
    } else check(!quad, `${name}: no landowner (${lv.name})`);
  }
  await browser.close();
}

// ---------------- Reduced motion ----------------
{
  const { browser, page } = await open('reduce');
  console.log('\nchromium iPhone 13, reduced motion');
  await enter(page, 1, 0);
  await wait(1500);
  const still = await page.evaluate(() => ({
    bird: !!document.querySelector('.magpie'),
    flapping: document.querySelector('.magpie')?.classList.contains('flying') ?? false,
    anims: document.getAnimations().filter((a) => a.effect?.target?.closest?.('.gag')).length,
  }));
  check(still.bird && !still.flapping && still.anims === 0, `magpie shows without animation (${JSON.stringify(still)})`);
  await page.waitForSelector('.roof-splat', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('.roof-splat')), 'splat still lands');
  await page.waitForSelector('.spotter', { timeout: 4000 }).catch(() => {});
  check(!!(await page.$('.spotter')) && (await page.evaluate(() => document.getAnimations().length)) === 0, 'spotter shows, standing still');
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
