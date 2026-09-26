export interface ClinicSettings {
  clinicName: string;
  clinicPhone: string;
  /** 平常看診的星期（0 = 星期日） */
  openWeekdays: number[];
  /** 所有時段，例如 '08:30' */
  slots: string[];
  /** 病人最多可以預約幾天內 */
  bookingWindowDays: number;
  /** 病人可否預約當天 */
  sameDayBooking: boolean;
  /** 病人最晚要在看診前幾小時預約（0 = 時段開始前都可以） */
  minHoursBeforeBooking: number;
}

/** 某一天的特別設定：臨時休診，或只開部分時段 */
export interface DayOverride {
  date: string;
  closed: boolean;
  /** null 代表全部時段都開 */
  openSlots: string[] | null;
  note: string;
}

export type BookingStatus = 'booked' | 'cancelled';
export type BookingSource = 'admin' | 'online';

export interface Booking {
  id: string;
  date: string;
  /** 所在時段（登記本上的那一格） */
  slot: string;
  /** 實際時間；與時段相同時為 null（例如 19:30 時段改成 19:50 來） */
  time: string | null;
  name: string;
  /** 只存數字 */
  phone: string;
  note: string;
  status: BookingStatus;
  /** 加號（同一時段第二位以後的病人） */
  isExtra: boolean;
  source: BookingSource;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  /** 誰取消的：clinic = 診所；patient = 病人線上取消 */
  cancelledBy: 'clinic' | 'patient' | null;
}

export interface NewBooking {
  date: string;
  slot: string;
  time: string | null;
  name: string;
  phone: string;
  note: string;
  isExtra: boolean;
}

export type BookingPatch = Partial<
  Pick<Booking, 'date' | 'slot' | 'time' | 'name' | 'phone' | 'note' | 'status' | 'isExtra'>
>;

/** 同一時段已經有人預約 */
export class SlotTakenError extends Error {
  constructor() {
    super('這個時段已經有人預約了。請選其他時段，或勾選「加號」。');
    this.name = 'SlotTakenError';
  }
}

/** 管理頁使用的所有資料操作。示範模式與正式資料庫各自實作一份。 */
export interface AdminApi {
  readonly mode: 'demo' | 'supabase';
  currentUser(): Promise<string | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  getSettings(): Promise<ClinicSettings>;
  listOverrides(from: string, to: string): Promise<DayOverride[]>;
  saveOverride(o: DayOverride): Promise<void>;
  deleteOverride(date: string): Promise<void>;

  listBookings(date: string): Promise<Booking[]>;
  /** 一段期間內「有效」的預約（休假設定時提醒要聯絡的病人） */
  listActiveBookingsBetween(from: string, to: string): Promise<Booking[]>;
  createBooking(b: NewBooking): Promise<Booking>;
  updateBooking(id: string, patch: BookingPatch): Promise<void>;
  searchBookings(query: string): Promise<Booking[]>;
  exportAll(): Promise<Booking[]>;

  /** 資料有變動（包含其他裝置）時呼叫 onChange。回傳取消訂閱的函式。 */
  subscribe(onChange: () => void): () => void;
}
