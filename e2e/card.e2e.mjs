// Win card test (Playwright, WebKit + Chromium): the level and Daily Pad win cards, perfect and
// over par, at 375x553, 375x667, 390x844 and 430x932.
//  - frame: a border image that grows with the content; no cream box drawn over it; every row sits
//    inside the cream with even margins; the buttons are inside, not on the frame's edge
//  - one centered column: every row has the same width and the same centre; the roughneck and the
//    hard hats are centered as one group
//  - the Zero Incident medal is whole, on screen and on top
//  - confetti: on a perfect solve only, behind the card, gone in about 1.5 s; none with reduced motion
// Saves screenshots (card_*) to OUT (default ~/Desktop/RHR Art Inbox/fit_check).
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:card
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';
import { getMoveRange, newGame, solve } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const SIZES = [[375, 553], [375, 667], [390, 844], [430, 932]];

/** The best solution, and the same with one truck going a cell and back first (two over par). */
function plans(level) {
  const perfect = solve(level);
  const state = newGame(level);
  const spare = state.trucks.map((t) => ({ t, r: getMoveRange(state, t.id) })).find(({ r }) => r && ((r.max > 0 && r.exitDelta !== 1) || (r.min < 0 && r.exitDelta !== -1)));
  const step = spare.r.max > 0 && spare.r.exitDelta !== 1 ? 1 : -1;
  return { perfect, over_par: [{ id: spare.t.id, delta: step }, { id: spare.t.id, delta: -step }, ...perfect] };
}
const LEVEL = REGIONS[0].levels[2];
const DAILY = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)];
const GAMES = { level: { level: LEVEL, open: (page) => page.locator('.level-btn').nth(2).click() }, daily: { level: DAILY, open: (page) => page.locator('.daily-btn').click() } };

async function fresh(page) {
  await page.goto(ROOT + '?cover=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(300);
}

async function play(page, level, moves) {
  const cell = await page.$eval('.board', (el) => parseFloat(el.style.getPropertyValue('--cell')));
  for (const m of moves) {
    const t = level.trucks.find((x) => x.id === m.id);
    await page.evaluate(
      ({ id, d, h }) =>
        new Promise(async (res) => {
          const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`);
          const r = el.getBoundingClientRect();
          let x = r.x + r.width / 2;
          let y = r.y + r.height / 2;
          const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
          ev('pointerdown');
          for (let k = 1; k <= 8; k++) {
            if (h) x += d / 8;
            else y += d / 8;
            ev('pointermove');
            await new Promise((r) => requestAnimationFrame(r));
          }
          ev('pointerup');
          res();
        }),
      { id: m.id, d: m.delta * cell, h: t.orient === 'h' },
    );
    await wait(350);
  }
  await page.waitForSelector('.win:not([hidden]) .card');
}

const measure = (page) =>
  page.evaluate(() => {
    const o = document.querySelector('.win');
    const c = o.querySelector('.card');
    const card = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    const edge = { l: parseFloat(cs.borderLeftWidth), r: parseFloat(cs.borderRightWidth), t: parseFloat(cs.borderTopWidth), b: parseFloat(cs.borderBottomWidth) };
    const rows = [...c.children].filter((e) => !e.matches('h2, .zero-incident') && e.getBoundingClientRect().height > 0).map((e) => ({ name: e.className.split(' ')[0] || e.tagName, r: e.getBoundingClientRect() }));
    const cx = card.left + card.width / 2;
    const widths = rows.map((x) => x.r.width);
    // The roughneck (the part of his frame he fills) and the hats, as one group.
    const m = c.querySelector('.mascot').getBoundingClientRect();
    const hats = [...c.querySelectorAll('.hats.big img')].map((e) => e.getBoundingClientRect());
    const group = { left: Math.min(m.left + m.width * 0.17, ...hats.map((h) => h.left)), right: Math.max(m.left + m.width * 0.83, ...hats.map((h) => h.right)) };
    const medal = c.querySelector('.zero-incident')?.getBoundingClientRect();
    const top = medal ? document.elementFromPoint(medal.left + medal.width / 2, medal.top + medal.height / 2) : null;
    const last = rows.at(-1).r;
    const conf = o.querySelector('.confetti');
    return {
      frame: cs.borderImageSource.includes('frame_win') && /fill/.test(cs.borderImageSlice) && (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent') && cs.backgroundImage === 'none',
      inside: rows.filter((x) => x.r.left < card.left + edge.l - 0.5 || x.r.right > card.right - edge.r + 0.5 || x.r.top < card.top + edge.t - 0.5 || x.r.bottom > card.bottom - edge.b + 0.5).map((x) => x.name),
      sameWidth: Math.max(...widths) - Math.min(...widths),
      offCentre: Math.max(...rows.map((x) => Math.abs(x.r.left + x.r.width / 2 - cx))),
      rowCount: rows.length,
      side: rows[0].r.left - card.left,
      sideR: card.right - rows[0].r.right,
      bottom: card.bottom - last.bottom,
      groupOff: (group.left + group.right) / 2 - cx,
      medal: medal ? { whole: medal.left >= 0 && medal.top >= 0 && medal.right <= innerWidth && medal.bottom <= innerHeight, onTop: !!top?.closest('.zero-incident') } : null,
      fits: card.top >= 0 && card.bottom <= innerHeight && card.left >= 0 && card.right <= innerWidth && o.scrollHeight <= o.clientHeight + 1,
      confetti: conf ? { pieces: conf.children.length, hats: conf.querySelectorAll('.hat').length, under: Number(getComputedStyle(conf).zIndex) < Number(cs.zIndex), before: conf.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING, noTouch: getComputedStyle(conf).pointerEvents === 'none' } : null,
      hasShare: !!c.querySelector('.share'),
      hasSign: !!c.querySelector('.safety-sign'),
    };
  });

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();
  for (const [w, h] of SIZES) {
    for (const [game, { level, open }] of Object.entries(GAMES)) {
      for (const [kind, moves] of Object.entries(plans(level))) {
        const size = `${w}x${h}`;
        const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true });
        const page = await context.newPage();
        await fresh(page);
        await open(page);
        await page.waitForSelector('.board .truck');
        await wait(400);
        await play(page, level, moves);
        await wait(350);
        const early = await measure(page);
        if (engine === 'webkit' && kind === 'perfect' && size === '390x844') {
          await wait(350); // mid-fall
          await page.screenshot({ path: join(OUT, `card_confetti_${game}_${size}.png`) });
        }
        await wait(2100);
        const m = await measure(page);
        console.log(`\n${engine} ${size} ${game} win card (${kind})`);
        check(m.frame, 'the frame is a border image that grows with the card; no cream box drawn over it');
        check(m.inside.length === 0, `every row sits inside the frame's cream (${m.inside.join(', ') || 'clear'})`);
        check(m.sameWidth < 1 && m.offCentre < 1, `one centered column: ${m.rowCount} rows, same width (${m.sameWidth.toFixed(1)}px apart), same centre (${m.offCentre.toFixed(1)}px off)`);
        check(Math.abs(m.side - m.sideR) < 1 && Math.abs(m.side - m.bottom) <= 8, `even margins: ${m.side.toFixed(0)}px left, ${m.sideR.toFixed(0)}px right, ${m.bottom.toFixed(0)}px under the buttons`);
        check(Math.abs(m.groupOff) <= 4, `the roughneck and the hard hats are centered as one group (${m.groupOff.toFixed(1)}px off)`);
        if (kind === 'perfect') check(!!m.medal && m.medal.whole && m.medal.onTop, 'the Zero Incident medal is whole, on screen and drawn on top');
        if (kind === 'perfect') {
          // The ribbon reads ZERO INCIDENT in full: the lettering is no wider than its field, with
          // about 4px to spare each side, and centred.
          const rib = await page.evaluate(() => {
            const span = document.querySelector('.win .zero-incident span');
            const range = document.createRange();
            range.selectNodeContents(span);
            const cs = getComputedStyle(span);
            const text = range.getBoundingClientRect().width;
            return { text: span.textContent, wide: Number((text / Math.cos((4 * Math.PI) / 180)).toFixed(2)), field: span.clientWidth, pad: parseFloat(cs.paddingLeft), size: parseFloat(cs.fontSize), scroll: span.scrollWidth };
          });
          check(rib.text === 'ZERO INCIDENT' && rib.wide <= rib.field - rib.pad * 2 + 0.6 && rib.pad >= 4 && rib.scroll <= rib.field, `the ribbon reads ZERO INCIDENT in full: lettering ${rib.wide}px in a ${rib.field}px field with ${rib.pad}px each side (${rib.size}px type)`);
        }
        else check(m.medal === null, 'no medal when over par');
        if (game === 'daily') check(m.hasSign && m.hasShare, 'Daily Pad: streak sign and Share are rows of the same column');
        check(m.fits, 'fits the screen with no scrolling');
        if (kind === 'perfect') {
          check(!!early.confetti && early.confetti.pieces >= 30 && early.confetti.hats >= 6 && early.confetti.under && !!early.confetti.before && early.confetti.noTouch, `perfect solve: confetti (${early.confetti?.pieces} pieces, ${early.confetti?.hats} hard hats) falls behind the card`);
          check(m.confetti === null, 'and is gone within about 1.5 s');
        } else check(early.confetti === null, 'over par: no confetti');
        // Judged by the pixels of a screenshot (tools/card-check.py), with WebKit (Safari's engine)
        // as the judge: the banner's letters are centred on the visible blue ribbon (equal gap above
        // their tops and below their baseline), and the frame is as thick at the bottom as at the sides.
        const shot = join(OUT, `card_${game}_${kind}_${size}.png`);
        await page.screenshot({ path: shot });
        const box = await page.evaluate(() => {
          const c = document.querySelector('.win .card');
          const r = c.getBoundingClientRect();
          return { l: r.left, t: r.top, w: r.width, h: r.height, f: parseFloat(getComputedStyle(c).borderTopWidth) / 262, curved: !!c.querySelector('h2 textPath'), cap: getComputedStyle(c.querySelector('h2')).getPropertyValue('--cap') };
        });
        const px = JSON.parse(execFileSync('python3', ['tools/card-check.py', shot, '3', box.l, box.t, box.w, box.h, box.f].map(String), { encoding: 'utf8' }));
        check(Math.abs(px.gapTop - px.gapBottom) <= 2 && box.curved, `"Pad cleared!" is centred in the ribbon: ${px.gapTop.toFixed(1)}px of blue above the letters, ${px.gapBottom.toFixed(1)}px below (capitals ${box.cap.trim()})`);
        check(Math.abs(px.bottom - px.side) <= 2 && Math.abs(px.side - px.sideRight) <= 2, `the frame's bottom matches its sides: ${px.side.toFixed(1)}px left, ${px.sideRight.toFixed(1)}px right, ${px.bottom.toFixed(1)}px bottom`);
        if (engine === 'webkit' && size !== '375x553') {
          await page.screenshot({ path: join(OUT, `safari_${game}_${kind}_${size}.png`) });
          await page.screenshot({ path: join(OUT, `safari_banner_${game}_${kind}_${size}.png`), clip: { x: box.l - 6, y: box.t - 8, width: box.w + 12, height: 262 * box.f + 30 } });
        }
        await context.close();
      }
    }
  }
  // Reduced motion: no confetti at all.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await fresh(page);
    await GAMES.level.open(page);
    await page.waitForSelector('.board .truck');
    await wait(400);
    await play(page, LEVEL, plans(LEVEL).perfect);
    await wait(300);
    console.log(`\n${engine} reduced motion`);
    check((await measure(page)).confetti === null, 'no confetti');
    await context.close();
  }
  // The Daily Pad button once it's cleared today: no box behind it.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await fresh(page);
    const bg = await page.evaluate(() => {
      const b = document.querySelector('.daily-btn');
      b.classList.add('done');
      const cs = getComputedStyle(b);
      return [cs.backgroundColor, ...[...document.querySelectorAll('.daily-title, .daily-sub')].map((e) => getComputedStyle(e).backgroundColor)];
    });
    console.log(`\n${engine} Daily Pad button, cleared today`);
    check(bg.every((c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent'), `no colored box behind the "Daily Pad #N" label (${bg[0]})`);
    await context.close();
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
