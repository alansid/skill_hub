import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { addDays, formatGregorian, weekdayName, weekdayOf, weekdayShort } from '../lib/dates';
import { formatLunar, lunarOf } from '../lib/lunar';
import { formatPhone, isMobile, normalizePhone } from '../lib/phone';
import { periodOf, type Period } from '../lib/schedule';
import { patientApi, type BookResult, type BookingConfig, type DayAvailability } from './api';
import { MyBookings } from './MyBookings';
import { canDial } from '../lib/dial';

const ERROR_TEXT: Record<Exclude<BookResult, 'ok'>, string> = {
  invalid_name: '請填寫姓名。',
  invalid_phone: '請填寫正確的手機號碼（09 開頭，共 10 碼）。',
  slot_unavailable: '這個時段目前無法預約，請選擇其他時段。',
  too_far: '這個日期超過可預約的範圍，請選擇較近的日期。',
  too_late: '這個時段已經過了或即將開始，請選擇其他時段。',
  slot_taken: '很抱歉，這個時段剛剛被預約走了，請選擇其他時段。',
  already_booked_that_day: '這支手機在這一天已經有預約了。如需更改，請來電告知。',
  too_many: '這支手機已經有多筆尚未看診的預約。如需再預約，請來電。',
};

const PERIODS: Period[] = ['上午', '下午', '晚上'];

/** 日期區間預設顯示幾天 */
const DEFAULT_RANGE_DAYS = 30;

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
  // 病人想約的日期區間（空白 = 不限）
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const rangeInitialized = useRef(false);
  const slotRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const refresh = useCallback(async () => {
    try {
      const cfg = await patientApi.getConfig();
      setConfig(cfg);
      // 第一次載入時，日期區間預設為「今天到 30 天後」
      if (!rangeInitialized.current) {
        rangeInitialized.current = true;
        setRangeFrom(cfg.today);
        setRangeTo(addDays(cfg.today, Math.min(DEFAULT_RANGE_DAYS, cfg.bookingWindowDays)));
      }
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
  const minDate = config?.today ?? '';
  const maxDate = config ? addDays(config.today, config.bookingWindowDays) : '';
  const rangeActive = Boolean(rangeFrom || rangeTo);
  // 只留下日期區間內的看診日
  const filteredDays = useMemo(
    () =>
      days?.filter((d) => (!rangeFrom || d.date >= rangeFrom) && (!rangeTo || d.date <= rangeTo)) ?? null,
    [days, rangeFrom, rangeTo],
  );
  const selectedDay = days?.find((d) => d.date === date) ?? null;

  function changeRange(from: string, to: string) {
    // 結束日早於開始日時，自動對調
    if (from && to && to < from) [from, to] = [to, from];
    setRangeFrom(from);
    setRangeTo(to);
    if (date && ((from && date < from) || (to && date > to))) {
      setDate(null);
      setSlot(null);
    }
  }

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
    if (!isMobile(digits)) return setError(ERROR_TEXT.invalid_phone);
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
      為免耽誤其他病人時間，敬請準時，任何延誤務必來電告知（{phoneLink}）
    </p>
  );

  return (
    <div className="patient">
      {patientApi.mode === 'demo' && (
        <div className="demo-banner">示範模式：資料只存在這台裝置的瀏覽器，不會上網。</div>
      )}
      <header className="p-header">
        <h1>{config?.clinicName ?? '任老師中醫'}</h1>
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
            <dt>手機</dt>
            <dd>{formatPhone(done.phone)}</dd>
          </dl>
          {notice}
          <p className="p-muted">
            建議將此畫面截圖保存。如需取消，請點上方「查詢／取消預約」，輸入手機號碼即可；或來電{' '}
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

          <section className="p-card">
            <h2>
              <span className="step">1</span>選擇日期
            </h2>
            {loadError && <p className="error">{loadError}</p>}
            {!days && !loadError && <p className="p-muted">載入中…</p>}
            {days && days.length === 0 && <p className="p-muted">目前沒有可預約的日期，請來電預約。</p>}
            {days && days.length > 0 && (
              <div className="range">
                <span className="range-label">想約的日期</span>
                <div className="range-row">
                  <input
                    id="range-from"
                    type="date"
                    value={rangeFrom}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => changeRange(e.target.value, rangeTo)}
                    aria-label="開始日期"
                  />
                  <span>到</span>
                  <input
                    id="range-to"
                    type="date"
                    value={rangeTo}
                    min={rangeFrom || minDate}
                    max={maxDate}
                    onChange={(e) => changeRange(rangeFrom, e.target.value)}
                    aria-label="結束日期"
                  />
                </div>
                {rangeTo !== maxDate && (
                  <button className="link-btn" onClick={() => changeRange(rangeFrom || minDate, maxDate)}>
                    看更後面的日期（最多到 {Number(maxDate.slice(5, 7))}/{Number(maxDate.slice(8))}）
                  </button>
                )}
              </div>
            )}
            {filteredDays && rangeActive && filteredDays.length === 0 && (
              <p className="p-muted">這段期間沒有看診日，請換一段日期。</p>
            )}
            {filteredDays && (
              <DateGrid
                key={rangeFrom + rangeTo}
                days={filteredDays}
                selected={date}
                onPick={pickDate}
                showAllInitially={rangeActive}
              />
            )}
            {config && (
              <p className="p-muted small">
                可預約今天起 {config.bookingWindowDays} 天內的日期；只顯示看診日。
              </p>
            )}
          </section>

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
                  手機
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    autoComplete="tel"
                    placeholder="0912345678"
                    required
                  />
                </label>
                {error && <p className="error">{error}</p>}
                <button className="primary wide" type="submit" disabled={busy}>
                  {busy ? '送出中…' : '確認預約'}
                </button>
                <p className="p-muted small">您的資料僅供本診所預約聯絡使用。</p>
              </form>
            </section>
          )}
          {error && !slot && <p className="error">{error}</p>}
        </>
      )}
      <footer className="p-footer">
        {config?.clinicName ?? '任老師中醫'}・電話 {phoneLink}
      </footer>
    </div>
  );
}

function DateGrid({
  days,
  selected,
  onPick,
  showAllInitially = false,
}: {
  days: DayAvailability[];
  selected: string | null;
  onPick: (d: string) => void;
  showAllInitially?: boolean;
}) {
  const [showAll, setShowAll] = useState(showAllInitially);
  const visible = showAll ? days : days.slice(0, 15);
  const months: { key: string; items: DayAvailability[] }[] = [];
  for (const d of visible) {
    const key = d.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.items.push(d);
    else months.push({ key, items: [d] });
  }
  return (
    <>
      {months.map((m) => (
        <div key={m.key}>
          <h3 className="month">
            {Number(m.key.slice(0, 4))}年{Number(m.key.slice(5))}月
          </h3>
          <div className="date-grid">
            {m.items.map((d) => {
              const full = d.available.length === 0;
              const wd = weekdayOf(d.date);
              return (
                <button
                  key={d.date}
                  className={'date-btn' + (selected === d.date ? ' on' : '') + (full ? ' full' : '')}
                  disabled={full}
                  onClick={() => onPick(d.date)}
                >
                  <span className="d-day">
                    {Number(d.date.slice(5, 7))}/{Number(d.date.slice(8))}
                  </span>
                  <span className={'d-wd' + (wd === 0 || wd === 6 ? ' weekend' : '')}>週{weekdayShort(wd)}</span>
                  <span className="d-lunar">{lunarLabel(d.date)}</span>
                  <span className="d-left">{full ? '額滿' : `剩 ${d.available.length}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!showAll && days.length > visible.length && (
        <button className="wide more" onClick={() => setShowAll(true)}>
          顯示更多日期
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
