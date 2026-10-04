// Screenshots of the three regions' level list screens in WebKit at 390x844, and one image with all
// three side by side. Saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check) as regions_*.png.
// Also checks the three are different seasons. Run with the dev server up: node e2e/region-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
const page = await context.newPage();
await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
await page.evaluate((p) => {
  localStorage.clear();
  localStorage.setItem('rush-hour-rigs:v2', p);
}, UNLOCKED);
await page.reload({ waitUntil: 'networkidle' });
const seen = [];
const files = [];
for (const [i, region] of REGIONS.entries()) {
  await page.locator('.region-tab').nth(i).click();
  await page.waitForSelector('.screen.levels.ground-tex');
  await new Promise((r) => setTimeout(r, 500));
  const file = join(OUT, `regions_${region.id}.png`);
  await page.screenshot({ path: file });
  files.push(file);
  seen.push(
    await page.evaluate(() => {
      const s = document.querySelector('.screen.levels');
      const cs = getComputedStyle(s);
      return { photos: s.querySelectorAll('.scenery img').length, theme: s.dataset.theme, sky: cs.getPropertyValue('--sky-top').trim(), ground: cs.getPropertyValue('--ground').trim(), trees: [...new Set([...s.querySelectorAll('.scenery .sc')].map((t) => t.getAttribute('class').replace('sc ', '')))].sort().join(','), mud: (cs.backgroundImage.match(/radial-gradient/g) ?? []).length, rows: [...s.querySelectorAll('.level-btn')].every((b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)') };
    }),
  );
}
await browser.close();
const [c, m, d] = seen;
console.log(JSON.stringify(seen));
check(new Set(seen.map((s) => s.sky)).size === 3 && new Set(seen.map((s) => s.ground)).size === 3, 'three different skies and grounds');
check(m.mud >= 6 && c.mud === 0 && d.mud === 0, 'Montney only: muddy patches and puddles in the grass');
check(m.trees.includes('tree_aspen_spring') && c.trees.includes('tree_aspen_summer') && d.trees.includes('tree_spruce_winter') && seen.every((s) => s.photos === 0), 'toy-look trees, no photo sprites: spring aspens in Montney, summer trees in Cardium, snowy spruce in Duvernay');
check(seen.every((s) => s.rows), 'level rows keep their solid cream panels on every background');
execFileSync('python3', ['-c', `
from PIL import Image
ims=[Image.open(f).convert('RGB') for f in ${JSON.stringify(files)}]
o=Image.new('RGB',(sum(i.width for i in ims)+40,ims[0].height),'white'); x=0
for i in ims:
    o.paste(i,(x,0)); x+=i.width+20
o.save(${JSON.stringify(join(OUT, 'regions_side_by_side.png'))})
`]);
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
