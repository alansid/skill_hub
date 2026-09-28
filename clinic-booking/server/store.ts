import type { Booking, ClinicSettings, DayOverride } from '../src/data/types';
import { DEFAULT_SETTINGS } from '../src/lib/schedule';
import { SCHEMA } from './schema';

let schemaReady: Promise<void> | null = null;

/** 確保資料表已建立（每個伺服器執行環境只做一次） */
export function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db
    .batch(SCHEMA.map((sql) => db.prepare(sql)))
    .then(() => undefined)
    .catch((e) => {
      schemaReady = null;
      throw e;
    });
  return schemaReady;
}

export interface BookingRow {
  id: string;
  date: string;
  slot: string;
  actual_time: string | null;
  name: string;
  phone: string;
  note: string;
  status: Booking['status'];
  is_extra: number;
  source: Booking['source'];
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: Booking['cancelledBy'];
}

export const BOOKING_COLUMNS =
  'id, date, slot, actual_time, name, phone, note, status, is_extra, source, created_at, updated_at, cancelled_at, cancelled_by';

export function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    date: r.date,
    slot: r.slot,
    time: r.actual_time,
    name: r.name,
    phone: r.phone,
    note: r.note,
    status: r.status,
    isExtra: r.is_extra === 1,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cancelledAt: r.cancelled_at,
    cancelledBy: r.cancelled_by,
  };
}

interface OverrideRow {
  date: string;
  closed: number;
  open_slots: string | null;
  note: string;
}

export function toOverride(r: OverrideRow): DayOverride {
  return { date: r.date, closed: r.closed === 1, openSlots: r.open_slots ? JSON.parse(r.open_slots) : null, note: r.note };
}

export async function getSettings(db: D1Database): Promise<ClinicSettings> {
  const row = await db.prepare('SELECT data FROM settings WHERE id = 1').first<{ data: string }>();
  let saved: Partial<ClinicSettings> = {};
  try {
    saved = row ? JSON.parse(row.data) : {};
  } catch {
    saved = {};
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function listOverrides(db: D1Database, from: string, to: string): Promise<DayOverride[]> {
  const { results } = await db
    .prepare('SELECT date, closed, open_slots, note FROM day_overrides WHERE date BETWEEN ?1 AND ?2')
    .bind(from, to)
    .all<OverrideRow>();
  return results.map(toOverride);
}

export async function getOverride(db: D1Database, date: string): Promise<DayOverride | undefined> {
  const r = await db
    .prepare('SELECT date, closed, open_slots, note FROM day_overrides WHERE date = ?1')
    .bind(date)
    .first<OverrideRow>();
  return r ? toOverride(r) : undefined;
}

/** 讓其他裝置知道資料有變動 */
export function bumpVersion(db: D1Database): D1PreparedStatement {
  return db.prepare("UPDATE meta SET value = value + 1 WHERE key = 'version'");
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /UNIQUE constraint failed/i.test(e.message);
}
