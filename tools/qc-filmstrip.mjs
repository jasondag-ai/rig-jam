// A filmstrip of one gag for Jay to check by eye: a frame every 0.25 s, held on the gag's own
// clock (?gagtest=1), in a phone's engine and size.
//   node tools/qc-filmstrip.mjs <gag> <iphone|s23|pixel> <out folder> [region tab] [level] [query] [sky|strip]
// Needs the dev server (URL=… to point elsewhere) and Pillow (PYTHON=… for the python that has it).
import { chromium, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PHONES = {
  iphone: { engine: webkit, name: 'iPhone (WebKit, 390 x 844, DPR 3)', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  s23: { engine: chromium, name: 'Galaxy S23 (Chromium, 360 x 780, DPR 3)', viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 },
  pixel: { engine: chromium, name: 'Pixel (Chromium, 412 x 915, DPR 2.625)', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 },
};
const [gag, phone = 'iphone', out = '.', region = '0', level = '1', query = 'night=0', part = 'strip'] = process.argv.slice(2);
const P = PHONES[phone];
const URL_ = process.env.URL ?? 'http://localhost:5173/';
const STEP = 0.25;

const browser = await P.engine.launch();
const context = await browser.newContext({ viewport: P.viewport, deviceScaleFactor: P.deviceScaleFactor, hasTouch: true, isMobile: P.engine === chromium });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`${URL_}?cover=0&gagtest=1&${query}`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: [], demo: true })));
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.region-tab').nth(+region).click();
await page.locator('.level-btn').nth(+level).click();
await page.waitForSelector('.board .truck.sprite-on');
await page.waitForTimeout(query.includes('night=1') ? 4800 : 700);
const m = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { board: r('.board'), note: r('.note'), hud: r('.hud') }; });
const W = P.viewport.width;
const clip = part === 'sky'
  ? { x: 0, y: Math.round(m.hud.bottom) - 4, width: W, height: Math.round(m.board.top - m.hud.bottom) + 44 }
  : { x: 0, y: Math.round(m.board.bottom) - 44, width: W, height: Math.round(m.note.top - m.board.bottom) + 60 };
const end = await page.evaluate((g) => window.__rhrGag.end(g), gag);
const dir = mkdtempSync(join(tmpdir(), 'rhr-qc-'));
const files = [];
const shot = async (label) => { const f = join(dir, `${String(files.length).padStart(3, '0')}.png`); await page.screenshot({ path: f, clip }); files.push(`${label}=${f}`); };
await shot('before');
for (let t = 0; t <= end + 1e-6; t += STEP) {
  if (!(await page.evaluate(([g, at]) => window.__rhrGag.hold(g, at), [gag, t]))) console.log('hold refused at', t);
  await page.waitForTimeout(50);
  await shot(`${t.toFixed(2)} s`);
}
await page.evaluate((g) => window.__rhrGag.release(g), gag);
await page.waitForTimeout(300);
await shot('after');
await browser.close();

mkdirSync(out, { recursive: true });
const sheet = join(out, `${gag}_${phone}.png`);
execFileSync(process.env.PYTHON ?? 'python3', ['-c', `
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
items = [a.split('=', 1) for a in sys.argv[4:]]
ims = [Image.open(f).convert('RGB') for _, f in items]
fw = 520; fh = round(ims[0].height * fw / ims[0].width); pad = 6; cap = 26; head = 40
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (fw + pad) + pad, head + rows * (fh + cap + pad) + pad), '#1f2328')
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
except Exception: font = ImageFont.load_default()
d.text((pad, 8), title, fill='#ffffff', font=font)
for i, im in enumerate(ims):
    x = pad + (i % cols) * (fw + pad); y = head + (i // cols) * (fh + cap + pad)
    d.text((x + 2, y + 2), items[i][0], fill='#ffd75a', font=font)
    sheet.paste(im.resize((fw, fh), Image.LANCZOS), (x, y + cap))
sheet.save(out)
print(out, sheet.size)
`, sheet, `${gag}: a frame every ${STEP} s, ${P.name}`, '6', ...files], { stdio: 'inherit' });
