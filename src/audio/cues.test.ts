import { describe, expect, it } from 'vitest';
import { CHAIN_MS, chordLift, nextChain, winCue } from './cues.ts';
import { DEFAULT_AUDIO, MUSIC_STYLES, parseAudioSettings } from './settings.ts';

describe('sound settings', () => {
  it('EFFECTS are on for a new player, MUSIC is off; Country is the first style', () => {
    expect(DEFAULT_AUDIO).toEqual({ sfx: true, music: false, style: 'country' });
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO);
    expect(parseAudioSettings('not json')).toEqual(DEFAULT_AUDIO);
  });

  // Job U30: the new default must never overrule somebody who has already chosen. A player who
  // turned the effects OFF keeps them off on every later visit, however the default moves.
  it('a player who already chose keeps their choice, in either direction', () => {
    expect(parseAudioSettings(JSON.stringify({ sfx: false, music: false, style: 'country' })).sfx).toBe(false);
    expect(parseAudioSettings(JSON.stringify({ sfx: false, music: true, style: 'chill' }))).toEqual({ sfx: false, music: true, style: 'chill' });
    expect(parseAudioSettings(JSON.stringify({ sfx: true, music: false, style: 'country' })).sfx).toBe(true);
    // Only a missing or non-boolean value falls back to the default.
    expect(parseAudioSettings(JSON.stringify({ music: true, style: 'country' })).sfx).toBe(DEFAULT_AUDIO.sfx);
  });

  it('keeps valid choices and repairs bad ones', () => {
    expect(parseAudioSettings(JSON.stringify({ sfx: true, music: true, style: 'chill' }))).toEqual({ sfx: true, music: true, style: 'chill' });
    expect(parseAudioSettings(JSON.stringify({ sfx: 'yes', style: 'polka' }))).toEqual(DEFAULT_AUDIO);
  });

  it('offers four music styles, Country the default; a style saved under the old synth engine keeps its nearest new one', () => {
    expect(MUSIC_STYLES.map((s) => s.name)).toEqual(['Country', '80s Retro', 'Chill', 'Classic Rock']);
    expect(parseAudioSettings(null).style).toBe('country');
    expect(parseAudioSettings(JSON.stringify({ sfx: true, music: true, style: 'classic' }))).toEqual({ sfx: true, music: true, style: 'classic' });
    expect(parseAudioSettings(JSON.stringify({ sfx: true, music: true, style: 'synth' }))).toEqual({ sfx: true, music: true, style: 'retro' });
    expect(parseAudioSettings(JSON.stringify({ style: 'lofi' })).style).toBe('chill');
  });
});

describe('exit horn chord', () => {
  it('starts on the second exit in a row and climbs with each quick exit', () => {
    let chain = nextChain(null, 0, 0);
    expect(chain).toBe(0);
    chain = nextChain(0, 1200, chain);
    expect(chain).toBe(1);
    expect(chordLift(chain)).toBe(0);
    chain = nextChain(1200, 3000, chain);
    expect(chain).toBe(2);
    expect(chordLift(chain)).toBe(2);
  });

  it('resets after a pause', () => {
    expect(nextChain(0, CHAIN_MS + 1, 3)).toBe(0);
  });
});

describe('win jingle', () => {
  it('ditty at par, trombone at par +4 or worse, nothing in between', () => {
    expect(winCue(8, 8)).toBe('ditty');
    expect(winCue(9, 8)).toBeNull();
    expect(winCue(11, 8)).toBeNull();
    expect(winCue(12, 8)).toBe('trombone');
  });
});
