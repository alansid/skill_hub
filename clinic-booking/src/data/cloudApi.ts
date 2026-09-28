import type { AdminApi, Booking, ClinicSettings, DayOverride } from './types';
import { SlotTakenError } from './types';
import { ApiError, request } from './http';

/** 其他裝置有變動時，多久檢查一次（毫秒） */
const POLL_MS = 10_000;

function rethrow(e: unknown): never {
  if (e instanceof ApiError && e.code === 'slot_taken') throw new SlotTakenError();
  throw e;
}

export function createCloudApi(): AdminApi {
  let passwordRequired = true;
  return {
    mode: 'cloud',
    get passwordRequired() {
      return passwordRequired;
    },
    async currentUser() {
      try {
        const r = await request<{ user: string | null; passwordRequired?: boolean }>('GET', '/api/admin/me');
        passwordRequired = r.passwordRequired !== false;
        return r.user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    async signIn(password) {
      await request('POST', '/api/admin/login', { password });
    },
    async signOut() {
      await request('POST', '/api/admin/logout');
    },
    async getSettings() {
      return (await request<{ settings: ClinicSettings }>('GET', '/api/admin/settings')).settings;
    },
    async listOverrides(from, to) {
      const q = new URLSearchParams({ from, to });
      return (await request<{ overrides: DayOverride[] }>('GET', `/api/admin/overrides?${q}`)).overrides;
    },
    async saveOverride(o) {
      await request('PUT', '/api/admin/overrides', o);
    },
    async deleteOverride(date) {
      await request('DELETE', `/api/admin/overrides?${new URLSearchParams({ date })}`);
    },
    async listBookings(date) {
      return (await request<{ bookings: Booking[] }>('GET', `/api/admin/bookings?${new URLSearchParams({ date })}`))
        .bookings;
    },
    async listActiveBookingsBetween(from, to) {
      const q = new URLSearchParams({ from, to, active: '1' });
      return (await request<{ bookings: Booking[] }>('GET', `/api/admin/bookings?${q}`)).bookings;
    },
    async createBooking(b) {
      try {
        return (await request<{ booking: Booking }>('POST', '/api/admin/bookings', b)).booking;
      } catch (e) {
        rethrow(e);
      }
    },
    async updateBooking(id, patch) {
      try {
        await request('PATCH', `/api/admin/bookings?${new URLSearchParams({ id })}`, patch);
      } catch (e) {
        rethrow(e);
      }
    },
    async searchBookings(query) {
      return (await request<{ bookings: Booking[] }>('GET', `/api/admin/search?${new URLSearchParams({ q: query })}`))
        .bookings;
    },
    async exportAll() {
      return (await request<{ bookings: Booking[] }>('GET', '/api/admin/export')).bookings;
    },
    subscribe(onChange) {
      // 每 10 秒問一次「資料有沒有變」，有變才重新載入；畫面在背景時不問
      let version: number | null = null;
      let stopped = false;
      const check = async () => {
        if (stopped || document.visibilityState !== 'visible') return;
        try {
          const r = await request<{ version: number }>('GET', '/api/admin/version');
          if (version !== null && r.version !== version) onChange();
          version = r.version;
        } catch {
          // 網路暫時斷線，下次再試
        }
      };
      void check();
      const timer = window.setInterval(check, POLL_MS);
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          onChange();
          void check();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        stopped = true;
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
      };
    },
  };
}
