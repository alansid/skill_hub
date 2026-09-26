import { useEffect, useState } from 'react';
import { api } from '../data';
import type { Booking, ClinicSettings, DayOverride } from '../data/types';
import { askConfirm } from '../lib/askConfirm';
import { addDays, isValidDate, todayInTaipei, weekdayOf, weekdayShort } from '../lib/dates';
import { formatPhone } from '../lib/phone';
import { scheduleFor } from '../lib/schedule';
import { Modal } from './Modal';

interface Props {
  startDate: string;
  settings: ClinicSettings;
  onClose: () => void;
  onSaved: () => void;
}

interface Vacation {
  from: string;
  to: string;
  note: string;
  dates: string[];
}

const MAX_DAYS = 62;

function short(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8))}（${weekdayShort(weekdayOf(date))}）`;
}

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length <= MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 把連續的休診日合併成一段（中間只隔著平常休診日也算連續） */
function groupVacations(closed: DayOverride[], settings: ClinicSettings): Vacation[] {
  const sorted = [...closed].sort((a, b) => a.date.localeCompare(b.date));
  const groups: Vacation[] = [];
  for (const o of sorted) {
    const last = groups[groups.length - 1];
    if (last) {
      const gap = daysBetween(addDays(last.to, 1), addDays(o.date, -1));
      const onlyRegularClosed = gap.every((d) => !scheduleFor(d, settings, undefined).open);
      if (onlyRegularClosed && gap.length < 7 && last.note === o.note) {
        last.to = o.date;
        last.dates.push(o.date);
        continue;
      }
    }
    groups.push({ from: o.date, to: o.date, note: o.note, dates: [o.date] });
  }
  return groups;
}

export function VacationDialog({ startDate, settings, onClose, onSaved }: Props) {
  const today = todayInTaipei();
  const initialFrom = startDate < today ? today : startDate;
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(addDays(initialFrom, 6));
  const [note, setNote] = useState('休假');
  const [existing, setExisting] = useState<Vacation[]>([]);
  const [affected, setAffected] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = isValidDate(from) && isValidDate(to) && from <= to;
  const range = valid ? daysBetween(from, to) : [];
  const tooLong = range.length > MAX_DAYS;
  // 這段期間內「平常會看診」的日子，才需要設為休診
  const workDays = range.filter((d) => scheduleFor(d, settings, undefined).open);

  async function loadExisting() {
    const list = await api.listOverrides(today, addDays(today, 400));
    setExisting(groupVacations(list.filter((o) => o.closed), settings));
  }

  useEffect(() => {
    void loadExisting().catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!valid || tooLong) return setAffected([]);
    let alive = true;
    api
      .listActiveBookingsBetween(from, to)
      .then((list) => alive && setAffected(list))
      .catch(() => alive && setAffected([]));
    return () => {
      alive = false;
    };
  }, [from, to, valid, tooLong]);

  async function save() {
    if (!valid) return setError('請選擇正確的開始與結束日期。');
    if (tooLong) return setError(`一次最多設定 ${MAX_DAYS} 天，請分段設定。`);
    if (workDays.length === 0) return setError('這段期間本來就沒有看診日，不需要設定。');
    if (affected.length > 0) {
      const ok = await askConfirm(
        `這段期間還有 ${affected.length} 筆預約。\n設為休假後預約不會自動取消，請記得聯絡病人。確定要設定嗎？`,
        '設定休假',
      );
      if (!ok) return;
    }
    setBusy(true);
    setError('');
    try {
      for (const d of workDays) {
        await api.saveOverride({ date: d, closed: true, openSlots: null, note: note.trim() });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function remove(v: Vacation) {
    const ok = await askConfirm(`確定要取消 ${short(v.from)}～${short(v.to)} 的休假，恢復平常看診嗎？`, '恢復看診');
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      for (const d of v.dates) await api.deleteOverride(d);
      await loadExisting();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="休假設定" onClose={onClose}>
      <div className="form">
        <p className="meta">選一段日期，這段期間的看診日會全部設為休診，病人就無法預約。</p>
        <div className="form-row two">
          <label>
            從
            <input id="vacation-from" type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            到
            <input id="vacation-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label>
          說明（只有診所看得到）
          <input id="vacation-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} />
        </label>

        {valid && !tooLong && (
          <div className="vacation-preview">
            {workDays.length > 0 ? (
              <>
                會設為休診的看診日（{workDays.length} 天）：
                <div className="vacation-days">
                  {workDays.map((d) => (
                    <span key={d}>{short(d)}</span>
                  ))}
                </div>
              </>
            ) : (
              '這段期間本來就沒有看診日。'
            )}
          </div>
        )}

        {affected.length > 0 && (
          <div className="vacation-warn">
            <b>⚠ 這段期間還有 {affected.length} 筆預約，請記得聯絡病人：</b>
            <ul>
              {affected.map((b) => (
                <li key={b.id}>
                  {short(b.date)} {b.time ?? b.slot} {b.name} {b.phone && formatPhone(b.phone)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <div className="actions">
          <span className="spacer" />
          <button type="button" onClick={onClose} disabled={busy}>
            關閉
          </button>
          <button type="button" className="primary" onClick={save} disabled={busy}>
            {busy ? '設定中…' : '設定休假'}
          </button>
        </div>

        <div className="vacation-list">
          <h3>已排定的休診</h3>
          {existing.length === 0 ? (
            <p className="meta">目前沒有排定的休診。</p>
          ) : (
            <ul>
              {existing.map((v) => (
                <li key={v.from}>
                  <span>
                    {v.from === v.to ? short(v.from) : `${short(v.from)}～${short(v.to)}`}
                    {v.note && <small>　{v.note}</small>}
                  </span>
                  <button type="button" onClick={() => void remove(v)} disabled={busy}>
                    恢復看診
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
