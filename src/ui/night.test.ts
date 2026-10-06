import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import daily from '../levels/daily.json' with { type: 'json' };
import manifest from './truck-sprites.json' with { type: 'json' };
import { THEMES } from './themes.ts';
import { GAG_TRIGGERS } from './gag-triggers.ts';
import { NIGHT, NUDGE_LINE, STARS, contrast, dimmed, nightComes, nightForced, luminance, nightRgba, nightSky, rgb, shaded } from './night.ts';

// Gate fills, kept in sync with :root in style.css (and tools/truck-sprites.py).
const GATES: Record<string, string> = { red: '#ff4747', blue: '#2f8bff', yellow: '#ffd21f', green: '#22c55e', orange: '#ff8a00', purple: '#a55cff' };
const paint = manifest.paint as Record<string, Record<string, { mean: string }>>;
/** The seasons that have night levels now: Montney's spring mud and Duvernay's winter. */
const NIGHT_THEMES = [THEMES.spring, THEMES.winter];

describe('night levels', () => {
  it('no level starts at night: no level carries a night flag any more, flare levels included', () => {
    for (const r of REGIONS) for (const l of r.levels) expect('night' in l, `${r.id} ${l.id}`).toBe(false);
    for (const l of daily as object[]) expect('night' in l).toBe(false);
  });

  it('night comes when the player goes idle: 30 s, a 4 s fade in, a 2 s fade back at the next move', () => {
    expect(GAG_TRIGGERS.night).toEqual({ idleMs: 30_000, fadeInMs: 4000, fadeOutMs: 2000, themes: ['spring', 'winter', 'fall', 'prairie'] });
    // Montney, Duvernay and Mannville go dark (and Bakken's prairie will). Cardium never does.
    for (const r of REGIONS) expect(nightComes(r.theme), r.id).toBe(r.id !== 'cardium');
    // ?night=1 pins it on and ?night=0 keeps it away (previews, screenshots, tests).
    expect(nightForced('')).toBeNull();
    expect(nightForced('?night=1')).toBe(true);
    expect(nightForced('?night=0')).toBe(false);
  });

  it('the ground drops to about half brightness or less, with a blue tint', () => {
    for (const theme of Object.values(THEMES)) {
      const pad = rgb(theme.vars['--pad']), night = shaded(pad, theme.ground);
      expect(luminance(night) / luminance(pad), theme.id).toBeLessThan(0.55);
      // Cooler: blue gains on red.
      expect(night[2] / night[0], theme.id).toBeGreaterThan(pad[2] / pad[0]);
    }
    expect(nightRgba('gravel')).toBe('rgba(8, 16, 48, 0.55)');
    expect(nightRgba('mud')).toBe('rgba(4, 9, 30, 0.6)');
    expect(NIGHT.alpha.snow).toBeGreaterThan(NIGHT.alpha.mud);
  });

  it('trucks and gates are dimmed far less than the ground', () => {
    expect(NIGHT.truck).toBeGreaterThanOrEqual(0.88);
    expect(NIGHT.gate).toBeGreaterThanOrEqual(0.9);
  });

  it.each(NIGHT_THEMES)('$id: every truck colour and every gate colour stands clear of the night pad', (theme) => {
    const pad = shaded(rgb(theme.vars['--pad']), theme.ground);
    for (const color of Object.keys(GATES)) {
      for (const kind of Object.keys(paint)) expect(contrast(dimmed(rgb(paint[kind][color].mean)), pad), `${kind} ${color} truck`).toBeGreaterThan(1.75);
      expect(contrast(dimmed(rgb(GATES[color]), NIGHT.gate), pad), `${color} gate`).toBeGreaterThan(1.9);
    }
  });

  it.each(NIGHT_THEMES)('$id: every truck is brighter than the night pad (it never sinks into the ground)', (theme) => {
    const pad = luminance(shaded(rgb(theme.vars['--pad']), theme.ground));
    for (const color of Object.keys(GATES)) for (const kind of Object.keys(paint)) expect(luminance(dimmed(rgb(paint[kind][color].mean))), `${kind} ${color}`).toBeGreaterThan(pad);
  });

  it('the sky: a dozen stars spread across it, and a moon only when there is room', () => {
    expect(STARS.length).toBeGreaterThanOrEqual(10);
    const withMoon = nightSky(390, 110, true), without = nightSky(390, 70, false);
    expect((withMoon.match(/class="star/g) ?? []).length).toBe(STARS.length);
    expect(withMoon).toContain('#f6efc8');
    expect(without).not.toContain('#f6efc8');
  });

  it('the nudge: 15 s after night has fully fallen, in one settings file with the gag triggers', () => {
    expect(GAG_TRIGGERS.nightNudge.afterNightMs).toBe(15_000);
    expect(NUDGE_LINE).toBe("While we're young, Sonny, we don't have all day.");
    expect(NUDGE_LINE).not.toMatch(/[\u2013\u2014]/);
  });
});
