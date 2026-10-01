// The "DAYS WITHOUT INCIDENT" site safety sign for the Daily Pad streak.
import { dayNumber, type Streak } from './daily.ts';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Thu" style weekday name for a 'YYYY-MM-DD' key. */
const weekday = (key: string) => DAY_NAMES[(dayNumber(key) + 4) % 7];

export function standDownText(s: Streak): string {
  const used = s.savedDays[0];
  if (!s.standDownReady && used) return `Safety Stand-Down used ${weekday(used)} · streak saved`;
  return 'Safety Stand-Down ready this week';
}

export function streakSignHtml(s: Streak, compact = false): string {
  return `
    <div class="safety-sign${compact ? ' compact' : ''}" role="img" aria-label="Days without incident: ${s.days}">
      <span class="bolt tl"></span><span class="bolt tr"></span><span class="bolt bl"></span><span class="bolt br"></span>
      <div class="sign-head">⛑ SAFETY FIRST</div>
      <div class="sign-main">
        <span class="sign-label">DAYS WITHOUT INCIDENT</span>
        <span class="sign-count">${s.days}</span>
      </div>
      <div class="sign-foot${s.standDownReady ? '' : ' used'}">${standDownText(s)}</div>
    </div>`;
}
