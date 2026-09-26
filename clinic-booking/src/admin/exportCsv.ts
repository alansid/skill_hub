import type { Booking } from '../data/types';
import { todayInTaipei, weekdayName } from '../lib/dates';
import { formatLunar } from '../lib/lunar';
import { formatPhone } from '../lib/phone';

function cell(v: string): string {
  // 避免 Excel 把開頭是 = + - @ 的內容當成公式
  const safe = /^[=+\-@]/.test(v) ? "'" + v : v;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function taipeiTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
}

/** 下載全部預約紀錄（CSV，可用 Excel 開啟） */
export async function exportCsv(bookings: Booking[]) {
  const header = ['日期', '星期', '農曆', '時段', '實際時間', '姓名', '電話', '備註', '狀態', '加號', '來源', '建立時間'];
  const rows = bookings.map((b) => [
    b.date,
    weekdayName(b.date),
    formatLunar(b.date).replace('農曆 ', ''),
    b.slot,
    b.time ?? '',
    b.name,
    formatPhone(b.phone),
    b.note,
    b.status === 'cancelled' ? '已取消' : '已預約',
    b.isExtra ? '是' : '',
    b.source === 'online' ? '線上' : '櫃台',
    taipeiTime(b.createdAt),
  ]);
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `任老師中醫預約備份-${todayInTaipei()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
