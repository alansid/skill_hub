import { describe, expect, it } from 'vitest';
import type { Booking } from '../data/types';
import { canPatientCancel, computeAvailability, myBookingsView, validateOnlineBooking } from './rules';
import { DEFAULT_SETTINGS } from './schedule';

// 這裡測的是預約規則，不是各星期的時段，所以讓每個營業日都開全部時段
const s = { ...DEFAULT_SETTINGS, weekdaySlots: {} };
// 台灣時間 2026-09-29（週二）08:05
const now = new Date('2026-09-29T00:05:00Z');

const booking = (over: Partial<Booking>): Booking => ({
  id: 'x',
  date: '2026-09-30',
  slot: '08:30',
  time: null,
  name: '王小明',
  phone: '0912345678',
  note: '',
  status: 'booked',
  isExtra: false,
  source: 'online',
  createdAt: '',
  updatedAt: '',
  cancelledAt: null,
  cancelledBy: null,
  ...over,
});

describe('病人預約規則（網頁與雲端共用）', () => {
  const ok = { date: '2026-09-30', slot: '08:30', name: '王小明', phone: '0912-345-678' };
  it('正常資料可以預約', () => expect(validateOnlineBooking(ok, s, undefined, now)).toBeNull());
  it('擋下錯誤資料與不能約的時間', () => {
    expect(validateOnlineBooking({ ...ok, name: '  ' }, s, undefined, now)).toBe('invalid_name');
    expect(validateOnlineBooking({ ...ok, phone: '0223022457' }, s, undefined, now)).toBe('invalid_phone');
    expect(validateOnlineBooking({ ...ok, date: '2026-10-02' }, s, undefined, now)).toBe('slot_unavailable'); // 週五
    expect(validateOnlineBooking({ ...ok, slot: '08:31' }, s, undefined, now)).toBe('slot_unavailable');
    expect(validateOnlineBooking({ ...ok, date: '2027-01-30' }, s, undefined, now)).toBe('too_far');
    expect(validateOnlineBooking({ ...ok, date: '2026-09-29' }, s, undefined, now)).toBe('too_late'); // 25 分鐘後
    expect(
      validateOnlineBooking(ok, s, { date: '2026-09-30', closed: true, openSlots: null, note: '' }, now),
    ).toBe('slot_unavailable');
  });
  it('可預約時段排除已被約走的', () => {
    const days = computeAvailability(s, [], [{ date: '2026-09-30', slot: '08:30' }], '2026-09-30', '2026-09-30', now);
    expect(days[0].available[0]).toBe('09:10');
    expect(days[0].openCount).toBe(11);
  });
  it('查詢自己的預約：只列未來、姓名遮蔽', () => {
    const list = myBookingsView(
      [booking({}), booking({ id: 'old', date: '2026-09-20' }), booking({ id: 'c', status: 'cancelled' })],
      s,
      now,
    );
    expect(list).toEqual([{ id: 'x', date: '2026-09-30', time: '08:30', maskedName: '王○明', canCancel: true }]);
  });
  it('看診時間過了就不能線上取消', () => {
    expect(canPatientCancel(booking({ date: '2026-09-29', slot: '08:00' }), s, now)).toBe(false);
    expect(canPatientCancel(booking({}), s, now)).toBe(true);
  });
});
