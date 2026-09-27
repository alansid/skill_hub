/** 只保留數字，存進資料庫前使用。 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

/** 區碼比較長的地區（其餘市話區碼都是 2 碼，例如 02、03、07） */
const LONG_AREA_CODES = ['0826', '0836', '037', '049', '082', '089'];

/**
 * 顯示用：0912345678 → 0912-345-678；市話 → 02-2302-2457、03-123-4567、049-222-3333。
 * 認不出來的號碼照原樣顯示。
 */
export function formatPhone(digits: string): string {
  if (/^09\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (!isBookingPhone(digits)) return digits;
  const area = LONG_AREA_CODES.find((c) => digits.startsWith(c)) ?? digits.slice(0, 2);
  const local = digits.slice(area.length);
  // 本地號碼 6 碼以下（台東、金門、馬祖等）只分出區碼
  if (local.length <= 6) return `${area}-${local}`;
  return `${area}-${local.slice(0, -4)}-${local.slice(-4)}`;
}

/** 台灣手機：09 開頭共 10 碼 */
export function isMobile(digits: string): boolean {
  return /^09\d{8}$/.test(digits);
}

/** 客人可以用來預約的號碼：台灣的手機或市話（0 開頭、含區碼共 9～10 碼） */
export function isBookingPhone(digits: string): boolean {
  return /^0\d{8,9}$/.test(digits);
}

/** 姓名遮蔽：王小明 → 王○明；王明 → 王○（與資料庫 mask_name 相同） */
export function maskName(name: string): string {
  const chars = [...name];
  if (chars.length <= 1) return name;
  if (chars.length === 2) return chars[0] + '○';
  return chars[0] + '○'.repeat(chars.length - 2) + chars[chars.length - 1];
}
