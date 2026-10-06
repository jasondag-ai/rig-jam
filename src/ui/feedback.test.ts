import { describe, expect, it } from 'vitest';
import { FEEDBACK_EMAIL, feedbackEmail, feedbackText, phoneModel } from './feedback.ts';

describe('feedback', () => {
  it('names the phone as well as a browser will say', () => {
    expect(phoneModel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('iPhone, iOS 17.5');
    expect(phoneModel('Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15')).toBe('iPad, iOS 16.7');
    expect(phoneModel('Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36')).toBe('Pixel 7a, Android 14');
    expect(phoneModel('Mozilla/5.0 (Linux; Android 13; SM-A536W Build/TP1A.220624.014) AppleWebKit/537.36')).toBe('SM-A536W, Android 13');
    // (Chrome now hides the model behind "K".)
    expect(phoneModel('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36')).toBe('Android phone, Android 10');
    expect(phoneModel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')).toBe('Mac');
    expect(phoneModel('', 'Linux armv8')).toBe('Linux armv8');
    expect(phoneModel('')).toBe('Unknown device');
  });

  it('copies the address with the app version, the phone and the level, ready to paste into an email', () => {
    const text = feedbackText('rigs@example.com', { version: 'Version 0.9.0 (a1b2c3d)', phone: 'iPhone, iOS 17.5', screen: '390 x 844', level: 'Montney 3' });
    expect(text.split('\n')[0]).toBe('To: rigs@example.com');
    expect(text).toContain('Version 0.9.0 (a1b2c3d)');
    expect(text).toContain('Phone: iPhone, iOS 17.5 (390 x 844)');
    expect(text).toContain('Level: Montney 3');
    expect(text).not.toMatch(/https?:/);
    expect(text).not.toMatch(/[—–]/);
  });

  it('the address lives in one place; a test address can stand in; nonsense cannot', () => {
    expect(feedbackEmail('')).toBe(FEEDBACK_EMAIL);
    expect(feedbackEmail('?feedback=beta@example.com')).toBe('beta@example.com');
    expect(feedbackEmail('?feedback=not-an-address')).toBe(FEEDBACK_EMAIL);
    expect(feedbackEmail('?feedback=a b@c.d')).toBe(FEEDBACK_EMAIL);
  });
});
