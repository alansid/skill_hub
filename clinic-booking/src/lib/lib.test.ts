import { describe, expect, it } from 'vitest';
import { addDays, formatGregorian, todayInTaipei, weekdayName } from './dates';
import { formatLunar } from './lunar';
import { formatPhone, normalizePhone } from './phone';
import { DEFAULT_SETTINGS, nextOpenDay, normalizeTime, periodOf, scheduleFor } from './schedule';
import type { DayOverride } from '../data/types';

describe('日期', () => {
  it('以台灣時間判斷今天', () => {
    // UTC 9/25 17:00 = 台灣 9/26 01:00
    expect(todayInTaipei(new Date('2026-09-25T17:00:00Z'))).toBe('2026-09-26');
  });
  it('星期與跨月', () => {
    expect(weekdayName('2026-09-26')).toBe('星期六');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(formatGregorian('2026-09-26')).toBe('2026年9月26日');
  });
});

describe('農曆（繁體）', () => {
  it('一般日期', () => expect(formatLunar('2026-09-25')).toBe('農曆 丙午年 八月十五'));
  it('臘月', () => expect(formatLunar('2026-01-20')).toBe('農曆 乙巳年 臘月初二'));
  it('閏月', () => expect(formatLunar('2025-07-25')).toBe('農曆 乙巳年 閏六月初一'));
  it('春節', () => expect(formatLunar('2026-02-17')).toBe('農曆 丙午年 正月初一'));
});

describe('電話', () => {
  it('整理與顯示', () => {
    expect(normalizePhone('0912-345 678')).toBe('0912345678');
    expect(formatPhone('0912345678')).toBe('0912-345-678');
    expect(formatPhone('0223022457')).toBe('02-2302-2457');
  });
});

describe('看診日與時段', () => {
  const s = DEFAULT_SETTINGS;
  it('週一、週五休診，其他看診日開 11 個時段', () => {
    expect(scheduleFor('2026-09-28', s, undefined).open).toBe(false); // 一
    expect(scheduleFor('2026-10-02', s, undefined).open).toBe(false); // 五
    expect(scheduleFor('2026-09-29', s, undefined).slots).toHaveLength(11); // 二
    expect(scheduleFor('2026-09-27', s, undefined).open).toBe(true); // 日
  });
  it('臨時休診與只開部分時段', () => {
    const closed: DayOverride = { date: '2026-09-29', closed: true, openSlots: null, note: '' };
    expect(scheduleFor('2026-09-29', s, closed).open).toBe(false);
    const partial: DayOverride = { date: '2026-09-29', closed: false, openSlots: ['19:30', '14:30'], note: '' };
    expect(scheduleFor('2026-09-29', s, partial).slots).toEqual(['14:30', '19:30']);
  });
  it('休診的星期一可以特別開診', () => {
    const special: DayOverride = { date: '2026-09-28', closed: false, openSlots: null, note: '' };
    expect(scheduleFor('2026-09-28', s, special).open).toBe(true);
  });
  it('上一天／下一天自動跳過休診日', () => {
    const ov = new Map<string, DayOverride>([
      ['2026-09-29', { date: '2026-09-29', closed: true, openSlots: null, note: '' }],
    ]);
    // 週日 9/27 → 跳過週一 9/28 與臨時休診的週二 9/29 → 週三 9/30
    expect(nextOpenDay('2026-09-27', 1, s, ov)).toBe('2026-09-30');
    // 週二 10/6 往前 → 跳過週一、週五 → 週日 10/4
    expect(nextOpenDay('2026-10-06', -1, s, new Map())).toBe('2026-10-04');
  });
  it('時間格式', () => {
    expect(normalizeTime('19:50')).toBe('19:50');
    expect(normalizeTime('1950')).toBe('19:50');
    expect(normalizeTime('9：5')).toBe('09:05');
    expect(normalizeTime('25:00')).toBeNull();
    expect(periodOf('11:10')).toBe('上午');
    expect(periodOf('17:10')).toBe('下午');
    expect(periodOf('19:30')).toBe('晚上');
  });
});
