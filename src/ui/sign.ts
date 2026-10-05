// The "DAYS WITHOUT INCIDENT" site safety sign for the Daily Pad streak.
import type { Streak } from './daily.ts';

export function streakSignHtml(s: Streak, compact = false): string {
  return `
    <div class="safety-sign${compact ? ' compact' : ''}" role="img" aria-label="Days without incident: ${s.days}">
      <span class="bolt tl"></span><span class="bolt tr"></span><span class="bolt bl"></span><span class="bolt br"></span>
      <div class="sign-head">⛑ SAFETY FIRST</div>
      <div class="sign-main">
        <span class="sign-label">DAYS WITHOUT INCIDENT</span>
        <span class="sign-count">${s.days}</span>
      </div>
    </div>`;
}
