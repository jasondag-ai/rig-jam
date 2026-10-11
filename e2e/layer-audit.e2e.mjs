// THE LAYER AUDIT (job U17): nothing in the game hides or cuts off what the player should be watching, unless it was
// meant to. See e2e/layer-audit/*.mjs for how each part looks. `ENGINE=chromium|webkit`, `VIEW=390x844`, `PART=gags`,
// `ONLY=<gag>`, `REPORT=1` (writes qc/layer_audit.md and its stills). Needs the dev server (URL=, default 5181).
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PREVIEWS } from '../src/ui/gag-triggers.ts';
import { installAudit } from './layer-audit/core.mjs';
import { judge } from './layer-audit/allow.mjs';
import { auditGags } from './layer-audit/gags.mjs';
import { WATCHED, auditBoard, auditDig, auditFinale, auditOut, auditPreviews } from './layer-audit/play.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const VIEWS = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[390, 844], [375, 667], [1440, 900]];
const ENGINES = [['chromium', chromium], ['webkit', webkit]].filter(([n]) => !process.env.ENGINE || process.env.ENGINE === n);
const OUT = resolve('qc-out/layer-audit');
mkdirSync(OUT, { recursive: true });
const all = [];
let failures = 0, lines = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
for (const [engine, type] of ENGINES) {
  const browser = await type.launch();
  for (const [W, H] of VIEWS) {
    const phone = W < 700;
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: phone });
    await context.addInitScript(installAudit);
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('ERR', e.message));
    await page.goto(`${ROOT}?cover=0&gagtest=1&night=0`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: [], demo: true, standDowns: [] })));
    await page.reload({ waitUntil: 'networkidle' });
    let n = 0;
    const shot = async (name, box) => { const pad = 46, x = Math.max(0, Math.floor(box.l - pad)), y = Math.max(0, Math.floor(box.t - pad)), w = Math.min(W - x, Math.ceil(box.w + 2 * pad)), h = Math.min(H - y, Math.ceil(box.h + 2 * pad)); const file = join(OUT, `${engine}_${W}x${H}_${String(n++).padStart(3, '0')}_${name}.png`); if (w > 4 && h > 4) await page.screenshot({ path: file, clip: { x, y, width: w, height: h } }); return file; };
    const PART = process.env.PART ?? '';
    let flags = [], held = [];
    if (!PART || PART === 'gags') ({ flags, held } = await auditGags(page, shot, process.env.ONLY ?? ''));
    if (!PART || PART === 'previews') await auditPreviews(page, ROOT, shot, flags, Object.keys(PREVIEWS), process.env.ONLY ?? '');
    for (const [part, run] of [['board', auditBoard], ['out', auditOut], ['finale', auditFinale], ['dig', auditDig]]) if (!PART || PART === part) await run(page, ROOT, shot, flags);
    console.log(`${engine} ${W} x ${H}: ${held.length} sightings held, ${flags.length} flags`);
    // (A scenario that watched nothing has tested nothing.)
    const empty = [...WATCHED].filter(([sc, set]) => set.size === 0 && !/its line|drives out|the confetti|a find's bubble/.test(sc)).map(([sc]) => sc);
    const spoke = [...WATCHED].filter(([sc, set]) => /its line/.test(sc) && set.has('speech bubble')).length;
    lines += spoke;
    if (!PART) {
      check(held.length >= 30, `${held.length} strip sightings stepped through their runs`);
      check(spoke >= 12, `${spoke} sightings' own speech bubbles watched as they were said`);
      check(empty.length === 0, `every other scenario had something to watch${empty.length ? ' BUT: ' + empty.join('; ') : ''} (${WATCHED.size} scenarios)`);
    }
    WATCHED.clear();
    for (const f of flags) { const j = judge(f); if (j.call === 'BUG') failures++; all.push({ engine, view: `${W}x${H}`, ...f }); console.log(`   ${j.call === 'BUG' ? 'FAIL BUG ' : 'ok  meant'}`); console.log(`   ${f.scenario} (${f.where}) ${f.focal}: ${f.kind} ${Math.round(f.share * 100)}% by ${f.by} ${f.secs ? `for ${f.secs} s ` : ''}at ${f.at}${f.fx ? ' [fx]' : ''}`); }
    await context.close();
  }
  await browser.close();
}
writeFileSync(join(OUT, `flags${process.env.ENGINE ? '_' + process.env.ENGINE : ''}${process.env.VIEW ? '_' + process.env.VIEW : ''}.json`), JSON.stringify(all, null, 1));

void lines;
console.log(failures ? `\nFAILED: ${failures} (a flag with no rule in e2e/layer-audit/allow.mjs is a bug: fix it, or if it is meant, give it its rule and its reason)` : `\nPASS (${all.length} flags, every one answered for by the allow list)`);
process.exit(failures ? 1 : 0);
