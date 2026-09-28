import type { BookResult, CancelResult, DayOverride } from '../src/data/types';
import { addDays, todayInTaipei } from '../src/lib/dates';
import { normalizePhone, isBookingPhone } from '../src/lib/phone';
import { bookingConfig, canPatientCancel, computeAvailability, myBookingsView, validateOnlineBooking } from '../src/lib/rules';
import {
  BOOKING_COLUMNS,
  bumpVersion,
  ensureSchema,
  getOverride,
  getSettings,
  isUniqueViolation,
  listOverrides,
  toBooking,
  type BookingRow,
} from './store';
import {
  clientIp,
  fail,
  HttpError,
  isDate,
  isTime,
  json,
  randomToken,
  readJson,
  safeEqual,
  sha256,
  type Env,
} from './util';

const SESSION_COOKIE = 'rc_session';
const SESSION_DAYS = 30;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60_000;
const LOOKUP_MAX_PER_HOUR = 30;

// ---------------------------------------------------------------- 入口

export async function handle(request: Request, env: Env): Promise<Response> {
  if (!env.DB) {
    return fail(500, 'no_db', '網站還沒有連結資料庫。請在 Cloudflare 的設定裡加入名稱為 DB 的 D1 資料庫。');
  }
  try {
    await ensureSchema(env.DB);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const key = `${request.method} ${path}`;

    const pub = PUBLIC_ROUTES[key];
    if (pub) return await pub(request, env, url);

    if (key === 'POST /api/admin/login') return await login(request, env);
    const admin = ADMIN_ROUTES[key];
    if (admin) {
      if (!(await isLoggedIn(request, env))) return fail(401, 'unauthorized', '請重新登入。');
      return await admin(request, env, url);
    }
    return fail(404, 'not_found', '找不到這個功能。');
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.code, e.message);
    if (isUniqueViolation(e)) return fail(409, 'slot_taken', '這個時段已經有人預約了。');
    console.error(e);
    return fail(500, 'server', '系統暫時有問題，請稍後再試。');
  }
}

type Route = (request: Request, env: Env, url: URL) => Promise<Response>;

// ---------------------------------------------------------------- 病人（公開）

const PUBLIC_ROUTES: Record<string, Route> = {
  'GET /api/public/config': async (_req, env) => json({ config: bookingConfig(await getSettings(env.DB)) }),

  'GET /api/public/availability': async (_req, env, url) => {
    const settings = await getSettings(env.DB);
    const today = todayInTaipei();
    const fromQ = url.searchParams.get('from');
    const toQ = url.searchParams.get('to');
    const from = isDate(fromQ) ? fromQ : today;
    const to = isDate(toQ) ? toQ : addDays(today, settings.bookingWindowDays);
    const [overrides, active] = await Promise.all([
      listOverrides(env.DB, from, to),
      env.DB.prepare("SELECT date, slot FROM bookings WHERE status = 'booked' AND date BETWEEN ?1 AND ?2")
        .bind(from, to)
        .all<{ date: string; slot: string }>(),
    ]);
    return json({ days: computeAvailability(settings, overrides, active.results, from, to) });
  },

  'POST /api/public/book': async (req, env) => {
    const body = await readJson<{ date?: unknown; slot?: unknown; name?: unknown; phone?: unknown }>(req);
    const input = {
      date: String(body.date ?? ''),
      slot: String(body.slot ?? ''),
      name: String(body.name ?? '').trim(),
      phone: String(body.phone ?? ''),
    };
    const settings = await getSettings(env.DB);
    const invalid = validateOnlineBooking(input, settings, isDate(input.date) ? await getOverride(env.DB, input.date) : undefined);
    if (invalid) return json({ result: invalid });

    const phone = normalizePhone(input.phone);
    const now = new Date().toISOString();
    const today = todayInTaipei();
    // 一個指令同時檢查「時段沒人、線上預約未超過上限」再寫入，
    // 資料庫一次只處理一個寫入，所以兩人同時搶位只會有一人成功。
    const insert = env.DB.prepare(
      `INSERT INTO bookings (id, date, slot, name, phone, note, status, is_extra, source, cancel_token, created_at, updated_at)
       SELECT ?1, ?2, ?3, ?4, ?5, '', 'booked', 0, 'online', ?6, ?7, ?7
       WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE date = ?2 AND slot = ?3 AND status = 'booked')
         AND (SELECT COUNT(*) FROM bookings
              WHERE phone = ?5 AND status = 'booked' AND source = 'online' AND date >= ?8) < ?9`,
    ).bind(crypto.randomUUID(), input.date, input.slot, input.name, phone, randomToken(16), now, today, settings.maxOnlinePerPhone);

    let changes = 0;
    try {
      const [res] = await env.DB.batch([insert, bumpVersion(env.DB)]);
      changes = res.meta.changes ?? 0;
    } catch (e) {
      if (isUniqueViolation(e)) return json({ result: 'slot_taken' satisfies BookResult });
      throw e;
    }
    if (changes === 1) return json({ result: 'ok' satisfies BookResult });

    // 沒寫入：找出原因
    const reason = await env.DB.prepare(
      `SELECT EXISTS (SELECT 1 FROM bookings WHERE date = ?1 AND slot = ?2 AND status = 'booked') AS taken`,
    )
      .bind(input.date, input.slot)
      .first<{ taken: number }>();
    const result: BookResult = reason?.taken ? 'slot_taken' : 'too_many';
    return json({ result });
  },

  'POST /api/public/my-bookings': async (req, env) => {
    const body = await readJson<{ phone?: unknown }>(req);
    const phone = normalizePhone(String(body.phone ?? ''));
    if (!isBookingPhone(phone)) throw new HttpError(400, 'invalid_phone', '請輸入正確的電話號碼（手機，或市話加區碼）。');
    await limitLookups(req, env);
    const settings = await getSettings(env.DB);
    const { results } = await env.DB.prepare(
      `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE phone = ?1 AND status = 'booked' AND date >= ?2`,
    )
      .bind(phone, addDays(todayInTaipei(), -1))
      .all<BookingRow>();
    return json({ bookings: myBookingsView(results.map(toBooking), settings) });
  },

  'POST /api/public/cancel': async (req, env) => {
    const body = await readJson<{ phone?: unknown; id?: unknown }>(req);
    const phone = normalizePhone(String(body.phone ?? ''));
    const id = String(body.id ?? '');
    const row = await env.DB.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?1 AND phone = ?2`)
      .bind(id, phone)
      .first<BookingRow>();
    let result: CancelResult;
    if (!row || !isBookingPhone(phone)) result = 'not_found';
    else if (row.status !== 'booked') result = 'already_cancelled';
    else if (!canPatientCancel(toBooking(row), await getSettings(env.DB))) result = 'too_late';
    else {
      const now = new Date().toISOString();
      const [res] = await env.DB.batch([
        env.DB.prepare(
          `UPDATE bookings SET status = 'cancelled', cancelled_by = 'patient', cancelled_at = ?1, updated_at = ?1
           WHERE id = ?2 AND phone = ?3 AND status = 'booked'`,
        ).bind(now, id, phone),
        bumpVersion(env.DB),
      ]);
      result = res.meta.changes === 1 ? 'ok' : 'already_cancelled';
    }
    return json({ result });
  },
};

async function limitLookups(req: Request, env: Env) {
  const ip = clientIp(req);
  const since = Date.now() - 3600_000;
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM lookup_log WHERE ip = ?1 AND at > ?2')
    .bind(ip, since)
    .first<{ n: number }>();
  if ((row?.n ?? 0) >= LOOKUP_MAX_PER_HOUR) {
    throw new HttpError(429, 'rate_limited', '查詢次數太多，請稍後再試，或來電詢問。');
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO lookup_log (ip, at) VALUES (?1, ?2)').bind(ip, Date.now()),
    env.DB.prepare('DELETE FROM lookup_log WHERE at < ?1').bind(Date.now() - 86_400_000),
  ]);
}

// ---------------------------------------------------------------- 管理員登入

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

async function isLoggedIn(request: Request, env: Env): Promise<boolean> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?1')
    .bind(await sha256(token))
    .first<{ expires_at: number }>();
  return !!row && row.expires_at > Date.now();
}

function sessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

async function login(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_PASSWORD) {
    return fail(500, 'no_password', '還沒有設定管理密碼。請在 Cloudflare 的設定裡加入 ADMIN_PASSWORD。');
  }
  const ip = clientIp(request);
  const now = Date.now();
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?1 AND at > ?2')
    .bind(ip, now - LOGIN_LOCK_MS)
    .first<{ n: number }>();
  if ((fails?.n ?? 0) >= LOGIN_MAX_FAILS) {
    return fail(429, 'locked', '密碼錯誤太多次，請 15 分鐘後再試。');
  }
  const body = await readJson<{ password?: unknown }>(request);
  const ok = safeEqual(await sha256(String(body.password ?? '')), await sha256(env.ADMIN_PASSWORD));
  if (!ok) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO login_attempts (ip, at) VALUES (?1, ?2)').bind(ip, now),
      env.DB.prepare('DELETE FROM login_attempts WHERE at < ?1').bind(now - 86_400_000),
    ]);
    const left = LOGIN_MAX_FAILS - (fails?.n ?? 0) - 1;
    return fail(401, 'wrong_password', left > 0 ? `密碼錯誤，還可以再試 ${left} 次。` : '密碼錯誤太多次，請 15 分鐘後再試。');
  }
  const token = randomToken();
  const maxAge = SESSION_DAYS * 86_400;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?1, ?2)').bind(await sha256(token), now + maxAge * 1000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now),
    env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?1').bind(ip),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, maxAge) });
}

// ---------------------------------------------------------------- 管理員功能

const PATCH_FIELDS = ['date', 'slot', 'time', 'name', 'phone', 'note', 'status', 'isExtra'] as const;

function checkBookingFields(b: Record<string, unknown>, partial: boolean) {
  const bad = (msg: string) => {
    throw new HttpError(400, 'bad_request', msg);
  };
  const has = (k: string) => b[k] !== undefined;
  if ((!partial || has('date')) && !isDate(b.date)) bad('日期格式不正確。');
  if ((!partial || has('slot')) && !isTime(b.slot)) bad('時段格式不正確。');
  if (has('time') && b.time !== null && !isTime(b.time)) bad('實際時間格式不正確。');
  if ((!partial || has('name')) && (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 50)) bad('請填寫姓名（50 字以內）。');
  if (has('phone') && (typeof b.phone !== 'string' || !/^\d{0,15}$/.test(b.phone))) bad('電話格式不正確。');
  if (has('note') && (typeof b.note !== 'string' || b.note.length > 500)) bad('備註太長（500 字以內）。');
  if (has('status') && b.status !== 'booked' && b.status !== 'cancelled') bad('狀態不正確。');
  if (has('isExtra') && typeof b.isExtra !== 'boolean') bad('加號設定不正確。');
}

const ADMIN_ROUTES: Record<string, Route> = {
  'GET /api/admin/me': async () => json({ user: '管理員' }),

  'POST /api/admin/logout': async (req, env) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
  },

  'GET /api/admin/version': async (_req, env) => {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'version'").first<{ value: number }>();
    return json({ version: row?.value ?? 0 });
  },

  'GET /api/admin/settings': async (_req, env) => json({ settings: await getSettings(env.DB) }),

  'GET /api/admin/overrides': async (_req, env, url) => {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!isDate(from) || !isDate(to)) throw new HttpError(400, 'bad_request', '日期格式不正確。');
    return json({ overrides: await listOverrides(env.DB, from, to) });
  },

  'PUT /api/admin/overrides': async (req, env) => {
    const o = await readJson<Partial<DayOverride>>(req);
    if (!isDate(o.date)) throw new HttpError(400, 'bad_request', '日期格式不正確。');
    const slots = Array.isArray(o.openSlots) ? o.openSlots.filter(isTime) : null;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO day_overrides (date, closed, open_slots, note, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (date) DO UPDATE SET closed = ?2, open_slots = ?3, note = ?4, updated_at = ?5`,
      ).bind(o.date, o.closed ? 1 : 0, slots ? JSON.stringify(slots) : null, String(o.note ?? '').slice(0, 100), new Date().toISOString()),
      bumpVersion(env.DB),
    ]);
    return json({ ok: true });
  },

  'DELETE /api/admin/overrides': async (_req, env, url) => {
    const date = url.searchParams.get('date');
    if (!isDate(date)) throw new HttpError(400, 'bad_request', '日期格式不正確。');
    await env.DB.batch([env.DB.prepare('DELETE FROM day_overrides WHERE date = ?1').bind(date), bumpVersion(env.DB)]);
    return json({ ok: true });
  },

  'GET /api/admin/bookings': async (_req, env, url) => {
    const date = url.searchParams.get('date');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let stmt: D1PreparedStatement;
    if (isDate(date)) {
      stmt = env.DB.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE date = ?1 ORDER BY slot, actual_time, created_at`).bind(date);
    } else if (isDate(from) && isDate(to)) {
      const active = url.searchParams.get('active') === '1' ? "AND status = 'booked'" : '';
      stmt = env.DB.prepare(
        `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE date BETWEEN ?1 AND ?2 ${active} ORDER BY date, slot, created_at LIMIT 2000`,
      ).bind(from, to);
    } else {
      throw new HttpError(400, 'bad_request', '日期格式不正確。');
    }
    const { results } = await stmt.all<BookingRow>();
    return json({ bookings: results.map(toBooking) });
  },

  'POST /api/admin/bookings': async (req, env) => {
    const b = await readJson(req);
    checkBookingFields(b, false);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO bookings (id, date, slot, actual_time, name, phone, note, status, is_extra, source, cancel_token, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'booked', ?8, 'admin', ?9, ?10, ?10)`,
      ).bind(
        id,
        b.date,
        b.slot,
        (b.time as string | null | undefined) ?? null,
        String(b.name).trim(),
        String(b.phone ?? ''),
        String(b.note ?? ''),
        b.isExtra ? 1 : 0,
        randomToken(16),
        now,
      ),
      bumpVersion(env.DB),
    ]);
    const row = await env.DB.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?1`).bind(id).first<BookingRow>();
    return json({ booking: toBooking(row!) });
  },

  'PATCH /api/admin/bookings': async (req, env, url) => {
    const id = url.searchParams.get('id') ?? '';
    const patch = await readJson(req);
    checkBookingFields(patch, true);
    const current = await env.DB.prepare('SELECT status FROM bookings WHERE id = ?1').bind(id).first<{ status: string }>();
    if (!current) throw new HttpError(404, 'not_found', '找不到這筆預約。');

    const column: Record<(typeof PATCH_FIELDS)[number], string> = {
      date: 'date', slot: 'slot', time: 'actual_time', name: 'name', phone: 'phone', note: 'note', status: 'status', isExtra: 'is_extra',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const f of PATCH_FIELDS) {
      if (patch[f] === undefined) continue;
      let v = patch[f];
      if (f === 'isExtra') v = v ? 1 : 0;
      if (f === 'name') v = String(v).trim();
      values.push(v);
      sets.push(`${column[f]} = ?${values.length}`);
    }
    const now = new Date().toISOString();
    if (patch.status === 'cancelled' && current.status !== 'cancelled') {
      values.push(now);
      sets.push(`cancelled_at = ?${values.length}`, "cancelled_by = 'clinic'");
    } else if (patch.status === 'booked') {
      sets.push('cancelled_at = NULL', 'cancelled_by = NULL');
    }
    values.push(now);
    sets.push(`updated_at = ?${values.length}`);
    values.push(id);
    await env.DB.batch([
      env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?${values.length}`).bind(...values),
      bumpVersion(env.DB),
    ]);
    return json({ ok: true });
  },

  'GET /api/admin/search': async (_req, env, url) => {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 50);
    if (!q) return json({ bookings: [] });
    const like = '%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    const digits = q.replace(/\D/g, '');
    const { results } = await env.DB.prepare(
      `SELECT ${BOOKING_COLUMNS} FROM bookings
       WHERE name LIKE ?1 ESCAPE '\\' OR (?2 <> '' AND phone LIKE ?3)
       ORDER BY date DESC, slot, created_at LIMIT 200`,
    )
      .bind(like, digits.length >= 3 ? digits : '', `%${digits}%`)
      .all<BookingRow>();
    return json({ bookings: results.map(toBooking) });
  },

  'GET /api/admin/export': async (_req, env) => {
    const { results } = await env.DB.prepare(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY date, slot, created_at`).all<BookingRow>();
    return json({ bookings: results.map(toBooking) });
  },
};
