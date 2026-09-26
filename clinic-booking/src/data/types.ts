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
  /** 病人最晚要在看診前幾分鐘預約 */
  minMinutesBeforeBooking: number;
  /** 病人最晚要在看診前幾小時線上取消（0 = 開始前都可以） */
  minHoursBeforeCancel: number;
  /** 同一支手機最多同時有幾筆尚未看診的線上預約 */
  maxOnlinePerPhone: number;
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
  readonly mode: 'demo' | 'cloud';
  /** 已登入回傳顯示名稱，未登入回傳 null */
  currentUser(): Promise<string | null>;
  signIn(password: string): Promise<void>;
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

// ---------- 病人預約頁 ----------

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
  /** 同一支手機、同一個姓名，當天已經有預約（家人共用手機可以各約一個時段） */
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
  readonly mode: 'demo' | 'cloud';
  getConfig(): Promise<BookingConfig>;
  getAvailability(from: string, to: string): Promise<DayAvailability[]>;
  book(date: string, slot: string, name: string, phone: string): Promise<BookResult>;
  findMyBookings(phone: string): Promise<MyBooking[]>;
  cancelMyBooking(phone: string, id: string): Promise<CancelResult>;
}
