// Every sound effect, synthesized. Each recipe schedules its notes at time `t` on `out`.
// Continuous sounds (diesel, quad) return a Held handle.
import { midi, noise, noiseBuffer, tone, type Ctx, type Held } from './synth.ts';

type Recipe = (ctx: Ctx, out: AudioNode, t: number) => void;

// ---------- Trucks ----------

/** Diesel rumble: low saw + square, chugging, brighter and louder with drag speed (cells/s). */
export function diesel(ctx: Ctx, out: AudioNode): Held {
  const t = ctx.currentTime;
  const level = ctx.createGain();
  level.gain.value = 0.0001;
  level.gain.setTargetAtTime(0.07, t, 0.05);
  const chug = ctx.createGain();
  chug.gain.value = 0.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  a.type = 'sawtooth';
  b.type = 'square';
  a.frequency.value = 40;
  b.frequency.value = 80.5;
  const bg = ctx.createGain();
  bg.gain.value = 0.35;
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 8;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.35;
  lfo.connect(lfoDepth).connect(chug.gain);
  a.connect(lp);
  b.connect(bg).connect(lp);
  lp.connect(chug).connect(level).connect(out);
  for (const o of [a, b, lfo]) o.start(t);
  return {
    set(speed: number) {
      const s = Math.min(1, Math.abs(speed) / 8);
      const now = ctx.currentTime;
      a.frequency.setTargetAtTime(40 + s * 34, now, 0.06);
      b.frequency.setTargetAtTime(80.5 + s * 68, now, 0.06);
      lp.frequency.setTargetAtTime(220 + s * 900, now, 0.06);
      lfo.frequency.setTargetAtTime(8 + s * 16, now, 0.06);
      level.gain.setTargetAtTime(0.07 + s * 0.13, now, 0.06);
    },
    stop() {
      const now = ctx.currentTime;
      level.gain.cancelScheduledValues(now);
      level.gain.setTargetAtTime(0.0001, now, 0.08);
      for (const o of [a, b, lfo]) o.stop(now + 0.5);
    },
  };
}

/** Heavy low thud: a bump. */
export const thud: Recipe = (ctx, out, t) => {
  tone(ctx, out, { f: 120, f2: 42, t, dur: 0.22, gain: 0.7 });
  noise(ctx, out, { t, dur: 0.12, gain: 0.35, filter: { type: 'lowpass', f: 380 } });
};

/** A short, slightly sour truck horn. */
export const horn: Recipe = (ctx, out, t) => {
  for (const [f, d] of [
    [311, 0],
    [392, 6],
  ])
    tone(ctx, out, { type: 'sawtooth', f, t, dur: 0.22, gain: 0.12, attack: 0.02, detune: d, filter: { type: 'bandpass', f: 1100, q: 0.9 } });
};

/** Backup alarm: one beep (the engine repeats it while reversing). */
export const beep: Recipe = (ctx, out, t) => {
  tone(ctx, out, { type: 'square', f: 1040, t, dur: 0.26, gain: 0.09, attack: 0.005, filter: { type: 'lowpass', f: 3000 } });
};

/** Radio squelch: "kssht" plus a click, just before a driver talks. */
export const radio: Recipe = (ctx, out, t) => {
  tone(ctx, out, { type: 'square', f: 1350, t, dur: 0.03, gain: 0.08 });
  noise(ctx, out, { t: t + 0.02, dur: 0.16, gain: 0.22, filter: { type: 'bandpass', f: 1900, q: 1.6 } });
};

/** Gate clank: struck steel, inharmonic and short. */
export const clank: Recipe = (ctx, out, t) => {
  for (const [f, g, d] of [
    [420, 0.22, 0.45],
    [1130, 0.12, 0.3],
    [1760, 0.08, 0.22],
    [2630, 0.05, 0.15],
  ])
    tone(ctx, out, { type: 'triangle', f, t, dur: d, gain: g, attack: 0.002 });
  noise(ctx, out, { t, dur: 0.05, gain: 0.3, filter: { type: 'highpass', f: 2500 } });
};

/** Air-brake hiss: "psssht". */
export const airHiss: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.75, gain: 0.2, attack: 0.04, filter: { type: 'highpass', f: 3800, f2: 2600 } });
};

/** Rising horn chord for back-to-back exits. `lift` semitones up. */
export function hornChord(ctx: Ctx, out: AudioNode, t: number, lift: number): void {
  const root = 57 + lift;
  for (const n of [root, root + 4, root + 7])
    tone(ctx, out, { type: 'sawtooth', f: midi(n), t, dur: 0.55, gain: 0.07, attack: 0.03, detune: Math.random() * 8 - 4, filter: { type: 'lowpass', f: 2200 } });
}

/** Hard hat clink: hollow plastic tok. `i` raises it a little for each hat. */
export function clink(ctx: Ctx, out: AudioNode, t: number, i: number): void {
  const f = 1250 * [1, 1.26, 1.5][i % 3];
  tone(ctx, out, { f, t, dur: 0.16, gain: 0.3, attack: 0.002 });
  tone(ctx, out, { type: 'triangle', f: f * 2.7, t, dur: 0.06, gain: 0.12, attack: 0.001 });
}

/** Short celebration ditty at par. */
export const ditty: Recipe = (ctx, out, t) => {
  const notes = [72, 76, 79, 84, 79, 84];
  const lens = [0.12, 0.12, 0.12, 0.24, 0.12, 0.5];
  let at = t;
  notes.forEach((n, i) => {
    tone(ctx, out, { type: 'square', f: midi(n), t: at, dur: lens[i] * 1.3, gain: 0.08, filter: { type: 'lowpass', f: 3200 } });
    at += lens[i];
  });
  for (const n of [48, 55, 60]) tone(ctx, out, { type: 'triangle', f: midi(n), t: at - 0.5, dur: 0.8, gain: 0.12 });
};

/** Sad trombone: wah, wah, wah, waaahh. */
export const trombone: Recipe = (ctx, out, t) => {
  [55, 54, 53, 52].forEach((n, i) => {
    const last = i === 3;
    tone(ctx, out, {
      type: 'sawtooth',
      f: midi(n),
      t: t + i * 0.42,
      dur: last ? 1.3 : 0.38,
      gain: 0.12,
      attack: 0.05,
      filter: { type: 'lowpass', f: 1100, f2: last ? 500 : 800, q: 2 },
      vibrato: last ? [5.5, 6] : undefined,
    });
  });
};

/** Stamp thump: the streak sign ticks up. */
export const stamp: Recipe = (ctx, out, t) => {
  tone(ctx, out, { f: 95, f2: 38, t, dur: 0.3, gain: 0.7 });
  noise(ctx, out, { t, dur: 0.08, gain: 0.4, filter: { type: 'lowpass', f: 900 } });
};

// ---------- Ground ----------

/** A little bird call (summer ambience). */
export const chirp: Recipe = (ctx, out, t) => {
  const base = 2600 + Math.random() * 1200;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(ctx, out, { f: base, f2: base * 1.45, t: t + i * 0.11, dur: 0.07, gain: 0.05, attack: 0.005 });
};

/** Mud squelch under the wheels. */
export const squelch: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.18, gain: 0.12, attack: 0.02, filter: { type: 'lowpass', f: 900, f2: 180, q: 6 } });
  tone(ctx, out, { f: 180, f2: 90, t, dur: 0.12, gain: 0.08 });
};

/** Snow crunch under the wheels: a few crisp grains. */
export const crunch: Recipe = (ctx, out, t) => {
  for (let i = 0; i < 4; i++) noise(ctx, out, { t: t + i * 0.025 + Math.random() * 0.01, dur: 0.03, gain: 0.07, filter: { type: 'bandpass', f: 3500 + Math.random() * 2500, q: 1.5 } });
};

// ---------- Gags ----------

/** Magpie: "chak-chak". */
export const squawk: Recipe = (ctx, out, t) => {
  for (let i = 0; i < 3; i++) {
    tone(ctx, out, { type: 'sawtooth', f: 1300, f2: 820, t: t + i * 0.13, dur: 0.1, gain: 0.08, filter: { type: 'bandpass', f: 1700, q: 2 } });
    noise(ctx, out, { t: t + i * 0.13, dur: 0.08, gain: 0.07, filter: { type: 'bandpass', f: 2800, q: 1.2 } });
  }
};

/** One dropping landing: plop. */
export const plop: Recipe = (ctx, out, t) => {
  tone(ctx, out, { f: 720, f2: 170, t, dur: 0.1, gain: 0.25 });
  noise(ctx, out, { t, dur: 0.03, gain: 0.06, filter: { type: 'lowpass', f: 1500 } });
};

/** A grumbly "Seriously?": a vowel-ish buzz through mouth-shaped filters, three syllables. */
export const grunt: Recipe = (ctx, out, t) => {
  const contour: [number, number, number][] = [
    [150, 165, 0.16],
    [175, 150, 0.12],
    [160, 205, 0.26],
  ];
  let at = t;
  for (const [f, f2, d] of contour) {
    for (const [form, g] of [
      [650, 0.12],
      [1150, 0.08],
      [2500, 0.03],
    ])
      tone(ctx, out, { type: 'sawtooth', f, f2, t: at, dur: d, gain: g, attack: 0.02, filter: { type: 'bandpass', f: form, q: 5 } });
    at += d + 0.03;
  }
};

/** The biffy door slamming open: thud plus a plastic rattle. */
export const doorBang: Recipe = (ctx, out, t) => {
  tone(ctx, out, { f: 150, f2: 60, t, dur: 0.2, gain: 0.5 });
  noise(ctx, out, { t, dur: 0.3, gain: 0.25, filter: { type: 'bandpass', f: 850, q: 3 } });
  noise(ctx, out, { t: t + 0.08, dur: 0.15, gain: 0.12, filter: { type: 'bandpass', f: 1600, q: 4 } });
};

/** One tiny shuffling footstep (the engine repeats it). */
export const footstep: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.035, gain: 0.07, filter: { type: 'bandpass', f: 1800 + Math.random() * 600, q: 1.2 } });
};

/** Quad engine: buzzy two-stroke. set(0..1) = throttle. */
export function quad(ctx: Ctx, out: AudioNode): Held {
  const t = ctx.currentTime;
  const level = ctx.createGain();
  level.gain.value = 0.0001;
  level.gain.setTargetAtTime(0.08, t, 0.1);
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  a.type = 'square';
  b.type = 'sawtooth';
  a.frequency.value = 62;
  b.frequency.value = 125;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 24;
  const depth = ctx.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth).connect(trem.gain);
  a.connect(lp);
  b.connect(lp);
  lp.connect(trem).connect(level).connect(out);
  for (const o of [a, b, lfo]) o.start(t);
  return {
    set(throttle: number) {
      const now = ctx.currentTime;
      a.frequency.setTargetAtTime(62 + throttle * 55, now, 0.12);
      b.frequency.setTargetAtTime(125 + throttle * 110, now, 0.12);
      lp.frequency.setTargetAtTime(800 + throttle * 1200, now, 0.12);
    },
    stop() {
      const now = ctx.currentTime;
      level.gain.cancelScheduledValues(now);
      level.gain.setTargetAtTime(0.0001, now, 0.15);
      for (const o of [a, b, lfo]) o.stop(now + 0.8);
    },
  };
}

/** One snore: a raspy in-breath, then a soft out-breath (the engine repeats it). */
export const snore: Recipe = (ctx, out, t) => {
  tone(ctx, out, { type: 'sawtooth', f: 58, f2: 64, t, dur: 1.1, gain: 0.07, attack: 0.5, filter: { type: 'lowpass', f: 380, q: 3 } });
  noise(ctx, out, { t, dur: 1.1, gain: 0.05, attack: 0.5, filter: { type: 'lowpass', f: 500 } });
  noise(ctx, out, { t: t + 1.3, dur: 0.9, gain: 0.025, attack: 0.3, filter: { type: 'bandpass', f: 1200, q: 0.8 } });
};

/** A pail clattering over: a handful of tinny clanks, settling. */
export const clatter: Recipe = (ctx, out, t) => {
  let at = t;
  for (let i = 0; i < 6; i++) {
    const f = 700 + Math.random() * 900;
    tone(ctx, out, { type: 'triangle', f, t: at, dur: 0.12, gain: 0.16 * (1 - i * 0.13), attack: 0.002 });
    tone(ctx, out, { type: 'square', f: f * 2.3, t: at, dur: 0.05, gain: 0.04, attack: 0.001 });
    at += 0.05 + Math.random() * 0.09;
  }
};

/** Block heater cord ripping out: a sharp snap. */
export const cordSnap: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.05, gain: 0.45, filter: { type: 'highpass', f: 1500 } });
  tone(ctx, out, { type: 'square', f: 2200, f2: 240, t, dur: 0.08, gain: 0.12 });
};

/** Spark crackle: a scatter of tiny electrical clicks. */
export const crackle: Recipe = (ctx, out, t) => {
  for (let i = 0; i < 14; i++) noise(ctx, out, { t: t + Math.random() * 0.5, dur: 0.008, gain: 0.12, filter: { type: 'bandpass', f: 4500, q: 2 } });
};

// ---------- Wildlife and traffic ----------

/** Bear straining: a low, rough "hnnngh" that wavers. */
export const bearGrunt: Recipe = (ctx, out, t) => {
  for (const [form, g] of [
    [420, 0.22],
    [900, 0.1],
  ])
    tone(ctx, out, { type: 'sawtooth', f: 78, f2: 92, t, dur: 0.75, gain: g, attack: 0.08, vibrato: [11, 6], filter: { type: 'bandpass', f: form, q: 4 } });
  noise(ctx, out, { t, dur: 0.6, gain: 0.05, attack: 0.1, filter: { type: 'lowpass', f: 500 } });
};

/** Bear huff: two short breathy chuffs through the nose. */
export const bearHuff: Recipe = (ctx, out, t) => {
  for (let i = 0; i < 2; i++) {
    noise(ctx, out, { t: t + i * 0.22, dur: 0.16, gain: 0.3, attack: 0.01, filter: { type: 'bandpass', f: 600, q: 1.5, f2: 300 } });
    tone(ctx, out, { f: 95, f2: 70, t: t + i * 0.22, dur: 0.14, gain: 0.18 });
  }
};

/** Rabbit squeak: a quick high peep that jumps up. */
export const rabbitSqueak: Recipe = (ctx, out, t) => {
  tone(ctx, out, { type: 'triangle', f: 1900, f2: 3100, t, dur: 0.09, gain: 0.12 });
  tone(ctx, out, { type: 'triangle', f: 2300, f2: 3600, t: t + 0.11, dur: 0.14, gain: 0.12, vibrato: [30, 120] });
};

/** Moose: a long, low, mournful groan that sags at the end. */
export const mooseGroan: Recipe = (ctx, out, t) => {
  for (const [form, g] of [
    [380, 0.2],
    [760, 0.09],
    [1500, 0.03],
  ])
    tone(ctx, out, { type: 'sawtooth', f: 118, f2: 82, t, dur: 1.5, gain: g, attack: 0.25, vibrato: [4.5, 3], filter: { type: 'bandpass', f: form, q: 6 } });
};

/** Eyes popping open: a quick cartoon blip that jumps up. */
export const pop: Recipe = (ctx, out, t) => {
  tone(ctx, out, { f: 380, f2: 1100, t, dur: 0.07, gain: 0.18 });
};

/** A fast arm swing: a short whoosh of air. */
export const swish: Recipe = (ctx, out, t) => {
  noise(ctx, out, { t, dur: 0.16, gain: 0.16, attack: 0.05, filter: { type: 'bandpass', f: 700, q: 1.2, f2: 2600 } });
};

/** Shaking off like a wet dog: a fluttery brrr. */
export const shake: Recipe = (ctx, out, t) => {
  for (let i = 0; i < 7; i++) noise(ctx, out, { t: t + i * 0.055, dur: 0.04, gain: 0.09, filter: { type: 'bandpass', f: 1400 + (i % 2) * 700, q: 1.5 } });
};

/**
 * Hot shot pickup screaming past: engine roar that drops in pitch as it passes (doppler), a whoosh
 * of air, panned left to right (or right to left) across `dur` seconds.
 */
export function hotshot(ctx: Ctx, out: AudioNode, t: number, dur = 0.8, leftToRight = true): void {
  const pan = ctx.createStereoPanner?.();
  const dest: AudioNode = pan ?? out;
  if (pan) {
    pan.pan.setValueAtTime(leftToRight ? -0.9 : 0.9, t);
    pan.pan.linearRampToValueAtTime(leftToRight ? 0.9 : -0.9, t + dur);
    pan.connect(out);
  }
  const mid = t + dur * 0.5;
  // Engine: approaching = higher, receding = lower, loudest as it passes.
  for (const [type, mul, g] of [
    ['sawtooth', 1, 0.12],
    ['square', 2.01, 0.05],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(150 * mul, t);
    o.frequency.linearRampToValueAtTime(140 * mul, mid - 0.06);
    o.frequency.exponentialRampToValueAtTime(92 * mul, mid + 0.08);
    o.frequency.linearRampToValueAtTime(86 * mul, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2600, mid);
    lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(g, mid);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    o.connect(lp).connect(env).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
  // Air whoosh, peaking as it passes.
  noise(ctx, dest, { t, dur: dur + 0.1, gain: 0.22, attack: dur * 0.5, filter: { type: 'bandpass', f: 500, q: 0.8, f2: 1800 } });
  // Gravel spitting off the tires.
  for (let i = 0; i < 10; i++) noise(ctx, dest, { t: t + Math.random() * dur, dur: 0.01, gain: 0.08, filter: { type: 'bandpass', f: 3500, q: 2 } });
}

/** Silent, one sample: plays on the first tap to unlock audio on older iOS. */
export function unlockBlip(ctx: Ctx): void {
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  src.connect(ctx.destination);
  src.start(0);
}

export { noiseBuffer };
