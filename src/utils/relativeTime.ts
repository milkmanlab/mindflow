import { t } from '../i18n';

/** これより短い経過時間は「たった今」と表示する（秒） */
const JUST_NOW_SECONDS = 5;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/** savedAt から now までの経過秒数（切り捨て）。時計のずれで未来になっているときは 0 */
export function getElapsedSeconds(savedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - savedAt) / 1000));
}

/** 経過秒数を「たった今」「◯秒前」「◯分前」「◯時間前」にする */
export function formatElapsedTime(elapsedSec: number): string {
  if (elapsedSec < JUST_NOW_SECONDS) return t('time.justNow');
  if (elapsedSec < SECONDS_PER_MINUTE) return t('time.secondsAgo', { n: elapsedSec });
  const min = Math.floor(elapsedSec / SECONDS_PER_MINUTE);
  if (min < MINUTES_PER_HOUR) return t('time.minutesAgo', { n: min });
  return t('time.hoursAgo', { n: Math.floor(min / MINUTES_PER_HOUR) });
}
