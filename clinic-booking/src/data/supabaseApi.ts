import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS } from '../lib/schedule';
import type { AdminApi, Booking, BookingPatch, ClinicSettings, DayOverride } from './types';
import { SlotTakenError } from './types';

interface BookingRow {
  id: string;
  date: string;
  slot: string;
  actual_time: string | null;
  name: string;
  phone: string;
  note: string;
  status: Booking['status'];
  is_extra: boolean;
  source: Booking['source'];
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

const BOOKING_COLUMNS =
  'id,date,slot,actual_time,name,phone,note,status,is_extra,source,created_at,updated_at,cancelled_at';

function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    date: r.date,
    slot: r.slot,
    time: r.actual_time,
    name: r.name,
    phone: r.phone,
    note: r.note,
    status: r.status,
    isExtra: r.is_extra,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cancelledAt: r.cancelled_at,
  };
}

function toRowPatch(p: BookingPatch): Partial<BookingRow> {
  const row: Partial<BookingRow> = {};
  if (p.date !== undefined) row.date = p.date;
  if (p.slot !== undefined) row.slot = p.slot;
  if (p.time !== undefined) row.actual_time = p.time;
  if (p.name !== undefined) row.name = p.name;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.note !== undefined) row.note = p.note;
  if (p.status !== undefined) row.status = p.status;
  if (p.isExtra !== undefined) row.is_extra = p.isExtra;
  return row;
}

function check(error: PostgrestError | null) {
  if (!error) return;
  if (error.code === '23505') throw new SlotTakenError();
  if (error.code === '42501' || error.code === 'PGRST301') {
    throw new Error('沒有權限。請確認這個帳號已加入診所人員名單，或重新登入。');
  }
  throw new Error('資料儲存失敗：' + error.message);
}

function byTime(a: Booking, b: Booking) {
  return (a.slot + (a.time ?? '') + a.createdAt).localeCompare(b.slot + (b.time ?? '') + b.createdAt);
}

export function createSupabaseApi(url: string, anonKey: string): AdminApi {
  const sb = createClient(url, anonKey);

  return {
    mode: 'supabase',
    async currentUser() {
      const { data } = await sb.auth.getSession();
      return data.session?.user.email ?? null;
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error('帳號或密碼錯誤');
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async getSettings(): Promise<ClinicSettings> {
      const { data, error } = await sb.from('clinic_settings').select('*').eq('id', 1).maybeSingle();
      check(error);
      if (!data) return DEFAULT_SETTINGS;
      return {
        clinicName: data.clinic_name,
        clinicPhone: data.clinic_phone,
        openWeekdays: data.open_weekdays,
        slots: data.slots,
        bookingWindowDays: data.booking_window_days,
        sameDayBooking: data.same_day_booking,
        minHoursBeforeBooking: data.min_hours_before_booking,
      };
    },
    async listOverrides(from, to) {
      const { data, error } = await sb
        .from('day_overrides')
        .select('date,closed,open_slots,note')
        .gte('date', from)
        .lte('date', to);
      check(error);
      return (data ?? []).map(
        (r): DayOverride => ({ date: r.date, closed: r.closed, openSlots: r.open_slots, note: r.note }),
      );
    },
    async saveOverride(o) {
      const { error } = await sb.from('day_overrides').upsert({
        date: o.date,
        closed: o.closed,
        open_slots: o.openSlots,
        note: o.note,
        updated_at: new Date().toISOString(),
      });
      check(error);
    },
    async deleteOverride(date) {
      const { error } = await sb.from('day_overrides').delete().eq('date', date);
      check(error);
    },
    async listBookings(date) {
      const { data, error } = await sb.from('bookings').select(BOOKING_COLUMNS).eq('date', date);
      check(error);
      return ((data ?? []) as BookingRow[]).map(toBooking).sort(byTime);
    },
    async createBooking(b) {
      const { data, error } = await sb
        .from('bookings')
        .insert({
          date: b.date,
          slot: b.slot,
          actual_time: b.time,
          name: b.name,
          phone: b.phone,
          note: b.note,
          is_extra: b.isExtra,
          source: 'admin',
        })
        .select(BOOKING_COLUMNS)
        .single();
      check(error);
      return toBooking(data as BookingRow);
    },
    async updateBooking(id, patch) {
      const { error } = await sb.from('bookings').update(toRowPatch(patch)).eq('id', id);
      check(error);
    },
    async searchBookings(query) {
      const { data, error } = await sb.rpc('search_bookings', { q: query }).select(BOOKING_COLUMNS);
      check(error);
      return ((data ?? []) as BookingRow[]).map(toBooking);
    },
    async exportAll() {
      const all: Booking[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await sb
          .from('bookings')
          .select(BOOKING_COLUMNS)
          .order('date')
          .order('slot')
          .order('created_at')
          .range(from, from + page - 1);
        check(error);
        all.push(...((data ?? []) as BookingRow[]).map(toBooking));
        if (!data || data.length < page) break;
      }
      return all;
    },
    subscribe(onChange) {
      const channel = sb
        .channel('clinic-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'day_overrides' }, onChange)
        .subscribe();
      // 手機休眠後回來，重新抓一次資料，避免漏掉變動
      const onVisible = () => {
        if (document.visibilityState === 'visible') onChange();
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        void sb.removeChannel(channel);
      };
    },
  };
}
