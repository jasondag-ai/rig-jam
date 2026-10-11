// NOTHING OF A SIGHTING IS CUT OFF BY THE LEASE (job U16). The strip's layers lie UNDER the board, so anything a strip
// gag draws above the strip's top edge (the foot of the bottom berm) is hidden there and shows cut off flat: the
// beaver's upright pipe was, by 35 units. Every strip gag the game can hold (`?gagtest=1`, `window.__rhrGag`) is
// stepped through its whole run, every 0.1 s, on every region's standard scene, and every drawn piece of it measured:
//   TOP: no piece under the lease (above the board's bottom edge, where the board is over it), by more than 1.5 px.
//   FOOT: no piece under the buttons.
// Layers that lie OVER the lease on purpose (`.over-lease`: the marshmallow's stick, the Personal Cloud) are not in it,
// nor are the five sightings that are not strip gags (the magpie, the sleepy worker, the moose, who rises from behind
// the top berm on purpose, the geese and the aurora), Night Shift and Dug Through.
// WebKit; `VIEW=390x844` (the default; `390x664` and `375x635` are Safari's visible sizes), `ONLY=beaver`, `REGION=3`.
// Needs the dev server (URL=, default the dev build on 5181).
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const [W, H] = (process.env.VIEW ?? '390x844').split('x').map(Number);
const TOL = Number(process.env.TOL ?? 1.5);
// ON SAFARI'S SHORT SCREENS (its toolbars showing: 390 x 664, 375 x 635) the strip is about 84 px and nine sightings
// send something small up past its top edge for a moment: a thing that flies, floats or is shouted, not a prop cut
// off flat. They are KNOWN AND LISTED FOR JAY (job U16: lowering them would change the drawings of the jokes, so
// nothing was moved without his word), and held here to what they are today, in px under the lease: none may get
// worse, and no other sighting may join them. At 390 x 844 nothing at all goes under the lease.
const KNOWN_SHORT = {
  landowner: [6, 'his hat, blown off, at the top of its flight'],
  gopherLunch: [7, 'a small white piece by the worker\'s head, late in the gag'],
  tourists: [4, 'the top of the sound word BZZZZ'],
  bull: [11, 'his hearts, floating up and away'],
  tongue: [7, 'a thin line above the pipe, near the end (steam or a motion line)'],
  bear: [5, 'the top of the bear (an ear) as he sits up'],
  cold: [6, 'the ball at the top of its flight'],
  wash: [5, 'the top of the sound word SPLOOSH'],
  ice: [19, 'Moe as he jumps up on the ice pan (he stands on the pond, at the back of the strip)'],
};
const SHORT = H < 700;
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`${ROOT}?cover=0&gagtest=1&night=0`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: [], demo: true, standDowns: [] })));
await page.reload({ waitUntil: 'networkidle' });
console.log(`webkit ${W} x ${H}: no strip gag is cut off by the lease above it or the buttons below`);
const held = new Map();
for (let r = 0; r < REGIONS.length; r++) {
  if (process.env.REGION && process.env.REGION !== String(r) && process.env.REGION !== REGIONS[r].id) continue;
  // (Two levels a region: the third, as the depth suite uses, and the first with a flare stack, for the marshmallow.)
  const flare = REGIONS[r].levels.findIndex((l) => (l.obstacles ?? []).some((o) => o.kind === 'flare'));
  for (const li of [...new Set([2, flare].filter((x) => x >= 0))]) {
    await page.waitForSelector('.screen.levels .region-tab');
    await page.locator('.region-tab').nth(r).click();
    await page.locator('.level-btn').nth(li).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await page.waitForTimeout(500);
    const out = await page.evaluate(async ([only, TOL, skip]) => {
      const g = window.__rhrGag, strip = document.querySelector('.depth-strip');
      const board = document.querySelector('.board').getBoundingClientRect(), ctl = document.querySelector('.controls').getBoundingClientRect();
      const res = [];
      for (const id of g.names()) {
        if ((only && only.toLowerCase() !== id.toLowerCase()) || skip.includes(id)) continue;
        if (!g.hold(id, 0)) continue;
        const end = g.end(id);
        const units = () => [...strip.children].filter((u) => u.dataset.gag === id && !u.classList.contains('over-lease'));
        if (!units().length) { g.release(id); continue; }
        let top = { px: 0 }, foot = { px: 0 };
        for (let t = 0; t <= end + 1e-6; t += 0.1) {
          g.hold(id, t);
          await new Promise((q) => requestAnimationFrame(q));
          for (const u of units()) for (const el of u.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline, text, image')) {
            // (A piece inside a clip of the gag's own is cut on purpose, at a hole's rim, the water's surface, a truck's window, the strip's floor
            // for Fresh Wash's mud wave: its box says nothing of what shows, and it is left out.)
            if (el.closest('defs, clipPath, mask, [clip-path]') || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) continue;
            const q = el.getBoundingClientRect();
            if (q.width < 0.5 && q.height < 0.5) continue;
            // Under the lease: above its bottom edge, where the board is over it.
            const over = Math.min(q.right, board.right) - Math.max(q.left, board.left);
            if (over > 2 && q.top < board.bottom && q.bottom > board.top) { const px = Math.min(q.bottom, board.bottom) - q.top; if (px > top.px) top = { px, t, what: el.tagName + (el.getAttribute('fill') ? ' ' + el.getAttribute('fill') : ''), layer: u.className.replace(/scene-layer|puppet-layer|strip-layer|scene-gag/g, '').trim() }; }
            if (q.bottom > ctl.top && q.right > ctl.left && q.left < ctl.right) { const px = q.bottom - Math.max(q.top, ctl.top); if (px > foot.px) foot = { px, t, what: el.tagName }; }
          }
        }
        g.release(id);
        res.push({ id, end, top, foot });
      }
      return res;
    }, [process.env.ONLY ?? '', TOL, []]);
    for (const x of out) x.bad = x.foot.px > TOL || x.top.px > (SHORT && KNOWN_SHORT[x.id] ? KNOWN_SHORT[x.id][0] : TOL);
    for (const x of out) { const was = held.get(x.id); if (!was || x.top.px > was.top.px || x.foot.px > was.foot.px) held.set(x.id, { ...x, where: `${REGIONS[r].name} ${li + 1}` }); }
    await page.locator('.hud [data-act="levels"]').click();
  }
}
await browser.close();
const all = [...held.values()];
for (const x of all.filter((x) => x.bad)) check(false, `${x.id} (${x.where}): ${x.top.px > TOL ? `${x.top.px.toFixed(1)} px of it is under the lease at ${x.top.t.toFixed(1)} s (${x.top.what}; layer ${x.top.layer})` : ''}${x.foot.px > TOL ? ` ${x.foot.px.toFixed(1)} px of it is under the buttons at ${x.foot.t.toFixed(1)} s (${x.foot.what})` : ''}`);
const clean = all.filter((x) => !x.bad);
check(all.length >= (process.env.ONLY || process.env.REGION ? 1 : 30), `${all.length} strip gags held through their whole runs: ${all.map((x) => x.id).join(', ')}`);
const known = SHORT ? all.filter((x) => KNOWN_SHORT[x.id] && x.top.px > TOL) : [];
check(clean.length === all.length, `${clean.length - known.length} of them keep every piece inside the strip${known.length ? `; ${known.length} known ones on this short screen are no worse than they were` : ''}`);
for (const x of known) console.log(`        known: ${x.id}, ${x.top.px.toFixed(1)} px for a moment at ${x.top.t.toFixed(1)} s: ${KNOWN_SHORT[x.id][1]}`);
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
