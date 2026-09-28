// 日期一律用 'YYYY-MM-DD' 字串表示，並以台灣時間為準。

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export function todayInTaipei(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const dt = parse(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return format(dt);
}

/** 0 = 星期日 … 6 = 星期六 */
export function weekdayOf(date: string): number {
  return parse(date).getUTCDay();
}

export function weekdayName(date: string): string {
  return '星期' + WEEKDAY_NAMES[weekdayOf(date)];
}

export function weekdayShort(weekday: number): string {
  return WEEKDAY_NAMES[weekday];
}

/** 2026-09-26 → 2026年9月26日 */
export function formatGregorian(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/** 民國年：2026-09-26 → 民國115年 */
export function rocYear(date: string): number {
  return Number(date.slice(0, 4)) - 1911;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return format(parse(date)) === date;
}
