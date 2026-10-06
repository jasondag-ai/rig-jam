// FEEDBACK (Job O): a "Send feedback" row in Settings. No accounts and no forms on other sites:
// it shows a plain email address to copy, and a Copy button that puts the address on the clipboard
// together with the three things a bug report always needs: the app's version, the phone, and
// the level the player was last on. The player pastes that into their own mail app.
import { versionText } from './version.ts';

/**
 * WHERE FEEDBACK GOES. Jay: put the address here (one place). While it is empty the row is not
 * shown. (`?feedback=name@example.com` shows the row with that address: tests and previews.)
 */
export const FEEDBACK_EMAIL = '';

export const feedbackEmail = (search: string = typeof location === 'undefined' ? '' : location.search): string => {
  const test = new URLSearchParams(search).get('feedback') ?? '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test) ? test : FEEDBACK_EMAIL;
};

/** The phone, as well as a browser will say: "iPhone, iOS 17.5", "Pixel 7a, Android 14", else its platform. */
export function phoneModel(ua: string, platform = ''): string {
  const ios = /\((iPhone|iPad|iPod)[^)]*? OS (\d+)_(\d+)/.exec(ua);
  if (ios) return `${ios[1]}, iOS ${ios[2]}.${ios[3]}`;
  const android = /Android (\d+(?:\.\d+)?)(?:; ([^;)]+?))?(?: Build\/[^;)]*)?[;)]/.exec(ua);
  if (android) return `${android[2] && android[2] !== 'K' ? android[2].trim() : 'Android phone'}, Android ${android[1]}`;
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return platform || 'Unknown device';
}

const LAST_LEVEL_KEY = 'rush-hour-rigs:last-level';
/** Remembers the level the player is on, for feedback (its own key: Reset progress leaves it). */
export function rememberLevel(label: string): void {
  try {
    localStorage.setItem(LAST_LEVEL_KEY, label);
  } catch {
    // Not remembered; fine.
  }
}
export function lastLevel(): string {
  try {
    return localStorage.getItem(LAST_LEVEL_KEY) ?? 'none yet';
  } catch {
    return 'none yet';
  }
}

/** What the Copy button copies: the address, then version, phone and level, ready to paste into an email. */
export function feedbackText(email: string, info: { version: string; phone: string; screen: string; level: string }): string {
  return [`To: ${email}`, 'Subject: Rush Hour Rigs feedback', '', 'What happened:', '', '', '---', info.version, `Phone: ${info.phone} (${info.screen})`, `Level: ${info.level}`].join('\n');
}

/** The same, read off this phone. */
export const feedbackNow = (email: string): string =>
  feedbackText(email, { version: versionText(), phone: phoneModel(navigator.userAgent, navigator.platform), screen: `${window.innerWidth} x ${window.innerHeight}`, level: lastLevel() });
