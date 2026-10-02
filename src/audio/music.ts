// Three quiet background loops, synthesized: 80s Synth, Country Twang, Chill Lo-fi.
// A style plays one 16th-note step at a time; the Sequencer schedules steps a little ahead.
import type { MusicStyle } from './settings.ts';
import { midi, noise, noiseBuffer, tone, type Ctx } from './synth.ts';

export interface Style {
  id: MusicStyle;
  bpm: number;
  /** 0..0.5: how late the off-beats land (swing feel). */
  swing: number;
  /** Swing the off-beat 16ths (default) or 8ths (shuffle). */
  swingUnit?: 8 | 16;
  /** Chord tones (MIDI) per bar; the loop cycles through them. */
  chords: number[][];
  /** Bass root (MIDI) per bar. */
  roots: number[];
  /** Plays step 0..15 of `bar` at time t. `step16` is one 16th note in seconds. */
  play(ctx: Ctx, out: AudioNode, bar: number, step: number, t: number, step16: number): void;
  /** Build anything slow (string buffers) before the first note. */
  prepare?(ctx: Ctx): void;
  /** Continuous bed (e.g. vinyl hiss) while the style plays; returns a stopper. */
  bed?(ctx: Ctx, out: AudioNode): () => void;
}

const kick = (ctx: Ctx, out: AudioNode, t: number, g: number, from = 140) => tone(ctx, out, { f: from, f2: 42, t, dur: 0.28, gain: g });

/** 80s Synth: minor-key pads, pumping saw bass, gated snare, a glassy arpeggio. 112 bpm. */
const synth: Style = {
  id: 'synth',
  bpm: 112,
  swing: 0,
  chords: [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55, 60],
    [55, 59, 62],
  ],
  roots: [33, 29, 36, 31],
  play(ctx, out, bar, step, t, s16) {
    const chord = this.chords[bar % 4];
    const root = this.roots[bar % 4];
    if (step % 2 === 0) {
      tone(ctx, out, { type: 'sawtooth', f: midi(root + (step % 4 === 2 ? 12 : 0)), t, dur: s16 * 1.8, gain: 0.16, filter: { type: 'lowpass', f: 700, f2: 250, q: 4 } });
    }
    if (step === 0) {
      for (const n of chord)
        for (const d of [-7, 7])
          tone(ctx, out, { type: 'sawtooth', f: midi(n), t, dur: s16 * 16, gain: 0.025, attack: 0.35, detune: d, filter: { type: 'lowpass', f: 1300 } });
    }
    if (step % 4 === 3) {
      const n = chord[(step >> 2) % chord.length] + 12;
      tone(ctx, out, { type: 'square', f: midi(n), t, dur: s16 * 0.9, gain: 0.03, filter: { type: 'lowpass', f: 2600 } });
    }
    if (step === 0 || step === 8) kick(ctx, out, t, 0.4);
    if (step === 4 || step === 12) {
      noise(ctx, out, { t, dur: 0.16, gain: 0.18, filter: { type: 'bandpass', f: 1800, q: 0.8 } });
      tone(ctx, out, { f: 190, t, dur: 0.09, gain: 0.12 });
    }
    if (step % 2 === 0) noise(ctx, out, { t, dur: 0.03, gain: 0.03, filter: { type: 'highpass', f: 7500 } });
  },
};

// ---------- Country: plucked strings (Karplus-Strong), pedal steel, upright bass, brushes ----------

interface StringTone {
  /** Loss per trip round the string (closer to 1 = longer ring). */
  decay: number;
  /** 0..1: how bright the pluck is (lowpass on the noise burst that excites the string). */
  bright: number;
  /** Seconds of sound to compute. */
  dur: number;
}

const GUITAR: StringTone = { decay: 0.996, bright: 0.45, dur: 2.2 };
const BANJO: StringTone = { decay: 0.985, bright: 0.85, dur: 1.1 };
const UPRIGHT: StringTone = { decay: 0.992, bright: 0.07, dur: 1.4 };

const strings = new WeakMap<Ctx, Map<string, { buf: AudioBuffer; rate: number }>>();

/**
 * Karplus-Strong: a burst of noise circulating round a delay line one period long, averaged each
 * trip, so it rings and mellows like a plucked string. Computed once per note and tone, then reused.
 * `rate` retunes it exactly (the delay line is a whole number of samples).
 */
export function stringBuffer(ctx: Ctx, n: number, s: StringTone): { buf: AudioBuffer; rate: number } {
  let cache = strings.get(ctx);
  if (!cache) strings.set(ctx, (cache = new Map()));
  const key = `${n}:${s.decay}:${s.bright}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const f = midi(n);
  const N = Math.max(2, Math.round(sr / f));
  const len = Math.floor(sr * s.dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let lp = 0;
  let mean = 0;
  for (let i = 0; i < N && i < len; i++) {
    lp += s.bright * (Math.random() * 2 - 1 - lp);
    d[i] = lp;
    mean += lp / N;
  }
  for (let i = 0; i < N && i < len; i++) d[i] -= mean; // no DC thump
  for (let i = N; i < len; i++) d[i] = s.decay * 0.5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
  const out = { buf, rate: (f * N) / sr };
  cache.set(key, out);
  return out;
}

/** Slight human looseness: a few ms early or late (never before now), and a little louder or softer. */
const loose = (ctx: Ctx, t: number, ms = 7) => Math.max(ctx.currentTime, t + (Math.random() - 0.5) * 2 * (ms / 1000));
const vel = (g: number) => g * (0.85 + Math.random() * 0.3);

/** One plucked string. `mute` damps it after that many seconds (palm-muted "chick"). */
function pluck(ctx: Ctx, out: AudioNode, n: number, t: number, gain: number, tone: StringTone, mute?: number): void {
  const { buf, rate } = stringBuffer(ctx, n, tone);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  if (mute) g.gain.setTargetAtTime(0.0001, t + mute * 0.5, mute * 0.25);
  src.connect(g).connect(out);
  src.start(t);
  src.stop(t + (mute ? mute * 2 : tone.dur) + 0.1);
}

/** A strum across `notes` (low to high), down or up, about 12ms between strings. */
function strum(ctx: Ctx, out: AudioNode, notes: number[], t: number, gain: number, up: boolean, mute?: number): void {
  const order = up ? [...notes].reverse() : notes;
  const at = loose(ctx, t);
  order.forEach((n, i) => pluck(ctx, out, n, at + i * (0.01 + Math.random() * 0.006), vel(gain) * (up ? 0.7 : 1), GUITAR, mute));
}

const steelWaves = new WeakMap<Ctx, PeriodicWave>();

/** Pedal steel voice: a warm, round wave (sine plus soft upper harmonics; no square or saw). */
function steelWave(ctx: Ctx): PeriodicWave {
  let w = steelWaves.get(ctx);
  if (!w) {
    const amps = [0, 1, 0.42, 0.26, 0.12, 0.07, 0.035, 0.02];
    w = ctx.createPeriodicWave(new Float32Array(amps), new Float32Array(amps.length));
    steelWaves.set(ctx, w);
  }
  return w;
}

/** A pedal steel note: swells in, slides up from `from` semitones below, then a slow vibrato blooms. */
function steel(ctx: Ctx, out: AudioNode, n: number, t: number, dur: number, gain: number, from: number): void {
  const o = ctx.createOscillator();
  o.setPeriodicWave(steelWave(ctx));
  const f = midi(n);
  o.frequency.setValueAtTime(midi(n + from), t);
  o.frequency.exponentialRampToValueAtTime(f, t + (from ? 0.22 : 0.01));
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(0, t + 0.3);
  depth.gain.linearRampToValueAtTime(f * 0.007, t + 0.3 + Math.min(0.5, dur * 0.5));
  lfo.connect(depth).connect(o.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const g = ctx.createGain();
  // Volume-pedal swell: no pick attack.
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.14);
  g.gain.setValueAtTime(gain, t + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.3);
  lfo.stop(t + dur + 0.3);
}

/** Brushes: a long swish on the backbeat, light taps in between. */
function brush(ctx: Ctx, out: AudioNode, t: number, swish: boolean): void {
  if (swish) noise(ctx, out, { t: loose(ctx, t, 5), dur: 0.24, gain: vel(0.05), attack: 0.025, filter: { type: 'bandpass', f: 2600, q: 0.6, f2: 3600 } });
  else noise(ctx, out, { t: loose(ctx, t, 5), dur: 0.05, gain: vel(0.022), attack: 0.004, filter: { type: 'highpass', f: 5200 } });
}

/** Open-position guitar voicings (low to high) for G, C, D. */
const OPEN = { G: [43, 47, 50, 55, 59, 67], C: [48, 52, 55, 60, 64], D: [50, 57, 62, 66] };
/** Steel lead over the first four bars of each eight: [bar, step, note, length in 16ths, slide from]. */
const STEEL_LICK: [number, number, number, number, number][] = [
  [0, 0, 71, 6, -2],
  [0, 8, 74, 8, -2],
  [1, 0, 76, 6, -2],
  [1, 8, 72, 7, -1],
  [2, 0, 71, 14, -2],
  [3, 0, 69, 6, -2],
  [3, 8, 66, 4, -1],
  [3, 12, 67, 4, 0],
];
/** Banjo forward roll (8ths) over the next four bars: thumb on the high G drone, then index, middle. */
const ROLL = ['T', 'I', 'M', 'T', 'I', 'M', 'T', 'M'] as const;
/** Banjo index and middle notes for G, C, G, D. */
const BANJO_TONES = [
  [62, 71],
  [64, 72],
  [62, 71],
  [62, 66 + 12],
];

/**
 * Country Twang: boom-chick upright bass (root on 1, fifth on 3) under muted guitar strums on 2 and 4,
 * pedal steel answering banjo rolls, brushed snare. I-IV-I-V in G, 100 bpm, light shuffle.
 */
const country: Style = {
  id: 'country',
  bpm: 100,
  swing: 0.2,
  swingUnit: 8,
  chords: [OPEN.G, OPEN.C, OPEN.G, OPEN.D],
  roots: [43, 36, 43, 38],
  prepare(ctx) {
    for (const chord of this.chords) for (const n of chord) stringBuffer(ctx, n, GUITAR);
    for (const n of [36, 38, 42, 43, 45]) stringBuffer(ctx, n, UPRIGHT);
    for (const n of [62, 64, 67, 71, 72, 78]) stringBuffer(ctx, n, BANJO);
  },
  play(ctx, out, bar, step, t) {
    const b = bar % 4;
    const chord = this.chords[b];
    const root = this.roots[b];
    // Upright bass: boom on 1 (root), the fifth on 3; a walk up into G at the end of the D bar.
    if (step === 0) pluck(ctx, out, root, loose(ctx, t, 4), vel(0.3), UPRIGHT, 0.55);
    if (step === 8) pluck(ctx, out, root === 36 ? 43 : root === 38 ? 45 : 38, loose(ctx, t, 4), vel(0.26), UPRIGHT, 0.5);
    if (b === 3 && step === 12) pluck(ctx, out, 42, loose(ctx, t, 4), vel(0.22), UPRIGHT, 0.3);
    // Guitar: muted chick on 2 and 4, a light upstroke on the "and" of 4.
    if (step === 4 || step === 12) strum(ctx, out, chord.slice(-4), t, 0.038, false, 0.2);
    if (step === 14) strum(ctx, out, chord.slice(-3), t, 0.028, true, 0.14);
    // Brushes.
    if (step === 4 || step === 12) brush(ctx, out, t, true);
    else if (step % 2 === 0) brush(ctx, out, t, false);
    // Steel sings the first half of every eight bars; banjo rolls through the second half.
    const phrase = bar % 8;
    if (phrase < 4) {
      for (const [lb, ls, n, len, from] of STEEL_LICK)
        if (lb === phrase && ls === step) steel(ctx, out, n, loose(ctx, t, 10), len * step16(this), vel(0.04), from);
    } else if (step % 2 === 0) {
      const finger = ROLL[step / 2];
      const n = finger === 'T' ? 67 : BANJO_TONES[b][finger === 'I' ? 0 : 1];
      pluck(ctx, out, n, loose(ctx, t, 6), vel(finger === 'T' ? 0.028 : 0.038), BANJO);
    }
  },
};

/** Chill Lo-fi: dusty electric-piano 7ths and 9ths, lazy swung drums, vinyl crackle. 76 bpm. */
const lofi: Style = {
  id: 'lofi',
  bpm: 76,
  swing: 0.24,
  chords: [
    [50, 53, 57, 60, 64],
    [43, 53, 59, 64],
    [48, 52, 55, 59, 62],
    [45, 48, 52, 55, 59],
  ],
  roots: [38, 31, 36, 33],
  play(ctx, out, bar, step, t, s16) {
    const chord = this.chords[bar % 4];
    if (step === 0 || step === 10) {
      const g = step === 0 ? 0.045 : 0.025;
      chord.forEach((n, i) => {
        tone(ctx, out, { f: midi(n), t: t + i * 0.008, dur: s16 * 12, gain: g, attack: 0.015, filter: { type: 'lowpass', f: 1700 } });
        tone(ctx, out, { type: 'triangle', f: midi(n + 12), t: t + i * 0.008, dur: s16 * 4, gain: g * 0.25, attack: 0.01 });
      });
    }
    if (step === 0 || step === 8) tone(ctx, out, { f: midi(this.roots[bar % 4]), t, dur: s16 * 6, gain: 0.18 });
    if (step === 0 || step === 7) kick(ctx, out, t, 0.32, 110);
    if (step === 4 || step === 12) {
      noise(ctx, out, { t, dur: 0.18, gain: 0.07, filter: { type: 'bandpass', f: 1300, q: 1 } });
      tone(ctx, out, { f: 220, t, dur: 0.06, gain: 0.05 });
    }
    if (step % 2 === 0) noise(ctx, out, { t, dur: 0.04, gain: 0.015, filter: { type: 'bandpass', f: 7000, q: 1 } });
    if (Math.random() < 0.35) noise(ctx, out, { t: t + Math.random() * s16, dur: 0.004, gain: 0.05, filter: { type: 'bandpass', f: 3000, q: 1 } });
  },
  bed(ctx, out) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.value = 0.008;
    src.connect(bp).connect(g).connect(out);
    src.start();
    return () => src.stop();
  },
};

export const STYLES: Record<MusicStyle, Style> = { synth, country, lofi };

/** Seconds per 16th note. */
export const step16 = (style: Style) => 60 / style.bpm / 4;

/** When step `i` (counting from 0) of a style lands, with swing on the off-beat 16ths or 8ths. */
export function stepTime(style: Style, start: number, i: number): number {
  const s = step16(style);
  // Shuffle: the off-beat 8th lands late; the 16ths either side of it follow along halfway.
  if (style.swingUnit === 8) return start + i * s + [0, 1, 2, 1][i % 4] * style.swing * s;
  return start + i * s + (i % 2 === 1 ? style.swing * s : 0);
}

/** Plays a style live, scheduling each step a little ahead of time. */
export class Sequencer {
  private ctx: Ctx;
  private out: AudioNode;
  private style: Style;
  private i = 0;
  private start = 0;
  private timer = 0;
  private stopBed: (() => void) | null = null;

  constructor(ctx: Ctx, out: AudioNode, style: Style) {
    this.ctx = ctx;
    this.out = out;
    this.style = style;
  }

  play(): void {
    this.start = this.ctx.currentTime + 0.1;
    this.i = 0;
    this.style.prepare?.(this.ctx);
    this.stopBed = this.style.bed?.(this.ctx, this.out) ?? null;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop(): void {
    clearInterval(this.timer);
    this.stopBed?.();
    this.stopBed = null;
  }

  private schedule(): void {
    const ahead = this.ctx.currentTime + 0.15;
    while (stepTime(this.style, this.start, this.i) < ahead) {
      const t = stepTime(this.style, this.start, this.i);
      this.style.play(this.ctx, this.out, Math.floor(this.i / 16), this.i % 16, t, step16(this.style));
      this.i++;
    }
  }
}

/** Schedules `seconds` of a style all at once (for offline rendering and tests). */
export function renderStyle(ctx: Ctx, out: AudioNode, style: Style, seconds: number): void {
  style.prepare?.(ctx);
  style.bed?.(ctx, out);
  for (let i = 0; stepTime(style, 0.05, i) < seconds; i++) {
    style.play(ctx, out, Math.floor(i / 16), i % 16, stepTime(style, 0.05, i), step16(style));
  }
}
