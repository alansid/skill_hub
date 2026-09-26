import { useState, type FormEvent } from 'react';
import { api } from '../data';
import type { Booking } from '../data/types';
import { formatGregorian, todayInTaipei, weekdayName } from '../lib/dates';
import { formatPhone } from '../lib/phone';

export function SearchPage({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = todayInTaipei();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResults(await api.searchBookings(query));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const upcoming = results?.filter((b) => b.date >= today) ?? [];
  const past = results?.filter((b) => b.date < today) ?? [];

  return (
    <div className="search-page">
      <form className="search-bar" onSubmit={submit}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入姓名或電話（可只打部分，例如後三碼）"
          autoFocus
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '搜尋中…' : '搜尋'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && <p className="meta">找不到符合的預約紀錄。</p>}
      {results && results.length >= 200 && <p className="meta">結果太多，只顯示前 200 筆，請輸入更完整的姓名或電話。</p>}
      {upcoming.length > 0 && <ResultList title={`今天及之後（${upcoming.length}）`} items={[...upcoming].reverse()} onOpenDate={onOpenDate} />}
      {past.length > 0 && <ResultList title={`過去紀錄（${past.length}）`} items={past} onOpenDate={onOpenDate} />}
    </div>
  );
}

function ResultList({
  title,
  items,
  onOpenDate,
}: {
  title: string;
  items: Booking[];
  onOpenDate: (d: string) => void;
}) {
  return (
    <section className="results">
      <h3>{title}</h3>
      {items.map((b) => (
        <button
          key={b.id}
          className={'result' + (b.status === 'cancelled' ? ' cancelled' : '')}
          onClick={() => onOpenDate(b.date)}
        >
          <span className="result-date">
            {formatGregorian(b.date)} {weekdayName(b.date).replace('星期', '週')} {b.time ?? b.slot}
          </span>
          <span className="name">
            {b.name}
            {b.isExtra && <em className="tag">加號</em>}
            {b.source === 'online' && <em className="tag online">線上</em>}
            {b.status === 'cancelled' && (
              <em className="tag cancel">{b.cancelledBy === 'patient' ? '病人取消' : '已取消'}</em>
            )}
          </span>
          <span className="phone">{formatPhone(b.phone)}</span>
          {b.note && <span className="note">{b.note}</span>}
        </button>
      ))}
    </section>
  );
}
