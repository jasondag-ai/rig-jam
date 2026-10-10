// THE VIDEO KIT'S BRAND FILES (job U11): the Rig Jam title and end card, drawn with the game's own cover (its hero
// image, public/cover.webp, and its title's own type, colours and outline from style.css `.cover-title`).
//   node tools/video-kit/brand.mjs      > qc-out/video-kit/kit/04_brand/title_logo.png (transparent), end_card.png (1080 x 1920)
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LINK = 'https://jasondag-ai.github.io/rig-jam/';
const dir = resolve('qc-out/video-kit/kit/04_brand');
mkdirSync(dir, { recursive: true });
const b64 = (f) => readFileSync(resolve(f)).toString('base64');
const font = `@font-face { font-family: Fredoka; font-weight: 700; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: Fredoka; font-weight: 600; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff2')}) format('woff2'); }`;
/** The cover's title, `k` times the size it has on a 432 px wide phone (84 px type, a 3 px outline, a 7 px lip). */
const title = (k) => `<h1 style="margin:0;display:grid;justify-items:center;font:700 ${84 * k}px/0.95 Fredoka;letter-spacing:${k}px;color:#ffd21f;text-align:center;text-shadow:${[[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -3], [0, 3], [-3, 0], [3, 0], [0, 7]].map(([x, y]) => `${x * k}px ${y * k}px 0 #2a1a0c`).join(',')}"><span>RIG</span><span style="font-size:1.25em;color:#ff5a36">JAM</span></h1>`;

const browser = await chromium.launch();
// The title alone, on nothing: 1600 px wide like the file it replaces.
{
  const page = await browser.newPage({ viewport: { width: 2000, height: 1600 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${font} html,body{margin:0;background:transparent}</style><div id="t" style="display:inline-block;padding:56px 62px 86px">${title(6.85)}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#t').screenshot({ path: join(dir, 'title_logo.png'), omitBackground: true });
  await page.close();
}
// The end card: the cover, the title in the sky (a little smaller than on the cover, so a caption fits under it in
// the top third), and the link where TAP TO START sits.
{
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${font} html,body{margin:0}
    body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Fredoka;background:#4f9fe6}
    img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .t{position:absolute;left:0;right:0;top:84px}
    .link{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);white-space:nowrap;padding:26px 44px 30px;border-radius:999px;background:#fff6e2;border:7px solid #2a1a0c;box-shadow:0 10px 0 #2a1a0c, 0 22px 30px rgba(0,0,0,.35);font:600 47px/1 Fredoka;color:#2a1a0c;letter-spacing:.5px}
  </style><img src="data:image/webp;base64,${b64('public/cover.webp')}"><div class="t">${title(2.05)}</div><div class="link">${LINK}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('img').complete);
  await page.screenshot({ path: join(dir, 'end_card.png') });
  console.log('link pill:', await page.evaluate(() => { const r = document.querySelector('.link').getBoundingClientRect(), t = document.querySelector('.t').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), titleBottom: Math.round(t.bottom) }; }));
  await page.close();
}
await browser.close();
