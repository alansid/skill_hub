// 能不能直接撥電話：只有手機、平板（觸控螢幕）才顯示可點的電話號碼。
// 電腦沒有撥號功能，示範版的環境也不允許撥號，這兩種情況只顯示號碼文字。
export const canDial: boolean =
  import.meta.env.VITE_PREVIEW !== '1' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;
