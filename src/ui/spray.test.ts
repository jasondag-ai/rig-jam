import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES, MAX_PER_FRAME, particlesFor } from './spray.ts';

describe('wheel spray budget', () => {
  it('throws nothing when the truck is nearly still', () => {
    expect(particlesFor(0.2, 1 / 60, 0, 0).count).toBe(0);
  });

  it('throws more the faster the truck goes', () => {
    const slow = { count: 0, carry: 0 };
    const fast = { count: 0, carry: 0 };
    let cs = 0;
    let cf = 0;
    for (let i = 0; i < 60; i++) {
      const s = particlesFor(1.5, 1 / 60, cs, 0);
      cs = s.carry;
      slow.count += s.count;
      const f = particlesFor(8, 1 / 60, cf, 0);
      cf = f.carry;
      fast.count += f.count;
    }
    expect(fast.count).toBeGreaterThan(slow.count * 3);
  });

  it('caps particles per frame and in total', () => {
    expect(particlesFor(50, 1, 0, 0).count).toBe(MAX_PER_FRAME);
    expect(particlesFor(50, 1, 0, MAX_PARTICLES - 1).count).toBe(1);
    expect(particlesFor(50, 1, 0, MAX_PARTICLES).count).toBe(0);
  });
});
