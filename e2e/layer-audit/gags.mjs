// The layer audit, part 1: EVERY STRIP SIGHTING the game can hold (`?gagtest=1`), stepped through its run every
// quarter second on its region's standard scene. The things to watch are its actors and props: each puppet, each
// top-level drawing of a scene gag. (Its sound words and effects are looked at too.)
import { REGIONS } from '../../src/levels/regions.ts';

/** In the page: steps one gag through its run and says what was hidden, by what, for how long. */
export async function auditGag(page, id) {
  return page.evaluate(async (id) => {
    const g = window.__rhrGag, la = window.__la;
    if (!g.hold(id, 0)) return null;
    const end = g.end(id), screen = document.querySelector('.screen.game');
    const units = () => [...screen.querySelectorAll(`[data-gag="${id}"]`)];
    const kin = (e) => !!e.closest(`[data-gag="${id}"]`);
    const parts = (u) => {
      const scene = u.querySelector(':scope > svg.scene-svg');
      const els = scene ? [...scene.querySelectorAll(':scope > g.pup > *')] : [...u.querySelectorAll('svg.pup')];
      return els.filter((el) => la.shown(el) > 0.3).map((el, i) => ({ el, key: `${(u.className.match(/[\w-]+-layer|scene-(?:near|back|over)/) ?? ['layer'])[0]}#${i}`, fx: !!el.closest('[data-fx], .scene-over') || el.matches('[data-fx]') }));
    };
    const seen = new Map(), last = new Map();
    for (let t = 0; t <= end + 1e-6; t += 0.25) {
      g.hold(id, t);
      await new Promise((q) => requestAnimationFrame(q));
      for (const u of units()) for (const p of parts(u)) {
        const b = la.box(p.el);
        if (b.w < 5 || b.h < 5) continue;
        const prev = last.get(p.key), still = prev && Math.abs(prev.l - b.l) < 1.5 && Math.abs(prev.t - b.t) < 1.5 ? (prev.still ?? 0) + 1 : 0;
        last.set(p.key, { ...b, still });
        // (On the stage: inside the game's own screen, which on a desktop is a column in the middle of the window. A piece
        // wholly outside it is waiting in the wings, as it would be off a phone's screen.)
        const st = la.box(screen);
        const onScreen = b.r > st.l + 4 && b.l < st.r - 4 && b.b > st.t + 4 && b.t < st.b - 4;
        if (!onScreen) continue;
        const cov = la.covered(p.el, kin, 5);
        const top = Object.entries(cov.by).sort((a, c) => c[1] - a[1])[0];
        if (cov.points >= 3 && cov.share >= 0.5 && top) {
          const k = `${p.key}|covered|${top[0]}`, f = seen.get(k) ?? { part: p.key, kind: 'covered', by: top[0], share: 0, run: 0, max: 0, t, last: -9, fx: p.fx };
          f.run = t - f.last < 0.26 ? f.run + 1 : 1; f.last = t; f.max = Math.max(f.max, f.run);
          if (cov.share > f.share) { f.share = cov.share; f.t = t; f.box = cov.box; }
          seen.set(k, f);
        }
        const cl = la.clipped(p.el);
        // (Half off an edge of the screen, or of the game's column on a desktop: on its way in or out, unless it has stopped there.)
        if (cl.share >= 0.25 && !(/the screen's edge|^\.screen \(overflow\)|^\.scene-layer \(overflow\)/.test(cl.by) && still < 4)) {
          const k = `${p.key}|clipped|${cl.by}`, f = seen.get(k) ?? { part: p.key, kind: 'clipped', by: cl.by, share: 0, run: 0, max: 0, t, last: -9, fx: p.fx };
          f.run = t - f.last < 0.26 ? f.run + 1 : 1; f.last = t; f.max = Math.max(f.max, f.run);
          if (cl.share > f.share) { f.share = cl.share; f.t = t; f.box = cl.box; }
          seen.set(k, f);
        }
      }
    }
    g.release(id);
    // (Half a second or more: two samples running.)
    return { end, flags: [...seen.values()].filter((f) => f.max >= 2).map(({ last: _l, run: _r, ...f }) => ({ ...f, secs: f.max * 0.25 })) };
  }, id);
}

/** Every held gag on every region's scene: [{ scenario, where, ...flag }], and the gags that were held. */
export async function auditGags(page, shot, only = '') {
  const flags = [], held = new Set();
  for (let r = 0; r < REGIONS.length; r++) {
    const flare = REGIONS[r].levels.findIndex((l) => (l.obstacles ?? []).some((o) => o.kind === 'flare'));
    for (const li of [...new Set([2, flare].filter((x) => x >= 0))]) {
      await page.waitForSelector('.screen.levels .region-tab');
      await page.locator('.region-tab').nth(r).click();
      await page.locator('.level-btn').nth(li).click();
      await page.waitForSelector('.board .truck.sprite-on');
      await page.waitForTimeout(500);
      const names = await page.evaluate(() => window.__rhrGag.names());
      for (const id of names) {
        if (held.has(id) || (only && only !== id)) continue;
        const res = await auditGag(page, id);
        if (!res) continue;
        held.add(id);
        for (const f of res.flags) {
          // A still of the moment: the gag held there again.
          await page.evaluate(([id, t]) => window.__rhrGag.hold(id, t), [id, f.t]);
          await page.waitForTimeout(120);
          const still = await shot(`${id}_${f.part.replace(/[^\w]+/g, '_')}_${f.kind}`, f.box);
          await page.evaluate((id) => window.__rhrGag.release(id), id);
          flags.push({ scenario: `sighting: ${id}`, where: `${REGIONS[r].name} ${li + 1}`, focal: f.part, kind: f.kind, by: f.by, share: f.share, secs: f.secs, at: `${f.t.toFixed(2)} s`, fx: f.fx, still });
        }
      }
      await page.locator('.hud [data-act="levels"]').click();
    }
  }
  return { flags, held: [...held] };
}
