// 資料庫結構。網站第一次收到請求時會自動建立（已存在就略過），不需要手動執行任何指令。

export const SCHEMA: string[] = [
  // 診所設定（只有一列，存 JSON；沒設定的欄位用程式裡的預設值）
  `CREATE TABLE IF NOT EXISTS settings (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     data TEXT NOT NULL DEFAULT '{}'
   )`,
  // 特定日期設定：臨時休診、只開部分時段
  `CREATE TABLE IF NOT EXISTS day_overrides (
     date TEXT PRIMARY KEY,
     closed INTEGER NOT NULL DEFAULT 0,
     open_slots TEXT,
     note TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL
   )`,
  // 預約：取消不刪除，只改狀態
  `CREATE TABLE IF NOT EXISTS bookings (
     id TEXT PRIMARY KEY,
     date TEXT NOT NULL,
     slot TEXT NOT NULL,
     actual_time TEXT,
     name TEXT NOT NULL,
     phone TEXT NOT NULL DEFAULT '',
     note TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled')),
     is_extra INTEGER NOT NULL DEFAULT 0,
     source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'online')),
     cancel_token TEXT NOT NULL,
     reminder_sent_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     cancelled_at TEXT,
     cancelled_by TEXT CHECK (cancelled_by IN ('clinic', 'patient'))
   )`,
  // 防止重複預約：同一天同一時段只能有一筆「有效、非加號」的預約
  `CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_slot
     ON bookings (date, slot) WHERE status = 'booked' AND is_extra = 0`,
  `CREATE INDEX IF NOT EXISTS bookings_date ON bookings (date)`,
  `CREATE INDEX IF NOT EXISTS bookings_phone ON bookings (phone)`,
  // 管理員登入
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     expires_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS login_attempts_ip ON login_attempts (ip, at)`,
  // 病人查詢次數（防止有人一直試號碼）
  `CREATE TABLE IF NOT EXISTS lookup_log (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lookup_log_ip ON lookup_log (ip, at)`,
  // 資料版本號：每次有變動就 +1，讓其他裝置知道要更新畫面
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)`,
  `INSERT OR IGNORE INTO meta (key, value) VALUES ('version', 0)`,
  `INSERT OR IGNORE INTO settings (id, data) VALUES (1, '{}')`,
];
