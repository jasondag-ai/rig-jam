import { describe, expect, it } from 'vitest';
import { STYLES, renderStyle, stepTime, stringBuffer } from './music.ts';
import * as fx from './sfx.ts';

/** A do-nothing stand-in for Web Audio that counts the nodes a recipe makes. */
function fakeCtx() {
  let nodes = 0;
  const made: Record<string, unknown>[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime(v: number) {
      if (!(v > 0)) throw new Error('exponential ramp to ' + v);
    },
    setTargetAtTime() {},
    cancelScheduledValues() {},
  });
  const node = (): Record<string, unknown> => {
    nodes++;
    const n: Record<string, unknown> = {
      frequency: param(),
      detune: param(),
      gain: param(),
      Q: param(),
      playbackRate: param(),
      connect: (to: unknown) => to,
      disconnect() {},
      start() {},
      stop() {},
      setPeriodicWave() {
        n.type = 'custom';
      },
    };
    made.push(n);
    return n;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createDynamicsCompressor: node,
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBuffer: (_c: number, len: number) => {
      const data = new Float32Array(len);
      return { length: len, getChannelData: () => data };
    },
    createPeriodicWave: () => ({}),
  };
  return { ctx: ctx as unknown as BaseAudioContext, out: node() as unknown as AudioNode, count: () => nodes, made };
}

describe('sound recipes', () => {
  it('every one-shot effect schedules some sound', () => {
    const recipes = Object.entries(fx).filter(
      ([name, f]) => typeof f === 'function' && !['diesel', 'quad', 'unlockBlip', 'noiseBuffer', 'hornChord', 'clink', 'hotshot'].includes(name),
    ) as [string, (c: BaseAudioContext, o: AudioNode, t: number) => void][];
    expect(recipes.length).toBeGreaterThan(15);
    for (const [name, play] of recipes) {
      const { ctx, out, count } = fakeCtx();
      const before = count();
      play(ctx, out, 0.1);
      expect(count() - before, name).toBeGreaterThan(0);
    }
    const { ctx, out } = fakeCtx();
    for (let i = 0; i < 6; i++) fx.hornChord(ctx, out, 0, i * 2);
    for (let i = 0; i < 3; i++) fx.clink(ctx, out, 0, i);
    fx.hotshot(ctx, out, 0, 0.8, true);
    fx.hotshot(ctx, out, 0, 0.6, false);
  });

  it('held sounds start, follow their control and stop', () => {
    const { ctx, out } = fakeCtx();
    for (const make of [fx.diesel, fx.quad]) {
      const h = make(ctx, out);
      h.set(0);
      h.set(5);
      h.stop();
    }
  });
});

describe('music', () => {
  it('each style renders a few bars', () => {
    for (const style of Object.values(STYLES)) {
      const { ctx, out, count } = fakeCtx();
      renderStyle(ctx, out, style, 6);
      expect(count(), style.id).toBeGreaterThan(50);
    }
  });

  it('the three styles really are different', () => {
    const [a, b, c] = Object.values(STYLES);
    const tempos = new Set([a.bpm, b.bpm, c.bpm]);
    expect(tempos.size).toBe(3);
    expect(new Set([a, b, c].map((s) => JSON.stringify(s.chords))).size).toBe(3);
    expect(a.swing).toBe(0);
    expect(c.swing).toBeGreaterThan(b.swing);
  });

  it('country is real strings and steel: no square or sawtooth anywhere', () => {
    const { ctx, out, made } = fakeCtx();
    renderStyle(ctx, out, STYLES.country, 20);
    const types = new Set(made.map((n) => n.type).filter(Boolean));
    expect(types.has('square') || types.has('sawtooth'), [...types].join(',')).toBe(false);
    expect(types.has('custom')).toBe(true); // the pedal steel
    expect(STYLES.country.bpm).toBe(100);
    expect(STYLES.country.chords).toHaveLength(4);
  });

  it('a plucked string rings and dies away like a string', () => {
    const { ctx } = fakeCtx();
    const { buf, rate } = stringBuffer(ctx, 55, { decay: 0.996, bright: 0.45, dur: 2 });
    const d = buf.getChannelData(0);
    const rms = (a: number, b: number) => Math.sqrt(d.slice(a, b).reduce((x, y) => x + y * y, 0) / (b - a));
    expect(rms(0, 800)).toBeGreaterThan(rms(12000, 12800) * 3);
    expect(rms(12000, 12800)).toBeGreaterThan(0);
    expect(rate).toBeGreaterThan(0.97);
    expect(rate).toBeLessThan(1.03);
  });

  it('shuffle delays the off-beat 8th; 16th swing delays the off-beat 16ths', () => {
    const c = STYLES.country;
    const c16 = 60 / c.bpm / 4;
    expect(stepTime(c, 0, 4)).toBeCloseTo(4 * c16);
    expect(stepTime(c, 0, 2)).toBeGreaterThan(2 * c16 + 0.3 * c16);
    const s = STYLES.lofi;
    const step = 60 / s.bpm / 4;
    expect(stepTime(s, 0, 2)).toBeCloseTo(2 * step);
    expect(stepTime(s, 0, 3)).toBeGreaterThan(3 * step);
  });
});
