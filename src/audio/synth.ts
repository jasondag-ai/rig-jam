// Tiny synth building blocks on top of Web Audio: enveloped tones and filtered noise.
// Everything is scheduled at absolute context times, so recipes can be rendered offline too.

export type Ctx = BaseAudioContext;

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();

/** Two seconds of white noise, made once per context. */
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

export const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

export interface FilterSpec {
  type: BiquadFilterType;
  f: number;
  q?: number;
  /** Sweep the cutoff to this by the end. */
  f2?: number;
}

function filter(ctx: Ctx, spec: FilterSpec, t: number, dur: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = spec.type;
  f.frequency.setValueAtTime(spec.f, t);
  if (spec.f2) f.frequency.exponentialRampToValueAtTime(spec.f2, t + dur);
  f.Q.value = spec.q ?? 0.7;
  return f;
}

/** Attack to `gain`, then an exponential fall to silence by t + dur. */
function envelope(ctx: Ctx, t: number, dur: number, gain: number, attack: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
  return g;
}

export interface ToneSpec {
  type?: OscillatorType;
  f: number;
  /** Glide to this pitch by the end. */
  f2?: number;
  t: number;
  dur: number;
  gain: number;
  attack?: number;
  detune?: number;
  filter?: FilterSpec;
  /** Vibrato: rate (Hz) and depth (Hz). */
  vibrato?: [number, number];
}

/** One enveloped oscillator note. */
export function tone(ctx: Ctx, out: AudioNode, s: ToneSpec): void {
  const o = ctx.createOscillator();
  o.type = s.type ?? 'sine';
  o.frequency.setValueAtTime(s.f, s.t);
  if (s.f2) o.frequency.exponentialRampToValueAtTime(s.f2, s.t + s.dur * 0.9);
  if (s.detune) o.detune.value = s.detune;
  let node: AudioNode = o;
  if (s.filter) node = node.connect(filter(ctx, s.filter, s.t, s.dur));
  const g = envelope(ctx, s.t, s.dur, s.gain, s.attack ?? 0.005);
  node.connect(g).connect(out);
  if (s.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = s.vibrato[0];
    depth.gain.value = s.vibrato[1];
    lfo.connect(depth).connect(o.frequency);
    lfo.start(s.t);
    lfo.stop(s.t + s.dur + 0.05);
  }
  o.start(s.t);
  o.stop(s.t + s.dur + 0.05);
}

export interface NoiseSpec {
  t: number;
  dur: number;
  gain: number;
  attack?: number;
  filter: FilterSpec;
}

/** One enveloped burst of filtered noise. */
export function noise(ctx: Ctx, out: AudioNode, s: NoiseSpec): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const g = envelope(ctx, s.t, s.dur, s.gain, s.attack ?? 0.003);
  src.connect(filter(ctx, s.filter, s.t, s.dur)).connect(g).connect(out);
  src.start(s.t, Math.random() * 1.5);
  src.stop(s.t + s.dur + 0.05);
}

/** A handle for a sound that runs until told to stop. */
export interface Held {
  set(v: number): void;
  stop(): void;
}
