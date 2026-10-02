import { describe, expect, it } from 'vitest';
import { STYLES, renderStyle, stepTime } from './music.ts';
import * as fx from './sfx.ts';

/** A do-nothing stand-in for Web Audio that counts the nodes a recipe makes. */
function fakeCtx() {
  let nodes = 0;
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
    };
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
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, out: node() as unknown as AudioNode, count: () => nodes };
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

  it('swing delays only the off-beat sixteenths', () => {
    const s = STYLES.country;
    const step = 60 / s.bpm / 4;
    expect(stepTime(s, 0, 2)).toBeCloseTo(2 * step);
    expect(stepTime(s, 0, 3)).toBeGreaterThan(3 * step);
  });
});
