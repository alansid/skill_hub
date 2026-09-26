import { addDays, todayInTaipei, weekdayOf } from './dates';
import type { ClinicSettings, DayOverride } from '../data/types';

export const DEFAULT_SLOTS = [
  '08:30', '09:10', '09:50', '10:30', '11:10',
  '14:30', '15:10', '16:30', '17:10',
  '19:30', '20:10',
];

/** 週二、三、四、六、日看診（0 = 星期日） */
export const DEFAULT_OPEN_WEEKDAYS = [0, 2, 3, 4, 6];

export const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: '任老師中醫',
  clinicPhone: '02-23022457',
  openWeekdays: DEFAULT_OPEN_WEEKDAYS,
  slots: DEFAULT_SLOTS,
  bookingWindowDays: 90,
  sameDayBooking: true,
  minHoursBeforeBooking: 0,
};

export type Period = '上午' | '下午' | '晚上';

export function periodOf(slot: string): Period {
  if (slot < '12:00') return '上午';
  if (slot < '18:00') return '下午';
  return '晚上';
}

export interface DaySchedule {
  /** 這天有沒有看診 */
  open: boolean;
  /** 這天開放的時段 */
  slots: string[];
  /** 是否因診所特別設定而與平常不同 */
  overridden: boolean;
  /** 平常這個星期幾是否看診 */
  regularOpen: boolean;
}

export function scheduleFor(
  date: string,
  settings: ClinicSettings,
  override: DayOverride | undefined,
): DaySchedule {
  const regularOpen = settings.openWeekdays.includes(weekdayOf(date));
  if (!override) {
    return {
      open: regularOpen,
      slots: regularOpen ? settings.slots : [],
      overridden: false,
      regularOpen,
    };
  }
  if (override.closed) {
    return { open: false, slots: [], overridden: true, regularOpen };
  }
  const slots = override.openSlots
    ? settings.slots.filter((s) => override.openSlots!.includes(s))
    : settings.slots;
  return { open: slots.length > 0, slots, overridden: true, regularOpen };
}

/**
 * 從 date 往前（-1）或往後（+1）找下一個看診日，自動跳過休診日。
 * 最多找 maxDays 天，找不到就回傳 null。
 */
export function nextOpenDay(
  date: string,
  direction: 1 | -1,
  settings: ClinicSettings,
  overrides: Map<string, DayOverride>,
  maxDays = 60,
): string | null {
  let d = date;
  for (let i = 0; i < maxDays; i++) {
    d = addDays(d, direction);
    if (scheduleFor(d, settings, overrides.get(d)).open) return d;
  }
  return null;
}

/** 整理時間格式：'9:5'、'1950'、'19：50' → '09:05'、'19:50'；格式不對回傳 null */
export function normalizeTime(input: string): string | null {
  const s = input.trim().replace('：', ':');
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(s) ?? /^(\d{1,2})(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 某天某時段的開始時刻（台灣時間） */
export function slotStart(date: string, slot: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = slot.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

/** 病人可以預約的日期範圍 */
export function bookingRange(settings: ClinicSettings, now: Date = new Date()): { from: string; to: string } {
  const today = todayInTaipei(now);
  return {
    from: settings.sameDayBooking ? today : addDays(today, 1),
    to: addDays(today, settings.bookingWindowDays),
  };
}

/**
 * 病人看得到的空時段：當天有開、還沒有人約、而且還沒過（含最晚預約時限）。
 * 與資料庫的 get_availability 規則相同（示範模式用）。
 */
export function patientAvailableSlots(
  date: string,
  settings: ClinicSettings,
  override: DayOverride | undefined,
  takenSlots: Set<string>,
  now: Date = new Date(),
): string[] {
  const { from, to } = bookingRange(settings, now);
  if (date < from || date > to) return [];
  const cutoff = now.getTime() + settings.minHoursBeforeBooking * 3600_000;
  return scheduleFor(date, settings, override).slots.filter(
    (s) => !takenSlots.has(s) && slotStart(date, s).getTime() > cutoff,
  );
}
