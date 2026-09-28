import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../data';
import type { Booking, ClinicSettings, DayOverride } from '../data/types';
import { addDays, formatGregorian, isValidDate, rocYear, todayInTaipei, weekdayName } from '../lib/dates';
import { formatLunar } from '../lib/lunar';
import { canDial } from '../lib/dial';
import { formatPhone } from '../lib/phone';
import { nextOpenDay, periodOf, scheduleFor } from '../lib/schedule';
import { BookingDialog, type BookingDialogTarget } from './BookingDialog';
import { DaySettingsDialog } from './DaySettingsDialog';
import { VacationDialog } from './VacationDialog';

interface Props {
  date: string;
  setDate: (d: string) => void;
  settings: ClinicSettings;
}

export function DayPage({ date, setDate, settings }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<Map<string, DayOverride>>(new Map());
  const [loadError, setLoadError] = useState('');
  const [dialog, setDialog] = useState<BookingDialogTarget | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showVacation, setShowVacation] = useState(false);
  const [showCancelled, setShowCancelled] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, ovs] = await Promise.all([
        api.listBookings(date),
        api.listOverrides(addDays(date, -70), addDays(date, 70)),
      ]);
      setBookings(list);
      setOverrides(new Map(ovs.map((o) => [o.date, o])));
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    void load();
    return api.subscribe(() => void load());
  }, [load]);

  const override = overrides.get(date);
  const schedule = scheduleFor(date, settings, override);
  const today = todayInTaipei();

  const rows = useMemo(() => {
    const slotSet = new Set(settings.slots);
    bookings.forEach((b) => slotSet.add(b.slot));
    return [...slotSet].sort().map((slot) => {
      const inSlot = bookings.filter((b) => b.slot === slot);
      const active = inSlot.filter((b) => b.status === 'booked');
      return {
        slot,
        open: schedule.slots.includes(slot),
        main: active.find((b) => !b.isExtra) ?? null,
        extras: active.filter((b) => b.isExtra),
        cancelled: inSlot.filter((b) => b.status === 'cancelled'),
      };
    });
  }, [bookings, settings.slots, schedule.slots]);

  const activeCount = bookings.filter((b) => b.status === 'booked').length;
  const cancelledCount = bookings.length - activeCount;

  function go(direction: 1 | -1) {
    setDate(nextOpenDay(date, direction, settings, overrides) ?? addDays(date, direction));
  }

  let statusText = '';
  if (!schedule.open) {
    statusText = schedule.overridden ? '臨時休息' : '本日休息';
  } else if (schedule.overridden) {
    statusText = schedule.regularOpen ? '本日只開部分時段' : '本日特別營業';
  }

  let lastPeriod = '';

  return (
    <div className="day-page">
      <section className="page-head">
        <button className="nav-btn" onClick={() => go(-1)} aria-label="前一個營業日">
          ‹<span>前一天</span>
        </button>
        <div className="date-block">
          <div className="gregorian">
            {formatGregorian(date)}
            <span className="weekday">{weekdayName(date)}</span>
          </div>
          <div className="lunar">
            {formatLunar(date)}
            <span className="roc">民國{rocYear(date)}年</span>
          </div>
        </div>
        <button className="nav-btn" onClick={() => go(1)} aria-label="下一個營業日">
          <span>後一天</span>›
        </button>
      </section>

      <section className="toolbar">
        <button onClick={() => setDate(today)} disabled={date === today}>
          今天
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => isValidDate(e.target.value) && setDate(e.target.value)}
          aria-label="選擇日期"
        />
        <span className="toolbar-right">
          <button onClick={() => setShowSettings(true)}>本日營業設定</button>
          <button onClick={() => setShowVacation(true)}>休假設定</button>
        </span>
      </section>

      <section className="summary">
        {statusText && <span className={'badge ' + (schedule.open ? 'warn' : 'closed')}>{statusText}</span>}
        {override?.note && <span className="override-note">{override.note}</span>}
        <span>
          已約 <b>{activeCount}</b> 位
          {schedule.open && <> ／ 開放 {schedule.slots.length} 個時段</>}
        </span>
        {cancelledCount > 0 && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            顯示已取消（{cancelledCount}）
          </label>
        )}
      </section>

      {loadError && <p className="error">{loadError}</p>}

      {!schedule.open && activeCount > 0 && (
        <p className="error">⚠ 這天休息，但還有 {activeCount} 筆預約，請記得聯絡客人。</p>
      )}

      <div className="ledger" role="table">
        <div className="ledger-head" role="row">
          <span>時間</span>
          <span>姓名</span>
          <span>電話手機</span>
          <span>備註</span>
          <span />
        </div>
        {rows.map((r) => {
          const period = periodOf(r.slot);
          const divider = period !== lastPeriod;
          lastPeriod = period;
          return (
            <div key={r.slot} className={'slot-group' + (r.open ? '' : ' slot-closed')}>
              {divider && <div className="period">{period}</div>}
              {r.main ? (
                <BookingRow
                  booking={r.main}
                  onClick={() => setDialog({ kind: 'edit', booking: r.main! })}
                  onAddExtra={() => setDialog({ kind: 'new', date, slot: r.slot, isExtra: true })}
                />
              ) : (
                <button
                  className="row empty"
                  onClick={() => setDialog({ kind: 'new', date, slot: r.slot, isExtra: false })}
                >
                  <span className="time">{r.slot}</span>
                  <span className="empty-label">{r.open ? '＋ 登記' : '未開放'}</span>
                </button>
              )}
              {r.extras.map((b) => (
                <BookingRow key={b.id} booking={b} onClick={() => setDialog({ kind: 'edit', booking: b })} />
              ))}
              {showCancelled &&
                r.cancelled.map((b) => (
                  <BookingRow key={b.id} booking={b} onClick={() => setDialog({ kind: 'edit', booking: b })} />
                ))}
            </div>
          );
        })}
      </div>

      {dialog && (
        <BookingDialog
          target={dialog}
          settings={settings}
          onClose={() => setDialog(null)}
          onSaved={(movedTo) => {
            setDialog(null);
            // 預約改到別天時，直接跳到那一天，讓人看到它搬到哪裡
            if (movedTo && movedTo !== date) setDate(movedTo);
            else void load();
          }}
        />
      )}
      {showVacation && (
        <VacationDialog
          startDate={date}
          settings={settings}
          onClose={() => {
            setShowVacation(false);
            void load();
          }}
          onSaved={() => {
            setShowVacation(false);
            void load();
          }}
        />
      )}
      {showSettings && (
        <DaySettingsDialog
          date={date}
          settings={settings}
          override={override}
          activeCount={activeCount}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function BookingRow({
  booking: b,
  onClick,
  onAddExtra,
}: {
  booking: Booking;
  onClick: () => void;
  onAddExtra?: () => void;
}) {
  const cancelled = b.status === 'cancelled';
  return (
    <div className={'row filled' + (cancelled ? ' cancelled' : '') + (b.isExtra ? ' extra' : '')}>
      {/* 整列可點開修改；用 div 是因為裡面的電話號碼在手機上是可以撥打的連結 */}
      <div
        className="row-main"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <span className="time">
          {b.time && b.time !== b.slot ? (
            <>
              <s>{b.slot}</s> {b.time}
            </>
          ) : (
            b.slot
          )}
        </span>
        <span className="name">
          {b.name}
          {b.isExtra && <em className="tag">加號</em>}
          {b.source === 'online' && <em className="tag online">線上</em>}
          {cancelled && <em className="tag cancel">{b.cancelledBy === 'patient' ? '客人取消' : '已取消'}</em>}
        </span>
        {canDial && b.phone && !cancelled ? (
          <a
            className="phone phone-link"
            href={`tel:${b.phone}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`打電話給${b.name}`}
          >
            {formatPhone(b.phone)}
          </a>
        ) : (
          <span className="phone">{formatPhone(b.phone)}</span>
        )}
        <span className="note">{b.note}</span>
      </div>
      {onAddExtra ? (
        <button className="icon-btn add-extra" onClick={onAddExtra} aria-label="此時段加號">
          ＋加號
        </button>
      ) : (
        <span className="icon-btn placeholder" />
      )}
    </div>
  );
}
