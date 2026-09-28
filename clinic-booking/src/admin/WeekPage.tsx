import { useCallback, useEffect, useState } from 'react';
import { api } from '../data';
import type { Booking, ClinicSettings, DayOverride } from '../data/types';
import { addDays, todayInTaipei, weekdayName, weekdayOf } from '../lib/dates';
import { canDial } from '../lib/dial';
import { formatPhone } from '../lib/phone';
import { scheduleFor } from '../lib/schedule';

interface Props {
  date: string;
  setDate: (d: string) => void;
  settings: ClinicSettings;
  onOpenDate: (d: string) => void;
}

/** 以星期一開頭的一週 */
function weekStart(date: string): string {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

export function WeekPage({ date, setDate, settings, onOpenDate }: Props) {
  const start = weekStart(date);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayInTaipei();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<Map<string, DayOverride>>(new Map());
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, ovs] = await Promise.all([api.listActiveBookingsBetween(start, end), api.listOverrides(start, end)]);
      setBookings(list);
      setOverrides(new Map(ovs.map((o) => [o.date, o])));
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [start, end]);

  useEffect(() => {
    void load();
    return api.subscribe(() => void load());
  }, [load]);

  const total = bookings.length;
  const thisWeek = weekStart(today) === start;

  return (
    <div className="week-page">
      <section className="page-head">
        <button className="nav-btn" onClick={() => setDate(addDays(date, -7))} aria-label="上一週">
          ‹<span>上一週</span>
        </button>
        <div className="date-block">
          <div className="gregorian">
            {shortDate(start)} ～ {shortDate(end)}
          </div>
          <div className="lunar">這週共 {total} 筆預約</div>
        </div>
        <button className="nav-btn" onClick={() => setDate(addDays(date, 7))} aria-label="下一週">
          <span>下一週</span>›
        </button>
      </section>

      <section className="toolbar">
        <button onClick={() => setDate(today)} disabled={thisWeek}>
          本週
        </button>
        <span className="meta">點日期可以打開那天的登記本</span>
      </section>

      {loadError && <p className="error">{loadError}</p>}

      {days.map((d) => {
        const list = bookings
          .filter((b) => b.date === d)
          .sort((a, b) => (a.time ?? a.slot).localeCompare(b.time ?? b.slot) || Number(a.isExtra) - Number(b.isExtra));
        const override = overrides.get(d);
        const schedule = scheduleFor(d, settings, override);
        const closed = !schedule.open;
        if (closed && list.length === 0) {
          return (
            <button key={d} className="week-day week-day-closed" onClick={() => onOpenDate(d)}>
              <span className="week-day-date">
                {shortDate(d)} {weekdayName(d).replace('星期', '週')}
              </span>
              <span className="week-day-status">{schedule.overridden ? '臨時休息' : '休息'}</span>
            </button>
          );
        }
        return (
          <section key={d} className={'week-day' + (d === today ? ' week-day-today' : '')}>
            <button className="week-day-head" onClick={() => onOpenDate(d)}>
              <span className="week-day-date">
                {shortDate(d)} {weekdayName(d).replace('星期', '週')}
                {d === today && <em className="tag">今天</em>}
              </span>
              <span className="week-day-status">
                {closed && <span className="badge closed">休息</span>}
                {list.length > 0 ? `${list.length} 位` : '還沒有預約'} ›
              </span>
            </button>
            {closed && list.length > 0 && (
              <p className="error">⚠ 這天休息，但還有 {list.length} 筆預約，請記得聯絡客人。</p>
            )}
            {override?.note && <p className="meta week-day-note">{override.note}</p>}
            {list.map((b) => (
              <div key={b.id} className="week-row">
                <span className="time">{b.time ?? b.slot}</span>
                <span className="name">
                  {b.name}
                  {b.isExtra && <em className="tag">加號</em>}
                  {b.source === 'online' && <em className="tag online">線上</em>}
                </span>
                {canDial && b.phone ? (
                  <a className="phone phone-link" href={`tel:${b.phone}`} aria-label={`打電話給${b.name}`}>
                    {formatPhone(b.phone)}
                  </a>
                ) : (
                  <span className="phone">{formatPhone(b.phone)}</span>
                )}
                {b.note && <span className="note">{b.note}</span>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
