// The audio engine: Jay's picked cartoon sounds and music, played from files (public/audio; the
// pack and the mix are in pack.ts). One AudioContext, made on the first tap (iOS only allows sound
// after a touch), an effects bus and a music bus, and the named game cues the UI calls (`sound`).
// Nothing is fetched before that first tap, and nothing at all while its switch is off: the effects
// load when Sound effects is on, a music loop only when Music is on. Where Safari supports it the
// session is "ambient", so the iPhone's silent switch mutes the game.
import { haptic } from './haptics.ts';
import { STEP_CELLS, chordLift, nextChain, winCue } from './cues.ts';
import { GAG_LOOPS, GAG_SOUNDS, gagKeys, parseCue, type GagLoop } from './gag-sounds.ts';
import { CORE_KEYS, LAZY_KEYS, MUSIC_FADE, gainFor, loopPoints, musicGain, musicInfo, musicKey, pickFormat, sfxInfo, type MusicKey, type Scene, type SfxKey } from './pack.ts';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './settings.ts';
import type { GagId } from '../ui/gag-triggers.ts';

export type Ground = 'gravel' | 'mud' | 'snow';
const BASE = './audio/';
/** A sound asked for before its file has arrived is still played if the file lands within this long (s); later, it is dropped. */
const LATE = 0.25;

interface Loop {
  src: AudioBufferSourceNode;
  gain: GainNode;
  level: number;
}

const METERED = typeof location !== 'undefined' && new URLSearchParams(location.search).has('audiolog');

class AudioEngine {
  ctx: AudioContext | null = null;
  settings: AudioSettings = loadAudioSettings();
  /** Recent cues, newest last (tests read this via ?audiolog). */
  readonly log: string[] = [];
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private loops = new Map<string, Loop>();
  private timers = new Map<string, number>();
  /** What each repeat still has sounding (so stopping it can fade them), and the gag sounds this level asked for. */
  private ringing = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }[]>();
  private warmed = new Set<SfxKey>();
  private scene: Scene = 'menu';
  /** In play: the level's music tier (pack.ts `PLAY_TIER`). Only Classic Rock has a loop for each. */
  private tier = 1;
  private music: { key: MusicKey; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wanted: MusicKey | null = null;
  private installed = false;
  private meter: AnalyserNode | null = null;

  /** Listens for the first tap/key to start audio, and for taps on buttons (the UI's click). Safe to call more than once. */
  install(): void {
    if (this.installed) return;
    this.installed = true;
    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) document.addEventListener(type, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
    // EVERY BUTTON TAP PLAYS ONE CLICK (Jay, Oct 6): the same soft wooden click everywhere, and a
    // light haptic tick (haptics.ts; it follows the Sound effects switch). A tap = a
    // touch that lifts on the button it landed on, within TAP_SLOP of where it landed (so a swipe
    // of the region bar is silent). Never anything on the board: a truck drag has its own sounds.
    let down: Element | null = null;
    let at = { x: 0, y: 0 };
    const button = (e: Event) => {
      const t = e.target as Element | null;
      return t?.closest?.(NOT_BUTTONS) ? null : (t?.closest?.(BUTTONS) ?? null);
    };
    document.addEventListener('pointerdown', (e) => ((down = button(e)), (at = { x: e.clientX, y: e.clientY })), { capture: true });
    document.addEventListener(
      'pointerup',
      (e) => {
        const on = button(e);
        if (on && on === down && !(on as HTMLButtonElement).disabled && Math.hypot(e.clientX - at.x, e.clientY - at.y) <= TAP_SLOP) {
          this.play('click');
          haptic(this.settings.sfx);
        }
        down = null;
      },
      { capture: true },
    );
  }

  /** Called from a user gesture: create (or resume) the context, then fetch what the switches ask for. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      // Respect the iPhone silent switch where Safari lets us (Audio Session API).
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) {
        try {
          session.type = 'ambient';
        } catch {
          // Not settable here; fine.
        }
      }
      this.ctx = new AC({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(comp);
      this.musicBus.connect(comp);
      // (Tests: a meter on what actually goes out, after the compressor. See `peak`.)
      if (METERED) {
        this.meter = this.ctx.createAnalyser();
        this.meter.fftSize = 4096;
        comp.connect(this.meter);
      }
      this.applyLevels();
      // iOS wants a sound started inside the gesture itself: one silent sample.
      const blip = this.ctx.createBufferSource();
      blip.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      blip.connect(this.ctx.destination);
      blip.start();
      this.note('unlock');
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.preload();
    this.syncMusic();
  }

  setSettings(next: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...next };
    saveAudioSettings(this.settings);
    this.applyLevels();
    if (!this.settings.sfx) this.silenceEffects();
    this.preload();
    this.syncMusic();
  }

  sceneNow(): Scene {
    return this.scene;
  }

  /** The menus or a level: each has its own loop of the chosen style. */
  setScene(scene: Scene, tier = 1): void {
    if (scene === this.scene && tier === this.tier) return;
    this.scene = scene;
    this.tier = tier;
    this.syncMusic();
  }

  private applyLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfxBus!.gain.setTargetAtTime(this.settings.sfx ? 1 : 0, now, 0.05);
    this.musicBus!.gain.setTargetAtTime(this.settings.music ? 1 : 0, now, 0.2);
  }

  private note(name: string): void {
    this.log.push(name);
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }

  // ---------- Files ----------

  private fetchBuffer(id: string, urls: string[]): Promise<AudioBuffer | null> {
    const have = this.loading.get(id);
    if (have) return have;
    const job = (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(BASE + url);
          if (!res.ok) continue;
          const data = await res.arrayBuffer();
          const buffer = await new Promise<AudioBuffer>((ok, no) => {
            // (The callback form: older Safari has no promise here.)
            const p = this.ctx!.decodeAudioData(data, ok, no);
            if (p) p.then(ok, no);
          });
          this.buffers.set(id, buffer);
          this.note(`loaded:${url}`);
          return buffer;
        } catch {
          // Could not fetch or decode this format: try the next.
        }
      }
      this.loading.delete(id);
      return null;
    })();
    this.loading.set(id, job);
    return job;
  }

  /**
   * The effects, fetched once Sound effects is on (after the first tap): the game's own and the
   * older gags' (about 0.9 MB), plus whatever the level on screen has asked for (`warm`). The
   * sounds of gag wave 3 are fetched only by the levels that can play them.
   */
  private preload(): void {
    if (!this.ctx || !this.settings.sfx) return;
    for (const key of [...CORE_KEYS, ...this.warmed]) void this.fetchBuffer(key, [`sfx/${key}.mp3`]);
  }

  /** A level opens: these are the sounds its gags may need (fetched now if sound is on, else when it is switched on). */
  warm(keys: SfxKey[]): void {
    this.warmed = new Set(keys);
    this.preload();
  }

  // ---------- Effects ----------

  /** Plays a one-shot now (+ `delay` s). `rate`: pitch and speed; `gain`: on top of its place in the mix. */
  play(key: SfxKey, opts: { delay?: number; rate?: number; gain?: number; as?: string; ring?: string } = {}): void {
    if (!this.ctx || !this.settings.sfx) return;
    this.note(opts.as ?? key);
    const ctx = this.ctx;
    const asked = ctx.currentTime;
    const start = (buffer: AudioBuffer) => {
      const late = ctx.currentTime - asked;
      if (late > LATE) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = opts.rate ?? 1;
      const g = ctx.createGain();
      g.gain.value = gainFor(key) * (opts.gain ?? 1);
      src.connect(g).connect(this.sfxBus!);
      src.start(ctx.currentTime + 0.005 + Math.max(0, (opts.delay ?? 0) - late));
      // (Part of a repeat that may be stopped: remembered until it has played out.)
      if (opts.ring && this.timers.has(opts.ring)) {
        const mine = this.ringing.get(opts.ring) ?? [];
        const one = { src, gain: g };
        mine.push(one);
        this.ringing.set(opts.ring, mine);
        src.onended = () => {
          const left = (this.ringing.get(opts.ring!) ?? []).filter((x) => x !== one);
          if (left.length) this.ringing.set(opts.ring!, left);
          else this.ringing.delete(opts.ring!);
        };
      }
    };
    const ready = this.buffers.get(key);
    if (ready) start(ready);
    else void this.fetchBuffer(key, [`sfx/${key}.mp3`]).then((b) => b && this.settings.sfx && start(b));
  }

  /** Starts a looping sound under `name` (no-op if it is running). The file loops on itself, its padding skipped. */
  loopOn(name: string, key: SfxKey, opts: { rate?: number; gain?: number; fade?: number } = {}): void {
    if (!this.ctx || !this.settings.sfx || this.loops.has(name)) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return void this.fetchBuffer(key, [`sfx/${key}.mp3`]);
    this.note(name);
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const pts = loopPoints(buffer.getChannelData(0), buffer.sampleRate);
    src.loopStart = pts.start;
    src.loopEnd = pts.end;
    src.playbackRate.value = opts.rate ?? 1;
    const gain = ctx.createGain();
    const level = gainFor(key) * (opts.gain ?? 1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(level, ctx.currentTime + (opts.fade ?? 0.06));
    src.connect(gain).connect(this.sfxBus!);
    src.start(ctx.currentTime, pts.start);
    this.loops.set(name, { src, gain, level: gainFor(key) });
  }

  /** Changes a running loop's pitch and loudness, smoothly. */
  loopSet(name: string, opts: { rate?: number; gain?: number }): void {
    const l = this.loops.get(name);
    if (!l || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (opts.rate !== undefined) l.src.playbackRate.setTargetAtTime(opts.rate, now, 0.06);
    if (opts.gain !== undefined) l.gain.gain.setTargetAtTime(l.level * opts.gain, now, 0.06);
  }

  /** Stops a loop with a short fade (nothing ends on a click). */
  loopOff(name: string, fade = 0.12): void {
    const l = this.loops.get(name);
    if (!l || !this.ctx) return;
    this.loops.delete(name);
    const now = this.ctx.currentTime;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setTargetAtTime(0, now, fade / 3);
    l.src.stop(now + fade + 0.05);
  }

  /** Tests (?audiolog): the loudest sample that went out in the last 90 ms or so, 0 to 1 and beyond if it would clip. */
  peak(): number {
    if (!this.meter) return 0;
    const data = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(data);
    let max = 0;
    for (const v of data) max = Math.max(max, Math.abs(v));
    return max;
  }

  loopRunning(name: string): boolean {
    return this.loops.has(name);
  }

  /** Repeats a one-shot every `seconds` until `repeatOff(name)`. */
  repeatOn(name: string, key: SfxKey, seconds: number, opts: { jitter?: number } = {}): void {
    if (this.timers.has(name) || !this.ctx || !this.settings.sfx) return;
    const tick = () => {
      this.timers.set(name, window.setTimeout(tick, seconds * 1000));
      this.play(key, { as: name, ring: name, rate: 1 + (Math.random() - 0.5) * (opts.jitter ?? 0) });
    };
    tick();
  }

  /** Stops a repeat, and fades out whatever of it is still sounding (rain does not ring on under an open umbrella). */
  repeatOff(name: string, fade = 0.18): void {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
    const now = this.ctx?.currentTime ?? 0;
    for (const { src, gain } of this.ringing.get(name) ?? []) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, fade / 3);
      src.stop(now + fade + 0.05);
    }
    this.ringing.delete(name);
  }

  repeatRunning(name: string): boolean {
    return this.timers.has(name);
  }

  /** Stops every loop and repeat (leaving the game screen, or effects switched off). */
  silenceEffects(): void {
    for (const name of [...this.loops.keys()]) this.loopOff(name);
    for (const name of [...this.timers.keys()]) this.repeatOff(name);
  }

  // ---------- Music ----------

  /** Plays the loop for the chosen style and the scene, if Music is on; fades between loops. Fetched only now. */
  private syncMusic(): void {
    if (!this.ctx) return;
    const want = this.settings.music ? musicKey(this.settings.style, this.scene, this.tier) : null;
    if (want === this.wanted) return;
    this.wanted = want;
    const ctx = this.ctx;
    const old = this.music;
    if (old) {
      this.music = null;
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, MUSIC_FADE / 3);
      old.src.stop(ctx.currentTime + MUSIC_FADE + 0.1);
    }
    if (!want) return;
    const formats = pickFormat(musicInfo(want).formats, (type) => (typeof Audio === 'undefined' ? '' : new Audio().canPlayType(type)));
    const mp3 = musicInfo(want).formats.find((f) => f.type === 'audio/mpeg');
    const urls = [...new Set([...formats, ...(mp3 ? [mp3] : [])].map((f) => `music/${f.file}`))];
    void this.fetchBuffer(`music:${want}`, urls).then((buffer) => {
      // Still the loop that is wanted? (The player may have moved on while it loaded.)
      if (!buffer || this.wanted !== want || this.music?.key === want) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const pts = loopPoints(buffer.getChannelData(0), buffer.sampleRate);
      src.loopStart = pts.start;
      src.loopEnd = pts.end;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(musicGain(want), ctx.currentTime + MUSIC_FADE);
      src.connect(gain).connect(this.musicBus!);
      src.start(ctx.currentTime, pts.start);
      this.music = { key: want, src, gain };
      this.note(`music:${want}`);
    });
  }

  /** Tests: which loop is playing, and where its loop points are. */
  musicState(): { key: string; loopStart: number; loopEnd: number; seconds: number; gain: number } | null {
    const m = this.music;
    return m ? { key: m.key, loopStart: m.src.loopStart, loopEnd: m.src.loopEnd, seconds: m.src.buffer!.duration, gain: musicGain(m.key) } : null;
  }
}

/** What pops when tapped, and which of those are a way back. */
const BUTTONS = 'button, .btn, [role="tab"], [role="radio"], [role="button"], label.switch, a[href]';
/** Never a button's click: anything on the lease (trucks, equipment, gates). */
const NOT_BUTTONS = '.board';
const TAP_SLOP = 10;

export const audio = new AudioEngine();

// ---------- Game cues ----------

let chain = 0;
let lastExitAt: number | null = null;
let rolled = 0;
let idleTimer = 0;
/** The loops and repeats each gag has started (stopped when it ends). */
const gagLoops = new Map<string, Set<string>>();
const gagTimers = new Map<string, number[]>();

export const sound = {
  /** A drag starts: the toy engine turns over and keeps running while the truck is held. */
  dragStart(): void {
    audio.play('drag');
    audio.loopOn('motor', 'motor', { rate: 0.9, gain: 0.5, fade: 0.25 });
  },
  /** The truck is moving `speed` cells/s: the engine climbs with it. */
  motion(speed: number, dt: number): void {
    const v = Math.min(1, Math.abs(speed) / 6);
    audio.loopSet('motor', { rate: 0.9 + v * 0.5, gain: 0.5 + v * 0.5 });
    // No motion for a moment (finger held still): drop back to idle.
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => audio.loopSet('motor', { rate: 0.9, gain: 0.5 }), 120);
    rolled += Math.abs(speed) * dt;
    if (rolled >= STEP_CELLS) rolled = 0;
  },
  /** The truck has settled (or driven off): the engine winds down. */
  dragEnd(): void {
    clearTimeout(idleTimer);
    audio.loopOff('motor', 0.2);
    this.reversing(false);
  },
  /** Backing up (away from its gate): the backup beeper until it stops reversing. */
  reversing(on: boolean): void {
    if (on) audio.loopOn('beeper', 'reverse');
    else audio.loopOff('beeper', 0.05);
  },
  bump(): void {
    audio.play('bump');
  },
  /** Radio squelch: plays just before a driver's speech bubble. */
  radio(): void {
    audio.play('radio');
  },
  /** A truck drives out: a light wooden clack at the gate; quick exits in a row sound the toy horn as a chord that climbs. */
  exit(): void {
    audio.play('clack');
    haptic(audio.settings.sfx);
    const now = performance.now();
    chain = nextChain(lastExitAt, now, chain);
    lastExitAt = now;
    if (chain >= 1) {
      // One horn at three pitches (a major chord), raised two semitones for each exit in the chain.
      const lift = chordLift(chain);
      HORN_CHORD.forEach((semis, i) => audio.play('horn', { as: i ? 'horn-chord' : 'horn', rate: 2 ** ((semis + lift) / 12), delay: 0.12 + i * 0.03, gain: 0.8 }));
    }
  },
  /** Win screen: a pop per hard hat, then the xylophone ta-da (par) or the wah-wah horn (+4 or worse). */
  win(hats: number, moves: number, par: number): void {
    for (let i = 0; i < hats; i++) audio.play('tap', { as: 'hat', delay: 0.15 + i * 0.22, rate: 1 + i * 0.12 });
    const cue = winCue(moves, par);
    const after = 0.25 + hats * 0.22;
    if (cue === 'ditty') audio.play('tada', { delay: after });
    if (cue === 'trombone') audio.play('lose', { delay: after });
  },
  /** The streak sign ticks up. */
  streakUp(): void {
    audio.play('streak', { delay: 0.9 });
  },
  /** A level begins (its ground no longer changes the sound): the in-play music, a fresh exit chain. */
  setGround(_g: Ground | null, tier = 1): void {
    chain = 0;
    lastExitAt = null;
    audio.setScene('play', tier);
  },
  /** A level opens with these gags in it: fetch the sounds only they use (the rest are fetched with the switch). */
  warm(ids: GagId[]): void {
    audio.warm(ids.flatMap(gagKeys).filter((k) => LAZY_KEYS.includes(k)));
  },
  /** Off the game screen: no engines or snoring left running; the menu's music. */
  quiet(): void {
    audio.silenceEffects();
    for (const name of [...gagLoops.keys()]) sound.gagEnd(name as GagId);
    audio.setScene('menu');
  },
  /** A pumpjack's stroke: a small squeak and clunk, well down in the mix. */
  pumpjack(): void {
    // Only on a level being played: never on the menus, the log or the cover.
    if (audio.sceneNow() === 'play') audio.play('pumpjack');
  },

  // The magpie's own (they follow what the player does, not his beats).
  squawk: () => audio.play('magpie'),
  plop: (delay = 0) => audio.play('splat', { delay }),
  grunt: () => audio.play('radio'),

  /** A gag reached a beat: play what the table says for it (gag-sounds.ts). */
  gag(id: GagId, beat: string): void {
    for (const cue of GAG_SOUNDS[id]?.[beat] ?? []) {
      const { op, name, delay, semis } = parseCue(cue);
      const act = () => {
        if (op === 'play') return audio.play(name as SfxKey, semis ? { rate: 2 ** (semis / 12) } : {});
        const mine = gagLoops.get(id) ?? new Set<string>();
        gagLoops.set(id, mine);
        const loop = GAG_LOOPS[name as GagLoop];
        const tag = `${id}:${name}`;
        if (op === 'start') {
          mine.add(name);
          if ('every' in loop) audio.repeatOn(tag, loop.key, loop.every, { jitter: STEADY.has(name) ? 0 : 0.12 });
          else audio.loopOn(tag, loop.key);
        } else {
          mine.delete(name);
          audio.repeatOff(tag);
          audio.loopOff(tag);
        }
      };
      if (!delay) act();
      else gagTimers.set(id, [...(gagTimers.get(id) ?? []), window.setTimeout(act, delay * 1000)]);
    }
  },
  /** A gag is over (or was cut short): everything it left running stops. */
  gagEnd(id: GagId): void {
    for (const t of gagTimers.get(id) ?? []) clearTimeout(t);
    gagTimers.delete(id);
    for (const name of gagLoops.get(id) ?? []) {
      audio.repeatOff(`${id}:${name}`);
      audio.loopOff(`${id}:${name}`);
    }
    gagLoops.delete(id);
  },
};
/** Repeats that are one sound running on (rain, a rumble): played again at the same pitch, so the joins do not show. */
const STEADY = new Set(['rustle', 'rumble', 'rain', 'downpour']);
/** The horn chord: the picked toy horn at three pitches (semitones above the file's own). */
export const HORN_CHORD = [0, 4, 7];

/** Test hook: ?audiolog exposes the engine so end-to-end tests can see which cues fired. */
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('audiolog')) {
  (window as unknown as { __rhrAudio: AudioEngine }).__rhrAudio = audio;
}
void sfxInfo;
