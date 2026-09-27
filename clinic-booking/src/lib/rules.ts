// 病人線上預約的規則。網頁（示範模式）和雲端後端共用這一份，確保規則一致。
import type {
  Booking,
  BookResult,
  BookingConfig,
  ClinicSettings,
  DayAvailability,
  DayOverride,
  MyBooking,
} from '../data/types';
import { addDays, todayInTaipei } from './dates';
import { isBookingPhone, maskName, normalizePhone } from './phone';
import { bookingRange, patientAvailableSlots, scheduleFor, slotStart } from './schedule';

type ActiveSlot = Pick<Booking, 'date' | 'slot'>;

export function bookingConfig(settings: ClinicSettings, now: Date = new Date()): BookingConfig {
  return {
    clinicName: settings.clinicName,
    clinicPhone: settings.clinicPhone,
    bookingWindowDays: settings.bookingWindowDays,
    sameDayBooking: settings.sameDayBooking,
    today: todayInTaipei(now),
  };
}

/** 一段期間內每個看診日還有空的時段（只含時間，不含任何病人資料） */
export function computeAvailability(
  settings: ClinicSettings,
  overrides: DayOverride[],
  active: ActiveSlot[],
  from: string,
  to: string,
  now: Date = new Date(),
): DayAvailability[] {
  const range = bookingRange(settings, now);
  const start = from < range.from ? range.from : from;
  const end = to > range.to ? range.to : to;
  const byDate = new Map(overrides.map((o) => [o.date, o]));
  const result: DayAvailability[] = [];
  for (let d = start, i = 0; d <= end && i < 200; d = addDays(d, 1), i++) {
    const o = byDate.get(d);
    const open = scheduleFor(d, settings, o);
    if (!open.open) continue;
    const taken = new Set(active.filter((b) => b.date === d).map((b) => b.slot));
    result.push({
      date: d,
      available: patientAvailableSlots(d, settings, o, taken, now),
      openCount: open.slots.length,
    });
  }
  return result;
}

/**
 * 檢查病人送出的資料與時段是否可以預約（不含「有沒有人搶先」，那部分由資料庫保證）。
 * 可以預約回傳 null，否則回傳原因。
 */
export function validateOnlineBooking(
  input: { date: string; slot: string; name: string; phone: string },
  settings: ClinicSettings,
  override: DayOverride | undefined,
  now: Date = new Date(),
): Exclude<BookResult, 'ok' | 'slot_taken' | 'too_many'> | null {
  const name = input.name.trim();
  if (!name || [...name].length > 30) return 'invalid_name';
  if (!isBookingPhone(normalizePhone(input.phone))) return 'invalid_phone';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.slot)) return 'slot_unavailable';
  const range = bookingRange(settings, now);
  if (input.date > range.to) return 'too_far';
  if (input.date < range.from) return 'too_late';
  if (!scheduleFor(input.date, settings, override).slots.includes(input.slot)) return 'slot_unavailable';
  const cutoff = now.getTime() + settings.minMinutesBeforeBooking * 60_000;
  if (slotStart(input.date, input.slot).getTime() <= cutoff) return 'too_late';
  return null;
}

/** 病人查詢自己的預約：只列尚未看診、未取消的，姓名遮蔽 */
export function myBookingsView(bookings: Booking[], settings: ClinicSettings, now: Date = new Date()): MyBooking[] {
  const cancelCutoff = now.getTime() + settings.minHoursBeforeCancel * 3600_000;
  return bookings
    .filter((b) => b.status === 'booked' && slotStart(b.date, b.time ?? b.slot).getTime() > now.getTime())
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
    .map((b) => ({
      id: b.id,
      date: b.date,
      time: b.time ?? b.slot,
      maskedName: maskName(b.name),
      canCancel: slotStart(b.date, b.time ?? b.slot).getTime() > cancelCutoff,
    }));
}

/** 病人線上取消前檢查時間 */
export function canPatientCancel(b: Pick<Booking, 'date' | 'slot' | 'time'>, settings: ClinicSettings, now: Date = new Date()): boolean {
  return slotStart(b.date, b.time ?? b.slot).getTime() > now.getTime() + settings.minHoursBeforeCancel * 3600_000;
}
