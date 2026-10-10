// THE VIDEO KIT'S RECORDER (job U11): records the LIVE game in a headless Chromium as a phone would show it, WITH THE
// GAME'S OWN SOUND, and without changing the game.
//   PICTURE: the browser's own screencast (CDP `Page.startScreencast`), every frame it paints, at the phone view's
//     device pixels (432 x 768 CSS px at 2.5 = 1080 x 1920), each stamped with the time it was painted.
//   SOUND: the game plays through Web Audio. Before the page's scripts run, `AudioNode.connect` is wrapped so that
//     whatever is connected to a context's destination is ALSO connected to a recorder's own node (a
//     MediaStreamDestination > MediaRecorder, Opus). The game's code and its mix are untouched: this only listens.
//   A session is recorded whole; `cut` then makes each clip from a stretch of it: frames laid out by their stamps at a
//   constant 30 fps, H.264, with the sound of the same stretch (AAC), in step.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const VIEW = { width: 432, height: 768, scale: 2.5 }; // 9:16; 1080 x 1920 device px
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs in the page before anything else: taps every AudioContext's output into a recorder. */
function tapAudio() {
  const taps = new WeakMap();
  window.__tap = { chunks: [], startedAt: null, state: 'idle' };
  const tapFor = (ctx) => {
    let t = taps.get(ctx);
    if (!t) {
      const dest = ctx.createMediaStreamDestination();
      const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
      rec.ondataavailable = (e) => { if (e.data.size) window.__tap.chunks.push(e.data); };
      rec.onstart = () => { window.__tap.startedAt = performance.timeOrigin + performance.now(); window.__tap.state = 'on'; };
      rec.start(250);
      t = { dest, rec };
      taps.set(ctx, t);
      window.__tap.rec = rec;
      window.__tap.ctx = ctx;
    }
    return t;
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const out = connect.call(this, target, ...rest);
    try { if (target instanceof AudioDestinationNode) connect.call(this, tapFor(target.context).dest); } catch { /* listening only */ }
    return out;
  };
  window.__tapStop = () => new Promise((done) => {
    const rec = window.__tap.rec;
    if (!rec || rec.state === 'inactive') return done(null);
    rec.onstop = async () => {
      const buf = new Uint8Array(await new Blob(window.__tap.chunks, { type: 'audio/webm' }).arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      done({ b64: btoa(s), startedAt: window.__tap.startedAt });
    };
    rec.stop();
  });
}

/**
 * Opens a recording session: a phone-sized page with the screencast and the sound tap running.
 * `audio`: the game's saved sound settings for this visit ({ sfx, music, style }).
 */
export async function open(dir, { view = VIEW, audio = { sfx: true, music: false, style: 'country' }, storage = {}, clock = null, reducedMotion = 'no-preference', permissions = [] } = {}) {
  dir = resolve(dir);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'frames'), { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.scale, hasTouch: true, isMobile: true, reducedMotion,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' });
  if (permissions.length) await context.grantPermissions(permissions);
  await context.addInitScript(tapAudio);
  await context.addInitScript(([a, s]) => { try { localStorage.setItem('rush-hour-rigs-audio', JSON.stringify(a)); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* storage blocked */ } }, [audio, storage]);
  const page = await context.newPage();
  if (clock) await page.clock.setSystemTime(clock);
  const cdp = await context.newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', (f) => {
    const file = join(dir, 'frames', `${String(n++).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp * 1000 });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const W = Math.round(view.width * view.scale), H = Math.round(view.height * view.scale);
  const session = {
    browser, context, page, cdp, frames, dir, view, size: [W, H], marks: {}, beats: [],
    /** Names this moment (wall-clock ms), for `cut`. */
    mark(name) { session.marks[name] = Date.now(); return session.marks[name]; },
    async start() { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 }); },
    /** The wall-clock time now, in the page's terms (ms): what a clip's start and end are given in. */
    now: () => Date.now(),
    /** A real finger: touch events sent through the browser itself. `path`: [[x, y, msFromStart], ...]. */
    async touch(path) {
      const t0 = Date.now();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path[0][0], y: path[0][1] }] });
      for (const [x, y, at] of path.slice(1)) {
        const d = at - (Date.now() - t0); if (d > 0) await wait(d);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
    async tap(x, y) { await session.touch([[x, y, 0], [x, y, 40]]); },
    /**
     * WHERE THE RECORDED SOUND SITS AGAINST THE CLOCK: a 30 ms beep of the recorder's own is played through the game's
     * audio context at a known moment (call it while the game is quiet, before any clip), and `close` finds it in the
     * recording. `cut` moves the sound by what that shows, and the beep itself is never inside a clip.
     */
    async calibrate() {
      session.beepAt = await page.evaluate(() => {
        const ctx = window.__tap.ctx;
        if (!ctx) return null;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.frequency.value = 1000; g.gain.value = 0.6;
        osc.connect(g); g.connect(ctx.destination);
        const at = ctx.currentTime + 0.12;
        osc.start(at); osc.stop(at + 0.03);
        return performance.timeOrigin + performance.now() + 120;
      });
      await wait(400);
    },
    /** Stops the session and writes its sound (session.webm). Returns what `cut` needs. */
    async close() {
      await cdp.send('Page.stopScreencast').catch(() => {});
      session.beats = await page.evaluate(() => window.__beats ?? []).catch(() => []);
      const a = await page.evaluate(() => window.__tapStop()).catch(() => null);
      if (a) writeFileSync(join(dir, 'session.webm'), Buffer.from(a.b64, 'base64'));
      await browser.close();
      session.audio = a ? { file: join(dir, 'session.webm'), startedAt: a.startedAt, late: 0 } : null;
      if (session.audio && session.beepAt) {
        const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', session.audio.file, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
        const pcm = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
        const want = (session.beepAt - a.startedAt) / 1000;
        // The beep is a pure 1 kHz tone: the first 10 ms stretch after its moment that is mostly that tone (the game's
        // own sounds are not), found with a Goertzel filter.
        let on = -1;
        const N = 480, w = (2 * Math.PI * 1000) / 48000, c = 2 * Math.cos(w);
        for (let i = Math.max(0, Math.round((want - 0.05) * 48000)); i + N < Math.min(pcm.length, (want + 1.0) * 48000); i += 48) {
          let s1 = 0, s2 = 0, total = 0;
          for (let k = 0; k < N; k++) { const x = pcm[i + k]; const s0 = x + c * s1 - s2; s2 = s1; s1 = s0; total += x * x; }
          const tone = (s1 * s1 + s2 * s2 - c * s1 * s2) / (N / 2);
          if (total > N * 0.01 && tone / total > 0.8) { on = i; break; }
        }
        // (Not found: the usual lag of this recorder, measured many times, is taken.)
        session.audio.late = on >= 0 ? on / 48 - want * 1000 : 335; // ms the recording runs behind the clock
        session.audio.found = on >= 0;
        session.audio.beep = [want, on / 48000];
      }
      writeFileSync(join(dir, 'meta.json'), JSON.stringify({ size: session.size, frames, audio: session.audio, marks: session.marks, beats: session.beats }));
      return session;
    },
  };
  return session;
}

const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Cuts one clip out of a closed session: from `from` to `to` (wall-clock ms, as `session.now()` gave them).
 * 30 fps constant, H.264 (yuv420p), AAC sound from the same stretch (silence if the session has none).
 */
export function cut(session, out, from, to, { fps = 30, size = session.size, sound = true, crf = 15, fadeOut = 0 } = {}) {
  const fr = session.frames;
  // The frame showing at `from` is the last one painted at or before it.
  let i0 = 0; while (i0 + 1 < fr.length && fr[i0 + 1].t <= from) i0++;
  const list = [];
  for (let i = i0; i < fr.length && fr[i].t < to; i++) {
    const start = Math.max(fr[i].t, from), end = Math.min(i + 1 < fr.length ? fr[i + 1].t : to, to);
    if (end > start) list.push(`file '${fr[i].file}'\nduration ${((end - start) / 1000).toFixed(4)}`);
  }
  if (!list.length) throw new Error(`${out}: no frames between ${from} and ${to}`);
  list.push(`file '${fr[Math.min(fr.length - 1, i0 + list.length - 1)].file}'`);
  const concat = `${out}.txt`;
  writeFileSync(concat, list.join('\n') + '\n');
  const secs = (to - from) / 1000;
  const v = ['-f', 'concat', '-safe', '0', '-i', concat];
  // (The frames are JPEGs, full range: the clip is ordinary video range, BT.709, as players expect of H.264.)
  const vf = `fps=${fps},scale=${size[0]}:${size[1]}:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p`;
  const venc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(fps), '-movflags', '+faststart', '-t', secs.toFixed(3)];
  if (!sound) { ff(...v, '-vf', vf, ...venc, '-an', out); }
  else {
    const a = session.audio;
    const af = `aresample=48000${fadeOut ? `,afade=t=out:st=${Math.max(0, secs - fadeOut).toFixed(3)}:d=${fadeOut}` : ''}`;
    if (a && from - a.startedAt > -secs * 1000) {
      const off = (from - a.startedAt + (a.late ?? 0)) / 1000;
      // (Sound that began after the clip's start is set back by that much; before it, the stretch is sought to.)
      const ain = off >= 0 ? ['-ss', off.toFixed(3), '-i', a.file] : ['-i', a.file];
      const delay = off < 0 ? `adelay=${Math.round(-off * 1000)}:all=1,` : '';
      ff(...v, ...ain, '-vf', vf, '-af', `${delay}${af},apad`, ...venc, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', out);
    } else {
      ff(...v, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-vf', vf, ...venc, '-c:a', 'aac', '-b:a', '128k', out);
    }
  }
  rmSync(concat, { force: true });
  const painted = fr.filter((f) => f.t >= from && f.t < to).length;
  return { out, secs, painted, fps: painted / secs };
}

/** A closed session, read back from its folder (to cut clips again without recording again). */
export const load = (dir) => JSON.parse(readFileSync(join(resolve(dir), 'meta.json'), 'utf8'));

/** In the page: notes every change of `data-part` / `data-beat` with the time it was seen (`window.__beats`). */
export function watchBeats(page) {
  return page.evaluate(() => {
    window.__beats = [];
    let last = '';
    const tick = () => {
      const part = document.querySelector('.screen.finale')?.dataset.part ?? '';
      const beat = [...document.querySelectorAll('[data-beat]')].map((e) => e.dataset.beat).filter(Boolean).at(-1) ?? '';
      const key = `${part}|${beat}`;
      if (key !== last) { last = key; window.__beats.push({ part, beat, t: Date.now() }); }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
