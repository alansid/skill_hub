/** 只保留數字，存進資料庫前使用。 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

/** 顯示用：0912345678 → 0912-345-678；02 開頭市話 → 02-2302-2457 */
export function formatPhone(digits: string): string {
  if (/^09\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (/^02\d{8}$/.test(digits)) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/** 台灣手機：09 開頭共 10 碼 */
export function isMobile(digits: string): boolean {
  return /^09\d{8}$/.test(digits);
}

/** 姓名遮蔽：王小明 → 王○明；王明 → 王○（與資料庫 mask_name 相同） */
export function maskName(name: string): string {
  const chars = [...name];
  if (chars.length <= 1) return name;
  if (chars.length === 2) return chars[0] + '○';
  return chars[0] + '○'.repeat(chars.length - 2) + chars[chars.length - 1];
}
