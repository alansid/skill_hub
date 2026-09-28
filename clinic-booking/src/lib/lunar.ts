import { Solar } from 'lunar-javascript';

// 農曆工具輸出的是簡體字，這裡換成繁體。
const TO_TRADITIONAL: Record<string, string> = { 闰: '閏', 腊: '臘' };

function toTraditional(s: string): string {
  return s.replace(/[闰腊]/g, (c) => TO_TRADITIONAL[c]);
}

/** 2026-09-26 → { year: '丙午', month: '八月', day: '十六' } */
export function lunarOf(date: string): { year: string; month: string; day: string } {
  const [y, m, d] = date.split('-').map(Number);
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  return {
    year: lunar.getYearInGanZhi(),
    month: toTraditional(lunar.getMonthInChinese()) + '月',
    day: lunar.getDayInChinese(),
  };
}

/** 2026-09-26 → 農曆 丙午年 八月十六 */
export function formatLunar(date: string): string {
  const l = lunarOf(date);
  return `農曆 ${l.year}年 ${l.month}${l.day}`;
}
