// A BEAT SHEET of one wave-3-format gag against its reference page: for every beat of the
// reference, its own drawing of that moment (left) beside the game's (right), both a little after
// the beat begins, with the beat's time and words. For Jay to check the port by eye.
//   node tools/qc-beatsheet.mjs <game gag id> <reference gag id> <reference .html> <out folder> [iphone|iphone375] [region tab] [level]
// WebKit at iPhone DPR 3 (390 x 844 or 375 x 812). Needs the dev server (URL=…) and Pillow (PYTHON=…).
// The game's frames are HELD on the gag's own clock (?gagtest=1), so its bubbles (lines said in the
// game's own speech bubble, like "Fore.") are not in them: the reference draws its own.
import { webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [gag, refId, refFile, out = '.', phone = 'iphone', region = '5', level = '0'] = process.argv.slice(2);
const SIZES = { iphone: { width: 390, height: 844 }, iphone375: { width: 375, height: 812 } };
const viewport = SIZES[phone];
const URL_ = process.env.URL ?? 'http://localhost:5173/';
/** How long after a beat begins it is looked at (s). */
const INTO = 0.18;

const browser = await webkit.launch();
// The reference's own beats and drawings.
const refCtx = await browser.newContext({ viewport: { width: 420, height: 300 }, deviceScaleFactor: 3 });
const ref = await refCtx.newPage();
await ref.goto(pathToFileURL(refFile).href, { waitUntil: 'load' });
const info = await ref.evaluate((id) => { const g = GAGS.find((x) => x.id === id); return { name: g.name, dur: g.dur, H: g.H, beats: g.beats }; }, refId);
const dir = mkdtempSync(join(tmpdir(), 'rhr-beats-'));
const refShots = [];
for (const [t] of info.beats) {
  const at = Math.min(info.dur, t + INTO);
  await ref.setContent(`<body style="margin:0;background:#1f2328"><svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="0 30 390 ${info.H - 30 - 6}" width="390" style="display:block;font-family:sans-serif"></svg></body>`);
  // (The reference page is gone from this tab now: its script was read before, so it is run again in a fresh page each beat.)
  refShots.push(at);
}
await ref.goto(pathToFileURL(refFile).href, { waitUntil: 'load' });
const refFiles = [];
for (const at of refShots) {
  const svg = await ref.evaluate(([id, t]) => GAGS.find((x) => x.id === id).render(t), [refId, at]);
  const f = join(dir, `ref_${refFiles.length}.png`);
  await ref.evaluate(([s, H]) => { let el = document.getElementById('qc-beat'); if (!el) { el = document.createElement('div'); el.id = 'qc-beat'; el.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:99999;background:#fff'; document.body.append(el); } el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 390 ${H - 36}" width="390" style="display:block">${s}</svg>`; }, [svg, info.H]);
  await ref.locator('#qc-beat').screenshot({ path: f });
  refFiles.push(f);
}
await refCtx.close();

// The game's.
const ctx = await browser.newContext({ viewport, deviceScaleFactor: 3, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`${URL_}?cover=0&gagtest=1&night=0`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: [], demo: true })));
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.region-tab').nth(+region).click();
await page.locator('.level-btn').nth(+level).click();
await page.waitForSelector('.board .truck.sprite-on');
await page.waitForTimeout(700);
const m = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { board: r('.board'), note: r('.note') }; });
const clip = { x: 0, y: Math.round(m.board.bottom) - 6, width: viewport.width, height: Math.round(m.note.top - m.board.bottom) + 10 };
const game = await page.evaluate((g) => window.__rhrGag.beats(g), gag);
// The game starts its clock a little early where the screen is wider than the reference's strip: the second beat tells by how much.
const lead = game.length > 1 ? game[1][0] - info.beats[1][0] : 0;
const same = game.length === info.beats.length && game.every((b, i) => i === 0 || Math.abs(b[0] - lead - info.beats[i][0]) < 1e-6);
console.log(`${info.name}: ${info.beats.length} beats in the reference, ${game.length} in the game, ${same ? 'at the same times' : 'NOT AT THE SAME TIMES'} (the game's clock starts ${lead.toFixed(2)} s early on this screen)`);
const gameFiles = [];
for (const at of refShots) {
  await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, lead + at]);
  await page.waitForTimeout(60);
  const f = join(dir, `game_${gameFiles.length}.png`);
  await page.screenshot({ path: f, clip });
  gameFiles.push(f);
}
await page.evaluate((g) => window.__rhrGag.release(g), gag);
await browser.close();

mkdirSync(out, { recursive: true });
const sheet = join(out, `${gag}_beats_${viewport.width}.png`);
const labels = info.beats.map(([t, text], i) => `${t.toFixed(2)} s  ${game[i] ? `[${game[i][1]}]  ` : ''}${text}`);
execFileSync(process.env.PYTHON ?? 'python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
out, title = sys.argv[1], sys.argv[2]
labels, refs, games = json.loads(sys.argv[3]), json.loads(sys.argv[4]), json.loads(sys.argv[5])
fw = 620; pad = 8; cap = 30; head = 74
R = [Image.open(f).convert('RGB') for f in refs]; G = [Image.open(f).convert('RGB') for f in games]
rh = round(R[0].height * fw / R[0].width); gh = round(G[0].height * fw / G[0].width); fh = max(rh, gh)
sheet = Image.new('RGB', (pad * 3 + fw * 2, head + len(R) * (fh + cap + pad) + pad), '#1f2328')
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20); big = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 24)
d.text((pad, 8), title, fill='#ffffff', font=big)
d.text((pad, 44), 'the reference', fill='#9fd0ff', font=font); d.text((pad * 2 + fw, 44), 'the game', fill='#9fd0ff', font=font)
for i in range(len(R)):
    y = head + i * (fh + cap + pad)
    d.text((pad, y + 3), labels[i], fill='#ffd75a', font=font)
    sheet.paste(R[i].resize((fw, rh), Image.LANCZOS), (pad, y + cap))
    sheet.paste(G[i].resize((fw, gh), Image.LANCZOS), (pad * 2 + fw, y + cap))
sheet.save(out)
print(out, sheet.size)
`, sheet, `${info.name}: each beat ${INTO} s in. Reference left, game right (WebKit, ${viewport.width} x ${viewport.height}, DPR 3)`, JSON.stringify(labels), JSON.stringify(refFiles), JSON.stringify(gameFiles)], { stdio: 'inherit' });
if (!same) process.exit(1);
