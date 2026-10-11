// DUG THROUGH'S RECORDS (job U15), in WebKit at iPhone DPR 3, at Safari's visible sizes 390 x 664 and 375 x 635.
//  EVERY DIG FROM THE GRASS TO THE ISLAND COUNTS, and a better time or fewer swipes replaces its record AT ONCE:
//    several digs in a row in one visit (the first, a slower one, a faster one, one with fewer swipes), each started
//    from the grass WITHOUT being at the page's exact top (a few px short: where the old stopwatch never came back);
//    part way back up and down again is no dig and changes nothing; after leaving the log and coming back; after a reload.
//  TWO RECORDS, NAMED PLAINLY: "Best time 0:12.4" and "Fewest swipes 3", each on its own line, on the arrival card
//    and on Dug Through's own card in the log (which shows a new record at once).
//  A RECORD BEATEN IS UNMISTAKABLE: "NEW RECORD!" big on the card, the new figure with the old beside it ("was ..."),
//    confetti, a toast, and the ta-da with sound on.
//  `?demo=1` saves nothing.
// Needs the dev server (URL=, default the dev build on 5181). `VIEW=390x664`.
import { webkit } from 'playwright';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const SIZES = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[390, 664], [375, 635]];
const OUT = outDir('dig-records');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const clock = (ms) => { const t = Math.max(0, Math.floor(ms / 100)); return `${Math.floor(t / 600)}:${String(Math.floor(t / 10) % 60).padStart(2, '0')}.${t % 10}`; };
const browser = await webkit.launch();

for (const [W, H] of SIZES) {
  console.log(`\nwebkit ${W} x ${H}: Dug Through's records`);
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
  // (Sound effects on, so the ta-da can be listened for; the first click lets sound out.)
  await context.addInitScript(() => { if (!localStorage.getItem('rush-hour-rigs-audio')) localStorage.setItem('rush-hour-rigs-audio', JSON.stringify({ sfx: true, music: false, style: 'country' })); });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const openLog = async (query = '') => { await page.goto(`${ROOT}?cover=0&audiolog${query}`, { waitUntil: 'networkidle' }); await page.locator('.binoculars').click(); await page.waitForSelector('.dig-bg svg.strata'); await page.evaluate(() => document.fonts.ready); await wait(400); };
  const at = (y) => page.evaluate(async (y) => { const s = document.querySelector('.screen.log'); s.scrollTop = y === 'end' ? s.scrollHeight : y; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const c = document.querySelector('.dig-clock'); return { top: s.scrollTop, max: s.scrollHeight - s.clientHeight, km: +document.querySelector('.dig-col').dataset.km, clock: c.hidden ? null : c.textContent, final: c.classList.contains('final'), arrival: !document.querySelector('.dig-arrival').hidden }; }, y);
  const swipe = () => page.evaluate(() => document.querySelector('.screen.log').dispatchEvent(new Event('touchstart', { bubbles: true })));
  /** Back to the grass, but NOT the page's exact top: a few px short of it, the wellhead and the grass on the screen. */
  const grass = async (y = 9) => { const g = await at(y); await wait(120); return g; };
  /** A dig from the grass to the island: `swipes` real swipes, about `ms` on the stopwatch. */
  const dig = async (swipes, ms) => { for (let k = 1; k <= swipes; k++) { await swipe(); await at(280 + k * 520); } await wait(ms); const end = await at('end'); await wait(450); return end; };
  const card = () => page.evaluate(() => {
    const a = document.querySelector('.dig-arrival'), r = a.getBoundingClientRect(), key = Object.keys(localStorage).includes('rush-hour-rigs:log') ? JSON.parse(localStorage.getItem('rush-hour-rigs:log')) : {};
    const title = a.querySelector('b');
    return { shown: !a.hidden, record: a.classList.contains('record'), title: title?.textContent, titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : 0, note: a.querySelector('.note')?.textContent ?? null, run: a.querySelector('.run')?.textContent,
      recs: [...a.querySelectorAll('.rec')].map((x) => ({ text: x.querySelector('em').textContent, was: x.querySelector('i')?.textContent ?? null, beaten: x.classList.contains('beaten'), top: Math.round(x.getBoundingClientRect().top) })),
      inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, dug: key.dug, swipes: key.dugSwipes, found: key.found ?? [],
      toasts: [...document.querySelectorAll('.toast')].map((t) => t.innerText.replace(/\s*\n\s*/g, ' | ')), confetti: document.querySelectorAll('.confetti.over-page > *').length,
      sounds: (window.__rhrAudio?.log ?? []).filter((n) => !n.startsWith('loaded:') && n !== 'unlock'), mine: document.querySelector('.log-card[data-id="dug"] p')?.textContent ?? null };
  });
  const hush = () => page.evaluate(() => { if (window.__rhrAudio) window.__rhrAudio.log.length = 0; document.querySelectorAll('.confetti.over-page').forEach((e) => e.remove()); });
  const lines = (c) => c.recs.map((r) => r.text + (r.was ? ` (${r.was})` : '')).join(' / ');

  await openLog();
  await page.mouse.click(W / 2, 30); // (a touch: sound may start)
  await wait(1800);
  const top = await at(0), near = await grass();
  check(top.km === 0 && near.km === 0 && near.top > 0 && near.clock === null, `a few px short of the page's top (${near.top} px) the gauge still reads 0 km: that is "at the grass"`);

  // 1. The first dig: the new sighting, and both records set.
  const e1 = await dig(4, 1300); const c1 = await card();
  check(e1.final && c1.shown && c1.inView && c1.title === 'New sighting!' && c1.note === 'Dug Through added to your Wildlife Log.' && c1.run === `This dig: 4 swipes in ${e1.clock}` && lines(c1) === `Best time ${clock(c1.dug)} / Fewest swipes 4` && c1.recs[1].top > c1.recs[0].top && c1.swipes === 4 && c1.found.includes('dug'), `the first dig: "${c1.title}", "${c1.run}", then the two records each on its own line: ${lines(c1)}`);
  const first = c1.dug;
  // 2. Back at the grass (not the exact top), a SLOWER dig with more swipes: it counts, and the records stand.
  const g2 = await grass(); await hush();
  const e2 = await dig(6, 2600); const c2 = await card();
  check(g2.clock === null && !g2.arrival && e2.final && e2.clock !== e1.clock && c2.title === 'Dug Through!' && !c2.record && c2.run === `This dig: 6 swipes in ${e2.clock}` && lines(c2) === `Best time ${clock(first)} / Fewest swipes 4` && c2.dug === first && c2.swipes === 4 && c2.confetti === 0 && !c2.sounds.includes('tada') && !c2.toasts.some((t) => /record/i.test(t)), `a slower dig from the grass counts and is shown ("${c2.run}"); the records stand: ${lines(c2)}; no fanfare`);
  // 3. Part way back up and down again: no dig, nothing changes.
  await at(e2.max * 0.5); await wait(200); await swipe(); const e3 = await at('end'); await wait(400); const c3 = await card();
  check(c3.run === c2.run && c3.dug === first && c3.swipes === 4 && e3.clock === e2.clock, 'part way back up and down again is no dig: the card and the records are as they were');
  // 4. From the grass, a FASTER dig with MORE swipes: the time's record falls at once; the swipes' stands.
  await grass(); await hush();
  const e4 = await dig(5, 250); const c4 = await card();
  check(c4.title === 'NEW RECORD!' && c4.record && c4.titlePx >= 28 && c4.inView && c4.run === `This dig: 5 swipes in ${e4.clock}` && c4.dug < first && c4.swipes === 4 && lines(c4) === `Best time ${clock(c4.dug)} (was ${clock(first)}) / Fewest swipes 4` && c4.recs[0].beaten && !c4.recs[1].beaten, `a faster dig: "${c4.title}" (${c4.titlePx} px), ${lines(c4)}; saved at once (${Math.round(c4.dug)} ms, was ${Math.round(first)})`);
  check(c4.confetti > 20 && c4.toasts.some((t) => t.startsWith('New record!') && t.includes(`Best time ${clock(c4.dug)} (was ${clock(first)})`)) && c4.sounds.includes('tada'), `and it is unmistakable: confetti (${c4.confetti}), a toast ("${c4.toasts.find((t) => /record/i.test(t))}"), the ta-da (${c4.sounds.join(', ')})`);
  await page.screenshot({ path: `${OUT}/new_record_time_${W}x${H}.png` });
  const fast = c4.dug;
  // 5. From the grass, FEWER swipes but slower: the swipes' record falls; the time's stands.
  await grass(); await wait(3400); await hush();
  const e5 = await dig(2, 1500); const c5 = await card();
  check(c5.title === 'NEW RECORD!' && c5.dug === fast && c5.swipes === 2 && lines(c5) === `Best time ${clock(fast)} / Fewest swipes 2 (was 4)` && !c5.recs[0].beaten && c5.recs[1].beaten && c5.run === `This dig: 2 swipes in ${e5.clock}` && c5.toasts.some((t) => t.includes('Fewest swipes 2 (was 4)')) && c5.sounds.includes('tada'), `fewer swipes, slower: "${c5.title}", ${lines(c5)}; the time's record stands`);
  await page.screenshot({ path: `${OUT}/new_record_swipes_${W}x${H}.png` });
  // 6. Leave the log and come back: Dug Through's own card has the two records, a line each; a quicker dig changes it AT ONCE.
  await page.locator('.log-head .back').click();
  await page.locator('.binoculars').click();
  await page.waitForSelector('.dig-bg svg.strata');
  await wait(500);
  const mine = await page.evaluate(() => { const p = document.querySelector('.log-card[data-id="dug"] p'); const g = document.createRange(); g.selectNodeContents(p); return { text: p.textContent, rows: new Set([...g.getClientRects()].map((r) => Math.round(r.top))).size, fits: p.scrollWidth <= p.clientWidth + 1 }; });
  check(mine.text === `Best time ${clock(fast)}\nFewest swipes 2` && mine.rows === 2 && mine.fits, `left and come back: Dug Through's card reads "${mine.text.replace('\n', '" / "')}", a line each`);
  await grass(); await wait(3400); await hush();
  await dig(3, 60); const c6 = await card();
  check(c6.title === 'NEW RECORD!' && c6.dug < fast && c6.swipes === 2 && lines(c6) === `Best time ${clock(c6.dug)} (was ${clock(fast)}) / Fewest swipes 2` && c6.mine === `Best time ${clock(c6.dug)}\nFewest swipes 2`, `a quicker dig after coming back: ${lines(c6)}; and its card up in the log already reads "${c6.mine?.replace('\n', '" / "')}"`);
  const best = c6.dug;
  // 7. A reload: the saved records are the same, and a slower dig leaves them alone.
  await openLog();
  const after = await page.evaluate(() => ({ log: JSON.parse(localStorage.getItem('rush-hour-rigs:log')), mine: document.querySelector('.log-card[data-id="dug"] p').textContent, count: document.querySelector('.log-count').textContent }));
  check(after.log.dug === best && after.log.dugSwipes === 2 && after.mine === `Best time ${clock(best)}\nFewest swipes 2` && after.count === `1/${LOG_ENTRIES.length}`, `after a reload: saved ${Math.round(after.log.dug)} ms and ${after.log.dugSwipes} swipes, the card the same, the log ${after.count}`);
  await grass(); await hush();
  const e7 = await dig(3, 900); const c7 = await card();
  check(c7.title === 'Dug Through!' && c7.dug === best && c7.swipes === 2 && lines(c7) === `Best time ${clock(best)} / Fewest swipes 2` && c7.run === `This dig: 3 swipes in ${e7.clock}`, `and a slower dig then: "${c7.run}", the records stand (${lines(c7)})`);
  check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
  await context.close();

  // 8. ?demo=1 saves nothing.
  const c2x = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
  const p2 = await c2x.newPage();
  await p2.goto(`${ROOT}?demo=1&cover=0`, { waitUntil: 'networkidle' });
  await p2.locator('.binoculars').click(); await p2.waitForSelector('.dig-bg svg.strata'); await wait(400);
  const run = async (ms) => { await p2.evaluate(async () => { const s = document.querySelector('.screen.log'); s.scrollTop = 9; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); s.dispatchEvent(new Event('touchstart', { bubbles: true })); s.scrollTop = 800; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }); await wait(ms); await p2.evaluate(async () => { const s = document.querySelector('.screen.log'); s.scrollTop = s.scrollHeight; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }); await wait(400); return p2.evaluate(() => { const a = document.querySelector('.dig-arrival'); return { title: a.querySelector('b').textContent, recs: [...a.querySelectorAll('.rec')].map((x) => x.innerText.replace(/\s+/g, ' ')) }; }); };
  const d1 = await run(900), d2 = await run(200);
  await p2.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  const kept = await p2.evaluate(() => Object.keys(localStorage).filter((k) => k !== 'rush-hour-rigs:region'));
  check(d1.recs.length === 2 && d2.title === 'NEW RECORD!' && /was/.test(d2.recs[0]) && kept.length === 0, `?demo=1: the records work for the visit ("${d2.title}", ${d2.recs.join(' / ')}) and nothing is saved (${kept.join(', ') || 'no keys'})`);
  await c2x.close();
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
