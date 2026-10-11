import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { addDays, formatGregorian, weekdayName, weekdayOf, weekdayShort } from '../lib/dates';
import { formatLunar, lunarOf } from '../lib/lunar';
import { formatPhone, isBookingPhone, normalizePhone } from '../lib/phone';
import { periodOf, type Period } from '../lib/schedule';
import { patientApi, type BookResult, type BookingConfig, type DayAvailability } from './api';
import { MyBookings } from './MyBookings';
import { APP_VERSION } from '../version';
import { canDial } from '../lib/dial';

const ERROR_TEXT: Record<Exclude<BookResult, 'ok'>, string> = {
  invalid_name: '請填寫姓名。',
  invalid_phone: '請填寫正確的電話號碼（手機，或市話加區碼）。',
  slot_unavailable: '這個時段目前無法預約，請選擇其他時段。',
  too_far: '這個日期超過可預約的範圍，請選擇較近的日期。',
  too_late: '這個時段已經過了或即將開始，請選擇其他時段。',
  slot_taken: '很抱歉，這個時段剛剛被預約走了，請選擇其他時段。',
  too_many: '這個號碼已經有多筆還沒到的預約。如需再預約，請來電。',
};

const PERIODS: Period[] = ['上午', '下午', '晚上'];


interface Done {
  date: string;
  slot: string;
  name: string;
  phone: string;
}

export function PatientApp() {
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [view, setView] = useState<'book' | 'mine'>('book');
  const [lookupPhone, setLookupPhone] = useState('');
  const slotRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const refresh = useCallback(async () => {
    try {
      const cfg = await patientApi.getConfig();
      setConfig(cfg);
      setDays(await patientApi.getAvailability(cfg.today, addDays(cfg.today, cfg.bookingWindowDays)));
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const phoneText = config?.clinicPhone ?? '02-23022457';
  // 手機、平板上電話號碼可以直接點來撥打；電腦上只顯示號碼
  const phoneLink = canDial ? (
    <a href={'tel:' + phoneText.replace(/\D/g, '')}>{phoneText}</a>
  ) : (
    <b className="phone-text">{phoneText}</b>
  );
  const selectedDay = days?.find((d) => d.date === date) ?? null;

  function pickDate(d: string) {
    setDate(d);
    setSlot(null);
    setError('');
    requestAnimationFrame(() => slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function pickSlot(s: string) {
    setSlot(s);
    setError('');
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!date || !slot) return;
    const digits = normalizePhone(phone);
    if (!name.trim()) return setError(ERROR_TEXT.invalid_name);
    if (!isBookingPhone(digits)) return setError(ERROR_TEXT.invalid_phone);
    setBusy(true);
    setError('');
    try {
      const result = await patientApi.book(date, slot, name.trim(), digits);
      if (result === 'ok') {
        setDone({ date, slot, name: name.trim(), phone: digits });
        window.scrollTo({ top: 0 });
        void refresh();
      } else {
        setError(ERROR_TEXT[result] ?? '預約失敗，請來電預約。');
        if (result === 'slot_taken' || result === 'slot_unavailable' || result === 'too_late') {
          setSlot(null);
          await refresh();
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setDate(null);
    setSlot(null);
    setError('');
  }

  function openMine(prefill = '') {
    reset();
    setLookupPhone(prefill);
    setView('mine');
    window.scrollTo({ top: 0 });
  }

  function openBook() {
    reset();
    setView('book');
    void refresh();
  }

  const notice = (
    <p className="notice">
      為免耽誤其他客人時間，敬請準時，任何延誤務必來電告知（{phoneLink}）
    </p>
  );

  return (
    <div className="patient">
      {patientApi.mode === 'demo' && (
        <div className="demo-banner">示範模式：資料只存在這台裝置的瀏覽器，不會上網。</div>
      )}
      <header className="p-header">
        <h1>{config?.clinicName ?? '任老師'}</h1>
        <p>線上預約</p>
      </header>

      <div className="p-tabs" role="tablist">
        <button role="tab" aria-selected={view === 'book'} onClick={openBook}>
          我要預約
        </button>
        <button role="tab" aria-selected={view === 'mine'} onClick={() => openMine()}>
          查詢／取消預約
        </button>
      </div>

      {view === 'mine' ? (
        <MyBookings
          key={lookupPhone}
          initialPhone={lookupPhone}
          clinicPhone={phoneText}
          onBookNew={openBook}
        />
      ) : done ? (
        <section className="p-card success">
          <div className="check" aria-hidden>
            ✓
          </div>
          <h2>預約成功</h2>
          <dl>
            <dt>日期</dt>
            <dd>
              {formatGregorian(done.date)} {weekdayName(done.date)}
              <small>{formatLunar(done.date)}</small>
            </dd>
            <dt>時間</dt>
            <dd className="big">{done.slot}</dd>
            <dt>姓名</dt>
            <dd>{done.name}</dd>
            <dt>電話</dt>
            <dd>{formatPhone(done.phone)}</dd>
          </dl>
          {notice}
          <p className="p-muted">
            建議將此畫面截圖保存。如需取消，請點上方「查詢／取消預約」，輸入電話號碼即可；或來電{' '}
            {phoneLink}。
          </p>
          <div className="success-actions">
            <button className="wide" onClick={() => openMine(formatPhone(done.phone))}>
              查看我的預約
            </button>
            <button className="primary wide" onClick={reset}>
              完成
            </button>
          </div>
        </section>
      ) : (
        <>
          {notice}

          {/* 電腦版：左邊選日期，右邊選時段、填資料；手機版上下排列 */}
          <div className="book-layout">
          <div className="book-left">
          <section className="p-card">
            <h2>
              <span className="step">1</span>選擇日期
            </h2>
            {loadError && <p className="error">{loadError}</p>}
            {!days && !loadError && <p className="p-muted">載入中…</p>}
            {days && days.length === 0 && <p className="p-muted">目前沒有可預約的日期，請來電預約。</p>}
            {days && days.length > 0 && <CalendarGrid days={days} selected={date} onPick={pickDate} />}
            {config && (
              <p className="p-muted small">
                可預約今天起 {config.bookingWindowDays} 天內的日期；只顯示營業日。
              </p>
            )}
          </section>
          </div>

          <div className="book-right">
          {!date && (
            <section className="p-card p-placeholder">
              <p>請先在{'\u00a0'}<b>選擇日期</b>{'\u00a0'}挑一天，這裡會顯示可以預約的時段。</p>
            </section>
          )}
          {date && (
            <section className="p-card" ref={slotRef}>
              <h2>
                <span className="step">2</span>選擇時段
                <small>
                  {formatGregorian(date)} {weekdayName(date)}
                </small>
              </h2>
              {selectedDay && selectedDay.available.length > 0 ? (
                PERIODS.map((p) => {
                  const list = selectedDay.available.filter((s) => periodOf(s) === p);
                  if (list.length === 0) return null;
                  return (
                    <div key={p} className="slot-row">
                      <span className="slot-period">{p}</span>
                      <div className="slot-buttons">
                        {list.map((s) => (
                          <button
                            key={s}
                            className={'slot-btn' + (slot === s ? ' on' : '')}
                            onClick={() => pickSlot(s)}
                            aria-pressed={slot === s}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-muted">這天已額滿，請選擇其他日期。</p>
              )}
            </section>
          )}

          {date && slot && (
            <section className="p-card" ref={formRef}>
              <h2>
                <span className="step">3</span>填寫資料
              </h2>
              <p className="summary-line">
                {formatGregorian(date)} {weekdayName(date)} <b>{slot}</b>
              </p>
              <form className="form" onSubmit={submit}>
                <label>
                  姓名
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    autoComplete="name"
                    maxLength={30}
                    required
                  />
                </label>
                <label>
                  電話（手機或市話，市話請加區碼）
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    autoComplete="tel"
                    placeholder="例如 0912345678、02-23022457"
                    required
                  />
                </label>
                {error && <p className="error">{error}</p>}
                <button className="primary wide" type="submit" disabled={busy}>
                  {busy ? '送出中…' : '確認預約'}
                </button>
                <p className="p-muted small">您的資料僅供預約聯絡使用。</p>
              </form>
            </section>
          )}
          {error && !slot && <p className="error">{error}</p>}
          </div>
          </div>
        </>
      )}
      <footer className="p-footer">
        {config?.clinicName ?? '任老師'}・電話 {phoneLink}
        <div className="app-version">{APP_VERSION}</div>
      </footer>
    </div>
  );
}

/** 星期一開頭的順序 */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** 月曆：一列一週，只列有營業的星期幾；先顯示兩個月 */
function CalendarGrid({
  days,
  selected,
  onPick,
}: {
  days: DayAvailability[];
  selected: string | null;
  onPick: (d: string) => void;
}) {
  const [monthCount, setMonthCount] = useState(2);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const columns = useMemo(() => WEEK_ORDER.filter((w) => days.some((d) => weekdayOf(d.date) === w)), [days]);
  const monthKeys = useMemo(() => [...new Set(days.map((d) => d.date.slice(0, 7)))], [days]);
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const shown = monthKeys.slice(0, monthCount);

  return (
    <>
      {shown.map((mk) => {
        const monthStart = `${mk}-01`;
        const monthEnd = addDays(addDays(monthStart, 32).slice(0, 7) + '-01', -1);
        const weeks: string[][] = [];
        for (let ws = addDays(monthStart, -((weekdayOf(monthStart) + 6) % 7)); ws <= monthEnd; ws = addDays(ws, 7)) {
          const cells = columns.map((w) => addDays(ws, WEEK_ORDER.indexOf(w)));
          // 整週都在可預約範圍外（例如已經過去）就不顯示
          if (cells.some((c) => c.startsWith(mk) && c >= first && c <= last)) weeks.push(cells);
        }
        return (
          <div key={mk} className="cal">
            <h3 className="month">
              {Number(mk.slice(0, 4))}年{Number(mk.slice(5))}月
            </h3>
            <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {columns.map((w) => (
                <span key={w} className={'cal-wd' + (w === 0 || w === 6 ? ' weekend' : '')}>
                  週{weekdayShort(w)}
                </span>
              ))}
              {weeks.flat().map((c) => {
                const d = byDate.get(c);
                if (!c.startsWith(mk) || c < first || c > last) return <span key={c} className="cal-empty" />;
                if (!d) {
                  return (
                    <span key={c} className="date-btn cal-closed">
                      <span className="d-day">{Number(c.slice(8))}</span>
                      <span className="d-left">休</span>
                    </span>
                  );
                }
                const full = d.available.length === 0;
                return (
                  <button
                    key={c}
                    className={'date-btn' + (selected === c ? ' on' : '') + (full ? ' full' : '')}
                    disabled={full}
                    onClick={() => onPick(c)}
                    aria-label={`${Number(c.slice(5, 7))}月${Number(c.slice(8))}日 ${full ? '額滿' : `剩${d.available.length}個時段`}`}
                  >
                    <span className="d-day">{Number(c.slice(8))}</span>
                    <span className="d-lunar">{lunarLabel(c)}</span>
                    <span className="d-left">{full ? '額滿' : `剩 ${d.available.length}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {monthCount < monthKeys.length && (
        <button className="wide more" onClick={() => setMonthCount((n) => n + 2)}>
          看更後面的月份
        </button>
      )}
    </>
  );
}

/** 日期格子上的農曆：初一顯示月份，其餘顯示日 */
function lunarLabel(date: string): string {
  const l = lunarOf(date);
  return l.day === '初一' ? l.month : l.day;
}
