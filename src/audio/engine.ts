// The audio engine: one AudioContext, created on the first tap (iOS only allows sound after a user
// gesture), an effects bus and a quieter music bus, and the named game cues the UI calls (`sound`).
// Web Audio only, no audio files. Where Safari supports it, the session is "ambient" so the iPhone
// silent switch mutes the game and it mixes politely with other audio.
import { STEP_CELLS, chordLift, nextChain, winCue } from './cues.ts';
import { STYLES, Sequencer } from './music.ts';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './settings.ts';
import * as fx from './sfx.ts';
import type { Held } from './synth.ts';

type Recipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => void;
export type Ground = 'gravel' | 'mud' | 'snow';

const SFX_LEVEL = 0.9;
/** Music sits well under the effects. */
const MUSIC_LEVEL = 0.32;

class AudioEngine {
  ctx: AudioContext | null = null;
  settings: AudioSettings = loadAudioSettings();
  /** Recent cues, newest last (tests read this via ?audiolog). */
  readonly log: string[] = [];
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private music: Sequencer | null = null;
  private musicStyle: string | null = null;
  private held = new Map<string, Held>();
  private loops = new Map<string, number>();
  private installed = false;

  /** Listens for the first tap/key to start audio. Safe to call more than once. */
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
  }

  /** Called from a user gesture: create (or resume) the context. */
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
      this.applyLevels();
      fx.unlockBlip(this.ctx);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.syncMusic();
  }

  setSettings(next: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...next };
    saveAudioSettings(this.settings);
    this.applyLevels();
    if (!this.settings.sfx) this.silenceEffects();
    this.syncMusic();
  }

  private applyLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfxBus!.gain.setTargetAtTime(this.settings.sfx ? SFX_LEVEL : 0, now, 0.05);
    this.musicBus!.gain.setTargetAtTime(this.settings.music ? MUSIC_LEVEL : 0, now, 0.4);
  }

  private syncMusic(): void {
    if (!this.ctx) return;
    const want = this.settings.music ? this.settings.style : null;
    if (want === this.musicStyle) return;
    this.music?.stop();
    this.music = null;
    this.musicStyle = want;
    if (want) {
      this.music = new Sequencer(this.ctx, this.musicBus!, STYLES[want]);
      this.music.play();
      this.note(`music:${want}`);
    }
  }

  private note(name: string): void {
    this.log.push(name);
    if (this.log.length > 300) this.log.splice(0, this.log.length - 300);
  }

  /** Plays a one-shot effect now (+ delay seconds). */
  play(name: string, recipe: Recipe, delay = 0): void {
    if (!this.ctx || !this.settings.sfx) return;
    this.note(name);
    recipe(this.ctx, this.sfxBus!, this.ctx.currentTime + 0.005 + delay);
  }

  /** Starts a continuous effect under `name` (no-op if already running). */
  hold(name: string, make: (ctx: BaseAudioContext, out: AudioNode) => Held): Held | null {
    if (!this.ctx || !this.settings.sfx) return null;
    const existing = this.held.get(name);
    if (existing) return existing;
    const h = make(this.ctx, this.sfxBus!);
    this.held.set(name, h);
    this.note(name);
    return h;
  }

  release(name: string): void {
    this.held.get(name)?.stop();
    this.held.delete(name);
  }

  heldNow(name: string): Held | undefined {
    return this.held.get(name);
  }

  /** Repeats `recipe` every `ms` (with optional random extra) until stopped. */
  loop(name: string, recipe: Recipe, ms: number, jitter = 0): void {
    if (this.loops.has(name) || !this.ctx || !this.settings.sfx) return;
    const tick = () => {
      this.play(name, recipe);
      this.loops.set(name, window.setTimeout(tick, ms + Math.random() * jitter));
    };
    tick();
  }

  stopLoop(name: string): void {
    clearTimeout(this.loops.get(name));
    this.loops.delete(name);
  }

  /** Stops every running loop and held sound (leaving the game screen, or effects switched off). */
  silenceEffects(): void {
    for (const name of [...this.held.keys()]) this.release(name);
    for (const name of [...this.loops.keys()]) this.stopLoop(name);
  }
}

export const audio = new AudioEngine();

// ---------- Game cues ----------

let chain = 0;
let lastExitAt: number | null = null;
let rolled = 0;
let ground: Ground = 'gravel';
let idleTimer = 0;

export const sound = {
  /** A drag starts: the diesel turns over. */
  dragStart(): void {
    audio.hold('diesel', fx.diesel);
  },
  /** The truck is moving `speed` cells/s; mud squelches and snow crunches every so often. */
  motion(speed: number, dt: number): void {
    audio.heldNow('diesel')?.set(speed);
    // No motion for a moment (finger held still): drop back to idle.
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => audio.heldNow('diesel')?.set(0), 120);
    rolled += Math.abs(speed) * dt;
    if (rolled >= STEP_CELLS) {
      rolled = 0;
      if (ground === 'mud') audio.play('squelch', fx.squelch);
      if (ground === 'snow') audio.play('crunch', fx.crunch);
    }
  },
  /** The truck has settled (or driven off): engine winds down. */
  dragEnd(): void {
    audio.release('diesel');
    this.reversing(false);
  },
  /** Backing up (away from its gate): the backup alarm beeps until it stops reversing. */
  reversing(on: boolean): void {
    if (on) audio.loop('beeper', fx.beep, 520);
    else audio.stopLoop('beeper');
  },
  bump(): void {
    audio.play('thud', fx.thud);
    audio.play('horn', fx.horn, 0.06);
  },
  /** Radio squelch: plays just before a driver's speech bubble. */
  radio(): void {
    audio.play('radio', fx.radio);
  },
  /** A truck drives out: gate clank and air brakes; quick exits in a row climb a horn chord. */
  exit(): void {
    audio.play('clank', fx.clank);
    audio.play('hiss', fx.airHiss, 0.12);
    const now = performance.now();
    chain = nextChain(lastExitAt, now, chain);
    lastExitAt = now;
    if (chain >= 1) {
      const lift = chordLift(chain);
      audio.play('horn-chord', (c, o, t) => fx.hornChord(c, o, t, lift), 0.05);
    }
  },
  /** Win screen: one clink per hard hat, then the ditty (par) or the sad trombone (+4 or worse). */
  win(hats: number, moves: number, par: number): void {
    for (let i = 0; i < hats; i++) audio.play('clink', (c, o, t) => fx.clink(c, o, t, i), 0.15 + i * 0.22);
    const cue = winCue(moves, par);
    const after = 0.25 + hats * 0.22;
    if (cue === 'ditty') audio.play('ditty', fx.ditty, after);
    if (cue === 'trombone') audio.play('trombone', fx.trombone, after);
  },
  /** The streak sign ticks up. */
  streakUp(): void {
    audio.play('stamp', fx.stamp, 0.9);
  },
  /** Ground for this level: birdsong over summer gravel; mud and snow sound under the wheels. */
  setGround(g: Ground | null): void {
    ground = g ?? 'gravel';
    chain = 0;
    lastExitAt = null;
    if (g === 'gravel') audio.loop('birds', fx.chirp, 4000, 5000);
    else audio.stopLoop('birds');
  },

  /** Off the game screen: no engines, birds or snoring left running. */
  quiet(): void {
    audio.silenceEffects();
  },

  // Gags
  squawk: () => audio.play('squawk', fx.squawk),
  plop: (delay = 0) => audio.play('plop', fx.plop, delay),
  grunt: () => audio.play('grunt', fx.grunt),
  doorBang: () => audio.play('door-bang', fx.doorBang),
  feet(on: boolean): void {
    if (on) audio.loop('feet', fx.footstep, 110);
    else audio.stopLoop('feet');
  },
  quad(state: 'start' | 'idle' | 'rev' | 'stop'): void {
    if (state === 'stop') return audio.release('quad');
    const h = audio.hold('quad', fx.quad);
    h?.set(state === 'idle' ? 0 : state === 'rev' ? 1 : 0.6);
  },
  snore(on: boolean): void {
    if (on) audio.loop('snore', fx.snore, 2800);
    else audio.stopLoop('snore');
  },
  clatter: () => audio.play('clatter', fx.clatter),
  cordSnap(): void {
    audio.play('cord-snap', fx.cordSnap);
    audio.play('crackle', fx.crackle, 0.02);
  },
};

/** Test hook: ?audiolog exposes the engine so end-to-end tests can see which cues fired. */
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('audiolog')) {
  (window as unknown as { __rhrAudio: AudioEngine }).__rhrAudio = audio;
}
