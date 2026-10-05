import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import daily from '../levels/daily.json' with { type: 'json' };
import manifest from './truck-sprites.json' with { type: 'json' };
import { THEMES } from './themes.ts';
import { GAG_TRIGGERS } from './gag-triggers.ts';
import { NIGHT, NUDGE_LINE, STARS, contrast, dimmed, isNight, luminance, nightRgba, nightSky, rgb, shaded } from './night.ts';

// Gate fills, kept in sync with :root in style.css (and tools/truck-sprites.py).
const GATES: Record<string, string> = { red: '#ff4747', blue: '#2f8bff', yellow: '#ffd21f', green: '#22c55e', orange: '#ff8a00', purple: '#a55cff' };
const paint = manifest.paint as Record<string, Record<string, { mean: string }>>;
/** The seasons that have night levels now: Montney's spring mud and Duvernay's winter. */
const NIGHT_THEMES = [THEMES.spring, THEMES.winter];

describe('night levels', () => {
  it('every level with a flare stack is flagged night in its JSON, and no other level is', () => {
    const night: string[] = [];
    for (const r of REGIONS)
      for (const [i, l] of r.levels.entries()) {
        const flare = l.obstacles.some((o) => o.kind === 'flare');
        expect(l.night === true, `${r.id} ${i + 1}`).toBe(flare);
        if (l.night) night.push(`${r.id} ${i + 1}`);
      }
    expect(night).toEqual(['montney 2', 'montney 8', 'montney 10', 'duvernay 4', 'duvernay 8', 'duvernay 10']);
    expect((daily as { night?: boolean }[]).some((l) => l.night)).toBe(false);
  });

  it('is data driven: the flag decides, and ?night=1 / ?night=0 force it for previews', () => {
    expect(isNight({ night: true }, '')).toBe(true);
    expect(isNight({}, '')).toBe(false);
    expect(isNight({}, '?night=1')).toBe(true);
    expect(isNight({ night: true }, '?night=0')).toBe(false);
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

  it('the nudge: 25 s with no move, in one settings file with the gag triggers', () => {
    expect(GAG_TRIGGERS.nightNudge.idleMs).toBe(25_000);
    expect(NUDGE_LINE).toBe("While we're young, Sonny, we don't have all day.");
    expect(NUDGE_LINE).not.toMatch(/[–—]/);
  });
});
