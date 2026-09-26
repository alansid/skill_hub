import { useState } from 'react';
import { api } from '../data';
import type { ClinicSettings, DayOverride } from '../data/types';
import { formatGregorian, weekdayName } from '../lib/dates';
import { periodOf, scheduleFor, type Period } from '../lib/schedule';
import { Modal } from './Modal';

type Mode = 'regular' | 'closed' | 'partial';

interface Props {
  date: string;
  settings: ClinicSettings;
  override: DayOverride | undefined;
  activeCount: number;
  onClose: () => void;
  onSaved: () => void;
}

const PERIODS: Period[] = ['上午', '下午', '晚上'];

export function DaySettingsDialog({ date, settings, override, activeCount, onClose, onSaved }: Props) {
  const regular = scheduleFor(date, settings, undefined);
  const [mode, setMode] = useState<Mode>(!override ? 'regular' : override.closed ? 'closed' : 'partial');
  const [slots, setSlots] = useState<string[]>(
    override && !override.closed ? scheduleFor(date, settings, override).slots : settings.slots,
  );
  const [note, setNote] = useState(override?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(slot: string) {
    setSlots((cur) => (cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot].sort()));
  }

  function togglePeriod(p: Period) {
    const inPeriod = settings.slots.filter((s) => periodOf(s) === p);
    const allOn = inPeriod.every((s) => slots.includes(s));
    setSlots((cur) =>
      allOn ? cur.filter((s) => !inPeriod.includes(s)) : [...new Set([...cur, ...inPeriod])].sort(),
    );
  }

  async function save() {
    if (mode === 'partial' && slots.length === 0) {
      setError('請至少勾選一個時段；若整天不看診，請選「臨時休診」。');
      return;
    }
    if (mode === 'closed' && activeCount > 0) {
      if (!confirm(`這天還有 ${activeCount} 筆預約，設為休診後預約不會自動取消，請記得聯絡病人。確定嗎？`)) return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'regular') {
        await api.deleteOverride(date);
      } else {
        const allSlots = slots.length === settings.slots.length;
        await api.saveOverride({
          date,
          closed: mode === 'closed',
          openSlots: mode === 'partial' && !allSlots ? slots : null,
          note: note.trim(),
        });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="本日看診設定" onClose={onClose}>
      <div className="form">
        <p className="meta">
          {formatGregorian(date)} {weekdayName(date)}・平常這天
          {regular.open ? '有看診' : '休診'}
        </p>
        <label className="radio">
          <input type="radio" checked={mode === 'regular'} onChange={() => setMode('regular')} />
          照平常（{regular.open ? '全部時段開放' : '休診'}）
        </label>
        <label className="radio">
          <input type="radio" checked={mode === 'closed'} onChange={() => setMode('closed')} />
          臨時休診
        </label>
        <label className="radio">
          <input type="radio" checked={mode === 'partial'} onChange={() => setMode('partial')} />
          {regular.open ? '只開部分時段' : '特別開診（自選時段）'}
        </label>

        {mode === 'partial' && (
          <div className="slot-picker">
            {PERIODS.map((p) => (
              <div key={p} className="slot-picker-row">
                <button type="button" className="period-btn" onClick={() => togglePeriod(p)}>
                  {p}
                </button>
                {settings.slots
                  .filter((s) => periodOf(s) === p)
                  .map((s) => (
                    <label key={s} className={'chip' + (slots.includes(s) ? ' on' : '')}>
                      <input type="checkbox" checked={slots.includes(s)} onChange={() => toggle(s)} />
                      {s}
                    </label>
                  ))}
              </div>
            ))}
            <small>病人預約頁只會顯示勾選的時段。</small>
          </div>
        )}

        {mode !== 'regular' && (
          <label>
            說明（選填，只有診所看得到）
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：醫師進修" maxLength={100} />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        <div className="actions">
          <span className="spacer" />
          <button type="button" onClick={onClose} disabled={busy}>
            關閉
          </button>
          <button type="button" className="primary" onClick={save} disabled={busy}>
            {busy ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
