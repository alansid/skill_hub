import { DEFAULT_SETTINGS } from '../lib/schedule';
import type { AdminApi, Booking, DayOverride } from './types';
import { SlotTakenError } from './types';

// 示範模式：資料存在瀏覽器裡（localStorage），只給試用與測試。
// 同一台電腦開兩個分頁也會互相同步，可以用來體驗「即時同步」。

export const KEY = 'ren-clinic-demo-v1';
const USER_KEY = 'ren-clinic-demo-user';
export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'demo1234';

export interface Store {
  bookings: Booking[];
  overrides: DayOverride[];
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // 讀不到就當作空的
  }
  return { bookings: [], overrides: [] };
}

export const listeners = new Set<() => void>();

export function save(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
  listeners.forEach((fn) => fn());
}

function hasConflict(store: Store, b: Pick<Booking, 'id' | 'date' | 'slot' | 'status' | 'isExtra'>) {
  if (b.status !== 'booked' || b.isExtra) return false;
  return store.bookings.some(
    (x) => x.id !== b.id && x.date === b.date && x.slot === b.slot && x.status === 'booked' && !x.isExtra,
  );
}

function byTime(a: Booking, b: Booking) {
  return (a.slot + (a.time ?? '') + a.createdAt).localeCompare(b.slot + (b.time ?? '') + b.createdAt);
}

export function createDemoApi(): AdminApi {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((fn) => fn());
  });

  return {
    mode: 'demo',
    async currentUser() {
      return localStorage.getItem(USER_KEY);
    },
    async signIn(email, password) {
      if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        throw new Error('帳號或密碼錯誤');
      }
      localStorage.setItem(USER_KEY, DEMO_EMAIL);
    },
    async signOut() {
      localStorage.removeItem(USER_KEY);
    },
    async getSettings() {
      return DEFAULT_SETTINGS;
    },
    async listOverrides(from, to) {
      return load().overrides.filter((o) => o.date >= from && o.date <= to);
    },
    async saveOverride(o) {
      const store = load();
      store.overrides = store.overrides.filter((x) => x.date !== o.date).concat(o);
      save(store);
    },
    async deleteOverride(date) {
      const store = load();
      store.overrides = store.overrides.filter((x) => x.date !== date);
      save(store);
    },
    async listBookings(date) {
      return load().bookings.filter((b) => b.date === date).sort(byTime);
    },
    async createBooking(input) {
      const store = load();
      const now = new Date().toISOString();
      const booking: Booking = {
        ...input,
        id: crypto.randomUUID(),
        status: 'booked',
        source: 'admin',
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
      };
      if (hasConflict(store, booking)) throw new SlotTakenError();
      store.bookings.push(booking);
      save(store);
      return booking;
    },
    async updateBooking(id, patch) {
      const store = load();
      const current = store.bookings.find((b) => b.id === id);
      if (!current) throw new Error('找不到這筆預約');
      const now = new Date().toISOString();
      const next: Booking = { ...current, ...patch, updatedAt: now };
      if (patch.status === 'cancelled' && current.status !== 'cancelled') next.cancelledAt = now;
      if (patch.status === 'booked') next.cancelledAt = null;
      if (hasConflict(store, next)) throw new SlotTakenError();
      store.bookings = store.bookings.map((b) => (b.id === id ? next : b));
      save(store);
    },
    async searchBookings(query) {
      const q = query.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      if (!q) return [];
      return load()
        .bookings.filter(
          (b) => b.name.toLowerCase().includes(q) || (digits.length >= 3 && b.phone.includes(digits)),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || byTime(a, b))
        .slice(0, 200);
    },
    async exportAll() {
      return load().bookings.sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
