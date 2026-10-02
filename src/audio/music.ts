// Two quiet background loops, synthesized: 80s Synth and Chill Lo-fi.
// A style plays one 16th-note step at a time; the Sequencer schedules steps a little ahead.
import type { MusicStyle } from './settings.ts';
import { midi, noise, noiseBuffer, tone, type Ctx } from './synth.ts';

export interface Style {
  id: MusicStyle;
  bpm: number;
  /** 0..0.5: how late the off-beat 16ths land (swing feel). */
  swing: number;
  /** Chord tones (MIDI) per bar; the loop cycles through them. */
  chords: number[][];
  /** Bass root (MIDI) per bar. */
  roots: number[];
  /** Plays step 0..15 of `bar` at time t. `step16` is one 16th note in seconds. */
  play(ctx: Ctx, out: AudioNode, bar: number, step: number, t: number, step16: number): void;
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

export const STYLES: Record<MusicStyle, Style> = { synth, lofi };

/** Seconds per 16th note. */
export const step16 = (style: Style) => 60 / style.bpm / 4;

/** When step `i` (counting from 0) of a style lands, with swing on the off-beat 16ths. */
export function stepTime(style: Style, start: number, i: number): number {
  const s = step16(style);
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
  style.bed?.(ctx, out);
  for (let i = 0; stepTime(style, 0.05, i) < seconds; i++) {
    style.play(ctx, out, Math.floor(i / 16), i % 16, stepTime(style, 0.05, i), step16(style));
  }
}
