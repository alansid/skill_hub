import { useState, type FormEvent } from 'react';
import { askConfirm } from '../lib/askConfirm';
import { formatGregorian, weekdayName } from '../lib/dates';
import { formatLunar } from '../lib/lunar';
import { isMobile, normalizePhone } from '../lib/phone';
import { patientApi, type CancelResult, type MyBooking } from './api';

const CANCEL_ERROR: Record<Exclude<CancelResult, 'ok'>, string> = {
  not_found: '找不到這筆預約，請重新查詢。',
  already_cancelled: '這筆預約已經取消了。',
  too_late: '已超過可線上取消的時間，請來電取消。',
};

export function MyBookings({
  initialPhone,
  clinicPhone,
  onBookNew,
}: {
  initialPhone: string;
  clinicPhone: string;
  onBookNew: () => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [searched, setSearched] = useState('');
  const [list, setList] = useState<MyBooking[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup(digits: string) {
    setBusy(true);
    setError('');
    try {
      setList(await patientApi.findMyBookings(digits));
      setSearched(digits);
    } catch (e) {
      setError((e as Error).message);
      setList(null);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const digits = normalizePhone(phone);
    setMessage('');
    if (!isMobile(digits)) return setError('請輸入正確的手機號碼（09 開頭，共 10 碼）。');
    void lookup(digits);
  }

  async function cancel(b: MyBooking) {
    const ok = await askConfirm(
      `確定要取消這筆預約嗎？\n${formatGregorian(b.date)} ${weekdayName(b.date)} ${b.time}`,
      '取消預約',
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const result = await patientApi.cancelMyBooking(searched, b.id);
      if (result === 'ok') {
        setMessage(`已取消 ${formatGregorian(b.date)} ${b.time} 的預約。`);
      } else {
        setError(CANCEL_ERROR[result]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
    await lookup(searched);
  }

  return (
    <section className="p-card">
      <h2>查詢／取消預約</h2>
      <form className="lookup" onSubmit={submit}>
        <input
          id="lookup-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError('');
          }}
          placeholder="請輸入預約時填的手機號碼"
          autoComplete="tel"
          aria-label="手機號碼"
        />
        <button className="primary" type="submit" disabled={busy}>
          查詢
        </button>
      </form>
      {message && <p className="ok-msg">{message}</p>}
      {error && <p className="error">{error}</p>}
      {list && list.length === 0 && (
        <p className="p-muted">這支手機目前沒有尚未看診的預約。</p>
      )}
      {list && list.length > 0 && (
        <ul className="my-list">
          {list.map((b) => (
            <li key={b.id}>
              <div className="my-info">
                <div className="my-date">
                  {formatGregorian(b.date)} {weekdayName(b.date)}
                </div>
                <div className="my-time">{b.time}</div>
                <div className="p-muted small">
                  {formatLunar(b.date)}・{b.maskedName}
                </div>
              </div>
              {b.canCancel ? (
                <button className="danger" onClick={() => void cancel(b)} disabled={busy}>
                  取消預約
                </button>
              ) : (
                <span className="p-muted small">請來電取消</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="p-muted small">
        只會顯示尚未看診的預約。如需更改時間，請取消後重新預約，或來電 {clinicPhone}。
      </p>
      <button className="wide" onClick={onBookNew}>
        回到預約
      </button>
    </section>
  );
}
