// Screenshots for judging gates and hints: one level per region at 390x844, showing the gates, hint
// step 1 (which truck) and hint step 2 (where it goes), plus one level whose hint is a move out
// through the gate. Saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check) as gates_<name>.png.
// Also checks what it shows. Run: npm run dev -- --host (in one terminal), then: npm run test:e2e:hints
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, nextMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
/** Whether a level's first hint is a move out through the gate. */
const firstExits = (level) => {
  const s = newGame(level);
  const m = nextMove(s);
  return getMoveRange(s, m.id)?.exitDelta === m.delta;
};
// In each region: the first level whose hint is a slide (not an exit) and has two gates side by side
// if any does; then one exit hint.
const pick = (region, exit) => region.levels.findIndex((l) => firstExits(l) === exit);
const SHOTS = [
  ...REGIONS.map((r, i) => [r.id, i, pick(r, false), false]),
  [`${REGIONS[0].id}_exit`, 0, pick(REGIONS[0], true), true],
];

const browser = await webkit.launch();
for (const reduced of [false, true]) {
  for (const [name, region, index, exits] of reduced ? SHOTS.slice(0, 1) : SHOTS) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('ERR', e.message));
    await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
    await page.evaluate((p) => {
      localStorage.clear();
      localStorage.setItem('rush-hour-rigs:v2', p);
    }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(region).click();
    await page.locator('.level-btn').nth(index).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(900);
    console.log(`\n${name} (level ${index + 1})${reduced ? ', reduced motion' : ''}`);
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}.png`) });

    const gates = await page.evaluate(() => {
      const gs = [...document.querySelectorAll('.gate')];
      const box = (g) => {
        const parts = [...g.querySelectorAll('.g-hinge, .g-latch, .g-leaf')].map((e) => e.getBoundingClientRect());
        return { side: g.dataset.side, i: Number(g.dataset.index), cell: g.getBoundingClientRect(), l: Math.min(...parts.map((r) => r.left)), r: Math.max(...parts.map((r) => r.right)), t: Math.min(...parts.map((r) => r.top)), b: Math.max(...parts.map((r) => r.bottom)), badge: g.querySelector('.g-badge').getBoundingClientRect().width, leaf: g.querySelector('.g-leaf img').src };
      };
      const bs = gs.map(box);
      // Every gate's own posts and leaf stay inside its own cell along the berm (so neighbours never join).
      const own = bs.every((b) => (b.side === 'top' || b.side === 'bottom' ? b.l >= b.cell.left - 0.5 && b.r <= b.cell.right + 0.5 : b.t >= b.cell.top - 0.5 && b.b <= b.cell.bottom + 0.5));
      const pairs = bs.flatMap((a) => bs.filter((b) => b.side === a.side && b.i === a.i + 1).map((b) => (a.side === 'top' || a.side === 'bottom' ? b.l - a.r : b.t - a.b)));
      return { n: gs.length, own, pairs, badge: bs[0].badge, colored: bs.every((b) => /gate-leaf-(red|blue|yellow|green|orange|purple)/.test(b.leaf)) };
    });
    check(gates.n > 0 && gates.colored, `${gates.n} gates, each leaf painted its gate colour`);
    check(gates.own, 'each gate has its own posts, inside its own stretch of berm');
    check(gates.pairs.every((gap) => gap >= 3), `neighbouring gates keep a gap of berm between them (${gates.pairs.map((g) => g.toFixed(0) + 'px').join(', ') || 'none side by side here'})`);
    check(gates.badge >= 18 && gates.badge <= 23, `badge readable but secondary (${gates.badge.toFixed(0)}px)`);

    await page.locator('[data-act="hint"]').click();
    await wait(700);
    const one = await page.evaluate(() => {
      const t = document.querySelector('.truck.hinted');
      if (!t) return null;
      const art = getComputedStyle(t.querySelector('.art'));
      return { rim: art.filter.includes('drop-shadow'), anim: getComputedStyle(t.querySelector('.body')).animationName, lift: getComputedStyle(t.querySelector('.body')).transform !== 'none', shadow: getComputedStyle(t.querySelector('.ground-shadow')).backgroundImage.includes('0.6') };
    });
    check(!!one && one.rim && one.shadow && one.lift, 'hint step 1: a bright rim in the truck colour, lifted, stronger ground shadow');
    check(reduced ? one?.anim === 'none' : one?.anim === 'hint-lift', reduced ? 'no pulse with reduced motion (static rim)' : 'slow pulse');
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}_hint1.png`) });

    await page.locator('[data-act="hint"]').click();
    await wait(700);
    const two = await page.evaluate(() => {
      const g = document.querySelector('.ghost');
      const out = document.querySelector('.gate.hint-out .out-badge');
      const hinted = document.querySelector('.truck.hinted');
      return {
        ghost: g ? { img: g.querySelector('img')?.src ?? '', opacity: Number(getComputedStyle(g.querySelector('.art')).opacity), dashed: getComputedStyle(g).outlineStyle, anim: getComputedStyle(g).animationName, kind: hinted.dataset.kind, color: [...hinted.classList].find((c) => c.startsWith('c-')).slice(2), loaded: g.querySelector('img')?.naturalWidth > 0 } : null,
        out: out ? { text: out.textContent, onGate: !!out.closest('.gate'), anim: getComputedStyle(out).animationName } : null,
      };
    });
    if (exits) check(!!two.out && two.out.text === 'OUT' && two.out.onGate && !two.ghost, 'hint step 2, a move out: the OUT badge is on the gate, no box on the pad');
    else {
      check(!!two.ghost && two.ghost.loaded && two.ghost.img.includes(`/${two.ghost.kind}-${two.ghost.color}`) && Math.abs(two.ghost.opacity - 0.35) < 0.01 && two.ghost.dashed === 'dashed' && !two.out, 'hint step 2: a ghost of the truck itself at 35%, dashed keyline in its colour');
      check(reduced ? two.ghost?.anim === 'none' : two.ghost?.anim === 'ghost-pulse', reduced ? 'no pulse with reduced motion' : 'slow pulse');
    }
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}_hint2.png`) });
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
