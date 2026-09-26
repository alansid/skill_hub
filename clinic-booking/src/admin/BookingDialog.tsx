import { useState, type FormEvent } from 'react';
import { api } from '../data';
import type { Booking, BookingPatch, ClinicSettings } from '../data/types';
import { SlotTakenError } from '../data/types';
import { formatGregorian, isValidDate, weekdayName } from '../lib/dates';
import { formatPhone, isMobile, normalizePhone } from '../lib/phone';
import { normalizeTime } from '../lib/schedule';
import { askConfirm } from '../lib/askConfirm';
import { Modal } from './Modal';

export type BookingDialogTarget =
  | { kind: 'new'; date: string; slot: string; isExtra: boolean }
  | { kind: 'edit'; booking: Booking };

interface Props {
  target: BookingDialogTarget;
  settings: ClinicSettings;
  onClose: () => void;
  /** 儲存後呼叫；有傳日期代表預約被移到那一天 */
  onSaved: (movedTo?: string) => void;
}

function taipeiTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BookingDialog({ target, settings, onClose, onSaved }: Props) {
  const existing = target.kind === 'edit' ? target.booking : null;
  const [date, setDate] = useState(existing?.date ?? (target.kind === 'new' ? target.date : ''));
  const [slot, setSlot] = useState(existing?.slot ?? (target.kind === 'new' ? target.slot : ''));
  const [time, setTime] = useState(existing?.time ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing ? formatPhone(existing.phone) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [isExtra, setIsExtra] = useState(existing?.isExtra ?? (target.kind === 'new' && target.isExtra));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 恢復預約時，原本的時段已經有其他病人
  const [restoreConflict, setRestoreConflict] = useState(false);

  const cancelled = existing?.status === 'cancelled';
  const slotOptions = settings.slots.includes(slot) ? settings.slots : [...settings.slots, slot].sort();
  const phoneDigits = normalizePhone(phone);

  function validate(): BookingPatch | null {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('請填寫姓名');
      return null;
    }
    if (!isValidDate(date)) {
      setError('日期格式不正確');
      return null;
    }
    let actual: string | null = null;
    if (time.trim()) {
      actual = normalizeTime(time);
      if (!actual) {
        setError('實際時間格式不正確，請用像 19:50 這樣的格式');
        return null;
      }
      if (actual === slot) actual = null;
    }
    return {
      date,
      slot,
      time: actual,
      name: trimmedName,
      phone: phoneDigits,
      note: note.trim(),
      isExtra,
    };
  }

  async function run(action: () => Promise<unknown>, movedTo?: string) {
    setBusy(true);
    setError('');
    setRestoreConflict(false);
    try {
      await action();
      onSaved(movedTo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    if (existing) {
      void run(() => api.updateBooking(existing.id, data), data.date !== existing.date ? data.date : undefined);
    } else {
      void run(() =>
        api.createBooking({
          date: data.date!,
          slot: data.slot!,
          time: data.time ?? null,
          name: data.name!,
          phone: data.phone!,
          note: data.note!,
          isExtra: data.isExtra!,
        }),
      );
    }
  }

  async function cancelBooking() {
    if (!existing) return;
    const ok = await askConfirm(
      `確定要取消「${existing.name}」${existing.slot} 的預約嗎？\n（紀錄會保留，標示為已取消）`,
      '取消預約',
    );
    if (!ok) return;
    void run(() => api.updateBooking(existing.id, { status: 'cancelled' }));
  }

  async function restoreBooking() {
    if (!existing) return;
    setBusy(true);
    setError('');
    try {
      await api.updateBooking(existing.id, { status: 'booked' });
      onSaved();
    } catch (e) {
      if (e instanceof SlotTakenError) {
        setRestoreConflict(true);
        setError(`${existing.slot} 已經有其他病人了。如果還是要讓「${existing.name}」這個時間來，請按下方的「以加號恢復」。`);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  function restoreAsExtra() {
    if (!existing) return;
    void run(() => api.updateBooking(existing.id, { status: 'booked', isExtra: true }));
  }

  const title = existing
    ? cancelled
      ? '已取消的預約'
      : '修改預約'
    : isExtra
      ? '加號登記'
      : '新增預約';

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-row two">
          <label>
            日期
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            {isValidDate(date) && <small>{formatGregorian(date)} {weekdayName(date)}</small>}
          </label>
          <label>
            時段
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          姓名
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required autoFocus={!existing} />
        </label>
        <label>
          電話手機
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912-345-678"
          />
          {phoneDigits && !isMobile(phoneDigits) && <small className="warn-text">這不是 09 開頭的手機號碼，請再確認一次</small>}
        </label>
        <label>
          備註
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
        </label>
        <div className="form-row two">
          <label>
            實際時間（選填）
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder={`例如 ${slot.slice(0, 3)}50`}
              inputMode="numeric"
            />
            <small>與時段不同時才需要填</small>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={isExtra} onChange={(e) => setIsExtra(e.target.checked)} />
            加號（此時段已有人）
          </label>
        </div>

        {existing && (
          <p className="meta">
            {existing.source === 'online' ? '病人線上預約' : '櫃台登記'}・建立於 {taipeiTime(existing.createdAt)}
            {existing.updatedAt !== existing.createdAt && <>・最後修改 {taipeiTime(existing.updatedAt)}</>}
            {existing.cancelledAt && (
              <>
                ・{existing.cancelledBy === 'patient' ? '病人線上取消' : '取消'}於 {taipeiTime(existing.cancelledAt)}
              </>
            )}
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="actions">
          {existing && !cancelled && (
            <button type="button" className="danger" onClick={cancelBooking} disabled={busy}>
              取消預約
            </button>
          )}
          {existing && cancelled && !restoreConflict && (
            <button type="button" onClick={() => void restoreBooking()} disabled={busy}>
              恢復預約
            </button>
          )}
          {existing && cancelled && restoreConflict && (
            <button type="button" className="primary" onClick={restoreAsExtra} disabled={busy}>
              以加號恢復
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose} disabled={busy}>
            關閉
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
