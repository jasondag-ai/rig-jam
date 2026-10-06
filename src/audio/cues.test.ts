import { describe, expect, it } from 'vitest';
import { CHAIN_MS, chordLift, nextChain, winCue } from './cues.ts';
import { DEFAULT_AUDIO, MUSIC_STYLES, parseAudioSettings } from './settings.ts';

describe('sound settings', () => {
  it('sound is OFF by default: no effects, no music; Country is the first style', () => {
    expect(DEFAULT_AUDIO).toEqual({ sfx: false, music: false, style: 'country' });
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO);
    expect(parseAudioSettings('not json')).toEqual(DEFAULT_AUDIO);
  });

  it('keeps valid choices and repairs bad ones', () => {
    expect(parseAudioSettings(JSON.stringify({ sfx: true, music: true, style: 'chill' }))).toEqual({ sfx: true, music: true, style: 'chill' });
    expect(parseAudioSettings(JSON.stringify({ sfx: 'yes', style: 'polka' }))).toEqual(DEFAULT_AUDIO);
  });

  it('offers three music styles; a style saved under the old synth engine keeps its nearest new one', () => {
    expect(MUSIC_STYLES.map((s) => s.name)).toEqual(['Country', '80s Retro', 'Chill']);
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
