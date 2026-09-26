import { isDemo } from '../data';
import { load, save } from '../data/demoApi';
import { request } from '../data/http';
import type { BookResult, CancelResult, DayAvailability, MyBooking, PatientApi } from '../data/types';
import { todayInTaipei } from '../lib/dates';
import { normalizePhone, isMobile } from '../lib/phone';
import { bookingConfig, canPatientCancel, computeAvailability, myBookingsView, validateOnlineBooking } from '../lib/rules';
import { DEFAULT_SETTINGS } from '../lib/schedule';

export type { BookResult, BookingConfig, CancelResult, DayAvailability, MyBooking } from '../data/types';

// 病人預約頁使用的資料操作。病人只能：看設定、看哪些時段有空、送出預約、查詢／取消自己的預約。
// 完全無法讀取其他病人的資料。

function createCloudPatientApi(): PatientApi {
  return {
    mode: 'cloud',
    async getConfig() {
      return (await request<{ config: ReturnType<typeof bookingConfig> }>('GET', '/api/public/config')).config;
    },
    async getAvailability(from, to) {
      const q = new URLSearchParams({ from, to });
      return (await request<{ days: DayAvailability[] }>('GET', `/api/public/availability?${q}`)).days;
    },
    async book(date, slot, name, phone) {
      return (await request<{ result: BookResult }>('POST', '/api/public/book', { date, slot, name, phone })).result;
    },
    async findMyBookings(phone) {
      return (await request<{ bookings: MyBooking[] }>('POST', '/api/public/my-bookings', { phone })).bookings;
    },
    async cancelMyBooking(phone, id) {
      return (await request<{ result: CancelResult }>('POST', '/api/public/cancel', { phone, id })).result;
    },
  };
}

function createDemoPatientApi(): PatientApi {
  const settings = DEFAULT_SETTINGS;
  const active = () => load().bookings.filter((b) => b.status === 'booked');
  const overrideOf = (date: string) => load().overrides.find((o) => o.date === date);
  return {
    mode: 'demo',
    async getConfig() {
      return bookingConfig(settings);
    },
    async getAvailability(from, to) {
      return computeAvailability(settings, load().overrides, active(), from, to);
    },
    async book(date, slot, name, phone) {
      const invalid = validateOnlineBooking({ date, slot, name, phone }, settings, overrideOf(date));
      if (invalid) return invalid;
      const digits = normalizePhone(phone);
      const list = active();
      if (list.some((b) => b.date === date && b.slot === slot)) return 'slot_taken';
      if (list.some((b) => b.date === date && b.phone === digits && b.name === name.trim())) return 'already_booked_that_day';
      const today = todayInTaipei();
      const mine = list.filter((b) => b.phone === digits && b.source === 'online' && b.date >= today);
      if (mine.length >= settings.maxOnlinePerPhone) return 'too_many';
      const store = load();
      const now = new Date().toISOString();
      store.bookings.push({
        id: crypto.randomUUID(),
        date,
        slot,
        time: null,
        name: name.trim(),
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
      return myBookingsView(
        load().bookings.filter((b) => b.phone === digits),
        settings,
      );
    },
    async cancelMyBooking(phone, id) {
      const store = load();
      const b = store.bookings.find((x) => x.id === id && x.phone === normalizePhone(phone));
      if (!b) return 'not_found';
      if (b.status !== 'booked') return 'already_cancelled';
      if (!canPatientCancel(b, settings)) return 'too_late';
      const now = new Date().toISOString();
      Object.assign(b, { status: 'cancelled', cancelledAt: now, cancelledBy: 'patient', updatedAt: now });
      save(store);
      return 'ok';
    },
  };
}

export const patientApi: PatientApi = isDemo ? createDemoPatientApi() : createCloudPatientApi();
