import { describe, expect, it } from 'vitest';
import { STYLES, renderStyle, stepTime } from './music.ts';
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
      ([name, f]) => typeof f === 'function' && !['diesel', 'quad', 'unlockBlip', 'noiseBuffer', 'hornChord', 'clink', 'hotshot', 'putter'].includes(name),
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
    fx.putter(ctx, out, 0, 1.2);
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

  it('two styles, and they really are different', () => {
    const { synth, lofi } = STYLES;
    expect(Object.keys(STYLES)).toEqual(['synth', 'lofi']);
    expect(synth.bpm).not.toBe(lofi.bpm);
    expect(JSON.stringify(synth.chords)).not.toBe(JSON.stringify(lofi.chords));
    expect(synth.swing).toBe(0);
    expect(lofi.swing).toBeGreaterThan(0);
  });

  it('swing delays only the off-beat sixteenths', () => {
    const s = STYLES.lofi;
    const step = 60 / s.bpm / 4;
    expect(stepTime(s, 0, 2)).toBeCloseTo(2 * step);
    expect(stepTime(s, 0, 3)).toBeGreaterThan(3 * step);
  });
});
