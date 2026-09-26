import { createClient } from '@supabase/supabase-js';
import { load, save } from '../data/demoApi';
import { addDays, todayInTaipei } from '../lib/dates';
import { normalizePhone, isMobile, maskName } from '../lib/phone';
import { DEFAULT_SETTINGS, patientAvailableSlots, scheduleFor, bookingRange, slotStart } from '../lib/schedule';

// 病人預約頁使用的資料操作。病人只能：看設定、看哪些時段有空、送出預約。
// 完全無法讀取任何其他病人的資料。

export interface BookingConfig {
  clinicName: string;
  clinicPhone: string;
  bookingWindowDays: number;
  sameDayBooking: boolean;
  /** 台灣時間的今天 */
  today: string;
}

export interface DayAvailability {
  date: string;
  /** 還有空的時段 */
  available: string[];
  /** 這天總共開放幾個時段 */
  openCount: number;
}

export type BookResult =
  | 'ok'
  | 'invalid_name'
  | 'invalid_phone'
  | 'slot_unavailable'
  | 'too_far'
  | 'too_late'
  | 'slot_taken'
  | 'already_booked_that_day'
  | 'too_many';

/** 病人查到的自己的預約（姓名已遮蔽） */
export interface MyBooking {
  id: string;
  date: string;
  /** 實際時間（有調整過就是調整後的時間） */
  time: string;
  maskedName: string;
  canCancel: boolean;
}

export type CancelResult = 'ok' | 'not_found' | 'already_cancelled' | 'too_late';

export interface PatientApi {
  readonly mode: 'demo' | 'supabase';
  getConfig(): Promise<BookingConfig>;
  getAvailability(from: string, to: string): Promise<DayAvailability[]>;
  book(date: string, slot: string, name: string, phone: string): Promise<BookResult>;
  findMyBookings(phone: string): Promise<MyBooking[]>;
  cancelMyBooking(phone: string, id: string): Promise<CancelResult>;
}

function createSupabasePatientApi(url: string, key: string): PatientApi {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    mode: 'supabase',
    async getConfig() {
      const { data, error } = await sb.rpc('get_booking_config').single();
      if (error || !data) throw new Error('無法連線，請稍後再試');
      const d = data as {
        clinic_name: string;
        clinic_phone: string;
        booking_window_days: number;
        same_day_booking: boolean;
        today: string;
      };
      return {
        clinicName: d.clinic_name,
        clinicPhone: d.clinic_phone,
        bookingWindowDays: d.booking_window_days,
        sameDayBooking: d.same_day_booking,
        today: d.today,
      };
    },
    async getAvailability(from, to) {
      const { data, error } = await sb.rpc('get_availability', { p_from: from, p_to: to });
      if (error) throw new Error('無法取得可預約時段，請稍後再試');
      return ((data ?? []) as { date: string; available: string[]; open_count: number }[]).map((r) => ({
        date: r.date,
        available: r.available,
        openCount: r.open_count,
      }));
    },
    async book(date, slot, name, phone) {
      const { data, error } = await sb.rpc('create_online_booking', {
        p_date: date,
        p_slot: slot,
        p_name: name,
        p_phone: phone,
      });
      if (error) throw new Error('預約送出失敗，請稍後再試，或來電預約');
      return data as BookResult;
    },
    async findMyBookings(phone) {
      const { data, error } = await sb.rpc('find_my_bookings', { p_phone: phone });
      if (error) {
        if (error.message.includes('rate_limited')) throw new Error('查詢次數太多，請稍後再試，或來電詢問。');
        if (error.message.includes('invalid_phone')) throw new Error('請輸入正確的手機號碼（09 開頭，共 10 碼）。');
        throw new Error('查詢失敗，請稍後再試，或來電詢問。');
      }
      return (
        (data ?? []) as {
          id: string;
          date: string;
          slot: string;
          actual_time: string | null;
          masked_name: string;
          can_cancel: boolean;
        }[]
      ).map((r) => ({
        id: r.id,
        date: r.date,
        time: r.actual_time ?? r.slot,
        maskedName: r.masked_name,
        canCancel: r.can_cancel,
      }));
    },
    async cancelMyBooking(phone, id) {
      const { data, error } = await sb.rpc('cancel_my_booking', { p_phone: phone, p_id: id });
      if (error) throw new Error('取消失敗，請稍後再試，或來電取消。');
      return data as CancelResult;
    },
  };
}

function createDemoPatientApi(): PatientApi {
  const settings = DEFAULT_SETTINGS;
  return {
    mode: 'demo',
    async getConfig() {
      return {
        clinicName: settings.clinicName,
        clinicPhone: settings.clinicPhone,
        bookingWindowDays: settings.bookingWindowDays,
        sameDayBooking: settings.sameDayBooking,
        today: todayInTaipei(),
      };
    },
    async getAvailability(from, to) {
      const store = load();
      const overrides = new Map(store.overrides.map((o) => [o.date, o]));
      const range = bookingRange(settings);
      const result: DayAvailability[] = [];
      for (let d = from < range.from ? range.from : from; d <= to && d <= range.to; d = addDays(d, 1)) {
        const open = scheduleFor(d, settings, overrides.get(d));
        if (!open.open) continue;
        const taken = new Set(store.bookings.filter((b) => b.date === d && b.status === 'booked').map((b) => b.slot));
        result.push({
          date: d,
          available: patientAvailableSlots(d, settings, overrides.get(d), taken),
          openCount: open.slots.length,
        });
      }
      return result;
    },
    async book(date, slot, name, phone) {
      const store = load();
      const digits = normalizePhone(phone);
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 30) return 'invalid_name';
      if (!isMobile(digits)) return 'invalid_phone';
      const overrides = new Map(store.overrides.map((o) => [o.date, o]));
      const active = store.bookings.filter((b) => b.status === 'booked');
      if (active.some((b) => b.date === date && b.slot === slot)) return 'slot_taken';
      const taken = new Set(active.filter((b) => b.date === date).map((b) => b.slot));
      if (!patientAvailableSlots(date, settings, overrides.get(date), taken).includes(slot)) return 'slot_unavailable';
      if (active.some((b) => b.date === date && b.phone === digits)) return 'already_booked_that_day';
      const today = todayInTaipei();
      if (active.filter((b) => b.phone === digits && b.source === 'online' && b.date >= today).length >= 3) {
        return 'too_many';
      }
      const now = new Date().toISOString();
      store.bookings.push({
        id: crypto.randomUUID(),
        date,
        slot,
        time: null,
        name: trimmed,
        phone: digits,
        note: '',
        status: 'booked',
        isExtra: false,
        source: 'online',
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        cancelledBy: null,
      });
      save(store);
      return 'ok';
    },
    async findMyBookings(phone) {
      const digits = normalizePhone(phone);
      if (!isMobile(digits)) throw new Error('請輸入正確的手機號碼（09 開頭，共 10 碼）。');
      const now = Date.now();
      return load()
        .bookings.filter(
          (b) => b.phone === digits && b.status === 'booked' && slotStart(b.date, b.time ?? b.slot).getTime() > now,
        )
        .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
        .map((b) => ({
          id: b.id,
          date: b.date,
          time: b.time ?? b.slot,
          maskedName: maskName(b.name),
          canCancel: true,
        }));
    },
    async cancelMyBooking(phone, id) {
      const store = load();
      const b = store.bookings.find((x) => x.id === id && x.phone === normalizePhone(phone));
      if (!b) return 'not_found';
      if (b.status !== 'booked') return 'already_cancelled';
      if (slotStart(b.date, b.time ?? b.slot).getTime() <= Date.now()) return 'too_late';
      const now = new Date().toISOString();
      Object.assign(b, { status: 'cancelled', cancelledAt: now, cancelledBy: 'patient', updatedAt: now });
      save(store);
      return 'ok';
    },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const patientApi: PatientApi = url && key ? createSupabasePatientApi(url, key) : createDemoPatientApi();
